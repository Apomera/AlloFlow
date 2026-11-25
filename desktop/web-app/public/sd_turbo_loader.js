// sd_turbo_loader.js — local image generation for AlloFlow (SD-Turbo, WebGPU).
//
// The image twin of kokoro_tts_loader.js: when Imagen is rate-limited, out of
// quota, or has no API key, the app offers a one-time ~2GB download and then
// generates images ON DEVICE — private, free, offline-capable. Distilled
// Stable Diffusion (SD-Turbo, 1 denoising step, 512×512) via onnxruntime-web's
// WebGPU backend. Simpler images than Imagen by design — the fallback tier.
//
// Pipeline constants transcribed from Microsoft's onnxruntime-inference-
// examples/js/sd-turbo reference (verified 2026-07-05): sigma 14.6146,
// timestep 999, c_in = 1/sqrt(sigma^2+1), denoised = (sample - sigma*eps),
// VAE scaling 0.18215, models from huggingface.co/schmuell/sd-turbo-ort-web.
//
// Registers window._sdTurbo = { ready, supported(), init(onProgress),
// generate(prompt, opts) -> dataURL }. Models cache in the Cache API bucket
// "allo-sd-turbo" so the download happens once per device.
(function () {
  'use strict';
  if (typeof window !== 'object' || !window) return;
  if (window._sdTurbo) return;

  function notifyProgress(onProgress, payload) {
    if (typeof onProgress === 'function') {
      try { onProgress(payload); } catch (_) {}
    }
  }

  var ORT_ESM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.webgpu.min.mjs';
  var ORT_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
  var TRANSFORMERS_ESM = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/+esm';
  var MODEL_BASE = 'https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/ace89b7d2cd849f9a73914cdbb8a3ea60c853dd1/';
  var MAX_MODEL_BYTES = 2 * 1024 * 1024 * 1024;
  var MODELS = [
    { key: 'text_encoder', file: 'text_encoder/model.onnx' },
    { key: 'unet', file: 'unet/model.onnx' },
    { key: 'vae_decoder', file: 'vae_decoder/model.onnx' },
  ];
  var CACHE_NAME = 'allo-sd-turbo';
  var SIGMA = 14.6146;
  var TIMESTEP = 999;
  var VAE_SCALING = 0.18215;
  var LATENT = { channels: 4, height: 64, width: 64 };
  var IMAGE_SIZE = 512;

  var state = { ort: null, tokenizer: null, sessions: {}, initPromise: null, genQueue: Promise.resolve() };

  // ── pure pipeline math (exposed via __internals for node-side tests) ──────
  function randnLatents(count, noiseSigma) {
    var out = new Float32Array(count);
    for (var i = 0; i < count; i += 2) {
      var u1 = Math.random() || 1e-10;
      var u2 = Math.random();
      var radius = Math.sqrt(-2 * Math.log(u1));
      out[i] = radius * Math.cos(2 * Math.PI * u2) * noiseSigma;
      if (i + 1 < count) out[i + 1] = radius * Math.sin(2 * Math.PI * u2) * noiseSigma;
    }
    return out;
  }
  function scaleModelInputs(latents, sigma) {
    var divisor = Math.sqrt(sigma * sigma + 1);
    var out = new Float32Array(latents.length);
    for (var i = 0; i < latents.length; i++) out[i] = latents[i] / divisor;
    return out;
  }
  // One Euler step at gamma=0: denoised = sample - sigma*eps, then scale for VAE.
  function denoiseToVaeLatents(sample, noisePred, sigma, vaeScaling) {
    var len = Math.min(sample ? sample.length : 0, noisePred ? noisePred.length : 0);
    var scale = Number.isFinite(vaeScaling) && vaeScaling !== 0 ? vaeScaling : VAE_SCALING;
    var out = new Float32Array(len);
    for (var i = 0; i < len; i++) {
      out[i] = (sample[i] - sigma * noisePred[i]) / scale;
    }
    return out;
  }
  // VAE output is NCHW float in [-1, 1]; convert to RGBA pixels.
  function chwToRgba(data, width, height) {
    var plane = width * height;
    var rgba = new Uint8ClampedArray(plane * 4);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var p = y * width + x;
        for (var c = 0; c < 3; c++) {
          var raw = data ? data[c * plane + p] : 0;
          var v = Number.isFinite(raw) ? (raw / 2 + 0.5) : 0;
          rgba[p * 4 + c] = Math.max(0, Math.min(255, Math.round(v * 255)));
        }
        rgba[p * 4 + 3] = 255;
      }
    }
    return rgba;
  }
  function toHalf(f32) {
    // Float32 -> IEEE 754 half, round-to-nearest. Enough range for latents.
    var f32buf = new Float32Array(1);
    var u32buf = new Uint32Array(f32buf.buffer);
    var out = new Uint16Array(f32.length);
    for (var i = 0; i < f32.length; i++) {
      if (Number.isNaN(f32[i])) { out[i] = 0x7e00; continue; }
      f32buf[0] = f32[i];
      var bits = u32buf[0];
      var sign = (bits >>> 16) & 0x8000;
      var exponent = ((bits >>> 23) & 0xff) - 127 + 15;
      var mantissa = bits & 0x7fffff;
      if (exponent <= 0) { out[i] = sign; }
      else if (exponent >= 31) { out[i] = sign | 0x7c00; }
      else { out[i] = sign | (exponent << 10) | (mantissa >>> 13); }
    }
    return out;
  }
  function fromHalf(u16) {
    var out = new Float32Array(u16.length);
    for (var i = 0; i < u16.length; i++) {
      var h = u16[i];
      var sign = (h & 0x8000) ? -1 : 1;
      var exponent = (h >>> 10) & 0x1f;
      var mantissa = h & 0x3ff;
      if (exponent === 0) out[i] = sign * mantissa * Math.pow(2, -24);
      else if (exponent === 31) out[i] = mantissa ? NaN : sign * Infinity;
      else out[i] = sign * (1 + mantissa / 1024) * Math.pow(2, exponent - 15);
    }
    return out;
  }

  async function supported() {
    try {
      if (typeof navigator === 'undefined' || !navigator || !navigator.gpu) return false;
      var adapter = await navigator.gpu.requestAdapter();
      return Boolean(adapter);
    } catch (_) { return false; }
  }

  async function fetchModel(url, label, onProgress) {
    var cache = null;
    try { if (typeof caches !== 'undefined' && caches && typeof caches.open === 'function') cache = await caches.open(CACHE_NAME); } catch (_) {}
    if (cache) {
      try {
        var hit = await cache.match(url);
        if (hit) {
          var hitLen = Number(hit.headers && hit.headers.get && hit.headers.get('content-length')) || 0;
          if (hitLen > MAX_MODEL_BYTES) {
            try { await cache.delete(url); } catch (_) {}
          } else {
            var cachedBuf = await hit.arrayBuffer();
            if (cachedBuf.byteLength > MAX_MODEL_BYTES) {
              try { await cache.delete(url); } catch (_) {}
            } else if (cachedBuf.byteLength === 0) {
              try { await cache.delete(url); } catch (_) {}
            } else {
              notifyProgress(onProgress, { file: label, pct: 1, cached: true });
              return cachedBuf;
            }
          }
        }
      } catch (_) {
        try { await cache.delete(url); } catch (_2) {}
      }
    }
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var stallTimer = null;
    var resetStall = function () {
      if (!ctrl) return;
      if (stallTimer !== null) clearTimeout(stallTimer);
      stallTimer = setTimeout(function () { ctrl.abort(); }, 60000);
    };
    resetStall();
    var cachePutPromise = null;
    try {
      var fetchOpts = ctrl ? { signal: ctrl.signal, credentials: 'omit' } : { credentials: 'omit' };
      var response = await fetch(url, fetchOpts);
      if (!response || !response.ok) throw new Error(label + ' download failed (HTTP ' + (response ? response.status : 'unknown') + ')');
      var total = Number(response.headers && response.headers.get && response.headers.get('content-length')) || 0;
      if (total > MAX_MODEL_BYTES) {
        try { if (response.body && typeof response.body.cancel === 'function') response.body.cancel(); } catch (_) {}
        throw new Error(label + ' exceeds maximum model size limit');
      }
      // Memory discipline: these files are up to ~1.7GB and the target machines
      // have 8-16GB total. The cache is fed by a clone that the browser streams
      // to CacheStorage in parallel (no JS-heap copy), and when the server
      // reports a length we read straight into ONE preallocated buffer — peak
      // stays ~1x file size instead of the previous ~3-4x.
      if (cache && typeof response.clone === 'function') {
        try { cachePutPromise = cache.put(url, response.clone()).catch(function () { /* quota — still usable this session */ }); }
        catch (_) { cachePutPromise = null; }
      }
      if (!response.body || typeof response.body.getReader !== 'function') {
        resetStall();
        var whole = await response.arrayBuffer();
        if (whole.byteLength > MAX_MODEL_BYTES) {
          throw new Error(label + ' exceeded maximum model size limit');
        }
        if ((total > 0 && whole.byteLength !== total) || whole.byteLength === 0) {
          throw new Error(label + ' download was truncated (' + whole.byteLength + ' of ' + total + ' bytes)');
        }
        notifyProgress(onProgress, { file: label, pct: 1 });
        if (cachePutPromise) { try { await cachePutPromise; } catch (_) {} }
        return whole;
      }
      var reader = response.body.getReader();
      var received = 0;
      var buffer = total ? new Uint8Array(total) : null;
      var chunks = buffer ? null : [];
      for (;;) {
        resetStall();
        var step = await reader.read();
        if (step.done) break;
        if (!step.value || !step.value.length) continue;
        if (received + step.value.length > MAX_MODEL_BYTES) {
          try { if (ctrl) ctrl.abort(); } catch (_) {}
          try { if (typeof reader.cancel === 'function') reader.cancel(); } catch (_) {}
          throw new Error(label + ' exceeded maximum model size limit');
        }
        if (buffer) {
          if (received + step.value.length > buffer.length) {
            // Server lied about content-length — fall back to chunk collection.
            chunks = [buffer.subarray(0, received)];
            buffer = null;
            chunks.push(step.value);
          } else {
            buffer.set(step.value, received);
          }
        } else {
          chunks.push(step.value);
        }
        received += step.value.length;
        if (total) notifyProgress(onProgress, { file: label, pct: Math.min(1, received / total) });
      }
      if ((total > 0 && received !== total) || received === 0) {
        throw new Error(label + ' download was truncated (' + received + ' of ' + total + ' bytes)');
      }
      if (cachePutPromise) { try { await cachePutPromise; } catch (_) {} }
      if (buffer) {
        return received === buffer.length ? buffer.buffer : buffer.buffer.slice(0, received);
      }
      var joined = new Uint8Array(received);
      var offset = 0;
      for (var i = 0; i < chunks.length; i++) { joined.set(chunks[i], offset); offset += chunks[i].length; }
      return joined.buffer;
    } catch (err) {
      if (cache) {
        if (cachePutPromise) { try { await cachePutPromise; } catch (_) {} }
        try { await cache.delete(url); } catch (_) {}
      }
      throw err;
    } finally {
      if (stallTimer !== null) clearTimeout(stallTimer);
    }
  }

  function releasePartialSessions() {
    var keys = Object.keys(state.sessions || {});
    for (var i = 0; i < keys.length; i++) {
      var s = state.sessions[keys[i]];
      try {
        if (s && typeof s.release === 'function') {
          var rel = s.release();
          if (rel && typeof rel.catch === 'function') rel.catch(function () {});
        }
      } catch (_) {}
    }
    state.sessions = {};
    state.ort = null;
    state.tokenizer = null;
    if (window._sdTurbo) window._sdTurbo.ready = false;
  }

  async function init(onProgress) {
    if (window._sdTurbo.ready) return true;
    if (
      window._isDesktopBundledApp === true ||
      window.__alloOfflineOnly === true ||
      window.__ALLO_LOCAL_BOX === true ||
      !!window.__alloQrStudentMode ||
      window._alloQrBlocked === true ||
      window.__alloStudentAiDisabled === true
    ) {
      throw new Error('Remote SD-Turbo download is disabled in this mode');
    }
    if (state.initPromise) return state.initPromise;
    var currentInit = (async function () {
      if (!(await supported())) throw new Error('This device/browser has no WebGPU — local image generation is unavailable.');
      if (typeof window.__alloLoadVerifiedRuntime !== 'function') throw new Error('Verified image runtime delivery is unavailable');
      var ortModule = await window.__alloLoadVerifiedRuntime('ort121');
      var ort = ortModule.default || ortModule;
      state.ort = ort;
      var transformers = await window.__alloLoadVerifiedRuntime('transformers331');
      state.tokenizer = await transformers.AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16');

      var overrides = {
        text_encoder: { batch_size: 1 },
        unet: { batch_size: 1, num_channels: 4, height: 64, width: 64, sequence_length: 77 },
        vae_decoder: { batch_size: 1, num_channels_latent: 4, height_latent: 64, width_latent: 64 },
      };
      for (var i = 0; i < MODELS.length; i++) {
        var m = MODELS[i];
        var modelUrl = MODEL_BASE + m.file;
        var bytes = await fetchModel(modelUrl, m.key, onProgress);
        notifyProgress(onProgress, { file: m.key, pct: 1, stage: 'loading' });
        try {
          state.sessions[m.key] = await ort.InferenceSession.create(bytes, {
            executionProviders: ['webgpu'],
            enableMemPattern: false,
            enableCpuMemArena: false,
            freeDimensionOverrides: overrides[m.key],
            extra: { session: {
              disable_prepacking: '1',
              use_device_allocator_for_initializers: '1',
              use_ort_model_bytes_directly: '1',
              use_ort_model_bytes_for_initializers: '1',
            } },
          });
        } catch (sessionErr) {
          try {
            if (typeof caches !== 'undefined' && caches && typeof caches.open === 'function') {
              var cache = await caches.open(CACHE_NAME);
              await cache.delete(modelUrl);
            }
          } catch (_) {}
          throw sessionErr;
        }
      }
      window._sdTurbo.ready = true;
      return true;
    })().catch(function (error) {
      releasePartialSessions();
      if (state.initPromise === currentInit) state.initPromise = null;
      throw error;
    });
    state.initPromise = currentInit;
    return currentInit;
  }

  function makeFloatTensor(session, name, data, dims) {
    // Feed fp16 models fp16, fp32 models fp32 — read the session's declared type.
    var ort = state.ort;
    var meta = getInputMeta(session, name);
    var type = meta && (meta.type || meta.dataType);
    if (typeof type === 'string' && /float16/.test(type)) {
      return new ort.Tensor('float16', toHalf(data), dims);
    }
    return new ort.Tensor('float32', data, dims);
  }
  function makeTimestepTensor(session, name, value) {
    var ort = state.ort;
    var meta = getInputMeta(session, name);
    var type = meta && (meta.type || meta.dataType);
    if (typeof type === 'string' && /int32/.test(type)) {
      return new ort.Tensor('int32', new Int32Array([value]), [1]);
    }
    return new ort.Tensor('int64', new BigInt64Array([BigInt(value)]), [1]);
  }
  function getInputMeta(session, name) {
    try {
      if (!session || !session.inputMetadata) return null;
      var byName = Object.prototype.hasOwnProperty.call(session.inputMetadata, name) ? session.inputMetadata[name] : null;
      if (byName) return byName;
      var names = Array.isArray(session.inputNames) ? session.inputNames : [];
      var index = names.indexOf(name);
      return index >= 0 && Object.prototype.hasOwnProperty.call(session.inputMetadata, index) ? session.inputMetadata[index] : null;
    } catch (_) { return null; }
  }
  function tensorToFloat32(tensor) {
    if (tensor.type === 'float16') {
      var data = tensor.data;
      var u16;
      if (data instanceof Uint16Array) {
        u16 = data;
      } else if (ArrayBuffer.isView(data)) {
        // Respect the view's byteOffset/byteLength safely even for Uint8Array
        // views or unaligned byte offsets returned from pooled WASM/WebGPU memory.
        var elemCount = Math.floor(data.byteLength / 2);
        if ((data.byteOffset % 2) === 0 && (data.byteLength % 2) === 0) {
          u16 = new Uint16Array(data.buffer, data.byteOffset, elemCount);
        } else {
          var aligned = data.buffer.slice(data.byteOffset, data.byteOffset + elemCount * 2);
          u16 = new Uint16Array(aligned);
        }
      } else {
        u16 = new Uint16Array(data);
      }
      return fromHalf(u16);
    }
    return tensor.data instanceof Float32Array ? tensor.data : new Float32Array(tensor.data);
  }
  function looksLikeTensor(value) {
    return Boolean(value && value.data && value.dims);
  }
  function pickSessionName(session, key, preferred, fallbackIndex) {
    var names = [];
    try { names = Array.isArray(session && session[key]) ? session[key] : []; } catch (_) {}
    var wanted = Array.isArray(preferred) ? preferred : [preferred];
    for (var i = 0; i < wanted.length; i++) {
      if (names.indexOf(wanted[i]) >= 0) return wanted[i];
    }
    for (var w = 0; w < wanted.length; w++) {
      var target = String(wanted[w]).toLowerCase();
      for (var n = 0; n < names.length; n++) {
        if (String(names[n]).toLowerCase() === target) return names[n];
      }
    }
    if (typeof fallbackIndex === 'number' && names[fallbackIndex]) return names[fallbackIndex];
    return names[0] || wanted[0];
  }
  function pickOutput(outputs, preferred) {
    if (!outputs || typeof outputs !== 'object') return null;
    var wanted = Array.isArray(preferred) ? preferred : [preferred];
    for (var i = 0; i < wanted.length; i++) {
      if (Object.prototype.hasOwnProperty.call(outputs, wanted[i]) && looksLikeTensor(outputs[wanted[i]])) return outputs[wanted[i]];
    }
    var keys = Object.keys(outputs);
    for (var w = 0; w < wanted.length; w++) {
      var target = String(wanted[w]).toLowerCase();
      for (var k = 0; k < keys.length; k++) {
        if (String(keys[k]).toLowerCase() === target && looksLikeTensor(outputs[keys[k]])) return outputs[keys[k]];
      }
    }
    for (var j = 0; j < keys.length; j++) {
      if (looksLikeTensor(outputs[keys[j]])) return outputs[keys[j]];
    }
    return null;
  }

  function _collectDisposables(list, mapOrTensor) {
    if (!mapOrTensor) return;
    if (typeof mapOrTensor.dispose === 'function') {
      if (list.indexOf(mapOrTensor) < 0) list.push(mapOrTensor);
      return;
    }
    if (typeof mapOrTensor === 'object') {
      var keys = Object.keys(mapOrTensor);
      for (var i = 0; i < keys.length; i++) {
        var v = mapOrTensor[keys[i]];
        if (v && typeof v.dispose === 'function' && list.indexOf(v) < 0) list.push(v);
      }
    }
  }

  async function _runGenerate(prompt, options) {
    if (!window._sdTurbo.ready) throw new Error('Local image generator is not loaded yet.');
    var ort = state.ort;
    var opts = options || {};
    var disposables = [];
    var canvas = null;
    try {
      var encoded = await state.tokenizer(String(prompt || 'a drawing'), {
        padding: 'max_length', max_length: 77, truncation: true, return_tensor: false,
      });
      var rawIds = encoded && encoded.input_ids;
      var ids = (rawIds && typeof rawIds === 'object' && !Array.isArray(rawIds) && !ArrayBuffer.isView(rawIds) && rawIds.data)
        ? rawIds.data
        : rawIds;
      if (!ids || typeof ids.length !== 'number') {
        throw new Error('SD-Turbo tokenizer returned invalid input_ids.');
      }
      var idsInt32 = new Int32Array(77);
      for (var i = 0; i < 77; i++) idsInt32[i] = Number(ids[i] || 0);
      var textInputName = pickSessionName(state.sessions.text_encoder, 'inputNames', ['input_ids'], 0);
      var textFeed = {};
      textFeed[textInputName] = new ort.Tensor('int32', idsInt32, [1, 77]);
      _collectDisposables(disposables, textFeed);
      var textOut = await state.sessions.text_encoder.run(textFeed);
      _collectDisposables(disposables, textOut);
      var hidden = pickOutput(textOut, ['last_hidden_state', 'hidden_states', 'encoder_hidden_states']);
      if (!hidden) throw new Error('SD-Turbo text encoder returned no usable hidden-state tensor.');

      var latentCount = LATENT.channels * LATENT.height * LATENT.width;
      var latents = randnLatents(latentCount, SIGMA);
      var scaled = scaleModelInputs(latents, SIGMA);
      var unetSampleName = pickSessionName(state.sessions.unet, 'inputNames', ['sample', 'latent_model_input', 'latents'], 0);
      var unetTimestepName = pickSessionName(state.sessions.unet, 'inputNames', ['timestep', 'timesteps', 't'], 1);
      var unetHiddenName = pickSessionName(state.sessions.unet, 'inputNames', ['encoder_hidden_states', 'text_embeds', 'context'], 2);
      var unetFeed = {};
      unetFeed[unetSampleName] = makeFloatTensor(state.sessions.unet, unetSampleName, scaled, [1, LATENT.channels, LATENT.height, LATENT.width]);
      unetFeed[unetTimestepName] = makeTimestepTensor(state.sessions.unet, unetTimestepName, TIMESTEP);
      unetFeed[unetHiddenName] = hidden;
      _collectDisposables(disposables, unetFeed);
      var unetOut = await state.sessions.unet.run(unetFeed);
      _collectDisposables(disposables, unetOut);
      var noisePredTensor = pickOutput(unetOut, ['out_sample', 'sample', 'noise_pred', 'latent']);
      if (!noisePredTensor) throw new Error('SD-Turbo UNet returned no usable noise tensor.');
      var noisePred = tensorToFloat32(noisePredTensor);
      var vaeLatents = denoiseToVaeLatents(latents, noisePred, SIGMA, VAE_SCALING);
      var vaeInputName = pickSessionName(state.sessions.vae_decoder, 'inputNames', ['latent_sample', 'sample', 'latents'], 0);
      var vaeFeed = {};
      vaeFeed[vaeInputName] = makeFloatTensor(state.sessions.vae_decoder, vaeInputName, vaeLatents, [1, LATENT.channels, LATENT.height, LATENT.width]);
      _collectDisposables(disposables, vaeFeed);
      var vaeOut = await state.sessions.vae_decoder.run(vaeFeed);
      _collectDisposables(disposables, vaeOut);
      var imageTensor = pickOutput(vaeOut, ['sample', 'out_sample', 'image', 'images']);
      if (!imageTensor) throw new Error('SD-Turbo VAE returned no usable image tensor.');
      var image = tensorToFloat32(imageTensor);
      var rgba = chwToRgba(image, IMAGE_SIZE, IMAGE_SIZE);
      if (typeof document === 'undefined' || !document || typeof document.createElement !== 'function') {
        throw new Error('Canvas rendering is unavailable in this environment.');
      }
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = IMAGE_SIZE;
      canvas.height = IMAGE_SIZE;
      var ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D canvas context is unavailable for SD-Turbo rendering.');
      var imgData = typeof ImageData === 'function'
        ? new ImageData(rgba, IMAGE_SIZE, IMAGE_SIZE)
        : (typeof ctx.createImageData === 'function' ? Object.assign(ctx.createImageData(IMAGE_SIZE, IMAGE_SIZE), {}) : null);
      if (!imgData) throw new Error('ImageData is unavailable for SD-Turbo rendering.');
      if (typeof ImageData !== 'function' && imgData.data && typeof imgData.data.set === 'function') {
        imgData.data.set(rgba);
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL(opts.mime || 'image/png');
    } finally {
      for (var d = 0; d < disposables.length; d++) {
        try { if (disposables[d] && typeof disposables[d].dispose === 'function') disposables[d].dispose(); } catch (_) {}
      }
      if (canvas) {
        try { canvas.width = 0; canvas.height = 0; } catch (_) {}
      }
    }
  }

  function generate(prompt, options) {
    if (!window._sdTurbo.ready) return Promise.reject(new Error('Local image generator is not loaded yet.'));
    var task = state.genQueue.then(
      function () { return _runGenerate(prompt, options); },
      function () { return _runGenerate(prompt, options); }
    );
    state.genQueue = task.then(function () {}, function () {});
    return task;
  }

  window._sdTurbo = {
    ready: false,
    supported: supported,
    init: init,
    generate: generate,
    __internals: {
      randnLatents: randnLatents,
      scaleModelInputs: scaleModelInputs,
      denoiseToVaeLatents: denoiseToVaeLatents,
      chwToRgba: chwToRgba,
      toHalf: toHalf,
      fromHalf: fromHalf,
      tensorToFloat32: tensorToFloat32,
      pickSessionName: pickSessionName,
      pickOutput: pickOutput,
      constants: { SIGMA: SIGMA, TIMESTEP: TIMESTEP, VAE_SCALING: VAE_SCALING },
    },
  };
  if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
    console.log('[SD-Turbo] Loader registered (WebGPU local image generation)');
  }
})();
