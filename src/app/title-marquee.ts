// The title on one line, the second language lighter. One too long for
// its space scrolls slowly past like a CD player's display: a pause, then
// a glide left, with a copy following so the loop has no seam.

import { joinAside, type TitleParts } from '../model';

const MARQUEE = { speed: 40, gap: 64, pause: 0.2 }; // px a second, px, share of each loop held still

export function showTitle(box: HTMLElement, { title, aside, join }: TitleParts): void {
  const span = (className: string, ...kids: (Node | string)[]) => {
    const el = Object.assign(document.createElement('span'), { className });
    el.append(...kids);
    return el;
  };
  const text = () => span('marquee-text', title, ' ', span('title-aside', joinAside(aside, join)));
  const copy = text();
  copy.setAttribute('aria-hidden', 'true');
  box.replaceChildren(span('marquee-track', text(), copy));
  fitTitle(box);
}

/** Scrolls the title if it doesn't fit. */
export function fitTitle(box: HTMLElement): void {
  const track = box.querySelector<HTMLElement>('.marquee-track');
  const text = track?.firstElementChild as HTMLElement | null;
  if (!track || !text) return;
  const width = text.getBoundingClientRect().width;
  const scrolling = width > box.clientWidth + 1;
  box.classList.toggle('scrolling', scrolling);
  if (!scrolling) return;
  const distance = width + MARQUEE.gap;
  track.style.setProperty('--distance', `${distance}px`);
  track.style.setProperty('--gap', `${MARQUEE.gap}px`);
  track.style.setProperty('--duration', `${distance / MARQUEE.speed / (1 - MARQUEE.pause)}s`);
}
