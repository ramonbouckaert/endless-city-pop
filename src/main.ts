import type { Pattern } from '@strudel/core';
import { randomSeed, Song, type SectionType } from './engine';
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
      showError(`Strudel: ${typeof state.error === 'string' ? state.error : (state.error.message ?? state.error)}`);
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
    showError(`Could not generate a song: ${(e as Error).message}`);
    throw e;
  }
  showSong(current.song);
  debug?.showSong(current.song);
}

// Starts the song from its first bar, or while one plays, swaps in the
// current song: from cycle `from` on the player's clock, or where the
// last one started (a new arrangement of the same song).
async function play(from?: number) {
  showError('');
  if (!playing())
    start = 0; // the clock restarts too
  else if (from !== undefined) start = from;
  try {
    await player.play(current.pattern.late(start), current.cps);
  } catch (e) {
    showError(`Strudel: ${(e as Error).message ?? e}`);
  }
}

// Reading every bar of the pattern takes a few seconds: the button shows
// a spinner, drawn before the work starts, until the file is ready.
function exportMidi() {
  const { song, pattern } = current;
  const button = $<HTMLButtonElement>('midi');
  if (button.disabled) return;
  button.disabled = true;
  button.classList.add('busy');
  const done = () => {
    button.disabled = false;
    button.classList.remove('busy');
  };
  requestAnimationFrame(() =>
    setTimeout(() => {
      try {
        const bytes = songToMidi(song, pattern);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/midi' }));
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: `${song.title}.mid`.replace(/[\\/:*?"<>|#]/g, '-'),
        });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        showError(`Could not write MIDI: ${(e as Error).message}`);
      }
      done();
    }),
  );
}

// While a song plays, the section under the playhead glows and a line
// marks the playhead, placed by how far through its section it is (the
// strip's gaps make a straight bar count drift). The song loops every
// `cycles` bars; in the silence after the final chord, no section glows
// and the line waits at the end.
function followPlayhead() {
  const now = player.now();
  const pos = now === undefined || now < start ? -1 : (now - start) % current.cycles;
  // The time played, held at the end through the silence after the final chord.
  const played = clock(seconds(Math.min(Math.max(pos, 0), current.song.bars), current.song.bpm));
  if ($('position').textContent !== played) $('position').textContent = played;
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
  showTitle(song);
  $('meta').textContent = `${info.key} · ${info.bpm} BPM`;
  $('length').textContent = clock(seconds(info.bars, song.bpm));
  $('position').textContent = clock(0);
  const list = $('form');
  list.replaceChildren();
  for (const s of song.form) {
    const li = document.createElement('li');
    li.className = `sec sec-${s.type}`;
    li.style.flexGrow = String(s.bars);
    li.title = `${s.type}, ${s.bars} bars${s.opts.shift ? `, up ${s.opts.shift}` : ''}`;
    const label = (text: string, className: string) =>
      Object.assign(document.createElement('span'), { className, textContent: text });
    li.append(label(s.type === 'drumBreak' ? 'drums' : s.type, 'full'), label(SECTION_SHORT[s.type], 'short'));
    list.append(li);
  }
  fitSections();
}

// Section names for blocks too narrow for the full one (verse: v).
const SECTION_SHORT: Readonly<Record<SectionType, string>> = {
  intro: 'i',
  vamp: 'vp',
  verse: 'v',
  pre: 'p',
  chorus: 'c',
  riff: 'r',
  bridge: 'b',
  solo: 's',
  solo2: 's2',
  breakdown: 'bd',
  drumBreak: 'd',
  lift: 'l',
  outro: 'o',
  finale: 'f',
};

// Each block shows its section's full name if it fits, bold as when
// playing (a tenth wider), else the short one, else none: its colour and
// tooltip still say what it is.
function fitSections() {
  for (const li of $('form').children as HTMLCollectionOf<HTMLElement>) {
    li.classList.remove('short', 'bare');
    const style = getComputedStyle(li);
    const room = li.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const fits = (label: string) => li.querySelector(label)!.getBoundingClientRect().width * 1.1 <= room;
    if (fits('.full')) continue;
    li.classList.add('short');
    if (!fits('.short')) li.classList.add('bare');
  }
}

// The title on one line, the second language lighter. One too long for
// its space scrolls slowly past like a CD player's display: a pause, then
// a glide left, with a copy following so the loop has no seam.
const MARQUEE = { speed: 40, gap: 64, pause: 0.2 }; // px a second, px, share of each loop held still

function showTitle(song: Song) {
  const { title: main, aside, join } = Song.titleParts(song.seed);
  const span = (className: string, ...kids: (Node | string)[]) => {
    const el = Object.assign(document.createElement('span'), { className });
    el.append(...kids);
    return el;
  };
  const second = join === 'brackets' ? `(${aside})` : join === 'dash' ? `– ${aside}` : aside;
  const text = () => span('marquee-text', main, ' ', span('title-aside', second));
  const copy = text();
  copy.setAttribute('aria-hidden', 'true');
  $('title').replaceChildren(span('marquee-track', text(), copy));
  fitTitle();
}

// Scrolls the title if it doesn't fit.
function fitTitle() {
  const box = $('title');
  const track = box.querySelector<HTMLElement>('.marquee-track');
  const text = track?.firstElementChild as HTMLElement | null;
  if (!track || !text) return;
  const width = text.getBoundingClientRect().width;
  const scrolling = width > box.clientWidth + 1;
  box.classList.toggle('scrolling', scrolling);
  if (!scrolling) return;
  const distance = width + MARQUEE.gap;
  track.style.setProperty('--distance', `${distance}px`);
  track.style.setProperty('--gap', `${MARQUEE.gap}px`);
  track.style.setProperty('--duration', `${distance / MARQUEE.speed / (1 - MARQUEE.pause)}s`);
}

// How long a number of bars plays, in seconds: four beats a bar.
const seconds = (bars: number, bpm: number) => (bars * 4 * 60) / bpm;

// Seconds as m:ss, counting whole seconds like a player's clock.
function clock(time: number): string {
  const s = Math.floor(time);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Something went wrong (empty: nothing has). There's no other status line.
function showError(text: string) {
  const error = $('error');
  error.textContent = text;
  error.hidden = !text;
}

// Autoplay: when a song's final chord has played, a new song takes over
// where the old one would loop, after its second of silence (or at once,
// if that has passed). On unless turned off, which this browser remembers.
const AUTOPLAY = 'endless-city-pop.autoplay';
const OLD_AUTOPLAY = 'songsmith.autoplay'; // before the app was renamed
const autoplay = $<HTMLInputElement>('autoplay');
try {
  autoplay.checked = (localStorage.getItem(AUTOPLAY) ?? localStorage.getItem(OLD_AUTOPLAY)) !== 'off';
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

$('play').addEventListener('click', () => (playing() ? player.stop() : void play()));
$('midi').addEventListener('click', exportMidi);

// Clear the song links earlier versions put in the URL.
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
generate();
requestAnimationFrame(followPlayhead);
// The title's room changes with the window, and its width once the serif font loads.
new ResizeObserver(fitTitle).observe($('title'));
new ResizeObserver(fitSections).observe($('form'));
void document.fonts.ready.then(fitTitle);
document.fonts.addEventListener('loadingdone', fitTitle);
