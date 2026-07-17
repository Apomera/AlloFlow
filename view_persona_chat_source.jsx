
function PersonaChatView(props) {
  // State (object-bundle)
  var personaState = props.personaState;
  var generatedContent = props.generatedContent;
  var appId = props.appId;
  var studentNickname = props.studentNickname;
  // State reads (scalar/boolean)
  var theme = ['light', 'dark', 'contrast'].includes(props.theme) ? props.theme : 'light';
  var t = props.t;
  var isPersonaFreeResponse = props.isPersonaFreeResponse;
  var showPersonaHints = props.showPersonaHints;
  var personaAutoRead = props.personaAutoRead;
  var personaInput = props.personaInput;
  var personaAutoSend = props.personaAutoSend;
  var isPersonaReflectionOpen = props.isPersonaReflectionOpen;
  var personaDefinitionData = props.personaDefinitionData;
  var reflectionFeedback = props.reflectionFeedback;
  var isGradingReflection = props.isGradingReflection;
  var personaReflectionInput = props.personaReflectionInput;
  var isPersonaDefining = props.isPersonaDefining;
  var isGeneratingReflectionPrompt = props.isGeneratingReflectionPrompt;
  var isTeacherMode = props.isTeacherMode;
  var studentProjectSettings = props.studentProjectSettings;
  var dynamicReflectionQuestion = props.dynamicReflectionQuestion;
  var panelTtsPending = props.panelTtsPending;
  var personaTurnHintsViewed = props.personaTurnHintsViewed;
  var playingContentId = props.playingContentId;
  var playbackState = props.playbackState;
  // Refs
  var personaScrollRef = props.personaScrollRef;
  var personaDialogRef = React.useRef(null);
  var personaPreviousFocusRef = React.useRef(null);
  var personaDefinitionDialogRef = React.useRef(null);
  var personaDefinitionReturnFocusRef = React.useRef(null);
  var personaReflectionDialogRef = React.useRef(null);
  var personaReflectionReturnFocusRef = React.useRef(null);
  var personaSummaryDialogRef = React.useRef(null);
  var personaSummaryReturnFocusRef = React.useRef(null);
  // Setters
  var setPersonaState = props.setPersonaState;
  var setPersonaInput = props.setPersonaInput;
  var setPersonaAutoRead = props.setPersonaAutoRead;
  var setShowPersonaHints = props.setShowPersonaHints;
  var setIsPersonaFreeResponse = props.setIsPersonaFreeResponse;
  var setIsPersonaReflectionOpen = props.setIsPersonaReflectionOpen;
  var setPersonaReflectionInput = props.setPersonaReflectionInput;
  var setReflectionFeedback = props.setReflectionFeedback;
  // Handlers
  var handleClosePersonaChat = props.handleClosePersonaChat;
  var handleGenerateReflectionPrompt = props.handleGenerateReflectionPrompt;
  var handlePanelChatSubmit = props.handlePanelChatSubmit;
  var generatePanelFollowUps = props.generatePanelFollowUps;
  var generatePersonaFollowUps = props.generatePersonaFollowUps;
  var handlePersonaChatSubmit = props.handlePersonaChatSubmit;
  var handlePersonaTopicSpark = props.handlePersonaTopicSpark;
  var handleGeneratePersonaSummary = props.handleGeneratePersonaSummary;
  var handleRetryPortraitGeneration = props.handleRetryPortraitGeneration;
  var handleSavePersonaChat = props.handleSavePersonaChat;
  var handleSaveReflection = props.handleSaveReflection;
  var handleSetIsPersonaReflectionOpenToFalse = props.handleSetIsPersonaReflectionOpenToFalse;
  var handleSetPersonaDefinitionDataToNull = props.handleSetPersonaDefinitionDataToNull;
  var handleSpeak = props.handleSpeak;
  var handleTogglePersonaAutoSend = props.handleTogglePersonaAutoSend;
  var handleToggleShowPersonaHints = props.handleToggleShowPersonaHints;
  var stopPlayback = props.stopPlayback;
  var _panelChoicePendingState = React.useState(false);
  var panelChoicePending = _panelChoicePendingState[0];
  var setPanelChoicePending = _panelChoicePendingState[1];
  var _personaSummaryOpenState = React.useState(false);
  var isPersonaSummaryOpen = _personaSummaryOpenState[0];
  var setIsPersonaSummaryOpen = _personaSummaryOpenState[1];
  var _handlePanelChoice = function (option) {
    if (panelChoicePending || personaState.isLoading || !option) return;
    setPanelChoicePending(true);
    Promise.resolve().then(function () { return handlePanelChatSubmit(option.text, true); })
      .catch(function () {})
      .finally(function () { setPanelChoicePending(false); });
  };
  var _openPersonaSummary = function () {
    setIsPersonaSummaryOpen(true);
    if (!personaState.personaSummary && !personaState.isGeneratingSummary && typeof handleGeneratePersonaSummary === 'function') {
      Promise.resolve(handleGeneratePersonaSummary()).catch(function () {});
    }
  };
  var _retryPersonaSummary = function () {
    if (personaState.isGeneratingSummary || typeof handleGeneratePersonaSummary !== 'function') return;
    Promise.resolve(handleGeneratePersonaSummary({ force: Boolean(personaState.personaSummary) })).catch(function () {});
  };
  var personaCloseHandlerRef = React.useRef(handleClosePersonaChat);
  personaCloseHandlerRef.current = handleClosePersonaChat;

  // WCAG 2.4.3 / 2.1.1: contain focus in the modal, support Escape,
  // focus the close control on entry, and restore the invoking control.
  React.useEffect(function () {
    var dialog = personaDialogRef.current;
    if (!dialog) return undefined;
    personaPreviousFocusRef.current = document.activeElement;
    var focusTimer = window.setTimeout(function () {
      var initial = dialog.querySelector('[data-persona-initial-focus]');
      if (initial && typeof initial.focus === 'function') initial.focus();
      else dialog.focus();
    }, 0);
    var focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var handleDialogKeyDown = function (event) {
      if (event.key === 'Escape') {
        if (event.target && typeof event.target.closest === 'function' && event.target.closest('[data-persona-reflection-dialog], [data-persona-summary-dialog]')) {
          return;
        }
        event.preventDefault();
        personaCloseHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      var scope = dialog.querySelector('[data-persona-reflection-dialog], [data-persona-summary-dialog]') || dialog;
      var focusable = Array.prototype.filter.call(scope.querySelectorAll(focusableSelector), function (element) {
        return element.getAttribute('aria-hidden') !== 'true' && (element.offsetParent !== null || element === document.activeElement);
      });
      if (!focusable.length) {
        event.preventDefault();
        scope.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleDialogKeyDown);
    return function () {
      window.clearTimeout(focusTimer);
      dialog.removeEventListener('keydown', handleDialogKeyDown);
      var previous = personaPreviousFocusRef.current;
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  React.useEffect(function () {
    if (!personaDefinitionData) return undefined;
    var dialog = personaDefinitionDialogRef.current;
    if (!dialog) return undefined;
    personaDefinitionReturnFocusRef.current = document.activeElement;
    var focusTimer = window.setTimeout(function () {
      var initial = dialog.querySelector('[data-definition-initial-focus]');
      if (initial && typeof initial.focus === 'function') initial.focus();
    }, 0);
    return function () {
      window.clearTimeout(focusTimer);
      var previous = personaDefinitionReturnFocusRef.current;
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, [!!personaDefinitionData]);

  React.useEffect(function () {
    if (!isPersonaReflectionOpen) return undefined;
    var dialog = personaReflectionDialogRef.current;
    if (!dialog) return undefined;
    personaReflectionReturnFocusRef.current = document.activeElement;
    var focusTimer = window.setTimeout(function () {
      var initial = dialog.querySelector('textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (initial && typeof initial.focus === 'function') initial.focus();
      else dialog.focus();
    }, 0);
    return function () {
      window.clearTimeout(focusTimer);
      var previous = personaReflectionReturnFocusRef.current;
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, [isPersonaReflectionOpen]);

  React.useEffect(function () {
    if (!isPersonaSummaryOpen) return undefined;
    var dialog = personaSummaryDialogRef.current;
    if (!dialog) return undefined;
    personaSummaryReturnFocusRef.current = document.activeElement;
    var focusTimer = window.setTimeout(function () {
      var initial = dialog.querySelector('[data-persona-summary-initial-focus]');
      if (initial && typeof initial.focus === 'function') initial.focus();
      else dialog.focus();
    }, 0);
    return function () {
      window.clearTimeout(focusTimer);
      var previous = personaSummaryReturnFocusRef.current;
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, [isPersonaSummaryOpen]);

  // Pure helpers
  var splitTextToSentences = props.splitTextToSentences;
  var formatInteractiveText = props.formatInteractiveText;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var CharacterColumn = props.CharacterColumn;
  var HarmonyMeter = props.HarmonyMeter;
  // Interview resume via the on-device storage bridge.
  // Scope every snapshot to an app, Persona resource, and student so a shared
  // browser cannot offer another project or learner's interview.
  var _personaSnapshotResourceId = generatedContent && generatedContent.type === 'persona'
    ? generatedContent.id
    : null;
  var _hashPersonaScope = function (value) { var hash = 2166136261; String(value || '').split('').forEach(function (ch) { hash ^= ch.charCodeAt(0); hash = Math.imul(hash, 16777619); }); return 'u' + (hash >>> 0).toString(36); };
  var _personaSnapshotRawStudentId = typeof studentNickname === 'string' && studentNickname.trim() ? studentNickname.trim() : (isTeacherMode ? 'teacher' : null);
  var _personaSnapshotStudentId = _personaSnapshotRawStudentId ? _hashPersonaScope(_personaSnapshotRawStudentId) : null;
  var _personaRetentionDays = 14;
  try {
    var _storedPersonaRetentionRaw = localStorage.getItem('allo_persona_resume_days');
    var _storedPersonaRetention = _storedPersonaRetentionRaw == null || String(_storedPersonaRetentionRaw).trim() === ''
      ? 14
      : Number(_storedPersonaRetentionRaw);
    _personaRetentionDays = Number.isFinite(_storedPersonaRetention) && [0, 7, 14, 30].includes(_storedPersonaRetention)
      ? _storedPersonaRetention
      : 14;
  } catch (_) {}
  var _personaSnapshotEnabled = Boolean(_personaSnapshotResourceId && _personaSnapshotStudentId && _personaRetentionDays > 0);
  var _personaSnapshotScope = [appId || 'app', _personaSnapshotResourceId || 'no-resource', _personaSnapshotStudentId || 'disabled']
    .map(function (value) { return String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120); })
    .join(':');
  var _personaSnapshotKey = ('active:' + _personaSnapshotScope).slice(0, 500);
  var _dsResumeState = React.useState(null);
  var personaResumeOffer = _dsResumeState[0];
  var setPersonaResumeOffer = _dsResumeState[1];
  var _dsCheckedKeyRef = React.useRef(null);
  var _dsSaveTimerRef = React.useRef(null);
  var _ensureDeviceStorage = function () {
    if (!window.__alloDeviceStoragePromise) {
      window.__alloDeviceStoragePromise = window.alloDeviceStorage
        ? Promise.resolve(window.alloDeviceStorage)
        : new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds1';
            s.onload = function () {
              if (window.alloDeviceStorage) resolve(window.alloDeviceStorage);
              else reject(new Error('device storage module missing after load'));
            };
            s.onerror = function () { reject(new Error('device storage module failed to load')); };
            document.head.appendChild(s);
          });
    }
    return window.__alloDeviceStoragePromise.then(function (ds) {
      return ds.ready().then(function () { return ds; });
    }).catch(function (error) {
      window.__alloDeviceStoragePromise = null;
      throw error;
    });
  };
  var _clearPersonaSnapshot = function () {
    if (!_personaSnapshotEnabled) return;
    _ensureDeviceStorage().then(function (ds) {
      return ds.remove('persona_sessions', _personaSnapshotKey);
    }).catch(function () {});
  };
  var _sanitizeSnapshotCharacter = function (character) {
    if (!character || typeof character !== 'object') return null;
    var copy = { ...character };
    delete copy.chatHistory;
    delete copy.savedDialogue;
    if (typeof copy.avatarUrl !== 'string' || copy.avatarUrl.length >= 300000) copy.avatarUrl = null;
    return copy;
  };
  var _dsChatLen = (personaState.chatHistory || []).length;
  React.useEffect(function () {
    if (!_personaSnapshotEnabled || _dsCheckedKeyRef.current === _personaSnapshotKey) return;
    _dsCheckedKeyRef.current = _personaSnapshotKey;
    var mountMsgs = _dsChatLen;
    _ensureDeviceStorage().then(function (ds) {
      // v1 used one global key for every resource/student. Remove that unsafe
      // legacy record before looking up the scoped v2 snapshot.
      return Promise.resolve(ds.remove('persona_sessions', 'active'))
        .catch(function () {})
        .then(function () { return ds.get('persona_sessions', _personaSnapshotKey); });
    }).then(function (snap) {
      var savedTime = snap && Date.parse(snap.savedAt);
      var isExpired = !Number.isFinite(savedTime) || Date.now() - savedTime > _personaRetentionDays * 86400000;
      if (isExpired) { _clearPersonaSnapshot(); return; }
      if (!snap || snap.resourceId !== _personaSnapshotResourceId || snap.studentId !== _personaSnapshotStudentId || !snap.state || !(snap.state.chatHistory || []).length) return;
      if ((snap.state.chatHistory || []).length > mountMsgs) setPersonaResumeOffer(snap);
    }).catch(function () {});
  }, [_personaSnapshotKey]);
  React.useEffect(function () {
    if (!_personaSnapshotEnabled || _dsChatLen < 2) return undefined;
    if (personaResumeOffer) return undefined;
    if (_dsSaveTimerRef.current) clearTimeout(_dsSaveTimerRef.current);
    var st = personaState;
    _dsSaveTimerRef.current = setTimeout(function () {
      var avatarOk = typeof st.avatarUrl === 'string' && st.avatarUrl.length < 300000;
      var snap;
      try {
        snap = JSON.parse(JSON.stringify({
          v: 2,
          appId: appId || null,
          resourceId: _personaSnapshotResourceId,
          studentId: _personaSnapshotStudentId,
          savedAt: new Date().toISOString(),
          state: {
            mode: st.mode,
            selectedCharacter: _sanitizeSnapshotCharacter(st.selectedCharacter),
            selectedCharacters: (st.selectedCharacters || []).map(_sanitizeSnapshotCharacter).filter(Boolean),
            chatHistory: (st.chatHistory || []).slice(-80),
            harmonyScore: st.harmonyScore,
            earnedBadges: st.earnedBadges || [],
            topicSparkCount: st.topicSparkCount || 0,
            suggestions: st.suggestions || [],
            panelSuggestions: st.panelSuggestions || [],
            avatarUrl: avatarOk ? st.avatarUrl : null
          }
        }));
      } catch (_) { return; }
      var serializedSnapshot = '';
      try { serializedSnapshot = JSON.stringify(snap); } catch (_) { return; }
      if (serializedSnapshot.length > 750000) { _clearPersonaSnapshot(); return; }
      _ensureDeviceStorage().then(function (ds) {
        return ds.set('persona_sessions', _personaSnapshotKey, snap);
      }).catch(function () {});
    }, 1500);
    return function () { if (_dsSaveTimerRef.current) clearTimeout(_dsSaveTimerRef.current); };
  }, [_personaSnapshotKey, _dsChatLen, personaState.harmonyScore, (personaState.earnedBadges || []).length, !!personaResumeOffer]);
  var _resumeSnapshotName = personaResumeOffer
    ? ((personaResumeOffer.state.selectedCharacter && personaResumeOffer.state.selectedCharacter.name)
       || (personaResumeOffer.state.selectedCharacters || []).map(function (c) { return c && c.name; }).filter(Boolean).join(' & ')
       || 'your character')
    : null;
  var _handleResumeSnapshot = function () {
    var snap = personaResumeOffer;
    if (!snap || snap.resourceId !== _personaSnapshotResourceId || snap.studentId !== _personaSnapshotStudentId) {
      _clearPersonaSnapshot();
      setPersonaResumeOffer(null);
      return;
    }
    setPersonaState(function (prev) {
      return {
        ...prev,
        ...snap.state,
        isLoading: false,
        showReflection: false,
        reflectionText: '',
        reflectionSubmitted: false
      };
    });
    setPersonaResumeOffer(null);
  };
  var _handleDiscardSnapshot = function () {
    _clearPersonaSnapshot();
    setPersonaResumeOffer(null);
  };
  var _handleCloseAndClearSnapshot = function () {
    _clearPersonaSnapshot();
    if (typeof stopPlayback === 'function') stopPlayback();
    if (typeof setPersonaAutoRead === 'function') setPersonaAutoRead(false);
    handleClosePersonaChat();
  };
  var _handleCompleteReflection = function () {
    _handleCloseAndClearSnapshot();
    setReflectionFeedback(null);
    setIsPersonaReflectionOpen(false);
    setPersonaReflectionInput('');
    setPersonaState(function (prev) {
      return {
        ...prev,
        selectedCharacter: null,
        chatHistory: [],
        suggestions: [],
        panelSuggestions: [],
        selectedCharacters: [],
        mode: 'single',
        harmonyScore: 10,
        earnedBadges: []
      };
    });
  };
  personaCloseHandlerRef.current = _handleCloseAndClearSnapshot;
  var activePersonaMessageMatch = typeof playingContentId === 'string' ? playingContentId.match(/^persona-message-(\d+)$/) : null;
  var activePersonaMessageIndex = activePersonaMessageMatch ? parseInt(activePersonaMessageMatch[1], 10) : -1;
  var activePersonaMessage = activePersonaMessageIndex >= 0 ? (personaState.chatHistory || [])[activePersonaMessageIndex] : null;
  var activeSpeakerName = activePersonaMessage && activePersonaMessage.role !== 'user'
      ? (activePersonaMessage.speakerName || personaState.selectedCharacter?.name || null)
      : null;
  var panelTotalXp = (personaState.selectedCharacters?.[0]?.accumulatedXP || 0) + (personaState.selectedCharacters?.[1]?.accumulatedXP || 0);
  var panelHarmonyScore = personaState.harmonyScore || 0;
  var panelConcludeReady = panelHarmonyScore >= 50 || panelTotalXp >= 100;
  var panelUnlockPct = Math.min(100, Math.round(Math.max((panelHarmonyScore / 50) * 100, (panelTotalXp / 100) * 100)));
  var singleRapport = personaState.selectedCharacter?.rapport ?? personaState.selectedCharacter?.initialRapport ?? 0;
  var singleXp = personaState.selectedCharacter?.accumulatedXP || 0;
  var singleConcludeReady = singleRapport >= 50 || singleXp >= 100;
  var singleUnlockPct = Math.min(100, Math.round(Math.max((singleRapport / 50) * 100, (singleXp / 100) * 100)));
  var canGeneratePersonaSummary = Array.isArray(personaState.chatHistory)
    && personaState.chatHistory.some(function (message) { return message && message.role === 'user'; })
    && personaState.chatHistory.some(function (message) { return message && message.role === 'model'; });
  var personaSummary = personaState.personaSummary && typeof personaState.personaSummary === 'object'
    ? personaState.personaSummary
    : null;
  var _summaryItemText = function (item) {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    return item.text || item.question || item.step || item.strength || item.insight || item.name || '';
  };
  var _summaryList = function (value) {
    return Array.isArray(value) ? value.map(_summaryItemText).filter(Boolean) : [];
  };
  var summarySections = personaSummary ? [
    { key: 'agreements', title: t('persona.summary.agreements'), items: _summaryList(personaSummary.areasOfAgreement) },
    { key: 'disagreements', title: t('persona.summary.disagreements'), items: _summaryList(personaSummary.areasOfDisagreement) },
    { key: 'questions', title: t('persona.summary.unanswered_questions'), items: _summaryList(personaSummary.unansweredQuestions) },
    { key: 'strengths', title: t('persona.summary.student_strengths'), items: _summaryList(personaSummary.studentStrengths) },
    { key: 'next', title: t('persona.summary.next_steps'), items: _summaryList(personaSummary.nextSteps) }
  ].filter(function (section) { return section.items.length > 0; }) : [];
  return (
        <ErrorBoundary fallbackMessage={t('persona.interface_error')}>
        {/* allo-docsuite: portal outside the main content wrapper — opts its pastel accents
            (from-yellow-50 / from-indigo-50 chips + info boxes) into the theme-dark remap so they
            stop reading light-pastel in dark mode. No-op in light mode. */}
        <div
            className={`allo-docsuite fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in motion-reduce:animate-none fade-in duration-300 theme-${theme}`}
            ref={personaDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-chat-title"
            tabIndex={-1}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <h1 id="persona-chat-title" className="sr-only">
                {personaState.mode === 'panel' ? (t('persona.panel_header') || 'Panel interview') : (t('persona.interview_title') || 'Character interview')}
            </h1>
            {personaResumeOffer && (
                <div role="region" aria-live="polite" aria-atomic="true" aria-label={t('persona.resume_title') || 'Resume saved interview'} className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] max-w-[94%] bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-xl shadow-2xl px-4 py-2.5 flex flex-wrap items-center gap-3 animate-in motion-reduce:animate-none slide-in-from-top-2 duration-300">
                    <span className="text-sm font-medium">
                        💾 {(t('persona.resume_prompt') || 'Pick up your earlier interview with {name}?').replace('{name}', _resumeSnapshotName)}
                        <span className="opacity-70 ml-1 text-xs">
                            ({(personaResumeOffer.state.chatHistory || []).length} {t('persona.resume_messages')}{personaResumeOffer.savedAt ? ', ' + new Date(personaResumeOffer.savedAt).toLocaleString() : ''} — {t('persona.resume_device_note')}; {t('persona.resume_recent_limit', { count: 80 })})
                        </span>
                    </span>
                    <span className="flex items-center gap-2 ml-auto">
                        <button type="button" onClick={_handleResumeSnapshot} className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none">
                            {t('persona.resume_btn') || 'Resume'}
                        </button>
                        <button type="button" onClick={_handleDiscardSnapshot} className="text-xs font-bold bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none">
                            {t('persona.resume_discard_btn') || 'Discard'}
                        </button>
                    </span>
                </div>
            )}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative border-4 border-yellow-200 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[85vh]">
                {personaState.mode === 'panel' ? (
                    <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden relative">
                        <div className="shrink-0 p-4 border-b border-indigo-100 bg-white z-20 relative flex justify-center items-center shadow-sm">
                             <div className="absolute left-4 flex items-center gap-3">
                                 <span className="font-black text-indigo-900 text-lg uppercase tracking-tight hidden md:block">
                                     {t('persona.panel_header')}
                                 </span>
                                 <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 px-2 py-1 rounded-lg border border-yellow-200 hidden md:flex">
                                     <Star size={14} className="text-yellow-500" />
                                     <span className="text-xs font-black text-yellow-600">
                                        {panelTotalXp}
                                     </span>
                                     <span className="text-[11px] text-slate-600">{t('common.xp')}</span>
                                 </div>
                             </div>
                             <div className="w-full max-w-lg transition-all motion-reduce:transition-none duration-500">
                                <HarmonyMeter score={personaState.harmonyScore ?? 10} />
                             </div>
                             <button type="button"
                                data-help-key="persona_close" data-help-ignore
                                data-persona-initial-focus
                                onClick={_handleCloseAndClearSnapshot}
                                className="absolute right-4 p-2 text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors motion-reduce:transition-none"
                                aria-label={t('common.close')}
                             >
                                <X size={20} />
                             </button>
                        </div>
                        <div className="shrink-0 px-4 py-2 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-center gap-2">
                            <button type="button"
                                aria-label={t('common.volume')}
                                onClick={() => {
                                    const newState = !personaAutoRead;
                                    setPersonaAutoRead(newState);
                                    if (!newState) stopPlayback();
                                }}
                                className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                    personaAutoRead
                                    ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on')}
                                data-help-key="persona_auto_read"
                                aria-pressed={personaAutoRead}
                            >
                                {personaAutoRead ? <Volume2 size={16} className="animate-pulse motion-reduce:animate-none"/> : <VolumeX size={16}/>}
                                <span className="text-xs font-bold hidden sm:inline">{t('persona.auto_read_label')}</span>
                            </button>
                            <button type="button"
                                data-help-key="persona_auto_send"
                                aria-pressed={personaAutoSend}
                                onClick={handleTogglePersonaAutoSend}
                                className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                    personaAutoSend
                                    ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send')}
                            >
                                <Zap size={16} className={personaAutoSend ? "fill-current" : ""} />
                                <span className="text-xs font-bold hidden sm:inline">{t('persona.auto_send')}</span>
                            </button>
                            <div className="w-px h-6 bg-slate-300 mx-1"></div>
                            {isPersonaFreeResponse && (
                                <button type="button"
                                    aria-label={t('common.show')}
                                    data-help-key="persona_show_hints"
                                    aria-pressed={showPersonaHints}
                                    onClick={handleToggleShowPersonaHints}
                                    className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                        !showPersonaHints
                                        ? 'bg-red-50 text-red-600 border-red-200 shadow-inner'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title={showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip')}
                                >
                                    {showPersonaHints ? <Eye size={16} /> : <EyeOff size={16} />}
                                    <span className="text-xs font-bold hidden sm:inline">
                                        {showPersonaHints ? t('persona.hints_on') : t('persona.hints_off')}
                                    </span>
                                </button>
                            )}
                            {(isTeacherMode || studentProjectSettings.allowPersonaFreeResponse) && (
                            <button type="button"
                                aria-label={isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')}
                                data-help-key="persona_response_mode"
                                aria-pressed={isPersonaFreeResponse}
                                onClick={() => {
                                    const newMode = !isPersonaFreeResponse;
                                    setIsPersonaFreeResponse(newMode);
                                    if (!newMode) setShowPersonaHints(true);
                                }}
                                className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                    !isPersonaFreeResponse
                                    ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')}
                            >
                                {isPersonaFreeResponse ? <MessageSquare size={16} /> : <ListChecks size={16} />}
                                <span className="text-xs font-bold hidden sm:inline">
                                    {isPersonaFreeResponse ? t('persona.mode_free_label') : t('persona.mode_mc_label')}
                                </span>
                            </button>
                            )}
                            <button type="button"
                                data-help-key="persona_topic_spark"
                                onClick={handlePersonaTopicSpark}
                                disabled={personaState.isLoading || personaState.isGeneratingTopicSpark || (personaState.topicSparkCount || 0) >= 2}
                                className={`p-2 rounded-lg border shadow-sm transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                    (personaState.topicSparkCount || 0) >= 2
                                    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                                    : 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                                }`}
                                title={t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', { remaining: 2 - (personaState.topicSparkCount || 0) })}
                                aria-label={t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', { remaining: 2 - (personaState.topicSparkCount || 0) })}
                            >
                                <Lightbulb size={16} className={personaState.isGeneratingTopicSpark ? 'animate-pulse motion-reduce:animate-none' : ''}/>
                            </button>
                            <div className="w-px h-6 bg-slate-300 mx-1"></div>
                            <button type="button"
                                aria-label={t('common.save')}
                                data-help-key="persona_save_chat"
                                onClick={handleSavePersonaChat}
                                disabled={personaState.chatHistory.length === 0}
                                className="p-2 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title={t('persona.save_tooltip')}
                            >
                                <Save size={16}/>
                            </button>
                            <button type="button"
                                onClick={_openPersonaSummary}
                                disabled={!canGeneratePersonaSummary || personaState.isGeneratingSummary}
                                className="p-2 rounded-lg bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title={personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn')}
                                aria-label={personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn')}
                                aria-busy={personaState.isGeneratingSummary ? 'true' : 'false'}
                            >
                                <Sparkles size={16} className={personaState.isGeneratingSummary ? 'animate-pulse motion-reduce:animate-none' : ''}/>
                            </button>
                            <button type="button"
                                aria-label={t('common.check')}
                                data-help-key="persona_conclude"
                                onClick={() => {
                                    handleGenerateReflectionPrompt();
                                    setIsPersonaReflectionOpen(true);
                                }}
                                disabled={!panelConcludeReady}
                                className={`relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md active:scale-95 transition-all motion-reduce:transition-none text-xs font-bold ${
                                    panelConcludeReady
                                    ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                                    : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'
                                }`}
                                title={panelConcludeReady ? t('persona.conclude_tooltip') : `${t('persona.conclude_locked') || 'Keep building rapport to unlock reflection'} (${panelUnlockPct}%)`}
                            >
                                {panelConcludeReady
                                    ? <CheckCircle2 size={16}/>
                                    : <Lock size={16}/>}
                                <span className="hidden sm:inline">{t('persona.conclude_button')}</span>
                                {!panelConcludeReady && <span className="hidden lg:inline text-[10px] font-black opacity-80">{panelUnlockPct}%</span>}
                                {!panelConcludeReady && (
                                    <span className="absolute left-1 right-1 bottom-1 h-1 rounded-full bg-white/70 overflow-hidden">
                                        <span className="block h-full rounded-full bg-indigo-400 transition-all motion-reduce:transition-none duration-500" style={{ width: `${panelUnlockPct}%` }} />
                                    </span>
                                )}
                            </button>
                        </div>
                        {(personaState.isGeneratingTopicSpark || personaState.topicSparkError) && (
                            <div className={`shrink-0 border-b px-4 py-2 text-center text-xs ${personaState.topicSparkError ? 'border-red-200 bg-red-50 text-red-800' : 'border-indigo-100 bg-indigo-50 text-indigo-700'}`} role={personaState.topicSparkError ? 'alert' : 'status'} aria-live="polite">
                                {personaState.isGeneratingTopicSpark ? (
                                    <span className="inline-flex items-center gap-2"><RefreshCw size={13} className="animate-spin motion-reduce:animate-none" /> {t('persona.topic_spark_generating')}</span>
                                ) : (
                                    <span className="inline-flex flex-wrap items-center justify-center gap-2">
                                        {t('persona.topic_spark_error')}
                                        <button type="button" onClick={handlePersonaTopicSpark} disabled={(personaState.topicSparkCount || 0) >= 2} className="rounded border border-red-300 bg-white px-2 py-1 font-bold hover:bg-red-100 disabled:opacity-50">{t('persona.topic_spark_retry')}</button>
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="shrink-0 md:hidden px-3 py-2 bg-white border-b border-slate-200 flex items-start gap-2 overflow-x-auto">
                            {(personaState.selectedCharacters || []).map((char, cIdx) => {
                                const isActivePanelist = activeSpeakerName && activeSpeakerName === char?.name;
                                const rapport = char?.rapport ?? char?.initialRapport ?? 30;
                                const xp = char?.accumulatedXP || 0;
                                const quests = [...(char?.quests || [])].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));
                                return (
                                    <details key={char?.name || cIdx} className={`group w-[min(82vw,20rem)] shrink-0 rounded-xl border text-xs transition-all motion-reduce:transition-none ${isActivePanelist ? 'bg-yellow-50 border-yellow-300 text-yellow-900 shadow-sm ring-2 ring-yellow-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                        <summary className="cursor-pointer list-none flex items-center gap-2 px-2.5 py-2 font-bold" aria-label={t('persona.expand_panelist', { name: char?.name || t('persona.character_fallback') })}>
                                            <div className={`w-8 h-8 rounded-full overflow-hidden bg-white border shrink-0 ${isActivePanelist ? 'border-yellow-400' : 'border-slate-300'}`}>
                                                {char?.avatarUrl ? <img loading="lazy" src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-sm">{(char?.name || '?').slice(0, 1)}</span>}
                                            </div>
                                            <span className="min-w-0 flex-1 truncate">{char?.name || t('persona.character_fallback')}</span>
                                            <span className="font-black tabular-nums">{rapport}%</span>
                                            {isActivePanelist && <span className="inline-flex items-center gap-1 text-[10px] text-yellow-700"><Volume2 size={12} className="animate-pulse motion-reduce:animate-none" /> {t('persona.active_speaker')}</span>}
                                            <span className="shrink-0 text-base transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true">▾</span>
                                        </summary>
                                        <div className="border-t border-current/10 px-3 py-3 space-y-3 text-left" aria-label={t('persona.panelist_details', { name: char?.name || t('persona.character_fallback') })}>
                                            <div>
                                                <div className="mb-1 flex justify-between font-bold"><span>{t('persona.rapport_label')}</span><span>{rapport}%</span></div>
                                                <div role="progressbar" aria-label={t('persona.rapport_label')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={rapport} className="h-2 overflow-hidden rounded-full border border-slate-300 bg-white">
                                                    <div className={`h-full ${cIdx === 0 ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(0, Math.min(100, rapport))}%` }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="mb-1 flex justify-between font-bold"><span>{t('common.xp')}</span><span>{xp}/300</span></div>
                                                <div role="progressbar" aria-label={t('persona.xp_progress', { name: char?.name, xp })} aria-valuemin={0} aria-valuemax={300} aria-valuenow={xp} className="h-2 overflow-hidden rounded-full border border-slate-300 bg-white">
                                                    <div className="h-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, (xp / 300) * 100))}%` }} />
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="mb-2 flex items-center gap-1 font-black uppercase tracking-wide"><Search size={12} /> {t('persona.objectives_label')}</h3>
                                                {quests.length ? (
                                                    <ul className="space-y-1.5">
                                                        {quests.map((quest, qIdx) => {
                                                            const isLocked = rapport < Number(quest.difficulty || 0);
                                                            return (
                                                                <li key={qIdx} className={`rounded-lg border px-2 py-1.5 ${quest.isCompleted ? 'border-green-200 bg-green-50 text-green-800' : isLocked ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-indigo-200 bg-white text-slate-800'}`}>
                                                                    <span className="flex items-start gap-1.5">
                                                                        {quest.isCompleted
                                                                            ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                                                                            : isLocked
                                                                                ? <Lock size={12} className="mt-0.5 shrink-0" />
                                                                                : <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-indigo-400" aria-hidden="true" />}
                                                                        <span>{quest.text}</span>
                                                                    </span>
                                                                    {!quest.isCompleted && isLocked && <span className="mt-1 block pl-4 text-[10px] font-bold opacity-70">{t('persona.rapport_requirement', { difficulty: quest.difficulty })}</span>}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : <p className="text-slate-500">{t('persona.no_objectives')}</p>}
                                            </div>
                                            {!char?.avatarUrl && typeof handleRetryPortraitGeneration === 'function' && (
                                                <button type="button"
                                                    onClick={() => handleRetryPortraitGeneration(char)}
                                                    disabled={Boolean(char?.isUpdating)}
                                                    aria-busy={char?.isUpdating ? 'true' : 'false'}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-2 font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <RefreshCw size={13} className={char?.isUpdating ? 'animate-spin motion-reduce:animate-none' : ''} />
                                                    {t('persona.generate_portrait')}
                                                </button>
                                            )}
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className={`w-1/4 min-w-[250px] border-r border-slate-200 bg-white flex flex-col p-4 overflow-hidden hidden md:flex transition-all motion-reduce:transition-none ${activeSpeakerName && activeSpeakerName === personaState.selectedCharacters?.[0]?.name ? 'ring-2 ring-yellow-200 ring-inset shadow-inner' : ''}`}>
                                <CharacterColumn character={personaState.selectedCharacters[0]} side="left" onRetryPortrait={handleRetryPortraitGeneration} />
                            </div>
                            <div className="flex-1 flex flex-col bg-slate-50/50 relative min-w-[320px]">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={personaScrollRef} onScroll={(e) => { const el = e.currentTarget; personaScrollRef.current.__alloStickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label={t("a11y.interview_conversation")}>
                                    <div role="note" className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">{t('persona.simulation_disclaimer') || 'AI-generated historical simulation. Verify important claims with lesson evidence and trusted sources.'}</div>
                                    {personaState.chatHistory.map((msg, idx) => {
                                        const isUser = msg.role === 'user';
                                        const isCharB = !isUser && msg.speakerName === personaState.selectedCharacters[1]?.name;
                                        const speakerLabel = isUser ? t('common.you') : msg.speakerName;
                                        const isMessagePlayingNow = playingContentId === `persona-message-${idx}`;
                                        return (
                                            <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : isCharB ? 'items-end' : 'items-start'}`}>
                                                 <div
                                                    className={`relative overflow-hidden max-w-[85%] p-4 rounded-2xl text-sm shadow-sm leading-relaxed border transition-all motion-reduce:transition-none ${
                                                    isUser ? 'bg-indigo-100 text-indigo-900 border-indigo-200 rounded-br-none' :
                                                    isCharB ? 'bg-rose-50 text-slate-800 border-rose-200 rounded-br-none mr-2' :
                                                    'bg-white text-slate-700 border-slate-200 rounded-bl-none ml-2'
                                                    } ${isMessagePlayingNow ? 'ring-2 ring-yellow-200 border-yellow-300 shadow-md' : ''}`}
                                                    aria-label={!isUser ? (t('a11y.message_speaker_read_aloud', { name: speakerLabel }) || ('Message from ' + speakerLabel + '. Click any sentence to hear it read aloud.')) : undefined}
                                                 >
                                                    {isMessagePlayingNow && <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 animate-pulse motion-reduce:animate-none" />}
                                                    {isUser ? (
                                                        msg.text.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
                                                    ) : (
                                                        (() => {
                                                            const paragraphs = msg.text.split(/\n{2,}/);
                                                            let sentenceCounter = 0;
                                                            return paragraphs.map((para, pIdx) => {
                                                                const sentences = splitTextToSentences(para);
                                                                if (sentences.length === 0) return null;
                                                                return (
                                                                    <p key={pIdx} className="mb-2 last:mb-0">
                                                                        {sentences.map((s, sIdx) => {
                                                                            const currentGlobalIdx = sentenceCounter;
                                                                            sentenceCounter++;
                                                                            const isMessagePlaying = playingContentId === `persona-message-${idx}`;
                                                                            // TTS plays multi-sentence chunks for voice consistency; chunkRanges maps chunk idx → sentence range
                                                                            const _activeRange = isMessagePlaying && playbackState.chunkRanges ? playbackState.chunkRanges[playbackState.currentIdx] : null;
                                                                            const _activeSentenceIdx = isMessagePlaying && typeof playbackState.currentSentenceIdx === 'number' ? playbackState.currentSentenceIdx : null;
                                                                            const isActive = isMessagePlaying && (_activeSentenceIdx !== null ? currentGlobalIdx === _activeSentenceIdx : (_activeRange ? (currentGlobalIdx >= _activeRange[0] && currentGlobalIdx < _activeRange[1]) : currentGlobalIdx === playbackState.currentIdx));
                                                                            const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
                                                                            const isHeader = s.trim().startsWith('#') || isHtmlHeader;
                                                                            const cleanText = isHeader ? (isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '')) : s;
                                                                            return (
                                                                                <span
                                                                                    key={sIdx}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleSpeak(msg.text, `persona-message-${idx}`, currentGlobalIdx);
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            handleSpeak(msg.text, `persona-message-${idx}`, currentGlobalIdx);
                                                                                        }
                                                                                    }}
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    className={`transition-colors motion-reduce:transition-none duration-200 rounded px-1 py-0.5 cursor-pointer hover:bg-yellow-100 ${isActive ? 'bg-yellow-200 text-slate-950 shadow-sm ring-1 ring-yellow-400' : ''} ${isHeader ? 'font-bold block mt-1' : ''}`}
                                                                                    title={t('common.click_to_read')}
                                                                                    aria-label={t('a11y.sentence_read_aloud', { num: currentGlobalIdx + 1 }) || `Sentence ${currentGlobalIdx + 1}. Click to read aloud.`}
                                                                                >
                                                                                    {formatInteractiveText(cleanText.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1'))}
                                                                                    {" "}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </p>
                                                                );
                                                            });
                                                        })()
                                                    )}
                                                    {!isUser && msg.translation && (
                                                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                    {t('persona.translation_label') || 'English translation'}
                                                                </span>
                                                                <button type="button"
                                                                    aria-label={t('common.volume')}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSpeak(msg.translation, `persona-panel-translation-${idx}`, 0);
                                                                    }}
                                                                    className="p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                                                                >
                                                                    <Volume2 size={12}/>
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-slate-500 leading-relaxed italic">{msg.translation}</p>
                                                        </div>
                                                    )}
                                                    {!isUser && msg.evidenceNote && (<details className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900"><summary className="cursor-pointer font-bold">{t('persona.evidence_note') || 'Evidence & simulation note'}</summary><p className="mt-1 leading-relaxed">{msg.evidenceNote}</p></details>)}
                                                    {!isUser && <span className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 opacity-70"><Volume2 size={11}/> {t('persona.click_sentence') || 'Click any sentence to listen'}</span>}
                                                 </div>
                                                 <span className={`text-[11px] mt-1 px-1 font-bold uppercase tracking-wider flex items-center gap-1 ${isMessagePlayingNow ? 'text-yellow-700' : 'text-slate-600'}`}>
                                                    {speakerLabel}
                                                    {isMessagePlayingNow && <Volume2 size={11} className="animate-pulse motion-reduce:animate-none" />}
                                                 </span>
                                            </div>
                                        );
                                    })}
                                    {personaState.isLoading && (
                                        <div role="status" aria-live="polite" className="flex justify-center p-4">
                                            <div className="bg-white px-4 py-2 rounded-full border border-indigo-100 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <RefreshCw size={12} className="animate-spin motion-reduce:animate-none text-indigo-500"/> {t('persona.status_deliberating')}
                                                <span className="flex items-center gap-0.5 ml-1" aria-hidden="true">
                                                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none"></span>
                                                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none" style={{ animationDelay: '120ms' }}></span>
                                                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none" style={{ animationDelay: '240ms' }}></span>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {panelTtsPending.length > 0 && (
                                        <div role="status" aria-live="polite" className="flex justify-center p-2">
                                            <div className="bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200 flex items-center gap-2 text-xs font-medium text-violet-600 animate-pulse motion-reduce:animate-none">
                                                <Volume2 size={12} className="animate-bounce motion-reduce:animate-none"/> {t('persona.waiting_to_speak')}
                                            </div>
                                        </div>
                                    )}
                                    {personaDefinitionData && (
                                        <div
                                            className="fixed z-[9999] bg-white rounded-xl shadow-2xl border-2 border-indigo-200 p-4 max-w-sm animate-in motion-reduce:animate-none zoom-in-95 duration-150"
                                            style={{
                                                left: Math.min(personaDefinitionData.x + 10, window.innerWidth - 320),
                                                top: Math.min(personaDefinitionData.y + 10, window.innerHeight - 150)
                                            }}
                                            ref={personaDefinitionDialogRef}
                                            role="dialog"
                                            aria-labelledby="persona-definition-title"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleSetPersonaDefinitionDataToNull();
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span id="persona-definition-title" className="font-bold text-lg text-indigo-600">{personaDefinitionData.word}</span>
                                                <button type="button"
                                                    data-definition-initial-focus
                                                    aria-label={t('common.close_definition')}
                                                    onClick={handleSetPersonaDefinitionDataToNull}
                                                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded p-1 transition-colors motion-reduce:transition-none"
                                                >
                                                    <X size={16}/>
                                                </button>
                                            </div>
                                            {isPersonaDefining ? (
                                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <RefreshCw size={14} className="animate-spin motion-reduce:animate-none"/>
                                                    {t('persona.looking_up_definition')}
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-slate-700 leading-relaxed mb-3">
                                                        {personaDefinitionData.text}
                                                    </p>
                                                    <button type="button"
                                                        aria-label={t('common.volume')}
                                                        onClick={() => handleSpeak(personaDefinitionData.text, 'persona-definition', 0)}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full"
                                                    >
                                                        <Volume2 size={12}/> {t('persona.speak_definition')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {(personaState.panelSuggestions || []).length > 0 && !personaState.isLoading && !panelChoicePending ? (
                                    <div className="p-4 bg-white border-t border-slate-200">
                                        <p className="text-xs text-slate-600 text-center mb-3 font-medium">{t('persona.panel_choose_response')}</p>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                                            {personaState.panelSuggestions.map((opt, i) => (
                                                <button type="button"
                                                    key={i}
                                                    onClick={() => _handlePanelChoice(opt)}
                                                    disabled={panelChoicePending || personaState.isLoading}
                                                    className="text-left px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all motion-reduce:transition-none duration-300 shadow-sm hover:scale-[1.01] active:scale-[0.99] bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300"
                                                >
                                                    <span className="opacity-50 mr-2">{String.fromCharCode(65+i)}.</span>
                                                    {opt.text}
                                                </button>
                                            ))}
                                        </div>
                                        {(personaState.panelSuggestions || []).length < 6 && (
                                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600" role="status" aria-live="polite">
                                                {personaState.isGeneratingPanelSuggestions ? (
                                                    <><RefreshCw size={14} className="animate-spin motion-reduce:animate-none text-indigo-600" /> {t('persona.choices_partial')}</>
                                                ) : (
                                                    <>
                                                        <span>{personaState.panelSuggestionsError ? t('persona.choices_generation_failed') : t('persona.choices_partial')}</span>
                                                        {typeof generatePanelFollowUps === 'function' && (
                                                            <button type="button"
                                                                onClick={() => generatePanelFollowUps(personaState.chatHistory, personaState.selectedCharacters?.[0], personaState.selectedCharacters?.[1])}
                                                                className="font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
                                                            >
                                                                {t('persona.retry_choices')}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : isPersonaFreeResponse ? (
                                    <div className="p-4 bg-white border-t border-slate-200">
                                        <div className="flex gap-2">
                                            <input aria-label={t('common.enter_persona_input')}
                                                maxLength={2000}
                                                value={personaInput}
                                                onChange={(e) => setPersonaInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !personaState.isLoading && handlePanelChatSubmit(personaInput)}
                                                className="flex-1 p-3 border-2 border-indigo-600 rounded-xl focus:border-indigo-400 outline-none transition-all motion-reduce:transition-none placeholder:text-slate-600"
                                                placeholder={t('persona.panel_question_placeholder')}
                                                disabled={personaState.isLoading}
                                            />
                                            <button type="button"
                                                aria-label={personaState.isLoading ? t('persona.waiting_for_response') : t('persona.send_panel_message')}
                                                aria-busy={personaState.isLoading ? 'true' : 'false'}
                                                onClick={() => handlePanelChatSubmit(personaInput)}
                                                disabled={!personaInput.trim() || personaState.isLoading}
                                                className="bg-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {personaState.isLoading ? <RefreshCw size={20} className="animate-spin motion-reduce:animate-none"/> : <Send size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-center gap-3" role="status" aria-live="polite">
                                        <RefreshCw size={18} className={(personaState.isLoading || personaState.isGeneratingPanelSuggestions) ? 'animate-spin motion-reduce:animate-none text-indigo-600' : 'text-indigo-600'} />
                                        <span className="text-sm font-medium text-slate-700">
                                            {personaState.panelSuggestionsError
                                                ? t('persona.choices_generation_failed')
                                                : (personaState.isLoading || personaState.isGeneratingPanelSuggestions)
                                                    ? t('persona.generating_choices')
                                                    : t('persona.choices_unavailable')}
                                        </span>
                                        {!personaState.isLoading && !personaState.isGeneratingPanelSuggestions && typeof generatePanelFollowUps === 'function' && (
                                            <button type="button"
                                                onClick={() => generatePanelFollowUps(personaState.chatHistory, personaState.selectedCharacters?.[0], personaState.selectedCharacters?.[1])}
                                                className="text-xs font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
                                            >
                                                {t('persona.retry_choices')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className={`w-1/4 min-w-[250px] border-l border-slate-200 bg-white flex flex-col p-4 overflow-hidden hidden md:flex transition-all motion-reduce:transition-none ${activeSpeakerName && activeSpeakerName === personaState.selectedCharacters?.[1]?.name ? 'ring-2 ring-yellow-200 ring-inset shadow-inner' : ''}`}>
                                <CharacterColumn character={personaState.selectedCharacters[1]} side="right" onRetryPortrait={handleRetryPortraitGeneration} />
                            </div>
                        </div>
                        {isPersonaReflectionOpen && (
                            <div
                                ref={personaReflectionDialogRef}
                                data-persona-reflection-dialog
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="persona-reflection-title"
                                tabIndex={-1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape' && !isGradingReflection) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSetIsPersonaReflectionOpenToFalse();
                                    }
                                }}
                                className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col p-8 animate-in motion-reduce:animate-none fade-in duration-300"
                            >
                                {reflectionFeedback ? (
                                    <>
                                        <div className="text-center mb-6 relative">
                                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-in motion-reduce:animate-none zoom-in duration-300">
                                                <Sparkles size={40} className="fill-current" />
                                            </div>
                                            <h2 id="persona-reflection-title" className="text-2xl font-black text-slate-800">{t('persona.reflection_complete') || 'Great Reflection!'}</h2>
                                            <p className="text-slate-600 text-sm">{reflectionFeedback.subjectName}</p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-4">
                                            {typeof reflectionFeedback.score === 'number' && (
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 text-center">
                                                <div className="text-5xl font-black text-indigo-600 mb-2">{reflectionFeedback.score}<span className="text-2xl text-indigo-400">/100</span></div>
                                                <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{t('persona.ai_quality_score') || 'AI Reflection Estimate'}</div>
                                            </div>
                                            )}
                                            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-center gap-3">
                                                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-md"><Star size={24} className="fill-current" /></div>
                                                <div>
                                                    <div className="text-2xl font-black text-yellow-600">+{reflectionFeedback.xpEarned} XP</div>
                                                    <div className="text-xs text-yellow-700 font-medium">{t('persona.xp_earned') || 'Experience Earned'}</div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm">
                                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1"><MessageSquare size={12} /> {t('persona.ai_feedback') || 'AI Reflection Feedback'}</h4>
                                                <p className="mb-2 text-[11px] text-slate-500">{t('persona.ai_feedback_disclaimer') || 'AI-generated feedback may be imperfect; educators should review important conclusions.'}</p>
                                                <div className="text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: (reflectionFeedback.feedback || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') }} />
                                            </div>
                                        </div>
                                        <div className="mt-6">
                                            <button type="button" aria-expanded={isPersonaReflectionOpen} onClick={_handleCompleteReflection} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 flex items-center justify-center gap-2 text-lg">
                                                <CheckCircle2 size={22} /> {t('common.continue') || 'Continue'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center mb-6 relative">
                                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm"><PenTool size={32} /></div>
                                            <h2 id="persona-reflection-title" className="text-2xl font-black text-slate-800">{t('persona.reflection_title')}</h2>
                                            <p className="text-slate-600 text-sm">{t('persona.reflection_subtitle')}</p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            <div className="space-y-4">
                                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">{t('persona.reflection_prompt_label') || 'Reflection Question'}</h4>
                                                    {isGeneratingReflectionPrompt ? (
                                                        <div role="status" aria-live="polite" className="flex items-center gap-2 text-indigo-500 text-sm italic"><RefreshCw size={14} className="animate-spin motion-reduce:animate-none"/> {t('persona.status_generating_prompt')}</div>
                                                    ) : (
                                                        <p className="text-slate-700 text-sm leading-relaxed">{dynamicReflectionQuestion || t('persona.default_reflection_prompt')}</p>
                                                    )}
                                                </div>
                                                <textarea aria-label={t('persona.reflection_input') || 'Write your reflection'} maxLength={4000} value={personaReflectionInput} onChange={(e) => setPersonaReflectionInput(e.target.value)} placeholder={t('persona.reflection_placeholder')} className="w-full h-48 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-600" disabled={isGradingReflection} />
                                            </div>
                                        </div>
                                        <div className="mt-6 flex gap-3">
                                            <button type="button" onClick={handleSetIsPersonaReflectionOpenToFalse} disabled={isGradingReflection} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed">{t('persona.back_to_chat')}</button>
                                            <button type="button" aria-label={t('common.submit_reflection_for_grading')} onClick={handleSaveReflection} disabled={!personaReflectionInput.trim() || isGradingReflection} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                                {isGradingReflection ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none"/> : <Sparkles size={18} className="text-yellow-700 fill-current"/>}
                                                {isGradingReflection ? t('persona.status_grading') : t('persona.submit_xp')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                <>
                <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col items-center text-center overflow-y-auto shrink-0 z-10 relative custom-scrollbar">
                     <div className="w-48 h-72 md:w-80 md:h-[28rem] bg-yellow-100 rounded-2xl border-4 border-white shadow-xl overflow-hidden mb-6 shrink-0 relative group">
                         {personaState.avatarUrl && (
                             <img loading="lazy"
                                 src={personaState.avatarUrl}
                                 alt={personaState.selectedCharacter.name}
                                 className={`w-full h-full object-cover transition-all motion-reduce:transition-none duration-500 hover:scale-105 ${personaState.isImageLoading ? 'blur-[2px] opacity-90 scale-105' : ''}`}
                                 style={{ objectPosition: 'top center' }}
                             />
                         )}
                         {personaState.isImageLoading && (
                             <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/10 backdrop-blur-[1px] transition-all motion-reduce:transition-none">
                                 <div className="bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/30 shadow-lg">
                                     <RefreshCw size={32} className="text-white animate-spin motion-reduce:animate-none drop-shadow-md"/>
                                 </div>
                             </div>
                         )}
                         {!personaState.avatarUrl && !personaState.isImageLoading && (
                             <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                                 <History size={64} className="text-yellow-300/50"/>
                                 <button type="button"
                                     aria-label={t('common.refresh')}
                                     onClick={() => handleRetryPortraitGeneration(personaState.selectedCharacter)}
                                     className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-4 py-2 rounded-full text-sm text-slate-600 group-hover:text-indigo-700 transition-colors motion-reduce:transition-none flex items-center gap-2 transition-all motion-reduce:transition-none shadow-md hover:shadow-lg"
                                 >
                                     <RefreshCw size={16} />
                                     {t('persona.generate_portrait')}
                                 </button>
                                 {personaState.avatarGenerationFailed && (
                                     <span className="text-xs text-yellow-600/70 italic text-center">
                                         {t('persona.portrait_retry_hint')}
                                     </span>
                                 )}
                             </div>
                         )}
                     </div>
                     <h3 className="font-black text-2xl md:text-3xl text-slate-800 leading-tight mb-2">{personaState.selectedCharacter.name}</h3>
                     <div className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-yellow-200 shadow-sm">
                        {personaState.selectedCharacter.role} ({personaState.selectedCharacter.year})
                     </div>
                     <div className="w-full bg-white p-4 rounded-xl border border-slate-400 text-sm text-slate-600 leading-relaxed font-serif italic shadow-sm relative">
                         <Quote size={16} className="absolute top-2 left-2 text-slate-600 fill-current" />
                         "{personaState.selectedCharacter.context}"
                     </div>
                     <div className="w-full mt-6">
                         <div className="flex justify-between items-end mb-1">
                             <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{t('persona.trust_rapport_label')}</span>
                             <span className={`text-xs font-bold ${
                                 (personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 70 ? 'text-green-600' :
                                 (personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 30 ? 'text-yellow-600' : 'text-red-500'
                             }`}>
                                 {personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport}%
                             </span>
                         </div>
                         <div role="progressbar" aria-label={t('persona.trust_rapport_label')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport ?? 0} className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-400">
                             <div
                                 className={`h-full transition-all motion-reduce:transition-none duration-500 ease-out ${
                                     (personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 70 ? 'bg-green-500' :
                                     (personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 30 ? 'bg-yellow-400' : 'bg-red-500'
                                 }`}
                                 style={{ width: `${personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport}%` }}
                             ></div>
                         </div>
                     </div>
                     {personaState.selectedCharacter.quests && personaState.selectedCharacter.quests.length > 0 && (
                         <div className="w-full mt-6 text-left">
                             <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                                 <Search size={12}/> {t('persona.secrets_to_uncover')}
                             </h4>
                             <div className="space-y-2">
                                 {personaState.selectedCharacter.quests.map((quest, qIdx) => (
                                     <div key={qIdx} className={`p-3 rounded-lg border text-xs transition-all motion-reduce:transition-none ${quest.isCompleted ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-100 text-slate-600'}`}>
                                         <div className="flex items-start gap-2">
                                             <div className={`mt-0.5 ${quest.isCompleted ? 'text-green-500' : 'text-slate-600'}`}>
                                                 {quest.isCompleted ? <CheckCircle2 size={14}/> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current"></div>}
                                             </div>
                                             <div>
                                                 <span className={`font-bold block mb-0.5 ${quest.isCompleted ? 'line-through opacity-70' : ''}`}>
                                                     {quest.text}
                                                 </span>
                                                 {!quest.isCompleted && (
                                                     <span className="text-[11px] uppercase tracking-wider font-bold opacity-60">
                                                         {t('persona.trust_requirement', { difficulty: quest.difficulty })}
                                                     </span>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                </div>
                <div className="flex-1 flex flex-col h-full bg-white relative min-w-0">
                    <button type="button"
                        data-persona-initial-focus
                                onClick={_handleCloseAndClearSnapshot}
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors motion-reduce:transition-none z-50"
                        aria-label={t('common.close')}
                    >
                        <X size={24} />
                    </button>
                    <div className="bg-white border-b border-slate-100 p-3 pr-14 flex items-center justify-between gap-2 shrink-0 z-20 shadow-sm">
                        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                            <Star size={16} className="text-yellow-500" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('common.xp')}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-yellow-600">
                                        {personaState.selectedCharacter?.accumulatedXP || 0}
                                    </span>
                                    <span className="text-[11px] text-slate-600">/ 300</span>
                                </div>
                            </div>
                            <div role="progressbar" aria-label={t('common.xp') || 'Experience points'} aria-valuemin={0} aria-valuemax={300} aria-valuenow={personaState.selectedCharacter?.accumulatedXP || 0} className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all motion-reduce:transition-none duration-500"
                                    style={{ width: `${Math.min(100, ((personaState.selectedCharacter?.accumulatedXP || 0) / 300) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                        <button type="button"
                            aria-label={t('common.volume')}
                            data-help-key="persona_auto_read"
                                aria-pressed={personaAutoRead}
                            onClick={() => {
                                const newState = !personaAutoRead;
                                setPersonaAutoRead(newState);
                                if (!newState) stopPlayback();
                            }}
                            className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                personaAutoRead
                                ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                            title={personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on')}
                        >
                            {personaAutoRead ? <Volume2 size={16} className="animate-pulse motion-reduce:animate-none"/> : <VolumeX size={16}/>}
                            <span className="text-xs font-bold hidden sm:inline">{t('persona.auto_read_label')}</span>
                        </button>
                        <button type="button"
                            data-help-key="persona_auto_send"
                                aria-pressed={personaAutoSend}
                            onClick={handleTogglePersonaAutoSend}
                            className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                personaAutoSend
                                ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                            title={personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send')}
                        >
                            <Zap size={16} className={personaAutoSend ? "fill-current" : ""} />
                            <span className="text-xs font-bold hidden sm:inline">{t('persona.auto_send')}</span>
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                        <button type="button"
                            aria-label={t('common.show')}
                            data-help-key="persona_hints_toggle"
                            aria-pressed={showPersonaHints}
                            onClick={handleToggleShowPersonaHints}
                                className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                    !showPersonaHints
                                    ? 'bg-red-50 text-red-600 border-red-200 shadow-inner'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip')}
                            >
                                {showPersonaHints ? <Eye size={16} /> : <EyeOff size={16} />}
                                <span className="text-xs font-bold hidden sm:inline">
                                    {showPersonaHints ? t('persona.hints_on') : t('persona.hints_off')}
                                </span>
                            </button>
                        {(isTeacherMode || studentProjectSettings.allowPersonaFreeResponse) && (
                        <button type="button"
                            aria-label={isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')}
                            data-help-key="persona_response_mode"
                                aria-pressed={isPersonaFreeResponse}
                            onClick={() => {
                                const newMode = !isPersonaFreeResponse;
                                setIsPersonaFreeResponse(newMode);
                                if (!newMode) setShowPersonaHints(true);
                            }}
                            className={`p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${
                                !isPersonaFreeResponse
                                ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                            title={isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')}
                        >
                            {isPersonaFreeResponse ? <MessageSquare size={16} /> : <ListChecks size={16} />}
                            <span className="text-xs font-bold hidden sm:inline">
                                {isPersonaFreeResponse ? t('persona.mode_free_label') : t('persona.mode_mc_label')}
                            </span>
                        </button>
                        )}
                        <button type="button"
                            data-help-key="persona_topic_spark"
                            onClick={handlePersonaTopicSpark}
                            disabled={personaState.isLoading || personaState.isGeneratingTopicSpark || (personaState.topicSparkCount || 0) >= 2}
                            className={`p-2 rounded-lg border shadow-sm transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                (personaState.topicSparkCount || 0) >= 2
                                ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                                : 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                            }`}
                            title={t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', { remaining: 2 - (personaState.topicSparkCount || 0) })}
                            aria-label={t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', { remaining: 2 - (personaState.topicSparkCount || 0) })}
                        >
                            <Lightbulb size={16} className={personaState.isGeneratingTopicSpark ? 'animate-pulse motion-reduce:animate-none' : ''}/>
                        </button>
                        <button type="button"
                            data-help-key="persona_save_chat"
                            onClick={handleSavePersonaChat}
                            disabled={personaState.chatHistory.length === 0}
                            className="p-2 rounded-lg bg-white text-slate-600 border border-slate-400 shadow-sm hover:bg-slate-50 hover:border-indigo-200 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('persona.chat_save')}
                            aria-label={t('persona.chat_save')}
                        >
                            <Save size={16}/>
                        </button>
                        <button type="button"
                            onClick={_openPersonaSummary}
                            disabled={!canGeneratePersonaSummary || personaState.isGeneratingSummary}
                            className="p-2 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 shadow-sm hover:bg-violet-100 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                            title={personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn')}
                            aria-label={personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn')}
                            aria-busy={personaState.isGeneratingSummary ? 'true' : 'false'}
                        >
                            <Sparkles size={16} className={personaState.isGeneratingSummary ? 'animate-pulse motion-reduce:animate-none' : ''}/>
                        </button>
                        <button type="button"
                            aria-label={t('common.check')}
                            data-help-key="persona_conclude"
                            onClick={() => {
                                handleGenerateReflectionPrompt();
                                setIsPersonaReflectionOpen(true);
                            }}
                            disabled={!singleConcludeReady}
                            className={`relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md active:scale-95 transition-all motion-reduce:transition-none text-xs font-bold ${
                                singleConcludeReady
                                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                                : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'
                            }`}
                            title={singleConcludeReady
                                ? t('persona.conclude_tooltip')
                                : `${t('persona.conclude_locked') || 'Keep building rapport to unlock reflection'} (${singleUnlockPct}%)`}
                        >
                            {singleConcludeReady
                                ? <CheckCircle2 size={16}/>
                                : <Lock size={16}/>}
                            <span className="hidden sm:inline">{t('persona.conclude_button')}</span>
                            {!singleConcludeReady && <span className="hidden lg:inline text-[10px] font-black opacity-80">{singleUnlockPct}%</span>}
                            {!singleConcludeReady && (
                                <span className="absolute left-1 right-1 bottom-1 h-1 rounded-full bg-white/70 overflow-hidden">
                                    <span className="block h-full rounded-full bg-indigo-400 transition-all motion-reduce:transition-none duration-500" style={{ width: `${singleUnlockPct}%` }} />
                                </span>
                            )}
                        </button>
                        </div>
                    </div>
                    {(personaState.isGeneratingTopicSpark || personaState.topicSparkError) && (
                        <div className={`shrink-0 border-b px-4 py-2 text-center text-xs ${personaState.topicSparkError ? 'border-red-200 bg-red-50 text-red-800' : 'border-indigo-100 bg-indigo-50 text-indigo-700'}`} role={personaState.topicSparkError ? 'alert' : 'status'} aria-live="polite">
                            {personaState.isGeneratingTopicSpark ? (
                                <span className="inline-flex items-center gap-2"><RefreshCw size={13} className="animate-spin motion-reduce:animate-none" /> {t('persona.topic_spark_generating')}</span>
                            ) : (
                                <span className="inline-flex flex-wrap items-center justify-center gap-2">
                                    {t('persona.topic_spark_error')}
                                    <button type="button" onClick={handlePersonaTopicSpark} disabled={(personaState.topicSparkCount || 0) >= 2} className="rounded border border-red-300 bg-white px-2 py-1 font-bold hover:bg-red-100 disabled:opacity-50">{t('persona.topic_spark_retry')}</button>
                                </span>
                            )}
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar" ref={personaScrollRef} onScroll={(e) => { const el = e.currentTarget; personaScrollRef.current.__alloStickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label={t('a11y.interview_conversation') || 'Interview conversation with character'}>
                        <div role="note" className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">{t('persona.simulation_disclaimer') || 'AI-generated historical simulation. Verify important claims with lesson evidence and trusted sources.'}</div>
                        {(!personaState.chatHistory || personaState.chatHistory.length === 0) && (
                            <div className="mx-auto my-10 max-w-md text-center rounded-2xl border border-dashed border-yellow-200 bg-white/80 px-6 py-8 shadow-sm">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200">
                                    <Quote size={22} />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">
                                    {t('persona.empty_chat_instruction')}
                                </p>
                                {personaState.selectedCharacter?.name && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        {t('persona.character_question_placeholder', { name: personaState.selectedCharacter.name })}
                                    </p>
                                )}
                            </div>
                        )}
                        {(personaState.chatHistory || []).map((msg, idx) => {
                             const isUser = msg.role === 'user';
                             const isMessagePlayingNow = playingContentId === `persona-message-${idx}`;
                             let bubbleClass = 'bg-white text-slate-700 border-slate-200 rounded-bl-none font-serif text-base';
                             let speakerName = isUser ? t('common.you') : (personaState.selectedCharacter?.name || t('common.character'));
                             let avatarUrl = !isUser ? (personaState.avatarUrl || personaState.selectedCharacter?.avatarUrl || null) : null;
                             if (!isUser && msg.speakerName && personaState.selectedCharacters.length > 0) {
                                 speakerName = msg.speakerName;
                                 const charIndex = personaState.selectedCharacters.findIndex(c => c.name === msg.speakerName);
                                 const charData = personaState.selectedCharacters.find(c => c.name === msg.speakerName);
                                 if (charData) avatarUrl = charData.avatarUrl;
                                 if (charIndex === 1) {
                                     bubbleClass = 'bg-rose-50 text-slate-800 border-rose-200 rounded-bl-none border';
                                 } else {
                                     bubbleClass = 'bg-white text-slate-700 border-slate-200 rounded-bl-none border font-serif';
                                 }
                             } else if (isUser) {
                                 bubbleClass = 'bg-indigo-50 text-indigo-900 border-indigo-200 rounded-br-none border';
                             }
                             return (
                             <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                 <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                     {!isUser && avatarUrl && (
                                         <div className="flex-shrink-0 mt-1">
                                             <div className={`w-8 h-8 rounded-full overflow-hidden border shadow-sm bg-white transition-all motion-reduce:transition-none ${isMessagePlayingNow ? 'border-yellow-400 ring-2 ring-yellow-200 shadow-yellow-100' : 'border-slate-400'}`}>
                                                 <img loading="lazy" src={avatarUrl} alt={speakerName} className="w-full h-full object-cover" />
                                             </div>
                                         </div>
                                     )}
                                     <div className={`relative overflow-hidden p-4 rounded-2xl text-sm shadow-sm leading-relaxed transition-all motion-reduce:transition-none ${bubbleClass} ${isMessagePlayingNow ? 'ring-2 ring-yellow-200 border-yellow-300 shadow-md' : ''}`}>
                                         {isMessagePlayingNow && <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 animate-pulse motion-reduce:animate-none" />}
                                         {(() => {
                                             // Keep the English translation OUT of the TTS sentence spans:
                                             // new messages carry it in msg.translation; the split also
                                             // upgrades legacy messages where the model embedded a
                                             // "**English Translation:**" block inside the text.
                                             const _twoLang = String(msg.text || '').split(/\*{0,2}\s*English Translation\s*:?\s*\*{0,2}/i);
                                             const mainText = _twoLang[0].trim() || String(msg.text || '');
                                             const translationText = (msg.translation && String(msg.translation).trim()) || (_twoLang.length > 1 ? _twoLang.slice(1).join(' ').trim() : null) || null;
                                             const paragraphs = mainText.split(/\n{2,}/);
                                             let sentenceCounter = 0;
                                             return (
                                                 <>
                                                     {paragraphs.map((para, pIdx) => {
                                                         const sentences = splitTextToSentences(para);
                                                         if (sentences.length === 0) return null;
                                                         return (
                                                             <p key={pIdx} className="mb-2 last:mb-0">
                                                                 {sentences.map((s, sIdx) => {
                                                                     const currentGlobalIdx = sentenceCounter;
                                                                     sentenceCounter++;
                                                                     const isMessagePlaying = playingContentId === `persona-message-${idx}`;
                                                                     const _activeRange = isMessagePlaying && playbackState.chunkRanges ? playbackState.chunkRanges[playbackState.currentIdx] : null;
                                                                     const _activeSentenceIdx = isMessagePlaying && typeof playbackState.currentSentenceIdx === 'number' ? playbackState.currentSentenceIdx : null;
                                                                     const isActive = isMessagePlaying && (_activeSentenceIdx !== null ? currentGlobalIdx === _activeSentenceIdx : (_activeRange ? (currentGlobalIdx >= _activeRange[0] && currentGlobalIdx < _activeRange[1]) : currentGlobalIdx === playbackState.currentIdx));
                                                                     const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
                                                                     const isHeader = s.trim().startsWith('#') || isHtmlHeader;
                                                                     const cleanText = isHeader ? (isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '')) : s;
                                                                     return (
                                                                         <span
                                                                             key={sIdx}
                                                                             onClick={(e) => {
                                                                                 e.stopPropagation();
                                                                                 handleSpeak(mainText, `persona-message-${idx}`, currentGlobalIdx);
                                                                             }}
                                                                             role="button"
                                                                             tabIndex={0}
                                                                             aria-label={cleanText + '. ' + t('common.click_to_read')}
                                                                             onKeyDown={(e) => {
                                                                                 if (e.key === 'Enter' || e.key === ' ') {
                                                                                     e.preventDefault();
                                                                                     e.currentTarget.click();
                                                                                 }
                                                                             }}
                                                                            className={`transition-colors motion-reduce:transition-none duration-200 rounded px-1 py-0.5 cursor-pointer hover:bg-yellow-100 ${isActive ? 'bg-yellow-200 text-slate-950 shadow-sm ring-1 ring-yellow-400' : ''} ${isHeader ? 'font-bold block mt-1' : ''}`}
                                                                             title={t('common.click_to_read')}
                                                                         >
                                                                             {formatInteractiveText(cleanText)}
                                                                             {" "}
                                                                         </span>
                                                                     );
                                                                 })}
                                                             </p>
                                                         );
                                                     })}
                                                     {!isUser && msg.evidenceNote && (<details className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900"><summary className="cursor-pointer font-bold">{t('persona.evidence_note') || 'Evidence & simulation note'}</summary><p className="mt-1 leading-relaxed">{msg.evidenceNote}</p></details>)}
                                                     {translationText && (
                                                         <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                                                             <div className="flex items-center gap-2 mb-1">
                                                                 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('persona.translation_label') || 'English translation'}</span>
                                                                 <button type="button"
                                                                     aria-label={t('common.volume')}
                                                                     onClick={(e) => {
                                                                         e.stopPropagation();
                                                                         handleSpeak(translationText, `persona-translation-${idx}`, 0);
                                                                     }}
                                                                     className="p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors motion-reduce:transition-none"
                                                                     title={t('common.click_to_read')}
                                                                 >
                                                                     <Volume2 size={12}/>
                                                                 </button>
                                                             </div>
                                                             <p className="text-xs text-slate-500 leading-relaxed italic">{translationText}</p>
                                                         </div>
                                                     )}
                                                 </>
                                             );
                                         })()}
                                     </div>
                                 </div>
                                 <span className={`text-[11px] mt-1 px-1 font-bold uppercase tracking-wider flex items-center gap-1 ${!isUser && avatarUrl ? 'ml-11' : ''} ${isMessagePlayingNow ? 'text-yellow-700' : 'text-slate-600'}`}>
                                     {speakerName}
                                     {isMessagePlayingNow && <Volume2 size={11} className="animate-pulse motion-reduce:animate-none" />}
                                 </span>
                             </div>
                             );
                        })}
                        {personaState.isLoading && (
                            <div className="flex items-start">
                                <div className="flex gap-3 max-w-[85%]">
                                    {personaState.selectedCharacter?.avatarUrl && (
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-yellow-300 ring-2 ring-yellow-100 bg-white shadow-sm">
                                                <img loading="lazy" src={personaState.selectedCharacter.avatarUrl} alt={personaState.selectedCharacter.name} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-white p-3 rounded-2xl border border-yellow-200 rounded-bl-none text-xs text-slate-600 italic flex items-center gap-2 shadow-sm">
                                        <History size={14} className="animate-spin motion-reduce:animate-none text-yellow-600"/>
                                        <span>{t('persona.status_thinking', { name: personaState.selectedCharacter?.name })}</span>
                                        <span className="flex items-center gap-0.5 ml-1" aria-hidden="true">
                                            <span className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse motion-reduce:animate-none"></span>
                                            <span className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse motion-reduce:animate-none" style={{ animationDelay: '120ms' }}></span>
                                            <span className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse motion-reduce:animate-none" style={{ animationDelay: '240ms' }}></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-white border-t border-slate-100 flex flex-col shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        {isPersonaFreeResponse && !showPersonaHints && !personaState.isLoading && (
                            <div className="px-4 pt-2 pb-0 flex justify-center animate-in motion-reduce:animate-none slide-in-from-bottom-2 fade-in">
                                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm transition-colors motion-reduce:transition-none ${!personaTurnHintsViewed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                    {!personaTurnHintsViewed ? t('persona.hard_mode_active') : t('persona.hints_viewed_status')}
                                </span>
                            </div>
                        )}
                        {(showPersonaHints || !isPersonaFreeResponse) && (personaState.suggestions || []).length > 0 && !personaState.isLoading && (
                            <div className={`px-4 pt-3 flex gap-2 ${
                                isPersonaFreeResponse
                                ? 'overflow-x-auto no-scrollbar pb-1'
                                : 'flex-wrap pb-4 justify-center'
                            }`}>
                                {personaState.suggestions.map((q, i) => (
                                    <button type="button"
                                        key={i}
                                        onClick={() => handlePersonaChatSubmit(q, true)}
                                        className={`whitespace-normal text-left px-3 py-2 text-xs font-bold rounded-xl border transition-colors motion-reduce:transition-none shadow-sm ${
                                            isPersonaFreeResponse
                                            ? 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 flex-shrink-0'
                                            : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 w-full sm:w-[48%] py-3 text-sm'
                                        }`}
                                    >
                                        {!isPersonaFreeResponse && <span className="mr-2 opacity-50">{String.fromCharCode(65+i)}.</span>}
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}
                        {!isPersonaFreeResponse && (personaState.suggestions || []).length > 0 && (personaState.suggestions || []).length < 6 && !personaState.isLoading && (
                            <div className="px-4 pb-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600" role="status" aria-live="polite">
                                {personaState.isGeneratingSuggestions ? (
                                    <><RefreshCw size={14} className="animate-spin motion-reduce:animate-none text-indigo-600" /> {t('persona.choices_partial')}</>
                                ) : (
                                    <>
                                        <span>{personaState.suggestionsError ? t('persona.choices_generation_failed') : t('persona.choices_partial')}</span>
                                        {typeof generatePersonaFollowUps === 'function' && (
                                            <button type="button"
                                                onClick={() => generatePersonaFollowUps(personaState.chatHistory, personaState.selectedCharacter, 6)}
                                                className="font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
                                            >
                                                {t('persona.retry_choices')}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {isPersonaFreeResponse && (
                            <div className="p-4 flex gap-2">
                                <input aria-label={t('common.enter_persona_input')}
                                    type="text"
                                    maxLength={2000}
                                    value={personaInput}
                                    onChange={(e) => setPersonaInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !personaState.isLoading && handlePersonaChatSubmit()}
                                    placeholder={t('persona.character_question_placeholder', {name: personaState.selectedCharacter?.name})}
                                    className="flex-grow text-sm p-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none transition-all motion-reduce:transition-none placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                                    autoFocus
                                    disabled={personaState.isLoading}
                                />
                                <button type="button"
                                    aria-label={personaState.isLoading ? t('persona.waiting_for_response') : t('persona.send_character_question', { name: personaState.selectedCharacter?.name || t('persona.character_fallback') })}
                                    aria-busy={personaState.isLoading ? 'true' : 'false'}
                                    onClick={() => handlePersonaChatSubmit()}
                                    disabled={!personaInput.trim() || personaState.isLoading}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-indigo-900 font-bold p-3 rounded-xl transition-colors motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
                                >
                                    {personaState.isLoading ? <RefreshCw size={20} className="animate-spin motion-reduce:animate-none"/> : <Send size={20}/>}
                                </button>
                            </div>
                        )}
                        {!isPersonaFreeResponse && (personaState.suggestions || []).length === 0 && (
                            <div role="status" aria-live="polite" className="p-5 text-center text-slate-600 text-xs flex flex-wrap items-center justify-center gap-2">
                                <RefreshCw size={14} className={(personaState.isLoading || personaState.isGeneratingSuggestions) ? 'animate-spin motion-reduce:animate-none text-indigo-600' : 'text-indigo-600'}/>
                                <span>
                                    {personaState.suggestionsError
                                        ? t('persona.choices_generation_failed')
                                        : (personaState.isLoading || personaState.isGeneratingSuggestions)
                                            ? t('persona.generating_choices')
                                            : t('persona.choices_unavailable')}
                                </span>
                                {!personaState.isLoading && !personaState.isGeneratingSuggestions && typeof generatePersonaFollowUps === 'function' && (
                                    <button type="button"
                                        onClick={() => generatePersonaFollowUps(personaState.chatHistory, personaState.selectedCharacter, 6)}
                                        className="font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
                                    >
                                        {t('persona.retry_choices')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {isPersonaReflectionOpen && (
                            <div
                                ref={personaReflectionDialogRef}
                                data-persona-reflection-dialog
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="persona-reflection-title"
                                tabIndex={-1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape' && !isGradingReflection) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSetIsPersonaReflectionOpenToFalse();
                                    }
                                }}
                                className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col p-8 animate-in motion-reduce:animate-none fade-in duration-300"
                            >
                            {reflectionFeedback ? (
                                <>
                                    <div className="text-center mb-6 relative">
                                        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-in motion-reduce:animate-none zoom-in duration-300">
                                            <Sparkles size={40} className="fill-current" />
                                        </div>
                                        <h2 id="persona-reflection-title" className="text-2xl font-black text-slate-800">{t('persona.reflection_complete') || 'Great Reflection!'}</h2>
                                        <p className="text-slate-600 text-sm">{reflectionFeedback.subjectName}</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-4">
                                        {typeof reflectionFeedback.score === 'number' && (
                                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 text-center">
                                            <div className="text-5xl font-black text-indigo-600 mb-2">{reflectionFeedback.score}<span className="text-2xl text-indigo-400">/100</span></div>
                                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{t('persona.ai_quality_score') || 'AI Reflection Estimate'}</div>
                                        </div>
                                        )}
                                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-center gap-3">
                                            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-md">
                                                <Star size={24} className="fill-current" />
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black text-yellow-600">+{reflectionFeedback.xpEarned} XP</div>
                                                <div className="text-xs text-yellow-700 font-medium">{t('persona.xp_earned') || 'Experience Earned'}</div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <MessageSquare size={12} /> {t('persona.ai_feedback') || 'AI Reflection Feedback'}
                                            </h4>
                                            <p className="mb-2 text-[11px] text-slate-500">{t('persona.ai_feedback_disclaimer') || 'AI-generated feedback may be imperfect; educators should review important conclusions.'}</p>
                                            <div className="text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: (reflectionFeedback.feedback || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') }} />
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <button type="button"
                                            aria-label={t('common.check')}
                                            onClick={_handleCompleteReflection}
                                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 flex items-center justify-center gap-2 text-lg"
                                        >
                                            <CheckCircle2 size={22} /> {t('common.continue') || 'Continue'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-center mb-6 relative">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm">
                                            <PenTool size={32} />
                                        </div>
                                        <h2 id="persona-reflection-title" className="text-2xl font-black text-slate-800">{t('persona.reflection_title')}</h2>
                                        <p className="text-slate-600 text-sm">{t('persona.reflection_subtitle')}</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="space-y-4">
                                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">{t('persona.prompt_label')}</h4>
                                                {isGeneratingReflectionPrompt ? (
                                                    <div role="status" aria-live="polite" className="flex items-center gap-2 text-indigo-600 font-medium animate-pulse motion-reduce:animate-none">
                                                        <RefreshCw size={16} className="animate-spin motion-reduce:animate-none"/> {t('persona.generating_question')}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-700 font-medium">
                                                        {dynamicReflectionQuestion || t('persona.default_reflection_prompt_named', { name: personaState.selectedCharacter?.name || t('persona.character_fallback') })}
                                                    </p>
                                                )}
                                            </div>
                                            <textarea
                                                aria-label={t('persona.reflection_input') || 'Write your reflection'}
                                                value={personaReflectionInput} data-help-key="persona_reflection_input"
                                                onChange={(e) => setPersonaReflectionInput(e.target.value)}
                                                placeholder={t('persona.reflection_placeholder')}
                                                className="w-full h-48 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-600"
                                                disabled={isGradingReflection}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex gap-3">
                                        <button type="button"
                                            aria-label={t('common.refresh')}
                                            onClick={handleSetIsPersonaReflectionOpenToFalse} data-help-key="persona_back_btn"
                                            disabled={isGradingReflection}
                                            className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('persona.back_to_chat')}
                                        </button>
                                        <button type="button" aria-label={t('common.submit_reflection_for_grading')}
                                            onClick={handleSaveReflection} data-help-key="persona_submit_btn"
                                            disabled={!personaReflectionInput.trim() || isGradingReflection}
                                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isGradingReflection ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none"/> : <Sparkles size={18} className="text-yellow-700 fill-current"/>}
                                            {isGradingReflection ? t('persona.status_grading') : t('persona.submit_xp')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                </>
                )}
                {isPersonaSummaryOpen && (
                    <div
                        ref={personaSummaryDialogRef}
                        data-persona-summary-dialog
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="persona-summary-title"
                        tabIndex={-1}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsPersonaSummaryOpen(false);
                            }
                        }}
                        className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
                    >
                        <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-violet-200 bg-white shadow-2xl">
                            <header className="flex items-start gap-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
                                <div className="rounded-full bg-violet-100 p-2 text-violet-700"><Sparkles size={20} /></div>
                                <div className="min-w-0 flex-1">
                                    <h2 id="persona-summary-title" className="text-xl font-black text-slate-900">
                                        {personaSummary?.title || t(personaState.mode === 'panel' ? 'persona.summary.title_panel' : 'persona.summary.title_single')}
                                    </h2>
                                    {personaSummary?.participants?.length > 0 && (
                                        <p className="mt-1 truncate text-xs font-medium text-slate-600">{personaSummary.participants.map(_summaryItemText).filter(Boolean).join(' • ')}</p>
                                    )}
                                </div>
                                <button type="button"
                                    data-persona-summary-initial-focus
                                    autoFocus
                                    onClick={() => setIsPersonaSummaryOpen(false)}
                                    className="rounded-full p-2 text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-50"
                                    aria-label={t('common.close')}
                                >
                                    <X size={20} />
                                </button>
                            </header>
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                                {personaState.isGeneratingSummary ? (
                                    <div role="status" aria-live="polite" className="flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center text-violet-700">
                                        <RefreshCw size={32} className="animate-spin motion-reduce:animate-none" />
                                        <p className="font-bold">{t('persona.summary.generating')}</p>
                                    </div>
                                ) : personaState.personaSummaryError && !personaSummary ? (
                                    <div role="alert" className="mx-auto flex min-h-[16rem] max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
                                        <p className="font-bold">{t('persona.summary.error')}</p>
                                        <button type="button" onClick={_retryPersonaSummary} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800">
                                            <RefreshCw size={16} /> {t('persona.summary.retry')}
                                        </button>
                                    </div>
                                ) : personaSummary ? (
                                    <div className="space-y-5">
                                        {personaState.personaSummaryError && (
                                            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                                <span>{t('persona.summary.refresh_failed')}</span>
                                                <button type="button" onClick={_retryPersonaSummary} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-100">{t('persona.summary.retry')}</button>
                                            </div>
                                        )}
                                        {personaSummary.overview && (
                                            <section aria-labelledby="persona-summary-overview" className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                                                <h3 id="persona-summary-overview" className="mb-2 text-xs font-black uppercase tracking-wider text-violet-700">{t('persona.summary.overview')}</h3>
                                                <p className="leading-relaxed text-slate-700">{personaSummary.overview}</p>
                                            </section>
                                        )}
                                        {Array.isArray(personaSummary.keyInsights) && personaSummary.keyInsights.length > 0 && (
                                            <section aria-labelledby="persona-summary-insights">
                                                <h3 id="persona-summary-insights" className="mb-3 text-sm font-black uppercase tracking-wider text-slate-700">{t('persona.summary.key_insights')}</h3>
                                                <ol className="grid gap-3 md:grid-cols-2">
                                                    {personaSummary.keyInsights.map((item, idx) => {
                                                        const insight = _summaryItemText(item);
                                                        if (!insight) return null;
                                                        return (
                                                            <li key={idx} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                                                                <p className="font-bold leading-relaxed text-slate-800">{insight}</p>
                                                                {item && typeof item === 'object' && item.evidence && (
                                                                    <p className="mt-2 border-l-2 border-indigo-200 pl-3 text-xs leading-relaxed text-slate-600"><span className="font-bold">{t('persona.summary.evidence')}:</span> {item.evidence}</p>
                                                                )}
                                                                {item && typeof item === 'object' && item.confidence != null && (
                                                                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-indigo-600">{t('persona.summary.confidence', { value: item.confidence })}</p>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ol>
                                            </section>
                                        )}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {summarySections.map((section) => (
                                                <section key={section.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-700">{section.title}</h3>
                                                    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
                                                        {section.items.map((item, idx) => <li key={idx}>{item}</li>)}
                                                    </ul>
                                                </section>
                                            ))}
                                        </div>
                                        {personaSummary.verificationNote && (
                                            <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider">{t('persona.summary.verification_note')}</h3>
                                                <p>{personaSummary.verificationNote}</p>
                                            </aside>
                                        )}
                                        {personaSummary.generatedAt && (
                                            <p className="text-right text-[11px] text-slate-500">{t('persona.summary.generated_at', { date: new Date(personaSummary.generatedAt).toLocaleString() })}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 text-center text-slate-600">
                                        <Sparkles size={36} className="text-violet-400" />
                                        <p>{t('persona.summary.empty')}</p>
                                        <button type="button" onClick={_retryPersonaSummary} disabled={!canGeneratePersonaSummary} className="rounded-lg bg-violet-700 px-4 py-2 font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{t('persona.summary.generate_btn')}</button>
                                    </div>
                                )}
                            </div>
                            <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                <button type="button" onClick={() => setIsPersonaSummaryOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                                    {t('persona.summary.back_to_chat')}
                                </button>
                                <button type="button" onClick={handleSavePersonaChat} disabled={(personaState.chatHistory || []).length === 0} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">
                                    <Save size={15} /> {t('persona.chat_save')}
                                </button>
                                {personaSummary && (
                                    <button type="button" onClick={_retryPersonaSummary} disabled={personaState.isGeneratingSummary} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50">
                                        <RefreshCw size={15} /> {t('persona.summary.regenerate')}
                                    </button>
                                )}
                            </footer>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </ErrorBoundary>
  );
}
