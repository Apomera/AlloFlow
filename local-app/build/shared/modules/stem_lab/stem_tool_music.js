// ═══════════════════════════════════════════
// stem_tool_music.js — Music Synthesizer
// Extracted from stem_lab_module.js (~3,100 lines)
// Piano, scales, chords, harmony pad, beat pad, theory
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('musicSynth'))) {
(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-music')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-music';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  window.StemLab.registerTool('musicSynth', {
    icon: '🎹',
    label: 'Music Synthesizer',
    desc: 'Play a piano, build beats, and learn the science of sound with real-time waveform visualization.',
    color: 'purple',
    category: 'creative',
    questHooks: [
      { id: 'play_notes', label: 'Play 5 musical notes', icon: '🎵', check: function(d) { return (d.notesPlayed || 0) >= 5; }, progress: function(d) { return (d.notesPlayed || 0) + '/5'; } },
      { id: 'adjust_filter', label: 'Experiment with audio filters', icon: '🏛️', check: function(d) { return d.filterType && d.filterType !== 'lowpass'; }, progress: function(d) { return d.filterType !== 'lowpass' ? 'Adjusted!' : 'Change filter'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var t = ctx.t || function(k) { return k; };
      var setStemLabTool = function(v) { if (ctx.setStemLabTool) ctx.setStemLabTool(v); };
      var setToolSnapshots = ctx.setToolSnapshots || function() {};
      var callGemini = ctx.callGemini;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
          var d = (ctx.toolData && ctx.toolData["musicSynth"]) || {};
          var upd = function(key, val) { ctx.update("musicSynth", key, val); };

          // --- Tooltip helper ---
          var Tip = function (props) {
            var showId = 'tip_' + props.id;
            var isOpen = d[showId];
            return React.createElement("span", { className: "relative inline-block ml-1" },
              React.createElement("button", { "aria-label": "Toggle tooltip: " + props.title,
                onClick: function () { upd(showId, !isOpen); },
                className: "w-4 h-4 rounded-full text-[11px] font-bold leading-none inline-flex items-center justify-center " + (isOpen ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-500 hover:bg-violet-200"),
                title: props.text
              }, "\u24D8"),
              isOpen && React.createElement("div", { className: "absolute z-50 left-6 top-0 w-64 p-2.5 bg-white border border-violet-200 rounded-lg shadow-xl text-[11px] text-slate-600 leading-relaxed", style: { maxHeight: "200px", overflowY: "auto" } },
                React.createElement("div", { className: "font-bold text-violet-700 mb-0.5" }, "\uD83D\uDD2C " + props.title),
                props.text
              )
            );
          };

          // --- Audio Context singleton ---
          if (!window._alloSynthCtx) {
            window._alloSynthCtx = null; window._alloSynthGain = null; window._alloSynthAnalyser = null;
            window._alloSynthActiveNotes = {}; window._alloSynthSeqInterval = null; window._alloSynthEffects = null;
            window._alloMetronomeInterval = null; window._alloArpInterval = null;
            window._alloParticles = [];
          }
          function makeDistCurve(amount) {
            var k = Math.max(1, amount); var samples = 44100; var curve = new Float32Array(samples);
            for (var i = 0; i < samples; i++) { var x = (i * 2) / samples - 1; curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); }
            return curve;
          }
          function getCtx() {
            if (!window._alloSynthCtx || window._alloSynthCtx.state === 'closed') {
              var ac = new (window.AudioContext || window.webkitAudioContext)();
              var gain = ac.createGain(); gain.gain.value = d.volume || 0.5;
              var analyser = ac.createAnalyser(); analyser.fftSize = 2048;
              // Resonant filter
              var filter = ac.createBiquadFilter();
              filter.type = d.filterType || 'lowpass';
              filter.frequency.value = d.filterCutoff || 20000;
              filter.Q.value = d.filterQ || 1;
              // Delay
              var delay = ac.createDelay(2); delay.delayTime.value = (d.delayTime || 300) / 1000;
              var delayFeedback = ac.createGain(); delayFeedback.gain.value = d.delayFeedback || 0.3;
              var delayWet = ac.createGain(); delayWet.gain.value = d.delayMix || 0;
              var delayDry = ac.createGain(); delayDry.gain.value = 1;
              delay.connect(delayFeedback); delayFeedback.connect(delay); delay.connect(delayWet);
              // Distortion
              var distortion = ac.createWaveShaper();
              distortion.curve = makeDistCurve(d.distAmount || 0); distortion.oversample = '4x';
              // Reverb
              var convolver = ac.createConvolver();
              var reverbWet = ac.createGain(); reverbWet.gain.value = d.reverbMix || 0;
              var reverbDry = ac.createGain(); reverbDry.gain.value = 1;
              var reverbLen = (d.reverbSize || 1.5) * ac.sampleRate;
              var impulse = ac.createBuffer(2, reverbLen, ac.sampleRate);
              for (var ch = 0; ch < 2; ch++) { var imp = impulse.getChannelData(ch); for (var si = 0; si < reverbLen; si++) { imp[si] = (Math.random() * 2 - 1) * Math.pow(1 - si / reverbLen, 2); } }
              convolver.buffer = impulse;
              // Chorus
              var chorusDelay = ac.createDelay(0.1); chorusDelay.delayTime.value = 0.02;
              var chorusLFO = ac.createOscillator(); var chorusDepth = ac.createGain();
              chorusLFO.frequency.value = d.chorusRate || 1.5; chorusDepth.gain.value = (d.chorusMix || 0) > 0 ? 0.003 : 0;
              chorusLFO.connect(chorusDepth); chorusDepth.connect(chorusDelay.delayTime); chorusLFO.start();
              var chorusWet = ac.createGain(); chorusWet.gain.value = d.chorusMix || 0;
              // Tremolo (amplitude LFO)
              var tremoloLFO = ac.createOscillator(); tremoloLFO.type = 'sine';
              tremoloLFO.frequency.value = d.tremoloRate || 5;
              var tremoloGain = ac.createGain(); tremoloGain.gain.value = d.tremoloDepth || 0;
              var tremoloNode = ac.createGain(); tremoloNode.gain.value = 1;
              tremoloLFO.connect(tremoloGain); tremoloGain.connect(tremoloNode.gain); tremoloLFO.start();
              // Chain: source -> filter -> distortion -> delay/reverb/chorus -> tremolo -> gain -> analyser -> dest
              filter.connect(distortion);
              distortion.connect(delayDry); distortion.connect(delay); distortion.connect(reverbDry);
              distortion.connect(convolver); distortion.connect(chorusDelay);
              delayDry.connect(tremoloNode); delayWet.connect(tremoloNode); reverbDry.connect(tremoloNode);
              convolver.connect(reverbWet); reverbWet.connect(tremoloNode);
              chorusDelay.connect(chorusWet); chorusWet.connect(tremoloNode);
              tremoloNode.connect(gain); gain.connect(analyser); analyser.connect(ac.destination);
              window._alloSynthCtx = ac; window._alloSynthGain = gain; window._alloSynthAnalyser = analyser;
              window._alloSynthEffects = { filter: filter, distortion: distortion, delay: delay, delayFeedback: delayFeedback, delayWet: delayWet, delayDry: delayDry, convolver: convolver, reverbWet: reverbWet, reverbDry: reverbDry, chorusDelay: chorusDelay, chorusLFO: chorusLFO, chorusDepth: chorusDepth, chorusWet: chorusWet, tremoloLFO: tremoloLFO, tremoloGain: tremoloGain, tremoloNode: tremoloNode };
            }
            if (window._alloSynthCtx.state === 'suspended') window._alloSynthCtx.resume();
            window._alloSynthGain.gain.value = d.volume || 0.5;
            var fx = window._alloSynthEffects;
            if (fx) {
              fx.filter.type = d.filterType || 'lowpass'; fx.filter.frequency.value = d.filterCutoff || 20000; fx.filter.Q.value = d.filterQ || 1;
              fx.delay.delayTime.value = (d.delayTime || 300) / 1000; fx.delayFeedback.gain.value = d.delayFeedback || 0.3;
              fx.delayWet.gain.value = d.delayMix || 0; fx.distortion.curve = makeDistCurve(d.distAmount || 0);
              fx.reverbWet.gain.value = d.reverbMix || 0; fx.chorusLFO.frequency.value = d.chorusRate || 1.5;
              fx.chorusDepth.gain.value = (d.chorusMix || 0) > 0 ? 0.003 : 0; fx.chorusWet.gain.value = d.chorusMix || 0;
              fx.tremoloLFO.frequency.value = d.tremoloRate || 5; fx.tremoloGain.gain.value = d.tremoloDepth || 0;
            }
            return { ctx: window._alloSynthCtx, gain: window._alloSynthGain, analyser: window._alloSynthAnalyser, effects: window._alloSynthEffects };
          }

          // ═══ NOTE & FREQUENCY ═══
          var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          var NOTE_NAMES_FLAT = ['C', 'D\u266D', 'D', 'E\u266D', 'E', 'F', 'G\u266D', 'G', 'A\u266D', 'A', 'B\u266D', 'B'];
          // Chromatic color mapping (each semitone gets a hue)
          var NOTE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];
          function noteFreq(note, octave) {
            var semitone = NOTE_NAMES.indexOf(note);
            if (semitone === -1) semitone = NOTE_NAMES_FLAT.indexOf(note);
            var n = (octave - 4) * 12 + (semitone - 9);
            return 440 * Math.pow(2, n / 12);
          }
          function noteColor(note) { return NOTE_COLORS[NOTE_NAMES.indexOf(note)] || '#6366f1'; }
          var oct = d.octave || 4;
          var KEYS = [];
          var whiteKeyIdx = 0;
          for (var o = oct; o <= oct + 1; o++) {
            for (var ni = 0; ni < 12; ni++) {
              var isBlack = [1, 3, 6, 8, 10].indexOf(ni) !== -1;
              KEYS.push({ note: NOTE_NAMES[ni], octave: o, freq: noteFreq(NOTE_NAMES[ni], o), isBlack: isBlack, semitone: (o - oct) * 12 + ni, position: isBlack ? whiteKeyIdx - 1 : whiteKeyIdx });
              if (!isBlack) whiteKeyIdx++;
            }
          }

          // ═══ PARTICLE SYSTEM ═══
          function spawnParticles(noteId, color, x, y) {
            if (!window._alloParticles) window._alloParticles = [];
            for (var p = 0; p < 8; p++) {
              window._alloParticles.push({
                x: x || 200, y: y || 100, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1,
                size: Math.random() * 4 + 2, life: 1.0, decay: 0.015 + Math.random() * 0.01,
                color: color || '#a855f7', noteId: noteId
              });
            }
          }

          // ═══ ENHANCED SYNTH ENGINES ═══

          // FM Synthesis — two oscillators where one modulates the other's frequency
          function playFM(freq, noteId, modRatio, modDepth) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            var carrier = cx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = freq;
            var modulator = cx.createOscillator(); modulator.type = 'sine';
            modulator.frequency.value = freq * (modRatio || 2);
            var modGain = cx.createGain();
            modGain.gain.value = freq * (modDepth || 1.5);
            modulator.connect(modGain); modGain.connect(carrier.frequency);
            var env = cx.createGain();
            var atk = d.attack || 0.02; var dec = d.decay || 0.2; var sus = d.sustain || 0.5; var rel = d.release || 0.4;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + dec);
            // FM mod envelope — depth decreases over time for evolving timbre
            var modEnv = cx.createGain(); modEnv.gain.setValueAtTime(1, now);
            modEnv.gain.exponentialRampToValueAtTime(0.3, now + 1);
            modGain.connect(modEnv); modEnv.connect(carrier.frequency);
            carrier.connect(env); env.connect(audio.effects.filter);
            carrier.start(now); modulator.start(now);
            window._alloSynthActiveNotes[noteId] = { osc: carrier, env: env, extras: [modulator] };
            var ni = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, '')); if (ni >= 0) spawnParticles(noteId, NOTE_COLORS[ni]);
          }

          // SuperSaw — multiple detuned sawtooth oscillators stacked for huge EDM leads/pads
          function playSuperSaw(freq, noteId, voiceCount, detune, spread) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            var voices = voiceCount || d.superVoices || 5;
            var det = detune || d.superDetune || 15; // cents
            var merger = cx.createGain(); merger.gain.value = 1 / voices;
            var env = cx.createGain();
            var atk = d.attack || 0.01; var sus = d.sustain || 0.8;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + (d.decay || 0.1));
            var oscs = [];
            for (var v = 0; v < voices; v++) {
              var osc = cx.createOscillator(); osc.type = 'sawtooth';
              var detuneAmount = (v - (voices - 1) / 2) * (det * 2 / (voices - 1));
              osc.frequency.value = freq; osc.detune.value = detuneAmount;
              // Slight stereo spread via pan (if available)
              var pan; try { pan = cx.createStereoPanner(); pan.pan.value = (v / (voices - 1)) * 2 - 1; } catch(e) { pan = cx.createGain(); pan.gain.value = 1; }
              osc.connect(pan); pan.connect(merger);
              osc.start(now); oscs.push(osc);
            }
            merger.connect(env); env.connect(audio.effects.filter);
            window._alloSynthActiveNotes[noteId] = { osc: oscs[0], env: env, extras: oscs.slice(1) };
            var ni = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, '')); if (ni >= 0) spawnParticles(noteId, NOTE_COLORS[ni]);
          }

          // Sub Bass — deep sine sub with optional square overtone
          function playSubBass(freq, noteId) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            // Sub oscillator (sine, 1 octave down)
            var sub = cx.createOscillator(); sub.type = 'sine'; sub.frequency.value = freq / 2;
            var subGain = cx.createGain(); subGain.gain.value = 0.7;
            // Body oscillator (square at fundamental)
            var body = cx.createOscillator(); body.type = 'square'; body.frequency.value = freq;
            var bodyGain = cx.createGain(); bodyGain.gain.value = 0.3;
            // Pitch envelope (slight downward sweep for punch)
            sub.frequency.setValueAtTime(freq / 2 * 1.5, now);
            sub.frequency.exponentialRampToValueAtTime(freq / 2, now + 0.05);
            body.frequency.setValueAtTime(freq * 1.3, now);
            body.frequency.exponentialRampToValueAtTime(freq, now + 0.04);
            var env = cx.createGain();
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + 0.005);
            env.gain.linearRampToValueAtTime(d.sustain || 0.9, now + 0.01 + (d.decay || 0.05));
            sub.connect(subGain); body.connect(bodyGain);
            subGain.connect(env); bodyGain.connect(env);
            env.connect(audio.effects.filter);
            sub.start(now); body.start(now);
            window._alloSynthActiveNotes[noteId] = { osc: sub, env: env, extras: [body] };
            var ni = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, '')); if (ni >= 0) spawnParticles(noteId, NOTE_COLORS[ni]);
          }

          // Pad Synth — warm layered sine+triangle with slow attack, chorus-like detuning
          function playPad(freq, noteId) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            var oscs = [];
            var merger = cx.createGain(); merger.gain.value = 0.25;
            // 4 layers: fundamental + octave + fifth + slight detune
            var ratios = [1, 2, 1.5, 1.003];
            var types = ['sine', 'triangle', 'sine', 'triangle'];
            var vols = [0.5, 0.2, 0.15, 0.15];
            ratios.forEach(function(ratio, i) {
              var osc = cx.createOscillator(); osc.type = types[i]; osc.frequency.value = freq * ratio;
              var g = cx.createGain(); g.gain.value = vols[i];
              osc.connect(g); g.connect(merger); osc.start(now); oscs.push(osc);
            });
            var env = cx.createGain();
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(0.8, now + (d.attack || 0.5));
            env.gain.linearRampToValueAtTime(d.sustain || 0.6, now + (d.attack || 0.5) + (d.decay || 0.3));
            merger.connect(env); env.connect(audio.effects.filter);
            window._alloSynthActiveNotes[noteId] = { osc: oscs[0], env: env, extras: oscs.slice(1) };
          }

          // ═══ EDM PRESET ENGINE ═══
          var EDM_PRESETS = [
            { id: 'edm_lead', name: 'EDM Lead', icon: '\u26A1', engine: 'supersaw', params: { superVoices: 7, superDetune: 20, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2, filterCutoff: 8000, filterQ: 2 }, desc: 'Big festival supersaw lead' },
            { id: 'fm_bell', name: 'FM Bell', icon: '\uD83D\uDD14', engine: 'fm', params: { fmRatio: 3, fmDepth: 2, attack: 0.005, decay: 0.8, sustain: 0.1, release: 1, filterCutoff: 12000 }, desc: 'Metallic FM bell tone' },
            { id: 'fm_bass', name: 'FM Bass', icon: '\uD83D\uDD0A', engine: 'fm', params: { fmRatio: 1, fmDepth: 3, attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.2, filterCutoff: 2000 }, desc: 'Punchy FM bass' },
            { id: 'sub_bass', name: 'Sub Bass', icon: '\uD83C\uDF0A', engine: 'sub', params: { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.1, filterCutoff: 800, filterQ: 4 }, desc: 'Deep 808-style sub bass' },
            { id: 'warm_pad', name: 'Warm Pad', icon: '\u2601\uFE0F', engine: 'pad', params: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 1.5, filterCutoff: 3000, reverbMix: 0.4, chorusMix: 0.3 }, desc: 'Lush ambient pad' },
            { id: 'pluck', name: 'Pluck', icon: '\uD83C\uDFB8', engine: 'plucked', params: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.5, filterCutoff: 6000 }, desc: 'Karplus-Strong plucked string' },
            { id: 'acid', name: 'Acid', icon: '\uD83E\uDDEA', engine: 'standard', params: { waveType: 'sawtooth', attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.1, filterCutoff: 2000, filterQ: 12, filterType: 'lowpass', distAmount: 20 }, desc: 'TB-303 acid squelch' },
            { id: 'trance_lead', name: 'Trance', icon: '\uD83C\uDF1F', engine: 'supersaw', params: { superVoices: 5, superDetune: 12, attack: 0.02, decay: 0.3, sustain: 0.8, release: 0.4, filterCutoff: 6000, delayMix: 0.3, delayTime: 375, delayFeedback: 0.4 }, desc: 'Classic trance supersaw' },
            { id: 'dubstep', name: 'Dubstep', icon: '\uD83D\uDD25', engine: 'fm', params: { fmRatio: 0.5, fmDepth: 5, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.1, filterCutoff: 1500, filterQ: 8, distAmount: 30 }, desc: 'Growling dubstep bass' },
            { id: 'lofi', name: 'Lo-Fi', icon: '\uD83C\uDF19', engine: 'standard', params: { waveType: 'triangle', attack: 0.05, decay: 0.4, sustain: 0.5, release: 0.8, filterCutoff: 3000, reverbMix: 0.5, chorusMix: 0.2, vibratoDepth: 0.3, vibratoRate: 4 }, desc: 'Warm lo-fi keys' },
          ];

          function applyPreset(preset) {
            Object.keys(preset.params).forEach(function(key) { upd(key, preset.params[key]); });
            upd('synthEngine', preset.engine); upd('activePreset', preset.name);
            // Apply filter settings to effects chain
            var fx = window._alloSynthEffects;
            if (fx && preset.params.filterCutoff) { fx.filter.frequency.value = preset.params.filterCutoff; fx.filter.Q.value = preset.params.filterQ || 1; }
            if (fx && preset.params.filterType) fx.filter.type = preset.params.filterType;
            if (fx && preset.params.reverbMix !== undefined) fx.reverbWet.gain.value = preset.params.reverbMix;
            if (fx && preset.params.chorusMix !== undefined) { fx.chorusWet.gain.value = preset.params.chorusMix; fx.chorusDepth.gain.value = preset.params.chorusMix > 0 ? 0.003 : 0; }
            if (fx && preset.params.delayMix !== undefined) fx.delayWet.gain.value = preset.params.delayMix;
            if (fx && preset.params.delayTime !== undefined) fx.delay.delayTime.value = preset.params.delayTime / 1000;
            if (fx && preset.params.delayFeedback !== undefined) fx.delayFeedback.gain.value = preset.params.delayFeedback;
            if (fx && preset.params.distAmount !== undefined) fx.distortion.curve = makeDistCurve(preset.params.distAmount);
            addToast('\uD83C\uDFB5 Preset: ' + preset.name, 'success');
          }

          // ═══ PLAY / STOP NOTE (enhanced with engine routing) ═══
          function playNote(freq, noteId, vibratoOverride) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var engine = d.synthEngine || 'standard';
            // Route to appropriate engine
            if (engine === 'fm') { playFM(freq, noteId, d.fmRatio || 2, d.fmDepth || 1.5); return; }
            if (engine === 'supersaw') { playSuperSaw(freq, noteId); return; }
            if (engine === 'sub') { playSubBass(freq, noteId); return; }
            if (engine === 'pad') { playPad(freq, noteId); return; }
            if (engine === 'plucked') { playPlucked(freq, noteId, d.ksBrightness, d.ksDamping); return; }
            // Standard oscillator engine
            var osc = audio.ctx.createOscillator(); var env = audio.ctx.createGain();
            osc.type = d.waveType || 'sine'; osc.frequency.value = freq;
            // Vibrato (pitch LFO)
            var vibDepth = vibratoOverride !== undefined ? vibratoOverride : (d.vibratoDepth || 0);
            var _vibLFO = null;
            if (vibDepth > 0) {
              _vibLFO = audio.ctx.createOscillator(); _vibLFO.type = 'sine';
              _vibLFO.frequency.value = d.vibratoRate || 5;
              var vibGain = audio.ctx.createGain(); vibGain.gain.value = vibDepth * freq * 0.02;
              _vibLFO.connect(vibGain); vibGain.connect(osc.frequency); _vibLFO.start();
            }
            var now = audio.ctx.currentTime;
            var atk = d.attack || 0.02; var dec = d.decay || 0.1; var sus = d.sustain || 0.7;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + dec);
            osc.connect(env); env.connect(audio.effects.filter); osc.start(now);
            var _extras = _vibLFO ? [_vibLFO] : [];
            window._alloSynthActiveNotes[noteId] = { osc: osc, env: env, extras: _extras };
            // Spawn particles
            var noteIdx = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, ''));
            if (noteIdx >= 0) spawnParticles(noteId, NOTE_COLORS[noteIdx]);
          }
          function stopNote(noteId) {
            var entry = window._alloSynthActiveNotes[noteId];
            if (!entry) return;
            var audio = getCtx(); var now = audio.ctx.currentTime; var rel = d.release || 0.3;
            entry.env.gain.cancelScheduledValues(now); entry.env.gain.setValueAtTime(entry.env.gain.value, now);
            entry.env.gain.linearRampToValueAtTime(0, now + rel);
            try { entry.osc.stop(now + rel + 0.05); } catch(e) {}
            // Stop extra oscillators (SuperSaw voices, FM modulator, Pad layers, Sub body)
            if (entry.extras) {
              entry.extras.forEach(function(extra) { try { extra.stop(now + rel + 0.05); } catch(e) {} });
            }
            delete window._alloSynthActiveNotes[noteId];
          }
          // ═══ XY PAD HANDLER ═══
          var XY_SCALE_INTERVALS = {
            chromatic: [0,1,2,3,4,5,6,7,8,9,10,11],
            major: [0,2,4,5,7,9,11],
            minor: [0,2,3,5,7,8,10],
            pentatonic: [0,2,4,7,9],
            blues: [0,3,5,6,7,10]
          };
          function handleXY(e) {
            var rect = e.currentTarget.getBoundingClientRect();
            var xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            var yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            processXY(xPct, yPct);
          }
          function handleXYTouch(e) {
            var rect = e.currentTarget.getBoundingClientRect();
            var touch = e.touches[0];
            var xPct = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
            var yPct = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
            processXY(xPct, yPct);
          }
          function processXY(xPct, yPct) {
            upd('xyX', xPct); upd('xyY', yPct);
            // Trail (last 8 points)
            var trail = (d.xyTrail || []).slice(-7).concat([{ x: xPct, y: yPct }]);
            upd('xyTrail', trail);
            // Map X to pitch (2 octaves range)
            var scaleIntervals = XY_SCALE_INTERVALS[d.xyScale || 'chromatic'] || XY_SCALE_INTERVALS.chromatic;
            var noteRange = scaleIntervals.length * 2; // 2 octaves
            var noteIndex = Math.floor(xPct / 100 * noteRange);
            var octaveOffset = Math.floor(noteIndex / scaleIntervals.length);
            var scaleIdx = noteIndex % scaleIntervals.length;
            var semitone = scaleIntervals[scaleIdx];
            var baseOct = (d.octave || 4);
            var freq = 440 * Math.pow(2, ((baseOct + octaveOffset - 4) * 12 + semitone - 9) / 12);
            var noteName = NOTE_NAMES[semitone % 12] + (baseOct + octaveOffset);
            upd('xyNoteName', NOTE_NAMES[semitone % 12]);
            // Map Y to effect parameter
            var yVal = 1 - yPct / 100; // invert so top = high
            var mode = d.xyMode || 'filter';
            var fx = window._alloSynthEffects;
            if (fx) {
              if (mode === 'filter') { fx.filter.frequency.value = 200 + yVal * 12000; }
              else if (mode === 'volume') { window._alloSynthGain.gain.value = yVal * (d.volume || 0.5); }
              else if (mode === 'vibrato') { /* handled in playNote */ }
              else if (mode === 'reverb') { fx.reverbWet.gain.value = yVal * 0.8; }
            }
            // Play/update note
            stopNote('xy_note');
            if (mode === 'vibrato') {
              playNote(freq, 'xy_note', yVal * 2);
            } else {
              playNote(freq, 'xy_note');
            }
          }

          function playNoteFor(freq, noteId, durationMs) {
            playNote(freq, noteId);
            setTimeout(function () { stopNote(noteId); }, durationMs);
          }

          // ═══ KARPLUS-STRONG PLUCKED STRING ═══
          function playPlucked(freq, noteId, brightness, damping) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var ctx = audio.ctx; var now = ctx.currentTime;
            var sampleRate = ctx.sampleRate;
            var delayTime = 1 / freq;
            var br = brightness !== undefined ? brightness : 0.8;
            var dmp = damping !== undefined ? damping : 0.996;
            // Longer noise burst (40ms) for fuller attack
            var noiseLen = Math.round(sampleRate * 0.04);
            var noiseBuf = ctx.createBuffer(1, noiseLen, sampleRate);
            var noiseData = noiseBuf.getChannelData(0);
            // Shaped noise: mix filtered noise for warmer character
            for (var i = 0; i < noiseLen; i++) {
              var t = i / noiseLen;
              noiseData[i] = (Math.random() * 2 - 1) * (1 - t * 0.5); // fade noise tail
            }
            var noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noiseBuf;
            // Delay line for KS
            var delay = ctx.createDelay(1); delay.delayTime.value = delayTime;
            var feedback = ctx.createGain(); feedback.gain.value = dmp;
            // Primary LPF — warmer ceiling: max 4.8kHz instead of 10kHz
            var lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';
            lpf.frequency.value = br * 4000 + 800;
            lpf.Q.value = 0.5; // gentle resonance
            // Secondary warmth filter in feedback — removes harsh highs each cycle
            var warmth = ctx.createBiquadFilter(); warmth.type = 'lowpass';
            warmth.frequency.value = Math.min(freq * 4, 6000);
            warmth.Q.value = 0.3;
            // Output envelope — gentler 4s decay
            var env = ctx.createGain(); env.gain.setValueAtTime(0.6, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 4);
            // Body tone — sine at fundamental for pitch clarity (10% volume)
            var body = ctx.createOscillator(); body.type = 'sine'; body.frequency.value = freq;
            var bodyGain = ctx.createGain(); bodyGain.gain.setValueAtTime(0.10, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            body.connect(bodyGain); bodyGain.connect(env);
            body.start(now); body.stop(now + 2.5);
            // Second harmonic for warmth/richness (4% volume)
            var harm2 = ctx.createOscillator(); harm2.type = 'sine'; harm2.frequency.value = freq * 2;
            var harm2Gain = ctx.createGain(); harm2Gain.gain.setValueAtTime(0.04, now);
            harm2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            harm2.connect(harm2Gain); harm2Gain.connect(env);
            harm2.start(now); harm2.stop(now + 1.5);
            // Signal path: Noise -> delay -> LPF -> warmth -> feedback -> delay
            noiseSrc.connect(delay); delay.connect(lpf); lpf.connect(warmth);
            warmth.connect(feedback); feedback.connect(delay);
            warmth.connect(env); env.connect(audio.effects.filter);
            noiseSrc.start(now); noiseSrc.stop(now + 0.04);
            window._alloSynthActiveNotes[noteId] = { osc: noiseSrc, env: env };
            var nIdx = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, ''));
            if (nIdx >= 0) spawnParticles(noteId, NOTE_COLORS[nIdx]);
            setTimeout(function () { delete window._alloSynthActiveNotes[noteId]; }, 4500);
          }
          function playPluckedFor(freq, noteId, durationMs, brightness, damping) {
            playPlucked(freq, noteId, brightness, damping);
          }

          // ═══ STRUM FUNCTION ═══
          function strumChord(rootNote, chordType, inv, speed, direction) {
            var chordData = CHORDS[chordType];
            if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            for (var ii = 0; ii < (inv || 0); ii++) {
              if (intervals.length > 1) intervals.push(intervals.shift() + 12);
            }
            // Add octave doubling for richer strum
            var fullIntervals = intervals.slice();
            if (d.strumOctaveDouble) {
              intervals.forEach(function (intv) { fullIntervals.push(intv + 12); });
            }
            if (direction === 'down') fullIntervals.reverse();
            var strumDelay = speed || 40; // ms between strings
            var useKS = d.synthEngine === 'plucked';
            fullIntervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
                var noteId = 'strum_' + idx;
                if (useKS) {
                  playPlucked(freq, noteId, d.ksBrightness || 0.8, d.ksDamping || 0.996);
                } else {
                  playNoteFor(freq, noteId, 1500);
                }
              }, idx * strumDelay);
            });
          }

          // ═══ HARMONYPAD PURE SOUND ═══
          function playHarmonyTone(freq, noteId, durationMs, preset) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var ctx = audio.ctx; var now = ctx.currentTime;
            var p = preset || 'harp';
            var osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = freq;
            var osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq;
            var gain1 = ctx.createGain(); var gain2 = ctx.createGain();
            var master = ctx.createGain();
            if (p === 'harp') { gain1.gain.value = 0.5; gain2.gain.value = 0.3; }
            else if (p === 'organ') { gain1.gain.value = 0.3; gain2.gain.value = 0.5; }
            else { gain1.gain.value = 0.4; gain2.gain.value = 0.4; }
            var attack = p === 'pad' ? 0.25 : 0.015;
            var release = p === 'pad' ? 1.2 : p === 'harp' ? 0.6 : 0.35;
            var vol = 0.3;
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(vol, now + attack);
            osc1.connect(gain1); osc2.connect(gain2);
            gain1.connect(master); gain2.connect(master);
            if (p !== 'harp') {
              var osc3 = ctx.createOscillator(); osc3.type = 'sine';
              osc3.frequency.value = freq * 1.003;
              var gain3 = ctx.createGain(); gain3.gain.value = 0.12;
              osc3.connect(gain3); gain3.connect(master); osc3.start(now);
              window._alloSynthActiveNotes[noteId + '_ch'] = { o: osc3 };
            }
            master.connect(audio.gain);
            osc1.start(now); osc2.start(now);
            // Auto-release after duration
            var dur = durationMs || 1200;
            var endT = now + dur / 1000;
            master.gain.setValueAtTime(vol, endT);
            master.gain.linearRampToValueAtTime(0, endT + release);
            setTimeout(function () {
              try { osc1.stop(); osc2.stop(); } catch (e) { }
              if (window._alloSynthActiveNotes[noteId + '_ch']) {
                try { window._alloSynthActiveNotes[noteId + '_ch'].o.stop(); } catch (e) { }
                delete window._alloSynthActiveNotes[noteId + '_ch'];
              }
              delete window._alloSynthActiveNotes[noteId];
            }, dur + release * 1000 + 100);
            window._alloSynthActiveNotes[noteId] = { oscs: [osc1, osc2], master: master };
          }
          function strumHarmony(rootNote, chordType, preset) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            var oct = d.octave || 4;
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = oct + Math.floor((ri + intv) / 12);
                playHarmonyTone(noteFreq(NOTE_NAMES[nIdx], nOct), 'omni_' + idx, 1400, preset);
              }, idx * 35);
            });
          }

          // ═══ DRUM SYNTHESIS ═══
          // ═══ UNIFIED DRUM SYNTHESIZER ═══
          // Handles ALL drum types with Web Audio synthesis
          function playDrum(type) {
            var audio = getCtx(); var ctxA = audio.ctx; var now = ctxA.currentTime;
            var drumGain = ctxA.createGain(); drumGain.connect(audio.effects ? audio.effects.filter : audio.gain);
            if (type === 'kick') {
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(1, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.8; osc.start(now); osc.stop(now + 0.4);
            } else if (type === 'snare') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.15, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var nFilter = ctxA.createBiquadFilter(); nFilter.type = 'highpass'; nFilter.frequency.value = 1000;
              var nGain = ctxA.createGain(); nGain.gain.setValueAtTime(0.7, now); nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
              noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(drumGain);
              var body = ctxA.createOscillator(); body.type = 'triangle'; body.frequency.value = 180;
              var bGain = ctxA.createGain(); bGain.gain.setValueAtTime(0.5, now); bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
              body.connect(bGain); bGain.connect(drumGain); drumGain.gain.value = 0.7; noise.start(now); noise.stop(now + 0.15); body.start(now); body.stop(now + 0.08);
            } else if (type === 'hihat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.05, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hpf = ctxA.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
              noise.connect(hpf); hpf.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; noise.start(now); noise.stop(now + 0.05);
            } else if (type === 'clap') {
              for (var ci = 0; ci < 3; ci++) {
                (function(delay) {
                  var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.04, ctxA.sampleRate);
                  var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
                  noise.buffer = nBuf;
                  var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 1.5;
                  var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now + delay); eg.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);
                  noise.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.7;
                  noise.start(now + delay); noise.stop(now + delay + 0.08);
                })(ci * 0.012);
              }
            } else if (type === 'tom' || type === 'tom1' || type === 'tom2') {
              var baseF = type === 'tom2' ? 120 : type === 'tom1' ? 200 : 200;
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(baseF * 0.5, now + 0.2);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.7, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.6; osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'rim') {
              var osc = ctxA.createOscillator(); osc.type = 'square';
              osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; osc.start(now); osc.stop(now + 0.05);
            } else if (type === 'openhat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.3, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; noise.start(now); noise.stop(now + 0.3);
            } else if (type === 'cymbal') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.5, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4; noise.start(now); noise.stop(now + 0.5);
            } else if (type === 'cowbell') {
              var osc1 = ctxA.createOscillator(); osc1.type = 'square'; osc1.frequency.value = 560;
              var osc2 = ctxA.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 845;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
              osc1.connect(bp); osc2.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4;
              osc1.start(now); osc2.start(now); osc1.stop(now + 0.3); osc2.stop(now + 0.3);
            } else if (type === 'clave') {
              var osc = ctxA.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 2500;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; osc.start(now); osc.stop(now + 0.04);
            } else if (type === 'shaker') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.08, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4; noise.start(now); noise.stop(now + 0.08);
            }
          }
          // Kit-flavored drum synthesis: applies per-kit tonal adjustments to synth drums
          function playDrumStyled(type, style, vol) {
            var audio = getCtx(); var ctxA = audio.ctx; var now = ctxA.currentTime;
            var dm = (style && style.decayMul) || 1.0;
            var ps = (style && style.pitchShift) || 0;
            var ff = (style && style.filterFreq) || 6000;
            var gm = (style && style.gainMul) || 0.8;
            var v = (vol || 0.8) * gm;
            var drumGain = ctxA.createGain(); drumGain.connect(audio.effects ? audio.effects.filter : audio.gain);
            // Apply kit-wide filter coloring for synth sounds
            var kitFilter = ctxA.createBiquadFilter();
            kitFilter.type = 'lowpass'; kitFilter.frequency.value = ff; kitFilter.Q.value = 0.7;
            drumGain.connect(kitFilter); kitFilter.connect(audio.effects ? audio.effects.filter : audio.gain);
            // Re-route drumGain through the filter
            drumGain.disconnect(); drumGain.connect(kitFilter);
            if (type === 'kick') {
              var baseF = 150 * (1 + ps);
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.12 * dm);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(1, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.4 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v; osc.start(now); osc.stop(now + 0.4 * dm);
            } else if (type === 'snare') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.15 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var nFilter = ctxA.createBiquadFilter(); nFilter.type = 'highpass'; nFilter.frequency.value = 1000 * (1 + ps * 2);
              var nGain = ctxA.createGain(); nGain.gain.setValueAtTime(0.7, now); nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 * dm);
              noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(drumGain);
              var body = ctxA.createOscillator(); body.type = 'triangle'; body.frequency.value = 180 * (1 + ps);
              var bGain = ctxA.createGain(); bGain.gain.setValueAtTime(0.5, now); bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08 * dm);
              body.connect(bGain); bGain.connect(drumGain); drumGain.gain.value = v * 0.875; noise.start(now); noise.stop(now + 0.15 * dm); body.start(now); body.stop(now + 0.08 * dm);
            } else if (type === 'hihat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.05 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hpf = ctxA.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000 + ps * 3000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05 * dm);
              noise.connect(hpf); hpf.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; noise.start(now); noise.stop(now + 0.05 * dm);
            } else if (type === 'clap') {
              for (var ci = 0; ci < 3; ci++) {
                (function(delay) {
                  var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.04 * dm, ctxA.sampleRate);
                  var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
                  noise.buffer = nBuf;
                  var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000 * (1 + ps); bp.Q.value = 1.5;
                  var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now + delay); eg.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08 * dm);
                  noise.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.875;
                  noise.start(now + delay); noise.stop(now + delay + 0.08 * dm);
                })(ci * 0.012);
              }
            } else if (type === 'tom' || type === 'tom1' || type === 'tom2' || type === 'tom3') {
              var baseF = (type === 'tom2' ? 120 : type === 'tom3' ? 90 : type === 'tom1' ? 200 : 200) * (1 + ps);
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(baseF * 0.5, now + 0.2 * dm);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.7, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.25 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.75; osc.start(now); osc.stop(now + 0.25 * dm);
            } else if (type === 'rim') {
              var osc = ctxA.createOscillator(); osc.type = 'square';
              osc.frequency.setValueAtTime(800 * (1 + ps * 2), now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.03 * dm);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; osc.start(now); osc.stop(now + 0.05 * dm);
            } else if (type === 'openhat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.3 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000 + ps * 2000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3 * dm);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; noise.start(now); noise.stop(now + 0.3 * dm);
            } else if (type === 'cymbal') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.5 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000 + ps * 2000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.5 * dm);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.5; noise.start(now); noise.stop(now + 0.5 * dm);
            } else if (type === 'cowbell') {
              var osc1 = ctxA.createOscillator(); osc1.type = 'square'; osc1.frequency.value = 560 * (1 + ps);
              var osc2 = ctxA.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 845 * (1 + ps);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3 * dm);
              var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 * (1 + ps); bp.Q.value = 3;
              osc1.connect(bp); osc2.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.5;
              osc1.start(now); osc2.start(now); osc1.stop(now + 0.3 * dm); osc2.stop(now + 0.3 * dm);
            } else if (type === 'clave') {
              var osc = ctxA.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 2500 * (1 + ps);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.04 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; osc.start(now); osc.stop(now + 0.04 * dm);
            } else if (type === 'shaker') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.08 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000 + ps * 3000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.08 * dm);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.5; noise.start(now); noise.stop(now + 0.08 * dm);
            } else {
              // Unknown type — fall back to basic playDrum
              playDrum(type);
            }
          }
          function playClick(accent) {
            var audio = getCtx(); var ctx = audio.ctx; var now = ctx.currentTime;
            var osc = ctx.createOscillator(); osc.type = 'sine';
            osc.frequency.value = accent ? 1000 : 800;
            var eg = ctx.createGain(); eg.gain.setValueAtTime(accent ? 0.5 : 0.3, now);
            eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.connect(eg); eg.connect(audio.gain); osc.start(now); osc.stop(now + 0.05);
          }

          // ═══ SCALE & CHORD DATA ═══
          var SCALES = {
            'Major': { intervals: [0, 2, 4, 5, 7, 9, 11], desc: t('stem.synth.happy_bright_the_most_common'), science: 'Built on the pattern W-W-H-W-W-W-H (Whole/Half steps). The Ionian mode. Its brightness comes from the major 3rd (4 semitones) and perfect 5th (7 semitones).' },
            'Natural Minor': { intervals: [0, 2, 3, 5, 7, 8, 10], desc: t('stem.synth.sad_dark_introspective'), science: 'Pattern: W-H-W-W-H-W-W. The Aeolian mode. The minor 3rd (3 semitones) creates a darker, more somber quality than major.' },
            'Harmonic Minor': { intervals: [0, 2, 3, 5, 7, 8, 11], desc: t('stem.synth.exotic_dramatic_classical'), science: 'Like natural minor but raises the 7th degree. Creates an augmented 2nd interval (3 semitones) between the 6th and 7th, giving it a Middle Eastern flavor.' },
            'Melodic Minor': { intervals: [0, 2, 3, 5, 7, 9, 11], desc: t('stem.synth.smooth_jazzy_sophisticated'), science: 'Raises both the 6th and 7th degrees of natural minor. Used ascending in classical; jazz uses it both ways. Foundation of many jazz modes.' },
            'Pentatonic Major': { intervals: [0, 2, 4, 7, 9], desc: t('stem.synth.universal_folk_rock'), science: 'A 5-note subset of the major scale, removing the 4th and 7th. Found in music worldwide because it avoids semitones, making any combination sound consonant.' },
            'Pentatonic Minor': { intervals: [0, 3, 5, 7, 10], desc: t('stem.synth.blues_rock_universal'), science: 'The most common scale for improvisation. 5 notes, no semitones. Guitar solos, Asian music, African music all use this scale extensively.' },
            'Blues': { intervals: [0, 3, 5, 6, 7, 10], desc: t('stem.synth.soulful_gritty_expressive'), science: 'Adds the "blue note" (\u266D5/\u266F4) to the minor pentatonic. This tritone creates tension and the characteristic blues sound. Bending notes is central to blues expression.' },
            'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], desc: t('stem.synth.jazz_funk_sophisticated_minor'), science: 'A minor mode with a raised 6th degree. Used heavily in jazz and funk (e.g., "So What" by Miles Davis). Has a "bright minor" quality.' },
            'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], desc: t('stem.synth.rock_folk_dominant_feel'), science: 'A major scale with a lowered 7th. The "dominant" sound. Used in rock (Grateful Dead), folk, and creates the V7 chord quality.' },
            'Phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10], desc: t('stem.synth.spanish_flamenco_metal'), science: 'A minor mode with \u266D2. The half-step from root creates dramatic, dark tension. Central to flamenco guitar and heavy metal.' },
            'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], desc: t('stem.synth.dreamy_ethereal_film_scores'), science: 'A major scale with \u266F4. The raised 4th creates a "floating" quality. Used extensively in film scores (John Williams) and progressive rock.' },
            'Whole Tone': { intervals: [0, 2, 4, 6, 8, 10], desc: t('stem.synth.mysterious_ambiguous_dreamlike'), science: 'All whole steps, no half steps. No tonal center. Only 2 unique whole-tone scales exist. Used by Debussy and in mystery/dream sequences.' },
            'Chromatic': { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], desc: t('stem.synth.all_12_notes_complete_but'), science: 'Every semitone in the octave. No tonal hierarchy. The basis of 12-tone serialism (Schoenberg). Each note is equally spaced at 2^(1/12) \u2248 1.0595 frequency ratio.' },
          };

          var CHORDS = {
            'Major': { intervals: [0, 4, 7], symbol: '', desc: t('stem.synth.happy_stable_resolved'), science: 'Root + Major 3rd (4 semitones) + Perfect 5th (7 semitones). Frequency ratio approximately 4:5:6. The most consonant triad.' },
            'Minor': { intervals: [0, 3, 7], symbol: 'm', desc: t('stem.synth.sad_introspective_dark'), science: 'Root + Minor 3rd (3 semitones) + Perfect 5th. The lowered 3rd creates a more somber quality. Ratio approximately 10:12:15.' },
            'Diminished': { intervals: [0, 3, 6], symbol: 'dim', desc: t('stem.synth.tense_unstable_needs_to_resolve'), science: 'Two minor 3rds stacked. The tritone (6 semitones) between root and 5th is the most dissonant interval, creating maximum tension.' },
            'Augmented': { intervals: [0, 4, 8], symbol: 'aug', desc: t('stem.synth.mysterious_unresolved_eerie'), science: 'Two major 3rds stacked. Divides the octave into 3 equal parts. Symmetrical \u2014 only 4 unique augmented triads exist.' },
            'Maj7': { intervals: [0, 4, 7, 11], symbol: 'maj7', desc: t('stem.synth.smooth_lush_jazzy'), science: 'Major triad + major 7th (11 semitones). The major 7th interval is nearly an octave, creating a sweet, complex resonance.' },
            'Min7': { intervals: [0, 3, 7, 10], symbol: 'm7', desc: t('stem.synth.cool_mellow_relaxed'), science: 'Minor triad + minor 7th (10 semitones). Very common in jazz. Less tense than dominant 7th, more complex than minor triad.' },
            'Dom7': { intervals: [0, 4, 7, 10], symbol: '7', desc: t('stem.synth.bluesy_restless_wants_to_resolve'), science: 'Major triad + minor 7th. The tritone between 3rd and \u266D7th creates tension that "pulls" toward resolution to a chord a 5th below (V7\u2192I).' },
            'Sus2': { intervals: [0, 2, 7], symbol: 'sus2', desc: t('stem.synth.open_modern_shimmering'), science: 'Replaces the 3rd with the 2nd. Neither major nor minor \u2014 ambiguous quality. Common in pop and ambient music.' },
            'Sus4': { intervals: [0, 5, 7], symbol: 'sus4', desc: t('stem.synth.suspended_yearning_to_resolve'), science: 'Replaces the 3rd with the 4th. The 4th wants to "suspend" down to the 3rd. Used since medieval music to create tension-release.' },
            [t('stem.circuit.power')]: { intervals: [0, 7, 12], symbol: '5', desc: t('stem.synth.raw_strong_genredefining'), science: 'Just root + 5th (+ octave). No 3rd means no major/minor quality. Sounds huge with distortion because the simple 3:2 ratio stays clean when clipped.' },
            // Extended voicings (MiniChord-inspired)
            '6': { intervals: [0, 4, 7, 9], symbol: '6', desc: t('stem.synth.warm_jazzy_classic'), science: 'Major triad + major 6th. Central to Barry Harris harmony. A sweet, sophisticated alternative to maj7.' },
            'min6': { intervals: [0, 3, 7, 9], symbol: 'm6', desc: t('stem.synth.sophisticated_minor'), science: 'Minor triad + major 6th. Key chord in Barry Harris minor system. Creates smooth voice leading with dim7 passing chords.' },
            'add9': { intervals: [0, 2, 4, 7], symbol: 'add9', desc: t('stem.synth.bright_open_modern_pop'), science: 'Major triad + 9th (2nd up an octave). No 7th. Clean, shimmering sound popular in contemporary pop and worship music.' },
            '9': { intervals: [0, 4, 7, 10, 14], symbol: '9', desc: t('stem.synth.rich_funky_bluesy'), science: 'Dominant 7th + 9th. Full, complex sound. Essential in funk, R&B, and blues. Hendrix made the 7\u266F9 famous.' },
            'Maj9': { intervals: [0, 4, 7, 11, 14], symbol: 'maj9', desc: t('stem.synth.dreamy_lush'), science: 'Major 7th + 9th. Maximum smoothness and warmth. Neo-soul and jazz ballads. The quintessential "beautiful" chord.' },
            'Min9': { intervals: [0, 3, 7, 10, 14], symbol: 'm9', desc: t('stem.synth.cool_sophisticated'), science: 'Minor 7th + 9th. The quintessential modern jazz minor chord. Creates a contemplative, introspective mood.' },
            '13': { intervals: [0, 4, 7, 10, 14, 21], symbol: '13', desc: t('stem.synth.full_orchestral_complex'), science: 'Dominant with 9th + 13th. Six notes! Used in jazz endings, gospel turnarounds, and orchestral voicings.' },
            'dim7': { intervals: [0, 3, 6, 9], symbol: 'dim7', desc: t('stem.synth.symmetrical_passing'), science: 'All minor 3rds stacked. Only 3 unique dim7 chords exist (due to symmetry). Used as passing chords in Barry Harris harmony for smooth voice leading.' },
          };

          // Barry Harris harmony transformations
          var BARRY_HARRIS = {
            desc: 'Barry Harris (1929-2021) codified bebop harmony. His system uses 6th chords instead of 7ths and adds diminished passing chords between scale degrees for smooth voice leading.',
            majorScale: function (rootIdx) {
              // Barry Harris major scale: 1-2-3-4-5-6-\u266D7dim-7
              // Each degree alternates between 6th chord and dim7 passing chord
              return [
                { degree: 0, type: '6', label: 'I6' },
                { degree: 2, type: 'dim7', label: '\u266F\u2170dim7' },
                { degree: 2, type: '6', label: 'II6' },
                { degree: 4, type: 'dim7', label: '\u266F\u2171dim7' },
                { degree: 5, type: '6', label: 'IV6' },
                { degree: 7, type: 'dim7', label: '\u266F\u2163dim7' },
                { degree: 7, type: '6', label: 'V6' },
                { degree: 9, type: 'dim7', label: '\u266F\u2164dim7' },
              ];
            },
            minorScale: function (rootIdx) {
              return [
                { degree: 0, type: 'min6', label: 'i-6' },
                { degree: 2, type: 'dim7', label: '\u266F\u2170dim7' },
                { degree: 3, type: 'min6', label: '\u266DIII-6' },
                { degree: 5, type: 'dim7', label: '\u266F\u2172dim7' },
                { degree: 5, type: 'min6', label: 'iv-6' },
                { degree: 7, type: 'dim7', label: '\u266F\u2163dim7' },
                { degree: 7, type: 'min6', label: 'v-6' },
                { degree: 9, type: 'dim7', label: '\u266F\u2164dim7' },
              ];
            }
          };

          // ═══ WAVEFORM INFO ═══
          var WAVE_INFO = {
            sine: { emoji: '\u223F', desc: t('stem.synth.pure_tone_fundamental_only'), harmonics: t('stem.synth.fundamental'), science: 'A sine wave is the simplest sound \u2014 a single frequency with no overtones. All other waveforms are combinations of sine waves (Fourier theorem).' },
            square: { emoji: '\u25A0', desc: t('stem.synth.hollow_reedlike'), harmonics: 'Odd only (1,3,5,7...)', science: 'Contains only odd harmonics. Sounds like a clarinet or old-school video games. Each harmonic\u2019s amplitude = 1/n.' },
            sawtooth: { emoji: '\u25E2', desc: t('stem.synth.bright_buzzy_rich'), harmonics: 'All harmonics', science: 'Contains ALL harmonics (both odd and even), each at 1/n amplitude. Sounds like a violin or brass. The richest waveform for subtractive synthesis.' },
            triangle: { emoji: '\u25B3', desc: t('stem.synth.soft_flutelike'), harmonics: 'Odd only, fading fast', science: 'Like square but softer \u2014 odd harmonics at 1/n\u00B2. Sounds between sine and square, similar to a flute or ocarina.' }
          };
          var wInfo = WAVE_INFO[d.waveType || 'sine'];

          // ═══ INTERVALS ═══
          var INTERVALS = [
            { name: t('stem.synth.unison'), semitones: 0, ratio: '1:1', song: 'Same note', quality: 'perfect' },
            { name: t('stem.synth.minor_2nd'), semitones: 1, ratio: '16:15', song: 'Jaws theme', quality: 'dissonant' },
            { name: t('stem.synth.major_2nd'), semitones: 2, ratio: '9:8', song: 'Happy Birthday (1st two notes)', quality: 'dissonant' },
            { name: t('stem.synth.minor_3rd'), semitones: 3, ratio: '6:5', song: 'Greensleeves', quality: 'consonant' },
            { name: t('stem.synth.major_3rd'), semitones: 4, ratio: '5:4', song: 'Oh When the Saints', quality: 'consonant' },
            { name: t('stem.synth.perfect_4th'), semitones: 5, ratio: '4:3', song: 'Here Comes the Bride', quality: 'perfect' },
            { name: t('stem.synth.tritone'), semitones: 6, ratio: '\u221A2:1', song: 'The Simpsons theme', quality: 'dissonant' },
            { name: t('stem.synth.perfect_5th'), semitones: 7, ratio: '3:2', song: 'Star Wars opening', quality: 'perfect' },
            { name: t('stem.synth.minor_6th'), semitones: 8, ratio: '8:5', song: 'Love Story theme', quality: 'consonant' },
            { name: t('stem.synth.major_6th'), semitones: 9, ratio: '5:3', song: 'My Bonnie Lies Over the Ocean', quality: 'consonant' },
            { name: t('stem.synth.minor_7th'), semitones: 10, ratio: '16:9', song: 'Star Trek theme', quality: 'dissonant' },
            { name: t('stem.synth.major_7th'), semitones: 11, ratio: '15:8', song: 'Take On Me (chorus)', quality: 'dissonant' },
            { name: t('stem.synth.octave'), semitones: 12, ratio: '2:1', song: 'Somewhere Over the Rainbow', quality: 'perfect' },
          ];

          // ═══ PRESETS (incl Plucked for K-S) ═══
          var PRESETS = {
            'Piano': { waveType: 'triangle', attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.4, volume: 0.6, filterCutoff: 8000, filterQ: 1, synthEngine: 'standard' },
            'Organ': { waveType: 'sine', attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.1, volume: 0.5, chorusMix: 0.3, vibratoDepth: 0.2, vibratoRate: 6, synthEngine: 'standard' },
            'Strings': { waveType: 'sawtooth', attack: 0.3, decay: 0.1, sustain: 0.8, release: 0.6, volume: 0.4, filterCutoff: 3000, filterQ: 2, tremoloDepth: 0.15, tremoloRate: 5, synthEngine: 'standard' },
            'Bass': { waveType: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, volume: 0.7, filterCutoff: 800, filterQ: 5, synthEngine: 'standard' },
            [t('stem.periodic.lead')]: { waveType: 'square', attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15, volume: 0.5, distAmount: 15, vibratoDepth: 0.3, vibratoRate: 5.5, synthEngine: 'standard' },
            'Pad': { waveType: 'sine', attack: 0.8, decay: 0.3, sustain: 0.7, release: 1.5, volume: 0.35, reverbMix: 0.6, chorusMix: 0.4, chorusRate: 0.8, synthEngine: 'standard' },
            'Plucked': { waveType: 'sawtooth', attack: 0.001, decay: 0.01, sustain: 0.01, release: 0.01, volume: 0.7, filterCutoff: 6000, filterQ: 1, synthEngine: 'plucked', ksBrightness: 0.8, ksDamping: 0.996 },
            'Guitar': { waveType: 'sawtooth', attack: 0.001, decay: 0.01, sustain: 0.01, release: 0.01, volume: 0.7, synthEngine: 'plucked', ksBrightness: 0.6, ksDamping: 0.998 },
            'Retro': { waveType: 'square', attack: 0.001, decay: 0.08, sustain: 0.3, release: 0.05, volume: 0.45, filterCutoff: 2000, filterQ: 8, synthEngine: 'standard' },
            'Spooky': { waveType: 'sine', attack: 0.5, decay: 0.3, sustain: 0.6, release: 2, volume: 0.3, reverbMix: 0.8, reverbSize: 4, vibratoDepth: 0.5, vibratoRate: 3, synthEngine: 'standard' }
          };
          function applyInstrumentPreset(name) {
            var p = PRESETS[name]; if (!p) return;
            Object.keys(p).forEach(function (k) { upd(k, p[k]); });
            upd('activePreset', name);
          }

          // ═══ PROGRESSIONS ═══
          var PROGRESSIONS = [
            { name: t('stem.synth.iivvi_classical'), degrees: [[0, 'Major'], [5, 'Major'], [7, 'Major'], [0, 'Major']], desc: t('stem.synth.the_foundation_of_western_music') },
            { name: t('stem.synth.ivviiv_pop'), degrees: [[0, 'Major'], [7, 'Major'], [9, 'Minor'], [5, 'Major']], desc: t('stem.synth.used_in_thousands_of_pop') },
            { name: 'ii-V-I (Jazz)', degrees: [[2, 'Min7'], [7, 'Dom7'], [0, 'Maj7']], desc: t('stem.synth.the_most_important_jazz_progression') },
            { name: t('stem.synth.iviivv_50s'), degrees: [[0, 'Major'], [9, 'Minor'], [5, 'Major'], [7, 'Major']], desc: t('stem.synth.classic_doowop_progression') },
            { name: '12-Bar Blues', degrees: [[0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [5, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [7, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [7, 'Dom7']], desc: t('stem.synth.foundation_of_blues_rock_and') },
            { name: 'vi-IV-I-V (Emo/Alt)', degrees: [[9, 'Minor'], [5, 'Major'], [0, 'Major'], [7, 'Major']], desc: t('stem.synth.common_in_alternative_and_emo') }
          ];

          // ═══ CIRCLE OF FIFTHS ═══
          var CIRCLE_OF_FIFTHS = [
            { key: 'C', minor: 'Am', sharps: 0, flats: 0 },
            { key: 'G', minor: 'Em', sharps: 1, flats: 0 },
            { key: 'D', minor: 'Bm', sharps: 2, flats: 0 },
            { key: 'A', minor: 'F#m', sharps: 3, flats: 0 },
            { key: 'E', minor: 'C#m', sharps: 4, flats: 0 },
            { key: 'B', minor: 'G#m', sharps: 5, flats: 0 },
            { key: 'F#/G\u266D', minor: 'D#m/E\u266Dm', sharps: 6, flats: 6 },
            { key: 'D\u266D', minor: 'B\u266Dm', sharps: 0, flats: 5 },
            { key: 'A\u266D', minor: 'Fm', sharps: 0, flats: 4 },
            { key: 'E\u266D', minor: 'Cm', sharps: 0, flats: 3 },
            { key: 'B\u266D', minor: 'Gm', sharps: 0, flats: 2 },
            { key: 'F', minor: 'Dm', sharps: 0, flats: 1 },
          ];

          // ═══ HARMONIC SERIES ═══
          var HARMONICS_INFO = [
            { n: 1, name: t('stem.synth.fundamental'), interval: t('stem.synth.unison'), ratio: '1x' },
            { n: 2, name: '1st Overtone', interval: t('stem.synth.octave'), ratio: '2x' },
            { n: 3, name: '2nd Overtone', interval: 'P5 + Oct', ratio: '3x' },
            { n: 4, name: '3rd Overtone', interval: '2 Octaves', ratio: '4x' },
            { n: 5, name: '4th Overtone', interval: 'M3 + 2 Oct', ratio: '5x' },
            { n: 6, name: '5th Overtone', interval: 'P5 + 2 Oct', ratio: '6x' },
            { n: 7, name: '6th Overtone', interval: '\u266D7 + 2 Oct', ratio: '7x' },
            { n: 8, name: '7th Overtone', interval: '3 Octaves', ratio: '8x' },
          ];
          function playHarmonic(harmNum) {
            var baseFreq = noteFreq(selectedRoot, d.octave || 4);
            playNoteFor(baseFreq * harmNum, 'harm_' + harmNum, 800);
          }

          // ═══ SEQUENCER DATA ═══
          var SEQ_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C5', 'C#5', 'D5', 'D#5', 'E5'];
          var SEQ_FREQS = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, 523.25, 554.37, 587.33, 622.25, 659.26];
          var SEQ_IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]; // for grid styling
          var DRUM_TYPES = ['kick', 'snare', 'hihat', 'clap', 'tom'];
          var DRUM_LABELS = ['\uD83E\uDD41 Kick', '\uD83E\uDD41 Snare', '\uD83E\uDD43 Hi-Hat', '\uD83D\uDC4F Clap', '\uD83E\uDD41 Tom'];
          var LOOP_LENGTHS = [8, 12, 16, 24, 32, 48, 64];
          var TIME_SIGS = { '4/4': { beats: 4, note: 4 }, '3/4': { beats: 3, note: 4 }, '6/8': { beats: 6, note: 8 }, '5/4': { beats: 5, note: 4 }, '7/8': { beats: 7, note: 8 } };

          // ═══ EFFECT TOOLTIPS ═══
          var EFFECT_TIPS = {
            adsr: { title: t('stem.synth.adsr_envelope'), text: 'Attack: time to reach full volume. Decay: time to fall to sustain. Sustain: held volume level. Release: fade-out time after key release.' },
            scales: { title: t('stem.synth.scales_modes'), text: 'A scale is an ordered set of pitches. Modes are rotations of the scale starting on different degrees. Each creates a different emotional mood.' },
            chords: { title: t('stem.synth.chord_theory'), text: 'Chords are built by stacking intervals (3rds). Major uses a major 3rd + minor 3rd. Minor reverses them. Extended chords add 7ths, 9ths, and beyond.' },
            drums: { title: t('stem.synth.drum_synthesis'), text: 'Kicks use a sine oscillator with a pitch sweep. Snares combine noise (filtered) + tone body. Hi-hats use high-pass filtered noise bursts.' },
            timeSig: { title: t('stem.synth.time_signatures'), text: '4/4 = 4 quarter-note beats per bar (most common). 3/4 = waltz feel. 6/8 = compound duple. 5/4 and 7/8 create asymmetric, exotic grooves.' },
            circleOfFifths: { title: t('stem.synth.circle_of_fifths'), text: 'Keys arranged by ascending 5ths clockwise. Adjacent keys share 6 of 7 notes. Moving clockwise adds sharps; counter-clockwise adds flats.' },
            harmonicSeries: { title: t('stem.synth.harmonic_series'), text: 'Every musical sound contains overtones above the fundamental. Their relative strengths determine timbre \u2014 why a trumpet sounds different from a flute at the same pitch.' },
            intervals: { title: t('stem.synth.musical_intervals'), text: 'An interval is the distance between two pitches, measured in semitones. The frequency ratio determines consonance (simple ratios like 3:2 sound smooth).' },
            arpeggiator: { title: t('stem.synth.arpeggiator'), text: 'Plays chord notes one at a time in sequence. Up = low to high, Down = high to low. Creates flowing patterns from static chords.' },
            filter: { title: t('stem.synth.resonant_filter'), text: 'A filter removes frequencies above (lowpass), below (highpass), or around (bandpass) a cutoff frequency. Resonance (Q) amplifies frequencies near cutoff, creating a peak.' },
            tremolo: { title: t('stem.synth.tremolo_vibrato'), text: 'Tremolo: periodic volume changes (amplitude modulation). Vibrato: periodic pitch changes (frequency modulation). Both controlled by an LFO (Low Frequency Oscillator).' },
            karplusStrong: { title: t('stem.synth.karplusstrong_synthesis'), text: 'Discovered in 1983. A noise burst feeds into a very short delay line with feedback. The delay time determines pitch. A filter in the feedback loop controls brightness and decay. Naturally simulates plucked strings.' },
            composition: { title: t('stem.synth.music_composition'), text: 'The sequencer is a composition tool. Each step represents a beat subdivision. The melody row sets pitched notes, drums add rhythm. Musical notation shows what you create.' },
            notation: { title: t('stem.synth.musical_notation'), text: 'Notes on lines and spaces represent pitches. Duration is shown by note shape: whole (\u25CB), half (\u{1D15E}), quarter (\u2669), eighth (\u266A). The staff uses 5 lines.' }
          };

          // ═══ MUSIC QUIZ ═══
          var MUSIC_QUIZ = [
            { q: 'What waveform contains ONLY the fundamental frequency?', a: 'Sine', opts: ['Sine', 'Square', 'Sawtooth', 'Triangle'] },
            { q: 'What does ADSR stand for?', a: 'Attack Decay Sustain Release', opts: ['Attack Decay Sustain Release', 'Audio Digital Sound Router', 'Amplitude Duration Signal Response', 'Analog Delay Synth Reverb'] },
            { q: 'Which interval has a 3:2 frequency ratio?', a: 'Perfect Fifth', opts: ['Perfect Fifth', 'Major Third', t('stem.synth.octave'), 'Perfect Fourth'] },
            { q: 'What key has NO sharps or flats?', a: 'C Major', opts: ['C Major', 'G Major', 'D Major', 'A Major'] },
            { q: 'How many semitones in an octave?', a: '12', opts: ['12', '8', '7', '10'] },
            { q: 'What makes a major chord sound \u201Chappy\u201D?', a: 'Major third interval', opts: ['Major third interval', 'More notes', 'Higher pitch', 'Louder volume'] },
            { q: 'What is a tritone?', a: '6 semitones apart', opts: ['6 semitones apart', 'Three tones', 'A type of chord', 'A drum pattern'] },
            { q: 'Which mode sounds "Spanish/Flamenco"?', a: 'Phrygian', opts: ['Phrygian', 'Dorian', 'Lydian', 'Mixolydian'] },
            { q: 'What creates the difference in timbre between instruments?', a: 'Harmonic content', opts: ['Harmonic content', 'Volume', 'Pitch', 'Duration'] },
            { q: 'In equal temperament, the ratio between adjacent semitones is:', a: '2^(1/12)', opts: ['2^(1/12)', '12/7', '3/2', '1.5'] },
            { q: 'What does a low-pass filter do?', a: 'Removes high frequencies', opts: ['Removes high frequencies', 'Removes low frequencies', 'Adds distortion', 'Adds reverb'] },
            { q: 'A ii-V-I progression is most associated with:', a: 'Jazz', opts: ['Jazz', 'Metal', 'Country', 'Classical'] },
            { q: 'Karplus-Strong synthesis creates sounds resembling:', a: 'Plucked strings', opts: ['Plucked strings', 'Brass instruments', 'Drums', 'Wind instruments'] },
            { q: 'What is resonance (Q) in a filter?', a: 'Boost at cutoff frequency', opts: ['Boost at cutoff frequency', 'Echo effect', 'Volume control', 'Pitch shift'] },
            { q: 'How many notes does a pentatonic scale have?', a: '5', opts: ['5', '7', '6', '8'] },
            { q: 'Barry Harris was famous for using which chord type?', a: '6th chords', opts: ['6th chords', 'Power chords', 'Suspended chords', '11th chords'] },
            { q: 'What effect periodically changes volume?', a: 'Tremolo', opts: ['Tremolo', 'Vibrato', 'Reverb', 'Distortion'] },
            { q: 'Which waveform has ALL harmonics?', a: 'Sawtooth', opts: ['Sawtooth', 'Sine', 'Square', 'Triangle'] },
            { q: 'What is the relative minor of C major?', a: 'A minor', opts: ['A minor', 'D minor', 'E minor', 'B minor'] },
            { q: 'What does LFO stand for?', a: 'Low Frequency Oscillator', opts: ['Low Frequency Oscillator', 'Linear Filter Output', 'Logarithmic Fade Out', 'Loop Function Operator'] },
            { q: 'In the circle of fifths, moving clockwise adds:', a: 'Sharps', opts: ['Sharps', 'Flats', 'Notes', 'Octaves'] },
            { q: 'A chord inversion changes:', a: 'Which note is on bottom', opts: ['Which note is on bottom', 'The chord quality', 'The number of notes', 'The key signature'] },
            { q: 'What note value gets one beat in 4/4 time?', a: 'Quarter note', opts: ['Quarter note', 'Half note', 'Whole note', 'Eighth note'] },
            { q: 'An augmented chord is built with:', a: 'Two major thirds', opts: ['Two major thirds', 'Two minor thirds', 'A major and minor third', 'A fifth and octave'] },
            { q: 'Vibrato modulates:', a: 'Pitch', opts: ['Pitch', 'Volume', 'Duration', 'Timbre'] },
            { q: 'The \u201Cblue note\u201D in a blues scale is:', a: 'Flatted fifth', opts: ['Flatted fifth', 'Sharp fourth', 'Minor second', 'Major seventh'] },
            { q: 'How many unique diminished 7th chords exist?', a: '3', opts: ['3', '12', '6', '4'] },
          ];

          // ═══ STATE ═══
          var synthTab = d.synthTab || 'play';
          var selectedRoot = d.selectedRoot || 'C';
          var selectedScale = d.selectedScale || 'Major';
          var selectedChord = d.selectedChord || 'Major';
          var chordRoot = d.chordRoot || 'C';
          var chordInversion = d.chordInversion || 0;
          var scaleLock = d.scaleLock || false;
          var looping = d.looping !== false;
          var seqPlaying = d.seqPlaying || false;
          var metroOn = d.metroOn || false;
          var arpOn = d.arpOn || false;
          var arpPattern = d.arpPattern || 'up';
          var showFFT = d.showFFT || false;
          var timeSig = d.timeSig || '4/4';
          var loopLen = d.loopLen || 16;
          var seq = d.sequence || new Array(loopLen).fill(0);
          var drumSeq = d.drumSequence || d.drumSeq || {};
          var intervalGame = d.intervalGame;
          var jazzMode = d.jazzMode || false;
          var synthEngine = d.synthEngine || 'standard';
          var vizMode = d.vizMode || 'waveform'; // waveform, lissajous, helix

          // Scale helpers
          var rootIdx = NOTE_NAMES.indexOf(selectedRoot);
          var scaleIntervals = SCALES[selectedScale] ? SCALES[selectedScale].intervals : [0, 2, 4, 5, 7, 9, 11];
          function isInScale(semitone) { return scaleIntervals.indexOf(semitone % 12) !== -1; }

          // ═══ CHORD & SCALE PLAYBACK ═══
          function playChord(root, chordType, inv) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(root); var intervals = chordData.intervals.slice();
            for (var i = 0; i < (inv || 0); i++) { if (intervals.length > 1) intervals.push(intervals.shift() + 12); }
            intervals.forEach(function (intv, idx) {
              var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
              var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
              if (synthEngine === 'plucked') { playPlucked(freq, 'chord_' + idx, d.ksBrightness, d.ksDamping); }
              else { playNoteFor(freq, 'chord_' + idx, 1200); }
            });
          }
          function playScale(root, scaleName, descending) {
            var s = SCALES[scaleName]; if (!s) return; var ri = NOTE_NAMES.indexOf(root);
            var intervals = descending ? s.intervals.slice().reverse() : s.intervals.slice();
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                playNoteFor(noteFreq(NOTE_NAMES[nIdx], nOct), 'scale_' + idx, 350);
              }, idx * 300);
            });
          }
          function playProgression(prog) {
            var ri = NOTE_NAMES.indexOf(selectedRoot);
            prog.degrees.forEach(function (deg, idx) {
              setTimeout(function () {
                var chordRootIdx = (ri + deg[0]) % 12;
                playChord(NOTE_NAMES[chordRootIdx], deg[1], 0);
              }, idx * 800);
            });
          }

          // ═══ SEQUENCER ═══
          function toggleSeqStep(idx) { var s = seq.slice(); s[idx] = (s[idx] + 1) % (SEQ_NOTES.length + 1); upd('sequence', s); }
          function setSeqStep(idx, noteIdx) { var s = seq.slice(); s[idx] = noteIdx; upd('sequence', s); }
          function toggleDrumStep(type, idx) {
            var ds = Object.assign({}, drumSeq);
            if (!ds[type]) ds[type] = new Array(loopLen).fill(0);
            ds[type] = ds[type].slice(); ds[type][idx] = ds[type][idx] ? 0 : 1;
            upd('drumSequence', ds);
          }
          function startSequencer() {
            stopSequencer(); upd('seqPlaying', true); upd('seqStep', 0);
            var step = 0; var bpm = d.bpm || 120; var msPerStep = (60000 / bpm) / 2;
            window._alloSynthSeqInterval = setInterval(function () {
              var currentSeq = d.sequence || seq; var currentDrums = d.drumSequence || d.drumSeq || drumSeq;
              var noteIdx = currentSeq[step];
              if (noteIdx > 0 && noteIdx <= SEQ_NOTES.length) {
                var freq = SEQ_FREQS[noteIdx - 1];
                if (synthEngine === 'plucked') playPlucked(freq, 'seq_' + step, d.ksBrightness, d.ksDamping);
                else playNoteFor(freq, 'seq_' + step, msPerStep * 0.8);
              }
              DRUM_TYPES.forEach(function (dt) { if (currentDrums[dt] && currentDrums[dt][step]) playDrum(dt); });
              upd('seqStep', step);
              step = (step + 1) % loopLen;
              if (step === 0 && !looping) { stopSequencer(); }
            }, msPerStep);
          }
          function stopSequencer() { if (window._alloSynthSeqInterval) { clearInterval(window._alloSynthSeqInterval); window._alloSynthSeqInterval = null; } upd('seqPlaying', false); }
          function startMetronome() {
            stopMetronome(); upd('metroOn', true);
            var beat = 0; var bpm = d.bpm || 120; var ms = 60000 / bpm;
            var beatsPerMeasure = TIME_SIGS[timeSig] ? TIME_SIGS[timeSig].beats : 4;
            window._alloMetronomeInterval = setInterval(function () { playClick(beat === 0); upd('metroBeat', beat); beat = (beat + 1) % beatsPerMeasure; }, ms);
          }
          function stopMetronome() { if (window._alloMetronomeInterval) { clearInterval(window._alloMetronomeInterval); window._alloMetronomeInterval = null; } upd('metroOn', false); upd('metroBeat', -1); }
          function startArpeggiator() {
            stopArpeggiator(); upd('arpOn', true);
            var chordData = CHORDS[selectedChord]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(chordRoot); var intervals = chordData.intervals.slice();
            var arpOctaves = d.arpOctaves || 1;
            var allNotes = [];
            for (var oi = 0; oi < arpOctaves; oi++) { intervals.forEach(function (intv) { allNotes.push(intv + oi * 12); }); }
            var step = 0; var ascending = true; var ms = (60000 / (d.bpm || 120)) / 2;
            window._alloArpInterval = setInterval(function () {
              var intv = allNotes[step]; var nIdx = (ri + intv) % 12;
              var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
              playNoteFor(noteFreq(NOTE_NAMES[nIdx], nOct), 'arp_' + step, ms * 0.8);
              if (arpPattern === 'up') { step = (step + 1) % allNotes.length; }
              else if (arpPattern === 'down') { step = step <= 0 ? allNotes.length - 1 : step - 1; }
              else if (arpPattern === 'updown') {
                if (ascending) { step++; if (step >= allNotes.length - 1) ascending = false; }
                else { step--; if (step <= 0) ascending = true; }
              }
              else { step = Math.floor(Math.random() * allNotes.length); }
            }, ms);
          }
          function stopArpeggiator() { if (window._alloArpInterval) { clearInterval(window._alloArpInterval); window._alloArpInterval = null; } upd('arpOn', false); }

          // ═══ INTERVAL EAR TRAINING ═══
          function startIntervalGame() {
            var idx = 1 + Math.floor(Math.random() * 12);
            var intv = INTERVALS[idx]; var base = noteFreq(selectedRoot, d.octave || 4);
            var top = base * Math.pow(2, intv.semitones / 12);
            playNoteFor(base, 'ear_base', 600);
            setTimeout(function () { playNoteFor(top, 'ear_top', 600); }, 700);
            upd('intervalGame', { answer: intv.name, base: base, top: top, answered: false, chosen: null, score: (intervalGame && intervalGame.score) || 0, streak: (intervalGame && intervalGame.streak) || 0 });
          }
          function replayInterval() {
            if (!intervalGame) return;
            playNoteFor(intervalGame.base, 'ear_base', 600);
            setTimeout(function () { playNoteFor(intervalGame.top, 'ear_top', 600); }, 700);
          }

          // ═══ KEYBOARD HANDLER (delegated to top-level useEffect via window refs) ═══
          var KEYBOARD_MAP = {
            'z': 0, 'x': 2, 'c': 4, 'v': 5, 'b': 7, 'n': 9, 'm': 11, ',': 12, '.': 14, '/': 16,
            's': 1, 'd': 3, 'g': 6, 'h': 8, 'j': 10, 'l': 13, ';': 15
          };
          window._alloSynthKeyDown = function (e) {
            if (e.repeat) return;
            var semi = KEYBOARD_MAP[e.key.toLowerCase()];
            if (semi !== undefined && synthTab === 'play') {
              var key = KEYS[semi];
              if (key) {
                var noteId = key.note + key.octave;
                if (scaleLock && !isInScale(key.semitone)) return;
                if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                else { playNote(key.freq, noteId); }
                upd('activeKeys', (d.activeKeys || []).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq);
              }
            }
          };
          window._alloSynthKeyUp = function (e) {
            var semi = KEYBOARD_MAP[e.key.toLowerCase()];
            if (semi !== undefined) {
              var key = KEYS[semi];
              if (key) { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); }
            }
          };

          // ═══ NOTATION HELPERS (for composition view) ═══
          var NOTE_TO_STAFF = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
          function seqToNotation(seqArr) {
            // Convert sequencer step array to notation-like data
            return seqArr.map(function (noteIdx, stepIdx) {
              if (noteIdx === 0) return { rest: true, step: stepIdx };
              var name = SEQ_NOTES[noteIdx - 1] || 'C';
              var baseName = name.replace(/[0-9]/g, '');
              var staffPos = NOTE_TO_STAFF[baseName] || 0;
              if (name.indexOf('5') !== -1) staffPos += 7;
              return { note: name, staffPos: staffPos, step: stepIdx, rest: false };
            });
          }

          // ═══ OSCILLOSCOPE REF ═══
          var canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (canvasRef._lastCanvas && canvasRef._lastCanvas._synthVizAnim) {
                cancelAnimationFrame(canvasRef._lastCanvas._synthVizAnim);
                canvasRef._lastCanvas._synthVizInit = false;
              }
              canvasRef._lastCanvas = null;
              return;
            }
            if (canvasEl._synthVizInit) return;
            canvasRef._lastCanvas = canvasEl;
            canvasEl._synthVizInit = true;
            var W = canvasEl.width = canvasEl.offsetWidth * 2;
            var H = canvasEl.height = canvasEl.offsetHeight * 2;
            var ctx = canvasEl.getContext('2d');
            function draw() {
              canvasEl._synthVizAnim = requestAnimationFrame(draw);
              var analyser = window._alloSynthAnalyser;
              var vizMode = canvasEl.dataset.vizMode || 'waveform';
              ctx.fillStyle = '#0f0a1e'; ctx.fillRect(0, 0, W, H);
              // Grid
              ctx.strokeStyle = 'rgba(139,92,246,0.08)'; ctx.lineWidth = 1;
              for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
              for (var gy = 0; gy < H; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
              // Center line
              ctx.strokeStyle = 'rgba(139,92,246,0.15)'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
              if (!analyser) return;
              var showFFTMode = canvasEl.dataset.showFft === 'true';

              if (vizMode === 'lissajous') {
                // Lissajous: plot waveform against a phase-shifted version
                var buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.beginPath();
                var phaseShift = Math.floor(buf.length / 4);
                for (var i = 0; i < buf.length - phaseShift; i++) {
                  var x = (buf[i] / 255) * W;
                  var y = (buf[i + phaseShift] / 255) * H;
                  if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                // Glow
                ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8;
                ctx.stroke(); ctx.shadowBlur = 0;
              } else if (vizMode === 'helix') {
                // 3D helix: waveform wrapping in pseudo-3D
                var buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                var turns = 3; var perspective = 0.3;
                ctx.lineWidth = 2;
                for (var i = 0; i < buf.length; i++) {
                  var t = i / buf.length;
                  var angle = t * turns * Math.PI * 2;
                  var amplitude = (buf[i] / 128 - 1) * (H * 0.35);
                  var x = t * W;
                  var depth = Math.sin(angle) * perspective + 1;
                  var y = H / 2 + amplitude * Math.cos(angle) * depth;
                  var hue = 270 + t * 60;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 65%, ' + (0.3 + depth * 0.35) + ')';
                  ctx.fillRect(x, y, 2, 2);
                }
              } else if (showFFTMode) {
                // Frequency spectrum
                var freqData = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(freqData);
                var barW = W / freqData.length * 2.5;
                for (var fi = 0; fi < freqData.length / 2.5; fi++) {
                  var val = freqData[fi] / 255;
                  var barH = val * H * 0.85;
                  var hue = 280 - val * 60;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 55%, 0.8)';
                  ctx.fillRect(fi * barW, H - barH, barW - 1, barH);
                  // Glow top
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 75%, 0.4)';
                  ctx.fillRect(fi * barW, H - barH - 2, barW - 1, 3);
                }
              } else {
                // Waveform + note color glow
                var buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                // Glow ring
                var noteColor = canvasEl.dataset.noteColor || '#a855f7';
                var hasSignal = false;
                for (var ci = 0; ci < buf.length; ci++) { if (Math.abs(buf[ci] - 128) > 3) { hasSignal = true; break; } }
                if (hasSignal) {
                  ctx.save();
                  ctx.shadowColor = noteColor; ctx.shadowBlur = 20;
                  ctx.strokeStyle = noteColor; ctx.lineWidth = 3;
                  ctx.strokeRect(2, 2, W - 4, H - 4);
                  ctx.restore();
                }
                // Waveform
                ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.beginPath();
                var sliceWidth = W / buf.length;
                for (var i = 0; i < buf.length; i++) {
                  var v = buf[i] / 128.0; var y = (v * H) / 2;
                  if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * sliceWidth, y);
                }
                ctx.stroke();
                // Bright center line glow
                ctx.strokeStyle = 'rgba(168,85,247,0.4)'; ctx.lineWidth = 4;
                ctx.stroke();
              }

              // Particles
              if (window._alloParticles && window._alloParticles.length > 0) {
                var particles = window._alloParticles;
                for (var pi = particles.length - 1; pi >= 0; pi--) {
                  var p = particles[pi];
                  p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= p.decay;
                  if (p.life <= 0) { particles.splice(pi, 1); continue; }
                  ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
                  ctx.beginPath(); ctx.arc(p.x * 2, p.y * 2, p.size * 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
              }
            }
            canvasEl._synthVizAnim = requestAnimationFrame(draw);
          };

          // ═════════════════════════════════════════════════════════════
          // ═══ RETURN: UI RENDERING ═══
          // ═════════════════════════════════════════════════════════════

          // ═══ KEYBOARD CHORD SWITCHING (QAZ/WSX/EDC/RFV/TGB/YHN/UJM) ═══
          var CHORD_KEY_MAP = {
            'q': { root: 'C', type: 'Major' }, 'a': { root: 'C', type: 'Minor' }, 'z': { root: 'C', type: 'Dom7' },
            'w': { root: 'D', type: 'Major' }, 's': { root: 'D', type: 'Minor' }, 'x': { root: 'D', type: 'Dom7' },
            'e': { root: 'E', type: 'Major' }, 'd': { root: 'E', type: 'Minor' }, 'c': { root: 'E', type: 'Dom7' },
            'r': { root: 'F', type: 'Major' }, 'f': { root: 'F', type: 'Minor' }, 'v': { root: 'F', type: 'Dom7' },
            't': { root: 'G', type: 'Major' }, 'g': { root: 'G', type: 'Minor' }, 'b': { root: 'G', type: 'Dom7' },
            'y': { root: 'A', type: 'Major' }, 'h': { root: 'A', type: 'Minor' }, 'n': { root: 'A', type: 'Dom7' },
            'u': { root: 'B', type: 'Major' }, 'j': { root: 'B', type: 'Minor' }, 'm': { root: 'B', type: 'Dom7' }
          };
          React.useEffect(function () {
            if (synthTab !== 'harmonypad' && synthTab !== 'beatpad') return;
            function onKeyDown(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var k = e.key.toLowerCase();
              if (synthTab === 'harmonypad') {
                var chord = CHORD_KEY_MAP[k];
                if (chord) { upd('omniChordRoot', chord.root); upd('omniChordType', chord.type); e.preventDefault(); return; }
                if (k === ' ') { strumHarmony(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); e.preventDefault(); return; }
              }
              // Beat pad keyboard triggers (number row for pads)
              if (synthTab === 'beatpad') {
                var padKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
                var pi = padKeys.indexOf(k);
                if (pi !== -1 && pi < (window._alloBeatPadSounds || []).length) {
                  var ps = (window._alloBeatPadSounds || [])[pi];
                  if (ps) playDrum(ps.type);
                  upd('beatPadActive', pi);
                  setTimeout(function () { upd('beatPadActive', -1); }, 150);
                  e.preventDefault();
                }
              }
            }
            document.addEventListener('keydown', onKeyDown);
            return function () { document.removeEventListener('keydown', onKeyDown); };
          }, [synthTab, d.omniChordRoot, d.omniChordType, d.omniVoice]);

          // ═══ WEB MIDI CONTROLLER SUPPORT ═══
          React.useEffect(function () {
            if (!navigator.requestMIDIAccess) return;
            var cleanup = [];
            navigator.requestMIDIAccess({ sysex: false }).then(function (midi) {
              upd('midiConnected', midi.inputs.size > 0);
              midi.onstatechange = function () { upd('midiConnected', midi.inputs.size > 0); };
              midi.inputs.forEach(function (input) {
                function handler(msg) {
                  var cmd = msg.data[0] & 0xf0;
                  var note = msg.data[1];
                  var vel = msg.data.length > 2 ? msg.data[2] : 0;
                  if (cmd === 0x90 && vel > 0) {
                    // Note On — play synth note
                    var nNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
                    var midiOct = Math.floor(note / 12) - 1;
                    var midiNote = nNames[note % 12];
                    var freq = 440 * Math.pow(2, (note - 69) / 12);
                    var volume = vel / 127;
                    playHarmonyTone(freq, 'midi_' + note, 2000, d.omniVoice || 'harp');
                  }
                  if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
                    // Note Off — stop note
                    if (window._alloSynthActiveNotes['midi_' + note]) {
                      var n = window._alloSynthActiveNotes['midi_' + note];
                      if (n.master) { n.master.gain.cancelScheduledValues(0); n.master.gain.linearRampToValueAtTime(0, getCtx().ctx.currentTime + 0.05); }
                      delete window._alloSynthActiveNotes['midi_' + note];
                    }
                  }
                }
                input.addEventListener('midimessage', handler);
                cleanup.push(function () { input.removeEventListener('midimessage', handler); });
              });
            }).catch(function () { /* MIDI not available */ });
            return function () { cleanup.forEach(function (fn) { fn(); }); };
          }, [d.omniVoice]);

          // ═══ SOUND ENGINE BOOST: Reverb + Compressor ═══
          (function initSynthEffects() {
            if (window._alloSynthReverbInit) return;
            window._alloSynthReverbInit = true;
            try {
              var audio = getCtx();
              var ctx = audio.ctx;
              // Create DynamicsCompressor for master limiting
              if (!audio._compressor) {
                var comp = ctx.createDynamicsCompressor();
                comp.threshold.value = -12;
                comp.knee.value = 10;
                comp.ratio.value = 4;
                comp.attack.value = 0.003;
                comp.release.value = 0.15;
                // Create convolver reverb with procedural impulse response
                var reverbLen = ctx.sampleRate * 1.5;
                var impulse = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
                for (var ch = 0; ch < 2; ch++) {
                  var impData = impulse.getChannelData(ch);
                  for (var i = 0; i < reverbLen; i++) {
                    impData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
                  }
                }
                var convolver = ctx.createConvolver();
                convolver.buffer = impulse;
                var reverbGain = ctx.createGain();
                reverbGain.gain.value = 0.15; // wet mix
                var dryGain = ctx.createGain();
                dryGain.gain.value = 0.85;
                // Reroute: audio.gain → split → dry + reverb → compressor → destination
                audio.gain.disconnect();
                audio.gain.connect(dryGain);
                audio.gain.connect(convolver);
                convolver.connect(reverbGain);
                dryGain.connect(comp);
                reverbGain.connect(comp);
                comp.connect(ctx.destination);
                audio._compressor = comp;
                audio._convolver = convolver;
                audio._reverbGain = reverbGain;
              }
            } catch (e) { console.warn('[Synth] Reverb init failed:', e); }
          })();

          // ═══ BEAT PAD: 16-step sequencer state & engine ═══
          var BEAT_PAD_SOUNDS = [
            { type: 'kick', label: 'Kick', color: '#ef4444', key: '1' },
            { type: 'snare', label: 'Snare', color: '#f97316', key: '2' },
            { type: 'clap', label: 'Clap', color: '#eab308', key: '3' },
            { type: 'rim', label: 'Rim', color: '#84cc16', key: '4' },
            { type: 'hihat', label: 'CH Hat', color: '#22c55e', key: '5' },
            { type: 'openhat', label: 'OH Hat', color: '#06b6d4', key: '6' },
            { type: 'cymbal', label: 'Cymbal', color: '#3b82f6', key: '7' },
            { type: 'tom1', label: 'Tom Hi', color: '#8b5cf6', key: '8' },
            { type: 'tom2', label: 'Tom Lo', color: '#a855f7', key: '9' },
            { type: 'cowbell', label: 'Cowbell', color: '#ec4899', key: '0' },
            { type: 'clave', label: 'Clave', color: '#f43f5e', key: '-' },
            { type: 'shaker', label: 'Shaker', color: '#14b8a6', key: '=' }
          ];
          window._alloBeatPadSounds = BEAT_PAD_SOUNDS;

          // playDrumStyled handles kit-flavored synthesis; playDrum is the raw fallback



          // ═══ PER-CHANNEL MIXER ═══
          function getChVol(row) { var v = d.chVolumes || {}; return v[row] !== undefined ? v[row] : 0.8; }
          function isChMuted(row) {
            var solo = d.chSolo;
            if (solo !== undefined && solo >= 0 && solo !== row) return true;
            return !!(d.chMutes && d.chMutes[row]);
          }

          // ═══ EFFECTS RACK (Web Audio lazy-init) ═══
          var _bpFxRef = React.useRef(null);
          function _initBpFx() {
            if (_bpFxRef.current) return _bpFxRef.current;
            var audio = getCtx(); var ctx = audio.ctx;
            var irLen = Math.round(ctx.sampleRate * 1.5);
            var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
            for (var ch = 0; ch < 2; ch++) { var dd = irBuf.getChannelData(ch); for (var i = 0; i < irLen; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5); }
            var conv = ctx.createConvolver(); conv.buffer = irBuf;
            var revG = ctx.createGain(); revG.gain.value = 0;
            var dryG = ctx.createGain(); dryG.gain.value = 1;
            var del = ctx.createDelay(1.0); del.delayTime.value = 0.25;
            var delFb = ctx.createGain(); delFb.gain.value = 0;
            var delW = ctx.createGain(); delW.gain.value = 0;
            var flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 20000; flt.Q.value = 1;
            var inp = ctx.createGain(); inp.gain.value = 1;
            var out = ctx.createGain(); out.gain.value = 1;
            inp.connect(flt);
            flt.connect(dryG); dryG.connect(out);
            flt.connect(conv); conv.connect(revG); revG.connect(out);
            flt.connect(del); del.connect(delW); delW.connect(out);
            del.connect(delFb); delFb.connect(del);
            out.connect(audio.gain);
            _bpFxRef.current = { inp: inp, revG: revG, dryG: dryG, del: del, delFb: delFb, delW: delW, flt: flt, out: out };
            return _bpFxRef.current;
          }
          function _getBpFxDest(audio) {
            if (!d.bpFxOn) return audio.gain;
            return _initBpFx().inp;
          }
          React.useEffect(function () {
            if (!_bpFxRef.current) return;
            var fx = _bpFxRef.current;
            var r = (d.bpReverb || 0) / 100, dl = (d.bpDelay || 0) / 100, c = d.bpFilterCut || 20000;
            fx.revG.gain.value = r * 0.6; fx.dryG.gain.value = 1 - r * 0.3;
            fx.delW.gain.value = dl * 0.5; fx.delFb.gain.value = dl * 0.4;
            fx.flt.frequency.value = c;
          }, [d.bpReverb, d.bpDelay, d.bpFilterCut]);

          // ═══ TAP TEMPO ═══
          if (!window._bpTapTimes) window._bpTapTimes = [];
          function tapTempo() {
            var now = Date.now(); var taps = window._bpTapTimes;
            if (taps.length > 0 && now - taps[taps.length - 1] > 2000) taps.length = 0;
            taps.push(now);
            if (taps.length > 1) {
              var ints = []; for (var i = 1; i < Math.min(taps.length, 5); i++) ints.push(taps[i] - taps[i - 1]);
              var avg = ints.reduce(function (a, b) { return a + b; }, 0) / ints.length;
              upd('seqBPM', Math.max(60, Math.min(200, Math.round(60000 / avg))));
            }
          }

          // ═══ UNDO / REDO ═══
          if (!window._bpUndoStack) window._bpUndoStack = [];
          if (!window._bpRedoStack) window._bpRedoStack = [];
          function pushBpUndo() {
            window._bpUndoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            if (window._bpUndoStack.length > 30) window._bpUndoStack.shift();
            window._bpRedoStack.length = 0;
          }
          function bpUndo() {
            if (!window._bpUndoStack.length) return;
            window._bpRedoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            var prev = window._bpUndoStack.pop();
            upd('seqGrid', prev.g); upd('beatMelody', prev.m);
          }
          function bpRedo() {
            if (!window._bpRedoStack.length) return;
            window._bpUndoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            var nxt = window._bpRedoStack.pop();
            upd('seqGrid', nxt.g); upd('beatMelody', nxt.m);
          }

          // ═══ SCALE-LOCKED MELODY ═══
          var SCALE_PATTERNS = {
            'chromatic': { name: 'All Notes', intervals: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
            'major': { name: 'Major', intervals: [0,2,4,5,7,9,11,12] },
            'minor': { name: 'Minor', intervals: [0,2,3,5,7,8,10,12] },
            'pentatonic': { name: 'Pentatonic', intervals: [0,2,4,7,9,12] },
            'blues': { name: 'Blues', intervals: [0,3,5,6,7,10,12] },
            'dorian': { name: 'Dorian', intervals: [0,2,3,5,7,9,10,12] },
            'mixolydian': { name: 'Mixolydian', intervals: [0,2,4,5,7,9,10,12] }
          };
          var ALL_NOTE_NAMES = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5'];
          var ALL_NOTE_FREQS = [261.63,277.18,293.66,311.13,329.63,349.23,369.99,392.00,415.30,440.00,466.16,493.88,523.25];
          function getScaleNotes() {
            var sc = SCALE_PATTERNS[d.bpScale || 'major'] || SCALE_PATTERNS['major'];
            var n = [], f = [];
            sc.intervals.forEach(function (iv) { if (iv < ALL_NOTE_NAMES.length) { n.push(ALL_NOTE_NAMES[iv]); f.push(ALL_NOTE_FREQS[iv]); } });
            return { notes: n, freqs: f };
          }

          // ═══ STEP RECORDING ═══
          function stepRecHit(row) {
            if (!d.bpStepRec) return false;
            var pos = d.bpStepRecPos || 0;
            var g = Object.assign({}, d.seqGrid || {});
            g[row + '_' + pos] = 1;
            upd('seqGrid', g);
            upd('bpStepRecPos', (pos + 1) % 16);
            pushBpUndo();
            return true;
          }

          // ═══ SHARE VIA URL ═══
          function sharePattern() {
            try {
              var obj = { g: d.seqGrid || {}, m: d.beatMelody || [], b: d.seqBPM || 120, s: d.seqSwing || '0' };
              var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
              var url = location.origin + location.pathname + '#beat=' + b64;
              navigator.clipboard.writeText(url).then(function () { addToast('\uD83D\uDD17 Beat URL copied!', 'success'); })
                .catch(function () { prompt('Copy this URL:', url); });
            } catch (e) { addToast('\u274C Share failed', 'error'); }
          }
          React.useEffect(function () {
            try {
              var h = location.hash;
              if (!h || h.indexOf('#beat=') !== 0) return;
              var json = decodeURIComponent(escape(atob(h.substring(6))));
              var obj = JSON.parse(json);
              if (obj.g) upd('seqGrid', obj.g);
              if (obj.m) upd('beatMelody', obj.m);
              if (obj.b) upd('seqBPM', obj.b);
              if (obj.s) upd('seqSwing', obj.s);
              history.replaceState(null, '', location.pathname);
              addToast('\uD83C\uDFB5 Loaded shared beat!', 'success');
            } catch (e) {}
          }, []);

          // ═══ WAV EXPORT (MediaRecorder) ═══
          function exportBeat() {
            try {
              var audio = getCtx(); var ctx = audio.ctx;
              var dest = ctx.createMediaStreamDestination();
              audio.gain.connect(dest);
              var chunks = []; var mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
              var rec = new MediaRecorder(dest.stream, { mimeType: mimeType });
              rec.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
              rec.onstop = function () {
                audio.gain.disconnect(dest);
                var blob = new Blob(chunks, { type: mimeType });
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'beat_' + new Date().toISOString().slice(0, 10) + '.webm';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                addToast('\uD83D\uDCE5 Beat exported!', 'success'); upd('bpExporting', false);
              };
              rec.start(); upd('bpExporting', true);
              var bpm = d.seqBPM || 120; var total = ((60000 / bpm) / 4) * 16 + 300;
              if (!d.seqPlaying) startSequencer();
              setTimeout(function () { rec.stop(); stopSequencer(); }, total);
            } catch (e) { addToast('\u274C Export failed', 'error'); upd('bpExporting', false); }
          }

          // ═══ WAVEFORM VISUALIZER ═══
          var _bpCanvasRef = React.useRef(null);
          var _bpAnimRef = React.useRef(null);
          var _bpAnalyserRef = React.useRef(null);
          React.useEffect(function () {
            if (!d.seqPlaying) { if (_bpAnimRef.current) { cancelAnimationFrame(_bpAnimRef.current); _bpAnimRef.current = null; } return; }
            var canvas = _bpCanvasRef.current; if (!canvas) return;
            var audio = getCtx(); var ctx = audio.ctx;
            if (!_bpAnalyserRef.current) { var an = ctx.createAnalyser(); an.fftSize = 256; audio.gain.connect(an); _bpAnalyserRef.current = an; }
            var analyser = _bpAnalyserRef.current; var cctx = canvas.getContext('2d');
            var w = canvas.width, h = canvas.height, buf = new Uint8Array(analyser.frequencyBinCount);
            function draw() {
              _bpAnimRef.current = requestAnimationFrame(draw);
              analyser.getByteTimeDomainData(buf);
              var grd = cctx.createLinearGradient(0, 0, w, 0);
              grd.addColorStop(0, '#1e1b4b'); grd.addColorStop(0.5, '#312e81'); grd.addColorStop(1, '#1e1b4b');
              cctx.fillStyle = grd; cctx.fillRect(0, 0, w, h);
              var wg = cctx.createLinearGradient(0, 0, w, 0);
              wg.addColorStop(0, '#a78bfa'); wg.addColorStop(0.5, '#f472b6'); wg.addColorStop(1, '#a78bfa');
              cctx.strokeStyle = wg; cctx.lineWidth = 2; cctx.beginPath();
              var sw = w / buf.length;
              for (var i = 0; i < buf.length; i++) { var y = (buf[i] / 128.0) * h / 2; if (i === 0) cctx.moveTo(0, y); else cctx.lineTo(i * sw, y); }
              cctx.lineTo(w, h / 2); cctx.stroke();
              cctx.shadowBlur = 8; cctx.shadowColor = '#a78bfa'; cctx.stroke(); cctx.shadowBlur = 0;
            }
            draw();
            return function () { if (_bpAnimRef.current) cancelAnimationFrame(_bpAnimRef.current); };
          }, [d.seqPlaying, synthTab]);

          // ═══ RHYTHM EXERCISES ═══
          var RHYTHM_CHALLENGES = [
            { name: 'Rock Beat', pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], desc: 'Quarter notes on the beat' },
            { name: 'Backbeat', pattern: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], desc: 'Snare on 2 and 4' },
            { name: 'Syncopation', pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], desc: 'Off-beat accents' },
            { name: '16th Notes', pattern: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], desc: 'Every subdivision' },
            { name: 'Swing Feel', pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], desc: 'Triplet-style groove' },
            { name: 'Reggae One-Drop', pattern: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], desc: 'Accent only on beat 3' }
          ];
          function genRandomRhythm() {
            var p = new Array(16).fill(0);
            for (var i = 0; i < 16; i++) { if (Math.random() < (i % 4 === 0 ? 0.7 : 0.3)) p[i] = 1; }
            return { name: 'Random #' + Math.floor(Math.random() * 100), pattern: p, desc: 'Try to match this pattern!' };
          }

          // ═══ SEQUENCER ENGINE (setTimeout chain for swing support) ═══
          var _seqTimer = React.useRef(null);
          var _seqStep = React.useRef(0);
          var _seqTickRef = React.useRef(null);
          // Shared tick function — reads d (grid, melody, BPM, swing) fresh each render
          function _seqTick() {
            var bpm = d.seqBPM || 120;
            var baseMs = (60000 / bpm) / 4; // 16th note base
            var swingPct = parseFloat(d.seqSwing || '0') / 100;
            var step = _seqStep.current;
            // Play drum grid
            var grid = d.seqGrid || {};
            BEAT_PAD_SOUNDS.forEach(function (sound, row) {
              if (grid[row + '_' + step]) {
                playSample(sound.type, row);
              }
            });
            // Play melody note (scale-aware)
            var mel = d.beatMelody || [];
            var _scD = getScaleNotes();
            var ni = mel[step];
            if (ni > 0 && ni <= _scD.freqs.length) {
              playNoteFor(_scD.freqs[ni - 1], 'bpmel_' + step, baseMs * 0.8);
            }
            upd('seqCurrentStep', step);
            _seqStep.current = (step + 1) % 16;
            // Schedule next tick with swing: odd steps get delayed, even steps get shortened
            var isSwungStep = step % 2 === 1;
            var nextDelay = isSwungStep ? baseMs * (1 + swingPct) : baseMs * (1 - swingPct);
            if (nextDelay < 10) nextDelay = 10; // safety floor
            // Use ref indirection so the chain always calls the latest render's tick
            _seqTimer.current = setTimeout(function() { if (_seqTickRef.current) _seqTickRef.current(); }, nextDelay);
          }
          // Keep ref pointing to latest render's _seqTick
          _seqTickRef.current = _seqTick;
          function startSequencer() {
            if (_seqTimer.current) return;
            _seqStep.current = 0;
            _seqTick(); // fire first tick immediately, it schedules the chain
            upd('seqPlaying', true);
          }
          function stopSequencer() {
            if (_seqTimer.current) { clearTimeout(_seqTimer.current); _seqTimer.current = null; }
            upd('seqPlaying', false);
            upd('seqCurrentStep', -1);
          }
          // Clean up on unmount
          React.useEffect(function () { return function () { stopSequencer(); }; }, []);
          // Restart sequencer when BPM changes while playing (preserves step position)
          React.useEffect(function () {
            if (d.seqPlaying && _seqTimer.current) {
              clearTimeout(_seqTimer.current);
              _seqTimer.current = null;
              // Re-schedule from current step (don't reset to 0)
              _seqTick();
            }
          }, [d.seqBPM]);

          // ═══ EDM PRESET PATTERNS ═══
          var SEQ_PRESETS = {
            'four_on_floor': { name: '4-on-the-Floor', grid: {'0_0':1,'0_4':1,'0_8':1,'0_12':1,'1_4':1,'1_12':1,'4_0':1,'4_2':1,'4_4':1,'4_6':1,'4_8':1,'4_10':1,'4_12':1,'4_14':1} },
            'breakbeat': { name: 'Breakbeat', grid: {'0_0':1,'0_6':1,'0_10':1,'1_4':1,'1_12':1,'4_0':1,'4_4':1,'4_8':1,'4_12':1,'4_2':1,'4_10':1} },
            'trap_hats': { name: 'Trap Hi-Hats', grid: {'0_0':1,'0_8':1,'1_4':1,'1_12':1,'4_0':1,'4_1':1,'4_2':1,'4_3':1,'4_4':1,'4_5':1,'4_6':1,'4_7':1,'4_8':1,'4_9':1,'4_10':1,'4_11':1,'4_12':1,'4_13':1,'4_14':1,'4_15':1,'5_2':1,'5_6':1,'5_10':1,'5_14':1} },
            'house': { name: 'House', grid: {'0_0':1,'0_4':1,'0_8':1,'0_12':1,'1_4':1,'1_12':1,'4_0':1,'4_2':1,'4_4':1,'4_6':1,'4_8':1,'4_10':1,'4_12':1,'4_14':1,'5_2':1,'5_6':1,'5_10':1,'5_14':1,'2_2':1,'2_14':1} },
            'reggaeton': { name: 'Reggaeton', grid: {'0_0':1,'0_6':1,'0_12':1,'1_3':1,'1_7':1,'1_11':1,'1_15':1,'4_0':1,'4_4':1,'4_8':1,'4_12':1} },
          };

          // ═══ CDN SAMPLE LOADER (lazy-loads on first Beat Pad open) ═══
          var SAMPLE_CDN = 'https://tonejs.github.io/audio/drum-samples/';
          var SAMPLE_KITS = {
            'CR78': { name: 'CR-78 Vintage', icon: '\uD83C\uDFDB\uFE0F',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 1.4, pitchShift: -0.1, filterFreq: 3000, gainMul: 0.7, character: 'vintage' } },
            'acoustic-kit': { name: 'Acoustic Kit', icon: '\uD83E\uDD41',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 1.0, pitchShift: 0, filterFreq: 6000, gainMul: 0.8, character: 'acoustic' } },
            'Techno': { name: 'Techno EDM', icon: '\u26A1',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 0.6, pitchShift: 0.15, filterFreq: 9000, gainMul: 0.9, character: 'techno' } },
            'LINN': { name: 'LinnDrum', icon: '\uD83D\uDD0A',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 0.8, pitchShift: 0.05, filterFreq: 7000, gainMul: 0.85, character: 'linn' } },
            '4OP-FM': { name: 'FM Synthesis', icon: '\uD83C\uDF1F',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 0.7, pitchShift: 0.3, filterFreq: 10000, gainMul: 0.8, character: 'fm' } }
          };
          // Sample cache: { kitName: { soundType: AudioBuffer } }
          if (!window._alloSampleCache) window._alloSampleCache = {};
          if (!window._alloUserSamples) window._alloUserSamples = [];
          function loadSampleKit(kitName) {
            if (window._alloSampleCache[kitName]) { upd('samplesLoaded', kitName); return; }
            var kit = SAMPLE_KITS[kitName]; if (!kit) return;
            upd('samplesLoading', true);
            var audio = getCtx(); var ctx = audio.ctx;
            var loaded = {}; var total = Object.keys(kit.files).length; var count = 0;
            Object.keys(kit.files).forEach(function (type) {
              var url = SAMPLE_CDN + kitName + '/' + kit.files[type];
              fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
                return ctx.decodeAudioData(buf);
              }).then(function (decoded) {
                loaded[type] = decoded; count++;
                if (count >= total) {
                  window._alloSampleCache[kitName] = loaded;
                  upd('samplesLoading', false); upd('samplesLoaded', kitName);
                  upd('activeKit', kitName);
                }
              }).catch(function (e) {
                console.warn('[Beat Pad] Failed to load sample:', url, e);
                count++;
                if (count >= total) {
                  upd('samplesLoading', false);
                  if (Object.keys(loaded).length === 0) {
                    addToast('\u26a0\ufe0f Sample kit "' + kitName + '" failed to load \u2014 using synthesized drums instead', 'warning');
                    upd('sampleLoadError', kitName);
                  } else {
                    window._alloSampleCache[kitName] = loaded;
                    upd('samplesLoaded', kitName); upd('activeKit', kitName);
                    addToast('\u26a0\ufe0f Some samples from "' + kitName + '" failed \u2014 missing sounds will use synthesis', 'info');
                  }
                }
              });
            });
          }
          // Play sample from loaded kit, fall back to synth
          function playSample(type, row) {
            if (row !== undefined && isChMuted(row)) return;
            var vol = (row !== undefined) ? getChVol(row) : 0.8;
            var kit = d.activeKit || '';
            var kitDef = SAMPLE_KITS[kit];
            var cache = window._alloSampleCache[kit];
            if (cache && cache[type]) {
              var audio = getCtx(); var ctx = audio.ctx;
              var source = ctx.createBufferSource();
              source.buffer = cache[type];
              var g = ctx.createGain();
              var dest = _getBpFxDest(audio);
              // Creative re-mappings: openhat = hihat with longer envelope
              if (type === 'openhat') {
                g.gain.setValueAtTime(vol, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              } else if (type === 'clap') {
                // Clap re-maps from snare — pitch up slightly, short burst
                source.playbackRate.value = 1.3;
                g.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
              } else if (type === 'rim') {
                // Rim re-maps from snare — pitch way up, very short
                source.playbackRate.value = 1.8;
                g.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
              } else {
                g.gain.value = vol;
              }
              source.connect(g);
              g.connect(dest);
              source.start(0);
              return;
            }
            // Fall back to synthesis with kit style applied
            var style = (kitDef && kitDef.synthStyle) ? kitDef.synthStyle : null;
            playDrumStyled(type, style, vol);
          }
          // Play user-uploaded sample by index
          function playUserSample(idx) {
            var samples = window._alloUserSamples || [];
            if (!samples[idx]) return;
            var audio = getCtx(); var ctx = audio.ctx;
            var source = ctx.createBufferSource();
            source.buffer = samples[idx].buffer;
            var g = ctx.createGain(); g.gain.value = 0.8;
            source.connect(g); g.connect(audio.gain);
            source.start(0);
          }
          var melodySeqBP = d.beatMelody || new Array(16).fill(0);
          // Load default kit on first beatpad visit
          React.useEffect(function () {
            if (synthTab === 'beatpad' && !d.activeKit && !d.samplesLoading) {
              loadSampleKit('CR78');
            }
          }, [synthTab, d.activeKit, d.samplesLoading]);
          // Keyboard shortcuts for drum pads (number row)
          React.useEffect(function () {
            function handlePadKey(e) {
              if (synthTab !== 'beatpad') return;
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var padMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11 };
              var idx = padMap[e.key];
              if (idx !== undefined && BEAT_PAD_SOUNDS[idx]) {
                e.preventDefault();
                playSample(BEAT_PAD_SOUNDS[idx].type, idx); stepRecHit(idx);
                upd('padHit_' + idx, true);
                setTimeout(function () { upd('padHit_' + idx, false); }, 120);
              }
            }
            window.addEventListener('keydown', handlePadKey);
            return function () { window.removeEventListener('keydown', handlePadKey); };
          }, [synthTab, d.activeKit]);
          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },
            // ── Header ──
            React.createElement("div", { className: "flex items-center gap-3 mb-3" },
              React.createElement("button", { onClick: function () { setStemLabTool(null); stopSequencer(); stopMetronome(); stopArpeggiator(); }, className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-200" })),
              React.createElement("h3", { className: "text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500" }, "\uD83C\uDFB9 Music Synthesizer"),
              React.createElement("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-[11px] font-bold rounded-full" },
                synthEngine === 'supersaw' ? '\u26A1 SUPERSAW' : synthEngine === 'fm' ? '\uD83C\uDF1F FM' : synthEngine === 'sub' ? '\uD83C\uDF0A SUB' : synthEngine === 'pad' ? '\u2601\uFE0F PAD' : synthEngine === 'plucked' ? '\uD83C\uDFB8 PLUCKED' : '\u223F ' + (d.waveType || 'sine').toUpperCase()
              ),
              d.activePreset && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full" }, "\u2B50 " + d.activePreset),
              // Tab selector
              React.createElement("div", { className: "flex gap-0.5 ml-auto bg-slate-100 rounded-lg p-0.5" },
                [{ id: 'play', icon: '\uD83C\uDFB9', label: t('stem.synth.play') }, { id: 'scales', icon: '\uD83C\uDFB5', label: t('stem.synth.scales') }, { id: 'chords', icon: '\uD83C\uDFB6', label: t('stem.synth.chords') }, { id: 'harmonypad', icon: '\uD83C\uDF1F', label: t('stem.synth.harmonypad') }, { id: 'beatpad', icon: '\uD83E\uDD41', label: t('stem.synth.beatpad') || 'Beat Pad' }, { id: 'theory', icon: '\uD83D\uDCDA', label: t('stem.synth.theory') }].map(function (tab) {
                  return React.createElement("button", { key: tab.id, role: "tab", "aria-selected": synthTab === tab.id,
                    onClick: function () { upd('synthTab', tab.id); },
                    className: "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all " + (synthTab === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-700')
                  }, tab.icon + " " + tab.label);
                })
              )
            ),

            // ── EDM Preset Bar ──
            React.createElement("div", { className: "flex gap-1 mb-3 overflow-x-auto pb-1 bg-gradient-to-r from-slate-900 to-purple-900 rounded-xl p-2 border border-purple-500/30" },
              React.createElement("span", { className: "text-[11px] font-bold text-purple-400 uppercase tracking-wider self-center px-1 shrink-0" }, "PRESETS"),
              EDM_PRESETS.map(function(preset) {
                var isActive = d.activePreset === preset.name;
                return React.createElement("button", { key: preset.id, title: preset.desc,
                  onClick: function() { applyPreset(preset); },
                  className: "shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105' : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white')
                }, preset.icon + ' ' + preset.name);
              }),
              // Engine selector
              React.createElement("div", { className: "shrink-0 ml-auto flex gap-1 items-center border-l border-purple-500/30 pl-2" },
                React.createElement("span", { className: "text-[11px] text-purple-500 font-bold" }, "ENGINE:"),
                [{ id: 'standard', label: '\u223F Wave' }, { id: 'supersaw', label: '\u26A1 Super' }, { id: 'fm', label: '\uD83C\uDF1F FM' }, { id: 'sub', label: '\uD83C\uDF0A Sub' }, { id: 'pad', label: '\u2601 Pad' }, { id: 'plucked', label: '\uD83C\uDFB8 Pluck' }].map(function(eng) {
                  return React.createElement("button", { key: eng.id,
                    onClick: function() { upd('synthEngine', eng.id); upd('activePreset', null); },
                    className: "px-1.5 py-0.5 rounded text-[11px] font-bold transition-all " + ((d.synthEngine || 'standard') === eng.id ? 'bg-purple-500 text-white' : 'text-purple-400 hover:text-white hover:bg-purple-500/30')
                  }, eng.label);
                })
              )
            ),

            // ── Oscilloscope ──
            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-purple-200 bg-[#0f0a1e] mb-3", style: { height: '120px' } },
              React.createElement("canvas", { ref: canvasRef, "data-show-fft": showFFT ? 'true' : 'false', "data-viz-mode": vizMode, "data-note-color": d.lastNoteColor || '#a855f7', style: { width: '100%', height: '100%' } }),
              // Note display
              d.lastNote && React.createElement("div", { className: "absolute top-2 left-2 px-2 py-0.5 bg-black/40 backdrop-blur rounded text-white text-xs font-bold" }, "\u266A " + d.lastNote + (d.lastFreq ? " (" + Math.round(d.lastFreq) + " Hz)" : "")),
              // Viz mode selector
              React.createElement("div", { className: "absolute top-2 right-2 flex gap-1" },
                [{ id: 'waveform', label: '\u223F' }, { id: 'lissajous', label: '\u221E' }, { id: 'helix', label: '\uD83C\uDF00' }].map(function (v) {
                  return React.createElement("button", { "aria-label": "Toggle frequency spectrum",
                    key: v.id,
                    onClick: function () { upd('vizMode', v.id); },
                    className: "w-6 h-6 rounded text-xs flex items-center justify-center transition-all " + (vizMode === v.id ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20')
                  }, v.label);
                }),
                React.createElement("button", { "aria-label": "Toggle frequency spectrum",
                  onClick: function () { upd('showFFT', !showFFT); },
                  className: "w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center transition-all " + (showFFT ? 'bg-green-700 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20')
                }, "FFT")
              )
            ),

            // ── Topic-accent hero band per synth tab ──
            (function() {
              var TAB_META = {
                play:       { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83C\uDFB9', title: 'Play \u2014 piano keys + presets',                 hint: 'Equal temperament: 12 notes per octave, ratio 2^(1/12). A4 = 440 Hz; A5 = 880 Hz. Bach\u2019s Well-Tempered Clavier (1722) sold the world on this compromise. Every note you play here lives on that grid.' },
                scales:     { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83C\uDFB5', title: 'Scales \u2014 the major + minor + modal grammar', hint: 'Major: W-W-H-W-W-W-H. Minor: W-H-W-W-H-W-W. The 7 modes (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian) come from rotating the major-scale interval pattern.' },
                chords:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFB6', title: 'Chords \u2014 stacked thirds + inversions',         hint: 'Triads: root + third + fifth. Major (4+3 semitones), minor (3+4), diminished (3+3), augmented (4+4). 7th chords add another third. Pop music = ~6 chords on repeat; jazz uses extensions and substitutions.' },
                harmonypad: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83C\uDF1F', title: 'Harmony Pad \u2014 voiced pads + drones',          hint: 'Sustained chord textures \u2014 the bed under almost every cinematic score. Try iv-V-i in minor, or i-VI-VII for that Hans Zimmer feel. Drones in fifths underpin Indian classical and bagpipe traditions.' },
                beatpad:    { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83E\uDD41', title: 'Beat Pad \u2014 sample-based drums',                hint: 'Most popular music sits at 4/4, 90-130 BPM. Hip-hop ~85-95, house 120-130, drum-and-bass ~170 (half-time feel). The kick on 1+3, snare on 2+4 = backbeat \u2014 the foundation of rock + pop.' },
                theory:     { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCDA', title: 'Theory \u2014 the math behind the sound',           hint: 'Pythagoras (~500 BCE) discovered consonance from integer frequency ratios: octave 2:1, fifth 3:2, fourth 4:3. Helmholtz extended this in 1862. Sound = compression waves; music = patterns we agree to call beautiful.' }
              };
              var meta = TAB_META[synthTab] || TAB_META.play;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // ═══════════ TAB: PLAY ═══════════
            synthTab === 'play' && React.createElement("div", null,
              // Preset bar
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
                Object.keys(PRESETS).map(function (name) {
                  return React.createElement("button", { "aria-label": "Apply Preset",
                    key: name,
                    onClick: function () { applyInstrumentPreset(name); },
                    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.activePreset === name ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }, (name === 'Plucked' ? '\uD83C\uDFB8' : name === 'Guitar' ? '\uD83C\uDFB8' : name === 'Strings' ? '\uD83C\uDFBB' : name === 'Organ' ? '\u26EA' : name === 'Bass' ? '\uD83C\uDFB8' : name === 'Pad' ? '\u2601\uFE0F' : name === t('stem.periodic.lead') ? '\u26A1' : name === 'Retro' ? '\uD83D\uDC7E' : name === 'Spooky' ? '\uD83D\uDC7B' : '\uD83C\uDFB9') + ' ' + name);
                })
              ),

              // Root & Octave & Scale Lock
              React.createElement("div", { className: "flex gap-2 mb-3 items-center" },
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Root"),
                  React.createElement("select", {
                    'aria-label': 'Root note',
                    value: selectedRoot,
                    onChange: function (e) { upd('selectedRoot', e.target.value); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 border-0 focus:ring-2 focus:ring-purple-400"
                  }, NOTE_NAMES.map(function (n) { return React.createElement("option", { key: n, value: n }, n); }))
                ),
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Oct"),
                  React.createElement("div", { className: "flex gap-0.5" },
                    [3, 4, 5, 6].map(function (o) {
                      return React.createElement("button", { key: o,
                        onClick: function () { upd('octave', o); },
                        className: "w-7 h-7 rounded text-xs font-bold transition-all " + ((d.octave || 4) === o ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, o);
                    })
                  )
                ),
                React.createElement("button", { onClick: function () { upd('scaleLock', !scaleLock); },
                  className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (scaleLock ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-200')
                }, (scaleLock ? '\uD83D\uDD12' : '\uD83D\uDD13') + ' Scale Lock'),
                React.createElement("select", {
                  'aria-label': 'Musical scale',
                  value: selectedScale,
                  onChange: function (e) { upd('selectedScale', e.target.value); },
                  className: "px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 border-0 focus:ring-2 focus:ring-purple-400"
                }, Object.keys(SCALES).map(function (s) { return React.createElement("option", { key: s, value: s }, s); })),
                // Engine toggle
                React.createElement("div", { className: "flex gap-0.5 ml-auto" },
                  [{ id: 'standard', label: '\u223F Synth' }, { id: 'plucked', label: '\uD83C\uDFB8 Plucked' }].map(function (eng) {
                    return React.createElement("button", { "aria-label": eng.label + " engine",
                      key: eng.id,
                      onClick: function () {
                        // Clear all active notes (including extras: vibLFO, FM modulator, SuperSaw voices)
                        Object.keys(window._alloSynthActiveNotes || {}).forEach(function (nid) {
                          stopNote(nid);
                        });
                        upd('synthEngine', eng.id);
                      },
                      className: "px-2 py-1 rounded text-[11px] font-bold transition-all " + (synthEngine === eng.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                    }, eng.label);
                  })
                )
              ),

              // ── Piano Keyboard ──
              React.createElement("div", { className: "relative mb-3", style: { height: '140px' } },
                React.createElement("div", { className: "flex h-full relative" },
                  KEYS.map(function (key, idx) {
                    var isActive = (d.activeKeys || []).indexOf(key.note + key.octave) !== -1;
                    var isBlack = key.isBlack;
                    var isScaleNote = isInScale(key.semitone);
                    var isRoot = key.semitone === 0;
                    var dimmed = scaleLock && !isScaleNote;
                    if (isBlack) {
                      return React.createElement("div", {
                        key: idx,
                        onMouseDown: function (e) {
                          e.preventDefault();
                          var noteId = key.note + key.octave;
                          if (dimmed) return;
                          if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                          else { playNote(key.freq, noteId); }
                          upd('activeKeys', (d.activeKeys || []).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq); upd('lastNoteColor', key.color || '#a855f7');
                        },
                        onMouseUp: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                        onMouseLeave: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                        className: "absolute z-10 rounded-b-md select-none flex flex-col items-center justify-end pb-1 transition-all cursor-pointer " + (isActive ? 'bg-purple-600 shadow-lg shadow-purple-500/50' : dimmed ? 'bg-slate-700 opacity-30' : 'bg-slate-800 hover:bg-slate-700'),
                        style: { width: '5.5%', height: '85px', left: (key.position * (100 / 14) + (100 / 14) * 0.65) + '%', top: 0 }
                      },
                        React.createElement("span", { className: "text-[11px] text-white/60 font-bold" }, key.note)
                      );
                    }
                    return React.createElement("div", {
                      key: idx,
                      onMouseDown: function (e) {
                        e.preventDefault();
                        var noteId = key.note + key.octave;
                        if (dimmed) return;
                        if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                        else { playNote(key.freq, noteId); }
                        upd('activeKeys', (d.activeKeys || []).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq); upd('lastNoteColor', key.color || '#a855f7');
                      },
                      onMouseUp: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                      onMouseLeave: function () { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', (d.activeKeys || []).filter(function (x) { return x !== noteId; })); },
                      className: "flex-1 rounded-b-lg select-none flex flex-col items-center justify-end pb-2 border transition-all cursor-pointer " + (isActive ? 'bg-purple-100 border-purple-400 shadow-lg shadow-purple-300/50' : dimmed ? 'bg-slate-50 border-slate-200 opacity-30' : 'bg-white border-slate-200 hover:bg-purple-50'),
                      style: { minWidth: '36px' }
                    },
                      isScaleNote && React.createElement("div", { className: "w-2 h-2 rounded-full mb-1 " + (isRoot ? 'bg-purple-600' : 'bg-purple-300') }),
                      React.createElement("span", { className: "text-[11px] font-bold " + (isActive ? 'text-purple-700' : 'text-slate-200') }, key.note),
                      React.createElement("span", { className: "text-[11px] text-slate-200" }, KEYBOARD_MAP && Object.keys(KEYBOARD_MAP).find(function (k) { return KEYBOARD_MAP[k] === key.semitone + (key.octave - (d.octave || 4)) * 12; }) || '')
                    );
                  })
                )
              ),

              // ── Chord Buttons ──
              React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Chords"),
                  React.createElement("select", {
                    'aria-label': 'Chord root note',
                    value: chordRoot,
                    onChange: function (e) { upd('chordRoot', e.target.value); },
                    className: "px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 border-0"
                  }, NOTE_NAMES.map(function (n) { return React.createElement("option", { key: n, value: n }, n); })),
                  React.createElement("div", { className: "flex gap-0.5" },
                    [0, 1, 2].map(function (inv) {
                      return React.createElement("button", { key: inv,
                        onClick: function () { upd('chordInversion', inv); },
                        className: "px-1.5 py-0.5 rounded text-[11px] font-bold " + (chordInversion === inv ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-200')
                      }, inv === 0 ? 'Root' : inv === 1 ? '1st Inv' : '2nd Inv');
                    })
                  ),
                  React.createElement("button", { "aria-label": "Jazz Mode",
                    onClick: function () { upd('jazzMode', !jazzMode); },
                    className: "px-2 py-0.5 rounded text-[11px] font-bold ml-auto " + (jazzMode ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-200')
                  }, "\uD83C\uDFB7 Jazz Mode")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1" },
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6'] : ['Major', 'Minor', 'Diminished', 'Augmented', 'Sus2', 'Sus4', t('stem.circuit.power'), 'Dom7', 'Maj7', 'Min7']).map(function (chType) {
                    var chord = CHORDS[chType]; if (!chord) return null;
                    return React.createElement("button", { key: chType,
                      onClick: function () { upd('selectedChord', chType); playChord(chordRoot, chType, chordInversion); },
                      className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (selectedChord === chType ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600')
                    }, chordRoot + chord.symbol);
                  })
                ),
                // Chord info badge
                selectedChord && CHORDS[selectedChord] && React.createElement("div", { className: "mt-1 px-2.5 py-1 bg-purple-50 rounded-lg text-[11px] text-purple-700" },
                  React.createElement("span", { className: "font-bold" }, chordRoot + CHORDS[selectedChord].symbol + ": "),
                  React.createElement("span", null, CHORDS[selectedChord].intervals.map(function (i) { return NOTE_NAMES[(NOTE_NAMES.indexOf(chordRoot) + i) % 12]; }).join(' \u2022 ')),
                  React.createElement("span", { className: "ml-2 text-purple-400 italic" }, CHORDS[selectedChord].desc || '')
                )
              ),

              // ── Strum Harp (moved to HarmonyPad tab — this is now a link) ──
              React.createElement("div", { className: "mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-lg" }, "\uD83C\uDFB8"),
                  React.createElement("div", null,
                    React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "Strum & Chord Pad"),
                    React.createElement("p", { className: "text-[11px] text-amber-600" }, "Full chord grid, strum plate, and voice presets")
                  )
                ),
                React.createElement("button", { onClick: function() { upd('synthTab', 'harmonypad'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-sm" }, "\uD83C\uDF1F Open HarmonyPad \u2192")
              ),
              false && React.createElement("div", { className: "REMOVED" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFB8 Strum Harp"),
                  React.createElement("span", { className: "text-[11px] text-amber-600" }, "Drag across strings to strum!")
                ),
                React.createElement("div", { className: "flex justify-center gap-1", style: { height: '100px' } },
                  (function () {
                    var chordData = CHORDS[selectedChord]; if (!chordData) return [];
                    var ri = NOTE_NAMES.indexOf(chordRoot);
                    return chordData.intervals.map(function (intv, si) {
                      var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                      var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
                      var noteN = NOTE_NAMES[nIdx];
                      var stringActive = (d.strumStrings || []).indexOf(si) !== -1;
                      return React.createElement("div", {
                        key: si,
                        onMouseEnter: function (e) {
                          if (e.buttons > 0) {
                            if (synthEngine === 'plucked') playPlucked(freq, 'strum_' + si, d.ksBrightness, d.ksDamping);
                            else playNoteFor(freq, 'strum_' + si, 600);
                            upd('strumStrings', (d.strumStrings || []).concat([si]));
                            setTimeout(function () { upd('strumStrings', (d.strumStrings || []).filter(function (x) { return x !== si; })); }, 300);
                          }
                        },
                        onMouseDown: function (e) {
                          e.preventDefault();
                          if (synthEngine === 'plucked') playPlucked(freq, 'strum_' + si, d.ksBrightness, d.ksDamping);
                          else playNoteFor(freq, 'strum_' + si, 600);
                          upd('strumStrings', (d.strumStrings || []).concat([si]));
                          setTimeout(function () { upd('strumStrings', (d.strumStrings || []).filter(function (x) { return x !== si; })); }, 300);
                        },
                        className: "flex flex-col items-center justify-between cursor-pointer select-none group",
                        style: { width: '24px' }
                      },
                        React.createElement("span", { className: "text-[11px] font-bold text-amber-600" }, noteN),
                        React.createElement("div", {
                          className: "flex-1 w-[3px] rounded-full transition-all duration-150 " + (stringActive ? 'bg-amber-400 shadow-lg shadow-amber-400/50 scale-x-150' : 'bg-amber-300 group-hover:bg-amber-400'),
                          style: stringActive ? { animation: 'pulse 0.15s ease-in-out 3' } : {}
                        }),
                        React.createElement("span", { className: "text-[11px] text-amber-400" }, (d.octave || 4) + Math.floor((ri + intv) / 12))
                      );
                    });
                  })()
                )
              ),

              // ── Engine-Specific Controls ──
              (d.synthEngine === 'fm') && React.createElement("div", { className: "mb-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "\uD83C\uDF1F FM Synthesis Controls"),
                  React.createElement(Tip, { id: 'fm', title: 'FM Synthesis', text: 'Frequency Modulation (FM) synthesis uses one oscillator (modulator) to rapidly change the frequency of another (carrier). The modulator:carrier ratio determines the harmonic content. Simple ratios (1:1, 2:1, 3:1) produce harmonic tones. Complex ratios produce metallic, bell-like, or inharmonic sounds. FM was popularized by the Yamaha DX7 in 1983.' })
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[11px] font-bold text-amber-700" }, "Mod Ratio: " + (d.fmRatio || 2) + ":1"),
                    React.createElement("input", { type: "range", min: "0.5", max: "8", step: "0.5", value: d.fmRatio || 2, onChange: function(e) { upd('fmRatio', parseFloat(e.target.value)); }, className: "w-full accent-amber-600" }),
                    React.createElement("div", { className: "flex justify-between text-[11px] text-amber-500" }, React.createElement("span", null, "Sub-harmonic"), React.createElement("span", null, "Bright"))
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[11px] font-bold text-amber-700" }, "Mod Depth: " + (d.fmDepth || 1.5)),
                    React.createElement("input", { type: "range", min: "0", max: "10", step: "0.1", value: d.fmDepth || 1.5, onChange: function(e) { upd('fmDepth', parseFloat(e.target.value)); }, className: "w-full accent-amber-600" }),
                    React.createElement("div", { className: "flex justify-between text-[11px] text-amber-500" }, React.createElement("span", null, "Pure"), React.createElement("span", null, "Metallic"))
                  )
                )
              ),
              (d.synthEngine === 'supersaw') && React.createElement("div", { className: "mb-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, "\u26A1 SuperSaw Controls"),
                  React.createElement(Tip, { id: 'supersaw', title: 'SuperSaw / Unison', text: 'SuperSaw stacks multiple sawtooth oscillators slightly detuned from each other. This creates a huge, wide, shimmering sound — the signature of EDM, trance, and modern pop. More voices = thicker sound but uses more CPU. Detuning controls how far apart the voices are tuned — more detune = wider/more chorus-like, less = tighter/more focused.' })
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[11px] font-bold text-indigo-700" }, "Voices: " + (d.superVoices || 5)),
                    React.createElement("input", { type: "range", min: "2", max: "9", step: "1", value: d.superVoices || 5, onChange: function(e) { upd('superVoices', parseInt(e.target.value)); }, className: "w-full accent-indigo-600" }),
                    React.createElement("div", { className: "flex justify-between text-[11px] text-indigo-500" }, React.createElement("span", null, "Thin (2)"), React.createElement("span", null, "Massive (9)"))
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[11px] font-bold text-indigo-700" }, "Detune: " + (d.superDetune || 15) + " cents"),
                    React.createElement("input", { type: "range", min: "2", max: "50", step: "1", value: d.superDetune || 15, onChange: function(e) { upd('superDetune', parseInt(e.target.value)); }, className: "w-full accent-indigo-600" }),
                    React.createElement("div", { className: "flex justify-between text-[11px] text-indigo-500" }, React.createElement("span", null, "Tight"), React.createElement("span", null, "Wide"))
                  )
                )
              ),

              // ── ADSR & Effects Controls ──
              React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                // ADSR - always visible
                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83D\uDCC8 ADSR Envelope"),
                    React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.adsr.text }, "\u2753")
                  ),
                  // ADSR visual
                  React.createElement("svg", { viewBox: "0 0 200 60", className: "w-full mb-2", style: { maxHeight: '50px' } },
                    React.createElement("rect", { width: 200, height: 60, fill: "transparent" }),
                    (function () {
                      var a = d.attack || 0.01, dec = d.decay || 0.1, s = d.sustain || 0.7, r = d.release || 0.3;
                      var aX = Math.min(a * 200, 50), dX = aX + Math.min(dec * 100, 40), sX = 140, rX = sX + Math.min(r * 60, 50);
                      var sY = 60 - s * 55;
                      return React.createElement("polyline", {
                        points: "0,60 " + aX + ",5 " + dX + "," + sY + " " + sX + "," + sY + " " + rX + ",60",
                        fill: "none", stroke: "#7c3aed", strokeWidth: 2.5, strokeLinejoin: "round"
                      });
                    })(),
                    React.createElement("text", { x: 5, y: 58, className: "text-[11px] fill-slate-400" }, "A"),
                    React.createElement("text", { x: 55, y: 58, className: "text-[11px] fill-slate-400" }, "D"),
                    React.createElement("text", { x: 110, y: 58, className: "text-[11px] fill-slate-400" }, "S"),
                    React.createElement("text", { x: 165, y: 58, className: "text-[11px] fill-slate-400" }, "R")
                  ),
                  [{ k: 'attack', label: t('stem.synth.attack'), min: 0.001, max: 2, step: 0.01, unit: 's' },
                  { k: 'decay', label: t('stem.synth.decay'), min: 0.01, max: 1, step: 0.01, unit: 's' },
                  { k: 'sustain', label: t('stem.synth.sustain'), min: 0, max: 1, step: 0.01, unit: '' },
                  { k: 'release', label: t('stem.synth.release'), min: 0.01, max: 3, step: 0.01, unit: 's' }].map(function (param) {
                    return React.createElement("div", { key: param.k, className: "flex items-center gap-2 mb-0.5" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600 w-12" }, param.label),
                      React.createElement("input", { type: "range", min: param.min, max: param.max, step: param.step, value: d[param.k] || param.min, onChange: function (e) { upd(param.k, parseFloat(e.target.value)); }, className: "flex-1 accent-purple-600 h-1.5" }),
                      React.createElement("span", { className: "text-[11px] text-slate-600 w-10 text-right" }, (d[param.k] || param.min).toFixed(2) + param.unit)
                    );
                  })
                ),

                // Effects panel
                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700 block mb-2" }, "\u2699\uFE0F Effects"),
                  // Waveform selector (for standard engine)
                  synthEngine === 'standard' && React.createElement("div", { className: "flex gap-1 mb-2" },
                    ['sine', 'square', 'sawtooth', 'triangle'].map(function (w) {
                      var wi = WAVE_INFO[w];
                      return React.createElement("button", { key: w,
                        onClick: function () { upd('waveType', w); },
                        className: "flex-1 py-1 rounded-lg text-[11px] font-bold text-center transition-all " + ((d.waveType || 'sine') === w ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-purple-50'),
                        title: wi.desc
                      }, wi.emoji + " " + w);
                    })
                  ),
                  // Plucked engine controls
                  synthEngine === 'plucked' && React.createElement("div", { className: "space-y-1 mb-2" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, "\uD83C\uDFB8 Karplus-Strong"),
                      React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.karplusStrong.text }, "\u2753")
                    ),
                    [{ k: 'ksBrightness', label: t('stem.synth.brightness'), min: 0.1, max: 1, step: 0.01 },
                    { k: 'ksDamping', label: t('stem.synth.damping'), min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 w-16" }, p.label),
                        React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-amber-500 h-1.5" }),
                        React.createElement("span", { className: "text-[11px] text-slate-600 w-10 text-right" }, (d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996)).toFixed(p.k === 'ksDamping' ? 4 : 2))
                      );
                    })
                  ),
                  // Volume + Reverb
                  [{ k: 'volume', label: '\uD83D\uDD0A Volume', min: 0, max: 1, step: 0.01 },
                  { k: 'reverbMix', label: '\uD83C\uDFDB Reverb', min: 0, max: 1, step: 0.01 }].map(function (p) {
                    return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600 w-16" }, p.label),
                      React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-purple-600 h-1.5" }),
                      React.createElement("span", { className: "text-[11px] text-slate-600 w-8 text-right" }, ((d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0)) * 100).toFixed(0) + '%')
                    );
                  }),
                  // Filter
                  React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "\uD83C\uDF0A Filter"),
                      React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.filter.text }, "\u2753"),
                      React.createElement("select", {
                        'aria-label': 'Filter type',
                        value: d.filterType || 'lowpass',
                        onChange: function (e) { upd('filterType', e.target.value); },
                        className: "ml-auto px-1.5 py-0.5 rounded text-[11px] font-bold bg-white border"
                      }, ['lowpass', 'highpass', 'bandpass'].map(function (ft) { return React.createElement("option", { key: ft, value: ft }, ft); }))
                    ),
                    [{ k: 'filterCutoff', label: t('stem.synth.cutoff'), min: 100, max: 12000, step: 50, fmt: function (v) { return (v || 8000) > 1000 ? ((v || 8000) / 1000).toFixed(1) + 'k' : Math.round(v || 8000) + ''; } },
                    { k: 'filterQ', label: 'Q', min: 0.1, max: 20, step: 0.1, fmt: function (v) { return (v || 1).toFixed(1); } }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 w-10" }, p.label),
                        React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'filterCutoff' ? 8000 : 1), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-cyan-500 h-1.5" }),
                        React.createElement("span", { className: "text-[11px] text-slate-600 w-10 text-right" }, p.fmt(d[p.k]))
                      );
                    })
                  ),
                  // Tremolo & Vibrato
                  React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "\u2728 Modulation"),
                      React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.tremolo.text }, "\u2753")
                    ),
                    [{ k: 'tremoloDepth', label: t('stem.synth.trem_dep'), min: 0, max: 1, step: 0.01 },
                    { k: 'tremoloRate', label: t('stem.synth.trem_rate'), min: 0.5, max: 20, step: 0.5 },
                    { k: 'vibratoDepth', label: t('stem.synth.vib_dep'), min: 0, max: 1, step: 0.01 },
                    { k: 'vibratoRate', label: t('stem.synth.vib_rate'), min: 0.5, max: 12, step: 0.5 }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 w-14" }, p.label),
                        React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || 0, onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-pink-500 h-1.5" }),
                        React.createElement("span", { className: "text-[11px] text-slate-600 w-8 text-right" }, (d[p.k] || 0).toFixed(1))
                      );
                    })
                  )
                )
              ),

              // ── Progression player ──
              React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3 mb-3" },
                React.createElement("span", { className: "text-xs font-bold text-slate-700 block mb-2" }, "\uD83C\uDFB6 Chord Progressions"),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  PROGRESSIONS.map(function (prog) {
                    return React.createElement("button", { "aria-label": "Play Progression",
                      key: prog.name,
                      onClick: function () { playProgression(prog); },
                      className: "text-left px-2.5 py-2 rounded-lg bg-white border border-slate-400 hover:border-purple-600 hover:bg-purple-50 transition-all group"
                    },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-700 group-hover:text-purple-700 block" }, prog.name),
                      React.createElement("span", { className: "text-[11px] text-slate-200" }, prog.desc)
                    );
                  })
                )
              ),

              // ── Arpeggiator ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "\uD83C\uDF00 Arpeggiator"),
                  React.createElement("span", { className: "text-[11px] text-indigo-400 cursor-help", title: EFFECT_TIPS.arpeggiator.text }, "\u2753"),
                  React.createElement("button", { "aria-label": "Pattern",
                    onClick: function () { if (arpOn) stopArpeggiator(); else startArpeggiator(); },
                    className: "ml-auto px-3 py-1 rounded-lg text-xs font-bold " + (arpOn ? 'bg-red-700 text-white' : 'bg-indigo-600 text-white')
                  }, arpOn ? '\u23F9 Stop' : '\u25B6 Start')
                ),
                React.createElement("div", { className: "flex flex-wrap gap-2 items-center" },
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "Pattern"),
                  ['up', 'down', 'updown', 'random'].map(function (pat) {
                    return React.createElement("button", { "aria-label": pat + " pattern",
                      key: pat,
                      onClick: function () { upd('arpPattern', pat); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                      className: "px-2 py-0.5 rounded text-[11px] font-bold capitalize " + (arpPattern === pat ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600')
                    }, pat);
                  }),
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 ml-2" }, "Oct"),
                  [1, 2, 3, 4].map(function (oc) {
                    return React.createElement("button", { "aria-label": oc + " octave range",
                      key: oc,
                      onClick: function () { upd('arpOctaves', oc); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                      className: "w-6 h-6 rounded text-[11px] font-bold " + ((d.arpOctaves || 1) === oc ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600')
                    }, oc);
                  }),
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 ml-2" }, "Rate"),
                  React.createElement("input", { type: "range", min: "50", max: "500", step: "10", value: d.arpRate || 150,
                    onChange: function(e) { upd('arpRate', parseInt(e.target.value)); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                    className: "w-16 accent-indigo-600", title: (d.arpRate || 150) + 'ms'
                  }),
                  React.createElement("span", { className: "text-[11px] font-mono text-indigo-500 w-10" }, (d.arpRate || 150) + 'ms'),
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 ml-1" }, "Gate"),
                  React.createElement("input", { type: "range", min: "10", max: "100", step: "5", value: d.arpGate || 80,
                    onChange: function(e) { upd('arpGate', parseInt(e.target.value)); },
                    className: "w-12 accent-indigo-600", title: 'Gate: ' + (d.arpGate || 80) + '%'
                  }),
                  React.createElement("span", { className: "text-[11px] font-mono text-indigo-500 w-8" }, (d.arpGate || 80) + '%')
                ),
                // Arpeggiator science
                React.createElement("div", { className: "mt-2 bg-indigo-100/50 rounded-lg p-2" },
                  React.createElement("p", { className: "text-[11px] text-indigo-600 leading-relaxed" },
                    "\uD83D\uDD2C An arpeggiator plays the notes of a chord one at a time in sequence. \"Up\" goes low to high, creating ascending energy. \"Down\" descends for a cascading feel. Rate controls speed (lower = faster). Gate controls how long each note rings (100% = legato, 10% = staccato). Try rate=100ms + 4 octaves + up pattern for a classic trance arp!"
                  )
                )
              )
            ),

            // ── Live Mic Effects Lab ──
            synthTab === 'play' && React.createElement("div", { className: "bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 rounded-xl border border-rose-200 p-3 mb-3" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-rose-800" }, "\uD83C\uDFA4 Live Mic Effects Lab"),
                React.createElement("span", { className: "text-[11px] text-rose-500" }, "Sing, speak, or play an instrument \u2014 hear effects in real-time!"),
                React.createElement("button", {
                  onClick: function() {
                    if (d.micActive) {
                      // Stop mic
                      if (window._alloMicStream) { window._alloMicStream.getTracks().forEach(function(t) { t.stop(); }); window._alloMicStream = null; }
                      if (window._alloMicSource) { window._alloMicSource.disconnect(); window._alloMicSource = null; }
                      upd('micActive', false);
                    } else {
                      // Start mic
                      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function(stream) {
                        window._alloMicStream = stream;
                        var audio = getCtx();
                        var source = audio.ctx.createMediaStreamSource(stream);
                        // Create separate analyser for mic visualization
                        var micAnalyser = audio.ctx.createAnalyser(); micAnalyser.fftSize = 2048;
                        window._alloMicAnalyser = micAnalyser;
                        // Route: mic -> effects chain -> analyser (NOT to speakers to avoid feedback)
                        // Create a separate gain for mic monitoring
                        var micGain = audio.ctx.createGain();
                        micGain.gain.value = d.micMonitor ? (d.micVolume || 0.5) : 0;
                        window._alloMicGain = micGain;
                        source.connect(audio.effects.filter); // Through the effects chain
                        source.connect(micAnalyser); // Also to analyser for visualization
                        window._alloMicSource = source;
                        upd('micActive', true);
                        addToast('\uD83C\uDFA4 Mic connected! Apply effects with the controls above.', 'success');
                      }).catch(function(err) {
                        addToast('\u274C Mic access denied: ' + err.message, 'error');
                      });
                    }
                  },
                  className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm " + (d.micActive ? 'bg-red-600 text-white animate-pulse' : 'bg-rose-600 text-white hover:bg-rose-700')
                }, d.micActive ? '\u23F9 Stop Mic' : '\uD83C\uDFA4 Start Mic')
              ),

              d.micActive && React.createElement("div", { className: "space-y-3" },
                // Live waveform visualization
                React.createElement("div", { className: "rounded-xl overflow-hidden border border-rose-200", style: { height: '100px' } },
                  React.createElement("canvas", {
                    style: { width: '100%', height: '100%', display: 'block', background: '#1a0a1e' },
                    ref: function(canvas) {
                      if (!canvas || canvas._micVizInit) return;
                      canvas._micVizInit = true;
                      var ctx2 = canvas.getContext('2d');
                      var W = canvas.width = canvas.offsetWidth * 2;
                      var H = canvas.height = 200;
                      function drawMicViz() {
                        if (!window._alloMicAnalyser) { canvas._micVizInit = false; return; }
                        requestAnimationFrame(drawMicViz);
                        var analyser = window._alloMicAnalyser;
                        var bufLen = analyser.frequencyBinCount;
                        var timeData = new Uint8Array(bufLen);
                        var freqData = new Uint8Array(bufLen);
                        analyser.getByteTimeDomainData(timeData);
                        analyser.getByteFrequencyData(freqData);
                        // Background
                        ctx2.fillStyle = 'rgba(26,10,30,0.3)'; ctx2.fillRect(0, 0, W, H);
                        // Frequency spectrum (bottom half)
                        var barW = W / 64;
                        for (var bi = 0; bi < 64; bi++) {
                          var val = freqData[bi * 2] / 255;
                          var barH = val * H * 0.45;
                          var hue = bi * 4;
                          ctx2.fillStyle = 'hsla(' + hue + ',80%,60%,' + (0.4 + val * 0.4) + ')';
                          ctx2.fillRect(bi * barW, H - barH, barW - 1, barH);
                        }
                        // Waveform (top half)
                        ctx2.strokeStyle = '#f43f5e'; ctx2.lineWidth = 2;
                        ctx2.beginPath();
                        var sliceW = W / bufLen;
                        for (var wi = 0; wi < bufLen; wi++) {
                          var v = timeData[wi] / 128.0;
                          var y = v * H / 4 + H * 0.15;
                          if (wi === 0) ctx2.moveTo(0, y); else ctx2.lineTo(wi * sliceW, y);
                        }
                        ctx2.stroke();
                        // Peak meter
                        var peak = 0; for (var pi = 0; pi < bufLen; pi++) { var pv = Math.abs(timeData[pi] - 128); if (pv > peak) peak = pv; }
                        var peakPct = peak / 128;
                        ctx2.fillStyle = peakPct > 0.8 ? '#ef4444' : peakPct > 0.5 ? '#f59e0b' : '#4ade80';
                        ctx2.fillRect(W - 8, H * (1 - peakPct), 6, H * peakPct);
                        // Labels
                        ctx2.fillStyle = 'rgba(255,255,255,0.3)'; ctx2.font = '10px system-ui';
                        ctx2.fillText('WAVEFORM', 4, 12);
                        ctx2.fillText('SPECTRUM', 4, H - 4);
                        ctx2.fillText(Math.round(peakPct * 100) + '%', W - 30, 12);
                      }
                      drawMicViz();
                    }
                  })
                ),

                // Monitor toggle + volume
                React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },
                  React.createElement("label", { className: "flex items-center gap-1 text-[11px] font-bold text-rose-700 cursor-pointer" },
                    React.createElement("input", { type: "checkbox", checked: !!d.micMonitor,
                      onChange: function() {
                        var newVal = !d.micMonitor; upd('micMonitor', newVal);
                        if (window._alloMicGain) window._alloMicGain.gain.value = newVal ? (d.micVolume || 0.5) : 0;
                      }, className: "rounded"
                    }),
                    "\uD83D\uDD0A Monitor (hear yourself \u2014 use headphones!)"
                  ),
                  d.micMonitor && React.createElement("div", { className: "flex items-center gap-1" },
                    React.createElement("span", { className: "text-[11px] text-rose-500" }, "Vol"),
                    React.createElement("input", { type: "range", min: "0", max: "1", step: "0.05", value: d.micVolume || 0.5,
                      onChange: function(e) { var v = parseFloat(e.target.value); upd('micVolume', v); if (window._alloMicGain) window._alloMicGain.gain.value = v; },
                      className: "w-16 accent-rose-600"
                    })
                  )
                ),

                // Effect explanation cards
                React.createElement("div", { className: "bg-white/60 rounded-lg p-3 border border-rose-100" },
                  React.createElement("div", { className: "text-[11px] font-bold text-rose-700 mb-2" }, "\uD83D\uDD2C How Effects Change Sound Waves"),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2" },
                    [
                      { name: 'Filter (Cutoff)', param: 'filterCutoff', icon: '\uD83C\uDF0A', wave: '\u223F\u223F\u223F\u2192\u223F',
                        desc: 'Removes frequencies above (lowpass) or below (highpass) a threshold. Like cupping your hand over your mouth \u2014 it removes high frequencies, making sound "darker."',
                        science: 'A lowpass filter at 1000Hz removes all harmonics above 1kHz. This is why muffled sounds lack "brightness" \u2014 the high-frequency overtones are gone.' },
                      { name: 'Delay', param: 'delayMix', icon: '\uD83D\uDD04', wave: '\u223F..\u223F..\u223F',
                        desc: 'Creates echoes by copying the signal and playing it back after a short time. Feedback controls how many echoes repeat.',
                        science: 'Sound travels at ~343 m/s. A 300ms delay simulates a reflection from a wall ~51 meters away (sound travels there and back).' },
                      { name: 'Reverb', param: 'reverbMix', icon: '\uD83C\uDFDB\uFE0F', wave: '\u223F\u2248\u2248\u2248\u2248',
                        desc: 'Simulates room acoustics by creating thousands of tiny echoes that blend together. Small room = short reverb, cathedral = long reverb.',
                        science: 'Reverb is mathematically modeled as a convolution with an "impulse response" \u2014 a recording of a single clap in a real room.' },
                      { name: 'Distortion', param: 'distAmount', icon: '\u26A1', wave: '\u223F\u2192\u2293',
                        desc: 'Clips the waveform peaks, turning smooth sine waves into harsh, angular shapes. This adds new harmonics that weren\'t in the original sound.',
                        science: 'Clipping a sine wave creates odd harmonics (3rd, 5th, 7th...). This is why distorted guitar sounds "thick" \u2014 it\'s mathematically richer.' },
                      { name: 'Chorus', param: 'chorusMix', icon: '\u2728', wave: '\u223F+\u223F\u2248\u223F',
                        desc: 'Duplicates the signal with a slight, continuously varying delay. This simulates multiple voices/instruments playing together slightly out of time.',
                        science: 'A chorus uses an LFO (Low Frequency Oscillator) to modulate a delay line between 20-30ms. Our ears hear this as "width" because it mimics natural ensemble playing.' },
                      { name: 'Tremolo', param: 'tremoloDepth', icon: '\uD83D\uDCA0', wave: '\u223F\u21C5\u223F\u21C5',
                        desc: 'Rapidly varies the volume up and down, creating a pulsating effect. Common in surf guitar and organ music.',
                        science: 'Tremolo modulates amplitude (volume), while vibrato modulates frequency (pitch). Many people confuse them! Tremolo rate is typically 4-8 Hz.' },
                    ].map(function(effect) {
                      return React.createElement("div", { key: effect.name,
                        className: "bg-white rounded-lg p-2 border border-rose-100 hover:border-rose-300 transition-colors cursor-default"
                      },
                        React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                          React.createElement("span", { className: "text-sm" }, effect.icon),
                          React.createElement("span", { className: "text-[11px] font-bold text-rose-800" }, effect.name)
                        ),
                        React.createElement("div", { className: "text-[12px] font-mono text-rose-400 mb-1 tracking-widest" }, effect.wave),
                        React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed mb-1" }, effect.desc),
                        React.createElement("p", { className: "text-[11px] text-rose-500 italic leading-relaxed" }, '\uD83D\uDD2C ' + effect.science)
                      );
                    })
                  )
                ),

                // Safety note
                React.createElement("div", { className: "flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200" },
                  React.createElement("span", { className: "text-sm" }, "\u26A0\uFE0F"),
                  React.createElement("p", { className: "text-[11px] text-amber-700" }, "Use headphones when monitoring to avoid feedback loops! The mic routes through all the effects above (filter, delay, reverb, etc.) \u2014 adjust them to hear how each one transforms your voice or instrument.")
                )
              ),

              // Mic inactive — educational preview
              !d.micActive && React.createElement("div", { className: "text-center py-3" },
                React.createElement("p", { className: "text-[11px] text-rose-400 mb-2" }, "Connect your microphone to run your voice or instrument through the effects chain in real-time."),
                React.createElement("p", { className: "text-[11px] text-rose-300 italic" }, "See your voice as a waveform + frequency spectrum. Hear how filter, delay, reverb, distortion, and chorus physically change sound waves.")
              )
            ),

            // ── XY Performance Pad ──
            synthTab === 'play' && React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-xl border border-indigo-500/30 p-3 mb-3" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-300" }, "\uD83C\uDFAF XY Performance Pad"),
                React.createElement("span", { className: "text-[11px] text-indigo-400" }, "Touch & drag \u2014 X = pitch, Y = filter/effect"),
                React.createElement(Tip, { id: 'xypad', title: 'XY Pad Performance', text: 'The XY pad maps your finger/mouse position to musical parameters in real-time. The X axis controls pitch (left = low, right = high). The Y axis controls the filter cutoff frequency (top = bright, bottom = dark). This is similar to instruments like the Korg Kaoss Pad, which revolutionized live electronic music performance by turning 2D gestures into sound.' })
              ),
              React.createElement("div", {
                style: { position: 'relative', width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', cursor: 'crosshair', touchAction: 'none' },
                className: "border-2 border-indigo-500/40",
                onMouseDown: function(e) { upd('xyActive', true); handleXY(e); },
                onMouseMove: function(e) { if (d.xyActive || e.buttons > 0) handleXY(e); },
                onMouseUp: function() { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); },
                onMouseLeave: function() { if (d.xyActive) { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); } },
                onTouchStart: function(e) { e.preventDefault(); upd('xyActive', true); handleXYTouch(e); },
                onTouchMove: function(e) { e.preventDefault(); handleXYTouch(e); },
                onTouchEnd: function() { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); }
              },
                // Background gradient (represents pitch low→high + filter dark→bright)
                React.createElement("div", { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, #1e1b4b, #4338ca, #7c3aed, #c026d3, #f43f5e)', opacity: 0.3 } }),
                React.createElement("div", { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(255,255,255,0.1))' } }),
                // Grid lines
                Array.from({ length: 7 }, function(_, i) {
                  var x = (i + 1) / 8 * 100;
                  return React.createElement("div", { key: 'vl' + i, style: { position: 'absolute', left: x + '%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' } });
                }),
                Array.from({ length: 3 }, function(_, i) {
                  var y = (i + 1) / 4 * 100;
                  return React.createElement("div", { key: 'hl' + i, style: { position: 'absolute', top: y + '%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.08)' } });
                }),
                // Axis labels
                React.createElement("div", { style: { position: 'absolute', bottom: '4px', left: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 700 } }, '\u2190 LOW'),
                React.createElement("div", { style: { position: 'absolute', bottom: '4px', right: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 700 } }, 'HIGH \u2192'),
                React.createElement("div", { style: { position: 'absolute', top: '4px', left: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 700 } }, '\u2191 BRIGHT'),
                React.createElement("div", { style: { position: 'absolute', bottom: '18px', left: '8px', color: 'rgba(255,255,255,0.2)', fontSize: '9px', fontWeight: 700 } }, '\u2193 DARK'),
                // Touch point indicator
                (d.xyX !== null && d.xyX !== undefined) && React.createElement("div", { style: {
                  position: 'absolute', left: d.xyX + '%', top: d.xyY + '%', transform: 'translate(-50%,-50%)',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(168,85,247,0.8), rgba(168,85,247,0))',
                  border: '2px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(168,85,247,0.2)',
                  transition: 'none', pointerEvents: 'none'
                } }),
                // Trail dots
                (d.xyTrail || []).map(function(pt, i) {
                  return React.createElement("div", { key: i, style: {
                    position: 'absolute', left: pt.x + '%', top: pt.y + '%', transform: 'translate(-50%,-50%)',
                    width: (4 + i * 0.5) + 'px', height: (4 + i * 0.5) + 'px', borderRadius: '50%',
                    background: 'rgba(168,85,247,' + (0.1 + i * 0.03) + ')', pointerEvents: 'none'
                  } });
                }),
                // Note name display
                d.xyNoteName && React.createElement("div", { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '24px', fontWeight: 900, pointerEvents: 'none', textShadow: '0 0 20px rgba(168,85,247,0.8)' } }, d.xyNoteName)
              ),
              // XY Mode selector
              React.createElement("div", { className: "flex gap-2 mt-2 items-center" },
                React.createElement("span", { className: "text-[11px] font-bold text-indigo-400" }, "Y-Axis:"),
                ['filter', 'volume', 'vibrato', 'reverb'].map(function(mode) {
                  return React.createElement("button", { key: mode,
                    onClick: function() { upd('xyMode', mode); },
                    className: "px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-all " + ((d.xyMode || 'filter') === mode ? 'bg-indigo-600 text-white' : 'bg-white/10 text-indigo-300 hover:bg-white/20')
                  }, mode);
                }),
                React.createElement("span", { className: "text-[11px] font-bold text-indigo-400 ml-auto" }, "Scale:"),
                React.createElement("select", { value: d.xyScale || 'chromatic',
                  onChange: function(e) { upd('xyScale', e.target.value); },
                  className: "px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-indigo-300 border border-indigo-500/30"
                },
                  React.createElement("option", { value: 'chromatic' }, "Chromatic"),
                  React.createElement("option", { value: 'major' }, "Major"),
                  React.createElement("option", { value: 'minor' }, "Minor"),
                  React.createElement("option", { value: 'pentatonic' }, "Pentatonic"),
                  React.createElement("option", { value: 'blues' }, "Blues")
                )
              )
            ),

            // ═══════════ COMPOSE — redirect to Production Studio ═══════════
            synthTab === 'play' && React.createElement("div", { className: "mt-3" },
              React.createElement("div", { 
                onClick: function () { upd('synthTab', 'beatpad'); },
                className: "bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4 cursor-pointer hover:shadow-md hover:from-purple-100 hover:to-pink-100 transition-all group"
              },
                React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-3xl" }, "\uD83E\uDD41"),
                  React.createElement("div", null,
                    React.createElement("div", { className: "text-sm font-bold text-purple-700 group-hover:text-purple-800" }, "Production Studio"),
                    React.createElement("div", { className: "text-[11px] text-purple-500" }, "Sequencer, drum pads, notation, samples & more \u2192")
                  ),
                  React.createElement("span", { className: "ml-auto text-purple-400 group-hover:text-purple-600 text-lg transition-transform group-hover:translate-x-1" }, "\u2192")
                )
              )
            ),

            // ═══════════ TAB: SCALES ═══════════
            synthTab === 'scales' && React.createElement("div", null,
              // Scales & Modes
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDFB5 Scales & Modes"),
                  React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.scales.text }, "\u2753")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  Object.keys(SCALES).map(function (name) {
                    var s = SCALES[name];
                    return React.createElement("button", { "aria-label": name + " scale",
                      key: name,
                      onClick: function () { upd('selectedScale', name); playScale(selectedRoot, name, false); },
                      className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (selectedScale === name ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-50')
                    }, name);
                  })
                ),
                selectedScale && SCALES[selectedScale] && React.createElement("div", { className: "bg-purple-50 rounded-lg p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-xs font-bold text-purple-700" }, selectedRoot + " " + selectedScale),
                    React.createElement("button", { "aria-label": "Play Ascending",
                      onClick: function () { playScale(selectedRoot, selectedScale, false); },
                      className: "px-2 py-0.5 rounded text-[11px] font-bold bg-purple-600 text-white"
                    }, "\u25B6 Play Ascending"),
                    React.createElement("button", { "aria-label": "Descending",
                      onClick: function () { playScale(selectedRoot, selectedScale, true); },
                      className: "px-2 py-0.5 rounded text-[11px] font-bold bg-purple-700 text-white"
                    }, "\u25BC Descending")
                  ),
                  React.createElement("p", { className: "text-[11px] text-purple-600 mb-1.5" }, SCALES[selectedScale].desc),
                  React.createElement("div", { className: "flex gap-1" },
                    SCALES[selectedScale].intervals.map(function (intv, i) {
                      var nIdx = (rootIdx + intv) % 12;
                      return React.createElement("div", { 
                        key: i,
                        onClick: function () { playNoteFor(noteFreq(NOTE_NAMES[nIdx], d.octave || 4), 'scale_note_' + i, 500); },
                        className: "flex-1 py-2 rounded-lg text-center cursor-pointer transition-all bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100"
                      },
                        React.createElement("span", { className: "text-xs font-bold text-purple-700 block" }, NOTE_NAMES[nIdx]),
                        React.createElement("span", { className: "text-[11px] text-purple-400" }, i === 0 ? 'Root' : intv + ' semi')
                      );
                    })
                  )
                ),
                // Science box
                selectedScale && SCALES[selectedScale] && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-3 border" },
                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\uD83D\uDD2C The Science"),
                  React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, SCALES[selectedScale].science)
                )
              ),

              // Waveform Science (moved from Sound Lab)
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("span", { className: "text-sm font-bold text-slate-800 block mb-3" }, "\u223F Waveform Science"),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  Object.keys(WAVE_INFO).map(function (wType) {
                    var wi = WAVE_INFO[wType];
                    var isActive = (d.waveType || 'sine') === wType;
                    return React.createElement("div", { 
                      key: wType,
                      onClick: function () { upd('waveType', wType); playNoteFor(noteFreq(selectedRoot, d.octave || 4), 'demo_' + wType, 800); },
                      className: "p-3 rounded-xl border-2 cursor-pointer transition-all " + (isActive ? 'border-purple-400 bg-purple-50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-purple-200')
                    },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, wi.emoji),
                        React.createElement("span", { className: "text-xs font-bold text-slate-800 capitalize" }, wType)
                      ),
                      React.createElement("p", { className: "text-[11px] text-slate-600 mb-1" }, wi.desc),
                      React.createElement("p", { className: "text-[11px] text-purple-600 font-bold" }, "Harmonics: " + wi.harmonics),
                      React.createElement("p", { className: "text-[11px] text-slate-600 leading-snug mt-1" }, wi.science)
                    );
                  })
                )
              )
            ),

            // ═══════════ TAB: CHORDS ═══════════
            synthTab === 'chords' && React.createElement("div", null,
              // Chord Explorer
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDFB6 Chord Explorer"),
                  React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.chords.text }, "\u2753"),
                  React.createElement("button", { "aria-label": "Jazz Mode",
                    onClick: function () { upd('jazzMode', !jazzMode); },
                    className: "px-2 py-0.5 rounded text-[11px] font-bold ml-auto " + (jazzMode ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-200')
                  }, "\uD83C\uDFB7 Jazz Mode")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6', 'add9'] : Object.keys(CHORDS).filter(function (k) { return ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4', t('stem.circuit.power')].indexOf(k) !== -1; })).map(function (chType) {
                    var chord = CHORDS[chType]; if (!chord) return null;
                    return React.createElement("button", { "aria-label": "Inversion",
                      key: chType,
                      onClick: function () { upd('selectedChord', chType); upd('chordRoot', selectedRoot); playChord(selectedRoot, chType, chordInversion); },
                      className: "px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (selectedChord === chType ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600')
                    }, selectedRoot + chord.symbol);
                  })
                ),
                // Inversion selector
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Inversion"),
                  [0, 1, 2].map(function (inv) {
                    return React.createElement("button", { "aria-label": "Strum chord",
                      key: inv,
                      onClick: function () { upd('chordInversion', inv); if (selectedChord) playChord(selectedRoot, selectedChord, inv); },
                      className: "px-2 py-0.5 rounded text-[11px] font-bold " + (chordInversion === inv ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-200')
                    }, inv === 0 ? 'Root' : inv === 1 ? '1st Inv' : '2nd Inv');
                  }),
                  React.createElement("button", { "aria-label": "Strum chord",
                    onClick: function () { if (selectedChord) strumChord(selectedRoot, selectedChord, chordInversion, 40, 'up'); },
                    className: "ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }, "\uD83C\uDFB8 Strum")
                ),
                // Chord info panel
                selectedChord && CHORDS[selectedChord] && React.createElement("div", { className: "bg-purple-50 rounded-lg p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-sm font-bold text-purple-700" }, selectedRoot + CHORDS[selectedChord].symbol),
                    React.createElement("span", { className: "text-xs text-purple-500" }, CHORDS[selectedChord].desc)
                  ),
                  React.createElement("div", { className: "flex gap-1 mb-2" },
                    CHORDS[selectedChord].intervals.map(function (intv, i) {
                      var nIdx = (NOTE_NAMES.indexOf(selectedRoot) + intv) % 12;
                      return React.createElement("div", { 
                        key: i,
                        onClick: function () { playNoteFor(noteFreq(NOTE_NAMES[nIdx], d.octave || 4), 'chord_note_' + i, 500); },
                        className: "flex-1 py-2 rounded-lg text-center cursor-pointer bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100 transition-all"
                      },
                        React.createElement("span", { className: "text-xs font-bold text-purple-700" }, NOTE_NAMES[nIdx]),
                        React.createElement("span", { className: "text-[11px] text-purple-400 block" }, i === 0 ? 'Root' : intv + ' semi')
                      );
                    })
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" }, "\uD83D\uDD2C " + CHORDS[selectedChord].science)
                )
              ),

              // Chord Progressions
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("span", { className: "text-sm font-bold text-slate-800 block mb-3" }, "\uD83C\uDFB6 Chord Progressions"),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  PROGRESSIONS.map(function (prog) {
                    return React.createElement("button", { "aria-label": "Play Progression",
                      key: prog.name,
                      onClick: function () { playProgression(prog); },
                      className: "text-left px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-400 hover:border-purple-600 hover:bg-purple-50 transition-all group"
                    },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-700 group-hover:text-purple-700 block" }, prog.name),
                      React.createElement("span", { className: "text-[11px] text-slate-200" }, prog.desc)
                    );
                  })
                )
              ),

              // Circle of Fifths
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\u2B55 Circle of Fifths"),
                  React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.circleOfFifths.text }, "\u2753")
                ),
                React.createElement("svg", { viewBox: "0 0 300 300", className: "w-full mx-auto", style: { maxWidth: '300px', maxHeight: '300px' } },
                  // Background
                  React.createElement("circle", { cx: 150, cy: 150, r: 140, fill: "none", stroke: "#e2e8f0", strokeWidth: 2 }),
                  React.createElement("circle", { cx: 150, cy: 150, r: 100, fill: "none", stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }),
                  // Keys around the circle
                  CIRCLE_OF_FIFTHS.map(function (entry, idx) {
                    var angle = (idx * 30 - 90) * Math.PI / 180;
                    var outerX = 150 + 120 * Math.cos(angle);
                    var outerY = 150 + 120 * Math.sin(angle);
                    var innerX = 150 + 85 * Math.cos(angle);
                    var innerY = 150 + 85 * Math.sin(angle);
                    var circleKey = entry.key.indexOf('/') !== -1 ? entry.key.split('/')[0] : entry.key;
                    var isSelected = circleKey === selectedRoot || entry.key === selectedRoot;
                    return React.createElement("g", { key: entry.key, className: "cursor-pointer", onClick: function () { upd('selectedRoot', circleKey); playChord(circleKey, 'Major', 0); } },
                      React.createElement("circle", { cx: outerX, cy: outerY, r: isSelected ? 18 : 15, fill: isSelected ? '#7c3aed' : '#f8fafc', stroke: isSelected ? '#5b21b6' : '#cbd5e1', strokeWidth: isSelected ? 2 : 1 }),
                      React.createElement("text", { x: outerX, y: outerY + 4, textAnchor: "middle", fill: isSelected ? '#fff' : '#334155', style: { fontSize: '11px', fontWeight: 'bold' } }, entry.key),
                      React.createElement("text", { x: innerX, y: innerY + 3, textAnchor: "middle", fill: '#94a3b8', style: { fontSize: '8px' } }, entry.minor)
                    );
                  })
                )
              ),

              // Barry Harris Harmony
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFB7 Barry Harris Harmony"),
                  React.createElement("span", { className: "text-[11px] text-amber-500" }, "(1929-2021)")
                ),
                React.createElement("p", { className: "text-[11px] text-amber-700 mb-3 leading-relaxed" }, BARRY_HARRIS.desc),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "Major 6th Diminished Scale"),
                    React.createElement("div", { className: "flex flex-wrap gap-1" },
                      BARRY_HARRIS.majorScale(rootIdx).map(function (chord, i) {
                        return React.createElement("button", { "aria-label": "Minor 6th Diminished Scale",
                          key: i,
                          onClick: function () { playChord(NOTE_NAMES[(rootIdx + chord.degree) % 12], chord.type, 0); },
                          className: "px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (chord.type === 'dim7' ? 'bg-red-100 text-red-700 border border-red-600 hover:bg-red-200' : 'bg-amber-100 text-amber-800 border border-amber-600 hover:bg-amber-200')
                        }, chord.label);
                      })
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "Minor 6th Diminished Scale"),
                    React.createElement("div", { className: "flex flex-wrap gap-1" },
                      BARRY_HARRIS.minorScale(rootIdx).map(function (chord, i) {
                        return React.createElement("button", { "aria-label": "Play Chord",
                          key: i,
                          onClick: function () { playChord(NOTE_NAMES[(rootIdx + chord.degree) % 12], chord.type, 0); },
                          className: "px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (chord.type === 'dim7' ? 'bg-red-100 text-red-700 border border-red-600 hover:bg-red-200' : 'bg-amber-100 text-amber-800 border border-amber-600 hover:bg-amber-200')
                        }, chord.label);
                      })
                    )
                  )
                )
              )
            ),




            // ═══════════ TAB: BEAT PAD (Production Studio) ═══════════
            synthTab === 'beatpad' && React.createElement("div", { className: "animate-in fade-in duration-200" },

              // ── Header + Kit Selector ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },
                React.createElement("span", { className: "text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" }, "\uD83E\uDD41 Production Studio"),
                d.samplesLoading && React.createElement("span", { className: "text-[11px] text-amber-500 animate-pulse font-bold" }, "\u23F3 Loading samples..."),
                d.activeKit && React.createElement("span", { className: "text-[11px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold" }, "\u2705 " + (SAMPLE_KITS[d.activeKit] || {}).name),
                React.createElement("div", { className: "flex gap-1 ml-auto flex-wrap" },
                  Object.keys(SAMPLE_KITS).map(function (kitId) {
                    var kit = SAMPLE_KITS[kitId]; var isActive = (d.activeKit || '') === kitId; var isLoaded = !!window._alloSampleCache[kitId];
                    return React.createElement("button", { "aria-label": (kit ? kit.name : kitId) + " drum kit", key: kitId, onClick: function () { if (isLoaded) upd('activeKit', kitId); else loadSampleKit(kitId); },
                      className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-purple-600 text-white shadow-md' : isLoaded ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
                      title: isLoaded ? 'Switch to ' + kit.name : 'Click to download ' + kit.name
                    }, kit.icon + ' ' + kit.name + (isLoaded ? '' : ' \u2B07'));
                  })
                )
              ),

              // ── MPC Drum Pads ──
              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-3 mb-3 shadow-xl border border-slate-700/50" },
                d.bpStepRec && React.createElement("div", { className: "flex items-center gap-2 mb-2 px-2 py-1 bg-red-900/40 rounded-lg border border-red-500/30" },
                  React.createElement("span", { className: "w-2 h-2 rounded-full bg-red-500 animate-pulse" }),
                  React.createElement("span", { className: "text-[11px] font-bold text-red-300" }, "STEP REC \u2022 Step " + ((d.bpStepRecPos || 0) + 1) + "/16"),
                  React.createElement("span", { className: "text-[11px] text-red-400/60" }, "Tap pads to place beats")
                ),
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  BEAT_PAD_SOUNDS.map(function (sound, idx) {
                    var isHit = d['padHit_' + idx];
                    return React.createElement("button", { "aria-label": sound.type + " drum pad",
                      key: sound.type,
                      onMouseDown: function () {
                        playSample(sound.type, idx);
                        stepRecHit(idx);
                        upd('padHit_' + idx, true); setTimeout(function () { upd('padHit_' + idx, false); }, 120);
                      },
                      className: "relative h-14 rounded-xl font-bold text-white text-xs select-none transition-all duration-75 " + (isHit ? 'scale-[0.93] brightness-150 shadow-lg ring-2 ring-white/40' : 'hover:scale-[1.02] shadow-md hover:shadow-lg'),
                      style: { background: isHit ? sound.color : 'linear-gradient(145deg, ' + sound.color + '55, ' + sound.color + '99)', border: '1px solid ' + sound.color + '44' }
                    },
                      React.createElement("div", { className: "text-[11px] font-bold drop-shadow-sm" }, sound.label),
                      React.createElement("div", { className: "text-[11px] opacity-40 mt-0.5 font-mono" }, sound.key)
                    );
                  })
                )
              ),

              // ── Waveform Visualizer ──
              React.createElement("div", { className: "mb-3 rounded-xl overflow-hidden shadow-inner border border-indigo-900/30", style: { height: '48px' } },
                React.createElement("canvas", { ref: _bpCanvasRef, width: 600, height: 48, className: "w-full h-full", style: { background: '#1e1b4b' } })
              ),

              // ── Transport Bar (enhanced) ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border border-purple-200/50 p-2 flex-wrap" },
                React.createElement("button", { "aria-label": "Beats per minute",
                  onClick: function () { if (d.seqPlaying) stopSequencer(); else startSequencer(); },
                  className: "px-4 py-2 rounded-lg text-sm font-bold transition-all " + (d.seqPlaying ? 'bg-red-700 text-white shadow-inner' : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md')
                }, d.seqPlaying ? '\u23F9 Stop' : '\u25B6 Play'),
                // BPM
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "BPM"),
                  React.createElement("input", { type: "range", min: 60, max: 200, step: 1, value: d.seqBPM || 120, onChange: function (e) { upd('seqBPM', parseInt(e.target.value)); }, className: "w-20 accent-purple-600" }),
                  React.createElement("span", { className: "text-xs font-bold text-purple-700 w-8 text-center" }, d.seqBPM || 120)
                ),
                // Tap Tempo
                React.createElement("button", { "aria-label": "Tap", onClick: tapTempo, className: "px-2 py-1.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all border border-amber-600" }, "\uD83E\uDD4A Tap"),
                // Pattern Length
                React.createElement("select", { value: String(d.bpPatternLen || 16), onChange: function (e) { upd('bpPatternLen', parseInt(e.target.value)); }, className: "px-2 py-1 rounded text-[11px] font-bold bg-white border border-slate-400", title: "Pattern length in steps" },
                  React.createElement("option", { value: '8' }, "8 steps"),
                  React.createElement("option", { value: '16' }, "16 steps"),
                  React.createElement("option", { value: '32' }, "32 steps"),
                  React.createElement("option", { value: '64' }, "64 steps")
                ),
                // Swing
                React.createElement("select", { value: d.seqSwing || '0', onChange: function (e) { upd('seqSwing', e.target.value); }, className: "px-2 py-1 rounded text-[11px] font-bold bg-white border border-slate-400" },
                  React.createElement("option", { value: '0' }, "No Swing"),
                  React.createElement("option", { value: '15' }, "Swing 15%"),
                  React.createElement("option", { value: '30' }, "Swing 30%"),
                  React.createElement("option", { value: '50' }, "Swing 50%")
                ),
                // Undo / Redo
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", { onClick: bpUndo, disabled: !(window._bpUndoStack || []).length, className: "px-2 py-1 rounded text-[11px] font-bold transition-all " + ((window._bpUndoStack || []).length ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-600 cursor-not-allowed') }, "\u21A9 " + (window._bpUndoStack || []).length),
                  React.createElement("button", { onClick: bpRedo, disabled: !(window._bpRedoStack || []).length, className: "px-2 py-1 rounded text-[11px] font-bold transition-all " + ((window._bpRedoStack || []).length ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-600 cursor-not-allowed') }, "\u21AA " + (window._bpRedoStack || []).length)
                ),
                // Step Rec toggle
                React.createElement("button", { onClick: function () { upd('bpStepRec', !d.bpStepRec); upd('bpStepRecPos', 0); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.bpStepRec ? 'bg-red-700 text-white shadow-inner animate-pulse' : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-600') }, d.bpStepRec ? '\u23FA REC' : '\u26AB REC'),
                // Clear
                React.createElement("button", { "aria-label": "Clear all beats", onClick: function () { pushBpUndo(); upd('seqGrid', {}); upd('beatMelody', null); }, className: "ml-auto px-2 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 transition-all" }, "\uD83D\uDDD1 Clear")
              ),

              // ── Pattern Selector (A/B/C/D) ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "Pattern"),
                ['A', 'B', 'C', 'D'].map(function (p) {
                  var isActive = (d.bpActivePattern || 'A') === p;
                  var colors = { A: 'purple', B: 'blue', C: 'emerald', D: 'amber' };
                  var c = colors[p];
                  return React.createElement("button", { key: p,
                    onClick: function () {
                      // Save current grid to current pattern
                      var pats = Object.assign({}, d.bpPatterns || {});
                      var cur = d.bpActivePattern || 'A';
                      pats[cur] = { grid: Object.assign({}, d.seqGrid || {}), melody: (d.beatMelody || []).slice() };
                      // Switch to new pattern
                      var target = pats[p] || { grid: {}, melody: [] };
                      upd('seqGrid', Object.assign({}, target.grid || {}));
                      upd('beatMelody', target.melody ? target.melody.slice() : null);
                      upd('bpPatterns', pats);
                      upd('bpActivePattern', p);
                    },
                    className: "w-8 h-8 rounded-lg text-xs font-black transition-all " + (isActive ? 'bg-' + c + '-600 text-white shadow-md scale-110' : 'bg-' + c + '-50 text-' + c + '-600 border border-' + c + '-200 hover:bg-' + c + '-100')
                  }, p);
                }),
                React.createElement("div", { className: "border-l border-slate-200 h-6 mx-1" }),
                React.createElement("button", { "aria-label": "A loop",
                  onClick: function () { upd('bpChainMode', !d.bpChainMode); },
                  className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.bpChainMode ? 'bg-orange-700 text-white' : 'bg-orange-50 text-orange-600 border border-orange-600 hover:bg-orange-100')
                }, "\uD83D\uDD17 Chain " + (d.bpChainMode ? 'ON' : 'OFF')),
                d.bpChainMode && React.createElement("span", { className: "text-[11px] text-orange-500" }, "A\u2192B\u2192C\u2192D loop")
              ),

              // ── EDM Preset Buttons ──
              React.createElement("div", { className: "flex gap-1.5 mb-3 flex-wrap" },
                Object.keys(SEQ_PRESETS).map(function (key) {
                  return React.createElement("button", { "aria-label": "Load " + key + " preset", key: key, onClick: function () { pushBpUndo(); upd('seqGrid', Object.assign({}, SEQ_PRESETS[key].grid)); },
                    className: "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-600 hover:from-purple-100 hover:to-pink-100 hover:shadow-sm transition-all"
                  }, "\uD83C\uDFB5 " + SEQ_PRESETS[key].name);
                })
              ),

              // ── Mixer Panel (collapsible) ──
              React.createElement("div", { className: "bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-400 mb-3 overflow-hidden" },
                React.createElement("button", { "aria-label": "Toggle mixer panel", onClick: function () { upd('bpMixerOpen', !d.bpMixerOpen); }, className: "w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 transition-all" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83C\uDFA8 Mixer"),
                  React.createElement("span", { className: "text-[11px] text-slate-200" }, "Volume \u2022 Mute \u2022 Solo"),
                  React.createElement("span", { className: "ml-auto text-slate-200 text-[11px] transition-transform " + (d.bpMixerOpen ? 'rotate-180' : '') }, "\u25BC")
                ),
                d.bpMixerOpen && React.createElement("div", { className: "px-3 pb-3" },
                  BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row) {
                    var vol = getChVol(row);
                    var muted = !!(d.chMutes && d.chMutes[row]);
                    var soloed = d.chSolo === row;
                    return React.createElement("div", { key: sound.type, className: "flex items-center gap-2 py-0.5" },
                      React.createElement("span", { className: "text-[11px] font-bold w-12 text-right truncate", style: { color: sound.color } }, sound.label),
                      React.createElement("input", { type: "range", min: 0, max: 100, value: Math.round(vol * 100),
                        onChange: function (e) { var v = Object.assign({}, d.chVolumes || {}); v[row] = parseInt(e.target.value) / 100; upd('chVolumes', v); },
                        className: "flex-1 h-1.5 accent-purple-500", style: { maxWidth: '120px' }
                      }),
                      React.createElement("span", { className: "text-[11px] text-slate-600 w-7 text-right" }, Math.round(vol * 100) + '%'),
                      React.createElement("button", { onClick: function () { var m = Object.assign({}, d.chMutes || {}); m[row] = !m[row]; upd('chMutes', m); },
                        className: "w-5 h-5 rounded text-[11px] font-black " + (muted ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, "M"),
                      React.createElement("button", { onClick: function () { upd('chSolo', soloed ? -1 : row); },
                        className: "w-5 h-5 rounded text-[11px] font-black " + (soloed ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, "S")
                    );
                  })
                )
              ),

              // ── Effects Rack ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u2728 Effects"),
                  React.createElement("button", { onClick: function () { upd('bpFxOn', !d.bpFxOn); if (!d.bpFxOn) _initBpFx(); },
                    className: "px-2 py-0.5 rounded-full text-[11px] font-bold transition-all " + (d.bpFxOn ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-600')
                  }, d.bpFxOn ? 'FX ON' : 'FX OFF'),
                  d.bpFxOn && React.createElement("button", { "aria-label": "Reset audio effects", onClick: function () { upd('bpReverb', 0); upd('bpDelay', 0); upd('bpFilterCut', 20000); }, className: "text-[11px] text-violet-400 hover:text-violet-600" }, "Reset")
                ),
                d.bpFxOn && React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                  [
                    { key: 'bpReverb', label: 'Reverb', icon: '\uD83C\uDFDB\uFE0F', max: 100, val: d.bpReverb || 0, color: '#8b5cf6' },
                    { key: 'bpDelay', label: 'Delay', icon: '\uD83D\uDD03', max: 100, val: d.bpDelay || 0, color: '#d946ef' },
                    { key: 'bpFilterCut', label: 'Filter', icon: '\uD83C\uDF0A', max: 20000, val: d.bpFilterCut || 20000, color: '#a855f7' }
                  ].map(function (fx) {
                    return React.createElement("div", { key: fx.key, className: "text-center" },
                      React.createElement("div", { className: "text-[11px] font-bold text-violet-700 mb-1" }, fx.icon + ' ' + fx.label),
                      React.createElement("input", { type: "range", min: fx.key === 'bpFilterCut' ? 200 : 0, max: fx.max, value: fx.val,
                        onChange: function (e) { upd(fx.key, parseInt(e.target.value)); },
                        className: "w-full accent-violet-500"
                      }),
                      React.createElement("div", { className: "text-[11px] text-violet-400 mt-0.5" }, fx.key === 'bpFilterCut' ? (fx.val >= 19000 ? 'Open' : Math.round(fx.val) + ' Hz') : fx.val + '%')
                    );
                  })
                )
              ),

              // ── Sequencer Grid ──
              React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 p-3 mb-3 overflow-x-auto shadow-sm" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, "\uD83C\uDFBC Sequencer"),
                  React.createElement("span", { className: "text-[11px] text-slate-200" }, "16 steps = 1 bar"),
                  // Scale selector
                  React.createElement("select", { value: d.bpScale || 'major', onChange: function (e) { upd('bpScale', e.target.value); },
                    className: "ml-auto px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-600"
                  },
                    Object.keys(SCALE_PATTERNS).map(function (k) {
                      return React.createElement("option", { key: k, value: k }, '\uD83C\uDFB5 ' + SCALE_PATTERNS[k].name);
                    })
                  )
                ),
                // Beat subdivision labels
                React.createElement("div", { className: "flex mb-1", style: { marginLeft: '68px' } },
                  Array.from({ length: 16 }, function (_, i) {
                    var labels = ['1','e','&','a','2','e','&','a','3','e','&','a','4','e','&','a'];
                    return React.createElement("div", { key: i, className: "flex-1 text-center text-[11px] font-bold " + (i % 4 === 0 ? 'text-purple-600' : 'text-slate-200'), style: { minWidth: '22px' } }, labels[i]);
                  })
                ),
                // Melody row (scale-locked)
                (function () {
                  var scNotes = getScaleNotes();
                  return React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                    React.createElement("span", { className: "text-[11px] font-bold text-purple-500 w-16 text-right pr-1 truncate" }, "\uD83C\uDFB9 Melody"),
                    Array.from({ length: 16 }, function (_, i) {
                      var ni = melodySeqBP[i] || 0;
                      var isCur = d.seqPlaying && d.seqCurrentStep === i;
                      var isRec = d.bpStepRec && (d.bpStepRecPos || 0) === i;
                      return React.createElement("div", { 
                        key: 'mel_' + i,
                        onClick: function () { pushBpUndo(); var nm = (d.beatMelody || new Array(16).fill(0)).slice(); nm[i] = (nm[i] + 1) % (scNotes.notes.length + 1); upd('beatMelody', nm); },
                        onContextMenu: function (e) { e.preventDefault(); pushBpUndo(); var nm = (d.beatMelody || new Array(16).fill(0)).slice(); nm[i] = nm[i] <= 0 ? scNotes.notes.length : nm[i] - 1; upd('beatMelody', nm); },
                        className: "flex-1 h-7 rounded-sm cursor-pointer transition-all flex items-center justify-center text-[11px] font-bold select-none " +
                          (ni > 0 ? 'bg-gradient-to-b from-purple-400 to-purple-500 text-white shadow-sm' : isCur ? 'bg-purple-100 ring-1 ring-purple-300' : isRec ? 'bg-red-100 ring-1 ring-red-300' : i % 4 === 0 ? 'bg-purple-50/80' : 'bg-slate-50 border border-slate-100') + ' hover:brightness-110',
                        style: { minWidth: '22px' },
                        title: ni > 0 ? scNotes.notes[ni - 1] : 'Click to add'
                      }, ni > 0 && ni <= scNotes.notes.length ? scNotes.notes[ni - 1].replace('4', '').replace('5', '\u2019') : '');
                    })
                  );
                })(),
                React.createElement("div", { className: "border-b border-dashed border-slate-200 mb-1 ml-16" }),
                // Drum rows
                BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row) {
                  return React.createElement("div", { key: sound.type, className: "flex items-center gap-1 mb-0.5" },
                    React.createElement("span", { className: "text-[11px] font-bold w-16 text-right pr-1 truncate", style: { color: sound.color } }, sound.label),
                    Array.from({ length: 16 }, function (_, col) {
                      var gKey = row + '_' + col; var grid = d.seqGrid || {}; var isOn = grid[gKey];
                      var isCur = d.seqPlaying && d.seqCurrentStep === col;
                      var isRec = d.bpStepRec && (d.bpStepRecPos || 0) === col;
                      return React.createElement("div", { 
                        key: gKey,
                        onClick: function () { pushBpUndo(); var g = Object.assign({}, d.seqGrid || {}); g[gKey] = g[gKey] ? 0 : 1; upd('seqGrid', g); },
                        className: "flex-1 h-5 rounded-sm cursor-pointer transition-all " +
                          (isOn ? 'shadow-sm' : isCur ? 'bg-slate-200 ring-1 ring-purple-200' : isRec ? 'bg-red-50 ring-1 ring-red-200' : col % 4 === 0 ? 'bg-slate-100' : 'bg-slate-50 border border-slate-100') + ' hover:opacity-80',
                        style: isOn ? { background: sound.color, opacity: isCur ? 1 : 0.85 } : { minWidth: '22px' }
                      });
                    })
                  );
                }),
                // Step position indicator
                React.createElement("div", { className: "flex mt-1", style: { marginLeft: '68px' } },
                  Array.from({ length: 16 }, function (_, i) {
                    return React.createElement("div", { key: 's_' + i, className: "flex-1 h-1 rounded-full mx-px transition-all " + (d.seqPlaying && d.seqCurrentStep === i ? 'bg-purple-500' : 'bg-slate-200'), style: { minWidth: '22px' } });
                  })
                )
              ),

              // ── Piano Roll Editor ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, "\uD83C\uDFB9 Piano Roll"),
                  React.createElement("span", { className: "text-[11px] text-indigo-500" }, "Click cells to place notes \u2014 visual melody editor"),
                  React.createElement("button", { onClick: function() { upd('showPianoRoll', !d.showPianoRoll); },
                    className: "ml-auto px-2 py-1 rounded text-[11px] font-bold " + (d.showPianoRoll ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200') + " transition-all"
                  }, d.showPianoRoll ? '\u25BC Hide' : '\u25B6 Show')
                ),
                d.showPianoRoll && (function() {
                  var scNotes = getScaleNotes();
                  var patLen = d.bpPatternLen || 16;
                  var melody = d.beatMelody || new Array(patLen).fill(0);
                  var rows = scNotes.notes.slice().reverse(); // high notes at top
                  return React.createElement("div", { className: "overflow-x-auto" },
                    React.createElement("div", { style: { minWidth: Math.max(400, patLen * 28) + 'px' } },
                      // Note rows
                      rows.map(function(noteName, rowIdx) {
                        var noteIdx = rows.length - rowIdx; // 1-indexed from bottom
                        var isBlack = noteName.indexOf('#') !== -1 || noteName.indexOf('\u266D') !== -1;
                        return React.createElement("div", { key: noteName, className: "flex", style: { height: '18px' } },
                          // Note label
                          React.createElement("div", { className: "w-10 text-[11px] font-bold flex items-center justify-end pr-1 shrink-0 border-r",
                            style: { background: isBlack ? '#1e293b' : '#f8fafc', color: isBlack ? '#94a3b8' : '#475569', borderColor: '#e2e8f0' }
                          }, noteName),
                          // Step cells
                          Array.from({ length: patLen }, function(_, col) {
                            var isActive = melody[col] === noteIdx;
                            var isBeat = col % 4 === 0;
                            var isCurrent = d.seqPlaying && d.seqCurrentStep === col;
                            return React.createElement("div", { key: col,
                              onClick: function() {
                                pushBpUndo();
                                var newMel = melody.slice();
                                newMel[col] = isActive ? 0 : noteIdx;
                                upd('beatMelody', newMel);
                                if (!isActive && noteIdx > 0 && noteIdx <= scNotes.freqs.length) {
                                  playNoteFor(scNotes.freqs[noteIdx - 1], 'pr_' + col, 200);
                                }
                              },
                              className: "flex-1 border-r border-b cursor-pointer transition-all " + (isCurrent ? 'brightness-125' : ''),
                              style: {
                                minWidth: '20px',
                                background: isActive ? (NOTE_COLORS[scNotes.notes.indexOf(noteName) % 12] || '#6366f1') :
                                  isCurrent ? 'rgba(99,102,241,0.15)' :
                                  isBlack ? (isBeat ? '#1e293b' : '#0f172a') : (isBeat ? '#f1f5f9' : '#fff'),
                                borderColor: '#e2e8f0'
                              }
                            });
                          })
                        );
                      }),
                      // Step numbers at bottom
                      React.createElement("div", { className: "flex" },
                        React.createElement("div", { className: "w-10 shrink-0" }),
                        Array.from({ length: patLen }, function(_, i) {
                          return React.createElement("div", { key: i, className: "flex-1 text-center text-[11px] font-mono",
                            style: { minWidth: '20px', color: i % 4 === 0 ? '#6366f1' : '#94a3b8' }
                          }, i % 4 === 0 ? String(Math.floor(i / 4) + 1) : '\u00B7');
                        })
                      )
                    )
                  );
                })()
              ),

              // ── Chord Progression Builder ──
              React.createElement("div", { className: "bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-purple-800" }, "\uD83C\uDFB6 Chord Progression Builder"),
                  React.createElement("span", { className: "text-[11px] text-purple-500" }, "Build common progressions"),
                  React.createElement("button", { onClick: function() { upd('showChordProg', !d.showChordProg); },
                    className: "ml-auto px-2 py-1 rounded text-[11px] font-bold " + (d.showChordProg ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-200') + " transition-all"
                  }, d.showChordProg ? '\u25BC Hide' : '\u25B6 Show')
                ),
                d.showChordProg && React.createElement("div", null,
                  // Common progressions
                  React.createElement("div", { className: "text-[11px] font-bold text-purple-700 mb-1" }, "Common Progressions \u2014 click to hear"),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3" },
                    [
                      { name: 'I - V - vi - IV', chords: ['C','G','Am','F'], genre: 'Pop (most common in the world!)', key: 'C' },
                      { name: 'I - IV - V - I', chords: ['C','F','G','C'], genre: 'Rock / Country / Folk', key: 'C' },
                      { name: 'ii - V - I', chords: ['Dm','G','C'], genre: 'Jazz (the foundation)', key: 'C' },
                      { name: 'I - vi - IV - V', chords: ['C','Am','F','G'], genre: '50s Doo-Wop / Classic Pop', key: 'C' },
                      { name: 'vi - IV - I - V', chords: ['Am','F','C','G'], genre: 'Modern Pop / Emotional', key: 'Am' },
                      { name: 'I - IV - vi - V', chords: ['C','F','Am','G'], genre: 'Worship / Anthemic', key: 'C' },
                      { name: 'i - VI - III - VII', chords: ['Am','F','C','G'], genre: 'Anime / Film Score', key: 'Am' },
                      { name: 'I - V - vi - iii - IV', chords: ['C','G','Am','Em','F'], genre: 'Canon in D / Baroque', key: 'C' },
                      { name: '12-Bar Blues', chords: ['C','C','C','C','F','F','C','C','G','F','C','G'], genre: 'Blues / R&B', key: 'C' },
                    ].map(function(prog) {
                      return React.createElement("button", { key: prog.name,
                        onClick: function() {
                          upd('activeProgression', prog);
                          // Play the progression
                          prog.chords.forEach(function(chord, ci) {
                            setTimeout(function() {
                              var root = chord.replace('m','').replace('7','');
                              var isMinor = chord.indexOf('m') !== -1 && chord.indexOf('maj') === -1;
                              strumChord(root, isMinor ? 'Minor' : 'Major', 0, 50);
                            }, ci * 800);
                          });
                        },
                        className: "p-2 rounded-lg text-left transition-all border hover:shadow-md " + ((d.activeProgression && d.activeProgression.name === prog.name) ? 'border-purple-400 bg-purple-100 shadow-md' : 'border-purple-100 bg-white hover:border-purple-600')
                      },
                        React.createElement("div", { className: "text-[11px] font-bold text-purple-800" }, prog.name),
                        React.createElement("div", { className: "flex gap-1 mt-1 flex-wrap" },
                          prog.chords.map(function(ch, ci) {
                            return React.createElement("span", { key: ci, className: "text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-200/50 text-purple-700" }, ch);
                          })
                        ),
                        React.createElement("div", { className: "text-[11px] text-purple-500 mt-1 italic" }, prog.genre)
                      );
                    })
                  ),
                  // Educational content
                  React.createElement("div", { className: "bg-white/60 rounded-lg p-2 border border-purple-100" },
                    React.createElement("div", { className: "text-[11px] font-bold text-purple-700 mb-1" }, "\uD83D\uDD2C The Science of Chord Progressions"),
                    React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" },
                      "Chord progressions create emotional journeys. The I chord (tonic) feels like 'home.' The V chord (dominant) creates tension that wants to resolve back to I. The vi chord (relative minor) adds sadness or depth. The IV chord (subdominant) moves away from home gently. The I-V-vi-IV progression is estimated to appear in over 70% of pop songs because it balances these emotions perfectly."
                    ),
                    React.createElement("p", { className: "text-[11px] text-purple-600 font-bold mt-1" },
                      "Roman numerals (I, ii, iii, IV, V, vi, vii\u00B0) represent scale degrees. Uppercase = major chord. Lowercase = minor chord."
                    )
                  )
                )
              ),

              // ── Notation Teaching View (SVG-based, no unicode font dependency) ──
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "\uD83C\uDFBC Musical Notation"),
                  React.createElement("span", { className: "text-[11px] text-amber-600" }, "Click notes to hear them!"),
                  !melodySeqBP.some(function(n) { return n > 0; }) && React.createElement("span", { className: "text-[11px] text-amber-400 italic ml-auto" }, "Add melody notes in the grid above \u2191")
                ),
                // Staff notation: proper note placement on treble clef lines/spaces
                (function() {
                  var scNotes = getScaleNotes();
                  var hasMelody = melodySeqBP.some(function(n) { return n > 0; });
                  // Map scale note names to staff Y positions (treble clef, middle C = ledger below)
                  // Staff lines (top to bottom): F5=30, D5=35, B4=40, G4=45, E4=50
                  // Staff spaces: E5=32.5, C5=37.5, A4=42.5, F4=47.5
                  var STAFF_Y = { 'C4': 65, 'D4': 60, 'E4': 55, 'F4': 50, 'G4': 45, 'A4': 40, 'B4': 35, 'C5': 30, 'D5': 25, 'E5': 20, 'F5': 15, 'G5': 10 };
                  // Drum rhythm: check if any drum pads have hits
                  var grid = d.seqGrid || {};
                  var hasDrums = Object.keys(grid).some(function(k) { return grid[k]; });
                  var svgH = hasDrums ? 130 : 100;
                  return React.createElement("svg", { viewBox: "0 0 560 " + svgH, className: "w-full bg-[#fefcf3] rounded-lg border border-amber-100 mb-2", style: { maxHeight: hasDrums ? '160px' : '130px' }, role: "img", 'aria-label': 'Musical staff notation showing your melody' + (hasDrums ? ' and drum pattern' : '') },
                    // Staff lines
                    [0,1,2,3,4].map(function (li) { return React.createElement("line", { key: 'sl_' + li, x1: 35, y1: 25 + li * 10, x2: 540, y2: 25 + li * 10, stroke: '#d4d0c8', strokeWidth: 0.8 }); }),
                    // Treble clef (SVG path instead of unicode)
                    React.createElement("g", { transform: "translate(12,26) scale(0.38)", fill: "#8b7355" },
                      React.createElement("path", { d: "M20 80 C20 60 30 40 30 20 C30 5 25 0 20 0 C15 0 10 5 10 20 C10 40 20 60 20 80 C20 95 15 105 10 105 C5 105 0 95 5 85 C8 80 12 80 15 85 C18 90 15 100 10 100 Z M18 20 C18 10 22 5 22 15 C22 25 18 30 18 20 Z" })
                    ),
                    // Time signature
                    React.createElement("text", { x: 42, y: 40, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif' } }, "4"),
                    React.createElement("text", { x: 42, y: 57, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif' } }, "4"),
                    // Barlines
                    [4,8,12].map(function (bl) { return React.createElement("line", { key: 'bar_' + bl, x1: 55 + bl * 30, y1: 25, x2: 55 + bl * 30, y2: 65, stroke: '#bbb', strokeWidth: 0.8 }); }),
                    // Final barline (double)
                    React.createElement("line", { x1: 538, y1: 25, x2: 538, y2: 65, stroke: '#999', strokeWidth: 0.8 }),
                    React.createElement("line", { x1: 541, y1: 25, x2: 541, y2: 65, stroke: '#999', strokeWidth: 2 }),
                    // Melody notes / rests
                    melodySeqBP.map(function (ni, idx) {
                      var x = 70 + idx * 29; var isCur = d.seqPlaying && d.seqCurrentStep === idx;
                      if (!ni || ni <= 0) {
                        // Quarter rest (SVG drawn, not unicode)
                        var restCol = isCur ? '#7c3aed' : '#ccc';
                        return React.createElement("g", { key: 'n_' + idx },
                          React.createElement("path", { d: "M" + (x-2) + ",38 l3,-5 l-3,-3 l3,-5 l-3,-3 l2,-2", stroke: restCol, fill: "none", strokeWidth: 1.5, strokeLinecap: "round" })
                        );
                      }
                      // Get note name and map to staff Y
                      var noteName = ni <= scNotes.notes.length ? scNotes.notes[ni - 1] : 'C4';
                      var y = STAFF_Y[noteName] || (50 - (ni - 1) * 5);
                      var col = isCur ? '#7c3aed' : '#333';
                      return React.createElement("g", { key: 'n_' + idx, style: { cursor: 'pointer' },
                        onClick: function () { if (ni > 0 && ni <= scNotes.freqs.length) playNoteFor(scNotes.freqs[ni - 1], 'notclick_' + idx, 400); }
                      },
                        // Filled notehead (ellipse)
                        React.createElement("ellipse", { cx: x, cy: y, rx: 5, ry: 3.5, fill: col, transform: "rotate(-12 " + x + " " + y + ")" }),
                        // Stem (up if below middle, down if above)
                        y >= 45
                          ? React.createElement("line", { x1: x + 4.5, y1: y, x2: x + 4.5, y2: y - 22, stroke: col, strokeWidth: 1.2 })
                          : React.createElement("line", { x1: x - 4.5, y1: y, x2: x - 4.5, y2: y + 22, stroke: col, strokeWidth: 1.2 }),
                        // Ledger lines below staff (C4, D4)
                        y >= 65 && React.createElement("line", { x1: x - 7, y1: 65, x2: x + 7, y2: 65, stroke: '#999', strokeWidth: 0.6 }),
                        y >= 70 && React.createElement("line", { x1: x - 7, y1: 70, x2: x + 7, y2: 70, stroke: '#999', strokeWidth: 0.6 }),
                        // Ledger lines above staff (D5, E5, F5)
                        y <= 20 && React.createElement("line", { x1: x - 7, y1: 20, x2: x + 7, y2: 20, stroke: '#999', strokeWidth: 0.6 }),
                        y <= 15 && React.createElement("line", { x1: x - 7, y1: 15, x2: x + 7, y2: 15, stroke: '#999', strokeWidth: 0.6 }),
                        // Note name label
                        React.createElement("text", { x: x, y: y + (y >= 45 ? 12 : -8), textAnchor: "middle", fill: isCur ? '#7c3aed' : '#999', style: { fontSize: '6px', fontFamily: 'sans-serif' } }, noteName.replace('4', '').replace('5', '\u2019'))
                      );
                    }),
                    // Playback cursor
                    d.seqPlaying && React.createElement("rect", { x: 65 + (d.seqCurrentStep || 0) * 29, y: 22, width: 20, height: 46, rx: 2, fill: '#7c3aed', opacity: 0.08 }),
                    // Drum rhythm notation (below staff)
                    hasDrums && React.createElement("g", null,
                      // Rhythm label
                      React.createElement("text", { x: 8, y: 88, fill: "#999", style: { fontSize: '7px', fontFamily: 'sans-serif' } }, "Drums"),
                      // Percussion line
                      React.createElement("line", { x1: 55, y1: 90, x2: 540, y2: 90, stroke: '#e0dcd4', strokeWidth: 0.6 }),
                      // Drum hits as x noteheads
                      Array.from({ length: 16 }, function(_, col) {
                        var hasHit = false;
                        for (var dr = 0; dr < 12; dr++) { if (grid[dr + '_' + col]) { hasHit = true; break; } }
                        if (!hasHit) return null;
                        var x = 70 + col * 29;
                        var isCur = d.seqPlaying && d.seqCurrentStep === col;
                        var hitCol = isCur ? '#7c3aed' : '#666';
                        // Count simultaneous hits for size
                        var hitCount = 0;
                        for (var dr2 = 0; dr2 < 12; dr2++) { if (grid[dr2 + '_' + col]) hitCount++; }
                        return React.createElement("g", { key: 'dh_' + col },
                          // X notehead for percussion
                          React.createElement("line", { x1: x - 3, y1: 87, x2: x + 3, y2: 93, stroke: hitCol, strokeWidth: 1.3 }),
                          React.createElement("line", { x1: x + 3, y1: 87, x2: x - 3, y2: 93, stroke: hitCol, strokeWidth: 1.3 }),
                          // Stem
                          React.createElement("line", { x1: x + 3, y1: 87, x2: x + 3, y2: 77, stroke: hitCol, strokeWidth: 1 }),
                          // Hit count indicator (dot for 2+, double for 3+)
                          hitCount >= 2 && React.createElement("circle", { cx: x, cy: 97, r: 1.2, fill: hitCol }),
                          hitCount >= 3 && React.createElement("circle", { cx: x + 4, cy: 97, r: 1.2, fill: hitCol })
                        );
                      })
                    ),
                    // Empty state hint
                    !hasMelody && !hasDrums && React.createElement("text", { x: 290, y: 50, textAnchor: "middle", fill: "#ccc", style: { fontSize: '10px', fontFamily: 'sans-serif', fontStyle: 'italic' } }, "Click melody cells in the grid above to see notation here")
                  );
                })(),
                // Note value reference (SVG-based, not unicode)
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  [
                    { name: 'Whole Note', beats: '4 beats', desc: 'Held for a full bar', filled: false, stem: false },
                    { name: 'Half Note', beats: '2 beats', desc: 'Held for half a bar', filled: false, stem: true },
                    { name: 'Quarter Note', beats: '1 beat', desc: 'One tap per beat', filled: true, stem: true },
                    { name: 'Eighth Note', beats: '\u00BD beat', desc: 'Two per beat (1 & 2 &)', filled: true, stem: true, flag: true }
                  ].map(function (note) {
                    return React.createElement("div", { key: note.name, className: "bg-white/80 rounded-lg p-2 text-center border border-amber-100" },
                      React.createElement("svg", { viewBox: "0 0 30 40", className: "w-8 h-10 mx-auto mb-0.5" },
                        React.createElement("ellipse", { cx: 12, cy: 28, rx: 6, ry: 4, fill: note.filled ? '#8b7355' : 'none', stroke: '#8b7355', strokeWidth: note.filled ? 0 : 1.5, transform: "rotate(-12 12 28)" }),
                        note.stem && React.createElement("line", { x1: 17, y1: 28, x2: 17, y2: 8, stroke: '#8b7355', strokeWidth: 1.5 }),
                        note.flag && React.createElement("path", { d: "M17,8 C22,12 22,18 17,20", stroke: '#8b7355', strokeWidth: 1.5, fill: 'none' })
                      ),
                      React.createElement("div", { className: "text-[11px] font-bold text-amber-800" }, note.name),
                      React.createElement("div", { className: "text-[11px] text-amber-600" }, note.beats),
                      React.createElement("div", { className: "text-[11px] text-amber-500 italic mt-0.5" }, note.desc)
                    );
                  })
                )
              ),

              // ── Rhythm Exercises ──
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-rose-700" }, "\uD83E\uDD4A Rhythm Challenge"),
                  React.createElement("button", { onClick: function () { upd('bpRhythm', RHYTHM_CHALLENGES[Math.floor(Math.random() * RHYTHM_CHALLENGES.length)]); upd('bpRhythmScore', null); },
                    className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm"
                  }, "\uD83C\uDFB2 Challenge me!"),
                  React.createElement("button", { "aria-label": "Random", onClick: function () { upd('bpRhythm', genRandomRhythm()); upd('bpRhythmScore', null); },
                    className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all"
                  }, "\uD83C\uDFB2 Random")
                ),
                d.bpRhythm ? React.createElement("div", null,
                  React.createElement("div", { className: "text-[11px] font-bold text-rose-800 mb-1" }, d.bpRhythm.name + ': ' + d.bpRhythm.desc),
                  React.createElement("div", { className: "flex gap-1 mb-2" },
                    d.bpRhythm.pattern.map(function (v, i) {
                      return React.createElement("div", { key: i, className: "flex-1 h-6 rounded " + (v ? 'bg-rose-500' : 'bg-rose-100 border border-rose-200'), style: { minWidth: '18px' } });
                    })
                  ),
                  React.createElement("div", { className: "text-[11px] text-rose-500 mb-1" }, "Load this rhythm into row 0 (Kick)?"),
                  React.createElement("button", { "aria-label": "Load to Grid",
                    onClick: function () {
                      pushBpUndo();
                      var g = Object.assign({}, d.seqGrid || {});
                      d.bpRhythm.pattern.forEach(function (v, i) { g['0_' + i] = v; });
                      upd('seqGrid', g);
                      addToast('\uD83E\uDD4A Rhythm loaded to Kick!', 'success');
                    },
                    className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-rose-700 text-white hover:bg-rose-600 transition-all"
                  }, "\u25B6 Load to Grid")
                ) : React.createElement("p", { className: "text-[11px] text-rose-400 italic" }, "Click \"Challenge me!\" to practice rhythm patterns")
              ),

              // ── User Sample Upload ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "\uD83D\uDCC2 Your Samples"),
                  React.createElement("span", { className: "text-[11px] text-indigo-400" }, "Upload .wav/.mp3/.ogg \u2022 Max 4"),
                  React.createElement("label", { className: "ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 transition-all shadow-sm" },
                    "\u2B06 Upload",
                    React.createElement("input", { type: "file", accept: ".wav,.mp3,.ogg,audio/*", className: "hidden",
                      onChange: function (e) {
                        var file = e.target.files && e.target.files[0]; if (!file) return;
                        if (file.size > 512000) { addToast('\u26A0\uFE0F File too large (max 500KB)', 'error'); return; }
                        if ((window._alloUserSamples || []).length >= 4) { addToast('\u26A0\uFE0F Max 4 samples', 'error'); return; }
                        var reader = new FileReader();
                        reader.onload = function (ev) {
                          var audio = getCtx(); var ctx = audio.ctx;
                          ctx.decodeAudioData(ev.target.result.slice(0), function (buffer) {
                            window._alloUserSamples = (window._alloUserSamples || []).concat([{ name: file.name.replace(/\.[^.]+$/, ''), buffer: buffer }]);
                            upd('userSampleCount', (window._alloUserSamples || []).length);
                            addToast('\uD83C\uDFB5 Sample loaded!', 'success');
                          }, function () { addToast('\u274C Could not decode audio', 'error'); });
                        };
                        reader.readAsArrayBuffer(file); e.target.value = '';
                      }
                    })
                  )
                ),
                (window._alloUserSamples || []).length > 0
                  ? React.createElement("div", { className: "flex gap-2 flex-wrap" },
                      (window._alloUserSamples || []).map(function (smp, si) {
                        return React.createElement("button", { "aria-label": "Play recorded sample " + (si + 1), key: si, onMouseDown: function () { playUserSample(si); },
                          className: "px-3 py-2 rounded-lg text-[11px] font-bold bg-white border border-indigo-600 text-indigo-700 hover:bg-indigo-50 hover:shadow-sm transition-all flex items-center gap-1"
                        },
                          React.createElement("span", null, "\uD83C\uDFB5"),
                          React.createElement("span", { className: "truncate max-w-[80px]" }, smp.name),
                          React.createElement("span", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  onClick: function (e) { e.stopPropagation(); window._alloUserSamples.splice(si, 1); upd('userSampleCount', window._alloUserSamples.length); }, className: "ml-1 text-red-400 hover:text-red-600 cursor-pointer" }, "\u2715")
                        );
                      })
                    )
                  : React.createElement("p", { className: "text-[11px] text-indigo-400 italic" }, "Upload WAV/MP3 files for custom pads. Samples clear on page refresh.")
              ),

              // ── Song Arrangement ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },
                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\uD83C\uDFB6 Song Arrangement"),
                  React.createElement("span", { className: "text-[11px] text-violet-500" }, "Chain patterns into a full song"),
                  React.createElement("button", { "aria-label": "Add current pattern as a section",
                    onClick: function () {
                      var sections = d.songSections || [];
                      var name = 'Section ' + String.fromCharCode(65 + sections.length); // A, B, C...
                      sections = sections.concat([{ id: Date.now(), name: name, grid: JSON.parse(JSON.stringify(d.seqGrid || {})), melody: (d.beatMelody || []).slice(), bpm: d.seqBPM || 120, color: ['#8b5cf6','#3b82f6','#ef4444','#f59e0b','#10b981','#ec4899'][sections.length % 6] }]);
                      upd('songSections', sections);
                      addToast('\uD83C\uDFB6 Added "' + name + '" to song!', 'success');
                    },
                    className: "ml-auto px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-sm"
                  }, "+ Add Current as Section")
                ),
                (d.songSections && d.songSections.length > 0) ? React.createElement("div", null,
                  // Arrangement timeline
                  React.createElement("div", { className: "flex gap-1 mb-2 overflow-x-auto pb-1" },
                    (d.songArrangement || (d.songSections || []).map(function(s) { return s.id; })).map(function (sectionId, idx) {
                      var section = (d.songSections || []).find(function(s) { return s.id === sectionId; });
                      if (!section) return null;
                      var isPlaying = d.songPlaying && d.songCurrentSection === idx;
                      return React.createElement("div", { key: idx + '_' + sectionId,
                        className: "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-center cursor-pointer transition-all border-2 min-w-[50px] " + (isPlaying ? 'scale-105 shadow-lg' : 'hover:scale-102'),
                        style: { background: section.color + '20', borderColor: isPlaying ? section.color : section.color + '40' },
                        onClick: function () {
                          // Load this section's pattern into the grid
                          upd('seqGrid', JSON.parse(JSON.stringify(section.grid || {})));
                          upd('beatMelody', section.melody ? section.melody.slice() : null);
                          upd('seqBPM', section.bpm || 120);
                          addToast('\uD83C\uDFB5 Loaded "' + section.name + '"', 'info');
                        }
                      },
                        React.createElement("span", { className: "text-[11px] font-bold", style: { color: section.color } }, section.name),
                        React.createElement("span", { className: "text-[11px] text-slate-600" }, (section.bpm || 120) + " BPM"),
                        isPlaying && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse", style: { background: section.color } })
                      );
                    })
                  ),
                  // Song controls
                  React.createElement("div", { className: "flex gap-2 items-center" },
                    React.createElement("button", { "aria-label": "Play full song",
                      onClick: function () {
                        if (d.songPlaying) { upd('songPlaying', false); stopSequencer(); return; }
                        var sections = d.songSections || [];
                        var arrangement = d.songArrangement || sections.map(function(s) { return s.id; });
                        if (arrangement.length === 0) return;
                        upd('songPlaying', true); upd('songCurrentSection', 0);
                        // Load first section
                        var first = sections.find(function(s) { return s.id === arrangement[0]; });
                        if (first) {
                          upd('seqGrid', JSON.parse(JSON.stringify(first.grid || {})));
                          upd('beatMelody', first.melody ? first.melody.slice() : null);
                          upd('seqBPM', first.bpm || 120);
                        }
                        startSequencer();
                        // Auto-advance after each section (16 beats)
                        var beatDuration = 60000 / (first ? first.bpm || 120 : 120);
                        var sectionDuration = beatDuration * 16 / 4; // 16 steps = 4 beats at 4 steps/beat
                        var sectionIdx = 0;
                        function advanceSection() {
                          sectionIdx++;
                          if (sectionIdx >= arrangement.length) {
                            if (d.songLoop) { sectionIdx = 0; } else { upd('songPlaying', false); stopSequencer(); return; }
                          }
                          var next = sections.find(function(s) { return s.id === arrangement[sectionIdx]; });
                          if (next) {
                            upd('songCurrentSection', sectionIdx);
                            upd('seqGrid', JSON.parse(JSON.stringify(next.grid || {})));
                            upd('beatMelody', next.melody ? next.melody.slice() : null);
                            upd('seqBPM', next.bpm || 120);
                            var nextDuration = 60000 / (next.bpm || 120) * 16 / 4;
                            window._alloSongAdvance = setTimeout(advanceSection, nextDuration);
                          }
                        }
                        window._alloSongAdvance = setTimeout(advanceSection, sectionDuration);
                      },
                      className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm " + (d.songPlaying ? 'bg-red-600 text-white animate-pulse' : 'bg-violet-600 text-white hover:bg-violet-700')
                    }, d.songPlaying ? '\u23F9 Stop Song' : '\u25B6 Play Full Song'),
                    React.createElement("label", { className: "flex items-center gap-1 text-[11px] text-violet-600 cursor-pointer" },
                      React.createElement("input", { type: "checkbox", checked: !!d.songLoop, onChange: function () { upd('songLoop', !d.songLoop); }, className: "rounded" }),
                      "Loop"
                    ),
                    React.createElement("span", { className: "text-[11px] text-violet-500 ml-auto" }, (d.songSections || []).length + " sections \u2022 Click to load, drag to reorder"),
                    React.createElement("button", { "aria-label": "Clear arrangement",
                      onClick: function () { upd('songSections', []); upd('songArrangement', null); upd('songPlaying', false); if (window._alloSongAdvance) clearTimeout(window._alloSongAdvance); },
                      className: "px-2 py-1 rounded text-[11px] font-bold text-red-500 hover:bg-red-50 transition-all"
                    }, "\uD83D\uDDD1 Clear")
                  )
                ) : React.createElement("div", { className: "text-center py-3" },
                  React.createElement("p", { className: "text-[11px] text-violet-400 italic mb-2" }, "Create a drum pattern in the grid above, then click \"+ Add Current as Section\" to start building a song."),
                  React.createElement("p", { className: "text-[11px] text-violet-400" }, "Sections: Intro \u2192 Verse \u2192 Chorus \u2192 Bridge \u2192 Chorus \u2192 Outro")
                )
              ),

              // ── Save/Load + Share + Export ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/60 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },
                  React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, "\uD83D\uDCBE Compositions"),
                  React.createElement("button", { "aria-label": "Save",
                    onClick: function () {
                      var name = prompt('Name your composition:', 'Beat ' + new Date().toLocaleDateString());
                      if (!name) return;
                      var comp = { name: name, grid: Object.assign({}, d.seqGrid || {}), melody: (d.beatMelody || []).slice(), bpm: d.seqBPM || 120, kit: d.activeKit || '', swing: d.seqSwing || '0', scale: d.bpScale || 'major', timestamp: Date.now() };
                      var saved = JSON.parse(localStorage.getItem('alloflow_beats') || '[]');
                      saved.push(comp); localStorage.setItem('alloflow_beats', JSON.stringify(saved));
                      upd('beatSaveRefresh', Date.now());
                      addToast('\uD83D\uDCBE Beat saved!', 'success');
                    },
                    className: "px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-700 text-white hover:bg-emerald-700 transition-all shadow-sm"
                  }, "\uD83D\uDCBE Save"),
                  React.createElement("button", { onClick: sharePattern, className: "px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-700 text-white hover:bg-blue-600 transition-all shadow-sm" }, "\uD83D\uDD17 Share URL"),
                  React.createElement("button", { onClick: exportBeat, disabled: d.bpExporting,
                    className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm " + (d.bpExporting ? 'bg-gray-300 text-gray-500' : 'bg-orange-700 text-white hover:bg-orange-600')
                  }, d.bpExporting ? '\u23F3 Recording...' : '\uD83D\uDCE5 Export'),
                  React.createElement("button", { "aria-label": "Snapshot",
                    onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'bp-' + Date.now(), tool: 'synth', label: 'Beat Pad', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); },
                    className: "px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                  }, "\uD83D\uDCF8 Snapshot")
                ),
                (function () {
                  var saved = JSON.parse(localStorage.getItem('alloflow_beats') || '[]');
                  if (saved.length === 0) return React.createElement("p", { className: "text-[11px] text-emerald-400 italic" }, "No saved beats yet. Create a pattern and click Save!");
                  return React.createElement("div", { className: "flex flex-col gap-1 max-h-28 overflow-y-auto" },
                    saved.map(function (comp, ci) {
                      return React.createElement("div", { key: ci, className: "flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-emerald-100" },
                        React.createElement("span", { className: "text-[11px] font-bold text-emerald-700 flex-1 truncate" }, comp.name),
                        React.createElement("span", { className: "text-[11px] text-slate-200" }, (comp.bpm || 120) + " BPM"),
                        React.createElement("button", { onClick: function () {
                            upd('seqGrid', comp.grid || {}); upd('beatMelody', comp.melody || null);
                            upd('seqBPM', comp.bpm || 120); upd('seqSwing', comp.swing || '0');
                            if (comp.scale) upd('bpScale', comp.scale);
                            if (comp.kit && window._alloSampleCache[comp.kit]) upd('activeKit', comp.kit);
                            else if (comp.kit) loadSampleKit(comp.kit);
                            addToast('\uD83C\uDFB5 Loaded!', 'success');
                          },
                          className: "px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }, "\u25B6"),
                        React.createElement("button", { "aria-label": "Delete saved beat",
                          onClick: function () {
                            var s = JSON.parse(localStorage.getItem('alloflow_beats') || '[]');
                            s.splice(ci, 1); localStorage.setItem('alloflow_beats', JSON.stringify(s));
                            upd('beatSaveRefresh', Date.now());
                          },
                          className: "px-1.5 py-0.5 rounded text-[11px] font-bold text-red-700 hover:text-red-600 hover:bg-red-50"
                        }, "\u2715")
                      );
                    })
                  );
                })()
              )
            ),

            // ═══════════ TAB: HARMONYPAD ═══════════
            synthTab === 'harmonypad' && React.createElement("div", null,
              // Voice presets
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDF1F HarmonyPad"),
                  React.createElement("span", { className: "text-[11px] text-amber-600" }, "Pure sine+triangle blend")
                ),
                React.createElement("p", { className: "text-[11px] text-amber-700 mb-3 leading-relaxed" }, "HarmonyPad creates warm, pure tones by blending sine and triangle waves. Choose a voice, pick a chord from the grid below, then strum the plate!"),

                // Voice selector
                React.createElement("div", { className: "flex gap-2 mb-4" },
                  [{ id: 'harp', label: '\uD83C\uDFB5 Harp', desc: t('stem.synth.pure_clean') },
                  { id: 'organ', label: '\u2728 Organ', desc: t('stem.synth.warm_chorus') },
                  { id: 'pad', label: '\uD83C\uDF0A Pad', desc: t('stem.synth.slow_lush') }].map(function (v) {
                    return React.createElement("button", { key: v.id,
                      onClick: function () { upd('omniVoice', v.id); },
                      className: "flex-1 py-2 rounded-lg text-center transition-all " + ((d.omniVoice || 'harp') === v.id ? 'bg-amber-700 text-white shadow-md' : 'bg-white border border-amber-600 text-amber-800 hover:bg-amber-100')
                    },
                      React.createElement("div", { className: "text-xs font-bold" }, v.label),
                      React.createElement("div", { className: "text-[11px] " + ((d.omniVoice || 'harp') === v.id ? 'text-amber-200' : 'text-amber-500') }, v.desc)
                    );
                  })
                ),

                // Chord grid
                React.createElement("div", { className: "mb-4" },
                  React.createElement("div", { className: "text-[11px] font-bold text-amber-700 mb-2" }, "\uD83C\uDFB6 Chord Grid \u2014 tap to select, Space to strum"),
                  React.createElement("div", { className: "grid grid-cols-7 gap-1" },
                    // Header row
                    ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (root) {
                      return React.createElement("div", { key: 'h_' + root, className: "text-center text-[11px] font-bold text-amber-600 py-0.5" }, root);
                    })
                  ),
                  // Chord type rows
                  [{ type: 'Major', label: 'Maj', color: 'from-amber-400 to-amber-500' },
                  { type: 'Minor', label: 'min', color: 'from-rose-400 to-rose-500' },
                  { type: 'Dom7', label: '7th', color: 'from-purple-400 to-purple-500' }].map(function (ct) {
                    return React.createElement("div", { key: ct.type, className: "grid grid-cols-7 gap-1 mt-1" },
                      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (root) {
                        var isActive = d.omniChordRoot === root && d.omniChordType === ct.type;
                        return React.createElement("button", { key: root + ct.type,
                          onClick: function () {
                            upd('omniChordRoot', root); upd('omniChordType', ct.type);
                          },
                          className: "py-2 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-gradient-to-b ' + ct.color + ' text-white shadow-md scale-105' : 'bg-white border border-amber-600 text-amber-800 hover:border-amber-400 hover:bg-amber-50')
                        }, root + ct.label,
                          React.createElement("div", { className: "text-[11px] opacity-40 mt-0.5" }, (function() { var keys = { C: 'QAZ', D: 'WSX', E: 'EDC', F: 'RFV', G: 'TGB', A: 'YHN', B: 'UJM' }; var row = { Major: 0, Minor: 1, Dom7: 2 }; return keys[root] ? keys[root][row[ct.type]] : ''; })())
                        );
                      })
                    );
                  })
                ),

                // Strum plate
                React.createElement("div", { className: "mb-3" },
                  React.createElement("div", { className: "text-[11px] font-bold text-amber-700 mb-2" }, "\uD83C\uDFB8 Strum Plate \u2014 tap or drag across"),
                  React.createElement("div", { className: "flex gap-0.5 bg-gradient-to-b from-amber-100 to-amber-200 rounded-xl p-3 border border-amber-300" },
                    (function () {
                      var chordRoot = d.omniChordRoot || 'C';
                      var chordType = d.omniChordType || 'Major';
                      var chordData = CHORDS[chordType];
                      if (!chordData) return null;
                      var ri = NOTE_NAMES.indexOf(chordRoot);
                      var oct = d.octave || 4;
                      // Build string set: chord notes spread across range
                      var strings = [];
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +1
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 1 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +2
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 2 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +3
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 3 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +4
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 4 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +5
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 5 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      return strings.slice(0, 24).map(function (s, si) {
                        var isPlaying = (d.omniStrumActive || []).indexOf(si) !== -1;
                        return React.createElement("div", {
                          key: si,
                          onMouseDown: function () {
                            playHarmonyTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                            upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                            setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                          },
                          onMouseEnter: function (e) {
                            if (e.buttons === 1) {
                              playHarmonyTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                              upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                              setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                            }
                          },
                          className: "flex-1 rounded-lg cursor-pointer transition-all select-none " + (isPlaying ? 'bg-amber-500 shadow-lg scale-y-105' : 'bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500'),
                          style: { height: '80px', minWidth: '14px' }
                        },
                          React.createElement("div", { className: "text-center pt-1 text-[11px] font-bold " + (isPlaying ? 'text-white' : 'text-amber-800') }, s.note + s.oct),
                          React.createElement("div", { className: "w-px mx-auto h-10 " + (isPlaying ? 'bg-white' : 'bg-amber-600 opacity-40') })
                        );
                      });
                    })()
                  )
                ),

                // Full strum button
                React.createElement("button", { "aria-label": "Strum chord",
                  onClick: function () { strumHarmony(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); },
                  className: "w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all"
                }, "\uD83C\uDFB5 Strum " + (d.omniChordRoot || 'C') + " " + (d.omniChordType || 'Major'))
              )
            ),



            // ═══════════ TAB: THEORY ═══════════
            synthTab === 'theory' && React.createElement("div", null,

              // ═══ INSTRUMENT PETTING ZOO ═══
              React.createElement("div", { className: "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFBB Instrument Explorer"),
                  React.createElement("span", { className: "text-[11px] text-amber-600" }, "Hear, see the waveform, and learn the story of each instrument"),
                  React.createElement("button", { onClick: function() { upd('showInstruments', !d.showInstruments); },
                    className: "ml-auto px-2 py-1 rounded text-[11px] font-bold " + (d.showInstruments ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200') + " transition-all"
                  }, d.showInstruments ? '\u25BC Hide' : '\u25B6 Explore')
                ),
                d.showInstruments && React.createElement("div", null,
                  // Category tabs
                  React.createElement("div", { className: "flex gap-1 mb-3 bg-amber-100/50 rounded-lg p-0.5" },
                    [{ id: 'strings', label: '\uD83C\uDFBB Strings' }, { id: 'woodwinds', label: '\uD83C\uDF43 Woodwinds' }, { id: 'brass', label: '\uD83C\uDFBA Brass' }, { id: 'percussion', label: '\uD83E\uDD41 Percussion' }, { id: 'keys', label: '\uD83C\uDFB9 Keys' }, { id: 'world', label: '\uD83C\uDF0D World' }].map(function(cat) {
                      return React.createElement("button", { key: cat.id,
                        onClick: function() { upd('instCategory', cat.id); },
                        className: "flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all " + ((d.instCategory || 'strings') === cat.id ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-600 hover:text-amber-800')
                      }, cat.label);
                    })
                  ),
                  // Instrument cards
                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                    (function() {
                      var INSTRUMENTS = {
                        strings: [
                          { name: 'Violin', icon: '\uD83C\uDFBB', family: 'Bowed String', range: 'G3-E7', origin: 'Italy, 16th century',
                            waveDesc: 'Rich harmonic series — strong odd AND even harmonics create the signature warmth. The bow creates continuous vibration.',
                            history: 'Developed in northern Italy around 1550 by Andrea Amati. Stradivarius violins (made 1680-1720) are considered the finest ever made — scientists still debate what makes them special. Some theories involve the wood treatment, the varnish, or even a mini ice age that changed tree growth.',
                            cultural: 'Central to European classical music, Irish/Scottish fiddle traditions, Roma/Gypsy music, Indian classical (violin was adopted in the 19th century), and Appalachian folk music.',
                            synth: { type: 'sawtooth', attack: 0.1, sustain: 0.8, vibratoDepth: 0.3, vibratoRate: 5 } },
                          { name: 'Cello', icon: '\uD83C\uDFBB', family: 'Bowed String', range: 'C2-A5', origin: 'Italy, 16th century',
                            waveDesc: 'Deep, warm tone with prominent lower harmonics. The larger body amplifies bass frequencies that resonate in the chest.',
                            history: 'Evolved from the viola da gamba family. Yo-Yo Ma popularized it globally. The cello\'s range closely matches the human voice, which is why it\'s often described as the most "singing" instrument.',
                            cultural: 'European classical, tango orchestras (Argentina), modern film scoring, and increasingly in pop/rock crossover (Apocalyptica, 2Cellos).',
                            synth: { type: 'sawtooth', attack: 0.15, sustain: 0.8, vibratoDepth: 0.2, vibratoRate: 4, octaveShift: -1 } },
                          { name: 'Acoustic Guitar', icon: '\uD83C\uDFB8', family: 'Plucked String', range: 'E2-E6', origin: 'Spain, 15th century',
                            waveDesc: 'Quick attack, gradual decay. Harmonics decay at different rates — high frequencies fade faster, giving the characteristic "warm fade."',
                            history: 'Descended from the Arabic oud via Moorish Spain. The modern 6-string form emerged around 1850. The most played instrument in the world.',
                            cultural: 'Flamenco (Spain), blues/country/folk (US), bossa nova (Brazil), classical (worldwide), rock, pop — truly universal.',
                            synth: { type: 'plucked', attack: 0.001, sustain: 0.1, release: 0.5 } },
                        ],
                        woodwinds: [
                          { name: 'Flute', icon: '\uD83C\uDF43', family: 'Edge-blown', range: 'C4-C7', origin: 'Prehistoric (40,000+ years)',
                            waveDesc: 'Nearly pure sine wave — very few overtones. The breathy quality comes from turbulent air noise mixed with the tone.',
                            history: 'The oldest known instruments are bone flutes from 40,000 years ago found in German caves. The modern metal flute was developed by Theobald Boehm in 1847.',
                            cultural: 'Found in virtually every culture: bansuri (India), shakuhachi (Japan), ney (Middle East), quena (Andes), Western orchestral, Irish/Celtic.',
                            synth: { type: 'sine', attack: 0.05, sustain: 0.7, vibratoDepth: 0.15, vibratoRate: 5 } },
                          { name: 'Clarinet', icon: '\uD83C\uDF43', family: 'Single Reed', range: 'D3-Bb6', origin: 'Germany, ~1700',
                            waveDesc: 'Cylindrical bore produces mainly ODD harmonics (3rd, 5th, 7th) — this gives it a hollow, woody quality distinct from the oboe.',
                            history: 'Invented by Johann Christoph Denner around 1700 from the earlier chalumeau. Mozart loved it and wrote his famous Clarinet Concerto for it.',
                            cultural: 'Classical orchestras, jazz (New Orleans), klezmer (Jewish/Eastern European), Turkish classical, marching bands.',
                            synth: { type: 'square', attack: 0.03, sustain: 0.7, filterCutoff: 3000 } },
                          { name: 'Saxophone', icon: '\uD83C\uDFB7', family: 'Single Reed (metal)', range: 'Bb3-F#6 (alto)', origin: 'Belgium, 1846',
                            waveDesc: 'Conical bore produces ALL harmonics (odd + even), giving a brighter, more complex tone than clarinet despite similar reed mechanism.',
                            history: 'Invented by Adolphe Sax in 1846 — one of the few instruments with a known inventor and exact date. Originally designed for military bands.',
                            cultural: 'Jazz (its defining instrument), R&B, rock (Pink Floyd, Bowie), classical, ska, and West African highlife music.',
                            synth: { type: 'sawtooth', attack: 0.02, sustain: 0.7, filterCutoff: 5000, vibratoDepth: 0.2 } },
                        ],
                        brass: [
                          { name: 'Trumpet', icon: '\uD83C\uDFBA', family: 'Brass', range: 'F#3-D6', origin: 'Ancient (3000+ years)',
                            waveDesc: 'Bright, brilliant tone with strong upper harmonics. The bell shape amplifies high frequencies, creating the characteristic "brassy" ring.',
                            history: 'Ancient trumpets were straight tubes used for signals. The coiled modern trumpet with valves appeared in 1820. Louis Armstrong and Miles Davis transformed it into a solo voice.',
                            cultural: 'Military music (worldwide), jazz, classical, mariachi (Mexico), Balkan brass bands, Ethiopian jazz, ska/reggae.',
                            synth: { type: 'sawtooth', attack: 0.03, sustain: 0.8, filterCutoff: 8000, filterQ: 2 } },
                          { name: 'Trombone', icon: '\uD83C\uDFBA', family: 'Brass (slide)', range: 'E2-Bb4', origin: 'Europe, 15th century',
                            waveDesc: 'Warm, round tone in low register, increasingly bright higher up. The slide allows true glissando — continuous pitch bending unique among brass.',
                            history: 'Called "sackbut" in the Renaissance. The only brass instrument that can play true glissando (smooth pitch slides). Essential in jazz since the 1920s.',
                            cultural: 'Classical/orchestral, jazz big bands, New Orleans second line, salsa, ska.',
                            synth: { type: 'sawtooth', attack: 0.05, sustain: 0.7, filterCutoff: 4000 } },
                        ],
                        percussion: [
                          { name: 'Drum Kit', icon: '\uD83E\uDD41', family: 'Membranophone', range: 'Unpitched', origin: 'USA, early 1900s',
                            waveDesc: 'Complex noise-like spectrum. Kick drum = low sine sweep. Snare = noise burst + body tone. Hi-hat = high-frequency noise.',
                            history: 'The modern drum kit was assembled in New Orleans in the early 1900s when one player combined bass drum, snare, and cymbals with foot pedals. Jazz demanded it.',
                            cultural: 'Rock, pop, jazz, funk, hip-hop — the backbone of virtually all popular music worldwide.',
                            synth: { type: 'drum', attack: 0.001, sustain: 0.1 } },
                          { name: 'Marimba', icon: '\uD83C\uDFB6', family: 'Idiophone', range: 'C2-C7', origin: 'Central America/Africa',
                            waveDesc: 'Pure, warm tone with a prominent fundamental and fast-decaying upper harmonics. Resonator tubes amplify specific frequencies.',
                            history: 'Descended from African balafon, brought to Central America via the slave trade. National instrument of Guatemala and Costa Rica.',
                            cultural: 'Central American folk music, West African griot tradition, Japanese concert music, modern orchestral.',
                            synth: { type: 'sine', attack: 0.001, sustain: 0.2, release: 0.8 } },
                        ],
                        keys: [
                          { name: 'Piano', icon: '\uD83C\uDFB9', family: 'Struck String', range: 'A0-C8', origin: 'Italy, 1700',
                            waveDesc: 'Extremely rich harmonic spectrum. Hammers striking strings create a sharp attack followed by complex decay. Each note has slightly inharmonic overtones.',
                            history: 'Invented by Bartolomeo Cristofori around 1700 as the "pianoforte" (soft-loud) — the first keyboard that could play dynamics. Has 88 keys spanning over 7 octaves.',
                            cultural: 'Classical (Beethoven, Chopin, Liszt), jazz, blues, ragtime, pop, rock — the most versatile solo instrument ever created.',
                            synth: { type: 'plucked', attack: 0.001, sustain: 0.3, release: 1.0 } },
                          { name: 'Organ', icon: '\u26EA', family: 'Aerophone/Electronic', range: 'C1-C8', origin: 'Ancient Greece, 3rd century BC',
                            waveDesc: 'Steady, sustained tone with no decay. Different "stops" add specific harmonics — each pipe produces a nearly pure sine wave.',
                            history: 'The hydraulis (water organ) was invented in Alexandria around 250 BC. The pipe organ became the primary instrument of Christian worship for 1,000+ years. The largest have 33,000+ pipes.',
                            cultural: 'Church/liturgical music (worldwide), Bach, gospel, jazz (Hammond B3), progressive rock (Yes, ELP).',
                            synth: { type: 'sine', attack: 0.01, sustain: 0.95, release: 0.1 } },
                        ],
                        world: [
                          { name: 'Sitar', icon: '\uD83C\uDF10', family: 'Plucked String', range: 'C2-C5', origin: 'India/Persia, 13th century',
                            waveDesc: 'Distinctive buzzing "jawari" quality from strings vibrating against a curved bridge. Sympathetic strings resonate creating a shimmering halo of sound.',
                            history: 'Evolved from the Persian setar. Has 18-21 strings but only 6-7 are played — the rest vibrate sympathetically. Ravi Shankar brought it to Western audiences in the 1960s.',
                            cultural: 'North Indian classical (Hindustani) music, ragas. George Harrison introduced it to rock via the Beatles. Essential to Indian film music.',
                            synth: { type: 'sawtooth', attack: 0.001, sustain: 0.3, vibratoDepth: 0.4, vibratoRate: 6, filterCutoff: 4000, filterQ: 6 } },
                          { name: 'Djembe', icon: '\uD83E\uDD41', family: 'Hand Drum', range: 'Unpitched', origin: 'West Africa, 12th century',
                            waveDesc: 'Three distinct tones: bass (center), tone (edge), slap (rim). Each excites different drum head modes — physics of circular membrane vibration.',
                            history: 'Originated with the Mandinka people of Mali. Name means "everyone gather together in peace." Traditionally carved from a single log with goatskin head.',
                            cultural: 'West African ceremony and celebration, drum circles worldwide, modern world music fusion. Connected to griot oral tradition.',
                            synth: { type: 'drum', attack: 0.001, sustain: 0.15 } },
                          { name: 'Erhu', icon: '\uD83C\uDFBB', family: 'Bowed String', range: 'D4-D7', origin: 'China, 10th century',
                            waveDesc: 'Hauntingly vocal quality from snakeskin resonator. Only 2 strings — all notes come from finger pressure, no frets. Extremely expressive vibrato.',
                            history: 'Part of the huqin family, developed during the Tang Dynasty. Called the "Chinese violin" in the West. Has only 2 strings but can express the full range of human emotion.',
                            cultural: 'Chinese classical and folk music, Beijing opera, modern Chinese pop, film scoring (Crouching Tiger, Hidden Dragon).',
                            synth: { type: 'sawtooth', attack: 0.05, sustain: 0.8, vibratoDepth: 0.5, vibratoRate: 5, filterCutoff: 3000 } },
                          { name: 'Didgeridoo', icon: '\uD83C\uDF10', family: 'Aerophone', range: 'Drone (50-80 Hz)', origin: 'Australia, 1500+ years',
                            waveDesc: 'Deep drone with rich overtones controlled by mouth shape. Circular breathing allows continuous sound — the player breathes in through the nose while pushing air out with cheeks.',
                            history: 'One of the oldest wind instruments, developed by Aboriginal Australians of northern Australia. Originally made from eucalyptus branches hollowed by termites.',
                            cultural: 'Aboriginal Australian ceremony, modern world music, meditation/sound healing. A symbol of Australian Indigenous culture.',
                            synth: { type: 'sawtooth', attack: 0.1, sustain: 0.95, filterCutoff: 600, filterQ: 4, vibratoDepth: 0.1 } },
                          { name: 'Koto', icon: '\uD83C\uDFB6', family: 'Plucked String', range: 'D2-D5', origin: 'Japan, 7th century',
                            waveDesc: 'Clean, bright plucked tone with fast decay. Movable bridges allow instant retuning. Each note rings clearly with minimal sustain.',
                            history: 'Derived from the Chinese guzheng, brought to Japan in the 7th century. Has 13 strings on a 6-foot body. Traditionally played by women of the imperial court.',
                            cultural: 'Japanese classical music (gagaku), traditional ceremony, modern J-pop arrangements, Miyagi Michio\'s famous "Spring Sea" (1929).',
                            synth: { type: 'plucked', attack: 0.001, sustain: 0.15, release: 0.6 } },
                        ],
                      };
                      var category = d.instCategory || 'strings';
                      return (INSTRUMENTS[category] || []).map(function(inst) {
                        var isExpanded = d.expandedInst === inst.name;
                        return React.createElement("div", { key: inst.name,
                          className: "bg-white rounded-xl border transition-all " + (isExpanded ? 'border-amber-400 shadow-lg col-span-1 sm:col-span-2' : 'border-amber-100 hover:border-amber-300 hover:shadow-md')
                        },
                          // Header (always visible)
                          React.createElement("div", {
                            className: "p-3 cursor-pointer flex items-center gap-3",
                            onClick: function() { upd('expandedInst', isExpanded ? null : inst.name); }
                          },
                            React.createElement("span", { className: "text-2xl" }, inst.icon),
                            React.createElement("div", { className: "flex-1 min-w-0" },
                              React.createElement("div", { className: "flex items-center gap-2" },
                                React.createElement("span", { className: "text-sm font-bold text-slate-800" }, inst.name),
                                React.createElement("span", { className: "text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold" }, inst.family)
                              ),
                              React.createElement("div", { className: "text-[11px] text-slate-600" }, inst.origin + ' \u2022 Range: ' + inst.range)
                            ),
                            // Play button
                            React.createElement("button", {
                              onClick: function(e) {
                                e.stopPropagation();
                                var s = inst.synth;
                                if (s.type === 'drum') { playDrum('kick'); setTimeout(function() { playDrum('snare'); }, 200); return; }
                                // Temporarily set synth params to approximate instrument
                                var origWave = d.waveType; var origEngine = d.synthEngine;
                                if (s.type === 'plucked') {
                                  playPlucked(noteFreq('A', (s.octaveShift || 0) + 4), 'inst_demo', s.ksBrightness || 0.8, s.ksDamping || 0.996);
                                } else {
                                  upd('waveType', s.type); upd('synthEngine', 'standard');
                                  var freq2 = noteFreq('A', (s.octaveShift || 0) + 4);
                                  playNoteFor(freq2, 'inst_demo', 1500);
                                  setTimeout(function() { upd('waveType', origWave); upd('synthEngine', origEngine); }, 100);
                                }
                              },
                              className: "shrink-0 w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center hover:bg-amber-600 transition-all shadow-sm",
                              title: "Hear " + inst.name
                            }, "\u25B6"),
                            React.createElement("span", { className: "text-slate-200 text-xs shrink-0" }, isExpanded ? '\u25B2' : '\u25BC')
                          ),
                          // Expanded detail
                          isExpanded && React.createElement("div", { className: "px-3 pb-3 space-y-2 border-t border-amber-100 pt-2 animate-in fade-in duration-200" },
                            // Waveform visualization canvas + description
                            React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-100" },
                              React.createElement("div", { className: "text-[11px] font-bold text-purple-700 mb-1" }, "\u223F Waveform & Harmonics"),
                              // Canvas that draws the instrument's waveform shape
                              React.createElement("canvas", {
                                style: { width: '100%', height: '60px', display: 'block', borderRadius: '6px', background: '#1a0a2e' },
                                ref: function(canvas) {
                                  if (!canvas) return;
                                  var g = canvas.getContext('2d');
                                  var W = canvas.width = canvas.offsetWidth * 2;
                                  var H = canvas.height = 120;
                                  g.clearRect(0, 0, W, H);
                                  // Draw waveform based on instrument's harmonic content
                                  var wType = inst.synth.type;
                                  g.strokeStyle = '#a78bfa'; g.lineWidth = 2;
                                  g.beginPath();
                                  for (var xi = 0; xi < W; xi++) {
                                    var t2 = xi / W * Math.PI * 4;
                                    var y2 = 0;
                                    if (wType === 'sine') { y2 = Math.sin(t2); }
                                    else if (wType === 'square') { for (var hn = 1; hn <= 7; hn += 2) y2 += Math.sin(t2 * hn) / hn; }
                                    else if (wType === 'sawtooth') { for (var hn2 = 1; hn2 <= 8; hn2++) y2 += Math.sin(t2 * hn2) / hn2 * (hn2 % 2 === 0 ? -1 : 1); }
                                    else if (wType === 'triangle') { for (var hn3 = 1; hn3 <= 7; hn3 += 2) y2 += Math.sin(t2 * hn3) / (hn3 * hn3) * (((hn3 - 1) / 2) % 2 === 0 ? 1 : -1); }
                                    else if (wType === 'plucked') { y2 = Math.sin(t2) * Math.exp(-xi / W * 3) + Math.sin(t2 * 2) * 0.3 * Math.exp(-xi / W * 4); }
                                    else { y2 = Math.sin(t2); }
                                    var py = H / 2 - y2 * H * 0.35;
                                    if (xi === 0) g.moveTo(xi, py); else g.lineTo(xi, py);
                                  }
                                  g.stroke();
                                  // Harmonic bars on the right
                                  var harmonicAmps = wType === 'sine' ? [1] : wType === 'square' ? [1, 0, 0.33, 0, 0.2, 0, 0.14] : wType === 'sawtooth' ? [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14] : wType === 'triangle' ? [1, 0, 0.11, 0, 0.04] : wType === 'plucked' ? [1, 0.3, 0.15, 0.08, 0.04] : [1];
                                  g.fillStyle = 'rgba(255,255,255,0.15)'; g.font = '8px monospace'; g.textAlign = 'center';
                                  harmonicAmps.forEach(function(amp, hi) {
                                    var bx = W - 60 + hi * 8; var bh = amp * H * 0.4;
                                    g.fillStyle = 'hsla(' + (hi * 40) + ',70%,60%,' + (0.3 + amp * 0.5) + ')';
                                    g.fillRect(bx, H - bh - 5, 6, bh);
                                    g.fillStyle = 'rgba(255,255,255,0.3)';
                                    g.fillText(String(hi + 1), bx + 3, H - 1);
                                  });
                                  // Labels
                                  g.fillStyle = 'rgba(255,255,255,0.3)'; g.font = '9px system-ui'; g.textAlign = 'left';
                                  g.fillText('WAVEFORM', 4, 10);
                                  g.textAlign = 'right';
                                  g.fillText('HARMONICS', W - 4, 10);
                                }
                              }),
                              React.createElement("p", { className: "text-[11px] text-purple-600 leading-relaxed mt-1" }, inst.waveDesc)
                            ),

                            // Interactive note player
                            React.createElement("div", { className: "bg-blue-50 rounded-lg p-2 border border-blue-100" },
                              React.createElement("div", { className: "text-[11px] font-bold text-blue-700 mb-1" }, "\uD83C\uDFB5 Play Notes \u2014 Hear how " + inst.name + " sounds across its range"),
                              React.createElement("div", { className: "flex gap-1 flex-wrap" },
                                (function() {
                                  // Generate playable notes based on instrument range
                                  var notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                                  var startOct = inst.synth.octaveShift ? 4 + inst.synth.octaveShift : (inst.range.match(/(\d)/) ? parseInt(inst.range.match(/(\d)/)[1]) : 4);
                                  var playableNotes = [];
                                  for (var oc2 = startOct; oc2 <= startOct + 1; oc2++) {
                                    notes.forEach(function(n) { playableNotes.push({ note: n, octave: oc2 }); });
                                  }
                                  return playableNotes.map(function(pn, pni) {
                                    return React.createElement("button", { key: pni,
                                      onClick: function() {
                                        var freq3 = noteFreq(pn.note, pn.octave);
                                        var s = inst.synth;
                                        if (s.type === 'plucked') { playPlucked(freq3, 'inst_' + pni, s.ksBrightness || 0.8, s.ksDamping || 0.996); }
                                        else if (s.type === 'drum') { playDrum(pni % 2 === 0 ? 'kick' : 'snare'); }
                                        else {
                                          // Set instrument-appropriate params temporarily
                                          var origW = d.waveType; upd('waveType', s.type);
                                          playNoteFor(freq3, 'inst_' + pni, 800);
                                          setTimeout(function() { upd('waveType', origW); }, 50);
                                        }
                                      },
                                      className: "px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border hover:shadow-md hover:scale-105 active:scale-95 " + (d['instNoteActive_' + pni] ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-600 hover:bg-blue-50'),
                                      style: { minWidth: '32px' }
                                    }, pn.note + pn.octave);
                                  });
                                })()
                              ),
                              inst.synth.type !== 'drum' && React.createElement("div", { className: "flex gap-2 mt-2 items-center" },
                                React.createElement("span", { className: "text-[11px] text-blue-500" }, "Play a scale:"),
                                React.createElement("button", {
                                  onClick: function() {
                                    var startOct2 = inst.synth.octaveShift ? 4 + inst.synth.octaveShift : 4;
                                    var scaleNotes2 = [0,2,4,5,7,9,11,12]; // Major scale
                                    scaleNotes2.forEach(function(semi, si) {
                                      setTimeout(function() {
                                        var freq4 = noteFreq('C', startOct2) * Math.pow(2, semi / 12);
                                        var s = inst.synth;
                                        if (s.type === 'plucked') playPlucked(freq4, 'inst_scale_' + si, 0.8, 0.996);
                                        else {
                                          var origW2 = d.waveType; upd('waveType', s.type);
                                          playNoteFor(freq4, 'inst_scale_' + si, 400);
                                          setTimeout(function() { upd('waveType', origW2); }, 50);
                                        }
                                      }, si * 300);
                                    });
                                  },
                                  className: "px-2 py-1 rounded text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                                }, "\u25B6 C Major Scale"),
                                React.createElement("button", {
                                  onClick: function() {
                                    var startOct3 = inst.synth.octaveShift ? 4 + inst.synth.octaveShift : 4;
                                    var chromatic = [0,1,2,3,4,5,6,7,8,9,10,11,12];
                                    chromatic.forEach(function(semi, si) {
                                      setTimeout(function() {
                                        var freq5 = noteFreq('C', startOct3) * Math.pow(2, semi / 12);
                                        var s = inst.synth;
                                        if (s.type === 'plucked') playPlucked(freq5, 'inst_chrom_' + si, 0.8, 0.996);
                                        else {
                                          var origW3 = d.waveType; upd('waveType', s.type);
                                          playNoteFor(freq5, 'inst_chrom_' + si, 250);
                                          setTimeout(function() { upd('waveType', origW3); }, 50);
                                        }
                                      }, si * 200);
                                    });
                                  },
                                  className: "px-2 py-1 rounded text-[11px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                                }, "\u25B6 Chromatic")
                              )
                            ),

                            // History
                            React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-100" },
                              React.createElement("div", { className: "text-[11px] font-bold text-amber-700 mb-0.5" }, "\uD83D\uDCDC History"),
                              React.createElement("p", { className: "text-[11px] text-amber-700 leading-relaxed" }, inst.history)
                            ),
                            // Cultural connections
                            React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2 border border-emerald-100" },
                              React.createElement("div", { className: "text-[11px] font-bold text-emerald-700 mb-0.5" }, "\uD83C\uDF0D Cultural Connections"),
                              React.createElement("p", { className: "text-[11px] text-emerald-700 leading-relaxed" }, inst.cultural)
                            )
                          )
                        );
                      });
                    })()
                  )
                )
              ),

              // Intervals
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83D\uDCCF Intervals"),
                  React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.intervals.text }, "\u2753")
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-1" },
                  INTERVALS.map(function (intv) {
                    var qColors = { perfect: 'bg-green-50 border-green-200 text-green-700', consonant: 'bg-blue-50 border-blue-200 text-blue-700', dissonant: 'bg-red-50 border-red-200 text-red-700' };
                    return React.createElement("button", { "aria-label": intv.name + " interval",
                      key: intv.name,
                      onClick: function () {
                        var base = noteFreq(selectedRoot, d.octave || 4);
                        playNoteFor(base, 'intv_base', 600);
                        setTimeout(function () { playNoteFor(base * Math.pow(2, intv.semitones / 12), 'intv_top', 600); }, 400);
                      },
                      className: "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all hover:shadow-sm " + (qColors[intv.quality] || 'bg-slate-50 border-slate-200')
                    },
                      React.createElement("span", { className: "text-[11px] font-bold" }, intv.name),
                      React.createElement("span", { className: "text-[11px] text-slate-600 ml-auto" }, intv.ratio),
                      React.createElement("span", { className: "text-[11px] text-slate-200 hidden sm:inline" }, intv.song)
                    );
                  })
                )
              ),

              // Harmonic Series
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDF10 Harmonic Series"),
                  React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.harmonicSeries.text }, "\u2753")
                ),
                React.createElement("div", { className: "flex gap-2" },
                  HARMONICS_INFO.map(function (h) {
                    var isHarmActive = (d.activeHarmonics || [1]).indexOf(h.n) !== -1;
                    return React.createElement("button", { "aria-label": "Toggle harmonic " + h.n,
                      key: h.n,
                      onClick: function () {
                        playHarmonic(h.n);
                        var cur = d.activeHarmonics || [1];
                        var next = isHarmActive && h.n !== 1 ? cur.filter(function(x) { return x !== h.n; }) : cur.indexOf(h.n) === -1 ? cur.concat([h.n]) : cur;
                        upd('activeHarmonics', next);
                      },
                      className: "flex-1 py-3 rounded-xl border text-center hover:shadow-md transition-all group cursor-pointer " + (isHarmActive ? 'bg-gradient-to-b from-indigo-500 to-purple-500 border-indigo-400 text-white shadow-md' : 'bg-gradient-to-b from-indigo-50 to-purple-50 border-indigo-200')
                    },
                      React.createElement("span", { className: "text-lg font-bold block group-hover:scale-110 transition-transform " + (isHarmActive ? 'text-white' : 'text-indigo-600') }, h.n),
                      React.createElement("span", { className: "text-[11px] block " + (isHarmActive ? 'text-indigo-200' : 'text-indigo-400') }, h.ratio),
                      React.createElement("span", { className: "text-[11px] block " + (isHarmActive ? 'text-indigo-200' : 'text-slate-200') }, h.interval)
                    );
                  })
                ),
                // Visual waveform builder — shows how active harmonics combine
                React.createElement("div", { className: "mt-3 rounded-xl overflow-hidden border border-indigo-200", style: { height: '80px' } },
                  React.createElement("canvas", {
                    style: { width: '100%', height: '100%', display: 'block', background: '#0f0a1e' },
                    key: 'harmCanvas_' + (d.activeHarmonics || [1]).join('_'),
                    ref: function(canvas) {
                      if (!canvas) return;
                      var g = canvas.getContext('2d');
                      var W = canvas.width = canvas.offsetWidth * 2;
                      var H = canvas.height = 160;
                      g.clearRect(0, 0, W, H);
                      var harmonics = d.activeHarmonics || [1];
                      // Draw individual harmonics (faint)
                      harmonics.forEach(function(hn, hi) {
                        g.strokeStyle = 'hsla(' + (hn * 40) + ',70%,60%,0.2)';
                        g.lineWidth = 1; g.beginPath();
                        for (var xi = 0; xi < W; xi++) {
                          var t3 = xi / W * Math.PI * 4;
                          var y3 = Math.sin(t3 * hn) / hn;
                          var py2 = H / 2 - y3 * H * 0.35;
                          if (xi === 0) g.moveTo(xi, py2); else g.lineTo(xi, py2);
                        }
                        g.stroke();
                      });
                      // Draw combined waveform (bright)
                      g.strokeStyle = '#a78bfa'; g.lineWidth = 2.5; g.beginPath();
                      for (var xi2 = 0; xi2 < W; xi2++) {
                        var t4 = xi2 / W * Math.PI * 4;
                        var sum = 0;
                        harmonics.forEach(function(hn2) { sum += Math.sin(t4 * hn2) / hn2; });
                        var py3 = H / 2 - sum * H * 0.3;
                        if (xi2 === 0) g.moveTo(xi2, py3); else g.lineTo(xi2, py3);
                      }
                      g.stroke();
                      // Labels
                      g.fillStyle = 'rgba(255,255,255,0.3)'; g.font = '10px system-ui';
                      g.fillText('Active harmonics: ' + harmonics.sort(function(a,b){return a-b;}).join(', '), 8, 14);
                      g.textAlign = 'right';
                      var waveType2 = harmonics.length === 1 ? 'Sine (pure)' : harmonics.every(function(h2){return h2%2===1;}) ? 'Odd harmonics (square/clarinet-like)' : 'All harmonics (sawtooth/violin-like)';
                      g.fillText(waveType2, W - 8, 14);
                      // Play combined button instruction
                      g.fillStyle = 'rgba(167,139,250,0.4)'; g.font = '9px system-ui'; g.textAlign = 'center';
                      g.fillText('Click harmonics above to add/remove \u2014 watch the wave change!', W / 2, H - 6);
                    }
                  })
                ),
                React.createElement("button", {
                  onClick: function() {
                    var harmonics2 = d.activeHarmonics || [1];
                    var baseFreq2 = noteFreq(selectedRoot, d.octave || 4);
                    harmonics2.forEach(function(hn, hi) {
                      setTimeout(function() { playNoteFor(baseFreq2 * hn, 'harm_combo_' + hn, 1200); }, hi * 50);
                    });
                  },
                  className: "mt-2 w-full py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                }, "\u25B6 Play All Active Harmonics Together (" + (d.activeHarmonics || [1]).length + " partials)"),
                React.createElement("p", { className: "text-[11px] text-indigo-500 mt-1 text-center italic" },
                  "This is how different instruments get their unique sound! A flute is mostly harmonic 1 (sine). A clarinet has odd harmonics (1,3,5,7). A violin has all harmonics. Click to build your own timbre!"
                )
              ),

              // Ear Training
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-emerald-800" }, "\uD83D\uDC42 Ear Training"),
                  React.createElement("button", { "aria-label": "Replay",
                    onClick: startIntervalGame,
                    className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-700"
                  }, intervalGame ? '\uD83D\uDD04 New Interval' : '\u25B6 Start'),
                  intervalGame && React.createElement("button", { "aria-label": "Replay",
                    onClick: replayInterval,
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700"
                  }, '\uD83D\uDD0A Replay')
                ),
                intervalGame && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-2" }, "What interval do you hear?"),
                  intervalGame.score > 0 && React.createElement("span", { className: "text-[11px] font-bold text-emerald-600 mr-2" }, "\u2B50 Score: " + intervalGame.score + " | \uD83D\uDD25 Streak: " + intervalGame.streak),
                  React.createElement("div", { className: "grid grid-cols-4 gap-1 mt-2" },
                    INTERVALS.slice(1).map(function (intv) {
                      var isCorrect = intervalGame.answered && intv.name === intervalGame.answer;
                      var isChosen = intervalGame.chosen === intv.name;
                      var isWrong = intervalGame.answered && isChosen && !isCorrect;
                      return React.createElement("button", { "aria-label": "Guess: " + intv.name,
                        key: intv.name,
                        disabled: intervalGame.answered,
                        onClick: function () {
                          var correct = intv.name === intervalGame.answer;
                          upd('intervalGame', Object.assign({}, intervalGame, { answered: true, chosen: intv.name, score: intervalGame.score + (correct ? 1 : 0), streak: correct ? intervalGame.streak + 1 : 0 }));
                          addToast(correct ? '\u2705 Correct! ' + intv.name : '\u274C ' + t('stem.dissection.it_was') + ' ' + intervalGame.answer, correct ? 'success' : 'error');
                        },
                        className: "px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all " + (isCorrect ? 'bg-green-100 border-green-400 text-green-700' : isWrong ? 'bg-red-100 border-red-400 text-red-600' : 'bg-white border-emerald-600 text-slate-700 hover:border-emerald-400')
                      }, intv.name);
                    })
                  )
                )
              ),

              // Filter Lab
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83C\uDF0A Filter Lab"),
                  React.createElement("span", { className: "text-[11px] text-slate-600 cursor-help", title: EFFECT_TIPS.filter.text }, "\u2753")
                ),
                React.createElement("svg", { viewBox: "0 0 300 100", className: "w-full bg-slate-50 rounded-lg mb-2", style: { maxHeight: '100px' } },
                  React.createElement("line", { x1: 20, y1: 80, x2: 280, y2: 80, stroke: "#e2e8f0", strokeWidth: 1 }),
                  React.createElement("line", { x1: 20, y1: 20, x2: 20, y2: 80, stroke: "#e2e8f0", strokeWidth: 1 }),
                  (function () {
                    var cutoff = (d.filterCutoff || 8000) / 12000;
                    var q = (d.filterQ || 1) / 20;
                    var type = d.filterType || 'lowpass';
                    var pts = [];
                    for (var i = 0; i <= 260; i += 2) {
                      var freq = i / 260;
                      var response;
                      if (type === 'lowpass') {
                        var dist = freq - cutoff;
                        response = dist <= 0 ? 1 : Math.max(0, 1 - dist * 3);
                        if (Math.abs(dist) < 0.1) response = Math.min(1, response + q * Math.max(0, 1 - Math.abs(dist) * 10));
                      } else if (type === 'highpass') {
                        var dist = cutoff - freq;
                        response = dist <= 0 ? 1 : Math.max(0, 1 - dist * 3);
                        if (Math.abs(dist) < 0.1) response = Math.min(1, response + q * Math.max(0, 1 - Math.abs(dist) * 10));
                      } else {
                        var dist = Math.abs(freq - cutoff);
                        response = Math.max(0, 1 - dist * 5) * (0.5 + q * 0.5);
                      }
                      pts.push((20 + i) + ',' + (80 - response * 55));
                    }
                    return React.createElement("polyline", { points: pts.join(' '), fill: "none", stroke: "#06b6d4", strokeWidth: 2 });
                  })(),
                  React.createElement("text", { x: 25, y: 95, fill: "#94a3b8", style: { fontSize: "8px" } }, "20Hz"),
                  React.createElement("text", { x: 250, y: 95, fill: "#94a3b8", style: { fontSize: "8px" } }, "20kHz"),
                  React.createElement("text", { x: 5, y: 25, fill: "#94a3b8", style: { fontSize: "8px" } }, "0dB")
                ),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                  ['lowpass', 'highpass', 'bandpass'].map(function (ft) {
                    return React.createElement("button", { key: ft,
                      onClick: function () { upd('filterType', ft); },
                      className: "py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all " + ((d.filterType || 'lowpass') === ft ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600')
                    }, ft);
                  })
                )
              ),

              // Karplus-Strong Lab
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "\uD83C\uDFB8 Karplus-Strong Lab"),
                  React.createElement("span", { className: "text-[11px] text-amber-500 cursor-help", title: EFFECT_TIPS.karplusStrong.text }, "\u2753")
                ),
                React.createElement("p", { className: "text-[11px] text-amber-700 mb-3 leading-relaxed" }, "Karplus-Strong synthesis creates realistic plucked string sounds using a short noise burst fed into a delay line with filtered feedback. Adjust brightness (initial noise color) and damping (sustain length) to shape the string character."),
                React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },
                  [{ label: '\uD83C\uDFB8 Bright Guitar', brightness: 0.95, damping: 0.998 },
                  { label: '\uD83E\uDE95 Banjo', brightness: 0.99, damping: 0.993 },
                  { label: '\uD83C\uDFBB Warm Bass', brightness: 0.3, damping: 0.999 }].map(function (preset) {
                    return React.createElement("button", { key: preset.label,
                      onClick: function () {
                        upd('ksBrightness', preset.brightness); upd('ksDamping', preset.damping); upd('synthEngine', 'plucked');
                        playPlucked(noteFreq(selectedRoot, d.octave || 4), 'ks_demo', preset.brightness, preset.damping);
                      },
                      className: "py-2 rounded-lg text-[11px] font-bold bg-white border border-amber-600 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all"
                    }, preset.label);
                  })
                ),
                [{ k: 'ksBrightness', label: t('stem.synth.brightness'), min: 0.1, max: 1, step: 0.01 },
                { k: 'ksDamping', label: t('stem.synth.sustaindamping'), min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
                  return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-[11px] font-bold text-amber-700 w-24" }, p.label),
                    React.createElement("input", { type: "range", min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-amber-500" }),
                    React.createElement("span", { className: "text-[11px] text-amber-600 w-14 text-right font-mono" }, (d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996)).toFixed(p.k === 'ksDamping' ? 4 : 2))
                  );
                }),
                React.createElement("button", { "aria-label": "Music Theory Quiz",
                  onClick: function () { playPlucked(noteFreq(selectedRoot, d.octave || 4), 'ks_test', d.ksBrightness || 0.8, d.ksDamping || 0.996); },
                  className: "mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-700 text-white hover:bg-amber-700 transition-all w-full"
                }, "\uD83C\uDFB8 Pluck " + selectedRoot + (d.octave || 4))
              ),

              // Music Theory Quiz (moved from Quiz tab)
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, "\uD83E\uDDE0 Music Theory Quiz"),
                  d.quizScore2 > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.quizScore2 + "/" + (d.quizTotal2 || 0)),
                  d.quizStreak2 > 0 && React.createElement("span", { className: "text-xs font-bold text-amber-500" }, "\uD83D\uDD25 " + d.quizStreak2)
                ),
                (function () {
                  var qIdx = d.quizIdx2 || 0; var q = MUSIC_QUIZ[qIdx % MUSIC_QUIZ.length];
                  return React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-purple-700 mb-1" }, "Q" + (qIdx + 1) + " of " + MUSIC_QUIZ.length),
                    React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, q.q),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                      q.opts.map(function (opt) {
                        var fb = d.quizFeedback2;
                        var isCorrect = fb && opt === q.a;
                        var isChosen = fb && fb.chosen === opt;
                        var isWrong = isChosen && !isCorrect;
                        return React.createElement("button", { "aria-label": "Guess: " + opt,
                          key: opt,
                          disabled: !!fb,
                          onClick: function () {
                            var correct = opt === q.a;
                            upd('quizFeedback2', { correct: correct, chosen: opt });
                            upd('quizScore2', (d.quizScore2 || 0) + (correct ? 1 : 0));
                            upd('quizTotal2', (d.quizTotal2 || 0) + 1);
                            upd('quizStreak2', correct ? (d.quizStreak2 || 0) + 1 : 0);
                            addToast(correct ? '\u2705 Correct!' : '\u274C The answer is: ' + q.a, correct ? 'success' : 'error');
                          },
                          className: "px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-600' : fb ? 'border-slate-200 bg-slate-50 text-slate-200' : 'border-purple-600 bg-white text-slate-700 hover:border-purple-400 hover:bg-purple-50')
                        }, opt);
                      })
                    ),
                    d.quizFeedback2 && React.createElement("div", { className: "mt-3 flex justify-center" },
                      React.createElement("button", { "aria-label": "Next Question",
                        onClick: function () { upd('quizIdx2', (d.quizIdx2 || 0) + 1); upd('quizFeedback2', null); },
                        className: "px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                      }, "Next Question \u2192")
                    )
                  );
                })()
              ),

              // ── Chord Detection Challenge ──
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-rose-800" }, "\uD83C\uDFB5 Chord Detection"),
                  d.chordDetectScore > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.chordDetectScore + "/" + (d.chordDetectTotal || 0)),
                  React.createElement("button", { "aria-label": "Play Chord",
                    onClick: function () {
                      var chordNames = ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4'];
                      var roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                      var correctType = chordNames[Math.floor(Math.random() * chordNames.length)];
                      var correctRoot = roots[Math.floor(Math.random() * roots.length)];
                      var wrongOpts = chordNames.filter(function (c) { return c !== correctType; });
                      wrongOpts.sort(function () { return Math.random() - 0.5; });
                      var opts = [correctType].concat(wrongOpts.slice(0, 3));
                      opts.sort(function () { return Math.random() - 0.5; });
                      playChord(correctRoot, correctType, 0);
                      upd('chordDetect', { root: correctRoot, type: correctType, opts: opts, answered: false, chosen: null });
                    },
                    className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                  }, d.chordDetect ? '\uD83D\uDD04 New Chord' : '\u25B6 Start'),
                  d.chordDetect && React.createElement("button", { "aria-label": "Replay",
                    onClick: function () { playChord(d.chordDetect.root, d.chordDetect.type, 0); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700"
                  }, '\uD83D\uDD0A Replay')
                ),
                d.chordDetect && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-rose-700 mb-2" }, "What type of chord do you hear?"),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    d.chordDetect.opts.map(function (opt) {
                      var fb = d.chordDetect.answered;
                      var isCorrect = fb && opt === d.chordDetect.type;
                      var isChosen = d.chordDetect.chosen === opt;
                      var isWrong = fb && isChosen && !isCorrect;
                      return React.createElement("button", { "aria-label": "Guess: " + opt,
                        key: opt, disabled: fb,
                        onClick: function () {
                          var correct = opt === d.chordDetect.type;
                          upd('chordDetect', Object.assign({}, d.chordDetect, { answered: true, chosen: opt }));
                          upd('chordDetectScore', (d.chordDetectScore || 0) + (correct ? 1 : 0));
                          upd('chordDetectTotal', (d.chordDetectTotal || 0) + 1);
                          addToast(correct ? '\u2705 Correct! ' + d.chordDetect.root + ' ' + d.chordDetect.type : '\u274C It was ' + d.chordDetect.root + ' ' + d.chordDetect.type, correct ? 'success' : 'error');
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-600' : fb ? 'border-slate-200 bg-slate-50 text-slate-200' : 'border-rose-600 bg-white text-slate-700 hover:border-rose-400 hover:bg-rose-50')
                      }, opt);
                    })
                  ),
                  d.chordDetect.answered && React.createElement("p", { className: "text-xs text-rose-600 mt-2" }, "\uD83C\uDFB6 It was ", React.createElement("span", { className: "font-bold" }, d.chordDetect.root + " " + d.chordDetect.type), " \u2014 ", CHORDS[d.chordDetect.type] && CHORDS[d.chordDetect.type].desc)
                )
              ),

              // ── Aural Dictation Challenge ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-violet-800" }, "\uD83D\uDCDD Aural Dictation"),
                  d.dictationScore > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.dictationScore + "/" + (d.dictationTotal || 0)),
                  React.createElement("button", { "aria-label": "New dictation melody",
                    onClick: function () {
                      var roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                      var octave = d.octave || 4;
                      var melody = [];
                      for (var i = 0; i < 4; i++) { melody.push(roots[Math.floor(Math.random() * roots.length)]); }
                      melody.forEach(function (note, idx) {
                        setTimeout(function () { playNoteFor(noteFreq(note, octave), 'dict_' + idx, 450); }, idx * 500);
                      });
                      upd('dictation', { melody: melody, guesses: ['', '', '', ''], answered: false });
                    },
                    className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700"
                  }, d.dictation ? '\uD83D\uDD04 New Melody' : '\u25B6 Start'),
                  d.dictation && React.createElement("button", { "aria-label": "Replay",
                    onClick: function () {
                      var octave = d.octave || 4;
                      d.dictation.melody.forEach(function (note, idx) {
                        setTimeout(function () { playNoteFor(noteFreq(note, octave), 'dict_' + idx, 450); }, idx * 500);
                      });
                    },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-violet-100 text-violet-700"
                  }, '\uD83D\uDD0A Replay')
                ),
                d.dictation && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-violet-700 mb-2" }, "Identify each note in the 4-note melody:"),
                  React.createElement("div", { className: "flex gap-2 mb-3" },
                    [0, 1, 2, 3].map(function (idx) {
                      var guess = d.dictation.guesses[idx];
                      var answered = d.dictation.answered;
                      var correct = answered && guess === d.dictation.melody[idx];
                      var wrong = answered && guess && !correct;
                      return React.createElement("div", { key: idx, className: "flex-1 text-center" },
                        React.createElement("div", { className: "text-[11px] font-bold text-violet-500 mb-1" }, "Note " + (idx + 1)),
                        React.createElement("select", {
                          'aria-label': 'Guess note ' + (idx + 1),
                          value: guess || '', disabled: answered,
                          onChange: function (e) {
                            var g = d.dictation.guesses.slice(); g[idx] = e.target.value;
                            upd('dictation', Object.assign({}, d.dictation, { guesses: g }));
                          },
                          className: "w-full px-2 py-1.5 rounded-lg border-2 text-sm font-bold " + (correct ? 'border-green-400 bg-green-50 text-green-700' : wrong ? 'border-red-400 bg-red-50 text-red-600' : 'border-violet-600 text-slate-700')
                        },
                          React.createElement("option", { value: "" }, "?"),
                          ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (n) { return React.createElement("option", { key: n, value: n }, n); })
                        ),
                        answered && React.createElement("div", { className: "text-[11px] font-bold mt-1 " + (correct ? 'text-green-600' : 'text-red-500') }, correct ? '\u2705' : '\u274C ' + d.dictation.melody[idx])
                      );
                    })
                  ),
                  !d.dictation.answered && React.createElement("button", { "aria-label": "Check Dictation",
                    onClick: function () {
                      var g = d.dictation.guesses; var m = d.dictation.melody;
                      var c = g.filter(function (v, i) { return v === m[i]; }).length;
                      upd('dictation', Object.assign({}, d.dictation, { answered: true }));
                      upd('dictationScore', (d.dictationScore || 0) + c);
                      upd('dictationTotal', (d.dictationTotal || 0) + 4);
                      addToast(c === 4 ? '\u2705 Perfect! All 4 notes!' : c > 0 ? '\uD83C\uDFAF ' + c + '/4 correct' : '\u274C Try again!', c === 4 ? 'success' : c > 0 ? 'info' : 'error');
                    },
                    className: "w-full py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                  }, "\u2714 Check Dictation"),
                  d.dictation.answered && React.createElement("div", { className: "text-center mt-2" },
                    React.createElement("p", { className: "text-xs text-violet-600" }, "\uD83C\uDFB5 The melody was: ", React.createElement("span", { className: "font-bold" }, d.dictation.melody.join(' \u2192 ')))
                  )
                )
              )
            ),



            // ── AI Music Theory Tutor (reading-level aware) ──
            (function () {
              var aiLevel = d.aiLevel || 'grade5';
              var aiText = d.aiExplain || '';
              var aiLoading = !!d.aiLoading;
              var aiError = d.aiError || '';
              var LEVELS = [
                { id: 'plain', label: 'Plain', hint: 'using simple everyday words and short sentences, no jargon' },
                { id: 'grade5', label: 'Grade 5', hint: 'for a 5th grade student, brief and friendly' },
                { id: 'hs', label: 'Musician', hint: 'for a student who already knows some music theory' }
              ];
              var tabLabel = synthTab === 'play' ? 'Piano (play notes)' : synthTab === 'scales' ? 'Scales' : synthTab === 'chords' ? 'Chords' : synthTab === 'harmonypad' ? 'Harmony pad' : synthTab === 'beatpad' ? 'Beat pad' : 'Music theory';
              function explain() {
                if (typeof callGemini !== 'function') { upd('aiError', 'AI tutor not available.'); return; }
                upd('aiLoading', true); upd('aiError', ''); upd('aiExplain', '');
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                var ctxInfo = '';
                if (d.scale) ctxInfo += ' Scale: ' + d.scale + '.';
                if (d.scaleRoot) ctxInfo += ' Root: ' + d.scaleRoot + '.';
                if (d.chord) ctxInfo += ' Chord: ' + d.chord + '.';
                if (d.waveType) ctxInfo += ' Wave type: ' + d.waveType + '.';
                var prompt = 'Explain this music concept ' + lv.hint + '. '
                  + 'Current view: ' + tabLabel + '.' + ctxInfo + ' '
                  + 'In 3 short sentences: (1) What this section is teaching. (2) One concrete example a student would hear (name a familiar song, rhythm, or genre). (3) A simple hands-on thing to try next. '
                  + 'No markdown, no bullets, no headings. Plain prose.';
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  upd('aiExplain', String(resp || '').trim()); upd('aiLoading', false);
                  if (typeof announceToSR === 'function') announceToSR('Explanation ready.');
                }).catch(function () {
                  upd('aiLoading', false); upd('aiError', 'Could not reach AI tutor. Try again in a moment.');
                });
              }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-300 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, "\u2728 Explain at my level"),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": "Reading level" },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { upd('aiLevel', L.id); },
                        "aria-label": "Reading level: " + L.label + (active ? " (selected)" : ""),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[10px] font-bold " + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-600 hover:bg-purple-100')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": "Generate AI explanation at " + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + " level",
                    className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
                ),
                aiError && React.createElement("p", { className: "text-[11px] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[11px] italic text-slate-300" }, "Click \u201CExplain\u201D for the AI tutor to describe what this view teaches at your chosen reading level.")
              );
            })(),

            // ── Snapshot button (bottom) ──
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("button", { "aria-label": "Snapshot", onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sy-' + Date.now(), tool: 'synth', label: t('stem.synth_ui.synth') + (d.waveType || 'sine'), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")
            )
          );
    }
  });

  console.log('[MusicSynth] Plugin loaded and registered');
})();
} // end duplicate guard
