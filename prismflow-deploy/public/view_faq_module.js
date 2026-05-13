/**
 * AlloFlow View - FAQ Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='faq' block.
 * Source range (post-OutlineView): lines 31815-31963 (149 lines).
 * Renders the FAQ view: question/answer cards with edit mode,
 * sentence-level TTS playback highlighting, translation lines.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.FaqView) {
    console.log('[CDN] ViewFaqModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewFaqModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');

  function FaqView(props) {
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isPlaying = props.isPlaying;
  var playingContentId = props.playingContentId;
  var voiceSpeed = props.voiceSpeed;
  var isTeacherMode = props.isTeacherMode;
  var isEditingFaq = props.isEditingFaq;
  var leveledTextLanguage = props.leveledTextLanguage;
  var playbackState = props.playbackState;
  // Refs
  var audioRef = props.audioRef;
  var playbackSessionRef = props.playbackSessionRef;
  // Setters
  var setVoiceSpeed = props.setVoiceSpeed;
  var setIsPlaying = props.setIsPlaying;
  var setPlayingContentId = props.setPlayingContentId;
  // Handlers
  var handleToggleIsEditingFaq = props.handleToggleIsEditingFaq;
  var handleFaqChange = props.handleFaqChange;
  var handleSpeak = props.handleSpeak;
  // Pure helpers
  var getRows = props.getRows;
  var splitTextToSentences = props.splitTextToSentences;
  var formatInteractiveText = props.formatInteractiveText;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, isPlaying && playingContentId === 'faq-active' && /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 z-20 bg-white/95 backdrop-blur shadow-sm rounded-lg p-3 mb-4 border border-cyan-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-2 w-2 rounded-full bg-cyan-500 animate-pulse"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-cyan-800"
  }, "Reading FAQ...")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-100 rounded-full px-2 py-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase font-bold text-slate-600"
  }, "Speed"), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.speed'),
    type: "range",
    min: "0.5",
    max: "2",
    step: "0.1",
    defaultValue: voiceSpeed,
    onChange: e => setVoiceSpeed(parseFloat(e.target.value)),
    className: "w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-cyan-500"
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.stop'),
    onClick: e => {
      e.stopPropagation();
      audioRef.current?.pause();
      playbackSessionRef.current = null;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setPlayingContentId(null);
    },
    className: "p-1.5 hover:bg-rose-100 text-rose-600 rounded-md transition-colors",
    title: t('common.stop')
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-xs uppercase px-1"
  }, "Stop")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-cyan-50 p-4 rounded-lg border border-cyan-100 mb-6 flex justify-between items-center flex-wrap gap-4",
    "data-help-key": "faq_goal_panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-cyan-800 max-w-xl"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Clarifying language and symbols. FAQs help anticipate misconceptions and provide quick reference."), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_faq'),
    onClick: handleToggleIsEditingFaq,
    "data-help-key": "faq_edit_toggle",
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingFaq ? 'bg-cyan-700 text-white hover:bg-cyan-700' : 'bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50'}`
  }, isEditingFaq ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingFaq ? t('common.done_editing') : t('faq.edit'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    let sentenceCounter = 0;
    return generatedContent?.data.map((faq, idx) => /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "bg-white p-5 rounded-lg border border-slate-400 shadow-sm",
      "data-help-key": "faq_item"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-cyan-100 text-cyan-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
    }, "Q"), /*#__PURE__*/React.createElement("div", {
      className: "flex-grow space-y-2"
    }, isEditingFaq ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('faq.edit_question') || 'Edit FAQ question',
      value: faq.question,
      onChange: e => handleFaqChange(idx, 'question', e.target.value),
      className: "w-full font-bold text-slate-800 text-lg bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(faq.question),
      placeholder: t('faq.question_placeholder')
    }), (faq.question_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('faq.edit_question_translation') || 'Edit FAQ question translation',
      value: faq.question_en || '',
      onChange: e => handleFaqChange(idx, 'question_en', e.target.value),
      className: "w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(faq.question_en || ''),
      placeholder: t('common.placeholder_question_trans')
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-50 p-3 rounded border-l-4 border-cyan-400 text-slate-600 text-sm space-y-2"
    }, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('faq.edit_answer') || 'Edit FAQ answer',
      value: faq.answer,
      onChange: e => handleFaqChange(idx, 'answer', e.target.value),
      className: "w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
      rows: getRows(faq.answer),
      placeholder: t('faq.answer_placeholder')
    }), (faq.answer_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('faq.edit_answer_translation') || 'Edit FAQ answer translation',
      value: faq.answer_en || '',
      onChange: e => handleFaqChange(idx, 'answer_en', e.target.value),
      className: "w-full text-xs text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all pt-2 border-t border-slate-200",
      rows: getRows(faq.answer_en || ''),
      placeholder: t('common.placeholder_answer_trans')
    }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-800 text-lg mb-1 leading-relaxed"
    }, (() => {
      const qSentences = splitTextToSentences(faq.question).filter(s => s && s.trim().length > 0);
      return qSentences.map((s, sIdx) => {
        const currentGlobalIdx = sentenceCounter;
        sentenceCounter++;
        const isActive = isPlaying && playingContentId === 'faq-active' && playbackState.currentIdx === currentGlobalIdx;
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: `sentence-${currentGlobalIdx}`,
          className: `transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-50'}`,
          onClick: e => {
            e.stopPropagation();
            handleSpeak(s, 'faq-active', currentGlobalIdx);
          }
        }, formatInteractiveText(s, false), " ");
      });
    })()), faq.question_en && /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600 italic mb-2"
    }, "(", faq.question_en, ")"), /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-50 p-3 rounded border-l-4 border-cyan-400 text-slate-600 text-sm leading-relaxed"
    }, (() => {
      const aSentences = splitTextToSentences(faq.answer).filter(s => s && s.trim().length > 0);
      return aSentences.map((s, sIdx) => {
        const currentGlobalIdx = sentenceCounter;
        sentenceCounter++;
        const isActive = isPlaying && playingContentId === 'faq-active' && playbackState.currentIdx === currentGlobalIdx;
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: `sentence-${currentGlobalIdx}`,
          className: `transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-100'}`,
          onClick: e => {
            e.stopPropagation();
            handleSpeak(s, 'faq-active', currentGlobalIdx);
          }
        }, formatInteractiveText(s, false), " ");
      });
    })(), faq.answer_en && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 italic"
    }, "(", faq.answer_en, ")")))))));
  })()));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FaqView = FaqView;
  window.AlloModules.ViewFaqModule = true;
})();
