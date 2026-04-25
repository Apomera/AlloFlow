// misc_handlers_source.jsx - Phase H.3 of CDN modularization.
// handleFileUpload + handleLoadProject + detectClimaxArchetype
// extracted from AlloFlowANTI.txt 2026-04-25.

const handleFileUpload = async (e, deps) => {
  const { LargeFileHandler, callGeminiVision, addToast, t, warnLog, setShowLargeFileModal, setPendingLargeFile, setError, setIsExtracting, setGenerationStep, setInputText, setPendingPdfBase64, setPendingPdfFile, setPdfAuditResult } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] handleFileUpload fired"); } catch(_) {}
    const file = e.target.files[0];
    if (!file) return;
    if (LargeFileHandler.needsChunking(file)) {
        const fileType = LargeFileHandler.getFileType(file);
        if (fileType === 'audio') {
            setShowLargeFileModal(true);
            setPendingLargeFile(file);
            return;
        } else if (fileType === 'video') {
            setShowLargeFileModal(true);
            setPendingLargeFile(file);
            return;
        } else if (fileType === 'pdf') {
            if (file.size > 30 * 1024 * 1024) {
                setError(t('toasts.file_large') || 'PDF is too large (>30MB). Try splitting into smaller sections.');
                return;
            }
            addToast('Processing large PDF — this may take a moment...', 'info');
        } else {
            setError(t('toasts.file_large'));
            return;
        }
    }
    setIsExtracting(true);
    setGenerationStep(t('status_steps.extracting_text'));
    setError(null);
    const textMimeTypes = [
        'text/plain', 'text/markdown', 'text/csv', 'text/html', 'application/json',
        'application/xml', 'text/javascript', 'text/css'
    ];
    const isTextFile = textMimeTypes.includes(file.type) ||
                       /\.(txt|md|csv|json|html|xml|js|css|py)$/i.test(file.name);
    if (isTextFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setInputText(event.target.result);
            setIsExtracting(false);
        };
        reader.onerror = () => {
            setError(t('quick_start.error_read_file'));
            setIsExtracting(false);
        };
        reader.readAsText(file);
        return;
    }
    const DOCUMENT_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const isDocx = file.name.endsWith('.docx');
    const isPptx = file.name.endsWith('.pptx');
    if (DOCUMENT_TYPES.includes(file.type) || isDocx || isPptx) {
        const auditReader = new FileReader();
        auditReader.onloadend = async () => {
            const base64 = auditReader.result.split(',')[1];
            setPendingPdfBase64(base64);
            setPendingPdfFile(file);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size });
        };
        auditReader.readAsDataURL(file);
        return;
    }
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        try {
            if (false) { // PDF handling now goes through audit route above
                const pdfReader = new FileReader();
                pdfReader.onloadend = async () => {
                    const base64Full = pdfReader.result.split(',')[1];
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                    setGenerationStep(`Processing ${sizeMB}MB PDF in sections...`);
                    addToast(`Large PDF detected (${sizeMB}MB) — processing in sections for best results`, 'info');
                    try {
                        const sectionPrompts = [
                            `You are an OCR expert for educators. Extract all readable text from the FIRST HALF of this document. Preserve structure (headers, paragraphs) using markdown. If there are images, describe them briefly in [brackets]. If there are tables, preserve them as markdown tables. Return ONLY the extracted text.`,
                            `You are an OCR expert for educators. Extract all readable text from the SECOND HALF of this document (everything after the midpoint). Preserve structure using markdown. If there are images, describe them briefly in [brackets]. If there are tables, preserve them as markdown tables. Return ONLY the extracted text.`
                        ];
                        const chunks = [];
                        for (let i = 0; i < sectionPrompts.length; i++) {
                            setGenerationStep(`Extracting section ${i + 1} of ${sectionPrompts.length}...`);
                            try {
                                const chunkText = await callGeminiVision(sectionPrompts[i], base64Full, 'application/pdf');
                                if (chunkText && chunkText.trim().length > 20) chunks.push(chunkText);
                            } catch (chunkErr) {
                                warnLog(`[PDF Chunk ${i + 1}] Failed:`, chunkErr?.message);
                                if (i === 0) throw chunkErr; // First chunk failing = total failure
                            }
                        }
                        const fullText = chunks.join('\n\n---\n\n');
                        if (fullText.trim().length < 50) throw new Error('PDF extraction returned insufficient text');
                        setInputText(fullText);
                        setIsExtracting(false);
                        addToast(`PDF extracted successfully (${chunks.length} sections)`, 'success');
                    } catch (pdfErr) {
                        warnLog('[PDF Chunked] All extraction failed:', pdfErr);
                        setError('PDF extraction failed — the document may be too complex or image-heavy. Try copying and pasting the text directly.');
                        setIsExtracting(false);
                    }
                };
                pdfReader.readAsDataURL(file);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                const mimeType = file.type;
                let prompt = "";
                if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                    prompt = `
                        You are an Optical Character Recognition (OCR) expert for educators.
                        Extract all readable text from this educational document.
                        - Preserve the original structure (headers, paragraphs) where possible using markdown.
                        - If there are images, describe them briefly in [brackets].
                        - If there are tables, preserve them as markdown tables.
                        - Ignore irrelevant UI elements, page numbers, or watermarks if they disrupt the flow.
                        - If it is a worksheet, transcribe the questions clearly.
                        Return ONLY the extracted text.
                    `;
                } else if (mimeType.startsWith('video/')) {
                    prompt = `
                        You are an expert educational transcriber.
                        Watch this video file.
                        1. Provide a comprehensive transcript of the spoken content.
                        2. Describe any critical visual diagrams, text overlays, or demonstrations shown on screen that are necessary for understanding the topic.
                        Combine this into a coherent source text for a lesson.
                    `;
                } else if (mimeType.startsWith('audio/')) {
                    prompt = `
                        You are an expert educational transcriber.
                        Listen to this audio file.
                        Provide a comprehensive, accurate transcript of the spoken content.
                        Format it as clear text suitable for use as source material.
                    `;
                }
                const text = await callGeminiVision(prompt, base64String, mimeType);
                setInputText(text);
                setIsExtracting(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            warnLog("Unhandled error:", err);
            setError(t('toasts.file_process_error'));
            setIsExtracting(false);
        }
        return;
    }
    setError(t('toasts.unsupported_file_type'));
    setIsExtracting(false);
};

