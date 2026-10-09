// Strudel, embedded: an editor wired to Web Audio, with the same sound
// library strudel.cc loads (drum machines, General MIDI soundfonts).

import { code2hash, evalScope } from '@strudel/core';
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import * as draw from '@strudel/draw';
import * as codemirror from '@strudel/codemirror';
import * as webaudio from '@strudel/webaudio';
import { transpiler } from '@strudel/transpiler';

const { StrudelMirror, codemirrorSettings } = codemirror;
const { getAudioContext, initAudioOnFirstClick, registerSynthSounds, samples, webaudioOutput } = webaudio;

const DOUGH = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';
const UZU = 'https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main';

async function prebake() {
  await Promise.all([
    evalScope(core, mini, tonal, webaudio, draw, codemirror, import('@strudel/soundfonts')),
    registerSynthSounds(),
    // Imported lazily: the soundfont module touches `window` on load.
    import('@strudel/soundfonts').then(({ registerSoundfonts }) => registerSoundfonts()),
    samples(`${DOUGH}/tidal-drum-machines.json`),
    samples(`${DOUGH}/Dirt-Samples.json`),
    samples(`${UZU}/strudel.json`),
  ]);
}

export function createEditor(root, { onUpdate } = {}) {
  initAudioOnFirstClick();
  const editor = new StrudelMirror({
    defaultOutput: webaudioOutput,
    getTime: () => getAudioContext().currentTime,
    transpiler,
    root,
    initialCode: '// loading…',
    drawTime: [-2, 2],
    drawContext: draw.getDrawContext(),
    prebake,
    onUpdateState: (state) => onUpdate?.(state),
    solo: true,
  });
  editor.updateSettings({ ...codemirrorSettings.get(), isLineWrappingEnabled: false });
  return editor;
}

// A strudel.cc link that opens with this code in the editor.
export function strudelUrl(code) {
  return `https://strudel.cc/#${code2hash(code)}`;
}
