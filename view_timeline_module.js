/**
 * AlloFlow View - Timeline Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='timeline' block.
 * Source range (pre-extraction): lines 35374-35751 (~378 lines).
 * Renders the timeline editor view: drag/drop reordering, AI verify,
 * auto-fix, image generation per item, revision flow, and the
 * timeline game launcher. ErrorBoundary + TimelineGame components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.TimelineView) {
    console.log('[CDN] ViewTimelineModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewTimelineModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _timelineReviewLabel(t, key, fallback) {
  const value = typeof t === 'function' ? t(key) : '';
  return typeof value === 'string' && value.trim() && value !== key ? value : fallback;
}
// Companion language belongs to the saved artifact, independent of current app settings.
function _timelineTranslationAttributes(artifact) {
  const api = window.AlloModules?.TextPipelineHelpers;
  if (typeof api?.getArtifactTranslationTextAttributes === 'function') return api.getArtifactTranslationTextAttributes(artifact);
  const target = [artifact?.config?.translationPolicy?.target, artifact?.translationPolicy?.target, artifact?.translationTarget, artifact?.config?.translationTarget, artifact?.config?.attachedTranslationTarget].find(value => typeof value === 'string' && value.trim()) || 'English';
  const helpers = window.AlloModules?.ModuleScopeExtras;
  const lang = helpers?.getSpeechLangCode?.(target) || window.AlloFlowLang?.bcp47Full?.(target) || (/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(target) ? target : target === 'English' ? 'en' : 'und');
  return {
    lang,
    dir: helpers?.getContentDirection?.(target) || 'auto',
    style: {
      textAlign: 'start'
    }
  };
}

// Lazy Lucide icon resolution from window.AlloIcons (populated by
// host at AlloFlowANTI.txt:4930). Avoids threading 16 icon
// components as props. Mirrors view_renderers_module.js pattern.
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var AlertCircle = _lazyIcon('AlertCircle');
var AlertTriangle = _lazyIcon('AlertTriangle');
var Ban = _lazyIcon('Ban');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Gamepad2 = _lazyIcon('Gamepad2');
var GripVertical = _lazyIcon('GripVertical');
var ImageIcon = _lazyIcon('ImageIcon');
var ListOrdered = _lazyIcon('ListOrdered');
var Loader2 = _lazyIcon('Loader2');
var Pencil = _lazyIcon('Pencil');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Send = _lazyIcon('Send');
var Sparkles = _lazyIcon('Sparkles');
var Trash2 = _lazyIcon('Trash2');
var X = _lazyIcon('X');
function TimelineView(props) {
  // Shared description field for a timeline picture (edit mode). One
  // multi-field write per change: handleTimelineChange accepts an object.
  const [altBusyIdx, setAltBusyIdx] = React.useState(null);
  const [altStatus, setAltStatus] = React.useState(null);
  const [studyMaskMode, setStudyMaskMode] = React.useState('none'); // 'none' | 'labels' | 'events'
  const [revealedSteps, setRevealedSteps] = React.useState(() => new Set());
  const [speakingSequence, setSpeakingSequence] = React.useState(false);
  const seqSpeechListenerRef = React.useRef(null);
  const stopSeqSpeechListener = () => {
    if (seqSpeechListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('allo-speech-state', seqSpeechListenerRef.current);
      seqSpeechListenerRef.current = null;
    }
  };
  const altRequestRef = React.useRef(null);
  const altLiveRef = React.useRef(props);
  altLiveRef.current = props;
  React.useEffect(() => {
    altRequestRef.current = null;
    setAltBusyIdx(null);
    setAltStatus(null);
    setStudyMaskMode('none');
    setRevealedSteps(new Set());
    stopSeqSpeechListener();
    setSpeakingSequence(false);
    return () => {
      altRequestRef.current = null;
      stopSeqSpeechListener();
    };
  }, [props.generatedContent && props.generatedContent.id]);
  const renderTimelineAltField = (item, idx) => {
    const Field = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ImageAltField;
    const A = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AltText;
    const change = props.handleTimelineChange;
    if (!Field || !item || !item.image || typeof change !== 'function') return null;
    const stale = !!(A && item.altHash && A.hashImage(item.image) !== item.altHash);
    const regenerate = async () => {
      const vision = (() => {
        const fn = window.callGeminiVision;
        try {
          if (typeof window.__alloAiUsable === 'function') return window.__alloAiUsable('vision', fn);
        } catch (_) {}
        return typeof fn === 'function' && !fn._alloQrBlocked && window.__alloStudentAiDisabled !== true && window.__alloAiSecretsLocked !== true;
      })() ? window.callGeminiVision : null;
      if (!A || !vision || altRequestRef.current) return;
      const resource = props.generatedContent;
      const request = {
        resourceId: resource.id,
        snapshot: JSON.stringify(resource),
        itemSnapshot: JSON.stringify(item)
      };
      altRequestRef.current = request;
      setAltBusyIdx(idx);
      setAltStatus({
        idx,
        message: _timelineReviewLabel(props.t, 'timeline.alt.generating', 'Generating the picture description…')
      });
      try {
        const [result] = await A.draftAlts([{
          id: idx,
          dataUrl: item.image,
          context: item.event || item.content
        }], {
          language: props.leveledTextLanguage,
          callGeminiVision: vision
        });
        if (altRequestRef.current !== request) return;
        const latest = altLiveRef.current;
        if (JSON.stringify(latest.generatedContent) !== request.snapshot || latest.leveledTextLanguage !== props.leveledTextLanguage) {
          setAltStatus({
            idx,
            message: _timelineReviewLabel(props.t, 'timeline.alt.changed', 'The sequence changed. Generate a description again for the updated picture.')
          });
          return;
        }
        if (!result || result.decorative !== true && (typeof result.alt !== 'string' || !result.alt.trim())) throw new Error('Empty picture description');
        latest.handleTimelineChange(idx, {
          alt: result.decorative ? '' : result.alt,
          altSource: result.source,
          decorative: result.decorative === true,
          altHash: A.hashImage(item.image)
        });
        setAltStatus({
          idx,
          message: _timelineReviewLabel(props.t, 'timeline.alt.updated', 'Picture description updated.')
        });
      } catch (error) {
        if (altRequestRef.current === request) setAltStatus({
          idx,
          message: _timelineReviewLabel(props.t, 'timeline.alt.failed', 'Could not generate a picture description. Try again.')
        });
      } finally {
        if (altRequestRef.current === request) {
          altRequestRef.current = null;
          setAltBusyIdx(null);
        }
      }
    };
    return /*#__PURE__*/React.createElement("div", null, React.createElement(Field, {
      id: 'timeline-alt-' + idx,
      t: props.t,
      value: item.alt || '',
      source: stale ? 'stale' : item.altSource || '',
      decorative: item.decorative === true,
      busy: altBusyIdx === idx,
      onChange: value => {
        altRequestRef.current = null;
        setAltBusyIdx(null);
        setAltStatus(null);
        change(idx, {
          alt: value,
          altSource: 'author',
          altHash: A ? A.hashImage(item.image) : ''
        });
      },
      onDecorativeChange: flag => {
        altRequestRef.current = null;
        setAltBusyIdx(null);
        setAltStatus(null);
        change(idx, {
          decorative: flag
        });
      },
      onRegenerate: regenerate
    }), altStatus && altStatus.idx === idx && /*#__PURE__*/React.createElement("p", {
      role: "status",
      "aria-live": "polite",
      className: "text-xs text-slate-700 mt-1"
    }, altStatus.message));
  };
  // Pure data refs
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var leveledTextLanguage = props.leveledTextLanguage;
  var TIMELINE_MODE_DEFINITIONS = props.TIMELINE_MODE_DEFINITIONS;
  // State slices + flags
  var dismissedVerifications = props.dismissedVerifications;
  var draggedTimelineIndex = props.draggedTimelineIndex;
  var initialImageSize = props.initialImageSize;
  var timelineImageSize = props.timelineImageSize;
  var timelineRefinementInputs = props.timelineRefinementInputs;
  var timelineRevisionInput = props.timelineRevisionInput;
  var isAutoFixingTimeline = props.isAutoFixingTimeline;
  var isEditingTimeline = props.isEditingTimeline;
  var isGeneratingTimelineImage = props.isGeneratingTimelineImage;
  var isRevisingTimeline = props.isRevisingTimeline;
  var isTimelineGame = props.isTimelineGame;
  var isVerifyingTimeline = props.isVerifyingTimeline;
  // Setters
  var setDismissedVerifications = props.setDismissedVerifications;
  var setTimelineImageSize = props.setTimelineImageSize;
  var setTimelineRefinementInputs = props.setTimelineRefinementInputs;
  var setTimelineRevisionInput = props.setTimelineRevisionInput;
  // Handlers
  var handleAddTimelineStep = props.handleAddTimelineStep;
  var handleAutoFixTimeline = props.handleAutoFixTimeline;
  var handleDeleteTimelineStep = props.handleDeleteTimelineStep;
  var handleExplainTimelineItem = props.handleExplainTimelineItem;
  var handleGameCompletion = props.handleGameCompletion;
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGenerateTimelineItemImage = props.handleGenerateTimelineItemImage;
  var handleLockTimelineMode = props.handleLockTimelineMode;
  var handleSetIsTimelineGameToTrue = props.handleSetIsTimelineGameToTrue;
  var handleTimelineChange = props.handleTimelineChange;
  var handleTimelineDragEnd = props.handleTimelineDragEnd;
  var handleTimelineDragOver = props.handleTimelineDragOver;
  var handleTimelineDragStart = props.handleTimelineDragStart;
  const timelineEditorRef = React.useRef(null),
    timelineMoveFocus = React.useRef(null);
  const timelineItems = Array.isArray(generatedContent?.data) ? generatedContent.data : generatedContent?.data?.items || [];
  const timelinePositionLabel = index => _timelineReviewLabel(t, 'timeline.item_position_aria', 'Timeline item {position} of {total}').replace('{position}', String(index + 1)).replace('{total}', String(timelineItems.length));
  const timelineFieldLabel = (key, fallback, index, companion = false) => _timelineReviewLabel(t, key, fallback) + (companion ? ' — ' + _timelineReviewLabel(t, 'translate.companion_label', 'Companion translation') : '') + ' — ' + timelinePositionLabel(index);
  var handleTimelineMove = (from, to) => {
    if (from < 0 || to < 0 || from >= timelineItems.length || to >= timelineItems.length || from === to || typeof props.handleTimelineMove !== 'function') return;
    const active = document.activeElement,
      row = timelineEditorRef.current?.querySelectorAll('[data-timeline-row]')[from];
    const expected = timelineItems.slice(),
      moved = expected.splice(from, 1)[0];
    expected.splice(to, 0, moved);
    timelineMoveFocus.current = row?.contains(active) ? {
      resourceId: generatedContent?.id,
      data: generatedContent?.data,
      expected,
      to,
      active,
      control: active.dataset.timelineMove
    } : null;
    props.handleTimelineMove(from, to);
  };
  React.useLayoutEffect(() => {
    const request = timelineMoveFocus.current;
    if (!request) return;
    if (generatedContent?.id !== request.resourceId || !isEditingTimeline) {
      timelineMoveFocus.current = null;
      return;
    }
    if (generatedContent?.data === request.data) return;
    timelineMoveFocus.current = null;
    if (timelineItems.length !== request.expected.length || !timelineItems.every((item, index) => ['id', 'event', 'event_en', 'image'].every(key => item[key] === request.expected[index][key]))) return;
    const active = document.activeElement;
    if (active !== request.active && active !== document.body && active?.isConnected) return;
    const row = timelineEditorRef.current?.querySelectorAll('[data-timeline-row]')[request.to];
    const control = request.control && row?.querySelector('[data-timeline-move="' + request.control + '"]');
    (control && !control.disabled ? control : row)?.focus();
  }, [generatedContent?.id, generatedContent?.data, isEditingTimeline]);
  var handleTimelineRevision = props.handleTimelineRevision;
  var handleToggleIsEditingTimeline = props.handleToggleIsEditingTimeline;
  var handleVerifyTimelineAccuracy = props.handleVerifyTimelineAccuracy;
  // Misc
  var closeTimeline = props.closeTimeline;
  // Components from host scope
  var ErrorBoundary = props.ErrorBoundary;
  var TimelineGame = props.TimelineGame;
  var playSound = props.playSound;
  var reducedMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  var bionicOn = typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function' ? window.__alloUseBionic() : false;
  var bt = function (s) {
    return bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function' ? window.__alloBionicReact(s) : s;
  };
  var _timelineAiReady = function (kind) {
    try {
      if (typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true)) return false;
      if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return window.__alloAiUsable(kind);
    } catch (_) {}
    return true;
  };
  var timelineTextAiUsable = _timelineAiReady('text');
  var timelineImageAiUsable = _timelineAiReady('images');
  var toggleRevealStep = function (idx) {
    setRevealedSteps(function (prev) {
      var next = new Set(prev);
      if (next.has(idx)) next.delete(idx);else next.add(idx);
      return next;
    });
  };
  var speakTimelineText = function (spoken, trackSequence) {
    var clean = String(spoken || '').replace(/\s+/g, ' ').trim();
    var player = typeof window !== 'undefined' ? window.AlloSpeechPlayer : null;
    if (trackSequence) {
      var finished = function () {
        stopSeqSpeechListener();
        setSpeakingSequence(false);
      };
      stopSeqSpeechListener();
      if (speakingSequence) {
        if (player && typeof player.stop === 'function') player.stop();else if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        setSpeakingSequence(false);
        return;
      }
      if (!clean) return;
      if (player && typeof player.speak === 'function') {
        var ourId = null;
        var onState = function (e) {
          var d = e.detail || {};
          if (ourId === null) {
            if (d.isPlaying) ourId = d.currentId;
            return;
          }
          if (!d.isPlaying || d.currentId !== ourId) finished();
        };
        seqSpeechListenerRef.current = onState;
        window.addEventListener('allo-speech-state', onState);
        setSpeakingSequence(true);
        Promise.resolve(player.speak(clean)).then(function (res) {
          if (res === null && ourId === null) finished();
        }, finished);
        return;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        setSpeakingSequence(true);
        window.speechSynthesis.cancel();
        var u = new window.SpeechSynthesisUtterance(clean);
        u.onend = finished;
        u.onerror = finished;
        window.speechSynthesis.speak(u);
        return;
      }
    }
    if (!clean) return;
    try {
      if (player && typeof player.speak === 'function') {
        player.speak(clean);
      } else if (typeof props.callTTS === 'function') {
        props.callTTS(clean);
      } else if (typeof window !== 'undefined' && typeof window.callTTS === 'function') {
        window.callTTS(clean);
      } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(clean));
      }
    } catch (_) {}
  };
  var timelineProgressionLabel = !Array.isArray(generatedContent?.data) && generatedContent?.data?.progressionLabel ? String(generatedContent.data.progressionLabel) : '';
  var timelineAllRevealed = timelineItems.length > 0 && timelineItems.every(function (_, idx) {
    return revealedSteps.has(idx);
  });
  return /*#__PURE__*/React.createElement("div", {
    ref: timelineEditorRef,
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("style", null, '[data-timeline-row]:focus-visible,[data-timeline-move]:focus-visible{outline:3px solid #4338ca;outline-offset:2px}@media(max-width:639px){[data-timeline-move-controls]{flex-direction:row;margin-top:0}[data-timeline-fields]{flex-basis:100%;order:1}}@media(forced-colors:active){[data-timeline-row]:focus-visible,[data-timeline-move]:focus-visible{outline-color:Highlight}}'), /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "sr-only"
  }, isRevisingTimeline ? t('timeline.revising') : isAutoFixingTimeline ? t('timeline.validation.fixing') || 'Fixing timeline' : isVerifyingTimeline ? _timelineReviewLabel(t, 'timeline.ai_review.running', 'Running AI review') : Object.values(isGeneratingTimelineImage || {}).some(Boolean) ? t('timeline.visuals.generating') || 'Generating timeline image' : ''), (isTeacherMode || isIndependentMode) && /*#__PURE__*/React.createElement("div", {
    "data-timeline-toolbar": true,
    className: "bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6 flex justify-between items-center flex-wrap gap-4"
  }, isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-indigo-800"
  }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('timeline.udl_goal_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetIsTimelineGameToTrue,
    className: "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), " ", isTeacherMode ? t('timeline.preview_game') : t('timeline.launch_sequencer')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": !!isEditingTimeline,
    onClick: handleToggleIsEditingTimeline,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingTimeline ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`
  }, isEditingTimeline ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingTimeline ? t('timeline.done_editing') : t('timeline.edit_sequence')), /*#__PURE__*/React.createElement("div", {
    "data-help-key": "timeline_image_size",
    className: "flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm",
    title: t('timeline.image_size_tooltip') || 'Resize sequence images'
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14,
    className: "text-indigo-400"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.range_slider') || 'Image size',
    type: "range",
    min: "64",
    max: "300",
    step: "16",
    value: timelineImageSize,
    onChange: e => setTimelineImageSize(Number(e.target.value)),
    className: "w-20 h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
  })))), !isEditingTimeline && (isTeacherMode || isIndependentMode) && timelineItems.length >= 2 && /*#__PURE__*/React.createElement("div", {
    "data-timeline-study-bar": true,
    className: "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1.5",
    role: "group",
    "aria-label": _timelineReviewLabel(t, 'timeline.study_mode_group', 'Study self-test mode')
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700 mr-1"
  }, _timelineReviewLabel(t, 'timeline.study_mode_label', 'Self-test:')), [['none', _timelineReviewLabel(t, 'timeline.study_show_all', 'Show all')], ['labels', _timelineReviewLabel(t, 'timeline.study_hide_labels', 'Hide labels')], ['events', _timelineReviewLabel(t, 'timeline.study_hide_events', 'Hide events')]].map(function (pair) {
    var mKey = pair[0],
      mLabel = pair[1];
    return /*#__PURE__*/React.createElement("button", {
      key: mKey,
      type: "button",
      "data-timeline-mask-mode": mKey,
      "aria-pressed": studyMaskMode === mKey,
      onClick: function () {
        setStudyMaskMode(mKey);
        setRevealedSteps(new Set());
      },
      className: `min-h-9 px-3 py-1 rounded-full text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${studyMaskMode === mKey ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50'}`
    }, mLabel);
  }), studyMaskMode !== 'none' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-reveal-toggle": true,
    onClick: function () {
      if (timelineAllRevealed) setRevealedSteps(new Set());else setRevealedSteps(new Set(timelineItems.map(function (_, i) {
        return i;
      })));
    },
    className: "min-h-9 px-3 py-1 rounded-full text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, timelineAllRevealed ? _timelineReviewLabel(t, 'timeline.hide_all_steps', 'Hide all') : _timelineReviewLabel(t, 'timeline.reveal_all_steps', 'Reveal all'), " (", revealedSteps.size, "/", timelineItems.length, ")")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-listen-all": true,
    "aria-pressed": speakingSequence,
    onClick: function () {
      var allSpoken = timelineItems.map(function (it, i) {
        return i + 1 + '. ' + [it.date, it.event].filter(Boolean).join(': ');
      }).join('. ');
      speakTimelineText(allSpoken, true);
    },
    className: `min-h-9 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${speakingSequence ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200' : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50'}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, speakingSequence ? '⏹️' : '🔊'), /*#__PURE__*/React.createElement("span", null, speakingSequence ? _timelineReviewLabel(t, 'common.stop', 'Stop') : _timelineReviewLabel(t, 'timeline.listen_sequence', 'Listen to sequence')))), isTeacherMode && generatedContent?.data && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded-lg border border-slate-400 shadow-sm flex flex-wrap gap-2 items-center"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-indigo-500"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.timeline_revise_placeholder'),
    type: "text",
    value: timelineRevisionInput || '',
    onChange: e => setTimelineRevisionInput(e.target.value),
    placeholder: t('timeline.revise_placeholder'),
    className: "flex-grow min-w-[200px] text-sm border border-slate-400 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleTimelineRevision(),
    disabled: isRevisingTimeline || !timelineRevisionInput?.trim() || !timelineTextAiUsable,
    title: !timelineTextAiUsable ? _timelineReviewLabel(t, 'sidebar.needs_ai_setup', 'Needs AI setup') : undefined,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, isRevisingTimeline ? /*#__PURE__*/React.createElement(Loader2, {
    size: 14,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 14
  }), isRevisingTimeline ? t('timeline.revising') : t('timeline.revise_button'))), isTeacherMode && !Array.isArray(generatedContent?.data) && Array.isArray(generatedContent?.data?.validationIssues) && generatedContent.data.validationIssues.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-lg shadow-sm p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("details", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer flex flex-wrap items-center gap-2 text-xs font-bold text-amber-800"
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 14,
    className: "text-amber-600",
    "aria-hidden": "true"
  }), t('timeline.validation.issues_header', {
    count: generatedContent.data.validationIssues.length
  }) || `${generatedContent.data.validationIssues.length} structural issue(s) detected`), /*#__PURE__*/React.createElement("ul", {
    className: "mt-2 text-[12px] text-amber-900 list-disc list-inside space-y-1"
  }, generatedContent.data.validationIssues.map((iss, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, iss.message)))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleAutoFixTimeline(),
    disabled: isAutoFixingTimeline || !timelineTextAiUsable,
    title: !timelineTextAiUsable ? _timelineReviewLabel(t, 'sidebar.needs_ai_setup', 'Needs AI setup') : undefined,
    className: "shrink-0 self-start flex items-center gap-1 px-2.5 py-1.5 min-h-8 rounded-full text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition-colors disabled:opacity-50",
    "aria-busy": isAutoFixingTimeline
  }, isAutoFixingTimeline ? /*#__PURE__*/React.createElement(Loader2, {
    size: 12,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    "aria-hidden": "true"
  }), isAutoFixingTimeline ? t('timeline.validation.fixing') || 'Fixing…' : t('timeline.validation.auto_fix') || 'Auto-fix'))), isTeacherMode && generatedContent?.data && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-end items-center gap-2"
  }, (() => {
    const items = (Array.isArray(generatedContent?.data) ? generatedContent.data : generatedContent?.data?.items || []).filter(item => item && typeof item === 'object');
    const unchecked = items.filter(item => !item.verification || typeof item.verification !== 'object').length;
    if (!items.length || !unchecked || isVerifyingTimeline) return null;
    const tl = (key, fallback) => {
      const value = t(key);
      return typeof value === 'string' && value.trim() && value !== key ? value : fallback;
    };
    const label = unchecked === items.length ? tl('timeline.validation.not_checked', 'AI review not yet run') : tl('timeline.validation.some_not_checked', '{count} items not yet checked').split('{count}').join(String(unchecked));
    return /*#__PURE__*/React.createElement("span", {
      "data-timeline-unverified": true,
      className: "inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900",
      title: tl('timeline.validation.not_checked_tip', 'These items have no saved AI review. Use Run AI review; check important claims against reliable sources.')
    }, /*#__PURE__*/React.createElement(AlertTriangle, {
      size: 12,
      className: "text-amber-700",
      "aria-hidden": "true"
    }), label);
  })(), /*#__PURE__*/React.createElement("p", {
    "data-timeline-review-scope": true,
    className: "w-full text-xs text-slate-700"
  }, (() => {
    const items = (Array.isArray(generatedContent?.data) ? generatedContent.data : generatedContent?.data?.items || []).filter(Boolean);
    const checked = items.filter(item => typeof item.verification?.factual === 'boolean' && typeof item.verification?.position === 'boolean').length;
    return _timelineReviewLabel(t, 'timeline.ai_review.coverage', 'AI review saved for {checked} of {total} items. No cited fact check.').replace('{checked}', String(checked)).replace('{total}', String(items.length));
  })()), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleVerifyTimelineAccuracy(),
    disabled: isVerifyingTimeline || !timelineTextAiUsable,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
    "aria-busy": isVerifyingTimeline,
    title: !timelineTextAiUsable ? _timelineReviewLabel(t, 'sidebar.needs_ai_setup', 'Needs AI setup') : _timelineReviewLabel(t, 'timeline.ai_review.tooltip', 'Ask AI to review these items. No external sources are checked.')
  }, isVerifyingTimeline ? /*#__PURE__*/React.createElement(Loader2, {
    size: 14,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : '🔍', isVerifyingTimeline ? _timelineReviewLabel(t, 'timeline.ai_review.running', 'Running AI review') : _timelineReviewLabel(t, 'timeline.ai_review.action', 'Run AI review'))), /*#__PURE__*/React.createElement("div", {
    className: "relative pl-12 sm:pl-16 border-l-2 border-indigo-200 space-y-8 my-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-[-7px] top-0 font-black text-indigo-700 text-xs uppercase tracking-widest -translate-y-full"
  }, t('timeline.start_marker')), !Array.isArray(generatedContent?.data) && generatedContent?.data?.progressionLabel && /*#__PURE__*/React.createElement("div", {
    className: "absolute left-4 top-[-24px] flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md"
  }, /*#__PURE__*/React.createElement("span", {
    className: "opacity-90"
  }, t('timeline.order_by')), " ", generatedContent?.data.progressionLabel), generatedContent?.data.mode && TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode] && (!isTeacherMode ? /*#__PURE__*/React.createElement("span", {
    "data-timeline-mode-chip": true,
    className: "bg-slate-100 text-slate-700 border border-slate-400 px-2 py-1 rounded-full text-xs font-bold shadow-sm"
  }, TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode].label) : generatedContent.data.autoDetected ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleLockTimelineMode,
    className: "bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-amber-100 transition-colors",
    title: t('timeline.click_to_lock_tooltip') || 'Click to lock this mode for future generations',
    "aria-label": `${t('timeline.detected_label') || 'Detected'}: ${TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode].label} — ${t('timeline.click_to_lock_aria') || 'Click to lock this mode'}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "✨ "), t('timeline.detected_label') || 'Detected', ": ", TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode].label) : /*#__PURE__*/React.createElement("span", {
    className: "bg-slate-100 text-slate-700 border border-slate-400 px-2 py-1 rounded-full text-xs font-bold shadow-sm"
  }, "🔒 ", TIMELINE_MODE_DEFINITIONS[generatedContent.data.mode].label))), /*#__PURE__*/React.createElement("div", {
    className: "absolute left-[-5px] bottom-[-10px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-indigo-200"
  }), isEditingTimeline ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, !Array.isArray(generatedContent?.data) && /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-indigo-900 bg-indigo-50/70 border border-indigo-200 rounded-xl p-3"
  }, t('timeline.order_by') || 'Progression / axis label', /*#__PURE__*/React.createElement("input", {
    "data-timeline-progression-input": true,
    type: "text",
    value: generatedContent?.data?.progressionLabel || '',
    onChange: e => handleTimelineChange(null, 'progressionLabel', e.target.value),
    placeholder: t('timeline.progression_placeholder') || 'e.g., Chronological, Steps in Process, Scale',
    className: "mt-1 block w-full min-h-11 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-800 focus:ring-2 focus:ring-indigo-400"
  })), /*#__PURE__*/React.createElement("div", {
    id: "timeline-reorder-instructions",
    className: "text-xs text-slate-600 italic text-center mb-2"
  }, t('timeline.edit_instruction'), /*#__PURE__*/React.createElement("span", {
    className: "block mt-1"
  }, t('timeline.keyboard_reorder_instruction') || 'Use Move up and Move down to reorder without dragging.')), (Array.isArray(generatedContent?.data) ? generatedContent?.data : generatedContent?.data?.items || []).map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    "data-timeline-row": true,
    draggable: true,
    "data-keyboard-alternative": "move-buttons",
    role: "group",
    "aria-label": timelinePositionLabel(idx) + (item.event ? ': ' + item.event : ''),
    "aria-describedby": "timeline-reorder-instructions",
    tabIndex: 0,
    "aria-keyshortcuts": "Alt+ArrowUp Alt+ArrowDown",
    onDragStart: e => handleTimelineDragStart(e, idx),
    onKeyDown: e => {
      if (e.target !== e.currentTarget || !e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        handleTimelineMove(idx, idx - 1);
      } else if (e.key === 'ArrowDown' && idx < (Array.isArray(generatedContent?.data) ? generatedContent.data : generatedContent?.data?.items || []).length - 1) {
        e.preventDefault();
        handleTimelineMove(idx, idx + 1);
      }
    },
    onDragOver: e => handleTimelineDragOver(e, idx),
    onDragEnd: handleTimelineDragEnd,
    className: `relative flex flex-wrap items-start gap-2 p-3 rounded-xl border-2 transition-all ${draggedTimelineIndex === idx ? 'opacity-50 border-dashed border-indigo-300 bg-indigo-50' : 'bg-white border-slate-200 shadow-sm'}`
  }, /*#__PURE__*/React.createElement("div", {
    "data-timeline-move-controls": true,
    className: "flex flex-col items-center gap-1 mt-2 text-slate-600 cursor-grab active:cursor-grabbing hover:text-indigo-500"
  }, /*#__PURE__*/React.createElement(GripVertical, {
    size: 16,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold bg-slate-100 px-1.5 rounded text-slate-600"
  }, idx + 1), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-move": "up",
    style: {
      minWidth: 44,
      minHeight: 44
    },
    onClick: () => handleTimelineMove(idx, idx - 1),
    disabled: idx === 0,
    "aria-label": _timelineReviewLabel(t, 'timeline.move_up_aria', 'Move timeline item {position} up').replace('{position}', String(idx + 1)) + (item.event ? ': ' + item.event : ''),
    className: "w-11 h-11 inline-flex items-center justify-center rounded bg-white border border-slate-400 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "↑")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-move": "down",
    style: {
      minWidth: 44,
      minHeight: 44
    },
    onClick: () => handleTimelineMove(idx, idx + 1),
    disabled: idx === (Array.isArray(generatedContent?.data) ? generatedContent.data : generatedContent?.data?.items || []).length - 1,
    "aria-label": _timelineReviewLabel(t, 'timeline.move_down_aria', 'Move timeline item {position} down').replace('{position}', String(idx + 1)) + (item.event ? ': ' + item.event : ''),
    className: "w-11 h-11 inline-flex items-center justify-center rounded bg-white border border-slate-400 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "↓"))), /*#__PURE__*/React.createElement("div", {
    "data-timeline-fields": true,
    className: "flex-1 min-w-0 grid grid-cols-1 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": timelineFieldLabel('timeline.label_placeholder', 'Label/Step', idx),
    type: "text",
    style: {
      minHeight: 44
    },
    value: item.date,
    onChange: e => handleTimelineChange(idx, 'date', e.target.value),
    className: "w-1/3 min-w-0 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: t('timeline.label_placeholder')
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": timelineFieldLabel('timeline.event_placeholder', 'Event description', idx),
    type: "text",
    style: {
      minHeight: 44
    },
    "data-timeline-event": true,
    value: item.event,
    onChange: e => handleTimelineChange(idx, 'event', e.target.value),
    className: "w-2/3 min-w-0 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-400 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: t('timeline.event_placeholder')
  })), (item.event_en !== undefined || item.date_en !== undefined || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", _extends({}, _timelineTranslationAttributes(generatedContent), {
    "aria-label": timelineFieldLabel('timeline.label_placeholder', 'Label/Step', idx, true),
    type: "text",
    style: {
      minHeight: 44
    },
    value: item.date_en || '',
    onChange: e => handleTimelineChange(idx, 'date', e.target.value, true),
    className: "w-1/3 min-w-0 text-xs font-bold text-indigo-600 bg-white border border-indigo-100 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: _timelineReviewLabel(t, 'translate.companion_label', 'Companion translation')
  })), /*#__PURE__*/React.createElement("input", _extends({}, _timelineTranslationAttributes(generatedContent), {
    "aria-label": timelineFieldLabel('timeline.event_placeholder', 'Event description', idx, true),
    type: "text",
    style: {
      minHeight: 44
    },
    value: item.event_en || '',
    onChange: e => handleTimelineChange(idx, 'event', e.target.value, true),
    className: "w-2/3 min-w-0 text-xs text-slate-600 bg-white border border-slate-400 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-300",
    placeholder: _timelineReviewLabel(t, 'translate.companion_label', 'Companion translation')
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1 mt-1 shrink-0"
  }, item.image ? /*#__PURE__*/React.createElement("div", {
    "data-timeline-image-box": true,
    className: "relative group/timgimg w-12 h-12"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: item.decorative ? '' : item.alt || `${item.date || ''}: ${item.event || ''}`,
    className: "w-12 h-12 object-contain rounded border border-slate-400 bg-white"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date),
    disabled: isGeneratingTimelineImage[idx] || !timelineImageAiUsable,
    "aria-busy": !!isGeneratingTimelineImage[idx],
    "aria-label": t('timeline.visuals.regen_button_aria') || 'Regenerate image for this item',
    className: "absolute inset-0 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover/timgimg:opacity-100 focus:opacity-100 transition-opacity text-white disabled:opacity-80",
    title: !timelineImageAiUsable ? _timelineReviewLabel(t, 'sidebar.needs_ai_setup', 'Needs AI setup') : t('common.regenerate') || 'Regenerate'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14
  }))) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date),
    disabled: isGeneratingTimelineImage[idx] || !item.event || !timelineImageAiUsable,
    "aria-busy": !!isGeneratingTimelineImage[idx],
    "aria-label": t('timeline.visuals.regen_button_aria') || 'Generate image for this item',
    className: "w-12 h-12 rounded border-2 border-dashed border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-wait",
    title: !timelineImageAiUsable ? _timelineReviewLabel(t, 'sidebar.needs_ai_setup', 'Needs AI setup') : t('timeline.visuals.regen_button_aria') || 'Generate image'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14
  })), /*#__PURE__*/React.createElement("label", {
    "data-timeline-upload-image": idx,
    className: "inline-flex min-h-7 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-600",
    title: t('timeline.visuals.upload_image_title') || 'Upload image from device'
  }, "Upload", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    className: "sr-only",
    onChange: e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || file.size > 4 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') handleTimelineChange(idx, {
          image: reader.result,
          alt: item.alt || `${item.date || ''}: ${item.event || ''}`.trim()
        });
      };
      reader.readAsDataURL(file);
    }
  })), item.image && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-remove-image": idx,
    onClick: () => handleTimelineChange(idx, {
      image: '',
      alt: ''
    }),
    "aria-label": `${t('timeline.visuals.remove_image_aria') || 'Remove image for'} ${timelinePositionLabel(idx)}`,
    className: "inline-flex min-h-7 items-center justify-center rounded border border-rose-200 bg-white px-1.5 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
  }, "Clear")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": `${t('common.delete')} ${timelinePositionLabel(idx)}${item.event ? ': ' + item.event : ''}`,
    onClick: () => handleDeleteTimelineStep(idx),
    className: "min-w-8 min-h-8 inline-flex items-center justify-center p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors mt-1",
    title: t('timeline.remove_step_title')
  }, /*#__PURE__*/React.createElement(Trash2, {
    size: 16,
    "aria-hidden": "true"
  })), item.image && isEditingTimeline && /*#__PURE__*/React.createElement("div", {
    "data-timeline-image-tools": true,
    className: "basis-full min-w-0 flex flex-col gap-2 border-t border-slate-200 pt-2 motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('timeline.visuals.remove_text_btn') || 'Remove text from image',
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
    disabled: isGeneratingTimelineImage[idx] || !timelineImageAiUsable,
    className: "min-h-8 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 px-2 py-1 rounded flex items-center justify-center gap-1 font-bold disabled:opacity-50",
    title: !timelineImageAiUsable ? _timelineReviewLabel(t, 'sidebar.needs_ai_setup', 'Needs AI setup') : t('timeline.visuals.remove_text_tooltip') || 'Remove text/labels from this image'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Ban, {
    size: 10,
    "aria-hidden": "true"
  }), " ", t('timeline.visuals.remove_text_btn') || 'Remove Text'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-1 min-w-[10rem] gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('timeline.visuals.refine_placeholder') || 'Describe image changes',
    type: "text",
    value: timelineRefinementInputs[idx] || '',
    onChange: e => setTimelineRefinementInputs(prev => ({
      ...prev,
      [idx]: e.target.value
    })),
    placeholder: t('timeline.visuals.refine_placeholder') || 'e.g., make it cuter',
    className: "text-xs border border-yellow-600 rounded px-2 py-1 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 min-w-0",
    onKeyDown: e => {
      if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter' && timelineRefinementInputs[idx] && !isGeneratingTimelineImage[idx] && timelineImageAiUsable) {
        handleGenerateTimelineItemImage(idx, item.event, item.date, timelineRefinementInputs[idx]);
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleGenerateTimelineItemImage(idx, item.event, item.date, timelineRefinementInputs[idx]),
    disabled: !timelineRefinementInputs[idx] || isGeneratingTimelineImage[idx] || !timelineImageAiUsable,
    className: "min-h-8 min-w-8 inline-flex items-center justify-center bg-yellow-400 text-yellow-900 px-2 rounded hover:bg-yellow-500 disabled:opacity-50 shrink-0",
    "aria-label": t('common.apply_edit') || 'Apply edit'
  }, isGeneratingTimelineImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10,
    className: reducedMotion ? '' : 'animate-spin',
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 10,
    "aria-hidden": "true"
  })))), renderTimelineAltField(item, idx)))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAddTimelineStep,
    className: "w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16
  }), " ", t('timeline.add_step'))) : isTeacherMode || isIndependentMode ? (Array.isArray(generatedContent?.data) ? generatedContent?.data : generatedContent?.data?.items || []).map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "relative motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none duration-300",
    style: {
      animationDelay: `${idx * 100}ms`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute -left-[57px] sm:-left-[73px] top-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-indigo-600 border-4 border-indigo-100 box-content"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow flex gap-3 items-start"
  }, item.image && /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: item.decorative ? '' : item.alt || `${item.date || ''}: ${item.event || ''}`,
    className: "object-contain rounded-lg bg-white border border-slate-100 shrink-0",
    style: {
      width: `${timelineImageSize}px`,
      height: `${timelineImageSize}px`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-1"
  }, studyMaskMode === 'labels' && !revealedSteps.has(idx) ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-reveal-label": idx,
    onClick: () => toggleRevealStep(idx),
    className: "min-h-8 inline-flex items-center gap-1 rounded border border-dashed border-indigo-400 bg-indigo-50/70 px-2.5 py-0.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "👁 ", _timelineReviewLabel(t, 'timeline.reveal_label', 'Reveal label')) : /*#__PURE__*/React.createElement("span", {
    className: "inline-block bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded border border-indigo-200"
  }, bt(item.date), item.date_en && /*#__PURE__*/React.createElement("span", _extends({}, _timelineTranslationAttributes(generatedContent), {
    className: "opacity-60 font-normal ml-1"
  }), "(", bt(item.date_en), ")")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-listen": idx,
    onClick: () => {
      const spoken = [item.date, item.event].filter(Boolean).join('. ').replace(/\s+/g, ' ').trim();
      speakTimelineText(spoken, false);
    },
    "aria-label": (t('a11y.read_aloud') || 'Listen') + (item.date ? ': ' + item.date : ''),
    title: t('a11y.read_aloud') || 'Listen',
    className: "shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔊"), /*#__PURE__*/React.createElement("span", null, t('common.listen') || 'Listen'))), studyMaskMode === 'events' && !revealedSteps.has(idx) ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-reveal-event": idx,
    onClick: () => toggleRevealStep(idx),
    className: "mt-1 min-h-11 w-full text-left rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "👁 ", _timelineReviewLabel(t, 'timeline.reveal_event', 'Click to reveal what happened at this step')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-slate-800 leading-relaxed"
  }, bt(item.event)), item.event_en && /*#__PURE__*/React.createElement("p", _extends({}, _timelineTranslationAttributes(generatedContent), {
    className: "text-xs text-slate-600 italic mt-1"
  }), bt(item.event_en))), (() => {
    const _vKey = idx + ':' + (item.event || '');
    const _flagged = item.verification && (item.verification.factual === false || item.verification.position === false);
    if (!_flagged || dismissedVerifications.has(_vKey)) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-2 border border-red-200 rounded-lg bg-red-50 p-2 text-xs text-red-800"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mb-1"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 12,
      className: "shrink-0 text-red-600"
    }), /*#__PURE__*/React.createElement("strong", null, t('timeline.validation.flagged') || 'Flagged'), /*#__PURE__*/React.createElement("span", {
      className: "text-red-700/70"
    }, item.verification.factual === false ? `• ${_timelineReviewLabel(t, 'timeline.validation.factual_tag', 'factual')}` : '', item.verification.position === false ? ` • ${_timelineReviewLabel(t, 'timeline.validation.position_tag', 'position')}` : ''), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setDismissedVerifications(prev => {
        const next = new Set(prev);
        next.add(_vKey);
        return next;
      }),
      className: "ml-auto min-w-6 min-h-6 inline-flex items-center justify-center text-red-700 hover:text-red-900 p-1 rounded",
      "aria-label": t('timeline.validation.dismiss') || 'Dismiss verification concern',
      title: t('timeline.validation.dismiss') || 'Dismiss'
    }, /*#__PURE__*/React.createElement(X, {
      size: 12,
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-red-700 leading-relaxed pl-4"
    }, bt(item.verification.concern || (item.verification.factual === false ? t('timeline.validation.factual_concern') || 'Factual concern — review this item.' : t('timeline.validation.position_concern') || 'Position may be wrong — check placement on the axis.'))));
  })(), item.verification && item.verification.factual === true && item.verification.position === true && (item.verification.rationale ? /*#__PURE__*/React.createElement("details", {
    className: "mt-2 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "inline-flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 text-emerald-800 cursor-pointer hover:bg-emerald-100 list-none transition-colors"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 11,
    className: "text-emerald-600"
  }), _timelineReviewLabel(t, 'timeline.ai_review.no_issue', 'AI review: no issue flagged'), /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700/70 ml-0.5 group-open:rotate-180 transition-transform"
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-xs bg-emerald-50/50 border-l-2 border-emerald-300 px-2 py-1.5 text-emerald-900/90 leading-relaxed rounded-r"
  }, bt(item.verification.rationale))) : /*#__PURE__*/React.createElement("div", {
    className: "mt-2 inline-flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 text-emerald-800"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 11,
    className: "text-emerald-600"
  }), " ", _timelineReviewLabel(t, 'timeline.ai_review.no_issue', 'AI review: no issue flagged'))))))) : /*#__PURE__*/React.createElement("div", {
    className: "relative -ml-12 sm:-ml-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in motion-reduce:animate-none duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-4 rounded-full mb-4"
  }, /*#__PURE__*/React.createElement(ListOrdered, {
    size: 48,
    className: "text-indigo-500"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-black text-slate-700 mb-2"
  }, t('timeline.ready_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-4 max-w-md"
  }, bt(t('timeline.ready_desc'))), timelineItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    "data-timeline-preview-pills": true,
    className: "flex flex-wrap items-center justify-center gap-2 mb-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-white border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-800"
  }, timelineItems.length, " ", _timelineReviewLabel(t, 'timeline.steps_count_label', timelineItems.length === 1 ? 'step' : 'steps')), timelineProgressionLabel && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-800"
  }, _timelineReviewLabel(t, 'timeline.order_by', 'Order by:'), " ", timelineProgressionLabel)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetIsTimelineGameToTrue,
    className: "min-h-11 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 motion-reduce:hover:scale-100 transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 24,
    className: "fill-current text-yellow-300"
  }), " ", t('timeline.start_activity')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-timeline-listen-intro": true,
    onClick: () => speakTimelineText([t('timeline.ready_title'), t('timeline.ready_desc'), timelineItems.length ? `${timelineItems.length} steps` : '', timelineProgressionLabel ? `Order by ${timelineProgressionLabel}` : ''].filter(Boolean).join('. '), false),
    className: "min-h-11 px-4 py-2 rounded-xl border border-indigo-300 bg-white text-indigo-800 text-sm font-bold hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔊 "), _timelineReviewLabel(t, 'timeline.listen_instructions', 'Listen to instructions')))))), isTimelineGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: _timelineReviewLabel(t, 'timeline.game_error', 'Sequence Game encountered an error.')
  }, /*#__PURE__*/React.createElement(TimelineGame, {
    data: generatedContent?.data,
    onClose: closeTimeline,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion,
    onExplainIncorrect: handleExplainTimelineItem,
    initialImageSize: timelineImageSize
  })));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TimelineView = TimelineView;
  window.AlloModules.ViewTimelineModule = true;
})();
