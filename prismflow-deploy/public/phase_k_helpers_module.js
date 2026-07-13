(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PhaseKHelpersModule) { console.log('[CDN] PhaseKHelpersModule already loaded, skipping'); return; }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
const buildPersonaVoiceInstruction = (speakingChar) => {
  if (speakingChar && speakingChar.voiceProfile) {
    const stableProfile = String(speakingChar.voiceProfile).replace(/\b(thick|heavy|strong|exaggerated|pronounced)\b(?=(?:\s+[A-Za-z-]+){0,4}\s+accent)/gi, "subtle").replace(/[,;]\s*[^,;.]*\b(?:lapses?|slips?|switch(?:es|ing)?)\s+into\b[^,;.]*/gi, "");
    const nationalityHint = speakingChar.nationality ? ` They are ${speakingChar.nationality}.` : "";
    return `[Voice direction: ${stableProfile}.${nationalityHint} Use a mild, natural version of this accent and keep the exact same voice, accent, pacing, and tone from the first word to the last \u2014 expressive but steady, never exaggerated, never drifting toward a different accent.]`;
  }
  if (speakingChar && speakingChar.name) {
    const natHint = speakingChar.nationality ? ` Use a subtle, consistent ${speakingChar.nationality} accent.` : "";
    return `[Speak as ${speakingChar.name}${speakingChar.role ? ", " + speakingChar.role : ""}${speakingChar.year ? " from " + speakingChar.year : ""}.${natHint} Keep the exact same voice, accent, and tone for every sentence.]`;
  }
  return `[Speak in a warm, expressive voice. Keep the exact same voice, accent, and tone for every sentence.]`;
};
const buildCompactPersonaVoiceInstruction = (speakingChar) => {
  if (speakingChar && speakingChar.voiceProfile) {
    const stableProfile = String(speakingChar.voiceProfile).replace(/\b(thick|heavy|strong|exaggerated|pronounced)\b(?=(?:\s+[A-Za-z-]+){0,4}\s+accent)/gi, "subtle").replace(/[,;]\s*[^,;.]*\b(?:lapses?|slips?|switch(?:es|ing)?)\s+into\b[^,;.]*/gi, "").replace(/\s+/g, " ").trim();
    const compactProfile = stableProfile.length > 220 ? stableProfile.slice(0, 220).replace(/\s+\S*$/, "") : stableProfile;
    const nationalityHint = speakingChar.nationality ? ` ${speakingChar.nationality}.` : "";
    return `[Voice direction: ${compactProfile}.${nationalityHint} Mild, natural, steady; read only the dialogue text.]`;
  }
  if (speakingChar && speakingChar.name) {
    const natHint = speakingChar.nationality ? ` ${speakingChar.nationality}; subtle accent.` : "";
    return `[Voice direction: ${speakingChar.name}${speakingChar.role ? ", " + speakingChar.role : ""}${speakingChar.year ? " from " + speakingChar.year : ""}.${natHint} Mild, natural, steady; read only the dialogue text.]`;
  }
  return `[Voice direction: warm, expressive, steady; read only the dialogue text.]`;
};
const resolvePersonaSpeakingChar = (personaState, activeSpeaker, speakerName) => {
  const isPanelMode = personaState.selectedCharacters && personaState.selectedCharacters.length > 0;
  return isPanelMode ? speakerName && personaState.selectedCharacters.find((c) => c.name === speakerName) || personaState.selectedCharacters.find((c) => c.voice === activeSpeaker) : personaState.selectedCharacter;
};
const READ_ALOUD_STORE_CONTENT_IDS = /* @__PURE__ */ new Set(["simplified-main", "faq-active"]);
const shouldUseReadAloudStore = (contentId, mode) => {
  return mode === "standard" && READ_ALOUD_STORE_CONTENT_IDS.has(contentId || "");
};
const getStoredReadAloudUrl = (storeSentence, spokenSentence) => {
  try {
    const st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
    if (!st) return null;
    return st.get(storeSentence) || (spokenSentence && spokenSentence !== storeSentence ? st.get(spokenSentence) : null);
  } catch (_) {
    return null;
  }
};
const shouldCaptureReadAloud = (contentId, mode, sentence, url) => {
  if (!shouldUseReadAloudStore(contentId, mode) || !sentence || !url) return false;
  try {
    if (localStorage.getItem("allo_save_karaoke_audio") === "0") return false;
  } catch (_) {
  }
  return typeof window.__alloCaptureKaraokeAudio === "function";
};
const captureReadAloudClip = (contentId, mode, sentence, url) => {
  if (!shouldCaptureReadAloud(contentId, mode, sentence, url)) return;
  try {
    const result = window.__alloCaptureKaraokeAudio(sentence, url);
    if (result && typeof result.catch === "function") result.catch(() => {
    });
  } catch (_) {
  }
};
const playSequence = async (index, sentences, sessionId, mode = "standard", voiceMap = {}, activeSpeaker = null, preloadedAudio = null, retryCount = 0, speakerName = null, deps, contentId = null) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] playSequence fired");
  } catch (_) {
  }
  if (playbackSessionRef.current !== sessionId || index >= sentences.length) {
    if (playbackSessionRef.current === sessionId) stopPlayback();
    return;
  }
  setPlaybackState((prev) => {
    const personaRange = mode === "persona" && prev.chunkRanges ? prev.chunkRanges[index] : null;
    return {
      ...prev,
      currentIdx: index,
      ...personaRange ? { currentSentenceIdx: personaRange[0] } : {}
    };
  });
  if (!preloadedAudio) setIsGeneratingAudio(true);
  try {
    let currentVoice = activeSpeaker || selectedVoice;
    let nextSpeaker = activeSpeaker;
    if (mode === "adventure") {
      const text = sentences[index].trim();
      const hasOpen = /["“]/.test(text);
      const hasClose = /["”]/.test(text);
      const speakerTagMatch = text.match(/^(\*\*|__)?([A-Za-z0-9\s]+)(\*\*|__)?:\s*["“]/);
      let explicitVoiceFound = false;
      if (speakerTagMatch) {
        const detectedName = speakerTagMatch[2].trim();
        const voiceKey = Object.keys(voiceMap).find((k) => k.toLowerCase() === detectedName.toLowerCase());
        if (voiceKey) {
          currentVoice = voiceMap[voiceKey];
          nextSpeaker = hasClose ? null : currentVoice;
          explicitVoiceFound = true;
          if (!hasClose) nextSpeaker = currentVoice;
        }
      }
      if (!activeSpeaker && !explicitVoiceFound) {
        if (hasOpen) {
          let speakerVoice = null;
          const prevText = index > 0 ? sentences[index - 1] : "";
          const combinedContext = prevText + " " + text;
          const charNames = Object.keys(voiceMap).sort((a, b) => b.length - a.length);
          for (const name of charNames) {
            if (combinedContext.toLowerCase().includes(name.toLowerCase())) {
              speakerVoice = voiceMap[name];
              break;
            }
          }
          if (!speakerVoice) {
            const distinctVoices = Object.values(voiceMap).filter((v) => v !== selectedVoice);
            if (distinctVoices.length > 0) {
              speakerVoice = distinctVoices[0];
            } else {
              speakerVoice = "Aoede";
            }
          }
          currentVoice = speakerVoice;
          if (!hasClose) {
            nextSpeaker = speakerVoice;
          } else {
            nextSpeaker = null;
          }
        }
      } else if (activeSpeaker && !explicitVoiceFound) {
        currentVoice = activeSpeaker;
        if (hasClose) {
          nextSpeaker = null;
        }
      }
    } else if (mode === "script") {
      const text = sentences[index].trim();
      const match = text.match(/^(\*+)?([A-Za-z]+)(\*+)?:\s*/);
      if (match) {
        const name = match[2];
        if (voiceMap[name]) {
          currentVoice = voiceMap[name];
          nextSpeaker = currentVoice;
        }
      } else {
        currentVoice = activeSpeaker || (Object.values(voiceMap)[0] || "Fenrir");
        nextSpeaker = currentVoice;
      }
    } else if (mode === "persona") {
      currentVoice = activeSpeaker || selectedVoice;
      nextSpeaker = currentVoice;
    } else {
      currentVoice = selectedVoice;
    }
    let audio;
    let audioUrl;
    const bufferKey = `${index}-${currentVoice}`;
    let textToSpeak = sentences[index];
    if (mode === "script") {
      textToSpeak = textToSpeak.replace(/^(\*+)?([A-Za-z]+)(\*+)?:\s*/, "");
    }
    if (mode === "persona" && activeSpeaker && activeSpeaker !== selectedVoice) {
      const geminiAvailable = !_isCanvasEnv || Date.now() >= _ttsState.rateLimitedUntil;
      if (geminiAvailable) {
        const speakingChar = resolvePersonaSpeakingChar(personaState, activeSpeaker, speakerName);
        textToSpeak = buildCompactPersonaVoiceInstruction(speakingChar) + " " + textToSpeak;
      }
    }
    textToSpeak = textToSpeak.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, "").replace(/\[Source\s+\d+\]/gi, "").replace(/\[\d+\]/g, "").replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/__|_/g, "").replace(/~~/g, "").replace(/`/g, "").replace(/^>\s?/gm, "").replace(/^[-*+]\s/gm, "").replace(/^\d+\.\s/gm, "").replace(/\s+/g, " ").trim();
    let audioStoreSentence = textToSpeak;
    let usingStoredReadAloud = false;
    const storedReadAloudUrl = shouldUseReadAloudStore(contentId, mode) ? getStoredReadAloudUrl(sentences[index], audioStoreSentence) : null;
    const _browserTtsFallbackEnabled = (() => {
      try {
        const cfg = JSON.parse(localStorage.getItem("alloflow_ai_config") || "{}");
        return cfg.browserTtsFallback === true;
      } catch {
        return false;
      }
    })();
    let _errorHandled = false;
    const speakViaBrowserFallback = (reason) => {
      warnLog(`Browser-TTS fallback at index ${index} (${reason})`);
      try {
        if (!("speechSynthesis" in window)) {
          playSequence2(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps, contentId);
          return;
        }
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.rate = playbackRateRef.current || 1;
        const advance = () => {
          if (playbackSessionRef.current !== sessionId) return;
          playSequence2(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps, contentId);
        };
        utter.onend = advance;
        utter.onerror = advance;
        setPlaybackState((prev) => ({ ...prev, currentIdx: index }));
        setIsPlaying(true);
        setIsGeneratingAudio(false);
        window.speechSynthesis.speak(utter);
      } catch (e) {
        warnLog("Browser-TTS fallback threw:", e);
        playSequence2(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps, contentId);
      }
    };
    const handlePlaybackError = (err) => {
      if (_errorHandled) return;
      _errorHandled = true;
      warnLog(`Playback error at index ${index} (Retry ${retryCount}):`, err);
      if (audioUrl) {
        releaseBlob(audioUrl);
      }
      delete audioBufferRef.current[bufferKey];
      if (playbackSessionRef.current === sessionId) {
        const isRefusal = err && err.isModelRefusal === true;
        const isAbort = err && (err.name === "AbortError" || err.name === "NotAllowedError");
        if (isAbort) return;
        if (isRefusal) {
          if (_browserTtsFallbackEnabled) {
            warnLog(`Segment ${index} refused by Gemini safety filter \u2014 using browser TTS fallback.`);
            speakViaBrowserFallback("refusal");
          } else {
            warnLog(`Segment ${index} refused by Gemini safety filter \u2014 skipping (enable browserTtsFallback to hear sentence via system voice).`);
            playSequence2(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps, contentId);
          }
          return;
        }
        if (retryCount < 3) {
          const backoffMs = 1e3 * Math.pow(2, retryCount);
          debugLog(`Retrying segment ${index} in ${backoffMs}ms (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => {
            if (playbackSessionRef.current === sessionId) {
              playSequence2(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1, speakerName, deps, contentId);
            }
          }, backoffMs);
        } else if (_browserTtsFallbackEnabled) {
          warnLog(`Segment ${index} exhausted Gemini retries \u2014 using browser TTS fallback.`);
          speakViaBrowserFallback("retries-exhausted");
        } else {
          warnLog(`Segment ${index} exhausted Gemini retries \u2014 skipping.`);
          playSequence2(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps, contentId);
        }
      }
    };
    if (preloadedAudio) {
      audio = preloadedAudio;
      if (audio instanceof Promise) {
        try {
          const _tOut = window._kokoroTTS ? 9e4 : window.AlloFlowConfig && window.AlloFlowConfig.timeouts && window.AlloFlowConfig.timeouts.audioLoadMs || 15e3;
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Audio load timeout")), _tOut));
          audio = await Promise.race([audio, timeoutPromise]);
        } catch (e) {
          handlePlaybackError(e);
          return;
        }
      }
      if (!audio || audio.error) {
        handlePlaybackError(new Error("Preloaded audio was invalid"));
        return;
      }
      audioUrl = audio.src;
      usingStoredReadAloud = !!audio._alloStoredReadAloud;
      audioStoreSentence = audio._alloStoreSentence || audioStoreSentence;
      audio.playbackRate = playbackRateRef.current;
      audio.muted = false;
    } else {
      if (storedReadAloudUrl) {
        audioUrl = storedReadAloudUrl;
        usingStoredReadAloud = true;
      } else if (audioBufferRef.current[bufferKey]) {
        try {
          const _tOut2 = window._kokoroTTS ? 9e4 : window.AlloFlowConfig && window.AlloFlowConfig.timeouts && window.AlloFlowConfig.timeouts.audioLoadMs || 15e3;
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Audio load timeout")), _tOut2));
          audioUrl = await Promise.race([audioBufferRef.current[bufferKey], timeoutPromise]);
        } catch (e) {
          handlePlaybackError(e);
          return;
        }
      } else {
        const promise = callTTS(textToSpeak, currentVoice).then((url) => {
          addBlobUrl(url);
          return url;
        });
        audioBufferRef.current[bufferKey] = promise;
        try {
          const _tOut3 = window._kokoroTTS ? 9e4 : window.AlloFlowConfig && window.AlloFlowConfig.timeouts && window.AlloFlowConfig.timeouts.audioLoadMs || 15e3;
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Audio load timeout")), _tOut3));
          audioUrl = await Promise.race([promise, timeoutPromise]);
        } catch (e) {
          handlePlaybackError(e);
          return;
        }
      }
      if (playbackSessionRef.current !== sessionId) return;
      audio = new Audio(audioUrl);
      audio.playbackRate = playbackRateRef.current;
      audio.preload = "auto";
    }
    if (audioRef.current && audioRef.current !== audio) {
      audioRef.current.pause();
      audioRef.current.onended = null;
    }
    audioRef.current = audio;
    let simulatedSpeaker = nextSpeaker;
    let nextAudioElementPromise = null;
    const isReadAloudStorePlayback = shouldUseReadAloudStore(contentId, mode);
    const maxPreloadAhead = mode === "persona" || isReadAloudStorePlayback ? 1 : 3;
    for (let offset = 1; offset <= maxPreloadAhead; offset++) {
      const targetIdx = index + offset;
      if (targetIdx >= sentences.length) break;
      let targetVoice = selectedVoice;
      let targetText = sentences[targetIdx].trim();
      let textToPreload = targetText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, "").replace(/\[Source\s+\d+\]/gi, "").replace(/\[\d+\]/g, "").replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/__|_/g, "").replace(/~~/g, "").replace(/`/g, "").replace(/^>\s?/gm, "").replace(/^[-*+]\s/gm, "").replace(/^\d+\.\s/gm, "").replace(/\s+/g, " ").trim();
      if (mode === "adventure") {
        const hasOpen = /["“]/.test(targetText);
        const hasClose = /["”]/.test(targetText);
        if (!simulatedSpeaker) {
          if (hasOpen) {
            let speakerVoice = "Aoede";
            const prevText = sentences[targetIdx - 1] || "";
            const combinedContext = prevText + " " + targetText;
            const charNames = Object.keys(voiceMap).sort((a, b) => b.length - a.length);
            for (const name of charNames) {
              if (combinedContext.includes(name)) {
                speakerVoice = voiceMap[name];
                break;
              }
            }
            targetVoice = speakerVoice;
            if (!hasClose) simulatedSpeaker = speakerVoice;
            else simulatedSpeaker = null;
          } else {
            targetVoice = selectedVoice;
            simulatedSpeaker = null;
          }
        } else {
          targetVoice = simulatedSpeaker;
          if (hasClose) simulatedSpeaker = null;
        }
      } else if (mode === "script") {
        const match = targetText.match(/^(\*+)?([A-Za-z]+)(\*+)?:\s*/);
        if (match) {
          const name = match[2];
          if (voiceMap[name]) {
            targetVoice = voiceMap[name];
            simulatedSpeaker = targetVoice;
          }
        } else {
          targetVoice = simulatedSpeaker || (Object.values(voiceMap)[0] || "Fenrir");
        }
        textToPreload = targetText.replace(/^(\*+)?([A-Za-z]+)(\*+)?:\s*/, "");
      } else if (mode === "persona") {
        targetVoice = activeSpeaker || selectedVoice;
        if (activeSpeaker && activeSpeaker !== selectedVoice) {
          const geminiAvail = !_isCanvasEnv || Date.now() >= _ttsState.rateLimitedUntil;
          if (geminiAvail) {
            const preloadChar = resolvePersonaSpeakingChar(personaState, activeSpeaker, speakerName);
            textToPreload = buildCompactPersonaVoiceInstruction(preloadChar) + " " + textToPreload;
          }
        }
      }
      const nextBufferKey = `${targetIdx}-${targetVoice}`;
      const storedPreloadUrl = isReadAloudStorePlayback ? getStoredReadAloudUrl(sentences[targetIdx], textToPreload) : null;
      if (storedPreloadUrl) {
        if (offset === 1) {
          nextAudioElementPromise = Promise.resolve((() => {
            const a = new Audio(storedPreloadUrl);
            a.playbackRate = playbackRateRef.current;
            a.preload = "auto";
            a.muted = true;
            a._alloStoredReadAloud = true;
            a._alloStoreSentence = textToPreload;
            a.load();
            return a;
          })());
        }
        continue;
      }
      if (!audioBufferRef.current[nextBufferKey]) {
        audioBufferRef.current[nextBufferKey] = callTTS(textToPreload, targetVoice).then((url) => {
          addBlobUrl(url);
          return url;
        }).catch((e) => {
          warnLog(`Preload failed for index ${targetIdx}`, e);
          delete audioBufferRef.current[nextBufferKey];
        });
      }
      if (offset === 1) {
        nextAudioElementPromise = audioBufferRef.current[nextBufferKey].then((url) => {
          const a = new Audio(url);
          a.playbackRate = playbackRateRef.current;
          a.preload = "auto";
          a.muted = true;
          a._alloStoreSentence = textToPreload;
          a.load();
          return a;
        }).catch(() => null);
      }
    }
    audio.onended = async () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      releaseBlob(audioUrl);
      delete audioBufferRef.current[bufferKey];
      let nextPreloadedAudio = null;
      if (nextAudioElementPromise) {
        try {
          const raceTimeout = new Promise((r) => setTimeout(() => r(null), 300));
          nextPreloadedAudio = await Promise.race([nextAudioElementPromise, raceTimeout]);
          if (nextPreloadedAudio) {
            nextPreloadedAudio.muted = false;
          }
        } catch (e) {
        }
      }
      playSequence2(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, nextPreloadedAudio, 0, speakerName, deps, contentId);
    };
    audio.onerror = (e) => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      handlePlaybackError(e);
    };
    let watchdogTimer = null;
    let gaplessTriggered = false;
    const updatePersonaSentenceProgress = () => {
      if (mode !== "persona" || !audio.duration || !isFinite(audio.duration)) return;
      setPlaybackState((prev) => {
        const range = prev.chunkRanges ? prev.chunkRanges[index] : null;
        if (!range) return prev;
        const sentenceCount = Math.max(1, range[1] - range[0]);
        const progress = Math.max(0, Math.min(0.999, audio.currentTime / audio.duration));
        const weights = prev.chunkSentenceWeights ? prev.chunkSentenceWeights[index] : null;
        let offset = Math.min(sentenceCount - 1, Math.floor(progress * sentenceCount));
        if (Array.isArray(weights) && weights.length === sentenceCount && weights[weights.length - 1] > 0) {
          const weightedPosition = progress * weights[weights.length - 1];
          const weightedOffset = weights.findIndex((cutoff) => weightedPosition <= cutoff);
          offset = weightedOffset >= 0 ? weightedOffset : sentenceCount - 1;
        }
        const currentSentenceIdx = range[0] + offset;
        if (prev.currentIdx === index && prev.currentSentenceIdx === currentSentenceIdx) return prev;
        return { ...prev, currentIdx: index, currentSentenceIdx };
      });
    };
    audio.addEventListener("timeupdate", () => {
      updatePersonaSentenceProgress();
      if (gaplessTriggered || !audio.duration || !isFinite(audio.duration)) return;
      const remaining = (audio.duration - audio.currentTime) / playbackRateRef.current;
      if (remaining < 0.15 && remaining > 0) {
        gaplessTriggered = true;
        if (nextAudioElementPromise) {
          nextAudioElementPromise.then((nextAudio) => {
            if (nextAudio && playbackSessionRef.current === sessionId) {
              nextAudio.muted = false;
              nextAudio.playbackRate = playbackRateRef.current;
            }
          }).catch(() => {
          });
        }
      }
    });
    const playPromise = audio.play();
    if (playPromise !== void 0) {
      playPromise.then(() => {
        if (!isPaused) setIsPlaying(true);
        setIsGeneratingAudio(false);
        if (!usingStoredReadAloud) {
          captureReadAloudClip(contentId, mode, audioStoreSentence, audioUrl);
        }
        const duration = audio.duration;
        if (duration && isFinite(duration)) {
          const safeDuration = duration * 1e3 / playbackRateRef.current;
          watchdogTimer = setTimeout(() => {
            warnLog(`Watchdog triggered for segment ${index}`);
            if (playbackSessionRef.current === sessionId && audioRef.current === audio) {
              audio.pause();
              audio.onended();
            }
          }, safeDuration + 2e3);
        }
      }).catch((error) => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
        if (error.name !== "AbortError") {
          handlePlaybackError(error);
        }
      });
    }
  } catch (err) {
    if (playbackSessionRef.current === sessionId) {
      if (err.message && err.message.includes("finishReason: OTHER")) {
        setTimeout(() => {
          playSequence2(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1, speakerName, deps, contentId);
        }, 500);
      } else {
        warnLog("Critical Playback Error:", err);
        if (retryCount < 2) {
          setTimeout(() => {
            playSequence2(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1, speakerName, deps, contentId);
          }, 500);
        } else {
          playSequence2(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker, null, 0, speakerName, deps, contentId);
        }
      }
    }
  }
};
const handleSpeak = async (text, contentId, startIndex = 0, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleSpeak fired");
  } catch (_) {
  }
  const now = Date.now();
  if (contentId && lastHandleSpeakRef.current && contentId === lastHandleSpeakRef.current.id && startIndex === lastHandleSpeakRef.current.index && now - lastHandleSpeakRef.current.time < 250) {
    warnLog("Debouncing duplicate handleSpeak call");
    return;
  }
  lastHandleSpeakRef.current = { id: contentId, index: startIndex, time: now };
  console.log("[handleSpeak] Called with:", { contentId, textLen: text?.length, startIndex });
  if (recognitionRef.current) {
    recognitionRef.current.abort();
  }
  isPlayingRef.current = true;
  isSystemAudioActiveRef.current = true;
  if (typeof pendingSpeechTimerRef !== "undefined" && pendingSpeechTimerRef?.current) {
    clearTimeout(pendingSpeechTimerRef.current);
    pendingSpeechTimerRef.current = null;
  }
  if (alloBotRef.current && alloBotRef.current.stopSpeaking) {
    alloBotRef.current.stopSpeaking();
  }
  window.speechSynthesis.cancel();
  if (audioRef.current || playingContentId) {
    const wasPlayingThis = playingContentId === contentId;
    stopPlayback();
    if (wasPlayingThis && startIndex === 0) {
      return;
    }
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    isPlayingRef.current = true;
    isSystemAudioActiveRef.current = true;
  } else {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }
  if (!text) {
    isPlayingRef.current = false;
    isSystemAudioActiveRef.current = false;
    return;
  }
  const effectiveText = !text.includes(" ") && text.length < 100 ? t(text) : text;
  if (text && text.includes(" ") && text.length < 50 && !isSystemAudioActiveRef.current && !_isCanvasEnv) {
    const parts = text.split(" ").map((w) => w.trim().replace(/[^a-zA-Z]/g, "")).filter((w) => w.length > 2);
    if (parts.length > 1 && parts.length < 5) {
      parts.forEach((part) => {
        if (!internalAudioCache.current.has(part)) {
          callTTS(part, selectedVoice, 1, 2, leveledTextLanguage).then((url) => {
            if (url) internalAudioCache.current.set(part, url);
          }).catch((e) => warnLog("Glossary TTS pre-cache failed:", e?.message || e));
        }
      });
    }
  }
  if (contentId && (contentId.startsWith("term-") || contentId.startsWith("def-"))) {
    if (glossaryAudioCache.current.has(effectiveText)) {
      console.log("[handleSpeak] \u26A1 Glossary CACHE HIT:", effectiveText.substring(0, 30));
      const audio = new Audio(glossaryAudioCache.current.get(effectiveText));
      audio.playbackRate = 0.85;
      setPlayingContentId(contentId);
      setIsPlaying(true);
      isPlayingRef.current = true;
      audio.onended = () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setPlayingContentId(null);
      };
      audio.play().catch((e) => warnLog("Cached playback failed", e));
      return;
    }
  }
  if (contentId && (contentId === "simplified-main" || contentId === "adventure-active" || contentId === "faq-active" || contentId.startsWith("persona-message-"))) {
    let cleanSentences = [];
    const isTable = (p) => p.trim().startsWith("|") || p.includes("\n|");
    const parts = getSideBySideContent(effectiveText);
    if (parts) {
      const sourceSentences = parts.source.flatMap((p) => isTable(p) ? [] : splitTextToSentences(p));
      const targetSentences = parts.target.flatMap((p) => isTable(p) ? [] : splitTextToSentences(p));
      cleanSentences = [...sourceSentences, ...targetSentences];
    } else {
      const paragraphs = effectiveText.split(/\n{2,}/);
      cleanSentences = paragraphs.flatMap((p) => isTable(p) ? [] : splitTextToSentences(p));
    }
    if (contentId === "adventure-active" && adventureState.currentScene && adventureState.currentScene.options) {
      const optionTexts = adventureState.currentScene.options.map(
        (opt) => typeof opt === "object" && opt?.action ? opt.action : typeof opt === "string" ? opt : String(opt)
      );
      cleanSentences = [...cleanSentences, ...optionTexts];
    }
    if (cleanSentences.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    const sessionId = Date.now();
    playbackSessionRef.current = sessionId;
    let personaSpeakerName = null;
    if (contentId.startsWith("persona-message-")) {
      const _msgIdx = parseInt(contentId.replace("persona-message-", ""), 10);
      const _msg = personaState.chatHistory[_msgIdx];
      if (_msg && _msg.speakerName) personaSpeakerName = _msg.speakerName;
    }
    let effectiveStartIndex = startIndex;
    let personaChunkRanges = null;
    let personaChunkWeights = null;
    if (contentId.startsWith("persona-message-")) {
      const _displaySentences = cleanSentences;
      const _chunks = [];
      const _ranges = [];
      const _weights = [];
      let _cur = "";
      let _curStart = 0;
      cleanSentences.forEach((s, i) => {
        if (_cur && _cur.length + s.length + 1 > 280) {
          _chunks.push(_cur);
          _ranges.push([_curStart, i]);
          let total = 0;
          _weights.push(_displaySentences.slice(_curStart, i).map((part) => {
            total += Math.max(1, String(part || "").length);
            return total;
          }));
          _cur = s;
          _curStart = i;
        } else {
          _cur = _cur ? _cur + " " + s : s;
        }
      });
      if (_cur) {
        _chunks.push(_cur);
        _ranges.push([_curStart, cleanSentences.length]);
        let total = 0;
        _weights.push(_displaySentences.slice(_curStart).map((part) => {
          total += Math.max(1, String(part || "").length);
          return total;
        }));
      }
      const _chunkIdx = _ranges.findIndex((r) => startIndex >= r[0] && startIndex < r[1]);
      effectiveStartIndex = _chunkIdx >= 0 ? _chunkIdx : 0;
      personaChunkRanges = _ranges;
      personaChunkWeights = _weights;
      cleanSentences = _chunks;
    }
    setPlayingContentId(contentId);
    setIsPlaying(true);
    setIsPaused(false);
    setPlaybackState({
      sentences: cleanSentences,
      currentIdx: effectiveStartIndex,
      chunkRanges: personaChunkRanges,
      chunkSentenceWeights: personaChunkWeights,
      currentSentenceIdx: personaChunkRanges ? personaChunkRanges[effectiveStartIndex]?.[0] ?? startIndex : effectiveStartIndex
    });
    let mode = "standard";
    let voiceMap = {};
    let activeSpeaker = selectedVoice;
    if (contentId === "adventure-active") {
      mode = "adventure";
      voiceMap = adventureState.voiceMap;
    } else if (textFormat === "Podcast Script" && contentId === "simplified-main") {
      mode = "script";
      voiceMap = { "Alex": "Fenrir", "Sam": "Aoede" };
    } else if (contentId === "faq-active") {
      cleanSentences = [];
      mode = "standard";
      if (generatedContent && generatedContent?.data && Array.isArray(generatedContent?.data)) {
        generatedContent?.data.forEach((item) => {
          if (item.question) cleanSentences.push(...splitTextToSentences(item.question).filter((s) => s.trim().length > 0));
          if (item.answer) cleanSentences.push(...splitTextToSentences(item.answer).filter((s) => s.trim().length > 0));
        });
      } else {
        warnLog("FAQ Data missing in handleSpeak, using raw text fallback");
        if (effectiveText) {
          const sections = effectiveText.split(/\n{2,}/);
          cleanSentences = sections.flatMap((s) => splitTextToSentences(s)).filter((s) => s.trim().length > 0);
        }
      }
    } else if (contentId.startsWith("persona-message-")) {
      mode = "persona";
      const msgIdx = parseInt(contentId.replace("persona-message-", ""), 10);
      const msg = personaState.chatHistory[msgIdx];
      if (msg && msg.role === "model") {
        const isPanelMode = personaState.selectedCharacters && personaState.selectedCharacters.length > 0;
        if (isPanelMode && msg.speakerName) {
          const speakingChar = personaState.selectedCharacters.find((c) => c.name === msg.speakerName);
          if (speakingChar) {
            if (speakingChar.voice) {
              activeSpeaker = speakingChar.voice;
            } else {
              const charHash = speakingChar.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
              activeSpeaker = AVAILABLE_VOICES[charHash % AVAILABLE_VOICES.length];
            }
          } else {
            const fallbackChar = personaState.selectedCharacters[0];
            const charHash = fallbackChar.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            activeSpeaker = AVAILABLE_VOICES[charHash % AVAILABLE_VOICES.length];
          }
        } else if (personaState.selectedCharacter) {
          if (personaState.selectedCharacter.voice) {
            activeSpeaker = personaState.selectedCharacter.voice;
          } else {
            const charName = personaState.selectedCharacter.name;
            const hash = charName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            activeSpeaker = AVAILABLE_VOICES[hash % AVAILABLE_VOICES.length];
          }
        } else {
          activeSpeaker = selectedVoice;
        }
      } else {
        activeSpeaker = selectedVoice;
      }
    }
    console.log("[handleSpeak] Using playSequence(, deps) - mode:", mode, "sentences:", cleanSentences.length, "speaker:", personaSpeakerName);
    playSequence2(effectiveStartIndex, cleanSentences, sessionId, mode, voiceMap, activeSpeaker, null, 0, personaSpeakerName, deps, contentId);
  } else {
    setIsGeneratingAudio(true);
    setPlayingContentId(contentId);
    try {
      const _ttsLang = contentId && String(contentId).startsWith("persona-translation-") ? "English" : leveledTextLanguage;
      const audioUrl = await callTTS(effectiveText, selectedVoice, 1, 2, _ttsLang);
      addBlobUrl(audioUrl);
      const audio = new Audio(audioUrl);
      if (contentId && (contentId.startsWith("term-") || contentId.startsWith("def-"))) {
        audio.playbackRate = 0.85;
      }
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setPlayingContentId(null);
        URL.revokeObjectURL(audioUrl);
        activeBlobUrlsRef.current.delete(audioUrl);
      };
      const playPromise = audio.play();
      if (playPromise !== void 0) {
        playPromise.catch((error) => {
          if (error.name !== "AbortError") {
            warnLog("Audio play failed:", error);
          }
          if (error.name !== "AbortError") {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setPlayingContentId(null);
          }
        });
      }
      setIsPlaying(true);
    } catch (err) {
      setError(t("errors.speech_generation_failed"));
      setIsPlaying(false);
      isPlayingRef.current = false;
      setPlayingContentId(null);
    } finally {
      setIsGeneratingAudio(false);
    }
  }
};
const syncProgressToFirestore = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] syncProgressToFirestore fired");
  } catch (_) {
  }
  if (isCanvas) return;
  if (!activeSessionCode || !studentNickname) return;
  try {
    setIsProgressSyncing(true);
    const safeId = studentNickname.replace(/[^a-zA-Z0-9_-]/g, "_");
    const progressRef = doc(db, "artifacts", appId, "public", "data", "sessions", activeSessionCode, "studentProgress", safeId);
    const quizAvg = (() => {
      const quizItems = history.filter((h) => h.type === "quiz");
      let total = 0, count = 0;
      quizItems.forEach((quiz) => {
        const questions = quiz.data?.questions || [];
        if (!questions.length) return;
        let correct = 0;
        const resps = studentResponses[quiz.id] || {};
        questions.forEach((q, i) => {
          const resp = resps[i];
          if (resp != null) {
            let val = resp;
            if (!isNaN(parseInt(resp)) && q.options?.[resp]) val = q.options[resp];
            if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
          }
        });
        total += correct / questions.length * 100;
        count++;
      });
      return count > 0 ? Math.round(total / count) : 0;
    })();
    const wsAcc = wordSoundsHistory?.length > 0 ? Math.round(wordSoundsHistory.filter((h) => h.correct).length / wordSoundsHistory.length * 100) : 0;
    const progressData = {
      studentNickname,
      lastSynced: (/* @__PURE__ */ new Date()).toISOString(),
      stats: {
        quizAvg,
        wsAccuracy: wsAcc,
        fluencyWCPM: fluencyAssessments?.length > 0 ? fluencyAssessments[fluencyAssessments.length - 1]?.wcpm || 0 : 0,
        gamesPlayed: gameCompletions?.length || 0,
        totalActivities: (history?.length || 0) + (wordSoundsHistory?.length > 0 ? 1 : 0) + (gameCompletions?.length || 0),
        labelChallengeAvg: labelChallengeResults?.length > 0 ? Math.round(labelChallengeResults.reduce((a, b) => a + (b.score || 0), 0) / labelChallengeResults.length) : 0,
        globalPoints: globalPoints || 0,
        wsWordsCompleted: wordSoundsHistory?.filter((h) => h.correct)?.length || 0,
        focusRatio: getFocusRatio(),
        engagedMinutes: focusData.engagedMinutes || 0,
        idleMinutes: focusData.idleMinutes || 0,
        focusStreak: focusData.longestStreak || 0,
        pasteEventCount: pasteEvents.length,
        pasteEventResponseCount: (pasteEvents || []).filter((e) => e && e.isResponseField).length,
        storyForgeSubmissions: history.filter((h) => h.type === "storyforge-submission").length,
        storyForgeLatest: (() => {
          const sf = history.filter((h) => h.type === "storyforge-submission").pop();
          return sf ? { title: sf.data?.storyTitle, words: sf.data?.analytics?.totalWords, vocab: sf.data?.analytics?.vocabUsedCount, grade: sf.data?.analytics?.readingLevel?.grade, drafts: sf.data?.analytics?.draftCount } : null;
        })(),
        dbqProgress: (() => {
          try {
            const dbqItems = history.filter((h) => h.type === "dbq");
            if (dbqItems.length === 0) return null;
            const latest = dbqItems[dbqItems.length - 1];
            const resps = studentResponses[latest.id] || {};
            const happNotes = resps._happNotes || {};
            const docs = latest.data?.documents || [];
            const docsAnalyzed = docs.filter((d) => {
              const dh = happNotes[d.id] || {};
              return ["historical", "audience", "purpose", "pointOfView"].some((k) => dh[k]?.trim());
            }).length;
            const hasFeedback = docs.some((d) => resps[`_docFeedback_${d.id}`] && typeof resps[`_docFeedback_${d.id}`] === "object");
            const essayWords = (resps._essayText || "").split(/\s+/).filter(Boolean).length;
            const essayFeedback = resps._aiFeedback && typeof resps._aiFeedback === "object" ? resps._aiFeedback.overallScore : null;
            return { title: latest.data?.title, totalDocs: docs.length, docsAnalyzed, hasFeedback, essayWords, essayScore: essayFeedback };
          } catch (e) {
            return null;
          }
        })()
      },
      focusData: {
        engagedMinutes: focusData.engagedMinutes || 0,
        idleMinutes: focusData.idleMinutes || 0,
        focusRatio: getFocusRatio(),
        currentStreak: focusData.currentStreak || 0,
        longestStreak: focusData.longestStreak || 0
      },
      pasteEvents: pasteEvents.slice(-20),
      fluencyHistory: (fluencyAssessments || []).slice(-10).map((a) => ({ wcpm: a.wcpm, date: a.timestamp || a.date })),
      gameScoreHistory: (gameCompletions || []).slice(-10).map((g) => ({ score: g.score, game: g.game, date: g.timestamp || g.date })),
      flagSummary: (() => {
        try {
          const allText = [];
          if (typeof socraticChatHistory !== "undefined" && socraticChatHistory?.messages) {
            socraticChatHistory.messages.filter((m) => m.role === "user").forEach((m) => allText.push(m.text || m.content || ""));
          }
          const flags = allText.flatMap((t2) => SafetyContentChecker.check(t2));
          const summary = {};
          flags.forEach((f) => {
            summary[f.category] = (summary[f.category] || 0) + 1;
          });
          if (typeof aiSafetyFlags !== "undefined" && aiSafetyFlags.length > 0) {
            aiSafetyFlags.forEach((f) => {
              summary[f.category] = (summary[f.category] || 0) + 1;
              flags.push(f);
            });
          }
          return { total: flags.length, categories: summary, hasCritical: flags.some((f) => f.severity === "critical") };
        } catch (e) {
          return { total: 0, categories: {}, hasCritical: false };
        }
      })()
    };
    await setDoc(progressRef, progressData, { merge: true });
    setLastProgressSync(/* @__PURE__ */ new Date());
    debugLog("[ProgressSync] Synced to Firestore for", studentNickname);
  } catch (err) {
    warnLog("[ProgressSync] Firestore sync failed:", err.message);
  } finally {
    setIsProgressSyncing(false);
  }
};
const buildStudentProgressSummary = ({
  history = [],
  studentResponses = {},
  studentNickname = "",
  currentLog = [],
  adventureState = {},
  escapeRoomState = {},
  gameCompletions = {},
  labelChallengeResults = [],
  wordSoundsHistory = [],
  wordSoundsScore = {},
  wordSoundsBadges = {},
  wordSoundsDailyProgress = {},
  fluencyAssessments = [],
  flashcardEngagement = {},
  timeOnTask = {},
  globalPoints = 0,
  pointHistory = [],
  completedActivities = null,
  focusData = {},
  pasteEvents = [],
  selEngagement = null,
  selStations = null,
  selProgress = null,
  selSnapshots = null,
  selToolData = null,
  getFocusRatio
} = {}) => {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const asArray = (value) => Array.isArray(value) ? value : [];
  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  studentResponses = studentResponses || {};
  adventureState = adventureState || {};
  escapeRoomState = escapeRoomState || {};
  focusData = focusData || {};
  timeOnTask = timeOnTask || {};
  wordSoundsScore = wordSoundsScore || {};
  wordSoundsBadges = wordSoundsBadges || {};
  wordSoundsDailyProgress = wordSoundsDailyProgress || {};
  const quizItems = asArray(history).filter((h) => h && h.type === "quiz");
  let quizTotal = 0;
  let quizCount = 0;
  quizItems.forEach((quiz) => {
    const questions = quiz.data?.questions || [];
    if (!questions.length) return;
    let correct = 0;
    const studentResps = studentResponses[quiz.id] || {};
    questions.forEach((q, i) => {
      const resp = studentResps[i];
      if (resp === void 0 || resp === null) return;
      let val = resp;
      if (!isNaN(parseInt(resp)) && q.options && q.options[resp]) val = q.options[resp];
      if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
    });
    quizTotal += correct / questions.length * 100;
    quizCount++;
  });
  const quizAverage = quizCount > 0 ? Math.round(quizTotal / quizCount) : 0;
  const completedCount = completedActivities instanceof Map ? completedActivities.size : Array.isArray(completedActivities) ? completedActivities.length : completedActivities && typeof completedActivities === "object" ? Object.keys(completedActivities).length : 0;
  let gamesPlayed = 0;
  if (Array.isArray(gameCompletions)) {
    gamesPlayed = gameCompletions.length;
  } else if (gameCompletions && typeof gameCompletions === "object") {
    Object.keys(gameCompletions).forEach((key) => {
      const entries = gameCompletions[key];
      gamesPlayed += Array.isArray(entries) ? entries.length : entries ? 1 : 0;
    });
  }
  const labelScores = asArray(labelChallengeResults).map((r) => toNumber(r && r.score)).filter((n) => n > 0);
  const labelAverage = labelScores.length ? Math.round(labelScores.reduce((a, b) => a + b, 0) / labelScores.length) : 0;
  const latestFluency = asArray(fluencyAssessments)[asArray(fluencyAssessments).length - 1] || null;
  const wsHistory = asArray(wordSoundsHistory);
  const wsTotal = toNumber(wordSoundsScore.total) || wsHistory.length;
  const wsCorrect = toNumber(wordSoundsScore.correct) || wsHistory.filter((item) => item && (item.correct || item.isCorrect)).length;
  const wordSoundsAccuracy = wsTotal > 0 ? Math.round(wsCorrect / wsTotal * 100) : 0;
  let focusRatio = null;
  try {
    if (typeof getFocusRatio === "function") focusRatio = getFocusRatio();
  } catch (e) {
    focusRatio = null;
  }
  if (focusRatio === null || focusRatio === void 0 || !Number.isFinite(Number(focusRatio))) {
    const engaged = toNumber(focusData.engagedMinutes);
    const idle = toNumber(focusData.idleMinutes);
    focusRatio = engaged + idle > 0 ? Math.round(engaged / (engaged + idle) * 100) : null;
  }
  const selToolUsage = selEngagement && typeof selEngagement === "object" && selEngagement.toolUsage ? selEngagement.toolUsage : {};
  const selToolStateCount = selToolData && typeof selToolData === "object" ? Object.keys(selToolData).length : 0;
  const selToolsUsed = Math.max(
    selToolStateCount,
    Object.keys(selToolUsage || {}).filter((toolId) => {
      const usage = selToolUsage[toolId];
      return usage && (usage.count > 0 || usage.visits > 0 || usage.lastUsed);
    }).length
  );
  const selSnapshotCount = Array.isArray(selSnapshots) ? selSnapshots.length : 0;
  const stationList = Array.isArray(selStations) ? selStations : selStations && typeof selStations === "object" ? Object.values(selStations) : [];
  let stationQuestTotal = 0;
  let stationQuestComplete = 0;
  stationList.forEach((station) => {
    const quests = Array.isArray(station && station.quests) ? station.quests : [];
    stationQuestTotal += quests.length;
    const stationId = station && (station.id || station.stationId || station.title);
    const stationState = stationId && selProgress && typeof selProgress === "object" ? selProgress[stationId] || {} : {};
    quests.forEach((quest) => {
      const questId = quest && (quest.qid || quest.id || quest.key || quest.title);
      const questState = questId && stationState ? stationState[questId] : null;
      if (questState && (questState.complete || questState.completed || questState.manualComplete || questState.completedAt)) {
        stationQuestComplete++;
      }
    });
  });
  const latestSelToolAt = Object.keys(selToolUsage || {}).reduce((latest, toolId) => {
    const stamp = selToolUsage[toolId] && selToolUsage[toolId].lastUsed;
    return stamp && (!latest || String(stamp).localeCompare(String(latest)) > 0) ? stamp : latest;
  }, null);
  const totalActivities = Math.max(
    completedCount,
    asArray(history).length + asArray(fluencyAssessments).length + gamesPlayed + labelScores.length + (wsTotal > 0 ? 1 : 0) + selSnapshotCount + stationQuestComplete
  );
  const escapePuzzles = toNumber(escapeRoomState.puzzles?.length || escapeRoomState.totalPuzzles);
  const escapeSolved = toNumber(Object.values(escapeRoomState.solvedPuzzles || {}).filter(Boolean).length || escapeRoomState.puzzlesSolved);
  return {
    version: 1,
    generatedAt: nowIso,
    studentNickname: studentNickname || "",
    source: "alloflow-project-save",
    privacy: {
      summaryIncludesRawSelText: false,
      note: "This summary stores counts and totals only; saved tool artifacts may still exist elsewhere in the project file."
    },
    overview: {
      totalActivities,
      resourcesCreated: asArray(history).length,
      completedActivities: completedCount,
      globalPoints: toNumber(globalPoints),
      progressEntries: asArray(currentLog).length,
      pointEvents: asArray(pointHistory).length
    },
    academic: {
      quizAverage,
      quizCount,
      wordSoundsWords: wsTotal,
      wordSoundsAccuracy,
      wordSoundsBestStreak: toNumber(wordSoundsScore.streak),
      wordSoundsBadges: wordSoundsBadges && typeof wordSoundsBadges === "object" ? Object.keys(wordSoundsBadges).length : 0,
      wordSoundsPracticeDays: wordSoundsDailyProgress && typeof wordSoundsDailyProgress === "object" ? Object.keys(wordSoundsDailyProgress).length : 0,
      fluencyWCPM: toNumber(latestFluency && latestFluency.wcpm),
      fluencyAssessments: asArray(fluencyAssessments).length,
      flashcardSessions: Array.isArray(flashcardEngagement?.sessions) ? flashcardEngagement.sessions.length : toNumber(flashcardEngagement?.sessions)
    },
    sel: {
      toolsUsed: selToolsUsed,
      reflectionSnapshots: selSnapshotCount,
      stations: stationList.length,
      stationQuestsComplete: stationQuestComplete,
      stationQuestsTotal: stationQuestTotal,
      toolStateCount: selToolStateCount,
      streakDays: toNumber(selEngagement?.streak?.days || selEngagement?.streak?.count),
      latestToolAt: latestSelToolAt
    },
    engagement: {
      focusRatio,
      engagedMinutes: toNumber(focusData.engagedMinutes),
      idleMinutes: toNumber(focusData.idleMinutes),
      currentStreak: toNumber(focusData.currentStreak),
      longestStreak: toNumber(focusData.longestStreak),
      pasteEventCount: asArray(pasteEvents).length,
      pasteEventResponseCount: asArray(pasteEvents).filter((e) => e && e.isResponseField).length,
      timeOnTaskMinutes: toNumber(timeOnTask.totalSessionMinutes || timeOnTask.minutes)
    },
    gameplay: {
      adventureXP: toNumber(adventureState.xp || globalPoints),
      adventureLevel: toNumber(adventureState.level || 1),
      adventureEnergy: toNumber(adventureState.energy),
      escapeCompletion: escapePuzzles > 0 ? Math.round(escapeSolved / escapePuzzles * 100) : 0,
      gamesPlayed,
      labelChallengeAverage: labelAverage,
      labelChallengeAttempts: labelScores.length
    },
    recent: {
      lastSavedAt: nowIso,
      lastProgressAt: asArray(currentLog).length ? currentLog[currentLog.length - 1].timestamp || null : null,
      recentActivityTypes: asArray(history).slice(-5).map((item) => item && (item.type || item.kind || "activity")).filter(Boolean)
    }
  };
};
const executeSaveFile = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers, conceptMasteryLocal, user } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] executeSaveFile fired");
  } catch (_) {
  }
  if (!saveFileName.trim()) return;
  let currentLog = [...studentProgressLog];
  if (saveType === "student") {
    const quizItems = history.filter((h) => h.type === "quiz");
    let totalScore = 0;
    let count = 0;
    quizItems.forEach((quiz) => {
      const questions = quiz.data?.questions || [];
      if (!questions.length) return;
      let correct = 0;
      const studentResps = studentResponses[quiz.id] || {};
      questions.forEach((q, i) => {
        const resp = studentResps[i];
        if (resp !== void 0 && resp !== null) {
          let val = resp;
          if (!isNaN(parseInt(resp)) && q.options && q.options[resp]) val = q.options[resp];
          if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
        }
      });
      const qScore = correct / questions.length * 100;
      totalScore += qScore;
      count++;
    });
    const avgQuiz = count > 0 ? Math.round(totalScore / count) : 0;
    const newLogEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      xp: globalPoints,
      level: adventureState.level,
      energy: adventureState.energy,
      quizAverage: avgQuiz,
      resourcesCreated: history.length
    };
    const lastEntry = currentLog[currentLog.length - 1];
    if (lastEntry && /* @__PURE__ */ new Date() - new Date(lastEntry.timestamp) < 6e4) {
      currentLog[currentLog.length - 1] = newLogEntry;
    } else {
      currentLog.push(newLogEntry);
    }
    setStudentProgressLog(currentLog);
  }
  const filename = saveFileName.trim().endsWith(".json") ? saveFileName.trim() : `${saveFileName.trim()}.json`;
  let dataStr = "";
  const selEngagement = typeof window !== "undefined" && window.__alloflowSelEngagement || null;
  const birdLab = typeof window !== "undefined" && window.__alloflowBirdLab || null;
  const petsLab = typeof window !== "undefined" && window.__alloflowPetsLab || null;
  const opticsLab = typeof window !== "undefined" && window.__alloflowOpticsLab || null;
  const statsLab = typeof window !== "undefined" && window.__alloflowStatsLab || null;
  const weldLab = typeof window !== "undefined" && window.__alloflowWeldLab || null;
  const renewablesLab = typeof window !== "undefined" && window.__alloflowRenewablesLab || null;
  const firstResponse = typeof window !== "undefined" && window.__alloflowFirstResponse || null;
  const throwlab = typeof window !== "undefined" && window.__alloflowThrowLab || null;
  const playlab = typeof window !== "undefined" && window.__alloflowPlayLab || null;
  const roadReady = typeof window !== "undefined" && window.__alloflowRoadReady || null;
  const assessmentLiteracy = typeof window !== "undefined" && window.__alloflowAssessmentLiteracy || null;
  const selStations = typeof window !== "undefined" && window.__alloflowSelStations || null;
  const selProgress = typeof window !== "undefined" && window.__alloflowSelProgress || null;
  const selToolData = typeof window !== "undefined" && window.__alloflowSelToolData || null;
  const selSnapshots = typeof window !== "undefined" && window.__alloflowSelSnapshots || null;
  const studentArtifacts = typeof window !== "undefined" && window.__alloflowStudentArtifacts || null;
  const studentProgressSummary = buildStudentProgressSummary({
    history,
    studentResponses,
    studentNickname,
    currentLog,
    adventureState,
    escapeRoomState,
    gameCompletions,
    labelChallengeResults,
    wordSoundsHistory,
    wordSoundsScore,
    wordSoundsBadges,
    wordSoundsDailyProgress,
    fluencyAssessments,
    flashcardEngagement,
    timeOnTask,
    globalPoints,
    pointHistory,
    completedActivities,
    focusData,
    pasteEvents,
    selEngagement,
    selStations,
    selProgress,
    selSnapshots,
    selToolData,
    getFocusRatio
  });
  if (saveType === "teacher") {
    dataStr = JSON.stringify({
      mode: isIndependentMode ? "independent" : "teacher",
      // Educator continuity: guided-tour resume point rides the project file
      // (Canvas wipes origin storage between sessions). null unless in guided mode.
      guidedTourProgress: deps.guidedTourProgress || null,
      // Versioned, history-bound, sanitized WYSIWYG edits from the
      // Document Builder. Student files intentionally omit this
      // teacher-authoring surface.
      builderDraft: deps.builderDraft || null,
      history,
      timestamp: /* @__PURE__ */ new Date(),
      progressLog: studentProgressLog,
      responses: studentResponses,
      studentNickname,
      probeHistory,
      interventionLogs,
      surveyResponses,
      fidelityLog,
      sessionCounter,
      externalCBMScores,
      selEngagement,
      birdLab,
      petsLab,
      opticsLab,
      statsLab,
      weldLab,
      renewablesLab,
      firstResponse,
      throwlab,
      playlab,
      roadReady,
      assessmentLiteracy,
      selStations,
      selProgress,
      selToolData,
      selSnapshots,
      studentProgressSummary,
      studentArtifacts: Array.isArray(studentArtifacts) ? studentArtifacts : [],
      // Word Sounds session data previously rode ONLY the student-mode
      // save, so a teacher/interventionist running Word Sounds on the
      // teacher device (the common K-2 RTI setup) lost history, phoneme
      // mastery, and confusion patterns on save→load. Same shape as the
      // student branch below; the load side restores it for both modes.
      wordSoundsState: {
        history: wordSoundsHistory,
        badges: wordSoundsBadges,
        phonemeMastery,
        dailyProgress: wordSoundsDailyProgress,
        confusionPatterns: wordSoundsConfusionPatterns,
        families: wordSoundsFamilies,
        audioLibrary: wordSoundsAudioLibrary,
        sessionScore: wordSoundsScore
      },
      // Stickers (annotation overlays placed on the output area) ride
      // the project JSON so a teacher's feedback / a student's marks
      // survive save→load. Without this they're wiped on reload.
      stickers: Array.isArray(stickers) ? stickers : []
    }, null, 2);
  } else {
    const studentHistory = history.filter((item) => !["udl-advice", "brainstorm"].includes(item.type));
    dataStr = JSON.stringify({
      mode: "student",
      studentNickname,
      history: studentHistory,
      responses: studentResponses,
      settings: {
        ...studentProjectSettings,
        researchMode: Boolean(studentProjectSettings && studentProjectSettings.researchMode),
        defaultAdventureConfig: {
          difficulty: adventureDifficulty,
          mode: adventureInputMode,
          language: adventureLanguageMode,
          instructions: adventureCustomInstructions,
          chanceMode: adventureChanceMode,
          freeResponse: adventureFreeResponseEnabled
        }
      },
      adventureSnapshot: adventureState.turnCount > 0 || adventureState.xp > 0 ? {
        xp: adventureState.xp,
        gold: adventureState.gold,
        energy: adventureState.energy,
        level: adventureState.level,
        xpToNextLevel: adventureState.xpToNextLevel,
        inventory: adventureState.inventory || [],
        narrativeLedger: adventureState.narrativeLedger || "",
        stats: adventureState.stats,
        currentScene: adventureState.currentScene,
        history: adventureState.history || [],
        turnCount: adventureState.turnCount || 0,
        climax: adventureState.climax,
        debateMomentum: adventureState.debateMomentum,
        missionReportDismissed: adventureState.missionReportDismissed,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      } : null,
      escapeRoomStats: escapeRoomState.isEscaped || escapeRoomState.totalXpEarned > 0 ? {
        xpEarned: escapeRoomState.totalXpEarned || 0,
        timeTaken: escapeRoomState.timeElapsed || 0,
        puzzlesSolved: Object.values(escapeRoomState.solvedPuzzles || {}).filter(Boolean).length,
        totalPuzzles: escapeRoomState.puzzles?.length || 0,
        wrongAttempts: escapeRoomState.wrongAttempts || 0,
        hintsUsed: escapeRoomState.hintsRevealed?.length || 0,
        difficulty: escapeRoomState.difficulty || "normal",
        completedAt: escapeRoomState.isEscaped ? (/* @__PURE__ */ new Date()).toISOString() : null
      } : null,
      gameCompletions,
      labelChallengeResults,
      socraticChatHistory: socraticMessages.length > 0 ? {
        messages: socraticMessages,
        messageCount: socraticMessages.length,
        savedAt: (/* @__PURE__ */ new Date()).toISOString()
      } : null,
      wordSoundsState: {
        history: wordSoundsHistory,
        badges: wordSoundsBadges,
        phonemeMastery,
        dailyProgress: wordSoundsDailyProgress,
        confusionPatterns: wordSoundsConfusionPatterns,
        families: wordSoundsFamilies,
        audioLibrary: wordSoundsAudioLibrary,
        sessionScore: wordSoundsScore
      },
      // Device-local concept mastery travels WITH the student's file
      // (FERPA model: user-controlled sharing, never cloud-synced).
      // uid lets the teacher's retention dashboard re-key an imported
      // file to the student's live-session roster entry.
      conceptMastery: conceptMasteryLocal && conceptMasteryLocal.attempts && Object.keys(conceptMasteryLocal.attempts).length > 0 ? {
        uid: user && user.uid || null,
        nickname: studentNickname || null,
        savedAt: (/* @__PURE__ */ new Date()).toISOString(),
        attempts: conceptMasteryLocal.attempts
      } : null,
      fluencyAssessments,
      flashcardEngagement,
      timeOnTask,
      globalPoints,
      pointHistory,
      completedActivities: Array.from(completedActivities.entries()),
      progressLog: currentLog,
      probeHistory,
      interventionLogs,
      surveyResponses,
      fidelityLog,
      sessionCounter,
      externalCBMScores,
      selEngagement,
      birdLab,
      petsLab,
      opticsLab,
      statsLab,
      weldLab,
      renewablesLab,
      firstResponse,
      throwlab,
      playlab,
      roadReady,
      assessmentLiteracy,
      selStations,
      selProgress,
      selToolData,
      selSnapshots,
      studentProgressSummary,
      studentArtifacts: Array.isArray(studentArtifacts) ? studentArtifacts : [],
      // See teacher-save above — stickers persist with the project so
      // a student's marks aren't wiped on reload.
      stickers: Array.isArray(stickers) ? stickers : [],
      timestamp: /* @__PURE__ */ new Date()
    }, null, 2);
    if (adventureState.turnCount > 0 || adventureState.xp > 0) {
      addToast(t("student.adventure_saved"), "info");
    }
  }
  let outName = filename;
  const _hasVoice = dataStr.indexOf("data:audio") !== -1 || /"audioRecording"\s*:\s*"/.test(dataStr) || /"human-student"/.test(dataStr);
  const _hasSelText = /"selToolData"\s*:\s*\{\s*"/.test(dataStr) || /"selProgress"\s*:\s*\{\s*"/.test(dataStr) || /"selSnapshots"\s*:\s*\[\s*\{/.test(dataStr) || /"studentArtifacts"\s*:\s*\[\s*\{/.test(dataStr);
  if (_hasVoice || _hasSelText) {
    const _msg = _hasVoice ? "This project file contains a student's voice recording (an Oral Fluency read-aloud, a karaoke practice recording, and/or an SEL voice check-in). A recorded voice is identifiable, FERPA-protected student data.\n\nThe file uses the student's codename (not a real name), but save it only to a school-approved, encrypted location \u2014 don't email it or put it in personal cloud storage.\n\nSave anyway?" : "This project file includes SEL activity data, which can contain a student's reflections, journal entries, or safety plan \u2014 identifiable, FERPA-protected student data.\n\nThe file uses the student's codename (not a real name), but save it only to a school-approved, encrypted location \u2014 don't email it or put it in personal cloud storage.\n\nSave anyway?";
    const _ok = typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(_msg) : true;
    if (!_ok) {
      try {
        addToast(t("toasts.save_cancelled") || "Save cancelled.", "info");
      } catch (_) {
      }
      return;
    }
    if (!/CONFIDENTIAL/i.test(outName)) {
      const _dot = outName.lastIndexOf(".");
      outName = _dot > 0 ? outName.slice(0, _dot) + "_CONFIDENTIAL" + outName.slice(_dot) : outName + "_CONFIDENTIAL";
    }
  }
  if (deps.saveEncryptPassword && window.AlloModules && window.AlloModules.AlloCrypto) {
    try {
      const _env = await window.AlloModules.AlloCrypto.encryptJSON(JSON.parse(dataStr), deps.saveEncryptPassword);
      dataStr = JSON.stringify(_env);
      if (!/\.enc(\.|$)/i.test(outName)) {
        const _d = outName.lastIndexOf(".");
        outName = _d > 0 ? outName.slice(0, _d) + ".enc" + outName.slice(_d) : outName + ".enc";
      }
    } catch (_e) {
      try {
        addToast(t("save.encrypt_failed") || "Could not encrypt the file. Save cancelled.", "error");
      } catch (__) {
      }
      return;
    }
  }
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = outName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  addToast(`Project saved as ${outName}`, "success");
  setLastJsonFileSave(Date.now());
  setIsSaveActionPulsing(false);
  setShowSaveModal(false);
};
const formatInlineText = (text, enableGlossary = true, isDarkBg = false, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] formatInlineText fired");
  } catch (_) {
  }
  if (!text) return null;
  if (typeof text !== "string") {
    warnLog("formatInlineText received non-string:", text);
    return String(text);
  }
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\[.*?\]\(resource:.*?\)|\[.*?\]\(.*?\)|https?:\/\/[^\s"']+(?<![.,;)])|`[^`]*`|\*\*.*?\*\*|\*.*?\*|==.*?==)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith("$") && part.endsWith("$") || part.startsWith("$$") && part.endsWith("$$")) {
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: pIdx }, /* @__PURE__ */ React.createElement(MathSymbol, { text: part }));
    }
    const resourceMatch = part.match(/^\[(.*?)\]\(resource:(.*?)\)$/);
    if (resourceMatch) {
      const label = resourceMatch[1];
      const resourceId = resourceMatch[2];
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.open_in_new_tab"),
          key: pIdx,
          onClick: (e) => {
            e.stopPropagation();
            const targetItem = history.find((h) => h.id === resourceId);
            if (targetItem) {
              handleRestoreView(targetItem);
              addToast(`Jumped to: ${targetItem.title || getDefaultTitle(targetItem.type)}`, "success");
            } else {
              addToast(t("toasts.resource_not_found_history"), "error");
            }
          },
          className: "text-indigo-600 font-bold hover:underline bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 align-baseline border border-indigo-200 mx-1 text-xs transition-colors hover:bg-indigo-100",
          title: t("common.click_to_open")
        },
        /* @__PURE__ */ React.createElement(ExternalLink, { size: 10 }),
        " ",
        label
      );
    }
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const label = match[1];
        const url = match[2];
        if (url.startsWith("resource:")) {
          const resourceId = url.split(":")[1];
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              "aria-label": t("common.open_in_new_tab"),
              key: pIdx,
              onClick: (e) => {
                e.stopPropagation();
                const targetItem = history.find((h) => h.id === resourceId);
                if (targetItem) {
                  handleRestoreView(targetItem);
                  addToast(`Jumped to: ${targetItem.title || getDefaultTitle(targetItem.type)}`, "success");
                } else {
                  addToast(t("toasts.resource_not_found"), "error");
                }
              },
              className: "text-indigo-600 font-bold hover:underline bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 align-baseline border border-indigo-200 mx-1 text-xs transition-colors hover:bg-indigo-100",
              title: t("common.click_to_open")
            },
            /* @__PURE__ */ React.createElement(ExternalLink, { size: 10 }),
            " ",
            label
          );
        }
        const isCitation = match[1].startsWith("\u207D") && match[1].endsWith("\u207E");
        return /* @__PURE__ */ React.createElement(
          "a",
          {
            key: pIdx,
            href: match[2],
            target: "_blank",
            rel: "noopener noreferrer",
            className: `text-blue-600 ${isCitation ? "no-underline" : "underline"} hover:text-blue-800 z-20 relative font-medium`,
            role: "dialog",
            "aria-modal": "true",
            onClick: (e) => e.stopPropagation()
          },
          match[1]
        );
      }
    }
    if (part.match(/^https?:\/\//)) {
      let displayText = part;
      if (part.includes("vertexaisearch") || part.includes("grounding-api")) {
        displayText = "[Source Ref]";
      } else if (part.length > 40) {
        try {
          const urlObj = new URL(part);
          displayText = urlObj.hostname + (urlObj.pathname.length > 1 ? "/..." : "");
        } catch (e) {
          displayText = part.substring(0, 30) + "...";
        }
      }
      return /* @__PURE__ */ React.createElement(
        "a",
        {
          key: pIdx,
          href: part,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "text-blue-600 underline hover:text-blue-800 z-20 relative break-all cursor-pointer",
          role: "dialog",
          "aria-modal": "true",
          onClick: (e) => e.stopPropagation(),
          title: part
        },
        displayText
      );
    }
    const isBold = part.startsWith("**") && part.endsWith("**");
    const isItalic = part.startsWith("*") && part.endsWith("*");
    const isHighlight = part.startsWith("==") && part.endsWith("==");
    const isCode = part.startsWith("`") && part.endsWith("`");
    let content = part;
    if (isBold) content = part.slice(2, -2);
    else if (isItalic) content = part.slice(1, -1);
    else if (isHighlight) content = part.slice(2, -2);
    else if (isCode) content = part.slice(1, -1);
    const subParts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);
    const renderedSubParts = subParts.filter((sp) => sp != null).map((subPart, sIdx) => {
      if (subPart.startsWith("$") && subPart.endsWith("$") || subPart.startsWith("$$") && subPart.endsWith("$$")) {
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, /* @__PURE__ */ React.createElement(MathSymbol, { text: subPart }));
      }
      if (enableGlossary) {
        const glossed = highlightGlossaryTerms(subPart, latestGlossary, false, isDarkBg);
        if (focusMode) {
          if (Array.isArray(glossed)) {
            return glossed.map((g, gIdx) => {
              if (typeof g === "string") return /* @__PURE__ */ React.createElement(React.Fragment, { key: gIdx }, toFocusText(g));
              return /* @__PURE__ */ React.createElement(React.Fragment, { key: gIdx }, g);
            });
          } else if (typeof glossed === "string") {
            return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, toFocusText(glossed));
          }
        }
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, glossed);
      } else {
        if (focusMode) {
          return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, toFocusText(subPart));
        }
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, subPart);
      }
    });
    if (isBold) {
      return /* @__PURE__ */ React.createElement("strong", { key: pIdx, className: `font-bold ${isDarkBg ? "text-white" : "text-indigo-900"}` }, renderedSubParts);
    }
    if (isItalic) {
      return /* @__PURE__ */ React.createElement("em", { key: pIdx, className: `italic ${isDarkBg ? "text-indigo-200" : "text-indigo-800"}` }, renderedSubParts);
    }
    if (isHighlight) {
      return /* @__PURE__ */ React.createElement("mark", { key: pIdx, className: "bg-yellow-200 text-indigo-900 px-0.5 rounded" }, renderedSubParts);
    }
    if (isCode) {
      return /* @__PURE__ */ React.createElement("code", { key: pIdx, className: "bg-slate-100 text-pink-600 px-1 rounded font-mono text-xs border border-slate-400" }, renderedSubParts);
    }
    return /* @__PURE__ */ React.createElement("span", { key: pIdx }, renderedSubParts);
  });
};
const autoConfigureSettings = async (text, grade, standards, language, customInput, existingResources = [], targetCount = "Auto", deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] autoConfigureSettings fired");
  } catch (_) {
  }
  setGenerationStep(t("status_steps.analyzing_topology"));
  try {
    const userCustomBlock = customInput && customInput.trim().length > 0 ? `TEACHER PACK GUIDANCE: "${customInput}". Use this to shape the resource plan and lessonDNA when it is compatible with the source material, target grade, standards, and already-generated resources. Do not replace or contradict those anchors; if there is a conflict, preserve the anchors and adapt the guidance.` : "";
    const standardsBlock = standards && standards.trim().length > 0 ? `Mandatory Standards: ${standards}` : "Mandatory Standards: None specific (Focus on general comprehension)";
    let existingBlock = "ALREADY GENERATED: None";
    if (existingResources.length > 0) {
      const resourceSummaries = history.filter((h) => h.type && h.type !== "lesson-plan").slice(-15).map((h) => {
        const type = h.type;
        const data = h.data || h.content || {};
        let summary = type;
        try {
          if (type === "persona" && Array.isArray(data)) {
            summary = `persona: Characters available for interview: ${data.map((c) => c.name || c.title || "Unknown").join(", ")}`;
          } else if (type === "dbq" && data.title) {
            summary = `dbq: "${data.title}" with ${(data.documents || []).length} documents. Includes: ${(data.documents || []).map((d) => d.title || d.id).join(", ")}`;
          } else if (type === "quiz" && data.questions) {
            summary = `quiz: ${data.questions.length} questions covering: ${data.questions.slice(0, 3).map((q) => (q.question || "").substring(0, 50)).join("; ")}`;
          } else if (type === "glossary" && data.terms) {
            summary = `glossary: ${data.terms.length} terms including: ${data.terms.slice(0, 5).map((t2) => t2.term || t2.word || "").join(", ")}`;
          } else if (type === "timeline" && data.events) {
            summary = `timeline: ${data.events.length} events from "${(data.events[0]?.title || "").substring(0, 30)}" to "${(data.events[data.events.length - 1]?.title || "").substring(0, 30)}"`;
          } else if (type === "adventure" && data.title) {
            summary = `adventure: "${data.title}" \u2014 ${data.mode || "choice"} mode`;
          } else if (type === "concept-sort" && data.categories) {
            summary = `concept-sort: Categories: ${data.categories.map((c) => c.name || c.label || "").join(", ")}`;
          } else if (type === "simplified" && typeof data === "string") {
            summary = `simplified: ${data.substring(0, 80)}...`;
          } else if (type === "analysis" && typeof data === "string") {
            summary = `analysis: ${data.substring(0, 80)}...`;
          } else if (h.title) {
            summary = `${type}: "${h.title}"`;
          }
        } catch (e) {
          summary = type;
        }
        return summary;
      });
      existingBlock = `ALREADY GENERATED RESOURCES (reference these specifically in the lesson plan \u2014 tell teachers exactly which resource to use and what content it contains):
${resourceSummaries.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`;
    }
    const VALID_TOOLS_LIST = typeof window !== "undefined" && typeof window.getToolIdsCsv === "function" ? window.getToolIdsCsv() : "analysis, simplified, glossary, outline, image, quiz, sentence-frames, brainstorm, timeline, concept-sort, adventure, faq, persona, dbq, note-taking, anchor-chart, math, lesson-plan, gemini-bridge, alignment-report";
    let countConstraint = "";
    let allowDuplicates = false;
    if (targetCount === "All") {
      countConstraint = `CONSTRAINT: You MUST include ALL available resource types from this list: [${VALID_TOOLS_LIST}].`;
    } else if (targetCount !== "Auto") {
      const count = parseInt(targetCount);
      countConstraint = `CONSTRAINT: You MUST generate a plan with exactly ${count} distinct steps/resources. Choose from: [${VALID_TOOLS_LIST}].`;
      if (count > 10) {
        allowDuplicates = true;
        countConstraint += " You are encouraged to use the same TOOL multiple times for different purposes (e.g., one 'outline' for a Flow Chart, another for a Venn Diagram).";
      }
    } else {
      countConstraint = `CONSTRAINT: Generate a robust lesson plan. Aim for 6-9 resources unless the text is very short. Choose from: [${VALID_TOOLS_LIST}].`;
    }
    const prompt = `
            Act as a Lead Curriculum Designer. Analyze this source text to build a lesson resource pack.
            --- 1. THE CONSTRAINTS (IMMUTABLE) ---
            Target Audience: ${grade}
            Output Language: ${language}
            ${standardsBlock}
            ${userCustomBlock}
            ${existingBlock}
            ${countConstraint}
            --- 2. THE SOURCE MATERIAL ---
            "${text.substring(0, 3e3)}...",
            STEP 1: DIAGNOSE THE CONTENT TOPOLOGY
            Determine the best tools to teach this specific content. Available tools and when to use them:
${typeof window !== "undefined" && typeof window.formatToolCatalogForPrompt === "function" ? window.formatToolCatalogForPrompt() : `            - **analysis**: Analyze source text for key ideas, vocabulary, structure. ALWAYS include as first resource.
            - **simplified**: Adapt text to a specific reading level. Good for differentiation.
            - **glossary**: Key vocabulary with definitions, examples, images. Essential for content-heavy texts.
            - **outline**: Visual organizer (Venn Diagram, Flow Chart, Structured Outline). Match to content topology.
            - **image**: AI-generated illustration of a key concept. Good for visual learners.
            - **quiz**: Assessment questions testing comprehension. Include after content resources.
            - **sentence-frames**: Scaffolded writing prompts. Good for ELL students or structured responses.
            - **brainstorm**: Open-ended idea generation around a topic.
            - **timeline**: Chronological sequence of events. Use for historical or procedural content.
            - **concept-sort**: Categorization activity \u2014 students sort terms into groups. Good for vocabulary/classification.
            - **adventure**: Interactive choose-your-own-adventure narrative. Good for engagement and decision-making.
            - **persona**: Interview historical figures, scientists, or literary characters AS IF they were real. EXCELLENT for history, literature, biography, social studies. HIGHLY RECOMMENDED \u2014 do not overlook this tool.
            - **dbq**: Document-Based Question activity with primary sources. Use for social studies, history, civics.
            - **note-taking**: Scaffolded note-taking templates (Cornell / Lab Report / Reading Response). Persists across lessons.
            - **anchor-chart**: EL-style class anchor chart (Reference / Process / Concept Map / Comparison).
            - **math**: Opens the STEM Lab (interactive math/science exploration).
            - **lesson-plan**: Teacher-facing synthesis. ALWAYS place LAST.
            - **gemini-bridge**: Interactive sim/app generator.
            - **alignment-report**: Post-hoc audit. Only include if explicit standards + user requests audit.`}
            STEP 2: IDENTIFY THE "GOLDEN THREAD"
            - What is the ONE main learning objective? Phrase it as a guiding "essential question" students will answer.
            - Pick 5 specific vocabulary terms that are critical to this objective.
            - Pick 3-5 core concepts (short phrases, not full sentences) that form the through-line of the lesson.
            - If teacher pack guidance is present, let it influence the emphasis of the essential question and golden thread only when it remains aligned to the source, standards, and grade level.
            - You MUST return these in the "lessonDNA" field of the response JSON (see schema below). This is not optional \u2014 downstream resources depend on it for alignment.
            STEP 3: CONFIGURE THE RESOURCE PLAN
            Create a sequential list of resources to generate.
            - **Analysis**: Always recommended first.
            - **Visuals**: Choose 'outline' type based on topology (e.g. Comparative -> Venn, Procedural -> Flow Chart).
            - **Assessment**: Quiz should test the Golden Thread.
            ${allowDuplicates ? '**HIGH VOLUME STRATEGY**: Since the target count is high, include complementary variations. Example: Generate a "Concept Sort" for vocabulary AND a "Timeline" for sequence.' : ""}
            **REDUNDANCY CHECK**:
            - Do NOT include resources already generated (see list above) unless the Teacher Pack Guidance explicitly asks for them or if generating a variation.
            Return a JSON object with this specific schema:
            {
                "resourcePlan": [
                    { "tool": "analysis", "directive": "Analyze text..." },
                    { "tool": "simplified", "directive": "Adapt text for ${grade}..." },
                    { "tool": "outline", "directive": "Create a Venn Diagram comparing..." }
                ],
                "lessonDNA": {
                    "essentialQuestion": "The ONE main learning objective phrased as a guiding question students will answer",
                    "goldenThread": ["concept1", "concept2", "concept3"],
                    "keyTerms": ["term1", "term2", "term3", "term4", "term5"]
                },
                "globalSettings": {
                    "gradeLevel": "Target Grade",
                    "tone": "Proposed Tone",
                },
                "glossaryConfig": { "tier2": 4, "tier3": 6 },
                "quizConfig": { "count": 5, "dok": "Level 2", "customFocus": "string" },
                "outlineConfig": { "type": "Flow Chart" | "Venn Diagram" | "Structured Outline" },
                "visualConfig": { "style": "Default" | "Pixel Art" | "Isometric Diagram" },
                "adventureConfig": { "mode": "choice" | "debate", "theme": "string" },
                "brainstormConfig": { "focus": "string" }
            }
        `;
    const result = await callGemini(prompt, true);
    const config = JSON.parse(cleanJson(result));
    const normalizePlanItem = (item) => {
      if (typeof item === "string") return { tool: item, directive: "" };
      if (!item || typeof item !== "object") return null;
      const tool = item.tool || item.type || item.id;
      if (!tool) return null;
      return {
        tool: String(tool),
        directive: item.directive || item.instructions || item.customInstructions || config.toolDirectives && config.toolDirectives[tool] || ""
      };
    };
    if (Array.isArray(config.resourcePlan) && config.resourcePlan.length > 0) {
      config.resourcePlan = config.resourcePlan.map(normalizePlanItem).filter(Boolean);
    } else if (Array.isArray(config.recommendedResources)) {
      config.resourcePlan = config.recommendedResources.map((type) => ({
        tool: type,
        directive: config.toolDirectives && config.toolDirectives[type] || ""
      })).filter((r) => r.tool);
    }
    if (Array.isArray(config.resourcePlan) && config.resourcePlan.length > 0) {
      const analysisItems = config.resourcePlan.filter((r) => r.tool === "analysis");
      const planItems = config.resourcePlan.filter((r) => r.tool === "lesson-plan");
      const otherItems = config.resourcePlan.filter((r) => r.tool !== "analysis" && r.tool !== "lesson-plan");
      config.resourcePlan = [...analysisItems, ...otherItems, ...planItems];
      config.recommendedResources = config.resourcePlan.map((r) => r.tool);
      config.toolDirectives = config.resourcePlan.reduce((acc, item) => {
        if (!acc[item.tool]) acc[item.tool] = item.directive || "";
        return acc;
      }, {});
    }
    addToast(t("toasts.autoconfig_optimized"), "success");
    return config;
  } catch (e) {
    warnLog("Auto-config failed", e);
    return {};
  }
};
const translateResourceItem = async (item, targetLanguage, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] translateResourceItem fired");
  } catch (_) {
  }
  if (["image", "gemini-bridge", "audio", "udl-advice"].includes(item.type)) return item;
  const dataStr = JSON.stringify(item.data);
  let prompt = "";
  if (item.type === "simplified") {
    let sourceText = typeof item.data === "string" ? item.data : "";
    if (sourceText.includes("--- ENGLISH TRANSLATION ---")) {
      sourceText = sourceText.split("--- ENGLISH TRANSLATION ---")[1].trim();
    }
    prompt = `
              You are an expert translator for educators.
              Task: Translate the following educational text into ${targetLanguage}.
              Strict Output Format:
              1. Provide the ${targetLanguage} translation.
              2. Add the delimiter "--- ENGLISH TRANSLATION ---" on a new line.
              3. Provide the original English text exactly as is (from the input).
              Input Text:
              "${sourceText}"
          `;
  } else if (item.type === "glossary") {
    prompt = `
              Translate the terms and definitions in this glossary JSON into ${targetLanguage}.
              Input Data: ${dataStr}
              Task:
              For every item in the array:
              1. Keep the "term" and "def" fields in English.
              2. ADD or UPDATE the "translations" object to include "${targetLanguage}".
              3. Format for translation field: "TranslatedTerm: TranslatedDefinition".
              Return ONLY the updated JSON array.
          `;
  } else if (item.type === "quiz") {
    prompt = `
              Translate this Quiz JSON into ${targetLanguage}.
              Input Data: ${dataStr}
              Task:
              1. For every question:
                 - Move the current "question" text to "question_en" if "question_en" doesn't exist.
                 - Write the ${targetLanguage} translation in "question".
                 - Move current "options" to "options_en" if "options_en" doesn't exist.
                 - Write ${targetLanguage} translations in "options".
                 - Ensure the "correctAnswer" matches the new ${targetLanguage} option text.
              2. Do the same for reflections (text -> text_en).
              Return ONLY the updated valid JSON object.
          `;
  } else {
    prompt = `
              Translate the content of this JSON object into ${targetLanguage}.
              Input Data: ${dataStr}
              Rules:
              1. Translate all display text values (titles, items, descriptions) into ${targetLanguage}.
              2. For every translated field, try to preserve the original English in a new field with suffix "_en" if possible (e.g. "title" becomes ${targetLanguage}, "title_en" gets original).
              3. Keep the JSON structure identical.
              Return ONLY the updated valid JSON.
          `;
  }
  try {
    const result = await callGemini(prompt, item.type !== "simplified");
    let newData;
    if (item.type === "simplified") {
      newData = result;
    } else {
      newData = JSON.parse(cleanJson(result));
    }
    if (item.type === "quiz") {
      if (!newData.questions || !Array.isArray(newData.questions)) newData.questions = [];
      if (!newData.reflections) newData.reflections = [];
    } else if (item.type === "glossary") {
      if (!Array.isArray(newData)) {
        if (newData.terms && Array.isArray(newData.terms)) newData = newData.terms;
        else if (newData.items && Array.isArray(newData.items)) newData = newData.items;
        else newData = [];
      }
    } else if (item.type === "sentence-frames") {
      if (!newData.items || !Array.isArray(newData.items)) newData.items = [];
      if (!newData.text) newData.text = "";
    } else if (item.type === "outline") {
      if (!newData.branches || !Array.isArray(newData.branches)) newData.branches = [];
    } else if (item.type === "timeline") {
      if (!Array.isArray(newData)) {
        if (newData.events && Array.isArray(newData.events)) newData = newData.events;
        else newData = [];
      }
    } else if (item.type === "concept-sort") {
      if (!newData.categories || !Array.isArray(newData.categories)) newData.categories = [];
      if (!newData.items || !Array.isArray(newData.items)) newData.items = [];
    } else if (item.type === "math") {
      if (!newData.problems || !Array.isArray(newData.problems)) newData.problems = [];
    } else if (item.type === "lesson-plan") {
      const keys = ["objectives", "essentialQuestion", "hook", "directInstruction", "guidedPractice", "independentPractice", "closure"];
      keys.forEach((k) => {
        if (!newData[k]) newData[k] = k === "objectives" ? [] : "";
      });
    } else if (item.type === "faq") {
      if (!Array.isArray(newData)) {
        if (newData.faqs && Array.isArray(newData.faqs)) newData = newData.faqs;
        else if (newData.questions && Array.isArray(newData.questions)) newData = newData.questions;
        else newData = [];
      }
    } else if (item.type === "analysis") {
      if (!newData.concepts || !Array.isArray(newData.concepts)) {
        newData.concepts = newData.concepts ? [String(newData.concepts)] : [];
      }
      if (!newData.grammar || !Array.isArray(newData.grammar)) newData.grammar = [];
      if (!newData.accuracy || typeof newData.accuracy !== "object") {
        newData.accuracy = { rating: "Unknown", reason: "Translation missing accuracy data." };
      }
      if (!newData.readingLevel) {
        newData.readingLevel = { range: "N/A", explanation: "Translation missing level data." };
      } else if (typeof newData.readingLevel === "string") {
        newData.readingLevel = { range: newData.readingLevel, explanation: "" };
      }
      if (!newData.originalText && item.data.originalText) {
        newData.originalText = item.data.originalText;
      }
    } else if (item.type === "brainstorm") {
      if (!Array.isArray(newData)) {
        if (newData.ideas && Array.isArray(newData.ideas)) newData = newData.ideas;
        else if (newData.activities && Array.isArray(newData.activities)) newData = newData.activities;
        else newData = [];
      }
    }
    return {
      ...item,
      data: newData,
      meta: item.meta ? `${item.meta} (${targetLanguage})` : `Translated to ${targetLanguage}`,
      title: `${item.title} (${targetLanguage})`
    };
  } catch (e) {
    warnLog(`Translation failed for ${item.type}`, e);
    return item;
  }
};
const handleSaveReflection = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleSaveReflection fired");
  } catch (_) {
  }
  if (!personaState.selectedCharacter && personaState.mode !== "panel" || !personaReflectionInput.trim()) return;
  setIsGradingReflection(true);
  let subjectName = "Interview";
  let contextData = "";
  let chatLogText = "";
  if (personaState.mode === "panel") {
    const charA = personaState.selectedCharacters[0];
    const charB = personaState.selectedCharacters[1];
    subjectName = `${charA?.name || "A"} & ${charB?.name || "B"}`;
    contextData = `Panel Debate on topic: ${sourceTopic || "General"}`;
    chatLogText = personaState.chatHistory.map((m) => `${m.role === "user" ? "Student" : m.speakerName || "Panelist"}: ${m.text}`).join("\n");
  } else {
    const char = personaState.selectedCharacter;
    subjectName = char.name;
    contextData = char.context;
    chatLogText = personaState.chatHistory.map((m) => `${m.role === "user" ? "Student" : char.name}: ${m.text}`).join("\n");
  }
  try {
    const standardsContext = targetStandards && targetStandards.length > 0 ? targetStandards.join("; ") : null;
    const dokContext = dokLevel || null;
    const prompt = `
            You are a teacher evaluating a student's reflection.
            Subject: ${subjectName}
            Context: ${contextData}
            ${standardsContext ? `TARGET STANDARDS: "${standardsContext}"` : ""}
            ${dokContext ? `TARGET WEBB'S DOK: "${dokContext}"` : ""}
            Transcript Summary (Last few turns):
            "${chatLogText.substring(Math.max(0, chatLogText.length - 2e3))}",
            Student Reflection:
            "${personaReflectionInput}",
            Task:
            Evaluate the student's reflection based on:
            1. Depth of insight (Did they identify a specific learning takeaway?)
            2. Connection to context.
            ${standardsContext ? "3. Alignment with the Target Standards." : ""}
            Respond to the user in ${currentUiLanguage}.
            Return ONLY JSON:
            {
                "score": number (0-100),
                "feedback": "Brief, encouraging feedback (1-2 sentences).${standardsContext || dokContext ? " Comment on their mastery of the standard/rigor if applicable." : ""}",
                "xpBonus": number (0-50 based on quality)
            }
          `;
    const result = await callGemini(prompt, true);
    let grading = null;
    try {
      grading = JSON.parse(cleanJson(result));
    } catch (e) {
      warnLog("Grading JSON parse error \u2014 presenting without a score", e);
    }
    if (!grading || typeof grading !== "object" || typeof grading.score !== "number") {
      grading = {
        score: null,
        feedback: t("persona.grading_unavailable") || "Your reflection was saved. Automatic feedback was unavailable this time \u2014 your teacher can review it.",
        xpBonus: 20
      };
    }
    const totalXP = 10 + (grading.xpBonus || 0);
    const formattedChatLog = personaState.chatHistory.map((m) => `**${m.role === "user" ? "Student" : m.speakerName || subjectName}:**
${m.text}${m.translation ? `

> *English translation:* ${m.translation}` : ""}`).join("\n\n---\n\n");
    let metaHeader = `### \u{1F4DD} Student Reflection
`;
    if (standardsContext || dokContext) {
      metaHeader += `> *Graded against: ${standardsContext || ""} ${dokContext || ""}*

`;
    }
    const scoreSuffix = typeof grading.score === "number" ? ` (Score: ${grading.score}/100)` : "";
    const fullData = `${formattedChatLog}

---

${metaHeader}${personaReflectionInput}

> **Teacher Bot Feedback:** ${grading.feedback}${scoreSuffix}`;
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: "udl-advice",
      data: fullData,
      meta: typeof grading.score === "number" ? `Reflection on ${subjectName} (Score: ${grading.score})` : `Reflection on ${subjectName}`,
      title: `Reflection: ${subjectName}`,
      timestamp: /* @__PURE__ */ new Date(),
      config: {}
    };
    setHistory((prev) => [...prev, newItem]);
    handleScoreUpdate(totalXP, "Reflection Insight", newItem.id);
    let newlyEarnedBadges = [];
    if (grading.score >= 80 && !personaState.earnedBadges?.includes("master_interviewer")) {
      newlyEarnedBadges.push("master_interviewer");
      setPersonaState((prev) => (prev.earnedBadges || []).includes("master_interviewer") ? prev : {
        ...prev,
        earnedBadges: [...prev.earnedBadges || [], "master_interviewer"]
      });
      addToast(`\u{1F3C6} ${t("persona.badges.master_interviewer")}!`, "success");
    }
    playSound("correct");
    setReflectionFeedback({
      score: grading.score,
      feedback: grading.feedback,
      xpEarned: totalXP,
      subjectName
    });
  } catch (err) {
    warnLog("Reflection grading failed", err);
    addToast(t("toasts.reflection_grade_error"), "error");
  } finally {
    setIsGradingReflection(false);
  }
};
const handleSocraticSubmit = async (inputOverride = null, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleSocraticSubmit fired");
  } catch (_) {
  }
  const textToSend = inputOverride || socraticInput;
  if (!textToSend.trim()) return;
  const lower = textToSend.toLowerCase().trim();
  const navMatch = lower.match(/^(?:go\s+to|open|take\s+me\s+to|switch\s+to|show\s+me)\s+(?:the\s+)?(.+)$/i);
  const readMatch = /^(?:read|hear|what'?s?\s+on\s+(?:the\s+)?(?:screen|page)|describe|read\s+(?:this|the)\s+page)/i.test(lower);
  const histMatch = lower.match(/^(?:load|go\s+back\s+to|show)\s+(?:the\s+|my\s+)?(.+?)(?:\s+from\s+(?:earlier|before|history))?$/i);
  if (navMatch || readMatch) {
    const sendSocraticBotMsg = (text) => setSocraticMessages((prev) => [...prev, { role: "model", text }]);
    if (readMatch) {
      setShowReadThisPage(true);
      const items = getReadableContent();
      const summary = items.length > 0 ? items.slice(0, 3).map((i) => i.text).join(" ") : "No content to read yet.";
      sendSocraticBotMsg(summary);
      setIsSocraticThinking(false);
      return;
    }
    if (navMatch) {
      const viewMap = {
        glossary: "glossary",
        vocabulary: "glossary",
        vocab: "glossary",
        terms: "glossary",
        quiz: "quiz",
        "exit ticket": "quiz",
        assessment: "quiz",
        test: "quiz",
        questions: "quiz",
        simplified: "simplified",
        adapted: "simplified",
        "leveled text": "simplified",
        analysis: "analysis",
        "content analysis": "analysis",
        outline: "outline",
        organizer: "outline",
        "visual organizer": "outline",
        image: "image",
        images: "image",
        gallery: "image",
        pictures: "image",
        faq: "faq",
        "frequently asked": "faq",
        "sentence frames": "sentence-frames",
        scaffolds: "sentence-frames",
        "writing frames": "sentence-frames",
        brainstorm: "brainstorm",
        "brainstorming": "brainstorm",
        persona: "persona",
        interview: "persona",
        character: "persona",
        timeline: "timeline",
        sequence: "timeline",
        "concept sort": "concept-sort",
        "concept map": "concept-sort",
        sorting: "concept-sort",
        math: "math",
        stem: "math",
        calculator: "math",
        adventure: "adventure",
        story: "adventure",
        game: "adventure",
        "lesson plan": "lesson-plan",
        "resource pack": "lesson-plan",
        dashboard: "dashboard",
        analytics: "dashboard",
        input: "input",
        source: "input",
        "source material": "input",
        "word sounds": "word-sounds",
        phonics: "word-sounds",
        "alignment report": "alignment-report",
        standards: "alignment-report"
      };
      const rawTarget = navMatch[1].replace(/[?.!]/g, "").trim();
      const viewId = viewMap[rawTarget] || Object.keys(viewMap).find((k) => rawTarget.includes(k));
      if (viewId) {
        const resolvedView = viewMap[viewId] || viewId;
        setActiveView(resolvedView);
        setSocraticMessages((prev) => [...prev, { role: "user", text: textToSend }]);
        if (!inputOverride) setSocraticInput("");
        setTimeout(() => {
          const items = getReadableContent();
          const summary = items.length > 0 ? items[0].text : "";
          const label = resolvedView.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          setSocraticMessages((prev) => [...prev, { role: "model", text: `Opening ${label}. ${summary}` }]);
        }, 200);
        setIsSocraticThinking(false);
        return;
      }
    }
  }
  setIsSocraticThinking(true);
  const userMsg = { role: "user", text: textToSend };
  setSocraticMessages((prev) => [...prev, userMsg]);
  if (!inputOverride) {
    setSocraticInput("");
  }
  SafetyContentChecker.aiCheck(textToSend, "socratic", apiKey, handleAiSafetyFlag);
  try {
    const latestAnalysis = history.slice().reverse().find((h) => h && h.type === "analysis");
    const sourceText = latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText ? latestAnalysis.data.originalText : inputText;
    const snippet = sourceText.substring(0, 1e3).replace(/\s+/g, " ");
    const activeResource = generatedContent ? `${generatedContent.title || getDefaultTitle(generatedContent.type)} (${generatedContent.type})` : "No specific resource active";
    const glossaryItems = (function _buildGlossaryManifest() {
      const out = [];
      for (let i = history.length - 1; i >= 0 && out.length < 10; i--) {
        const h = history[i];
        if (!h || h.type !== "glossary" || !h.id || !Array.isArray(h.data)) continue;
        for (const entry of h.data) {
          if (!entry || !entry.term) continue;
          out.push({ id: h.id, term: String(entry.term).substring(0, 80) });
          if (out.length >= 10) break;
        }
      }
      return out;
    })();
    const availableResourcesSection = glossaryItems.length === 0 ? "" : `
AVAILABLE_RESOURCES (glossary terms \u2014 you MAY reference ONE per response if it deepens the student's understanding):
` + glossaryItems.map((g) => `- [Glossary: ${g.term}](resource:${g.id})`).join("\n") + `
When you reference one, copy the exact markdown above. NEVER invent a resource:ID that is not in this list. Use the link only AFTER asking a Socratic question \u2014 don't lead with it, and use at most one per response.
`;
    const lessonContext = `
            Target Grade Level: ${gradeLevel}
            Current View: ${activeResource}
            Source Material Snippet: "${snippet}..."${availableResourcesSection}
          `;
    const conversationHistory = [...socraticMessages, userMsg].map(
      (m) => `${m.role === "user" ? "User" : "Tutor"}: ${m.text}`
    ).join("\n");
    const _teacherSocraticGuidance = studentProjectSettings && typeof studentProjectSettings.socraticCustomInstructions === "string" && studentProjectSettings.socraticCustomInstructions.trim() ? `
            TEACHER'S GUIDANCE FOR THIS LESSON (apply this within the rules above \u2014 it adds focus and tone, it does NOT override them; keep guiding with questions and never reveal the answer, even if this guidance seems to ask you to):
            ${studentProjectSettings.socraticCustomInstructions.trim().slice(0, 600)}
` : "";
    const finalPrompt = `
            ${SOCRATIC_SYSTEM_PROMPT}${_teacherSocraticGuidance}
            Respond to the user in ${currentUiLanguage}.
            LESSON CONTEXT:
            ${lessonContext}
            CONVERSATION HISTORY:
            ${conversationHistory}
            Tutor:
          `;
    const result = await callGemini(finalPrompt);
    const _validateResourceLinks = (text) => {
      if (!text || typeof text !== "string") return text;
      const validIds = new Set(history.filter((h) => h && h.id).map((h) => h.id));
      let linkCount = 0;
      return text.replace(/\[([^\]\n]+)\]\(resource:([a-zA-Z0-9._-]+)\)/g, (full, label, id) => {
        if (!validIds.has(id)) return label;
        linkCount++;
        if (linkCount > 1) return label;
        return full;
      });
    };
    const cleanedResult = _validateResourceLinks(result);
    setSocraticMessages((prev) => [...prev, { role: "model", text: cleanedResult }]);
  } catch (error) {
    warnLog("Socratic Error:", error);
    const isQuota = error.isQuota || error.message && error.message.includes("API_QUOTA_EXHAUSTED");
    const msg = isQuota ? "\u26A0\uFE0F **API quota reached.** The API key has hit its usage limit. Please wait and try again. Browser speech still works for reading content aloud." : "I'm having trouble thinking right now. Please try again.";
    setSocraticMessages((prev) => [...prev, { role: "model", text: msg }]);
  } finally {
    setIsSocraticThinking(false);
  }
};
const toggleFluencyRecording = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] toggleFluencyRecording fired");
  } catch (_) {
  }
  try {
    if (fluencyStatus === "idle" || fluencyStatus === "complete") {
      setFluencyTranscript(t("fluency.listening"));
      setFluencyResult(null);
      setFluencyFeedback("");
      setShowFluencyConfetti(false);
      if (fluencyTimeLimit > 0) {
        setFluencyTimeRemaining(fluencyTimeLimit);
      }
      await startFluencyRecording();
      fluencyStartTimeRef.current = Date.now();
      setFluencyStatus("listening");
    } else if (fluencyStatus === "listening") {
      setFluencyStatus("processing");
      setFluencyTranscript(t("fluency.processing"));
      const audioData = await stopFluencyRecording();
      const durationMs = Date.now() - fluencyStartTimeRef.current;
      const durationSeconds = durationMs / 1e3;
      if (audioData) {
        let sourceText = "";
        if (typeof generatedContent?.data === "string") {
          sourceText = generatedContent?.data.split("--- ENGLISH TRANSLATION ---")[0];
          sourceText = sourceText.replace(/^#{1,6}\s/gm, "").replace(/\*{1,3}/g, "").replace(/[`~]/g, "");
        } else if (generatedContent?.data?.originalText) {
          sourceText = generatedContent?.data.originalText;
        }
        sourceText = sourceText.replace(/\[([^\]]*)\]\([^)]+\)/g, "$1");
        sourceText = sourceText.replace(/https?:\/\/[^\s]+/g, "");
        sourceText = sourceText.replace(/\[\d+\]/g, "");
        sourceText = sourceText.replace(/[⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "");
        sourceText = sourceText.replace(/\[Source\s*Ref\]/gi, "");
        const cleanSource = sourceText.trim().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
        const totalReferenceWordCount = cleanSource.length > 0 ? cleanSource.split(" ").length : 0;
        const analysis = await analyzeFluencyWithGemini(
          audioData.base64,
          audioData.mimeType,
          sourceText
        );
        if (analysis && analysis.wordData) {
          const { accuracy, wcpm } = calculateLocalFluencyMetrics(
            analysis.wordData,
            durationSeconds,
            totalReferenceWordCount
          );
          const finalResult = {
            ...analysis,
            accuracy,
            wcpm
          };
          const fluencyRecordItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: "fluency-record",
            title: `Oral Fluency Check (${accuracy}%)`,
            timestamp: /* @__PURE__ */ new Date(),
            meta: `${wcpm} WCPM - ${Math.round(durationSeconds)}s`,
            data: {
              audioRecording: audioData.base64,
              mimeType: audioData.mimeType || "audio/webm",
              fullAnalysis: analysis,
              wordData: finalResult.wordData,
              feedback: finalResult.feedback,
              sourceText,
              metrics: {
                accuracy,
                wcpm,
                durationSeconds,
                totalWords: totalReferenceWordCount
              }
            },
            config: {}
          };
          setHistory((prev) => [...prev, fluencyRecordItem]);
          setFluencyResult(finalResult);
          setFluencyFeedback(finalResult.feedback);
          setFluencyStatus("complete");
          let earnedXP = 0;
          if (finalResult.accuracyScore > 80) {
            earnedXP = 50;
            if (finalResult.accuracyScore > 90) {
              earnedXP += 50;
              setShowFluencyConfetti(true);
            }
            playSound("correct");
            handleScoreUpdate(earnedXP, "Oral Fluency Check", generatedContent.id);
            addToast(`Great Reading! +${earnedXP} XP`, "success");
          } else {
            playSound("click");
          }
        } else {
          addToast(t("toasts.analysis_failed"), "error");
          setFluencyStatus("idle");
        }
      } else {
        setFluencyStatus("idle");
      }
    }
  } catch (e) {
    warnLog("Unhandled error in toggleFluencyRecording:", e);
  }
};
const handleFixGrammarErrors = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleFixGrammarErrors fired");
  } catch (_) {
  }
  if (selectedGrammarErrors.size === 0) {
    showToast(t("process.select_error") || "Please select at least one error to fix.", "warning");
    return;
  }
  setIsProcessing(true);
  showToast(t("process.fixing_grammar") || "Fixing grammar errors...", "info");
  try {
    const grammarData = generatedContent?.data?.grammar || [];
    const selectedErrorTexts = [];
    grammarData.forEach((error, idx) => {
      if (selectedGrammarErrors.has(idx) && !error.startsWith("\u2713 FIXED:")) {
        selectedErrorTexts.push(error);
      }
    });
    const originalText = inputText;
    let correctedText = originalText;
    for (const errorDesc of selectedErrorTexts) {
      const errorKeywords = errorDesc.match(/["']([^"']+)["']/g)?.map((s) => s.replace(/["']/g, "")) || [];
      let targetSentence = "";
      if (errorKeywords.length > 0) {
        const sentences = correctedText.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (errorKeywords.some((kw) => sentence.includes(kw))) {
            targetSentence = sentence;
            break;
          }
        }
      }
      const contextToFix = targetSentence || correctedText.substring(0, 500);
      const fixPrompt = `Fix ONLY this specific grammar/spelling error in the text below. Return ONLY the corrected text segment, nothing else.
ERROR TO FIX: ${errorDesc}
TEXT TO CORRECT:
"${contextToFix}",
Return only the corrected version of this exact text:`;
      const fixedSegment = await callOpenRouterForText(fixPrompt, getApiKey());
      if (fixedSegment && fixedSegment.trim() && targetSentence) {
        const cleanedFix = fixedSegment.trim().replace(/^["']|["']$/g, "");
        correctedText = correctedText.replace(targetSentence, cleanedFix);
      }
    }
    const lengthChange = Math.abs(correctedText.length - originalText.length) / originalText.length;
    if (lengthChange > 0.15) {
      warnLog(`Grammar fix length change too large: ${(lengthChange * 100).toFixed(1)}%`);
      showToast(t("process.grammar_fix_truncation") || "Text changed significantly. Please try again with fewer errors selected.", "warning");
      setIsProcessing(false);
      return;
    }
    if (correctedText && correctedText.trim()) {
      setInputText(correctedText.trim());
      const updatedGrammar = grammarData.map((error, idx) => {
        if (selectedGrammarErrors.has(idx) && !error.startsWith("\u2713 FIXED:")) {
          return "\u2713 FIXED: " + error;
        }
        return error;
      });
      setGeneratedContent((prev) => ({
        ...prev,
        data: { ...prev.data, grammar: updatedGrammar }
      }));
      setSelectedGrammarErrors(/* @__PURE__ */ new Set());
      showToast(t("process.grammar_fixed") || "Grammar errors fixed!", "success");
    } else {
      showToast(t("process.grammar_fix_failed") || "Failed to fix grammar errors.", "error");
    }
  } catch (error) {
    warnLog("Grammar fix error:", error);
    showToast(t("process.grammar_fix_failed") || "Failed to fix grammar errors.", "error");
  } finally {
    setIsProcessing(false);
  }
};
const performDeepVerification = async (fullText, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence: playSequence2, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText, stickers } = deps;
  try {
    if (window._DEBUG_PHASE_K) console.log("[PhaseK] performDeepVerification fired");
  } catch (_) {
  }
  const chunks = chunkText(fullText, 6e3);
  let combinedVerificationText = "";
  const globalSources = [];
  const sourceUrlToIndexMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < chunks.length; i++) {
    setGenerationStep(`Step 1/2: Verifying segment ${i + 1} of ${chunks.length}...`);
    const verificationPrompt = `
              Verify the factual accuracy of the following text segment (${i + 1}/${chunks.length}) using Google Search.
              Text Segment:
              "${chunks[i]}",
              Task:
              1. Identify specific factual claims (dates, names, statistics).
              2. Cross-reference them with reliable sources via Google Search.
              3. ONLY if you find actual errors, myths, or outdated information, include a "**Discrepancies**" section listing each specific error with the correction.
              4. List key "**Verified Facts**" - the confirmed accurate facts from the text.
              IMPORTANT RULES:
              - Do NOT include a Discrepancies section if no genuine errors were found.
              - Do NOT write "No discrepancies found" or similar - simply omit the section entirely.
              - Only count something as a discrepancy if it is factually incorrect, not just incomplete.
              - Focus on the Verified Facts section when the content is accurate.
              Return a concise summary of findings for this segment.
          `;
    try {
      const result = await callGemini(verificationPrompt, false, true, null, sourceTopic || null);
      if (result) {
        let chunkRawText = "";
        let metadata = null;
        if (typeof result === "object" && result !== null) {
          chunkRawText = result.text || "";
          metadata = result.groundingMetadata;
        } else {
          chunkRawText = String(result || "");
        }
        let chunkTextWithGlobalCitations = chunkRawText;
        if (metadata && metadata.groundingChunks) {
          const localToGlobalIndexMap = /* @__PURE__ */ new Map();
          metadata.groundingChunks.forEach((chunk, localIdx) => {
            const uri = chunk.web?.uri;
            const title = chunk.web?.title;
            if (uri) {
              let globalIndex;
              if (sourceUrlToIndexMap.has(uri)) {
                globalIndex = sourceUrlToIndexMap.get(uri);
              } else {
                globalSources.push({ uri, title });
                globalIndex = globalSources.length;
                sourceUrlToIndexMap.set(uri, globalIndex);
              }
              localToGlobalIndexMap.set(localIdx, globalIndex);
            }
          });
          if (metadata.groundingSupports) {
            chunkTextWithGlobalCitations = applyGlobalCitations(chunkRawText, metadata.groundingSupports, localToGlobalIndexMap);
          }
        }
        if (chunkTextWithGlobalCitations.trim()) {
          combinedVerificationText += `

#### Segment ${i + 1} Findings
${chunkTextWithGlobalCitations}`;
        }
      }
    } catch (err) {
      warnLog(`Verification failed for chunk ${i}`, err);
    }
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 800));
  }
  return {
    text: combinedVerificationText,
    sources: globalSources
  };
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.PhaseKHelpers = {
  playSequence,
  handleSpeak,
  syncProgressToFirestore,
  executeSaveFile,
  formatInlineText,
  autoConfigureSettings,
  translateResourceItem,
  handleSaveReflection,
  handleSocraticSubmit,
  toggleFluencyRecording,
  handleFixGrammarErrors,
  performDeepVerification
};
window.AlloModules.PhaseKHelpersModule = true;
console.log('[PhaseKHelpers] 12 helpers registered');
})();
