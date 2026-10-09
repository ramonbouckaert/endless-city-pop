// Top level: seed + options -> a song model -> Strudel code.

import { createRng } from './random.js';
import { STYLES } from './styles.js';
import { planForm } from './form.js';
import { makeChord, makeKey, keyName, transposeKey } from './theory.js';
import {
  approachBars,
  chooseBridgeKey,
  fitTemplate,
  parseTemplate,
  realize,
  reharmonize,
  soloCycle,
} from './harmony.js';
import { writeAnswer, writeMelody, writeSolo } from './melody.js';
import { writeBass } from './bass.js';
import { renderSong, titleFor } from './codegen.js';

/**
 * Generate a song.
 * options: { seed, style, key (pitch class or null), mode, bpm }
 * Returns { code, song } where song is the model the code was written from.
 */
export function generateSong(options = {}) {
  const seed = String(options.seed ?? 'strudel');
  const styleName = options.style ?? 'jazzfunk';
  const style = STYLES[styleName];
  if (!style) throw new Error(`Unknown style: ${styleName}`);
  const rng = createRng(`${seed}/${styleName}`);

  const availableModes = style.modes.filter(([m]) => style.templates[m]);
  const mode = options.mode && style.templates[options.mode] ? options.mode : rng.weighted(availableModes);
  const tonic = options.key ?? rng.pick(style.tonics);
  const key = makeKey(tonic, mode);
  const [minBpm, maxBpm] = style.tempo;
  const bpm = options.bpm ?? rng.int(minBpm, maxBpm);
  const swing = Math.round((style.swing[0] + rng.next() * (style.swing[1] - style.swing[0])) * 100) / 100;

  const form = planForm(styleName, { rng: rng.fork('form') });
  const materials = buildMaterials({ style, key, form, rng: rng.fork('materials') });

  const title = titleFor(`${seed}/${styleName}`);
  const song = { seed, title, styleName, style, key, bpm, swing, form, materials };
  return { code: renderSong(song), song };
}

