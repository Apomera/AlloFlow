// Auto-extracted from AlloFlowANTI.txt (_alloCmdCtx, the AlloBot command context).
// Edit this file, then rebuild its CDN module. The host shim passes every free
// variable of the original body as `deps`; module-scope bindings that the boot
// sequence upgrades in place arrive as live getters on `deps.__live`.

function buildAlloCommandContext(deps) {
  const {
    GUIDED_TOUR_MAP, LIVE_SIGNAL_OPTIONS, READING_THEME_IDS, ReactDOM, _alloCmdCtx, _alloCmdCtxRef,
    _alloEducatorAccessCodeRequired, _alloEvaluateObjectives, _alloIsStudentSafeResource, _alloNormalizeDirectionsData, _alloObjectiveSignals, _alloRecommendNextStations,
    _alloRequestStemPlugin, _alloStudentSafeResources, _alloVoiceInputAvailable, _contextualSuggestionRef, _editMainVoiceEditableField, _helpLookup,
    _listMainVoiceEditableFields, _selectMainVoiceEditableField, _sendUdlToChat, _voiceConverseWaitersRef, _voiceEditableFieldSelectionRef, activeBlueprint,
    activeSessionAppId, activeSessionCode, activeSidebarTab, activeView, addToast, adventureFluencyEnabled,
    adventureFreeResponseEnabled, adventureState, adventureTypingPaceEnabled, alloBotRef, alloVoiceActive, alloVoiceSessionStatus,
    appId, callGeminiAudio, closeReadThisPage, colorOverlay, createHomeworkAssignmentLink, currentUiLanguage,
    customTourSteps, db, directionsProgress, disableAnimations, dokLevel, executeRoleSelect,
    focusGuidedTarget, focusMode, fullPackRun, generatedContent, getDefaultTitle, getFilteredHistory,
    gradeLevel, guidedActiveSteps, guidedCompletedIds, guidedCreatedHistoryIds, guidedMode, guidedStep,
    handleApplyLessonTemplate, handleApproveFullPack, handleAutoFillToggle, handleClearHistory, handleCloseStudentEntry, handleCloseSubmitModal,
    handleCloudToggleClick, handleExecuteBlueprint, handleExitGuidedMode, handleExport, handleGenerate, handleGenerateBrainstormRubric,
    handleGenerateSource, handleGuidedSkip, handleNextTourStep, handleOpenSchoolRewards, handleOpenSchoolRewardsPortal, handlePlanFullPack,
    handlePrevTourStep, handleRebuildBlueprintStep, handleResetScaffolds, handleRestoreView, handleReturnToStart, handleSendUDLMessage,
    handleSetActiveViewToDashboard, handleSetActiveViewToPersona, handleSetGlossaryFilterToAcademic, handleSetGlossaryFilterToAll, handleSetGlossaryFilterToDomain, handleSetIsBingoGameToTrue,
    handleSetIsCrosswordGameToTrue, handleSetIsMatchingGameToTrue, handleSetIsMemoryGameToTrue, handleSetIsProjectSettingsOpenToTrue, handleSetIsStudentBingoGameToTrue, handleSetIsTranslateModalOpenToTrue,
    handleSetIsWordScrambleGameToTrue, handleSetIsZenModeToFalse, handleSetIsZenModeToTrue, handleSetRunTourToFalse, handleSetShowGroupModalToTrue, handleSetShowSaveModalToFalse,
    handleSetShowStudyTimerModalToTrue, handleSetShowSubmitModalToTrue, handleStopBlueprintRun, handleToggleDisableAnimations, handleToggleFocusMode, handleToggleIsBotVisible,
    handleToggleIsEditingAnalysis, handleToggleIsEditingBrainstorm, handleToggleIsEditingFaq, handleToggleIsEditingGlossary, handleToggleIsEditingLeveledText, handleToggleIsEditingOutline,
    handleToggleIsEditingQuiz, handleToggleIsEditingScaffolds, handleToggleIsHelpMode, handleToggleIsPresentationMode, handleToggleIsReviewGame, handleToggleReadingRuler,
    handleToggleShowQuizAnswers, handleToggleShowSocraticChat, handleToggleVisualSupports, hasSelectedMode, hasSelectedRole, hasSourceOrAnalysis,
    homeworkExpiryDays, initiateSaveStudentProject, inputText, isAccessibilityLabOpen, isAlloHavenOpen, isAlloStudioOpen,
    isCloudSyncEnabled, isCommunityCatalogOpen, isDynamicAssessmentOpen, isExtracting, isGateOpen, isGeneratingPersona,
    isGeneratingSource, isGlobalMuted, isIndependentMode, isLinguaPracticeOpen, isOpenGrooveOpen, isParentMode,
    isProcessing, isProjectSettingsOpen, isReadingLibraryOpen, isResearchSuiteOpen, isStudentLinkMode, isSymbolStudioOpen,
    isTeacherMode, isTestPrepHubOpen, isTimelineStudioOpen, isTranslateModalOpen, isVideoStudioOpen, isZenMode,
    latestLessonPlan, latestStudentPreviewShare, launchInteractiveFlashcards, lessonTemplates, leveledTextLanguage, lineHeight,
    nextReadThisPageItem, normalizeAlloEvaluationPortalUrl, openExportPreview, openReadThisPagePanel, openStudentQrPreview, pauseReadThisPage,
    pdfAutoContinueAbortRef, pdfAutoContinueRunning, pdfFixResult, pdfTargetScore, previousReadThisPageItem, readAllMediaDescriptions,
    readMediaDescriptions, readingLibraryIndexForBot, readingTheme, repeatReadThisPageItem, resetFontSize, restoreIntentSnapshot,
    resumeReadThisPage, rtpPlaybackState, runAutoFixLoop, runTour, saveType, schoolRewardsPortalUrl,
    selectToolFromCatalog, selectedVoice, setActiveSidebarTab, setActiveView, setAdventureFluencyEnabled, setAdventureTypingPaceEnabled,
    setAlloVoiceActive, setColorOverlay, setExpandedTools, setGlobalMute, setGradeLevel, setGuidedMode,
    setGuidedStep, setHasSelectedMode, setHasSelectedRole, setIsAccessibilityLabOpen, setIsAdminHubOpen, setIsAlloHavenOpen,
    setIsAlloStudioOpen, setIsBotVisible, setIsCommunityCatalogOpen, setIsDictationMode, setIsDynamicAssessmentOpen, setIsGateOpen,
    setIsLineFocusMode, setIsLinguaPracticeOpen, setIsOpenGrooveOpen, setIsProjectSettingsOpen, setIsReadingLibraryOpen, setIsResearchSuiteOpen,
    setIsRosterKeyOpen, setIsSideBySide, setIsSpotlightMode, setIsSubmissionInboxOpen, setIsSymbolStudioOpen, setIsTeacherMode,
    setIsTestPrepHubOpen, setIsTimelineStudioOpen, setIsTranslateModalOpen, setIsVideoStudioOpen, setLeveledTextLanguage, setLineHeight,
    setLivePollPreset, setMathMode, setPendingReadingBookSlug, setPendingRole, setReadingTheme, setRunTour,
    setSchoolRewardsGuide, setSelectedLanguages, setShowAIBackendModal, setShowAssessmentBuilder, setShowBehaviorLens, setShowCinematicStudio,
    setShowClassAnalytics, setShowDirectionsComposer, setShowEducatorHub, setShowExportMenu, setShowExportPreviewWrapped, setShowLearningHub,
    setShowLearningWebExplorer, setShowLitLab, setShowLiveDock, setShowLivePollingPanel, setShowMindMap, setShowNotebook,
    setShowPictionaryHost, setShowPoetTree, setShowReadThisPage, setShowRecentQrShares, setShowReportWriter, setShowResearchHub,
    setShowSelHub, setShowSessionModal, setShowSourceGen, setShowStemLab, setShowStoryForge, setShowStudentSignals,
    setShowTextSettings, setShowUDLGuide, setShowUrlInput, setShowVoiceSettings, setShowWizard, setSliderFontSize,
    setSourceLength, setSourceLevel, setSourceTone, setSourceTopic, setSpotlightMessage, setStemLabTab,
    setStemLabTool, setThroughlineSeedUnitId, setTourStep, setVoiceSpeed, showAIBackendModal, showAssessmentBuilder,
    showBehaviorLens, showCinematicStudio, showClassAnalytics, showDirectionsComposer, showEducatorHub, showExportMenu,
    showExportPreview, showLearningHub, showLearningWebExplorer, showLitLab, showLiveDock, showLivePollingPanel,
    showMindMap, showNotebook, showPoetTree, showReadThisPage, showRecentQrShares, showReportWriter,
    showResearchHub, showSaveModal, showSelHub, showSessionModal, showSpotlight, showStemLab,
    showStoryForge, showStudentEntry, showStudentSignals, showSubmitModal, showTextSettings, showUDLGuide,
    showVoiceSettings, sliderFontSize, sourceLength, sourceTone, sourceTopic, spotlightMessage,
    standardInputValue, standardsInput, startNewPdfAudit, startPipelineTour, startReadThisPage, stemLabTool,
    stopPlayback, stopReadThisPage, studentAiFeaturesHidden, studentAiPolicyForShare, studentInterests, studentProjectSettings,
    t, targetStandards, toggleOverlay, toggleTheme, tourRect, tourStep,
    tourSteps, udlMessages, user, voiceSpeed, voiceVolume, writeToSession
  } = deps;
  const __live = deps.__live;
    const commandAudience = (isStudentLinkMode || !isTeacherMode)
      ? 'student'
      : (isIndependentMode ? 'independent' : (isParentMode ? 'parent' : 'teacher'));
    const assignmentDirections = (generatedContent && generatedContent.type === 'directions')
      ? generatedContent
      : ([...(Array.isArray(history) ? history : [])].reverse().find((item) => item && item.type === 'directions') || null);
    const getAssignmentProgress = () => {
      if (!assignmentDirections || !assignmentDirections.id) return null;
      const normalized = _alloNormalizeDirectionsData(assignmentDirections.data);
      const evaluated = _alloEvaluateObjectives(normalized.objectives, _alloObjectiveSignals, directionsProgress[assignmentDirections.id]);
      return { title: assignmentDirections.title || (t('directions.title') || 'Assignment Directions'), done: evaluated.filter((goal) => goal.done).length, total: evaluated.length };
    };
    const getAssignmentMapItems = () => _alloStudentSafeResources(history).filter(item => item.type !== 'directions').slice(0, 12);
    const getNextAssignmentStep = () => {
      if (!assignmentDirections || !assignmentDirections.id) return null;
      const normalized = _alloNormalizeDirectionsData(assignmentDirections.data);
      const evaluated = _alloEvaluateObjectives(normalized.objectives, _alloObjectiveSignals, directionsProgress[assignmentDirections.id]);
      const visited = (directionsProgress._visited && typeof directionsProgress._visited === 'object') ? directionsProgress._visited : {};
      const recommendation = _alloRecommendNextStations(getAssignmentMapItems(), visited, normalized.objectives, evaluated);
      if (recommendation.next && recommendation.next.item) return { item: recommendation.next.item, title: recommendation.next.item.title || recommendation.next.item.type, goalLabel: recommendation.next.goalLabel || '' };
      const openGoal = evaluated.find((goal) => !goal.done);
      return openGoal ? { item: assignmentDirections, title: assignmentDirections.title || (t('directions.title') || 'Assignment Directions'), goalLabel: openGoal.label || '' } : null;
    };
    const getSuccessCriteria = () => {
      if (assignmentDirections) {
        const goals = _alloNormalizeDirectionsData(assignmentDirections.data).objectives.map((goal) => String(goal.label || '').trim()).filter(Boolean);
        if (goals.length) return { title: assignmentDirections.title || (t('directions.your_goals') || 'Your goals'), criteria: goals };
      }
      const candidates = [generatedContent, ...(Array.isArray(history) ? history.slice().reverse() : [])].filter(Boolean);
      for (const item of candidates) {
        const data = item && item.data;
        const rubrics = [item && item.rubric, data && !Array.isArray(data) && data.rubric];
        if (Array.isArray(data)) data.forEach((activity) => { if (activity && activity.rubric) rubrics.push(activity.rubric); });
        for (const rubric of rubrics) {
          if (typeof rubric === 'string' && rubric.trim()) return { title: item.title || (t('directions.success_criteria') || 'Success criteria'), criteria: [rubric.replace(/\s+/g, ' ').trim().slice(0, 900)] };
          if (rubric && Array.isArray(rubric.criteria)) {
            const criteria = rubric.criteria.map((criterion) => String((criterion && (criterion.criterion || criterion.name || criterion.label)) || '').trim()).filter(Boolean);
            if (criteria.length) return { title: rubric.title || item.title || (t('directions.success_criteria') || 'Success criteria'), criteria };
          }
        }
      }
      return null;
    };
    const getTeacherFeedback = () => {
      const items = [generatedContent, ...(Array.isArray(history) ? history.slice().reverse() : [])].filter(Boolean);
      const asText = (value) => {
        if (typeof value === 'string') return value.trim();
        if (!value || typeof value !== 'object') return '';
        const direct = value.text || value.comment || value.message || value.notes;
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        const glow = typeof value.glow === 'string' ? value.glow.trim() : '';
        const grow = typeof value.grow === 'string' ? value.grow.trim() : '';
        return [glow && ('Glow: ' + glow), grow && ('Grow: ' + grow)].filter(Boolean).join(' ');
      };
      for (const item of items) {
        const data = item && item.data;
        const values = [item.teacherFeedback, item.returnedFeedback, item.feedbackFromTeacher, data && data.teacherFeedback, data && data.returnedFeedback, data && data.feedbackFromTeacher];
        for (const value of values) {
          const text = asText(value);
          if (text) return { title: item.title || (t('feedback.review_teacher') || 'Teacher feedback'), text: text.slice(0, 1400) };
        }
      }
      return null;
    };
    const rubricActivityIndex = Array.isArray(generatedContent && generatedContent.data)
      ? generatedContent.data.findIndex((activity) => activity && activity.title && !(activity.rubric && Array.isArray(activity.rubric.criteria) && activity.rubric.criteria.length))
      : -1;
    const latestResumableWork = (Array.isArray(history) ? history.slice().reverse() : []).find((item) => item && item.id && item.type && (commandAudience !== 'student' || _alloIsStudentSafeResource(item))) || null;
    // latestStudentPreviewShare / createGuidedHomeworkShare /
    // previewGuidedStudentAssignment moved to COMPONENT scope (above) —
    // they were defined here but referenced from render JSX (the guided
    // banner props and the "Create Homework QR" button), which threw
    // "createGuidedHomeworkShare is not defined" and crashed the whole app
    // to the error boundary. The ctx below still sees them via closure.
    const getTutorialVoiceState = () => {
      if (runTour && tourRect) {
        const steps = customTourSteps || tourSteps || [];
        const step = steps[tourStep] || {};
        return {
          kind: 'classic',
          stepIndex: Math.max(0, Number(tourStep) || 0),
          stepTotal: steps.length,
          stepId: step.id || '',
          stepTitle: step.title || '',
          stepText: step.text || '',
          canNext: steps.length > 0,
          canPrevious: tourStep > 0,
          canSkip: false,
          completed: false,
        };
      }
      if (guidedMode) {
        const busy = !!(isProcessing || isGeneratingPersona || isGeneratingSource || isExtracting);
        const steps = Array.isArray(guidedActiveSteps) ? guidedActiveSteps : [];
        const step = steps[guidedStep] || {};
        const sourceReady = step.id === 'source-input' && String(inputText || '').trim().length > 20;
        const completed = sourceReady || (Array.isArray(guidedCompletedIds) && guidedCompletedIds.includes(step.id));
        const required = ['source-input', 'directions', 'package-deliver', '_final'].includes(step.id);
        return {
          kind: 'guided',
          stepIndex: Math.max(0, Number(guidedStep) || 0),
          stepTotal: steps.length,
          stepId: step.id || '',
          stepTitle: (typeof step.label === 'string' ? step.label : '') || step.id || '',
          stepText: (typeof step.action === 'string' ? step.action : '') || '',
          completed,
          canNext: guidedStep < steps.length - 1 && completed,
          canPrevious: guidedStep > 0,
          canSkip: guidedStep < steps.length - 1 && !required,
          canFocus: !!(step.id && GUIDED_TOUR_MAP[step.id]),
          busy,
          nextReason: required && !completed
            ? 'Complete this required Guided milestone before moving on. Say focus guided tool to return to it.'
            : 'Complete the current Guided step before moving on, or say skip guided step.',
        };
      }
      return {};
    };
    const invokeTutorialVoiceAction = (action) => {
      const state = getTutorialVoiceState();
      if (!state.kind) return false;
      if (action === 'describe') {
        const position = state.stepTotal ? (' Step ' + (state.stepIndex + 1) + ' of ' + state.stepTotal + '.') : '';
        const text = String(state.stepText || '').replace(/\s+/g, ' ').trim();
        return (state.kind === 'guided' ? 'Guided Mode.' : 'App tutorial.') + position + (state.stepTitle ? ' ' + state.stepTitle + '.' : '') + (text ? ' ' + text : '');
      }
      if (action === 'next') {
        if (state.kind === 'guided') {
          if (!state.canNext) return state.nextReason || false;
          handleGuidedSkip(false);
          return 'Moved to the next Guided step.';
        }
        handleNextTourStep();
        return state.stepIndex >= state.stepTotal - 1 ? 'Tutorial finished.' : 'Moved to the next tutorial step.';
      }
      if (action === 'previous') {
        if (!state.canPrevious) return false;
        if (state.kind === 'guided') setGuidedStep((value) => Math.max(0, value - 1));
        else handlePrevTourStep();
        return 'Moved to the previous tutorial step.';
      }
      if (action === 'focus' && state.kind === 'guided') {
        if (!state.canFocus) return false;
        focusGuidedTarget();
        return 'Focused the current Guided tool.';
      }
      if (action === 'skip' && state.kind === 'guided') {
        if (!state.canSkip) return false;
        handleGuidedSkip(true);
        return 'Skipped the current Guided step. Your existing resources remain in History.';
      }
      if (action === 'review_latest' && state.kind === 'guided') {
        const createdIds = Array.isArray(guidedCreatedHistoryIds) ? guidedCreatedHistoryIds : [];
        const latestId = createdIds.length ? createdIds[createdIds.length - 1] : '';
        const item = latestId && (Array.isArray(history) ? history : []).find((entry) => entry && entry.id === latestId);
        if (!item) return 'No resource created by this Guided run is available to review yet.';
        handleRestoreView(item, { suppressLiveFollow: true });
        return 'Opening the latest Guided resource, ' + String(item.title || item.type || 'resource') + '.';
      }
      if (action === 'exit') {
        if (state.kind === 'guided') {
          handleExitGuidedMode();
          return 'Guided Mode closed. Progress remains saved on this device.';
        }
        if (spotlightMessage) {
          setRunTour(false);
          setIsSpotlightMode(false);
          setSpotlightMessage('');
        } else handleSetRunTourToFalse();
        return 'Tutorial closed.';
      }
      return false;
    };
    const listLearnerResources = () => {
      let visible = [];
      try { visible = getFilteredHistory(); } catch (_) { return []; }
      return commandAudience === 'student' ? _alloStudentSafeResources(visible) : (Array.isArray(visible) ? visible.filter((item) => item && item.id && item.type) : []);
    };
    const isLearnerResourceSurfaceBlocked = () => !!(
      showAIBackendModal || showTextSettings || showVoiceSettings || isTranslateModalOpen ||
      isGateOpen || isProjectSettingsOpen || showDirectionsComposer || showAssessmentBuilder ||
      showUDLGuide || showLivePollingPanel || showStudentSignals || showLiveDock ||
      showExportPreview || showExportMenu || showSessionModal || showRecentQrShares ||
      showClassAnalytics || isResearchSuiteOpen || showNotebook || showStudentEntry || showSaveModal ||
      showSubmitModal || showReadThisPage || isTestPrepHubOpen || isLinguaPracticeOpen ||
      isTimelineStudioOpen || isOpenGrooveOpen || showResearchHub || showLitLab ||
      showLearningWebExplorer || showMindMap || showPoetTree || showStemLab ||
      showStoryForge || isAlloHavenOpen || showBehaviorLens || showReportWriter ||
      isSymbolStudioOpen || isVideoStudioOpen || isAlloStudioOpen || showCinematicStudio ||
      isAccessibilityLabOpen || isCommunityCatalogOpen || isReadingLibraryOpen ||
      isDynamicAssessmentOpen || showSelHub || showLearningHub || showEducatorHub ||
      runTour || guidedMode || !hasSelectedMode || !hasSelectedRole
    );
    const isLearnerResourceDiscoveryActive = () => !isLearnerResourceSurfaceBlocked() && (
      activeView === 'dashboard' || activeView === 'history' || activeSidebarTab === 'history'
    );
    const getLearnerResourceFeedbackText = (content) => {
      if (!content || typeof content !== 'object') return '';
      const values = [
        content.teacherFeedback,
        content.returnedFeedback,
        content.feedbackFromTeacher,
        content.data && content.data.teacherFeedback,
        content.data && content.data.returnedFeedback,
        content.data && content.data.feedbackFromTeacher,
      ];
      for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 1400);
        if (value && typeof value === 'object') {
          const text = [
            value.text || value.comment || value.message || value.notes,
            value.glow && ('Glow: ' + value.glow),
            value.grow && ('Grow: ' + value.grow),
          ].filter(Boolean).join(' ').trim();
          if (text) return text.slice(0, 1400);
        }
      }
      return '';
    };
    const getCurrentLearnerResource = () => {
      if (!generatedContent || activeView === 'dashboard' || activeView === 'input' || activeView === 'history') return null;
      const resourceId = String(generatedContent.id || '');
      if (commandAudience === 'student' && (!resourceId || !listLearnerResources().some((item) => String(item && item.id || '') === resourceId))) return null;
      const mediaApi = window.AlloModules && window.AlloModules.ExportHandlers;
      let media = [];
      try {
        if (mediaApi && typeof mediaApi.getMediaDescriptionItems === 'function') {
          media = mediaApi.getMediaDescriptionItems({ generatedContent, root: typeof document !== 'undefined' ? document.getElementById('main-content') : null });
        }
      } catch (_) {}
      const hasFeedback = !!getLearnerResourceFeedbackText(generatedContent);
      return {
        id: resourceId,
        type: generatedContent.type || activeView || 'resource',
        title: generatedContent.title || generatedContent.name || getDefaultTitle(generatedContent.type),
        frontmost: !isLearnerResourceSurfaceBlocked(),
        canRead: true,
        canReadMedia: media.length > 0,
        mediaCount: media.length,
        missingMediaDescriptions: media.filter((item) => item && item.described === false).length,
        hasFeedback,
      };
    };
    const invokeLearnerResourceAction = (action, params = {}) => {
      const visible = listLearnerResources();
      if (action === 'open') {
        const id = String(params.id || '');
        const item = visible.find((entry) => entry && String(entry.id) === id);
        if (!item) return false;
        handleRestoreView(item, { suppressLiveFollow: true });
        return true;
      }
      if (action === 'read') return startReadThisPage();
      if (action === 'read_media') return readAllMediaDescriptions();
      if (action === 'feedback') {
        const text = getLearnerResourceFeedbackText(generatedContent);
        return text || false;
      }
      if (action === 'exit') return closeCurrentSurface();
      return false;
    };

    const chooseOnboardingPath = (path) => {
      const choice = String(path || '').toLowerCase();
      if (choice === 'full') { setHasSelectedMode(true); setGuidedMode(false); return true; }
      if (choice === 'guided') { setHasSelectedMode(true); setGuidedMode(true); return true; }
      if (choice === 'learning' || choice === 'learning_tools') {
        setShowLearningHub(true); setIsTeacherMode(false); setShowWizard(false);
        setHasSelectedRole(true); setHasSelectedMode(true); return true;
      }
      if (choice === 'educator') {
        setHasSelectedMode(true); setHasSelectedRole(false); setShowWizard(false);
        return true;
      }
      return false;
    };
    const chooseOnboardingRole = (role) => {
      const choice = String(role || '').toLowerCase();
      if (!['student', 'teacher', 'parent', 'independent'].includes(choice)) return false;
      if (_alloEducatorAccessCodeRequired() && ['teacher', 'parent', 'independent'].includes(choice)) {
        setPendingRole(choice);
        setIsGateOpen(true);
        return true;
      }
      executeRoleSelect(choice);
      return true;
    };
    // @section VOICE_SEMANTIC_HOST
    // State-derived orientation: direct app state only, never simulated clicks.
    const describeCurrentScreen = () => {
      if (showSaveModal) return saveType === 'student' ? 'Save My Work is open. Review or edit the file name, save, or cancel.' : 'Save Project is open. Review or edit the file name, save, or cancel.';
      if (showSubmitModal) return 'Submit Work is open. Review the submission details, submit, or cancel.';
      if (showStudentEntry && hasSelectedRole && !isTeacherMode) return 'Student Entry is open. Enter the learner name or nickname, continue, or close the dialog.';
      if (runTour && tourRect) return invokeTutorialVoiceAction('describe') || 'The app tutorial is open.';
      if (showAIBackendModal) return 'AI Backend Settings is open. Choose a provider and model, test the connection, or close the dialog.';
      if (showTextSettings) return 'Text Settings is open. Change text size, spacing, font, reading theme, or color support.';
      if (showVoiceSettings) return 'Voice & Audio Settings is open. Choose voice input, spoken output, speed, or volume.';
      if (isTranslateModalOpen) return 'The Translation dialog is open. Choose a language, translate the current resource, or close the dialog.';
      if (isGateOpen) return 'Protected educator access is open. Enter the access code or cancel. Voice commands will not speak or expose the code.';
      if (isProjectSettingsOpen) return 'Project Settings is open for learner permissions, accessibility supports, and project options.';
      if (showDirectionsComposer) return 'The Assignment Directions editor is open for directions, goals, and success criteria.';
      if (showAssessmentBuilder) return 'Assessment Builder is open for designing an assessment and supporting activities.';
      if (showUDLGuide) return 'The UDL Guide is open with accessibility supports and lesson guidance.';
      if (showLivePollingPanel) return 'The Live Poll composer is open. Review the prompt and choices before broadcasting.';
      if (showStudentSignals) return 'The Teacher Signal panel is open. Choose help, more time, or ready.';
      if (showLiveDock) return 'The Live Dashboard is open with polls, understanding checks, groups, and classroom activities.';
      if (showExportPreview) return 'Document Builder is open for reviewing, differentiating, and exporting the current resource.';
      if (showExportMenu) return 'The Export Menu is open. Choose an available download or sharing format.';
      if (showSessionModal) return 'The Class Session dialog is open for starting, joining, or managing a live class.';
      if (showRecentQrShares) return 'Share and Collect is open with recent links, polls, surveys, and response results.';
      if (isResearchSuiteOpen && !showClassAnalytics) return 'Research Suite is open with study design, consent provenance, instruments, fidelity logs, and research exports.';
      if (showClassAnalytics) return 'Class Analytics is open with learner progress and classroom evidence.';
      if (showNotebook) return 'The Notebook is open with saved notes and entries.';
      if (!hasSelectedMode) return 'AlloFlow launch pad. Choose Full Platform, Guided Setup, Learning Tools, or Educator Tools. You can also enable Voice Access.';
      if (!hasSelectedRole) return 'Role selection. Choose Student, Teacher, Parent, or Independent Learner. Protected roles may ask for an access code.';
      if (showReadThisPage) return 'Read This Page is open. Read everything, move between items, pause or resume, stop, or close the reader.';
      if (isTestPrepHubOpen) return 'Test Prep Hub is open. Choose a practice set, study resource, or hands-free practice session.';
      if (isLinguaPracticeOpen) return 'Lingua Practice is open for language learning and practice.';
      if (isTimelineStudioOpen) return 'Timeline Studio is open for exploring and creating timelines.';
      if (isOpenGrooveOpen) return 'Open Groove Studio is open for music creation.';
      if (showResearchHub) return 'Research Hub is open for finding and organizing sources.';
      if (showLitLab) return 'Lit Lab is open for literature and reading activities.';
      if (showLearningWebExplorer) return 'Learning Web: Explore is open for standards, concepts, lessons, evidence, and word connections.';
      if (showMindMap) return 'Learning Web: Unit Path is open for connected lessons, standards, and evidence.';
      if (showPoetTree) return 'Poet Tree is open for guided poetry writing.';
      if (showStemLab) return stemLabTool ? ('STEAM Lab is open to ' + String(stemLabTool).replace(/[-_]/g, ' ') + '.') : 'STEAM Lab is open. Choose a tool to explore.';
      if (showStoryForge) return 'StoryForge is open for creating and reviewing a story.';
      if (isAlloHavenOpen) return 'AlloHaven is open.';
      if (showBehaviorLens) return 'BehaviorLens is open for reviewing behavior evidence and supports.';
      if (showReportWriter) return 'Report Writer is open for preparing an educator report.';
      if (isSymbolStudioOpen) return 'Symbol Studio is open for creating visual and symbol supports.';
      if (isVideoStudioOpen) return 'Video Studio is open for recording and reviewing instructional video.';
      if (isAlloStudioOpen) return 'AlloStudio is open for creating media and learning materials.';
      if (showCinematicStudio) return 'Cinematic Studio is open for building a narrated visual sequence.';
      if (isAccessibilityLabOpen) return 'Accessibility Lab is open for checking and improving access supports.';
      if (isCommunityCatalogOpen) return 'Community Catalog is open for browsing shared learning resources.';
      if (isReadingLibraryOpen) return 'Reading Library is open for finding and reading accessible books and texts.';
      if (isDynamicAssessmentOpen) return 'Dynamic Assessment is open for adaptive practice and review.';
      if (showSelHub) return 'SEL Hub is open for social-emotional learning activities.';
      if (showLearningHub) return 'Learning Hub is open. Browse learner tools and resources.';
      if (showEducatorHub) return 'Educator Hub is open. Browse teaching, accessibility, and classroom tools.';
      if (activeView === 'dashboard') return 'AlloFlow dashboard is open.';
      if (activeView === 'input') return 'Source input is open.';
      if (activeView === 'history' || (activeSidebarTab === 'history' && !generatedContent)) return 'History is open with saved and recent work.';
      if (generatedContent) {
        const title = String(generatedContent.title || generatedContent.name || '').trim();
        const type = String(generatedContent.type || 'resource').replace(/[-_]/g, ' ');
        return (title ? (title + '. ') : '') + 'A ' + type + ' resource is open.';
      }
      return 'AlloFlow workspace is open.';
    };
    const listCurrentActions = () => {
      // Production responses come from the same gated registry that will
      // execute the spoken phrase. The static branches below remain only as a
      // compatibility fallback while the command module is still loading.
      try {
        const commandApi = window.AlloModules && window.AlloModules.AlloCommands;
        if (commandApi && typeof commandApi.listActiveCommandScopes === 'function') {
          const activeScopes = commandApi.listActiveCommandScopes(ctx);
          const preferredIds = [];
          if (showSaveModal && saveType === 'student') preferredIds.push('student-save-dialog');
          if (runTour && tourRect) preferredIds.push('tutorial-surface');
          if (isTestPrepHubOpen) preferredIds.push('test-prep-practice', 'test-prep-setup');
          if (generatedContent && generatedContent.type === 'quiz') preferredIds.push('quiz');
          const currentResource = getCurrentLearnerResource();
          if (currentResource && currentResource.frontmost !== false || isLearnerResourceDiscoveryActive()) preferredIds.push('generated-resource');
          const capabilityByCommand = {
            tutorial_next: 'next',
            tutorial_previous: 'previous',
            tutorial_focus: 'focus',
            tutorial_skip: 'skip',
            tutorial_exit: 'exit',
            resource_list: 'discover',
            resource_open: 'open',
            resource_describe: 'describe',
            resource_read: 'read',
            resource_read_media: 'readMediaDescription',
            resource_next: 'next',
            resource_previous: 'previous',
            resource_feedback: 'feedback',
            resource_exit: 'exit',
          };
          for (const scopeId of preferredIds) {
            const scope = activeScopes.find((entry) => entry && entry.id === scopeId);
            if (!scope || typeof scope.getCommands !== 'function') continue;
            let capabilities = {};
            try { capabilities = typeof scope.getCapabilities === 'function' ? scope.getCapabilities(ctx) || {} : {}; } catch (_) {}
            const labels = scope.getCommands(ctx).filter((command) => !capabilityByCommand[command.id] || capabilities[capabilityByCommand[command.id]] !== false).map((command) => String(command.label || '').trim()).filter(Boolean);
            if (labels.length) return labels;
          }
        }
        if (commandApi && typeof commandApi.buildAlloCommands === 'function') {
          const orientation = ['describe_current_screen', 'repeat_last_response'];
          let ids = orientation;
          if (showAIBackendModal) {
            ids = ['describe_current_screen', 'close_current_surface', 'repeat_last_response'];
          } else if (showTextSettings) {
            ids = ['font_bigger', 'font_smaller', 'line_spacing_more', 'line_spacing_less', 'cycle_reading_theme', 'close_current_surface', 'repeat_last_response'];
          } else if (showVoiceSettings) {
            ids = ['voice_speed_up', 'voice_speed_down', 'close_current_surface', 'repeat_last_response'];
          } else if (isTranslateModalOpen || isGateOpen || isProjectSettingsOpen || showDirectionsComposer || showAssessmentBuilder || showUDLGuide || showLivePollingPanel || showStudentSignals || showLiveDock || showExportPreview || showExportMenu || showSessionModal || showRecentQrShares || showClassAnalytics || isResearchSuiteOpen || showNotebook) {
            ids = ['describe_current_screen', 'close_current_surface', 'repeat_last_response'];
          } else if (!hasSelectedMode) {
            ids = ['onboarding_full_platform', 'onboarding_guided_setup', 'onboarding_learning_tools', 'onboarding_educator_tools'];
          } else if (!hasSelectedRole) {
            ids = ['onboarding_student_role', 'onboarding_teacher_role', 'onboarding_parent_role', 'onboarding_independent_role', 'go_back'];
          } else if (showReadThisPage) {
            ids = ['stop_reading', 'close_current_surface', 'repeat_last_response'];
          } else if (isTestPrepHubOpen) {
            // Test Prep's local completion grammar is still being consolidated;
            // do not advertise phrases the platform kernel cannot execute yet.
            ids = ['describe_current_screen', 'close_current_surface', 'repeat_last_response'];
          } else if (isLinguaPracticeOpen || isTimelineStudioOpen || isOpenGrooveOpen || showResearchHub || showLitLab || showLearningWebExplorer || showMindMap || showPoetTree || showStemLab || showStoryForge || isAlloHavenOpen || showBehaviorLens || showReportWriter || isSymbolStudioOpen || isVideoStudioOpen || isAlloStudioOpen || showCinematicStudio || isAccessibilityLabOpen || isCommunityCatalogOpen || isReadingLibraryOpen || isDynamicAssessmentOpen || showSelHub) {
            ids = ['describe_current_screen', 'close_current_surface', 'repeat_last_response'];
          } else if (showLearningHub) {
            ids = ['open_test_prep_hub', 'open_reading_library', 'open_stem_lab', 'open_notebook', 'describe_current_screen', 'close_current_surface'];
          } else if (showEducatorHub) {
            ids = ['open_source_input', 'open_assessment_builder', 'open_class_analytics', 'describe_current_screen', 'close_current_surface'];
          } else if (activeView === 'input') {
            ids = ['open_source_url', 'open_source_generator', 'go_back', 'describe_current_screen'];
          } else if (activeView === 'history' || (activeSidebarTab === 'history' && !generatedContent)) {
            ids = ['go_back', 'describe_current_screen', 'repeat_last_response'];
          } else if (generatedContent && activeView !== 'dashboard') {
            ids = commandAudience === 'student'
              ? ['read_this_page', 'check_assignment_progress', 'next_assignment_step', 'save_my_work', 'submit_work', 'review_teacher_feedback', 'close_current_surface', 'repeat_last_response']
              : ['read_this_page', 'open_export_menu', 'open_translate', 'close_current_surface', 'repeat_last_response'];
          } else if (activeView === 'dashboard') {
            ids = commandAudience === 'student'
              ? ['open_learning_hub', 'open_test_prep_hub', 'open_notebook', 'describe_current_screen']
              : ['open_educator_hub', 'open_learning_hub', 'open_source_input', 'open_history', 'describe_current_screen'];
          } else {
            ids = ['describe_current_screen', 'close_current_surface', 'repeat_last_response'];
          }
          const byId = new Map(commandApi.buildAlloCommands(ctx).map((command) => [command.id, command]));
          const labels = ids.map((id) => byId.get(id)).filter(Boolean).map((command) => command.label);
          if (labels.length) return labels;
        }
      } catch (_) {}
      if (showAIBackendModal) return ['choose an AI provider', 'choose a model', 'test the connection', 'close the current surface'];
      if (showTextSettings) return ['make text bigger', 'make text smaller', 'change line spacing', 'change the reading theme', 'close the current surface'];
      if (showVoiceSettings) return ['choose voice input', 'choose spoken-output voice', 'change speed', 'change volume', 'close the current surface'];
      if (isTranslateModalOpen) return ['choose a translation language', 'translate the current resource', 'close the current surface'];
      if (isGateOpen) return ['enter the access code', 'cancel protected access', 'repeat the last response'];
      if (isProjectSettingsOpen) return ['review learner permissions', 'change project options', 'close the current surface'];
      if (showDirectionsComposer) return ['edit directions', 'edit goals', 'save assignment directions', 'close the current surface'];
      if (showAssessmentBuilder) return ['add an assessment item', 'review the assessment', 'save the assessment', 'close the current surface'];
      if (showLivePollingPanel) return ['review the poll', 'broadcast the poll', 'close the current surface'];
      if (showStudentSignals) return ['send a help signal', 'ask for more time', 'send a ready signal', 'close the current surface'];
      if (showReadThisPage) return ['read everything', 'next reading item', 'previous reading item', 'repeat this item', 'pause reading', 'resume reading', 'stop reading', 'close the current surface'];
      if (!hasSelectedMode) return ['choose Full Platform', 'choose Guided Setup', 'choose Learning Tools', 'choose Educator Tools', 'enable Voice Access'];
      if (!hasSelectedRole) return ['choose Student', 'choose Teacher', 'choose Parent', 'choose Independent Learner', 'enable Voice Access'];
      if (isTestPrepHubOpen) return ['choose a practice set', 'start hands-free practice', 'open progress', 'describe the current screen', 'close the current surface'];
      if (showLearningHub) return ['open Test Prep Hub', 'open Reading Library', 'open STEAM Lab', 'close the current surface'];
      if (showEducatorHub) return ['open source input', 'open Assessment Builder', 'open Class Analytics', 'close the current surface'];
      if (showNotebook) return ['review notebook entries', 'open a notebook entry', 'close the current surface'];
      if (showLiveDock) return ['open a live poll', 'run a quick check', 'open group tools', 'close the current surface'];
      if (showExportPreview) return ['review the document', 'change document options', 'export the document', 'close the current surface'];
      if (showExportMenu) return ['list export choices', 'choose an export format', 'close the current surface'];
      if (showSessionModal) return ['start a class session', 'join a class session', 'manage the active session', 'close the current surface'];
      if (showRecentQrShares || showClassAnalytics || isResearchSuiteOpen || showUDLGuide) return ['describe the current screen', 'list available actions', 'close the current surface'];
      if (isLinguaPracticeOpen || isTimelineStudioOpen || isOpenGrooveOpen || showResearchHub || showLitLab || showLearningWebExplorer || showMindMap || showPoetTree || showStemLab || showStoryForge || isAlloHavenOpen || showBehaviorLens || showReportWriter || isSymbolStudioOpen || isVideoStudioOpen || isAlloStudioOpen || showCinematicStudio || isAccessibilityLabOpen || isCommunityCatalogOpen || isReadingLibraryOpen || isDynamicAssessmentOpen || showSelHub) {
        return ['describe the current screen', 'list available actions', 'close the current surface'];
      }
      if (generatedContent) {
        const actions = ['read this page'];
        if (assignmentDirections) actions.push('check assignment progress', 'go to the next assignment step');
        if (commandAudience === 'student') {
          if (Array.isArray(history) && history.length > 0) actions.push('save my work');
          actions.push('submit work', 'review teacher feedback');
        } else {
          actions.push('open the export menu', 'open translation');
        }
        actions.push('close the current surface');
        return actions;
      }
      if (activeSidebarTab === 'history') return ['review recent work', 'open saved work', 'go back'];
      if (activeView === 'input') return ['write source text', 'find a resource online', 'generate source from a topic', 'go back'];
      return commandAudience === 'student'
        ? ['open Learning Hub', 'open Test Prep Hub', 'open my notebook', 'describe the current screen']
        : ['open Educator Hub', 'open Learning Hub', 'open source input', 'open history', 'describe the current screen'];
    };
    const closeCurrentSurface = () => {
      if (showSaveModal) { handleSetShowSaveModalToFalse(); return saveType === 'student' ? 'Save My Work closed.' : 'Save Project closed.'; }
      if (showSubmitModal) { handleCloseSubmitModal(); return 'Submit Work closed.'; }
      if (showStudentEntry && hasSelectedRole && !isTeacherMode) { handleCloseStudentEntry(); return 'Student Entry closed.'; }
      if (runTour && tourRect) return invokeTutorialVoiceAction('exit') || 'Tutorial closed.';
      if (showAIBackendModal) { setShowAIBackendModal(false); return 'AI Backend Settings closed.'; }
      if (showTextSettings) { setShowTextSettings(false); return 'Text Settings closed.'; }
      if (showVoiceSettings) { setShowVoiceSettings(false); return 'Voice & Audio Settings closed.'; }
      if (isTranslateModalOpen) { setIsTranslateModalOpen(false); return 'Translation closed.'; }
      if (isGateOpen) { setIsGateOpen(false); setPendingRole(null); return 'Protected educator access canceled.'; }
      if (isProjectSettingsOpen) { setIsProjectSettingsOpen(false); return 'Project Settings closed.'; }
      if (showDirectionsComposer) { setShowDirectionsComposer(false); return 'Assignment Directions closed.'; }
      if (showAssessmentBuilder) { setShowAssessmentBuilder(false); return 'Assessment Builder closed.'; }
      if (showUDLGuide) { setShowUDLGuide(false); return 'UDL Guide closed.'; }
      if (showLivePollingPanel) { setShowLivePollingPanel(false); return 'Live Poll closed.'; }
      if (showStudentSignals) { setShowStudentSignals(false); return 'Teacher Signal panel closed.'; }
      if (showLiveDock) { setShowLiveDock(false); return 'Live Dashboard closed.'; }
      if (showExportPreview) { setShowExportPreviewWrapped(false); return 'Document Builder closed.'; }
      if (showExportMenu) { setShowExportMenu(false); return 'Export Menu closed.'; }
      if (showSessionModal) { setShowSessionModal(false); return 'Class Session closed.'; }
      if (showRecentQrShares) { setShowRecentQrShares(false); return 'Share and Collect closed.'; }
      if (isResearchSuiteOpen) { setIsResearchSuiteOpen(false); return 'Research Suite closed.'; }
      if (showClassAnalytics) { setShowClassAnalytics(false); return 'Class Analytics closed.'; }
      if (showNotebook) { setShowNotebook(false); return 'Notebook closed.'; }
      if (!hasSelectedMode || !hasSelectedRole) return 'This required setup screen cannot be closed. Say list available actions to hear your choices.';
      if (showReadThisPage) { closeReadThisPage(); return 'Read This Page closed.'; }
      if (isTestPrepHubOpen) { setIsTestPrepHubOpen(false); return 'Test Prep Hub closed.'; }
      if (isLinguaPracticeOpen) { setIsLinguaPracticeOpen(false); return 'Lingua Practice closed.'; }
      if (isTimelineStudioOpen) { setIsTimelineStudioOpen(false); return 'Timeline Studio closed.'; }
      if (isOpenGrooveOpen) { setIsOpenGrooveOpen(false); return 'Open Groove Studio closed.'; }
      if (showResearchHub) { setShowResearchHub(false); return 'Research Hub closed.'; }
      if (showLitLab) { setShowLitLab(false); return 'Lit Lab closed.'; }
      if (showLearningWebExplorer) { setShowLearningWebExplorer(false); return 'Learning Web: Explore closed.'; }
      if (showMindMap) { setShowMindMap(false); setThroughlineSeedUnitId(null); return 'Learning Web: Unit Path closed.'; }
      if (showPoetTree) { setShowPoetTree(false); return 'Poet Tree closed.'; }
      if (showStemLab) { setShowStemLab(false); return 'STEAM Lab closed.'; }
      if (showStoryForge) { setShowStoryForge(false); return 'StoryForge closed.'; }
      if (isAlloHavenOpen) { setIsAlloHavenOpen(false); return 'AlloHaven closed.'; }
      if (showBehaviorLens) { setShowBehaviorLens(false); return 'BehaviorLens closed.'; }
      if (showReportWriter) { setShowReportWriter(false); return 'Report Writer closed.'; }
      if (isSymbolStudioOpen) { setIsSymbolStudioOpen(false); return 'Symbol Studio closed.'; }
      if (isVideoStudioOpen) { setIsVideoStudioOpen(false); return 'Video Studio closed.'; }
      if (isAlloStudioOpen) { setIsAlloStudioOpen(false); return 'AlloStudio closed.'; }
      if (showCinematicStudio) { setShowCinematicStudio(false); return 'Cinematic Studio closed.'; }
      if (isAccessibilityLabOpen) { setIsAccessibilityLabOpen(false); return 'Accessibility Lab closed.'; }
      if (isCommunityCatalogOpen) { setIsCommunityCatalogOpen(false); return 'Community Catalog closed.'; }
      if (isReadingLibraryOpen) { setIsReadingLibraryOpen(false); return 'Reading Library closed.'; }
      if (isDynamicAssessmentOpen) { setIsDynamicAssessmentOpen(false); return 'Dynamic Assessment closed.'; }
      if (showSelHub) { setShowSelHub(false); return 'SEL Hub closed.'; }
      if (showLearningHub) { setShowLearningHub(false); return 'Learning Hub closed.'; }
      if (showEducatorHub) { setShowEducatorHub(false); return 'Educator Hub closed.'; }
      if (activeView !== 'dashboard') { handleSetActiveViewToDashboard(); return 'Returned to the dashboard.'; }
      return 'Nothing is open to close.';
    };
    const goBack = () => {
      if (runTour && tourRect) {
        const tutorial = getTutorialVoiceState();
        return tutorial.canPrevious
          ? (invokeTutorialVoiceAction('previous') || 'Moved to the previous tutorial step.')
          : (invokeTutorialVoiceAction('exit') || 'Tutorial closed.');
      }
      if (showSaveModal || showSubmitModal || (showStudentEntry && hasSelectedRole && !isTeacherMode)) return closeCurrentSurface();
      if (isGateOpen) return closeCurrentSurface();
      if (!hasSelectedMode) return 'You are already at the launch pad.';
      if (!hasSelectedRole) {
        setHasSelectedMode(false);
        return 'Returned to the AlloFlow launch pad.';
      }
      return closeCurrentSurface();
    };
    const repeatLastResponse = () => {
      try {
        const previous = String(window.__alloLastCommandNarration || '').trim();
        return previous || 'There is no previous command response to repeat yet.';
      } catch (_) { return 'There is no previous command response to repeat yet.'; }
    };
    const _contextualText = (value, limit) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 240);
    const _contextualLessonState = () => {
      const modules = (typeof window !== 'undefined' && window.AlloModules) ? window.AlloModules : {};
      const standardsApi = modules.StandardsProvider;
      const provider = standardsApi && typeof standardsApi.getRegisteredProvider === 'function'
        ? standardsApi.getRegisteredProvider()
        : null;
      const engine = modules.SurpriseMeEngine;
      const rawQueries = [
        ...(Array.isArray(targetStandards) ? targetStandards : []),
        standardInputValue,
        standardsInput,
      ].map((value) => String(value || '').trim()).filter(Boolean);
      let standard = null;
      let standardText = rawQueries[0] || '';
      if (provider && typeof provider.resolveStandard === 'function') {
        for (const raw of rawQueries) {
          const attempts = [raw, raw.split(':')[0].trim()].filter((value, index, all) => value && all.indexOf(value) === index);
          for (const query of attempts) {
            try {
              const resolution = provider.resolveStandard(query);
              if (resolution && resolution.status === 'resolved' && resolution.match) {
                standard = resolution.match;
                standardText = query;
                break;
              }
            } catch (_) {}
          }
          if (standard) break;
        }
      }
      let hood = null;
      if (standard && provider && engine && typeof engine.buildHood === 'function') {
        try { hood = engine.buildHood(provider, standard.id); } catch (_) { hood = null; }
      }
      const topic = _contextualText(sourceTopic || (generatedContent && generatedContent.title) || inputText || standardText, 800);
      const sourceReady = !!hasSourceOrAnalysis || !!generatedContent || (Array.isArray(history) && history.some((item) => item && item.id && item.type && item.type !== 'directions'));
      const graphBrief = (record) => {
        if (!record) return '';
        const code = _contextualText(record.code, 40);
        const label = _contextualText(record.label || record.text, 150);
        return [code, label].filter(Boolean).join(' ');
      };
      const graph = hood ? {
        prerequisites: (hood.prerequisites || []).slice(0, 4).map(graphBrief).filter(Boolean),
        leadsTo: (hood.leadsTo || []).slice(0, 4).map(graphBrief).filter(Boolean),
        related: (hood.related || []).slice(0, 4).map(graphBrief).filter(Boolean),
        provider: _contextualText(hood.dataset && hood.dataset.provider, 100),
      } : { prerequisites: [], leadsTo: [], related: [], provider: '' };
      const actions = [];
      const addAction = (actionId, label, description, focus) => actions.push({ actionId, label, description, focus: focus || '' });
      if (sourceReady) {
        addAction('generate_quiz', 'Create a quiz', 'Turn the current content into a check for understanding.');
        addAction('generate_glossary', 'Build a glossary', 'Pull out key vocabulary and student-friendly meanings.');
        addAction('generate_simplified', 'Make a leveled version', 'Adapt the current content for the selected grade level.');
        addAction('generate_sentence_frames', 'Add sentence frames', 'Add structured language support for explaining the content.');
        addAction('generate_analysis', 'Analyze the content', 'Surface key ideas, evidence, and possible teaching moves.');
        addAction('generate_note_taking', 'Create guided notes', 'Turn the content into a structured note-taking support.');
        addAction('generate_anchor_chart', 'Make an anchor chart', 'Create a concise visual reference for the lesson.');
        addAction('generate_memory_aid', 'Make a memory aid', 'Create a mix of modelled, scaffolded, and student-authored retrieval cues.');
        addAction('generate_concept_sort', 'Make a concept sort', 'Create a compare-and-classify activity around the content.');
        addAction('generate_faq', 'Make an FAQ', 'Anticipate common learner questions and answers.');
        addAction('generate_brainstorm', 'Make a brainstorm web', 'Open the topic into connected ideas and examples.');
      } else if (topic) {
        addAction('generate_source_text', 'Build a source passage', 'Create an original passage that establishes the lesson context.', 'Use a clear, accessible entry point.');
        addAction('generate_source_text', 'Build a source passage through a story', 'Create an original passage with a narrative hook.', 'Use a brief narrative hook before explaining the concept.');
        addAction('generate_source_text', 'Build a source passage with examples', 'Create an original passage anchored in concrete examples.', 'Lead with a real-world example before introducing formal vocabulary.');
      }
      const latestTitles = (Array.isArray(history) ? history : []).slice().reverse().filter((item) => item && item.title).slice(0, 4).map((item) => _contextualText(item.title, 100));
      const resourceType = generatedContent && generatedContent.type ? _contextualText(generatedContent.type, 60).replace(/[-_]/g, ' ') : '';
      return {
        available: !!(topic || standard || sourceReady),
        gradeLevel: _contextualText(gradeLevel, 60),
        topic,
        sourceExcerpt: _contextualText(inputText, 1200),
        standard: standard ? { code: _contextualText(standard.code, 80), label: _contextualText(standard.label || standard.text, 220) } : null,
        standardText: _contextualText(standardText, 220),
        activeView: _contextualText(activeView, 60),
        resourceType,
        latestTitles,
        studentInterests: Array.isArray(studentInterests) ? studentInterests.slice(0, 6).map((value) => _contextualText(value, 80)).filter(Boolean) : [],
        dokLevel: _contextualText(dokLevel, 80),
        graph,
        actions,
      };
    };
    const _contextualPrompt = (state, mode) => {
      const standardLine = state.standard ? state.standard.code + ': ' + state.standard.label : state.standardText;
      const graphLines = [
        state.graph.prerequisites.length ? 'Prerequisites: ' + state.graph.prerequisites.join('; ') : '',
        state.graph.leadsTo.length ? 'Builds toward: ' + state.graph.leadsTo.join('; ') : '',
        state.graph.related.length ? 'Related: ' + state.graph.related.join('; ') : '',
      ].filter(Boolean).join('\n');
      const catalog = state.actions.map((action, index) => (index + 1) + '. ' + action.actionId + ' | ' + action.label + ' | ' + action.description + (action.focus ? ' | ' + action.focus : '')).join('\n');
      return [
        'You are AlloBot, a context-aware K-12 lesson partner.',
        mode === 'surprise'
          ? 'Choose exactly one available action. The choice should feel useful and slightly surprising, but never arbitrary or unsafe.'
          : 'Choose exactly three distinct available options. Do not execute any option; the teacher will choose later.',
        'Use only the action IDs in the catalog. Do not invent an action, standard, prerequisite, or student detail.',
        'Current app view: ' + state.activeView,
        state.gradeLevel ? 'Grade setting: ' + state.gradeLevel : '',
        state.topic ? 'Current topic or intent: ' + state.topic : '',
        state.sourceExcerpt ? 'Current source excerpt: ' + state.sourceExcerpt : '',
        standardLine ? 'Target standard: ' + standardLine : '',
        state.resourceType ? 'Open resource type: ' + state.resourceType : '',
        state.dokLevel ? 'Depth target: ' + state.dokLevel : '',
        state.studentInterests.length ? 'Student interests: ' + state.studentInterests.join(', ') : '',
        graphLines ? 'Source-provided graph context:\n' + graphLines : 'No graph context is available for this state.',
        state.latestTitles.length ? 'Recent work titles: ' + state.latestTitles.join('; ') : '',
        'AVAILABLE ACTIONS:\n' + catalog,
        mode === 'surprise'
          ? 'Return ONLY JSON: {"actionId":"...","title":"...","why":"...","focus":"..."}'
          : 'Return ONLY JSON: {"options":[{"actionId":"...","title":"...","why":"...","focus":"..."},{"actionId":"...","title":"...","why":"...","focus":"..."},{"actionId":"...","title":"...","why":"...","focus":"..."}]}',
      ].filter(Boolean).join('\n');
    };
    const _parseContextualPayload = (raw) => {
      const text = (typeof __live.cleanJson === 'function' ? __live.cleanJson(String(raw || '')) : String(raw || '')).trim();
      const candidates = [text];
      const objectStart = text.indexOf('{');
      const objectEnd = text.lastIndexOf('}');
      if (objectStart >= 0 && objectEnd > objectStart) candidates.push(text.slice(objectStart, objectEnd + 1));
      const arrayStart = text.indexOf('[');
      const arrayEnd = text.lastIndexOf(']');
      if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(text.slice(arrayStart, arrayEnd + 1));
      for (const candidate of candidates) {
        try {
          const parsed = typeof __live.safeJsonParse === 'function' ? __live.safeJsonParse(candidate) : JSON.parse(candidate);
          if (parsed) return parsed;
        } catch (_) {}
      }
      return null;
    };
    const _fallbackContextualOptions = (state) => {
      const shuffled = state.actions.slice();
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = swap;
      }
      return shuffled.slice(0, 3).map((action) => Object.assign({}, action, { title: action.label, why: action.description }));
    };
    const _normalizeContextualOptions = (state, payload) => {
      const rawOptions = payload && Array.isArray(payload.options) ? payload.options : [];
      const options = [];
      const seen = new Set();
      rawOptions.forEach((raw) => {
        const actionId = _contextualText(raw && (raw.actionId || raw.action || raw.id), 80);
        const action = state.actions.find((candidate) => candidate.actionId === actionId);
        if (!action) return;
        const key = action.actionId + '|' + _contextualText(raw && raw.focus, 160);
        if (seen.has(key)) return;
        seen.add(key);
        options.push(Object.assign({}, action, {
          title: _contextualText(raw && raw.title, 100) || action.label,
          why: _contextualText(raw && raw.why, 220) || action.description,
          focus: _contextualText(raw && raw.focus, 220) || action.focus,
        }));
      });
      const fallback = _fallbackContextualOptions(state);
      for (const option of fallback) {
        if (options.length >= 3) break;
        const key = option.actionId + '|' + _contextualText(option.focus, 160);
        if (!seen.has(key)) { seen.add(key); options.push(option); }
      }
      return options.slice(0, 3);
    };
    const _runContextualAction = async (option, state) => {
      const actionId = option && option.actionId;
      if (actionId === 'generate_source_text') {
        const baseTopic = _contextualText(state.topic, 700);
        if (!baseTopic) throw new Error('There is no lesson topic to build from yet.');
        const focus = _contextualText(option.focus, 220);
        const nextTopic = focus && baseTopic.toLowerCase().indexOf(focus.toLowerCase()) < 0 ? baseTopic + ' — ' + focus : baseTopic;
        setSourceTopic(nextTopic);
        return handleGenerate({ topic: nextTopic });
      }
      const actions = {
        generate_quiz: () => handleGenerate('quiz', null, false, null, { rethrowErrors: true }),
        generate_glossary: () => handleGenerate('glossary', null, false, null, { rethrowErrors: true }),
        generate_simplified: () => handleGenerate('simplified', null, false, null, { rethrowErrors: true }),
        generate_sentence_frames: () => handleGenerate('sentence-frames', null, false, null, { rethrowErrors: true }),
        generate_analysis: () => handleGenerate('analysis', null, false, null, { rethrowErrors: true }),
        generate_note_taking: () => handleGenerate('note-taking', null, false, null, { rethrowErrors: true }),
        generate_anchor_chart: () => handleGenerate('anchor-chart', null, false, null, { rethrowErrors: true }),
        generate_memory_aid: () => handleGenerate('memory-aid', null, false, null, { rethrowErrors: true }),
        generate_applied_challenge: () => handleGenerate('applied-challenge', null, false, null, { rethrowErrors: true }),
        generate_concept_sort: () => handleGenerate('concept-sort', null, false, null, { rethrowErrors: true }),
        generate_faq: () => handleGenerate('faq', null, false, null, { rethrowErrors: true }),
        generate_brainstorm: () => handleGenerate('brainstorm', null, false, null, { rethrowErrors: true }),
      };
      if (!actions[actionId]) throw new Error('That contextual action is not available in the current app state.');
      return actions[actionId]();
    };
    const surpriseMeContextually = async () => {
      const state = _contextualLessonState();
      if (!state.available || !state.actions.length) return 'I need a current topic, source, standard, or open resource before I can choose a useful surprise.';
      let option = null;
      try {
        const raw = await __live.callGemini(_contextualPrompt(state, 'surprise'), true, false, 0.95);
        const payload = _parseContextualPayload(raw);
        const actionId = _contextualText(payload && (payload.actionId || payload.action || payload.id), 80);
        const action = state.actions.find((candidate) => candidate.actionId === actionId);
        if (action) option = Object.assign({}, action, { title: _contextualText(payload.title, 100) || action.label, why: _contextualText(payload.why, 220) || action.description, focus: _contextualText(payload.focus, 220) || action.focus });
      } catch (_) {}
      if (!option) {
        const fallback = _fallbackContextualOptions(state);
        option = fallback[0] || state.actions[0];
      }
      await _runContextualAction(option, state);
      const graphNote = state.standard ? ' I used the resolved standard' + (state.graph.provider ? ' and its ' + state.graph.provider + ' graph context' : '') + ' when choosing.' : '';
      return 'Surprise me chose "' + option.title + '". ' + option.why + ' I started that next step.' + graphNote;
    };
    const suggestContextualNextSteps = async () => {
      const state = _contextualLessonState();
      if (!state.available || !state.actions.length) return 'I need a current topic, source, standard, or open resource before I can suggest next steps.';
      let options = [];
      try {
        const raw = await __live.callGemini(_contextualPrompt(state, 'suggest'), true, false, 0.75);
        options = _normalizeContextualOptions(state, _parseContextualPayload(raw));
      } catch (_) { options = _fallbackContextualOptions(state); }
      if (options.length < 3) options = _normalizeContextualOptions(state, { options });
      _contextualSuggestionRef.current = { options, state, createdAt: Date.now() };
      return 'Here are three next steps. ' + options.map((option, index) => 'Option ' + (index + 1) + ': ' + option.title + '. ' + option.why).join(' ') + ' Say use option 1, 2, or 3 when you are ready.';
    };
    const useContextualSuggestion = async (rawOption) => {
      const packet = _contextualSuggestionRef.current || {};
      const number = Number(rawOption);
      if (!Array.isArray(packet.options) || !packet.options.length || !packet.createdAt || Date.now() - packet.createdAt > 30 * 60 * 1000) return 'Those suggestions have expired. Say suggest 3 next steps to make a fresh set.';
      if (!Number.isInteger(number) || number < 1 || number > packet.options.length) return 'Say use option 1, 2, or 3.';
      const option = packet.options[number - 1];
      const state = _contextualLessonState();
      await _runContextualAction(option, state);
      _contextualSuggestionRef.current = { options: [], state: null, createdAt: 0 };
      return 'Using option ' + number + ': ' + option.title + '. I started that next step.';
    };    const requestTestPrepVoiceControl = (action = 'status') => {
      let response = null;
      try {
        const requestId = `global-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        window.dispatchEvent(new CustomEvent('alloflow:test-prep-voice-control', {
          detail: {
            action,
            requestId,
            respond: (payload) => { response = payload || null; },
          },
        }));
      } catch (_) {}
      if (response) return response;
      return {
        ok: false,
        ready: false,
        active: false,
        state: isTestPrepHubOpen ? 'loading' : 'closed',
        message: isTestPrepHubOpen
          ? 'Test Prep voice controls are still loading. Try again in a moment.'
          : 'Open Test Prep Hub first.',
      };
    };

    const ctx = {
      t, addToast, callGemini: __live.callGemini, commandAudience,
      openSchoolStoreRecognition: () => {
        if (!isTeacherMode || isStudentLinkMode || isParentMode || isIndependentMode) return false;
        if (!normalizeAlloEvaluationPortalUrl(schoolRewardsPortalUrl)) { handleOpenSchoolRewards(); return false; }
        return handleOpenSchoolRewardsPortal(true);
      },
      openSchoolStoreGuide: (path) => {
        if (!isTeacherMode || isStudentLinkMode || isParentMode || isIndependentMode || !['practice', 'join', 'setup'].includes(path)) return false;
        // Local navigation only; no configuration, identity or permission crosses chat.
        handleOpenSchoolRewards();
        setSchoolRewardsGuide(current => ({ path, serial: current.serial + 1 }));
        return true;
      },
      onboardingStage: !hasSelectedMode ? 'path' : (!hasSelectedRole ? 'role' : null),
      chooseOnboardingPath, chooseOnboardingRole,
      describeCurrentScreen, listCurrentActions, goBack, closeCurrentSurface, repeatLastResponse,
      contextualIdeaAvailable: _contextualLessonState().available,
      contextualSuggestionCount: (_contextualSuggestionRef.current && Array.isArray(_contextualSuggestionRef.current.options)) ? _contextualSuggestionRef.current.options.length : 0,
      adventureOpen: activeView === 'adventure',
      adventureHasScene: !!(adventureState && adventureState.currentScene),
      adventureReadingPracticeEnabled: !!adventureFluencyEnabled,
      adventureTypingPaceEnabled: !!adventureTypingPaceEnabled,
      adventureFreeResponseEnabled: !!adventureFreeResponseEnabled,
      openAdventureReadingPractice: () => {
        if (activeView !== 'adventure' || !adventureState || !adventureState.currentScene || !adventureFluencyEnabled) return false;
        try {
          const control = document.querySelector('[data-help-key="adventure_scene_reading_practice"], [data-help-key="adventure_immersive_reading_practice"]');
          if (!control || control.disabled) return false;
          control.click();
          return true;
        } catch (_) { return false; }
      },
      setAdventureReadingPracticeEnabled: (enabled) => {
        if (activeView !== 'adventure' || (!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings)) return false;
        setAdventureFluencyEnabled(!!enabled);
        return true;
      },
      setAdventureTypingPaceEnabled: (enabled) => {
        if (activeView !== 'adventure' || !adventureFreeResponseEnabled || (!isTeacherMode && studentProjectSettings.adventurePermissions?.lockAllSettings)) return false;
        setAdventureTypingPaceEnabled(!!enabled);
        return true;
      },
      surpriseMeContextually,
      suggestContextualNextSteps,
      useContextualSuggestion,
      requestTestPrepVoiceControl,
      getTutorialVoiceState,
      invokeTutorialVoiceAction,
      listLearnerResources,
      isLearnerResourceDiscoveryActive,
      getCurrentLearnerResource,
      invokeLearnerResourceAction,
      listVoiceEditableFields: _listMainVoiceEditableFields,
      getSelectedVoiceEditableFieldId: () => _voiceEditableFieldSelectionRef.current,
      selectVoiceEditableField: _selectMainVoiceEditableField,
      editVoiceEditableField: _editMainVoiceEditableField,
      setShowEducatorHub, setShowLearningHub, openExportPreview, setShowWizard,
      setShowNotebook, openTranslateModal: handleSetIsTranslateModalOpenToTrue,
      setShowSessionModal, setShowClassAnalytics, setIsResearchSuiteOpen, setShowExportMenu, setShowAIBackendModal,
      setShowRecentQrShares,
      setShowTextSettings, setShowVoiceSettings, setShowReadThisPage,
      openSourceInput: () => {
        setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('create'); setActiveView('input');
        setShowUrlInput(false); setShowSourceGen(false);
        setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev]);
        setTimeout(() => {
          try {
            const panel = document.getElementById('tour-input-panel');
            if (!panel) return;
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const field = panel.querySelector('textarea, [contenteditable="true"], input[type="text"], input');
            if (field && field.focus) field.focus();
          } catch (_) {}
        }, 150);
      },
      openSourceUrl: () => {
        setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('create'); setActiveView('input');
        setShowSourceGen(false); setShowUrlInput(true);
        setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev]);
        setTimeout(() => {
          try {
            const panel = document.getElementById('tour-input-panel');
            if (!panel) return;
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const field = panel.querySelector('input[type="url"], input[type="text"], input');
            if (field && field.focus) field.focus();
          } catch (_) {}
        }, 200);
      },
      openSourceGenerator: () => {
        setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('create'); setActiveView('input');
        setShowUrlInput(false); setShowSourceGen(true);
        setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev]);
        setTimeout(() => {
          try {
            const panel = document.getElementById('tour-input-panel');
            if (!panel) return;
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const field = panel.querySelector('input[type="text"], textarea, [contenteditable="true"], input');
            if (field && field.focus) field.focus();
          } catch (_) {}
        }, 150);
      },
      // W3 2026-08-16: Math Fluency and Fluency Maze had exactly one door each,
      // the 5th and 6th <option> of the Mode <select> inside the collapsed Math
      // accordion. A dropdown option is not searchable and carries no
      // description, so a full CBM probe instrument was effectively invisible.
      // These give the palette, chat and voice a real entry. Same shape as
      // openSourceInput above: close the hubs, show the create sidebar, expand
      // the Math accordion, select the mode, then scroll it into view.
      openMathFluency: () => {
        setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('create');
        setMathMode('Fluency Probes');
        setExpandedTools(prev => prev.includes('math') ? prev : ['math', ...prev]);
        setTimeout(() => {
          try { document.getElementById('tour-tool-math')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        }, 150);
      },
      openFluencyMaze: () => {
        setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('create');
        setMathMode('Fluency Maze');
        setExpandedTools(prev => prev.includes('math') ? prev : ['math', ...prev]);
        setTimeout(() => {
          try { document.getElementById('tour-tool-math')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        }, 150);
      },
      // X6 2026-08-17: doors for surfaces that joined the coverage baseline 08-16.
      // openBrainstormActivity: activityMode is component-local state inside
      // BrainstormPanel (a lazily-mounted CDN module), so after expanding the
      // accordion we hand the mode to the panel through the bridge it registers
      // while mounted (window.__alloSetBrainstormActivityMode), retrying briefly
      // because the module mounts async. A null mode just opens the picker.
      openBrainstormActivity: (mode) => {
        setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('create');
        setExpandedTools(prev => prev.includes('brainstorm') ? prev : ['brainstorm', ...prev]);
        let tries = 0;
        const applyMode = () => {
          tries += 1;
          const setModeBridge = window.__alloSetBrainstormActivityMode;
          if (typeof setModeBridge === 'function') { if (mode) { try { setModeBridge(mode); } catch (_) {} } }
          else if (tries < 20) { setTimeout(applyMode, 150); return; }
          try { document.getElementById('tour-tool-brainstorm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        };
        setTimeout(applyMode, 150);
      },
      jumpToLatestLessonPlan: latestLessonPlan ? (() => { try { handleRestoreView(latestLessonPlan); } catch (_) {} }) : null,
      // Leadership Hub pass 2026-08-17: the admin suite's only door was
      // Educator Hub -> card; this gives the palette/voice a direct one.
      openLeadershipHub: () => {
        setShowEducatorHub(false); setShowLearningHub(false);
        if (typeof window.__alloLazyAdminHub === 'function') { try { window.__alloLazyAdminHub(); } catch (_) {} }
        setIsAdminHubOpen(true);
      },
      openHistory: () => { setShowEducatorHub(false); setShowLearningHub(false); setActiveSidebarTab('history'); },
      setSetupGradeLevel: (value) => {
        const raw = String(value || '').trim();
        if (!raw) return gradeLevel || '5th Grade';
        const lower = raw.toLowerCase();
        let next = raw;
        if (/^(k|pre[-\s]?k|kindergarten)$/.test(lower)) next = 'Kindergarten';
        else if (/graduate/.test(lower)) next = 'Graduate Level';
        else if (/college|university/.test(lower)) next = 'College';
        else {
          const m = lower.match(/\d{1,2}/);
          if (m) {
            const n = Math.max(1, Math.min(12, parseInt(m[0], 10)));
            next = n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th') + ' Grade';
          }
        }
        setGradeLevel(next);
        try { setSourceLevel(next); } catch (_) {}
        return next;
      },
      setSetupSourceTone: (value) => {
        const raw = String(value || '').trim();
        const key = raw.toLowerCase().replace(/[^a-z]/g, '');
        const map = { informative: 'Informative', info: 'Informative', explanatory: 'Informative', narrative: 'Narrative', story: 'Narrative', dialogue: 'Dialogue', dialog: 'Dialogue', conversation: 'Dialogue', conversational: 'Dialogue', persuasive: 'Persuasive', argument: 'Persuasive', humorous: 'Humorous', funny: 'Humorous', procedural: 'Step-by-Step', stepbystep: 'Step-by-Step', steps: 'Step-by-Step' };
        const next = map[key] || raw || sourceTone || 'Informative';
        setSourceTone(next);
        return next;
      },
      setSetupSourceLength: (value) => {
        const raw = String(value || '').trim().toLowerCase();
        const lenMap = { short: '150', brief: '150', standard: '250', medium: '250', normal: '250', detailed: '500', long: '500', exhaustive: '1000', extended: '1000' };
        let next = lenMap[raw];
        if (!next) {
          const n = parseInt(raw, 10);
          if (!Number.isNaN(n) && n > 0) next = String(Math.max(50, Math.min(2000, n)));
        }
        if (!next) next = sourceLength || '250';
        setSourceLength(next);
        return next;
      },
      setSetupLanguage: (value) => {
        const next = String(value || '').trim().slice(0, 60) || leveledTextLanguage || 'English';
        setLeveledTextLanguage(next);
        if (next && next.toLowerCase() !== 'english') {
          setSelectedLanguages(prev => Array.isArray(prev) && prev.includes(next) ? prev : [...(Array.isArray(prev) ? prev : []), next]);
        }
        return next;
      },
      handleToggleFocusMode, handleToggleReadingRuler, handleToggleIsHelpMode, handleToggleIsBotVisible,
      handleToggleVisualSupports, handleToggleShowSocraticChat,
      toggleLineFocus: () => setIsLineFocusMode(prev => !prev),
      toggleDictation: () => setIsDictationMode(prev => !prev),
      zenOn: handleSetIsZenModeToTrue, zenOff: handleSetIsZenModeToFalse,
      fontBigger: () => { const v = Math.min(48, (sliderFontSize || 16) + 2); setSliderFontSize(v); return v; },
      fontSmaller: () => { const v = Math.max(10, (sliderFontSize || 16) - 2); setSliderFontSize(v); return v; },
      resetFontSize,
      isStudentLinkMode, isIndependentMode, isParentMode,
      allowStudentDictation: studentProjectSettings.allowDictation !== false,
      allowStudentSocratic: studentProjectSettings.allowSocraticTutor !== false,
      studentAiFeaturesHidden,
      // Context signals (2026-06-13, read-only) — drive contextual command surfacing/grouping
      // in the palette. Pure state mirrors beside pipelineOpen/voiceActive: no handlers, cannot
      // throw. (Slice 1 of the context-aware palette; the renderer consumes these in a later slice.)
      educatorHubOpen: showEducatorHub,
      learningHubOpen: showLearningHub,
      researchSuiteOpen: isResearchSuiteOpen,
      sourceSetupOpen: activeSidebarTab === 'create' && activeView === 'input',
      symbolStudioOpen: isSymbolStudioOpen,
      videoStudioOpen: isVideoStudioOpen,
      alloStudioOpen: isAlloStudioOpen,
      cinematicStudioOpen: showCinematicStudio,
      openGrooveOpen: isOpenGrooveOpen,
      timelineStudioOpen: isTimelineStudioOpen,
      linguaPracticeOpen: isLinguaPracticeOpen,
      testPrepHubOpen: isTestPrepHubOpen,
      researchHubOpen: showResearchHub,
      litLabOpen: showLitLab,
      learningWebExplorerOpen: showLearningWebExplorer,
      mindMapOpen: showMindMap,
      poetTreeOpen: showPoetTree,
      liveSessionActive: !!activeSessionCode,
      stemLabOpen: showStemLab,
      stemLabTool,
      behaviorLensOpen: showBehaviorLens,
      contentLoaded: !!generatedContent,
      zenActive: isZenMode,
      focusActive: focusMode,
      // Slice 2 (2026-06-13): essential ACTION capabilities — thin wrappers on existing host
      // handlers (handleGenerate ~20978, handleSetShowSubmitModalToTrue ~7753). hasSourceOrAnalysis
      // (~23395) gates the generate commands; isTeacherMode (~3434) gates the student submit command.
      hasSourceOrAnalysis,
      isTeacherMode,
      // rethrowErrors: without it handleGenerate swallows every failure (toast +
      // resolve undefined), so a failed generation reported SUCCESS to the command
      // layer — AlloBot spoke "Quiz ready" over an error banner, and a Demo
      // Autopilot run died one step LATER on a when-guard with a misleading
      // "isn't available right now" instead of the real reason. executeCommand
      // already converts rejections into honest step failures.
      generateQuiz: () => handleGenerate('quiz', null, false, null, { rethrowErrors: true }),
      generateGlossary: () => handleGenerate('glossary', null, false, null, { rethrowErrors: true }),
      generateSimplified: (cfg) => handleGenerate('simplified', null, false, null, Object.assign({ rethrowErrors: true }, cfg || {})),
      generateSentenceFrames: () => handleGenerate('sentence-frames', null, false, null, { rethrowErrors: true }),
      generateAnalysis: () => handleGenerate('analysis', null, false, null, { rethrowErrors: true }),
      submitWork: handleSetShowSubmitModalToTrue,
      hasAssignmentDirections: !!assignmentDirections,
      openAssignmentDirections: () => { if (assignmentDirections) handleRestoreView(assignmentDirections); },
      getAssignmentProgress,
      canSaveStudentWork: Array.isArray(history) && history.length > 0,
      saveStudentWork: initiateSaveStudentProject,
      getNextAssignmentStep,
      openNextAssignmentStep: () => { const step = getNextAssignmentStep(); if (step && step.item) handleRestoreView(step.item); return step; },
      readAssignmentDirections: () => { if (!assignmentDirections) return false; handleRestoreView(assignmentDirections); setTimeout(() => startReadThisPage(), 80); return true; },
      getSuccessCriteria,
      getTeacherFeedback,
      sendTeacherSignal: (signal) => {
        if (!activeSessionCode || !user || !user.uid || !LIVE_SIGNAL_OPTIONS.some((option) => option.id === signal)) return false;
        const signalRef = __live.doc(db, 'artifacts', activeSessionAppId || appId, 'public', 'data', 'sessions', activeSessionCode);
        writeToSession(signalRef, { ['roster.' + user.uid + '.signal']: signal, ['roster.' + user.uid + '.signalAt']: Date.now() }).catch(() => {});
        setShowStudentSignals(false);
        return true;
      },
      canEditAssignmentDirections: getAssignmentMapItems().length > 0 || !!generatedContent,
      editAssignmentDirections: () => setShowDirectionsComposer(true),
      openAssessmentBuilder: () => setShowAssessmentBuilder(true),
      openUdlGuide: () => setShowUDLGuide(true),
      // ── Blueprint capabilities (2026-07-28) ──
      // Gates for the palette: a command whose `when` is false never appears,
      // so these double as the availability contract.
      hasActiveBlueprint: !!(activeBlueprint && Array.isArray(activeBlueprint.resourcePlan) && activeBlueprint.resourcePlan.length),
      lessonTemplateNames: () => (Array.isArray(lessonTemplates) ? lessonTemplates : []).map(tpl => ({ id: tpl && tpl.id, name: tpl && tpl.name })).filter(x => x.id),
      // Steps are addressed to the teacher by 1-based POSITION (what they see
      // on the card) and translated to the Stage-2 uiId here — the palette must
      // never carry a positional index into the executor.
      blueprintStepList: () => {
        const plan = (activeBlueprint && Array.isArray(activeBlueprint.resourcePlan)) ? activeBlueprint.resourcePlan : [];
        return plan.map((r, i) => ({ position: i + 1, tool: r && (r.tool || r.type), uiId: r && (r.uiId || r.stepId) })).filter(s => s.uiId);
      },
      runBlueprint: () => { setShowUDLGuide(true); return handleExecuteBlueprint(); },
      stopBlueprintRun: handleStopBlueprintRun,
      waitForCommandState: () => new Promise(resolve => setTimeout(() => {
        // Commit queued React updates before the next command reads guards or handlers.
        if (typeof ReactDOM.flushSync === 'function') ReactDOM.flushSync(() => {});
        resolve();
      }, 0)),
      planFullPack: () => { selectToolFromCatalog('package-deliver'); return handlePlanFullPack(); },
      fullPackPlanReady: fullPackRun?.status === 'ready',
      generateFullPack: () => {
        selectToolFromCatalog('package-deliver');
        return fullPackRun?.status === 'ready' ? handleApproveFullPack() : handlePlanFullPack();
      },
      rebuildBlueprintStep: (position) => {
        const plan = (activeBlueprint && Array.isArray(activeBlueprint.resourcePlan)) ? activeBlueprint.resourcePlan : [];
        const requested = Number(position);
        if (!Number.isInteger(requested) || requested < 1 || requested > plan.length) return null;
        const idx = requested - 1;
        const row = plan[idx];
        if (!row) return null;
        setShowUDLGuide(true);
        return handleRebuildBlueprintStep(row.uiId || row.stepId, { reportCompletion: true });
      },
      applyLessonTemplateByName: (name) => {
        const list = Array.isArray(lessonTemplates) ? lessonTemplates : [];
        const needle = String(name || '').trim().toLowerCase();
        if (!needle) return null;
        const hit = list.filter(tpl => tpl && String(tpl.name || '').toLowerCase().indexOf(needle) !== -1)[0];
        if (!hit) return null;
        handleApplyLessonTemplate(hit.id);
        return hit;
      },
      openCommandBlueprintLibrary: () => {
        try { setIsBotVisible(true); } catch (_) {}
        setShowUDLGuide(true);
        setTimeout(() => { try { handleSendUDLMessage('__allo_plan_library'); } catch (_) {} }, 0);
      },
      canGenerateCurrentRubric: rubricActivityIndex >= 0,
      generateCurrentRubric: () => rubricActivityIndex >= 0 ? handleGenerateBrainstormRubric(rubricActivityIndex) : Promise.resolve(false),
      canShareAssignment: getAssignmentMapItems().length > 0 || !!(generatedContent && generatedContent.id && _alloIsStudentSafeResource(generatedContent)),
      shareResourceCount: Math.max(1, getAssignmentMapItems().length || ((generatedContent && generatedContent.id && _alloIsStudentSafeResource(generatedContent)) ? 1 : 0)),
      shareExpiryDays: homeworkExpiryDays,
      shareStudentAiPolicy: studentAiPolicyForShare,
      shareAssignment: createHomeworkAssignmentLink,
      canPreviewStudentAssignment: !!latestStudentPreviewShare,
      previewStudentAssignment: () => { if (!latestStudentPreviewShare) return false; openStudentQrPreview(latestStudentPreviewShare.url, 'homework link as a student'); return true; },
      hasResumableWork: !!latestResumableWork,
      resumeLatestWork: () => { if (latestResumableWork) handleRestoreView(latestResumableWork); return latestResumableWork; },
      // Pipeline-aware commands (guarded by `when` in the registry)
      pipelineOpen: !!pdfFixResult,
      getPipelineScore: () => pdfFixResult ? { before: (Number.isFinite(pdfFixResult.beforeScore) ? pdfFixResult.beforeScore : null), after: (Number.isFinite(pdfFixResult.afterScore) ? pdfFixResult.afterScore : null), target: pdfTargetScore } : null,
      getRemainingIssues: () => (pdfFixResult && pdfFixResult.verificationAudit && Array.isArray(pdfFixResult.verificationAudit.issues)) ? pdfFixResult.verificationAudit.issues : [],
      jumpToPipelineSection: (id) => { try { const el = document.getElementById(id); if (!el) return false; if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; } catch (_) { return false; } },
      // Voice loop (opt-in only; singleton lives on window so an old
      // session can never leave a hidden live mic)
      hasPendingGuidedChoice: (() => {
        const last = Array.isArray(udlMessages) && udlMessages.length ? udlMessages[udlMessages.length - 1] : null;
        return !!(last && last.role === 'model' && last.type === 'choices');
      })(),
      voiceActive: alloVoiceActive,
      voiceSessionStatus: alloVoiceSessionStatus,
      voiceAvailable: _alloVoiceInputAvailable(),
      selectedVoice,
      voiceSpeed,
      voiceVolume,
      callGeminiAudio,
      setVoiceActive: setAlloVoiceActive,
      // The UI stores friendly names ("Spanish", "French (Canadian)"), while
      // recognition engines require BCP-47. Reuse the shared language map.
      voiceLang: (() => { try { return __live.getSpeechLangCode(currentUiLanguage) || 'en-US'; } catch (_) { return 'en-US'; } })(),
      voiceSpeakReplies: (() => { try { return localStorage.getItem('allo_voice_speak_replies') !== 'off'; } catch (_) { return true; } })(),
      startVoiceLoop: () => {
        const AC = window.AlloModules && window.AlloModules.AlloCommands;
        if (!AC || !AC.createVoiceLoop) { addToast(t('toasts.voice_module_missing') || 'Voice control is still loading — try again in a moment.', 'info'); return; }
        try {
          if (!window.__alloVoiceLoop) window.__alloVoiceLoop = AC.createVoiceLoop(
            () => _alloCmdCtxRef.current || _alloCmdCtx(),
            { voiceService: window.AlloFlowVoice, callGeminiAudio }
          );
          const started = window.__alloVoiceLoop.start();
          return started !== false && !!(window.__alloVoiceLoop.isActive && window.__alloVoiceLoop.isActive());
        } catch (error) {
          setAlloVoiceActive(false);
          addToast((error && error.message) || 'Voice control could not start.', 'error');
          return false;
        }
      },
      stopVoiceLoop: () => { try { if (window.__alloVoiceLoop) window.__alloVoiceLoop.stop(); } catch (_) {} },
      // L7/A1 — the conversation sink for hands-free mode. Speech that matched
      // no command is an ordinary AlloBot turn, never an error. It goes through
      // _sendUdlToChat, the SAME single delivery path the typed box uses, so the
      // transcript, the persona and the workflow context are shared and the two
      // input modes cannot drift. Resolves with the reply text (the voice loop
      // speaks it), or null if nothing came back inside the window.
      converse: (text) => {
        const clean = String(text || '').trim();
        if (!clean) return Promise.resolve(null);
        const waiter = { resolve: null, timer: null };
        const reply = new Promise((resolve) => { waiter.resolve = resolve; });
        const drop = () => { _voiceConverseWaitersRef.current = _voiceConverseWaitersRef.current.filter((entry) => entry !== waiter); };
        // Bounded: a model that never answers must not leave the loop waiting
        // on a promise forever. 45s matches the spoken-confirmation window.
        waiter.timer = setTimeout(() => { drop(); try { waiter.resolve(null); } catch (_) {} }, 45000);
        _voiceConverseWaitersRef.current = _voiceConverseWaitersRef.current.concat([waiter]);
        try { _sendUdlToChat(clean); }
        catch (_) {
          try { clearTimeout(waiter.timer); } catch (__) {}
          drop();
          return Promise.resolve(null);
        }
        return reply;
      },
      // "Where is X?" — answer by POINTING: score every visible
      // [data-help-key] element against the query, spotlight the best.
      whereIs: (query) => {
        try {
          const q = String(query || '').toLowerCase().trim();
          if (!q) return null;
          const qTokens = q.split(/\s+/).filter((w) => w.length > 2);
          let best = null, bestScore = 0;
          document.querySelectorAll('[data-help-key]').forEach((el) => {
            if (!el.offsetParent && el.getClientRects().length === 0) return; // off-screen/hidden
            const key = (el.getAttribute('data-help-key') || '').replace(/_/g, ' ');
            const hay = (key + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.textContent || '').slice(0, 80)).toLowerCase();
            let s = 0;
            if (hay.includes(q)) s = 100;
            else s = qTokens.filter((w) => hay.includes(w)).length * 30;
            if (s > bestScore) { bestScore = s; best = el; }
          });
          if (!best || bestScore < 30) {
            return (t('agent.where_miss') || 'I don’t see “') + query + (t('agent.where_miss2') || '” on this screen — it may live in a different view. Try opening the Educator Hub or Learning Hub first.');
          }
          const label = best.getAttribute('aria-label') || best.getAttribute('title') || (best.textContent || '').trim().slice(0, 40) || query;
          let helpText = '';
          try { helpText = (typeof _helpLookup === 'function' ? (_helpLookup(best.getAttribute('data-help-key')) || '') : '').split('. ')[0]; } catch (_) {}
          try { best.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
          showSpotlight(best, '📍 ' + label, helpText || (t('agent.where_found_text') || 'Here it is.'));
          return (t('agent.where_found') || 'Found it — spotlighting “') + label + (t('agent.where_found2') || '” on screen.');
        } catch (_) { return null; }
      },
      startAppTour: () => { try { setTourStep(0); } catch (_) {} setRunTour(true); },
      // S3: parameter-carrying capabilities
      startLessonFlow: (p) => {
        try { setIsBotVisible(true); } catch (_) {}
        // handleAutoFillToggle SEEDS the flow and pushes the welcome message
        // into udlMessages, but it never opens the panel — and showUDLGuide
        // defaults false. Without this the teacher gets a talking avatar and
        // no chat: the first turn of the guided flow is written into a closed
        // window. Open it here, at every front door.
        try { setShowUDLGuide(true); } catch (_) {}
        // Reuse the PRODUCTION Auto-Fill entry — same stage seeding, same
        // bot welcome — so the agent and the checkbox share one path.
        handleAutoFillToggle({ target: { checked: true } }, p || {});
      },
      setFontSizeTo: (nv) => { const v = Math.max(10, Math.min(48, Number(nv) || 16)); setSliderFontSize(v); return v; },
      prefillTranslateLang: (lang) => { try { window.dispatchEvent(new CustomEvent('alloflow:agent-set-translate-lang', { detail: { lang: String(lang || '') } })); } catch (_) {} },
      startPipelineTour: (which) => { try { startPipelineTour(which || 'results'); } catch (_) {} },
      // Live-class command coverage (2026-07-16): mirror the Live Session Center buttons.
      // These only open teacher/student live tools; broadcast/send actions remain explicit in the opened UI.
      activeSessionCode,
      openLiveSessionCenter: () => setShowLiveDock(true),
      openLivePoll: () => { setLivePollPreset(null); setShowLivePollingPanel(true); setShowLiveDock(false); },
      openQuickCheck: () => {
        setLivePollPreset({
          type: 'rating',
          prompt: t('live_dock.quick_check_prompt') || 'How is this landing for you right now?',
          ratingMin: 1,
          ratingMax: 3,
          ratingLabels: t('live_dock.quick_check_labels') || '1 = Confused\n2 = Okay\n3 = Ready',
          afterSubmitMode: 'dismiss',
        });
        setShowLivePollingPanel(true);
        setShowLiveDock(false);
      },
      openPictionaryHost: () => { setShowPictionaryHost(true); setShowLiveDock(false); },
      openGroupTools: () => { setShowLiveDock(false); handleSetShowGroupModalToTrue(); },
      openStudentSignals: () => setShowStudentSignals(true),
      // ── S0 additions (2026-06-13) ──
      // closeOtherPanels(keep): the panel-stacking fix. A Ctrl+K / voice / bot command that
      // opens a LARGE primary surface used to leave any already-open hub stacked behind it
      // (no mutual-exclusion existed). This closes the other large fixed-inset overlays via
      // their existing setters, skipping the one being opened. DELIBERATELY excludes the
      // wizard/setup screen (showWizard defaults true — closing it blanks the view), the
      // educator gate, the palette itself, the voice indicator, and the z-300 AI-Settings /
      // Translate modals (those are designed to sit OVER a hub).
      closeOtherPanels: (keep) => {
        const closers = {
          educatorHub: () => setShowEducatorHub(false),
          learningHub: () => setShowLearningHub(false),
          notebook: () => setShowNotebook(false),
          classAnalytics: () => setShowClassAnalytics(false),
          researchSuite: () => setIsResearchSuiteOpen(false),
          recentQrShares: () => setShowRecentQrShares(false),
          sessionModal: () => setShowSessionModal(false),
          exportMenu: () => setShowExportMenu(false),
          exportPreview: () => setShowExportPreviewWrapped(false),
          readThisPage: () => closeReadThisPage(),
          // Tool workspaces (2026-06-13): launching a tool from the palette/voice/bot now
          // closes any other open tool or hub instead of stacking. Lumen rides on stemLab.
          behaviorLens: () => setShowBehaviorLens(false),
          reportWriter: () => setShowReportWriter(false),
          symbolStudio: () => setIsSymbolStudioOpen(false),
          videoStudio: () => setIsVideoStudioOpen(false),
          alloStudio: () => setIsAlloStudioOpen(false),
          cinematicStudio: () => setShowCinematicStudio(false),
          openGroove: () => setIsOpenGrooveOpen(false),
          timelineStudio: () => setIsTimelineStudioOpen(false),
          linguaPractice: () => setIsLinguaPracticeOpen(false),
          testPrepHub: () => setIsTestPrepHubOpen(false),
          researchHub: () => setShowResearchHub(false),
          litLab: () => setShowLitLab(false),
          learningWebExplorer: () => setShowLearningWebExplorer(false),
          mindMap: () => { setShowMindMap(false); setThroughlineSeedUnitId(null); },
          poetTree: () => setShowPoetTree(false),
          accessibilityLab: () => setIsAccessibilityLabOpen(false),
          communityCatalog: () => setIsCommunityCatalogOpen(false),
          readingLibrary: () => setIsReadingLibraryOpen(false),
          dynamicAssessment: () => setIsDynamicAssessmentOpen(false),
          stemLab: () => setShowStemLab(false),
          storyForge: () => setShowStoryForge(false),
          alloHaven: () => setIsAlloHavenOpen(false),
          selHub: () => setShowSelHub(false),
        };
        Object.keys(closers).forEach((id) => { if (id !== keep) { try { closers[id](); } catch (_) {} } });
      },
      // Accessibility self-service parity (toggles — no panel, so not tagged opensPanel):
      toggleTheme,
      toggleOverlay,
      toggleAnimations: handleToggleDisableAnimations,
      // Navigation parity:
      goToDashboard: handleSetActiveViewToDashboard,
      returnToStart: handleReturnToStart,
      openRoster: () => setIsRosterKeyOpen(true),
      openProjectSettings: handleSetIsProjectSettingsOpenToTrue,
      // Report a problem — mirror the ErrorReporter public API with a graceful fallback:
      openErrorReporter: () => {
        try { if (window.AlloModules && window.AlloModules.ErrorReporter && typeof window.AlloModules.ErrorReporter.openPanel === 'function') { window.AlloModules.ErrorReporter.openPanel(); return; } } catch (_) {}
        try { addToast((t('toasts.error_reporter_loading') || 'The problem reporter is still loading — try again in a moment.'), 'info'); } catch (_) {}
      },
      // ── Nested-tool launchers (2026-06-13) ── open a workspace that normally lives behind a
      // hub card. closeOtherPanels (each command is opensPanel-tagged in the registry) closes the
      // hub / other tools first, so these just OPEN — mirroring the hub cards' setters exactly.
      openStemLab: () => { setStemLabTool(null); setStemLabTab('explore'); setShowStemLab(true); },
      openStoryForge: () => setShowStoryForge(true),
      openAlloHaven: () => setIsAlloHavenOpen(true),
      openBehaviorLens: () => setShowBehaviorLens(true),
      openReportWriter: () => setShowReportWriter(true),
      openSymbolStudio: () => setIsSymbolStudioOpen(true),
      openVideoStudio: () => setIsVideoStudioOpen(true),
      openCinematicStudio: () => setShowCinematicStudio(true),
      openAlloStudio: () => setIsAlloStudioOpen(true),
      openOpenGroove: () => setIsOpenGrooveOpen(true),
      openTimelineStudio: () => setIsTimelineStudioOpen(true),
      openLinguaPractice: () => setIsLinguaPracticeOpen(true),
      openTestPrepHub: () => setIsTestPrepHubOpen(true),
      openResearchHub: () => setShowResearchHub(true),
      openLitLab: () => setShowLitLab(true),
      openLearningWebExplorer: () => setShowLearningWebExplorer(true),
      openMindMap: () => { setThroughlineSeedUnitId(null); setShowMindMap(true); },
      openPoetTree: () => setShowPoetTree(true),
      openAccessibilityLab: () => setIsAccessibilityLabOpen(true),
      openLumen: () => { _alloRequestStemPlugin('lumen'); setStemLabTool('lumen'); setShowStemLab(true); },
      openFreeForms: () => { _alloRequestStemPlugin('freeForms'); setStemLabTool('freeForms'); setShowStemLab(true); },
      // Generic launcher behind the open_stem_tool command. The id is resolved
      // from the capability index up in the command layer, so the host just
      // honours it. Setting the tab matters: the lab renders the active tool
      // only while the Explore tab is showing.
      openStemTool: (id) => { if (!id) return false; _alloRequestStemPlugin(id); setStemLabTool(String(id)); setStemLabTab('explore'); setShowStemLab(true); return true; },
      openCommunityCatalog: () => setIsCommunityCatalogOpen(true),
      readingLibraryIndex: readingLibraryIndexForBot,
      openReadingBook: (slug) => {
        if (slug) setPendingReadingBookSlug(slug);
        setIsReadingLibraryOpen(true);
      },
      findReadingBooks: (params) => {
        const AC = window.AlloModules && window.AlloModules.AlloCommands;
        const index = readingLibraryIndexForBot;
        const books = index && Array.isArray(index.books) ? index.books : [];
        if (!AC || typeof AC.findReadingMatches !== 'function' || !books.length) {
          setIsReadingLibraryOpen(true);
          return 'I opened the Reading Library. The librarian index is still loading, so try that topic again in a moment.';
        }
        const matches = AC.findReadingMatches(index, params || {}, { limit: 4 });
        if (!matches.length) {
          setIsReadingLibraryOpen(true);
          const req = typeof AC.normalizeReadingRequest === 'function' ? AC.normalizeReadingRequest(params || {}) : (params || {});
          const topic = req && req.topic ? ' for "' + req.topic + '"' : '';
          return 'I opened the Reading Library. I could not find a strong match' + topic + ' yet.';
        }
        const top = matches[0].book || {};
        if (top.slug) setPendingReadingBookSlug(top.slug);
        setIsReadingLibraryOpen(true);
        const details = [];
        if (top.language) details.push(top.language);
        if (top.source && top.source.name) details.push(top.source.name);
        else if (top.sourceId) details.push(top.sourceId);
        if (top.level) details.push('level ' + top.level);
        let msg = 'I found a good match and opened it: "' + (top.title || 'this book') + '".';
        if (details.length) msg += ' ' + details.join(', ') + '.';
        const why = typeof AC.readingMatchWhyText === 'function' ? AC.readingMatchWhyText(matches[0], params || {}) : ((matches[0].why || []).join(', '));
        if (why) msg += ' Why this fits: ' + why + '.';
        const alts = matches.slice(1, 4).map((x) => x && x.book && x.book.title).filter(Boolean);
        if (alts.length) msg += ' Other good fits: ' + alts.join('; ') + '.';
        return msg;
      },
      openReadingLibrary: () => setIsReadingLibraryOpen(true),
      openDynamicAssessment: () => setIsDynamicAssessmentOpen(true),
      // ── More command-coverage capabilities (2026-06-13, discovery w59vf8skj) ── each maps to ONE
      // existing host handler (verified by symbol in this file). Cycle/spacing read current state
      // (readingTheme/lineHeight) the same way fontBigger reads sliderFontSize — ctx rebuilds per render.
      stopReading: (...args) => {
        try { if (alloBotRef.current && typeof alloBotRef.current.stopSpeaking === 'function') alloBotRef.current.stopSpeaking('stop-reading-command'); } catch (_) {}
        stopReadThisPage();
        return stopPlayback(...args);
      },
      toggleMute: () => { const next = !isGlobalMuted(); setGlobalMute(next); return next; },
      cycleReadingTheme: () => { const i = READING_THEME_IDS.indexOf(readingTheme); const next = READING_THEME_IDS[(i + 1) % READING_THEME_IDS.length]; setReadingTheme(next); return next; },
      lineSpacingMore: () => { const v = Math.min(2.5, Math.round(((lineHeight || 1.6) + 0.1) * 10) / 10); setLineHeight(v); return v; },
      lineSpacingLess: () => { const v = Math.max(1.0, Math.round(((lineHeight || 1.6) - 0.1) * 10) / 10); setLineHeight(v); return v; },
      openSelHub: () => setShowSelHub(true),
      openStudyTimer: () => handleSetShowStudyTimerModalToTrue(),
      openSubmissionInbox: () => setIsSubmissionInboxOpen(true),
      toggleCloudSync: () => { const wasOn = isCloudSyncEnabled; handleCloudToggleClick(); return wasOn ? 'off' : 'consent'; },
      generateOutline: () => handleGenerate('outline'),
      exportPack: () => handleExport('html'),
      // ── Round-2 coverage (2026-06-14, discovery wfi4bz28q) ── each = ONE App-scope handler.
      // Flashcards render ONLY inside GlossaryView — switch to it first (gated on glossary content
      // by `contentIsGlossary` in the registry) so the deck actually mounts instead of silently no-op'ing.
      launchFlashcards: () => { try { setActiveView('glossary'); } catch (_) {} launchInteractiveFlashcards('standard'); },
      // Coverage batch (2026-08-04): glossary games + display/read-aloud settings,
      // each a thin wrapper on the existing host handler beside it.
      startMemoryGame: () => { try { setActiveView('glossary'); } catch (_) {} handleSetIsMemoryGameToTrue(); },
      startMatchingGame: () => { try { setActiveView('glossary'); } catch (_) {} handleSetIsMatchingGameToTrue(); },
      startBingoGame: () => { try { setActiveView('glossary'); } catch (_) {} if (isTeacherMode) handleSetIsBingoGameToTrue(); else handleSetIsStudentBingoGameToTrue(); },
      cycleColorOverlay: () => { const order = ['none', 'blue', 'peach', 'yellow']; const next = order[(order.indexOf(colorOverlay) + 1) % order.length]; setColorOverlay(next); return next; },
      animationsDisabled: disableAnimations,
      adjustVoiceSpeed: (delta) => { const next = Math.round(Math.max(0.5, Math.min(2, (Number(voiceSpeed) || 1) + (Number(delta) || 0))) * 100) / 100; setVoiceSpeed(next); return next; },
      startCrosswordGame: () => { try { setActiveView('glossary'); } catch (_) {} handleSetIsCrosswordGameToTrue(); },
      startWordScrambleGame: () => { try { setActiveView('glossary'); } catch (_) {} handleSetIsWordScrambleGameToTrue(); },
      setGlossaryFilterChoice: (tier) => { if (tier === 'academic') handleSetGlossaryFilterToAcademic(); else if (tier === 'domain') handleSetGlossaryFilterToDomain(); else handleSetGlossaryFilterToAll(); return tier; },
      contentIsQuiz: !!generatedContent && generatedContent.type === 'quiz',
      contentIsSimplified: !!generatedContent && generatedContent.type === 'simplified',
      openReadThisPage: openReadThisPagePanel,
      startReadThisPage,
      stopReadThisPage,
      pauseReadThisPage,
      resumeReadThisPage,
      nextReadThisPageItem,
      previousReadThisPageItem,
      repeatReadThisPageItem,
      closeReadThisPage,
      readMediaDescriptions,
      readAllMediaDescriptions,
      readThisPageIsOpen: showReadThisPage,
      readThisPagePlaybackState: rtpPlaybackState,
      toggleQuizAnswers: () => { handleToggleShowQuizAnswers(); return true; },
      togglePresentationMode: () => { handleToggleIsPresentationMode(); return true; },
      toggleSideBySide: () => { setIsSideBySide(prev => !prev); return true; },
      generateSourceText: (topic) => { const tp = String(topic || '').trim(); if (tp) setSourceTopic(tp); return handleGenerateSource(tp ? { topic: tp } : {}); },
      generateFaq: () => handleGenerate('faq', null, false, null, { rethrowErrors: true }),
      generateBrainstorm: () => handleGenerate('brainstorm', null, false, null, { rethrowErrors: true }),
      setGradeLevelChoice: (raw) => {
        const s = String(raw || '').toLowerCase().trim();
        if (!s) return '';
        if (/^k(indergarten)?$/.test(s)) { setGradeLevel('Kindergarten'); return 'Kindergarten'; }
        const m = s.match(/\d{1,2}/);
        const n = m ? parseInt(m[0], 10) : NaN;
        if (!n || n < 1 || n > 12) return '';
        const label = n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th') + ' Grade';
        setGradeLevel(label);
        return label;
      },
      // One "edit this" for every view that has an edit mode; returns what it
      // toggled (or '' when the view has none) so the narration stays honest.
      toggleContentEditing: () => {
        const kind = generatedContent && generatedContent.type;
        if (kind === 'quiz') { handleToggleIsEditingQuiz(); return 'quiz'; }
        if (kind === 'glossary') { handleToggleIsEditingGlossary(); return 'glossary'; }
        if (kind === 'outline') { handleToggleIsEditingOutline(); return 'outline'; }
        if (kind === 'faq') { handleToggleIsEditingFaq(); return 'FAQ list'; }
        if (kind === 'brainstorm') { handleToggleIsEditingBrainstorm(); return 'brainstorm'; }
        if (kind === 'analysis') { handleToggleIsEditingAnalysis(); return 'analysis'; }
        if (kind === 'simplified') { handleToggleIsEditingLeveledText(); return 'leveled text'; }
        if (kind === 'scaffolds' || kind === 'sentence-frames') { handleToggleIsEditingScaffolds(); return 'scaffolds'; }
        return '';
      },
      toggleReviewGame: () => { handleToggleIsReviewGame(); return true; },
      generateNoteTaking: () => handleGenerate('note-taking', null, false, null, { rethrowErrors: true }),
      generateAnchorChart: () => handleGenerate('anchor-chart', null, false, null, { rethrowErrors: true }),
      generateMemoryAid: () => handleGenerate('memory-aid', null, false, null, { rethrowErrors: true }),
      generateAppliedChallenge: () => handleGenerate('applied-challenge', null, false, null, { rethrowErrors: true }),
      generateConceptSort: () => handleGenerate('concept-sort', null, false, null, { rethrowErrors: true }),
      contentIsGlossary: !!generatedContent && generatedContent.type === 'glossary',
      resetScaffolds: handleResetScaffolds,         // self-confirms via setConfirmDialog
      openPersona: handleSetActiveViewToPersona,
      clearWorkspace: handleClearHistory,           // no internal confirm → registry destructive:true
      restoreLastSettings: restoreIntentSnapshot,   // self-gates with a "nothing to undo yet" toast
      startNewPdfAudit,
      rerunPipelineFix: () => runAutoFixLoop(),      // default rounds; runAutoFixLoop has its own re-entry guard
      stopPipelineFix: () => { try { pdfAutoContinueAbortRef.current = true; } catch (_) {} try { addToast(t('toasts.stopping_after_round') || 'Stopping after the current round — what’s done is kept.', 'info'); } catch (_) {} },
      pipelineFixRunning: pdfAutoContinueRunning,    // read-only signal: gates fix-again vs stop
      // set_ui_language (2026-06-15): point at the EXISTING header language picker rather than
      // blind-setting (there's no validated language list in scope, and setUiLanguage('') would
      // reset to English). Targets the selector's stable data-help-key + reuses showSpotlight.
      spotlightUiLanguage: () => {
        try {
          const el = document.querySelector('[data-help-key="ui_language_select"]');
          if (!el) return false;
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
          try { showSpotlight(el, '🌐 ' + (t('cmd.set_ui_language') || 'Interface language'), t('cmd.set_ui_language_hint') || 'Pick your language here.'); } catch (_) {}
          return true;
        } catch (_) { return false; }
      },
    };
    _alloCmdCtxRef.current = ctx;
    return ctx;
}
