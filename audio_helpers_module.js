(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AudioHelpersModule) { console.log('[CDN] AudioHelpersModule already loaded, skipping'); return; }
// audio_helpers_source.jsx - Phase H.1 of CDN modularization.
// handleDownloadAudio + handleCardAudioSequence extracted from
// AlloFlowANTI.txt 2026-04-25 using the (args, deps) shim pattern.

const _readAudioMarkdownSpan = (text, start, openChar, closeChar) => {
    if (text[start] !== openChar) return null;
    let depth = 0;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === openChar) depth++;
        else if (ch === closeChar && --depth === 0) {
            return { end: i + 1, content: text.slice(start + 1, i) };
        }
    }
    return null;
};

const _replaceAudioMarkdownLinks = (value) => {
    const text = String(value || '');
    let output = '';
    let cursor = 0;
    while (cursor < text.length) {
        const start = text.indexOf('[', cursor);
        if (start < 0) {
            output += text.slice(cursor);
            break;
        }
        const label = _readAudioMarkdownSpan(text, start, '[', ']');
        if (!label || text[label.end] !== '(') {
            output += text.slice(cursor, start + 1);
            cursor = start + 1;
            continue;
        }
        const destination = _readAudioMarkdownSpan(text, label.end, '(', ')');
        if (!destination) {
            output += text.slice(cursor, start + 1);
            cursor = start + 1;
            continue;
        }
        output += text.slice(cursor, start);
        // Citation labels carry no speakable content; ordinary Markdown links
        // retain their human-readable label while their destination is silent.
        if (!/^\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e$/.test(label.content)) output += label.content;
        cursor = destination.end;
    }
    return output;
};

const _stripAudioReferenceTrailer = (value) => {
    const text = String(value || '');
    try {
        const helpers = window.AlloModules && window.AlloModules.TextPipelineHelpers;
        if (helpers && typeof helpers.splitReferencesFromBody === 'function') {
            return String((helpers.splitReferencesFromBody(text) || {}).body || '');
        }
    } catch (_) {}

    // Rolling-deployment fallback for an older text-pipeline module. Preserve
    // a bilingual English block if a legacy document put references before it.
    const header = /(?:^|\r?\n)[ \t]*#{1,6}[ \t]+(?:Source[ \t]+Text[ \t]+References|Accuracy[ \t]+Check[ \t]+References|Verified[ \t]+Sources|Referenced[ \t]+Sources|Sources|References|Bibliography|Works[ \t]+Cited|R\u00e9f\u00e9rences|Sources[ \t]+du[ \t]+texte|Referencias|Quellen)[ \t]*:?[ \t]*(?=\r?\n|$)/im.exec(text);
    if (!header) return text;
    const leadingHeaderBreak = /^(?:\r?\n)/.exec(header[0]);
    const headerStart = header.index + (leadingHeaderBreak ? leadingHeaderBreak[0].length : 0);
    const afterHeader = headerStart + header[0].replace(/^(?:\r?\n)/, '').length;
    const remainder = text.slice(afterHeader);
    const delimiter = /(?:^|\r?\n)[ \t]*---[ \t]+ENGLISH[ \t]+TRANSLATION[ \t]+---[ \t]*(?=\r?\n|$)/im.exec(remainder);
    const before = text.slice(0, header.index).trim();
    const leadingDelimiterBreak = delimiter && /^(?:\r?\n)/.exec(delimiter[0]);
    const after = delimiter ? remainder.slice(delimiter.index + (leadingDelimiterBreak ? leadingDelimiterBreak[0].length : 0)).trim() : '';
    return before && after ? before + '\n\n' + after : (before || after);
};

