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
  var OG_SYNTH_PATCH_PRESETS = [
    {
      id: 'warmBass',
      name: 'Warm Bass',
      role: 'bass',
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
      instrument: {
        name: 'Glass Pluck',
        presetId: 'glassPluck',
        oscillator: 'triangle',
        filter: { type: 'bandpass', cutoff: 3600, q: 4.2 },
        envelope: { attack: 0.003, decay: 0.18, sustain: 0.08, release: 0.42 }
      }
    }
  ];
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
      effects: Array.isArray(options.effects) ? ogClone(options.effects) : []
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

  function ogNormalizeVelocity(value) {
    return ogClamp(value, 0, 1, 0.8);
  }

  function ogNormalizeSynthInstrument(instrumentLike) {
    instrumentLike = instrumentLike || {};
    var filter = instrumentLike.filter || {};
    var envelope = instrumentLike.envelope || {};
    var presetId = String(instrumentLike.presetId == null ? '' : instrumentLike.presetId).trim();
    var osc = instrumentLike.oscillator === 'sine' || instrumentLike.oscillator === 'triangle' || instrumentLike.oscillator === 'square' || instrumentLike.oscillator === 'sawtooth'
      ? instrumentLike.oscillator
      : 'sawtooth';
    var filterType = filter.type === 'highpass' || filter.type === 'bandpass' || filter.type === 'notch' ? filter.type : 'lowpass';
    return {
      engine: 'subtractive',
      name: ogSafeString(instrumentLike.name, presetId ? 'Preset Patch' : 'Custom Patch'),
      presetId: presetId || null,
      oscillator: osc,
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
      oscillator: patch.oscillator,
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
      event.target = ogSafeString(eventLike.target, '');
      event.value = ogFinite(eventLike.value, 0);
      event.curve = eventLike.curve === 'hold' || eventLike.curve === 'linear' ? eventLike.curve : 'linear';
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

  function ogBuildMidiFile(project, patternId) {
    var pattern = ogFindPattern(project, patternId || (project && project.patterns && project.patterns[0] && project.patterns[0].id));
    if (!pattern) throw new Error('OpenGroove: pattern not found');
    var ppq = Math.max(24, Math.min(32767, ogTicksPerBeat(project)));
    var bpm = Math.max(20, Math.min(400, ogFinite(project && project.bpm, OG_DEFAULT_BPM)));
    var tempo = Math.round(60000000 / bpm);
    var ts = Array.isArray(project.timeSignature) ? project.timeSignature : [4, 4];
    var denominator = Math.max(1, ogInt(ts[1], 4));
    var denominatorPower = 0;
    while (Math.pow(2, denominatorPower) < denominator && denominatorPower < 8) denominatorPower += 1;
    var patternLength = ogPatternLengthTicks(project, pattern);
    var events = [];

    function add(tick, order, bytes) {
      events.push({ tick: Math.max(0, Math.min(patternLength, ogInt(tick, 0))), order: order, bytes: bytes });
    }

    add(0, 0, [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]);
    add(0, 1, [0xff, 0x58, 0x04, Math.max(1, ogInt(ts[0], 4)), denominatorPower, 24, 8]);

    (pattern.events || []).forEach(function (event) {
      if (event.type === 'note') {
        var midi = Math.max(0, Math.min(127, ogInt(event.midi != null ? event.midi : ogNoteNameToMidi(event.pitch), 60)));
        var start = ogInt(event.startTick, 0);
        var end = Math.min(patternLength, start + Math.max(1, ogInt(event.durationTicks, ppq)));
        add(start, 4, [0x90, midi, ogMidiVelocity(event.velocity)]);
        add(end, 2, [0x80, midi, 0]);
      } else if (event.type === 'drumHit') {
        var drum = ogPadToMidiDrum(event.padId);
        var drumStart = ogInt(event.startTick, 0) + ogInt(event.microtimingTicks, 0);
        var drumEnd = Math.min(patternLength, drumStart + Math.max(24, Math.round(ppq / 12)));
        add(drumStart, 5, [0x99, drum, ogMidiVelocity(event.velocity)]);
        add(drumEnd, 3, [0x89, drum, 0]);
      }
    });

    events.sort(function (a, b) {
      return (a.tick - b.tick) || (a.order - b.order);
    });

    var trackBytes = [];
    var lastTick = 0;
    events.forEach(function (event) {
      trackBytes = trackBytes.concat(ogVarLenBytes(event.tick - lastTick), event.bytes);
      lastTick = event.tick;
    });
    trackBytes = trackBytes.concat([0x00, 0xff, 0x2f, 0x00]);

    var fileBytes = []
      .concat(ogTextBytes('MThd'), ogUint32Bytes(6), ogUint16Bytes(0), ogUint16Bytes(1), ogUint16Bytes(ppq))
      .concat(ogTextBytes('MTrk'), ogUint32Bytes(trackBytes.length), trackBytes);
    return new Uint8Array(fileBytes);
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
    project.arrangement.push(section);
    return section;
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
    var slicedPadCount = 0;
    var humanizedHitCount = 0;
    var grooveHitCount = 0;
    assets.forEach(function (asset) {
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
    ogFrequencyFromMidi: ogFrequencyFromMidi,
    ogFrequencyFromPitch: ogFrequencyFromPitch,
    ogParsePitchSpelling: ogParsePitchSpelling,
    ogPitchClassFromName: ogPitchClassFromName,
    ogIsSafeAudioDataUrl: ogIsSafeAudioDataUrl,
    ogEstimateDataUrlBytes: ogEstimateDataUrlBytes,
    ogBuildScale: ogBuildScale,
    ogBuildChord: ogBuildChord,
    ogNormalizeSynthInstrument: ogNormalizeSynthInstrument,
    ogListSynthPatchPresets: ogListSynthPatchPresets,
    ogGetSynthPatchPreset: ogGetSynthPatchPreset,
    ogSetSynthInstrument: ogSetSynthInstrument,
    ogApplySynthPatchPreset: ogApplySynthPatchPreset,
    ogRandomizeSynthInstrument: ogRandomizeSynthInstrument,
    ogBuildSynthPatchSummary: ogBuildSynthPatchSummary,
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
    ogBuildArrangementTimeline: ogBuildArrangementTimeline,
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
    ogAddAsset: ogAddAsset,
    ogRegisterUserRecording: ogRegisterUserRecording,
    ogEmbedAssetData: ogEmbedAssetData,
    ogAssignAssetToPad: ogAssignAssetToPad,
    ogSetPadSampleRegion: ogSetPadSampleRegion,
    ogChopAssetToPads: ogChopAssetToPads,
    ogNormalizeSampleRegion: ogNormalizeSampleRegion,
    ogBuildLicenseReport: ogBuildLicenseReport,
    ogBuildAttributionText: ogBuildAttributionText,
    ogBuildProjectStorageReport: ogBuildProjectStorageReport,
    ogBuildOnboardingStatus: ogBuildOnboardingStatus,
    ogBuildNotationPreview: ogBuildNotationPreview,
    ogBuildMusicXmlSketch: ogBuildMusicXmlSketch,
    ogBuildMidiFile: ogBuildMidiFile,
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
