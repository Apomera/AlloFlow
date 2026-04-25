// audio_helpers_source.jsx - Phase H.1 of CDN modularization.
// handleDownloadAudio + handleCardAudioSequence extracted from
// AlloFlowANTI.txt 2026-04-25 using the (args, deps) shim pattern.

const handleDownloadAudio = async (rawText, filename, contentId, deps) => {
  const { AVAILABLE_VOICES, fetchTTSBytes, downloadingContentId, selectedVoice, textFormat, setDownloadingContentId, persistentVoiceMapRef, addToast, t, warnLog, pcmToMp3, pcmToWav } = deps;
  try { if (window._DEBUG_AUDIO_HELPERS) console.log("[AudioHelpers] handleDownloadAudio fired"); } catch(_) {}
    if (!rawText || downloadingContentId) return;
    setDownloadingContentId(contentId);
    addToast(t('common.audio_generating'), "info");
    try {
        const cleanText = rawText
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/__|\_/g, '')
            .replace(/^#+\s/gm, '')
            .replace(/`/g, '')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/https?:\/\/[^\s]+/g, 'link');
        const pcmChunks = [];
        const voicePool = AVAILABLE_VOICES.filter(v => v !== selectedVoice);
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
            const CHUNK_SIZE = 2500;
            if (segment.text.length > CHUNK_SIZE) {
                const sentences = segment.text.match(/[^.!?]+[.!?]+["']?|[\s\S]+$/g) || [segment.text];
                let currentChunk = "";
                for (const s of sentences) {
                    if ((currentChunk.length + s.length) > CHUNK_SIZE) {
                        const bytes = await fetchTTSBytes(currentChunk.trim(), targetVoice);
                        pcmChunks.push(bytes);
                        currentChunk = s;
                        await new Promise(r => setTimeout(r, 100));
                    } else {
                        currentChunk += s + " ";
                    }
                }
                if (currentChunk.trim()) {
                    const bytes = await fetchTTSBytes(currentChunk.trim(), targetVoice);
                    pcmChunks.push(bytes);
                }
            } else {
                const bytes = await fetchTTSBytes(segment.text, targetVoice);
                pcmChunks.push(bytes);
                await new Promise(r => setTimeout(r, 100));
            }
        }
        const totalLength = pcmChunks.reduce((acc, c) => acc + c.length, 0);
        const combinedPCM = new Uint8Array(totalLength);
        let offset = 0;
        for (const c of pcmChunks) {
            combinedPCM.set(c, offset);
            offset += c.length;
        }
        let blob;
        let extension;
        if (window.lamejs) {
            try {
                blob = pcmToMp3(combinedPCM);
                extension = "mp3";
            } catch (e) {
                warnLog("MP3 Encoding failed, falling back to WAV", e);
                const wavBuffer = pcmToWav(combinedPCM);
                blob = new Blob([wavBuffer], { type: 'audio/wav' });
                extension = "wav";
            }
        } else {
            const wavBuffer = pcmToWav(combinedPCM);
            blob = new Blob([wavBuffer], { type: 'audio/wav' });
            extension = "wav";
        }
        const audioUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${filename}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(audioUrl), 1000);
        addToast(t('common.audio_success', { ext: extension.toUpperCase() }), "success");
    } catch (err) {
        warnLog("Download Audio Error:", err);
        addToast(t('common.audio_failed'), "error");
    } finally {
        setDownloadingContentId(null);
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

window.AlloModules = window.AlloModules || {};
window.AlloModules.AudioHelpers = {
  handleDownloadAudio,
  handleCardAudioSequence,
};
