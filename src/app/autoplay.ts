// The autoplay switch: on unless turned off, which this browser remembers.

const STORAGE = 'endless-city-pop.autoplay';

/** Wires up the checkbox; returns whether autoplay is on. */
export function autoplaySwitch(box: HTMLInputElement): () => boolean {
  try {
    box.checked = localStorage.getItem(STORAGE) !== 'off';
  } catch {
    // On by default.
  }
  box.addEventListener('change', () => {
    try {
      localStorage.setItem(STORAGE, box.checked ? 'on' : 'off');
    } catch {
      // Not remembered.
    }
  });
  return () => box.checked;
}
