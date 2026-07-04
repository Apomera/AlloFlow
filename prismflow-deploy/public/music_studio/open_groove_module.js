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
        '.og-root[data-og-theme="dark"] button:focus-visible, .og-root[data-og-theme="dark"] input:focus-visible, .og-root[data-og-theme="dark"] select:focus-visible, .og-root[data-og-theme="dark"] [tabindex]:focus-visible { outline-color: #facc15 !important; }',
        '.og-root[data-og-theme="contrast"] button:focus-visible, .og-root[data-og-theme="contrast"] input:focus-visible, .og-root[data-og-theme="contrast"] select:focus-visible, .og-root[data-og-theme="contrast"] [tabindex]:focus-visible { outline: 3px solid #ffff00 !important; outline-offset: 3px !important; }',
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
    var themePair = React.useState('light');
    var themeMode = themePair[0];
    var setThemeMode = themePair[1];
    var styles = getOpenGrooveStyles(themeMode);
    var workspaceModePair = React.useState('learn');
    var workspaceMode = workspaceModePair[0];
    var setWorkspaceMode = workspaceModePair[1];
    var panelJumpPair = React.useState('');
    var panelJumpTarget = panelJumpPair[0];
    var setPanelJumpTarget = panelJumpPair[1];
    var loopPair = React.useState(false);
    var loopEnabled = loopPair[0];
    var setLoopEnabled = loopPair[1];
    var transportViewPair = React.useState({ active: false, mode: 'pattern', progress: 0, label: 'Stopped', loop: false });
    var transportView = transportViewPair[0];
    var setTransportView = transportViewPair[1];
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
    var keyboardOctavePair = React.useState(3);
    var keyboardOctave = keyboardOctavePair[0];
    var setKeyboardOctave = keyboardOctavePair[1];
    var keyboardStepPair = React.useState(0);
    var keyboardStep = keyboardStepPair[0];
    var setKeyboardStep = keyboardStepPair[1];
    var keyboardRecordPair = React.useState(false);
    var keyboardRecordEnabled = keyboardRecordPair[0];
    var setKeyboardRecordEnabled = keyboardRecordPair[1];
    var keyboardModePair = React.useState('single');
    var keyboardMode = keyboardModePair[0];
    var setKeyboardMode = keyboardModePair[1];
    var keyboardDurationPair = React.useState(1);
    var keyboardDurationSteps = keyboardDurationPair[0];
    var setKeyboardDurationSteps = keyboardDurationPair[1];
    var midiStatusPair = React.useState({
      supported: !!(root.navigator && root.navigator.requestMIDIAccess),
      connected: false,
      inputCount: 0,
      label: root.navigator && root.navigator.requestMIDIAccess ? 'MIDI ready' : 'MIDI unavailable'
    });
    var midiStatus = midiStatusPair[0];
    var setMidiStatus = midiStatusPair[1];
    var songFormPair = React.useState('verse-hook');
    var selectedSongFormId = songFormPair[0];
    var setSelectedSongFormId = songFormPair[1];
    var effectTrackPair = React.useState(initialProjectRef.current.tracks[1] && initialProjectRef.current.tracks[1].id || initialProjectRef.current.tracks[0] && initialProjectRef.current.tracks[0].id || '');
    var selectedEffectTrackId = effectTrackPair[0];
    var setSelectedEffectTrackId = effectTrackPair[1];
    var automationTargetPair = React.useState('effect.filter.cutoff');
    var selectedAutomationTarget = automationTargetPair[0];
    var setSelectedAutomationTarget = automationTargetPair[1];
    var automationCurvePair = React.useState('linear');
    var automationCurveMode = automationCurvePair[0];
    var setAutomationCurveMode = automationCurvePair[1];
    var automationValuePair = React.useState(12000);
    var automationValue = automationValuePair[0];
    var setAutomationValue = automationValuePair[1];
    var automationStepPair = React.useState(0);
    var automationStep = automationStepPair[0];
    var setAutomationStep = automationStepPair[1];
    var grooveStylePair = React.useState('boomBap');
    var selectedGrooveStyle = grooveStylePair[0];
    var setSelectedGrooveStyle = grooveStylePair[1];
    var melodyStylePair = React.useState('balanced');
    var selectedMelodyStyle = melodyStylePair[0];
    var setSelectedMelodyStyle = melodyStylePair[1];
    var stemModePair = React.useState('four');
    var selectedStemMode = stemModePair[0];
    var setSelectedStemMode = stemModePair[1];
    var stemEnginePair = React.useState('manual-import');
    var selectedStemEngine = stemEnginePair[0];
    var setSelectedStemEngine = stemEnginePair[1];
    var notationEntryPair = React.useState('C4:q D4:q Eb4:h | G4:h R:q Bb4:q');
    var notationEntry = notationEntryPair[0];
    var setNotationEntry = notationEntryPair[1];
    var staffPitchPair = React.useState('C5');
    var staffPitch = staffPitchPair[0];
    var setStaffPitch = staffPitchPair[1];
    var staffDurationPair = React.useState('q');
    var staffDuration = staffDurationPair[0];
    var setStaffDuration = staffDurationPair[1];
    var staffToolPair = React.useState('note');
    var staffTool = staffToolPair[0];
    var setStaffTool = staffToolPair[1];
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
    var transportRef = React.useRef({ token: 0, timers: [], interval: null });
    var recorderRef = React.useRef(null);
    var recorderChunksRef = React.useRef([]);
    var fileInputRef = React.useRef(null);
    var midiAccessRef = React.useRef(null);
    var midiHandlerRef = React.useRef(null);
    var pattern = C.ogFindPattern && C.ogFindPattern(project, selectedPatternId) || project.patterns[0];
    var drumTrack = project.tracks.find(function (track) { return track.type === 'drumRack'; });
    var synthTrack = project.tracks.find(function (track) { return track.type === 'synth'; });
    var selectedPad = drumTrack && drumTrack.pads.find(function (pad) { return pad.id === selectedPadId; });
    var selectedAsset = selectedPad && selectedPad.assetId && C.ogFindAsset ? C.ogFindAsset(project, selectedPad.assetId) : null;
    var stepsPerBar = 16;
    var synthPitches = ['C4', 'Bb3', 'G3', 'Eb3', 'C3', 'Bb2', 'G2', 'C2'];
    var keyboardLayout = C.ogBuildKeyboardLayout ? C.ogBuildKeyboardLayout(project, { octave: keyboardOctave, octaves: 2 }) : { keys: [] };
    var keyboardModeLabel = keyboardMode === 'triad' ? 'Triad assist' : 'Single notes';
    var keyboardLengthOptions = [1, 2, 4, 8].filter(function (steps) { return steps <= stepsPerBar; });
    if (keyboardLengthOptions.indexOf(keyboardDurationSteps) === -1) keyboardLengthOptions.push(keyboardDurationSteps);
    var workspaceModes = [
      { id: 'learn', label: 'Learn', summary: 'Starter, beat, keyboard, harmony, score', sections: ['start', 'pads', 'steps', 'keyboard', 'harmony', 'score', 'project'] },
      { id: 'compose', label: 'Compose', summary: 'Keyboard, synth notes, harmony, score, song', sections: ['start', 'synth', 'keyboard', 'harmony', 'score', 'song', 'project'] },
      { id: 'produce', label: 'Produce', summary: 'Pads, patch, mixer, effects, samples, stems', sections: ['pads', 'steps', 'patch', 'mixer', 'effects', 'samples', 'stems', 'project'] },
      { id: 'all', label: 'All', summary: 'Every Open Groove panel', sections: null }
    ];
    var workspaceModeConfig = workspaceModes.filter(function (mode) { return mode.id === workspaceMode; })[0] || workspaceModes[0];
    var workspaceSections = [
      { id: 'start', label: 'Starter Path' },
      { id: 'pads', label: 'Pads' },
      { id: 'steps', label: 'Steps' },
      { id: 'synth', label: 'Synth Notes' },
      { id: 'keyboard', label: 'Keyboard' },
      { id: 'patch', label: 'Synth Patch' },
      { id: 'harmony', label: 'Harmony' },
      { id: 'score', label: 'Score Preview' },
      { id: 'song', label: 'Song' },
      { id: 'mixer', label: 'Mixer' },
      { id: 'effects', label: 'Effects' },
      { id: 'samples', label: 'Samples' },
      { id: 'stems', label: 'Stem Prep' },
      { id: 'project', label: 'Project' }
    ];
    var visibleWorkspaceSections = workspaceSections.filter(function (section) {
      return !workspaceModeConfig.sections || workspaceModeConfig.sections.indexOf(section.id) >= 0;
    });
    var panelJumpValue = visibleWorkspaceSections.some(function (section) { return section.id === panelJumpTarget; })
      ? panelJumpTarget
      : (visibleWorkspaceSections[0] && visibleWorkspaceSections[0].id || '');
    var staffPitches = ['C6', 'B5', 'Bb5', 'A5', 'G5', 'F5', 'E5', 'Eb5', 'D5', 'C5', 'B4', 'Bb4', 'A4', 'G4', 'F4', 'E4', 'Eb4', 'D4', 'C4'];
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

    React.useEffect(function () {
      return function () {
        clearTransportSchedule(false);
      };
    }, []);

    React.useEffect(function () {
      midiHandlerRef.current = handleMidiMessage;
    });

    React.useEffect(function () {
      return function () {
        var access = midiAccessRef.current;
        if (access && access.inputs) {
          access.inputs.forEach(function (input) {
            input.onmidimessage = null;
          });
        }
        if (access) access.onstatechange = null;
      };
    }, []);

    React.useEffect(function () {
      function handleComputerKey(ev) {
        if (!ev || ev.repeat || ev.altKey || ev.ctrlKey || ev.metaKey) return;
        var target = ev.target || {};
        var tag = String(target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
        var keyName = String(ev.key || '').toUpperCase();
        var key = (keyboardLayout.keys || []).find(function (item) { return item.computerKey === keyName; });
        if (!key) return;
        ev.preventDefault();
        playKeyboardPitch(key.pitch, 0.74, 'computerKeyboard');
      }
      if (root.addEventListener) root.addEventListener('keydown', handleComputerKey);
      return function () {
        if (root.removeEventListener) root.removeEventListener('keydown', handleComputerKey);
      };
    }, [keyboardOctave, keyboardRecordEnabled, keyboardMode, keyboardDurationSteps, keyboardStep, selectedBar, selectedPatternId, project]);

    function mutate(fn) {
      var next = clone(project);
      fn(next);
      setProject(next);
    }

    function currentPatternIn(proj) {
      return C.ogFindPattern && C.ogFindPattern(proj, selectedPatternId) || proj.patterns[0];
    }

    function clearTransportSchedule(resetView) {
      var ref = transportRef.current;
      (ref.timers || []).forEach(function (timerId) { root.clearTimeout(timerId); });
      ref.timers = [];
      if (ref.interval) root.clearInterval(ref.interval);
      ref.interval = null;
      if (resetView) setTransportView({ active: false, mode: 'pattern', progress: 0, label: 'Stopped', loop: loopEnabled });
    }

    function addTransportTimer(fn, delayMs) {
      var id = root.setTimeout(fn, Math.max(0, delayMs || 0));
      transportRef.current.timers.push(id);
      return id;
    }

    function secondsForTicks(ticks) {
      return S && S.ogTicksToSeconds
        ? S.ogTicksToSeconds(ticks, project.bpm, project.ppq)
        : (Number(ticks) || 0) * 60 / ((Number(project.bpm) || 120) * (Number(project.ppq) || 960));
    }

    function formatTransportLabel(mode, progress, totalTicks, loop) {
      var safeTicks = Math.max(1, totalTicks || 1);
      var tick = Math.min(safeTicks - 1, Math.max(0, Math.floor(progress * safeTicks)));
      var position = C.ogTickToPosition ? C.ogTickToPosition(project, tick) : { bar: 1, beat: 1, tick: 0 };
      return (mode === 'song' ? 'Song' : 'Pattern') + (loop ? ' loop' : '') + ' - Bar ' + position.bar + ', beat ' + position.beat + ' - ' + Math.round(progress * 100) + '%';
    }

    function startTransportView(mode, durationSec, totalTicks, loop, startTime, token) {
      if (transportRef.current.interval) root.clearInterval(transportRef.current.interval);
      transportRef.current.mode = mode;
      transportRef.current.startTime = startTime;
      transportRef.current.durationSec = durationSec;
      transportRef.current.totalTicks = totalTicks;
      function update() {
        if (transportRef.current.token !== token) return;
        var activeLoop = !!transportRef.current.loop;
        var engine = engineRef.current;
        var now = engine && engine.ctx ? engine.ctx.currentTime : Date.now() / 1000;
        var elapsed = Math.max(0, now - startTime);
        var safeDuration = Math.max(0.001, durationSec || 0.001);
        var cycleElapsed = activeLoop ? elapsed % safeDuration : Math.min(elapsed, safeDuration);
        var progress = Math.max(0, Math.min(1, cycleElapsed / safeDuration));
        var label = formatTransportLabel(mode, progress, totalTicks, activeLoop);
        setTransportView({ active: true, mode: mode, progress: progress, label: label, loop: activeLoop });
        if (!activeLoop && elapsed >= safeDuration) {
          clearTransportSchedule(false);
          setPlaying(false);
          setTransportView({ active: false, mode: mode, progress: 1, label: formatTransportLabel(mode, 1, totalTicks, false), loop: false });
        }
      }
      transportRef.current.interval = root.setInterval(update, 100);
      update();
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

    function isWorkspaceSectionVisible(sectionId) {
      return !workspaceModeConfig.sections || workspaceModeConfig.sections.indexOf(sectionId) >= 0;
    }

    function workspaceSectionProps(sectionId, labelledBy) {
      var visible = isWorkspaceSectionVisible(sectionId);
      return {
        id: 'og-section-' + sectionId,
        style: visible ? styles.surface : Object.assign({}, styles.surface, styles.hiddenSection),
        'aria-labelledby': labelledBy,
        'aria-hidden': visible ? undefined : true,
        tabIndex: visible ? -1 : undefined
      };
    }

    function changeWorkspaceMode(modeId) {
      var nextMode = workspaceModes.filter(function (mode) { return mode.id === modeId; })[0] || workspaceModes[0];
      setWorkspaceMode(nextMode.id);
      ogAnnounce(nextMode.label + ' workspace');
    }

    function labelForWorkspaceSection(sectionId) {
      var section = workspaceSections.filter(function (item) { return item.id === sectionId; })[0];
      return section && section.label || 'panel';
    }

    function jumpToWorkspaceSection(sectionId) {
      if (!sectionId || !root.document) return;
      setPanelJumpTarget(sectionId);
      var target = root.document.getElementById('og-section-' + sectionId);
      if (!target) return;
      if (target.focus) {
        try {
          target.focus({ preventScroll: true });
        } catch (_) {
          target.focus();
        }
      }
      if (target.scrollIntoView) target.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
      ogAnnounce('Moved to ' + labelForWorkspaceSection(sectionId));
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
          return chord.symbol + (chord.roman ? ' ' + chord.roman : '') + '@' + chord.startBeat;
        }).join(', '));
      }
      if (measure.notes && measure.notes.length) {
        parts.push('Notes: ' + measure.notes.map(function (note) {
          return note.pitch + (note.solfege ? ' ' + note.solfege : '') + '@' + note.startBeat;
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

    function keyboardPerformanceFor(pitch) {
      if (keyboardMode === 'triad' && C.ogBuildKeyboardChord) {
        try {
          var chord = C.ogBuildKeyboardChord(project, pitch);
          return { pitches: chord.pitches || [pitch], label: chord.label || chord.symbol || pitch };
        } catch (_) {}
      }
      return { pitches: [pitch], label: pitch };
    }

    function recordKeyboardNotes(pitches, velocity, source) {
      if (!pattern || !synthTrack || !C.ogSetNoteStep) return;
      var step = selectedBar * stepsPerBar + Math.max(0, Math.min(stepsPerBar - 1, keyboardStep));
      var durationSteps = Math.max(1, Math.min(stepsPerBar, Math.round(Number(keyboardDurationSteps) || 1)));
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        if (!nextPattern || !nextSynth) return;
        var durationTicks = Math.round(C.ogTicksPerMeasure(next) / stepsPerBar) * durationSteps;
        (pitches || []).forEach(function (pitch) {
          C.ogSetNoteStep(next, nextPattern.id, nextSynth.id, pitch, step, stepsPerBar, {
            on: true,
            velocity: velocity || 0.75,
            durationTicks: durationTicks,
            role: keyboardMode === 'triad' ? 'keyboardChord' : 'keyboard',
            source: source || 'virtualKeyboard'
          });
        });
      });
      setKeyboardStep(function (value) { return (Math.max(0, value) + 1) % stepsPerBar; });
    }

    function playKeyboardPitch(pitch, velocity, source) {
      if (!pitch) return;
      var performance = keyboardPerformanceFor(pitch);
      (performance.pitches || [pitch]).forEach(function (nextPitch) {
        triggerNote(nextPitch, velocity || 0.75);
      });
      if (keyboardRecordEnabled) recordKeyboardNotes(performance.pitches, velocity || 0.75, source);
      ogAnnounce(performance.label + (keyboardRecordEnabled ? ' recorded' : ' played'));
    }

    function playKeyboardMidi(midi, velocity, source) {
      if (!C.ogMidiToNoteName) return;
      var pitch = C.ogMidiToNoteName(midi);
      playKeyboardPitch(pitch, velocity || 0.75, source);
    }

    function handleMidiMessage(ev) {
      var data = ev && ev.data || [];
      var command = data[0] & 240;
      var midi = data[1];
      var velocity = data[2] || 0;
      if (command === 144 && velocity > 0 && midi != null) playKeyboardMidi(midi, velocity / 127, 'hardwareMidi');
    }

    function wireMidiInputs(access) {
      var inputs = [];
      if (access && access.inputs) {
        access.inputs.forEach(function (input) {
          inputs.push(input);
          input.onmidimessage = function (ev) {
            if (midiHandlerRef.current) midiHandlerRef.current(ev);
          };
        });
      }
      setMidiStatus({
        supported: true,
        connected: inputs.length > 0,
        inputCount: inputs.length,
        label: inputs.length ? (inputs[0].name || inputs[0].id || 'MIDI input') : 'No MIDI inputs'
      });
      return inputs.length;
    }

    function connectMidiInput() {
      if (!root.navigator || !root.navigator.requestMIDIAccess) {
        setMidiStatus({ supported: false, connected: false, inputCount: 0, label: 'MIDI unavailable' });
        addToast('MIDI input is not available in this browser.', 'info');
        return;
      }
      root.navigator.requestMIDIAccess({ sysex: false }).then(function (access) {
        midiAccessRef.current = access;
        var count = wireMidiInputs(access);
        access.onstatechange = function () { wireMidiInputs(access); };
        addToast(count ? 'MIDI input connected.' : 'No MIDI input found.', count ? 'success' : 'info');
        ogAnnounce(count ? 'MIDI input connected' : 'No MIDI input found');
      }, function (err) {
        setMidiStatus({ supported: true, connected: false, inputCount: 0, label: 'MIDI blocked' });
        addToast('MIDI connection failed: ' + (err && err.message || 'permission blocked'), 'error');
      });
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

    function automationStepSize(spec) {
      if (!spec) return 0.01;
      if (spec.unit === 'Hz') return 10;
      if (spec.unit === 's') return 0.01;
      if (spec.unit === 'Q') return 0.1;
      return 0.01;
    }

    function formatAutomationValue(spec, value) {
      var number = Number(value);
      if (!spec || !isFinite(number)) return String(value);
      if (spec.unit === '%') return Math.round(number * 100) + '%';
      if (spec.unit === 'Hz') return Math.round(number) + ' Hz';
      if (spec.unit === 's') return Math.round(number * 100) / 100 + ' s';
      if (spec.unit === 'Q') return Math.round(number * 10) / 10 + ' Q';
      return String(Math.round(number * 100) / 100);
    }

    function effectParamSpec(effectType, param, targets) {
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].effect === effectType && targets[i].param === param) return targets[i];
      }
      return null;
    }

    function setEffectParam(effectType, param, value) {
      if (!C.ogSetTrackEffect || !selectedEffectTrackId) return;
      mutate(function (next) {
        var targetTrack = C.ogFindTrack(next, selectedEffectTrackId) || next.tracks[0];
        if (!targetTrack) return;
        var params = {};
        params[param] = value;
        C.ogSetTrackEffect(next, targetTrack.id, effectType, { enabled: true, params: params });
      });
    }

    function toggleTrackEffect(effectType, enabled) {
      if (!C.ogSetTrackEffect || !selectedEffectTrackId) return;
      mutate(function (next) {
        var targetTrack = C.ogFindTrack(next, selectedEffectTrackId) || next.tracks[0];
        if (targetTrack) C.ogSetTrackEffect(next, targetTrack.id, effectType, { enabled: enabled });
      });
    }

    function changeAutomationTarget(targetId) {
      setSelectedAutomationTarget(targetId);
      var targets = C.ogListAutomationTargets ? C.ogListAutomationTargets() : [];
      var spec = targets.filter(function (target) { return target.id === targetId; })[0];
      setAutomationValue(spec ? spec.defaultValue : 0);
    }

    function writeAutomationPoint() {
      if (!C.ogSetAutomationPoint || !pattern || !selectedEffectTrackId) return;
      var trackName = 'track';
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var targetTrack = C.ogFindTrack(next, selectedEffectTrackId) || next.tracks[0];
        if (!nextPattern || !targetTrack) return;
        trackName = targetTrack.name;
        C.ogSetAutomationPoint(next, nextPattern.id, targetTrack.id, selectedAutomationTarget, selectedBar * stepsPerBar + automationStep, stepsPerBar, Number(automationValue), { source: 'effectsPanel', curve: automationCurveMode });
      });
      addToast('Automation point written for ' + trackName + '.', 'success');
      ogAnnounce('Automation point written');
    }

    function writeAutomationPointAt(localStep, value, source) {
      if (!C.ogSetAutomationPoint || !pattern || !selectedEffectTrackId) return;
      var step = Math.max(0, Math.min(stepsPerBar - 1, Math.round(Number(localStep) || 0)));
      var nextValue = C.ogNormalizeAutomationValue ? C.ogNormalizeAutomationValue(automationSpec, value) : value;
      setAutomationStep(step);
      setAutomationValue(nextValue);
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var targetTrack = C.ogFindTrack(next, selectedEffectTrackId) || next.tracks[0];
        if (nextPattern && targetTrack) {
          C.ogSetAutomationPoint(next, nextPattern.id, targetTrack.id, selectedAutomationTarget, selectedBar * stepsPerBar + step, stepsPerBar, nextValue, {
            source: source || 'curveEditor',
            curve: automationCurveMode
          });
        }
      });
    }

    function automationPointFromPointer(ev) {
      var rect = ev.currentTarget && ev.currentTarget.getBoundingClientRect ? ev.currentTarget.getBoundingClientRect() : null;
      if (!rect || !rect.width || !rect.height) return null;
      var x = Math.max(0, Math.min(1, ((ev.clientX || 0) - rect.left) / rect.width));
      var y = Math.max(0, Math.min(1, ((ev.clientY || 0) - rect.top) / rect.height));
      var step = Math.round(x * (stepsPerBar - 1));
      var value = automationSpec.max - y * (automationSpec.max - automationSpec.min);
      return { step: step, value: value };
    }

    function handleAutomationCurvePointer(ev) {
      if (ev.type === 'pointermove' && ev.buttons !== 1) return;
      if (ev.preventDefault) ev.preventDefault();
      if (ev.currentTarget && ev.currentTarget.setPointerCapture && ev.pointerId != null) {
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (_) {}
      }
      var point = automationPointFromPointer(ev);
      if (point) writeAutomationPointAt(point.step, point.value, 'curveEditor');
    }

    function clearAutomationPoint() {
      if (!C.ogSetAutomationPoint || !pattern || !selectedEffectTrackId) return;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var targetTrack = C.ogFindTrack(next, selectedEffectTrackId) || next.tracks[0];
        if (nextPattern && targetTrack) C.ogSetAutomationPoint(next, nextPattern.id, targetTrack.id, selectedAutomationTarget, selectedBar * stepsPerBar + automationStep, stepsPerBar, null, { clear: true });
      });
      addToast('Automation point cleared.', 'info');
      ogAnnounce('Automation point cleared');
    }

    function previewEffectRack() {
      if (!A || !selectedEffectTrackId) return;
      var engine = ensureAudioEngine(false);
      if (!engine) return;
      var targetTrack = C.ogFindTrack(project, selectedEffectTrackId) || synthTrack || drumTrack;
      if (!targetTrack) return;
      var stepTicks = Math.round(C.ogTicksPerMeasure(project) / stepsPerBar);
      var tick = selectedBar * C.ogTicksPerMeasure(project) + automationStep * stepTicks;
      var effects = C.ogResolveTrackEffectsAtTick ? C.ogResolveTrackEffectsAtTick(project, pattern && pattern.id, targetTrack.id, tick) : C.ogGetTrackEffects ? C.ogGetTrackEffects(project, targetTrack.id) : [];
      var when = engine.ctx.currentTime + 0.01;
      if (targetTrack.type === 'drumRack') A.ogPlayDrum(engine, 'kick', when, 0.85, effects);
      else A.ogPlayNote(engine, {
        pitch: 'C4',
        midi: C.ogNoteNameToMidi ? C.ogNoteNameToMidi('C4') : 60,
        velocity: 0.78,
        instrument: targetTrack.instrument || synthTrack && synthTrack.instrument,
        effects: effects
      }, when, 0.36);
      ogAnnounce('Effects preview');
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

    function buildSongForm() {
      if (!pattern || !C.ogApplySongFormPreset) return;
      var summary = null;
      var focusPatternId = null;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        summary = C.ogApplySongFormPreset(next, selectedSongFormId, {
          patternId: nextPattern.id,
          replace: true
        });
        focusPatternId = summary && summary.createdPatternIds && summary.createdPatternIds[0] || nextPattern.id;
      });
      if (focusPatternId) choosePattern(focusPatternId);
      addToast((summary && summary.name || 'Song form') + ' built with ' + (summary && summary.sectionCount || 0) + ' sections.', 'success');
      ogAnnounce('Song form built');
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

    function writeNotationEntry() {
      if (!pattern || !synthTrack || !C.ogWriteNotationInput) return;
      var summary = { noteCount: 0, warnings: [] };
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        summary = C.ogWriteNotationInput(next, nextPattern.id, nextSynth.id, notationEntry, {
          startBar: selectedBar,
          defaultDuration: 'q',
          octave: 4,
          replace: true
        });
      });
      var skipped = summary.warnings && summary.warnings.length ? ' ' + summary.warnings.length + ' skipped.' : '';
      addToast((summary.noteCount || 0) + ' notation notes written.' + skipped, summary.noteCount ? 'success' : 'info');
      ogAnnounce('Notation input written');
    }

    function writeStaffSlot(barIndex, startBeat) {
      if (!pattern || !synthTrack || !C.ogSetStaffNote) return;
      var result = null;
      mutate(function (next) {
        var nextPattern = currentPatternIn(next);
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        result = C.ogSetStaffNote(next, nextPattern.id, nextSynth.id, {
          startBar: barIndex,
          startBeat: startBeat,
          pitch: staffPitch,
          duration: staffDuration,
          tool: staffTool,
          rest: staffTool === 'rest',
          replaceSlot: true
        });
      });
      if (staffTool === 'rest') {
        addToast('Staff slot cleared.', 'success');
        ogAnnounce('Staff slot cleared');
      } else {
        triggerNote(staffPitch, 0.72);
        addToast(staffPitch + ' written on the staff.', 'success');
        ogAnnounce(staffPitch + ' written');
      }
      return result;
    }

    function staffSlotKey(ev, barIndex, startBeat) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        writeStaffSlot(barIndex, startBeat);
      }
    }

    function renderEngravedStaff() {
      if (!staffEngraving || !staffEngraving.measures || !staffEngraving.measures.length) {
        return h('div', { style: styles.sampleRegion }, 'Staff editor unavailable for this pattern.');
      }
      var g = staffEngraving.geometry;
      var ink = themeMode === 'contrast' ? '#ffffff' : themeMode === 'dark' ? '#f8fafc' : '#111827';
      var paper = themeMode === 'contrast' ? '#000000' : themeMode === 'dark' ? '#020617' : '#ffffff';
      var accent = themeMode === 'contrast' ? '#ffff00' : themeMode === 'dark' ? '#5eead4' : '#0f766e';
      var muted = themeMode === 'contrast' ? '#ffffff' : themeMode === 'dark' ? '#94a3b8' : '#94a3b8';
      var children = [
        h('rect', { key: 'paper', x: 0, y: 0, width: staffEngraving.width, height: staffEngraving.height, fill: paper }),
        h('text', { key: 'clef', x: 14, y: g.staffTop + g.lineSpacing * 3.1, fill: ink, fontSize: 34, fontFamily: 'Georgia, serif', fontWeight: 700 }, 'G'),
        h('text', { key: 'time', x: 32, y: g.staffTop + g.lineSpacing * 1.1, fill: ink, fontSize: 12, fontWeight: 900 }, String(staffEngraving.timeSignature[0])),
        h('text', { key: 'time2', x: 32, y: g.staffTop + g.lineSpacing * 3.1, fill: ink, fontSize: 12, fontWeight: 900 }, String(staffEngraving.timeSignature[1]))
      ];
      for (var line = 0; line < 5; line++) {
        var y = g.staffTop + line * g.lineSpacing;
        children.push(h('line', { key: 'line-' + line, x1: g.left, y1: y, x2: staffEngraving.width - g.right, y2: y, stroke: ink, strokeWidth: 1 }));
      }
      staffEngraving.measures.forEach(function (measure, measureIndex) {
        var barX = measure.x;
        var endX = measure.x + measure.width;
        if (measure.selected) {
          children.push(h('rect', { key: 'sel-' + measure.bar, x: barX + 1, y: g.staffTop - 26, width: measure.width - 2, height: g.lineSpacing * 7.4, fill: accent, opacity: 0.1 }));
        }
        children.push(h('line', { key: 'bar-' + measure.bar, x1: barX, y1: g.staffTop, x2: barX, y2: g.bottomY, stroke: ink, strokeWidth: measureIndex === 0 ? 1.5 : 1 }));
        children.push(h('line', { key: 'bar-end-' + measure.bar, x1: endX, y1: g.staffTop, x2: endX, y2: g.bottomY, stroke: ink, strokeWidth: measure.bar === staffEngraving.measures.length ? 2 : 1 }));
        children.push(h('text', { key: 'bar-label-' + measure.bar, x: barX + 4, y: g.staffTop - 12, fill: muted, fontSize: 10, fontWeight: 800 }, String(measure.bar)));
        (measure.slots || []).forEach(function (slot) {
          children.push(h('rect', {
            key: 'slot-' + measure.bar + '-' + slot.index,
            x: slot.x - 7,
            y: g.staffTop - 24,
            width: 14,
            height: g.lineSpacing * 8,
            fill: accent,
            opacity: 0.001,
            role: 'button',
            tabIndex: 0,
            focusable: 'true',
            'aria-label': 'Write ' + (staffTool === 'rest' ? 'rest' : staffPitch) + ' in bar ' + measure.bar + ' beat ' + slot.startBeat,
            onClick: function () { writeStaffSlot(measure.bar - 1, slot.startBeat); },
            onKeyDown: function (ev) { staffSlotKey(ev, measure.bar - 1, slot.startBeat); }
          }));
          if (slot.index % 2 === 0) {
            children.push(h('line', { key: 'slot-line-' + measure.bar + '-' + slot.index, x1: slot.x, y1: g.staffTop + g.lineSpacing * 4.7, x2: slot.x, y2: g.staffTop + g.lineSpacing * 5.45, stroke: muted, strokeWidth: 0.8, opacity: 0.65 }));
          }
        });
        (measure.chords || []).forEach(function (chord, chordIndex) {
          children.push(h('text', { key: 'chord-' + measure.bar + '-' + chordIndex, x: chord.x - 8, y: chord.y, fill: accent, fontSize: 12, fontWeight: 900 }, chord.symbol || chord.roman || ''));
        });
        (measure.notes || []).forEach(function (note, noteIndex) {
          var key = 'note-' + measure.bar + '-' + noteIndex + '-' + note.pitch;
          (note.ledgerLines || []).forEach(function (ly, ledgerIndex) {
            children.push(h('line', { key: key + '-ledger-' + ledgerIndex, x1: note.x - 11, y1: ly, x2: note.x + 11, y2: ly, stroke: ink, strokeWidth: 1 }));
          });
          if (note.accidental) {
            children.push(h('text', { key: key + '-acc', x: note.x - 21, y: note.y + 4, fill: ink, fontSize: 13, fontWeight: 900 }, note.accidental));
          }
          children.push(h('ellipse', {
            key: key + '-head',
            cx: note.x,
            cy: note.y,
            rx: g.noteHeadWidth / 2,
            ry: g.noteHeadHeight / 2,
            transform: 'rotate(-18 ' + note.x + ' ' + note.y + ')',
            fill: note.openHead ? paper : ink,
            stroke: ink,
            strokeWidth: 1.3
          }));
          if (note.stem) {
            var stemX = note.stemUp ? note.x + 5 : note.x - 5;
            var stemEnd = note.stemUp ? note.y - 32 : note.y + 32;
            children.push(h('line', { key: key + '-stem', x1: stemX, y1: note.y, x2: stemX, y2: stemEnd, stroke: ink, strokeWidth: 1.4 }));
            if (note.durationName === 'eighth' || note.durationName === 'sixteenth') {
              children.push(h('path', {
                key: key + '-flag',
                d: note.stemUp
                  ? 'M ' + stemX + ' ' + stemEnd + ' C ' + (stemX + 16) + ' ' + (stemEnd + 4) + ' ' + (stemX + 14) + ' ' + (stemEnd + 16) + ' ' + (stemX + 4) + ' ' + (stemEnd + 18)
                  : 'M ' + stemX + ' ' + stemEnd + ' C ' + (stemX - 16) + ' ' + (stemEnd - 4) + ' ' + (stemX - 14) + ' ' + (stemEnd - 16) + ' ' + (stemX - 4) + ' ' + (stemEnd - 18),
                fill: 'none',
                stroke: ink,
                strokeWidth: 1.4
              }));
            }
          }
        });
      });
      return h('svg', {
        style: styles.staffSvg,
        viewBox: '0 0 ' + staffEngraving.width + ' ' + staffEngraving.height,
        role: 'img',
        'aria-label': 'Editable engraved treble staff'
      }, children);
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

    function prepareStemSlots() {
      if (!C.ogPrepareStemSlots) {
        addToast('Stem preparation is not available in this build yet.', 'info');
        return;
      }
      var prepared = null;
      mutate(function (next) {
        prepared = C.ogPrepareStemSlots(next, {
          mode: selectedStemMode,
          engineId: selectedStemEngine,
          sourceAssetId: selectedAsset && selectedAsset.id,
          sourceName: selectedAsset && selectedAsset.name || project.title || 'Source mix',
          userConfirmedRights: true,
          createdAt: Date.now()
        });
      });
      var count = prepared && prepared.assets ? prepared.assets.length : 0;
      addToast(count + ' stem slot' + (count === 1 ? '' : 's') + ' prepared for import or separation.', 'success');
      ogAnnounce('Stem slots prepared');
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

    function toggleLoopMode() {
      var next = !loopEnabled;
      setLoopEnabled(next);
      transportRef.current.loop = next;
      if (!next) {
        (transportRef.current.timers || []).forEach(function (timerId) { root.clearTimeout(timerId); });
        transportRef.current.timers = [];
      }
      if (next && playing && engineRef.current && transportRef.current.durationSec) {
        var ref = transportRef.current;
        var elapsed = Math.max(0, engineRef.current.ctx.currentTime - (ref.startTime || engineRef.current.ctx.currentTime));
        var nextIndex = Math.max(1, Math.floor(elapsed / ref.durationSec) + 1);
        var nextStart = (ref.startTime || engineRef.current.ctx.currentTime) + nextIndex * ref.durationSec;
        if (ref.mode === 'song') {
          addTransportTimer(function () { scheduleSongCycle(engineRef.current, nextStart, ref.token, ref.durationSec); }, (nextStart - engineRef.current.ctx.currentTime - 0.14) * 1000);
        } else {
          addTransportTimer(function () { schedulePatternCycle(engineRef.current, nextStart, ref.token, nextIndex, ref.durationSec, ref.totalTicks); }, (nextStart - engineRef.current.ctx.currentTime - 0.14) * 1000);
        }
      }
      addToast('Loop ' + (next ? 'on' : 'off') + '.', 'info');
      ogAnnounce('Loop ' + (next ? 'on' : 'off'));
    }

    function schedulePatternCycle(engine, startTime, token, loopIndex, durationSec, lengthTicks) {
      if (!S || !A || !pattern || transportRef.current.token !== token) return;
      if (loopIndex > 0 && !transportRef.current.loop) return;
      var plan = S.ogBuildLoopPlaybackPlan
        ? S.ogBuildLoopPlaybackPlan(project, {
          patternId: pattern.id,
          transportTick: loopIndex * lengthTicks,
          lookaheadTicks: lengthTicks,
          originTime: startTime
        })
        : S.ogBuildPlaybackPlan(project, { patternId: pattern.id, originTime: startTime });
      A.ogSchedulePlan(engine, plan, { baseTime: 0 });
      if (!transportRef.current.loop) return;
      addTransportTimer(function () {
        schedulePatternCycle(engine, startTime + durationSec, token, loopIndex + 1, durationSec, lengthTicks);
      }, (startTime + durationSec - engine.ctx.currentTime - 0.14) * 1000);
    }

    function scheduleSongCycle(engine, startTime, token, durationSec) {
      if (!S || !A || !S.ogBuildArrangementPlaybackPlan || transportRef.current.token !== token) return;
      if (!transportRef.current.loop) return;
      var plan = S.ogBuildArrangementPlaybackPlan(project, { originTime: startTime });
      A.ogSchedulePlan(engine, plan, { baseTime: 0 });
      if (!transportRef.current.loop) return;
      addTransportTimer(function () {
        scheduleSongCycle(engine, startTime + durationSec, token, durationSec);
      }, (startTime + durationSec - engine.ctx.currentTime - 0.14) * 1000);
    }

    function playLoop() {
      if (!A || !S || !pattern) return;
      var engine = ensureAudioEngine(true);
      if (!engine) return;
      clearTransportSchedule(false);
      var token = transportRef.current.token + 1;
      transportRef.current.token = token;
      transportRef.current.loop = loopEnabled;
      restoreEmbeddedSamplesFor(project, true);
      var now = engine.ctx.currentTime + 0.05;
      var lengthTicks = Math.max(1, C.ogBarsToTicks(project, pattern.bars));
      var durationSec = Math.max(0.05, secondsForTicks(lengthTicks));
      schedulePatternCycle(engine, now, token, 0, durationSec, lengthTicks);
      setPlaying(true);
      startTransportView('pattern', durationSec, lengthTicks, loopEnabled, now, token);
      ogAnnounce(loopEnabled ? 'Playing pattern loop' : 'Playing pattern');
    }

    function playSong() {
      if (!A || !S || !S.ogBuildArrangementPlaybackPlan) return;
      var engine = ensureAudioEngine(true);
      if (!engine) return;
      clearTransportSchedule(false);
      var token = transportRef.current.token + 1;
      transportRef.current.token = token;
      transportRef.current.loop = loopEnabled;
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
      var durationSec = Math.max(0.05, secondsForTicks(endTick));
      if (loopEnabled) {
        addTransportTimer(function () {
          scheduleSongCycle(engine, now + durationSec, token, durationSec);
        }, (now + durationSec - engine.ctx.currentTime - 0.14) * 1000);
      }
      setPlaying(true);
      startTransportView('song', durationSec, endTick, loopEnabled, now, token);
      ogAnnounce(loopEnabled ? 'Playing song loop' : 'Playing song arrangement');
    }

    function stopLoop() {
      transportRef.current.token += 1;
      transportRef.current.loop = false;
      clearTransportSchedule(true);
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

    function safeProjectFilename(suffix) {
      var safeTitle = String(project.title || 'open-groove').replace(/[^\w -]+/g, '').trim().replace(/ +/g, '-') || 'open-groove';
      return safeTitle + (suffix || '');
    }

    function downloadMidi() {
      try {
        var midi = C.ogBuildMidiFile(project, pattern.id);
        downloadBytes(safeProjectFilename('-pattern.mid'), midi, 'audio/midi');
        addToast('Pattern MIDI exported.', 'success');
      } catch (err) {
        addToast('MIDI export failed: ' + (err && err.message || 'unknown error'), 'error');
      }
    }

    function downloadSongMidi() {
      try {
        if (!C.ogBuildArrangementMidiFile) throw new Error('Song MIDI export is not available.');
        var midi = C.ogBuildArrangementMidiFile(project);
        downloadBytes(safeProjectFilename('-song.mid'), midi, 'audio/midi');
        addToast('Song MIDI exported.', 'success');
      } catch (err) {
        addToast('Song MIDI export failed: ' + (err && err.message || 'unknown error'), 'error');
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
    var compositionNames = C.ogBuildCompositionNomenclature ? C.ogBuildCompositionNomenclature(project, pattern.id) : {
      keyName: (project.key && project.key.tonic || 'C') + ' ' + (project.key && project.key.mode || 'minor'),
      scaleDegrees: [],
      measures: notation.measures || []
    };
    var namedMeasure = compositionNames.measures[selectedBar] || currentMeasure;
    var staffEngraving = C.ogBuildStaffEngraving ? C.ogBuildStaffEngraving(project, pattern.id, {
      trackId: synthTrack && synthTrack.id,
      selectedBar: selectedBar,
      width: 680,
      height: 158,
      slotsPerMeasure: 8
    }) : null;
    var notationBridge = C.ogBuildNotationGridBridge ? C.ogBuildNotationGridBridge(project, pattern && pattern.id, {
      trackId: synthTrack && synthTrack.id,
      stepsPerBar: stepsPerBar,
      selectedBar: selectedBar
    }) : { keyName: compositionNames.keyName, measures: [], notes: [], offGridCount: 0, performedOffsetCount: 0 };
    var bridgeMeasure = notationBridge.measures && notationBridge.measures[selectedBar] || { steps: [], notes: [] };
    var scaleNotes = compositionNames.scaleDegrees && compositionNames.scaleDegrees.length
      ? compositionNames.scaleDegrees.map(function (degree) { return degree.note; })
      : C.ogBuildScale ? C.ogBuildScale(project.key && project.key.tonic || 'C', project.key && project.key.mode || 'minor') : [];
    var sampleAssets = (project.assets || []).filter(function (asset) { return asset.type === 'recording' || asset.type === 'sample' || asset.type === 'loop'; });
    var nav = root.navigator || {};
    var stemCapabilities = {
      cpuCores: nav.hardwareConcurrency || 0,
      memoryGb: nav.deviceMemory || 0,
      webgpu: !!nav.gpu,
      localWorkerInstalled: !!(root.OpenGrooveStemWorker || root.OpenGrooveStemBridge)
    };
    var stemPlan = C.ogBuildStemSeparationPlan ? C.ogBuildStemSeparationPlan(project, {
      mode: selectedStemMode,
      engineId: selectedStemEngine,
      sourceAssetId: selectedAsset && selectedAsset.id,
      sourceName: selectedAsset && selectedAsset.name || project.title || 'Source mix',
      userConfirmedRights: true,
      capabilities: stemCapabilities
    }) : { label: '4-stem', targets: ['vocals', 'drums', 'bass', 'other'], warnings: [], recommendedEngineId: selectedStemEngine, engines: [] };
    var stemEngines = stemPlan.engines && stemPlan.engines.length ? stemPlan.engines : [
      { id: 'manual-import', name: 'Manual stem import' },
      { id: 'external-demucs', name: 'External Demucs' },
      { id: 'external-spleeter', name: 'External Spleeter' },
      { id: 'browser-onnx', name: 'Browser ONNX/WebGPU' }
    ];
    var stemReadiness = stemPlan.readiness || (C.ogBuildStemEngineReadiness ? C.ogBuildStemEngineReadiness({
      engineId: selectedStemEngine,
      mode: selectedStemMode,
      capabilities: stemCapabilities,
      durationSec: selectedAsset && selectedAsset.durationSec || 0
    }) : { tier: 'ready', tierLabel: 'Ready', engineName: 'Manual stem import', summary: 'Ready to prepare stem lanes.', requirements: [] });
    var readinessStyle = Object.assign({},
      styles.readinessBadge,
      stemReadiness.tier === 'blocked' ? styles.readinessBlocked : stemReadiness.tier === 'warning' ? styles.readinessWarning : styles.readinessReady);
    var stemGroups = C.ogBuildStemAssetSummary ? C.ogBuildStemAssetSummary(project) : [];
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
    var songFormPresets = C.ogListSongFormPresets ? C.ogListSongFormPresets() : [
      { id: 'loop-sketch', name: 'Loop Sketch' },
      { id: 'verse-hook', name: 'Verse / Hook' },
      { id: 'aaba', name: 'AABA' },
      { id: 'build-drop', name: 'Build / Drop' }
    ];
    var grooveHitCount = pattern.events.filter(function (event) {
      return event.type === 'drumHit' && event.role === 'groove';
    }).length;
    var melodyNoteCount = pattern.events.filter(function (event) {
      return event.type === 'note' && event.role === 'melody';
    }).length;
    var arrangementTimeline = C.ogBuildArrangementTimeline ? C.ogBuildArrangementTimeline(project) : [];
    var patternLauncher = C.ogBuildPatternLauncher ? C.ogBuildPatternLauncher(project, { activePatternId: pattern && pattern.id }) : {
      patternCount: project.patterns && project.patterns.length || 0,
      sceneCount: project.scenes && project.scenes.length || 0,
      sectionCount: arrangementTimeline.length,
      patterns: []
    };
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
    var starterGuidance = C.ogBuildOnboardingGuidance ? C.ogBuildOnboardingGuidance(project, pattern && pattern.id) : {
      stepId: starterStatus.beatReady ? 'harmony' : 'beat',
      title: starterStatus.beatReady ? 'Harmony' : 'Beat',
      description: starterStatus.beatReady ? 'Add a chord bed or melodic notes.' : 'Build a rhythmic foundation.',
      actionId: starterStatus.beatReady ? 'harmony' : 'beat',
      actionLabel: starterStatus.beatReady ? 'Add Harmony' : 'Make Beat',
      completed: false,
      completedCount: starterStatus.completed,
      total: starterStatus.total
    };
    var starterSteps = [
      { id: 'beat', label: 'Beat', ready: starterStatus.beatReady },
      { id: 'harmony', label: 'Harmony', ready: starterStatus.harmonyReady },
      { id: 'variation', label: 'Variation', ready: starterStatus.variationReady },
      { id: 'song', label: 'Song', ready: starterStatus.songReady },
      { id: 'sample', label: 'Sample', ready: starterStatus.sampleReady },
      { id: 'export', label: 'Export', ready: starterStatus.exportReady }
    ];
    var mixerSnapshot = C.ogBuildMixerSnapshot ? C.ogBuildMixerSnapshot(project) : {
      master: project.mixer && project.mixer.master || { gain: 0.9 },
      channels: []
    };
    var effectTracks = (project.tracks || []).filter(function (track) { return track.type !== 'automation'; });
    var selectedEffectTrack = effectTracks.filter(function (track) { return track.id === selectedEffectTrackId; })[0] || synthTrack || drumTrack || effectTracks[0] || null;
    var selectedEffectTrackSafeId = selectedEffectTrack && selectedEffectTrack.id || '';
    var effectRack = C.ogBuildEffectRack && selectedEffectTrack ? C.ogBuildEffectRack(project, selectedEffectTrack.id) : [];
    var automationTargets = C.ogListAutomationTargets ? C.ogListAutomationTargets() : [];
    var automationSpec = automationTargets.filter(function (target) { return target.id === selectedAutomationTarget; })[0] || automationTargets[0] || { id: 'effect.filter.cutoff', label: 'Filter Cutoff', min: 80, max: 18000, defaultValue: 12000, unit: 'Hz' };
    var automationSnapshot = C.ogBuildAutomationSnapshot && pattern && selectedEffectTrack ? C.ogBuildAutomationSnapshot(project, pattern.id, selectedEffectTrack.id) : { lanes: [], pointCount: 0 };
    var automationLane = (automationSnapshot.lanes || []).filter(function (lane) { return lane.target === automationSpec.id; })[0] || { points: [] };
    var automationStepMap = {};
    var automationStepTicks = Math.round(C.ogTicksPerMeasure(project) / stepsPerBar);
    (automationLane.points || []).forEach(function (point) {
      var absoluteStep = Math.round((point.startTick || 0) / automationStepTicks);
      if (Math.floor(absoluteStep / stepsPerBar) === selectedBar) automationStepMap[absoluteStep % stepsPerBar] = point;
    });
    var synthPatch = C.ogNormalizeSynthInstrument ? C.ogNormalizeSynthInstrument(synthTrack && synthTrack.instrument) : (synthTrack && synthTrack.instrument || { oscillator: 'sawtooth', filter: { type: 'lowpass', cutoff: 6000, q: 0.7 }, envelope: { attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25 } });
    var synthPatchSummary = C.ogBuildSynthPatchSummary ? C.ogBuildSynthPatchSummary(project, synthTrack && synthTrack.id) : { label: synthPatch.oscillator };
    var synthPatchPresets = C.ogListSynthPatchPresets ? C.ogListSynthPatchPresets() : [];
    var starterGuidanceAction = function () {
      var actionId = starterGuidance && starterGuidance.actionId;
      if (actionId === 'harmony') applyProgression();
      else if (actionId === 'variation') createPatternVariation();
      else if (actionId === 'song') appendCurrentSection();
      else if (actionId === 'sample') createOwnedSampleSlot(null);
      else if (actionId === 'export') saveProject();
      else seedStarterBeat();
    };

    function effectParamLabel(param) {
      if (param === 'q') return 'Q';
      return String(param || '').replace(/^\w/, function (ch) { return ch.toUpperCase(); });
    }

    function renderEffectParamControl(effect, param) {
      if (effect.type === 'filter' && param === 'type') {
        return h('label', { key: effect.type + '-' + param, style: styles.fieldLabel }, 'Type',
          h('select', {
            style: styles.select,
            value: effect.params.type,
            onChange: function (ev) { setEffectParam(effect.type, param, ev.target.value); },
            'aria-label': effect.name + ' type'
          },
            ['lowpass', 'highpass', 'bandpass', 'notch'].map(function (type) {
              return h('option', { key: type, value: type }, type);
            })));
      }
      var spec = effectParamSpec(effect.type, param, automationTargets) || { min: 0, max: 1, unit: '', defaultValue: effect.params[param] || 0 };
      var value = effect.params[param] == null ? spec.defaultValue : effect.params[param];
      return h('label', { key: effect.type + '-' + param, style: styles.fieldLabel }, effectParamLabel(param),
        h('input', {
          style: styles.mixerSlider,
          type: 'range',
          min: spec.min,
          max: spec.max,
          step: automationStepSize(spec),
          value: value,
          onChange: function (ev) { setEffectParam(effect.type, param, Number(ev.target.value)); },
          'aria-label': effect.name + ' ' + effectParamLabel(param)
        }),
        h('span', { style: styles.mixerValue }, formatAutomationValue(spec, value)));
    }

    function renderAutomationCurveEditor() {
      var width = 360;
      var height = 132;
      var padX = 18;
      var padY = 14;
      var usableW = width - padX * 2;
      var usableH = height - padY * 2;
      var measureTicks = C.ogTicksPerMeasure ? C.ogTicksPerMeasure(project) : 3840;
      function xForStep(step) {
        return padX + (stepsPerBar <= 1 ? 0 : (step / (stepsPerBar - 1)) * usableW);
      }
      function yForValue(value) {
        var min = Number(automationSpec.min);
        var max = Number(automationSpec.max);
        var range = Math.max(0.0001, max - min);
        var unit = Math.max(0, Math.min(1, (Number(value) - min) / range));
        return padY + (1 - unit) * usableH;
      }
      var preview = [];
      for (var s = 0; s < stepsPerBar; s++) {
        var tick = selectedBar * measureTicks + s * automationStepTicks;
        var value = C.ogResolveAutomationValueAtTick
          ? C.ogResolveAutomationValueAtTick(project, pattern && pattern.id, selectedEffectTrackSafeId, automationSpec.id, tick, automationSpec.defaultValue)
          : automationStepMap[s] ? automationStepMap[s].value : automationSpec.defaultValue;
        preview.push({ step: s, value: value == null ? automationSpec.defaultValue : value });
      }
      var path = preview.map(function (point, index) {
        return (index ? 'L ' : 'M ') + Math.round(xForStep(point.step) * 10) / 10 + ' ' + Math.round(yForValue(point.value) * 10) / 10;
      }).join(' ');
      var barPoints = (automationLane.points || []).filter(function (point) {
        var absoluteStep = Math.round((point.startTick || 0) / automationStepTicks);
        return Math.floor(absoluteStep / stepsPerBar) === selectedBar;
      });
      return h('svg', {
        style: styles.automationCurveSvg,
        viewBox: '0 0 ' + width + ' ' + height,
        role: 'img',
        'aria-label': automationSpec.label + ' automation curve for bar ' + (selectedBar + 1),
        onPointerDown: handleAutomationCurvePointer,
        onPointerMove: handleAutomationCurvePointer
      },
        [0, 0.5, 1].map(function (line) {
          var y = padY + line * usableH;
          return h('line', {
            key: 'grid-' + line,
            x1: padX,
            x2: width - padX,
            y1: y,
            y2: y,
            stroke: styles.automationCurveGrid.stroke,
            strokeWidth: line === 0.5 ? 1.2 : 1
          });
        }),
        visibleSteps.map(function (step) {
          var localStep = step % stepsPerBar;
          return h('line', {
            key: 'tick-' + localStep,
            x1: xForStep(localStep),
            x2: xForStep(localStep),
            y1: height - padY - 5,
            y2: height - padY + 5,
            stroke: localStep % 4 === 0 ? styles.automationCurveBeat.stroke : styles.automationCurveGrid.stroke,
            strokeWidth: localStep % 4 === 0 ? 1.4 : 1
          });
        }),
        h('path', {
          d: path,
          fill: 'none',
          stroke: styles.automationCurvePath.stroke,
          strokeWidth: 3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }),
        barPoints.map(function (point) {
          var absoluteStep = Math.round((point.startTick || 0) / automationStepTicks);
          var localStep = absoluteStep % stepsPerBar;
          var selected = automationStep === localStep;
          return h('circle', {
            key: point.id,
            cx: xForStep(localStep),
            cy: yForValue(point.value),
            r: selected ? 6 : 5,
            fill: selected ? styles.automationCurvePointSelected.fill : styles.automationCurvePoint.fill,
            stroke: styles.automationCurvePoint.stroke,
            strokeWidth: selected ? 2.5 : 2,
            tabIndex: 0,
            role: 'button',
            'aria-label': automationSpec.label + ' point at step ' + (localStep + 1) + ', ' + formatAutomationValue(automationSpec, point.value),
            onClick: function (ev) {
              if (ev && ev.stopPropagation) ev.stopPropagation();
              setAutomationStep(localStep);
              setAutomationValue(point.value);
              setAutomationCurveMode(point.curve === 'hold' ? 'hold' : 'linear');
            }
          });
        }));
    }

    return h('div', {
      ref: dialogRef,
      className: 'og-root',
      'data-og-theme': themeMode,
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
          h('div', { style: styles.headerTop },
            h('div', { style: styles.headerTitleBlock },
              h('div', { style: styles.eyebrow }, 'Milestone 0'),
              h('strong', { id: 'og-dialog-title', style: styles.title }, 'Open Groove Studio'),
              h('div', { id: 'og-dialog-subtitle', style: styles.subtitle }, 'Music learning tool for rhythm, synthesis, and composition')),
            h('button', { style: styles.iconButton, 'aria-label': 'Close Open Groove Studio', onClick: props.onClose }, 'X')),
          h('div', { style: styles.transport, role: 'toolbar', 'aria-label': 'Transport' },
            h('button', { style: styles.transportButton, onClick: playLoop, disabled: playing, 'aria-label': 'Play pattern' }, 'Play'),
            h('button', { style: styles.transportButton, onClick: stopLoop, 'aria-label': 'Stop pattern' }, 'Stop'),
            h('button', {
              style: Object.assign({}, styles.transportButton, loopEnabled ? styles.loopButtonOn : null),
              onClick: toggleLoopMode,
              'aria-pressed': loopEnabled,
              'aria-label': loopEnabled ? 'Turn loop mode off' : 'Turn loop mode on'
            }, loopEnabled ? 'Loop On' : 'Loop Off'),
            h('button', { style: styles.transportButton, onClick: resetDemo, 'aria-label': 'Reset demo pattern' }, 'Reset'),
            h('label', { style: styles.tempoLabel }, 'BPM',
              h('input', { style: styles.tempoInput, type: 'number', min: 40, max: 240, value: project.bpm, onChange: function (ev) { setTempo(ev.target.value); }, 'aria-label': 'Tempo in beats per minute' })),
            h('label', { style: styles.swingLabel }, 'Swing',
              h('input', { style: styles.swingSlider, type: 'range', min: 0, max: 75, value: Math.round((project.swing || 0) * 100), onChange: function (ev) { setSwing(ev.target.value); }, 'aria-label': 'Swing amount' }),
              h('span', { style: styles.swingValue }, Math.round((project.swing || 0) * 100) + '%')),
            h('label', { style: styles.themeLabel }, 'Theme',
              h('select', {
                style: styles.themeSelect,
                value: themeMode,
                onChange: function (ev) { setThemeMode(ev.target.value); },
                'aria-label': 'Open Groove color theme'
              },
                h('option', { value: 'light' }, 'Light'),
                h('option', { value: 'dark' }, 'Dark'),
                h('option', { value: 'contrast' }, 'High Contrast'))))),

        h('div', { style: styles.playheadPanel, role: 'group', 'aria-label': 'Playback position' },
          h('div', {
            style: styles.playheadTrack,
            role: 'progressbar',
            'aria-label': 'Playback position in the current ' + (transportView.mode === 'song' ? 'song' : 'pattern'),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': Math.round((transportView.progress || 0) * 100)
          },
            h('div', { style: Object.assign({}, styles.playheadFill, { width: Math.round((transportView.progress || 0) * 1000) / 10 + '%' }) }),
            h('span', { style: Object.assign({}, styles.playheadLine, { left: Math.round((transportView.progress || 0) * 1000) / 10 + '%' }) })),
          h('div', { style: styles.playheadStatus, role: 'status', 'aria-live': 'polite' },
            transportView.label + (transportView.loop ? ' - loop enabled' : ''))),

        h('div', { style: styles.workspaceBar, role: 'group', 'aria-label': 'Workspace focus' },
          h('span', { style: styles.workspaceLabel }, 'Workspace'),
          h('div', { style: styles.workspaceTabs, role: 'group', 'aria-label': 'Open Groove workspace views' },
            workspaceModes.map(function (mode) {
              var selected = mode.id === workspaceModeConfig.id;
              return h('button', {
                key: mode.id,
                style: Object.assign({}, styles.workspaceTab, selected ? styles.workspaceTabOn : null),
                'aria-pressed': selected,
                'aria-label': mode.label + ' workspace view',
                onClick: function () { changeWorkspaceMode(mode.id); }
              }, mode.label);
            })),
          h('label', { style: styles.workspaceJump }, 'Jump to',
            h('select', {
              style: styles.workspaceJumpSelect,
              value: panelJumpValue,
              onChange: function (ev) { jumpToWorkspaceSection(ev.target.value); },
              'aria-label': 'Jump to visible Open Groove panel'
            },
              visibleWorkspaceSections.map(function (section) {
                return h('option', { key: section.id, value: section.id }, section.label);
              }))),
          h('span', { style: styles.workspaceSummary }, workspaceModeConfig.summary)),

        h('div', { style: styles.grid },
          h('section', workspaceSectionProps('start', 'og-start-title'),
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-start-title', style: styles.h2 }, 'Starter Path'),
              h('span', { style: styles.meta, role: 'status', 'aria-live': 'polite' }, starterStatus.completed + ' / ' + starterStatus.total)),
            h('div', { style: styles.starterSteps, role: 'list', 'aria-label': 'Starter path progress' },
              starterSteps.map(function (item) {
                var isCurrent = !item.ready && starterGuidance && starterGuidance.stepId === item.id;
                return h('span', {
                  key: item.id,
                  role: 'listitem',
                  style: Object.assign({}, styles.starterChip, item.ready ? styles.starterChipDone : null, isCurrent ? styles.starterChipCurrent : null),
                  'aria-current': isCurrent ? 'step' : undefined,
                  'aria-label': item.label + (item.ready ? ' ready' : isCurrent ? ' next' : ' not ready')
                }, item.label);
              })),
            h('div', { style: styles.starterNext, role: 'group', 'aria-label': 'Recommended starter step' },
              h('div', { style: styles.starterNextText },
                h('span', { style: styles.starterNextKicker }, starterGuidance && starterGuidance.completed ? 'Ready' : 'Next'),
                h('strong', { style: styles.starterNextTitle }, starterGuidance && starterGuidance.title || 'Beat'),
                h('span', { style: styles.starterNextDesc }, starterGuidance && starterGuidance.description || 'Build a rhythmic foundation.')),
              h('button', {
                style: styles.wideButton,
                onClick: starterGuidanceAction,
                'aria-label': (starterGuidance && starterGuidance.actionLabel || 'Make Beat') + ' from Starter Path'
              }, starterGuidance && starterGuidance.actionLabel || 'Make Beat')),
            h('div', { style: styles.starterActions, role: 'toolbar', 'aria-label': 'Starter path actions' },
              h('button', { style: styles.smallButton, onClick: seedStarterBeat }, 'Make Beat'),
              h('button', { style: styles.smallButton, onClick: applyProgression }, 'Add Harmony'),
              h('button', { style: styles.smallButton, onClick: createPatternVariation }, 'New Variation'),
              h('button', { style: styles.wideButton, onClick: appendCurrentSection }, 'Add Section'))),

          h('section', workspaceSectionProps('pads', 'og-pads-title'),
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

          h('section', workspaceSectionProps('steps', 'og-steps-title'),
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

          h('section', workspaceSectionProps('synth', 'og-synth-title'),
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

          h('section', workspaceSectionProps('keyboard', 'og-keyboard-title'),
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-keyboard-title', style: styles.h2 }, 'Keyboard'),
              h('span', { style: styles.meta }, midiStatus.label + ' - ' + keyboardModeLabel.toLowerCase() + (keyboardRecordEnabled ? ' - record' : ''))),
            h('div', { style: styles.keyboardControls, role: 'group', 'aria-label': 'Keyboard controls' },
              h('label', { style: styles.compactField }, 'Octave',
                h('select', {
                  style: styles.select,
                  value: keyboardOctave,
                  onChange: function (ev) { setKeyboardOctave(Number(ev.target.value)); },
                  'aria-label': 'Keyboard octave'
                },
                  [1, 2, 3, 4, 5, 6].map(function (octave) {
                    return h('option', { key: octave, value: octave }, 'C' + octave);
                  }))),
              h('label', { style: styles.compactField }, 'Mode',
                h('select', {
                  style: styles.select,
                  value: keyboardMode,
                  onChange: function (ev) { setKeyboardMode(ev.target.value === 'triad' ? 'triad' : 'single'); },
                  'aria-label': 'Keyboard play mode'
                },
                  h('option', { value: 'single' }, 'Single'),
                  h('option', { value: 'triad' }, 'Triad'))),
              h('label', { style: styles.compactField }, 'Length',
                h('select', {
                  style: styles.select,
                  value: keyboardDurationSteps,
                  onChange: function (ev) { setKeyboardDurationSteps(Math.max(1, Math.min(stepsPerBar, Number(ev.target.value) || 1))); },
                  'aria-label': 'Keyboard note length'
                },
                  keyboardLengthOptions.map(function (steps) {
                    return h('option', { key: steps, value: steps }, steps + (steps === 1 ? ' step' : ' steps'));
                  }))),
              h('label', { style: styles.compactField }, 'Step',
                h('input', {
                  style: styles.mixerSlider,
                  type: 'range',
                  min: 1,
                  max: stepsPerBar,
                  value: keyboardStep + 1,
                  onChange: function (ev) { setKeyboardStep(Math.max(0, Math.min(stepsPerBar - 1, Number(ev.target.value) - 1))); },
                  'aria-label': 'Keyboard record step'
                }),
                h('span', { style: styles.mixerValue }, String(keyboardStep + 1))),
              h('button', {
                style: Object.assign({}, styles.smallButton, keyboardRecordEnabled ? styles.recordButtonOn : null),
                onClick: function () { setKeyboardRecordEnabled(!keyboardRecordEnabled); },
                'aria-pressed': keyboardRecordEnabled,
                'aria-label': keyboardRecordEnabled ? 'Turn keyboard recording off' : 'Turn keyboard recording on'
              }, keyboardRecordEnabled ? 'Record On' : 'Record Off'),
              h('button', {
                style: Object.assign({}, styles.smallButton, !midiStatus.supported ? styles.disabledButton : null),
                onClick: connectMidiInput,
                disabled: !midiStatus.supported,
                'aria-label': 'Connect MIDI input'
              }, midiStatus.connected ? 'MIDI Ready' : 'Connect MIDI')),
            h('div', { style: styles.keyboardKeys, role: 'group', 'aria-label': 'Virtual piano keyboard' },
              (keyboardLayout.keys || []).map(function (key) {
                return h('button', {
                  key: key.midi,
                  style: Object.assign({}, styles.keyboardKey, key.isBlack ? styles.keyboardKeyBlack : styles.keyboardKeyWhite, key.inKey ? null : styles.keyboardKeyOutside),
                  onClick: function () { playKeyboardPitch(key.pitch, 0.75, 'virtualKeyboard'); },
                  'aria-label': (keyboardMode === 'triad' ? 'Play triad from ' : 'Play ') + key.pitch + (keyboardRecordEnabled ? ' and record to step ' + (keyboardStep + 1) : '')
                },
                  h('strong', null, key.note),
                  h('span', null, key.octave),
                  h('span', { style: styles.keyboardKeyHint }, key.computerKey || ''));
              }))),

          h('section', workspaceSectionProps('patch', 'og-patch-title'),
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

          h('section', workspaceSectionProps('harmony', 'og-harmony-title'),
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
            h('div', { style: styles.theoryGrid, role: 'list', 'aria-label': 'Scale degree names' },
              (compositionNames.scaleDegrees || []).map(function (degree) {
                return h('div', { key: degree.degree, role: 'listitem', style: styles.theoryCard },
                  h('strong', null, degree.roman + ' / ' + degree.nashville),
                  h('span', null, degree.note + ' ' + degree.solfege),
                  h('span', null, degree.degreeName));
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

          h('section', workspaceSectionProps('score', 'og-score-title'),
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-score-title', style: styles.h2 }, 'Score Preview'),
              h('span', { style: styles.meta }, (namedMeasure.notes && namedMeasure.notes.length || 0) + ' notes in bar ' + (selectedBar + 1))),
            h('div', { style: styles.staffEditor },
              h('div', { style: styles.staffToolbar, role: 'group', 'aria-label': 'Engraved staff editor controls' },
                h('label', { style: styles.fieldLabel }, 'Tool',
                  h('select', {
                    style: styles.select,
                    value: staffTool,
                    onChange: function (ev) { setStaffTool(ev.target.value); },
                    'aria-label': 'Staff editor tool'
                  },
                    h('option', { value: 'note' }, 'Note'),
                    h('option', { value: 'rest' }, 'Rest'))),
                h('label', { style: styles.fieldLabel }, 'Pitch',
                  h('select', {
                    style: styles.select,
                    value: staffPitch,
                    disabled: staffTool === 'rest',
                    onChange: function (ev) { setStaffPitch(ev.target.value); },
                    'aria-label': 'Staff note pitch'
                  },
                    staffPitches.map(function (pitch) {
                      return h('option', { key: pitch, value: pitch }, pitch);
                    }))),
                h('label', { style: styles.fieldLabel }, 'Value',
                  h('select', {
                    style: styles.select,
                    value: staffDuration,
                    onChange: function (ev) { setStaffDuration(ev.target.value); },
                    'aria-label': 'Staff note value'
                  },
                    h('option', { value: 'w' }, 'Whole'),
                    h('option', { value: 'h' }, 'Half'),
                    h('option', { value: 'q' }, 'Quarter'),
                    h('option', { value: 'e' }, 'Eighth'),
                    h('option', { value: 's' }, 'Sixteenth')))),
              renderEngravedStaff()),
            h('div', { style: styles.bridgePanel, role: 'group', 'aria-label': 'Notation to step bridge' },
              h('div', { style: styles.bridgeHeader },
                h('strong', null, 'Notation Bridge'),
                h('span', { style: styles.meta }, notationBridge.keyName + ' - ' + (bridgeMeasure.noteCount || 0) + ' notes')),
              h('div', { style: styles.bridgeSteps, role: 'group', 'aria-label': 'Selected bar notation steps' },
                (bridgeMeasure.steps || []).map(function (cell) {
                  var hasNotes = cell.noteCount > 0;
                  var hasDrums = cell.drumCount > 0;
                  var firstNote = hasNotes && cell.notes[0] || null;
                  return h('button', {
                    key: 'bridge-step-' + cell.index,
                    style: Object.assign({}, styles.bridgeStepCell, hasNotes ? styles.bridgeStepCellOn : null, hasDrums && !hasNotes ? styles.bridgeStepCellDrum : null),
                    onClick: function () {
                      if (firstNote && firstNote.pitch) {
                        setStaffPitch(firstNote.pitch);
                        triggerNote(firstNote.pitch, 0.68);
                      }
                    },
                    'aria-label': 'Step ' + (cell.index + 1) + (hasNotes ? ', ' + cell.notes.map(function (note) { return note.pitch; }).join(', ') : hasDrums ? ', drum hit' : ', empty')
                  },
                    h('span', { style: styles.bridgeStepNumber }, String(cell.index + 1)),
                    h('span', { style: styles.bridgeStepContent },
                      hasNotes
                        ? cell.notes.slice(0, 2).map(function (note) {
                          return h('span', { key: note.id, style: styles.bridgeNotePill }, note.pitch.replace(/\d+$/, '') + (note.solfege ? ' ' + note.solfege : ''));
                        })
                        : hasDrums ? 'drum' : ''));
                })),
              h('div', { style: styles.bridgeRows, role: 'list', 'aria-label': 'Selected bar notation mappings' },
                (bridgeMeasure.notes || []).length ? bridgeMeasure.notes.slice(0, 6).map(function (note) {
                  var timing = note.timingOffsetTicks ? (note.timingOffsetTicks > 0 ? '+' : '') + note.timingOffsetTicks + ' ticks' : note.onGrid ? 'on grid' : (note.gridOffsetTicks > 0 ? '+' : '') + note.gridOffsetTicks + ' grid';
                  return h('div', { key: note.id, style: styles.bridgeRow, role: 'listitem' },
                    h('strong', null, note.pitch),
                    h('span', null, 'Step ' + note.step),
                    h('span', null, (note.solfege || '-') + ' / ' + (note.nashville || '-')),
                    h('span', null, note.chordRoman || note.chordSymbol || '-'),
                    h('span', null, timing));
                }) : h('span', { style: styles.muted }, 'No notation notes in this bar.')),
              h('div', { style: styles.stats },
                h('span', null, notationBridge.notes.length + ' mapped notes'),
                h('span', null, notationBridge.offGridCount + ' off grid'),
                h('span', null, notationBridge.performedOffsetCount + ' performance offsets'))),
            h('div', { style: styles.notationComposer },
              h('label', { style: styles.fieldLabel }, 'Notation Input',
                h('textarea', {
                  style: styles.notationTextarea,
                  value: notationEntry,
                  onChange: function (ev) { setNotationEntry(ev.target.value); },
                  'aria-label': 'Notation input'
                })),
              h('button', {
                style: Object.assign({}, styles.wideButton, !C.ogWriteNotationInput ? styles.disabledButton : null),
                onClick: writeNotationEntry,
                disabled: !C.ogWriteNotationInput,
                'aria-label': 'Write notation input to selected bar'
              }, 'Write Notation')),
            h('div', { style: styles.sampleRegion }, compositionNames.keyName + ' - selected bar ' + (selectedBar + 1)),
            h('div', { style: styles.timeline },
              barIndexes.map(function (bar) {
                var measure = compositionNames.measures[bar] || notation.measures[bar] || { notes: [], drumHits: [] };
                return h('div', { key: bar, style: styles.barCell },
                  h('strong', null, 'Bar ' + (bar + 1)),
                  h('span', null, formatMeasureSummary(measure)));
              })),
            h('div', { style: styles.license }, licenseReport.exportSafe ? 'Built-in sounds are export-safe.' : licenseReport.warnings[0])),

          h('section', workspaceSectionProps('song', 'og-song-title'),
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
              h('label', { style: styles.compactField }, 'Form',
                h('select', {
                  value: selectedSongFormId,
                  onChange: function (ev) { setSelectedSongFormId(ev.target.value); },
                  style: styles.select,
                  'aria-label': 'Song form preset'
                },
                  songFormPresets.map(function (preset) {
                    return h('option', { key: preset.id, value: preset.id }, preset.name);
                  }))),
              h('button', { style: styles.smallButton, onClick: buildSongForm }, 'Build Form'),
              h('button', { style: styles.wideButton, onClick: playSong }, 'Play Song')),
            h('div', { style: styles.patternLauncher, role: 'group', 'aria-label': 'Pattern launcher' },
              (patternLauncher.patterns || []).map(function (item) {
                var chordLabel = item.firstChord && (item.firstChord.roman + ' ' + item.firstChord.symbol) || item.chordCount + ' chords';
                return h('button', {
                  key: item.id,
                  style: Object.assign({}, styles.patternPad, item.active ? styles.patternPadActive : null),
                  onClick: function () { choosePattern(item.id); },
                  'aria-pressed': item.active,
                  'aria-label': 'Select ' + item.name + ', ' + item.bars + ' bars, ' + item.drumHitCount + ' drum hits, ' + item.noteCount + ' notes'
                },
                  h('span', { style: styles.patternSlot }, item.slot),
                  h('strong', null, item.name),
                  h('span', null, item.bars + ' bars'),
                  h('span', null, item.drumHitCount + ' hits / ' + item.noteCount + ' notes'),
                  h('span', null, chordLabel),
                  h('span', null, item.sectionCount + ' sections'));
              })),
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

          h('section', workspaceSectionProps('mixer', 'og-mixer-title'),
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

          h('section', workspaceSectionProps('effects', 'og-effects-title'),
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-effects-title', style: styles.h2 }, 'Effects'),
              h('span', { style: styles.meta }, (selectedEffectTrack && selectedEffectTrack.name || 'Track') + ' - ' + automationSnapshot.pointCount + ' points')),
            h('div', { style: styles.effectHeader },
              h('label', { style: styles.fieldLabel }, 'Track',
                h('select', {
                  style: styles.select,
                  value: selectedEffectTrackSafeId,
                  onChange: function (ev) { setSelectedEffectTrackId(ev.target.value); },
                  'aria-label': 'Effects track'
                },
                  effectTracks.map(function (track) {
                    return h('option', { key: track.id, value: track.id }, track.name);
                  }))),
              h('button', {
                style: styles.wideButton,
                onClick: previewEffectRack,
                disabled: !selectedEffectTrackSafeId,
                'aria-label': 'Preview selected effects rack'
              }, 'Preview Rack')),
            h('div', { style: styles.effectRack, role: 'group', 'aria-label': 'Track effects rack' },
              effectRack.length ? effectRack.map(function (effect) {
                return h('div', { key: effect.type, style: Object.assign({}, styles.effectRow, effect.enabled ? styles.effectRowOn : null) },
                  h('label', { style: styles.effectToggle },
                    h('input', {
                      type: 'checkbox',
                      checked: !!effect.enabled,
                      onChange: function (ev) { toggleTrackEffect(effect.type, ev.target.checked); },
                      'aria-label': (effect.enabled ? 'Disable ' : 'Enable ') + effect.name
                    }),
                    h('span', null, effect.name)),
                  h('div', { style: styles.effectParamGrid },
                    Object.keys(effect.params || {}).map(function (param) {
                      return renderEffectParamControl(effect, param);
                    })));
              }) : h('span', { style: styles.muted }, 'No effects available.')),
            h('div', { style: styles.automationPanel, role: 'group', 'aria-label': 'Effect automation' },
              h('div', { style: styles.automationControls },
                h('label', { style: styles.fieldLabel }, 'Target',
                  h('select', {
                    style: styles.select,
                    value: automationSpec.id,
                    onChange: function (ev) { changeAutomationTarget(ev.target.value); },
                    'aria-label': 'Automation target'
                  },
                    automationTargets.map(function (target) {
                      return h('option', { key: target.id, value: target.id }, target.label);
                    }))),
                h('label', { style: styles.fieldLabel }, 'Step',
                  h('input', {
                    style: styles.mixerSlider,
                    type: 'range',
                    min: 0,
                    max: stepsPerBar - 1,
                    step: 1,
                    value: automationStep,
                    onChange: function (ev) { setAutomationStep(Number(ev.target.value)); },
                    'aria-label': 'Automation step in selected bar'
                  }),
                  h('span', { style: styles.mixerValue }, String(automationStep + 1))),
                h('label', { style: styles.fieldLabel }, 'Curve',
                  h('select', {
                    style: styles.select,
                    value: automationCurveMode,
                    onChange: function (ev) { setAutomationCurveMode(ev.target.value); },
                    'aria-label': 'Automation curve shape'
                  },
                    h('option', { value: 'linear' }, 'Linear'),
                    h('option', { value: 'hold' }, 'Hold'))),
                h('label', { style: styles.fieldLabel }, 'Value',
                  h('input', {
                    style: styles.mixerSlider,
                    type: 'range',
                    min: automationSpec.min,
                    max: automationSpec.max,
                    step: automationStepSize(automationSpec),
                    value: automationValue,
                    onChange: function (ev) { setAutomationValue(Number(ev.target.value)); },
                    'aria-label': automationSpec.label + ' value'
                  }),
                  h('span', { style: styles.mixerValue }, formatAutomationValue(automationSpec, automationValue)))),
              renderAutomationCurveEditor(),
              h('div', { style: styles.automationSteps, role: 'group', 'aria-label': automationSpec.label + ' points in selected bar' },
                visibleSteps.map(function (step) {
                  var localStep = step % stepsPerBar;
                  var point = automationStepMap[localStep];
                  var selected = automationStep === localStep;
                  return h('button', {
                    key: 'auto-' + step,
                    style: Object.assign({}, styles.automationStep, point ? styles.automationStepOn : null, selected ? styles.automationStepSelected : null),
                    onClick: function () {
                      setAutomationStep(localStep);
                      setAutomationValue(point ? point.value : automationSpec.defaultValue);
                      if (point) setAutomationCurveMode(point.curve === 'hold' ? 'hold' : 'linear');
                    },
                    'aria-pressed': selected,
                    'aria-label': 'Automation step ' + (localStep + 1) + (point ? ', ' + formatAutomationValue(automationSpec, point.value) : ', empty')
                  }, point ? '*' : String(localStep + 1));
                })),
              h('div', { style: styles.automationActions, role: 'toolbar', 'aria-label': 'Automation point actions' },
                h('button', {
                  style: Object.assign({}, styles.wideButton, !C.ogSetAutomationPoint ? styles.disabledButton : null),
                  onClick: writeAutomationPoint,
                  disabled: !C.ogSetAutomationPoint,
                  'aria-label': 'Write automation point'
                }, 'Write Point'),
                h('button', {
                  style: Object.assign({}, styles.smallButton, !C.ogSetAutomationPoint ? styles.disabledButton : null),
                  onClick: clearAutomationPoint,
                  disabled: !C.ogSetAutomationPoint,
                  'aria-label': 'Clear automation point'
                }, 'Clear Point')))),

          h('section', workspaceSectionProps('samples', 'og-samples-title'),
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

          h('section', workspaceSectionProps('stems', 'og-stems-title'),
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-stems-title', style: styles.h2 }, 'Stem Prep'),
              h('span', { style: styles.meta }, stemGroups.length + ' sets')),
            h('div', { style: styles.formRow },
              h('label', { style: styles.fieldLabel }, 'Split',
                h('select', {
                  style: styles.select,
                  value: selectedStemMode,
                  onChange: function (ev) { setSelectedStemMode(ev.target.value); },
                  'aria-label': 'Stem separation target set'
                },
                  h('option', { value: 'two' }, '2 stems'),
                  h('option', { value: 'four' }, '4 stems'),
                  h('option', { value: 'five' }, '5 stems'),
                  h('option', { value: 'six' }, '6 stems'))),
              h('label', { style: styles.fieldLabel }, 'Engine',
                h('select', {
                  style: styles.select,
                  value: selectedStemEngine,
                  onChange: function (ev) { setSelectedStemEngine(ev.target.value); },
                  'aria-label': 'Stem preparation engine'
                },
                  stemEngines.map(function (engine) {
                    return h('option', { key: engine.id, value: engine.id }, engine.name);
                  })))),
            h('div', { style: styles.stemActionRow },
              h('span', { style: readinessStyle, role: 'status' }, stemReadiness.tierLabel || 'Ready'),
              h('button', { style: styles.wideButton, onClick: prepareStemSlots, 'aria-label': 'Prepare stem slots for import or separation' }, 'Prepare Stems')),
            h('div', { style: styles.stemTargetRow, role: 'list', 'aria-label': 'Stem targets' },
              (stemPlan.targets || []).map(function (target) {
                return h('span', { key: target, role: 'listitem', style: styles.stemChip }, target);
              })),
            h('div', { style: styles.sampleRegion },
              (stemReadiness.engineName || 'Stem engine') + ': ' + stemReadiness.summary + ' ' + (stemReadiness.estimate && stemReadiness.estimate.label || '')),
            h('div', { style: styles.requirementList, role: 'list', 'aria-label': 'Stem engine readiness' },
              (stemReadiness.requirements || []).map(function (req) {
                return h('div', { key: req.id, role: 'listitem', style: styles.requirementRow },
                  h('strong', null, req.label),
                  h('span', null, req.met ? 'Ready' : req.required),
                  h('span', null, req.value || 'Unknown'));
              })),
            h('div', { style: styles.assetList },
              stemGroups.length ? stemGroups.map(function (group) {
                return h('div', { key: group.groupId, style: styles.assetRow },
                  h('strong', null, group.rolesList.join(', ')),
                  h('span', null, group.readyCount + ' / ' + group.count + ' ready'),
                  h('span', null, group.groupId));
              }) : h('span', { style: styles.muted }, 'No stem sets prepared yet.'))),

          h('section', workspaceSectionProps('project', 'og-project-title'),
            h('div', { style: styles.sectionHeader },
              h('h2', { id: 'og-project-title', style: styles.h2 }, 'Project'),
              h('span', { style: styles.meta }, project.title)),
            h('div', { style: styles.projectButtons },
              h('button', { style: styles.smallButton, onClick: saveProject }, 'Prepare JSON'),
              h('button', { style: styles.smallButton, onClick: saveThinProject }, 'Thin JSON'),
              h('button', { style: styles.smallButton, onClick: loadProjectFromText }, 'Load Text'),
              h('button', { style: styles.smallButton, onClick: downloadProject }, 'Download'),
              h('button', { style: styles.smallButton, onClick: prepareMusicXml }, 'MusicXML'),
              h('button', { style: styles.smallButton, onClick: downloadMidi }, 'Pattern MIDI'),
              h('button', { style: styles.smallButton, onClick: downloadSongMidi }, 'Song MIDI')),
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
      padding: '12px 16px',
      borderBottom: '1px solid #d1d5db',
      display: 'grid',
      gap: '10px',
      alignItems: 'stretch',
      background: '#ffffff'
    },
    headerTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', minWidth: 0 },
    headerTitleBlock: { minWidth: 0, overflowWrap: 'anywhere' },
    eyebrow: { fontSize: '11px', color: '#0f766e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 },
    title: { display: 'block', fontSize: '20px', lineHeight: 1.2, letterSpacing: 0 },
    subtitle: { color: '#475569', fontSize: '12px', fontWeight: 700, lineHeight: 1.35, marginTop: '2px' },
    transport: { display: 'flex', alignItems: 'stretch', gap: '8px', flexWrap: 'wrap', minWidth: 0, width: '100%' },
    transportButton: { minHeight: '40px', minWidth: '78px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '6px 12px', fontWeight: 800, lineHeight: 1.15, whiteSpace: 'normal', boxSizing: 'border-box', cursor: 'pointer' },
    loopButtonOn: { background: '#ccfbf1', border: '1px solid #0f766e', color: '#0f172a', boxShadow: 'inset 0 0 0 2px #0f766e' },
    tempoLabel: { minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px', flex: '1 1 96px', maxWidth: '132px', color: '#334155', fontSize: '12px', fontWeight: 800, lineHeight: 1.15, boxSizing: 'border-box' },
    tempoInput: { width: '72px', minHeight: '34px', border: '1px solid #9ca3af', padding: '0 8px', fontWeight: 800, boxSizing: 'border-box' },
    swingLabel: { minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px', flex: '2 1 168px', maxWidth: '230px', color: '#334155', fontSize: '12px', fontWeight: 800, lineHeight: 1.15, boxSizing: 'border-box' },
    swingSlider: { flex: '1 1 78px', minWidth: '78px', accentColor: '#0f766e' },
    swingValue: { minWidth: '34px', color: '#475569', fontSize: '12px', fontWeight: 900 },
    themeLabel: { minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px', flex: '1 1 154px', maxWidth: '232px', color: '#334155', fontSize: '12px', fontWeight: 800, lineHeight: 1.15, boxSizing: 'border-box' },
    themeSelect: { maxWidth: '100%', minHeight: '34px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 8px', fontWeight: 800, boxSizing: 'border-box' },
    iconButton: { flex: '0 0 auto', width: '40px', minWidth: '40px', height: '40px', border: '1px solid #9ca3af', background: '#111827', color: '#ffffff', fontWeight: 800, lineHeight: 1, cursor: 'pointer' },
    playheadPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '10px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #d1d5db', background: '#f8fafc' },
    playheadTrack: { position: 'relative', minHeight: '16px', border: '1px solid #64748b', background: '#e2e8f0', overflow: 'hidden' },
    playheadFill: { position: 'absolute', inset: '0 auto 0 0', background: '#0f766e' },
    playheadLine: { position: 'absolute', top: '-3px', bottom: '-3px', width: '3px', background: '#111827', transform: 'translateX(-1px)' },
    playheadStatus: { color: '#334155', fontSize: '12px', fontWeight: 900, overflowWrap: 'anywhere' },
    workspaceBar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '8px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #d1d5db', background: '#ffffff' },
    workspaceLabel: { color: '#334155', fontSize: '12px', fontWeight: 900 },
    workspaceTabs: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', minWidth: 0 },
    workspaceTab: { minHeight: '34px', border: '1px solid #9ca3af', background: '#f8fafc', color: '#111827', padding: '5px 6px', fontSize: '12px', fontWeight: 900, lineHeight: 1.15, overflowWrap: 'anywhere', cursor: 'pointer' },
    workspaceTabOn: { border: '1px solid #0f766e', background: '#ccfbf1', color: '#0f172a', boxShadow: 'inset 0 0 0 2px #0f766e' },
    workspaceJump: { minHeight: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '12px', fontWeight: 900, minWidth: 0 },
    workspaceJumpSelect: { minWidth: 0, width: '100%', minHeight: '34px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 8px', fontWeight: 800, boxSizing: 'border-box' },
    workspaceSummary: { color: '#475569', fontSize: '12px', fontWeight: 800, lineHeight: 1.3, overflowWrap: 'anywhere' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '12px', padding: '12px', overflow: 'auto' },
    surface: { background: '#ffffff', border: '1px solid #d1d5db', padding: '12px', minWidth: 0 },
    hiddenSection: { display: 'none' },
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
    h2: { margin: 0, fontSize: '16px', letterSpacing: 0 },
    meta: { color: '#475569', fontSize: '12px', fontWeight: 700, overflowWrap: 'anywhere' },
    formRow: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' },
    fieldLabel: { display: 'grid', gap: '4px', color: '#334155', fontSize: '12px', fontWeight: 800 },
    compactField: { display: 'grid', gap: '4px', color: '#334155', fontSize: '11px', fontWeight: 900, minWidth: 0 },
    select: { width: '100%', minHeight: '34px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 8px', fontWeight: 800 },
    chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
    chip: { minWidth: '34px', minHeight: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #94a3b8', background: '#eef2ff', color: '#1e1b4b', fontSize: '12px', fontWeight: 900 },
    theoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: '6px', marginBottom: '10px' },
    theoryCard: { minHeight: '66px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', padding: '7px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '4px', fontSize: '12px', overflowWrap: 'anywhere' },
    chordButtons: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginBottom: '8px' },
    melodyControls: { display: 'grid', gridTemplateColumns: 'minmax(128px, 1fr) minmax(128px, 1fr)', gap: '8px', alignItems: 'end', marginBottom: '10px' },
    staffEditor: { display: 'grid', gap: '8px', marginBottom: '10px' },
    staffToolbar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '8px', alignItems: 'end' },
    staffSvg: { width: '100%', minHeight: '148px', display: 'block', border: '1px solid #cbd5e1', background: '#ffffff', touchAction: 'manipulation' },
    bridgePanel: { display: 'grid', gap: '8px', marginBottom: '10px' },
    bridgeHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', color: '#0f172a', fontSize: '13px' },
    bridgeSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(42px, 1fr))', gap: '5px' },
    bridgeStepCell: { minHeight: '48px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', display: 'grid', alignContent: 'space-between', gap: '3px', padding: '5px', textAlign: 'left', cursor: 'pointer' },
    bridgeStepCellOn: { border: '1px solid #0f766e', background: '#ccfbf1', color: '#0f172a', boxShadow: 'inset 0 0 0 1px #0f766e' },
    bridgeStepCellDrum: { border: '1px solid #a16207', background: '#fef3c7', color: '#78350f' },
    bridgeStepNumber: { fontSize: '10px', fontWeight: 900, color: 'inherit' },
    bridgeStepContent: { display: 'grid', gap: '2px', minHeight: '18px', fontSize: '10px', fontWeight: 900, overflowWrap: 'anywhere' },
    bridgeNotePill: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '16px', border: '1px solid currentColor', padding: '0 3px', fontSize: '10px', lineHeight: 1.1 },
    bridgeRows: { display: 'grid', gap: '5px' },
    bridgeRow: { display: 'grid', gridTemplateColumns: 'minmax(46px, 0.7fr) repeat(4, minmax(54px, 1fr))', gap: '5px', alignItems: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '5px', color: '#334155', fontSize: '11px', fontWeight: 800, overflowWrap: 'anywhere' },
    notationComposer: { display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(118px, 0.45fr)', gap: '8px', alignItems: 'end', marginBottom: '8px' },
    notationTextarea: { width: '100%', minHeight: '54px', resize: 'vertical', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '7px', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '12px', boxSizing: 'border-box' },
    barTabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' },
    barTab: { minHeight: '34px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: 800, cursor: 'pointer' },
    barTabOn: { background: '#ccfbf1', border: '1px solid #0f766e', color: '#0f172a' },
    starterSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: '6px', marginBottom: '10px' },
    starterChip: { minHeight: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: 900 },
    starterChipDone: { border: '1px solid #15803d', background: '#dcfce7', color: '#14532d' },
    starterChipCurrent: { border: '1px solid #0f766e', background: '#ecfeff', color: '#134e4a', boxShadow: 'inset 0 0 0 2px #0f766e' },
    starterNext: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: '8px', alignItems: 'center', marginBottom: '10px' },
    starterNextText: { display: 'grid', gap: '2px', minWidth: 0 },
    starterNextKicker: { color: '#0f766e', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 },
    starterNextTitle: { color: '#0f172a', fontSize: '14px', fontWeight: 900, overflowWrap: 'anywhere' },
    starterNextDesc: { color: '#475569', fontSize: '12px', fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' },
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
    keyboardControls: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(94px, 1fr))', gap: '8px', alignItems: 'end', marginBottom: '10px' },
    keyboardKeys: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(42px, 1fr))', gap: '4px', alignItems: 'stretch' },
    keyboardKey: { minHeight: '74px', border: '1px solid #94a3b8', padding: '7px 4px', display: 'grid', alignContent: 'space-between', justifyItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', overflowWrap: 'anywhere' },
    keyboardKeyWhite: { background: '#ffffff', color: '#0f172a' },
    keyboardKeyBlack: { background: '#111827', color: '#ffffff', border: '1px solid #111827' },
    keyboardKeyOutside: { boxShadow: 'inset 0 -4px 0 #fbbf24' },
    keyboardKeyHint: { minHeight: '16px', color: 'inherit', opacity: 0.72, fontSize: '10px', fontWeight: 900 },
    recordButtonOn: { background: '#dcfce7', border: '1px solid #15803d', color: '#14532d', boxShadow: 'inset 0 0 0 2px #15803d' },
    patchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: '8px' },
    patchActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' },
    timeline: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '8px' },
    songControls: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '6px', marginBottom: '10px' },
    patternLauncher: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: '8px', marginBottom: '10px' },
    patternPad: { minHeight: '112px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#111827', padding: '8px', display: 'grid', gap: '5px', alignContent: 'start', textAlign: 'left', fontSize: '12px', lineHeight: 1.2, fontWeight: 800, cursor: 'pointer', overflowWrap: 'anywhere' },
    patternPadActive: { border: '1px solid #0f766e', background: '#ccfbf1', boxShadow: 'inset 0 0 0 2px #0f766e' },
    patternSlot: { width: '28px', minHeight: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #0f766e', background: '#ecfeff', color: '#0f172a', fontWeight: 900 },
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
    effectHeader: { display: 'grid', gridTemplateColumns: 'minmax(136px, 1fr) minmax(112px, 0.55fr)', gap: '8px', alignItems: 'end', marginBottom: '10px' },
    effectRack: { display: 'grid', gap: '8px' },
    effectRow: { display: 'grid', gap: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px' },
    effectRowOn: { border: '1px solid #0f766e', background: '#ecfeff', boxShadow: 'inset 0 0 0 1px #0f766e' },
    effectToggle: { display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '12px', fontWeight: 900 },
    effectParamGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: '8px', alignItems: 'end' },
    automationPanel: { display: 'grid', gap: '8px', marginTop: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px' },
    automationControls: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '8px', alignItems: 'end' },
    automationCurveSvg: { width: '100%', minHeight: '132px', border: '1px solid #cbd5e1', background: '#ffffff', touchAction: 'none', cursor: 'crosshair', display: 'block' },
    automationCurveGrid: { stroke: '#cbd5e1' },
    automationCurveBeat: { stroke: '#64748b' },
    automationCurvePath: { stroke: '#0f766e' },
    automationCurvePoint: { fill: '#ffffff', stroke: '#0f766e' },
    automationCurvePointSelected: { fill: '#fbbf24' },
    automationSteps: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(24px, 1fr))', gap: '4px' },
    automationStep: { minHeight: '30px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '11px', fontWeight: 900, cursor: 'pointer', padding: 0 },
    automationStepOn: { background: '#fde68a', border: '1px solid #a16207', color: '#111827' },
    automationStepSelected: { boxShadow: 'inset 0 0 0 2px #0f766e', border: '1px solid #0f766e' },
    automationActions: { display: 'grid', gridTemplateColumns: 'minmax(112px, 1fr) minmax(112px, 1fr)', gap: '6px' },
    learningNote: { margin: '0 0 10px', color: '#334155', fontSize: '12px', lineHeight: 1.45 },
    barCell: { minHeight: '74px', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', fontSize: '12px' },
    license: { marginTop: '10px', color: '#166534', fontWeight: 800, fontSize: '12px' },
    projectButtons: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(98px, 1fr))', gap: '6px', marginBottom: '10px' },
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
    stemActionRow: { display: 'grid', gridTemplateColumns: 'minmax(110px, 0.7fr) minmax(130px, 1fr)', gap: '8px', alignItems: 'stretch', marginBottom: '8px' },
    stemTargetRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' },
    stemChip: { minHeight: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #0f766e', background: '#ccfbf1', color: '#0f172a', padding: '0 8px', fontSize: '12px', fontWeight: 900 },
    readinessBadge: { minHeight: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #64748b', padding: '0 8px', fontSize: '12px', fontWeight: 900, textAlign: 'center' },
    readinessReady: { border: '1px solid #15803d', background: '#dcfce7', color: '#14532d' },
    readinessWarning: { border: '1px solid #a16207', background: '#fef3c7', color: '#78350f' },
    readinessBlocked: { border: '1px solid #b91c1c', background: '#fee2e2', color: '#7f1d1d' },
    requirementList: { display: 'grid', gap: '6px', marginBottom: '8px' },
    requirementRow: { display: 'grid', gridTemplateColumns: 'minmax(84px, 0.8fr) minmax(84px, 0.8fr) minmax(90px, 1fr)', gap: '6px', alignItems: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', padding: '7px', fontSize: '12px', overflowWrap: 'anywhere' },
    warning: { marginTop: '10px', color: '#991b1b', fontWeight: 800, fontSize: '12px' },
    textarea: { width: '100%', minHeight: '170px', resize: 'vertical', border: '1px solid #cbd5e1', padding: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '12px', boxSizing: 'border-box' },
    muted: { color: '#475569' }
  };

  function mergeOpenGrooveStyles(base, overrides) {
    var merged = {};
    Object.keys(base).forEach(function (key) {
      merged[key] = Object.assign({}, base[key], overrides && overrides[key] || {});
    });
    Object.keys(overrides || {}).forEach(function (key) {
      if (!merged[key]) merged[key] = Object.assign({}, overrides[key]);
    });
    return merged;
  }

  function getOpenGrooveStyles(themeMode) {
    var dark = {
      overlay: { background: 'rgba(2, 6, 23, 0.86)' },
      shell: { background: '#0f172a', color: '#f8fafc', border: '1px solid #64748b', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.52)' },
      panel: { background: '#111827', color: '#f8fafc', border: '1px solid #64748b' },
      header: { background: '#111827', borderBottom: '1px solid #64748b' },
      eyebrow: { color: '#5eead4' },
      subtitle: { color: '#cbd5e1' },
      transportButton: { border: '1px solid #94a3b8', background: '#1f2937', color: '#f8fafc' },
      loopButtonOn: { background: '#115e59', border: '1px solid #5eead4', color: '#ecfeff', boxShadow: 'inset 0 0 0 2px #5eead4' },
      tempoLabel: { color: '#e2e8f0' },
      tempoInput: { border: '1px solid #94a3b8', background: '#020617', color: '#f8fafc' },
      swingLabel: { color: '#e2e8f0' },
      swingSlider: { accentColor: '#5eead4' },
      swingValue: { color: '#e2e8f0' },
      themeLabel: { color: '#e2e8f0' },
      themeSelect: { border: '1px solid #94a3b8', background: '#020617', color: '#f8fafc' },
      iconButton: { border: '1px solid #f8fafc', background: '#f8fafc', color: '#020617' },
      playheadPanel: { background: '#0f172a', borderBottom: '1px solid #64748b' },
      playheadTrack: { border: '1px solid #94a3b8', background: '#020617' },
      playheadFill: { background: '#2dd4bf' },
      playheadLine: { background: '#facc15' },
      playheadStatus: { color: '#e2e8f0' },
      workspaceBar: { background: '#111827', borderBottom: '1px solid #64748b' },
      workspaceLabel: { color: '#e2e8f0' },
      workspaceTab: { border: '1px solid #94a3b8', background: '#1f2937', color: '#f8fafc' },
      workspaceTabOn: { border: '1px solid #5eead4', background: '#115e59', color: '#ecfeff', boxShadow: 'inset 0 0 0 2px #5eead4' },
      workspaceJump: { color: '#e2e8f0' },
      workspaceJumpSelect: { border: '1px solid #94a3b8', background: '#020617', color: '#f8fafc' },
      workspaceSummary: { color: '#cbd5e1' },
      surface: { background: '#111827', border: '1px solid #64748b' },
      meta: { color: '#cbd5e1' },
      fieldLabel: { color: '#e2e8f0' },
      compactField: { color: '#e2e8f0' },
      select: { border: '1px solid #94a3b8', background: '#020617', color: '#f8fafc' },
      chip: { border: '1px solid #94a3b8', background: '#1e293b', color: '#f8fafc' },
      theoryCard: { border: '1px solid #64748b', background: '#1f2937', color: '#e2e8f0' },
      staffSvg: { border: '1px solid #64748b', background: '#020617' },
      bridgeHeader: { color: '#f8fafc' },
      bridgeStepCell: { border: '1px solid #64748b', background: '#1f2937', color: '#e2e8f0' },
      bridgeStepCellOn: { border: '1px solid #5eead4', background: '#134e4a', color: '#ecfeff', boxShadow: 'inset 0 0 0 1px #5eead4' },
      bridgeStepCellDrum: { border: '1px solid #fde68a', background: '#713f12', color: '#fef3c7' },
      bridgeRow: { borderTop: '1px solid #64748b', color: '#e2e8f0' },
      notationTextarea: { border: '1px solid #94a3b8', background: '#020617', color: '#f8fafc' },
      barTab: { border: '1px solid #64748b', background: '#1f2937', color: '#e2e8f0' },
      barTabOn: { background: '#115e59', border: '1px solid #5eead4', color: '#ecfeff' },
      starterChip: { border: '1px solid #64748b', background: '#1f2937', color: '#e2e8f0' },
      starterChipDone: { border: '1px solid #86efac', background: '#14532d', color: '#dcfce7' },
      starterChipCurrent: { border: '1px solid #5eead4', background: '#134e4a', color: '#ecfeff', boxShadow: 'inset 0 0 0 2px #5eead4' },
      starterNextKicker: { color: '#5eead4' },
      starterNextTitle: { color: '#f8fafc' },
      starterNextDesc: { color: '#cbd5e1' },
      pad: { border: '1px solid #94a3b8', background: '#1f2937', color: '#f8fafc' },
      padSelected: { background: '#115e59', border: '1px solid #5eead4', boxShadow: 'inset 0 0 0 2px #5eead4' },
      padIndex: { color: '#cbd5e1' },
      step: { border: '1px solid #64748b', background: '#1f2937', color: '#f8fafc' },
      stepBeat: { border: '1px solid #e2e8f0' },
      stepOn: { background: '#facc15', border: '1px solid #fef3c7', color: '#111827' },
      stats: { color: '#cbd5e1' },
      noteLabel: { border: '1px solid #94a3b8', background: '#1f2937', color: '#f8fafc' },
      noteStep: { border: '1px solid #64748b', background: '#1f2937', color: '#f8fafc' },
      noteStepOn: { background: '#38bdf8', border: '1px solid #bae6fd', color: '#082f49' },
      keyboardKeyWhite: { background: '#e2e8f0', color: '#0f172a', border: '1px solid #cbd5e1' },
      keyboardKeyBlack: { background: '#020617', color: '#f8fafc', border: '1px solid #94a3b8' },
      keyboardKeyOutside: { boxShadow: 'inset 0 -4px 0 #facc15' },
      recordButtonOn: { background: '#14532d', border: '1px solid #86efac', color: '#dcfce7', boxShadow: 'inset 0 0 0 2px #86efac' },
      patternPad: { border: '1px solid #64748b', background: '#1f2937', color: '#f8fafc' },
      patternPadActive: { border: '1px solid #5eead4', background: '#134e4a', boxShadow: 'inset 0 0 0 2px #5eead4' },
      patternSlot: { border: '1px solid #5eead4', background: '#020617', color: '#ecfeff' },
      songSection: { border: '1px solid #64748b', background: '#1f2937', color: '#f8fafc' },
      songSectionActive: { background: '#14532d', border: '1px solid #86efac', boxShadow: 'inset 0 0 0 2px #86efac' },
      mixerRow: { border: '1px solid #64748b', background: '#1f2937' },
      mixerName: { color: '#e2e8f0' },
      sliderLabel: { color: '#e2e8f0' },
      mixerSlider: { accentColor: '#5eead4' },
      mixerValue: { color: '#e2e8f0' },
      muteButtonOn: { background: '#7f1d1d', border: '1px solid #fecaca', color: '#fee2e2' },
      soloButtonOn: { background: '#1e3a8a', border: '1px solid #bfdbfe', color: '#dbeafe' },
      effectRow: { border: '1px solid #64748b', background: '#1f2937' },
      effectRowOn: { border: '1px solid #5eead4', background: '#134e4a', boxShadow: 'inset 0 0 0 1px #5eead4' },
      effectToggle: { color: '#f8fafc' },
      automationPanel: { border: '1px solid #64748b', background: '#1f2937' },
      automationCurveSvg: { border: '1px solid #64748b', background: '#020617' },
      automationCurveGrid: { stroke: '#334155' },
      automationCurveBeat: { stroke: '#94a3b8' },
      automationCurvePath: { stroke: '#5eead4' },
      automationCurvePoint: { fill: '#020617', stroke: '#5eead4' },
      automationCurvePointSelected: { fill: '#facc15' },
      automationStep: { border: '1px solid #64748b', background: '#020617', color: '#f8fafc' },
      automationStepOn: { background: '#facc15', border: '1px solid #fef3c7', color: '#111827' },
      automationStepSelected: { boxShadow: 'inset 0 0 0 2px #5eead4', border: '1px solid #5eead4' },
      learningNote: { color: '#e2e8f0' },
      barCell: { border: '1px solid #64748b', background: '#1f2937', color: '#f8fafc' },
      license: { color: '#86efac' },
      smallButton: { border: '1px solid #94a3b8', background: '#1f2937', color: '#f8fafc' },
      wideButton: { border: '1px solid #5eead4', background: '#115e59', color: '#ecfeff' },
      sampleRegion: { border: '1px solid #64748b', background: '#1e293b', color: '#f8fafc' },
      assetRow: { border: '1px solid #64748b', background: '#1f2937', color: '#f8fafc' },
      stemChip: { border: '1px solid #5eead4', background: '#115e59', color: '#ecfeff' },
      readinessBadge: { border: '1px solid #94a3b8' },
      readinessReady: { border: '1px solid #86efac', background: '#14532d', color: '#dcfce7' },
      readinessWarning: { border: '1px solid #fde68a', background: '#713f12', color: '#fef3c7' },
      readinessBlocked: { border: '1px solid #fca5a5', background: '#7f1d1d', color: '#fee2e2' },
      requirementRow: { border: '1px solid #64748b', background: '#1f2937', color: '#e2e8f0' },
      recordButton: { border: '1px solid #fca5a5', background: '#7f1d1d', color: '#fee2e2' },
      recordingButton: { background: '#fee2e2', color: '#7f1d1d' },
      warning: { color: '#fca5a5' },
      textarea: { border: '1px solid #94a3b8', background: '#020617', color: '#f8fafc' },
      muted: { color: '#cbd5e1' }
    };

    var contrast = {
      overlay: { background: '#000000' },
      shell: { background: '#000000', color: '#ffffff', border: '2px solid #ffffff', boxShadow: 'none' },
      panel: { background: '#000000', color: '#ffffff', border: '2px solid #ffffff' },
      header: { background: '#000000', borderBottom: '2px solid #ffffff' },
      eyebrow: { color: '#ffff00' },
      subtitle: { color: '#ffffff' },
      transportButton: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      loopButtonOn: { background: '#ffff00', border: '2px solid #ffffff', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      tempoLabel: { color: '#ffffff' },
      tempoInput: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      swingLabel: { color: '#ffffff' },
      swingSlider: { accentColor: '#ffff00' },
      swingValue: { color: '#ffffff' },
      themeLabel: { color: '#ffffff' },
      themeSelect: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      iconButton: { border: '2px solid #ffffff', background: '#ffffff', color: '#000000' },
      playheadPanel: { background: '#000000', borderBottom: '2px solid #ffffff' },
      playheadTrack: { border: '2px solid #ffffff', background: '#000000' },
      playheadFill: { background: '#ffff00' },
      playheadLine: { background: '#00ffff' },
      playheadStatus: { color: '#ffffff' },
      workspaceBar: { background: '#000000', borderBottom: '2px solid #ffffff' },
      workspaceLabel: { color: '#ffffff' },
      workspaceTab: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      workspaceTabOn: { border: '2px solid #ffffff', background: '#ffff00', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      workspaceJump: { color: '#ffffff' },
      workspaceJumpSelect: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      workspaceSummary: { color: '#ffffff' },
      surface: { background: '#000000', border: '2px solid #ffffff' },
      meta: { color: '#ffffff' },
      fieldLabel: { color: '#ffffff' },
      compactField: { color: '#ffffff' },
      select: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      chip: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      theoryCard: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      staffSvg: { border: '2px solid #ffffff', background: '#000000' },
      bridgeHeader: { color: '#ffffff' },
      bridgeStepCell: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      bridgeStepCellOn: { border: '2px solid #ffffff', background: '#00ffff', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      bridgeStepCellDrum: { border: '2px solid #ffffff', background: '#ffff00', color: '#000000' },
      bridgeRow: { borderTop: '2px solid #ffffff', color: '#ffffff' },
      notationTextarea: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      barTab: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      barTabOn: { background: '#00ffff', border: '2px solid #ffffff', color: '#000000' },
      starterChip: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      starterChipDone: { border: '2px solid #ffffff', background: '#00ff66', color: '#000000' },
      starterChipCurrent: { border: '2px solid #ffffff', background: '#ffff00', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      starterNextKicker: { color: '#ffff00' },
      starterNextTitle: { color: '#ffffff' },
      starterNextDesc: { color: '#ffffff' },
      pad: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      padSelected: { background: '#00ffff', border: '2px solid #ffffff', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      padIndex: { color: '#ffffff' },
      step: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      stepBeat: { border: '2px solid #ffff00' },
      stepOn: { background: '#ffff00', border: '2px solid #ffffff', color: '#000000' },
      stats: { color: '#ffffff' },
      noteLabel: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      noteStep: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      noteStepOn: { background: '#00ffff', border: '2px solid #ffffff', color: '#000000' },
      keyboardKeyWhite: { background: '#ffffff', color: '#000000', border: '2px solid #ffffff' },
      keyboardKeyBlack: { background: '#000000', color: '#ffffff', border: '2px solid #ffffff' },
      keyboardKeyOutside: { boxShadow: 'inset 0 -5px 0 #ffff00' },
      recordButtonOn: { background: '#ffff00', border: '2px solid #ffffff', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      patternPad: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      patternPadActive: { background: '#ffff00', border: '2px solid #ffffff', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      patternSlot: { border: '2px solid #ffffff', background: '#00ffff', color: '#000000' },
      songSection: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      songSectionActive: { background: '#00ff66', border: '2px solid #ffffff', color: '#000000', boxShadow: 'inset 0 0 0 2px #000000' },
      mixerRow: { border: '2px solid #ffffff', background: '#000000' },
      mixerName: { color: '#ffffff' },
      sliderLabel: { color: '#ffffff' },
      mixerSlider: { accentColor: '#ffff00' },
      mixerValue: { color: '#ffffff' },
      muteButtonOn: { background: '#ffb3b3', border: '2px solid #ffffff', color: '#000000' },
      soloButtonOn: { background: '#00ffff', border: '2px solid #ffffff', color: '#000000' },
      effectRow: { border: '2px solid #ffffff', background: '#000000' },
      effectRowOn: { border: '2px solid #ffff00', background: '#000000', color: '#ffffff', boxShadow: 'inset 0 0 0 2px #ffff00' },
      effectToggle: { color: '#ffffff' },
      automationPanel: { border: '2px solid #ffffff', background: '#000000' },
      automationCurveSvg: { border: '2px solid #ffffff', background: '#000000' },
      automationCurveGrid: { stroke: '#ffffff' },
      automationCurveBeat: { stroke: '#ffff00' },
      automationCurvePath: { stroke: '#00ffff' },
      automationCurvePoint: { fill: '#000000', stroke: '#ffffff' },
      automationCurvePointSelected: { fill: '#ffff00' },
      automationStep: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      automationStepOn: { background: '#ffff00', border: '2px solid #ffffff', color: '#000000' },
      automationStepSelected: { boxShadow: 'inset 0 0 0 2px #00ffff', border: '2px solid #00ffff' },
      learningNote: { color: '#ffffff' },
      barCell: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      license: { color: '#00ff66' },
      smallButton: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      wideButton: { border: '2px solid #ffffff', background: '#ffff00', color: '#000000' },
      disabledButton: { opacity: 0.7 },
      sampleRegion: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      assetRow: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      stemChip: { border: '2px solid #ffffff', background: '#00ffff', color: '#000000' },
      readinessBadge: { border: '2px solid #ffffff' },
      readinessReady: { border: '2px solid #ffffff', background: '#00ff66', color: '#000000' },
      readinessWarning: { border: '2px solid #ffffff', background: '#ffff00', color: '#000000' },
      readinessBlocked: { border: '2px solid #ffffff', background: '#ffb3b3', color: '#000000' },
      requirementRow: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      recordButton: { border: '2px solid #ffffff', background: '#ffb3b3', color: '#000000' },
      recordingButton: { background: '#ffffff', color: '#000000' },
      warning: { color: '#ffb3b3' },
      textarea: { border: '2px solid #ffffff', background: '#000000', color: '#ffffff' },
      muted: { color: '#ffffff' }
    };

    if (themeMode === 'dark') return mergeOpenGrooveStyles(styles, dark);
    if (themeMode === 'contrast') return mergeOpenGrooveStyles(styles, contrast);
    return styles;
  }

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
