// large_file_source.jsx — Chunked audio/video transcription CDN module
// Extracted from AlloFlowANTI.txt 2026-04-21 (Option A continuation).
// Contents:
//   1. LargeFileHandler — object with audio chunking + WAV encoding methods
//   2. LargeFileTranscriptionModal — React.memo component for progress UI
//
// Dependencies on monolith globals:
//   - getGlobalAudioContext() — expected on window (monolith exposes it)
//   - React — provided by the host page
//
// Published on window.AlloModules:
//   - window.AlloModules.LargeFileHandler (the object itself)
//   - window.AlloModules.LargeFileTranscriptionModal (the component)
//   - window.AlloModules.LargeFileModule = true (duplicate-load guard)

// Resolve getGlobalAudioContext from monolith at module-parse time. Falls
// through to window lookup if not yet assigned. The host page's monolith
// (AlloFlowANTI.txt) defines this function at module scope.
var _cachedFallbackAudioCtx = null;
var getGlobalAudioContext = (typeof window !== 'undefined' && window.getGlobalAudioContext)
    ? window.getGlobalAudioContext
    : (function() {
        if (typeof window !== 'undefined' && typeof window.getGlobalAudioContext === 'function') {
            return window.getGlobalAudioContext();
        }
        if (_cachedFallbackAudioCtx && _cachedFallbackAudioCtx.state !== 'closed') {
            return _cachedFallbackAudioCtx;
        }
        var Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        _cachedFallbackAudioCtx = Ctx ? new Ctx() : null;
        return _cachedFallbackAudioCtx;
    });

