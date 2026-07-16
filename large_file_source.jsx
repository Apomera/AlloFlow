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
var getGlobalAudioContext = (typeof window !== 'undefined' && window.getGlobalAudioContext)
    ? window.getGlobalAudioContext
    : (function() {
        // Minimal fallback: return a Web Audio context directly.
        var Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        return Ctx ? new Ctx() : null;
    });

const LargeFileHandler = {
    CHUNK_DURATION_SECONDS: 600,
    TARGET_SAMPLE_RATE: 16000,
    MAX_CHUNK_SIZE_BYTES: 15 * 1024 * 1024,
    isProcessing: false,
    cancelRequested: false,
    needsChunking(file) {
        return file.size > this.MAX_CHUNK_SIZE_BYTES;
    },
    getFileType(file) {
        const type = file.type.toLowerCase();
        if (type.startsWith('audio/')) return 'audio';
        if (type.startsWith('video/')) return 'video';
        if (type === 'application/pdf') return 'pdf';
        const ext = file.name.split('.').pop().toLowerCase();
        if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
        if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
        if (ext === 'pdf') return 'pdf';
        return 'unknown';
    },
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    },
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    },
    async processAudioFile(file, transcribeChunk, onProgress = () => {}) {
        this.isProcessing = true;
        this.cancelRequested = false;
        try {
            onProgress(0, 1, 'Reading file...');
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const audioCtx = getGlobalAudioContext();
            if (!audioCtx) {
                throw new Error('Web Audio API not supported');
            }
            onProgress(0, 1, 'Decoding audio...');
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
            const totalDuration = audioBuffer.duration;
            const sampleRate = audioBuffer.sampleRate;
            const numberOfChannels = audioBuffer.numberOfChannels;
            const chunkCount = Math.ceil(totalDuration / this.CHUNK_DURATION_SECONDS);
            onProgress(0, chunkCount, `Preparing ${chunkCount} chunks...`);
            const transcripts = [];
            for (let i = 0; i < chunkCount; i++) {
                if (this.cancelRequested) {
                    throw new Error('Cancelled');
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
                const chunkTranscript = await transcribeChunk(base64, 'audio/wav');
                transcripts.push(chunkTranscript);
            }
            const fullTranscript = transcripts.join(' ');
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
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to convert to base64'));
            reader.readAsDataURL(blob);
        });
    },
    cancel() {
        this.cancelRequested = true;
    },
    async extractAudioFromVideo(videoFile, onProgress = () => {}) {
        onProgress(0, 1, 'Extracting audio from video...');
        const arrayBuffer = await this.readFileAsArrayBuffer(videoFile);
        const audioCtx = getGlobalAudioContext();
        if (!audioCtx) {
            throw new Error('Web Audio API not supported');
        }
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const wavBlob = this.audioBufferToWav(audioBuffer);
        const audioFileName = videoFile.name.replace(/\.[^.]+$/, '.wav');
        return new File([wavBlob], audioFileName, { type: 'audio/wav' });
    },
    async processVideoFile(file, transcribeChunk, onProgress = () => {}) {
        onProgress(0, 1, 'Extracting audio from video...');
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
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
        )).filter((element) => {
            if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
            const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
            return !style || (style.display !== 'none' && style.visibility !== 'hidden');
        });
        (getFocusable()[0] || dialog).focus();
        const onKeyDown = (event) => {
            if (!isTopTrap()) return;
            if (event.key === 'Escape') {
                if (!processingRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    closeRef.current();
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
            if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
        };
    }, [isOpen]);

    if (!isOpen || !file) return null;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const estimatedChunks = Math.ceil(file.size / (15 * 1024 * 1024));
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
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto relative border-4 border-indigo-100 transition-all animate-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none"
                role="dialog" aria-modal="true" aria-labelledby="large-file-modal-title" aria-describedby="large-file-description" aria-busy={isProcessing} onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    aria-label={t?.('common.close') || 'Close'}
                    onClick={onClose} data-help-key="dashboard_close_btn"
                    disabled={isProcessing}
                    className="absolute top-4 right-4 min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-full text-slate-600 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <span className="text-xs font-bold text-indigo-600">
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
                        className="min-h-11 px-4 py-2 rounded-lg text-slate-600 font-bold hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t?.('common.cancel') || 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { if (!isProcessing) onConfirm(); }}
                        aria-disabled={isProcessing}
                        aria-busy={isProcessing}
                        className={`min-h-11 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors shadow-md flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
