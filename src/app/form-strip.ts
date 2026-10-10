// The form as a strip of blocks, one per section, sized by its bars. While
// a song plays, the section under the playhead glows and a line marks the
// playhead. Clicking the strip, or dragging the line, seeks: the strip
// says where to (`onSeek`, in bars) and the page does the rest.

import type { Form, Playhead } from '../model';
import { SECTION_TYPES } from '../style';

export class FormStrip {
  private form: Form;
  // Whether the line is being dragged, and where it's held (the song's own
  // playhead waits until it's let go).
  private dragging = false;
  private held: Playhead = { index: 0, through: 0 };

  /** `list`: the strip's <ol>; `line`: the playhead's line over it; `onSeek`: a bar to seek to. */
  constructor(
    private readonly list: HTMLElement,
    private readonly line: HTMLElement,
    form: Form,
    private readonly onSeek: (bar: number) => void,
  ) {
    this.form = form;
    this.show(form);
    new ResizeObserver(() => this.fit()).observe(list);
    list.addEventListener('click', (e) => this.onSeek(this.form.barAt(this.headAt(e.clientX))));
    // Dragging the line moves it (and the glow) with the pointer; letting
    // go seeks there. The pointer is captured, so it can leave the line.
    line.addEventListener('pointerdown', (e) => {
      line.setPointerCapture(e.pointerId);
      this.hold(e.clientX);
    });
    line.addEventListener('pointermove', (e) => {
      if (this.dragging) this.hold(e.clientX);
    });
    line.addEventListener('pointerup', (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.onSeek(this.form.barAt(this.headAt(e.clientX)));
    });
    // The browser taking the pointer away (a gesture, the window losing
    // focus) drops the line where the song is, without seeking.
    line.addEventListener('pointercancel', () => (this.dragging = false));
    line.addEventListener('lostpointercapture', () => (this.dragging = false));
  }

  /** The bar to show for a song at `bar`: while the line is dragged, where it's held. */
  shown(bar: number): number {
    return this.dragging ? this.form.barAt(this.held) : bar;
  }

  show(form: Form): void {
    // A drag on the last song's strip ends with it (without seeking).
    this.dragging = false;
    this.form = form;
    this.list.replaceChildren(
      ...form.sections.map((s) => {
        const { label, short } = SECTION_TYPES[s.type];
        const li = document.createElement('li');
        li.className = `sec sec-${s.type}`;
        li.style.flexGrow = String(s.bars);
        const shiftNote = s.shift ? `, up ${s.shift}` : '';
        li.title = `${label}, ${s.bars} bars${shiftNote}`;
        const span = (text: string, className: string) =>
          Object.assign(document.createElement('span'), { className, textContent: text });
        li.append(span(label, 'full'), span(short, 'short'));
        return li;
      }),
    );
    this.fit();
  }

  /**
   * The playhead at `bar` (shown, or hidden), placed by how far through
   * its section it is (the strip's gaps make a straight bar count drift).
   * Past the final chord, no section glows and the line waits at the end.
   * While the line is dragged, it stays where it's held.
   */
  playhead(bar: number, shown: boolean): void {
    if (!this.dragging) this.place(this.form.playhead(bar), shown);
  }

  private hold(clientX: number): void {
    this.dragging = true;
    this.held = this.headAt(clientX);
    this.place(this.held, true);
  }

  // The line at a playhead, and its section glowing (neither, unshown).
  private place(head: Playhead, shown: boolean): void {
    const { line } = this;
    const items = this.items();
    items.forEach((item, i) => item.classList.toggle('now', shown && head.index === i && head.through < 1));
    const item = items[head.index];
    line.hidden = !shown || !item;
    if (line.hidden) return;
    line.style.transform = `translateX(${item.offsetLeft + head.through * item.offsetWidth}px)`;
    line.style.top = `${item.offsetTop - 5}px`;
    line.style.height = `${item.offsetHeight + 10}px`;
  }

  // The playhead at a point across the strip: in the block under it, or
  // in a gap or past either end, the nearest edge of the nearest block.
  private headAt(clientX: number): Playhead {
    const rects = this.items().map((item) => item.getBoundingClientRect());
    const distance = (r: DOMRect) => Math.max(r.left - clientX, 0, clientX - r.right);
    const index = rects.reduce((best, r, i) => (distance(r) < distance(rects[best]) ? i : best), 0);
    const r = rects[index];
    return { index, through: Math.min(Math.max((clientX - r.left) / r.width, 0), 1) };
  }

  private items(): HTMLElement[] {
    return [...this.list.children] as HTMLElement[];
  }

  // Each block shows its section's full name if it fits, bold as when
  // playing (a tenth wider), else the short one, else none: its colour and
  // tooltip still say what it is.
  private fit(): void {
    for (const li of this.list.children as HTMLCollectionOf<HTMLElement>) {
      li.classList.remove('short', 'bare');
      const style = getComputedStyle(li);
      const room = li.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      const fits = (label: string) => {
        const span = li.querySelector(label);
        return !!span && span.getBoundingClientRect().width * 1.1 <= room;
      };
      if (fits('.full')) continue;
      li.classList.add('short');
      if (!fits('.short')) li.classList.add('bare');
    }
  }
}
