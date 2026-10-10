// The page: wires the session, player and UI pieces to the DOM.

import type { Song } from '../model';
import { autoplaySwitch } from './autoplay';
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
  private readonly autoplay = autoplaySwitch($<HTMLInputElement>('autoplay'));
  private readonly player: Player = createPlayer();
  private readonly session = new Session(this.player, {
    onSong: (song) => this.showSong(song),
    onError: (msg) => this.showError(msg),
  });

  constructor() {
    const { session } = this;
    $('generate').addEventListener('click', () => session.next());
    $('play').addEventListener('click', () => (session.playing ? this.stop() : void this.play()));
    $('midi').addEventListener('click', () => downloadMidi(session.song, session.midi, (msg) => this.showError(msg)));
  }

  /** The first song, the playhead and autoplay going; resolves once the fonts and sounds have loaded. */
  async start(): Promise<void> {
    this.session.generate();
    requestAnimationFrame(() => this.followPlayhead());
    // A timer, not animation frames, so autoplay runs while the tab is in
    // the background. Without it, a song stops at its end.
    setInterval(() => {
      if (!this.session.done()) return;
      if (this.autoplay()) this.session.playNext();
      else this.stop();
    }, 100);
    // The title's width changes once the serif font loads.
    document.fonts.addEventListener('loadingdone', () => this.title.fit());
    await Promise.all([document.fonts.ready.then(() => this.title.fit()), this.loadSounds()]);
  }

  // The page shows the sounds loading; Play still works, and starts once they have.
  private async loadSounds(): Promise<void> {
    document.body.classList.add('loading');
    try {
      await this.player.loading;
    } catch (e) {
      this.showError(`Could not load the sounds: ${(e as Error).message}`);
    } finally {
      document.body.classList.remove('loading');
    }
  }

  private async play(): Promise<void> {
    document.body.classList.add('playing');
    await this.session.play();
    if (!this.session.playing) document.body.classList.remove('playing');
  }

  private stop(): void {
    this.session.stop();
    document.body.classList.remove('playing');
  }

  // There's no other status line.
  private showError(text: string): void {
    this.error.textContent = text;
    this.error.hidden = !text;
  }

  private showSong(song: Song): void {
    this.title.show(song.titleParts);
    $('meta').textContent = `${song.key.name} · ${song.bpm} BPM`;
    $('length').textContent = clock(seconds(song.bars, song.bpm));
    this.position.textContent = clock(0);
    this.strip.show(song.form);
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
