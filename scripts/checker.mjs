// Evaluate Strudel code headlessly and query every bar, so syntax,
// mini-notation, theory and sound-name errors show up without audio.
// checkCode(code, bars) -> { bars, haps, cps, problems }

import * as core from '@strudel/core';
import { evalScope, evaluate, noteToMidi } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { GM_SOUNDS } from './gm-sounds.mjs';

const DRUMS = new Set(['bd', 'sd', 'hh', 'oh', 'rd', 'cr', 'rim', 'cp', 'white', 'pink', 'brown']);

let ready;
let cps = 0.5;
const labelled = [];

function setup() {
  ready ??= (async () => {
    await evalScope(core, import('@strudel/mini'), import('@strudel/tonal'), {
      setcps: (v) => (cps = v),
      setCps: (v) => (cps = v),
      setcpm: (v) => (cps = v / 60),
      setCpm: (v) => (cps = v / 60),
      samples: () => {},
    });
    // `$: pattern` labels transpile to pattern.p('$'); the REPL normally
    // collects these, so do the same here.
    core.Pattern.prototype.p = function () {
      labelled.push(this);
      return this;
    };
  })();
  return ready;
}

export async function checkCode(code, bars) {
  await setup();
  labelled.length = 0;
  const result = await evaluate(code, transpiler);
  const pattern = labelled.length ? core.stack(...labelled) : result.pattern;
  const problems = new Set();
  let haps = 0;
  // Strudel logs query errors instead of throwing them.
  const log = console.log;
  console.log = (...args) => {
    const text = args.join(' ');
    if (/error/i.test(text)) problems.add(text.replace(/%c/g, '').trim());
    else log(...args);
  };
  try {
    queryAll();
  } finally {
    console.log = log;
  }
  return { bars, haps, cps, problems: [...problems] };

  function queryAll() {
    for (let c = 0; c < bars; c++) {
      for (const hap of pattern.queryArc(c, c + 1)) {
        haps++;
        const v = hap.value;
        const sound = v.s ?? v.sound;
        if (sound && !DRUMS.has(sound) && !GM_SOUNDS.has(sound)) problems.add(`unknown sound "${sound}"`);
        if (v.note !== undefined) {
          const midi = typeof v.note === 'number' ? v.note : noteToMidi(v.note);
          if (!Number.isFinite(midi)) problems.add(`bar ${c}: bad note ${v.note}`);
          else if (midi < 23 || midi > 100) problems.add(`bar ${c}: note ${v.note} out of range (${sound})`);
        } else if (v.n !== undefined && sound && !DRUMS.has(sound)) {
          problems.add(`bar ${c}: ${sound} has n but no note`);
        }
      }
    }
  }
}
