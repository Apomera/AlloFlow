// Open Groove Studio module shell.
// Standalone groovebox/composition prototype. Depends on open_groove_core.js.
(function (root) {
  'use strict';

  if (root.AlloModules && root.AlloModules.OpenGrooveStudio) return;

  var Core = root.OpenGrooveCore || root.AlloModules && root.AlloModules.OpenGrooveCore || null;
  var Scheduler = root.OpenGrooveScheduler || root.AlloModules && root.AlloModules.OpenGrooveScheduler || null;
  var Audio = root.OpenGrooveAudio || root.AlloModules && root.AlloModules.OpenGrooveAudio || null;

  function ogAnnounce(message) {
    try {
      var el = root.document && root.document.getElementById('allo-live-open-groove');
      if (el) el.textContent = message;
    } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    if (!document.getElementById('allo-live-open-groove')) {
      var live = document.createElement('div');
      live.id = 'allo-live-open-groove';
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      live.setAttribute('role', 'status');
      live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
      document.body.appendChild(live);
    }
    if (!document.getElementById('og-a11y-css')) {
      var css = document.createElement('style');
      css.id = 'og-a11y-css';
      css.textContent = [
        '.og-root, .og-root * { box-sizing: border-box; }',
        '@media (prefers-reduced-motion: reduce) { .og-root *, .og-root *::before, .og-root *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }',
        '.og-root button:focus-visible, .og-root input:focus-visible, .og-root select:focus-visible, .og-root [tabindex]:focus-visible { outline: 2px solid #0f766e !important; outline-offset: 2px !important; }',
        '.og-root :focus:not(:focus-visible) { outline: none !important; }'
      ].join('\n');
      document.head.appendChild(css);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function OpenGrooveStudio(props) {
    props = props || {};
    var React = props.React || root.React;
    if (!React) return null;
    var h = React.createElement;
    var C = Core || root.OpenGrooveCore || root.AlloModules && root.AlloModules.OpenGrooveCore;
    var S = Scheduler || root.OpenGrooveScheduler || root.AlloModules && root.AlloModules.OpenGrooveScheduler;
    var A = Audio || root.OpenGrooveAudio || root.AlloModules && root.AlloModules.OpenGrooveAudio;
    var addToast = props.addToast || function () {};
    var dependencyTick = React.useState(0);
    var setDependencyTick = dependencyTick[1];

    React.useEffect(function () {
      if (C) return undefined;
      var id = root.setInterval(function () {
        var nextCore = root.OpenGrooveCore || root.AlloModules && root.AlloModules.OpenGrooveCore || null;
        if (nextCore) {
          Core = nextCore;
          Scheduler = root.OpenGrooveScheduler || root.AlloModules && root.AlloModules.OpenGrooveScheduler || Scheduler;
          Audio = root.OpenGrooveAudio || root.AlloModules && root.AlloModules.OpenGrooveAudio || Audio;
          setDependencyTick(function (v) { return v + 1; });
          root.clearInterval(id);
        }
      }, 120);
      return function () { root.clearInterval(id); };
    }, [!!C]);

    if (!C) {
      return h('div', { className: 'og-root', role: 'dialog', 'aria-modal': true, 'aria-label': 'Open Groove Studio', style: styles.overlay },
        h('div', { style: styles.panel },
          h('div', { style: styles.header },
            h('strong', null, 'Open Groove Studio'),
            h('button', { style: styles.iconButton, 'aria-label': 'Close Open Groove Studio', onClick: props.onClose }, 'X')),
          h('p', { style: styles.muted }, 'Open Groove core did not load.')));
    }

    var initialProjectRef = React.useRef(null);
    if (!initialProjectRef.current) initialProjectRef.current = C.ogMakeDemoProject ? C.ogMakeDemoProject() : C.ogCreateProject({ title: 'Open Groove Prototype' });
    var statePair = React.useState(initialProjectRef.current);
    var project = statePair[0];
    var setProject = statePair[1];
    var selectedPair = React.useState('pad_1');
    var selectedPadId = selectedPair[0];
    var setSelectedPadId = selectedPair[1];
    var selectedBarPair = React.useState(0);
    var selectedBar = selectedBarPair[0];
    var setSelectedBar = selectedBarPair[1];
    var grooveStylePair = React.useState('boomBap');
    var selectedGrooveStyle = grooveStylePair[0];
    var setSelectedGrooveStyle = grooveStylePair[1];
    var melodyStylePair = React.useState('balanced');
    var selectedMelodyStyle = melodyStylePair[0];
    var setSelectedMelodyStyle = melodyStylePair[1];
    var selectedPatternPair = React.useState(initialProjectRef.current.patterns[0] && initialProjectRef.current.patterns[0].id);
    var selectedPatternId = selectedPatternPair[0];
    var setSelectedPatternId = selectedPatternPair[1];
    var recordingPair = React.useState(false);
    var recording = recordingPair[0];
    var setRecording = recordingPair[1];
    var playingPair = React.useState(false);
    var playing = playingPair[0];
    var setPlaying = playingPair[1];
    var jsonRef = React.useRef(null);
    var dialogRef = React.useRef(null);
    var previousFocusRef = React.useRef(null);
    var engineRef = React.useRef(null);
    var recorderRef = React.useRef(null);
    var recorderChunksRef = React.useRef([]);
    var fileInputRef = React.useRef(null);
    var pattern = C.ogFindPattern && C.ogFindPattern(project, selectedPatternId) || project.patterns[0];
    var drumTrack = project.tracks.find(function (track) { return track.type === 'drumRack'; });
    var synthTrack = project.tracks.find(function (track) { return track.type === 'synth'; });
    var selectedPad = drumTrack && drumTrack.pads.find(function (pad) { return pad.id === selectedPadId; });
    var selectedAsset = selectedPad && selectedPad.assetId && C.ogFindAsset ? C.ogFindAsset(project, selectedPad.assetId) : null;
    var stepsPerBar = 16;
    var synthPitches = ['C4', 'Bb3', 'G3', 'Eb3', 'C3', 'Bb2', 'G2', 'C2'];
    var visibleSteps = [];
    for (var i = 0; i < stepsPerBar; i++) visibleSteps.push(selectedBar * stepsPerBar + i);
    var barIndexes = [];
    for (var b = 0; b < Math.max(1, pattern && pattern.bars || 1); b++) barIndexes.push(b);

    React.useEffect(function () {
      previousFocusRef.current = root.document && root.document.activeElement || null;
      if (dialogRef.current && dialogRef.current.focus) dialogRef.current.focus();
      return function () {
        var previous = previousFocusRef.current;
        if (previous && previous.focus) {
          try { previous.focus(); } catch (_) {}
        }
      };
    }, []);

    function mutate(fn) {
      var next = clone(project);
      fn(next);
      setProject(next);
    }

    function currentPatternIn(proj) {
      return C.ogFindPattern && C.ogFindPattern(proj, selectedPatternId) || proj.patterns[0];
    }

    function handleDialogKeyDown(ev) {
      if (ev.key === 'Escape' && props.onClose) {
        ev.preventDefault();
        props.onClose();
        return;
      }
      if (ev.key !== 'Tab' || !dialogRef.current || !root.document) return;
      var nodes = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      var focusable = Array.prototype.slice.call(nodes).filter(function (node) {
        return node && !node.getAttribute('aria-hidden') && (node.offsetWidth || node.offsetHeight || node.getClientRects().length);
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var active = root.document.activeElement;
      if (ev.shiftKey && (active === first || active === dialogRef.current)) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault();
        first.focus();
      }
    }

    function chordProgressionFor(proj) {
      var mode = proj && proj.key && proj.key.mode || 'minor';
      var progressionMode = mode === 'pentatonicMajor' ? 'major' : mode === 'pentatonicMinor' ? 'minor' : mode;
      var notes = C.ogBuildScale ? C.ogBuildScale(proj && proj.key && proj.key.tonic || 'C', progressionMode) : ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'];
      if (mode === 'major' || mode === 'pentatonicMajor') {
        return [
          { root: notes[0] || 'C', quality: 'major' },
          { root: notes[3] || 'F', quality: 'major' },
          { root: notes[4] || 'G', quality: 'major' },
          { root: notes[5] || 'A', quality: 'minor' }
        ];
      }
      return [
        { root: notes[0] || 'C', quality: 'minor' },
        { root: notes[2] || 'Eb', quality: 'major' },
        { root: notes[6] || 'Bb', quality: 'major' },
        { root: notes[4] || 'G', quality: 'minor' }
      ];
    }

    function formatMeasureSummary(measure) {
      measure = measure || { notes: [], drumHits: [], chords: [] };
      var parts = [];
      if (measure.chords && measure.chords.length) {
        parts.push('Chords: ' + measure.chords.map(function (chord) {
          return chord.symbol + '@' + chord.startBeat;
        }).join(', '));
      }
      if (measure.notes && measure.notes.length) {
        parts.push('Notes: ' + measure.notes.map(function (note) {
          return note.pitch + '@' + note.startBeat;
        }).join(', '));
      }
      if (!parts.length) parts.push('Drums: ' + ((measure.drumHits && measure.drumHits.length) || 0));
      return parts.join(' | ');
    }

    function ensureAudioEngine(showError) {
      if (!A) return null;
      if (!engineRef.current || !engineRef.current.available) engineRef.current = A.ogCreateAudioEngine();
      if (!engineRef.current.available) {
        if (showError) addToast(engineRef.current.reason || 'Audio is unavailable in this browser.', 'error');
        return null;
      }
      return engineRef.current;
    }

    function restoreEmbeddedSamplesFor(nextProject, quiet) {
      if (!A || !A.ogRestoreEmbeddedSamples) return;
      var engine = ensureAudioEngine(false);
      if (!engine) return;
      A.ogRestoreEmbeddedSamples(engine, nextProject).then(function (count) {
        if (count && !quiet) addToast(count + ' embedded sample' + (count === 1 ? '' : 's') + ' restored.', 'success');
      });
    }

    function stepActive(step) {
      if (!pattern || !drumTrack) return false;
      var stepTicks = S ? S.ogStepTicks(project, stepsPerBar) : Math.round(C.ogTicksPerMeasure(project) / stepsPerBar);
      return pattern.events.some(function (event) {
        return event.type === 'drumHit' && event.trackId === drumTrack.id && event.padId === selectedPadId && event.startTick === step * stepTicks;
      });
    }

    function noteActive(pitch, step) {
      if (!pattern || !synthTrack) return false;
      var stepTicks = S ? S.ogStepTicks(project, stepsPerBar) : Math.round(C.ogTicksPerMeasure(project) / stepsPerBar);
      var midi = C.ogNoteNameToMidi(pitch);
      return pattern.events.some(function (event) {
        return event.type === 'note' && event.trackId === synthTrack.id && event.midi === midi && event.startTick === step * stepTicks;
      });
    }

    function triggerPad(pad) {
      if (!A) return;
      var engine = ensureAudioEngine(true);
      if (!engine) return;
      if (pad.assetId && A.ogPlaySample && A.ogPlaySample(engine, pad.assetId, engine.ctx.currentTime + 0.01, 0.85, pad.sampleRegion)) {
        ogAnnounce(pad.name);
        return;
      }
      A.ogPlayDrum(engine, pad.engine, engine.ctx.currentTime + 0.01, 0.85);
      ogAnnounce(pad.name);
    }

    function toggleStep(step) {
      if (!pattern || !drumTrack) return;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, selectedPadId, step, stepsPerBar, { on: !stepActive(step), velocity: step % 4 === 0 ? 0.9 : 0.65 });
      });
    }

    function triggerNote(pitch, velocity) {
      if (!A) return;
      var engine = ensureAudioEngine(false);
      if (!engine) return;
      A.ogPlayNote(engine, { pitch: pitch, midi: C.ogNoteNameToMidi(pitch), velocity: velocity || 0.75, instrument: synthTrack && synthTrack.instrument }, engine.ctx.currentTime + 0.01, 0.22);
    }

    function toggleNote(pitch, step) {
      if (!pattern || !synthTrack) return;
      var nextOn = !noteActive(pitch, step);
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        C.ogSetNoteStep(next, nextPattern.id, nextSynth.id, pitch, step, stepsPerBar, { on: nextOn, velocity: 0.78 });
      });
      if (nextOn) triggerNote(pitch, 0.7);
    }

    function setTempo(value) {
      mutate(function (next) {
        next.bpm = Math.max(40, Math.min(240, Math.round(Number(value) || next.bpm || 92)));
      });
    }

    function setSwing(value) {
      mutate(function (next) {
        next.swing = Math.max(0, Math.min(0.75, (Number(value) || 0) / 100));
      });
    }

    function setMixerGain(channelId, value) {
      if (!C.ogSetMixerChannel) return;
      mutate(function (next) {
        C.ogSetMixerChannel(next, channelId, { gain: Math.max(0, Math.min(150, Number(value) || 0)) / 100 });
      });
    }

    function toggleMixerFlag(channelId, key) {
      if (!C.ogSetMixerChannel || !C.ogGetMixerChannel) return;
      mutate(function (next) {
        var channel = C.ogGetMixerChannel(next, channelId);
        var update = {};
        update[key] = !channel[key];
        C.ogSetMixerChannel(next, channelId, update);
      });
    }

    function setSynthPatch(area, key, value) {
      if (!synthTrack || !C.ogSetSynthInstrument) return;
      mutate(function (next) {
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        var update = {};
        if (area === 'oscillator') {
          update.oscillator = value;
        } else {
          update[area] = {};
          update[area][key] = value;
        }
        C.ogSetSynthInstrument(next, nextSynth.id, update);
      });
    }

    function applySynthPreset(presetId) {
      if (!synthTrack || !presetId || !C.ogApplySynthPatchPreset) return;
      var preset = C.ogGetSynthPatchPreset ? C.ogGetSynthPatchPreset(presetId) : null;
      mutate(function (next) {
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        C.ogApplySynthPatchPreset(next, nextSynth.id, presetId);
      });
      ogAnnounce((preset && preset.name || 'Synth preset') + ' loaded');
      addToast((preset && preset.name || 'Synth preset') + ' loaded.', 'success');
    }

    function randomizeSynthPatch() {
      if (!synthTrack || !C.ogRandomizeSynthInstrument) return;
      var patchName = 'Generated Patch';
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        var patch = C.ogRandomizeSynthInstrument(next, nextSynth.id, {
          seed: next.title + ':' + nextSynth.id + ':' + (nextPattern && nextPattern.events.length || 0) + ':' + Date.now()
        });
        patchName = patch.name;
      });
      ogAnnounce(patchName + ' ready');
      addToast(patchName + ' ready.', 'success');
    }

    function auditionSynthPatch() {
      triggerNote('C3', 0.8);
      if (root.setTimeout) root.setTimeout(function () { triggerNote('G3', 0.62); }, 130);
      ogAnnounce('Synth patch preview');
    }

    function clearSelectedPad() {
      if (!pattern || !drumTrack || !C.ogClearPadEvents) return;
      var removed = 0;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        removed = C.ogClearPadEvents(next, nextPattern.id, nextDrums.id, selectedPadId);
      });
      addToast((selectedPad && selectedPad.name || 'Pad') + ' cleared: ' + removed + ' hits.', 'success');
    }

    function accentSelectedPad() {
      if (!pattern || !drumTrack || !C.ogAccentPadEvents) return;
      var count = 0;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        count = C.ogAccentPadEvents(next, nextPattern.id, nextDrums.id, selectedPadId, 1);
      });
      addToast((selectedPad && selectedPad.name || 'Pad') + ' accented: ' + count + ' hits.', 'success');
    }

    function humanizeDrums() {
      if (!pattern || !drumTrack || !C.ogHumanizeDrumEvents) return;
      var count = 0;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        count = C.ogHumanizeDrumEvents(next, nextPattern.id, nextDrums.id, {
          amountTicks: Math.round(C.ogTicksPerBeat(next) / 96),
          velocityAmount: 0.06,
          seed: next.title + ':' + nextPattern.id
        });
      });
      addToast('Humanized ' + count + ' drum hits.', 'success');
    }

    function clearSelectedBar() {
      if (!pattern || !C.ogClearBar) return;
      var removed = 0;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        removed = C.ogClearBar(next, nextPattern.id, selectedBar);
      });
      addToast('Bar ' + (selectedBar + 1) + ' cleared: ' + removed + ' events.', 'success');
    }

    function copyPreviousBar() {
      if (!pattern || !C.ogCopyBar) return;
      if (selectedBar <= 0) {
        addToast('Choose bar 2 or later to copy from the previous bar.', 'info');
        return;
      }
      var created = 0;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        created = C.ogCopyBar(next, nextPattern.id, selectedBar - 1, selectedBar, { replace: true }).length;
      });
      addToast('Copied previous bar into bar ' + (selectedBar + 1) + ': ' + created + ' events.', 'success');
    }

    function copyBarForward() {
      if (!pattern || !C.ogCopyBar) return;
      if (selectedBar >= Math.max(1, pattern.bars) - 1) {
        addToast('This is the last bar in the pattern.', 'info');
        return;
      }
      var created = 0;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        created = C.ogCopyBar(next, nextPattern.id, selectedBar, selectedBar + 1, { replace: true }).length;
      });
      setSelectedBar(selectedBar + 1);
      addToast('Copied bar ' + (selectedBar + 1) + ' into bar ' + (selectedBar + 2) + ': ' + created + ' events.', 'success');
    }

    function seedStarterBeat() {
      if (!pattern || !drumTrack) return;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        for (var bar = 0; bar < Math.max(1, nextPattern.bars); bar++) {
          var base = bar * stepsPerBar;
          C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, 'pad_1', base, stepsPerBar, { on: true, velocity: 0.96 });
          C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, 'pad_1', base + 8, stepsPerBar, { on: true, velocity: 0.82 });
          C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, 'pad_2', base + 4, stepsPerBar, { on: true, velocity: 0.92 });
          C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, 'pad_2', base + 12, stepsPerBar, { on: true, velocity: 0.9 });
          for (var h = 0; h < stepsPerBar; h += 2) {
            C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, 'pad_3', base + h, stepsPerBar, { on: true, velocity: h % 4 === 0 ? 0.52 : 0.36 });
          }
        }
      });
      setSelectedPadId('pad_1');
      addToast('Starter beat added.', 'success');
      ogAnnounce('Starter beat added');
    }

    function writeDrumGroove() {
      if (!pattern || !drumTrack || !C.ogWriteDrumGroove) return;
      var summary = { hitCount: 0, skippedCount: 0, styleName: selectedGrooveStyle };
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        summary = C.ogWriteDrumGroove(next, nextPattern.id, nextDrums.id, {
          style: selectedGrooveStyle,
          startBar: selectedBar,
          bars: 1,
          stepsPerBar: stepsPerBar,
          seed: next.title + ':' + nextPattern.id + ':' + selectedBar + ':' + selectedGrooveStyle,
          replace: true
        });
      });
      var skipped = summary.skippedCount ? ' ' + summary.skippedCount + ' manual hit' + (summary.skippedCount === 1 ? '' : 's') + ' kept.' : '';
      addToast((summary.styleName || 'Groove') + ' wrote ' + (summary.hitCount || 0) + ' hits.' + skipped, 'success');
      ogAnnounce('Drum groove written');
    }

    function findSceneForPattern(proj, patternId) {
      var scenes = proj && Array.isArray(proj.scenes) ? proj.scenes : [];
      for (var i = 0; i < scenes.length; i++) {
        if (Array.isArray(scenes[i].patternIds) && scenes[i].patternIds.indexOf(patternId) >= 0) return scenes[i];
      }
      return null;
    }

    function choosePattern(patternId) {
      setSelectedPatternId(patternId);
      setSelectedBar(0);
    }

    function selectArrangementSection(section) {
      if (section && section.patternIds && section.patternIds[0]) choosePattern(section.patternIds[0]);
    }

    function appendCurrentSection() {
      if (!pattern || !C.ogAddScene || !C.ogAddArrangementSection) return;
      var label = '';
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var scene = findSceneForPattern(next, nextPattern.id) || C.ogAddScene(next, {
          name: 'Scene ' + ((next.scenes || []).length + 1),
          patternIds: [nextPattern.id]
        });
        C.ogAddArrangementSection(next, scene.id, { bars: nextPattern.bars, label: scene.name });
        label = scene.name;
      });
      addToast((label || 'Scene') + ' added to the song.', 'success');
    }

    function createPatternVariation() {
      if (!pattern || !C.ogDuplicatePattern || !C.ogAddScene || !C.ogAddArrangementSection) return;
      var createdPatternId = null;
      var sceneName = '';
      mutate(function (next) {
        var source = currentPatternIn(next);
        var copy = C.ogDuplicatePattern(next, source.id, 'Pattern ' + (next.patterns.length + 1));
        sceneName = 'Scene ' + ((next.scenes || []).length + 1);
        var scene = C.ogAddScene(next, { name: sceneName, patternIds: [copy.id] });
        C.ogAddArrangementSection(next, scene.id, { bars: copy.bars, label: scene.name });
        createdPatternId = copy.id;
      });
      if (createdPatternId) choosePattern(createdPatternId);
      addToast((sceneName || 'Variation') + ' created and added to the song.', 'success');
    }

    function setKeyTonic(value) {
      mutate(function (next) {
        next.key = next.key || {};
        next.key.tonic = value || 'C';
      });
    }

    function setKeyMode(value) {
      mutate(function (next) {
        next.key = next.key || {};
        next.key.mode = value || 'minor';
      });
    }

    function applyProgression() {
      if (!pattern || !synthTrack || !C.ogApplyChordProgression) return;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        var length = C.ogPatternLengthTicks(next, nextPattern);
        if (C.ogClearTrackEvents) C.ogClearTrackEvents(next, nextPattern.id, nextSynth.id, { fromTick: 0, toTick: length, types: ['chord', 'note'] });
        C.ogApplyChordProgression(next, nextPattern.id, nextSynth.id, chordProgressionFor(next), { barsPerChord: 1, octave: 3, velocity: 0.54, writeNotes: true });
      });
      addToast('Chord bed written to the synth track.', 'success');
    }

    function addChordToBar(root, quality) {
      if (!pattern || !synthTrack || !C.ogApplyChordProgression) return;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        var fromTick = selectedBar * C.ogTicksPerMeasure(next);
        var toTick = fromTick + C.ogTicksPerMeasure(next);
        if (C.ogClearTrackEvents) C.ogClearTrackEvents(next, nextPattern.id, nextSynth.id, { fromTick: fromTick, toTick: toTick, types: ['chord', 'note'] });
        C.ogApplyChordProgression(next, nextPattern.id, nextSynth.id, [{ root: root, quality: quality }], { startBar: selectedBar, barsPerChord: 1, octave: 3, velocity: 0.58, writeNotes: true });
      });
      addToast('Chord written to bar ' + (selectedBar + 1) + '.', 'success');
    }

    function writeMelodyPhrase() {
      if (!pattern || !synthTrack || !C.ogWriteMelodyPhrase) return;
      var summary = { noteCount: 0, styleName: selectedMelodyStyle };
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        var bars = selectedMelodyStyle === 'callResponse' && selectedBar < Math.max(1, nextPattern.bars) - 1 ? 2 : 1;
        summary = C.ogWriteMelodyPhrase(next, nextPattern.id, nextSynth.id, {
          style: selectedMelodyStyle,
          startBar: selectedBar,
          bars: bars,
          stepsPerBar: 8,
          octave: 4,
          seed: next.title + ':' + nextPattern.id + ':' + selectedBar + ':' + selectedMelodyStyle + ':' + Date.now(),
          replace: true
        });
      });
      addToast((summary.noteCount || 0) + ' ' + (summary.styleName || 'melody') + ' notes written.', 'success');
      ogAnnounce('Melody phrase written');
    }

    function decodeSampleForSession(asset, blob, dataUrl) {
      if (!asset || !A) return;
      var engine = ensureAudioEngine(false);
      if (!engine) {
        if (dataUrl) addToast('Sample embedded in the project; playback will restore when audio is available.', 'info');
        return;
      }
      var decoder = dataUrl && A.ogDecodeDataUrlAndRegisterSample
        ? A.ogDecodeDataUrlAndRegisterSample(engine, asset.id, dataUrl, { mimeType: asset.mimeType, sizeBytes: asset.sizeBytes })
        : blob && A.ogDecodeAndRegisterSample
          ? A.ogDecodeAndRegisterSample(engine, asset.id, blob)
          : Promise.resolve(false);
      decoder.then(function (ok) {
        addToast(ok ? asset.name + ' assigned to pad.' : asset.name + ' saved, but playback decode was unavailable.', ok ? 'success' : 'info');
      });
    }

    function createOwnedSampleSlot(blob, options) {
      options = options || {};
      if (!drumTrack) return Promise.resolve(null);
      var readData = blob && A && A.ogBlobToDataUrl ? A.ogBlobToDataUrl(blob).catch(function () { return null; }) : Promise.resolve(null);
      return readData.then(function (dataUrl) {
        if (dataUrl && C.ogIsSafeAudioDataUrl && !C.ogIsSafeAudioDataUrl(dataUrl)) dataUrl = null;
        var created = null;
        var stamp = Date.now();
        mutate(function (next) {
          var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
          created = C.ogRegisterUserRecording(next, {
            name: options.name || (blob ? 'Recorded Pad ' + selectedPadId.replace('pad_', '') : 'Owned Sample Slot'),
            file: dataUrl ? 'embedded://' + selectedPadId + '-' + stamp : 'session://' + selectedPadId + '-' + stamp,
            source: options.source || (blob ? 'User recording' : 'User sample slot'),
            mimeType: blob && blob.type || options.mimeType || null,
            sizeBytes: blob && blob.size || options.sizeBytes || 0,
            dataUrl: dataUrl,
            createdAt: stamp,
            tags: ['pad', selectedPadId]
          });
          C.ogAssignAssetToPad(next, nextDrums.id, selectedPadId, created.id);
        });
        if (blob || dataUrl) decodeSampleForSession(created, blob, dataUrl);
        else addToast('Owned sample slot assigned to the selected pad.', 'success');
        ogAnnounce('Sample assigned to ' + (selectedPad && selectedPad.name || 'selected pad'));
        return created;
      });
    }

    function importAudioFile(file) {
      if (!file) return;
      if (file.type && file.type.indexOf('audio/') !== 0) {
        addToast('Choose an audio file for the selected pad.', 'error');
        return;
      }
      var cleanName = String(file.name || 'Imported Sample').replace(/\.[^.]+$/, '') || 'Imported Sample';
      createOwnedSampleSlot(file, { name: cleanName, source: 'User import' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function openImportPicker() {
      if (fileInputRef.current) fileInputRef.current.click();
    }

    function trimSelectedPadStart(deltaSec) {
      if (!selectedPad || !selectedPad.assetId || !selectedAsset || !C.ogSetPadSampleRegion) {
        addToast('Select a sample pad before trimming.', 'info');
        return;
      }
      var current = selectedPad.sampleRegion || { startSec: 0, endSec: selectedAsset.durationSec || 1, label: selectedPad.name };
      var nextStart = Math.max(0, Math.min((current.endSec || 1) - 0.02, (current.startSec || 0) + deltaSec));
      mutate(function (next) {
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        C.ogSetPadSampleRegion(next, nextDrums.id, selectedPadId, {
          startSec: nextStart,
          endSec: current.endSec || selectedAsset.durationSec || 1,
          label: current.label || selectedPad.name
        });
      });
      addToast('Pad start trimmed to ' + Math.round(nextStart * 1000) / 1000 + 's.', 'success');
    }

    function resetSelectedPadRegion() {
      if (!selectedPad || !selectedPad.assetId || !C.ogSetPadSampleRegion) {
        addToast('Select a sample pad before resetting trim.', 'info');
        return;
      }
      mutate(function (next) {
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        C.ogSetPadSampleRegion(next, nextDrums.id, selectedPadId, null);
      });
      addToast('Pad trim reset.', 'success');
    }

    function chopSelectedPad(slices) {
      if (!selectedPad || !selectedPad.assetId || !selectedAsset || !C.ogChopAssetToPads) {
        addToast('Select a sample pad before chopping.', 'info');
        return;
      }
      var region = selectedPad.sampleRegion || { startSec: 0, endSec: selectedAsset.durationSec || 1 };
      mutate(function (next) {
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        C.ogChopAssetToPads(next, nextDrums.id, selectedPad.assetId, {
          startPadId: selectedPadId,
          slices: slices || 4,
          startSec: region.startSec || 0,
          endSec: region.endSec || selectedAsset.durationSec || 1
        });
      });
      addToast('Sample chopped across ' + (slices || 4) + ' pads.', 'success');
    }

    function startRecording() {
      if (!A || !A.ogCanRecordAudio || !A.ogCanRecordAudio()) {
        createOwnedSampleSlot(null);
        addToast('Microphone recording is unavailable here, so I created an owned sample slot instead.', 'info');
        return;
      }
      root.navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var recorder = new root.MediaRecorder(stream);
        recorderChunksRef.current = [];
        recorder.ondataavailable = function (ev) {
          if (ev.data && ev.data.size) recorderChunksRef.current.push(ev.data);
        };
        recorder.onstop = function () {
          var blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          stream.getTracks().forEach(function (track) { track.stop(); });
          recorderRef.current = null;
          setRecording(false);
          if (blob.size) createOwnedSampleSlot(blob);
        };
        recorderRef.current = recorder;
        recorder.start();
        setRecording(true);
        ogAnnounce('Recording selected pad');
      }).catch(function (err) {
        setRecording(false);
        addToast('Recording was not started: ' + (err && err.message || 'permission unavailable'), 'error');
      });
    }

    function stopRecording() {
      var recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      else setRecording(false);
    }

    function playLoop() {
      if (!A || !S || !pattern) return;
      var engine = ensureAudioEngine(true);
      if (!engine) return;
      restoreEmbeddedSamplesFor(project, true);
      var now = engine.ctx.currentTime + 0.05;
      var plan = S.ogBuildPlaybackPlan(project, { patternId: pattern.id, originTime: now });
      A.ogSchedulePlan(engine, plan, { baseTime: 0 });
      setPlaying(true);
      ogAnnounce('Playing pattern');
      root.setTimeout(function () { setPlaying(false); }, Math.max(300, C.ogBarsToTicks(project, pattern.bars) * 60 / (project.bpm * project.ppq) * 1000));
    }

    function playSong() {
      if (!A || !S || !S.ogBuildArrangementPlaybackPlan) return;
      var engine = ensureAudioEngine(true);
      if (!engine) return;
      restoreEmbeddedSamplesFor(project, true);
      var now = engine.ctx.currentTime + 0.05;
      var plan = S.ogBuildArrangementPlaybackPlan(project, { originTime: now });
      if (!plan.length) {
        addToast('Add a section with events before playing the song.', 'info');
        return;
      }
      A.ogSchedulePlan(engine, plan, { baseTime: 0 });
      var timeline = C.ogBuildArrangementTimeline ? C.ogBuildArrangementTimeline(project) : [];
      var endTick = timeline.reduce(function (max, section) { return Math.max(max, section.endTick || 0); }, 0);
      setPlaying(true);
      ogAnnounce('Playing song arrangement');
      root.setTimeout(function () { setPlaying(false); }, Math.max(300, endTick * 60 / (project.bpm * project.ppq) * 1000));
    }

    function stopLoop() {
      setPlaying(false);
      ogAnnounce('Stopped');
    }

    function saveProject() {
      var text = C.ogSerializeProject(project);
      if (jsonRef.current) jsonRef.current.value = text;
      addToast('Project JSON prepared.', 'success');
    }

    function saveThinProject() {
      var text = C.ogSerializeProject(project, { includeEmbeddedAudio: false });
      if (jsonRef.current) jsonRef.current.value = text;
      addToast('Project JSON prepared without embedded audio.', 'success');
    }

    function downloadText(filename, text, type) {
      try {
        var blob = new Blob([text], { type: type || 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 500);
      } catch (err) {
        addToast('Download failed: ' + (err && err.message || 'unknown error'), 'error');
      }
    }

    function downloadBytes(filename, bytes, type) {
      try {
        var blob = new Blob([bytes], { type: type || 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 500);
      } catch (err) {
        addToast('Download failed: ' + (err && err.message || 'unknown error'), 'error');
      }
    }

    function downloadProject() {
      var safeTitle = String(project.title || 'open-groove').replace(/[^\w -]+/g, '').trim().replace(/ +/g, '-') || 'open-groove';
      downloadText(safeTitle + '.ogroove.json', C.ogSerializeProject(project), 'application/json');
    }

    function loadProjectFromText() {
      try {
        var text = jsonRef.current ? jsonRef.current.value : '';
        var next = C.ogParseProject(text);
        setProject(next);
        if (next.patterns && next.patterns[0]) choosePattern(next.patterns[0].id);
        restoreEmbeddedSamplesFor(next, false);
        addToast('Open Groove project loaded.', 'success');
      } catch (err) {
        addToast('Could not load project JSON: ' + (err && err.message || 'unknown error'), 'error');
      }
    }

    function prepareMusicXml() {
      try {
        var xml = C.ogBuildMusicXmlSketch(project, pattern.id, synthTrack && synthTrack.id);
        if (jsonRef.current) jsonRef.current.value = xml;
        addToast('MusicXML sketch prepared.', 'success');
      } catch (err) {
        addToast('MusicXML export failed: ' + (err && err.message || 'unknown error'), 'error');
      }
    }

    function downloadMidi() {
      try {
        var safeTitle = String(project.title || 'open-groove').replace(/[^\w -]+/g, '').trim().replace(/ +/g, '-') || 'open-groove';
        var midi = C.ogBuildMidiFile(project, pattern.id);
        downloadBytes(safeTitle + '.mid', midi, 'audio/midi');
        addToast('MIDI file exported.', 'success');
      } catch (err) {
        addToast('MIDI export failed: ' + (err && err.message || 'unknown error'), 'error');
      }
    }

    function prepareAttribution() {
      if (jsonRef.current) jsonRef.current.value = C.ogBuildAttributionText ? C.ogBuildAttributionText(project) : 'No attribution-required assets.';
      addToast('Attribution notes prepared.', 'success');
    }

    function resetDemo() {
      var next = C.ogMakeDemoProject ? C.ogMakeDemoProject() : C.ogCreateProject({ title: 'Open Groove Prototype' });
      setProject(next);
      if (next.patterns && next.patterns[0]) choosePattern(next.patterns[0].id);
      ogAnnounce('Demo pattern reset');
    }

    var licenseReport = C.ogBuildLicenseReport(project);
    var storageReport = C.ogBuildProjectStorageReport ? C.ogBuildProjectStorageReport(project) : { embeddedCount: 0, embeddedBytes: 0 };
    var validation = C.ogValidateProject(project);
    var notation = C.ogBuildNotationPreview(project, pattern.id);
    var currentMeasure = notation.measures[selectedBar] || { notes: [], drumHits: [] };
    var scaleNotes = C.ogBuildScale ? C.ogBuildScale(project.key && project.key.tonic || 'C', project.key && project.key.mode || 'minor') : [];
    var sampleAssets = (project.assets || []).filter(function (asset) { return asset.type === 'recording' || asset.type === 'sample' || asset.type === 'loop'; });
    var chordChoices = chordProgressionFor(project).map(function (chord) {
      return C.ogBuildChord ? C.ogBuildChord(chord.root, chord.quality, 3) : { symbol: chord.root, root: chord.root, quality: chord.quality };
    });
    var drumGrooveStyles = C.ogListDrumGrooveStyles ? C.ogListDrumGrooveStyles() : [
      { id: 'boomBap', name: 'Boom Bap' },
      { id: 'fourFloor', name: 'Four Floor' },
      { id: 'halfTime', name: 'Half Time' },
      { id: 'syncopated', name: 'Syncopated' }
    ];
    var melodyStyles = C.ogListMelodyPhraseStyles ? C.ogListMelodyPhraseStyles() : [
      { id: 'balanced', name: 'Balanced' },
      { id: 'sparse', name: 'Sparse' },
      { id: 'ascending', name: 'Ascending' },
      { id: 'callResponse', name: 'Call / Response' }
    ];
    var grooveHitCount = pattern.events.filter(function (event) {
      return event.type === 'drumHit' && event.role === 'groove';
    }).length;
    var melodyNoteCount = pattern.events.filter(function (event) {
      return event.type === 'note' && event.role === 'melody';
    }).length;
    var arrangementTimeline = C.ogBuildArrangementTimeline ? C.ogBuildArrangementTimeline(project) : [];
    var songBars = arrangementTimeline.reduce(function (max, section) { return Math.max(max, section.endBar || 0); }, 0);
    var starterStatus = C.ogBuildOnboardingStatus ? C.ogBuildOnboardingStatus(project, pattern && pattern.id) : {
      beatReady: pattern.events.some(function (event) { return event.type === 'drumHit'; }),
      harmonyReady: pattern.events.some(function (event) { return event.type === 'note' || event.type === 'chord'; }),
      variationReady: (project.patterns || []).length > 1,
      songReady: arrangementTimeline.length > 0,
      sampleReady: sampleAssets.length > 0,
      exportReady: validation.length === 0,
      completed: 0,
      total: 6
    };
    var starterSteps = [
      ['Beat', starterStatus.beatReady],
      ['Harmony', starterStatus.harmonyReady],
      ['Variation', starterStatus.variationReady],
      ['Song', starterStatus.songReady],
      ['Sample', starterStatus.sampleReady],
      ['Export', starterStatus.exportReady]
    ];
    var mixerSnapshot = C.ogBuildMixerSnapshot ? C.ogBuildMixerSnapshot(project) : {
      master: project.mixer && project.mixer.master || { gain: 0.9 },
      channels: []
    };
    var synthPatch = C.ogNormalizeSynthInstrument ? C.ogNormalizeSynthInstrument(synthTrack && synthTrack.instrument) : (synthTrack && synthTrack.instrument || { oscillator: 'sawtooth', filter: { type: 'lowpass', cutoff: 6000, q: 0.7 }, envelope: { attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25 } });
    var synthPatchSummary = C.ogBuildSynthPatchSummary ? C.ogBuildSynthPatchSummary(project, synthTrack && synthTrack.id) : { label: synthPatch.oscillator };
    var synthPatchPresets = C.ogListSynthPatchPresets ? C.ogListSynthPatchPresets() : [];

    return h('div', {
      ref: dialogRef,
      className: 'og-root',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'og-dialog-title',
      'aria-describedby': 'og-dialog-subtitle',
      tabIndex: -1,
      onKeyDown: handleDialogKeyDown,
      style: styles.overlay
    },
      h('div', { style: styles.shell },
        h('div', { style: styles.header },
          h('div', null,
            h('div', { style: styles.eyebrow }, 'Milestone 0'),
            h('strong', { id: 'og-dialog-title', style: styles.title }, 'Open Groove Studio'),
            h('div', { id: 'og-dialog-subtitle', style: styles.subtitle }, 'Music learning tool for rhythm, synthesis, and composition')),
          h('div', { style: styles.transport, role: 'toolbar', 'aria-label': 'Transport' },
            h('button', { style: styles.transportButton, onClick: playLoop, disabled: playing, 'aria-label': 'Play pattern' }, 'Play'),
            h('button', { style: styles.transportButton, onClick: stopLoop, 'aria-label': 'Stop pattern' }, 'Stop'),
            h('button', { style: styles.transportButton, onClick: resetDemo, 'aria-label': 'Reset demo pattern' }, 'Reset'),
            h('label', { style: styles.tempoLabel }, 'BPM',
              h('input', { style: styles.tempoInput, type: 'number', min: 40, max: 240, value: project.bpm, onChange: function (ev) { setTempo(ev.target.value); }, 'aria-label': 'Tempo in beats per minute' })),
            h('label', { style: styles.swingLabel }, 'Swing',
              h('input', { style: styles.swingSlider, type: 'range', min: 0, max: 75, value: Math.round((project.swing || 0) * 100), onChange: function (ev) { setSwing(ev.target.value); }, 'aria-label': 'Swing amount' }),
              h('span', { style: styles.swingValue }, Math.round((project.swing || 0) * 100) + '%')),
            h('button', { style: styles.iconButton, 'aria-label': 'Close Open Groove Studio', onClick: props.onClose }, 'X'))),

        h('div', { style: styles.grid },
          h('section', { style: styles.surface, 'aria-labelledby': 'og-start-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-start-title', style: styles.h2 }, 'Starter Path'),
              h('span', { style: styles.meta, role: 'status', 'aria-live': 'polite' }, starterStatus.completed + ' / ' + starterStatus.total)),
            h('div', { style: styles.starterSteps, role: 'list', 'aria-label': 'Starter path progress' },
              starterSteps.map(function (item) {
                return h('span', {
                  key: item[0],
                  role: 'listitem',
                  style: Object.assign({}, styles.starterChip, item[1] ? styles.starterChipDone : null),
                  'aria-label': item[0] + (item[1] ? ' ready' : ' not ready')
                }, item[0]);
              })),
            h('div', { style: styles.starterActions, role: 'toolbar', 'aria-label': 'Starter path actions' },
              h('button', { style: styles.smallButton, onClick: seedStarterBeat }, 'Make Beat'),
              h('button', { style: styles.smallButton, onClick: applyProgression }, 'Add Harmony'),
              h('button', { style: styles.smallButton, onClick: createPatternVariation }, 'New Variation'),
              h('button', { style: styles.wideButton, onClick: appendCurrentSection }, 'Add Section'))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-pads-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-pads-title', style: styles.h2 }, 'Pads'),
              h('span', { style: styles.meta }, project.bpm + ' BPM')),
            h('div', { style: styles.padGrid },
              (drumTrack && drumTrack.pads || []).map(function (pad) {
                var selected = pad.id === selectedPadId;
                return h('button', {
                  key: pad.id,
                  style: Object.assign({}, styles.pad, selected ? styles.padSelected : null),
                  'aria-pressed': selected,
                  'aria-label': pad.name + ' pad',
                  onClick: function () { setSelectedPadId(pad.id); triggerPad(pad); }
                }, h('span', { style: styles.padIndex }, String(pad.index + 1)), h('span', { style: styles.padName }, pad.name));
              }))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-steps-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-steps-title', style: styles.h2 }, 'Steps'),
              h('span', { style: styles.meta }, selectedPad ? selectedPad.name + ' - bar ' + (selectedBar + 1) : 'Pad')),
            h('div', { style: styles.barTabs, role: 'group', 'aria-label': 'Pattern bars' },
              barIndexes.map(function (bar) {
                return h('button', {
                  key: bar,
                  style: Object.assign({}, styles.barTab, selectedBar === bar ? styles.barTabOn : null),
                  'aria-pressed': selectedBar === bar,
                  'aria-label': 'Select bar ' + (bar + 1),
                  onClick: function () { setSelectedBar(bar); }
                }, 'Bar ' + (bar + 1));
              })),
            h('div', { style: styles.steps },
              visibleSteps.map(function (step) {
                var active = stepActive(step);
                return h('button', {
                  key: step,
                  style: Object.assign({}, styles.step, active ? styles.stepOn : null, step % 4 === 0 ? styles.stepBeat : null),
                  'aria-pressed': active,
                  'aria-label': 'Step ' + (step + 1) + (active ? ' on' : ' off'),
                  onClick: function () { toggleStep(step); }
                }, String((step % stepsPerBar) + 1));
              })),
            h('div', { style: styles.grooveComposer, role: 'group', 'aria-label': 'Drum groove writer' },
              h('label', { style: styles.fieldLabel }, 'Groove',
                h('select', {
                  style: styles.select,
                  value: selectedGrooveStyle,
                  onChange: function (ev) { setSelectedGrooveStyle(ev.target.value); },
                  'aria-label': 'Drum groove style'
                },
                  drumGrooveStyles.map(function (style) {
                    return h('option', { key: style.id, value: style.id }, style.name);
                  }))),
              h('button', {
                style: Object.assign({}, styles.wideButton, !C.ogWriteDrumGroove ? styles.disabledButton : null),
                onClick: writeDrumGroove,
                disabled: !C.ogWriteDrumGroove,
                'aria-label': 'Write drum groove to selected bar'
              }, 'Write Groove')),
            h('div', { style: styles.grooveTools, role: 'toolbar', 'aria-label': 'Step pattern tools' },
              h('button', { style: styles.smallButton, onClick: accentSelectedPad }, 'Accent'),
              h('button', { style: styles.smallButton, onClick: clearSelectedPad }, 'Clear Pad'),
              h('button', {
                style: Object.assign({}, styles.smallButton, selectedBar <= 0 ? styles.disabledButton : null),
                onClick: copyPreviousBar,
                disabled: selectedBar <= 0,
                'aria-label': 'Copy previous bar into selected bar'
              }, 'Copy Prev'),
              h('button', {
                style: Object.assign({}, styles.smallButton, selectedBar >= Math.max(1, pattern.bars) - 1 ? styles.disabledButton : null),
                onClick: copyBarForward,
                disabled: selectedBar >= Math.max(1, pattern.bars) - 1,
                'aria-label': 'Copy selected bar into next bar'
              }, 'Copy Next'),
              h('button', { style: styles.smallButton, onClick: clearSelectedBar }, 'Clear Bar'),
              h('button', { style: styles.smallButton, onClick: humanizeDrums }, 'Humanize')),
            h('div', { style: styles.stats },
              h('span', null, pattern.events.filter(function (event) { return event.type === 'drumHit'; }).length + ' drum hits'),
              h('span', null, grooveHitCount + ' groove'),
              h('span', null, pattern.events.filter(function (event) { return event.type === 'note'; }).length + ' notes'),
              h('span', null, (storageReport.humanizedHitCount || 0) + ' nudged'),
              h('span', null, validation.length ? validation.length + ' checks' : 'valid'))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-synth-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-synth-title', style: styles.h2 }, 'Synth Notes'),
              h('span', { style: styles.meta }, synthTrack ? synthTrack.name : 'Synth')),
            h('div', { style: styles.noteGrid },
              synthPitches.map(function (pitch) {
                return h('div', { key: pitch, style: styles.noteRow },
                  h('button', { style: styles.noteLabel, onClick: function () { triggerNote(pitch, 0.75); }, 'aria-label': 'Preview ' + pitch }, pitch),
                  h('div', { style: styles.noteSteps },
                    visibleSteps.map(function (step) {
                      var active = noteActive(pitch, step);
                      return h('button', {
                        key: pitch + '-' + step,
                        style: Object.assign({}, styles.noteStep, active ? styles.noteStepOn : null, step % 4 === 0 ? styles.stepBeat : null),
                        'aria-pressed': active,
                        'aria-label': pitch + ' step ' + ((step % stepsPerBar) + 1) + (active ? ' on' : ' off'),
                        onClick: function () { toggleNote(pitch, step); }
                  }, active ? 'x' : '');
                    })));
              }))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-patch-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-patch-title', style: styles.h2 }, 'Synth Patch'),
              h('span', { style: styles.meta }, synthPatchSummary.label)),
            h('div', { style: styles.patchGrid },
              h('label', { style: styles.fieldLabel }, 'Preset',
                h('select', {
                  style: styles.select,
                  value: synthPatch.presetId && synthPatch.presetId !== 'generated' ? synthPatch.presetId : '',
                  onChange: function (ev) { applySynthPreset(ev.target.value); },
                  'aria-label': 'Synth patch preset'
                },
                  [h('option', { key: 'custom', value: '' }, synthPatch.presetId === 'generated' ? 'Generated' : 'Custom')].concat(synthPatchPresets.map(function (preset) {
                    return h('option', { key: preset.id, value: preset.id }, preset.name);
                  })))),
              h('label', { style: styles.fieldLabel }, 'Wave',
                h('select', {
                  style: styles.select,
                  value: synthPatch.oscillator,
                  onChange: function (ev) { setSynthPatch('oscillator', 'oscillator', ev.target.value); },
                  'aria-label': 'Synth oscillator wave'
                },
                  ['sawtooth', 'square', 'triangle', 'sine'].map(function (wave) {
                    return h('option', { key: wave, value: wave }, wave);
                  }))),
              h('label', { style: styles.fieldLabel }, 'Filter',
                h('select', {
                  style: styles.select,
                  value: synthPatch.filter.type,
                  onChange: function (ev) { setSynthPatch('filter', 'type', ev.target.value); },
                  'aria-label': 'Synth filter type'
                },
                  ['lowpass', 'highpass', 'bandpass', 'notch'].map(function (type) {
                    return h('option', { key: type, value: type }, type);
                  }))),
              h('label', { style: styles.fieldLabel }, 'Cutoff',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 80,
                  max: 18000,
                  value: Math.round(synthPatch.filter.cutoff),
                  onChange: function (ev) { setSynthPatch('filter', 'cutoff', Number(ev.target.value)); },
                  'aria-label': 'Synth filter cutoff'
                }),
                h('span', { style: styles.mixerValue }, Math.round(synthPatch.filter.cutoff) + ' Hz')),
              h('label', { style: styles.fieldLabel }, 'Resonance',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 0.1,
                  max: 20,
                  step: 0.1,
                  value: synthPatch.filter.q,
                  onChange: function (ev) { setSynthPatch('filter', 'q', Number(ev.target.value)); },
                  'aria-label': 'Synth filter resonance'
                }),
                h('span', { style: styles.mixerValue }, Math.round(synthPatch.filter.q * 10) / 10)),
              h('label', { style: styles.fieldLabel }, 'Attack',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 1,
                  max: 2000,
                  value: Math.round(synthPatch.envelope.attack * 1000),
                  onChange: function (ev) { setSynthPatch('envelope', 'attack', Number(ev.target.value) / 1000); },
                  'aria-label': 'Synth attack time'
                }),
                h('span', { style: styles.mixerValue }, Math.round(synthPatch.envelope.attack * 1000) + ' ms')),
              h('label', { style: styles.fieldLabel }, 'Sustain',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 0,
                  max: 100,
                  value: Math.round(synthPatch.envelope.sustain * 100),
                  onChange: function (ev) { setSynthPatch('envelope', 'sustain', Number(ev.target.value) / 100); },
                  'aria-label': 'Synth sustain level'
                }),
                h('span', { style: styles.mixerValue }, Math.round(synthPatch.envelope.sustain * 100) + '%')),
              h('label', { style: styles.fieldLabel }, 'Release',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 1,
                  max: 5000,
                  value: Math.round(synthPatch.envelope.release * 1000),
                  onChange: function (ev) { setSynthPatch('envelope', 'release', Number(ev.target.value) / 1000); },
                  'aria-label': 'Synth release time'
                }),
                h('span', { style: styles.mixerValue }, Math.round(synthPatch.envelope.release * 1000) + ' ms'))),
            h('div', { style: styles.patchActions, role: 'toolbar', 'aria-label': 'Synth patch actions' },
              h('button', {
                style: Object.assign({}, styles.smallButton, !C.ogRandomizeSynthInstrument ? styles.disabledButton : null),
                onClick: randomizeSynthPatch,
                disabled: !C.ogRandomizeSynthInstrument,
                'aria-label': 'Create a new synth patch'
              }, 'New Patch'),
              h('button', { style: styles.wideButton, onClick: auditionSynthPatch, 'aria-label': 'Preview synth patch' }, 'Preview Patch'))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-harmony-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-harmony-title', style: styles.h2 }, 'Harmony'),
              h('span', { style: styles.meta }, (project.key && project.key.tonic || 'C') + ' ' + (project.key && project.key.mode || 'minor'))),
            h('div', { style: styles.formRow },
              h('label', { style: styles.fieldLabel }, 'Key',
                h('select', { style: styles.select, value: project.key && project.key.tonic || 'C', onChange: function (ev) { setKeyTonic(ev.target.value); }, 'aria-label': 'Song key tonic' },
                  ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(function (note) {
                    return h('option', { key: note, value: note }, note);
                  }))),
              h('label', { style: styles.fieldLabel }, 'Mode',
                h('select', { style: styles.select, value: project.key && project.key.mode || 'minor', onChange: function (ev) { setKeyMode(ev.target.value); }, 'aria-label': 'Song key mode' },
                  ['minor', 'major', 'dorian', 'mixolydian', 'pentatonicMinor', 'pentatonicMajor'].map(function (mode) {
                    return h('option', { key: mode, value: mode }, mode);
                  })))),
            h('div', { style: styles.chipRow, 'aria-label': 'Scale notes' },
              scaleNotes.map(function (note) {
                return h('span', { key: note, style: styles.chip }, note);
              })),
            h('div', { style: styles.chordButtons },
              chordChoices.map(function (chord) {
                return h('button', {
                  key: chord.symbol,
                  style: styles.smallButton,
                  onClick: function () { addChordToBar(chord.root, chord.quality); },
                  'aria-label': 'Write ' + chord.symbol + ' chord to selected bar'
                }, chord.symbol);
              })),
            h('div', { style: styles.melodyControls, role: 'group', 'aria-label': 'Melody phrase tools' },
              h('label', { style: styles.fieldLabel }, 'Phrase',
                h('select', {
                  style: styles.select,
                  value: selectedMelodyStyle,
                  onChange: function (ev) { setSelectedMelodyStyle(ev.target.value); },
                  'aria-label': 'Melody phrase style'
                },
                  melodyStyles.map(function (style) {
                    return h('option', { key: style.id, value: style.id }, style.name);
                  }))),
              h('button', {
                style: Object.assign({}, styles.wideButton, !C.ogWriteMelodyPhrase ? styles.disabledButton : null),
                onClick: writeMelodyPhrase,
                disabled: !C.ogWriteMelodyPhrase,
                'aria-label': 'Write melody phrase to selected bar'
              }, 'Write Melody')),
            h('div', { style: styles.stats },
              h('span', null, melodyNoteCount + ' melody notes'),
              h('span', null, 'Bar ' + (selectedBar + 1))),
            h('button', { style: styles.wideButton, onClick: applyProgression }, 'Seed 4-bar chord bed')),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-score-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-score-title', style: styles.h2 }, 'Score Preview'),
              h('span', { style: styles.meta }, currentMeasure.notes.length + ' notes in bar ' + (selectedBar + 1))),
            h('div', { style: styles.timeline },
              barIndexes.map(function (bar) {
                var measure = notation.measures[bar] || { notes: [], drumHits: [] };
                return h('div', { key: bar, style: styles.barCell },
                  h('strong', null, 'Bar ' + (bar + 1)),
                  h('span', null, formatMeasureSummary(measure)));
              })),
            h('div', { style: styles.license }, licenseReport.exportSafe ? 'Built-in sounds are export-safe.' : licenseReport.warnings[0])),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-song-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-song-title', style: styles.h2 }, 'Song'),
              h('span', { style: styles.meta }, songBars + ' bars')),
            h('div', { style: styles.formRow },
              h('label', { style: styles.fieldLabel }, 'Pattern',
                h('select', {
                  style: styles.select,
                  value: pattern && pattern.id || '',
                  onChange: function (ev) { choosePattern(ev.target.value); },
                  'aria-label': 'Pattern to edit'
                },
                  (project.patterns || []).map(function (item) {
                    return h('option', { key: item.id, value: item.id }, item.name);
                  }))),
              h('label', { style: styles.fieldLabel }, 'Section',
                h('select', {
                  style: styles.select,
                  value: '',
                  onChange: function (ev) {
                    if (ev.target.value === '') return;
                    var section = arrangementTimeline[Number(ev.target.value)];
                    selectArrangementSection(section);
                  },
                  'aria-label': 'Song section to edit'
                },
                  [h('option', { key: 'choose', value: '' }, 'Choose section')].concat(arrangementTimeline.map(function (section, index) {
                    return h('option', { key: section.sceneId + '-' + index, value: String(index) }, section.label + ' bars ' + section.startBar + '-' + section.endBar);
                  }))))),
            h('div', { style: styles.songControls, role: 'toolbar', 'aria-label': 'Song arrangement tools' },
              h('button', { style: styles.smallButton, onClick: appendCurrentSection }, 'Add Section'),
              h('button', { style: styles.smallButton, onClick: createPatternVariation }, 'New Variation'),
              h('button', { style: styles.wideButton, onClick: playSong }, 'Play Song')),
            h('div', { style: styles.songTimeline },
              arrangementTimeline.length ? arrangementTimeline.map(function (section, index) {
                var active = pattern && section.patternIds.indexOf(pattern.id) >= 0;
                return h('button', {
                  key: section.sceneId + '-' + index,
                  style: Object.assign({}, styles.songSection, active ? styles.songSectionActive : null),
                  onClick: function () { selectArrangementSection(section); },
                  'aria-pressed': active,
                  'aria-label': 'Edit ' + section.label + ', bars ' + section.startBar + ' through ' + section.endBar
                },
                  h('strong', null, section.label),
                  h('span', null, 'Bars ' + section.startBar + '-' + section.endBar),
                  h('span', null, section.sceneName));
              }) : h('span', { style: styles.muted }, 'No song sections yet.'))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-mixer-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-mixer-title', style: styles.h2 }, 'Mixer'),
              h('span', { style: styles.meta }, mixerSnapshot.soloActive ? 'solo active' : 'all tracks')),
            h('div', { style: styles.mixerMaster },
              h('label', { style: styles.fieldLabel }, 'Master',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 0,
                  max: 150,
                  value: Math.round((mixerSnapshot.master.gain || 0) * 100),
                  onChange: function (ev) { setMixerGain('master', ev.target.value); },
                  'aria-label': 'Master volume'
                })),
              h('span', { style: styles.mixerValue }, Math.round((mixerSnapshot.master.gain || 0) * 100) + '%')),
            h('div', { style: styles.mixerRows },
              mixerSnapshot.channels.map(function (channel) {
                return h('div', { key: channel.trackId, style: styles.mixerRow },
                  h('div', { style: styles.mixerName },
                    h('strong', null, channel.name),
                    h('span', null, channel.audible ? channel.type : 'silent')),
                  h('label', { style: styles.sliderLabel }, 'Volume',
                    h('input', {
                      style: styles.mixerSlider,
                      type: 'range',
                      min: 0,
                      max: 150,
                      value: Math.round((channel.gain || 0) * 100),
                      onChange: function (ev) { setMixerGain(channel.trackId, ev.target.value); },
                      'aria-label': channel.name + ' volume'
                    })),
                  h('span', { style: styles.mixerValue }, Math.round((channel.gain || 0) * 100) + '%'),
                  h('button', {
                    style: Object.assign({}, styles.smallButton, channel.mute ? styles.muteButtonOn : null),
                    onClick: function () { toggleMixerFlag(channel.trackId, 'mute'); },
                    'aria-pressed': channel.mute,
                    'aria-label': (channel.mute ? 'Unmute ' : 'Mute ') + channel.name
                  }, 'Mute'),
                  h('button', {
                    style: Object.assign({}, styles.smallButton, channel.solo ? styles.soloButtonOn : null),
                    onClick: function () { toggleMixerFlag(channel.trackId, 'solo'); },
                    'aria-pressed': channel.solo,
                    'aria-label': (channel.solo ? 'Unsolo ' : 'Solo ') + channel.name
                  }, 'Solo'));
              }))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-samples-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-samples-title', style: styles.h2 }, 'Samples'),
              h('span', { style: styles.meta }, sampleAssets.length + ' assets')),
            h('div', { style: styles.sampleControls },
              h('button', {
                style: Object.assign({}, styles.recordButton, recording ? styles.recordingButton : null),
                onClick: recording ? stopRecording : startRecording,
                'aria-pressed': recording,
                'aria-label': recording ? 'Stop recording selected pad' : 'Record selected pad'
              }, recording ? 'Stop' : 'Record Pad'),
              h('button', { style: styles.smallButton, onClick: openImportPicker }, 'Import'),
              h('button', { style: styles.smallButton, onClick: function () { createOwnedSampleSlot(null); } }, 'Owned Slot'),
              h('button', { style: styles.smallButton, onClick: prepareAttribution }, 'Attribution'),
              h('input', {
                ref: fileInputRef,
                type: 'file',
                accept: 'audio/*',
                style: styles.hiddenInput,
                tabIndex: -1,
                'aria-hidden': true,
                onChange: function (ev) { importAudioFile(ev.target.files && ev.target.files[0]); },
                'aria-label': 'Import audio sample'
              })),
            h('div', { style: styles.sampleEditControls, role: 'toolbar', 'aria-label': 'Sample trim and chop' },
              h('button', { style: styles.smallButton, onClick: function () { trimSelectedPadStart(0.05); } }, 'Trim In'),
              h('button', { style: styles.smallButton, onClick: resetSelectedPadRegion }, 'Full'),
              h('button', { style: styles.smallButton, onClick: function () { chopSelectedPad(4); } }, 'Chop 4')),
            h('div', { style: styles.sampleRegion },
              selectedAsset
                ? (selectedPad.name + ' - ' + (selectedPad.sampleRegion ? selectedPad.sampleRegion.startSec + 's to ' + selectedPad.sampleRegion.endSec + 's' : 'full sample'))
                : 'Select or import a sample pad'),
            h('div', { style: styles.assetList },
              sampleAssets.length ? sampleAssets.map(function (asset) {
                return h('div', { key: asset.id, style: styles.assetRow },
                  h('strong', null, asset.name),
                  h('span', null, asset.license + ' ' + (asset.storage || 'external')),
                  h('span', null, asset.mimeType || asset.source));
              }) : h('span', { style: styles.muted }, 'No samples assigned yet.')),
            h('div', { style: licenseReport.exportSafe ? styles.license : styles.warning },
              (licenseReport.exportSafe ? 'Export rights clear.' : licenseReport.warnings.join(' ')) + ' Embedded: ' + storageReport.embeddedCount + ' / ' + Math.round((storageReport.embeddedBytes || 0) / 1024) + ' KB' + ' Slices: ' + (storageReport.slicedPadCount || 0))),

          h('section', { style: styles.surface, 'aria-labelledby': 'og-project-title' },
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-project-title', style: styles.h2 }, 'Project'),
              h('span', { style: styles.meta }, project.title)),
            h('div', { style: styles.projectButtons },
              h('button', { style: styles.smallButton, onClick: saveProject }, 'Prepare JSON'),
              h('button', { style: styles.smallButton, onClick: saveThinProject }, 'Thin JSON'),
              h('button', { style: styles.smallButton, onClick: loadProjectFromText }, 'Load Text'),
              h('button', { style: styles.smallButton, onClick: downloadProject }, 'Download'),
              h('button', { style: styles.smallButton, onClick: prepareMusicXml }, 'MusicXML'),
              h('button', { style: styles.smallButton, onClick: downloadMidi }, 'MIDI')),
            h('textarea', {
              ref: jsonRef,
              defaultValue: '',
              placeholder: 'Project JSON, MusicXML, or attribution text appears here. Paste project JSON here before loading.',
              style: styles.textarea,
              'aria-label': 'Project JSON'
            })))));
  }

  var styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.72)',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      padding: '18px',
      boxSizing: 'border-box'
    },
    shell: {
      width: 'min(1180px, 100%)',
      minHeight: 'min(760px, 100%)',
      background: '#f8fafc',
      color: '#111827',
      border: '1px solid #d1d5db',
      boxShadow: '0 24px 70px rgba(15, 23, 42, 0.35)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    panel: {
      width: 'min(640px, 100%)',
      margin: 'auto',
      background: '#ffffff',
      color: '#111827',
      border: '1px solid #d1d5db',
      padding: '18px'
    },
    header: {
      minHeight: '64px',
      padding: '12px 16px',
      borderBottom: '1px solid #d1d5db',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      background: '#ffffff'
    },
    eyebrow: { fontSize: '11px', color: '#0f766e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 },
    title: { fontSize: '20px', letterSpacing: 0 },
    subtitle: { color: '#475569', fontSize: '12px', fontWeight: 700, marginTop: '2px' },
    transport: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    transportButton: { minHeight: '38px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 12px', fontWeight: 800, cursor: 'pointer' },
    tempoLabel: { minHeight: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '12px', fontWeight: 800 },
    tempoInput: { width: '70px', height: '34px', border: '1px solid #9ca3af', padding: '0 8px', fontWeight: 800 },
    swingLabel: { minHeight: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '12px', fontWeight: 800 },
    swingSlider: { width: '92px', accentColor: '#0f766e' },
    swingValue: { minWidth: '34px', color: '#475569', fontSize: '12px', fontWeight: 900 },
    iconButton: { width: '38px', height: '38px', border: '1px solid #9ca3af', background: '#111827', color: '#ffffff', fontWeight: 800, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '12px', padding: '12px', overflow: 'auto' },
    surface: { background: '#ffffff', border: '1px solid #d1d5db', padding: '12px', minWidth: 0 },
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
    h2: { margin: 0, fontSize: '16px', letterSpacing: 0 },
    meta: { color: '#475569', fontSize: '12px', fontWeight: 700, overflowWrap: 'anywhere' },
    formRow: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' },
    fieldLabel: { display: 'grid', gap: '4px', color: '#334155', fontSize: '12px', fontWeight: 800 },
    select: { width: '100%', minHeight: '34px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 8px', fontWeight: 800 },
    chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
    chip: { minWidth: '34px', minHeight: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #94a3b8', background: '#eef2ff', color: '#1e1b4b', fontSize: '12px', fontWeight: 900 },
    chordButtons: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginBottom: '8px' },
    melodyControls: { display: 'grid', gridTemplateColumns: 'minmax(128px, 1fr) minmax(128px, 1fr)', gap: '8px', alignItems: 'end', marginBottom: '10px' },
    barTabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' },
    barTab: { minHeight: '34px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: 800, cursor: 'pointer' },
    barTabOn: { background: '#ccfbf1', border: '1px solid #0f766e', color: '#0f172a' },
    starterSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: '6px', marginBottom: '10px' },
    starterChip: { minHeight: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: 900 },
    starterChipDone: { border: '1px solid #15803d', background: '#dcfce7', color: '#14532d' },
    starterActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(94px, 1fr))', gap: '6px' },
    padGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))', gap: '8px' },
    pad: { aspectRatio: '1 / 0.78', border: '1px solid #9ca3af', background: '#e5e7eb', color: '#111827', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px', cursor: 'pointer', textAlign: 'left', minWidth: 0 },
    padSelected: { background: '#ccfbf1', border: '1px solid #0f766e', boxShadow: 'inset 0 0 0 2px #0f766e' },
    padIndex: { fontSize: '11px', color: '#475569', fontWeight: 800 },
    padName: { fontSize: '13px', fontWeight: 850, lineHeight: 1.1, overflowWrap: 'anywhere' },
    steps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(32px, 1fr))', gap: '6px' },
    step: { height: '44px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#0f172a', fontSize: '12px', fontWeight: 800, cursor: 'pointer' },
    stepBeat: { border: '1px solid #475569' },
    stepOn: { background: '#fbbf24', border: '1px solid #92400e', color: '#111827' },
    grooveComposer: { display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(130px, 1fr)', gap: '8px', alignItems: 'end', marginTop: '10px' },
    grooveTools: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: '6px', marginTop: '10px' },
    stats: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', color: '#475569', fontSize: '12px', fontWeight: 700 },
    noteGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' },
    noteRow: { display: 'grid', gridTemplateColumns: '54px 1fr', gap: '6px', alignItems: 'center' },
    noteLabel: { height: '34px', border: '1px solid #94a3b8', background: '#f8fafc', color: '#0f172a', fontSize: '12px', fontWeight: 900, cursor: 'pointer' },
    noteSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(24px, 1fr))', gap: '4px' },
    noteStep: { height: '30px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#111827', fontSize: '12px', fontWeight: 900, cursor: 'pointer' },
    noteStepOn: { background: '#67e8f9', border: '1px solid #0e7490' },
    patchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: '8px' },
    patchActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' },
    timeline: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '8px' },
    songControls: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '6px', marginBottom: '10px' },
    songTimeline: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' },
    songSection: { minHeight: '78px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#111827', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', textAlign: 'left', fontSize: '12px', fontWeight: 800, cursor: 'pointer' },
    songSectionActive: { background: '#dcfce7', border: '1px solid #15803d', boxShadow: 'inset 0 0 0 2px #15803d' },
    mixerMaster: { display: 'grid', gridTemplateColumns: '1fr 48px', gap: '8px', alignItems: 'end', marginBottom: '10px' },
    mixerRows: { display: 'grid', gap: '8px' },
    mixerRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))', gap: '6px', alignItems: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px' },
    mixerName: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, fontSize: '12px', color: '#334155' },
    sliderLabel: { display: 'grid', gap: '3px', color: '#334155', fontSize: '11px', fontWeight: 800 },
    mixerSlider: { width: '100%', accentColor: '#0f766e' },
    mixerValue: { color: '#475569', fontSize: '12px', fontWeight: 900, textAlign: 'right' },
    muteButtonOn: { background: '#fee2e2', border: '1px solid #991b1b', color: '#7f1d1d' },
    soloButtonOn: { background: '#dbeafe', border: '1px solid #1d4ed8', color: '#1e3a8a' },
    learningNote: { margin: '0 0 10px', color: '#334155', fontSize: '12px', lineHeight: 1.45 },
    barCell: { minHeight: '74px', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', fontSize: '12px' },
    license: { marginTop: '10px', color: '#166534', fontWeight: 800, fontSize: '12px' },
    projectButtons: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: '6px', marginBottom: '10px' },
    smallButton: { minHeight: '32px', border: '1px solid #9ca3af', background: '#f8fafc', color: '#111827', padding: '0 10px', fontWeight: 800, cursor: 'pointer' },
    wideButton: { width: '100%', minHeight: '34px', border: '1px solid #0f766e', background: '#ccfbf1', color: '#0f172a', padding: '0 10px', fontWeight: 900, cursor: 'pointer' },
    disabledButton: { opacity: 0.45, cursor: 'not-allowed' },
    sampleControls: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '6px', marginBottom: '10px' },
    recordButton: { minHeight: '34px', border: '1px solid #991b1b', background: '#fee2e2', color: '#7f1d1d', padding: '0 10px', fontWeight: 900, cursor: 'pointer' },
    recordingButton: { background: '#7f1d1d', color: '#ffffff' },
    hiddenInput: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0, pointerEvents: 'none' },
    sampleEditControls: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))', gap: '6px', marginBottom: '8px' },
    sampleRegion: { minHeight: '30px', display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', background: '#eef2ff', color: '#1e293b', padding: '6px 8px', fontSize: '12px', fontWeight: 800, marginBottom: '8px', overflowWrap: 'anywhere' },
    assetList: { display: 'grid', gap: '6px', minHeight: '54px' },
    assetRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: '6px', alignItems: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '7px', fontSize: '12px', minWidth: 0, overflowWrap: 'anywhere' },
    warning: { marginTop: '10px', color: '#991b1b', fontWeight: 800, fontSize: '12px' },
    textarea: { width: '100%', minHeight: '170px', resize: 'vertical', border: '1px solid #cbd5e1', padding: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '12px', boxSizing: 'border-box' },
    muted: { color: '#475569' }
  };

  root.AlloModules = root.AlloModules || {};
  OpenGrooveStudio.ogAnnounce = ogAnnounce;
  OpenGrooveStudio.OPEN_GROOVE_META = {
    id: 'openGrooveStudio',
    category: 'learning',
    title: 'Open Groove Studio',
    description: 'Make beats, shape synthesizers, and learn composition with notation-aware project data.'
  };
  if (Core) {
    Object.keys(Core).forEach(function (key) {
      if (key.indexOf('og') === 0 || key.indexOf('OG_') === 0) OpenGrooveStudio[key] = Core[key];
    });
  }
  if (Scheduler) {
    Object.keys(Scheduler).forEach(function (key) {
      if (key.indexOf('og') === 0) OpenGrooveStudio[key] = Scheduler[key];
    });
  }
  if (Audio) {
    Object.keys(Audio).forEach(function (key) {
      if (key.indexOf('og') === 0) OpenGrooveStudio[key] = Audio[key];
    });
  }
  root.AlloModules.OpenGrooveStudio = OpenGrooveStudio;
})(typeof window !== 'undefined' ? window : globalThis);