function buildMaterials({ style, key, form, rng }) {
  const types = new Set(form.map((s) => s.type));
  const barsOf = (type) => form.find((s) => s.type === type)?.bars;
  const templates = style.templates[key.mode];
  const color = style.color;
  const realizeIn = (k, template, bars, r) =>
    reharmonize(realize(fitTemplate(template, bars), k, { color, rng: r }), k, { rng: r, amount: style.reharm });
  const m = {};
  const add = (type, material) => (m[type] = { type, key, ...material });

  // --- Core harmony -------------------------------------------------
  const verseBars = realizeIn(key, rng.pick(templates.verse), 8, rng.fork('verse'));
  add('verse', { bars: verseBars });

  const chorusLen = barsOf('chorus') ?? 8;
  const chorusRng = rng.fork('chorus');
  let chorusBars = realizeIn(key, rng.pick(templates.chorus), 8, chorusRng);
  if (chorusLen > 8) {
    const tag = realize(fitTemplate(rng.pick(templates.tag), chorusLen - 8), key, { color, rng: chorusRng });
    chorusBars = [...chorusBars, ...tag];
  }
  add('chorus', { bars: chorusBars });

  if (types.has('pre')) {
    const len = barsOf('pre');
    const fitting = templates.pre.filter((t) => parseTemplate(t).length === len);
    const template = rng.pick(fitting.length ? fitting : templates.pre);
    add('pre', { bars: realizeIn(key, template, len, rng.fork('pre')) });
  }
  if (types.has('vamp')) add('vamp', { bars: realizeIn(key, rng.pick(templates.vamp), 4, rng.fork('vamp')) });
  if (types.has('riff')) add('riff', { bars: realizeIn(key, rng.pick(templates.riff), 4, rng.fork('riff')) });

  // --- Intro and outro (bookends) ------------------------------------
  const introRng = rng.fork('intro');
  const planing = color === 2 && introRng.chance(0.5);
  const introBars = planing ? planingIntro(key, introRng) : chorusBars.slice(0, 4);
  add('intro', { bars: introBars, planing });
  if (types.has('outro')) add('outro', { bars: introBars, planing });

  // --- Bridge in a related key, ending with a cadence home ------------
  if (types.has('bridge')) {
    const bridgeRng = rng.fork('bridge');
    const modes = new Set(Object.keys(style.templates));
    let bridgeKey = key;
    for (let tries = 0; tries < 10; tries++) {
      bridgeKey = chooseBridgeKey(key, { rng: bridgeRng, adventurous: style.adventurous });
      if (modes.has(bridgeKey.mode)) break;
    }
    if (!modes.has(bridgeKey.mode)) bridgeKey = key;
    const idx = form.findIndex((s) => s.type === 'bridge');
    const after = form.slice(idx + 1).find((s) => !['drumBreak'].includes(s.type));
    const nextKey = transposeKey(key, after?.opts.shift ?? 0);
    const body = realizeIn(bridgeKey, bridgeRng.pick(style.templates[bridgeKey.mode].bridge), 6, bridgeRng);
    const cadence = approachBars(nextKey, { color, rng: bridgeRng, kind: key.mode === 'minor' ? 'minor' : 'iiV' });
    add('bridge', { bars: [...body, ...cadence], key: bridgeKey });
  }

  // --- Solos -------------------------------------------------------
  for (const type of ['solo', 'solo2']) {
    if (!types.has(type)) continue;
    const r = rng.fork(type);
    const bars =
      color === 2 && style.form !== 'jazz'
        ? soloCycle(key, 8, { rng: r })
        : type === 'solo'
          ? chorusBars.slice(0, 8)
          : verseBars;
    add(type, { bars });
  }

  if (types.has('breakdown')) add('breakdown', { bars: chorusBars.slice(0, barsOf('breakdown')) });

  if (types.has('lift')) {
    const shift = form.find((s) => s.type === 'lift').opts.liftTo;
    const target = transposeKey(key, shift);
    add('lift', { bars: approachBars(target, { color, rng: rng.fork('lift'), kind: 'lift' }), key: target });
  }

  if (types.has('finale')) {
    const symbol = key.mode === 'minor' ? (color === 2 ? 'm9' : 'm') : { 0: '', 1: 'add9', 2: '^9' }[color];
    const chord = makeChord(key.tonic, symbol);
    chord.scale = key.mode === 'minor' ? 'dorian' : color === 2 ? 'lydian' : 'major';
    add('finale', { bars: [[chord]] });
  }

  // --- Melodies ----------------------------------------------------
  const extensions = color === 2;
  const melRng = rng.fork('melody');
  for (const type of ['verse', 'pre', 'chorus', 'bridge', 'riff']) {
    if (!m[type]) continue;
    const kind = type;
    m[type].melody = writeMelody({ bars: m[type].bars, key: m[type].key, kind, rng: melRng.fork(type), extensions });
  }
  m.chorus.answer = writeAnswer({ melody: m.chorus.melody, bars: m.chorus.bars, key, rng: melRng.fork('answer') });
  if (m.breakdown)
    m.breakdown.melody = { ...m.chorus.melody, bars: m.chorus.melody.bars.slice(0, m.breakdown.bars.length) };
  if (!planing) m.intro.melody = { ...m.chorus.melody, bars: m.chorus.melody.bars.slice(0, 4) };
  for (const type of ['solo', 'solo2']) {
    if (m[type]) m[type].solo = writeSolo({ bars: m[type].bars, rng: melRng.fork(type) });
  }

  // --- Bass --------------------------------------------------------
  const bassRng = rng.fork('bass');
  for (const mat of Object.values(m)) {
    if (mat.type === 'finale') continue;
    const feel = style.bassFeels[mat.type] ?? 'pop';
    mat.bass = writeBass({
      bars: mat.bars,
      key: mat.key,
      feel,
      rng: bassRng.fork(mat.type),
      chromatic: style.approachChromatic,
    });
  }

  // The drum break hands over to whatever follows it.
  if (types.has('drumBreak')) {
    const idx = form.findIndex((s) => s.type === 'drumBreak');
    const next = form[idx + 1];
    add('drumBreak', { pickupInto: m[next.type].bars[0][0], pickupFrom: next.type, pickupShift: next.opts.shift ?? 0 });
  }

  return m;
}

// The sample's intro trick: add9 chords planing down in whole steps
// from bIII, then a sus dominant that leads into the song.
function planingIntro(key, rng) {
  const start = key.tonic + rng.pick([3, 8]);
  const bars = [0, 1, 2].map((i) => [makeChord(start - 2 * i, 'add9')]);
  bars.push([makeChord(start - 6, 'add9'), makeChord(key.tonic + 7, '9sus')]);
  for (const bar of bars) for (const c of bar) c.scale = c.symbol === 'add9' ? 'major' : 'mixolydian';
  return bars;
}

export function describeSong(song) {
  const { form, key, bpm, style } = song;
  const total = form.reduce((n, s) => n + s.bars, 0);
  return {
    style: style.label,
    key: keyName(key),
    bpm,
    bars: total,
    sections: form.map((s) => `${s.type}${s.opts.shift ? ` (+${s.opts.shift})` : ''} ${s.bars}`),
  };
}