const prepareDownloadAudioText = (rawText) => {
    let cleanText = _stripAudioReferenceTrailer(rawText);
    cleanText = _replaceAudioMarkdownLinks(cleanText)
        .replace(/\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/__|\_/g, '')
        .replace(/^#+\s/gm, '')
        .replace(/`/g, '')
        .replace(/https?:\/\/[^\s<>"']+/g, 'link')
        .replace(/[ \t]+([.,;:!?])/g, '$1')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return cleanText;
};

const _normalizeRequiredTtsBytes = (result, segmentNumber) => {
    const rawBytes = result && result.bytes;
    let bytes = null;
    if (rawBytes instanceof Uint8Array) {
        bytes = rawBytes;
    } else if (typeof ArrayBuffer !== 'undefined' && rawBytes instanceof ArrayBuffer) {
        bytes = new Uint8Array(rawBytes);
    } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(rawBytes)) {
        bytes = new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
    } else if (Array.isArray(rawBytes)) {
        bytes = Uint8Array.from(rawBytes);
    }
    if (!bytes || bytes.byteLength === 0) {
        throw new Error(`TTS returned no audio for segment ${segmentNumber}`);
    }
    return bytes;
};


const _extractMonoPcm16WavBytes = (buffer, segmentNumber) => {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || 0);
    if (bytes.byteLength < 44 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WAVE') {
        throw new Error(`Local TTS returned a non-WAV clip for segment ${segmentNumber}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12;
    let format = null;
    while (offset + 8 <= bytes.byteLength) {
        const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
        const size = view.getUint32(offset + 4, true);
        const bodyOffset = offset + 8;
        if (bodyOffset + size > bytes.byteLength) break;
        if (id === 'fmt ' && size >= 16) {
            format = {
                encoding: view.getUint16(bodyOffset, true),
                channels: view.getUint16(bodyOffset + 2, true),
                sampleRate: view.getUint32(bodyOffset + 4, true),
                bits: view.getUint16(bodyOffset + 14, true),
            };
        } else if (id === 'data') {
            if (!format || format.encoding !== 1 || format.channels !== 1 || format.sampleRate !== 24000 || format.bits !== 16) {
                throw new Error(`Local TTS returned an incompatible WAV format for segment ${segmentNumber}`);
            }
            return bytes.slice(bodyOffset, bodyOffset + size);
        }
        offset = bodyOffset + size + (size % 2);
    }
    throw new Error(`Local TTS returned no PCM data for segment ${segmentNumber}`);
};

const DOWNLOAD_AUDIO_CHUNK_CHARS = 2500;
const DOWNLOAD_AUDIO_MAX_REQUESTS = 250;
const DOWNLOAD_AUDIO_MAX_PCM_BYTES = 64 * 1024 * 1024;
const DOWNLOAD_AUDIO_COMBINE_PCM_BYTES = 32 * 1024 * 1024;
const DOWNLOAD_AUDIO_MAX_TEXT_CHARS = 250000;

const splitDownloadAudioChunks = (value, maxChars = DOWNLOAD_AUDIO_CHUNK_CHARS) => {
    const text = String(value || '').trim();
    const limit = Math.max(64, Number(maxChars) || DOWNLOAD_AUDIO_CHUNK_CHARS);
    if (!text) return [];
    const sentenceUnits = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = '';
    const flushCurrent = () => {
        const ready = current.trim();
        if (ready) chunks.push(ready);
        current = '';
    };
    for (const rawUnit of sentenceUnits) {
        let unit = String(rawUnit || '').trim();
        if (!unit) continue;
        while (unit.length > limit) {
            flushCurrent();
            let cut = unit.lastIndexOf(' ', limit);
            if (cut <= 0) cut = limit;
            const piece = unit.slice(0, cut).trim();
            if (piece) chunks.push(piece);
            unit = unit.slice(cut).trim();
        }
        if (!unit) continue;
        const candidate = current ? `${current} ${unit}` : unit;
        if (candidate.length > limit) flushCurrent();
        current = current ? `${current} ${unit}` : unit;
    }
    flushCurrent();
    return chunks;
};

const _downloadAbortError = () => {
    const error = new Error('Audio download cancelled');
    error.name = 'AbortError';
    return error;
};

const _waitForDownloadDelay = (delayMs, signal) => {
    if (!signal) return new Promise(resolve => setTimeout(resolve, delayMs));
    if (signal.aborted) return Promise.reject(_downloadAbortError());
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { cleanup(); resolve(); }, delayMs);
        const onAbort = () => { cleanup(); reject(_downloadAbortError()); };
        const cleanup = () => {
            clearTimeout(timer);
            try { signal.removeEventListener('abort', onAbort); } catch (_) {}
        };
        try { signal.addEventListener('abort', onAbort, { once: true }); } catch (_) {}
    });
};

