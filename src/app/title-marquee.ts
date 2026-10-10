// The title on one line, the second language lighter. One too long for
// its space scrolls slowly past like a CD player's display: a pause, then
// a glide left, with a copy following so the loop has no seam.

import { joinAside, type TitleParts } from '../model';

const MARQUEE = { speed: 40, gap: 64, pause: 0.2 }; // px a second, px, share of each loop held still

export class TitleMarquee {
  constructor(private readonly box: HTMLElement) {
    // The title's room changes with the window.
    new ResizeObserver(() => this.fit()).observe(box);
  }

  show({ title, aside, join }: TitleParts): void {
    const span = (className: string, ...kids: (Node | string)[]) => {
      const el = Object.assign(document.createElement('span'), { className });
      el.append(...kids);
      return el;
    };
    const text = () => span('marquee-text', title, ' ', span('title-aside', joinAside(aside, join)));
    const copy = text();
    copy.setAttribute('aria-hidden', 'true');
    // A new title starts still: were it to start with the last one's
    // scrolling on, it would be animated before fit() gave it its own
    // distance and duration, and some browsers keep that empty animation.
    this.box.classList.remove('scrolling');
    this.box.replaceChildren(span('marquee-track', text(), copy));
    this.fit();
  }

  /** Scrolls the title if it doesn't fit: call again when its width may have changed (a font loading). */
  fit(): void {
    const { box } = this;
    const track = box.querySelector<HTMLElement>('.marquee-track');
    const text = track?.firstElementChild as HTMLElement | null;
    if (!track || !text) return;
    const width = text.getBoundingClientRect().width;
    if (width <= box.clientWidth + 1) {
      box.classList.remove('scrolling');
      return;
    }
    // Its distance and duration first, then the scrolling that uses them.
    const distance = width + MARQUEE.gap;
    track.style.setProperty('--distance', `${distance}px`);
    track.style.setProperty('--gap', `${MARQUEE.gap}px`);
    track.style.setProperty('--duration', `${distance / MARQUEE.speed / (1 - MARQUEE.pause)}s`);
    box.classList.add('scrolling');
  }
}
