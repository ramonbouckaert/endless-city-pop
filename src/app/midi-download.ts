// Saves a song as a MIDI file. Reading every bar of the pattern takes a
// few seconds: the button shows a spinner, drawn before the work starts,
// until the file is ready.

import type { Pattern } from '@strudel/core';
import { songToMidi } from '../midi/from-pattern';
import type { Song } from '../model';

export function downloadMidi(button: HTMLButtonElement, song: Song, pattern: Pattern, onError: (msg: string) => void) {
  if (button.disabled) return;
  button.disabled = true;
  button.classList.add('busy');
  requestAnimationFrame(() =>
    setTimeout(() => {
      try {
        const bytes = songToMidi(song, pattern);
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
