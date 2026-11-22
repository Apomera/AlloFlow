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

  function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Companion language belongs to the saved artifact, independent of current app settings.
function _faqTranslationAttributes(artifact) {
  const api = typeof window !== 'undefined' ? window.AlloModules?.TextPipelineHelpers : null;
  if (typeof api?.getArtifactTranslationTextAttributes === 'function') return api.getArtifactTranslationTextAttributes(artifact);
  const target = [artifact?.config?.translationPolicy?.target, artifact?.translationPolicy?.target, artifact?.translationTarget, artifact?.config?.translationTarget, artifact?.config?.attachedTranslationTarget].find(value => typeof value === 'string' && value.trim()) || 'English';
  const helpers = typeof window !== 'undefined' ? window.AlloModules?.ModuleScopeExtras : null;
  const lang = helpers?.getSpeechLangCode?.(target) || (typeof window !== 'undefined' ? window.AlloFlowLang?.bcp47Full?.(target) : null) || (/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(target) ? target : target === 'English' ? 'en' : 'und');
  return {
    lang,
    dir: helpers?.getContentDirection?.(target) || 'auto',
    style: {
      textAlign: 'start'
    }
  };
}
var _lazyIcon = function (name) {
  return function (props) {
    var I = typeof window !== 'undefined' && window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Pencil = _lazyIcon('Pencil');
var ChevronDown = _lazyIcon('ChevronDown');
var RefreshCw = _lazyIcon('RefreshCw');
var Volume2 = _lazyIcon('Volume2');
var Plus = _lazyIcon('Plus');
var Trash2 = _lazyIcon('Trash2');
var ArrowUp = _lazyIcon('ArrowUp');
var ArrowDown = _lazyIcon('ArrowDown');
var Undo2 = _lazyIcon('Undo2');
function FaqView(props) {
  props = props || {};
  var faqMountedRef = React.useRef(true);
  var copyTimerRef = React.useRef(null);
  var crisisNotice_state = React.useState('');
  var crisisNotice = crisisNotice_state[0];
  var setCrisisNotice = crisisNotice_state[1];
  React.useEffect(function () {
    faqMountedRef.current = true;
    return function () {
      faqMountedRef.current = false;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);
  // Accordion state — which FAQ items are currently expanded.
  // Editing mode + TTS playback force expansion separately (see isExpanded).
  var expandedSet_state = React.useState(function () {
    return new Set();
  });
  var expandedSet = expandedSet_state[0];
  var setExpandedSet = expandedSet_state[1];
  var lastRemovedFaq_state = React.useState(null);
  var lastRemovedFaq = lastRemovedFaq_state[0];
  var setLastRemovedFaq = lastRemovedFaq_state[1];
  var copiedFaqIdx_state = React.useState(-1);
  var copiedFaqIdx = copiedFaqIdx_state[0];
  var setCopiedFaqIdx = copiedFaqIdx_state[1];
  // Search & Active-Recall Self-Check state (student/reading study flow; inert in edit mode).
  var searchQuery_state = React.useState('');
  var searchQuery = searchQuery_state[0];
  var setSearchQuery = searchQuery_state[1];
  var studyMode_state = React.useState(false);
  var studyMode = studyMode_state[0];
  var setStudyMode = studyMode_state[1];
  var studyFilter_state = React.useState('all');
  var studyFilter = studyFilter_state[0];
  var setStudyFilter = studyFilter_state[1];
  var studyStorageKey = 'alloflow:faq-study:' + String(props.generatedContent?.id || props.generatedContent?.resourceId || 'default');
  var readStudyMarks = function (key) {
    try {
      var raw = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      var clean = {};
      Object.keys(parsed).forEach(function (k) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
        if (parsed[k] === 'got-it' || parsed[k] === 'review') clean[k] = parsed[k];
      });
      return clean;
    } catch (_) {
      return {};
    }
  };
  var studyMarks_state = React.useState(function () {
    return readStudyMarks(studyStorageKey);
  });
  var studyMarks = studyMarks_state[0];
  var setStudyMarks = studyMarks_state[1];
  var tryDrafts_state = React.useState({});
  var tryDrafts = tryDrafts_state[0];
  var setTryDrafts = tryDrafts_state[1];
  var scanFaqRecall = function (text) {
    var clean = String(text || '').trim();
    if (!clean || typeof window === 'undefined') return;
    try {
      var selHub = window.SelHub;
      var safetyChecker = window.SafetyContentChecker;
      var res = selHub && typeof selHub.safeRehearseCheck === 'function' ? selHub.safeRehearseCheck(clean, {
        toolId: 'view_faq_self_check'
      }) : safetyChecker && typeof safetyChecker.check === 'function' ? safetyChecker.check(clean) : null;
      if (res && (res.action === 'block' || res.tier >= 3 || res.blocked === true)) {
        setCrisisNotice('It sounds like you may be going through a difficult time. Please talk with a trusted adult, school counselor, or call/text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line).');
      }
    } catch (_) {}
  };
  var updateStudyMark = function (idx, status) {
    setStudyMarks(function (prev) {
      var next = Object.assign({}, prev);
      if (next[idx] === status || !status) delete next[idx];else next[idx] = status;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          if (Object.keys(next).length) window.localStorage.setItem(studyStorageKey, JSON.stringify(next));else window.localStorage.removeItem(studyStorageKey);
        }
      } catch (_) {}
      return next;
    });
  };
  var clearStudyMarks = function () {
    setStudyMarks({});
    setStudyFilter('all');
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(studyStorageKey);
    } catch (_) {}
  };
  var handleCopyFaqItem = function (faq, idx) {
    if (!faq) return;
    var qText = String(faq.question || '').trim();
    var aText = String(faq.answer || '').trim();
    var evText = String(faq.evidence || faq.quote || faq.sourceRef || '').trim();
    var full = ['Q: ' + qText, 'A: ' + aText, evText ? 'Source evidence: ' + evText : ''].filter(Boolean).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      Promise.resolve(navigator.clipboard.writeText(full)).then(function () {
        if (!faqMountedRef.current) return;
        setCopiedFaqIdx(idx);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(function () {
          copyTimerRef.current = null;
          if (faqMountedRef.current) setCopiedFaqIdx(function (cur) {
            return cur === idx ? -1 : cur;
          });
        }, 2000);
      }).catch(function () {});
    }
  };
  var toggleFaq = function (idx) {
    if (tryDrafts && tryDrafts[idx]) scanFaqRecall(tryDrafts[idx]);
    setExpandedSet(function (prev) {
      var next = new Set(prev);
      if (next.has(idx)) next.delete(idx);else next.add(idx);
      return next;
    });
  };
  var expandAll = function () {
    if (!props.generatedContent) return;
    var raw = Array.isArray(props.generatedContent.data) ? props.generatedContent.data : [];
    var visible = props.isTeacherMode || props.isEditingFaq ? raw : raw.filter(function (item) {
      return item && item.isSelected !== false && item.selected !== false;
    });
    var all = visible.map(function (_, i) {
      return i;
    });
    setExpandedSet(new Set(all));
  };
  var collapseAll = function () {
    setExpandedSet(new Set());
  };
  // State reads
  var t = typeof props.t === 'function' ? props.t : function (k) {
    return k;
  };
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
  var getRows = typeof props.getRows === 'function' ? props.getRows : function (v) {
    return Math.max(2, String(v || '').split('\n').length);
  };
  var splitTextToSentences = typeof props.splitTextToSentences === 'function' ? props.splitTextToSentences : function (s) {
    return String(s || '').trim() ? [String(s)] : [];
  };
  var formatInteractiveText = typeof props.formatInteractiveText === 'function' ? props.formatInteractiveText : function (s) {
    return s;
  };
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
  var audioNoticeState = React.useState('');
  var audioNotice = audioNoticeState[0],
    setAudioNotice = audioNoticeState[1];
  var audioRequestRef = React.useRef(null);
  var audioResourceId = String(generatedContent?.id || generatedContent?.resourceId || generatedContent?.__alloUnsavedTtsToken || 'unsaved');
  var audioSpeed = typeof voiceSpeed === 'number' && Number.isFinite(voiceSpeed) && voiceSpeed > 0 ? voiceSpeed : 1;
  var audioProfile = {
    voice: selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore',
    language: effectiveLanguage,
    speed: audioSpeed,
    synthesisRate: audioSpeed,
    voiceResolverVersion: 2
  };
  var audioContext = JSON.stringify([audioResourceId, generatedContent?.data, audioProfile, typeof window !== 'undefined' ? window.__alloReadAloudProfileRevision : 0]);
  var audioEditingRef = React.useRef(false);
  audioEditingRef.current = !!isTeacherMode && !!isEditingFaq;
  var audioContextRef = React.useRef(audioContext);
  audioContextRef.current = audioContext;
  React.useEffect(function () {
    setExpandedSet(new Set());
    setLastRemovedFaq(null);
    setSearchQuery('');
    setStudyFilter('all');
    setTryDrafts({});
    setCrisisNotice('');
    setStudyMarks(readStudyMarks(studyStorageKey));
  }, [studyStorageKey]);
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
  var audioStore = typeof window !== 'undefined' ? window.AlloModules?.KaraokeAudioStore?.current : null;
  React.useEffect(function () {
    if (typeof window === 'undefined') return undefined;
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
  var isFaqAudioAiBlocked = function () {
    if (typeof window === 'undefined') return false;
    return window.__alloAiSecretsLocked === true || window.__alloStudentAiDisabled === true || window._alloQrBlocked === true;
  };
  var handlePrepareFaqAudio = async function () {
    if (audioRequestRef.current) return;
    if (isFaqAudioAiBlocked()) {
      setAudioNotice(label('faq.audio_ai_locked', 'AI audio generation is currently off or locked.'));
      return;
    }
    if (typeof window === 'undefined' || typeof window.__alloPrepareReadAloud !== 'function') {
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
        setAudioNotice(label('faq.audio_saved', 'Audio is saved for all FAQ sentences.'));
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
    if (isFaqAudioAiBlocked()) {
      setAudioNotice(label('faq.audio_ai_locked', 'AI audio generation is currently off or locked.'));
      return;
    }
    if (typeof window === 'undefined' || typeof window.__alloRegenerateSentenceAudio !== 'function' || inspectFaqAudioEntry(entry).status === 'unverified') {
      setAudioNotice(label('faq.audio_tools_loading', 'Audio tools are still loading. Please try again.'));
      return;
    }
    var request = {
      context: audioContext,
      kind: 'sentence',
      controller: typeof AbortController === 'function' ? new AbortController() : null
    };
    audioRequestRef.current = request;
    setRegenAudioKey(entry.segmentId);
    setAudioNotice('');
    try {
      var url = await window.__alloRegenerateSentenceAudio(entry, {
        occurrence: entry.occurrence,
        profile: audioProfile,
        signal: request.controller && request.controller.signal
      });
      if (!url) throw new Error('No audio returned');
      if (isCurrentAudioRequest(request)) {
        setAudioStatusTick(function (n) {
          return n + 1;
        });
        setAudioNotice(label('faq.audio_sentence_saved', 'Sentence audio saved.'));
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
      className: "w-full min-w-0 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-cyan-700"
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
        className: 'min-h-11 min-w-11 max-w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-bold border aria-disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors motion-reduce:transition-none ' + (status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : status === 'stale' || status === 'corrupt' ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'),
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
  var rawFaqItems = Array.isArray(generatedContent?.data) ? generatedContent.data : [];
  var visibleFaqEntries = [];
  rawFaqItems.forEach(function (item, rawIdx) {
    if (isTeacherMode || isEditingFaq || item && item.isSelected !== false && item.selected !== false) {
      visibleFaqEntries.push({
        item: item,
        rawIdx: rawIdx
      });
    }
  });
  var faqItems = visibleFaqEntries.map(function (entry) {
    return entry.item;
  });
  var faqSignature = JSON.stringify(faqItems);
  var canMutateFaqList = typeof handleFaqChange === 'function' && !!handleFaqChange.supportsList;
  React.useEffect(function () {
    if (lastRemovedFaq && lastRemovedFaq.after !== faqSignature) setLastRemovedFaq(null);
  }, [faqSignature, lastRemovedFaq]);
  var replaceFaqList = function (nextList, removedMeta) {
    if (!canMutateFaqList) return;
    handleFaqChange('__list__', null, nextList);
    setLastRemovedFaq(removedMeta || null);
  };
  var handleAddFaqItem = function () {
    if (!canMutateFaqList) return;
    var blank = leveledTextLanguage !== 'English' ? {
      question: '',
      answer: '',
      question_en: '',
      answer_en: ''
    } : {
      question: '',
      answer: ''
    };
    replaceFaqList(faqItems.concat([blank]), null);
  };
  var handleRemoveFaqItem = function (idx) {
    if (!canMutateFaqList || idx < 0 || idx >= faqItems.length) return;
    var item = faqItems[idx];
    var nextList = faqItems.filter(function (_, i) {
      return i !== idx;
    });
    replaceFaqList(nextList, {
      item: item,
      index: idx,
      after: JSON.stringify(nextList)
    });
  };
  var handleMoveFaqItem = function (idx, delta) {
    if (!canMutateFaqList) return;
    var target = idx + delta;
    if (idx < 0 || idx >= faqItems.length || target < 0 || target >= faqItems.length) return;
    var nextList = faqItems.slice();
    var moved = nextList[idx];
    nextList[idx] = nextList[target];
    nextList[target] = moved;
    replaceFaqList(nextList, null);
  };
  var handleUndoRemoveFaq = function () {
    if (!canMutateFaqList || !lastRemovedFaq || lastRemovedFaq.after !== faqSignature) return;
    var nextList = faqItems.slice();
    var insertAt = Math.min(Math.max(0, lastRemovedFaq.index), nextList.length);
    nextList.splice(insertAt, 0, lastRemovedFaq.item);
    replaceFaqList(nextList, null);
  };
  // PASS 1: precompute sentence index ranges over rawFaqItems (matching
  // handleSpeak's unfiltered 'faq-active' queue) and project them onto
  // visibleFaqEntries so deselecting an earlier FAQ never shifts later audio.
  var rawRangeStart = [];
  var rawRangeEnd = [];
  var _sCount = 0;
  rawFaqItems.forEach(function (faq, rawIdx) {
    rawRangeStart[rawIdx] = _sCount;
    var qN = faq && faq.question ? splitTextToSentences(faq.question).filter(function (s) {
      return s && s.trim().length > 0;
    }).length : 0;
    var aN = faq && faq.answer ? splitTextToSentences(faq.answer).filter(function (s) {
      return s && s.trim().length > 0;
    }).length : 0;
    _sCount += qN + aN;
    rawRangeEnd[rawIdx] = _sCount;
  });
  var rangeStart = visibleFaqEntries.map(function (entry) {
    return rawRangeStart[entry.rawIdx];
  });
  var rangeEnd = visibleFaqEntries.map(function (entry) {
    return rawRangeEnd[entry.rawIdx];
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
  // TTS auto-expand: when the reader reaches a new FAQ, persist that index
  // into the expanded set so the answer stays visible. Top-level hook (rules of hooks).
  React.useEffect(function () {
    if (currentlyReadingFaqIdx >= 0) {
      setExpandedSet(function (prev) {
        if (prev.has(currentlyReadingFaqIdx)) return prev;
        var next = new Set(prev);
        next.add(currentlyReadingFaqIdx);
        return next;
      });
    }
  }, [currentlyReadingFaqIdx]);
  var faqQuestionName = function (faq) {
    return String(faq && faq.question || '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  };
  var normalizedQuery = !isEditingFaq ? String(searchQuery || '').trim().toLowerCase() : '';
  var gotItCount = faqItems.reduce(function (n, _, i) {
    return n + (studyMarks[i] === 'got-it' ? 1 : 0);
  }, 0);
  var reviewCount = faqItems.reduce(function (n, _, i) {
    return n + (studyMarks[i] === 'review' ? 1 : 0);
  }, 0);
  var reviewedCount = gotItCount + reviewCount;
  var filteredFaqEntries = faqItems.map(function (faq, idx) {
    return {
      faq: faq,
      idx: idx
    };
  }).filter(function (entry) {
    if (isEditingFaq) return true;
    if (studyMode && studyFilter === 'got-it' && studyMarks[entry.idx] !== 'got-it') return false;
    if (studyMode && studyFilter === 'review' && studyMarks[entry.idx] !== 'review') return false;
    if (normalizedQuery) {
      var hay = [entry.faq?.question, entry.faq?.answer, entry.faq?.question_en, entry.faq?.answer_en, entry.faq?.evidence, entry.faq?.quote, entry.faq?.sourceRef].filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(normalizedQuery) === -1) return false;
    }
    return true;
  });
  var allDisplayedExpanded = filteredFaqEntries.length > 0 && filteredFaqEntries.every(function (entry) {
    return expandedSet.has(entry.idx);
  });
  return /*#__PURE__*/React.createElement("div", {
    "data-faq-view": true,
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("style", null, "[data-faq-view] p, [data-faq-view] button, [data-faq-view] textarea, [data-faq-view] [data-faq-audio-group] { line-height: 1.5; }"), crisisNotice && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    "data-faq-crisis-notice": true,
    className: "rounded-lg border-2 border-rose-500 bg-rose-50 p-3 text-sm font-semibold text-rose-900"
  }, crisisNotice), audioNotice && /*#__PURE__*/React.createElement("p", {
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
    className: "text-xs uppercase font-bold text-slate-600"
  }, label('common.speed', 'Speed')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.speed'),
    type: "range",
    min: "0.5",
    max: "2",
    step: "0.1",
    value: voiceSpeed,
    "aria-valuetext": voiceSpeed + '×',
    onChange: e => {
      if (typeof setVoiceSpeed === 'function') setVoiceSpeed(parseFloat(e.target.value));
    },
    className: "w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-cyan-500"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.stop'),
    onClick: e => {
      e.stopPropagation();
      if (audioRef && audioRef.current && typeof audioRef.current.pause === 'function') audioRef.current.pause();
      if (playbackSessionRef) playbackSessionRef.current = null;
      if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') window.AlloSpeechPlayer.stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      if (typeof setIsPlaying === 'function') setIsPlaying(false);
      if (typeof setPlayingContentId === 'function') setPlayingContentId(null);
    },
    className: "min-h-11 min-w-11 inline-flex items-center justify-center p-1.5 hover:bg-rose-100 text-rose-800 rounded-md transition-colors",
    title: t('common.stop')
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-xs uppercase px-1"
  }, label('common.stop', 'Stop'))))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-cyan-50 p-4 rounded-lg border border-cyan-100 mb-6 flex justify-between items-center flex-wrap gap-4",
    "data-help-key": "faq_goal_panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-cyan-800 max-w-xl"
  }, /*#__PURE__*/React.createElement("strong", null, label('faq.udl_goal_label', 'UDL Goal:')), " ", label('faq.udl_goal_desc', 'Clarifying language and symbols. FAQs help anticipate misconceptions and provide quick reference.')), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (prepState.busy) {
        var request = audioRequestRef.current;
        if (request && request.controller) request.controller.abort();
        if (typeof window !== 'undefined') window.__alloPrepareReadAloudCancel = true;
        return;
      }
      handlePrepareFaqAudio();
    },
    disabled: !!regenAudioKey,
    "aria-busy": prepState.busy,
    className: "min-h-11 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition-all shadow-sm",
    title: prepState.busy ? label('common.stop', 'Stop') : label('faq.save_audio', 'Save audio'),
    "aria-label": prepState.busy ? label('faq.stop_saving_audio', 'Stop saving audio') : label('faq.save_audio', 'Save audio')
  }, prepState.busy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    "aria-hidden": "true",
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 14,
    "aria-hidden": "true"
  }), prepState.busy ? `${prepState.done}/${prepState.total || '...'} ✕` : label('faq.save_audio', 'Save audio')), isEditingFaq && canMutateFaqList && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-add": true,
    onClick: handleAddFaqItem,
    className: "min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-cyan-800 border border-cyan-300 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition-colors shadow-sm"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14,
    "aria-hidden": "true"
  }), t('faq.add_question') || 'Add question'), isEditingFaq && canMutateFaqList && lastRemovedFaq && lastRemovedFaq.after === faqSignature && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-undo": true,
    onClick: handleUndoRemoveFaq,
    className: "min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 transition-colors shadow-sm"
  }, /*#__PURE__*/React.createElement(Undo2, {
    size: 14,
    "aria-hidden": "true"
  }), t('faq.undo_remove') || 'Undo remove'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (typeof handleToggleIsEditingFaq === 'function') handleToggleIsEditingFaq();
    },
    "data-help-key": "faq_edit_toggle",
    className: `min-h-11 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${isEditingFaq ? 'bg-cyan-700 text-white hover:bg-cyan-700' : 'bg-white text-cyan-700 border border-cyan-200 hover:bg-cyan-50'}`
  }, isEditingFaq ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14,
    "aria-hidden": "true"
  }), isEditingFaq ? t('common.done_editing') : t('faq.edit')))),
  // Show all / Hide all + Self-Check & Search controls (only when not editing — teacher needs everything visible to edit)
  !isEditingFaq && faqItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, allDisplayedExpanded ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-toggle-all": true,
    onClick: collapseAll,
    className: "min-h-11 px-3 py-1 text-xs font-semibold bg-white text-slate-600 border border-slate-300 rounded-full hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition-colors motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "▸ "), label('faq.hide_all', 'Hide all')) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-toggle-all": true,
    onClick: expandAll,
    className: "min-h-11 px-3 py-1 text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 transition-colors motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "▾ "), label('faq.show_all', 'Show all')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-study-mode": true,
    "aria-pressed": studyMode,
    onClick: function () {
      setStudyMode(function (prev) {
        var next = !prev;
        if (next) {
          setExpandedSet(new Set());
        } else {
          setStudyFilter('all');
        }
        return next;
      });
    },
    className: `min-h-11 px-3 py-1 text-xs font-bold rounded-full border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 ${studyMode ? 'bg-indigo-700 text-white border-indigo-700 hover:bg-indigo-800' : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50'}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, studyMode ? '✓ ' : '🧠 '), studyMode ? label('faq.study_mode_on', 'Self-Check On') : label('faq.study_mode', 'Self-Check Mode')), faqItems.length >= 3 && /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 min-w-[11rem] max-w-xs"
  }, /*#__PURE__*/React.createElement("input", {
    type: "search",
    "data-faq-search": true,
    value: searchQuery,
    onChange: function (e) {
      setSearchQuery(e.target.value);
    },
    placeholder: label('faq.search_placeholder', 'Search questions...'),
    "aria-label": label('faq.search_aria', 'Search FAQ questions and answers'),
    className: "w-full min-h-11 rounded-full border border-slate-300 bg-white pl-3.5 pr-11 py-1.5 text-xs text-slate-800 placeholder:text-slate-500 focus:border-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
  }), searchQuery && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-search-clear": true,
    onClick: function () {
      setSearchQuery('');
    },
    "aria-label": label('faq.clear_search', 'Clear search'),
    className: "absolute right-0.5 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "✕"))), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600 italic ml-1"
  }, label('faq.disclosure_tip', 'Choose Show answer to reveal it. Use Listen to hear a question; select an answer sentence to hear it.'))), studyMode && /*#__PURE__*/React.createElement("div", {
    "data-faq-study-bar": true,
    className: "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-indigo-900 mr-1",
    role: "status",
    "aria-live": "polite"
  }, label('faq.study_progress', 'Checked {done} of {total}').replace('{done}', String(reviewedCount)).replace('{total}', String(faqItems.length))), [['all', label('faq.filter_all', 'All') + ' (' + faqItems.length + ')'], ['review', label('faq.filter_review', 'Review again') + ' (' + reviewCount + ')'], ['got-it', label('faq.filter_got_it', 'Got it') + ' (' + gotItCount + ')']].map(function (pair) {
    var fKey = pair[0],
      fLabel = pair[1];
    return /*#__PURE__*/React.createElement("button", {
      key: fKey,
      type: "button",
      "data-faq-study-filter": fKey,
      "aria-pressed": studyFilter === fKey,
      onClick: function () {
        setStudyFilter(fKey);
      },
      className: `min-h-11 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${studyFilter === fKey ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100'}`
    }, fLabel);
  })), reviewedCount > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-faq-study-reset": true,
    onClick: clearStudyMarks,
    className: "min-h-11 px-2.5 py-1 rounded-full text-xs font-semibold text-indigo-800 hover:bg-indigo-100 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, label('faq.reset_checks', 'Reset checks'))), normalizedQuery && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    className: "text-xs font-semibold text-cyan-900"
  }, label('faq.search_count', 'Showing {shown} of {total} questions').replace('{shown}', String(filteredFaqEntries.length)).replace('{total}', String(faqItems.length)))), faqItems.length === 0 && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "data-faq-empty": true,
    className: "rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, label('faq.empty', 'No questions are available yet.')), isTeacherMode && /*#__PURE__*/React.createElement("p", {
    className: "mt-1"
  }, label('faq.empty_teacher_hint', 'Generate the FAQ again to create questions.'))), !isEditingFaq && faqItems.length > 0 && filteredFaqEntries.length === 0 && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "data-faq-no-matches": true,
    className: "rounded-xl border border-slate-300 bg-slate-50 p-5 text-center space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-700"
  }, label('faq.no_matches', 'No questions match your current filter.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setSearchQuery('');
      setStudyFilter('all');
    },
    className: "min-h-11 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-cyan-800 border border-cyan-300 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
  }, label('faq.clear_filters', 'Show all questions'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (() => {
    // PASS 2: actual render. Sentence indices come from rangeStart[idx] so
    // they stay stable regardless of which FAQs are expanded/collapsed or filtered.
    return filteredFaqEntries.map(function (entry) {
      var faq = entry.faq || {};
      var idx = entry.idx;
      var isExpanded = isEditingFaq || expandedSet.has(idx) || idx === currentlyReadingFaqIdx;
      var studyStatus = studyMarks[idx] || '';
      var qSentencesForCount = splitTextToSentences(faq.question || '').filter(function (s) {
        return s && s.trim().length > 0;
      });
      var qBase = rangeStart[idx] || 0;
      var aBase = qBase + qSentencesForCount.length;
      var activeSentenceIdx = playbackState && typeof playbackState.currentIdx === 'number' ? playbackState.currentIdx : -1;
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        className: `bg-white p-5 rounded-lg border shadow-sm transition-colors motion-reduce:transition-none ${studyMode && studyStatus === 'got-it' ? 'border-emerald-400' : studyMode && studyStatus === 'review' ? 'border-amber-400' : 'border-slate-400'}`,
        "data-help-key": "faq_item"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap sm:flex-nowrap items-start gap-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "bg-cyan-100 text-cyan-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
        "aria-hidden": "true"
      }, label('faq.q_badge', 'Q')), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-grow space-y-2",
        style: {
          flex: '1 1 12rem'
        }
      }, isEditingFaq ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
        "aria-label": t('faq.edit_question') || 'Edit FAQ question',
        value: faq.question ?? '',
        onChange: e => {
          if (typeof handleFaqChange === 'function') handleFaqChange(idx, 'question', e.target.value);
        },
        className: "w-full font-bold text-slate-800 text-lg bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
        rows: getRows(faq.question),
        placeholder: t('faq.question_placeholder')
      }), renderFaqEditAudioTools(idx, 'question'), (faq.question_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", _extends({}, _faqTranslationAttributes(generatedContent), {
        "aria-label": t('faq.edit_question_translation') || 'Edit FAQ question translation',
        value: faq.question_en || '',
        onChange: e => {
          if (typeof handleFaqChange === 'function') handleFaqChange(idx, 'question_en', e.target.value);
        },
        className: "w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
        rows: getRows(faq.question_en || ''),
        placeholder: t('common.placeholder_question_trans')
      })), /*#__PURE__*/React.createElement("div", {
        className: "bg-slate-50 p-3 rounded border-l-4 border-cyan-400 text-slate-600 text-sm space-y-2"
      }, /*#__PURE__*/React.createElement("textarea", {
        "aria-label": t('faq.edit_answer') || 'Edit FAQ answer',
        value: faq.answer ?? '',
        onChange: e => {
          if (typeof handleFaqChange === 'function') handleFaqChange(idx, 'answer', e.target.value);
        },
        className: "w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
        rows: getRows(faq.answer),
        placeholder: t('faq.answer_placeholder')
      }), renderFaqEditAudioTools(idx, 'answer'), /*#__PURE__*/React.createElement("input", {
        type: "text",
        "data-faq-edit-evidence": idx,
        "aria-label": label('faq.edit_evidence', 'Edit source evidence quote'),
        value: faq.evidence || faq.quote || faq.sourceRef || '',
        onChange: e => {
          if (typeof handleFaqChange === 'function') handleFaqChange(idx, 'evidence', e.target.value);
        },
        className: "w-full min-h-11 text-xs text-slate-700 bg-white border border-slate-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 rounded px-2 py-1 outline-none",
        placeholder: label('faq.evidence_placeholder', 'Optional source quote or evidence reference...')
      }), (faq.answer_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", _extends({}, _faqTranslationAttributes(generatedContent), {
        "aria-label": t('faq.edit_answer_translation') || 'Edit FAQ answer translation',
        value: faq.answer_en || '',
        onChange: e => {
          if (typeof handleFaqChange === 'function') handleFaqChange(idx, 'answer_en', e.target.value);
        },
        className: "w-full text-xs text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all pt-2 border-t border-slate-200",
        rows: getRows(faq.answer_en || ''),
        placeholder: t('common.placeholder_answer_trans')
      })))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center gap-2"
      }, /*#__PURE__*/React.createElement("h4", {
        className: "font-bold text-slate-800 text-lg mb-1 leading-relaxed flex-1 min-w-0"
      }, splitTextToSentences(faq.question || '').filter(s => s && s.trim()).map((s, sIdx) => /*#__PURE__*/React.createElement("span", {
        key: sIdx,
        id: `sentence-${qBase + sIdx}`,
        className: isPlaying && playingContentId === 'faq-active' && activeSentenceIdx === qBase + sIdx ? 'bg-yellow-400 text-black rounded' : ''
      }, formatInteractiveText(s, false), " "))), studyMode && studyStatus && /*#__PURE__*/React.createElement("span", {
        "data-faq-study-badge": studyStatus,
        className: `shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full border ${studyStatus === 'got-it' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'}`
      }, studyStatus === 'got-it' ? '✓ ' + label('faq.mark_got_it', 'Got it') : '↺ ' + label('faq.mark_review', 'Review again'))), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap gap-2"
      }, qSentencesForCount.map((s, sIdx) => /*#__PURE__*/React.createElement("button", {
        key: sIdx,
        type: "button",
        "data-faq-listen-question": true,
        "aria-label": label('faq.read_sentence', 'Read sentence: {sentence}').replace('{sentence}', s),
        onClick: e => {
          e.stopPropagation();
          if (typeof handleSpeak === 'function') handleSpeak(s, 'faq-active', qBase + sIdx);
        },
        className: "min-h-11 inline-flex items-center gap-1 rounded-lg border border-cyan-300 px-3 py-2 text-xs font-semibold text-cyan-900 hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-600"
      }, /*#__PURE__*/React.createElement(Volume2, {
        size: 14,
        "aria-hidden": "true"
      }), qSentencesForCount.length === 1 ? label('faq.listen_question', 'Listen to question') : label('faq.listen_question_sentence', 'Listen to question sentence {number}').replace('{number}', String(sIdx + 1))))), studyMode && !isExpanded && /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 space-y-1.5"
      }, /*#__PURE__*/React.createElement("label", {
        htmlFor: `faq-try-${idx}`,
        className: "block text-xs font-bold text-indigo-900"
      }, label('faq.try_prompt', 'Try recalling the answer in your own words first (optional, private):')), /*#__PURE__*/React.createElement("textarea", {
        id: `faq-try-${idx}`,
        "data-faq-try-input": idx,
        rows: 2,
        value: tryDrafts[idx] || '',
        onChange: function (e) {
          var val = e.target.value;
          setTryDrafts(function (prev) {
            var next = Object.assign({}, prev);
            next[idx] = val;
            return next;
          });
        },
        onBlur: function (e) {
          scanFaqRecall(e.target.value);
        },
        placeholder: label('faq.try_placeholder', 'Jot a quick thought before clicking Show answer...'),
        className: "w-full rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      })), isExpanded && faq.question_en && /*#__PURE__*/React.createElement("p", _extends({}, _faqTranslationAttributes(generatedContent), {
        className: "text-sm text-slate-600 italic mb-2"
      }), "(", faq.question_en, ")"), /*#__PURE__*/React.createElement("div", {
        id: `faq-answer-${idx}`,
        hidden: !isExpanded,
        className: "bg-slate-50 p-3 rounded border-l-4 border-cyan-400 text-slate-600 text-sm leading-relaxed animate-in motion-reduce:animate-none fade-in slide-in-from-top-1 duration-200"
      }, isExpanded && studyMode && tryDrafts[idx] && tryDrafts[idx].trim() && /*#__PURE__*/React.createElement("div", {
        "data-faq-try-compare": idx,
        className: "mb-2.5 rounded-md border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-xs text-indigo-950"
      }, /*#__PURE__*/React.createElement("strong", {
        className: "font-bold"
      }, label('faq.your_recall', 'Your recall'), ":"), " ", tryDrafts[idx]), isExpanded && (() => {
        const aSentences = splitTextToSentences(faq.answer || '').filter(s => s && s.trim().length > 0);
        return aSentences.map((s, sIdx) => {
          const currentGlobalIdx = aBase + sIdx;
          const isActive = isPlaying && playingContentId === 'faq-active' && activeSentenceIdx === currentGlobalIdx;
          return /*#__PURE__*/React.createElement("button", {
            type: "button",
            key: sIdx,
            id: `sentence-${currentGlobalIdx}`,
            "aria-label": label('faq.read_sentence', 'Read sentence: {sentence}').replace('{sentence}', s),
            className: `bg-transparent border-0 font-inherit text-inherit text-start transition-colors motion-reduce:transition-none duration-300 rounded px-1 py-0.5 box-decoration-clone cursor-pointer ${isActive ? 'bg-yellow-400 text-black shadow-lg font-medium' : 'hover:bg-cyan-100'}`,
            onClick: e => {
              e.stopPropagation();
              if (typeof handleSpeak === 'function') handleSpeak(s, 'faq-active', currentGlobalIdx);
            }
          }, formatInteractiveText(s, false), " ");
        });
      })(), isExpanded && (faq.evidence || faq.quote || faq.sourceRef) && /*#__PURE__*/React.createElement("p", {
        "data-faq-evidence": idx,
        className: "mt-2 pt-2 border-t border-cyan-200 text-xs text-cyan-900 bg-cyan-50/70 rounded px-2.5 py-1.5"
      }, /*#__PURE__*/React.createElement("strong", null, label('faq.source_evidence', 'Source evidence'), ":"), " ", String(faq.evidence || faq.quote || faq.sourceRef)), isExpanded && faq.answer_en && /*#__PURE__*/React.createElement("p", _extends({}, _faqTranslationAttributes(generatedContent), {
        className: "text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 italic"
      }), "(", faq.answer_en, ")"), isExpanded && /*#__PURE__*/React.createElement("div", {
        className: "mt-2 flex flex-wrap items-center justify-between gap-2"
      }, studyMode ? /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center gap-1.5",
        role: "group",
        "aria-label": label('faq.self_check_group', 'Mark how well you know this answer')
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-faq-mark-got-it": idx,
        "aria-pressed": studyStatus === 'got-it',
        onClick: function () {
          updateStudyMark(idx, 'got-it');
        },
        className: `min-h-11 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${studyStatus === 'got-it' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'}`
      }, "✓ ", label('faq.mark_got_it', 'Got it')), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-faq-mark-review": idx,
        "aria-pressed": studyStatus === 'review',
        onClick: function () {
          updateStudyMark(idx, 'review');
        },
        className: `min-h-11 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${studyStatus === 'review' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'}`
      }, "↺ ", label('faq.mark_review', 'Review again'))) : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-faq-copy": idx,
        onClick: () => handleCopyFaqItem(faq, idx),
        className: "min-h-11 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      }, copiedFaqIdx === idx ? label('common.copied', 'Copied!') : label('faq.copy_qa', 'Copy Q&A')))))), isEditingFaq && canMutateFaqList && /*#__PURE__*/React.createElement("div", {
        className: "shrink-0 flex flex-row sm:flex-col items-center gap-1"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-faq-move-up": true,
        onClick: () => handleMoveFaqItem(idx, -1),
        disabled: idx === 0,
        "aria-label": `${t('faq.move_up') || 'Move question up'} ${idx + 1}`,
        title: t('faq.move_up') || 'Move question up',
        className: "min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      }, /*#__PURE__*/React.createElement(ArrowUp, {
        size: 16,
        "aria-hidden": "true"
      })), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-faq-move-down": true,
        onClick: () => handleMoveFaqItem(idx, 1),
        disabled: idx === faqItems.length - 1,
        "aria-label": `${t('faq.move_down') || 'Move question down'} ${idx + 1}`,
        title: t('faq.move_down') || 'Move question down',
        className: "min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      }, /*#__PURE__*/React.createElement(ArrowDown, {
        size: 16,
        "aria-hidden": "true"
      })), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-faq-remove": true,
        onClick: () => handleRemoveFaqItem(idx),
        "aria-label": `${t('faq.remove_question') || 'Remove question'} ${idx + 1}`,
        title: t('faq.remove_question') || 'Remove question',
        className: "min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
      }, /*#__PURE__*/React.createElement(Trash2, {
        size: 16,
        "aria-hidden": "true"
      }))), !isEditingFaq && /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => toggleFaq(idx),
        "aria-expanded": isExpanded,
        "aria-controls": `faq-answer-${idx}`,
        "aria-label": (isExpanded ? label('faq.collapse_answer_named', 'Hide answer: {question}') : label('faq.expand_answer_named', 'Show answer: {question}')).replace('{question}', () => faqQuestionName(faq) || label('faq.audio_item', 'FAQ') + ' ' + (idx + 1)),
        className: "shrink-0 mt-2 min-w-11 min-h-11 inline-flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-xs font-semibold"
      }, isExpanded ? label('faq.hide_answer_action', 'Hide answer') : label('faq.show_answer_action', 'Show answer')), /*#__PURE__*/React.createElement(ChevronDown, {
        size: 20,
        "aria-hidden": "true",
        className: "transition-transform motion-reduce:transition-none duration-200",
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
