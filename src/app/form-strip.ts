// The form as a strip of blocks, one per section, sized by its bars. While
// a song plays, the section under the playhead glows and a line marks the
// playhead.

import type { Song } from '../model';
import type { SectionType } from '../style';
import { playheadAt } from './time';

// Section names for blocks too narrow for the full one (verse: v).
const SECTION_SHORT: Readonly<Record<SectionType, string>> = {
  intro: 'i',
  vamp: 'vp',
  verse: 'v',
  pre: 'p',
  chorus: 'c',
  riff: 'r',
  bridge: 'b',
  solo: 's',
  breakdown: 'bd',
  drumBreak: 'd',
  lift: 'l',
  outro: 'o',
  finale: 'f',
};

export function showForm(list: HTMLElement, song: Song): void {
  list.replaceChildren(
    ...song.form.map((s) => {
      const li = document.createElement('li');
      li.className = `sec sec-${s.type}`;
      li.style.flexGrow = String(s.bars);
      const shiftNote = s.shift ? `, up ${s.shift}` : '';
      li.title = `${s.type}, ${s.bars} bars${shiftNote}`;
      const label = (text: string, className: string) =>
        Object.assign(document.createElement('span'), { className, textContent: text });
      li.append(label(s.type === 'drumBreak' ? 'drums' : s.type, 'full'), label(SECTION_SHORT[s.type], 'short'));
      return li;
    }),
  );
  fitSections(list);
}

// Each block shows its section's full name if it fits, bold as when
// playing (a tenth wider), else the short one, else none: its colour and
// tooltip still say what it is.
export function fitSections(list: HTMLElement): void {
  for (const li of list.children as HTMLCollectionOf<HTMLElement>) {
    li.classList.remove('short', 'bare');
    const style = getComputedStyle(li);
    const room = li.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
    const fits = (label: string) => li.querySelector(label)!.getBoundingClientRect().width * 1.1 <= room;
    if (fits('.full')) continue;
    li.classList.add('short');
    if (!fits('.short')) li.classList.add('bare');
  }
}

// The playhead at `pos` bars into the song (negative: not playing),
// placed by how far through its section it is (the strip's gaps make a
// straight bar count drift). Past the final chord, no section glows and
// the line waits at the end.
export function showPlayhead(list: HTMLElement, line: HTMLElement, song: Song, pos: number): void {
  const items = [...list.children] as HTMLElement[];
  const head = playheadAt(song.form, pos);
  items.forEach((item, i) => item.classList.toggle('now', head?.index === i && head.through < 1));
  const item = head && items[head.index];
  line.hidden = !item;
  if (!item) return;
  line.style.transform = `translateX(${item.offsetLeft + head.through * item.offsetWidth}px)`;
  line.style.top = `${item.offsetTop - 5}px`;
  line.style.height = `${item.offsetHeight + 10}px`;
}
