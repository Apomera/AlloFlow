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

  // i18n accessor for module-level code (2026-06-11): components/handlers below call t('key')
// without binding it (only some do `var t = props.t`), so a free t() throws ReferenceError
// when they run — latent crashes the SSR golden tests never fire. Bind once at module scope
// to the app global i18n (window.__alloT); components that DO `var t = props.t` shadow this.
var t = function () {
  if (typeof window !== 'undefined' && typeof window.__alloT === 'function') {
    try {
      return window.__alloT.apply(null, arguments);
    } catch (e) {}
  }
  return arguments.length > 1 ? arguments[1] : arguments[0];
};
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
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
var quizreducedMotionClass = 'motion-reduce:animate-none';
function _quizFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  var selector = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  return Array.prototype.slice.call(container.querySelectorAll(selector)).filter(function (el) {
    if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true' || el.closest && el.closest('[inert]')) return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || typeof el.getClientRects !== 'function' || el.getClientRects().length > 0;
  });
}
function _quizHandleDialogKeyDown(event, dialogRef, closeDialog) {
  if (!event) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeDialog();
    return;
  }
  if (event.key !== 'Tab') return;
  var dialog = dialogRef && dialogRef.current;
  var focusable = _quizFocusableElements(dialog);
  if (!dialog || focusable.length === 0) {
    event.preventDefault();
    if (dialog && typeof dialog.focus === 'function') dialog.focus();
    return;
  }
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  var active = typeof document !== 'undefined' ? document.activeElement : null;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}
function _quizShuffleCopy(arr) {
  var copy = (arr || []).slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
var _QUIZ_DRAFT_STORAGE_PREFIX = 'alloflow_assess_draft_v1:';
var _QUIZ_ATTEMPT_STORAGE_PREFIX = 'alloflow_assess_attempt_v1:';
var _QUIZ_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
var _quizDraftMemory = {};
var _quizClosedDrafts = {};
function _quizDraftNamespace(data, sessionCode) {
  var questions = data && Array.isArray(data.questions) ? data.questions : [];
  var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
  var identity = JSON.stringify({
    title: data && data.title || '',
    questions: questions.map(function (q) {
      return {
        type: q && q.type || 'mcq',
        question: q && q.question || '',
        options: q && (q.options || q.answerOptions || q.evidenceOptions || q.items || q.pairs) || [],
        key: q && (q.correctAnswer || q.correctAnswers || q.expectedFill || q.expectedAnswer || q.correctValue || q.correctPartnerForWrong || q.rubric) || ''
      };
    }),
    reflections: reflections
  });
  var hash = 2166136261;
  for (var i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return _QUIZ_DRAFT_STORAGE_PREFIX + String(sessionCode || 'local') + ':' + (hash >>> 0).toString(36);
}
function _quizLocalStorage() {
  // Reading window.localStorage THROWS (not merely returns undefined) in
  // sandboxed iframes and opaque origins — probe it inside a try.
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch (e) {
    return null;
  }
}
function _quizReadDraft(namespace) {
  var storage = _quizLocalStorage();
  if (!namespace || !storage) return null;
  try {
    var raw = storage.getItem(namespace);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.items || typeof parsed.items !== 'object') return null;
    if (!Number.isFinite(Number(parsed.updatedAt)) || Date.now() - Number(parsed.updatedAt) > _QUIZ_DRAFT_MAX_AGE_MS) {
      storage.removeItem(namespace);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}
function _quizReadDraftField(namespace, itemKey, field) {
  var draft = _quizReadDraft(namespace);
  var item = draft && draft.items && draft.items[itemKey];
  return item && Object.prototype.hasOwnProperty.call(item, field) ? {
    found: true,
    value: item[field]
  } : {
    found: false,
    value: undefined
  };
}
function _quizWriteDraftField(namespace, itemKey, field, value) {
  if (_quizClosedDrafts[namespace]) return false;
  var storage = _quizLocalStorage();
  if (!namespace || !storage) return false;
  try {
    var draft = _quizReadDraft(namespace) || {
      version: 1,
      createdAt: Date.now(),
      items: {}
    };
    draft.items[itemKey] = Object.assign({}, draft.items[itemKey] || {});
    draft.items[itemKey][field] = value;
    draft.updatedAt = Date.now();
    storage.setItem(namespace, JSON.stringify(draft));
    try {
      window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-saved', {
        detail: {
          namespace: namespace,
          updatedAt: draft.updatedAt
        }
      }));
    } catch (eventError) {}
    return true;
  } catch (e) {
    try {
      window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-error', {
        detail: {
          namespace: namespace
        }
      }));
    } catch (eventError) {}
    return false;
  }
}
function _quizStageDraftField(namespace, itemKey, field, value) {
  if (!namespace || _quizClosedDrafts[namespace]) return;
  var staged = _quizDraftMemory[namespace] || {
    items: {}
  };
  staged.items[itemKey] = Object.assign({}, staged.items[itemKey] || {});
  staged.items[itemKey][field] = value;
  staged.updatedAt = Date.now();
  _quizDraftMemory[namespace] = staged;
  try {
    window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-changed', {
      detail: {
        namespace: namespace
      }
    }));
  } catch (e) {}
}
function _quizReadWorkingDraft(namespace) {
  var persisted = _quizReadDraft(namespace) || {
    version: 1,
    createdAt: Date.now(),
    items: {}
  };
  var working = {
    version: 1,
    createdAt: persisted.createdAt || Date.now(),
    updatedAt: Date.now(),
    items: Object.assign({}, persisted.items || {})
  };
  var staged = _quizDraftMemory[namespace];
  if (staged && staged.items) {
    Object.keys(staged.items).forEach(function (itemKey) {
      working.items[itemKey] = Object.assign({}, working.items[itemKey] || {}, staged.items[itemKey]);
    });
  }
  return working;
}
function _quizQuestionAnswered(question, questionIdx, draft) {
  var items = draft && draft.items || {};
  var root = items.root || {};
  var item = items['q-' + questionIdx] || {};
  var type = question && question.type || 'mcq';
  if (type === 'mcq') {
    return !!(root.mcqAnswers && Object.prototype.hasOwnProperty.call(root.mcqAnswers, questionIdx) && typeof root.mcqAnswers[questionIdx] === 'number');
  }
  if (type === 'multi-select') return Array.isArray(item.selected) && item.selected.length > 0;
  if (type === 'answer-evidence') return typeof item.answerIdx === 'number' && typeof item.evidenceIdx === 'number';
  if (type === 'numeric-response' || type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') return !!String(item.response || '').trim();
  if (type === 'sequence-sense') return !!item.grade || item.verifyAnswer != null && !!String(item.principleAnswer || '').trim();
  if (type === 'relation-mismatch') return !!item.grade || typeof item.clickedPairIdx === 'number' && !!String(item.partnerAnswer || '').trim();
  return !!String(item.response || '').trim();
}
function _quizBuildAttemptProgress(data, draft) {
  var questions = data && Array.isArray(data.questions) ? data.questions : [];
  var root = draft && draft.items && draft.items.root || {};
  var flags = root.flaggedQuestions || {};
  var items = questions.map(function (question, questionIdx) {
    return {
      questionIdx: questionIdx,
      type: question && question.type || 'mcq',
      label: question && (question.question || question.contextSentence) || 'Question ' + (questionIdx + 1),
      answered: _quizQuestionAnswered(question, questionIdx, draft),
      flagged: !!flags[questionIdx]
    };
  });
  var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
  var reflectionAnswers = root.reflectionAnswers || {};
  var reflectionAnswered = reflections.reduce(function (count, reflection, idx) {
    var entry = reflectionAnswers[idx] || {};
    return count + (entry.submitted || String(entry.draft || '').trim() ? 1 : 0);
  }, 0);
  var answered = items.filter(function (item) {
    return item.answered;
  }).length;
  return {
    total: items.length,
    answered: answered,
    unanswered: items.length - answered,
    flagged: items.filter(function (item) {
      return item.flagged;
    }).length,
    items: items,
    reflectionTotal: reflections.length,
    reflectionAnswered: reflectionAnswered
  };
}
function _quizAttemptStorageKey(namespace) {
  if (!namespace) return '';
  return namespace.indexOf(_QUIZ_DRAFT_STORAGE_PREFIX) === 0 ? _QUIZ_ATTEMPT_STORAGE_PREFIX + namespace.slice(_QUIZ_DRAFT_STORAGE_PREFIX.length) : _QUIZ_ATTEMPT_STORAGE_PREFIX + namespace;
}
function _quizReadAttemptReceipt(namespace) {
  var storage = _quizLocalStorage();
  var key = _quizAttemptStorageKey(namespace);
  if (!storage || !key) return null;
  try {
    var raw = storage.getItem(key);
    var receipt = raw ? JSON.parse(raw) : null;
    return receipt && receipt.version === 1 && receipt.submittedAt ? receipt : null;
  } catch (e) {
    return null;
  }
}
function _quizFinalizeAttempt(namespace, payload) {
  var storage = _quizLocalStorage();
  var key = _quizAttemptStorageKey(namespace);
  if (!storage || !namespace || !key) return null;
  try {
    var receipt = Object.assign({
      version: 1,
      submittedAt: Date.now()
    }, payload || {});
    storage.setItem(key, JSON.stringify(receipt));
    _quizClosedDrafts[namespace] = true;
    storage.removeItem(namespace);
    delete _quizDraftMemory[namespace];
    return receipt;
  } catch (e) {
    return null;
  }
}
function _quizClearAttemptReceipt(namespace) {
  var storage = _quizLocalStorage();
  var key = _quizAttemptStorageKey(namespace);
  if (!storage || !key) return false;
  try {
    storage.removeItem(key);
    storage.removeItem(namespace);
    delete _quizDraftMemory[namespace];
    delete _quizClosedDrafts[namespace];
    return true;
  } catch (e) {
    return false;
  }
}
function _quizNormalizeDeliverySettings(raw) {
  var source = raw && typeof raw === 'object' ? raw : {};
  var minutes = Math.max(0, Math.min(240, Number(source.timeLimitMinutes) || 0));
  var extension = Math.max(1, Math.min(60, Number(source.extensionMinutes) || 5));
  var warning = Math.max(1, Math.min(15, Number(source.warningMinutes) || 2));
  return {
    profile: source.profile || 'flexible',
    pacing: source.pacing === 'one-at-a-time' ? 'one-at-a-time' : 'all-at-once',
    timeLimitMinutes: minutes,
    extensionMinutes: extension,
    warningMinutes: warning,
    allowFlagging: source.allowFlagging !== false,
    showProgress: source.showProgress !== false
  };
}
function _quizUseDraftField(namespace, itemKey, field, initialValue) {
  var restoredRef = React.useRef(false);
  var mountedRef = React.useRef(false);
  var state = React.useState(function () {
    var stored = _quizReadDraftField(namespace, itemKey, field);
    if (stored.found) {
      restoredRef.current = true;
      return stored.value;
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });
  React.useEffect(function () {
    if (!namespace) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    var timer = window.setTimeout(function () {
      _quizWriteDraftField(namespace, itemKey, field, state[0]);
    }, 350);
    return function () {
      window.clearTimeout(timer);
    };
  }, [namespace, itemKey, field, state[0]]);
  function setDraftState(value) {
    state[1](function (previous) {
      var next = typeof value === 'function' ? value(previous) : value;
      _quizStageDraftField(namespace, itemKey, field, next);
      return next;
    });
  }
  return [state[0], setDraftState, restoredRef.current];
}
function AssessmentDraftStatus(p) {
  var initial = _quizReadDraft(p.namespace);
  var statusState = React.useState(initial ? {
    state: 'restored',
    updatedAt: initial.updatedAt
  } : {
    state: 'idle',
    updatedAt: null
  });
  var status = statusState[0];
  var setStatus = statusState[1];
  React.useEffect(function () {
    function saved(event) {
      if (event && event.detail && event.detail.namespace === p.namespace) setStatus({
        state: 'saved',
        updatedAt: event.detail.updatedAt
      });
    }
    function failed(event) {
      if (event && event.detail && event.detail.namespace === p.namespace) setStatus({
        state: 'error',
        updatedAt: null
      });
    }
    window.addEventListener('alloflow:assessment-draft-saved', saved);
    window.addEventListener('alloflow:assessment-draft-error', failed);
    return function () {
      window.removeEventListener('alloflow:assessment-draft-saved', saved);
      window.removeEventListener('alloflow:assessment-draft-error', failed);
    };
  }, [p.namespace]);
  var timeLabel = status.updatedAt ? new Date(status.updatedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  }) : '';
  var message = status.state === 'restored' ? 'Restored your saved work from this device.' : status.state === 'saved' ? 'Saved locally' + (timeLabel ? ' at ' + timeLabel : '') + '.' : status.state === 'error' ? 'Local autosave is unavailable in this browser.' : 'Answers save automatically on this device.';
  return /*#__PURE__*/React.createElement("div", {
    className: 'rounded-lg border px-3 py-2 flex items-center gap-2 text-xs ' + (status.state === 'error' ? 'bg-amber-50 border-amber-300 text-amber-900' : status.state === 'restored' ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-white border-slate-200 text-slate-700'),
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, status.state === 'error' ? '⚠' : status.state === 'restored' ? '↻' : '✓'), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, message), /*#__PURE__*/React.createElement("span", {
    className: "ml-1 text-slate-500"
  }, "Drafts expire after 7 days.")));
}
function AssessmentDeliveryPanel(p) {
  var settings = _quizNormalizeDeliverySettings(p.settings);
  var expandedState = React.useState(false);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];
  var presets = [{
    id: 'flexible',
    label: 'Flexible access',
    description: 'Untimed, all questions visible',
    values: {
      profile: 'flexible',
      pacing: 'all-at-once',
      timeLimitMinutes: 0,
      extensionMinutes: 5,
      warningMinutes: 2,
      allowFlagging: true,
      showProgress: true
    }
  }, {
    id: 'focused',
    label: 'Focused steps',
    description: 'Untimed, one question at a time',
    values: {
      profile: 'focused',
      pacing: 'one-at-a-time',
      timeLimitMinutes: 0,
      extensionMinutes: 5,
      warningMinutes: 2,
      allowFlagging: true,
      showProgress: true
    }
  }, {
    id: 'timed-practice',
    label: 'Timed practice',
    description: '20 minutes with pause, warning, and extensions',
    values: {
      profile: 'timed-practice',
      pacing: 'one-at-a-time',
      timeLimitMinutes: 20,
      extensionMinutes: 5,
      warningMinutes: 2,
      allowFlagging: true,
      showProgress: true
    }
  }];
  function apply(next) {
    if (typeof p.onChange === 'function') p.onChange(_quizNormalizeDeliverySettings(next));
  }
  function patch(field, value) {
    var next = Object.assign({}, settings);
    next[field] = value;
    next.profile = 'custom';
    apply(next);
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "rounded-xl border-2 border-violet-200 bg-violet-50 p-4",
    "aria-labelledby": "assessment-delivery-heading"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    id: "assessment-delivery-heading",
    className: "font-black text-violet-950"
  }, "Access & delivery"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-violet-900 mt-1"
  }, "Choose a neutral class-wide starting point, then customize it. No diagnosis or accommodation reason is recorded.")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setExpanded(!expanded);
    },
    "aria-expanded": expanded,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-violet-300 text-violet-900"
  }, expanded ? 'Hide settings' : 'Customize')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3"
  }, presets.map(function (preset) {
    var active = settings.profile === preset.id;
    return /*#__PURE__*/React.createElement("button", {
      key: preset.id,
      type: "button",
      onClick: function () {
        apply(preset.values);
      },
      "aria-pressed": active,
      className: 'text-left rounded-lg border p-3 transition-colors motion-reduce:transition-none ' + (active ? 'bg-violet-700 border-violet-800 text-white' : 'bg-white border-violet-200 text-violet-950 hover:border-violet-400')
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-black"
    }, preset.label), /*#__PURE__*/React.createElement("span", {
      className: 'block text-[11px] mt-1 ' + (active ? 'text-violet-100' : 'text-violet-800')
    }, preset.description));
  })), expanded && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 p-3 rounded-lg bg-white border border-violet-200"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Pacing", /*#__PURE__*/React.createElement("select", {
    value: settings.pacing,
    onChange: function (e) {
      patch('pacing', e.target.value);
    },
    className: "mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
  }, /*#__PURE__*/React.createElement("option", {
    value: "all-at-once"
  }, "All questions visible"), /*#__PURE__*/React.createElement("option", {
    value: "one-at-a-time"
  }, "One at a time"))), /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Time limit (minutes)", /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    max: "240",
    value: settings.timeLimitMinutes,
    onChange: function (e) {
      patch('timeLimitMinutes', Number(e.target.value));
    },
    className: "mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
  }), /*#__PURE__*/React.createElement("span", {
    className: "block text-[10px] font-normal text-slate-500 mt-1"
  }, "0 means untimed")), /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Extension step", /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "60",
    value: settings.extensionMinutes,
    onChange: function (e) {
      patch('extensionMinutes', Number(e.target.value));
    },
    className: "mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
  }), /*#__PURE__*/React.createElement("span", {
    className: "block text-[10px] font-normal text-slate-500 mt-1"
  }, "Learners can add this privately")), /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Warning (minutes)", /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "15",
    value: settings.warningMinutes,
    onChange: function (e) {
      patch('warningMinutes', Number(e.target.value));
    },
    className: "mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
  })), /*#__PURE__*/React.createElement("label", {
    className: "sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: settings.allowFlagging,
    onChange: function (e) {
      patch('allowFlagging', e.target.checked);
    }
  }), "Allow learners to flag questions for review"), /*#__PURE__*/React.createElement("label", {
    className: "sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: settings.showProgress,
    onChange: function (e) {
      patch('showProgress', e.target.checked);
    }
  }), "Show question progress"), /*#__PURE__*/React.createElement("p", {
    className: "sm:col-span-2 lg:col-span-4 text-[11px] text-slate-600"
  }, "Timed assessments always support pause and extensions. Reaching zero opens the review screen; it never submits or deletes work automatically.")));
}
function AssessmentQuestionFlagButton(p) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onToggle,
    "aria-pressed": !!p.flagged,
    className: 'text-xs font-bold px-2.5 py-1 rounded-lg border ' + (p.flagged ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, p.flagged ? '⚑ ' : '⚐ '), p.flagged ? 'Flagged for review' : 'Flag for review');
}
function AssessmentTimerBar(p) {
  if (!p.enabled) return null;
  var seconds = Math.max(0, Number(p.remainingSeconds) || 0);
  var minutesPart = Math.floor(seconds / 60);
  var secondsPart = String(seconds % 60).padStart(2, '0');
  var warning = seconds <= (Number(p.warningMinutes) || 2) * 60;
  return /*#__PURE__*/React.createElement("div", {
    className: 'rounded-xl border-2 p-3 flex items-center gap-3 flex-wrap ' + (p.expired ? 'bg-rose-50 border-rose-300' : warning ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-300'),
    role: "region",
    "aria-label": "Assessment timer"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-black tracking-wider text-slate-600"
  }, "Time remaining"), /*#__PURE__*/React.createElement("div", {
    role: "timer",
    "aria-live": warning ? 'polite' : 'off',
    className: 'text-xl font-black tabular-nums ' + (p.expired ? 'text-rose-800' : warning ? 'text-amber-900' : 'text-slate-800')
  }, minutesPart + ':' + secondsPart)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 ml-auto flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onTogglePause,
    disabled: p.expired,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-50"
  }, p.running ? 'Pause timer' : 'Resume timer'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onExtend,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
  }, '+' + p.extensionMinutes + ' minutes'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onReview,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white"
  }, "Review & submit")), p.expired && /*#__PURE__*/React.createElement("p", {
    className: "basis-full text-xs font-semibold text-rose-900"
  }, "The planned time has ended. Your work is safe—review it, add time, or submit when ready."));
}
function AssessmentReviewDialog(p) {
  var dialogRef = React.useRef(null);
  var closeRef = React.useRef(null);
  var previousFocusRef = React.useRef(null);
  var confirmState = React.useState(false);
  var confirmIncomplete = confirmState[0];
  var setConfirmIncomplete = confirmState[1];
  React.useEffect(function () {
    if (!p.open) return;
    try {
      previousFocusRef.current = document.activeElement;
    } catch (e) {}
    var timer = setTimeout(function () {
      try {
        if (closeRef.current) closeRef.current.focus();
      } catch (e) {}
    }, 0);
    return function () {
      clearTimeout(timer);
      var previous = previousFocusRef.current;
      previousFocusRef.current = null;
      try {
        if (previous && typeof previous.focus === 'function') previous.focus();
      } catch (e) {}
    };
  }, [p.open]);
  React.useEffect(function () {
    if (!p.open) setConfirmIncomplete(false);
  }, [p.open]);
  if (!p.open) return null;
  var progress = p.progress || {
    total: 0,
    answered: 0,
    unanswered: 0,
    flagged: 0,
    items: []
  };
  function requestSubmit() {
    if (progress.unanswered > 0 && !confirmIncomplete) {
      setConfirmIncomplete(true);
      return;
    }
    if (typeof p.onSubmit === 'function') p.onSubmit();
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60",
    onMouseDown: function (e) {
      if (e.target === e.currentTarget) p.onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: dialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "assessment-review-title",
    tabIndex: -1,
    onKeyDown: function (e) {
      _quizHandleDialogKeyDown(e, dialogRef, p.onClose);
    },
    className: "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border-2 border-indigo-300 shadow-2xl p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    id: "assessment-review-title",
    className: "text-xl font-black text-slate-900"
  }, "Review your assessment"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 mt-1"
  }, "Nothing is final until you choose Submit assessment.")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    ref: closeRef,
    onClick: p.onClose,
    "aria-label": "Close review",
    className: "w-9 h-9 rounded-full border border-slate-300 text-slate-700"
  }, "×")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 my-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-emerald-800"
  }, progress.answered), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-bold uppercase text-emerald-700"
  }, "Answered")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-amber-50 border border-amber-200 p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-amber-900"
  }, progress.unanswered), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-bold uppercase text-amber-800"
  }, "Unanswered")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-slate-50 border border-slate-200 p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-slate-800"
  }, progress.flagged), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-bold uppercase text-slate-600"
  }, "Flagged"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, progress.items.map(function (item) {
    return /*#__PURE__*/React.createElement("button", {
      key: item.questionIdx,
      type: "button",
      onClick: function () {
        p.onGo(item.questionIdx);
      },
      className: "w-full flex items-center gap-3 text-left rounded-lg border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50"
    }, /*#__PURE__*/React.createElement("span", {
      className: 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ' + (item.answered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')
    }, item.answered ? '✓' : '—'), /*#__PURE__*/React.createElement("span", {
      className: "flex-grow min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-[10px] uppercase font-bold text-slate-500"
    }, 'Question ' + (item.questionIdx + 1) + ' · ' + item.type), /*#__PURE__*/React.createElement("span", {
      className: "block text-sm text-slate-800 truncate"
    }, item.label)), item.flagged && /*#__PURE__*/React.createElement("span", {
      className: "text-amber-700 font-black",
      "aria-label": "Flagged"
    }, "⚑"));
  })), progress.reflectionTotal > 0 && /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-xs text-slate-600"
  }, 'Reflections completed: ' + progress.reflectionAnswered + ' / ' + progress.reflectionTotal), confirmIncomplete && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950",
    role: "alert"
  }, progress.unanswered + ' question' + (progress.unanswered === 1 ? ' is' : 's are') + ' still unanswered. Submit anyway, or return to finish them.'), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 flex items-center justify-end gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onClose,
    className: "px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold"
  }, "Keep working"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: requestSubmit,
    className: 'px-4 py-2 rounded-lg text-white text-sm font-black ' + (confirmIncomplete ? 'bg-amber-700 hover:bg-amber-800' : 'bg-indigo-600 hover:bg-indigo-700')
  }, confirmIncomplete ? 'Submit with unanswered items' : 'Submit assessment'))));
}
function AssessmentSubmittedPanel(p) {
  var receipt = p.receipt || {};
  var summary = receipt.summary || {};
  var submittedLabel = receipt.submittedAt ? new Date(receipt.submittedAt).toLocaleString() : 'just now';
  return /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 shadow-sm",
    role: "status"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl mb-2",
    "aria-hidden": "true"
  }, "✓"), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-emerald-950"
  }, "Assessment submitted"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-emerald-900 mt-2"
  }, "Your completed attempt is saved on this device. The in-progress draft was cleared only after that receipt was written."), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex gap-2 flex-wrap text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-white border border-emerald-200 px-3 py-1 font-bold text-emerald-900"
  }, (summary.answered || 0) + ' / ' + (summary.total || 0) + ' answered'), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-white border border-emerald-200 px-3 py-1 font-bold text-emerald-900"
  }, 'Submitted ' + submittedLabel)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onStartAnother,
    className: "mt-5 px-4 py-2 rounded-lg bg-white border border-emerald-400 text-emerald-900 text-sm font-bold"
  }, "Start another attempt"));
}
function SequenceSenseCard(p) {
  var q = p.q;
  var canonicalItems = Array.isArray(q.items) ? q.items.filter(Boolean) : [];
  var intentionallyWrongIndex = typeof q.intentionallyWrongIndex === 'number' ? q.intentionallyWrongIndex : null;
  var orderingPrinciple = q.orderingPrinciple || 'chronological';
  var principleOptions = Array.isArray(q.principleOptions) && q.principleOptions.length >= 2 ? q.principleOptions : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
  var modeStrat = p.modeStrategy || null;
  var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
  var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
  var explainerState = React.useState({
    open: false,
    loading: false,
    text: '',
    error: ''
  });
  var explainer = explainerState[0];
  var setExplainer = explainerState[1];
  function requestExplainer() {
    if (typeof p.callGemini !== 'function') {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: 'Explainer unavailable.'
      });
      return;
    }
    setExplainer({
      open: true,
      loading: true,
      text: '',
      error: ''
    });
    var grade = p.gradeLevel || 'middle school';
    var conceptHint = (q.question || '') + ' — Items in canonical order: ' + canonicalItems.join(', ') + '. Ordering principle: ' + orderingPrinciple + '.';
    var prompt = 'You are a patient teacher. A ' + grade + ' student is working a sequencing item and needs help. ' + conceptHint + '\n\nGive a 60-90 word explanation in plain language: name the ordering principle, walk through one or two items as a concrete example, and end with a sentence checking understanding. Plain text only — no headings, no bullet points.';
    Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
      var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
      setExplainer({
        open: true,
        loading: false,
        text: txt.trim(),
        error: ''
      });
    }).catch(function (err) {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: err && err.message ? err.message : 'Explainer failed.'
      });
    });
  }
  function markIDK() {
    setStep('done');
    setGrade({
      step1Correct: false,
      step2Correct: false,
      step3Correct: false,
      status: 'idk',
      score: 0
    });
    if (aiExplainerEnabled) requestExplainer();
    if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: 'sequence-sense',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            idk: true
          },
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }
  var draftItemKey = 'q-' + p.questionIdx;
  var presentedOrderState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'presentedOrder', function () {
    if (Array.isArray(q.presentedOrder) && q.presentedOrder.length === canonicalItems.length) {
      return q.presentedOrder.slice();
    }
    var indices = canonicalItems.map(function (_, i) {
      return i;
    });
    for (var i = indices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    return indices;
  });
  var presentedOrder = presentedOrderState[0];
  var stepState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'step', 1);
  var step = stepState[0];
  var setStep = stepState[1];
  var verifyState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'verifyAnswer', null);
  var verifyAnswer = verifyState[0];
  var setVerifyAnswer = verifyState[1];
  var clickedState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'clickedIdx', null);
  var clickedIdx = clickedState[0];
  var setClickedIdx = clickedState[1];
  var principleState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'principleAnswer', null);
  var principleAnswer = principleState[0];
  var setPrincipleAnswer = principleState[1];
  var gradeState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'grade', null);
  var grade = gradeState[0];
  var setGrade = gradeState[1];
  function answerVerify(ans) {
    setVerifyAnswer(ans);
    setStep(ans === 'no' ? 2 : 3);
  }
  function answerMisplaced(idx) {
    setClickedIdx(idx);
    setStep(3);
  }
  function answerPrinciple(p2) {
    setPrincipleAnswer(p2);
    var actualOrderIsCorrect = intentionallyWrongIndex === null;
    var step1Correct = verifyAnswer === 'yes' ? actualOrderIsCorrect : !actualOrderIsCorrect;
    var step2Correct;
    if (verifyAnswer === 'yes') {
      step2Correct = step1Correct;
    } else {
      step2Correct = clickedIdx === intentionallyWrongIndex;
    }
    var step3Correct = p2 === orderingPrinciple;
    var rawScore = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0) + (step3Correct ? 1 : 0);
    var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
    var score = partialCredit ? rawScore : rawScore === 3 ? 3 : 0;
    var status = score === 3 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
    setGrade({
      step1Correct: step1Correct,
      step2Correct: step2Correct,
      step3Correct: step3Correct,
      status: status,
      score: score
    });
    setStep('done');
    if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: 'sequence-sense',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            verifyAnswer: verifyAnswer,
            clickedIdx: clickedIdx,
            principleAnswer: p2,
            score: score,
            status: status
          },
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }
  function reset() {
    setStep(1);
    setVerifyAnswer(null);
    setClickedIdx(null);
    setPrincipleAnswer(null);
    setGrade(null);
  }
  if (canonicalItems.length === 0) return null;
  var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1"
  }, "Sequence Sense"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, q.question || 'Below is a sequence. Verify and explain.'))), /*#__PURE__*/React.createElement("ol", {
    className: "space-y-1.5 mb-3"
  }, presentedOrder.map(function (canonicalIdx, displayIdx) {
    var item = canonicalItems[canonicalIdx];
    var isClickable = step === 2;
    var isClicked = clickedIdx === displayIdx;
    var showCorrectness = grade !== null;
    var thisIsActuallyMisplaced = intentionallyWrongIndex === displayIdx;
    var rowClass;
    if (showCorrectness) {
      if (thisIsActuallyMisplaced) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
    } else if (isClicked) {
      rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
    } else {
      rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
    }
    return /*#__PURE__*/React.createElement("li", {
      key: displayIdx,
      onClick: isClickable ? function () {
        answerMisplaced(displayIdx);
      } : null,
      className: 'flex items-center gap-2 px-3 py-2 rounded-lg border ' + rowClass,
      role: isClickable ? 'button' : undefined,
      tabIndex: isClickable ? 0 : undefined,
      onKeyDown: isClickable ? function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          answerMisplaced(displayIdx);
        }
      } : undefined
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex-shrink-0 text-xs font-bold text-slate-600 w-6"
    }, displayIdx + 1 + '.'), /*#__PURE__*/React.createElement("span", {
      className: "flex-1 text-sm text-slate-800"
    }, item), showCorrectness && thisIsActuallyMisplaced && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-amber-700"
    }, "↔ misplaced"), showCorrectness && isClicked && !thisIsActuallyMisplaced && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-rose-700"
    }, "✗"));
  })), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-indigo-50 border border-indigo-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-semibold text-indigo-900 mb-2"
  }, "Step 1 of 3 — Is this order correct?"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      answerVerify('yes');
    },
    className: "flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors motion-reduce:transition-none"
  }, "✓ Yes, correct"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      answerVerify('no');
    },
    className: "flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors motion-reduce:transition-none"
  }, "✗ No, something is off"), allowIDK && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none",
    "aria-label": "I don't know — skip without penalty",
    title: t("tooltips.skip_ai_explain")
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤔 "), "I don't know"))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-indigo-50 border border-indigo-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-semibold text-indigo-900"
  }, "Step 2 of 3 — Click the item that's out of place above.")), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-indigo-50 border border-indigo-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-semibold text-indigo-900 mb-2"
  }, "Step 3 of 3 — What's the ordering principle?"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-3 gap-2"
  }, principleOptions.map(function (opt) {
    return /*#__PURE__*/React.createElement("button", {
      key: opt,
      type: "button",
      onClick: function () {
        answerPrinciple(opt);
      },
      className: "px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors motion-reduce:transition-none"
    }, opt);
  }))), grade && /*#__PURE__*/React.createElement("div", {
    className: 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300',
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'
  }, grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 3 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review'))), grade.status !== 'idk' && /*#__PURE__*/React.createElement("ul", {
    className: 'space-y-1 text-sm text-' + statusColor + '-900'
  }, /*#__PURE__*/React.createElement("li", null, (grade.step1Correct ? '✓ ' : '✗ ') + 'Verify: ' + (intentionallyWrongIndex === null ? 'order was correct' : 'order had one misplaced item') + (grade.step1Correct ? '' : ' (you said "' + verifyAnswer + '")')), verifyAnswer === 'no' && /*#__PURE__*/React.createElement("li", null, (grade.step2Correct ? '✓ ' : '✗ ') + 'Diagnose: ' + (grade.step2Correct ? 'you found the misplaced item' : 'the misplaced item was item #' + ((intentionallyWrongIndex || 0) + 1))), /*#__PURE__*/React.createElement("li", null, (grade.step3Correct ? '✓ ' : '✗ ') + 'Principle: ' + (grade.step3Correct ? '"' + orderingPrinciple + '"' : 'correct answer was "' + orderingPrinciple + '" (you picked "' + principleAnswer + '")'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: reset,
    className: "px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300"
  }, "Try again"), aiExplainerEnabled && !explainer.open && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: requestExplainer,
    className: "px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
  }, "🤖 Explain this concept"))), explainer.open && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
  }, "🤖 Quick explanation"), explainer.loading && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-700 italic"
  }, "Generating explanation…"), explainer.text && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, explainer.text), explainer.error && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-rose-700"
  }, explainer.error), explainer.text && typeof p.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      // p.callTTS returns the audio URL without playing — never wired up
      // a playback step here, so the original button silently fetched and
      // discarded the audio. Route through AlloSpeechPlayer instead: it
      // plays, respects mute, allows click-stop, and toasts on failure.
      try {
        if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);else p.callTTS(explainer.text);
      } catch (e) {}
    },
    className: "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900",
    "aria-label": t("a11y.read_aloud")
  }, "🔊 Read aloud")));
}
function RelationMismatchCard(p) {
  var q = p.q;
  var pairs = Array.isArray(q.pairs) ? q.pairs.filter(function (pr) {
    return pr && pr.left && pr.right;
  }) : [];
  var wrongPairIndex = typeof q.wrongPairIndex === 'number' ? q.wrongPairIndex : 0;
  var correctPartnerForWrong = q.correctPartnerForWrong || '';
  var candidatePartners = Array.isArray(q.candidatePartners) ? q.candidatePartners : [];
  var draftItemKey = 'q-' + p.questionIdx;
  var stepState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'step', 1);
  var step = stepState[0];
  var setStep = stepState[1];
  var clickedPairState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'clickedPairIdx', null);
  var clickedPairIdx = clickedPairState[0];
  var setClickedPairIdx = clickedPairState[1];
  var partnerAnswerState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'partnerAnswer', null);
  var partnerAnswer = partnerAnswerState[0];
  var setPartnerAnswer = partnerAnswerState[1];
  var gradeState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'grade', null);
  var grade = gradeState[0];
  var setGrade = gradeState[1];
  var modeStrat = p.modeStrategy || null;
  var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
  var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
  var explainerState = React.useState({
    open: false,
    loading: false,
    text: '',
    error: ''
  });
  var explainer = explainerState[0];
  var setExplainer = explainerState[1];
  function requestExplainer() {
    if (typeof p.callGemini !== 'function') {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: 'Explainer unavailable.'
      });
      return;
    }
    setExplainer({
      open: true,
      loading: true,
      text: '',
      error: ''
    });
    var grade = p.gradeLevel || 'middle school';
    var leftSide = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
    var conceptHint = (q.question || '') + ' — The correct relationship is "' + leftSide + '" ↔ "' + correctPartnerForWrong + '".';
    var prompt = 'You are a patient teacher. A ' + grade + ' student is working a relation-mismatch item and needs help. ' + conceptHint + '\n\nGive a 60-90 word explanation in plain language: name what makes this relationship correct, and contrast it with the wrong pair the student saw. End with a sentence checking understanding. Plain text only — no headings, no bullet points.';
    Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
      var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
      setExplainer({
        open: true,
        loading: false,
        text: txt.trim(),
        error: ''
      });
    }).catch(function (err) {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: err && err.message ? err.message : 'Explainer failed.'
      });
    });
  }
  function markIDK() {
    setStep('done');
    setGrade({
      step1Correct: false,
      step2Correct: false,
      status: 'idk',
      score: 0
    });
    if (aiExplainerEnabled) requestExplainer();
    if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: 'relation-mismatch',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            idk: true
          },
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }
  function answerWhichWrong(idx) {
    setClickedPairIdx(idx);
    setStep(2);
  }
  function answerPartner(ans) {
    setPartnerAnswer(ans);
    var step1Correct = clickedPairIdx === wrongPairIndex;
    var step2Correct = ans === correctPartnerForWrong;
    var rawScore = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0);
    var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
    var score = partialCredit ? rawScore : rawScore === 2 ? 2 : 0;
    var status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
    setGrade({
      step1Correct: step1Correct,
      step2Correct: step2Correct,
      status: status,
      score: score
    });
    setStep('done');
    if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: 'relation-mismatch',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            clickedPairIdx: clickedPairIdx,
            partnerAnswer: ans,
            score: score,
            status: status
          },
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }
  function reset() {
    setStep(1);
    setClickedPairIdx(null);
    setPartnerAnswer(null);
    setGrade(null);
  }
  if (pairs.length === 0) return null;
  var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
  var wrongPairLeft = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1"
  }, "Relation Mismatch"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, q.question || 'One of these pairs is wrong. Find it and fix it.'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mb-3"
  }, pairs.map(function (pair, idx) {
    var isClickable = step === 1;
    var isClicked = clickedPairIdx === idx;
    var thisIsActuallyWrong = idx === wrongPairIndex;
    var showCorrectness = grade !== null;
    var rowClass;
    if (showCorrectness) {
      if (thisIsActuallyWrong) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
    } else if (isClicked) {
      rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
    } else {
      rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
    }
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      onClick: isClickable ? function () {
        answerWhichWrong(idx);
      } : null,
      className: 'grid grid-cols-2 gap-3 px-3 py-2 rounded-lg border ' + rowClass,
      role: isClickable ? 'button' : undefined,
      tabIndex: isClickable ? 0 : undefined,
      onKeyDown: isClickable ? function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          answerWhichWrong(idx);
        }
      } : undefined
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-semibold text-slate-800"
    }, pair.left), /*#__PURE__*/React.createElement("span", {
      className: "text-sm text-slate-700 flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", null, '↔ ' + pair.right), showCorrectness && thisIsActuallyWrong && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-amber-700 flex-shrink-0"
    }, "wrong"), showCorrectness && isClicked && !thisIsActuallyWrong && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold text-rose-700 flex-shrink-0"
    }, "✗")));
  })), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-indigo-50 border border-indigo-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-semibold text-indigo-900"
  }, "Step 1 of 2 — Click the pair that's wrong above."), allowIDK && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none",
    "aria-label": "I don't know — skip without penalty",
    title: t("tooltips.skip_ai_explain")
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤔 "), t("ui_common.i_dont_know")))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-indigo-50 border border-indigo-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-semibold text-indigo-900 mb-2"
  }, 'Step 2 of 2 — Which item should "' + (clickedPairIdx !== null && pairs[clickedPairIdx] ? pairs[clickedPairIdx].left : wrongPairLeft) + '" have been paired with?'), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, (candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong]).map(function (cand) {
    return /*#__PURE__*/React.createElement("button", {
      key: cand,
      type: "button",
      onClick: function () {
        answerPartner(cand);
      },
      className: "px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors motion-reduce:transition-none"
    }, cand);
  }))), grade && /*#__PURE__*/React.createElement("div", {
    className: 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300',
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'
  }, grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review'))), grade.status !== 'idk' && /*#__PURE__*/React.createElement("ul", {
    className: 'space-y-1 text-sm text-' + statusColor + '-900'
  }, /*#__PURE__*/React.createElement("li", null, (grade.step1Correct ? '✓ ' : '✗ ') + 'Find: ' + (grade.step1Correct ? 'you spotted the wrong pair' : 'the wrong pair was "' + wrongPairLeft + ' ↔ ' + (pairs[wrongPairIndex] ? pairs[wrongPairIndex].right : '') + '"')), /*#__PURE__*/React.createElement("li", null, (grade.step2Correct ? '✓ ' : '✗ ') + 'Fix: ' + (grade.step2Correct ? 'correct partner — "' + correctPartnerForWrong + '"' : 'correct partner was "' + correctPartnerForWrong + '" (you picked "' + partnerAnswer + '")'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: reset,
    className: "px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300"
  }, "Try again"), aiExplainerEnabled && !explainer.open && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: requestExplainer,
    className: "px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
  }, "🤖 Explain this concept"))), explainer.open && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
  }, "🤖 Quick explanation"), explainer.loading && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-700 italic"
  }, "Generating explanation…"), explainer.text && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, explainer.text), explainer.error && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-rose-700"
  }, explainer.error), explainer.text && typeof p.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      // p.callTTS returns the audio URL without playing — never wired up
      // a playback step here, so the original button silently fetched and
      // discarded the audio. Route through AlloSpeechPlayer instead: it
      // plays, respects mute, allows click-stop, and toasts on failure.
      try {
        if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);else p.callTTS(explainer.text);
      } catch (e) {}
    },
    className: "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900",
    "aria-label": t("a11y.read_aloud")
  }, "🔊 Read aloud")));
}
function McqEnhancements(p) {
  var modeStrat = p.modeStrategy || null;
  var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
  var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
  var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
  if (!allowIDK && !allowConfidence && !aiExplainerEnabled) return null;
  var explainerState = React.useState({
    open: false,
    loading: false,
    text: '',
    error: ''
  });
  var explainer = explainerState[0];
  var setExplainer = explainerState[1];
  var idkState = React.useState(false);
  var idkMarked = idkState[0];
  var setIdkMarked = idkState[1];
  var localConfidenceState = React.useState(null);
  var hasParentConfidence = typeof p.onSetConfidence === 'function';
  var confidence = hasParentConfidence ? p.currentConfidence : localConfidenceState[0];
  var setConfidence = hasParentConfidence ? p.onSetConfidence : localConfidenceState[1];
  function requestExplainer() {
    if (typeof p.callGemini !== 'function') {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: 'Explainer unavailable.'
      });
      return;
    }
    setExplainer({
      open: true,
      loading: true,
      text: '',
      error: ''
    });
    var grade = p.gradeLevel || 'middle school';
    var conceptHint = p.q && (p.q.question || p.q.correctAnswer) || '';
    var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept. Question or concept: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
    Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
      var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
      setExplainer({
        open: true,
        loading: false,
        text: txt.trim(),
        error: ''
      });
    }).catch(function (err) {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: err && err.message ? err.message : 'Explainer failed.'
      });
    });
  }
  function markIDK() {
    setIdkMarked(true);
    requestExplainer();
    if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: 'mcq',
          conceptLabel: p.q && p.q.conceptLabel || '',
          answer: {
            idk: true
          },
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-3 ml-9 space-y-2"
  }, (aiExplainerEnabled || allowIDK) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, aiExplainerEnabled && !explainer.open && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: requestExplainer,
    className: "text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors motion-reduce:transition-none",
    "aria-label": t("a11y.explain_concept"),
    title: t("tooltips.quick_ai_explanation")
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤖 "), t("ui_common.explain_concept_action")), allowIDK && !idkMarked && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "text-xs font-semibold px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors motion-reduce:transition-none",
    "aria-label": "I don't know — skip without penalty",
    title: "Skip — no penalty. The AI will explain the concept."
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤔 "), "I don't know"), idkMarked && /*#__PURE__*/React.createElement("span", {
    className: "text-xs uppercase font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900"
  }, "Marked \"I don't know\"")), explainer.open && /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
  }, "🤖 Quick explanation"), explainer.loading && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-700 italic"
  }, "Generating explanation…"), explainer.text && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, explainer.text), explainer.error && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-rose-700"
  }, explainer.error), explainer.text && typeof p.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      // Route through AlloSpeechPlayer for mute respect / click-stop / toast.
      if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);else p.callTTS(explainer.text);
    },
    className: "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900",
    "aria-label": t("a11y.read_aloud")
  }, "🔊 Read aloud")), allowConfidence && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600 font-semibold"
  }, "How sure were you?"), ['knew', 'guessed', 'no-idea'].map(function (lvl) {
    var labels = {
      knew: 'I knew this',
      guessed: 'I guessed',
      'no-idea': 'No idea'
    };
    var active = confidence === lvl;
    return /*#__PURE__*/React.createElement("button", {
      key: lvl,
      type: "button",
      onClick: function () {
        setConfidence(lvl);
      },
      className: 'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
    }, labels[lvl]);
  })));
}
function AssessmentItemAnalysisPanel(p) {
  var analysis = p.analysis || {};
  var items = Array.isArray(analysis.items) ? analysis.items : [];
  var openState = React.useState(false);
  var open = openState[0];
  var setOpen = openState[1];
  if (items.length === 0 || !items.some(function (item) {
    return item.respondents > 0;
  })) return null;
  function downloadCsv() {
    var rows = [['Question', 'Type', 'Responses', 'Gradable', 'Correct %', 'Omitted', 'IDK', 'Signal', 'Flags']];
    items.forEach(function (item) {
      rows.push([item.questionIdx + 1, item.type, item.respondents, item.gradableCount, item.correctRate == null ? '' : item.correctRate, item.omittedCount, item.idkCount, item.signalLabel, (item.flags || []).join('; ')]);
    });
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
    try {
      var blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8'
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'assessment-item-analysis-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {}
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "mt-5 rounded-xl border-2 border-cyan-200 bg-cyan-50 p-4",
    "aria-labelledby": "item-analysis-heading"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    id: "item-analysis-heading",
    className: "font-black text-cyan-950"
  }, "Item analysis"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-cyan-900 mt-1"
  }, "Difficulty, omissions, confidence mismatches, and MCQ choice patterns. Flags wait for at least 5 responses.")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: downloadCsv,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-cyan-300 text-cyan-900"
  }, "Export CSV"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setOpen(!open);
    },
    "aria-expanded": open,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-800 text-white"
  }, open ? 'Hide details' : 'Review items'))), open && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 mt-4"
  }, items.map(function (item) {
    if (item.respondents === 0) return /*#__PURE__*/React.createElement("div", {
      key: item.questionIdx,
      className: "rounded-lg border border-slate-200 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-black text-slate-700"
    }, 'Q' + (item.questionIdx + 1) + ' · No responses yet'), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600 mt-1"
    }, item.questionText));
    var rateColor = item.correctRate == null ? 'slate' : item.correctRate < 40 ? 'rose' : item.correctRate > 85 ? 'emerald' : 'indigo';
    return /*#__PURE__*/React.createElement("article", {
      key: item.questionIdx,
      className: "rounded-lg border border-cyan-200 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-grow min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase font-black tracking-wider text-slate-500"
    }, 'Q' + (item.questionIdx + 1) + ' · ' + item.type), /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-semibold text-slate-800 mt-1"
    }, item.questionText)), /*#__PURE__*/React.createElement("div", {
      className: 'rounded-lg px-3 py-2 text-center bg-' + rateColor + '-50 text-' + rateColor + '-900 border border-' + rateColor + '-200'
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-lg font-black"
    }, item.correctRate == null ? '—' : item.correctRate + '%'), /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] uppercase font-bold"
    }, "correct"))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 flex-wrap mt-3 text-[11px]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-bold"
    }, item.respondents + ' responses'), /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-bold"
    }, item.omittedCount + ' omitted'), item.idkCount > 0 && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-sky-100 text-sky-800 px-2 py-1 font-bold"
    }, item.idkCount + ' IDK'), /*#__PURE__*/React.createElement("span", {
      className: 'rounded-full px-2 py-1 font-bold ' + (item.smallSample ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800')
    }, item.signalLabel)), Array.isArray(item.options) && item.options.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "space-y-1.5 mt-3"
    }, item.options.map(function (option) {
      var width = item.respondents > 0 ? Math.round(option.count / item.respondents * 100) : 0;
      return /*#__PURE__*/React.createElement("div", {
        key: option.optionIdx,
        className: "grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-xs"
      }, /*#__PURE__*/React.createElement("span", {
        className: 'font-black ' + (option.correct ? 'text-emerald-700' : 'text-slate-600')
      }, String.fromCharCode(65 + option.optionIdx)), /*#__PURE__*/React.createElement("div", {
        className: "h-2 rounded-full bg-slate-100 overflow-hidden"
      }, /*#__PURE__*/React.createElement("div", {
        className: option.correct ? 'h-full bg-emerald-500' : 'h-full bg-cyan-500',
        style: {
          width: width + '%'
        }
      })), /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600 tabular-nums"
      }, option.count + ' · ' + width + '%'));
    })), item.flags && item.flags.length > 0 && /*#__PURE__*/React.createElement("ul", {
      className: "mt-3 space-y-1"
    }, item.flags.map(function (flag, idx) {
      return /*#__PURE__*/React.createElement("li", {
        key: idx,
        className: "text-xs rounded bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1"
      }, '⚑ ' + flag);
    })), item.smallSample && /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-slate-500 mt-2"
    }, "Early signal only—no quality flag is assigned until 5 learners respond."));
  })));
}
function LiveResultsDashboard(p) {
  var aggsMod = window.AlloModules && window.AlloModules.QuizLiveAggregators;
  if (!aggsMod) return null;
  var sessionData = p.sessionData || {};
  var quizState = sessionData.quizState || {};
  var generatedContent = p.generatedContent;
  var roster = sessionData.roster || {};
  var mode = generatedContent && generatedContent.data && generatedContent.data.mode || 'exit-ticket';
  var modeLabel = generatedContent && generatedContent.data && generatedContent.data.modeLabel || 'Exit Ticket';
  var modeIcon = generatedContent && generatedContent.data && generatedContent.data.modeIcon || '📝';
  var appId = p.appId;
  var conceptMasteryState = React.useState(null);
  var conceptMasteryByUid = conceptMasteryState[0];
  var setConceptMasteryByUid = conceptMasteryState[1];
  var rosterKeysSig = Object.keys(roster).sort().join(',');
  // FERPA refit 2026-07-01: mastery now arrives as a prop from the shell
  // (live peer-to-peer snapshots + project-file imports; device-local
  // model). The Firestore fetch below survives ONLY as a legacy fallback
  // for older shells that don't pass the prop.
  var propMastery = p.conceptMasteryByUid;
  React.useEffect(function () {
    if (mode !== 'review') {
      setConceptMasteryByUid(null);
      return;
    }
    if (propMastery !== undefined && propMastery !== null) {
      setConceptMasteryByUid(propMastery);
      return;
    }
    var fb = window.__alloFirebase;
    if (!fb || !fb.doc || !fb.getDoc || !appId) {
      setConceptMasteryByUid({});
      return;
    }
    var uids = Object.keys(roster);
    if (uids.length === 0) {
      setConceptMasteryByUid({});
      return;
    }
    var cancelled = false;
    Promise.all(uids.map(function (uid) {
      try {
        var ref = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'conceptMastery', uid);
        return fb.getDoc(ref).then(function (snap) {
          return [uid, snap.exists() ? snap.data() : null];
        }).catch(function () {
          return [uid, null];
        });
      } catch (e) {
        return Promise.resolve([uid, null]);
      }
    })).then(function (results) {
      if (cancelled) return;
      var map = {};
      results.forEach(function (entry) {
        if (entry && entry[1]) map[entry[0]] = entry[1];
      });
      setConceptMasteryByUid(map);
    }).catch(function () {
      if (!cancelled) setConceptMasteryByUid({});
    });
    return function () {
      cancelled = true;
    };
  }, [mode, rosterKeysSig, appId, propMastery]);
  var aiGradedState = React.useState({});
  var aiGradedCache = aiGradedState[0];
  var setAiGradedCache = aiGradedState[1];
  var aiGradedInFlightRef = React.useRef({});
  var allResponsesSig = React.useMemo(function () {
    try {
      return JSON.stringify(quizState.allResponses || {});
    } catch (e) {
      return '';
    }
  }, [quizState.allResponses]);
  React.useEffect(function () {
    var aiHelpers = window.AlloModules && window.AlloModules.QuizAIHelpers;
    if (!aiHelpers || typeof p.callGemini !== 'function') return;
    var allResponses = quizState.allResponses || {};
    var questions = generatedContent && generatedContent.data && generatedContent.data.questions || [];
    var pending = [];
    Object.keys(allResponses).forEach(function (uid) {
      var perStudent = allResponses[uid] || {};
      Object.keys(perStudent).forEach(function (qKey) {
        var qIdx = parseInt(qKey, 10);
        if (isNaN(qIdx) || !questions[qIdx]) return;
        var response = perStudent[qKey];
        if (!response || !response.answer || response.answer.idk) return;
        var q = questions[qIdx];
        var t = response.itemType || q && q.type;
        if (t !== 'short-answer' && t !== 'self-explanation') return;
        var text = response.answer && response.answer.text || '';
        if (!text || !text.trim()) return;
        var key = uid + ':' + qIdx;
        if (aiGradedCache[key] || aiGradedInFlightRef.current[key]) return;
        pending.push({
          key: key,
          q: q,
          text: text
        });
      });
    });
    if (pending.length === 0) return;
    pending.forEach(function (item) {
      aiGradedInFlightRef.current[item.key] = true;
    });
    Promise.all(pending.map(function (item) {
      return aiHelpers.gradeFreeformAnswer({
        question: item.q.question || item.q.contextSentence || '',
        expectedAnswer: item.q.expectedAnswer || item.q.exemplarAnswer || item.q.expectedFill || '',
        studentResponse: item.text,
        gradeLevel: p.gradeLevel,
        callGemini: p.callGemini
      }).then(function (result) {
        return {
          key: item.key,
          result: result
        };
      }).catch(function (err) {
        return {
          key: item.key,
          result: {
            status: 'error',
            feedback: err && err.message || 'Grader failed.'
          }
        };
      });
    })).then(function (results) {
      setAiGradedCache(function (prev) {
        var next = Object.assign({}, prev);
        results.forEach(function (r) {
          next[r.key] = r.result;
          delete aiGradedInFlightRef.current[r.key];
        });
        return next;
      });
    }).catch(function () {
      pending.forEach(function (item) {
        delete aiGradedInFlightRef.current[item.key];
      });
    });
  }, [allResponsesSig, generatedContent && generatedContent.id]);
  var inFlightCount = Object.keys(aiGradedInFlightRef.current || {}).length;
  var expandedRowsState = React.useState({});
  var expandedRows = expandedRowsState[0];
  var setExpandedRows = expandedRowsState[1];
  function toggleRowExpanded(uid) {
    setExpandedRows(function (prev) {
      var next = Object.assign({}, prev);
      if (next[uid]) delete next[uid];else next[uid] = true;
      return next;
    });
  }
  var expandedBarsState = React.useState({});
  var expandedBars = expandedBarsState[0];
  var setExpandedBars = expandedBarsState[1];
  function toggleBarExpanded(qIdx) {
    setExpandedBars(function (prev) {
      var next = Object.assign({}, prev);
      if (next[qIdx]) delete next[qIdx];else next[qIdx] = true;
      return next;
    });
  }
  function confidenceChip(confidence, status) {
    if (!confidence) return null;
    var labels = {
      knew: 'knew',
      guessed: 'guessed',
      'no-idea': 'no idea'
    };
    var color = 'slate';
    var note = '';
    if (status === 'correct') {
      if (confidence === 'guessed') {
        color = 'amber';
        note = ' (lucky)';
      } else if (confidence === 'no-idea') {
        color = 'rose';
        note = ' (?)';
      }
    } else if (status === 'incorrect' || status === 'partially-correct') {
      if (confidence === 'knew') {
        color = 'rose';
        note = ' (overconfident)';
      } else if (confidence === 'no-idea') {
        color = 'sky';
        note = '';
      }
    }
    var bgClass = color === 'amber' ? 'bg-amber-100 text-amber-800' : color === 'rose' ? 'bg-rose-100 text-rose-800' : color === 'sky' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700';
    return /*#__PURE__*/React.createElement("span", {
      className: 'flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ' + bgClass,
      title: 'Student rated: ' + labels[confidence] + note
    }, '🎯 ' + labels[confidence]);
  }
  var explainerModalState = React.useState({
    open: false,
    conceptIdx: null,
    conceptText: '',
    loading: false,
    text: '',
    error: ''
  });
  var explainerModal = explainerModalState[0];
  var setExplainerModal = explainerModalState[1];
  var prevFocusRef = React.useRef(null);
  var explainerCloseBtnRef = React.useRef(null);
  var explainerDialogRef = React.useRef(null);
  function openExplainer(conceptIdx, conceptText) {
    try {
      prevFocusRef.current = document.activeElement;
    } catch (e) {}
    setExplainerModal({
      open: true,
      conceptIdx: conceptIdx,
      conceptText: conceptText,
      loading: true,
      text: '',
      error: ''
    });
    runExplainerCall(conceptText);
  }
  function runExplainerCall(conceptText) {
    if (typeof p.callGemini !== 'function') {
      setExplainerModal(function (prev) {
        return Object.assign({}, prev, {
          loading: false,
          error: 'Explainer unavailable: callGemini not provided.'
        });
      });
      return;
    }
    var grade = p.gradeLevel || 'middle school';
    var prompt = 'You are explaining a concept to ' + grade + ' students who do not yet understand it. They just took a pre-check and got it wrong as a class. Write a 60-90 word explainer that: (1) names the concept clearly, (2) gives ONE concrete relatable example, (3) avoids jargon, (4) reads aloud naturally. Plain text only. No markdown, no fences, no headers.\n\nCONCEPT (from the pre-check question that the class missed):\n"' + String(conceptText || '').slice(0, 400) + '"\n\nReturn ONLY the explainer text.';
    Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
      var txt = typeof raw === 'object' && raw && raw.text ? raw.text : String(raw || '');
      txt = txt.replace(/^```(?:[a-z]+)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      setExplainerModal(function (prev) {
        return Object.assign({}, prev, {
          loading: false,
          text: txt,
          error: ''
        });
      });
    }).catch(function (err) {
      setExplainerModal(function (prev) {
        return Object.assign({}, prev, {
          loading: false,
          error: err && err.message || 'Explainer call failed.'
        });
      });
    });
  }
  function closeExplainer() {
    setExplainerModal({
      open: false,
      conceptIdx: null,
      conceptText: '',
      loading: false,
      text: '',
      error: ''
    });
    setPushState({
      pushing: false,
      pushed: false,
      error: ''
    });
  }
  React.useEffect(function () {
    if (!explainerModal.open) return;
    var raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(function () {
      try {
        if (explainerCloseBtnRef.current) explainerCloseBtnRef.current.focus();else if (explainerDialogRef.current) explainerDialogRef.current.focus();
      } catch (e) {}
    }) : setTimeout(function () {
      try {
        if (explainerCloseBtnRef.current) explainerCloseBtnRef.current.focus();else if (explainerDialogRef.current) explainerDialogRef.current.focus();
      } catch (e) {}
    }, 0);
    return function () {
      if (typeof cancelAnimationFrame === 'function' && raf) {
        try {
          cancelAnimationFrame(raf);
        } catch (e) {}
      } else if (typeof clearTimeout === 'function') {
        clearTimeout(raf);
      }
      var previous = prevFocusRef.current;
      prevFocusRef.current = null;
      try {
        if (previous && previous.isConnected !== false && typeof previous.focus === 'function') previous.focus();
      } catch (e) {}
    };
  }, [explainerModal.open]);
  function copyExplainer() {
    if (!explainerModal.text) return;
    try {
      if (window.alloCopyText) {
        window.alloCopyText(explainerModal.text);
      } else {
        navigator.clipboard.writeText(explainerModal.text);
      }
    } catch (e) {}
  }
  function playExplainer() {
    if (!explainerModal.text || typeof p.callTTS !== 'function') return;
    try {
      if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainerModal.text);else p.callTTS(explainerModal.text);
    } catch (e) {}
  }
  var pushStateState = React.useState({
    pushing: false,
    pushed: false,
    error: ''
  });
  var pushState = pushStateState[0];
  var setPushState = pushStateState[1];
  function pushExplainerToStudents() {
    if (!explainerModal.text || pushState.pushing) return;
    var fb = window.__alloFirebase;
    if (!fb || !fb.db || !fb.doc || !fb.updateDoc || !appId || !p.activeSessionCode) {
      setPushState({
        pushing: false,
        pushed: false,
        error: 'Push unavailable: live session not active.'
      });
      return;
    }
    setPushState({
      pushing: true,
      pushed: false,
      error: ''
    });
    try {
      var sessionRef = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'sessions', p.activeSessionCode);
      Promise.resolve(fb.updateDoc(sessionRef, {
        'quizState.classExplainer': {
          conceptIdx: explainerModal.conceptIdx,
          conceptText: explainerModal.conceptText,
          text: explainerModal.text,
          ts: Date.now()
        }
      })).then(function () {
        setPushState({
          pushing: false,
          pushed: true,
          error: ''
        });
      }).catch(function (err) {
        setPushState({
          pushing: false,
          pushed: false,
          error: err && err.message || 'Push failed.'
        });
      });
    } catch (e) {
      setPushState({
        pushing: false,
        pushed: false,
        error: e && e.message || 'Push failed.'
      });
    }
  }
  var teacherOverrides = quizState && quizState.teacherOverrides || {};
  function setTeacherOverride(uid, qIdx, newStatus) {
    var fb = window.__alloFirebase;
    if (!fb || !fb.db || !fb.doc || !fb.updateDoc || !fb.deleteField || !appId || !p.activeSessionCode) return;
    var sessionRef = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'sessions', p.activeSessionCode);
    var path = 'quizState.teacherOverrides.' + uid + '.' + qIdx;
    var update = {};
    if (newStatus == null) {
      update[path] = fb.deleteField();
    } else {
      update[path] = {
        status: newStatus,
        ts: Date.now()
      };
    }
    try {
      fb.updateDoc(sessionRef, update);
    } catch (e) {}
  }
  var aggResult;
  try {
    aggResult = aggsMod.aggregateForMode(mode, quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache, teacherOverrides);
  } catch (e) {
    console.warn('[LiveResultsDashboard] aggregator failed:', e);
    return null;
  }
  if (!aggResult || !aggResult.data) return null;
  var data = aggResult.data;
  var variant = aggResult.variant;
  var itemAnalysis = {
    items: []
  };
  try {
    if (typeof aggsMod.aggregateItemAnalysis === 'function') itemAnalysis = aggsMod.aggregateItemAnalysis(quizState, generatedContent, roster, aiGradedCache, teacherOverrides);
  } catch (e) {
    console.warn('[LiveResultsDashboard] item analysis failed:', e);
  }
  // Share an anonymous per-question aggregate to every connected student
  // over the P2P quiz channel (shell hook; nothing stored, no names).
  var canShareResults = typeof window !== 'undefined' && typeof window.__alloQuizShareResults === 'function' && variant === 'liveHeatmap' && Array.isArray(data.bars) && data.bars.some(function (b) {
    return b.total > 0;
  });
  var shareResultsToClass = function () {
    var items = data.bars.filter(function (b) {
      return b.total > 0;
    }).map(function (b) {
      return {
        label: 'Q' + (b.questionIdx + 1) + ' — ' + String(b.questionText || '').slice(0, 70),
        count: b.correct + '/' + b.total,
        percent: b.total > 0 ? Math.round(b.correct / b.total * 100) : 0
      };
    });
    var ok = window.__alloQuizShareResults({
      title: t('quiz.shared_results_title') || 'How the class did',
      items: items
    });
    if (window.AlloFlowUX) window.AlloFlowUX.toast(ok ? t('quiz.results_shared') || 'Anonymous results shared with the class.' : t('quiz.results_share_failed') || 'Could not share — no students connected.', ok ? 'success' : 'error');
  };
  var header = /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, modeIcon), /*#__PURE__*/React.createElement("h3", {
    className: "font-black text-lg text-slate-800"
  }, 'Live Results — ' + modeLabel), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, data.totalStudents + ' student' + (data.totalStudents === 1 ? '' : 's') + ' · ' + data.totalQuestions + ' question' + (data.totalQuestions === 1 ? '' : 's')), inFlightCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: 'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 animate-pulse ' + quizreducedMotionClass,
    role: "status",
    "aria-live": "polite",
    "aria-label": 'AI grading ' + inFlightCount + ' open response' + (inFlightCount === 1 ? '' : 's'),
    title: inFlightCount + ' open-response answer' + (inFlightCount === 1 ? '' : 's') + ' being graded by AI'
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "✨ "), 'AI grading ' + inFlightCount + '…'), canShareResults && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: shareResultsToClass,
    className: "ml-auto text-xs font-bold px-3 py-1 rounded-full border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-colors motion-reduce:transition-none",
    title: t('quiz.share_results_tooltip') || 'Send anonymous per-question results to every connected student (peer-to-peer, nothing stored)',
    "aria-label": t('quiz.share_results_aria') || 'Share anonymous results with the class'
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📢 "), t('quiz.share_results_btn') || 'Share anonymous results'));
  var hasAnyResponses = false;
  if (variant === 'gradebook') {
    hasAnyResponses = data.studentRows.some(function (r) {
      return r.totalAnswered > 0;
    });
  } else if (variant === 'preLessonGap') {
    hasAnyResponses = data.conceptCards.some(function (c) {
      return c.totalAnswered > 0;
    });
  } else if (variant === 'retentionCurve') {
    hasAnyResponses = Array.isArray(data.conceptRows) && data.conceptRows.some(function (row) {
      return row.students.some(function (s) {
        return s.seen;
      });
    });
  } else {
    hasAnyResponses = data.bars.some(function (b) {
      return b.total > 0;
    });
  }
  if (!hasAnyResponses) {
    return /*#__PURE__*/React.createElement("div", {
      className: "p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 mb-4"
    }, header, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-600 italic"
    }, "Waiting for student responses. Results will appear here as students submit answers in this live session."));
  }
  var body;
  if (variant === 'gradebook') {
    var csvEscape = function (v) {
      var s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    var buildGradebookCsv = function () {
      var questions = generatedContent && generatedContent.data && generatedContent.data.questions || [];
      var header = ['Student', 'Attempt status', 'Answered', 'Correct', 'IDK', 'Score %'];
      questions.forEach(function (_, idx) {
        header.push('Q' + (idx + 1) + ' Status', 'Q' + (idx + 1) + ' Answer', 'Q' + (idx + 1) + ' Confidence', 'Q' + (idx + 1) + ' AI Feedback');
      });
      var lines = [header.map(csvEscape).join(',')];
      data.studentRows.forEach(function (row) {
        var pct = row.totalAnswered > 0 ? Math.round(row.totalCorrect / row.totalAnswered * 100) : 0;
        var line = [row.displayName, row.attemptStatus || 'not-started', row.totalAnswered, row.totalCorrect, row.totalIdk, pct + '%'];
        for (var i = 0; i < questions.length; i++) {
          var cell = row.byQuestion[i];
          if (!cell) {
            line.push('', '', '', '');
          } else {
            line.push(cell.status || '', cell.answerSummary || '', cell.confidence || '', cell.aiFeedback || '');
          }
        }
        lines.push(line.map(csvEscape).join(','));
      });
      return '﻿' + lines.join('\r\n');
    };
    var exportCsv = function () {
      try {
        var csv = buildGradebookCsv();
        var blob = new Blob([csv], {
          type: 'text/csv;charset=utf-8;'
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var d = new Date();
        var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        a.href = url;
        a.download = 'quiz-gradebook-' + stamp + '-' + (mode || 'exit-ticket') + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 100);
      } catch (e) {}
    };
    var statusBadge = function (cell) {
      if (!cell) return /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600",
        title: t("tooltips.no_response")
      }, "—");
      if (cell.status === 'correct') return /*#__PURE__*/React.createElement("span", {
        className: "text-emerald-600",
        title: cell.aiGraded ? 'AI-graded correct' : 'Correct'
      }, "✓");
      if (cell.status === 'incorrect') return /*#__PURE__*/React.createElement("span", {
        className: "text-rose-600",
        title: cell.aiGraded ? 'AI-graded incorrect' : 'Incorrect'
      }, "✗");
      if (cell.status === 'idk') return /*#__PURE__*/React.createElement("span", {
        className: "text-sky-600",
        title: t("tooltips.marked_unknown")
      }, "🤔");
      if (cell.status === 'partially-correct') return /*#__PURE__*/React.createElement("span", {
        className: "text-amber-600",
        title: t("tooltips.partially_correct")
      }, "◐");
      return /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600",
        title: t("tooltips.submitted_ungraded")
      }, "·");
    };
    body = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-end mb-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: exportCsv,
      className: "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 transition-colors motion-reduce:transition-none",
      "aria-label": t("a11y.export_gradebook_csv"),
      "data-help-key": "quiz_csv_export_btn",
      title: t("tooltips.download_gradebook_csv")
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "📥 "), t("ui_common.export_csv"))), /*#__PURE__*/React.createElement("div", {
      className: "overflow-x-auto"
    }, /*#__PURE__*/React.createElement("table", {
      className: "w-full text-sm border-collapse"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      className: "bg-slate-100"
    }, /*#__PURE__*/React.createElement("th", {
      scope: "col",
      className: "w-7 px-1 py-1.5",
      "aria-label": t("a11y.expand_row")
    }), /*#__PURE__*/React.createElement("th", {
      scope: "col",
      className: "text-left px-2 py-1.5 font-bold text-slate-700"
    }, "Student"), /*#__PURE__*/React.createElement("th", {
      scope: "col",
      className: "text-center px-2 py-1.5 font-bold text-slate-700"
    }, "Attempt"), /*#__PURE__*/React.createElement("th", {
      scope: "col",
      className: "text-center px-2 py-1.5 font-bold text-slate-700"
    }, "Answered"), /*#__PURE__*/React.createElement("th", {
      scope: "col",
      className: "text-center px-2 py-1.5 font-bold text-slate-700"
    }, "Correct"), /*#__PURE__*/React.createElement("th", {
      scope: "col",
      className: "text-center px-2 py-1.5 font-bold text-slate-700"
    }, "IDK"))), /*#__PURE__*/React.createElement("tbody", null, data.studentRows.map(function (row) {
      var pct = row.totalAnswered > 0 ? Math.round(row.totalCorrect / row.totalAnswered * 100) : 0;
      var isExpanded = !!expandedRows[row.uid];
      var canExpand = row.totalAnswered > 0;
      var summaryRow = /*#__PURE__*/React.createElement("tr", {
        key: row.uid + ':summary',
        className: 'border-t border-slate-200 ' + (canExpand ? 'cursor-pointer hover:bg-indigo-50/40' : ''),
        onClick: canExpand ? function () {
          toggleRowExpanded(row.uid);
        } : undefined
      }, /*#__PURE__*/React.createElement("td", {
        className: "text-center px-1 py-1.5"
      }, canExpand ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-expanded": isExpanded,
        "aria-label": (isExpanded ? 'Collapse' : 'Expand') + ' ' + row.displayName + ' details',
        className: "text-slate-600 hover:text-indigo-600 transition-colors motion-reduce:transition-none text-xs font-mono",
        onClick: function (e) {
          e.stopPropagation();
          toggleRowExpanded(row.uid);
        }
      }, isExpanded ? '▼' : '▶') : /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600 text-xs"
      }, "·")), /*#__PURE__*/React.createElement("th", {
        scope: "row",
        className: "px-2 py-1.5 text-left font-medium text-slate-800"
      }, row.displayName), /*#__PURE__*/React.createElement("td", {
        className: "text-center px-2 py-1.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: 'text-[10px] font-black uppercase px-2 py-0.5 rounded ' + (row.attemptStatus === 'submitted' ? 'bg-emerald-100 text-emerald-800' : row.attemptStatus === 'in-progress' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600')
      }, row.attemptStatus === 'submitted' ? 'Submitted' : row.attemptStatus === 'in-progress' ? 'In progress' : 'Not started')), /*#__PURE__*/React.createElement("td", {
        className: "text-center px-2 py-1.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-xs font-mono text-slate-600"
      }, row.totalAnswered + ' / ' + data.totalQuestions)), /*#__PURE__*/React.createElement("td", {
        className: "text-center px-2 py-1.5"
      }, row.totalAnswered > 0 ? /*#__PURE__*/React.createElement("span", {
        className: 'text-xs font-bold px-2 py-0.5 rounded ' + (pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
      }, row.totalCorrect + ' (' + pct + '%)') : /*#__PURE__*/React.createElement("span", {
        className: "text-xs text-slate-600"
      }, "—")), /*#__PURE__*/React.createElement("td", {
        className: "text-center px-2 py-1.5"
      }, row.totalIdk > 0 ? /*#__PURE__*/React.createElement("span", {
        className: "text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800"
      }, row.totalIdk) : /*#__PURE__*/React.createElement("span", {
        className: "text-xs text-slate-600"
      }, "0")));
      if (!isExpanded) return summaryRow;
      var detailRow = /*#__PURE__*/React.createElement("tr", {
        key: row.uid + ':detail',
        className: "border-t border-slate-100 bg-indigo-50/30"
      }, /*#__PURE__*/React.createElement("td", {
        colSpan: 6,
        className: "px-3 py-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: "space-y-2"
      }, row.byQuestion.map(function (cell, qIdx) {
        var qNum = qIdx + 1;
        var qSnippet = cell && cell.questionText ? cell.questionText.slice(0, 90) + (cell.questionText.length > 90 ? '…' : '') : 'Question ' + qNum;
        var border = !cell ? 'border-slate-200 bg-white' : cell.status === 'correct' ? 'border-emerald-200 bg-emerald-50/50' : cell.status === 'incorrect' ? 'border-rose-200 bg-rose-50/50' : cell.status === 'idk' ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 bg-white';
        return /*#__PURE__*/React.createElement("div", {
          key: qIdx,
          className: 'p-2 rounded border ' + border
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex items-start gap-2 mb-1"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-base mt-0.5 leading-none"
        }, statusBadge(cell)), /*#__PURE__*/React.createElement("div", {
          className: "flex-grow min-w-0"
        }, /*#__PURE__*/React.createElement("p", {
          className: "text-xs font-semibold text-slate-700 mb-0.5"
        }, 'Q' + qNum + '. ' + qSnippet), cell && cell.answerSummary ? /*#__PURE__*/React.createElement("p", {
          className: "text-xs text-slate-800 break-words"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-slate-600"
        }, "Answered: "), cell.answerSummary) : !cell && /*#__PURE__*/React.createElement("p", {
          className: "text-xs italic text-slate-600"
        }, "No response yet")), cell && cell.aiGraded && /*#__PURE__*/React.createElement("span", {
          className: "flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800",
          "aria-label": 'Graded by AI as ' + cell.aiStatus,
          title: 'Graded by AI (' + cell.aiStatus + ')'
        }, /*#__PURE__*/React.createElement("span", {
          "aria-hidden": "true"
        }, "✨ "), "AI"), cell && cell.teacherOverridden && /*#__PURE__*/React.createElement("span", {
          className: "flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800",
          "aria-label": 'Teacher override applied, was previously ' + (cell.priorStatus || 'unknown'),
          title: 'Teacher override (was: ' + (cell.priorStatus || '?') + ')'
        }, /*#__PURE__*/React.createElement("span", {
          "aria-hidden": "true"
        }, "🖊 "), "Teacher"), cell && confidenceChip(cell.confidence, cell.status)), cell && cell.aiFeedback && /*#__PURE__*/React.createElement("p", {
          className: "text-[11px] italic text-indigo-900 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1 mt-1"
        }, "\"", cell.aiFeedback, "\""), cell && p.activeSessionCode && /*#__PURE__*/React.createElement("div", {
          className: "mt-1 flex items-center gap-1 flex-wrap",
          "data-help-key": "quiz_teacher_override_row"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-xs text-slate-700 font-semibold mr-1"
        }, "Override:"), [{
          s: 'correct',
          icon: '✓',
          color: 'emerald',
          label: 'correct'
        }, {
          s: 'incorrect',
          icon: '✗',
          color: 'rose',
          label: 'incorrect'
        }, {
          s: 'partially-correct',
          icon: '◐',
          color: 'amber',
          label: 'partially correct'
        }].map(function (opt) {
          var isActive = cell.teacherOverridden && cell.status === opt.s;
          return /*#__PURE__*/React.createElement("button", {
            key: opt.s,
            type: "button",
            onClick: function (e) {
              e.stopPropagation();
              setTeacherOverride(row.uid, qIdx, isActive ? null : opt.s);
            },
            className: 'text-xs font-bold w-6 h-6 rounded transition-colors motion-reduce:transition-none ' + (isActive ? 'bg-' + opt.color + '-600 text-white border border-' + opt.color + '-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-' + opt.color + '-50 hover:border-' + opt.color + '-300'),
            "aria-label": 'Override status to ' + opt.label + (isActive ? ' (currently set, click to undo)' : ''),
            "aria-pressed": isActive,
            title: 'Set status to ' + opt.s + (isActive ? ' (click again to undo)' : '')
          }, /*#__PURE__*/React.createElement("span", {
            "aria-hidden": "true"
          }, opt.icon));
        }), cell.teacherOverridden && /*#__PURE__*/React.createElement("button", {
          type: "button",
          onClick: function (e) {
            e.stopPropagation();
            setTeacherOverride(row.uid, qIdx, null);
          },
          className: "text-xs font-bold px-2 h-6 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100",
          "aria-label": t("a11y.remove_teacher_override"),
          title: t("tooltips.remove_teacher_override")
        }, /*#__PURE__*/React.createElement("span", {
          "aria-hidden": "true"
        }, "↺ "), "undo")));
      }))));
      return [summaryRow, detailRow];
    })))));
  } else if (variant === 'preLessonGap') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, data.conceptCards.map(function (card) {
      var color = card.totalAnswered === 0 ? 'slate' : card.percentCorrect >= 80 ? 'emerald' : card.percentCorrect >= 50 ? 'amber' : 'rose';
      var urgency = card.totalAnswered === 0 ? 'no responses' : card.percentCorrect < 50 ? '⚠ Needs pre-teaching' : card.percentCorrect < 80 ? 'Review with class' : 'Class is ready';
      var showExplainBtn = card.totalAnswered > 0 && card.percentCorrect < 80 && typeof p.callGemini === 'function';
      return /*#__PURE__*/React.createElement("div", {
        key: card.questionIdx,
        className: 'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start justify-between gap-3 mb-1"
      }, /*#__PURE__*/React.createElement("span", {
        className: 'text-xs font-bold uppercase tracking-wider text-' + color + '-800'
      }, urgency), card.totalAnswered > 0 && /*#__PURE__*/React.createElement("span", {
        className: 'text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-200 text-' + color + '-900'
      }, card.percentCorrect + '% correct')), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-slate-800 mb-2"
      }, card.conceptText), /*#__PURE__*/React.createElement("div", {
        className: 'flex items-center gap-3 text-xs text-' + color + '-900'
      }, /*#__PURE__*/React.createElement("span", null, card.correctCount + ' ✓'), /*#__PURE__*/React.createElement("span", null, card.incorrectCount + ' ✗'), card.idkCount > 0 && /*#__PURE__*/React.createElement("span", {
        className: "text-sky-700"
      }, card.idkCount + ' 🤔'), /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600"
      }, '· ' + card.totalAnswered + ' / ' + data.totalStudents + ' students'), showExplainBtn && /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          openExplainer(card.questionIdx, card.conceptText);
        },
        className: "ml-auto inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors motion-reduce:transition-none",
        "aria-label": t("a11y.explain_to_class"),
        "data-help-key": "quiz_explain_to_class_btn",
        title: t("tooltips.generate_concept_explainer")
      }, /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true"
      }, "🎓 "), t("ui_common.explain_to_class"))));
    }));
  } else if (variant === 'retentionCurve') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "space-y-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600 italic mb-1"
    }, "Cross-session retention. Concepts with longer time-since-last-attempt or unseen students surface first. Recent attempts shown as colored dots (green=correct, red=miss, sky=IDK)."), data.conceptRows.map(function (row) {
      var sortedStudents = row.students.slice().sort(function (a, b) {
        if (!a.seen && b.seen) return -1;
        if (a.seen && !b.seen) return 1;
        if (!a.seen && !b.seen) return 0;
        return (b.daysSinceLast || 0) - (a.daysSinceLast || 0);
      });
      var color = row.unseenCount > 0 ? 'rose' : row.maxDaysSinceLast >= 14 ? 'rose' : row.maxDaysSinceLast >= 7 ? 'amber' : 'emerald';
      return /*#__PURE__*/React.createElement("div", {
        key: row.conceptId,
        className: 'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2 mb-2"
      }, /*#__PURE__*/React.createElement("span", {
        className: 'text-xs font-bold uppercase tracking-wider text-' + color + '-800'
      }, row.label), /*#__PURE__*/React.createElement("span", {
        className: 'ml-auto text-[10px] text-' + color + '-700'
      }, row.unseenCount > 0 ? row.unseenCount + ' unseen · ' : '', 'max ' + row.maxDaysSinceLast + 'd since seen')), /*#__PURE__*/React.createElement("div", {
        className: "space-y-1"
      }, sortedStudents.map(function (s) {
        var dayBadgeColor = !s.seen ? 'rose' : s.daysSinceLast >= 14 ? 'rose' : s.daysSinceLast >= 7 ? 'amber' : 'emerald';
        return /*#__PURE__*/React.createElement("div", {
          key: s.uid,
          className: "flex items-center gap-2 text-xs"
        }, /*#__PURE__*/React.createElement("span", {
          className: "flex-shrink-0 text-slate-700 font-semibold w-32 truncate"
        }, s.displayName), !s.seen ? /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800"
        }, "never seen") : /*#__PURE__*/React.createElement("span", {
          className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + dayBadgeColor + '-100 text-' + dayBadgeColor + '-800'
        }, s.daysSinceLast + 'd ago'), s.seen && /*#__PURE__*/React.createElement("span", {
          className: "flex items-center gap-0.5"
        }, s.recent.map(function (att, attIdx) {
          var dotColor = att.status === 'correct' ? '#10b981' : att.status === 'incorrect' ? '#ef4444' : att.status === 'idk' ? '#0ea5e9' : '#94a3b8';
          return /*#__PURE__*/React.createElement("span", {
            key: attIdx,
            className: "inline-block rounded-full",
            style: {
              width: '8px',
              height: '8px',
              backgroundColor: dotColor
            },
            title: att.status + ' on ' + new Date(att.ts).toLocaleDateString()
          });
        })), s.seen && typeof s.successRate === 'number' && /*#__PURE__*/React.createElement("span", {
          className: "text-slate-600 ml-auto"
        }, s.correctAttempts + '/' + s.totalAttempts + ' (' + s.successRate + '%)'));
      })));
    }));
  } else {
    var statusColor = function (s) {
      if (s === 'correct') return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        icon: '✓'
      };
      if (s === 'incorrect') return {
        bg: 'bg-rose-100',
        text: 'text-rose-800',
        icon: '✗'
      };
      if (s === 'idk') return {
        bg: 'bg-sky-100',
        text: 'text-sky-800',
        icon: '🤔'
      };
      if (s === 'partially-correct') return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        icon: '◐'
      };
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        icon: '·'
      };
    };
    body = /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, data.bars.map(function (bar) {
      var color = bar.total === 0 ? 'slate' : bar.percentCorrect >= 80 ? 'emerald' : bar.percentCorrect >= 50 ? 'amber' : 'rose';
      var pctCorrect = bar.total > 0 ? bar.correct / bar.total * 100 : 0;
      var pctIncorrect = bar.total > 0 ? bar.incorrect / bar.total * 100 : 0;
      var pctIdk = bar.total > 0 ? bar.idk / bar.total * 100 : 0;
      var pctSubmitted = bar.total > 0 ? bar.submitted / bar.total * 100 : 0;
      var qLabel = bar.questionText ? bar.questionText.slice(0, 70) + (bar.questionText.length > 70 ? '…' : '') : 'Question ' + (bar.questionIdx + 1);
      var canExpand = bar.total > 0;
      var isExpanded = !!expandedBars[bar.questionIdx];
      return /*#__PURE__*/React.createElement("div", {
        key: bar.questionIdx,
        className: "p-2 rounded bg-white border border-slate-200"
      }, /*#__PURE__*/React.createElement("div", {
        className: 'flex items-start gap-2 mb-1' + (canExpand ? ' cursor-pointer' : ''),
        onClick: canExpand ? function () {
          toggleBarExpanded(bar.questionIdx);
        } : undefined,
        role: canExpand ? 'button' : undefined,
        tabIndex: canExpand ? 0 : undefined,
        "aria-expanded": canExpand ? isExpanded : undefined,
        "aria-label": canExpand ? (isExpanded ? 'Collapse' : 'Expand') + ' question ' + (bar.questionIdx + 1) + ' student detail' : undefined,
        onKeyDown: canExpand ? function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleBarExpanded(bar.questionIdx);
          }
        } : undefined
      }, canExpand && /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600 hover:text-indigo-600 text-[10px] font-mono mt-0.5"
      }, isExpanded ? '▼' : '▶'), /*#__PURE__*/React.createElement("span", {
        className: "text-xs text-slate-700 flex-1 min-w-0"
      }, bar.questionIdx + 1 + '. ' + qLabel), bar.total > 0 && /*#__PURE__*/React.createElement("span", {
        className: 'flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-100 text-' + color + '-800'
      }, bar.percentCorrect + '%')), bar.total > 0 ? /*#__PURE__*/React.createElement("div", {
        className: "flex h-3 rounded overflow-hidden border border-slate-200"
      }, pctCorrect > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          width: pctCorrect + '%',
          backgroundColor: '#10b981'
        },
        title: bar.correct + ' correct'
      }), pctIncorrect > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          width: pctIncorrect + '%',
          backgroundColor: '#ef4444'
        },
        title: bar.incorrect + ' incorrect'
      }), pctIdk > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          width: pctIdk + '%',
          backgroundColor: '#0ea5e9'
        },
        title: bar.idk + ' IDK'
      }), pctSubmitted > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          width: pctSubmitted + '%',
          backgroundColor: '#94a3b8'
        },
        title: bar.submitted + ' submitted (ungraded)'
      })) : /*#__PURE__*/React.createElement("div", {
        className: "h-3 rounded bg-slate-100 border border-slate-200"
      }), /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-3 mt-1 text-[10px] text-slate-600"
      }, /*#__PURE__*/React.createElement("span", null, bar.correct + ' ✓'), /*#__PURE__*/React.createElement("span", null, bar.incorrect + ' ✗'), bar.idk > 0 && /*#__PURE__*/React.createElement("span", {
        className: "text-sky-700"
      }, bar.idk + ' 🤔'), bar.submitted > 0 && /*#__PURE__*/React.createElement("span", {
        className: "text-slate-600"
      }, bar.submitted + ' submitted'), /*#__PURE__*/React.createElement("span", {
        className: "ml-auto text-slate-600"
      }, bar.total + ' / ' + data.totalStudents)), isExpanded && Array.isArray(bar.byStudent) && bar.byStudent.length > 0 && /*#__PURE__*/React.createElement("div", {
        className: "mt-2 pt-2 border-t border-slate-100 space-y-1"
      }, bar.byStudent.map(function (s) {
        var sc = statusColor(s.status);
        return /*#__PURE__*/React.createElement("div", {
          key: s.uid,
          className: "flex items-start gap-2 text-xs"
        }, /*#__PURE__*/React.createElement("span", {
          className: 'flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ' + sc.bg + ' ' + sc.text
        }, sc.icon), /*#__PURE__*/React.createElement("span", {
          className: "flex-shrink-0 font-semibold text-slate-700 w-32 truncate"
        }, s.displayName), /*#__PURE__*/React.createElement("span", {
          className: "flex-grow min-w-0 break-words text-slate-700"
        }, s.answerSummary || /*#__PURE__*/React.createElement("em", {
          className: "text-slate-600"
        }, "(no text)")), s.aiGraded && /*#__PURE__*/React.createElement("span", {
          className: "flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-indigo-100 text-indigo-800",
          title: t("tooltips.ai_graded")
        }, "✨"), confidenceChip(s.confidence, s.status), s.aiFeedback && /*#__PURE__*/React.createElement("span", {
          className: "flex-shrink-0 italic text-[10px] text-indigo-800 truncate max-w-[12rem]",
          title: s.aiFeedback
        }, '"' + s.aiFeedback.slice(0, 50) + (s.aiFeedback.length > 50 ? '…' : '') + '"'));
      })));
    }));
  }
  var explainerModalEl = explainerModal.open ? /*#__PURE__*/React.createElement("div", {
    ref: explainerDialogRef,
    tabIndex: -1,
    className: "fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "quiz-concept-explainer-title",
    onKeyDown: function (e) {
      _quizHandleDialogKeyDown(e, explainerDialogRef, closeExplainer);
    },
    onClick: function (e) {
      if (e.target === e.currentTarget) closeExplainer();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border-2 border-indigo-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    id: "quiz-concept-explainer-title",
    className: "font-black text-base text-slate-800"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🎓 "), "Explain to class"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mt-0.5"
  }, "Concept the class missed:"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs italic text-slate-700 mt-0.5"
  }, '"' + (explainerModal.conceptText || '') + '"')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    ref: explainerCloseBtnRef,
    onClick: closeExplainer,
    "aria-label": t("a11y.close_concept_explainer"),
    className: "flex-shrink-0 text-slate-600 hover:text-slate-700 text-xl leading-none  focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
  }, "×")), explainerModal.loading ? /*#__PURE__*/React.createElement("div", {
    className: "p-4 text-center text-sm text-slate-600",
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'inline-block animate-pulse ' + quizreducedMotionClass
  }, "✨ Generating explainer…")) : explainerModal.error ? /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800",
    role: "alert"
  }, explainerModal.error) : /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded bg-indigo-50 border border-indigo-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap"
  }, explainerModal.text), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      runExplainerCall(explainerModal.conceptText);
    },
    disabled: explainerModal.loading,
    className: "text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
  }, "↻ Regenerate"), !explainerModal.loading && !explainerModal.error && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: copyExplainer,
    className: "text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
  }, "📋 Copy"), !explainerModal.loading && !explainerModal.error && typeof p.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: playExplainer,
    className: "text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100",
    title: t("tooltips.play_explainer_aloud")
  }, "🔊 Play aloud"), !explainerModal.loading && !explainerModal.error && p.activeSessionCode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: pushExplainerToStudents,
    disabled: pushState.pushing,
    className: 'text-xs font-bold px-3 py-1.5 rounded ' + (pushState.pushed ? 'bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white') + ' disabled:opacity-50',
    "aria-label": pushState.pushed ? 'Explainer pushed to all students' : 'Push this explainer to every student\'s screen',
    "data-help-key": "quiz_push_to_students_btn",
    title: t("tooltips.send_explainer_to_students")
  }, pushState.pushing ? 'Pushing…' : pushState.pushed ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "✓ "), "Pushed to students") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📡 "), "Push to all students")), pushState.error && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-rose-700 italic",
    role: "alert"
  }, pushState.error), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: closeExplainer,
    className: "ml-auto text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
  }, t("ui_common.close"))))) : null;
  var reflectionsData = null;
  try {
    reflectionsData = aggsMod.aggregateReflections && aggsMod.aggregateReflections(quizState, generatedContent, roster);
  } catch (e) {
    reflectionsData = null;
  }
  var reflectionsExpandedState = React.useState(true);
  var reflectionsExpanded = reflectionsExpandedState[0];
  var setReflectionsExpanded = reflectionsExpandedState[1];
  var reflectionsEl = reflectionsData ? /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t-2 border-indigo-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setReflectionsExpanded(!reflectionsExpanded);
    },
    "aria-expanded": reflectionsExpanded,
    className: "flex items-center gap-2 text-sm font-bold text-indigo-800 hover:text-indigo-900"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono"
  }, reflectionsExpanded ? '▼' : '▶'), /*#__PURE__*/React.createElement("span", null, '✏️ Reflections (' + reflectionsData.totalReflections + ')')), reflectionsExpanded && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-3"
  }, reflectionsData.buckets.map(function (bucket) {
    return /*#__PURE__*/React.createElement("div", {
      key: bucket.reflectionIdx,
      className: "p-3 rounded-lg bg-indigo-50/50 border border-indigo-100"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1"
    }, 'Prompt ' + (bucket.reflectionIdx + 1)), /*#__PURE__*/React.createElement("p", {
      className: "text-sm italic text-slate-700 mb-2"
    }, bucket.promptText), bucket.responses.length === 0 ? /*#__PURE__*/React.createElement("p", {
      className: "text-xs italic text-slate-600"
    }, "No responses yet.") : /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, bucket.responses.map(function (r) {
      return /*#__PURE__*/React.createElement("div", {
        key: r.uid,
        className: "p-2 rounded bg-white border border-indigo-100"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs font-bold text-slate-700 mb-0.5"
      }, r.displayName), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-slate-800 whitespace-pre-wrap break-words"
      }, r.text));
    })));
  }))) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "p-5 rounded-xl border-2 border-indigo-300 bg-white mb-4 shadow-sm",
    role: "region",
    "aria-label": t("a11y.live_results_dashboard")
  }, header, body, /*#__PURE__*/React.createElement(AssessmentItemAnalysisPanel, {
    analysis: itemAnalysis
  }), reflectionsEl, explainerModalEl);
}
function _quizEmitDeterministicAnswer(p, itemType, answer, confidence) {
  if (typeof p.onSubmitLiveAnswer !== 'function' || typeof p.questionIdx !== 'number') return;
  try {
    p.onSubmitLiveAnswer({
      questionIdx: p.questionIdx,
      itemType: itemType,
      conceptLabel: p.q && p.q.conceptLabel || '',
      answer: answer,
      confidence: confidence || null,
      timestamp: Date.now()
    });
  } catch (e) {}
}
function _quizConfidenceButtons(p) {
  if (!p.enabled || !p.grade || p.grade.status === 'idk') return null;
  var labels = {
    knew: 'I knew this',
    guessed: 'I guessed',
    'no-idea': 'No idea'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600 font-semibold"
  }, "How sure were you?"), ['knew', 'guessed', 'no-idea'].map(function (level) {
    return /*#__PURE__*/React.createElement("button", {
      key: level,
      type: "button",
      onClick: function () {
        p.onChange(level);
      },
      className: 'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (p.value === level ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
    }, labels[level]);
  }));
}
function MultiSelectCard(p) {
  var q = p.q;
  var options = Array.isArray(q.options) ? q.options : [];
  var correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
  var draftItemKey = 'q-' + p.questionIdx;
  var selectedState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'selected', []);
  var selected = selectedState[0];
  var setSelected = selectedState[1];
  var gradeState = React.useState(null);
  var grade = gradeState[0];
  var setGrade = gradeState[1];
  var submittedAnswerState = React.useState(null);
  var submittedAnswer = submittedAnswerState[0];
  var setSubmittedAnswer = submittedAnswerState[1];
  var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
  var confidence = confidenceState[0];
  var setConfidence = confidenceState[1];
  var renderRules = p.modeStrategy && p.modeStrategy.render || {};
  function toggleOption(idx) {
    if (grade) return;
    setSelected(function (prev) {
      return prev.indexOf(idx) === -1 ? prev.concat([idx]).sort(function (a, b) {
        return a - b;
      }) : prev.filter(function (n) {
        return n !== idx;
      });
    });
  }
  function submit() {
    if (selected.length === 0 || correctAnswers.length === 0) return;
    var correctIndices = options.map(function (opt, idx) {
      return correctAnswers.indexOf(opt) !== -1 ? idx : -1;
    }).filter(function (idx) {
      return idx >= 0;
    });
    var selectedCorrect = selected.filter(function (idx) {
      return correctIndices.indexOf(idx) !== -1;
    }).length;
    var selectedWrong = selected.length - selectedCorrect;
    var earned = Math.max(0, selectedCorrect - selectedWrong);
    var exact = selectedWrong === 0 && selectedCorrect === correctIndices.length;
    var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
    var score = partialCredit ? Math.round(100 * earned / Math.max(1, correctIndices.length)) : exact ? 100 : 0;
    var status = exact ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
    var answer = {
      selectedIndices: selected.slice(),
      selectedTexts: selected.map(function (idx) {
        return options[idx];
      }),
      status: status,
      score: score
    };
    setGrade({
      status: status,
      score: score,
      selectedCorrect: selectedCorrect,
      selectedWrong: selectedWrong,
      totalCorrect: correctIndices.length
    });
    setSubmittedAnswer(answer);
    _quizEmitDeterministicAnswer(p, 'multi-select', answer, confidence);
  }
  function markIDK() {
    var answer = {
      idk: true
    };
    setGrade({
      status: 'idk',
      score: 0
    });
    setSubmittedAnswer(answer);
    _quizEmitDeterministicAnswer(p, 'multi-select', answer, confidence);
  }
  function updateConfidence(level) {
    setConfidence(level);
    if (submittedAnswer) _quizEmitDeterministicAnswer(p, 'multi-select', submittedAnswer, level);
  }
  function reset() {
    setSelected([]);
    setGrade(null);
    setSubmittedAnswer(null);
    setConfidence(null);
  }
  if (options.length === 0) return null;
  var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1"
  }, "Multi-select"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, q.question || ''), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mt-1"
  }, !p.scoringPolicy || p.scoringPolicy.partialCredit !== false ? 'Select every correct answer. Incorrect selections reduce partial credit.' : 'Select every correct answer. This item uses all-or-nothing scoring.'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, options.map(function (opt, idx) {
    var active = selected.indexOf(idx) !== -1;
    return /*#__PURE__*/React.createElement("button", {
      key: idx,
      type: "button",
      "aria-pressed": active,
      disabled: !!grade,
      onClick: function () {
        toggleOption(idx);
      },
      className: 'w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg border text-sm transition-colors motion-reduce:transition-none disabled:cursor-default ' + (active ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      className: 'mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-black ' + (active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-400')
    }, active ? '✓' : ''), /*#__PURE__*/React.createElement("span", null, opt));
  })), !grade && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: submit,
    disabled: selected.length === 0,
    className: "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
  }, "Check selections"), renderRules.allowIDontKnow && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold"
  }, "I don't know")), grade && /*#__PURE__*/React.createElement("div", {
    className: 'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300',
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-xs font-bold text-' + color + '-900'
  }, grade.status === 'idk' ? 'Marked “I don’t know”' : grade.status === 'correct' ? '✓ All correct' : grade.status === 'partially-correct' ? grade.score + '% partial credit' : 'Not yet — review your selections'), grade.status !== 'idk' && /*#__PURE__*/React.createElement("p", {
    className: 'text-xs mt-1 text-' + color + '-900'
  }, grade.selectedCorrect + ' of ' + grade.totalCorrect + ' correct choices selected' + (grade.selectedWrong ? '; ' + grade.selectedWrong + ' incorrect choice' + (grade.selectedWrong === 1 ? '' : 's') + ' selected.' : '.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: reset,
    className: "mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold"
  }, "Try again")), _quizConfidenceButtons({
    enabled: !!renderRules.allowConfidenceRating,
    grade: grade,
    value: confidence,
    onChange: updateConfidence
  }));
}
function AnswerEvidenceCard(p) {
  var q = p.q;
  var answers = Array.isArray(q.answerOptions) ? q.answerOptions : [];
  var evidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
  var draftItemKey = 'q-' + p.questionIdx;
  var answerState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'answerIdx', null);
  var answerIdx = answerState[0];
  var setAnswerIdx = answerState[1];
  var evidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'evidenceIdx', null);
  var evidenceIdx = evidenceState[0];
  var setEvidenceIdx = evidenceState[1];
  var gradeState = React.useState(null);
  var grade = gradeState[0];
  var setGrade = gradeState[1];
  var submittedState = React.useState(null);
  var submitted = submittedState[0];
  var setSubmitted = submittedState[1];
  var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
  var confidence = confidenceState[0];
  var setConfidence = confidenceState[1];
  var renderRules = p.modeStrategy && p.modeStrategy.render || {};
  function submit() {
    if (answerIdx === null || evidenceIdx === null) return;
    var answerCorrect = answers[answerIdx] === q.correctAnswer;
    var evidenceCorrect = evidence[evidenceIdx] === q.correctEvidence;
    var rawScore = (answerCorrect ? 1 : 0) + (evidenceCorrect ? 1 : 0);
    var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
    var score = partialCredit ? rawScore : rawScore === 2 ? 2 : 0;
    var status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
    var payload = {
      answerIdx: answerIdx,
      answerText: answers[answerIdx],
      evidenceIdx: evidenceIdx,
      evidenceText: evidence[evidenceIdx],
      answerCorrect: answerCorrect,
      evidenceCorrect: evidenceCorrect,
      score: score,
      status: status
    };
    setGrade(payload);
    setSubmitted(payload);
    _quizEmitDeterministicAnswer(p, 'answer-evidence', payload, confidence);
  }
  function markIDK() {
    var payload = {
      idk: true
    };
    setGrade({
      status: 'idk',
      score: 0
    });
    setSubmitted(payload);
    _quizEmitDeterministicAnswer(p, 'answer-evidence', payload, confidence);
  }
  function updateConfidence(level) {
    setConfidence(level);
    if (submitted) _quizEmitDeterministicAnswer(p, 'answer-evidence', submitted, level);
  }
  function reset() {
    setAnswerIdx(null);
    setEvidenceIdx(null);
    setGrade(null);
    setSubmitted(null);
    setConfidence(null);
  }
  if (answers.length === 0 || evidence.length === 0) return null;
  var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
  function optionGrid(items, selectedIdx, setter, disabled) {
    return /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
    }, items.map(function (opt, idx) {
      return /*#__PURE__*/React.createElement("button", {
        key: idx,
        type: "button",
        disabled: disabled,
        "aria-pressed": selectedIdx === idx,
        onClick: function () {
          setter(idx);
        },
        className: 'px-3 py-2 rounded-lg border text-sm text-left transition-colors motion-reduce:transition-none disabled:cursor-default ' + (selectedIdx === idx ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')
      }, String.fromCharCode(65 + idx) + '. ' + opt);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1"
  }, "Answer + evidence"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, q.question || ''))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-700 mb-2"
  }, "Part 1 — Choose the best answer"), optionGrid(answers, answerIdx, setAnswerIdx, !!grade)), answerIdx !== null && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-700 mb-2"
  }, 'Part 2 — ' + (q.evidencePrompt || 'Which evidence or reason best supports your answer?')), optionGrid(evidence, evidenceIdx, setEvidenceIdx, !!grade))), !grade && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: submit,
    disabled: answerIdx === null || evidenceIdx === null,
    className: "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
  }, "Check both parts"), renderRules.allowIDontKnow && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold"
  }, "I don't know")), grade && /*#__PURE__*/React.createElement("div", {
    className: 'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300',
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-xs font-bold text-' + color + '-900'
  }, grade.status === 'idk' ? 'Marked “I don’t know”' : grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'both parts correct' : grade.status === 'partially-correct' ? 'one part correct' : 'needs review')), grade.status !== 'idk' && /*#__PURE__*/React.createElement("ul", {
    className: 'mt-1 text-xs text-' + color + '-900'
  }, /*#__PURE__*/React.createElement("li", null, (grade.answerCorrect ? '✓ ' : '✗ ') + 'Answer'), /*#__PURE__*/React.createElement("li", null, (grade.evidenceCorrect ? '✓ ' : '✗ ') + 'Supporting evidence or reason')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: reset,
    className: "mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold"
  }, "Try again")), _quizConfidenceButtons({
    enabled: !!renderRules.allowConfidenceRating,
    grade: grade,
    value: confidence,
    onChange: updateConfidence
  }));
}
function _quizParseIntegerWords(tokens) {
  var ones = {
    zero: 0,
    oh: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19
  };
  var tens = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90
  };
  var total = 0;
  var current = 0;
  var consumed = 0;
  var sawNumber = false;
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (Object.prototype.hasOwnProperty.call(ones, token)) {
      current += ones[token];
      sawNumber = true;
    } else if (Object.prototype.hasOwnProperty.call(tens, token)) {
      current += tens[token];
      sawNumber = true;
    } else if (/^\d+$/.test(token)) {
      current += Number(token);
      sawNumber = true;
    } else if (token === 'hundred' && sawNumber) {
      current = (current || 1) * 100;
    } else if ((token === 'thousand' || token === 'million') && sawNumber) {
      var scale = token === 'million' ? 1000000 : 1000;
      total += (current || 1) * scale;
      current = 0;
    } else if (token === 'and' && sawNumber && i + 1 < tokens.length) {} else {
      break;
    }
    consumed = i + 1;
  }
  return sawNumber ? {
    value: total + current,
    consumed: consumed
  } : null;
}
function _quizParseSpokenNumber(raw) {
  var tokens = String(raw || '').toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9.]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  var sign = 1;
  if (tokens[0] === 'negative' || tokens[0] === 'minus') {
    sign = -1;
    tokens.shift();
  } else if (tokens[0] === 'positive' || tokens[0] === 'plus') {
    tokens.shift();
  }
  if (!tokens.length) return null;
  function done(value, consumed) {
    return {
      value: sign * value,
      unit: tokens.slice(consumed).join(' ')
    };
  }
  var denominators = {
    half: 2,
    halves: 2,
    third: 3,
    thirds: 3,
    quarter: 4,
    quarters: 4,
    fourth: 4,
    fourths: 4,
    fifth: 5,
    fifths: 5,
    eighth: 8,
    eighths: 8,
    tenth: 10,
    tenths: 10,
    hundredth: 100,
    hundredths: 100
  };
  var denominatorIndex = -1;
  for (var d = 0; d < tokens.length; d++) {
    if (denominators[tokens[d]]) {
      denominatorIndex = d;
      break;
    }
  }
  if (denominatorIndex >= 0) {
    var andIndex = tokens.slice(0, denominatorIndex).lastIndexOf('and');
    var whole = 0;
    var numeratorStart = 0;
    if (andIndex >= 0) {
      var wholeParsed = _quizParseIntegerWords(tokens.slice(0, andIndex));
      if (!wholeParsed || wholeParsed.consumed !== andIndex) return null;
      whole = wholeParsed.value;
      numeratorStart = andIndex + 1;
    }
    var numeratorTokens = tokens.slice(numeratorStart, denominatorIndex);
    var numerator = 1;
    if (numeratorTokens.length && numeratorTokens[0] !== 'a' && numeratorTokens[0] !== 'an') {
      var numeratorParsed = _quizParseIntegerWords(numeratorTokens);
      if (!numeratorParsed || numeratorParsed.consumed !== numeratorTokens.length) return null;
      numerator = numeratorParsed.value;
    }
    return done(whole + numerator / denominators[tokens[denominatorIndex]], denominatorIndex + 1);
  }
  var pointIndex = tokens.indexOf('point');
  if (pointIndex >= 0) {
    var integerPart = pointIndex === 0 ? {
      value: 0,
      consumed: 0
    } : _quizParseIntegerWords(tokens.slice(0, pointIndex));
    if (!integerPart || integerPart.consumed !== pointIndex) return null;
    var digitWords = {
      zero: '0',
      oh: '0',
      one: '1',
      two: '2',
      three: '3',
      four: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      nine: '9'
    };
    var digits = '';
    var consumedAfterPoint = 0;
    for (var p = pointIndex + 1; p < tokens.length; p++) {
      var digit = Object.prototype.hasOwnProperty.call(digitWords, tokens[p]) ? digitWords[tokens[p]] : /^\d+$/.test(tokens[p]) ? tokens[p] : '';
      if (!digit) break;
      digits += digit;
      consumedAfterPoint += 1;
    }
    if (!digits) return null;
    return done(integerPart.value + Number('0.' + digits), pointIndex + 1 + consumedAfterPoint);
  }
  var integer = _quizParseIntegerWords(tokens);
  return integer ? done(integer.value, integer.consumed) : null;
}
function _quizParseNumericResponse(raw) {
  var text = String(raw || '').trim().replace(/,/g, '');
  var fraction = text.match(/^([+-]?\d+)\s*\/\s*(\d+)(?:\s+(.+))?$/);
  if (fraction && Number(fraction[2]) !== 0) return {
    value: Number(fraction[1]) / Number(fraction[2]),
    unit: String(fraction[3] || '').trim()
  };
  var decimal = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*(.*))?$/i);
  if (decimal) {
    var value = Number(decimal[1]);
    return Number.isFinite(value) ? {
      value: value,
      unit: String(decimal[2] || '').trim()
    } : null;
  }
  return _quizParseSpokenNumber(text);
}
function _quizNormalizeUnit(unit) {
  return String(unit || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
}
function NumericResponseCard(p) {
  var q = p.q;
  var draftItemKey = 'q-' + p.questionIdx;
  var responseState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'response', '');
  var response = responseState[0];
  var setResponse = responseState[1];
  var gradeState = React.useState(null);
  var grade = gradeState[0];
  var setGrade = gradeState[1];
  var submittedState = React.useState(null);
  var submitted = submittedState[0];
  var setSubmitted = submittedState[1];
  var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
  var confidence = confidenceState[0];
  var setConfidence = confidenceState[1];
  var renderRules = p.modeStrategy && p.modeStrategy.render || {};
  function submit() {
    var parsed = _quizParseNumericResponse(response);
    if (!parsed) {
      setGrade({
        status: 'invalid',
        score: 0
      });
      return;
    }
    var expected = Number(q.correctValue);
    var tolerance = Math.max(0, Number(q.tolerance) || 0);
    var valueCorrect = Number.isFinite(expected) && Math.abs(parsed.value - expected) <= tolerance + 1e-9;
    var expectedUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(_quizNormalizeUnit).filter(Boolean);
    var unitCorrect = expectedUnits.length === 0 || expectedUnits.indexOf(_quizNormalizeUnit(parsed.unit)) !== -1;
    var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
    var rawScore = valueCorrect && unitCorrect ? 100 : valueCorrect || unitCorrect && expectedUnits.length > 0 ? 50 : 0;
    var score = partialCredit ? rawScore : rawScore === 100 ? 100 : 0;
    var status = score === 100 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
    var payload = {
      text: response,
      numericValue: parsed.value,
      unit: parsed.unit,
      valueCorrect: valueCorrect,
      unitCorrect: unitCorrect,
      status: status,
      score: score
    };
    setGrade(payload);
    setSubmitted(payload);
    _quizEmitDeterministicAnswer(p, 'numeric-response', payload, confidence);
  }
  function markIDK() {
    var payload = {
      idk: true
    };
    setGrade({
      status: 'idk',
      score: 0
    });
    setSubmitted(payload);
    _quizEmitDeterministicAnswer(p, 'numeric-response', payload, confidence);
  }
  function updateConfidence(level) {
    setConfidence(level);
    if (submitted) _quizEmitDeterministicAnswer(p, 'numeric-response', submitted, level);
  }
  function reset() {
    setResponse('');
    setGrade(null);
    setSubmitted(null);
    setConfidence(null);
  }
  var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1"
  }, "Numeric response"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, q.question || ''), q.unit && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mt-1"
  }, 'Include units (' + q.unit + ').'))), /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "decimal",
    "aria-label": "Numeric response",
    value: response,
    onChange: function (e) {
      setResponse(e.target.value);
    },
    onKeyDown: function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    },
    disabled: !!grade && grade.status !== 'invalid',
    placeholder: q.unit ? 'Example: 12.5 ' + q.unit : 'Enter a number',
    className: "w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50"
  }), /*#__PURE__*/React.createElement(QuizVoiceInputButton, {
    value: response,
    onChange: setResponse,
    disabled: !!grade && grade.status !== 'invalid',
    allowDictation: p.allowDictation,
    label: "Dictate number or units"
  }), !grade || grade.status === 'invalid' ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: submit,
    disabled: !response.trim(),
    className: "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
  }, "Check value"), renderRules.allowIDontKnow && !grade && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold"
  }, "I don't know"), grade && grade.status === 'invalid' && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-rose-700 self-center"
  }, "Enter a number, optionally followed by its unit.")) : null, grade && grade.status !== 'invalid' && /*#__PURE__*/React.createElement("div", {
    className: 'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300',
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'text-xs font-bold text-' + color + '-900'
  }, grade.status === 'idk' ? 'Marked “I don’t know”' : grade.status === 'correct' ? '✓ Correct value and units' : grade.status === 'partially-correct' ? 'Partially correct — check the value or units' : 'Not yet — check your calculation and units'), grade.status !== 'idk' && /*#__PURE__*/React.createElement("p", {
    className: 'text-xs mt-1 text-' + color + '-900'
  }, 'Expected ' + q.correctValue + (q.unit ? ' ' + q.unit : '') + (Number(q.tolerance) > 0 ? ' (±' + q.tolerance + ')' : '') + '.'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: reset,
    className: "mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold"
  }, "Try again")), _quizConfidenceButtons({
    enabled: !!renderRules.allowConfidenceRating,
    grade: grade && grade.status !== 'invalid' ? grade : null,
    value: confidence,
    onChange: updateConfidence
  }));
}
function _quizExtractJson(raw) {
  var value = raw && typeof raw === 'object' && raw.text ? raw.text : raw;
  if (value && typeof value === 'object') return value;
  var text = String(value || '').trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/i, '');
  try {
    return JSON.parse(text);
  } catch (e) {}
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (e) {}
  }
  return null;
}
function _quizSchemaForType(type) {
  var schemas = {
    mcq: '{type:"mcq",question,options:[4 strings],correctAnswer,conceptLabel}',
    'multi-select': '{type:"multi-select",question,options:[4-6 strings],correctAnswers:[2-4 exact option strings],conceptLabel}',
    'fill-blank': '{type:"fill-blank",question:"sentence with ___",expectedFill,acceptableAlternatives:[],conceptLabel}',
    'short-answer': '{type:"short-answer",question,expectedAnswer,conceptLabel}',
    'self-explanation': '{type:"self-explanation",question,rubric,conceptLabel}',
    'sequence-sense': '{type:"sequence-sense",question,items:[canonical strings],presentedOrder:[indices],intentionallyWrongIndex,orderingPrinciple,principleOptions:[],conceptLabel}',
    'relation-mismatch': '{type:"relation-mismatch",question,pairs:[{left,right}],wrongPairIndex,correctPartnerForWrong,candidatePartners:[],conceptLabel}',
    'answer-evidence': '{type:"answer-evidence",question,answerOptions:[4 strings],correctAnswer,evidencePrompt,evidenceOptions:[4 strings],correctEvidence,conceptLabel}',
    'numeric-response': '{type:"numeric-response",question,correctValue:number,tolerance:number,unit,acceptableUnits:[],conceptLabel}'
  };
  return schemas[type] || schemas.mcq;
}
function _quizDuplicateStrings(values) {
  var seen = {};
  var duplicates = [];
  (Array.isArray(values) ? values : []).forEach(function (value) {
    var normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return;
    if (seen[normalized] && duplicates.indexOf(normalized) === -1) duplicates.push(normalized);
    seen[normalized] = true;
  });
  return duplicates;
}
function _quizAuditAssessment(data) {
  var questions = data && Array.isArray(data.questions) ? data.questions : [];
  var requested = data && data.requestedItemTypeMix && typeof data.requestedItemTypeMix === 'object' ? data.requestedItemTypeMix : null;
  var actual = {};
  var issues = [];
  function add(questionIdx, severity, message, code) {
    issues.push({
      questionIdx: questionIdx,
      severity: severity,
      message: message,
      code: code || 'quality'
    });
  }
  questions.forEach(function (q, index) {
    if (!q || typeof q !== 'object') {
      add(index, 'error', 'Question data is missing.', 'missing-question');
      return;
    }
    var type = q.type || 'mcq';
    actual[type] = (actual[type] || 0) + 1;
    if (!String(q.question || '').trim()) add(index, 'error', 'The question prompt is empty.', 'empty-prompt');
    if (!String(q.conceptLabel || '').trim()) add(index, 'warning', 'Add a concept label for clearer results and retention tracking.', 'concept-label');
    if (type === 'mcq') {
      var mcqOptions = Array.isArray(q.options) ? q.options : [];
      if (mcqOptions.length < 2) add(index, 'error', 'Multiple choice needs at least two options.', 'mcq-options');
      if (mcqOptions.indexOf(q.correctAnswer) === -1) add(index, 'error', 'The correct answer must match one option exactly.', 'mcq-key');
      if (_quizDuplicateStrings(mcqOptions).length) add(index, 'error', 'Multiple-choice options contain duplicates.', 'duplicate-options');
    } else if (type === 'multi-select') {
      var multiOptions = Array.isArray(q.options) ? q.options : [];
      var correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
      if (multiOptions.length < 3) add(index, 'error', 'Multi-select needs at least three options.', 'multi-options');
      if (correctAnswers.length < 2) add(index, 'error', 'Multi-select should identify at least two correct options.', 'multi-key');
      if (correctAnswers.some(function (answer) {
        return multiOptions.indexOf(answer) === -1;
      })) add(index, 'error', 'Every multi-select answer key must match an option exactly.', 'multi-key-match');
      if (correctAnswers.length >= multiOptions.length && multiOptions.length) add(index, 'warning', 'Every option is marked correct, which makes the item weak.', 'multi-all-correct');
      if (_quizDuplicateStrings(multiOptions).length) add(index, 'error', 'Multi-select options contain duplicates.', 'duplicate-options');
    } else if (type === 'fill-blank') {
      if (String(q.question || '').indexOf('___') === -1) add(index, 'warning', 'The prompt should visibly contain ___ for the blank.', 'blank-marker');
      if (!String(q.expectedFill || '').trim()) add(index, 'error', 'Fill-in-the-blank needs an expected answer.', 'fill-key');
    } else if (type === 'short-answer') {
      if (!String(q.expectedAnswer || '').trim()) add(index, 'error', 'Brief written response needs a reference answer.', 'written-key');
    } else if (type === 'self-explanation') {
      if (!String(q.rubric || q.expectedAnswer || '').trim()) add(index, 'error', 'Explain Your Reasoning needs a rubric.', 'rubric');
    } else if (type === 'sequence-sense') {
      var items = Array.isArray(q.items) ? q.items : [];
      var order = Array.isArray(q.presentedOrder) ? q.presentedOrder : [];
      if (items.length < 3) add(index, 'error', 'Sequence Sense needs at least three steps.', 'sequence-items');
      if (order.length !== items.length || order.some(function (value) {
        return !Number.isInteger(value) || value < 0 || value >= items.length;
      }) || new Set(order).size !== order.length) add(index, 'error', 'Displayed order must use every step index exactly once.', 'sequence-order');
      if (!String(q.orderingPrinciple || '').trim()) add(index, 'error', 'Sequence Sense needs an ordering principle.', 'sequence-principle');
    } else if (type === 'relation-mismatch') {
      var pairs = Array.isArray(q.pairs) ? q.pairs : [];
      var wrongIndex = Number(q.wrongPairIndex);
      if (pairs.length < 3) add(index, 'error', 'Relation Mismatch needs at least three pairs.', 'relation-pairs');
      if (!Number.isInteger(wrongIndex) || wrongIndex < 0 || wrongIndex >= pairs.length) add(index, 'error', 'Choose which displayed pair is incorrect.', 'relation-index');
      if (!String(q.correctPartnerForWrong || '').trim()) add(index, 'error', 'Provide the correct partner for the mismatched pair.', 'relation-key');
      if (!Array.isArray(q.candidatePartners) || q.candidatePartners.indexOf(q.correctPartnerForWrong) === -1) add(index, 'error', 'Candidate partners must include the correct repair.', 'relation-candidates');
    } else if (type === 'answer-evidence') {
      var answers = Array.isArray(q.answerOptions) ? q.answerOptions : [];
      var evidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
      if (answers.length < 2 || answers.indexOf(q.correctAnswer) === -1) add(index, 'error', 'Answer + Evidence needs a valid answer key.', 'evidence-answer-key');
      if (evidence.length < 2 || evidence.indexOf(q.correctEvidence) === -1) add(index, 'error', 'Answer + Evidence needs a valid evidence key.', 'evidence-key');
      if (_quizDuplicateStrings(answers).length || _quizDuplicateStrings(evidence).length) add(index, 'error', 'Answer or evidence choices contain duplicates.', 'duplicate-options');
    } else if (type === 'numeric-response') {
      if (!Number.isFinite(Number(q.correctValue))) add(index, 'error', 'Numeric Response needs a valid numeric answer.', 'numeric-key');
      if (!Number.isFinite(Number(q.tolerance)) || Number(q.tolerance) < 0) add(index, 'error', 'Numeric tolerance must be zero or greater.', 'numeric-tolerance');
      var normalizedUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(_quizNormalizeUnit).filter(Boolean);
      if (_quizDuplicateStrings(normalizedUnits).length) add(index, 'warning', 'Accepted units contain duplicate spellings.', 'numeric-units');
    } else {
      add(index, 'error', 'Unsupported question type: ' + type + '.', 'unsupported-type');
    }
  });
  var missingMix = {};
  if (requested) {
    Object.keys(requested).forEach(function (type) {
      var difference = Math.max(0, Number(requested[type] || 0) - Number(actual[type] || 0));
      if (difference > 0) {
        missingMix[type] = difference;
        add(null, 'error', 'Missing ' + difference + ' ' + type + ' item' + (difference === 1 ? '' : 's') + ' from the requested recipe.', 'missing-type');
      }
    });
    Object.keys(actual).forEach(function (type) {
      var extra = Math.max(0, Number(actual[type] || 0) - Number(requested[type] || 0));
      if (extra > 0) add(null, 'warning', 'Generated ' + extra + ' extra ' + type + ' item' + (extra === 1 ? '' : 's') + '.', 'extra-type');
    });
  }
  var weakItems = data && data.distractorReview && Array.isArray(data.distractorReview.weakItems) ? data.distractorReview.weakItems : [];
  weakItems.forEach(function (index) {
    if (!issues.some(function (issue) {
      return issue.questionIdx === index && issue.code === 'weak-distractor';
    })) add(index, 'warning', 'One or more distractors are generic rather than misconception-based.', 'weak-distractor');
  });
  return {
    questions: questions,
    requestedMix: requested,
    actualMix: actual,
    missingMix: missingMix,
    issues: issues,
    errorCount: issues.filter(function (issue) {
      return issue.severity === 'error';
    }).length,
    warningCount: issues.filter(function (issue) {
      return issue.severity === 'warning';
    }).length,
    ready: issues.filter(function (issue) {
      return issue.severity === 'error';
    }).length === 0
  };
}
function _quizH5PPreflight(data) {
  var questions = data && Array.isArray(data.questions) ? data.questions : [];
  var allMcq = questions.length > 0 && questions.every(function (q) {
    return !q || !q.type || q.type === 'mcq';
  });
  var valid = 0;
  var adapted = 0;
  var manualReview = 0;
  questions.forEach(function (q) {
    q = q || {};
    var type = q.type || 'mcq';
    var prompt = String(q.question || '').trim();
    var okay = false;
    if (type === 'mcq') {
      var mcqOptions = Array.isArray(q.options) ? q.options.filter(function (option) {
        return String(option || '').trim();
      }) : [];
      okay = !!prompt && mcqOptions.length >= 2 && (!allMcq || mcqOptions.length <= 4) && mcqOptions.indexOf(q.correctAnswer) !== -1;
    } else if (type === 'multi-select') {
      var multiOptions = Array.isArray(q.options) ? q.options : [];
      var multiKeys = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
      okay = !!prompt && multiOptions.length >= 2 && multiKeys.length > 0 && multiKeys.every(function (answer) {
        return multiOptions.indexOf(answer) !== -1;
      });
    } else if (type === 'fill-blank') {
      okay = !!prompt && !!String(q.expectedFill || '').trim();
    } else if (type === 'short-answer') {
      okay = !!prompt;
      manualReview += okay ? 1 : 0;
    } else if (type === 'self-explanation') {
      okay = !!prompt;
      manualReview += okay ? 1 : 0;
    } else if (type === 'sequence-sense') {
      okay = !!prompt && Array.isArray(q.items) && q.items.length >= 3;
      adapted += okay ? 1 : 0;
      manualReview += okay ? 1 : 0;
    } else if (type === 'relation-mismatch') {
      var wrongIndex = Number(q.wrongPairIndex);
      okay = !!prompt && Array.isArray(q.pairs) && q.pairs.length >= 2 && Number.isInteger(wrongIndex) && wrongIndex >= 0 && wrongIndex < q.pairs.length && Array.isArray(q.candidatePartners) && q.candidatePartners.length >= 2 && q.candidatePartners.indexOf(q.correctPartnerForWrong) !== -1;
      adapted += okay ? 1 : 0;
    } else if (type === 'answer-evidence') {
      okay = !!prompt && Array.isArray(q.answerOptions) && q.answerOptions.length >= 2 && q.answerOptions.indexOf(q.correctAnswer) !== -1 && Array.isArray(q.evidenceOptions) && q.evidenceOptions.length >= 2 && q.evidenceOptions.indexOf(q.correctEvidence) !== -1;
      adapted += okay ? 1 : 0;
    } else if (type === 'numeric-response') {
      okay = !!prompt && Number.isFinite(Number(q.correctValue));
      adapted += okay ? 1 : 0;
      manualReview += okay && Number(q.tolerance) > 0 ? 1 : 0;
    }
    if (okay) valid += 1;
  });
  return {
    total: questions.length,
    valid: valid,
    omitted: questions.length - valid,
    adapted: adapted,
    manualReview: manualReview,
    library: allMcq ? 'Single Choice Set 1.11' : 'Question Set 1.21',
    ready: valid > 0
  };
}
function QuizVoiceInputButton(p) {
  var statusState = React.useState({
    state: 'idle',
    engineLabel: '',
    privacy: '',
    message: ''
  });
  var status = statusState[0];
  var setStatus = statusState[1];
  var controllerRef = React.useRef(null);
  var voice = typeof window !== 'undefined' ? window.AlloFlowVoice : null;
  var nativeSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  var sharedServicePresent = !!(voice && typeof voice.isDictationSupported === 'function');
  var sharedSupported = sharedServicePresent && voice.isDictationSupported();
  var supported = p.allowDictation !== false && (sharedServicePresent ? sharedSupported : nativeSupported);
  React.useEffect(function () {
    return function () {
      try {
        if (controllerRef.current) controllerRef.current.abort('unmount');
      } catch (e) {}
      controllerRef.current = null;
    };
  }, []);
  function appendTranscript(transcript) {
    var clean = String(transcript || '').trim();
    if (!clean || typeof p.onChange !== 'function') return;
    var prior = String(p.value || '').trim();
    p.onChange((prior ? prior + ' ' : '') + clean);
  }
  function createNativeFallback() {
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return null;
    var recognition = new Recognition();
    var active = false;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en-US';
    recognition.onstart = function () {
      active = true;
      setStatus({
        state: 'listening',
        engineLabel: window.__alloLocalSRShim ? 'On-device Whisper' : 'Browser speech service',
        privacy: window.__alloLocalSRShim ? 'Audio stays on this device.' : 'Your browser may send audio to its speech provider.',
        message: 'Listening...'
      });
    };
    recognition.onresult = function (event) {
      var transcript = event && event.results && event.results[0] && event.results[0][0] ? event.results[0][0].transcript : '';
      appendTranscript(transcript);
    };
    recognition.onerror = function (event) {
      active = false;
      setStatus({
        state: 'error',
        engineLabel: '',
        privacy: '',
        message: event && event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'Dictation was unavailable.'
      });
    };
    recognition.onend = function () {
      active = false;
      setStatus({
        state: 'idle',
        engineLabel: '',
        privacy: '',
        message: 'Dictation added.'
      });
    };
    return {
      start: function () {
        recognition.start();
        return true;
      },
      stop: function () {
        recognition.stop();
      },
      abort: function () {
        try {
          recognition.abort();
        } catch (e) {}
      },
      isActive: function () {
        return active;
      },
      getState: function () {
        return active ? 'listening' : 'idle';
      }
    };
  }
  function toggle() {
    if (!supported || p.disabled) return;
    var current = controllerRef.current;
    if (current && current.isActive && current.isActive()) {
      current.stop();
      return;
    }
    if (voice && typeof voice.createDictationController === 'function') {
      current = voice.createDictationController({
        continuous: false,
        restartOnEnd: false,
        lang: typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en-US',
        onTranscript: appendTranscript,
        onStateChange: setStatus
      });
    } else {
      current = createNativeFallback();
    }
    controllerRef.current = current;
    if (!current) {
      setStatus({
        state: 'error',
        engineLabel: '',
        privacy: '',
        message: 'Dictation was unavailable.'
      });
      return;
    }
    try {
      current.start();
    } catch (e) {
      setStatus({
        state: 'error',
        engineLabel: '',
        privacy: '',
        message: 'Dictation was unavailable.'
      });
    }
  }
  if (!supported) return null;
  var listening = status.state === 'starting' || status.state === 'listening';
  var transcribing = status.state === 'transcribing';
  var buttonLabel = listening ? 'Stop dictation' : transcribing ? 'Transcribing...' : p.label || 'Dictate response';
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: toggle,
    disabled: p.disabled || transcribing,
    "aria-pressed": listening,
    "aria-busy": transcribing,
    "data-dictation-engine": status.engine || '',
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold disabled:opacity-50 ' + (listening || transcribing ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🎙"), buttonLabel), status.message && /*#__PURE__*/React.createElement("span", {
    role: "status",
    "aria-live": "polite",
    className: "text-[10px] text-slate-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, status.message), status.engineLabel && /*#__PURE__*/React.createElement("span", null, ' · ' + status.engineLabel), status.privacy && /*#__PURE__*/React.createElement("span", null, ' · ' + status.privacy)));
}
function AssessmentTextListEditor(p) {
  var values = Array.isArray(p.values) ? p.values : [];
  function change(index, value) {
    var next = values.slice();
    next[index] = value;
    p.onChange(next);
  }
  function remove(index) {
    if (values.length <= (p.minimum || 0)) return;
    p.onChange(values.filter(function (_, itemIndex) {
      return itemIndex !== index;
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, p.label), values.map(function (value, index) {
    return /*#__PURE__*/React.createElement("div", {
      key: index,
      className: "flex gap-2 items-center"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": p.label + ' ' + (index + 1),
      value: value,
      onChange: function (event) {
        change(index, event.target.value);
      },
      className: "flex-1 min-w-0 text-xs border-slate-300 rounded-md p-2 bg-white"
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        remove(index);
      },
      disabled: values.length <= (p.minimum || 0),
      className: "w-7 h-7 rounded border border-rose-200 text-rose-700 bg-white disabled:opacity-30",
      "aria-label": 'Remove ' + p.label + ' ' + (index + 1)
    }, "×"));
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      p.onChange(values.concat(['']));
    },
    className: "text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
  }, "+ Add ", p.itemLabel || 'item'));
}
function AssessmentItemActions(p) {
  var action = p.onAction;
  var disabled = typeof action !== 'function';
  var q = p.q || {};
  var deleteConfirmState = React.useState(false);
  var deleteConfirmOpen = deleteConfirmState[0];
  var setDeleteConfirmOpen = deleteConfirmState[1];
  return /*#__PURE__*/React.createElement("div", {
    className: "ml-9 mb-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2 space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled || p.questionIdx <= 0,
    onClick: function () {
      action(p.questionIdx, 'move', -1);
    },
    className: "px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30"
  }, "Move up"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled || p.questionIdx >= p.totalQuestions - 1,
    onClick: function () {
      action(p.questionIdx, 'move', 1);
    },
    className: "px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30"
  }, "Move down"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: function () {
      action(p.questionIdx, 'duplicate');
    },
    className: "px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30"
  }, "Duplicate"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled || p.regenerating,
    onClick: function () {
      if (typeof p.onRegenerate === 'function') p.onRegenerate(p.questionIdx, q);
    },
    className: "px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40"
  }, p.regenerating ? 'Regenerating…' : 'Regenerate item'), !deleteConfirmOpen ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: function () {
      setDeleteConfirmOpen(true);
    },
    className: "ml-auto px-2 py-1 rounded bg-white border border-rose-300 text-rose-700 text-xs font-semibold disabled:opacity-30"
  }, "Delete") : /*#__PURE__*/React.createElement("span", {
    className: "ml-auto inline-flex items-center gap-1",
    role: "group",
    "aria-label": "Confirm question deletion"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    autoFocus: true,
    onClick: function () {
      action(p.questionIdx, 'delete');
    },
    className: "px-2 py-1 rounded bg-rose-700 text-white text-xs font-semibold"
  }, "Confirm delete"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setDeleteConfirmOpen(false);
    },
    className: "px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold"
  }, "Cancel"))), q.type === 'mcq' && Array.isArray(q.options) && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] font-semibold text-slate-700"
  }, "Correct answer", /*#__PURE__*/React.createElement("select", {
    value: q.correctAnswer || '',
    onChange: function (event) {
      action(p.questionIdx, 'patch', {
        correctAnswer: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded p-1.5 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Choose answer…"), q.options.map(function (option, index) {
    return /*#__PURE__*/React.createElement("option", {
      key: index,
      value: option
    }, option || 'Option ' + (index + 1));
  }))), /*#__PURE__*/React.createElement("label", {
    className: "text-[11px] font-semibold text-slate-700"
  }, "Concept label", /*#__PURE__*/React.createElement("input", {
    value: q.conceptLabel || '',
    onChange: function (event) {
      action(p.questionIdx, 'patch', {
        conceptLabel: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded p-1.5 bg-white"
  }))));
}
function AssessmentCoreFields(p) {
  var q = p.q || {};
  var type = q.type || '';
  var patch = p.patch;
  function updateList(field, values) {
    var update = {};
    update[field] = values;
    if (type === 'multi-select' && field === 'options') {
      var oldOptions = Array.isArray(q.options) ? q.options : [];
      update.correctAnswers = (Array.isArray(q.correctAnswers) ? q.correctAnswers : []).map(function (answer) {
        var index = oldOptions.indexOf(answer);
        return index >= 0 && values[index] !== undefined ? values[index] : answer;
      });
    }
    if (type === 'answer-evidence' && field === 'answerOptions') {
      var oldAnswers = Array.isArray(q.answerOptions) ? q.answerOptions : [];
      var answerIndex = oldAnswers.indexOf(q.correctAnswer);
      if (answerIndex >= 0 && values[answerIndex] !== undefined) update.correctAnswer = values[answerIndex];
    }
    if (type === 'answer-evidence' && field === 'evidenceOptions') {
      var oldEvidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
      var evidenceIndex = oldEvidence.indexOf(q.correctEvidence);
      if (evidenceIndex >= 0 && values[evidenceIndex] !== undefined) update.correctEvidence = values[evidenceIndex];
    }
    patch(update);
  }
  if (type === 'multi-select') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Answer options",
    itemLabel: "option",
    values: q.options || [],
    minimum: 3,
    onChange: function (values) {
      updateList('options', values);
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-slate-700 mb-1"
  }, "Correct options"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, (q.options || []).map(function (option, index) {
    var checked = (q.correctAnswers || []).indexOf(option) !== -1;
    return /*#__PURE__*/React.createElement("label", {
      key: index,
      className: "flex items-center gap-2 text-xs text-slate-700"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      "aria-label": 'Mark option ' + (index + 1) + ' as correct',
      checked: checked,
      onChange: function (event) {
        var next = (q.correctAnswers || []).filter(function (answer) {
          return answer !== option;
        });
        if (event.target.checked) next.push(option);
        patch({
          correctAnswers: next
        });
      }
    }), option || 'Option ' + (index + 1));
  }))));
  if (type === 'fill-blank') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Expected answer", /*#__PURE__*/React.createElement("input", {
    value: q.expectedFill || '',
    onChange: function (event) {
      patch({
        expectedFill: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Accepted alternatives",
    itemLabel: "alternative",
    values: q.acceptableAlternatives || [],
    minimum: 0,
    onChange: function (values) {
      patch({
        acceptableAlternatives: values
      });
    }
  }));
  if (type === 'short-answer') return /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Reference answer", /*#__PURE__*/React.createElement("textarea", {
    value: q.expectedAnswer || '',
    onChange: function (event) {
      patch({
        expectedAnswer: event.target.value
      });
    },
    rows: "3",
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2 resize-y"
  }));
  if (type === 'self-explanation') return /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Scoring rubric", /*#__PURE__*/React.createElement("textarea", {
    value: q.rubric || q.expectedAnswer || '',
    onChange: function (event) {
      patch({
        rubric: event.target.value
      });
    },
    rows: "4",
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2 resize-y"
  }));
  if (type === 'answer-evidence') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Answer choices",
    itemLabel: "answer",
    values: q.answerOptions || [],
    minimum: 2,
    onChange: function (values) {
      updateList('answerOptions', values);
    }
  }), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Correct answer", /*#__PURE__*/React.createElement("select", {
    value: q.correctAnswer || '',
    onChange: function (event) {
      patch({
        correctAnswer: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Choose answer…"), (q.answerOptions || []).map(function (option, index) {
    return /*#__PURE__*/React.createElement("option", {
      key: index,
      value: option
    }, option || 'Answer ' + (index + 1));
  }))), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Evidence prompt", /*#__PURE__*/React.createElement("input", {
    value: q.evidencePrompt || '',
    onChange: function (event) {
      patch({
        evidencePrompt: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Evidence choices",
    itemLabel: "evidence choice",
    values: q.evidenceOptions || [],
    minimum: 2,
    onChange: function (values) {
      updateList('evidenceOptions', values);
    }
  }), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Correct evidence", /*#__PURE__*/React.createElement("select", {
    value: q.correctEvidence || '',
    onChange: function (event) {
      patch({
        correctEvidence: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Choose evidence…"), (q.evidenceOptions || []).map(function (option, index) {
    return /*#__PURE__*/React.createElement("option", {
      key: index,
      value: option
    }, option || 'Evidence ' + (index + 1));
  }))));
  if (type === 'numeric-response') return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Correct value", /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "any",
    value: q.correctValue == null ? '' : q.correctValue,
    onChange: function (event) {
      patch({
        correctValue: event.target.value === '' ? '' : Number(event.target.value)
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Tolerance", /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "any",
    value: q.tolerance == null ? 0 : q.tolerance,
    onChange: function (event) {
      patch({
        tolerance: event.target.value === '' ? '' : Number(event.target.value)
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-700"
  }, "Preferred unit", /*#__PURE__*/React.createElement("input", {
    value: q.unit || '',
    onChange: function (event) {
      patch({
        unit: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-3"
  }, /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Accepted unit spellings",
    itemLabel: "unit spelling",
    values: q.acceptableUnits || [],
    minimum: 0,
    onChange: function (values) {
      patch({
        acceptableUnits: values
      });
    }
  })));
  return null;
}
function AssessmentDiagnosticFields(p) {
  var q = p.q || {};
  var type = q.type || '';
  var patch = p.patch;
  var items = Array.isArray(q.items) ? q.items : [];
  var pairs = Array.isArray(q.pairs) ? q.pairs : [];
  if (type === 'sequence-sense') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Steps in canonical order",
    itemLabel: "step",
    values: items,
    minimum: 3,
    onChange: function (values) {
      patch({
        items: values,
        presentedOrder: values.map(function (_, index) {
          return index;
        }),
        intentionallyWrongIndex: null
      });
    }
  }), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Displayed order ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal text-slate-500"
  }, "(1-based, comma-separated)"), /*#__PURE__*/React.createElement("input", {
    "aria-label": "Displayed sequence order using one-based positions",
    value: (q.presentedOrder || []).map(function (value) {
      return Number(value) + 1;
    }).join(', '),
    onChange: function (event) {
      var order = event.target.value.split(',').map(function (value) {
        return Number(value.trim()) - 1;
      }).filter(function (value) {
        return Number.isInteger(value);
      });
      patch({
        presentedOrder: order
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Misplaced displayed position", /*#__PURE__*/React.createElement("select", {
    value: q.intentionallyWrongIndex === null || q.intentionallyWrongIndex === undefined ? '' : q.intentionallyWrongIndex,
    onChange: function (event) {
      patch({
        intentionallyWrongIndex: event.target.value === '' ? null : Number(event.target.value)
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Order is correct"), items.map(function (_, index) {
    return /*#__PURE__*/React.createElement("option", {
      key: index,
      value: index
    }, "Position ", index + 1);
  }))), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Ordering principle", /*#__PURE__*/React.createElement("input", {
    value: q.orderingPrinciple || '',
    onChange: function (event) {
      patch({
        orderingPrinciple: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Principle choices",
    itemLabel: "choice",
    values: q.principleOptions || [],
    minimum: 3,
    onChange: function (values) {
      patch({
        principleOptions: values
      });
    }
  }));
  if (type === 'relation-mismatch') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-slate-700"
  }, "Displayed pairs"), pairs.map(function (pair, index) {
    return /*#__PURE__*/React.createElement("div", {
      key: index,
      className: "grid grid-cols-[1fr_1fr_auto] gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": 'Pair ' + (index + 1) + ' left',
      value: pair.left || '',
      onChange: function (event) {
        var next = pairs.map(function (item, itemIndex) {
          return itemIndex === index ? Object.assign({}, item, {
            left: event.target.value
          }) : item;
        });
        patch({
          pairs: next
        });
      },
      className: "text-xs border-slate-300 rounded p-2"
    }), /*#__PURE__*/React.createElement("input", {
      "aria-label": 'Pair ' + (index + 1) + ' right',
      value: pair.right || '',
      onChange: function (event) {
        var next = pairs.map(function (item, itemIndex) {
          return itemIndex === index ? Object.assign({}, item, {
            right: event.target.value
          }) : item;
        });
        patch({
          pairs: next
        });
      },
      className: "text-xs border-slate-300 rounded p-2"
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: pairs.length <= 3,
      onClick: function () {
        patch({
          pairs: pairs.filter(function (_, itemIndex) {
            return itemIndex !== index;
          })
        });
      },
      className: "w-7 rounded border border-rose-200 text-rose-700 disabled:opacity-30",
      "aria-label": 'Remove pair ' + (index + 1)
    }, "×"));
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      patch({
        pairs: pairs.concat([{
          left: '',
          right: ''
        }])
      });
    },
    className: "text-[11px] font-semibold text-indigo-700"
  }, "+ Add pair")), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Incorrect pair", /*#__PURE__*/React.createElement("select", {
    value: Number.isInteger(Number(q.wrongPairIndex)) ? Number(q.wrongPairIndex) : '',
    onChange: function (event) {
      patch({
        wrongPairIndex: Number(event.target.value)
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Choose pair…"), pairs.map(function (_, index) {
    return /*#__PURE__*/React.createElement("option", {
      key: index,
      value: index
    }, "Pair ", index + 1);
  }))), /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Correct partner", /*#__PURE__*/React.createElement("input", {
    value: q.correctPartnerForWrong || '',
    onChange: function (event) {
      patch({
        correctPartnerForWrong: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2"
  })), /*#__PURE__*/React.createElement(AssessmentTextListEditor, {
    label: "Candidate partners",
    itemLabel: "candidate",
    values: q.candidatePartners || [],
    minimum: 2,
    onChange: function (values) {
      patch({
        candidatePartners: values
      });
    }
  }));
  return null;
}
function AssessmentItemEditor(p) {
  var q = p.q || {};
  var type = q.type || 'mcq';
  var action = p.onAction;
  function patch(values) {
    if (typeof action === 'function') action(p.questionIdx, 'patch', values);
  }
  var labels = {
    'multi-select': 'Multi-Select',
    'fill-blank': 'Fill-in-the-Blank',
    'short-answer': 'Brief Written Response',
    'self-explanation': 'Explain Your Reasoning',
    'sequence-sense': 'Sequence Sense',
    'relation-mismatch': 'Relation Mismatch',
    'answer-evidence': 'Answer + Evidence',
    'numeric-response': 'Numeric Response'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border-2 border-indigo-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 mb-2"
  }, labels[type] || type), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": "Edit question prompt",
    value: q.question || '',
    onChange: function (event) {
      patch({
        question: event.target.value
      });
    },
    rows: "2",
    className: "w-full text-sm font-semibold border-slate-300 rounded-md p-2 resize-y"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ml-9 space-y-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-700"
  }, "Concept label", /*#__PURE__*/React.createElement("input", {
    value: q.conceptLabel || '',
    onChange: function (event) {
      patch({
        conceptLabel: event.target.value
      });
    },
    className: "block w-full mt-1 text-xs border-slate-300 rounded-md p-2",
    placeholder: "e.g. fraction equivalents"
  })), /*#__PURE__*/React.createElement(AssessmentCoreFields, {
    q: q,
    patch: patch
  }), /*#__PURE__*/React.createElement(AssessmentDiagnosticFields, {
    q: q,
    patch: patch
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(AssessmentItemActions, {
    q: q,
    questionIdx: p.questionIdx,
    totalQuestions: p.totalQuestions,
    onAction: action,
    onRegenerate: p.onRegenerate,
    regenerating: p.regenerating
  })));
}
function AssessmentQualityPanel(p) {
  var audit = p.audit;
  var h5p = p.h5p || {
    total: 0,
    valid: 0,
    omitted: 0,
    adapted: 0,
    manualReview: 0,
    library: '',
    ready: false
  };
  var openState = React.useState(!audit.ready);
  var open = openState[0];
  var setOpen = openState[1];
  React.useEffect(function () {
    if (!audit.ready) setOpen(true);
  }, [audit.errorCount]);
  var mixKeys = Array.from(new Set(Object.keys(audit.requestedMix || {}).concat(Object.keys(audit.actualMix || {}))));
  return /*#__PURE__*/React.createElement("div", {
    className: 'rounded-xl border-2 mb-4 ' + (audit.ready ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'),
    role: "region",
    "aria-label": "Assessment quality review"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setOpen(!open);
    },
    "aria-expanded": open,
    className: "w-full p-3 flex items-center gap-3 text-left"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-xl"
  }, audit.ready ? '✓' : '⚠'), /*#__PURE__*/React.createElement("span", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'block text-sm font-black ' + (audit.ready ? 'text-emerald-900' : 'text-amber-900')
  }, audit.ready ? 'Ready to share' : 'Review before sharing'), /*#__PURE__*/React.createElement("span", {
    className: "block text-[11px] text-slate-700"
  }, audit.errorCount + ' required fix' + (audit.errorCount === 1 ? '' : 'es') + ' · ' + audit.warningCount + ' suggestion' + (audit.warningCount === 1 ? '' : 's') + ' · delivery preflight included')), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, open ? 'Hide' : 'Review')), open && /*#__PURE__*/React.createElement("div", {
    className: "px-3 pb-3 space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1"
  }, "Delivery preflight"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'rounded-lg border p-2 ' + (audit.ready ? 'bg-white border-emerald-200' : 'bg-rose-50 border-rose-200')
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-black uppercase text-slate-600"
  }, "In-app assessment"), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs font-bold mt-0.5 ' + (audit.ready ? 'text-emerald-800' : 'text-rose-800')
  }, audit.ready ? 'Answer keys and structure ready' : audit.errorCount + ' blocking fix' + (audit.errorCount === 1 ? '' : 'es'))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-sky-200 bg-white p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-black uppercase text-slate-600"
  }, "Live + presentation"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-sky-800 mt-0.5"
  }, audit.questions.length + ' item' + (audit.questions.length === 1 ? '' : 's') + ' available across supported formats')), /*#__PURE__*/React.createElement("div", {
    className: 'rounded-lg border p-2 ' + (h5p.omitted ? 'bg-amber-50 border-amber-300' : 'bg-white border-indigo-200')
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-black uppercase text-slate-600"
  }, "H5P export"), /*#__PURE__*/React.createElement("div", {
    className: 'text-xs font-bold mt-0.5 ' + (h5p.omitted ? 'text-amber-900' : 'text-indigo-800')
  }, h5p.valid + ' / ' + h5p.total + ' items · ' + h5p.library), h5p.adapted > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-600 mt-0.5"
  }, h5p.adapted + ' adapted' + (h5p.manualReview ? ' · ' + h5p.manualReview + ' ungraded/manual-review' : '')), h5p.omitted > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-semibold text-amber-800 mt-0.5"
  }, h5p.omitted + ' incomplete item' + (h5p.omitted === 1 ? '' : 's') + ' would be omitted')))), mixKeys.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1"
  }, "Requested vs generated"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 flex-wrap"
  }, mixKeys.map(function (key) {
    var requested = audit.requestedMix ? audit.requestedMix[key] || 0 : audit.actualMix[key] || 0;
    var actual = audit.actualMix[key] || 0;
    return /*#__PURE__*/React.createElement("span", {
      key: key,
      className: 'text-[10px] font-semibold px-2 py-1 rounded border ' + (requested === actual ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-amber-300 text-amber-900')
    }, key + ': ' + actual + ' / ' + requested);
  }))), audit.issues.length > 0 ? /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1.5"
  }, audit.issues.map(function (issue, index) {
    return /*#__PURE__*/React.createElement("li", {
      key: index,
      className: 'text-xs rounded-md border p-2 ' + (issue.severity === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-amber-200 text-amber-900')
    }, /*#__PURE__*/React.createElement("strong", null, issue.questionIdx === null ? 'Recipe' : 'Q' + (issue.questionIdx + 1), ":"), " ", ' ' + issue.message);
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-emerald-800"
  }, "All answer keys, required fields, counts, and structural checks passed."), audit.issues.length > 0 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onRepairAll,
    disabled: p.repairing || typeof p.onRepairAll !== 'function',
    className: "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
  }, p.repairing ? 'Repairing assessment…' : 'Fix flagged and missing items'), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-slate-600"
  }, "This automated check verifies structure, answer-key consistency, and delivery compatibility. H5P adaptations preserve the prompt and answer guide, but written responses, sequencing, and tolerance-based numeric items may require manual review after export. Teachers should still review content accuracy and instructional fit.")));
}
function FreeformItemsBlock(p) {
  var allQuestions = Array.isArray(p.questions) ? p.questions : [];
  var freeform = allQuestions.map(function (q, idx) {
    return {
      q: q,
      idx: idx
    };
  }).filter(function (entry) {
    if (typeof p.visibleQuestionIdx === 'number' && entry.idx !== p.visibleQuestionIdx) return false;
    return entry.q && (entry.q.type === 'multi-select' || entry.q.type === 'fill-blank' || entry.q.type === 'short-answer' || entry.q.type === 'self-explanation' || entry.q.type === 'sequence-sense' || entry.q.type === 'relation-mismatch' || entry.q.type === 'answer-evidence' || entry.q.type === 'numeric-response');
  });
  if (freeform.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 mt-6"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-slate-700 flex items-center gap-2 text-base"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "＋"), " Additional Assessment Items"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mb-2"
  }, p.isEditingQuiz ? 'Edit the prompt, answer key, rubric, and format-specific settings below.' : p.scoringPolicy && p.scoringPolicy.writtenResponseMode === 'teacher-review' ? 'Interactive formats are graded instantly. Written responses are submitted for teacher review.' : 'Interactive formats are graded instantly. Written responses receive provisional AI feedback.'), freeform.map(function (entry) {
    var card = null;
    if (p.isEditingQuiz) {
      card = /*#__PURE__*/React.createElement(AssessmentItemEditor, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        totalQuestions: allQuestions.length,
        onAction: p.onQuestionAction,
        onRegenerate: p.onRegenerateQuestion,
        regenerating: !!(p.regeneratingQuestions && p.regeneratingQuestions[entry.idx])
      });
    } else if (entry.q.type === 'multi-select') {
      card = /*#__PURE__*/React.createElement(MultiSelectCard, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        draftNamespace: p.draftNamespace,
        onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        modeStrategy: p.modeStrategy,
        scoringPolicy: p.scoringPolicy
      });
    } else if (entry.q.type === 'answer-evidence') {
      card = /*#__PURE__*/React.createElement(AnswerEvidenceCard, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        draftNamespace: p.draftNamespace,
        onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        modeStrategy: p.modeStrategy,
        scoringPolicy: p.scoringPolicy
      });
    } else if (entry.q.type === 'numeric-response') {
      card = /*#__PURE__*/React.createElement(NumericResponseCard, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        draftNamespace: p.draftNamespace,
        onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        modeStrategy: p.modeStrategy,
        scoringPolicy: p.scoringPolicy,
        allowDictation: p.allowDictation
      });
    } else if (entry.q.type === 'sequence-sense') {
      card = /*#__PURE__*/React.createElement(SequenceSenseCard, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        draftNamespace: p.draftNamespace,
        onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        modeStrategy: p.modeStrategy,
        scoringPolicy: p.scoringPolicy,
        callGemini: p.callGemini,
        callTTS: p.callTTS,
        gradeLevel: p.gradeLevel
      });
    } else if (entry.q.type === 'relation-mismatch') {
      card = /*#__PURE__*/React.createElement(RelationMismatchCard, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        draftNamespace: p.draftNamespace,
        onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        modeStrategy: p.modeStrategy,
        scoringPolicy: p.scoringPolicy,
        callGemini: p.callGemini,
        callTTS: p.callTTS,
        gradeLevel: p.gradeLevel
      });
    } else {
      card = /*#__PURE__*/React.createElement(FreeformItemCard, {
        q: entry.q,
        itemNumber: entry.idx + 1,
        questionIdx: entry.idx,
        draftNamespace: p.draftNamespace,
        callGemini: p.callGemini,
        callTTS: p.callTTS,
        gradeLevel: p.gradeLevel,
        QuizAIHelpers: p.QuizAIHelpers,
        modeStrategy: p.modeStrategy,
        scoringPolicy: p.scoringPolicy,
        onSubmitLiveAnswer: p.onSubmitLiveAnswer,
        allowDictation: p.allowDictation
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      key: entry.idx,
      id: 'assessment-question-' + entry.idx,
      className: "space-y-2 scroll-mt-24"
    }, !p.isEditingQuiz && p.allowFlagging && /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end"
    }, /*#__PURE__*/React.createElement(AssessmentQuestionFlagButton, {
      flagged: !!(p.flaggedQuestions && p.flaggedQuestions[entry.idx]),
      onToggle: function () {
        p.onToggleFlag(entry.idx);
      }
    })), card);
  }));
}
function FreeformItemCard(p) {
  var q = p.q;
  var modeStrat = p.modeStrategy || null;
  var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
  var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
  var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);
  var scoringPolicy = p.scoringPolicy || {
    partialCredit: true,
    writtenResponseMode: 'ai-provisional'
  };
  var teacherReviewWritten = scoringPolicy.writtenResponseMode === 'teacher-review' && (q.type === 'short-answer' || q.type === 'self-explanation');
  var draftItemKey = 'q-' + p.questionIdx;
  var responseState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'response', '');
  var response = responseState[0];
  var setResponse = responseState[1];
  var gradeState = React.useState({
    status: null,
    feedback: '',
    loading: false
  });
  var grade = gradeState[0];
  var setGrade = gradeState[1];
  var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
  var confidence = confidenceState[0];
  var setConfidence = confidenceState[1];
  var explainerState = React.useState({
    open: false,
    loading: false,
    text: '',
    error: ''
  });
  var explainer = explainerState[0];
  var setExplainer = explainerState[1];
  function emitLiveAnswer(extraConfidence) {
    if (typeof p.onSubmitLiveAnswer !== 'function' || typeof p.questionIdx !== 'number') return;
    try {
      p.onSubmitLiveAnswer({
        questionIdx: p.questionIdx,
        itemType: q.type || 'short-answer',
        conceptLabel: q && q.conceptLabel || '',
        answer: {
          text: response
        },
        confidence: typeof extraConfidence !== 'undefined' ? extraConfidence : confidence || null,
        timestamp: Date.now()
      });
    } catch (e) {}
  }
  function submitGrade() {
    if (!response || !response.trim()) return;
    emitLiveAnswer();
    if (teacherReviewWritten) {
      setGrade({
        status: 'submitted',
        feedback: 'Your response was submitted for teacher review. No automatic correctness judgment was applied.',
        loading: false
      });
      return;
    }
    if (!p.QuizAIHelpers) {
      setGrade({
        status: 'error',
        feedback: 'Grader unavailable: QuizAIHelpers not loaded.',
        loading: false
      });
      return;
    }
    setGrade({
      status: null,
      feedback: '',
      loading: true
    });
    var graderArgs = {
      callGemini: p.callGemini,
      gradeLevel: p.gradeLevel
    };
    var promise;
    if (q.type === 'fill-blank') {
      graderArgs.contextSentence = q.question;
      graderArgs.expectedFill = q.expectedFill || '';
      graderArgs.acceptableAlternatives = q.acceptableAlternatives || [];
      graderArgs.studentFill = response;
      promise = p.QuizAIHelpers.gradeFillBlank(graderArgs);
    } else if (q.type === 'self-explanation') {
      graderArgs.question = 'EXPLAIN IN YOUR OWN WORDS: ' + (q.question || '');
      graderArgs.expectedAnswer = q.rubric || q.expectedAnswer || 'Student demonstrates understanding of the concept in their own words, including key terms and relationships. Avoid grading on memorization of specific phrasing — reward genuine understanding.';
      graderArgs.studentResponse = response;
      promise = p.QuizAIHelpers.gradeFreeformAnswer(graderArgs);
    } else {
      graderArgs.question = q.question;
      graderArgs.expectedAnswer = q.expectedAnswer || '';
      graderArgs.studentResponse = response;
      promise = p.QuizAIHelpers.gradeFreeformAnswer(graderArgs);
    }
    Promise.resolve(promise).then(function (result) {
      setGrade({
        status: result.status || 'unclear',
        feedback: result.feedback || '',
        loading: false
      });
    }).catch(function (err) {
      setGrade({
        status: 'error',
        feedback: err && err.message ? err.message : 'Grader failed.',
        loading: false
      });
    });
  }
  function markIDK() {
    setGrade({
      status: 'idk',
      feedback: 'No worries — here\'s a quick explanation.',
      loading: false
    });
    requestExplainer();
  }
  function requestExplainer() {
    if (typeof p.callGemini !== 'function') {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: 'Explainer unavailable: callGemini not provided.'
      });
      return;
    }
    setExplainer({
      open: true,
      loading: true,
      text: '',
      error: ''
    });
    var grade = p.gradeLevel || 'middle school';
    var conceptHint = q.type === 'fill-blank' ? q.expectedFill || q.question || '' : q.type === 'self-explanation' ? q.question || '' : q.question || '';
    var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept so they can answer the question. Concept or question: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
    Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
      var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
      setExplainer({
        open: true,
        loading: false,
        text: txt.trim(),
        error: ''
      });
    }).catch(function (err) {
      setExplainer({
        open: true,
        loading: false,
        text: '',
        error: err && err.message ? err.message : 'Explainer failed.'
      });
    });
  }
  var statusColor = grade.status === 'correct' ? 'emerald' : grade.status === 'partially-correct' ? 'amber' : grade.status === 'submitted' ? 'indigo' : grade.status === 'incorrect' ? 'rose' : grade.status === 'error' ? 'rose' : grade.status === 'idk' ? 'sky' : 'slate';
  var statusLabel = grade.status === 'correct' ? 'Correct' : grade.status === 'partially-correct' ? 'Close' : grade.status === 'submitted' ? 'Submitted for review' : grade.status === 'incorrect' ? 'Not yet' : grade.status === 'unclear' ? 'Unclear' : grade.status === 'error' ? 'Error' : grade.status === 'idk' ? 'Marked I do not know' : '';
  var typeLabel = q.type === 'fill-blank' ? 'Fill-in-the-blank' : q.type === 'self-explanation' ? 'Explain your reasoning' : 'Brief written response';
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-5 rounded-xl border border-slate-300 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5"
  }, p.itemNumber), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1"
  }, typeLabel), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, q.question || ''))), q.type === 'fill-blank' ? /*#__PURE__*/React.createElement("input", {
    "aria-label": t("a11y.fill_in_blank"),
    type: "text",
    value: response,
    onChange: function (ev) {
      setResponse(ev.target.value);
    },
    onKeyDown: function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        submitGrade();
      }
    },
    placeholder: t("placeholders.missing_word_or_phrase"),
    disabled: grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted',
    className: "w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50"
  }) : /*#__PURE__*/React.createElement("textarea", {
    "aria-label": typeLabel + " response",
    value: response,
    onChange: function (ev) {
      setResponse(ev.target.value);
    },
    placeholder: q.type === 'self-explanation' ? 'Explain the concept in your own words (3-5 sentences)...' : 'Type your 1-2 sentence response...',
    disabled: grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted',
    rows: q.type === 'self-explanation' ? 5 : 3,
    className: "w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 resize-y"
  }), /*#__PURE__*/React.createElement(QuizVoiceInputButton, {
    value: response,
    onChange: setResponse,
    disabled: grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted',
    allowDictation: p.allowDictation,
    label: "Dictate written response"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mt-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: submitGrade,
    disabled: !response.trim() || grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted',
    className: "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
  }, grade.loading ? 'Grading…' : grade.status === 'submitted' ? 'Submitted' : grade.status === 'correct' || grade.status === 'idk' ? '' : grade.status ? 'Re-check' : teacherReviewWritten ? 'Submit response' : 'Grade my answer'), allowIDK && !grade.status && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: markIDK,
    className: "px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none",
    "aria-label": "I don't know — skip without penalty",
    title: t("tooltips.skip_ai_explain_concept")
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🤔 "), t("ui_common.i_dont_know"))), grade.status && grade.status !== 'correct' && grade.status !== 'idk' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setGrade({
        status: null,
        feedback: '',
        loading: false
      });
      if (grade.status !== 'submitted') setResponse('');
      setExplainer({
        open: false,
        loading: false,
        text: '',
        error: ''
      });
    },
    className: "px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors motion-reduce:transition-none"
  }, grade.status === 'submitted' ? 'Revise response' : t("ui_common.try_again"))), grade.status && /*#__PURE__*/React.createElement("div", {
    className: 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300',
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'
  }, statusLabel), aiExplainerEnabled && grade.status !== 'correct' && grade.status !== 'idk' && !explainer.open && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: requestExplainer,
    className: "ml-auto text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors motion-reduce:transition-none",
    title: t("tooltips.quick_ai_explanation")
  }, "🤖 Explain this")), grade.feedback && /*#__PURE__*/React.createElement("p", {
    className: 'text-sm text-' + statusColor + '-900 mb-2'
  }, grade.feedback), explainer.open && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 p-3 bg-white border border-indigo-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
  }, "🤖 Quick explanation"), explainer.loading && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-700 italic"
  }, "Generating explanation…"), explainer.text && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, explainer.text), explainer.error && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-rose-700"
  }, explainer.error), explainer.text && typeof p.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);else p.callTTS(explainer.text);
    },
    className: "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900",
    "aria-label": t("a11y.read_aloud")
  }, "🔊 Read aloud"))), allowConfidence && grade.status && grade.status !== 'idk' && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap text-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600 font-semibold"
  }, "How sure were you?"), ['knew', 'guessed', 'no-idea'].map(function (lvl) {
    var labels = {
      knew: 'I knew this',
      guessed: 'I guessed',
      'no-idea': 'No idea'
    };
    var active = confidence === lvl;
    return /*#__PURE__*/React.createElement("button", {
      key: lvl,
      type: "button",
      onClick: function () {
        setConfidence(lvl);
        emitLiveAnswer(lvl);
      },
      className: 'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
    }, labels[lvl]);
  })));
}
function _quizPresentationTypeLabel(type) {
  var labels = {
    'multi-select': 'Select all that apply',
    'fill-blank': 'Fill in the blank',
    'short-answer': 'Short answer',
    'self-explanation': 'Explain your thinking',
    'sequence-sense': 'Sequence sense',
    'relation-mismatch': 'Find the mismatch',
    'answer-evidence': 'Answer + evidence',
    'numeric-response': 'Numeric response'
  };
  return labels[type] || 'Assessment item';
}
function AssessmentPresentationItem(p) {
  var q = p.q || {};
  var type = q.type || 'short-answer';
  var showAnswer = !!p.showAnswer;
  var renderText = typeof p.formatInlineText === 'function' ? function (value) {
    return p.formatInlineText(String(value || ''), false);
  } : function (value) {
    return String(value || '');
  };
  var body = null;
  var answerGuide = null;
  if (type === 'multi-select') {
    var correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
    body = /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-4"
    }, (q.options || []).map(function (option, index) {
      var correct = correctAnswers.indexOf(option) !== -1;
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        className: 'p-5 rounded-xl border-2 text-lg font-semibold flex gap-3 ' + (showAnswer && correct ? 'bg-green-50 border-green-500 text-green-900' : showAnswer ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-slate-300 text-slate-800')
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-7 h-7 rounded border-2 border-current flex items-center justify-center shrink-0"
      }, showAnswer && correct ? '✓' : ''), renderText(option));
    }));
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Correct selections: "), correctAnswers.join('; '));
  } else if (type === 'fill-blank') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "p-6 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 text-2xl text-center"
    }, renderText(q.question || ''));
    var alternatives = Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives.filter(Boolean) : [];
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Expected fill: "), q.expectedFill || 'Teacher review', alternatives.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-sm"
    }, "Also accept: ", alternatives.join(', ')));
  } else if (type === 'short-answer') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "h-36 rounded-xl border-2 border-slate-200 bg-[repeating-linear-gradient(to_bottom,white,white_34px,#cbd5e1_35px)]",
      "aria-label": "Short-answer response space"
    });
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Expected answer: "), q.expectedAnswer || q.sampleAnswer || 'Teacher review');
  } else if (type === 'self-explanation') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "h-48 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-5 text-slate-500"
    }, "Explain the idea in your own words. Include how or why it works.");
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Success criteria: "), q.rubric || q.expectedAnswer || 'Use accurate reasoning, relevant details, and a clear connection to the concept.');
  } else if (type === 'sequence-sense') {
    var items = Array.isArray(q.items) ? q.items : [];
    var presented = Array.isArray(q.presentedOrder) && q.presentedOrder.length ? q.presentedOrder.map(function (item) {
      return typeof item === 'number' ? items[item] : item;
    }) : items;
    body = /*#__PURE__*/React.createElement("ol", {
      className: "space-y-3"
    }, presented.map(function (item, index) {
      return /*#__PURE__*/React.createElement("li", {
        key: index,
        className: "p-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-lg flex gap-3"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-black text-indigo-700"
      }, index + 1), renderText(item));
    }));
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Correct order: "), items.join(' → ')), q.orderingPrinciple && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-sm"
    }, "Ordering principle: ", q.orderingPrinciple));
  } else if (type === 'relation-mismatch') {
    var pairs = Array.isArray(q.pairs) ? q.pairs : [];
    body = /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 md:grid-cols-2 gap-3"
    }, pairs.map(function (pair, index) {
      var mismatch = index === q.wrongPairIndex;
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        className: 'p-4 rounded-xl border-2 text-lg ' + (showAnswer && mismatch ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-200')
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-bold"
      }, renderText(pair.left)), /*#__PURE__*/React.createElement("span", {
        className: "mx-2",
        "aria-hidden": "true"
      }, "↔"), renderText(pair.right), showAnswer && mismatch && /*#__PURE__*/React.createElement("span", {
        className: "ml-2 text-rose-700 font-bold"
      }, "Mismatch"));
    }));
    var wrongPair = pairs[q.wrongPairIndex] || {};
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Fix the mismatch: "), wrongPair.left ? wrongPair.left + ' → ' : '', q.correctPartnerForWrong || 'Teacher review');
  } else if (type === 'answer-evidence') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 lg:grid-cols-2 gap-5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "Part 1 - answer options"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, (q.answerOptions || []).map(function (option, index) {
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        className: 'p-3 rounded-lg border-2 ' + (showAnswer && option === q.correctAnswer ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')
      }, renderText(option));
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
      className: "font-bold text-slate-700 mb-2"
    }, "Part 2 - supporting evidence"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, (q.evidenceOptions || []).map(function (option, index) {
      return /*#__PURE__*/React.createElement("div", {
        key: index,
        className: 'p-3 rounded-lg border-2 ' + (showAnswer && option === q.correctEvidence ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')
      }, renderText(option));
    }))));
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Answer: "), q.correctAnswer || 'Teacher review'), /*#__PURE__*/React.createElement("div", {
      className: "mt-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Evidence: "), q.correctEvidence || 'Teacher review'));
  } else if (type === 'numeric-response') {
    body = /*#__PURE__*/React.createElement("div", {
      className: "p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-end gap-3 justify-center"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-3xl tracking-widest text-slate-400"
    }, "____________"), q.unit && /*#__PURE__*/React.createElement("span", {
      className: "text-2xl font-bold text-slate-700"
    }, q.unit));
    answerGuide = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, "Expected value: "), String(q.correctValue ?? 'Teacher review'), q.unit ? ' ' + q.unit : '', Number(q.tolerance) > 0 ? ' (±' + q.tolerance + ')' : '');
  } else {
    body = /*#__PURE__*/React.createElement("div", {
      className: "h-36 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50",
      "aria-label": "Response space"
    });
    answerGuide = /*#__PURE__*/React.createElement("div", null, "Teacher review");
  }
  return /*#__PURE__*/React.createElement("div", {
    "data-presentation-question-type": type,
    className: "bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm"
  }, p.index + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs uppercase tracking-wider font-black text-teal-800 mb-1"
  }, _quizPresentationTypeLabel(type)), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-slate-800 leading-tight"
  }, renderText(q.question || '')), q.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-lg text-slate-600 italic mt-2"
  }, renderText(q.question_en)))), /*#__PURE__*/React.createElement("div", {
    className: "ml-0 md:ml-14"
  }, body, /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4"
  }, q.factCheck && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onToggleExplanation,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-400 text-slate-700"
  }, p.showExplanation ? 'Hide explanation' : 'Show explanation'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.onToggleAnswer,
    "aria-expanded": showAnswer,
    className: 'text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 ' + (showAnswer ? 'bg-slate-200 text-slate-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100')
  }, showAnswer ? /*#__PURE__*/React.createElement(Eye, {
    size: 14
  }) : /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14
  }), showAnswer ? 'Hide answer guide' : 'Reveal answer guide')), showAnswer && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-950",
    role: "status"
  }, answerGuide), p.showExplanation && q.factCheck && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-slate-700"
  }, typeof p.renderFormattedText === 'function' ? p.renderFormattedText(q.factCheck) : q.factCheck)));
}
function QuizView(props) {
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var isParentMode = props.isParentMode;
  var isIndependentMode = props.isIndependentMode;
  var allowDictation = isTeacherMode || !(props.studentProjectSettings && props.studentProjectSettings.allowDictation === false);
  var activeSessionCode = props.activeSessionCode;
  var sessionData = props.sessionData;
  var onSubmitLiveAnswer = activeSessionCode && typeof props.onSubmitLiveAnswer === 'function' ? props.onSubmitLiveAnswer : null;
  var assessmentData = props.generatedContent && props.generatedContent.data || {};
  var scoringPolicy = Object.assign({
    partialCredit: true,
    writtenResponseMode: 'ai-provisional'
  }, assessmentData.scoringPolicy || {});
  var deliverySettings = _quizNormalizeDeliverySettings(assessmentData.deliverySettings);
  var assessmentAudit = _quizAuditAssessment(assessmentData);
  var assessmentH5PPreflight = _quizH5PPreflight(assessmentData);
  var learnerBaseDraftNamespace = !isTeacherMode && !isParentMode ? _quizDraftNamespace(assessmentData, activeSessionCode) : '';
  var attemptReceiptState = React.useState(function () {
    return learnerBaseDraftNamespace ? _quizReadAttemptReceipt(learnerBaseDraftNamespace) : null;
  });
  var attemptReceipt = attemptReceiptState[0];
  var setAttemptReceipt = attemptReceiptState[1];
  var draftNamespace = learnerBaseDraftNamespace && !attemptReceipt ? learnerBaseDraftNamespace : '';
  var regeneratingState = React.useState({});
  var regeneratingQuestions = regeneratingState[0];
  var setRegeneratingQuestions = regeneratingState[1];
  var repairingState = React.useState(false);
  var repairingAssessment = repairingState[0];
  var setRepairingAssessment = repairingState[1];
  async function regenerateAssessmentQuestion(questionIdx, question) {
    if (typeof props.callGemini !== 'function' || typeof props.handleQuizQuestionAction !== 'function' || !question) return;
    setRegeneratingQuestions(function (previous) {
      var next = Object.assign({}, previous);
      next[questionIdx] = true;
      return next;
    });
    try {
      var type = question.type || 'mcq';
      var sourceExcerpt = String(props.inputText || '').slice(0, 5000);
      var prompt = 'Rewrite one assessment item while preserving its learning target and item type. Improve clarity, answer-key validity, and grade-level fit. Return ONLY valid JSON using this schema: ' + _quizSchemaForType(type) + '. The type must remain "' + type + '". Existing item: ' + JSON.stringify(question) + '. Source context: ' + sourceExcerpt;
      var raw = await props.callGemini(prompt, true);
      var parsed = _quizExtractJson(raw);
      var replacement = parsed && parsed.question && typeof parsed.question === 'object' ? parsed.question : parsed;
      if (!replacement || typeof replacement !== 'object') throw new Error('The AI did not return a valid question.');
      replacement.type = type;
      props.handleQuizQuestionAction(questionIdx, 'replace', replacement);
      if (typeof props.addToast === 'function') props.addToast('Question ' + (questionIdx + 1) + ' regenerated. Review it before sharing.', 'success');
    } catch (error) {
      if (typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : 'Question regeneration failed.', 'error');
    } finally {
      setRegeneratingQuestions(function (previous) {
        var next = Object.assign({}, previous);
        delete next[questionIdx];
        return next;
      });
    }
  }
  async function repairAssessmentQuality() {
    if (typeof props.callGemini !== 'function' || typeof props.handleQuizQuestionAction !== 'function') return;
    setRepairingAssessment(true);
    try {
      var requestedMix = assessmentAudit.requestedMix || assessmentAudit.actualMix;
      var requestedSchemas = Object.keys(requestedMix || {}).filter(function (type) {
        return Number(requestedMix[type]) > 0;
      }).map(function (type) {
        return type + ' x' + requestedMix[type] + ': ' + _quizSchemaForType(type);
      }).join('\n');
      var issueText = assessmentAudit.issues.map(function (issue) {
        return (issue.questionIdx === null ? 'Recipe' : 'Q' + (issue.questionIdx + 1)) + ': ' + issue.message;
      }).join('\n');
      var prompt = 'Repair this complete assessment. Preserve strong questions when possible, replace invalid ones, add missing item types, and return the exact requested recipe. Return ONLY JSON in the shape {"questions":[...]}. Every question needs a short lowercase conceptLabel. Requested recipe and schemas:\n' + requestedSchemas + '\nFlagged issues:\n' + issueText + '\nCurrent questions:\n' + JSON.stringify(assessmentAudit.questions) + '\nSource context:\n' + String(props.inputText || '').slice(0, 6000);
      var raw = await props.callGemini(prompt, true);
      var parsed = _quizExtractJson(raw);
      var questions = parsed && Array.isArray(parsed.questions) ? parsed.questions : null;
      if (!questions || questions.length === 0) throw new Error('The AI did not return a repaired assessment.');
      props.handleQuizQuestionAction(0, 'replace-all', {
        questions: questions
      });
      if (typeof props.addToast === 'function') props.addToast('Assessment repaired. Review the quality panel before sharing.', 'success');
    } catch (error) {
      if (typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : 'Assessment repair failed.', 'error');
    } finally {
      setRepairingAssessment(false);
    }
  }
  var attemptMetaState = _quizUseDraftField(draftNamespace, 'root', 'attemptMeta', function () {
    return {
      attemptId: 'attempt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      startedAt: Date.now(),
      status: 'in-progress'
    };
  });
  var attemptMeta = attemptMetaState[0];
  var flaggedState = _quizUseDraftField(draftNamespace, 'root', 'flaggedQuestions', {});
  var flaggedQuestions = flaggedState[0];
  var setFlaggedQuestions = flaggedState[1];
  var reviewOpenState = React.useState(false);
  var reviewOpen = reviewOpenState[0];
  var setReviewOpen = reviewOpenState[1];
  var currentQuestionState = React.useState(0);
  var currentQuestionIdx = currentQuestionState[0];
  var setCurrentQuestionIdx = currentQuestionState[1];
  var initialTimeSeconds = deliverySettings.timeLimitMinutes > 0 ? Math.round(deliverySettings.timeLimitMinutes * 60) : 0;
  var timerStateHook = _quizUseDraftField(draftNamespace, 'root', 'timerState', function () {
    return {
      remainingSeconds: initialTimeSeconds,
      running: initialTimeSeconds > 0,
      deadlineAt: initialTimeSeconds > 0 ? Date.now() + initialTimeSeconds * 1000 : 0,
      expired: false
    };
  });
  var assessmentTimer = timerStateHook[0] || {
    remainingSeconds: 0,
    running: false,
    deadlineAt: 0,
    expired: false
  };
  var setAssessmentTimer = timerStateHook[1];
  React.useEffect(function () {
    if (!draftNamespace || !attemptMeta || !attemptMeta.attemptId) return;
    _quizWriteDraftField(draftNamespace, 'root', 'attemptMeta', attemptMeta);
  }, [draftNamespace, attemptMeta && attemptMeta.attemptId]);
  React.useEffect(function () {
    if (!draftNamespace || !assessmentTimer.running || !assessmentTimer.deadlineAt || assessmentTimer.expired) return;
    var tick = function () {
      setAssessmentTimer(function (previous) {
        if (!previous || !previous.running || previous.expired) return previous;
        var remaining = Math.max(0, Math.ceil((Number(previous.deadlineAt) - Date.now()) / 1000));
        if (remaining <= 0) return Object.assign({}, previous, {
          remainingSeconds: 0,
          running: false,
          expired: true
        });
        if (remaining === previous.remainingSeconds) return previous;
        return Object.assign({}, previous, {
          remainingSeconds: remaining
        });
      });
    };
    tick();
    var interval = window.setInterval(tick, 1000);
    return function () {
      window.clearInterval(interval);
    };
  }, [draftNamespace, assessmentTimer.running, assessmentTimer.deadlineAt, assessmentTimer.expired]);
  React.useEffect(function () {
    if (draftNamespace && assessmentTimer.expired) setReviewOpen(true);
  }, [draftNamespace, assessmentTimer.expired]);
  function toggleQuestionFlag(questionIdx) {
    setFlaggedQuestions(function (previous) {
      var next = Object.assign({}, previous || {});
      if (next[questionIdx]) delete next[questionIdx];else next[questionIdx] = true;
      return next;
    });
  }
  function goToAssessmentQuestion(questionIdx) {
    var total = Array.isArray(assessmentData.questions) ? assessmentData.questions.length : 0;
    var next = Math.max(0, Math.min(Math.max(0, total - 1), Number(questionIdx) || 0));
    setCurrentQuestionIdx(next);
    setReviewOpen(false);
    window.setTimeout(function () {
      try {
        var node = document.getElementById('assessment-question-' + next);
        if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      } catch (e) {}
    }, 0);
  }
  function toggleAssessmentTimer() {
    setAssessmentTimer(function (previous) {
      if (!previous || previous.expired) return previous;
      if (previous.running) {
        var remaining = Math.max(0, Math.ceil((Number(previous.deadlineAt) - Date.now()) / 1000));
        return Object.assign({}, previous, {
          remainingSeconds: remaining,
          running: false,
          deadlineAt: 0
        });
      }
      var seconds = Math.max(1, Number(previous.remainingSeconds) || initialTimeSeconds || 1);
      return Object.assign({}, previous, {
        remainingSeconds: seconds,
        running: true,
        deadlineAt: Date.now() + seconds * 1000
      });
    });
  }
  function extendAssessmentTimer() {
    var extensionSeconds = deliverySettings.extensionMinutes * 60;
    setAssessmentTimer(function (previous) {
      var current = previous || {
        remainingSeconds: 0,
        running: false,
        deadlineAt: 0,
        expired: false
      };
      var remaining = current.running && current.deadlineAt ? Math.max(0, Math.ceil((Number(current.deadlineAt) - Date.now()) / 1000)) : Math.max(0, Number(current.remainingSeconds) || 0);
      var nextRemaining = remaining + extensionSeconds;
      return Object.assign({}, current, {
        remainingSeconds: nextRemaining,
        running: true,
        deadlineAt: Date.now() + nextRemaining * 1000,
        expired: false
      });
    });
  }
  function updateAssessmentDelivery(nextSettings) {
    if (typeof props.handleQuizQuestionAction === 'function') props.handleQuizQuestionAction(0, 'patch-assessment', {
      deliverySettings: nextSettings
    });
  }
  function submitAssessmentAttempt() {
    if (!draftNamespace) return;
    var working = _quizReadWorkingDraft(draftNamespace);
    var progress = _quizBuildAttemptProgress(assessmentData, working);
    var submittedAt = Date.now();
    var receipt = _quizFinalizeAttempt(draftNamespace, {
      attemptId: attemptMeta && attemptMeta.attemptId || 'attempt-' + submittedAt.toString(36),
      startedAt: attemptMeta && attemptMeta.startedAt || submittedAt,
      submittedAt: submittedAt,
      summary: {
        total: progress.total,
        answered: progress.answered,
        unanswered: progress.unanswered,
        flagged: progress.flagged
      },
      responses: working.items
    });
    if (!receipt) {
      if (typeof props.addToast === 'function') props.addToast('Could not save the completion receipt. Your draft is still safe—please try again.', 'error');
      return;
    }
    if (typeof onSubmitLiveAnswer === 'function') {
      try {
        onSubmitLiveAnswer({
          questionIdx: progress.total,
          itemType: 'assessment-complete',
          conceptLabel: '',
          answer: {
            attemptId: receipt.attemptId,
            answered: progress.answered,
            total: progress.total,
            submittedAt: submittedAt
          },
          timestamp: submittedAt
        });
      } catch (e) {}
    }
    setReviewOpen(false);
    setAttemptReceipt(receipt);
    if (typeof props.addToast === 'function') props.addToast('Assessment submitted.', 'success');
  }
  function startAnotherAssessmentAttempt() {
    if (!_quizClearAttemptReceipt(learnerBaseDraftNamespace)) return;
    setAttemptReceipt(null);
    try {
      window.location.reload();
    } catch (e) {}
  }
  var mcqAnswersState = _quizUseDraftField(draftNamespace, 'root', 'mcqAnswers', {});
  var studentMcqAnswers = mcqAnswersState[0];
  var setStudentMcqAnswers = mcqAnswersState[1];
  var mcqConfidenceState = _quizUseDraftField(draftNamespace, 'root', 'mcqConfidence', {});
  var studentMcqConfidence = mcqConfidenceState[0];
  var setStudentMcqConfidence = mcqConfidenceState[1];
  function selectMcqOption(qIdx, optIdx, optText, q) {
    setStudentMcqAnswers(function (prev) {
      var next = Object.assign({}, prev);
      next[qIdx] = optIdx;
      return next;
    });
    if (typeof onSubmitLiveAnswer === 'function') {
      try {
        onSubmitLiveAnswer({
          questionIdx: qIdx,
          itemType: 'mcq',
          conceptLabel: q && q.conceptLabel || '',
          answer: {
            optionIdx: optIdx,
            optionText: optText
          },
          confidence: studentMcqConfidence[qIdx] || null,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }
  function setMcqConfidence(qIdx, confidenceValue, q) {
    setStudentMcqConfidence(function (prev) {
      var next = Object.assign({}, prev);
      next[qIdx] = confidenceValue;
      return next;
    });
    var prevOptIdx = studentMcqAnswers[qIdx];
    if (typeof prevOptIdx !== 'number' || typeof onSubmitLiveAnswer !== 'function') return;
    try {
      onSubmitLiveAnswer({
        questionIdx: qIdx,
        itemType: 'mcq',
        conceptLabel: q && q.conceptLabel || '',
        answer: {
          optionIdx: prevOptIdx,
          optionText: q.options[prevOptIdx]
        },
        confidence: confidenceValue,
        timestamp: Date.now()
      });
    } catch (e) {}
  }
  var reflectionAnswersState = _quizUseDraftField(draftNamespace, 'root', 'reflectionAnswers', {});
  var reflectionAnswers = reflectionAnswersState[0];
  var setReflectionAnswers = reflectionAnswersState[1];
  function setReflectionDraft(rIdx, text) {
    setReflectionAnswers(function (prev) {
      var next = Object.assign({}, prev);
      next[rIdx] = Object.assign({}, next[rIdx] || {}, {
        draft: text
      });
      return next;
    });
  }
  function submitReflection(rIdx) {
    var entry = reflectionAnswers[rIdx] || {};
    var text = (entry.draft || '').trim();
    if (!text) return;
    setReflectionAnswers(function (prev) {
      var next = Object.assign({}, prev);
      next[rIdx] = {
        draft: text,
        submitted: true,
        submittedText: text
      };
      return next;
    });
    if (typeof onSubmitLiveAnswer !== 'function') return;
    try {
      onSubmitLiveAnswer({
        questionIdx: 'r' + rIdx,
        itemType: 'reflection',
        conceptLabel: '',
        answer: {
          text: text
        },
        timestamp: Date.now()
      });
    } catch (e) {}
  }
  function reopenReflection(rIdx) {
    setReflectionAnswers(function (prev) {
      var next = Object.assign({}, prev);
      next[rIdx] = Object.assign({}, next[rIdx] || {}, {
        submitted: false
      });
      return next;
    });
  }
  var quizImageRefineInputsState = React.useState({});
  var quizImageRefineInputs = quizImageRefineInputsState[0];
  var setQuizImageRefineInputs = quizImageRefineInputsState[1];
  var isRefiningQuizImageState = React.useState({});
  var isRefiningQuizImage = isRefiningQuizImageState[0];
  var setIsRefiningQuizImage = isRefiningQuizImageState[1];
  var refineOpenState = React.useState({});
  var refineOpen = refineOpenState[0];
  var setRefineOpen = refineOpenState[1];
  function refineKey(qIdx, target, optIdx) {
    return target === 'question' ? qIdx + ':question' : qIdx + ':o' + optIdx;
  }
  function toggleRefinePanel(key) {
    setRefineOpen(function (prev) {
      var next = Object.assign({}, prev);
      if (next[key]) delete next[key];else next[key] = true;
      return next;
    });
  }
  async function refineQuizImage(qIdx, target, optIdx, instructionOverride) {
    var key = refineKey(qIdx, target, optIdx);
    var instruction = typeof instructionOverride === 'string' ? instructionOverride : (quizImageRefineInputs[key] || '').trim();
    if (!instruction) return;
    var q = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
    if (!q) return;
    var currentUrl = target === 'question' ? q.imageUrl : Array.isArray(q.optionImageUrls) ? q.optionImageUrls[optIdx] : null;
    if (!currentUrl || typeof currentUrl !== 'string' || currentUrl.indexOf(',') === -1) {
      if (typeof addToast === 'function') addToast(t('toasts.image_refine_yet'), 'error');
      return;
    }
    if (typeof callGeminiImageEdit !== 'function') {
      if (typeof addToast === 'function') addToast(t('toasts.image_edit_unavailable_callgeminiimageedit_provide'), 'error');
      return;
    }
    setIsRefiningQuizImage(function (prev) {
      var next = Object.assign({}, prev);
      next[key] = true;
      return next;
    });
    try {
      var rawBase64 = currentUrl.split(',')[1];
      var grade = props.gradeLevel || 'middle school';
      var styleHint = generatedContent && generatedContent.data && generatedContent.data.imageStyle || '';
      var styleClause = styleHint ? ' Required visual style: ' + styleHint + '.' : '';
      var prompt = 'Edit this educational quiz illustration. Maintain the same general visual style (colors, line weight, complexity).' + styleClause + ' Audience: ' + grade + ' level students. Edit instruction: "' + instruction + '"';
      var refinedUrl = await callGeminiImageEdit(prompt, rawBase64);
      if (typeof handleQuizImageRefine === 'function') {
        handleQuizImageRefine(qIdx, target, optIdx, refinedUrl);
      }
      setQuizImageRefineInputs(function (prev) {
        var next = Object.assign({}, prev);
        delete next[key];
        return next;
      });
      setRefineOpen(function (prev) {
        var next = Object.assign({}, prev);
        delete next[key];
        return next;
      });
      if (typeof addToast === 'function') addToast(t('toasts.image_refined'), 'success');
    } catch (err) {
      if (typeof addToast === 'function') addToast(err && err.message || 'Refine failed — try again.', 'error');
    } finally {
      setIsRefiningQuizImage(function (prev) {
        var next = Object.assign({}, prev);
        delete next[key];
        return next;
      });
    }
  }
  var isImprovingDistractorState = React.useState({});
  var isImprovingDistractor = isImprovingDistractorState[0];
  var setIsImprovingDistractor = isImprovingDistractorState[1];
  async function improveDistractor(qIdx, optIdx, currentDistractor, weakReason) {
    var key = qIdx + ':' + optIdx;
    if (isImprovingDistractor[key]) return;
    if (typeof props.callGemini !== 'function' || typeof handleQuizChange !== 'function') return;
    var q = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
    if (!q) return;
    setIsImprovingDistractor(function (prev) {
      var next = Object.assign({}, prev);
      next[key] = true;
      return next;
    });
    try {
      var grade = props.gradeLevel || 'middle school';
      var prompt = 'You are an assessment-design expert. Rewrite a single MCQ distractor to encode a REAL common student misconception (a predictable error students at the ' + grade + ' level make in their thinking).\n\n' + 'QUESTION: "' + (q.question || '') + '"\n' + 'CORRECT ANSWER: "' + (q.correctAnswer || '') + '"\n' + 'CURRENT WEAK DISTRACTOR: "' + currentDistractor + '"\n' + 'WHY IT IS WEAK: "' + (weakReason || 'does not encode a specific misconception') + '"\n\n' + 'Return ONLY the rewritten distractor text — a single short phrase or sentence at most ~15 words. No quotes, no labels, no explanation, no JSON. Just the new distractor text on a single line.';
      var raw = await props.callGemini(prompt, false);
      var newText = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
      newText = newText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Distractor:\s*/i, '').trim();
      if (!newText) throw new Error('Empty rewrite');
      handleQuizChange(qIdx, 'option', newText, optIdx);
      if (typeof addToast === 'function') addToast(t('toasts.distractor_rewritten'), 'success');
    } catch (err) {
      if (typeof addToast === 'function') addToast(err && err.message || 'Rewrite failed.', 'error');
    } finally {
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        delete next[key];
        return next;
      });
    }
  }
  var isBulkImprovingState = React.useState(false);
  var isBulkImproving = isBulkImprovingState[0];
  var setIsBulkImproving = isBulkImprovingState[1];
  async function bulkImproveDistractors() {
    if (isBulkImproving) return;
    if (!generatedContent || !generatedContent.data || !Array.isArray(generatedContent.data.questions)) return;
    if (typeof props.callGemini !== 'function' || typeof handleQuizBulkOptionChange !== 'function') {
      if (typeof addToast === 'function') addToast(t('toasts.bulk_improve_unavailable'), 'error');
      return;
    }
    var tasks = [];
    generatedContent.data.questions.forEach(function (q, qIdx) {
      if (!q || q.type && q.type !== 'mcq') return;
      if (!Array.isArray(q.distractorQuality) || !Array.isArray(q.options)) return;
      q.distractorQuality.forEach(function (dq) {
        if (!dq || dq.encodesMisconception !== false) return;
        var optIdx = q.options.indexOf(dq.distractor);
        if (optIdx < 0) return;
        if (q.options[optIdx] === q.correctAnswer) return;
        tasks.push({
          qIdx: qIdx,
          optIdx: optIdx,
          currentDistractor: dq.distractor,
          reason: dq.reason || ''
        });
      });
    });
    if (tasks.length === 0) {
      if (typeof addToast === 'function') addToast(t('toasts.weak_distractors_improve'), 'info');
      return;
    }
    setIsBulkImproving(true);
    setIsImprovingDistractor(function (prev) {
      var next = Object.assign({}, prev);
      tasks.forEach(function (t) {
        next[t.qIdx + ':' + t.optIdx] = true;
      });
      return next;
    });
    if (typeof addToast === 'function') addToast(t('toasts.rewriting') + tasks.length + ' weak distractor' + (tasks.length === 1 ? '' : 's') + '…', 'info');
    var grade = props.gradeLevel || 'middle school';
    var results = await Promise.all(tasks.map(function (task) {
      var q = generatedContent.data.questions[task.qIdx];
      var prompt = 'You are an assessment-design expert. Rewrite a single MCQ distractor to encode a REAL common student misconception (a predictable error students at the ' + grade + ' level make in their thinking).\n\n' + 'QUESTION: "' + (q.question || '') + '"\n' + 'CORRECT ANSWER: "' + (q.correctAnswer || '') + '"\n' + 'CURRENT WEAK DISTRACTOR: "' + task.currentDistractor + '"\n' + 'WHY IT IS WEAK: "' + task.reason + '"\n\n' + 'Return ONLY the rewritten distractor text — a single short phrase or sentence at most ~15 words. No quotes, no labels, no explanation, no JSON. Just the new distractor text on a single line.';
      return Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
        var newText = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        newText = newText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Distractor:\s*/i, '').trim();
        if (!newText) return {
          ok: false,
          task: task
        };
        return {
          ok: true,
          task: task,
          newText: newText
        };
      }).catch(function () {
        return {
          ok: false,
          task: task
        };
      });
    }));
    var updates = results.filter(function (r) {
      return r.ok;
    }).map(function (r) {
      return {
        qIdx: r.task.qIdx,
        optIdx: r.task.optIdx,
        newText: r.newText
      };
    });
    if (updates.length > 0) {
      handleQuizBulkOptionChange(updates);
    }
    setIsImprovingDistractor(function (prev) {
      var next = Object.assign({}, prev);
      tasks.forEach(function (t) {
        delete next[t.qIdx + ':' + t.optIdx];
      });
      return next;
    });
    setIsBulkImproving(false);
    var failures = tasks.length - updates.length;
    if (typeof addToast === 'function') {
      if (failures === 0) addToast(t('toasts.rewrote') + updates.length + ' distractor' + (updates.length === 1 ? '' : 's') + '.', 'success');else addToast(t('toasts.rewrote') + updates.length + ' / ' + tasks.length + ' (' + failures + ' failed — try again).', failures > updates.length ? 'error' : 'success');
    }
  }
  function renderImageRefineOverlay(qIdx, target, optIdx, isCompact) {
    if (!isEditingQuiz) return null;
    var key = refineKey(qIdx, target, optIdx);
    var isOpen = !!refineOpen[key];
    var isLoading = !!isRefiningQuizImage[key];
    var inputValue = quizImageRefineInputs[key] || '';
    var btnSize = isCompact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function (e) {
        e.stopPropagation();
        toggleRefinePanel(key);
      },
      disabled: isLoading,
      className: 'absolute top-1 right-1 ' + btnSize + ' rounded-full bg-white/90 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-700 shadow-sm flex items-center justify-center transition-colors motion-reduce:transition-none disabled:opacity-50',
      title: isLoading ? 'Refining…' : 'Refine this image',
      "aria-label": t("a11y.refine_image"),
      "data-help-key": "quiz_image_refine_btn"
    }, isLoading ? '⋯' : '✏️'), isOpen && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 p-2 rounded border border-indigo-200 bg-indigo-50 text-xs"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-1.5 flex-wrap"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        refineQuizImage(qIdx, target, optIdx, 'Remove all text and labels from this image. Keep everything else identical.');
      },
      disabled: isLoading,
      className: "text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50",
      "aria-label": "Remove text from this image",
      title: t("tooltips.one_click_remove_text")
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "🧹 "), t("ui_common.remove_text"))), /*#__PURE__*/React.createElement("textarea", {
      "aria-label": "Image refinement instructions",
      value: inputValue,
      onChange: function (e) {
        var v = e.target.value;
        setQuizImageRefineInputs(function (prev) {
          var next = Object.assign({}, prev);
          next[key] = v;
          return next;
        });
      },
      onKeyDown: function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          refineQuizImage(qIdx, target, optIdx);
        }
      },
      placeholder: 'Describe how to refine this image (e.g. "make the background pure white", "add a clearer label")…',
      rows: 2,
      className: "w-full text-xs p-1.5 rounded border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200  resize-y",
      disabled: isLoading
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        refineQuizImage(qIdx, target, optIdx);
      },
      disabled: isLoading || !inputValue.trim(),
      className: "text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    }, isLoading ? 'Refining…' : 'Submit'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        toggleRefinePanel(key);
      },
      disabled: isLoading,
      className: "text-xs font-semibold px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    }, t("ui_common.cancel")))));
  }
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
  var setReviewGameState = props.setReviewGameState;
  var setSoundEnabled = props.setSoundEnabled;
  var setGameTeams = props.setGameTeams;
  var setEscapeRoomState = props.setEscapeRoomState;
  var setIsEscapeTimerRunning = props.setIsEscapeTimerRunning;
  var setConfirmDialog = props.setConfirmDialog;
  var handleStartLiveSession = props.handleStartLiveSession;
  var handleToggleInteractive = props.handleToggleInteractive;
  var handleEndLiveSession = props.handleEndLiveSession;
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
  var reviewDialogRef = React.useRef(null);
  var reviewCloseBtnRef = React.useRef(null);
  var reviewPreviousFocusRef = React.useRef(null);
  var reviewModalOpen = !!(reviewGameState && reviewGameState.activeQuestion);
  React.useEffect(function () {
    if (!reviewModalOpen) return;
    try {
      reviewPreviousFocusRef.current = document.activeElement;
    } catch (e) {}
    var raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(function () {
      try {
        if (reviewCloseBtnRef.current) reviewCloseBtnRef.current.focus();else if (reviewDialogRef.current) reviewDialogRef.current.focus();
      } catch (e) {}
    }) : setTimeout(function () {
      try {
        if (reviewCloseBtnRef.current) reviewCloseBtnRef.current.focus();else if (reviewDialogRef.current) reviewDialogRef.current.focus();
      } catch (e) {}
    }, 0);
    return function () {
      if (typeof cancelAnimationFrame === 'function' && raf) {
        try {
          cancelAnimationFrame(raf);
        } catch (e) {}
      } else if (typeof clearTimeout === 'function') {
        clearTimeout(raf);
      }
      var previous = reviewPreviousFocusRef.current;
      reviewPreviousFocusRef.current = null;
      try {
        if (previous && previous.isConnected !== false && typeof previous.focus === 'function') previous.focus();
      } catch (e) {}
    };
  }, [reviewModalOpen]);
  var handlePresentationOptionClick = props.handlePresentationOptionClick;
  var togglePresentationAnswer = props.togglePresentationAnswer;
  var togglePresentationExplanation = props.togglePresentationExplanation;
  var resetPresentation = props.resetPresentation;
  var handleQuizChange = props.handleQuizChange;
  var handleQuizImageRefine = props.handleQuizImageRefine;
  var handleQuizBulkOptionChange = props.handleQuizBulkOptionChange;
  var handleReflectionChange = props.handleReflectionChange;
  var handleFactCheck = props.handleFactCheck;
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
  var handleCreateGroup = props.handleCreateGroup;
  var handleAssignStudent = props.handleAssignStudent;
  var handleSetGroupResource = props.handleSetGroupResource;
  var handleSetGroupLanguage = props.handleSetGroupLanguage;
  var handleSetGroupProfile = props.handleSetGroupProfile;
  var handleDeleteGroup = props.handleDeleteGroup;
  // PHASE A persistence callback for TeacherLiveQuizControls — round-trips
  // routing rules into generatedContent.data.questions[i].routingRules so
  // they survive teacher-tab reload. See teacher_source.jsx
  // TeacherLiveQuizControls comment block for the contract.
  var handleUpdateQuestionRoutingRules = props.handleUpdateQuestionRoutingRules;
  var isPushingResource = props.isPushingResource;
  var callImagen = props.callImagen;
  var callGeminiImageEdit = props.callGeminiImageEdit;
  var getRows = props.getRows;
  var formatInlineText = props.formatInlineText;
  var renderFormattedText = props.renderFormattedText;
  var getReviewCategories = props.getReviewCategories;
  var playSound = props.playSound;
  var addToast = props.addToast;
  var ErrorBoundary = props.ErrorBoundary;
  var EscapeRoomTeacherControls = props.EscapeRoomTeacherControls;
  var TeacherLiveQuizControls = props.TeacherLiveQuizControls;
  var Stamp = props.Stamp;
  var ConfettiExplosion = props.ConfettiExplosion;
  var _quizMode = generatedContent && generatedContent.data && generatedContent.data.mode || 'exit-ticket';
  var _qmStrategiesMod = window.AlloModules && window.AlloModules.QuizModeStrategies || null;
  var _modeStrat = _qmStrategiesMod ? _qmStrategiesMod.getStrategy(_quizMode) : null;
  var _aiExplainerEnabled = !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail);
  var _showModeBanner = _quizMode !== 'exit-ticket' && !!_modeStrat;
  var _explainerState = React.useState({
    topic: '',
    loading: false,
    response: '',
    error: ''
  });
  var explainerData = _explainerState[0];
  var setExplainerData = _explainerState[1];
  var _explainerInput = React.useState('');
  var explainerInput = _explainerInput[0];
  var setExplainerInput = _explainerInput[1];
  function explainConcept(topic) {
    if (!topic || !topic.trim()) return;
    if (typeof props.callGemini !== 'function') {
      setExplainerData({
        topic: topic,
        loading: false,
        response: '',
        error: 'Explainer unavailable: callGemini not provided.'
      });
      return;
    }
    setExplainerData({
      topic: topic,
      loading: true,
      response: '',
      error: ''
    });
    var grade = props.gradeLevel || 'middle school';
    var prompt = 'You are a patient teacher explaining a concept to a ' + grade + ' student who needs a quick refresher. Explain "' + topic + '" in 60-90 words. Use simple, concrete language. Use an analogy or example if it helps. End with one sentence checking the student\'s understanding (e.g., "Does that make sense?"). Plain text only — no headings, no bullet points.';
    Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
      var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
      setExplainerData({
        topic: topic,
        loading: false,
        response: txt.trim(),
        error: ''
      });
    }).catch(function (err) {
      setExplainerData({
        topic: topic,
        loading: false,
        response: '',
        error: err && err.message ? err.message : 'Explainer failed.'
      });
    });
  }
  var _smartSkips = generatedContent && generatedContent.data && Array.isArray(generatedContent.data.smartSkips) ? generatedContent.data.smartSkips : [];
  var _pushedExplainer = sessionData && sessionData.quizState && sessionData.quizState.classExplainer;
  var dismissedExplainerTsState = React.useState(0);
  var dismissedExplainerTs = dismissedExplainerTsState[0];
  var setDismissedExplainerTs = dismissedExplainerTsState[1];
  var _showClassExplainer = !!_pushedExplainer && _pushedExplainer.text && _pushedExplainer.ts !== dismissedExplainerTs && !isEditingQuiz && !isPresentationMode && !isTeacherMode;
  var classExplainerBanner = _showClassExplainer ? /*#__PURE__*/React.createElement("div", {
    key: "class-explainer-banner",
    className: "rounded-xl border-2 border-amber-300 bg-amber-50 p-4 mb-2 shadow-sm animate-in motion-reduce:animate-none fade-in slide-in-from-top-2",
    role: "region",
    "aria-label": "Teacher explanation"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl flex-shrink-0",
    "aria-hidden": "true"
  }, "📡"), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-bold tracking-wider text-amber-800 mb-1"
  }, "From your teacher · pause and read"), _pushedExplainer.conceptText && /*#__PURE__*/React.createElement("p", {
    className: "text-xs italic text-amber-700 mb-1"
  }, '"' + _pushedExplainer.conceptText + '"'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed whitespace-pre-wrap"
  }, _pushedExplainer.text), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-3 flex-wrap"
  }, typeof props.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      try {
        if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_pushedExplainer.text);else props.callTTS(_pushedExplainer.text);
      } catch (e) {}
    },
    className: "text-xs font-bold px-3 py-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100",
    "aria-label": t("a11y.read_aloud")
  }, "🔊 Read aloud"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setDismissedExplainerTs(_pushedExplainer.ts);
    },
    className: "text-xs font-bold px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
  }, "✓ Got it"))))) : null;
  var modeBanner = _showModeBanner ? /*#__PURE__*/React.createElement("div", {
    key: "mode-banner",
    className: 'rounded-xl border-2 p-4 mb-2 ' + (_quizMode === 'pre-check' ? 'border-amber-300 bg-amber-50' : _quizMode === 'review' ? 'border-purple-300 bg-purple-50' : 'border-sky-300 bg-sky-50'),
    role: "region",
    "aria-label": _modeStrat.label
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, _modeStrat.icon), /*#__PURE__*/React.createElement("h3", {
    className: 'font-black text-base ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')
  }, _modeStrat.label), /*#__PURE__*/React.createElement("span", {
    className: 'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (_quizMode === 'pre-check' ? 'bg-amber-200 text-amber-900' : _quizMode === 'review' ? 'bg-purple-200 text-purple-900' : 'bg-sky-200 text-sky-900')
  }, _quizMode)), _modeStrat.render.intro && /*#__PURE__*/React.createElement("p", {
    className: 'text-sm leading-relaxed ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')
  }, _modeStrat.render.intro), _smartSkips.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: 'text-xs italic mt-2 ' + (_quizMode === 'pre-check' ? 'text-amber-800' : _quizMode === 'review' ? 'text-purple-800' : 'text-sky-800')
  }, 'ℹ️ Skipped ' + _smartSkips.join(' and ') + ' — using the dedicated tool instead avoids redundancy.'), isTeacherMode && generatedContent && generatedContent.data && generatedContent.data.distractorReview && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 flex-wrap",
    "data-help-key": "quiz_distractor_review_summary"
  }, /*#__PURE__*/React.createElement("p", {
    className: 'text-xs italic ' + (_quizMode === 'pre-check' ? 'text-amber-800' : 'text-sky-800'),
    title: (generatedContent.data.distractorReview.weakItems || []).length > 0 ? 'Weak items: Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
      return i + 1;
    }).join(', Q') : 'All MCQs have at least half their distractors encoding a known misconception'
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🎯 "), 'Distractor review: ' + (generatedContent.data.distractorReview.misconceptionCount || 0) + ' of ' + (generatedContent.data.distractorReview.totalDistractors || 0) + ' distractors encode a misconception (' + (generatedContent.data.distractorReview.quality != null ? generatedContent.data.distractorReview.quality + '%' : '—') + ')' + ((generatedContent.data.distractorReview.weakItems || []).length > 0 ? ' — review Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
    return i + 1;
  }).join(', Q') + ' before deploying' : ' — looks solid')), isEditingQuiz && function () {
    var weakCount = (Array.isArray(generatedContent.data.questions) ? generatedContent.data.questions : []).reduce(function (sum, q) {
      if (!q || q.type && q.type !== 'mcq') return sum;
      if (!Array.isArray(q.distractorQuality)) return sum;
      return sum + q.distractorQuality.filter(function (dq) {
        return dq && dq.encodesMisconception === false && Array.isArray(q.options) && q.options.indexOf(dq.distractor) >= 0 && q.options[q.options.indexOf(dq.distractor)] !== q.correctAnswer;
      }).length;
    }, 0);
    if (weakCount === 0) return null;
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: bulkImproveDistractors,
      disabled: isBulkImproving,
      className: "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors motion-reduce:transition-none",
      "aria-label": isBulkImproving ? 'Rewriting ' + weakCount + ' weak distractors' : 'Rewrite all ' + weakCount + ' flagged distractors in one batch',
      "data-help-key": "quiz_bulk_improve_btn",
      title: 'Rewrite all ' + weakCount + ' flagged distractor' + (weakCount === 1 ? '' : 's') + ' in one batch'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "✨ "), isBulkImproving ? 'Rewriting ' + weakCount + '…' : 'Improve all ' + weakCount);
  }())) : null;
  var explainerPanel = _aiExplainerEnabled ? /*#__PURE__*/React.createElement("div", {
    key: "ai-explainer",
    className: "rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6",
    role: "region",
    "aria-label": "AI concept explainer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg",
    "aria-hidden": "true"
  }, "🤖"), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-sm text-indigo-900"
  }, "Don't know a concept? Ask for a quick explainer.")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-indigo-800 mb-2"
  }, "Type any concept from the quiz (or any prior knowledge you're unsure about). The AI will give you a 60-90 word explanation tuned to your grade level."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": "Concept to explain",
    type: "text",
    value: explainerInput,
    onChange: function (ev) {
      setExplainerInput(ev.target.value);
    },
    onKeyDown: function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        explainConcept(explainerInput);
      }
    },
    placeholder: _quizMode === 'pre-check' ? 'e.g., "what plants need to grow"' : 'e.g., "photosynthesis"',
    className: "flex-1 min-w-0 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      explainConcept(explainerInput);
    },
    disabled: !explainerInput.trim() || explainerData.loading,
    className: "px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
  }, explainerData.loading ? 'Explaining…' : 'Explain')), explainerData.response && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-3 bg-white border border-indigo-200 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
  }, explainerData.topic), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-800 leading-relaxed"
  }, explainerData.response), typeof props.callTTS === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainerData.response);else props.callTTS(explainerData.response);
    },
    className: "mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900",
    "aria-label": t("a11y.read_aloud")
  }, "🔊 Read aloud")), explainerData.error && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800"
  }, explainerData.error)) : null;
  var qualityReviewPanel = isTeacherMode && !(activeSessionCode && sessionData && sessionData.quizState && sessionData.quizState.isActive) ? /*#__PURE__*/React.createElement(AssessmentQualityPanel, {
    audit: assessmentAudit,
    h5p: assessmentH5PPreflight,
    repairing: repairingAssessment,
    onRepairAll: repairAssessmentQuality
  }) : null;
  var deliverySettingsPanel = isTeacherMode && !(activeSessionCode && sessionData && sessionData.quizState && sessionData.quizState.isActive) ? /*#__PURE__*/React.createElement(AssessmentDeliveryPanel, {
    settings: deliverySettings,
    onChange: updateAssessmentDelivery
  }) : null;
  var draftStatusPanel = draftNamespace && !isEditingQuiz && !isPresentationMode && !isReviewGame ? /*#__PURE__*/React.createElement(AssessmentDraftStatus, {
    namespace: draftNamespace
  }) : null;
  var oneQuestionAtATime = deliverySettings.pacing === 'one-at-a-time' && !isEditingQuiz && !isPresentationMode;
  var assessmentQuestionCount = Array.isArray(assessmentData.questions) ? assessmentData.questions.length : 0;
  var reviewProgress = draftNamespace ? _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace)) : null;
  var learnerAttemptPanel = draftNamespace && !isEditingQuiz && !isPresentationMode && !isReviewGame ? /*#__PURE__*/React.createElement("section", {
    className: "rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4",
    "aria-label": "Assessment progress and submission"
  }, /*#__PURE__*/React.createElement(AssessmentTimerBar, {
    enabled: deliverySettings.timeLimitMinutes > 0,
    remainingSeconds: assessmentTimer.remainingSeconds,
    running: assessmentTimer.running,
    expired: assessmentTimer.expired,
    warningMinutes: deliverySettings.warningMinutes,
    extensionMinutes: deliverySettings.extensionMinutes,
    onTogglePause: toggleAssessmentTimer,
    onExtend: extendAssessmentTimer,
    onReview: function () {
      setReviewOpen(true);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: 'flex items-center gap-2 flex-wrap ' + (deliverySettings.timeLimitMinutes > 0 ? 'mt-3' : '')
  }, deliverySettings.showProgress && /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-indigo-950"
  }, oneQuestionAtATime ? 'Question ' + (currentQuestionIdx + 1) + ' of ' + assessmentQuestionCount : assessmentQuestionCount + ' questions'), oneQuestionAtATime && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      goToAssessmentQuestion(currentQuestionIdx - 1);
    },
    disabled: currentQuestionIdx <= 0,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-900 disabled:opacity-40"
  }, "Previous"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      goToAssessmentQuestion(currentQuestionIdx + 1);
    },
    disabled: currentQuestionIdx >= assessmentQuestionCount - 1,
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-900 disabled:opacity-40"
  }, "Next")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setReviewOpen(true);
    },
    className: "ml-auto text-xs font-black px-3 py-1.5 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800"
  }, "Review & submit"))) : null;
  var reviewDialog = /*#__PURE__*/React.createElement(AssessmentReviewDialog, {
    open: reviewOpen,
    progress: reviewProgress,
    onClose: function () {
      setReviewOpen(false);
    },
    onGo: goToAssessmentQuestion,
    onSubmit: submitAssessmentAttempt
  });
  if (attemptReceipt && !isTeacherMode && !isParentMode && !isEditingQuiz && !isPresentationMode && !isReviewGame) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-6"
    }, modeBanner, /*#__PURE__*/React.createElement(AssessmentSubmittedPanel, {
      receipt: attemptReceipt,
      onStartAnother: startAnotherAssessmentAttempt
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, classExplainerBanner, modeBanner, explainerPanel, qualityReviewPanel, deliverySettingsPanel, draftStatusPanel, learnerAttemptPanel, reviewDialog, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 p-4 rounded-lg border border-teal-100 mb-6 flex justify-between items-center flex-wrap gap-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-teal-800 flex-grow"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Providing options for action and expression. Frequent formative assessments help track progress and adjust instruction."), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, isTeacherMode && activeSessionCode && !sessionData?.quizState?.isActive && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.connect'),
    onClick: handleStartLiveSession,
    className: 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-200 ' + quizreducedMotionClass,
    title: t('quiz.launch_live_tooltip')
  }, /*#__PURE__*/React.createElement(Wifi, {
    size: 14
  }), " ", t('quiz.launch_live_btn')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full animate-in motion-reduce:animate-none fade-in duration-300"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 12,
    className: "text-orange-700"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black text-orange-700"
  }, Object.keys(sessionData?.roster || {}).length, " ", t('quiz.lobby_waiting') || "Ready")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.locked'),
    onClick: handleToggleInteractive,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm ${sessionData?.forceStatic ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50'}`,
    title: t('session.toggle_interactive_title')
  }, sessionData?.forceStatic ? /*#__PURE__*/React.createElement(Lock, {
    size: 12
  }) : /*#__PURE__*/React.createElement(Unlock, {
    size: 12
  }), sessionData?.forceStatic ? t('session.static_only') : t('session.interactive'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.confirm'),
    onClick: handleToggleIsPresentationMode,
    disabled: isReviewGame || isTeacherMode && sessionData?.quizState?.isActive,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPresentationMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`,
    title: t('quiz.presentation')
  }, isPresentationMode ? /*#__PURE__*/React.createElement(CheckCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 14
  }), isPresentationMode ? t('common.close') : t('quiz.presentation')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleToggleIsReviewGame,
    disabled: isPresentationMode,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isReviewGame ? 'bg-yellow-500 text-indigo-900 hover:bg-yellow-600 ring-2 ring-yellow-200' : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-50'}`,
    title: t('quiz.review_game'),
    "aria-label": t('quiz.review_game')
  }, isReviewGame ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Gamepad2, {
    size: 14
  }), isReviewGame ? t('common.close') : t('quiz.review_game')), /*#__PURE__*/React.createElement("button", {
    type: "button",
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
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${escapeRoomState.isActive ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-200' : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'}`,
    title: isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title'),
    "aria-label": t('escape_room.title')
  }, escapeRoomState.isActive ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : /*#__PURE__*/React.createElement(DoorOpen, {
    size: 14
  }), escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')), isTeacherMode && !isIndependentMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleExportQTI,
    className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-teal-600 border border-teal-200 hover:bg-teal-50 transition-all motion-reduce:transition-none shadow-sm",
    title: t('export_menu.qti'),
    "aria-label": t('export_menu.qti')
  }, /*#__PURE__*/React.createElement(FolderDown, {
    size: 14
  }), " ", t('quiz.export_qti_btn')), !isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && /*#__PURE__*/React.createElement(React.Fragment, null, !isIndependentMode && !isParentMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.toggle_edit_quiz'),
    onClick: handleToggleIsEditingQuiz,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm ${isEditingQuiz ? 'bg-teal-700 text-white hover:bg-teal-700' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingQuiz ? t('common.done_editing') : t('quiz.edit')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleToggleShowQuizAnswers,
    className: "text-xs flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-bold hover:bg-teal-200 transition-colors motion-reduce:transition-none"
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
  }, /*#__PURE__*/React.createElement(LiveResultsDashboard, {
    sessionData: sessionData,
    generatedContent: generatedContent,
    appId: appId,
    activeSessionCode: activeSessionCode,
    callGemini: props.callGemini,
    callTTS: props.callTTS,
    gradeLevel: props.gradeLevel,
    conceptMasteryByUid: props.conceptMasteryByUid
  }), /*#__PURE__*/React.createElement(ErrorBoundary, {
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
    onDeleteGroup: handleDeleteGroup,
    onUpdateQuestionRoutingRules: handleUpdateQuestionRoutingRules,
    history: props.history
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end px-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleEndLiveSession,
    className: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none shadow-sm flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }), " ", t('session.action_end')))) : isReviewGame ? /*#__PURE__*/React.createElement("div", {
    className: "animate-in motion-reduce:animate-none fade-in duration-500"
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
    className: "text-3xl font-black text-yellow-700 tracking-widest uppercase drop-shadow-md flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 32
  }), " ", t('review_game.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-sm mt-1 font-medium"
  }, t('review_game.subtitle'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.volume'),
    onClick: () => {
      setSoundEnabled(!soundEnabled);
      if (!soundEnabled) playSound('click');
    },
    className: `p-2 rounded-full transition-colors motion-reduce:transition-none ${soundEnabled ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-100'}`,
    title: t('review_game.toggle_sound')
  }, soundEnabled ? /*#__PURE__*/React.createElement(Volume2, {
    size: 20
  }) : /*#__PURE__*/React.createElement(MicOff, {
    size: 20
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
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
    className: "p-2 bg-slate-700 text-slate-100 rounded-full hover:bg-slate-600",
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
    className: "bg-transparent text-center font-bold text-white  focus:ring-2 focus:ring-white/50 w-full mb-1",
    value: team.name,
    onChange: e => setGameTeams(prev => prev.map(t => t.id === team.id ? {
      ...t,
      name: e.target.value
    } : t))
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-white drop-shadow-md"
  }, team.score), scoreAnimation.teamId === team.id && /*#__PURE__*/React.createElement("div", {
    className: "absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-700 font-black text-xl animate-[ping_1s_ease-out_reverse] motion-reduce:animate-none pointer-events-none z-20 whitespace-nowrap shadow-sm"
  }, "+", scoreAnimation.points), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-2 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleManualScore(team.id, -100),
    className: "min-w-6 min-h-6 inline-flex items-center justify-center text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded"
  }, "-"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleManualScore(team.id, 100),
    className: "min-w-6 min-h-6 inline-flex items-center justify-center text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded"
  }, "+")), gameTeams.length > 1 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleRemoveTeam(team.id),
    className: "absolute -top-2 -right-2 min-w-6 min-h-6 inline-flex items-center justify-center bg-slate-800 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-700 transition-all motion-reduce:transition-none shadow-sm",
    "aria-label": t('common.remove')
  }, /*#__PURE__*/React.createElement(X, {
    size: 10
  })))), gameTeams.length < 6 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.add'),
    onClick: handleAddTeam,
    className: "flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-600 hover:text-white hover:border-slate-400 transition-colors motion-reduce:transition-none"
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
        type: "button",
        key: qIdx,
        onClick: () => !isClaimed && handleReviewTileClick(q, q.points),
        disabled: isClaimed,
        "aria-label": `Category: ${cat.name}, ${q.points} Points${isClaimed ? ', Claimed' : ''}`,
        "aria-disabled": isClaimed,
        className: `
                                                            h-24 rounded-lg font-black text-3xl shadow-lg transition-all motion-reduce:transition-none duration-300 transform flex items-center justify-center border-b-4 relative overflow-hidden group  focus:ring-4 focus:ring-yellow-400 focus:ring-offset-4 focus:ring-offset-slate-900
                                                            ${isClaimed ? 'bg-slate-800/50 text-slate-700 border-slate-800 cursor-default' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-yellow-300 border-blue-800 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-1 hover:shadow-blue-500/20 hover:shadow-xl cursor-pointer active:scale-95'}
                                                        `
      }, !isClaimed && /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite] motion-reduce:animate-none"
      }), /*#__PURE__*/React.createElement("span", {
        className: "relative z-10 drop-shadow-md"
      }, isClaimed ? '' : q.points));
    }));
  })), reviewGameState.activeQuestion && /*#__PURE__*/React.createElement("div", {
    ref: reviewDialogRef,
    tabIndex: -1,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "quiz-review-question-title",
    onKeyDown: function (e) {
      _quizHandleDialogKeyDown(e, reviewDialogRef, function () {
        closeReviewModal(false);
      });
    },
    className: "absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 animate-in motion-reduce:animate-none zoom-in-95 duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-800 w-full max-w-4xl rounded-2xl border-4 border-yellow-500 shadow-2xl p-8 text-center relative flex flex-col max-h-full overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-blue-900 font-black text-2xl px-6 py-2 rounded-full shadow-lg border-2 border-white"
  }, reviewGameState.activeQuestion.points), /*#__PURE__*/React.createElement("button", {
    type: "button",
    ref: reviewCloseBtnRef,
    "aria-label": t('common.close'),
    onClick: () => closeReviewModal(false),
    className: "absolute top-4 right-4 min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-blue-100 hover:text-white hover:bg-blue-700 transition-colors motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement(X, {
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 mb-8"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "quiz-review-question-title",
    className: "text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm"
  }, formatInlineText(reviewGameState.activeQuestion.question, false, true)), reviewGameState.activeQuestion.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-blue-200 text-lg italic mt-4"
  }, formatInlineText(reviewGameState.activeQuestion.question_en, false, true))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left"
  }, reviewGameState.activeQuestion.options.map((opt, oIdx) => /*#__PURE__*/React.createElement("div", {
    key: oIdx,
    className: `
                                                            p-4 rounded-xl text-lg font-medium border-2 transition-all motion-reduce:transition-none
                                                            ${reviewGameState.showAnswer ? opt === reviewGameState.activeQuestion.correctAnswer ? 'bg-green-700 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' : 'bg-blue-900/50 border-blue-700 text-blue-300 opacity-50' : 'bg-blue-700 border-blue-500 text-white'}
                                                        `
  }, /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-8 font-bold opacity-50"
  }, String.fromCharCode(65 + oIdx), "."), " ", formatInlineText(opt, false, true)))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-6 mt-auto pt-4 border-t border-blue-700"
  }, !reviewGameState.showAnswer ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('review_game.reveal_answer'),
    onClick: () => {
      setReviewGameState(prev => ({
        ...prev,
        showAnswer: true
      }));
      playSound('reveal');
    },
    className: "bg-yellow-500 text-blue-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors motion-reduce:transition-none shadow-lg hover:shadow-yellow-500/20"
  }, t('review_game.reveal_answer')) : /*#__PURE__*/React.createElement("div", {
    className: "w-full animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-200 text-sm font-bold uppercase tracking-wider mb-3"
  }, t('review_game.who_correct')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-3"
  }, gameTeams.map(team => /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": `Award ${reviewGameState.activeQuestion.points} points to ${team.name}`,
    key: team.id,
    onClick: () => handleAwardPoints(team.id, reviewGameState.activeQuestion.points),
    className: `${team.color.replace('bg-', 'bg-')} hover:opacity-90 ${team.color.includes('yellow') ? 'text-indigo-900' : 'text-white'} px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all motion-reduce:transition-none`
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16
  }), " ", team.name)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      playSound('incorrect');
      closeReviewModal(true);
    },
    className: "bg-slate-700 text-white hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-colors motion-reduce:transition-none"
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
    className: "space-y-8 animate-in motion-reduce:animate-none fade-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-xl flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MonitorPlay, {
    size: 24,
    className: "text-teal-700"
  }), " ", t('quiz.presentation_board')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.reset_presentation'),
    onClick: resetPresentation,
    className: "flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14
  }), " ", t('quiz.reset_board'))), generatedContent?.data.questions.map((q, i) => {
    if (!q) return null;
    const pState = presentationState[i] || {};
    if (q.type && q.type !== 'mcq' || !Array.isArray(q.options)) {
      return /*#__PURE__*/React.createElement(AssessmentPresentationItem, {
        key: i,
        q: q,
        index: i,
        showAnswer: !!pState.showAnswer,
        showExplanation: !!pState.showExplanation,
        onToggleAnswer: () => togglePresentationAnswer(i),
        onToggleExplanation: () => togglePresentationExplanation(i),
        formatInlineText: formatInlineText,
        renderFormattedText: renderFormattedText
      });
    }
    const isAnswered = !!pState.selectedOption;
    const isCorrectlyAnswered = pState.isCorrect;
    const showAnswer = pState.showAnswer;
    const showExplanation = pState.showExplanation;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all motion-reduce:transition-none"
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
        className: "w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors motion-reduce:transition-none"
      });
      if (isSelected) {
        if (pState.isCorrect) {
          btnClass = "bg-green-100 border-2 border-green-500 text-green-900 shadow-md transform scale-[1.02]";
          icon = /*#__PURE__*/React.createElement(CheckCircle2, {
            size: 24,
            className: "text-green-600"
          });
        } else {
          btnClass = "bg-red-100 border-2 border-red-400 text-red-900 animate-shake motion-reduce:animate-none";
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
        type: "button",
        key: optIdx,
        onClick: () => handlePresentationOptionClick(i, opt),
        disabled: showAnswer,
        className: `p-5 rounded-xl text-left font-bold text-lg transition-all motion-reduce:transition-none duration-200 flex items-center gap-4 group w-full ${btnClass}`
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
      className: "text-red-500 font-bold flex items-center gap-2 animate-in motion-reduce:animate-none fade-in slide-in-from-left-2"
    }, /*#__PURE__*/React.createElement(XCircle, {
      size: 18
    }), " ", t('quiz.presentation_try_again')), isAnswered && isCorrectlyAnswered && /*#__PURE__*/React.createElement("span", {
      className: "text-green-600 font-bold flex items-center gap-2 animate-in motion-reduce:animate-none zoom-in duration-300 overflow-visible"
    }, /*#__PURE__*/React.createElement(Sparkles, {
      size: 18
    }), " ", t('quiz.presentation_correct'), /*#__PURE__*/React.createElement(ConfettiExplosion, null))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, q.factCheck && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation'),
      onClick: () => togglePresentationExplanation(i),
      className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2 ${showExplanation ? 'bg-yellow-100 text-yellow-700' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'}`
    }, showExplanation ? /*#__PURE__*/React.createElement(ChevronUp, {
      size: 14
    }) : /*#__PURE__*/React.createElement(Info, {
      size: 14
    }), showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer'),
      onClick: () => togglePresentationAnswer(i),
      className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2 ${showAnswer ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`
    }, showAnswer ? /*#__PURE__*/React.createElement(Eye, {
      size: 14
    }) : /*#__PURE__*/React.createElement(MousePointerClick, {
      size: 14
    }), showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')))), showExplanation && q.factCheck && /*#__PURE__*/React.createElement("div", {
      className: "mt-4 ml-0 md:ml-14 p-4 bg-yellow-50 border border-yellow-100 rounded-xl animate-in motion-reduce:animate-none slide-in-from-top-2"
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
  }, generatedContent?.data.questions.map((q, i) => oneQuestionAtATime && i !== currentQuestionIdx ? null : q && q.type && q.type !== 'mcq' ? null : /*#__PURE__*/React.createElement("div", {
    key: i,
    id: 'assessment-question-' + i,
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm relative group/question scroll-mt-24"
  }, !isEditingQuiz && deliverySettings.allowFlagging && /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end mb-2"
  }, /*#__PURE__*/React.createElement(AssessmentQuestionFlagButton, {
    flagged: !!flaggedQuestions[i],
    onToggle: function () {
      toggleQuestionFlag(i);
    }
  })), q.imageUrl && /*#__PURE__*/React.createElement("div", {
    className: "relative mb-3"
  }, /*#__PURE__*/React.createElement("img", {
    src: q.imageUrl,
    alt: q.question || 'Question image',
    loading: "lazy",
    className: "w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50"
  }), renderImageRefineOverlay(i, 'question', null, false)), /*#__PURE__*/React.createElement("div", {
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
    className: "w-full font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none",
    rows: getRows(q.question)
  }), q.question_en !== undefined && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_question_english') || 'Edit question English translation',
    value: q.question_en || '',
    onChange: e => handleQuizChange(i, 'question', e.target.value, null, true),
    className: "w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none",
    rows: getRows(q.question_en || ''),
    placeholder: t('common.placeholder_english_trans')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-800 px-2 py-1"
  }, q.question), q.question_en && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic px-2"
  }, q.question_en)))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check'),
    onClick: () => handleFactCheck(i),
    disabled: isFactChecking[i],
    className: `flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors motion-reduce:transition-none ${q.factCheck ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200'}`,
    title: t('quiz.verify_tooltip')
  }, isFactChecking[i] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin " + quizreducedMotionClass
  }) : q.factCheck ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }) : /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 12
  }), isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check'))), isEditingQuiz && /*#__PURE__*/React.createElement(AssessmentItemActions, {
    q: q,
    questionIdx: i,
    totalQuestions: generatedContent.data.questions.length,
    onAction: props.handleQuizQuestionAction,
    onRegenerate: regenerateAssessmentQuestion,
    regenerating: !!regeneratingQuestions[i]
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9"
  }, q.options.map((opt, optIdx) => /*#__PURE__*/React.createElement("div", {
    key: optIdx,
    role: !isEditingQuiz ? 'button' : undefined,
    tabIndex: !isEditingQuiz ? 0 : undefined,
    "aria-pressed": !isEditingQuiz ? studentMcqAnswers[i] === optIdx : undefined,
    onClick: !isEditingQuiz ? () => selectMcqOption(i, optIdx, opt, q) : undefined,
    onKeyDown: !isEditingQuiz ? e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectMcqOption(i, optIdx, opt, q);
      }
    } : undefined,
    className: `p-2 rounded-lg border text-sm relative group/option ${!isEditingQuiz ? 'cursor-pointer hover:bg-indigo-50/40 transition-colors motion-reduce:transition-none' : ''} ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : studentMcqAnswers[i] === optIdx ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' : 'bg-slate-50 border-slate-100'}`
  }, Array.isArray(q.optionImageUrls) && q.optionImageUrls[optIdx] && /*#__PURE__*/React.createElement("div", {
    className: "relative mb-2"
  }, /*#__PURE__*/React.createElement("img", {
    src: q.optionImageUrls[optIdx],
    alt: opt,
    loading: "lazy",
    className: "w-full h-24 object-contain rounded bg-white border border-slate-200"
  }), renderImageRefineOverlay(i, 'option', optIdx, true)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mt-1.5 opacity-50"
  }, String.fromCharCode(65 + optIdx), "."), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_option') || 'Edit answer option',
    value: opt,
    onChange: e => handleQuizChange(i, 'option', e.target.value, optIdx),
    className: `w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5  resize-none transition-all motion-reduce:transition-none ${showQuizAnswers && (isTeacherMode || isParentMode) && opt === q.correctAnswer ? 'text-green-800 font-medium' : 'text-slate-600'}`,
    rows: getRows(opt, 30)
  }), q.options_en && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('quiz.edit_option_translation') || 'Edit option translation',
    value: q.options_en[optIdx] || '',
    onChange: e => handleQuizChange(i, 'option', e.target.value, optIdx, true),
    className: "w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5  resize-none transition-all motion-reduce:transition-none mt-1",
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
  })), isEditingQuiz && opt !== q.correctAnswer && Array.isArray(q.distractorQuality) && function () {
    var dq = q.distractorQuality.find(function (d) {
      return d && d.distractor === opt;
    });
    if (!dq) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 ml-1 flex items-center gap-1.5 flex-wrap"
    }, dq.encodesMisconception ? /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800",
      "aria-label": 'This distractor encodes a known student misconception. ' + (dq.reason || ''),
      title: dq.reason || 'Encodes a known student misconception'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "🎯 "), "misconception") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800",
      "aria-label": 'Generic distractor — does not encode a specific misconception. ' + (dq.reason || ''),
      title: dq.reason || 'Generic distractor — does not encode a specific misconception'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "⚠ "), "generic"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function (e) {
        e.stopPropagation();
        improveDistractor(i, optIdx, opt, dq.reason || '');
      },
      disabled: !!isImprovingDistractor[i + ':' + optIdx],
      className: "text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
      "aria-label": isImprovingDistractor[i + ':' + optIdx] ? 'Rewriting distractor' : 'Rewrite this distractor to encode a real misconception',
      title: t("tooltips.rewrite_distractor")
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "✨ "), isImprovingDistractor[i + ':' + optIdx] ? 'rewriting…' : 'improve')));
  }()))), /*#__PURE__*/React.createElement(McqEnhancements, {
    q: q,
    questionIdx: i,
    modeStrategy: _modeStrat,
    callGemini: props.callGemini,
    callTTS: props.callTTS,
    gradeLevel: props.gradeLevel,
    onSubmitLiveAnswer: onSubmitLiveAnswer,
    currentConfidence: studentMcqConfidence[i] || null,
    onSetConfidence: function (lvl) {
      setMcqConfidence(i, lvl, q);
    }
  }), q.factCheck && isTeacherMode && (!isIndependentMode || showQuizAnswers) && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 ml-9 p-3 pr-20 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex gap-2 items-start animate-in motion-reduce:animate-none slide-in-from-top-2 relative"
  }, /*#__PURE__*/React.createElement(Stamp, {
    label: t('quiz.verified_stamp'),
    position: "top-2 right-2",
    size: "small"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check'),
    onClick: () => handleFactCheck(i),
    disabled: isFactChecking[i],
    className: "absolute bottom-2 right-2 p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors motion-reduce:transition-none",
    title: t('quiz.regenerate_check')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: isFactChecking[i] ? "animate-spin " + quizreducedMotionClass : ""
  })), /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "mt-0.5 shrink-0 text-yellow-600"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "whitespace-pre-line leading-relaxed text-slate-700"
  }, renderFormattedText(q.factCheck)))))), Array.isArray(generatedContent?.data?.questions) && generatedContent.data.questions.some(function (q) {
    return q && (q.type === 'multi-select' || q.type === 'fill-blank' || q.type === 'short-answer' || q.type === 'self-explanation' || q.type === 'sequence-sense' || q.type === 'relation-mismatch' || q.type === 'answer-evidence' || q.type === 'numeric-response');
  }) && /*#__PURE__*/React.createElement(FreeformItemsBlock, {
    questions: generatedContent.data.questions,
    visibleQuestionIdx: oneQuestionAtATime ? currentQuestionIdx : null,
    flaggedQuestions: flaggedQuestions,
    allowFlagging: deliverySettings.allowFlagging,
    onToggleFlag: toggleQuestionFlag,
    draftNamespace: draftNamespace,
    callGemini: props.callGemini,
    callTTS: props.callTTS,
    gradeLevel: props.gradeLevel,
    QuizAIHelpers: window.AlloModules && window.AlloModules.QuizAIHelpers,
    modeStrategy: _modeStrat,
    scoringPolicy: scoringPolicy,
    onSubmitLiveAnswer: onSubmitLiveAnswer,
    allowDictation: allowDictation,
    isEditingQuiz: isEditingQuiz,
    onQuestionAction: props.handleQuizQuestionAction,
    onRegenerateQuestion: regenerateAssessmentQuestion,
    regeneratingQuestions: regeneratingQuestions
  }), (Array.isArray(generatedContent?.data.reflections) && generatedContent.data.reflections.length > 0 || generatedContent?.data.reflection) && /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mt-8"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 16
  }), " ", t('quiz.reflections')), Array.isArray(generatedContent?.data.reflections) ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, generatedContent?.data.reflections.map((ref, i) => {
    const text = typeof ref === 'string' ? ref : ref.text || ref.prompt || ref.question || (typeof ref === 'object' ? JSON.stringify(ref) : '');
    const textEn = typeof ref === 'object' && ref.text_en ? ref.text_en : null;
    var refEntry = reflectionAnswers[i] || {};
    var refSubmitted = !!refEntry.submitted;
    var refDraft = refEntry.draft || '';
    return /*#__PURE__*/React.createElement("div", {
      key: i
    }, isEditingQuiz ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('quiz.edit_reflection') || 'Edit reflection prompt',
      value: text,
      onChange: e => handleReflectionChange(i, e.target.value),
      className: "w-full text-indigo-800 mb-1 italic text-sm bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none",
      rows: getRows(text)
    }), (textEn !== null || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
      "aria-label": t('quiz.edit_reflection_translation') || 'Edit reflection translation',
      value: textEn || '',
      onChange: e => handleReflectionChange(i, e.target.value, true),
      className: "w-full text-indigo-600 mb-4 text-xs bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none",
      rows: getRows(textEn || ''),
      placeholder: t('common.placeholder_reflection_trans')
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-indigo-800 mb-1 italic text-sm px-2 py-1"
    }, text), textEn && /*#__PURE__*/React.createElement("p", {
      className: "text-indigo-600 mb-4 text-xs px-2 py-1 italic"
    }, textEn)), !isEditingQuiz && (isPresentationMode ? /*#__PURE__*/React.createElement("div", {
      className: "h-24 border-b border-indigo-200 border-dashed"
    }) : refSubmitted ? /*#__PURE__*/React.createElement("div", {
      className: "mt-2 p-3 rounded-lg bg-white border border-indigo-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
    }, "✓ Reflection submitted"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-800 whitespace-pre-wrap"
    }, refEntry.submittedText || refDraft), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        reopenReflection(i);
      },
      className: "mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
    }, t("ui_common.edit_response"))) : /*#__PURE__*/React.createElement("div", {
      className: "mt-2"
    }, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": "Your reflection",
      value: refDraft,
      onChange: function (e) {
        setReflectionDraft(i, e.target.value);
      },
      placeholder: t("placeholders.reflection_here"),
      className: "w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-y transition-all motion-reduce:transition-none",
      rows: 4
    }), /*#__PURE__*/React.createElement(QuizVoiceInputButton, {
      value: refDraft,
      onChange: function (value) {
        setReflectionDraft(i, value);
      },
      allowDictation: allowDictation,
      label: "Dictate reflection"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        submitReflection(i);
      },
      disabled: !refDraft.trim(),
      className: "text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    }, t("ui_common.submit_reflection")), !refDraft.trim() && /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] italic text-slate-600"
    }, "Type a response to enable submit")))));
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-800 mb-4 italic text-sm"
  }, generatedContent?.data.reflection), !isEditingQuiz && (isPresentationMode ? /*#__PURE__*/React.createElement("div", {
    className: "h-24 border-b border-indigo-200 border-dashed"
  }) : function () {
    var refEntry = reflectionAnswers[0] || {};
    var refSubmitted = !!refEntry.submitted;
    var refDraft = refEntry.draft || '';
    return refSubmitted ? /*#__PURE__*/React.createElement("div", {
      className: "mt-2 p-3 rounded-lg bg-white border border-indigo-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1"
    }, "✓ Reflection submitted"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-800 whitespace-pre-wrap"
    }, refEntry.submittedText || refDraft), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        reopenReflection(0);
      },
      className: "mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
    }, t("ui_common.edit_response"))) : /*#__PURE__*/React.createElement("div", {
      className: "mt-2"
    }, /*#__PURE__*/React.createElement("textarea", {
      "aria-label": "Your reflection",
      value: refDraft,
      onChange: function (e) {
        setReflectionDraft(0, e.target.value);
      },
      placeholder: t("placeholders.reflection_here"),
      className: "w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-y transition-all motion-reduce:transition-none",
      rows: 4
    }), /*#__PURE__*/React.createElement(QuizVoiceInputButton, {
      value: refDraft,
      onChange: function (value) {
        setReflectionDraft(0, value);
      },
      allowDictation: allowDictation,
      label: "Dictate reflection"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        submitReflection(0);
      },
      disabled: !refDraft.trim(),
      className: "text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    }, t("ui_common.submit_reflection")), !refDraft.trim() && /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] italic text-slate-600"
    }, "Type a response to enable submit")));
  }())))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizView = QuizView;
  window.AlloModules.ViewQuizModule = true;
})();
