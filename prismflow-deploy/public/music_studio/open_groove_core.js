// Open Groove Studio core.
// Pure project model and music math for the standalone groovebox/composition tool.
(function (root) {
  'use strict';

  var OG_FORMAT = 'opengroove';
  var OG_VERSION = 1;
  var OG_DEFAULT_PPQ = 960;
  var OG_DEFAULT_BPM = 92;
  var OG_LEARNING_TOOL_META = {
    id: 'openGrooveStudio',
    title: 'Open Groove Studio',
    category: 'learning',
    subject: 'Music production, synthesis, rhythm, and composition',
    description: 'A standalone learning studio for making beats, shaping sounds, and connecting patterns to real notation.'
  };
  var OG_LEARNING_GOALS = [
    'Build rhythmic patterns with pads and steps.',
    'Connect beats, basslines, chords, and melody to measure-based composition.',
    'Understand synthesis through oscillator, envelope, filter, and effect choices.',
    'Keep performance timing separate from readable notation.',
    'Use license-aware samples and user-owned recordings responsibly.'
  ];
  var OG_STEM_TARGETS = {
    two: ['vocals', 'accompaniment'],
    four: ['vocals', 'drums', 'bass', 'other'],
    five: ['vocals', 'drums', 'bass', 'piano', 'other'],
    six: ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']
  };
  var OG_STEM_ENGINE_OPTIONS = [
    {
      id: 'manual-import',
      name: 'Manual stem import',
      availability: 'ready',
      license: 'user-supplied',
      modes: ['two', 'four', 'five', 'six'],
      note: 'Prepare named stem lanes and import user-owned stems from any separator.'
    },
    {
      id: 'external-demucs',
      name: 'External Demucs',
      availability: 'planned-bridge',
      license: 'MIT code',
      modes: ['two', 'four', 'five', 'six'],
      note: 'Highest quality path, but it needs a local or server-side Python worker and model downloads.'
    },
    {
      id: 'external-spleeter',
      name: 'External Spleeter',
      availability: 'planned-bridge',
      license: 'MIT code',
      modes: ['two', 'four', 'five'],
      note: 'Fast 2/4/5-stem baseline, best treated as an optional external worker.'
    },
    {
      id: 'browser-onnx',
      name: 'Browser ONNX/WebGPU',
      availability: 'research',
      license: 'model-dependent',
      modes: ['two', 'four'],
      note: 'Possible for optimized models, but large audio models can exceed browser memory or download budgets.'
    }
  ];
  var OG_EFFECT_PRESETS = [
    {
      id: 'filter',
      name: 'Filter',
      defaultParams: { type: 'lowpass', cutoff: 12000, q: 0.8 }
    },
    {
      id: 'drive',
      name: 'Drive',
      defaultParams: { amount: 0.12, mix: 0.35 }
    },
    {
      id: 'chorus',
      name: 'Chorus',
      defaultParams: { rate: 1.2, depth: 0.35, mix: 0.18 }
    },
    {
      id: 'delay',
      name: 'Delay',
      defaultParams: { time: 0.25, feedback: 0.28, mix: 0.22 }
    },
    {
      id: 'reverb',
      name: 'Reverb',
      defaultParams: { decay: 0.55, mix: 0.2 }
    }
  ];
  var OG_EFFECT_ORDER = ['filter', 'drive', 'chorus', 'delay', 'reverb'];
  var OG_AUTOMATION_TARGETS = [
    { id: 'effect.filter.cutoff', label: 'Filter Cutoff', effect: 'filter', param: 'cutoff', min: 80, max: 18000, defaultValue: 12000, unit: 'Hz' },
    { id: 'effect.filter.q', label: 'Filter Resonance', effect: 'filter', param: 'q', min: 0.1, max: 20, defaultValue: 0.8, unit: 'Q' },
    { id: 'effect.delay.mix', label: 'Delay Mix', effect: 'delay', param: 'mix', min: 0, max: 1, defaultValue: 0.22, unit: '%' },
    { id: 'effect.delay.feedback', label: 'Delay Feedback', effect: 'delay', param: 'feedback', min: 0, max: 0.85, defaultValue: 0.28, unit: '%' },
    { id: 'effect.delay.time', label: 'Delay Time', effect: 'delay', param: 'time', min: 0.03, max: 0.75, defaultValue: 0.25, unit: 's' },
    { id: 'effect.reverb.mix', label: 'Reverb Mix', effect: 'reverb', param: 'mix', min: 0, max: 1, defaultValue: 0.2, unit: '%' },
    { id: 'effect.reverb.decay', label: 'Reverb Decay', effect: 'reverb', param: 'decay', min: 0.05, max: 1.2, defaultValue: 0.55, unit: 's' },
    { id: 'effect.drive.amount', label: 'Drive Amount', effect: 'drive', param: 'amount', min: 0, max: 1, defaultValue: 0.12, unit: '%' },
    { id: 'effect.drive.mix', label: 'Drive Mix', effect: 'drive', param: 'mix', min: 0, max: 1, defaultValue: 0.35, unit: '%' },
    { id: 'effect.chorus.mix', label: 'Chorus Mix', effect: 'chorus', param: 'mix', min: 0, max: 1, defaultValue: 0.18, unit: '%' },
    { id: 'effect.chorus.rate', label: 'Chorus Rate', effect: 'chorus', param: 'rate', min: 0.05, max: 8, defaultValue: 1.2, unit: 'Hz' },
    { id: 'effect.chorus.depth', label: 'Chorus Depth', effect: 'chorus', param: 'depth', min: 0, max: 1, defaultValue: 0.35, unit: '%' },
    { id: 'mixer.gain', label: 'Track Volume', effect: null, param: 'gain', min: 0, max: 1.5, defaultValue: 1, unit: '%' }
  ];
  var OG_SONG_FORM_PRESETS = [
    {
      id: 'loop-sketch',
      name: 'Loop Sketch',
      shortName: 'Loop',
      sections: [
        { label: 'Intro', role: 'Intro', variant: 'A', bars: 4 },
        { label: 'Main', role: 'A', variant: 'A', bars: 4 },
        { label: 'Main 2', role: 'A', variant: 'A', bars: 4 },
        { label: 'Outro', role: 'Outro', variant: 'A', bars: 4 }
      ]
    },
    {
      id: 'verse-hook',
      name: 'Verse / Hook',
      shortName: 'Verse Hook',
      sections: [
        { label: 'Intro', role: 'Intro', variant: 'A', bars: 4 },
        { label: 'Verse', role: 'A', variant: 'A', bars: 8 },
        { label: 'Hook', role: 'B', variant: 'B', bars: 8 },
        { label: 'Verse 2', role: 'A', variant: 'A', bars: 8 },
        { label: 'Hook 2', role: 'B', variant: 'B', bars: 8 },
        { label: 'Outro', role: 'Outro', variant: 'A', bars: 4 }
      ]
    },
    {
      id: 'aaba',
      name: 'AABA',
      shortName: 'AABA',
      sections: [
        { label: 'A1', role: 'A', variant: 'A', bars: 8 },
        { label: 'A2', role: 'A', variant: 'A', bars: 8 },
        { label: 'B', role: 'Bridge', variant: 'B', bars: 8 },
        { label: 'A3', role: 'A', variant: 'A', bars: 8 }
      ]
    },
    {
      id: 'build-drop',
      name: 'Build / Drop',
      shortName: 'Build Drop',
      sections: [
        { label: 'Intro', role: 'Intro', variant: 'A', bars: 4 },
        { label: 'Build', role: 'Build', variant: 'B', bars: 4 },
        { label: 'Drop', role: 'C', variant: 'C', bars: 8 },
        { label: 'Break', role: 'Break', variant: 'A', bars: 4 },
        { label: 'Drop 2', role: 'C', variant: 'C', bars: 8 },
        { label: 'Outro', role: 'Outro', variant: 'A', bars: 4 }
      ]
    }
  ];
  var OG_SAFE_LICENSES = {
    'CC0-1.0': true,
    'Public Domain': true,
    'Original': true,
    'User Owned': true
  };
  var OG_REVIEW_LICENSES = {
    'CC-BY-4.0': true,
    'CC BY 4.0': true
  };
  var OG_NOTE_SEMITONES = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  var OG_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var OG_FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var OG_SCALE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    pentatonicMinor: [0, 3, 5, 7, 10],
    pentatonicMajor: [0, 2, 4, 7, 9]
  };
  var OG_CHORD_INTERVALS = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10]
  };
  var OG_CHORD_SUFFIX = {
    major: '',
    minor: 'm',
    diminished: 'dim',
    augmented: 'aug',
    sus2: 'sus2',
    sus4: 'sus4',
    maj7: 'maj7',
    min7: 'm7',
    dom7: '7'
  };
  var OG_SCALE_DEGREE_NAMES = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading tone'];
  var OG_SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
  var OG_ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  var OG_MODE_TRIADS = {
    major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
    minor: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
    dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
    phrygian: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
    lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
    mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
    locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor']
  };
  var OG_SYNTH_PATCH_PRESETS = [
    {
      id: 'warmBass',
      name: 'Warm Bass',
      role: 'bass',
      family: 'Bass',
      sourceType: 'synth',
      instrument: {
        name: 'Warm Bass',
        presetId: 'warmBass',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 760, q: 1.1 },
        envelope: { attack: 0.008, decay: 0.18, sustain: 0.72, release: 0.18 }
      }
    },
    {
      id: 'roundSub',
      name: 'Round Sub',
      role: 'bass',
      family: 'Bass',
      sourceType: 'synth',
      instrument: {
        name: 'Round Sub',
        presetId: 'roundSub',
        oscillator: 'sine',
        filter: { type: 'lowpass', cutoff: 420, q: 0.6 },
        envelope: { attack: 0.004, decay: 0.12, sustain: 0.85, release: 0.12 }
      }
    },
    {
      id: 'brightLead',
      name: 'Bright Lead',
      role: 'lead',
      family: 'Synth',
      sourceType: 'synth',
      instrument: {
        name: 'Bright Lead',
        presetId: 'brightLead',
        oscillator: 'square',
        filter: { type: 'lowpass', cutoff: 5400, q: 2.4 },
        envelope: { attack: 0.01, decay: 0.12, sustain: 0.62, release: 0.2 }
      }
    },
    {
      id: 'softPad',
      name: 'Soft Pad',
      role: 'pad',
      family: 'Synth',
      sourceType: 'synth',
      instrument: {
        name: 'Soft Pad',
        presetId: 'softPad',
        oscillator: 'triangle',
        filter: { type: 'lowpass', cutoff: 2800, q: 0.8 },
        envelope: { attack: 0.55, decay: 0.7, sustain: 0.78, release: 1.8 }
      }
    },
    {
      id: 'glassPluck',
      name: 'Glass Pluck',
      role: 'pluck',
      family: 'Synth',
      sourceType: 'synth',
      instrument: {
        name: 'Glass Pluck',
        presetId: 'glassPluck',
        oscillator: 'triangle',
        filter: { type: 'bandpass', cutoff: 3600, q: 4.2 },
        envelope: { attack: 0.003, decay: 0.18, sustain: 0.08, release: 0.42 }
      }
    },
    {
      id: 'wideUnisonLead',
      name: 'Wide Unison Lead',
      role: 'lead',
      family: 'Synth',
      sourceType: 'synth',
      instrument: {
        name: 'Wide Unison Lead',
        presetId: 'wideUnisonLead',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 5600, q: 1.7 },
        envelope: { attack: 0.007, decay: 0.16, sustain: 0.66, release: 0.32 },
        partials: [
          { ratio: 1, type: 'sawtooth', gain: 0.84 },
          { ratio: 2, type: 'triangle', gain: 0.18, detune: -5 },
          { ratio: 3, type: 'sine', gain: 0.06, detune: 7 }
        ],
        unison: { voices: 5, detune: 18, spread: 0.65 }
      }
    },
    {
      id: 'tapeKeys',
      name: 'Tape Keys',
      role: 'keys',
      family: 'Keys',
      sourceType: 'synth',
      instrument: {
        name: 'Tape Keys',
        presetId: 'tapeKeys',
        oscillator: 'triangle',
        filter: { type: 'lowpass', cutoff: 4300, q: 0.7 },
        envelope: { attack: 0.018, decay: 0.44, sustain: 0.42, release: 0.96 },
        partials: [
          { ratio: 1, type: 'triangle', gain: 0.86 },
          { ratio: 1.995, type: 'sine', gain: 0.18, detune: -6 },
          { ratio: 3.01, type: 'triangle', gain: 0.08, detune: 5 }
        ],
        transient: { gain: 0.055, duration: 0.024, cutoff: 3200 },
        unison: { voices: 3, detune: 7, spread: 0.35 }
      }
    },
    {
      id: 'fmBell',
      name: 'FM Bell',
      role: 'mallet',
      family: 'Mallets',
      sourceType: 'synth',
      instrument: {
        name: 'FM Bell',
        presetId: 'fmBell',
        oscillator: 'sine',
        filter: { type: 'bandpass', cutoff: 5200, q: 3.1 },
        envelope: { attack: 0.003, decay: 1.2, sustain: 0.04, release: 1.6 },
        partials: [
          { ratio: 1, type: 'sine', gain: 0.82 },
          { ratio: 2.71, type: 'sine', gain: 0.32, detune: 4 },
          { ratio: 3.92, type: 'triangle', gain: 0.18, detune: -9 },
          { ratio: 5.43, type: 'sine', gain: 0.08 }
        ],
        transient: { gain: 0.09, duration: 0.012, cutoff: 8400 }
      }
    },
    {
      id: 'classicPiano',
      name: 'Classic Piano',
      role: 'keys',
      family: 'Keys',
      sourceType: 'synth',
      instrument: {
        name: 'Classic Piano',
        presetId: 'classicPiano',
        oscillator: 'triangle',
        filter: { type: 'lowpass', cutoff: 7200, q: 0.6 },
        envelope: { attack: 0.004, decay: 0.68, sustain: 0.18, release: 0.72 },
        partials: [
          { ratio: 1, type: 'triangle', gain: 1 },
          { ratio: 2, type: 'sine', gain: 0.24 },
          { ratio: 3, type: 'sine', gain: 0.11 },
          { ratio: 4, type: 'triangle', gain: 0.05 }
        ],
        transient: { gain: 0.12, duration: 0.018, cutoff: 5200 }
      }
    },
    {
      id: 'electricPiano',
      name: 'Electric Piano',
      role: 'keys',
      family: 'Keys',
      sourceType: 'synth',
      instrument: {
        name: 'Electric Piano',
        presetId: 'electricPiano',
        oscillator: 'sine',
        filter: { type: 'bandpass', cutoff: 2600, q: 1.8 },
        envelope: { attack: 0.006, decay: 0.42, sustain: 0.32, release: 0.85 },
        partials: [
          { ratio: 1, type: 'sine', gain: 1 },
          { ratio: 2.01, type: 'triangle', gain: 0.22 },
          { ratio: 3.98, type: 'sine', gain: 0.08 }
        ],
        transient: { gain: 0.08, duration: 0.014, cutoff: 3800 }
      }
    },
    {
      id: 'tonewheelOrgan',
      name: 'Tonewheel Organ',
      role: 'keys',
      family: 'Keys',
      sourceType: 'synth',
      instrument: {
        name: 'Tonewheel Organ',
        presetId: 'tonewheelOrgan',
        oscillator: 'sine',
        filter: { type: 'lowpass', cutoff: 6400, q: 0.5 },
        envelope: { attack: 0.012, decay: 0.04, sustain: 0.92, release: 0.16 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.24 },
          { ratio: 1, type: 'sine', gain: 1 },
          { ratio: 2, type: 'sine', gain: 0.36 },
          { ratio: 3, type: 'sine', gain: 0.18 }
        ]
      }
    },
    {
      id: 'soloViolin',
      name: 'Solo Violin',
      role: 'melody',
      family: 'Strings',
      sourceType: 'synth',
      instrument: {
        name: 'Solo Violin',
        presetId: 'soloViolin',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 5200, q: 1.2 },
        envelope: { attack: 0.055, decay: 0.16, sustain: 0.82, release: 0.58 },
        partials: [
          { ratio: 1, type: 'sawtooth', gain: 0.82 },
          { ratio: 2, type: 'triangle', gain: 0.2, detune: 4 },
          { ratio: 3, type: 'sine', gain: 0.09, detune: -5 }
        ]
      }
    },
    {
      id: 'violaSection',
      name: 'Viola Section',
      role: 'harmony',
      family: 'Strings',
      sourceType: 'synth',
      instrument: {
        name: 'Viola Section',
        presetId: 'violaSection',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 4300, q: 0.9 },
        envelope: { attack: 0.09, decay: 0.22, sustain: 0.84, release: 0.78 },
        partials: [
          { ratio: 1, type: 'sawtooth', gain: 0.76 },
          { ratio: 1.995, type: 'triangle', gain: 0.18, detune: -7 },
          { ratio: 2.012, type: 'triangle', gain: 0.14, detune: 8 },
          { ratio: 3, type: 'sine', gain: 0.07 }
        ]
      }
    },
    {
      id: 'celloSection',
      name: 'Cello Section',
      role: 'harmony',
      family: 'Strings',
      sourceType: 'synth',
      instrument: {
        name: 'Cello Section',
        presetId: 'celloSection',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 3300, q: 0.8 },
        envelope: { attack: 0.075, decay: 0.24, sustain: 0.86, release: 0.9 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.18 },
          { ratio: 1, type: 'sawtooth', gain: 0.78 },
          { ratio: 2, type: 'triangle', gain: 0.16, detune: -4 },
          { ratio: 3, type: 'sine', gain: 0.08 }
        ]
      }
    },
    {
      id: 'stringBass',
      name: 'String Bass',
      role: 'bass',
      family: 'Strings',
      sourceType: 'synth',
      instrument: {
        name: 'String Bass',
        presetId: 'stringBass',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 2100, q: 0.7 },
        envelope: { attack: 0.04, decay: 0.25, sustain: 0.78, release: 0.62 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.28 },
          { ratio: 1, type: 'sawtooth', gain: 0.74 },
          { ratio: 2, type: 'triangle', gain: 0.13 },
          { ratio: 3, type: 'sine', gain: 0.05 }
        ]
      }
    },
    {
      id: 'flute',
      name: 'Flute',
      role: 'melody',
      family: 'Woodwinds',
      sourceType: 'synth',
      instrument: {
        name: 'Flute',
        presetId: 'flute',
        oscillator: 'sine',
        filter: { type: 'lowpass', cutoff: 7100, q: 0.6 },
        envelope: { attack: 0.045, decay: 0.12, sustain: 0.72, release: 0.4 },
        partials: [
          { ratio: 1, type: 'sine', gain: 0.9 },
          { ratio: 2, type: 'sine', gain: 0.08 },
          { ratio: 3, type: 'triangle', gain: 0.04 }
        ],
        transient: { gain: 0.035, duration: 0.025, cutoff: 7600 }
      }
    },
    {
      id: 'clarinet',
      name: 'Clarinet',
      role: 'melody',
      family: 'Woodwinds',
      sourceType: 'synth',
      instrument: {
        name: 'Clarinet',
        presetId: 'clarinet',
        oscillator: 'square',
        filter: { type: 'lowpass', cutoff: 4700, q: 1.1 },
        envelope: { attack: 0.035, decay: 0.1, sustain: 0.8, release: 0.35 },
        partials: [
          { ratio: 1, type: 'square', gain: 0.78 },
          { ratio: 3, type: 'sine', gain: 0.2 },
          { ratio: 5, type: 'sine', gain: 0.08 }
        ]
      }
    },
    {
      id: 'oboe',
      name: 'Oboe',
      role: 'melody',
      family: 'Woodwinds',
      sourceType: 'synth',
      instrument: {
        name: 'Oboe',
        presetId: 'oboe',
        oscillator: 'sawtooth',
        filter: { type: 'bandpass', cutoff: 2100, q: 2.6 },
        envelope: { attack: 0.025, decay: 0.08, sustain: 0.82, release: 0.28 },
        partials: [
          { ratio: 1, type: 'sawtooth', gain: 0.72 },
          { ratio: 2, type: 'triangle', gain: 0.22 },
          { ratio: 3, type: 'sine', gain: 0.13 },
          { ratio: 4, type: 'sine', gain: 0.07 }
        ]
      }
    },
    {
      id: 'bassoon',
      name: 'Bassoon',
      role: 'bass',
      family: 'Woodwinds',
      sourceType: 'synth',
      instrument: {
        name: 'Bassoon',
        presetId: 'bassoon',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 2500, q: 1 },
        envelope: { attack: 0.045, decay: 0.16, sustain: 0.78, release: 0.42 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.15 },
          { ratio: 1, type: 'sawtooth', gain: 0.78 },
          { ratio: 2, type: 'triangle', gain: 0.18 },
          { ratio: 3, type: 'sine', gain: 0.1 }
        ]
      }
    },
    {
      id: 'altoSax',
      name: 'Alto Sax',
      role: 'melody',
      family: 'Woodwinds',
      sourceType: 'synth',
      instrument: {
        name: 'Alto Sax',
        presetId: 'altoSax',
        oscillator: 'sawtooth',
        filter: { type: 'bandpass', cutoff: 1600, q: 1.8 },
        envelope: { attack: 0.02, decay: 0.12, sustain: 0.78, release: 0.36 },
        partials: [
          { ratio: 1, type: 'sawtooth', gain: 0.74 },
          { ratio: 2, type: 'square', gain: 0.16 },
          { ratio: 3, type: 'triangle', gain: 0.1 },
          { ratio: 5, type: 'sine', gain: 0.04 }
        ],
        transient: { gain: 0.04, duration: 0.018, cutoff: 5200 }
      }
    },
    {
      id: 'tenorSax',
      name: 'Tenor Sax',
      role: 'melody',
      family: 'Woodwinds',
      sourceType: 'synth',
      instrument: {
        name: 'Tenor Sax',
        presetId: 'tenorSax',
        oscillator: 'sawtooth',
        filter: { type: 'bandpass', cutoff: 1150, q: 1.6 },
        envelope: { attack: 0.024, decay: 0.14, sustain: 0.8, release: 0.42 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.12 },
          { ratio: 1, type: 'sawtooth', gain: 0.78 },
          { ratio: 2, type: 'square', gain: 0.14 },
          { ratio: 3, type: 'triangle', gain: 0.08 }
        ],
        transient: { gain: 0.035, duration: 0.018, cutoff: 4200 }
      }
    },
    {
      id: 'trumpet',
      name: 'Trumpet',
      role: 'melody',
      family: 'Brass',
      sourceType: 'synth',
      instrument: {
        name: 'Trumpet',
        presetId: 'trumpet',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 6200, q: 1.9 },
        envelope: { attack: 0.018, decay: 0.08, sustain: 0.84, release: 0.22 },
        partials: [
          { ratio: 1, type: 'sawtooth', gain: 0.82 },
          { ratio: 2, type: 'sawtooth', gain: 0.18 },
          { ratio: 3, type: 'triangle', gain: 0.1 },
          { ratio: 4, type: 'sine', gain: 0.05 }
        ]
      }
    },
    {
      id: 'frenchHorn',
      name: 'French Horn',
      role: 'harmony',
      family: 'Brass',
      sourceType: 'synth',
      instrument: {
        name: 'French Horn',
        presetId: 'frenchHorn',
        oscillator: 'triangle',
        filter: { type: 'lowpass', cutoff: 3600, q: 1.1 },
        envelope: { attack: 0.08, decay: 0.18, sustain: 0.84, release: 0.62 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.12 },
          { ratio: 1, type: 'triangle', gain: 0.78 },
          { ratio: 2, type: 'sawtooth', gain: 0.18 },
          { ratio: 3, type: 'sine', gain: 0.09 }
        ]
      }
    },
    {
      id: 'trombone',
      name: 'Trombone',
      role: 'harmony',
      family: 'Brass',
      sourceType: 'synth',
      instrument: {
        name: 'Trombone',
        presetId: 'trombone',
        oscillator: 'sawtooth',
        filter: { type: 'lowpass', cutoff: 3300, q: 1.2 },
        envelope: { attack: 0.035, decay: 0.11, sustain: 0.86, release: 0.36 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.16 },
          { ratio: 1, type: 'sawtooth', gain: 0.8 },
          { ratio: 2, type: 'triangle', gain: 0.16 },
          { ratio: 3, type: 'sine', gain: 0.07 }
        ]
      }
    },
    {
      id: 'tuba',
      name: 'Tuba',
      role: 'bass',
      family: 'Brass',
      sourceType: 'synth',
      instrument: {
        name: 'Tuba',
        presetId: 'tuba',
        oscillator: 'triangle',
        filter: { type: 'lowpass', cutoff: 1900, q: 0.8 },
        envelope: { attack: 0.05, decay: 0.16, sustain: 0.88, release: 0.48 },
        partials: [
          { ratio: 0.5, type: 'sine', gain: 0.24 },
          { ratio: 1, type: 'triangle', gain: 0.82 },
          { ratio: 2, type: 'sawtooth', gain: 0.14 },
          { ratio: 3, type: 'sine', gain: 0.06 }
        ]
      }
    },
    {
      id: 'timpani',
      name: 'Timpani',
      role: 'bass',
      family: 'Mallets & Percussion',
      sourceType: 'synth',
      instrument: {
        name: 'Timpani',
        presetId: 'timpani',
        oscillator: 'sine',
        filter: { type: 'lowpass', cutoff: 1800, q: 2.2 },
        envelope: { attack: 0.005, decay: 0.95, sustain: 0.16, release: 1.4 },
        partials: [
          { ratio: 1, type: 'sine', gain: 0.88 },
          { ratio: 1.52, type: 'sine', gain: 0.24 },
          { ratio: 2.13, type: 'triangle', gain: 0.12 }
        ],
        transient: { gain: 0.16, duration: 0.022, cutoff: 3200 }
      }
    },
    {
      id: 'marimba',
      name: 'Marimba',
      role: 'melody',
      family: 'Mallets & Percussion',
      sourceType: 'synth',
      instrument: {
        name: 'Marimba',
        presetId: 'marimba',
        oscillator: 'sine',
        filter: { type: 'lowpass', cutoff: 3600, q: 1.1 },
        envelope: { attack: 0.004, decay: 0.62, sustain: 0.1, release: 0.72 },
        partials: [
          { ratio: 1, type: 'sine', gain: 0.86 },
          { ratio: 2, type: 'triangle', gain: 0.18 },
          { ratio: 3.98, type: 'sine', gain: 0.08 }
        ],
        transient: { gain: 0.14, duration: 0.012, cutoff: 5200 }
      }
    },
    {
      id: 'xylophone',
      name: 'Xylophone',
      role: 'melody',
      family: 'Mallets & Percussion',
      sourceType: 'synth',
      instrument: {
        name: 'Xylophone',
        presetId: 'xylophone',
        oscillator: 'triangle',
        filter: { type: 'highpass', cutoff: 720, q: 0.8 },
        envelope: { attack: 0.003, decay: 0.32, sustain: 0.04, release: 0.36 },
        partials: [
          { ratio: 1, type: 'triangle', gain: 0.78 },
          { ratio: 2.6, type: 'sine', gain: 0.18 },
          { ratio: 4.9, type: 'sine', gain: 0.08 }
        ],
        transient: { gain: 0.12, duration: 0.01, cutoff: 7600 }
      }
    },
    {
      id: 'vibraphone',
      name: 'Vibraphone',
      role: 'harmony',
      family: 'Mallets & Percussion',
      sourceType: 'synth',
      instrument: {
        name: 'Vibraphone',
        presetId: 'vibraphone',
        oscillator: 'sine',
        filter: { type: 'lowpass', cutoff: 5200, q: 1 },
        envelope: { attack: 0.006, decay: 0.9, sustain: 0.24, release: 1.8 },
        partials: [
          { ratio: 1, type: 'sine', gain: 0.82 },
          { ratio: 2.02, type: 'sine', gain: 0.2, detune: 5 },
          { ratio: 3.01, type: 'triangle', gain: 0.1, detune: -6 }
        ],
        transient: { gain: 0.08, duration: 0.014, cutoff: 6400 }
      }
    }
  ];
  var OG_INSTRUMENT_FAMILY_GUIDES = {
    Bass: {
      sourceLabel: 'Built-in synth',
      captureHint: 'Record low root notes with short and sustained attacks for stronger bass mapping.',
      articulations: ['short', 'sustain', 'accent'],
      sampleNotes: ['C2', 'G2', 'C3'],
      classroomUse: 'Bass lines, roots, and harmonic grounding.'
    },
    Synth: {
      sourceLabel: 'Built-in synth',
      captureHint: 'Record one clean note per octave, then shape filter and envelope for the lesson.',
      articulations: ['short', 'sustain', 'accent'],
      sampleNotes: ['C3', 'C4', 'C5'],
      classroomUse: 'Sound design, melody, harmony, and electronic timbre.'
    },
    Keys: {
      sourceLabel: 'Built-in modeled keys',
      captureHint: 'Record soft, medium, and strong notes at low, middle, and high registers.',
      articulations: ['soft', 'medium', 'strong'],
      sampleNotes: ['C2', 'C3', 'C4', 'C5', 'C6'],
      classroomUse: 'Harmony, chord progressions, melody, and accompaniment.'
    },
    Strings: {
      sourceLabel: 'Built-in bowed-string model',
      captureHint: 'Record long bows, short bows, and accented attacks across low, middle, and high notes.',
      articulations: ['sustain', 'short', 'accent'],
      sampleNotes: ['G3', 'D4', 'A4', 'E5'],
      classroomUse: 'Orchestration, melodic contour, drones, and chord voicing.'
    },
    Woodwinds: {
      sourceLabel: 'Built-in wind model',
      captureHint: 'Record clean tongued starts and held notes, with extra care for breath and noise floor.',
      articulations: ['tongued', 'legato', 'accent'],
      sampleNotes: ['C4', 'G4', 'C5', 'G5'],
      classroomUse: 'Melody, counter-melody, register color, and ensemble balance.'
    },
    Brass: {
      sourceLabel: 'Built-in brass model',
      captureHint: 'Record medium dynamics first, then add accented attacks for stronger brass phrases.',
      articulations: ['sustain', 'staccato', 'accent'],
      sampleNotes: ['Bb2', 'F3', 'Bb3', 'F4'],
      classroomUse: 'Fanfares, harmonic support, bass motion, and call-and-response writing.'
    },
    'Mallets & Percussion': {
      sourceLabel: 'Built-in struck-instrument model',
      captureHint: 'Record clean single hits at several pitches and leave natural decay tails uncut.',
      articulations: ['single hit', 'roll', 'accent'],
      sampleNotes: ['C3', 'G3', 'C4', 'G4', 'C5'],
      classroomUse: 'Ostinatos, melodic percussion, rhythm layers, and timbre comparison.'
    }
  };
  var OG_INSTRUMENT_RANGES = {
    warmBass: { low: 'E1', high: 'C4', register: 'low' },
    roundSub: { low: 'C1', high: 'C3', register: 'sub bass' },
    brightLead: { low: 'C3', high: 'C6', register: 'lead' },
    softPad: { low: 'C2', high: 'C6', register: 'wide pad' },
    glassPluck: { low: 'C3', high: 'C6', register: 'plucked lead' },
    wideUnisonLead: { low: 'C2', high: 'C6', register: 'stacked synth lead' },
    tapeKeys: { low: 'A0', high: 'C7', register: 'lo-fi keyboard' },
    fmBell: { low: 'C3', high: 'C7', register: 'bright bell' },
    classicPiano: { low: 'A0', high: 'C8', register: 'full keyboard' },
    electricPiano: { low: 'A0', high: 'C8', register: 'full keyboard' },
    tonewheelOrgan: { low: 'C2', high: 'C7', register: 'manuals' },
    soloViolin: { low: 'G3', high: 'A7', register: 'soprano string' },
    violaSection: { low: 'C3', high: 'E6', register: 'alto string' },
    celloSection: { low: 'C2', high: 'C6', register: 'tenor-bass string' },
    stringBass: { low: 'E1', high: 'G4', register: 'bass string' },
    flute: { low: 'C4', high: 'D7', register: 'soprano woodwind' },
    clarinet: { low: 'E3', high: 'C7', register: 'single-reed woodwind' },
    oboe: { low: 'Bb3', high: 'A6', register: 'double-reed woodwind' },
    bassoon: { low: 'Bb1', high: 'E5', register: 'bass double reed' },
    altoSax: { low: 'Db3', high: 'Ab5', register: 'alto reed' },
    tenorSax: { low: 'Ab2', high: 'E5', register: 'tenor reed' },
    trumpet: { low: 'F#3', high: 'D6', register: 'soprano brass' },
    frenchHorn: { low: 'F2', high: 'C6', register: 'middle brass' },
    trombone: { low: 'E2', high: 'Bb4', register: 'tenor brass' },
    tuba: { low: 'D1', high: 'F4', register: 'bass brass' },
    timpani: { low: 'D2', high: 'A3', register: 'pitched drum' },
    marimba: { low: 'C2', high: 'C7', register: 'wooden mallet' },
    xylophone: { low: 'F3', high: 'C7', register: 'bright mallet' },
    vibraphone: { low: 'F3', high: 'F6', register: 'metal mallet' }
  };
  var OG_MELODY_PHRASE_STYLES = [
    { id: 'balanced', name: 'Balanced', density: 0.62 },
    { id: 'sparse', name: 'Sparse', density: 0.38 },
    { id: 'ascending', name: 'Ascending', density: 0.68 },
    { id: 'callResponse', name: 'Call / Response', density: 0.58 }
  ];
  var OG_DRUM_GROOVE_STYLES = [
    {
      id: 'boomBap',
      name: 'Boom Bap',
      entries: [
        { padId: 'pad_1', step: 0, velocity: 0.96 },
        { padId: 'pad_1', step: 7, velocity: 0.58 },
        { padId: 'pad_1', step: 10, velocity: 0.76 },
        { padId: 'pad_2', step: 4, velocity: 0.92 },
        { padId: 'pad_2', step: 12, velocity: 0.88 },
        { padId: 'pad_3', step: 0, velocity: 0.46 },
        { padId: 'pad_3', step: 2, velocity: 0.35 },
        { padId: 'pad_3', step: 4, velocity: 0.44 },
        { padId: 'pad_3', step: 6, velocity: 0.36 },
        { padId: 'pad_3', step: 8, velocity: 0.45 },
        { padId: 'pad_3', step: 10, velocity: 0.34 },
        { padId: 'pad_3', step: 12, velocity: 0.43 },
        { padId: 'pad_3', step: 14, velocity: 0.35 }
      ]
    },
    {
      id: 'fourFloor',
      name: 'Four Floor',
      entries: [
        { padId: 'pad_1', step: 0, velocity: 0.95 },
        { padId: 'pad_1', step: 4, velocity: 0.9 },
        { padId: 'pad_1', step: 8, velocity: 0.93 },
        { padId: 'pad_1', step: 12, velocity: 0.88 },
        { padId: 'pad_2', step: 4, velocity: 0.82 },
        { padId: 'pad_2', step: 12, velocity: 0.84 },
        { padId: 'pad_3', step: 2, velocity: 0.42 },
        { padId: 'pad_3', step: 6, velocity: 0.4 },
        { padId: 'pad_3', step: 10, velocity: 0.42 },
        { padId: 'pad_3', step: 14, velocity: 0.4 },
        { padId: 'pad_5', step: 12, velocity: 0.58 }
      ]
    },
    {
      id: 'halfTime',
      name: 'Half Time',
      entries: [
        { padId: 'pad_1', step: 0, velocity: 0.98 },
        { padId: 'pad_1', step: 6, velocity: 0.7 },
        { padId: 'pad_1', step: 11, velocity: 0.66 },
        { padId: 'pad_2', step: 8, velocity: 0.94 },
        { padId: 'pad_3', step: 0, velocity: 0.38 },
        { padId: 'pad_3', step: 3, velocity: 0.28 },
        { padId: 'pad_3', step: 6, velocity: 0.34 },
        { padId: 'pad_3', step: 9, velocity: 0.3 },
        { padId: 'pad_3', step: 12, velocity: 0.36 },
        { padId: 'pad_6', step: 15, velocity: 0.46 }
      ]
    },
    {
      id: 'syncopated',
      name: 'Syncopated',
      entries: [
        { padId: 'pad_1', step: 0, velocity: 0.94 },
        { padId: 'pad_1', step: 3, velocity: 0.62 },
        { padId: 'pad_1', step: 9, velocity: 0.82 },
        { padId: 'pad_1', step: 14, velocity: 0.55 },
        { padId: 'pad_2', step: 4, velocity: 0.84 },
        { padId: 'pad_2', step: 11, velocity: 0.86 },
        { padId: 'pad_3', step: 1, velocity: 0.35 },
        { padId: 'pad_3', step: 4, velocity: 0.42 },
        { padId: 'pad_3', step: 7, velocity: 0.31 },
        { padId: 'pad_3', step: 10, velocity: 0.4 },
        { padId: 'pad_3', step: 13, velocity: 0.34 },
        { padId: 'pad_11', step: 6, velocity: 0.45 },
        { padId: 'pad_11', step: 15, velocity: 0.4 }
      ]
    }
  ];
  var OG_PAD_TEMPLATE = [
    ['pad_1', 'Kick', 'kick'],
    ['pad_2', 'Snare', 'snare'],
    ['pad_3', 'Closed Hat', 'hihat'],
    ['pad_4', 'Open Hat', 'openhat'],
    ['pad_5', 'Clap', 'clap'],
    ['pad_6', 'Rim', 'rim'],
    ['pad_7', 'Tom Low', 'tomLow'],
    ['pad_8', 'Tom High', 'tomHigh'],
    ['pad_9', 'Crash', 'crash'],
    ['pad_10', 'Ride', 'ride'],
    ['pad_11', 'Shaker', 'shaker'],
    ['pad_12', 'Perc 1', 'perc'],
    ['pad_13', 'Sub Hit', 'sub'],
    ['pad_14', 'Chord Hit', 'chord'],
    ['pad_15', 'Vocal Chop', 'vocal'],
    ['pad_16', 'FX', 'fx']
  ];
  var OG_FACTORY_SAMPLE_KITS = [
    {
      id: 'openGrooveProceduralKit',
      name: 'Open Groove Procedural Kit',
      version: 1,
      license: 'Original',
      creator: 'Open Groove',
      source: 'Built-in procedural synthesis',
      voice: { character: 'studio', pitch: 1, brightness: 1, decay: 1, noise: 1, click: 1, body: 1 },
      originalUrl: 'generated://open-groove/procedural-kit',
      pads: [
        { padId: 'pad_1', name: 'Deep Kick', engine: 'kick', durationSec: 0.42, gain: 0.95, tags: ['kick', 'drum'] },
        { padId: 'pad_2', name: 'Body Snare', engine: 'snare', durationSec: 0.26, gain: 0.88, tags: ['snare', 'drum'] },
        { padId: 'pad_3', name: 'Tight Hat', engine: 'hihat', durationSec: 0.08, gain: 0.72, chokeGroup: 'hat', tags: ['hat', 'drum'] },
        { padId: 'pad_4', name: 'Open Air Hat', engine: 'openhat', durationSec: 0.42, gain: 0.78, chokeGroup: 'hat', tags: ['hat', 'drum'] },
        { padId: 'pad_5', name: 'Layered Clap', engine: 'clap', durationSec: 0.18, gain: 0.84, tags: ['clap', 'drum'] },
        { padId: 'pad_6', name: 'Bright Rim', engine: 'rim', durationSec: 0.12, gain: 0.78, tags: ['rim', 'drum'] },
        { padId: 'pad_7', name: 'Low Tom', engine: 'tomLow', durationSec: 0.34, gain: 0.86, tags: ['tom', 'drum'] },
        { padId: 'pad_8', name: 'High Tom', engine: 'tomHigh', durationSec: 0.28, gain: 0.82, tags: ['tom', 'drum'] },
        { padId: 'pad_9', name: 'Wash Crash', engine: 'crash', durationSec: 0.9, gain: 0.68, tags: ['cymbal', 'drum'] },
        { padId: 'pad_10', name: 'Ping Ride', engine: 'ride', durationSec: 0.78, gain: 0.66, tags: ['cymbal', 'drum'] },
        { padId: 'pad_11', name: 'Soft Shaker', engine: 'shaker', durationSec: 0.1, gain: 0.62, tags: ['shaker', 'percussion'] },
        { padId: 'pad_12', name: 'Wood Perc', engine: 'perc', durationSec: 0.16, gain: 0.76, tags: ['percussion', 'wood'] },
        { padId: 'pad_13', name: 'Round Sub Hit', engine: 'sub', durationSec: 0.48, gain: 0.9, tags: ['sub', 'bass'] },
        { padId: 'pad_14', name: 'Minor Chord Hit', engine: 'chord', durationSec: 0.52, gain: 0.7, tags: ['chord', 'tonal'] },
        { padId: 'pad_15', name: 'Vowel Chop', engine: 'vocal', durationSec: 0.28, gain: 0.72, tags: ['vocal', 'tonal'] },
        { padId: 'pad_16', name: 'Noise Sweep FX', engine: 'fx', durationSec: 0.6, gain: 0.7, tags: ['fx', 'sweep'] }
      ]
    },
    {
      id: 'openGrooveElectronicKit',
      name: 'Open Groove Electronic Kit',
      version: 1,
      license: 'Original',
      creator: 'Open Groove',
      source: 'Built-in procedural synthesis',
      voice: { character: 'electronic', pitch: 1.08, brightness: 1.22, decay: 0.74, noise: 0.86, click: 1.45, body: 0.95 },
      originalUrl: 'generated://open-groove/electronic-kit',
      pads: [
        { padId: 'pad_1', name: 'Punch Kick', engine: 'kick', durationSec: 0.34, gain: 0.98, tags: ['kick', 'electronic'] },
        { padId: 'pad_2', name: 'Snap Snare', engine: 'snare', durationSec: 0.2, gain: 0.86, tags: ['snare', 'electronic'] },
        { padId: 'pad_3', name: 'Tick Hat', engine: 'hihat', durationSec: 0.06, gain: 0.66, chokeGroup: 'hat', tags: ['hat', 'electronic'] },
        { padId: 'pad_4', name: 'Sizzle Hat', engine: 'openhat', durationSec: 0.28, gain: 0.72, chokeGroup: 'hat', tags: ['hat', 'electronic'] },
        { padId: 'pad_5', name: 'Digital Clap', engine: 'clap', durationSec: 0.14, gain: 0.82, tags: ['clap', 'electronic'] },
        { padId: 'pad_6', name: 'Machine Rim', engine: 'rim', durationSec: 0.08, gain: 0.74, tags: ['rim', 'electronic'] },
        { padId: 'pad_7', name: 'Laser Tom Low', engine: 'tomLow', durationSec: 0.3, gain: 0.82, tags: ['tom', 'electronic'] },
        { padId: 'pad_8', name: 'Laser Tom High', engine: 'tomHigh', durationSec: 0.24, gain: 0.78, tags: ['tom', 'electronic'] },
        { padId: 'pad_9', name: 'Bright Crash', engine: 'crash', durationSec: 0.72, gain: 0.62, tags: ['cymbal', 'electronic'] },
        { padId: 'pad_10', name: 'Metal Ride', engine: 'ride', durationSec: 0.58, gain: 0.62, tags: ['cymbal', 'electronic'] },
        { padId: 'pad_11', name: 'Clock Shaker', engine: 'shaker', durationSec: 0.08, gain: 0.58, tags: ['shaker', 'electronic'] },
        { padId: 'pad_12', name: 'Bit Perc', engine: 'perc', durationSec: 0.12, gain: 0.72, tags: ['percussion', 'electronic'] },
        { padId: 'pad_13', name: 'Short Sub Drop', engine: 'sub', durationSec: 0.4, gain: 0.88, tags: ['sub', 'electronic'] },
        { padId: 'pad_14', name: 'Stab Chord', engine: 'chord', durationSec: 0.38, gain: 0.68, tags: ['chord', 'electronic'] },
        { padId: 'pad_15', name: 'Robot Vowel', engine: 'vocal', durationSec: 0.22, gain: 0.68, tags: ['vocal', 'electronic'] },
        { padId: 'pad_16', name: 'Riser FX', engine: 'fx', durationSec: 0.54, gain: 0.72, tags: ['fx', 'electronic'] }
      ]
    },
    {
      id: 'openGrooveClassroomPercussionKit',
      name: 'Open Groove Classroom Percussion Kit',
      version: 1,
      license: 'Original',
      creator: 'Open Groove',
      source: 'Built-in procedural synthesis',
      voice: { character: 'classroom', pitch: 0.92, brightness: 0.82, decay: 1.12, noise: 1.18, click: 0.72, body: 1.08 },
      originalUrl: 'generated://open-groove/classroom-percussion-kit',
      pads: [
        { padId: 'pad_1', name: 'Desk Boom', engine: 'kick', durationSec: 0.38, gain: 0.9, tags: ['kick', 'classroom'] },
        { padId: 'pad_2', name: 'Book Snap', engine: 'snare', durationSec: 0.22, gain: 0.8, tags: ['snare', 'classroom'] },
        { padId: 'pad_3', name: 'Pencil Tick', engine: 'hihat', durationSec: 0.06, gain: 0.58, chokeGroup: 'hat', tags: ['hat', 'classroom'] },
        { padId: 'pad_4', name: 'Paper Swish', engine: 'openhat', durationSec: 0.34, gain: 0.62, chokeGroup: 'hat', tags: ['hat', 'classroom'] },
        { padId: 'pad_5', name: 'Hand Clap', engine: 'clap', durationSec: 0.18, gain: 0.76, tags: ['clap', 'classroom'] },
        { padId: 'pad_6', name: 'Table Rim', engine: 'rim', durationSec: 0.1, gain: 0.72, tags: ['rim', 'classroom'] },
        { padId: 'pad_7', name: 'Floor Tom', engine: 'tomLow', durationSec: 0.32, gain: 0.78, tags: ['tom', 'classroom'] },
        { padId: 'pad_8', name: 'Container Tom', engine: 'tomHigh', durationSec: 0.26, gain: 0.74, tags: ['tom', 'classroom'] },
        { padId: 'pad_9', name: 'Foil Crash', engine: 'crash', durationSec: 0.74, gain: 0.58, tags: ['cymbal', 'classroom'] },
        { padId: 'pad_10', name: 'Bell Ride', engine: 'ride', durationSec: 0.64, gain: 0.58, tags: ['cymbal', 'classroom'] },
        { padId: 'pad_11', name: 'Cup Shaker', engine: 'shaker', durationSec: 0.1, gain: 0.6, tags: ['shaker', 'classroom'] },
        { padId: 'pad_12', name: 'Wood Block', engine: 'perc', durationSec: 0.14, gain: 0.7, tags: ['percussion', 'classroom'] },
        { padId: 'pad_13', name: 'Low Hum Hit', engine: 'sub', durationSec: 0.42, gain: 0.78, tags: ['sub', 'classroom'] },
        { padId: 'pad_14', name: 'Group Chord Hit', engine: 'chord', durationSec: 0.46, gain: 0.64, tags: ['chord', 'classroom'] },
        { padId: 'pad_15', name: 'Syllable Chop', engine: 'vocal', durationSec: 0.24, gain: 0.66, tags: ['vocal', 'classroom'] },
        { padId: 'pad_16', name: 'Room Sweep FX', engine: 'fx', durationSec: 0.52, gain: 0.66, tags: ['fx', 'classroom'] }
      ]
    }
  ];

  function ogClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ogFinite(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function ogClamp(value, min, max, fallback) {
    var n = ogFinite(value, fallback);
    return Math.max(min, Math.min(max, n));
  }

  function ogInt(value, fallback) {
    return Math.round(ogFinite(value, fallback));
  }

  function ogSafeString(value, fallback) {
    var s = String(value == null ? '' : value).trim();
    return s || fallback;
  }

  function ogHashString(value) {
    var text = String(value == null ? '' : value);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function ogSeededUnit(seed) {
    var x = ogHashString(seed);
    x = (x ^ 61) ^ (x >>> 16);
    x = x + (x << 3);
    x = x ^ (x >>> 4);
    x = Math.imul(x, 0x27d4eb2d);
    x = x ^ (x >>> 15);
    return ((x >>> 0) % 1000000) / 1000000;
  }

  function ogIsSafeAudioDataUrl(value) {
    return /^data:audio\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(String(value || '').trim());
  }

  function ogEstimateDataUrlBytes(value) {
    var text = String(value || '');
    var comma = text.indexOf(',');
    if (comma < 0) return 0;
    var payload = text.slice(comma + 1).replace(/\s+/g, '');
    if (!payload) return 0;
    var padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor(payload.length * 3 / 4) - padding);
  }

  function ogSafeTrackType(value) {
    return value === 'synth' || value === 'sampler' || value === 'audio' || value === 'notation' || value === 'automation'
      ? value
      : 'drumRack';
  }

  function ogEnsureCounters(project) {
    project.counters = project.counters || {};
    ['track', 'pattern', 'event', 'asset', 'scene'].forEach(function (key) {
      project.counters[key] = Math.max(0, ogInt(project.counters[key], 0));
    });
  }

  function ogMintId(project, kind) {
    ogEnsureCounters(project);
    project.counters[kind] = (project.counters[kind] || 0) + 1;
    var prefix = kind === 'track' ? 'tr' : kind === 'pattern' ? 'pt' : kind === 'event' ? 'ev' : kind === 'asset' ? 'as' : 'sc';
    return prefix + project.counters[kind];
  }

  function ogCreateDefaultPads() {
    return OG_PAD_TEMPLATE.map(function (pad, i) {
      return {
        id: pad[0],
        index: i,
        name: pad[1],
        engine: pad[2],
        gain: 0.9,
        pitch: 0,
        chokeGroup: pad[2] === 'openhat' || pad[2] === 'hihat' ? 'hat' : null,
        assetId: null
      };
    });
  }

  function ogCreateProject(options) {
    options = options || {};
    var bpm = ogClamp(options.bpm, 40, 240, OG_DEFAULT_BPM);
    var ppq = Math.max(24, ogInt(options.ppq, OG_DEFAULT_PPQ));
    var ts = Array.isArray(options.timeSignature) ? options.timeSignature : [4, 4];
    var project = {
      format: OG_FORMAT,
      schemaVersion: OG_VERSION,
      title: ogSafeString(options.title, 'Untitled Groove'),
      createdAt: ogInt(options.now, 0),
      updatedAt: ogInt(options.now, 0),
      bpm: bpm,
      swing: ogClamp(options.swing, 0, 0.75, 0),
      timeSignature: [Math.max(1, ogInt(ts[0], 4)), Math.max(1, ogInt(ts[1], 4))],
      key: {
        tonic: ogSafeString(options.tonic, 'C'),
        mode: ogSafeString(options.mode, 'minor')
      },
      ppq: ppq,
      tracks: [],
      patterns: [],
      scenes: [],
      arrangement: [],
      assets: [],
      mixer: {
        master: { gain: 0.9, limiter: true }
      },
      license: {
        policy: 'Built-in content must be CC0, public domain, original, or explicitly user-owned.'
      },
      counters: { track: 0, pattern: 0, event: 0, asset: 0, scene: 0 }
    };

    var drums = ogAddTrack(project, { type: 'drumRack', name: 'Drum Rack' });
    var synth = ogAddTrack(project, { type: 'synth', name: 'Synth 1' });
    var pattern = ogAddPattern(project, { name: 'Pattern 1', bars: 4 });
    project.scenes.push({ id: ogMintId(project, 'scene'), name: 'Scene 1', patternIds: [pattern.id] });
    project.arrangement.push({ sceneId: project.scenes[0].id, startBar: 1, bars: 4 });
    project.mixer[drums.id] = { gain: 0.85, pan: 0, mute: false, solo: false };
    project.mixer[synth.id] = { gain: 0.75, pan: 0, mute: false, solo: false };
    return project;
  }

  function ogAddTrack(project, options) {
    options = options || {};
    if (!project || !Array.isArray(project.tracks)) throw new Error('OpenGroove: project is not ready');
    var type = ogSafeTrackType(options.type);
    var track = {
      id: options.id || ogMintId(project, 'track'),
      type: type,
      name: ogSafeString(options.name, type === 'drumRack' ? 'Drum Rack' : 'Track'),
      gain: ogClamp(options.gain, 0, 2, 1),
      pan: ogClamp(options.pan, -1, 1, 0),
      mute: !!options.mute,
      solo: !!options.solo,
      instrument: options.instrument ? ogClone(options.instrument) : null,
      effects: Array.isArray(options.effects) ? ogNormalizeEffectList(options.effects, { includeDisabled: true }) : []
    };
    if (type === 'drumRack') track.pads = Array.isArray(options.pads) ? ogClone(options.pads) : ogCreateDefaultPads();
    if (type === 'synth') track.instrument = ogNormalizeSynthInstrument(track.instrument);
    project.tracks.push(track);
    return track;
  }

  function ogAddPattern(project, options) {
    options = options || {};
    if (!project || !Array.isArray(project.patterns)) throw new Error('OpenGroove: project is not ready');
    var pattern = {
      id: options.id || ogMintId(project, 'pattern'),
      name: ogSafeString(options.name, 'Pattern ' + (project.patterns.length + 1)),
      bars: Math.max(1, ogInt(options.bars, 4)),
      events: Array.isArray(options.events) ? ogClone(options.events) : []
    };
    project.patterns.push(pattern);
    return pattern;
  }

  function ogFindTrack(project, trackId) {
    var tracks = project && Array.isArray(project.tracks) ? project.tracks : [];
    for (var i = 0; i < tracks.length; i++) if (tracks[i].id === trackId) return tracks[i];
    return null;
  }

  function ogFindPattern(project, patternId) {
    var patterns = project && Array.isArray(project.patterns) ? project.patterns : [];
    for (var i = 0; i < patterns.length; i++) if (patterns[i].id === patternId) return patterns[i];
    return null;
  }

  function ogTicksPerBeat(project) {
    return Math.max(24, ogInt(project && project.ppq, OG_DEFAULT_PPQ));
  }

  function ogTicksPerMeasure(project) {
    var ts = project && Array.isArray(project.timeSignature) ? project.timeSignature : [4, 4];
    var numerator = Math.max(1, ogInt(ts[0], 4));
    var denominator = Math.max(1, ogInt(ts[1], 4));
    return Math.round(ogTicksPerBeat(project) * numerator * (4 / denominator));
  }

  function ogPatternLengthTicks(project, patternOrId) {
    var pattern = typeof patternOrId === 'string' ? ogFindPattern(project, patternOrId) : patternOrId;
    return ogTicksPerMeasure(project) * Math.max(1, ogInt(pattern && pattern.bars, 1));
  }

  function ogBarsToTicks(project, bars) {
    return ogTicksPerMeasure(project) * Math.max(0, ogFinite(bars, 0));
  }

  function ogTickToPosition(project, tick) {
    var t = Math.max(0, ogInt(tick, 0));
    var measureTicks = ogTicksPerMeasure(project);
    var beatTicks = ogTicksPerBeat(project);
    var bar = Math.floor(t / measureTicks) + 1;
    var inBar = t % measureTicks;
    var beat = Math.floor(inBar / beatTicks) + 1;
    var tickInBeat = inBar % beatTicks;
    return { bar: bar, beat: beat, tick: tickInBeat, absoluteTick: t };
  }

  function ogQuantizeTick(tick, gridTicks) {
    var g = Math.max(1, ogInt(gridTicks, OG_DEFAULT_PPQ / 4));
    return Math.round(ogFinite(tick, 0) / g) * g;
  }

  function ogNoteNameToMidi(noteName) {
    if (typeof noteName === 'number' && isFinite(noteName)) return Math.round(noteName);
    var m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(noteName || '').trim());
    if (!m) return null;
    var name = m[1].toUpperCase() + (m[2] || '');
    var semitone = OG_NOTE_SEMITONES[name];
    if (semitone == null) return null;
    var octave = Number(m[3]);
    return (octave + 1) * 12 + semitone;
  }

  function ogMidiToNoteName(midi) {
    var n = ogClamp(midi, 0, 127, 60);
    var rounded = Math.round(n);
    var octave = Math.floor(rounded / 12) - 1;
    return OG_NOTE_NAMES[rounded % 12] + octave;
  }

  function ogBuildKeyboardLayout(projectOrOptions, maybeOptions) {
    var project = maybeOptions ? projectOrOptions : null;
    var options = maybeOptions || projectOrOptions || {};
    var baseOctave = Math.max(0, Math.min(7, ogInt(options.octave, 3)));
    var octaves = Math.max(1, Math.min(3, ogInt(options.octaves, 2)));
    var startMidi = ogNoteNameToMidi('C' + baseOctave);
    var computerKeys = ['Z', 'S', 'X', 'D', 'C', 'V', 'G', 'B', 'H', 'N', 'J', 'M', 'Q', '2', 'W', '3', 'E', 'R', '5', 'T', '6', 'Y', '7', 'U', 'I', '9', 'O', '0', 'P'];
    var blackPitchClasses = { 1: true, 3: true, 6: true, 8: true, 10: true };
    var key = project && project.key || {};
    var scale = project ? ogBuildScale(key.tonic || 'C', key.mode || 'minor').map(function (note) {
      return ogPitchClassFromName(note);
    }) : [];
    var keys = [];
    var whiteIndex = 0;
    for (var i = 0; i < octaves * 12; i++) {
      var midi = startMidi + i;
      if (midi < 0 || midi > 127) continue;
      var pitch = ogMidiToNoteName(midi);
      var pitchClass = midi % 12;
      var isBlack = !!blackPitchClasses[pitchClass];
      if (!isBlack) whiteIndex += 1;
      keys.push({
        index: keys.length,
        midi: midi,
        pitch: pitch,
        note: OG_NOTE_NAMES[pitchClass],
        octave: Math.floor(midi / 12) - 1,
        pitchClass: pitchClass,
        isBlack: isBlack,
        inKey: scale.length ? scale.indexOf(pitchClass) >= 0 : true,
        whiteIndex: isBlack ? null : whiteIndex - 1,
        computerKey: computerKeys[i] || null,
        label: pitch + (computerKeys[i] ? ' ' + computerKeys[i] : '')
      });
    }
    return {
      octave: baseOctave,
      octaves: octaves,
      keyName: (key.tonic || 'C') + ' ' + ogModeDisplayName(key.mode || 'minor'),
      keys: keys,
      keyCount: keys.length
    };
  }

  function ogBuildKeyboardChord(project, pitchLike, options) {
    options = options || {};
    var midi = typeof pitchLike === 'number' ? Math.round(pitchLike) : ogNoteNameToMidi(pitchLike);
    if (midi == null) throw new Error('OpenGroove: invalid keyboard pitch');
    midi = Math.max(0, Math.min(127, midi));
    var rootPitch = ogMidiToNoteName(midi);
    var octave = Math.floor(midi / 12) - 1;
    var key = project && project.key || {};
    var mode = key.mode || 'minor';
    var degree = ogScaleDegreeForPitch(project, midi);
    var rootName = degree && degree.note || rootPitch.replace(/-?\d+$/, '');
    var quality = OG_CHORD_INTERVALS[options.quality] ? options.quality : degree ? ogTriadQualityForDegree(mode, degree.degree - 1) : 'major';
    var chord = ogBuildChord(rootName, quality, octave);
    var notes = chord.midi.map(function (noteMidi, index) {
      while (noteMidi < midi && noteMidi + 12 <= 127) noteMidi += 12;
      var pitch = ogMidiToNoteName(noteMidi);
      return {
        index: index,
        midi: noteMidi,
        pitch: pitch,
        interval: noteMidi - midi
      };
    }).filter(function (note) {
      return note.midi >= 0 && note.midi <= 127;
    });
    return {
      root: rootName,
      rootPitch: rootPitch,
      rootMidi: midi,
      octave: octave,
      quality: quality,
      symbol: chord.symbol,
      roman: degree ? ogRomanForDegree(degree.degree - 1, quality) : null,
      nashville: degree ? degree.nashville : null,
      degree: degree,
      pitches: notes.map(function (note) { return note.pitch; }),
      midi: notes.map(function (note) { return note.midi; }),
      notes: notes,
      label: (degree ? ogRomanForDegree(degree.degree - 1, quality) + ' / ' : '') + chord.symbol
    };
  }

  function ogFrequencyFromMidi(midi) {
    return 440 * Math.pow(2, (ogClamp(midi, 0, 127, 69) - 69) / 12);
  }

  function ogFrequencyFromPitch(pitch) {
    var midi = ogNoteNameToMidi(pitch);
    return midi == null ? null : ogFrequencyFromMidi(midi);
  }

  function ogParsePitchSpelling(pitch) {
    var m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(pitch || '').trim());
    if (!m) return { step: 'C', alter: 0, octave: 4, spelling: 'C4' };
    return {
      step: m[1].toUpperCase(),
      alter: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0,
      octave: Number(m[3]),
      spelling: m[1].toUpperCase() + (m[2] || '') + m[3]
    };
  }

  function ogPitchClassFromName(name) {
    var m = /^([A-Ga-g])([#b]?)/.exec(String(name || '').trim());
    if (!m) return null;
    var pitchName = m[1].toUpperCase() + (m[2] || '');
    return OG_NOTE_SEMITONES[pitchName] == null ? null : OG_NOTE_SEMITONES[pitchName];
  }

  function ogNormalizeRootName(root) {
    var m = /^([A-Ga-g])([#b]?)/.exec(String(root || '').trim());
    return m ? m[1].toUpperCase() + (m[2] || '') : 'C';
  }

  function ogBuildScale(tonic, mode) {
    var root = ogPitchClassFromName(tonic);
    var intervals = OG_SCALE_INTERVALS[mode] || OG_SCALE_INTERVALS.minor;
    if (root == null) root = 0;
    return intervals.map(function (interval) {
      return OG_NOTE_NAMES[(root + interval) % 12];
    });
  }

  function ogBuildChord(root, quality, octave) {
    var safeRoot = ogNormalizeRootName(root);
    var safeQuality = OG_CHORD_INTERVALS[quality] ? quality : 'major';
    var safeOctave = ogInt(octave, 3);
    var rootMidi = ogNoteNameToMidi(safeRoot + safeOctave);
    if (rootMidi == null) rootMidi = ogNoteNameToMidi('C' + safeOctave);
    var pitches = OG_CHORD_INTERVALS[safeQuality].map(function (interval) {
      return ogMidiToNoteName(rootMidi + interval);
    });
    return {
      root: safeRoot,
      quality: safeQuality,
      symbol: safeRoot + (OG_CHORD_SUFFIX[safeQuality] || ''),
      octave: safeOctave,
      pitches: pitches,
      midi: pitches.map(ogNoteNameToMidi)
    };
  }

  function ogModeDisplayName(mode) {
    var key = ogSafeString(mode, 'minor');
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (ch) { return ch.toUpperCase(); });
  }

  function ogPreferFlatNames(tonic, mode) {
    var root = ogNormalizeRootName(tonic);
    var minorish = mode === 'minor' || mode === 'pentatonicMinor' || mode === 'dorian' || mode === 'phrygian' || mode === 'locrian';
    return root.indexOf('b') >= 0 || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].indexOf(root) >= 0 || minorish;
  }

  function ogPitchClassNameForKey(pitchClass, tonic, mode) {
    var names = ogPreferFlatNames(tonic, mode) ? OG_FLAT_NOTE_NAMES : OG_NOTE_NAMES;
    return names[((Math.round(pitchClass) % 12) + 12) % 12];
  }

  function ogTriadMode(mode) {
    if (mode === 'pentatonicMajor') return 'major';
    if (mode === 'pentatonicMinor') return 'minor';
    return OG_MODE_TRIADS[mode] ? mode : 'minor';
  }

  function ogTriadQualityForDegree(mode, degreeIndex) {
    var triads = OG_MODE_TRIADS[ogTriadMode(mode)] || OG_MODE_TRIADS.minor;
    return triads[degreeIndex % triads.length] || 'major';
  }

  function ogRomanForDegree(degreeIndex, quality) {
    var roman = OG_ROMAN_NUMERALS[degreeIndex] || String(degreeIndex + 1);
    var lower = quality === 'minor' || quality === 'diminished';
    var label = lower ? roman.toLowerCase() : roman;
    if (quality === 'diminished') return label + 'dim';
    if (quality === 'augmented') return label + 'aug';
    return label;
  }

  function ogScaleDegreeForPitch(project, pitchLike) {
    var key = project && project.key || {};
    var mode = key.mode || 'minor';
    var tonic = key.tonic || 'C';
    var rootPc = ogPitchClassFromName(tonic);
    var pc = typeof pitchLike === 'number' ? ((Math.round(pitchLike) % 12) + 12) % 12 : ogPitchClassFromName(pitchLike);
    var intervals = OG_SCALE_INTERVALS[mode] || OG_SCALE_INTERVALS.minor;
    if (rootPc == null || pc == null) return null;
    for (var i = 0; i < intervals.length; i++) {
      if ((rootPc + intervals[i]) % 12 === pc) {
        return {
          degree: i + 1,
          degreeName: OG_SCALE_DEGREE_NAMES[i] || 'degree ' + (i + 1),
          solfege: OG_SOLFEGE[i] || String(i + 1),
          note: ogPitchClassNameForKey(pc, tonic, mode),
          nashville: String(i + 1)
        };
      }
    }
    return {
      degree: null,
      degreeName: 'chromatic',
      solfege: 'chromatic',
      note: ogPitchClassNameForKey(pc, tonic, mode),
      nashville: 'chromatic'
    };
  }

  function ogDescribeChordInKey(project, chordLike) {
    chordLike = ogNormalizeChordLike(chordLike);
    var degree = ogScaleDegreeForPitch(project, chordLike.root);
    var degreeIndex = degree && degree.degree ? degree.degree - 1 : 0;
    var quality = chordLike.quality || ogTriadQualityForDegree(project && project.key && project.key.mode || 'minor', degreeIndex);
    var rootName = degree && degree.note || chordLike.root;
    return {
      root: chordLike.root,
      displayRoot: rootName,
      quality: quality,
      symbol: rootName + (OG_CHORD_SUFFIX[quality] || ''),
      roman: degree && degree.degree ? ogRomanForDegree(degreeIndex, quality) : '?',
      nashville: degree && degree.degree ? String(degree.degree) : '?',
      solfege: degree && degree.solfege || '?',
      degreeName: degree && degree.degreeName || 'unknown'
    };
  }

  function ogBuildCompositionNomenclature(project, patternId) {
    var key = project && project.key || {};
    var tonic = key.tonic || 'C';
    var mode = key.mode || 'minor';
    var rootPc = ogPitchClassFromName(tonic);
    var intervals = OG_SCALE_INTERVALS[mode] || OG_SCALE_INTERVALS.minor;
    if (rootPc == null) rootPc = 0;
    var scaleDegrees = intervals.map(function (interval, index) {
      var pc = (rootPc + interval) % 12;
      var quality = ogTriadQualityForDegree(mode, index);
      var note = ogPitchClassNameForKey(pc, tonic, mode);
      return {
        degree: index + 1,
        note: note,
        solfege: OG_SOLFEGE[index] || String(index + 1),
        roman: ogRomanForDegree(index, quality),
        nashville: String(index + 1),
        degreeName: OG_SCALE_DEGREE_NAMES[index] || 'degree ' + (index + 1),
        chordQuality: quality,
        chordSymbol: note + (OG_CHORD_SUFFIX[quality] || '')
      };
    });
    var preview = ogBuildNotationPreview(project, patternId);
    var measures = (preview.measures || []).map(function (measure) {
      return {
        bar: measure.bar,
        chords: (measure.chords || []).map(function (chord) {
          return Object.assign({}, chord, ogDescribeChordInKey(project, chord));
        }),
        notes: (measure.notes || []).map(function (note) {
          var degree = ogScaleDegreeForPitch(project, note.pitch);
          return Object.assign({}, note, {
            degree: degree && degree.degree,
            degreeName: degree && degree.degreeName,
            solfege: degree && degree.solfege,
            nashville: degree && degree.nashville,
            noteName: degree && degree.note
          });
        })
      };
    });
    return {
      keyName: ogPitchClassNameForKey(rootPc, tonic, mode) + ' ' + ogModeDisplayName(mode),
      tonic: ogPitchClassNameForKey(rootPc, tonic, mode),
      mode: mode,
      modeName: ogModeDisplayName(mode),
      scaleDegrees: scaleDegrees,
      measures: measures
    };
  }

  function ogNotationDurationTicks(project, token) {
    var beat = ogTicksPerBeat(project);
    var key = String(token == null ? 'q' : token).trim().toLowerCase();
    var named = {
      w: 4,
      whole: 4,
      h: 2,
      half: 2,
      q: 1,
      quarter: 1,
      e: 0.5,
      eighth: 0.5,
      s: 0.25,
      sixteenth: 0.25
    };
    if (Object.prototype.hasOwnProperty.call(named, key)) return Math.max(1, Math.round(beat * named[key]));
    var frac = /^1\/(\d+)$/.exec(key);
    if (frac) return Math.max(1, Math.round(beat * 4 / Math.max(1, Number(frac[1]))));
    var numeric = /^(\d+(?:\.\d+)?)b?$/.exec(key);
    if (numeric) return Math.max(1, Math.round(beat * Number(numeric[1])));
    return beat;
  }

  function ogNormalizeNotationPitch(pitch, octave) {
    var text = String(pitch || '').trim();
    var bare = /^([A-Ga-g])([#b]?)$/.exec(text);
    if (bare) return bare[1].toUpperCase() + (bare[2] || '') + ogInt(octave, 4);
    var full = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(text);
    return full ? full[1].toUpperCase() + (full[2] || '') + full[3] : text;
  }

  function ogParseNotationInput(text, project, options) {
    options = options || {};
    var measureTicks = ogTicksPerMeasure(project);
    var patternLength = options.pattern ? ogPatternLengthTicks(project, options.pattern) : Infinity;
    var cursor = Math.max(0, ogInt(options.startBar, 0)) * measureTicks;
    var defaultDuration = options.defaultDuration || 'q';
    var octave = ogInt(options.octave, 4);
    var velocity = ogNormalizeVelocity(options.velocity == null ? 0.76 : options.velocity);
    var tokens = String(text || '').replace(/\|/g, ' | ').replace(/[,\n\r\t]+/g, ' ').split(/\s+/).filter(Boolean);
    var events = [];
    var warnings = [];
    tokens.forEach(function (token) {
      if (token === '|') {
        cursor = cursor > 0 && cursor % measureTicks === 0
          ? cursor
          : (Math.floor(cursor / measureTicks) + 1) * measureTicks;
        return;
      }
      var match = /^(.+?)(?:([:=\/])([A-Za-z0-9.\/]+))?$/.exec(token);
      var pitchPart = match && match[1] || token;
      var durationToken = match && match[3] || defaultDuration;
      if (match && match[2] === '/' && durationToken.indexOf('/') < 0) durationToken = '1/' + durationToken;
      var durationTicks = ogNotationDurationTicks(project, durationToken);
      if (/^(r|rest)$/i.test(pitchPart)) {
        cursor += durationTicks;
        return;
      }
      var chordPitches = pitchPart.replace(/^\[/, '').replace(/\]$/, '').split('+').filter(Boolean);
      chordPitches.forEach(function (pitchText) {
        var pitch = ogNormalizeNotationPitch(pitchText, octave);
        var midi = ogNoteNameToMidi(pitch);
        if (midi == null) {
          warnings.push('Skipped ' + pitchText);
          return;
        }
        if (cursor < patternLength) {
          events.push({
            type: 'note',
            pitch: pitch,
            spelling: pitch,
            midi: midi,
            startTick: cursor,
            durationTicks: Math.max(1, Math.min(durationTicks, patternLength - cursor)),
            notationStartTick: cursor,
            notationDurationTicks: Math.max(1, Math.min(durationTicks, patternLength - cursor)),
            velocity: velocity,
            role: 'notation',
            source: 'notationInput'
          });
        }
      });
      cursor += durationTicks;
    });
    return {
      events: events,
      warnings: warnings,
      startTick: Math.max(0, ogInt(options.startBar, 0)) * measureTicks,
      endTick: cursor,
      noteCount: events.length
    };
  }

  function ogWriteNotationInput(project, patternId, trackId, text, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'synth') throw new Error('OpenGroove: synth track not found');
    var parsed = ogParseNotationInput(text, project, Object.assign({}, options, { pattern: pattern }));
    var replaceEnd = Math.min(ogPatternLengthTicks(project, pattern), Math.max(parsed.endTick, parsed.startTick + ogTicksPerMeasure(project)));
    if (options.replace !== false) {
      pattern.events = (pattern.events || []).filter(function (event) {
        return !(event.type === 'note' && event.trackId === trackId && event.startTick >= parsed.startTick && event.startTick < replaceEnd);
      });
    }
    var created = parsed.events.map(function (event) {
      return ogAppendEvent(project, pattern.id, Object.assign({}, event, { trackId: trackId }));
    });
    return {
      events: created,
      noteCount: created.length,
      warnings: parsed.warnings,
      startTick: parsed.startTick,
      endTick: parsed.endTick
    };
  }

  function ogDiatonicIndexFromPitch(pitch) {
    var parsed = ogParsePitchSpelling(pitch);
    var steps = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
    return parsed.octave * 7 + (steps[parsed.step] == null ? 0 : steps[parsed.step]);
  }

  function ogDurationNameFromTicks(project, ticks) {
    var beat = ogTicksPerBeat(project);
    var ratio = Math.max(0.001, ogFinite(ticks, beat) / beat);
    if (ratio >= 3.75) return 'whole';
    if (ratio >= 1.75) return 'half';
    if (ratio >= 0.75) return 'quarter';
    if (ratio >= 0.375) return 'eighth';
    return 'sixteenth';
  }

  function ogStaffLedgerLines(y, geometry) {
    var lines = [];
    var top = geometry.staffTop;
    var bottom = geometry.staffTop + 4 * geometry.lineSpacing;
    var spacing = geometry.lineSpacing;
    var epsilon = 0.5;
    if (y < top - epsilon) {
      for (var high = top - spacing; high >= y - epsilon; high -= spacing) lines.push(Math.round(high * 100) / 100);
    }
    if (y > bottom + epsilon) {
      for (var low = bottom + spacing; low <= y + epsilon; low += spacing) lines.push(Math.round(low * 100) / 100);
    }
    return lines;
  }

  function ogBuildStaffEngraving(project, patternId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    if (!pattern) return { width: 680, height: 160, measures: [] };
    var preview = ogBuildCompositionNomenclature(project, pattern.id);
    var measureTicks = ogTicksPerMeasure(project);
    var beatTicks = ogTicksPerBeat(project);
    var ts = Array.isArray(project.timeSignature) ? project.timeSignature : [4, 4];
    var beatsPerMeasure = Math.max(1, ogInt(ts[0], 4));
    var width = Math.max(360, ogFinite(options.width, 680));
    var height = Math.max(130, ogFinite(options.height, 158));
    var left = 48;
    var right = 16;
    var staffTop = 42;
    var lineSpacing = 10;
    var bottomY = staffTop + 4 * lineSpacing;
    var stepY = lineSpacing / 2;
    var bars = Math.max(1, ogInt(pattern.bars, 1));
    var measureWidth = (width - left - right) / bars;
    var bottomLineIndex = 4 * 7 + 2; // E4 on treble staff.
    var slotsPerMeasure = Math.max(4, ogInt(options.slotsPerMeasure, 8));
    var geometry = {
      width: width,
      height: height,
      left: left,
      right: right,
      staffTop: staffTop,
      lineSpacing: lineSpacing,
      bottomY: bottomY,
      stepY: stepY,
      measureWidth: measureWidth,
      noteHeadWidth: 10,
      noteHeadHeight: 7
    };

    function xForTick(barIndex, tickInMeasure) {
      var inner = Math.max(20, measureWidth - 32);
      return left + barIndex * measureWidth + 18 + (Math.max(0, tickInMeasure) / measureTicks) * inner;
    }

    var measures = [];
    for (var bar = 0; bar < bars; bar++) {
      var x = left + bar * measureWidth;
      var namedMeasure = preview.measures[bar] || { bar: bar + 1, notes: [], chords: [] };
      var slots = [];
      for (var slot = 0; slot < slotsPerMeasure; slot++) {
        var slotTick = Math.round(slot * measureTicks / slotsPerMeasure);
        slots.push({
          index: slot,
          x: xForTick(bar, slotTick),
          startBeat: Math.round((slotTick / beatTicks + 1) * 1000) / 1000,
          tick: bar * measureTicks + slotTick
        });
      }
      measures.push({
        bar: bar + 1,
        x: x,
        width: measureWidth,
        selected: bar === ogInt(options.selectedBar, -1),
        slots: slots,
        chords: (namedMeasure.chords || []).map(function (chord) {
          var tickInMeasure = Math.round((Math.max(1, chord.startBeat || 1) - 1) * beatTicks);
          return Object.assign({}, chord, { x: xForTick(bar, tickInMeasure), y: staffTop - 18 });
        }),
        notes: (namedMeasure.notes || []).filter(function (note) {
          return !options.trackId || note.trackId === options.trackId;
        }).map(function (note) {
          var parsed = ogParsePitchSpelling(note.pitch);
          var y = bottomY - (ogDiatonicIndexFromPitch(note.pitch) - bottomLineIndex) * stepY;
          var duration = ogDurationNameFromTicks(project, Math.round((note.durationBeats || 1) * beatTicks));
          var tickInMeasure = Math.round((Math.max(1, note.startBeat || 1) - 1) * beatTicks);
          return Object.assign({}, note, {
            x: xForTick(bar, tickInMeasure),
            y: Math.round(y * 100) / 100,
            accidental: parsed.alter === 1 ? '#' : parsed.alter === -1 ? 'b' : '',
            durationName: duration,
            openHead: duration === 'whole' || duration === 'half',
            stem: duration !== 'whole',
            stemUp: y >= staffTop + 2 * lineSpacing,
            ledgerLines: ogStaffLedgerLines(y, geometry)
          });
        })
      });
    }

    return {
      width: width,
      height: height,
      clef: 'treble',
      keyName: preview.keyName,
      timeSignature: [beatsPerMeasure, Math.max(1, ogInt(ts[1], 4))],
      slotsPerMeasure: slotsPerMeasure,
      geometry: geometry,
      measures: measures
    };
  }

  function ogSetStaffNote(project, patternId, trackId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'synth') throw new Error('OpenGroove: synth track not found');
    var measureTicks = ogTicksPerMeasure(project);
    var beatTicks = ogTicksPerBeat(project);
    var bar = Math.max(0, Math.min(Math.max(1, pattern.bars) - 1, ogInt(options.startBar, 0)));
    var startBeat = Math.max(1, ogFinite(options.startBeat, 1));
    var startTick = Math.max(0, Math.min(ogPatternLengthTicks(project, pattern) - 1, bar * measureTicks + Math.round((startBeat - 1) * beatTicks)));
    var durationTicks = options.durationTicks != null ? Math.max(1, ogInt(options.durationTicks, beatTicks)) : ogNotationDurationTicks(project, options.duration || 'q');
    var removed = 0;
    if (options.replaceSlot !== false) {
      var before = pattern.events.length;
      pattern.events = (pattern.events || []).filter(function (event) {
        return !(event.type === 'note' && event.trackId === trackId && event.startTick === startTick);
      });
      removed = before - pattern.events.length;
    }
    if (options.rest || options.tool === 'rest') {
      return { event: null, removed: removed, rest: true, startTick: startTick };
    }
    var pitch = ogNormalizeNotationPitch(options.pitch || 'C4', options.octave || 4);
    var event = ogAppendEvent(project, pattern.id, {
      type: 'note',
      trackId: trackId,
      pitch: pitch,
      spelling: pitch,
      startTick: startTick,
      durationTicks: Math.min(durationTicks, ogPatternLengthTicks(project, pattern) - startTick),
      notationStartTick: startTick,
      notationDurationTicks: Math.min(durationTicks, ogPatternLengthTicks(project, pattern) - startTick),
      velocity: options.velocity == null ? 0.78 : options.velocity,
      role: 'notation',
      source: 'staffEditor'
    });
    return { event: event, removed: removed, rest: false, startTick: startTick };
  }

  function ogNormalizeVelocity(value) {
    return ogClamp(value, 0, 1, 0.8);
  }

  function ogNormalizeSynthInstrument(instrumentLike) {
    instrumentLike = instrumentLike || {};
    var filter = instrumentLike.filter || {};
    var envelope = instrumentLike.envelope || {};
    var transient = instrumentLike.transient || {};
    var presetId = String(instrumentLike.presetId == null ? '' : instrumentLike.presetId).trim();
    var osc = instrumentLike.oscillator === 'sine' || instrumentLike.oscillator === 'triangle' || instrumentLike.oscillator === 'square' || instrumentLike.oscillator === 'sawtooth'
      ? instrumentLike.oscillator
      : 'sawtooth';
    var filterType = filter.type === 'highpass' || filter.type === 'bandpass' || filter.type === 'notch' ? filter.type : 'lowpass';
    var partials = Array.isArray(instrumentLike.partials) ? instrumentLike.partials.map(function (partial) {
      partial = partial || {};
      var partialType = partial.type === 'sine' || partial.type === 'triangle' || partial.type === 'square' || partial.type === 'sawtooth' ? partial.type : osc;
      return {
        ratio: ogClamp(partial.ratio, 0.125, 8, 1),
        type: partialType,
        gain: ogClamp(partial.gain, 0, 1, 1),
        detune: ogClamp(partial.detune, -1200, 1200, 0)
      };
    }).filter(function (partial) {
      return partial.gain > 0;
    }).slice(0, 8) : [];
    var unisonInput = instrumentLike.unison || {};
    var unisonVoices = Math.max(1, Math.min(7, ogInt(unisonInput.voices, 1)));
    var unison = {
      voices: unisonVoices,
      detune: ogClamp(unisonInput.detune, 0, 80, unisonVoices > 1 ? 12 : 0),
      spread: ogClamp(unisonInput.spread, 0, 1, unisonVoices > 1 ? 0.5 : 0)
    };
    var hasTransient = transient.gain != null || transient.duration != null || transient.cutoff != null;
    return {
      engine: (unison.voices > 1 ? 'unison-' : '') + (partials.length ? 'layered-subtractive' : 'subtractive'),
      name: ogSafeString(instrumentLike.name, presetId ? 'Preset Patch' : 'Custom Patch'),
      presetId: presetId || null,
      oscillator: osc,
      partials: partials,
      unison: unison,
      transient: hasTransient ? {
        gain: ogClamp(transient.gain, 0, 1, 0.08),
        duration: ogClamp(transient.duration, 0.001, 0.2, 0.015),
        cutoff: ogClamp(transient.cutoff, 200, 12000, 4500)
      } : null,
      filter: {
        type: filterType,
        cutoff: ogClamp(filter.cutoff, 80, 18000, 6000),
        q: ogClamp(filter.q, 0.1, 20, 0.7)
      },
      envelope: {
        attack: ogClamp(envelope.attack, 0.001, 2, 0.01),
        decay: ogClamp(envelope.decay, 0.001, 2, 0.12),
        sustain: ogClamp(envelope.sustain, 0, 1, 0.65),
        release: ogClamp(envelope.release, 0.001, 5, 0.25)
      }
    };
  }

  function ogListSynthPatchPresets() {
    return OG_SYNTH_PATCH_PRESETS.map(function (preset) {
      var copy = ogClone(preset);
      copy.instrument = ogNormalizeSynthInstrument(copy.instrument);
      return copy;
    });
  }

  function ogListSynthPatchFamilies() {
    var groups = {};
    ogListSynthPatchPresets().forEach(function (preset) {
      var family = ogSafeString(preset.family, 'Synth');
      if (!groups[family]) groups[family] = { family: family, presets: [] };
      groups[family].presets.push(preset);
    });
    return Object.keys(groups).map(function (family) {
      return groups[family];
    });
  }

  function ogBuildInstrumentProfile(presetId) {
    var preset = ogGetSynthPatchPreset(presetId);
    if (!preset) return null;
    var family = ogSafeString(preset.family, 'Synth');
    var guide = OG_INSTRUMENT_FAMILY_GUIDES[family] || OG_INSTRUMENT_FAMILY_GUIDES.Synth;
    var range = OG_INSTRUMENT_RANGES[preset.id] || { low: 'C3', high: 'C5', register: 'classroom range' };
    var rangeLabel = range.low + '-' + range.high;
    return {
      presetId: preset.id,
      name: preset.name,
      family: family,
      role: ogSafeString(preset.role, 'instrument'),
      sourceType: ogSafeString(preset.sourceType, 'synth'),
      sourceLabel: guide.sourceLabel,
      lowNote: range.low,
      highNote: range.high,
      rangeLabel: rangeLabel,
      register: range.register,
      classroomUse: guide.classroomUse,
      samplePlan: {
        captureHint: guide.captureHint,
        articulations: ogClone(guide.articulations || []),
        recommendedNotes: ogClone(guide.sampleNotes || []),
        storageHint: 'User recordings and open-license packs can be layered later without changing the composition.'
      },
      label: preset.name + ' / ' + family + ' / ' + rangeLabel
    };
  }

  function ogListInstrumentProfiles() {
    return ogListSynthPatchPresets().map(function (preset) {
      return ogBuildInstrumentProfile(preset.id);
    }).filter(Boolean);
  }

  function ogGetSynthPatchPreset(presetId) {
    var id = String(presetId || '').trim();
    for (var i = 0; i < OG_SYNTH_PATCH_PRESETS.length; i++) {
      if (OG_SYNTH_PATCH_PRESETS[i].id === id) {
        var copy = ogClone(OG_SYNTH_PATCH_PRESETS[i]);
        copy.instrument = ogNormalizeSynthInstrument(copy.instrument);
        return copy;
      }
    }
    return null;
  }

  function ogSetSynthInstrument(project, trackId, updates) {
    updates = updates || {};
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'synth') throw new Error('OpenGroove: synth track not found');
    var next = ogNormalizeSynthInstrument(track.instrument);
    if (updates.oscillator != null) next.oscillator = updates.oscillator;
    if (updates.filter) {
      next.filter = Object.assign({}, next.filter, updates.filter);
    }
    if (updates.envelope) {
      next.envelope = Object.assign({}, next.envelope, updates.envelope);
    }
    if (updates.partials) next.partials = updates.partials;
    if (Object.prototype.hasOwnProperty.call(updates, 'unison')) next.unison = updates.unison;
    if (Object.prototype.hasOwnProperty.call(updates, 'transient')) next.transient = updates.transient;
    track.instrument = ogNormalizeSynthInstrument(next);
    return track.instrument;
  }

  function ogApplySynthPatchPreset(project, trackId, presetId) {
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'synth') throw new Error('OpenGroove: synth track not found');
    var preset = ogGetSynthPatchPreset(presetId);
    if (!preset) throw new Error('OpenGroove: synth patch preset not found');
    track.instrument = ogNormalizeSynthInstrument(preset.instrument);
    return track.instrument;
  }

  function ogRandomizeSynthInstrument(project, trackId, options) {
    options = options || {};
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'synth') throw new Error('OpenGroove: synth track not found');
    var seed = ogSafeString(options.seed, (project && project.title || 'Open Groove') + ':' + trackId + ':' + ogInt(project && project.updatedAt, 0));
    var oscillators = ['sawtooth', 'square', 'triangle', 'sine'];
    var filters = ['lowpass', 'lowpass', 'bandpass', 'highpass'];
    function pick(list, salt) {
      return list[Math.min(list.length - 1, Math.floor(ogSeededUnit(seed + ':' + salt) * list.length))];
    }
    function round(value, places) {
      var scale = Math.pow(10, places || 0);
      return Math.round(value * scale) / scale;
    }
    var cutoffUnit = ogSeededUnit(seed + ':cutoff');
    var patch = {
      name: ogSafeString(options.name, 'Generated Patch'),
      presetId: 'generated',
      oscillator: pick(oscillators, 'osc'),
      filter: {
        type: pick(filters, 'filter'),
        cutoff: Math.round(180 + Math.pow(cutoffUnit, 1.45) * 13820),
        q: round(0.4 + ogSeededUnit(seed + ':q') * 6.8, 1)
      },
      envelope: {
        attack: round(0.002 + Math.pow(ogSeededUnit(seed + ':attack'), 1.8) * 0.55, 3),
        decay: round(0.05 + ogSeededUnit(seed + ':decay') * 0.7, 3),
        sustain: round(0.18 + ogSeededUnit(seed + ':sustain') * 0.68, 2),
        release: round(0.05 + Math.pow(ogSeededUnit(seed + ':release'), 1.3) * 1.55, 3)
      },
      unison: {
        voices: ogSeededUnit(seed + ':unison') > 0.58 ? 3 : 1,
        detune: round(4 + ogSeededUnit(seed + ':detune') * 14, 1),
        spread: round(0.25 + ogSeededUnit(seed + ':spread') * 0.55, 2)
      }
    };
    track.instrument = ogNormalizeSynthInstrument(patch);
    return track.instrument;
  }

  function ogBuildSynthPatchSummary(project, trackId) {
    var track = ogFindTrack(project, trackId);
    var patch = ogNormalizeSynthInstrument(track && track.instrument);
    return {
      trackId: track && track.id || trackId || null,
      name: track && track.name || 'Synth',
      patchName: patch.name,
      presetId: patch.presetId,
      engine: patch.engine,
      oscillator: patch.oscillator,
      unisonVoices: patch.unison.voices,
      unisonDetune: patch.unison.detune,
      filterType: patch.filter.type,
      cutoff: patch.filter.cutoff,
      q: patch.filter.q,
      attack: patch.envelope.attack,
      decay: patch.envelope.decay,
      sustain: patch.envelope.sustain,
      release: patch.envelope.release,
      label: patch.name + ' / ' + Math.round(patch.filter.cutoff) + ' Hz'
    };
  }

  function ogFindEffectPreset(effectType) {
    var type = ogSafeString(effectType, 'filter');
    for (var i = 0; i < OG_EFFECT_PRESETS.length; i++) {
      if (OG_EFFECT_PRESETS[i].id === type) return OG_EFFECT_PRESETS[i];
    }
    return null;
  }

  function ogEffectOrderIndex(effectType) {
    var index = OG_EFFECT_ORDER.indexOf(effectType);
    return index < 0 ? OG_EFFECT_ORDER.length : index;
  }

  function ogListEffectPresets() {
    return ogClone(OG_EFFECT_PRESETS);
  }

  function ogFindAutomationTarget(target) {
    var id = ogSafeString(target, 'effect.filter.cutoff');
    for (var i = 0; i < OG_AUTOMATION_TARGETS.length; i++) {
      if (OG_AUTOMATION_TARGETS[i].id === id) return OG_AUTOMATION_TARGETS[i];
    }
    return OG_AUTOMATION_TARGETS[0];
  }

  function ogListAutomationTargets() {
    return ogClone(OG_AUTOMATION_TARGETS);
  }

  function ogAutomationTargetForEffectParam(effectType, param) {
    for (var i = 0; i < OG_AUTOMATION_TARGETS.length; i++) {
      var target = OG_AUTOMATION_TARGETS[i];
      if (target.effect === effectType && target.param === param) return target;
    }
    return null;
  }

  function ogNormalizeAutomationValue(target, value) {
    var spec = typeof target === 'string' ? ogFindAutomationTarget(target) : target || OG_AUTOMATION_TARGETS[0];
    return ogClamp(value, spec.min, spec.max, spec.defaultValue);
  }

  function ogNormalizeEffectParam(effectType, param, value, fallback) {
    if (effectType === 'filter' && param === 'type') {
      return ['lowpass', 'highpass', 'bandpass', 'notch'].indexOf(value) >= 0 ? value : (fallback || 'lowpass');
    }
    var spec = ogAutomationTargetForEffectParam(effectType, param);
    if (spec) return ogNormalizeAutomationValue(spec, value == null ? fallback : value);
    return ogFinite(value, fallback);
  }

  function ogNormalizeEffect(effectLike, index) {
    effectLike = effectLike || {};
    var type = ogSafeString(effectLike.type || effectLike.id, 'filter');
    var preset = ogFindEffectPreset(type);
    if (!preset) {
      type = 'filter';
      preset = ogFindEffectPreset(type);
    }
    var defaults = ogClone(preset.defaultParams || {});
    var sourceParams = effectLike.params || {};
    var params = {};
    Object.keys(defaults).forEach(function (param) {
      var raw = sourceParams[param] != null ? sourceParams[param] : effectLike[param];
      params[param] = ogNormalizeEffectParam(type, param, raw, defaults[param]);
    });
    return {
      id: ogSafeString(effectLike.id, 'fx_' + type),
      type: type,
      name: ogSafeString(effectLike.name, preset.name),
      enabled: effectLike.enabled === false ? false : true,
      order: ogInt(effectLike.order, index == null ? ogEffectOrderIndex(type) : index),
      params: params
    };
  }

  function ogSortEffects(effects) {
    return effects.sort(function (a, b) {
      return (ogEffectOrderIndex(a.type) - ogEffectOrderIndex(b.type)) || String(a.id).localeCompare(String(b.id));
    });
  }

  function ogNormalizeEffectList(effects, options) {
    options = options || {};
    var normalized = (Array.isArray(effects) ? effects : []).map(function (effect, index) {
      return ogNormalizeEffect(effect, index);
    });
    ogSortEffects(normalized);
    if (!options.includeDisabled) normalized = normalized.filter(function (effect) { return effect.enabled; });
    return normalized;
  }

  function ogGetTrackEffects(project, trackId, options) {
    var track = ogFindTrack(project, trackId);
    return ogNormalizeEffectList(track && track.effects, options).map(function (effect) { return ogClone(effect); });
  }

  function ogBuildEffectRack(project, trackId) {
    var stored = ogGetTrackEffects(project, trackId, { includeDisabled: true });
    return OG_EFFECT_PRESETS.map(function (preset, index) {
      var existing = stored.filter(function (effect) { return effect.type === preset.id; })[0];
      var effect = existing || ogNormalizeEffect({ type: preset.id, enabled: false }, index);
      effect.label = preset.name;
      return effect;
    });
  }

  function ogSetTrackEffect(project, trackId, effectType, updates) {
    updates = updates || {};
    var track = ogFindTrack(project, trackId);
    if (!track) throw new Error('OpenGroove: track not found');
    var type = ogFindEffectPreset(effectType) ? effectType : 'filter';
    var stored = ogNormalizeEffectList(track.effects, { includeDisabled: true });
    var current = stored.filter(function (effect) { return effect.type === type; })[0] || ogNormalizeEffect({ type: type, enabled: false });
    var params = Object.assign({}, current.params);
    var paramUpdates = Object.assign({}, updates.params || {});
    Object.keys(updates).forEach(function (key) {
      if (key !== 'id' && key !== 'type' && key !== 'name' && key !== 'enabled' && key !== 'params') paramUpdates[key] = updates[key];
    });
    Object.keys(paramUpdates).forEach(function (param) {
      if (params[param] == null && !Object.prototype.hasOwnProperty.call(ogFindEffectPreset(type).defaultParams || {}, param)) return;
      params[param] = ogNormalizeEffectParam(type, param, paramUpdates[param], params[param]);
    });
    var nextEffect = ogNormalizeEffect({
      id: current.id || 'fx_' + type,
      type: type,
      name: updates.name || current.name,
      enabled: updates.enabled == null ? true : updates.enabled,
      params: params
    });
    var replaced = false;
    stored = stored.map(function (effect) {
      if (effect.type !== type) return effect;
      replaced = true;
      return nextEffect;
    });
    if (!replaced) stored.push(nextEffect);
    track.effects = ogSortEffects(stored);
    return ogClone(nextEffect);
  }

  function ogAutomationPointsFor(project, patternId, trackId, target, toTick) {
    var pattern = ogFindPattern(project, patternId);
    var points = (pattern && pattern.events || []).filter(function (event) {
      if (!event || event.type !== 'automationPoint') return false;
      if (trackId && event.trackId !== trackId) return false;
      if (target && event.target !== target) return false;
      if (toTick != null && ogInt(event.startTick, 0) > toTick) return false;
      return true;
    }).map(function (event) { return ogClone(event); });
    points.sort(function (a, b) {
      return (ogInt(a.startTick, 0) - ogInt(b.startTick, 0)) || String(a.id).localeCompare(String(b.id));
    });
    return points;
  }

  function ogBuildAutomationLane(project, patternId, trackId, target) {
    var spec = ogFindAutomationTarget(target);
    var points = ogAutomationPointsFor(project, patternId, trackId, spec.id);
    return {
      patternId: patternId,
      trackId: trackId || null,
      target: spec.id,
      label: spec.label,
      unit: spec.unit,
      min: spec.min,
      max: spec.max,
      defaultValue: spec.defaultValue,
      points: points
    };
  }

  function ogBuildAutomationSnapshot(project, patternId, trackId) {
    var lanes = OG_AUTOMATION_TARGETS.map(function (spec) {
      return ogBuildAutomationLane(project, patternId, trackId, spec.id);
    });
    return {
      patternId: patternId,
      trackId: trackId || null,
      pointCount: lanes.reduce(function (sum, lane) { return sum + lane.points.length; }, 0),
      lanes: lanes
    };
  }

  function ogResolveAutomationValueAtTick(project, patternId, trackId, target, tick, fallback) {
    var spec = ogFindAutomationTarget(target);
    var points = ogAutomationPointsFor(project, patternId, trackId, spec.id);
    if (!points.length) return fallback == null ? null : ogNormalizeAutomationValue(spec, fallback);
    var atTick = Math.max(0, ogInt(tick, 0));
    var previous = null;
    var next = null;
    for (var i = 0; i < points.length; i++) {
      var pointTick = ogInt(points[i].startTick, 0);
      if (pointTick <= atTick) previous = points[i];
      else {
        next = points[i];
        break;
      }
    }
    if (!previous) return fallback == null ? null : ogNormalizeAutomationValue(spec, fallback);
    var previousValue = ogNormalizeAutomationValue(spec, previous.value);
    if (!next || previous.curve === 'hold') return previousValue;
    var startTick = ogInt(previous.startTick, 0);
    var endTick = ogInt(next.startTick, startTick);
    if (endTick <= startTick) return previousValue;
    var nextValue = ogNormalizeAutomationValue(spec, next.value);
    var t = Math.max(0, Math.min(1, (atTick - startTick) / (endTick - startTick)));
    return ogNormalizeAutomationValue(spec, previousValue + (nextValue - previousValue) * t);
  }

  function ogSetAutomationPoint(project, patternId, trackId, target, stepIndex, stepsPerBar, value, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    if (!ogFindTrack(project, trackId)) throw new Error('OpenGroove: track not found');
    var spec = ogFindAutomationTarget(target);
    var perBar = Math.max(1, ogInt(stepsPerBar, 16));
    var totalSteps = Math.max(1, pattern.bars * perBar);
    var step = Math.max(0, Math.min(totalSteps - 1, ogInt(stepIndex, 0)));
    var stepTicks = Math.round(ogTicksPerMeasure(project) / perBar);
    var startTick = step * stepTicks;
    var existing = null;
    for (var i = 0; i < pattern.events.length; i++) {
      var event = pattern.events[i];
      if (event.type === 'automationPoint' && event.trackId === trackId && event.target === spec.id && event.startTick === startTick) {
        existing = event;
        break;
      }
    }
    if (options.clear || value == null) {
      if (existing) ogRemoveEvent(project, patternId, existing.id);
      return null;
    }
    var nextValue = ogNormalizeAutomationValue(spec, value);
    if (spec.effect) {
      ogSetTrackEffect(project, trackId, spec.effect, { enabled: true });
    }
    if (existing) {
      existing.value = nextValue;
      existing.curve = options.curve === 'hold' ? 'hold' : 'linear';
      existing.source = ogSafeString(options.source, existing.source || 'automationLane');
      return existing;
    }
    return ogAppendEvent(project, patternId, {
      type: 'automationPoint',
      trackId: trackId,
      startTick: startTick,
      target: spec.id,
      value: nextValue,
      curve: options.curve || 'linear',
      source: options.source || 'automationLane'
    });
  }

  function ogApplyAutomationPointToEffects(effectMap, point) {
    var spec = ogFindAutomationTarget(point && point.target);
    if (!spec || !spec.effect) return;
    var effect = effectMap[spec.effect] || ogNormalizeEffect({ type: spec.effect, enabled: true });
    effect.enabled = true;
    effect.params[spec.param] = ogNormalizeEffectParam(spec.effect, spec.param, point.value, effect.params[spec.param]);
    effectMap[spec.effect] = effect;
  }

  function ogResolveTrackEffectsAtTick(project, patternId, trackId, tick) {
    var effects = ogGetTrackEffects(project, trackId);
    var effectMap = {};
    effects.forEach(function (effect) {
      if (effect.enabled) effectMap[effect.type] = effect;
    });
    OG_AUTOMATION_TARGETS.forEach(function (spec) {
      if (!spec.effect) return;
      var baseEffect = effectMap[spec.effect] || null;
      var fallback = baseEffect && baseEffect.params ? baseEffect.params[spec.param] : null;
      var value = ogResolveAutomationValueAtTick(project, patternId, trackId, spec.id, tick, fallback);
      if (value == null) return;
      var effect = baseEffect || ogNormalizeEffect({ type: spec.effect, enabled: true });
      effect.enabled = true;
      effect.params[spec.param] = ogNormalizeEffectParam(spec.effect, spec.param, value, effect.params[spec.param]);
      effectMap[spec.effect] = effect;
    });
    return OG_EFFECT_ORDER.map(function (type) { return effectMap[type]; }).filter(function (effect) {
      return effect && effect.enabled;
    }).map(function (effect) { return ogClone(effect); });
  }

  function ogResolveMixerChannelAtTick(project, patternId, trackId, tick) {
    var channel = ogGetMixerChannel(project, trackId);
    var gain = ogResolveAutomationValueAtTick(project, patternId, trackId, 'mixer.gain', tick, channel.gain);
    if (gain != null) channel.gain = gain;
    return channel;
  }

  function ogNormalizeMixerGain(value, fallback) {
    return ogClamp(value, 0, 1.5, fallback == null ? 1 : fallback);
  }

  function ogGetMixerChannel(project, channelId) {
    var mixer = project && project.mixer || {};
    if (channelId === 'master') {
      var master = mixer.master || {};
      return {
        id: 'master',
        gain: ogNormalizeMixerGain(master.gain, 0.9),
        pan: 0,
        mute: false,
        solo: false,
        limiter: master.limiter !== false
      };
    }
    var track = ogFindTrack(project, channelId);
    var stored = mixer[channelId] || {};
    return {
      id: channelId,
      gain: ogNormalizeMixerGain(stored.gain != null ? stored.gain : track && track.gain, 1),
      pan: ogClamp(stored.pan != null ? stored.pan : track && track.pan, -1, 1, 0),
      mute: !!(stored.mute != null ? stored.mute : track && track.mute),
      solo: !!(stored.solo != null ? stored.solo : track && track.solo)
    };
  }

  function ogSetMixerChannel(project, channelId, updates) {
    updates = updates || {};
    if (!project || !project.mixer) throw new Error('OpenGroove: mixer is not ready');
    var channel = ogGetMixerChannel(project, channelId);
    if (updates.gain != null) channel.gain = ogNormalizeMixerGain(updates.gain, channel.gain);
    if (updates.pan != null && channelId !== 'master') channel.pan = ogClamp(updates.pan, -1, 1, channel.pan);
    if (updates.mute != null && channelId !== 'master') channel.mute = !!updates.mute;
    if (updates.solo != null && channelId !== 'master') channel.solo = !!updates.solo;
    if (updates.limiter != null && channelId === 'master') channel.limiter = !!updates.limiter;
    project.mixer[channelId] = channelId === 'master'
      ? { gain: channel.gain, limiter: channel.limiter }
      : { gain: channel.gain, pan: channel.pan, mute: channel.mute, solo: channel.solo };
    var track = channelId === 'master' ? null : ogFindTrack(project, channelId);
    if (track) {
      track.gain = channel.gain;
      track.pan = channel.pan;
      track.mute = channel.mute;
      track.solo = channel.solo;
    }
    return project.mixer[channelId];
  }

  function ogAnyMixerSolo(project) {
    var tracks = project && Array.isArray(project.tracks) ? project.tracks : [];
    return tracks.some(function (track) {
      return ogGetMixerChannel(project, track.id).solo;
    });
  }

  function ogTrackIsAudible(project, trackId) {
    var channel = ogGetMixerChannel(project, trackId);
    if (channel.mute) return false;
    return !ogAnyMixerSolo(project) || channel.solo;
  }

  function ogBuildMixerSnapshot(project) {
    var tracks = project && Array.isArray(project.tracks) ? project.tracks : [];
    return {
      master: ogGetMixerChannel(project, 'master'),
      soloActive: ogAnyMixerSolo(project),
      channels: tracks.map(function (track) {
        var channel = ogGetMixerChannel(project, track.id);
        channel.trackId = track.id;
        channel.name = track.name;
        channel.type = track.type;
        channel.audible = ogTrackIsAudible(project, track.id);
        channel.effects = ogBuildEffectRack(project, track.id);
        channel.effectCount = channel.effects.filter(function (effect) { return effect.enabled; }).length;
        return channel;
      })
    };
  }

  function ogSanitizeEvent(project, pattern, eventLike) {
    eventLike = eventLike || {};
    var length = Math.max(1, ogPatternLengthTicks(project, pattern));
    var type = eventLike.type === 'note' || eventLike.type === 'drumHit' || eventLike.type === 'audioRegion' || eventLike.type === 'automationPoint' || eventLike.type === 'chord'
      ? eventLike.type
      : 'note';
    var start = Math.max(0, Math.min(length - 1, ogInt(eventLike.startTick, 0)));
    var event = {
      id: eventLike.id || ogMintId(project, 'event'),
      type: type,
      trackId: ogSafeString(eventLike.trackId, ''),
      startTick: start
    };

    if (type === 'note') {
      var midi = ogNoteNameToMidi(eventLike.midi != null ? eventLike.midi : eventLike.pitch);
      if (midi == null) midi = 60;
      var duration = Math.max(1, Math.min(length - start, ogInt(eventLike.durationTicks, ogTicksPerBeat(project))));
      event.pitch = ogSafeString(eventLike.pitch, ogMidiToNoteName(midi));
      event.midi = Math.max(0, Math.min(127, midi));
      event.durationTicks = duration;
      event.velocity = ogNormalizeVelocity(eventLike.velocity);
      event.articulation = ogSafeString(eventLike.articulation, 'normal');
      if (eventLike.role) event.role = ogSafeString(eventLike.role, 'melody');
      if (eventLike.source) event.source = ogSafeString(eventLike.source, 'manual');
      if (eventLike.phraseId) event.phraseId = ogSafeString(eventLike.phraseId, '');
      event.notation = {
        startTick: ogInt(eventLike.notationStartTick != null ? eventLike.notationStartTick : eventLike.notation && eventLike.notation.startTick, start),
        durationTicks: Math.max(1, ogInt(eventLike.notationDurationTicks != null ? eventLike.notationDurationTicks : eventLike.notation && eventLike.notation.durationTicks, duration)),
        spelling: ogSafeString(eventLike.spelling || (eventLike.notation && eventLike.notation.spelling) || event.pitch, ogMidiToNoteName(midi)),
        tie: eventLike.tie || eventLike.notation && eventLike.notation.tie || null,
        articulation: event.articulation
      };
    } else if (type === 'drumHit') {
      event.padId = ogSafeString(eventLike.padId, 'pad_1');
      event.velocity = ogNormalizeVelocity(eventLike.velocity);
      event.probability = ogClamp(eventLike.probability, 0, 1, 1);
      event.microtimingTicks = ogInt(eventLike.microtimingTicks, 0);
      event.repeat = Math.max(1, ogInt(eventLike.repeat, 1));
      if (eventLike.role) event.role = ogSafeString(eventLike.role, 'groove');
      if (eventLike.source) event.source = ogSafeString(eventLike.source, 'manual');
      if (eventLike.grooveId) event.grooveId = ogSafeString(eventLike.grooveId, '');
    } else if (type === 'chord') {
      event.root = ogSafeString(eventLike.root, 'C');
      event.quality = ogSafeString(eventLike.quality, 'minor');
      event.bass = eventLike.bass ? ogSafeString(eventLike.bass, event.root) : null;
      event.durationTicks = Math.max(1, Math.min(length - start, ogInt(eventLike.durationTicks, ogTicksPerMeasure(project))));
    } else if (type === 'audioRegion') {
      event.assetId = ogSafeString(eventLike.assetId, '');
      event.sourceStartSec = Math.max(0, ogFinite(eventLike.sourceStartSec, 0));
      event.sourceDurationSec = Math.max(0.001, ogFinite(eventLike.sourceDurationSec, 1));
      event.durationTicks = Math.max(1, Math.min(length - start, ogInt(eventLike.durationTicks, ogTicksPerBeat(project))));
      event.gain = ogClamp(eventLike.gain, 0, 2, 1);
      event.reverse = !!eventLike.reverse;
    } else {
      var automationTarget = ogFindAutomationTarget(eventLike.target);
      event.target = automationTarget.id;
      event.value = ogNormalizeAutomationValue(automationTarget, eventLike.value);
      event.curve = eventLike.curve === 'hold' || eventLike.curve === 'linear' ? eventLike.curve : 'linear';
      if (eventLike.source) event.source = ogSafeString(eventLike.source, 'automationLane');
    }
    return event;
  }

  function ogSortEvents(pattern) {
    pattern.events.sort(function (a, b) {
      return (ogInt(a.startTick, 0) - ogInt(b.startTick, 0)) || String(a.id).localeCompare(String(b.id));
    });
  }

  function ogAppendEvent(project, patternId, eventLike) {
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var event = ogSanitizeEvent(project, pattern, eventLike);
    pattern.events.push(event);
    ogSortEvents(pattern);
    project.updatedAt = Math.max(ogInt(project.updatedAt, 0), ogInt(eventLike && eventLike.now, project.updatedAt || 0));
    return event;
  }

  function ogRemoveEvent(project, patternId, eventId) {
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) return false;
    var before = pattern.events.length;
    pattern.events = pattern.events.filter(function (event) { return event.id !== eventId; });
    return pattern.events.length !== before;
  }

  function ogSetDrumStep(project, patternId, trackId, padId, stepIndex, stepsPerBar, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var perBar = Math.max(1, ogInt(stepsPerBar, 16));
    var totalSteps = Math.max(1, pattern.bars * perBar);
    var step = Math.max(0, Math.min(totalSteps - 1, ogInt(stepIndex, 0)));
    var stepTicks = Math.round(ogTicksPerMeasure(project) / perBar);
    var startTick = step * stepTicks;
    var existing = null;
    for (var i = 0; i < pattern.events.length; i++) {
      var event = pattern.events[i];
      if (event.type === 'drumHit' && event.trackId === trackId && event.padId === padId && event.startTick === startTick) {
        existing = event;
        break;
      }
    }
    var shouldBeOn = options.on !== undefined ? !!options.on : !existing;
    if (!shouldBeOn) {
      if (existing) ogRemoveEvent(project, patternId, existing.id);
      return null;
    }
    if (existing) {
      existing.velocity = ogNormalizeVelocity(options.velocity != null ? options.velocity : existing.velocity);
      existing.probability = ogClamp(options.probability != null ? options.probability : existing.probability, 0, 1, 1);
      existing.microtimingTicks = ogInt(options.microtimingTicks != null ? options.microtimingTicks : existing.microtimingTicks, 0);
      existing.repeat = Math.max(1, ogInt(options.repeat != null ? options.repeat : existing.repeat, 1));
      if (options.role) existing.role = ogSafeString(options.role, existing.role || 'groove');
      if (options.source) existing.source = ogSafeString(options.source, existing.source || 'manual');
      if (options.grooveId) existing.grooveId = ogSafeString(options.grooveId, existing.grooveId || '');
      return existing;
    }
    return ogAppendEvent(project, patternId, {
      type: 'drumHit',
      trackId: trackId,
      padId: padId,
      startTick: startTick,
      velocity: options.velocity == null ? 0.8 : options.velocity,
      probability: options.probability == null ? 1 : options.probability,
      microtimingTicks: options.microtimingTicks || 0,
      repeat: options.repeat || 1,
      role: options.role,
      source: options.source,
      grooveId: options.grooveId
    });
  }

  function ogSetNoteStep(project, patternId, trackId, pitch, stepIndex, stepsPerBar, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var perBar = Math.max(1, ogInt(stepsPerBar, 16));
    var totalSteps = Math.max(1, pattern.bars * perBar);
    var step = Math.max(0, Math.min(totalSteps - 1, ogInt(stepIndex, 0)));
    var stepTicks = Math.round(ogTicksPerMeasure(project) / perBar);
    var startTick = step * stepTicks;
    var midi = ogNoteNameToMidi(pitch);
    if (midi == null) throw new Error('OpenGroove: invalid note pitch');
    var existing = null;
    for (var i = 0; i < pattern.events.length; i++) {
      var event = pattern.events[i];
      if (event.type === 'note' && event.trackId === trackId && event.midi === midi && event.startTick === startTick) {
        existing = event;
        break;
      }
    }
    var shouldBeOn = options.on !== undefined ? !!options.on : !existing;
    if (!shouldBeOn) {
      if (existing) ogRemoveEvent(project, patternId, existing.id);
      return null;
    }
    if (existing) {
      existing.velocity = ogNormalizeVelocity(options.velocity != null ? options.velocity : existing.velocity);
      existing.durationTicks = Math.max(1, ogInt(options.durationTicks != null ? options.durationTicks : existing.durationTicks, stepTicks));
      if (options.role) existing.role = ogSafeString(options.role, existing.role || 'keyboard');
      if (options.source) existing.source = ogSafeString(options.source, existing.source || 'manual');
      if (existing.notation) {
        existing.notation.startTick = ogQuantizeTick(startTick, stepTicks);
        existing.notation.durationTicks = ogQuantizeTick(existing.durationTicks, stepTicks);
        existing.notation.spelling = ogSafeString(options.spelling, pitch);
      }
      return existing;
    }
    return ogAppendEvent(project, patternId, {
      type: 'note',
      trackId: trackId,
      pitch: pitch,
      spelling: options.spelling || pitch,
      startTick: startTick,
      durationTicks: Math.max(1, ogInt(options.durationTicks, stepTicks)),
      velocity: options.velocity == null ? 0.78 : options.velocity,
      role: options.role,
      source: options.source,
      notationStartTick: ogQuantizeTick(startTick, stepTicks),
      notationDurationTicks: Math.max(1, ogQuantizeTick(options.durationTicks || stepTicks, stepTicks))
    });
  }

  function ogClearPadEvents(project, patternId, trackId, padId) {
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var before = pattern.events.length;
    pattern.events = pattern.events.filter(function (event) {
      return !(event.type === 'drumHit' && event.trackId === trackId && event.padId === padId);
    });
    return before - pattern.events.length;
  }

  function ogAccentPadEvents(project, patternId, trackId, padId, velocity) {
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var count = 0;
    (pattern.events || []).forEach(function (event) {
      if (event.type === 'drumHit' && event.trackId === trackId && event.padId === padId) {
        event.velocity = ogNormalizeVelocity(velocity == null ? 1 : velocity);
        count += 1;
      }
    });
    return count;
  }

  function ogHumanizeDrumEvents(project, patternId, trackId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var amountTicks = Math.max(0, Math.min(Math.round(ogTicksPerBeat(project) / 8), ogInt(options.amountTicks, Math.round(ogTicksPerBeat(project) / 96))));
    var velocityAmount = ogClamp(options.velocityAmount, 0, 0.4, 0.08);
    var seed = ogSafeString(options.seed, project && project.title || 'open-groove');
    var changed = 0;
    (pattern.events || []).forEach(function (event) {
      if (event.type !== 'drumHit') return;
      if (trackId && event.trackId !== trackId) return;
      var timingRand = ogSeededUnit(seed + ':' + event.id + ':time');
      var velocityRand = ogSeededUnit(seed + ':' + event.id + ':velocity');
      event.microtimingTicks = Math.round((timingRand * 2 - 1) * amountTicks);
      event.velocity = ogNormalizeVelocity((event.velocity == null ? 0.8 : event.velocity) + (velocityRand * 2 - 1) * velocityAmount);
      changed += 1;
    });
    ogSortEvents(pattern);
    return changed;
  }

  function ogBuildNotationPreview(project, patternId) {
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    if (!pattern) return { measures: [], notes: [], drumHits: [] };
    var measureTicks = ogTicksPerMeasure(project);
    var beatTicks = ogTicksPerBeat(project);
    var bars = Math.max(1, ogInt(pattern.bars, 1));
    var measures = [];
    for (var bar = 0; bar < bars; bar++) {
      measures.push({ bar: bar + 1, notes: [], drumHits: [], chords: [] });
    }
    (pattern.events || []).forEach(function (event) {
      var nStart = event.notation && event.notation.startTick != null ? event.notation.startTick : event.startTick;
      var barIndex = Math.max(0, Math.min(bars - 1, Math.floor(Math.max(0, ogInt(nStart, 0)) / measureTicks)));
      var inMeasure = Math.max(0, ogInt(nStart, 0) - barIndex * measureTicks);
      var entry = {
        id: event.id,
        type: event.type,
        trackId: event.trackId,
        startBeat: Math.round((inMeasure / beatTicks + 1) * 1000) / 1000
      };
      if (event.type === 'note') {
        var dur = event.notation && event.notation.durationTicks != null ? event.notation.durationTicks : event.durationTicks;
        entry.pitch = event.notation && event.notation.spelling || event.pitch || ogMidiToNoteName(event.midi);
        entry.durationBeats = Math.round((Math.max(1, ogInt(dur, beatTicks)) / beatTicks) * 1000) / 1000;
        entry.performedStartTick = event.startTick;
        entry.notationStartTick = nStart;
        if (event.role) entry.role = event.role;
        measures[barIndex].notes.push(entry);
      } else if (event.type === 'drumHit') {
        entry.padId = event.padId;
        entry.velocity = event.velocity;
        measures[barIndex].drumHits.push(entry);
      } else if (event.type === 'chord') {
        entry.root = event.root || 'C';
        entry.quality = event.quality || 'major';
        entry.bass = event.bass || null;
        entry.symbol = event.root + (Object.prototype.hasOwnProperty.call(OG_CHORD_SUFFIX, event.quality) ? OG_CHORD_SUFFIX[event.quality] : event.quality);
        measures[barIndex].chords.push(entry);
      }
    });
    measures.forEach(function (measure) {
      measure.notes.sort(function (a, b) { return a.notationStartTick - b.notationStartTick || String(a.pitch).localeCompare(String(b.pitch)); });
      measure.drumHits.sort(function (a, b) { return a.startBeat - b.startBeat || String(a.padId).localeCompare(String(b.padId)); });
    });
    return {
      measures: measures,
      notes: measures.reduce(function (all, measure) { return all.concat(measure.notes); }, []),
      drumHits: measures.reduce(function (all, measure) { return all.concat(measure.drumHits); }, [])
    };
  }

  function ogChordAtTick(project, pattern, tick) {
    var measureTicks = ogTicksPerMeasure(project);
    var atTick = Math.max(0, ogInt(tick, 0));
    var chords = (pattern && pattern.events || []).filter(function (event) {
      if (!event || event.type !== 'chord') return false;
      var start = ogInt(event.startTick, 0);
      var end = start + Math.max(1, ogInt(event.durationTicks, measureTicks));
      return start <= atTick && end > atTick;
    });
    if (!chords.length) return null;
    chords.sort(function (a, b) { return ogInt(b.startTick, 0) - ogInt(a.startTick, 0); });
    return ogDescribeChordInKey(project, chords[0]);
  }

  function ogBuildNotationGridBridge(project, patternId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    if (!pattern) return { patternId: null, trackId: options.trackId || null, measures: [], notes: [], stepsPerBar: 16, offGridCount: 0, performedOffsetCount: 0 };
    var trackId = options.trackId || null;
    var stepsPerBar = Math.max(1, ogInt(options.stepsPerBar, 16));
    var measureTicks = ogTicksPerMeasure(project);
    var beatTicks = ogTicksPerBeat(project);
    var stepTicks = Math.max(1, Math.round(measureTicks / stepsPerBar));
    var bars = Math.max(1, ogInt(pattern.bars, 1));
    var selectedBar = options.selectedBar == null ? null : Math.max(0, Math.min(bars - 1, ogInt(options.selectedBar, 0)));
    var key = project && project.key || {};
    var rootPc = ogPitchClassFromName(key.tonic || 'C');
    if (rootPc == null) rootPc = 0;
    var keyName = ogPitchClassNameForKey(rootPc, key.tonic || 'C', key.mode || 'minor') + ' ' + ogModeDisplayName(key.mode || 'minor');
    var measures = [];
    for (var bar = 0; bar < bars; bar++) {
      var steps = [];
      for (var step = 0; step < stepsPerBar; step++) {
        steps.push({
          index: step,
          absoluteStep: bar * stepsPerBar + step,
          label: String(step + 1),
          notes: [],
          drumHits: [],
          selected: selectedBar === bar
        });
      }
      measures.push({ bar: bar + 1, index: bar, selected: selectedBar === bar, steps: steps, notes: [] });
    }
    var notes = [];
    var offGridCount = 0;
    var performedOffsetCount = 0;

    (pattern.events || []).forEach(function (event) {
      if (!event || event.type === 'automationPoint') return;
      var startTick = event.type === 'note' && event.notation && event.notation.startTick != null ? event.notation.startTick : event.startTick;
      var absoluteStep = Math.round(Math.max(0, ogInt(startTick, 0)) / stepTicks);
      var barIndex = Math.max(0, Math.min(bars - 1, Math.floor(absoluteStep / stepsPerBar)));
      var localStep = Math.max(0, Math.min(stepsPerBar - 1, absoluteStep % stepsPerBar));
      var gridTick = absoluteStep * stepTicks;
      var gridOffsetTicks = ogInt(startTick, 0) - gridTick;
      var measure = measures[barIndex];
      var stepCell = measure && measure.steps[localStep];
      if (event.type === 'drumHit') {
        if (stepCell) stepCell.drumHits.push({ id: event.id, padId: event.padId, velocity: event.velocity });
        return;
      }
      if (event.type !== 'note') return;
      if (trackId && event.trackId !== trackId) return;
      var durationTicks = event.notation && event.notation.durationTicks != null ? event.notation.durationTicks : event.durationTicks;
      var performedStartTick = ogInt(event.startTick, ogInt(startTick, 0));
      var timingOffsetTicks = performedStartTick - ogInt(startTick, 0);
      var degree = ogScaleDegreeForPitch(project, event.midi != null ? event.midi : event.pitch);
      var chord = ogChordAtTick(project, pattern, ogInt(startTick, 0));
      var position = ogTickToPosition(project, startTick);
      var bridgeNote = {
        id: event.id,
        trackId: event.trackId,
        pitch: event.notation && event.notation.spelling || event.pitch || ogMidiToNoteName(event.midi),
        midi: event.midi == null ? ogNoteNameToMidi(event.pitch) : event.midi,
        bar: barIndex + 1,
        beat: position.beat,
        tick: position.tick,
        startBeat: Math.round((((ogInt(startTick, 0) - barIndex * measureTicks) / beatTicks) + 1) * 1000) / 1000,
        step: localStep + 1,
        localStep: localStep,
        absoluteStep: absoluteStep,
        durationSteps: Math.max(1, Math.round(Math.max(1, ogInt(durationTicks, stepTicks)) / stepTicks)),
        notationStartTick: ogInt(startTick, 0),
        performedStartTick: performedStartTick,
        timingOffsetTicks: timingOffsetTicks,
        gridOffsetTicks: gridOffsetTicks,
        onGrid: gridOffsetTicks === 0,
        degree: degree && degree.degree,
        degreeName: degree && degree.degreeName,
        solfege: degree && degree.solfege,
        nashville: degree && degree.nashville,
        noteName: degree && degree.note,
        chordSymbol: chord && chord.symbol || null,
        chordRoman: chord && chord.roman || null,
        chordNashville: chord && chord.nashville || null,
        label: (event.notation && event.notation.spelling || event.pitch || ogMidiToNoteName(event.midi)) + ' / step ' + (localStep + 1)
      };
      if (!bridgeNote.onGrid) offGridCount += 1;
      if (timingOffsetTicks !== 0) performedOffsetCount += 1;
      notes.push(bridgeNote);
      if (measure) measure.notes.push(bridgeNote);
      if (stepCell) stepCell.notes.push({
        id: bridgeNote.id,
        pitch: bridgeNote.pitch,
        degree: bridgeNote.degree,
        solfege: bridgeNote.solfege,
        durationSteps: bridgeNote.durationSteps
      });
    });

    notes.sort(function (a, b) {
      return (a.notationStartTick - b.notationStartTick) || String(a.pitch).localeCompare(String(b.pitch));
    });
    measures.forEach(function (measure) {
      measure.noteCount = measure.notes.length;
      measure.steps.forEach(function (step) {
        step.noteCount = step.notes.length;
        step.drumCount = step.drumHits.length;
      });
    });
    return {
      patternId: pattern.id,
      trackId: trackId,
      keyName: keyName,
      stepsPerBar: stepsPerBar,
      stepTicks: stepTicks,
      selectedBar: selectedBar,
      measures: measures,
      notes: notes,
      offGridCount: offGridCount,
      performedOffsetCount: performedOffsetCount
    };
  }

  function ogEscapeXml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&apos;';
    });
  }

  function ogBuildMusicXmlSketch(project, patternId, trackId) {
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    var track = ogFindTrack(project, trackId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var preview = ogBuildNotationPreview(project, pattern.id);
    var ts = Array.isArray(project.timeSignature) ? project.timeSignature : [4, 4];
    var lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<score-partwise version="3.1">',
      '  <part-list>',
      '    <score-part id="P1"><part-name>' + ogEscapeXml(track && track.name || 'Open Groove Track') + '</part-name></score-part>',
      '  </part-list>',
      '  <part id="P1">'
    ];
    preview.measures.forEach(function (measure, idx) {
      lines.push('    <measure number="' + measure.bar + '">');
      if (idx === 0) {
        lines.push('      <attributes>');
        lines.push('        <divisions>' + ogTicksPerBeat(project) + '</divisions>');
        lines.push('        <key><fifths>0</fifths></key>');
        lines.push('        <time><beats>' + ogInt(ts[0], 4) + '</beats><beat-type>' + ogInt(ts[1], 4) + '</beat-type></time>');
        lines.push('        <clef><sign>G</sign><line>2</line></clef>');
        lines.push('      </attributes>');
      }
      var notes = measure.notes.filter(function (note) { return !trackId || note.trackId === trackId; });
      if (!notes.length) {
        lines.push('      <note><rest/><duration>' + ogTicksPerMeasure(project) + '</duration></note>');
      } else {
        notes.forEach(function (note) {
          var p = ogParsePitchSpelling(note.pitch);
          lines.push('      <note>');
          lines.push('        <pitch><step>' + p.step + '</step>' + (p.alter ? '<alter>' + p.alter + '</alter>' : '') + '<octave>' + p.octave + '</octave></pitch>');
          lines.push('        <duration>' + Math.max(1, Math.round(note.durationBeats * ogTicksPerBeat(project))) + '</duration>');
          lines.push('      </note>');
        });
      }
      lines.push('    </measure>');
    });
    lines.push('  </part>');
    lines.push('</score-partwise>');
    return lines.join('\n');
  }

  function ogTextBytes(text) {
    var out = [];
    for (var i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 255);
    return out;
  }

  function ogUint16Bytes(value) {
    var n = Math.max(0, Math.min(65535, ogInt(value, 0)));
    return [(n >> 8) & 255, n & 255];
  }

  function ogUint32Bytes(value) {
    var n = Math.max(0, ogInt(value, 0));
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }

  function ogVarLenBytes(value) {
    var n = Math.max(0, ogInt(value, 0));
    var bytes = [n & 127];
    while ((n >>= 7)) bytes.unshift((n & 127) | 128);
    return bytes;
  }

  function ogPadToMidiDrum(padId) {
    var map = {
      pad_1: 36,
      pad_2: 38,
      pad_3: 42,
      pad_4: 46,
      pad_5: 39,
      pad_6: 37,
      pad_7: 41,
      pad_8: 48,
      pad_9: 49,
      pad_10: 51,
      pad_11: 70,
      pad_12: 75,
      pad_13: 35,
      pad_14: 52,
      pad_15: 56,
      pad_16: 55
    };
    return map[padId] || 36;
  }

  function ogMidiVelocity(value) {
    return Math.max(1, Math.min(127, Math.round(ogNormalizeVelocity(value) * 127)));
  }

  function ogCreateMidiExport(project, lengthTicks) {
    var ppq = Math.max(24, Math.min(32767, ogTicksPerBeat(project)));
    var bpm = Math.max(20, Math.min(400, ogFinite(project && project.bpm, OG_DEFAULT_BPM)));
    var tempo = Math.round(60000000 / bpm);
    var ts = Array.isArray(project.timeSignature) ? project.timeSignature : [4, 4];
    var denominator = Math.max(1, ogInt(ts[1], 4));
    var denominatorPower = 0;
    while (Math.pow(2, denominatorPower) < denominator && denominatorPower < 8) denominatorPower += 1;
    var ctx = {
      ppq: ppq,
      lengthTicks: Math.max(1, ogInt(lengthTicks, ogTicksPerMeasure(project))),
      events: []
    };
    ctx.add = function (tick, order, bytes) {
      ctx.events.push({
        tick: Math.max(0, Math.min(ctx.lengthTicks, ogInt(tick, 0))),
        order: order,
        bytes: bytes
      });
    };
    ctx.add(0, 0, [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]);
    ctx.add(0, 1, [0xff, 0x58, 0x04, Math.max(1, ogInt(ts[0], 4)), denominatorPower, 24, 8]);
    return ctx;
  }

  function ogAddPatternMidiEvents(project, pattern, ctx, offsetTick, clipTicks) {
    var ppq = ctx.ppq;
    var patternLength = Math.max(1, ogPatternLengthTicks(project, pattern));
    var windowTicks = Math.max(1, Math.min(patternLength, ogInt(clipTicks == null ? patternLength : clipTicks, patternLength)));
    var offset = Math.max(0, ogInt(offsetTick, 0));
    (pattern.events || []).forEach(function (event) {
      if (event.type === 'note') {
        var midi = Math.max(0, Math.min(127, ogInt(event.midi != null ? event.midi : ogNoteNameToMidi(event.pitch), 60)));
        var start = ogInt(event.startTick, 0);
        if (start >= windowTicks) return;
        var end = Math.min(windowTicks, start + Math.max(1, ogInt(event.durationTicks, ppq)));
        if (end <= 0) return;
        ctx.add(offset + Math.max(0, start), 4, [0x90, midi, ogMidiVelocity(event.velocity)]);
        ctx.add(offset + Math.max(1, end), 2, [0x80, midi, 0]);
      } else if (event.type === 'drumHit') {
        var drum = ogPadToMidiDrum(event.padId);
        var drumStart = ogInt(event.startTick, 0) + ogInt(event.microtimingTicks, 0);
        if (drumStart >= windowTicks) return;
        var drumEnd = Math.min(windowTicks, drumStart + Math.max(24, Math.round(ppq / 12)));
        if (drumEnd <= 0) return;
        ctx.add(offset + Math.max(0, drumStart), 5, [0x99, drum, ogMidiVelocity(event.velocity)]);
        ctx.add(offset + Math.max(1, drumEnd), 3, [0x89, drum, 0]);
      }
    });
  }

  function ogFinalizeMidiExport(ctx) {
    ctx.events.sort(function (a, b) {
      return (a.tick - b.tick) || (a.order - b.order);
    });

    var trackBytes = [];
    var lastTick = 0;
    ctx.events.forEach(function (event) {
      trackBytes = trackBytes.concat(ogVarLenBytes(event.tick - lastTick), event.bytes);
      lastTick = event.tick;
    });
    trackBytes = trackBytes.concat([0x00, 0xff, 0x2f, 0x00]);

    var fileBytes = []
      .concat(ogTextBytes('MThd'), ogUint32Bytes(6), ogUint16Bytes(0), ogUint16Bytes(1), ogUint16Bytes(ctx.ppq))
      .concat(ogTextBytes('MTrk'), ogUint32Bytes(trackBytes.length), trackBytes);
    return new Uint8Array(fileBytes);
  }

  function ogBuildMidiFile(project, patternId) {
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var patternLength = ogPatternLengthTicks(project, pattern);
    var ctx = ogCreateMidiExport(project, patternLength);
    ogAddPatternMidiEvents(project, pattern, ctx, 0, patternLength);
    return ogFinalizeMidiExport(ctx);
  }

  function ogBuildArrangementMidiFile(project) {
    var timeline = ogBuildArrangementTimeline(project);
    if (!timeline.length) return ogBuildMidiFile(project);
    var endTick = timeline.reduce(function (max, section) {
      return Math.max(max, ogInt(section.endTick, 0));
    }, 0);
    var ctx = ogCreateMidiExport(project, Math.max(ogTicksPerMeasure(project), endTick));
    timeline.forEach(function (section) {
      var sectionLength = Math.max(1, ogInt(section.endTick, 0) - ogInt(section.startTick, 0));
      (section.patternIds || []).forEach(function (patternId) {
        var pattern = ogFindPattern(project, patternId);
        if (!pattern) return;
        var patternLength = Math.max(1, ogPatternLengthTicks(project, pattern));
        for (var sectionOffset = 0; sectionOffset < sectionLength; sectionOffset += patternLength) {
          var clipTicks = Math.min(patternLength, sectionLength - sectionOffset);
          ogAddPatternMidiEvents(project, pattern, ctx, section.startTick + sectionOffset, clipTicks);
        }
      });
    });
    return ogFinalizeMidiExport(ctx);
  }

  function ogDuplicatePattern(project, patternId, name) {
    var source = ogFindPattern(project, patternId);
    if (!source) throw new Error('OpenGroove: pattern not found');
    var copy = {
      id: ogMintId(project, 'pattern'),
      name: ogSafeString(name, source.name + ' Copy'),
      bars: source.bars,
      events: source.events.map(function (event) {
        var next = ogClone(event);
        next.id = ogMintId(project, 'event');
        return next;
      })
    };
    project.patterns.push(copy);
    return copy;
  }

  function ogFindScene(project, sceneId) {
    var scenes = project && Array.isArray(project.scenes) ? project.scenes : [];
    for (var i = 0; i < scenes.length; i++) if (scenes[i].id === sceneId) return scenes[i];
    return null;
  }

  function ogSceneLengthBars(project, sceneLike) {
    var scene = typeof sceneLike === 'string' ? ogFindScene(project, sceneLike) : sceneLike;
    var ids = scene && Array.isArray(scene.patternIds) ? scene.patternIds : [];
    var bars = 0;
    ids.forEach(function (patternId) {
      var pattern = ogFindPattern(project, patternId);
      if (pattern) bars = Math.max(bars, Math.max(1, ogInt(pattern.bars, 1)));
    });
    return Math.max(1, bars || 1);
  }

  function ogAddScene(project, options) {
    options = options || {};
    if (!project || !Array.isArray(project.patterns)) throw new Error('OpenGroove: project is not ready');
    project.scenes = Array.isArray(project.scenes) ? project.scenes : [];
    var requested = Array.isArray(options.patternIds) ? options.patternIds : [];
    var patternIds = [];
    requested.forEach(function (patternId) {
      if (ogFindPattern(project, patternId) && patternIds.indexOf(patternId) < 0) patternIds.push(patternId);
    });
    if (!patternIds.length && project.patterns[0]) patternIds.push(project.patterns[0].id);
    var scene = {
      id: options.id || ogMintId(project, 'scene'),
      name: ogSafeString(options.name, 'Scene ' + (project.scenes.length + 1)),
      patternIds: patternIds
    };
    project.scenes.push(scene);
    return scene;
  }

  function ogSetScenePatterns(project, sceneId, patternIds) {
    var scene = ogFindScene(project, sceneId);
    if (!scene) throw new Error('OpenGroove: scene not found');
    var nextIds = [];
    (Array.isArray(patternIds) ? patternIds : []).forEach(function (patternId) {
      if (ogFindPattern(project, patternId) && nextIds.indexOf(patternId) < 0) nextIds.push(patternId);
    });
    scene.patternIds = nextIds;
    return scene;
  }

  function ogNextArrangementStartBar(project) {
    var next = 1;
    (project && Array.isArray(project.arrangement) ? project.arrangement : []).forEach(function (section) {
      next = Math.max(next, Math.max(1, ogInt(section.startBar, 1)) + Math.max(1, ogInt(section.bars, 1)));
    });
    return next;
  }

  function ogAddArrangementSection(project, sceneId, options) {
    options = options || {};
    var scene = ogFindScene(project, sceneId);
    if (!scene) throw new Error('OpenGroove: scene not found');
    project.arrangement = Array.isArray(project.arrangement) ? project.arrangement : [];
    var section = {
      sceneId: scene.id,
      startBar: Math.max(1, ogInt(options.startBar, ogNextArrangementStartBar(project))),
      bars: Math.max(1, ogInt(options.bars, ogSceneLengthBars(project, scene))),
      label: ogSafeString(options.label, scene.name)
    };
    if (options.role) section.role = ogSafeString(options.role, options.label || scene.name);
    if (options.variant) section.variant = ogSafeString(options.variant, 'A');
    project.arrangement.push(section);
    return section;
  }

  function ogListSongFormPresets() {
    return OG_SONG_FORM_PRESETS.map(function (preset) { return ogClone(preset); });
  }

  function ogFindSongFormPreset(formId) {
    var id = ogSafeString(formId, 'verse-hook');
    for (var i = 0; i < OG_SONG_FORM_PRESETS.length; i++) {
      if (OG_SONG_FORM_PRESETS[i].id === id) return OG_SONG_FORM_PRESETS[i];
    }
    return OG_SONG_FORM_PRESETS[0];
  }

  function ogFindSinglePatternScene(project, patternId) {
    var scenes = project && Array.isArray(project.scenes) ? project.scenes : [];
    for (var i = 0; i < scenes.length; i++) {
      if (Array.isArray(scenes[i].patternIds) && scenes[i].patternIds.length === 1 && scenes[i].patternIds[0] === patternId) return scenes[i];
    }
    return null;
  }

  function ogApplySongFormPreset(project, formId, options) {
    options = options || {};
    if (formId && typeof formId === 'object') {
      options = formId;
      formId = options.formId;
    }
    if (!project || !Array.isArray(project.patterns)) throw new Error('OpenGroove: project is not ready');
    var preset = ogFindSongFormPreset(formId || options.formId);
    var sourcePattern = ogFindPattern(project, options.patternId || project.patterns[0] && project.patterns[0].id);
    if (!sourcePattern) throw new Error('OpenGroove: pattern not found');
    var replace = options.replace !== false;
    if (replace) project.arrangement = [];

    var variants = { A: sourcePattern };
    var scenesByVariant = {};
    var createdPatternIds = [];
    var createdSceneIds = [];
    var sections = [];
    var startBar = replace && options.startBar == null ? 1 : Math.max(1, ogInt(options.startBar, ogNextArrangementStartBar(project)));

    (preset.sections || []).forEach(function (sectionDef, index) {
      var variant = ogSafeString(sectionDef.variant, 'A').toUpperCase();
      if (!variants[variant]) {
        var copy = ogDuplicatePattern(project, sourcePattern.id, 'Pattern ' + variant);
        variants[variant] = copy;
        createdPatternIds.push(copy.id);
      }
      var pattern = variants[variant];
      var scene = scenesByVariant[variant];
      if (!scene) {
        scene = variant === 'A' ? ogFindSinglePatternScene(project, pattern.id) : null;
        if (!scene) {
          scene = ogAddScene(project, { name: 'Scene ' + variant, patternIds: [pattern.id] });
          createdSceneIds.push(scene.id);
        }
        scenesByVariant[variant] = scene;
      }
      var bars = Math.max(1, ogInt(sectionDef.bars, pattern.bars));
      var label = ogSafeString(sectionDef.label, (sectionDef.role || preset.shortName || preset.name) + ' ' + (index + 1));
      var role = ogSafeString(sectionDef.role, label);
      var section = ogAddArrangementSection(project, scene.id, {
        startBar: startBar,
        bars: bars,
        label: label,
        role: role,
        variant: variant
      });
      sections.push({
        index: index,
        label: section.label,
        role: section.role || role,
        variant: section.variant || variant,
        sceneId: scene.id,
        patternId: pattern.id,
        startBar: section.startBar,
        bars: section.bars,
        endBar: section.startBar + section.bars - 1
      });
      startBar += bars;
    });

    return {
      presetId: preset.id,
      name: preset.name,
      shortName: preset.shortName,
      replace: replace,
      sourcePatternId: sourcePattern.id,
      createdPatternIds: createdPatternIds,
      createdSceneIds: createdSceneIds,
      sectionCount: sections.length,
      totalBars: sections.reduce(function (sum, section) { return sum + section.bars; }, 0),
      sections: sections
    };
  }

  function ogBuildArrangementTimeline(project) {
    var measureTicks = ogTicksPerMeasure(project);
    return (project && Array.isArray(project.arrangement) ? project.arrangement : []).map(function (section, index) {
      var scene = ogFindScene(project, section.sceneId);
      var startBar = Math.max(1, ogInt(section.startBar, index + 1));
      var bars = Math.max(1, ogInt(section.bars, scene ? ogSceneLengthBars(project, scene) : 1));
      var patternIds = scene && Array.isArray(scene.patternIds) ? scene.patternIds.filter(function (patternId) { return !!ogFindPattern(project, patternId); }) : [];
      return {
        index: index,
        sceneId: section.sceneId,
        sceneName: scene && scene.name || section.label || 'Scene',
        label: section.label || scene && scene.name || 'Section ' + (index + 1),
        role: section.role || null,
        variant: section.variant || null,
        patternIds: patternIds,
        startBar: startBar,
        bars: bars,
        endBar: startBar + bars - 1,
        startTick: (startBar - 1) * measureTicks,
        endTick: (startBar - 1 + bars) * measureTicks
      };
    }).sort(function (a, b) {
      return (a.startBar - b.startBar) || (a.index - b.index);
    });
  }

  function ogBuildPatternLauncher(project, options) {
    options = options || {};
    var activePatternId = options.activePatternId || project && project.patterns && project.patterns[0] && project.patterns[0].id || null;
    var timeline = ogBuildArrangementTimeline(project);
    var scenes = project && Array.isArray(project.scenes) ? project.scenes : [];
    var tracks = project && Array.isArray(project.tracks) ? project.tracks : [];
    var effectTrackCount = tracks.filter(function (track) {
      return ogGetTrackEffects(project, track.id).length > 0;
    }).length;
    var patternScenes = {};
    scenes.forEach(function (scene) {
      (scene.patternIds || []).forEach(function (patternId) {
        patternScenes[patternId] = patternScenes[patternId] || [];
        patternScenes[patternId].push({ id: scene.id, name: scene.name });
      });
    });
    var patternSections = {};
    timeline.forEach(function (section) {
      (section.patternIds || []).forEach(function (patternId) {
        patternSections[patternId] = patternSections[patternId] || [];
        patternSections[patternId].push({
          sceneId: section.sceneId,
          label: section.label,
          startBar: section.startBar,
          endBar: section.endBar
        });
      });
    });
    var patterns = (project && Array.isArray(project.patterns) ? project.patterns : []).map(function (pattern, index) {
      var events = Array.isArray(pattern.events) ? pattern.events : [];
      var chord = events.filter(function (event) { return event.type === 'chord'; })[0] || null;
      return {
        id: pattern.id,
        index: index,
        slot: String.fromCharCode(65 + (index % 26)) + (index >= 26 ? Math.floor(index / 26) + 1 : ''),
        name: pattern.name || 'Pattern ' + (index + 1),
        bars: Math.max(1, ogInt(pattern.bars, 1)),
        active: pattern.id === activePatternId,
        drumHitCount: events.filter(function (event) { return event.type === 'drumHit'; }).length,
        noteCount: events.filter(function (event) { return event.type === 'note'; }).length,
        chordCount: events.filter(function (event) { return event.type === 'chord'; }).length,
        automationCount: events.filter(function (event) { return event.type === 'automationPoint'; }).length,
        audioRegionCount: events.filter(function (event) { return event.type === 'audioRegion'; }).length,
        sceneCount: (patternScenes[pattern.id] || []).length,
        sectionCount: (patternSections[pattern.id] || []).length,
        scenes: patternScenes[pattern.id] || [],
        sections: patternSections[pattern.id] || [],
        firstChord: chord ? ogDescribeChordInKey(project, chord) : null,
        effectTrackCount: effectTrackCount
      };
    });
    return {
      activePatternId: activePatternId,
      patternCount: patterns.length,
      sceneCount: scenes.length,
      sectionCount: timeline.length,
      effectTrackCount: effectTrackCount,
      patterns: patterns
    };
  }

  function ogEventMatchesEditFilter(event, options) {
    options = options || {};
    if (options.trackId && event.trackId !== options.trackId) return false;
    if (Array.isArray(options.types) && options.types.length) {
      for (var i = 0; i < options.types.length; i++) if (options.types[i] === event.type) return true;
      return false;
    }
    return true;
  }

  function ogBarRange(project, pattern, barIndex) {
    var bars = Math.max(1, ogInt(pattern && pattern.bars, 1));
    var bar = Math.max(0, Math.min(bars - 1, ogInt(barIndex, 0)));
    var measureTicks = ogTicksPerMeasure(project);
    return {
      bar: bar,
      fromTick: bar * measureTicks,
      toTick: (bar + 1) * measureTicks,
      measureTicks: measureTicks
    };
  }

  function ogClearBar(project, patternId, barIndex, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var range = ogBarRange(project, pattern, barIndex);
    var before = pattern.events.length;
    pattern.events = pattern.events.filter(function (event) {
      var inRange = ogInt(event.startTick, 0) >= range.fromTick && ogInt(event.startTick, 0) < range.toTick;
      return !(inRange && ogEventMatchesEditFilter(event, options));
    });
    return before - pattern.events.length;
  }

  function ogCopyBar(project, patternId, fromBar, toBar, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var sourceRange = ogBarRange(project, pattern, fromBar);
    var targetRange = ogBarRange(project, pattern, toBar);
    if (sourceRange.bar === targetRange.bar) return [];
    var offset = targetRange.fromTick - sourceRange.fromTick;
    var sourceEvents = (pattern.events || []).filter(function (event) {
      var start = ogInt(event.startTick, 0);
      return start >= sourceRange.fromTick && start < sourceRange.toTick && ogEventMatchesEditFilter(event, options);
    }).map(ogClone);
    if (options.replace !== false) ogClearBar(project, patternId, targetRange.bar, options);
    var created = sourceEvents.map(function (event) {
      var copy = ogClone(event);
      copy.id = ogMintId(project, 'event');
      copy.startTick = ogInt(event.startTick, 0) + offset;
      if (copy.notation && copy.notation.startTick != null) {
        copy.notation.startTick = ogInt(copy.notation.startTick, 0) + offset;
      }
      return ogSanitizeEvent(project, pattern, copy);
    });
    pattern.events = (pattern.events || []).concat(created);
    ogSortEvents(pattern);
    return created;
  }

  function ogClearTrackEvents(project, patternId, trackId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var fromTick = Math.max(0, ogInt(options.fromTick, 0));
    var toTick = options.toTick == null ? ogPatternLengthTicks(project, pattern) : Math.max(fromTick, ogInt(options.toTick, 0));
    var typeMap = null;
    if (Array.isArray(options.types) && options.types.length) {
      typeMap = {};
      options.types.forEach(function (type) { typeMap[type] = true; });
    }
    var removed = 0;
    pattern.events = pattern.events.filter(function (event) {
      var inRange = event.trackId === trackId && event.startTick >= fromTick && event.startTick < toTick;
      var typeMatches = !typeMap || !!typeMap[event.type];
      if (inRange && typeMatches) {
        removed += 1;
        return false;
      }
      return true;
    });
    return removed;
  }

  function ogNormalizeChordLike(chordLike) {
    if (typeof chordLike === 'string') {
      var compact = chordLike.trim();
      var m = /^([A-Ga-g][#b]?)(maj7|m7|dim|aug|sus2|sus4|m|7)?$/.exec(compact);
      if (m) {
        var suffix = m[2] || '';
        var quality = suffix === 'm' ? 'minor'
          : suffix === 'm7' ? 'min7'
          : suffix === 'maj7' ? 'maj7'
          : suffix === '7' ? 'dom7'
          : suffix === 'dim' ? 'diminished'
          : suffix === 'aug' ? 'augmented'
          : suffix || 'major';
        return { root: ogNormalizeRootName(m[1]), quality: quality };
      }
    }
    chordLike = chordLike || {};
    return {
      root: ogNormalizeRootName(chordLike.root || 'C'),
      quality: OG_CHORD_INTERVALS[chordLike.quality] ? chordLike.quality : 'major',
      bass: chordLike.bass ? ogNormalizeRootName(chordLike.bass) : null
    };
  }

  function ogApplyChordProgression(project, patternId, trackId, progression, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    if (!Array.isArray(progression) || !progression.length) return [];
    var barsPerChord = Math.max(1, ogInt(options.barsPerChord, 1));
    var startBar = Math.max(0, ogInt(options.startBar, 0));
    var octave = ogInt(options.octave, 3);
    var velocity = ogNormalizeVelocity(options.velocity == null ? 0.58 : options.velocity);
    var writeNotes = options.writeNotes !== false;
    var measureTicks = ogTicksPerMeasure(project);
    var created = [];

    progression.forEach(function (item, index) {
      var chord = ogNormalizeChordLike(item);
      var startTick = (startBar + index * barsPerChord) * measureTicks;
      if (startTick >= ogPatternLengthTicks(project, pattern)) return;
      var durationTicks = Math.min(barsPerChord * measureTicks, ogPatternLengthTicks(project, pattern) - startTick);
      created.push(ogAppendEvent(project, pattern.id, {
        type: 'chord',
        trackId: trackId,
        root: chord.root,
        quality: chord.quality,
        bass: chord.bass,
        startTick: startTick,
        durationTicks: durationTicks
      }));
      if (writeNotes) {
        ogBuildChord(chord.root, chord.quality, octave).pitches.forEach(function (pitch) {
          created.push(ogAppendEvent(project, pattern.id, {
            type: 'note',
            trackId: trackId,
            pitch: pitch,
            spelling: pitch,
            startTick: startTick,
            durationTicks: durationTicks,
            velocity: velocity,
            notationStartTick: startTick,
            notationDurationTicks: durationTicks
          }));
        });
      }
    });

    return created;
  }

  function ogListDrumGrooveStyles() {
    return ogClone(OG_DRUM_GROOVE_STYLES);
  }

  function ogNormalizeDrumGrooveStyle(styleId) {
    var id = String(styleId || '').trim();
    for (var i = 0; i < OG_DRUM_GROOVE_STYLES.length; i++) {
      if (OG_DRUM_GROOVE_STYLES[i].id === id) return OG_DRUM_GROOVE_STYLES[i];
    }
    return OG_DRUM_GROOVE_STYLES[0];
  }

  function ogFindDrumHitAt(pattern, trackId, padId, startTick) {
    var events = pattern && Array.isArray(pattern.events) ? pattern.events : [];
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      if (event.type === 'drumHit' && event.trackId === trackId && event.padId === padId && ogInt(event.startTick, 0) === startTick) return event;
    }
    return null;
  }

  function ogWriteDrumGroove(project, patternId, trackId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'drumRack') throw new Error('OpenGroove: drum track not found');
    var style = ogNormalizeDrumGrooveStyle(options.style);
    var stepsPerBar = Math.max(4, Math.min(32, ogInt(options.stepsPerBar, 16)));
    var measureTicks = ogTicksPerMeasure(project);
    var stepTicks = Math.round(measureTicks / stepsPerBar);
    var startBar = Math.max(0, Math.min(Math.max(0, pattern.bars - 1), ogInt(options.startBar, 0)));
    var bars = Math.max(1, Math.min(pattern.bars - startBar, ogInt(options.bars, 1)));
    var startTick = startBar * measureTicks;
    var endTick = Math.min(ogPatternLengthTicks(project, pattern), startTick + bars * measureTicks);
    var seed = ogSafeString(options.seed, (project && project.title || 'Open Groove') + ':' + pattern.id + ':' + trackId + ':' + startBar + ':' + style.id);
    var grooveId = ogSafeString(options.grooveId, 'groove-' + style.id + '-' + (startBar + 1));
    var humanizeTicks = Math.max(0, Math.min(Math.round(stepTicks / 3), ogInt(options.humanizeTicks, Math.round(stepTicks / 14))));
    var velocityAmount = ogClamp(options.velocityAmount, 0, 0.25, 0.05);
    var created = [];
    var skipped = 0;

    if (options.replace !== false) {
      pattern.events = (pattern.events || []).filter(function (event) {
        return !(event.type === 'drumHit' && event.trackId === trackId && event.role === 'groove' && event.startTick >= startTick && event.startTick < endTick);
      });
    }

    for (var bar = 0; bar < bars; bar++) {
      for (var i = 0; i < style.entries.length; i++) {
        var entry = style.entries[i];
        var localStep = Math.max(0, Math.min(stepsPerBar - 1, ogInt(entry.step, 0)));
        var hitTick = startTick + bar * measureTicks + localStep * stepTicks;
        if (hitTick < startTick || hitTick >= endTick) continue;
        var existing = ogFindDrumHitAt(pattern, trackId, entry.padId, hitTick);
        if (existing) {
          skipped += 1;
          continue;
        }
        var nudge = humanizeTicks ? Math.round((ogSeededUnit(seed + ':nudge:' + bar + ':' + i) - 0.5) * humanizeTicks * 2) : 0;
        var velocity = ogNormalizeVelocity(ogFinite(entry.velocity, 0.8) + (ogSeededUnit(seed + ':velocity:' + bar + ':' + i) - 0.5) * velocityAmount);
        created.push(ogAppendEvent(project, pattern.id, {
          type: 'drumHit',
          trackId: trackId,
          padId: entry.padId,
          startTick: hitTick,
          velocity: velocity,
          probability: entry.probability == null ? 1 : entry.probability,
          microtimingTicks: nudge,
          repeat: entry.repeat || 1,
          role: 'groove',
          source: 'grooveWriter',
          grooveId: grooveId
        }));
      }
    }

    return {
      grooveId: grooveId,
      style: style.id,
      styleName: style.name,
      startBar: startBar,
      bars: bars,
      stepsPerBar: stepsPerBar,
      hitCount: created.length,
      skippedCount: skipped,
      events: created
    };
  }

  function ogListMelodyPhraseStyles() {
    return ogClone(OG_MELODY_PHRASE_STYLES);
  }

  function ogNormalizeMelodyPhraseStyle(styleId) {
    var id = String(styleId || '').trim();
    for (var i = 0; i < OG_MELODY_PHRASE_STYLES.length; i++) {
      if (OG_MELODY_PHRASE_STYLES[i].id === id) return OG_MELODY_PHRASE_STYLES[i];
    }
    return OG_MELODY_PHRASE_STYLES[0];
  }

  function ogBuildScaleMidiPool(project, octave) {
    var key = project && project.key || {};
    var scale = ogBuildScale(key.tonic || 'C', key.mode || 'minor');
    var baseOctave = ogClamp(ogInt(octave, 4), 1, 7, 4);
    var pool = [];
    [baseOctave, baseOctave + 1].forEach(function (oct) {
      scale.forEach(function (note) {
        var midi = ogNoteNameToMidi(note + oct);
        if (midi != null && midi >= 0 && midi <= 127) pool.push(midi);
      });
    });
    pool.sort(function (a, b) { return a - b; });
    return pool.length ? pool : [60, 62, 63, 65, 67, 68, 70, 72];
  }

  function ogChordPitchClasses(chordLike, octave) {
    if (!chordLike) return null;
    return ogBuildChord(chordLike.root || 'C', chordLike.quality || 'major', octave || 4).midi.map(function (midi) {
      return midi % 12;
    });
  }

  function ogNearestPitchFromClasses(pool, classes, targetMidi) {
    if (!classes || !classes.length) return null;
    var best = null;
    var bestDistance = Infinity;
    pool.forEach(function (midi) {
      if (classes.indexOf(midi % 12) < 0) return;
      var distance = Math.abs(midi - targetMidi);
      if (distance < bestDistance) {
        best = midi;
        bestDistance = distance;
      }
    });
    return best;
  }

  function ogWriteMelodyPhrase(project, patternId, trackId, options) {
    options = options || {};
    var pattern = ogFindPattern(project, patternId);
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var track = ogFindTrack(project, trackId);
    if (!track) throw new Error('OpenGroove: melody track not found');
    var style = ogNormalizeMelodyPhraseStyle(options.style);
    var measureTicks = ogTicksPerMeasure(project);
    var patternTicks = ogPatternLengthTicks(project, pattern);
    var startBar = Math.max(0, Math.min(Math.max(0, pattern.bars - 1), ogInt(options.startBar, 0)));
    var bars = Math.max(1, Math.min(pattern.bars - startBar, ogInt(options.bars, style.id === 'callResponse' ? 2 : 1)));
    var stepsPerBar = Math.max(4, Math.min(16, ogInt(options.stepsPerBar, 8)));
    var stepTicks = Math.round(measureTicks / stepsPerBar);
    var startTick = startBar * measureTicks;
    var endTick = Math.min(patternTicks, startTick + bars * measureTicks);
    var octave = Math.max(1, Math.min(7, ogInt(options.octave, 4)));
    var velocity = ogNormalizeVelocity(options.velocity == null ? 0.72 : options.velocity);
    var seed = ogSafeString(options.seed, (project && project.title || 'Open Groove') + ':' + pattern.id + ':' + trackId + ':' + startBar + ':' + style.id);
    var phraseId = ogSafeString(options.phraseId, 'melody-' + style.id + '-' + (startBar + 1));
    var pool = ogBuildScaleMidiPool(project, octave);
    var scale = ogBuildScale(project && project.key && project.key.tonic || 'C', project && project.key && project.key.mode || 'minor');
    var chordEvents = (pattern.events || []).filter(function (event) {
      return event.type === 'chord' && event.startTick < endTick && event.startTick + ogInt(event.durationTicks, measureTicks) > startTick;
    });
    var templates = {
      balanced: [0, 2, 3, 5, 6],
      sparse: [0, 4],
      ascending: [0, 1, 2, 4, 6],
      callResponse: [0, 2, 4, 6]
    };
    var activeSteps = templates[style.id] || templates.balanced;
    var created = [];

    if (options.replace !== false) {
      pattern.events = (pattern.events || []).filter(function (event) {
        return !(event.type === 'note' && event.trackId === trackId && event.role === 'melody' && event.startTick >= startTick && event.startTick < endTick);
      });
    }

    function chordAt(tick) {
      for (var c = 0; c < chordEvents.length; c++) {
        var chord = chordEvents[c];
        var chordEnd = chord.startTick + ogInt(chord.durationTicks, measureTicks);
        if (tick >= chord.startTick && tick < chordEnd) return chord;
      }
      return null;
    }

    for (var step = 0; step < bars * stepsPerBar; step++) {
      var localStep = step % stepsPerBar;
      if (activeSteps.indexOf(localStep) < 0) continue;
      var densityRoll = ogSeededUnit(seed + ':density:' + step);
      if (densityRoll > style.density && localStep !== 0) continue;
      var barOffset = Math.floor(step / stepsPerBar);
      var phraseTick = startTick + step * stepTicks;
      if (phraseTick >= endTick) continue;
      var degreeSeed = ogSeededUnit(seed + ':degree:' + step);
      var degree = Math.floor(degreeSeed * pool.length);
      if (style.id === 'ascending') degree = Math.min(pool.length - 1, (barOffset * 2 + activeSteps.indexOf(localStep)) % pool.length);
      if (style.id === 'sparse') degree = [0, 2, 4, 2][barOffset % 4] || 0;
      if (style.id === 'callResponse') {
        var callDegree = [0, 2, 4, 2][activeSteps.indexOf(localStep) % 4] || 0;
        degree = Math.min(pool.length - 1, callDegree + (barOffset % 2 ? 1 : 0));
      }
      var midi = pool[Math.max(0, Math.min(pool.length - 1, degree))];
      var chord = chordAt(phraseTick);
      var chordTone = ogNearestPitchFromClasses(pool, ogChordPitchClasses(chord, octave), midi);
      if ((localStep === 0 || localStep === Math.floor(stepsPerBar / 2)) && chordTone != null) midi = chordTone;
      var durationSteps = style.id === 'sparse' ? 2 : localStep >= stepsPerBar - 2 ? 1 : 1 + Math.floor(ogSeededUnit(seed + ':dur:' + step) * 2);
      var durationTicks = Math.min(endTick - phraseTick, durationSteps * stepTicks);
      created.push(ogAppendEvent(project, pattern.id, {
        type: 'note',
        trackId: trackId,
        pitch: ogMidiToNoteName(midi),
        spelling: ogMidiToNoteName(midi),
        startTick: phraseTick,
        durationTicks: durationTicks,
        velocity: velocity,
        role: 'melody',
        source: 'phrase',
        phraseId: phraseId,
        notationStartTick: ogQuantizeTick(phraseTick, stepTicks),
        notationDurationTicks: Math.max(1, ogQuantizeTick(durationTicks, stepTicks))
      }));
    }

    return {
      phraseId: phraseId,
      style: style.id,
      styleName: style.name,
      startBar: startBar,
      bars: bars,
      stepsPerBar: stepsPerBar,
      scale: scale,
      noteCount: created.length,
      events: created
    };
  }

  function ogAddAsset(project, assetLike) {
    assetLike = assetLike || {};
    if (!project || !Array.isArray(project.assets)) throw new Error('OpenGroove: project is not ready');
    var asset = {
      id: assetLike.id || ogMintId(project, 'asset'),
      type: assetLike.type === 'recording' || assetLike.type === 'loop' || assetLike.type === 'sample' ? assetLike.type : 'sample',
      name: ogSafeString(assetLike.name, 'Untitled Sample'),
      file: ogSafeString(assetLike.file, ''),
      source: ogSafeString(assetLike.source, 'User import'),
      creator: ogSafeString(assetLike.creator, 'Unknown'),
      license: ogSafeString(assetLike.license, 'Unknown'),
      attributionRequired: !!assetLike.attributionRequired,
      originalUrl: assetLike.originalUrl || null,
      checksum: assetLike.checksum || null,
      durationSec: Math.max(0, ogFinite(assetLike.durationSec, 0)),
      sizeBytes: Math.max(0, ogInt(assetLike.sizeBytes, 0)),
      mimeType: assetLike.mimeType ? ogSafeString(assetLike.mimeType, '') : null,
      storage: assetLike.storage === 'embedded' || assetLike.storage === 'external' || assetLike.storage === 'session'
        ? assetLike.storage
        : assetLike.dataUrl ? 'embedded' : 'external',
      dataUrl: assetLike.dataUrl ? String(assetLike.dataUrl).trim() : null,
      localOnly: !!assetLike.localOnly,
      stemRole: assetLike.stemRole ? ogSafeString(assetLike.stemRole, '') : null,
      stemGroupId: assetLike.stemGroupId ? ogSafeString(assetLike.stemGroupId, '') : null,
      stemSourceAssetId: assetLike.stemSourceAssetId ? ogSafeString(assetLike.stemSourceAssetId, '') : null,
      stemEngine: assetLike.stemEngine ? ogSafeString(assetLike.stemEngine, '') : null,
      stemConfidence: assetLike.stemConfidence == null ? null : ogClamp(assetLike.stemConfidence, 0, 1, 0),
      createdAt: ogInt(assetLike.createdAt, 0),
      tags: Array.isArray(assetLike.tags) ? assetLike.tags.map(function (tag) { return ogSafeString(tag, ''); }).filter(Boolean) : []
    };
    if (asset.dataUrl && !asset.sizeBytes) asset.sizeBytes = ogEstimateDataUrlBytes(asset.dataUrl);
    project.assets.push(asset);
    return asset;
  }

  function ogFindAsset(project, assetId) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    for (var i = 0; i < assets.length; i++) if (assets[i].id === assetId) return assets[i];
    return null;
  }

  function ogFindPad(project, trackId, padId) {
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'drumRack') return null;
    for (var i = 0; i < (track.pads || []).length; i++) {
      if (track.pads[i].id === padId) return track.pads[i];
    }
    return null;
  }

  function ogNormalizeSampleRegion(asset, regionLike) {
    regionLike = regionLike || {};
    var assetDuration = Math.max(0, ogFinite(asset && asset.durationSec, 0));
    var startSec = Math.max(0, ogFinite(regionLike.startSec, 0));
    var endFallback = assetDuration > 0 ? assetDuration : startSec + 0.25;
    var endSec = Math.max(startSec + 0.001, ogFinite(regionLike.endSec != null ? regionLike.endSec : regionLike.stopSec, endFallback));
    if (assetDuration > 0) endSec = Math.min(assetDuration, endSec);
    if (endSec <= startSec) endSec = startSec + 0.001;
    return {
      startSec: Math.round(startSec * 1000) / 1000,
      endSec: Math.round(endSec * 1000) / 1000,
      durationSec: Math.round((endSec - startSec) * 1000) / 1000,
      label: ogSafeString(regionLike.label, 'Slice')
    };
  }

  function ogRegisterUserRecording(project, recordingLike) {
    recordingLike = recordingLike || {};
    var tags = Array.isArray(recordingLike.tags) ? recordingLike.tags.slice() : [];
    if (tags.indexOf('user-recording') < 0) tags.push('user-recording');
    return ogAddAsset(project, {
      type: 'recording',
      name: ogSafeString(recordingLike.name, 'User Recording'),
      file: ogSafeString(recordingLike.file, 'session://recording'),
      source: ogSafeString(recordingLike.source, 'User recording'),
      creator: ogSafeString(recordingLike.creator, 'Project user'),
      license: 'User Owned',
      attributionRequired: false,
      originalUrl: recordingLike.originalUrl || null,
      checksum: recordingLike.checksum || null,
      durationSec: recordingLike.durationSec,
      sizeBytes: recordingLike.sizeBytes,
      mimeType: recordingLike.mimeType,
      storage: recordingLike.dataUrl ? 'embedded' : 'session',
      dataUrl: recordingLike.dataUrl || null,
      localOnly: recordingLike.localOnly !== false,
      createdAt: recordingLike.createdAt,
      tags: tags
    });
  }

  function ogNormalizeProceduralVoice(voiceLike) {
    voiceLike = voiceLike || {};
    return {
      kitId: voiceLike.kitId ? ogSafeString(voiceLike.kitId, '') : null,
      kitName: voiceLike.kitName ? ogSafeString(voiceLike.kitName, '') : null,
      character: ogSafeString(voiceLike.character, 'studio'),
      pitch: ogClamp(voiceLike.pitch, 0.5, 2, 1),
      brightness: ogClamp(voiceLike.brightness, 0.35, 2.4, 1),
      decay: ogClamp(voiceLike.decay, 0.25, 2.5, 1),
      noise: ogClamp(voiceLike.noise, 0, 2, 1),
      click: ogClamp(voiceLike.click, 0, 2, 1),
      body: ogClamp(voiceLike.body, 0, 2, 1)
    };
  }
  function ogListFactorySampleKits() {
    return OG_FACTORY_SAMPLE_KITS.map(function (kit) {
      return ogClone(kit);
    });
  }

  function ogGetFactorySampleKit(kitId) {
    var id = String(kitId || '').trim();
    for (var i = 0; i < OG_FACTORY_SAMPLE_KITS.length; i++) {
      if (OG_FACTORY_SAMPLE_KITS[i].id === id) return ogClone(OG_FACTORY_SAMPLE_KITS[i]);
    }
    return null;
  }

  function ogFindFactoryAsset(project, kitId, padId) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    var kitTag = 'factory-kit:' + kitId;
    var padTag = 'pad:' + padId;
    for (var i = 0; i < assets.length; i++) {
      var tags = assets[i] && assets[i].tags || [];
      if (tags.indexOf('factory') >= 0 && tags.indexOf(kitTag) >= 0 && tags.indexOf(padTag) >= 0) return assets[i];
    }
    return null;
  }

  function ogInstallFactorySampleKit(project, trackId, kitId, options) {
    options = options || {};
    if (!project || !Array.isArray(project.assets)) throw new Error('OpenGroove: project is not ready');
    var track = ogFindTrack(project, trackId);
    if (!track || track.type !== 'drumRack') throw new Error('OpenGroove: drum rack track not found');
    var kit = ogGetFactorySampleKit(kitId) || ogGetFactorySampleKit(OG_FACTORY_SAMPLE_KITS[0].id);
    var created = [];
    var assigned = [];
    var reusedCount = 0;
    (kit.pads || []).forEach(function (slot) {
      var pad = ogFindPad(project, track.id, slot.padId);
      if (!pad) return;
      var proceduralVoice = ogNormalizeProceduralVoice(Object.assign({}, kit.voice || {}, slot.voice || {}, { kitId: kit.id, kitName: kit.name }));
      var asset = ogFindFactoryAsset(project, kit.id, slot.padId);
      if (asset) {
        reusedCount += 1;
      } else {
        var tags = ['factory', 'procedural', 'factory-kit:' + kit.id, 'pad:' + slot.padId, 'engine:' + slot.engine]
          .concat(Array.isArray(slot.tags) ? slot.tags : []);
        asset = ogAddAsset(project, {
          type: 'sample',
          name: ogSafeString(slot.name, pad.name),
          file: 'generated://open-groove/' + kit.id + '/' + slot.padId,
          source: kit.source,
          creator: kit.creator,
          license: kit.license,
          attributionRequired: false,
          originalUrl: kit.originalUrl,
          durationSec: slot.durationSec,
          sizeBytes: 0,
          mimeType: 'audio/procedural',
          storage: 'session',
          localOnly: false,
          createdAt: options.createdAt,
          tags: tags
        });
        created.push(asset);
      }
      asset.proceduralVoice = proceduralVoice;
      pad.assetId = asset.id;
      pad.engine = ogSafeString(slot.engine, pad.engine || 'sample');
      pad.name = asset.name;
      pad.gain = slot.gain == null ? pad.gain : ogClamp(slot.gain, 0, 1.5, pad.gain || 0.9);
      pad.pitch = slot.pitch == null ? pad.pitch || 0 : ogClamp(slot.pitch, -24, 24, 0);
      pad.proceduralVoice = ogClone(proceduralVoice);
      if (Object.prototype.hasOwnProperty.call(slot, 'chokeGroup')) pad.chokeGroup = slot.chokeGroup;
      else if (slot.engine === 'hihat' || slot.engine === 'openhat') pad.chokeGroup = 'hat';
      pad.sampleRegion = null;
      assigned.push({ padId: pad.id, assetId: asset.id, engine: pad.engine, name: pad.name, proceduralVoice: ogClone(proceduralVoice) });
    });
    return {
      kitId: kit.id,
      name: kit.name,
      license: kit.license,
      creator: kit.creator,
      createdCount: created.length,
      reusedCount: reusedCount,
      assignedCount: assigned.length,
      assetIds: assigned.map(function (item) { return item.assetId; }),
      assignments: assigned
    };
  }

  function ogNormalizeStemMode(mode) {
    var key = String(mode || 'four').toLowerCase();
    if (key === '2' || key === '2stem' || key === '2stems' || key === 'two') return 'two';
    if (key === '5' || key === '5stem' || key === '5stems' || key === 'five') return 'five';
    if (key === '6' || key === '6stem' || key === '6stems' || key === 'six') return 'six';
    return 'four';
  }

  function ogListStemTargets(mode) {
    return OG_STEM_TARGETS[ogNormalizeStemMode(mode)].slice();
  }

  function ogNormalizeStemEngine(engineId) {
    var key = String(engineId || 'external-demucs').toLowerCase().trim();
    if (key === 'manual' || key === 'manual-import' || key === 'import') return 'manual-import';
    if (key === 'demucs' || key === 'external-demucs') return 'external-demucs';
    if (key === 'spleeter' || key === 'external-spleeter') return 'external-spleeter';
    if (key === 'onnx' || key === 'webgpu' || key === 'browser-onnx') return 'browser-onnx';
    return OG_STEM_ENGINE_OPTIONS.some(function (engine) { return engine.id === key; }) ? key : 'external-demucs';
  }

  function ogFindStemEngine(engineId) {
    var normalized = ogNormalizeStemEngine(engineId);
    return OG_STEM_ENGINE_OPTIONS.filter(function (engine) { return engine.id === normalized; })[0] || OG_STEM_ENGINE_OPTIONS[1];
  }

  function ogBuildStemEngineReadiness(options) {
    options = options || {};
    var mode = ogNormalizeStemMode(options.mode);
    var engine = ogFindStemEngine(options.engineId || (mode === 'two' ? 'external-spleeter' : 'external-demucs'));
    var caps = options.capabilities || {};
    var cpuCores = Math.max(0, ogFinite(caps.cpuCores, 0));
    var memoryGb = Math.max(0, ogFinite(caps.memoryGb, 0));
    var gpuVramGb = Math.max(0, ogFinite(caps.gpuVramGb, 0));
    var localWorkerInstalled = !!(caps.localWorkerInstalled || caps.localWorkerReady || caps.workerReady);
    var webgpu = !!(caps.webgpu || caps.webGpu || caps.hasWebGpu);
    var requirements = [];
    var blockers = 0;
    var warnings = 0;

    function capabilityLabel(value, unit) {
      return value > 0 ? value + unit : 'Unknown';
    }

    function addRequirement(id, label, required, value, met, severity) {
      var item = {
        id: id,
        label: label,
        required: required,
        value: value,
        met: !!met,
        severity: severity || 'warning'
      };
      requirements.push(item);
      if (!item.met && item.severity === 'blocker') blockers += 1;
      if (!item.met && item.severity !== 'blocker') warnings += 1;
      return item;
    }

    if (engine.id === 'manual-import') {
      addRequirement('stem-files', 'Stem files', 'User-owned audio', 'Prepared lanes', true, 'info');
      return {
        engineId: engine.id,
        engineName: engine.name,
        mode: mode,
        tier: 'ready',
        tierLabel: 'Ready',
        optional: true,
        summary: 'Ready now: create named stem lanes and import or record your own audio.',
        estimate: { label: 'No ML processing', multiplierMin: 0, multiplierMax: 0 },
        requirements: requirements,
        engine: ogClone(engine)
      };
    }

    addRequirement('mode-support', 'Split support', engine.modes.join(', '), mode, engine.modes.indexOf(mode) !== -1, 'blocker');

    if (engine.id === 'browser-onnx') {
      addRequirement('webgpu', 'WebGPU', 'Available browser GPU', webgpu ? 'Available' : 'Not available', webgpu, 'blocker');
      addRequirement('memory', 'Memory', '8 GB recommended', capabilityLabel(memoryGb, ' GB'), memoryGb >= 8, 'warning');
      if (mode === 'five' || mode === 'six') addRequirement('large-model', 'Model size', '2 or 4 stems', mode + '-stem selected', false, 'warning');
    } else {
      addRequirement('local-worker', 'Local worker', 'Installed', localWorkerInstalled ? 'Installed' : 'Not installed', localWorkerInstalled, 'blocker');
      addRequirement('cpu', 'CPU', '4+ cores', capabilityLabel(cpuCores, ' cores'), cpuCores >= 4, 'warning');
      addRequirement('memory', 'Memory', engine.id === 'external-demucs' ? '8+ GB' : '6+ GB', capabilityLabel(memoryGb, ' GB'), memoryGb >= (engine.id === 'external-demucs' ? 8 : 6), 'warning');
      if (engine.id === 'external-demucs') {
        addRequirement('gpu', 'GPU VRAM', '8+ GB preferred', capabilityLabel(gpuVramGb, ' GB'), gpuVramGb >= 8, 'warning');
      }
    }

    var tier = blockers ? 'blocked' : warnings ? 'warning' : 'ready';
    return {
      engineId: engine.id,
      engineName: engine.name,
      mode: mode,
      tier: tier,
      tierLabel: tier === 'ready' ? 'Ready' : tier === 'blocked' ? 'Needs setup' : 'Usable with cautions',
      optional: true,
      summary: tier === 'ready'
        ? 'Ready for optional stem processing.'
        : tier === 'blocked'
          ? 'Keep using manual stem lanes until the missing setup is available.'
          : 'This can run, but expect slower processing or quality limits.',
      estimate: engine.id === 'external-demucs'
        ? { label: 'Often near track length on a strong GPU; slower on CPU', multiplierMin: 1, multiplierMax: 8 }
        : engine.id === 'external-spleeter'
          ? { label: 'Usually faster baseline separation when the worker is installed', multiplierMin: 0.25, multiplierMax: 2 }
          : { label: 'Browser model downloads and memory can dominate runtime', multiplierMin: 1, multiplierMax: 10 },
      requirements: requirements,
      engine: ogClone(engine)
    };
  }

  function ogBuildStemSeparationPlan(project, options) {
    options = options || {};
    var mode = ogNormalizeStemMode(options.mode);
    var targets = ogListStemTargets(mode);
    var engineId = options.engineId ? ogNormalizeStemEngine(options.engineId) : (mode === 'two' ? 'external-spleeter' : 'external-demucs');
    var sourceAsset = options.sourceAssetId ? ogFindAsset(project, options.sourceAssetId) : null;
    var license = sourceAsset ? ogSafeString(sourceAsset.license, 'Unknown') : ogSafeString(options.license, 'User Owned');
    var rightsSafe = !!options.userConfirmedRights || license === 'User Owned' || license === 'Original' || license === 'CC0-1.0' || license === 'Public Domain';
    var warnings = [];
    if (!rightsSafe) warnings.push('Confirm rights before separating or exporting stems from this source.');
    if (!sourceAsset) warnings.push('No source mix asset is attached yet; this plan can prepare stem slots for later import.');
    return {
      mode: mode,
      label: targets.length + '-stem',
      targets: targets,
      sourceAssetId: sourceAsset && sourceAsset.id || null,
      sourceName: sourceAsset && sourceAsset.name || ogSafeString(options.sourceName, 'Source mix'),
      rightsSafe: rightsSafe,
      warnings: warnings,
      recommendedEngineId: engineId,
      readiness: ogBuildStemEngineReadiness({ engineId: engineId, mode: mode, capabilities: options.capabilities }),
      engines: OG_STEM_ENGINE_OPTIONS.map(function (engine) { return ogClone(engine); })
    };
  }

  function ogPrepareStemSlots(project, options) {
    options = options || {};
    var plan = ogBuildStemSeparationPlan(project, options);
    var groupId = options.groupId || ogMintId(project, 'asset') + '_stems';
    var created = [];
    plan.targets.forEach(function (target) {
      var asset = ogRegisterUserRecording(project, {
        name: ogSafeString(options.prefix, plan.sourceName) + ' - ' + target,
        file: 'session://stem/' + groupId + '/' + target,
        source: 'Prepared stem slot',
        creator: 'Project user',
        durationSec: options.durationSec || 0,
        sizeBytes: 0,
        mimeType: 'audio/*',
        createdAt: options.createdAt,
        tags: ['stem', target, plan.mode + '-stem']
      });
      asset.type = 'loop';
      asset.stemRole = target;
      asset.stemGroupId = groupId;
      asset.stemSourceAssetId = plan.sourceAssetId;
      asset.stemEngine = plan.recommendedEngineId;
      asset.stemConfidence = 0;
      created.push(asset);
    });
    return {
      groupId: groupId,
      plan: plan,
      assets: created
    };
  }

  function ogBuildStemAssetSummary(project) {
    var groups = {};
    (project && project.assets || []).forEach(function (asset) {
      if (!asset || !asset.stemRole) return;
      var groupId = asset.stemGroupId || 'ungrouped';
      if (!groups[groupId]) groups[groupId] = { groupId: groupId, assets: [], roles: {}, readyCount: 0 };
      groups[groupId].assets.push(asset);
      groups[groupId].roles[asset.stemRole] = asset.id;
      if (asset.dataUrl || asset.sizeBytes || asset.storage === 'external') groups[groupId].readyCount += 1;
    });
    return Object.keys(groups).map(function (groupId) {
      var group = groups[groupId];
      group.count = group.assets.length;
      group.rolesList = Object.keys(group.roles).sort();
      return group;
    });
  }

  function ogEmbedAssetData(project, assetId, dataUrl, metadata) {
    var asset = ogFindAsset(project, assetId);
    if (!asset) throw new Error('OpenGroove: asset not found');
    if (!ogIsSafeAudioDataUrl(dataUrl)) throw new Error('OpenGroove: embedded sample must be an audio data URL');
    metadata = metadata || {};
    asset.dataUrl = String(dataUrl).trim();
    asset.storage = 'embedded';
    asset.sizeBytes = metadata.sizeBytes != null ? Math.max(0, ogInt(metadata.sizeBytes, 0)) : ogEstimateDataUrlBytes(asset.dataUrl);
    if (metadata.mimeType) asset.mimeType = ogSafeString(metadata.mimeType, asset.mimeType || 'audio/*');
    if (metadata.durationSec != null) asset.durationSec = Math.max(0, ogFinite(metadata.durationSec, asset.durationSec || 0));
    return asset;
  }

  function ogAssignAssetToPad(project, trackId, padId, assetId) {
    var track = ogFindTrack(project, trackId);
    var asset = ogFindAsset(project, assetId);
    if (!track || track.type !== 'drumRack') throw new Error('OpenGroove: drum rack track not found');
    if (!asset) throw new Error('OpenGroove: asset not found');
    var pad = ogFindPad(project, trackId, padId);
    if (!pad) throw new Error('OpenGroove: pad not found');
    pad.assetId = asset.id;
    pad.engine = 'sample';
    pad.name = asset.name;
    pad.proceduralVoice = asset.proceduralVoice ? ogClone(asset.proceduralVoice) : null;
    return pad;
  }

  function ogSetPadSampleRegion(project, trackId, padId, regionLike) {
    var pad = ogFindPad(project, trackId, padId);
    if (!pad) throw new Error('OpenGroove: pad not found');
    var asset = ogFindAsset(project, pad.assetId);
    if (!asset) throw new Error('OpenGroove: asset not found');
    pad.sampleRegion = regionLike ? ogNormalizeSampleRegion(asset, regionLike) : null;
    return pad;
  }

  function ogChopAssetToPads(project, trackId, assetId, options) {
    options = options || {};
    var track = ogFindTrack(project, trackId);
    var asset = ogFindAsset(project, assetId);
    if (!track || track.type !== 'drumRack') throw new Error('OpenGroove: drum rack track not found');
    if (!asset) throw new Error('OpenGroove: asset not found');
    var slices = Math.max(1, Math.min(16, ogInt(options.slices, 4)));
    var startIndex = Math.max(0, Math.min((track.pads || []).length - 1, ogInt(options.startPadIndex, 0)));
    if (options.startPadId) {
      for (var p = 0; p < (track.pads || []).length; p++) {
        if (track.pads[p].id === options.startPadId) {
          startIndex = p;
          break;
        }
      }
    }
    var sourceStart = Math.max(0, ogFinite(options.startSec, 0));
    var sourceEnd = ogFinite(options.endSec, asset.durationSec || sourceStart + 1);
    if (sourceEnd <= sourceStart) sourceEnd = sourceStart + Math.max(0.25, asset.durationSec || 1);
    var span = Math.max(0.001, sourceEnd - sourceStart);
    var pads = [];
    for (var i = 0; i < slices && startIndex + i < (track.pads || []).length; i++) {
      var sliceStart = sourceStart + span * i / slices;
      var sliceEnd = sourceStart + span * (i + 1) / slices;
      var pad = track.pads[startIndex + i];
      pad.assetId = asset.id;
      pad.engine = 'sample';
      pad.name = asset.name + ' ' + (i + 1);
      pad.proceduralVoice = asset.proceduralVoice ? ogClone(asset.proceduralVoice) : null;
      pad.sampleRegion = ogNormalizeSampleRegion(asset, {
        startSec: sliceStart,
        endSec: sliceEnd,
        label: 'Slice ' + (i + 1)
      });
      pads.push(pad);
    }
    return pads;
  }

  function ogBuildLicenseReport(project) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    var summary = {};
    var warnings = [];
    assets.forEach(function (asset) {
      var license = ogSafeString(asset.license, 'Unknown');
      summary[license] = (summary[license] || 0) + 1;
      if (asset.attributionRequired || OG_REVIEW_LICENSES[license]) {
        warnings.push(asset.name + ' requires attribution (' + license + ').');
      } else if (!OG_SAFE_LICENSES[license]) {
        if (OG_REVIEW_LICENSES[license]) warnings.push(asset.name + ' requires attribution (' + license + ').');
        else warnings.push(asset.name + ' has an export-risk license (' + license + ').');
      }
    });
    return {
      assetCount: assets.length,
      summary: summary,
      exportSafe: warnings.length === 0,
      warnings: warnings
    };
  }

  function ogBuildAttributionText(project) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    var lines = [];
    assets.forEach(function (asset) {
      var license = ogSafeString(asset.license, 'Unknown');
      if (!asset.attributionRequired && !OG_REVIEW_LICENSES[license]) return;
      var creator = ogSafeString(asset.creator, 'Unknown creator');
      var source = asset.originalUrl || asset.source || 'No source URL';
      lines.push(asset.name + ' by ' + creator + ' - ' + license + ' - ' + source);
    });
    if (!lines.length) return 'No attribution-required assets.';
    return ['Attribution notes for ' + ogSafeString(project && project.title, 'Open Groove project') + ':'].concat(lines.map(function (line) { return '- ' + line; })).join('\n');
  }

  function ogBuildProjectStorageReport(project) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    var embeddedCount = 0;
    var embeddedBytes = 0;
    var sessionCount = 0;
    var externalCount = 0;
    var factoryCount = 0;
    var proceduralCount = 0;
    var slicedPadCount = 0;
    var humanizedHitCount = 0;
    var grooveHitCount = 0;
    assets.forEach(function (asset) {
      var tags = asset && asset.tags || [];
      if (tags.indexOf('factory') >= 0) factoryCount += 1;
      if (asset && asset.mimeType === 'audio/procedural') proceduralCount += 1;
      if (asset.storage === 'embedded' || asset.dataUrl) {
        embeddedCount += 1;
        embeddedBytes += asset.sizeBytes || ogEstimateDataUrlBytes(asset.dataUrl);
      } else if (asset.storage === 'session') {
        sessionCount += 1;
      } else {
        externalCount += 1;
      }
    });
    (project && project.tracks || []).forEach(function (track) {
      (track && track.pads || []).forEach(function (pad) {
        if (pad.assetId && pad.sampleRegion) slicedPadCount += 1;
      });
    });
    (project && project.patterns || []).forEach(function (pattern) {
      (pattern.events || []).forEach(function (event) {
        if (event.type === 'drumHit' && ogInt(event.microtimingTicks, 0) !== 0) humanizedHitCount += 1;
        if (event.type === 'drumHit' && event.role === 'groove') grooveHitCount += 1;
      });
    });
    return {
      assetCount: assets.length,
      embeddedCount: embeddedCount,
      embeddedBytes: embeddedBytes,
      sessionCount: sessionCount,
      externalCount: externalCount,
      factoryCount: factoryCount,
      proceduralCount: proceduralCount,
      slicedPadCount: slicedPadCount,
      humanizedHitCount: humanizedHitCount,
      grooveHitCount: grooveHitCount
    };
  }

  function ogBuildOnboardingStatus(project, patternId) {
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    var events = pattern && Array.isArray(pattern.events) ? pattern.events : [];
    var hasBeat = events.some(function (event) { return event.type === 'drumHit'; });
    var hasHarmony = events.some(function (event) { return event.type === 'note' || event.type === 'chord'; });
    var hasVariation = (project && project.patterns || []).length > 1;
    var timeline = ogBuildArrangementTimeline(project);
    var hasSong = timeline.length > 0 && timeline.some(function (section) { return section.patternIds.length > 0; });
    var hasSample = false;
    (project && project.tracks || []).forEach(function (track) {
      (track && track.pads || []).forEach(function (pad) {
        if (pad.assetId) hasSample = true;
      });
    });
    var validation = ogValidateProject(project);
    var license = ogBuildLicenseReport(project);
    return {
      beatReady: hasBeat,
      harmonyReady: hasHarmony,
      variationReady: hasVariation,
      songReady: hasSong,
      sampleReady: hasSample,
      exportReady: validation.length === 0 && license.exportSafe,
      completed: [hasBeat, hasHarmony, hasVariation, hasSong, hasSample, validation.length === 0 && license.exportSafe].filter(Boolean).length,
      total: 6
    };
  }

  function ogBuildOnboardingGuidance(project, patternId) {
    var status = ogBuildOnboardingStatus(project, patternId);
    var steps = [
      { stepId: 'beat', title: 'Beat', description: 'Build a rhythmic foundation.', actionId: 'beat', actionLabel: 'Make Beat', ready: status.beatReady },
      { stepId: 'harmony', title: 'Harmony', description: 'Add a chord bed or melodic notes.', actionId: 'harmony', actionLabel: 'Add Harmony', ready: status.harmonyReady },
      { stepId: 'variation', title: 'Variation', description: 'Create a second pattern for contrast.', actionId: 'variation', actionLabel: 'New Variation', ready: status.variationReady },
      { stepId: 'song', title: 'Song', description: 'Place the current pattern in the song timeline.', actionId: 'song', actionLabel: 'Add Section', ready: status.songReady },
      { stepId: 'sample', title: 'Sample', description: 'Assign an owned or recorded sound to a pad.', actionId: 'sample', actionLabel: 'Owned Slot', ready: status.sampleReady },
      { stepId: 'export', title: 'Export', description: 'Prepare a shareable project file.', actionId: 'export', actionLabel: 'Prepare JSON', ready: status.exportReady }
    ];
    for (var i = 0; i < steps.length; i++) {
      if (!steps[i].ready) {
        return Object.assign({
          completed: false,
          completedCount: status.completed,
          total: status.total
        }, steps[i]);
      }
    }
    return {
      stepId: 'complete',
      title: 'Session Ready',
      description: 'All starter checkpoints are ready.',
      actionId: 'export',
      actionLabel: 'Prepare JSON',
      ready: true,
      completed: true,
      completedCount: status.completed,
      total: status.total
    };
  }

  function ogValidateProject(project) {
    var errors = [];
    if (!project || typeof project !== 'object') return ['Project is not an object.'];
    if (project.format !== OG_FORMAT) errors.push('Not an Open Groove project.');
    if (ogInt(project.schemaVersion, 0) > OG_VERSION) errors.push('Project was saved by a newer Open Groove version.');
    if (!Array.isArray(project.tracks)) errors.push('Tracks must be an array.');
    if (!Array.isArray(project.patterns)) errors.push('Patterns must be an array.');
    if (project.scenes != null && !Array.isArray(project.scenes)) errors.push('Scenes must be an array.');
    if (project.arrangement != null && !Array.isArray(project.arrangement)) errors.push('Arrangement must be an array.');
    if (!(ogFinite(project.bpm, 0) >= 20 && ogFinite(project.bpm, 0) <= 400)) errors.push('BPM is outside the supported range.');
    if (!Array.isArray(project.timeSignature) || project.timeSignature.length < 2) errors.push('Time signature is missing.');

    var trackIds = {};
    (project.tracks || []).forEach(function (track) {
      if (!track || !track.id) errors.push('Track is missing an id.');
      else if (trackIds[track.id]) errors.push('Duplicate track id: ' + track.id);
      else trackIds[track.id] = true;
      (track && track.pads || []).forEach(function (pad) {
        if (pad.assetId && !ogFindAsset(project, pad.assetId)) errors.push('Pad ' + pad.id + ' references an unknown asset.');
        if (pad.sampleRegion) {
          if (ogFinite(pad.sampleRegion.startSec, -1) < 0) errors.push('Pad ' + pad.id + ' has an invalid sample start.');
          if (ogFinite(pad.sampleRegion.endSec, 0) <= ogFinite(pad.sampleRegion.startSec, 0)) errors.push('Pad ' + pad.id + ' has an invalid sample end.');
        }
      });
    });

    var assetIds = {};
    (project.assets || []).forEach(function (asset) {
      if (!asset || !asset.id) errors.push('Asset is missing an id.');
      else if (assetIds[asset.id]) errors.push('Duplicate asset id: ' + asset.id);
      else assetIds[asset.id] = true;
      if (asset && asset.dataUrl && !ogIsSafeAudioDataUrl(asset.dataUrl)) errors.push('Asset ' + asset.id + ' has an unsafe embedded audio URL.');
      if (asset && asset.storage === 'embedded' && !asset.dataUrl) errors.push('Asset ' + asset.id + ' is marked embedded without embedded data.');
    });

    var patternIds = {};
    (project.patterns || []).forEach(function (pattern) {
      if (!pattern || !pattern.id) errors.push('Pattern is missing an id.');
      else if (patternIds[pattern.id]) errors.push('Duplicate pattern id: ' + pattern.id);
      else patternIds[pattern.id] = true;
      if (!Array.isArray(pattern.events)) errors.push('Pattern ' + (pattern && pattern.id || '?') + ' events must be an array.');
      var length = ogPatternLengthTicks(project, pattern || { bars: 1 });
      (pattern.events || []).forEach(function (event) {
        if (!event.id) errors.push('Event is missing an id.');
        if (!trackIds[event.trackId]) errors.push('Event ' + event.id + ' references an unknown track.');
        if (ogInt(event.startTick, -1) < 0 || ogInt(event.startTick, -1) >= length) errors.push('Event ' + event.id + ' starts outside its pattern.');
        if (event.velocity != null && (event.velocity < 0 || event.velocity > 1)) errors.push('Event ' + event.id + ' has invalid velocity.');
        if (event.type === 'note' && event.notation && ogInt(event.notation.durationTicks, 0) <= 0) errors.push('Event ' + event.id + ' has invalid notation duration.');
        if (event.type === 'audioRegion' && event.assetId && !assetIds[event.assetId]) errors.push('Event ' + event.id + ' references an unknown asset.');
      });
    });

    var sceneIds = {};
    (Array.isArray(project.scenes) ? project.scenes : []).forEach(function (scene) {
      if (!scene || !scene.id) errors.push('Scene is missing an id.');
      else if (sceneIds[scene.id]) errors.push('Duplicate scene id: ' + scene.id);
      else sceneIds[scene.id] = true;
      if (!Array.isArray(scene && scene.patternIds)) errors.push('Scene ' + (scene && scene.id || '?') + ' pattern list must be an array.');
      (scene && scene.patternIds || []).forEach(function (patternId) {
        if (!patternIds[patternId]) errors.push('Scene ' + scene.id + ' references an unknown pattern.');
      });
    });

    (Array.isArray(project.arrangement) ? project.arrangement : []).forEach(function (section, index) {
      if (!section || !sceneIds[section.sceneId]) errors.push('Arrangement section ' + (index + 1) + ' references an unknown scene.');
      if (section && ogInt(section.startBar, 0) < 1) errors.push('Arrangement section ' + (index + 1) + ' must start at bar 1 or later.');
      if (section && ogInt(section.bars, 0) < 1) errors.push('Arrangement section ' + (index + 1) + ' must last at least 1 bar.');
    });

    return errors;
  }

  function ogSerializeProject(project, options) {
    options = options || {};
    var output = project;
    if (options.includeEmbeddedAudio === false) {
      output = ogClone(project);
      (output.assets || []).forEach(function (asset) {
        if (asset.dataUrl) {
          asset.dataUrl = null;
          asset.storage = asset.storage === 'embedded' ? 'session' : asset.storage;
          asset.embeddedAudioOmitted = true;
        }
      });
    }
    return JSON.stringify(output, null, 2);
  }

  function ogParseProject(text) {
    var parsed = JSON.parse(String(text || '{}'));
    var errors = ogValidateProject(parsed);
    if (errors.length) throw new Error(errors.join(' '));
    return parsed;
  }

  function ogMakeDemoProject(options) {
    var project = ogCreateProject(Object.assign({ title: 'Milestone 0 Groove', bpm: 92, swing: 0.08 }, options || {}));
    var drums = project.tracks.find(function (track) { return track.type === 'drumRack'; });
    var synth = project.tracks.find(function (track) { return track.type === 'synth'; });
    var pattern = project.patterns[0];
    var stepsPerBar = 16;
    for (var bar = 0; bar < pattern.bars; bar++) {
      var base = bar * stepsPerBar;
      ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', base + 0, stepsPerBar, { on: true, velocity: 0.95 });
      ogSetDrumStep(project, pattern.id, drums.id, 'pad_1', base + 8, stepsPerBar, { on: true, velocity: 0.85 });
      ogSetDrumStep(project, pattern.id, drums.id, 'pad_2', base + 4, stepsPerBar, { on: true, velocity: 0.9 });
      ogSetDrumStep(project, pattern.id, drums.id, 'pad_2', base + 12, stepsPerBar, { on: true, velocity: 0.88 });
      for (var h = 0; h < 16; h += 2) {
        ogSetDrumStep(project, pattern.id, drums.id, 'pad_3', base + h, stepsPerBar, { on: true, velocity: h % 4 === 0 ? 0.5 : 0.35 });
      }
    }
    var measure = ogTicksPerMeasure(project);
    var roots = ['C2', 'Eb2', 'Bb1', 'G1'];
    roots.forEach(function (pitch, i) {
      ogAppendEvent(project, pattern.id, {
        type: 'note',
        trackId: synth.id,
        pitch: pitch,
        startTick: i * measure,
        durationTicks: Math.round(measure * 0.75),
        velocity: 0.78,
        notationStartTick: i * measure,
        notationDurationTicks: Math.round(measure * 0.75)
      });
    });
    return project;
  }

  var api = {
    OG_FORMAT: OG_FORMAT,
    OG_VERSION: OG_VERSION,
    OG_DEFAULT_PPQ: OG_DEFAULT_PPQ,
    OG_LEARNING_TOOL_META: ogClone(OG_LEARNING_TOOL_META),
    OG_LEARNING_GOALS: ogClone(OG_LEARNING_GOALS),
    OG_SAFE_LICENSES: ogClone(OG_SAFE_LICENSES),
    OG_SCALE_INTERVALS: ogClone(OG_SCALE_INTERVALS),
    OG_CHORD_INTERVALS: ogClone(OG_CHORD_INTERVALS),
    OG_SYNTH_PATCH_PRESETS: ogListSynthPatchPresets(),
    OG_FACTORY_SAMPLE_KITS: ogListFactorySampleKits(),
    OG_EFFECT_PRESETS: ogListEffectPresets(),
    OG_AUTOMATION_TARGETS: ogListAutomationTargets(),
    OG_SONG_FORM_PRESETS: ogListSongFormPresets(),
    OG_MELODY_PHRASE_STYLES: ogListMelodyPhraseStyles(),
    OG_DRUM_GROOVE_STYLES: ogListDrumGrooveStyles(),
    ogClone: ogClone,
    ogCreateProject: ogCreateProject,
    ogAddTrack: ogAddTrack,
    ogAddPattern: ogAddPattern,
    ogFindTrack: ogFindTrack,
    ogFindPattern: ogFindPattern,
    ogFindAsset: ogFindAsset,
    ogFindPad: ogFindPad,
    ogTicksPerBeat: ogTicksPerBeat,
    ogTicksPerMeasure: ogTicksPerMeasure,
    ogPatternLengthTicks: ogPatternLengthTicks,
    ogBarsToTicks: ogBarsToTicks,
    ogTickToPosition: ogTickToPosition,
    ogQuantizeTick: ogQuantizeTick,
    ogNoteNameToMidi: ogNoteNameToMidi,
    ogMidiToNoteName: ogMidiToNoteName,
    ogBuildKeyboardLayout: ogBuildKeyboardLayout,
    ogBuildKeyboardChord: ogBuildKeyboardChord,
    ogFrequencyFromMidi: ogFrequencyFromMidi,
    ogFrequencyFromPitch: ogFrequencyFromPitch,
    ogParsePitchSpelling: ogParsePitchSpelling,
    ogPitchClassFromName: ogPitchClassFromName,
    ogIsSafeAudioDataUrl: ogIsSafeAudioDataUrl,
    ogEstimateDataUrlBytes: ogEstimateDataUrlBytes,
    ogBuildScale: ogBuildScale,
    ogBuildChord: ogBuildChord,
    ogModeDisplayName: ogModeDisplayName,
    ogScaleDegreeForPitch: ogScaleDegreeForPitch,
    ogDescribeChordInKey: ogDescribeChordInKey,
    ogBuildCompositionNomenclature: ogBuildCompositionNomenclature,
    ogNotationDurationTicks: ogNotationDurationTicks,
    ogParseNotationInput: ogParseNotationInput,
    ogWriteNotationInput: ogWriteNotationInput,
    ogBuildStaffEngraving: ogBuildStaffEngraving,
    ogSetStaffNote: ogSetStaffNote,
    ogNormalizeSynthInstrument: ogNormalizeSynthInstrument,
    ogListSynthPatchPresets: ogListSynthPatchPresets,
    ogListSynthPatchFamilies: ogListSynthPatchFamilies,
    ogBuildInstrumentProfile: ogBuildInstrumentProfile,
    ogListInstrumentProfiles: ogListInstrumentProfiles,
    ogGetSynthPatchPreset: ogGetSynthPatchPreset,
    ogSetSynthInstrument: ogSetSynthInstrument,
    ogApplySynthPatchPreset: ogApplySynthPatchPreset,
    ogRandomizeSynthInstrument: ogRandomizeSynthInstrument,
    ogBuildSynthPatchSummary: ogBuildSynthPatchSummary,
    ogListEffectPresets: ogListEffectPresets,
    ogListAutomationTargets: ogListAutomationTargets,
    ogNormalizeAutomationValue: ogNormalizeAutomationValue,
    ogNormalizeEffect: ogNormalizeEffect,
    ogGetTrackEffects: ogGetTrackEffects,
    ogBuildEffectRack: ogBuildEffectRack,
    ogSetTrackEffect: ogSetTrackEffect,
    ogBuildAutomationLane: ogBuildAutomationLane,
    ogBuildAutomationSnapshot: ogBuildAutomationSnapshot,
    ogResolveAutomationValueAtTick: ogResolveAutomationValueAtTick,
    ogSetAutomationPoint: ogSetAutomationPoint,
    ogResolveTrackEffectsAtTick: ogResolveTrackEffectsAtTick,
    ogResolveMixerChannelAtTick: ogResolveMixerChannelAtTick,
    ogGetMixerChannel: ogGetMixerChannel,
    ogSetMixerChannel: ogSetMixerChannel,
    ogAnyMixerSolo: ogAnyMixerSolo,
    ogTrackIsAudible: ogTrackIsAudible,
    ogBuildMixerSnapshot: ogBuildMixerSnapshot,
    ogAppendEvent: ogAppendEvent,
    ogRemoveEvent: ogRemoveEvent,
    ogSetDrumStep: ogSetDrumStep,
    ogSetNoteStep: ogSetNoteStep,
    ogClearPadEvents: ogClearPadEvents,
    ogAccentPadEvents: ogAccentPadEvents,
    ogHumanizeDrumEvents: ogHumanizeDrumEvents,
    ogDuplicatePattern: ogDuplicatePattern,
    ogFindScene: ogFindScene,
    ogSceneLengthBars: ogSceneLengthBars,
    ogAddScene: ogAddScene,
    ogSetScenePatterns: ogSetScenePatterns,
    ogNextArrangementStartBar: ogNextArrangementStartBar,
    ogAddArrangementSection: ogAddArrangementSection,
    ogListSongFormPresets: ogListSongFormPresets,
    ogApplySongFormPreset: ogApplySongFormPreset,
    ogBuildArrangementTimeline: ogBuildArrangementTimeline,
    ogBuildPatternLauncher: ogBuildPatternLauncher,
    ogClearBar: ogClearBar,
    ogCopyBar: ogCopyBar,
    ogClearTrackEvents: ogClearTrackEvents,
    ogApplyChordProgression: ogApplyChordProgression,
    ogListDrumGrooveStyles: ogListDrumGrooveStyles,
    ogNormalizeDrumGrooveStyle: ogNormalizeDrumGrooveStyle,
    ogWriteDrumGroove: ogWriteDrumGroove,
    ogListMelodyPhraseStyles: ogListMelodyPhraseStyles,
    ogNormalizeMelodyPhraseStyle: ogNormalizeMelodyPhraseStyle,
    ogWriteMelodyPhrase: ogWriteMelodyPhrase,
    OG_STEM_TARGETS: OG_STEM_TARGETS,
    OG_STEM_ENGINE_OPTIONS: OG_STEM_ENGINE_OPTIONS,
    ogNormalizeStemMode: ogNormalizeStemMode,
    ogNormalizeStemEngine: ogNormalizeStemEngine,
    ogListStemTargets: ogListStemTargets,
    ogBuildStemEngineReadiness: ogBuildStemEngineReadiness,
    ogBuildStemSeparationPlan: ogBuildStemSeparationPlan,
    ogPrepareStemSlots: ogPrepareStemSlots,
    ogBuildStemAssetSummary: ogBuildStemAssetSummary,
    ogAddAsset: ogAddAsset,
    ogRegisterUserRecording: ogRegisterUserRecording,
    ogListFactorySampleKits: ogListFactorySampleKits,
    ogGetFactorySampleKit: ogGetFactorySampleKit,
    ogInstallFactorySampleKit: ogInstallFactorySampleKit,
    ogEmbedAssetData: ogEmbedAssetData,
    ogAssignAssetToPad: ogAssignAssetToPad,
    ogSetPadSampleRegion: ogSetPadSampleRegion,
    ogChopAssetToPads: ogChopAssetToPads,
    ogNormalizeSampleRegion: ogNormalizeSampleRegion,
    ogBuildLicenseReport: ogBuildLicenseReport,
    ogBuildAttributionText: ogBuildAttributionText,
    ogBuildProjectStorageReport: ogBuildProjectStorageReport,
    ogBuildOnboardingStatus: ogBuildOnboardingStatus,
    ogBuildOnboardingGuidance: ogBuildOnboardingGuidance,
    ogBuildNotationPreview: ogBuildNotationPreview,
    ogBuildNotationGridBridge: ogBuildNotationGridBridge,
    ogBuildMusicXmlSketch: ogBuildMusicXmlSketch,
    ogBuildMidiFile: ogBuildMidiFile,
    ogBuildArrangementMidiFile: ogBuildArrangementMidiFile,
    ogPadToMidiDrum: ogPadToMidiDrum,
    ogValidateProject: ogValidateProject,
    ogSerializeProject: ogSerializeProject,
    ogParseProject: ogParseProject,
    ogMakeDemoProject: ogMakeDemoProject,
    ogCreateDefaultPads: ogCreateDefaultPads
  };

  root.OpenGrooveCore = api;
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.OpenGrooveCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
