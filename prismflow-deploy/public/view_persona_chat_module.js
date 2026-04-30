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
  // State reads (scalar/boolean)
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
  var handlePersonaChatSubmit = props.handlePersonaChatSubmit;
  var handlePersonaTopicSpark = props.handlePersonaTopicSpark;
  var handleRetryPortraitGeneration = props.handleRetryPortraitGeneration;
  var handleSavePersonaChat = props.handleSavePersonaChat;
  var handleSaveReflection = props.handleSaveReflection;
  var handleSetIsPersonaReflectionOpenToFalse = props.handleSetIsPersonaReflectionOpenToFalse;
  var handleSetPersonaDefinitionDataToNull = props.handleSetPersonaDefinitionDataToNull;
  var handleSpeak = props.handleSpeak;
  var handleTogglePersonaAutoSend = props.handleTogglePersonaAutoSend;
  var handleToggleShowPersonaHints = props.handleToggleShowPersonaHints;
  var stopPlayback = props.stopPlayback;
  // Pure helpers
  var splitTextToSentences = props.splitTextToSentences;
  var formatInteractiveText = props.formatInteractiveText;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var CharacterColumn = props.CharacterColumn;
  var HarmonyMeter = props.HarmonyMeter;
  return /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Interview Interface encountered an error. Please close and reopen."
  }, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300",
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative border-4 border-yellow-200 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[85vh]"
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
  }, (personaState.selectedCharacters?.[0]?.accumulatedXP || 0) + (personaState.selectedCharacters?.[1]?.accumulatedXP || 0)), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600"
  }, t('common.xp')))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-lg transition-all duration-500"
  }, /*#__PURE__*/React.createElement(HarmonyMeter, {
    score: personaState.harmonyScore ?? 10
  })), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "persona_close",
    "data-help-ignore": true,
    onClick: handleClosePersonaChat,
    className: "absolute right-4 p-2 text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 px-4 py-2 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    onClick: () => {
      const newState = !personaAutoRead;
      setPersonaAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${personaAutoRead ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on'),
    "data-help-key": "persona_auto_read"
  }, personaAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "animate-pulse"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_read_label'))), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "persona_auto_send",
    onClick: handleTogglePersonaAutoSend,
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${personaAutoSend ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send')
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 16,
    className: personaAutoSend ? "fill-current" : ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_send'))), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-slate-300 mx-1"
  }), isPersonaFreeResponse && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.show'),
    "data-help-key": "persona_show_hints",
    onClick: handleToggleShowPersonaHints,
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${!showPersonaHints ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip')
  }, showPersonaHints ? /*#__PURE__*/React.createElement(Eye, {
    size: 16
  }) : /*#__PURE__*/React.createElement(EyeOff, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, showPersonaHints ? t('persona.hints_on') : t('persona.hints_off'))), (isTeacherMode || studentProjectSettings.allowPersonaFreeResponse) && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.message'),
    "data-help-key": "persona_response_mode",
    onClick: () => {
      const newMode = !isPersonaFreeResponse;
      setIsPersonaFreeResponse(newMode);
      if (!newMode) setShowPersonaHints(true);
    },
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${!isPersonaFreeResponse ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')
  }, isPersonaFreeResponse ? /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, isPersonaFreeResponse ? t('persona.mode_free_label') : t('persona.mode_mc_label'))), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "persona_topic_spark",
    onClick: handlePersonaTopicSpark,
    disabled: personaState.isLoading || (personaState.topicSparkCount || 0) >= 2,
    className: `p-2 rounded-lg border shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${(personaState.topicSparkCount || 0) >= 2 ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'}`,
    title: `Get a topic suggestion (${2 - (personaState.topicSparkCount || 0)} remaining)`
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 16,
    className: personaState.isLoading ? "animate-pulse" : ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-slate-300 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.save'),
    "data-help-key": "persona_save_chat",
    onClick: handleSavePersonaChat,
    disabled: personaState.chatHistory.length === 0,
    className: "p-2 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
    title: t('persona.save_tooltip')
  }, /*#__PURE__*/React.createElement(Save, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    "data-help-key": "persona_conclude",
    onClick: () => {
      handleGenerateReflectionPrompt();
      setIsPersonaReflectionOpen(true);
    },
    disabled: !((personaState.harmonyScore || 0) >= 50 || (personaState.selectedCharacters?.[0]?.accumulatedXP || 0) + (personaState.selectedCharacters?.[1]?.accumulatedXP || 0) >= 100),
    className: `flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md active:scale-95 transition-all text-xs font-bold ${(personaState.harmonyScore || 0) >= 50 || (personaState.selectedCharacters?.[0]?.accumulatedXP || 0) + (personaState.selectedCharacters?.[1]?.accumulatedXP || 0) >= 100 ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'}`,
    title: t('persona.conclude_tooltip')
  }, (personaState.harmonyScore || 0) >= 50 || (personaState.selectedCharacters?.[0]?.accumulatedXP || 0) + (personaState.selectedCharacters?.[1]?.accumulatedXP || 0) >= 100 ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Lock, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('persona.conclude_button')))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-1/4 min-w-[250px] border-r border-slate-200 bg-white flex flex-col p-4 overflow-hidden hidden md:flex"
  }, /*#__PURE__*/React.createElement(CharacterColumn, {
    character: personaState.selectedCharacters[0],
    side: "left",
    onRetryPortrait: handleRetryPortraitGeneration
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col bg-slate-50/50 relative min-w-[320px]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar",
    ref: personaScrollRef,
    role: "log",
    "aria-live": "polite",
    "aria-label": "Interview conversation"
  }, personaState.chatHistory.map((msg, idx) => {
    const isUser = msg.role === 'user';
    const isCharB = !isUser && msg.speakerName === personaState.selectedCharacters[1]?.name;
    const speakerLabel = isUser ? 'You' : msg.speakerName;
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: `flex flex-col ${isUser ? 'items-end' : isCharB ? 'items-end' : 'items-start'}`,
      "aria-label": speakerLabel + ' said: ' + msg.text.substring(0, 100)
    }, /*#__PURE__*/React.createElement("div", {
      className: `max-w-[85%] p-4 rounded-2xl text-sm shadow-sm leading-relaxed border ${isUser ? 'bg-indigo-100 text-indigo-900 border-indigo-200 rounded-br-none' : isCharB ? 'bg-rose-50 text-slate-800 border-rose-200 rounded-br-none mr-2' : 'bg-white text-slate-700 border-slate-200 rounded-bl-none ml-2'}`,
      "aria-label": !isUser ? 'Message from ' + speakerLabel + '. Click any sentence to hear it read aloud.' : undefined
    }, isUser ? msg.text.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1') : (() => {
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
          const isMessagePlaying = playingContentId === `persona-message-${idx}`;
          const isActive = isMessagePlaying && currentGlobalIdx === playbackState.currentIdx;
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
            className: `transition-colors duration-200 rounded px-1 py-0.5 cursor-pointer hover:bg-yellow-100 ${isActive ? 'bg-yellow-300 text-black shadow-sm' : ''} ${isHeader ? 'font-bold block mt-1' : ''}`,
            title: t('common.click_to_read'),
            "aria-label": `Sentence ${currentGlobalIdx + 1}. Click to read aloud.`
          }, formatInteractiveText(cleanText.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')), " ");
        }));
      });
    })(), !isUser && /*#__PURE__*/React.createElement("span", {
      className: "block text-[11px] text-slate-600 mt-1 opacity-70"
    }, "\uD83D\uDD0A Click any sentence to listen")), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-600 mt-1 px-1 font-bold uppercase tracking-wider"
    }, speakerLabel));
  }), personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white px-4 py-2 rounded-full border border-slate-400 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600 animate-pulse"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }), " ", t('persona.status_deliberating'))), panelTtsPending.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200 flex items-center gap-2 text-xs font-medium text-violet-600 animate-pulse"
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 12,
    className: "animate-bounce"
  }), " Waiting to speak...")), personaDefinitionData && /*#__PURE__*/React.createElement("div", {
    className: "fixed z-[9999] bg-white rounded-xl shadow-2xl border-2 border-indigo-200 p-4 max-w-sm animate-in zoom-in-95 duration-150",
    style: {
      left: Math.min(personaDefinitionData.x + 10, window.innerWidth - 320),
      top: Math.min(personaDefinitionData.y + 10, window.innerHeight - 150)
    },
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg text-indigo-600"
  }, personaDefinitionData.word), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close_definition'),
    onClick: handleSetPersonaDefinitionDataToNull,
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  }))), isPersonaDefining ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-slate-600 text-sm"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }), "Looking up definition...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed mb-3"
  }, personaDefinitionData.text), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    onClick: () => handleSpeak(personaDefinitionData.text, 'persona-definition', 0),
    className: "flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full"
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 12
  }), " Speak Definition")))), (personaState.panelSuggestions || []).length > 0 && !personaState.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 text-center mb-3 font-medium"
  }, t('persona.panel_choose_response')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 lg:grid-cols-3 gap-1.5"
  }, personaState.panelSuggestions.map((opt, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: e => {
      const btn = e.currentTarget;
      const feedbackColor = opt.tier === 'good' ? 'bg-emerald-200 border-emerald-400' : opt.tier === 'poor' ? 'bg-rose-200 border-rose-400' : 'bg-amber-200 border-amber-400';
      btn.className = btn.className.replace(/bg-indigo-50|border-indigo-200|hover:bg-indigo-100|hover:border-indigo-300/g, '') + ' ' + feedbackColor;
      setTimeout(() => {
        setPersonaState(prev => ({
          ...prev,
          panelSuggestions: []
        }));
        handlePanelChatSubmit(opt.text);
      }, 400);
    },
    className: "text-left px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all duration-300 shadow-sm hover:scale-[1.01] active:scale-[0.99] bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300"
  }, /*#__PURE__*/React.createElement("span", {
    className: "opacity-50 mr-2"
  }, String.fromCharCode(65 + i), "."), opt.text)))) : /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-white border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_persona_input'),
    value: personaInput,
    onChange: e => setPersonaInput(e.target.value),
    onKeyDown: e => e.key === 'Enter' && handlePanelChatSubmit(personaInput),
    className: "flex-1 p-3 border-2 border-indigo-600 rounded-xl focus:border-indigo-400 outline-none transition-all placeholder:text-slate-600",
    placeholder: t('persona.panel_question_placeholder'),
    disabled: personaState.isLoading
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": personaState.isLoading ? 'Waiting for response...' : 'Send message to interview subject',
    "aria-busy": personaState.isLoading ? 'true' : 'false',
    onClick: () => handlePanelChatSubmit(personaInput),
    disabled: !personaInput.trim() || personaState.isLoading,
    className: "bg-indigo-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  }, personaState.isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 20
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "w-1/4 min-w-[250px] border-l border-slate-200 bg-white flex flex-col p-4 overflow-hidden hidden md:flex"
  }, /*#__PURE__*/React.createElement(CharacterColumn, {
    character: personaState.selectedCharacters[1],
    side: "right",
    onRetryPortrait: handleRetryPortraitGeneration
  }))), isPersonaReflectionOpen && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col p-8 animate-in fade-in duration-300"
  }, reflectionFeedback ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-in zoom-in duration-300"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 40,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800"
  }, t('persona.reflection_complete') || 'Great Reflection!'), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm"
  }, reflectionFeedback.subjectName)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-black text-indigo-600 mb-2"
  }, reflectionFeedback.score, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl text-indigo-400"
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider"
  }, t('persona.quality_score') || 'Quality Score')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-md"
  }, /*#__PURE__*/React.createElement(Star, {
    size: 24,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-yellow-600"
  }, "+", reflectionFeedback.xpEarned, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-yellow-700 font-medium"
  }, t('persona.xp_earned') || 'Experience Earned'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 12
  }), " ", t('persona.teacher_feedback') || 'Teacher Feedback'), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none",
    dangerouslySetInnerHTML: {
      __html: (reflectionFeedback.feedback || '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-expanded": isPersonaReflectionOpen,
    onClick: () => {
      setReflectionFeedback(null);
      setIsPersonaReflectionOpen(false);
      setPersonaReflectionInput('');
      setPersonaState(prev => ({
        ...prev,
        selectedCharacter: null,
        chatHistory: [],
        suggestions: [],
        selectedCharacters: [],
        mode: 'single',
        harmonyScore: 10
      }));
    },
    className: "w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 22
  }), " ", t('common.continue') || 'Continue'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 32
  })), /*#__PURE__*/React.createElement("h2", {
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
    className: "flex items-center gap-2 text-indigo-500 text-sm italic"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }), " ", t('persona.status_generating_prompt')) : /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 text-sm leading-relaxed"
  }, dynamicReflectionQuestion || t('persona.default_reflection_prompt'))), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('persona.reflection_input') || 'Write your reflection',
    value: personaReflectionInput,
    onChange: e => setPersonaReflectionInput(e.target.value),
    placeholder: t('persona.reflection_placeholder'),
    className: "w-full h-48 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-600",
    disabled: isGradingReflection
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSetIsPersonaReflectionOpenToFalse,
    disabled: isGradingReflection,
    className: "flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  }, t('persona.back_to_chat')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.submit_reflection_for_grading'),
    onClick: handleSaveReflection,
    disabled: !personaReflectionInput.trim() || isGradingReflection,
    className: "flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  }, isGradingReflection ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 18,
    className: "text-yellow-400 fill-current"
  }), isGradingReflection ? t('persona.status_grading') : t('persona.submit_xp')))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col items-center text-center overflow-y-auto shrink-0 z-10 relative custom-scrollbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-48 h-72 md:w-80 md:h-[28rem] bg-yellow-100 rounded-2xl border-4 border-white shadow-xl overflow-hidden mb-6 shrink-0 relative group"
  }, personaState.avatarUrl && /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: personaState.avatarUrl,
    alt: personaState.selectedCharacter.name,
    className: `w-full h-full object-cover transition-all duration-500 hover:scale-105 ${personaState.isImageLoading ? 'blur-[2px] opacity-90 scale-105' : ''}`,
    style: {
      objectPosition: 'top center'
    }
  }), personaState.isImageLoading && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center z-20 bg-black/10 backdrop-blur-[1px] transition-all"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/30 shadow-lg"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 32,
    className: "text-white animate-spin drop-shadow-md"
  }))), !personaState.avatarUrl && !personaState.isImageLoading && /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col items-center justify-center gap-3 p-4"
  }, /*#__PURE__*/React.createElement(History, {
    size: 64,
    className: "text-yellow-300/50"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleRetryPortraitGeneration(personaState.selectedCharacter),
    className: "bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-4 py-2 rounded-full text-sm text-slate-600 group-hover:text-indigo-700 transition-colors flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
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
    className: "absolute top-2 left-2 text-slate-200 fill-current"
  }), "\"", personaState.selectedCharacter.context, "\""), /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-end mb-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-widest"
  }, "Trust / Rapport"), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold ${(personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 70 ? 'text-green-600' : (personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 30 ? 'text-yellow-600' : 'text-red-500'}`
  }, personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport, "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all duration-500 ease-out ${(personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 70 ? 'bg-green-500' : (personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport) >= 30 ? 'bg-yellow-400' : 'bg-red-500'}`,
    style: {
      width: `${personaState.selectedCharacter.rapport ?? personaState.selectedCharacter.initialRapport}%`
    }
  }))), personaState.selectedCharacter.quests && personaState.selectedCharacter.quests.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6 text-left"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12
  }), " Secrets to Uncover"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, personaState.selectedCharacter.quests.map((quest, qIdx) => /*#__PURE__*/React.createElement("div", {
    key: qIdx,
    className: `p-3 rounded-lg border text-xs transition-all ${quest.isCompleted ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-100 text-slate-600'}`
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
  }, "Requires ", quest.difficulty, "% Trust")))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col h-full bg-white relative min-w-0"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleClosePersonaChat,
    className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-50",
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
  }, personaState.selectedCharacter?.accumulatedXP || 0), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600"
  }, "/ 300"))), /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500",
    style: {
      width: `${Math.min(100, (personaState.selectedCharacter?.accumulatedXP || 0) / 300 * 100)}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.volume'),
    "data-help-key": "persona_auto_read",
    onClick: () => {
      const newState = !personaAutoRead;
      setPersonaAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${personaAutoRead ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoRead ? t('persona.auto_read_off') : t('persona.auto_read_on')
  }, personaAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "animate-pulse"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_read_label'))), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "persona_auto_send",
    onClick: handleTogglePersonaAutoSend,
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${personaAutoSend ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: personaAutoSend ? t('persona.turn_off_auto_send') : t('persona.turn_on_auto_send')
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 16,
    className: personaAutoSend ? "fill-current" : ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, t('persona.auto_send'))), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-6 bg-slate-300 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.show'),
    "data-help-key": "persona_hints_toggle",
    onClick: handleToggleShowPersonaHints,
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${!showPersonaHints ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: showPersonaHints ? t('persona.hints_hide_tooltip') : t('persona.hints_show_tooltip')
  }, showPersonaHints ? /*#__PURE__*/React.createElement(Eye, {
    size: 16
  }) : /*#__PURE__*/React.createElement(EyeOff, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, showPersonaHints ? t('persona.hints_on') : t('persona.hints_off'))), (isTeacherMode || studentProjectSettings.allowPersonaFreeResponse) && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.message'),
    "data-help-key": "persona_response_mode",
    onClick: () => {
      const newMode = !isPersonaFreeResponse;
      setIsPersonaFreeResponse(newMode);
      if (!newMode) setShowPersonaHints(true);
    },
    className: `p-2 rounded-lg border transition-all flex items-center gap-2 ${!isPersonaFreeResponse ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm ring-1 ring-purple-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`,
    title: isPersonaFreeResponse ? t('persona.mode_switch_mc') : t('persona.mode_switch_free')
  }, isPersonaFreeResponse ? /*#__PURE__*/React.createElement(MessageSquare, {
    size: 16
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold hidden sm:inline"
  }, isPersonaFreeResponse ? t('persona.mode_free_label') : t('persona.mode_mc_label'))), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "persona_topic_spark",
    onClick: handlePersonaTopicSpark,
    disabled: personaState.isLoading || (personaState.topicSparkCount || 0) >= 2,
    className: `p-2 rounded-lg border shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${(personaState.topicSparkCount || 0) >= 2 ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'}`,
    title: t('persona.topic_spark_tooltip', {
      remaining: 2 - (personaState.topicSparkCount || 0)
    }),
    "aria-label": t('persona.topic_spark_tooltip', {
      remaining: 2 - (personaState.topicSparkCount || 0)
    })
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 16,
    className: personaState.isLoading ? "animate-pulse" : ""
  })), /*#__PURE__*/React.createElement("button", {
    "data-help-key": "persona_save_chat",
    onClick: handleSavePersonaChat,
    disabled: personaState.chatHistory.length === 0,
    className: "p-2 rounded-lg bg-white text-slate-600 border border-slate-400 shadow-sm hover:bg-slate-50 hover:border-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    title: t('persona.chat_save'),
    "aria-label": t('persona.chat_save')
  }, /*#__PURE__*/React.createElement(Save, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    "data-help-key": "persona_conclude",
    onClick: () => {
      handleGenerateReflectionPrompt();
      setIsPersonaReflectionOpen(true);
    },
    disabled: !((personaState.selectedCharacter?.rapport || 0) >= 50 || (personaState.selectedCharacter?.accumulatedXP || 0) >= 100),
    className: `flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md active:scale-95 transition-all text-xs font-bold ${(personaState.selectedCharacter?.rapport || 0) >= 50 || (personaState.selectedCharacter?.accumulatedXP || 0) >= 100 ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'}`,
    title: (personaState.selectedCharacter?.rapport || 0) >= 50 || (personaState.selectedCharacter?.accumulatedXP || 0) >= 100 ? t('persona.conclude_tooltip') : t('persona.conclude_locked')
  }, (personaState.selectedCharacter?.rapport || 0) >= 50 || (personaState.selectedCharacter?.accumulatedXP || 0) >= 100 ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Lock, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('persona.conclude_button'))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar",
    ref: personaScrollRef,
    role: "log",
    "aria-live": "polite",
    "aria-label": "Interview conversation with character"
  }, (!personaState.chatHistory || personaState.chatHistory.length === 0) && /*#__PURE__*/React.createElement("div", {
    className: "text-center py-10 text-slate-600 italic"
  }, t('persona.empty_chat_instruction')), (personaState.chatHistory || []).map((msg, idx) => {
    const isUser = msg.role === 'user';
    let bubbleClass = 'bg-white text-slate-700 border-slate-200 rounded-bl-none font-serif text-base';
    let speakerName = isUser ? t('common.you') : personaState.selectedCharacter?.name || t('common.character');
    let avatarUrl = null;
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
      className: "w-8 h-8 rounded-full overflow-hidden border border-slate-400 shadow-sm bg-white"
    }, /*#__PURE__*/React.createElement("img", {
      loading: "lazy",
      src: avatarUrl,
      alt: speakerName,
      className: "w-full h-full object-cover"
    }))), /*#__PURE__*/React.createElement("div", {
      className: `p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${bubbleClass}`
    }, (() => {
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
          const isMessagePlaying = playingContentId === `persona-message-${idx}`;
          const isActive = isMessagePlaying && currentGlobalIdx === playbackState.currentIdx;
          const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
          const isHeader = s.trim().startsWith('#') || isHtmlHeader;
          const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
          return /*#__PURE__*/React.createElement("span", {
            key: sIdx,
            onClick: e => {
              e.stopPropagation();
              handleSpeak(msg.text, `persona-message-${idx}`, currentGlobalIdx);
            },
            className: `transition-colors duration-200 rounded px-1 py-0.5 cursor-pointer hover:bg-yellow-100 ${isActive ? 'bg-yellow-300 text-black shadow-sm' : ''} ${isHeader ? 'font-bold block mt-1' : ''}`,
            title: t('common.click_to_read')
          }, formatInteractiveText(cleanText), " ");
        }));
      });
    })())), /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] text-slate-600 mt-1 px-1 font-bold uppercase tracking-wider ${!isUser && avatarUrl ? 'ml-11' : ''}`
    }, speakerName));
  }), personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded-2xl border border-slate-400 rounded-bl-none text-xs text-slate-600 italic flex items-center gap-2 shadow-sm animate-pulse"
  }, /*#__PURE__*/React.createElement(History, {
    size: 14,
    className: "animate-spin text-yellow-600"
  }), t('persona.status_thinking', {
    name: personaState.selectedCharacter?.name
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-t border-slate-100 flex flex-col shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
  }, isPersonaFreeResponse && !showPersonaHints && !personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-2 pb-0 flex justify-center animate-in slide-in-from-bottom-2 fade-in"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm transition-colors ${!personaTurnHintsViewed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`
  }, !personaTurnHintsViewed ? t('persona.hard_mode_active') : t('persona.hints_viewed_status'))), (showPersonaHints || !isPersonaFreeResponse) && (personaState.suggestions || []).length > 0 && !personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: `px-4 pt-3 flex gap-2 ${isPersonaFreeResponse ? 'overflow-x-auto no-scrollbar pb-1' : 'flex-wrap pb-4 justify-center'}`
  }, personaState.suggestions.map((q, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => handlePersonaChatSubmit(q),
    className: `whitespace-normal text-left px-3 py-2 text-xs font-bold rounded-xl border transition-colors shadow-sm ${isPersonaFreeResponse ? 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 flex-shrink-0' : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100 w-full sm:w-[48%] py-3 text-sm'}`
  }, !isPersonaFreeResponse && /*#__PURE__*/React.createElement("span", {
    className: "mr-2 opacity-50"
  }, String.fromCharCode(65 + i), "."), q))), isPersonaFreeResponse && /*#__PURE__*/React.createElement("div", {
    className: "p-4 flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_persona_input'),
    type: "text",
    value: personaInput,
    onChange: e => setPersonaInput(e.target.value),
    onKeyDown: e => e.key === 'Enter' && !personaState.isLoading && handlePanelChatSubmit(),
    placeholder: t('persona.character_question_placeholder', {
      name: personaState.selectedCharacter?.name
    }),
    className: "flex-grow text-sm p-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
    autoFocus: true,
    disabled: personaState.isLoading
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": personaState.isLoading ? 'Waiting for response...' : 'Send question to ' + (personaState.selectedCharacter?.name || 'character'),
    "aria-busy": personaState.isLoading ? 'true' : 'false',
    onClick: () => handlePersonaChatSubmit(),
    disabled: !personaInput.trim() || personaState.isLoading,
    className: "bg-yellow-500 hover:bg-yellow-600 text-indigo-900 font-bold p-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
  }, personaState.isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 20
  }))), !isPersonaFreeResponse && personaState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "p-8 text-center text-slate-600 italic text-xs flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }), " ", t('persona.status_generating_options'))), isPersonaReflectionOpen && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col p-8 animate-in fade-in duration-300"
  }, reflectionFeedback ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg animate-in zoom-in duration-300"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 40,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800"
  }, t('persona.reflection_complete') || 'Great Reflection!'), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm"
  }, reflectionFeedback.subjectName)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-black text-indigo-600 mb-2"
  }, reflectionFeedback.score, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl text-indigo-400"
  }, "/100")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider"
  }, t('persona.quality_score') || 'Quality Score')), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-md"
  }, /*#__PURE__*/React.createElement(Star, {
    size: 24,
    className: "fill-current"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-yellow-600"
  }, "+", reflectionFeedback.xpEarned, " XP"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-yellow-700 font-medium"
  }, t('persona.xp_earned') || 'Experience Earned'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 12
  }), " ", t('persona.teacher_feedback') || 'Teacher Feedback'), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none",
    dangerouslySetInnerHTML: {
      __html: (reflectionFeedback.feedback || '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>')
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    onClick: () => {
      setReflectionFeedback(null);
      setIsPersonaReflectionOpen(false);
      setPersonaReflectionInput('');
      setPersonaState(prev => ({
        ...prev,
        selectedCharacter: null,
        chatHistory: [],
        suggestions: [],
        selectedCharacters: [],
        mode: 'single'
      }));
    },
    className: "w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 22
  }), " ", t('common.continue') || 'Continue'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 32
  })), /*#__PURE__*/React.createElement("h2", {
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
    className: "flex items-center gap-2 text-indigo-600 font-medium animate-pulse"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin"
  }), " ", t('persona.generating_question')) : /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 font-medium"
  }, dynamicReflectionQuestion || `What is one surprising thing you learned from ${personaState.selectedCharacter?.name}, and how does it connect to what you already knew?`)), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('persona.reflection_input') || 'Write your reflection',
    value: personaReflectionInput,
    "data-help-key": "persona_reflection_input",
    onChange: e => setPersonaReflectionInput(e.target.value),
    placeholder: t('persona.reflection_placeholder'),
    className: "w-full h-48 p-4 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm leading-relaxed resize-none disabled:bg-slate-50 disabled:text-slate-600",
    disabled: isGradingReflection
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: handleSetIsPersonaReflectionOpenToFalse,
    "data-help-key": "persona_back_btn",
    disabled: isGradingReflection,
    className: "flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  }, t('persona.back_to_chat')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.submit_reflection_for_grading'),
    onClick: handleSaveReflection,
    "data-help-key": "persona_submit_btn",
    disabled: !personaReflectionInput.trim() || isGradingReflection,
    className: "flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  }, isGradingReflection ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 18,
    className: "text-yellow-400 fill-current"
  }), isGradingReflection ? t('persona.status_grading') : t('persona.submit_xp'))))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PersonaChatView = PersonaChatView;
  window.AlloModules.ViewPersonaChatModule = true;
})();
