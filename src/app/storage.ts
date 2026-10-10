// A value this browser remembers between visits. Storage can be blocked
// or full (a private window, a locked-down browser): then nothing is
// remembered, and the page carries on with its defaults.

export class Stored {
  constructor(private readonly key: string) {}

  /** The remembered value, or null if there is none (or no storage). */
  get(): string | null {
    try {
      return localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  set(value: string): void {
    try {
      localStorage.setItem(this.key, value);
    } catch {
      // Not remembered, but still in use.
    }
  }
}
