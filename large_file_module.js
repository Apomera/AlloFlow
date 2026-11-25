(function() {
'use strict';
  // WCAG 2.1 AA: respect prefers-reduced-motion + keep slate-600 AA contrast
  if (typeof document !== "undefined" && document.head && typeof document.getElementById === "function" && typeof document.createElement === "function" && !document.getElementById("large-file-module-a11y")) { var _s = document.createElement("style"); _s.id = "large-file-module-a11y"; _s.textContent = "[data-large-file-modal] button,[data-large-file-modal] [role='button'],[data-large-file-modal] a,[data-large-file-modal] input,[data-large-file-modal] select,[data-large-file-modal] textarea{touch-action:manipulation;}[data-large-file-modal] button:focus-visible,[data-large-file-modal] [role='button']:focus-visible,[data-large-file-modal] a:focus-visible,[data-large-file-modal] input:focus-visible,[data-large-file-modal] select:focus-visible,[data-large-file-modal] textarea:focus-visible{outline:2px solid #4f46e5;outline-offset:2px;}@media (forced-colors: active){[data-large-file-modal] button:focus-visible,[data-large-file-modal] [role='button']:focus-visible,[data-large-file-modal] a:focus-visible,[data-large-file-modal] input:focus-visible,[data-large-file-modal] select:focus-visible,[data-large-file-modal] textarea:focus-visible{outline:2px solid Highlight;outline-offset:2px;}}@media (prefers-reduced-motion: reduce){[data-large-file-modal] *,[data-large-file-modal] *::before,[data-large-file-modal] *::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;scroll-behavior:auto !important;}}"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.LargeFileModule) { console.log('[CDN] LargeFileModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var React = window.React || React;
var _cachedFallbackAudioCtx = null;
var getGlobalAudioContext = typeof window !== "undefined" && window.getGlobalAudioContext ? window.getGlobalAudioContext : (function() {
  if (typeof window !== "undefined" && typeof window.getGlobalAudioContext === "function") {
    return window.getGlobalAudioContext();
  }
  if (_cachedFallbackAudioCtx && _cachedFallbackAudioCtx.state !== "closed") {
    return _cachedFallbackAudioCtx;
  }
  var Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  try {
    _cachedFallbackAudioCtx = Ctx ? new Ctx() : null;
  } catch (_) {
    _cachedFallbackAudioCtx = null;
  }
  return _cachedFallbackAudioCtx;
});
function _normLargeFileOverlapWord(w) {
  return String(w || "").toLowerCase().replace(/^[^a-z0-9\u00C0-\u024F]+|[^a-z0-9\u00C0-\u024F]+$/gi, "");
}
function _dedupeLargeFileOverlap(existing, incoming) {
  if (typeof window !== "undefined" && window.AlloFlowVoice && typeof window.AlloFlowVoice.dedupeOverlapText === "function") {
    return window.AlloFlowVoice.dedupeOverlapText(existing, incoming);
  }
  const left = String(existing || "").trim();
  const right = String(incoming || "").trim();
  if (!left) return right;
  if (!right) return left;
  const leftWords = left.split(/\s+/);
  const rightWords = right.split(/\s+/);
  const maxCheck = Math.min(8, leftWords.length, rightWords.length);
  let overlap = 0;
  for (let k = maxCheck; k >= 1; k--) {
    let matched = true;
    for (let i = 0; i < k; i++) {
      const a = _normLargeFileOverlapWord(leftWords[leftWords.length - k + i]);
      const b = _normLargeFileOverlapWord(rightWords[i]);
      if (!a || a !== b) {
        matched = false;
        break;
      }
    }
    if (matched) {
      if (k === 1 && _normLargeFileOverlapWord(rightWords[0]).length < 3) continue;
      overlap = k;
      break;
    }
  }
  const tail = rightWords.slice(overlap).join(" ");
  return tail ? left + " " + tail : left;
}
function _isGeminiAudioAllowed(transcribeChunk) {
  if (transcribeChunk && transcribeChunk._alloQrBlocked === true) return false;
  if (typeof window === "undefined") return true;
  if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window.__alloQrStudentMode === true || window._alloQrBlocked === true || window.__alloOfflineOnly === true || window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false) {
    return false;
  }
  if (typeof window.__alloAiUsable === "function") {
    return !!window.__alloAiUsable("audio", transcribeChunk);
  }
  const voice = window.AlloFlowVoice;
  if (voice && typeof voice.getGeminiAudioCapability === "function") {
    try {
      const cap = voice.getGeminiAudioCapability({ callGeminiAudio: transcribeChunk });
      if (cap && cap.available === false) return false;
    } catch (_) {
    }
  }
  return true;
}
function _pcm16kToWavBlob(samples, sampleRate = 16e3) {
  if (typeof window !== "undefined" && window.AlloFlowVoice && typeof window.AlloFlowVoice.pcmToWavBlob === "function") {
    return window.AlloFlowVoice.pcmToWavBlob(samples, sampleRate);
  }
  const input = samples instanceof Float32Array ? samples : new Float32Array(samples || []);
  const rate = Math.max(8e3, Math.round(Number(sampleRate) || 16e3));
  const dataLength = input.length * 2;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
  for (let k = 0; k < input.length; k++) {
    const s = Math.max(-1, Math.min(1, input[k]));
    view.setInt16(44 + k * 2, s < 0 ? s * 32768 : s * 32767, true);
  }
  return new Blob([wavBuffer], { type: "audio/wav" });
}
const LargeFileHandler = {
  CHUNK_DURATION_SECONDS: 240,
  CHUNK_OVERLAP_SECONDS: 2,
  TARGET_SAMPLE_RATE: 16e3,
  MAX_CHUNK_SIZE_BYTES: 15 * 1024 * 1024,
  MAX_RETAINED_AUDIO_BYTES: 30 * 1024 * 1024,
  MAX_FILE_SIZE_BYTES: 500 * 1024 * 1024,
  MAX_AUDIO_DURATION_SECONDS: 4 * 3600,
  preferredBackend: "whisper",
  isProcessing: false,
  cancelRequested: false,
  getDefaultBackend() {
    try {
      const voice = typeof window !== "undefined" ? window.AlloFlowVoice : null;
      if (voice && typeof voice.isIosCanvasVoiceSurface === "function" && voice.isIosCanvasVoiceSurface()) {
        return "gemini";
      }
    } catch (_) {
    }
    return "whisper";
  },
  dedupeOverlapText(existing, incoming) {
    return _dedupeLargeFileOverlap(existing, incoming);
  },
  extractChunkPcm16k(audioBuffer, startSec, endSec) {
    if (!audioBuffer || typeof audioBuffer.getChannelData !== "function") {
      throw new Error("Invalid audio buffer.");
    }
    const sampleRate = Number(audioBuffer.sampleRate);
    if (!Number.isFinite(sampleRate) || sampleRate < 1e3 || sampleRate > 384e3) {
      throw new Error("Unsupported audio sample rate.");
    }
    const totalLength = Math.max(0, Math.floor(Number(audioBuffer.length) || 0));
    const startSample = Math.max(0, Math.min(totalLength, Math.floor(Math.max(0, Number(startSec) || 0) * sampleRate)));
    const endSample = Math.max(startSample, Math.min(totalLength, Math.floor(Math.max(0, Number(endSec) || audioBuffer.duration || 0) * sampleRate)));
    const sliceLen = endSample - startSample;
    if (sliceLen <= 0) return new Float32Array(0);
    const channelCount = Math.min(32, Math.max(1, Math.floor(Number(audioBuffer.numberOfChannels) || 1)));
    const mono = new Float32Array(sliceLen);
    if (channelCount === 1) {
      mono.set(audioBuffer.getChannelData(0).subarray(startSample, endSample));
    } else {
      const channels = Array.from({ length: channelCount }, (_, ch) => audioBuffer.getChannelData(ch));
      const inv = 1 / channelCount;
      for (let i = 0; i < sliceLen; i++) {
        let sum = 0;
        for (let ch = 0; ch < channelCount; ch++) sum += channels[ch][startSample + i] || 0;
        mono[i] = sum * inv;
      }
    }
    const targetRate = this.TARGET_SAMPLE_RATE;
    if (sampleRate === targetRate) return mono;
    const ratio = targetRate / sampleRate;
    const outLen = Math.max(1, Math.floor(sliceLen * ratio));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i / ratio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, sliceLen - 1);
      const frac = srcIdx - lo;
      out[i] = mono[lo] * (1 - frac) + mono[hi] * frac;
    }
    return out;
  },
  needsChunking(file) {
    return !!(file && typeof file.size === "number" && Number.isFinite(file.size) && file.size > this.MAX_CHUNK_SIZE_BYTES);
  },
  getFileType(file) {
    if (!file || typeof file !== "object") return "unknown";
    const type = typeof file.type === "string" ? file.type.toLowerCase() : "";
    if (type.startsWith("audio/")) return "audio";
    if (type.startsWith("video/")) return "video";
    if (type === "application/pdf") return "pdf";
    const name = typeof file.name === "string" ? file.name : "";
    const dotIdx = name.lastIndexOf(".");
    const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return "audio";
    if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
    if (ext === "pdf") return "pdf";
    return "unknown";
  },
  readFileAsArrayBuffer(file) {
    if (!file) return Promise.reject(new Error("No media file selected."));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onabort = () => reject(new Error("File read was aborted"));
      reader.readAsArrayBuffer(file);
    });
  },
  formatDuration(seconds) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  },
  async _decodeMediaFile(file, readMessage, onProgress = () => {
  }) {
    const reportProgress = (cur, tot, msg) => {
      if (typeof onProgress === "function") {
        try {
          onProgress(cur, tot, msg);
        } catch (_) {
        }
      }
    };
    if (!file) {
      throw new Error("No media file selected.");
    }
    if (typeof file.size === "number" && (!Number.isFinite(file.size) || file.size < 0 || file.size > this.MAX_FILE_SIZE_BYTES)) {
      throw new Error("File exceeds the 500 MB large-file safety limit.");
    }
    if (this.cancelRequested) {
      throw new Error("Cancelled");
    }
    reportProgress(0, 1, readMessage);
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    if (this.cancelRequested) {
      throw new Error("Cancelled");
    }
    if (!arrayBuffer || typeof arrayBuffer.byteLength !== "number" || arrayBuffer.byteLength > this.MAX_FILE_SIZE_BYTES) {
      throw new Error("File exceeds the 500 MB large-file safety limit.");
    }
    const audioCtx = getGlobalAudioContext();
    if (!audioCtx) {
      throw new Error("Web Audio API not supported");
    }
    reportProgress(0, 1, "Decoding audio...");
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (this.cancelRequested) {
      throw new Error("Cancelled");
    }
    if (!audioBuffer || typeof audioBuffer.duration !== "number") {
      throw new Error("Invalid audio buffer.");
    }
    const totalDuration = audioBuffer.duration;
    if (!Number.isFinite(totalDuration) || totalDuration < 0 || totalDuration > this.MAX_AUDIO_DURATION_SECONDS) {
      throw new Error("Audio duration exceeds the 4-hour processing limit.");
    }
    return { audioCtx, audioBuffer };
  },
  async transcribeAudioBuffer(audioCtx, audioBuffer, options = {}) {
    const opts = options || {};
    const backend = opts.backend === "gemini" ? "gemini" : "whisper";
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : () => {
    };
    const reportProgress = (cur, tot, msg) => {
      try {
        onProgress(cur, tot, msg);
      } catch (_) {
      }
    };
    const totalDuration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    if (!Number.isFinite(sampleRate) || sampleRate < 1e3 || sampleRate > 384e3) {
      throw new Error("Unsupported audio sample rate.");
    }
    if (!Number.isFinite(numberOfChannels) || numberOfChannels < 1 || numberOfChannels > 32) {
      throw new Error("Unsupported audio channel count.");
    }
    const chunkSec = Math.max(10, Number(opts.chunkDurationSeconds) || this.CHUNK_DURATION_SECONDS);
    const overlapSec = Math.max(0, Math.min(10, opts.overlapSeconds == null ? this.CHUNK_OVERLAP_SECONDS : Number(opts.overlapSeconds)));
    const chunkCount = Math.max(1, Math.ceil(totalDuration / chunkSec));
    if (backend === "gemini") {
      const transcribeChunk = opts.transcribeChunk;
      if (typeof transcribeChunk !== "function") {
        throw new Error("Transcription handler is required.");
      }
      if (!_isGeminiAudioAllowed(transcribeChunk)) {
        throw new Error("AI transcription is unavailable right now.");
      }
      reportProgress(0, chunkCount, `Preparing ${chunkCount} chunks for Gemini Audio...`);
      let combined2 = "";
      const segments2 = [];
      for (let i = 0; i < chunkCount; i++) {
        if (this.cancelRequested) throw new Error("Cancelled");
        reportProgress(i + 1, chunkCount, `Transcribing chunk ${i + 1} of ${chunkCount} with Gemini...`);
        const startSec = Math.max(0, i * chunkSec - (i > 0 ? overlapSec : 0));
        const endSec = Math.min(totalDuration, (i + 1) * chunkSec);
        const startSample = Math.floor(startSec * sampleRate);
        const endSample = Math.min(Math.floor(endSec * sampleRate), audioBuffer.length);
        const chunkLength = endSample - startSample;
        if (chunkLength <= 0) continue;
        const chunkBuffer = audioCtx.createBuffer(numberOfChannels, chunkLength, sampleRate);
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel);
          const destData = chunkBuffer.getChannelData(channel);
          destData.set(sourceData.subarray(startSample, startSample + chunkLength));
        }
        const wavBlob = this.audioBufferToWav(chunkBuffer);
        const base64 = await this.blobToBase64(wavBlob);
        if (this.cancelRequested) throw new Error("Cancelled");
        const chunkTranscript = await transcribeChunk(base64, "audio/wav");
        if (this.cancelRequested) throw new Error("Cancelled");
        const text = typeof chunkTranscript === "string" ? chunkTranscript.trim() : String(chunkTranscript || "").trim();
        combined2 = _dedupeLargeFileOverlap(combined2, text);
        segments2.push({ index: i, startSec, endSec, text });
      }
      return { transcript: combined2, duration: totalDuration, backend: "gemini", segments: segments2 };
    }
    const voice = typeof window !== "undefined" ? window.AlloFlowVoice : null;
    const lang = opts.lang || (voice && typeof voice.loadPreference === "function" ? voice.loadPreference().lang : "en-US") || "en-US";
    const tier = opts.tier || (voice && typeof voice.loadPreference === "function" ? voice.loadPreference().whisperTier : "tiny") || "tiny";
    const localHandler = typeof opts.transcribeLocalChunk === "function" ? opts.transcribeLocalChunk : null;
    if (!localHandler) {
      if (!voice || typeof voice.transcribeAudio !== "function") {
        throw new Error("Local Whisper engine is not loaded yet.");
      }
      if (typeof voice.isIosCanvasVoiceSurface === "function" && voice.isIosCanvasVoiceSurface()) {
        throw new Error("Local Whisper is paused on iPhone/iPad inside Gemini Canvas. Choose Gemini Audio or use a desktop browser.");
      }
      if (typeof voice.preloadWhisper === "function") {
        const alreadyReady = typeof voice.isWhisperPrepared === "function" && voice.isWhisperPrepared(tier, { lang });
        if (!alreadyReady) {
          reportProgress(0, chunkCount, "Downloading Local Whisper model (~39\u201373 MB once)...");
        }
        await voice.preloadWhisper(tier, { lang });
      }
    }
    reportProgress(0, chunkCount, `Preparing ${chunkCount} chunks for Local Whisper...`);
    const retainAudioBlobs = opts.retainAudioBlobs === true;
    const maxRetainedAudioBytes = typeof opts.maxRetainedAudioBytes === "number" && Number.isFinite(opts.maxRetainedAudioBytes) && opts.maxRetainedAudioBytes >= 0 ? opts.maxRetainedAudioBytes : this.MAX_RETAINED_AUDIO_BYTES;
    let retainedAudioBytes = 0;
    let combined = "";
    const segments = [];
    for (let i = 0; i < chunkCount; i++) {
      if (this.cancelRequested) throw new Error("Cancelled");
      reportProgress(i + 1, chunkCount, `Transcribing chunk ${i + 1} of ${chunkCount} on this device...`);
      const startSec = Math.max(0, i * chunkSec - (i > 0 ? overlapSec : 0));
      const endSec = Math.min(totalDuration, (i + 1) * chunkSec);
      const pcm = this.extractChunkPcm16k(audioBuffer, startSec, endSec);
      if (!pcm.length) continue;
      const res = localHandler ? await localHandler(pcm, { index: i, startSec, endSec, lang, tier }) : await voice.transcribeAudio(null, { engine: "whisper", tier, lang, pcm });
      if (this.cancelRequested) throw new Error("Cancelled");
      const rawText = typeof res === "string" ? res : res && typeof res.transcript === "string" ? res.transcript : "";
      const text = rawText.trim();
      combined = _dedupeLargeFileOverlap(combined, text);
      const seg = { id: "upload-seg-" + (i + 1), index: i, startSec, endSec, text };
      if (retainAudioBlobs) {
        const estBytes = 44 + pcm.length * 2;
        if (retainedAudioBytes + estBytes <= maxRetainedAudioBytes) {
          const wavBlob = _pcm16kToWavBlob(pcm, this.TARGET_SAMPLE_RATE);
          const blobBytes = wavBlob && typeof wavBlob.size === "number" ? wavBlob.size : estBytes;
          if (wavBlob && retainedAudioBytes + blobBytes <= maxRetainedAudioBytes) {
            retainedAudioBytes += blobBytes;
            seg.blob = wavBlob;
            seg.mimeType = "audio/wav";
          }
        }
      }
      segments.push(seg);
    }
    return { transcript: combined, duration: totalDuration, backend: "whisper", segments };
  },
  async _chunkAndTranscribeAudioBuffer(audioCtx, audioBuffer, transcribeChunk, onProgress = () => {
  }, options = {}) {
    const backend = options && options.backend ? options.backend : "gemini";
    return await this.transcribeAudioBuffer(audioCtx, audioBuffer, {
      ...options || {},
      backend,
      transcribeChunk,
      onProgress
    });
  },
  async processMediaFile(file, options = {}) {
    if (this.isProcessing) {
      throw new Error("Another large file is already being processed.");
    }
    this.isProcessing = true;
    this.cancelRequested = false;
    try {
      const isVideo = this.getFileType(file) === "video";
      const readMsg = isVideo ? "Extracting audio from video..." : "Reading file...";
      const { audioCtx, audioBuffer } = await this._decodeMediaFile(file, readMsg, options.onProgress);
      const selectedBackend = options.backend || this.preferredBackend || this.getDefaultBackend();
      return await this.transcribeAudioBuffer(audioCtx, audioBuffer, {
        backend: selectedBackend,
        retainAudioBlobs: options.retainAudioBlobs != null ? !!options.retainAudioBlobs : selectedBackend === "whisper",
        maxRetainedAudioBytes: options.maxRetainedAudioBytes,
        chunkDurationSeconds: options.chunkDurationSeconds,
        overlapSeconds: options.overlapSeconds,
        transcribeChunk: options.transcribeChunk,
        transcribeLocalChunk: options.transcribeLocalChunk,
        onProgress: options.onProgress,
        lang: options.lang,
        tier: options.tier
      });
    } finally {
      this.isProcessing = false;
    }
  },
  async processAudioFile(file, transcribeChunk, onProgress = () => {
  }) {
    if (this.isProcessing) {
      throw new Error("Another large file is already being processed.");
    }
    this.isProcessing = true;
    this.cancelRequested = false;
    try {
      const { audioCtx, audioBuffer } = await this._decodeMediaFile(file, "Reading file...", onProgress);
      return await this._chunkAndTranscribeAudioBuffer(audioCtx, audioBuffer, transcribeChunk, onProgress);
    } finally {
      this.isProcessing = false;
    }
  },
  audioBufferToWav(buffer) {
    if (!buffer || typeof buffer.getChannelData !== "function") {
      throw new Error("Invalid audio buffer.");
    }
    const originalSampleRate = Number(buffer.sampleRate);
    if (!Number.isFinite(originalSampleRate) || originalSampleRate < 1e3 || originalSampleRate > 384e3) {
      throw new Error("Unsupported audio sample rate.");
    }
    const targetSampleRate = this.TARGET_SAMPLE_RATE;
    const format = 1;
    const bitDepth = 16;
    const numChannels = 1;
    const originalLength = Math.max(0, Math.floor(Number(buffer.length) || 0));
    const maxOriginalSamples = Math.ceil(originalSampleRate * this.MAX_AUDIO_DURATION_SECONDS);
    if (originalLength > maxOriginalSamples) {
      throw new Error("Audio buffer exceeds the 4-hour processing limit.");
    }
    const monoData = new Float32Array(originalLength);
    const channelCount = Math.min(32, Math.max(1, Math.floor(Number(buffer.numberOfChannels) || 1)));
    const channels = Array.from({ length: channelCount }, (_, ch) => buffer.getChannelData(ch));
    if (channelCount === 1) {
      monoData.set(channels[0].subarray(0, originalLength));
    } else {
      const invChannels = 1 / channelCount;
      for (let i = 0; i < originalLength; i++) {
        let sum = 0;
        for (let ch = 0; ch < channelCount; ch++) {
          sum += channels[ch][i] || 0;
        }
        monoData[i] = sum * invChannels;
      }
    }
    const resampleRatio = targetSampleRate / originalSampleRate;
    const maxResampledSamples = targetSampleRate * this.MAX_AUDIO_DURATION_SECONDS;
    const newLength = originalLength > 0 ? Math.min(maxResampledSamples, Math.floor(originalLength * resampleRatio)) : 0;
    const resampledData = new Float32Array(newLength);
    if (originalLength > 0) {
      for (let i = 0; i < newLength; i++) {
        const srcIndex = i / resampleRatio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, originalLength - 1);
        const fraction = srcIndex - srcIndexFloor;
        resampledData[i] = monoData[srcIndexFloor] * (1 - fraction) + monoData[srcIndexCeil] * fraction;
      }
    }
    const dataLength = resampledData.length * (bitDepth / 8);
    const wavBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(wavBuffer);
    const writeString = (offset2, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset2 + i, str.charCodeAt(i));
      }
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);
    let offset = 44;
    for (let i = 0; i < resampledData.length; i++) {
      const sample = Math.max(-1, Math.min(1, resampledData[i]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }
    return new Blob([wavBuffer], { type: "audio/wav" });
  },
  blobToBase64(blob) {
    if (!blob) return Promise.reject(new Error("No blob provided for base64 conversion"));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const commaIdx = typeof dataUrl === "string" ? dataUrl.indexOf(",") : -1;
        if (commaIdx < 0) {
          reject(new Error("Failed to convert to base64"));
          return;
        }
        resolve(dataUrl.slice(commaIdx + 1));
      };
      reader.onerror = () => reject(new Error("Failed to convert to base64"));
      reader.onabort = () => reject(new Error("Base64 conversion was aborted"));
      reader.readAsDataURL(blob);
    });
  },
  cancel() {
    this.cancelRequested = true;
  },
  async extractAudioFromVideo(videoFile, onProgress = () => {
  }) {
    const { audioBuffer } = await this._decodeMediaFile(videoFile, "Extracting audio from video...", onProgress);
    const wavBlob = this.audioBufferToWav(audioBuffer);
    const rawBase = String(videoFile && videoFile.name || "video").replace(/[\u0000-\u001F\u007F]/g, "").replace(/[/\\]/g, "_").replace(/\.[^.]+$/, "").replace(/^\.+/, "").trim().slice(0, 120);
    const audioFileName = (rawBase || "video") + ".wav";
    return new File([wavBlob], audioFileName, { type: "audio/wav" });
  },
  async processVideoFile(file, transcribeChunk, onProgress = () => {
  }) {
    if (this.isProcessing) {
      throw new Error("Another large file is already being processed.");
    }
    this.isProcessing = true;
    this.cancelRequested = false;
    try {
      const { audioCtx, audioBuffer } = await this._decodeMediaFile(file, "Extracting audio from video...", onProgress);
      return await this._chunkAndTranscribeAudioBuffer(audioCtx, audioBuffer, transcribeChunk, onProgress);
    } finally {
      this.isProcessing = false;
    }
  }
};
const LargeFileTranscriptionModal = React.memo(({
  isOpen,
  file,
  onClose = () => {
  },
  onConfirm = () => {
  },
  onBackendChange,
  geminiAvailable,
  progress,
  totalChunks,
  status,
  isProcessing,
  t
}) => {
  const dialogRef = React.useRef(null);
  const processingRef = React.useRef(isProcessing);
  const closeRef = React.useRef(onClose);
  processingRef.current = isProcessing;
  closeRef.current = onClose;
  const voice = typeof window !== "undefined" ? window.AlloFlowVoice : null;
  const iosCanvas = !!(voice && typeof voice.isIosCanvasVoiceSurface === "function" && voice.isIosCanvasVoiceSurface());
  const caps = voice && typeof voice.getCapabilities === "function" ? voice.getCapabilities() : {};
  const desktopWhisper = !!caps.desktopWhisper;
  const whisperTier = (voice && typeof voice.loadPreference === "function" ? voice.loadPreference().whisperTier : "tiny") || "tiny";
  const whisperLang = (voice && typeof voice.loadPreference === "function" ? voice.loadPreference().lang : "en-US") || "en-US";
  const whisperCached = !!(desktopWhisper || voice && typeof voice.preparedWhisperTier === "function" && voice.preparedWhisperTier(whisperTier, whisperLang));
  const canGemini = typeof geminiAvailable === "boolean" ? geminiAvailable : _isGeminiAudioAllowed(null);
  const [backend, setBackend] = React.useState(() => {
    const def = iosCanvas && canGemini ? "gemini" : "whisper";
    LargeFileHandler.preferredBackend = def;
    return def;
  });
  React.useEffect(() => {
    if (!isOpen) return;
    const next = iosCanvas && canGemini ? "gemini" : "whisper";
    setBackend(next);
    LargeFileHandler.preferredBackend = next;
    if (typeof onBackendChange === "function") onBackendChange(next);
  }, [isOpen, iosCanvas, canGemini]);
  const selectBackend = (next) => {
    if (isProcessing) return;
    setBackend(next);
    LargeFileHandler.preferredBackend = next;
    if (typeof onBackendChange === "function") onBackendChange(next);
  };
  const isVisible = Boolean(isOpen && file);
  React.useEffect(() => {
    if (!isVisible || typeof document === "undefined" || typeof window === "undefined") return void 0;
    if (document.head && typeof document.getElementById === "function" && typeof document.createElement === "function" && !document.getElementById("large-file-module-a11y")) {
      const st = document.createElement("style");
      st.id = "large-file-module-a11y";
      st.textContent = "[data-large-file-modal] button,[data-large-file-modal] [role='button'],[data-large-file-modal] a,[data-large-file-modal] input,[data-large-file-modal] select,[data-large-file-modal] textarea{touch-action:manipulation;}[data-large-file-modal] button:focus-visible,[data-large-file-modal] [role='button']:focus-visible,[data-large-file-modal] a:focus-visible,[data-large-file-modal] input:focus-visible,[data-large-file-modal] select:focus-visible,[data-large-file-modal] textarea:focus-visible{outline:2px solid #4f46e5;outline-offset:2px;}@media (forced-colors: active){[data-large-file-modal] button:focus-visible,[data-large-file-modal] [role='button']:focus-visible,[data-large-file-modal] a:focus-visible,[data-large-file-modal] input:focus-visible,[data-large-file-modal] select:focus-visible,[data-large-file-modal] textarea:focus-visible{outline:2px solid Highlight;outline-offset:2px;}}@media (prefers-reduced-motion: reduce){[data-large-file-modal] *,[data-large-file-modal] *::before,[data-large-file-modal] *::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;scroll-behavior:auto !important;}}";
      document.head.appendChild(st);
    }
    const dialog = dialogRef.current;
    if (!dialog) return void 0;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => {
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const closedDetails = element.closest("details:not([open])");
      if (closedDetails && !(element.tagName === "SUMMARY" && element.parentElement === closedDetails)) return false;
      if (typeof window.getComputedStyle === "function") {
        for (let node = element; node && node !== dialog.parentElement; node = node.parentElement) {
          const style = window.getComputedStyle(node);
          if (style && (style.display === "none" || style.visibility === "hidden")) return false;
        }
      }
      const hasLayout = typeof dialog.getBoundingClientRect === "function" && (dialog.getBoundingClientRect().width > 0 || dialog.getBoundingClientRect().height > 0);
      if (hasLayout && typeof element.getClientRects === "function" && element.getClientRects().length === 0) return false;
      return true;
    });
    (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (event.isComposing || event.nativeEvent && event.nativeEvent.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!isTopTrap()) return;
      if (event.key === "Escape") {
        if (!processingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof closeRef.current === "function") closeRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus !== document.documentElement && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [isVisible]);
  if (!isVisible) return null;
  const safeFileSize = typeof file.size === "number" && Number.isFinite(file.size) && file.size >= 0 ? file.size : 0;
  const fileSizeMB = (safeFileSize / (1024 * 1024)).toFixed(1);
  const estimatedChunks = Math.max(1, Math.ceil(safeFileSize / (15 * 1024 * 1024)));
  const chunkTotal = Math.max(0, Number(totalChunks) || 0);
  const chunkProgress = Math.max(0, Math.min(chunkTotal, Number(progress) || 0));
  const progressPercent = chunkTotal > 0 ? Math.round(chunkProgress / chunkTotal * 100) : 0;
  const progressValueText = chunkTotal > 0 ? `${chunkProgress} of ${chunkTotal} chunks, ${progressPercent}%` : status || "Preparing transcription";
  const isVideo = LargeFileHandler.getFileType(file) === "video";
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none",
      role: "presentation",
      onClick: () => {
        if (!isProcessing) onClose();
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: dialogRef,
        tabIndex: -1,
        className: "allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto relative border-4 border-indigo-100 transition-all animate-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none",
        "data-large-file-modal": "true",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "large-file-modal-title",
        "aria-describedby": "large-file-description",
        "aria-busy": isProcessing,
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": t?.("common.close") || "Close",
          onClick: onClose,
          "data-help-key": "dashboard_close_btn",
          disabled: isProcessing,
          className: "absolute top-4 right-4 min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-full text-slate-600 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
        },
        /* @__PURE__ */ React.createElement("span", { className: "text-xl", "aria-hidden": "true" }, "\xD7")
      ),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4 pr-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-100 p-3 rounded-full" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl", "aria-hidden": "true" }, isVideo ? "\u{1F3AC}" : "\u{1F3B5}")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "large-file-modal-title", className: "text-lg font-black text-slate-800" }, isVideo ? t?.("large_file.title_video") || "Large Video File Detected" : t?.("large_file.title") || "Large Audio File Detected"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 font-medium break-words" }, file.name || "Untitled media file"))),
      /* @__PURE__ */ React.createElement("div", { id: "large-file-description", className: "bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-800 leading-relaxed" }, isVideo ? t?.("large_file.description_video") || `This video is ${fileSizeMB} MB. The audio will be extracted and split into ~${estimatedChunks} smaller 4-minute chunks for transcription, then combined.` : t?.("large_file.description") || `This file is ${fileSizeMB} MB and exceeds the 20MB limit for direct transcription. It will be split into ~${estimatedChunks} smaller 4-minute chunks and transcribed separately, then combined.`)),
      /* @__PURE__ */ React.createElement("fieldset", { className: "mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2", disabled: isProcessing }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-xs font-bold uppercase tracking-wider text-slate-700" }, t?.("large_file.engine_legend") || "Transcription Engine"), /* @__PURE__ */ React.createElement("label", { className: `flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer ${backend === "whisper" ? "border-emerald-600 bg-emerald-50/70" : "border-slate-200 bg-white"} ${iosCanvas ? "opacity-60 cursor-not-allowed" : ""}` }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "radio",
          name: "large-file-backend",
          value: "whisper",
          checked: backend === "whisper",
          disabled: isProcessing || iosCanvas,
          onChange: () => selectBackend("whisper"),
          className: "mt-0.5 h-4 w-4 accent-emerald-700"
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "text-xs leading-snug text-slate-800" }, /* @__PURE__ */ React.createElement("strong", { className: "block text-slate-900" }, "Local Whisper (Default \xB7 Private & Offline)"), "Runs on your device; audio never leaves your device and uses no API key.")), /* @__PURE__ */ React.createElement("label", { className: `flex items-start gap-2.5 rounded-lg border p-2.5 ${canGemini ? "cursor-pointer" : "opacity-60 cursor-not-allowed"} ${backend === "gemini" ? "border-indigo-600 bg-indigo-50/70" : "border-slate-200 bg-white"}` }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "radio",
          name: "large-file-backend",
          value: "gemini",
          checked: backend === "gemini",
          disabled: isProcessing || !canGemini,
          onChange: () => selectBackend("gemini"),
          className: "mt-0.5 h-4 w-4 accent-indigo-700"
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "text-xs leading-snug text-slate-800" }, /* @__PURE__ */ React.createElement("strong", { className: "block text-slate-900" }, "Gemini Audio (Cloud \xB7 Optional)"), canGemini ? "No model download; stronger on technical jargon, accents, and noisy multi-speaker audio. Sends 4-minute audio chunks to Gemini." : "Unavailable right now (requires a configured Gemini API key with AI audio enabled)."))),
      backend === "whisper" && !whisperCached && !iosCanvas && /* @__PURE__ */ React.createElement("div", { "data-testid": "large-file-whisper-warning", className: "mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950" }, /* @__PURE__ */ React.createElement("strong", null, "First-time download notice:"), " Local Whisper is not cached on this device yet. Starting will download the on-device speech model once (~39\u201373 MB, ~1\u20132 min), then keep it offline for future recordings. Your audio stays on this device."),
      iosCanvas && /* @__PURE__ */ React.createElement("div", { className: "mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950" }, /* @__PURE__ */ React.createElement("strong", null, "iPhone/iPad Canvas notice:"), " Local Whisper is paused inside Gemini Canvas to prevent page reloads. Use Gemini Audio here or open AlloFlow in a desktop browser."),
      /* @__PURE__ */ React.createElement("details", { "data-testid": "large-file-engine-guide", className: "mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded" }, "Strengths of Local Whisper vs. Gemini \u2014 and why use both"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-2 leading-relaxed" }, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Local Whisper:"), " Private (audio never leaves your device), works offline after a one-time download, costs zero API quota, and handles long verbatim recordings reliably."), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Gemini Audio:"), " No model download; stronger on domain vocabulary, proper nouns, accented speech, noisy classrooms, and punctuation."), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("strong", null, "Why use both (Cross-Triangulation):"), " Transcribe privately with Local Whisper first, then optionally verify against audio with Gemini in Dictation Studio to flag only substantive word discrepancies (homophones, names, or technical terms) with 5-second local audio replay."))),
      isProcessing && /* @__PURE__ */ React.createElement("div", { className: "mb-4", role: "status", "aria-live": "polite", "aria-atomic": "true" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider" }, status || "Processing..."), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, chunkProgress, "/", chunkTotal, " (", progressPercent, "%)")), /* @__PURE__ */ React.createElement("div", { className: "h-3 bg-slate-100 rounded-full overflow-hidden", role: "progressbar", "aria-label": status || "Transcription progress", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": chunkTotal > 0 ? progressPercent : void 0, "aria-valuetext": progressValueText }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out motion-reduce:transition-none",
          style: { width: `${progressPercent}%` }
        }
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row gap-3 justify-end" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onClose,
          disabled: isProcessing,
          className: "min-h-11 px-4 py-2 rounded-lg text-slate-700 font-bold hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
        },
        t?.("common.cancel") || "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            if (!isProcessing) onConfirm();
          },
          "aria-disabled": isProcessing,
          "aria-busy": isProcessing,
          className: `min-h-11 px-6 py-2 bg-indigo-700 text-white font-bold rounded-xl hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-700 transition-colors motion-reduce:transition-none shadow-md flex items-center justify-center gap-2 ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`
        },
        isProcessing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "animate-spin motion-reduce:animate-none", "aria-hidden": "true" }, "\u23F3"), t?.("modals.large_file.processing") || "Transcribing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2728"), t?.("modals.large_file.confirm") || "Start Chunked Transcription")
      ))
    )
  );
});
if (typeof window !== "undefined") {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LargeFileHandler = LargeFileHandler;
  window.AlloModules.LargeFileTranscriptionModal = LargeFileTranscriptionModal;
}
console.log("[LargeFileModule] LargeFileHandler + LargeFileTranscriptionModal registered.");
window.AlloModules = window.AlloModules || {};
window.AlloModules.LargeFileHandler = (typeof LargeFileHandler !== 'undefined') ? LargeFileHandler : null;
window.AlloModules.LargeFileTranscriptionModal = (typeof LargeFileTranscriptionModal !== 'undefined') ? LargeFileTranscriptionModal : null;
window.AlloModules.LargeFileModule = true;
console.log('[LargeFileModule] LargeFileHandler + LargeFileTranscriptionModal registered');
})();
