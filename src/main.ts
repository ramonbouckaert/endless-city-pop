import type { Pattern } from '@strudel/core';
import { pcName, randomSeed, Song, type SongOptions } from './engine';
// The engine's index leaves out Arranger, so it loads no Strudel.
// noinspection ES6PreferShortImport
import { Arranger } from './engine/arranger';
import { createPlayer } from './strudel';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>('controls');
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;

for (let pc = 0; pc < 12; pc++) $('key').append(new Option(pcName(pc, pc !== 6), String(pc)));

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

let current: { song: Song; pattern: Pattern; cps: number };

// Options live in the URL hash, so a song can be shared as a link.
function readHash(): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
}

function writeHash(opts: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) if (v !== '' && v != null) params.set(k, String(v));
  history.replaceState(null, '', `#${params}`);
}

function formOptions(): SongOptions & { seed: string } {
  const data = new FormData(form);
  const value = (name: string) => String(data.get(name) ?? '');
  return {
    seed: value('seed') || randomSeed(),
    key: value('key') === '' ? undefined : Number(value('key')),
    bpm: value('bpm') ? Number(value('bpm')) : undefined,
  };
}

function fillForm(opts: Record<string, string>) {
  for (const name of ['seed', 'key', 'bpm']) {
    const input = field(name);
    if (opts[name] !== undefined && input) input.value = opts[name];
  }
}

function generate() {
  const opts = formOptions();
  field('seed')!.value = opts.seed;
  writeHash({ seed: opts.seed, key: opts.key, bpm: opts.bpm });
  try {
    const song = Song.generate(opts);
    current = { song, ...new Arranger(song).pattern() };
  } catch (e) {
    setStatus(`Could not generate a song: ${(e as Error).message}`, 'error');
    throw e;
  }
  showSong(current.song);
  setStatus('Press Play.');
}

async function play() {
  setStatus('Loading instruments…');
  try {
    await player.play(current.pattern, current.cps);
  } catch (e) {
    setStatus(`Strudel: ${(e as Error).message ?? e}`, 'error');
  }
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

form.addEventListener('submit', (e) => {
  e.preventDefault();
  generate();
  if (document.body.classList.contains('playing')) void play();
});

$('dice').addEventListener('click', () => {
  field('seed')!.value = randomSeed();
  generate();
});

$('play').addEventListener('click', play);
$('stop').addEventListener('click', () => player.stop());

fillForm({ seed: randomSeed(), ...readHash() });
generate();
