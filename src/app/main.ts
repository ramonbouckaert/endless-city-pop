// The page: wires the session, player and UI pieces to the DOM.

import type { Song } from '../model';
import { autoplaySwitch } from './autoplay';
import { createDebugPanel, type DebugPanel } from './debug-panel';
import { fitSections, showForm, showPlayhead } from './form-strip';
import { downloadMidi } from './midi-download';
import { createPlayer } from './player';
import { Session } from './session';
import { clock, seconds } from './time';
import { fitTitle, showTitle } from './title-marquee';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const titleEl = $('title');
const positionEl = $('position');
const formEl = $('form');
const errorEl = $('error');
const midiBtn = $<HTMLButtonElement>('midi');

// There's no other status line.
function showError(text: string) {
  errorEl.textContent = text;
  errorEl.hidden = !text;
}

function showSong(song: Song) {
  showTitle(titleEl, song.titleParts);
  $('meta').textContent = `${song.key.name} · ${song.bpm} BPM`;
  $('length').textContent = clock(seconds(song.bars, song.bpm));
  positionEl.textContent = clock(0);
  showForm(formEl, song);
  debug?.showSong(song);
}

const player = createPlayer({
  onUpdate: (state) => {
    document.body.classList.toggle('playing', !!state.started);
    if (state.error) {
      const msg = typeof state.error === 'string' ? state.error : (state.error.message ?? JSON.stringify(state.error));
      showError(`Strudel: ${msg}`);
    }
  },
});

let debug: DebugPanel | undefined;
const session = new Session(player, {
  instruments: (song) => debug?.instruments(song),
  onSong: showSong,
  onError: showError,
});

// With ?debug=true, a panel to try other Strudel sounds for each
// instrument; a change re-arranges the song, live if it is playing.
if (new URLSearchParams(location.search).get('debug') === 'true') {
  debug = createDebugPanel($('debug'), player.sounds(), () => session.rearrange());
}

// The clock and playhead, every frame while the page is visible.
function followPlayhead() {
  const pos = session.position();
  const { song } = session;
  // The time played, held at the end through the silence after the final chord.
  const played = clock(seconds(Math.min(Math.max(pos, 0), song.bars), song.bpm));
  if (positionEl.textContent !== played) positionEl.textContent = played;
  showPlayhead(formEl, $('playhead'), song, pos);
  requestAnimationFrame(followPlayhead);
}

// A timer, not animation frames, so autoplay runs while the tab is in the background.
const autoplay = autoplaySwitch($<HTMLInputElement>('autoplay'));
setInterval(() => autoplay() && session.autoplay(), 100);

$('generate').addEventListener('click', () => session.next());
$('play').addEventListener('click', () => (session.playing ? session.stop() : void session.play()));
midiBtn.addEventListener('click', () => downloadMidi(midiBtn, session.song, session.current.pattern, showError));

session.generate();
requestAnimationFrame(followPlayhead);
// The title's room changes with the window, and its width once the serif font loads.
new ResizeObserver(() => fitTitle(titleEl)).observe(titleEl);
new ResizeObserver(() => fitSections(formEl)).observe(formEl);
document.fonts.addEventListener('loadingdone', () => fitTitle(titleEl));
await document.fonts.ready;
fitTitle(titleEl);
