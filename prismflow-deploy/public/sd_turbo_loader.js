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
  if (window._sdTurbo) return;

  var ORT_ESM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.webgpu.min.mjs';
  var ORT_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
  var TRANSFORMERS_ESM = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/+esm';
  var MODEL_BASE = 'https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/main/';
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

  var state = { ort: null, tokenizer: null, sessions: {}, initPromise: null };

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
    var out = new Float32Array(sample.length);
    for (var i = 0; i < sample.length; i++) {
      out[i] = (sample[i] - sigma * noisePred[i]) / vaeScaling;
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
          var v = data[c * plane + p] / 2 + 0.5;
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
      if (!navigator.gpu) return false;
      var adapter = await navigator.gpu.requestAdapter();
      return Boolean(adapter);
    } catch (_) { return false; }
  }

  async function fetchModel(url, label, onProgress) {
    var cache = null;
    try { cache = await caches.open(CACHE_NAME); } catch (_) {}
    if (cache) {
      var hit = await cache.match(url);
      if (hit) {
        if (onProgress) onProgress({ file: label, pct: 1, cached: true });
        return await hit.arrayBuffer();
      }
    }
    var response = await fetch(url);
    if (!response.ok) throw new Error(label + ' download failed (HTTP ' + response.status + ')');
    var total = Number(response.headers.get('content-length')) || 0;
    var reader = response.body.getReader();
    var chunks = [];
    var received = 0;
    for (;;) {
      var step = await reader.read();
      if (step.done) break;
      chunks.push(step.value);
      received += step.value.length;
      if (onProgress && total) onProgress({ file: label, pct: received / total });
    }
    var buffer = new Uint8Array(received);
    var offset = 0;
    for (var i = 0; i < chunks.length; i++) { buffer.set(chunks[i], offset); offset += chunks[i].length; }
    if (cache) { try { await cache.put(url, new Response(buffer.buffer.slice(0))); } catch (_) { /* quota — still usable this session */ } }
    return buffer.buffer;
  }

  async function init(onProgress) {
    if (window._sdTurbo.ready) return true;
    if (state.initPromise) return state.initPromise;
    state.initPromise = (async function () {
      if (!(await supported())) throw new Error('This device/browser has no WebGPU — local image generation is unavailable.');
      var ortModule = await import(ORT_ESM);
      var ort = ortModule.default || ortModule;
      ort.env.wasm.wasmPaths = ORT_WASM_BASE;
      state.ort = ort;
      var transformers = await import(TRANSFORMERS_ESM);
      state.tokenizer = await transformers.AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch16');

      var overrides = {
        text_encoder: { batch_size: 1 },
        unet: { batch_size: 1, num_channels: 4, height: 64, width: 64, sequence_length: 77 },
        vae_decoder: { batch_size: 1, num_channels_latent: 4, height_latent: 64, width_latent: 64 },
      };
      for (var i = 0; i < MODELS.length; i++) {
        var m = MODELS[i];
        var bytes = await fetchModel(MODEL_BASE + m.file, m.key, onProgress);
        if (onProgress) onProgress({ file: m.key, pct: 1, stage: 'loading' });
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
      }
      window._sdTurbo.ready = true;
      return true;
    })();
    try { return await state.initPromise; }
    catch (error) { state.initPromise = null; throw error; }
  }

  function makeFloatTensor(session, name, data, dims) {
    // Feed fp16 models fp16, fp32 models fp32 — read the session's declared type.
    var ort = state.ort;
    var meta = null;
    try { meta = session.inputMetadata && (session.inputMetadata[name] || session.inputMetadata[session.inputNames.indexOf(name)]); } catch (_) {}
    var type = meta && (meta.type || meta.dataType);
    if (typeof type === 'string' && /float16/.test(type)) {
      return new ort.Tensor('float16', toHalf(data), dims);
    }
    return new ort.Tensor('float32', data, dims);
  }
  function tensorToFloat32(tensor) {
    if (tensor.type === 'float16') return fromHalf(new Uint16Array(tensor.data.buffer || tensor.data));
    return tensor.data instanceof Float32Array ? tensor.data : new Float32Array(tensor.data);
  }

  async function generate(prompt, options) {
    if (!window._sdTurbo.ready) throw new Error('Local image generator is not loaded yet.');
    var ort = state.ort;
    var opts = options || {};
    var encoded = await state.tokenizer(String(prompt || 'a drawing'), {
      padding: 'max_length', max_length: 77, truncation: true, return_tensor: false,
    });
    var ids = encoded.input_ids;
    var idsInt32 = new Int32Array(77);
    for (var i = 0; i < 77; i++) idsInt32[i] = Number(ids[i] || 0);
    var textOut = await state.sessions.text_encoder.run({
      input_ids: new ort.Tensor('int32', idsInt32, [1, 77]),
    });
    var hidden = textOut.last_hidden_state;

    var latentCount = LATENT.channels * LATENT.height * LATENT.width;
    var latents = randnLatents(latentCount, SIGMA);
    var scaled = scaleModelInputs(latents, SIGMA);
    var unetFeed = {
      sample: makeFloatTensor(state.sessions.unet, 'sample', scaled, [1, LATENT.channels, LATENT.height, LATENT.width]),
      timestep: new ort.Tensor('int64', new BigInt64Array([BigInt(TIMESTEP)]), [1]),
      encoder_hidden_states: hidden,
    };
    var unetOut = await state.sessions.unet.run(unetFeed);
    var noisePred = tensorToFloat32(unetOut.out_sample);
    var vaeLatents = denoiseToVaeLatents(latents, noisePred, SIGMA, VAE_SCALING);
    var vaeOut = await state.sessions.vae_decoder.run({
      latent_sample: makeFloatTensor(state.sessions.vae_decoder, 'latent_sample', vaeLatents, [1, LATENT.channels, LATENT.height, LATENT.width]),
    });
    var image = tensorToFloat32(vaeOut.sample);
    var rgba = chwToRgba(image, IMAGE_SIZE, IMAGE_SIZE);
    var canvas = document.createElement('canvas');
    canvas.width = IMAGE_SIZE;
    canvas.height = IMAGE_SIZE;
    canvas.getContext('2d').putImageData(new ImageData(rgba, IMAGE_SIZE, IMAGE_SIZE), 0, 0);
    return canvas.toDataURL(opts.mime || 'image/png');
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
      constants: { SIGMA: SIGMA, TIMESTEP: TIMESTEP, VAE_SCALING: VAE_SCALING },
    },
  };
  console.log('[SD-Turbo] Loader registered (WebGPU local image generation)');
})();
