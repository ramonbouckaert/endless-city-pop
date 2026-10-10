// Strudel's global setup, the engine's one side effect: imported for
// that alone, by every engine module that builds patterns.
//
// Tonal adds chord voicings and scales to Pattern (voicing(), scale(),
// anchor()), and plain strings passed to Strudel functions become
// mini-notation, as in the Strudel REPL.

import { miniAllStrings } from '@strudel/mini';
import '@strudel/tonal';

miniAllStrings();
