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
    if (type === 'synth' && !track.instrument) track.instrument = { engine: 'subtractive', oscillator: 'sawtooth', filter: { type: 'lowpass', cutoff: 6000, q: 0.7 }, envelope: { attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25 } };
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
      repeat: options.repeat || 1
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
      localOnly: !!assetLike.localOnly,
      createdAt: ogInt(assetLike.createdAt, 0),
      tags: Array.isArray(assetLike.tags) ? assetLike.tags.map(function (tag) { return ogSafeString(tag, ''); }).filter(Boolean) : []
    };
    project.assets.push(asset);
    return asset;
  }

  function ogFindAsset(project, assetId) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    for (var i = 0; i < assets.length; i++) if (assets[i].id === assetId) return assets[i];
    return null;
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
      localOnly: recordingLike.localOnly !== false,
      createdAt: recordingLike.createdAt,
      tags: tags
    });
  }

  function ogAssignAssetToPad(project, trackId, padId, assetId) {
    var track = ogFindTrack(project, trackId);
    var asset = ogFindAsset(project, assetId);
    if (!track || track.type !== 'drumRack') throw new Error('OpenGroove: drum rack track not found');
    if (!asset) throw new Error('OpenGroove: asset not found');
    var pad = null;
    for (var i = 0; i < (track.pads || []).length; i++) {
      if (track.pads[i].id === padId) {
        pad = track.pads[i];
        break;
      }
    }
    if (!pad) throw new Error('OpenGroove: pad not found');
    pad.assetId = asset.id;
    pad.engine = 'sample';
    pad.name = asset.name;
    return pad;
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

  function ogValidateProject(project) {
    var errors = [];
    if (!project || typeof project !== 'object') return ['Project is not an object.'];
    if (project.format !== OG_FORMAT) errors.push('Not an Open Groove project.');
    if (ogInt(project.schemaVersion, 0) > OG_VERSION) errors.push('Project was saved by a newer Open Groove version.');
    if (!Array.isArray(project.tracks)) errors.push('Tracks must be an array.');
    if (!Array.isArray(project.patterns)) errors.push('Patterns must be an array.');
    if (!(ogFinite(project.bpm, 0) >= 20 && ogFinite(project.bpm, 0) <= 400)) errors.push('BPM is outside the supported range.');
    if (!Array.isArray(project.timeSignature) || project.timeSignature.length < 2) errors.push('Time signature is missing.');

    var trackIds = {};
    (project.tracks || []).forEach(function (track) {
      if (!track || !track.id) errors.push('Track is missing an id.');
      else if (trackIds[track.id]) errors.push('Duplicate track id: ' + track.id);
      else trackIds[track.id] = true;
      (track && track.pads || []).forEach(function (pad) {
        if (pad.assetId && !ogFindAsset(project, pad.assetId)) errors.push('Pad ' + pad.id + ' references an unknown asset.');
      });
    });

    var assetIds = {};
    (project.assets || []).forEach(function (asset) {
      if (!asset || !asset.id) errors.push('Asset is missing an id.');
      else if (assetIds[asset.id]) errors.push('Duplicate asset id: ' + asset.id);
      else assetIds[asset.id] = true;
    });

    (project.patterns || []).forEach(function (pattern) {
      if (!pattern || !pattern.id) errors.push('Pattern is missing an id.');
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

    return errors;
  }

  function ogSerializeProject(project) {
    return JSON.stringify(project, null, 2);
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
    ogClone: ogClone,
    ogCreateProject: ogCreateProject,
    ogAddTrack: ogAddTrack,
    ogAddPattern: ogAddPattern,
    ogFindTrack: ogFindTrack,
    ogFindPattern: ogFindPattern,
    ogFindAsset: ogFindAsset,
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
    ogBuildScale: ogBuildScale,
    ogBuildChord: ogBuildChord,
    ogAppendEvent: ogAppendEvent,
    ogRemoveEvent: ogRemoveEvent,
    ogSetDrumStep: ogSetDrumStep,
    ogSetNoteStep: ogSetNoteStep,
    ogDuplicatePattern: ogDuplicatePattern,
    ogClearTrackEvents: ogClearTrackEvents,
    ogApplyChordProgression: ogApplyChordProgression,
    ogAddAsset: ogAddAsset,
    ogRegisterUserRecording: ogRegisterUserRecording,
    ogAssignAssetToPad: ogAssignAssetToPad,
    ogBuildLicenseReport: ogBuildLicenseReport,
    ogBuildAttributionText: ogBuildAttributionText,
    ogBuildNotationPreview: ogBuildNotationPreview,
    ogBuildMusicXmlSketch: ogBuildMusicXmlSketch,
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
