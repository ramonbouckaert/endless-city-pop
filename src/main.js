import { generateSong, describeSong } from './engine/generate.js';
import { STYLES, STYLE_NAMES } from './engine/styles.js';
import { pcName } from './engine/theory.js';
import { randomSeed } from './engine/random.js';
import { createEditor, strudelUrl } from './strudel.js';

const $ = (id) => document.getElementById(id);
const form = $('controls');

for (const name of STYLE_NAMES) $('style').append(new Option(STYLES[name].label, name));
for (let pc = 0; pc < 12; pc++) $('key').append(new Option(pcName(pc, pc !== 6), String(pc)));

const editor = createEditor($('editor'), {
  onUpdate: (state) => {
    $('play').textContent = state.started ? '▶ Update' : '▶ Play';
    document.body.classList.toggle('playing', !!state.started);
    if (state.error) setStatus(`Strudel: ${state.error.message ?? state.error}`, 'error');
    else if (state.started) setStatus('Playing. The first notes can take a moment while instruments load.');
  },
});

let current;

// Options live in the URL hash, so a song can be shared as a link.
function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  return Object.fromEntries(params);
}

function writeHash(opts) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) if (v !== '' && v != null) params.set(k, v);
  history.replaceState(null, '', `#${params}`);
}

function formOptions() {
  const data = Object.fromEntries(new FormData(form));
  return {
    seed: data.seed || randomSeed(),
    style: data.style,
    key: data.key === '' ? undefined : Number(data.key),
    mode: data.mode || undefined,
    bpm: data.bpm ? Number(data.bpm) : undefined,
  };
}

function fillForm(opts) {
  for (const name of ['seed', 'style', 'key', 'mode', 'bpm']) {
    if (opts[name] !== undefined && form.elements[name]) form.elements[name].value = opts[name];
  }
}

function generate() {
  const opts = formOptions();
  form.elements.seed.value = opts.seed;
  writeHash({ seed: opts.seed, style: opts.style, key: opts.key, mode: opts.mode, bpm: opts.bpm });
  try {
    current = generateSong(opts);
  } catch (e) {
    setStatus(`Could not generate a song: ${e.message}`, 'error');
    throw e;
  }
  editor.setCode(current.code);
  showSong(current.song);
  setStatus('Press Play. Edit the code and press Ctrl+Enter to hear changes.');
}

function showSong(song) {
  const info = describeSong(song);
  $('title').textContent = song.title;
  $('meta').textContent = `${info.style} · ${info.key} · ${info.bpm} BPM · ${info.bars} bars`;
  const list = $('form');
  list.replaceChildren();
  for (const s of song.form) {
    const li = document.createElement('li');
    li.className = `sec sec-${s.type}`;
    li.style.flexGrow = s.bars;
    li.title = `${s.type}, ${s.bars} bars${s.opts.shift ? `, up ${s.opts.shift}` : ''}`;
    li.textContent = s.type === 'drumBreak' ? 'drums' : s.type;
    list.append(li);
  }
}

function setStatus(text, kind = '') {
  $('status').textContent = text;
  $('status').className = `status ${kind}`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  generate();
  if (document.body.classList.contains('playing')) editor.evaluate();
});

$('dice').addEventListener('click', () => {
  form.elements.seed.value = randomSeed();
  generate();
});

$('play').addEventListener('click', () => editor.evaluate());
$('stop').addEventListener('click', () => editor.stop());

$('copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText(editor.code);
  setStatus('Code copied. Paste it into strudel.cc or your own editor.');
});

$('download').addEventListener('click', () => {
  const blob = new Blob([editor.code], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${current.song.title.toLowerCase().replace(/\s+/g, '-')}.strudel.js`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('open').addEventListener('click', (e) => {
  e.currentTarget.href = strudelUrl(editor.code);
});

fillForm({ style: 'jazzfunk', seed: randomSeed(), ...readHash() });
generate();
