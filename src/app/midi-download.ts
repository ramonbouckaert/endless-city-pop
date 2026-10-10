// Saves a song as a MIDI file, from its score. The button shows a
// spinner, drawn before the work starts, until the file is ready.

import { songToMidi } from '../midi/from-score';
import type { Instruments, Song } from '../model';

/** Saves `song` played on `instruments` (the debug panel's choices, if any). */
export function downloadMidi(
  button: HTMLButtonElement,
  song: Song,
  instruments: Instruments,
  onError: (msg: string) => void,
) {
  if (button.disabled) return;
  button.disabled = true;
  button.classList.add('busy');
  requestAnimationFrame(() =>
    setTimeout(() => {
      try {
        const bytes = songToMidi(song, instruments);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/midi' }));
        const a = Object.assign(document.createElement('a'), {
          href: url,
          download: `${song.title}.mid`.replace(/[\\/:*?"<>|#]/g, '-'),
        });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        onError(`Could not write MIDI: ${(e as Error).message}`);
      }
      button.disabled = false;
      button.classList.remove('busy');
    }),
  );
}
