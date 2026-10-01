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
  const label = (key, fallback) => {
    const value = typeof t === 'function' ? t(key) : '';
    return value && value !== key ? value : fallback;
  };
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
  var audioStatusState = React.useState(0);
  var audioStatusTick = audioStatusState[0],
    setAudioStatusTick = audioStatusState[1];
  var audioNoticeState = React.useState('');
  var audioNotice = audioNoticeState[0],
    setAudioNotice = audioNoticeState[1];
  var audioRequestRef = React.useRef(null);
  var audioResourceId = String(generatedContent?.id || generatedContent?.resourceId || generatedContent?.__alloUnsavedTtsToken || 'unsaved');
  var audioSpeed = typeof voiceSpeed === 'number' && Number.isFinite(voiceSpeed) && voiceSpeed > 0 ? voiceSpeed : 1;
  var audioProfile = {
    voice: selectedVoice || window.__alloSelectedVoice || 'Kore',
    language: effectiveLanguage,
    speed: audioSpeed,
    synthesisRate: audioSpeed,
    voiceResolverVersion: 2
  };
  var audioContext = JSON.stringify([audioResourceId, generatedContent?.data, audioProfile, window.__alloReadAloudProfileRevision]);
  var audioEditingRef = React.useRef(false);
  audioEditingRef.current = !!isTeacherMode && !!isEditingFaq;
  var audioContextRef = React.useRef(audioContext);
  audioContextRef.current = audioContext;
  React.useEffect(function () {
    setExpandedSet(new Set());
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    setPrepState({
      busy: false,
      done: 0,
      total: 0
    });
    setRegenAudioKey(null);
    setAudioNotice('');
    return function () {
      var request = audioRequestRef.current;
      audioRequestRef.current = null;
      if (request && request.controller) request.controller.abort();
    };
  }, [audioContext]);
  var isCurrentAudioRequest = function (request) {
    return audioRequestRef.current === request && audioContextRef.current === request.context && (request.kind !== 'sentence' || audioEditingRef.current);
  };
  React.useEffect(function () {
    if (audioEditingRef.current) return;
    var request = audioRequestRef.current;
    if (request?.kind === 'sentence') {
      audioRequestRef.current = null;
      request.controller?.abort();
      setRegenAudioKey(null);
      setAudioNotice('');
    }
  }, [isTeacherMode, isEditingFaq]);
  var audioStore = window.AlloModules?.KaraokeAudioStore?.current;
  React.useEffect(function () {
    var onAudioUpdate = function (event) {
      if (event?.detail?.resourceId != null && String(event.detail.resourceId) !== audioResourceId) return;
      setAudioStatusTick(function (n) {
        return n + 1;
      });
    };
    var events = ['alloflow:karaoke-audio-updated', 'alloflow:read-aloud-reconciled', 'alloflow:module-registry-changed'];
    events.forEach(function (name) {
      window.addEventListener(name, onAudioUpdate);
    });
    var unsubscribe = audioStore?.subscribe?.(onAudioUpdate);
    return function () {
      events.forEach(function (name) {
        window.removeEventListener(name, onAudioUpdate);
      });
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [audioResourceId, audioStore]);
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
  // Match the host's canonical question/answer locators and splitter. The
  // occurrence count spans the entire FAQ, after spoken-text normalization.
  var getFaqAudioEntries = function () {
    var entries = [],
      occurrences = new Map();
    var data = Array.isArray(generatedContent?.data) ? generatedContent.data : [];
    data.forEach(function (faq, faqIndex) {
      if (!faq) return;
      ['question', 'answer'].forEach(function (field) {
        var part = faq[field];
        if (!part || String(part).trim().startsWith('|') || String(part).includes('\n|')) return;
        var KS = window.AlloModules?.KaraokeAudioStore;
        var sentences;
        try {
          if (typeof KS?.splitSentences === 'function') sentences = KS.splitSentences(part);
        } catch (_) {}
        if (!Array.isArray(sentences)) sentences = splitTextToSentences(String(part));
        sentences.forEach(function (sentence, sentenceIndex) {
          var text = cleanSentenceForAudio(sentence);
          if (!text) return;
          var occurrence = occurrences.get(text) || 0;
          occurrences.set(text, occurrence + 1);
          entries.push({
            text: text,
            occurrence: occurrence,
            segmentId: 'faq/' + faqIndex + '/' + field + '/' + sentenceIndex,
            scopeId: 'main',
            language: effectiveLanguage,
            faqIndex: faqIndex,
            field: field,
            sentenceIndex: sentenceIndex
          });
        });
      });
    });
    return entries;
  };
  var faqAudioEntries = getFaqAudioEntries();
  var inspectFaqAudioEntry = function (entry) {
    try {
      var inspected = window.__alloInspectReadAloudAudio?.(entry, 'reference', {
        occurrence: entry.occurrence,
        profile: audioProfile
      });
      var segment = inspected?.segment;
      // A text-only/old-host result cannot certify the intended occurrence.
      if (segment && String(segment.resourceId) === audioResourceId && segment.segmentId === entry.segmentId && segment.spokenText === entry.text && ['ready', 'stale', 'missing', 'corrupt'].includes(inspected.status)) return inspected;
    } catch (_) {}
    return {
      status: 'unverified',
      source: null
    };
  };
  var getFaqAudioSentences = function () {
    return faqAudioEntries.map(function (entry) {
      return entry.text;
    });
  };
  var handlePrepareFaqAudio = async function () {
    if (audioRequestRef.current) return;
    if (typeof window.__alloPrepareReadAloud !== 'function') {
      setAudioNotice(label('faq.audio_tools_loading', 'Audio tools are still loading. Please try again.'));
      return;
    }
    var sentences = getFaqAudioSentences();
    if (!sentences.length) return;
    var request = {
      context: audioContext,
      controller: typeof AbortController === 'function' ? new AbortController() : null
    };
    audioRequestRef.current = request;
    setAudioNotice('');
    setPrepState({
      busy: true,
      done: 0,
      total: sentences.length
    });
    try {
      var result = await window.__alloPrepareReadAloud(sentences, function (done, total) {
        if (isCurrentAudioRequest(request)) setPrepState({
          busy: true,
          done: done,
          total: total || sentences.length
        });
      }, {
        signal: request.controller && request.controller.signal,
        entries: faqAudioEntries,
        profile: audioProfile
      });
      if (!isCurrentAudioRequest(request)) return;
      if (request.controller && request.controller.signal.aborted) {
        setAudioNotice(label('faq.audio_save_stopped', 'Audio saving stopped. Save TTS again to finish any missing clips.'));
      } else if (result && result.remaining) {
        setAudioNotice(label('faq.audio_save_incomplete', 'Some audio clips are still missing. Save TTS again to retry.'));
      } else if (result && result.ok) {
        setAudioNotice(label('faq.audio_prepared', 'Audio prepared. Check device save to confirm storage.'));
      } else {
        setAudioNotice(label('faq.audio_prepare_unconfirmed', 'Audio preparation was not confirmed. Try Save TTS again.'));
      }
      setAudioStatusTick(function (n) {
        return n + 1;
      });
    } catch (_) {
      if (isCurrentAudioRequest(request)) setAudioNotice(label(request.controller && request.controller.signal.aborted ? 'faq.audio_save_stopped' : 'faq.audio_save_failed', request.controller && request.controller.signal.aborted ? 'Audio saving stopped. Save TTS again to finish any missing clips.' : 'Audio could not be saved. Please try again.'));
    } finally {
      if (isCurrentAudioRequest(request)) {
        audioRequestRef.current = null;
        setPrepState({
          busy: false,
          done: 0,
          total: 0
        });
      }
    }
  };
  var handleRegenerateFaqAudioSentence = async function (entry) {
    if (!entry || audioRequestRef.current || !audioEditingRef.current) return;
    if (typeof window.__alloRegenerateSentenceAudio !== 'function' || inspectFaqAudioEntry(entry).status === 'unverified') {
      setAudioNotice(label('faq.audio_tools_loading', 'Audio tools are still loading. Please try again.'));
      return;
    }
    var request = {
      context: audioContext,
      kind: 'sentence',
      controller: new AbortController()
    };
    audioRequestRef.current = request;
    setRegenAudioKey(entry.segmentId);
    setAudioNotice('');
    try {
      var url = await window.__alloRegenerateSentenceAudio(entry, {
        occurrence: entry.occurrence,
        profile: audioProfile,
        signal: request.controller.signal
      });
      if (!url) throw new Error('No audio returned');
      if (isCurrentAudioRequest(request)) {
        setAudioStatusTick(function (n) {
          return n + 1;
        });
        setAudioNotice(label('faq.audio_sentence_prepared', 'Sentence audio ready. Check device save to confirm storage.'));
      }
    } catch (_) {
      if (isCurrentAudioRequest(request)) setAudioNotice(label('faq.audio_sentence_failed', 'Sentence audio could not be generated. Please try again.'));
    } finally {
      if (isCurrentAudioRequest(request)) {
        audioRequestRef.current = null;
        setRegenAudioKey(null);
      }
    }
  };
  var renderFaqEditAudioTools = function (faqIndex, field) {
    if (!isTeacherMode || !isEditingFaq) return null;
    var entries = faqAudioEntries.filter(function (entry) {
      return entry.faqIndex === faqIndex && entry.field === field;
    });
    if (!entries.length) return null;
    var rows = entries.map(function (entry) {
      return {
        entry: entry,
        inspection: inspectFaqAudioEntry(entry)
      };
    });
    var summary = rows.reduce(function (result, row) {
      result[row.inspection.status] += 1;
      return result;
    }, {
      total: rows.length,
      ready: 0,
      stale: 0,
      missing: 0,
      corrupt: 0,
      unverified: 0
    });
    var fieldName = label('faq.audio_' + field, field === 'question' ? 'question' : 'answer');
    var groupName = label('faq.audio_item', 'FAQ') + ' ' + (faqIndex + 1) + ', ' + fieldName;
    var summaryText = summary.unverified ? label('faq.audio_unverified', 'Playback readiness not verified') : 'TTS ' + summary.ready + '/' + summary.total + ' ' + label('faq.audio_ready', 'ready to play') + (summary.stale ? '; ' + summary.stale + ' ' + label('faq.audio_stale', 'settings changed') : '') + (summary.corrupt ? '; ' + summary.corrupt + ' ' + label('faq.audio_corrupt', 'need repair') : '');
    return /*#__PURE__*/React.createElement("div", {
      role: "group",
      "aria-label": groupName + ' ' + label('faq.audio_group', 'audio'),
      "data-faq-audio-group": faqIndex + '/' + field,
      className: "flex min-w-0 max-w-full flex-wrap gap-1.5 pt-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full min-w-0 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-cyan-700"
    }, /*#__PURE__*/React.createElement("span", null, summaryText), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-600 font-semibold"
    }, label('faq.audio_regenerate_hint', 'Select a sentence to regenerate audio'))), rows.map(function (row) {
      var entry = row.entry,
        status = row.inspection.status;
      var busy = regenAudioKey === entry.segmentId;
      var unavailable = !!regenAudioKey || prepState.busy || status === 'unverified' || typeof window.__alloRegenerateSentenceAudio !== 'function';
      var statusText = status === 'ready' ? label('faq.audio_ready', 'ready to play') : status === 'stale' ? label('faq.audio_settings_changed', 'stored audio; settings changed') : status === 'corrupt' ? label('faq.audio_repair', 'audio needs repair') : status === 'missing' ? label('faq.audio_missing', 'audio missing') : label('faq.audio_unverified', 'playback readiness not verified');
      var actionText = String(row.inspection.source || '').startsWith('human') ? label('faq.audio_replace_recording', 'Replace recording with generated audio') : label('faq.audio_regenerate', 'Regenerate audio');
      var name = groupName + ', ' + label('faq.audio_sentence', 'sentence') + ' ' + (entry.sentenceIndex + 1) + '. ' + statusText + '. ' + actionText + '.';
      return /*#__PURE__*/React.createElement("button", {
        key: entry.segmentId,
        type: "button",
        "data-faq-audio-entry": entry.segmentId,
        "data-audio-status": status,
        onClick: () => {
          if (!unavailable) handleRegenerateFaqAudioSentence(entry);
        },
        "aria-disabled": unavailable,
        "aria-busy": busy,
        className: 'min-h-11 min-w-11 max-w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border aria-disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors motion-reduce:transition-none ' + (status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : status === 'stale' || status === 'corrupt' ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'),
        title: name + ' ' + entry.text.slice(0, 90),
        "aria-label": name
      }, busy ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        "aria-hidden": "true",
        className: "animate-spin motion-reduce:animate-none"
      }) : status === 'ready' ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 12,
        "aria-hidden": "true"
      }) : status === 'stale' || status === 'corrupt' ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        "aria-hidden": "true"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12,
        "aria-hidden": "true"
      }), /*#__PURE__*/React.createElement("span", null, entry.sentenceIndex + 1));
    }), (summary.unverified > 0 || typeof window.__alloRegenerateSentenceAudio !== 'function') && /*#__PURE__*/React.createElement("p", {
      className: "w-full text-xs text-slate-600"
    }, label('faq.audio_identity_loading', 'Sentence audio tools are not ready. Try again after they finish loading.')));
  };
  var DeviceSaveStatus = window.AlloModules?.ResourceReadAloud?.DeviceSaveStatus;
  return /*#__PURE__*/React.createElement("div", {
    "data-faq-view": true,
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("style", null, "[data-faq-view] p, [data-faq-view] button, [data-faq-view] textarea, [data-faq-view] [data-faq-audio-group] { line-height: 1.5; }"), isTeacherMode && (DeviceSaveStatus ? /*#__PURE__*/React.createElement(DeviceSaveStatus, {
    resourceId: generatedContent?.id || generatedContent?.resourceId,
    contextKey: audioContext,
    entries: faqAudioEntries,
    profile: audioProfile,
    payload: generatedContent?.karaokeAudio,
    refreshToken: audioStatusTick,
    activePlayback: isPlaying && playingContentId === 'faq-active',
    t: t
  }) : /*#__PURE__*/React.createElement("p", {
    role: "status"
  }, label('faq.device_unverified', 'Device save not verified. Audio tools are still loading.'))), " ", audioNotice && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900"
  }, audioNotice), isPlaying && playingContentId === 'faq-active' && /*#__PURE__*/React.createElement("div", {
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
  }, label('faq.audio_loading', 'Loading FAQ audio...'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "h-2 w-2 rounded-full bg-cyan-500 animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-cyan-800"
  }, label('faq.audio_reading', 'Reading FAQ...')))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-slate-100 rounded-full px-2 py-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] uppercase font-bold text-slate-600"
  }, label('common.speed', 'Speed')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.speed'),
    type: "range",
    min: "0.5",
    max: "2",
    step: "0.1",
    value: voiceSpeed,
    "aria-valuetext": voiceSpeed + '×',
    onChange: e => setVoiceSpeed(parseFloat(e.target.value)),
    className: "w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-cyan-500"
  })), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.stop'),
    onClick: e => {
      e.stopPropagation();
      audioRef.current?.pause();
      playbackSessionRef.current = null;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      setPlayingContentId(null);
    },
    className: "p-1.5 hover:bg-rose-100 text-rose-800 rounded-md transition-colors",
    title: t('common.stop')
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-xs uppercase px-1"
  }, label('common.stop', 'Stop'))))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
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
        var request = audioRequestRef.current;
        if (request && request.controller) request.controller.abort();
        window.__alloPrepareReadAloudCancel = true;
        return;
      }
      handlePrepareFaqAudio();
    },
    disabled: !!regenAudioKey,
    "aria-busy": prepState.busy,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50 transition-all shadow-sm",
    title: prepState.busy ? t('common.stop') || 'Stop' : t('immersive.prepare_all') || 'Save TTS',
    "aria-label": prepState.busy ? t('common.stop') || 'Stop saving TTS' : t('immersive.prepare_all') || 'Save TTS'
  }, prepState.busy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 14
  }), prepState.busy ? `${prepState.done}/${prepState.total || '...'} ✕` : 'Save TTS'), /*#__PURE__*/React.createElement("button", {
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
  }, generatedContent.data.every(function (_, i) {
    return expandedSet.has(i);
  }) ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-toggle-all": true,
    onClick: collapseAll,
    className: "px-3 py-1 text-xs font-semibold bg-white text-slate-600 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "▸ "), label('faq.hide_all', 'Hide all')) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-toggle-all": true,
    onClick: expandAll,
    className: "px-3 py-1 text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full hover:bg-cyan-100 transition-colors"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "▾ "), label('faq.show_all', 'Show all')), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-500 italic ml-1"
  }, label('faq.disclosure_tip', 'Use the arrow to reveal an answer. Select a sentence to hear it aloud.'))), /*#__PURE__*/React.createElement("div", {
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
      }), renderFaqEditAudioTools(idx, 'question'), (faq.question_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
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
      }), renderFaqEditAudioTools(idx, 'answer'), (faq.answer_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
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
            className: `bg-transparent border-0 font-inherit text-inherit text-start transition-colors motion-reduce:transition-none duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-50'}`,
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
        className: "bg-slate-50 p-3 rounded border-l-4 border-cyan-400 text-slate-600 text-sm leading-relaxed animate-in motion-reduce:animate-none fade-in slide-in-from-top-1 duration-200"
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
            className: `bg-transparent border-0 font-inherit text-inherit text-start transition-colors motion-reduce:transition-none duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-100'}`,
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
        "aria-label": isExpanded ? label('faq.collapse_answer', 'Collapse FAQ answer') : label('faq.expand_answer', 'Expand FAQ answer'),
        className: "shrink-0 mt-2 min-w-11 min-h-11 inline-flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
