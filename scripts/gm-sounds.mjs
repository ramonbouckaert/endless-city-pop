// The General MIDI soundfont names Strudel registers (gm_piano, ...).
import gm from '../node_modules/@strudel/soundfonts/gm.mjs';

export const GM_SOUNDS = new Set(Object.keys(gm));
