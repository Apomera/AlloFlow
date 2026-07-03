// Open Groove Studio audio wrapper.
// Browser Web Audio playback for generated drums and synth notes.
(function (root) {
  'use strict';

  var sessionSamples = root.OpenGrooveSessionSamples = root.OpenGrooveSessionSamples || {};

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

  function makeDistCurve(amount) {
    var k = Math.max(0, Number(amount) || 0);
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
    master.gain.value = options.gain == null ? 0.85 : Math.max(0, Math.min(1.5, Number(options.gain) || 0.85));
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
    var delayMs = Math.max(60, (Math.max(ctx.currentTime, stopAt) - ctx.currentTime + 0.2) * 1000);
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
    var wetMix = Math.max(0, Math.min(1, Number(mix) || 0));
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
      filter.type = filterParams.type || 'lowpass';
      filter.frequency.setValueAtTime(Math.max(80, Math.min(18000, Number(filterParams.cutoff) || 12000)), startTime);
      filter.Q.value = Math.max(0.1, Math.min(20, Number(filterParams.q) || 0.8));
      chain.connect(filter);
      chain = filter;
      nodes.push(filter);
    }

    if (driveEffect) {
      var driveParams = driveEffect.params || {};
      var shaper = ctx.createWaveShaper();
      shaper.curve = makeDistCurve(Math.max(0, Math.min(1, Number(driveParams.amount) || 0)) * 80);
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
      lfo.frequency.value = Math.max(0.05, Math.min(8, Number(chorusParams.rate) || 1.2));
      depth.gain.value = Math.max(0, Math.min(1, Number(chorusParams.depth) || 0.35)) * 0.014;
      lfo.connect(depth);
      depth.connect(chorusDelay.delayTime);
      chain.connect(chorusDelay);
      var chorusMix = connectWetDry(ctx, chain, chorusDelay, chorusParams.mix == null ? 0.18 : chorusParams.mix);
      lfo.start(Math.max(ctx.currentTime, startTime));
      lfo.stop(Math.max(ctx.currentTime, startTime) + Math.max(0.3, tailSec || 1));
      chain = chorusMix.output;
      nodes.push(chorusDelay, lfo, depth, chorusMix.output, chorusMix.dry, chorusMix.wet);
    }

    if (delayEffect) {
      var delayParams = delayEffect.params || {};
      var delay = ctx.createDelay(1);
      var feedback = ctx.createGain();
      delay.delayTime.value = Math.max(0.03, Math.min(0.75, Number(delayParams.time) || 0.25));
      feedback.gain.value = Math.max(0, Math.min(0.85, Number(delayParams.feedback) || 0.28));
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
      var decay = Math.max(0.05, Math.min(1.2, Number(reverbParams.decay) || 0.55));
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
    disconnectLater(ctx, nodes, Math.max(ctx.currentTime, startTime) + Math.max(0.2, tailSec || 1));
    return input;
  }

  function connectEnvelope(ctx, destination, startTime, duration, velocity, envelope) {
    envelope = envelope || {};
    var gain = ctx.createGain();
    var now = Math.max(ctx.currentTime, Number(startTime) || ctx.currentTime);
    var dur = Math.max(0.02, Number(duration) || 0.1);
    var attack = Math.max(0.001, Number(envelope.attack) || 0.004);
    var decay = Math.max(0.001, Number(envelope.decay) || 0.05);
    var sustain = Math.max(0, Math.min(1, envelope.sustain == null ? 0.3 : Number(envelope.sustain)));
    var release = Math.max(0.001, Number(envelope.release) || 0.04);
    var peak = Math.max(0, Math.min(1, Number(velocity) || 0.8));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + attack);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, peak * sustain), now + attack + decay);
    gain.gain.setValueAtTime(Math.max(0.0001, peak * sustain), now + Math.max(attack + decay, dur));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + release);
    gain.connect(destination);
    return gain;
  }

  function noiseBuffer(ctx, seconds) {
    var frames = Math.max(1, Math.round(ctx.sampleRate * seconds));
    var buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ogPlayDrum(engine, type, when, velocity, effects) {
    if (!engine || !engine.available) return false;
    var ctx = engine.ctx;
    var start = Math.max(ctx.currentTime, Number(when) || ctx.currentTime);
    var vel = Math.max(0, Math.min(1, Number(velocity) || 0.8));
    var out = createEffectOutput(engine, effects, start, 1.5);
    var kind = String(type || 'kick');

    if (kind === 'kick' || kind === 'sub') {
      var osc = ctx.createOscillator();
      var gain = connectEnvelope(ctx, out, start, 0.22, vel, { attack: 0.002, decay: 0.08, sustain: 0.18, release: 0.08 });
      osc.type = 'sine';
      osc.frequency.setValueAtTime(kind === 'sub' ? 72 : 120, start);
      osc.frequency.exponentialRampToValueAtTime(kind === 'sub' ? 42 : 45, start + 0.18);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.35);
      return true;
    }

    if (kind === 'snare' || kind === 'clap' || kind === 'shaker' || kind === 'hihat' || kind === 'openhat' || kind === 'crash' || kind === 'ride') {
      var source = ctx.createBufferSource();
      source.buffer = noiseBuffer(ctx, kind === 'openhat' || kind === 'crash' || kind === 'ride' ? 0.45 : 0.14);
      var filter = ctx.createBiquadFilter();
      filter.type = kind === 'snare' || kind === 'clap' ? 'bandpass' : 'highpass';
      filter.frequency.value = kind === 'snare' ? 1800 : kind === 'clap' ? 1200 : 6000;
      var duration = kind === 'openhat' ? 0.32 : kind === 'crash' || kind === 'ride' ? 0.7 : kind === 'shaker' ? 0.08 : 0.11;
      var env = connectEnvelope(ctx, out, start, duration, vel * (kind === 'hihat' ? 0.55 : 0.75), { attack: 0.001, decay: 0.04, sustain: 0.16, release: duration * 0.35 });
      source.connect(filter);
      filter.connect(env);
      source.start(start);
      source.stop(start + duration + 0.2);
      return true;
    }

    var perc = ctx.createOscillator();
    var percGain = connectEnvelope(ctx, out, start, 0.11, vel * 0.7, { attack: 0.001, decay: 0.04, sustain: 0.2, release: 0.04 });
    perc.type = kind === 'rim' ? 'square' : 'triangle';
    perc.frequency.value = kind === 'tomLow' ? 140 : kind === 'tomHigh' ? 240 : 720;
    perc.connect(percGain);
    perc.start(start);
    perc.stop(start + 0.18);
    return true;
  }

  function ogPlayNote(engine, event, when, durationSec) {
    if (!engine || !engine.available) return false;
    var C = getCore();
    var ctx = engine.ctx;
    var start = Math.max(ctx.currentTime, Number(when) || ctx.currentTime);
    var dur = Math.max(0.03, Number(durationSec) || 0.25);
    var midi = event && event.midi != null ? event.midi : C && C.ogNoteNameToMidi(event && event.pitch) || 60;
    var freq = C && C.ogFrequencyFromMidi ? C.ogFrequencyFromMidi(midi) : 440 * Math.pow(2, (midi - 69) / 12);
    var patch = C && C.ogNormalizeSynthInstrument ? C.ogNormalizeSynthInstrument(event && event.instrument) : event && event.instrument || {};
    var filterPatch = patch.filter || {};
    var envelopePatch = patch.envelope || {};
    var filter = ctx.createBiquadFilter();
    var output = createEffectOutput(engine, event && event.effects, start, dur + Math.max(0.18, Number(envelopePatch.release) || 0.18) + 1.5);
    var env = connectEnvelope(ctx, output, start, dur, event && event.velocity, envelopePatch);
    var partials = patch.partials && patch.partials.length ? patch.partials : [{ ratio: 1, type: patch.oscillator || 'sawtooth', gain: 1, detune: 0 }];
    var stopAt = start + dur + Math.max(0.18, Number(envelopePatch.release) || 0.18) + 0.05;
    filter.type = filterPatch.type || 'lowpass';
    filter.frequency.setValueAtTime(Math.max(80, Math.min(18000, Number(filterPatch.cutoff) || 4200)), start);
    filter.Q.value = Math.max(0.1, Math.min(20, Number(filterPatch.q) || 0.8));
    filter.connect(env);
    partials.forEach(function (partial) {
      var osc = ctx.createOscillator();
      var partialGain = ctx.createGain();
      osc.type = partial.type || patch.oscillator || 'sawtooth';
      osc.frequency.setValueAtTime(freq * Math.max(0.125, Number(partial.ratio) || 1), start);
      osc.detune.value = Number(partial.detune) || 0;
      partialGain.gain.value = Math.max(0, Math.min(1, Number(partial.gain) || 0));
      osc.connect(partialGain);
      partialGain.connect(filter);
      osc.start(start);
      osc.stop(stopAt);
    });
    if (patch.transient && patch.transient.gain > 0) {
      var source = ctx.createBufferSource();
      var transientDur = Math.max(0.001, Math.min(0.2, Number(patch.transient.duration) || 0.015));
      var transientFilter = ctx.createBiquadFilter();
      var transientEnv = connectEnvelope(ctx, output, start, transientDur, (event && event.velocity || 0.8) * patch.transient.gain, {
        attack: 0.001,
        decay: transientDur * 0.5,
        sustain: 0.01,
        release: transientDur
      });
      source.buffer = noiseBuffer(ctx, transientDur);
      transientFilter.type = 'bandpass';
      transientFilter.frequency.value = Math.max(200, Math.min(12000, Number(patch.transient.cutoff) || 4500));
      source.connect(transientFilter);
      transientFilter.connect(transientEnv);
      source.start(start);
      source.stop(start + transientDur + 0.02);
    }
    return true;
  }

  function ogRegisterSampleBuffer(assetId, buffer, metadata) {
    if (!assetId || !buffer) return false;
    sessionSamples[assetId] = {
      buffer: buffer,
      metadata: metadata || {}
    };
    return true;
  }

  function decodeArrayBuffer(engine, assetId, arrayBuffer, metadata) {
    if (!engine || !engine.available || !arrayBuffer || !engine.ctx.decodeAudioData) return Promise.resolve(false);
    var decodeInput = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
    var decoded = engine.ctx.decodeAudioData(decodeInput);
    return Promise.resolve(decoded).then(function (buffer) {
      return ogRegisterSampleBuffer(assetId, buffer, metadata || {});
    }).catch(function () {
      return false;
    });
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
    if (!/^data:audio\//i.test(text)) return Promise.resolve(null);
    if (root.fetch) {
      return root.fetch(text).then(function (response) { return response.arrayBuffer(); }).catch(function () { return null; });
    }
    if (!root.atob) return Promise.resolve(null);
    var comma = text.indexOf(',');
    if (comma < 0) return Promise.resolve(null);
    var binary = root.atob(text.slice(comma + 1).replace(/\s+/g, ''));
    var buffer = new ArrayBuffer(binary.length);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return Promise.resolve(buffer);
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
    var sample = sessionSamples[assetId];
    var buffer = sample && sample.buffer || null;
    if (!buffer) return false;
    var ctx = engine.ctx;
    var start = Math.max(ctx.currentTime, Number(when) || ctx.currentTime);
    var vel = Math.max(0, Math.min(1, Number(velocity) || 0.8));
    region = region || {};
    var offset = Math.max(0, Math.min(buffer.duration || 0, Number(region.startSec) || 0));
    var requestedEnd = region.endSec == null ? buffer.duration : Number(region.endSec);
    var end = Math.max(offset + 0.001, Math.min(buffer.duration || offset + 0.001, requestedEnd || buffer.duration));
    var duration = Math.max(0.001, end - offset);
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    var output = createEffectOutput(engine, effects, start, duration + 1.5);
    var gain = connectEnvelope(ctx, output, start, Math.max(0.03, duration), vel, { attack: 0.001, decay: 0.01, sustain: 0.98, release: 0.03 });
    source.connect(gain);
    source.start(start, offset, duration);
    source.stop(start + Math.max(0.04, duration) + 0.05);
    return true;
  }

  function ogSchedulePlan(engine, plan, options) {
    options = options || {};
    if (!engine || !engine.available || !Array.isArray(plan)) return 0;
    var scheduled = 0;
    plan.forEach(function (item) {
      if (item.type === 'automationPoint') return;
      if (item.muted || item.outputGain === 0) return;
      if (item.probability != null && item.probability < 1 && Math.random() > item.probability) return;
      var when = (Number(options.baseTime) || 0) + (Number(item.time) || 0);
      if (item.type === 'drumHit') {
        if (item.assetId && ogPlaySample(engine, item.assetId, when, item.velocity, item.sampleRegion, item.effects)) {
          scheduled += 1;
          return;
        }
        var padType = item.padEngine || item.event && (item.event.engine || item.event.padEngine) || item.padId || 'kick';
        var padMap = { pad_1: 'kick', pad_2: 'snare', pad_3: 'hihat', pad_4: 'openhat', pad_5: 'clap', pad_6: 'rim', pad_7: 'tomLow', pad_8: 'tomHigh', pad_9: 'crash', pad_10: 'ride', pad_11: 'shaker', pad_13: 'sub' };
        if (padMap[padType]) padType = padMap[padType];
        scheduled += ogPlayDrum(engine, padType, when, item.velocity, item.effects) ? 1 : 0;
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
