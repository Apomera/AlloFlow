/**
 * AlloFlow View - Simplified (Leveled Text) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='simplified' block.
 * Source range: 1,650 lines body (largest single extraction in the project).
 * Renders: leveled text reader with immersive mode, focus/chunk/crawl/karaoke
 * overlays, side-by-side bilingual layout, define/phonics/revise/cloze/
 * add-glossary interaction modes, level check + rigor report panels,
 * complexity slider, teacher edit mode with formatting toolbar, definition/
 * phonics/revision popups, line focus, theme switcher, immersive toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SimplifiedView) {
    console.log('[CDN] ViewSimplifiedModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSimplifiedModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SimplifiedReadingRoleControl(props) {
  // Collapsed to its one-line summary unless it needs the teacher: no role
  // chosen yet, or the original was not captured.
  const [open, setOpen] = React.useState(!!props.isTeacherMode && (!props.role || props.role === 'unspecified' || !!props.missingOriginal));
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const summaryRef = React.useRef(null);
  const confirmRef = React.useRef(null);
  const selectRef = React.useRef(null);
  React.useEffect(() => {
    if (pending && confirmRef.current) confirmRef.current.focus();
  }, [pending]);
  const save = role => {
    if (props.disabled) return;
    try {
      if (props.onSave(role) === false) {
        setError(simplifiedText('simplified.role_the_choice_could_not_be_saved', 'The choice could not be saved. Please try again.'));
        setOpen(true);
        return;
      }
      setPending(false);
      setError('');
      setOpen(false);
      if (summaryRef.current) summaryRef.current.focus();
    } catch (_) {
      setError(simplifiedText('simplified.role_the_choice_could_not_be_saved', 'The choice could not be saved. Please try again.'));
      setOpen(true);
    }
  };
  // Students get one plain sentence. The form and role names, and notes such
  // as "Original not captured... before sharing", are for the teacher.
  if (!props.isTeacherMode) return /*#__PURE__*/React.createElement("p", {
    "data-instructional-role": props.role,
    "data-student-role-note": true,
    className: "my-3 text-sm text-slate-700"
  }, props.studentLabel || props.formLabel);
  return /*#__PURE__*/React.createElement("details", {
    "data-instructional-role": props.role,
    open: open,
    className: "my-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
  }, /*#__PURE__*/React.createElement("summary", {
    ref: summaryRef,
    onClick: event => {
      event.preventDefault();
      setOpen(value => !value);
    },
    className: "min-h-11 cursor-pointer rounded-lg py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
  }, /*#__PURE__*/React.createElement("strong", null, props.formLabel), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, " · "), /*#__PURE__*/React.createElement("span", null, props.roleLabel)), props.isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "inline-flex flex-wrap items-center gap-2"
  }, simplifiedText('simplified.role_use_in_this_lesson', 'Use in this lesson'), /*#__PURE__*/React.createElement("select", {
    ref: selectRef,
    "aria-label": simplifiedText('simplified.role_use_in_this_lesson', 'Use in this lesson'),
    value: pending ? 'primary' : props.role,
    disabled: props.disabled,
    onChange: event => {
      const role = event.target.value;
      setError('');
      if (role === 'primary' && props.needsAuthorization) setPending(true);else save(role);
    },
    className: "min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-2"
  }, /*#__PURE__*/React.createElement("option", {
    value: "primary"
  }, simplifiedText('simplified.role_main_reading', 'Main reading')), /*#__PURE__*/React.createElement("option", {
    value: "supplemental"
  }, simplifiedText('simplified.role_supporting_reading', 'Supporting reading')), /*#__PURE__*/React.createElement("option", {
    value: "unspecified"
  }, simplifiedText('simplified.role_not_designated', 'Not designated')))), props.role === 'primary' && props.needsAuthorization && !pending && /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: props.disabled,
    onClick: () => setPending(true),
    className: "min-h-11 rounded-lg border border-amber-400 px-3"
  }, simplifiedText('simplified.role_review_main_reading_choice', 'Review main-reading choice')), props.onSelectSource && /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: props.disabled || pending,
    onClick: props.onSelectSource,
    className: "min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900"
  }, simplifiedText('simplified.role_use_for_activities', 'Use for activities'))), pending && props.isTeacherMode && /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": simplifiedText('simplified.role_confirm_main_reading', 'Confirm main reading'),
    className: "mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-amber-950"
  }, /*#__PURE__*/React.createElement("p", null, simplifiedText('simplified.role_use_this_adapted_text_as_the', 'Use this adapted text as the main reading? The grade-level original would no longer be the main text students read, which matters most when they are working toward literacy standards in ELA, science, or history. Confirm that replacing the original fits the student’s documented plan, instructional target, assessment conditions, and local policy.')), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: confirmRef,
    type: "button",
    disabled: props.disabled,
    onClick: () => save('primary'),
    className: "min-h-11 rounded-lg border border-amber-700 bg-white px-3 font-semibold"
  }, simplifiedText('simplified.role_confirm_main_reading', 'Confirm main reading')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: props.disabled,
    onClick: () => {
      setPending(false);
      setError('');
      if (selectRef.current) selectRef.current.focus();
    },
    className: "min-h-11 rounded-lg border border-slate-400 bg-white px-3"
  }, simplifiedText('common.cancel', 'Cancel')))), error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "mt-2 text-red-800"
  }, error), props.showCompanionNote && /*#__PURE__*/React.createElement("p", {
    className: "mt-2"
  }, simplifiedText('simplified.role_adapted_companions_help_preview_ideas_an', 'Adapted companions can activate background knowledge, build context, preview key concepts, and scaffold students toward the original.')), props.missingOriginal && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 text-amber-900"
  }, simplifiedText('simplified.role_original_not_captured_check_the_matching', 'Original not captured. Check the matching source before sharing.')));
}
// A model field the prompt declares as text is not guaranteed to BE text, and React throws
// "Objects are not valid as a React child" on anything else - costing the whole panel rather
// than the one value (2026-09-13: one such entry blanked an entire Curriculum Audit). The
// level-check rubric's per-dimension `reason` is printed straight from the model, so it goes
// through this. Text passes; a single-text object is flattened; anything else renders as
// nothing. Pure. (The syllable list nearby already filters to strings, so it needs no guard.)
function simplifiedAiText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  var keys = ['reason', 'text', 'value', 'label', 'explanation'];
  for (var i = 0; i < keys.length; i++) {
    if (typeof value[keys[i]] === 'string' && value[keys[i]].trim()) return value[keys[i]];
  }
  return '';
}

// Inject Chunk Read mood keyframes once. Reduced-motion media query disables
// the animations globally so users with that preference see static styling.
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-chunk-mood-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-chunk-mood-css';
  st.textContent = '@keyframes allo-chunk-popin { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }' + '@keyframes allo-chunk-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }' + '@media (prefers-reduced-motion: reduce) {' + '  [data-sentence-idx] { animation: none !important; }' + '}';
  if (document.head) document.head.appendChild(st);
})();
// Authoritative dictionary panel (Wiktionary via dictionaryapi.dev, offline-cached)
// rendered beside the AI's leveled definition in the Define popup — triangulation.
// Pure fn of (entry, t); returns null when there's no entry (AI-only fallback).
function renderDictionaryPanel(dict, t, renderRecording) {
  if (!dict) return null;
  var kids = [];
  var sourceUrl = dict.sourceUrl || (dict.word ? 'https://en.wiktionary.org/wiki/' + encodeURIComponent(dict.word) : '');
  kids.push(React.createElement('div', {
    key: 'hd',
    className: 'flex items-center gap-2 mb-1 flex-wrap'
  }, React.createElement('span', {
    className: 'text-[10px] font-bold uppercase tracking-wide text-emerald-700'
  }, t('glossary.popups.dictionary') || 'Dictionary'), dict.phonetic ? React.createElement('span', {
    className: 'text-[11px] text-slate-500'
  }, dict.phonetic) : null, dict.audio ? renderRecording ? renderRecording('definition-recording', dict.audio) : null : null));
  (dict.meanings || []).slice(0, 2).forEach(function (m, mi) {
    var d0 = m.definitions && m.definitions[0] ? m.definitions[0].definition : '';
    if (!d0) return;
    var d0ex = m.definitions[0].example || '';
    kids.push(React.createElement('div', {
      key: 'm' + mi,
      className: 'text-xs text-slate-700 leading-snug mb-1'
    }, m.partOfSpeech ? React.createElement('span', {
      className: 'italic text-slate-500 mr-1'
    }, m.partOfSpeech) : null, d0, d0ex ? React.createElement('span', {
      className: 'block text-[11px] text-slate-500 italic mt-0.5'
    }, '"' + d0ex + '"') : null));
  });
  if (dict.synonyms && dict.synonyms.length) {
    kids.push(React.createElement('div', {
      key: 'syn',
      className: 'text-[11px] text-slate-500 mt-0.5'
    }, (t('glossary.popups.similar') || 'Similar') + ': ' + dict.synonyms.slice(0, 5).join(', ')));
  }
  kids.push(React.createElement('div', {
    key: 'src',
    className: 'text-[10px] text-slate-400 mt-1'
  }, sourceUrl ? React.createElement('a', {
    href: sourceUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    className: 'text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2',
    'aria-label': t('common.more_information') + ': ' + (dict.word || '')
  }, t('common.resource') + ': ' + (dict.source || '')) : t('common.resource') + ': ' + (dict.source || '')));
  return React.createElement('div', {
    className: 'mt-3 pt-3 border-t border-emerald-100'
  }, kids);
}

// Lead with the accessible explanation students asked for, while clearly
// distinguishing it from the sourced dictionary entry that follows.
function renderReadingLevelExplanation(definitionData, t, renderFormattedText) {
  if (!definitionData || !definitionData.text) return null;
  return React.createElement('div', {
    role: "group",
    className: 'rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5',
    'aria-label': t('glossary.popups.reading_level_explanation') || 'Reading-level explanation'
  }, React.createElement('div', {
    className: 'flex items-center gap-2 mb-1.5 flex-wrap'
  }, React.createElement('span', {
    className: 'text-[10px] font-bold uppercase tracking-wide text-indigo-700'
  }, t('glossary.popups.reading_level_explanation') || 'Reading-level explanation'), React.createElement('span', {
    className: 'text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-full px-1.5 py-0.5'
  }, t('glossary.popups.ai_generated') || 'AI-generated')), React.createElement('div', {
    className: 'text-sm text-slate-700 leading-relaxed'
  }, renderFormattedText(definitionData.text, false)));
}

// Authoritative pronunciation row for the phonics popup: real Wiktionary recording
// + authoritative IPA, shown quietly beside the AI phonics. Pure fn; null when absent.
function renderPhonicsDictRow(phonicsData, t, renderRecording) {
  var d = phonicsData && phonicsData.dictionary;
  if (!d || !d.phonetic && !d.audio) return null;
  var row = [React.createElement('span', {
    key: 'lbl',
    className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wide'
  }, t('glossary.popups.dictionary') || 'Dictionary')];
  if (d.phonetic) row.push(React.createElement('span', {
    key: 'ipa',
    className: 'font-mono text-xs text-slate-600'
  }, d.phonetic));
  if (d.audio) row.push(renderRecording ? renderRecording('phonics-recording', d.audio) : null);
  return React.createElement('div', {
    className: 'flex items-center gap-2 flex-wrap px-1'
  }, row);
}
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var Heart = _lazyIcon('Heart');
var CheckCircle = _lazyIcon('CheckCircle');
var Volume2 = _lazyIcon('Volume2');
var Mic = _lazyIcon('Mic');
var Search = _lazyIcon('Search');
var Ear = _lazyIcon('Ear');
var Plus = _lazyIcon('Plus');
var HelpCircle = _lazyIcon('HelpCircle');
var PenTool = _lazyIcon('PenTool');
var Gamepad2 = _lazyIcon('Gamepad2');
var Pencil = _lazyIcon('Pencil');
var GitCompare = _lazyIcon('GitCompare');
var BookOpen = _lazyIcon('BookOpen');
var Settings = _lazyIcon('Settings');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var Copy = _lazyIcon('Copy');
var RefreshCw = _lazyIcon('RefreshCw');
var ShieldCheck = _lazyIcon('ShieldCheck');
var Download = _lazyIcon('Download');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var X = _lazyIcon('X');
var Bold = _lazyIcon('Bold');
var Italic = _lazyIcon('Italic');
var Highlighter = _lazyIcon('Highlighter');
var List = _lazyIcon('List');
var ListOrdered = _lazyIcon('ListOrdered');
var Trophy = _lazyIcon('Trophy');
var ImageIcon = _lazyIcon('ImageIcon');
var Sparkles = _lazyIcon('Sparkles');
var AlertCircle = _lazyIcon('AlertCircle');
var ArrowRight = _lazyIcon('ArrowRight');
var Play = _lazyIcon('Play');
var Pause = _lazyIcon('Pause');
var StopCircle = _lazyIcon('StopCircle');
var Trash2 = _lazyIcon('Trash2');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronUp = _lazyIcon('ChevronUp');
function simplifiedBodyHasCitationMarkers(body) {
  var inFence = false;
  return String(body || '').split(/\r?\n/).some(function (line) {
    if (/^[ \t]*(?:\x60{3}|~~~)/.test(line)) {
      inFence = !inFence;
      return false;
    }
    if (inFence) return false;
    var prose = line.replace(/\x60[^\x60\n]*\x60/g, '');
    return /\[\s*\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e\s*\]\s*\(|\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e|\[Source[ \t]+\d+\]/i.test(prose);
  });
}
function resolveSimplifiedReferences(adaptedBody, adaptedReferences, inputReferences, citationAudit) {
  var ownedReferences = String(adaptedReferences || '');
  if (ownedReferences) return ownedReferences;
  var auditAllowsFallback = !citationAudit || citationAudit.enabled === true && Number(citationAudit.sourceCitationCount || 0) > 0;
  if (!auditAllowsFallback || !simplifiedBodyHasCitationMarkers(adaptedBody)) return '';
  return String(inputReferences || '');
}

// Reading resources keep their renderer type ("simplified") separate from
// their instructional use.  These helpers intentionally live outside the
// component so role changes and comparison-source selection remain pure and
// can be regression tested without mounting the full reader.
function getInstructionalContextApi() {
  try {
    return window.AlloModules && window.AlloModules.InstructionalContext ? window.AlloModules.InstructionalContext : null;
  } catch (_) {
    return null;
  }
}
function fallbackInstructionalText(item) {
  var resource = item && typeof item === 'object' ? item : {};
  var config = resource.config && typeof resource.config === 'object' ? resource.config : {};
  var raw = resource.instructionalText || config.instructionalText || {};
  var rawComplexity = raw.complexity && typeof raw.complexity === 'object' ? raw.complexity : {};
  var rawAuthorization = raw.replacementAuthorization && typeof raw.replacementAuthorization === 'object' ? raw.replacementAuthorization : {};
  var role = ['primary', 'supplemental', 'unspecified'].indexOf(raw.role) >= 0 ? raw.role : 'unspecified';
  var form = ['original', 'same-text-supported', 'adapted'].indexOf(raw.form) >= 0 ? raw.form : resource.type === 'simplified' ? 'adapted' : 'original';
  var educatorAuthorized = rawAuthorization.authorized === true && rawAuthorization.source === 'educator';
  return {
    schemaVersion: 1,
    role: role,
    form: form,
    sourceArtifactId: raw.sourceArtifactId || null,
    primaryArtifactId: raw.primaryArtifactId || null,
    designationSource: ['educator', 'workflow-default', 'legacy-inferred'].indexOf(raw.designationSource) >= 0 ? raw.designationSource : 'legacy-inferred',
    replacementAuthorization: {
      authorized: educatorAuthorized,
      source: educatorAuthorized ? 'educator' : 'none'
    },
    complexity: {
      requestedGrade: rawComplexity.requestedGrade || resource.targetGradeLevel || config.grade || '',
      calibrationTarget: rawComplexity.calibrationTarget || '',
      measuredGrade: rawComplexity.measuredGrade !== undefined ? rawComplexity.measuredGrade : resource.localStats && resource.localStats.score !== undefined ? resource.localStats.score : null,
      method: rawComplexity.method || '',
      status: rawComplexity.status || 'unavailable',
      contentFingerprint: rawComplexity.contentFingerprint || '',
      measuredAt: rawComplexity.measuredAt || '',
      language: rawComplexity.language || config.language || 'English'
    }
  };
}
function getSimplifiedInstructionalText(item) {
  var api = getInstructionalContextApi();
  if (api && typeof api.getInstructionalText === 'function') {
    try {
      return api.getInstructionalText(item);
    } catch (_) {}
  }
  return fallbackInstructionalText(item);
}
function updateSimplifiedInstructionalRole(item, requestedRole) {
  var resource = item && typeof item === 'object' ? item : {};
  var role = ['primary', 'supplemental', 'unspecified'].indexOf(requestedRole) >= 0 ? requestedRole : 'unspecified';
  var current = getSimplifiedInstructionalText(resource);
  var nextProfile = Object.assign({}, current, {
    role: role,
    form: current.form,
    designationSource: 'educator',
    replacementAuthorization: role === 'primary' && current.form === 'adapted' ? {
      authorized: true,
      source: 'educator'
    } : {
      authorized: false,
      source: 'none'
    }
  });
  var api = getInstructionalContextApi();
  if (api && typeof api.normalizeInstructionalText === 'function') {
    try {
      nextProfile = api.normalizeInstructionalText(nextProfile);
    } catch (_) {}
  }
  return Object.assign({}, resource, {
    instructionalText: nextProfile
  });
}
function artifactIdentityValues(item) {
  if (!item || typeof item !== 'object') return [];
  return [item.id, item.uiId, item.artifactId, item.resourceId].filter(function (value) {
    return value !== undefined && value !== null && String(value).trim();
  }).map(function (value) {
    return String(value);
  });
}
function artifactsMatch(left, right) {
  if (!left || !right) return false;
  var leftIds = artifactIdentityValues(left);
  var rightIds = artifactIdentityValues(right);
  if (leftIds.some(function (value) {
    return rightIds.indexOf(value) >= 0;
  })) return true;
  return left === right || !leftIds.length && !rightIds.length && left.type === right.type && left.data === right.data;
}
function findFullHistoryArtifact(history, item) {
  var safeHistory = Array.isArray(history) ? history : [];
  for (var index = safeHistory.length - 1; index >= 0; index -= 1) {
    if (artifactsMatch(safeHistory[index], item)) return safeHistory[index];
  }
  return item || {};
}
function upsertFullHistoryArtifact(history, previousItem, updatedItem) {
  var nextHistory = Array.isArray(history) ? history.slice() : [];
  for (var index = nextHistory.length - 1; index >= 0; index -= 1) {
    if (!artifactsMatch(nextHistory[index], previousItem)) continue;
    // Merge over the history record so a partially hydrated current view can
    // never erase provenance, config, or source-link fields.
    nextHistory[index] = Object.assign({}, nextHistory[index], updatedItem);
    return nextHistory;
  }
  nextHistory.push(updatedItem);
  return nextHistory;
}
function getArtifactReadingText(item) {
  if (!item || typeof item !== 'object') return '';
  var data = item.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    var dataText = data.originalText || data.rawEnglishText || data.sourceText || data.text || data.simplifiedText;
    if (dataText) return String(dataText);
  }
  return String(item.originalText || item.rawEnglishText || item.sourceText || '');
}
function resolveSimplifiedCompareSource(history, adaptedItem, fallbackText) {
  var safeHistory = Array.isArray(history) ? history : [];
  var api = getInstructionalContextApi();
  var snapshot = api && api.getSourceSnapshot && api.getSourceSnapshot(adaptedItem);
  if (snapshot) return {
    text: snapshot.text,
    artifact: {
      id: snapshot.sourceArtifactId,
      config: {
        language: snapshot.language
      },
      data: snapshot.text
    },
    selection: 'captured-source'
  };
  var profile = getSimplifiedInstructionalText(adaptedItem);
  var linkedIds = [profile.sourceArtifactId, profile.primaryArtifactId].filter(function (value, index, values) {
    return value !== undefined && value !== null && String(value).trim() && values.indexOf(value) === index;
  }).map(function (value) {
    return String(value);
  });
  for (var linkIndex = 0; linkIndex < linkedIds.length; linkIndex += 1) {
    for (var historyIndex = safeHistory.length - 1; historyIndex >= 0; historyIndex -= 1) {
      var candidate = safeHistory[historyIndex];
      if (artifactIdentityValues(candidate).indexOf(linkedIds[linkIndex]) < 0) continue;
      if (!api?.sameReadingSourceFamily?.(candidate, adaptedItem)) continue;
      var linkedText = getArtifactReadingText(candidate);
      if (linkedText) return {
        text: linkedText,
        artifact: candidate,
        selection: 'linked-artifact'
      };
    }
  }
  return {
    text: '',
    artifact: null,
    selection: 'original-not-captured'
  };
}

// Identical passages can belong to different lessons or source families.
// Both ownership and the complete captured text must agree before reusing supports.
function sameSimplifiedReadingSnapshot(left, right) {
  return !!left && !!right && left.fingerprint === right.fingerprint && left.text === right.text;
}
function findSimplifiedReadingSupportOwner(history, owner, snapshot) {
  var api = getInstructionalContextApi();
  if (!owner || !snapshot || !api?.sameReadingSourceFamily || !api?.isSupportedOriginal || !api?.getSourceSnapshot) return null;
  if (getSimplifiedInstructionalText(owner).form === 'same-text-supported' && !api.isSupportedOriginal(owner)) return null;
  var candidates = [owner].concat((Array.isArray(history) ? history : []).slice().reverse());
  return candidates.find(function (item) {
    return api.isSupportedOriginal(item) && api.sameReadingSourceFamily(item, owner) && item.data === snapshot.text && sameSimplifiedReadingSnapshot(api.getSourceSnapshot(item), snapshot);
  }) || null;
}
function findSimplifiedComparisonSupportOwner(history, current, comparison, displayedText) {
  var api = getInstructionalContextApi();
  if (!api || !comparison || typeof displayedText !== 'string') return null;
  var owner = comparison.selection === 'captured-source' ? current : comparison.artifact;
  if (!owner) return null;
  var snapshot = api.getSourceSnapshot?.(owner);
  // A teacher may explicitly compare another saved original/analysis. Scope
  // glosses to that reading, never to the adaptation still open on the right.
  if ((!snapshot || snapshot.text !== comparison.text) && getSimplifiedInstructionalText(owner).form !== 'adapted') {
    snapshot = api.createSourceSnapshot?.(comparison.text, {
      sourceArtifactId: owner.id
    });
  }
  if (!snapshot || snapshot.text !== comparison.text || snapshot.text !== displayedText) return null;
  return findSimplifiedReadingSupportOwner(history, owner, snapshot);
}
function findSimplifiedReadingCompanion(history, original, snapshot) {
  var api = getInstructionalContextApi();
  if (!original || !snapshot || !api?.sameReadingSourceFamily || !api?.getSourceSnapshot) return null;
  if (getSimplifiedInstructionalText(original).form === 'same-text-supported' && !api.isSupportedOriginal?.(original)) return null;
  return (Array.isArray(history) ? history : []).slice().reverse().find(function (item) {
    return item?.type === 'simplified' && getSimplifiedInstructionalText(item).form === 'adapted' && api.sameReadingSourceFamily(item, original) && sameSimplifiedReadingSnapshot(api.getSourceSnapshot(item), snapshot);
  }) || null;
}
function getSimplifiedComplexityDisplay(item, ambientGrade) {
  var resource = item && typeof item === 'object' ? item : {};
  var resourceConfig = resource.config && typeof resource.config === 'object' ? resource.config : {};
  var hasCanonicalProfile = !!(resource.instructionalText || resource.textProfile || resourceConfig.instructionalText || resourceConfig.textProfile);
  var profile = getSimplifiedInstructionalText(resource);
  var complexity = profile.complexity && typeof profile.complexity === 'object' ? profile.complexity : {};
  var rawMeasured = complexity.measuredGrade;
  var hasMeasured = rawMeasured !== null && rawMeasured !== '' && rawMeasured !== undefined;
  var measured = hasMeasured ? Number(rawMeasured) : NaN;
  if (!hasCanonicalProfile && !Number.isFinite(measured) && resource.localStats && resource.localStats.score !== undefined) {
    rawMeasured = resource.localStats.score;
    measured = Number(rawMeasured);
  }
  var targetGrade = complexity.requestedGrade || resource.targetGradeLevel || resourceConfig.grade || ambientGrade || '';
  var api = getInstructionalContextApi();
  var currentFingerprint = '';
  if (api && typeof api.fingerprintText === 'function' && typeof resource.data === 'string') {
    try {
      currentFingerprint = api.fingerprintText(resource.data);
    } catch (_) {}
  }
  if (complexity.contentFingerprint && currentFingerprint && complexity.contentFingerprint !== currentFingerprint) {
    return {
      measuredGrade: null,
      targetGrade: targetGrade,
      status: 'stale',
      target: null
    };
  }
  if (!Number.isFinite(measured)) {
    return {
      measuredGrade: null,
      targetGrade: targetGrade,
      status: complexity.status || 'unavailable',
      target: null
    };
  }
  var languageIsEnglish = true;
  if (api && typeof api.isEnglishLanguage === 'function') {
    try {
      languageIsEnglish = api.isEnglishLanguage(complexity.language || 'English');
    } catch (_) {}
  }
  var status = !languageIsEnglish ? 'unavailable' : api && typeof api.complexityStatus === 'function' ? api.complexityStatus(measured, targetGrade) : ['below-target', 'within-target', 'above-target'].indexOf(complexity.status) >= 0 ? complexity.status : 'unavailable';
  var target = null;
  if (api && typeof api.getComplexityTarget === 'function') {
    try {
      target = api.getComplexityTarget(targetGrade);
    } catch (_) {}
  }
  return {
    measuredGrade: measured,
    targetGrade: targetGrade,
    status: status,
    target: target
  };
}
async function checkSimplifiedAlignment(deps) {
  var options = deps || {};
  var generatedContent = options.generatedContent;
  var gradeLevel = options.gradeLevel;
  var leveledTextLanguage = options.leveledTextLanguage;
  var activeResolvedStandardsContext = options.activeResolvedStandardsContext;
  var standardsInput = options.standardsInput;
  var targetStandards = options.targetStandards;
  var alloBotRef = options.alloBotRef;
  var t = options.t;
  var addToast = options.addToast;
  var setIsCheckingAlignment = options.setIsCheckingAlignment;
  var callGemini = options.callGemini;
  var cleanJson = options.cleanJson;
  var setGeneratedContent = options.setGeneratedContent;
  var setHistory = options.setHistory;
  var speak = options.speak;
  var warnLog = options.warnLog;
  var setError = options.setError;
  if (!generatedContent || generatedContent.type !== 'simplified') return;
  var contextModule = window.AlloModules && window.AlloModules.InstructionalContext;
  var alignmentContext = contextModule && typeof contextModule.resolveArtifactContext === 'function' ? contextModule.resolveArtifactContext(generatedContent, {
    grade: gradeLevel,
    language: leveledTextLanguage,
    standardsContext: activeResolvedStandardsContext,
    standards: standardsInput || targetStandards || null
  }) : {
    grade: generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
    standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || activeResolvedStandardsContext || standardsInput || targetStandards || null
  };
  var alignmentGrade = alignmentContext.grade || gradeLevel;
  var alignmentStandardsValue = alignmentContext.standards;
  var alignmentStandardsText = function () {
    if (!alignmentStandardsValue) return '';
    if (typeof alignmentStandardsValue === 'string') return alignmentStandardsValue.trim();
    if (typeof alignmentStandardsValue.promptText === 'string' && alignmentStandardsValue.promptText.trim()) {
      return alignmentStandardsValue.promptText.trim();
    }
    var entries = Array.isArray(alignmentStandardsValue.standards) ? alignmentStandardsValue.standards : Array.isArray(alignmentStandardsValue) ? alignmentStandardsValue : [];
    return entries.map(function (entry) {
      return typeof entry === 'string' ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(': ');
    }).filter(Boolean).join('; ');
  }().slice(0, 4000);
  if (alloBotRef && alloBotRef.current) {
    var contextMessage = t('bot_events.feedback_audit_start').replace('{standard}', alignmentStandardsText || 'Standard');
    alloBotRef.current.speak(contextMessage);
  }
  if (!alignmentStandardsText) {
    addToast(t('alignment.notifications.no_standard_error'), 'error');
    return;
  }
  setIsCheckingAlignment(true);
  try {
    var textToCheck = typeof generatedContent?.data === 'string' ? generatedContent.data : '';
    var prompt = `
            You are a curriculum specialist. Evaluate the rigor of the following text against ALL provided standards.
            Target Standards: "${alignmentStandardsText}"
            Target Grade Level: ${alignmentGrade}
            Text to Evaluate:
            "${textToCheck.substring(0, 3000)}",
            Task:
            1. Think step-by-step. Analyze the cognitive demand (verbs) and content (nouns) of the standards.
            2. Identify specific evidence in the text that matches these requirements.
            3. Determine if the text supports the full rigor required by the standards, or if simplification has removed necessary depth.
            Return ONLY JSON:
            {
                "evidence": "List specific phrases or sections from the text that serve as evidence of alignment...",
                "status": "Aligned" or "Partially Aligned" or "Not Aligned",
                "rigorReport": "Explanation of how the text meets or fails the cognitive demand based on the evidence...",
                "missingElements": "Specific concepts or structures from the standard that are absent (or 'None')...",
                "improvement": "One specific edit to increase rigor without breaking accessibility."
            }
        `;
    var result = await callGemini(prompt, true);
    var parsedAnalysis = JSON.parse(cleanJson(result));
    var fingerprintText = contextModule && typeof contextModule.fingerprintText === 'function' ? contextModule.fingerprintText(textToCheck) : String(textToCheck.length) + '|' + textToCheck.slice(0, 64) + '|' + textToCheck.slice(-64);
    var fingerprintStandards = contextModule && typeof contextModule.fingerprintValue === 'function' ? contextModule.fingerprintValue(alignmentStandardsValue) : '';
    var analysis = {
      ...parsedAnalysis,
      contentFingerprint: fingerprintText,
      checkedAt: new Date().toISOString(),
      contextSnapshot: {
        grade: alignmentGrade,
        standardsFingerprint: fingerprintStandards,
        standardsText: alignmentStandardsText
      }
    };
    var updatedContent = {
      ...generatedContent,
      alignmentCheck: analysis
    };
    setGeneratedContent(updatedContent);
    setHistory(function (previous) {
      return previous.map(function (item) {
        return item.id === generatedContent.id ? updatedContent : item;
      });
    });
    addToast(t('alignment.notifications.check_complete'), 'success');
    var feedbackKey = 'bot.rigor_feedback_misaligned';
    if (analysis.status === 'Aligned') feedbackKey = 'bot.rigor_feedback_aligned';else if (analysis.status === 'Partially Aligned') feedbackKey = 'bot.rigor_feedback_partial';
    speak(t(feedbackKey));
  } catch (error) {
    warnLog('Unhandled error:', error);
    setError(t('alignment.notifications.error_check'));
    addToast(t('alignment.notifications.check_failed'), 'error');
  } finally {
    setIsCheckingAlignment(false);
  }
}
async function regenerateSimplifiedWithRigor(deps) {
  var options = deps || {};
  var generatedContent = options.generatedContent;
  var setIsProcessing = options.setIsProcessing;
  var splitReferencesFromBody = options.splitReferencesFromBody;
  var extractSourceTextForProcessing = options.extractSourceTextForProcessing;
  var activeResolvedStandardsContext = options.activeResolvedStandardsContext;
  var standardsInput = options.standardsInput;
  var targetStandards = options.targetStandards;
  var gradeLevel = options.gradeLevel;
  var leveledTextLanguage = options.leveledTextLanguage;
  var translationTargetChoices = options.translationTargetChoices;
  var currentUiLanguage = options.currentUiLanguage;
  var selectedLanguages = options.selectedLanguages;
  var resolveTranslationPolicy = options.resolveTranslationPolicy;
  var translationMode = options.translationMode;
  var generateBilingualText = options.generateBilingualText;
  var callGemini = options.callGemini;
  var applySimplifiedTextMutation = options.applySimplifiedTextMutation;
  var setGeneratedContent = options.setGeneratedContent;
  var setHistory = options.setHistory;
  var addToast = options.addToast;
  var t = options.t;
  var warnLog = options.warnLog;
  var setError = options.setError;
  if (!generatedContent || !generatedContent.alignmentCheck || !generatedContent?.data || getSimplifiedInstructionalText(generatedContent).form === 'same-text-supported') return;
  setIsProcessing(true);
  try {
    var rawText = typeof generatedContent?.data === 'string' ? generatedContent.data : '';
    var isLeveledText = generatedContent.type === 'simplified';
    var originalParts = isLeveledText ? splitReferencesFromBody(rawText) : {
      body: rawText,
      references: ''
    };
    var sourceExtraction = extractSourceTextForProcessing(originalParts.body, false);
    var currentText = sourceExtraction.text;
    var countCitationMarkers = function (value) {
      return (String(value || '').match(/\[\u207d[\u2070\u00b9\u00b2\u00b3\u2074-\u2079]+\u207e\]\(/g) || []).length;
    };
    var validateRigorCitations = function (original, candidate) {
      var modules = typeof window !== 'undefined' && window.AlloModules;
      var beforeCountFallback = countCitationMarkers(original);
      var afterCountFallback = countCitationMarkers(candidate);
      var citationShaped = beforeCountFallback > 0 || afterCountFallback > 0;
      var unavailable = function (reason, error) {
        return {
          valid: !citationShaped,
          ok: !citationShaped,
          reason: reason,
          error: error ? String(error?.message || error) : undefined,
          beforeCount: beforeCountFallback,
          afterCount: afterCountFallback,
          orderChanged: false
        };
      };
      var normalizeDecision = function (result) {
        if (typeof result === 'boolean') return {
          known: true,
          valid: result
        };
        if (!result || typeof result !== 'object') return {
          known: false,
          valid: false
        };
        if (Object.prototype.hasOwnProperty.call(result, 'valid')) return {
          known: true,
          valid: result.valid === true
        };
        if (Object.prototype.hasOwnProperty.call(result, 'ok')) return {
          known: true,
          valid: result.ok === true
        };
        if (Object.prototype.hasOwnProperty.call(result, 'conserved')) return {
          known: true,
          valid: result.conserved === true
        };
        return {
          known: false,
          valid: false
        };
      };
      var dispatcherValidate = modules?.GenDispatcher?.validateAdaptationCitationConservation;
      if (typeof dispatcherValidate === 'function') {
        try {
          var dispatcherResult = dispatcherValidate(original, candidate);
          var dispatcherDecision = normalizeDecision(dispatcherResult);
          if (!dispatcherDecision.known) return unavailable('citation-validator-invalid-result');
          var dispatcherDetails = dispatcherResult && typeof dispatcherResult === 'object' ? dispatcherResult : {};
          return {
            ...dispatcherDetails,
            valid: dispatcherDecision.valid && !dispatcherDetails.orderChanged,
            ok: dispatcherDecision.valid && !dispatcherDetails.orderChanged,
            beforeCount: Number(dispatcherDetails.beforeCount ?? dispatcherDetails.originalLedger?.occurrences?.length ?? beforeCountFallback),
            afterCount: Number(dispatcherDetails.afterCount ?? dispatcherDetails.candidateLedger?.occurrences?.length ?? afterCountFallback),
            orderChanged: !!dispatcherDetails.orderChanged
          };
        } catch (error) {
          return unavailable('citation-validator-error', error);
        }
      }
      var pipeline = modules?.TextPipelineHelpers;
      var pipelineValidate = pipeline?.validateCitationConservation;
      var extractLedger = pipeline?.extractCitationLedger;
      if (typeof pipelineValidate !== 'function' || typeof extractLedger !== 'function') {
        return unavailable('citation-validator-unavailable');
      }
      try {
        var pipelineResult = pipelineValidate(original, candidate);
        var pipelineDecision = normalizeDecision(pipelineResult);
        if (!pipelineDecision.known) return unavailable('citation-validator-invalid-result');
        var originalOccurrences = extractLedger(original)?.occurrences || [];
        var candidateOccurrences = extractLedger(candidate)?.occurrences || [];
        var orderChanged = originalOccurrences.length !== candidateOccurrences.length || originalOccurrences.some(function (entry, index) {
          return entry?.key !== candidateOccurrences[index]?.key;
        });
        var pipelineDetails = pipelineResult && typeof pipelineResult === 'object' ? pipelineResult : {};
        return {
          ...pipelineDetails,
          valid: pipelineDecision.valid && !orderChanged,
          ok: pipelineDecision.valid && !orderChanged,
          beforeCount: originalOccurrences.length,
          afterCount: candidateOccurrences.length,
          orderChanged: orderChanged
        };
      } catch (error) {
        return unavailable('citation-validator-error', error);
      }
    };
    var contextModule = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.InstructionalContext : null;
    var ambientStandardsContext = typeof activeResolvedStandardsContext !== 'undefined' ? activeResolvedStandardsContext : null;
    var ambientStandards = typeof standardsInput !== 'undefined' ? standardsInput : typeof targetStandards !== 'undefined' ? targetStandards : null;
    var rigorContext = contextModule && typeof contextModule.resolveArtifactContext === 'function' ? contextModule.resolveArtifactContext(generatedContent, {
      grade: gradeLevel,
      language: leveledTextLanguage,
      standardsContext: ambientStandardsContext,
      standards: ambientStandards
    }) : {
      grade: generatedContent?.instructionalText?.complexity?.requestedGrade || generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
      language: generatedContent?.instructionalText?.complexity?.language || generatedContent?.config?.language || leveledTextLanguage || 'English',
      standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || ambientStandardsContext || ambientStandards || null
    };
    var rigorGrade = rigorContext.grade || gradeLevel;
    var rigorLanguage = rigorContext.language || leveledTextLanguage || 'English';
    var rigorStandardsValue = rigorContext.standards;
    var rigorStandards = function () {
      if (!rigorStandardsValue) return '';
      if (typeof rigorStandardsValue === 'string') return rigorStandardsValue.trim();
      if (typeof rigorStandardsValue.promptText === 'string' && rigorStandardsValue.promptText.trim()) {
        return rigorStandardsValue.promptText.trim();
      }
      var entries = Array.isArray(rigorStandardsValue.standards) ? rigorStandardsValue.standards : Array.isArray(rigorStandardsValue) ? rigorStandardsValue : [];
      return entries.map(function (entry) {
        return typeof entry === 'string' ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(': ');
      }).filter(Boolean).join('; ');
    }().slice(0, 2400);
    var suggestion = generatedContent.alignmentCheck.improvement;
    var prompt = `
            Rewrite the following educational text to address specific feedback regarding standard alignment.
            Current Text:
            "${currentText}",
            Feedback/Suggestion to Implement:
            "${suggestion}",
            Target Audience: ${rigorGrade} students.
            ${rigorStandards ? `Standards Context: ${rigorStandards}` : ''}
            Instructions:
            - Incorporate the suggestion to increase rigor or alignment.
            - Maintain the appropriate reading level for ${rigorGrade}.
            - Preserve the disciplinary concepts and cognitive demand in the recorded standards context.
            - Write the rewritten text in ${rigorLanguage}.
            ${isLeveledText ? `- Preserve every inline Markdown citation exactly as written, including its superscript number, URL, occurrence count, and order.
            - Keep each citation attached to the same supported claim; never add, remove, duplicate, rename, reorder, or alter a citation.
            - Do not produce a Sources, References, Bibliography, or Works Cited section. AlloFlow appends the preserved reference trailer after validation.` : ''}
        `;
    var rigorTranslationChoices = typeof translationTargetChoices === 'function' ? translationTargetChoices(rigorLanguage, currentUiLanguage, typeof selectedLanguages !== 'undefined' ? selectedLanguages : []) : [];
    var rigorTranslationPolicy = typeof resolveTranslationPolicy === 'function' ? resolveTranslationPolicy(translationMode, rigorLanguage, currentUiLanguage, rigorTranslationChoices) : {
      enabled: false,
      target: 'English',
      mode: 'off'
    };
    var newText = await generateBilingualText(prompt, rigorLanguage, callGemini, rigorTranslationPolicy);
    var rigorCitationAudit = null;
    if (isLeveledText) {
      var candidateParts = splitReferencesFromBody(newText);
      var candidateBody = String(candidateParts.body || '').trim();
      var candidateExtraction = extractSourceTextForProcessing(candidateBody, false);
      var candidateTarget = candidateExtraction.targetLangBlock || candidateExtraction.text;
      var originalForValidation = sourceExtraction.isBilingual ? originalParts.body : currentText;
      var candidateForValidation = sourceExtraction.isBilingual ? candidateBody : candidateTarget;
      var conservation = validateRigorCitations(originalForValidation, candidateForValidation);
      var shouldValidateGeneratedEnglish = !sourceExtraction.isBilingual && (candidateExtraction.isBilingual || String(rigorLanguage || '').trim().toLowerCase() !== 'english');
      if (shouldValidateGeneratedEnglish) {
        var englishConservation = validateRigorCitations(candidateTarget, candidateExtraction.isBilingual ? candidateExtraction.englishBlock : '');
        conservation = {
          ...conservation,
          valid: !!conservation.valid && !!englishConservation.valid,
          ok: !!conservation.valid && !!englishConservation.valid,
          beforeCount: Number(conservation.beforeCount || 0) + Number(englishConservation.beforeCount || 0),
          afterCount: Number(conservation.afterCount || 0) + Number(englishConservation.afterCount || 0),
          orderChanged: !!conservation.orderChanged || !!englishConservation.orderChanged,
          english: englishConservation
        };
      }
      rigorCitationAudit = {
        stage: 'rigor-regeneration',
        valid: !!conservation.valid,
        beforeCount: Number(conservation.beforeCount ?? conservation.originalLedger?.occurrences?.length ?? countCitationMarkers(originalForValidation)),
        afterCount: Number(conservation.afterCount ?? conservation.candidateLedger?.occurrences?.length ?? countCitationMarkers(candidateForValidation)),
        orderChanged: !!conservation.orderChanged,
        ...(conservation.reason ? {
          reason: conservation.reason
        } : {})
      };
      if (!conservation.valid) {
        var citationError = new Error(simplifiedText('simplified.rigor_rigor_regeneration_changed_or_could_not', 'Rigor regeneration changed or could not verify source citations.'));
        citationError.code = 'citation-conservation-failed';
        citationError.details = conservation;
        throw citationError;
      }
      newText = [candidateBody, originalParts.references].filter(Boolean).join('\n\n');
    }
    var priorConfig = generatedContent.config && typeof generatedContent.config === 'object' ? generatedContent.config : {};
    var priorAudit = priorConfig.citationAudit && typeof priorConfig.citationAudit === 'object' ? priorConfig.citationAudit : null;
    var updatedConfig = rigorCitationAudit ? {
      ...priorConfig,
      citationAudit: {
        ...(priorAudit || {
          version: 1,
          policy: 'exact-marker-order',
          enabled: rigorCitationAudit.beforeCount > 0,
          status: 'valid',
          fallbackCount: 0
        }),
        stages: [...(Array.isArray(priorAudit?.stages) ? priorAudit.stages : []), rigorCitationAudit]
      }
    } : generatedContent.config;
    var updatedContent = {
      ...generatedContent,
      data: newText,
      ...(rigorCitationAudit ? {
        config: updatedConfig
      } : {})
    };
    // Keep readability and AI-check evidence tied to the exact rewritten
    // bytes, just as manual edits and undo/redo do.
    if (isLeveledText && typeof applySimplifiedTextMutation === 'function') {
      updatedContent = applySimplifiedTextMutation(updatedContent, newText);
    } else {
      delete updatedContent.localStats;
      var fallbackContextModule = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.InstructionalContext : null;
      if (fallbackContextModule && typeof fallbackContextModule.getInstructionalText === 'function' && typeof fallbackContextModule.invalidateComplexityEvidence === 'function') {
        var baseInstructionalText = fallbackContextModule.getInstructionalText(updatedContent, {
          complexity: {
            requestedGrade: rigorGrade,
            language: rigorLanguage
          }
        });
        updatedContent.instructionalText = fallbackContextModule.invalidateComplexityEvidence(baseInstructionalText, newText, 'stale');
        updatedContent.targetGradeLevel = rigorGrade;
      }
      delete updatedContent.alignmentCheck;
      if (updatedContent.levelCheck) delete updatedContent.levelCheck;
    }
    setGeneratedContent(updatedContent);
    setHistory(function (previous) {
      return previous.map(function (item) {
        return item.id === generatedContent.id ? updatedContent : item;
      });
    });
    addToast(t('alignment.notifications.regenerated_success'), 'success');
  } catch (error) {
    if (error?.code === 'citation-conservation-failed') {
      warnLog('[CitationConservation] Rigor regeneration rejected; original resource retained.', error.details || error);
      addToast(simplifiedText('simplified.rigor_citations_kept', 'The rigor rewrite could not preserve and verify every source citation, so the original citation-safe version was retained.', undefined, t), 'warning');
      return;
    }
    warnLog('Unhandled error:', error);
    setError(t('errors.text_regeneration_failed'));
    addToast(t('alignment.notifications.regen_failed'), 'error');
  } finally {
    setIsProcessing(false);
  }
}

// Shared reading structure and word targets. All layouts use the same helpers.
function simplifiedLanguageTag(language) {
  var value = String(language || '').trim();
  var names = {
    english: 'en',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    arabic: 'ar',
    hebrew: 'he',
    persian: 'fa',
    urdu: 'ur',
    hindi: 'hi',
    bengali: 'bn',
    punjabi: 'pa',
    tamil: 'ta',
    telugu: 'te',
    marathi: 'mr',
    gujarati: 'gu',
    russian: 'ru',
    ukrainian: 'uk',
    polish: 'pl',
    turkish: 'tr',
    vietnamese: 'vi',
    korean: 'ko',
    chinese: 'zh',
    'mandarin chinese': 'zh',
    'simplified chinese': 'zh-Hans',
    'traditional chinese': 'zh-Hant',
    japanese: 'ja',
    thai: 'th',
    lao: 'lo',
    khmer: 'km',
    burmese: 'my',
    indonesian: 'id',
    malay: 'ms',
    swahili: 'sw',
    somali: 'so',
    haitian: 'ht',
    'haitian creole': 'ht',
    // The rest of the app's language list, so screen readers pick the right voice.
    dutch: 'nl',
    malayalam: 'ml',
    kannada: 'kn',
    esperanto: 'eo',
    greek: 'el',
    latin: 'la',
    nepali: 'ne',
    mandarin: 'zh',
    cantonese: 'yue',
    tagalog: 'tl',
    filipino: 'fil',
    farsi: 'fa',
    pashto: 'ps',
    dari: 'fa-AF',
    hausa: 'ha',
    yoruba: 'yo',
    igbo: 'ig',
    amharic: 'am',
    tigrinya: 'ti',
    lingala: 'ln',
    kinyarwanda: 'rw',
    kirundi: 'rn',
    acholi: 'ach',
    karen: 'ksw',
    hmong: 'hmn',
    mongolian: 'mn',
    'maay maay': 'ymm',
    marshallese: 'mh',
    'spanish (latin america)': 'es-419',
    'spanish (castilian)': 'es-ES',
    'french (canadian)': 'fr-CA',
    'portuguese (brazil)': 'pt-BR',
    'portuguese (angola)': 'pt-AO',
    'chinese (simplified)': 'zh-Hans',
    'chinese (traditional)': 'zh-Hant',
    'chin (hakha)': 'cnh',
    'chin (falam)': 'cfm'
  };
  var name = value.toLowerCase().replace(/\s+/g, ' '),
    base = name.replace(/\s*\(.*\)$/, '');
  if (names[name] || names[base]) return names[name] || names[base];
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)) return undefined;
  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch (_) {
    return undefined;
  }
}
function simplifiedWordSegments(text, language) {
  var value = String(text || '');
  try {
    if (typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter(simplifiedLanguageTag(language), {
        granularity: 'word'
      }).segment(value), function (part) {
        return {
          text: part.segment,
          word: !!part.isWordLike
        };
      });
    }
  } catch (_) {}
  // Keep punctuation and spacing as text; unspaced scripts retain selectable
  // graphemes if the runtime cannot provide dictionary-based segmentation.
  return (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]\p{M}*|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu) || []).map(function (part) {
    return {
      text: part,
      word: /[\p{L}\p{N}]/u.test(part)
    };
  });
}
// Word-level changes between two versions, for the adaptation preview. Null
// when the texts are too long to compare quickly.
function simplifiedWordDiff(before, after) {
  var oldTokens = String(before || '').split(/(\s+)/).filter(Boolean),
    newTokens = String(after || '').split(/(\s+)/).filter(Boolean);
  if (oldTokens.length * newTokens.length > 4000000) return null;
  var matrix = Array.from({
    length: oldTokens.length + 1
  }, () => new Uint32Array(newTokens.length + 1));
  for (var a = 1; a <= oldTokens.length; a++) for (var b = 1; b <= newTokens.length; b++) matrix[a][b] = oldTokens[a - 1] === newTokens[b - 1] ? matrix[a - 1][b - 1] + 1 : Math.max(matrix[a - 1][b], matrix[a][b - 1]);
  var parts = [],
    x = oldTokens.length,
    y = newTokens.length;
  while (x || y) {
    if (x && y && oldTokens[x - 1] === newTokens[y - 1]) {
      parts.push({
        type: 'same',
        value: oldTokens[--x]
      });
      --y;
    } else if (x && (!y || matrix[x - 1][y] >= matrix[x][y - 1])) parts.push({
      type: 'del',
      value: oldTokens[--x]
    });else parts.push({
      type: 'add',
      value: newTokens[--y]
    });
  }
  parts.reverse();
  // Group each changed stretch (spaces inside it too): all removed words, then all new ones.
  var grouped = [],
    del = '',
    add = '';
  var flush = () => {
    if (del) grouped.push({
      type: 'del',
      value: del
    });
    if (add) grouped.push({
      type: 'add',
      value: add
    });
    del = add = '';
  };
  parts.forEach((part, index) => {
    var inside = part.type === 'same' && !part.value.trim() && (del || add) && parts.slice(index + 1).find(next => next.value.trim())?.type !== 'same';
    if (part.type === 'del' || inside) del += part.value;
    if (part.type === 'add' || inside) add += part.value;
    if (part.type === 'same' && !inside) {
      flush();
      grouped.push(part);
    }
  });
  flush();
  return grouped;
}
function simplifiedPlainInline(text) {
  return String(text || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\*\*|__|~~|`/g, '').replace(/\*([^*]+)\*/g, '$1');
}
// Named as in formatInteractiveText (phase_n): "Source 1, opens in a new tab",
// not "superscript one". The superscript digits and brackets are char codes.
function simplifiedLinkLabel(label) {
  var value = String(label || '').trim(),
    digits = [0x2070, 0xB9, 0xB2, 0xB3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079].map(code => String.fromCharCode(code));
  var inner = value.length > 2 && value.charCodeAt(0) === 0x207D && value.charCodeAt(value.length - 1) === 0x207E ? value.slice(1, -1).split('').map(ch => digits.indexOf(ch)) : null;
  var name = inner && inner.every(d => d >= 0) ? simplifiedText('common.source_number', 'Source {number}', {
    number: inner.join('')
  }) : value;
  return name + ', ' + simplifiedText('common.opens_new_tab', 'opens in a new tab');
}
function simplifiedInline(text, leaf, sourceOffset) {
  // Optional source offsets keep glosses anchored to the stored Markdown.
  var cursor = sourceOffset || 0,
    withOffsets = Number.isInteger(sourceOffset);
  return String(text || '').split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g).map(function (part, index) {
    var start = cursor;
    cursor += part.length;
    if (/^(\*\*|__)/.test(part)) return /*#__PURE__*/React.createElement("strong", {
      key: index
    }, simplifiedInline(part.slice(2, -2), leaf, withOffsets ? start + 2 : undefined));
    if (/^\*[^*]/.test(part)) return /*#__PURE__*/React.createElement("em", {
      key: index
    }, simplifiedInline(part.slice(1, -1), leaf, withOffsets ? start + 1 : undefined));
    if (/^`/.test(part)) return /*#__PURE__*/React.createElement("code", {
      key: index
    }, withOffsets ? leaf(part.slice(1, -1), start + 1, false) : part.slice(1, -1));
    var link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (link) {
      var label = withOffsets ? leaf(link[1], start + 1, false) : link[1];
      return /^(https?:\/\/|mailto:|#|\/)/i.test(link[2]) ? /*#__PURE__*/React.createElement("a", {
        key: index,
        href: link[2],
        "aria-label": simplifiedLinkLabel(link[1]),
        target: "_blank",
        rel: "noopener noreferrer",
        className: "underline decoration-2 underline-offset-2 rounded focus-visible:ring-2 focus-visible:ring-indigo-600",
        onClick: e => e.stopPropagation()
      }, label) : /*#__PURE__*/React.createElement(React.Fragment, {
        key: index
      }, label);
    }
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: index
    }, leaf(part, withOffsets ? start : undefined));
  });
}
function simplifiedExactBlocks(raw, formatted) {
  var chunks = String(raw || '').split(/(\r\n|\r|\n)/),
    cursor = 0,
    skipBlank = false;
  var blocks = [];
  for (var i = 0; i < chunks.length; i += 2) {
    var line = chunks[i],
      separator = chunks[i + 1] || '';
    var block = {
      type: 'line',
      raw: line,
      text: line,
      start: cursor,
      end: cursor + line.length,
      textStart: cursor,
      separator,
      lineIndex: i
    };
    cursor += line.length + separator.length;
    // A heading marker with no text ("#") showed as a lone "#"; it is hidden
    // with its line break, and with the blank line after it when one comes
    // before it, so no extra gap is left. Offsets are unchanged.
    if (formatted && /^[ \t]{0,3}#{1,6}[ \t]*$/.test(line)) {
      Object.assign(block, {
        type: 'hidden',
        text: '',
        textStart: block.end
      });
      blocks.push(block);
      var previous = blocks[blocks.length - 2];
      if (previous && !previous.raw && i + 2 < chunks.length && chunks[i + 2] === '') skipBlank = true;
      continue;
    }
    if (skipBlank) {
      skipBlank = false;
      if (!line) {
        Object.assign(block, {
          type: 'hidden'
        });
        blocks.push(block);
        continue;
      }
    }
    var heading = formatted && line.match(/^([ \t]{0,3})(#{1,6})[ \t]+(.+)$/);
    var htmlHeading = formatted && !heading && line.match(/^([ \t]*<h([1-6])[^>]*>)(.*?)<\/h\2>[ \t]*$/i);
    var rule = formatted && /^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line);
    var item = formatted && !rule && line.match(/^([ \t]*)([-+*]|\d+[.)])[ \t]+(.+)$/);
    var quote = formatted && line.match(/^([ \t]*>[ \t]?)(.*)$/);
    if (heading) Object.assign(block, {
      type: 'heading',
      level: heading[2].length,
      text: heading[3],
      textStart: block.end - heading[3].length
    });else if (htmlHeading) Object.assign(block, {
      type: 'heading',
      level: Number(htmlHeading[2]),
      text: htmlHeading[3],
      textStart: block.start + htmlHeading[1].length
    });else if (rule) Object.assign(block, {
      type: 'rule',
      text: '',
      textStart: block.end
    });else if (item) Object.assign(block, {
      type: 'li',
      indent: item[1].replace(/\t/g, '    ').length,
      ordered: /^\d/.test(item[2]),
      value: parseInt(item[2], 10) || 1,
      text: item[3],
      textStart: block.end - item[3].length
    });else if (quote) Object.assign(block, {
      type: 'quote',
      text: quote[2],
      textStart: block.start + quote[1].length
    });
    blocks.push(block);
  }
  return blocks;
}
// As in renderFormattedText, a passage's top heading is h2 (the page owns h1)
// and deeper headings keep their order. Font size still follows the source level.
function simplifiedHeadingLevels(text) {
  return String(text || '').split('\n').map(line => line.match(/^\s{0,3}(#{1,6})\s+\S/) || line.match(/^\s*<h([1-6])[^>]*>.*?<\/h[1-6]>\s*$/i)).filter(Boolean).map(match => /^#/.test(match[1]) ? match[1].length : Number(match[1]));
}
function simplifiedHeadingTag(level, levels) {
  return 'h' + Math.max(2, Math.min(6, level + 2 - (levels.length ? Math.min.apply(null, levels) : level)));
}
// Immersive words come from the whole text, including table cells, references
// and the translation divider, which are not sentences. Matching by running
// character count let one table push every later highlight onto the wrong
// sentence, so each word is matched to the sentence text it spells (-1: none).
function alignImmersiveWords(words, sentences, clean) {
  var norm = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  var targets = (sentences || []).map(sentence => norm(clean ? clean(sentence) : sentence));
  var list = Array.isArray(words) ? words : [];
  var assigned = list.map(() => -1),
    ends = [],
    idx = 0,
    pos = 0;
  // Whole lines that are never read: table rows, the divider, chart code.
  var skip = [],
    lineStart = 0;
  list.concat([{
    pos: 'newline'
  }]).forEach(function (word, i) {
    if (word && word.pos !== 'newline') return;
    var line = list.slice(lineStart, i).map(w => w && w.text || '').join('');
    if (/^\s*(?:\||\[\[CHART:|-{3}\s*ENGLISH TRANSLATION\s*-{3}\s*$)/i.test(line)) for (var s = lineStart; s < i; s++) skip[s] = true;
    lineStart = i + 1;
  });
  var skipEmpty = () => {
    while (idx < targets.length && !targets[idx]) idx++;
  };
  skipEmpty();
  list.forEach(function (word, i) {
    var token = word && word.pos !== 'newline' && !skip[i] ? norm(word.text) : '';
    if (!token || idx >= targets.length) return;
    var at = targets[idx].indexOf(token, pos);
    if (at === -1 || at - pos > (pos ? 24 : 0)) {
      at = -1;
      for (var k = idx + 1; k < Math.min(targets.length, idx + 4) && at === -1; k++) if (targets[k].indexOf(token) === 0) {
        idx = k;
        at = 0;
      }
      if (at === -1) return;
    }
    pos = at + token.length;
    assigned[i] = idx;
    if (pos >= targets[idx].length) {
      ends[i] = true;
      idx++;
      pos = 0;
      skipEmpty();
    }
  });
  // Spaces and marks inside a sentence go with it; after its last word only the
  // marks touching that word ("hot.") do, and the rest go with the next word.
  var previous = -1,
    afterSpace = false;
  list.forEach(function (word, i) {
    if (word && word.pos !== 'newline' && norm(word.text)) {
      previous = i;
      afterSpace = false;
      return;
    }
    if (!word || word.pos === 'newline') {
      afterSpace = true;
      return;
    }
    if (/^\s+$/.test(word.text || '')) afterSpace = true;
    if (previous >= 0 && (!ends[previous] || !afterSpace)) {
      assigned[i] = assigned[previous];
      return;
    }
    for (var n = i + 1; n < list.length; n++) if (list[n] && list[n].pos !== 'newline' && norm(list[n].text)) {
      assigned[i] = assigned[n];
      break;
    }
  });
  return assigned;
}
function simplifiedComparisonPlainText(raw) {
  return simplifiedExactBlocks(raw, true).map(block => block.type === 'hidden' ? '' : simplifiedPlainInline(block.text) + block.separator).join('');
}
function simplifiedParagraphBlocks(text) {
  var lines = String(text || '').split('\n');
  var output = [],
    paragraph = [];
  var flush = function () {
    if (paragraph.length) output.push({
      type: 'p',
      raw: paragraph.join('\n')
    });
    paragraph = [];
  };
  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i];
    if (/^\s{0,3}#{1,6}\s*$/.test(line)) {
      flush();
      continue;
    }
    if (/^\s{0,3}([-*])(?:\s*\1){2,}\s*$/.test(line)) {
      flush();
      output.push({
        type: 'rule',
        raw: line,
        text: ''
      });
      continue;
    }
    var heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/) || line.match(/^\s*<h([1-6])[^>]*>(.*?)<\/h[1-6]>\s*$/i);
    var item = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
    if (heading) {
      flush();
      output.push({
        type: 'heading',
        level: /^#/.test(heading[1]) ? heading[1].length : Number(heading[1]),
        raw: line,
        text: heading[2]
      });
    } else if (item) {
      flush();
      output.push({
        type: 'li',
        indent: item[1].replace(/\t/g, '    ').length,
        ordered: /^\d/.test(item[2]),
        value: parseInt(item[2], 10) || 1,
        raw: line,
        text: item[3]
      });
    } else if (/^\s*>\s?/.test(line)) {
      flush();
      output.push({
        type: 'quote',
        raw: line,
        text: line.replace(/^\s*>\s?/, '')
      });
    } else if (output.length && output[output.length - 1].type === 'li' && /^\s+\S/.test(line)) {
      var previous = output[output.length - 1];
      previous.raw += '\n' + line;
      previous.text += '\n' + line.trimStart();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return output;
}
function simplifiedNestLists(blocks, renderBlock) {
  var roots = [],
    stack = [];
  blocks.forEach(function (block, index) {
    if (block.type !== 'li') {
      stack = [];
      roots.push({
        blockRoot: block,
        index: index
      });
      return;
    }
    while (stack.length && (stack[stack.length - 1].indent > block.indent || stack[stack.length - 1].indent === block.indent && stack[stack.length - 1].ordered !== block.ordered)) stack.pop();
    var current = stack[stack.length - 1];
    if (!current || current.indent < block.indent) {
      var list = {
        indent: block.indent,
        ordered: block.ordered,
        start: block.value,
        items: [],
        key: index
      };
      if (current && current.items.length) current.items[current.items.length - 1].children.push(list);else roots.push(list);
      stack.push(list);
      current = list;
    }
    current.items.push({
      block: block,
      index: index,
      children: []
    });
  });
  var materialize = function (entry) {
    if (entry.blockRoot) return renderBlock(entry.blockRoot, entry.index);
    var Tag = entry.ordered ? 'ol' : 'ul';
    return /*#__PURE__*/React.createElement(Tag, {
      key: 'list-' + entry.key,
      start: entry.ordered ? entry.start : undefined,
      className: "my-3 space-y-2",
      style: {
        paddingInlineStart: '1.6em',
        listStyleType: entry.ordered ? 'decimal' : 'disc'
      }
    }, entry.items.map(function (item) {
      return /*#__PURE__*/React.createElement("li", {
        key: item.index,
        value: entry.ordered ? item.block.value : undefined
      }, renderBlock(item.block, item.index), item.children.map(materialize));
    }));
  };
  return roots.map(materialize);
}
function simplifiedPopupStyle(point, widthRem) {
  var fontSize = 16;
  try {
    fontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  } catch (_) {}
  var width = Math.min(widthRem * fontSize, Math.max(0, window.innerWidth - 16));
  return {
    width: width + 'px',
    maxWidth: 'calc(100vw - 16px)',
    left: Math.max(8, Math.min(window.innerWidth - width - 8, (Number(point.x) || 0) - 20)) + 'px',
    top: Math.max(8, Math.min((window.innerHeight - 16) / 2, (Number(point.y) || 0) + 10)) + 'px',
    maxHeight: 'calc(50dvh - 8px)',
    overflowY: 'auto',
    overflowWrap: 'anywhere'
  };
}

// Sections for the reading outline and section prompts, addressed by the
// paragraph numbers the adapted reader renders (data-reading-paragraph). With
// headings, a section runs from one heading to the next; without, each
// paragraph is one. Charts and tables are never their own section.
function readingOutlineSections(text) {
  var headingOf = paragraph => {
    var match = paragraph.split('\n')[0].match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    return match ? simplifiedPlainInline(match[1]).trim() : '';
  };
  var entries = String(text || '').split(/\n{2,}/).map((paragraph, index) => ({
    index,
    text: paragraph,
    heading: headingOf(paragraph)
  })).filter(entry => entry.text.trim() && !/^\s*(?:\[\[CHART:|\|)/.test(entry.text));
  var hasHeadings = entries.some(entry => entry.heading);
  var sections = [];
  entries.forEach(entry => {
    var last = sections[sections.length - 1];
    if (hasHeadings && last && !entry.heading) {
      last.last = entry.index;
      last.text += '\n\n' + entry.text;
      return;
    }
    sections.push({
      first: entry.index,
      last: entry.index,
      heading: entry.heading,
      text: entry.text
    });
  });
  return sections.map((section, index) => {
    var words = simplifiedPlainInline(section.text.replace(/^\s{0,3}#{1,6}\s+/gm, '')).split(/\s+/).filter(Boolean);
    return {
      ...section,
      index,
      label: section.heading || words.slice(0, 8).join(' ') + (words.length > 8 ? '…' : '')
    };
  });
}
// Where a learner is in a reading (last paragraph, bookmark, section answers).
// Keyed by learner + reading + exact text version, so a revised passage never
// reopens at an old place. Saved on the device only when the host names the
// learner; otherwise kept for this page visit only.
var READING_PLACE_KEY = 'alloflow_reading_places_v1';
// Each reading's text when a teacher first opened it this visit ("Text changed").
var readingFirstSeen = {};
var readingPlaceMemory = {};
function readingPlaceAll(learner) {
  if (!learner) return readingPlaceMemory;
  try {
    var all = JSON.parse(localStorage.getItem(READING_PLACE_KEY) || '{}');
    return all && typeof all === 'object' ? all : {};
  } catch (_) {
    return {};
  }
}
function readingPlaceKey(learner, itemId, fingerprint) {
  return [learner || '', itemId, fingerprint].join('|');
}
function loadReadingPlace(learner, itemId, fingerprint) {
  var all = readingPlaceAll(learner),
    own = all[readingPlaceKey(learner, itemId, fingerprint)] || null;
  var prefix = readingPlaceKey(learner, itemId, '');
  var revised = !own && Object.keys(all).some(key => key.startsWith(prefix) && key !== prefix && (all[key].paragraph > 0 || all[key].bookmark));
  return {
    place: own,
    revised
  };
}
function saveReadingPlace(learner, itemId, fingerprint, update) {
  var key = readingPlaceKey(learner, itemId, fingerprint),
    all = readingPlaceAll(learner);
  var next = {
    ...(all[key] || {}),
    ...update,
    at: Date.now()
  };
  all[key] = next;
  if (!learner) return next;
  try {
    var keys = Object.keys(all);
    if (keys.length > 80) keys.sort((a, b) => (all[a].at || 0) - (all[b].at || 0)).slice(0, keys.length - 80).forEach(old => {
      delete all[old];
    });
    localStorage.setItem(READING_PLACE_KEY, JSON.stringify(all));
  } catch (_) {}
  return next;
}

// Navigation ranges address the canonical string, never a formatted projection.
function getReadingNavigationSections(text) {
  const source = typeof text === 'string' ? text : '';
  const sections = [];
  const breaks = /(?:\r\n|\n|\r(?!\n)|\u2028)[\t ]*(?:\r\n|\n|\r(?!\n)|\u2028)(?:[\t ]*(?:\r\n|\n|\r(?!\n)|\u2028))*|\u2029+/g;
  let start = 0,
    match;
  const append = end => {
    const sectionText = source.slice(start, end);
    if (sectionText.trim()) sections.push({
      index: sections.length,
      start,
      end,
      text: sectionText
    });
  };
  while (match = breaks.exec(source)) {
    append(match.index);
    start = match.index + match[0].length;
  }
  append(source.length);
  return sections;
}
function findRelatedOriginalPassage(sourceText, adaptedSectionText, options = {}) {
  const unavailable = reason => ({
    status: 'unavailable',
    reason
  });
  if (options.sameLanguage !== true) return unavailable('different-or-unknown-language');
  if (typeof sourceText !== 'string' || typeof adaptedSectionText !== 'string' || !sourceText.trim() || !adaptedSectionText.trim()) return unavailable('empty-passage');
  // Fail closed rather than silently searching only the beginning of a source.
  if (sourceText.length > 120000 || adaptedSectionText.length > 12000) return unavailable('passage-too-long');
  const sections = getReadingNavigationSections(sourceText);
  if (sections.length > 300) return unavailable('too-many-sections');
  const stopWords = new Set(('a an the and or but if so than then that this these those to of in on at by for from with without as into upon over under ' + 'is are was were be been being am do does did done have has had having will would shall should can could may might must not no nor ' + 'i me my mine we us our ours you your yours he him his she her hers it its they them their theirs who whom whose which what when where why how ' + 'all any both each every few more most other some such only own same too very just also there here now again still about after before during ' + 'first second third one two three said says say text passage paragraph scene act chapter mr mrs ms').split(/\s+/));
  let segmenter;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) segmenter = new Intl.Segmenter(undefined, {
      granularity: 'word'
    });
  } catch (_) {}
  const tokenize = text => {
    const words = segmenter ? Array.from(segmenter.segment(text)).filter(part => part.isWordLike).map(part => part.segment) : text.match(/[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu) || [];
    return words.map(word => word.normalize('NFKC').toLowerCase().replace(/’/g, "'").replace(/'s$/, ''));
  };
  const informative = word => word.length >= 2 && /\p{L}/u.test(word) && !stopWords.has(word);
  const queryWords = tokenize(adaptedSectionText);
  if (queryWords.length > 1800) return unavailable('passage-too-long');
  const queryTerms = new Set(queryWords.filter(informative));
  if (queryTerms.size < 4) return unavailable('insufficient-content-evidence');
  let totalWords = 0;
  const prepared = sections.map(section => {
    const words = tokenize(section.text);
    totalWords += words.length;
    return {
      ...section,
      words,
      terms: new Set(words.filter(informative))
    };
  });
  if (totalWords > 24000) return unavailable('passage-too-long');
  const frequency = new Map();
  prepared.forEach(section => section.terms.forEach(term => frequency.set(term, (frequency.get(term) || 0) + 1)));
  const weight = term => frequency.has(term) ? 1 + Math.log((prepared.length + 1) / (frequency.get(term) + 1)) : 1;
  const queryWeight = Array.from(queryTerms).reduce((sum, term) => sum + weight(term), 0);
  const queryPhrases = new Set();
  for (let index = 0; index + 2 < queryWords.length; index++) {
    const phrase = queryWords.slice(index, index + 3);
    if (phrase.filter(informative).length >= 2) queryPhrases.add(phrase.join(' '));
  }
  const candidates = [];
  for (let start = 0; start < prepared.length; start++) {
    for (let count = 1; count <= 3 && start + count <= prepared.length; count++) {
      const group = prepared.slice(start, start + count);
      const words = group.flatMap(section => section.words);
      if (words.length > 1200) break;
      const terms = new Set(group.flatMap(section => Array.from(section.terms)));
      const shared = Array.from(queryTerms).filter(term => terms.has(term));
      if (shared.length < 4) continue;
      // Each additional paragraph must contribute distinct evidence. Repetition
      // or a paragraph index never justifies enlarging the highlighted range.
      if (count > 1 && group.some((section, index) => {
        const elsewhere = new Set(group.filter((_, other) => other !== index).flatMap(other => Array.from(other.terms)));
        return shared.filter(term => section.terms.has(term) && !elsewhere.has(term)).length < 2;
      })) continue;
      const sharedWeight = shared.reduce((sum, term) => sum + weight(term), 0);
      const queryCoverage = sharedWeight / queryWeight;
      const sourceWeight = Array.from(terms).reduce((sum, term) => sum + weight(term), 0);
      const sourceCoverage = sharedWeight / Math.max(1, sourceWeight);
      const distinctive = shared.filter(term => (frequency.get(term) || 0) <= Math.max(1, Math.ceil(prepared.length * 0.65)));
      if (queryCoverage < 0.55 || sourceCoverage < 0.20) continue;
      const phrases = new Set();
      for (let index = 0; index + 2 < words.length; index++) {
        const phrase = words.slice(index, index + 3).join(' ');
        if (queryPhrases.has(phrase)) phrases.add(phrase);
      }
      if (distinctive.length < 2 && !(phrases.size >= 2 && queryCoverage >= 0.90)) continue;
      if (!phrases.size && (shared.length < 5 || queryCoverage < 0.65)) continue;
      const score = queryCoverage * 0.72 + Math.min(1, sourceCoverage / 0.55) * 0.22 + Math.min(0.10, phrases.size * 0.025) - (count - 1) * 0.045;
      candidates.push({
        start: group[0].start,
        end: group[group.length - 1].end,
        sectionIndexes: group.map(section => section.index),
        score,
        evidence: {
          sharedTerms: shared.slice(0, 16),
          sharedPhrases: Array.from(phrases).slice(0, 6),
          queryCoverage: Math.round(queryCoverage * 100) / 100
        }
      });
    }
  }
  if (!candidates.length) return unavailable('no-reliable-content-match');
  candidates.sort((left, right) => right.score - left.score || left.end - left.start - (right.end - right.start));
  const best = candidates[0];
  const nested = (left, right) => left.start <= right.start && left.end >= right.end || right.start <= left.start && right.end >= left.end;
  const alternatives = candidates.slice(1).filter(candidate => !nested(best, candidate) && (candidate.score >= best.score * 0.90 || best.score - candidate.score < 0.08));
  const project = candidate => ({
    start: candidate.start,
    end: candidate.end,
    sectionIndexes: candidate.sectionIndexes,
    evidence: candidate.evidence
  });
  if (alternatives.length) return {
    status: 'ambiguous',
    reason: 'multiple-related-passages',
    candidates: [best, ...alternatives].slice(0, 3).map(project)
  };
  return {
    status: 'matched',
    ...project(best),
    text: sourceText.slice(best.start, best.end),
    confidence: best.evidence.queryCoverage >= 0.80 && best.evidence.sharedTerms.length >= 6 ? 'high' : 'moderate'
  };
}
function findReadingGlossOccurrences(text, query) {
  const source = String(text || ''),
    word = String(query || '').trim(),
    matches = [];
  const finish = truncated => {
    Object.defineProperty(matches, 'truncated', {
      value: truncated,
      enumerable: false
    });
    return matches;
  };
  if (!word || word.length > 160) return finish(false);
  const letters = /[\p{L}\p{M}\p{N}_]/u,
    characters = Array.from(word);
  let segments;
  try {
    segments = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {
      granularity: 'word'
    }).segment(source) : null;
  } catch (_) {}
  const boundary = (offset, first) => {
    if (!letters.test(first ? characters[0] : characters[characters.length - 1])) return true;
    const segment = segments?.containing?.(first ? offset : offset - 1);
    if (segment?.isWordLike) return first ? segment.index === offset : segment.index + segment.segment.length === offset;
    const adjacent = first ? Array.from(source.slice(Math.max(0, offset - 2), offset)).pop() : Array.from(source.slice(offset, offset + 2))[0];
    if (adjacent && letters.test(adjacent)) return false;
    if (adjacent && /['’]/u.test(adjacent)) {
      const beyond = first ? Array.from(source.slice(Math.max(0, offset - 3), offset - 1)).pop() : Array.from(source.slice(offset + 1, offset + 3))[0];
      if (beyond && letters.test(beyond)) return false;
    }
    return true;
  };
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf(word, cursor);
    if (start < 0) break;
    const end = start + word.length;
    cursor = start + 1;
    if (!boundary(start, true) || !boundary(end, false)) continue;
    if (matches.length === 200) return finish(true);
    matches.push({
      start,
      end,
      quote: source.slice(start, end),
      context: readingGlossContext(source, start, end).text
    });
  }
  return finish(false);
}

// The sentence around a word support, for the editor. It was a fixed window
// of 35 characters before and 45 after, which cut words in half ("ike a
// giant wheel ... into differe"). A long sentence is trimmed at word
// boundaries and marked with an ellipsis. Display only: offsets are unused.
function readingGlossContext(text, start, end, maxChars) {
  const source = String(text || ''),
    limit = maxChars || 240;
  const head = source.slice(0, start),
    tail = source.slice(end);
  const boundaryBefore = /[.!?]["'”’)\]]*\s+|\n/g;
  let from = 0;
  for (let found = boundaryBefore.exec(head); found; found = boundaryBefore.exec(head)) from = found.index + found[0].length;
  const next = tail.match(/[.!?]["'”’)\]]*(?=\s|$)|\n/);
  let to = next ? end + next.index + (next[0] === '\n' ? 0 : next[0].length) : source.length;
  let before = source.slice(from, start),
    after = source.slice(end, to),
    clippedBefore = false,
    clippedAfter = false;
  const room = Math.max(40, Math.floor((limit - (end - start)) / 2));
  if (before.length + (end - start) + after.length > limit) {
    if (before.length > room) {
      before = before.slice(before.length - room);
      before = before.slice(Math.max(0, before.search(/\s/) + 1));
      clippedBefore = true;
    }
    if (after.length > room) {
      after = after.slice(0, room);
      after = after.slice(0, Math.max(0, after.search(/\s\S*$/)));
      clippedAfter = true;
    }
  }
  const tidy = value => value.replace(/^[ \t]*(?:#{1,6}|>|[-+*]|\d+[.)])[ \t]+/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__|~~|`/g, '').replace(/\s+/g, ' ');
  const parts = {
    before: (clippedBefore ? '…' : '') + tidy(before).replace(/^\s+/, ''),
    quote: source.slice(start, end),
    after: tidy(after).replace(/\s+$/, '') + (clippedAfter ? '…' : '')
  };
  parts.text = parts.before + parts.quote + parts.after;
  return parts;
}
// Interface text. Parts outside SimplifiedView get no t prop, so they use the
// host's window.__alloT; the English fallback shows until a key is translated.
function simplifiedText(key, fallback, params, translate) {
  var value;
  try {
    value = (translate || typeof window !== 'undefined' && window.__alloT || (() => undefined))(key, params);
  } catch (_) {}
  var text = typeof value === 'string' && value && value !== key ? value : fallback;
  return params ? String(text).replace(/\{(\w+)\}/g, (match, name) => params[name] != null ? String(params[name]) : match) : text;
}
// A search box appears once the list is this long.
var GLOSS_FILTER_MIN = 6;
// embedded: the editor sits inside a panel that already has its own disclosure,
// so it shows its list directly instead of adding a second toggle.
function ReadingGlossEditor({
  item,
  supports,
  request,
  onUpdate,
  disabled,
  adapted,
  snapshot: adaptedSnapshot,
  embedded
}) {
  // An adapted text's word help anchors to the adapted passage, never the original.
  const snapshot = adapted ? adaptedSnapshot : getInstructionalContextApi()?.getSourceSnapshot?.(item);
  const passageName = adapted ? 'adapted text' : 'original';
  const sourceText = snapshot?.text || '';
  const sourceKey = String(item?.id || '') + ':' + (snapshot?.fingerprint || '');
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [baseline, setBaseline] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState(null);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState('');
  const [filterKind, setFilterKind] = React.useState('all');
  const sourceKeyRef = React.useRef(sourceKey);
  sourceKeyRef.current = sourceKey;
  const termRef = React.useRef(null),
    definitionRef = React.useRef(null),
    addRef = React.useRef(null),
    toggleRef = React.useRef(null),
    keepRef = React.useRef(null);
  const editRefs = React.useRef({});
  const panelId = 'reading-gloss-editor-' + String(item?.id || 'current').replace(/[^a-z0-9_-]/gi, '-');
  const entries = supports?.annotations || [];
  const signature = value => value ? JSON.stringify({
    query: value.query,
    start: value.start,
    text: value.text,
    priority: value.priority,
    pinned: value.pinned,
    image: value.image ? value.image.src.length + ':' + value.image.alt : ''
  }) : '';
  const [pickingPicture, setPickingPicture] = React.useState(false);
  // Removing, choosing or cancelling a picture removes the focused button; land on the picture button instead.
  const pictureButtonRef = React.useRef(null),
    refocusPicture = React.useRef(false);
  React.useEffect(() => {
    if (refocusPicture.current && pictureButtonRef.current) {
      refocusPicture.current = false;
      pictureButtonRef.current.focus();
    }
  });
  const dirty = !!draft && signature(draft) !== baseline;
  const sameAnchor = (left, right) => !!left && !!right && left.start === right.start && left.end === right.end && left.quote === right.quote;
  const contextFor = entry => readingGlossContext(sourceText, entry.start, entry.end).text;
  const anchorFor = entry => ({
    start: entry.start,
    end: entry.end,
    quote: entry.quote
  });
  const replaceDraft = value => {
    setDraft(value);
    setBaseline(signature(value));
    setNotice('');
    setError('');
    setPendingAction(null);
    setPickingPicture(false);
  };
  const clearDraft = () => replaceDraft(null);
  const applyEdit = entry => {
    const value = {
      id: entry.id,
      anchor: anchorFor(entry),
      query: entry.quote,
      start: String(entry.start),
      text: entry.definition || entry.explanation || entry.text || '',
      priority: entry.priority || 'helpful',
      pinned: entry.pinned === true,
      image: entry.image || null
    };
    value.originalTextLength = value.text.length;
    setOpen(true);
    replaceDraft(value);
  };
  const mutate = async (action, success) => {
    if (disabled || busy || typeof onUpdate !== 'function') return null;
    const key = sourceKeyRef.current;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const result = await onUpdate(item, action);
      if (sourceKeyRef.current !== key) return null;
      if (!result) throw new Error(simplifiedText('simplified.gloss_the_reading_changed_reopen_its_word', 'The reading changed. Reopen its word supports and try again.'));
      setNotice(success);
      return result;
    } catch (failure) {
      if (sourceKeyRef.current === key) setError(failure?.message || 'This word support could not be saved.');
      return null;
    } finally {
      if (sourceKeyRef.current === key) setBusy(false);
    }
  };
  const performAction = async action => {
    setPendingAction(null);
    if (action.type === 'edit') {
      applyEdit(action.entry);
      return;
    }
    if (action.type === 'add') {
      setOpen(true);
      replaceDraft({
        id: null,
        query: '',
        start: '',
        text: '',
        priority: 'essential',
        pinned: false
      });
      return;
    }
    if (action.type === 'close' || action.type === 'finish') {
      const id = draft?.id;
      clearDraft();
      if (action.type === 'close') {
        setOpen(false);
        toggleRef.current?.focus();
      } else (editRefs.current[id] || addRef.current)?.focus();
      return;
    }
    if (action.type === 'remove') {
      const current = entries.find(entry => sameAnchor(entry, action.entry));
      if (!current) {
        setNotice('');
        setError(simplifiedText('simplified.gloss_this_word_support_is_no_longer', 'This word support is no longer available. Review the current supports before removing it.'));
        return;
      }
      const saved = await mutate({
        type: 'remove',
        id: current.id
      }, 'Word support removed. It will stay removed when suggestions are refreshed.');
      if (saved) {
        if (sameAnchor(draft?.anchor, action.entry)) {
          setDraft(null);
          setBaseline('');
        }
        addRef.current?.focus();
      }
    }
  };
  const requestAction = action => {
    if (disabled || busy) return;
    if (action.type === 'edit' && sameAnchor(draft?.anchor, action.entry)) {
      setOpen(true);
      definitionRef.current?.focus();
      return;
    }
    const replacesDraft = action.type !== 'remove' || sameAnchor(draft?.anchor, action.entry);
    if (dirty && replacesDraft) {
      setOpen(true);
      setPendingAction(action);
      return;
    }
    performAction(action);
  };
  React.useEffect(() => {
    setOpen(false);
    setDraft(null);
    setBaseline('');
    setPendingAction(null);
    setNotice('');
    setError('');
    setBusy(false);
    setPickingPicture(false);
    setFilterQuery('');
    setFilterKind('all');
  }, [sourceKey]);
  const isOpen = !!embedded || open;
  const canFilter = entries.length >= GLOSS_FILTER_MIN;
  const needle = canFilter ? filterQuery.trim().toLocaleLowerCase() : '';
  const kind = canFilter ? filterKind : 'all';
  const listed = entries.filter(entry => (kind === 'all' || (kind === 'essential' ? entry.priority === 'essential' : kind === 'educator' ? entry.origin === 'educator' : entry.origin !== 'educator')) && (!needle || (entry.quote + ' ' + (entry.definition || entry.explanation || entry.text || '')).toLocaleLowerCase().includes(needle)));
  const filtering = listed.length !== entries.length;
  React.useEffect(() => {
    if (!request || request.ownerId !== item?.id) return;
    const entry = entries.find(value => value.id === request.id) || draft?.id === request.id && entries.find(value => sameAnchor(value, draft.anchor));
    if (entry) requestAction({
      type: 'edit',
      entry
    });
  }, [request]);
  React.useEffect(() => {
    if (pendingAction) keepRef.current?.focus();else if (draft) (draft.anchor ? definitionRef.current : termRef.current)?.focus();
  }, [!!draft, draft?.anchor?.start, pendingAction]);
  const matches = React.useMemo(() => {
    const anchor = draft?.anchor;
    if (anchor) return sourceText.slice(anchor.start, anchor.end) === anchor.quote ? [{
      ...anchor,
      context: contextFor(anchor)
    }] : [];
    return findReadingGlossOccurrences(sourceText, draft?.query || '');
  }, [sourceText, draft?.query, draft?.anchor]);
  const selected = draft && (draft.start !== '' ? matches.find(value => String(value.start) === draft.start) : matches.length === 1 ? matches[0] : null);
  const updateDraft = fields => {
    setDraft(previous => ({
      ...previous,
      ...fields
    }));
    setNotice('');
    setError('');
  };
  const save = async () => {
    setNotice('');
    setError('');
    if (!selected || !draft?.text.trim()) {
      setError(simplifiedText('simplified.gloss_choose_the_exact_word_or_phrase', 'Choose the exact word or phrase and enter its explanation.'));
      return;
    }
    if (draft.text.trim().length > 2400) {
      setError(simplifiedText('simplified.gloss_shorten_this_explanation_to_2_400', 'Shorten this explanation to 2,400 characters or fewer before saving.'));
      return;
    }
    // IDs can change during a refresh. The exact source occurrence owns the
    // edit; an old ID reused for another range must never redirect it.
    const current = entries.find(entry => sameAnchor(entry, selected));
    let id = current?.id || draft.id || 'gloss-' + selected.start + '-' + selected.end;
    if (entries.some(entry => entry.id === id && !sameAnchor(entry, selected))) id = 'gloss-' + selected.start + '-' + selected.end;
    const baseId = id;
    for (let suffix = 1; entries.some(entry => entry.id === id && !sameAnchor(entry, selected)); suffix++) id = baseId + '-' + suffix;
    const annotation = {
      id,
      kind: current?.kind || 'gloss',
      ...anchorFor(selected),
      text: draft.text.trim(),
      priority: draft.priority,
      pinned: draft.pinned,
      image: draft.image || null
    };
    const saved = await mutate({
      type: 'upsert',
      annotation
    }, 'Word support saved. Your wording will be kept when suggestions are refreshed.');
    // A reading's pictures share one budget: say so if this picture did not fit.
    const savedSupports = saved && (Array.isArray(saved.annotations) ? saved : saved.readingSupports);
    if (savedSupports && draft.image && !(savedSupports.annotations || []).some(entry => entry.id === id && entry.image)) {
      setNotice('');
      setError(simplifiedText('simplified.gloss_the_explanation_was_saved_but_its', 'The explanation was saved, but its picture did not fit: this reading already has as many pictures as it can hold. Remove another picture first.'));
    }
    if (saved) {
      const next = {
        ...draft,
        id,
        anchor: anchorFor(selected),
        start: String(selected.start),
        text: annotation.text
      };
      setDraft(next);
      setBaseline(signature(next));
    }
  };
  const pin = async (entry, pinned) => {
    const saved = await mutate({
      type: 'pin',
      id: entry.id,
      pinned
    }, pinned ? 'This support will stay visible in lighter view.' : 'This support now follows the lighter-view selection.');
    if (saved && sameAnchor(draft?.anchor, entry)) {
      setDraft(previous => previous && {
        ...previous,
        pinned
      });
      setBaseline(previous => previous ? JSON.stringify({
        ...JSON.parse(previous),
        pinned
      }) : previous);
    }
  };
  const occurrenceLabel = entry => {
    const quote = entry.quote.length > 80 ? entry.quote.slice(0, 80) + '…' : entry.quote;
    return simplifiedText('simplified.gloss_occurrence', '{word}, text position {start}–{end}: {context}', {
      word: quote,
      start: entry.start + 1,
      end: entry.end,
      context: contextFor(entry)
    });
  };
  return /*#__PURE__*/React.createElement("section", {
    "data-reading-gloss-editor": true,
    className: embedded ? 'text-sm text-slate-800' : 'my-4 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-800'
  }, !embedded && /*#__PURE__*/React.createElement("button", {
    ref: toggleRef,
    type: "button",
    "aria-expanded": open,
    "aria-controls": panelId,
    disabled: busy,
    onClick: () => open ? requestAction({
      type: 'close'
    }) : setOpen(true),
    className: "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 text-left font-bold text-indigo-900 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-wait"
  }, /*#__PURE__*/React.createElement("span", null, simplifiedText('simplified.gloss_review_word_supports', 'Review word supports'), ' ', entries.length ? '(' + entries.length + ')' : ''), /*#__PURE__*/React.createElement("svg", {
    "aria-hidden": "true",
    focusable: "false",
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "shrink-0"
  }, /*#__PURE__*/React.createElement("path", {
    d: open ? 'm6 15 6-6 6 6' : 'm9 6 6 6-6 6'
  }))), isOpen && /*#__PURE__*/React.createElement("div", {
    id: panelId,
    className: embedded ? 'space-y-3' : 'mt-2 space-y-3'
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm leading-relaxed text-slate-600"
  }, adapted ? simplifiedText('simplified.gloss_add_or_adjust_explanations_for_words', 'Add or adjust explanations for words in the adapted text.') : simplifiedText('simplified.gloss_add_or_adjust_explanations_beside_the', 'Add or adjust explanations beside the original words.'), ' ', simplifiedText('simplified.gloss_teacher_edits_and_removed_supports_are', 'Teacher edits and removed supports are kept when AI suggestions are refreshed.')), /*#__PURE__*/React.createElement("button", {
    ref: addRef,
    type: "button",
    disabled: disabled || busy || !!pendingAction,
    onClick: () => requestAction({
      type: 'add'
    }),
    className: "min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900 disabled:opacity-50"
  }, simplifiedText('simplified.gloss_add_a_word_or_phrase', 'Add a word or phrase')), pendingAction && /*#__PURE__*/React.createElement("div", {
    role: "alertdialog",
    "aria-labelledby": panelId + '-discard-title',
    "aria-describedby": panelId + '-discard-description',
    className: "space-y-2 rounded-lg border border-amber-400 bg-amber-50 p-3",
    onKeyDown: event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingAction(null);
      }
    }
  }, /*#__PURE__*/React.createElement("p", {
    id: panelId + '-discard-title',
    className: "font-bold"
  }, simplifiedText('simplified.gloss_discard_unsaved_word_support_changes', 'Discard unsaved word support changes?')), /*#__PURE__*/React.createElement("p", {
    id: panelId + '-discard-description'
  }, simplifiedText('simplified.gloss_your_explanation_has_not_been_saved', 'Your explanation has not been saved. Keep editing to preserve this draft, or discard it to continue.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: keepRef,
    type: "button",
    className: "min-h-11 rounded border border-indigo-300 px-3",
    onClick: () => setPendingAction(null)
  }, simplifiedText('simplified.gloss_keep_editing', 'Keep editing')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 rounded border border-amber-700 px-3",
    onClick: () => {
      const action = pendingAction;
      setDraft(null);
      setBaseline('');
      performAction(action);
    }
  }, simplifiedText('simplified.gloss_discard_changes', 'Discard changes')))), draft && /*#__PURE__*/React.createElement("fieldset", {
    disabled: disabled || busy || !!pendingAction,
    "data-gloss-draft": true,
    "aria-label": draft.anchor ? simplifiedText('simplified.gloss_edit_word_support', 'Edit word support') : simplifiedText('simplified.gloss_add_word_support', 'Add word support'),
    className: "space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block font-semibold"
  }, simplifiedText('simplified.gloss_word_from', 'Word or phrase from the {passage}', {
    passage: passageName
  }), /*#__PURE__*/React.createElement("input", {
    ref: termRef,
    type: "text",
    maxLength: draft.anchor ? undefined : 160,
    value: draft.query,
    readOnly: !!draft.anchor,
    onChange: event => updateDraft({
      query: event.target.value,
      start: ''
    }),
    className: "mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"
  })), !draft.anchor && matches.length > 1 && /*#__PURE__*/React.createElement("label", {
    className: "block font-semibold"
  }, simplifiedText('simplified.gloss_which_occurrence', 'Which occurrence?'), /*#__PURE__*/React.createElement("select", {
    value: draft.start,
    onChange: event => updateDraft({
      start: event.target.value
    }),
    className: "mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, simplifiedText('simplified.gloss_choose_the_word_in_context', 'Choose the word in context')), matches.map((match, index) => /*#__PURE__*/React.createElement("option", {
    key: match.start,
    value: String(match.start)
  }, simplifiedText('simplified.gloss_occurrence_option', '{number}. Text position {start}–{end}: {context}', {
    number: index + 1,
    start: match.start + 1,
    end: match.end,
    context: match.context
  }))))), matches.truncated && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-amber-900"
  }, simplifiedText('simplified.gloss_showing_the_first_200_matching_occurrenc', 'Showing the first 200 matching occurrences. Use a longer phrase to find a later occurrence.')), !!draft.query.trim() && !matches.length && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-amber-900"
  }, simplifiedText('simplified.gloss_no_exact_match', 'No exact whole-word or phrase match. Copy the word or phrase as it appears in the {passage}.', {
    passage: passageName
  })), selected && (() => {
    const parts = readingGlossContext(sourceText, selected.start, selected.end);
    return /*#__PURE__*/React.createElement("p", {
      "data-gloss-context": true,
      className: "break-words text-slate-600"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold"
    }, simplifiedText('simplified.gloss_in_the_text', 'In the text:'), ' '), parts.before, /*#__PURE__*/React.createElement("mark", {
      className: "rounded bg-yellow-100 px-0.5 font-semibold text-slate-900"
    }, parts.quote), parts.after);
  })(), /*#__PURE__*/React.createElement("label", {
    className: "block font-semibold"
  }, simplifiedText('simplified.gloss_explanation', 'Explanation'), /*#__PURE__*/React.createElement("span", {
    id: panelId + '-explain-hint',
    className: "block text-xs font-normal text-slate-600"
  }, simplifiedText('simplified.gloss_what_the_word_means_in_this', 'What the word means in this sentence, in a few words.'), ' ', adapted ? simplifiedText('simplified.gloss_students_see_it_in_the_word', 'Students see it in the word-help list after the passage.') : simplifiedText('simplified.gloss_students_see_it_in_brackets_after', 'Students see it in brackets after the word.')), /*#__PURE__*/React.createElement("textarea", {
    ref: definitionRef,
    rows: 3,
    "aria-describedby": panelId + '-explain-hint',
    placeholder: simplifiedText('simplified.gloss_e_g_turning_around_and_around', 'e.g. turning around and around'),
    maxLength: Math.max(2400, draft.originalTextLength || 0),
    value: draft.text,
    onChange: event => updateDraft({
      text: event.target.value
    }),
    className: "mt-1 w-full min-w-0 rounded border border-slate-400 bg-white p-2 font-normal"
  })), /^\s*in (?:the )?(?:context|text)\s*:/i.test(draft.text) && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "data-gloss-context-warning": true,
    className: "text-amber-900"
  }, simplifiedText('simplified.gloss_this_looks_like_the_sentence_around', 'This looks like the sentence around the word. Write what the word means here instead; the sentence already appears in the reading.')), draft.text.length > 2400 && /*#__PURE__*/React.createElement("p", {
    className: "text-amber-900"
  }, simplifiedText('simplified.gloss_this_saved_explanation_is_longer_than', 'This saved explanation is longer than the current limit. Shorten it to 2,400 characters or fewer to save an edit.')), /*#__PURE__*/React.createElement("label", {
    className: "block font-semibold"
  }, simplifiedText('simplified.gloss_importance', 'Importance'), /*#__PURE__*/React.createElement("select", {
    value: draft.priority,
    onChange: event => updateDraft({
      priority: event.target.value
    }),
    className: "mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"
  }, /*#__PURE__*/React.createElement("option", {
    value: "essential"
  }, simplifiedText('simplified.gloss_essential_to_understanding_this_passage', 'Essential to understanding this passage')), /*#__PURE__*/React.createElement("option", {
    value: "helpful"
  }, simplifiedText('simplified.gloss_helpful_extra_explanation', 'Helpful extra explanation')))), !adapted && /*#__PURE__*/React.createElement("label", {
    className: "flex min-h-11 items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: draft.pinned,
    onChange: event => updateDraft({
      pinned: event.target.checked
    })
  }), simplifiedText('simplified.gloss_always_show_in_lighter_view', 'Always show in lighter view')), /*#__PURE__*/React.createElement("div", {
    "data-gloss-picture": true,
    className: "space-y-2 rounded-lg border border-indigo-100 bg-white p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, simplifiedText('simplified.gloss_picture_optional', 'Picture (optional)'), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-normal text-slate-600"
  }, adapted ? simplifiedText('simplified.gloss_a_symbol_or_photo_shown_beside', 'A symbol or photo shown beside the word in the word-help list.') : simplifiedText('simplified.gloss_a_symbol_or_photo_shown_beside_2', 'A symbol or photo shown beside the word, in the reader and in student packs.'), ' ', simplifiedText('simplified.gloss_live_sessions_carry_no_pictures_so', 'Live sessions carry no pictures, so students there see the explanation on its own.'))), draft.image && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("img", {
    src: draft.image.src,
    alt: draft.image.alt || '',
    className: "h-16 w-16 rounded border border-slate-200 bg-white object-contain"
  }), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1 break-words text-xs text-slate-700"
  }, draft.image.alt, draft.image.attribution && window.AlloModules?.AltText ? ' · ' + window.AlloModules.AltText.openImageCreditLine(draft.image.attribution) : ''), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      refocusPicture.current = true;
      updateDraft({
        image: null
      });
    },
    className: "min-h-11 rounded-lg border border-slate-300 px-3"
  }, simplifiedText('simplified.gloss_remove_picture', 'Remove picture'))), !pickingPicture && /*#__PURE__*/React.createElement("button", {
    ref: pictureButtonRef,
    type: "button",
    onClick: () => setPickingPicture(true),
    className: "min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900"
  }, draft.image ? simplifiedText('simplified.gloss_choose_a_different_picture', 'Choose a different picture') : simplifiedText('simplified.gloss_choose_a_picture', 'Choose a picture')), pickingPicture && (window.AlloModules?.ClassroomImagePicker && window.AlloModules?.AltText ? /*#__PURE__*/React.createElement(React.Fragment, null, React.createElement(window.AlloModules.ClassroomImagePicker, {
    idPrefix: panelId + '-picture',
    initialQuery: draft.query,
    language: snapshot?.language,
    sources: ['symbols', 'photos'],
    onChoose: async choice => {
      const A = window.AlloModules.AltText,
        contract = getInstructionalContextApi();
      try {
        const src = await A.shrinkImageDataUrl(choice.dataUrl, 200, {
          kind: choice.source === 'mulberry' ? 'symbol' : 'photo'
        });
        const budget = contract?.readingSupportPictureBudget ? contract.readingSupportPictureBudget(supports) : {
          remaining: Infinity,
          perPicture: Infinity
        };
        const replacing = entries.find(entry => draft.anchor && sameAnchor(entry, draft.anchor))?.image?.src?.length || 0;
        if (src.length > budget.perPicture || src.length > budget.remaining + replacing) {
          setError(simplifiedText('simplified.gloss_this_reading_has_no_room_for', 'This reading has no room for another picture. Pictures share a small budget so the lesson stays light to save and share. Remove a picture from another word first.'));
          return;
        }
        updateDraft({
          image: {
            src,
            alt: choice.alt || '',
            altSource: choice.altSource || 'author',
            source: choice.source,
            attribution: choice.attribution || null
          }
        });
        refocusPicture.current = true;
        setPickingPicture(false);
      } catch (_) {
        setError(simplifiedText('simplified.gloss_that_picture_could_not_be_added', 'That picture could not be added. Try another one.'));
      }
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      refocusPicture.current = true;
      setPickingPicture(false);
    },
    className: "min-h-11 rounded-lg border border-slate-300 px-3"
  }, simplifiedText('common.cancel', 'Cancel'))) : /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-slate-700"
  }, simplifiedText('simplified.gloss_picture_search_is_still_loading_try', 'Picture search is still loading. Try again in a moment.')))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled || busy || !selected || !draft.text.trim(),
    onClick: save,
    className: "min-h-11 rounded-lg bg-indigo-700 px-3 text-white disabled:opacity-50"
  }, busy ? simplifiedText('common.saving', 'Saving…') : simplifiedText('simplified.gloss_save_word_support', 'Save word support')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: busy,
    onClick: () => requestAction({
      type: 'finish'
    }),
    className: "min-h-11 rounded-lg border border-slate-300 px-3"
  }, simplifiedText('simplified.gloss_done_editing', 'Done editing')))), error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "rounded bg-red-50 p-2 text-red-900"
  }, error), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "data-gloss-notice": true,
    className: notice ? 'rounded bg-indigo-50 p-2 text-indigo-900' : 'sr-only'
  }, notice), !entries.length && !draft && /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600"
  }, simplifiedText('simplified.gloss_no_word_supports_yet_add_your', 'No word supports yet. Add your own explanation or generate suggestions.')), canFilter && /*#__PURE__*/React.createElement("div", {
    "data-gloss-filter": true,
    role: "search",
    "aria-label": simplifiedText('simplified.gloss_find_a_word_support', 'Find a word support'),
    className: "flex flex-wrap items-end gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex min-w-0 flex-1 flex-col font-semibold"
  }, simplifiedText('simplified.gloss_find_a_word_support', 'Find a word support'), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: filterQuery,
    onChange: event => setFilterQuery(event.target.value),
    className: "mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex flex-col font-semibold"
  }, simplifiedText('simplified.gloss_filter_show', 'Show'), /*#__PURE__*/React.createElement("select", {
    value: filterKind,
    onChange: event => setFilterKind(event.target.value),
    className: "mt-1 min-h-11 rounded border border-slate-400 bg-white px-2 font-normal"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all"
  }, simplifiedText('simplified.gloss_filter_all', 'All supports')), /*#__PURE__*/React.createElement("option", {
    value: "essential"
  }, simplifiedText('simplified.gloss_essential', 'Essential')), /*#__PURE__*/React.createElement("option", {
    value: "educator"
  }, simplifiedText('simplified.gloss_teacher_edited', 'Teacher edited')), /*#__PURE__*/React.createElement("option", {
    value: "suggested"
  }, simplifiedText('simplified.gloss_suggested', 'Suggested')))), filtering && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setFilterQuery('');
      setFilterKind('all');
    },
    className: "min-h-11 rounded-lg border border-slate-300 px-3"
  }, simplifiedText('simplified.gloss_filter_clear', 'Show all'))), canFilter && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "data-gloss-filter-count": true,
    className: filtering ? 'text-slate-700' : 'sr-only'
  }, filtering ? listed.length ? simplifiedText('simplified.gloss_filter_count', 'Showing {shown} of {total} word supports.', {
    shown: listed.length,
    total: entries.length
  }) : simplifiedText('simplified.gloss_filter_none', 'No word supports match. Choose Show all to see every support.') : ''), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2"
  }, listed.map(entry => /*#__PURE__*/React.createElement("li", {
    key: entry.id,
    className: "rounded-lg border border-slate-200 p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "break-words"
  }, entry.image && /*#__PURE__*/React.createElement("img", {
    src: entry.image.src,
    alt: entry.image.alt || '',
    className: "mr-2 inline-block h-10 w-10 rounded bg-white object-contain align-middle"
  }), /*#__PURE__*/React.createElement("strong", null, entry.quote), " — ", entry.definition || entry.explanation || entry.text), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 break-words text-xs text-slate-600"
  }, occurrenceLabel(entry)), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, entry.origin === 'educator' ? simplifiedText('simplified.gloss_teacher_edited', 'Teacher edited') : simplifiedText('simplified.gloss_suggested', 'Suggested'), entry.priority === 'essential' ? ' · ' + simplifiedText('simplified.gloss_essential', 'Essential') : ''), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: element => {
      editRefs.current[entry.id] = element;
    },
    type: "button",
    disabled: disabled || busy || !!pendingAction,
    "aria-label": simplifiedText('simplified.gloss_edit_for', 'Edit gloss for {item}', {
      item: occurrenceLabel(entry)
    }),
    onClick: () => requestAction({
      type: 'edit',
      entry
    }),
    className: "min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900"
  }, simplifiedText('common.edit', 'Edit')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled || busy || !!pendingAction,
    "aria-label": simplifiedText('simplified.gloss_remove_for', 'Remove gloss for {item}', {
      item: occurrenceLabel(entry)
    }),
    onClick: () => requestAction({
      type: 'remove',
      entry
    }),
    className: "min-h-11 rounded-lg border border-slate-300 px-3"
  }, simplifiedText('common.remove', 'Remove')), !adapted && /*#__PURE__*/React.createElement("label", {
    className: "flex min-h-11 items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "aria-label": simplifiedText('simplified.gloss_pin_for', 'Always show in lighter view: {item}', {
      item: occurrenceLabel(entry)
    }),
    checked: entry.pinned === true,
    disabled: disabled || busy || !!pendingAction,
    onChange: event => pin(entry, event.target.checked)
  }), simplifiedText('simplified.gloss_always_show_in_lighter_view', 'Always show in lighter view'))))))));
}

// Where each word-help word sits in the passage ON SCREEN. The reader renders
// the adapted text sentence by sentence (markup stripped), so offsets into the
// stored passage do not carry over; the n-th whole-word occurrence does. Returns
// [{ entry, start, end }] as offsets into shownText; words not found are left out.
function locateWordHelp(passageText, entries, shownText) {
  const wordChar = /[\p{L}\p{M}\p{N}]/u;
  const wholeWordStarts = (text, quote) => {
    const starts = [];
    if (!quote) return starts;
    const edge = getInstructionalContextApi()?.isWordEdge;
    for (let at = text.indexOf(quote); at !== -1; at = text.indexOf(quote, at + 1)) {
      const end = at + quote.length;
      if (edge) {
        if (edge(text, at) && edge(text, end)) starts.push(at);
        continue;
      }
      if (at > 0 && wordChar.test(text.charAt(at - 1)) || end < text.length && wordChar.test(text.charAt(end))) continue;
      starts.push(at);
    }
    return starts;
  };
  const found = [];
  // Link and image addresses and chart data never show on screen: blank them
  // (keeping every offset) so they are not counted as occurrences.
  const stored = String(passageText || '').replace(/\]\([^)\s]*\)/g, match => ' '.repeat(match.length)).replace(/\[\[CHART:[\s\S]*?\]\]/g, match => ' '.repeat(match.length));
  (entries || []).forEach(entry => {
    const nth = wholeWordStarts(stored, entry.quote).indexOf(entry.start);
    const shown = wholeWordStarts(String(shownText || ''), entry.quote);
    const start = shown[Math.max(0, nth)];
    if (nth === -1 || start === undefined) return;
    found.push({
      entry,
      start,
      end: start + entry.quote.length
    });
  });
  return found;
}
// The passage's visible text, as [text node, offset] segments, skipping any part
// in another language (the English half of a bilingual text).
function readingTextSegments(container, language) {
  const segments = [];
  let text = '';
  if (!container || typeof document === 'undefined') return {
    text,
    segments
  };
  const tagged = !!container.querySelector('[data-reading-language]');
  const wanted = String(language || '').trim().toLowerCase();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  // Text in different blocks or table cells never runs together on screen.
  const blockOf = element => element.closest('p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, dt, dd, pre, figcaption, div');
  let lastBlock = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const owner = node.parentElement;
    if (!owner || owner.closest('button, [aria-hidden="true"], [data-adapted-word-help], [data-reading-chart], [role="status"], [role="alert"], script, style')) continue;
    if (tagged && wanted) {
      const own = owner.closest('[data-reading-language]');
      if (own && String(own.getAttribute('data-reading-language') || '').trim().toLowerCase() !== wanted) continue;
    }
    const block = blockOf(owner);
    if (segments.length && block !== lastBlock) text += '\n';
    lastBlock = block;
    segments.push({
      node,
      start: text.length
    });
    text += node.data;
  }
  return {
    text,
    segments
  };
}
function ensureWordHelpHighlightStyle() {
  if (typeof document === 'undefined' || document.getElementById('allo-word-help-highlights')) return;
  const style = document.createElement('style');
  style.id = 'allo-word-help-highlights';
  // currentColor keeps the underline visible in every reading theme.
  style.textContent = '::highlight(allo-word-help){text-decoration:underline dotted 2px currentColor}::highlight(allo-word-help-focus){background-color:#fde047;color:#111827}';
  document.head.appendChild(style);
}
function shareWordHelpMarks(registry, removed, added) {
  let shared = registry.get('allo-word-help');
  (removed || []).forEach(range => {
    if (shared) shared.delete(range);
  });
  if (added.length) {
    ensureWordHelpHighlightStyle();
    if (!shared) {
      shared = new Highlight();
      registry.set('allo-word-help', shared);
    }
    added.forEach(range => shared.add(range));
  }
  if (shared && !shared.size) registry.delete('allo-word-help');
}
function rangeForOffsets(segments, start, end) {
  const at = offset => {
    for (let i = segments.length - 1; i >= 0; i--) if (segments[i].start <= offset) return {
      node: segments[i].node,
      offset: offset - segments[i].start
    };
    return null;
  };
  const from = at(start),
    to = at(end);
  if (!from || !to || typeof document === 'undefined') return null;
  const range = document.createRange();
  range.setStart(from.node, Math.min(from.offset, from.node.data.length));
  range.setEnd(to.node, Math.min(to.offset, to.node.data.length));
  return range;
}
// The shown word-help entry that covers a word the reader selected in the passage
// on screen, or null. Same lookup as the passage marks, so a selected word opens
// exactly the help its underline stands for.
function adaptedWordHelpAt(item, container, language, wordNode) {
  const contract = getInstructionalContextApi();
  if (!item || !container || !wordNode || !contract?.isAdaptedReading?.(item) || !contract.validateAdaptedReadingSupports) return null;
  const help = contract.validateAdaptedReadingSupports(item, item.adaptedReadingSupports);
  if (!help.shown || help.status === 'stale' || !(help.annotations || []).length) return null;
  const passage = contract.getAdaptedSupportSnapshot(item, item.adaptedReadingSupports);
  if (!passage) return null;
  const {
    text,
    segments
  } = readingTextSegments(container, language);
  const segment = segments.find(value => wordNode === value.node || wordNode.contains(value.node));
  if (!segment) return null;
  const hit = locateWordHelp(passage.text, help.annotations, text).find(value => segment.start >= value.start && segment.start < value.end);
  return hit ? hit.entry : null;
}

// Word help for an ADAPTED text: its own supports (item.adaptedReadingSupports),
// hidden from students until the teacher shows them, and listed after the
// passage because the adapted reader does not keep character positions.
function AdaptedWordHelp({
  item,
  teacher,
  disabled,
  onUpdate,
  onGenerate,
  languageTag,
  direction,
  onListen,
  listening,
  renderCredits,
  originalSupports,
  passageSelector,
  language,
  markWords,
  quiet
}) {
  const contract = getInstructionalContextApi();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  // The panel opens by itself when an edit leaves word help stale, and stays open
  // after Keep or Start again so their result is seen (and focused).
  const staleNow = !!(contract?.isAdaptedReading?.(item) && contract.validateAdaptedReadingSupports && contract.validateAdaptedReadingSupports(item, item.adaptedReadingSupports).status === 'stale');
  const [panelOpen, setPanelOpen] = React.useState(staleNow);
  React.useEffect(() => {
    if (staleNow) setPanelOpen(true);
  }, [staleNow]);
  const noticeRef = React.useRef(null),
    focusNotice = React.useRef(false);
  React.useEffect(() => {
    if (focusNotice.current && noticeRef.current) {
      focusNotice.current = false;
      noticeRef.current.focus();
    }
  });
  // Words that have help, as they appear in the passage on screen (a CSS
  // highlight marks them, so the passage's own markup is never touched).
  const listRef = React.useRef(null),
    spotTimer = React.useRef(null);
  const [spotNotice, setSpotNotice] = React.useState('');
  // No marks where the passage on screen is not this word help's text (the
  // English side of a bilingual text in Both) - markWords is false there.
  const passageOnScreen = () => {
    const section = listRef.current;
    if (!section || markWords === false) return null;
    const surface = section.closest('[data-adapted-reader]') || section.ownerDocument;
    return surface && surface.querySelector(passageSelector || '[data-reading-passage]') || null;
  };
  const wordHelpOnScreen = onlyId => {
    const container = passageOnScreen();
    if (!container || !contract?.validateAdaptedReadingSupports) return [];
    const shownHelp = contract.validateAdaptedReadingSupports(item, item.adaptedReadingSupports);
    const passage = contract.getAdaptedSupportSnapshot(item, item.adaptedReadingSupports);
    if (!shownHelp.shown || !passage) return [];
    const {
      text,
      segments
    } = readingTextSegments(container, language);
    const wanted = onlyId ? shownHelp.annotations.filter(entry => entry.id === onlyId) : shownHelp.annotations;
    return locateWordHelp(passage.text, wanted, text).map(hit => ({
      ...hit,
      range: rangeForOffsets(segments, hit.start, hit.end)
    })).filter(hit => hit.range);
  };
  // Re-read the passage only when the text, the word help or where it is shown
  // changed, or the passage was redrawn (a mark's text node left the page); the
  // reader re-renders on every read-aloud word, and the marks stay valid then.
  const marksRef = React.useRef(null);
  React.useEffect(() => {
    const registry = typeof CSS !== 'undefined' && CSS.highlights;
    if (!registry || typeof Highlight !== 'function') return;
    // The text on screen can change in place (Fill in the blanks back to Read)
    // while old text nodes stay on the page, so compare the text itself too.
    const container = passageOnScreen();
    const shownText = container ? container.textContent : '';
    const last = marksRef.current;
    if (last && last.data === item.data && last.supports === item.adaptedReadingSupports && last.shownText === shownText && last.where === passageSelector + '|' + language && last.ranges.every(range => range.startContainer.isConnected && range.endContainer.isConnected)) return;
    const ranges = container ? wordHelpOnScreen().map(hit => hit.range) : [];
    marksRef.current = {
      data: item.data,
      supports: item.adaptedReadingSupports,
      shownText,
      where: passageSelector + '|' + language,
      ranges
    };
    // One highlight shared by every reader on the page (a student preview is a
    // second reader): each adds and removes only its own ranges.
    shareWordHelpMarks(registry, last ? last.ranges : [], ranges);
  });
  React.useEffect(() => () => {
    if (spotTimer.current) clearTimeout(spotTimer.current);
    if (typeof CSS !== 'undefined' && CSS.highlights) {
      shareWordHelpMarks(CSS.highlights, marksRef.current ? marksRef.current.ranges : [], []);
      CSS.highlights.delete('allo-word-help-focus');
    }
  }, []);
  const showInText = entry => {
    const hit = wordHelpOnScreen(entry.id)[0];
    if (!hit) {
      setSpotNotice(simplifiedText('simplified.word_help_not_found_in_text', 'Could not find "{word}" in the passage on screen.', {
        word: entry.quote
      }));
      return;
    }
    const target = hit.range.startContainer.parentElement;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({
      block: 'center',
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
    const registry = typeof CSS !== 'undefined' && CSS.highlights;
    if (registry && typeof Highlight === 'function') {
      ensureWordHelpHighlightStyle();
      registry.set('allo-word-help-focus', new Highlight(hit.range));
      if (spotTimer.current) clearTimeout(spotTimer.current);
      spotTimer.current = setTimeout(() => registry.delete('allo-word-help-focus'), 4000);
    }
    setSpotNotice(simplifiedText('simplified.word_help_highlighted_in_text', '"{word}" is highlighted in the passage.', {
      word: entry.quote
    }));
  };
  if (!contract?.isAdaptedReading?.(item) || !contract.validateAdaptedReadingSupports) return null;
  const stored = item.adaptedReadingSupports;
  const help = contract.validateAdaptedReadingSupports(item, stored);
  const entries = help.annotations || [];
  const stale = help.status === 'stale';
  const snapshot = stale ? null : contract.getAdaptedSupportSnapshot(item, stored);
  // After an edit, how many explanations are for words still in the passage.
  const staleCount = stale && Array.isArray(stored?.annotations) ? stored.annotations.length : 0;
  let keepable = 0;
  if (staleCount && contract.rebaseAdaptedReadingSupports) {
    try {
      keepable = contract.rebaseAdaptedReadingSupports(item, stored).annotations.length;
    } catch (_) {}
  }
  // The original's explanations for words this adapted text kept.
  const fromOriginal = teacher && !stale && Array.isArray(originalSupports?.annotations) ? originalSupports.annotations : [];
  let importable = 0;
  if (fromOriginal.length && contract.importOriginalSupportsIntoAdapted) {
    try {
      importable = contract.importOriginalSupportsIntoAdapted(item, stored, fromOriginal).annotations.length - entries.length;
    } catch (_) {}
  }
  const idBase = 'adapted-word-help-' + String(item.id || 'current').replace(/[^a-z0-9_-]/gi, '-');
  const explanation = entry => entry.definition || entry.explanation || entry.text || '';
  const run = async (work, message) => {
    if (busy || disabled) return;
    setBusy(true);
    setNotice('');
    try {
      setNotice(message(await work()));
    } catch (error) {
      setNotice(error?.message || simplifiedText('simplified.word_help_could_not_be_saved', 'Word help could not be saved. The adapted text is unchanged.'));
    } finally {
      setBusy(false);
    }
  };
  const list = !quiet && help.shown && entries.length > 0 && /*#__PURE__*/React.createElement("section", {
    ref: listRef,
    "data-adapted-word-help": true,
    "aria-labelledby": idBase + '-title',
    className: "mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-slate-900"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("h3", {
    id: idBase + '-title',
    className: "text-lg font-bold text-indigo-950"
  }, simplifiedText('simplified.word_help_word_help', 'Word help')), onListen && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onListen(entries.map(entry => entry.quote + '. ' + explanation(entry)).join('. ')),
    className: "min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-indigo-900"
  }, listening ? simplifiedText('simplified.word_help_stop_word_help', 'Stop word help') : simplifiedText('simplified.word_help_listen_to_word_help', 'Listen to word help'))), markWords !== false && /*#__PURE__*/React.createElement("p", {
    "data-adapted-word-help-tip": true,
    className: "mt-1 text-sm text-indigo-900"
  }, simplifiedText('simplified.word_help_tip_select', 'Tip: choose Word meaning, then select an underlined word to open its help.')), /*#__PURE__*/React.createElement("ul", {
    className: "mt-2 space-y-2",
    lang: languageTag,
    dir: direction
  }, entries.map(entry => /*#__PURE__*/React.createElement("li", {
    key: entry.id,
    "data-adapted-word-help-entry": true,
    className: "flex items-start gap-3 break-words text-base leading-relaxed"
  }, entry.image && /*#__PURE__*/React.createElement("img", {
    src: entry.image.src,
    alt: entry.image.alt || '',
    className: "h-14 w-14 shrink-0 rounded bg-white object-contain"
  }), /*#__PURE__*/React.createElement("span", {
    "data-adapted-word-help-text": true,
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("strong", null, entry.quote), ": ", explanation(entry)), markWords !== false && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-adapted-word-help-spot": true,
    onClick: () => showInText(entry),
    "aria-label": simplifiedText('simplified.word_help_show_word_in_text', 'Show in text: {word}', {
      word: entry.quote
    }),
    className: "min-h-11 shrink-0 rounded-lg border border-indigo-300 bg-white px-3 text-sm text-indigo-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, simplifiedText('simplified.word_help_show_in_text', 'Show in text'))))), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "data-adapted-word-help-spot-notice": true,
    className: spotNotice ? 'mt-2 text-sm text-indigo-900' : 'sr-only'
  }, spotNotice), renderCredits ? renderCredits(entries) : null);
  // Collapsed unless stale, so an optional tool does not crowd every adapted text.
  const panel = teacher && /*#__PURE__*/React.createElement("details", {
    "data-adapted-word-help-teacher": true,
    open: panelOpen,
    onToggle: event => setPanelOpen(event.currentTarget.open),
    className: "my-4 space-y-3 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-800"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 cursor-pointer rounded-lg px-2 py-2 font-bold text-indigo-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, simplifiedText('simplified.word_help_word_help', 'Word help'), /*#__PURE__*/React.createElement("span", {
    "data-word-help-summary": true,
    className: "font-normal text-slate-700"
  }, ' · ' + (stale ? simplifiedText('simplified.word_help_summary_needs_review', 'Needs review after an edit') : !entries.length ? simplifiedText('simplified.word_help_summary_none', 'No supports yet') : (entries.length === 1 ? simplifiedText('simplified.word_help_summary_one', '1 support') : simplifiedText('simplified.word_help_summary_count', '{count} supports', {
    count: entries.length
  })) + ' · ' + (help.shown ? simplifiedText('simplified.word_help_summary_shown', 'Shown to students') : simplifiedText('simplified.word_help_summary_hidden', 'Hidden from students'))))), /*#__PURE__*/React.createElement("p", {
    className: "leading-relaxed text-slate-600"
  }, simplifiedText('simplified.word_help_optional_explanations_for_words_in_this', 'Optional explanations for words in this adapted text. Students see them as a list after the passage only when you show it. The original\'s word supports are kept separately.')), stale && /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "space-y-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-amber-900"
  }, /*#__PURE__*/React.createElement("p", null, simplifiedText('simplified.word_help_this_adapted_text_was_edited_after', 'This adapted text was edited after its word help was made, so that word help is hidden. Keep the explanations whose words are still in the text, start again with an empty list, or suggest word help for the current text.')), keepable > 0 && /*#__PURE__*/React.createElement("p", {
    "data-adapted-word-help-keepable": true
  }, simplifiedText('simplified.word_help_still_matching', '{kept} of {total} explanations are for words that are still in the text.', {
    kept: keepable,
    total: staleCount
  })), onUpdate && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, keepable > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-adapted-word-help-rebase": true,
    disabled: disabled || busy,
    onClick: () => run(() => onUpdate(item, {
      type: 'rebase'
    }), result => (focusNotice.current = true) && simplifiedText('simplified.word_help_kept_check_fit', 'Kept the explanations that still match ({count}). Students will not see them until you check each one and show word help again.', {
      count: result?.annotations?.length || 0
    })),
    className: "min-h-11 rounded-lg bg-amber-800 px-3 font-semibold text-white disabled:opacity-50"
  }, simplifiedText('simplified.word_help_keep_matching', 'Keep the {count} that still match', {
    count: keepable
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-adapted-word-help-clear": true,
    disabled: disabled || busy,
    onClick: () => run(() => onUpdate(item, {
      type: 'clear'
    }), () => (focusNotice.current = true) && simplifiedText('simplified.word_help_cleared', 'Word help cleared. Add explanations for the current adapted text.')),
    className: "min-h-11 rounded-lg border border-amber-700 px-3 disabled:opacity-50"
  }, simplifiedText('simplified.word_help_start_again', 'Start again')))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, onUpdate && /*#__PURE__*/React.createElement("label", {
    className: "flex min-h-11 items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "data-adapted-word-help-show": true,
    checked: help.shown,
    disabled: disabled || busy || stale || !entries.length && !help.shown,
    onChange: event => {
      const shown = event.target.checked;
      run(() => onUpdate(item, {
        type: 'show',
        shown
      }), result => result?.shown ? simplifiedText('simplified.word_help_students_now_see_this_word_help', 'Students now see this word help after the passage.') : simplifiedText('simplified.word_help_word_help_is_hidden_from_students', 'Word help is hidden from students.'));
    }
  }), simplifiedText('simplified.word_help_show_word_help_to_students', 'Show word help to students')), onGenerate && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-adapted-word-help-generate": true,
    disabled: disabled || busy,
    onClick: () => run(() => onGenerate(item), result => result?.status === 'unavailable' ? simplifiedText('simplified.word_help_word_help_could_not_be_suggested', 'Word help could not be suggested. The adapted text is unchanged.') : result?.status === 'partial' ? simplifiedText('simplified.word_help_some_words_could_not_be_supported', 'Some words could not be supported. Review the suggestions before showing them.') : simplifiedText('simplified.word_help_suggested_word_help_is_ready_review', 'Suggested word help is ready. Review it, then show it to students.')),
    className: "min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900 disabled:opacity-50"
  }, busy ? simplifiedText('simplified.word_help_working', 'Working…') : entries.length ? simplifiedText('simplified.word_help_refresh_suggested_word_help', 'Refresh suggested word help') : simplifiedText('simplified.word_help_suggest_word_help', 'Suggest word help')), onUpdate && importable > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-adapted-word-help-import": true,
    disabled: disabled || busy,
    onClick: () => run(() => onUpdate(item, {
      type: 'import',
      annotations: fromOriginal
    }), result => (focusNotice.current = true) && simplifiedText('simplified.word_help_added_from_original', 'Added explanations from the original ({count}). Students will not see word help until you check them and show it again.', {
      count: Math.max(0, (result?.annotations?.length || 0) - entries.length)
    })),
    className: "min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900 disabled:opacity-50"
  }, simplifiedText('simplified.word_help_use_from_original', 'Reuse explanations from the original ({count})', {
    count: importable
  }))), /*#__PURE__*/React.createElement("p", {
    ref: noticeRef,
    tabIndex: -1,
    role: "status",
    "data-word-help-notice": true,
    className: notice ? 'rounded bg-indigo-50 p-2 text-indigo-900' : 'sr-only'
  }, notice), snapshot && onUpdate && /*#__PURE__*/React.createElement(ReadingGlossEditor, {
    item: item,
    supports: help,
    snapshot: snapshot,
    adapted: true,
    embedded: true,
    onUpdate: onUpdate,
    disabled: disabled || busy
  }));
  if (!list && !panel) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, list, panel);
}
function SimplifiedView(props) {
  var viewText = (key, fallback, params) => simplifiedText(key, fallback, params, props.t);
  // State reads
  var t = props.t;
  var simplifiedAudioEditLabel = t('common.edit') || '';
  var simplifiedAudioSaveLabel = t('common.save') || '';
  var simplifiedAudioStopLabel = t('common.stop') || '';
  var simplifiedAudioPlayLabel = t('common.play') || '';
  var simplifiedAudioPauseLabel = t('common.pause') || '';
  var simplifiedAudioLoadingLabel = t('common.loading') || '';
  var simplifiedAudioGenerateLabel = t('common.generate') || '';
  var simplifiedAudioRegenerateLabel = t('common.regenerate') || '';
  var simplifiedAudioRemoveLabel = t('common.remove') || '';
  var simplifiedAudioRecordLabel = t('word_sounds.voice_pack_tab_record') || t('common.microphone') || '';
  var simplifiedAudioSavedLabel = t('common.success') || '';
  var simplifiedAudioMissingLabel = t('simplified.missing_label') || '';
  var simplifiedAudioErrorLabel = t('common.error') || '';
  var simplifiedAudioStorageLimitLabel = t('errors.storage_full') || simplifiedAudioErrorLabel;
  var simplifiedAudioSettingsChangedLabel = t('ui_common.unsaved_changes') || simplifiedAudioErrorLabel;
  var simplifiedAudioCopiedLabel = t('common.copy') || '';
  var simplifiedAudioDiagnosticsLabel = t('common.error_analysis') || simplifiedAudioErrorLabel;
  var simplifiedActivityCompleteLabel = t('word_sounds.session_complete') || simplifiedAudioSavedLabel;
  var simplifiedReadingSelectionLabel = t('common.selection') || t('common.resource') || '';
  var simplifiedReadingThemeLabel = t('header.reading_theme_aria') || '';
  var simplifiedTeacherRecordingLabel = t('word_sounds.voice_pack_kind_teacher') || simplifiedAudioRecordLabel;
  var simplifiedStudentRecordingLabel = t('word_sounds.voice_pack_kind_student') || simplifiedAudioRecordLabel;
  var simplifiedHumanRecordingLabel = t('word_sounds.real_recording') || simplifiedAudioRecordLabel;
  var simplifiedHearPhonicsLabel = t('common.click_hear_phonics') || '';
  var simplifiedDefineLabel = t('text_tools.define') || '';
  var simplifiedReadSentenceLabel = t('common.read') || '';
  var simplifiedGeneratingMoreLabel = t('word_sounds.generating_more') || '';
  var simplifiedEnglishTranslationLabel = t('common.english_translation') || '';
  var simplifiedStopAudioDownloadLabel = t('common.audio_stop') || simplifiedAudioStopLabel;
  var generatedContent = props.generatedContent;
  var readingContract = getInstructionalContextApi();
  var protectedOriginal = getSimplifiedInstructionalText(generatedContent).form === 'same-text-supported';
  var capturedSource = readingContract?.getSourceSnapshot?.(generatedContent) || null;
  var verifiedOriginal = !!readingContract?.isSupportedOriginal?.(generatedContent);
  var inputText = props.inputText;
  var gradeLevel = props.gradeLevel;
  var leveledTextLanguage = generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || props.leveledTextLanguage;
  var studentInterests = props.studentInterests;
  var standardsInput = props.standardsInput;
  var sourceTopic = props.sourceTopic;
  var isTeacherMode = props.isTeacherMode;
  // Explain mode (2026-09-14): every action in its selection menu (Explain,
  // Simplify, Custom) is an AI call, so the mode is withheld from a student
  // whose AI is hidden. Word meaning stays: it has a dictionary path.
  var studentAiFeaturesHidden = !isTeacherMode && !!props.studentAiFeaturesHidden;
  var isProcessing = props.isProcessing;
  var isPlaying = props.isPlaying;
  // Guard stale authoring state immediately when switching to student view.
  var interactionMode = !isTeacherMode && (['revise', 'add-glossary'].includes(props.interactionMode) || studentAiFeaturesHidden && props.interactionMode === 'explain') ? 'read' : props.interactionMode;
  var isCompareMode = !!props.isCompareMode;
  if ((protectedOriginal || isCompareMode) && interactionMode === 'cloze') interactionMode = 'read';
  var isFluencyMode = props.isFluencyMode;
  var isEditingLeveledText = isTeacherMode && !protectedOriginal && props.isEditingLeveledText;
  var isImmersiveReaderActive = props.isImmersiveReaderActive;
  var immersiveSettings = props.immersiveSettings;
  var immersiveRulerY = props.immersiveRulerY;
  var isFocusReaderActive = props.isFocusReaderActive;
  var isChunkReaderActive = props.isChunkReaderActive;
  var chunkReaderIdx = props.chunkReaderIdx;
  var chunkReaderAutoPlay = props.chunkReaderAutoPlay;
  var chunkReaderSpeed = props.chunkReaderSpeed;
  var chunkReaderReadAlong = props.chunkReaderReadAlong;
  var chunkReaderSweepPct = props.chunkReaderSweepPct;
  var chunkReaderMood = props.chunkReaderMood || 'highlight';
  var setChunkReaderMood = props.setChunkReaderMood;
  var chunkTypewriterCharIdx = props.chunkTypewriterCharIdx || 0;
  var isCrawlReaderActive = props.isCrawlReaderActive;
  var isKaraokeOverlayActive = props.isKaraokeOverlayActive;
  var isAnalyzingPos = props.isAnalyzingPos;
  var isCheckingLevel = props.isCheckingLevel;
  // Automatic level check preference (read by the generation dispatcher).
  // Stored per browser, never on the resource; default ON for teachers.
  var _autoLevelPref = React.useState(function () {
    try {
      return localStorage.getItem('alloflow_auto_level_check') !== 'off';
    } catch (_) {
      return true;
    }
  });
  var autoLevelCheckOn = _autoLevelPref[0];
  var setAutoLevelCheckOn = function (next) {
    _autoLevelPref[1](!!next);
    try {
      localStorage.setItem('alloflow_auto_level_check', next ? 'on' : 'off');
    } catch (_) {}
  };
  var isCheckingAlignment = props.isCheckingAlignment;
  var isLineFocusMode = props.isLineFocusMode;
  var focusedParagraphIndex = props.focusedParagraphIndex;
  var isZenMode = props.isZenMode;
  var definitionData = props.definitionData;
  var phonicsData = props.phonicsData;
  var revisionData = isTeacherMode || props.revisionData?.type === 'explain' ? props.revisionData : null;
  var selectionMenu = interactionMode === props.interactionMode ? props.selectionMenu : null;
  var isCustomReviseOpen = isTeacherMode && props.isCustomReviseOpen;
  var customReviseInstruction = props.customReviseInstruction;
  var latestGlossary = props.latestGlossary;
  // Fill in the blanks makes blanks from glossary terms. With none it showed
  // the passage without blanks under "Fill in the missing words".
  var hasClozeTerms = Array.isArray(latestGlossary) && latestGlossary.some(function (item) {
    return item && item.term && item.isSelected !== false;
  });
  // "Complete" means every blank on the page is solved. The host's check
  // counted a term after one of its blanks and waited on terms that never
  // appear in the passage, so it could not fire.
  // Read-aloud in Fill in the blanks says "blank" for each term, so listening
  // stays available without reading the answers out.
  var maskClozeTerms = function (text) {
    var blank = t('simplified.cloze_blank_spoken');
    blank = blank && blank !== 'simplified.cloze_blank_spoken' ? blank : 'blank';
    var language = props.leveledTextLanguage,
      terms = [];
    (latestGlossary || []).forEach(function (item) {
      if (!item || !item.term || item.isSelected === false) return;
      terms.push(String(item.term));
      var translated = item.translations && language && item.translations[language];
      if (translated) terms.push(String(translated).split(':')[0].trim());
    });
    terms = terms.filter(Boolean).sort(function (a, b) {
      return b.length - a.length;
    });
    if (!terms.length) return text;
    var escaped = terms.map(function (term) {
      return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    var pattern = new RegExp('(^|[^\\p{L}\\p{N}])(' + escaped.join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'giu');
    return String(text).replace(pattern, function (_match, lead) {
      return lead + blank;
    });
  };
  var clozeBodyRef = React.useRef(null);
  var [clozeAllSolved, setClozeAllSolved] = React.useState(false);
  React.useEffect(function () {
    var root = clozeBodyRef.current;
    var blanks = props.interactionMode === 'cloze' && root ? root.querySelectorAll('[data-cloze-blank]') : [];
    var done = blanks.length > 0 && Array.prototype.every.call(blanks, function (node) {
      return node.getAttribute('data-cloze-solved') === 'true';
    });
    if (done !== clozeAllSolved) setClozeAllSolved(done);
  });
  var history = props.history;
  var complexityLevel = props.complexityLevel;
  var saveOriginalOnAdjust = props.saveOriginalOnAdjust;
  var playbackState = props.playbackState;
  var playbackRate = props.playbackRate;
  var selectedVoice = props.selectedVoice;
  var voiceSpeed = props.voiceSpeed;
  var lineHeight = props.lineHeight;
  var letterSpacing = props.letterSpacing;
  var readingTheme = props.readingTheme;
  var theme = props.theme;
  var isTeacherToolbarExpanded = props.isTeacherToolbarExpanded;
  var downloadingContentId = props.downloadingContentId;
  var playingContentId = props.playingContentId;
  var isSimplifiedAudioDownloading = downloadingContentId === 'dl-simplified-main';
  var isClozeComplete = props.isClozeComplete;
  var isSideBySide = props.isSideBySide;
  var cursorStyles = props.cursorStyles;
  // Setters
  var setInteractionMode = props.setInteractionMode;
  var setIsCompareMode = props.setIsCompareMode;
  var setIsFluencyMode = props.setIsFluencyMode;
  var setSelectionMenu = props.setSelectionMenu;
  var setRevisionData = props.setRevisionData;
  var setPhonicsData = props.setPhonicsData;
  var setIsImmersiveReaderActive = props.setIsImmersiveReaderActive;
  var setImmersiveSettings = props.setImmersiveSettings;
  var setImmersiveRulerY = props.setImmersiveRulerY;
  var setIsFocusReaderActive = props.setIsFocusReaderActive;
  var setIsChunkReaderActive = props.setIsChunkReaderActive;
  var setChunkReaderIdx = props.setChunkReaderIdx;
  var setChunkReaderAutoPlay = props.setChunkReaderAutoPlay;
  var setChunkReaderSpeed = props.setChunkReaderSpeed;
  var setChunkReaderReadAlong = props.setChunkReaderReadAlong;
  var setChunkReaderSweepPct = props.setChunkReaderSweepPct;
  var setIsCrawlReaderActive = props.setIsCrawlReaderActive;
  var setIsKaraokeOverlayActive = props.setIsKaraokeOverlayActive;
  var setPlaybackRate = props.setPlaybackRate;
  var setLineHeight = props.setLineHeight;
  var setLetterSpacing = props.setLetterSpacing;
  var setFocusedParagraphIndex = props.setFocusedParagraphIndex;
  // Line Focus follows keyboard focus as well as the pointer. Keep a
  // focused response visible when the mouse leaves or moves between words.
  var lineFocusParagraphProps = function (paragraphId) {
    var clearFocus = function () {
      setFocusedParagraphIndex(current => current === paragraphId ? null : current);
    };
    return {
      'data-line-focus-paragraph': String(paragraphId),
      tabIndex: isLineFocusMode ? 0 : undefined,
      onFocus: function () {
        setFocusedParagraphIndex(paragraphId);
      },
      onBlur: function (event) {
        if (!event.currentTarget.contains(event.relatedTarget)) clearFocus();
      },
      onMouseEnter: function () {
        setFocusedParagraphIndex(paragraphId);
      },
      onMouseLeave: function (event) {
        if (!event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement)) clearFocus();
      }
    };
  };
  var setIsCustomReviseOpen = props.setIsCustomReviseOpen;
  var setCustomReviseInstruction = props.setCustomReviseInstruction;
  var setComplexityLevel = props.setComplexityLevel;
  var setSaveOriginalOnAdjust = props.setSaveOriginalOnAdjust;
  var setReadingTheme = props.setReadingTheme;
  var setGeneratedContent = props.setGeneratedContent;
  var setHistory = props.setHistory;
  // Refs
  var chunkReaderSweepAudioRef = props.chunkReaderSweepAudioRef;
  var chunkReaderSweepRafRef = props.chunkReaderSweepRafRef;
  var textEditorRef = props.textEditorRef;
  // Handlers
  var handleCloseImmersiveReader = props.handleCloseImmersiveReader;
  var handleGeneratePOSData = props.handleGeneratePOSData;
  var handleCloseSpeedReader = props.handleCloseSpeedReader;
  var handleSpeak = props.handleSpeak;
  var handleWordClick = props.handleWordClick;
  var handlePhonicsClick = props.handlePhonicsClick;
  var handleFormatText = props.handleFormatText;
  var handleSimplifiedTextChange = props.handleSimplifiedTextChange;
  var handleReviseSelection = props.handleReviseSelection;
  var handleQuickAddGlossary = props.handleQuickAddGlossary;
  var handleDefineSelection = props.handleDefineSelection;
  var handleTextMouseUp = props.handleTextMouseUp;
  var handleSetIsSyntaxGameToTrue = props.handleSetIsSyntaxGameToTrue;
  var handleAnalyzePOS = props.handleAnalyzePOS;
  var handleCheckLevel = props.handleCheckLevel;
  var handleCheckAlignment = props.handleCheckAlignment;
  var handleDuplicateResource = props.handleDuplicateResource;
  var handleDownloadAudio = props.handleDownloadAudio;
  var handleToggleIsTeacherToolbarExpanded = props.handleToggleIsTeacherToolbarExpanded;
  var handleToggleIsEditingLeveledText = props.handleToggleIsEditingLeveledText;
  var handleSetIsCustomReviseOpenToFalse = props.handleSetIsCustomReviseOpenToFalse;
  var closeDefinition = props.closeDefinition;
  var closePhonics = props.closePhonics;
  var closeRevision = props.closeRevision;
  var handleFetchWordImage = props.handleFetchWordImage;
  var applyTextRevision = props.applyTextRevision;
  var stopPlayback = props.stopPlayback;
  var handleComplexityAdjustment = props.handleComplexityAdjustment;
  var handleRegenerateWithRigor = props.handleRegenerateWithRigor;
  // Pure helpers
  var splitTextToSentences = props.splitTextToSentences;
  var getSideBySideContent = props.getSideBySideContent;
  var formatInteractiveText = props.formatInteractiveText;
  var renderFormattedText = props.renderFormattedText;
  var splitReferencesFromBody = props.splitReferencesFromBody;
  var parseReferenceItems = props.parseReferenceItems;
  var highlightGlossaryTerms = props.highlightGlossaryTerms;
  var diffWords = props.diffWords;
  var callTTS = props.callTTS;
  var copyToClipboard = props.copyToClipboard;
  var isRtlLang = props.isRtlLang;
  var getContentDirection = props.getContentDirection;
  // Components
  var ImmersiveToolbar = props.ImmersiveToolbar;
  var ImmersiveWord = props.ImmersiveWord;
  var ErrorBoundary = props.ErrorBoundary;
  var FocusReaderOverlay = props.FocusReaderOverlay;
  var PerspectiveCrawlOverlay = props.PerspectiveCrawlOverlay;
  var KaraokeReaderOverlay = props.KaraokeReaderOverlay;
  var [comparisonKaraoke, setComparisonKaraoke] = React.useState(null);
  var ConfettiExplosion = props.ConfettiExplosion;
  var ComplexityGauge = props.ComplexityGauge;
  var SourceReferencesPanel = props.SourceReferencesPanel;
  // The immersive reader is a z-[200] full-screen overlay. Word-level popups
  // (Define / Phonics / selection / revise) default to z-[100]/z-[90], so when
  // immersive is open they render BEHIND it — the definition appears to land in
  // the standard view. Lift them above the overlay while immersive is active
  // (backdrop just under the popup, still above the overlay).
  const _popupZ = isImmersiveReaderActive ? 'z-[220]' : 'z-[100]';
  const _popupBackdropZ = isImmersiveReaderActive ? 'z-[210]' : 'z-[90]';
  // Build the exact text contract shared by visible sentence indexes,
  // in-view playback, karaoke preparation, and Edit Audio.
  var buildSimplifiedContentParts = function (rawText) {
    var fullText = typeof rawText === 'string' ? rawText : String(rawText || '');
    var split = {
      body: fullText,
      references: ''
    };
    try {
      if (typeof splitReferencesFromBody === 'function') split = splitReferencesFromBody(fullText) || split;
    } catch (_) {}
    var normalizedBody = String(split.body || '').replace(/\r\n?/g, '\n').replace(/^[ \t]*<h([1-6])[^>]*>(.*?)<\/h[1-6]>[ \t]*$/gmi, (_match, level, text) => '#'.repeat(Number(level)) + ' ' + text).replace(/^[ \t]*(\*\*)([^*\n]+?)\1[ \t]*$/gm, function (_match, _stars, inner) {
      // Only a bold line is a label heading. An italic line is a poem line or a
      // caption ("*Figure 2*"), and became a section heading.
      if (/[.!?。！？؟:：]$/.test(inner.trim())) return _match;
      return '## ' + inner.trim();
    });
    // A chart directive gets its own paragraph, so it is drawn as a chart and
    // never read aloud; it was shown and spoken as raw JSON.
    normalizedBody = normalizedBody.replace(/\[\[CHART:([\s\S]*?)\]\]/g, (_m, body) => '\n\n[[CHART: ' + body.replace(/\s*\n\s*/g, ' ').trim() + ']]\n\n');
    // A table gets its own paragraph too. Read-aloud skips table paragraphs, so a
    // line written directly above one ("Look at this:") was never read or clickable.
    normalizedBody = normalizedBody.replace(/^([ \t]*[^|\s][^\n]*)\n(?=[ \t]*\|)/gm, '$1\n\n').replace(/^([ \t]*\|[^\n]*)\n(?=[ \t]*[^|\s])/gm, '$1\n\n');
    return {
      body: normalizedBody,
      references: String(split.references || '')
    };
  };
  var simplifiedContentParts = protectedOriginal ? {
    body: typeof generatedContent?.data === 'string' ? generatedContent.data : '',
    references: ''
  } : buildSimplifiedContentParts(generatedContent && generatedContent.data);
  var simplifiedDisplayBody = simplifiedContentParts.body;
  // Immersive words are used only for the text they were built from; an edit
  // copies the item, so the overlays kept reading the old words.
  var immersiveFresh = Array.isArray(generatedContent?.immersiveData) && (generatedContent.immersiveSource == null || generatedContent.immersiveSource === String(generatedContent.data || ''));
  function openReadingReflection() {
    if (!props.onReadReflect) return;
    rememberPlace(true);
    props.onReadReflect({
      text: simplifiedDisplayBody,
      title: sourceTopic || 'Adapted reading',
      language: leveledTextLanguage || '',
      anchor: {
        kind: 'adapted',
        resourceId: String(generatedContent.id || sourceTopic || 'adapted'),
        section: 'body'
      }
    });
  }
  // The adapted document owns its citation registry. Falling back to the
  // source document is only safe when the adapted document has no reference
  // trailer at all; choosing whichever list is longer can pair adapted body
  // markers with a different source list.
  var simplifiedInputReferences = '';
  try {
    if (inputText && typeof splitReferencesFromBody === 'function') simplifiedInputReferences = String((splitReferencesFromBody(inputText) || {}).references || '');
  } catch (_) {}
  var adaptedCitationAudit = generatedContent && generatedContent.config && generatedContent.config.citationAudit;
  var simplifiedReferences = resolveSimplifiedReferences(simplifiedDisplayBody, simplifiedContentParts.references, simplifiedInputReferences, adaptedCitationAudit);
  simplifiedContentParts.references = simplifiedReferences;
  var simplifiedReadAloudText = protectedOriginal ? simplifiedDisplayBody : simplifiedDisplayBody.trim();
  var ttsPrepState_state = React.useState({
    busy: false,
    done: 0,
    total: 0
  });
  var ttsPrepState = ttsPrepState_state[0];
  var setTtsPrepState = ttsPrepState_state[1];
  var ttsPrepNoticeState = React.useState('');
  var ttsPrepNotice = ttsPrepNoticeState[0],
    setTtsPrepNotice = ttsPrepNoticeState[1];
  var ttsPrepRequestRef = React.useRef(null);
  var ttsPrepContext = JSON.stringify([generatedContent && generatedContent.id, simplifiedReadAloudText, selectedVoice, leveledTextLanguage]);
  var ttsPrepContextRef = React.useRef(ttsPrepContext);
  ttsPrepContextRef.current = ttsPrepContext;
  React.useEffect(function () {
    setTtsPrepNotice('');
    setTtsPrepState({
      busy: false,
      done: 0,
      total: 0
    });
    return function () {
      var request = ttsPrepRequestRef.current;
      ttsPrepRequestRef.current = null;
      if (request && request.controller) request.controller.abort();
    };
  }, [ttsPrepContext]);
  var ownsTtsPreparation = function (request) {
    return ttsPrepRequestRef.current === request && ttsPrepContextRef.current === request.context;
  };
  var saveTtsAsPlayed_state = React.useState(function () {
    // Default ON (2026-07-09): capture-as-you-play costs no extra synthesis;
    // '0' is the explicit per-device opt-out via the checkbox below.
    try {
      return localStorage.getItem('allo_save_karaoke_audio') !== '0';
    } catch (_) {
      return true;
    }
  });
  var saveTtsAsPlayed = saveTtsAsPlayed_state[0];
  var setSaveTtsAsPlayed = saveTtsAsPlayed_state[1];
  // "Copy diagnostics" for the IN-VIEW read-aloud (playSequence path): the
  // karaoke overlay has its own button, but leveled-text playback happens
  // right here — surface the shared window.__alloTtsTrace ring where the
  // teacher is actually looking when audio gets stuck.
  var ttsDiagCopied_state = React.useState(false);
  var ttsDiagCopied = ttsDiagCopied_state[0];
  var setTtsDiagCopied = ttsDiagCopied_state[1];
  var _fallbackCopyTtsDiag = function (text) {
    try {
      var scratch = document.createElement('textarea');
      scratch.setAttribute('aria-label', 'Temporary field for copying read-aloud diagnostics');
      scratch.value = text;
      scratch.setAttribute('readonly', '');
      scratch.style.position = 'fixed';
      scratch.style.opacity = '0';
      document.body.appendChild(scratch);
      scratch.select();
      var ok = document.execCommand('copy');
      scratch.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };
  var copyTtsDiagnostics = function () {
    var payload;
    try {
      payload = JSON.stringify({
        at: new Date().toISOString(),
        surface: 'leveled-text',
        userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').substring(0, 120) : '',
        flags: {
          geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
          geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
          kokoroPresent: !!window._kokoroTTS,
          kokoroReady: !!(window._kokoroTTS && window._kokoroTTS.ready),
          sharedResolver: typeof window.__alloResolveReadAloudAudio === 'function'
        },
        lastRoute: window.__ttsLastRoute || null,
        trace: (window.__alloTtsTrace || []).slice(-120)
      }, null, 2);
    } catch (e) {
      payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e);
    }
    var done = function (ok) {
      if (!ok) return;
      setTtsDiagCopied(true);
      setTimeout(function () {
        setTtsDiagCopied(false);
      }, 2000);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () {
          done(true);
        }, function () {
          done(_fallbackCopyTtsDiag(payload));
        });
        return;
      }
    } catch (e) {}
    done(_fallbackCopyTtsDiag(payload));
  };
  var savingAudioKeys_state = React.useState({});
  var savingAudioKeys = savingAudioKeys_state[0];
  var setSavingAudioKeys = savingAudioKeys_state[1];
  var captureAudioErrors_state = React.useState({});
  var captureAudioErrors = captureAudioErrors_state[0];
  var setCaptureAudioErrors = captureAudioErrors_state[1];
  var regenAudioKey_state = React.useState(null);
  var editAudioPlaybackErrors_state = React.useState({});
  var editAudioPlaybackErrors = editAudioPlaybackErrors_state[0];
  var setEditAudioPlaybackErrors = editAudioPlaybackErrors_state[1];
  var regenAudioKey = regenAudioKey_state[0];
  var setRegenAudioKey = regenAudioKey_state[1];
  var setAudioStatusTick = React.useState(0)[1];
  var editAudioOpen_state = React.useState(false);
  var editAudioOpen = editAudioOpen_state[0];
  var setEditAudioOpen = editAudioOpen_state[1];
  var editAudioPlayingKey_state = React.useState(null);
  var editAudioPlayingKey = editAudioPlayingKey_state[0];
  var setEditAudioPlayingKey = editAudioPlayingKey_state[1];
  var editAudioLoadingKey_state = React.useState(null);
  var editAudioLoadingKey = editAudioLoadingKey_state[0];
  var setEditAudioLoadingKey = editAudioLoadingKey_state[1];
  var editAudioMicRequestKey_state = React.useState(null);
  var editAudioMicRequestKey = editAudioMicRequestKey_state[0];
  var setEditAudioMicRequestKey = editAudioMicRequestKey_state[1];
  var editAudioRecordingKey_state = React.useState(null);
  var editAudioRecordingKey = editAudioRecordingKey_state[0];
  var setEditAudioRecordingKey = editAudioRecordingKey_state[1];
  var editAudioRecordingSaveKey_state = React.useState(null);
  var editAudioRecordingSaveKey = editAudioRecordingSaveKey_state[0];
  var setEditAudioRecordingSaveKey = editAudioRecordingSaveKey_state[1];
  var removeAudioKey_state = React.useState(null);
  var removeAudioKey = removeAudioKey_state[0];
  var setRemoveAudioKey = removeAudioKey_state[1];
  var editAudioNotice_state = React.useState('');
  var editAudioNotice = editAudioNotice_state[0];
  var setEditAudioNotice = editAudioNotice_state[1];
  var editAudioPlayerRef = React.useRef(null);
  var editAudioPlayTokenRef = React.useRef(0);
  var editAudioRecordTokenRef = React.useRef(0);
  var editAudioMediaRecorderRef = React.useRef(null);
  var editAudioMediaStreamRef = React.useRef(null);
  var editAudioChunksRef = React.useRef([]);
  var editAudioRecordingTimerRef = React.useRef(null);
  var editAudioRecordingStartedAtRef = React.useRef(0);
  var EDIT_AUDIO_MAX_RECORDING_MS = 120000;
  var immersiveDialogRef = React.useRef(null);
  var [immersiveToolbarBottom, setImmersiveToolbarBottom] = React.useState(0);
  React.useEffect(function () {
    if (!isImmersiveReaderActive || !immersiveSettings?.lineFocus) return;
    var toolbar = immersiveDialogRef.current?.querySelector("[data-immersive-toolbar]");
    var update = function () {
      var bottom = toolbar?.getBoundingClientRect().bottom || 0;
      setImmersiveToolbarBottom(bottom);
      setImmersiveRulerY(previous => Math.max(previous, bottom + immersiveSettings.textSize * 2.5));
    };
    update();
    var observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (toolbar) observer?.observe(toolbar);
    window.addEventListener("resize", update);
    return function () {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isImmersiveReaderActive, immersiveSettings?.lineFocus, immersiveSettings?.textSize, setImmersiveRulerY]);
  var phonicsDialogRef = React.useRef(null);
  var phonicsCloseRef = React.useRef(null);
  var definitionDialogRef = React.useRef(null);
  var definitionCloseRef = React.useRef(null);
  var revisionDialogRef = React.useRef(null);
  var revisionCloseRef = React.useRef(null);
  var stopEditAudioPlayback = function () {
    editAudioPlayTokenRef.current += 1;
    try {
      if (editAudioPlayerRef.current) {
        editAudioPlayerRef.current.onended = null;
        editAudioPlayerRef.current.onerror = null;
        editAudioPlayerRef.current.pause();
      }
    } catch (_) {}
    editAudioPlayerRef.current = null;
    setEditAudioPlayingKey(null);
    setEditAudioLoadingKey(null);
  };
  var getReadAloudAudioKey = function (sentence, identityOptions) {
    var baseKey = '';
    try {
      var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
      if (KS && typeof KS.keyFor === 'function') baseKey = KS.keyFor(sentence);
    } catch (_) {}
    if (!baseKey) baseKey = String(sentence || '').toLowerCase().replace(/\s+/g, ' ').trim();
    var occurrence = identityOptions && Number.isInteger(Number(identityOptions.occurrence)) ? Number(identityOptions.occurrence) : 0;
    return baseKey ? baseKey + '\u241f' + occurrence : '';
  };
  var updateEditAudioPlaybackIssue = function (sentence, issue, identityOptions) {
    var audioKey = getReadAloudAudioKey(sentence, identityOptions);
    if (!audioKey) return;
    setEditAudioPlaybackErrors(function (prev) {
      var next = Object.assign({}, prev);
      if (issue) next[audioKey] = issue;else delete next[audioKey];
      return next;
    });
  };
  var reportEditAudioPlaybackFailure = function (sentence, sentenceNumber, error, identityOptions) {
    if (error && error.name === 'NotAllowedError') {
      setEditAudioNotice(viewText('simplified.audio_audio_playback_was_blocked_press_play', 'Audio playback was blocked. Press Play again.'));
      return;
    }
    updateEditAudioPlaybackIssue(sentence, {
      code: error && error.name ? error.name : 'playback-failed',
      reason: 'The saved audio could not be decoded or loaded.'
    }, identityOptions);
    setEditAudioNotice('Saved audio for sentence ' + sentenceNumber + ' could not be played. Rebuild or replace it.');
  };
  var setSaveTtsAsPlayedEnabled = function (value) {
    var next = !!value;
    setSaveTtsAsPlayed(next);
    try {
      localStorage.setItem('allo_save_karaoke_audio', next ? '1' : '0');
    } catch (_) {}
  };
  React.useEffect(function () {
    if (typeof window === 'undefined') return;
    var onAudioUpdate = function () {
      setAudioStatusTick(function (n) {
        return n + 1;
      });
    };
    var onAudioCapture = function (event) {
      var detail = event && event.detail ? event.detail : {};
      if (generatedContent && generatedContent.id && detail.resourceId && detail.resourceId !== generatedContent.id) return;
      var key = getReadAloudAudioKey(detail.sentence, detail);
      if (!key) return;
      if (detail.status === 'saving') {
        setSavingAudioKeys(function (prev) {
          return Object.assign({}, prev, {
            [key]: true
          });
        });
        setCaptureAudioErrors(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      } else {
        setSavingAudioKeys(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        setCaptureAudioErrors(function (prev) {
          var next = Object.assign({}, prev);
          if (detail.status === 'error' || detail.status === 'limit') {
            next[key] = {
              status: detail.status,
              code: detail.code || 'capture-failed',
              reason: detail.reason || 'Played TTS could not be saved.'
            };
          } else {
            delete next[key];
          }
          return next;
        });
        if (detail.status === 'error' || detail.status === 'limit') {
          setEditAudioNotice(detail.reason || 'Played TTS could not be saved. Generate that sentence again to retry.');
        } else {
          updateEditAudioPlaybackIssue(detail.sentence, null, detail);
        }
        setAudioStatusTick(function (n) {
          return n + 1;
        });
      }
    };
    window.addEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
    window.addEventListener('alloflow:karaoke-audio-capture', onAudioCapture);
    return function () {
      window.removeEventListener('alloflow:karaoke-audio-updated', onAudioUpdate);
      window.removeEventListener('alloflow:karaoke-audio-capture', onAudioCapture);
    };
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    setSavingAudioKeys({});
    setCaptureAudioErrors({});
    setEditAudioPlaybackErrors({});
  }, [generatedContent && generatedContent.id]);
  React.useEffect(function () {
    if (isEditingLeveledText) return;
    setEditAudioOpen(false);
    stopEditAudioPlayback();
    editAudioRecordTokenRef.current += 1;
    var recorder = editAudioMediaRecorderRef.current;
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    } catch (_) {}
  }, [isEditingLeveledText]);
  React.useEffect(function () {
    setEditAudioOpen(false);
    stopEditAudioPlayback();
    setEditAudioMicRequestKey(null);
    setEditAudioRecordingKey(null);
    setEditAudioRecordingSaveKey(null);
    setRemoveAudioKey(null);
    setEditAudioNotice('');
    return function () {
      editAudioPlayTokenRef.current += 1;
      editAudioRecordTokenRef.current += 1;
      try {
        if (editAudioPlayerRef.current) {
          editAudioPlayerRef.current.onended = null;
          editAudioPlayerRef.current.onerror = null;
          editAudioPlayerRef.current.pause();
        }
      } catch (_) {}
      editAudioPlayerRef.current = null;
      if (editAudioRecordingTimerRef.current) clearTimeout(editAudioRecordingTimerRef.current);
      editAudioRecordingTimerRef.current = null;
      var recorder = editAudioMediaRecorderRef.current;
      try {
        if (recorder && recorder.state !== 'inactive') {
          recorder.onstop = null;
          recorder.stop();
        }
      } catch (_) {}
      editAudioMediaRecorderRef.current = null;
      var stream = editAudioMediaStreamRef.current;
      try {
        if (stream) stream.getTracks().forEach(function (track) {
          track.stop();
        });
      } catch (_) {}
      editAudioMediaStreamRef.current = null;
      editAudioChunksRef.current = [];
    };
  }, [generatedContent && generatedContent.id]);
  var cleanSentenceForAudio = function (sentence) {
    // Must mirror playSequence's textToSpeak cleaning (phase_k) — the store
    // key is derived from the cleaned sentence on BOTH sides, so a rule
    // present in one place but not the other orphans that sentence's audio.
    // Delegate to THE shared sanitizer when the phase_k module is loaded
    // (2026-07-17) so the two can never drift; the inline chain below is
    // the standalone fallback and must stay rule-identical to it.
    try {
      var _pk = window.AlloModules && window.AlloModules.PhaseKHelpers;
      if (_pk && typeof _pk.toSpokenText === 'function') return _pk.toSpokenText(sentence);
    } catch (_) {}
    return String(sentence || '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '').replace(/\[Source\s+\d+\]/gi, '').replace(/\[\d+\]/g, '').replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/__|_/g, '').replace(/~~/g, '').replace(/`/g, '').replace(/^>\s?/gm, '').replace(/^[-*+]\s/gm, '').replace(/^\d+\.\s/gm, '').replace(/\s+/g, ' ').trim();
  };
  var getReadAloudStore = function () {
    try {
      return window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
    } catch (_) {
      return null;
    }
  };
  var getStoredReadAloudAudioUrl = function (sentence, identityOptions) {
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') {
        var inspection = sharedInspect(sentence, 'reference', identityOptions);
        if (inspection && inspection.storedUrl) return inspection.storedUrl;
        if (inspection && inspection.status === 'ready' && inspection.url) return inspection.url;
      }
    } catch (_) {}
    var st = getReadAloudStore();
    try {
      return st && typeof st.get === 'function' ? st.get(sentence, identityOptions || {}) : null;
    } catch (_) {
      return null;
    }
  };
  // The host can refresh callTTS while modules finish loading. Keep the
  // resolver identity tied only to the actual voice profile so capture-status
  // renders do not repeatedly invalidate karaoke's warm cache.
  var karaokeCallTTSRef = React.useRef(callTTS);
  karaokeCallTTSRef.current = callTTS;
  var getKaraokeAudioUrl = React.useCallback(function (sentenceText, requestOptions, languageOverride) {
    var voice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    var speed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var language = languageOverride || leveledTextLanguage || 'English';
    var options = Object.assign({
      language: language,
      maxRetries: 1,
      priority: 'interactive'
    }, requestOptions || {});
    options.language = language;
    // Snapshot the synthesis profile with the request. The shared service uses
    // it for compatibility and provider resolution, so a settings change
    // mid-request cannot relabel the voice the learner actually heard.
    options.profile = Object.assign({}, options.profile || {}, {
      voice: voice,
      speed: speed,
      synthesisRate: speed,
      language: language,
      voiceResolverVersion: 2
    });
    try {
      var sharedResolver = typeof window !== 'undefined' && window.__alloResolveReadAloudAudio;
      if (typeof sharedResolver === 'function') {
        return Promise.resolve(sharedResolver(sentenceText, options)).catch(function () {
          return null;
        });
      }
    } catch (_) {}
    // Direct store/callTTS compatibility path while the shared host module loads.
    try {
      var st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
      if (st) {
        // Stored-clip compatibility guard (2026-07-17): this resolver used
        // to return st.get() blind, bypassing the voice guard the main
        // playSequence path applies — so an older Puck AI clip kept playing
        // after the teacher selected Kore. The store's shared getCompatible
        // enforces voice/speed/language for AI takes; human recordings
        // remain voice-independent and always play.
        if (typeof st.getCompatible === 'function') {
          var compatibleUrl = st.getCompatible(sentenceText, {
            voice: voice,
            speed: speed,
            language: language
          });
          if (compatibleUrl) return Promise.resolve(compatibleUrl);
        } else {
          var storedUrl = st.get(sentenceText);
          if (storedUrl) return Promise.resolve(storedUrl);
        }
      }
    } catch (_) {}
    var resolver = karaokeCallTTSRef.current;
    if (typeof resolver !== 'function') return Promise.resolve(null);
    return Promise.resolve(resolver(sentenceText, voice, speed, options, language)).catch(function () {
      return null;
    });
  }, [selectedVoice, voiceSpeed, leveledTextLanguage]);
  var getComparisonKaraokeAudioUrl = React.useCallback(function (sentence, options) {
    var occurrence = options && options.occurrence || 0;
    var entry = comparisonKaraoke?.entries.find(item => item.text === sentence && item.occurrence === occurrence);
    return getKaraokeAudioUrl(sentence, options, entry?.language || comparisonKaraoke?.language);
  }, [getKaraokeAudioUrl, comparisonKaraoke]);
  var getReadAloudAudioProvenance = function (sentence, identityOptions) {
    var inspection = null;
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') inspection = sharedInspect(sentence, 'reference', identityOptions);
    } catch (_) {}
    var st = getReadAloudStore();
    var source = inspection && inspection.source != null ? inspection.source : null;
    var metadata = inspection && inspection.metadata ? inspection.metadata : null;
    if (!inspection) {
      try {
        if (st && typeof st.sourceOf === 'function') source = st.sourceOf(sentence, identityOptions || {});
        if (st && typeof st.metadataOf === 'function') metadata = st.metadataOf(sentence, identityOptions || {});
      } catch (_) {}
    }
    if (source === 'human-teacher') return {
      source: source,
      label: simplifiedTeacherRecordingLabel,
      metadata: metadata,
      stale: false
    };
    if (source === 'human-student') return {
      source: source,
      label: simplifiedStudentRecordingLabel,
      metadata: metadata,
      stale: false
    };
    if (source && String(source).indexOf('human') === 0) return {
      source: source,
      label: simplifiedHumanRecordingLabel,
      metadata: metadata,
      stale: false
    };
    var currentVoice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    var currentSpeed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var currentLanguage = identityOptions && identityOptions.language ? identityOptions.language : leveledTextLanguage || 'English';
    var stale = inspection ? inspection.status === 'stale' : !metadata || Number(metadata.voiceResolverVersion) !== 2 || !!(metadata.voice && String(metadata.voice).toLowerCase() !== String(currentVoice).toLowerCase() || metadata.speed && Math.abs(Number(metadata.speed) - currentSpeed) > 0.001 || metadata.language && String(metadata.language).toLowerCase() !== String(currentLanguage).toLowerCase());
    var details = ['AI voice'];
    if (metadata && metadata.voice) details.push(metadata.voice);
    if (metadata && metadata.speed) details.push(Number(metadata.speed) + '×');
    if (metadata && metadata.language) details.push(metadata.language);
    return {
      source: source || 'ai',
      label: details.join(' · '),
      metadata: metadata,
      stale: stale
    };
  };
  var hasStoredReadAloudAudio = function (sentence, identityOptions) {
    try {
      var sharedInspect = typeof window !== 'undefined' && window.__alloInspectReadAloudAudio;
      if (typeof sharedInspect === 'function') {
        var inspection = sharedInspect(sentence, 'reference', identityOptions);
        if (inspection && inspection.status) return inspection.status === 'ready' || inspection.status === 'stale';
      }
    } catch (_) {}
    var st = getReadAloudStore();
    try {
      return !!(st && st.has(sentence, identityOptions || {}));
    } catch (_) {
      return false;
    }
  };
  var getReadAloudIdentityOptions = function (entry) {
    var language = entry && entry.language ? entry.language : leveledTextLanguage || 'English';
    var speed = typeof voiceSpeed === 'number' && voiceSpeed > 0 ? voiceSpeed : 1;
    var voice = selectedVoice || typeof window !== 'undefined' && window.__alloSelectedVoice || 'Kore';
    return {
      occurrence: entry && Number.isInteger(Number(entry.occurrence)) ? Number(entry.occurrence) : 0,
      identity: entry && entry.identity ? entry.identity : null,
      language: language,
      profile: {
        voice: voice,
        speed: speed,
        synthesisRate: speed,
        language: language,
        voiceResolverVersion: 2
      }
    };
  };
  var getReadAloudAudioSummary = function (sentences) {
    var list = Array.isArray(sentences) ? sentences : [];
    var entries = list.map(function (item, index) {
      return item && typeof item === 'object' ? item : {
        text: String(item || ''),
        occurrence: 0,
        identity: 'legacy:' + index
      };
    });
    var sharedSummary = null;
    try {
      var summaryResolver = typeof window !== 'undefined' && window.__alloGetReadAloudAudioSummary;
      if (typeof summaryResolver === 'function') {
        sharedSummary = summaryResolver(entries.map(function (entry) {
          return entry.text;
        }), 'reference', {
          entries: entries
        });
      }
    } catch (_) {}
    var saved = sharedSummary ? Number(sharedSummary.ready || 0) + Number(sharedSummary.stale || 0) : entries.reduce(function (n, entry) {
      return n + (hasStoredReadAloudAudio(entry.text, getReadAloudIdentityOptions(entry)) ? 1 : 0);
    }, 0);
    var bytes = sharedSummary ? Number(sharedSummary.estimatedBytes || 0) : 0;
    var maxBytes = 0;
    try {
      var st = getReadAloudStore();
      if (!sharedSummary && st && typeof st.estimateBytes === 'function') bytes = st.estimateBytes();
      if (st && typeof st.limits === 'function') maxBytes = st.limits().maxBytes || 0;
    } catch (_) {}
    return {
      saved: saved,
      total: entries.length,
      bytes: bytes,
      maxBytes: maxBytes
    };
  };
  var getReadAloudSentenceEntriesForText = function (rawText, sourceLanguage) {
    var text = typeof rawText === 'string' ? rawText : String(rawText || '');
    var isTableText = function (p) {
      return p.trim().startsWith('|') || p.indexOf('\n|') !== -1;
    };
    var splitForReadAloud = function (part) {
      try {
        var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
        if (KS && typeof KS.splitSentences === 'function') return KS.splitSentences(part);
      } catch (_) {}
      return splitTextToSentences(part);
    };
    var splitBlock = function (block) {
      return String(block || '').split(/\n{2,}/).flatMap(function (p) {
        return isTableText(p) ? [] : splitForReadAloud(p);
      });
    };
    var parts = getSideBySideContent(text);
    var sourceList = [];
    var targetList = [];
    if (parts) {
      sourceList = parts.source.flatMap(function (p) {
        return isTableText(p) ? [] : splitForReadAloud(p);
      });
      targetList = parts.target.flatMap(function (p) {
        return isTableText(p) ? [] : splitForReadAloud(p);
      });
    } else {
      var marker = '--- ENGLISH TRANSLATION ---';
      var markerIndex = text.indexOf(marker);
      if (markerIndex >= 0) {
        sourceList = splitBlock(text.slice(0, markerIndex));
        targetList = splitBlock(text.slice(markerIndex + marker.length));
      } else {
        sourceList = splitBlock(text);
      }
    }
    var counts = new Map();
    var makeEntries = function (list, language, scope) {
      return list.map(function (sentence, index) {
        var cleaned = cleanSentenceForAudio(sentence);
        if (!cleaned || !cleaned.trim()) return null;
        // Match Phase K and the shared service exactly: occurrence is scoped
        // to identical spoken text. Case-folding here made distinct spoken
        // sentences consume each other's duplicate slot.
        var countKey = cleaned;
        var occurrence = counts.get(countKey) || 0;
        counts.set(countKey, occurrence + 1);
        return {
          text: cleaned,
          language: language || 'English',
          occurrence: occurrence,
          identity: scope + ':' + index + ':' + occurrence
        };
      }).filter(Boolean);
    };
    return makeEntries(sourceList, sourceLanguage || leveledTextLanguage || 'English', 'source').concat(makeEntries(targetList, 'English', 'target'));
  };
  // The sentences Immersive highlights and the chunk reader counts: the list
  // playback speaks (phase_k handleSpeak), with every table paragraph skipped.
  // Computed once per text: the read-along sweep re-renders every animation frame.
  var immersiveSentences = React.useMemo(function () {
    if (!isImmersiveReaderActive) return [];
    var isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    var sideBySide = getSideBySideContent(simplifiedReadAloudText);
    var paragraphs = sideBySide ? [...(sideBySide.source || []), ...(sideBySide.target || [])] : simplifiedReadAloudText.split(/\n{2,}/);
    return paragraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p));
  }, [isImmersiveReaderActive, simplifiedReadAloudText]);
  var immersiveSentenceOfWord = React.useMemo(function () {
    return isImmersiveReaderActive && Array.isArray(generatedContent?.immersiveData) ? alignImmersiveWords(generatedContent.immersiveData, immersiveSentences, cleanSentenceForAudio) : [];
  }, [isImmersiveReaderActive, generatedContent?.immersiveData, immersiveSentences]);
  var getReadAloudSentencesForText = function (rawText) {
    return getReadAloudSentenceEntriesForText(rawText).map(function (entry) {
      return entry.text;
    });
  };
  var karaokeReaderSentences = React.useMemo(function () {
    return getReadAloudSentencesForText(simplifiedReadAloudText);
  }, [generatedContent && generatedContent.data]);
  // Announcing every sentence again, in English, talked over the voice that
  // was reading it. Say only that read-aloud started.
  var activeReadAloudStatus = React.useMemo(function () {
    if (!isPlaying || playingContentId && playingContentId !== 'simplified-main') return '';
    var label = t('simplified.read_aloud_status');
    return label && label !== 'simplified.read_aloud_status' ? label : 'Reading aloud';
  }, [isPlaying, playingContentId]);
  var handlePrepareReadAloudAudio = async function () {
    if (ttsPrepRequestRef.current) return;
    if (typeof window.__alloPrepareReadAloud !== 'function') {
      setTtsPrepNotice(viewText('simplified.audio_audio_tools_are_still_loading_please', 'Audio tools are still loading. Please try again.'));
      return;
    }
    var entries = getReadAloudSentenceEntriesForText(simplifiedReadAloudText);
    var sentences = entries.map(function (entry) {
      return entry.text;
    });
    if (!sentences.length) return;
    // Note: prep saves every sentence regardless of the capture toggle, and
    // capture now defaults ON — no longer force-enable it here, so a
    // teacher's explicit opt-out survives pressing Save TTS.
    var request = {
      context: ttsPrepContext,
      controller: typeof AbortController === 'function' ? new AbortController() : null
    };
    ttsPrepRequestRef.current = request;
    setTtsPrepNotice('');
    setTtsPrepState({
      busy: true,
      done: 0,
      total: sentences.length
    });
    try {
      var result = await window.__alloPrepareReadAloud(sentences, function (done, total) {
        if (ownsTtsPreparation(request)) setTtsPrepState({
          busy: true,
          done: done,
          total: total || sentences.length
        });
      }, {
        entries: entries,
        signal: request.controller && request.controller.signal
      });
      if (!ownsTtsPreparation(request)) return;
      if (result && result.remaining) {
        setTtsPrepNotice(result.failure && result.failure.reason || result.remaining + ' sentence audio clips remain. Run Save TTS again to retry only missing clips.');
      } else if (result && result.ok) {
        setTtsPrepNotice(viewText('simplified.audio_read_aloud_audio_is_saved_for', 'Read-aloud audio is saved for all sentences.'));
      }
    } catch (_) {
      if (ownsTtsPreparation(request)) setTtsPrepNotice(request.controller && request.controller.signal.aborted ? 'Audio saving stopped. Save TTS again to finish any missing clips.' : 'Audio could not be saved. Please try again.');
    } finally {
      if (ownsTtsPreparation(request)) {
        ttsPrepRequestRef.current = null;
        setTtsPrepState({
          busy: false,
          done: 0,
          total: 0
        });
      }
    }
  };
  var handleRegenerateReadAloudSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    if (!sentence || regenAudioKey) return;
    if (typeof window.__alloRegenerateSentenceAudio !== 'function') {
      setEditAudioNotice(viewText('simplified.audio_sentence_audio_tools_are_still_loading', 'Sentence audio tools are still loading. Please try again.'));
      return;
    }
    var wasSaved = hasStoredReadAloudAudio(sentence, identityOptions);
    if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
    setRegenAudioKey(key);
    setEditAudioNotice((wasSaved ? 'Regenerating' : 'Generating') + ' sentence ' + sentenceNumber + ' audio...');
    try {
      var url = await window.__alloRegenerateSentenceAudio(sentence, identityOptions || {});
      if (!url) throw new Error(viewText('simplified.audio_no_audio_was_returned', 'No audio was returned'));
      updateEditAudioPlaybackIssue(sentence, null, identityOptions);
      setAudioStatusTick(function (n) {
        return n + 1;
      });
      setEditAudioNotice((wasSaved ? 'Regenerated' : 'Generated') + ' audio for sentence ' + sentenceNumber + '.');
    } catch (_) {
      setEditAudioNotice('Could not generate audio for sentence ' + sentenceNumber + '. Please try again.');
    } finally {
      setRegenAudioKey(null);
    }
  };
  var handlePlayEditAudioSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    if (!sentence || editAudioLoadingKey) return;
    var current = editAudioPlayerRef.current;
    if (current && current._alloSentenceKey === key) {
      if (!current.paused) {
        try {
          current.pause();
        } catch (_) {}
        setEditAudioPlayingKey(null);
        setEditAudioNotice('Paused sentence ' + sentenceNumber + '.');
        return;
      }
      try {
        if (isFinite(current.duration) && current.currentTime >= current.duration) current.currentTime = 0;
        await current.play();
        updateEditAudioPlaybackIssue(sentence, null, identityOptions);
        setEditAudioPlayingKey(key);
        setEditAudioNotice('Playing sentence ' + sentenceNumber + '.');
      } catch (error) {
        reportEditAudioPlaybackFailure(sentence, sentenceNumber, error, identityOptions);
      }
      return;
    }
    if (!hasStoredReadAloudAudio(sentence, identityOptions)) {
      setEditAudioNotice('Generate or record audio for sentence ' + sentenceNumber + ' before playing it.');
      return;
    }
    stopEditAudioPlayback();
    var token = ++editAudioPlayTokenRef.current;
    setEditAudioLoadingKey(key);
    setEditAudioNotice('Loading sentence ' + sentenceNumber + ' audio...');
    try {
      var url = getStoredReadAloudAudioUrl(sentence, identityOptions);
      if (token !== editAudioPlayTokenRef.current) return;
      if (!url) throw new Error(viewText('simplified.audio_no_saved_audio_url', 'No saved audio URL'));
      var audio = new Audio(url);
      audio._alloSentenceKey = key;
      audio.preload = 'auto';
      // Preview the stored artifact exactly as students receive it.
      audio.playbackRate = 1;
      audio.onended = function () {
        if (editAudioPlayerRef.current === audio) {
          setEditAudioPlayingKey(null);
          setEditAudioNotice('Finished sentence ' + sentenceNumber + '.');
        }
      };
      audio.onerror = function () {
        if (editAudioPlayerRef.current === audio) {
          editAudioPlayerRef.current = null;
          setEditAudioPlayingKey(null);
          reportEditAudioPlaybackFailure(sentence, sentenceNumber, audio.error, identityOptions);
        }
      };
      editAudioPlayerRef.current = audio;
      await audio.play();
      if (token !== editAudioPlayTokenRef.current) {
        try {
          audio.pause();
        } catch (_) {}
        return;
      }
      updateEditAudioPlaybackIssue(sentence, null, identityOptions);
      setEditAudioPlayingKey(key);
      setEditAudioNotice('Playing sentence ' + sentenceNumber + '.');
    } catch (error) {
      if (token === editAudioPlayTokenRef.current) {
        editAudioPlayerRef.current = null;
        setEditAudioPlayingKey(null);
        reportEditAudioPlaybackFailure(sentence, sentenceNumber, error, identityOptions);
      }
    } finally {
      if (token === editAudioPlayTokenRef.current) setEditAudioLoadingKey(null);
    }
  };
  var releaseEditAudioStream = function () {
    if (editAudioRecordingTimerRef.current) clearTimeout(editAudioRecordingTimerRef.current);
    editAudioRecordingTimerRef.current = null;
    var stream = editAudioMediaStreamRef.current;
    try {
      if (stream) stream.getTracks().forEach(function (track) {
        track.stop();
      });
    } catch (_) {}
    editAudioMediaStreamRef.current = null;
  };
  var handleRecordEditAudioSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    var activeRecorder = editAudioMediaRecorderRef.current;
    if (activeRecorder && activeRecorder._alloSentenceKey === key && activeRecorder.state !== 'inactive') {
      try {
        activeRecorder.stop();
        setEditAudioNotice('Finishing the recording for sentence ' + sentenceNumber + '...');
      } catch (_) {}
      return;
    }
    if (!sentence || editAudioRecordingKey || editAudioMicRequestKey || editAudioRecordingSaveKey) return;
    if (typeof window.__alloStoreRecordedSentenceAudio !== 'function') {
      setEditAudioNotice(viewText('simplified.audio_recorded_audio_storage_is_still_loading', 'Recorded-audio storage is still loading. Please try again.'));
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof window.MediaRecorder === 'undefined') {
      setEditAudioNotice(viewText('simplified.audio_microphone_recording_is_not_supported_in', 'Microphone recording is not supported in this browser.'));
      return;
    }
    stopEditAudioPlayback();
    var requestToken = ++editAudioRecordTokenRef.current;
    setEditAudioMicRequestKey(key);
    setEditAudioNotice('Opening the microphone for sentence ' + sentenceNumber + '...');
    var stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      if (requestToken !== editAudioRecordTokenRef.current) {
        try {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        } catch (_) {}
        return;
      }
      editAudioMediaStreamRef.current = stream;
      var MediaRecorderCtor = window.MediaRecorder;
      var preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      var mimeType = '';
      if (typeof MediaRecorderCtor.isTypeSupported === 'function') {
        for (var typeIdx = 0; typeIdx < preferredTypes.length; typeIdx++) {
          if (MediaRecorderCtor.isTypeSupported(preferredTypes[typeIdx])) {
            mimeType = preferredTypes[typeIdx];
            break;
          }
        }
      }
      var recorder = mimeType ? new MediaRecorderCtor(stream, {
        mimeType: mimeType
      }) : new MediaRecorderCtor(stream);
      recorder._alloSentenceKey = key;
      editAudioChunksRef.current = [];
      recorder.ondataavailable = function (event) {
        if (event && event.data && event.data.size > 0) editAudioChunksRef.current.push(event.data);
      };
      recorder.onerror = function () {
        recorder._alloFailed = true;
        editAudioChunksRef.current = [];
        if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
        releaseEditAudioStream();
        setEditAudioMicRequestKey(null);
        setEditAudioRecordingKey(null);
        setEditAudioRecordingSaveKey(null);
        setEditAudioNotice('The microphone stopped unexpectedly. Please record sentence ' + sentenceNumber + ' again.');
      };
      recorder.onstop = async function () {
        var chunks = editAudioChunksRef.current.slice();
        editAudioChunksRef.current = [];
        if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
        releaseEditAudioStream();
        setEditAudioRecordingKey(null);
        var durationMs = Math.max(0, Date.now() - (recorder._alloStartedAt || editAudioRecordingStartedAtRef.current || Date.now()));
        if (recorder._alloFailed) return;
        if (!chunks.length) {
          setEditAudioNotice('No audio was captured for sentence ' + sentenceNumber + '.');
          return;
        }
        var recordedBlob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || 'audio/webm'
        });
        setEditAudioRecordingSaveKey(key);
        setEditAudioNotice('Saving the teacher recording for sentence ' + sentenceNumber + ' as MP3...');
        try {
          var saved = await window.__alloStoreRecordedSentenceAudio(sentence, recordedBlob, 'human-teacher', Object.assign({}, identityOptions || {}, {
            durationMs: durationMs
          }));
          if (saved === false) throw new Error(viewText('simplified.audio_recording_was_not_saved', 'Recording was not saved'));
          setAudioStatusTick(function (n) {
            return n + 1;
          });
          updateEditAudioPlaybackIssue(sentence, null, identityOptions);
          setEditAudioNotice('Teacher recording saved for sentence ' + sentenceNumber + '.');
        } catch (_) {
          setEditAudioNotice('Could not save the recording for sentence ' + sentenceNumber + '. Please try again.');
        } finally {
          setEditAudioRecordingSaveKey(null);
        }
      };
      editAudioMediaRecorderRef.current = recorder;
      recorder._alloFailed = false;
      recorder._alloStartedAt = Date.now();
      editAudioRecordingStartedAtRef.current = recorder._alloStartedAt;
      recorder.start(250);
      editAudioRecordingTimerRef.current = setTimeout(function () {
        if (editAudioMediaRecorderRef.current === recorder && recorder.state !== 'inactive') {
          setEditAudioNotice('The two-minute recording limit was reached. Finishing sentence ' + sentenceNumber + '...');
          try {
            recorder.stop();
          } catch (_) {
            recorder.onerror();
          }
        }
      }, EDIT_AUDIO_MAX_RECORDING_MS);
      setEditAudioMicRequestKey(null);
      setEditAudioRecordingKey(key);
      setEditAudioNotice('Recording sentence ' + sentenceNumber + '. Press Stop when finished.');
    } catch (_) {
      editAudioMediaRecorderRef.current = null;
      editAudioChunksRef.current = [];
      releaseEditAudioStream();
      if (stream) {
        try {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        } catch (_err) {}
      }
      if (requestToken === editAudioRecordTokenRef.current) {
        setEditAudioMicRequestKey(null);
        setEditAudioRecordingKey(null);
        setEditAudioNotice(viewText('simplified.audio_microphone_access_was_not_available_chec', 'Microphone access was not available. Check permission and try again.'));
      }
    }
  };
  var handleRemoveReadAloudSentence = async function (sentence, key, sentenceNumber, identityOptions) {
    if (!sentence || removeAudioKey) return;
    if (typeof window.__alloRemoveSentenceAudio !== 'function') {
      setEditAudioNotice(viewText('simplified.audio_sentence_audio_removal_is_still_loading', 'Sentence audio removal is still loading. Please try again.'));
      return;
    }
    if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
    setRemoveAudioKey(key);
    setEditAudioNotice('Removing saved audio for sentence ' + sentenceNumber + '...');
    try {
      var removed = await window.__alloRemoveSentenceAudio(sentence, identityOptions || {});
      if (removed === false) throw new Error(viewText('simplified.audio_audio_was_not_removed', 'Audio was not removed'));
      setAudioStatusTick(function (n) {
        return n + 1;
      });
      updateEditAudioPlaybackIssue(sentence, null, identityOptions);
      setEditAudioNotice('Saved audio removed from sentence ' + sentenceNumber + '.');
    } catch (_) {
      setEditAudioNotice('Could not remove the audio for sentence ' + sentenceNumber + '.');
    } finally {
      setRemoveAudioKey(null);
    }
  };
  var handleToggleEditAudioPanel = function () {
    var next = !editAudioOpen;
    if (!next) {
      stopEditAudioPlayback();
      editAudioRecordTokenRef.current += 1;
      setEditAudioMicRequestKey(null);
      var recorder = editAudioMediaRecorderRef.current;
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch (_) {}
    }
    setEditAudioOpen(next);
  };
  // One owned player for pronunciation and dictionary recordings. A request
  // token prevents delayed synthesis or play() completions reopening dismissed help.
  var helpAudioRef = React.useRef(null);
  var helpAudioTokenRef = React.useRef(0);
  var [helpAudioState, setHelpAudioState] = React.useState({
    key: null,
    status: 'idle'
  });
  var releaseHelpUrl = function (url) {
    if (typeof url === 'string' && url.startsWith('blob:') && !(typeof window.__alloTtsCacheOwnsUrl === 'function' && window.__alloTtsCacheOwnsUrl(url))) {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }
  };
  var stopHelpAudio = function (reset) {
    helpAudioTokenRef.current += 1;
    var current = helpAudioRef.current;
    helpAudioRef.current = null;
    if (current?.audio) {
      current.audio.onended = null;
      current.audio.onerror = null;
      current.audio.pause();
    }
    if (current?.ownedUrl) releaseHelpUrl(current.ownedUrl);
    if (reset !== false) setHelpAudioState({
      key: null,
      status: 'idle'
    });
  };
  var playHelpAudio = async function (key, recordingUrl, word, language) {
    if (helpAudioRef.current?.key === key) {
      stopHelpAudio();
      return;
    }
    stopHelpAudio();
    if (typeof stopPlayback === 'function') stopPlayback();
    var token = helpAudioTokenRef.current;
    var current = {
      key: key,
      audio: null,
      ownedUrl: null
    };
    helpAudioRef.current = current;
    setHelpAudioState({
      key: key,
      status: 'loading'
    });
    try {
      var url = recordingUrl || (await callTTS(word, selectedVoice, voiceSpeed || 1, 2, language || generatedContent?.config?.language || leveledTextLanguage || 'English'));
      if (token !== helpAudioTokenRef.current) {
        if (!recordingUrl) releaseHelpUrl(url);
        return;
      }
      if (!url) throw new Error(viewText('simplified.word_audio_no_pronunciation_audio', 'No pronunciation audio'));
      if (!recordingUrl) current.ownedUrl = url;
      var audio = new Audio(url);
      current.audio = audio;
      audio.playbackRate = voiceSpeed || 1;
      var fail = function () {
        if (token !== helpAudioTokenRef.current) return;
        stopHelpAudio(false);
        setHelpAudioState({
          key: key,
          status: 'error'
        });
      };
      audio.onended = function () {
        if (token === helpAudioTokenRef.current) stopHelpAudio();
      };
      audio.onerror = fail;
      await audio.play();
      if (token === helpAudioTokenRef.current) setHelpAudioState({
        key: key,
        status: 'playing'
      });
    } catch (_) {
      if (token === helpAudioTokenRef.current) {
        stopHelpAudio(false);
        setHelpAudioState({
          key: key,
          status: 'error'
        });
      }
    }
  };
  React.useEffect(function () {
    setHelpAudioState({
      key: null,
      status: 'idle'
    });
    return function () {
      stopHelpAudio(false);
    };
  }, [phonicsData?.word, definitionData?.word, generatedContent?.id, generatedContent?.data, interactionMode]);
  React.useEffect(function () {
    if (isPlaying && helpAudioRef.current) stopHelpAudio();
  }, [isPlaying, playingContentId]);
  var helpText = function (key, fallback) {
    var value = t(key);
    return value && value !== key ? value : fallback;
  };
  var renderHelpAudioButton = function (key, recordingUrl, word, language) {
    var current = helpAudioState.key === key;
    var active = current && (helpAudioState.status === 'loading' || helpAudioState.status === 'playing');
    var label = active ? helpText('simplified.word_audio_stop', 'Stop audio') : current && helpAudioState.status === 'error' ? helpText('simplified.word_audio_retry', 'Try audio again') : recordingUrl ? helpText('simplified.word_recording', 'Hear recording') : helpText('simplified.word_audio_listen', 'Hear word');
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      type: "button",
      "data-word-help-audio": key,
      "aria-label": label,
      onClick: () => playHelpAudio(key, recordingUrl, word, language),
      className: "min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, active ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 16,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 16,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, label));
  };
  var renderHelpAudioNotice = function (prefix) {
    if (!helpAudioState.key?.startsWith(prefix) || !['loading', 'error'].includes(helpAudioState.status)) return null;
    return /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "mb-3 text-sm text-slate-700"
    }, helpAudioState.status === 'loading' ? helpText('simplified.word_audio_loading', 'Preparing audio…') : helpText('simplified.word_audio_error', 'Audio could not play. Try again when you are ready.'));
  };
  // Read-aloud for the Define and Explain popups. Both go through the host's
  // handleSpeak, the same path the sentence reader, the immersive word
  // speaker and the glossary use, so voice, speed, provider fallback and
  // the global play state all match the rest of the app. Calling handleSpeak
  // again with the same content id while that id is playing stops it, so one
  // button serves as both play and stop.
  var SIMPLIFIED_DEFINE_AUDIO_ID = 'simplified-define-popup';
  var SIMPLIFIED_REVISION_AUDIO_ID = 'simplified-revision-popup';
  var simplifiedPopupReadAloudLabel = t('common.read_aloud') || 'Read this aloud';
  var simplifiedPopupStopReadingLabel = t('common.stop_reading') || 'Stop reading aloud';
  var simplifiedPopupListenLabel = t('common.listen') || 'Listen';
  var simplifiedPopupStopLabel = t('common.stop') || 'Stop';
  var simplifiedPopupSpokenText = function (parts) {
    return (Array.isArray(parts) ? parts : [parts]).map(function (part) {
      return String(part == null ? '' : part).replace(/\s+/g, ' ').trim();
    }).filter(Boolean).join('. ');
  };
  var renderSimplifiedPopupSpeaker = function (contentId, spokenText) {
    if (typeof handleSpeak !== 'function') return null;
    var text = simplifiedPopupSpokenText(spokenText);
    if (!text) return null;
    var active = !!isPlaying && playingContentId === contentId;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-simplified-popup-speaker": contentId,
      onClick: function () {
        stopHelpAudio();
        handleSpeak(text, contentId, 0);
      },
      "aria-label": active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel,
      title: active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel,
      className: `min-h-11 flex items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${active ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`
    }, active ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, active ? simplifiedPopupStopLabel : simplifiedPopupListenLabel));
  };
  // Closing a popup should not leave its audio running with nothing on
  // screen to stop it. The ref carries the live id into the effect cleanup.
  var simplifiedPlayingContentIdRef = React.useRef(null);
  simplifiedPlayingContentIdRef.current = playingContentId;
  var stopSimplifiedPopupAudio = function (contentId) {
    if (simplifiedPlayingContentIdRef.current === contentId && typeof stopPlayback === 'function') stopPlayback();
  };
  function containSimplifiedModalFocus(e, container, onEscape) {
    if (!e || !container) return;
    var nearestDialog = e.target && typeof e.target.closest === 'function' ? e.target.closest('[role="dialog"]') : null;
    if (nearestDialog && nearestDialog !== container) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof onEscape === 'function') onEscape(e);
      return;
    }
    if (e.key !== 'Tab' || typeof container.querySelectorAll !== 'function') return;
    var focusable = Array.prototype.slice.call(container.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])')).filter(function (el) {
      if (!el || el.tabIndex < 0 || el.matches(':disabled') || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      // Details summaries are keyboard controls too. Content of a collapsed
      // disclosure, or any visually hidden ancestor, must stay out of the loop.
      for (var parent = el; parent && parent !== container; parent = parent.parentElement) {
        var style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
        if (parent.tagName === 'DETAILS' && !parent.open) {
          var summary = Array.prototype.find.call(parent.children, function (child) {
            return child.tagName === 'SUMMARY';
          });
          if (!summary || el !== summary && !summary.contains(el)) return false;
        }
      }
      return true;
    });
    if (!focusable.length) {
      e.preventDefault();
      container.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!focusable.includes(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  }
  React.useEffect(function () {
    if (!isImmersiveReaderActive || !generatedContent?.immersiveData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      var closeButton = immersiveDialogRef.current && immersiveDialogRef.current.querySelector('button[aria-label]');
      if (closeButton) closeButton.focus();else if (immersiveDialogRef.current) immersiveDialogRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isImmersiveReaderActive]);
  React.useEffect(function () {
    if (!phonicsData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (phonicsCloseRef.current) phonicsCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!phonicsData]);
  React.useEffect(function () {
    if (!definitionData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (definitionCloseRef.current) definitionCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      stopSimplifiedPopupAudio(SIMPLIFIED_DEFINE_AUDIO_ID);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [!!definitionData]);
  React.useEffect(function () {
    if (!revisionData) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (revisionCloseRef.current) revisionCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      stopSimplifiedPopupAudio(SIMPLIFIED_REVISION_AUDIO_ID);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [!!revisionData]);
  var renderEditAudioSentenceTools = function () {
    if (!isTeacherMode || !isEditingLeveledText) return null;
    var sentences = getReadAloudSentenceEntriesForText(simplifiedReadAloudText);
    if (!sentences.length) return null;
    var summary = getReadAloudAudioSummary(sentences);
    var savingCount = Object.keys(savingAudioKeys || {}).length;
    var captureErrorCount = Object.keys(captureAudioErrors || {}).length;
    var panelId = 'allo-edit-audio-' + String(generatedContent && generatedContent.id || 'current').replace(/[^a-z0-9_-]/gi, '-');
    var anyRecordingWork = !!editAudioMicRequestKey || !!editAudioRecordingKey || !!editAudioRecordingSaveKey;
    return /*#__PURE__*/React.createElement("div", {
      className: "border-t border-orange-100 bg-orange-50/80"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleToggleEditAudioPanel,
      "aria-expanded": editAudioOpen,
      "aria-controls": panelId,
      "aria-label": `${simplifiedAudioEditLabel}. ${summary.saved}/${summary.total} ${simplifiedAudioSavedLabel.toLowerCase()}.`,
      className: "inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white text-orange-800 border border-orange-200 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 14
    }), /*#__PURE__*/React.createElement("span", null, simplifiedAudioEditLabel), /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 normal-case"
    }, summary.saved, "/", summary.total, " ", simplifiedAudioSavedLabel.toLowerCase(), summary.maxBytes ? ` · ${Math.round(summary.bytes / 104857.6) / 10}/${Math.round(summary.maxBytes / 104857.6) / 10} MB` : ''), editAudioOpen ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14
    }) : /*#__PURE__*/React.createElement(ChevronDown, {
      size: 14
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center sm:justify-end gap-2 flex-wrap"
    }, savingCount > 0 && /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-1"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin motion-reduce:animate-none"
    }), " ", simplifiedAudioSaveLabel, " ", savingCount), captureErrorCount > 0 && /*#__PURE__*/React.createElement("span", {
      role: "alert",
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-1"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 10
    }), " ", captureErrorCount, " ", simplifiedAudioErrorLabel), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: copyTtsDiagnostics,
      "aria-label": simplifiedAudioCopiedLabel,
      title: viewText('simplified.audio_copies_a_technical_trace_of_recent', 'Copies a technical trace of recent read-aloud attempts — paste it into a bug report if audio gets stuck.'),
      className: "inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-2 py-1 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    }, ttsDiagCopied ? '✓ ' + simplifiedAudioCopiedLabel : '🩺 ' + simplifiedAudioDiagnosticsLabel), /*#__PURE__*/React.createElement("label", {
      className: "inline-flex items-center gap-1.5 text-[11px] text-slate-700 font-semibold cursor-pointer"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: saveTtsAsPlayed,
      onChange: function (event) {
        setSaveTtsAsPlayedEnabled(event.target.checked);
      },
      className: "accent-orange-600",
      "aria-label": simplifiedAudioSaveLabel
    }), /*#__PURE__*/React.createElement("span", null, simplifiedAudioSaveLabel)))), editAudioOpen && /*#__PURE__*/React.createElement("div", {
      id: panelId,
      role: "region",
      "aria-label": simplifiedAudioEditLabel,
      className: "border-t border-orange-100 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2 mb-3 text-xs text-slate-600"
    }, /*#__PURE__*/React.createElement(Mic, {
      size: 14,
      className: "mt-0.5 shrink-0 text-orange-700"
    }), /*#__PURE__*/React.createElement("p", null, viewText('simplified.audio_preview_saved_audio_generate_a_new', 'Preview saved audio, generate a new AI voice, or record your own teacher narration for each sentence. Recordings replace that sentence only.'))), /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      "data-edit-audio-status": true,
      className: editAudioNotice ? 'mb-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800' : 'sr-only'
    }, editAudioNotice), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 max-h-[34rem] overflow-y-auto pr-1 custom-scrollbar"
    }, sentences.map(function (entry, i) {
      var sentence = entry.text;
      var identityOptions = getReadAloudIdentityOptions(entry);
      var key = 'simplified-' + i;
      var sentenceNumber = i + 1;
      var audioKey = getReadAloudAudioKey(sentence, identityOptions);
      var isSaving = !!savingAudioKeys[audioKey];
      var isSaved = hasStoredReadAloudAudio(sentence, identityOptions);
      var provenance = isSaved ? getReadAloudAudioProvenance(sentence, identityOptions) : {
        source: null,
        label: simplifiedAudioMissingLabel,
        stale: false
      };
      var captureIssue = captureAudioErrors[audioKey];
      var playbackIssue = editAudioPlaybackErrors[audioKey];
      var needsRebuild = !!(isSaved && (provenance.stale || playbackIssue));
      var isGenerating = regenAudioKey === key;
      var isLoading = editAudioLoadingKey === key;
      var isPlayingSentence = editAudioPlayingKey === key;
      var isMicRequest = editAudioMicRequestKey === key;
      var isRecording = editAudioRecordingKey === key;
      var isRecordingSave = editAudioRecordingSaveKey === key;
      var isRemoving = removeAudioKey === key;
      var statusLabel = isMicRequest ? simplifiedAudioEditLabel + ': ' + simplifiedAudioRecordLabel : isRecording ? simplifiedAudioRecordLabel : isRecordingSave ? simplifiedAudioSaveLabel : isGenerating ? isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel : isRemoving ? simplifiedAudioRemoveLabel : isSaving ? simplifiedAudioSaveLabel : captureIssue ? captureIssue.status === 'limit' ? simplifiedAudioStorageLimitLabel : simplifiedAudioErrorLabel : playbackIssue ? simplifiedAudioSavedLabel + ' · ' + simplifiedAudioErrorLabel : provenance.stale ? simplifiedAudioSavedLabel + ' · ' + simplifiedAudioSettingsChangedLabel : isSaved ? simplifiedAudioSavedLabel : simplifiedAudioMissingLabel;
      var statusClass = isRecording ? 'bg-red-50 text-red-700 border-red-200' : isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : captureIssue ? captureIssue.status === 'limit' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200' : playbackIssue ? 'bg-red-50 text-red-700 border-red-200' : provenance.stale ? 'bg-amber-50 text-amber-800 border-amber-200' : isSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200';
      var controlsBlocked = isSaving || isGenerating || isRemoving || ttsPrepState.busy;
      var recordDisabled = !isRecording && (anyRecordingWork || !!regenAudioKey || !!removeAudioKey || isSaving || ttsPrepState.busy);
      var actionClass = 'inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed';
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "rounded-xl border border-slate-200 bg-slate-50/70 p-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-800",
        "aria-hidden": "true"
      }, sentenceNumber), /*#__PURE__*/React.createElement("div", {
        className: "min-w-0 flex-1"
      }, /*#__PURE__*/React.createElement("p", {
        dir: "auto",
        className: "text-sm font-medium leading-relaxed text-slate-800"
      }, sentence), /*#__PURE__*/React.createElement("div", {
        role: "group",
        className: "mt-1.5 flex items-center gap-1.5 flex-wrap",
        "aria-label": `${simplifiedAudioEditLabel} ${sentenceNumber}: ${statusLabel}. ${provenance.label}.`
      }, /*#__PURE__*/React.createElement("span", {
        className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`
      }, isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 9,
        className: "animate-spin motion-reduce:animate-none"
      }) : isRecording ? /*#__PURE__*/React.createElement("span", {
        className: "h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none"
      }) : captureIssue || needsRebuild ? /*#__PURE__*/React.createElement(AlertCircle, {
        size: 9
      }) : isSaved ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 9
      }) : /*#__PURE__*/React.createElement(AlertCircle, {
        size: 9
      }), statusLabel), /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-semibold text-slate-500"
      }, provenance.label)))), /*#__PURE__*/React.createElement("div", {
        role: "group",
        "aria-label": `${simplifiedAudioEditLabel} ${sentenceNumber}`,
        className: "mt-2.5 flex items-center gap-1.5 flex-wrap"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handlePlayEditAudioSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: !isSaved || isLoading || controlsBlocked || anyRecordingWork || !!editAudioLoadingKey && !isLoading,
        "aria-pressed": isPlayingSentence,
        "aria-label": `${isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel} ${sentenceNumber}`,
        title: !isSaved ? simplifiedAudioGenerateLabel : isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel,
        className: `${actionClass} bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50`
      }, isLoading ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : isPlayingSentence ? /*#__PURE__*/React.createElement(Pause, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Play, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isLoading ? simplifiedAudioLoadingLabel : isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel)), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRegenerateReadAloudSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: !!regenAudioKey || isSaving || isRemoving || anyRecordingWork || ttsPrepState.busy,
        "aria-label": `${needsRebuild ? simplifiedAudioRegenerateLabel : isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel} ${sentenceNumber}`,
        title: isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel,
        className: `${actionClass} bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50`
      }, isGenerating ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isGenerating ? isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel : needsRebuild ? simplifiedAudioRegenerateLabel : isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel)), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRecordEditAudioSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: recordDisabled,
        "aria-pressed": isRecording,
        "aria-label": `${isRecording ? simplifiedAudioStopLabel : simplifiedAudioRecordLabel} ${sentenceNumber}`,
        title: isRecording ? simplifiedAudioStopLabel : simplifiedAudioRecordLabel,
        className: `${actionClass} ${isRecording ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50'}`
      }, isMicRequest || isRecordingSave ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : isRecording ? /*#__PURE__*/React.createElement(StopCircle, {
        size: 12
      }) : /*#__PURE__*/React.createElement(Mic, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isMicRequest ? simplifiedAudioRecordLabel : isRecording ? simplifiedAudioStopLabel : isRecordingSave ? simplifiedAudioSaveLabel : simplifiedAudioRecordLabel)), isSaved && /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          handleRemoveReadAloudSentence(sentence, key, sentenceNumber, identityOptions);
        },
        disabled: !!removeAudioKey || isSaving || !!regenAudioKey || anyRecordingWork || ttsPrepState.busy,
        "aria-label": `${simplifiedAudioRemoveLabel} ${sentenceNumber}`,
        className: `${actionClass} bg-white text-rose-700 border-rose-200 hover:bg-rose-50`
      }, isRemoving ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Trash2, {
        size: 12
      }), /*#__PURE__*/React.createElement("span", null, isRemoving ? simplifiedAudioRemoveLabel : simplifiedAudioRemoveLabel))));
    }))));
  };
  var instructionalTextProfile = getSimplifiedInstructionalText(generatedContent);
  var instructionalRole = instructionalTextProfile.role || 'unspecified';
  var replacementIsEducatorAuthorized = !!(instructionalTextProfile.replacementAuthorization && instructionalTextProfile.replacementAuthorization.authorized === true && instructionalTextProfile.replacementAuthorization.source === 'educator');
  var instructionalFormLabel = protectedOriginal ? verifiedOriginal ? 'Original with supports' : 'Saved source — preservation unverified' : instructionalTextProfile.form === 'original' ? 'Original text' : 'Adapted text';
  var studentRoleText = function (key, fallback) {
    var value = t(key);
    return value && value !== key ? value : fallback;
  };
  var instructionalStudentLabel = protectedOriginal ? studentRoleText('simplified.student_role_original', 'This is the original text.') : instructionalRole === 'primary' ? studentRoleText('simplified.student_role_main', 'This is your reading for this lesson.') : studentRoleText('simplified.student_role_companion', 'This is an easier version to help you read the original.');
  var instructionalRoleLabel = instructionalRole === 'primary' ? instructionalTextProfile.form === 'adapted' && !replacementIsEducatorAuthorized ? 'Main reading — needs review' : 'Main reading' : instructionalRole === 'supplemental' ? 'Supporting reading' : 'Not designated';
  var instructionalRoleTone = instructionalRole === 'supplemental' ? 'bg-blue-50 text-blue-900 border-blue-200' : instructionalRole === 'primary' && replacementIsEducatorAuthorized ? 'bg-violet-50 text-violet-900 border-violet-200' : instructionalRole === 'primary' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-amber-50 text-amber-900 border-amber-200';
  var isSupplementalSourceUnlinked = instructionalRole === 'supplemental' && !instructionalTextProfile.sourceArtifactId && !instructionalTextProfile.primaryArtifactId;
  var saveInstructionalRole = function (nextRole) {
    if (typeof props.onInstructionalRoleChange === 'function') {
      return props.onInstructionalRoleChange(generatedContent, nextRole, {
        authorizeReplacement: instructionalTextProfile.form === 'adapted' && nextRole === 'primary'
      });
    }
    var fullBase = findFullHistoryArtifact(history, generatedContent);
    // The open item wins for mutable display fields, while the history copy
    // supplies any metadata omitted by an older hydration path.
    fullBase = Object.assign({}, fullBase || {}, generatedContent || {});
    var updated = updateSimplifiedInstructionalRole(fullBase, nextRole);
    if (typeof setGeneratedContent === 'function') setGeneratedContent(updated);
    if (typeof setHistory === 'function') {
      setHistory(function (previousHistory) {
        return upsertFullHistoryArtifact(previousHistory, generatedContent, updated);
      });
    }
  };
  var instructionalRoleControl = generatedContent ? /*#__PURE__*/React.createElement(SimplifiedReadingRoleControl, {
    key: generatedContent.id || generatedContent.data,
    role: instructionalRole,
    roleLabel: instructionalRoleLabel,
    formLabel: instructionalFormLabel,
    studentLabel: instructionalStudentLabel,
    needsAuthorization: instructionalTextProfile.form === 'adapted' && !replacementIsEducatorAuthorized,
    isTeacherMode: isTeacherMode,
    disabled: isProcessing,
    onSave: saveInstructionalRole,
    onSelectSource: props.onSelectReadingSource && (!protectedOriginal || verifiedOriginal) ? () => props.onSelectReadingSource(generatedContent) : null,
    showCompanionNote: !protectedOriginal && instructionalRole !== 'primary',
    missingOriginal: !protectedOriginal && !capturedSource
  }) : null;
  var simplifiedComplexityDisplay = getSimplifiedComplexityDisplay(generatedContent, gradeLevel);
  var readingColumnState = React.useState(function () {
    try {
      var saved = Number(localStorage.getItem('alloflow_reading_width'));
      return [40, 56, 72].includes(saved) ? saved : 72;
    } catch (_) {
      return 72;
    }
  });
  var readingColumn = readingColumnState[0],
    setReadingColumn = readingColumnState[1];
  function updateReadingColumn(value) {
    var width = Number(value);
    if (![40, 56, 72].includes(width)) return;
    setReadingColumn(width);
    // Layout preference only: never store passage content or reading position.
    try {
      localStorage.setItem('alloflow_reading_width', String(width));
    } catch (_) {}
  }
  var readingStartRef = React.useRef(null);
  // Immersive Reader covers the passage, and its read-along sweep re-renders
  // this view every animation frame. The hidden passage is reused instead of
  // rebuilt (about 40 ms a frame for 300 sentences); it rebuilds on close.
  var hiddenPassageRef = React.useRef(null);
  // Display (Aa): Immersive Reader, reading theme and width in one panel, so fewer
  // controls sit above the text. It remembers whether it was left open.
  var [displayOpen, setDisplayOpenState] = React.useState(function () {
    try {
      return localStorage.getItem('alloflow_reader_display_open') === '1';
    } catch (_) {
      return false;
    }
  });
  var setDisplayOpen = function (open) {
    setDisplayOpenState(open);
    try {
      localStorage.setItem('alloflow_reader_display_open', open ? '1' : '0');
    } catch (_) {}
  };
  var displayToggleRef = React.useRef(null);
  var focusViewButtonRef = React.useRef(null);
  var wasFocusViewRef = React.useRef(!!isZenMode);
  React.useEffect(function () {
    // The global exit button unmounts on exit. Return keyboard focus to the
    // reader toggle only when that leaves focus on the document body.
    if (wasFocusViewRef.current && !isZenMode && document.activeElement === document.body) {
      focusViewButtonRef.current?.focus({
        preventScroll: true
      });
    }
    wasFocusViewRef.current = !!isZenMode;
  }, [isZenMode]);
  var [practiceOpen, setPracticeOpen] = React.useState(false);
  var priorReadingRef = React.useRef({
    id: generatedContent?.id,
    text: generatedContent?.data
  });
  React.useEffect(function () {
    var previous = priorReadingRef.current;
    priorReadingRef.current = {
      id: generatedContent?.id,
      text: generatedContent?.data
    };
    if (previous.id === generatedContent?.id && previous.text === generatedContent?.data) return;
    if (typeof stopPlayback === 'function') stopPlayback();
    if (typeof props.closeDefinition === 'function') props.closeDefinition();
    if (typeof props.closePhonics === 'function') props.closePhonics();
    if (typeof props.closeRevision === 'function') props.closeRevision();
    if (typeof setSelectionMenu === 'function') setSelectionMenu(null);
    if (typeof setFocusedParagraphIndex === 'function') setFocusedParagraphIndex(null);
  }, [generatedContent?.id, generatedContent?.data]);
  var selectionActionRef = React.useRef(null);
  var selectionDialogRef = React.useRef(null);
  React.useEffect(function () {
    if (!selectionMenu) return;
    var opener = document.activeElement;
    selectionDialogRef.current?.querySelector('button, input')?.focus();
    return function () {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [!!selectionMenu]);
  // Session-only reading bookmarks are scoped to an exact artifact and source.
  var readerSurfaceRef = React.useRef(null);
  var navigationRef = React.useRef({
    positions: new Map(),
    companions: [],
    pending: null
  });
  var [comparisonPreferences, setComparisonPreferences] = React.useState({});
  var [comparisonReturn, setComparisonReturn] = React.useState(null);
  var [linkPassages, setLinkPassages] = React.useState(false);
  var [linkedSection, setLinkedSection] = React.useState(0);
  var [relatedPassage, setRelatedPassage] = React.useState(null);
  var readingFingerprint = value => readingContract?.fingerprintSourceText ? readingContract.fingerprintSourceText(String(value || '')) : String(value || '');
  function readingScopeIdentity(item) {
    var snapshot = readingContract?.getSourceSnapshot?.(item);
    return JSON.stringify([readingContract?.getReadingSourceFamilyId?.(item), item?.unitId !== undefined ? item.unitId : item?.config?.unitId, snapshot?.sourceArtifactId, snapshot?.fingerprint, snapshot?.language, item?.config?.language, item?.instructionalText?.complexity?.language]);
  }
  var rememberedCompanion = protectedOriginal && navigationRef.current.companions.slice().reverse().map(id => (history || []).find(item => item.id === id)).find(item => item && findSimplifiedReadingCompanion([item], generatedContent, capturedSource));
  var companion = !protectedOriginal ? generatedContent : rememberedCompanion || findSimplifiedReadingCompanion(history, generatedContent, capturedSource);
  React.useEffect(function () {
    if (protectedOriginal || !generatedContent?.id || getSimplifiedInstructionalText(generatedContent).form !== 'adapted') return;
    var ids = navigationRef.current.companions.filter(id => id !== generatedContent.id);
    navigationRef.current.companions = ids.concat(generatedContent.id).slice(-30);
  }, [generatedContent?.id, protectedOriginal]);
  var comparisonPreferenceKey = JSON.stringify([companion?.id || generatedContent?.id, readingScopeIdentity(companion || generatedContent), readingFingerprint(companion?.data)]);
  var pairPreferences = comparisonPreferences[comparisonPreferenceKey] || {};
  var comparisonLanguage = pairPreferences.language || 'auto';
  var requestedComparisonSource = pairPreferences.source || 'linked';
  var selectedComparisonArtifact = isTeacherMode && (history || []).find(item => String(item.id) === requestedComparisonSource && item.id !== generatedContent?.id && ['analysis', 'simplified'].includes(item.type) && getArtifactReadingText(item));
  var comparisonSourceId = selectedComparisonArtifact ? requestedComparisonSource : 'linked';
  React.useEffect(function () {
    setComparisonKaraoke(null);
  }, [generatedContent?.id, generatedContent?.data, isCompareMode, comparisonSourceId, comparisonLanguage]);
  function updateComparisonPreference(field, value) {
    if (typeof stopPlayback === 'function') stopPlayback();
    prepareReadingNavigation(null, false);
    setRelatedPassage(null);
    setLinkedSection(0);
    setComparisonPreferences(previous => {
      var entries = Object.entries(previous).filter(entry => entry[0] !== comparisonPreferenceKey).slice(-29);
      return Object.assign(Object.fromEntries(entries), {
        [comparisonPreferenceKey]: Object.assign({}, pairPreferences, {
          [field]: value
        })
      });
    });
  }
  var navigationViewKey = JSON.stringify([generatedContent?.id, readingFingerprint(generatedContent?.data), readingScopeIdentity(generatedContent), isCompareMode ? readingScopeIdentity(selectedComparisonArtifact) : '', isCompareMode ? 'both' : protectedOriginal ? 'original' : 'adapted', isCompareMode ? comparisonSourceId : '', isCompareMode ? readingFingerprint(getArtifactReadingText(selectedComparisonArtifact)) : '', isCompareMode ? comparisonLanguage : '', !!isTeacherMode]);
  function readingOuterScroller() {
    var surface = readerSurfaceRef.current;
    for (var parent = surface?.parentElement; parent; parent = parent.parentElement) {
      var overflow = window.getComputedStyle(parent).overflowY;
      if (/(auto|scroll)/.test(overflow) && parent.scrollHeight > parent.clientHeight) return parent;
    }
    return document.scrollingElement || document.documentElement;
  }
  function rememberReadingPosition() {
    var surface = readerSurfaceRef.current;
    if (!surface) return;
    var outer = readingOuterScroller();
    var panes = {};
    surface.querySelectorAll('[data-compare-version]').forEach(node => {
      panes[node.dataset.compareVersion] = node.scrollTop;
    });
    var top = outer === document.scrollingElement ? 0 : outer.getBoundingClientRect().top;
    var anchors = Array.from(surface.querySelectorAll('[data-reading-passage] [data-reading-paragraph]'));
    var anchor = anchors.find(node => node.getBoundingClientRect().bottom > top);
    var bookmark = {
      outer: outer.scrollTop,
      panes,
      anchor: anchor?.getAttribute('data-reading-paragraph'),
      offset: anchor ? anchor.getBoundingClientRect().top - top : null
    };
    var positions = navigationRef.current.positions;
    positions.delete(navigationViewKey);
    positions.set(navigationViewKey, bookmark);
    if (positions.size > 60) positions.delete(positions.keys().next().value);
  }
  function prepareReadingNavigation(version, focusPassage) {
    rememberReadingPosition();
    navigationRef.current.pending = {
      from: navigationViewKey,
      version,
      focusPassage: !!focusPassage
    };
  }
  React.useLayoutEffect(function () {
    var pending = navigationRef.current.pending;
    if (!pending || pending.from === navigationViewKey) return;
    navigationRef.current.pending = null;
    var surface = readerSurfaceRef.current,
      outer = readingOuterScroller();
    if (!surface || !outer) return;
    var saved = navigationRef.current.positions.get(navigationViewKey);
    var focus = pending.focusPassage ? surface.querySelector('[data-reading-passage], [data-compare-version]') : surface.querySelector('[data-reading-version="' + pending.version + '"]');
    if (focus) focus.focus({
      preventScroll: true
    });
    if (saved) {
      surface.querySelectorAll('[data-compare-version]').forEach(node => {
        node.scrollTop = saved.panes[node.dataset.compareVersion] || 0;
      });
      outer.scrollTop = saved.outer;
      var anchor = saved.anchor && Array.from(surface.querySelectorAll('[data-reading-passage] [data-reading-paragraph]')).find(node => node.getAttribute('data-reading-paragraph') === saved.anchor);
      if (anchor) outer.scrollTop += anchor.getBoundingClientRect().top - (outer === document.scrollingElement ? 0 : outer.getBoundingClientRect().top) - saved.offset;
    } else if (isCompareMode) {
      surface.querySelectorAll('[data-compare-version]').forEach(node => {
        node.scrollTop = 0;
      });
    } else if (pending.focusPassage && focus) {
      outer.scrollTop += focus.getBoundingClientRect().top - (outer === document.scrollingElement ? 0 : outer.getBoundingClientRect().top) - 12;
    }
  }, [navigationViewKey]);
  function openOriginalReading(item, expectedText, focusPassage) {
    if (protectedOriginal && !isCompareMode && item?.id === generatedContent?.id) return;
    prepareReadingNavigation('original', focusPassage);
    var requestedSnapshot = item?.type === 'simplified' ? readingContract?.getSourceSnapshot?.(item) : null;
    if (isCompareMode) setComparisonReturn({
      id: generatedContent.id,
      fingerprint: readingFingerprint(generatedContent.data),
      scope: readingScopeIdentity(generatedContent),
      expectedText: requestedSnapshot?.text || expectedText || capturedSource?.text || '',
      sourceItem: item
    });
    if (typeof stopPlayback === 'function') stopPlayback();
    props.onReadOriginal?.(item);
  }
  function focusReadingOffset(pane, offset, focus) {
    var region = readerSurfaceRef.current?.querySelector('[data-compare-version="' + pane + '"]');
    var node = region && Array.from(region.querySelectorAll('[data-reading-offset-start]')).find(element => Number(element.dataset.readingOffsetEnd) > offset);
    if (!node) return;
    region.scrollTop += node.getBoundingClientRect().top - region.getBoundingClientRect().top;
    if (focus) {
      node.tabIndex = -1;
      node.focus({
        preventScroll: true
      });
      var outer = readingOuterScroller();
      var top = outer === document.scrollingElement ? 0 : outer.getBoundingClientRect().top;
      var bottom = outer === document.scrollingElement ? window.innerHeight : outer.getBoundingClientRect().bottom;
      if (node.getBoundingClientRect().top < top || node.getBoundingClientRect().bottom > bottom) outer.scrollTop += node.getBoundingClientRect().top - top - 12;
    }
  }
  var readerText = function (key, fallback) {
    var value = t(key);
    return value && value !== key ? value : fallback;
  };
  function chooseReadingMode(mode) {
    if (typeof stopPlayback === 'function') stopPlayback();
    if (typeof props.closeDefinition === 'function') props.closeDefinition();
    if (typeof props.closePhonics === 'function') props.closePhonics();
    if (typeof props.closeRevision === 'function') props.closeRevision();
    if (typeof setSelectionMenu === 'function') setSelectionMenu(null);
    if (typeof setRevisionData === 'function') setRevisionData(null);
    if (typeof setPhonicsData === 'function') setPhonicsData(null);
    if (typeof setIsCustomReviseOpen === 'function') setIsCustomReviseOpen(false);
    // Both panes support reading, word meaning, word sounds and explain, so
    // those keep the comparison; choosing one used to drop the original.
    if (!['read', 'define', 'phonics', 'explain'].includes(mode) && typeof setIsCompareMode === 'function') setIsCompareMode(false);
    if (isEditingLeveledText && typeof props.handleToggleIsEditingLeveledText === 'function') props.handleToggleIsEditingLeveledText();
    if (typeof setIsFluencyMode === 'function') setIsFluencyMode(mode === 'fluency');
    if (typeof setInteractionMode === 'function') setInteractionMode(mode === 'fluency' ? 'read' : mode);
  }
  React.useEffect(function () {
    if (isTeacherMode) return;
    // Student comparison is read-only; retain it when changing role.
    if (props.isEditingLeveledText && typeof props.handleToggleIsEditingLeveledText === 'function') props.handleToggleIsEditingLeveledText();
    if (['revise', 'add-glossary'].includes(props.interactionMode)) chooseReadingMode('read');
    if (props.revisionData && props.revisionData.type !== 'explain' && typeof props.closeRevision === 'function') props.closeRevision();
    if (props.isCustomReviseOpen && typeof setIsCustomReviseOpen === 'function') setIsCustomReviseOpen(false);
  }, [isTeacherMode, props.isCompareMode, props.isEditingLeveledText, props.interactionMode, props.revisionData?.type, props.isCustomReviseOpen]);
  var readingLanguage = generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || leveledTextLanguage || 'English';
  // Teacher-prepared word help students can see on this adapted text.
  var shownWordHelpCount = function () {
    try {
      if (!readingContract?.isAdaptedReading?.(generatedContent) || !readingContract.validateAdaptedReadingSupports) return 0;
      var help = readingContract.validateAdaptedReadingSupports(generatedContent, generatedContent.adaptedReadingSupports);
      return help.shown && help.status !== 'stale' ? (help.annotations || []).length : 0;
    } catch (_) {
      return 0;
    }
  }();
  // The active mode, named, with what to do in it: the banner under the reading tools.
  function readingModeStatus() {
    var arrows = ' ' + viewText('simplified.word_arrows_hint', 'Use Left and Right arrows to move between words.');
    if (isCompareMode) return {
      mode: 'compare',
      hint: isTeacherMode ? readerText('simplified.compare_hint', 'Review the source and adapted versions below.') : readerText('simplified.compare_hint_student', 'Read the original and the easier version side by side.')
    };
    if (isEditingLeveledText) return {
      mode: 'edit',
      label: viewText('simplified.mode_editing', 'Editing'),
      hint: readerText('simplified.edit_hint', 'Edit the passage below. Choose Read to return to reading.')
    };
    if (isFluencyMode) return {
      mode: 'fluency',
      label: readerText('simplified.record_my_reading', 'Record my reading'),
      hint: readerText('simplified.fluency_hint', 'Use the read-along panel to practice at your own pace.')
    };
    if (interactionMode === 'define') return {
      mode: 'define',
      label: readerText('simplified.word_meaning', 'Word meaning'),
      hint: viewText('simplified.define_hint', 'Select a word to see what it means.') + (shownWordHelpCount && !protectedOriginal ? ' ' + viewText('simplified.define_hint_prepared', 'Underlined words open the word help your teacher prepared.') : '') + arrows
    };
    if (interactionMode === 'phonics') return {
      mode: 'phonics',
      label: readerText('simplified.word_sounds', 'Word sounds'),
      hint: viewText('simplified.phonics_hint', 'Select a word to hear its sounds.') + arrows
    };
    if (interactionMode === 'add-glossary') return {
      mode: 'add-glossary',
      label: readerText('simplified.add_term', 'Add term'),
      hint: viewText('simplified.add_term_hint', 'Select a word to add it to the glossary.') + arrows
    };
    if (interactionMode === 'explain') return {
      mode: 'explain',
      label: readerText('simplified.explain_mode', 'Explain'),
      hint: readerText('simplified.explain_hint', 'Choose a sentence for an explanation, or select a longer passage.')
    };
    if (interactionMode === 'revise') return {
      mode: 'revise',
      label: readerText('simplified.revise_mode', 'Revise'),
      hint: readerText('simplified.revise_hint', 'Select the words you want to revise.')
    };
    if (interactionMode === 'cloze') return {
      mode: 'cloze',
      label: readerText('simplified.practice_blanks', 'Fill in the blanks'),
      hint: readerText('simplified.cloze_hint', 'Fill in the missing words. Choose Read to see the complete passage.')
    };
    return {
      mode: 'read',
      hint: protectedOriginal ? readerText('simplified.original_read_hint', 'Read at your own pace. Use Listen to hear the original.') : readerText('simplified.read_hint', 'Read at your own pace. Choose any sentence to listen from there.')
    };
  }
  // Add term and Revise work on adapted text only; on an original they did nothing.
  // They edit the text, so they sit with the teacher's editing tools, not the reading tools.
  var teacherReadingModes = isTeacherMode && !protectedOriginal ? [['add-glossary', 'simplified.add_term', 'Add term', Plus], ['revise', 'simplified.revise_mode', 'Revise', Pencil]] : [];
  function renderReadingModeButton(entry) {
    var mode = entry[0],
      Icon = entry[3],
      active = interactionMode === mode && !isFluencyMode && !isEditingLeveledText;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: mode,
      "data-reading-mode": mode,
      "data-help-key": mode === 'add-glossary' ? 'simplified_add_term' : 'simplified_' + mode + '_mode',
      onClick: () => chooseReadingMode(mode),
      "aria-pressed": active,
      className: 'min-h-11 rounded-xl border-2 px-3 py-2 text-sm font-bold inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ' + (active ? 'border-indigo-700 bg-indigo-100 text-indigo-900' : 'border-transparent text-slate-700 hover:bg-slate-100')
    }, /*#__PURE__*/React.createElement(Icon, {
      size: 16,
      "aria-hidden": "true"
    }), readerText(entry[1], entry[2]));
  }
  // Selecting an underlined word in Word meaning opens the word help the teacher
  // prepared for it beside the passage, before any AI definition.
  var [wordHelpCard, setWordHelpCard] = React.useState(null);
  var wordHelpCardRef = React.useRef(null),
    wordHelpCardOpener = React.useRef(null);
  React.useEffect(function () {
    setWordHelpCard(null);
  }, [generatedContent?.id, generatedContent?.data, generatedContent?.adaptedReadingSupports, interactionMode, isCompareMode]);
  React.useEffect(function () {
    if (wordHelpCard && wordHelpCardRef.current) wordHelpCardRef.current.focus();
  }, [wordHelpCard && wordHelpCard.entry.id, wordHelpCard && wordHelpCard.x, wordHelpCard && wordHelpCard.y]);
  function closeWordHelpCard(restoreFocus) {
    var opener = wordHelpCardOpener.current;
    wordHelpCardOpener.current = null;
    setWordHelpCard(null);
    if (restoreFocus !== false && opener && opener.isConnected) opener.focus();
  }
  function openWordHelpCard(event, container, language) {
    var word = event.currentTarget;
    var entry = container ? adaptedWordHelpAt(generatedContent, container, language, word) : null;
    if (!entry) {
      if (wordHelpCard) closeWordHelpCard(false);
      return false;
    }
    if (typeof props.closeDefinition === 'function') props.closeDefinition();
    var rect = word.getBoundingClientRect ? word.getBoundingClientRect() : null;
    wordHelpCardOpener.current = word;
    setWordHelpCard({
      entry: entry,
      language: language,
      x: event.clientX || rect?.left || 0,
      y: event.clientY || rect?.bottom || 0
    });
    return true;
  }
  // Reading place (outline, bookmark, continue, section prompts). Adapted
  // single-language readings only: their paragraphs carry stable numbers.
  var placeLearner = props.isStudentPreview ? '' : props.readingLearnerKey != null ? String(props.readingLearnerKey) : isTeacherMode ? 'teacher' : '';
  var placeItemId = String(generatedContent?.id || '');
  var placeFingerprint = readingFingerprint(generatedContent?.data);
  var placeParagraphs = simplifiedReadAloudText.split(/\n{2,}/);
  var placePreview = !!props.isStudentPreview;
  var placeAvailable = !protectedOriginal && !isCompareMode && !isEditingLeveledText && !!placeItemId && typeof generatedContent?.data === 'string' && !(typeof getSideBySideContent === 'function' && getSideBySideContent(simplifiedReadAloudText));
  var outlineSections = placeAvailable ? readingOutlineSections(simplifiedReadAloudText) : [];
  var [readingPlace, setReadingPlace] = React.useState(null);
  var [placeOffer, setPlaceOffer] = React.useState(null);
  var [placeNotice, setPlaceNotice] = React.useState('');
  var [outlineOpen, setOutlineOpen] = React.useState(false);
  var placeRef = React.useRef({});
  placeRef.current = {
    learner: placeLearner,
    id: placeItemId,
    fingerprint: placeFingerprint,
    available: placeAvailable,
    offerPending: !!placeOffer && placeOffer.kind === 'continue',
    preview: placePreview,
    place: readingPlace
  };
  var paragraphSnippet = index => {
    var words = simplifiedPlainInline(String(placeParagraphs[index] || '').replace(/^\s{0,3}#{1,6}\s+/gm, '')).split(/\s+/).filter(Boolean);
    return words.slice(0, 10).join(' ') + (words.length > 10 ? '…' : '');
  };
  function storeReadingPlace(update) {
    var current = placeRef.current;
    if (!current.available) return null;
    // A student preview shows these tools but keeps what is done there in memory only.
    if (current.preview) {
      var local = {
        ...(current.place || {}),
        ...update
      };
      setReadingPlace(local);
      return local;
    }
    var next = saveReadingPlace(current.learner, current.id, current.fingerprint, update);
    setReadingPlace(next);
    return next;
  }
  function passageParagraphNodes() {
    var surface = readerSurfaceRef.current;
    return surface ? Array.from(surface.querySelectorAll('[data-reading-passage] [data-reading-paragraph]')).filter(node => /^\d+$/.test(node.getAttribute('data-reading-paragraph'))) : [];
  }
  // The paragraph being read: the focused one, else the first one on screen.
  function currentReadingParagraph() {
    var nodes = passageParagraphNodes();
    if (!nodes.length) return null;
    var active = document.activeElement && document.activeElement.closest ? document.activeElement.closest('[data-reading-paragraph]') : null;
    if (active && nodes.includes(active)) return Number(active.getAttribute('data-reading-paragraph'));
    var outer = readingOuterScroller();
    var top = outer === document.scrollingElement ? 0 : outer.getBoundingClientRect().top;
    var visible = nodes.find(node => node.getBoundingClientRect().bottom > top + 4);
    return Number((visible || nodes[0]).getAttribute('data-reading-paragraph'));
  }
  function goToReadingParagraph(index) {
    var node = passageParagraphNodes().find(element => Number(element.getAttribute('data-reading-paragraph')) === Number(index));
    if (!node) return false;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof node.scrollIntoView === 'function') node.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
    node.focus({
      preventScroll: true
    });
    return true;
  }
  function rememberPlace(resume) {
    var paragraph = currentReadingParagraph();
    if (paragraph == null || !placeRef.current.available) return;
    storeReadingPlace({
      paragraph,
      snippet: paragraphSnippet(paragraph),
      resume: !!resume
    });
  }
  React.useEffect(function () {
    setPlaceOffer(null);
    setPlaceNotice('');
    setOutlineOpen(false);
    if (!placeAvailable || placePreview) {
      setReadingPlace(null);
      return undefined;
    }
    var loaded = loadReadingPlace(placeLearner, placeItemId, placeFingerprint);
    var place = loaded.place;
    setReadingPlace(place);
    // Back from reflection or another tool in the same visit: return quietly.
    if (place && place.resume && place.paragraph > 0 && Date.now() - (place.at || 0) < 7200000) {
      var timer = setTimeout(function () {
        if (goToReadingParagraph(place.paragraph)) setPlaceNotice(viewText('simplified.place_returned', 'Back where you were reading.'));
        storeReadingPlace({
          resume: false
        });
      }, 0);
      return function () {
        clearTimeout(timer);
      };
    }
    // Never jump on its own: offer, and only for this exact version.
    if (place && place.paragraph > 0 && place.snippet === paragraphSnippet(place.paragraph)) setPlaceOffer({
      kind: 'continue',
      paragraph: place.paragraph,
      snippet: place.snippet
    });else if (loaded.revised) setPlaceOffer({
      kind: 'revised'
    });
    return undefined;
  }, [placeLearner, placeItemId, placeFingerprint, placeAvailable]);
  React.useEffect(function () {
    if (!placeAvailable || placePreview || typeof document === 'undefined') return undefined;
    var timer = null;
    // An open Continue offer keeps the saved place until the reader answers it.
    var onScroll = function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = null;
        if (!placeRef.current.offerPending) rememberPlace(false);
      }, 800);
    };
    document.addEventListener('scroll', onScroll, true);
    return function () {
      document.removeEventListener('scroll', onScroll, true);
      if (timer) clearTimeout(timer);
    };
  }, [placeLearner, placeItemId, placeFingerprint, placeAvailable]);
  // Optional prompts about one section, answered beside the passage so the
  // reading place and the answers stay put across reading and listening.
  var [promptsOpen, setPromptsOpen] = React.useState(false);
  var [promptSection, setPromptSection] = React.useState(0);
  React.useEffect(function () {
    setPromptsOpen(false);
    setPromptSection(0);
  }, [placeItemId, placeFingerprint]);
  function sectionAtParagraph(paragraph) {
    return outlineSections.find(section => paragraph != null && paragraph >= section.first && paragraph <= section.last) || outlineSections[0] || null;
  }
  function openSectionPrompts() {
    var section = sectionAtParagraph(currentReadingParagraph());
    setPromptSection(section ? section.index : 0);
    setPromptsOpen(true);
  }
  function saveSectionResponse(section, field, value) {
    var responses = {
      ...(readingPlace && readingPlace.responses || {})
    };
    responses[section.first] = {
      ...(responses[section.first] || {}),
      [field]: value
    };
    storeReadingPlace({
      responses
    });
  }
  function renderSectionPrompts() {
    var section = outlineSections[promptSection] || outlineSections[0];
    if (!section) return null;
    var answers = (readingPlace && readingPlace.responses || {})[section.first] || {};
    var plain = simplifiedPlainInline(section.text.replace(/^\s{0,3}#{1,6}\s+.*$/gm, '')).trim();
    var sentences = (typeof splitTextToSentences === 'function' ? splitTextToSentences(plain) : [plain]).map(sentence => String(sentence).trim()).filter(Boolean);
    var field = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-400 bg-white px-2 font-normal';
    var sentencePicker = (name, value) => /*#__PURE__*/React.createElement("select", {
      value: value || '',
      onChange: event => saveSectionResponse(section, name, event.target.value),
      className: field
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, viewText('simplified.prompt_choose_sentence', 'Choose a sentence')), sentences.map((sentence, index) => /*#__PURE__*/React.createElement("option", {
      key: index,
      value: sentence
    }, sentence.length > 140 ? sentence.slice(0, 140) + '…' : sentence)), value && !sentences.includes(value) ? /*#__PURE__*/React.createElement("option", {
      value: value
    }, value) : null);
    return /*#__PURE__*/React.createElement("section", {
      id: "simplified-section-prompts",
      "data-section-prompts": true,
      "aria-labelledby": "simplified-section-prompts-title",
      className: "mt-3 space-y-3 rounded-xl border border-indigo-200 bg-white p-3 text-base text-slate-900"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("h3", {
      id: "simplified-section-prompts-title",
      className: "text-lg font-bold text-indigo-950"
    }, viewText('simplified.prompt_title', 'Think about a section')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: event => {
        var toggle = event.currentTarget.closest('[data-section-prompts-area]')?.querySelector('[data-section-prompts-toggle]');
        setPromptsOpen(false);
        toggle?.focus();
      },
      className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
    }, viewText('common.close', 'Close'))), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-700"
    }, placeLearner && !placePreview ? viewText('simplified.prompt_saved_here', 'Optional. Your answers stay with this version of the reading on this device.') : viewText('simplified.prompt_saved_visit', 'Optional. Your answers stay with this reading while this page is open.')), /*#__PURE__*/React.createElement("label", {
      className: "block font-semibold"
    }, viewText('simplified.prompt_section', 'Section'), /*#__PURE__*/React.createElement("select", {
      "data-section-prompts-section": true,
      value: section.index,
      onChange: event => setPromptSection(Number(event.target.value)),
      className: field
    }, outlineSections.map(entry => /*#__PURE__*/React.createElement("option", {
      key: entry.index,
      value: entry.index
    }, entry.label)))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => goToReadingParagraph(section.first),
      className: "min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-sm text-indigo-900"
    }, viewText('simplified.prompt_go_to_section', 'Go to this section')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => speakExactPassage(plain, 'section-' + section.first, readingLanguage),
      className: "min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-sm text-indigo-900"
    }, isExactPassagePlaying('section-' + section.first) ? viewText('common.stop', 'Stop') : viewText('simplified.prompt_listen_section', 'Listen to this section'))), /*#__PURE__*/React.createElement("label", {
      className: "block font-semibold"
    }, viewText('simplified.prompt_main_idea', 'What is the main idea?'), /*#__PURE__*/React.createElement("textarea", {
      "data-section-prompt": "mainIdea",
      rows: 2,
      value: answers.mainIdea || '',
      onChange: event => saveSectionResponse(section, 'mainIdea', event.target.value),
      className: field + ' py-2'
    })), /*#__PURE__*/React.createElement("label", {
      className: "block font-semibold"
    }, viewText('simplified.prompt_support', 'Which sentence supports it?'), sentencePicker('support', answers.support)), /*#__PURE__*/React.createElement("label", {
      className: "block font-semibold"
    }, viewText('simplified.prompt_confusing', 'Mark a confusing part.'), sentencePicker('confusing', answers.confusing)), answers.confusing && /*#__PURE__*/React.createElement("label", {
      className: "block font-semibold"
    }, viewText('simplified.prompt_confusing_note', 'What is confusing about it? (optional)'), /*#__PURE__*/React.createElement("textarea", {
      "data-section-prompt": "confusingNote",
      rows: 2,
      value: answers.confusingNote || '',
      onChange: event => saveSectionResponse(section, 'confusingNote', event.target.value),
      className: field + ' py-2'
    })));
  }
  function renderReadingPlaceControls() {
    if (!placeAvailable || interactionMode === 'cloze') return null;
    var button = 'min-h-11 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
    return /*#__PURE__*/React.createElement(React.Fragment, null, outlineSections.length >= 3 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reading-outline-toggle": true,
      "aria-expanded": outlineOpen,
      "aria-controls": "simplified-reading-outline",
      onClick: () => setOutlineOpen(!outlineOpen),
      className: button
    }, viewText('simplified.outline_toggle', 'Sections & bookmark'), outlineOpen ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14,
      className: "inline ml-1",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(ChevronDown, {
      size: 14,
      className: "inline ml-1",
      "aria-hidden": "true"
    })));
  }
  function renderReadingPlacePanels() {
    if (!placeAvailable || interactionMode === 'cloze') return null;
    var current = sectionAtParagraph(readingPlace ? readingPlace.paragraph : null);
    var small = 'min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-sm text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
    return /*#__PURE__*/React.createElement(React.Fragment, null, placeOffer && placeOffer.kind === 'continue' && /*#__PURE__*/React.createElement("div", {
      "data-reading-continue": true,
      className: "mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-base text-indigo-950"
    }, /*#__PURE__*/React.createElement("p", {
      className: "min-w-0 flex-1"
    }, viewText('simplified.place_continue', 'Continue where you left off: {snippet}', {
      snippet: placeOffer.snippet
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reading-continue-go": true,
      onClick: () => {
        var target = placeOffer.paragraph;
        setPlaceOffer(null);
        if (goToReadingParagraph(target)) setPlaceNotice(viewText('simplified.place_continuing', 'Continuing where you left off.'));
      },
      className: "min-h-11 rounded-lg bg-indigo-700 px-3 font-semibold text-white"
    }, viewText('simplified.place_continue_button', 'Continue')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reading-continue-restart": true,
      onClick: () => {
        setPlaceOffer(null);
        storeReadingPlace({
          paragraph: 0,
          snippet: paragraphSnippet(0)
        });
      },
      className: "min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-indigo-900"
    }, viewText('simplified.place_start_over', 'Start from the beginning'))), placeOffer && placeOffer.kind === 'revised' && /*#__PURE__*/React.createElement("div", {
      "data-reading-revised": true,
      className: "mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-base text-amber-950"
    }, /*#__PURE__*/React.createElement("p", {
      className: "min-w-0 flex-1"
    }, viewText('simplified.place_revised', 'This reading was changed since you last read it, so it starts at the beginning. Earlier bookmarks and answers belong to the old version.')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setPlaceOffer(null),
      className: "min-h-11 rounded-lg border border-amber-700 bg-white px-3"
    }, viewText('simplified.place_ok', 'OK'))), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "data-reading-place-notice": true,
      className: placeNotice ? 'mb-3 text-sm text-indigo-900' : 'sr-only'
    }, placeNotice), outlineOpen && outlineSections.length >= 3 && /*#__PURE__*/React.createElement("nav", {
      id: "simplified-reading-outline",
      "data-reading-outline": true,
      "aria-label": viewText('simplified.outline_label', 'Sections of this reading'),
      className: "mb-4 space-y-2 rounded-xl border border-indigo-100 bg-white p-2 text-base"
    }, /*#__PURE__*/React.createElement("ol", {
      className: "space-y-1"
    }, outlineSections.map(section => /*#__PURE__*/React.createElement("li", {
      key: section.index
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-current": current && current.index === section.index ? 'location' : undefined,
      onClick: () => goToReadingParagraph(section.first),
      className: 'min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (current && current.index === section.index ? 'font-bold text-indigo-950' : 'text-slate-800')
    }, section.label)))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2 px-1 pb-1"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reading-bookmark": true,
      onClick: saveBookmark,
      className: small
    }, readingPlace && readingPlace.bookmark ? viewText('simplified.place_move_bookmark', 'Move bookmark here') : viewText('simplified.place_bookmark', 'Bookmark this spot')), readingPlace && readingPlace.bookmark && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reading-bookmark-open": true,
      onClick: openBookmark,
      className: small
    }, viewText('simplified.place_go_to_bookmark', 'Go to bookmark')))));
  }
  // After the passage, where reflecting comes naturally; the panel opens in place.
  function renderSectionPromptsArea() {
    if (!placeAvailable || interactionMode === 'cloze' || !outlineSections.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      "data-section-prompts-area": true,
      className: "mt-6"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-section-prompts-toggle": true,
      "aria-expanded": promptsOpen,
      "aria-controls": "simplified-section-prompts",
      onClick: () => promptsOpen ? setPromptsOpen(false) : openSectionPrompts(),
      className: "min-h-11 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-base text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, viewText('simplified.prompt_title', 'Think about a section')), promptsOpen && renderSectionPrompts());
  }
  function saveBookmark() {
    var paragraph = currentReadingParagraph();
    if (paragraph == null) return;
    storeReadingPlace({
      bookmark: {
        paragraph,
        snippet: paragraphSnippet(paragraph)
      }
    });
    setPlaceNotice(viewText('simplified.place_bookmark_saved', 'Bookmark saved at: {snippet}', {
      snippet: paragraphSnippet(paragraph)
    }));
  }
  function openBookmark() {
    var mark = readingPlace && readingPlace.bookmark;
    if (!mark) return;
    if (mark.snippet !== paragraphSnippet(mark.paragraph) || !goToReadingParagraph(mark.paragraph)) {
      setPlaceNotice(viewText('simplified.place_bookmark_missing', 'That bookmark is no longer in this reading.'));
      return;
    }
    setPlaceNotice(viewText('simplified.place_at_bookmark', 'Moved to your bookmark.'));
  }
  // Teacher review summary: text, word help and audio at a glance, with the
  // action for each, and a preview of exactly what students receive.
  var showReviewSummary = isTeacherMode && !isZenMode && !props.isStudentPreview && !protectedOriginal && generatedContent?.type === 'simplified' && typeof generatedContent.data === 'string';
  if (showReviewSummary && placeItemId && !(placeItemId in readingFirstSeen)) readingFirstSeen[placeItemId] = placeFingerprint;
  var reviewAudio = React.useMemo(function () {
    if (!showReviewSummary) return null;
    try {
      return getReadAloudAudioSummary(getReadAloudSentenceEntriesForText(simplifiedReadAloudText));
    } catch (_) {
      return null;
    }
  }, [showReviewSummary, simplifiedReadAloudText, generatedContent?.id, ttsPrepState.done, ttsPrepState.busy, isPlaying]);
  var [studentPreview, setStudentPreview] = React.useState(null);
  var studentPreviewRef = React.useRef(null),
    studentPreviewCloseRef = React.useRef(null),
    studentPreviewOpener = React.useRef(null);
  React.useEffect(function () {
    if (studentPreview && studentPreviewCloseRef.current) studentPreviewCloseRef.current.focus();
  }, [!!studentPreview]);
  function closeStudentPreview() {
    setStudentPreview(null);
    var opener = studentPreviewOpener.current;
    studentPreviewOpener.current = null;
    if (opener && opener.isConnected) opener.focus();
  }
  function openWordHelpReview() {
    var panel = readerSurfaceRef.current && readerSurfaceRef.current.querySelector('[data-adapted-word-help-teacher]');
    if (!panel) return;
    panel.open = true;
    var summary = panel.querySelector('summary');
    if (typeof panel.scrollIntoView === 'function') panel.scrollIntoView({
      block: 'start'
    });
    if (summary) summary.focus();
  }
  function renderTeacherReviewSummary() {
    if (!showReviewSummary) return null;
    var contract = readingContract;
    var help = contract?.isAdaptedReading?.(generatedContent) && contract.validateAdaptedReadingSupports ? contract.validateAdaptedReadingSupports(generatedContent, generatedContent.adaptedReadingSupports) : null;
    var helpCount = help && help.annotations ? help.annotations.length : 0;
    var textChanged = readingFirstSeen[placeItemId] !== placeFingerprint;
    var rows = [{
      key: 'text',
      tone: textChanged ? 'attention' : 'ok',
      label: textChanged ? viewText('simplified.review_text_changed', 'Text changed') : viewText('simplified.review_text_unchanged', 'Text unchanged'),
      detail: textChanged ? viewText('simplified.review_text_changed_detail', 'Edited since you opened it. Check word help and audio.') : viewText('simplified.review_text_unchanged_detail', 'No edits since you opened it.'),
      actions: [capturedSource && typeof setIsCompareMode === 'function' && ['compare', viewText('simplified.review_compare', 'Compare with original'), () => {
        chooseReadingMode('read');
        setIsCompareMode(true);
      }], typeof handleToggleIsEditingLeveledText === 'function' && ['edit', isEditingLeveledText ? t('common.done_editing') : viewText('simplified.review_edit', 'Edit text'), handleToggleIsEditingLeveledText]]
    }, help && {
      key: 'help',
      tone: help.status === 'stale' || helpCount && !help.shown ? 'attention' : helpCount ? 'ok' : 'neutral',
      label: help.status === 'stale' || helpCount && !help.shown ? viewText('simplified.review_help_needs_review', 'Word help needs review') : helpCount ? viewText('simplified.review_help_shown', 'Word help shown to students') : viewText('simplified.review_help_none', 'No word help'),
      detail: help.status === 'stale' ? viewText('simplified.review_help_stale_detail', 'The text changed after word help was made, so students do not see it.') : helpCount ? (helpCount === 1 ? viewText('simplified.word_help_summary_one', '1 support') : viewText('simplified.word_help_summary_count', '{count} supports', {
        count: helpCount
      })) + (help.shown ? '' : ' · ' + viewText('simplified.word_help_summary_hidden', 'Hidden from students')) : viewText('simplified.review_help_none_detail', 'Optional explanations for hard words.'),
      actions: [['help', viewText('simplified.review_open_help', 'Review word help'), openWordHelpReview]]
    }, reviewAudio && reviewAudio.total > 0 && {
      key: 'audio',
      tone: reviewAudio.saved >= reviewAudio.total ? 'ok' : 'neutral',
      label: reviewAudio.saved >= reviewAudio.total ? viewText('simplified.review_audio_ready', 'Audio prepared') : reviewAudio.saved ? viewText('simplified.review_audio_partial', 'Audio partly prepared') : viewText('simplified.review_audio_none', 'Audio not prepared'),
      detail: viewText('simplified.review_audio_detail', '{saved} of {total} sentences saved, so they play without waiting.', {
        saved: Math.min(reviewAudio.saved, reviewAudio.total),
        total: reviewAudio.total
      }),
      actions: [reviewAudio.saved < reviewAudio.total && typeof handlePrepareReadAloudAudio === 'function' && !ttsPrepState.busy && ['audio', viewText('simplified.save_audio', 'Save audio'), () => handlePrepareReadAloudAudio()]]
    }].filter(Boolean);
    var tones = {
      ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      attention: 'border-amber-400 bg-amber-50 text-amber-950',
      neutral: 'border-slate-300 bg-slate-50 text-slate-800'
    };
    return /*#__PURE__*/React.createElement("section", {
      "data-teacher-review-summary": true,
      "aria-labelledby": "simplified-review-summary-title",
      className: "mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-800"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("h3", {
      id: "simplified-review-summary-title",
      className: "text-base font-bold text-slate-900"
    }, viewText('simplified.review_title', 'Before you share')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-student-preview-open": true,
      onClick: event => {
        studentPreviewOpener.current = event.currentTarget;
        setStudentPreview({
          mode: 'read',
          compare: false
        });
      },
      className: "min-h-11 rounded-lg bg-indigo-700 px-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
    }, viewText('simplified.review_preview', 'Preview as a student'))), /*#__PURE__*/React.createElement("ul", {
      className: "mt-2 grid gap-2 sm:grid-cols-3"
    }, rows.map(row => /*#__PURE__*/React.createElement("li", {
      key: row.key,
      "data-review-state": row.key,
      "data-review-tone": row.tone,
      className: 'rounded-xl border p-2 ' + tones[row.tone]
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-bold"
    }, row.label), /*#__PURE__*/React.createElement("p", {
      className: "mt-0.5 text-xs"
    }, row.detail), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 flex flex-wrap gap-x-3"
    }, row.actions.filter(Boolean).map(([key, label, run]) => /*#__PURE__*/React.createElement("button", {
      key: key,
      type: "button",
      "data-review-action": key,
      onClick: run,
      className: "min-h-11 rounded px-1 text-sm font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, label)))))));
  }
  // The student view of this reading, rendered by this same reader. Anything
  // that would change the lesson or call AI is switched off inside it.
  function renderStudentPreview() {
    if (!studentPreview) return null;
    var previewProps = {};
    Object.keys(props).forEach(key => {
      var value = props[key];
      previewProps[key] = typeof value === 'function' && /^(set[A-Z]|handle|close|on[A-Z]|apply|toggle|copy)/.test(key) && key !== 'handleSpeak' ? function () {} : value;
    });
    Object.assign(previewProps, {
      isTeacherMode: false,
      isStudentPreview: true,
      readingLearnerKey: '',
      isZenMode: false,
      isEditingLeveledText: false,
      isFluencyMode: false,
      isImmersiveReaderActive: false,
      isTeacherToolbarExpanded: false,
      interactionMode: studentPreview.mode,
      setInteractionMode: mode => setStudentPreview(current => current && {
        ...current,
        mode
      }),
      isCompareMode: studentPreview.compare,
      setIsCompareMode: compare => setStudentPreview(current => current && {
        ...current,
        compare: !!compare
      }),
      definitionData: null,
      phonicsData: null,
      revisionData: null,
      selectionMenu: null,
      isCustomReviseOpen: false,
      onFocusViewChange: undefined,
      onReadReflect: undefined,
      onReadOriginal: undefined
    });
    return /*#__PURE__*/React.createElement("div", {
      ref: studentPreviewRef,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "simplified-student-preview-title",
      "data-student-preview": true,
      onKeyDown: event => containSimplifiedModalFocus(event, studentPreviewRef.current, closeStudentPreview),
      className: "fixed inset-0 z-[150] overflow-y-auto bg-slate-900/60 p-2 sm:p-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mx-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b border-slate-200 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "simplified-student-preview-title",
      className: "text-lg font-bold text-slate-900"
    }, viewText('simplified.preview_title', 'Student preview')), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-700"
    }, viewText('simplified.preview_note', 'This is what students see. Nothing here is saved, and word meanings, word sounds and other AI help do not run.'))), /*#__PURE__*/React.createElement("button", {
      ref: studentPreviewCloseRef,
      type: "button",
      "data-student-preview-close": true,
      onClick: closeStudentPreview,
      className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, viewText('simplified.preview_close', 'Close preview'))), /*#__PURE__*/React.createElement("div", {
      className: "p-2 sm:p-4"
    }, React.createElement(SimplifiedView, previewProps))));
  }
  // Precise adaptation choices, previewed before they change the text, with a
  // route back to the version before the change.
  var [adaptOptions, setAdaptOptions] = React.useState({
    shorterSentences: false,
    explainVocabulary: false,
    keepTerms: ''
  });
  var [adaptPreview, setAdaptPreview] = React.useState(null);
  var [adaptUndo, setAdaptUndo] = React.useState(null);
  var [adaptNotice, setAdaptNotice] = React.useState('');
  var adaptPreviewRef = React.useRef(null);
  React.useEffect(function () {
    setAdaptPreview(null);
  }, [generatedContent?.id, generatedContent?.data]);
  React.useEffect(function () {
    if (adaptPreview && adaptPreviewRef.current) adaptPreviewRef.current.focus();
  }, [!!adaptPreview]);
  var adaptTerms = adaptOptions.keepTerms.split(/[,;\n]/).map(term => term.trim()).filter(Boolean);
  var adaptHasOptions = adaptOptions.shorterSentences || adaptOptions.explainVocabulary || adaptTerms.length > 0;
  var adaptUndoAvailable = !!adaptUndo && (adaptUndo.keptOriginal ? generatedContent?.id === adaptUndo.newId : generatedContent?.id === adaptUndo.previousId && generatedContent?.data !== adaptUndo.previousData && (adaptUndo.appliedData == null || generatedContent?.data === adaptUndo.appliedData));
  async function prepareAdaptation() {
    if (typeof handleComplexityAdjustment !== 'function') return;
    var before = {
      id: generatedContent.id,
      data: generatedContent.data,
      kept: !!saveOriginalOnAdjust
    };
    setAdaptNotice('');
    setAdaptPreview(null);
    var result = await handleComplexityAdjustment({
      preview: true,
      options: {
        shorterSentences: adaptOptions.shorterSentences,
        explainVocabulary: adaptOptions.explainVocabulary,
        keepTerms: adaptTerms
      }
    });
    if (result && result.status === 'preview') {
      setAdaptPreview(result);
      return;
    }
    // A host without previews applies straight away; still offer the way back.
    if (!result) setAdaptUndo({
      previousId: before.id,
      previousData: before.data,
      keptOriginal: false,
      appliedData: null
    });
  }
  async function applyAdaptation() {
    var previousData = generatedContent.data;
    var result = await handleComplexityAdjustment({
      apply: adaptPreview
    });
    if (result && result.status === 'applied') {
      setAdaptUndo({
        previousId: result.previousId,
        previousData,
        newId: result.newId,
        keptOriginal: result.newId !== result.previousId,
        appliedData: result.data == null ? null : result.data
      });
      setAdaptPreview(null);
      setAdaptNotice(viewText('simplified.adapt_applied', 'Change applied. You can go back to the previous version.'));
    } else if (result && result.status === 'stale') setAdaptPreview(null);
  }
  function undoAdaptation() {
    var undo = adaptUndo;
    if (!undo) return;
    if (undo.keptOriginal) {
      var previous = (props.history || []).find(item => item && item.id === undo.previousId);
      if (previous && typeof setGeneratedContent === 'function') setGeneratedContent(previous);
    } else if (typeof handleSimplifiedTextChange === 'function') handleSimplifiedTextChange(undo.previousData);
    setAdaptUndo(null);
    setAdaptNotice(viewText('simplified.adapt_undone', 'Back to the previous version.'));
  }
  function renderAdaptationControls() {
    var check = (field, label) => /*#__PURE__*/React.createElement("label", {
      className: "flex min-h-11 items-center gap-2 text-sm text-slate-800"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      "data-adapt-option": field,
      checked: !!adaptOptions[field],
      disabled: isProcessing,
      onChange: event => setAdaptOptions(current => ({
        ...current,
        [field]: event.target.checked
      })),
      className: "h-4 w-4 accent-indigo-600"
    }), label);
    var diff = adaptPreview ? simplifiedWordDiff(generatedContent.data, adaptPreview.data) : null;
    return /*#__PURE__*/React.createElement("div", {
      "data-adaptation-controls": true,
      className: "space-y-3 text-left"
    }, /*#__PURE__*/React.createElement("fieldset", {
      className: "rounded-lg border border-slate-200 p-3"
    }, /*#__PURE__*/React.createElement("legend", {
      className: "px-1 text-xs font-bold uppercase tracking-wide text-indigo-700"
    }, viewText('simplified.adapt_also', 'Also change')), check('shorterSentences', viewText('simplified.adapt_shorter', 'Shorter sentences')), check('explainVocabulary', viewText('simplified.adapt_explain_vocab', 'Explain unfamiliar vocabulary')), /*#__PURE__*/React.createElement("label", {
      className: "mt-1 block text-sm font-semibold text-slate-800"
    }, viewText('simplified.adapt_keep_terms', 'Preserve these essential terms'), /*#__PURE__*/React.createElement("span", {
      id: "simplified-adapt-terms-hint",
      className: "block text-xs font-normal text-slate-600"
    }, viewText('simplified.adapt_keep_terms_hint', 'Separate terms with commas. They stay exactly as written.')), /*#__PURE__*/React.createElement("input", {
      type: "text",
      "data-adapt-keep-terms": true,
      "aria-describedby": "simplified-adapt-terms-hint",
      value: adaptOptions.keepTerms,
      disabled: isProcessing,
      onChange: event => setAdaptOptions(current => ({
        ...current,
        keepTerms: event.target.value
      })),
      className: "mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-apply-complexity": true,
      onClick: prepareAdaptation,
      disabled: isProcessing || Number(complexityLevel) === 5 && !adaptHasOptions,
      className: "min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
    }, isProcessing ? readerText('simplified.applying_change', 'Updating text…') : viewText('simplified.adapt_preview', 'Preview change'))), adaptPreview && /*#__PURE__*/React.createElement("section", {
      ref: adaptPreviewRef,
      tabIndex: -1,
      "data-adaptation-preview": true,
      "aria-labelledby": "simplified-adapt-preview-title",
      className: "space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("h4", {
      id: "simplified-adapt-preview-title",
      className: "font-bold text-indigo-950"
    }, viewText('simplified.adapt_preview_title', 'Preview of the change')), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-700"
    }, diff ? viewText('simplified.adapt_preview_hint', 'Removed words are struck through and new words are underlined. Nothing changes until you apply it.') : viewText('simplified.adapt_preview_plain', 'The proposed text is shown below. Nothing changes until you apply it.')), /*#__PURE__*/React.createElement("div", {
      role: "region",
      tabIndex: 0,
      "aria-label": viewText('simplified.adapt_proposed', 'Proposed text'),
      "data-adaptation-diff": true,
      className: "max-h-80 overflow-y-auto whitespace-pre-wrap rounded border border-indigo-100 bg-white p-3 text-base leading-relaxed text-slate-900",
      style: {
        overflowWrap: 'anywhere'
      }
    }, diff ? diff.map((part, index) => part.type === 'same' ? /*#__PURE__*/React.createElement(React.Fragment, {
      key: index
    }, part.value) : part.type === 'del' ? /*#__PURE__*/React.createElement("del", {
      key: index,
      className: "bg-red-100 text-red-900"
    }, part.value) : /*#__PURE__*/React.createElement("ins", {
      key: index,
      className: "bg-green-100 text-green-900"
    }, part.value)) : String(adaptPreview.data || '')), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-700"
    }, saveOriginalOnAdjust ? viewText('simplified.adapt_apply_keeps', 'Applying saves this as a new version and keeps the current one.') : viewText('simplified.adapt_apply_replaces', 'Applying replaces the current text. You can go back afterward.')), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap justify-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-adaptation-apply": true,
      onClick: applyAdaptation,
      disabled: isProcessing,
      className: "min-h-11 rounded-lg bg-indigo-700 px-3 font-semibold text-white disabled:opacity-50"
    }, viewText('simplified.adapt_apply', 'Apply this version')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-adaptation-discard": true,
      onClick: () => {
        setAdaptPreview(null);
        setAdaptNotice(viewText('simplified.adapt_discarded', 'Preview discarded. The text is unchanged.'));
      },
      disabled: isProcessing,
      className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3"
    }, viewText('simplified.adapt_discard', 'Discard')))), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "data-adaptation-notice": true,
      className: adaptNotice ? 'text-center text-sm text-indigo-900' : 'sr-only'
    }, adaptNotice), adaptUndoAvailable && /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-adaptation-undo": true,
      onClick: undoAdaptation,
      className: "min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-sm font-semibold text-indigo-900"
    }, viewText('simplified.adapt_back', 'Back to previous version'))));
  }
  var [showComparisonChanges, setShowComparisonChanges] = React.useState(function () {
    try {
      return localStorage.getItem('alloflow_reading_show_changes') === 'on';
    } catch (_) {
      return false;
    }
  });
  var [showReadingGlosses, setShowReadingGlosses] = React.useState(true);
  var [glossDensity, setGlossDensity] = React.useState('all');
  var [glossBusy, setGlossBusy] = React.useState(false);
  var [glossNotice, setGlossNotice] = React.useState('');
  var [glossEditorRequest, setGlossEditorRequest] = React.useState(null);
  var currentGlossSourceRef = React.useRef('');
  currentGlossSourceRef.current = generatedContent?.id + ':' + (capturedSource?.fingerprint || '');
  var supportOwner = findSimplifiedReadingSupportOwner(history, generatedContent, capturedSource);
  var checkedSupports = capturedSource && readingContract?.validateReadingSupports ? readingContract.validateReadingSupports(supportOwner || generatedContent, supportOwner?.readingSupports) : null;
  var audioGlosses = readingContract?.selectReadingSupports ? readingContract.selectReadingSupports(supportOwner || generatedContent, checkedSupports, {
    density: glossDensity
  }) : checkedSupports?.annotations || [];
  var activeGlosses = showReadingGlosses ? audioGlosses : [];
  function renderSimplifiedComparison() {
    var resolved = resolveSimplifiedCompareSource(history, generatedContent, inputText);
    var candidates = (history || []).filter(item => item.id !== generatedContent.id && ['analysis', 'simplified'].includes(item.type) && getArtifactReadingText(item));
    var selected = isTeacherMode ? candidates.find(item => String(item.id) === comparisonSourceId) : null;
    var original = selected ? {
      text: getArtifactReadingText(selected),
      artifact: selected,
      selection: 'educator-selected'
    } : resolved;
    var originalLanguage = original.artifact?.config?.language || original.artifact?.instructionalText?.complexity?.language || '';
    var adaptedParts = getSideBySideContent(simplifiedDisplayBody);
    // The canonical source is complete, including any bilingual blocks.
    var sourceParts = original.selection === 'captured-source' ? null : getSideBySideContent(original.text);
    var effectiveLanguage = comparisonLanguage === 'auto' ? adaptedParts && simplifiedLanguageTag(originalLanguage)?.startsWith('en') ? 'english' : 'adapted' : comparisonLanguage;
    var targetText = adaptedParts ? effectiveLanguage === 'english' ? adaptedParts.targetFull : adaptedParts.sourceFull : simplifiedDisplayBody;
    var sourceText = sourceParts ? effectiveLanguage === 'english' ? sourceParts.targetFull : sourceParts.sourceFull : original.text;
    var targetLanguage = effectiveLanguage === 'english' && adaptedParts ? 'English' : readingLanguage;
    if (sourceParts && effectiveLanguage === 'english') originalLanguage = 'English';
    var stripReferences = value => {
      try {
        return splitReferencesFromBody ? splitReferencesFromBody(String(value || '')).body : String(value || '');
      } catch (_) {
        return String(value || '');
      }
    };
    if (original.selection !== 'captured-source') sourceText = stripReferences(sourceText);
    targetText = stripReferences(targetText);
    var comparisonSupportOwner = findSimplifiedComparisonSupportOwner(history, generatedContent, original, sourceText);
    var comparisonSupports = comparisonSupportOwner ? readingContract.validateReadingSupports(comparisonSupportOwner, comparisonSupportOwner.readingSupports) : null;
    var comparisonGlosses = showReadingGlosses ? readingContract?.selectReadingSupports ? readingContract.selectReadingSupports(comparisonSupportOwner, comparisonSupports, {
      density: glossDensity
    }) : comparisonSupports?.annotations || [] : [];
    // Tokenize whitespace too, so comparison preserves paragraphs and line breaks.
    // Bound the quadratic work; long texts use complete, unchanged source panels.
    var oldTokens = simplifiedComparisonPlainText(sourceText).match(/\s+|\S+/g) || [],
      newTokens = simplifiedComparisonPlainText(targetText).match(/\s+|\S+/g) || [];
    var tooLarge = oldTokens.length * newTokens.length > 1000000;
    var mismatch = simplifiedLanguageTag(originalLanguage) && simplifiedLanguageTag(targetLanguage) && simplifiedLanguageTag(originalLanguage).split('-')[0] !== simplifiedLanguageTag(targetLanguage).split('-')[0];
    var showDiff = showComparisonChanges && !tooLarge && !mismatch && sourceText && targetText;
    var passageKey = JSON.stringify([navigationViewKey, readingFingerprint(sourceText), readingFingerprint(targetText)]);
    var sameLanguage = !(original.selection === 'captured-source' && getSideBySideContent(original.text)) && !!(generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || adaptedParts && effectiveLanguage === 'english') && !!originalLanguage && !!targetLanguage && !!simplifiedLanguageTag(originalLanguage) && !!simplifiedLanguageTag(targetLanguage) && !mismatch && !/[+&/]|bilingual|multilingual/i.test(originalLanguage + targetLanguage);
    var sections = linkPassages ? getReadingNavigationSections(targetText) : [];
    var chosenSection = sections[Math.min(linkedSection, Math.max(0, sections.length - 1))];
    var related = relatedPassage?.key === passageKey ? relatedPassage : null;
    var linkedRange = linkPassages && !showDiff && related?.status === 'matched' ? related : null;
    function showRelatedOriginal() {
      if (!chosenSection || showDiff || !sameLanguage) return;
      var result = findRelatedOriginalPassage(sourceText, chosenSection.text, {
        sameLanguage: true
      });
      setRelatedPassage(Object.assign({
        key: passageKey
      }, result));
      focusReadingOffset('adapted', chosenSection.start, false);
      if (result.status === 'matched') focusReadingOffset('source', result.start, true);
    }
    var diff = [];
    if (showDiff) {
      var matrix = Array.from({
        length: oldTokens.length + 1
      }, () => new Uint32Array(newTokens.length + 1));
      for (var a = 1; a <= oldTokens.length; a++) for (var b = 1; b <= newTokens.length; b++) matrix[a][b] = oldTokens[a - 1] === newTokens[b - 1] ? matrix[a - 1][b - 1] + 1 : Math.max(matrix[a - 1][b], matrix[a][b - 1]);
      var x = oldTokens.length,
        y = newTokens.length;
      while (x || y) {
        if (x && y && oldTokens[x - 1] === newTokens[y - 1]) {
          diff.push({
            type: 'same',
            value: oldTokens[--x]
          });
          --y;
        } else if (x && (!y || matrix[x - 1][y] >= matrix[x][y - 1])) diff.push({
          type: 'del',
          value: oldTokens[--x]
        });else diff.push({
          type: 'add',
          value: newTokens[--y]
        });
      }
      diff.reverse();
    }
    var count = text => simplifiedWordSegments(simplifiedPlainInline(text), targetLanguage).filter(part => part.word).length;
    var renderVersion = (kind, raw) => showDiff ? diff.filter(part => part.type !== (kind === 'source' ? 'add' : 'del')).map((part, i) => part.type === 'same' ? /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, part.value) : part.type === 'del' ? /*#__PURE__*/React.createElement("del", {
      key: i,
      className: "bg-red-100 text-red-900"
    }, part.value) : /*#__PURE__*/React.createElement("ins", {
      key: i,
      className: "bg-green-100 text-green-900"
    }, part.value)) : renderExactPassage(raw, kind, kind === 'source' ? originalLanguage : targetLanguage, kind === 'source' ? comparisonGlosses : [], kind === 'source' ? comparisonSupportOwner : null, kind === 'source' ? linkedRange : null, true);
    return /*#__PURE__*/React.createElement("div", {
      "data-reading-comparison": "true",
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-3 rounded-xl bg-white p-4 border border-slate-200"
    }, /*#__PURE__*/React.createElement("label", {
      className: "inline-flex min-h-11 items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      "aria-label": viewText('simplified.compare_show_changes', 'Show changes'),
      checked: showComparisonChanges,
      disabled: !!tooLarge || !!mismatch || !sourceText,
      onChange: event => {
        const next = event.target.checked;
        setShowComparisonChanges(next);
        try {
          localStorage.setItem('alloflow_reading_show_changes', next ? 'on' : 'off');
        } catch (_) {}
      }
    }), viewText('simplified.compare_show_changes', 'Show changes')), comparisonSupports?.annotations?.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
      className: "inline-flex min-h-11 items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      "aria-label": viewText('simplified.compare_show_glosses', 'Show glosses'),
      checked: showReadingGlosses,
      disabled: !!showDiff,
      onChange: event => setShowReadingGlosses(event.target.checked)
    }), viewText('simplified.compare_show_glosses', 'Show glosses')), /*#__PURE__*/React.createElement("label", null, viewText('simplified.compare_gloss_density', 'Gloss density'), ' ', /*#__PURE__*/React.createElement("select", {
      "aria-label": viewText('simplified.compare_gloss_density', 'Gloss density'),
      value: glossDensity,
      disabled: !!showDiff,
      onChange: event => setGlossDensity(event.target.value),
      className: "min-h-11 rounded border p-2"
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, viewText('simplified.compare_all_supports', 'All supports')), /*#__PURE__*/React.createElement("option", {
      value: "light"
    }, viewText('simplified.compare_lighter', 'Lighter')))), showDiff && /*#__PURE__*/React.createElement("span", {
      className: "self-center text-sm text-slate-600"
    }, viewText('simplified.compare_turn_off_show_changes_to_read', 'Turn off Show changes to read inline glosses.'))), isTeacherMode && /*#__PURE__*/React.createElement("label", {
      className: "min-w-0 flex-1 text-sm font-semibold"
    }, readerText('simplified.compare_source', 'Source version'), /*#__PURE__*/React.createElement("select", {
      value: comparisonSourceId,
      onChange: e => updateComparisonPreference('source', e.target.value),
      className: "mt-1 block w-full min-w-0 rounded border border-slate-300 p-2"
    }, /*#__PURE__*/React.createElement("option", {
      value: "linked"
    }, readerText('simplified.linked_source', 'Linked source / original')), candidates.map(item => /*#__PURE__*/React.createElement("option", {
      key: item.id,
      value: String(item.id)
    }, item.title || item.topic || item.id)))), adaptedParts && /*#__PURE__*/React.createElement("label", {
      className: "min-w-0 flex-1 text-sm font-semibold"
    }, readerText('simplified.compare_language', 'Adapted version'), /*#__PURE__*/React.createElement("select", {
      value: comparisonLanguage,
      onChange: e => updateComparisonPreference('language', e.target.value),
      className: "mt-1 block w-full rounded border border-slate-300 p-2"
    }, /*#__PURE__*/React.createElement("option", {
      value: "auto"
    }, readerText('simplified.compare_auto', 'Match source language when known')), /*#__PURE__*/React.createElement("option", {
      value: "adapted"
    }, readingLanguage), /*#__PURE__*/React.createElement("option", {
      value: "english"
    }, simplifiedEnglishTranslationLabel))), /*#__PURE__*/React.createElement("label", {
      className: "inline-flex min-h-11 items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      "aria-label": viewText('simplified.compare_link_passages', 'Link passages'),
      checked: linkPassages,
      onChange: event => {
        setLinkPassages(event.target.checked);
        setRelatedPassage(null);
      }
    }), viewText('simplified.compare_link_passages', 'Link passages'))), linkPassages && /*#__PURE__*/React.createElement("div", {
      "data-reading-passage-links": true,
      className: "rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-indigo-950"
    }, viewText('simplified.compare_choose_a_passage_from_the_adaptation', 'Choose a passage from the adaptation to look for related wording in the original. A link suggests a place to read; it does not verify the adaptation.')), showDiff ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, viewText('simplified.compare_turn_off_show_changes_to_link', 'Turn off Show changes to link passages.')) : !sameLanguage ? /*#__PURE__*/React.createElement("p", {
      role: "status"
    }, viewText('simplified.compare_passage_links_need_two_versions_in', 'Passage links need two versions in the same known language.')) : /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-end gap-3"
    }, /*#__PURE__*/React.createElement("label", {
      className: "min-w-0 flex-1 text-sm font-semibold"
    }, viewText('simplified.compare_adapted_passage', 'Adapted passage'), /*#__PURE__*/React.createElement("select", {
      "aria-label": viewText('simplified.compare_adapted_passage', 'Adapted passage'),
      value: chosenSection?.index || 0,
      onChange: event => {
        setLinkedSection(Number(event.target.value));
        setRelatedPassage(null);
      },
      className: "mt-1 block w-full min-w-0 rounded border border-slate-300 p-2"
    }, sections.map(section => /*#__PURE__*/React.createElement("option", {
      key: section.index,
      value: section.index
    }, section.index + 1, ". ", section.text.replace(/\s+/g, ' ').slice(0, 85))))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: showRelatedOriginal,
      disabled: !chosenSection || !sourceText,
      className: "min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-indigo-900 disabled:opacity-50"
    }, viewText('simplified.compare_show_related_original', 'Show related original'))), !showDiff && related && /*#__PURE__*/React.createElement("p", {
      role: "status",
      "aria-live": "polite"
    }, related.status === 'matched' ? viewText('simplified.compare_related_wording_highlighted_in_the_origi', 'Related wording highlighted in the original. Read the surrounding passage to check meaning.') : related.status === 'ambiguous' ? viewText('simplified.compare_more_than_one_original_passage_has', 'More than one original passage has similar wording. Read the original to choose the right context.') : viewText('simplified.compare_no_reliable_passage_link_was_found', 'No reliable passage link was found. You can still read both complete versions.'))), original.selection === 'original-not-captured' && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "rounded bg-amber-50 p-3 text-sm text-amber-900"
    }, readerText('simplified.compare_fallback', 'Original not captured. Open or attach the matching source; another lesson will not be substituted.')), (tooLarge || mismatch) && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "rounded bg-indigo-50 p-3 text-sm text-indigo-900"
    }, mismatch ? readerText('simplified.compare_different_languages', 'These versions use different languages. Read them side by side; word change highlighting is unavailable.') : readerText('simplified.compare_long_text', 'For this long reading, complete versions are shown without word change highlighting.')), isTeacherMode && /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600"
    }, readerText('simplified.compare_word_count', 'Word counts'), ": ", count(sourceText), " → ", count(targetText), ". ", readerText('simplified.compare_review_hint', 'Check key ideas, terminology, examples, and citations before sharing. Word changes alone do not establish accuracy.')), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, [{
      key: 'source',
      title: t('simplified.diff_original'),
      text: sourceText,
      language: originalLanguage
    }, {
      key: 'adapted',
      title: t('simplified.diff_adapted'),
      text: targetText,
      language: targetLanguage
    }].map(version => /*#__PURE__*/React.createElement("section", {
      key: version.key,
      className: "min-w-0 rounded-xl border border-slate-300 bg-white p-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "mb-3 font-bold"
    }, version.title, version.language ? ' · ' + version.language : ''), /*#__PURE__*/React.createElement("div", {
      className: "mb-3 flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-comparison-karaoke": version.key,
      disabled: !version.text || !KaraokeReaderOverlay,
      className: "min-h-11 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
      "aria-label": version.key === 'source' ? readerText('simplified.listen_along_original', 'Listen along to the original') : readerText('simplified.listen_along_adapted', 'Listen along to the adapted text'),
      onClick: () => {
        if (typeof stopPlayback === 'function') stopPlayback();
        var entries = getReadAloudSentenceEntriesForText(version.text, version.language || readingLanguage);
        setComparisonKaraoke({
          text: version.text,
          language: version.language || readingLanguage,
          entries,
          sentences: entries.map(entry => entry.text),
          languages: entries.map(entry => simplifiedLanguageTag(entry.language))
        });
      }
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 16,
      "aria-hidden": "true"
    }), readerText('simplified.listen_along', 'Listen along')), version.key === 'source' && props.onReadOriginal && original.text && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "min-h-11 rounded border border-indigo-300 px-3 text-indigo-900",
      onClick: () => openOriginalReading(selected ? original.artifact : capturedSource ? generatedContent : original.artifact, original.text, true)
    }, viewText('simplified.compare_open_original_reader', 'Open original reader'))), /*#__PURE__*/React.createElement("div", {
      "data-compare-version": version.key,
      "data-word-help-language": version.key === 'adapted' && showReadingGlosses && !showDiff && !(adaptedParts && effectiveLanguage === 'english') ? targetLanguage : undefined,
      lang: simplifiedLanguageTag(version.language),
      dir: getContentDirection(version.language),
      style: {
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxHeight: '70vh',
        overflowY: 'auto'
      },
      tabIndex: 0,
      role: "region",
      "aria-label": version.title
    }, renderVersion(version.key, version.text)), version.key === 'source' && !showDiff && renderPictureCredits(comparisonGlosses), version.key === 'source' && isTeacherMode && comparisonSupportOwner && props.onUpdateReadingSupports && /*#__PURE__*/React.createElement(ReadingGlossEditor, {
      key: comparisonSupportOwner.id,
      item: comparisonSupportOwner,
      supports: comparisonSupports,
      request: glossEditorRequest,
      onUpdate: props.onUpdateReadingSupports,
      disabled: isProcessing
    })))), showReadingGlosses && !showDiff && /*#__PURE__*/React.createElement(AdaptedWordHelp, {
      key: generatedContent?.id,
      item: generatedContent,
      teacher: false,
      passageSelector: "[data-compare-version=\"adapted\"]",
      language: targetLanguage,
      markWords: !(adaptedParts && effectiveLanguage === 'english'),
      languageTag: simplifiedLanguageTag(readingLanguage),
      direction: typeof getContentDirection === 'function' ? getContentDirection(readingLanguage) : undefined,
      onListen: text => speakExactPassage(text, 'adapted-word-help', readingLanguage),
      listening: isExactPassagePlaying('adapted-word-help'),
      renderCredits: renderPictureCredits
    }));
  }
  function isExactPassagePlaying(pane) {
    return !!isPlaying && playingContentId === 'reading-' + generatedContent.id + '-' + pane;
  }
  function speakExactPassage(text, pane, language) {
    var wasPlaying = isExactPassagePlaying(pane);
    if (typeof stopPlayback === 'function') stopPlayback();
    if (wasPlaying) return;
    if (typeof handleSpeak === 'function') handleSpeak(text, 'reading-' + generatedContent.id + '-' + pane, 0, true, language || readingLanguage);
  }
  // Credits for pictures shown beside word supports (their licences require it).
  function renderPictureCredits(annotations) {
    var pictured = (annotations || []).filter(entry => entry.image && entry.image.attribution);
    if (!pictured.length) return null;
    var line = attribution => window.AlloModules?.AltText?.openImageCreditLine ? window.AlloModules.AltText.openImageCreditLine(attribution) : [attribution.set, attribution.author, attribution.license].filter(Boolean).join(' · ');
    return /*#__PURE__*/React.createElement("div", {
      "data-reading-picture-credits": true,
      className: "mt-4 border-t border-slate-200 pt-2 text-xs text-slate-700"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-semibold"
    }, viewText('simplified.original_picture_credits', 'Picture credits')), /*#__PURE__*/React.createElement("ul", {
      className: "mt-1 space-y-1"
    }, pictured.map(entry => /*#__PURE__*/React.createElement("li", {
      key: entry.id,
      className: "break-words"
    }, entry.quote, ": ", line(entry.image.attribution), /^https:\/\//i.test(entry.image.attribution.url || '') && /*#__PURE__*/React.createElement(React.Fragment, null, " · ", /*#__PURE__*/React.createElement("a", {
      href: entry.image.attribution.url,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "underline"
    }, viewText('simplified.original_source', 'Source'))), /^https:\/\//i.test(entry.image.attribution.licenseUrl || '') && /*#__PURE__*/React.createElement(React.Fragment, null, " · ", /*#__PURE__*/React.createElement("a", {
      href: entry.image.attribution.licenseUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "underline"
    }, viewText('simplified.original_license', 'License')))))));
  }
  function renderExactPassage(raw, pane, language, annotations, annotationOwner, relatedRange, formatted) {
    var blocks = simplifiedExactBlocks(raw, formatted);
    var headingLevels = blocks.filter(block => block.type === 'heading').map(block => block.level);
    var renderBlock = function (block) {
      var line = block.raw,
        lineIndex = block.lineIndex,
        lineStart = block.start;
      if (block.type === 'hidden') return null;
      // Headings, quotes and dividers end their own line, so the line break after
      // one is not drawn: it doubled the gap before the next blank line.
      if (block.type === 'rule') return /*#__PURE__*/React.createElement("hr", {
        key: lineIndex,
        "aria-hidden": "true",
        style: {
          border: 0,
          borderTop: '1px solid currentColor',
          opacity: 0.25,
          marginBlock: '0.5em'
        }
      });
      if (!line) return /*#__PURE__*/React.createElement(React.Fragment, {
        key: lineIndex
      }, block.separator);
      var hasLineGloss = (annotations || []).some(entry => entry.end > lineStart && entry.end <= lineStart + line.length);
      // Plain reading does not need a React node or word segmentation for every token.
      var wordIndex = 0;
      var renderLeaf = function (text, offset, interactive) {
        var parts = ['define', 'phonics'].includes(interactionMode) && interactive !== false || hasLineGloss ? simplifiedWordSegments(text, language) : [{
            text,
            word: false
          }],
          wordOffset = 0;
        return parts.map(function (part, index) {
          var start = offset + wordOffset;
          wordOffset += part.text.length;
          var glosses = (annotations || []).filter(entry => entry.end > start && entry.end <= offset + wordOffset);
          var node = part.text;
          if (part.word && interactive !== false && ['define', 'phonics'].includes(interactionMode)) {
            var activate = event => {
              event.stopPropagation();
              if (interactionMode === 'phonics') {
                handlePhonicsClick(part.text, event, {
                  audioPlayback: 'reader',
                  language
                });
                return;
              }
              var helpPane = pane === 'adapted' ? event.currentTarget.closest('[data-word-help-language]') : null;
              if (!openWordHelpCard(event, helpPane, helpPane && helpPane.getAttribute('data-word-help-language'))) handleWordClick(part.text, event, {
                text: raw,
                language
              });
            };
            node = /*#__PURE__*/React.createElement("span", {
              role: "button",
              tabIndex: wordIndex++ === 0 ? 0 : -1,
              "data-exact-word": "true",
              "aria-label": interactionMode === 'phonics' ? viewText('simplified.original_word_sounds_for', 'Word sounds: {word}', {
                word: part.text
              }) : viewText('simplified.original_define_word', 'Define: {word}', {
                word: part.text
              }),
              onClick: activate,
              onKeyDown: event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activate(event);
                } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  const nodes = Array.from(event.currentTarget.closest('[data-reading-paragraph]').querySelectorAll('[data-exact-word]'));
                  const delta = (event.key === 'ArrowRight' ? 1 : -1) * (getContentDirection(language) === 'rtl' ? -1 : 1);
                  const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 : Math.max(0, Math.min(nodes.length - 1, nodes.indexOf(event.currentTarget) + delta));
                  event.preventDefault();
                  nodes[next]?.focus();
                }
              },
              onFocus: event => {
                event.currentTarget.closest('[data-reading-paragraph]').querySelectorAll('[data-exact-word]').forEach(n => n.tabIndex = n === event.currentTarget ? 0 : -1);
              },
              className: "cursor-help rounded hover:bg-yellow-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
            }, part.text);
          }
          return /*#__PURE__*/React.createElement(React.Fragment, {
            key: index
          }, node, glosses.map(entry => /*#__PURE__*/React.createElement("span", {
            role: "group",
            key: entry.id,
            "data-reading-gloss": true,
            className: "mx-1 rounded bg-indigo-50 px-1 text-base text-indigo-900",
            "aria-label": viewText('simplified.original_gloss_for', 'Gloss for {word}', {
              word: entry.quote
            })
          }, entry.image && /*#__PURE__*/React.createElement("img", {
            src: entry.image.src,
            alt: entry.image.alt || '',
            "data-reading-gloss-picture": true,
            className: "mx-1 inline-block h-12 w-12 rounded bg-white object-contain align-middle"
          }), " (", entry.definition || entry.explanation || entry.text, ")", isTeacherMode && annotationOwner && props.onUpdateReadingSupports && /*#__PURE__*/React.createElement("button", {
            type: "button",
            "aria-label": viewText('simplified.original_edit_explanation_for', 'Edit explanation for {word}', {
              word: entry.quote
            }),
            disabled: isProcessing,
            onClick: event => {
              event.stopPropagation();
              setGlossEditorRequest(previous => ({
                ownerId: annotationOwner.id,
                id: entry.id,
                serial: (previous?.serial || 0) + 1
              }));
            },
            className: "ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-indigo-200 px-2 text-xs font-semibold text-indigo-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
          }, viewText('common.edit', 'Edit')))));
        });
      };
      var content = formatted ? simplifiedInline(block.text, renderLeaf, block.textStart) : renderLeaf(line, lineStart);
      var Tag = block.type === 'heading' ? simplifiedHeadingTag(block.level, headingLevels) : block.type === 'quote' ? 'blockquote' : 'span';
      var markdownStyle = block.type === 'heading' ? {
        fontWeight: 750,
        fontSize: block.level === 1 ? '1.5em' : block.level === 2 ? '1.3em' : '1.15em',
        marginBlock: '0.6em 0.3em'
      } : block.type === 'quote' ? {
        borderInlineStart: '3px solid #a5b4fc',
        paddingInlineStart: '1em'
      } : undefined;
      var isRelated = !!relatedRange && relatedRange.end > lineStart && relatedRange.start < lineStart + line.length;
      const explain = event => {
        if (interactionMode !== 'explain') return;
        const selected = window.getSelection?.().toString().trim();
        const rect = event.currentTarget.getBoundingClientRect();
        setSelectionMenu({
          text: selected || (formatted ? simplifiedPlainInline(block.text) : line),
          language,
          x: rect.left,
          y: rect.bottom
        });
      };
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: lineIndex
      }, /*#__PURE__*/React.createElement(Tag, {
        style: markdownStyle,
        "data-reading-offset-start": lineStart,
        "data-reading-offset-end": lineStart + line.length,
        "data-related-original": isRelated ? "true" : undefined,
        "data-reading-language": language,
        "data-reading-paragraph": pane + '-' + lineIndex,
        lang: simplifiedLanguageTag(language),
        dir: getContentDirection(language),
        role: interactionMode === 'explain' ? 'button' : undefined,
        tabIndex: interactionMode === 'explain' || isLineFocusMode ? 0 : undefined,
        onClick: explain,
        onKeyDown: event => {
          if (interactionMode === 'explain' && ['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            explain(event);
          }
        },
        onFocus: () => {
          if (isLineFocusMode && typeof setFocusedParagraphIndex === 'function') setFocusedParagraphIndex(pane + '-' + lineIndex);
        },
        className: isRelated ? 'bg-indigo-100 outline outline-2 outline-indigo-500 text-slate-950' : isLineFocusMode ? focusedParagraphIndex === pane + '-' + lineIndex || focusedParagraphIndex == null && lineIndex === 0 ? 'bg-yellow-100 text-slate-950' : 'opacity-50' : ''
      }, content), block.type === 'heading' || block.type === 'quote' ? null : block.separator);
    };
    return formatted ? simplifiedNestLists(blocks, renderBlock) : blocks.map(renderBlock);
  }
  var returnComparisonItem = protectedOriginal && comparisonReturn && generatedContent.data === comparisonReturn.expectedText && readingContract?.sameReadingSourceFamily?.(generatedContent, comparisonReturn.sourceItem) && (history || []).find(item => item.id === comparisonReturn.id && readingFingerprint(item.data) === comparisonReturn.fingerprint && readingScopeIdentity(item) === comparisonReturn.scope && getSimplifiedInstructionalText(item).form === 'adapted');
  function switchReadingVersion(item, compare) {
    if (!item || item.id === generatedContent?.id && !!compare === !!isCompareMode) return;
    prepareReadingNavigation(compare ? 'both' : 'adapted', false);
    if (typeof stopPlayback === 'function') stopPlayback();
    if (props.onOpenReadingArtifact) props.onOpenReadingArtifact(item, compare);else {
      chooseReadingMode('read');
      setGeneratedContent?.(item);
      setIsCompareMode?.(!!compare);
    }
  }
  var versionControls = /*#__PURE__*/React.createElement("div", {
    "data-reading-versions": true,
    className: "my-3 flex flex-wrap items-center gap-2",
    role: "group",
    "aria-label": viewText('simplified.reader_reading_versions', 'Reading versions')
  }, props.onReadOriginal && /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: !capturedSource && !protectedOriginal,
    "aria-pressed": protectedOriginal && !isCompareMode,
    className: `min-h-11 rounded-lg border px-3 disabled:opacity-50 ${protectedOriginal && !isCompareMode ? 'bg-indigo-700 text-white border-indigo-700' : 'border-indigo-300'}`,
    "data-reading-version": "original",
    onClick: () => openOriginalReading(generatedContent, capturedSource?.text, false)
  }, viewText('simplified.reader_original', 'Original')), (companion || !protectedOriginal) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": !protectedOriginal && !isCompareMode,
    className: `min-h-11 rounded-lg border px-3 ${!protectedOriginal && !isCompareMode ? 'bg-indigo-700 text-white border-indigo-700' : 'border-indigo-300'}`,
    "data-reading-version": "adapted",
    onClick: () => switchReadingVersion(companion || generatedContent, false)
  }, viewText('simplified.diff_adapted', 'Adapted')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": isCompareMode,
    disabled: !capturedSource,
    className: `min-h-11 rounded-lg border px-3 disabled:opacity-50 ${isCompareMode ? 'bg-indigo-700 text-white border-indigo-700' : 'border-indigo-300'}`,
    "data-reading-version": "both",
    onClick: () => switchReadingVersion(companion || generatedContent, true)
  }, viewText('simplified.reader_both', 'Both'))), returnComparisonItem && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 rounded-lg border border-indigo-300 px-3",
    onClick: () => switchReadingVersion(returnComparisonItem, true)
  }, viewText('simplified.reader_back_to_comparison', 'Back to comparison')), protectedOriginal && isTeacherMode && props.onCreateAdaptedCompanion && /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: isProcessing,
    onClick: () => props.onCreateAdaptedCompanion(generatedContent),
    className: "min-h-11 rounded-lg bg-indigo-700 px-3 text-white disabled:opacity-50"
  }, viewText('simplified.reader_create_adapted_companion', 'Create adapted companion')));
  function renderOriginalReading() {
    return /*#__PURE__*/React.createElement("div", {
      "data-simplified-reading-body": "true",
      style: {
        maxWidth: readingColumn + 'ch',
        marginInline: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-3 flex flex-wrap items-center gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reader-listen": true,
      onClick: () => speakExactPassage(simplifiedReadAloudText, 'original', readingLanguage),
      className: "min-h-11 rounded-lg bg-indigo-700 px-3 text-white"
    }, isExactPassagePlaying('original') ? viewText('simplified.original_stop_original', 'Stop original') : viewText('simplified.original_listen_to_original', 'Listen to original')), checkedSupports?.annotations?.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
      className: "inline-flex min-h-11 items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: showReadingGlosses,
      onChange: e => setShowReadingGlosses(e.target.checked)
    }), viewText('simplified.compare_show_glosses', 'Show glosses')), /*#__PURE__*/React.createElement("label", null, viewText('simplified.compare_gloss_density', 'Gloss density'), ' ', /*#__PURE__*/React.createElement("select", {
      value: glossDensity,
      onChange: e => setGlossDensity(e.target.value),
      className: "min-h-11 rounded border p-2"
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, viewText('simplified.compare_all_supports', 'All supports')), /*#__PURE__*/React.createElement("option", {
      value: "light"
    }, viewText('simplified.compare_lighter', 'Lighter')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "min-h-11 rounded border px-3",
      onClick: () => {
        let audio = '',
          from = 0;
        audioGlosses.forEach(entry => {
          audio += simplifiedReadAloudText.slice(from, entry.end) + '. ' + (entry.definition || entry.explanation || entry.text) + '. ';
          from = entry.end;
        });
        audio += simplifiedReadAloudText.slice(from);
        speakExactPassage(audio, 'glosses-' + audioGlosses.length, readingLanguage);
      }
    }, isExactPassagePlaying('glosses-' + audioGlosses.length) ? viewText('simplified.original_stop_gloss_reading', 'Stop gloss reading') : viewText('simplified.original_listen_with_glosses', 'Listen with glosses'))), isTeacherMode && props.onGenerateReadingSupports && /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: glossBusy || !verifiedOriginal,
      className: "min-h-11 rounded border border-indigo-300 px-3 disabled:opacity-50",
      onClick: async () => {
        const request = currentGlossSourceRef.current;
        setGlossBusy(true);
        setGlossNotice('');
        try {
          const result = await props.onGenerateReadingSupports(generatedContent);
          if (request === currentGlossSourceRef.current) setGlossNotice(result?.status === 'unavailable' ? viewText('simplified.original_word_supports_could_not_be_generated', 'Word supports could not be generated. The original is unchanged.') : result?.status === 'partial' ? viewText('simplified.original_some_words_could_not_be_supported', 'Some words could not be supported. The original is unchanged.') : viewText('simplified.original_word_supports_are_ready', 'Word supports are ready.'));
        } catch (error) {
          if (request === currentGlossSourceRef.current) setGlossNotice(error?.message || viewText('simplified.original_word_supports_could_not_be_generated', 'Word supports could not be generated. The original is unchanged.'));
        } finally {
          setGlossBusy(false);
        }
      }
    }, glossBusy ? viewText('simplified.original_adding_word_supports', 'Adding word supports…') : checkedSupports?.annotations?.length ? viewText('simplified.original_refresh_suggested_supports', 'Refresh suggested supports') : viewText('simplified.original_add_word_supports', 'Add word supports'))), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "data-gloss-status": true,
      className: glossNotice ? 'my-3 rounded bg-indigo-50 p-3 text-indigo-900' : 'sr-only'
    }, glossNotice), isTeacherMode && verifiedOriginal && props.onUpdateReadingSupports && /*#__PURE__*/React.createElement(ReadingGlossEditor, {
      key: generatedContent.id,
      item: generatedContent,
      supports: checkedSupports,
      request: glossEditorRequest,
      onUpdate: props.onUpdateReadingSupports,
      disabled: isProcessing
    }), /*#__PURE__*/React.createElement("div", {
      "data-reading-passage": "true",
      "data-original-source": "true",
      role: "region",
      "aria-label": viewText('simplified.original_original_reading', 'Original reading'),
      tabIndex: -1,
      ref: readingStartRef,
      style: {
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere'
      },
      className: "text-lg leading-relaxed"
    }, renderExactPassage(simplifiedReadAloudText, 'original', readingLanguage, activeGlosses, generatedContent, null, true)), renderPictureCredits(activeGlosses));
  }
  function renderSimplifiedReading() {
    var parts = getSideBySideContent(simplifiedReadAloudText);
    var languages = parts ? [{
      key: 'src',
      label: readingLanguage,
      paragraphs: parts.source
    }, {
      key: 'tgt',
      label: 'English',
      paragraphs: parts.target
    }] : [{
      key: 'mono',
      label: readingLanguage,
      paragraphs: simplifiedReadAloudText.split(/\n{2,}/)
    }];
    var isWordMode = ['define', 'phonics', 'add-glossary'].includes(interactionMode);
    var isSelectionMode = ['explain', 'revise'].includes(interactionMode);
    var sentenceCursor = 0;
    var renderedSentenceIds = new Set();
    var rendered = languages.map(function (section) {
      var headingLevels = simplifiedHeadingLevels(section.paragraphs.join('\n'));
      return section.paragraphs.map(function (paragraph, paragraphIndex) {
        var paragraphId = section.key === 'mono' ? paragraphIndex : section.key + '-' + paragraphIndex;
        if (/^\[\[CHART:/.test(paragraph.trim())) return /*#__PURE__*/React.createElement("div", {
          key: paragraphId,
          "data-reading-chart": "true",
          className: "my-4 max-w-full overflow-x-auto"
        }, renderFormattedText(paragraph, false));
        if (paragraph.trim().startsWith('|') || paragraph.includes('\n|')) return /*#__PURE__*/React.createElement("div", {
          key: paragraphId,
          "data-reading-table": "true",
          lang: simplifiedLanguageTag(section.label),
          dir: section.key === 'tgt' ? 'ltr' : getContentDirection(section.label),
          className: "my-4 max-w-full overflow-x-auto",
          tabIndex: 0,
          role: "region",
          "aria-label": readerText('simplified.table_label', 'Reading table')
        }, renderFormattedText(paragraph, false));
        var startIdx = sentenceCursor;
        var blocks = simplifiedParagraphBlocks(paragraph).map(function (block) {
          block.start = sentenceCursor;
          block.sentences = splitTextToSentences(block.raw);
          sentenceCursor += block.sentences.length;
          return block;
        });
        // Playback numbers the sentences of the whole paragraph (phase_k handleSpeak).
        // Where the block split differs (a list item's last line running into the
        // next line), each part takes the number of the spoken sentence it starts
        // in, so every later click and highlight stays on the same words.
        var spoken = splitTextToSentences(paragraph);
        if (spoken.length !== sentenceCursor - startIdx) {
          var letters = value => String(value || '').replace(/[^\p{L}\p{N}]+/gu, '').length;
          var spokenStarts = [],
            letterCount = 0;
          spoken.forEach(sentence => {
            spokenStarts.push(letterCount);
            letterCount += letters(sentence);
          });
          letterCount = 0;
          blocks.forEach(block => {
            block.indices = block.sentences.map(sentence => {
              var j = 0;
              while (j + 1 < spokenStarts.length && spokenStarts[j + 1] <= letterCount) j++;
              letterCount += letters(sentence);
              return startIdx + j;
            });
          });
          sentenceCursor = startIdx + spoken.length;
        }
        var endIdx = sentenceCursor;
        var shouldFocus = isPlaying && playingContentId === 'simplified-main' ? playbackState.currentIdx >= startIdx && playbackState.currentIdx < endIdx : focusedParagraphIndex === paragraphId || focusedParagraphIndex == null && paragraphIndex === 0;
        var wordIndex = 0;
        var sentenceOrder = 0;
        // One Tab stop per paragraph; arrow keys, Home and End move within it.
        var claimRovingStop = function (event, selector) {
          var group = event.currentTarget.closest('[data-reading-paragraph]');
          if (group) group.querySelectorAll(selector).forEach(function (node) {
            node.tabIndex = node === event.currentTarget ? 0 : -1;
          });
        };
        var moveRovingStop = function (event, selector) {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          var group = event.currentTarget.closest('[data-reading-paragraph]');
          if (!group) return;
          var items = Array.from(group.querySelectorAll(selector));
          var delta = (event.key === 'ArrowRight' ? 1 : -1) * (group.dir === 'rtl' ? -1 : 1);
          var next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, items.indexOf(event.currentTarget) + delta));
          event.preventDefault();
          items[next]?.focus();
        };
        var renderWords = function (text) {
          return simplifiedWordSegments(text, section.label).map(function (part, index) {
            if (!part.word) return /*#__PURE__*/React.createElement(React.Fragment, {
              key: index
            }, part.text);
            var order = wordIndex++;
            var label = interactionMode === 'phonics' ? simplifiedHearPhonicsLabel : interactionMode === 'add-glossary' ? readerText('common.click_add_glossary', 'Add to glossary') : simplifiedDefineLabel;
            var activate = function (event) {
              event.stopPropagation();
              if (interactionMode === 'phonics') handlePhonicsClick(part.text, event, {
                audioPlayback: 'reader'
              });else if (interactionMode === 'add-glossary') handleQuickAddGlossary(part.text, true);else if (!openWordHelpCard(event, event.currentTarget.closest('[data-reading-passage]'), readingLanguage)) handleWordClick(part.text, event);
            };
            return /*#__PURE__*/React.createElement("span", {
              key: index,
              "data-reading-word": order,
              role: "button",
              tabIndex: order === 0 ? 0 : -1,
              "aria-label": label + ': ' + part.text,
              title: label,
              onClick: activate,
              onFocus: function (event) {
                claimRovingStop(event, '[data-reading-word]');
              },
              onKeyDown: function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activate(event);
                  return;
                }
                moveRovingStop(event, '[data-reading-word]');
              },
              className: "cursor-help rounded px-0.5 hover:bg-yellow-100 focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
            }, part.text);
          });
        };
        var renderBlock = function (block, key) {
          if (block.type === 'rule') return /*#__PURE__*/React.createElement("hr", {
            key: key,
            "aria-hidden": "true",
            style: {
              border: 0,
              borderTop: '1px solid currentColor',
              opacity: 0.25,
              marginBlock: '1em'
            }
          });
          var Tag = block.type === 'heading' ? simplifiedHeadingTag(block.level, headingLevels) : block.type === 'quote' ? 'blockquote' : block.type === 'li' ? 'span' : 'p';
          var text = block.text === undefined ? block.raw : block.text;
          var content;
          if (isWordMode) content = simplifiedInline(text, renderWords);else content = block.sentences.map(function (sentence, index) {
            var currentGlobalIdx = block.indices ? block.indices[index] : block.start + index;
            var firstPart = !renderedSentenceIds.has(currentGlobalIdx);
            renderedSentenceIds.add(currentGlobalIdx);
            var cleanText = sentence.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*<\/?h[1-6][^>]*>/gi, '').replace(/<\/h[1-6]>\s*$/i, '').replace(/^\s*(?:[-+*]|\d+[.)])\s+/, '').replace(/^\s*>\s?/, '');
            var active = playingContentId === 'simplified-main' && playbackState.currentIdx === currentGlobalIdx;
            if (interactionMode === 'cloze') return /*#__PURE__*/React.createElement("span", {
              key: index
            }, formatInteractiveText(cleanText, true, !!isLineFocusMode, 's' + currentGlobalIdx + (firstPart ? '' : '.' + key + '.' + index)), " ");
            // A button's content is hidden from screen readers, so a link inside the
            // sentence button could not be heard or opened. Links at the end go after
            // the button; a sentence with a link inside it stays plain text and gets
            // its own read button, shown when it has focus.
            var trailingLinks = (cleanText.match(/(?:\s*\[[^\]]*\]\([^)]*\))+\s*$/) || [''])[0];
            var sentenceText = trailingLinks ? cleanText.slice(0, cleanText.length - trailingLinks.length) : cleanText;
            var innerLink = /\[[^\]]*\]\([^)]*\)/.test(sentenceText);
            var speakSentence = function (event) {
              var control = event.target.closest('a,button,input,select,textarea');
              if (control && control !== event.currentTarget) return;
              // A drag-selection is handled on mouseup; a leftover selection must not block Enter.
              if (event.type === 'click' && window.getSelection && window.getSelection().toString().trim()) return;
              event.stopPropagation();
              if (interactionMode === 'explain') {
                event.currentTarget.focus();
                var rect = event.currentTarget.getBoundingClientRect();
                setSelectionMenu({
                  text: simplifiedPlainInline(cleanText),
                  language: section.label,
                  x: rect.left + rect.width / 2,
                  y: rect.top
                });
              } else if (interactionMode === 'revise') {
                // Mouse users drag or double-click to choose words. Keyboard and screen
                // reader activation (detail 0) selects the sentence and opens the same menu.
                if (event.type === 'click' && event.detail > 0) return;
                var node = event.currentTarget.closest('[data-reading-sentence]'),
                  range = document.createRange(),
                  selection = window.getSelection();
                var readButton = node.querySelector('[data-sentence-read]');
                event.currentTarget.focus();
                range.selectNodeContents(node);
                if (readButton) range.setEndBefore(readButton);
                selection.removeAllRanges();
                selection.addRange(range);
                handleTextMouseUp({
                  currentTarget: node.closest('[data-reading-paragraph]')
                });
              } else handleSpeak(simplifiedReadAloudText, 'simplified-main', currentGlobalIdx, true, readingLanguage);
            };
            if (trailingLinks && !sentenceText.trim()) return /*#__PURE__*/React.createElement(React.Fragment, {
              key: index
            }, formatInteractiveText(cleanText.trim(), false, !!isLineFocusMode), " ");
            var order = sentenceOrder++;
            var sentenceAction = interactionMode === 'explain' ? readerText('simplified.explain_mode', 'Explain') : interactionMode === 'revise' ? readerText('simplified.revise_mode', 'Revise') : simplifiedReadSentenceLabel;
            var sentenceClass = `rounded px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${interactionMode === 'revise' ? '' : 'cursor-pointer '}${active ? 'bg-yellow-300 text-slate-950' : interactionMode === 'revise' ? '' : 'hover:bg-indigo-100/30'}`;
            var sentenceTitle = interactionMode === 'explain' || interactionMode === 'revise' ? sentenceAction : t('common.click_read_from_here');
            var sentenceLabel = sentenceAction + ': ' + simplifiedPlainInline(cleanText);
            var stopProps = {
              'data-sentence-stop': true,
              tabIndex: order === 0 ? 0 : -1,
              onFocus: function (event) {
                claimRovingStop(event, '[data-sentence-stop]');
              }
            };
            if (innerLink) return /*#__PURE__*/React.createElement("span", {
              key: index,
              id: firstPart ? 'sentence-' + currentGlobalIdx : undefined,
              "data-reading-sentence": currentGlobalIdx,
              "aria-current": active ? 'true' : undefined,
              onClick: speakSentence,
              className: sentenceClass,
              title: sentenceTitle
            }, formatInteractiveText(cleanText, false, !!isLineFocusMode), /*#__PURE__*/React.createElement("button", _extends({
              type: "button",
              "data-sentence-read": true
            }, stopProps, {
              "aria-label": sentenceLabel,
              onClick: speakSentence,
              onKeyDown: event => moveRovingStop(event, '[data-sentence-stop]'),
              className: "sr-only focus:not-sr-only focus:ms-1 focus:rounded focus:bg-indigo-700 focus:px-2 focus:py-0.5 focus:text-sm focus:font-bold focus:text-white"
            }), sentenceAction), " ");
            var sentenceButton = /*#__PURE__*/React.createElement("span", _extends({
              key: index,
              id: firstPart ? 'sentence-' + currentGlobalIdx : undefined,
              "data-reading-sentence": currentGlobalIdx,
              role: "button"
            }, stopProps, {
              "aria-current": active ? 'true' : undefined,
              "aria-label": trailingLinks ? sentenceAction + ': ' + simplifiedPlainInline(sentenceText) : sentenceLabel,
              onClick: speakSentence,
              onKeyDown: function (event) {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  speakSentence(event);
                  return;
                }
                moveRovingStop(event, '[data-sentence-stop]');
              },
              className: sentenceClass,
              title: sentenceTitle
            }), formatInteractiveText(trailingLinks ? sentenceText : cleanText, false, !!isLineFocusMode), trailingLinks ? null : ' ');
            return trailingLinks ? /*#__PURE__*/React.createElement(React.Fragment, {
              key: index
            }, sentenceButton, formatInteractiveText(trailingLinks.trim(), false, !!isLineFocusMode), " ") : sentenceButton;
          });
          var style = {
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            lineHeight: 'inherit'
          };
          if (block.type === 'heading') {
            style.fontWeight = 750;
            style.fontSize = block.level === 1 ? '1.5em' : block.level === 2 ? '1.3em' : '1.15em';
            style.marginBlock = '0.9em 0.45em';
          }
          return /*#__PURE__*/React.createElement(Tag, {
            key: key,
            style: style,
            className: block.type === 'quote' ? 'border-l-4 border-indigo-200 pl-4 my-3 italic' : block.type === 'p' ? 'my-3' : undefined
          }, content);
        };
        return /*#__PURE__*/React.createElement("div", _extends({
          key: paragraphId,
          "data-reading-paragraph": paragraphId,
          "data-reading-focused": !!shouldFocus,
          "data-reading-language": section.label,
          lang: simplifiedLanguageTag(section.label),
          dir: section.key === 'tgt' ? 'ltr' : getContentDirection(section.label)
        }, lineFocusParagraphProps(paragraphId), {
          onMouseUp: isSelectionMode ? handleTextMouseUp : undefined,
          className: `mb-4 rounded-xl transition-opacity motion-reduce:transition-none ${isLineFocusMode ? shouldFocus ? 'opacity-100 bg-slate-800 p-4 text-white' : 'opacity-20 blur-[1px]' : section.key === 'tgt' ? 'text-slate-700' : 'text-slate-800'}`
        }), simplifiedNestLists(blocks, renderBlock));
      });
    });
    var sourceDirection = getContentDirection(readingLanguage);
    return /*#__PURE__*/React.createElement("div", {
      ref: clozeBodyRef,
      "data-simplified-reading-body": "true",
      className: "w-full min-w-0 text-lg font-medium leading-relaxed font-sans",
      style: {
        maxWidth: parts && isSideBySide ? '100%' : 'min(' + readingColumn + 'ch, 100%)',
        marginInline: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-4 flex flex-wrap items-center gap-3 text-sm"
    }, typeof handleSpeak === 'function' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-reader-listen": true,
      disabled: !simplifiedReadAloudText,
      onClick: () => {
        if (isPlaying && playingContentId === 'simplified-main' && typeof stopPlayback === 'function') stopPlayback();else handleSpeak(interactionMode === 'cloze' ? maskClozeTerms(simplifiedReadAloudText) : simplifiedReadAloudText, 'simplified-main', 0, false, readingLanguage);
      },
      className: "min-h-11 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
    }, isPlaying && playingContentId === 'simplified-main' ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 16,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 16,
      "aria-hidden": "true"
    }), isPlaying && playingContentId === 'simplified-main' ? readerText('common.stop_reading', 'Stop reading aloud') : readerText('simplified.listen_start', 'Listen from the beginning')), props.onReadReflect && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: openReadingReflection,
      className: "rounded-lg border border-indigo-200 bg-white px-3 py-2 text-indigo-800"
    }, readerText('simplified.read_reflect', 'Read & reflect')), renderReadingPlaceControls()), renderReadingPlacePanels(), /*#__PURE__*/React.createElement("div", {
      ref: readingStartRef,
      "data-reading-passage": "true",
      "data-paragraph-focus": !!isLineFocusMode,
      tabIndex: -1,
      role: "region",
      "aria-label": readerText('simplified.passage', 'Reading passage'),
      className: (isLineFocusMode ? 'bg-slate-950 rounded-xl p-4 ' : '') + 'rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600'
    }, parts && isSideBySide ? /*#__PURE__*/React.createElement(React.Fragment, null, parts.source.length !== parts.target.length && /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
    }, readerText('simplified.unmatched_paragraphs', 'The versions have different paragraph counts. They are shown in order; a row may not be an exact translation match.')), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, Array.from({
      length: Math.max(rendered[0].length, rendered[1].length)
    }, (_, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, languages.map((section, j) => /*#__PURE__*/React.createElement("section", {
      key: section.key,
      lang: simplifiedLanguageTag(section.label),
      dir: j === 1 ? 'ltr' : sourceDirection,
      className: "min-w-0 rounded-xl border border-slate-200 bg-white/60 p-4",
      style: {
        backgroundColor: isLineFocusMode ? 'transparent' : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-3 text-sm font-bold",
      style: {
        color: isLineFocusMode ? '#e2e8f0' : '#334155'
      }
    }, section.label), /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: readingColumn + 'ch',
        marginInline: 'auto'
      }
    }, rendered[j][i] || /*#__PURE__*/React.createElement("p", {
      className: "text-sm italic text-slate-600"
    }, readerText('simplified.no_paired_paragraph', 'No corresponding paragraph in this version.'))))))))) : languages.map((section, i) => /*#__PURE__*/React.createElement("section", {
      key: section.key,
      lang: simplifiedLanguageTag(section.label),
      dir: i === 1 ? 'ltr' : sourceDirection
    }, i === 1 && /*#__PURE__*/React.createElement("h2", {
      className: "my-6 border-t border-indigo-200 pt-4 text-lg font-bold"
    }, simplifiedEnglishTranslationLabel), rendered[i]))), renderSectionPromptsArea(), props.onReadOriginal && capturedSource && !protectedOriginal && instructionalRole !== 'primary' && interactionMode !== 'cloze' && /*#__PURE__*/React.createElement("div", {
      "data-read-original-next": true,
      className: "mt-6 flex justify-center"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => openOriginalReading(generatedContent, capturedSource.text, true),
      className: "min-h-11 rounded-lg border-2 border-indigo-700 bg-white px-4 py-2 font-bold text-indigo-800 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
    }, viewText('simplified.read_original_next', 'Now read the original'), " ", /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "→"))), /*#__PURE__*/React.createElement(SourceReferencesPanel, {
      referencesText: simplifiedReferences
    }), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "data-generating-status": true,
      className: isProcessing ? 'mt-4 text-sm text-indigo-700' : 'sr-only'
    }, isProcessing ? simplifiedGeneratingMoreLabel : ''));
  }
  return /*#__PURE__*/React.createElement("div", {
    ref: readerSurfaceRef,
    "data-adapted-reader": isTeacherMode ? "teacher" : "student",
    className: "space-y-6"
  }, comparisonKaraoke && isCompareMode && KaraokeReaderOverlay && /*#__PURE__*/React.createElement(KaraokeReaderOverlay, {
    isOpen: true,
    isTeacher: isTeacherMode,
    playbackOnly: true,
    onClose: () => setComparisonKaraoke(null),
    text: comparisonKaraoke.text,
    sentenceList: comparisonKaraoke.sentences,
    sentenceLanguages: comparisonKaraoke.languages,
    language: simplifiedLanguageTag(comparisonKaraoke.language),
    getAudioUrl: getComparisonKaraokeAudioUrl
  }), /*#__PURE__*/React.createElement("span", {
    className: "sr-only",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    "data-read-aloud-status": true
  }, activeReadAloudStatus), isImmersiveReaderActive && generatedContent?.immersiveData && /*#__PURE__*/React.createElement("div", {
    ref: immersiveDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": t('immersive.title') || 'Immersive Reader',
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, immersiveDialogRef.current, handleCloseImmersiveReader),
    className: "fixed inset-0 z-[200] overflow-y-auto animate-in motion-reduce:animate-none fade-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none flex flex-col font-sans",
    style: {
      backgroundColor: immersiveSettings.bgColor || '#fdfbf7'
    },
    onPointerMove: e => {
      if (immersiveSettings.lineFocus && e.clientY > immersiveToolbarBottom) setImmersiveRulerY(e.clientY);
    },
    onFocusCapture: e => {
      if (immersiveSettings.lineFocus && !e.target.closest("[data-immersive-toolbar]") && e.target.closest("[role=dialog]") === immersiveDialogRef.current) {
        const rect = e.target.getBoundingClientRect();
        setImmersiveRulerY(Math.max(immersiveToolbarBottom + immersiveSettings.textSize * 2.5, rect.top + Math.min(rect.height / 2, immersiveSettings.textSize * 2.5)));
      }
    }
  }, /*#__PURE__*/React.createElement(ImmersiveToolbar, {
    settings: immersiveSettings,
    setSettings: setImmersiveSettings,
    onClose: handleCloseImmersiveReader,
    onGeneratePOS: handleGeneratePOSData,
    isGeneratingPOS: isAnalyzingPos,
    posReady: !!generatedContent?.posEnriched,
    onGenerateSyllables: handleGeneratePOSData,
    isGeneratingSyllables: isAnalyzingPos,
    syllablesReady: !!generatedContent?.posEnriched,
    playbackRate: playbackRate,
    setPlaybackRate: setPlaybackRate,
    lineHeight: lineHeight,
    setLineHeight: setLineHeight,
    letterSpacing: letterSpacing,
    setLetterSpacing: setLetterSpacing,
    isFocusReaderActive: isFocusReaderActive,
    onToggleFocusReader: () => setIsFocusReaderActive(!isFocusReaderActive),
    isChunkReaderActive: isChunkReaderActive,
    onToggleChunkReader: () => {
      setIsChunkReaderActive(!isChunkReaderActive);
      setChunkReaderIdx(0);
      setChunkReaderAutoPlay(false);
    },
    chunkReaderIdx: chunkReaderIdx,
    setChunkReaderIdx: setChunkReaderIdx,
    chunkReaderAutoPlay: chunkReaderAutoPlay,
    setChunkReaderAutoPlay: setChunkReaderAutoPlay,
    chunkReaderSpeed: chunkReaderSpeed,
    setChunkReaderSpeed: setChunkReaderSpeed,
    chunkReaderMood: chunkReaderMood,
    setChunkReaderMood: setChunkReaderMood,
    interactionMode: interactionMode,
    setInteractionMode: setInteractionMode,
    isCrawlReaderActive: isCrawlReaderActive,
    onToggleCrawlReader: () => setIsCrawlReaderActive(!isCrawlReaderActive),
    isKaraokeOverlayActive: isKaraokeOverlayActive,
    onToggleKaraokeOverlay: () => setIsKaraokeOverlayActive(!isKaraokeOverlayActive),
    chunkReaderReadAlong: chunkReaderReadAlong,
    onToggleChunkReaderReadAlong: () => {
      const next = !chunkReaderReadAlong;
      setChunkReaderReadAlong(next);
      setChunkReaderSweepPct(0);
      if (!next) {
        try {
          if (chunkReaderSweepAudioRef.current) {
            chunkReaderSweepAudioRef.current.pause();
            chunkReaderSweepAudioRef.current = null;
          }
        } catch (e) {}
        if (chunkReaderSweepRafRef.current) {
          cancelAnimationFrame(chunkReaderSweepRafRef.current);
          chunkReaderSweepRafRef.current = null;
        }
        try {
          window.speechSynthesis && window.speechSynthesis.cancel();
        } catch (e) {}
      }
    },
    totalSentences: immersiveSentences.length || 1
  }), /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Focus reader encountered an error. Please close and reopen."
  }, /*#__PURE__*/React.createElement(FocusReaderOverlay, {
    language: leveledTextLanguage,
    isOpen: isFocusReaderActive,
    onClose: handleCloseSpeedReader,
    text: simplifiedDisplayBody.replace(/<\/?[a-zA-Z][^<>]*>/g, '')
  }), /*#__PURE__*/React.createElement(PerspectiveCrawlOverlay, {
    isOpen: isCrawlReaderActive,
    onClose: () => setIsCrawlReaderActive(false),
    text: (immersiveFresh ? generatedContent.immersiveData.filter(w => w.pos !== 'newline').map(w => w.text).join(' ') : simplifiedDisplayBody).replace(/<\/?[a-zA-Z][^<>]*>/g, '')
  }), /*#__PURE__*/React.createElement(KaraokeReaderOverlay, {
    isOpen: isKaraokeOverlayActive,
    isTeacher: isTeacherMode,
    onClose: () => setIsKaraokeOverlayActive(false),
    getAudioUrl: getKaraokeAudioUrl,
    sentenceList: karaokeReaderSentences,
    captureOn: saveTtsAsPlayed,
    onCaptureChange: setSaveTtsAsPlayedEnabled,
    text: (immersiveFresh ? generatedContent.immersiveData.filter(w => w.pos !== 'newline').map(w => w.text).join(' ') : simplifiedDisplayBody).replace(/<\/?[a-zA-Z][^<>]*>/g, '')
  })), immersiveSettings.lineFocus && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed top-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[height] duration-75 ease-out motion-reduce:transition-none",
    style: {
      top: immersiveToolbarBottom + 'px',
      height: Math.max(0, immersiveRulerY - immersiveSettings.textSize * 2.5 - immersiveToolbarBottom) + 'px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[top] duration-75 ease-out motion-reduce:transition-none",
    style: {
      top: immersiveRulerY + immersiveSettings.textSize * 2.5 + 'px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "fixed left-0 right-0 border-b border-indigo-400/30 z-[210] pointer-events-none transition-[top] duration-75 ease-out motion-reduce:transition-none",
    style: {
      top: immersiveRulerY + 'px'
    }
  })), /*#__PURE__*/React.createElement("div", {
    "data-immersive-passage": true,
    tabIndex: 0,
    role: "region",
    "aria-label": viewText('simplified.reader_reading_passage_when_line_focus_is', 'Reading passage. When Line Focus is on, use Up and Down arrows to move the reading window.'),
    onKeyDown: e => {
      if (e.target === e.currentTarget && immersiveSettings.lineFocus && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const step = immersiveSettings.textSize * lineHeight;
        setImmersiveRulerY(y => Math.max(immersiveToolbarBottom + immersiveSettings.textSize * 2.5, Math.min(window.innerHeight - immersiveSettings.textSize, y + (e.key === "ArrowDown" ? step : -step))));
      }
    },
    className: "flex-grow overflow-y-auto p-5 md:p-16 custom-scrollbar relative z-10 focus-visible:outline focus-visible:outline-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `max-w-4xl mx-auto transition-all duration-300`,
    style: {
      color: immersiveSettings.fontColor || '#1e293b',
      lineHeight: lineHeight,
      letterSpacing: `${immersiveSettings.wideText ? letterSpacing + 0.15 : letterSpacing}em`,
      wordSpacing: immersiveSettings.wideText ? '0.25em' : 'normal',
      fontFamily: immersiveSettings.fontFamily || undefined
    }
  }, (() => {
    const sentences = immersiveSentences;
    const sentenceOfWord = immersiveSentenceOfWord;
    // Typewriter char-offset bookkeeping for the active sentence (mood='typewriter').
    // Resets when we encounter the first token of the active sentence; each token in
    // the active sentence contributes wordData.text.length to the rolling offset.
    let activeChunkCharOffset = 0;
    // Read-along uses its own whitespace-free weight clock. The host supplies
    // chunkReaderSweepPct from the playing clip; convert that sentence-level
    // percentage into a local fill for each word instead of lighting the whole
    // sentence at once.
    let activeSweepCharOffset = 0;
    let lastWasActiveSentence = false;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return generatedContent.immersiveData.map((wordData, i) => {
      if (wordData.pos === 'newline') {
        return /*#__PURE__*/React.createElement("div", {
          key: wordData.id || i,
          className: "w-full h-4"
        });
      }
      const tokenStr = wordData.text.replace(/\s+/g, '').toLowerCase();
      const assignedIdx = sentenceOfWord[i];
      const isChunkHighlight = isChunkReaderActive && assignedIdx === chunkReaderIdx;
      const isChunkDimmed = isChunkReaderActive && assignedIdx !== chunkReaderIdx;
      // Track word's char-offset within the active sentence for typewriter mood
      let wordStartChar = -1;
      let wordSweepStart = -1;
      let wordSweepWeight = 0;
      let sentenceSweepWeight = 1;
      if (isChunkHighlight) {
        if (!lastWasActiveSentence) {
          activeChunkCharOffset = 0;
          activeSweepCharOffset = 0;
        }
        wordStartChar = activeChunkCharOffset;
        activeChunkCharOffset += (wordData.text || '').length;
        wordSweepStart = activeSweepCharOffset;
        wordSweepWeight = Math.max(1, tokenStr.length);
        activeSweepCharOffset += wordSweepWeight;
        sentenceSweepWeight = Math.max(1, cleanSentenceForAudio(sentences[assignedIdx] || '').replace(/\s+/g, '').length);
        lastWasActiveSentence = true;
      } else {
        lastWasActiveSentence = false;
      }
      // Mood-aware styling: highlight (default), typewriter, popin, pulse
      let moodOpacity = isChunkDimmed ? 0.45 : 1;
      let moodAnimation = '';
      let showHighlight = isChunkHighlight;
      let readAlongWordProgress = null;
      let readAlongWordState = null;
      if (isChunkHighlight && chunkReaderReadAlong) {
        const sweep = Math.max(0, Math.min(100, Number(chunkReaderSweepPct) || 0));
        const wordStartPct = wordSweepStart / sentenceSweepWeight * 100;
        const wordEndPct = (wordSweepStart + wordSweepWeight) / sentenceSweepWeight * 100;
        readAlongWordProgress = Math.max(0, Math.min(100, (sweep - wordStartPct) / Math.max(0.0001, wordEndPct - wordStartPct) * 100));
        readAlongWordState = readAlongWordProgress >= 100 ? 'complete' : readAlongWordProgress > 0 ? 'current' : 'pending';
        showHighlight = readAlongWordProgress > 0;
        moodOpacity = 1;
      } else if (isChunkReaderActive && chunkReaderMood === 'typewriter') {
        if (isChunkDimmed) moodOpacity = 0.2;
        if (isChunkHighlight) {
          moodOpacity = wordStartChar < chunkTypewriterCharIdx ? 1 : 0;
          if (wordStartChar >= chunkTypewriterCharIdx) showHighlight = false;
        }
      } else if (isChunkReaderActive && chunkReaderMood === 'popin' && isChunkHighlight && !reduceMotion) {
        moodAnimation = 'allo-chunk-popin 0.25s ease-out';
      } else if (isChunkReaderActive && chunkReaderMood === 'pulse' && isChunkHighlight && !reduceMotion) {
        moodAnimation = 'allo-chunk-pulse 2s ease-in-out infinite';
      }
      return /*#__PURE__*/React.createElement("span", {
        key: wordData.id || i,
        "data-sentence-idx": assignedIdx,
        "data-read-along-state": readAlongWordState || undefined,
        "data-read-along-progress": readAlongWordProgress == null ? undefined : Math.round(readAlongWordProgress),
        style: {
          opacity: moodOpacity,
          transition: chunkReaderMood === 'typewriter' ? 'opacity 0.05s linear' : 'all 0.3s ease',
          // In chunk-read mode every word is click-to-jump (onClick below);
          // pointer cursor surfaces the affordance without needing instructions.
          ...(isChunkReaderActive ? {
            cursor: 'pointer'
          } : {}),
          ...(moodAnimation ? {
            animation: moodAnimation
          } : {}),
          ...(readAlongWordProgress != null ? {
            backgroundImage: `linear-gradient(to right, rgba(250, 204, 21, 0.58) 0%, rgba(250, 204, 21, 0.58) ${readAlongWordProgress}%, transparent ${readAlongWordProgress}%, transparent 100%)`,
            borderRadius: '4px',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone'
          } : showHighlight || isPlaying && playbackState.currentIdx === assignedIdx ? {
            backgroundColor: 'rgba(250, 204, 21, 0.35)',
            borderRadius: '4px',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone'
          } : {})
        }
      }, /*#__PURE__*/React.createElement(ImmersiveWord, {
        wordData: wordData,
        settings: immersiveSettings,
        isActive: isPlaying && playbackState.currentIdx === assignedIdx || isChunkHighlight && (!chunkReaderReadAlong || readAlongWordProgress > 0),
        onClick: e => {
          e.stopPropagation();
          if (interactionMode === 'define') {
            handleWordClick(wordData.text, e);
            return;
          }
          if (interactionMode === 'phonics') {
            handlePhonicsClick(wordData.text, e, {
              audioPlayback: 'reader'
            });
            return;
          }
          if (isChunkReaderActive) {
            if (assignedIdx >= 0) setChunkReaderIdx(assignedIdx);
          } else {
            // ImmersiveWord is an atomic tap target: speak the word that
            // was tapped through handleSpeak's direct, interactive lane.
            // A unique non-sequence content id avoids rebuilding and
            // synthesizing the entire resource from this sentence.
            const spokenWord = String(wordData.text || '').replace(/\s+/g, ' ').trim();
            if (spokenWord && typeof handleSpeak === 'function') {
              handleSpeak(spokenWord, `immersive-word-${wordData.id || i}`, 0, true);
            }
          }
        }
      }));
    });
  })()))), interactionMode === 'cloze' && clozeAllSolved && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 pointer-events-none z-[100] flex items-center justify-center",
    "data-a11y-overlay": "nonmodal-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null), /*#__PURE__*/React.createElement("div", {
    className: "mt-40 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border-4 border-white shadow-xl animate-in motion-reduce:animate-none zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 24,
    className: "text-yellow-500 fill-current",
    "aria-hidden": "true"
  }), " ", simplifiedActivityCompleteLabel)), isTeacherMode && !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-4 rounded-lg border border-green-100 mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-800"
  }, (() => {
    // Split once at the first colon, ASCII or full-width: the Chinese and
    // Japanese packs use "：", which left the goal bold with an empty body.
    const goal = String(t('simplified.udl_goal') || ''),
      at = goal.search(/[:：]/);
    return at < 0 ? goal : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("strong", null, goal.slice(0, at + 1)), " ", goal.slice(at + 1).trim());
  })())), /*#__PURE__*/React.createElement("div", {
    "data-reading-card": true,
    className: `bg-orange-50 border-l-4 border-orange-400 shadow-sm rounded-r-lg relative ${isZenMode ? 'p-3 sm:p-4' : 'p-3 sm:p-6 lg:p-8'}`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-reader-skip": true,
    className: "sr-only focus:not-sr-only focus:mb-2 focus:inline-block focus:rounded focus:bg-indigo-700 focus:px-3 focus:py-2 focus:font-bold focus:text-white",
    onClick: () => {
      var target = readingStartRef.current || readerSurfaceRef.current?.querySelector('[data-reading-comparison]');
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus();
    }
  }, readerText('simplified.skip_passage', 'Skip reading controls')), !isZenMode && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center items-center mb-2 flex-wrap gap-2"
  }, (() => {
    const displayGrade = generatedContent?.config?.grade || gradeLevel;
    const displayLang = generatedContent?.config?.language || leveledTextLanguage;
    const displayInterests = generatedContent?.config?.interests || studentInterests || [];
    const displayStandards = generatedContent?.config?.standards || standardsInput;
    return /*#__PURE__*/React.createElement("div", {
      className: "flex min-w-0 flex-wrap items-center justify-center gap-2"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "break-words font-comic font-bold text-xl text-orange-800"
    }, isTeacherMode ? `${t('simplified.target_level_label')}: ${displayGrade}` : generatedContent?.title || generatedContent?.topic || sourceTopic || readerText('simplified.your_reading', 'Your reading')), displayLang !== 'English' && /*#__PURE__*/React.createElement("span", {
      className: "bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200"
    }, displayLang), isTeacherMode && displayInterests.length > 0 && /*#__PURE__*/React.createElement("span", {
      className: "bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold border border-red-200 flex items-center gap-1"
    }, /*#__PURE__*/React.createElement(Heart, {
      size: 10
    }), " ", t('simplified.engagement_optimized')), isTeacherMode && typeof displayStandards === 'string' && displayStandards && /*#__PURE__*/React.createElement("span", {
      className: "bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200 flex items-center gap-1 cursor-help",
      title: `${t('simplified.label_standard')}: ${displayStandards}`
    }, /*#__PURE__*/React.createElement(CheckCircle, {
      size: 10
    }), displayStandards.length > 20 ? displayStandards.substring(0, 20) + '...' : displayStandards));
  })()), /*#__PURE__*/React.createElement("div", {
    className: `flex items-center gap-2 ${isZenMode ? 'justify-center mb-4' : 'justify-center'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1 items-center min-w-0 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": readerText('simplified.reading_actions', 'Reading tools'),
    className: "flex flex-wrap justify-center w-full min-w-0 bg-white rounded-2xl p-2 border border-indigo-200 shadow-sm gap-2"
  }, [['read', 'simplified.read_mode', 'Read', Volume2], ['define', 'simplified.word_meaning', 'Word meaning', Search], ['phonics', 'simplified.word_sounds', 'Word sounds', Ear], ...(studentAiFeaturesHidden ? [] : [['explain', 'simplified.explain_mode', 'Explain', HelpCircle]])].map(renderReadingModeButton), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": practiceOpen,
    "aria-controls": "simplified-practice-tools",
    onClick: () => setPracticeOpen(!practiceOpen),
    className: "min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, readerText('simplified.practice_tools', 'Practice'), practiceOpen ? /*#__PURE__*/React.createElement(ChevronUp, {
    size: 14,
    className: "inline ml-1"
  }) : /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    className: "inline ml-1"
  })), typeof props.onFocusViewChange === 'function' && /*#__PURE__*/React.createElement("button", {
    ref: focusViewButtonRef,
    type: "button",
    "data-reader-focus-view": true,
    "aria-pressed": !!isZenMode,
    "aria-describedby": "simplified-focus-view-hint",
    onClick: () => props.onFocusViewChange(!isZenMode),
    className: "min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, isZenMode ? readerText('simplified.exit_focus_view', 'Exit focus view') : readerText('simplified.focus_view', 'Focus view')), /*#__PURE__*/React.createElement("button", {
    ref: displayToggleRef,
    type: "button",
    "data-reader-display": true,
    "aria-expanded": displayOpen,
    "aria-controls": "simplified-display-panel",
    onClick: () => setDisplayOpen(!displayOpen),
    className: "min-h-11 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "font-serif text-base leading-none"
  }, "Aa"), viewText('simplified.display_menu', 'Display'), displayOpen ? /*#__PURE__*/React.createElement(ChevronUp, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("div", {
    id: "simplified-practice-tools",
    hidden: !practiceOpen,
    style: {
      display: practiceOpen ? undefined : 'none'
    },
    className: "flex flex-wrap justify-center gap-2 py-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "simplified_read_along",
    "aria-pressed": !!isFluencyMode,
    onClick: () => chooseReadingMode('fluency'),
    className: "min-h-11 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-900"
  }, readerText('simplified.record_my_reading', 'Record my reading')), !protectedOriginal && !isCompareMode && hasClozeTerms && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "simplified_cloze_mode",
    "aria-pressed": interactionMode === 'cloze',
    onClick: () => chooseReadingMode('cloze'),
    className: "min-h-11 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-900"
  }, readerText('simplified.practice_blanks', 'Fill in the blanks')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "simplified_scramble_game",
    onClick: handleSetIsSyntaxGameToTrue,
    className: "min-h-11 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-900"
  }, readerText('simplified.practice_sentences', 'Sentence scramble'))), /*#__PURE__*/React.createElement("div", {
    id: "simplified-display-panel",
    "data-reader-display-panel": true,
    role: "group",
    "aria-label": viewText('simplified.display_menu', 'Display'),
    hidden: !displayOpen,
    style: {
      display: displayOpen ? undefined : 'none'
    },
    onKeyDown: event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setDisplayOpen(false);
      displayToggleRef.current?.focus();
    },
    className: "mt-2 flex w-full flex-wrap items-center justify-center gap-3 rounded-xl border border-indigo-100 bg-white/70 p-3 text-sm"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": readerText('simplified.immersive_reader', 'Immersive Reader'),
    "data-help-key": "simplified_immersive_reader",
    onClick: () => {
      if (generatedContent.immersiveData) {
        setIsImmersiveReaderActive(true);
      } else {
        handleAnalyzePOS();
      }
    },
    disabled: isAnalyzingPos || isEditingLeveledText,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
    title: t('simplified.tip_immersive_btn')
  }, isAnalyzingPos ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(BookOpen, {
    size: 14
  }), isAnalyzingPos ? t('simplified.loading_reader') : t('simplified.immersive_reader')), /*#__PURE__*/React.createElement("label", {
    className: "inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", null, readerText('header.reading_theme_aria', 'Reading theme')), /*#__PURE__*/React.createElement("select", {
    "data-adapted-theme-picker": true,
    value: readingTheme || 'default',
    title: readerText('simplified.theme_scope', 'Changes the reading area. Your app theme stays the same.'),
    onChange: e => setReadingTheme(e.target.value),
    "aria-label": simplifiedReadingThemeLabel,
    className: `min-h-11 min-w-0 max-w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${readingTheme === 'default' ? 'border-slate-200 bg-white text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`
  }, /*#__PURE__*/React.createElement("option", {
    value: "default"
  }, readerText('simplified.theme_follow_app', 'Use app theme')), /*#__PURE__*/React.createElement("option", {
    value: "warm"
  }, t('header.reading_theme_warm')), /*#__PURE__*/React.createElement("option", {
    value: "sepia"
  }, t('header.reading_theme_sepia')), /*#__PURE__*/React.createElement("option", {
    value: "dark"
  }, t('header.reading_theme_dark')), /*#__PURE__*/React.createElement("option", {
    value: "dim"
  }, readerText('header.reading_theme_dim', 'Dim')), /*#__PURE__*/React.createElement("option", {
    value: "highContrast"
  }, t('header.reading_theme_contrast')), /*#__PURE__*/React.createElement("option", {
    value: "blue"
  }, t('header.reading_theme_blue')), /*#__PURE__*/React.createElement("option", {
    value: "green"
  }, t('header.reading_theme_green')), /*#__PURE__*/React.createElement("option", {
    value: "rose"
  }, t('header.reading_theme_rose')), /*#__PURE__*/React.createElement("option", {
    value: "dyslexia"
  }, t('header.reading_theme_easy_read')))), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, readerText('simplified.reading_width', 'Reading width'), /*#__PURE__*/React.createElement("select", {
    "aria-label": readerText('simplified.reading_width', 'Reading width'),
    value: readingColumn,
    onChange: e => updateReadingColumn(e.target.value),
    className: "rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-800"
  }, /*#__PURE__*/React.createElement("option", {
    value: 40
  }, readerText('simplified.width_narrow', 'Narrow')), /*#__PURE__*/React.createElement("option", {
    value: 56
  }, readerText('simplified.width_medium', 'Medium')), /*#__PURE__*/React.createElement("option", {
    value: 72
  }, readerText('simplified.width_wide', 'Wide'))))), (() => {
    var status = readingModeStatus();
    return /*#__PURE__*/React.createElement("p", {
      role: "status",
      "data-reading-mode-status": status.mode,
      className: 'my-2 text-center text-sm ' + (status.label ? 'mx-auto w-fit max-w-full rounded-xl border-2 border-indigo-700 bg-indigo-50 px-3 py-2 text-indigo-950' : 'text-slate-700')
    }, status.label && /*#__PURE__*/React.createElement("strong", {
      className: "font-bold"
    }, status.label, ' · '), status.hint);
  })(), isTeacherMode && (teacherReadingModes.length > 0 || !isZenMode) && /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-labelledby": "simplified-teacher-editing-label",
    "data-teacher-editing-tools": true,
    className: "mt-1 flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2"
  }, /*#__PURE__*/React.createElement("span", {
    id: "simplified-teacher-editing-label",
    className: "px-1 text-xs font-bold uppercase tracking-wide text-slate-600"
  }, viewText('simplified.teacher_editing', 'Teacher editing')), teacherReadingModes.map(renderReadingModeButton), isTeacherMode && !isZenMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "simplified_teacher_tools",
    "aria-expanded": !!isTeacherToolbarExpanded,
    "aria-controls": "simplified-teacher-tools-panel",
    onClick: handleToggleIsTeacherToolbarExpanded,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isTeacherToolbarExpanded ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:text-indigo-600 hover:border-indigo-200'}`,
    title: t('simplified.teacher_tools_tooltip')
  }, /*#__PURE__*/React.createElement(Settings, {
    size: 14
  }), /*#__PURE__*/React.createElement("span", null, readerText('simplified.teacher_actions', 'Teacher tools')), isTeacherToolbarExpanded ? /*#__PURE__*/React.createElement(ChevronLeft, {
    size: 14
  }) : /*#__PURE__*/React.createElement(ChevronRight, {
    size: 14
  })), isTeacherMode && !protectedOriginal && !isZenMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.toggle_edit_text'),
    onClick: handleToggleIsEditingLeveledText,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingLeveledText ? 'bg-orange-700 text-white hover:bg-orange-700' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'}`,
    "data-help-key": "simplified_edit"
  }, isEditingLeveledText ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingLeveledText ? t('common.done_editing') : t('common.edit'))), renderTeacherReviewSummary(), isTeacherMode && !isZenMode && /*#__PURE__*/React.createElement("div", {
    id: "simplified-teacher-tools-panel",
    hidden: !isTeacherToolbarExpanded,
    style: {
      display: isTeacherToolbarExpanded ? undefined : 'none'
    },
    className: "mt-2 w-full rounded-xl border border-indigo-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleDuplicateResource,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_duplicate_btn'),
    "data-help-key": "simplified_duplicate"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.duplicate')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCheckLevel,
    disabled: isCheckingLevel,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
    title: t('simplified.tip_check_level_btn'),
    "data-help-key": "simplified_check_level"
  }, isCheckingLevel ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Search, {
    size: 14
  }), isCheckingLevel ? t('simplified.checking') : t('simplified.check_level')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleCheckAlignment,
    disabled: isCheckingAlignment || !standardsInput,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${!standardsInput ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-slate-300'}`,
    title: !standardsInput ? t('simplified.tip_rigor_disabled') : t('simplified.tip_rigor_btn'),
    "data-help-key": "simplified_rigor_report"
  }, isCheckingAlignment ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 14
  }), isCheckingAlignment ? t('simplified.checking') : t('simplified.rigor_report')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => copyToClipboard(generatedContent?.data),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: t('simplified.tip_copy_btn'),
    "aria-label": t('simplified.tip_copy_btn'),
    "data-help-key": "simplified_copy_text"
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.copy_text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (isSimplifiedAudioDownloading) {
        try {
          window.__alloCancelAudioDownload?.();
        } catch (_) {}
        return;
      }
      handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, 'dl-simplified-main');
    },
    title: isSimplifiedAudioDownloading ? simplifiedStopAudioDownloadLabel : t('simplified.tip_download_audio') || t('common.download_audio'),
    "aria-label": isSimplifiedAudioDownloading ? simplifiedStopAudioDownloadLabel : t('common.download_audio'),
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    "data-help-key": "simplified_download_audio"
  }, isSimplifiedAudioDownloading ? /*#__PURE__*/React.createElement(StopCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 14
  }), isSimplifiedAudioDownloading ? t('common.stop') || simplifiedAudioStopLabel : t('common.download_audio')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (ttsPrepState.busy) {
        var request = ttsPrepRequestRef.current;
        if (request && request.controller) request.controller.abort();
        window.__alloPrepareReadAloudCancel = true;
        return;
      }
      handlePrepareReadAloudAudio();
    },
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
    title: ttsPrepState.busy ? readerText('simplified.save_audio_stop', 'Stop saving audio') : readerText('simplified.save_audio_tip', 'Save read-aloud audio for every sentence, so it plays without waiting'),
    "data-help-key": "simplified_save_tts"
  }, ttsPrepState.busy ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Volume2, {
    size: 14
  }), ttsPrepState.busy ? `${simplifiedAudioStopLabel || viewText('common.stop', 'Stop')} · ${ttsPrepState.done}/${ttsPrepState.total || '...'}` : readerText('simplified.save_audio', 'Save audio'))), /*#__PURE__*/React.createElement("details", {
    "data-teacher-reading-review": true,
    className: "my-4 rounded-xl border border-indigo-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 cursor-pointer py-2 text-sm font-bold text-indigo-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, readerText('simplified.review_adjust', 'Review & adjust text')), isTeacherMode && !protectedOriginal && !isCompareMode && !isZenMode && generatedContent && ['simplified', 'quiz', 'sentence-frames', 'glossary'].includes(generatedContent.type) && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mb-6 mx-1",
    "data-help-key": "simplified_complexity_slider"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 text-center"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.adjust_difficulty') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.adjust_scaffolding') : generatedContent.type === 'glossary' ? t('simplified.complexity_controls.adjust_definition') : t('simplified.complexity_controls.adjust_relative')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-20 text-right"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.easier') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.more_support') : t('simplified.complexity_controls.simpler')), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-grow h-6 flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform -translate-x-1/2"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": readerText('simplified.adjust_complexity', 'Adjust text complexity'),
    type: "range",
    min: "1",
    max: "9",
    step: "1",
    value: complexityLevel,
    onChange: e => setComplexityLevel(parseInt(e.target.value)),
    "aria-valuetext": complexityLevel < 5 ? readerText('simplified.simpler_setting', 'Simpler') + ' ' + complexityLevel : complexityLevel > 5 ? readerText('simplified.complex_setting', 'More complex') + ' ' + complexityLevel : readerText('simplified.unchanged_setting', 'Current version'),
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10 relative"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-20"
  }, generatedContent.type === 'quiz' ? t('simplified.complexity_controls.harder') : generatedContent.type === 'sentence-frames' ? t('simplified.complexity_controls.less_support') : t('simplified.complexity_controls.complex'))), /*#__PURE__*/React.createElement("div", {
    className: "px-2 sm:px-16"
  }, /*#__PURE__*/React.createElement(ComplexityGauge, {
    level: complexityLevel
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mb-2"
  }, readerText('simplified.adjust_hint', 'Choose a change, then apply it. Review the new version before sharing.')), generatedContent.type === 'simplified' ? renderAdaptationControls() : /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-apply-complexity": true,
    onClick: handleComplexityAdjustment,
    disabled: isProcessing || Number(complexityLevel) === 5,
    className: "min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
  }, isProcessing ? readerText('simplified.applying_change', 'Updating text…') : readerText('simplified.apply_complexity', 'Apply text change'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center mt-4 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("label", {
    className: `flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full cursor-pointer select-none transition-all border ${saveOriginalOnAdjust ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-1 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`,
    title: t('common.choose_overwrite_version'),
    "data-help-key": "simplified_overwrite_toggle"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: saveOriginalOnAdjust,
    onChange: e => setSaveOriginalOnAdjust(e.target.checked),
    className: "h-4 w-4 accent-indigo-600"
  }), saveOriginalOnAdjust ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }) : /*#__PURE__*/React.createElement(Copy, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, t('common.keep_original'))))), isTeacherMode && generatedContent.relevel && (() => {
    const info = generatedContent.relevel || {};
    const fmt = v => Number.isFinite(Number(v)) ? Number(v).toFixed(1) : '?';
    const undoRelevel = () => {
      const restored = {
        ...generatedContent,
        data: info.fromText
      };
      delete restored.relevel;
      delete restored.levelCheck;
      if (info.fromLocalStats) restored.localStats = info.fromLocalStats;else delete restored.localStats;
      if (info.fromInstructionalText) restored.instructionalText = info.fromInstructionalText;
      if (info.fromLevelCheck) restored.levelCheck = info.fromLevelCheck;
      setGeneratedContent(restored);
      if (typeof setHistory === 'function') setHistory(prev => prev.map(item => item.id === restored.id ? restored : item));
    };
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      "data-relevel": "auto",
      className: "mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold uppercase tracking-wider"
    }, t('simplified.relevel_label') || 'Re-leveled automatically'), /*#__PURE__*/React.createElement("span", null, info.direction === 'simpler' ? viewText('simplified.relevel_detail_too_complex', 'Measured grade {before} → {after} (target {target}). The measurement and the review agreed the first draft was too complex.', {
      before: fmt(info.measuredBefore),
      after: fmt(info.measuredAfter),
      target: info.targetGrade || ''
    }) : viewText('simplified.relevel_detail_too_simple', 'Measured grade {before} → {after} (target {target}). The measurement and the review agreed the first draft was too simple.', {
      before: fmt(info.measuredBefore),
      after: fmt(info.measuredAfter),
      target: info.targetGrade || ''
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: undoRelevel,
      className: "ml-auto rounded-full border border-indigo-300 bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
    }, t('simplified.relevel_undo') || 'Undo re-level'));
  })(), isTeacherMode && generatedContent.levelCheck && generatedContent.levelCheck.triangulation && generatedContent.levelCheck.triangulation.note && !generatedContent.levelCheck.triangulation.agree && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "data-relevel": "disagreement",
    className: "mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold uppercase tracking-wider mr-2"
  }, t('simplified.level_signals_disagree') || 'Two reads, one text'), /*#__PURE__*/React.createElement("span", null, generatedContent.levelCheck.triangulation.note)), isTeacherMode && !generatedContent.levelCheck && simplifiedComplexityDisplay.measuredGrade !== null && (() => {
    const measured = simplifiedComplexityDisplay.measuredGrade;
    const targetGrade = simplifiedComplexityDisplay.targetGrade;
    const status = simplifiedComplexityDisplay.status;
    const tone = status === 'above-target' ? 'bg-amber-50 border-amber-200 text-amber-900' : status === 'below-target' ? 'bg-blue-50 border-blue-200 text-blue-900' : status === 'within-target' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-slate-50 border-slate-200 text-slate-700';
    const verdict = status === 'above-target' ? viewText('simplified.level_above_target', 'Above the target range for {grade}', {
      grade: targetGrade
    }) : status === 'below-target' ? viewText('simplified.level_below_target', 'Below the target range for {grade}', {
      grade: targetGrade
    }) : status === 'within-target' ? viewText('simplified.level_within_target', 'Within the target range for {grade}', {
      grade: targetGrade
    }) : '';
    const rangeNote = simplifiedComplexityDisplay.target && simplifiedComplexityDisplay.target.fkLabel ? ' ' + viewText('simplified.level_shared_range', 'Shared target range: {range}.', {
      range: simplifiedComplexityDisplay.target.fkLabel
    }) : '';
    const stats = generatedContent.localStats || {};
    return /*#__PURE__*/React.createElement("div", {
      className: `mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs ${tone}`,
      "data-complexity-status": status
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold uppercase tracking-wider"
    }, t('simplified.measured_level_label') || 'Measured reading level'), /*#__PURE__*/React.createElement("span", {
      className: "font-mono font-bold text-sm",
      title: `${t('analysis.readability.formula') || 'Flesch-Kincaid'}: (0.39 × ASL) + (11.8 × ASW) - 15.59\n${t('analysis.readability.words') || 'Words'}: ${stats.words || '—'}\n${t('analysis.readability.sentences') || 'Sentences'}: ${stats.sentences || '—'}\n${t('analysis.readability.syllables') || 'Syllables'}: ${stats.syllables || '—'}`
    }, measured), verdict && /*#__PURE__*/React.createElement("span", {
      className: "font-semibold"
    }, verdict), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] opacity-80"
    }, viewText('simplified.reader_flesch_kincaid_measured_on_this_passage', 'Flesch-Kincaid, measured on this passage.'), rangeNote, ' ', viewText('simplified.reader_use_check_level_for_a_fuller', 'Use Check Level for a fuller review.')), /*#__PURE__*/React.createElement("label", {
      className: "ml-auto flex items-center gap-1 text-[11px] font-semibold cursor-pointer",
      title: viewText('simplified.reader_after_each_adapted_text_run_one', 'After each adapted text, run one model review alongside this measurement and re-level automatically only when both agree the target was missed.')
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!autoLevelCheckOn,
      onChange: e => setAutoLevelCheckOn(e.target.checked),
      className: "h-3 w-3"
    }), t('simplified.auto_level_check') || 'Auto-check on generate'));
  })(), isTeacherMode && !generatedContent.levelCheck && simplifiedComplexityDisplay.status === 'stale' && /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
  }, /*#__PURE__*/React.createElement("strong", null, viewText('simplified.reader_reading_level_measurement_needs_refresh', 'Reading-level measurement needs refresh.')), ' ', viewText('simplified.reader_the_text_changed_after_it_was', 'The text changed after it was measured; use Check Level before relying on a complexity verdict.')), isTeacherMode && generatedContent.levelCheck && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-2 rounded-full text-indigo-600 mt-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 text-sm flex items-center justify-between"
  }, t('simplified.level_analysis_title'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full"
  }, generatedContent.levelCheck.confirmedLevel || generatedContent.levelCheck.estimatedLevel)), generatedContent.levelCheck.rubric ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
  }, t('simplified.complexity_rubric_title')), Object.entries(generatedContent.levelCheck.rubric).map(([key, data]) => {
    const percent = (data.score + 5) / 10 * 100;
    const isAligned = Math.abs(data.score) <= 1;
    const colorClass = isAligned ? 'bg-green-500' : data.score < 0 ? 'bg-blue-400' : 'bg-red-400';
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "space-y-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between text-xs"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-slate-700 capitalize"
    }, key.replace(/([A-Z])/g, ' $1').trim()), /*#__PURE__*/React.createElement("span", {
      className: `font-mono font-bold ${isAligned ? 'text-green-600' : 'text-slate-600'}`
    }, data.score > 0 ? '+' : '', data.score)), /*#__PURE__*/React.createElement("div", {
      className: "relative h-2 bg-slate-100 rounded-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10"
    }), /*#__PURE__*/React.createElement("div", {
      className: `absolute top-0 bottom-0 rounded-full transition-all duration-500 ${colorClass}`,
      style: {
        left: data.score < 0 ? `${percent}%` : '50%',
        width: `${Math.abs(data.score) * 10}%`
      }
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-600 italic"
    }, simplifiedAiText(data.reason)));
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-1"
  }, /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_simple')), /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_aligned')), /*#__PURE__*/React.createElement("span", null, t('simplified.gauge_complex')))) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('simplified.level_estimate_label'), ":"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-sm border border-indigo-100 shadow-sm"
  }, generatedContent.levelCheck.estimatedLevel), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.levelCheck.alignment === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`
  }, generatedContent.levelCheck.alignment)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed mt-2 p-2 bg-indigo-50/50 rounded italic border border-indigo-100/50"
  }, "\"", generatedContent.levelCheck.nuanceSummary || generatedContent.levelCheck.feedback, "\"")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_fluency_session'),
    onClick: () => {
      const updated = {
        ...generatedContent
      };
      delete updated.levelCheck;
      setGeneratedContent(updated);
    },
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), isTeacherMode && generatedContent.alignmentCheck && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-emerald-100 p-2 rounded-full text-emerald-800 mt-1"
  }, /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-emerald-900 text-sm"
  }, t('simplified.rigor_check_title')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('simplified.rigor_status_label'), ":"), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.alignmentCheck.status === 'Aligned' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`
  }, generatedContent.alignmentCheck.status)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-800"
  }, t('simplified.rigor_evidence_label'), ":"), " \"", generatedContent.alignmentCheck.evidence, "\""), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-emerald-800"
  }, t('simplified.rigor_analysis_label'), ":"), " ", generatedContent.alignmentCheck.rigorReport), generatedContent.alignmentCheck.missingElements && generatedContent.alignmentCheck.missingElements !== "None" && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-700 leading-relaxed bg-red-50 p-2 rounded border border-red-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 12
  }), " ", t('simplified.missing_label'), ":"), " ", generatedContent.alignmentCheck.missingElements)), generatedContent.alignmentCheck.improvement && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-3 rounded border border-emerald-200 mt-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12
  }), " ", t('simplified.suggestion_label')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic mb-2"
  }, "\"", generatedContent.alignmentCheck.improvement, "\""), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleRegenerateWithRigor,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    className: "text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: isProcessing ? "animate-spin motion-reduce:animate-none" : ""
  }), " ", t('simplified.apply_regenerate')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_fluency_results'),
    onClick: () => {
      const updated = {
        ...generatedContent
      };
      delete updated.alignmentCheck;
      setGeneratedContent(updated);
    },
    className: "text-slate-600 hover:text-slate-600 p-1"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))))), typeof props.onFocusViewChange === 'function' && /*#__PURE__*/React.createElement("p", {
    id: "simplified-focus-view-hint",
    className: isZenMode ? 'mt-2 text-center text-xs text-slate-600' : 'sr-only'
  }, isZenMode ? readerText('simplified.focus_view_active', 'Focus view is on. Exit any time to bring back the header and sidebar.') : readerText('simplified.focus_view_hint', 'Focus view hides the header and sidebar so you can concentrate on reading.')))), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    "data-tts-prep-status": true,
    className: ttsPrepNotice ? 'rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900' : 'sr-only'
  }, ttsPrepNotice), renderStudentPreview(), wordHelpCard && (() => {
    var entry = wordHelpCard.entry,
      cardLanguage = wordHelpCard.language || readingLanguage,
      explanation = entry.definition || entry.explanation || entry.text || '';
    var cardDirection = typeof getContentDirection === 'function' ? getContentDirection(cardLanguage) : undefined;
    var cardButton = 'min-h-11 rounded-lg border border-indigo-300 bg-white px-3 text-sm font-semibold text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
    var cardLink = 'min-h-11 rounded px-1 text-sm text-indigo-800 underline underline-offset-2 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
    var moreHelp = () => {
      var card = wordHelpCard,
        opener = wordHelpCardOpener.current;
      closeWordHelpCard(false);
      if (typeof handleWordClick === 'function') handleWordClick(card.entry.quote, {
        stopPropagation: () => {},
        currentTarget: opener,
        clientX: card.x,
        clientY: card.y
      }, {
        language: card.language
      });
    };
    var showAll = () => {
      var list = (readerSurfaceRef.current || document).querySelector('[data-adapted-word-help]');
      closeWordHelpCard(!list);
      if (!list) return;
      if (!list.hasAttribute('tabindex')) list.setAttribute('tabindex', '-1');
      if (typeof list.scrollIntoView === 'function') list.scrollIntoView({
        block: 'start'
      });
      list.focus();
    };
    return /*#__PURE__*/React.createElement("div", {
      ref: wordHelpCardRef,
      role: "dialog",
      "aria-labelledby": "simplified-word-help-card-title",
      tabIndex: -1,
      "data-word-help-card": true,
      onKeyDown: e => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        closeWordHelpCard();
      },
      className: `fixed ${_popupZ} rounded-xl border-2 border-indigo-200 bg-white p-4 text-slate-900 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600`,
      style: simplifiedPopupStyle(wordHelpCard, 20)
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-2 flex items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("h5", {
      id: "simplified-word-help-card-title",
      lang: simplifiedLanguageTag(cardLanguage),
      dir: cardDirection,
      className: "break-words text-lg font-bold text-indigo-900"
    }, entry.quote), /*#__PURE__*/React.createElement("p", {
      className: "text-xs font-semibold text-indigo-700"
    }, viewText('simplified.word_help_card_prepared', 'Word help from your teacher'))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => closeWordHelpCard(),
      "aria-label": viewText('common.close', 'Close'),
      className: "min-h-11 min-w-11 shrink-0 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement(X, {
      size: 14
    }))), entry.image && /*#__PURE__*/React.createElement("img", {
      src: entry.image.src,
      alt: entry.image.alt || '',
      "data-word-help-card-picture": true,
      className: "mb-2 h-24 w-full rounded-lg bg-white object-contain"
    }), /*#__PURE__*/React.createElement("p", {
      "data-word-help-card-text": true,
      lang: simplifiedLanguageTag(cardLanguage),
      dir: cardDirection,
      className: "break-words text-base leading-relaxed"
    }, explanation), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-word-help-card-hear": true,
      onClick: () => speakExactPassage(entry.quote, 'word-help-word', cardLanguage),
      className: cardButton
    }, isExactPassagePlaying('word-help-word') ? viewText('common.stop', 'Stop') : viewText('simplified.word_help_card_hear_word', 'Hear the word')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-word-help-card-listen": true,
      onClick: () => speakExactPassage(entry.quote + '. ' + explanation, 'word-help-card', cardLanguage),
      className: cardButton
    }, isExactPassagePlaying('word-help-card') ? viewText('common.stop', 'Stop') : viewText('simplified.word_help_card_listen', 'Listen to the help'))), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex flex-wrap gap-x-3"
    }, typeof handleWordClick === 'function' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-word-help-card-more": true,
      onClick: moreHelp,
      className: cardLink
    }, viewText('simplified.word_help_card_more', 'More about this word')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-word-help-card-all": true,
      onClick: showAll,
      className: cardLink
    }, viewText('simplified.word_help_card_all', 'All word help'))), renderPictureCredits([entry]));
  })(), definitionData && /*#__PURE__*/React.createElement("div", {
    ref: definitionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "simplified-definition-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, definitionDialogRef.current, closeDefinition),
    className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-64 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none fade-in zoom-in-75 duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none`,
    style: simplifiedPopupStyle(definitionData, 16)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "simplified-definition-title",
    className: "font-bold text-indigo-900 text-lg capitalize"
  }, definitionData.word), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, definitionData.text ? renderSimplifiedPopupSpeaker(SIMPLIFIED_DEFINE_AUDIO_ID, [definitionData.word, definitionData.text]) : null, /*#__PURE__*/React.createElement("button", {
    ref: definitionCloseRef,
    type: "button",
    onClick: closeDefinition,
    className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), renderHelpAudioNotice('definition-'), definitionData.text ? renderReadingLevelExplanation(definitionData, t, renderFormattedText) : /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-xs text-indigo-500"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('glossary.popups.finding')), definitionData.dictionary && renderDictionaryPanel(definitionData.dictionary, t, renderHelpAudioButton), definitionData.text && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-slate-100"
  }, definitionData.imageUrl ? /*#__PURE__*/React.createElement("img", {
    src: definitionData.imageUrl,
    alt: definitionData.word,
    className: "w-full h-32 object-contain rounded-lg bg-slate-50 border border-slate-400"
  }) : definitionData.imageLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-xs text-indigo-600 h-20 bg-slate-50 rounded-lg border border-slate-400 border-dashed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }), " ", t('common.loading') || 'Loading picture...') : definitionData.imageError ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 italic text-center py-2"
  }, t('glossary.popups.image_error') || 'Could not load picture.') : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFetchWordImage(definitionData.word),
    className: "w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors",
    "aria-label": t('glossary.popups.show_picture') || 'Show picture for this word'
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 12
  }), " ", t('glossary.popups.show_picture') || 'Show picture')), /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-indigo-200 transform rotate-45"
  })), definitionData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ}`,
    onClick: closeDefinition
  }), phonicsData && /*#__PURE__*/React.createElement("div", {
    ref: phonicsDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "phonics-popup-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, phonicsDialogRef.current, closePhonics),
    className: `fixed ${_popupZ} bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
    style: simplifiedPopupStyle(phonicsData, 18)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "phonics-popup-title",
    className: "min-w-0 break-words font-black text-emerald-900 text-2xl capitalize tracking-tight"
  }, phonicsData.word), /*#__PURE__*/React.createElement("button", {
    ref: phonicsCloseRef,
    type: "button",
    onClick: closePhonics,
    className: "min-h-11 min-w-11 shrink-0 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), renderHelpAudioNotice('phonics-'), phonicsData.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-6 gap-2 text-emerald-700"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider"
  }, t('glossary.popups.analyzing'))) : phonicsData.data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1"
  }, t('glossary.phonetic_spelling')), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-serif italic text-slate-700"
  }, "/", phonicsData.data.phoneticSpelling, "/")), renderHelpAudioButton('phonics-word', null, phonicsData.word, phonicsData.language)), renderPhonicsDictRow(phonicsData, t, renderHelpAudioButton), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-3 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-slate-600 mb-2"
  }, t('glossary.popups.syllables')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1"
  }, Array.isArray(phonicsData.data.syllables) && phonicsData.data.syllables.some(syl => typeof syl === 'string' && syl.trim()) ? phonicsData.data.syllables.filter(syl => typeof syl === 'string' && syl.trim()).map((syl, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700 font-bold px-0.5",
    "aria-hidden": "true"
  }, "•"), /*#__PURE__*/React.createElement("span", {
    className: "bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm"
  }, syl))) : /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-700"
  }, helpText('simplified.word_parts_unavailable', 'Word parts are unavailable. You can still listen to the word.')))), phonicsData.data.ipa && /*#__PURE__*/React.createElement("details", {
    className: "bg-slate-50 p-3 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, helpText('simplified.word_ipa_details', 'Pronunciation symbols (IPA)')), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 font-mono text-sm text-slate-700"
  }, phonicsData.data.ipa)))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-red-600 text-xs font-bold py-4"
  }, t('glossary.popups.failed')), /*#__PURE__*/React.createElement("div", {
    className: "allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45"
  })), phonicsData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ}`,
    onClick: closePhonics
  }), selectionMenu && /*#__PURE__*/React.createElement("div", {
    ref: selectionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": readerText('simplified.selected_passage', 'Selected passage'),
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, selectionDialogRef.current, () => {
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
    }),
    className: `fixed ${_popupZ} flex flex-col gap-1 items-center animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-200`,
    style: simplifiedPopupStyle(selectionMenu, 20)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-sm max-w-[150px] truncate border border-slate-700"
  }, "\"", selectionMenu.text.length > 20 ? selectionMenu.text.substring(0, 20) + '...' : selectionMenu.text, "\""), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-800 text-white rounded-full shadow-xl p-1 flex items-center gap-1"
  }, isCustomReviseOpen ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 px-1 animate-in motion-reduce:animate-none slide-in-from-right-2 duration-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_custom_revise_instruction'),
    autoFocus: true,
    type: "text",
    value: customReviseInstruction,
    onChange: e => setCustomReviseInstruction(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleReviseSelection('custom', customReviseInstruction);
      if (e.key === 'Escape') setIsCustomReviseOpen(false);
    },
    placeholder: t('text_tools.menu_placeholder'),
    className: "text-xs bg-slate-700 border-none rounded-full px-3 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none text-white w-48 placeholder:text-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.continue'),
    onClick: () => handleReviseSelection('custom', customReviseInstruction),
    className: "p-1.5 bg-indigo-600 hover:bg-indigo-600 rounded-full text-white transition-colors",
    disabled: !customReviseInstruction.trim()
  }, /*#__PURE__*/React.createElement(ArrowRight, {
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.close_revision_panel'),
    onClick: handleSetIsCustomReviseOpenToFalse,
    className: "p-1.5 text-slate-600 hover:text-white rounded-full transition-colors"
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, interactionMode === 'explain' && /*#__PURE__*/React.createElement("button", {
    ref: selectionActionRef,
    type: "button",
    "aria-label": readerText('simplified.explain_mode', 'Explain'),
    onClick: () => handleReviseSelection('explain'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(HelpCircle, {
    size: 12,
    className: "text-teal-700"
  }), " ", t('text_tools.explain')), interactionMode === 'revise' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleReviseSelection('simplify'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    className: "text-yellow-700"
  }), " ", t('text_tools.simplify')), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-3 bg-slate-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleReviseSelection('custom-input'),
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 12,
    className: "text-indigo-600"
  }), " ", t('text_tools.custom'))), interactionMode === 'define' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleDefineSelection,
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 12,
    className: "text-yellow-700"
  }), " ", t('text_tools.define')), interactionMode === 'add-glossary' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      handleQuickAddGlossary(selectionMenu.text, true);
      setSelectionMenu(null);
    },
    className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 12,
    className: "text-green-700"
  }), " ", t('text_tools.add_term')))), /*#__PURE__*/React.createElement("div", {
    className: "w-2 h-2 bg-slate-800 rotate-45"
  })), selectionMenu && /*#__PURE__*/React.createElement("div", {
    className: `fixed inset-0 ${_popupBackdropZ} bg-transparent`,
    onMouseDown: e => {
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
    }
  }), revisionData && /*#__PURE__*/React.createElement("div", {
    ref: revisionDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "simplified-revision-title",
    tabIndex: -1,
    onKeyDown: e => containSimplifiedModalFocus(e, revisionDialogRef.current, closeRevision),
    className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-72 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
    style: simplifiedPopupStyle(revisionData, 18)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-100"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "simplified-revision-title",
    className: "font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2"
  }, revisionData.type === 'simplify' ? /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-yellow-500"
  }) : revisionData.type === 'custom' ? /*#__PURE__*/React.createElement(PenTool, {
    size: 14,
    className: "text-indigo-500"
  }) : /*#__PURE__*/React.createElement(HelpCircle, {
    size: 14,
    className: "text-teal-500"
  }), revisionData.type === 'simplify' ? t('simplified.revision.header_simplify') : revisionData.type === 'custom' ? t('simplified.revision.header_custom') : t('simplified.revision.header_explain')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, revisionData.result ? renderSimplifiedPopupSpeaker(SIMPLIFIED_REVISION_AUDIO_ID, revisionData.result) : null, /*#__PURE__*/React.createElement("button", {
    ref: revisionCloseRef,
    type: "button",
    onClick: closeRevision,
    className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), revisionData.result ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3"
  }, renderFormattedText(revisionData.result, false)), isTeacherMode && !protectedOriginal && (revisionData.type === 'simplify' || revisionData.type === 'custom') && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: applyTextRevision,
    className: "min-h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }), " ", t('simplified.revision.replace_btn'))) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-4 gap-2 text-slate-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 20,
    className: "animate-spin motion-reduce:animate-none text-indigo-500"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs"
  }, t('simplified.revision.working')))), revisionData && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `fixed inset-0 ${_popupBackdropZ} bg-black/5`,
    onClick: closeRevision
  }), instructionalRoleControl, versionControls, isCompareMode ? renderSimplifiedComparison() : isEditingLeveledText ? /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-white border border-orange-200 rounded-lg overflow-hidden shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 p-2 bg-orange-50 border-b border-orange-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('bold'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.bold')
  }, /*#__PURE__*/React.createElement(Bold, {
    size: 16,
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('italic'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.italic')
  }, /*#__PURE__*/React.createElement(Italic, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('highlight'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.highlight')
  }, /*#__PURE__*/React.createElement(Highlighter, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h1'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h1')
  }, "H1"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h2'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h2')
  }, "H2"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('h3'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
    title: t('formatting.h3') || 'Heading 3'
  }, "H3"), /*#__PURE__*/React.createElement("div", {
    className: "w-px h-4 bg-orange-200 mx-1"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('list'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.list')
  }, /*#__PURE__*/React.createElement(List, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFormatText('numlist'),
    className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
    title: t('formatting.numlist') || 'Numbered List'
  }, /*#__PURE__*/React.createElement(ListOrdered, {
    size: 16
  }))), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('simplified.revision.placeholder_edit_text') || 'Edit simplified text',
    "data-allo-textundo": "simplified",
    ref: textEditorRef,
    value: generatedContent?.data,
    onChange: e => handleSimplifiedTextChange(e.target.value),
    className: "w-full min-h-[500px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-lg text-slate-800 font-medium leading-relaxed resize-none font-sans",
    spellCheck: "false",
    placeholder: t('simplified.revision.placeholder_edit_text')
  }), renderEditAudioSentenceTools()) : protectedOriginal ? renderOriginalReading() : /*#__PURE__*/React.createElement(React.Fragment, null, isImmersiveReaderActive && generatedContent?.immersiveData && hiddenPassageRef.current ? hiddenPassageRef.current : hiddenPassageRef.current = renderSimplifiedReading(), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: readingColumn + 'ch',
      marginInline: 'auto'
    }
  }, /*#__PURE__*/React.createElement(AdaptedWordHelp, {
    key: generatedContent?.id,
    item: generatedContent,
    teacher: isTeacherMode,
    originalSupports: checkedSupports,
    passageSelector: "[data-reading-passage]",
    language: readingLanguage,
    quiet: interactionMode === 'cloze',
    disabled: isProcessing,
    onUpdate: props.onUpdateReadingSupports,
    onGenerate: props.onGenerateReadingSupports,
    languageTag: simplifiedLanguageTag(readingLanguage),
    direction: typeof getContentDirection === 'function' ? getContentDirection(readingLanguage) : undefined,
    onListen: text => speakExactPassage(text, 'adapted-word-help', readingLanguage),
    listening: isExactPassagePlaying('adapted-word-help'),
    renderCredits: renderPictureCredits
  })))));
}
SimplifiedView.getReadingNavigationSections = getReadingNavigationSections;
SimplifiedView.findRelatedOriginalPassage = findRelatedOriginalPassage;
SimplifiedView.ReadingGlossEditor = ReadingGlossEditor;
SimplifiedView.AdaptedWordHelp = AdaptedWordHelp;
SimplifiedView.locateWordHelp = locateWordHelp;
SimplifiedView.readingTextSegments = readingTextSegments;
SimplifiedView.findGlossOccurrences = findReadingGlossOccurrences;
SimplifiedView.languageTag = simplifiedLanguageTag;
SimplifiedView.wordSegments = simplifiedWordSegments;
SimplifiedView.paragraphBlocks = simplifiedParagraphBlocks;
SimplifiedView.alignImmersiveWords = alignImmersiveWords;
SimplifiedView.resolveReferences = resolveSimplifiedReferences;
SimplifiedView.hasCitationMarkers = simplifiedBodyHasCitationMarkers;
SimplifiedView.getInstructionalText = getSimplifiedInstructionalText;
SimplifiedView.updateInstructionalRole = updateSimplifiedInstructionalRole;
SimplifiedView.upsertFullHistoryArtifact = upsertFullHistoryArtifact;
SimplifiedView.resolveCompareSource = resolveSimplifiedCompareSource;
SimplifiedView.getComplexityDisplay = getSimplifiedComplexityDisplay;
SimplifiedView.checkAlignment = checkSimplifiedAlignment;
SimplifiedView.regenerateWithRigor = regenerateSimplifiedWithRigor;
SimplifiedView.ReadingRoleControl = SimplifiedReadingRoleControl;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