const _pcmChunksToWavBlob = (chunks, totalBytes, sampleRate = 24000) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    write(0, 'RIFF');
    view.setUint32(4, 36 + totalBytes, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, totalBytes, true);
    return new Blob([header, ...chunks], { type: 'audio/wav' });
};
const handleDownloadAudio = async (rawText, filename, contentId, deps) => {
  const { AVAILABLE_VOICES, fetchTTSBytes, callTTS, downloadingContentId, selectedVoice, textFormat, setDownloadingContentId, persistentVoiceMapRef, addToast, t, warnLog, pcmToMp3, pcmToWav } = deps;
  try { if (window._DEBUG_AUDIO_HELPERS) console.log("[AudioHelpers] handleDownloadAudio fired"); } catch(_) {}
    if (!rawText || downloadingContentId) return;
    const activeController = window.__alloActiveAudioDownloadController;
    if (activeController && !activeController.signal?.aborted) return;
    const downloadController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const downloadSignal = downloadController?.signal || null;
    if (downloadController) {
        window.__alloActiveAudioDownloadController = downloadController;
        window.__alloCancelAudioDownload = () => {
            try { downloadController.abort(); } catch (_) {}
        };
    }
    setDownloadingContentId(contentId);
    addToast(t('common.audio_generating'), "info");
    try {
        const cleanText = prepareDownloadAudioText(rawText);
        if (!cleanText) throw new Error('No speakable text remains after removing citations and references');
        const pcmChunks = [];
        if (cleanText.length > DOWNLOAD_AUDIO_MAX_TEXT_CHARS) throw new Error('Text is too long for one audio download');
        const voicePool = AVAILABLE_VOICES.filter(v => v !== selectedVoice);
        if (voicePool.length === 0) voicePool.push(selectedVoice || 'Kore');
        if (!persistentVoiceMapRef.current) {
            persistentVoiceMapRef.current = { "Narrator": selectedVoice, _poolIndex: 0 };
        }
        const voiceMap = persistentVoiceMapRef.current;
        voiceMap["Narrator"] = selectedVoice;
        const getVoiceFor = (name) => {
            if (voiceMap[name]) return voiceMap[name];
            const poolIndex = voiceMap._poolIndex || 0;
            const assignedVoice = voicePool[poolIndex % voicePool.length];
            voiceMap[name] = assignedVoice;
            voiceMap._poolIndex = poolIndex + 1;
            return assignedVoice;
        };
        let segments = [];
        const scriptRegex = /^([A-Za-z0-9\s\.]+):\s*(.*)/;
        const isScriptFormat = textFormat === 'Dialogue Script' || textFormat === 'Podcast Script';
        const lines = cleanText.split('\n');
        const scriptLines = lines.filter(l => scriptRegex.test(l)).length;
        const isDetectedScript = scriptLines > 2 && (scriptLines / lines.length > 0.1);
        if (isScriptFormat || isDetectedScript) {
            let currentSpeaker = "Narrator";
            let currentBuffer = "";
            lines.forEach(line => {
                const match = line.match(scriptRegex);
                if (match) {
                    if (currentBuffer.trim()) {
                        segments.push({ speaker: currentSpeaker, text: currentBuffer.trim() });
                    }
                    currentSpeaker = match[1].trim();
                    currentBuffer = match[2] + " ";
                } else {
                    currentBuffer += line + " ";
                }
            });
            if (currentBuffer.trim()) segments.push({ speaker: currentSpeaker, text: currentBuffer.trim() });
        } else if (textFormat === 'Narrative Story' || textFormat === 'Narrative') {
            const parts = cleanText.split(/([“"][^”"]+[”"])/g);
            parts.forEach(part => {
                if (!part.trim()) return;
                const isQuote = /^[“"]/.test(part.trim());
                if (isQuote) {
                    segments.push({ speaker: "Character_Generic", text: part });
                } else {
                    segments.push({ speaker: "Narrator", text: part });
                }
            });
        } else {
            const panelMatch = cleanText.match(/^([^:]+)\s+(says|replies):\s*/);
            if (panelMatch) {
                const speakerName = panelMatch[1].trim();
                const messageText = cleanText.substring(panelMatch[0].length);
                segments.push({ speaker: speakerName, text: messageText });
            } else {
                segments.push({ speaker: "Narrator", text: cleanText });
            }
        }
        if (!segments.some(segment => segment && String(segment.text || '').trim())) {
            throw new Error('No speakable audio segments were created');
        }
        let requestedSegmentCount = 0;
        let totalPcmBytes = 0;
        const fetchRequiredPcm = async (text, voice) => {
            if (downloadSignal?.aborted) throw _downloadAbortError();
            if (requestedSegmentCount >= DOWNLOAD_AUDIO_MAX_REQUESTS) throw new Error('Audio download needs too many TTS segments');
            requestedSegmentCount += 1;
            let result;
            const localKokoroVoice = /^(af_|am_|bf_|bm_)/i.test(String(voice || ''));
            if (localKokoroVoice && typeof callTTS === 'function') {
                if (!window._kokoroTTS?.ready && typeof window.__loadKokoroTTS === 'function') {
                    await window.__loadKokoroTTS();
                }
                if (!window._kokoroTTS?.ready) throw new Error('The selected local voice is not ready for download');
                const audioUrl = await callTTS(text, voice, 1, {
                    maxRetries: 0,
                    signal: downloadSignal,
                    priority: 'normal',
                    reason: 'download-audio',
                });
                if (!audioUrl) throw new Error(`Local TTS returned no audio for segment ${requestedSegmentCount}`);
                const response = await fetch(audioUrl, { signal: downloadSignal || undefined });
                if (!response.ok) throw new Error(`Local TTS clip could not be read for segment ${requestedSegmentCount}`);
                result = { bytes: _extractMonoPcm16WavBytes(await response.arrayBuffer(), requestedSegmentCount) };
            } else result = await fetchTTSBytes(text, voice, 1, null, downloadSignal, 'normal');
            if (downloadSignal?.aborted) throw _downloadAbortError();
            const bytes = _normalizeRequiredTtsBytes(result, requestedSegmentCount);
            totalPcmBytes += bytes.byteLength;
            if (totalPcmBytes > DOWNLOAD_AUDIO_MAX_PCM_BYTES) throw new Error('Generated audio is too large for one download');
            return bytes;
        };
        for (const segment of segments) {
            if (!segment.text.trim()) continue;
            let targetVoice = selectedVoice;
            if (segment.speaker === 'Narrator') {
                targetVoice = selectedVoice;
            } else if (segment.speaker === 'Character_Generic') {
                 targetVoice = voicePool[0] || "Fenrir";
            } else {
                 targetVoice = getVoiceFor(segment.speaker);
            }
            const chunks = splitDownloadAudioChunks(segment.text);
            for (const chunk of chunks) {
                pcmChunks.push(await fetchRequiredPcm(chunk, targetVoice));
                await _waitForDownloadDelay(100, downloadSignal);
            }
        }
        const totalLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
        if (requestedSegmentCount === 0 || pcmChunks.length !== requestedSegmentCount || totalLength === 0) {
            throw new Error('TTS did not return complete audio');
        }
        if (downloadSignal?.aborted) throw _downloadAbortError();
        let blob;
        let extension;
        if (totalLength > DOWNLOAD_AUDIO_COMBINE_PCM_BYTES) {
            blob = _pcmChunksToWavBlob(pcmChunks, totalLength);
            extension = "wav";
        } else {
        const combinedPCM = new Uint8Array(totalLength);
        let offset = 0;
        for (const c of pcmChunks) {
            combinedPCM.set(c, offset);
            offset += c.length;
        }
        if (window.lamejs) {
            try {
                blob = pcmToMp3(combinedPCM);
                if (!blob || !Number.isFinite(blob.size) || blob.size === 0) {
                    throw new Error('MP3 encoder returned no audio');
                }
                extension = "mp3";
            } catch (e) {
                warnLog("MP3 Encoding failed, falling back to WAV", e);
                const wavBuffer = pcmToWav(combinedPCM);
                if (!wavBuffer || Number(wavBuffer.byteLength || wavBuffer.length || 0) <= 44) {
                    throw new Error('WAV encoder returned no audio');
                }
                blob = new Blob([wavBuffer], { type: 'audio/wav' });
                extension = "wav";
            }
        } else {
            const wavBuffer = pcmToWav(combinedPCM);
            if (!wavBuffer || Number(wavBuffer.byteLength || wavBuffer.length || 0) <= 44) {
                throw new Error('WAV encoder returned no audio');
            }
            blob = new Blob([wavBuffer], { type: 'audio/wav' });
            extension = "wav";
        }
        }
        if (downloadSignal?.aborted) throw _downloadAbortError();
        if (!blob || !Number.isFinite(blob.size) || blob.size === 0) {
            throw new Error('Audio encoder returned an empty file');
        }
        const audioUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${filename}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(audioUrl), 60000);
        addToast(t('common.audio_success', { ext: extension.toUpperCase() }), "success");
    } catch (err) {
        if (err?.name === 'AbortError') {
            addToast(t('common.audio_cancelled'), "info");
        } else if (err?.code === 'BROWSER_TTS_REQUIRED' || err?.useBrowserTts === true) {
            // The device voice is now a first-class narrator choice (V6), but it
            // speaks through speechSynthesis, which produces no audio stream and
            // therefore no file. Say that, rather than the generic failure — the
            // user picked this voice deliberately and the fix is one dropdown away.
            warnLog("Download Audio: device voice cannot produce a file");
            addToast(
                t('common.audio_device_voice_no_file')
                || 'The device voice reads aloud but cannot be saved as a file. Pick a cloud or on-device voice in the narrator settings to download audio.',
                "info"
            );
        } else {
            warnLog("Download Audio Error:", err);
            addToast(t('common.audio_failed'), "error");
        }
    } finally {
        setDownloadingContentId(null);
        if (window.__alloActiveAudioDownloadController === downloadController) {
            window.__alloActiveAudioDownloadController = null;
            try { delete window.__alloCancelAudioDownload; } catch (_) { window.__alloCancelAudioDownload = null; }
        }
    }
};

const handleCardAudioSequence = async (e, deps) => {
  const { generatedContent, selectedVoice, setIsPlaying, setPlayingContentId, audioRef, isPlayingRef, playbackSessionRef, playbackRateRef, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, addBlobUrl, callTTS, stopPlayback, t, warnLog } = deps;
  try { if (window._DEBUG_AUDIO_HELPERS) console.log("[AudioHelpers] handleCardAudioSequence fired"); } catch(_) {}
      e.stopPropagation();
      const item = generatedContent?.data[flashcardIndex];
      if (!item) return;
      stopPlayback();
      isPlayingRef.current = true;
      const sessionId = Date.now();
      playbackSessionRef.current = sessionId;
      setPlayingContentId('flashcard-sequence');
      setIsPlaying(true);
      const labelTerm = t('flashcards.front_label_term');
      const labelDef = t('flashcards.back_label_def');
      const labelEng = t('languages.english');
      try {
          let sequence = [];
          if (flashcardMode === 'standard') {
              sequence = [item.term];
              if (standardDeckLang !== 'English Only' && item.translations?.[standardDeckLang]) {
                  const fullTrans = item.translations[standardDeckLang];
                  if (fullTrans.includes(":")) {
                      const transTerm = fullTrans.substring(0, fullTrans.indexOf(":")).trim();
                      if (transTerm) sequence.push(`${standardDeckLang} ${labelTerm}: ${transTerm}`);
                  }
              }
              sequence.push(item.def);
              if (standardDeckLang !== 'English Only' && item.translations?.[standardDeckLang]) {
                  const fullTrans = item.translations[standardDeckLang];
                  let transDef = fullTrans;
                  if (fullTrans.includes(":")) {
                      transDef = fullTrans.substring(fullTrans.indexOf(":") + 1).trim();
                  }
                  sequence.push(`${standardDeckLang} ${labelDef}: ${transDef}`);
              }
          } else {
              const transText = item.translations?.[flashcardLang] || "";
              let transTerm = "";
              let transDef = transText;
              if (transText.includes(":")) {
                  const splitIdx = transText.indexOf(":");
                  transTerm = transText.substring(0, splitIdx).trim();
                  transDef = transText.substring(splitIdx + 1).trim();
              }
              sequence = [
                  `${labelEng} ${labelTerm}: ${item.term}`,
                  `${labelDef}: ${item.def}`,
                  transTerm ? `${flashcardLang} ${labelTerm}: ${transTerm}` : null,
                  `${flashcardLang} ${labelDef}: ${transDef}`
              ].filter(Boolean);
          }
          const playNext = async (idx) => {
              if (playbackSessionRef.current !== sessionId || idx >= sequence.length) {
                  setIsPlaying(false);
                  setPlayingContentId(null);
                  return;
              }
              try {
                  const audioUrl = await callTTS(sequence[idx], selectedVoice);
                  addBlobUrl(audioUrl);
                  if (playbackSessionRef.current !== sessionId) return;
                  const audio = new Audio(audioUrl);
                  audio.playbackRate = playbackRateRef.current;
                  audioRef.current = audio;
                  audio.onended = () => {
                      setTimeout(() => playNext(idx + 1), 500);
                  };
                  const playPromise = audio.play();
                  if (playPromise !== undefined) {
                      playPromise.catch(error => {
                          if (error.name !== 'AbortError') {
                              warnLog("Card audio error:", error);
                          }
                      });
                  }
              } catch (err) {
                  warnLog("Card Audio Error (Gemini), retrying once...", err);
                  try {
                      await new Promise(r => setTimeout(r, 1500));
                      if (playbackSessionRef.current !== sessionId) return;
                      const retryUrl = await callTTS(sequence[idx], selectedVoice);
                      if (retryUrl) {
                          addBlobUrl(retryUrl);
                          const retryAudio = new Audio(retryUrl);
                          retryAudio.playbackRate = playbackRateRef.current;
                          audioRef.current = retryAudio;
                          retryAudio.onended = () => {
                              setTimeout(() => playNext(idx + 1), 500);
                          };
                          retryAudio.play().catch(e => {
                              warnLog("Retry audio play failed", e);
                              setTimeout(() => playNext(idx + 1), 500);
                          });
                          return;
                      }
                  } catch (retryErr) {
                      warnLog("Gemini TTS retry also failed", retryErr);
                  }
                  warnLog("⚠️ Skipping flashcard audio for:", sequence[idx]?.substring(0, 30), "(no browser TTS fallback)");
                  setTimeout(() => playNext(idx + 1), 500);
              }
          };
          playNext(0);
      } catch (err) {
          warnLog("Unhandled error:", err);
          setIsPlaying(false);
          isPlayingRef.current = false;
          setPlayingContentId(null);
      }
};

const pcmToWav = (pcmData, sampleRate = 24000) => {
  const headerLength = 44;
  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  const pcmBytes = new Uint8Array(pcmData);
  const wavBytes = new Uint8Array(buffer, 44);
  wavBytes.set(pcmBytes);
  return buffer;
};

// kbps defaults to 128 (full-quality downloads). Karaoke per-sentence storage
// passes 64 — transparent for 24 kHz mono speech at half the embedded size.
const pcmToMp3 = (pcmData, sampleRate = 24000, kbps = 128) => {
  if (!window.lamejs) throw new Error("lamejs not loaded");
  const int16Samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
  const mp3Encoder = new window.lamejs.Mp3Encoder(1, sampleRate, kbps || 128);
  const mp3Data = [];
  const sampleBlockSize = 1152;
  for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
    const sampleChunk = int16Samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  return new Blob(mp3Data, { type: 'audio/mp3' });
};

// Cooperative variant for background persistence. LAME encoding is CPU-bound;
// running a whole sentence in one task can delay karaoke state/audio events.
// Yield between small batches so playback and React updates stay responsive.
const pcmToMp3Async = async (pcmData, sampleRate = 24000, kbps = 128, options = {}) => {
  if (!window.lamejs) throw new Error("lamejs not loaded");
  const int16Samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
  const mp3Encoder = new window.lamejs.Mp3Encoder(1, sampleRate, kbps || 128);
  const mp3Data = [];
  const sampleBlockSize = 1152;
  const blocksPerYield = Math.max(1, Number(options.blocksPerYield) || 8);
  const yieldToMain = typeof options.yieldToMain === 'function'
    ? options.yieldToMain
    : () => new Promise(resolve => setTimeout(resolve, 0));
  let blocksSinceYield = 0;
  for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
    const sampleChunk = int16Samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
    blocksSinceYield++;
    if (i + sampleBlockSize < int16Samples.length && blocksSinceYield >= blocksPerYield) {
      blocksSinceYield = 0;
      await yieldToMain();
    }
  }
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(mp3buf);
  return new Blob(mp3Data, { type: 'audio/mp3' });
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.AudioHelpers = {
  handleDownloadAudio,
  prepareDownloadAudioText,
  splitDownloadAudioChunks,
  handleCardAudioSequence,
  pcmToWav,
  pcmToMp3,
  pcmToMp3Async,
};

window.AlloModules.AudioHelpersModule = true;
console.log('[AudioHelpers] 2 helpers registered (handleDownloadAudio + handleCardAudioSequence)');
})();
