// Open Groove Studio audio wrapper.
// Browser Web Audio playback for generated drums and synth notes.
(function (root) {
  'use strict';

  var sessionSamples = root.OpenGrooveSessionSamples = root.OpenGrooveSessionSamples || Object.create(null);

  function finiteOr(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getCore() {
    return root.OpenGrooveCore || root.AlloModules && root.AlloModules.OpenGrooveCore || null;
  }

  function getAudioContextCtor() {
    return typeof root !== 'undefined' && (root.AudioContext || root.webkitAudioContext) || null;
  }

  function ogHasAudioContext() {
    return typeof getAudioContextCtor() === 'function';
  }

  function ogCanRecordAudio() {
    return !!(root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia && root.MediaRecorder);
  }

  var VALID_OSC_TYPES = Object.create(null);
  ['sine', 'square', 'sawtooth', 'triangle'].forEach(function (t) { VALID_OSC_TYPES[t] = true; });
  var VALID_FILTER_TYPES = Object.create(null);
  ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'].forEach(function (t) { VALID_FILTER_TYPES[t] = true; });
  var PAD_MAP = Object.assign(Object.create(null), {
    pad_1: 'kick', pad_2: 'snare', pad_3: 'hihat', pad_4: 'openhat',
    pad_5: 'clap', pad_6: 'rim', pad_7: 'tomLow', pad_8: 'tomHigh',
    pad_9: 'crash', pad_10: 'ride', pad_11: 'shaker', pad_13: 'sub'
  });
  var noiseCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  var MAX_DATA_URL_CHARS = 16 * 1024 * 1024;

  function safeOscType(type, fallback) {
    var key = typeof type === 'string' ? type : '';
    return VALID_OSC_TYPES[key] ? key : (fallback || 'sine');
  }

  function safeFilterType(type, fallback) {
    var key = typeof type === 'string' ? type : '';
    return VALID_FILTER_TYPES[key] ? key : (fallback || 'lowpass');
  }

  function clampFreq(ctx, value, fallback) {
    var nyquistCap = Math.min(18000, Math.max(2000, finiteOr(ctx && ctx.sampleRate, 44100) * 0.45));
    return Math.max(20, Math.min(nyquistCap, finiteOr(value, fallback)));
  }

  function makeDistCurve(amount) {
    var k = Math.max(0, Math.min(400, finiteOr(amount, 0)));
    var samples = 1024;
    var curve = new Float32Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = (i * 2 / samples) - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x || 0.0001));
    }
    return curve;
  }

  function ogCreateAudioEngine(options) {
    options = options || {};
    var Ctor = getAudioContextCtor();
    if (!Ctor && !options.context) {
      return { available: false, reason: 'Web Audio API is not available.' };
    }
    var ctx = options.context || new Ctor();
    var master = ctx.createGain();
    master.gain.value = options.gain == null ? 0.85 : Math.max(0, Math.min(1.5, finiteOr(options.gain, 0.85)));
    var shaper = ctx.createWaveShaper();
    shaper.curve = makeDistCurve(0.5);
    shaper.oversample = '2x';
    master.connect(shaper);
    shaper.connect(ctx.destination);
    return {
      available: true,
      ctx: ctx,
      master: master,
      shaper: shaper,
      startedAt: ctx.currentTime
    };
  }

  function normalizeEffects(effects) {
    var C = getCore();
    return (Array.isArray(effects) ? effects : []).map(function (effect) {
      return C && C.ogNormalizeEffect ? C.ogNormalizeEffect(effect) : effect;
    }).filter(function (effect) {
      return effect && effect.enabled !== false;
    });
  }

  function effectByType(effects, type) {
    for (var i = 0; i < effects.length; i++) {
      if (effects[i].type === type) return effects[i];
    }
    return null;
  }

  function disconnectLater(ctx, nodes, stopAt) {
    if (!root.setTimeout || !nodes.length) return;
    var now = finiteOr(ctx && ctx.currentTime, 0);
    var end = finiteOr(stopAt, now + 0.5);
    var delayMs = Math.max(60, Math.min(60000, Math.round((Math.max(now, end) - now + 0.2) * 1000)));
    root.setTimeout(function () {
      nodes.forEach(function (node) {
        try { node.disconnect(); } catch (_) {}
      });
    }, delayMs);
  }

  function connectWetDry(ctx, input, wetNode, mix) {
    var output = ctx.createGain();
    var dry = ctx.createGain();
    var wet = ctx.createGain();
    var wetMix = Math.max(0, Math.min(1, finiteOr(mix, 0)));
    dry.gain.value = 1 - wetMix;
    wet.gain.value = wetMix;
    input.connect(dry);
    dry.connect(output);
    wetNode.connect(wet);
    wet.connect(output);
    return { output: output, dry: dry, wet: wet };
  }

  function createEffectOutput(engine, effects, startTime, tailSec) {
    var list = normalizeEffects(effects);
    if (!list.length) return engine.master;
    var ctx = engine.ctx;
    var now = finiteOr(ctx.currentTime, 0);
    var safeStart = Math.max(now, finiteOr(startTime, now));
    var safeTail = Math.max(0.2, Math.min(30, finiteOr(tailSec, 1)));
    var input = ctx.createGain();
    var chain = input;
    var nodes = [input];
    var filterEffect = effectByType(list, 'filter');
    var driveEffect = effectByType(list, 'drive');
    var chorusEffect = effectByType(list, 'chorus');
    var delayEffect = effectByType(list, 'delay');
    var reverbEffect = effectByType(list, 'reverb');

    if (filterEffect) {
      var filter = ctx.createBiquadFilter();
      var filterParams = filterEffect.params || {};
      filter.type = safeFilterType(filterParams.type, 'lowpass');
      filter.frequency.setValueAtTime(Math.max(80, clampFreq(ctx, filterParams.cutoff, 12000)), safeStart);
      filter.Q.value = Math.max(0.1, Math.min(20, finiteOr(filterParams.q, 0.8)));
      chain.connect(filter);
      chain = filter;
      nodes.push(filter);
    }

    if (driveEffect) {
      var driveParams = driveEffect.params || {};
      var shaper = ctx.createWaveShaper();
      shaper.curve = makeDistCurve(Math.max(0, Math.min(1, finiteOr(driveParams.amount, 0))) * 80);
      shaper.oversample = '2x';
      chain.connect(shaper);
      var driveMix = connectWetDry(ctx, chain, shaper, driveParams.mix == null ? 0.35 : driveParams.mix);
      chain = driveMix.output;
      nodes.push(shaper, driveMix.output, driveMix.dry, driveMix.wet);
    }

    if (chorusEffect) {
      var chorusParams = chorusEffect.params || {};
      var chorusDelay = ctx.createDelay(0.05);
      var lfo = ctx.createOscillator();
      var depth = ctx.createGain();
      chorusDelay.delayTime.value = 0.012;
      lfo.type = 'sine';
      lfo.frequency.value = Math.max(0.05, Math.min(8, finiteOr(chorusParams.rate, 1.2)));
      depth.gain.value = Math.max(0, Math.min(1, chorusParams.depth == null ? 0.35 : finiteOr(chorusParams.depth, 0.35))) * 0.014;
      lfo.connect(depth);
      depth.connect(chorusDelay.delayTime);
      chain.connect(chorusDelay);
      var chorusMix = connectWetDry(ctx, chain, chorusDelay, chorusParams.mix == null ? 0.18 : chorusParams.mix);
      lfo.start(safeStart);
      lfo.stop(safeStart + Math.max(0.3, safeTail));
      chain = chorusMix.output;
      nodes.push(chorusDelay, lfo, depth, chorusMix.output, chorusMix.dry, chorusMix.wet);
    }

    if (delayEffect) {
      var delayParams = delayEffect.params || {};
      var delay = ctx.createDelay(1);
      var feedback = ctx.createGain();
      delay.delayTime.value = Math.max(0.03, Math.min(0.75, finiteOr(delayParams.time, 0.25)));
      feedback.gain.value = Math.max(0, Math.min(0.85, delayParams.feedback == null ? 0.28 : finiteOr(delayParams.feedback, 0.28)));
      chain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      var delayMix = connectWetDry(ctx, chain, delay, delayParams.mix == null ? 0.22 : delayParams.mix);
      chain = delayMix.output;
      nodes.push(delay, feedback, delayMix.output, delayMix.dry, delayMix.wet);
    }

    if (reverbEffect) {
      var reverbParams = reverbEffect.params || {};
      var reverbDelay = ctx.createDelay(0.4);
      var reverbFeedback = ctx.createGain();
      var decay = Math.max(0.05, Math.min(1.2, finiteOr(reverbParams.decay, 0.55)));
      reverbDelay.delayTime.value = 0.045 + decay * 0.11;
      reverbFeedback.gain.value = Math.max(0.1, Math.min(0.72, 0.22 + decay * 0.34));
      chain.connect(reverbDelay);
      reverbDelay.connect(reverbFeedback);
      reverbFeedback.connect(reverbDelay);
      var reverbMix = connectWetDry(ctx, chain, reverbDelay, reverbParams.mix == null ? 0.2 : reverbParams.mix);
      chain = reverbMix.output;
      nodes.push(reverbDelay, reverbFeedback, reverbMix.output, reverbMix.dry, reverbMix.wet);
    }

    chain.connect(engine.master);
    nodes.push(chain);
    disconnectLater(ctx, nodes, safeStart + safeTail);
    return input;
  }

  function connectEnvelope(ctx, destination, startTime, duration, velocity, envelope) {
    envelope = envelope || {};
    var gain = ctx.createGain();
    var ctxNow = finiteOr(ctx.currentTime, 0);
    var now = Math.max(ctxNow, finiteOr(startTime, ctxNow));
    var dur = Math.max(0.02, Math.min(30, finiteOr(duration, 0.1)));
    var attack = Math.max(0.001, Math.min(10, finiteOr(envelope.attack, 0.004)));
    var decay = Math.max(0.001, Math.min(10, finiteOr(envelope.decay, 0.05)));
    var sustain = Math.max(0, Math.min(1, envelope.sustain == null ? 0.3 : finiteOr(envelope.sustain, 0.3)));
    var release = Math.max(0.001, Math.min(10, finiteOr(envelope.release, 0.04)));
    var peak = Math.max(0, Math.min(1, finiteOr(velocity, 0.8)));
    var holdEnd = now + Math.max(attack + decay, dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + attack);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, peak * sustain), now + attack + decay);
    gain.gain.setValueAtTime(Math.max(0.0001, peak * sustain), holdEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, holdEnd + release);
    gain.connect(destination);
    return gain;
  }

  function noiseBuffer(ctx, seconds) {
    if (noiseCache && noiseCache.has(ctx)) return noiseCache.get(ctx);
    var sampleRate = Math.max(8000, Math.min(192000, finiteOr(ctx && ctx.sampleRate, 44100)));
    var bufSeconds = Math.max(2, Math.min(4, finiteOr(seconds, 2)));
    var frames = Math.max(1, Math.round(sampleRate * bufSeconds));
    var buffer = ctx.createBuffer(1, frames, sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    if (noiseCache) noiseCache.set(ctx, buffer);
    return buffer;
  }

  function playNoiseLayer(ctx, destination, start, seconds, peak, options) {
    options = options || {};
    var ctxNow = finiteOr(ctx.currentTime, 0);
    var safeStart = Math.max(ctxNow, finiteOr(start, ctxNow));
    var source = ctx.createBufferSource();
    var filter = ctx.createBiquadFilter();
    var duration = Math.max(0.01, Math.min(30, finiteOr(seconds, 0.1)));
    source.buffer = noiseBuffer(ctx, duration);
    if (duration > 1.8) source.loop = true;
    filter.type = safeFilterType(options.filterType, 'bandpass');
    var startFreq = clampFreq(ctx, options.frequency, 1200);
    filter.frequency.setValueAtTime(startFreq, safeStart);
    if (options.endFrequency != null) {
      filter.frequency.exponentialRampToValueAtTime(clampFreq(ctx, options.endFrequency, startFreq), safeStart + duration);
    }
    filter.Q.value = Math.max(0.1, Math.min(30, finiteOr(options.q, 0.8)));
    var envOpts = options.envelope || {
      attack: 0.001,
      decay: duration * 0.35,
      sustain: 0.12,
      release: duration * 0.3
    };
    var env = connectEnvelope(ctx, destination, safeStart, duration, Math.max(0, Math.min(1, finiteOr(peak, 0))), envOpts);
    source.connect(filter);
    filter.connect(env);
    var stopAt = safeStart + Math.max(duration, finiteOr(envOpts.attack, 0.004) + finiteOr(envOpts.decay, 0.05)) + Math.max(0.08, Math.min(10, finiteOr(envOpts.release, 0.04)));
    source.start(safeStart);
    source.stop(stopAt);
    disconnectLater(ctx, [source, filter, env], stopAt);
  }

  function playToneLayer(ctx, destination, start, seconds, peak, options) {
    options = options || {};
    var ctxNow = finiteOr(ctx.currentTime, 0);
    var safeStart = Math.max(ctxNow, finiteOr(start, ctxNow));
    var osc = ctx.createOscillator();
    var duration = Math.max(0.01, Math.min(30, finiteOr(seconds, 0.12)));
    var envOpts = options.envelope || {
      attack: 0.001,
      decay: duration * 0.35,
      sustain: 0.18,
      release: duration * 0.25
    };
    var env = connectEnvelope(ctx, destination, safeStart, duration, Math.max(0, Math.min(1, finiteOr(peak, 0))), envOpts);
    osc.type = safeOscType(options.type, 'sine');
    var startFreq = clampFreq(ctx, options.frequency, 440);
    osc.frequency.setValueAtTime(startFreq, safeStart);
    if (options.endFrequency != null) {
      osc.frequency.exponentialRampToValueAtTime(clampFreq(ctx, options.endFrequency, startFreq), safeStart + duration);
    }
    if (options.detune != null) osc.detune.value = Math.max(-4800, Math.min(4800, finiteOr(options.detune, 0)));
    osc.connect(env);
    var stopAt = safeStart + Math.max(duration, finiteOr(envOpts.attack, 0.004) + finiteOr(envOpts.decay, 0.05)) + Math.max(0.08, Math.min(10, finiteOr(envOpts.release, 0.04)));
    osc.start(safeStart);
    osc.stop(stopAt);
    disconnectLater(ctx, [osc, env], stopAt);
  }

  function ogPlayDrum(engine, type, when, velocity, effects, voiceProfile) {
    if (!engine || !engine.available) return false;
    var ctx = engine.ctx;
    var ctxNow = finiteOr(ctx.currentTime, 0);
    var start = Math.max(ctxNow, finiteOr(when, ctxNow));
    var vel = Math.max(0, Math.min(1, finiteOr(velocity, 0.8)));
    var out = createEffectOutput(engine, effects, start, 1.5);
    var kind = String(type || 'kick');
    var voice = voiceProfile || {};
    var pitchScale = Math.max(0.5, Math.min(2, finiteOr(voice.pitch, 1)));
    var brightnessScale = Math.max(0.35, Math.min(2.4, finiteOr(voice.brightness, 1)));
    var decayScale = Math.max(0.25, Math.min(2.5, finiteOr(voice.decay, 1)));
    var noiseScale = Math.max(0, Math.min(2, finiteOr(voice.noise, 1)));
    var clickScale = Math.max(0, Math.min(2, finiteOr(voice.click, 1)));
    var bodyScale = Math.max(0, Math.min(2, finiteOr(voice.body, 1)));
    function vFreq(value) { return Math.max(20, Math.min(18000, value * pitchScale)); }
    function vBright(value) { return Math.max(20, Math.min(18000, value * brightnessScale)); }
    function vDur(value) { return Math.max(0.01, value * decayScale); }

    if (kind === 'kick' || kind === 'sub') {
      playToneLayer(ctx, out, start, vDur(kind === 'sub' ? 0.38 : 0.24), vel * bodyScale, {
        type: 'sine',
        frequency: vFreq(kind === 'sub' ? 76 : 128),
        endFrequency: vFreq(kind === 'sub' ? 38 : 44),
        envelope: { attack: 0.001, decay: vDur(0.09), sustain: 0.16, release: vDur(kind === 'sub' ? 0.16 : 0.08) }
      });
      playNoiseLayer(ctx, out, start, 0.018, vel * clickScale * (kind === 'sub' ? 0.08 : 0.18), {
        filterType: 'highpass',
        frequency: vBright(5200),
        q: 0.7,
        envelope: { attack: 0.001, decay: 0.008, sustain: 0.01, release: 0.01 }
      });
      return true;
    }

    if (kind === 'snare') {
      playNoiseLayer(ctx, out, start, vDur(0.17), vel * 0.72 * noiseScale, { filterType: 'bandpass', frequency: vBright(1850), q: 1.3, envelope: { attack: 0.001, decay: vDur(0.05), sustain: 0.12, release: vDur(0.08) } });
      playToneLayer(ctx, out, start, vDur(0.18), vel * 0.22 * bodyScale, { type: 'triangle', frequency: vFreq(188), endFrequency: vFreq(142), envelope: { attack: 0.001, decay: vDur(0.06), sustain: 0.1, release: vDur(0.05) } });
      playNoiseLayer(ctx, out, start, 0.032, vel * 0.18 * clickScale, { filterType: 'highpass', frequency: vBright(4800), q: 0.7 });
      return true;
    }

    if (kind === 'clap') {
      [0, 0.017, 0.034].forEach(function (offset, index) {
        playNoiseLayer(ctx, out, start + offset, vDur(0.052), vel * noiseScale * (0.28 - index * 0.035), { filterType: 'bandpass', frequency: vBright(1300), q: 1.1 });
      });
      playNoiseLayer(ctx, out, start + 0.04, vDur(0.18), vel * 0.24 * noiseScale, { filterType: 'highpass', frequency: vBright(2400), q: 0.8, envelope: { attack: 0.001, decay: vDur(0.05), sustain: 0.08, release: vDur(0.1) } });
      return true;
    }

    if (kind === 'shaker' || kind === 'hihat' || kind === 'openhat' || kind === 'crash' || kind === 'ride') {
      var cymbalDuration = vDur(kind === 'hihat' ? 0.07 : kind === 'shaker' ? 0.09 : kind === 'openhat' ? 0.34 : kind === 'ride' ? 0.62 : 0.82);
      playNoiseLayer(ctx, out, start, cymbalDuration, vel * noiseScale * (kind === 'hihat' ? 0.42 : kind === 'shaker' ? 0.35 : 0.58), {
        filterType: 'highpass',
        frequency: vBright(kind === 'ride' ? 5200 : 6400),
        q: 0.55,
        envelope: { attack: 0.001, decay: 0.04, sustain: kind === 'hihat' ? 0.06 : 0.18, release: cymbalDuration * 0.42 }
      });
      [vBright(4210), vBright(5570), vBright(7830)].forEach(function (freq, index) {
        playToneLayer(ctx, out, start, cymbalDuration * 0.72, vel * clickScale * (kind === 'ride' ? 0.035 : 0.026), {
          type: index % 2 ? 'square' : 'sawtooth',
          frequency: freq,
          detune: index * 6,
          envelope: { attack: 0.001, decay: 0.035, sustain: 0.08, release: cymbalDuration * 0.36 }
        });
      });
      if (kind === 'ride') {
        playToneLayer(ctx, out, start, vDur(0.16), vel * 0.11 * bodyScale, { type: 'triangle', frequency: vBright(1420), envelope: { attack: 0.001, decay: vDur(0.04), sustain: 0.1, release: vDur(0.08) } });
      }
      return true;
    }

    if (kind === 'tomLow' || kind === 'tomHigh' || kind === 'rim' || kind === 'perc') {
      var base = vFreq(kind === 'tomLow' ? 154 : kind === 'tomHigh' ? 246 : kind === 'rim' ? 860 : 620);
      playToneLayer(ctx, out, start, vDur(kind === 'tomLow' || kind === 'tomHigh' ? 0.24 : 0.12), vel * 0.68 * bodyScale, {
        type: kind === 'rim' ? 'square' : 'triangle',
        frequency: base,
        endFrequency: kind === 'rim' ? base : base * 0.66,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.16, release: 0.06 }
      });
      playNoiseLayer(ctx, out, start, 0.025, vel * 0.12 * clickScale, { filterType: 'highpass', frequency: vBright(kind === 'rim' ? 3200 : 1800), q: 0.8 });
      return true;
    }

    if (kind === 'chord') {
      [vFreq(261.63), vFreq(311.13), vFreq(392)].forEach(function (freq) {
        playToneLayer(ctx, out, start, 0.44, vel * 0.2, { type: 'triangle', frequency: freq, envelope: { attack: 0.004, decay: 0.12, sustain: 0.28, release: 0.2 } });
      });
      return true;
    }

    if (kind === 'vocal') {
      playToneLayer(ctx, out, start, vDur(0.2), vel * 0.18 * bodyScale, { type: 'sawtooth', frequency: vFreq(220), endFrequency: vFreq(185), envelope: { attack: 0.006, decay: vDur(0.08), sustain: 0.24, release: vDur(0.08) } });
      playNoiseLayer(ctx, out, start, vDur(0.22), vel * 0.24 * noiseScale, { filterType: 'bandpass', frequency: vBright(980), q: 5.2, envelope: { attack: 0.004, decay: vDur(0.06), sustain: 0.18, release: vDur(0.1) } });
      playNoiseLayer(ctx, out, start, vDur(0.18), vel * 0.12 * noiseScale, { filterType: 'bandpass', frequency: vBright(2350), q: 6.4, envelope: { attack: 0.004, decay: vDur(0.05), sustain: 0.12, release: vDur(0.08) } });
      return true;
    }

    if (kind === 'fx') {
      playNoiseLayer(ctx, out, start, vDur(0.5), vel * 0.46 * noiseScale, { filterType: 'bandpass', frequency: vBright(520), endFrequency: vBright(7200), q: 1.8, envelope: { attack: 0.01, decay: vDur(0.16), sustain: 0.22, release: vDur(0.22) } });
      playToneLayer(ctx, out, start, vDur(0.42), vel * 0.16 * bodyScale, { type: 'sine', frequency: vFreq(880), endFrequency: vFreq(176), envelope: { attack: 0.004, decay: vDur(0.14), sustain: 0.18, release: vDur(0.18) } });
      return true;
    }

    playToneLayer(ctx, out, start, vDur(0.12), vel * 0.65 * bodyScale, { type: 'triangle', frequency: vFreq(720), envelope: { attack: 0.001, decay: vDur(0.04), sustain: 0.2, release: vDur(0.04) } });
    return true;
  }

  function ogPlayNote(engine, event, when, durationSec) {
    if (!engine || !engine.available) return false;
    var C = getCore();
    var ctx = engine.ctx;
    var ctxNow = finiteOr(ctx.currentTime, 0);
    var start = Math.max(ctxNow, finiteOr(when, ctxNow));
    var dur = Math.max(0.03, Math.min(30, finiteOr(durationSec, 0.25)));
    var rawMidi = event && event.midi != null ? event.midi : C && C.ogNoteNameToMidi(event && event.pitch) || 60;
    var midi = Math.max(0, Math.min(127, finiteOr(rawMidi, 60)));
    var rawFreq = C && C.ogFrequencyFromMidi ? C.ogFrequencyFromMidi(midi) : 440 * Math.pow(2, (midi - 69) / 12);
    var freq = clampFreq(ctx, rawFreq, 261.63);
    var patch = C && C.ogNormalizeSynthInstrument ? C.ogNormalizeSynthInstrument(event && event.instrument) : event && event.instrument || {};
    var filterPatch = patch.filter || {};
    var envelopePatch = patch.envelope || {};
    var relSec = Math.max(0.18, Math.min(10, finiteOr(envelopePatch.release, 0.18)));
    var atkDec = Math.min(20, Math.max(0.001, finiteOr(envelopePatch.attack, 0.004)) + Math.max(0.001, finiteOr(envelopePatch.decay, 0.05)));
    var filter = ctx.createBiquadFilter();
    var output = createEffectOutput(engine, event && event.effects, start, Math.max(dur, atkDec) + relSec + 1.5);
    var env = connectEnvelope(ctx, output, start, dur, event && event.velocity, envelopePatch);
    var partials = Array.isArray(patch.partials) && patch.partials.length ? patch.partials : [{ ratio: 1, type: patch.oscillator || 'sawtooth', gain: 1, detune: 0 }];
    var unison = patch.unison || {};
    var requestedVoices = Math.max(1, Math.min(7, Math.round(finiteOr(unison.voices, 1))));
    var voices = Math.max(1, Math.min(requestedVoices, Math.floor(24 / Math.max(1, partials.length))));
    var unisonDetune = Math.max(0, Math.min(80, finiteOr(unison.detune, 0)));
    var unisonSpread = Math.max(0, Math.min(1, finiteOr(unison.spread, 0)));
    var stopAt = start + Math.max(dur, atkDec) + relSec + 0.05;
    var cleanupNodes = [filter, env];
    filter.type = safeFilterType(filterPatch.type, 'lowpass');
    filter.frequency.setValueAtTime(Math.max(80, clampFreq(ctx, filterPatch.cutoff, 4200)), start);
    filter.Q.value = Math.max(0.1, Math.min(20, finiteOr(filterPatch.q, 0.8)));
    filter.connect(env);
    partials.forEach(function (partial) {
      if (!partial || typeof partial !== 'object') return;
      for (var voice = 0; voice < voices; voice++) {
        var position = voices === 1 ? 0 : (voice / (voices - 1)) * 2 - 1;
        var osc = ctx.createOscillator();
        var partialGain = ctx.createGain();
        var panner = ctx.createStereoPanner && voices > 1 && unisonSpread > 0 ? ctx.createStereoPanner() : null;
        osc.type = safeOscType(partial.type || patch.oscillator, 'sawtooth');
        osc.frequency.setValueAtTime(clampFreq(ctx, freq * Math.max(0.125, Math.min(16, finiteOr(partial.ratio, 1))), freq), start);
        osc.detune.value = Math.max(-4800, Math.min(4800, finiteOr(partial.detune, 0) + position * unisonDetune));
        partialGain.gain.value = Math.max(0, Math.min(1, finiteOr(partial.gain, 0))) / Math.sqrt(voices);
        osc.connect(partialGain);
        if (panner) {
          panner.pan.value = Math.max(-1, Math.min(1, position * unisonSpread));
          partialGain.connect(panner);
          panner.connect(filter);
          cleanupNodes.push(panner);
        } else {
          partialGain.connect(filter);
        }
        cleanupNodes.push(osc, partialGain);
        osc.start(start);
        osc.stop(stopAt);
      }
    });
    if (patch.transient && finiteOr(patch.transient.gain, 0) > 0) {
      var source = ctx.createBufferSource();
      var transientDur = Math.max(0.001, Math.min(0.2, finiteOr(patch.transient.duration, 0.015)));
      var transientFilter = ctx.createBiquadFilter();
      var evVel = event && event.velocity != null ? finiteOr(event.velocity, 0.8) : 0.8;
      var transientEnv = connectEnvelope(ctx, output, start, transientDur, evVel * Math.min(2, finiteOr(patch.transient.gain, 0)), {
        attack: 0.001,
        decay: transientDur * 0.5,
        sustain: 0.01,
        release: transientDur
      });
      source.buffer = noiseBuffer(ctx, transientDur);
      transientFilter.type = 'bandpass';
      transientFilter.frequency.value = Math.max(200, Math.min(12000, finiteOr(patch.transient.cutoff, 4500)));
      source.connect(transientFilter);
      transientFilter.connect(transientEnv);
      source.start(start);
      source.stop(start + transientDur + 0.02);
      cleanupNodes.push(source, transientFilter, transientEnv);
    }
    disconnectLater(ctx, cleanupNodes, stopAt);
    return true;
  }

  function ogRegisterSampleBuffer(assetId, buffer, metadata) {
    if (!assetId || !buffer) return false;
    if (assetId === '__proto__' || assetId === 'constructor' || assetId === 'prototype') return false;
    sessionSamples[assetId] = {
      buffer: buffer,
      metadata: metadata || {}
    };
    return true;
  }

  function ogClearSessionSamples() {
    Object.keys(sessionSamples).forEach(function (key) {
      delete sessionSamples[key];
    });
    return true;
  }

  function decodeArrayBuffer(engine, assetId, arrayBuffer, metadata) {
    if (!engine || !engine.available || !arrayBuffer || !engine.ctx.decodeAudioData) return Promise.resolve(false);
    try {
      var decodeInput = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
      var decoded = engine.ctx.decodeAudioData(decodeInput);
      return Promise.resolve(decoded).then(function (buffer) {
        return ogRegisterSampleBuffer(assetId, buffer, metadata || {});
      }).catch(function () {
        return false;
      });
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  function ogDecodeAndRegisterSample(engine, assetId, blob) {
    if (!engine || !engine.available || !blob || !blob.arrayBuffer || !engine.ctx.decodeAudioData) return Promise.resolve(false);
    return blob.arrayBuffer().then(function (arrayBuffer) {
      return decodeArrayBuffer(engine, assetId, arrayBuffer, {
        mimeType: blob.type || null,
        sizeBytes: blob.size || 0
      });
    });
  }

  function ogBlobToDataUrl(blob) {
    if (!blob || !root.FileReader) return Promise.reject(new Error('FileReader is not available.'));
    return new Promise(function (resolve, reject) {
      var reader = new root.FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('Could not read audio data.')); };
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToArrayBuffer(dataUrl) {
    var text = String(dataUrl || '');
    if (text.length > MAX_DATA_URL_CHARS || !/^data:audio\//i.test(text)) return Promise.resolve(null);
    if (root.fetch) {
      return root.fetch(text).then(function (response) {
        if (!response || !response.ok) return null;
        return response.arrayBuffer();
      }).catch(function () { return null; });
    }
    if (!root.atob) return Promise.resolve(null);
    var comma = text.indexOf(',');
    if (comma < 0) return Promise.resolve(null);
    try {
      var binary = root.atob(text.slice(comma + 1).replace(/\s+/g, ''));
      var buffer = new ArrayBuffer(binary.length);
      var view = new Uint8Array(buffer);
      for (var i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
      return Promise.resolve(buffer);
    } catch (_) {
      return Promise.resolve(null);
    }
  }

  function ogDecodeDataUrlAndRegisterSample(engine, assetId, dataUrl, metadata) {
    if (!engine || !engine.available || !assetId || !dataUrl) return Promise.resolve(false);
    return dataUrlToArrayBuffer(dataUrl).then(function (arrayBuffer) {
      return decodeArrayBuffer(engine, assetId, arrayBuffer, metadata || {});
    });
  }

  function ogRestoreEmbeddedSamples(engine, project) {
    var assets = project && Array.isArray(project.assets) ? project.assets : [];
    var jobs = assets.filter(function (asset) {
      return asset && asset.id && asset.dataUrl && (asset.storage === 'embedded' || /^data:audio\//i.test(asset.dataUrl));
    }).map(function (asset) {
      return ogDecodeDataUrlAndRegisterSample(engine, asset.id, asset.dataUrl, {
        mimeType: asset.mimeType || null,
        sizeBytes: asset.sizeBytes || 0
      });
    });
    if (!jobs.length) return Promise.resolve(0);
    return Promise.all(jobs).then(function (results) {
      return results.filter(Boolean).length;
    });
  }

  function ogPlaySample(engine, assetId, when, velocity, region, effects) {
    if (!engine || !engine.available || !assetId) return false;
    var sample = Object.prototype.hasOwnProperty.call(sessionSamples, assetId) ? sessionSamples[assetId] : null;
    var buffer = sample && sample.buffer || null;
    if (!buffer) return false;
    var ctx = engine.ctx;
    var ctxNow = finiteOr(ctx.currentTime, 0);
    var start = Math.max(ctxNow, finiteOr(when, ctxNow));
    var vel = Math.max(0, Math.min(1, finiteOr(velocity, 0.8)));
    region = region || {};
    var bufDur = Math.max(0.001, finiteOr(buffer.duration, 0.001));
    var offset = Math.max(0, Math.min(bufDur, finiteOr(region.startSec, 0)));
    var requestedEnd = region.endSec == null ? bufDur : finiteOr(region.endSec, bufDur);
    var end = Math.max(offset + 0.001, Math.min(bufDur, requestedEnd > offset ? requestedEnd : bufDur));
    var duration = Math.max(0.001, Math.min(30, end - offset));
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    var output = createEffectOutput(engine, effects, start, duration + 1.5);
    var gain = connectEnvelope(ctx, output, start, Math.max(0.03, duration), vel, { attack: 0.001, decay: 0.01, sustain: 0.98, release: 0.03 });
    source.connect(gain);
    var stopAt = start + Math.max(0.04, duration) + 0.05;
    source.start(start, offset, duration);
    source.stop(stopAt);
    disconnectLater(ctx, [source, gain], stopAt);
    return true;
  }

  function ogSchedulePlan(engine, plan, options) {
    options = options || {};
    if (!engine || !engine.available || !Array.isArray(plan)) return 0;
    var scheduled = 0;
    var baseTime = finiteOr(options.baseTime, 0);
    plan.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      if (item.type === 'automationPoint') return;
      if (item.muted || item.outputGain === 0) return;
      var prob = item.probability == null ? 1 : finiteOr(item.probability, 1);
      if (prob < 1 && Math.random() > prob) return;
      var when = baseTime + finiteOr(item.time, 0);
      if (item.type === 'drumHit') {
        if (item.assetId && ogPlaySample(engine, item.assetId, when, item.velocity, item.sampleRegion, item.effects)) {
          scheduled += 1;
          return;
        }
        var padType = item.padEngine || item.event && (item.event.engine || item.event.padEngine) || item.padId || 'kick';
        if (PAD_MAP[padType]) padType = PAD_MAP[padType];
        scheduled += ogPlayDrum(engine, padType, when, item.velocity, item.effects, item.drumVoice) ? 1 : 0;
      } else if (item.type === 'note') {
        scheduled += ogPlayNote(engine, item, when, item.durationSec) ? 1 : 0;
      }
    });
    return scheduled;
  }

  var api = {
    ogHasAudioContext: ogHasAudioContext,
    ogCanRecordAudio: ogCanRecordAudio,
    ogCreateAudioEngine: ogCreateAudioEngine,
    ogPlayDrum: ogPlayDrum,
    ogPlayNote: ogPlayNote,
    ogRegisterSampleBuffer: ogRegisterSampleBuffer,
    ogClearSessionSamples: ogClearSessionSamples,
    ogDecodeAndRegisterSample: ogDecodeAndRegisterSample,
    ogBlobToDataUrl: ogBlobToDataUrl,
    ogDecodeDataUrlAndRegisterSample: ogDecodeDataUrlAndRegisterSample,
    ogRestoreEmbeddedSamples: ogRestoreEmbeddedSamples,
    ogPlaySample: ogPlaySample,
    ogSchedulePlan: ogSchedulePlan
  };

  root.OpenGrooveAudio = api;
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.OpenGrooveAudio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
