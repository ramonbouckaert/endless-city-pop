// The ?debug=true panel: every instrument the band plays, with the
// sections it plays in this song and a menu of the sounds Strudel has
// loaded, for auditioning replacements. Each menu starts on the song's
// own pick; a choice replaces it at once, carries over to new songs, and
// is remembered in this browser. The panel lists the choices, ready to
// copy.

import { soundAt, withSound, type Instruments, type PartPath, type Song, type SoundPath } from '../model';
import type { Arrangement } from '../render';
import { BAND, VOICES, type BandPart } from '../style';
import type { SoundInfo } from './player';

// Each instrument: where it lives in Sounds (a path like "soloists.0"),
// and where a song picks it from if it does (`from`, in
// style/instruments.ts).
const ROLES: readonly { path: SoundPath; label: string; from?: string }[] = [
  { path: 'keys', label: 'Keys', from: 'PICKS.keys' },
  { path: 'clav', label: 'Clavinet' },
  { path: 'guitar', label: 'Rhythm guitar', from: 'PICKS.guitar' },
  { path: 'bass', label: 'Bass', from: 'PICKS.bass' },
  { path: 'pad', label: 'Pad', from: 'PICKS.pad' },
  { path: 'strings', label: 'Strings', from: 'PICKS.strings' },
  { path: 'choir', label: 'Choir', from: 'PICKS.choir' },
  { path: 'lead', label: 'Lead', from: 'VOICES.pool' },
  { path: 'double', label: 'Melody double', from: 'VOICES.pool' },
  { path: 'answer', label: 'Answer', from: 'PICKS.answer' },
  { path: 'bell', label: 'Bell', from: 'PICKS.bell' },
  { path: 'stabs', label: 'Horn stabs', from: 'PICKS.stabs' },
  { path: 'hornDouble', label: 'Horn double', from: 'PICKS.hornDouble' },
  ...Array.from({ length: VOICES.soloists }, (_, i) => ({
    path: `soloists.${i}` as const,
    label: `Soloist ${i + 1}`,
    from: 'VOICES.pool',
  })),
];
const KIT = 'kit' satisfies PartPath;
const STORAGE = 'endless-city-pop.debug';

type Choices = Partial<Record<PartPath, string>>; // part -> sound (or bank, or 'default' for the kit)

// Is a path one of the panel's rows?
const isRow = (path: string): path is PartPath => path === KIT || ROLES.some((r) => r.path === path);

// Choices with one changed (empty: back to the song's pick).
function withChoice(choices: Choices, path: PartPath, value: string): Choices {
  const { [path]: _, ...rest } = choices;
  return value ? { ...rest, [path]: value } : rest;
}

// Choices remembered from before, for rows that still exist.
function load(): Choices {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as Record<string, string>;
    return Object.fromEntries(Object.entries(saved).filter(([path]) => isRow(path)));
  } catch {
    return {};
  }
}

function save(choices: Choices): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(choices));
  } catch {
    // Not remembered, but still in use.
  }
}

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

export interface DebugPanel {
  /** The instruments to arrange a song with: its own, with the panel's choices. */
  instruments(song: Song): Instruments;
  /** Show a new song's own picks, and where each part plays in its arrangement. */
  showSong(song: Song, uses: Arrangement['uses']): void;
}

