// The ?debug=true panel: every instrument the band plays, with the
// sections it plays in this song and a menu of the sounds Strudel has
// loaded, for auditioning replacements. Each menu starts on the song's
// own pick; a choice replaces it at once, carries over to new songs, and
// is remembered in this browser (Choices). The panel lists the choices,
// ready to copy.

import type { Instruments, PartPath, Song } from '../../model';
import type { Arrangement } from '../../render';
import { SECTION_TYPES } from '../../style';
import type { SoundInfo } from '../player';
import { Choices, KIT, ROLES } from './choices';

// An element with properties (className, textContent, ...) and children.
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string> = {},
  ...kids: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

// One instrument's row: its menu, and where it plays in the song.
interface Row {
  path: PartPath;
  random: boolean; // picked anew for each song
  select: HTMLSelectElement;
  where: HTMLElement;
  node: HTMLElement;
}

// Menu groups: a label and the sound names in it.
type Groups = readonly (readonly [string, readonly string[]])[];

export class DebugPanel {
  private readonly choices = new Choices();
  private readonly rows: Row[];
  private readonly changes = el('pre', { className: 'debug-changes' });
  private readonly note = el('p', { className: 'debug-note', textContent: "Loading Strudel's sounds…" });
  private song: Song | undefined;
  private groups: Groups = [];
  private banks: readonly string[] = [];

  /**
   * Fills `root` with the panel, its menus empty until offerSounds().
   * `onChange` runs whenever a choice changes.
   */
  constructor(
    root: HTMLElement,
    private readonly onChange: () => void,
  ) {
    this.rows = [...ROLES.map((r) => this.row(r.path, r.label, !!r.from)), this.row(KIT, 'Drum kit', true)];
    root.replaceChildren(
      el('div', { className: 'debug-head' }, el('h2', { textContent: 'Instruments' }), this.note),
      el('div', { className: 'debug-rows' }, ...this.rows.map((r) => r.node)),
      el(
        'div',
        { className: 'debug-head' },
        el('h3', { textContent: 'Your changes' }),
        el('span', { className: 'debug-actions' }, this.copyButton(), this.resetButton()),
      ),
      this.changes,
    );
    root.hidden = false;
    this.refresh();
  }

  /** The instruments to arrange a song with: its own, with the panel's choices. */
  instruments(song: Song): Instruments {
    return this.choices.apply(song.instruments);
  }

  /** Show a new song's own picks, and where each part plays in its arrangement. */
  showSong(song: Song, uses: Arrangement['uses']): void {
    this.song = song;
    this.fillAll();
    for (const { path, random, where } of this.rows) {
      const types = [...(uses.get(path) ?? [])].map((t) => SECTION_TYPES[t].label);
      const plays = types.length ? `Plays in ${types.join(', ')}` : 'Not in this song';
      where.textContent = plays + (random ? ' (random each song)' : '');
    }
  }

  private row(path: PartPath, label: string, random: boolean): Row {
    const select = el('select', { title: label });
    select.addEventListener('change', () => this.choose(path, select.value));
    const where = el('span', { className: 'debug-plays', textContent: '…' });
    const node = el(
      'div',
      { className: 'debug-row' },
      el('span', { className: 'debug-label', textContent: label }),
      where,
      select,
    );
    const row = { path, random, select, where, node };
    this.fill(row);
    return row;
  }

  // What the song plays in a row without a choice.
  private songsPick(path: PartPath): string {
    const { song } = this;
    if (!song) return '…';
    return path === KIT ? song.instruments.kit.name : song.instruments.sound(path);
  }

  // A row's menu: the song's own pick, then each sound type in a group
  // (the choice kept even if it isn't in them).
  private fill({ path, select }: Row): void {
    const value = this.choices.get(path) ?? '';
    select.replaceChildren(new Option(`Song's pick (${this.songsPick(path)})`, ''));
    const groups: Groups = path === KIT ? [['Drum machines', this.banks]] : this.groups;
    if (path === KIT) select.append(new Option('Default samples', 'default'));
    const known = !value || value === 'default' || groups.some(([, names]) => names.includes(value));
    if (!known) select.append(new Option(value, value));
    for (const [label, names] of groups) {
      if (names.length) select.append(el('optgroup', { label }, ...names.map((n) => new Option(n, n))));
    }
    select.value = value;
  }

  private fillAll(): void {
    for (const row of this.rows) this.fill(row);
  }

  private choose(path: PartPath, value: string): void {
    this.choices.set(path, value);
    this.refresh();
    this.onChange();
  }

  // Marks the chosen rows and lists the choices.
  private refresh(): void {
    for (const { path, node } of this.rows) node.classList.toggle('changed', this.choices.get(path) !== undefined);
    const lines = this.choices.describe();
    this.changes.textContent = lines.length ? lines.join('\n') : "No changes: every instrument is the song's own pick.";
  }

  /** Offers the sounds Strudel has loaded in each menu: grouped by type, and the drum machines among the samples. */
  offerSounds(list: readonly SoundInfo[]): void {
    const names = (type: string, test: (n: string) => boolean = () => true) =>
      list
        .filter((s) => s.type === type && test(s.name))
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b));
    this.groups = [
      ['General MIDI soundfonts', names('soundfont')],
      ['Synths', names('synth')],
      ['Samples', names('sample')],
    ];
    // Drum machines: banks of samples named bank_bd, bank_sd, ...
    this.banks = [...new Set(names('sample', (n) => n.endsWith('_bd')).map((n) => n.replace(/_bd$/, '')))].filter((b) =>
      list.some((s) => s.name === `${b}_sd`),
    );
    this.fillAll();
    this.note.textContent = `${list.length} sounds. Changes play at once and carry over to new songs.`;
  }

  private copyButton(): HTMLButtonElement {
    const copy = el('button', { type: 'button', textContent: 'Copy changes' });
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.changes.textContent ?? '');
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Copy failed: select the text';
      }
      setTimeout(() => (copy.textContent = 'Copy changes'), 1500);
    });
    return copy;
  }

  private resetButton(): HTMLButtonElement {
    const reset = el('button', { type: 'button', textContent: 'Reset all' });
    reset.addEventListener('click', () => {
      this.choices.clear();
      this.fillAll();
      this.refresh();
      this.onChange();
    });
    return reset;
  }
}
