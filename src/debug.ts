// The ?debug=true panel: every instrument the band plays, each with a
// menu of the sounds Strudel has loaded, for auditioning replacements.
// Each menu starts on the song's own pick; a choice replaces it at once,
// carries over to new songs, and is remembered in this browser. The
// panel lists the choices, ready to copy.

import { BAND, Song, VOICES, type Sounds, type VoiceRole } from './engine';
// The engine's index leaves out Arranger, so it loads no Strudel.
// noinspection ES6PreferShortImport
import type { Instruments } from './engine/arranger';
import type { SoundInfo } from './strudel';

// Each instrument: where it lives in Sounds (a path like "bell.0"), what
// it plays, where a song picks it from if it does (`from`, in
// instruments.ts), and for the melody voices, their part.
const ROLES: readonly { path: string; label: string; plays: string; from?: string; voice?: VoiceRole }[] = [
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
  { path: 'lead.0', label: 'Lead', plays: 'The melody', from: 'VOICES.pool', voice: 'lead' },
  {
    path: 'double.0',
    label: 'Melody double',
    plays: 'The chorus hook, an octave up',
    from: 'VOICES.pool',
    voice: 'double',
  },
  { path: 'answer.0', label: 'Answer', plays: "Phrases in the gaps of later choruses' hook", from: 'PICKS.answer' },
  { path: 'bell.0', label: 'Bell', plays: 'The intro teaser, the bridge melody', from: 'PICKS.bell' },
  { path: 'stabs', label: 'Horn stabs', plays: 'Riffs, stop-time pre-chorus, last chorus, lifts', from: 'PICKS.stabs' },
  { path: 'hornDouble', label: 'Horn double', plays: 'Riffs and lifts, under the stabs', from: 'PICKS.hornDouble' },
  ...Array.from({ length: VOICES.soloists }, (_, i) => ({
    path: `soloists.${i}.0`,
    label: `Soloist ${i + 1}`,
    plays: 'Solos, and a note of the final chord',
    from: 'VOICES.pool',
    voice: 'soloists' as const,
  })),
];
const KIT = 'kit';
const STORAGE = 'endless-city-pop.debug';

type Choices = Record<string, string>; // path (or KIT) -> sound (or bank, or 'default')

const get = (sounds: Sounds, path: string): string => path.split('.').reduce<any>((x, k) => x[k], sounds) as string;

function set(sounds: Sounds, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  keys.reduce<any>((x, k) => x[k], sounds)[last] = value;
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
  const choices = load();
  let song: Song | undefined;
  let groups: [string, string[]][] = [];
  let banks: string[] = [];
  const selects = new Map<string, HTMLSelectElement>();
  const plays = new Map<string, HTMLElement>();
  const changes = el('pre', { className: 'debug-changes' });
  const note = el('p', { className: 'debug-note', textContent: "Loading Strudel's sounds…" });

  // What the song plays in a row without a choice.
  const songsPick = (path: string) => {
    if (!song) return '…';
    if (path === KIT) return song.kit ?? 'default samples';
    return get(song.sounds, path);
  };

  // A row's menu: the song's own pick, then each sound type in a group
  // (the choice kept even if it isn't in them).
  function fill(path: string) {
    const select = selects.get(path)!;
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
    if (value) choices[path] = value;
    else delete choices[path];
    save(choices);
    refresh();
    onChange();
  }

  function row(path: string, label: string, playsText: string) {
    const select = el('select', { title: label });
    select.addEventListener('change', () => choose(path, select.value));
    const where = el('span', { className: 'debug-plays', textContent: playsText });
    selects.set(path, select);
    plays.set(path, where);
    fill(path);
    return el(
      'div',
      { className: 'debug-row' },
      el('span', { className: 'debug-label', textContent: label }),
      where,
      select,
    );
  }

  // Marks the chosen rows and lists the choices, each with what it
  // replaces: a BAND default, or a random pick.
  function refresh() {
    for (const [path, select] of selects) select.closest('.debug-row')!.classList.toggle('changed', path in choices);
    const lines = Object.entries(choices).map(([path, value]) => {
      if (path === KIT)
        return `drum kit: ${value === 'default' ? 'default samples' : value} (instead of the song's pick)`;
      const role = ROLES.find((r) => r.path === path);
      const was = role?.from ? `picked at random from ${role.from}` : `BAND default '${get(BAND as Sounds, path)}'`;
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
    for (const path of Object.keys(choices)) delete choices[path];
    save(choices);
    for (const path of selects.keys()) fill(path);
    refresh();
    onChange();
  });

  root.replaceChildren(
    el('div', { className: 'debug-head' }, el('h2', { textContent: 'Instruments' }), note),
    el(
      'div',
      { className: 'debug-rows' },
      ...ROLES.map((r) => row(r.path, r.label, r.from ? `${r.plays} (random each song)` : r.plays)),
      row(KIT, 'Drum kit', 'Every drum part'),
    ),
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
        .sort();
    groups = [
      ['General MIDI soundfonts', names('soundfont')],
      ['Synths', names('synth')],
      ['Samples', names('sample')],
    ];
    // Drum machines: banks of samples named bank_bd, bank_sd, ...
    banks = [...new Set(names('sample', (n) => /_bd$/.test(n)).map((n) => n.replace(/_bd$/, '')))].filter((b) =>
      list.some((s) => s.name === `${b}_sd`),
    );
    for (const path of selects.keys()) fill(path);
    note.textContent = `${list.length} sounds. Changes play at once and carry over to new songs.`;
  });

  return {
    instruments(of) {
      const sounds = structuredClone(of.sounds);
      for (const [path, value] of Object.entries(choices)) {
        if (path === KIT) continue;
        // A melody voice takes its part's gain at the new sound's level.
        const voice = ROLES.find((r) => r.path === path)?.voice;
        if (voice) set(sounds, path.replace(/\.0$/, ''), Song.voice(value, voice));
        else set(sounds, path, value);
      }
      const kit = choices[KIT];
      return kit === undefined ? { sounds } : { sounds, kit: kit === 'default' ? null : kit };
    },
    showSong(next) {
      song = next;
      for (const path of selects.keys()) fill(path);
      // Which soloists this song has.
      const soloists = new Set(
        song.form.flatMap((s) => (s.opts.soloist === undefined ? [] : [s.opts.soloist % VOICES.soloists])),
      );
      for (let i = 0; i < VOICES.soloists; i++) {
        plays.get(`soloists.${i}.0`)!.textContent =
          `Solos (${soloists.has(i) ? 'in this song' : 'not this song'}), and a note of the final chord (random each song)`;
      }
    },
  };
}
