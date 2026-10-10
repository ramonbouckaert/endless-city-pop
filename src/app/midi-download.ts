// Saves a song's MIDI file, named for its title.

import type { Song } from '../model';

export function downloadMidi(song: Song, midi: Uint8Array, onError: (msg: string) => void): void {
  try {
    const url = URL.createObjectURL(new Blob([midi as BlobPart], { type: 'audio/midi' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${song.title}.mid`.replace(/[\\/:*?"<>|#]/g, '-'),
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    onError(`Could not save the MIDI file: ${(e as Error).message}`);
  }
}
