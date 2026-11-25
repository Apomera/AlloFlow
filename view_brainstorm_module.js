/**
 * AlloFlow View - Brainstorm Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='brainstorm' block.
 * Source range (post-SentenceFrames): 163 lines.
 * Renders the brainstorm view: idea cards with title/description/connection,
 * teacher guides + student worksheets + cover image generation.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.BrainstormView) {
    console.log('[CDN] ViewBrainstormModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewBrainstormModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var RefreshCw = _lazyIcon('RefreshCw');
  var FileText = _lazyIcon('FileText');
  var ImageIcon = _lazyIcon('ImageIcon');
  var MessageSquare = _lazyIcon('MessageSquare');
  var Users = _lazyIcon('Users');

  function ensureBrainstormPolishCss() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('allo-brainstorm-a11y-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-brainstorm-a11y-css';
  st.textContent = ['[data-help-key="brainstorm_panel"] button,[data-help-key="brainstorm_panel"] input,[data-help-key="brainstorm_panel"] select,[data-help-key="brainstorm_panel"] textarea,[data-help-key="brainstorm_panel"] summary{touch-action:manipulation;box-sizing:border-box}', '[data-help-key="brainstorm_panel"] button:focus-visible,[data-help-key="brainstorm_panel"] input:focus-visible,[data-help-key="brainstorm_panel"] select:focus-visible,[data-help-key="brainstorm_panel"] textarea:focus-visible,[data-help-key="brainstorm_panel"] summary:focus-visible{outline:3px solid #4f46e5;outline-offset:2px}', '.theme-contrast [data-help-key="brainstorm_panel"] :focus-visible{outline:3px solid #ffff00!important;outline-offset:2px}', '@media (forced-colors:active){[data-help-key="brainstorm_panel"] :focus-visible{outline:3px solid Highlight!important;outline-offset:2px}[data-help-key="brainstorm_panel"] button,[data-help-key="brainstorm_panel"] input,[data-help-key="brainstorm_panel"] select,[data-help-key="brainstorm_panel"] textarea,[data-help-key="brainstorm_panel"] summary{border:1px solid ButtonText}}', '@media (prefers-reduced-motion:reduce){[data-help-key="brainstorm_panel"] *,[data-help-key="brainstorm_panel"] *::before,[data-help-key="brainstorm_panel"] *::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}'].join('');
  document.head.appendChild(st);
}
ensureBrainstormPolishCss();
function projectStudentActivityResource(resource) {
  if (!resource || resource.type !== 'brainstorm' || !Array.isArray(resource.data)) return null;
  const text = value => typeof value === 'string' ? value : '';
  // Blank editor lines are not student items.
  const strings = values => (Array.isArray(values) ? values : []).filter(value => typeof value === 'string' && value.trim());
  const data = resource.data.filter(item => item && ['discussion', 'jigsaw'].includes(item.kind)).map(item => {
    const projected = {
      kind: item.kind,
      title: text(item.title)
    };
    if (item.kind === 'discussion') {
      projected.protocol = text(item.protocol);
      projected.grouping = text(item.grouping);
      projected.openingQuestion = text(item.openingQuestion);
      projected.questionSets = (Array.isArray(item.questionSets) ? item.questionSets : []).map(set => ({
        depth: text(set && set.depth),
        questions: strings(set && set.questions)
      })).filter(set => set.questions.length);
      projected.talkStems = {};
      ['agree', 'disagree', 'clarify', 'build'].forEach(category => {
        projected.talkStems[category] = strings(item.talkStems && item.talkStems[category]);
      });
    } else {
      projected.groupSize = Math.max(2, Math.min(6, Number(item.groupSize) || 4));
      projected.chunks = (Array.isArray(item.chunks) ? item.chunks : []).map(chunk => ({
        label: text(chunk && chunk.label),
        expertPacket: text(chunk && chunk.expertPacket),
        teachBack: {
          keyPoints: strings(chunk && chunk.teachBack && chunk.teachBack.keyPoints),
          checkQuestions: strings(chunk && chunk.teachBack && chunk.teachBack.checkQuestions)
        }
      }));
      projected.homeGroupTask = text(item.homeGroupTask);
      projected.synthesisOrganizer = text(item.synthesisOrganizer);
      projected.accountabilityCheck = (Array.isArray(item.accountabilityCheck) ? item.accountabilityCheck : []).map(check => ({
        q: text(check && check.q)
      })).filter(check => check.q.trim());
    }
    return projected;
  });
  if (!data.length) return null;
  const result = {
    type: 'brainstorm',
    data,
    studentProjection: true
  };
  ['id', 'artifactInstanceId', 'unitId', 'sourceFingerprint', 'title', 'timestamp', 'language', 'gradeLevel', 'sourceTitle', 'sourceId', 'lessonId'].forEach(key => {
    if (typeof resource[key] === 'string' || typeof resource[key] === 'number') result[key] = resource[key];
  });
  if (resource.config && typeof resource.config === 'object') {
    const config = {};
    ['language', 'grade', 'gradeLevel'].forEach(key => {
      if (typeof resource.config[key] === 'string' || typeof resource.config[key] === 'number') config[key] = resource.config[key];
    });
    if (Object.keys(config).length) result.config = config;
  }
  return result;
}
function ActivityStructuredEditor(props) {
  const item = props.item;
  const change = props.onChange;
  const [groupSizeDraft, setGroupSizeDraft] = React.useState(item && item.groupSize != null ? String(item.groupSize) : '4');
  React.useEffect(() => {
    setGroupSizeDraft(item && item.groupSize != null ? String(item.groupSize) : '4');
  }, [item && item.groupSize]);
  const fieldClass = 'w-full min-h-11 rounded-lg border border-slate-400 p-2 text-sm text-slate-800 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
  const label = (key, fallback) => {
    const value = props.t && props.t(key);
    return value && value !== key ? value : fallback;
  };
  const textField = (name, value, onChange, rows = 2) => /*#__PURE__*/React.createElement("label", {
    className: "block space-y-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, name), /*#__PURE__*/React.createElement("textarea", {
    className: fieldClass,
    "aria-label": name,
    rows: rows,
    value: typeof value === 'string' ? value : '',
    onChange: event => onChange(event.target.value)
  }));
  const listField = (name, values, onChange) => textField(name, (Array.isArray(values) ? values : []).join('\n'), value => onChange(value.split('\n')), 3);
  const replaceAt = (values, index, value) => values.map((entry, i) => i === index ? value : entry);
  const removeButton = (name, onClick) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 text-xs font-bold text-red-700 border border-red-300 rounded px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    "aria-label": name,
    onClick: onClick
  }, label('common.delete', 'Delete'));
  const addButton = (name, onClick) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 text-xs font-bold text-violet-700 border border-violet-300 rounded px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    onClick: onClick
  }, name);
  const questionSets = Array.isArray(item.questionSets) ? item.questionSets : [];
  const chunks = Array.isArray(item.chunks) ? item.chunks : [];
  const checks = Array.isArray(item.accountabilityCheck) ? item.accountabilityCheck : [];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4",
    role: "group",
    "aria-label": label('brainstorm.edit_activity', 'Edit activity')
  }, textField(label('brainstorm.placeholder_title', 'Activity title'), item.title, value => change('title', value), 1), item.kind === 'discussion' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "block space-y-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, label('brainstorm.protocol', 'Discussion protocol')), /*#__PURE__*/React.createElement("select", {
    className: fieldClass,
    "aria-label": label('brainstorm.protocol', 'Discussion protocol'),
    value: item.protocol || 'think-pair-share',
    onChange: event => change('protocol', event.target.value)
  }, ['think-pair-share', 'socratic-seminar', 'fishbowl', 'gallery-walk'].map(value => /*#__PURE__*/React.createElement("option", {
    key: value,
    value: value
  }, label('brainstorm.protocol_' + value.replace(/-/g, '_'), value))))), textField(label('brainstorm.grouping', 'Grouping instructions'), item.grouping, value => change('grouping', value)), textField(label('brainstorm.opening_question', 'Opening question'), item.openingQuestion, value => change('openingQuestion', value)), questionSets.map((rawSet, index) => {
    const set = rawSet && typeof rawSet === 'object' ? rawSet : {};
    return /*#__PURE__*/React.createElement("fieldset", {
      key: index,
      className: "border border-slate-300 rounded-lg p-3 space-y-2"
    }, /*#__PURE__*/React.createElement("legend", {
      className: "text-xs font-bold"
    }, label('brainstorm.question_set', 'Question set'), " ", index + 1), /*#__PURE__*/React.createElement("label", {
      className: "block text-xs font-bold"
    }, label('brainstorm.question_depth', 'Question depth'), /*#__PURE__*/React.createElement("select", {
      className: fieldClass,
      "aria-label": label('brainstorm.question_depth', 'Question depth') + ' ' + (index + 1),
      value: set.depth || 'literal',
      onChange: event => change('questionSets', replaceAt(questionSets, index, {
        ...set,
        depth: event.target.value
      }))
    }, ['literal', 'inferential', 'evaluative'].map(depth => /*#__PURE__*/React.createElement("option", {
      key: depth,
      value: depth
    }, label('brainstorm.depth_' + depth, depth))))), listField(label('brainstorm.questions', 'Questions (one per line)') + ' ' + (index + 1), set.questions, value => change('questionSets', replaceAt(questionSets, index, {
      ...set,
      questions: value
    }))), removeButton(label('brainstorm.remove_question_set', 'Delete question set') + ' ' + (index + 1), () => change('questionSets', questionSets.filter((_, i) => i !== index))));
  }), addButton(label('brainstorm.add_question_set', 'Add question set'), () => change('questionSets', [...questionSets, {
    depth: 'literal',
    questions: ['']
  }])), ['agree', 'disagree', 'clarify', 'build'].map(category => /*#__PURE__*/React.createElement("div", {
    key: category
  }, listField(label('brainstorm.stems_' + category, category) + ' — ' + label('brainstorm.talk_stems', 'Talk stems'), item.talkStems && item.talkStems[category], value => change('talkStems', {
    ...(item.talkStems || {}),
    [category]: value
  })))), textField(label('brainstorm.facilitation_notes', 'Facilitation notes (teacher)'), item.facilitationNotes, value => change('facilitationNotes', value), 4), listField(label('brainstorm.look_fors', 'Participation look-fors'), item.lookFors, value => change('lookFors', value))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "block space-y-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold"
  }, label('brainstorm.group_size', 'Home-group size')), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "2",
    max: "6",
    className: fieldClass,
    "aria-label": label('brainstorm.group_size', 'Home-group size'),
    value: groupSizeDraft,
    onChange: event => {
      const raw = event.target.value;
      setGroupSizeDraft(raw);
      const parsed = Number(raw);
      if (raw !== '' && Number.isFinite(parsed) && parsed >= 2 && parsed <= 6) {
        change('groupSize', Math.round(parsed));
      }
    },
    onBlur: event => {
      const parsed = Number(event.target.value);
      const clamped = Math.max(2, Math.min(6, event.target.value !== '' && Number.isFinite(parsed) ? Math.round(parsed) : Number(item && item.groupSize) || 4));
      setGroupSizeDraft(String(clamped));
      change('groupSize', clamped);
    }
  })), chunks.map((rawChunk, index) => {
    const chunk = rawChunk && typeof rawChunk === 'object' ? rawChunk : {};
    return /*#__PURE__*/React.createElement("fieldset", {
      key: index,
      className: "border border-emerald-300 rounded-lg p-3 space-y-2"
    }, /*#__PURE__*/React.createElement("legend", {
      className: "text-xs font-bold"
    }, label('brainstorm.expert_group', 'Expert group'), " ", index + 1), textField(label('brainstorm.expert_group_label', 'Expert group label') + ' ' + (index + 1), chunk.label, value => change('chunks', replaceAt(chunks, index, {
      ...chunk,
      label: value
    })), 1), textField(label('brainstorm.expert_packet', 'Expert packet') + ' ' + (index + 1), chunk.expertPacket, value => change('chunks', replaceAt(chunks, index, {
      ...chunk,
      expertPacket: value
    })), 5), listField(label('brainstorm.teach_back_points', 'Teach-back points') + ' ' + (index + 1), chunk.teachBack && chunk.teachBack.keyPoints, value => change('chunks', replaceAt(chunks, index, {
      ...chunk,
      teachBack: {
        ...(chunk.teachBack || {}),
        keyPoints: value
      }
    }))), listField(label('brainstorm.teach_back_questions', 'Teach-back questions') + ' ' + (index + 1), chunk.teachBack && chunk.teachBack.checkQuestions, value => change('chunks', replaceAt(chunks, index, {
      ...chunk,
      teachBack: {
        ...(chunk.teachBack || {}),
        checkQuestions: value
      }
    }))), removeButton(label('brainstorm.remove_expert_group', 'Delete expert group') + ' ' + (index + 1), () => change('chunks', chunks.filter((_, i) => i !== index))));
  }), chunks.length < 6 && addButton(label('brainstorm.add_expert_group', 'Add expert group'), () => change('chunks', [...chunks, {
    label: '',
    expertPacket: '',
    teachBack: {
      keyPoints: [],
      checkQuestions: []
    }
  }])), textField(label('brainstorm.home_group_task', 'Home-group task'), item.homeGroupTask, value => change('homeGroupTask', value), 3), textField(label('brainstorm.synthesis_organizer', 'Putting it together'), item.synthesisOrganizer, value => change('synthesisOrganizer', value), 3), checks.map((rawCheck, index) => {
    const check = rawCheck && typeof rawCheck === 'object' ? rawCheck : {};
    return /*#__PURE__*/React.createElement("fieldset", {
      key: index,
      className: "border border-slate-300 rounded-lg p-3 space-y-2"
    }, /*#__PURE__*/React.createElement("legend", {
      className: "text-xs font-bold"
    }, label('brainstorm.accountability_check', 'Show what you learned'), " ", index + 1), textField(label('brainstorm.check_question', 'Check question') + ' ' + (index + 1), check.q, value => change('accountabilityCheck', replaceAt(checks, index, {
      ...check,
      q: value
    }))), textField(label('brainstorm.answer_key', 'Answer key (teacher only)') + ' ' + (index + 1), check.answer, value => change('accountabilityCheck', replaceAt(checks, index, {
      ...check,
      answer: value
    }))), removeButton(label('brainstorm.remove_check_question', 'Delete check question') + ' ' + (index + 1), () => change('accountabilityCheck', checks.filter((_, i) => i !== index))));
  }), addButton(label('brainstorm.add_check_question', 'Add check question'), () => change('accountabilityCheck', [...checks, {
    q: '',
    answer: ''
  }]))));
}