const LargeFileHandler = {
    CHUNK_DURATION_SECONDS: 600,
    TARGET_SAMPLE_RATE: 16000,
    MAX_CHUNK_SIZE_BYTES: 15 * 1024 * 1024,
    MAX_FILE_SIZE_BYTES: 500 * 1024 * 1024,
    MAX_AUDIO_DURATION_SECONDS: 4 * 3600,
    isProcessing: false,
    cancelRequested: false,
    needsChunking(file) {
        return !!(file && typeof file.size === 'number' && Number.isFinite(file.size) && file.size > this.MAX_CHUNK_SIZE_BYTES);
    },
    getFileType(file) {
        if (!file || typeof file !== 'object') return 'unknown';
        const type = typeof file.type === 'string' ? file.type.toLowerCase() : '';
        if (type.startsWith('audio/')) return 'audio';
        if (type.startsWith('video/')) return 'video';
        if (type === 'application/pdf') return 'pdf';
        const name = typeof file.name === 'string' ? file.name : '';
        const dotIdx = name.lastIndexOf('.');
        const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : '';
        if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
        if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
        if (ext === 'pdf') return 'pdf';
        return 'unknown';
    },
    readFileAsArrayBuffer(file) {
        if (!file) return Promise.reject(new Error('No media file selected.'));
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.onabort = () => reject(new Error('File read was aborted'));
            reader.readAsArrayBuffer(file);
        });
    },
    formatDuration(seconds) {
        if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    },
    async _decodeMediaFile(file, readMessage, onProgress = () => {}) {
        const reportProgress = (cur, tot, msg) => {
            if (typeof onProgress === 'function') {
                try { onProgress(cur, tot, msg); } catch (_) {}
            }
        };
        if (!file) {
            throw new Error('No media file selected.');
        }
        if (typeof file.size === 'number' && (!Number.isFinite(file.size) || file.size < 0 || file.size > this.MAX_FILE_SIZE_BYTES)) {
            throw new Error('File exceeds the 500 MB large-file safety limit.');
        }
        reportProgress(0, 1, readMessage);
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        if (!arrayBuffer || typeof arrayBuffer.byteLength !== 'number' || arrayBuffer.byteLength > this.MAX_FILE_SIZE_BYTES) {
            throw new Error('File exceeds the 500 MB large-file safety limit.');
        }
        const audioCtx = getGlobalAudioContext();
        if (!audioCtx) {
            throw new Error('Web Audio API not supported');
        }
        reportProgress(0, 1, 'Decoding audio...');
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const totalDuration = audioBuffer.duration;
        if (!Number.isFinite(totalDuration) || totalDuration < 0 || totalDuration > this.MAX_AUDIO_DURATION_SECONDS) {
            throw new Error('Audio duration exceeds the 4-hour processing limit.');
        }
        return { audioCtx, audioBuffer };
    },
    async _chunkAndTranscribeAudioBuffer(audioCtx, audioBuffer, transcribeChunk, onProgress = () => {}) {
        if (typeof transcribeChunk !== 'function') {
            throw new Error('Transcription handler is required.');
        }
        const reportProgress = (cur, tot, msg) => {
            if (typeof onProgress === 'function') {
                try { onProgress(cur, tot, msg); } catch (_) {}
            }
        };
        const totalDuration = audioBuffer.duration;
        const sampleRate = audioBuffer.sampleRate;
        const numberOfChannels = audioBuffer.numberOfChannels;
        if (!Number.isFinite(sampleRate) || sampleRate < 1000 || sampleRate > 384000) {
            throw new Error('Unsupported audio sample rate.');
        }
        if (!Number.isFinite(numberOfChannels) || numberOfChannels < 1 || numberOfChannels > 32) {
            throw new Error('Unsupported audio channel count.');
        }
        const chunkCount = Math.ceil(totalDuration / this.CHUNK_DURATION_SECONDS);
        reportProgress(0, chunkCount, `Preparing ${chunkCount} chunks...`);
        const transcripts = [];
        for (let i = 0; i < chunkCount; i++) {
            if (this.cancelRequested) {
                throw new Error('Cancelled');
            }
            reportProgress(i + 1, chunkCount, `Transcribing chunk ${i + 1} of ${chunkCount}...`);
            const startSample = Math.floor(i * this.CHUNK_DURATION_SECONDS * sampleRate);
            const endSample = Math.min(
                Math.floor((i + 1) * this.CHUNK_DURATION_SECONDS * sampleRate),
                audioBuffer.length
            );
            const chunkLength = endSample - startSample;
            if (chunkLength <= 0) continue;
            const chunkBuffer = audioCtx.createBuffer(
                numberOfChannels,
                chunkLength,
                sampleRate
            );
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sourceData = audioBuffer.getChannelData(channel);
                const destData = chunkBuffer.getChannelData(channel);
                destData.set(sourceData.subarray(startSample, startSample + chunkLength));
            }
            const wavBlob = this.audioBufferToWav(chunkBuffer);
            const base64 = await this.blobToBase64(wavBlob);
            const chunkTranscript = await transcribeChunk(base64, 'audio/wav');
            transcripts.push(chunkTranscript);
        }
        const fullTranscript = transcripts.join(' ');
        return {
            transcript: fullTranscript,
            duration: totalDuration
        };
    },
    async processAudioFile(file, transcribeChunk, onProgress = () => {}) {
        if (this.isProcessing) {
            throw new Error('Another large file is already being processed.');
        }
        this.isProcessing = true;
        this.cancelRequested = false;
        try {
            const { audioCtx, audioBuffer } = await this._decodeMediaFile(file, 'Reading file...', onProgress);
            return await this._chunkAndTranscribeAudioBuffer(audioCtx, audioBuffer, transcribeChunk, onProgress);
        } finally {
            this.isProcessing = false;
        }
    },
    audioBufferToWav(buffer) {
        if (!buffer || typeof buffer.getChannelData !== 'function') {
            throw new Error('Invalid audio buffer.');
        }
        const originalSampleRate = Number(buffer.sampleRate);
        if (!Number.isFinite(originalSampleRate) || originalSampleRate < 1000 || originalSampleRate > 384000) {
            throw new Error('Unsupported audio sample rate.');
        }
        const targetSampleRate = this.TARGET_SAMPLE_RATE;
        const format = 1;
        const bitDepth = 16;
        const numChannels = 1;
        const originalLength = Math.max(0, Math.floor(Number(buffer.length) || 0));
        const maxOriginalSamples = Math.ceil(originalSampleRate * this.MAX_AUDIO_DURATION_SECONDS);
        if (originalLength > maxOriginalSamples) {
            throw new Error('Audio buffer exceeds the 4-hour processing limit.');
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
        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, targetSampleRate, true);
        view.setUint32(28, targetSampleRate * numChannels * (bitDepth / 8), true);
        view.setUint16(32, numChannels * (bitDepth / 8), true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);
        let offset = 44;
        for (let i = 0; i < resampledData.length; i++) {
            const sample = Math.max(-1, Math.min(1, resampledData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
        return new Blob([wavBuffer], { type: 'audio/wav' });
    },
    blobToBase64(blob) {
        if (!blob) return Promise.reject(new Error('No blob provided for base64 conversion'));
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const commaIdx = typeof dataUrl === 'string' ? dataUrl.indexOf(',') : -1;
                if (commaIdx < 0) {
                    reject(new Error('Failed to convert to base64'));
                    return;
                }
                resolve(dataUrl.slice(commaIdx + 1));
            };
            reader.onerror = () => reject(new Error('Failed to convert to base64'));
            reader.onabort = () => reject(new Error('Base64 conversion was aborted'));
            reader.readAsDataURL(blob);
        });
    },
    cancel() {
        this.cancelRequested = true;
    },
    async extractAudioFromVideo(videoFile, onProgress = () => {}) {
        const { audioBuffer } = await this._decodeMediaFile(videoFile, 'Extracting audio from video...', onProgress);
        const wavBlob = this.audioBufferToWav(audioBuffer);
        const rawBase = String((videoFile && videoFile.name) || 'video')
            .replace(/[\u0000-\u001F\u007F]/g, '')
            .replace(/[/\\]/g, '_')
            .replace(/\.[^.]+$/, '')
            .replace(/^\.+/, '')
            .trim()
            .slice(0, 120);
        const audioFileName = (rawBase || 'video') + '.wav';
        return new File([wavBlob], audioFileName, { type: 'audio/wav' });
    },
    async processVideoFile(file, transcribeChunk, onProgress = () => {}) {
        if (this.isProcessing) {
            throw new Error('Another large file is already being processed.');
        }
        this.isProcessing = true;
        this.cancelRequested = false;
        try {
            const { audioCtx, audioBuffer } = await this._decodeMediaFile(file, 'Extracting audio from video...', onProgress);
            return await this._chunkAndTranscribeAudioBuffer(audioCtx, audioBuffer, transcribeChunk, onProgress);
        } finally {
            this.isProcessing = false;
        }
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
    const dialogRef = React.useRef(null);
    const processingRef = React.useRef(isProcessing);
    const closeRef = React.useRef(onClose);
    processingRef.current = isProcessing;
    closeRef.current = onClose;

    React.useEffect(() => {
        if (!isOpen) return undefined;
        const dialog = dialogRef.current;
        if (!dialog) return undefined;
        const previousFocus = document.activeElement;
        const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
        const trap = { root: dialog };
        trapStack.push(trap);
        const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
        const getFocusable = () => Array.from(dialog.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
        )).filter((element) => {
            if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
            const closedDetails = element.closest('details:not([open])');
            if (closedDetails && !(element.tagName === 'SUMMARY' && element.parentElement === closedDetails)) return false;
            const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
            const hasLayout = typeof dialog.getBoundingClientRect === 'function' && (dialog.getBoundingClientRect().width > 0 || dialog.getBoundingClientRect().height > 0);
            if (hasLayout && typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
            return true;
        });
        (getFocusable()[0] || dialog).focus();
        const onKeyDown = (event) => {
            if (event.isComposing || event.keyCode === 229) return;
            if (!isTopTrap()) return;
            if (event.key === 'Escape') {
                if (!processingRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (typeof closeRef.current === 'function') closeRef.current();
                }
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = getFocusable();
            if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!dialog.contains(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            const wasTopTrap = isTopTrap();
            const trapIndex = trapStack.indexOf(trap);
            if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
            if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus !== document.documentElement && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
        };
    }, [isOpen]);

    if (!isOpen || !file) return null;
    const safeFileSize = (typeof file.size === 'number' && Number.isFinite(file.size) && file.size >= 0) ? file.size : 0;
    const fileSizeMB = (safeFileSize / (1024 * 1024)).toFixed(1);
    const estimatedChunks = Math.ceil(safeFileSize / (15 * 1024 * 1024));
    const chunkTotal = Math.max(0, Number(totalChunks) || 0);
    const chunkProgress = Math.max(0, Math.min(chunkTotal, Number(progress) || 0));
    const progressPercent = chunkTotal > 0 ? Math.round((chunkProgress / chunkTotal) * 100) : 0;
    const progressValueText = chunkTotal > 0
        ? `${chunkProgress} of ${chunkTotal} chunks, ${progressPercent}%`
        : (status || 'Preparing transcription');
    const isVideo = LargeFileHandler.getFileType(file) === 'video';
    return (
        <div
            className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
            role="presentation"
            onClick={() => { if (!isProcessing) onClose(); }}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto relative border-4 border-indigo-100 transition-all animate-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none"
                role="dialog" aria-modal="true" aria-labelledby="large-file-modal-title" aria-describedby="large-file-description" aria-busy={isProcessing} onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    aria-label={t?.('common.close') || 'Close'}
                    onClick={onClose} data-help-key="dashboard_close_btn"
                    disabled={isProcessing}
                    className="absolute top-4 right-4 min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-full text-slate-600 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="text-xl" aria-hidden="true">{'\u00D7'}</span>
                </button>
                <div className="flex items-center gap-3 mb-4 pr-10">
                    <div className="bg-amber-100 p-3 rounded-full">
                        <span className="text-2xl" aria-hidden="true">{isVideo ? '\uD83C\uDFAC' : '\uD83C\uDFB5'}</span>
                    </div>
                    <div>
                        <h2 id="large-file-modal-title" className="text-lg font-black text-slate-800">
                            {isVideo
                                ? (t?.('large_file.title_video') || 'Large Video File Detected')
                                : (t?.('large_file.title') || 'Large Audio File Detected')}
                        </h2>
                        <p className="text-sm text-slate-600 font-medium break-words">{file.name}</p>
                    </div>
                </div>
                <div id="large-file-description" className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-amber-800 leading-relaxed">
                        {isVideo
                            ? (t?.('large_file.description_video') ||
                                `This video is ${fileSizeMB} MB. The audio will be extracted and split into ~${estimatedChunks} smaller chunks for transcription, then combined.`)
                            : (t?.('large_file.description') ||
                                `This file is ${fileSizeMB} MB and exceeds the 20MB limit for direct transcription. It will be split into ~${estimatedChunks} smaller chunks and transcribed separately, then combined.`)}
                    </p>
                </div>
                {isProcessing && (
                    <div className="mb-4" role="status" aria-live="polite" aria-atomic="true">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                {status || 'Processing...'}
                            </span>
                            <span className="text-xs font-bold text-indigo-700">
                                {chunkProgress}/{chunkTotal} ({progressPercent}%)
                            </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-label={status || 'Transcription progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={chunkTotal > 0 ? progressPercent : undefined} aria-valuetext={progressValueText}>
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out motion-reduce:transition-none"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="min-h-11 px-4 py-2 rounded-lg text-slate-700 font-bold hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t?.('common.cancel') || 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { if (!isProcessing) onConfirm(); }}
                        aria-disabled={isProcessing}
                        aria-busy={isProcessing}
                        className={`min-h-11 px-6 py-2 bg-indigo-700 text-white font-bold rounded-xl hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-700 transition-colors motion-reduce:transition-none shadow-md flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin motion-reduce:animate-none" aria-hidden="true">{'\u23F3'}</span>
                                {t?.('modals.large_file.processing') || 'Transcribing...'}
                            </>
                        ) : (
                            <>
                                <span aria-hidden="true">{'\u2728'}</span>
                                {t?.('modals.large_file.confirm') || 'Start Chunked Transcription'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});


// ─── Registration ───────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.LargeFileHandler = LargeFileHandler;
window.AlloModules.LargeFileTranscriptionModal = LargeFileTranscriptionModal;
console.log('[LargeFileModule] LargeFileHandler + LargeFileTranscriptionModal registered.');
