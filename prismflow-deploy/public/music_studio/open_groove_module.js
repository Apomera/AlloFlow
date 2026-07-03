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
    var recordingPair = React.useState(false);
    var recording = recordingPair[0];
    var setRecording = recordingPair[1];
    var playingPair = React.useState(false);
    var playing = playingPair[0];
    var setPlaying = playingPair[1];
    var jsonRef = React.useRef(null);
    var engineRef = React.useRef(null);
    var recorderRef = React.useRef(null);
    var recorderChunksRef = React.useRef([]);
    var pattern = project.patterns[0];
    var drumTrack = project.tracks.find(function (track) { return track.type === 'drumRack'; });
    var synthTrack = project.tracks.find(function (track) { return track.type === 'synth'; });
    var selectedPad = drumTrack && drumTrack.pads.find(function (pad) { return pad.id === selectedPadId; });
    var stepsPerBar = 16;
    var synthPitches = ['C4', 'Bb3', 'G3', 'Eb3', 'C3', 'Bb2', 'G2', 'C2'];
    var visibleSteps = [];
    for (var i = 0; i < stepsPerBar; i++) visibleSteps.push(selectedBar * stepsPerBar + i);
    var barIndexes = [];
    for (var b = 0; b < Math.max(1, pattern && pattern.bars || 1); b++) barIndexes.push(b);

    function mutate(fn) {
      var next = clone(project);
      fn(next);
      setProject(next);
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
      if (!engineRef.current || !engineRef.current.available) engineRef.current = A.ogCreateAudioEngine();
      if (!engineRef.current.available) {
        addToast(engineRef.current.reason || 'Audio is unavailable in this browser.', 'error');
        return;
      }
      if (pad.assetId && A.ogPlaySample && A.ogPlaySample(engineRef.current, pad.assetId, engineRef.current.ctx.currentTime + 0.01, 0.85)) {
        ogAnnounce(pad.name);
        return;
      }
      A.ogPlayDrum(engineRef.current, pad.engine, engineRef.current.ctx.currentTime + 0.01, 0.85);
      ogAnnounce(pad.name);
    }

    function toggleStep(step) {
      if (!pattern || !drumTrack) return;
      mutate(function (next) {
        var nextPattern = next.patterns[0];
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        C.ogSetDrumStep(next, nextPattern.id, nextDrums.id, selectedPadId, step, stepsPerBar, { on: !stepActive(step), velocity: step % 4 === 0 ? 0.9 : 0.65 });
      });
    }

    function triggerNote(pitch, velocity) {
      if (!A) return;
      if (!engineRef.current || !engineRef.current.available) engineRef.current = A.ogCreateAudioEngine();
      if (!engineRef.current.available) return;
      A.ogPlayNote(engineRef.current, { pitch: pitch, midi: C.ogNoteNameToMidi(pitch), velocity: velocity || 0.75 }, engineRef.current.ctx.currentTime + 0.01, 0.22);
    }

    function toggleNote(pitch, step) {
      if (!pattern || !synthTrack) return;
      var nextOn = !noteActive(pitch, step);
      mutate(function (next) {
        var nextPattern = next.patterns[0];
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
        var nextPattern = next.patterns[0];
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
        var nextPattern = next.patterns[0];
        var nextSynth = next.tracks.find(function (track) { return track.type === 'synth'; });
        var fromTick = selectedBar * C.ogTicksPerMeasure(next);
        var toTick = fromTick + C.ogTicksPerMeasure(next);
        if (C.ogClearTrackEvents) C.ogClearTrackEvents(next, nextPattern.id, nextSynth.id, { fromTick: fromTick, toTick: toTick, types: ['chord', 'note'] });
        C.ogApplyChordProgression(next, nextPattern.id, nextSynth.id, [{ root: root, quality: quality }], { startBar: selectedBar, barsPerChord: 1, octave: 3, velocity: 0.58, writeNotes: true });
      });
      addToast('Chord written to bar ' + (selectedBar + 1) + '.', 'success');
    }

    function createOwnedSampleSlot(blob) {
      if (!drumTrack) return null;
      var created = null;
      mutate(function (next) {
        var nextDrums = next.tracks.find(function (track) { return track.type === 'drumRack'; });
        created = C.ogRegisterUserRecording(next, {
          name: blob ? 'Recorded Pad ' + selectedPadId.replace('pad_', '') : 'Owned Sample Slot',
          file: 'session://' + selectedPadId + '-' + Date.now(),
          mimeType: blob && blob.type || null,
          sizeBytes: blob && blob.size || 0,
          createdAt: Date.now(),
          tags: ['pad', selectedPadId]
        });
        C.ogAssignAssetToPad(next, nextDrums.id, selectedPadId, created.id);
      });
      if (blob && A && A.ogDecodeAndRegisterSample) {
        if (!engineRef.current || !engineRef.current.available) engineRef.current = A.ogCreateAudioEngine();
        if (engineRef.current && engineRef.current.available) {
          A.ogDecodeAndRegisterSample(engineRef.current, created.id, blob).then(function (ok) {
            addToast(ok ? 'Recording assigned to ' + (selectedPad && selectedPad.name || 'pad') + '.' : 'Recording metadata saved; playback decode was unavailable.', ok ? 'success' : 'info');
          });
        }
      }
      if (!blob) addToast('Owned sample slot assigned to the selected pad.', 'success');
      ogAnnounce('Sample assigned to ' + (selectedPad && selectedPad.name || 'selected pad'));
      return created;
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
      if (!engineRef.current || !engineRef.current.available) engineRef.current = A.ogCreateAudioEngine();
      if (!engineRef.current.available) {
        addToast(engineRef.current.reason || 'Audio is unavailable in this browser.', 'error');
        return;
      }
      var now = engineRef.current.ctx.currentTime + 0.05;
      var plan = S.ogBuildPlaybackPlan(project, { patternId: pattern.id, originTime: now });
      A.ogSchedulePlan(engineRef.current, plan, { baseTime: 0 });
      setPlaying(true);
      ogAnnounce('Playing pattern');
      root.setTimeout(function () { setPlaying(false); }, Math.max(300, C.ogBarsToTicks(project, pattern.bars) * 60 / (project.bpm * project.ppq) * 1000));
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

    function downloadProject() {
      var safeTitle = String(project.title || 'open-groove').replace(/[^\w -]+/g, '').trim().replace(/ +/g, '-') || 'open-groove';
      downloadText(safeTitle + '.ogroove.json', C.ogSerializeProject(project), 'application/json');
    }

    function loadProjectFromText() {
      try {
        var text = jsonRef.current ? jsonRef.current.value : '';
        var next = C.ogParseProject(text);
        setProject(next);
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

    function prepareAttribution() {
      if (jsonRef.current) jsonRef.current.value = C.ogBuildAttributionText ? C.ogBuildAttributionText(project) : 'No attribution-required assets.';
      addToast('Attribution notes prepared.', 'success');
    }

    function resetDemo() {
      setProject(C.ogMakeDemoProject ? C.ogMakeDemoProject() : C.ogCreateProject({ title: 'Open Groove Prototype' }));
      ogAnnounce('Demo pattern reset');
    }

    var licenseReport = C.ogBuildLicenseReport(project);
    var validation = C.ogValidateProject(project);
    var notation = C.ogBuildNotationPreview(project, pattern.id);
    var currentMeasure = notation.measures[selectedBar] || { notes: [], drumHits: [] };
    var scaleNotes = C.ogBuildScale ? C.ogBuildScale(project.key && project.key.tonic || 'C', project.key && project.key.mode || 'minor') : [];
    var sampleAssets = (project.assets || []).filter(function (asset) { return asset.type === 'recording' || asset.type === 'sample' || asset.type === 'loop'; });
    var chordChoices = chordProgressionFor(project).map(function (chord) {
      return C.ogBuildChord ? C.ogBuildChord(chord.root, chord.quality, 3) : { symbol: chord.root, root: chord.root, quality: chord.quality };
    });

    return h('div', { className: 'og-root', role: 'dialog', 'aria-modal': true, 'aria-label': 'Open Groove Studio', style: styles.overlay },
      h('div', { style: styles.shell },
        h('div', { style: styles.header },
          h('div', null,
            h('div', { style: styles.eyebrow }, 'Milestone 0'),
            h('strong', { style: styles.title }, 'Open Groove Studio'),
            h('div', { style: styles.subtitle }, 'Music learning tool for rhythm, synthesis, and composition')),
          h('div', { style: styles.transport, role: 'toolbar', 'aria-label': 'Transport' },
            h('button', { style: styles.transportButton, onClick: playLoop, disabled: playing, 'aria-label': 'Play pattern' }, 'Play'),
            h('button', { style: styles.transportButton, onClick: stopLoop, 'aria-label': 'Stop pattern' }, 'Stop'),
            h('button', { style: styles.transportButton, onClick: resetDemo, 'aria-label': 'Reset demo pattern' }, 'Reset'),
            h('label', { style: styles.tempoLabel }, 'BPM',
              h('input', { style: styles.tempoInput, type: 'number', min: 40, max: 240, value: project.bpm, onChange: function (ev) { setTempo(ev.target.value); }, 'aria-label': 'Tempo in beats per minute' })),
            h('button', { style: styles.iconButton, 'aria-label': 'Close Open Groove Studio', onClick: props.onClose }, 'X'))),

        h('div', { style: styles.grid },
          h('section', { style: styles.surface, 'aria-label': 'Pads' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Pads'),
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

          h('section', { style: styles.surface, 'aria-label': 'Step sequencer' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Steps'),
              h('span', { style: styles.meta }, selectedPad ? selectedPad.name + ' - bar ' + (selectedBar + 1) : 'Pad')),
            h('div', { style: styles.barTabs, role: 'tablist', 'aria-label': 'Pattern bars' },
              barIndexes.map(function (bar) {
                return h('button', {
                  key: bar,
                  style: Object.assign({}, styles.barTab, selectedBar === bar ? styles.barTabOn : null),
                  role: 'tab',
                  'aria-selected': selectedBar === bar,
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
            h('div', { style: styles.stats },
              h('span', null, pattern.events.filter(function (event) { return event.type === 'drumHit'; }).length + ' drum hits'),
              h('span', null, pattern.events.filter(function (event) { return event.type === 'note'; }).length + ' notes'),
              h('span', null, validation.length ? validation.length + ' checks' : 'valid'))),

          h('section', { style: styles.surface, 'aria-label': 'Synth note grid' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Synth Notes'),
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

          h('section', { style: styles.surface, 'aria-label': 'Harmony tools' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Harmony'),
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
            h('button', { style: styles.wideButton, onClick: applyProgression }, 'Seed 4-bar chord bed')),

          h('section', { style: styles.surface, 'aria-label': 'Composition summary' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Score Preview'),
              h('span', { style: styles.meta }, currentMeasure.notes.length + ' notes in bar ' + (selectedBar + 1))),
            h('p', { style: styles.learningNote }, 'This prototype keeps groove timing and notation timing separate, so a performed beat can later become a readable score without losing feel.'),
            h('div', { style: styles.timeline },
              barIndexes.map(function (bar) {
                var measure = notation.measures[bar] || { notes: [], drumHits: [] };
                return h('div', { key: bar, style: styles.barCell },
                  h('strong', null, 'Bar ' + (bar + 1)),
                  h('span', null, measure.chords && measure.chords.length ? measure.chords.map(function (chord) { return chord.symbol + '@' + chord.startBeat; }).join(', ') : measure.notes.length ? measure.notes.map(function (note) { return note.pitch + '@' + note.startBeat; }).join(', ') : 'Drums: ' + measure.drumHits.length));
              })),
            h('div', { style: styles.license }, licenseReport.exportSafe ? 'Built-in sounds are export-safe.' : licenseReport.warnings[0])),

          h('section', { style: styles.surface, 'aria-label': 'Samples and rights' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Samples'),
              h('span', { style: styles.meta }, sampleAssets.length + ' assets')),
            h('div', { style: styles.sampleControls },
              h('button', {
                style: Object.assign({}, styles.recordButton, recording ? styles.recordingButton : null),
                onClick: recording ? stopRecording : startRecording,
                'aria-pressed': recording,
                'aria-label': recording ? 'Stop recording selected pad' : 'Record selected pad'
              }, recording ? 'Stop' : 'Record Pad'),
              h('button', { style: styles.smallButton, onClick: function () { createOwnedSampleSlot(null); } }, 'Owned Slot'),
              h('button', { style: styles.smallButton, onClick: prepareAttribution }, 'Attribution')),
            h('div', { style: styles.assetList },
              sampleAssets.length ? sampleAssets.map(function (asset) {
                return h('div', { key: asset.id, style: styles.assetRow },
                  h('strong', null, asset.name),
                  h('span', null, asset.license + (asset.localOnly ? ' local' : '')),
                  h('span', null, asset.mimeType || asset.source));
              }) : h('span', { style: styles.muted }, 'No samples assigned yet.')),
            h('div', { style: licenseReport.exportSafe ? styles.license : styles.warning }, licenseReport.exportSafe ? 'Export rights clear.' : licenseReport.warnings.join(' '))),

          h('section', { style: styles.surface, 'aria-label': 'Project JSON' },
            h('div', { style: styles.sectionHeader },
              h('h2', { style: styles.h2 }, 'Project'),
              h('span', { style: styles.meta }, project.title)),
            h('div', { style: styles.projectButtons },
              h('button', { style: styles.smallButton, onClick: saveProject }, 'Prepare JSON'),
              h('button', { style: styles.smallButton, onClick: loadProjectFromText }, 'Load Text'),
              h('button', { style: styles.smallButton, onClick: downloadProject }, 'Download'),
              h('button', { style: styles.smallButton, onClick: prepareMusicXml }, 'MusicXML')),
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
      background: '#ffffff'
    },
    eyebrow: { fontSize: '11px', color: '#0f766e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 },
    title: { fontSize: '20px', letterSpacing: 0 },
    subtitle: { color: '#475569', fontSize: '12px', fontWeight: 700, marginTop: '2px' },
    transport: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    transportButton: { minHeight: '38px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 12px', fontWeight: 800, cursor: 'pointer' },
    tempoLabel: { minHeight: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '12px', fontWeight: 800 },
    tempoInput: { width: '70px', height: '34px', border: '1px solid #9ca3af', padding: '0 8px', fontWeight: 800 },
    iconButton: { width: '38px', height: '38px', border: '1px solid #9ca3af', background: '#111827', color: '#ffffff', fontWeight: 800, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', padding: '12px', overflow: 'auto' },
    surface: { background: '#ffffff', border: '1px solid #d1d5db', padding: '12px', minWidth: 0 },
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' },
    h2: { margin: 0, fontSize: '16px', letterSpacing: 0 },
    meta: { color: '#475569', fontSize: '12px', fontWeight: 700 },
    formRow: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' },
    fieldLabel: { display: 'grid', gap: '4px', color: '#334155', fontSize: '12px', fontWeight: 800 },
    select: { width: '100%', minHeight: '34px', border: '1px solid #9ca3af', background: '#ffffff', color: '#111827', padding: '0 8px', fontWeight: 800 },
    chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
    chip: { minWidth: '34px', minHeight: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #94a3b8', background: '#eef2ff', color: '#1e1b4b', fontSize: '12px', fontWeight: 900 },
    chordButtons: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginBottom: '8px' },
    barTabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' },
    barTab: { minHeight: '34px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '12px', fontWeight: 800, cursor: 'pointer' },
    barTabOn: { background: '#ccfbf1', borderColor: '#0f766e', color: '#0f172a' },
    padGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(74px, 1fr))', gap: '8px' },
    pad: { aspectRatio: '1 / 0.78', border: '1px solid #9ca3af', background: '#e5e7eb', color: '#111827', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px', cursor: 'pointer', textAlign: 'left', minWidth: 0 },
    padSelected: { background: '#ccfbf1', borderColor: '#0f766e', boxShadow: 'inset 0 0 0 2px #0f766e' },
    padIndex: { fontSize: '11px', color: '#475569', fontWeight: 800 },
    padName: { fontSize: '13px', fontWeight: 850, lineHeight: 1.1, overflowWrap: 'anywhere' },
    steps: { display: 'grid', gridTemplateColumns: 'repeat(16, minmax(34px, 1fr))', gap: '6px' },
    step: { height: '44px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#0f172a', fontSize: '12px', fontWeight: 800, cursor: 'pointer' },
    stepBeat: { borderColor: '#475569' },
    stepOn: { background: '#fbbf24', borderColor: '#92400e', color: '#111827' },
    stats: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', color: '#475569', fontSize: '12px', fontWeight: 700 },
    noteGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' },
    noteRow: { display: 'grid', gridTemplateColumns: '54px 1fr', gap: '6px', alignItems: 'center' },
    noteLabel: { height: '34px', border: '1px solid #94a3b8', background: '#f8fafc', color: '#0f172a', fontSize: '12px', fontWeight: 900, cursor: 'pointer' },
    noteSteps: { display: 'grid', gridTemplateColumns: 'repeat(16, minmax(22px, 1fr))', gap: '4px' },
    noteStep: { height: '30px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#111827', fontSize: '12px', fontWeight: 900, cursor: 'pointer' },
    noteStepOn: { background: '#67e8f9', borderColor: '#0e7490' },
    timeline: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))', gap: '8px' },
    learningNote: { margin: '0 0 10px', color: '#334155', fontSize: '12px', lineHeight: 1.45 },
    barCell: { minHeight: '74px', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', fontSize: '12px' },
    license: { marginTop: '10px', color: '#166534', fontWeight: 800, fontSize: '12px' },
    projectButtons: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginBottom: '10px' },
    smallButton: { minHeight: '32px', border: '1px solid #9ca3af', background: '#f8fafc', color: '#111827', padding: '0 10px', fontWeight: 800, cursor: 'pointer' },
    wideButton: { width: '100%', minHeight: '34px', border: '1px solid #0f766e', background: '#ccfbf1', color: '#0f172a', padding: '0 10px', fontWeight: 900, cursor: 'pointer' },
    sampleControls: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', marginBottom: '10px' },
    recordButton: { minHeight: '34px', border: '1px solid #991b1b', background: '#fee2e2', color: '#7f1d1d', padding: '0 10px', fontWeight: 900, cursor: 'pointer' },
    recordingButton: { background: '#7f1d1d', color: '#ffffff' },
    assetList: { display: 'grid', gap: '6px', minHeight: '54px' },
    assetRow: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '6px', alignItems: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', padding: '7px', fontSize: '12px' },
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