// ── Activity-kind bodies (2026-08-16 Activities redesign) ──────────────────
// Brainstorm data items may carry an optional `kind`: absent/'idea' renders the
// classic idea card; 'discussion' and 'jigsaw' render the structured bodies
// below. Teacher editing preserves the structured schema;
// the shared ladder (guide/worksheet/rubric) still applies to every kind.
// Shapes are pure data (docs/ACTIVITIES_RESOURCE_DESIGN_2026-08-16.md §D4).

function activityDisplayText(value) {
  return String(value == null ? '' : value).replace(/&lt;br\s*\/?&gt;/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/(^|\n)\s*#{1,6}\s+(?=\S)/g, '$1').replace(/(^|\n)\s*#{1,6}\s*(?=\n|$)/g, '$1').trim();
}
function activityNonEmpty(values) {
  return (Array.isArray(values) ? values : []).filter(function (value) {
    return String(value == null ? '' : value).trim();
  });
}
function activityT(t, key, fallback, vars) {
  var value = typeof t === 'function' ? t(key) : '';
  var text = typeof value === 'string' && value.trim() && value !== key ? value : fallback;
  Object.keys(vars || {}).forEach(function (name) {
    text = text.split('{' + name + '}').join(String(vars[name]));
  });
  return text;
}

// Learner answers ride the shared studentResponses[resourceId] record (the DBQ
// contract). Keys come from the text, not positions: the student projection drops
// blank lines and idea cards, so positions differ between the two copies.
function activityTextHash(value) {
  var text = String(value == null ? '' : value).trim(),
    hash = 5381;
  for (var i = 0; i < text.length; i++) hash = (hash << 5) + hash + text.charCodeAt(i) | 0;
  return (hash >>> 0).toString(36);
}
function activityResponseKey(item, part, question) {
  var slug = String(question == null ? '' : question).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  var title = item && typeof item.title === 'string' ? item.title : '';
  return 'activity:' + activityTextHash((item && item.kind) + '|' + title) + ':' + part + ':' + activityTextHash(question) + (slug ? ':' + slug : '');
}
function _bsOwn(obj, key) {
  return obj && typeof obj === 'object' && key != null && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}
function _bsSafeCoverUrl(raw) {
  if (typeof raw !== 'string') return '';
  var s = raw.trim();
  if (!s) return '';
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s;
  if (/^blob:/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/(?!\/)/.test(s)) return s;
  return '';
}
function _brainstormStopSpeech() {
  if (typeof window === 'undefined') return;
  try {
    if (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') window.AlloSpeechPlayer.stop();
  } catch (_) {}
  try {
    if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  } catch (_) {}
}
function _brainstormSpeakText(raw) {
  var clean = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  try {
    if (typeof window !== 'undefined' && (window.__alloMuted === true || window._alloGlobalMute === true || window._alloGlobalMuted === true || typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted())) {
      return;
    }
    if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
      Promise.resolve(window.AlloSpeechPlayer.speak(clean)).catch(function () {});
    } else if (typeof window !== 'undefined' && typeof window.callTTS === 'function') {
      Promise.resolve(window.callTTS(clean)).catch(function () {});
    } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(clean));
    }
  } catch (_) {}
}

