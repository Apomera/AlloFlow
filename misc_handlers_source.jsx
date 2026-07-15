// misc_handlers_source.jsx - Phase H.3 of CDN modularization.
// handleFileUpload + handleLoadProject + detectClimaxArchetype
// extracted from AlloFlowANTI.txt 2026-04-25.

const handleFileUpload = async (e, deps) => {
  const { LargeFileHandler, callGeminiVision, convertXlsxToMarkdownTables, addToast, t, warnLog, setShowLargeFileModal, setPendingLargeFile, setError, setIsExtracting, setGenerationStep, setInputText, recordSourceProvenance, setPendingPdfBase64, setPendingPdfFile, setPdfAuditResult } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] handleFileUpload fired"); } catch(_) {}
    const file = e.target.files[0];
    if (!file) return;
    const rememberImportedSource = (text) => {
        if (typeof recordSourceProvenance === 'function') recordSourceProvenance({
            title: file.name || 'Imported file',
            locator: file.name || '',
            type: file.type || 'file',
            importMethod: 'file-upload'
        }, text);
    };
    if (LargeFileHandler.needsChunking(file)) {
        const fileType = LargeFileHandler.getFileType(file);
        if (fileType === 'audio' || fileType === 'video') {
            // Long recordings route to the PIPELINE triage too (2026-06-10):
            // the digestion card runs the existing LargeFileHandler chunked
            // transcription (speech mode — visual analysis needs ≤15MB).
            // No base64 stash: readAsDataURL on a 100MB file would bloat
            // memory; the File object rides pendingPdfFile instead.
            setPendingPdfFile(file);
            setPendingPdfBase64(null);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _mediaPending: { mime: file.type || '', isVideo: fileType === 'video', chunked: true } });
            addToast(t('toasts.media_choose_digestion_long') || '🎙 Long recording loaded — it will be transcribed in segments (speech analysis). Start from the digestion card.', 'info');
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
    // ── Markdown / CSV → the pipeline (2026-06-10) ──
    // .md (incl. NotebookLM exports — completing the round trip with our own
    // NotebookLM export) and .csv/.tsv route to the PIPELINE triage as the
    // transcript format: markdown headings + pipe-tables survive as real
    // structure (CSV becomes a scoped table → full /Headers + /IDTree in the
    // tagged PDF). 'Skip to Text Extraction' keeps the old source-box path.
    // .txt stays on the content path — it is the content tools' workhorse.
    // ── Spreadsheets (.xlsx/.xls/.xlsb/.ods) → pipeline (2026-06-11) ──
    // SheetJS (Lumen's lazy-CDN pattern) converts each sheet to a markdown
    // pipe-table; the transcript lane builds REAL scoped tables from them.
    if (/\.(xlsx|xls|xlsb|ods)$/i.test(file.name) && typeof convertXlsxToMarkdownTables === 'function') {
        setIsExtracting(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const b64 = reader.result.split(',')[1];
                addToast(t('toasts.spreadsheet_converting') || '📊 Reading the workbook…', 'info');
                const conv = await convertXlsxToMarkdownTables(b64);
                const text = '# ' + file.name.replace(/\.(xlsx|xls|xlsb|ods)$/i, '') + '\n\n' + conv.text
                    + (conv.truncatedRows ? ('\n\n*Note: ' + conv.truncatedRows + ' row(s) beyond the first 200 per sheet were not included.*') : '');
                const MAGIC = 'ALLOTRANSCRIPT:v1\n';
                const bytes = new TextEncoder().encode(MAGIC + text);
                let bin = '';
                for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
                setPendingPdfBase64(btoa(bin));
                setPendingPdfFile(file);
                setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _transcriptSource: true });
                setIsExtracting(false);
                addToast('✅ ' + (conv.sheets > 1 ? conv.sheets + ' sheets' : '1 sheet') + (t('toasts.spreadsheet_ready') || ' loaded as accessible tables — Make Accessible for the full treatment (tagged PDF included).'), 'success');
            } catch (err) {
                warnLog('[Spreadsheet→Pipeline] failed:', err?.message || err);
                setError((t('toasts.spreadsheet_failed') || 'Could not read the spreadsheet: ') + (err?.message || 'unknown') + ' — export it as CSV and try again.');
                setIsExtracting(false);
            }
        };
        reader.readAsDataURL(file);
        return;
    }
    if (/\.(md|markdown|csv|tsv)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (event) => {
            let text = String(event.target.result || '');
            if (/\.(csv|tsv)$/i.test(file.name)) {
                // Minimal CSV/TSV → markdown pipe-table (quoted commas honored).
                const delim = /\.tsv$/i.test(file.name) ? '\t' : ',';
                const rows = text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
                    const cells = []; let cur = ''; let q = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
                        else if (ch === '"') q = true;
                        else if (ch === delim) { cells.push(cur); cur = ''; }
                        else cur += ch;
                    }
                    cells.push(cur);
                    return cells;
                });
                if (rows.length) {
                    text = '# ' + file.name.replace(/\.(csv|tsv)$/i, '') + '\n\n'
                        + rows.map((r, i) => '| ' + r.map((c) => c.replace(/\|/g, '/')).join(' | ') + ' |' + (i === 0 ? ('\n|' + r.map(() => ' --- ').join('|') + '|') : '')).join('\n');
                }
            }
            if (text.trim().length < 5) { setError(t('toasts.file_process_error')); setIsExtracting(false); return; }
            const MAGIC = 'ALLOTRANSCRIPT:v1\n';
            const bytes = new TextEncoder().encode(MAGIC + text.trim());
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            setPendingPdfBase64(btoa(bin));
            setPendingPdfFile(file);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _transcriptSource: true });
            setIsExtracting(false);
            addToast(t('toasts.textdoc_pipeline_ready') || '📄 Loaded into the accessibility pipeline — Make Accessible for the full treatment, or Skip to Text Extraction to use as source material.', 'success');
        };
        reader.onerror = () => { setError(t('quick_start.error_read_file')); setIsExtracting(false); };
        setIsExtracting(true);
        reader.readAsText(file);
        return;
    }
    const isTextFile = textMimeTypes.includes(file.type) ||
                       /\.(txt|md|csv|json|html|xml|js|css|py)$/i.test(file.name);
    if (isTextFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setInputText(event.target.result);
            rememberImportedSource(event.target.result);
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
    // ── Audio/video → the remediation pipeline (2026-06-10) ──
    // Recordings become a first-class pipeline input: transcribe, wrap in the
    // 'ALLOTRANSCRIPT' format (magic-prefixed base64 — flows through every
    // pipeline dispatcher like a document), open the triage. From there the
    // teacher gets the FULL export suite: structured remediation, typeset
    // tagged PDF, accessible Word, audio re-export. The triage's 'Skip to
    // Text Extraction' covers the old put-it-in-the-source-box behavior.
    // Files needing chunking (>15MB) keep the existing chunked-transcription
    // modal (content path) — they never reach this branch.
    if ((file.type.startsWith('audio/') || file.type.startsWith('video/')) && !LargeFileHandler.needsChunking(file)) {
        // Stash the RAW media and open the triage with a digestion card —
        // the teacher chooses HOW to digest (speech-only / visuals-only /
        // dual-track / synthesized narrative + custom instructions) BEFORE
        // any transcription runs. The view calls transcribeMediaToPayload
        // and swaps in the ALLOTRANSCRIPT payload.
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            setPendingPdfBase64(base64String);
            setPendingPdfFile(file);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _mediaPending: { mime: file.type || 'audio/mpeg', isVideo: file.type.startsWith('video/') } });
            addToast(t('toasts.media_choose_digestion') || '🎙 Recording loaded — choose how to digest it (speech, visuals, both) before remediation.', 'info');
        };
        reader.readAsDataURL(file);
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
                        rememberImportedSource(fullText);
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
                rememberImportedSource(text);
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
  const { setStudentProgressLog, setStudentProjectSettings, setIsIndependentMode, setIsTeacherMode, setIsParentMode, setIsStudentLinkMode, setAdventureDifficulty, setAdventureInputMode, setAdventureLanguageMode, setAdventureCustomInstructions, setAdventureChanceMode, setAdventureFreeResponseEnabled, setStudentNickname, setAdventureState, setHasSavedAdventure, setGameCompletions, setLabelChallengeResults, setSocraticMessages, setWordSoundsHistory, setWordSoundsFamilies, setWordSoundsAudioLibrary, setWordSoundsBadges, setPhonemeMastery, setWordSoundsDailyProgress, setWordSoundsConfusionPatterns, setFluencyAssessments, setFlashcardEngagement, setTimeOnTask, setGlobalPoints, setPointHistory, setCompletedActivities, setProbeHistory, setInterventionLogs, setSurveyResponses, setFidelityLog, setSessionCounter, setExternalCBMScores, setResearchMode, setHistory, setGeneratedContent, setActiveView, setIsMapLocked, setIsFullscreen, setLeftWidth, projectFileInputRef, t, addToast, warnLog, hydrateHistory, setStickers, setConceptMasteryLocal, bankImportedConceptMastery } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] handleLoadProject fired"); } catch(_) {}
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            let rawData = JSON.parse(event.target.result);
            // Encrypted educator project: ask for the password and decrypt before anything else.
            // Without it the file is just ciphertext; a wrong password or tampering fails the
            // authenticated GCM check and we stop rather than load garbage.
            if (window.AlloModules && window.AlloModules.AlloCrypto && window.AlloModules.AlloCrypto.isEncryptedEnvelope(rawData)) {
                const _pw = (window.AlloFlowUX && window.AlloFlowUX.prompt)
                    ? await window.AlloFlowUX.prompt(t('save.enter_password') || 'This project is password-protected. Enter the password to open it.', '', { inputType: 'password', title: t('save.encrypted_title') || 'Encrypted project' })
                    : ((typeof window !== 'undefined' && window.prompt) ? window.prompt(t('save.enter_password') || 'Enter the password:') : null);
                if (!_pw) { return; }
                try { rawData = await window.AlloModules.AlloCrypto.decryptJSON(rawData, _pw); }
                catch (_e) { if (addToast) addToast(t('save.decrypt_failed') || 'Wrong password, or the file is corrupt.', 'error'); return; }
            }
            if (rawData.progressLog && Array.isArray(rawData.progressLog)) {
                setStudentProgressLog(rawData.progressLog);
            }
            if (rawData.studentProgressSummary && typeof rawData.studentProgressSummary === 'object') {
                try {
                    window.__alloflowStudentProgressSummary = rawData.studentProgressSummary;
                    try { localStorage.setItem('alloflow_student_progress_summary', JSON.stringify(rawData.studentProgressSummary)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-student-progress-summary-restored'));
                } catch (e) { warnLog && warnLog('Student progress summary restore failed:', e); }
            }
            // Guided-tour resume: a teacher who saved mid-tutorial drops back in at their
            // step (Canvas has no cross-session storage, so progress rides the project file).
            // Hardened restore: (1) restore selectedIds UNCONDITIONALLY — null is the valid
            // "all steps" default that Array.isArray would wrongly skip, leaving the restored
            // step index applied against whatever tool set the session already had (lands the
            // teacher on the wrong tool / an out-of-range step); (2) clamp the step into range;
            // (3) gate on the saved schema version so a newer file doesn't restore garbage.
            const _gtp = rawData.guidedTourProgress;
            if (_gtp && typeof _gtp.guidedStep === 'number') {
                if (_gtp.version == null || _gtp.version === 1) {
                    if (deps.setGuidedSelectedIds) deps.setGuidedSelectedIds(Array.isArray(_gtp.selectedIds) ? _gtp.selectedIds : null);
                    const _sel = _gtp.selectedIds;
                    // source-input is always an active step; estimate the active-step count to clamp against.
                    const _activeLen = Array.isArray(_sel) ? (_sel.indexOf('source-input') === -1 ? _sel.length + 1 : _sel.length) : 22;
                    const _step = Math.max(0, Math.min(_gtp.guidedStep, Math.max(0, _activeLen - 1)));
                    if (deps.setGuidedStep) deps.setGuidedStep(_step);
                    // Real per-step completions (which steps produced output) — powers the
                    // banner's ✅ so revisiting a completed step doesn't lose its done state.
                    if (deps.setGuidedCompletedIds) deps.setGuidedCompletedIds(Array.isArray(_gtp.completedSteps) ? _gtp.completedSteps : []);
                    if (deps.setGuidedMode) deps.setGuidedMode(true);
                    if (addToast) addToast(t('guided.resumed') || 'Resumed your guided tutorial.', 'success');
                } else if (addToast) {
                    addToast(t('guided.resume_version_skip') || 'This saved tutorial progress is from a newer version and was not restored.', 'info');
                }
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
                        hideStudentAiFeatures: rawData.settings.hideStudentAiFeatures ?? false,
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
                        hideStudentAiFeatures: false,
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
                     if (rawData.conceptMastery && rawData.conceptMastery.attempts) {
                         // Student re-loading their own work: restore device-local mastery.
                         if (typeof setConceptMasteryLocal === 'function') setConceptMasteryLocal({ attempts: rawData.conceptMastery.attempts });
                         // Teacher importing a submitted file: bank it (keyed by the
                         // student's uid when present) so the retention dashboard can
                         // read mastery from files instead of any cloud store.
                         if (typeof bankImportedConceptMastery === 'function') bankImportedConceptMastery(rawData.conceptMastery);
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
                // Word Sounds state restores for BOTH save modes (was inside the
                // isStudentSave guard, which silently dropped it from teacher-mode
                // projects — the common K-2 RTI setup where the interventionist
                // runs Word Sounds on the teacher device; the teacher save now
                // persists it too, see phase_k_helpers saveType === 'teacher').
                if (rawData.wordSoundsState) {
                    if (rawData.wordSoundsState.history) setWordSoundsHistory(rawData.wordSoundsState.history);
                    if (rawData.wordSoundsState.families) setWordSoundsFamilies(rawData.wordSoundsState.families);
                    if (rawData.wordSoundsState.audioLibrary) setWordSoundsAudioLibrary(rawData.wordSoundsState.audioLibrary);
                    if (rawData.wordSoundsState.badges) setWordSoundsBadges(rawData.wordSoundsState.badges);
                    if (rawData.wordSoundsState.phonemeMastery) setPhonemeMastery(rawData.wordSoundsState.phonemeMastery);
                    if (rawData.wordSoundsState.dailyProgress) setWordSoundsDailyProgress(rawData.wordSoundsState.dailyProgress);
                    if (rawData.wordSoundsState.confusionPatterns) setWordSoundsConfusionPatterns(rawData.wordSoundsState.confusionPatterns);
                }
                if (rawData.probeHistory) setProbeHistory(rawData.probeHistory);
                if (rawData.interventionLogs) setInterventionLogs(rawData.interventionLogs);
                if (rawData.surveyResponses) setSurveyResponses(rawData.surveyResponses);
                if (rawData.fidelityLog) setFidelityLog(rawData.fidelityLog);
                if (rawData.sessionCounter !== undefined) setSessionCounter(rawData.sessionCounter);
                if (rawData.externalCBMScores) setExternalCBMScores(rawData.externalCBMScores);
                if (rawData.settings?.researchMode) setResearchMode(rawData.settings.researchMode);
            }
            // SEL Hub engagement (streak, per-tool usage). The hub itself
            // listens for the custom event so a load mid-session refreshes
            // its UI without remount.
            if (rawData.selEngagement && typeof rawData.selEngagement === 'object') {
                try {
                    window.__alloflowSelEngagement = rawData.selEngagement;
                    if (rawData.selEngagement.streak) {
                        try { localStorage.setItem('alloflow_sel_streak', JSON.stringify(rawData.selEngagement.streak)); } catch (e) {}
                    }
                    if (rawData.selEngagement.toolUsage) {
                        try { localStorage.setItem('alloflow_sel_tool_usage', JSON.stringify(rawData.selEngagement.toolUsage)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-sel-engagement-restored'));
                } catch (e) { warnLog && warnLog('SEL engagement restore failed:', e); }
            }
            // BirdLab persistent state (life list, badges). Same pattern as
            // SEL engagement: write to window slot, mirror to localStorage,
            // dispatch event for live re-hydration of an open BirdLab tool.
            if (rawData.birdLab && typeof rawData.birdLab === 'object') {
                try {
                    window.__alloflowBirdLab = rawData.birdLab;
                    if (rawData.birdLab.lifeList) {
                        try { localStorage.setItem('birdLab.lifeList.v1', JSON.stringify(rawData.birdLab.lifeList)); } catch (e) {}
                    }
                    if (rawData.birdLab.badges) {
                        try { localStorage.setItem('birdLab.badges.v1', JSON.stringify(rawData.birdLab.badges)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-birdlab-restored'));
                } catch (e) { warnLog && warnLog('BirdLab restore failed:', e); }
            }
            // PetsLab persistent state (module visits, badges, decoder mastery).
            // Same Canvas-survival flow as SEL engagement and BirdLab above.
            if (rawData.petsLab && typeof rawData.petsLab === 'object') {
                try {
                    window.__alloflowPetsLab = rawData.petsLab;
                    try { localStorage.setItem('petsLab.state.v1', JSON.stringify(rawData.petsLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-petslab-restored'));
                } catch (e) { warnLog && warnLog('PetsLab restore failed:', e); }
            }
            // OpticsLab AP-quiz concept mastery. Mirrors the rest of the
            // STEM Lab tool persistence chain.
            if (rawData.opticsLab && typeof rawData.opticsLab === 'object') {
                try {
                    window.__alloflowOpticsLab = rawData.opticsLab;
                    try { localStorage.setItem('opticsLab.state.v1', JSON.stringify(rawData.opticsLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-opticslab-restored'));
                } catch (e) { warnLog && warnLog('OpticsLab restore failed:', e); }
            }
            // StatsLab AP-quiz concept mastery (AP Psych / AP Bio).
            if (rawData.statsLab && typeof rawData.statsLab === 'object') {
                try {
                    window.__alloflowStatsLab = rawData.statsLab;
                    try { localStorage.setItem('statsLab.state.v1', JSON.stringify(rawData.statsLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-statslab-restored'));
                } catch (e) { warnLog && warnLog('StatsLab restore failed:', e); }
            }
            // WeldLab welder's defect catalog (cross-sample log) + badges.
            if (rawData.weldLab && typeof rawData.weldLab === 'object') {
                try {
                    window.__alloflowWeldLab = rawData.weldLab;
                    if (rawData.weldLab.defectCatalog) {
                        try { localStorage.setItem('weldLab.defectCatalog.v1', JSON.stringify(rawData.weldLab.defectCatalog)); } catch (e) {}
                    }
                    if (rawData.weldLab.badges) {
                        try { localStorage.setItem('weldLab.badges.v1', JSON.stringify(rawData.weldLab.badges)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-weldlab-restored'));
                } catch (e) { warnLog && warnLog('WeldLab restore failed:', e); }
            }
            // RenewablesLab energy-source mastery (badges + module visits + quiz mastery).
            if (rawData.renewablesLab && typeof rawData.renewablesLab === 'object') {
                try {
                    window.__alloflowRenewablesLab = rawData.renewablesLab;
                    try { localStorage.setItem('renewablesLab.state.v1', JSON.stringify(rawData.renewablesLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-renewableslab-restored'));
                } catch (e) { warnLog && warnLog('RenewablesLab restore failed:', e); }
            }
            // FirstResponse Lab responder mastery (consent + module visits + faMastery).
            if (rawData.firstResponse && typeof rawData.firstResponse === 'object') {
                try {
                    window.__alloflowFirstResponse = rawData.firstResponse;
                    try { localStorage.setItem('firstResponse.state.v1', JSON.stringify(rawData.firstResponse)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-firstresponse-restored'));
                } catch (e) { warnLog && warnLog('FirstResponse restore failed:', e); }
            }
            // ThrowLab Pitch Locker (cross-session strike log per pitch type).
            if (rawData.throwlab && typeof rawData.throwlab === 'object') {
                try {
                    window.__alloflowThrowLab = rawData.throwlab;
                    try { localStorage.setItem('throwlab.state.v1', JSON.stringify(rawData.throwlab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-throwlab-restored'));
                } catch (e) { warnLog && warnLog('ThrowLab restore failed:', e); }
            }
            // PlayLab Play Catalog (cross-session log of plays/concepts run successfully).
            if (rawData.playlab && typeof rawData.playlab === 'object') {
                try {
                    window.__alloflowPlayLab = rawData.playlab;
                    try { localStorage.setItem('playlab.state.v1', JSON.stringify(rawData.playlab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-playlab-restored'));
                } catch (e) { warnLog && warnLog('PlayLab restore failed:', e); }
            }
            // Assessment Literacy junk-science mastery (per-scenario first-correct).
            if (rawData.assessmentLiteracy && typeof rawData.assessmentLiteracy === 'object') {
                try {
                    window.__alloflowAssessmentLiteracy = rawData.assessmentLiteracy;
                    try { localStorage.setItem('assessmentLiteracy.state.v1', JSON.stringify(rawData.assessmentLiteracy)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-assessmentliteracy-restored'));
                } catch (e) { warnLog && warnLog('AssessmentLiteracy restore failed:', e); }
            }
            // RoadReady Permit Mastery (per-question first-correct log + per-category stats + parking best).
            if (rawData.roadReady && typeof rawData.roadReady === 'object') {
                try {
                    window.__alloflowRoadReady = rawData.roadReady;
                    if (rawData.roadReady.permitMastery) {
                        try { localStorage.setItem('roadReady.permitMastery.v1', JSON.stringify(rawData.roadReady.permitMastery)); } catch (e) {}
                    }
                    if (rawData.roadReady.permitStats) {
                        try { localStorage.setItem('roadReady.permitStats.v1', JSON.stringify(rawData.roadReady.permitStats)); } catch (e) {}
                    }
                    if (rawData.roadReady.parkingBest) {
                        try { localStorage.setItem('roadReady.parkingBest.v1', JSON.stringify(rawData.roadReady.parkingBest)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-roadready-restored'));
                } catch (e) { warnLog && warnLog('RoadReady restore failed:', e); }
            }
            // SEL Hub teacher-authored Stations (custom curated tool bundles
            // with quests). Mirror to window slot AND localStorage, then fire
            // a custom event so an open SEL Hub re-hydrates its savedStations
            // state from the window slot without remount.
            if (rawData.selStations && (Array.isArray(rawData.selStations) || typeof rawData.selStations === 'object')) {
                try {
                    window.__alloflowSelStations = rawData.selStations;
                    if (Array.isArray(rawData.selStations)) {
                        try { localStorage.setItem('alloflow_sel_stations', JSON.stringify(rawData.selStations)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-sel-stations-restored'));
                } catch (e) { warnLog && warnLog('SEL stations restore failed:', e); }
            }
            // SEL Hub per-station quest progress (xpThreshold / timeSpent /
            // freeResponse / manualComplete tracking). Same restore flow.
            if (rawData.selProgress && typeof rawData.selProgress === 'object') {
                try {
                    window.__alloflowSelProgress = rawData.selProgress;
                    try { localStorage.setItem('alloflow_sel_station_progress', JSON.stringify(rawData.selProgress)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-sel-progress-restored'));
                } catch (e) { warnLog && warnLog('SEL progress restore failed:', e); }
            }
            // SEL Hub per-tool persistent state (Voice Detective confusion
            // matrix, Journal entries, etc.). The window slot is keyed by
            // toolId; individual tools listen for the custom event and pull
            // their own slice via window.SelToolDataManager.get(toolId).
            if (rawData.selToolData && typeof rawData.selToolData === 'object') {
                try {
                    window.__alloflowSelToolData = rawData.selToolData;
                    // Also mirror each tool's per-tool localStorage key so
                    // tools that read directly from localStorage on mount
                    // (instead of via the manager) pick up the restore.
                    Object.keys(rawData.selToolData || {}).forEach(function (toolId) {
                        try {
                            var slot = rawData.selToolData[toolId];
                            if (slot && typeof slot === 'object' && slot._lsKey && typeof slot._lsKey === 'string') {
                                localStorage.setItem(slot._lsKey, JSON.stringify(slot._lsValue !== undefined ? slot._lsValue : slot));
                            }
                        } catch (e) {}
                    });
                    window.dispatchEvent(new CustomEvent('alloflow-sel-tooldata-restored'));
                } catch (e) { warnLog && warnLog('SEL tool data restore failed:', e); }
            }
            if (Array.isArray(rawData.selSnapshots)) {
                try {
                    window.__alloflowSelSnapshots = rawData.selSnapshots;
                    try { localStorage.setItem('alloflow_sel_snapshots', JSON.stringify(rawData.selSnapshots)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-sel-snapshots-restored'));
                } catch (e) { warnLog && warnLog('SEL snapshots restore failed:', e); }
            }
            // Student-authored permanent products (SEL Share Packets and future
            // module exports). AlloHaven renders these read-only, so clear the
            // slot on older files instead of showing stale artifacts from a
            // previous project.
            try {
                const restoredStudentArtifacts = Array.isArray(rawData.studentArtifacts) ? rawData.studentArtifacts : [];
                window.__alloflowStudentArtifacts = restoredStudentArtifacts;
                try { localStorage.setItem('alloflow_student_artifacts', JSON.stringify(restoredStudentArtifacts)); } catch (e) {}
                window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-restored'));
            } catch (e) { warnLog && warnLog('Student artifacts restore failed:', e); }
            // Rehydrate sticker overlays. Stickers are saved into the
            // project JSON by phase_k_helpers.executeSaveFile so a teacher's
            // feedback or a student's marks survive reload. Falls back to
            // empty array if the loaded file pre-dates the stickers field.
            if (typeof setStickers === 'function') {
                setStickers(Array.isArray(rawData.stickers) ? rawData.stickers : []);
            }
            if (Array.isArray(loadedHistory)) {
                const hydratedHistory = hydrateHistory(loadedHistory);
                setHistory(hydratedHistory);
                // Restore only after the loaded resource list is known. The
                // host validates the draft envelope against this exact history,
                // sanitizes imported HTML, and clears any previous-project draft.
                if (typeof deps.restoreBuilderDraft === 'function') {
                    deps.restoreBuilderDraft(rawData && rawData.builderDraft, hydratedHistory);
                }
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
                if (window.AlloFlowUX) window.AlloFlowUX.toast(t('errors.project_file_invalid'), 'error'); else alert(t('errors.project_file_invalid'));
                addToast(t('toasts.invalid_project_file'), "error");
            }
        } catch (err) {
            warnLog("Failed to parse project file", err);
            if (window.AlloFlowUX) window.AlloFlowUX.toast(t('errors.project_file_load_failed'), 'error'); else alert(t('errors.project_file_load_failed'));
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
