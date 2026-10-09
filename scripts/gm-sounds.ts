// The General MIDI soundfont names Strudel registers (gm_piano, ...).
import gm from '@strudel/soundfonts/gm.mjs';

export const GM_SOUNDS = new Set(Object.keys(gm));