// The value comes only from the learner's own record, never from the resource.
function ActivityResponseField(props) {
  var answers = props.answers || {};
  var rawVal = _bsOwn(answers, props.responseKey);
  var value = typeof rawVal === 'string' ? rawVal : '';
  var DictationBtn = typeof window !== 'undefined' && (window.AlloModules?.DictationButton || window.AlloDictationButton);
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-1 mb-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    "data-activity-response": props.responseKey,
    value: value,
    onFocus: function () {
      if (typeof props.onFocusKey === 'function') props.onFocusKey(props.responseKey);
    },
    onChange: function (event) {
      props.onAnswer(props.responseKey, event.target.value);
    },
    rows: 2,
    "aria-label": activityT(props.t, 'brainstorm.answer_aria', 'Your answer: {question}', {
      question: String(props.question || '').slice(0, 160)
    }),
    placeholder: activityT(props.t, 'brainstorm.answer_placeholder', 'Type your answer...'),
    className: "w-full min-h-11 rounded-lg border border-slate-400 bg-white p-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }), DictationBtn ? /*#__PURE__*/React.createElement("div", {
    className: "mt-1"
  }, /*#__PURE__*/React.createElement(DictationBtn, {
    t: props.t,
    label: activityT(props.t, 'common.dictate', 'Dictate'),
    onTranscript: function (spoken) {
      var prev = String(value || '').trimEnd();
      props.onAnswer(props.responseKey, (prev ? prev + ' ' : '') + spoken);
    }
  })) : null);
}
function ActivityAnswersNote(props) {
  const state = props.studentWorkStatus;
  const messages = {
    saving: ['brainstorm.answers_saving', 'Saving your answers…'],
    saved: ['brainstorm.answers_saved', 'Your answers are saved on this device.'],
    error: ['brainstorm.answers_save_error', 'Your answers could not be saved. Keep this page open and try again.'],
    conflict: ['brainstorm.answers_save_conflict', 'Your answers are not saved yet. Review the conflicting changes above.']
  };
  const message = _bsOwn(messages, state) || ['brainstorm.answers_ready', 'Write your answers below.'];
  return /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-700 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, activityT(props.t, message[0], message[1])), state === 'error' && typeof props.onRetrySave === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: props.onRetrySave,
    className: "mt-2 min-h-11 rounded-lg border border-slate-500 px-3 py-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, activityT(props.t, 'studio_response.retry_save', 'Try saving again')));
}
function ActivityArtifactSummary(props) {
  var item = props.item || {};
  var t = props.t;
  var definitions = [['guide', t('brainstorm.teacher_guide') || 'Teacher guide'], ['worksheet', t('brainstorm.student_worksheet') || 'Student worksheet'], ['rubric', t('brainstorm.activity_rubric') || 'Activity rubric'], ['cover', t('brainstorm.cover') || 'Cover image']];
  var statusText = {
    'not-created': t('brainstorm.status_not_created') || 'not created',
    generating: t('brainstorm.status_generating') || 'creating',
    ready: t('brainstorm.status_ready') || 'ready',
    edited: t('brainstorm.status_edited') || 'edited',
    failed: t('brainstorm.status_failed') || 'needs retry'
  };
  var dispatcher = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.GenDispatcher : null;
  var readyCount = 0;
  var reviewCount = 0;
  var reviewKinds = [];
  var generationMeta = item.generationMeta && typeof item.generationMeta === 'object' ? item.generationMeta : null;
  var pills = definitions.map(function (entry) {
    var kind = entry[0];
    var value = kind === 'cover' ? item.coverImage : item[kind];
    var hasValue = kind === 'rubric' ? !!(value && Array.isArray(value.criteria) && value.criteria.length) : !!(typeof value === 'string' ? value.trim() : value);
    var meta = item.derivatives && item.derivatives[kind];
    var status = meta && meta.status ? meta.status : hasValue ? 'ready' : 'not-created';
    var needsReview = hasValue && !!(dispatcher && typeof dispatcher.activityDerivativeNeedsReview === 'function' && dispatcher.activityDerivativeNeedsReview(item, kind));
    if (hasValue) readyCount++;
    if (needsReview) {
      reviewCount++;
      reviewKinds.push(kind);
    }
    return /*#__PURE__*/React.createElement("span", {
      key: kind,
      "data-derivative-review": needsReview ? kind : undefined,
      className: 'text-xs font-bold rounded-full border px-2 py-0.5 ' + (needsReview ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700')
    }, entry[1], ": ", needsReview ? t('brainstorm.status_needs_review') || 'needs review' : _bsOwn(statusText, status) || status);
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    role: "group",
    className: "flex flex-wrap items-center gap-1.5",
    "aria-label": (t('brainstorm.resource_status') || 'Activity resources') + ': ' + readyCount + '/' + definitions.length
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-black uppercase tracking-wider text-slate-600 mr-1"
  }, t('brainstorm.resource_status') || 'Resources'), pills, generationMeta && generationMeta.attempts > 1 ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold rounded-full border px-2 py-0.5 border-amber-200 bg-amber-50 text-amber-800",
    title: t('brainstorm.recovered_tip') || 'The activity response was repaired automatically after an incomplete first response.'
  }, (t('brainstorm.recovered_attempts') || 'Recovered after {n} attempts').replace('{n}', String(generationMeta.attempts))) : null), reviewCount > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex flex-wrap items-center gap-2",
    "data-derivatives-need-review": "true"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-0 text-xs text-amber-900"
  }, t('brainstorm.derivatives_need_review') || 'This activity was edited after the marked resources were made. Review them before students use them.'), typeof props.onChangeDerivatives === 'function' && typeof dispatcher.activitySourceFingerprint === 'function' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 text-xs font-bold rounded-full border border-amber-400 bg-white px-3 py-1.5 text-amber-900 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600",
    onClick: function () {
      var fingerprint = dispatcher.activitySourceFingerprint(item);
      var next = {
        ...(item.derivatives || {})
      };
      reviewKinds.forEach(function (kind) {
        next[kind] = {
          ...(next[kind] || {}),
          sourceHash: fingerprint
        };
      });
      props.onChangeDerivatives(next);
    }
  }, t('brainstorm.mark_reviewed') || 'Mark as reviewed') : null) : null);
}
function DiscussionKitBody(props) {
  var t = props.t;
  var item = props.item;
  var isTeacherMode = props.isTeacherMode;
  var renderFormattedText = props.renderFormattedText;
  var protocolMap = {
    'socratic-seminar': 'Socratic Seminar',
    'think-pair-share': 'Think-Pair-Share',
    'fishbowl': 'Fishbowl',
    'gallery-walk': 'Gallery Walk'
  };
  var protocolLabel = t('brainstorm.protocol_' + String(item.protocol || '').replace(/-/g, '_')) || _bsOwn(protocolMap, item.protocol) || item.protocol || 'Discussion';
  var stemCats = ['agree', 'disagree', 'clarify', 'build'];
  var stemLabels = {
    agree: t('brainstorm.stems_agree') || 'Agreeing',
    disagree: t('brainstorm.stems_disagree') || 'Disagreeing respectfully',
    clarify: t('brainstorm.stems_clarify') || 'Asking for clarity',
    build: t('brainstorm.stems_build') || 'Building on ideas'
  };
  var depthLabels = {
    literal: t('brainstorm.depth_literal') || 'Right there in the text',
    inferential: t('brainstorm.depth_inferential') || 'Between the lines',
    evaluative: t('brainstorm.depth_evaluative') || 'Your judgment'
  };
  var rawStems = item.talkStems && typeof item.talkStems === 'object' ? item.talkStems : {};
  var stems = {};
  stemCats.forEach(function (c) {
    stems[c] = activityNonEmpty(rawStems[c]);
  });
  var hasStems = stemCats.some(function (c) {
    return stems[c].length;
  });
  var lookFors = activityNonEmpty(item.lookFors);
  var answering = !isTeacherMode && typeof props.onAnswer === 'function';
  var [activeResponseKey, setActiveResponseKey] = React.useState('');
  var [stemAnnouncement, setStemAnnouncement] = React.useState('');
  var defaultStemKey = '';
  if (item.openingQuestion) {
    defaultStemKey = activityResponseKey(item, 'opening', item.openingQuestion);
  } else {
    var firstQSet = (Array.isArray(item.questionSets) ? item.questionSets : []).find(function (set) {
      return activityNonEmpty(set && set.questions).length > 0;
    });
    if (firstQSet) {
      defaultStemKey = activityResponseKey(item, 'question', activityNonEmpty(firstQSet.questions)[0]);
    }
  }
  var insertTalkStem = function (stemText) {
    var targetKey = activeResponseKey || defaultStemKey;
    if (!answering || !targetKey) return;
    var answers = props.answers || {};
    var prev = typeof answers[targetKey] === 'string' ? answers[targetKey] : '';
    var sep = prev && !/\s$/.test(prev) ? ' ' : '';
    props.onAnswer(targetKey, prev + sep + stemText);
    var msg = activityT(t, 'brainstorm.stem_inserted_sr', 'Inserted talk stem: {stem}', {
      stem: stemText
    });
    setStemAnnouncement(msg);
    if (typeof props.announceToSR === 'function') props.announceToSR(msg);
  };
  var field = function (key, question) {
    return answering ? /*#__PURE__*/React.createElement(ActivityResponseField, {
      t: t,
      answers: props.answers,
      onAnswer: props.onAnswer,
      onFocusKey: setActiveResponseKey,
      responseKey: key,
      question: question
    }) : null;
  };
  var discussionKeys = [];
  if (item.openingQuestion) discussionKeys.push(activityResponseKey(item, 'opening', item.openingQuestion));
  (Array.isArray(item.questionSets) ? item.questionSets : []).forEach(function (set) {
    activityNonEmpty(set && set.questions).forEach(function (q) {
      discussionKeys.push(activityResponseKey(item, 'question', q));
    });
  });
  var discussionAnswered = answering ? discussionKeys.filter(function (k) {
    return String(props.answers && props.answers[k] || '').trim().length > 0;
  }).length : 0;
  return /*#__PURE__*/React.createElement("div", {
    "data-help-key": "brainstorm_discussion_card"
  }, stemAnnouncement ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "sr-only"
  }, stemAnnouncement) : null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg text-indigo-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 18,
    className: "text-cyan-700 shrink-0",
    "aria-hidden": "true"
  }), " ", activityDisplayText(item.title)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-brainstorm-listen": "discussion",
    onClick: function () {
      var qTexts = (Array.isArray(item.questionSets) ? item.questionSets : []).reduce(function (acc, set) {
        return acc.concat(activityNonEmpty(set && set.questions).map(activityDisplayText));
      }, []);
      _brainstormSpeakText([activityDisplayText(item.title), activityDisplayText(item.openingQuestion)].concat(qTexts).filter(Boolean).join('. '));
    },
    "aria-label": (t('common.listen') || 'Listen') + ': ' + activityDisplayText(item.title),
    title: t('a11y.read_aloud') || 'Listen',
    className: "no-print min-h-11 shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔊"), /*#__PURE__*/React.createElement("span", null, t('common.listen') || 'Listen'))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-full px-2.5 py-0.5"
  }, protocolLabel), item.grouping ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, activityDisplayText(item.grouping)) : null, answering && discussionKeys.length > 0 ? /*#__PURE__*/React.createElement("span", {
    "data-activity-progress": true,
    className: `text-xs font-bold rounded-full border px-2.5 py-0.5 ${discussionAnswered === discussionKeys.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-white text-indigo-800 border-indigo-200'}`
  }, discussionAnswered === discussionKeys.length ? '✓ ' + activityT(t, 'brainstorm.all_answered', 'All {total} answered', {
    total: discussionKeys.length
  }) : activityT(t, 'brainstorm.answered_progress', '{done} / {total} answered', {
    done: discussionAnswered,
    total: discussionKeys.length
  })) : null), answering ? /*#__PURE__*/React.createElement(ActivityAnswersNote, {
    t: t,
    studentWorkStatus: props.studentWorkStatus,
    onRetrySave: props.onRetrySave
  }) : null, item.openingQuestion ? /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-800 bg-cyan-50/60 border border-cyan-100 rounded-lg p-3 whitespace-pre-line"
  }, activityDisplayText(item.openingQuestion)), field(activityResponseKey(item, 'opening', item.openingQuestion), activityDisplayText(item.openingQuestion))) : null, (Array.isArray(item.questionSets) ? item.questionSets : []).map(function (set, setIdx) {
    var qs = activityNonEmpty(set && set.questions);
    if (!qs.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: setIdx,
      className: "mb-3"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
    }, _bsOwn(depthLabels, set.depth) || set.depth || ''), /*#__PURE__*/React.createElement("ol", {
      className: "list-decimal ml-5 text-sm text-slate-700 space-y-1"
    }, qs.map(function (q, qIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: qIdx
      }, activityDisplayText(q), field(activityResponseKey(item, 'question', q), activityDisplayText(q)));
    })));
  }), hasStems ? /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-2"
  }, t('brainstorm.talk_stems') || 'Talk stems'), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, stemCats.map(function (cat) {
    var list = stems[cat];
    if (!list.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: cat,
      className: "bg-slate-50 border border-slate-200 rounded-lg p-2.5"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "block text-xs uppercase tracking-wider text-slate-600 mb-1"
    }, stemLabels[cat]), /*#__PURE__*/React.createElement("ul", {
      className: "text-xs text-slate-700 space-y-1"
    }, list.map(function (s, sIdx) {
      var stemText = activityDisplayText(s);
      return /*#__PURE__*/React.createElement("li", {
        key: sIdx
      }, answering && defaultStemKey ? /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-talk-stem": stemText,
        onClick: function () {
          insertTalkStem(stemText);
        },
        "aria-label": activityT(t, 'brainstorm.insert_stem_aria', 'Insert talk stem: {stem}', {
          stem: stemText
        }),
        title: activityT(t, 'brainstorm.insert_stem_tip', 'Click to insert into your answer'),
        className: "min-h-11 text-left inline-flex items-center rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-800 hover:bg-indigo-50 hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors motion-reduce:transition-none"
      }, "“", stemText, "”") : /*#__PURE__*/React.createElement(React.Fragment, null, "“", stemText, "”"));
    })));
  }))) : null, isTeacherMode && item.facilitationNotes ? /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-300 mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-slate-800 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('brainstorm.facilitation_notes') || 'Facilitation notes (teacher)'), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(item.facilitationNotes))) : null, isTeacherMode && lookFors.length ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 mb-3"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block uppercase tracking-wider text-xs mb-1"
  }, t('brainstorm.look_fors') || 'Participation look-fors'), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-4 space-y-0.5"
  }, lookFors.map(function (l, lIdx) {
    return /*#__PURE__*/React.createElement("li", {
      key: lIdx
    }, activityDisplayText(l));
  }))) : null);
}
function JigsawBody(props) {
  var t = props.t;
  var item = props.item;
  var isTeacherMode = props.isTeacherMode;
  var renderFormattedText = props.renderFormattedText;
  var chunks = Array.isArray(item.chunks) ? item.chunks : [];
  var checks = (Array.isArray(item.accountabilityCheck) ? item.accountabilityCheck : []).filter(function (c) {
    return c && String(c.q == null ? '' : c.q).trim();
  });
  var answering = !isTeacherMode && typeof props.onAnswer === 'function';
  return /*#__PURE__*/React.createElement("div", {
    "data-help-key": "brainstorm_jigsaw_card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg text-indigo-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 18,
    className: "text-emerald-700 shrink-0",
    "aria-hidden": "true"
  }), " ", activityDisplayText(item.title)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-brainstorm-listen": "jigsaw",
    onClick: function () {
      _brainstormSpeakText([activityDisplayText(item.title), activityDisplayText(item.homeGroupTask), activityDisplayText(item.synthesisOrganizer)].filter(Boolean).join('. '));
    },
    "aria-label": (t('common.listen') || 'Listen') + ': ' + activityDisplayText(item.title),
    title: t('a11y.read_aloud') || 'Listen',
    className: "no-print min-h-11 shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔊"), /*#__PURE__*/React.createElement("span", null, t('common.listen') || 'Listen'))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full px-2.5 py-0.5"
  }, (t('brainstorm.jigsaw_group_size') || 'Home groups of {n}').replace('{n}', String(item.groupSize || chunks.length || 4)))), chunks.map(function (chunk, cIdx) {
    if (!chunk || typeof chunk !== 'object') return null;
    var tb = chunk.teachBack && typeof chunk.teachBack === 'object' ? chunk.teachBack : {};
    var keyPoints = activityNonEmpty(tb.keyPoints);
    var checkQs = activityNonEmpty(tb.checkQuestions);
    return /*#__PURE__*/React.createElement("details", {
      key: cIdx,
      className: "mb-2 rounded-lg border border-emerald-200 bg-white group"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer list-none min-h-11 px-3 py-2 text-sm font-bold text-emerald-900 flex items-center justify-between hover:bg-emerald-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("span", null, activityDisplayText(chunk.label || (t('brainstorm.expert_group') || 'Expert group') + ' ' + (cIdx + 1))), /*#__PURE__*/React.createElement("span", {
      className: "text-emerald-700/70 group-open:rotate-180 transition-transform motion-reduce:transition-none",
      "aria-hidden": "true"
    }, "▾")), /*#__PURE__*/React.createElement("div", {
      className: "px-3 pb-3 pt-1 text-sm text-slate-700"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-end mb-1.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-jigsaw-chunk-listen": cIdx,
      onClick: function () {
        var chunkTitle = activityDisplayText(chunk.label || (t('brainstorm.expert_group') || 'Expert group') + ' ' + (cIdx + 1));
        var spoken = [chunkTitle, activityDisplayText(chunk.expertPacket || '')].concat(keyPoints.map(activityDisplayText)).filter(Boolean).join('. ');
        _brainstormSpeakText(spoken);
      },
      "aria-label": activityT(t, 'brainstorm.listen_packet', 'Listen to packet') + ': ' + activityDisplayText(chunk.label || (t('brainstorm.expert_group') || 'Expert group') + ' ' + (cIdx + 1)),
      className: "no-print min-h-11 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "🔊"), /*#__PURE__*/React.createElement("span", null, activityT(t, 'brainstorm.listen_packet', 'Listen to packet')))), /*#__PURE__*/React.createElement("div", {
      className: "prose prose-sm max-w-none mb-2"
    }, renderFormattedText(chunk.expertPacket || '')), keyPoints.length ? /*#__PURE__*/React.createElement("div", {
      className: "bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 mb-2"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "block text-xs uppercase tracking-wider text-emerald-900 mb-1"
    }, t('brainstorm.teach_back_points') || 'When you teach your group, cover:'), /*#__PURE__*/React.createElement("ul", {
      className: "list-disc ml-4 text-xs space-y-0.5"
    }, keyPoints.map(function (p, pIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: pIdx
      }, activityDisplayText(p));
    }))) : null, checkQs.length ? /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "block uppercase tracking-wider text-xs mb-1"
    }, t('brainstorm.teach_back_questions') || 'Check your group understood:'), /*#__PURE__*/React.createElement("ol", {
      className: "list-decimal ml-4 space-y-0.5"
    }, checkQs.map(function (q, qIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: qIdx
      }, activityDisplayText(q));
    }))) : null));
  }), item.homeGroupTask ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
  }, t('brainstorm.home_group_task') || 'Home-group task'), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none text-sm text-slate-700"
  }, renderFormattedText(item.homeGroupTask))) : null, item.synthesisOrganizer ? /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
  }, t('brainstorm.synthesis_organizer') || 'Putting it together'), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none text-sm text-slate-700"
  }, renderFormattedText(item.synthesisOrganizer))) : null, checks.length ? /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600"
  }, t('brainstorm.accountability_check') || 'Show what you learned (everyone answers)'), answering ? (() => {
    var checksDone = checks.filter(function (c) {
      return String(props.answers && props.answers[activityResponseKey(item, 'check', c && c.q)] || '').trim().length > 0;
    }).length;
    return /*#__PURE__*/React.createElement("span", {
      "data-activity-progress": true,
      className: `text-xs font-bold rounded-full border px-2.5 py-0.5 ${checksDone === checks.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-white text-indigo-800 border-indigo-200'}`
    }, checksDone === checks.length ? '✓ ' + activityT(t, 'brainstorm.all_answered', 'All {total} answered', {
      total: checks.length
    }) : activityT(t, 'brainstorm.answered_progress', '{done} / {total} answered', {
      done: checksDone,
      total: checks.length
    }));
  })() : null), answering ? /*#__PURE__*/React.createElement(ActivityAnswersNote, {
    t: t,
    studentWorkStatus: props.studentWorkStatus,
    onRetrySave: props.onRetrySave
  }) : null, /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal ml-5 text-sm text-slate-700 space-y-1"
  }, checks.map(function (c, aIdx) {
    return /*#__PURE__*/React.createElement("li", {
      key: aIdx
    }, activityDisplayText(c && c.q), answering ? /*#__PURE__*/React.createElement(ActivityResponseField, {
      t: t,
      answers: props.answers,
      onAnswer: props.onAnswer,
      responseKey: activityResponseKey(item, 'check', c && c.q),
      question: activityDisplayText(c && c.q)
    }) : null);
  })), isTeacherMode ? /*#__PURE__*/React.createElement("details", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer list-none inline-flex min-h-11 items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 14,
    "aria-hidden": "true"
  }), " ", t('brainstorm.answer_key') || 'Answer key (teacher only)'), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal ml-5 text-xs text-slate-600 mt-2 space-y-1"
  }, checks.map(function (c, aIdx) {
    return /*#__PURE__*/React.createElement("li", {
      key: aIdx
    }, activityDisplayText(c && c.answer));
  }))) : null) : null);
}
function _brainstormAiDoor(kind, t) {
  try {
    if (typeof window !== 'undefined' && typeof window.__alloAiSetupDoorway === 'function') {
      return window.__alloAiSetupDoorway(kind, t);
    }
    if (typeof window !== 'undefined') {
      if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true) {
        return {
          disabled: true,
          available: false,
          title: typeof t === 'function' && t('ai.setup_required') || 'AI is currently unavailable'
        };
      }
      if (typeof window.__alloAiUsable === 'function' && window.__alloAiUsable(kind === 'images' ? 'images' : 'text') === false) {
        return {
          disabled: true,
          available: false,
          title: typeof t === 'function' && t('ai.setup_required') || 'Set up AI to use this feature'
        };
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}
function BrainstormView(props) {
  ensureBrainstormPolishCss();
  var t = typeof props.t === 'function' ? props.t : function () {
    return '';
  };
  var _bionicHookRef = React.useRef(typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function' ? window.__alloUseBionic : function () {
    return false;
  });
  var _bionicSub = _bionicHookRef.current();
  void _bionicSub;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var textAiDoor = isTeacherMode ? _brainstormAiDoor('text', t) : null;
  var imageAiDoor = isTeacherMode ? _brainstormAiDoor('images', t) : null;
  var isEditingBrainstorm = props.isEditingBrainstorm;
  var isGeneratingGuide = props.isGeneratingGuide || {};
  var isGeneratingBrainstormRubric = props.isGeneratingBrainstormRubric || {};
  var isGeneratingWorksheet = props.isGeneratingWorksheet || {};
  var isGeneratingWorksheetCover = props.isGeneratingWorksheetCover || {};
  var handleToggleIsEditingBrainstorm = props.handleToggleIsEditingBrainstorm;
  var handleBrainstormChange = props.handleBrainstormChange;
  var handleGenerateGuide = props.handleGenerateGuide;
  var handleGenerateBrainstormRubric = props.handleGenerateBrainstormRubric;
  var handleGenerateWorksheet = props.handleGenerateWorksheet;
  var handleGenerateWorksheetCover = props.handleGenerateWorksheetCover;
  var handleOpenActivityInStudio = props.handleOpenActivityInStudio;
  var getRows = typeof props.getRows === 'function' ? props.getRows : function () {
    return 3;
  };
  var renderFormattedText = typeof props.renderFormattedText === 'function' ? props.renderFormattedText : function (v) {
    return v == null ? '' : String(v);
  };
  var resourceId = generatedContent && generatedContent.id;
  React.useEffect(function () {
    return function () {
      _brainstormStopSpeech();
    };
  }, [resourceId]);
  var handleStudentInput = props.handleStudentInput;
  var learnerAnswers = !isTeacherMode && resourceId != null && typeof handleStudentInput === 'function' ? _bsOwn(props.studentResponses, resourceId) || {} : null;
  var onAnswer = learnerAnswers ? function (key, value) {
    handleStudentInput(resourceId, key, value);
  } : null;
  var items = Array.isArray(generatedContent?.data) ? generatedContent.data : [];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6",
    "data-help-key": "brainstorm_panel"
  }, isTeacherMode && (textAiDoor?.disabled || imageAiDoor?.disabled) && typeof window !== 'undefined' && window.AlloAiSetupNotice ? React.createElement(window.AlloAiSetupNotice, {
    t,
    kind: textAiDoor?.disabled ? 'text' : 'images'
  }) : null, isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6 flex justify-between items-center gap-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-yellow-900 flex-grow"
  }, /*#__PURE__*/React.createElement("strong", null, t('brainstorm.udl_goal_label') || 'UDL Goal:'), " ", t('brainstorm.udl_goal_body') || 'Providing options for engagement. Connecting concepts to student lives and physical activities increases relevance and motivation.'), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": !!isEditingBrainstorm,
    onClick: handleToggleIsEditingBrainstorm,
    className: `min-h-11 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${isEditingBrainstorm ? 'bg-yellow-700 text-white hover:bg-yellow-800' : 'bg-white text-yellow-800 border border-yellow-300 hover:bg-yellow-50'}`
  }, isEditingBrainstorm ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14,
    "aria-hidden": "true"
  }), isEditingBrainstorm ? t('common.done_editing') || 'Done Editing' : t('brainstorm.edit') || 'Edit Activities'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-6"
  }, items.length === 0 ? /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-sm text-slate-600 bg-slate-50 border border-slate-300 rounded-lg p-4"
  }, t('brainstorm.empty') || 'No activities available yet.') : items.map((idea, idx) => !idea || typeof idea !== 'object' ? null : /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow motion-reduce:transition-none",
    "data-help-key": "brainstorm_card"
  }, isTeacherMode && isEditingBrainstorm && ['discussion', 'jigsaw'].includes(idea.kind) ? /*#__PURE__*/React.createElement(ActivityStructuredEditor, {
    item: idea,
    t: t,
    onChange: (field, value) => handleBrainstormChange(idx, field, value)
  }) : idea.kind === 'discussion' ? /*#__PURE__*/React.createElement(DiscussionKitBody, {
    item: idea,
    t: t,
    isTeacherMode: isTeacherMode,
    renderFormattedText: renderFormattedText,
    answers: learnerAnswers,
    onAnswer: onAnswer,
    announceToSR: props.announceToSR,
    studentWorkStatus: props.studentWorkStatus,
    onRetrySave: props.onRetrySave
  }) : idea.kind === 'jigsaw' ? /*#__PURE__*/React.createElement(JigsawBody, {
    item: idea,
    t: t,
    isTeacherMode: isTeacherMode,
    renderFormattedText: renderFormattedText,
    answers: learnerAnswers,
    onAnswer: onAnswer,
    studentWorkStatus: props.studentWorkStatus,
    onRetrySave: props.onRetrySave
  }) : isEditingBrainstorm ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 18,
    className: "text-yellow-500 fill-current shrink-0",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_idea'),
    type: "text",
    value: idea.title || '',
    onChange: e => handleBrainstormChange(idx, 'title', e.target.value),
    className: "w-full min-h-11 font-bold text-lg text-indigo-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded px-2 py-1 transition-all motion-reduce:transition-none",
    placeholder: t('brainstorm.placeholder_title'),
    readOnly: !isTeacherMode
  })), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_description') || 'Edit idea description',
    value: idea.description || '',
    onChange: e => handleBrainstormChange(idx, 'description', e.target.value),
    className: "w-full text-slate-700 mb-4 text-sm leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded px-2 py-1 resize-none transition-all motion-reduce:transition-none",
    rows: getRows(idea.description),
    placeholder: t('brainstorm.placeholder_desc'),
    readOnly: !isTeacherMode
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-3 rounded-lg text-xs text-indigo-800 font-medium border border-indigo-100 mb-4"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block mb-1"
  }, t('brainstorm.label_connection'), ":"), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_connection') || 'Edit topic connection',
    value: idea.connection || '',
    onChange: e => handleBrainstormChange(idx, 'connection', e.target.value),
    className: "w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-600 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded px-1 resize-none transition-all motion-reduce:transition-none",
    rows: getRows(idea.connection),
    placeholder: t('brainstorm.placeholder_connection'),
    readOnly: !isTeacherMode
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg text-indigo-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 18,
    className: "text-yellow-500 fill-current shrink-0",
    "aria-hidden": "true"
  }), " ", activityDisplayText(idea.title)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-brainstorm-listen": idx,
    onClick: () => _brainstormSpeakText([activityDisplayText(idea.title), activityDisplayText(idea.description), activityDisplayText(idea.connection)].filter(Boolean).join('. ')),
    "aria-label": (t('common.listen') || 'Listen') + ': ' + activityDisplayText(idea.title),
    title: t('a11y.read_aloud') || 'Listen',
    className: "no-print min-h-11 shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔊"), /*#__PURE__*/React.createElement("span", null, t('common.listen') || 'Listen'))), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 mb-4 text-sm leading-relaxed whitespace-pre-line"
  }, activityDisplayText(idea.description)), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-3 rounded-lg text-xs text-indigo-800 font-medium border border-indigo-100 mb-4"
  }, /*#__PURE__*/React.createElement("strong", null, t('brainstorm.label_connection'), ":"), " ", activityDisplayText(idea.connection))), isTeacherMode && /*#__PURE__*/React.createElement(ActivityArtifactSummary, {
    item: idea,
    t: t,
    onChangeDerivatives: typeof handleBrainstormChange === 'function' ? value => handleBrainstormChange(idx, 'derivatives', value) : null
  }), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-3"
  }, idea.guide ? /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-400",
    "data-help-key": "brainstorm_guide"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-slate-800 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('brainstorm.teacher_guide') || 'Teacher Guide'), isEditingBrainstorm ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_guide') || 'Edit teacher guide',
    value: idea.guide || '',
    onChange: e => handleBrainstormChange(idx, 'guide', e.target.value),
    className: "w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded px-3 py-2 resize-y transition-all motion-reduce:transition-none font-mono text-xs leading-relaxed",
    rows: Math.max(8, getRows(idea.guide)),
    placeholder: t('brainstorm.placeholder_guide') || 'Step-by-step teacher guide (markdown supported)…',
    readOnly: !isTeacherMode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(idea.guide))) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleGenerateGuide(idx),
    disabled: isGeneratingGuide[idx] || !!textAiDoor?.disabled,
    "aria-busy": !!isGeneratingGuide[idx],
    title: textAiDoor?.title || undefined,
    className: "min-h-11 flex items-center gap-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 px-4 py-1.5 rounded-full transition-colors motion-reduce:transition-none border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, isGeneratingGuide[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 14,
    "aria-hidden": "true"
  }), isGeneratingGuide[idx] ? t('brainstorm.creating_guide') || 'Creating guide…' : t('brainstorm.generate_guide') || 'Generate Teacher Guide'), idea.guide && (idea.worksheet ? /*#__PURE__*/React.createElement("details", {
    className: "mt-3 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 cursor-pointer list-none transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement(FileText, {
    size: 14,
    "aria-hidden": "true"
  }), t('brainstorm.student_worksheet') || 'Student Worksheet', /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700/70 ml-0.5 group-open:rotate-180 transition-transform motion-reduce:transition-none",
    "aria-hidden": "true"
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 bg-emerald-50/40 rounded-lg p-4 text-sm text-slate-700 border border-emerald-200",
    "data-help-key": "brainstorm_worksheet"
  }, _bsSafeCoverUrl(idea.coverImage) && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex justify-center"
  }, /*#__PURE__*/React.createElement("img", {
    src: _bsSafeCoverUrl(idea.coverImage),
    alt: t('brainstorm.cover_alt', {
      title: activityDisplayText(idea.title)
    }) || 'Illustration for ' + activityDisplayText(idea.title),
    className: "max-h-40 rounded-lg border border-emerald-200 bg-white shadow-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex justify-end gap-2 flex-wrap"
  }, isTeacherMode && typeof handleOpenActivityInStudio === 'function' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleOpenActivityInStudio(idx),
    className: "min-h-11 text-xs font-bold text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none border border-indigo-200 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    title: t('brainstorm.page_designer_tip') || 'Open this worksheet as editable Page Designer objects'
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 11,
    "aria-hidden": "true"
  }), " ", t('brainstorm.edit_in_page_designer') || 'Edit in Page Designer') : null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleGenerateWorksheetCover(idx),
    disabled: isGeneratingWorksheetCover[idx] || !!imageAiDoor?.disabled,
    "aria-busy": !!isGeneratingWorksheetCover[idx],
    className: "min-h-11 text-xs font-bold text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    title: imageAiDoor?.title || (idea.coverImage ? t('brainstorm.regenerate_cover') || 'Regenerate cover image' : t('brainstorm.generate_cover_tip') || 'Optional: add a cover illustration to this worksheet')
  }, isGeneratingWorksheetCover[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 11,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 11,
    "aria-hidden": "true"
  }), isGeneratingWorksheetCover[idx] ? t('brainstorm.creating_cover') || 'Creating cover…' : idea.coverImage ? t('brainstorm.regenerate_cover') || 'Regenerate cover' : t('brainstorm.generate_cover') || 'Add cover image')), isEditingBrainstorm ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_worksheet') || 'Edit student worksheet',
    value: idea.worksheet || '',
    onChange: e => handleBrainstormChange(idx, 'worksheet', e.target.value),
    className: "w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-3 py-2 resize-y transition-all motion-reduce:transition-none font-mono text-xs leading-relaxed",
    rows: Math.max(10, getRows(idea.worksheet)),
    placeholder: t('brainstorm.placeholder_worksheet') || 'Student worksheet (markdown)…',
    readOnly: !isTeacherMode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(idea.worksheet)))) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('brainstorm.generate_worksheet') || 'Generate student worksheet',
    onClick: () => handleGenerateWorksheet(idx),
    disabled: isGeneratingWorksheet[idx] || !!textAiDoor?.disabled,
    "aria-busy": !!isGeneratingWorksheet[idx],
    title: textAiDoor?.title || undefined,
    className: "mt-3 min-h-11 flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-4 py-1.5 rounded-full transition-colors motion-reduce:transition-none border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, isGeneratingWorksheet[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(FileText, {
    size: 14,
    "aria-hidden": "true"
  }), isGeneratingWorksheet[idx] ? t('brainstorm.creating_worksheet') || 'Creating worksheet…' : t('brainstorm.generate_worksheet') || 'Generate Student Worksheet')), idea.rubric && Array.isArray(idea.rubric.criteria) && idea.rubric.criteria.length ? /*#__PURE__*/React.createElement("details", {
    className: "mt-3 group",
    open: isEditingBrainstorm || undefined
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-4 py-1.5 rounded-full border border-violet-200 cursor-pointer list-none transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 14,
    "aria-hidden": "true"
  }), activityDisplayText(idea.rubric.title) || t('brainstorm.activity_rubric_title') || 'Activity Rubric', /*#__PURE__*/React.createElement("span", {
    className: "text-violet-700/70 ml-0.5 group-open:rotate-180 transition-transform motion-reduce:transition-none",
    "aria-hidden": "true"
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 overflow-x-auto rounded-lg border border-violet-200",
    "data-help-key": "brainstorm_rubric"
  }, isTeacherMode && isEditingBrainstorm && typeof handleBrainstormChange === 'function' ? /*#__PURE__*/React.createElement("div", {
    className: "p-3 bg-violet-50/40 space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-violet-900"
  }, t('brainstorm.rubric_title_label') || 'Rubric title', /*#__PURE__*/React.createElement("input", {
    type: "text",
    "data-brainstorm-rubric-title": idx,
    value: typeof idea.rubric.title === 'string' ? idea.rubric.title : '',
    onChange: e => handleBrainstormChange(idx, 'rubric', {
      ...idea.rubric,
      title: e.target.value
    }),
    className: "mt-1 block w-full min-h-11 rounded border border-violet-300 bg-white px-2.5 py-2 text-xs font-normal text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  })), idea.rubric.criteria.map((rawCriterion, criterionIndex) => {
    const criterion = rawCriterion && typeof rawCriterion === 'object' ? rawCriterion : {};
    const updateCriterion = patchObj => {
      const nextCriteria = idea.rubric.criteria.map((c, ci) => ci === criterionIndex ? {
        ...(c && typeof c === 'object' ? c : {}),
        ...patchObj
      } : c);
      handleBrainstormChange(idx, 'rubric', {
        ...idea.rubric,
        criteria: nextCriteria
      });
    };
    const updateLevel = (lvl, val) => {
      updateCriterion({
        levels: {
          ...(criterion.levels || {}),
          [lvl]: val
        }
      });
    };
    return /*#__PURE__*/React.createElement("div", {
      key: criterionIndex,
      className: "rounded-lg border border-violet-200 bg-white p-2.5 space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      "aria-label": `${t('brainstorm.rubric_criterion') || 'Criterion'} ${criterionIndex + 1} ${t('common.name') || 'name'}`,
      value: typeof criterion.criterion === 'string' ? criterion.criterion : '',
      onChange: e => updateCriterion({
        criterion: e.target.value
      }),
      placeholder: t('brainstorm.rubric_criterion') || 'Criterion',
      className: "flex-1 min-w-0 min-h-11 rounded border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      max: "100",
      "aria-label": `${t('brainstorm.rubric_criterion') || 'Criterion'} ${criterionIndex + 1} ${t('brainstorm.rubric_weight_percent') || 'weight percent'}`,
      value: criterion.weight == null ? '' : criterion.weight,
      onChange: e => {
        if (e.target.value === '') {
          updateCriterion({
            weight: ''
          });
          return;
        }
        const n = Number(e.target.value);
        if (Number.isFinite(n)) updateCriterion({
          weight: Math.max(0, Math.min(100, n))
        });
      },
      placeholder: "%",
      className: "w-20 min-h-11 rounded border border-slate-300 px-2 py-2 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }), idea.rubric.criteria.length > 1 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleBrainstormChange(idx, 'rubric', {
        ...idea.rubric,
        criteria: idea.rubric.criteria.filter((_, ci) => ci !== criterionIndex)
      }),
      "aria-label": `${t('brainstorm.remove_criterion') || 'Remove criterion'} ${criterionIndex + 1}`,
      className: "inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, "×")), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
    }, [['4', '4 - Exceeds'], ['3', '3 - Meets'], ['2', '2 - Developing'], ['1', '1 - Beginning']].map(([lvl, lvlLabel]) => /*#__PURE__*/React.createElement("label", {
      key: lvl,
      className: "block text-xs font-bold text-slate-700"
    }, lvlLabel, /*#__PURE__*/React.createElement("textarea", {
      rows: 2,
      value: typeof (criterion.levels && criterion.levels[lvl]) === 'string' ? criterion.levels[lvl] : '',
      onChange: e => updateLevel(lvl, e.target.value),
      className: "mt-0.5 block w-full min-h-11 rounded border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-800 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    })))));
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleBrainstormChange(idx, 'rubric', {
      ...idea.rubric,
      criteria: idea.rubric.criteria.concat([{
        criterion: 'New Criterion',
        weight: 25,
        levels: {
          '4': '',
          '3': '',
          '2': '',
          '1': ''
        }
      }])
    }),
    className: "inline-flex min-h-11 items-center gap-1 rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs font-bold text-violet-800 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "+ Add criterion")) : /*#__PURE__*/React.createElement("table", {
    className: "min-w-[760px] w-full text-xs text-left text-slate-700"
  }, /*#__PURE__*/React.createElement("caption", {
    className: "sr-only"
  }, activityDisplayText(idea.rubric.title) || t('brainstorm.rubric_caption') || 'Activity rubric with four performance levels'), /*#__PURE__*/React.createElement("thead", {
    className: "bg-violet-50 text-violet-950"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, t('brainstorm.rubric_criterion') || 'Criterion'), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2 w-16"
  }, t('brainstorm.rubric_weight') || 'Weight'), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, t('brainstorm.rubric_level_4') || '4 - Exceeds'), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, t('brainstorm.rubric_level_3') || '3 - Meets'), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, t('brainstorm.rubric_level_2') || '2 - Developing'), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, t('brainstorm.rubric_level_1') || '1 - Beginning'))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-violet-100 bg-white"
  }, idea.rubric.criteria.filter(Boolean).map((criterion, criterionIndex) => /*#__PURE__*/React.createElement("tr", {
    key: criterionIndex,
    className: "align-top"
  }, /*#__PURE__*/React.createElement("th", {
    scope: "row",
    className: "p-2 font-semibold text-slate-900"
  }, activityDisplayText(criterion.criterion)), /*#__PURE__*/React.createElement("td", {
    className: "p-2"
  }, Number.isFinite(Number(criterion.weight)) ? `${criterion.weight}%` : '--'), /*#__PURE__*/React.createElement("td", {
    className: "p-2 whitespace-pre-line"
  }, activityDisplayText(criterion.levels && criterion.levels['4'])), /*#__PURE__*/React.createElement("td", {
    className: "p-2 whitespace-pre-line"
  }, activityDisplayText(criterion.levels && criterion.levels['3'])), /*#__PURE__*/React.createElement("td", {
    className: "p-2 whitespace-pre-line"
  }, activityDisplayText(criterion.levels && criterion.levels['2'])), /*#__PURE__*/React.createElement("td", {
    className: "p-2 whitespace-pre-line"
  }, activityDisplayText(criterion.levels && criterion.levels['1'])))))))) : isTeacherMode ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('brainstorm.generate_rubric_aria') || 'Generate activity rubric',
    onClick: () => handleGenerateBrainstormRubric(idx),
    disabled: isGeneratingBrainstormRubric[idx] || !!textAiDoor?.disabled,
    "aria-busy": !!isGeneratingBrainstormRubric[idx],
    title: textAiDoor?.title || undefined,
    className: "min-h-11 flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-4 py-1.5 rounded-full transition-colors motion-reduce:transition-none border border-violet-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, isGeneratingBrainstormRubric[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 14,
    "aria-hidden": "true"
  }), isGeneratingBrainstormRubric[idx] ? t('brainstorm.creating_rubric') || 'Creating rubric...' : t('brainstorm.generate_rubric') || 'Generate Activity Rubric'), isEditingBrainstorm && typeof handleBrainstormChange === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-brainstorm-blank-rubric": idx,
    onClick: () => handleBrainstormChange(idx, 'rubric', {
      title: idea.title ? idea.title + ' Rubric' : 'Activity Rubric',
      criteria: [{
        criterion: 'Understanding & Evidence',
        weight: 50,
        levels: {
          '4': '',
          '3': '',
          '2': '',
          '1': ''
        }
      }, {
        criterion: 'Communication & Collaboration',
        weight: 50,
        levels: {
          '4': '',
          '3': '',
          '2': '',
          '1': ''
        }
      }]
    }),
    className: "min-h-11 flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full border border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "+ Start blank rubric")) : null, isTeacherMode && isEditingBrainstorm && items.length > 1 && typeof handleBrainstormChange === 'function' && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-slate-100 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-brainstorm-remove-card": idx,
    onClick: () => handleBrainstormChange(idx, 'remove-card'),
    className: "inline-flex min-h-11 items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "Remove activity card")))))), isTeacherMode && isEditingBrainstorm && typeof handleBrainstormChange === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-brainstorm-add-card": "true",
    onClick: () => handleBrainstormChange(null, 'add-card'),
    className: "w-full min-h-11 py-3 border-2 border-dashed border-amber-300 rounded-xl text-amber-900 font-bold text-xs hover:bg-amber-50 transition-colors motion-reduce:transition-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "+ Add activity card"));
}
BrainstormView.projectStudentActivityResource = projectStudentActivityResource;
BrainstormView.activityResponseKey = activityResponseKey;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.BrainstormView = BrainstormView;
  window.AlloModules.ViewBrainstormModule = true;
})();
