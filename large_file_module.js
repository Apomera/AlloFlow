(function() {
'use strict';
  // WCAG 2.1 AA: respect prefers-reduced-motion + keep slate-600 AA contrast
  if (!document.getElementById("large-file-module-a11y")) { var _s = document.createElement("style"); _s.id = "large-file-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.LargeFileModule) { console.log('[CDN] LargeFileModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var React = window.React || React;
var getGlobalAudioContext = typeof window !== "undefined" && window.getGlobalAudioContext ? window.getGlobalAudioContext : (function() {
  var Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  return Ctx ? new Ctx() : null;
});
const LargeFileHandler = {
  CHUNK_DURATION_SECONDS: 600,
  TARGET_SAMPLE_RATE: 16e3,
  MAX_CHUNK_SIZE_BYTES: 15 * 1024 * 1024,
  isProcessing: false,
  cancelRequested: false,
  needsChunking(file) {
    return file.size > this.MAX_CHUNK_SIZE_BYTES;
  },
  getFileType(file) {
    const type = file.type.toLowerCase();
    if (type.startsWith("audio/")) return "audio";
    if (type.startsWith("video/")) return "video";
    if (type === "application/pdf") return "pdf";
    const ext = file.name.split(".").pop().toLowerCase();
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return "audio";
    if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
    if (ext === "pdf") return "pdf";
    return "unknown";
  },
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  },
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  },
  async processAudioFile(file, transcribeChunk, onProgress = () => {
  }) {
    this.isProcessing = true;
    this.cancelRequested = false;
    try {
      onProgress(0, 1, "Reading file...");
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const audioCtx = getGlobalAudioContext();
      if (!audioCtx) {
        throw new Error("Web Audio API not supported");
      }
      onProgress(0, 1, "Decoding audio...");
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const totalDuration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      const chunkCount = Math.ceil(totalDuration / this.CHUNK_DURATION_SECONDS);
      onProgress(0, chunkCount, `Preparing ${chunkCount} chunks...`);
      const transcripts = [];
      for (let i = 0; i < chunkCount; i++) {
        if (this.cancelRequested) {
          throw new Error("Cancelled");
        }
        onProgress(i + 1, chunkCount, `Transcribing chunk ${i + 1} of ${chunkCount}...`);
        const startSample = Math.floor(i * this.CHUNK_DURATION_SECONDS * sampleRate);
        const endSample = Math.min(
          Math.floor((i + 1) * this.CHUNK_DURATION_SECONDS * sampleRate),
          audioBuffer.length
        );
        const chunkLength = endSample - startSample;
        const chunkBuffer = audioCtx.createBuffer(
          numberOfChannels,
          chunkLength,
          sampleRate
        );
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel);
          const destData = chunkBuffer.getChannelData(channel);
          for (let j = 0; j < chunkLength; j++) {
            destData[j] = sourceData[startSample + j];
          }
        }
        const wavBlob = this.audioBufferToWav(chunkBuffer);
        const base64 = await this.blobToBase64(wavBlob);
        const chunkTranscript = await transcribeChunk(base64, "audio/wav");
        transcripts.push(chunkTranscript);
      }
      const fullTranscript = transcripts.join(" ");
      return {
        transcript: fullTranscript,
        duration: totalDuration
      };
    } finally {
      this.isProcessing = false;
    }
  },
  audioBufferToWav(buffer) {
    const originalSampleRate = buffer.sampleRate;
    const targetSampleRate = this.TARGET_SAMPLE_RATE;
    const format = 1;
    const bitDepth = 16;
    const numChannels = 1;
    const originalLength = buffer.length;
    const monoData = new Float32Array(originalLength);
    const channelCount = buffer.numberOfChannels;
    for (let i = 0; i < originalLength; i++) {
      let sum = 0;
      for (let ch = 0; ch < channelCount; ch++) {
        sum += buffer.getChannelData(ch)[i];
      }
      monoData[i] = sum / channelCount;
    }
    const resampleRatio = targetSampleRate / originalSampleRate;
    const newLength = Math.floor(originalLength * resampleRatio);
    const resampledData = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / resampleRatio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, originalLength - 1);
      const fraction = srcIndex - srcIndexFloor;
      resampledData[i] = monoData[srcIndexFloor] * (1 - fraction) + monoData[srcIndexCeil] * fraction;
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to convert to base64"));
      reader.readAsDataURL(blob);
    });
  },
  cancel() {
    this.cancelRequested = true;
  },
  async extractAudioFromVideo(videoFile, onProgress = () => {
  }) {
    onProgress(0, 1, "Extracting audio from video...");
    const arrayBuffer = await this.readFileAsArrayBuffer(videoFile);
    const audioCtx = getGlobalAudioContext();
    if (!audioCtx) {
      throw new Error("Web Audio API not supported");
    }
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const wavBlob = this.audioBufferToWav(audioBuffer);
    const audioFileName = videoFile.name.replace(/\.[^.]+$/, ".wav");
    return new File([wavBlob], audioFileName, { type: "audio/wav" });
  },
  async processVideoFile(file, transcribeChunk, onProgress = () => {
  }) {
    onProgress(0, 1, "Extracting audio from video...");
    const audioFile = await this.extractAudioFromVideo(file, onProgress);
    return this.processAudioFile(audioFile, transcribeChunk, onProgress);
  }
};
const LargeFileTranscriptionModal = React.memo(({
  isOpen,
  file,
  onClose,
  onConfirm,
  progress,
  totalChunks,
  status,
  isProcessing,
  t
}) => {
  if (!isOpen || !file) return null;
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const estimatedChunks = Math.ceil(file.size / (15 * 1024 * 1024));
  const progressPercent = totalChunks > 0 ? Math.round(progress / totalChunks * 100) : 0;
  const isVideo = LargeFileHandler.getFileType(file) === "video";
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200",
      onClick: onClose
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative border-4 border-indigo-100 transition-all animate-in zoom-in-95 duration-200",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "large-file-modal-title",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.close"),
          onClick: onClose,
          "data-help-key": "dashboard_close_btn",
          disabled: isProcessing,
          className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        },
        /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, "\xD7")
      ),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-100 p-3 rounded-full" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, isVideo ? "\u{1F3AC}" : "\u{1F3B5}")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { id: "large-file-modal-title", className: "text-lg font-black text-slate-800" }, isVideo ? t?.("large_file.title_video") || "Large Video File Detected" : t?.("large_file.title") || "Large Audio File Detected"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 font-medium" }, file.name))),
      /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-800 leading-relaxed" }, isVideo ? t?.("large_file.description_video") || `This video is ${fileSizeMB} MB. The audio will be extracted and split into ~${estimatedChunks} smaller chunks for transcription, then combined.` : t?.("large_file.description") || `This file is ${fileSizeMB} MB and exceeds the 20MB limit for direct transcription. It will be split into ~${estimatedChunks} smaller chunks and transcribed separately, then combined.`)),
      isProcessing && /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-600 uppercase tracking-wider" }, status || "Processing..."), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-indigo-600" }, progress, "/", totalChunks, " (", progressPercent, "%)")), /* @__PURE__ */ React.createElement("div", { className: "h-3 bg-slate-100 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out",
          style: { width: `${progressPercent}%` }
        }
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 justify-end" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.close"),
          onClick: onClose,
          disabled: isProcessing,
          className: "px-4 py-2 text-slate-600 font-bold hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        },
        t?.("common.cancel") || "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: onConfirm,
          disabled: isProcessing,
          className: "px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
        },
        isProcessing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "animate-spin" }, "\u23F3"), t?.("modals.large_file.processing") || "Transcribing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2728"), t?.("modals.large_file.confirm") || "Start Chunked Transcription")
      ))
    )
  );
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.LargeFileHandler = LargeFileHandler;
window.AlloModules.LargeFileTranscriptionModal = LargeFileTranscriptionModal;
console.log("[LargeFileModule] LargeFileHandler + LargeFileTranscriptionModal registered.");
window.AlloModules = window.AlloModules || {};
window.AlloModules.LargeFileHandler = (typeof LargeFileHandler !== 'undefined') ? LargeFileHandler : null;
window.AlloModules.LargeFileTranscriptionModal = (typeof LargeFileTranscriptionModal !== 'undefined') ? LargeFileTranscriptionModal : null;
window.AlloModules.LargeFileModule = true;
console.log('[LargeFileModule] LargeFileHandler + LargeFileTranscriptionModal registered');
})();