const handleLoadProject = (e, deps) => {
  const { setStudentProgressLog, setStudentProjectSettings, setIsIndependentMode, setIsTeacherMode, setIsParentMode, setIsStudentLinkMode, setAdventureDifficulty, setAdventureInputMode, setAdventureLanguageMode, setAdventureCustomInstructions, setAdventureChanceMode, setAdventureFreeResponseEnabled, setStudentNickname, setAdventureState, setHasSavedAdventure, setGameCompletions, setLabelChallengeResults, setSocraticMessages, setWordSoundsHistory, setWordSoundsFamilies, setWordSoundsAudioLibrary, setWordSoundsBadges, setPhonemeMastery, setWordSoundsDailyProgress, setWordSoundsConfusionPatterns, setFluencyAssessments, setFlashcardEngagement, setTimeOnTask, setGlobalPoints, setPointHistory, setCompletedActivities, setProbeHistory, setInterventionLogs, setSurveyResponses, setFidelityLog, setSessionCounter, setExternalCBMScores, setResearchMode, setHistory, setGeneratedContent, setActiveView, setIsMapLocked, setIsFullscreen, setLeftWidth, projectFileInputRef, t, addToast, warnLog, hydrateHistory } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] handleLoadProject fired"); } catch(_) {}
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const rawData = JSON.parse(event.target.result);
            if (rawData.progressLog && Array.isArray(rawData.progressLog)) {
                setStudentProgressLog(rawData.progressLog);
            }
            let loadedHistory = [];
            let isStudentSave = false;
            if (Array.isArray(rawData)) {
                loadedHistory = rawData;
            } else if (rawData.history && Array.isArray(rawData.history)) {
                loadedHistory = rawData.history;
                if (rawData.mode === 'student') {
                    isStudentSave = true;
                } else if (rawData.mode === 'independent') {
                    setIsIndependentMode(true);
                    setIsTeacherMode(true);
                    setIsParentMode(false);
                    setIsStudentLinkMode(false);
                    addToast(t('toasts.independent_project_loaded'), "success");
                }
                if (rawData.settings) {
                    setStudentProjectSettings({
                        allowDictation: rawData.settings.allowDictation ?? true,
                        allowSocraticTutor: rawData.settings.allowSocraticTutor ?? true,
                        allowFreeResponse: rawData.settings.allowFreeResponse ?? true,
                        allowPersonaFreeResponse: rawData.settings.allowPersonaFreeResponse ?? true,
                        adventureMinXP: rawData.settings.adventureMinXP ?? 0,
                        adventureUnlockXP: rawData.settings.adventureUnlockXP ?? 0,
                        nickname: rawData.settings.nickname || '',
                        baseXP: rawData.settings.baseXP ?? 100,
                        adventurePermissions: {
                            allowCustomInstructions: rawData.settings.adventurePermissions?.allowCustomInstructions ?? false,
                            allowModeSwitch: rawData.settings.adventurePermissions?.allowModeSwitch ?? false,
                            allowDifficultySwitch: rawData.settings.adventurePermissions?.allowDifficultySwitch ?? true,
                            allowLanguageSwitch: rawData.settings.adventurePermissions?.allowLanguageSwitch ?? true,
                            allowVisualsToggle: rawData.settings.adventurePermissions?.allowVisualsToggle ?? true,
                            lockAllSettings: rawData.settings.adventurePermissions?.lockAllSettings ?? false
                        }
                    });
                    if (rawData.settings.defaultAdventureConfig) {
                        const defs = rawData.settings.defaultAdventureConfig;
                        if (defs.difficulty) setAdventureDifficulty(defs.difficulty);
                        if (defs.mode) setAdventureInputMode(defs.mode);
                        if (defs.language) setAdventureLanguageMode(defs.language);
                        if (defs.instructions) setAdventureCustomInstructions(defs.instructions);
                        if (defs.chanceMode !== undefined) setAdventureChanceMode(defs.chanceMode);
                        if (defs.freeResponse !== undefined) setAdventureFreeResponseEnabled(defs.freeResponse);
                    }
                } else {
                    setStudentProjectSettings({
                        allowDictation: true,
                        allowSocraticTutor: true,
                        allowFreeResponse: true,
                        allowPersonaFreeResponse: true,
                        adventureMinXP: 0,
                        adventureUnlockXP: 0,
                        nickname: '',
                        baseXP: 100,
                        adventurePermissions: {
                            allowCustomInstructions: false,
                            allowModeSwitch: false,
                            allowDifficultySwitch: true,
                            allowLanguageSwitch: true,
                            allowVisualsToggle: true,
                            lockAllSettings: false
                        }
                    });
                }
                const savedNickname = rawData.studentNickname || rawData.settings?.nickname;
                if (savedNickname) {
                    setStudentNickname(savedNickname);
                    setStudentProjectSettings(prev => ({ ...prev, nickname: savedNickname }));
                    addToast(`Welcome back, ${savedNickname}!`, "success");
                }
                if (isStudentSave) {
                     if (rawData.adventureSnapshot && rawData.adventureSnapshot.turnCount > 0) {
                         const snapshot = rawData.adventureSnapshot;
                         setAdventureState(prev => ({
                             ...prev,
                             xp: snapshot.xp || 0,
                             gold: snapshot.gold || 0,
                             energy: snapshot.energy || 100,
                             level: snapshot.level || 1,
                             xpToNextLevel: snapshot.xpToNextLevel || 100,
                             inventory: snapshot.inventory || [],
                             narrativeLedger: snapshot.narrativeLedger || '',
                             stats: snapshot.stats || { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
                             currentScene: snapshot.currentScene,
                             history: snapshot.history || [],
                             turnCount: snapshot.turnCount || 0,
                             climax: snapshot.climax || { isActive: false, archetype: 'Auto', masteryScore: 0, attempts: 0 },
                             debateMomentum: snapshot.debateMomentum ?? 50,
                             missionReportDismissed: snapshot.missionReportDismissed || false,
                             isGameOver: false,
                             isLoading: false
                         }));
                         setHasSavedAdventure(true);
                         addToast(t('student.adventure_restored'), "success");
                     }
                     if (rawData.escapeRoomStats && rawData.escapeRoomStats.xpEarned > 0) {
                         addToast(t('escape_room.stats_restored', { xp: rawData.escapeRoomStats.xpEarned }), "info");
                     }
                     if (rawData.gameCompletions) setGameCompletions(rawData.gameCompletions);
                     if (rawData.labelChallengeResults) setLabelChallengeResults(rawData.labelChallengeResults);
                     if (rawData.socraticChatHistory?.messages) setSocraticMessages(rawData.socraticChatHistory.messages);
                     if (rawData.wordSoundsState) {
                         if (rawData.wordSoundsState.history) setWordSoundsHistory(rawData.wordSoundsState.history);
                         if (rawData.wordSoundsState.families) setWordSoundsFamilies(rawData.wordSoundsState.families);
                         if (rawData.wordSoundsState.audioLibrary) setWordSoundsAudioLibrary(rawData.wordSoundsState.audioLibrary);
                         if (rawData.wordSoundsState.badges) setWordSoundsBadges(rawData.wordSoundsState.badges);
                         if (rawData.wordSoundsState.phonemeMastery) setPhonemeMastery(rawData.wordSoundsState.phonemeMastery);
                         if (rawData.wordSoundsState.dailyProgress) setWordSoundsDailyProgress(rawData.wordSoundsState.dailyProgress);
                         if (rawData.wordSoundsState.confusionPatterns) setWordSoundsConfusionPatterns(rawData.wordSoundsState.confusionPatterns);
                     }
                     if (rawData.fluencyAssessments) setFluencyAssessments(rawData.fluencyAssessments);
                     if (rawData.flashcardEngagement) setFlashcardEngagement(rawData.flashcardEngagement);
                     if (rawData.timeOnTask) setTimeOnTask(rawData.timeOnTask);
                     if (rawData.globalPoints !== undefined) setGlobalPoints(rawData.globalPoints);
                     if (rawData.pointHistory) setPointHistory(rawData.pointHistory);
                     if (rawData.completedActivities) {
                          try {
                              setCompletedActivities(new Map(rawData.completedActivities));
                          } catch(e) { warnLog("Failed to restore completed activities", e); }
                     }
                }
                if (rawData.probeHistory) setProbeHistory(rawData.probeHistory);
                if (rawData.interventionLogs) setInterventionLogs(rawData.interventionLogs);
                if (rawData.surveyResponses) setSurveyResponses(rawData.surveyResponses);
                if (rawData.fidelityLog) setFidelityLog(rawData.fidelityLog);
                if (rawData.sessionCounter !== undefined) setSessionCounter(rawData.sessionCounter);
                if (rawData.externalCBMScores) setExternalCBMScores(rawData.externalCBMScores);
                if (rawData.settings?.researchMode) setResearchMode(rawData.settings.researchMode);
            }
            if (Array.isArray(loadedHistory)) {
                setHistory(hydrateHistory(loadedHistory));
                if (isStudentSave) {
                    setIsStudentLinkMode(true);
                    setIsTeacherMode(false);
                    setIsFullscreen(true);
                    setLeftWidth(0);
                    if (!rawData.studentNickname) addToast(t('toasts.loaded_student_view'), "info");
                } else {
                     addToast(t('toasts.project_loaded'), "success");
                }
                if (loadedHistory.length > 0) {
                    const lastItem = loadedHistory[loadedHistory.length - 1];
                    setGeneratedContent({ type: lastItem.type, data: lastItem.data, id: lastItem.id });
                    setActiveView(lastItem.type);
                    setIsMapLocked(false);
                } else {
                    setGeneratedContent(null);
                    setActiveView('input');
                }
            } else {
                alert(t('errors.project_file_invalid'));
                addToast(t('toasts.invalid_project_file'), "error");
            }
        } catch (err) {
            warnLog("Failed to parse project file", err);
            alert(t('errors.project_file_load_failed'));
            addToast(t('toasts.project_load_failed'), "error");
        }
        if (projectFileInputRef.current) projectFileInputRef.current.value = '';
    };
    reader.readAsText(file);
};

