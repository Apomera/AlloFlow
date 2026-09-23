// i18n accessor for module-level code (2026-06-11): components/handlers below call t('key')
// without binding it (only some do `var t = props.t`), so a free t() throws ReferenceError
// when they run — latent crashes the SSR golden tests never fire. Bind once at module scope
// to the app global i18n (window.__alloT); components that DO `var t = props.t` shadow this.
var t = function () {
  if (typeof window !== 'undefined' && typeof window.__alloT === 'function') {
    try { return window.__alloT.apply(null, arguments); } catch (e) {}
  }
  return arguments.length > 1 ? arguments[1] : arguments[0];
};
// Single source of truth for "did the student pick the right option?", owned by
// the host (AlloFlowANTI.txt, next to fisherYatesShuffle) and reached the same
// way as window.__alloT above, because these call sites span module scope and
// several components. The host normalizes case and whitespace; the click grader
// already did, but every reveal and the voice check compared exactly, so a key
// differing from its option only by case scored the student correct while no
// option was shown as correct. Falls back to strict equality, the old behaviour,
// rather than carrying a second copy of the normalizer.
// NOTE: the authoring validators below deliberately keep using exact indexOf.
// They exist to warn an author about the very drift this tolerates at runtime.
var _quizAnswerMatches = function (option, key) {
  if (typeof window !== 'undefined' && typeof window.quizAnswerMatches === 'function') {
    try { return window.quizAnswerMatches(option, key); } catch (e) {}
  }
  return option != null && key != null && option === key;
};
var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
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
  var QUIZ_VOICE_CONTROL_EVENT = 'alloflow:quiz-voice-control';
  var QUIZ_VOICE_STATUS_EVENT = 'alloflow:quiz-voice-status';

  // Semantic voice helpers deliberately operate on quiz state, never DOM controls.
  function _quizVoiceNormalizeAction(value) {
    return String(value || 'status').trim().toLowerCase().replace(/[_\s]+/g, '-');
  }
  function _quizAuthoredImageAlt(value) {
    var description = String(value == null ? '' : value).trim();
    return description || 'No visual description provided.';
  }
  function _quizVoiceChoiceIndex(value, optionCount) {
    var count = Math.max(0, Math.min(8, Number(optionCount) || 0));
    var index = -1;
    if (typeof value === 'number' && isFinite(value)) {
      index = Math.floor(value) - 1;
    } else {
      var normalized = String(value == null ? '' : value).trim().toLowerCase()
        .replace(/^(?:choose|select|answer)\s+/, '')
        .replace(/^(?:option|choice|answer)\s+/, '')
        .replace(/[.]/g, '');
      var ordinalMap = {
        first: 0, one: 0, '1st': 0,
        second: 1, two: 1, '2nd': 1,
        third: 2, three: 2, '3rd': 2,
        fourth: 3, four: 3, '4th': 3,
        fifth: 4, five: 4, '5th': 4,
        sixth: 5, six: 5, '6th': 5,
        seventh: 6, seven: 6, '7th': 6,
        eighth: 7, eight: 7, '8th': 7
      };
      if (/^[a-h]$/.test(normalized)) index = normalized.charCodeAt(0) - 97;
      else if (/^[1-8]$/.test(normalized)) index = Number(normalized) - 1;
      else if (Object.prototype.hasOwnProperty.call(ordinalMap, normalized)) index = ordinalMap[normalized];
    }
    return index >= 0 && index < count ? index : -1;
  }
  function _quizVoiceParseScopedUtterance(rawText) {
    var raw = String(rawText || '').trim();
    var text = raw.toLowerCase().replace(/[?!.,]+$/g, '');
    if (!text) return null;
    var direct = {
      'describe quiz': 'quiz_describe',
      'describe this quiz': 'quiz_describe',
      'where am i': 'quiz_describe',
      'quiz status': 'quiz_describe',
      'list actions': 'quiz_list_actions',
      'what can i do': 'quiz_list_actions',
      'help': 'quiz_list_actions',
      'read question': 'quiz_read_question',
      'read the question': 'quiz_read_question',
      'read current question': 'quiz_read_question',
      'repeat question': 'quiz_read_question',
      'read response': 'quiz_read_question',
      'read my response': 'quiz_read_question',
      'check answer': 'quiz_check',
      'check my answer': 'quiz_check',
      'check response': 'quiz_check',
      'check my response': 'quiz_check',
      'check selections': 'quiz_check',
      'check value': 'quiz_check',
      'check both parts': 'quiz_check',
      'check answer and evidence': 'quiz_check',
      'list reflections': 'quiz_list_reflections',
      'read reflections': 'quiz_list_reflections',
      'open reflections': 'quiz_open_reflections',
      'go to reflections': 'quiz_open_reflections',
      'read reflection': 'quiz_read_reflection',
      'read the reflection': 'quiz_read_reflection',
      'read my reflection': 'quiz_read_reflection_response',
      'read reflection response': 'quiz_read_reflection_response',
      'clear reflection': 'quiz_clear_reflection',
      'clear my reflection': 'quiz_clear_reflection',
      'submit reflection': 'quiz_submit_reflection',
      'submit my reflection': 'quiz_submit_reflection',
      'edit reflection': 'quiz_edit_reflection',
      'edit my reflection': 'quiz_edit_reflection',
      'next reflection': 'quiz_next_reflection',
      'previous reflection': 'quiz_previous_reflection',
      'return to question': 'quiz_return_to_question',
      'back to question': 'quiz_return_to_question',
      'submit assessment': 'quiz_submit',
      'submit quiz': 'quiz_submit',
      'finish assessment': 'quiz_submit',
      'cancel review': 'quiz_review_cancel',
      'close review': 'quiz_review_cancel',
      'return to assessment': 'quiz_review_cancel',
      'next': 'quiz_next',
      'next question': 'quiz_next',
      'previous': 'quiz_previous',
      'previous question': 'quiz_previous',
      'go back a question': 'quiz_previous',
      'repeat feedback': 'quiz_repeat_feedback',
      'repeat response': 'quiz_repeat_feedback',
      'try again': 'quiz_try_again',
      'reset answer': 'quiz_try_again',
      'clear answer': 'quiz_try_again',
      'close quiz': 'quiz_close',
      'exit quiz': 'quiz_close'
    };
    if (direct[text]) return { commandId: direct[text] };
    var reflectionSelection = text.match(/^(?:open|select|choose|go to)\s+reflection\s+(.+)$/);
    if (reflectionSelection) {
      return { commandId: 'quiz_select_reflection', params: { reflection: reflectionSelection[1] } };
    }
    var setReflection = raw.match(/^set\s+(?:my\s+)?reflection(?:\s+response)?\s+to\s+(.+)$/i);
    if (setReflection && String(setReflection[1] || '').trim()) {
      return { commandId: 'quiz_set_reflection', params: { response: String(setReflection[1]).trim() } };
    }
    var appendReflection = raw.match(/^(?:append|add)\s+(?:to\s+)?(?:my\s+)?reflection(?:\s+response)?\s+(.+)$/i);
    if (appendReflection && String(appendReflection[1] || '').trim()) {
      return { commandId: 'quiz_append_reflection', params: { response: String(appendReflection[1]).trim() } };
    }
    var evidenceSelection = text.match(/^(?:choose|select)\s+(answer|evidence)(?:\s+(?:option|choice))?\s+(.+)$/);
    if (evidenceSelection) {
      return {
        commandId: evidenceSelection[1] === 'evidence' ? 'quiz_choose_evidence' : 'quiz_choose_answer',
        params: { choice: evidenceSelection[2] }
      };
    }
    var responseMatch = raw.match(/^(?:response|write|dictate|enter\s+(?:a\s+)?response|set\s+(?:my\s+)?answer\s+to|my\s+answer\s+is|answer\s+with)\s+(.+)$/i);
    if (responseMatch && String(responseMatch[1] || '').trim()) {
      return { commandId: 'quiz_enter_response', params: { response: String(responseMatch[1]).trim() } };
    }
    var selectionMatch = text.match(/^(select|choose|toggle|deselect|unselect|remove)(?:\s+(?:option|choice|pair|item|step|principle))?\s+(.+)$/);
    if (selectionMatch) {
      var selectionMode = selectionMatch[1] === 'deselect' || selectionMatch[1] === 'unselect' || selectionMatch[1] === 'remove'
        ? 'deselect'
        : selectionMatch[1] === 'toggle' ? 'toggle' : 'select';
      return {
        commandId: 'quiz_choose',
        params: { choice: selectionMatch[2], mode: selectionMode }
      };
    }
    if (/^(?:the\s+)?order\s+is\s+(?:correct|right)$/.test(text)) {
      return { commandId: 'quiz_choose', params: { choice: 'yes' } };
    }
    if (/^(?:the\s+)?order\s+is\s+(?:wrong|incorrect|not correct)$/.test(text)) {
      return { commandId: 'quiz_choose', params: { choice: 'no' } };
    }
    var explicitChoice = text.match(/^(?:choose|select|answer)(?:\s+(?:option|choice|answer))?\s+(.+)$/);
    var choice = explicitChoice ? explicitChoice[1] : text;
    if (_quizVoiceChoiceIndex(choice, 8) >= 0) {
      return { commandId: 'quiz_choose', params: { choice: choice } };
    }
    return null;
  }
  function _quizVoiceRequestText(request) {
    var input = request && typeof request === 'object' ? request : {};
    var value = input.response != null ? input.response : (input.text != null ? input.text : input.value);
    return String(value == null ? '' : value).trim();
  }
  function _quizVoiceNamedChoiceIndex(value, options) {
    var list = Array.isArray(options) ? options : [];
    var positional = _quizVoiceChoiceIndex(value, list.length);
    if (positional >= 0) return positional;
    var normalized = String(value == null ? '' : value).trim().toLowerCase().replace(/[?!.,]+$/g, '').replace(/\s+/g, ' ');
    if (!normalized) return -1;
    for (var i = 0; i < list.length; i++) {
      var candidate = String(list[i] == null ? '' : list[i]).trim().toLowerCase().replace(/[?!.,]+$/g, '').replace(/\s+/g, ' ');
      if (candidate && candidate === normalized) return i;
    }
    return -1;
  }
  function _quizVoiceReflectionIndex(value, reflectionCount) {
    var count = Math.max(0, Math.min(20, Number(reflectionCount) || 0));
    var normalized = String(value == null ? '' : value).trim().toLowerCase()
      .replace(/^(?:reflection|prompt)\s+/, '')
      .replace(/[?!.,]+$/g, '');
    var positional = _quizVoiceChoiceIndex(normalized, Math.min(8, count));
    if (positional >= 0) return positional;
    if (/^(?:9|1[0-9]|20)$/.test(normalized)) {
      var index = Number(normalized) - 1;
      return index < count ? index : -1;
    }
    return -1;
  }
  function _quizVoiceReflectionPrompt(reflection) {
    if (typeof reflection === 'string') return reflection.trim();
    if (!reflection || typeof reflection !== 'object') return '';
    return String(reflection.text || reflection.prompt || reflection.question || '').trim();
  }
  var _quizVoiceItemControllers = {};
  function _quizVoiceControllerKey(namespace, questionIdx) {
    return String(namespace || 'local') + ':' + String(questionIdx);
  }
  function _quizGetVoiceItemController(namespace, questionIdx) {
    return _quizVoiceItemControllers[_quizVoiceControllerKey(namespace, questionIdx)] || null;
  }
  function _quizUseVoiceController(p, controller) {
    var currentRef = React.useRef(controller);
    currentRef.current = controller;
    React.useEffect(function () {
      if (!p || typeof p.questionIdx !== 'number') return undefined;
      var exposed = {
        getState: function () {
          var current = currentRef.current;
          return current && typeof current.getState === 'function' ? current.getState() : null;
        },
        execute: function (action, request) {
          var current = currentRef.current;
          return current && typeof current.execute === 'function'
            ? current.execute(action, request || {})
            : { ok: false, state: 'unavailable', message: 'This item is not ready for voice input.' };
        }
      };
      if (typeof p.registerVoiceController === 'function') return p.registerVoiceController(p.questionIdx, exposed);
      var key = _quizVoiceControllerKey(p.draftNamespace, p.questionIdx);
      _quizVoiceItemControllers[key] = exposed;
      return function () { if (_quizVoiceItemControllers[key] === exposed) delete _quizVoiceItemControllers[key]; };
    }, [p && p.registerVoiceController, p && p.draftNamespace, p && p.questionIdx]);
  }
  function _quizVoiceQuestionPayload(question, questionIdx, totalQuestions, selectedOptionIdx, itemState) {
    var q = question && typeof question === 'object' ? question : {};
    var type = q.type || 'mcq';
    var state = itemState && typeof itemState === 'object' ? itemState : {};
    var rawOptions = (type === 'mcq' || type === 'multi-select') && Array.isArray(q.options) ? q.options : [];
    var selectedIndices = type === 'multi-select' && Array.isArray(state.selectedIndices) ? state.selectedIndices : [];
    var options = rawOptions.map(function (option, optionIdx) {
      return {
        index: optionIdx,
        number: optionIdx + 1,
        label: String.fromCharCode(65 + optionIdx),
        text: String(option == null ? '' : option),
        selected: type === 'multi-select' ? selectedIndices.indexOf(optionIdx) >= 0 : selectedOptionIdx === optionIdx
      };
    });
    var questionText = String(q.question || q.contextSentence || q.prompt || '');
    var message = 'Question ' + (questionIdx + 1) + ' of ' + totalQuestions + '. ' + questionText;
    if (options.length > 0) {
      message += ' Options: ' + options.map(function (option) {
        return option.label + ', ' + option.text;
      }).join('. ') + '.';
    }
    if (typeof selectedOptionIdx === 'number' && options[selectedOptionIdx]) {
      message += ' Option ' + options[selectedOptionIdx].label + ' is selected.';
    }
    if (type === 'multi-select' && selectedIndices.length > 0) {
      message += ' Selected options: ' + selectedIndices.map(function (idx) {
        return options[idx] ? options[idx].label : '';
      }).filter(Boolean).join(', ') + '.';
    }
    if (type === 'numeric-response') {
      if (q.unit) message += ' Include units such as ' + q.unit + '.';
      if (state.response) message += ' Current response: ' + state.response + '.';
    } else if (type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') {
      if (state.response) message += ' Current response: ' + state.response + '.';
      else message += ' No written response has been entered.';
    } else if (type === 'sequence-sense') {
      var displayedItems = Array.isArray(state.displayedItems) ? state.displayedItems : [];
      if (displayedItems.length > 0) message += ' Displayed sequence: ' + displayedItems.map(function (item, idx) { return (idx + 1) + ', ' + item; }).join('. ') + '.';
      if (state.prompt) message += ' ' + state.prompt;
    } else if (type === 'relation-mismatch') {
      var pairs = Array.isArray(state.pairs) ? state.pairs : (Array.isArray(q.pairs) ? q.pairs : []);
      if (pairs.length > 0) message += ' Pairs: ' + pairs.map(function (pair, idx) {
        return (idx + 1) + ', ' + String(pair && pair.left || '') + ' with ' + String(pair && pair.right || '');
      }).join('. ') + '.';
      if (state.prompt) message += ' ' + state.prompt;
    } else if (type === 'answer-evidence') {
      var answerOptions = Array.isArray(state.answerOptions) ? state.answerOptions : [];
      var evidenceOptions = Array.isArray(state.evidenceOptions) ? state.evidenceOptions : [];
      message += ' This is an answer and evidence item. Part 1, choose the best answer.';
      if (answerOptions.length > 0) message += ' Answer options: ' + answerOptions.map(function (option, idx) {
        return String.fromCharCode(65 + idx) + ', ' + option;
      }).join('. ') + '.';
      if (typeof state.answerIndex === 'number' && answerOptions[state.answerIndex] != null) {
        message += ' Answer option ' + String.fromCharCode(65 + state.answerIndex) + ' is selected.';
        message += ' Part 2, ' + String(state.evidencePrompt || 'choose the supporting evidence') + '.';
        if (evidenceOptions.length > 0) message += ' Evidence options: ' + evidenceOptions.map(function (option, idx) {
          return String.fromCharCode(65 + idx) + ', ' + option;
        }).join('. ') + '.';
        if (typeof state.evidenceIndex === 'number' && evidenceOptions[state.evidenceIndex] != null) {
          message += ' Evidence option ' + String.fromCharCode(65 + state.evidenceIndex) + ' is selected.';
        }
      } else {
        message += ' Say choose answer followed by a letter, number, ordinal, or the exact answer text.';
      }
    }
    return {
      questionIndex: questionIdx,
      questionNumber: questionIdx + 1,
      totalQuestions: totalQuestions,
      type: type,
      question: questionText,
      options: options,
      selectedOptionIndex: typeof selectedOptionIdx === 'number' ? selectedOptionIdx : null,
      selectedOptionLabel: typeof selectedOptionIdx === 'number' && options[selectedOptionIdx] ? options[selectedOptionIdx].label : null,
      itemState: state,
      message: message
    };
  }
  function _quizVoiceIsSemanticFrontmost(ctx, status) {
    if (!status || !status.mounted || status.state === 'unsupported-mode') return false;
    var context = ctx && typeof ctx === 'object' ? ctx : null;
    if (!context) return true;
    if (context.quizVoiceFrontmost === false || context.testPrepHubOpen === true || context.contentIsQuiz === false) return false;
    var hasResolver = typeof context.getCurrentLearnerResource === 'function';
    var current = null;
    if (hasResolver) {
      try { current = context.getCurrentLearnerResource(); } catch (e) { return false; }
      if (!current || typeof current !== 'object') return false;
    } else if (context.currentLearnerResource && typeof context.currentLearnerResource === 'object') {
      current = context.currentLearnerResource;
    } else if (context.quizVoiceFrontmost === true || context.contentIsQuiz === true) {
      return true;
    } else {
      // Legacy embedded hosts do not yet publish semantic ownership. Preserve
      // their existing Quiz behavior; production hosts use the resolver above.
      return true;
    }
    return String(current.type || '').trim().toLowerCase() === 'quiz' && current.frontmost !== false;
  }
  function _quizVoicePublicState(status, frontmost) {
    var source = status && typeof status === 'object' ? status : {};
    var item = source.itemState && typeof source.itemState === 'object' ? source.itemState : {};
    var actions = Array.isArray(source.actions)
      ? source.actions.map(function (action) { return String(action || '').slice(0, 80); }).filter(Boolean)
      : [];
    var hasSelection = typeof source.selectedOptionIndex === 'number' ||
      (Array.isArray(item.selectedIndices) && item.selectedIndices.length > 0) ||
      typeof item.answerIndex === 'number' || typeof item.evidenceIndex === 'number' ||
      typeof item.selectedIndex === 'number';
    var hasWrittenResponse = typeof item.response === 'string' && item.response.trim().length > 0;
    var hasReflectionResponse = typeof source.reflectionResponse === 'string' && source.reflectionResponse.trim().length > 0;
    return {
      ready: source.ready === true,
      mounted: source.mounted === true,
      frontmost: frontmost !== false,
      state: String(source.state || 'unavailable').slice(0, 80),
      surface: 'quiz',
      surfaceMode: String(source.surfaceMode || (source.reviewOpen ? 'review' : 'question')).slice(0, 40),
      questionNumber: Number.isFinite(Number(source.questionNumber)) ? Number(source.questionNumber) : 0,
      totalQuestions: Number.isFinite(Number(source.totalQuestions)) ? Number(source.totalQuestions) : 0,
      itemType: String(source.type || '').slice(0, 80),
      optionCount: Array.isArray(source.options) ? source.options.length : 0,
      hasSelection: hasSelection,
      hasResponse: hasSelection || hasWrittenResponse,
      checked: source.checked === true,
      submitted: source.state === 'submitted',
      reviewOpen: source.reviewOpen === true,
      reflectionNumber: Number.isFinite(Number(source.reflectionNumber)) ? Number(source.reflectionNumber) : 0,
      reflectionTotal: Number.isFinite(Number(source.reflectionTotal)) ? Number(source.reflectionTotal) : 0,
      hasReflectionResponse: hasReflectionResponse,
      reflectionSubmitted: source.reflectionSubmitted === true,
      hasFeedback: actions.indexOf('repeat-feedback') >= 0,
      actions: actions
    };
  }
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
  function _quizIsolateDialog(dialog) {
    var snapshots = [];
    if (!dialog || typeof document === 'undefined') return function () {};
    var current = dialog;
    while (current && current.parentElement) {
      var parent = current.parentElement;
      Array.prototype.forEach.call(parent.children, function (sibling) {
        if (sibling === current) return;
        snapshots.push({
          element: sibling,
          inert: sibling.inert === true,
          ariaHidden: sibling.getAttribute('aria-hidden')
        });
        sibling.inert = true;
        sibling.setAttribute('aria-hidden', 'true');
      });
      current = parent;
      if (current === document.body) break;
    }
    return function () {
      snapshots.forEach(function (snapshot) {
        snapshot.element.inert = snapshot.inert;
        if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
        else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
      });
    };
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
    if (namespace && namespace.indexOf('assess-preview:') === 0) return _quizDraftMemory[namespace] || null;
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
    return item && Object.prototype.hasOwnProperty.call(item, field) ? { found: true, value: item[field] } : { found: false, value: undefined };
  }
  function _quizWriteDraftField(namespace, itemKey, field, value) {
    if (namespace && namespace.indexOf('assess-preview:') === 0) { _quizStageDraftField(namespace, itemKey, field, value); return true; }
    if (_quizClosedDrafts[namespace]) return false;
    var storage = _quizLocalStorage();
    if (!namespace || !storage) return false;
    try {
      var draft = _quizReadDraft(namespace) || { version: 1, createdAt: Date.now(), items: {} };
      draft.items[itemKey] = Object.assign({}, draft.items[itemKey] || {});
      draft.items[itemKey][field] = value;
      draft.updatedAt = Date.now();
      storage.setItem(namespace, JSON.stringify(draft));
      try {
        window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-saved', { detail: { namespace: namespace, updatedAt: draft.updatedAt } }));
      } catch (eventError) {}
      return true;
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-error', { detail: { namespace: namespace } }));
      } catch (eventError) {}
      return false;
    }
  }
  function _quizStageDraftField(namespace, itemKey, field, value) {
    if (!namespace || _quizClosedDrafts[namespace]) return;
    var staged = _quizDraftMemory[namespace] || { items: {} };
    staged.items[itemKey] = Object.assign({}, staged.items[itemKey] || {});
    staged.items[itemKey][field] = value;
    staged.updatedAt = Date.now();
    _quizDraftMemory[namespace] = staged;
    try {
      window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-changed', { detail: { namespace: namespace } }));
    } catch (e) {}
  }
  function _quizReadWorkingDraft(namespace) {
    var persisted = _quizReadDraft(namespace) || { version: 1, createdAt: Date.now(), items: {} };
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
    if (type === 'sequence-sense') return !!item.grade || (item.verifyAnswer != null && !!String(item.principleAnswer || '').trim());
    if (type === 'relation-mismatch') return !!item.grade || (typeof item.clickedPairIdx === 'number' && !!String(item.partnerAnswer || '').trim());
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
        label: question && (question.question || question.contextSentence) || ('Question ' + (questionIdx + 1)),
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
    var answered = items.filter(function (item) { return item.answered; }).length;
    return {
      total: items.length,
      answered: answered,
      unanswered: items.length - answered,
      flagged: items.filter(function (item) { return item.flagged; }).length,
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
    if (namespace && namespace.indexOf('assess-preview:') === 0) return null;
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
    if (namespace && namespace.indexOf('assess-preview:') === 0) return null;
    var storage = _quizLocalStorage();
    var key = _quizAttemptStorageKey(namespace);
    if (!storage || !namespace || !key) return null;
    try {
      var receipt = Object.assign({ version: 1, submittedAt: Date.now() }, payload || {});
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
      feedbackTiming: ['after-submit','teacher-release'].includes(source.feedbackTiming) ? source.feedbackTiming : 'immediate',
      feedbackReleasedFor: typeof source.feedbackReleasedFor === 'string' ? source.feedbackReleasedFor : '',
      pacing: source.pacing === 'one-at-a-time' ? 'one-at-a-time' : 'all-at-once',
      timeLimitMinutes: minutes,
      extensionMinutes: extension,
      warningMinutes: warning,
      allowFlagging: source.allowFlagging !== false,
      showProgress: source.showProgress !== false
    };
  }  function _quizUseDraftField(namespace, itemKey, field, initialValue) {
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
      return function () { window.clearTimeout(timer); };
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
    var statusState = React.useState(initial ? { state: 'restored', updatedAt: initial.updatedAt } : { state: 'idle', updatedAt: null });
    var status = statusState[0];
    var setStatus = statusState[1];
    React.useEffect(function () {
      function saved(event) {
        if (event && event.detail && event.detail.namespace === p.namespace) setStatus({ state: 'saved', updatedAt: event.detail.updatedAt });
      }
      function failed(event) {
        if (event && event.detail && event.detail.namespace === p.namespace) setStatus({ state: 'error', updatedAt: null });
      }
      window.addEventListener('alloflow:assessment-draft-saved', saved);
      window.addEventListener('alloflow:assessment-draft-error', failed);
      return function () {
        window.removeEventListener('alloflow:assessment-draft-saved', saved);
        window.removeEventListener('alloflow:assessment-draft-error', failed);
      };
    }, [p.namespace]);
    var timeLabel = status.updatedAt ? new Date(status.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    var message = status.state === 'restored' ? 'Restored your saved work from this device.' : status.state === 'saved' ? 'Saved locally' + (timeLabel ? ' at ' + timeLabel : '') + '.' : status.state === 'error' ? 'Local autosave is unavailable in this browser.' : 'Answers save automatically on this device.';
    return <div className={'rounded-lg border px-3 py-2 flex items-center gap-2 text-xs ' + (status.state === 'error' ? 'bg-amber-50 border-amber-300 text-amber-900' : status.state === 'restored' ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-white border-slate-200 text-slate-700')} role="status" aria-live="polite"><span aria-hidden="true">{status.state === 'error' ? '⚠' : status.state === 'restored' ? '↻' : '✓'}</span><span><strong>{message}</strong><span className="ml-1 text-slate-500">Drafts expire after 7 days.</span></span></div>;
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
      values: { profile: 'flexible', pacing: 'all-at-once', timeLimitMinutes: 0, extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true }
    }, {
      id: 'focused',
      label: 'Focused steps',
      description: 'Untimed, one question at a time',
      values: { profile: 'focused', pacing: 'one-at-a-time', timeLimitMinutes: 0, extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true }
    }, {
      id: 'timed-practice',
      label: 'Timed practice',
      description: '20 minutes with pause, warning, and extensions',
      values: { profile: 'timed-practice', pacing: 'one-at-a-time', timeLimitMinutes: 20, extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true }
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
    return <section className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4" aria-labelledby="assessment-delivery-heading"><div className="flex items-start justify-between gap-3"><div><h3 id="assessment-delivery-heading" className="font-black text-violet-950">Access &amp; delivery</h3><p className="text-xs text-violet-900 mt-1">Choose a neutral class-wide starting point, then customize it. No diagnosis or accommodation reason is recorded.</p></div><button type="button" onClick={function () { setExpanded(!expanded); }} aria-expanded={expanded} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-violet-300 text-violet-900">{expanded ? 'Hide settings' : 'Customize'}</button></div><div className="mt-4 rounded-lg border border-violet-200 bg-white p-3"><label className="block text-sm font-bold text-slate-800">Feedback timing<select data-assessment-feedback-timing value={settings.feedbackTiming} onChange={e => patch('feedbackTiming', e.target.value)} className="mt-2 block w-full min-h-11 rounded-lg border border-slate-400 bg-white p-2 text-sm text-slate-800"><option value="immediate">Immediate practice feedback</option><option value="after-submit">After submission</option><option value="teacher-release">When the teacher releases it</option></select></label><p className="mt-2 text-xs text-slate-600">Delayed feedback keeps correctness, explanations, and answer guides hidden while students work.</p>{settings.feedbackTiming === 'teacher-release' && <div className="mt-3"><button type="button" data-assessment-release-feedback onClick={p.onRelease} disabled={p.released || p.releasing || typeof p.onRelease !== 'function'} className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{p.released ? 'Feedback released' : p.releasing ? 'Releasing feedback...' : 'Release feedback to students'}</button><p className="mt-2 text-xs text-slate-600">{p.live ? 'Students in this session can view released feedback after submitting.' : 'Share the updated resource again so students with saved copies receive the release.'}</p>{p.releaseError && <p role="alert" className="mt-2 text-sm text-red-800">{p.releaseError}</p>}</div>}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">{presets.map(function (preset) {
      var active = settings.profile === preset.id;
      return <button key={preset.id} type="button" onClick={function () { apply(Object.assign({}, settings, preset.values)); }} aria-pressed={active} className={'text-left rounded-lg border p-3 transition-colors motion-reduce:transition-none ' + (active ? 'bg-violet-700 border-violet-800 text-white' : 'bg-white border-violet-200 text-violet-950 hover:border-violet-400')}><span className="block text-xs font-black">{preset.label}</span><span className={'block text-[11px] mt-1 ' + (active ? 'text-violet-100' : 'text-violet-800')}>{preset.description}</span></button>;
    })}</div>{expanded && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 p-3 rounded-lg bg-white border border-violet-200"><label className="text-xs font-bold text-slate-700">Pacing<select value={settings.pacing} onChange={function (e) { patch('pacing', e.target.value); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"><option value="all-at-once">All questions visible</option><option value="one-at-a-time">One at a time</option></select></label><label className="text-xs font-bold text-slate-700">Time limit (minutes)<input type="number" min="0" max="240" value={settings.timeLimitMinutes} onChange={function (e) { patch('timeLimitMinutes', Number(e.target.value)); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" /><span className="block text-[10px] font-normal text-slate-500 mt-1">0 means untimed</span></label><label className="text-xs font-bold text-slate-700">Extension step<input type="number" min="1" max="60" value={settings.extensionMinutes} onChange={function (e) { patch('extensionMinutes', Number(e.target.value)); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" /><span className="block text-[10px] font-normal text-slate-500 mt-1">Learners can add this privately</span></label><label className="text-xs font-bold text-slate-700">Warning (minutes)<input type="number" min="1" max="15" value={settings.warningMinutes} onChange={function (e) { patch('warningMinutes', Number(e.target.value)); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" /></label><label className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={settings.allowFlagging} onChange={function (e) { patch('allowFlagging', e.target.checked); }} />Allow learners to flag questions for review</label><label className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={settings.showProgress} onChange={function (e) { patch('showProgress', e.target.checked); }} />Show question progress</label><p className="sm:col-span-2 lg:col-span-4 text-[11px] text-slate-600">Timed assessments always support pause and extensions. Reaching zero opens the review screen; it never submits or deletes work automatically.</p></div>}</section>;
  }
  function AssessmentQuestionFlagButton(p) {
    return <button type="button" onClick={p.onToggle} aria-pressed={!!p.flagged} className={'text-xs font-bold px-2.5 py-1 rounded-lg border ' + (p.flagged ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}><span aria-hidden="true">{p.flagged ? '⚑ ' : '⚐ '}</span>{p.flagged ? 'Flagged for review' : 'Flag for review'}</button>;
  }
  function AssessmentTimerBar(p) {
    if (!p.enabled) return null;
    var seconds = Math.max(0, Number(p.remainingSeconds) || 0);
    var minutesPart = Math.floor(seconds / 60);
    var secondsPart = String(seconds % 60).padStart(2, '0');
    var warning = seconds <= (Number(p.warningMinutes) || 2) * 60;
    return <div className={'rounded-xl border-2 p-3 flex items-center gap-3 flex-wrap ' + (p.expired ? 'bg-rose-50 border-rose-300' : warning ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-300')} role="region" aria-label="Assessment timer"><div><div className="text-[10px] uppercase font-black tracking-wider text-slate-600">Time remaining</div><div role="timer" aria-live={warning ? 'polite' : 'off'} className={'text-xl font-black tabular-nums ' + (p.expired ? 'text-rose-800' : warning ? 'text-amber-900' : 'text-slate-800')}>{minutesPart + ':' + secondsPart}</div></div><div className="flex items-center gap-2 ml-auto flex-wrap"><button type="button" onClick={p.onTogglePause} disabled={p.expired} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-50">{p.running ? 'Pause timer' : 'Resume timer'}</button><button type="button" onClick={p.onExtend} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">{'+' + p.extensionMinutes + ' minutes'}</button><button type="button" onClick={p.onReview} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white">Review &amp; submit</button></div>{p.expired && <p className="basis-full text-xs font-semibold text-rose-900">The planned time has ended. Your work is safe—review it, add time, or submit when ready.</p>}</div>;
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
      try { previousFocusRef.current = document.activeElement; } catch (e) {}
      var timer = setTimeout(function () { try { if (closeRef.current) closeRef.current.focus(); } catch (e) {} }, 0);
      return function () {
        clearTimeout(timer);
        var previous = previousFocusRef.current;
        previousFocusRef.current = null;
        try { if (previous && typeof previous.focus === 'function') previous.focus(); } catch (e) {}
      };
    }, [p.open]);
    React.useEffect(function () { if (!p.open) setConfirmIncomplete(false); }, [p.open]);
    if (!p.open) return null;
    var progress = p.progress || { total: 0, answered: 0, unanswered: 0, flagged: 0, items: [] };
    function requestSubmit() {
      if (p.preview) return;
      if (progress.unanswered > 0 && !confirmIncomplete) {
        setConfirmIncomplete(true);
        return;
      }
      if (typeof p.onSubmit === 'function') p.onSubmit();
    }
    return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60" onMouseDown={function (e) { if (e.target === e.currentTarget) p.onClose(); }}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="assessment-review-title" tabIndex={-1} onKeyDown={function (e) { _quizHandleDialogKeyDown(e, dialogRef, p.onClose); }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border-2 border-indigo-300 shadow-2xl p-5"><div className="flex items-start justify-between gap-4"><div><h2 id="assessment-review-title" className="text-xl font-black text-slate-900">Review your assessment</h2><p className="text-sm text-slate-600 mt-1">Nothing is final until you choose Submit assessment.</p></div><button type="button" ref={closeRef} onClick={p.onClose} aria-label="Close review" className="w-9 h-9 rounded-full border border-slate-300 text-slate-700">×</button></div><div className="grid grid-cols-3 gap-2 my-4"><div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center"><div className="text-xl font-black text-emerald-800">{progress.answered}</div><div className="text-[10px] font-bold uppercase text-emerald-700">Answered</div></div><div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center"><div className="text-xl font-black text-amber-900">{progress.unanswered}</div><div className="text-[10px] font-bold uppercase text-amber-800">Unanswered</div></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center"><div className="text-xl font-black text-slate-800">{progress.flagged}</div><div className="text-[10px] font-bold uppercase text-slate-600">Flagged</div></div></div><div className="space-y-2">{progress.items.map(function (item) {
      return <button key={item.questionIdx} type="button" onClick={function () { p.onGo(item.questionIdx); }} className="w-full flex items-center gap-3 text-left rounded-lg border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50"><span className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ' + (item.answered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')}>{item.answered ? '✓' : '—'}</span><span className="flex-grow min-w-0"><span className="block text-[10px] uppercase font-bold text-slate-500">{'Question ' + (item.questionIdx + 1) + ' · ' + item.type}</span><span className="block text-sm text-slate-800 truncate">{item.label}</span></span>{item.flagged && <span className="text-amber-700 font-black" aria-label="Flagged">⚑</span>}</button>;
    })}</div>{progress.reflectionTotal > 0 && <p className="mt-3 text-xs text-slate-600">{'Reflections completed: ' + progress.reflectionAnswered + ' / ' + progress.reflectionTotal}</p>}{confirmIncomplete && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{progress.unanswered + ' question' + (progress.unanswered === 1 ? ' is' : 's are') + ' still unanswered. Submit anyway, or return to finish them.'}</div>}<div className="mt-5 flex items-center justify-end gap-2 flex-wrap"><button type="button" onClick={p.onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold">Keep working</button><button type="button" onClick={requestSubmit} disabled={p.preview} className={'px-4 py-2 rounded-lg text-white text-sm font-black ' + (confirmIncomplete ? 'bg-amber-700 hover:bg-amber-800' : 'bg-indigo-600 hover:bg-indigo-700')}>{p.preview ? 'Submission disabled in preview' : confirmIncomplete ? 'Submit with unanswered items' : 'Submit assessment'}</button></div></div></div>;
  }
  function AssessmentSubmittedPanel(p) {
    var receipt = p.receipt || {}, summary = receipt.summary || {}, status = p.sending ? 'sending' : receipt.delivery?.status === 'sending' ? 'pending' : receipt.delivery?.status || 'local';
    var received = status === 'received', local = !receipt.sessionCode, pending = !local && !received;
    return <section data-assessment-submitted className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-5 text-indigo-950"><h2 className="text-xl font-black">Assessment complete</h2><p data-assessment-delivery-status role="status" aria-live="polite" className="mt-2 font-bold">{received ? 'Received by teacher' : status === 'sending' ? 'Sending to teacher...' : 'Saved on this device'}</p><p className="mt-2 text-sm">{received ? 'Your teacher device confirmed receipt of the responses in this attempt.' : local ? 'Your completed responses are saved here. No teacher delivery was requested.' : receipt.delivery?.message || 'Teacher receipt is not confirmed. Your completed responses are saved here.'}</p><p className="mt-3 text-sm">{(summary.answered || 0) + ' of ' + (summary.total || 0) + ' questions answered'}</p><div className="mt-4 flex flex-wrap gap-2">{pending && <button type="button" onClick={p.onRetry} disabled={p.sending || !p.canRetry} className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{p.sending ? 'Sending...' : 'Retry delivery'}</button>}<button type="button" onClick={p.onDownload} className="min-h-11 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-900">Download my responses</button>{!pending && <button type="button" onClick={p.onStartAnother} className="min-h-11 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-900">Start another attempt</button>}</div>{pending && !p.canRetry && <p className="mt-3 text-sm">Reconnect to the original class activity to retry, or download your responses to share with your teacher.</p>}</section>;
  }
  // Sequence Sense answer key. The author supplies one "intentionallyWrongIndex",
  // but an adjacent swap leaves BOTH items out of place, so the accepted set is
  // derived from the displayed order itself: a displayed position counts as
  // misplaced when removing it leaves the remaining items in canonical order.
  // Canonical (or missing) order -> nothing is misplaced. A scramble no single
  // removal can repair falls back to the authored index, else every position
  // (all are out of place). Returns { orderIsCorrect, misplaced: [positions] }.
  function sequenceSenseTruth(presentedOrder, intentionallyWrongIndex, itemCount) {
    var n = Number(itemCount) || 0;
    var valid = n > 0 && Array.isArray(presentedOrder) && presentedOrder.length === n
      && presentedOrder.every(function (value) { return Number.isInteger(value) && value >= 0 && value < n; })
      && new Set(presentedOrder).size === n;
    if (!valid || presentedOrder.every(function (value, index) { return value === index; })) return { orderIsCorrect: true, misplaced: [] };
    var misplaced = [];
    for (var skip = 0; skip < n; skip++) {
      var previous = -1;
      var sorted = true;
      for (var j = 0; j < n && sorted; j++) {
        if (j === skip) continue;
        if (presentedOrder[j] < previous) sorted = false;
        previous = presentedOrder[j];
      }
      if (sorted) misplaced.push(skip);
    }
    if (!misplaced.length) {
      misplaced = Number.isInteger(intentionallyWrongIndex) && intentionallyWrongIndex >= 0 && intentionallyWrongIndex < n
        ? [intentionallyWrongIndex]
        : presentedOrder.map(function (_, index) { return index; });
    }
    return { orderIsCorrect: false, misplaced: misplaced };
  }
  // "items 2 and 3 were swapped" / "item 3 was misplaced" / "items 1, 3 and 4 were out of place"
  function describeSequenceMisplaced(misplaced) {
    var numbers = (Array.isArray(misplaced) ? misplaced : []).map(function (index) { return index + 1; });
    if (!numbers.length) return 'the order was correct';
    if (numbers.length === 1) return 'item ' + numbers[0] + ' was misplaced';
    if (numbers.length === 2 && numbers[1] === numbers[0] + 1) return 'items ' + numbers[0] + ' and ' + numbers[1] + ' were swapped';
    return 'items ' + numbers.slice(0, -1).join(', ') + ' and ' + numbers[numbers.length - 1] + ' were out of place';
  }
  function SequenceSenseCard(p) {
    var q = p.q;
    var canonicalItems = Array.isArray(q.items) ? q.items.filter(Boolean) : [];
    var intentionallyWrongIndex = typeof q.intentionallyWrongIndex === 'number' ? q.intentionallyWrongIndex : null;
    var orderingPrinciple = q.orderingPrinciple || 'chronological';
    var principleOptions = Array.isArray(q.principleOptions) && q.principleOptions.length >= 2 ? q.principleOptions : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
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
      var authored = Array.isArray(q.presentedOrder) ? q.presentedOrder : [];
      var isPermutation = authored.length === canonicalItems.length
        && authored.every(function (value) { return Number.isInteger(value) && value >= 0 && value < canonicalItems.length; })
        && new Set(authored).size === authored.length;
      return isPermutation ? authored.slice() : canonicalItems.map(function (_, i) { return i; });
    });
    var presentedOrder = presentedOrderState[0];
    // What is actually wrong with the displayed order (see sequenceSenseTruth):
    // for a swap both swapped positions count, so the student is never marked
    // wrong for pointing at the other half of the same mistake.
    var truth = sequenceSenseTruth(presentedOrder, intentionallyWrongIndex, canonicalItems.length);
    var actualOrderIsCorrect = truth.orderIsCorrect;
    var misplacedPositions = truth.misplaced;
    var orderState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'orderAnswer', null);
    var setOrderAnswer = orderState[1];
    // The student's arrangement (canonical indices); starts as the displayed order.
    var orderAnswer = Array.isArray(orderState[0]) && orderState[0].length === presentedOrder.length ? orderState[0] : presentedOrder;
    var arrangedItems = orderAnswer.map(function (canonicalIdx) { return canonicalItems[canonicalIdx]; });
    function moveOrderItem(position, delta) {
      var target = position + delta;
      if (position < 0 || position >= orderAnswer.length || target < 0 || target >= orderAnswer.length) return false;
      var next = orderAnswer.slice();
      next[position] = orderAnswer[target];
      next[target] = orderAnswer[position];
      setOrderAnswer(next);
      return true;
    }
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
    function finishArrange() {
      setStep(4);
    }
    function answerPrinciple(p2) {
      setPrincipleAnswer(p2);
      var step1Correct = verifyAnswer === 'yes' ? actualOrderIsCorrect : !actualOrderIsCorrect;
      var step2Correct;
      if (verifyAnswer === 'yes') {
        step2Correct = step1Correct;
      } else {
        step2Correct = misplacedPositions.indexOf(clickedIdx) >= 0;
      }
      var arrangeCorrect = orderAnswer.every(function (canonicalIdx, position) { return canonicalIdx === position; });
      var step3Correct = p2 === orderingPrinciple;
      var rawScore = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0) + (arrangeCorrect ? 1 : 0) + (step3Correct ? 1 : 0);
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var score = partialCredit ? rawScore : (rawScore === 4 ? 4 : 0);
      var status = score === 4 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var gradeResult = {
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        arrangeCorrect: arrangeCorrect,
        step3Correct: step3Correct,
        status: status,
        score: score
      };
      setGrade(gradeResult);
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
              orderAnswer: orderAnswer.slice(),
              principleAnswer: p2,
              score: score,
              status: status
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
      return gradeResult;
    }
    function reset() {
      setStep(1);
      setVerifyAnswer(null);
      setClickedIdx(null);
      setOrderAnswer(null);
      setPrincipleAnswer(null);
      setGrade(null);
    }
    _quizUseVoiceController(p, {
      getState: function () {
        var displayedItems = presentedOrder.map(function (canonicalIdx) { return canonicalItems[canonicalIdx]; }).filter(function (item) { return item != null; });
        var prompt = step === 1
          ? 'Is the displayed order correct? Say the order is correct or the order is wrong.'
          : step === 2
            ? 'Choose the misplaced item by its displayed number or exact text.'
            : step === 3
              ? 'Put the items in the correct order. Say move item 2 up or move item 3 down, then say done.'
              : step === 4
                ? 'Choose the ordering principle: ' + principleOptions.join(', ') + '.'
                : grade ? 'This sequence response has been checked. Say try again to reset it.' : '';
        return {
          type: 'sequence-sense',
          step: step,
          displayedItems: displayedItems,
          arrangedItems: arrangedItems.slice(),
          verifyAnswer: verifyAnswer,
          selectedItemIndex: typeof clickedIdx === 'number' ? clickedIdx : null,
          principleAnswer: principleAnswer,
          graded: !!grade,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: grade ? ['try-again'] : ['choose'],
          prompt: prompt
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Sequence response reset. Is the displayed order correct?' };
        }
        if (action !== 'choose') {
          return { ok: false, state: 'invalid-action', message: 'Use choose to answer the current sequence step.' };
        }
        if (grade || step === 'done') {
          return { ok: false, state: 'locked', message: 'This sequence response has already been checked. Say try again to reset it.' };
        }
        var choice = request && (request.choice != null ? request.choice : (request.value != null ? request.value : request.response));
        if (step === 1) {
          var normalized = String(choice == null ? '' : choice).trim().toLowerCase().replace(/[?!.,]+$/g, '');
          var verify = /^(?:yes|correct|right|the order is correct|the order is right)$/.test(normalized)
            ? 'yes'
            : /^(?:no|wrong|incorrect|the order is wrong|the order is incorrect|the order is not correct)$/.test(normalized) ? 'no' : '';
          if (!verify) return { ok: false, state: 'invalid-choice', message: 'Say the order is correct or the order is wrong.' };
          answerVerify(verify);
          return {
            ok: true, state: 'sequence-step', step: verify === 'no' ? 2 : 3,
            message: verify === 'no'
              ? 'Order marked wrong. Choose the misplaced item by its displayed number or exact text.'
              : 'Order marked correct. Put the items in the correct order, or say done to keep them as they are.'
          };
        }
        if (step === 2) {
          var displayed = presentedOrder.map(function (canonicalIdx) { return canonicalItems[canonicalIdx]; });
          var itemIdx = _quizVoiceNamedChoiceIndex(choice, displayed);
          if (itemIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available displayed item by number or exact text.' };
          answerMisplaced(itemIdx);
          return { ok: true, state: 'sequence-step', step: 3, selectedItemIndex: itemIdx, message: 'Item ' + (itemIdx + 1) + ' selected. Now put the items in the correct order: say move item 2 up or move item 3 down, then say done.' };
        }
        if (step === 3) {
          var arrangeText = String(choice == null ? '' : choice).trim().toLowerCase().replace(/[?!.,]+$/g, '').replace(/\s+/g, ' ');
          if (/^(?:done|finished|confirm|keep|next|the order is right|that is the order)$/.test(arrangeText)) {
            finishArrange();
            return { ok: true, state: 'sequence-step', step: 4, message: 'Order saved. Choose the ordering principle: ' + principleOptions.join(', ') + '.' };
          }
          var move = /^move\s+(?:item\s+)?(.+?)\s+(up|down)$/.exec(arrangeText);
          var movePosition = move ? _quizVoiceNamedChoiceIndex(move[1], arrangedItems) : -1;
          if (!move || movePosition < 0) return { ok: false, state: 'invalid-choice', message: 'Say move item 2 up, move item 3 down, or done.' };
          if (!moveOrderItem(movePosition, move[2] === 'up' ? -1 : 1)) return { ok: false, state: 'invalid-choice', message: 'Item ' + (movePosition + 1) + ' cannot move ' + move[2] + '.' };
          return { ok: true, state: 'sequence-step', step: 3, message: 'Moved ' + arrangedItems[movePosition] + ' ' + move[2] + '. Say done when the order is right.' };
        }
        var principleIdx = _quizVoiceNamedChoiceIndex(choice, principleOptions);
        if (step !== 4 || principleIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available ordering principle by number or exact name.' };
        var result = answerPrinciple(principleOptions[principleIdx]);
        var resultMessage = result.status === 'correct'
          ? 'Sequence response checked. All four parts are correct.'
          : result.status === 'partially-correct'
            ? 'Sequence response checked. You earned ' + result.score + ' of 4 points.'
            : 'Sequence response checked. This sequence needs review.';
        return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
      }
    });
    if (canonicalItems.length === 0) return null;
    var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Sequence Sense</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || 'Below is a sequence. Verify and explain.'}</p></div></div><ol className="space-y-1.5 mb-3">{presentedOrder.map(function (canonicalIdx, displayIdx) {
          var item = canonicalItems[canonicalIdx];
          var isClickable = step === 2;
          var isClicked = clickedIdx === displayIdx;
          var showCorrectness = grade !== null;
          var thisIsActuallyMisplaced = misplacedPositions.indexOf(displayIdx) >= 0;
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyMisplaced) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return <li key={displayIdx} onClick={isClickable ? function () {
            answerMisplaced(displayIdx);
          } : null} className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' + rowClass} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined} onKeyDown={isClickable ? function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              answerMisplaced(displayIdx);
            }
          } : undefined}><span className="flex-shrink-0 text-xs font-bold text-slate-600 w-6">{displayIdx + 1 + '.'}</span><span className="flex-1 text-sm text-slate-800">{item}</span>{showCorrectness && thisIsActuallyMisplaced && <span className="text-xs font-bold text-amber-700">↔ misplaced</span>}{showCorrectness && isClicked && !thisIsActuallyMisplaced && <span className="text-xs font-bold text-rose-700">✗</span>}</li>;
        })}</ol>{step === 1 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">Step 1 of 4 — Is this order correct?</div><div className="flex gap-2 flex-wrap"><button type="button" onClick={function () {
            answerVerify('yes');
          }} className="flex-1 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition-colors motion-reduce:transition-none">✓ Yes, correct</button><button type="button" onClick={function () {
            answerVerify('no');
          }} className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors motion-reduce:transition-none">✗ No, something is off</button>{allowIDK && <button type="button" onClick={markIDK} className="px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title={t("tooltips.skip_ai_explain")}><span aria-hidden="true">🤔 </span>I don't know</button>}</div></div>}{step === 2 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900">Step 2 of 4 — Click an item that's out of place above.</div></div>}{step === 3 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">Step 3 of 4 — Put the items in the correct order. If they are already right, leave them.</div><ol className="space-y-1.5 mb-2" aria-label="Your order">{orderAnswer.map(function (canonicalIdx, position) {
            return <li key={canonicalIdx} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white border-indigo-200"><span className="flex-shrink-0 text-xs font-bold text-slate-600 w-6">{position + 1 + '.'}</span><span className="flex-1 text-sm text-slate-800">{canonicalItems[canonicalIdx]}</span><button type="button" disabled={position === 0} aria-label={'Move up: ' + canonicalItems[canonicalIdx]} onClick={function () {
              moveOrderItem(position, -1);
            }} className="px-2 py-1 rounded border border-indigo-300 bg-white text-xs font-bold text-indigo-800 disabled:opacity-40">▲</button><button type="button" disabled={position === orderAnswer.length - 1} aria-label={'Move down: ' + canonicalItems[canonicalIdx]} onClick={function () {
              moveOrderItem(position, 1);
            }} className="px-2 py-1 rounded border border-indigo-300 bg-white text-xs font-bold text-indigo-800 disabled:opacity-40">▼</button></li>;
          })}</ol><button type="button" onClick={finishArrange} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors motion-reduce:transition-none">Done arranging</button></div>}{step === 4 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">Step 4 of 4 — What's the ordering principle?</div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{principleOptions.map(function (opt) {
            return <button key={opt} type="button" onClick={function () {
              answerPrinciple(opt);
            }} className="px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors motion-reduce:transition-none">{opt}</button>;
          })}</div></div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-2 flex-wrap"><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 4 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review')}</span></div>{grade.status !== 'idk' && <ul className={'space-y-1 text-sm text-' + statusColor + '-900'}><li>{(grade.step1Correct ? '✓ ' : '✗ ') + 'Verify: ' + (actualOrderIsCorrect ? 'order was correct' : describeSequenceMisplaced(misplacedPositions)) + (grade.step1Correct ? '' : ' (you said "' + verifyAnswer + '")')}</li>{verifyAnswer === 'no' && <li>{(grade.step2Correct ? '✓ ' : '✗ ') + 'Diagnose: ' + (grade.step2Correct ? 'you found a misplaced item' : (actualOrderIsCorrect ? 'nothing was misplaced' : describeSequenceMisplaced(misplacedPositions) + (misplacedPositions.length > 1 ? ' (either one counts)' : '')))}</li>}<li>{(grade.arrangeCorrect ? '✓ ' : '✗ ') + 'Arrange: ' + (grade.arrangeCorrect ? 'your order matched' : 'correct order is ' + canonicalItems.join(' → '))}</li><li>{(grade.step3Correct ? '✓ ' : '✗ ') + 'Principle: ' + (grade.step3Correct ? '"' + orderingPrinciple + '"' : 'correct answer was "' + orderingPrinciple + '" (you picked "' + principleAnswer + '")')}</li></ul>}<div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={reset} className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">Try again</button>{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">🤖 Explain this concept</button>}</div></div>}{explainer.open && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          // p.callTTS returns the audio URL without playing — never wired up
          // a playback step here, so the original button silently fetched and
          // discarded the audio. Route through AlloSpeechPlayer instead: it
          // plays, respects mute, allows click-stop, and toasts on failure.
          try {
            if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);
            else p.callTTS(explainer.text);
          } catch (e) {}
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>;
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
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
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
      var score = partialCredit ? rawScore : (rawScore === 2 ? 2 : 0);
      var status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var gradeResult = {
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        status: status,
        score: score
      };
      setGrade(gradeResult);
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
      return gradeResult;
    }
    function reset() {
      setStep(1);
      setClickedPairIdx(null);
      setPartnerAnswer(null);
      setGrade(null);
    }
    _quizUseVoiceController(p, {
      getState: function () {
        var partnerOptions = candidatePartners.length > 0 ? candidatePartners.slice() : [correctPartnerForWrong];
        var prompt = step === 1
          ? 'Choose the mismatched pair by number or by saying its exact left and right text.'
          : step === 2
            ? 'Choose the replacement partner: ' + partnerOptions.join(', ') + '.'
            : grade ? 'This relation response has been checked. Say try again to reset it.' : '';
        return {
          type: 'relation-mismatch',
          step: step,
          pairs: pairs.map(function (pair) { return { left: String(pair.left), right: String(pair.right) }; }),
          selectedPairIndex: typeof clickedPairIdx === 'number' ? clickedPairIdx : null,
          partnerOptions: step === 2 ? partnerOptions : [],
          partnerAnswer: partnerAnswer,
          graded: !!grade,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: grade ? ['try-again'] : ['choose'],
          prompt: prompt
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Relation response reset. Choose the mismatched pair.' };
        }
        if (action !== 'choose') {
          return { ok: false, state: 'invalid-action', message: 'Use choose to answer the current relation step.' };
        }
        if (grade || step === 'done') {
          return { ok: false, state: 'locked', message: 'This relation response has already been checked. Say try again to reset it.' };
        }
        var choice = request && (request.choice != null ? request.choice : (request.value != null ? request.value : request.response));
        if (step === 1) {
          var pairNames = pairs.map(function (pair) { return String(pair.left) + ' with ' + String(pair.right); });
          var pairIdx = _quizVoiceNamedChoiceIndex(choice, pairNames);
          if (pairIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available pair by number or exact pair text.' };
          answerWhichWrong(pairIdx);
          var options = candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong];
          return { ok: true, state: 'relation-step', step: 2, selectedPairIndex: pairIdx, message: 'Pair ' + (pairIdx + 1) + ' selected. Choose the replacement partner: ' + options.join(', ') + '.' };
        }
        var partnerOptions = candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong];
        var partnerIdx = _quizVoiceNamedChoiceIndex(choice, partnerOptions);
        if (step !== 2 || partnerIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available replacement partner by number or exact name.' };
        var result = answerPartner(partnerOptions[partnerIdx]);
        var resultMessage = result.status === 'correct'
          ? 'Relation response checked. Both parts are correct.'
          : result.status === 'partially-correct'
            ? 'Relation response checked. You earned ' + result.score + ' of 2 points.'
            : 'Relation response checked. Both parts need review.';
        return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
      }
    });
    if (pairs.length === 0) return null;
    var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
    var wrongPairLeft = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Relation Mismatch</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || 'One of these pairs is wrong. Find it and fix it.'}</p></div></div><div className="space-y-1.5 mb-3">{pairs.map(function (pair, idx) {
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
          return <div key={idx} onClick={isClickable ? function () {
            answerWhichWrong(idx);
          } : null} className={'grid grid-cols-2 gap-3 px-3 py-2 rounded-lg border ' + rowClass} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined} onKeyDown={isClickable ? function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              answerWhichWrong(idx);
            }
          } : undefined}><span className="text-sm font-semibold text-slate-800">{pair.left}</span><span className="text-sm text-slate-700 flex items-center justify-between gap-2"><span>{'↔ ' + pair.right}</span>{showCorrectness && thisIsActuallyWrong && <span className="text-xs font-bold text-amber-700 flex-shrink-0">wrong</span>}{showCorrectness && isClicked && !thisIsActuallyWrong && <span className="text-xs font-bold text-rose-700 flex-shrink-0">✗</span>}</span></div>;
        })}</div>{step === 1 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="flex items-center justify-between gap-2 flex-wrap"><div className="text-sm font-semibold text-indigo-900">Step 1 of 2 — Click the pair that's wrong above.</div>{allowIDK && <button type="button" onClick={markIDK} className="px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title={t("tooltips.skip_ai_explain")}><span aria-hidden="true">🤔 </span>{t("ui_common.i_dont_know")}</button>}</div></div>}{step === 2 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">{'Step 2 of 2 — Which item should "' + (clickedPairIdx !== null && pairs[clickedPairIdx] ? pairs[clickedPairIdx].left : wrongPairLeft) + '" have been paired with?'}</div><div className="grid grid-cols-2 gap-2">{(candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong]).map(function (cand) {
            return <button key={cand} type="button" onClick={function () {
              answerPartner(cand);
            }} className="px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors motion-reduce:transition-none">{cand}</button>;
          })}</div></div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-2 flex-wrap"><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review')}</span></div>{grade.status !== 'idk' && <ul className={'space-y-1 text-sm text-' + statusColor + '-900'}><li>{(grade.step1Correct ? '✓ ' : '✗ ') + 'Find: ' + (grade.step1Correct ? 'you spotted the wrong pair' : 'the wrong pair was "' + wrongPairLeft + ' ↔ ' + (pairs[wrongPairIndex] ? pairs[wrongPairIndex].right : '') + '"')}</li><li>{(grade.step2Correct ? '✓ ' : '✗ ') + 'Fix: ' + (grade.step2Correct ? 'correct partner — "' + correctPartnerForWrong + '"' : 'correct partner was "' + correctPartnerForWrong + '" (you picked "' + partnerAnswer + '")')}</li></ul>}<div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={reset} className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">Try again</button>{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">🤖 Explain this concept</button>}</div></div>}{explainer.open && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          // p.callTTS returns the audio URL without playing — never wired up
          // a playback step here, so the original button silently fetched and
          // discarded the audio. Route through AlloSpeechPlayer instead: it
          // plays, respects mute, allows click-stop, and toasts on failure.
          try {
            if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);
            else p.callTTS(explainer.text);
          } catch (e) {}
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>;
  }
  function McqEnhancements(p) {
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
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
    return <div className="mt-3 ml-9 space-y-2">{(aiExplainerEnabled || allowIDK) && <div className="flex items-center gap-2 flex-wrap">{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors motion-reduce:transition-none" aria-label={t("a11y.explain_concept")} title={t("tooltips.quick_ai_explanation")}><span aria-hidden="true">🤖 </span>{t("ui_common.explain_concept_action")}</button>}{allowIDK && !idkMarked && <button type="button" onClick={markIDK} className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title="Skip — no penalty. The AI will explain the concept."><span aria-hidden="true">🤔 </span>I don't know</button>}{idkMarked && <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900">Marked "I don't know"</span>}</div>}{explainer.open && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          // Route through AlloSpeechPlayer for mute respect / click-stop / toast.
          if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);
          else p.callTTS(explainer.text);
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}{allowConfidence && <div className="flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">How sure were you?</span>{['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = {
            knew: 'I knew this',
            guessed: 'I guessed',
            'no-idea': 'No idea'
          };
          var active = confidence === lvl;
          return <button key={lvl} type="button" onClick={function () {
            setConfidence(lvl);
          }} className={'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[lvl]}</button>;
        })}</div>}</div>;
  }
  function AssessmentItemAnalysisPanel(p) {
    var analysis = p.analysis || {};
    var items = Array.isArray(analysis.items) ? analysis.items : [];
    var openState = React.useState(false);
    var open = openState[0];
    var setOpen = openState[1];
    var handoffState = React.useState(false);
    var handoffOpen = handoffState[0];
    var setHandoffOpen = handoffState[1];
    var handoffBusyState = React.useState(false);
    var handoffBusy = handoffBusyState[0];
    var setHandoffBusy = handoffBusyState[1];
    var handoffFeedbackState = React.useState('');
    var handoffFeedback = handoffFeedbackState[0];
    var setHandoffFeedback = handoffFeedbackState[1];
    var handoffDialogRef = React.useRef(null);
    var handoffTriggerRef = React.useRef(null);
    var hasRespondentItems = items.length > 0 && items.some(function (item) {
      return item.respondents > 0;
    });
    React.useEffect(function () {
      if (!handoffOpen) return undefined;
      if (!hasRespondentItems) {
        setHandoffOpen(false);
        setHandoffFeedback('');
        return undefined;
      }
      var restore = _quizIsolateDialog(handoffDialogRef.current);
      if (handoffDialogRef.current && typeof handoffDialogRef.current.focus === 'function') {
        handoffDialogRef.current.focus();
      }
      return restore;
    }, [handoffOpen, hasRespondentItems]);
    if (!hasRespondentItems) return null;
    function closeAlloSheetReview() {
      if (handoffBusy) return;
      setHandoffOpen(false);
      setHandoffFeedback('');
      window.setTimeout(function () {
        if (handoffTriggerRef.current && typeof handoffTriggerRef.current.focus === 'function') {
          handoffTriggerRef.current.focus();
        }
      }, 0);
    }
    function openAlloSheetReview(event) {
      handoffTriggerRef.current = event && event.currentTarget || null;
      setHandoffFeedback('');
      setHandoffOpen(true);
    }
    function confirmAlloSheetReview() {
      if (handoffBusy || typeof p.onOpenAlloSheet !== 'function') return;
      var module = window.AlloModules && window.AlloModules.QuizLiveAggregators;
      if (!module || typeof module.buildQuizAlloSheetEnvelope !== 'function') {
        setHandoffFeedback('Quiz item analysis is still loading. Try again in a moment.');
        return;
      }
      var envelope;
      try {
        envelope = module.buildQuizAlloSheetEnvelope(
          p.quizState || {},
          p.generatedContent,
          p.roster || {},
          {
            aiGradedCache: p.aiGradedCache || {},
            teacherOverrides: p.teacherOverrides || {},
            mode: p.mode,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error) {
        setHandoffFeedback(error && error.message || 'Quiz item analysis could not prepare a bounded table.');
        return;
      }
      setHandoffBusy(true);
      setHandoffFeedback('Opening AlloSheet and waiting for secure receipt…');
      var pending;
      try {
        pending = p.onOpenAlloSheet(envelope);
      } catch (error) {
        pending = Promise.reject(error);
      }
      Promise.resolve(pending).then(function (opened) {
        if (opened === false || opened == null) throw new Error('AlloSheet did not open.');
        setHandoffBusy(false);
        setHandoffFeedback('');
        setHandoffOpen(false);
        window.setTimeout(function () {
          if (handoffTriggerRef.current && typeof handoffTriggerRef.current.focus === 'function') {
            handoffTriggerRef.current.focus();
          }
        }, 0);
      }).catch(function (error) {
        setHandoffBusy(false);
        setHandoffFeedback(error && error.message || 'AlloSheet could not receive the reviewed item analysis.');
      });
    }
    function downloadCsv() {
      var rows = [['Question', 'Type', 'Responses', 'Gradable', 'Correct %', 'Omitted', 'IDK', 'Signal', 'Flags']];
      items.forEach(function (item) {
        rows.push([item.questionIdx + 1, item.type, item.respondents, item.gradableCount, item.correctRate == null ? '' : item.correctRate, item.omittedCount, item.idkCount, item.signalLabel, (item.flags || []).join('; ')]);
      });
      var csv = rows.map(function (row) { return row.map(function (cell) { var s = String(cell == null ? '' : cell); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\n');
      try {
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
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
    return <section className="mt-5 rounded-xl border-2 border-cyan-200 bg-cyan-50 p-4" aria-labelledby="item-analysis-heading"><div className="flex items-start justify-between gap-3 flex-wrap"><div><h4 id="item-analysis-heading" className="font-black text-cyan-950">Item analysis</h4><p className="text-xs text-cyan-900 mt-1">Difficulty, omissions, confidence mismatches, and MCQ choice patterns. Flags wait for at least 5 responses.</p></div><div className="flex gap-2 flex-wrap">{typeof p.onOpenAlloSheet === 'function' && <button type="button" ref={handoffTriggerRef} onClick={openAlloSheetReview} aria-haspopup="dialog" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-700 text-white border border-indigo-800">Open in AlloSheet</button>}<button type="button" onClick={downloadCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-cyan-300 text-cyan-900">Export CSV</button><button type="button" onClick={function () { setOpen(!open); }} aria-expanded={open} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-800 text-white">{open ? 'Hide details' : 'Review items'}</button></div></div>{open && <div className="space-y-3 mt-4">{items.map(function (item) {
      if (item.respondents === 0) return <div key={item.questionIdx} className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs font-black text-slate-700">{'Q' + (item.questionIdx + 1) + ' · No responses yet'}</div><p className="text-sm text-slate-600 mt-1">{item.questionText}</p></div>;
      var rateColor = item.correctRate == null ? 'slate' : item.correctRate < 40 ? 'rose' : item.correctRate > 85 ? 'emerald' : 'indigo';
      return <article key={item.questionIdx} className="rounded-lg border border-cyan-200 bg-white p-3"><div className="flex items-start gap-3"><div className="flex-grow min-w-0"><div className="text-[10px] uppercase font-black tracking-wider text-slate-500">{'Q' + (item.questionIdx + 1) + ' · ' + item.type}</div><p className="text-sm font-semibold text-slate-800 mt-1">{item.questionText}</p></div><div className={'rounded-lg px-3 py-2 text-center bg-' + rateColor + '-50 text-' + rateColor + '-900 border border-' + rateColor + '-200'}><div className="text-lg font-black">{item.unscored ? 'Unscored' : item.correctRate == null ? '—' : item.correctRate + '%'}</div><div className="text-[9px] uppercase font-bold">{item.unscored ? 'distribution' : 'correct'}</div></div></div><div className="flex gap-2 flex-wrap mt-3 text-[11px]"><span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-bold">{item.respondents + ' responses'}</span><span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-bold">{item.omittedCount + ' omitted'}</span>{item.idkCount > 0 && <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-1 font-bold">{item.idkCount + ' IDK'}</span>}<span className={'rounded-full px-2 py-1 font-bold ' + (item.smallSample ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800')}>{item.signalLabel}</span></div>{Array.isArray(item.options) && item.options.length > 0 && <div className="space-y-1.5 mt-3">{item.options.map(function (option) {
        var width = item.respondents > 0 ? Math.round(option.count / item.respondents * 100) : 0;
        return <div key={option.optionIdx} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-xs"><span className={'font-black ' + (!item.unscored && option.correct ? 'text-emerald-700' : 'text-slate-600')}>{String.fromCharCode(65 + option.optionIdx)}</span><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={!item.unscored && option.correct ? 'h-full bg-emerald-500' : item.unscored ? 'h-full bg-purple-500' : 'h-full bg-cyan-500'} style={{ width: width + '%' }} /></div><span className="text-slate-600 tabular-nums">{option.count + ' · ' + width + '%'}</span></div>;
      })}</div>}{item.flags && item.flags.length > 0 && <ul className="mt-3 space-y-1">{item.flags.map(function (flag, idx) { return <li key={idx} className="text-xs rounded bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1">{'⚑ ' + flag}</li>; })}</ul>}{item.smallSample && !item.unscored && <p className="text-[10px] text-slate-500 mt-2">Early signal only—no quality flag is assigned until 5 learners respond.</p>}</article>;
    })}</div>}{handoffOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/75 p-4" role="presentation"><div ref={handoffDialogRef} role="dialog" aria-modal="true" aria-labelledby="quiz-allosheet-review-title" aria-describedby="quiz-allosheet-review-summary quiz-allosheet-review-privacy" aria-busy={handoffBusy} tabIndex={-1} onKeyDown={function (event) { _quizHandleDialogKeyDown(event, handoffDialogRef, function () { if (!handoffBusy) closeAlloSheetReview(); }); }} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-4 border-indigo-300 bg-white p-5 text-slate-900 shadow-2xl"><h3 id="quiz-allosheet-review-title" className="text-xl font-black text-indigo-950">Review Quiz item analysis for AlloSheet</h3><p id="quiz-allosheet-review-summary" className="mt-2 text-sm text-slate-700">This creates one aggregate table with up to 100 item rows. It includes question number, item type, response and scoring counts, correct rate, sample status, and bounded signal codes.</p><p id="quiz-allosheet-review-privacy" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><strong>Excluded:</strong> learner names and IDs, question and option wording, raw answers, reflections, AI feedback, session codes, resource IDs, and cohort arrays. Signal codes remain blank until at least five learners respond. The transfer cannot enable AI or write back to Quiz.</p><div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3"><h4 className="text-sm font-black text-slate-900">Fields sent</h4><p className="mt-1 text-xs text-slate-700">Question number; item type; unscored status; respondents; omitted, gradable, correct, partial, incorrect, IDK, awaiting-review, and high-confidence-incorrect counts; correct-rate percent; sample status; signal codes.</p><p className="mt-2 text-xs font-semibold text-slate-700">{items.length + ' authored item' + (items.length === 1 ? '' : 's') + ' available for bounded aggregate review.'}</p></div>{handoffFeedback && <p className={'mt-3 rounded-lg p-3 text-sm font-semibold ' + (handoffBusy ? 'bg-indigo-50 text-indigo-900' : 'bg-rose-50 text-rose-900')} role={handoffBusy ? 'status' : 'alert'} aria-live="polite">{handoffFeedback}</p>}<div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={closeAlloSheetReview} disabled={handoffBusy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">Cancel</button><button type="button" onClick={confirmAlloSheetReview} disabled={handoffBusy} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{handoffBusy ? 'Waiting for AlloSheet…' : 'Confirm and open AlloSheet'}</button></div></div></div>}</section>;
  }  function LiveResultsDashboard(p) {
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
      return <span className={'flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ' + bgClass} title={'Student rated: ' + labels[confidence] + note}>{'🎯 ' + labels[confidence]}</span>;
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
          if (explainerCloseBtnRef.current) explainerCloseBtnRef.current.focus();
          else if (explainerDialogRef.current) explainerDialogRef.current.focus();
        } catch (e) {}
      }) : setTimeout(function () {
        try {
          if (explainerCloseBtnRef.current) explainerCloseBtnRef.current.focus();
          else if (explainerDialogRef.current) explainerDialogRef.current.focus();
        } catch (e) {}
      }, 0);
      return function () {
        if (typeof cancelAnimationFrame === 'function' && raf) {
          try { cancelAnimationFrame(raf); } catch (e) {}
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
        if (window.alloCopyText) { window.alloCopyText(explainerModal.text); } else { navigator.clipboard.writeText(explainerModal.text); }
      } catch (e) {}
    }
    function playExplainer() {
      if (!explainerModal.text || typeof p.callTTS !== 'function') return;
      try {
        if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainerModal.text);
        else p.callTTS(explainerModal.text);
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
    var itemAnalysis = { items: [] };
    try {
      if (typeof aggsMod.aggregateItemAnalysis === 'function') itemAnalysis = aggsMod.aggregateItemAnalysis(quizState, generatedContent, roster, aiGradedCache, teacherOverrides);
    } catch (e) {
      console.warn('[LiveResultsDashboard] item analysis failed:', e);
    }
    // Share an anonymous per-question aggregate to every connected student
    // over the P2P quiz channel (shell hook; nothing stored, no names).
    var canShareResults = typeof window !== 'undefined' && typeof window.__alloQuizShareResults === 'function'
      && (variant === 'liveHeatmap') && Array.isArray(data.bars) && data.bars.some(function (b) { return b.total > 0 && !b.unscored; });
    var shareResultsToClass = function () {
      var items = data.bars.filter(function (b) { return b.total > 0 && !b.unscored; }).map(function (b) {
        return {
          label: 'Q' + (b.questionIdx + 1) + ' — ' + String(b.questionText || '').slice(0, 70),
          count: b.correct + '/' + b.total,
          percent: b.total > 0 ? Math.round(b.correct / b.total * 100) : 0
        };
      });
      var ok = window.__alloQuizShareResults({ title: t('quiz.shared_results_title') || 'How the class did', items: items });
      if (window.AlloFlowUX) window.AlloFlowUX.toast(ok ? (t('quiz.results_shared') || 'Anonymous results shared with the class.') : (t('quiz.results_share_failed') || 'Could not share — no students connected.'), ok ? 'success' : 'error');
    };
    var header = <div className="flex items-center gap-2 mb-3 flex-wrap"><span className="text-2xl" aria-hidden="true">{modeIcon}</span><h3 className="font-black text-lg text-slate-800">{'Live Results — ' + modeLabel}</h3><span className="text-xs text-slate-600">{data.totalStudents + ' student' + (data.totalStudents === 1 ? '' : 's') + ' · ' + data.totalQuestions + ' question' + (data.totalQuestions === 1 ? '' : 's')}</span>{inFlightCount > 0 && <span className={'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 animate-pulse ' + quizreducedMotionClass} role="status" aria-live="polite" aria-label={'AI grading ' + inFlightCount + ' open response' + (inFlightCount === 1 ? '' : 's')} title={inFlightCount + ' open-response answer' + (inFlightCount === 1 ? '' : 's') + ' being graded by AI'}><span aria-hidden="true">✨ </span>{'AI grading ' + inFlightCount + '…'}</span>}{canShareResults && <button type="button" onClick={shareResultsToClass} className="ml-auto text-xs font-bold px-3 py-1 rounded-full border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-colors motion-reduce:transition-none" title={t('quiz.share_results_tooltip') || 'Send anonymous per-question results to every connected student (peer-to-peer, nothing stored)'} aria-label={t('quiz.share_results_aria') || 'Share anonymous results with the class'}><span aria-hidden="true">📢 </span>{t('quiz.share_results_btn') || 'Share anonymous results'}</button>}</div>;
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
      return <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 mb-4">{header}<p className="text-sm text-slate-600 italic">Waiting for student responses. Results will appear here as students submit answers in this live session.</p></div>;
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
          var pct = row.totalEvaluated > 0 ? Math.round(row.totalCorrect / row.totalEvaluated * 100) : null;
          var line = [row.displayName, row.attemptStatus || 'not-started', row.totalAnswered, row.totalCorrect, row.totalIdk, pct == null ? 'Unscored' : pct + '%'];
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
        if (!cell) return <span className="text-slate-600" title={t("tooltips.no_response")}>—</span>;
        if (cell.status === 'correct') return <span className="text-emerald-600" title={cell.aiGraded ? 'AI-graded correct' : 'Correct'}>✓</span>;
        if (cell.status === 'incorrect') return <span className="text-rose-600" title={cell.aiGraded ? 'AI-graded incorrect' : 'Incorrect'}>✗</span>;
        if (cell.status === 'idk') return <span className="text-sky-600" title={t("tooltips.marked_unknown")}>🤔</span>;
        if (cell.status === 'partially-correct') return <span className="text-amber-600" title={t("tooltips.partially_correct")}>◐</span>;
        return <span className="text-slate-600" title={t("tooltips.submitted_ungraded")}>·</span>;
      };
      body = <div><div className="flex items-center justify-end mb-2"><button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 transition-colors motion-reduce:transition-none" aria-label={t("a11y.export_gradebook_csv")} data-help-key="quiz_csv_export_btn" title={t("tooltips.download_gradebook_csv")}><span aria-hidden="true">📥 </span>{t("ui_common.export_csv")}</button></div><div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-100"><th scope="col" className="w-7 px-1 py-1.5" aria-label={t("a11y.expand_row")} /><th scope="col" className="text-left px-2 py-1.5 font-bold text-slate-700">Student</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">Attempt</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">Answered</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">Correct</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">IDK</th></tr></thead><tbody>{data.studentRows.map(function (row) {
                var pct = row.totalEvaluated > 0 ? Math.round(row.totalCorrect / row.totalEvaluated * 100) : null;
                var isExpanded = !!expandedRows[row.uid];
                var canExpand = row.totalAnswered > 0;
                var summaryRow = <tr key={row.uid + ':summary'} className={'border-t border-slate-200 ' + (canExpand ? 'cursor-pointer hover:bg-indigo-50/40' : '')} onClick={canExpand ? function () {
                  toggleRowExpanded(row.uid);
                } : undefined}><td className="text-center px-1 py-1.5">{canExpand ? <button type="button" aria-expanded={isExpanded} aria-label={(isExpanded ? 'Collapse' : 'Expand') + ' ' + row.displayName + ' details'} className="text-slate-600 hover:text-indigo-600 transition-colors motion-reduce:transition-none text-xs font-mono" onClick={function (e) {
                      e.stopPropagation();
                      toggleRowExpanded(row.uid);
                    }}>{isExpanded ? '▼' : '▶'}</button> : <span className="text-slate-600 text-xs">·</span>}</td><th scope="row" className="px-2 py-1.5 text-left font-medium text-slate-800">{row.displayName}</th><td className="text-center px-2 py-1.5"><span className={'text-[10px] font-black uppercase px-2 py-0.5 rounded ' + (row.attemptStatus === 'submitted' ? 'bg-emerald-100 text-emerald-800' : row.attemptStatus === 'in-progress' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600')}>{row.attemptStatus === 'submitted' ? 'Submitted' : row.attemptStatus === 'in-progress' ? 'In progress' : 'Not started'}</span></td><td className="text-center px-2 py-1.5"><span className="text-xs font-mono text-slate-600">{row.totalAnswered + ' / ' + data.totalQuestions}</span></td><td className="text-center px-2 py-1.5">{row.totalEvaluated > 0 ? <span className={'text-xs font-bold px-2 py-0.5 rounded ' + (pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}>{row.totalCorrect + ' (' + pct + '%)'}</span> : row.totalUnscored > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">Unscored</span> : <span className="text-xs text-slate-600">—</span>}</td><td className="text-center px-2 py-1.5">{row.totalIdk > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">{row.totalIdk}</span> : <span className="text-xs text-slate-600">0</span>}</td></tr>;
                if (!isExpanded) return summaryRow;
                var detailRow = <tr key={row.uid + ':detail'} className="border-t border-slate-100 bg-indigo-50/30"><td colSpan={6} className="px-3 py-3"><div className="space-y-2">{row.byQuestion.map(function (cell, qIdx) {
                        var qNum = qIdx + 1;
                        var qSnippet = cell && cell.questionText ? cell.questionText.slice(0, 90) + (cell.questionText.length > 90 ? '…' : '') : 'Question ' + qNum;
                        var border = !cell ? 'border-slate-200 bg-white' : cell.status === 'correct' ? 'border-emerald-200 bg-emerald-50/50' : cell.status === 'incorrect' ? 'border-rose-200 bg-rose-50/50' : cell.status === 'idk' ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 bg-white';
                        return <div key={qIdx} className={'p-2 rounded border ' + border}><div className="flex items-start gap-2 mb-1"><span className="text-base mt-0.5 leading-none">{statusBadge(cell)}</span><div className="flex-grow min-w-0"><p className="text-xs font-semibold text-slate-700 mb-0.5">{'Q' + qNum + '. ' + qSnippet}</p>{cell && cell.answerSummary ? <p className="text-xs text-slate-800 break-words"><span className="text-slate-600">Answered: </span>{cell.answerSummary}</p> : !cell && <p className="text-xs italic text-slate-600">No response yet</p>}</div>{cell && cell.aiGraded && <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800" aria-label={'Graded by AI as ' + cell.aiStatus} title={'Graded by AI (' + cell.aiStatus + ')'}><span aria-hidden="true">✨ </span>AI</span>}{cell && cell.teacherOverridden && <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800" aria-label={'Teacher override applied, was previously ' + (cell.priorStatus || 'unknown')} title={'Teacher override (was: ' + (cell.priorStatus || '?') + ')'}><span aria-hidden="true">🖊 </span>Teacher</span>}{cell && confidenceChip(cell.confidence, cell.status)}</div>{cell && cell.aiFeedback && <p className="text-[11px] italic text-indigo-900 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1 mt-1">"{cell.aiFeedback}"</p>}{cell && !cell.unscored && p.activeSessionCode && <div className="mt-1 flex items-center gap-1 flex-wrap" data-help-key="quiz_teacher_override_row"><span className="text-xs text-slate-700 font-semibold mr-1">Override:</span>{[{
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
                              return <button key={opt.s} type="button" onClick={function (e) {
                                e.stopPropagation();
                                setTeacherOverride(row.uid, qIdx, isActive ? null : opt.s);
                              }} className={'text-xs font-bold w-6 h-6 rounded transition-colors motion-reduce:transition-none ' + (isActive ? 'bg-' + opt.color + '-600 text-white border border-' + opt.color + '-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-' + opt.color + '-50 hover:border-' + opt.color + '-300')} aria-label={'Override status to ' + opt.label + (isActive ? ' (currently set, click to undo)' : '')} aria-pressed={isActive} title={'Set status to ' + opt.s + (isActive ? ' (click again to undo)' : '')}><span aria-hidden="true">{opt.icon}</span></button>;
                            })}{cell.teacherOverridden && <button type="button" onClick={function (e) {
                              e.stopPropagation();
                              setTeacherOverride(row.uid, qIdx, null);
                            }} className="text-xs font-bold px-2 h-6 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100" aria-label={t("a11y.remove_teacher_override")} title={t("tooltips.remove_teacher_override")}><span aria-hidden="true">↺ </span>undo</button>}</div>}</div>;
                      })}</div></td></tr>;
                return [summaryRow, detailRow];
              })}</tbody></table></div></div>;
    } else if (variant === 'preLessonGap') {
      body = <div className="space-y-2">{data.conceptCards.map(function (card) {
          var color = card.totalAnswered === 0 ? 'slate' : card.unscored ? 'purple' : card.percentCorrect >= 80 ? 'emerald' : card.percentCorrect >= 50 ? 'amber' : 'rose';
          var urgency = card.totalAnswered === 0 ? 'no responses' : card.unscored ? 'Unscored poll' : card.percentCorrect < 50 ? '⚠ Needs pre-teaching' : card.percentCorrect < 80 ? 'Review with class' : 'Class is ready';
          var showExplainBtn = !card.unscored && card.totalAnswered > 0 && card.percentCorrect < 80 && typeof p.callGemini === 'function';
          return <div key={card.questionIdx} className={'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'}><div className="flex items-start justify-between gap-3 mb-1"><span className={'text-xs font-bold uppercase tracking-wider text-' + color + '-800'}>{urgency}</span>{card.totalAnswered > 0 && <span className={'text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-200 text-' + color + '-900'}>{card.unscored ? card.totalAnswered + ' responses' : card.percentCorrect + '% correct'}</span>}</div><p className="text-sm text-slate-800 mb-2">{card.conceptText}</p><div className={'flex items-center gap-3 text-xs text-' + color + '-900'}>{!card.unscored && <><span>{card.correctCount + ' ✓'}</span><span>{card.incorrectCount + ' ✗'}</span></>}{card.unscored && <span>Distribution only — no right answer</span>}{card.idkCount > 0 && <span className="text-sky-700">{card.idkCount + ' 🤔'}</span>}<span className="text-slate-600">{'· ' + card.totalAnswered + ' / ' + data.totalStudents + ' students'}</span>{showExplainBtn && <button type="button" onClick={function () {
                openExplainer(card.questionIdx, card.conceptText);
              }} className="ml-auto inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors motion-reduce:transition-none" aria-label={t("a11y.explain_to_class")} data-help-key="quiz_explain_to_class_btn" title={t("tooltips.generate_concept_explainer")}><span aria-hidden="true">🎓 </span>{t("ui_common.explain_to_class")}</button>}</div></div>;
        })}</div>;
    } else if (variant === 'retentionCurve') {
      body = <div className="space-y-3"><p className="text-xs text-slate-600 italic mb-1">Cross-session retention. Concepts with longer time-since-last-attempt or unseen students surface first. Recent attempts shown as colored dots (green=correct, red=miss, sky=IDK).</p>{data.conceptRows.map(function (row) {
          var sortedStudents = row.students.slice().sort(function (a, b) {
            if (!a.seen && b.seen) return -1;
            if (a.seen && !b.seen) return 1;
            if (!a.seen && !b.seen) return 0;
            return (b.daysSinceLast || 0) - (a.daysSinceLast || 0);
          });
          var color = row.unseenCount > 0 ? 'rose' : row.maxDaysSinceLast >= 14 ? 'rose' : row.maxDaysSinceLast >= 7 ? 'amber' : 'emerald';
          return <div key={row.conceptId} className={'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'}><div className="flex items-center gap-2 mb-2"><span className={'text-xs font-bold uppercase tracking-wider text-' + color + '-800'}>{row.label}</span><span className={'ml-auto text-[10px] text-' + color + '-700'}>{row.unseenCount > 0 ? row.unseenCount + ' unseen · ' : ''}{'max ' + row.maxDaysSinceLast + 'd since seen'}</span></div><div className="space-y-1">{sortedStudents.map(function (s) {
                var dayBadgeColor = !s.seen ? 'rose' : s.daysSinceLast >= 14 ? 'rose' : s.daysSinceLast >= 7 ? 'amber' : 'emerald';
                return <div key={s.uid} className="flex items-center gap-2 text-xs"><span className="flex-shrink-0 text-slate-700 font-semibold w-32 truncate">{s.displayName}</span>{!s.seen ? <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">never seen</span> : <span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + dayBadgeColor + '-100 text-' + dayBadgeColor + '-800'}>{s.daysSinceLast + 'd ago'}</span>}{s.seen && <span className="flex items-center gap-0.5">{s.recent.map(function (att, attIdx) {
                      var dotColor = att.status === 'correct' ? '#10b981' : att.status === 'incorrect' ? '#ef4444' : att.status === 'idk' ? '#0ea5e9' : '#94a3b8';
                      return <span key={attIdx} className="inline-block rounded-full" style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: dotColor
                      }} title={att.status + ' on ' + new Date(att.ts).toLocaleDateString()} />;
                    })}</span>}{s.seen && typeof s.successRate === 'number' && <span className="text-slate-600 ml-auto">{s.correctAttempts + '/' + s.totalAttempts + ' (' + s.successRate + '%)'}</span>}</div>;
              })}</div></div>;
        })}</div>;
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
      body = <div className="space-y-2">{data.bars.map(function (bar) {
          var color = bar.total === 0 ? 'slate' : bar.unscored ? 'purple' : bar.percentCorrect >= 80 ? 'emerald' : bar.percentCorrect >= 50 ? 'amber' : 'rose';
          var pctCorrect = bar.total > 0 ? bar.correct / bar.total * 100 : 0;
          var pctIncorrect = bar.total > 0 ? bar.incorrect / bar.total * 100 : 0;
          var pctIdk = bar.total > 0 ? bar.idk / bar.total * 100 : 0;
          var pctSubmitted = bar.total > 0 ? bar.submitted / bar.total * 100 : 0;
          var qLabel = bar.questionText ? bar.questionText.slice(0, 70) + (bar.questionText.length > 70 ? '…' : '') : 'Question ' + (bar.questionIdx + 1);
          var canExpand = bar.total > 0;
          var isExpanded = !!expandedBars[bar.questionIdx];
          return <div key={bar.questionIdx} className="p-2 rounded bg-white border border-slate-200"><div className={'flex items-start gap-2 mb-1' + (canExpand ? ' cursor-pointer' : '')} onClick={canExpand ? function () {
              toggleBarExpanded(bar.questionIdx);
            } : undefined} role={canExpand ? 'button' : undefined} tabIndex={canExpand ? 0 : undefined} aria-expanded={canExpand ? isExpanded : undefined} aria-label={canExpand ? (isExpanded ? 'Collapse' : 'Expand') + ' question ' + (bar.questionIdx + 1) + ' student detail' : undefined} onKeyDown={canExpand ? function (e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleBarExpanded(bar.questionIdx);
              }
            } : undefined}>{canExpand && <span className="text-slate-600 hover:text-indigo-600 text-[10px] font-mono mt-0.5">{isExpanded ? '▼' : '▶'}</span>}<span className="text-xs text-slate-700 flex-1 min-w-0">{bar.questionIdx + 1 + '. ' + qLabel}</span>{bar.total > 0 && <span className={'flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-100 text-' + color + '-800'}>{bar.unscored ? 'Unscored' : bar.percentCorrect + '%'}</span>}</div>{bar.total > 0 ? <div className="flex h-3 rounded overflow-hidden border border-slate-200">{pctCorrect > 0 && <div style={{
                width: pctCorrect + '%',
                backgroundColor: '#10b981'
              }} title={bar.correct + ' correct'} />}{pctIncorrect > 0 && <div style={{
                width: pctIncorrect + '%',
                backgroundColor: '#ef4444'
              }} title={bar.incorrect + ' incorrect'} />}{pctIdk > 0 && <div style={{
                width: pctIdk + '%',
                backgroundColor: '#0ea5e9'
              }} title={bar.idk + ' IDK'} />}{pctSubmitted > 0 && <div style={{
                width: pctSubmitted + '%',
                backgroundColor: bar.unscored ? '#8b5cf6' : '#94a3b8'
              }} title={bar.unscored ? bar.submitted + ' poll responses' : bar.submitted + ' submitted (ungraded)'} />}</div> : <div className="h-3 rounded bg-slate-100 border border-slate-200" />}<div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">{!bar.unscored && <><span>{bar.correct + ' ✓'}</span><span>{bar.incorrect + ' ✗'}</span></>}{bar.unscored && <span className="text-purple-800 font-bold">Distribution only</span>}{bar.idk > 0 && <span className="text-sky-700">{bar.idk + ' 🤔'}</span>}{bar.submitted > 0 && <span className="text-slate-600">{bar.submitted + ' submitted'}</span>}<span className="ml-auto text-slate-600">{bar.total + ' / ' + data.totalStudents}</span></div>{isExpanded && Array.isArray(bar.byStudent) && bar.byStudent.length > 0 && <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">{bar.byStudent.map(function (s) {
                var sc = statusColor(s.status);
                return <div key={s.uid} className="flex items-start gap-2 text-xs"><span className={'flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ' + sc.bg + ' ' + sc.text}>{sc.icon}</span><span className="flex-shrink-0 font-semibold text-slate-700 w-32 truncate">{s.displayName}</span><span className="flex-grow min-w-0 break-words text-slate-700">{s.answerSummary || <em className="text-slate-600">(no text)</em>}</span>{s.aiGraded && <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-indigo-100 text-indigo-800" title={t("tooltips.ai_graded")}>✨</span>}{confidenceChip(s.confidence, s.status)}{s.aiFeedback && <span className="flex-shrink-0 italic text-[10px] text-indigo-800 truncate max-w-[12rem]" title={s.aiFeedback}>{'"' + s.aiFeedback.slice(0, 50) + (s.aiFeedback.length > 50 ? '…' : '') + '"'}</span>}</div>;
              })}</div>}</div>;
        })}</div>;
    }
    var explainerModalEl = explainerModal.open ? <div ref={explainerDialogRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-concept-explainer-title" onKeyDown={function (e) { _quizHandleDialogKeyDown(e, explainerDialogRef, closeExplainer); }} onClick={function (e) {
      if (e.target === e.currentTarget) closeExplainer();
    }}><div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border-2 border-indigo-300"><div className="flex items-start justify-between gap-3 mb-3"><div><h4 id="quiz-concept-explainer-title" className="font-black text-base text-slate-800"><span aria-hidden="true">🎓 </span>Explain to class</h4><p className="text-xs text-slate-600 mt-0.5">Concept the class missed:</p><p className="text-xs italic text-slate-700 mt-0.5">{'"' + (explainerModal.conceptText || '') + '"'}</p></div><button type="button" ref={explainerCloseBtnRef} onClick={closeExplainer} aria-label={t("a11y.close_concept_explainer")} className="flex-shrink-0 text-slate-600 hover:text-slate-700 text-xl leading-none  focus-visible:ring-2 focus-visible:ring-indigo-400 rounded">×</button></div>{explainerModal.loading ? <div className="p-4 text-center text-sm text-slate-600" role="status" aria-live="polite"><span className={'inline-block animate-pulse ' + quizreducedMotionClass}>✨ Generating explainer…</span></div> : explainerModal.error ? <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800" role="alert">{explainerModal.error}</div> : <div className="p-3 rounded bg-indigo-50 border border-indigo-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{explainerModal.text}</div>}<div className="flex items-center gap-2 mt-4 flex-wrap"><button type="button" onClick={function () {
            runExplainerCall(explainerModal.conceptText);
          }} disabled={explainerModal.loading} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50">↻ Regenerate</button>{!explainerModal.loading && !explainerModal.error && <button type="button" onClick={copyExplainer} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100">📋 Copy</button>}{!explainerModal.loading && !explainerModal.error && typeof p.callTTS === 'function' && <button type="button" onClick={playExplainer} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100" title={t("tooltips.play_explainer_aloud")}>🔊 Play aloud</button>}{!explainerModal.loading && !explainerModal.error && p.activeSessionCode && <button type="button" onClick={pushExplainerToStudents} disabled={pushState.pushing} className={'text-xs font-bold px-3 py-1.5 rounded ' + (pushState.pushed ? 'bg-emerald-700 text-white' : 'bg-amber-700 hover:bg-amber-800 text-white') + ' disabled:opacity-50'} aria-label={pushState.pushed ? 'Explainer pushed to all students' : 'Push this explainer to every student\'s screen'} data-help-key="quiz_push_to_students_btn" title={t("tooltips.send_explainer_to_students")}>{pushState.pushing ? 'Pushing…' : pushState.pushed ? <><span aria-hidden="true">✓ </span>Pushed to students</> : <><span aria-hidden="true">📡 </span>Push to all students</>}</button>}{pushState.error && <span className="text-[10px] text-rose-700 italic" role="alert">{pushState.error}</span>}<button type="button" onClick={closeExplainer} className="ml-auto text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">{t("ui_common.close")}</button></div></div></div> : null;
    var reflectionsData = null;
    try {
      reflectionsData = aggsMod.aggregateReflections && aggsMod.aggregateReflections(quizState, generatedContent, roster);
    } catch (e) {
      reflectionsData = null;
    }
    var reflectionsExpandedState = React.useState(true);
    var reflectionsExpanded = reflectionsExpandedState[0];
    var setReflectionsExpanded = reflectionsExpandedState[1];
    var reflectionsEl = reflectionsData ? <div className="mt-4 pt-4 border-t-2 border-indigo-100"><button type="button" onClick={function () {
        setReflectionsExpanded(!reflectionsExpanded);
      }} aria-expanded={reflectionsExpanded} className="flex items-center gap-2 text-sm font-bold text-indigo-800 hover:text-indigo-900"><span className="text-xs font-mono">{reflectionsExpanded ? '▼' : '▶'}</span><span>{'✏️ Reflections (' + reflectionsData.totalReflections + ')'}</span></button>{reflectionsExpanded && <div className="mt-3 space-y-3">{reflectionsData.buckets.map(function (bucket) {
          return <div key={bucket.reflectionIdx} className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1">{'Prompt ' + (bucket.reflectionIdx + 1)}</p><p className="text-sm italic text-slate-700 mb-2">{bucket.promptText}</p>{bucket.responses.length === 0 ? <p className="text-xs italic text-slate-600">No responses yet.</p> : <div className="space-y-2">{bucket.responses.map(function (r) {
                return <div key={r.uid} className="p-2 rounded bg-white border border-indigo-100"><p className="text-xs font-bold text-slate-700 mb-0.5">{r.displayName}</p><p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{r.text}</p></div>;
              })}</div>}</div>;
        })}</div>}</div> : null;
    return <div className="p-5 rounded-xl border-2 border-indigo-300 bg-white mb-4 shadow-sm" role="region" aria-label={t("a11y.live_results_dashboard")}>{header}{body}<AssessmentItemAnalysisPanel analysis={itemAnalysis} quizState={quizState} generatedContent={generatedContent} roster={roster} aiGradedCache={aiGradedCache} teacherOverrides={teacherOverrides} mode={mode} onOpenAlloSheet={p.onOpenAlloSheet} />{reflectionsEl}{explainerModalEl}</div>;
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
    var labels = { knew: 'I knew this', guessed: 'I guessed', 'no-idea': 'No idea' };
    return <div className="mt-2 flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">How sure were you?</span>{['knew', 'guessed', 'no-idea'].map(function (level) {
      return <button key={level} type="button" onClick={function () { p.onChange(level); }} className={'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (p.value === level ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[level]}</button>;
    })}</div>;
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
        return prev.indexOf(idx) === -1 ? prev.concat([idx]).sort(function (a, b) { return a - b; }) : prev.filter(function (n) { return n !== idx; });
      });
    }
    function submit() {
      if (selected.length === 0 || correctAnswers.length === 0) return;
      var correctIndices = options.map(function (opt, idx) { return correctAnswers.indexOf(opt) !== -1 ? idx : -1; }).filter(function (idx) { return idx >= 0; });
      var selectedCorrect = selected.filter(function (idx) { return correctIndices.indexOf(idx) !== -1; }).length;
      var selectedWrong = selected.length - selectedCorrect;
      var earned = Math.max(0, selectedCorrect - selectedWrong);
      var exact = selectedWrong === 0 && selectedCorrect === correctIndices.length;
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var score = partialCredit ? Math.round(100 * earned / Math.max(1, correctIndices.length)) : (exact ? 100 : 0);
      var status = exact ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var answer = { selectedIndices: selected.slice(), selectedTexts: selected.map(function (idx) { return options[idx]; }), status: status, score: score };
      setGrade({ status: status, score: score, selectedCorrect: selectedCorrect, selectedWrong: selectedWrong, totalCorrect: correctIndices.length });
      setSubmittedAnswer(answer);
      _quizEmitDeterministicAnswer(p, 'multi-select', answer, confidence);
      return answer;
    }
    function markIDK() {
      var answer = { idk: true };
      setGrade({ status: 'idk', score: 0 });
      setSubmittedAnswer(answer);
      _quizEmitDeterministicAnswer(p, 'multi-select', answer, confidence);
    }
    function updateConfidence(level) {
      setConfidence(level);
      if (submittedAnswer) _quizEmitDeterministicAnswer(p, 'multi-select', submittedAnswer, level);
    }
    function reset() { setSelected([]); setGrade(null); setSubmittedAnswer(null); setConfidence(null); }
    _quizUseVoiceController(p, {
      getState: function () {
        return {
          type: 'multi-select',
          selectedIndices: selected.slice(),
          selectedOptions: selected.map(function (idx) { return options[idx]; }).filter(function (value) { return value != null; }),
          graded: !!grade,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: grade ? ['try-again'] : (selected.length > 0 ? ['choose', 'check'] : ['choose']),
          prompt: grade
            ? 'These selections have been checked. Say try again to reset them.'
            : 'Select or deselect every answer that applies, then say check selections.'
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Multi-select response reset. Choose every option that applies.' };
        }
        if (grade) {
          return { ok: false, state: 'locked', message: 'These selections have already been checked. Say try again to reset them.' };
        }
        if (action === 'choose') {
          var choice = request && (request.choice != null ? request.choice : (request.option != null ? request.option : request.value));
          var optionIdx = _quizVoiceNamedChoiceIndex(choice, options);
          if (optionIdx < 0) {
            return { ok: false, state: 'invalid-choice', message: 'Choose an available option by letter, number, ordinal, or exact option text.' };
          }
          var mode = String(request && request.mode || 'select').toLowerCase();
          var wasSelected = selected.indexOf(optionIdx) >= 0;
          var shouldSelect = mode === 'toggle' ? !wasSelected : mode === 'deselect' ? false : true;
          var nextSelected = shouldSelect
            ? (wasSelected ? selected.slice() : selected.concat([optionIdx]).sort(function (a, b) { return a - b; }))
            : selected.filter(function (idx) { return idx !== optionIdx; });
          setSelected(nextSelected);
          var label = String.fromCharCode(65 + optionIdx);
          return {
            ok: true,
            state: shouldSelect ? 'selected' : 'deselected',
            selectedIndices: nextSelected,
            message: 'Option ' + label + (shouldSelect ? ' selected.' : ' deselected.') + ' ' + nextSelected.length + ' option' + (nextSelected.length === 1 ? ' is' : 's are') + ' currently selected.'
          };
        }
        if (action === 'check') {
          if (selected.length === 0) return { ok: false, state: 'inapplicable', message: 'Select at least one option before checking.' };
          if (correctAnswers.length === 0) return { ok: false, state: 'unsupported', message: 'This multi-select item has no answer key to check.' };
          var result = submit();
          var resultMessage = result.status === 'correct'
            ? 'Selections checked. All selections are correct.'
            : result.status === 'partially-correct'
              ? 'Selections checked. You earned ' + result.score + ' percent partial credit.'
              : 'Selections checked. Review the selected options and try again.';
          return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
        }
        return { ok: false, state: 'invalid-action', message: 'Use select, deselect, or check selections for this item.' };
      }
    });
    if (options.length === 0) return null;
    var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Multi-select</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || ''}</p><p className="text-[11px] text-slate-500 mt-1">{(!p.scoringPolicy || p.scoringPolicy.partialCredit !== false) ? 'Select every correct answer. Incorrect selections reduce partial credit.' : 'Select every correct answer. This item uses all-or-nothing scoring.'}</p></div></div><div className="space-y-2">{options.map(function (opt, idx) {
      var active = selected.indexOf(idx) !== -1;
      return <button key={idx} type="button" aria-pressed={active} disabled={!!grade} onClick={function () { toggleOption(idx); }} className={'w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg border text-sm transition-colors motion-reduce:transition-none disabled:cursor-default ' + (active ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')}><span aria-hidden="true" className={'mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-black ' + (active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-400')}>{active ? '✓' : ''}</span><span>{opt}</span></button>;
    })}</div>{!grade && <div className="mt-3 flex items-center gap-2 flex-wrap"><button type="button" onClick={submit} disabled={selected.length === 0} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">Check selections</button>{renderRules.allowIDontKnow && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold">I don't know</button>}</div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300'} role="status" aria-live="polite"><div className={'text-xs font-bold text-' + color + '-900'}>{grade.status === 'idk' ? 'Marked “I don’t know”' : grade.status === 'correct' ? '✓ All correct' : grade.status === 'partially-correct' ? grade.score + '% partial credit' : 'Not yet — review your selections'}</div>{grade.status !== 'idk' && <p className={'text-xs mt-1 text-' + color + '-900'}>{grade.selectedCorrect + ' of ' + grade.totalCorrect + ' correct choices selected' + (grade.selectedWrong ? '; ' + grade.selectedWrong + ' incorrect choice' + (grade.selectedWrong === 1 ? '' : 's') + ' selected.' : '.')}</p>}<button type="button" onClick={reset} className="mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">Try again</button></div>}{_quizConfidenceButtons({ enabled: !!renderRules.allowConfidenceRating, grade: grade, value: confidence, onChange: updateConfidence })}</div>;
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
      if (answerIdx === null || evidenceIdx === null) return null;
      var answerCorrect = _quizAnswerMatches(answers[answerIdx], q.correctAnswer);
      var evidenceCorrect = evidence[evidenceIdx] === q.correctEvidence;
      var rawScore = (answerCorrect ? 1 : 0) + (evidenceCorrect ? 1 : 0);
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var score = partialCredit ? rawScore : (rawScore === 2 ? 2 : 0);
      var status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var payload = { answerIdx: answerIdx, answerText: answers[answerIdx], evidenceIdx: evidenceIdx, evidenceText: evidence[evidenceIdx], answerCorrect: answerCorrect, evidenceCorrect: evidenceCorrect, score: score, status: status };
      setGrade(payload);
      setSubmitted(payload);
      _quizEmitDeterministicAnswer(p, 'answer-evidence', payload, confidence);
      return payload;
    }
    function markIDK() { var payload = { idk: true }; setGrade({ status: 'idk', score: 0 }); setSubmitted(payload); _quizEmitDeterministicAnswer(p, 'answer-evidence', payload, confidence); }
    function updateConfidence(level) { setConfidence(level); if (submitted) _quizEmitDeterministicAnswer(p, 'answer-evidence', submitted, level); }
    function reset() { setAnswerIdx(null); setEvidenceIdx(null); setGrade(null); setSubmitted(null); setConfidence(null); }
    _quizUseVoiceController(p, {
      getState: function () {
        var actions = grade ? ['try-again'] : ['choose-answer'];
        if (!grade && answerIdx !== null) actions.push('choose-evidence');
        if (!grade && answerIdx !== null && evidenceIdx !== null) actions.push('check');
        return {
          type: 'answer-evidence',
          answerOptions: answers.slice(0, 8),
          evidenceOptions: evidence.slice(0, 8),
          evidencePrompt: String(q.evidencePrompt || 'Which evidence or reason best supports your answer?'),
          answerIndex: typeof answerIdx === 'number' ? answerIdx : null,
          evidenceIndex: typeof evidenceIdx === 'number' ? evidenceIdx : null,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: actions,
          resetRequiresConfirmation: !!(grade || answerIdx !== null || evidenceIdx !== null),
          prompt: grade
            ? 'Both parts have been checked. Say try again to clear both selections and answer again.'
            : answerIdx === null
              ? 'Choose the answer part explicitly, for example choose answer B.'
              : evidenceIdx === null
                ? 'Now choose the evidence part explicitly, for example choose evidence A.'
                : 'Both parts are selected. Say check both parts.'
        };
      },
      execute: function (action, request) {
        var input = request && typeof request === 'object' ? request : {};
        if (action === 'try-again' || action === 'reset') {
          if ((grade || answerIdx !== null || evidenceIdx !== null) && input.confirmed !== true) {
            return {
              ok: false, state: 'confirmation-required', confirmationRequired: true,
              confirmationToken: 'reset-answer-evidence',
              message: 'Try again will clear both the answer and evidence selections. Confirm try again to continue.'
            };
          }
          reset();
          return { ok: true, state: 'reset', message: 'Answer and evidence selections cleared. Choose the answer part first.' };
        }
        if (grade) {
          return { ok: false, state: 'locked', message: 'Both parts have already been checked. Say try again to answer again.' };
        }
        var part = action === 'choose-answer' ? 'answer' : action === 'choose-evidence' ? 'evidence' : String(input.part || '').toLowerCase();
        if (action === 'choose' && part !== 'answer' && part !== 'evidence') {
          return { ok: false, state: 'ambiguous-choice', message: 'Name the part explicitly. Say choose answer B or choose evidence A.' };
        }
        if (part === 'answer' || part === 'evidence') {
          if (part === 'evidence' && answerIdx === null) {
            return { ok: false, state: 'inapplicable', message: 'Choose the answer part before choosing supporting evidence.' };
          }
          var items = part === 'answer' ? answers : evidence;
          var choice = input.choice != null ? input.choice : (input.option != null ? input.option : input.value);
          var chosenIndex = _quizVoiceNamedChoiceIndex(choice, items.slice(0, 8));
          if (chosenIndex < 0) {
            return { ok: false, state: 'invalid-choice', message: 'Choose an available ' + part + ' option by letter A through H, number, ordinal, or exact option text.' };
          }
          if (part === 'answer') {
            setAnswerIdx(chosenIndex);
            if (answerIdx !== chosenIndex) setEvidenceIdx(null);
          } else {
            setEvidenceIdx(chosenIndex);
          }
          var label = String.fromCharCode(65 + chosenIndex);
          return {
            ok: true, state: 'selected', part: part, selectedIndex: chosenIndex, selectedLabel: label,
            message: (part === 'answer' ? 'Answer' : 'Evidence') + ' option ' + label + ' selected.' +
              (part === 'answer' ? ' Now choose supporting evidence.' : ' Both parts are selected. Say check both parts.')
          };
        }
        if (action === 'check') {
          if (answerIdx === null || evidenceIdx === null) {
            return { ok: false, state: 'inapplicable', message: 'Choose one answer and one evidence option before checking both parts.' };
          }
          var result = submit();
          if (!result) return { ok: false, state: 'error', message: 'Both parts could not be checked.' };
          var message = result.status === 'correct'
            ? 'Both parts checked. The answer and supporting evidence are correct.'
            : result.status === 'partially-correct'
              ? 'Both parts checked. One part is correct and one part needs review.'
              : 'Both parts checked. The answer and supporting evidence need review.';
          return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: message };
        }
        return { ok: false, state: 'invalid-action', message: 'Use choose answer, choose evidence, or check both parts for this item.' };
      }
    });
    if (answers.length === 0 || evidence.length === 0) return null;
    var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
    function optionGrid(items, selectedIdx, setter, disabled) {
      return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{items.map(function (opt, idx) { return <button key={idx} type="button" disabled={disabled} aria-pressed={selectedIdx === idx} onClick={function () { setter(idx); }} className={'px-3 py-2 rounded-lg border text-sm text-left transition-colors motion-reduce:transition-none disabled:cursor-default ' + (selectedIdx === idx ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')}>{String.fromCharCode(65 + idx) + '. ' + opt}</button>; })}</div>;
    }
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Answer + evidence</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || ''}</p></div></div><div className="space-y-4"><div><p className="text-xs font-bold text-slate-700 mb-2">Part 1 — Choose the best answer</p>{optionGrid(answers, answerIdx, setAnswerIdx, !!grade)}</div>{answerIdx !== null && <div><p className="text-xs font-bold text-slate-700 mb-2">{'Part 2 — ' + (q.evidencePrompt || 'Which evidence or reason best supports your answer?')}</p>{optionGrid(evidence, evidenceIdx, setEvidenceIdx, !!grade)}</div>}</div>{!grade && <div className="mt-3 flex gap-2 flex-wrap"><button type="button" onClick={submit} disabled={answerIdx === null || evidenceIdx === null} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">Check both parts</button>{renderRules.allowIDontKnow && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold">I don't know</button>}</div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300'} role="status" aria-live="polite"><div className={'text-xs font-bold text-' + color + '-900'}>{grade.status === 'idk' ? 'Marked “I don’t know”' : grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'both parts correct' : grade.status === 'partially-correct' ? 'one part correct' : 'needs review')}</div>{grade.status !== 'idk' && <ul className={'mt-1 text-xs text-' + color + '-900'}><li>{(grade.answerCorrect ? '✓ ' : '✗ ') + 'Answer'}</li><li>{(grade.evidenceCorrect ? '✓ ' : '✗ ') + 'Supporting evidence or reason'}</li></ul>}<button type="button" onClick={reset} className="mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">Try again</button></div>}{_quizConfidenceButtons({ enabled: !!renderRules.allowConfidenceRating, grade: grade, value: confidence, onChange: updateConfidence })}</div>;
  }
  function _quizParseIntegerWords(tokens) {
    var ones = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
    var tens = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
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
      } else if (token === 'and' && sawNumber && i + 1 < tokens.length) {
      } else {
        break;
      }
      consumed = i + 1;
    }
    return sawNumber ? { value: total + current, consumed: consumed } : null;
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
      return { value: sign * value, unit: tokens.slice(consumed).join(' ') };
    }
    var denominators = { half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, fourth: 4, fourths: 4, fifth: 5, fifths: 5, eighth: 8, eighths: 8, tenth: 10, tenths: 10, hundredth: 100, hundredths: 100 };
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
      var integerPart = pointIndex === 0 ? { value: 0, consumed: 0 } : _quizParseIntegerWords(tokens.slice(0, pointIndex));
      if (!integerPart || integerPart.consumed !== pointIndex) return null;
      var digitWords = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9' };
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
    if (fraction && Number(fraction[2]) !== 0) return { value: Number(fraction[1]) / Number(fraction[2]), unit: String(fraction[3] || '').trim() };
    var decimal = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*(.*))?$/i);
    if (decimal) {
      var value = Number(decimal[1]);
      return Number.isFinite(value) ? { value: value, unit: String(decimal[2] || '').trim() } : null;
    }
    return _quizParseSpokenNumber(text);
  }
  function _quizNormalizeUnit(unit) { return String(unit || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' '); }
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
      if (!parsed) { var invalid = { status: 'invalid', score: 0 }; setGrade(invalid); return invalid; }
      var expected = Number(q.correctValue);
      var tolerance = Math.max(0, Number(q.tolerance) || 0);
      var valueCorrect = Number.isFinite(expected) && Math.abs(parsed.value - expected) <= tolerance + 1e-9;
      var expectedUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(_quizNormalizeUnit).filter(Boolean);
      var unitCorrect = expectedUnits.length === 0 || expectedUnits.indexOf(_quizNormalizeUnit(parsed.unit)) !== -1;
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var rawScore = valueCorrect && unitCorrect ? 100 : valueCorrect || unitCorrect && expectedUnits.length > 0 ? 50 : 0;
      var score = partialCredit ? rawScore : (rawScore === 100 ? 100 : 0);
      var status = score === 100 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var payload = { text: response, numericValue: parsed.value, unit: parsed.unit, valueCorrect: valueCorrect, unitCorrect: unitCorrect, status: status, score: score };
      setGrade(payload);
      setSubmitted(payload);
      _quizEmitDeterministicAnswer(p, 'numeric-response', payload, confidence);
      return payload;
    }
    function markIDK() { var payload = { idk: true }; setGrade({ status: 'idk', score: 0 }); setSubmitted(payload); _quizEmitDeterministicAnswer(p, 'numeric-response', payload, confidence); }
    function updateConfidence(level) { setConfidence(level); if (submitted) _quizEmitDeterministicAnswer(p, 'numeric-response', submitted, level); }
    function reset() { setResponse(''); setGrade(null); setSubmitted(null); setConfidence(null); }
    _quizUseVoiceController(p, {
      getState: function () {
        var parsed = response ? _quizParseNumericResponse(response) : null;
        var locked = !!grade && grade.status !== 'invalid';
        return {
          type: 'numeric-response',
          response: response,
          parsedValue: parsed ? parsed.value : null,
          parsedUnit: parsed ? parsed.unit : '',
          graded: locked,
          gradeStatus: locked && grade ? grade.status : null,
          score: locked && grade && typeof grade.score === 'number' ? grade.score : null,
          actions: locked ? ['try-again'] : (parsed ? ['enter-response', 'check'] : ['enter-response']),
          prompt: locked
            ? 'This numeric response has been checked. Say try again to reset it.'
            : 'Say response followed by a number' + (q.unit ? ' and units such as ' + q.unit : '') + ', then say check value.'
        };
      },
      execute: function (action, request) {
        var locked = !!grade && grade.status !== 'invalid';
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Numeric response reset. Say response followed by the number and optional units.' };
        }
        if (locked) {
          return { ok: false, state: 'locked', message: 'This numeric response has already been checked. Say try again to reset it.' };
        }
        if (action === 'enter-response') {
          var text = _quizVoiceRequestText(request);
          var parsed = _quizParseNumericResponse(text);
          if (!text || !parsed) {
            return { ok: false, state: 'invalid-response', message: 'I could not identify a number. Say response followed by a number and optional units.' };
          }
          setResponse(text);
          return {
            ok: true,
            state: 'response-entered',
            response: text,
            numericValue: parsed.value,
            unit: parsed.unit,
            message: 'Numeric response recorded as ' + parsed.value + (parsed.unit ? ' ' + parsed.unit : '') + '. Say check value when ready.'
          };
        }
        if (action === 'check') {
          if (!String(response || '').trim()) return { ok: false, state: 'inapplicable', message: 'Enter a numeric response before checking.' };
          var result = submit();
          if (!result || result.status === 'invalid') return { ok: false, state: 'invalid-response', message: 'I could not identify a number and optional units in that response.' };
          var resultMessage = result.status === 'correct'
            ? 'Numeric response checked. The value and units are correct.'
            : result.status === 'partially-correct'
              ? 'Numeric response checked. Either the value or units needs review.'
              : 'Numeric response checked. The value and units need review.';
          return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
        }
        return { ok: false, state: 'invalid-action', message: 'Use enter response or check value for this numeric item.' };
      }
    });
    var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Numeric response</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || ''}</p>{q.unit && <p className="text-[11px] text-slate-500 mt-1">{'Include units (' + q.unit + ').'}</p>}</div></div><input type="text" inputMode="decimal" aria-label="Numeric response" value={response} onChange={function (e) { setResponse(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} disabled={!!grade && grade.status !== 'invalid'} placeholder={q.unit ? 'Example: 12.5 ' + q.unit : 'Enter a number'} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50" /><QuizVoiceInputButton value={response} onChange={setResponse} disabled={!!grade && grade.status !== 'invalid'} allowDictation={p.allowDictation} label="Dictate number or units" />{!grade || grade.status === 'invalid' ? <div className="mt-3 flex gap-2 flex-wrap"><button type="button" onClick={submit} disabled={!response.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">Check value</button>{renderRules.allowIDontKnow && !grade && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold">I don't know</button>}{grade && grade.status === 'invalid' && <span className="text-xs text-rose-700 self-center">Enter a number, optionally followed by its unit.</span>}</div> : null}{grade && grade.status !== 'invalid' && <div className={'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300'} role="status" aria-live="polite"><div className={'text-xs font-bold text-' + color + '-900'}>{grade.status === 'idk' ? 'Marked “I don’t know”' : grade.status === 'correct' ? '✓ Correct value and units' : grade.status === 'partially-correct' ? 'Partially correct — check the value or units' : 'Not yet — check your calculation and units'}</div>{grade.status !== 'idk' && <p className={'text-xs mt-1 text-' + color + '-900'}>{'Expected ' + q.correctValue + (q.unit ? ' ' + q.unit : '') + (Number(q.tolerance) > 0 ? ' (±' + q.tolerance + ')' : '') + '.'}</p>}<button type="button" onClick={reset} className="mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">Try again</button></div>}{_quizConfidenceButtons({ enabled: !!renderRules.allowConfidenceRating, grade: grade && grade.status !== 'invalid' ? grade : null, value: confidence, onChange: updateConfidence })}</div>;
  }
  function _quizExtractJson(raw) {
    var value = raw && typeof raw === 'object' && raw.text ? raw.text : raw;
    if (value && typeof value === 'object') return value;
    var text = String(value || '').trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/i, '');
    try { return JSON.parse(text); } catch (e) {}
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
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
      issues.push({ questionIdx: questionIdx, severity: severity, message: message, code: code || 'quality' });
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
        if (correctAnswers.some(function (answer) { return multiOptions.indexOf(answer) === -1; })) add(index, 'error', 'Every multi-select answer key must match an option exactly.', 'multi-key-match');
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
        var orderIsPermutation = order.length === items.length && !order.some(function (value) { return !Number.isInteger(value) || value < 0 || value >= items.length; }) && new Set(order).size === order.length;
        if (!orderIsPermutation) add(index, 'error', 'Displayed order must use every step index exactly once.', 'sequence-order');
        if (orderIsPermutation && items.length >= 3) {
          var authoredWrong = q.intentionallyWrongIndex;
          var sequenceTruth = sequenceSenseTruth(order, authoredWrong, items.length);
          if (sequenceTruth.orderIsCorrect && authoredWrong != null) add(index, 'warning', 'The displayed order is already correct, so no position is misplaced. Clear the misplaced position or change the displayed order.', 'sequence-misplaced');
          else if (!sequenceTruth.orderIsCorrect && (authoredWrong == null || sequenceTruth.misplaced.indexOf(authoredWrong) === -1)) add(index, 'warning', 'The misplaced position does not match the displayed order (positions out of place: ' + sequenceTruth.misplaced.map(function (value) { return value + 1; }).join(', ') + ').', 'sequence-misplaced');
        }
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
      if (!issues.some(function (issue) { return issue.questionIdx === index && issue.code === 'weak-distractor'; })) add(index, 'warning', 'One or more distractors are generic rather than misconception-based.', 'weak-distractor');
    });
    return {
      questions: questions,
      requestedMix: requested,
      actualMix: actual,
      missingMix: missingMix,
      issues: issues,
      errorCount: issues.filter(function (issue) { return issue.severity === 'error'; }).length,
      warningCount: issues.filter(function (issue) { return issue.severity === 'warning'; }).length,
      ready: issues.filter(function (issue) { return issue.severity === 'error'; }).length === 0
    };
  }
  function _quizH5PPreflight(data) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var allMcq = questions.length > 0 && questions.every(function (q) { return !q || !q.type || q.type === 'mcq'; });
    var valid = 0;
    var adapted = 0;
    var manualReview = 0;
    questions.forEach(function (q) {
      q = q || {};
      var type = q.type || 'mcq';
      var prompt = String(q.question || '').trim();
      var okay = false;
      if (type === 'mcq') {
        var mcqOptions = Array.isArray(q.options) ? q.options.filter(function (option) { return String(option || '').trim(); }) : [];
        okay = !!prompt && mcqOptions.length >= 2 && (!allMcq || mcqOptions.length <= 4) && mcqOptions.indexOf(q.correctAnswer) !== -1;
      } else if (type === 'multi-select') {
        var multiOptions = Array.isArray(q.options) ? q.options : [];
        var multiKeys = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        okay = !!prompt && multiOptions.length >= 2 && multiKeys.length > 0 && multiKeys.every(function (answer) { return multiOptions.indexOf(answer) !== -1; });
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
    var statusState = React.useState({ state: 'idle', engineLabel: '', privacy: '', message: '' });
    var status = statusState[0];
    var setStatus = statusState[1];
    var controllerRef = React.useRef(null);
    var mountedRef = React.useRef(true);
    var voiceHandoffRef = React.useRef({ token: 0, restore: false });
    var voice = typeof window !== 'undefined' ? window.AlloFlowVoice : null;
    var nativeSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    var sharedServicePresent = !!(voice && typeof voice.isDictationSupported === 'function');
    var coordinatedFallbackPresent = !!(voice && typeof voice.acquireVoiceSession === 'function');
    var sharedSupported = sharedServicePresent && voice.isDictationSupported();
    var supported = p.allowDictation !== false && (sharedServicePresent ? sharedSupported : (nativeSupported && coordinatedFallbackPresent));
    React.useEffect(function () {
      mountedRef.current = true;
      return function () {
        mountedRef.current = false;
        try { if (controllerRef.current) controllerRef.current.abort('unmount'); } catch (e) {}
        controllerRef.current = null;
      };
    }, []);
    function appendTranscript(transcript) {
      var clean = String(transcript || '').trim();
      if (!clean || typeof p.onChange !== 'function') return;
      var prior = String(p.value || '').trim();
      p.onChange((prior ? prior + ' ' : '') + clean);
    }
    function beginVoiceHandoff() {
      var next = { token: voiceHandoffRef.current.token + 1, restore: false };
      try {
        var loop = window.__alloVoiceLoop;
        var wasActive = !!(loop && typeof loop.isActive === 'function' && loop.isActive());
        var wasPaused = !!(wasActive && loop && typeof loop.isPaused === 'function' && loop.isPaused());
        next.restore = wasActive && !wasPaused;
        if (wasActive && typeof loop.stop === 'function') loop.stop();
      } catch (e) {
        next.restore = false;
      }
      voiceHandoffRef.current = next;
      return next.token;
    }
    function restoreVoiceAccess(token, reason) {
      var handoff = voiceHandoffRef.current;
      if (!handoff || handoff.token !== token || !handoff.restore) return;
      // A replacement session represents newer user intent. Never reopen the
      // microphone after another owner (including a newly toggled Voice Access
      // session) displaced this dictation.
      if (reason === 'replaced' || reason === 'external') {
        handoff.restore = false;
        return;
      }
      handoff.restore = false;
      window.setTimeout(function () {
        try {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          var shared = window.AlloFlowVoice;
          var sessionStatus = shared && typeof shared.getActiveVoiceSessionStatus === 'function'
            ? shared.getActiveVoiceSessionStatus() : null;
          if (sessionStatus && sessionStatus.owner) return;
          var loop = window.__alloVoiceLoop;
          if (!loop || typeof loop.start !== 'function') return;
          if (typeof loop.isActive !== 'function' || !loop.isActive()) loop.start();
        } catch (e) {}
      }, 150);
    }
    function updateDictationStatus(nextStatus, token) {
      var next = nextStatus && typeof nextStatus === 'object' ? nextStatus : { state: 'idle' };
      if (mountedRef.current) setStatus(next);
      if (next.state === 'idle' || next.state === 'error') restoreVoiceAccess(token, next.reason || '');
    }
    function createNativeFallback(token) {
      var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      var coordinator = window.AlloFlowVoice;
      if (!Recognition || !coordinator || typeof coordinator.acquireVoiceSession !== 'function') return null;
      var recognition = new Recognition();
      var active = false;
      var terminal = false;
      var lease = null;
      function release(reason) {
        var currentLease = lease;
        lease = null;
        if (currentLease && typeof currentLease.release === 'function') {
          try { currentLease.release(reason || 'completed'); } catch (e) {}
        }
      }
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en-US';
      recognition.onstart = function () {
        active = true;
        updateDictationStatus({ state: 'listening', engineLabel: window.__alloLocalSRShim ? 'On-device Whisper' : 'Browser speech service', privacy: window.__alloLocalSRShim ? 'Audio stays on this device.' : 'Your browser may send audio to its speech provider.', message: 'Listening...' }, token);
      };
      recognition.onresult = function (event) {
        var transcript = event && event.results && event.results[0] && event.results[0][0] ? event.results[0][0].transcript : '';
        appendTranscript(transcript);
      };
      recognition.onerror = function (event) {
        active = false;
        terminal = true;
        release('error');
        updateDictationStatus({ state: 'error', engineLabel: '', privacy: '', reason: event && event.error || 'error', message: event && event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'Dictation was unavailable.' }, token);
      };
      recognition.onend = function () {
        active = false;
        if (terminal) return;
        terminal = true;
        release('completed');
        updateDictationStatus({ state: 'idle', engineLabel: '', privacy: '', reason: 'completed', message: 'Dictation added.' }, token);
      };
      return {
        start: function () {
          terminal = false;
          lease = coordinator.acquireVoiceSession('quiz-dictation', {
            mode: 'dictation',
            label: 'Quiz dictation',
            state: 'starting',
            message: 'Starting microphone...',
            onStop: function (reason) {
              lease = null;
              active = false;
              terminal = true;
              try { recognition.abort(); } catch (e) {}
              updateDictationStatus({ state: 'idle', engineLabel: '', privacy: '', reason: reason || 'replaced', message: '' }, token);
            }
          });
          try {
            recognition.start();
            return true;
          } catch (error) {
            terminal = true;
            release('start-error');
            throw error;
          }
        },
        stop: function () { recognition.stop(); },
        abort: function (reason) {
          active = false;
          terminal = true;
          try { recognition.abort(); } catch (e) {}
          release(reason || 'cancelled');
          updateDictationStatus({ state: 'idle', engineLabel: '', privacy: '', reason: reason || 'cancelled', message: '' }, token);
        },
        isActive: function () { return active; },
        getState: function () { return active ? 'listening' : 'idle'; }
      };
    }
    function toggle() {
      if (!supported || p.disabled) return;
      var current = controllerRef.current;
      if (current && current.isActive && current.isActive()) {
        current.stop();
        return;
      }
      var handoffToken = beginVoiceHandoff();
      if (voice && typeof voice.createDictationController === 'function') {
        current = voice.createDictationController({
          owner: 'quiz-dictation',
          label: 'Quiz dictation',
          continuous: false,
          restartOnEnd: false,
          lang: typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en-US',
          onTranscript: appendTranscript,
          onStateChange: function (nextStatus) { updateDictationStatus(nextStatus, handoffToken); }
        });
      } else {
        current = createNativeFallback(handoffToken);
      }
      controllerRef.current = current;
      if (!current) {
        updateDictationStatus({ state: 'error', engineLabel: '', privacy: '', reason: 'unavailable', message: 'Dictation was unavailable.' }, handoffToken);
        return;
      }
      try {
        if (current.start() === false) restoreVoiceAccess(handoffToken, 'start-failed');
      } catch (e) {
        updateDictationStatus({ state: 'error', engineLabel: '', privacy: '', reason: 'start-error', message: 'Dictation was unavailable.' }, handoffToken);
      }
    }
    if (!supported) return null;
    var listening = status.state === 'starting' || status.state === 'listening';
    var transcribing = status.state === 'transcribing';
    var buttonLabel = listening ? 'Stop dictation' : transcribing ? 'Transcribing...' : (p.label || 'Dictate response');
    return <div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={toggle} disabled={p.disabled || transcribing} aria-pressed={listening} aria-busy={transcribing} data-dictation-engine={status.engine || ''} className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold disabled:opacity-50 ' + (listening || transcribing ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}><span aria-hidden="true">🎙</span>{buttonLabel}</button>{status.message && <span role="status" aria-live="polite" className="text-[10px] text-slate-600"><span className="font-semibold">{status.message}</span>{status.engineLabel && <span>{' · ' + status.engineLabel}</span>}{status.privacy && <span>{' · ' + status.privacy}</span>}</span>}</div>;
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
      p.onChange(values.filter(function (_, itemIndex) { return itemIndex !== index; }));
    }
    return <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700">{p.label}</label>{values.map(function (value, index) {
      return <div key={index} className="flex gap-2 items-center"><input aria-label={p.label + ' ' + (index + 1)} value={value} onChange={function (event) { change(index, event.target.value); }} className="flex-1 min-w-0 text-xs border-slate-300 rounded-md p-2 bg-white" /><button type="button" onClick={function () { remove(index); }} disabled={values.length <= (p.minimum || 0)} className="w-7 h-7 rounded border border-rose-200 text-rose-700 bg-white disabled:opacity-30" aria-label={'Remove ' + p.label + ' ' + (index + 1)}>×</button></div>;
    })}<button type="button" onClick={function () { p.onChange(values.concat([''])); }} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">+ Add {p.itemLabel || 'item'}</button></div>;
  }
  function AssessmentItemActions(p) {
    var action = p.onAction;
    var disabled = typeof action !== 'function';
    var q = p.q || {};
    var deleteConfirmState = React.useState(false);
    var deleteConfirmOpen = deleteConfirmState[0];
    var setDeleteConfirmOpen = deleteConfirmState[1];
    return <div className="ml-9 mb-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" disabled={disabled || p.questionIdx <= 0} onClick={function () { action(p.questionIdx, 'move', -1); }} className="px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30">Move up</button>
        <button type="button" disabled={disabled || p.questionIdx >= p.totalQuestions - 1} onClick={function () { action(p.questionIdx, 'move', 1); }} className="px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30">Move down</button>
        <button type="button" disabled={disabled} onClick={function () { action(p.questionIdx, 'duplicate'); }} className="px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30">Duplicate</button>
        <button type="button" disabled={disabled || p.regenerating} onClick={function () { if (typeof p.onRegenerate === 'function') p.onRegenerate(p.questionIdx, q); }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">{p.regenerating ? 'Regenerating…' : 'Regenerate item'}</button>
        {!deleteConfirmOpen ? <button type="button" disabled={disabled} onClick={function () { setDeleteConfirmOpen(true); }} className="ml-auto px-2 py-1 rounded bg-white border border-rose-300 text-rose-700 text-xs font-semibold disabled:opacity-30">Delete</button> : <span className="ml-auto inline-flex items-center gap-1" role="group" aria-label="Confirm question deletion"><button type="button" autoFocus onClick={function () { action(p.questionIdx, 'delete'); }} className="px-2 py-1 rounded bg-rose-700 text-white text-xs font-semibold">Confirm delete</button><button type="button" onClick={function () { setDeleteConfirmOpen(false); }} className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">Cancel</button></span>}
      </div>
      {q.type === 'mcq' && Array.isArray(q.options) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-[11px] font-semibold text-slate-700">Correct answer<select value={q.correctAnswer || ''} onChange={function (event) { action(p.questionIdx, 'patch', { correctAnswer: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded p-1.5 bg-white"><option value="">Choose answer…</option>{q.options.map(function (option, index) { return <option key={index} value={option}>{option || 'Option ' + (index + 1)}</option>; })}</select></label>
        <label className="text-[11px] font-semibold text-slate-700">Concept label<input value={q.conceptLabel || ''} onChange={function (event) { action(p.questionIdx, 'patch', { conceptLabel: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded p-1.5 bg-white" /></label>
      </div>}
    </div>;
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
        // Matcher, not indexOf: if the key has already drifted from its option by
        // case or spacing, an exact indexOf misses and the key is silently left
        // stale. Finding it here is the one chance to repair it.
        var answerIndex = oldAnswers.findIndex(function (answer) { return _quizAnswerMatches(answer, q.correctAnswer); });
        if (answerIndex >= 0 && values[answerIndex] !== undefined) update.correctAnswer = values[answerIndex];
      }
      if (type === 'answer-evidence' && field === 'evidenceOptions') {
        var oldEvidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
        var evidenceIndex = oldEvidence.indexOf(q.correctEvidence);
        if (evidenceIndex >= 0 && values[evidenceIndex] !== undefined) update.correctEvidence = values[evidenceIndex];
      }
      patch(update);
    }
    if (type === 'multi-select') return <><AssessmentTextListEditor label="Answer options" itemLabel="option" values={q.options || []} minimum={3} onChange={function (values) { updateList('options', values); }} /><div><div className="text-xs font-bold text-slate-700 mb-1">Correct options</div><div className="space-y-1">{(q.options || []).map(function (option, index) {
      var checked = (q.correctAnswers || []).indexOf(option) !== -1;
      return <label key={index} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" aria-label={'Mark option ' + (index + 1) + ' as correct'} checked={checked} onChange={function (event) {
        var next = (q.correctAnswers || []).filter(function (answer) { return answer !== option; });
        if (event.target.checked) next.push(option);
        patch({ correctAnswers: next });
      }} />{option || 'Option ' + (index + 1)}</label>;
    })}</div></div></>;
    if (type === 'fill-blank') return <><label className="block text-xs font-bold text-slate-700">Expected answer<input value={q.expectedFill || ''} onChange={function (event) { patch({ expectedFill: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Accepted alternatives" itemLabel="alternative" values={q.acceptableAlternatives || []} minimum={0} onChange={function (values) { patch({ acceptableAlternatives: values }); }} /></>;
    if (type === 'short-answer') return <label className="block text-xs font-bold text-slate-700">Reference answer<textarea value={q.expectedAnswer || ''} onChange={function (event) { patch({ expectedAnswer: event.target.value }); }} rows="3" className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 resize-y" /></label>;
    if (type === 'self-explanation') return <label className="block text-xs font-bold text-slate-700">Scoring rubric<textarea value={q.rubric || q.expectedAnswer || ''} onChange={function (event) { patch({ rubric: event.target.value }); }} rows="4" className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 resize-y" /></label>;
    if (type === 'answer-evidence') return <><AssessmentTextListEditor label="Answer choices" itemLabel="answer" values={q.answerOptions || []} minimum={2} onChange={function (values) { updateList('answerOptions', values); }} /><label className="block text-xs font-bold text-slate-700">Correct answer<select value={q.correctAnswer || ''} onChange={function (event) { patch({ correctAnswer: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Choose answer…</option>{(q.answerOptions || []).map(function (option, index) { return <option key={index} value={option}>{option || 'Answer ' + (index + 1)}</option>; })}</select></label><label className="block text-xs font-bold text-slate-700">Evidence prompt<input value={q.evidencePrompt || ''} onChange={function (event) { patch({ evidencePrompt: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Evidence choices" itemLabel="evidence choice" values={q.evidenceOptions || []} minimum={2} onChange={function (values) { updateList('evidenceOptions', values); }} /><label className="block text-xs font-bold text-slate-700">Correct evidence<select value={q.correctEvidence || ''} onChange={function (event) { patch({ correctEvidence: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Choose evidence…</option>{(q.evidenceOptions || []).map(function (option, index) { return <option key={index} value={option}>{option || 'Evidence ' + (index + 1)}</option>; })}</select></label></>;
    if (type === 'numeric-response') return <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><label className="text-xs font-bold text-slate-700">Correct value<input type="number" step="any" value={q.correctValue == null ? '' : q.correctValue} onChange={function (event) { patch({ correctValue: event.target.value === '' ? '' : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><label className="text-xs font-bold text-slate-700">Tolerance<input type="number" min="0" step="any" value={q.tolerance == null ? 0 : q.tolerance} onChange={function (event) { patch({ tolerance: event.target.value === '' ? '' : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><label className="text-xs font-bold text-slate-700">Preferred unit<input value={q.unit || ''} onChange={function (event) { patch({ unit: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><div className="sm:col-span-3"><AssessmentTextListEditor label="Accepted unit spellings" itemLabel="unit spelling" values={q.acceptableUnits || []} minimum={0} onChange={function (values) { patch({ acceptableUnits: values }); }} /></div></div>;
    return null;
  }
  function AssessmentDiagnosticFields(p) {
    var q = p.q || {};
    var type = q.type || '';
    var patch = p.patch;
    var items = Array.isArray(q.items) ? q.items : [];
    var pairs = Array.isArray(q.pairs) ? q.pairs : [];
    if (type === 'sequence-sense') return <><AssessmentTextListEditor label="Steps in canonical order" itemLabel="step" values={items} minimum={3} onChange={function (values) {
      patch({ items: values, presentedOrder: values.map(function (_, index) { return index; }), intentionallyWrongIndex: null });
    }} /><label className="block text-xs font-bold text-slate-700">Displayed order <span className="font-normal text-slate-500">(1-based, comma-separated)</span><input aria-label="Displayed sequence order using one-based positions" value={(q.presentedOrder || []).map(function (value) { return Number(value) + 1; }).join(', ')} onChange={function (event) {
      var order = event.target.value.split(',').map(function (value) { return Number(value.trim()) - 1; }).filter(function (value) { return Number.isInteger(value); });
      patch({ presentedOrder: order });
    }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><label className="block text-xs font-bold text-slate-700">Misplaced displayed position<select value={q.intentionallyWrongIndex === null || q.intentionallyWrongIndex === undefined ? '' : q.intentionallyWrongIndex} onChange={function (event) { patch({ intentionallyWrongIndex: event.target.value === '' ? null : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Order is correct</option>{items.map(function (_, index) { return <option key={index} value={index}>Position {index + 1}</option>; })}</select></label><label className="block text-xs font-bold text-slate-700">Ordering principle<input value={q.orderingPrinciple || ''} onChange={function (event) { patch({ orderingPrinciple: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Principle choices" itemLabel="choice" values={q.principleOptions || []} minimum={3} onChange={function (values) { patch({ principleOptions: values }); }} /></>;
    if (type === 'relation-mismatch') return <><div className="space-y-1.5"><div className="text-xs font-bold text-slate-700">Displayed pairs</div>{pairs.map(function (pair, index) {
      return <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input aria-label={'Pair ' + (index + 1) + ' left'} value={pair.left || ''} onChange={function (event) {
        var next = pairs.map(function (item, itemIndex) { return itemIndex === index ? Object.assign({}, item, { left: event.target.value }) : item; });
        patch({ pairs: next });
      }} className="text-xs border-slate-300 rounded p-2" /><input aria-label={'Pair ' + (index + 1) + ' right'} value={pair.right || ''} onChange={function (event) {
        var next = pairs.map(function (item, itemIndex) { return itemIndex === index ? Object.assign({}, item, { right: event.target.value }) : item; });
        patch({ pairs: next });
      }} className="text-xs border-slate-300 rounded p-2" /><button type="button" disabled={pairs.length <= 3} onClick={function () { patch({ pairs: pairs.filter(function (_, itemIndex) { return itemIndex !== index; }) }); }} className="w-7 rounded border border-rose-200 text-rose-700 disabled:opacity-30" aria-label={'Remove pair ' + (index + 1)}>×</button></div>;
    })}<button type="button" onClick={function () { patch({ pairs: pairs.concat([{ left: '', right: '' }]) }); }} className="text-[11px] font-semibold text-indigo-700">+ Add pair</button></div><label className="block text-xs font-bold text-slate-700">Incorrect pair<select value={Number.isInteger(Number(q.wrongPairIndex)) ? Number(q.wrongPairIndex) : ''} onChange={function (event) { patch({ wrongPairIndex: Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Choose pair…</option>{pairs.map(function (_, index) { return <option key={index} value={index}>Pair {index + 1}</option>; })}</select></label><label className="block text-xs font-bold text-slate-700">Correct partner<input value={q.correctPartnerForWrong || ''} onChange={function (event) { patch({ correctPartnerForWrong: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Candidate partners" itemLabel="candidate" values={q.candidatePartners || []} minimum={2} onChange={function (values) { patch({ candidatePartners: values }); }} /></>;
    return null;
  }
  function AssessmentItemEditor(p) {
    var q = p.q || {};
    var type = q.type || 'mcq';
    var action = p.onAction;
    function patch(values) { if (typeof action === 'function') action(p.questionIdx, 'patch', values); }
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
    return <div className="bg-white p-5 rounded-xl border-2 border-indigo-300 shadow-sm">
      <div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">{p.itemNumber}</span><div className="flex-1"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 mb-2">{labels[type] || type}</span><textarea aria-label="Edit question prompt" value={q.question || ''} onChange={function (event) { patch({ question: event.target.value }); }} rows="2" className="w-full text-sm font-semibold border-slate-300 rounded-md p-2 resize-y" /></div></div>
      <div className="ml-9 space-y-3">
        <label className="block text-xs font-bold text-slate-700">Concept label<input value={q.conceptLabel || ''} onChange={function (event) { patch({ conceptLabel: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" placeholder="e.g. fraction equivalents" /></label>
        <AssessmentCoreFields q={q} patch={patch} />
        <AssessmentDiagnosticFields q={q} patch={patch} />
      </div>
      <div className="mt-4"><AssessmentItemActions q={q} questionIdx={p.questionIdx} totalQuestions={p.totalQuestions} onAction={action} onRegenerate={p.onRegenerate} regenerating={p.regenerating} /></div>
    </div>;
  }
  function AssessmentQualityPanel(p) {
    var audit = p.audit;
    var h5p = p.h5p || { total: 0, valid: 0, omitted: 0, adapted: 0, manualReview: 0, library: '', ready: false };
    var openState = React.useState(!audit.ready);
    var open = openState[0];
    var setOpen = openState[1];
    React.useEffect(function () { if (!audit.ready) setOpen(true); }, [audit.errorCount]);
    var mixKeys = Array.from(new Set(Object.keys(audit.requestedMix || {}).concat(Object.keys(audit.actualMix || {}))));
    return <div className={'rounded-xl border-2 mb-4 ' + (audit.ready ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50')} role="region" aria-label="Assessment quality review">
      <button type="button" onClick={function () { setOpen(!open); }} aria-expanded={open} className="w-full p-3 flex items-center gap-3 text-left">
        <span aria-hidden="true" className="text-xl">{audit.ready ? '✓' : '⚠'}</span>
        <span className="flex-1"><span className={'block text-sm font-black ' + (audit.ready ? 'text-emerald-900' : 'text-amber-900')}>{audit.ready ? 'Ready to share' : 'Review before sharing'}</span><span className="block text-[11px] text-slate-700">{audit.errorCount + ' required fix' + (audit.errorCount === 1 ? '' : 'es') + ' · ' + audit.warningCount + ' suggestion' + (audit.warningCount === 1 ? '' : 's') + ' · delivery preflight included'}</span></span>
        <span className="text-xs font-bold text-slate-600">{open ? 'Hide' : 'Review'}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-3">
        <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Delivery preflight</div><div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className={'rounded-lg border p-2 ' + (audit.ready ? 'bg-white border-emerald-200' : 'bg-rose-50 border-rose-200')}><div className="text-[10px] font-black uppercase text-slate-600">In-app assessment</div><div className={'text-xs font-bold mt-0.5 ' + (audit.ready ? 'text-emerald-800' : 'text-rose-800')}>{audit.ready ? 'Answer keys and structure ready' : audit.errorCount + ' blocking fix' + (audit.errorCount === 1 ? '' : 'es')}</div></div>
          <div className="rounded-lg border border-sky-200 bg-white p-2"><div className="text-[10px] font-black uppercase text-slate-600">Live + presentation</div><div className="text-xs font-bold text-sky-800 mt-0.5">{audit.questions.length + ' item' + (audit.questions.length === 1 ? '' : 's') + ' available across supported formats'}</div></div>
          <div className={'rounded-lg border p-2 ' + (h5p.omitted ? 'bg-amber-50 border-amber-300' : 'bg-white border-indigo-200')}><div className="text-[10px] font-black uppercase text-slate-600">H5P export</div><div className={'text-xs font-bold mt-0.5 ' + (h5p.omitted ? 'text-amber-900' : 'text-indigo-800')}>{h5p.valid + ' / ' + h5p.total + ' items · ' + h5p.library}</div>{h5p.adapted > 0 && <div className="text-[10px] text-slate-600 mt-0.5">{h5p.adapted + ' adapted' + (h5p.manualReview ? ' · ' + h5p.manualReview + ' ungraded/manual-review' : '')}</div>}{h5p.omitted > 0 && <div className="text-[10px] font-semibold text-amber-800 mt-0.5">{h5p.omitted + ' incomplete item' + (h5p.omitted === 1 ? '' : 's') + ' would be omitted'}</div>}</div>
        </div></div>
        {mixKeys.length > 0 && <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Requested vs generated</div><div className="flex gap-1.5 flex-wrap">{mixKeys.map(function (key) {
          var requested = audit.requestedMix ? audit.requestedMix[key] || 0 : audit.actualMix[key] || 0;
          var actual = audit.actualMix[key] || 0;
          return <span key={key} className={'text-[10px] font-semibold px-2 py-1 rounded border ' + (requested === actual ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-amber-300 text-amber-900')}>{key + ': ' + actual + ' / ' + requested}</span>;
        })}</div></div>}
        {audit.issues.length > 0 ? <ul className="space-y-1.5">{audit.issues.map(function (issue, index) {
          return <li key={index} className={'text-xs rounded-md border p-2 ' + (issue.severity === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-amber-200 text-amber-900')}><strong>{issue.questionIdx === null ? 'Recipe' : 'Q' + (issue.questionIdx + 1)}:</strong> {' ' + issue.message}</li>;
        })}</ul> : <p className="text-xs text-emerald-800">All answer keys, required fields, counts, and structural checks passed.</p>}
        {audit.issues.length > 0 && <button type="button" onClick={p.onRepairAll} disabled={p.repairing || typeof p.onRepairAll !== 'function'} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">{p.repairing ? 'Repairing assessment…' : 'Fix flagged and missing items'}</button>}
        <p className="text-[10px] text-slate-600">This automated check verifies structure, answer-key consistency, and delivery compatibility. H5P adaptations preserve the prompt and answer guide, but written responses, sequencing, and tolerance-based numeric items may require manual review after export. Teachers should still review content accuracy and instructional fit.</p>
      </div>}
    </div>;
  }
  function FreeformItemsBlock(p) {
    var allQuestions = Array.isArray(p.questions) ? p.questions : [];
    var freeform = allQuestions.map(function (q, idx) {
      return { q: q, idx: idx };
    }).filter(function (entry) {
      if (typeof p.visibleQuestionIdx === 'number' && entry.idx !== p.visibleQuestionIdx) return false;
      return entry.q && (entry.q.type === 'multi-select' || entry.q.type === 'fill-blank' || entry.q.type === 'short-answer' || entry.q.type === 'self-explanation' || entry.q.type === 'sequence-sense' || entry.q.type === 'relation-mismatch' || entry.q.type === 'answer-evidence' || entry.q.type === 'numeric-response');
    });
    if (freeform.length === 0) return null;
    return <div className="space-y-4">{freeform.map(function (entry) {
      var card = null;
      if (p.isEditingQuiz) {
        card = <AssessmentItemEditor q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} totalQuestions={allQuestions.length} onAction={p.onQuestionAction} onRegenerate={p.onRegenerateQuestion} regenerating={!!(p.regeneratingQuestions && p.regeneratingQuestions[entry.idx])} />;
      } else if (p.deferFeedback) {
        card = <DeferredAssessmentItem {...p} q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} />;
      } else if (entry.q.type === 'multi-select') {
        card = <MultiSelectCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} />;
      } else if (entry.q.type === 'answer-evidence') {
        card = <AnswerEvidenceCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} />;
      } else if (entry.q.type === 'numeric-response') {
        card = <NumericResponseCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} allowDictation={p.allowDictation} />;
      } else if (entry.q.type === 'sequence-sense') {
        card = <SequenceSenseCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} />;
      } else if (entry.q.type === 'relation-mismatch') {
        card = <RelationMismatchCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} />;
      } else {
        card = <FreeformItemCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} QuizAIHelpers={p.QuizAIHelpers} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} onSubmitLiveAnswer={p.onSubmitLiveAnswer} allowDictation={p.allowDictation} />;
      }
      return <div key={entry.idx} id={'assessment-question-' + entry.idx} className="space-y-2 scroll-mt-24">{!p.isEditingQuiz && p.allowFlagging && <div className="flex justify-end"><AssessmentQuestionFlagButton flagged={!!(p.flaggedQuestions && p.flaggedQuestions[entry.idx])} onToggle={function () { p.onToggleFlag(entry.idx); }} /></div>}{card}</div>;
    })}</div>;
  }  function FreeformItemCard(p) {
    var q = p.q;
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
    var scoringPolicy = p.scoringPolicy || { partialCredit: true, writtenResponseMode: 'ai-provisional' };
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
    _quizUseVoiceController(p, {
      getState: function () {
        var locked = grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted';
        return {
          type: q.type || 'short-answer',
          response: response,
          responseEntered: !!String(response || '').trim(),
          grading: !!grade.loading,
          gradeStatus: grade.status || null,
          feedback: grade.feedback || '',
          actions: locked
            ? (grade.status === 'submitted' ? ['try-again'] : [])
            : (String(response || '').trim() ? ['enter-response', 'check'] : ['enter-response']),
          prompt: locked
            ? (grade.loading ? 'This response is being graded.' : grade.status === 'submitted' ? 'This response was submitted for teacher review. Say try again to revise it.' : 'This response has been checked.')
            : 'Say response followed by your answer, then say check response.'
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          if (grade.loading) return { ok: false, state: 'busy', message: 'Wait for grading to finish before revising this response.' };
          setGrade({ status: null, feedback: '', loading: false });
          if (grade.status !== 'submitted') setResponse('');
          setExplainer({ open: false, loading: false, text: '', error: '' });
          return { ok: true, state: 'reset', message: grade.status === 'submitted' ? 'Response reopened for revision.' : 'Written response reset. Say response followed by your answer.' };
        }
        var locked = grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted';
        if (locked) return { ok: false, state: grade.loading ? 'busy' : 'locked', message: grade.loading ? 'This response is being graded.' : 'This response is locked. Say try again when revision is available.' };
        if (action === 'enter-response') {
          var text = _quizVoiceRequestText(request);
          if (!text) return { ok: false, state: 'invalid-response', message: 'No response text was provided. Say response followed by your answer.' };
          setResponse(text);
          return { ok: true, state: 'response-entered', response: text, message: 'Response recorded. ' + text + '. Say check response when ready.' };
        }
        if (action === 'check') {
          if (!String(response || '').trim()) return { ok: false, state: 'inapplicable', message: 'Enter a response before checking or submitting it.' };
          submitGrade();
          return {
            ok: true,
            state: teacherReviewWritten ? 'submitted-for-review' : 'grading',
            message: teacherReviewWritten ? 'Response submitted for teacher review.' : 'Response submitted for grading. I will announce feedback when it is available.'
          };
        }
        return { ok: false, state: 'invalid-action', message: 'Use enter response or check response for this written item.' };
      }
    });
    var statusColor = grade.status === 'correct' ? 'emerald' : grade.status === 'partially-correct' ? 'amber' : grade.status === 'submitted' ? 'indigo' : grade.status === 'incorrect' ? 'rose' : grade.status === 'error' ? 'rose' : grade.status === 'idk' ? 'sky' : 'slate';
    var statusLabel = grade.status === 'correct' ? 'Correct' : grade.status === 'partially-correct' ? 'Close' : grade.status === 'submitted' ? 'Submitted for review' : grade.status === 'incorrect' ? 'Not yet' : grade.status === 'unclear' ? 'Unclear' : grade.status === 'error' ? 'Error' : grade.status === 'idk' ? 'Marked I do not know' : '';
    var typeLabel = q.type === 'fill-blank' ? 'Fill-in-the-blank' : q.type === 'self-explanation' ? 'Explain your reasoning' : 'Brief written response';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">{typeLabel}</span><p className="text-sm text-slate-800 leading-relaxed">{q.question || ''}</p></div></div>{q.type === 'fill-blank' ? <input aria-label={t("a11y.fill_in_blank")} type="text" value={response} onChange={function (ev) {
        setResponse(ev.target.value);
      }} onKeyDown={function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitGrade();
        }
      }} placeholder={t("placeholders.missing_word_or_phrase")} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50" /> : <textarea aria-label={typeLabel + " response"} value={response} onChange={function (ev) {
        setResponse(ev.target.value);
      }} placeholder={q.type === 'self-explanation' ? 'Explain the concept in your own words (3-5 sentences)...' : 'Type your 1-2 sentence response...'} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} rows={q.type === 'self-explanation' ? 5 : 3} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 resize-y" />}<QuizVoiceInputButton value={response} onChange={setResponse} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} allowDictation={p.allowDictation} label="Dictate written response" /><div className="flex items-center justify-between gap-2 mt-2 flex-wrap"><div className="flex items-center gap-2 flex-wrap"><button type="button" onClick={submitGrade} disabled={!response.trim() || grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none">{grade.loading ? 'Grading…' : grade.status === 'submitted' ? 'Submitted' : grade.status === 'correct' || grade.status === 'idk' ? '' : grade.status ? 'Re-check' : teacherReviewWritten ? 'Submit response' : 'Grade my answer'}</button>{allowIDK && !grade.status && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title={t("tooltips.skip_ai_explain_concept")}><span aria-hidden="true">🤔 </span>{t("ui_common.i_dont_know")}</button>}</div>{grade.status && grade.status !== 'correct' && grade.status !== 'idk' && <button type="button" onClick={function () {
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
        }} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors motion-reduce:transition-none">{grade.status === 'submitted' ? 'Revise response' : t("ui_common.try_again")}</button>}</div>{grade.status && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-1 flex-wrap"><span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{statusLabel}</span>{aiExplainerEnabled && grade.status !== 'correct' && grade.status !== 'idk' && !explainer.open && <button type="button" onClick={requestExplainer} className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors motion-reduce:transition-none" title={t("tooltips.quick_ai_explanation")}>🤖 Explain this</button>}</div>{grade.feedback && <p className={'text-sm text-' + statusColor + '-900 mb-2'}>{grade.feedback}</p>}{explainer.open && <div className="mt-2 p-3 bg-white border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <p className="text-sm text-slate-800 leading-relaxed">{explainer.text}</p>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
            if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainer.text);
            else p.callTTS(explainer.text);
          }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>}{allowConfidence && grade.status && grade.status !== 'idk' && <div className="mt-2 flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">How sure were you?</span>{['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = {
            knew: 'I knew this',
            guessed: 'I guessed',
            'no-idea': 'No idea'
          };
          var active = confidence === lvl;
          return <button key={lvl} type="button" onClick={function () {
            setConfidence(lvl);
            emitLiveAnswer(lvl);
          }} className={'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[lvl]}</button>;
        })}</div>}</div>;
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
    var renderText = typeof p.formatInlineText === 'function' ? function (value) { return p.formatInlineText(String(value || ''), false); } : function (value) { return String(value || ''); };
    var body = null;
    var answerGuide = null;
    if (type === 'multi-select') {
      var correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
      body = <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{(Array.isArray(q.options) ? q.options : []).map(function (option, index) {
        var correct = correctAnswers.indexOf(option) !== -1;
        return <div key={index} className={'p-5 rounded-xl border-2 text-lg font-semibold flex gap-3 ' + (showAnswer && correct ? 'bg-green-50 border-green-500 text-green-900' : showAnswer ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-slate-300 text-slate-800')}><span className="w-7 h-7 rounded border-2 border-current flex items-center justify-center shrink-0">{showAnswer && correct ? '✓' : ''}</span>{renderText(option)}</div>;
      })}</div>;
      answerGuide = <div><span className="font-bold">Correct selections: </span>{correctAnswers.join('; ')}</div>;
    } else if (type === 'fill-blank') {
      body = <div className="p-6 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 text-2xl text-center">{renderText(q.question || '')}</div>;
      var alternatives = Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives.filter(Boolean) : [];
      answerGuide = <div><span className="font-bold">Expected fill: </span>{q.expectedFill || 'Teacher review'}{alternatives.length > 0 && <div className="mt-1 text-sm">Also accept: {alternatives.join(', ')}</div>}</div>;
    } else if (type === 'short-answer') {
      body = <div className="h-36 rounded-xl border-2 border-slate-200 bg-[repeating-linear-gradient(to_bottom,white,white_34px,#cbd5e1_35px)]" aria-label="Short-answer response space" />;
      answerGuide = <div><span className="font-bold">Expected answer: </span>{q.expectedAnswer || q.sampleAnswer || 'Teacher review'}</div>;
    } else if (type === 'self-explanation') {
      body = <div className="h-48 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-5 text-slate-500">Explain the idea in your own words. Include how or why it works.</div>;
      answerGuide = <div><span className="font-bold">Success criteria: </span>{q.rubric || q.expectedAnswer || 'Use accurate reasoning, relevant details, and a clear connection to the concept.'}</div>;
    } else if (type === 'sequence-sense') {
      var items = Array.isArray(q.items) ? q.items : [];
      var presented = Array.isArray(q.presentedOrder) && q.presentedOrder.length ? q.presentedOrder.map(function (item) { return typeof item === 'number' ? items[item] : item; }) : items;
      body = <ol className="space-y-3">{presented.map(function (item, index) { return <li key={index} className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-lg flex gap-3"><span className="font-black text-indigo-700">{index + 1}</span>{renderText(item)}</li>; })}</ol>;
      answerGuide = <div><div><span className="font-bold">Correct order: </span>{items.join(' → ')}</div>{q.orderingPrinciple && <div className="mt-1 text-sm">Ordering principle: {q.orderingPrinciple}</div>}</div>;
    } else if (type === 'relation-mismatch') {
      var pairs = Array.isArray(q.pairs) ? q.pairs : [];
      body = <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{pairs.map(function (pair, index) {
        pair = pair || {};
        var mismatch = index === q.wrongPairIndex;
        return <div key={index} className={'p-4 rounded-xl border-2 text-lg ' + (showAnswer && mismatch ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-200')}><span className="font-bold">{renderText(pair.left)}</span><span className="mx-2" aria-hidden="true">↔</span>{renderText(pair.right)}{showAnswer && mismatch && <span className="ml-2 text-rose-700 font-bold">Mismatch</span>}</div>;
      })}</div>;
      var wrongPair = pairs[q.wrongPairIndex] || {};
      answerGuide = <div><span className="font-bold">Fix the mismatch: </span>{wrongPair.left ? wrongPair.left + ' → ' : ''}{q.correctPartnerForWrong || 'Teacher review'}</div>;    } else if (type === 'answer-evidence') {
      body = <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div><h4 className="font-bold text-slate-700 mb-2">Part 1 - answer options</h4><div className="space-y-2">{(Array.isArray(q.answerOptions) ? q.answerOptions : []).map(function (option, index) { return <div key={index} className={'p-3 rounded-lg border-2 ' + (showAnswer && _quizAnswerMatches(option, q.correctAnswer) ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')}>{renderText(option)}</div>; })}</div></div><div><h4 className="font-bold text-slate-700 mb-2">Part 2 - supporting evidence</h4>{q.evidencePrompt && <p className="mb-3 text-base text-slate-700">{renderText(q.evidencePrompt)}</p>}<div className="space-y-2">{(Array.isArray(q.evidenceOptions) ? q.evidenceOptions : []).map(function (option, index) { return <div key={index} className={'p-3 rounded-lg border-2 ' + (showAnswer && option === q.correctEvidence ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')}>{renderText(option)}</div>; })}</div></div></div>;
      answerGuide = <div><div><span className="font-bold">Answer: </span>{q.correctAnswer || 'Teacher review'}</div><div className="mt-1"><span className="font-bold">Evidence: </span>{q.correctEvidence || 'Teacher review'}</div></div>;
    } else if (type === 'numeric-response') {
      body = <div className="p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-end gap-3 justify-center"><span className="text-3xl tracking-widest text-slate-400">____________</span>{q.unit && <span className="text-2xl font-bold text-slate-700">{q.unit}</span>}</div>;
      answerGuide = <div><span className="font-bold">Expected value: </span>{String(q.correctValue ?? 'Teacher review')}{q.unit ? ' ' + q.unit : ''}{Number(q.tolerance) > 0 ? ' (±' + q.tolerance + ')' : ''}</div>;
    } else {
      body = <div className="h-36 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50" aria-label="Response space" />;
      answerGuide = <div><span className="font-bold">Answer guide: </span>{q.expectedAnswer || q.sampleAnswer || q.correctAnswer || q.rubric || 'Teacher review'}</div>;
    }
    if (p.compact) {
      var written = ['fill-blank', 'short-answer', 'self-explanation'].indexOf(type) !== -1;
      return <div data-review-question-type={type} className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-6 text-left text-slate-800">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-teal-800">{_quizPresentationTypeLabel(type)}</p>
        {written ? <p className="text-base text-slate-700">{type === 'self-explanation' ? 'Explain your thinking aloud or on paper. Include how or why the idea works.' : 'Share your answer aloud or write it down before revealing the guide.'}</p> : body}
        {showAnswer && <div data-review-answer-guide className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-green-950" role="status">{answerGuide}</div>}
        {showAnswer && q.factCheck && <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-slate-700"><p className="mb-1 text-sm font-bold">Explanation</p>{typeof p.renderFormattedText === 'function' ? p.renderFormattedText(q.factCheck) : q.factCheck}</div>}
      </div>;
    }
    if (p.readOnly) return <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-950">{answerGuide}</div>;
    return <div data-presentation-question-type={type} className="bg-white p-4 sm:p-8 rounded-2xl border-2 border-slate-200 shadow-md"><div className="flex gap-4 mb-6"><div className="bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">{p.index + 1}</div><div className="flex-grow"><div className="text-xs uppercase tracking-wider font-black text-teal-800 mb-1">{_quizPresentationTypeLabel(type)}</div><h3 className="text-2xl font-bold text-slate-800 leading-tight">{renderText(q.question || '')}</h3>{q.question_en && <p className="text-lg text-slate-600 italic mt-2">{renderText(q.question_en)}</p>}</div></div>{q.imageUrl && <img src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} className="mb-5 max-h-80 w-full rounded-lg object-contain"/>}<div className="ml-0 md:ml-14">{body}<div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">{q.factCheck && <button type="button" onClick={p.onToggleExplanation} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-400 text-slate-700">{p.showExplanation ? 'Hide explanation' : 'Show explanation'}</button>}<button type="button" onClick={p.onToggleAnswer} aria-expanded={showAnswer} className={'text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 ' + (showAnswer ? 'bg-slate-200 text-slate-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}>{showAnswer ? <Eye size={14} /> : <MousePointerClick size={14} />}{showAnswer ? 'Hide answer guide' : 'Reveal answer guide'}</button></div>{showAnswer && <div className="mt-4 p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-950" role="status">{answerGuide}</div>}{p.showExplanation && q.factCheck && <div className="mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-slate-700">{typeof p.renderFormattedText === 'function' ? p.renderFormattedText(q.factCheck) : q.factCheck}</div>}</div></div>;
  }
  function _quizCreateAuthoringRequests(readProps) {
    var requests = new Map();
    function snapshot(props) { return JSON.stringify([props.generatedContent, props.inputText || '', props.gradeLevel || '', !!props.isTeacherMode]); }
    return {
      begin: function (key) {
        var props = readProps();
        var signature = snapshot(props);
        var existing = requests.get(key);
        if (existing && existing.signature === signature) return null;
        var request = { key: key, signature: signature };
        requests.set(key, request);
        return request;
      },
      current: function (request) { return !!request && requests.get(request.key) === request && request.signature === snapshot(readProps()); },
      end: function (request) {
        if (!request || requests.get(request.key) !== request) return false;
        requests.delete(request.key);
        return true;
      },
      clear: function () { requests.clear(); }
    };
  }
  function useQuizGameSetupModule(open, moduleKey, componentKey, loaderKey) {
    const isReady = () => typeof window.AlloModules?.[componentKey] === 'function';
    const [ready, setReady] = React.useState(isReady);
    const [failed, setFailed] = React.useState(false);
    const [attempt, setAttempt] = React.useState(0);
    React.useEffect(() => {
      if (!open) return;
      let requested = false, settled = false;
      const started = Date.now();
      setFailed(false);
      const inspect = () => {
        if (settled) return;
        if (isReady()) { settled = true; setReady(true); return; }
        setReady(false);
        try {
          // The loader can be installed after the assessment first renders.
          // Poll until it exists, then request once for this open/retry attempt.
          if (!requested && typeof window[loaderKey] === 'function') {
            requested = true;
            const retried = window.__alloModuleRegistry?.[moduleKey]?.status === 'failed' && window.__alloRetryModule?.(moduleKey);
            if (!retried) {
              const result = window[loaderKey]();
              if (result && typeof result.then === 'function') Promise.resolve(result).then(inspect, () => {
                if (!settled) { settled = true; setReady(isReady()); setFailed(!isReady()); }
              });
            }
          }
          if (isReady()) { settled = true; setReady(true); return; }
          if (window.__alloModuleRegistry?.[moduleKey]?.status === 'failed' || Date.now() - started >= 30000) {
            settled = true; setFailed(true);
          }
        } catch (_) { settled = true; setFailed(true); }
      };
      inspect();
      const timer = setInterval(inspect, 250);
      window.addEventListener('alloflow:module-registry-changed', inspect);
      return () => { settled = true; clearInterval(timer); window.removeEventListener('alloflow:module-registry-changed', inspect); };
    }, [open, attempt, moduleKey, componentKey, loaderKey]);
    return { ready, failed, retry: () => { setFailed(false); setAttempt(value => value + 1); } };
  }

  function _quizFeedbackSignature(data) {
    var text = JSON.stringify([data && data.questions || [], data && data.reflections || [], data && data.reflection || '']);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'assessment-' + (hash >>> 0).toString(36);
  }
  function _quizAttemptAnswer(q, index, responses) {
    var root = responses.root || {}, item = responses['q-' + index] || {}, type = q.type || 'mcq';
    if (type === 'mcq') { var optionIdx = (root.mcqAnswers || {})[index]; return { optionIdx: optionIdx, optionText: (q.options || [])[optionIdx] || '' }; }
    if (type === 'multi-select') return { selectedIndices: item.selected || [], selectedOptions: (item.selected || []).map(i => (q.options || [])[i]) };
    if (type === 'answer-evidence') return { answerIdx: item.answerIdx, evidenceIdx: item.evidenceIdx, answerText: (q.answerOptions || q.options || [])[item.answerIdx] || '', evidenceText: (q.evidenceOptions || [])[item.evidenceIdx] || '' };
    if (type === 'sequence-sense') return { verifyAnswer: item.verifyAnswer, clickedIdx: item.clickedIdx, orderAnswer: item.orderAnswer || q.presentedOrder || [], principleAnswer: item.principleAnswer };
    if (type === 'relation-mismatch') return { clickedPairIdx: item.clickedPairIdx, partnerAnswer: item.partnerAnswer };
    if (type === 'numeric-response') { var parsed = _quizParseNumericResponse(item.response || ''); return { text: item.response || '', numericValue: parsed ? parsed.value : null, unit: parsed ? parsed.unit : '' }; }
    return { text: item.response || '', status: 'submitted' };
  }
  function _quizResponseDescription(q, index, responses) {
    var a = _quizAttemptAnswer(q, index, responses);
    if ((q.type || 'mcq') === 'mcq') return a.optionText || 'No response';
    if (q.type === 'multi-select') return a.selectedOptions.join('; ') || 'No response';
    if (q.type === 'answer-evidence') return 'Answer: ' + (a.answerText || 'Not selected') + '. Evidence: ' + (a.evidenceText || 'Not selected');
    if (q.type === 'sequence-sense') return 'Order correct: ' + (a.verifyAnswer || 'Not selected') + '. Your order: ' + a.orderAnswer.map(i => (q.items || [])[i]).join(' → ') + '. Principle: ' + (a.principleAnswer || 'Not selected');
    if (q.type === 'relation-mismatch') return 'Pair: ' + (typeof a.clickedPairIdx === 'number' ? a.clickedPairIdx + 1 : 'Not selected') + '. Replacement: ' + (a.partnerAnswer || 'Not selected');
    return a.text || 'No response';
  }
  function AssessmentAttemptFeedback(p) {
    return <section data-assessment-attempt-feedback className="space-y-4" aria-label="Assessment feedback"><div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-indigo-950"><h2 className="text-lg font-bold">Review your responses</h2><p className="mt-1 text-sm">Compare your saved responses with the answer guides. Written responses may still need teacher review.</p></div>{(p.data.questions || []).map((q, i) => <article key={i} className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800"><h3 className="font-bold">{(i + 1) + '. ' + q.question}</h3><p className="mt-3 text-sm whitespace-pre-wrap"><strong>Your response: </strong>{_quizResponseDescription(q, i, p.receipt.responses || {})}</p><div className="mt-3" data-assessment-answer-guide>{(q.type || 'mcq') === 'mcq' ? <p className="text-sm"><strong>Answer guide: </strong>{q.correctAnswer || 'Teacher review'}</p> : <AssessmentPresentationItem q={q} showAnswer={true} onToggleAnswer={null} formatInlineText={p.formatInlineText} readOnly={true} />}</div>{q.factCheck && <p className="mt-3 text-sm whitespace-pre-wrap">{q.factCheck}</p>}</article>)}</section>;
  }
  function DeferredAssessmentItem(p) {
    var q = p.q, type = q.type, key = 'q-' + p.questionIdx;
    var [response, setResponse] = _quizUseDraftField(p.draftNamespace, key, 'response', '');
    var [selected, setSelected] = _quizUseDraftField(p.draftNamespace, key, 'selected', []);
    var [answerIdx, setAnswerIdx] = _quizUseDraftField(p.draftNamespace, key, 'answerIdx', null);
    var [evidenceIdx, setEvidenceIdx] = _quizUseDraftField(p.draftNamespace, key, 'evidenceIdx', null);
    var [verifyAnswer, setVerifyAnswer] = _quizUseDraftField(p.draftNamespace, key, 'verifyAnswer', null);
    var [clickedIdx, setClickedIdx] = _quizUseDraftField(p.draftNamespace, key, 'clickedIdx', null);
    var [principleAnswer, setPrincipleAnswer] = _quizUseDraftField(p.draftNamespace, key, 'principleAnswer', '');
    var [clickedPairIdx, setClickedPairIdx] = _quizUseDraftField(p.draftNamespace, key, 'clickedPairIdx', null);
    var [partnerAnswer, setPartnerAnswer] = _quizUseDraftField(p.draftNamespace, key, 'partnerAnswer', '');
    var [confidence, setConfidence] = _quizUseDraftField(p.draftNamespace, key, 'confidence', '');
    var initialOrder = Array.isArray(q.presentedOrder) && q.presentedOrder.length === (q.items || []).length && new Set(q.presentedOrder).size === q.presentedOrder.length && q.presentedOrder.every(i => Number.isInteger(i) && i >= 0 && i < q.items.length) ? q.presentedOrder : (q.items || []).map((_, i) => i);
    var [orderAnswer, setOrderAnswer] = _quizUseDraftField(p.draftNamespace, key, 'orderAnswer', () => initialOrder.slice());
    var inputClass = 'block mt-2 w-full min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800';
    function choices(label, options, value, update, multiple) {
      return <fieldset className="space-y-2"><legend className="text-sm font-semibold text-slate-800 mb-2">{label}</legend>{options.map((option, i) => <label key={i} className={'flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer ' + ((multiple ? value.includes(i) : value === i) ? 'bg-indigo-50 border-indigo-400 text-indigo-950' : 'bg-white border-slate-300 text-slate-800')}><input className="mt-1 shrink-0" type={multiple ? 'checkbox' : 'radio'} name={'assessment-' + p.questionIdx + '-' + label} checked={multiple ? value.includes(i) : value === i} onChange={() => update(multiple ? value.includes(i) ? value.filter(n => n !== i) : value.concat(i).sort((a,b) => a-b) : i)} /><span className="min-w-0 break-words">{String(option)}</span></label>)}</fieldset>;
    }
    _quizUseVoiceController(p, {
      getState: () => ({ type, response, selectedIndices: selected, answerIdx, evidenceIdx, verifyAnswer, clickedIdx, principleAnswer, clickedPairIdx, partnerAnswer, orderAnswer, graded: false, actions: ['enter-response', 'choose', 'check'], message: 'Responses are saved. Feedback is available ' + (p.feedbackTiming === 'teacher-release' ? 'after your teacher releases it.' : 'after submission.') }),
      execute: (action, request) => {
        if (action === 'check') return { ok: false, state: 'feedback-held', message: 'Feedback is available ' + (p.feedbackTiming === 'teacher-release' ? 'after your teacher releases it.' : 'after you submit the assessment.') };
        if (action === 'enter-response' && ['numeric-response','fill-blank','short-answer','self-explanation'].includes(type)) { setResponse(String(request.text || request.value || request.response || '')); return { ok: true, state: 'draft', message: 'Response saved.' }; }
        var options = type === 'multi-select' ? q.options : type === 'answer-evidence' ? (request.part === 'evidence' ? q.evidenceOptions : q.answerOptions) : null;
        if (action === 'choose' && Array.isArray(options)) { var n = Number.isInteger(request.optionIndex) ? request.optionIndex : _quizVoiceChoiceIndex(request.choice ?? request.value ?? request.text, options.length); if (n < 0) n = options.findIndex(value => String(value).toLowerCase() === String(request.choice ?? request.value ?? request.text ?? '').trim().toLowerCase()); if (n >= 0 && n < options.length) { if (type === 'multi-select') setSelected(selected.includes(n) ? selected.filter(i => i !== n) : selected.concat(n)); else if (request.part === 'evidence') setEvidenceIdx(n); else setAnswerIdx(n); return { ok: true, state: 'draft', message: 'Selection saved.' }; } }
        return { ok: false, state: 'unsupported-action', message: 'Use the labeled response controls for this part. Feedback stays hidden until release.' };
      }
    });
    return <div data-assessment-deferred-item={type} className="rounded-xl border border-slate-300 bg-white p-5 text-slate-800 shadow-sm"><div className="flex items-start gap-3 mb-4"><span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{p.itemNumber}</span><div className="min-w-0"><p className="mb-1 text-xs font-semibold text-slate-600">{_quizPresentationTypeLabel(type)}</p><h3 className="font-bold text-slate-800">{q.question}</h3>{q.question_en && <p className="mt-1 text-sm text-slate-600">{q.question_en}</p>}</div></div>{q.imageUrl && <img src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} className="mb-4 max-h-64 w-full object-contain" />}
      {type === 'multi-select' && choices('Choose all that apply', q.options || [], selected, setSelected, true)}
      {type === 'answer-evidence' && <div className="space-y-4">{choices('Choose an answer', q.answerOptions || q.options || [], answerIdx, setAnswerIdx)}{choices(q.evidencePrompt || 'Choose supporting evidence', q.evidenceOptions || [], evidenceIdx, setEvidenceIdx)}</div>}
      {['numeric-response','fill-blank','short-answer','self-explanation'].includes(type) && <label className="block text-sm font-semibold">Your response{type === 'numeric-response' && q.unit && <span className="block mt-1 font-normal">{'Include units (' + q.unit + ').'}</span>}{['numeric-response','fill-blank'].includes(type) ? <input className={inputClass} value={response} onChange={e => setResponse(e.target.value)} /> : <textarea aria-label={"Your response to question " + p.itemNumber} className={inputClass + ' resize-y'} rows={type === 'self-explanation' ? 5 : 3} value={response} onChange={e => setResponse(e.target.value)} />}<QuizVoiceInputButton value={response} onChange={setResponse} allowDictation={p.allowDictation} /></label>}
      {type === 'sequence-sense' && <div className="space-y-4"><ol className="list-decimal ps-6 text-sm space-y-1">{initialOrder.map(i => <li key={i}>{q.items[i]}</li>)}</ol>{choices('Is the displayed order correct?', ['Yes','No'], verifyAnswer === 'yes' ? 0 : verifyAnswer === 'no' ? 1 : null, i => setVerifyAnswer(i === 0 ? 'yes' : 'no'))}{verifyAnswer === 'no' && choices('Choose an item that is out of place', initialOrder.map(i => q.items[i]), clickedIdx, setClickedIdx)}<fieldset><legend className="text-sm font-semibold mb-2">Arrange your answer</legend><ol className="space-y-2">{orderAnswer.map((i, position) => <li key={i} className="flex items-center gap-2 rounded border border-slate-300 p-2"><span className="flex-1 text-sm">{q.items[i]}</span>{[-1,1].map(delta => <button key={delta} type="button" aria-label={(delta < 0 ? 'Move up: ' : 'Move down: ') + q.items[i]} disabled={position + delta < 0 || position + delta >= orderAnswer.length} onClick={() => { var next = orderAnswer.slice(); [next[position],next[position + delta]] = [next[position + delta],next[position]]; setOrderAnswer(next); }} className="min-h-11 min-w-11 rounded border border-slate-400 text-slate-800 disabled:opacity-40">{delta < 0 ? '↑' : '↓'}</button>)}</li>)}</ol></fieldset><label className="block text-sm font-semibold">Ordering principle<select className={inputClass} value={principleAnswer} onChange={e => setPrincipleAnswer(e.target.value)}><option value="">Choose a principle</option>{(q.principleOptions || ['chronological','cause-effect','process','size','hierarchy']).map(v => <option key={v}>{v}</option>)}</select></label></div>}
      {type === 'relation-mismatch' && <div className="space-y-4">{choices('Choose the mismatched pair', (q.pairs || []).map(pair => pair.left + ' → ' + pair.right), clickedPairIdx, setClickedPairIdx)}<label className="block text-sm font-semibold">Replacement partner{q.candidatePartners && q.candidatePartners.length ? <select className={inputClass} value={partnerAnswer} onChange={e => setPartnerAnswer(e.target.value)}><option value="">Choose a replacement</option>{q.candidatePartners.map(v => <option key={v}>{v}</option>)}</select> : <input aria-label={"Replacement partner for question " + p.itemNumber} className={inputClass} value={partnerAnswer} onChange={e => setPartnerAnswer(e.target.value)} />}</label></div>}
      {p.modeStrategy?.render?.allowConfidenceRating && <label className="block mt-4 text-sm font-semibold">Confidence (optional)<select className={inputClass} value={confidence || ''} onChange={e => setConfidence(e.target.value)}><option value="">Choose confidence</option><option value="knew">I know this</option><option value="guessed">I am unsure</option><option value="no-idea">I need support</option></select></label>}
      <p className="mt-4 text-xs text-slate-600">{p.feedbackTiming === 'teacher-release' ? 'Your teacher will release feedback after submission.' : 'Feedback will appear after you submit the assessment.'}</p>
    </div>;
  }
  function QuizView(props) {
    var identity = JSON.stringify([props.generatedContent?.id, props.activeSessionCode || '', props.sessionData?.quizState?.activityId || '', props.user?.uid || '', !!props.isTeacherMode, !!props.isParentMode, !!props.isIndependentMode]);
    var [previewScope, setPreviewScope] = React.useState('');
    var [previewNonce, setPreviewNonce] = React.useState(0);
    var preview = !!(props.isTeacherMode || props.isParentMode) && previewScope === identity;
    var previewNamespace = 'assess-preview:' + previewNonce + ':' + identity;
    React.useEffect(() => () => { delete _quizDraftMemory[previewNamespace]; }, [previewNamespace, preview]);
    var contentProps = preview ? { ...props, isTeacherMode:false, isParentMode:false, isIndependentMode:false, isPresentationMode:false, isReviewGame:false, isEditingQuiz:false, showQuizAnswers:false, escapeRoomState:{isActive:false}, _assessmentPreview:true, _previewNamespace:previewNamespace, onSubmitLiveAnswer:null, onResourceComplete:null, callGemini:null, callTTS:null, playSound:()=>{}, addToast:()=>{} } : props;
    return <div className="space-y-4">{(props.isTeacherMode || props.isParentMode) && <section data-assessment-preview-controls className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-3 text-slate-800">{preview ? <p className="text-sm"><strong>Student preview.</strong> Responses are temporary. AI grading and submission are disabled.</p> : <p className="text-sm">Check the questions and feedback settings from the learner's perspective.</p>}<button type="button" data-assessment-preview-toggle onClick={() => { setPreviewScope(preview ? '' : identity); setPreviewNonce(n => n + 1); }} className="min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900">{preview ? 'Exit student preview' : 'Preview as student'}</button></section>}<QuizViewContent key={identity + ':' + (preview ? previewNonce : 'actual') + ((!props.isTeacherMode && !props.isParentMode) || preview ? ':' + _quizFeedbackSignature(props.generatedContent?.data) : '')} {...contentProps} /></div>;
  }
  function QuizViewContent(props) {
    var authoringPropsRef = React.useRef(props);
    authoringPropsRef.current = props;
    var authoringRequestsRef = React.useRef(null);
    if (!authoringRequestsRef.current) authoringRequestsRef.current = _quizCreateAuthoringRequests(function () { return authoringPropsRef.current; });
    var authoringRequests = authoringRequestsRef.current;
    React.useEffect(function () {
      authoringRequests.clear();
      setRegeneratingQuestions({});
      setRepairingAssessment(false);
      setIsRefiningQuizImage({});
      setIsImprovingDistractor({});
      setIsBulkImproving(false);
      return function () { authoringRequests.clear(); };
    }, [props.generatedContent && props.generatedContent.id, props.isTeacherMode]);
    var t = props.t;
    var isTeacherMode = props.isTeacherMode;
    var isParentMode = props.isParentMode;
    var isIndependentMode = props.isIndependentMode;
    var allowDictation = isTeacherMode || !(props.studentProjectSettings && props.studentProjectSettings.allowDictation === false);
    var activeSessionCode = props.activeSessionCode;
    var sessionData = props.sessionData;
    var onSubmitLiveAnswer = activeSessionCode && typeof props.onSubmitLiveAnswer === 'function' ? props.onSubmitLiveAnswer : null;
    var assessmentData = props.generatedContent && props.generatedContent.data || {};
    var scoringPolicy = Object.assign({ partialCredit: true, writtenResponseMode: 'ai-provisional' }, assessmentData.scoringPolicy || {});
    var deliverySettings = _quizNormalizeDeliverySettings(assessmentData.deliverySettings);
    var assessmentAudit = _quizAuditAssessment(assessmentData);
    var assessmentH5PPreflight = _quizH5PPreflight(assessmentData);
    var learnerBaseDraftNamespace = props._assessmentPreview ? props._previewNamespace : !isTeacherMode && !isParentMode ? _quizDraftNamespace(assessmentData, activeSessionCode) + (sessionData?.quizState?.activityId ? ':' + sessionData.quizState.activityId : '') + (props.user?.uid ? ':user-' + encodeURIComponent(props.user.uid) : '') : '';
    var attemptReceiptState = React.useState(function () { return learnerBaseDraftNamespace ? _quizReadAttemptReceipt(learnerBaseDraftNamespace) : null; });
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
      var request = authoringRequests.begin('question:' + questionIdx);
      if (!request) return;
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
        if (!authoringRequests.current(request)) return;
        replacement.type = type;
        props.handleQuizQuestionAction(questionIdx, 'replace', replacement);
        if (typeof props.addToast === 'function') props.addToast('Question ' + (questionIdx + 1) + ' regenerated. Review it before sharing.', 'success');
      } catch (error) {
        if (authoringRequests.current(request) && typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : 'Question regeneration failed.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
        setRegeneratingQuestions(function (previous) {
          var next = Object.assign({}, previous);
          delete next[questionIdx];
          return next;
        });
      }
    }
    async function repairAssessmentQuality() {
      if (typeof props.callGemini !== 'function' || typeof props.handleQuizQuestionAction !== 'function') return;
      var request = authoringRequests.begin('repair');
      if (!request) return;
      setRepairingAssessment(true);
      try {
        var requestedMix = assessmentAudit.requestedMix || assessmentAudit.actualMix;
        var requestedSchemas = Object.keys(requestedMix || {}).filter(function (type) { return Number(requestedMix[type]) > 0; }).map(function (type) {
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
        if (!authoringRequests.current(request)) return;
        props.handleQuizQuestionAction(0, 'replace-all', { questions: questions });
        if (typeof props.addToast === 'function') props.addToast('Assessment repaired. Review the quality panel before sharing.', 'success');
      } catch (error) {
        if (authoringRequests.current(request) && typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : 'Assessment repair failed.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
        setRepairingAssessment(false);
      }
    }
    var attemptMetaState = _quizUseDraftField(draftNamespace, 'root', 'attemptMeta', function () {
      return { attemptId: 'attempt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), startedAt: Date.now(), status: 'in-progress' };
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
    var quizVoiceLastFeedbackRef = React.useRef('');
    var quizVoiceReflectionState = React.useState(null);
    var quizVoiceReflectionIdx = quizVoiceReflectionState[0];
    var setQuizVoiceReflectionIdx = quizVoiceReflectionState[1];
    var quizVoiceScopeRef = React.useRef({ getStatus: null, getCommands: null });
    var quizItemVoiceControllersRef = React.useRef({});
    var registerQuizItemVoiceController = React.useCallback(function (questionIdx, controller) {
      quizItemVoiceControllersRef.current[questionIdx] = controller;
      return function () {
        if (quizItemVoiceControllersRef.current[questionIdx] === controller) {
          delete quizItemVoiceControllersRef.current[questionIdx];
        }
      };
    }, []);
    function getQuizItemVoiceController(questionIdx) { return quizItemVoiceControllersRef.current[questionIdx] || _quizGetVoiceItemController(draftNamespace, questionIdx); }
    var initialTimeSeconds = deliverySettings.timeLimitMinutes > 0 ? Math.round(deliverySettings.timeLimitMinutes * 60) : 0;
    var timerStateHook = _quizUseDraftField(draftNamespace, 'root', 'timerState', function () {
      return { remainingSeconds: initialTimeSeconds, running: initialTimeSeconds > 0, deadlineAt: initialTimeSeconds > 0 ? Date.now() + initialTimeSeconds * 1000 : 0, expired: false };
    });
    var assessmentTimer = timerStateHook[0] || { remainingSeconds: 0, running: false, deadlineAt: 0, expired: false };
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
          if (remaining <= 0) return Object.assign({}, previous, { remainingSeconds: 0, running: false, expired: true });
          if (remaining === previous.remainingSeconds) return previous;
          return Object.assign({}, previous, { remainingSeconds: remaining });
        });
      };
      tick();
      var interval = window.setInterval(tick, 1000);
      return function () { window.clearInterval(interval); };
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
      setQuizVoiceReflectionIdx(null);
      setReviewOpen(false);
      window.setTimeout(function () {
        try {
          var node = document.getElementById('assessment-question-' + next);
          if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: (document.querySelector('.reduce-motion') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) ? 'auto' : 'smooth', block: 'start' });
        } catch (e) {}
      }, 0);
    }
    function toggleAssessmentTimer() {
      setAssessmentTimer(function (previous) {
        if (!previous || previous.expired) return previous;
        if (previous.running) {
          var remaining = Math.max(0, Math.ceil((Number(previous.deadlineAt) - Date.now()) / 1000));
          return Object.assign({}, previous, { remainingSeconds: remaining, running: false, deadlineAt: 0 });
        }
        var seconds = Math.max(1, Number(previous.remainingSeconds) || initialTimeSeconds || 1);
        return Object.assign({}, previous, { remainingSeconds: seconds, running: true, deadlineAt: Date.now() + seconds * 1000 });
      });
    }
    function extendAssessmentTimer() {
      var extensionSeconds = deliverySettings.extensionMinutes * 60;
      setAssessmentTimer(function (previous) {
        var current = previous || { remainingSeconds: 0, running: false, deadlineAt: 0, expired: false };
        var remaining = current.running && current.deadlineAt ? Math.max(0, Math.ceil((Number(current.deadlineAt) - Date.now()) / 1000)) : Math.max(0, Number(current.remainingSeconds) || 0);
        var nextRemaining = remaining + extensionSeconds;
        return Object.assign({}, current, { remainingSeconds: nextRemaining, running: true, deadlineAt: Date.now() + nextRemaining * 1000, expired: false });
      });
    }
    function updateAssessmentDelivery(nextSettings) {
      if (typeof props.handleQuizQuestionAction === 'function') props.handleQuizQuestionAction(0, 'patch-assessment', { deliverySettings: nextSettings });
    }
    var submissionContext = JSON.stringify([props.generatedContent?.id, _quizFeedbackSignature(assessmentData), activeSessionCode || '', props.user?.uid || '', sessionData?.quizState?.activityId || '', !!props._assessmentPreview]);
    var submissionContextRef = React.useRef(submissionContext);
    submissionContextRef.current = submissionContext;
    var submissionMountedRef = React.useRef(true);
    React.useEffect(function () { submissionMountedRef.current = true; return function () { submissionMountedRef.current = false; }; }, []);
    var submissionLockRef = React.useRef(false);
    var [deliveryBusy, setDeliveryBusy] = React.useState(false);
    var [feedbackReleaseBusy, setFeedbackReleaseBusy] = React.useState(false);
    var [feedbackReleaseError, setFeedbackReleaseError] = React.useState('');
    var feedbackSignature = _quizFeedbackSignature(assessmentData);
    var feedbackRelease = sessionData?.quizState?.assessmentFeedbackRelease;
    var feedbackReleased = deliverySettings.feedbackReleasedFor === feedbackSignature || !!(feedbackRelease && feedbackRelease.resourceId === String(props.generatedContent?.id || '') && feedbackRelease.signature === feedbackSignature);
    var deferFeedback = !isTeacherMode && !isParentMode && deliverySettings.feedbackTiming !== 'immediate';
    async function releaseAssessmentFeedback() {
      if (!isTeacherMode || props._assessmentPreview || feedbackReleaseBusy || typeof props.handleQuizQuestionAction !== 'function') return;
      setFeedbackReleaseBusy(true); setFeedbackReleaseError('');
      try {
        var result = await props.handleQuizQuestionAction(0, 'release-feedback', { signature: feedbackSignature });
        if (result !== true) throw new Error('Feedback release was not confirmed. Try again.');
      } catch (error) { setFeedbackReleaseError(error.message || 'Could not release feedback. Try again.'); }
      finally { setFeedbackReleaseBusy(false); }
    }
    function reportAssessmentCompletion(receipt) {
      if (typeof props.onResourceComplete === 'function' && props.generatedContent?.id && !props._assessmentPreview) {
        try { props.onResourceComplete(props.generatedContent.id, { answered: receipt.summary.answered, total: receipt.summary.total }); } catch (e) {}
      }
    }
    async function deliverAssessmentReceipt(receipt) {
      if (props._assessmentPreview || submissionLockRef.current || !receipt || !activeSessionCode) return;
      if (receipt.sessionCode !== activeSessionCode || receipt.activityId !== String(sessionData?.quizState?.activityId || '')) return;
      submissionLockRef.current = true; setDeliveryBusy(true);
      var scope = submissionContext, namespace = learnerBaseDraftNamespace;
      var current = () => submissionMountedRef.current && submissionContextRef.current === scope;
      var latest = Object.assign({}, receipt, { delivery: { status: 'sending' } });
      _quizFinalizeAttempt(namespace, latest); setAttemptReceipt(latest);
      try {
        if (typeof onSubmitLiveAnswer !== 'function' || !receipt.activityId) throw new Error('Your teacher connection is unavailable. Reconnect, then retry.');
        var questions = assessmentData.questions || [];
        for (var i = 0; i <= questions.length; i++) {
          if (!current()) return;
          var q = questions[i], complete = i === questions.length;
          var result = await onSubmitLiveAnswer({
            questionIdx: i, itemType: complete ? 'assessment-complete' : q.type || 'mcq', conceptLabel: complete ? '' : q.conceptLabel || '',
            answer: complete ? { attemptId: receipt.attemptId, answered: receipt.summary.answered, total: receipt.summary.total, submittedAt: receipt.submittedAt, reflections: receipt.responses.root?.reflectionAnswers || {} } : _quizAttemptAnswer(q, i, receipt.responses),
            answered: complete || _quizQuestionAnswered(q, i, { items: receipt.responses }),
            timestamp: receipt.submittedAt, activityId: receipt.activityId, requireConfirmation: true,
            requestId: receipt.attemptId + '-q' + i
          });
          if (!result || result.status !== 'received') throw new Error(result?.status === 'too-large' ? 'A response is too large for the live connection. Download your attempt to share with your teacher.' : 'Receipt was not confirmed. Your attempt is saved on this device. Reconnect, then retry.');
        }
        latest = Object.assign({}, receipt, { delivery: { status: 'received', receivedAt: Date.now() } });
        if (current()) reportAssessmentCompletion(latest);
      } catch (error) {
        latest = Object.assign({}, receipt, { delivery: { status: 'pending', message: error.message || 'Your attempt is saved. Delivery is not confirmed.' } });
      } finally {
        if (current()) { _quizFinalizeAttempt(namespace, latest); setAttemptReceipt(latest); setDeliveryBusy(false); }
        submissionLockRef.current = false;
      }
    }
    function downloadAssessmentAttempt() {
      if (!attemptReceipt || props._assessmentPreview) return;
      var exported = { title: assessmentData.title || 'Assessment', attemptId: attemptReceipt.attemptId, submittedAt: attemptReceipt.submittedAt, delivery: attemptReceipt.delivery, responses: (assessmentData.questions || []).map((q,i) => ({ question: q.question, type: q.type || 'mcq', response: _quizAttemptAnswer(q,i,attemptReceipt.responses || {}) })), reflections: attemptReceipt.responses?.root?.reflectionAnswers || {} };
      var url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
      var link = document.createElement('a'); link.href = url; link.download = 'assessment-attempt.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function submitAssessmentAttempt() {
      if (!draftNamespace || props._assessmentPreview || submissionLockRef.current) return null;
      var existing = _quizReadAttemptReceipt(draftNamespace);
      if (existing) { setAttemptReceipt(existing); return existing; }
      var working = _quizReadWorkingDraft(draftNamespace), progress = _quizBuildAttemptProgress(assessmentData, working), submittedAt = Date.now();
      var receipt = _quizFinalizeAttempt(draftNamespace, {
        attemptId: attemptMeta && attemptMeta.attemptId || ('attempt-' + submittedAt.toString(36)),
        startedAt: attemptMeta && attemptMeta.startedAt || submittedAt, submittedAt,
        summary: { total: progress.total, answered: progress.answered, unanswered: progress.unanswered, flagged: progress.flagged },
        responses: working.items, feedbackTiming: deliverySettings.feedbackTiming, signature: feedbackSignature,
        sessionCode: activeSessionCode || '', activityId: String(sessionData?.quizState?.activityId || ''),
        delivery: { status: activeSessionCode ? 'pending' : 'local' }
      });
      if (!receipt) { if (typeof props.addToast === 'function') props.addToast('Could not save your completed attempt. Your draft is still available. Please try again.', 'error'); return null; }
      setReviewOpen(false); setAttemptReceipt(receipt);
      if (activeSessionCode) deliverAssessmentReceipt(receipt); else reportAssessmentCompletion(receipt);
      if (typeof props.addToast === 'function') props.addToast('Completed attempt saved on this device.', 'success');
      return receipt;
    }
    function startAnotherAssessmentAttempt() {
      if (!_quizClearAttemptReceipt(learnerBaseDraftNamespace)) return;
      setAttemptReceipt(null);
      try { window.location.reload(); } catch (e) {}
    }    var mcqAnswersState = _quizUseDraftField(draftNamespace, 'root', 'mcqAnswers', {});
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
      if (!text) return false;
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = {
          draft: text,
          submitted: true,
          submittedText: text
        };
        return next;
      });
      if (typeof onSubmitLiveAnswer === 'function') try {
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
      return true;
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
    function clearReflection(rIdx) {
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = { draft: '', submitted: false, submittedText: '' };
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
      var request = authoringRequests.begin('image:' + key);
      if (!request) return;
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
        if (!authoringRequests.current(request)) return;
        if (typeof handleQuizImageRefine === 'function') {
          handleQuizImageRefine(qIdx, target, optIdx, refinedUrl);
        }
        setQuizImageRefineInputs(function (prev) {
          var next = Object.assign({}, prev);
          if (next[key] === instruction) delete next[key];
          return next;
        });
        setRefineOpen(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        if (typeof addToast === 'function') addToast(t('toasts.image_refined'), 'success');
      } catch (err) {
        if (authoringRequests.current(request) && typeof addToast === 'function') addToast(err && err.message || 'Refine failed — try again.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
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
      var request = authoringRequests.begin('distractor:' + key);
      if (!request) return;
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
        if (!authoringRequests.current(request)) return;
        handleQuizChange(qIdx, 'option', newText, optIdx);
        if (typeof addToast === 'function') addToast(t('toasts.distractor_rewritten'), 'success');
      } catch (err) {
        if (authoringRequests.current(request) && typeof addToast === 'function') addToast(err && err.message || 'Rewrite failed.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
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
          if (_quizAnswerMatches(q.options[optIdx], q.correctAnswer)) return;
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
      var request = authoringRequests.begin('bulk-distractors');
      if (!request) return;
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
        return Promise.resolve().then(function () { return props.callGemini(prompt, false); }).then(function (raw) {
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
      if (!authoringRequests.current(request)) {
        if (authoringRequests.end(request)) { setIsBulkImproving(false); setIsImprovingDistractor({}); }
        return;
      }
      authoringRequests.end(request);
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
      return <><button type="button" onClick={function (e) {
          e.stopPropagation();
          toggleRefinePanel(key);
        }} disabled={isLoading} className={'absolute top-1 right-1 ' + btnSize + ' rounded-full bg-white/90 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-700 shadow-sm flex items-center justify-center transition-colors motion-reduce:transition-none disabled:opacity-50'} title={isLoading ? 'Refining…' : 'Refine this image'} aria-label={t("a11y.refine_image")} data-help-key="quiz_image_refine_btn">{isLoading ? '⋯' : '✏️'}</button>{isOpen && <div className="mt-2 p-2 rounded border border-indigo-200 bg-indigo-50 text-xs"><div className="flex items-center gap-2 mb-1.5 flex-wrap"><button type="button" onClick={function () {
              refineQuizImage(qIdx, target, optIdx, 'Remove all text and labels from this image. Keep everything else identical.');
            }} disabled={isLoading} className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50" aria-label="Remove text from this image" title={t("tooltips.one_click_remove_text")}><span aria-hidden="true">🧹 </span>{t("ui_common.remove_text")}</button></div><textarea aria-label="Image refinement instructions" value={inputValue} onChange={function (e) {
            var v = e.target.value;
            setQuizImageRefineInputs(function (prev) {
              var next = Object.assign({}, prev);
              next[key] = v;
              return next;
            });
          }} onKeyDown={function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              refineQuizImage(qIdx, target, optIdx);
            }
          }} placeholder={'Describe how to refine this image (e.g. "make the background pure white", "add a clearer label")…'} rows={2} className="w-full text-xs p-1.5 rounded border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200  resize-y" disabled={isLoading} /><div className="flex items-center gap-2 mt-1.5"><button type="button" onClick={function () {
              refineQuizImage(qIdx, target, optIdx);
            }} disabled={isLoading || !inputValue.trim()} className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Refining…' : 'Submit'}</button><button type="button" onClick={function () {
              toggleRefinePanel(key);
            }} disabled={isLoading} className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50">{t("ui_common.cancel")}</button></div></div>}</>;
    }
    // Student answering must not inherit facilitator display flags after a role switch.
    var canFacilitateAssessment = !!(isTeacherMode || isParentMode);
    var canPlayAssessmentGames = canFacilitateAssessment || !!(isIndependentMode && !activeSessionCode);
    var isPresentationMode = canFacilitateAssessment && !!props.isPresentationMode;
    var isReviewGame = canPlayAssessmentGames && !!props.isReviewGame;
    var isEditingQuiz = !!(props.isEditingQuiz && isTeacherMode && !isParentMode && !isIndependentMode);
    var [quizGamesOpen, setQuizGamesOpen] = React.useState(false);
    var quizGamesButtonRef = React.useRef(null);
    var quizGamesPanelRef = React.useRef(null);
    function quizCopy(key, fallback) { var value = t(key); return !value || value === key ? fallback : value; }
    function closeQuizGames() { setQuizGamesOpen(false); quizGamesButtonRef.current?.focus(); }
    function launchQuizGame(action) { closeQuizGames(); if (typeof action === 'function') action(); }
    React.useEffect(function () {
      if (!quizGamesOpen) return;
      function dismiss(event) {
        if (event.type === 'keydown') { if (event.key === 'Escape') { event.preventDefault(); closeQuizGames(); } }
        else if (!quizGamesPanelRef.current?.contains(event.target) && !quizGamesButtonRef.current?.contains(event.target)) setQuizGamesOpen(false);
      }
      document.addEventListener('pointerdown', dismiss);
      document.addEventListener('keydown', dismiss);
      return function () { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss); };
    }, [quizGamesOpen]);
    var [presentationAllQuestions, setPresentationAllQuestions] = React.useState(false);
    var [presentationQuestionIndex, setPresentationQuestionIndex] = React.useState(0);
    var presentationQuestions = Array.isArray(props.generatedContent?.data?.questions) ? props.generatedContent.data.questions : [];
    var presentationSlides = presentationQuestions.map((question, index) => question ? index : -1).filter(index => index >= 0);
    var presentationCurrent = Math.max(0, Math.min(presentationQuestionIndex, presentationSlides.length - 1));
    React.useEffect(function () { setPresentationQuestionIndex(0); setPresentationAllQuestions(false); setQuizGamesOpen(false); }, [props.generatedContent?.id, props.isPresentationMode, canFacilitateAssessment, canPlayAssessmentGames]);
    var presentationReflections = Array.isArray(props.generatedContent?.data?.reflections) ? props.generatedContent.data.reflections.filter(ref => typeof ref === 'string' ? ref.trim() : ref?.text) : props.generatedContent?.data?.reflection ? [props.generatedContent.data.reflection] : [];
    var escapeRoomState = canPlayAssessmentGames ? (props.escapeRoomState || {isActive:false}) : {isActive:false};
    var escapeTimeLeft = props.escapeTimeLeft;
    var isEscapeTimerRunning = props.isEscapeTimerRunning;
    var gameTeams = props.gameTeams;
    var reviewGameState = props.reviewGameState;
    var scoreAnimation = props.scoreAnimation;
    var soundEnabled = props.soundEnabled;
    var globalPoints = props.globalPoints;
    var inputText = props.inputText;
    // Presentation selections are local discussion marks, never learner submissions or grades.
    // Include content and role boundaries so an old reveal cannot flash on a new surface.
    var presentationScope = JSON.stringify([props.generatedContent?.id || '', presentationQuestions, presentationReflections, !!isTeacherMode, !!isParentMode, !!isIndependentMode, activeSessionCode || '', props.user?.uid || '', isPresentationMode]);
    var [localPresentation, setLocalPresentation] = React.useState({scope:'',items:{}});
    var presentationScopeRef = React.useRef(presentationScope);
    presentationScopeRef.current = presentationScope;
    var presentationState = isPresentationMode && localPresentation.scope === presentationScope ? localPresentation.items : {};
    React.useEffect(function () { setLocalPresentation({scope:presentationScope,items:{}}); }, [presentationScope]);
    var visiblePresentationGuides = Object.values(presentationState).filter(item => item.showAnswer || item.showExplanation).length;
    function updatePresentationItem(index, update) {
      if (!canFacilitateAssessment || !isPresentationMode || !presentationQuestions[index] || presentationScopeRef.current !== presentationScope) return;
      setLocalPresentation(function (previous) {
        if (presentationScopeRef.current !== presentationScope) return previous;
        var items = previous.scope === presentationScope ? previous.items : {};
        return {scope:presentationScope,items:{...items,[index]:update(items[index] || {})}};
      });
    }
    var generatedContent = props.generatedContent;
    var isFactChecking = props.isFactChecking;
    var showQuizAnswers = canFacilitateAssessment && !!props.showQuizAnswers;
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
    var reviewModalOpen = !!(isReviewGame && reviewGameState && reviewGameState.activeQuestion);
    React.useEffect(function () {
      if (!reviewModalOpen) return;
      try { reviewPreviousFocusRef.current = document.activeElement; } catch (e) {}
      var raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(function () {
        try {
          if (reviewCloseBtnRef.current) reviewCloseBtnRef.current.focus();
          else if (reviewDialogRef.current) reviewDialogRef.current.focus();
        } catch (e) {}
      }) : setTimeout(function () {
        try {
          if (reviewCloseBtnRef.current) reviewCloseBtnRef.current.focus();
          else if (reviewDialogRef.current) reviewDialogRef.current.focus();
        } catch (e) {}
      }, 0);
      return function () {
        if (typeof cancelAnimationFrame === 'function' && raf) {
          try { cancelAnimationFrame(raf); } catch (e) {}
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
    function handlePresentationOptionClick(index, option) {
      if (!presentationQuestions[index]?.options?.includes(option)) return;
      updatePresentationItem(index, previous => previous.showAnswer ? previous : {...previous,selectedOption:option});
    }
    function togglePresentationAnswer(index) {
      updatePresentationItem(index, previous => ({...previous,showAnswer:!previous.showAnswer,showExplanation:false}));
    }
    function togglePresentationExplanation(index) {
      updatePresentationItem(index, previous => ({...previous,showExplanation:!previous.showExplanation}));
    }
    function resetPresentation() { setLocalPresentation({scope:presentationScope,items:{}}); }
    function hidePresentationGuides() {
      setLocalPresentation(function (previous) {
        if (previous.scope !== presentationScope) return {scope:presentationScope,items:{}};
        return {scope:presentationScope,items:Object.fromEntries(Object.entries(previous.items).map(([index,item]) => [index,{...item,showAnswer:false,showExplanation:false}]))};
      });
    }
    var handleQuizChange = props.handleQuizChange;
    var handleQuizImageRefine = props.handleQuizImageRefine;
    var handleQuizBulkOptionChange = props.handleQuizBulkOptionChange;
    var handleReflectionChange = props.handleReflectionChange;
    var handleFactCheck = props.handleFactCheck;
    var endCollaborativeEscapeRoom = props.endCollaborativeEscapeRoom;
    var resetEscapeRoom = props.resetEscapeRoom;
    var launchCollaborativeEscapeRoom = props.launchCollaborativeEscapeRoom;
    var launchConceptQuest = props.launchConceptQuest;
    var [soloQuestOpen, setSoloQuestOpen] = React.useState(false);
    var soloQuestSetup = useQuizGameSetupModule(canPlayAssessmentGames && soloQuestOpen, 'ConceptQuestSoloModule', 'ConceptQuestSolo', '__alloLazyConceptQuestSolo');
    function closeSoloQuest() { setSoloQuestOpen(false); setTimeout(() => quizGamesButtonRef.current?.focus(), 0); }
    var [boardSetupOpen, setBoardSetupOpen] = React.useState(false);
    var boardSetup = useQuizGameSetupModule(canPlayAssessmentGames && boardSetupOpen, 'LessonBoardModule', 'LessonBoardSetup', '__alloLazyLessonBoard');
    var [connectedSetupOpen, setConnectedSetupOpen] = React.useState(false);
    var connectedSetup = useQuizGameSetupModule(canPlayAssessmentGames && connectedSetupOpen, 'ConnectedEscapeRoomModule', 'ConnectedEscapeRoomSetup', '__alloLazyConnectedEscape');
    React.useEffect(function () { if (!canPlayAssessmentGames) { setSoloQuestOpen(false); setBoardSetupOpen(false); setConnectedSetupOpen(false); } }, [canPlayAssessmentGames]);
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
    var _aiExplainerEnabled = !deferFeedback && !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail) && typeof props.callGemini === 'function';
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
    var classExplainerBanner = _showClassExplainer ? <div key="class-explainer-banner" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 mb-2 shadow-sm animate-in motion-reduce:animate-none fade-in slide-in-from-top-2" role="region" aria-label="Teacher explanation"><div className="flex items-start gap-3"><span className="text-2xl flex-shrink-0" aria-hidden="true">📡</span><div className="flex-grow min-w-0"><div className="text-[10px] uppercase font-bold tracking-wider text-amber-800 mb-1">From your teacher · pause and read</div>{_pushedExplainer.conceptText && <p className="text-xs italic text-amber-700 mb-1">{'"' + _pushedExplainer.conceptText + '"'}</p>}<p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{_pushedExplainer.text}</p><div className="flex items-center gap-2 mt-3 flex-wrap">{typeof props.callTTS === 'function' && <button type="button" onClick={function () {
              try {
                if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_pushedExplainer.text);
                else props.callTTS(_pushedExplainer.text);
              } catch (e) {}
            }} className="text-xs font-bold px-3 py-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}<button type="button" onClick={function () {
              setDismissedExplainerTs(_pushedExplainer.ts);
            }} className="text-xs font-bold px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-800">✓ Got it</button></div></div></div></div> : null;
    var modeBanner = _showModeBanner ? <div key="mode-banner" className={'rounded-xl border-2 p-4 mb-2 ' + (_quizMode === 'pre-check' ? 'border-amber-300 bg-amber-50' : _quizMode === 'review' ? 'border-purple-300 bg-purple-50' : 'border-sky-300 bg-sky-50')} role="region" aria-label={_modeStrat.label}><div className="flex items-center gap-2 mb-1"><span className="text-xl" aria-hidden="true">{_modeStrat.icon}</span><h3 className={'font-black text-base ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')}>{_modeStrat.label}</h3><span className={'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (_quizMode === 'pre-check' ? 'bg-amber-200 text-amber-900' : _quizMode === 'review' ? 'bg-purple-200 text-purple-900' : 'bg-sky-200 text-sky-900')}>{_quizMode}</span></div>{_modeStrat.render.intro && <p className={'text-sm leading-relaxed ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')}>{_modeStrat.render.intro}</p>}{_smartSkips.length > 0 && <p className={'text-xs italic mt-2 ' + (_quizMode === 'pre-check' ? 'text-amber-800' : _quizMode === 'review' ? 'text-purple-800' : 'text-sky-800')}>{'ℹ️ Skipped ' + _smartSkips.join(' and ') + ' — using the dedicated tool instead avoids redundancy.'}</p>}{isTeacherMode && generatedContent && generatedContent.data && generatedContent.data.distractorReview && <div className="mt-2 flex items-center gap-2 flex-wrap" data-help-key="quiz_distractor_review_summary"><p className={'text-xs italic ' + (_quizMode === 'pre-check' ? 'text-amber-800' : 'text-sky-800')} title={(generatedContent.data.distractorReview.weakItems || []).length > 0 ? 'Weak items: Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
          return i + 1;
        }).join(', Q') : 'All MCQs have at least half their distractors encoding a known misconception'}><span aria-hidden="true">🎯 </span>{'Distractor review: ' + (generatedContent.data.distractorReview.misconceptionCount || 0) + ' of ' + (generatedContent.data.distractorReview.totalDistractors || 0) + ' distractors encode a misconception (' + (generatedContent.data.distractorReview.quality != null ? generatedContent.data.distractorReview.quality + '%' : '—') + ')' + ((generatedContent.data.distractorReview.weakItems || []).length > 0 ? ' — review Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
            return i + 1;
          }).join(', Q') + ' before deploying' : ' — looks solid')}</p>{isEditingQuiz && function () {
          var weakCount = (Array.isArray(generatedContent.data.questions) ? generatedContent.data.questions : []).reduce(function (sum, q) {
            if (!q || q.type && q.type !== 'mcq') return sum;
            if (!Array.isArray(q.distractorQuality)) return sum;
            return sum + q.distractorQuality.filter(function (dq) {
              return dq && dq.encodesMisconception === false && Array.isArray(q.options) && q.options.indexOf(dq.distractor) >= 0 && !_quizAnswerMatches(q.options[q.options.indexOf(dq.distractor)], q.correctAnswer);
            }).length;
          }, 0);
          if (weakCount === 0) return null;
          return <button type="button" onClick={bulkImproveDistractors} disabled={isBulkImproving} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors motion-reduce:transition-none" aria-label={isBulkImproving ? 'Rewriting ' + weakCount + ' weak distractors' : 'Rewrite all ' + weakCount + ' flagged distractors in one batch'} data-help-key="quiz_bulk_improve_btn" title={'Rewrite all ' + weakCount + ' flagged distractor' + (weakCount === 1 ? '' : 's') + ' in one batch'}><span aria-hidden="true">✨ </span>{isBulkImproving ? 'Rewriting ' + weakCount + '…' : 'Improve all ' + weakCount}</button>;
        }()}</div>}</div> : null;
    var explainerPanel = _aiExplainerEnabled ? <div key="ai-explainer" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6" role="region" aria-label="AI concept explainer"><div className="flex items-center gap-2 mb-2"><span className="text-lg" aria-hidden="true">🤖</span><h4 className="font-bold text-sm text-indigo-900">Don't know a concept? Ask for a quick explainer.</h4></div><p className="text-xs text-indigo-800 mb-2">Type any concept from the quiz (or any prior knowledge you're unsure about). The AI will give you a 60-90 word explanation tuned to your grade level.</p><div className="flex items-stretch gap-2"><input aria-label="Concept to explain" type="text" value={explainerInput} onChange={function (ev) {
          setExplainerInput(ev.target.value);
        }} onKeyDown={function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            explainConcept(explainerInput);
          }
        }} placeholder={_quizMode === 'pre-check' ? 'e.g., "what plants need to grow"' : 'e.g., "photosynthesis"'} className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400" /><button type="button" onClick={function () {
          explainConcept(explainerInput);
        }} disabled={!explainerInput.trim() || explainerData.loading} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none">{explainerData.loading ? 'Explaining…' : 'Explain'}</button></div>{explainerData.response && <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">{explainerData.topic}</div><p className="text-sm text-slate-800 leading-relaxed">{explainerData.response}</p>{typeof props.callTTS === 'function' && <button type="button" onClick={function () {
          if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(explainerData.response);
          else props.callTTS(explainerData.response);
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}{explainerData.error && <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">{explainerData.error}</div>}</div> : null;
    var qualityReviewPanel = isTeacherMode && !(activeSessionCode && sessionData && sessionData.quizState && sessionData.quizState.isActive) ? <AssessmentQualityPanel audit={assessmentAudit} h5p={assessmentH5PPreflight} repairing={repairingAssessment} onRepairAll={repairAssessmentQuality} /> : null;
    var deliverySettingsPanel = isTeacherMode && !(activeSessionCode && sessionData && sessionData.quizState && sessionData.quizState.isActive) ? <AssessmentDeliveryPanel settings={deliverySettings} onChange={updateAssessmentDelivery} onRelease={releaseAssessmentFeedback} released={feedbackReleased} releasing={feedbackReleaseBusy} releaseError={feedbackReleaseError} live={!!activeSessionCode} /> : null;
    var draftStatusPanel = draftNamespace && !isEditingQuiz && !isPresentationMode && !isReviewGame ? <AssessmentDraftStatus namespace={draftNamespace} /> : null;
    var oneQuestionAtATime = deliverySettings.pacing === 'one-at-a-time' && !isEditingQuiz && !isPresentationMode;
    var assessmentQuestionCount = Array.isArray(assessmentData.questions) ? assessmentData.questions.length : 0;
    var reviewProgress = draftNamespace ? _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace)) : null;
    // The navigation row keeps `pr-20 md:pr-0`: on phones the Student Tools
    // launcher is pinned to the bottom-right corner (view_fab_stack, 12px in),
    // and Next / Review & submit are the row's right-most controls, so without
    // that clearance the launcher covered them whenever the row scrolled to the
    // bottom of the screen.
    var learnerAttemptPanel = draftNamespace && !isEditingQuiz && !isPresentationMode && !isReviewGame ? <section className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4" aria-label="Assessment progress and submission"><AssessmentTimerBar enabled={deliverySettings.timeLimitMinutes > 0} remainingSeconds={assessmentTimer.remainingSeconds} running={assessmentTimer.running} expired={assessmentTimer.expired} warningMinutes={deliverySettings.warningMinutes} extensionMinutes={deliverySettings.extensionMinutes} onTogglePause={toggleAssessmentTimer} onExtend={extendAssessmentTimer} onReview={function () { setReviewOpen(true); }} /><div className={'flex items-center gap-2 flex-wrap pr-20 md:pr-0 ' + (deliverySettings.timeLimitMinutes > 0 ? 'mt-3' : '')}>{deliverySettings.showProgress && <span className="text-xs font-black text-indigo-950">{oneQuestionAtATime ? 'Question ' + (currentQuestionIdx + 1) + ' of ' + assessmentQuestionCount : assessmentQuestionCount + ' questions'}</span>}{oneQuestionAtATime && <div className="flex items-center gap-2"><button type="button" onClick={function () { goToAssessmentQuestion(currentQuestionIdx - 1); }} disabled={currentQuestionIdx <= 0} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-900 disabled:opacity-40">Previous</button><button type="button" onClick={function () { goToAssessmentQuestion(currentQuestionIdx + 1); }} disabled={currentQuestionIdx >= assessmentQuestionCount - 1} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-900 disabled:opacity-40">Next</button></div>}<button type="button" onClick={function () { setReviewOpen(true); }} className="ml-auto text-xs font-black px-3 py-1.5 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">Review &amp; submit</button></div></section> : null;
    var reviewDialog = <AssessmentReviewDialog preview={!!props._assessmentPreview} open={reviewOpen} progress={reviewProgress} onClose={function () { setReviewOpen(false); }} onGo={goToAssessmentQuestion} onSubmit={submitAssessmentAttempt} />;
    function getQuizReflections() {
      if (Array.isArray(assessmentData.reflections)) return assessmentData.reflections;
      return assessmentData.reflection ? [assessmentData.reflection] : [];
    }
    function getQuizVoiceReflectionStatus(reflections, canExit, requestedIdx) {
      var list = Array.isArray(reflections) ? reflections : [];
      var focusIdx = typeof requestedIdx === 'number' ? requestedIdx : quizVoiceReflectionIdx;
      var rIdx = typeof focusIdx === 'number' && focusIdx >= 0 && focusIdx < list.length ? focusIdx : null;
      if (rIdx === null) return null;
      var entry = reflectionAnswers[rIdx] || {};
      var draft = String(entry.draft || '');
      var submitted = !!entry.submitted;
      var response = submitted ? String(entry.submittedText || draft) : draft;
      var actions = ['status', 'describe', 'list-actions', 'list-reflections', 'select-reflection', 'read-reflection', 'read-reflection-response', 'return-to-question'];
      if (submitted) actions.push('edit-reflection');
      else {
        actions.push('set-reflection', 'append-reflection');
        if (draft.trim()) actions.push('submit-reflection');
      }
      if (response.trim() && !submitted) actions.push('clear-reflection');
      if (rIdx > 0) actions.push('previous-reflection');
      if (rIdx < list.length - 1) actions.push('next-reflection');
      if (draftNamespace) actions.push('submit');
      if (quizVoiceLastFeedbackRef.current) actions.push('repeat-feedback');
      if (canExit) actions.push('close');
      var prompt = _quizVoiceReflectionPrompt(list[rIdx]);
      var message = 'Reflection ' + (rIdx + 1) + ' of ' + list.length + '. ' + prompt;
      if (submitted) message += ' This reflection is submitted. Say read my reflection or edit reflection.';
      else if (draft.trim()) message += ' A draft response is present. Say read my reflection, append to reflection, clear reflection, or submit reflection.';
      else message += ' No response has been entered. Say set reflection to, followed by your response.';
      return {
        ok: true, ready: true, mounted: true, state: submitted ? 'reflection-submitted' : 'reflection-ready',
        surface: 'quiz', surfaceMode: 'reflection', type: 'reflection', actions: actions,
        reflectionIndex: rIdx, reflectionNumber: rIdx + 1, reflectionTotal: list.length,
        reflectionPrompt: prompt, reflectionResponse: response, reflectionSubmitted: submitted,
        canChooseByVoice: false, canEnterFreeformByVoice: !submitted, canResetByVoice: false,
        reviewOpen: reviewOpen, message: message
      };
    }
    // QUIZ VOICE SURFACE: semantic state actions; pointer and keyboard remain available.
    function getQuizVoiceBoundaryStatus() {
      var questions = Array.isArray(assessmentData.questions) ? assessmentData.questions : [];
      var reflections = getQuizReflections();
      var learnerSurface = (!isTeacherMode && !isParentMode) || isIndependentMode;
      var ordinarySurface = learnerSurface && !isEditingQuiz && !isPresentationMode && !isReviewGame && !(escapeRoomState && escapeRoomState.isActive);
      var canExit = typeof props.onClose === 'function' || typeof props.onExit === 'function';
      if (!ordinarySurface) {
        return {
          ok: false, ready: false, mounted: true, state: 'unsupported-mode', surface: 'quiz',
          actions: ['status'],
          message: 'Quiz voice controls are available only in the ordinary learner quiz view.'
        };
      }
      if (attemptReceipt) {
        return {
          ok: true, ready: false, mounted: true, state: 'submitted', surface: 'quiz',
          actions: canExit ? ['status', 'describe', 'close'] : ['status', 'describe'],
          message: attemptReceipt.delivery?.status === 'received' ? 'Your teacher device confirmed receipt of this attempt.' : 'Your completed attempt is saved on this device.' + (attemptReceipt.sessionCode ? ' Teacher receipt is not yet confirmed.' : '')
        };
      }
      if (reviewOpen) {
        var currentReviewProgress = reviewProgress || _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace));
        return {
          ok: true,
          ready: false,
          mounted: true,
          state: 'review',
          surface: 'quiz',
          surfaceMode: 'review',
          type: 'assessment-review',
          actions: ['status', 'describe', 'list-actions', 'submit', 'cancel-review'],
          reviewOpen: true,
          totalQuestions: questions.length,
          answeredCount: currentReviewProgress.answered,
          unansweredCount: currentReviewProgress.unanswered,
          flaggedCount: currentReviewProgress.flagged,
          message: 'Quiz review is open. ' + currentReviewProgress.answered + ' of ' + currentReviewProgress.total + ' questions are answered. Say submit assessment or cancel review.'
        };
      }
      var reflectionStatus = getQuizVoiceReflectionStatus(reflections, canExit);
      if (reflectionStatus) return reflectionStatus;
      if (questions.length === 0) {
        var emptyActions = ['status', 'describe'];
        if (reflections.length > 0) emptyActions.push('list-reflections', 'open-reflections', 'select-reflection');
        if (canExit) emptyActions.push('close');
        return {
          ok: reflections.length > 0, ready: false, mounted: true,
          state: reflections.length > 0 ? 'reflection-overview' : 'empty', surface: 'quiz',
          actions: emptyActions, reflectionTotal: reflections.length,
          message: reflections.length > 0
            ? 'This quiz has no questions and ' + reflections.length + ' reflection prompt' + (reflections.length === 1 ? '' : 's') + '. Say open reflections.'
            : 'This quiz does not contain any questions or reflections.'
        };
      }
      var questionIdx = Math.max(0, Math.min(questions.length - 1, currentQuestionIdx));
      var question = questions[questionIdx] || {};
      var type = question.type || 'mcq';
      var selectedOptionIdx = typeof studentMcqAnswers[questionIdx] === 'number' ? studentMcqAnswers[questionIdx] : null;
      var itemController = getQuizItemVoiceController(questionIdx);
      var itemState = itemController && typeof itemController.getState === 'function' ? itemController.getState() : null;
      var itemActions = itemState && Array.isArray(itemState.actions) ? itemState.actions : [];
      var actions = ['status', 'describe', 'list-actions', 'read-question'];
      if (reflections.length > 0) actions.push('list-reflections', 'open-reflections', 'select-reflection');
      if (type === 'mcq' && Array.isArray(question.options) && question.options.length > 0) actions.push('choose');
      itemActions.forEach(function (itemAction) { if (actions.indexOf(itemAction) < 0) actions.push(itemAction); });
      if (type === 'mcq' && isIndependentMode && typeof handleToggleShowQuizAnswers === 'function') actions.push('check');
      if (draftNamespace) actions.push('submit');
      if (questionIdx > 0) actions.push('previous');
      if (questionIdx < questions.length - 1) actions.push('next');
      if (quizVoiceLastFeedbackRef.current) actions.push('repeat-feedback');
      if (canExit) actions.push('close');
      return Object.assign({
        ok: true,
        ready: true,
        mounted: true,
        state: 'ready',
        surface: 'quiz',
        actions: actions,
        canChooseByVoice: (type === 'mcq' && Array.isArray(question.options) && question.options.length > 0) || itemActions.indexOf('choose') >= 0 || itemActions.indexOf('choose-answer') >= 0 || itemActions.indexOf('choose-evidence') >= 0,
        canChooseAnswerPartByVoice: itemActions.indexOf('choose-answer') >= 0,
        canChooseEvidencePartByVoice: itemActions.indexOf('choose-evidence') >= 0,
        reflectionTotal: reflections.length,
        canEnterFreeformByVoice: itemActions.indexOf('enter-response') >= 0,
        canResetByVoice: itemActions.indexOf('try-again') >= 0,
        reviewOpen: false,
        checked: Boolean(showQuizAnswers),
        message: 'Quiz is ready at question ' + (questionIdx + 1) + ' of ' + questions.length + '.'
      }, _quizVoiceQuestionPayload(question, questionIdx, questions.length, selectedOptionIdx, itemState));
    }
    function publishQuizVoiceBoundaryResult(result, request, action) {
      var input = request && typeof request === 'object' ? request : {};
      var payload = Object.assign({
        surface: 'quiz',
        action: action || 'status',
        requestId: input.requestId == null ? null : input.requestId
      }, result || {});
      try { if (typeof input.respond === 'function') input.respond(payload); } catch (e) {}
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent(QUIZ_VOICE_STATUS_EVENT, { detail: payload }));
        }
      } catch (e) {}
      return payload;
    }
    function handleQuizVoiceChoice(request, status, question) {
      if (!status.ready) return status;
      if (!question || (question.type && question.type !== 'mcq') || !Array.isArray(question.options)) {
        var itemController = getQuizItemVoiceController(status.questionIndex);
        if (itemController && typeof itemController.execute === 'function') {
          var itemResult = itemController.execute('choose', request);
          if (itemResult && itemResult.message) quizVoiceLastFeedbackRef.current = itemResult.message;
          return Object.assign({}, status, itemResult || {});
        }
        return Object.assign({}, status, {
          ok: false,
          state: 'unsupported-item',
          message: 'Choosing an option by voice is supported for multiple-choice items only. Voice entry for ' + status.type + ' is not available yet.'
        });
      }
      var requestedIndex = typeof request.optionIndex === 'number'
        ? Math.floor(request.optionIndex)
        : _quizVoiceChoiceIndex(request.choice != null ? request.choice : (request.option != null ? request.option : request.value), question.options.length);
      if (requestedIndex < 0 || requestedIndex >= Math.min(8, question.options.length)) {
        return Object.assign({}, status, {
          ok: false,
          state: 'invalid-choice',
          message: 'Choose an available option by letter A through H, number 1 through 8, or ordinal such as first or second.'
        });
      }
      selectMcqOption(status.questionIndex, requestedIndex, question.options[requestedIndex], question);
      var choiceLabel = String.fromCharCode(65 + requestedIndex);
      var choiceMessage = 'Option ' + choiceLabel + ' selected for question ' + status.questionNumber + '.';
      quizVoiceLastFeedbackRef.current = choiceMessage;
      return Object.assign({}, status, {
        ok: true,
        state: 'selected',
        selectedOptionIndex: requestedIndex,
        selectedOptionLabel: choiceLabel,
        message: choiceMessage
      });
    }
    function handleQuizVoiceCheck(status, question, selectedOptionIdx) {
      if (deferFeedback) return Object.assign({}, status, { ok:false, state:'feedback-held', message:'Feedback is available after submission' + (deliverySettings.feedbackTiming === 'teacher-release' ? ' and teacher release.' : '.') });
      if (!status.ready) return status;
      if (!isIndependentMode) {
        return Object.assign({}, status, {
          ok: false,
          state: 'inapplicable',
          message: draftNamespace
            ? 'This learner assessment uses review and submit instead of check answers.'
            : 'Check answers is not available in this quiz mode.'
        });
      }
      if (!question || (question.type && question.type !== 'mcq') || !Array.isArray(question.options)) {
        return Object.assign({}, status, {
          ok: false,
          state: 'unsupported-item',
          message: 'Voice checking is currently available for multiple-choice items only.'
        });
      }
      if (typeof selectedOptionIdx !== 'number') {
        return Object.assign({}, status, {
          ok: false,
          state: 'inapplicable',
          message: 'Choose an option before checking the answer.'
        });
      }
      if (typeof handleToggleShowQuizAnswers !== 'function') {
        return Object.assign({}, status, {
          ok: false,
          state: 'unsupported',
          message: 'Check answers is unavailable because this quiz has no check-answer handler.'
        });
      }
      if (!showQuizAnswers) handleToggleShowQuizAnswers();
      var isCorrect = _quizAnswerMatches(question.options[selectedOptionIdx], question.correctAnswer);
      var checkMessage = isCorrect
        ? 'Option ' + String.fromCharCode(65 + selectedOptionIdx) + ' is correct for question ' + status.questionNumber + '.'
        : 'Option ' + String.fromCharCode(65 + selectedOptionIdx) + ' is not correct for question ' + status.questionNumber + '. Try another option.';
      quizVoiceLastFeedbackRef.current = checkMessage;
      return Object.assign({}, status, {
        ok: true,
        state: 'checked',
        checked: true,
        correct: isCorrect,
        message: checkMessage
      });
    }
    function handleQuizVoiceReflectionNavigation(action, request, status) {
      var reflections = getQuizReflections();
      var canExit = typeof props.onClose === 'function' || typeof props.onExit === 'function';
      if (action === 'list-reflections') {
        if (reflections.length === 0) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'This quiz has no reflection prompts.' });
        var listed = reflections.slice(0, 20).map(function (reflection, idx) {
          return 'Reflection ' + (idx + 1) + ': ' + _quizVoiceReflectionPrompt(reflection);
        }).join(' ');
        if (reflections.length > 20) listed += ' Voice number selection is limited to the first 20 reflections.';
        return Object.assign({}, status, { ok: true, state: 'reflection-list', reflectionTotal: reflections.length, message: listed });
      }
      if (action === 'open-reflections' || action === 'select-reflection') {
        if (reflections.length === 0) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'This quiz has no reflection prompts.' });
        var requested = action === 'open-reflections' ? 0 : (
          typeof request.reflectionIndex === 'number'
            ? Math.floor(request.reflectionIndex)
            : _quizVoiceReflectionIndex(request.reflection != null ? request.reflection : (request.choice != null ? request.choice : request.value), reflections.length)
        );
        if (requested < 0 || requested >= reflections.length) {
          return Object.assign({}, status, { ok: false, state: 'invalid-reflection', message: 'Choose a reflection by its exact number, from 1 through ' + Math.min(20, reflections.length) + '.' });
        }
        setQuizVoiceReflectionIdx(requested);
        return Object.assign({}, getQuizVoiceReflectionStatus(reflections, canExit, requested), { state: 'reflection-selected' });
      }
      if (action === 'next-reflection' || action === 'previous-reflection') {
        if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Open reflections before moving between reflection prompts.' });
        var nextIdx = status.reflectionIndex + (action === 'next-reflection' ? 1 : -1);
        if (nextIdx < 0 || nextIdx >= reflections.length) {
          return Object.assign({}, status, { ok: false, state: 'inapplicable', message: action === 'next-reflection' ? 'This is the last reflection.' : 'This is the first reflection.' });
        }
        setQuizVoiceReflectionIdx(nextIdx);
        return Object.assign({}, getQuizVoiceReflectionStatus(reflections, canExit, nextIdx), { state: 'reflection-selected' });
      }
      if (action === 'return-to-question') {
        if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Quiz voice focus is already on a question.' });
        setQuizVoiceReflectionIdx(null);
        var questions = Array.isArray(assessmentData.questions) ? assessmentData.questions : [];
        if (questions.length === 0) return { ok: true, ready: false, mounted: true, state: 'reflection-overview', surface: 'quiz', reflectionTotal: reflections.length, message: 'Returned to the Quiz overview. This quiz has no questions.' };
        var qIdx = Math.max(0, Math.min(questions.length - 1, currentQuestionIdx));
        return Object.assign({ ok: true, ready: true, mounted: true, state: 'returned-to-question', surface: 'quiz' }, _quizVoiceQuestionPayload(questions[qIdx], qIdx, questions.length, studentMcqAnswers[qIdx]), { message: 'Returned to question ' + (qIdx + 1) + ' of ' + questions.length + '.' });
      }
      if (action === 'read-reflection' || action === 'read-reflection-response') {
        if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Open or select a reflection first.' });
        if (action === 'read-reflection') return Object.assign({}, status, { ok: true, state: 'reading-reflection', message: 'Reflection ' + status.reflectionNumber + ' of ' + status.reflectionTotal + '. ' + status.reflectionPrompt });
        return Object.assign({}, status, {
          ok: !!String(status.reflectionResponse || '').trim(),
          state: String(status.reflectionResponse || '').trim() ? 'reading-reflection-response' : 'inapplicable',
          message: String(status.reflectionResponse || '').trim() ? 'Your reflection response is: ' + status.reflectionResponse : 'No reflection response has been entered.'
        });
      }
      return null;
    }
    function handleQuizVoiceReflectionEdit(action, request, status) {
      if (['set-reflection', 'append-reflection', 'clear-reflection', 'submit-reflection', 'edit-reflection'].indexOf(action) < 0) return null;
      if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Open or select a reflection before changing its response.' });
      var rIdx = status.reflectionIndex;
      var entry = reflectionAnswers[rIdx] || {};
      var current = String(entry.draft || '');
      if (action === 'edit-reflection') {
        if (!entry.submitted) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'This reflection is already open for editing.' });
        reopenReflection(rIdx);
        var editMessage = 'Reflection ' + (rIdx + 1) + ' reopened for editing. Your submitted text remains in the draft.';
        quizVoiceLastFeedbackRef.current = editMessage;
        return Object.assign({}, status, { ok: true, state: 'reflection-editing', reflectionSubmitted: false, message: editMessage });
      }
      if (entry.submitted) return Object.assign({}, status, { ok: false, state: 'locked', message: 'This reflection is submitted. Say edit reflection before changing it.' });
      if (action === 'set-reflection' || action === 'append-reflection') {
        var text = _quizVoiceRequestText(request);
        if (!text) return Object.assign({}, status, { ok: false, state: 'invalid-response', message: action === 'set-reflection' ? 'Say set reflection to, followed by your response.' : 'Say append to reflection, followed by the text to add.' });
        if (action === 'set-reflection' && current.trim() && current.trim() !== text && request.confirmed !== true) {
          return Object.assign({}, status, {
            ok: false, state: 'confirmation-required', confirmationRequired: true, confirmationToken: 'replace-reflection',
            message: 'Setting this reflection will replace the current draft. Confirm set reflection to replace it, or say append to reflection.'
          });
        }
        var nextText = action === 'append-reflection' && current.trim() ? current.replace(/\s+$/g, '') + ' ' + text : text;
        setReflectionDraft(rIdx, nextText);
        var wordCount = nextText.trim() ? nextText.trim().split(/\s+/).length : 0;
        var changedMessage = 'Reflection ' + (rIdx + 1) + (action === 'append-reflection' ? ' updated. ' : ' response set. ') + wordCount + ' word' + (wordCount === 1 ? '' : 's') + ' in the draft.';
        quizVoiceLastFeedbackRef.current = changedMessage;
        return Object.assign({}, status, { ok: true, state: action === 'append-reflection' ? 'reflection-appended' : 'reflection-set', reflectionResponse: nextText, message: changedMessage });
      }
      if (action === 'clear-reflection') {
        if (!current.trim()) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'The current reflection response is already empty.' });
        if (request.confirmed !== true) return Object.assign({}, status, {
          ok: false, state: 'confirmation-required', confirmationRequired: true, confirmationToken: 'clear-reflection',
          message: 'Clear reflection will permanently erase the current response. Confirm clear reflection to continue.'
        });
        clearReflection(rIdx);
        var clearMessage = 'Reflection ' + (rIdx + 1) + ' response cleared.';
        quizVoiceLastFeedbackRef.current = clearMessage;
        return Object.assign({}, status, { ok: true, state: 'reflection-cleared', reflectionResponse: '', reflectionSubmitted: false, message: clearMessage });
      }
      if (!current.trim()) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Enter a reflection response before submitting it.' });
      if (request.confirmed !== true) return Object.assign({}, status, {
        ok: false, state: 'confirmation-required', confirmationRequired: true, confirmationToken: 'submit-reflection',
        message: 'Submit reflection ' + (rIdx + 1) + ' now? You can reopen it later by saying edit reflection. Confirm submit reflection to continue.'
      });
      if (!submitReflection(rIdx)) return Object.assign({}, status, { ok: false, state: 'error', message: 'The reflection could not be submitted. Its draft remains saved.' });
      var submitMessage = 'Reflection ' + (rIdx + 1) + ' submitted.';
      quizVoiceLastFeedbackRef.current = submitMessage;
      return Object.assign({}, status, { ok: true, state: 'reflection-submitted', reflectionSubmitted: true, message: submitMessage });
    }
    function handleQuizVoiceSubmit(request, status) {
      if (props._assessmentPreview) return Object.assign({}, status, { ok:false, state:'preview', message:'Submission is disabled in student preview.' });
      if (status.surfaceMode === 'review') {
        if (!draftNamespace) {
          return Object.assign({}, status, {
            ok: false,
            state: 'inapplicable',
            message: 'This quiz mode does not have a submit-assessment action.'
          });
        }
        if (request.confirmed !== true) {
          return Object.assign({}, status, {
            ok: false,
            state: 'confirmation-required',
            confirmationRequired: true,
            confirmationToken: 'submit-assessment',
            message: 'Submit this assessment now? Say yes or no.'
          });
        }
        var reviewReceipt = submitAssessmentAttempt();
        if (!reviewReceipt) {
          return Object.assign({}, status, {
            ok: false,
            state: 'error',
            message: 'The assessment could not be submitted. The draft remains saved.'
          });
        }
        var reviewSubmitMessage = 'Completed attempt saved on this device with ' + reviewReceipt.summary.answered + ' of ' + reviewReceipt.summary.total + ' questions answered.';
        quizVoiceLastFeedbackRef.current = reviewSubmitMessage;
        return {
          ok: true,
          ready: false,
          mounted: true,
          state: 'submitted',
          surface: 'quiz',
          receipt: {
            submittedAt: reviewReceipt.submittedAt,
            total: reviewReceipt.summary.total,
            answered: reviewReceipt.summary.answered,
            unanswered: reviewReceipt.summary.unanswered
          },
          message: reviewSubmitMessage
        };
      }
      if (!status.ready) return status;
      if (!draftNamespace) {
        return Object.assign({}, status, {
          ok: false,
          state: 'inapplicable',
          message: 'This quiz mode does not have a submit-assessment action. Use check instead when it is available.'
        });
      }
      if (request.confirmed !== true) {
        setReviewOpen(true);
        var submitProgress = reviewProgress || _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace));
        return Object.assign({}, status, {
          ok: false,
          state: 'confirmation-required',
          reviewOpen: true,
          confirmationRequired: true,
          confirmationToken: 'submit-assessment',
          message: 'Review opened. ' + submitProgress.answered + ' of ' + submitProgress.total + ' questions are answered. Confirm submit assessment to finish.'
        });
      }
      var receipt = submitAssessmentAttempt();
      if (!receipt) {
        return Object.assign({}, status, {
          ok: false,
          state: 'error',
          message: 'The assessment could not be submitted. The draft remains saved.'
        });
      }
      var submitMessage = 'Completed attempt saved on this device with ' + receipt.summary.answered + ' of ' + receipt.summary.total + ' questions answered.';
      quizVoiceLastFeedbackRef.current = submitMessage;
      return {
        ok: true,
        ready: false,
        mounted: true,
        state: 'submitted',
        surface: 'quiz',
        receipt: {
          submittedAt: receipt.submittedAt,
          total: receipt.summary.total,
          answered: receipt.summary.answered,
          unanswered: receipt.summary.unanswered
        },
        message: submitMessage
      };
    }
    function handleQuizVoiceOtherAction(action, status) {
      if (action === 'cancel-review') {
        if (!status.reviewOpen) {
          return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Quiz review is not open.' });
        }
        setReviewOpen(false);
        return Object.assign({}, status, {
          ok: true,
          ready: true,
          state: 'review-closed',
          surfaceMode: 'question',
          reviewOpen: false,
          message: 'Quiz review closed. Your assessment draft remains saved.'
        });
      }
      if (action === 'next' || action === 'previous') {
        if (!status.ready) return status;
        var nextQuestionIdx = status.questionIndex + (action === 'next' ? 1 : -1);
        if (nextQuestionIdx < 0 || nextQuestionIdx >= status.totalQuestions) {
          return Object.assign({}, status, {
            ok: false,
            state: 'inapplicable',
            message: action === 'next' ? 'This is the last question.' : 'This is the first question.'
          });
        }
        goToAssessmentQuestion(nextQuestionIdx);
        return Object.assign({}, _quizVoiceQuestionPayload(
          assessmentData.questions[nextQuestionIdx] || {},
          nextQuestionIdx,
          status.totalQuestions,
          studentMcqAnswers[nextQuestionIdx]
        ), {
          ok: true,
          ready: true,
          mounted: true,
          state: 'navigated',
          surface: 'quiz',
          message: 'Moved to question ' + (nextQuestionIdx + 1) + ' of ' + status.totalQuestions + '.'
        });
      }
      if (action === 'repeat-feedback' || action === 'repeat-response') {
        return quizVoiceLastFeedbackRef.current
          ? Object.assign({}, status, { ok: true, state: 'feedback', message: quizVoiceLastFeedbackRef.current })
          : Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'There is no Quiz feedback to repeat yet.' });
      }
      if (action === 'close' || action === 'exit') {
        var exitHandler = typeof props.onClose === 'function' ? props.onClose : (typeof props.onExit === 'function' ? props.onExit : null);
        if (!exitHandler) {
          return Object.assign({}, status, {
            ok: false,
            state: 'unsupported',
            message: 'This Quiz host did not provide a close action.'
          });
        }
        try {
          exitHandler();
          return Object.assign({}, status, { ok: true, state: 'closed', message: 'Quiz closed.' });
        } catch (error) {
          return Object.assign({}, status, { ok: false, state: 'error', message: 'Quiz could not close.' });
        }
      }
      return null;
    }
    function executeQuizVoiceAction(request, action, status) {
      var question = status.ready && Array.isArray(assessmentData.questions)
        ? assessmentData.questions[status.questionIndex]
        : null;
      var selectedOptionIdx = status.ready && typeof studentMcqAnswers[status.questionIndex] === 'number'
        ? studentMcqAnswers[status.questionIndex]
        : null;
      if (action === 'status') return status;
      var reflectionNavigation = handleQuizVoiceReflectionNavigation(action, request, status);
      if (reflectionNavigation) return reflectionNavigation;
      var reflectionEdit = handleQuizVoiceReflectionEdit(action, request, status);
      if (reflectionEdit) return reflectionEdit;
      if (action === 'describe') {
        if (status.surfaceMode === 'reflection') return Object.assign({}, status, { message: status.message + ' Say list actions for reflection commands, or return to question.' });
        if (!status.ready) return status;
        var description = 'Ordinary learner quiz. Question ' + status.questionNumber + ' of ' + status.totalQuestions + '.';
        var progress = reviewProgress;
        if (progress) {
          description += ' ' + progress.answered + ' answered and ' + progress.unanswered + ' unanswered.';
        } else {
          description += ' ' + Object.keys(studentMcqAnswers || {}).length + ' multiple-choice selection' +
            (Object.keys(studentMcqAnswers || {}).length === 1 ? '' : 's') + ' made.';
        }
        if (status.type === 'mcq') description += ' Say read question or choose an option.';
        else if (status.canEnterFreeformByVoice) description += ' Say response followed by your answer, then say check response.';
        else if (status.canChooseByVoice) description += ' Say read question, then choose an available item or option.';
        else description += ' This ' + status.type + ' item does not expose a safe voice answer action.';
        return Object.assign({}, status, {
          progress: progress ? {
            total: progress.total,
            answered: progress.answered,
            unanswered: progress.unanswered,
            flagged: progress.flagged
          } : null,
          timer: deliverySettings.timeLimitMinutes > 0 ? {
            remainingSeconds: assessmentTimer.remainingSeconds,
            running: assessmentTimer.running,
            expired: assessmentTimer.expired
          } : null,
          message: description
        });
      }
      if (action === 'list-actions' || action === 'actions') {
        return Object.assign({}, status, {
          message: status.ready ? 'Available Quiz voice actions: ' + status.actions.join(', ') + '.' : status.message
        });
      }
      if (action === 'read' || action === 'read-question' || action === 'repeat-question') {
        return status.ready ? Object.assign({}, status, { state: 'reading' }) : status;
      }
      if (action === 'choose-answer' || action === 'choose-evidence') {
        var partController = getQuizItemVoiceController(status.questionIndex);
        if (!partController || typeof partController.execute !== 'function') return Object.assign({}, status, { ok: false, state: 'unsupported-item', message: 'This item does not expose answer-and-evidence voice selection.' });
        var partResult = partController.execute(action, request);
        if (partResult && partResult.message) quizVoiceLastFeedbackRef.current = partResult.message;
        return Object.assign({}, status, partResult || {});
      }
      if (action === 'choose' || action === 'select' || action === 'answer') {
        return handleQuizVoiceChoice(request, status, question);
      }
      if (action === 'check' || (action === 'submit-or-check' && !draftNamespace)) {
        if (question && question.type && question.type !== 'mcq') {
          var checkController = getQuizItemVoiceController(status.questionIndex);
          if (!checkController || typeof checkController.execute !== 'function') return Object.assign({}, status, { ok: false, state: 'unsupported-item', message: 'This item does not expose a safe voice check action.' });
          var checkResult = checkController.execute('check', request);
          if (checkResult && checkResult.message) quizVoiceLastFeedbackRef.current = checkResult.message;
          return Object.assign({}, status, checkResult || {});
        }
        return handleQuizVoiceCheck(status, question, selectedOptionIdx);
      }
      if (action === 'enter-response' || action === 'try-again' || action === 'reset') {
        var itemController = getQuizItemVoiceController(status.questionIndex);
        if (!itemController || typeof itemController.execute !== 'function') return Object.assign({}, status, { ok: false, state: 'unsupported-item', message: 'This item does not expose that voice action.' });
        var itemResult = itemController.execute(action, request);
        if (itemResult && itemResult.message) quizVoiceLastFeedbackRef.current = itemResult.message;
        return Object.assign({}, status, itemResult || {});
      }
      if (action === 'submit' || (action === 'submit-or-check' && Boolean(draftNamespace))) {
        return handleQuizVoiceSubmit(request, status);
      }
      var otherResult = handleQuizVoiceOtherAction(action, status);
      return otherResult || Object.assign({}, status, {
        ok: false,
        state: 'invalid-action',
        message: 'Unsupported Quiz voice action. Ask to list actions.'
      });
    }
    function getQuizVoiceScopedCommands() {
      var status = getQuizVoiceBoundaryStatus();
      var command = function (id, label, aliases, extra) {
        return Object.assign({ id: id, label: label, aliases: aliases || [] }, extra || {});
      };
      var commands = [
        command('quiz_describe', 'Describe this Quiz', ['describe quiz', 'quiz status']),
        command('quiz_list_actions', 'List Quiz actions', ['list actions', 'what can I do'])
      ];
      if (status.ready && status.surfaceMode !== 'reflection' && status.canEnterFreeformByVoice) {
        commands.push(command('quiz_enter_response', 'Enter a Quiz response', ['response followed by your answer', 'my answer is'], {
          params: ['response'],
          risk: 'state-change',
          confirmation: 'low-confidence',
          confirmMessage: 'Update this Quiz response? The dictated text will not be repeated. Say yes or no.'
        }));
      }
      if (status.actions && status.actions.indexOf('read-question') >= 0) commands.push(command('quiz_read_question', 'Read the current question', ['read question', 'repeat question']));
      if (status.ready && status.canResetByVoice) commands.push(command('quiz_try_again', 'Reset this Quiz response', ['try again', 'reset answer', 'clear answer'], status.itemState && status.itemState.resetRequiresConfirmation ? { risk: 'destructive', confirmation: 'always', confirmMessage: 'Clear this Quiz response and try again? Say yes or no.' } : { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Reset this Quiz response and try again? Say yes or no.' }));
      if (status.ready && status.type !== 'answer-evidence' && status.canChooseByVoice) {
        commands.push(command('quiz_choose', 'Choose a Quiz answer', ['choose A', 'answer one', 'select first'], { params: ['choice'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Change the selected Quiz answer? Say yes or no.' }));
      }
      if (status.ready && status.canChooseAnswerPartByVoice) commands.push(command('quiz_choose_answer', 'Choose the answer part', ['choose answer A', 'select answer option one'], { params: ['choice'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Change the selected answer part? Say yes or no.' }));
      if (status.ready && status.canChooseEvidencePartByVoice) commands.push(command('quiz_choose_evidence', 'Choose the evidence part', ['choose evidence A', 'select evidence option one'], { params: ['choice'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Change the selected evidence part? Say yes or no.' }));
      if (status.ready && status.actions.indexOf('check') >= 0) {
        commands.push(command('quiz_check', status.type === 'answer-evidence' ? 'Check both answer and evidence parts' : 'Check my Quiz answer', status.type === 'answer-evidence' ? ['check both parts', 'check answer and evidence'] : ['check answer', 'check my answer'], { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Check this Quiz response now? Say yes or no.' }));
      }
      if (status.actions && status.actions.indexOf('list-reflections') >= 0) commands.push(command('quiz_list_reflections', 'List Quiz reflections', ['list reflections', 'read reflections']));
      if (status.actions && status.actions.indexOf('open-reflections') >= 0) commands.push(command('quiz_open_reflections', 'Open Quiz reflections', ['open reflections', 'go to reflections'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('select-reflection') >= 0) commands.push(command('quiz_select_reflection', 'Select a Quiz reflection', ['select reflection one', 'open reflection two'], { params: ['reflection'], risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('read-reflection') >= 0) commands.push(command('quiz_read_reflection', 'Read the reflection prompt', ['read reflection', 'read the reflection']));
      if (status.actions && status.actions.indexOf('read-reflection-response') >= 0) commands.push(command('quiz_read_reflection_response', 'Read my reflection response', ['read my reflection', 'read reflection response']));
      if (status.actions && status.actions.indexOf('set-reflection') >= 0) commands.push(command('quiz_set_reflection', 'Set the reflection response', ['set reflection to'], Object.assign({ params: ['response'] }, String(status.reflectionResponse || '').trim() ? { risk: 'destructive', confirmation: 'always', confirmMessage: 'Replace the current reflection draft? Say yes or no.' } : { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Set this reflection response? The dictated text will not be repeated. Say yes or no.' })));
      if (status.actions && status.actions.indexOf('append-reflection') >= 0) commands.push(command('quiz_append_reflection', 'Append to the reflection response', ['append to reflection', 'add to my reflection'], { params: ['response'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Append to this reflection? The dictated text will not be repeated. Say yes or no.' }));
      if (status.actions && status.actions.indexOf('clear-reflection') >= 0) commands.push(command('quiz_clear_reflection', 'Clear the reflection response', ['clear reflection', 'clear my reflection'], { risk: 'destructive', confirmation: 'always', confirmMessage: 'Permanently clear this reflection response? Say yes or no.' }));
      if (status.actions && status.actions.indexOf('submit-reflection') >= 0) commands.push(command('quiz_submit_reflection', 'Submit this reflection', ['submit reflection', 'submit my reflection'], { risk: 'destructive', confirmation: 'always', confirmMessage: 'Submit this reflection now? Say yes or no.' }));
      if (status.actions && status.actions.indexOf('edit-reflection') >= 0) commands.push(command('quiz_edit_reflection', 'Edit the submitted reflection', ['edit reflection', 'edit my reflection'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('next-reflection') >= 0) commands.push(command('quiz_next_reflection', 'Next Quiz reflection', ['next reflection'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('previous-reflection') >= 0) commands.push(command('quiz_previous_reflection', 'Previous Quiz reflection', ['previous reflection'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('return-to-question') >= 0) commands.push(command('quiz_return_to_question', 'Return to the Quiz question', ['return to question', 'back to question'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.ready && status.actions.indexOf('next') >= 0) commands.push(command('quiz_next', 'Next Quiz question', ['next', 'next question'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.ready && status.actions.indexOf('previous') >= 0) commands.push(command('quiz_previous', 'Previous Quiz question', ['previous', 'previous question'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('repeat-feedback') >= 0) commands.push(command('quiz_repeat_feedback', 'Repeat Quiz feedback', ['repeat feedback', 'repeat response']));
      if (status.actions && status.actions.indexOf('submit') >= 0) {
        commands.push(command('quiz_submit', 'Submit this assessment', ['submit assessment', 'submit quiz', 'finish assessment'], {
          risk: 'destructive',
          confirmation: 'always',
          confirmMessage: 'Submit this assessment now? Say yes or no.'
        }));
      }
      if (status.actions && status.actions.indexOf('cancel-review') >= 0) commands.push(command('quiz_review_cancel', 'Cancel assessment review', ['cancel review', 'close review', 'return to assessment'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('close') >= 0) commands.push(command('quiz_close', 'Close Quiz', ['close quiz', 'exit quiz'], {
        risk: 'destructive',
        confirmation: 'always',
        confirmMessage: 'Close Quiz? Your saved assessment draft will remain available. Say yes or no.'
      }));
      return commands;
    }

    function dispatchQuizVoiceScopeAction(action, params, meta) {
      var response = null;
      var detail = {
        action: action,
        requestId: 'quiz-scope-' + Date.now().toString(36),
        respond: function (payload) { response = payload; }
      };
      if (params && Object.prototype.hasOwnProperty.call(params, 'response')) detail.response = params.response;
      if (params && Object.prototype.hasOwnProperty.call(params, 'mode')) detail.mode = params.mode;
      if (params && Object.prototype.hasOwnProperty.call(params, 'value')) detail.value = params.value;
      if (params && Object.prototype.hasOwnProperty.call(params, 'choice')) detail.choice = params.choice;
      if (params && Object.prototype.hasOwnProperty.call(params, 'reflection')) detail.reflection = params.reflection;
      if (params && Object.prototype.hasOwnProperty.call(params, 'reflectionIndex')) detail.reflectionIndex = params.reflectionIndex;
      if (meta && meta.confirmed === true) detail.confirmed = true;
      var event = typeof window.CustomEvent === 'function'
        ? new window.CustomEvent(QUIZ_VOICE_CONTROL_EVENT, { detail: detail })
        : { type: QUIZ_VOICE_CONTROL_EVENT, detail: detail };
      window.dispatchEvent(event);
      return response || {
        ok: false,
        handled: true,
        state: 'unavailable',
        narration: 'Quiz did not respond to that command.'
      };
    }
    // Keep one stable scope registration while exposing the latest React state.
    // This preserves an in-flight destructive confirmation across timer rerenders.
    quizVoiceScopeRef.current.getStatus = getQuizVoiceBoundaryStatus;
    quizVoiceScopeRef.current.getCommands = getQuizVoiceScopedCommands;

    function registerQuizVoiceCommandScope() {
      var module = window.AlloModules && window.AlloModules.AlloCommands;
      if (!module || typeof module.registerCommandScope !== 'function') return null;
      return module.registerCommandScope({
        id: 'quiz',
        priority: 80,
        isActive: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          // Includes the legacy status.state !== 'unsupported-mode' guard plus
          // the production host's semantic frontmost ownership contract.
          return _quizVoiceIsSemanticFrontmost(ctx, status);
        },
        getCommands: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          if (!_quizVoiceIsSemanticFrontmost(ctx, status)) return [];
          return current && current.getCommands ? current.getCommands() : [];
        },
        getCapabilities: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : { actions: [] };
          if (!_quizVoiceIsSemanticFrontmost(ctx, status)) {
            return {
              describe: false, listActions: false, readQuestion: false, chooseAnswer: false,
              chooseAnswerPart: false, chooseEvidencePart: false, reflections: false,
              editReflection: false, checkAnswer: false, submit: false, next: false,
              previous: false, repeatFeedback: false, close: false
            };
          }
          return {
            describe: true,
            listActions: true,
            readQuestion: status.ready,
            chooseAnswer: status.canChooseByVoice,
            chooseAnswerPart: status.canChooseAnswerPartByVoice,
            chooseEvidencePart: status.canChooseEvidencePartByVoice,
            reflections: status.reflectionTotal > 0,
            editReflection: status.actions && (status.actions.indexOf('set-reflection') >= 0 || status.actions.indexOf('edit-reflection') >= 0),
            checkAnswer: status.actions && status.actions.indexOf('check') >= 0,
            submit: status.actions && status.actions.indexOf('submit') >= 0,
            next: status.actions && status.actions.indexOf('next') >= 0,
            previous: status.actions && status.actions.indexOf('previous') >= 0,
            repeatFeedback: status.actions && status.actions.indexOf('repeat-feedback') >= 0,
            close: status.actions && status.actions.indexOf('close') >= 0
          };
        },
        getState: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : { ready: false, state: 'unavailable' };
          var frontmost = _quizVoiceIsSemanticFrontmost(ctx, status);
          return _quizVoicePublicState(status, frontmost);
        },
        help: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          if (!_quizVoiceIsSemanticFrontmost(ctx, status)) return [];
          var commands = current && current.getCommands ? current.getCommands() : [];
          return commands.map(function (item) { return item.label; });
        },
        parse: function (text) {
          var parsed = _quizVoiceParseScopedUtterance(text);
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          if (!parsed || !status || status.surfaceMode !== 'review') return parsed;
          // The modal owns the semantic surface. Recognized question actions
          // are consumed as orientation instead of falling through to mutate
          // the obscured question beneath the focus trap.
          if (parsed.commandId !== 'quiz_submit' &&
              parsed.commandId !== 'quiz_review_cancel' &&
              parsed.commandId !== 'quiz_describe' &&
              parsed.commandId !== 'quiz_list_actions') {
            return { commandId: 'quiz_describe' };
          }
          return parsed;
        },
        execute: function (commandId, params, ctx, meta) {
          var current = quizVoiceScopeRef.current;
          var currentStatus = current && current.getStatus ? current.getStatus() : null;
          if (!_quizVoiceIsSemanticFrontmost(ctx, currentStatus)) {
            return { ok: false, narration: 'Quiz is not the frontmost learner surface, so nothing was changed.' };
          }
          var actionMap = {
            quiz_enter_response: 'enter-response',
            quiz_try_again: 'try-again',
            quiz_describe: 'describe',
            quiz_list_actions: 'list-actions',
            quiz_read_question: 'read-question',
            quiz_choose: 'choose',
            quiz_choose_answer: 'choose-answer',
            quiz_choose_evidence: 'choose-evidence',
            quiz_check: 'check',
            quiz_list_reflections: 'list-reflections',
            quiz_open_reflections: 'open-reflections',
            quiz_select_reflection: 'select-reflection',
            quiz_read_reflection: 'read-reflection',
            quiz_read_reflection_response: 'read-reflection-response',
            quiz_set_reflection: 'set-reflection',
            quiz_append_reflection: 'append-reflection',
            quiz_clear_reflection: 'clear-reflection',
            quiz_submit_reflection: 'submit-reflection',
            quiz_edit_reflection: 'edit-reflection',
            quiz_next_reflection: 'next-reflection',
            quiz_previous_reflection: 'previous-reflection',
            quiz_return_to_question: 'return-to-question',
            quiz_review_cancel: 'cancel-review',
            quiz_submit: 'submit',
            quiz_next: 'next',
            quiz_previous: 'previous',
            quiz_repeat_feedback: 'repeat-feedback',
            quiz_close: 'close'
          };
          var action = actionMap[commandId];
          if (!action) return { ok: false, narration: 'That Quiz command is not available.' };
          var result = dispatchQuizVoiceScopeAction(action, params, meta);
          return Object.assign({}, result, { narration: result && result.message ? result.message : 'Done.' });
        }
      });
    }
    React.useEffect(function () {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
      var handleQuizVoiceControl = function (event) {
        var request = event && event.detail && typeof event.detail === 'object' ? event.detail : {};
        var action = _quizVoiceNormalizeAction(request.action);
        var status = getQuizVoiceBoundaryStatus();
        var result = executeQuizVoiceAction(request, action, status);
        publishQuizVoiceBoundaryResult(result, request, action);
      };
      window.addEventListener(QUIZ_VOICE_CONTROL_EVENT, handleQuizVoiceControl);
      return function () {
        window.removeEventListener(QUIZ_VOICE_CONTROL_EVENT, handleQuizVoiceControl);
      };
    });
    React.useEffect(function () {
      if (typeof window === 'undefined') return undefined;
      var unregister = registerQuizVoiceCommandScope();
      if (typeof unregister === 'function') return unregister;
      // Quiz can mount before the deferred AlloCommands script finishes.
      // Retry briefly without introducing a second command engine.
      var attempts = 0;
      var timer = window.setInterval(function () {
        attempts += 1;
        unregister = registerQuizVoiceCommandScope();
        if (typeof unregister === 'function' || attempts >= 40) window.clearInterval(timer);
      }, 250);
      return function () {
        window.clearInterval(timer);
        if (typeof unregister === 'function') unregister();
      };
    }, []);
    if (attemptReceipt && !isTeacherMode && !isParentMode && !isEditingQuiz && !isPresentationMode && !isReviewGame) {
      return <div className="space-y-6">{modeBanner}<AssessmentSubmittedPanel receipt={attemptReceipt} sending={deliveryBusy} canRetry={!!activeSessionCode && attemptReceipt.sessionCode === activeSessionCode && attemptReceipt.activityId === String(sessionData?.quizState?.activityId || '')} onRetry={() => deliverAssessmentReceipt(attemptReceipt)} onDownload={downloadAssessmentAttempt} onStartAnother={startAnotherAssessmentAttempt} />{((attemptReceipt.feedbackTiming || deliverySettings.feedbackTiming) !== 'teacher-release' && deliverySettings.feedbackTiming !== 'teacher-release') || feedbackReleased ? <AssessmentAttemptFeedback data={assessmentData} receipt={attemptReceipt} formatInlineText={formatInlineText} /> : <p data-assessment-feedback-waiting role="status" className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">Your responses are saved. Feedback will appear here when your teacher releases it.</p>}</div>;
    }
    if (soloQuestOpen && canPlayAssessmentGames && (isTeacherMode || !activeSessionCode)) {
      return soloQuestSetup.ready && window.AlloModules?.ConceptQuestSolo ? <window.AlloModules.ConceptQuestSolo generatedContent={generatedContent} inputText={inputText} callGemini={props.callGemini} user={props.user} appId={appId} t={t} onClose={closeSoloQuest}/> : <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5"><p role={soloQuestSetup.failed ? 'alert' : 'status'}>{soloQuestSetup.failed ? quizCopy('concept_quest.solo_load_failed', 'Concept Quest could not load. Check your connection and try again.') : quizCopy('concept_quest.solo_loading', 'Loading Concept Quest...')}</p><div className="mt-3 flex gap-2">{soloQuestSetup.failed && <button type="button" onClick={soloQuestSetup.retry} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white">{quizCopy('common.retry', 'Retry')}</button>}<button type="button" onClick={closeSoloQuest} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold">{quizCopy('common.close', 'Close')}</button></div></section>;
    }
    return <div className="space-y-6">{boardSetupOpen && canPlayAssessmentGames && (isTeacherMode || !activeSessionCode) && (boardSetup.ready && window.AlloModules?.LessonBoardSetup ? <window.AlloModules.LessonBoardSetup history={props.history} callImagen={props.callImagen} callGemini={props.callGemini} inputText={props.inputText} generatedContent={generatedContent} language={leveledTextLanguage === 'All selected languages' ? props.selectedLanguages?.[0] || 'English' : leveledTextLanguage || 'English'} activeSessionCode={activeSessionCode} appId={appId} sessionData={sessionData} user={props.user} allowLive={!!(isTeacherMode && activeSessionCode)} t={t} onClose={() => setBoardSetupOpen(false)} onLaunched={() => setEscapeRoomState(previous => ({ ...previous, isActive: false, isGenerating: false, isPreview: false }))}/> : <div className="rounded-xl border border-teal-200 bg-teal-50 p-4"><p role={boardSetup.failed ? 'alert' : 'status'}>{boardSetup.failed ? t('lesson_board.load_failed', { defaultValue: 'The lesson board could not load. Check your connection and try again.' }) : t('lesson_board.loading', { defaultValue: 'Loading the lesson board…' })}</p>{boardSetup.failed && <button type="button" data-retry-lesson-board onClick={boardSetup.retry} className="mr-3 font-bold">{t('common.retry', { defaultValue: 'Retry' })}</button>}<button type="button" onClick={() => setBoardSetupOpen(false)}>{t('common.close')}</button></div>)}{connectedSetupOpen && canPlayAssessmentGames && (isTeacherMode || !activeSessionCode) && (connectedSetup.ready && window.AlloModules?.ConnectedEscapeRoomSetup ? <window.AlloModules.ConnectedEscapeRoomSetup callGemini={props.callGemini} inputText={props.inputText} generatedContent={generatedContent} language={leveledTextLanguage === 'All selected languages' ? props.selectedLanguages?.[0] || 'English' : leveledTextLanguage || 'English'} activeSessionCode={activeSessionCode} appId={appId} sessionData={sessionData} user={props.user} allowLive={!!(isTeacherMode && activeSessionCode)} t={t} onClose={() => setConnectedSetupOpen(false)} onLaunched={() => setEscapeRoomState(previous => ({ ...previous, isActive: false, isGenerating: false, isPreview: false }))} /> : <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p role={connectedSetup.failed ? 'alert' : 'status'}>{connectedSetup.failed ? t('connected_escape.load_failed', { defaultValue: 'The escape room could not load. Check your connection and try again.' }) : t('connected_escape.loading', { defaultValue: 'Loading the escape room…' })}</p>{connectedSetup.failed && <button type="button" data-retry-connected-room onClick={connectedSetup.retry} className="mr-3 font-bold">{t('common.retry', { defaultValue: 'Retry' })}</button>}<button type="button" onClick={() => setConnectedSetupOpen(false)}>{t('common.close')}</button></div>)}{classExplainerBanner}{isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive && deliverySettings.feedbackTiming === 'teacher-release' && <section data-assessment-live-feedback-release className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950"><h2 className="text-base font-bold">Student feedback</h2><p className="mt-1 text-sm">Students can view answer guides after submitting and receiving your release.</p><button type="button" data-assessment-release-feedback onClick={releaseAssessmentFeedback} disabled={feedbackReleased || feedbackReleaseBusy} className="mt-3 min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{feedbackReleased ? 'Feedback released' : feedbackReleaseBusy ? 'Releasing feedback...' : 'Release feedback to students'}</button>{feedbackReleaseError && <p role="alert" className="mt-2 text-sm text-red-800">{feedbackReleaseError}</p>}</section>}{!isPresentationMode && !isReviewGame && <>{modeBanner}{explainerPanel}{qualityReviewPanel}{deliverySettingsPanel}</>}{!canFacilitateAssessment && !isReviewGame && !escapeRoomState.isActive && <section data-assessment-student-view className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950"><h2 className="text-base font-bold">{quizCopy('quiz.student_view_title','Your assessment')}</h2><p className="mt-1 text-sm">{quizCopy('quiz.student_view_help','Answer the questions below. You can review your responses before submitting.')}</p></section>}{!canFacilitateAssessment && !isPresentationMode && !isReviewGame && <p data-assessment-feedback-note className="rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800">{deliverySettings.feedbackTiming === 'immediate' ? 'Practice feedback is available as you check responses.' : deliverySettings.feedbackTiming === 'teacher-release' ? 'Answer feedback stays hidden until you submit and your teacher releases it.' : 'Answer feedback stays hidden until you submit the assessment.'}</p>}{!props._assessmentPreview && draftStatusPanel}{learnerAttemptPanel}{reviewDialog}{canPlayAssessmentGames && <div data-assessment-facilitator-tools className="bg-teal-50 p-4 rounded-xl border border-teal-200 mb-6"><p className="mb-3 text-sm text-teal-900"><strong>UDL Goal:</strong> Providing options for action and expression. Frequent formative assessments help track progress and adjust instruction.</p><div className="flex items-center gap-2 flex-wrap">{isTeacherMode && activeSessionCode && !sessionData?.quizState?.isActive && <><button type="button" aria-label={t('common.connect')} onClick={handleStartLiveSession} disabled={!!sessionData?.escapeRoomState?.isActive} className={'flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-200 ' + quizreducedMotionClass} title={t('quiz.launch_live_tooltip')}><Wifi size={14} /> {t('quiz.launch_live_btn')}</button><div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full animate-in motion-reduce:animate-none fade-in duration-300"><Users size={12} className="text-orange-700" /><span className="text-xs font-black text-orange-700">{Object.keys(sessionData?.roster || {}).length} {t('quiz.lobby_waiting') || "Ready"}</span></div><button type="button" aria-label={t('common.locked')} onClick={handleToggleInteractive} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm ${sessionData?.forceStatic ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50'}`} title={t('session.toggle_interactive_title')}>{sessionData?.forceStatic ? <Lock size={12} /> : <Unlock size={12} />}{sessionData?.forceStatic ? t('session.static_only') : t('session.interactive')}</button></>}<>{canFacilitateAssessment && <button type="button" data-assessment-presentation-toggle aria-label={isPresentationMode ? quizCopy('quiz.exit_presentation', 'Exit presentation') : quizCopy('quiz.present_questions','Present questions')} aria-pressed={!!isPresentationMode} onClick={handleToggleIsPresentationMode} disabled={isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || isTeacherMode && (sessionData?.quizState?.isActive || sessionData?.escapeRoomState?.isActive)} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPresentationMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`} title={t('quiz.presentation')}>{isPresentationMode ? <CheckCircle size={14} /> : <MonitorPlay size={14} />}{isPresentationMode ? quizCopy('quiz.exit_presentation', 'Exit presentation') : quizCopy('quiz.present_questions','Present questions')}</button>}</><button type="button" ref={quizGamesButtonRef} data-quiz-games-toggle aria-expanded={quizGamesOpen} aria-controls="quiz-games-tools" onClick={() => setQuizGamesOpen(open => !open)} className="min-h-11 flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50"><Gamepad2 size={16} aria-hidden="true"/>{isIndependentMode ? quizCopy('quiz.practice_games','Practice games') : t('common.start_game')}<span aria-hidden="true">{quizGamesOpen ? '▴' : '▾'}</span></button>
      {isReviewGame && <button type="button" onClick={handleToggleIsReviewGame} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><XCircle size={16} aria-hidden="true"/>{quizCopy('quiz.exit_review_game', 'Exit review game')}</button>}
      {escapeRoomState.isActive && <button type="button" data-quiz-exit-puzzle onClick={() => {
            closeQuizGames();
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
          }} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!sessionData?.quizState?.isActive || (['connected-room', 'lesson-board'].includes(sessionData?.escapeRoomState?.mode) && sessionData.escapeRoomState.isActive)} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${escapeRoomState.isActive ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-200' : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-50'}`} title={isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title')} aria-label={t('escape_room.title')}>{escapeRoomState.isActive ? <XCircle size={14} /> : <DoorOpen size={14} />}{escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')}</button>}{isTeacherMode && !isIndependentMode && <button type="button" onClick={handleExportQTI} className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 transition-all motion-reduce:transition-none shadow-sm" title={t('export_menu.qti')} aria-label={t('export_menu.qti')}><FolderDown size={14} /> {t('quiz.export_qti_btn')}</button>}{!isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && <>{!isIndependentMode && !isParentMode && <button type="button" aria-label={t('common.toggle_edit_quiz')} onClick={handleToggleIsEditingQuiz} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm ${isEditingQuiz ? 'bg-teal-700 text-white hover:bg-teal-700' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`}>{isEditingQuiz ? <CheckCircle2 size={14} /> : <Pencil size={14} />}{isEditingQuiz ? t('common.done_editing') : t('quiz.edit')}</button>}<button type="button" onClick={handleToggleShowQuizAnswers} className="text-xs flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-bold hover:bg-teal-200 transition-colors motion-reduce:transition-none">{showQuizAnswers ? <CheckSquare size={14} className="fill-current" /> : <CheckSquare size={14} />}{showQuizAnswers ? isIndependentMode ? t('quiz.hide_answers_student') : isParentMode ? 'Hide Scores' : t('quiz.hide_key') : isIndependentMode ? t('quiz.check_answers') : isParentMode ? 'View Scores' : t('quiz.show_key')}</button></>}</div>{quizGamesOpen && <section ref={quizGamesPanelRef} id="quiz-games-tools" aria-labelledby="quiz-games-title" className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
      <h3 id="quiz-games-title" className="text-sm font-bold text-indigo-950">{t('common.start_game')}</h3>
      <p className="mb-3 mt-1 text-sm text-slate-700">{quizCopy('quiz.games_description', 'Choose a game using this resource. Each option explains how to play.')}</p>{isIndependentMode && <p className="mb-3 text-sm text-indigo-950">{quizCopy('quiz.practice_games_help','Practice games can reveal answers and explanations. They do not submit this assessment.')}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><button type="button" data-quiz-game="review" onClick={() => launchQuizGame(handleToggleIsReviewGame)} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{t('quiz.review_game')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.review_game_description', 'Answer every question on a category board and award team points.')}</p></div>
        <div><button type="button" onClick={() => {
            closeQuizGames();
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
          }} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!sessionData?.quizState?.isActive || (['connected-room', 'lesson-board'].includes(sessionData?.escapeRoomState?.mode) && sessionData.escapeRoomState.isActive)} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed" title={isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title')} aria-label={t('escape_room.title')}>{escapeRoomState.isActive ? <XCircle size={14} /> : <DoorOpen size={14} />}{escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.puzzle_challenge_description', 'Solve a series of question-based puzzles.')}</p></div>
        {(isTeacherMode || !activeSessionCode) && <div><button type="button" data-open-lesson-board onClick={() => launchQuizGame(() => setBoardSetupOpen(true))} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{t('lesson_board.title', { defaultValue: 'Lesson board game' })}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.lesson_board_description', 'Explore lesson locations and solve activities, solo or together.')}</p></div>}
        {(isTeacherMode || !activeSessionCode) && <div><button type="button" data-open-connected-room onClick={() => launchQuizGame(() => setConnectedSetupOpen(true))} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><DoorOpen size={16} aria-hidden="true"/>{t('connected_escape.title', { defaultValue: 'Escape Room' })}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.escape_room_description', 'Explore a room, collect clues, and solve connected puzzles.')}</p></div>}
        {(isTeacherMode || !activeSessionCode) && <div><button type="button" data-open-concept-quest-solo onClick={() => launchQuizGame(() => setSoloQuestOpen(true))} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{quizCopy('concept_quest.solo_title', 'Concept Quest solo')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.concept_quest_description', 'Explore a role-playing adventure with abilities, encounters, and a final boss.')}</p></div>}
        {isTeacherMode && activeSessionCode && <div><button type="button" data-open-concept-quest onClick={() => launchQuizGame(launchConceptQuest)} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{quizCopy('quiz.concept_quest_live', 'Concept Quest with class')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.concept_quest_description', 'Send teams on a live collaborative concept adventure.')}</p></div>}
      </div>
    </section>}</div>}{isTeacherMode && activeSessionCode && (sessionData?.escapeRoomState?.isActive || sessionData?.escapeRoomState?.isGameOver) && <ErrorBoundary fallbackMessage="Escape room controls encountered an error. Refreshing..."><EscapeRoomTeacherControls sessionData={sessionData} generatedContent={generatedContent} activeSessionCode={activeSessionCode} appId={appId} t={t} addToast={addToast} callGemini={props.callGemini} /></ErrorBoundary>}{isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive ? <div className="flex flex-col gap-4"><LiveResultsDashboard sessionData={sessionData} generatedContent={generatedContent} appId={appId} activeSessionCode={activeSessionCode} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} conceptMasteryByUid={props.conceptMasteryByUid} onOpenAlloSheet={props.onOpenAlloSheet} /><ErrorBoundary fallbackMessage="Live quiz controls encountered an error. Refreshing..."><TeacherLiveQuizControls sessionData={sessionData} generatedContent={generatedContent} activeSessionCode={activeSessionCode} appId={appId} onGenerateImage={callImagen} onRefineImage={callGeminiImageEdit} onCreateGroup={handleCreateGroup} onAssignStudent={handleAssignStudent} onSetGroupResource={handleSetGroupResource} isPushingResource={isPushingResource} onSetGroupLanguage={handleSetGroupLanguage} onSetGroupProfile={handleSetGroupProfile} onDeleteGroup={handleDeleteGroup} onUpdateQuestionRoutingRules={handleUpdateQuestionRoutingRules} history={props.history} callGemini={props.callGemini} /></ErrorBoundary>{/* 9rem clears the fixed Live Dashboard launcher (bottom 5.5rem) so End Session can always scroll above it. */}<div className="flex justify-end px-4" style={{ paddingBottom: '9rem' }} data-live-quiz-end-session-row="true"><button type="button" onClick={handleEndLiveSession} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none shadow-sm flex items-center gap-2"><XCircle size={14} /> {t('session.action_end')}</button></div></div> : isReviewGame ? (() => {
      const reviewCategories = getReviewCategories();
      const reviewQuestions = reviewCategories.flatMap(category => category.questions);
      const reviewClaimed = reviewGameState.claimed instanceof Set ? reviewGameState.claimed : new Set();
      const reviewCompleted = reviewQuestions.filter(question => reviewClaimed.has(question.originalIndex)).length;
      const activeReviewQuestion = reviewGameState.activeQuestion;
      const activeReviewIsMcq = activeReviewQuestion && (!activeReviewQuestion.type || activeReviewQuestion.type === 'mcq') && Array.isArray(activeReviewQuestion.options);
      return <div className="animate-in motion-reduce:animate-none fade-in duration-500"><div className="bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-yellow-500 relative overflow-hidden min-h-[700px] flex flex-col"><div className="absolute inset-0 opacity-10 pointer-events-none"><div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" /><div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(59,130,246,0.2),transparent)]" /></div><div className="flex justify-between items-start mb-6 relative z-10"><div className="text-left"><h2 className="text-2xl sm:text-3xl font-black text-yellow-300 tracking-wide uppercase drop-shadow-md flex items-center gap-3"><Gamepad2 size={32} /> {t('review_game.title')}</h2><p className="text-slate-200 text-sm mt-2 font-medium">{quizCopy('review_game.all_formats_help', 'Pick a tile, answer together, then reveal the guide and award points. Every assessment item is included.')}</p><p data-review-progress role="status" aria-live="polite" className="mt-2 text-sm font-bold text-yellow-200">{reviewCompleted + ' of ' + reviewQuestions.length + ' items completed · ' + reviewCategories.length + (reviewCategories.length === 1 ? ' category' : ' categories')}</p></div><div className="flex gap-2"><button type="button" aria-label={t('common.volume')} onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSound('click');
              }} className={`p-2 rounded-full transition-colors motion-reduce:transition-none ${soundEnabled ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-100'}`} title={t('review_game.toggle_sound')}>{soundEnabled ? <Volume2 size={20} /> : <MicOff size={20} />}</button><button type="button" aria-label={t('review_game.reset')} onClick={() => {
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
              }} className="p-2 bg-slate-700 text-slate-100 rounded-full hover:bg-slate-600" title={t('review_game.reset')}><RefreshCw size={20} /></button></div></div><div className="flex flex-wrap gap-4 justify-center mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">{gameTeams.map(team => <div key={team.id} className={`${team.color} bg-opacity-20 border-2 border-opacity-50 border-${team.color.split('-')[1]}-400 rounded-lg p-3 min-w-[140px] flex flex-col items-center relative group`}><input aria-label={t('common.enter_team')} className="bg-transparent text-center font-bold text-white  focus:ring-2 focus:ring-white/50 w-full mb-1" value={team.name} onChange={e => setGameTeams(prev => prev.map(t => t.id === team.id ? {
                ...t,
                name: e.target.value
              } : t))} /><div className="text-3xl font-black text-white drop-shadow-md">{team.score}</div>{scoreAnimation.teamId === team.id && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-700 font-black text-xl animate-[ping_1s_ease-out_reverse] motion-reduce:animate-none pointer-events-none z-20 whitespace-nowrap shadow-sm">+{scoreAnimation.points}</div>}<div className="flex gap-2 mt-2 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none"><button type="button" onClick={() => handleManualScore(team.id, -100)} className="min-w-6 min-h-6 inline-flex items-center justify-center text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded">-</button><button type="button" onClick={() => handleManualScore(team.id, 100)} className="min-w-6 min-h-6 inline-flex items-center justify-center text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded">+</button></div>{gameTeams.length > 1 && <button type="button" onClick={() => handleRemoveTeam(team.id)} className="absolute -top-2 -right-2 min-w-6 min-h-6 inline-flex items-center justify-center bg-slate-800 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-700 transition-all motion-reduce:transition-none shadow-sm" aria-label={t('common.remove')}><X size={10} /></button>}</div>)}{gameTeams.length < 6 && <button type="button" aria-label={t('common.add')} onClick={handleAddTeam} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-600 hover:text-white hover:border-slate-400 transition-colors motion-reduce:transition-none"><Plus size={24} /><span className="text-xs font-bold mt-1">{t('review_game.add_team')}</span></button>}</div><div data-review-board className="grid gap-2 sm:gap-4 max-w-4xl mx-auto w-full flex-grow content-start relative z-10" style={{ gridTemplateColumns: 'repeat(' + Math.max(1, reviewCategories.length) + ', minmax(0, 1fr))' }}>{reviewCategories.map((cat, cIdx) => {
              const CategoryIcon = cIdx === 0 ? Brain : cIdx === 1 ? Languages : Search;
              const iconColor = cIdx === 0 ? "text-yellow-400" : cIdx === 1 ? "text-green-400" : "text-blue-400";
              return <div key={cIdx} className="flex flex-col gap-4"><div className="bg-slate-800/80 backdrop-blur-sm text-white font-bold text-center py-4 rounded-lg border-b-4 border-blue-600 shadow-lg uppercase tracking-wider text-sm md:text-base flex flex-col items-center gap-1"><CategoryIcon size={20} className={iconColor} />{cat.name}<span className="text-xs normal-case tracking-normal font-medium text-slate-300">{cat.questions.length + (cat.questions.length === 1 ? ' item' : ' items')}</span></div>{cat.questions.map((q, qIdx) => {
                  const isClaimed = reviewClaimed.has(q.originalIndex);
                  return <button type="button" key={q.originalIndex} data-review-tile={q.originalIndex} onClick={() => !isClaimed && handleReviewTileClick(q, q.points)} disabled={isClaimed} aria-label={`Category: ${cat.name}, question ${q.originalIndex + 1}, ${q.points} points${isClaimed ? ', completed' : ''}`} aria-disabled={isClaimed} className={`
                                                            h-24 rounded-lg font-black text-xl sm:text-3xl shadow-lg transition-all motion-reduce:transition-none duration-300 transform flex items-center justify-center border-b-4 relative overflow-hidden group  focus:ring-4 focus:ring-yellow-400 focus:ring-offset-4 focus:ring-offset-slate-900
                                                            ${isClaimed ? 'bg-slate-800/50 text-slate-300 border-slate-700 cursor-default' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-yellow-300 border-blue-800 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-1 hover:shadow-blue-500/20 hover:shadow-xl cursor-pointer active:scale-95'}
                                                        `}>{!isClaimed && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite] motion-reduce:animate-none" />}<span className="relative z-10 drop-shadow-md">{isClaimed ? <CheckCircle2 size={24} aria-hidden="true" /> : q.points}</span></button>;
                })}</div>;
            })}</div>
      {reviewQuestions.length === 0 && <p className="mt-6 text-center text-slate-200">No assessment items are available yet. Add questions to start a review game.</p>}
      {activeReviewQuestion && <div ref={reviewDialogRef} tabIndex={-1} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiz-review-question-title" onKeyDown={function (e) { _quizHandleDialogKeyDown(e, reviewDialogRef, function () { closeReviewModal(false); }); }}>
        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border-4 border-yellow-500 bg-blue-900 p-4 text-center shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-yellow-400 px-4 py-2 text-lg font-black text-blue-950">{activeReviewQuestion.points + ' points'}</span><button type="button" ref={reviewCloseBtnRef} aria-label={t('common.close')} onClick={() => closeReviewModal(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-blue-100 hover:bg-blue-800 hover:text-white"><X size={24} /></button></div>
          <div className="my-6"><p className="mb-2 text-sm font-semibold text-blue-200">{'Assessment question ' + (activeReviewQuestion.originalIndex + 1)}</p><h3 id="quiz-review-question-title" className="text-2xl font-bold leading-tight text-white sm:text-3xl">{formatInlineText(activeReviewQuestion.question || '', false, true)}</h3>{activeReviewQuestion.question_en && <p className="mt-4 text-lg italic text-blue-200">{formatInlineText(activeReviewQuestion.question_en, false, true)}</p>}</div>
          {activeReviewQuestion.imageUrl && <img src={activeReviewQuestion.imageUrl} alt={_quizAuthoredImageAlt(activeReviewQuestion.imageAltText)} className="mb-5 max-h-80 w-full rounded-lg bg-white object-contain" />}
          {activeReviewIsMcq ? <div data-review-question-type="mcq" className="mb-6 text-left"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{activeReviewQuestion.options.map((option, optionIndex) => {
            const correct = _quizAnswerMatches(option, activeReviewQuestion.correctAnswer);
            return <div key={optionIndex} className={'rounded-xl border-2 p-4 text-lg font-medium ' + (reviewGameState.showAnswer && correct ? 'border-green-400 bg-green-800 text-white' : 'border-blue-500 bg-blue-800 text-white')}><span className="mr-2 inline-block font-bold">{String.fromCharCode(65 + optionIndex) + '.'}</span>{formatInlineText(option, false, true)}{reviewGameState.showAnswer && correct && <span className="ml-2 text-sm font-bold">✓ Correct</span>}</div>;
          })}</div>{reviewGameState.showAnswer && <div data-review-answer-guide className="mt-4 rounded-xl border-2 border-green-300 bg-green-50 p-4 text-green-950" role="status"><strong>Answer: </strong>{formatInlineText(String(activeReviewQuestion.correctAnswer ?? activeReviewQuestion.expectedAnswer ?? 'Teacher review'), false)}{activeReviewQuestion.factCheck && <div className="mt-3 border-t border-green-200 pt-3"><strong>Explanation: </strong>{renderFormattedText(activeReviewQuestion.factCheck)}</div>}</div>}</div> : <div className="mb-6"><AssessmentPresentationItem compact q={activeReviewQuestion} index={activeReviewQuestion.originalIndex} showAnswer={reviewGameState.showAnswer} formatInlineText={formatInlineText} renderFormattedText={renderFormattedText} /></div>}
          <div className="mt-auto flex flex-col items-center gap-5 border-t border-blue-700 pt-5">{!reviewGameState.showAnswer ? <button type="button" aria-label={t('review_game.reveal_answer')} onClick={() => { setReviewGameState(prev => ({ ...prev, showAnswer: true })); playSound('reveal'); }} className="min-h-11 rounded-full bg-yellow-400 px-6 py-3 text-lg font-bold text-blue-950 hover:bg-yellow-300">{t('review_game.reveal_answer')}</button> : <div className="w-full"><p className="mb-3 text-sm font-bold text-blue-100">{quizCopy('review_game.award_help', 'Use the answer guide to decide which team earned the points.')}</p><div className="flex flex-wrap justify-center gap-3">{gameTeams.map(team => <button type="button" aria-label={`Award ${activeReviewQuestion.points} points to ${team.name}`} key={team.id} onClick={() => handleAwardPoints(team.id, activeReviewQuestion.points)} className={team.color + ' min-h-11 rounded-lg px-4 py-2 font-bold shadow-md border-b-4 border-black/20 hover:opacity-90 ' + (team.color.includes('yellow') ? 'text-indigo-900' : 'text-white')}><CheckCircle2 size={16} className="mr-2 inline" />{team.name}</button>)}<button type="button" onClick={() => { playSound('incorrect'); closeReviewModal(true); }} className="min-h-11 rounded-lg bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600">{t('review_game.no_points')}</button></div></div>}</div>
        </div>
      </div>}
      </div></div>;
    })() : escapeRoomState.isActive ? window.AlloModules && window.AlloModules.EscapeRoomGameplay ? <window.AlloModules.EscapeRoomGameplay escapeRoomState={escapeRoomState} setEscapeRoomState={setEscapeRoomState} escapeTimeLeft={escapeTimeLeft} isEscapeTimerRunning={isEscapeTimerRunning} setIsEscapeTimerRunning={setIsEscapeTimerRunning} handleSetIsEscapeTimerRunningToTrue={() => setIsEscapeTimerRunning(true)} handlers={{
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
      }} t={t} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} playSound={playSound} globalPoints={globalPoints} inputText={inputText} /> : null : isPresentationMode ? <div data-assessment-presentation className="space-y-8 animate-in motion-reduce:animate-none fade-in duration-500"><div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg"><h2 className="font-bold text-xl flex items-center gap-2"><MonitorPlay size={24} className="text-teal-300" /> {t('quiz.presentation_board')}</h2><button type="button" aria-label={t('common.reset_presentation')} onClick={() => { resetPresentation(); setPresentationQuestionIndex(0); }} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none"><RefreshCw size={14} /> {t('quiz.reset_board')}</button></div>
        <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">{quizCopy('quiz.presentation_visibility_help', 'This is a discussion screen. Selecting an option only marks it for discussion. Reveal an answer or explanation when everyone is ready; anything revealed is visible to people viewing this screen. This does not submit student responses or control their screens.')}</p>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-white p-3"><p data-presentation-visibility role="status" aria-live="polite" className="text-sm font-bold text-slate-800">{visiblePresentationGuides ? quizCopy('quiz.presentation_guides_visible','Questions with visible answers or explanations: {count}').replace('{count}',String(visiblePresentationGuides)) : quizCopy('quiz.presentation_guides_hidden','Answer guides and explanations are hidden.')}</p><button type="button" data-presentation-hide-guides disabled={!visiblePresentationGuides} onClick={hidePresentationGuides} className="min-h-11 rounded-lg border border-slate-400 px-3 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">{quizCopy('quiz.presentation_hide_guides','Hide all answers and explanations')}</button></div>
        <nav aria-label="Presentation questions" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
          <button type="button" onClick={() => setPresentationAllQuestions(all => !all)} aria-pressed={presentationAllQuestions} className="min-h-11 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800">{presentationAllQuestions ? 'Show one question' : 'Show all questions'}</button>
          <span role="status" aria-live="polite" className="text-sm font-bold text-slate-700">{presentationAllQuestions ? presentationSlides.length + ' questions' : presentationSlides.length ? 'Question ' + (presentationCurrent + 1) + ' of ' + presentationSlides.length : 'No questions'}</span>
          {!presentationAllQuestions && presentationSlides.length > 0 && <><button type="button" disabled={presentationCurrent === 0} onClick={() => setPresentationQuestionIndex(presentationCurrent - 1)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50">Previous question</button><label className="flex items-center gap-2 text-sm font-semibold">Go to question<select aria-label="Go to presentation question" value={presentationCurrent} onChange={event => setPresentationQuestionIndex(Number(event.target.value))} className="min-h-11 rounded-lg border border-slate-300 px-2">{presentationSlides.map((index, position) => <option key={index} value={position}>{position + 1}</option>)}</select></label><button type="button" disabled={presentationCurrent >= presentationSlides.length - 1} onClick={() => setPresentationQuestionIndex(presentationCurrent + 1)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50">Next question</button></>}
        </nav>{presentationQuestions.map((q, i) => {
          if (!q || (!presentationAllQuestions && i !== presentationSlides[presentationCurrent])) return null;
          const pState = presentationState[i] || {};
          if ((q.type && q.type !== 'mcq') || !Array.isArray(q.options)) {
            return <AssessmentPresentationItem key={i} q={q} index={i} showAnswer={!!pState.showAnswer} showExplanation={!!pState.showExplanation} onToggleAnswer={() => togglePresentationAnswer(i)} onToggleExplanation={() => togglePresentationExplanation(i)} formatInlineText={formatInlineText} renderFormattedText={renderFormattedText} />;
          }
          const isAnswered = pState.selectedOption != null;
          const isCorrectlyAnswered = isAnswered && _quizAnswerMatches(pState.selectedOption, q.correctAnswer);
          const showAnswer = pState.showAnswer;
          const showExplanation = pState.showExplanation;
          return <div key={i} data-presentation-question-type="mcq" className="bg-white p-4 sm:p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all motion-reduce:transition-none"><div className="flex gap-4 mb-6"><div className="bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">{i + 1}</div><div className="flex-grow"><h3 className="text-2xl font-bold text-slate-800 leading-tight">{formatInlineText(q.question, false)}</h3>{q.question_en && <p className="text-lg text-slate-600 italic mt-2">{formatInlineText(q.question_en, false)}</p>}</div></div>{q.imageUrl && <img src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} className="mb-5 max-h-80 w-full rounded-lg object-contain"/>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-14">{q.options.map((opt, optIdx) => {
                const isSelected = pState.selectedOption === opt;
                const isCorrectOption = _quizAnswerMatches(opt, q.correctAnswer);
                let btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
                let icon = <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors motion-reduce:transition-none" />;
                if (isSelected && !showAnswer) {
                  btnClass = "bg-indigo-50 border-2 border-indigo-500 text-indigo-950";
                  icon = <div className="w-6 h-6 rounded-full border-2 border-indigo-600 bg-indigo-100" aria-hidden="true" />;
                } else if (isSelected) {
                  if (isCorrectOption) {
                    btnClass = "bg-green-100 border-2 border-green-500 text-green-900 shadow-md transform scale-[1.02]";
                    icon = <CheckCircle2 size={24} className="text-green-600" />;
                  } else {
                    btnClass = "bg-red-100 border-2 border-red-400 text-red-900 animate-shake motion-reduce:animate-none";
                    icon = <XCircle size={24} className="text-red-500" />;
                  }
                } else if (showAnswer && isCorrectOption) {
                  btnClass = "bg-green-50 border-2 border-green-400 text-green-800 ring-2 ring-green-200 ring-offset-2";
                  icon = <CheckCircle2 size={24} className="text-green-500" />;
                } else if (showAnswer) {
                  btnClass = "opacity-50 bg-slate-50 border-slate-100 text-slate-600 cursor-not-allowed";
                }
                return <button type="button" key={optIdx} aria-pressed={isSelected} onClick={() => handlePresentationOptionClick(i, opt)} disabled={showAnswer} className={`p-5 rounded-xl text-left font-bold text-lg transition-all motion-reduce:transition-none duration-200 flex items-center gap-4 group w-full ${btnClass}`}><div className="shrink-0">{icon}</div><div className="min-w-0 flex-grow">{q.optionImageUrls?.[optIdx] && <img src={q.optionImageUrls[optIdx]} alt={_quizAuthoredImageAlt(q.optionImageAltTexts?.[optIdx])} className="mb-3 h-32 w-full rounded object-contain"/>}<span className="mr-2">{String.fromCharCode(65 + optIdx)}.</span>{formatInlineText(opt, false)}{q.options_en && q.options_en[optIdx] && <div className="text-sm font-normal opacity-80 italic mt-1">{formatInlineText(q.options_en[optIdx], false)}</div>}</div></button>;
              })}</div><div className="mt-6 ml-0 md:ml-14 flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2"><div role="status" aria-live="polite" className="min-h-8 flex items-center relative">{isAnswered && !isCorrectlyAnswered && showAnswer && <span data-presentation-selection-feedback className="text-red-700 font-bold flex items-center gap-2 animate-in motion-reduce:animate-none fade-in slide-in-from-left-2"><XCircle size={18} /> {quizCopy('quiz.presentation_selection_differs','The selected option differs from the answer guide.')}</span>}{isAnswered && isCorrectlyAnswered && showAnswer && <span data-presentation-selection-feedback className="text-green-700 font-bold flex items-center gap-2 animate-in motion-reduce:animate-none zoom-in duration-300 overflow-visible"><Sparkles size={18} /> {t('quiz.presentation_correct')}<ConfettiExplosion /></span>}</div><div className="flex gap-2">{q.factCheck && <button type="button" aria-label={showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')} onClick={() => togglePresentationExplanation(i)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2 ${showExplanation ? 'bg-yellow-100 text-yellow-700' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'}`}>{showExplanation ? <ChevronUp size={14} /> : <Info size={14} />}{showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')}</button>}<button type="button" aria-label={showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')} onClick={() => togglePresentationAnswer(i)} aria-expanded={!!showAnswer} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2 ${showAnswer ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{showAnswer ? <Eye size={14} /> : <MousePointerClick size={14} />}{showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')}</button></div></div>{showExplanation && q.factCheck && <div className="mt-4 ml-0 md:ml-14 p-4 bg-yellow-50 border border-yellow-100 rounded-xl animate-in motion-reduce:animate-none slide-in-from-top-2"><div className="prose prose-sm text-slate-700 max-w-none leading-relaxed">{renderFormattedText(q.factCheck)}</div></div>}</div>;
        })}{presentationReflections.length > 0 && (presentationAllQuestions || presentationCurrent === presentationSlides.length - 1 || !presentationSlides.length) && <section className="bg-indigo-900 text-white p-4 sm:p-8 rounded-2xl shadow-xl mt-8"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare size={24} className="text-indigo-300" /> {t('quiz.presentation_discussion')}</h3><div className="space-y-8">{presentationReflections.map((ref, i) => <div key={i} className="bg-indigo-800/50 p-6 rounded-xl border border-indigo-700"><p className="text-2xl font-medium leading-relaxed">{typeof ref === 'string' ? ref : ref.text}</p>{ref?.text_en && <p className="text-lg text-indigo-200 italic mt-4">{ref.text_en}</p>}</div>)}</div></section>}</div> : <div className="space-y-6">{generatedContent?.data.questions.map((q, i) => oneQuestionAtATime && i !== currentQuestionIdx ? null : !q ? null : q.type && q.type !== 'mcq' ? <FreeformItemsBlock questions={generatedContent.data.questions} key={i} compact={true} deferFeedback={deferFeedback} feedbackTiming={deliverySettings.feedbackTiming} registerVoiceController={registerQuizItemVoiceController} visibleQuestionIdx={i} flaggedQuestions={flaggedQuestions} allowFlagging={deliverySettings.allowFlagging} onToggleFlag={toggleQuestionFlag} draftNamespace={draftNamespace} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} QuizAIHelpers={window.AlloModules && window.AlloModules.QuizAIHelpers} modeStrategy={_modeStrat} scoringPolicy={scoringPolicy} onSubmitLiveAnswer={onSubmitLiveAnswer} allowDictation={allowDictation} isEditingQuiz={isEditingQuiz} onQuestionAction={props.handleQuizQuestionAction} onRegenerateQuestion={regenerateAssessmentQuestion} regeneratingQuestions={regeneratingQuestions} /> : <div key={i} id={'assessment-question-' + i} className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm relative group/question scroll-mt-24">{!isEditingQuiz && deliverySettings.allowFlagging && <div className="flex justify-end mb-2"><AssessmentQuestionFlagButton flagged={!!flaggedQuestions[i]} onToggle={function () { toggleQuestionFlag(i); }} /></div>}{q.imageUrl && <div className="relative mb-3"><img src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} loading="lazy" className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50" />{renderImageRefineOverlay(i, 'question', null, false)}</div>}<div className="flex justify-between items-start mb-4 gap-4"><div className="flex-grow flex gap-3"><span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1.5">{i + 1}</span><div className="flex-grow space-y-2">{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_question') || 'Edit question'} value={q.question} onChange={e => handleQuizChange(i, 'question', e.target.value)} className="w-full font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(q.question)} />{q.question_en !== undefined && <textarea aria-label={t('quiz.edit_question_english') || 'Edit question English translation'} value={q.question_en || ''} onChange={e => handleQuizChange(i, 'question', e.target.value, null, true)} className="w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(q.question_en || '')} placeholder={t('common.placeholder_english_trans')} />}</> : <><p className="font-bold text-slate-800 px-2 py-1">{q.question}</p>{q.question_en && <p className="text-sm text-slate-600 italic px-2">{q.question_en}</p>}</>}</div></div>{isTeacherMode && <button type="button" aria-label={isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')} onClick={() => handleFactCheck(i)} disabled={isFactChecking[i]} className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors motion-reduce:transition-none ${q.factCheck ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200'}`} title={t('quiz.verify_tooltip')}>{isFactChecking[i] ? <RefreshCw size={12} className={"animate-spin " + quizreducedMotionClass} /> : q.factCheck ? <RefreshCw size={12} /> : <ShieldCheck size={12} />}{isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')}</button>}</div>{isEditingQuiz && <AssessmentItemActions q={q} questionIdx={i} totalQuestions={generatedContent.data.questions.length} onAction={props.handleQuizQuestionAction} onRegenerate={regenerateAssessmentQuestion} regenerating={!!regeneratingQuestions[i]} />}<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9">{q.options.map((opt, optIdx) => <div key={optIdx} role={!isEditingQuiz ? 'button' : undefined} tabIndex={!isEditingQuiz ? 0 : undefined} aria-pressed={!isEditingQuiz ? studentMcqAnswers[i] === optIdx : undefined} onClick={!isEditingQuiz ? () => selectMcqOption(i, optIdx, opt, q) : undefined} onKeyDown={!isEditingQuiz ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectMcqOption(i, optIdx, opt, q);
              }
            } : undefined} className={`p-2 rounded-lg border text-sm relative group/option ${!isEditingQuiz ? 'cursor-pointer hover:bg-indigo-50/40 transition-colors motion-reduce:transition-none' : ''} ${showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : studentMcqAnswers[i] === optIdx ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' : 'bg-slate-50 border-slate-100'}`}>{Array.isArray(q.optionImageUrls) && q.optionImageUrls[optIdx] && <div className="relative mb-2"><img src={q.optionImageUrls[optIdx]} alt={_quizAuthoredImageAlt(Array.isArray(q.optionImageAltTexts) ? q.optionImageAltTexts[optIdx] : '')} loading="lazy" className="w-full h-24 object-contain rounded bg-white border border-slate-200" />{renderImageRefineOverlay(i, 'option', optIdx, true)}</div>}<div className="flex items-start gap-2"><span className="mt-1.5 text-slate-600">{String.fromCharCode(65 + optIdx)}.</span><div className="flex-grow">{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_option') || 'Edit answer option'} value={opt} onChange={e => handleQuizChange(i, 'option', e.target.value, optIdx)} className={`w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5  resize-none transition-all motion-reduce:transition-none ${showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) ? 'text-green-800 font-medium' : 'text-slate-600'}`} rows={getRows(opt, 30)} />{q.options_en && <textarea aria-label={t('quiz.edit_option_translation') || 'Edit option translation'} value={q.options_en[optIdx] || ''} onChange={e => handleQuizChange(i, 'option', e.target.value, optIdx, true)} className="w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5  resize-none transition-all motion-reduce:transition-none mt-1" rows={getRows(q.options_en[optIdx] || '', 30)} placeholder={t('common.placeholder_option_trans')} />}</> : <><p className={`px-1 py-0.5 ${showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) ? 'text-green-800 font-medium' : 'text-slate-600'}`}>{opt}</p>{q.options_en && q.options_en[optIdx] && <p className="text-xs text-slate-600 mt-1 px-1 italic">{q.options_en[optIdx]}</p>}</>}</div></div>{showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) && <div className="absolute top-2 right-2 text-green-600"><CheckCircle2 size={14} /></div>}{isEditingQuiz && !_quizAnswerMatches(opt, q.correctAnswer) && Array.isArray(q.distractorQuality) && function () {
                var dq = q.distractorQuality.find(function (d) {
                  return d && d.distractor === opt;
                });
                if (!dq) return null;
                return <div className="mt-1.5 ml-1 flex items-center gap-1.5 flex-wrap">{dq.encodesMisconception ? <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800" aria-label={'This distractor encodes a known student misconception. ' + (dq.reason || '')} title={dq.reason || 'Encodes a known student misconception'}><span aria-hidden="true">🎯 </span>misconception</span> : <><span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" aria-label={'Generic distractor — does not encode a specific misconception. ' + (dq.reason || '')} title={dq.reason || 'Generic distractor — does not encode a specific misconception'}><span aria-hidden="true">⚠ </span>generic</span><button type="button" onClick={function (e) {
                      e.stopPropagation();
                      improveDistractor(i, optIdx, opt, dq.reason || '');
                    }} disabled={!!isImprovingDistractor[i + ':' + optIdx]} className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" aria-label={isImprovingDistractor[i + ':' + optIdx] ? 'Rewriting distractor' : 'Rewrite this distractor to encode a real misconception'} title={t("tooltips.rewrite_distractor")}><span aria-hidden="true">✨ </span>{isImprovingDistractor[i + ':' + optIdx] ? 'rewriting…' : 'improve'}</button></>}</div>;
              }()}</div>)}</div>{!deferFeedback && <McqEnhancements q={q} questionIdx={i} modeStrategy={_modeStrat} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} onSubmitLiveAnswer={onSubmitLiveAnswer} currentConfidence={studentMcqConfidence[i] || null} onSetConfidence={function (lvl) {
            setMcqConfidence(i, lvl, q);
          }} />}{q.factCheck && isTeacherMode && (!isIndependentMode || showQuizAnswers) && <div className="mt-4 ml-9 p-3 pr-20 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex gap-2 items-start animate-in motion-reduce:animate-none slide-in-from-top-2 relative"><Stamp label={t('quiz.verified_stamp')} position="top-2 right-2" size="small" /><button type="button" aria-label={isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')} onClick={() => handleFactCheck(i)} disabled={isFactChecking[i]} className="absolute bottom-2 right-2 p-1.5 text-yellow-800 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors motion-reduce:transition-none" title={t('quiz.regenerate_check')}><RefreshCw size={14} className={isFactChecking[i] ? "animate-spin " + quizreducedMotionClass : ""} /></button><Sparkles size={14} className="mt-0.5 shrink-0 text-yellow-600" /><div className="flex-grow"><div className="whitespace-pre-line leading-relaxed text-slate-700">{renderFormattedText(q.factCheck)}</div></div></div>}</div>)}{(Array.isArray(generatedContent?.data.reflections) && generatedContent.data.reflections.length > 0 || generatedContent?.data.reflection) && <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mt-8"><h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><PenTool size={16} /> {t('quiz.reflections')}</h4>{Array.isArray(generatedContent?.data.reflections) ? <div className="space-y-6">{generatedContent?.data.reflections.map((ref, i) => {
              const text = typeof ref === 'string' ? ref : ref.text || ref.prompt || ref.question || (typeof ref === 'object' ? JSON.stringify(ref) : '');
              const textEn = typeof ref === 'object' && ref.text_en ? ref.text_en : null;
              var refEntry = reflectionAnswers[i] || {};
              var refSubmitted = !!refEntry.submitted;
              var refDraft = refEntry.draft || '';
              return <div key={i}>{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_reflection') || 'Edit reflection prompt'} value={text} onChange={e => handleReflectionChange(i, e.target.value)} className="w-full text-indigo-800 mb-1 italic text-sm bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(text)} />{(textEn !== null || leveledTextLanguage !== 'English') && <textarea aria-label={t('quiz.edit_reflection_translation') || 'Edit reflection translation'} value={textEn || ''} onChange={e => handleReflectionChange(i, e.target.value, true)} className="w-full text-indigo-600 mb-4 text-xs bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(textEn || '')} placeholder={t('common.placeholder_reflection_trans')} />}</> : <><p className="text-indigo-800 mb-1 italic text-sm px-2 py-1">{text}</p>{textEn && <p className="text-indigo-600 mb-4 text-xs px-2 py-1 italic">{textEn}</p>}</>}{!isEditingQuiz && (isPresentationMode ? <div className="h-24 border-b border-indigo-200 border-dashed" /> : refSubmitted ? <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">✓ Reflection submitted</div><p className="text-sm text-slate-800 whitespace-pre-wrap">{refEntry.submittedText || refDraft}</p><button type="button" onClick={function () {
                    reopenReflection(i);
                  }} className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">{t("ui_common.edit_response")}</button></div> : <div className="mt-2"><textarea aria-label="Your reflection" value={refDraft} onChange={function (e) {
                    setReflectionDraft(i, e.target.value);
                  }} placeholder={t("placeholders.reflection_here")} className="w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-y transition-all motion-reduce:transition-none" rows={4} /><QuizVoiceInputButton value={refDraft} onChange={function (value) { setReflectionDraft(i, value); }} allowDictation={allowDictation} label="Dictate reflection" /><div className="flex items-center gap-2 mt-2"><button type="button" onClick={function () {
                      submitReflection(i);
                    }} disabled={!refDraft.trim()} className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{t("ui_common.submit_reflection")}</button>{!refDraft.trim() && <span className="text-[11px] italic text-slate-600">Type a response to enable submit</span>}</div></div>)}</div>;
            })}</div> : <><p className="text-indigo-800 mb-4 italic text-sm">{generatedContent?.data.reflection}</p>{!isEditingQuiz && (isPresentationMode ? <div className="h-24 border-b border-indigo-200 border-dashed" /> : function () {
              var refEntry = reflectionAnswers[0] || {};
              var refSubmitted = !!refEntry.submitted;
              var refDraft = refEntry.draft || '';
              return refSubmitted ? <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">✓ Reflection submitted</div><p className="text-sm text-slate-800 whitespace-pre-wrap">{refEntry.submittedText || refDraft}</p><button type="button" onClick={function () {
                  reopenReflection(0);
                }} className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">{t("ui_common.edit_response")}</button></div> : <div className="mt-2"><textarea aria-label="Your reflection" value={refDraft} onChange={function (e) {
                  setReflectionDraft(0, e.target.value);
                }} placeholder={t("placeholders.reflection_here")} className="w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-y transition-all motion-reduce:transition-none" rows={4} /><QuizVoiceInputButton value={refDraft} onChange={function (value) { setReflectionDraft(0, value); }} allowDictation={allowDictation} label="Dictate reflection" /><div className="flex items-center gap-2 mt-2"><button type="button" onClick={function () {
                    submitReflection(0);
                  }} disabled={!refDraft.trim()} className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{t("ui_common.submit_reflection")}</button>{!refDraft.trim() && <span className="text-[11px] italic text-slate-600">Type a response to enable submit</span>}</div></div>;
            }())}</>}</div>}</div>}</div>;
  }
  QuizView.voiceBoundary = Object.freeze({
    controlEvent: QUIZ_VOICE_CONTROL_EVENT,
    statusEvent: QUIZ_VOICE_STATUS_EVENT,
    parseChoice: _quizVoiceChoiceIndex,
    parseScopedUtterance: _quizVoiceParseScopedUtterance,
    choiceRange: 'A-H / 1-8 / first-eighth'
  });
