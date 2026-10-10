// The page: the song's transport, the player and the views of them. Every
// action comes through App (the buttons, the form strip, the media
// controls and autoplay), and every change is shown by render().

import { autoplaySwitch } from './autoplay';
import { FormStrip } from './form-strip';
import { MediaControls, type Controls } from './media-session';
import { downloadMidi } from './midi-download';
import { SynthPlayer } from './player';
import { bars, clock, seconds } from './time';
import { TitleMarquee } from './title-marquee';
import { Transport } from './transport';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

class App implements Controls {
  private readonly player = new SynthPlayer();
  private readonly transport = new Transport(this.player, () => this.render());
  private readonly title = new TitleMarquee($('title'));
  private readonly strip = new FormStrip($('form'), $('playhead'), this.transport.song.form, (bar) =>
    this.seek(seconds(bar, this.transport.song.bpm)),
  );
  private readonly media = new MediaControls(this, this.transport.song);
  private readonly autoplay = autoplaySwitch($<HTMLInputElement>('autoplay'));
  private readonly clock = $('position');
  private readonly error = $('error');
  // The song the page shows, to tell when the transport has a new one.
  private shown = this.transport.song;

  constructor() {
    const { transport } = this;
    $('generate').addEventListener('click', () => this.next());
    $('play').addEventListener('click', () => (transport.playing ? this.stop() : this.play()));
    $('midi').addEventListener('click', () =>
      downloadMidi(transport.song, transport.midi, (msg) => this.showError(msg)),
    );
    this.showSong();
  }

  /** The playhead and autoplay going; resolves once the fonts and sounds have loaded. */
  async start(): Promise<void> {
    requestAnimationFrame(() => this.followPlayhead());
    // A timer, not animation frames, so songs move on while the tab is in
    // the background: to the next with autoplay on, else stopping.
    setInterval(() => {
      if (!this.transport.done) return;
      if (this.autoplay()) this.next();
      else this.stop();
    }, 100);
    // The title's width changes once the serif font loads.
    document.fonts.addEventListener('loadingdone', () => this.title.fit());
    await Promise.all([document.fonts.ready.then(() => this.title.fit()), this.loadSounds()]);
  }

  // ---- Actions (Controls) -------------------------------------------------

  get time(): number {
    return this.transport.time;
  }

  play(): void {
    this.act(() => this.transport.play());
  }

  pause(): void {
    this.transport.pause();
  }

  stop(): void {
    this.transport.stop();
  }

  /** A new song, playing at once if one was. */
  next(): void {
    this.act(() => this.transport.next());
  }

  /** To `to` seconds in: playing, at once; stopped, where Play starts. */
  seek(to: number): void {
    this.transport.seek(to);
  }

  // An action that may fail (writing or starting a song), its error shown.
  private act(action: () => Promise<void>): void {
    this.showError('');
    action().catch((e: unknown) => {
      this.showError(`Could not play: ${(e as Error).message}`);
      this.render();
    });
  }

  // ---- Views --------------------------------------------------------------

  // Shows what the transport says: a new song, playing or not, and where
  // it is, on the page and in the media controls.
  private render(): void {
    const { song, playing, time } = this.transport;
    if (song !== this.shown) {
      this.shown = song;
      this.showSong();
    }
    document.body.classList.toggle('playing', playing);
    this.media.update(song, playing, time);
  }

  private showSong(): void {
    const { song } = this.transport;
    this.title.show(song.titleParts);
    $('meta').textContent = `${song.key.name} · ${song.bpm} BPM`;
    $('length').textContent = clock(seconds(song.bars, song.bpm));
    this.strip.show(song.form);
  }

  // The clock and playhead, every frame while the page is visible. The
  // clock shows where the song is (while the playhead is dragged, where it
  // would go), held at the end through the silence after the final chord;
  // the playhead shows while it plays, or stopped, where a seek moved it.
  private followPlayhead(): void {
    const { song, playing, time } = this.transport;
    const bar = bars(time, song.bpm);
    const shown = clock(seconds(Math.min(this.strip.shown(bar), song.bars), song.bpm));
    if (this.clock.textContent !== shown) this.clock.textContent = shown;
    this.strip.playhead(bar, playing || time > 0);
    requestAnimationFrame(() => this.followPlayhead());
  }

  // The page shows the sounds loading; Play still works, and starts once they have.
  private async loadSounds(): Promise<void> {
    document.body.classList.add('loading');
    try {
      await this.player.loaded;
    } catch (e) {
      this.showError(`Could not load the sounds: ${(e as Error).message}`);
    } finally {
      document.body.classList.remove('loading');
    }
  }

  // There's no other status line.
  private showError(text: string): void {
    this.error.textContent = text;
    this.error.hidden = !text;
  }
}

await new App().start();