const detectClimaxArchetype = async (text, instructions, deps) => {
  const { callGemini, warnLog } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] detectClimaxArchetype fired"); } catch(_) {}
    try {
        const prompt = `
            Analyze the following educational content and categorize it into one of 4 Dramatic Climax Archetypes for a game.
            Source Text: "${text.substring(0, 1500)}..."
            ${instructions ? `Custom Instructions: ${instructions}` : ''}
            Archetypes:
            1. Antagonist: A specific villain, rival, or entity opposing the player (e.g. History wars, Biography of a leader, specific debates).
            2. Catastrophe: A natural disaster, system failure, or survival situation (e.g. Volcanoes, Climate Change, Engineering failure).
            3. Masterpiece: Creating art, building a structure, or solving a complex proof (e.g. Poetry, Geometry, Architecture).
            4. Discovery: Uncovering a secret, exploring the unknown, or scientific research (e.g. Space, Deep Sea, Archeology).
            Return ONLY the archetype name (Antagonist, Catastrophe, Masterpiece, or Discovery).
        `;
        const result = await callGemini(prompt);
        const clean = result.trim().replace(/['"]/g, '');
        if (['Antagonist', 'Catastrophe', 'Masterpiece', 'Discovery'].includes(clean)) {
            return clean;
        }
        if (clean.includes('Antagonist')) return 'Antagonist';
        if (clean.includes('Catastrophe')) return 'Catastrophe';
        if (clean.includes('Masterpiece')) return 'Masterpiece';
        if (clean.includes('Discovery')) return 'Discovery';
        return 'Catastrophe';
    } catch (e) {
        warnLog("Archetype detection failed", e);
        return 'Catastrophe';
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.MiscHandlers = {
  handleFileUpload,
  handleLoadProject,
  detectClimaxArchetype,
};
