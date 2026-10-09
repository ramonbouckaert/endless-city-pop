// Strudel ships no types: these cover what this project uses. Patterns
// are chained method calls, so every method returns another pattern.

declare module '@strudel/core' {
  export interface Pattern {
    [method: string]: (...args: any[]) => Pattern;
  }
  export interface Fraction {
    n: number;
    d: number;
    s: number;
    valueOf(): number;
  }
  export interface Hap {
    whole?: { begin: Fraction; end: Fraction };
    part: { begin: Fraction; end: Fraction };
    value: Record<string, any>;
  }
  type PatternArg = Pattern | string | number;
  export const saw: Pattern;
  export const silence: Pattern;
  export const rand: Pattern;
  export function arrange(...sections: [number, Pattern][]): Pattern;
  export function chord(p: PatternArg): Pattern;
  export function n(p: PatternArg): Pattern;
  export function s(p: PatternArg): Pattern;
  export function stack(...patterns: PatternArg[]): Pattern;
  export function noteToMidi(note: string): number;
}

declare module '@strudel/mini' {
  import type { Pattern } from '@strudel/core';
  export function mini(code: string): Pattern;
  export function miniAllStrings(): void;
}

declare module '@strudel/tonal';

declare module '@strudel/webaudio' {
  import type { Pattern } from '@strudel/core';
  export interface ReplState {
    started?: boolean;
    error?: { message?: string } | string;
  }
  export interface Repl {
    setCps(cps: number): void;
    setPattern(pattern: Pattern, autostart?: boolean): Promise<void>;
    stop(): void;
  }
  export function initAudioOnFirstClick(): void;
  export function registerSynthSounds(): Promise<void>;
  export function samples(url: string): Promise<void>;
  export function webaudioRepl(options: { onUpdateState?: (state: ReplState) => void }): Repl;
}

declare module '@strudel/soundfonts' {
  export function registerSoundfonts(): Promise<void>;
}

// General MIDI soundfont names -> their sample zones. Used by
// scripts/gm-sounds.ts; WebStorm resolves that import to the .mjs file
// itself, so it can't see the use.
declare module '@strudel/soundfonts/gm.mjs' {
  const gm: Record<string, unknown>;
  // noinspection JSUnusedGlobalSymbols
  export default gm;
}
