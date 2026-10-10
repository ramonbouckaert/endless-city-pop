// The form as a strip of blocks, one per section, sized by its bars. While
// a song plays, the section under the playhead glows and a line marks the
// playhead.

import type { Form } from '../model';
import { SECTION_TYPES } from '../style';

export class FormStrip {
  private form: Form | undefined;

  /** `list`: the strip's <ol>; `line`: the playhead's line over it. */
  constructor(
    private readonly list: HTMLElement,
    private readonly line: HTMLElement,
  ) {
    new ResizeObserver(() => this.fit()).observe(list);
  }

  show(form: Form): void {
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
   * The playhead at `pos` bars into the song (negative: not playing),
   * placed by how far through its section it is (the strip's gaps make a
   * straight bar count drift). Past the final chord, no section glows and
   * the line waits at the end.
   */
  playhead(pos: number): void {
    const { line } = this;
    const items = [...this.list.children] as HTMLElement[];
    const head = this.form?.playhead(pos);
    items.forEach((item, i) => item.classList.toggle('now', head?.index === i && head.through < 1));
    const item = head && items[head.index];
    line.hidden = !item;
    if (!item) return;
    line.style.transform = `translateX(${item.offsetLeft + head.through * item.offsetWidth}px)`;
    line.style.top = `${item.offsetTop - 5}px`;
    line.style.height = `${item.offsetHeight + 10}px`;
  }

  // Each block shows its section's full name if it fits, bold as when
  // playing (a tenth wider), else the short one, else none: its colour and
  // tooltip still say what it is.
  private fit(): void {
    for (const li of this.list.children as HTMLCollectionOf<HTMLElement>) {
      li.classList.remove('short', 'bare');
      const style = getComputedStyle(li);
      const room = li.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      const fits = (label: string) => li.querySelector(label)!.getBoundingClientRect().width * 1.1 <= room;
      if (fits('.full')) continue;
      li.classList.add('short');
      if (!fits('.short')) li.classList.add('bare');
    }
  }
}
