/**
 * AlloFlow View - Persona Chat Renderer
 *
 * Extracted from AlloFlowANTI.txt isPersonaChatOpen + ReactDOM.createPortal block.
 * Source range: 898 lines body. Renders the AI-persona dialog interface
 * (interview/panel modes, character columns, harmony meter, chat history,
 * sentence-level TTS playback, free-response/multiple-choice toggle, hints,
 * topic spark, reflection prompt + grading, save chat).
 *
 * The ReactDOM.createPortal wrap stays in host scope; this module exports
 * just the inner <ErrorBoundary>...</ErrorBoundary> JSX.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.PersonaChatView) {
    console.log('[CDN] ViewPersonaChatModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewPersonaChatModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Eye = _lazyIcon('Eye');
  var EyeOff = _lazyIcon('EyeOff');
  var History = _lazyIcon('History');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var Lock = _lazyIcon('Lock');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var Quote = _lazyIcon('Quote');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Save = _lazyIcon('Save');
  var Search = _lazyIcon('Search');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Star = _lazyIcon('Star');
  var Volume2 = _lazyIcon('Volume2');
  var VolumeX = _lazyIcon('VolumeX');
  var X = _lazyIcon('X');
  var Zap = _lazyIcon('Zap');

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
  var studentProjectSettings = props.studentProjectSettings || {};
  var dynamicReflectionQuestion = props.dynamicReflectionQuestion;
  var panelTtsPending = Array.isArray(props.panelTtsPending) ? props.panelTtsPending : [];
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
  var panelChoicePendingRef = React.useRef(false);
  var _personaSummaryOpenState = React.useState(false);
  var isPersonaSummaryOpen = _personaSummaryOpenState[0];
  var setIsPersonaSummaryOpen = _personaSummaryOpenState[1];
  var _summaryRequestPendingState = React.useState(false);
  var summaryRequestPending = _summaryRequestPendingState[0];
  var setSummaryRequestPending = _summaryRequestPendingState[1];
  var summaryRequestPendingRef = React.useRef(false);
  var _reflectionSubmitPendingState = React.useState(false);
  var reflectionSubmitPending = _reflectionSubmitPendingState[0];
  var setReflectionSubmitPending = _reflectionSubmitPendingState[1];
  var reflectionSubmitPendingRef = React.useRef(false);
  var _suggestionsRetryPendingState = React.useState(false);
  var suggestionsRetryPending = _suggestionsRetryPendingState[0];
  var setSuggestionsRetryPending = _suggestionsRetryPendingState[1];
  var suggestionsRetryPendingRef = React.useRef(false);
  var _topicSparkPendingState = React.useState(false);
  var topicSparkPending = _topicSparkPendingState[0];
  var setTopicSparkPending = _topicSparkPendingState[1];
  var topicSparkPendingRef = React.useRef(false);
  var reflectionOpenPendingRef = React.useRef(false);
  var _transcriptSavePendingState = React.useState(false);
  var transcriptSavePending = _transcriptSavePendingState[0];
  var setTranscriptSavePending = _transcriptSavePendingState[1];
  var transcriptSavePendingRef = React.useRef(false);
  var transcriptSaveResetTimerRef = React.useRef(null);
  var resumeActionPendingRef = React.useRef(false);
  var personaReflectionText = typeof personaReflectionInput === 'string' ? personaReflectionInput : '';
  var reflectionBusy = Boolean(isGradingReflection || reflectionSubmitPending);
  var summaryBusy = Boolean(personaState.isGeneratingSummary || summaryRequestPending);
  var _handlePanelChoice = function (option) {
    if (panelChoicePendingRef.current || panelChoicePending || personaState.isLoading || !option || typeof option.text !== 'string' || !option.text.trim()) return;
    panelChoicePendingRef.current = true;
    setPanelChoicePending(true);
    Promise.resolve().then(function () {
      return handlePanelChatSubmit(option.text, true);
    }).catch(function () {}).finally(function () {
      panelChoicePendingRef.current = false;
      setPanelChoicePending(false);
    });
  };
  var _requestPersonaSummary = function (options) {
    if (summaryRequestPendingRef.current || personaState.isGeneratingSummary || typeof handleGeneratePersonaSummary !== 'function') return Promise.resolve(null);
    summaryRequestPendingRef.current = true;
    setSummaryRequestPending(true);
    return Promise.resolve().then(function () {
      return handleGeneratePersonaSummary(options);
    }).catch(function () {}).finally(function () {
      summaryRequestPendingRef.current = false;
      setSummaryRequestPending(false);
    });
  };
  var _openPersonaSummary = function () {
    if (personaDefinitionData && typeof handleSetPersonaDefinitionDataToNull === 'function') handleSetPersonaDefinitionDataToNull();
    setIsPersonaSummaryOpen(true);
    if (!personaState.personaSummary && !summaryBusy) {
      _requestPersonaSummary();
    }
  };
  var _retryPersonaSummary = function () {
    if (summaryBusy || !canGeneratePersonaSummary) return;
    _requestPersonaSummary({
      force: Boolean(personaState.personaSummary)
    });
  };
  var _submitPersonaReflection = function () {
    if (reflectionSubmitPendingRef.current || reflectionBusy || isGeneratingReflectionPrompt || !personaReflectionText.trim() || typeof handleSaveReflection !== 'function') return;
    reflectionSubmitPendingRef.current = true;
    setReflectionSubmitPending(true);
    Promise.resolve().then(function () {
      return handleSaveReflection();
    }).catch(function () {}).finally(function () {
      reflectionSubmitPendingRef.current = false;
      setReflectionSubmitPending(false);
    });
  };
  var _retryPersonaChoices = function (mode) {
    var isPanel = mode === 'panel';
    var isGenerating = isPanel ? personaState.isGeneratingPanelSuggestions : personaState.isGeneratingSuggestions;
    var generator = isPanel ? generatePanelFollowUps : generatePersonaFollowUps;
    if (suggestionsRetryPendingRef.current || personaState.isLoading || isGenerating || typeof generator !== 'function') return;
    suggestionsRetryPendingRef.current = true;
    setSuggestionsRetryPending(true);
    var request = isPanel ? function () {
      return generator(personaState.chatHistory, personaState.selectedCharacters?.[0], personaState.selectedCharacters?.[1]);
    } : function () {
      return generator(personaState.chatHistory, personaState.selectedCharacter, 6);
    };
    Promise.resolve().then(request).catch(function () {}).finally(function () {
      suggestionsRetryPendingRef.current = false;
      setSuggestionsRetryPending(false);
    });
  };
  var _requestPersonaTopicSpark = function () {
    if (topicSparkPendingRef.current || personaState.isLoading || personaState.isGeneratingTopicSpark || Number(personaState.topicSparkCount || 0) >= 2 || typeof handlePersonaTopicSpark !== 'function') return;
    topicSparkPendingRef.current = true;
    setTopicSparkPending(true);
    Promise.resolve().then(function () {
      return handlePersonaTopicSpark();
    }).catch(function () {}).finally(function () {
      topicSparkPendingRef.current = false;
      setTopicSparkPending(false);
    });
  };
  var _openPersonaReflection = function () {
    if (reflectionOpenPendingRef.current || personaState.isLoading || isGeneratingReflectionPrompt || typeof handleGenerateReflectionPrompt !== 'function') return;
    reflectionOpenPendingRef.current = true;
    if (personaDefinitionData && typeof handleSetPersonaDefinitionDataToNull === 'function') handleSetPersonaDefinitionDataToNull();
    setIsPersonaReflectionOpen(true);
    Promise.resolve().then(function () {
      return handleGenerateReflectionPrompt();
    }).catch(function () {}).finally(function () {
      reflectionOpenPendingRef.current = false;
    });
  };
  var _savePersonaTranscript = function () {
    if (transcriptSavePendingRef.current || personaState.isLoading || !(personaState.chatHistory || []).length || typeof handleSavePersonaChat !== 'function') return;
    transcriptSavePendingRef.current = true;
    setTranscriptSavePending(true);
    Promise.resolve().then(function () {
      return handleSavePersonaChat();
    }).catch(function () {}).finally(function () {
      if (transcriptSaveResetTimerRef.current) window.clearTimeout(transcriptSaveResetTimerRef.current);
      transcriptSaveResetTimerRef.current = window.setTimeout(function () {
        transcriptSaveResetTimerRef.current = null;
        transcriptSavePendingRef.current = false;
        setTranscriptSavePending(false);
      }, 500);
    });
  };
  var personaCloseHandlerRef = React.useRef(handleClosePersonaChat);
  personaCloseHandlerRef.current = handleClosePersonaChat;

  // WCAG 2.4.3 / 2.1.1: contain focus in the modal, support Escape,
  // focus the close control on entry, and restore the invoking control.
  React.useEffect(function () {
    return function () {
      if (transcriptSaveResetTimerRef.current) window.clearTimeout(transcriptSaveResetTimerRef.current);
      transcriptSaveResetTimerRef.current = null;
      transcriptSavePendingRef.current = false;
    };
  }, []);
  React.useEffect(function () {
    var dialog = personaDialogRef.current;
    if (!dialog) return undefined;
    personaPreviousFocusRef.current = document.activeElement;
    var focusTimer = window.setTimeout(function () {
      var initial = dialog.querySelector('[data-persona-initial-focus]');
      if (initial && typeof initial.focus === 'function') initial.focus();else dialog.focus();
    }, 0);
    var focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var handleDialogKeyDown = function (event) {
      if (event.isComposing || event.nativeEvent && event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        if (event.target && typeof event.target.closest === 'function' && event.target.closest('[data-persona-definition-dialog], [data-persona-reflection-dialog], [data-persona-summary-dialog]')) {
          return;
        }
        event.preventDefault();
        personaCloseHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      var scope = dialog.querySelector('[data-persona-summary-dialog]') || dialog.querySelector('[data-persona-reflection-dialog]') || dialog.querySelector('[data-persona-definition-dialog]') || dialog;
      var focusable = Array.prototype.filter.call(scope.querySelectorAll(focusableSelector), function (element) {
        return element.getAttribute('aria-hidden') !== 'true' && element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('inert') && (element.offsetParent !== null || element === document.activeElement);
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
      if (initial && typeof initial.focus === 'function') initial.focus();else dialog.focus();
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
      if (initial && typeof initial.focus === 'function') initial.focus();else dialog.focus();
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
  var _personaSnapshotResourceId = generatedContent && generatedContent.type === 'persona' ? generatedContent.id : null;
  var _hashPersonaScope = function (value) {
    var hash = 2166136261;
    String(value || '').split('').forEach(function (ch) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });
    return 'u' + (hash >>> 0).toString(36);
  };
  var _personaSnapshotRawStudentId = typeof studentNickname === 'string' && studentNickname.trim() ? studentNickname.trim() : isTeacherMode ? 'teacher' : null;
  var _personaSnapshotStudentId = _personaSnapshotRawStudentId ? _hashPersonaScope(_personaSnapshotRawStudentId) : null;
  var _personaRetentionDays = 14;
  try {
    var _storedPersonaRetentionRaw = localStorage.getItem('allo_persona_resume_days');
    var _storedPersonaRetention = _storedPersonaRetentionRaw == null || String(_storedPersonaRetentionRaw).trim() === '' ? 14 : Number(_storedPersonaRetentionRaw);
    _personaRetentionDays = Number.isFinite(_storedPersonaRetention) && [0, 7, 14, 30].includes(_storedPersonaRetention) ? _storedPersonaRetention : 14;
  } catch (_) {}
  var _personaSnapshotEnabled = Boolean(_personaSnapshotResourceId && _personaSnapshotStudentId && _personaRetentionDays > 0);
  var _personaSnapshotEnabledRef = React.useRef(_personaSnapshotEnabled);
  _personaSnapshotEnabledRef.current = _personaSnapshotEnabled;
  var _personaSnapshotLoadingRef = React.useRef(Boolean(personaState.isLoading));
  _personaSnapshotLoadingRef.current = Boolean(personaState.isLoading);
  var _personaSnapshotScope = [appId || 'app', _personaSnapshotResourceId || 'no-resource', _personaSnapshotStudentId || 'disabled'].map(function (value) {
    return String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  }).join(':');
  var _personaSnapshotKey = ('active:' + _personaSnapshotScope).slice(0, 500);
  var _personaSnapshotKeyRef = React.useRef(_personaSnapshotKey);
  _personaSnapshotKeyRef.current = _personaSnapshotKey;
  var _dsResumeState = React.useState(null);
  var personaResumeOffer = _dsResumeState[0];
  var setPersonaResumeOffer = _dsResumeState[1];
  var _dsCheckedKeyRef = React.useRef(null);
  var _dsSaveTimerRef = React.useRef(null);
  var _ensureDeviceStorage = function () {
    if (!window.__alloDeviceStoragePromise) {
      window.__alloDeviceStoragePromise = window.alloDeviceStorage ? Promise.resolve(window.alloDeviceStorage) : new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds1';
        s.onload = function () {
          if (window.alloDeviceStorage) resolve(window.alloDeviceStorage);else reject(new Error('device storage module missing after load'));
        };
        s.onerror = function () {
          reject(new Error('device storage module failed to load'));
        };
        document.head.appendChild(s);
      });
    }
    return window.__alloDeviceStoragePromise.then(function (ds) {
      return ds.ready().then(function () {
        return ds;
      });
    }).catch(function (error) {
      window.__alloDeviceStoragePromise = null;
      throw error;
    });
  };
  var _clearPersonaSnapshot = function (keyOverride) {
    var snapshotKeyToClear = typeof keyOverride === 'string' && keyOverride ? keyOverride : _personaSnapshotKey;
    if (!snapshotKeyToClear) return;
    _ensureDeviceStorage().then(function (ds) {
      return ds.remove('persona_sessions', snapshotKeyToClear);
    }).catch(function () {});
  };
  var _boundedSnapshotText = function (value, limit) {
    if (typeof value !== 'string') return '';
    var text = value.trim();
    return text.length > limit ? text.slice(0, limit) : text;
  };
  var _boundedSnapshotNumber = function (value, min, max, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  };
  var _sanitizeSnapshotCharacter = function (character) {
    if (!character || typeof character !== 'object' || Array.isArray(character)) return null;
    var requestedName = _boundedSnapshotText(character.name, 120);
    var requestedId = character.id == null ? '' : _boundedSnapshotText(String(character.id), 120);
    if (!requestedName) return null;
    // Device storage is learner-controlled. Rehydrate identity, prompt metadata,
    // voice, and teacher guardrails only from the currently active resource.
    var authoritativeCandidates = generatedContent && Array.isArray(generatedContent.data) ? generatedContent.data : [];
    var matchingCharacters = authoritativeCandidates.filter(function (candidate) {
      return candidate && typeof candidate.name === 'string' && candidate.name.trim().toLocaleLowerCase() === requestedName.toLocaleLowerCase();
    });
    var authoritativeCharacter = requestedId ? matchingCharacters.find(function (candidate) {
      return candidate.id != null && String(candidate.id) === requestedId;
    }) : matchingCharacters.length === 1 ? matchingCharacters[0] : null;
    if (!authoritativeCharacter) return null;
    var name = _boundedSnapshotText(authoritativeCharacter.name, 120);
    var avatarUrl = typeof authoritativeCharacter.avatarUrl === 'string' && authoritativeCharacter.avatarUrl.length < 300000 ? authoritativeCharacter.avatarUrl : null;
    var resumedQuestCompletion = new Map();
    (Array.isArray(character.quests) ? character.quests : []).slice(0, 6).forEach(function (quest, index) {
      if (!quest || typeof quest !== 'object' || Array.isArray(quest)) return;
      var id = _boundedSnapshotText(String(quest.id == null ? 'q' + (index + 1) : quest.id), 80);
      if (id) resumedQuestCompletion.set(id, quest.isCompleted === true);
    });
    var quests = (Array.isArray(authoritativeCharacter.quests) ? authoritativeCharacter.quests : []).slice(0, 6).reduce(function (list, quest, index) {
      if (!quest || typeof quest !== 'object' || Array.isArray(quest)) return list;
      var id = _boundedSnapshotText(String(quest.id == null ? 'q' + (index + 1) : quest.id), 80);
      var text = _boundedSnapshotText(quest.text, 500);
      if (!text) return list;
      list.push({
        id: id,
        text: text,
        difficulty: _boundedSnapshotNumber(quest.difficulty, 0, 100, 20),
        isCompleted: quest.isCompleted === true || resumedQuestCompletion.get(id) === true
      });
      return list;
    }, []);
    var suggestedQuestions = (Array.isArray(authoritativeCharacter.suggestedQuestions) ? authoritativeCharacter.suggestedQuestions : []).slice(0, 6).reduce(function (list, item) {
      var text = _boundedSnapshotText(typeof item === 'string' ? item : item && item.text, 500);
      if (!text) return list;
      list.push(typeof item === 'object' && item ? {
        text: text,
        tier: ['neutral', 'good', 'poor'].includes(item.tier) ? item.tier : 'neutral'
      } : text);
      return list;
    }, []);
    return {
      id: authoritativeCharacter.id == null ? undefined : _boundedSnapshotText(String(authoritativeCharacter.id), 120),
      name: name,
      role: _boundedSnapshotText(authoritativeCharacter.role, 160) || 'Historical perspective',
      year: _boundedSnapshotText(String(authoritativeCharacter.year == null ? 'Unknown era' : authoritativeCharacter.year), 80),
      nationality: _boundedSnapshotText(authoritativeCharacter.nationality, 160),
      context: _boundedSnapshotText(authoritativeCharacter.context, 2000),
      visualDescription: _boundedSnapshotText(authoritativeCharacter.visualDescription, 2500),
      artStyle: _boundedSnapshotText(authoritativeCharacter.artStyle, 500),
      greeting: _boundedSnapshotText(authoritativeCharacter.greeting, 1000) || 'Hello, I am ' + name + '.',
      voice: _boundedSnapshotText(authoritativeCharacter.voice, 80),
      voiceProfile: _boundedSnapshotText(authoritativeCharacter.voiceProfile, 1200),
      guardrails: _boundedSnapshotText(authoritativeCharacter.guardrails, 4000),
      guardrailsSource: authoritativeCharacter.guardrailsSource === 'teacher' ? 'teacher' : 'system',
      suggestedQuestions: suggestedQuestions,
      quests: quests,
      initialRapport: _boundedSnapshotNumber(authoritativeCharacter.initialRapport, 0, 100, 10),
      rapport: _boundedSnapshotNumber(character.rapport, 0, 100, _boundedSnapshotNumber(authoritativeCharacter.rapport ?? authoritativeCharacter.initialRapport, 0, 100, 10)),
      accumulatedXP: _boundedSnapshotNumber(character.accumulatedXP, 0, 300, _boundedSnapshotNumber(authoritativeCharacter.accumulatedXP, 0, 300, 0)),
      avatarUrl: avatarUrl
    };
  };
  var _normalizePersonaResumeSnapshot = function (snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || !snapshot.state || typeof snapshot.state !== 'object' || Array.isArray(snapshot.state)) return null;
    var rawState = snapshot.state;
    var chatHistory = (Array.isArray(rawState.chatHistory) ? rawState.chatHistory : []).slice(-80).reduce(function (list, message) {
      if (!message || typeof message !== 'object' || Array.isArray(message) || !['user', 'model'].includes(message.role)) return list;
      var text = _boundedSnapshotText(message.text, 12000);
      if (!text) return list;
      var normalized = {
        role: message.role,
        text: text
      };
      var speakerName = _boundedSnapshotText(message.speakerName, 120);
      var translation = _boundedSnapshotText(message.translation, 12000);
      var evidenceNote = _boundedSnapshotText(message.evidenceNote, 4000);
      if (speakerName) normalized.speakerName = speakerName;
      if (translation) normalized.translation = translation;
      if (evidenceNote) normalized.evidenceNote = evidenceNote;
      list.push(normalized);
      return list;
    }, []);
    // A device can close while a response is in flight. Never restore a user
    // turn that has no following model response as if it were completed.
    while (chatHistory.length && chatHistory[chatHistory.length - 1].role === 'user') chatHistory.pop();
    if (chatHistory.length < 2) return null;
    var selectedCharacters = (Array.isArray(rawState.selectedCharacters) ? rawState.selectedCharacters : []).slice(0, 2).map(_sanitizeSnapshotCharacter).filter(Boolean);
    var selectedCharacter = _sanitizeSnapshotCharacter(rawState.selectedCharacter);
    if (!['single', 'panel'].includes(rawState.mode)) return null;
    if (rawState.mode === 'panel' && selectedCharacters.length !== 2) return null;
    if (rawState.mode === 'single' && !selectedCharacter) return null;
    var mode = rawState.mode;
    var suggestions = (Array.isArray(rawState.suggestions) ? rawState.suggestions : []).slice(0, 6).map(function (item) {
      return _boundedSnapshotText(typeof item === 'string' ? item : item && item.text, 500);
    }).filter(Boolean);
    var panelSuggestions = (Array.isArray(rawState.panelSuggestions) ? rawState.panelSuggestions : []).slice(0, 6).reduce(function (list, item) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return list;
      var text = _boundedSnapshotText(item.text, 500);
      if (text) list.push({
        text: text,
        tier: ['neutral', 'good', 'poor'].includes(item.tier) ? item.tier : 'neutral'
      });
      return list;
    }, []);
    return {
      ...snapshot,
      state: {
        mode: mode,
        selectedCharacter: selectedCharacter,
        selectedCharacters: selectedCharacters,
        chatHistory: chatHistory,
        harmonyScore: _boundedSnapshotNumber(rawState.harmonyScore, 0, 100, 10),
        earnedBadges: (Array.isArray(rawState.earnedBadges) ? rawState.earnedBadges : []).slice(0, 20).map(function (badge) {
          return _boundedSnapshotText(badge, 80);
        }).filter(Boolean),
        topicSparkCount: _boundedSnapshotNumber(rawState.topicSparkCount, 0, 2, 0),
        suggestions: suggestions,
        panelSuggestions: panelSuggestions,
        avatarUrl: mode === 'single' && selectedCharacter ? selectedCharacter.avatarUrl : null
      }
    };
  };
  var _dsChatLen = (personaState.chatHistory || []).length;
  React.useEffect(function () {
    if (!_personaSnapshotEnabled) {
      setPersonaResumeOffer(null);
      if (_personaRetentionDays === 0 && _personaSnapshotResourceId && _personaSnapshotStudentId) _clearPersonaSnapshot(_personaSnapshotKey);
      return undefined;
    }
    var cancelled = false;
    var requestedKey = _personaSnapshotKey;
    _dsCheckedKeyRef.current = _personaSnapshotKey;
    setPersonaResumeOffer(null);
    var mountMsgs = _dsChatLen;
    _ensureDeviceStorage().then(function (ds) {
      // v1 used one global key for every resource/student. Remove that unsafe
      // legacy record before looking up the scoped v2 snapshot.
      return Promise.resolve(ds.remove('persona_sessions', 'active')).catch(function () {}).then(function () {
        return ds.get('persona_sessions', _personaSnapshotKey);
      });
    }).then(function (snap) {
      if (cancelled || _dsCheckedKeyRef.current !== requestedKey) return;
      var savedTime = snap && Date.parse(snap.savedAt);
      var isExpired = !Number.isFinite(savedTime) || Date.now() - savedTime > _personaRetentionDays * 86400000;
      if (isExpired) {
        _clearPersonaSnapshot();
        return;
      }
      if (!snap || snap.appId !== (appId || null) || snap.resourceId !== _personaSnapshotResourceId || snap.studentId !== _personaSnapshotStudentId) {
        _clearPersonaSnapshot();
        return;
      }
      var normalizedSnapshot = _normalizePersonaResumeSnapshot(snap);
      if (!normalizedSnapshot) {
        _clearPersonaSnapshot();
        return;
      }
      if (normalizedSnapshot.state.chatHistory.length > mountMsgs) setPersonaResumeOffer(normalizedSnapshot);
    }).catch(function () {});
    return function () {
      cancelled = true;
    };
  }, [_personaSnapshotKey]);
  var _dsTopicSparkCount = _boundedSnapshotNumber(personaState.topicSparkCount, 0, 2, 0);
  var _dsSuggestionFingerprint = '';
  try {
    _dsSuggestionFingerprint = JSON.stringify([(Array.isArray(personaState.suggestions) ? personaState.suggestions : []).slice(0, 6), (Array.isArray(personaState.panelSuggestions) ? personaState.panelSuggestions : []).slice(0, 6)]).slice(0, 12000);
  } catch (_) {}
  var _dsPersistenceFingerprint = '';
  try {
    _dsPersistenceFingerprint = _hashPersonaScope(JSON.stringify({
      mode: personaState.mode,
      selectedCharacter: personaState.selectedCharacter ? {
        id: personaState.selectedCharacter.id,
        name: personaState.selectedCharacter.name,
        rapport: personaState.selectedCharacter.rapport,
        accumulatedXP: personaState.selectedCharacter.accumulatedXP,
        quests: (personaState.selectedCharacter.quests || []).slice(0, 6).map(function (quest) {
          return [quest && quest.id, quest && quest.isCompleted];
        })
      } : null,
      selectedCharacters: (personaState.selectedCharacters || []).slice(0, 2).map(function (character) {
        return [character && character.id, character && character.name, character && character.rapport, character && character.accumulatedXP, (character && character.quests || []).slice(0, 6).map(function (quest) {
          return [quest && quest.id, quest && quest.isCompleted];
        })];
      }),
      chatHistory: (personaState.chatHistory || []).slice(-80).map(function (message) {
        return [message && message.role, _boundedSnapshotText(message && message.speakerName, 120), _boundedSnapshotText(message && message.text, 12000), _boundedSnapshotText(message && message.translation, 12000), _boundedSnapshotText(message && message.evidenceNote, 4000)];
      }),
      earnedBadges: (personaState.earnedBadges || []).slice(0, 20),
      avatarUrl: typeof personaState.avatarUrl === 'string' ? _hashPersonaScope(personaState.avatarUrl) : ''
    }));
  } catch (_) {}
  React.useEffect(function () {
    if (_dsSaveTimerRef.current) {
      clearTimeout(_dsSaveTimerRef.current);
      _dsSaveTimerRef.current = null;
    }
    if (!_personaSnapshotEnabled || personaState.isLoading || _dsChatLen < 2 || personaResumeOffer) return undefined;
    var st = personaState;
    var scheduledSnapshotKey = _personaSnapshotKey;
    _dsSaveTimerRef.current = setTimeout(function () {
      _dsSaveTimerRef.current = null;
      if (!_personaSnapshotEnabledRef.current || _personaSnapshotLoadingRef.current || _personaSnapshotKeyRef.current !== scheduledSnapshotKey) return;
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
            topicSparkCount: _boundedSnapshotNumber(st.topicSparkCount, 0, 2, 0),
            suggestions: st.suggestions || [],
            panelSuggestions: st.panelSuggestions || [],
            avatarUrl: avatarOk ? st.avatarUrl : null
          }
        }));
      } catch (_) {
        return;
      }
      var serializedSnapshot = '';
      try {
        serializedSnapshot = JSON.stringify(snap);
      } catch (_) {
        return;
      }
      if (serializedSnapshot.length > 750000) {
        _clearPersonaSnapshot();
        return;
      }
      _ensureDeviceStorage().then(function (ds) {
        if (!_personaSnapshotEnabledRef.current || _personaSnapshotLoadingRef.current || _personaSnapshotKeyRef.current !== scheduledSnapshotKey) return;
        return ds.set('persona_sessions', _personaSnapshotKey, snap);
      }).catch(function () {});
    }, 1500);
    return function () {
      if (_dsSaveTimerRef.current) clearTimeout(_dsSaveTimerRef.current);
      _dsSaveTimerRef.current = null;
    };
  }, [_personaSnapshotKey, _personaSnapshotEnabled, _personaRetentionDays, personaState.isLoading, _dsChatLen, personaState.harmonyScore, (personaState.earnedBadges || []).length, _dsTopicSparkCount, _dsSuggestionFingerprint, _dsPersistenceFingerprint, !!personaResumeOffer]);
  var _resumeSnapshotName = personaResumeOffer ? personaResumeOffer.state.selectedCharacter && personaResumeOffer.state.selectedCharacter.name || (personaResumeOffer.state.selectedCharacters || []).map(function (c) {
    return c && c.name;
  }).filter(Boolean).join(' & ') || 'your character' : null;
  var _handleResumeSnapshot = function () {
    if (resumeActionPendingRef.current) return;
    resumeActionPendingRef.current = true;
    var snap = personaResumeOffer;
    if (!snap || snap.appId !== (appId || null) || snap.resourceId !== _personaSnapshotResourceId || snap.studentId !== _personaSnapshotStudentId) {
      _clearPersonaSnapshot();
      setPersonaResumeOffer(null);
      return;
    }
    if (typeof stopPlayback === 'function') stopPlayback();
    if (typeof setPersonaAutoRead === 'function') setPersonaAutoRead(false);
    setPersonaState(function (prev) {
      return {
        ...prev,
        ...snap.state,
        isLoading: false,
        isImageLoading: false,
        avatarGenerationFailed: false,
        isGeneratingSuggestions: false,
        suggestionsError: null,
        isGeneratingPanelSuggestions: false,
        panelSuggestionsError: null,
        isGeneratingTopicSpark: false,
        topicSparkError: null,
        isGeneratingSummary: false,
        personaSummary: null,
        personaSummaryError: null,
        showReflection: false,
        reflectionText: '',
        reflectionSubmitted: false
      };
    });
    setPersonaResumeOffer(null);
  };
  var _handleDiscardSnapshot = function () {
    if (resumeActionPendingRef.current) return;
    resumeActionPendingRef.current = true;
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
  // The final numeric segment remains the transcript index when playback IDs
  // are generation-scoped to prevent stale TTS callbacks.
  var activePersonaMessageMatch = typeof playingContentId === 'string' ? playingContentId.match(/^persona-message-(?:.*-)?(\d+)$/) : null;
  var activePersonaMessageIndex = activePersonaMessageMatch ? parseInt(activePersonaMessageMatch[1], 10) : -1;
  var _isPersonaMessagePlaying = function (messageIndex) {
    return activePersonaMessageIndex === messageIndex;
  };
  var personaChatHistory = Array.isArray(personaState.chatHistory) ? personaState.chatHistory : [];
  var personaDisplayStartIndex = Math.max(0, personaChatHistory.length - 160);
  var personaDisplayHistory = personaChatHistory.slice(personaDisplayStartIndex);
  var personaHiddenMessageCount = personaDisplayStartIndex;
  var activePersonaMessage = activePersonaMessageIndex >= 0 ? (personaState.chatHistory || [])[activePersonaMessageIndex] : null;
  var activeSpeakerName = activePersonaMessage && activePersonaMessage.role !== 'user' ? activePersonaMessage.speakerName || personaState.selectedCharacter?.name || null : null;
  var panelTotalXp = _boundedSnapshotNumber(personaState.selectedCharacters?.[0]?.accumulatedXP, 0, 300, 0) + _boundedSnapshotNumber(personaState.selectedCharacters?.[1]?.accumulatedXP, 0, 300, 0);
  var panelHarmonyScore = _boundedSnapshotNumber(personaState.harmonyScore, 0, 100, 0);
  var panelConcludeReady = panelHarmonyScore >= 50 || panelTotalXp >= 100;
  var panelUnlockPct = Math.min(100, Math.round(Math.max(panelHarmonyScore / 50 * 100, panelTotalXp / 100 * 100)));
  var singleRapport = _boundedSnapshotNumber(personaState.selectedCharacter?.rapport ?? personaState.selectedCharacter?.initialRapport, 0, 100, 0);
  var singleXp = _boundedSnapshotNumber(personaState.selectedCharacter?.accumulatedXP, 0, 300, 0);
  var singleConcludeReady = singleRapport >= 50 || singleXp >= 100;
  var singleUnlockPct = Math.min(100, Math.round(Math.max(singleRapport / 50 * 100, singleXp / 100 * 100)));
  var summaryHistory = Array.isArray(personaState.chatHistory) ? personaState.chatHistory : [];
  var summaryLastUserIndex = -1;
  var summaryLastModelIndex = -1;
  summaryHistory.forEach(function (message, index) {
    if (message && message.role === 'user') summaryLastUserIndex = index;
    if (message && message.role === 'model') summaryLastModelIndex = index;
  });
  var canGeneratePersonaSummary = !personaState.isLoading && summaryLastUserIndex >= 0 && summaryLastModelIndex > summaryLastUserIndex;
  var personaSummary = personaState.personaSummary && typeof personaState.personaSummary === 'object' && !Array.isArray(personaState.personaSummary) ? personaState.personaSummary : null;
  var _boundedDisplayText = function (value, limit) {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    var text = String(value).trim();
    if (!text) return '';
    return text.length > limit ? text.slice(0, Math.max(1, limit - 1)) + '…' : text;
  };
  var _summaryItemText = function (item) {
    if (typeof item === 'string' || typeof item === 'number') return _boundedDisplayText(item, 2000);
    if (!item || typeof item !== 'object') return '';
    return _boundedDisplayText(item.text || item.question || item.step || item.strength || item.insight || item.name, 2000);
  };
  var _summaryList = function (value) {
    return Array.isArray(value) ? value.slice(0, 20).map(_summaryItemText).filter(Boolean) : [];
  };
  var summaryTitle = _boundedDisplayText(personaSummary?.title, 240) || t(personaState.mode === 'panel' ? 'persona.summary.title_panel' : 'persona.summary.title_single');
  var summaryParticipants = personaSummary && Array.isArray(personaSummary.participants) ? personaSummary.participants.slice(0, 8).map(_summaryItemText).filter(Boolean).join(' • ') : '';
  var summaryOverview = _boundedDisplayText(personaSummary?.overview, 12000);
  var summaryInsights = personaSummary && Array.isArray(personaSummary.keyInsights) ? personaSummary.keyInsights.slice(0, 20).reduce(function (list, item) {
    var text = _summaryItemText(item);
    if (!text) return list;
    list.push({
      text: text,
      evidence: item && typeof item === 'object' ? _boundedDisplayText(item.evidence, 4000) : '',
      confidence: item && typeof item === 'object' ? _boundedDisplayText(item.confidence, 80) : ''
    });
    return list;
  }, []) : [];
  var summaryVerificationNote = _boundedDisplayText(personaSummary?.verificationNote, 8000);
  var summaryGeneratedAtLabel = '';
  if (personaSummary && (typeof personaSummary.generatedAt === 'string' || typeof personaSummary.generatedAt === 'number')) {
    var summaryGeneratedAtMs = Date.parse(String(personaSummary.generatedAt));
    if (Number.isFinite(summaryGeneratedAtMs)) summaryGeneratedAtLabel = new Date(summaryGeneratedAtMs).toLocaleString();
  }
  var summarySections = personaSummary ? [{
    key: 'agreements',
    title: t('persona.summary.agreements'),
    items: _summaryList(personaSummary.areasOfAgreement)
  }, {
    key: 'disagreements',
    title: t('persona.summary.disagreements'),
    items: _summaryList(personaSummary.areasOfDisagreement)
  }, {
    key: 'questions',
    title: t('persona.summary.unanswered_questions'),
    items: _summaryList(personaSummary.unansweredQuestions)
  }, {
    key: 'strengths',
    title: t('persona.summary.student_strengths'),
    items: _summaryList(personaSummary.studentStrengths)
  }, {
    key: 'next',
    title: t('persona.summary.next_steps'),
    items: _summaryList(personaSummary.nextSteps)
  }].filter(function (section) {
    return section.items.length > 0;
  }) : [];
  var hasRenderableSummaryContent = Boolean(summaryOverview || summaryInsights.length || summarySections.length || summaryVerificationNote);
  var reflectionFeedbackData = reflectionFeedback && typeof reflectionFeedback === 'object' && !Array.isArray(reflectionFeedback) ? reflectionFeedback : null;
  var reflectionFeedbackText = _boundedDisplayText(reflectionFeedbackData?.feedback, 12000);
  var reflectionFeedbackSubject = _boundedDisplayText(reflectionFeedbackData?.subjectName, 240);
  var reflectionFeedbackScore = reflectionFeedbackData && Number.isFinite(Number(reflectionFeedbackData.score)) ? _boundedSnapshotNumber(reflectionFeedbackData.score, 0, 100, 0) : null;
  var reflectionFeedbackXp = reflectionFeedbackData ? _boundedSnapshotNumber(reflectionFeedbackData.xpEarned, 0, 300, 0) : 0;
  var hasRenderableReflectionFeedback = Boolean(reflectionFeedbackData && (reflectionFeedbackText || reflectionFeedbackScore !== null));
  var topicSparkCount = _boundedSnapshotNumber(personaState.topicSparkCount, 0, 2, 0);
  var topicSparkRemaining = Math.max(0, 2 - topicSparkCount);
  return /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: t('persona.interface_error')
  }, /*#__PURE__*/React.createElement("div", {
    className: `allo-docsuite fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-1 sm:p-4 animate-in motion-reduce:animate-none fade-in duration-300 theme-${theme}`,
    ref: personaDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "persona-chat-title",
    tabIndex: -1,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    id: "persona-chat-title",
    className: "sr-only"
  }, personaState.mode === 'panel' ? t('persona.panel_header') || 'Panel interview' : t('persona.interview_title') || 'Character interview'), personaResumeOffer && /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-live": "polite",
    "aria-atomic": "true",
    "aria-label": t('persona.resume_title') || 'Resume saved interview',
    className: "absolute top-4 left-1/2 -translate-x-1/2 z-[10000] max-w-[94%] bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-xl shadow-2xl px-4 py-2.5 flex flex-wrap items-center gap-3 animate-in motion-reduce:animate-none slide-in-from-top-2 duration-300"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, "💾 ", (t('persona.resume_prompt') || 'Pick up your earlier interview with {name}?').replace('{name}', _resumeSnapshotName), /*#__PURE__*/React.createElement("span", {
    className: "opacity-70 ml-1 text-xs"
  }, "(", (personaResumeOffer.state.chatHistory || []).length, " ", t('persona.resume_messages'), personaResumeOffer.savedAt ? ', ' + new Date(personaResumeOffer.savedAt).toLocaleString() : '', " — ", t('persona.resume_device_note'), "; ", t('persona.resume_recent_limit', {
    count: 80
  }), ")")), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2 ml-auto"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _handleResumeSnapshot,
    className: "text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none"
  }, t('persona.resume_btn') || 'Resume'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _handleDiscardSnapshot,
    className: "text-xs font-bold bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none"
  }, t('persona.resume_discard_btn') || 'Discard'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-7xl relative border-2 sm:border-4 border-yellow-200 overflow-hidden flex flex-col md:flex-row h-[calc(100dvh-0.5rem)] sm:h-[90vh] md:h-[85vh]"
  }, personaState.mode === 'panel' ? /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 w-full h-full flex flex-col overflow-hidden relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 p-4 border-b border-indigo-100 bg-white z-20 relative flex justify-center items-center shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-4 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-black text-indigo-900 text-lg uppercase tracking-tight hidden md:block"
  }, t('persona.panel_header')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 px-2 py-1 rounded-lg border border-yellow-200 hidden md:flex"
  }, /*#__PURE__*/React.createElement(Star, {
    size: 14,
    className: "text-yellow-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-yellow-600"
  }, panelTotalXp), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600"
  }, t('common.xp')))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-lg px-10 sm:px-12 md:px-0 transition-all motion-reduce:transition-none duration-500"
  }, /*#__PURE__*/React.createElement(HarmonyMeter, {
    score: panelHarmonyScore
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "persona_close",
    "data-help-ignore": true,
    "data-persona-initial-focus": true,
    onClick: _handleCloseAndClearSnapshot,
    className: "absolute right-4 p-2 text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors motion-reduce:transition-none",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 px-4 py-2 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on'),
    onClick: () => {
      const newState = !personaAutoRead;
      setPersonaAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${personaAutoRead ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on'),
    "data-help-key": "persona_auto_read",
    "aria-pressed": personaAutoRead
  }, personaAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "animate-pulse motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_read_label'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "persona_auto_send",
    "aria-label": personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send'),
    "aria-pressed": personaAutoSend,
    onClick: handleTogglePersonaAutoSend,
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${personaAutoSend ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send')
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 16,
    className: personaAutoSend ? "fill-current" : ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_send'))), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-slate-300 mx-1"
  }), isPersonaFreeResponse && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip'),
    "data-help-key": "persona_show_hints",
    "aria-pressed": showPersonaHints,
    onClick: handleToggleShowPersonaHints,
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${!showPersonaHints ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip')
  }, showPersonaHints ? /*#__PURE__*/React.createElement(Eye, {
    size: 16
  }) : /*#__PURE__*/React.createElement(EyeOff, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, showPersonaHints ? t('persona.hints_on') : t('persona.hints_off'))), (isTeacherMode || studentProjectSettings.allowPersonaFreeResponse) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free'),
    "data-help-key": "persona_response_mode",
    "aria-pressed": isPersonaFreeResponse,
    onClick: () => {
      const newMode = !isPersonaFreeResponse;
      setIsPersonaFreeResponse(newMode);
      if (!newMode) setShowPersonaHints(true);
    },
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${!isPersonaFreeResponse ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')
  }, isPersonaFreeResponse ? /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, isPersonaFreeResponse ? t('persona.mode_free_label') : t('persona.mode_mc_label'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "persona_topic_spark",
    onClick: _requestPersonaTopicSpark,
    disabled: personaState.isLoading || personaState.isGeneratingTopicSpark || topicSparkPending || topicSparkCount >= 2,
    "aria-busy": personaState.isGeneratingTopicSpark || topicSparkPending ? 'true' : 'false',
    className: `p-2 rounded-lg border shadow-sm transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed ${topicSparkCount >= 2 ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'}`,
    title: t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', {
      remaining: topicSparkRemaining
    }),
    "aria-label": t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', {
      remaining: topicSparkRemaining
    })
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 16,
    className: personaState.isGeneratingTopicSpark ? 'animate-pulse motion-reduce:animate-none' : ''
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-slate-300 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": transcriptSavePending ? 'Saving private Persona session' : 'Save private Persona session with narration',
    "data-help-key": "persona_save_chat",
    onClick: _savePersonaTranscript,
    disabled: personaState.chatHistory.length === 0 || personaState.isLoading || transcriptSavePending,
    "aria-busy": transcriptSavePending ? 'true' : 'false',
    className: "p-2 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
    title: transcriptSavePending ? 'Saving private Persona session' : 'Save private Persona session with narration'
  }, transcriptSavePending ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Save, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _openPersonaSummary,
    disabled: !canGeneratePersonaSummary || summaryBusy,
    className: "p-2 rounded-lg bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
    title: personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn'),
    "aria-label": personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn'),
    "aria-busy": summaryBusy ? 'true' : 'false'
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 16,
    className: summaryBusy ? 'animate-pulse motion-reduce:animate-none' : ''
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": personaState.isLoading || isGeneratingReflectionPrompt ? t('persona.finish_current_turn') : panelConcludeReady ? t('persona.conclude_button') : t('persona.conclude_locked_progress', {
      percent: panelUnlockPct
    }),
    "data-help-key": "persona_conclude",
    onClick: _openPersonaReflection,
    disabled: !panelConcludeReady || personaState.isLoading || isGeneratingReflectionPrompt,
    className: `relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md active:scale-95 transition-all motion-reduce:transition-none text-xs font-bold ${panelConcludeReady ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'}`,
    title: personaState.isLoading || isGeneratingReflectionPrompt ? t('persona.finish_current_turn') : panelConcludeReady ? t('persona.conclude_tooltip') : t('persona.conclude_locked_progress', {
      percent: panelUnlockPct
    })
  }, panelConcludeReady ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Lock, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('persona.conclude_button')), !panelConcludeReady && /*#__PURE__*/React.createElement("span", {
    className: "hidden lg:inline text-[10px] font-black opacity-80"
  }, panelUnlockPct, "%"), !panelConcludeReady && /*#__PURE__*/React.createElement("span", {
    className: "absolute left-1 right-1 bottom-1 h-1 rounded-full bg-white/70 overflow-hidden"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block h-full rounded-full bg-indigo-400 transition-all motion-reduce:transition-none duration-500",
    style: {
      width: `${panelUnlockPct}%`
    }
  })))), (personaState.isGeneratingTopicSpark || personaState.topicSparkError) && /*#__PURE__*/React.createElement("div", {
    className: `shrink-0 border-b px-4 py-2 text-center text-xs ${personaState.topicSparkError ? 'border-red-200 bg-red-50 text-red-800' : 'border-indigo-100 bg-indigo-50 text-indigo-700'}`,
    role: personaState.topicSparkError ? 'alert' : 'status',
    "aria-live": "polite"
  }, personaState.isGeneratingTopicSpark ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 13,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('persona.topic_spark_generating')) : /*#__PURE__*/React.createElement("span", {
    className: "inline-flex flex-wrap items-center justify-center gap-2"
  }, t('persona.topic_spark_error'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _requestPersonaTopicSpark,
    disabled: topicSparkCount >= 2 || personaState.isGeneratingTopicSpark || topicSparkPending,
    "aria-busy": personaState.isGeneratingTopicSpark || topicSparkPending ? 'true' : 'false',
    className: "rounded border border-red-300 bg-white px-2 py-1 font-bold hover:bg-red-100 disabled:opacity-50"
  }, t('persona.topic_spark_retry')))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 md:hidden px-3 py-2 bg-white border-b border-slate-200 flex items-start gap-2 overflow-x-auto"
  }, (personaState.selectedCharacters || []).map((char, cIdx) => {
    const isActivePanelist = activeSpeakerName && activeSpeakerName === char?.name;
    const rapport = _boundedSnapshotNumber(char?.rapport ?? char?.initialRapport, 0, 100, 30);
    const xp = _boundedSnapshotNumber(char?.accumulatedXP, 0, 300, 0);
    const quests = [...(char?.quests || [])].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));
    return /*#__PURE__*/React.createElement("details", {
      key: char?.name || cIdx,
      className: `group w-[min(82vw,20rem)] shrink-0 rounded-xl border text-xs transition-all motion-reduce:transition-none ${isActivePanelist ? 'bg-yellow-50 border-yellow-300 text-yellow-900 shadow-sm ring-2 ring-yellow-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer list-none flex items-center gap-2 px-2.5 py-2 font-bold",
      "aria-label": t('persona.expand_panelist', {
        name: char?.name || t('persona.character_fallback')
      })
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-8 h-8 rounded-full overflow-hidden bg-white border shrink-0 ${isActivePanelist ? 'border-yellow-400' : 'border-slate-300'}`
    }, char?.avatarUrl ? /*#__PURE__*/React.createElement("img", {
      loading: "lazy",
      src: char.avatarUrl,
      alt: char.name,
      className: "w-full h-full object-cover"
    }) : /*#__PURE__*/React.createElement("span", {
      className: "w-full h-full flex items-center justify-center text-sm"
    }, (char?.name || '?').slice(0, 1))), /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 flex-1 truncate"
    }, char?.name || t('persona.character_fallback')), /*#__PURE__*/React.createElement("span", {
      className: "font-black tabular-nums"
    }, rapport, "%"), isActivePanelist && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[10px] text-yellow-700"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 12,
      className: "animate-pulse motion-reduce:animate-none"
    }), " ", t('persona.active_speaker')), /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 text-base transition-transform motion-reduce:transition-none group-open:rotate-180",
      "aria-hidden": "true"
    }, "▾")), /*#__PURE__*/React.createElement("div", {
      className: "border-t border-current/10 px-3 py-3 space-y-3 text-left",
      "aria-label": t('persona.panelist_details', {
        name: char?.name || t('persona.character_fallback')
      })
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "mb-1 flex justify-between font-bold"
    }, /*#__PURE__*/React.createElement("span", null, t('persona.rapport_label')), /*#__PURE__*/React.createElement("span", null, rapport, "%")), /*#__PURE__*/React.createElement("div", {
      role: "progressbar",
      "aria-label": t('persona.rapport_label'),
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": rapport,
      className: "h-2 overflow-hidden rounded-full border border-slate-300 bg-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full ${cIdx === 0 ? 'bg-indigo-500' : 'bg-rose-500'}`,
      style: {
        width: `${Math.max(0, Math.min(100, rapport))}%`
      }
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "mb-1 flex justify-between font-bold"
    }, /*#__PURE__*/React.createElement("span", null, t('common.xp')), /*#__PURE__*/React.createElement("span", null, xp, "/300")), /*#__PURE__*/React.createElement("div", {
      role: "progressbar",
      "aria-label": t('persona.xp_progress', {
        name: char?.name,
        xp
      }),
      "aria-valuemin": 0,
      "aria-valuemax": 300,
      "aria-valuenow": xp,
      className: "h-2 overflow-hidden rounded-full border border-slate-300 bg-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-full bg-amber-500",
      style: {
        width: `${Math.max(0, Math.min(100, xp / 300 * 100))}%`
      }
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      className: "mb-2 flex items-center gap-1 font-black uppercase tracking-wide"
    }, /*#__PURE__*/React.createElement(Search, {
      size: 12
    }), " ", t('persona.objectives_label')), quests.length ? /*#__PURE__*/React.createElement("ul", {
      className: "space-y-1.5"
    }, quests.map((quest, qIdx) => {
      const isLocked = rapport < Number(quest.difficulty || 0);
      return /*#__PURE__*/React.createElement("li", {
        key: qIdx,
        className: `rounded-lg border px-2 py-1.5 ${quest.isCompleted ? 'border-green-200 bg-green-50 text-green-800' : isLocked ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-indigo-200 bg-white text-slate-800'}`
      }, /*#__PURE__*/React.createElement("span", {
        className: "flex items-start gap-1.5"
      }, quest.isCompleted ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 12,
        className: "mt-0.5 shrink-0"
      }) : isLocked ? /*#__PURE__*/React.createElement(Lock, {
        size: 12,
        className: "mt-0.5 shrink-0"
      }) : /*#__PURE__*/React.createElement("span", {
        className: "mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-indigo-400",
        "aria-hidden": "true"
      }), /*#__PURE__*/React.createElement("span", null, quest.text)), !quest.isCompleted && isLocked && /*#__PURE__*/React.createElement("span", {
        className: "mt-1 block pl-4 text-[10px] font-bold opacity-70"
      }, t('persona.rapport_requirement', {
        difficulty: quest.difficulty
      })));
    })) : /*#__PURE__*/React.createElement("p", {
      className: "text-slate-500"
    }, t('persona.no_objectives'))), !char?.avatarUrl && typeof handleRetryPortraitGeneration === 'function' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleRetryPortraitGeneration(char),
      disabled: Boolean(char?.isUpdating),
      "aria-busy": char?.isUpdating ? 'true' : 'false',
      className: "inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-2 font-bold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 13,
      className: char?.isUpdating ? 'animate-spin motion-reduce:animate-none' : ''
    }), t('persona.generate_portrait'))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-1/4 min-w-[250px] border-r border-slate-200 bg-white flex flex-col p-4 overflow-hidden hidden md:flex transition-all motion-reduce:transition-none ${activeSpeakerName && activeSpeakerName === personaState.selectedCharacters?.[0]?.name ? 'ring-2 ring-yellow-200 ring-inset shadow-inner' : ''}`
  }, /*#__PURE__*/React.createElement(CharacterColumn, {
    character: personaState.selectedCharacters[0],
    side: "left",
    onRetryPortrait: handleRetryPortraitGeneration
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col bg-slate-50/50 relative min-w-0 md:min-w-[320px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar",
    ref: personaScrollRef,
    onScroll: e => {
      const el = e.currentTarget;
      personaScrollRef.current.__alloStickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    },
    role: "log",
    "aria-live": "polite",
    "aria-atomic": "false",
    "aria-relevant": "additions text",
    "aria-label": t("a11y.interview_conversation")
  }, /*#__PURE__*/React.createElement("div", {
    role: "note",
    className: "mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
  }, t('persona.simulation_disclaimer') || 'AI-generated historical simulation. Verify important claims with lesson evidence and trusted sources.'), personaHiddenMessageCount > 0 && /*#__PURE__*/React.createElement("div", {
    role: "note",
    className: "mx-auto max-w-2xl rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-xs text-slate-600"
  }, t('persona.older_messages_hidden', {
    count: personaHiddenMessageCount
  })), personaDisplayHistory.map((msg, visibleIdx) => {
    const idx = personaDisplayStartIndex + visibleIdx;
    const isUser = msg.role === 'user';
    const isCharB = !isUser && msg.speakerName === personaState.selectedCharacters[1]?.name;
    const speakerLabel = isUser ? t('common.you') : msg.speakerName;
    const isMessagePlayingNow = _isPersonaMessagePlaying(idx);
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: `flex flex-col ${isUser ? 'items-end' : isCharB ? 'items-end' : 'items-start'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: `relative overflow-hidden max-w-[85%] p-4 rounded-2xl text-sm shadow-sm leading-relaxed border transition-all motion-reduce:transition-none ${isUser ? 'bg-indigo-100 text-indigo-900 border-indigo-200 rounded-br-none' : isCharB ? 'bg-rose-50 text-slate-800 border-rose-200 rounded-br-none mr-2' : 'bg-white text-slate-700 border-slate-200 rounded-bl-none ml-2'} ${isMessagePlayingNow ? 'ring-2 ring-yellow-200 border-yellow-300 shadow-md' : ''}`,
      "aria-label": !isUser ? t('a11y.message_speaker_read_aloud', {
        name: speakerLabel
      }) || 'Message from ' + speakerLabel + '. Click any sentence to hear it read aloud.' : undefined
    }, isMessagePlayingNow && /*#__PURE__*/React.createElement("div", {
      className: "absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 animate-pulse motion-reduce:animate-none"
    }), isUser ? msg.text.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1') : (() => {
      const paragraphs = msg.text.split(/\n{2,}/);
      let sentenceCounter = 0;
      return paragraphs.map((para, pIdx) => {
        const sentences = splitTextToSentences(para);
        if (sentences.length === 0) return null;
        return /*#__PURE__*/React.createElement("p", {
          key: pIdx,
          className: "mb-2 last:mb-0"
        }, sentences.map((s, sIdx) => {
          const currentGlobalIdx = sentenceCounter;
          sentenceCounter++;
          const isMessagePlaying = _isPersonaMessagePlaying(idx);
          // TTS plays multi-sentence chunks for voice consistency; chunkRanges maps chunk idx → sentence range
          const _activeRange = isMessagePlaying && playbackState.chunkRanges ? playbackState.chunkRanges[playbackState.currentIdx] : null;
          const _activeSentenceIdx = isMessagePlaying && typeof playbackState.currentSentenceIdx === 'number' ? playbackState.currentSentenceIdx : null;
          const isActive = isMessagePlaying && (_activeSentenceIdx !== null ? currentGlobalIdx === _activeSentenceIdx : _activeRange ? currentGlobalIdx >= _activeRange[0] && currentGlobalIdx < _activeRange[1] : currentGlobalIdx === playbackState.currentIdx);
          const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
          const isHeader = s.trim().startsWith('#') || isHtmlHeader;
          const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
          return /*#__PURE__*/React.createElement("span", {
            key: sIdx,
            onClick: e => {
              e.stopPropagation();
              handleSpeak(msg.text, `persona-message-${idx}`, currentGlobalIdx);
            },
            onKeyDown: e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleSpeak(msg.text, `persona-message-${idx}`, currentGlobalIdx);
              }
            },
            role: "button",
            tabIndex: 0,
            className: `transition-colors motion-reduce:transition-none duration-200 rounded px-1 py-0.5 cursor-pointer hover:bg-yellow-100 ${isActive ? 'bg-yellow-200 text-slate-950 shadow-sm ring-1 ring-yellow-400' : ''} ${isHeader ? 'font-bold block mt-1' : ''}`,
            title: t('common.click_to_read'),
            "aria-label": t('a11y.sentence_read_aloud', {
              num: currentGlobalIdx + 1
            }) || `Sentence ${currentGlobalIdx + 1}. Click to read aloud.`
          }, formatInteractiveText(cleanText.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')), " ");
        }));
      });
    })(), !isUser && msg.translation && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold uppercase tracking-wider text-slate-500"
    }, t('persona.translation_label') || 'English translation'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('persona.speak_translation'),
      onClick: e => {
        e.stopPropagation();
        handleSpeak(msg.translation, `persona-panel-translation-${idx}`, 0);
      },
      className: "p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 12
    }))), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-500 leading-relaxed italic"
    }, msg.translation)), !isUser && msg.evidenceNote && /*#__PURE__*/React.createElement("details", {
      className: "mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer font-bold"
    }, t('persona.evidence_note') || 'Evidence & simulation note'), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 leading-relaxed"
    }, msg.evidenceNote)), !isUser && /*#__PURE__*/React.createElement("span", {
      className: "mt-2 flex items-center gap-1 text-[11px] text-slate-600 opacity-70"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 11
    }), " ", t('persona.click_sentence') || 'Click any sentence to listen')), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] mt-1 px-1 font-bold uppercase tracking-wider flex items-center gap-1 ${isMessagePlayingNow ? 'text-yellow-700' : 'text-slate-600'}`
    }, speakerLabel, isMessagePlayingNow && /*#__PURE__*/React.createElement(Volume2, {
      size: 11,
      className: "animate-pulse motion-reduce:animate-none"
    })));
  }), personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "flex justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white px-4 py-2 rounded-full border border-indigo-100 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none text-indigo-500"
  }), " ", t('persona.status_deliberating'), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-0.5 ml-1",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none",
    style: {
      animationDelay: '120ms'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-indigo-400 animate-pulse motion-reduce:animate-none",
    style: {
      animationDelay: '240ms'
    }
  })))), panelTtsPending.length > 0 && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "flex justify-center p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200 flex items-center gap-2 text-xs font-medium text-violet-600 animate-pulse motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 12,
    className: "animate-bounce motion-reduce:animate-none"
  }), " ", t('persona.waiting_to_speak'))), personaDefinitionData && /*#__PURE__*/React.createElement("div", {
    "data-persona-definition-dialog": true,
    className: "fixed z-[9999] w-[calc(100vw-1rem)] max-w-sm max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white rounded-xl shadow-2xl border-2 border-indigo-200 p-4 animate-in motion-reduce:animate-none zoom-in-95 duration-150 sm:w-auto",
    style: {
      left: Math.max(8, Math.min((Number(personaDefinitionData.x) || 0) + 10, Math.max(8, window.innerWidth - 392))),
      top: Math.max(8, Math.min((Number(personaDefinitionData.y) || 0) + 10, Math.max(8, window.innerHeight - 220)))
    },
    ref: personaDefinitionDialogRef,
    role: "dialog",
    tabIndex: -1,
    "aria-labelledby": "persona-definition-title",
    onKeyDown: e => {
      if (e.isComposing || e.nativeEvent && e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleSetPersonaDefinitionDataToNull();
      }
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    id: "persona-definition-title",
    className: "font-bold text-lg text-indigo-600"
  }, personaDefinitionData.word), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-definition-initial-focus": true,
    "aria-label": t('common.close_definition'),
    onClick: handleSetPersonaDefinitionDataToNull,
    className: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded p-1 transition-colors motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  }))), isPersonaDefining ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-slate-600 text-sm"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }), t('persona.looking_up_definition')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed mb-3"
  }, personaDefinitionData.text), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('persona.speak_definition'),
    onClick: () => handleSpeak(personaDefinitionData.text, 'persona-definition', 0),
    className: "flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full"
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 12
  }), " ", t('persona.speak_definition'))))), (personaState.panelSuggestions || []).length > 0 && !personaState.isLoading && !panelChoicePending ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 text-center mb-3 font-medium"
  }, t('persona.panel_choose_response')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
  }, personaState.panelSuggestions.map((opt, i) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: i,
    onClick: () => _handlePanelChoice(opt),
    disabled: panelChoicePending || personaState.isLoading,
    className: "text-left px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all motion-reduce:transition-none duration-300 shadow-sm hover:scale-[1.01] active:scale-[0.99] bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300"
  }, /*#__PURE__*/React.createElement("span", {
    className: "opacity-50 mr-2"
  }, String.fromCharCode(65 + i), "."), opt.text))), (personaState.panelSuggestions || []).length < 6 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600",
    role: "status",
    "aria-live": "polite"
  }, personaState.isGeneratingPanelSuggestions ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none text-indigo-600"
  }), " ", t('persona.choices_partial')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, personaState.panelSuggestionsError ? t('persona.choices_generation_failed') : t('persona.choices_partial')), typeof generatePanelFollowUps === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => _retryPersonaChoices('panel'),
    disabled: suggestionsRetryPending,
    "aria-busy": suggestionsRetryPending ? 'true' : 'false',
    className: "font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
  }, t('persona.retry_choices'))))) : panelChoicePending || personaState.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200",
    role: "status",
    "aria-live": "polite",
    "aria-busy": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-sm font-bold text-indigo-700"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin motion-reduce:animate-none"
  }), t('persona.waiting_for_response'))) : isPersonaFreeResponse ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_persona_input'),
    maxLength: 2000,
    value: personaInput,
    onChange: e => setPersonaInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.isComposing && !(e.nativeEvent && e.nativeEvent.isComposing) && e.keyCode !== 229) {
        e.preventDefault();
        if (!personaState.isLoading && typeof personaInput === 'string' && personaInput.trim()) handlePanelChatSubmit(personaInput);
      }
    },
    className: "flex-1 p-3 border-2 border-indigo-600 rounded-xl focus:border-indigo-400 outline-none transition-all motion-reduce:transition-none placeholder:text-slate-600",
    placeholder: t('persona.panel_question_placeholder'),
    disabled: personaState.isLoading
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": personaState.isLoading ? t('persona.waiting_for_response') : t('persona.send_panel_message'),
    "aria-busy": personaState.isLoading ? 'true' : 'false',
    onClick: () => handlePanelChatSubmit(personaInput),
    disabled: !personaInput.trim() || personaState.isLoading,
    className: "bg-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
  }, personaState.isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 20
  })))) : /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-center gap-3",
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: personaState.isLoading || personaState.isGeneratingPanelSuggestions ? 'animate-spin motion-reduce:animate-none text-indigo-600' : 'text-indigo-600'
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-slate-700"
  }, personaState.panelSuggestionsError ? t('persona.choices_generation_failed') : personaState.isLoading || personaState.isGeneratingPanelSuggestions ? t('persona.generating_choices') : t('persona.choices_unavailable')), !personaState.isLoading && !personaState.isGeneratingPanelSuggestions && typeof generatePanelFollowUps === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => _retryPersonaChoices('panel'),
    disabled: suggestionsRetryPending,
    "aria-busy": suggestionsRetryPending ? 'true' : 'false',
    className: "text-xs font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
  }, t('persona.retry_choices')))), /*#__PURE__*/React.createElement("div", {
    className: `w-1/4 min-w-[250px] border-l border-slate-200 bg-white flex flex-col p-4 overflow-hidden hidden md:flex transition-all motion-reduce:transition-none ${activeSpeakerName && activeSpeakerName === personaState.selectedCharacters?.[1]?.name ? 'ring-2 ring-yellow-200 ring-inset shadow-inner' : ''}`
  }, /*#__PURE__*/React.createElement(CharacterColumn, {
    character: personaState.selectedCharacters[1],
    side: "right",
    onRetryPortrait: handleRetryPortraitGeneration
  }))), isPersonaReflectionOpen && /*#__PURE__*/React.createElement("div", {
    ref: personaReflectionDialogRef,
    "data-persona-reflection-dialog": true,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "persona-reflection-title",
    tabIndex: -1,
    onKeyDown: e => {
      if (e.isComposing || e.nativeEvent && e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape' && !reflectionBusy) {
        e.preventDefault();
        e.stopPropagation();
        handleSetIsPersonaReflectionOpenToFalse();
      }
    },
    className: "absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col overflow-hidden p-3 sm:p-8 animate-in motion-reduce:animate-none fade-in duration-300"
  }, hasRenderableReflectionFeedback ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-in motion-reduce:animate-none zoom-in duration-300"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 40,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("h2", {
    id: "persona-reflection-title",
    className: "text-2xl font-black text-slate-800"
  }, t('persona.reflection_complete') || 'Great Reflection!'), reflectionFeedbackSubject && /*#__PURE__*/React.createElement("p", {
    className: "break-words text-slate-600 text-sm"
  }, reflectionFeedbackSubject)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-4"
  }, reflectionFeedbackScore !== null && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-black text-indigo-600 mb-2"
  }, reflectionFeedbackScore, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl text-indigo-400"
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider"
  }, t('persona.ai_quality_score') || 'AI Reflection Estimate')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-md"
  }, /*#__PURE__*/React.createElement(Star, {
    size: 24,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-yellow-600"
  }, "+", reflectionFeedbackXp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-yellow-700 font-medium"
  }, t('persona.xp_earned') || 'Experience Earned'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 12
  }), " ", t('persona.ai_feedback') || 'AI Reflection Feedback'), /*#__PURE__*/React.createElement("p", {
    className: "mb-2 text-[11px] text-slate-500"
  }, t('persona.ai_feedback_disclaimer') || 'AI-generated feedback may be imperfect; educators should review important conclusions.'), /*#__PURE__*/React.createElement("div", {
    className: "break-words [overflow-wrap:anywhere] text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none",
    dangerouslySetInnerHTML: {
      __html: reflectionFeedbackText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": isPersonaReflectionOpen,
    onClick: _handleCompleteReflection,
    className: "w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 flex items-center justify-center gap-2 text-lg"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 22
  }), " ", t('common.continue') || 'Continue'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 32
  })), /*#__PURE__*/React.createElement("h2", {
    id: "persona-reflection-title",
    className: "text-2xl font-black text-slate-800"
  }, t('persona.reflection_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm"
  }, t('persona.reflection_subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-xl border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2"
  }, t('persona.reflection_prompt_label') || 'Reflection Question'), isGeneratingReflectionPrompt ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "flex items-center gap-2 text-indigo-500 text-sm italic"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('persona.status_generating_prompt')) : /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 text-sm leading-relaxed"
  }, dynamicReflectionQuestion || t('persona.default_reflection_prompt'))), /*#__PURE__*/React.createElement("textarea", {
    id: "persona-reflection-input",
    "aria-label": t('persona.reflection_input') || 'Write your reflection',
    "aria-describedby": "persona-reflection-count",
    maxLength: 4000,
    value: personaReflectionText,
    onChange: e => setPersonaReflectionInput(e.target.value),
    placeholder: t('persona.reflection_placeholder'),
    className: "w-full h-48 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-600",
    disabled: reflectionBusy || isGeneratingReflectionPrompt
  }), /*#__PURE__*/React.createElement("p", {
    id: "persona-reflection-count",
    className: "mt-1 text-right text-[11px] font-medium text-slate-500"
  }, t('persona.reflection_character_count', {
    count: personaReflectionText.length,
    limit: 4000
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('persona.back_to_chat'),
    onClick: handleSetIsPersonaReflectionOpenToFalse,
    disabled: reflectionBusy,
    className: "flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
  }, t('persona.back_to_chat')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.submit_reflection_for_grading'),
    "aria-busy": reflectionBusy ? 'true' : 'false',
    onClick: _submitPersonaReflection,
    disabled: !personaReflectionText.trim() || reflectionBusy || isGeneratingReflectionPrompt,
    className: "flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  }, reflectionBusy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 18,
    className: "text-yellow-700 fill-current"
  }), reflectionBusy ? t('persona.status_grading') : t('persona.submit_xp')))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "w-full md:w-1/3 max-h-[40vh] md:max-h-none bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-3 sm:p-4 md:p-6 flex flex-col items-center text-center overflow-y-auto shrink-0 z-10 relative custom-scrollbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-32 sm:w-32 sm:h-48 md:w-80 md:h-[28rem] bg-yellow-100 rounded-2xl border-4 border-white shadow-xl overflow-hidden mb-3 md:mb-6 shrink-0 relative group"
  }, personaState.avatarUrl && /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: personaState.avatarUrl,
    alt: personaState.selectedCharacter.name,
    className: `w-full h-full object-cover transition-all motion-reduce:transition-none duration-500 hover:scale-105 ${personaState.isImageLoading ? 'blur-[2px] opacity-90 scale-105' : ''}`,
    style: {
      objectPosition: 'top center'
    }
  }), personaState.isImageLoading && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center z-20 bg-black/10 backdrop-blur-[1px] transition-all motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/30 shadow-lg"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 32,
    className: "text-white animate-spin motion-reduce:animate-none drop-shadow-md"
  }))), !personaState.avatarUrl && !personaState.isImageLoading && /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col items-center justify-center gap-3 p-4"
  }, /*#__PURE__*/React.createElement(History, {
    size: 64,
    className: "text-yellow-300/50"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('persona.generate_portrait_for', {
      name: personaState.selectedCharacter?.name || t('persona.character_fallback')
    }),
    onClick: () => handleRetryPortraitGeneration(personaState.selectedCharacter),
    className: "bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-4 py-2 rounded-full text-sm text-slate-600 group-hover:text-indigo-700 transition-colors motion-reduce:transition-none flex items-center gap-2 transition-all motion-reduce:transition-none shadow-md hover:shadow-lg"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16
  }), t('persona.generate_portrait')), personaState.avatarGenerationFailed && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-yellow-600/70 italic text-center"
  }, t('persona.portrait_retry_hint')))), /*#__PURE__*/React.createElement("h3", {
    className: "font-black text-2xl md:text-3xl text-slate-800 leading-tight mb-2"
  }, personaState.selectedCharacter.name), /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-yellow-200 shadow-sm"
  }, personaState.selectedCharacter.role, " (", personaState.selectedCharacter.year, ")"), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white p-4 rounded-xl border border-slate-400 text-sm text-slate-600 leading-relaxed font-serif italic shadow-sm relative"
  }, /*#__PURE__*/React.createElement(Quote, {
    size: 16,
    className: "absolute top-2 left-2 text-slate-600 fill-current"
  }), "\"", personaState.selectedCharacter.context, "\""), /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-end mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-widest"
  }, t('persona.trust_rapport_label')), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold ${singleRapport >= 70 ? 'text-green-600' : singleRapport >= 30 ? 'text-yellow-600' : 'text-red-500'}`
  }, singleRapport, "%")), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": t('persona.trust_rapport_label'),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": singleRapport,
    className: "w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all motion-reduce:transition-none duration-500 ease-out ${singleRapport >= 70 ? 'bg-green-500' : singleRapport >= 30 ? 'bg-yellow-400' : 'bg-red-500'}`,
    style: {
      width: `${singleRapport}%`
    }
  }))), personaState.selectedCharacter.quests && personaState.selectedCharacter.quests.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6 text-left"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12
  }), " ", t('persona.secrets_to_uncover')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, personaState.selectedCharacter.quests.map((quest, qIdx) => /*#__PURE__*/React.createElement("div", {
    key: qIdx,
    className: `p-3 rounded-lg border text-xs transition-all motion-reduce:transition-none ${quest.isCompleted ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-100 text-slate-600'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `mt-0.5 ${quest.isCompleted ? 'text-green-500' : 'text-slate-600'}`
  }, quest.isCompleted ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-3.5 h-3.5 rounded-full border-2 border-current"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: `font-bold block mb-0.5 ${quest.isCompleted ? 'line-through opacity-70' : ''}`
  }, quest.text), !quest.isCompleted && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase tracking-wider font-bold opacity-60"
  }, t('persona.trust_requirement', {
    difficulty: quest.difficulty
  }))))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col h-full bg-white relative min-w-0"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-persona-initial-focus": true,
    onClick: _handleCloseAndClearSnapshot,
    className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors motion-reduce:transition-none z-50",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-b border-slate-100 p-3 pr-14 flex items-center justify-between gap-2 shrink-0 z-20 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 px-3 py-1.5 rounded-lg border border-yellow-200"
  }, /*#__PURE__*/React.createElement(Star, {
    size: 16,
    className: "text-yellow-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider"
  }, t('common.xp')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-black text-yellow-600"
  }, singleXp), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600"
  }, "/ 300"))), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": t('common.xp') || 'Experience points',
    "aria-valuemin": 0,
    "aria-valuemax": 300,
    "aria-valuenow": singleXp,
    className: "w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all motion-reduce:transition-none duration-500",
    style: {
      width: `${Math.min(100, singleXp / 300 * 100)}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on'),
    "data-help-key": "persona_auto_read",
    "aria-pressed": personaAutoRead,
    onClick: () => {
      const newState = !personaAutoRead;
      setPersonaAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${personaAutoRead ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on')
  }, personaAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "animate-pulse motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_read_label'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "persona_auto_send",
    "aria-label": personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send'),
    "aria-pressed": personaAutoSend,
    onClick: handleTogglePersonaAutoSend,
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${personaAutoSend ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send')
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 16,
    className: personaAutoSend ? "fill-current" : ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_send'))), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-slate-300 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip'),
    "data-help-key": "persona_hints_toggle",
    "aria-pressed": showPersonaHints,
    onClick: handleToggleShowPersonaHints,
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${!showPersonaHints ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip')
  }, showPersonaHints ? /*#__PURE__*/React.createElement(Eye, {
    size: 16
  }) : /*#__PURE__*/React.createElement(EyeOff, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, showPersonaHints ? t('persona.hints_on') : t('persona.hints_off'))), (isTeacherMode || studentProjectSettings.allowPersonaFreeResponse) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free'),
    "data-help-key": "persona_response_mode",
    "aria-pressed": isPersonaFreeResponse,
    onClick: () => {
      const newMode = !isPersonaFreeResponse;
      setIsPersonaFreeResponse(newMode);
      if (!newMode) setShowPersonaHints(true);
    },
    className: `p-2 rounded-lg border transition-all motion-reduce:transition-none flex items-center gap-2 ${!isPersonaFreeResponse ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')
  }, isPersonaFreeResponse ? /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, isPersonaFreeResponse ? t('persona.mode_free_label') : t('persona.mode_mc_label'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "persona_topic_spark",
    onClick: _requestPersonaTopicSpark,
    disabled: personaState.isLoading || personaState.isGeneratingTopicSpark || topicSparkPending || topicSparkCount >= 2,
    "aria-busy": personaState.isGeneratingTopicSpark || topicSparkPending ? 'true' : 'false',
    className: `p-2 rounded-lg border shadow-sm transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed ${topicSparkCount >= 2 ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'}`,
    title: t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', {
      remaining: topicSparkRemaining
    }),
    "aria-label": t(isPersonaFreeResponse ? 'persona.topic_spark_tooltip' : 'persona.topic_spark_mc_tooltip', {
      remaining: topicSparkRemaining
    })
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 16,
    className: personaState.isGeneratingTopicSpark ? 'animate-pulse motion-reduce:animate-none' : ''
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "persona_save_chat",
    onClick: _savePersonaTranscript,
    disabled: personaState.chatHistory.length === 0 || personaState.isLoading || transcriptSavePending,
    "aria-busy": transcriptSavePending ? 'true' : 'false',
    className: "p-2 rounded-lg bg-white text-slate-600 border border-slate-400 shadow-sm hover:bg-slate-50 hover:border-indigo-200 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed",
    title: transcriptSavePending ? 'Saving private Persona session' : 'Save private Persona session with narration',
    "aria-label": transcriptSavePending ? 'Saving private Persona session' : 'Save private Persona session with narration'
  }, transcriptSavePending ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Save, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _openPersonaSummary,
    disabled: !canGeneratePersonaSummary || summaryBusy,
    className: "p-2 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 shadow-sm hover:bg-violet-100 transition-all motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed",
    title: personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn'),
    "aria-label": personaState.personaSummary ? t('persona.summary.view_btn') : t('persona.summary.generate_btn'),
    "aria-busy": summaryBusy ? 'true' : 'false'
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 16,
    className: summaryBusy ? 'animate-pulse motion-reduce:animate-none' : ''
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": personaState.isLoading || isGeneratingReflectionPrompt ? t('persona.finish_current_turn') : singleConcludeReady ? t('persona.conclude_button') : t('persona.conclude_locked_progress', {
      percent: singleUnlockPct
    }),
    "data-help-key": "persona_conclude",
    onClick: _openPersonaReflection,
    disabled: !singleConcludeReady || personaState.isLoading || isGeneratingReflectionPrompt,
    className: `relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md active:scale-95 transition-all motion-reduce:transition-none text-xs font-bold ${singleConcludeReady ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'}`,
    title: personaState.isLoading || isGeneratingReflectionPrompt ? t('persona.finish_current_turn') : singleConcludeReady ? t('persona.conclude_tooltip') : t('persona.conclude_locked_progress', {
      percent: singleUnlockPct
    })
  }, singleConcludeReady ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Lock, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('persona.conclude_button')), !singleConcludeReady && /*#__PURE__*/React.createElement("span", {
    className: "hidden lg:inline text-[10px] font-black opacity-80"
  }, singleUnlockPct, "%"), !singleConcludeReady && /*#__PURE__*/React.createElement("span", {
    className: "absolute left-1 right-1 bottom-1 h-1 rounded-full bg-white/70 overflow-hidden"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block h-full rounded-full bg-indigo-400 transition-all motion-reduce:transition-none duration-500",
    style: {
      width: `${singleUnlockPct}%`
    }
  }))))), (personaState.isGeneratingTopicSpark || personaState.topicSparkError) && /*#__PURE__*/React.createElement("div", {
    className: `shrink-0 border-b px-4 py-2 text-center text-xs ${personaState.topicSparkError ? 'border-red-200 bg-red-50 text-red-800' : 'border-indigo-100 bg-indigo-50 text-indigo-700'}`,
    role: personaState.topicSparkError ? 'alert' : 'status',
    "aria-live": "polite"
  }, personaState.isGeneratingTopicSpark ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 13,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('persona.topic_spark_generating')) : /*#__PURE__*/React.createElement("span", {
    className: "inline-flex flex-wrap items-center justify-center gap-2"
  }, t('persona.topic_spark_error'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _requestPersonaTopicSpark,
    disabled: topicSparkCount >= 2 || personaState.isGeneratingTopicSpark || topicSparkPending,
    "aria-busy": personaState.isGeneratingTopicSpark || topicSparkPending ? 'true' : 'false',
    className: "rounded border border-red-300 bg-white px-2 py-1 font-bold hover:bg-red-100 disabled:opacity-50"
  }, t('persona.topic_spark_retry')))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar",
    ref: personaScrollRef,
    onScroll: e => {
      const el = e.currentTarget;
      personaScrollRef.current.__alloStickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    },
    role: "log",
    "aria-live": "polite",
    "aria-atomic": "false",
    "aria-relevant": "additions text",
    "aria-label": t('a11y.interview_conversation') || 'Interview conversation with character'
  }, /*#__PURE__*/React.createElement("div", {
    role: "note",
    className: "mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
  }, t('persona.simulation_disclaimer') || 'AI-generated historical simulation. Verify important claims with lesson evidence and trusted sources.'), (!personaState.chatHistory || personaState.chatHistory.length === 0) && /*#__PURE__*/React.createElement("div", {
    className: "mx-auto my-10 max-w-md text-center rounded-2xl border border-dashed border-yellow-200 bg-white/80 px-6 py-8 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200"
  }, /*#__PURE__*/React.createElement(Quote, {
    size: 22
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-700"
  }, t('persona.empty_chat_instruction')), personaState.selectedCharacter?.name && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs text-slate-500"
  }, t('persona.character_question_placeholder', {
    name: personaState.selectedCharacter.name
  }))), personaHiddenMessageCount > 0 && /*#__PURE__*/React.createElement("div", {
    role: "note",
    className: "mx-auto max-w-2xl rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-xs text-slate-600"
  }, t('persona.older_messages_hidden', {
    count: personaHiddenMessageCount
  })), personaDisplayHistory.map((msg, visibleIdx) => {
    const idx = personaDisplayStartIndex + visibleIdx;
    const isUser = msg.role === 'user';
    const isMessagePlayingNow = _isPersonaMessagePlaying(idx);
    let bubbleClass = 'bg-white text-slate-700 border-slate-200 rounded-bl-none font-serif text-base';
    let speakerName = isUser ? t('common.you') : personaState.selectedCharacter?.name || t('common.character');
    let avatarUrl = !isUser ? personaState.avatarUrl || personaState.selectedCharacter?.avatarUrl || null : null;
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
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: `flex flex-col ${isUser ? 'items-end' : 'items-start'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: `flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`
    }, !isUser && avatarUrl && /*#__PURE__*/React.createElement("div", {
      className: "flex-shrink-0 mt-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-8 h-8 rounded-full overflow-hidden border shadow-sm bg-white transition-all motion-reduce:transition-none ${isMessagePlayingNow ? 'border-yellow-400 ring-2 ring-yellow-200 shadow-yellow-100' : 'border-slate-400'}`
    }, /*#__PURE__*/React.createElement("img", {
      loading: "lazy",
      src: avatarUrl,
      alt: speakerName,
      className: "w-full h-full object-cover"
    }))), /*#__PURE__*/React.createElement("div", {
      className: `relative overflow-hidden p-4 rounded-2xl text-sm shadow-sm leading-relaxed transition-all motion-reduce:transition-none ${bubbleClass} ${isMessagePlayingNow ? 'ring-2 ring-yellow-200 border-yellow-300 shadow-md' : ''}`
    }, isMessagePlayingNow && /*#__PURE__*/React.createElement("div", {
      className: "absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 animate-pulse motion-reduce:animate-none"
    }), (() => {
      // Keep the English translation OUT of the TTS sentence spans:
      // new messages carry it in msg.translation; the split also
      // upgrades legacy messages where the model embedded a
      // "**English Translation:**" block inside the text.
      const _twoLang = String(msg.text || '').split(/\*{0,2}\s*English Translation\s*:?\s*\*{0,2}/i);
      const mainText = _twoLang[0].trim() || String(msg.text || '');
      const translationText = msg.translation && String(msg.translation).trim() || (_twoLang.length > 1 ? _twoLang.slice(1).join(' ').trim() : null) || null;
      const paragraphs = mainText.split(/\n{2,}/);
      let sentenceCounter = 0;
      return /*#__PURE__*/React.createElement(React.Fragment, null, paragraphs.map((para, pIdx) => {
        const sentences = splitTextToSentences(para);
        if (sentences.length === 0) return null;
        return /*#__PURE__*/React.createElement("p", {
          key: pIdx,
          className: "mb-2 last:mb-0"
        }, sentences.map((s, sIdx) => {
          const currentGlobalIdx = sentenceCounter;
          sentenceCounter++;
          const isMessagePlaying = _isPersonaMessagePlaying(idx);
          const _activeRange = isMessagePlaying && playbackState.chunkRanges ? playbackState.chunkRanges[playbackState.currentIdx] : null;
          const _activeSentenceIdx = isMessagePlaying && typeof playbackState.currentSentenceIdx === 'number' ? playbackState.currentSentenceIdx : null;
          const isActive = isMessagePlaying && (_activeSentenceIdx !== null ? currentGlobalIdx === _activeSentenceIdx : _activeRange ? currentGlobalIdx >= _activeRange[0] && currentGlobalIdx < _activeRange[1] : currentGlobalIdx === playbackState.currentIdx);
          const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
          const isHeader = s.trim().startsWith('#') || isHtmlHeader;
          const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
          return /*#__PURE__*/React.createElement("span", {
            key: sIdx,
            onClick: e => {
              e.stopPropagation();
              handleSpeak(mainText, `persona-message-${idx}`, currentGlobalIdx);
            },
            role: "button",
            tabIndex: 0,
            "aria-label": cleanText + '. ' + t('common.click_to_read'),
            onKeyDown: e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            },
            className: `transition-colors motion-reduce:transition-none duration-200 rounded px-1 py-0.5 cursor-pointer hover:bg-yellow-100 ${isActive ? 'bg-yellow-200 text-slate-950 shadow-sm ring-1 ring-yellow-400' : ''} ${isHeader ? 'font-bold block mt-1' : ''}`,
            title: t('common.click_to_read')
          }, formatInteractiveText(cleanText), " ");
        }));
      }), !isUser && msg.evidenceNote && /*#__PURE__*/React.createElement("details", {
        className: "mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900"
      }, /*#__PURE__*/React.createElement("summary", {
        className: "cursor-pointer font-bold"
      }, t('persona.evidence_note') || 'Evidence & simulation note'), /*#__PURE__*/React.createElement("p", {
        className: "mt-1 leading-relaxed"
      }, msg.evidenceNote)), translationText && /*#__PURE__*/React.createElement("div", {
        className: "mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2 mb-1"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-bold uppercase tracking-wider text-slate-500"
      }, t('persona.translation_label') || 'English translation'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-label": t('persona.speak_translation'),
        onClick: e => {
          e.stopPropagation();
          handleSpeak(translationText, `persona-translation-${idx}`, 0);
        },
        className: "p-0.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors motion-reduce:transition-none",
        title: t('common.click_to_read')
      }, /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }))), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-500 leading-relaxed italic"
      }, translationText)));
    })())), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] mt-1 px-1 font-bold uppercase tracking-wider flex items-center gap-1 ${!isUser && avatarUrl ? 'ml-11' : ''} ${isMessagePlayingNow ? 'text-yellow-700' : 'text-slate-600'}`
    }, speakerName, isMessagePlayingNow && /*#__PURE__*/React.createElement(Volume2, {
      size: 11,
      className: "animate-pulse motion-reduce:animate-none"
    })));
  }), personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 max-w-[85%]"
  }, personaState.selectedCharacter?.avatarUrl && /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0 mt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 rounded-full overflow-hidden border border-yellow-300 ring-2 ring-yellow-100 bg-white shadow-sm"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: personaState.selectedCharacter.avatarUrl,
    alt: personaState.selectedCharacter.name,
    className: "w-full h-full object-cover"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded-2xl border border-yellow-200 rounded-bl-none text-xs text-slate-600 italic flex items-center gap-2 shadow-sm"
  }, /*#__PURE__*/React.createElement(History, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none text-yellow-600"
  }), /*#__PURE__*/React.createElement("span", null, t('persona.status_thinking', {
    name: personaState.selectedCharacter?.name
  })), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-0.5 ml-1",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-yellow-500 animate-pulse motion-reduce:animate-none"
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-yellow-500 animate-pulse motion-reduce:animate-none",
    style: {
      animationDelay: '120ms'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-1 h-1 rounded-full bg-yellow-500 animate-pulse motion-reduce:animate-none",
    style: {
      animationDelay: '240ms'
    }
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-slate-100 flex flex-col shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
  }, isPersonaFreeResponse && !showPersonaHints && !personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-2 pb-0 flex justify-center animate-in motion-reduce:animate-none slide-in-from-bottom-2 fade-in"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm transition-colors motion-reduce:transition-none ${!personaTurnHintsViewed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`
  }, !personaTurnHintsViewed ? t('persona.hard_mode_active') : t('persona.hints_viewed_status'))), (showPersonaHints || !isPersonaFreeResponse) && (personaState.suggestions || []).length > 0 && !personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: `px-4 pt-3 flex gap-2 ${isPersonaFreeResponse ? 'overflow-x-auto no-scrollbar pb-1' : 'flex-wrap pb-4 justify-center'}`
  }, personaState.suggestions.map((q, i) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    key: i,
    onClick: () => handlePersonaChatSubmit(q, true),
    className: `whitespace-normal text-left px-3 py-2 text-xs font-bold rounded-xl border transition-colors motion-reduce:transition-none shadow-sm ${isPersonaFreeResponse ? 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 flex-shrink-0' : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 w-full sm:w-[48%] py-3 text-sm'}`
  }, !isPersonaFreeResponse && /*#__PURE__*/React.createElement("span", {
    className: "mr-2 opacity-50"
  }, String.fromCharCode(65 + i), "."), q))), !isPersonaFreeResponse && (personaState.suggestions || []).length > 0 && (personaState.suggestions || []).length < 6 && !personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600",
    role: "status",
    "aria-live": "polite"
  }, personaState.isGeneratingSuggestions ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none text-indigo-600"
  }), " ", t('persona.choices_partial')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, personaState.suggestionsError ? t('persona.choices_generation_failed') : t('persona.choices_partial')), typeof generatePersonaFollowUps === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => _retryPersonaChoices('single'),
    disabled: suggestionsRetryPending,
    "aria-busy": suggestionsRetryPending ? 'true' : 'false',
    className: "font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
  }, t('persona.retry_choices')))), isPersonaFreeResponse && /*#__PURE__*/React.createElement("div", {
    className: "p-4 flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_persona_input'),
    type: "text",
    maxLength: 2000,
    value: personaInput,
    onChange: e => setPersonaInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.isComposing && !(e.nativeEvent && e.nativeEvent.isComposing) && e.keyCode !== 229) {
        e.preventDefault();
        if (!personaState.isLoading && typeof personaInput === 'string' && personaInput.trim()) handlePersonaChatSubmit();
      }
    },
    placeholder: t('persona.character_question_placeholder', {
      name: personaState.selectedCharacter?.name
    }),
    className: "flex-grow text-sm p-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none transition-all motion-reduce:transition-none placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
    autoFocus: true,
    disabled: personaState.isLoading
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": personaState.isLoading ? t('persona.waiting_for_response') : t('persona.send_character_question', {
      name: personaState.selectedCharacter?.name || t('persona.character_fallback')
    }),
    "aria-busy": personaState.isLoading ? 'true' : 'false',
    onClick: () => handlePersonaChatSubmit(),
    disabled: !personaInput.trim() || personaState.isLoading,
    className: "bg-yellow-500 hover:bg-yellow-600 text-indigo-900 font-bold p-3 rounded-xl transition-colors motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
  }, personaState.isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 20
  }))), !isPersonaFreeResponse && (personaState.suggestions || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "p-5 text-center text-slate-600 text-xs flex flex-wrap items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: personaState.isLoading || personaState.isGeneratingSuggestions ? 'animate-spin motion-reduce:animate-none text-indigo-600' : 'text-indigo-600'
  }), /*#__PURE__*/React.createElement("span", null, personaState.suggestionsError ? t('persona.choices_generation_failed') : personaState.isLoading || personaState.isGeneratingSuggestions ? t('persona.generating_choices') : t('persona.choices_unavailable')), !personaState.isLoading && !personaState.isGeneratingSuggestions && typeof generatePersonaFollowUps === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => _retryPersonaChoices('single'),
    disabled: suggestionsRetryPending,
    "aria-busy": suggestionsRetryPending ? 'true' : 'false',
    className: "font-bold text-indigo-700 border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
  }, t('persona.retry_choices')))), isPersonaReflectionOpen && /*#__PURE__*/React.createElement("div", {
    ref: personaReflectionDialogRef,
    "data-persona-reflection-dialog": true,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "persona-reflection-title",
    tabIndex: -1,
    onKeyDown: e => {
      if (e.isComposing || e.nativeEvent && e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape' && !reflectionBusy) {
        e.preventDefault();
        e.stopPropagation();
        handleSetIsPersonaReflectionOpenToFalse();
      }
    },
    className: "absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col overflow-hidden p-3 sm:p-8 animate-in motion-reduce:animate-none fade-in duration-300"
  }, hasRenderableReflectionFeedback ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-in motion-reduce:animate-none zoom-in duration-300"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 40,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("h2", {
    id: "persona-reflection-title",
    className: "text-2xl font-black text-slate-800"
  }, t('persona.reflection_complete') || 'Great Reflection!'), reflectionFeedbackSubject && /*#__PURE__*/React.createElement("p", {
    className: "break-words text-slate-600 text-sm"
  }, reflectionFeedbackSubject)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-4"
  }, reflectionFeedbackScore !== null && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-black text-indigo-600 mb-2"
  }, reflectionFeedbackScore, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl text-indigo-400"
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider"
  }, t('persona.ai_quality_score') || 'AI Reflection Estimate')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-md"
  }, /*#__PURE__*/React.createElement(Star, {
    size: 24,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-yellow-600"
  }, "+", reflectionFeedbackXp, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-yellow-700 font-medium"
  }, t('persona.xp_earned') || 'Experience Earned'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 12
  }), " ", t('persona.ai_feedback') || 'AI Reflection Feedback'), /*#__PURE__*/React.createElement("p", {
    className: "mb-2 text-[11px] text-slate-500"
  }, t('persona.ai_feedback_disclaimer') || 'AI-generated feedback may be imperfect; educators should review important conclusions.'), /*#__PURE__*/React.createElement("div", {
    className: "break-words [overflow-wrap:anywhere] text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none",
    dangerouslySetInnerHTML: {
      __html: reflectionFeedbackText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.continue'),
    onClick: _handleCompleteReflection,
    className: "w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 flex items-center justify-center gap-2 text-lg"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 22
  }), " ", t('common.continue') || 'Continue'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 32
  })), /*#__PURE__*/React.createElement("h2", {
    id: "persona-reflection-title",
    className: "text-2xl font-black text-slate-800"
  }, t('persona.reflection_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm"
  }, t('persona.reflection_subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-xl border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2"
  }, t('persona.prompt_label')), isGeneratingReflectionPrompt ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "flex items-center gap-2 text-indigo-600 font-medium animate-pulse motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('persona.generating_question')) : /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 font-medium"
  }, dynamicReflectionQuestion || t('persona.default_reflection_prompt_named', {
    name: personaState.selectedCharacter?.name || t('persona.character_fallback')
  }))), /*#__PURE__*/React.createElement("textarea", {
    id: "persona-reflection-input",
    "aria-label": t('persona.reflection_input') || 'Write your reflection',
    "aria-describedby": "persona-reflection-count",
    maxLength: 4000,
    value: personaReflectionText,
    "data-help-key": "persona_reflection_input",
    onChange: e => setPersonaReflectionInput(e.target.value),
    placeholder: t('persona.reflection_placeholder'),
    className: "w-full h-48 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-600",
    disabled: reflectionBusy || isGeneratingReflectionPrompt
  }), /*#__PURE__*/React.createElement("p", {
    id: "persona-reflection-count",
    className: "mt-1 text-right text-[11px] font-medium text-slate-500"
  }, t('persona.reflection_character_count', {
    count: personaReflectionText.length,
    limit: 4000
  })))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('persona.back_to_chat'),
    onClick: handleSetIsPersonaReflectionOpenToFalse,
    "data-help-key": "persona_back_btn",
    disabled: reflectionBusy,
    className: "flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
  }, t('persona.back_to_chat')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.submit_reflection_for_grading'),
    "aria-busy": reflectionBusy ? 'true' : 'false',
    onClick: _submitPersonaReflection,
    "data-help-key": "persona_submit_btn",
    disabled: !personaReflectionText.trim() || reflectionBusy || isGeneratingReflectionPrompt,
    className: "flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all motion-reduce:transition-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  }, reflectionBusy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 18,
    className: "text-yellow-700 fill-current"
  }), reflectionBusy ? t('persona.status_grading') : t('persona.submit_xp'))))))), isPersonaSummaryOpen && /*#__PURE__*/React.createElement("div", {
    ref: personaSummaryDialogRef,
    "data-persona-summary-dialog": true,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "persona-summary-title",
    tabIndex: -1,
    onKeyDown: e => {
      if (e.isComposing || e.nativeEvent && e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsPersonaSummaryOpen(false);
      }
    },
    className: "absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-violet-200 bg-white shadow-2xl"
  }, /*#__PURE__*/React.createElement("header", {
    className: "flex items-start gap-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-full bg-violet-100 p-2 text-violet-700"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "persona-summary-title",
    className: "break-words [overflow-wrap:anywhere] text-xl font-black text-slate-900"
  }, summaryTitle), summaryParticipants && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 break-words [overflow-wrap:anywhere] text-xs font-medium text-slate-600"
  }, summaryParticipants)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-persona-summary-initial-focus": true,
    autoFocus: true,
    onClick: () => setIsPersonaSummaryOpen(false),
    className: "rounded-full p-2 text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-50",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-5 sm:p-6"
  }, summaryBusy && !personaSummary ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "flex min-h-[16rem] flex-col items-center justify-center gap-3 text-center text-violet-700"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 32,
    className: "animate-spin motion-reduce:animate-none"
  }), /*#__PURE__*/React.createElement("p", {
    className: "font-bold"
  }, t('persona.summary.generating'))) : personaState.personaSummaryError && !personaSummary ? /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "mx-auto flex min-h-[16rem] max-w-xl flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold"
  }, t('persona.summary.error')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _retryPersonaSummary,
    disabled: summaryBusy || !canGeneratePersonaSummary,
    "aria-busy": summaryBusy ? 'true' : 'false',
    className: "inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800 disabled:opacity-50"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16
  }), " ", t('persona.summary.retry'))) : personaSummary ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-5 break-words [overflow-wrap:anywhere]"
  }, summaryBusy && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-busy": "true",
    className: "flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm font-bold text-violet-800"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('persona.summary.generating')), personaState.personaSummaryError && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
  }, /*#__PURE__*/React.createElement("span", null, t('persona.summary.refresh_failed')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _retryPersonaSummary,
    disabled: summaryBusy || !canGeneratePersonaSummary,
    className: "rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-100 disabled:opacity-50"
  }, t('persona.summary.retry'))), !hasRenderableSummaryContent && !summaryBusy && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-900"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold"
  }, t('persona.summary.no_usable_content')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _retryPersonaSummary,
    disabled: !canGeneratePersonaSummary,
    className: "mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 font-bold hover:bg-amber-100 disabled:opacity-50"
  }, t('persona.summary.retry'))), summaryOverview && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "persona-summary-overview",
    className: "rounded-xl border border-violet-100 bg-violet-50 p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "persona-summary-overview",
    className: "mb-2 text-xs font-black uppercase tracking-wider text-violet-700"
  }, t('persona.summary.overview')), /*#__PURE__*/React.createElement("p", {
    className: "leading-relaxed text-slate-700"
  }, summaryOverview)), summaryInsights.length > 0 && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "persona-summary-insights"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "persona-summary-insights",
    className: "mb-3 text-sm font-black uppercase tracking-wider text-slate-700"
  }, t('persona.summary.key_insights')), /*#__PURE__*/React.createElement("ol", {
    className: "grid gap-3 md:grid-cols-2"
  }, summaryInsights.map((item, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    className: "rounded-xl border border-indigo-100 bg-white p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold leading-relaxed text-slate-800"
  }, item.text), item.evidence && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 border-l-2 border-indigo-200 pl-3 text-xs leading-relaxed text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, t('persona.summary.evidence'), ":"), " ", item.evidence), item.confidence && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[11px] font-bold uppercase tracking-wide text-indigo-600"
  }, t('persona.summary.confidence', {
    value: item.confidence
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 md:grid-cols-2"
  }, summarySections.map(section => /*#__PURE__*/React.createElement("section", {
    key: section.key,
    className: "rounded-xl border border-slate-200 bg-slate-50 p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mb-2 text-xs font-black uppercase tracking-wider text-slate-700"
  }, section.title), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700"
  }, section.items.map((item, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx
  }, item)))))), summaryVerificationNote && /*#__PURE__*/React.createElement("aside", {
    className: "rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mb-1 text-xs font-black uppercase tracking-wider"
  }, t('persona.summary.verification_note')), /*#__PURE__*/React.createElement("p", null, summaryVerificationNote)), summaryGeneratedAtLabel && /*#__PURE__*/React.createElement("p", {
    className: "text-right text-[11px] text-slate-500"
  }, t('persona.summary.generated_at', {
    date: summaryGeneratedAtLabel
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "flex min-h-[16rem] flex-col items-center justify-center gap-4 text-center text-slate-600"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 36,
    className: "text-violet-400"
  }), /*#__PURE__*/React.createElement("p", null, t('persona.summary.empty')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _retryPersonaSummary,
    disabled: !canGeneratePersonaSummary || summaryBusy,
    className: "rounded-lg bg-violet-700 px-4 py-2 font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
  }, t('persona.summary.generate_btn')))), /*#__PURE__*/React.createElement("footer", {
    className: "flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:flex-wrap sm:justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setIsPersonaSummaryOpen(false),
    className: "w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:w-auto"
  }, t('persona.summary.back_to_chat')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _savePersonaTranscript,
    disabled: (personaState.chatHistory || []).length === 0 || personaState.isLoading || transcriptSavePending,
    "aria-busy": transcriptSavePending ? 'true' : 'false',
    className: "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 sm:w-auto"
  }, transcriptSavePending ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 15,
    className: "animate-spin motion-reduce:animate-none"
  }), " Saving private session...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Save, {
    size: 15
  }), " Save private session with narration")), personaSummary && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: _retryPersonaSummary,
    disabled: summaryBusy || !canGeneratePersonaSummary,
    "aria-busy": summaryBusy ? 'true' : 'false',
    className: "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50 sm:w-auto"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 15,
    className: summaryBusy ? 'animate-spin motion-reduce:animate-none' : ''
  }), " ", summaryBusy ? t('persona.summary.generating') : t('persona.summary.regenerate'))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PersonaChatView = PersonaChatView;
  window.AlloModules.ViewPersonaChatModule = true;
})();
