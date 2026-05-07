/**
 * AlloFlow View - Quiz Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='quiz' block.
 * Source range (post-Phase 1 lift of inline Firestore handlers): ~629 lines.
 * Renders: live-session controls (start/toggle/end via lifted host handlers),
 * presentation mode (slide-by-slide quiz), review game (Jeopardy-style board),
 * escape room (delegated to AlloModules.EscapeRoomGameplay), edit/student
 * quiz card view, fact-check panel, reflections.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizView) {
    console.log('[CDN] ViewQuizModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewQuizModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Wifi = _lazyIcon('Wifi');
  var Users = _lazyIcon('Users');
  var Lock = _lazyIcon('Lock');
  var Unlock = _lazyIcon('Unlock');
  var CheckCircle = _lazyIcon('CheckCircle');
  var MonitorPlay = _lazyIcon('MonitorPlay');
  var XCircle = _lazyIcon('XCircle');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var DoorOpen = _lazyIcon('DoorOpen');
  var FolderDown = _lazyIcon('FolderDown');
  var Pencil = _lazyIcon('Pencil');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var CheckSquare = _lazyIcon('CheckSquare');
  var Volume2 = _lazyIcon('Volume2');
  var MicOff = _lazyIcon('MicOff');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Plus = _lazyIcon('Plus');
  var Brain = _lazyIcon('Brain');
  var Languages = _lazyIcon('Languages');
  var Search = _lazyIcon('Search');
  var X = _lazyIcon('X');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronUp = _lazyIcon('ChevronUp');
  var Info = _lazyIcon('Info');
  var Eye = _lazyIcon('Eye');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var ShieldCheck = _lazyIcon('ShieldCheck');

  function QuizView(props) {
  // State reads
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var isParentMode = props.isParentMode;
  var isIndependentMode = props.isIndependentMode;
  var activeSessionCode = props.activeSessionCode;
  var sessionData = props.sessionData;
  var isPresentationMode = props.isPresentationMode;
  var isReviewGame = props.isReviewGame;
  var isEditingQuiz = props.isEditingQuiz;
  var escapeRoomState = props.escapeRoomState;
  var escapeTimeLeft = props.escapeTimeLeft;
  var isEscapeTimerRunning = props.isEscapeTimerRunning;
  var gameTeams = props.gameTeams;
  var reviewGameState = props.reviewGameState;
  var scoreAnimation = props.scoreAnimation;
  var soundEnabled = props.soundEnabled;
  var globalPoints = props.globalPoints;
  var inputText = props.inputText;
  var presentationState = props.presentationState;
  var generatedContent = props.generatedContent;
  var isFactChecking = props.isFactChecking;
  var showQuizAnswers = props.showQuizAnswers;
  var leveledTextLanguage = props.leveledTextLanguage;
  var appId = props.appId;
  // Setters
  var setReviewGameState = props.setReviewGameState;
  var setSoundEnabled = props.setSoundEnabled;
  var setGameTeams = props.setGameTeams;
  var setEscapeRoomState = props.setEscapeRoomState;
  var setIsEscapeTimerRunning = props.setIsEscapeTimerRunning;
  var setConfirmDialog = props.setConfirmDialog;
  // Handlers (lifted in Phase 1)
  var handleStartLiveSession = props.handleStartLiveSession;
  var handleToggleInteractive = props.handleToggleInteractive;
  var handleEndLiveSession = props.handleEndLiveSession;
  // Existing handlers
  var handleToggleIsPresentationMode = props.handleToggleIsPresentationMode;
  var handleToggleIsReviewGame = props.handleToggleIsReviewGame;
  var handleToggleIsEditingQuiz = props.handleToggleIsEditingQuiz;
  var handleToggleShowQuizAnswers = props.handleToggleShowQuizAnswers;
  var handleExportQTI = props.handleExportQTI;
  var handleManualScore = props.handleManualScore;
  var handleAddTeam = props.handleAddTeam;
  var handleRemoveTeam = props.handleRemoveTeam;
  var handleReviewTileClick = props.handleReviewTileClick;
  var handleAwardPoints = props.handleAwardPoints;
  var closeReviewModal = props.closeReviewModal;
  var handlePresentationOptionClick = props.handlePresentationOptionClick;
  var togglePresentationAnswer = props.togglePresentationAnswer;
  var togglePresentationExplanation = props.togglePresentationExplanation;
  var resetPresentation = props.resetPresentation;
  var handleQuizChange = props.handleQuizChange;
  var handleReflectionChange = props.handleReflectionChange;
  var handleFactCheck = props.handleFactCheck;
  // Escape room handlers
  var endCollaborativeEscapeRoom = props.endCollaborativeEscapeRoom;
  var resetEscapeRoom = props.resetEscapeRoom;
  var launchCollaborativeEscapeRoom = props.launchCollaborativeEscapeRoom;
  var openEscapeRoomSettings = props.openEscapeRoomSettings;
  var generateEscapeRoom = props.generateEscapeRoom;
  var handlePuzzleSolved = props.handlePuzzleSolved;
  var handleSelectObject = props.handleSelectObject;
  var handleWrongAnswer = props.handleWrongAnswer;
  var handleEscapeRoomAnswer = props.handleEscapeRoomAnswer;
  var handleSequenceAnswer = props.handleSequenceAnswer;
  var handleCipherAnswer = props.handleCipherAnswer;
  var handleMatchingSelect = props.handleMatchingSelect;
  var handleScrambleAnswer = props.handleScrambleAnswer;
  var handleFillinAnswer = props.handleFillinAnswer;
  var handleFinalDoorAnswer = props.handleFinalDoorAnswer;
  var handleRevealHint = props.handleRevealHint;
  var derangeShuffle = props.derangeShuffle;
  // For TeacherLiveQuizControls pass-through
  var handleCreateGroup = props.handleCreateGroup;
  var handleAssignStudent = props.handleAssignStudent;
  var handleSetGroupResource = props.handleSetGroupResource;
  var handleSetGroupLanguage = props.handleSetGroupLanguage;
  var handleSetGroupProfile = props.handleSetGroupProfile;
  var handleDeleteGroup = props.handleDeleteGroup;
  var isPushingResource = props.isPushingResource;
  var callImagen = props.callImagen;
  var callGeminiImageEdit = props.callGeminiImageEdit;
  // Pure helpers
  var getRows = props.getRows;
  var formatInlineText = props.formatInlineText;
  var renderFormattedText = props.renderFormattedText;
  var getReviewCategories = props.getReviewCategories;
  var playSound = props.playSound;
  var addToast = props.addToast;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var EscapeRoomTeacherControls = props.EscapeRoomTeacherControls;
  var TeacherLiveQuizControls = props.TeacherLiveQuizControls;
  var Stamp = props.Stamp;
  var ConfettiExplosion = props.ConfettiExplosion;

  // ─── Plan S: Quiz Mode-aware header + AI explainer ────────────────────
  // Reads mode + strategy from the resolved quiz item. Default 'exit-ticket'
  // preserves all existing UX. Other modes render a small intro banner +
  // (for pre-check + review) an inline AI Concept Explainer panel.
  var _quizMode = (generatedContent && generatedContent.data && generatedContent.data.mode) || 'exit-ticket';
  var _qmStrategiesMod = (window.AlloModules && window.AlloModules.QuizModeStrategies) || null;
  var _modeStrat = _qmStrategiesMod ? _qmStrategiesMod.getStrategy(_quizMode) : null;
  var _aiExplainerEnabled = !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail);
  var _showModeBanner = _quizMode !== 'exit-ticket' && !!_modeStrat;

  // Local state for the AI Concept Explainer (pre-check + review modes only)
  var _explainerState = React.useState({ topic: '', loading: false, response: '', error: '' });
  var explainerData = _explainerState[0]; var setExplainerData = _explainerState[1];
  var _explainerInput = React.useState('');
  var explainerInput = _explainerInput[0]; var setExplainerInput = _explainerInput[1];

  function explainConcept(topic) {
    if (!topic || !topic.trim()) return;
    if (typeof props.callGemini !== 'function') {
      setExplainerData({ topic: topic, loading: false, response: '', error: 'Explainer unavailable: callGemini not provided.' });
      return;
    }
    setExplainerData({ topic: topic, loading: true, response: '', error: '' });
    var grade = props.gradeLevel || 'middle school';
    var prompt = 'You are a patient teacher explaining a concept to a ' + grade + ' student who needs a quick refresher. Explain "' + topic + '" in 60-90 words. Use simple, concrete language. Use an analogy or example if it helps. End with one sentence checking the student\'s understanding (e.g., "Does that make sense?"). Plain text only — no headings, no bullet points.';
    Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
      var txt = (raw && typeof raw === 'object' && raw.text) ? raw.text : String(raw || '');
      setExplainerData({ topic: topic, loading: false, response: txt.trim(), error: '' });
    }).catch(function (err) {
      setExplainerData({ topic: topic, loading: false, response: '', error: err && err.message ? err.message : 'Explainer failed.' });
    });
  }

  var modeBanner = _showModeBanner ? React.createElement('div', {
    key: 'mode-banner',
    className: 'rounded-xl border-2 p-4 mb-2 ' + (_quizMode === 'pre-check' ? 'border-amber-300 bg-amber-50' : _quizMode === 'review' ? 'border-purple-300 bg-purple-50' : 'border-sky-300 bg-sky-50'),
    role: 'region',
    'aria-label': _modeStrat.label,
  },
    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
      React.createElement('span', { className: 'text-xl', 'aria-hidden': 'true' }, _modeStrat.icon),
      React.createElement('h3', { className: 'font-black text-base ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900') }, _modeStrat.label),
      React.createElement('span', { className: 'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (_quizMode === 'pre-check' ? 'bg-amber-200 text-amber-900' : _quizMode === 'review' ? 'bg-purple-200 text-purple-900' : 'bg-sky-200 text-sky-900') }, _quizMode)
    ),
    _modeStrat.render.intro && React.createElement('p', { className: 'text-sm leading-relaxed ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900') }, _modeStrat.render.intro)
  ) : null;

  var explainerPanel = _aiExplainerEnabled ? React.createElement('div', {
    key: 'ai-explainer',
    className: 'rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6',
    role: 'region',
    'aria-label': 'AI concept explainer',
  },
    React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
      React.createElement('span', { className: 'text-lg', 'aria-hidden': 'true' }, '🤖'),
      React.createElement('h4', { className: 'font-bold text-sm text-indigo-900' }, 'Don\'t know a concept? Ask for a quick explainer.')
    ),
    React.createElement('p', { className: 'text-xs text-indigo-800 mb-2' },
      'Type any concept from the quiz (or any prior knowledge you\'re unsure about). The AI will give you a 60-90 word explanation tuned to your grade level.'
    ),
    React.createElement('div', { className: 'flex items-stretch gap-2' },
      React.createElement('input', {
        type: 'text',
        value: explainerInput,
        onChange: function (ev) { setExplainerInput(ev.target.value); },
        onKeyDown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); explainConcept(explainerInput); } },
        placeholder: _quizMode === 'pre-check' ? 'e.g., "what plants need to grow"' : 'e.g., "photosynthesis"',
        className: 'flex-1 min-w-0 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400',
        'aria-label': 'Concept to explain',
      }),
      React.createElement('button', {
        type: 'button',
        onClick: function () { explainConcept(explainerInput); },
        disabled: !explainerInput.trim() || explainerData.loading,
        className: 'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
      }, explainerData.loading ? 'Explaining…' : 'Explain')
    ),
    explainerData.response && React.createElement('div', { className: 'mt-3 p-3 bg-white border border-indigo-200 rounded-lg' },
      React.createElement('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1' }, explainerData.topic),
      React.createElement('p', { className: 'text-sm text-slate-800 leading-relaxed' }, explainerData.response),
      typeof props.callTTS === 'function' && React.createElement('button', {
        type: 'button',
        onClick: function () { props.callTTS(explainerData.response); },
        className: 'mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900',
        'aria-label': 'Read aloud',
      }, '🔊 Read aloud')
    ),
    explainerData.error && React.createElement('div', { className: 'mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800' },
      explainerData.error
    )
  ) : null;

  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, modeBanner, explainerPanel, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 p-4 rounded-lg border border-teal-100 mb-6 flex justify-between items-center flex-wrap gap-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-teal-800 flex-grow"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Providing options for action and expression. Frequent formative assessments help track progress and adjust instruction."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, isTeacherMode && activeSessionCode && !sessionData?.quizState?.isActive && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.connect'),
    onClick: handleStartLiveSession,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-200",
    title: t('quiz.launch_live_tooltip')
  }, /*#__PURE__*/React.createElement(Wifi, {
    size: 14
  }), " ", t('quiz.launch_live_btn')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 12,
    className: "text-orange-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-orange-700"
  }, Object.keys(sessionData?.roster || {}).length, " ", t('quiz.lobby_waiting') || "Ready")), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.locked'),
    onClick: handleToggleInteractive,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${sessionData?.forceStatic ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50'}`,
    title: t('session.toggle_interactive_title')
  }, sessionData?.forceStatic ? /*#__PURE__*/React.createElement(Lock, {
    size: 12
  }) : /*#__PURE__*/React.createElement(Unlock, {
    size: 12
  }), sessionData?.forceStatic ? t('session.static_only') : t('session.interactive'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.confirm'),
    onClick: handleToggleIsPresentationMode,
    disabled: isReviewGame || isTeacherMode && sessionData?.quizState?.isActive,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPresentationMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`,
    title: t('quiz.presentation')
  }, isPresentationMode ? /*#__PURE__*/React.createElement(CheckCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 14
  }), isPresentationMode ? t('common.close') : t('quiz.presentation')), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleIsReviewGame,
    disabled: isPresentationMode,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isReviewGame ? 'bg-yellow-500 text-indigo-900 hover:bg-yellow-600 ring-2 ring-yellow-200' : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50'}`,
    title: t('quiz.review_game'),
    "aria-label": t('quiz.review_game')
  }, isReviewGame ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), isReviewGame ? t('common.close') : t('quiz.review_game')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (escapeRoomState.isActive) {
        if (isTeacherMode && activeSessionCode) {
          endCollaborativeEscapeRoom();
        } else {
          resetEscapeRoom();
        }
      } else {
        if (isTeacherMode && activeSessionCode) {
          launchCollaborativeEscapeRoom();
        } else {
          openEscapeRoomSettings();
        }
      }
    },
    disabled: isPresentationMode || isReviewGame,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${escapeRoomState.isActive ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-200' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`,
    title: isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title'),
    "aria-label": t('escape_room.title')
  }, escapeRoomState.isActive ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(DoorOpen, {
    size: 14
  }), escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')), isTeacherMode && !isIndependentMode && /*#__PURE__*/React.createElement("button", {
    onClick: handleExportQTI,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-teal-600 border border-teal-200 hover:bg-teal-50 transition-all shadow-sm",
    title: t('export_menu.qti'),
    "aria-label": t('export_menu.qti')
  }, /*#__PURE__*/React.createElement(FolderDown, {
    size: 14
  }), " ", t('quiz.export_qti_btn')), !isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && /*#__PURE__*/React.createElement(React.Fragment, null, !isIndependentMode && !isParentMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_quiz'),
    onClick: handleToggleIsEditingQuiz,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingQuiz ? 'bg-teal-700 text-white hover:bg-teal-700' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingQuiz ? t('common.done_editing') : t('quiz.edit')), /*#__PURE__*/React.createElement("button", {
    onClick: handleToggleShowQuizAnswers,
    className: "text-xs flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-bold hover:bg-teal-200 transition-colors"
  }, showQuizAnswers ? /*#__PURE__*/React.createElement(CheckSquare, {
    size: 14,
    className: "fill-current"
  }) : /*#__PURE__*/React.createElement(CheckSquare, {
    size: 14
  }), showQuizAnswers ? isIndependentMode ? t('quiz.hide_answers_student') : isParentMode ? 'Hide Scores' : t('quiz.hide_key') : isIndependentMode ? t('quiz.check_answers') : isParentMode ? 'View Scores' : t('quiz.show_key'))))), isTeacherMode && activeSessionCode && sessionData?.escapeRoomState?.isActive && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Escape room controls encountered an error. Refreshing..."
  }, /*#__PURE__*/React.createElement(EscapeRoomTeacherControls, {
    sessionData: sessionData,
    activeSessionCode: activeSessionCode,
    appId: appId,
    t: t
  })), isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4"
  }, /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Live quiz controls encountered an error. Refreshing..."
  }, /*#__PURE__*/React.createElement(TeacherLiveQuizControls, {
    sessionData: sessionData,
    generatedContent: generatedContent,
    activeSessionCode: activeSessionCode,
    appId: appId,
    onGenerateImage: callImagen,
    onRefineImage: callGeminiImageEdit,
    onCreateGroup: handleCreateGroup,
    onAssignStudent: handleAssignStudent,
    onSetGroupResource: handleSetGroupResource,
    isPushingResource: isPushingResource,
    onSetGroupLanguage: handleSetGroupLanguage,
    onSetGroupProfile: handleSetGroupProfile,
    onDeleteGroup: handleDeleteGroup
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end px-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleEndLiveSession,
    className: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }), " ", t('session.action_end')))) : isReviewGame ? /*#__PURE__*/React.createElement("div", {
    className: "animate-in fade-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-yellow-500 relative overflow-hidden min-h-[700px] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 opacity-10 pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(59,130,246,0.2),transparent)]"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-6 relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-black text-yellow-400 tracking-widest uppercase drop-shadow-md flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 32
  }), " ", t('review_game.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm mt-1 font-medium"
  }, t('review_game.subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    onClick: () => {
      setSoundEnabled(!soundEnabled);
      if (!soundEnabled) playSound('click');
    },
    className: `p-2 rounded-full transition-colors ${soundEnabled ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-600'}`,
    title: t('review_game.toggle_sound')
  }, soundEnabled ? /*#__PURE__*/React.createElement(Volume2, {
    size: 20
  }) : /*#__PURE__*/React.createElement(MicOff, {
    size: 20
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.regenerate_vocabulary'),
    onClick: () => {
      setConfirmDialog({
        message: t('review_game.reset_confirm') || 'Reset the game?',
        onConfirm: () => {
          setReviewGameState({
            claimed: new Set(),
            activeQuestion: null,
            showAnswer: false
          });
          setGameTeams(gameTeams.map(t => ({
            ...t,
            score: 0
          })));
        }
      });
    },
    className: "p-2 bg-slate-700 text-slate-600 rounded-full hover:bg-slate-600",
    title: t('review_game.reset')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-4 justify-center mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
  }, gameTeams.map(team => /*#__PURE__*/React.createElement("div", {
    key: team.id,
    className: `${team.color} bg-opacity-20 border-2 border-opacity-50 border-${team.color.split('-')[1]}-400 rounded-lg p-3 min-w-[140px] flex flex-col items-center relative group`
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_team'),
    className: "bg-transparent text-center font-bold text-white outline-none focus:ring-2 focus:ring-white/50 w-full mb-1",
    value: team.name,
    onChange: e => setGameTeams(prev => prev.map(t => t.id === team.id ? {
      ...t,
      name: e.target.value
    } : t))
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-white drop-shadow-md"
  }, team.score), scoreAnimation.teamId === team.id && /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-xl animate-[ping_1s_ease-out_reverse] pointer-events-none z-20 whitespace-nowrap shadow-sm"
  }, "+", scoreAnimation.points), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-2 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleManualScore(team.id, -100),
    className: "text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded"
  }, "-"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleManualScore(team.id, 100),
    className: "text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded"
  }, "+")), gameTeams.length > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveTeam(team.id),
    className: "absolute -top-2 -right-2 bg-slate-800 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-700 transition-all shadow-sm",
    "aria-label": t('common.remove')
  }, /*#__PURE__*/React.createElement(X, {
    size: 10
  })))), gameTeams.length < 6 && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.add'),
    onClick: handleAddTeam,
    className: "flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-600 hover:text-white hover:border-slate-400 transition-colors"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold mt-1"
  }, t('review_game.add_team')))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4 max-w-4xl mx-auto w-full flex-grow content-start relative z-10"
  }, getReviewCategories().map((cat, cIdx) => {
    const CategoryIcon = cIdx === 0 ? Brain : cIdx === 1 ? Languages : Search;
    const iconColor = cIdx === 0 ? "text-yellow-400" : cIdx === 1 ? "text-green-400" : "text-blue-400";
    return /*#__PURE__*/React.createElement("div", {
      key: cIdx,
      className: "flex flex-col gap-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-800/80 backdrop-blur-sm text-white font-bold text-center py-4 rounded-lg border-b-4 border-blue-600 shadow-lg uppercase tracking-wider text-sm md:text-base flex flex-col items-center gap-1"
    }, /*#__PURE__*/React.createElement(CategoryIcon, {
      size: 20,
      className: iconColor
    }), cat.name), cat.questions.map((q, qIdx) => {
      const isClaimed = reviewGameState.claimed.has(q.originalIndex);
      return /*#__PURE__*/React.createElement("button", {
        key: qIdx,
        onClick: () => !isClaimed && handleReviewTileClick(q, q.points),
        disabled: isClaimed,
        "aria-label": `Category: ${cat.name}, ${q.points} Points${isClaimed ? ', Claimed' : ''}`,
        "aria-disabled": isClaimed,
        className: `
                                                            h-24 rounded-lg font-black text-3xl shadow-lg transition-all duration-300 transform flex items-center justify-center border-b-4 relative overflow-hidden group focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-4 focus:ring-offset-slate-900
                                                            ${isClaimed ? 'bg-slate-800/50 text-slate-700 border-slate-800 cursor-default' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-yellow-300 border-blue-800 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-1 hover:shadow-blue-500/20 hover:shadow-xl cursor-pointer active:scale-95'}
                                                        `
      }, !isClaimed && /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"
      }), /*#__PURE__*/React.createElement("span", {
        className: "relative z-10 drop-shadow-md"
      }, isClaimed ? '' : q.points));
    }));
  })), reviewGameState.activeQuestion && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 animate-in zoom-in-95 duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-800 w-full max-w-4xl rounded-2xl border-4 border-yellow-500 shadow-2xl p-8 text-center relative flex flex-col max-h-full overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-blue-900 font-black text-2xl px-6 py-2 rounded-full shadow-lg border-2 border-white"
  }, reviewGameState.activeQuestion.points), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    onClick: () => closeReviewModal(false),
    className: "absolute top-4 right-4 text-blue-300 hover:text-white transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 mb-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm"
  }, formatInlineText(reviewGameState.activeQuestion.question, false, true)), reviewGameState.activeQuestion.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-blue-200 text-lg italic mt-4"
  }, formatInlineText(reviewGameState.activeQuestion.question_en, false, true))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left"
  }, reviewGameState.activeQuestion.options.map((opt, oIdx) => /*#__PURE__*/React.createElement("div", {
    key: oIdx,
    className: `
                                                            p-4 rounded-xl text-lg font-medium border-2 transition-all
                                                            ${reviewGameState.showAnswer ? opt === reviewGameState.activeQuestion.correctAnswer ? 'bg-green-700 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' : 'bg-blue-900/50 border-blue-700 text-blue-300 opacity-50' : 'bg-blue-700 border-blue-500 text-white'}
                                                        `
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-8 font-bold opacity-50"
  }, String.fromCharCode(65 + oIdx), "."), " ", formatInlineText(opt, false, true)))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-6 mt-auto pt-4 border-t border-blue-700"
  }, !reviewGameState.showAnswer ? /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    onClick: () => {
      setReviewGameState(prev => ({
        ...prev,
        showAnswer: true
      }));
      playSound('reveal');
    },
    className: "bg-yellow-500 text-blue-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors shadow-lg hover:shadow-yellow-500/20"
  }, t('review_game.reveal_answer')) : /*#__PURE__*/React.createElement("div", {
    className: "w-full animate-in fade-in slide-in-from-bottom-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-200 text-sm font-bold uppercase tracking-wider mb-3"
  }, t('review_game.who_correct')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-3"
  }, gameTeams.map(team => /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    key: team.id,
    onClick: () => handleAwardPoints(team.id, reviewGameState.activeQuestion.points),
    className: `${team.color.replace('bg-', 'bg-')} hover:opacity-90 ${team.color.includes('yellow') ? 'text-indigo-900' : 'text-white'} px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all`
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }), " ", team.name)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      playSound('incorrect');
      closeReviewModal(true);
    },
    className: "bg-slate-700 text-slate-600 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-colors"
  }, t('review_game.no_points'))))))))) : escapeRoomState.isActive ? window.AlloModules && window.AlloModules.EscapeRoomGameplay ? /*#__PURE__*/React.createElement(window.AlloModules.EscapeRoomGameplay, {
    escapeRoomState: escapeRoomState,
    setEscapeRoomState: setEscapeRoomState,
    escapeTimeLeft: escapeTimeLeft,
    isEscapeTimerRunning: isEscapeTimerRunning,
    setIsEscapeTimerRunning: setIsEscapeTimerRunning,
    handleSetIsEscapeTimerRunningToTrue: () => setIsEscapeTimerRunning(true),
    handlers: {
      generateEscapeRoom,
      handlePuzzleSolved,
      handleSelectObject,
      handleWrongAnswer,
      handleEscapeRoomAnswer,
      handleSequenceAnswer,
      handleCipherAnswer,
      handleMatchingSelect,
      handleScrambleAnswer,
      handleFillinAnswer,
      handleFinalDoorAnswer,
      resetEscapeRoom,
      handleRevealHint,
      derangeShuffle,
      openEscapeRoomSettings
    },
    t: t,
    soundEnabled: soundEnabled,
    setSoundEnabled: setSoundEnabled,
    playSound: playSound,
    globalPoints: globalPoints,
    inputText: inputText
  }) : null : isPresentationMode ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 animate-in fade-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-xl flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 24,
    className: "text-teal-400"
  }), " ", t('quiz.presentation_board')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.reset_presentation'),
    onClick: resetPresentation,
    className: "flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14
  }), " ", t('quiz.reset_board'))), generatedContent?.data.questions.map((q, i) => {
    const pState = presentationState[i] || {};
    const isAnswered = !!pState.selectedOption;
    const isCorrectlyAnswered = pState.isCorrect;
    const showAnswer = pState.showAnswer;
    const showExplanation = pState.showExplanation;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex gap-4 mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm"
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: "flex-grow"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-2xl font-bold text-slate-800 leading-tight"
    }, formatInlineText(q.question, false)), q.question_en && /*#__PURE__*/React.createElement("p", {
      className: "text-lg text-slate-600 italic mt-2"
    }, formatInlineText(q.question_en, false)))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-14"
    }, q.options.map((opt, optIdx) => {
      const isSelected = pState.selectedOption === opt;
      const isCorrectOption = opt === q.correctAnswer;
      let btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
      let icon = /*#__PURE__*/React.createElement("div", {
        className: "w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors"
      });
      if (isSelected) {
        if (pState.isCorrect) {
          btnClass = "bg-green-100 border-2 border-green-500 text-green-900 shadow-md transform scale-[1.02]";
          icon = /*#__PURE__*/React.createElement(CheckCircle2, {
            size: 24,
            className: "text-green-600"
          });
        } else {
          btnClass = "bg-red-100 border-2 border-red-400 text-red-900 animate-shake";
          icon = /*#__PURE__*/React.createElement(XCircle, {
            size: 24,
            className: "text-red-500"
          });
        }
      } else if (showAnswer && isCorrectOption) {
        btnClass = "bg-green-50 border-2 border-green-400 text-green-800 ring-2 ring-green-200 ring-offset-2";
        icon = /*#__PURE__*/React.createElement(CheckCircle2, {
          size: 24,
          className: "text-green-500"
        });
      } else if (showAnswer) {
        btnClass = "opacity-50 bg-slate-50 border-slate-100 text-slate-600 cursor-not-allowed";
      }
      return /*#__PURE__*/React.createElement("button", {
        "aria-label": t('common.cancel'),
        key: optIdx,
        onClick: () => handlePresentationOptionClick(i, opt),
        disabled: showAnswer,
        className: `p-5 rounded-xl text-left font-bold text-lg transition-all duration-200 flex items-center gap-4 group w-full ${btnClass}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "shrink-0"
      }, icon), /*#__PURE__*/React.createElement("div", {
        className: "flex-grow"
      }, formatInlineText(opt, false), q.options_en && q.options_en[optIdx] && /*#__PURE__*/React.createElement("div", {
        className: "text-sm font-normal opacity-80 italic mt-1"
      }, formatInlineText(q.options_en[optIdx], false))));
    })), /*#__PURE__*/React.createElement("div", {
      className: "mt-6 ml-0 md:ml-14 flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-8 flex items-center relative"
    }, isAnswered && !isCorrectlyAnswered && !showAnswer && /*#__PURE__*/React.createElement("span", {
      className: "text-red-500 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-left-2"
    }, /*#__PURE__*/React.createElement(XCircle, {
      size: 18
    }), " ", t('quiz.presentation_try_again')), isAnswered && isCorrectlyAnswered && /*#__PURE__*/React.createElement("span", {
      className: "text-green-600 font-bold flex items-center gap-2 animate-in zoom-in duration-300 overflow-visible"
    }, /*#__PURE__*/React.createElement(Sparkles, {
      size: 18
    }), " ", t('quiz.presentation_correct'), /*#__PURE__*/React.createElement(ConfettiExplosion, null))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, q.factCheck && /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.collapse'),
      onClick: () => togglePresentationExplanation(i),
      className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showExplanation ? 'bg-yellow-100 text-yellow-700' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'}`
    }, showExplanation ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14
    }) : /*#__PURE__*/React.createElement(Info, {
      size: 14
    }), showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')), /*#__PURE__*/React.createElement("button", {
      "aria-label": t('common.show'),
      onClick: () => togglePresentationAnswer(i),
      className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showAnswer ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`
    }, showAnswer ? /*#__PURE__*/React.createElement(Eye, {
      size: 14
    }) : /*#__PURE__*/React.createElement(MousePointerClick, {
      size: 14
    }), showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')))), showExplanation && q.factCheck && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 ml-0 md:ml-14 p-4 bg-yellow-50 border border-yellow-100 rounded-xl animate-in slide-in-from-top-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "prose prose-sm text-slate-700 max-w-none leading-relaxed"
    }, renderFormattedText(q.factCheck))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-900 text-white p-8 rounded-2xl shadow-xl mt-8"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold mb-6 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 24,
    className: "text-indigo-300"
  }), " ", t('quiz.presentation_discussion')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-8"
  }, Array.isArray(generatedContent?.data.reflections) ? generatedContent?.data.reflections.map((ref, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-indigo-800/50 p-6 rounded-xl border border-indigo-700"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-medium leading-relaxed text-center"
  }, "\"", typeof ref === 'string' ? ref : ref.text, "\""), typeof ref === 'object' && ref.text_en && /*#__PURE__*/React.createElement("p", {
    className: "text-lg text-indigo-300 italic text-center mt-4"
  }, "\"", ref.text_en, "\""))) : /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-medium leading-relaxed text-center"
  }, "\"", generatedContent?.data.reflection, "\"")))) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, generatedContent?.data.questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm relative group/question"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1.5"
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow space-y-2"
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_question') || 'Edit question',
    value: q.question,
    onChange: e => handleQuizChange(i, 'question', e.target.value),
    className: "w-full font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
    rows: getRows(q.question)
  }), q.question_en !== undefined && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_question_english') || 'Edit question English translation',
    value: q.question_en || '',
    onChange: e => handleQuizChange(i, 'question', e.target.value, null, true),
    className: "w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
    rows: getRows(q.question_en || ''),
    placeholder: t('common.placeholder_english_trans')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-800 px-2 py-1"
  }, q.question), q.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic px-2"
  }, q.question_en)))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleFactCheck(i),
    disabled: isFactChecking[i],
    className: `flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors ${q.factCheck ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200'}`,
    title: t('quiz.verify_tooltip')
  }, isFactChecking[i] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }) : q.factCheck ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 12
  }), isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9"
  }, q.options.map((opt, optIdx) => /*#__PURE__*/React.createElement("div", {
    key: optIdx,
    className: `p-2 rounded-lg border text-sm relative group/option ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : 'bg-slate-50 border-slate-100'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mt-1.5 opacity-50"
  }, String.fromCharCode(65 + optIdx), "."), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_option') || 'Edit answer option',
    value: opt,
    onChange: e => handleQuizChange(i, 'option', e.target.value, optIdx),
    className: `w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5 outline-none resize-none transition-all ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`,
    rows: getRows(opt, 30)
  }), q.options_en && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_option_translation') || 'Edit option translation',
    value: q.options_en[optIdx] || '',
    onChange: e => handleQuizChange(i, 'option', e.target.value, optIdx, true),
    className: "w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5 outline-none resize-none transition-all mt-1",
    rows: getRows(q.options_en[optIdx] || '', 30),
    placeholder: t('common.placeholder_option_trans')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: `px-1 py-0.5 ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`
  }, opt), q.options_en && q.options_en[optIdx] && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mt-1 px-1 italic"
  }, q.options_en[optIdx])))), showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 right-2 text-green-600"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }))))), q.factCheck && isTeacherMode && (!isIndependentMode || showQuizAnswers) && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 ml-9 p-3 pr-20 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex gap-2 items-start animate-in slide-in-from-top-2 relative"
  }, /*#__PURE__*/React.createElement(Stamp, {
    label: t('quiz.verified_stamp'),
    position: "top-2 right-2",
    size: "small"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleFactCheck(i),
    disabled: isFactChecking[i],
    className: "absolute bottom-2 right-2 p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors",
    title: t('quiz.regenerate_check')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: isFactChecking[i] ? "animate-spin" : ""
  })), /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "mt-0.5 shrink-0 text-yellow-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "whitespace-pre-line leading-relaxed text-slate-700"
  }, renderFormattedText(q.factCheck)))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mt-8"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 16
  }), " ", t('quiz.reflections')), Array.isArray(generatedContent?.data.reflections) ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, generatedContent?.data.reflections.map((ref, i) => {
    const text = typeof ref === 'string' ? ref : ref.text;
    const textEn = typeof ref === 'object' && ref.text_en ? ref.text_en : null;
    return /*#__PURE__*/React.createElement("div", {
      key: i
    }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('quiz.edit_reflection') || 'Edit reflection prompt',
      value: text,
      onChange: e => handleReflectionChange(i, e.target.value),
      className: "w-full text-indigo-800 mb-1 italic text-sm bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(text)
    }), (textEn !== null || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('quiz.edit_reflection_translation') || 'Edit reflection translation',
      value: textEn || '',
      onChange: e => handleReflectionChange(i, e.target.value, true),
      className: "w-full text-indigo-600 mb-4 text-xs bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(textEn || ''),
      placeholder: t('common.placeholder_reflection_trans')
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-indigo-800 mb-1 italic text-sm px-2 py-1"
    }, text), textEn && /*#__PURE__*/React.createElement("p", {
      className: "text-indigo-600 mb-4 text-xs px-2 py-1 italic"
    }, textEn)), /*#__PURE__*/React.createElement("div", {
      className: "h-24 border-b border-indigo-200 border-dashed"
    }));
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-800 mb-4 italic text-sm"
  }, generatedContent?.data.reflection), /*#__PURE__*/React.createElement("div", {
    className: "h-24 border-b border-indigo-200 border-dashed"
  })))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizView = QuizView;
  window.AlloModules.ViewQuizModule = true;
})();
