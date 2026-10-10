// The page: wires the session, player and UI pieces to the DOM.

import type { Song } from '../model';
import type { Arrangement } from '../render';
import { autoplaySwitch } from './autoplay';
import { DebugPanel } from './debug/panel';
import { FormStrip } from './form-strip';
import { downloadMidi } from './midi-download';
import { createPlayer, type Player } from './player';
import { Session } from './session';
import { clock, seconds } from './time';
import { TitleMarquee } from './title-marquee';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

class App {
  private readonly title = new TitleMarquee($('title'));
  private readonly strip = new FormStrip($('form'), $('playhead'));
  private readonly position = $('position');
  private readonly error = $('error');
  private readonly player: Player;
  private readonly session: Session;
  private readonly debug: DebugPanel | undefined;
  private readonly autoplay = autoplaySwitch($<HTMLInputElement>('autoplay'));

  constructor() {
    this.player = createPlayer({
      onUpdate: (state) => {
        document.body.classList.toggle('playing', !!state.started);
        if (state.error) {
          const { error } = state;
          const msg = typeof error === 'string' ? error : (error.message ?? JSON.stringify(error));
          this.showError(`Strudel: ${msg}`);
        }
      },
    });
    this.session = new Session(this.player, {
      instruments: (song) => this.debug?.instruments(song),
      onSong: (song, arrangement) => this.showSong(song, arrangement),
      onError: (msg) => this.showError(msg),
    });
    // With ?debug=true, a panel to try other Strudel sounds for each
    // instrument; a change re-arranges the song, live if it is playing.
    if (new URLSearchParams(location.search).get('debug') === 'true') {
      this.debug = new DebugPanel($('debug'), () => this.session.rearrange());
    }
    this.wireControls();
  }

  /** The first song, the playhead and autoplay going; resolves once the fonts and sounds have loaded. */
  async start(): Promise<void> {
    this.session.generate();
    requestAnimationFrame(() => this.followPlayhead());
    // A timer, not animation frames, so autoplay runs while the tab is in the background.
    setInterval(() => this.autoplay() && this.session.autoplay(), 100);
    // The title's width changes once the serif font loads.
    document.fonts.addEventListener('loadingdone', () => this.title.fit());
    await Promise.all([document.fonts.ready.then(() => this.title.fit()), this.offerSounds()]);
  }

  // The debug panel's menus, once Strudel's sounds have loaded.
  private async offerSounds(): Promise<void> {
    if (!this.debug) return;
    this.debug.offerSounds(await this.player.sounds());
  }

  private wireControls(): void {
    const { session } = this;
    $('generate').addEventListener('click', () => session.next());
    $('play').addEventListener('click', () => (session.playing ? session.stop() : void session.play()));
    const midi = $<HTMLButtonElement>('midi');
    midi.addEventListener('click', () =>
      downloadMidi(midi, session.song, session.instruments, (msg) => this.showError(msg)),
    );
  }

  // There's no other status line.
  private showError(text: string): void {
    this.error.textContent = text;
    this.error.hidden = !text;
  }

  private showSong(song: Song, arrangement: Arrangement): void {
    this.title.show(song.titleParts);
    $('meta').textContent = `${song.key.name} · ${song.bpm} BPM`;
    $('length').textContent = clock(seconds(song.bars, song.bpm));
    this.position.textContent = clock(0);
    this.strip.show(song.form);
    this.debug?.showSong(song, arrangement.uses);
  }

  // The clock and playhead, every frame while the page is visible.
  private followPlayhead(): void {
    const pos = this.session.position();
    const { song } = this.session;
    // The time played, held at the end through the silence after the final chord.
    const played = clock(seconds(Math.min(Math.max(pos, 0), song.bars), song.bpm));
    if (this.position.textContent !== played) this.position.textContent = played;
    this.strip.playhead(pos);
    requestAnimationFrame(() => this.followPlayhead());
  }
}

await new App().start();
