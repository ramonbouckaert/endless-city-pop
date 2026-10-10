// The ?debug=true panel: every instrument the band plays, each with a
// menu of the sounds Strudel has loaded, for auditioning replacements.
// Each menu starts on the song's own pick; a choice replaces it at once,
// carries over to new songs, and is remembered in this browser. The
// panel lists the choices, ready to copy.

import type { Instruments, Song, Sounds } from '../model';
import { BAND, VOICES, type BandPart } from '../style';
import type { SoundInfo } from './player';

// Each instrument: where it lives in Sounds (a path like "soloists.0"),
// what it plays, and where a song picks it from if it does (`from`, in
// style/instruments.ts).
const ROLES: readonly { path: string; label: string; plays: string; from?: string }[] = [
  { path: 'keys', label: 'Keys', plays: 'Comping in every section, the final chord', from: 'PICKS.keys' },
  { path: 'clav', label: 'Clavinet', plays: 'Verse, chorus, riff and solo grooves' },
  { path: 'guitar', label: 'Rhythm guitar', plays: 'Later verses', from: 'PICKS.guitar' },
  { path: 'bass', label: 'Bass', plays: 'Everywhere', from: 'PICKS.bass' },
  { path: 'pad', label: 'Pad', plays: 'Verses, pre-chorus, chorus, breakdown', from: 'PICKS.pad' },
  {
    path: 'strings',
    label: 'Strings',
    plays: 'Intro, pre-chorus, bridge, last chorus, final chord',
    from: 'PICKS.strings',
  },
  { path: 'choir', label: 'Choir', plays: 'Pre-chorus, last chorus, breakdown', from: 'PICKS.choir' },
  { path: 'lead', label: 'Lead', plays: 'The melody', from: 'VOICES.pool' },
  { path: 'double', label: 'Melody double', plays: 'The chorus hook, an octave up', from: 'VOICES.pool' },
  { path: 'answer', label: 'Answer', plays: "Phrases in the gaps of later choruses' hook", from: 'PICKS.answer' },
  { path: 'bell', label: 'Bell', plays: 'The intro teaser, the bridge melody', from: 'PICKS.bell' },
  { path: 'stabs', label: 'Horn stabs', plays: 'Riffs, stop-time pre-chorus, last chorus, lifts', from: 'PICKS.stabs' },
  { path: 'hornDouble', label: 'Horn double', plays: 'Riffs and lifts, under the stabs', from: 'PICKS.hornDouble' },
  ...Array.from({ length: VOICES.soloists }, (_, i) => ({
    path: `soloists.${i}`,
    label: `Soloist ${i + 1}`,
    plays: 'Solos, and a note of the final chord',
    from: 'VOICES.pool',
  })),
];
const KIT = 'kit';
const STORAGE = 'endless-city-pop.debug';

type Choices = Record<string, string>; // path (or KIT) -> sound (or bank, or 'default')

const get = (sounds: Sounds, path: string): string => path.split('.').reduce<any>((x, k) => x[k], sounds) as string;

// A copy of `x` with the value at a path (keys or array indexes) replaced.
function withPath<T>(x: T, [key, ...rest]: string[], value: unknown): T {
  const next = rest.length ? withPath((x as any)[key], rest, value) : value;
  return Array.isArray(x) ? (x.with(Number(key), next) as T) : { ...x, [key]: next };
}

// Choices with one changed (empty: back to the song's pick).
function withChoice(choices: Choices, path: string, value: string): Choices {
  const { [path]: _, ...rest } = choices;
  return value ? { ...rest, [path]: value } : rest;
}

// Choices remembered from before, for rows that still exist.
function load(): Choices {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as Choices;
    return Object.fromEntries(
      Object.entries(saved).filter(([path]) => path === KIT || ROLES.some((r) => r.path === path)),
    );
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
  /** Show a new song's own picks, and which soloists it has. */
  showSong(song: Song): void;
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
  const songsPick = (path: string) => {
    if (!song) return '…';
    if (path === KIT) return song.instruments.kit ?? 'default samples';
    return get(song.instruments.sounds, path);
  };

  // A row's menu: the song's own pick, then each sound type in a group
  // (the choice kept even if it isn't in them).
  function fill(path: string, select: HTMLSelectElement) {
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

  function choose(path: string, value: string) {
    choices = withChoice(choices, path, value);
    save(choices);
    refresh();
    onChange();
  }

  function row(path: string, label: string, playsText: string) {
    const select = el('select', { title: label });
    select.addEventListener('change', () => choose(path, select.value));
    const where = el('span', { className: 'debug-plays', textContent: playsText });
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

  const rows = [
    ...ROLES.map((r) => row(r.path, r.label, r.from ? `${r.plays} (random each song)` : r.plays)),
    row(KIT, 'Drum kit', 'Every drum part'),
  ];
  const selects = new Map(rows.map((r) => [r.path, r.select]));
  const plays = new Map(rows.map((r) => [r.path, r.where]));
  const fillAll = () => selects.forEach((select, path) => fill(path, select));

  // Marks the chosen rows and lists the choices, each with what it
  // replaces: a BAND default, or a random pick.
  function refresh() {
    for (const [path, select] of selects) select.closest('.debug-row')!.classList.toggle('changed', path in choices);
    const lines = Object.entries(choices).map(([path, value]) => {
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
      const sounds = Object.entries(choices).reduce(
        (acc, [path, value]) => (path === KIT ? acc : withPath(acc, path.split('.'), value)),
        of.instruments.sounds,
      );
      const kit = choices[KIT];
      if (kit === undefined) return { sounds, kit: of.instruments.kit };
      return { sounds, kit: kit === 'default' ? null : kit };
    },
    showSong(next) {
      song = next;
      fillAll();
      // Which soloists this song has.
      const soloists = new Set(song.soloists);
      for (let i = 0; i < VOICES.soloists; i++) {
        plays.get(`soloists.${i}`)!.textContent =
          `Solos (${soloists.has(i) ? 'in this song' : 'not this song'}), and a note of the final chord (random each song)`;
      }
    },
  };
}
