// The generators that write a part's material, each a writer class that
// owns its Rng: harmony (and solo changes), melodies, solos, bass lines
// and drums. Lines (Line) hold notes per bar, on sixteenths.

export { BassWriter, type BassLine } from './bass';
export { drumNotes, DrumWriter, type Drums } from './drums';
export { Harmonizer, SoloChangesWriter } from './harmony';
export { AnswerWriter, MelodyWriter, type Melody } from './melody';
export { SoloWriter, type Grace, type Solo } from './solo-line';