/** Fills `root` with the panel. `onChange` runs whenever a choice changes. */
export function createDebugPanel(root: HTMLElement, sounds: Promise<SoundInfo[]>, onChange: () => void): DebugPanel {
  let choices = load();
  let song: Song | undefined;
  let groups: [string, string[]][] = [];
  let banks: string[] = [];
  const changes = el('pre', { className: 'debug-changes' });
  const note = el('p', { className: 'debug-note', textContent: "Loading Strudel's sounds…" });

  // What the song plays in a row without a choice.
  const songsPick = (path: PartPath) => {
    if (!song) return '…';
    if (path === KIT) return song.instruments.kit ?? 'default samples';
    return soundAt(song.instruments.sounds, path);
  };

  // A row's menu: the song's own pick, then each sound type in a group
  // (the choice kept even if it isn't in them).
  function fill(path: PartPath, select: HTMLSelectElement) {
    const value = choices[path] ?? '';
    select.replaceChildren(new Option(`Song's pick (${songsPick(path)})`, ''));
    const options = path === KIT ? ([['Drum machines', banks]] as [string, string[]][]) : groups;
    if (path === KIT) select.append(new Option('Default samples', 'default'));
    const known = !value || value === 'default' || options.some(([, names]) => names.includes(value));
    if (!known) select.append(new Option(value, value));
    for (const [label, names] of options) {
      if (names.length) select.append(el('optgroup', { label }, ...names.map((n) => new Option(n, n))));
    }
    select.value = value;
  }

  function choose(path: PartPath, value: string) {
    choices = withChoice(choices, path, value);
    save(choices);
    refresh();
    onChange();
  }

  function row(path: PartPath, label: string) {
    const select = el('select', { title: label });
    select.addEventListener('change', () => choose(path, select.value));
    const where = el('span', { className: 'debug-plays', textContent: '…' });
    fill(path, select);
    const node = el(
      'div',
      { className: 'debug-row' },
      el('span', { className: 'debug-label', textContent: label }),
      where,
      select,
    );
    return { path, select, where, node };
  }

  const rows = [...ROLES.map((r) => row(r.path, r.label)), row(KIT, 'Drum kit')];
  const selects = new Map(rows.map((r) => [r.path, r.select]));
  const plays = new Map(rows.map((r) => [r.path, r.where]));
  const fillAll = () => selects.forEach((select, path) => fill(path, select));

  // Marks the chosen rows and lists the choices, each with what it
  // replaces: a BAND default, or a random pick.
  function refresh() {
    for (const { path, node } of rows) node.classList.toggle('changed', path in choices);
    const lines = rows.flatMap(({ path }) => {
      const value = choices[path];
      if (value === undefined) return [];
      if (path === KIT)
        return `drum kit: ${value === 'default' ? 'default samples' : value} (instead of the song's pick)`;
      const role = ROLES.find((r) => r.path === path);
      const was = role?.from ? `picked at random from ${role.from}` : `BAND default '${BAND[path as BandPart]}'`;
      return `${path}: '${value}' (instead of ${was})`;
    });
    changes.textContent = lines.length ? lines.join('\n') : "No changes: every instrument is the song's own pick.";
  }

  const copy = el('button', { type: 'button', textContent: 'Copy changes' });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(changes.textContent ?? '');
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Copy failed: select the text';
    }
    setTimeout(() => (copy.textContent = 'Copy changes'), 1500);
  });
  const reset = el('button', { type: 'button', textContent: 'Reset all' });
  reset.addEventListener('click', () => {
    choices = {};
    save(choices);
    fillAll();
    refresh();
    onChange();
  });

  root.replaceChildren(
    el('div', { className: 'debug-head' }, el('h2', { textContent: 'Instruments' }), note),
    el('div', { className: 'debug-rows' }, ...rows.map((r) => r.node)),
    el(
      'div',
      { className: 'debug-head' },
      el('h3', { textContent: 'Your changes' }),
      el('span', { className: 'debug-actions' }, copy, reset),
    ),
    changes,
  );
  root.hidden = false;
  refresh();

  void sounds.then((list) => {
    const names = (type: string, test: (n: string) => boolean = () => true) =>
      list
        .filter((s) => s.type === type && test(s.name))
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b));
    groups = [
      ['General MIDI soundfonts', names('soundfont')],
      ['Synths', names('synth')],
      ['Samples', names('sample')],
    ];
    // Drum machines: banks of samples named bank_bd, bank_sd, ...
    banks = [...new Set(names('sample', (n) => n.endsWith('_bd')).map((n) => n.replace(/_bd$/, '')))].filter((b) =>
      list.some((s) => s.name === `${b}_sd`),
    );
    fillAll();
    note.textContent = `${list.length} sounds. Changes play at once and carry over to new songs.`;
  });

  return {
    instruments(of) {
      let { sounds, kit } = of.instruments;
      for (const { path } of ROLES) {
        const sound = choices[path];
        if (sound !== undefined) sounds = withSound(sounds, path, sound);
      }
      const bank = choices[KIT];
      if (bank !== undefined) kit = bank === 'default' ? null : bank;
      return { sounds, kit };
    },
    showSong(next, uses) {
      song = next;
      fillAll();
      for (const [path, where] of plays) {
        const types = [...(uses.get(path) ?? [])].map((t) => (t === 'drumBreak' ? 'drum break' : t));
        const random = path === KIT || ROLES.find((r) => r.path === path)?.from ? ' (random each song)' : '';
        where.textContent = (types.length ? `Plays in ${types.join(', ')}` : 'Not in this song') + random;
      }
    },
  };
}
