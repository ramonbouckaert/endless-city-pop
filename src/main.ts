import type { Pattern } from '@strudel/core';
import { randomSeed, Song } from './engine';
// The engine's index leaves out Arranger, so it loads no Strudel.
// noinspection ES6PreferShortImport
import { Arranger } from './engine/arranger';
import { songToMidi } from './engine/midi-song';
import { createDebugPanel } from './debug';
import { createPlayer } from './strudel';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const player = createPlayer({
  onUpdate: (state) => {
    document.body.classList.toggle('playing', !!state.started);
    if (state.error)
      setStatus(
        `Strudel: ${typeof state.error === 'string' ? state.error : (state.error.message ?? state.error)}`,
        'error',
      );
    else if (state.started) setStatus('Playing. The first notes can take a moment while instruments load.');
  },
});

let current: { song: Song; pattern: Pattern; cps: number; cycles: number };
// Where the current song starts on the player's clock, in cycles: songs
// after the first start where the one before ended, or a moment after a
// Generate, not wherever the clock has got to.
let start = 0;
// Seconds' notice the player needs to start a song cleanly.
const LEAD = 0.2;

const playing = () => document.body.classList.contains('playing');

// With ?debug=true, a panel to try other Strudel sounds for each
// instrument; a change re-arranges the song, live if it is playing.
const debug =
  new URLSearchParams(location.search).get('debug') === 'true'
    ? createDebugPanel($('debug'), player.sounds(), () => {
        arrangeSong(current.song);
        if (playing()) void play();
      })
    : undefined;

function arrangeSong(song: Song) {
  current = { song, ...new Arranger(song, debug?.instruments(song)).pattern() };
}

// A new song from a random seed, its key, mode and tempo left to the seed.
function generate() {
  try {
    arrangeSong(Song.generate({ seed: randomSeed() }));
  } catch (e) {
    setStatus(`Could not generate a song: ${(e as Error).message}`, 'error');
    throw e;
  }
  showSong(current.song);
  debug?.showSong(current.song);
  setStatus(playing() ? 'Playing.' : 'Press Play.');
}

// Starts the song from its first bar, or while one plays, swaps in the
// current song: from cycle `from` on the player's clock, or where the
// last one started (a new arrangement of the same song).
async function play(from?: number) {
  if (!playing()) {
    setStatus('Loading instruments…');
    start = 0; // the clock restarts too
  } else if (from !== undefined) start = from;
  try {
    await player.play(current.pattern.late(start), current.cps);
  } catch (e) {
    setStatus(`Strudel: ${(e as Error).message ?? e}`, 'error');
  }
}

// Reading every bar of the pattern takes a moment, so the status shows first.
function exportMidi() {
  const { song, pattern } = current;
  setStatus('Writing MIDI…');
  setTimeout(() => {
    try {
      const bytes = songToMidi(song, pattern);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/midi' }));
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `${song.title} (${song.key.name}).mid`.replace(/[\\/:*?"<>|#]/g, '-'),
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Saved ${a.download}.`);
    } catch (e) {
      setStatus(`Could not write MIDI: ${(e as Error).message}`, 'error');
    }
  }, 20);
}

// While a song plays, the section under the playhead glows and a line
// marks the playhead, placed by how far through its section it is (the
// strip's gaps make a straight bar count drift). The song loops every
// `cycles` bars; in the silence after the final chord, no section glows
// and the line waits at the end.
function followPlayhead() {
  const now = player.now();
  const pos = now === undefined || now < start ? -1 : (now - start) % current.cycles;
  const items = [...$('form').children] as HTMLElement[];
  let bar = 0;
  let at: { item: HTMLElement; through: number } | undefined;
  current.song.form.forEach((s, i) => {
    const here = pos >= bar && pos < bar + s.bars;
    items[i]?.classList.toggle('now', here);
    if (here && items[i]) at = { item: items[i], through: (pos - bar) / s.bars };
    bar += s.bars;
  });
  if (pos >= bar && items.length) at = { item: items[items.length - 1], through: 1 };
  const line = $('playhead');
  line.hidden = !at;
  if (at) {
    const { item, through } = at;
    line.style.transform = `translateX(${item.offsetLeft + through * item.offsetWidth}px)`;
    line.style.top = `${item.offsetTop - 5}px`;
    line.style.height = `${item.offsetHeight + 10}px`;
  }
  requestAnimationFrame(followPlayhead);
}

function showSong(song: Song) {
  const info = song.describe();
  $('title').textContent = song.title;
  $('meta').textContent = `${info.key} · ${info.bpm} BPM · ${info.bars} bars`;
  const list = $('form');
  list.replaceChildren();
  for (const s of song.form) {
    const li = document.createElement('li');
    li.className = `sec sec-${s.type}`;
    li.style.flexGrow = String(s.bars);
    li.title = `${s.type}, ${s.bars} bars${s.opts.shift ? `, up ${s.opts.shift}` : ''}`;
    li.textContent = s.type === 'drumBreak' ? 'drums' : s.type;
    list.append(li);
  }
}

function setStatus(text: string, kind = '') {
  const status = $('status');
  status.textContent = text;
  status.className = `status ${kind}`;
}

// Autoplay: when a song's final chord has played, a new song takes over
// where the old one would loop, after its second of silence (or at once,
// if that has passed). On unless turned off, which this browser remembers.
const AUTOPLAY = 'songsmith.autoplay';
const autoplay = $<HTMLInputElement>('autoplay');
try {
  autoplay.checked = localStorage.getItem(AUTOPLAY) !== 'off';
} catch {
  // On by default.
}
autoplay.addEventListener('change', () => {
  try {
    localStorage.setItem(AUTOPLAY, autoplay.checked ? 'on' : 'off');
  } catch {
    // Not remembered.
  }
});
// A timer, not animation frames, so it runs while the tab is in the background.
setInterval(() => {
  const now = player.now();
  if (!autoplay.checked || !playing() || now === undefined || now < start + current.song.bars) return;
  const end = start + current.cycles;
  generate();
  void play(Math.max(end, now + LEAD * current.cps));
}, 100);

// A new song, playing from its start straight away if one was playing.
$('generate').addEventListener('click', () => {
  generate();
  if (playing()) void play((player.now() ?? 0) + LEAD * current.cps);
});

$('play').addEventListener('click', () => play());
$('stop').addEventListener('click', () => player.stop());
$('midi').addEventListener('click', exportMidi);

// Clear the song links earlier versions put in the URL.
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
generate();
requestAnimationFrame(followPlayhead);
