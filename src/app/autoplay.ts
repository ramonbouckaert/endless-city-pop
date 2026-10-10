// The autoplay switch: on unless turned off, which this browser remembers.

import { Stored } from './storage';

const STORED = new Stored('endless-city-pop.autoplay');

/** Wires up the checkbox; returns whether autoplay is on. */
export function autoplaySwitch(box: HTMLInputElement): () => boolean {
  box.checked = STORED.get() !== 'off';
  box.addEventListener('change', () => STORED.set(box.checked ? 'on' : 'off'));
  return () => box.checked;
}
