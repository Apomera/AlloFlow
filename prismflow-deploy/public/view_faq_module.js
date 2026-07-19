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
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Pencil = _lazyIcon('Pencil');
var ChevronDown = _lazyIcon('ChevronDown');
var RefreshCw = _lazyIcon('RefreshCw');
var Volume2 = _lazyIcon('Volume2');
function FaqView(props) {
  // Accordion state — which FAQ items are currently expanded.
  // Editing mode + TTS playback force expansion separately (see isExpanded).
  var expandedSet_state = React.useState(function () {
    return new Set();
  });
  var expandedSet = expandedSet_state[0];
  var setExpandedSet = expandedSet_state[1];
  var toggleFaq = function (idx) {
    setExpandedSet(function (prev) {
      var next = new Set(prev);
      if (next.has(idx)) next.delete(idx);else next.add(idx);
      return next;
    });
  };
  var expandAll = function () {
    if (!props.generatedContent) return;
    var all = (props.generatedContent.data || []).map(function (_, i) {
      return i;
    });
    setExpandedSet(new Set(all));
  };
  var collapseAll = function () {
    setExpandedSet(new Set());
  };
  // State reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isPlaying = props.isPlaying;
  var playingContentId = props.playingContentId;
  var voiceSpeed = props.voiceSpeed;
  var isTeacherMode = props.isTeacherMode;
  var isEditingFaq = props.isEditingFaq;
  var leveledTextLanguage = props.leveledTextLanguage;
  var isGeneratingAudio = !!props.isGeneratingAudio;
  var selectedVoice = props.selectedVoice;
  var effectiveLanguage = props.effectiveLanguage || leveledTextLanguage || 'English';
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
  var prepState_state = React.useState({
    busy: false,
    done: 0,
    total: 0
  });
  var prepState = prepState_state[0];
  var setPrepState = prepState_state[1];
  var regenAudioKey_state = React.useState(null);
  var regenAudioKey = regenAudioKey_state[0];
  var setRegenAudioKey = regenAudioKey_state[1];
  var setAudioStatusTick = React.useState(0)[1];
  React.useEffect(function () {
    if (typeof window === 'undefined') return;
    var onAudioUpdate = function () {
      setAudioStatusTick(function (n) {
        return n + 1;
      });
    };
    window.addEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
    return function () {
      window.removeEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
    };
  }, []);
  var cleanSentenceForAudio = function (sentence) {
    try {
      var phaseK = window.AlloModules && window.AlloModules.PhaseKHelpers;
      if (phaseK && typeof phaseK.toSpokenText === 'function') {
        return phaseK.toSpokenText(sentence);
      }
    } catch (_) {}
    // Must mirror playSequence's textToSpeak cleaning (phase_k) — the store
    // key is derived from the cleaned sentence on BOTH sides, so a rule
    // present in one place but not the other orphans that sentence's audio.
    return String(sentence || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '').replace(/\[Source\s+\d+\]/gi, '').replace(/\[\d+\]/g, '').replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/__|_/g, '').replace(/~~/g, '').replace(/`/g, '').replace(/^>\s?/gm, '').replace(/^[-*+]\s/gm, '').replace(/^\d+\.\s/gm, '').replace(/\s+/g, ' ').trim();
  };
  var getReadAloudStore = function () {
    try {
      return window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
    } catch (_) {
      return null;
    }
  };
  var getReadAloudAudioStatus = function (sentence) {
    var st = getReadAloudStore();
    if (!st) return 'missing';
    try {
      var stored = !!st.has(sentence);
      if (!stored) return 'missing';
      if (typeof st.getCompatible !== 'function') return 'ready';
      var compatible = st.getCompatible(sentence, {
        voice: selectedVoice,
        language: effectiveLanguage
      });
      return compatible ? 'ready' : 'stale';
    } catch (_) {
      return 'missing';
    }
  };
  var getReadAloudAudioSummary = function (sentences) {
    var list = Array.isArray(sentences) ? sentences : [];
    return list.reduce(function (summary, sentence) {
      var status = getReadAloudAudioStatus(sentence);
      summary[status] += 1;
      return summary;
    }, {
      ready: 0,
      stale: 0,
      missing: 0,
      total: list.length
    });
  };
  var getFaqAudioSentences = function () {
    var data = generatedContent && Array.isArray(generatedContent.data) ? generatedContent.data : [];
    var list = [];
    data.forEach(function (faq) {
      if (faq && faq.question) list.push.apply(list, splitTextToSentences(faq.question));
      if (faq && faq.answer) list.push.apply(list, splitTextToSentences(faq.answer));
    });
    return list.map(cleanSentenceForAudio).filter(function (s) {
      return s && s.trim().length > 0;
    });
  };
  var handlePrepareFaqAudio = async function () {
    if (prepState.busy || typeof window.__alloPrepareReadAloud !== 'function') return;
    var sentences = getFaqAudioSentences();
    if (!sentences.length) return;
    setPrepState({
      busy: true,
      done: 0,
      total: sentences.length
    });
    try {
      await window.__alloPrepareReadAloud(sentences, function (done, total) {
        setPrepState({
          busy: true,
          done: done,
          total: total || sentences.length
        });
      });
    } finally {
      setPrepState({
        busy: false,
        done: 0,
        total: 0
      });
    }
  };
  var handleRegenerateFaqAudioSentence = async function (sentence, key) {
    if (!sentence || regenAudioKey || typeof window.__alloRegenerateSentenceAudio !== 'function') return;
    setRegenAudioKey(key);
    try {
      await window.__alloRegenerateSentenceAudio(cleanSentenceForAudio(sentence));
    } finally {
      setRegenAudioKey(null);
    }
  };
  var renderFaqEditAudioTools = function (text, keyPrefix) {
    if (!isTeacherMode || !isEditingFaq) return null;
    var sentences = splitTextToSentences(text).map(cleanSentenceForAudio).filter(function (s) {
      return s && s.trim().length > 0;
    });
    if (!sentences.length) return null;
    var summary = getReadAloudAudioSummary(sentences);
    return /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 pt-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700"
    }, /*#__PURE__*/React.createElement("span", null, "TTS ", summary.ready, "/", summary.total, " ready", summary.stale > 0 ? `; ${summary.stale} stale` : ''), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-500 normal-case font-semibold"
    }, "Click to regenerate")), sentences.map(function (sentence, sIdx) {
      var key = keyPrefix + '-' + sIdx;
      var busy = regenAudioKey === key;
      var audioStatus = getReadAloudAudioStatus(sentence);
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        type: "button",
        onClick: () => handleRegenerateFaqAudioSentence(sentence, key),
        disabled: !!regenAudioKey,
        className: `inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none ${audioStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : audioStatus === 'stale' ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`,
        title: `${audioStatus === 'ready' ? 'TTS ready' : audioStatus === 'stale' ? 'TTS saved with different settings' : 'TTS missing'} - ${t('immersive.regenerate_sentence_tip') || 'Regenerate sentence audio'}: ${sentence.slice(0, 90)}`,
        "aria-label": `${audioStatus === 'ready' ? 'Ready TTS' : audioStatus === 'stale' ? 'Stale TTS' : 'Missing TTS'} for FAQ sentence ${sIdx + 1}. Regenerate audio.`
      }, busy ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : audioStatus === 'ready' ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 12
      }) : audioStatus === 'stale' ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, sIdx + 1));
    }));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, isPlaying && playingContentId === 'faq-active' && /*#__PURE__*/React.createElement("div", {
    className: "sticky top-0 z-20 bg-white/95 backdrop-blur shadow-sm rounded-lg p-3 mb-4 border border-cyan-100 flex items-center justify-between animate-in motion-reduce:animate-none fade-in slide-in-from-top-2",
    "aria-busy": isGeneratingAudio
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    "aria-busy": isGeneratingAudio
  }, isGeneratingAudio ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 15,
    className: "animate-spin motion-reduce:animate-none text-cyan-600 shrink-0",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-cyan-800"
  }, "Loading FAQ audio...")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-2 w-2 rounded-full bg-cyan-500 animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-cyan-800"
  }, "Reading FAQ..."))), /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Clarifying language and symbols. FAQs help anticipate misconceptions and provide quick reference."), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (prepState.busy) {
        window.__alloPrepareReadAloudCancel = true;
        return;
      }
      handlePrepareFaqAudio();
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50 transition-all shadow-sm",
    title: prepState.busy ? t('common.stop') || 'Stop' : t('immersive.prepare_all') || 'Save TTS',
    "aria-label": prepState.busy ? t('common.stop') || 'Stop saving TTS' : t('immersive.prepare_all') || 'Save TTS'
  }, prepState.busy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 14
  }), prepState.busy ? `${prepState.done}/${prepState.total || '...'} ✕` : 'Save TTS'), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_faq'),
    onClick: handleToggleIsEditingFaq,
    "data-help-key": "faq_edit_toggle",
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingFaq ? 'bg-cyan-700 text-white hover:bg-cyan-700' : 'bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50'}`
  }, isEditingFaq ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingFaq ? t('common.done_editing') : t('faq.edit')))),
  // Show all / Hide all controls (only when not editing — teacher needs everything visible to edit)
  !isEditingFaq && generatedContent?.data?.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: expandAll,
    className: "px-3 py-1 text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full hover:bg-cyan-100 transition-colors",
    "aria-label": t("a11y.show_all_faq")
  }, "▾ Show all"), /*#__PURE__*/React.createElement("button", {
    onClick: collapseAll,
    className: "px-3 py-1 text-xs font-semibold bg-white text-slate-600 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors",
    "aria-label": t("a11y.hide_all_faq")
  }, "▸ Hide all"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-500 italic ml-1"
  }, "Tip: tap a question to reveal its answer")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    // PASS 1: precompute sentence index ranges per FAQ so we can derive
    // which FAQ contains the currently-playing TTS sentence (used to
    // auto-expand the matching item).
    var data = generatedContent && generatedContent.data || [];
    var rangeStart = [];
    var rangeEnd = [];
    var _sCount = 0;
    data.forEach(function (faq, idx) {
      rangeStart[idx] = _sCount;
      var qN = splitTextToSentences(faq.question).filter(function (s) {
        return s && s.trim().length > 0;
      }).length;
      var aN = splitTextToSentences(faq.answer).filter(function (s) {
        return s && s.trim().length > 0;
      }).length;
      _sCount += qN + aN;
      rangeEnd[idx] = _sCount;
    });
    var currentlyReadingFaqIdx = -1;
    if (isPlaying && playingContentId === 'faq-active' && playbackState && typeof playbackState.currentIdx === 'number') {
      for (var ri = 0; ri < rangeStart.length; ri++) {
        if (playbackState.currentIdx >= rangeStart[ri] && playbackState.currentIdx < rangeEnd[ri]) {
          currentlyReadingFaqIdx = ri;
          break;
        }
      }
    }
    // Side-effect: TTS auto-expand. When the reader reaches a new FAQ,
    // persist that index into the expanded set so the answer is visible.
    // Effect runs in render closure — safe because setState is no-op when
    // value is already present.
    React.useEffect(function () {
      if (currentlyReadingFaqIdx >= 0 && !expandedSet.has(currentlyReadingFaqIdx)) {
        setExpandedSet(function (prev) {
          if (prev.has(currentlyReadingFaqIdx)) return prev;
          var next = new Set(prev);
          next.add(currentlyReadingFaqIdx);
          return next;
        });
      }
    }, [currentlyReadingFaqIdx]);
    // PASS 2: actual render. Sentence indices come from rangeStart[idx] so
    // they stay stable regardless of which FAQs are expanded/collapsed.
    return generatedContent?.data.map((faq, idx) => {
      var isExpanded = isEditingFaq || expandedSet.has(idx) || idx === currentlyReadingFaqIdx;
      var qSentencesForCount = splitTextToSentences(faq.question).filter(function (s) {
        return s && s.trim().length > 0;
      });
      var qBase = rangeStart[idx] || 0;
      var aBase = qBase + qSentencesForCount.length;
      return /*#__PURE__*/React.createElement("div", {
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
      }), renderFaqEditAudioTools(faq.question, 'faq-' + idx + '-question'), (faq.question_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
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
      }), renderFaqEditAudioTools(faq.answer, 'faq-' + idx + '-answer'), (faq.answer_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
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
          const currentGlobalIdx = qBase + sIdx;
          const isActive = isPlaying && playingContentId === 'faq-active' && playbackState.currentIdx === currentGlobalIdx;
          return /*#__PURE__*/React.createElement("button", {
            type: "button",
            key: sIdx,
            id: `sentence-${currentGlobalIdx}`,
            "aria-label": `Read sentence: ${s}`,
            className: `bg-transparent border-0 font-inherit text-inherit text-left transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-50'}`,
            onClick: e => {
              e.stopPropagation();
              handleSpeak(s, 'faq-active', currentGlobalIdx);
            }
          }, formatInteractiveText(s, false), " ");
        });
      })()), isExpanded && faq.question_en && /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-slate-600 italic mb-2"
      }, "(", faq.question_en, ")"), isExpanded && /*#__PURE__*/React.createElement("div", {
        id: `faq-answer-${idx}`,
        className: "bg-slate-50 p-3 rounded border-l-4 border-cyan-400 text-slate-600 text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200"
      }, (() => {
        const aSentences = splitTextToSentences(faq.answer).filter(s => s && s.trim().length > 0);
        return aSentences.map((s, sIdx) => {
          const currentGlobalIdx = aBase + sIdx;
          const isActive = isPlaying && playingContentId === 'faq-active' && playbackState.currentIdx === currentGlobalIdx;
          return /*#__PURE__*/React.createElement("button", {
            type: "button",
            key: sIdx,
            id: `sentence-${currentGlobalIdx}`,
            "aria-label": `Read sentence: ${s}`,
            className: `bg-transparent border-0 font-inherit text-inherit text-left transition-colors duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-100'}`,
            onClick: e => {
              e.stopPropagation();
              handleSpeak(s, 'faq-active', currentGlobalIdx);
            }
          }, formatInteractiveText(s, false), " ");
        });
      })(), faq.answer_en && /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 italic"
      }, "(", faq.answer_en, ")")))), !isEditingFaq && /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => toggleFaq(idx),
        "aria-expanded": isExpanded,
        "aria-controls": `faq-answer-${idx}`,
        "aria-label": isExpanded ? 'Collapse FAQ answer' : 'Expand FAQ answer',
        className: "shrink-0 mt-2 w-8 h-8 inline-flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      }, /*#__PURE__*/React.createElement(ChevronDown, {
        size: 20,
        "aria-hidden": "true",
        className: "transition-transform duration-200",
        style: {
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }
      }))));
    });
  })()));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FaqView = FaqView;
  window.AlloModules.ViewFaqModule = true;
})();
