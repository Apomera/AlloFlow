// phase_k_helpers_source.jsx — Phase K of CDN modularization.
// 12 mid-tier helpers spanning TTS playback, file save, AI config,
// translation, Firestore sync, Socratic chat, fluency recording,
// reflection saving, grammar fixing, accuracy verification.

const playSequence = async (index, sentences, sessionId, mode = 'standard', voiceMap = {}, activeSpeaker = null, preloadedAudio = null, retryCount = 0, speakerName = null, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] playSequence fired"); } catch(_) {}
      if (playbackSessionRef.current !== sessionId || index >= sentences.length) {
          if (playbackSessionRef.current === sessionId) stopPlayback();
          return;
      }
      setPlaybackState(prev => ({ ...prev, currentIdx: index }));
      if (!preloadedAudio) setIsGeneratingAudio(true);
      try {
          let currentVoice = activeSpeaker || selectedVoice;
          let nextSpeaker = activeSpeaker;
          if (mode === 'adventure') {
              const text = sentences[index].trim();
              const hasOpen = /["“]/.test(text);
              const hasClose = /["”]/.test(text);
              const speakerTagMatch = text.match(/^(\*\*|__)?([A-Za-z0-9\s]+)(\*\*|__)?:\s*["“]/);
              let explicitVoiceFound = false;
              if (speakerTagMatch) {
                  const detectedName = speakerTagMatch[2].trim();
                  const voiceKey = Object.keys(voiceMap).find(k => k.toLowerCase() === detectedName.toLowerCase());
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
                          const distinctVoices = Object.values(voiceMap).filter(v => v !== selectedVoice);
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
              }
              else if (activeSpeaker && !explicitVoiceFound) {
                  currentVoice = activeSpeaker;
                  if (hasClose) {
                      nextSpeaker = null;
                  }
              }
          } else if (mode === 'script') {
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
          } else if (mode === 'persona') {
              currentVoice = activeSpeaker || selectedVoice;
              nextSpeaker = currentVoice;
          } else {
              currentVoice = selectedVoice;
          }
          let audio;
          let audioUrl;
          const bufferKey = `${index}-${currentVoice}`;
          let textToSpeak = sentences[index];
          if (mode === 'script') {
               textToSpeak = textToSpeak.replace(/^(\*+)?([A-Za-z]+)(\*+)?:\s*/, '');
          }
          if (mode === 'persona' && activeSpeaker && activeSpeaker !== selectedVoice) {
              const geminiAvailable = !_isCanvasEnv || (Date.now() >= _ttsState.rateLimitedUntil);
              if (geminiAvailable) {
                  let voiceInstruction = `[speak in character as ${activeSpeaker}]`;
                  const isPanelMode = personaState.selectedCharacters && personaState.selectedCharacters.length > 0;
                  const speakingChar = isPanelMode
                    ? (speakerName && personaState.selectedCharacters.find(c => c.name === speakerName))
                      || personaState.selectedCharacters.find(c => c.voice === activeSpeaker)
                    : personaState.selectedCharacter;
                  if (speakingChar && speakingChar.voiceProfile) {
                    const nationalityHint = speakingChar.nationality ? ` This person is ${speakingChar.nationality} — their accent MUST reflect this nationality throughout.` : '';
                    voiceInstruction = `[CRITICAL VOICE DIRECTION: ${speakingChar.voiceProfile}.${nationalityHint} You MUST speak with this exact accent consistently for every word. Do NOT default to a neutral American accent.]`;
                  } else if (speakingChar && speakingChar.name) {
                    const natHint = speakingChar.nationality ? ` Speak with a ${speakingChar.nationality} accent.` : '';
                    voiceInstruction = `[Speak as ${speakingChar.name}${speakingChar.role ? ', ' + speakingChar.role : ''}${speakingChar.year ? ' from ' + speakingChar.year : ''}.${natHint} Stay in character with a consistent accent and tone.]`;
                  }
                  textToSpeak = voiceInstruction + ' ' + textToSpeak;
              }
          }
           textToSpeak = textToSpeak
               .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // [link](url) → link
               .replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '') // superscript citations ⁽³⁾
               .replace(/\[Source\s+\d+\]/gi, '') // [Source N] text markers
               .replace(/\[\d+\]/g, '') // [1] numeric refs
               .replace(/^#{1,6}\s+/gm, '') // # headers
               .replace(/\*\*/g, '') // bold
               .replace(/\*/g, '') // italic
               .replace(/__|_/g, '') // underscores
               .replace(/~~/g, '') // strikethrough
               .replace(/`/g, '') // inline code
               .replace(/^>\s?/gm, '') // blockquotes
               .replace(/^[-*+]\s/gm, '') // list markers
               .replace(/^\d+\.\s/gm, '') // numbered lists
               .replace(/\s+/g, ' ') // collapse whitespace
               .trim();
          const _browserTtsFallbackEnabled = (() => {
              try {
                  const cfg = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                  return cfg.browserTtsFallback === true;
              } catch { return false; }
          })();
          let _errorHandled = false;
          const speakViaBrowserFallback = (reason) => {
              warnLog(`Browser-TTS fallback at index ${index} (${reason})`);
              try {
                  if (!('speechSynthesis' in window)) {
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps);
                      return;
                  }
                  const utter = new SpeechSynthesisUtterance(textToSpeak);
                  utter.rate = playbackRateRef.current || 1;
                  const advance = () => {
                      if (playbackSessionRef.current !== sessionId) return;
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps);
                  };
                  utter.onend = advance;
                  utter.onerror = advance;
                  setPlaybackState(prev => ({ ...prev, currentIdx: index }));
                  setIsPlaying(true);
                  setIsGeneratingAudio(false);
                  window.speechSynthesis.speak(utter);
              } catch (e) {
                  warnLog('Browser-TTS fallback threw:', e);
                  playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps);
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
                  const isAbort = err && (err.name === 'AbortError' || err.name === 'NotAllowedError');
                  if (isAbort) return;
                  if (isRefusal) {
                      if (_browserTtsFallbackEnabled) {
                          warnLog(`Segment ${index} refused by Gemini safety filter — using browser TTS fallback.`);
                          speakViaBrowserFallback('refusal');
                      } else {
                          warnLog(`Segment ${index} refused by Gemini safety filter — skipping (enable browserTtsFallback to hear sentence via system voice).`);
                          playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps);
                      }
                      return;
                  }
                  if (retryCount < 3) {
                      const backoffMs = 1000 * Math.pow(2, retryCount);
                      debugLog(`Retrying segment ${index} in ${backoffMs}ms (attempt ${retryCount + 1}/3)...`);
                      setTimeout(() => {
                          if (playbackSessionRef.current === sessionId) {
                              playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1, speakerName, deps);
                          }
                      }, backoffMs);
                  } else if (_browserTtsFallbackEnabled) {
                      warnLog(`Segment ${index} exhausted Gemini retries — using browser TTS fallback.`);
                      speakViaBrowserFallback('retries-exhausted');
                  } else {
                      warnLog(`Segment ${index} exhausted Gemini retries — skipping.`);
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, null, 0, speakerName, deps);
                  }
              }
          };
          if (preloadedAudio) {
              audio = preloadedAudio;
              if (audio instanceof Promise) {
                  try {
                      const _tOut = window._kokoroTTS ? 90000 : 15000;
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
              audio.playbackRate = playbackRateRef.current;
              audio.muted = false;
          } else {
              if (audioBufferRef.current[bufferKey]) {
                  try {
                      const _tOut2 = window._kokoroTTS ? 90000 : 15000;
                      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Audio load timeout")), _tOut2));
                      audioUrl = await Promise.race([audioBufferRef.current[bufferKey], timeoutPromise]);
                  } catch (e) {
                      handlePlaybackError(e);
                      return;
                  }
              } else {
                  const promise = callTTS(textToSpeak, currentVoice).then(url => {
                      addBlobUrl(url);
                      return url;
                  });
                  audioBufferRef.current[bufferKey] = promise;
                  try {
                      const _tOut3 = window._kokoroTTS ? 90000 : 15000;
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
              audio.preload = 'auto';
          }
          if (audioRef.current && audioRef.current !== audio) {
              audioRef.current.pause();
              audioRef.current.onended = null;
          }
          audioRef.current = audio;
          let simulatedSpeaker = nextSpeaker;
          let nextAudioElementPromise = null;
          for (let offset = 1; offset <= 3; offset++) {
              const targetIdx = index + offset;
              if (targetIdx >= sentences.length) break;
              let targetVoice = selectedVoice;
              let targetText = sentences[targetIdx].trim();
              let textToPreload = targetText
                  .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                  .replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '') // superscript citations ⁽³⁾
                  .replace(/\[Source\s+\d+\]/gi, '') // [Source N] markers
                  .replace(/\[\d+\]/g, '') // [1] numeric refs
                  .replace(/^#{1,6}\s+/gm, '')
                  .replace(/\*\*/g, '').replace(/\*/g, '')
                  .replace(/__|_/g, '').replace(/~~/g, '').replace(/`/g, '')
                  .replace(/^>\s?/gm, '').replace(/^[-*+]\s/gm, '')
                  .replace(/^\d+\.\s/gm, '').replace(/\s+/g, ' ').trim();
              if (mode === 'adventure') {
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
              } else if (mode === 'script') {
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
                  textToPreload = targetText.replace(/^(\*+)?([A-Za-z]+)(\*+)?:\s*/, '');
              } else if (mode === 'persona') {
                  targetVoice = activeSpeaker || selectedVoice;
                  if (activeSpeaker && activeSpeaker !== selectedVoice) {
                      const geminiAvail = !_isCanvasEnv || (Date.now() >= _ttsState.rateLimitedUntil);
                      if (geminiAvail) {
                          textToPreload = `[speak in character as ${activeSpeaker}] ${textToPreload}`;
                      }
                  }
              }
              const nextBufferKey = `${targetIdx}-${targetVoice}`;
              if (!audioBufferRef.current[nextBufferKey]) {
                  audioBufferRef.current[nextBufferKey] = callTTS(textToPreload, targetVoice)
                      .then(url => {
                          addBlobUrl(url);
                          return url;
                      })
                      .catch(e => {
                          warnLog(`Preload failed for index ${targetIdx}`, e);
                          delete audioBufferRef.current[nextBufferKey];
                      });
              }
              if (offset === 1) {
                  nextAudioElementPromise = audioBufferRef.current[nextBufferKey]
                      .then(url => {
                          const a = new Audio(url);
                          a.playbackRate = playbackRateRef.current;
                          a.preload = 'auto';
                          a.muted = true;
                          a.load();
                          return a;
                      })
                      .catch(() => null);
              }
          }
          audio.onended = async () => {
              if (watchdogTimer) clearTimeout(watchdogTimer);
              releaseBlob(audioUrl);
              delete audioBufferRef.current[bufferKey];
              let nextPreloadedAudio = null;
              if (nextAudioElementPromise) {
                  try {
                      const raceTimeout = new Promise(r => setTimeout(() => r(null), 300));
                      nextPreloadedAudio = await Promise.race([nextAudioElementPromise, raceTimeout]);
                      if (nextPreloadedAudio) {
                          nextPreloadedAudio.muted = false;
                      }
                  } catch (e) {
                  }
              }
              playSequence(index + 1, sentences, sessionId, mode, voiceMap, nextSpeaker, nextPreloadedAudio, 0, speakerName, deps);
          };
          audio.onerror = (e) => {
              if (watchdogTimer) clearTimeout(watchdogTimer);
              handlePlaybackError(e);
          };
          let watchdogTimer = null;
          let gaplessTriggered = false;
          audio.addEventListener('timeupdate', () => {
              if (gaplessTriggered || !audio.duration || !isFinite(audio.duration)) return;
              const remaining = (audio.duration - audio.currentTime) / playbackRateRef.current;
              if (remaining < 0.15 && remaining > 0) {
                  gaplessTriggered = true;
                  if (nextAudioElementPromise) {
                      nextAudioElementPromise.then(nextAudio => {
                          if (nextAudio && playbackSessionRef.current === sessionId) {
                              nextAudio.muted = false;
                              nextAudio.playbackRate = playbackRateRef.current;
                          }
                      }).catch(() => {});
                  }
              }
          });
          const playPromise = audio.play();
          if (playPromise !== undefined) {
              playPromise
                  .then(() => {
                      if (!isPaused) setIsPlaying(true);
                      setIsGeneratingAudio(false);
                      const duration = audio.duration;
                      if (duration && isFinite(duration)) {
                          const safeDuration = (duration * 1000) / playbackRateRef.current;
                          watchdogTimer = setTimeout(() => {
                              warnLog(`Watchdog triggered for segment ${index}`);
                              if (playbackSessionRef.current === sessionId && audioRef.current === audio) {
                                  audio.pause();
                                  audio.onended();
                              }
                          }, safeDuration + 2000);
                      }
                  })
                  .catch(error => {
                      if (watchdogTimer) clearTimeout(watchdogTimer);
                      if (error.name !== 'AbortError') {
                          handlePlaybackError(error);
                      }
                  });
          }
      } catch (err) {
          if (playbackSessionRef.current === sessionId) {
              if (err.message && err.message.includes("finishReason: OTHER")) {
                  setTimeout(() => {
                        playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1, speakerName, deps);
                  }, 500);
              } else {
                  warnLog("Critical Playback Error:", err);
                  if (retryCount < 2) {
                      setTimeout(() => {
                          playSequence(index, sentences, sessionId, mode, voiceMap, activeSpeaker, null, retryCount + 1, speakerName, deps);
                      }, 500);
                  } else {
                      playSequence(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker, null, 0, speakerName, deps);
                  }
              }
          }
      }
};

const handleSpeak = async (text, contentId, startIndex = 0, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleSpeak fired"); } catch(_) {}
    const now = Date.now();
    if (contentId && lastHandleSpeakRef.current &&
        contentId === lastHandleSpeakRef.current.id &&
        startIndex === lastHandleSpeakRef.current.index &&
        (now - lastHandleSpeakRef.current.time) < 250) {
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
    if (typeof pendingSpeechTimerRef !== 'undefined' && pendingSpeechTimerRef?.current) {
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
        const effectiveText = (!text.includes(' ') && text.length < 100) ? t(text) : text;
    if (text && text.includes(' ') && text.length < 50 && !isSystemAudioActiveRef.current && !_isCanvasEnv) {
        const parts = text.split(' ').map(w => w.trim().replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 2);
        if (parts.length > 1 && parts.length < 5) {
             parts.forEach(part => {
                 if (!internalAudioCache.current.has(part)) {
                     callTTS(part, selectedVoice, 1, 2, leveledTextLanguage).then(url => {
                         if (url) internalAudioCache.current.set(part, url);
                     }).catch(e => warnLog("Glossary TTS pre-cache failed:", e?.message || e));
                 }
             });
        }
    }
    if (contentId && (contentId.startsWith('term-') || contentId.startsWith('def-'))) {
        if (glossaryAudioCache.current.has(effectiveText)) {
            console.log("[handleSpeak] ⚡ Glossary CACHE HIT:", effectiveText.substring(0, 30));
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
            audio.play().catch(e => warnLog("Cached playback failed", e));
            return;
        }
    }
    if (contentId && (contentId === 'simplified-main' || contentId === 'adventure-active' || contentId === 'faq-active' || contentId.startsWith('persona-message-'))) {
        let cleanSentences = [];
        const isTable = (p) => p.trim().startsWith('|') || p.includes('\n|');
        const parts = getSideBySideContent(effectiveText);
        if (parts) {
            const sourceSentences = parts.source.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
            const targetSentences = parts.target.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
            cleanSentences = [...sourceSentences, ...targetSentences];
        } else {
            const paragraphs = effectiveText.split(/\n{2,}/);
            cleanSentences = paragraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
        }
        if (contentId === 'adventure-active' && adventureState.currentScene && adventureState.currentScene.options) {
             const optionTexts = adventureState.currentScene.options.map(opt =>
                 typeof opt === 'object' && opt?.action ? opt.action : (typeof opt === 'string' ? opt : String(opt))
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
        if (contentId.startsWith('persona-message-')) {
            const _msgIdx = parseInt(contentId.replace('persona-message-', ''), 10);
            const _msg = personaState.chatHistory[_msgIdx];
            if (_msg && _msg.speakerName) personaSpeakerName = _msg.speakerName;
        }
        setPlayingContentId(contentId);
        setIsPlaying(true);
        setIsPaused(false);
        setPlaybackState({ sentences: cleanSentences, currentIdx: startIndex });
        let mode = 'standard';
        let voiceMap = {};
        let activeSpeaker = selectedVoice;
        if (contentId === 'adventure-active') {
            mode = 'adventure';
            voiceMap = adventureState.voiceMap;
        } else if (textFormat === 'Podcast Script' && contentId === 'simplified-main') {
             mode = 'script';
             voiceMap = { "Alex": "Fenrir", "Sam": "Aoede" };
        } else if (contentId === 'faq-active') {
             cleanSentences = [];
             mode = 'standard';
             if (generatedContent && generatedContent?.data && Array.isArray(generatedContent?.data)) {
                  generatedContent?.data.forEach(item => {
                      if (item.question) cleanSentences.push(...splitTextToSentences(item.question).filter(s => s.trim().length > 0));
                      if (item.answer) cleanSentences.push(...splitTextToSentences(item.answer).filter(s => s.trim().length > 0));
                  });
             } else {
                  warnLog("FAQ Data missing in handleSpeak, using raw text fallback");
                  if (effectiveText) {
                      const sections = effectiveText.split(/\n{2,}/);
                      cleanSentences = sections.flatMap(s => splitTextToSentences(s)).filter(s => s.trim().length > 0);
                  }
             }
        } else if (contentId.startsWith('persona-message-')) {
             mode = 'persona';
             const msgIdx = parseInt(contentId.replace('persona-message-', ''), 10);
             const msg = personaState.chatHistory[msgIdx];
             if (msg && msg.role === 'model') {
                 const isPanelMode = personaState.selectedCharacters && personaState.selectedCharacters.length > 0;
                 if (isPanelMode && msg.speakerName) {
                     const speakingChar = personaState.selectedCharacters.find(c => c.name === msg.speakerName);
                     if (speakingChar) {
                         if (speakingChar.voice) {
                             activeSpeaker = speakingChar.voice;
                         } else {
                             const charHash = speakingChar.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                             activeSpeaker = AVAILABLE_VOICES[charHash % AVAILABLE_VOICES.length];
                         }
                     } else {
                         const fallbackChar = personaState.selectedCharacters[0];
                         const charHash = fallbackChar.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                         activeSpeaker = AVAILABLE_VOICES[charHash % AVAILABLE_VOICES.length];
                     }
                 } else if (personaState.selectedCharacter) {
                     if (personaState.selectedCharacter.voice) {
                         activeSpeaker = personaState.selectedCharacter.voice;
                     } else {
                         const charName = personaState.selectedCharacter.name;
                         const hash = charName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
        playSequence(startIndex, cleanSentences, sessionId, mode, voiceMap, activeSpeaker, null, 0, personaSpeakerName, deps);
    } else {
        setIsGeneratingAudio(true);
        setPlayingContentId(contentId);
        try {
            const audioUrl = await callTTS(effectiveText, selectedVoice, 1, 2, leveledTextLanguage);
            addBlobUrl(audioUrl);
            const audio = new Audio(audioUrl);
            if (contentId && (contentId.startsWith('term-') || contentId.startsWith('def-'))) {
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
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                        warnLog("Audio play failed:", error);
                    }
                    if (error.name !== 'AbortError') {
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                        setPlayingContentId(null);
                    }
                });
            }
            setIsPlaying(true);
        } catch (err) {
            setError(t('errors.speech_generation_failed'));
            setIsPlaying(false);
            isPlayingRef.current = false;
            setPlayingContentId(null);
        } finally {
            setIsGeneratingAudio(false);
        }
    }
};

const syncProgressToFirestore = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] syncProgressToFirestore fired"); } catch(_) {}
      if (isCanvas) return;
      if (!activeSessionCode || !studentNickname) return;
      try {
          setIsProgressSyncing(true);
          const safeId = studentNickname.replace(/[^a-zA-Z0-9_-]/g, '_');
          const progressRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode, 'studentProgress', safeId);
          const quizAvg = (() => {
              const quizItems = history.filter(h => h.type === 'quiz');
              let total = 0, count = 0;
              quizItems.forEach(quiz => {
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
                  total += (correct / questions.length) * 100;
                  count++;
              });
              return count > 0 ? Math.round(total / count) : 0;
          })();
          const wsAcc = wordSoundsHistory?.length > 0
              ? Math.round((wordSoundsHistory.filter(h => h.correct).length / wordSoundsHistory.length) * 100)
              : 0;
          const progressData = {
              studentNickname,
              lastSynced: new Date().toISOString(),
              stats: {
                  quizAvg,
                  wsAccuracy: wsAcc,
                  fluencyWCPM: fluencyAssessments?.length > 0 ? (fluencyAssessments[fluencyAssessments.length - 1]?.wcpm || 0) : 0,
                  gamesPlayed: gameCompletions?.length || 0,
                  totalActivities: (history?.length || 0) + (wordSoundsHistory?.length > 0 ? 1 : 0) + (gameCompletions?.length || 0),
                  labelChallengeAvg: labelChallengeResults?.length > 0
                      ? Math.round(labelChallengeResults.reduce((a, b) => a + (b.score || 0), 0) / labelChallengeResults.length)
                      : 0,
                  globalPoints: globalPoints || 0,
                  wsWordsCompleted: wordSoundsHistory?.filter(h => h.correct)?.length || 0,
                  focusRatio: getFocusRatio(),
                  engagedMinutes: focusData.engagedMinutes || 0,
                  idleMinutes: focusData.idleMinutes || 0,
                  focusStreak: focusData.longestStreak || 0,
                  pasteEventCount: pasteEvents.length,
                  storyForgeSubmissions: history.filter(h => h.type === 'storyforge-submission').length,
                  storyForgeLatest: (() => { const sf = history.filter(h => h.type === 'storyforge-submission').pop(); return sf ? { title: sf.data?.storyTitle, words: sf.data?.analytics?.totalWords, vocab: sf.data?.analytics?.vocabUsedCount, grade: sf.data?.analytics?.readingLevel?.grade, drafts: sf.data?.analytics?.draftCount } : null; })(),
                  dbqProgress: (() => {
                      try {
                          const dbqItems = history.filter(h => h.type === 'dbq');
                          if (dbqItems.length === 0) return null;
                          const latest = dbqItems[dbqItems.length - 1];
                          const resps = studentResponses[latest.id] || {};
                          const happNotes = resps._happNotes || {};
                          const docs = latest.data?.documents || [];
                          const docsAnalyzed = docs.filter(d => {
                              const dh = happNotes[d.id] || {};
                              return ['historical','audience','purpose','pointOfView'].some(k => dh[k]?.trim());
                          }).length;
                          const hasFeedback = docs.some(d => resps[`_docFeedback_${d.id}`] && typeof resps[`_docFeedback_${d.id}`] === 'object');
                          const essayWords = (resps._essayText || '').split(/\s+/).filter(Boolean).length;
                          const essayFeedback = resps._aiFeedback && typeof resps._aiFeedback === 'object' ? resps._aiFeedback.overallScore : null;
                          return { title: latest.data?.title, totalDocs: docs.length, docsAnalyzed, hasFeedback, essayWords, essayScore: essayFeedback };
                      } catch (e) { return null; }
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
              fluencyHistory: (fluencyAssessments || []).slice(-10).map(a => ({ wcpm: a.wcpm, date: a.timestamp || a.date })),
              gameScoreHistory: (gameCompletions || []).slice(-10).map(g => ({ score: g.score, game: g.game, date: g.timestamp || g.date })),
              flagSummary: (() => {
                  try {
                      const allText = [];
                      if (typeof socraticChatHistory !== 'undefined' && socraticChatHistory?.messages) {
                          socraticChatHistory.messages.filter(m => m.role === 'user').forEach(m => allText.push(m.text || m.content || ''));
                      }
                      const flags = allText.flatMap(t => SafetyContentChecker.check(t));
                      const summary = {};
                      flags.forEach(f => { summary[f.category] = (summary[f.category] || 0) + 1; });
                      if (typeof aiSafetyFlags !== 'undefined' && aiSafetyFlags.length > 0) {
                          aiSafetyFlags.forEach(f => { summary[f.category] = (summary[f.category] || 0) + 1; flags.push(f); });
                      }
                      return { total: flags.length, categories: summary, hasCritical: flags.some(f => f.severity === 'critical') };
                  } catch (e) { return { total: 0, categories: {}, hasCritical: false }; }
              })()
          };
          await setDoc(progressRef, progressData, { merge: true });
          setLastProgressSync(new Date());
          debugLog('[ProgressSync] Synced to Firestore for', studentNickname);
      } catch (err) {
          warnLog('[ProgressSync] Firestore sync failed:', err.message);
      } finally {
          setIsProgressSyncing(false);
      }
};

const executeSaveFile = (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] executeSaveFile fired"); } catch(_) {}
      if (!saveFileName.trim()) return;
      let currentLog = [...studentProgressLog];
      if (saveType === 'student') {
        const quizItems = history.filter(h => h.type === 'quiz');
        let totalScore = 0;
        let count = 0;
        quizItems.forEach(quiz => {
             const questions = quiz.data?.questions || [];
             if (!questions.length) return;
             let correct = 0;
             const studentResps = studentResponses[quiz.id] || {};
             questions.forEach((q, i) => {
                 const resp = studentResps[i];
                 if (resp !== undefined && resp !== null) {
                      let val = resp;
                      if (!isNaN(parseInt(resp)) && q.options && q.options[resp]) val = q.options[resp];
                      if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
                 }
             });
             const qScore = (correct / questions.length) * 100;
             totalScore += qScore;
             count++;
        });
        const avgQuiz = count > 0 ? Math.round(totalScore / count) : 0;
        const newLogEntry = {
            timestamp: new Date().toISOString(),
            xp: globalPoints,
            level: adventureState.level,
            energy: adventureState.energy,
            quizAverage: avgQuiz,
            resourcesCreated: history.length
        };
        const lastEntry = currentLog[currentLog.length - 1];
        if (lastEntry && (new Date() - new Date(lastEntry.timestamp) < 60000)) {
            currentLog[currentLog.length - 1] = newLogEntry;
        } else {
            currentLog.push(newLogEntry);
        }
        setStudentProgressLog(currentLog);
      }
      const filename = saveFileName.trim().endsWith('.json') ? saveFileName.trim() : `${saveFileName.trim()}.json`;
      let dataStr = "";
      if (saveType === 'teacher') {
          dataStr = JSON.stringify({
              mode: isIndependentMode ? 'independent' : 'teacher',
              history: history,
              timestamp: new Date(),
              progressLog: studentProgressLog,
              responses: studentResponses,
              studentNickname: studentNickname,
              probeHistory: probeHistory,
              interventionLogs: interventionLogs,
              surveyResponses: surveyResponses,
              fidelityLog: fidelityLog,
              sessionCounter: sessionCounter,
              externalCBMScores: externalCBMScores
          }, null, 2);
      } else {
          const studentHistory = history.filter(item => !['udl-advice', 'brainstorm'].includes(item.type));
          dataStr = JSON.stringify({
              mode: 'student',
              studentNickname: studentNickname,
              history: studentHistory,
              responses: studentResponses,
              settings: {
                  ...studentProjectSettings,
                  researchMode: researchMode,
                  defaultAdventureConfig: {
                      difficulty: adventureDifficulty,
                      mode: adventureInputMode,
                      language: adventureLanguageMode,
                      instructions: adventureCustomInstructions,
                      chanceMode: adventureChanceMode,
                      freeResponse: adventureFreeResponseEnabled
                  }
              },
              adventureSnapshot: (adventureState.turnCount > 0 || adventureState.xp > 0) ? {
                  xp: adventureState.xp,
                  gold: adventureState.gold,
                  energy: adventureState.energy,
                  level: adventureState.level,
                  xpToNextLevel: adventureState.xpToNextLevel,
                  inventory: adventureState.inventory || [],
                  narrativeLedger: adventureState.narrativeLedger || '',
                  stats: adventureState.stats,
                  currentScene: adventureState.currentScene,
                  history: adventureState.history || [],
                  turnCount: adventureState.turnCount || 0,
                  climax: adventureState.climax,
                  debateMomentum: adventureState.debateMomentum,
                  missionReportDismissed: adventureState.missionReportDismissed,
                  timestamp: new Date().toISOString()
              } : null,
              escapeRoomStats: escapeRoomState.isEscaped || escapeRoomState.totalXpEarned > 0 ? {
                  xpEarned: escapeRoomState.totalXpEarned || 0,
                  timeTaken: escapeRoomState.timeElapsed || 0,
                  puzzlesSolved: Object.values(escapeRoomState.solvedPuzzles || {}).filter(Boolean).length,
                  totalPuzzles: escapeRoomState.puzzles?.length || 0,
                  wrongAttempts: escapeRoomState.wrongAttempts || 0,
                  hintsUsed: escapeRoomState.hintsRevealed?.length || 0,
                  difficulty: escapeRoomState.difficulty || 'normal',
                  completedAt: escapeRoomState.isEscaped ? new Date().toISOString() : null
              } : null,
              gameCompletions: gameCompletions,
              labelChallengeResults: labelChallengeResults,
              socraticChatHistory: socraticMessages.length > 0 ? {
                  messages: socraticMessages,
                  messageCount: socraticMessages.length,
                  savedAt: new Date().toISOString()
              } : null,
              wordSoundsState: {
                  history: wordSoundsHistory,
                  badges: wordSoundsBadges,
                  phonemeMastery: phonemeMastery,
                  dailyProgress: wordSoundsDailyProgress,
                  confusionPatterns: wordSoundsConfusionPatterns,
                  families: wordSoundsFamilies,
                  audioLibrary: wordSoundsAudioLibrary,
                  sessionScore: wordSoundsScore
              },
              fluencyAssessments: fluencyAssessments,
              flashcardEngagement: flashcardEngagement,
              timeOnTask: timeOnTask,
              globalPoints: globalPoints,
              pointHistory: pointHistory,
              completedActivities: Array.from(completedActivities.entries()),
              progressLog: currentLog,
              probeHistory: probeHistory,
              interventionLogs: interventionLogs,
              surveyResponses: surveyResponses,
              fidelityLog: fidelityLog,
              sessionCounter: sessionCounter,
              externalCBMScores: externalCBMScores,
              timestamp: new Date()
          }, null, 2);
          if (adventureState.turnCount > 0 || adventureState.xp > 0) {
              addToast(t('student.adventure_saved'), "info");
          }
      }
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast(`Project saved as ${filename}`, "success");
      setLastJsonFileSave(Date.now());
      setIsSaveActionPulsing(false);
      setShowSaveModal(false);
};

const formatInlineText = (text, enableGlossary = true, isDarkBg = false, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] formatInlineText fired"); } catch(_) {}
      if (!text) return null;
      if (typeof text !== 'string') {
          warnLog("formatInlineText received non-string:", text);
          return String(text);
      }
      const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\[.*?\]\(resource:.*?\)|\[.*?\]\(.*?\)|https?:\/\/[^\s"']+(?<![.,;)])|`[^`]*`|\*\*.*?\*\*|\*.*?\*|==.*?==)/g);
      return parts.map((part, pIdx) => {
          if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('$$') && part.endsWith('$$'))) {
              return <React.Fragment key={pIdx}><MathSymbol text={part} /></React.Fragment>;
          }
          const resourceMatch = part.match(/^\[(.*?)\]\(resource:(.*?)\)$/);
          if (resourceMatch) {
            const label = resourceMatch[1];
            const resourceId = resourceMatch[2];
            return (
                <button
                    aria-label={t('common.open_in_new_tab')}
                    key={pIdx}
                    onClick={(e) => {
                        e.stopPropagation();
                        const targetItem = history.find(h => h.id === resourceId);
                        if (targetItem) {
                            handleRestoreView(targetItem);
                            addToast(`Jumped to: ${targetItem.title || getDefaultTitle(targetItem.type)}`, "success");
                        } else {
                            addToast(t('toasts.resource_not_found_history'), "error");
                        }
                    }}
                    className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 align-baseline border border-indigo-200 mx-1 text-xs transition-colors hover:bg-indigo-100"
                    title={t('common.click_to_open')}
                >
                    <ExternalLink size={10} /> {label}
                </button>
            );
          }
          if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
              const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
              if (match) {
                  const label = match[1];
                  const url = match[2];
                  if (url.startsWith('resource:')) {
                      const resourceId = url.split(':')[1];
                      return (
                          <button
                              aria-label={t('common.open_in_new_tab')}
                              key={pIdx}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  const targetItem = history.find(h => h.id === resourceId);
                                  if (targetItem) {
                                      handleRestoreView(targetItem);
                                      addToast(`Jumped to: ${targetItem.title || getDefaultTitle(targetItem.type)}`, "success");
                                  } else {
                                      addToast(t('toasts.resource_not_found'), "error");
                                  }
                              }}
                              className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer inline-flex items-center gap-1 align-baseline border border-indigo-200 mx-1 text-xs transition-colors hover:bg-indigo-100"
                              title={t('common.click_to_open')}
                          >
                              <ExternalLink size={10} /> {label}
                          </button>
                      );
                  }
                  const isCitation = match[1].startsWith('⁽') && match[1].endsWith('⁾');
                  return (
                      <a
                        key={pIdx}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-blue-600 ${isCitation ? 'no-underline' : 'underline'} hover:text-blue-800 z-20 relative font-medium`}
                        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
                      >
                          {match[1]}
                      </a>
                  );
              }
          }
           if (part.match(/^https?:\/\//)) {
               let displayText = part;
              if (part.includes('vertexaisearch') || part.includes('grounding-api')) {
                  displayText = '[Source Ref]';
              } else if (part.length > 40) {
                   try {
                       const urlObj = new URL(part);
                       displayText = urlObj.hostname + (urlObj.pathname.length > 1 ? '/...' : '');
                   } catch (e) {
                       displayText = part.substring(0, 30) + '...';
                   }
              }
              return (
                  <a
                    key={pIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 z-20 relative break-all cursor-pointer"
                    role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
                    title={part}
                  >
                      {displayText}
                  </a>
              );
          }
          const isBold = part.startsWith('**') && part.endsWith('**');
          const isItalic = part.startsWith('*') && part.endsWith('*');
          const isHighlight = part.startsWith('==') && part.endsWith('==');
          const isCode = part.startsWith('`') && part.endsWith('`');
          let content = part;
          if (isBold) content = part.slice(2, -2);
          else if (isItalic) content = part.slice(1, -1);
          else if (isHighlight) content = part.slice(2, -2);
          else if (isCode) content = part.slice(1, -1);
          const subParts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);
          const renderedSubParts = subParts.filter(sp => sp != null).map((subPart, sIdx) => {
              if ((subPart.startsWith('$') && subPart.endsWith('$')) || (subPart.startsWith('$$') && subPart.endsWith('$$'))) {
                  return <React.Fragment key={sIdx}><MathSymbol text={subPart} /></React.Fragment>;
              }
              if (enableGlossary) {
                  const glossed = highlightGlossaryTerms(subPart, latestGlossary, false, isDarkBg);
                  if (focusMode) {
                      if (Array.isArray(glossed)) {
                          return glossed.map((g, gIdx) => {
                              if (typeof g === 'string') return <React.Fragment key={gIdx}>{toFocusText(g)}</React.Fragment>;
                              return <React.Fragment key={gIdx}>{g}</React.Fragment>;
                          });
                      } else if (typeof glossed === 'string') {
                          return <React.Fragment key={sIdx}>{toFocusText(glossed)}</React.Fragment>;
                      }
                  }
                  return <React.Fragment key={sIdx}>{glossed}</React.Fragment>;
              } else {
                  if (focusMode) {
                      return <React.Fragment key={sIdx}>{toFocusText(subPart)}</React.Fragment>;
                  }
                  return <React.Fragment key={sIdx}>{subPart}</React.Fragment>;
              }
          });
          if (isBold) {
              return <strong key={pIdx} className={`font-bold ${isDarkBg ? 'text-white' : 'text-indigo-900'}`}>{renderedSubParts}</strong>;
          }
          if (isItalic) {
              return <em key={pIdx} className={`italic ${isDarkBg ? 'text-indigo-200' : 'text-indigo-800'}`}>{renderedSubParts}</em>;
          }
          if (isHighlight) {
              return <mark key={pIdx} className="bg-yellow-200 text-indigo-900 px-0.5 rounded">{renderedSubParts}</mark>;
          }
          if (isCode) {
              return <code key={pIdx} className="bg-slate-100 text-pink-600 px-1 rounded font-mono text-xs border border-slate-400">{renderedSubParts}</code>;
          }
          return <span key={pIdx}>{renderedSubParts}</span>;
      });
};

const autoConfigureSettings = async (text, grade, standards, language, customInput, existingResources = [], targetCount = 'Auto', deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] autoConfigureSettings fired"); } catch(_) {}
    setGenerationStep(t('status_steps.analyzing_topology'));
    try {
        const userCustomBlock = customInput && customInput.trim().length > 0
            ? `USER'S SPECIAL REQUEST: "${customInput}" (Prioritize this over general analysis)`
            : "";
        const standardsBlock = standards && standards.trim().length > 0
            ? `Mandatory Standards: ${standards}`
            : "Mandatory Standards: None specific (Focus on general comprehension)";
        let existingBlock = "ALREADY GENERATED: None";
        if (existingResources.length > 0) {
            const resourceSummaries = history.filter(h => h.type && h.type !== 'lesson-plan').slice(-15).map(h => {
                const type = h.type;
                const data = h.data || h.content || {};
                let summary = type;
                try {
                    if (type === 'persona' && Array.isArray(data)) {
                        summary = `persona: Characters available for interview: ${data.map(c => c.name || c.title || 'Unknown').join(', ')}`;
                    } else if (type === 'dbq' && data.title) {
                        summary = `dbq: "${data.title}" with ${(data.documents || []).length} documents. Includes: ${(data.documents || []).map(d => d.title || d.id).join(', ')}`;
                    } else if (type === 'quiz' && data.questions) {
                        summary = `quiz: ${data.questions.length} questions covering: ${(data.questions.slice(0, 3).map(q => (q.question || '').substring(0, 50))).join('; ')}`;
                    } else if (type === 'glossary' && data.terms) {
                        summary = `glossary: ${data.terms.length} terms including: ${data.terms.slice(0, 5).map(t2 => t2.term || t2.word || '').join(', ')}`;
                    } else if (type === 'timeline' && data.events) {
                        summary = `timeline: ${data.events.length} events from "${(data.events[0]?.title || '').substring(0, 30)}" to "${(data.events[data.events.length - 1]?.title || '').substring(0, 30)}"`;
                    } else if (type === 'adventure' && data.title) {
                        summary = `adventure: "${data.title}" — ${data.mode || 'choice'} mode`;
                    } else if (type === 'concept-sort' && data.categories) {
                        summary = `concept-sort: Categories: ${data.categories.map(c => c.name || c.label || '').join(', ')}`;
                    } else if (type === 'simplified' && typeof data === 'string') {
                        summary = `simplified: ${data.substring(0, 80)}...`;
                    } else if (type === 'analysis' && typeof data === 'string') {
                        summary = `analysis: ${data.substring(0, 80)}...`;
                    } else if (h.title) {
                        summary = `${type}: "${h.title}"`;
                    }
                } catch(e) { summary = type; }
                return summary;
            });
            existingBlock = `ALREADY GENERATED RESOURCES (reference these specifically in the lesson plan — tell teachers exactly which resource to use and what content it contains):\n${resourceSummaries.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`;
        }
        const VALID_TOOLS_LIST = "analysis, simplified, glossary, outline, image, quiz, sentence-frames, brainstorm, timeline, concept-sort, adventure, faq, persona, dbq";
        let countConstraint = "";
        let allowDuplicates = false;
        if (targetCount === 'All') {
            countConstraint = `CONSTRAINT: You MUST include ALL available resource types from this list: [${VALID_TOOLS_LIST}].`;
        } else if (targetCount !== 'Auto') {
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
            "${text.substring(0, 3000)}...",
            STEP 1: DIAGNOSE THE CONTENT TOPOLOGY
            Determine the best tools to teach this specific content. Available tools and when to use them:
            - **analysis**: Analyze source text for key ideas, vocabulary, structure. ALWAYS include as first resource.
            - **simplified**: Adapt text to a specific reading level. Good for differentiation.
            - **glossary**: Key vocabulary with definitions, examples, images. Essential for content-heavy texts.
            - **outline**: Visual organizer (Venn Diagram, Flow Chart, Structured Outline). Match to content topology.
            - **image**: AI-generated illustration of a key concept. Good for visual learners.
            - **quiz**: Assessment questions testing comprehension. Include after content resources.
            - **sentence-frames**: Scaffolded writing prompts. Good for ELL students or structured responses.
            - **brainstorm**: Open-ended idea generation around a topic.
            - **timeline**: Chronological sequence of events. Use for historical or procedural content.
            - **concept-sort**: Categorization activity — students sort terms into groups. Good for vocabulary/classification.
            - **adventure**: Interactive choose-your-own-adventure narrative. Good for engagement and decision-making.
            - **persona**: Interview historical figures, scientists, or literary characters AS IF they were real. Students ask questions and the character responds in-character with historically/textually accurate answers. EXCELLENT for history, literature, biography, social studies. Use when the text involves notable people, historical events, or characters with distinct perspectives. HIGHLY RECOMMENDED — do not overlook this tool.
            - **dbq**: Document-Based Question activity with primary sources, HAPP sourcing framework, corroboration analysis, synthesis essay, and rubric. Use for social studies, history, civics, or any text with multiple perspectives or viewpoints.
            STEP 2: IDENTIFY THE "GOLDEN THREAD"
            - What is the ONE main learning objective? Phrase it as a guiding "essential question" students will answer.
            - Pick 5 specific vocabulary terms that are critical to this objective.
            - Pick 3-5 core concepts (short phrases, not full sentences) that form the through-line of the lesson.
            - You MUST return these in the "lessonDNA" field of the response JSON (see schema below). This is not optional — downstream resources depend on it for alignment.
            STEP 3: CONFIGURE THE RESOURCE PLAN
            Create a sequential list of resources to generate.
            - **Analysis**: Always recommended first.
            - **Visuals**: Choose 'outline' type based on topology (e.g. Comparative -> Venn, Procedural -> Flow Chart).
            - **Assessment**: Quiz should test the Golden Thread.
            ${allowDuplicates ? '**HIGH VOLUME STRATEGY**: Since the target count is high, include complementary variations. Example: Generate a "Concept Sort" for vocabulary AND a "Timeline" for sequence.' : ''}
            **REDUNDANCY CHECK**:
            - Do NOT include resources already generated (see list above) unless the User's Special Request explicitly asks for them or if generating a variation.
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
        if (config.resourcePlan && !config.recommendedResources) {
            config.recommendedResources = [...new Set(config.resourcePlan.map(r => r.tool))];
            config.toolDirectives = {};
            config.resourcePlan.forEach(r => {
                config.toolDirectives[r.tool] = r.directive;
            });
        }
        if (config.resourcePlan && Array.isArray(config.resourcePlan)) {
            const analysisItems = config.resourcePlan.filter(r => r.tool === 'analysis');
            const planItems = config.resourcePlan.filter(r => r.tool === 'lesson-plan');
            const otherItems = config.resourcePlan.filter(r => r.tool !== 'analysis' && r.tool !== 'lesson-plan');
            config.resourcePlan = [...analysisItems, ...otherItems, ...planItems];
            config.recommendedResources = config.resourcePlan.map(r => r.tool);
        } else if (config.recommendedResources) {
            const analysisItems = config.recommendedResources.filter(r => r === 'analysis');
            const planItems = config.recommendedResources.filter(r => r === 'lesson-plan');
            const otherItems = config.recommendedResources.filter(r => r !== 'analysis' && r !== 'lesson-plan');
            config.recommendedResources = [...analysisItems, ...otherItems, ...planItems];
        }
        addToast(t('toasts.autoconfig_optimized'), "success");
        return config;
    } catch (e) {
        warnLog("Auto-config failed", e);
        return {};
    }
};

const translateResourceItem = async (item, targetLanguage, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] translateResourceItem fired"); } catch(_) {}
      if (['image', 'gemini-bridge', 'audio', 'udl-advice'].includes(item.type)) return item;
      const dataStr = JSON.stringify(item.data);
      let prompt = "";
      if (item.type === 'simplified') {
          let sourceText = typeof item.data === 'string' ? item.data : '';
          if (sourceText.includes('--- ENGLISH TRANSLATION ---')) {
              sourceText = sourceText.split('--- ENGLISH TRANSLATION ---')[1].trim();
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
      } else if (item.type === 'glossary') {
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
      } else if (item.type === 'quiz') {
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
          const result = await callGemini(prompt, item.type !== 'simplified');
          let newData;
          if (item.type === 'simplified') {
              newData = result;
          } else {
              newData = JSON.parse(cleanJson(result));
          }
          if (item.type === 'quiz') {
            if (!newData.questions || !Array.isArray(newData.questions)) newData.questions = [];
            if (!newData.reflections) newData.reflections = [];
          } else if (item.type === 'glossary') {
            if (!Array.isArray(newData)) {
                if (newData.terms && Array.isArray(newData.terms)) newData = newData.terms;
                else if (newData.items && Array.isArray(newData.items)) newData = newData.items;
                else newData = [];
            }
          } else if (item.type === 'sentence-frames') {
             if (!newData.items || !Array.isArray(newData.items)) newData.items = [];
             if (!newData.text) newData.text = "";
          } else if (item.type === 'outline') {
             if (!newData.branches || !Array.isArray(newData.branches)) newData.branches = [];
          } else if (item.type === 'timeline') {
             if (!Array.isArray(newData)) {
                 if (newData.events && Array.isArray(newData.events)) newData = newData.events;
                 else newData = [];
             }
          } else if (item.type === 'concept-sort') {
             if (!newData.categories || !Array.isArray(newData.categories)) newData.categories = [];
             if (!newData.items || !Array.isArray(newData.items)) newData.items = [];
          } else if (item.type === 'math') {
             if (!newData.problems || !Array.isArray(newData.problems)) newData.problems = [];
          } else if (item.type === 'lesson-plan') {
             const keys = ['objectives', 'essentialQuestion', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'];
             keys.forEach(k => {
                 if (!newData[k]) newData[k] = (k === 'objectives' ? [] : "");
             });
          } else if (item.type === 'faq') {
              if (!Array.isArray(newData)) {
                  if (newData.faqs && Array.isArray(newData.faqs)) newData = newData.faqs;
                  else if (newData.questions && Array.isArray(newData.questions)) newData = newData.questions;
                  else newData = [];
              }
          } else if (item.type === 'analysis') {
              if (!newData.concepts || !Array.isArray(newData.concepts)) {
                  newData.concepts = newData.concepts ? [String(newData.concepts)] : [];
              }
              if (!newData.grammar || !Array.isArray(newData.grammar)) newData.grammar = [];
              if (!newData.accuracy || typeof newData.accuracy !== 'object') {
                  newData.accuracy = { rating: "Unknown", reason: "Translation missing accuracy data." };
              }
              if (!newData.readingLevel) {
                   newData.readingLevel = { range: "N/A", explanation: "Translation missing level data." };
              } else if (typeof newData.readingLevel === 'string') {
                   newData.readingLevel = { range: newData.readingLevel, explanation: "" };
              }
              if (!newData.originalText && item.data.originalText) {
                  newData.originalText = item.data.originalText;
              }
          } else if (item.type === 'brainstorm') {
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
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleSaveReflection fired"); } catch(_) {}
      if ((!personaState.selectedCharacter && personaState.mode !== 'panel') || !personaReflectionInput.trim()) return;
      setIsGradingReflection(true);
      let subjectName = "Interview";
      let contextData = "";
      let chatLogText = "";
      if (personaState.mode === 'panel') {
          const charA = personaState.selectedCharacters[0];
          const charB = personaState.selectedCharacters[1];
          subjectName = `${charA?.name || 'A'} & ${charB?.name || 'B'}`;
          contextData = `Panel Debate on topic: ${sourceTopic || "General"}`;
          chatLogText = personaState.chatHistory.map(m => `${m.role === 'user' ? 'Student' : (m.speakerName || 'Panelist')}: ${m.text}`).join('\n');
      } else {
          const char = personaState.selectedCharacter;
          subjectName = char.name;
          contextData = char.context;
          chatLogText = personaState.chatHistory.map(m => `${m.role === 'user' ? 'Student' : char.name}: ${m.text}`).join('\n');
      }
      try {
          const standardsContext = targetStandards && targetStandards.length > 0 ? targetStandards.join('; ') : null;
          const dokContext = dokLevel || null;
          const prompt = `
            You are a teacher evaluating a student's reflection.
            Subject: ${subjectName}
            Context: ${contextData}
            ${standardsContext ? `TARGET STANDARDS: "${standardsContext}"` : ''}
            ${dokContext ? `TARGET WEBB'S DOK: "${dokContext}"` : ''}
            Transcript Summary (Last few turns):
            "${chatLogText.substring(Math.max(0, chatLogText.length - 2000))}",
            Student Reflection:
            "${personaReflectionInput}",
            Task:
            Evaluate the student's reflection based on:
            1. Depth of insight (Did they identify a specific learning takeaway?)
            2. Connection to context.
            ${standardsContext ? '3. Alignment with the Target Standards.' : ''}
            Respond to the user in ${currentUiLanguage}.
            Return ONLY JSON:
            {
                "score": number (0-100),
                "feedback": "Brief, encouraging feedback (1-2 sentences).${standardsContext || dokContext ? ' Comment on their mastery of the standard/rigor if applicable.' : ''}",
                "xpBonus": number (0-50 based on quality)
            }
          `;
          const result = await callGemini(prompt, true);
          let grading = { score: 85, feedback: "Good reflection!", xpBonus: 20 };
          try {
              grading = JSON.parse(cleanJson(result));
          } catch (e) {
              warnLog("Grading JSON parse error, using default", e);
          }
          const totalXP = 10 + (grading.xpBonus || 0);
          const formattedChatLog = personaState.chatHistory.map(m => `**${m.role === 'user' ? 'Student' : (m.speakerName || subjectName)}:**\n${m.text}`).join('\n\n---\n\n');
          let metaHeader = `### 📝 Student Reflection\n`;
          if (standardsContext || dokContext) {
              metaHeader += `> *Graded against: ${standardsContext || ''} ${dokContext || ''}*\n\n`;
          }
          const fullData = `${formattedChatLog}\n\n---\n\n${metaHeader}${personaReflectionInput}\n\n> **Teacher Bot Feedback:** ${grading.feedback} (Score: ${grading.score}/100)`;
          const newItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'udl-advice',
              data: fullData,
              meta: `Reflection on ${subjectName} (Score: ${grading.score})`,
              title: `Reflection: ${subjectName}`,
              timestamp: new Date(),
              config: {}
          };
          setHistory(prev => [...prev, newItem]);
          handleScoreUpdate(totalXP, "Reflection Insight", newItem.id);
          let newlyEarnedBadges = [];
          if (grading.score >= 80 && !personaState.earnedBadges?.includes('master_interviewer')) {
              newlyEarnedBadges.push('master_interviewer');
              setPersonaState(prev => ({
                  ...prev,
                  earnedBadges: [...(prev.earnedBadges || []), 'master_interviewer']
              }));
              addToast(`🏆 ${t('persona.badges.master_interviewer')}!`, "success");
          }
          playSound('correct');
          setReflectionFeedback({
              score: grading.score,
              feedback: grading.feedback,
              xpEarned: totalXP,
              subjectName: subjectName
          });
      } catch (err) {
          warnLog("Reflection grading failed", err);
          addToast(t('toasts.reflection_grade_error'), "error");
          const formattedChatLog = personaState.chatHistory.map(m => `**${m.role === 'user' ? 'Student' : (m.speakerName || subjectName)}:**\n${m.text}`).join('\n\n---\n\n');
          const fullData = `${formattedChatLog}\n\n---\n\n### 📝 Student Reflection\n${personaReflectionInput}`;
          const newItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'udl-advice',
              data: fullData,
              meta: `Reflection on ${subjectName}`,
              title: `Reflection: ${subjectName}`,
              timestamp: new Date(),
              config: {}
          };
          setHistory(prev => [...prev, newItem]);
          setIsPersonaReflectionOpen(false);
          setPersonaReflectionInput('');
          setPersonaState(prev => ({ ...prev, selectedCharacter: null, chatHistory: [], suggestions: [], selectedCharacters: [], mode: 'single' }));
      } finally {
          setIsGradingReflection(false);
      }
};

const handleSocraticSubmit = async (inputOverride = null, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleSocraticSubmit fired"); } catch(_) {}
      const textToSend = inputOverride || socraticInput;
      if (!textToSend.trim()) return;
      const lower = textToSend.toLowerCase().trim();
      const navMatch = lower.match(/^(?:go\s+to|open|take\s+me\s+to|switch\s+to|show\s+me)\s+(?:the\s+)?(.+)$/i);
      const readMatch = /^(?:read|hear|what'?s?\s+on\s+(?:the\s+)?(?:screen|page)|describe|read\s+(?:this|the)\s+page)/i.test(lower);
      const histMatch = lower.match(/^(?:load|go\s+back\s+to|show)\s+(?:the\s+|my\s+)?(.+?)(?:\s+from\s+(?:earlier|before|history))?$/i);
      if (navMatch || readMatch) {
          const sendSocraticBotMsg = (text) => setSocraticMessages(prev => [...prev, { role: 'model', text }]);
          if (readMatch) {
              setShowReadThisPage(true);
              const items = getReadableContent();
              const summary = items.length > 0 ? items.slice(0, 3).map(i => i.text).join(' ') : 'No content to read yet.';
              sendSocraticBotMsg(summary);
              setIsSocraticThinking(false);
              return;
          }
          if (navMatch) {
              const viewMap = {
                glossary: 'glossary', vocabulary: 'glossary', vocab: 'glossary', terms: 'glossary',
                quiz: 'quiz', 'exit ticket': 'quiz', assessment: 'quiz', test: 'quiz', questions: 'quiz',
                simplified: 'simplified', adapted: 'simplified', 'leveled text': 'simplified',
                analysis: 'analysis', 'content analysis': 'analysis',
                outline: 'outline', organizer: 'outline', 'visual organizer': 'outline',
                image: 'image', images: 'image', gallery: 'image', pictures: 'image',
                faq: 'faq', 'frequently asked': 'faq',
                'sentence frames': 'sentence-frames', scaffolds: 'sentence-frames', 'writing frames': 'sentence-frames',
                brainstorm: 'brainstorm', 'brainstorming': 'brainstorm',
                persona: 'persona', interview: 'persona', character: 'persona',
                timeline: 'timeline', sequence: 'timeline',
                'concept sort': 'concept-sort', 'concept map': 'concept-sort', sorting: 'concept-sort',
                math: 'math', stem: 'math', calculator: 'math',
                adventure: 'adventure', story: 'adventure', game: 'adventure',
                'lesson plan': 'lesson-plan', 'resource pack': 'lesson-plan',
                dashboard: 'dashboard', analytics: 'dashboard',
                input: 'input', source: 'input', 'source material': 'input',
                'word sounds': 'word-sounds', phonics: 'word-sounds',
                'alignment report': 'alignment-report', standards: 'alignment-report'
              };
              const rawTarget = navMatch[1].replace(/[?.!]/g, '').trim();
              const viewId = viewMap[rawTarget] || Object.keys(viewMap).find(k => rawTarget.includes(k));
              if (viewId) {
                  const resolvedView = viewMap[viewId] || viewId;
                  setActiveView(resolvedView);
                  setSocraticMessages(prev => [...prev, { role: 'user', text: textToSend }]);
                  if (!inputOverride) setSocraticInput('');
                  setTimeout(() => {
                      const items = getReadableContent();
                      const summary = items.length > 0 ? items[0].text : '';
                      const label = resolvedView.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      setSocraticMessages(prev => [...prev, { role: 'model', text: `Opening ${label}. ${summary}` }]);
                  }, 200);
                  setIsSocraticThinking(false);
                  return;
              }
          }
      }
      setIsSocraticThinking(true);
      const userMsg = { role: 'user', text: textToSend };
      setSocraticMessages(prev => [...prev, userMsg]);
      if (!inputOverride) {
          setSocraticInput('');
      }
      SafetyContentChecker.aiCheck(textToSend, 'socratic', apiKey, handleAiSafetyFlag);
      try {
          const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
          const sourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
              ? latestAnalysis.data.originalText
              : inputText;
          const snippet = sourceText.substring(0, 1000).replace(/\s+/g, ' ');
          const activeResource = generatedContent
              ? `${generatedContent.title || getDefaultTitle(generatedContent.type)} (${generatedContent.type})`
              : "No specific resource active";
          const lessonContext = `
            Target Grade Level: ${gradeLevel}
            Current View: ${activeResource}
            Source Material Snippet: "${snippet}..."
          `;
          const conversationHistory = [...socraticMessages, userMsg].map(m =>
              `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`
          ).join('\n');
          const finalPrompt = `
            ${SOCRATIC_SYSTEM_PROMPT}
            Respond to the user in ${currentUiLanguage}.
            LESSON CONTEXT:
            ${lessonContext}
            CONVERSATION HISTORY:
            ${conversationHistory}
            Tutor:
          `;
          const result = await callGemini(finalPrompt);
          setSocraticMessages(prev => [...prev, { role: 'model', text: result }]);
      } catch (error) {
          warnLog("Socratic Error:", error);
           const isQuota = error.isQuota || (error.message && error.message.includes('API_QUOTA_EXHAUSTED'));
           const msg = isQuota
             ? "⚠️ **API quota reached.** The API key has hit its usage limit. Please wait and try again. Browser speech still works for reading content aloud."
             : "I'm having trouble thinking right now. Please try again.";
           setSocraticMessages(prev => [...prev, { role: 'model', text: msg }]);
      } finally {
          setIsSocraticThinking(false);
      }
};

const toggleFluencyRecording = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] toggleFluencyRecording fired"); } catch(_) {}
      try {
          if (fluencyStatus === 'idle' || fluencyStatus === 'complete') {
              setFluencyTranscript(t('fluency.listening'));
              setFluencyResult(null);
              setFluencyFeedback('');
              setShowFluencyConfetti(false);
              if (fluencyTimeLimit > 0) {
                  setFluencyTimeRemaining(fluencyTimeLimit);
              }
              await startFluencyRecording();
              fluencyStartTimeRef.current = Date.now();
              setFluencyStatus('listening');
          } else if (fluencyStatus === 'listening') {
              setFluencyStatus('processing');
              setFluencyTranscript(t('fluency.processing'));
              const audioData = await stopFluencyRecording();
              const durationMs = Date.now() - fluencyStartTimeRef.current;
              const durationSeconds = durationMs / 1000;
              if (audioData) {
                  let sourceText = "";
                  if (typeof generatedContent?.data === 'string') {
                      sourceText = generatedContent?.data.split('--- ENGLISH TRANSLATION ---')[0];
                      sourceText = sourceText.replace(/^#{1,6}\s/gm, '').replace(/\*{1,3}/g, '').replace(/[`~]/g, '');
                  } else if (generatedContent?.data?.originalText) {
                      sourceText = generatedContent?.data.originalText;
                  }
                  sourceText = sourceText.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
                  sourceText = sourceText.replace(/https?:\/\/[^\s]+/g, '');
                  sourceText = sourceText.replace(/\[\d+\]/g, '');
                  sourceText = sourceText.replace(/[⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '');
                  sourceText = sourceText.replace(/\[Source\s*Ref\]/gi, '');
                  const cleanSource = sourceText.trim().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
                  const totalReferenceWordCount = cleanSource.length > 0 ? cleanSource.split(' ').length : 0;
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
                          accuracy: accuracy,
                          wcpm: wcpm
                      };
                      const fluencyRecordItem = {
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                          type: 'fluency-record',
                          title: `Oral Fluency Check (${accuracy}%)`,
                          timestamp: new Date(),
                          meta: `${wcpm} WCPM - ${Math.round(durationSeconds)}s`,
                          data: {
                              audioRecording: audioData.base64,
                              mimeType: audioData.mimeType || 'audio/webm',
                              fullAnalysis: analysis,
                              wordData: finalResult.wordData,
                              feedback: finalResult.feedback,
                              sourceText: sourceText,
                              metrics: {
                                  accuracy,
                                  wcpm,
                                  durationSeconds,
                                  totalWords: totalReferenceWordCount
                              }
                          },
                          config: {}
                      };
                      setHistory(prev => [...prev, fluencyRecordItem]);
                      setFluencyResult(finalResult);
                      setFluencyFeedback(finalResult.feedback);
                      setFluencyStatus('complete');
                      let earnedXP = 0;
                      if (finalResult.accuracyScore > 80) {
                          earnedXP = 50;
                          if (finalResult.accuracyScore > 90) {
                              earnedXP += 50;
                              setShowFluencyConfetti(true);
                          }
                          playSound('correct');
                          handleScoreUpdate(earnedXP, "Oral Fluency Check", generatedContent.id);
                          addToast(`Great Reading! +${earnedXP} XP`, "success");
                      } else {
                          playSound('click');
                      }
                  } else {
                      addToast(t('toasts.analysis_failed'), "error");
                      setFluencyStatus('idle');
                  }
              } else {
                  setFluencyStatus('idle');
              }
          }
      } catch (e) { warnLog("Unhandled error in toggleFluencyRecording:", e); }
};

const handleFixGrammarErrors = async (deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] handleFixGrammarErrors fired"); } catch(_) {}
    if (selectedGrammarErrors.size === 0) {
        showToast(t('process.select_error') || 'Please select at least one error to fix.', 'warning');
        return;
    }
    setIsProcessing(true);
    showToast(t('process.fixing_grammar') || 'Fixing grammar errors...', 'info');
    try {
        const grammarData = generatedContent?.data?.grammar || [];
        const selectedErrorTexts = [];
        grammarData.forEach((error, idx) => {
            if (selectedGrammarErrors.has(idx) && !error.startsWith('✓ FIXED:')) {
                selectedErrorTexts.push(error);
            }
        });
        const originalText = inputText;
        let correctedText = originalText;
        for (const errorDesc of selectedErrorTexts) {
            const errorKeywords = errorDesc.match(/["']([^"']+)["']/g)?.map(s => s.replace(/["']/g, '')) || [];
            let targetSentence = '';
            if (errorKeywords.length > 0) {
                const sentences = correctedText.split(/(?<=[.!?])\s+/);
                for (const sentence of sentences) {
                    if (errorKeywords.some(kw => sentence.includes(kw))) {
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
                const cleanedFix = fixedSegment.trim().replace(/^["']|["']$/g, '');
                correctedText = correctedText.replace(targetSentence, cleanedFix);
            }
        }
        const lengthChange = Math.abs(correctedText.length - originalText.length) / originalText.length;
        if (lengthChange > 0.15) {
            warnLog(`Grammar fix length change too large: ${(lengthChange * 100).toFixed(1)}%`);
            showToast(t('process.grammar_fix_truncation') || 'Text changed significantly. Please try again with fewer errors selected.', 'warning');
            setIsProcessing(false);
            return;
        }
        if (correctedText && correctedText.trim()) {
            setInputText(correctedText.trim());
            const updatedGrammar = grammarData.map((error, idx) => {
                if (selectedGrammarErrors.has(idx) && !error.startsWith('✓ FIXED:')) {
                    return '✓ FIXED: ' + error;
                }
                return error;
            });
            setGeneratedContent(prev => ({
                ...prev,
                data: { ...prev.data, grammar: updatedGrammar }
            }));
            setSelectedGrammarErrors(new Set());
            showToast(t('process.grammar_fixed') || 'Grammar errors fixed!', 'success');
        } else {
            showToast(t('process.grammar_fix_failed') || 'Failed to fix grammar errors.', 'error');
        }
    } catch (error) {
        warnLog('Grammar fix error:', error);
        showToast(t('process.grammar_fix_failed') || 'Failed to fix grammar errors.', 'error');
    } finally {
        setIsProcessing(false);
    }
};

const performDeepVerification = async (fullText, deps) => {
  const { isPlaying, isPaused, isMuted, selectedVoice, voiceSpeed, voiceVolume, currentUiLanguage, leveledTextLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, sourceLength, sourceTone, textFormat, inputText, leveledTextCustomInstructions, standardsInput, targetStandards, dokLevel, history, generatedContent, pdfFixResult, fluencyAssessments, currentFluencyText, isFluencyRecording, fluencyAudioBlob, studentNickname, activeSessionCode, activeSessionAppId, appId, apiKey, studentResponses, studentReflections, socraticMessages, socraticInput, isSocraticThinking, socraticChatHistory, studentProjectSettings, persistedLessonDNA, isAutoConfigEnabled, resourceCount, fullPackTargetGroup, rosterKey, enableEmojiInline, isShowMeMode, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, playbackSessionRef, audioRef, isPlayingRef, playbackRateRef, persistentVoiceMapRef, lastReadTurnRef, projectFileInputRef, fluencyRecorderRef, fluencyChunksRef, fluencyStreamRef, setIsPlaying, setIsPaused, setPlayingContentId, setError, setSocraticMessages, setSocraticInput, setIsSocraticThinking, setSocraticChatHistory, setIsFluencyRecording, setFluencyAssessments, setFluencyAudioBlob, setCurrentFluencyText, setStudentReflections, setInputText, setIsExtracting, setGenerationStep, setIsProcessing, setActiveView, setGeneratedContent, setHistory, setSelectedLanguages, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callTTS, cleanJson, safeJsonParse, fetchTTSBytes, addBlobUrl, stopPlayback, splitTextToSentences, sanitizeTruncatedCitations, normalizeResourceLinks, extractSourceTextForProcessing, getReadableContent, handleGenerate, handleScoreUpdate, flyToElement, getStageElementId, detectClimaxArchetype, pcmToWav, pcmToMp3, storageDB, AVAILABLE_VOICES, SOCRATIC_SYSTEM_PROMPT, _isCanvasEnv, _ttsState, personaState, adventureState, glossaryAudioCache, playingContentId, aiSafetyFlags, focusData, gameCompletions, globalPoints, isCanvas, labelChallengeResults, pasteEvents, wordSoundsHistory, adventureChanceMode, adventureCustomInstructions, adventureDifficulty, adventureFreeResponseEnabled, adventureInputMode, adventureLanguageMode, completedActivities, escapeRoomState, externalCBMScores, fidelityLog, flashcardEngagement, interventionLogs, isIndependentMode, phonemeMastery, pointHistory, probeHistory, saveFileName, saveType, studentProgressLog, surveyResponses, timeOnTask, wordSoundsAudioLibrary, wordSoundsBadges, wordSoundsConfusionPatterns, wordSoundsDailyProgress, wordSoundsFamilies, wordSoundsScore, focusMode, latestGlossary, toFocusText, personaReflectionInput, fluencyStatus, fluencyTimeLimit, selectedGrammarErrors, audioBufferRef, activeBlobUrlsRef, alloBotRef, isSystemAudioActiveRef, lastHandleSpeakRef, playbackTimeoutRef, recognitionRef, fluencyStartTimeRef, setIsGeneratingAudio, setPlaybackState, setDoc, setIsProgressSyncing, setLastProgressSync, setIsSaveActionPulsing, setLastJsonFileSave, setShowSaveModal, setStudentProgressLog, setIsGradingReflection, setIsPersonaReflectionOpen, setPersonaReflectionInput, setPersonaState, setReflectionFeedback, setShowReadThisPage, setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeRemaining, setFluencyTranscript, setShowFluencyConfetti, setSelectedGrammarErrors, releaseBlob, getSideBySideContent, playSequence, sessionCounter, SafetyContentChecker, db, doc, getFocusRatio, MathSymbol, getDefaultTitle, handleRestoreView, highlightGlossaryTerms, playSound, handleAiSafetyFlag, analyzeFluencyWithGemini, calculateLocalFluencyMetrics, applyGlobalCitations, chunkText } = deps;
  try { if (window._DEBUG_PHASE_K) console.log("[PhaseK] performDeepVerification fired"); } catch(_) {}
      const chunks = chunkText(fullText, 6000);
      let combinedVerificationText = "";
      const globalSources = [];
      const sourceUrlToIndexMap = new Map();
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
                  if (typeof result === 'object' && result !== null) {
                      chunkRawText = result.text || "";
                      metadata = result.groundingMetadata;
                  } else {
                      chunkRawText = String(result || "");
                  }
                  let chunkTextWithGlobalCitations = chunkRawText;
                  if (metadata && metadata.groundingChunks) {
                      const localToGlobalIndexMap = new Map();
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
                      combinedVerificationText += `\n\n#### Segment ${i+1} Findings\n${chunkTextWithGlobalCitations}`;
                  }
              }
          } catch (err) {
               warnLog(`Verification failed for chunk ${i}`, err);
          }
          if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
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
  performDeepVerification,
};
