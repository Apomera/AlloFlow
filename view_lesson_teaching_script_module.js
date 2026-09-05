/** Teacher-only teaching script attached to an existing lesson plan. */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.LessonTeachingScriptView) return;
  var React = window.React;
  if (!React) throw new Error('[LessonTeachingScriptView] React is required');
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Teacher-only, lesson-aware teaching script attached to a saved lesson plan. Generation and persistence belong to the host.
const _LTS_GRADES = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College', 'Graduate Level'];
const _LTS_SUBJECTS = [['mathematics', 'Mathematics'], ['reading', 'Reading and literacy'], ['writing', 'Writing'], ['science', 'Science'], ['social-studies', 'Social studies and history'], ['world-languages', 'World languages'], ['arts', 'Arts and music'], ['health-pe', 'Health and physical education'], ['technology', 'Technology and computer science'], ['other', 'Other or interdisciplinary']];
const _LTS_SCOPES = {
  segment: {
    minSteps: 3,
    maxSteps: 8,
    minMinutes: 5,
    maxMinutes: 60,
    maxStepMinutes: 30
  },
  lesson: {
    minSteps: 4,
    maxSteps: 24,
    minMinutes: 15,
    maxMinutes: 240,
    maxStepMinutes: 60
  }
};
const _LTS_PHASES = {
  hook: 'Hook',
  directInstruction: 'Direct instruction',
  guidedPractice: 'Guided practice',
  independentPractice: 'Independent practice',
  closure: 'Closure'
};
function _ltsText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') return _ltsText(value.en || value.text || value.title);
  return '';
}
function _ltsSafeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) {
    return '';
  }
}
function _ltsGradeLabel(value) {
  // Pilot versions stored a bare number; show it in the app's grade vocabulary.
  const n = typeof value === 'number' ? value : /^\d{1,2}$/.test(String(value || '').trim()) ? Number(value) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n + ({
    1: 'st',
    2: 'nd',
    3: 'rd'
  }[n % 10] && !(n >= 11 && n <= 13) ? {
    1: 'st',
    2: 'nd',
    3: 'rd'
  }[n % 10] : 'th') + ' Grade';
  return _ltsText(value);
}
function _ltsRules(version) {
  if (!version) return _LTS_SCOPES.segment;
  if (version.schemaVersion === 1) return {
    minSteps: 3,
    maxSteps: 6,
    maxStepMinutes: 20
  };
  return _LTS_SCOPES[version.scope === 'lesson' ? 'lesson' : 'segment'];
}
function LessonTeachingScriptView(props) {
  if (!props.isTeacherMode || props.isParentMode || props.isIndependentMode || !props.generatedContent?.id || props.generatedContent.type !== 'lesson-plan') return null;
  return /*#__PURE__*/React.createElement(LessonTeachingScriptPanel, _extends({
    key: String(props.generatedContent.id)
  }, props));
}
function LessonTeachingScriptPanel(props) {
  const {
    generatedContent: plan,
    history = [],
    capabilities = {},
    defaultSettings = {},
    scriptRun = {},
    onGenerateTeachingScript,
    onCancelTeachingScript,
    onUpdateTeachingScript,
    onOpenTeachingMaterial
  } = props;
  const tr = (key, fallback) => {
    const value = props.t?.('lesson_script.' + key);
    return value && value !== 'lesson_script.' + key ? value : fallback;
  };
  const id = React.useId();
  const planId = String(plan.id);
  const versions = Array.isArray(plan.data?.teachingScripts) ? plan.data.teachingScripts.filter(version => version && version.id && Array.isArray(version.steps)) : [];
  const materials = (Array.isArray(history) ? history : []).filter(item => item && item.id != null && String(item.id) !== planId);
  const gradeOptions = Array.isArray(defaultSettings.gradeOptions) && defaultSettings.gradeOptions.length ? defaultSettings.gradeOptions.map(_ltsText) : _LTS_GRADES;
  const subjectOptions = Array.isArray(defaultSettings.subjectOptions) && defaultSettings.subjectOptions.length ? defaultSettings.subjectOptions.map(item => [String(item.id), _ltsText(item.label)]) : _LTS_SUBJECTS;
  const scopes = defaultSettings.scopes && defaultSettings.scopes.segment && defaultSettings.scopes.lesson ? defaultSettings.scopes : _LTS_SCOPES;
  const initialGrade = _ltsText(defaultSettings.grade);
  const suggested = defaultSettings.suggestedDuration || {};
  const [expanded, setExpanded] = React.useState(false);
  const [goal, setGoal] = React.useState(() => (_ltsText(plan.data?.essentialQuestion) || (Array.isArray(plan.data?.objectives) ? plan.data.objectives.map(_ltsText).filter(Boolean).join('; ') : '')).slice(0, 1200));
  const [grade, setGrade] = React.useState(initialGrade);
  const [subject, setSubject] = React.useState(() => subjectOptions.some(([value]) => value === defaultSettings.subject) ? defaultSettings.subject : 'other');
  const [topic, setTopic] = React.useState(() => _ltsText(defaultSettings.topic).slice(0, 200));
  const [scope, setScope] = React.useState('segment');
  const [durationMinutes, setDurationMinutes] = React.useState(() => Number(suggested.segment) || 15);
  const [priorKnowledge, setPriorKnowledge] = React.useState('');
  const [standard, setStandard] = React.useState(_ltsText(defaultSettings.standard));
  const [researchEnabled, setResearchEnabled] = React.useState(true);
  const [materialIds, setMaterialIds] = React.useState(() => materials.slice(0, 3).map(item => String(item.id)));
  const [selectedId, setSelectedId] = React.useState(() => String(versions[versions.length - 1]?.id || ''));
  const [draft, setDraft] = React.useState(null);
  const [draftBase, setDraftBase] = React.useState('');
  const [localBusy, setLocalBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const mounted = React.useRef(true);
  const requestOwner = React.useRef(0);
  const generatingRequest = React.useRef(false);
  const savingRequest = React.useRef(false);
  const downloads = React.useRef(new Map());
  const previousVersions = React.useRef(versions.map(version => String(version.id)));
  const version = versions.find(item => String(item.id) === selectedId) || versions[versions.length - 1] || null;
  const hostRun = String(scriptRun.planId || '') === planId ? scriptRun : {};
  const busy = !!hostRun.busy || localBusy;
  const error = localError || _ltsText(hostRun.error?.message || hostRun.error);
  const canGenerate = capabilities.canGenerate === true && typeof onGenerateTeachingScript === 'function';
  const canResearch = capabilities.canResearch === true;
  const rules = scopes[scope] || _LTS_SCOPES.segment;
  const durationValid = Number.isInteger(Number(durationMinutes)) && Number(durationMinutes) >= rules.minMinutes && Number(durationMinutes) <= rules.maxMinutes;
  const sourceSteps = version?.steps || [];
  const steps = draft || sourceSteps;
  const versionRules = _ltsRules(version);
  const timings = steps.reduce((sum, step) => sum + Number(step.minutes || 0), 0);
  const invalidTiming = !!draft && (draft.some(step => !Number.isInteger(Number(step.minutes)) || Number(step.minutes) < 1 || Number(step.minutes) > versionRules.maxStepMinutes) || timings !== Number(version?.durationMinutes));
  const invalidDraftText = !!draft && draft.some(step => _ltsText(step.title).trim().length < 2 || ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady'].some(key => _ltsText(step[key]).trim().length < (key === 'teacherSays' ? 60 : 12)));
  const staleDraft = !!draft && JSON.stringify(sourceSteps) !== draftBase;
  const selectedMaterials = materials.filter(item => materialIds.includes(String(item.id)));
  const sources = Array.isArray(version?.sources) ? version.sources : [];
  const recommendationById = new Map();
  sources.forEach(source => (Array.isArray(source.recommendations) ? source.recommendations : []).forEach(recommendation => recommendationById.set(String(recommendation.id), {
    source,
    recommendation
  })));
  const subjectLabel = value => (subjectOptions.find(([key]) => key === value) || [])[1] || _ltsText(value);
  const scopeLabel = item => item && item.schemaVersion !== 1 && item.scope === 'lesson' ? tr('scope_lesson', 'Whole lesson') : tr('scope_segment', 'Direct-instruction segment');
  const formReady = !!goal.trim() && !!grade && !!subject && (subject !== 'other' || !!topic.trim()) && durationValid && selectedMaterials.length > 0;
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestOwner.current += 1;
      downloads.current.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      downloads.current.clear();
    };
  }, []);
  const versionIds = versions.map(item => String(item.id)).join('|');
  React.useEffect(() => {
    const added = versions.filter(item => !previousVersions.current.includes(String(item.id)));
    previousVersions.current = versions.map(item => String(item.id));
    if (added.length && !draft) {
      setSelectedId(String(added[added.length - 1].id));
      setNotice(tr('added', 'Script added to this plan.'));
    }
  }, [versionIds]);
  const toggleMaterial = resourceId => setMaterialIds(previous => previous.includes(resourceId) ? previous.filter(item => item !== resourceId) : previous.concat(resourceId));
  const chooseScope = next => {
    if (next === scope) return;
    setScope(next);
    // Each scope has its own realistic default; the teacher can still edit the minutes afterwards.
    setDurationMinutes(Number(suggested[next]) || (next === 'lesson' ? 45 : 15));
  };
  const generate = async event => {
    event?.preventDefault();
    if (generatingRequest.current || busy || saving || draft || !canGenerate || researchEnabled && !canResearch || !formReady) return;
    const owner = ++requestOwner.current;
    generatingRequest.current = true;
    setLocalBusy(true);
    setLocalError('');
    setNotice('');
    try {
      const result = await onGenerateTeachingScript({
        goal: goal.trim(),
        grade,
        subject,
        topic: topic.trim(),
        scope,
        durationMinutes: Number(durationMinutes),
        priorKnowledge: priorKnowledge.trim(),
        researchEnabled,
        materialIds: selectedMaterials.map(item => item.id),
        language: _ltsText(defaultSettings.language) || 'English',
        standard: standard.trim()
      });
      if (result?.ok === false && mounted.current && owner === requestOwner.current) setLocalError(_ltsText(result.error?.message || result.error) || tr('generate_failed', 'The script could not be generated. Your lesson plan is still available.'));
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('generate_failed', 'The script could not be generated. Your lesson plan is still available.'));
    } finally {
      if (mounted.current && owner === requestOwner.current) {
        generatingRequest.current = false;
        setLocalBusy(false);
      }
    }
  };
  const cancel = () => {
    requestOwner.current += 1;
    generatingRequest.current = false;
    setLocalBusy(false);
    if (typeof onCancelTeachingScript === 'function') onCancelTeachingScript(plan.id);
    setNotice(tr('cancelled', 'Generation cancelled.'));
  };
  const edit = () => {
    if (!version || busy || saving) return;
    setDraft(JSON.parse(JSON.stringify(sourceSteps)));
    setDraftBase(JSON.stringify(sourceSteps));
    setLocalError('');
    setNotice('');
  };
  const updateStep = (index, key, value) => setDraft(previous => previous.map((step, offset) => offset === index ? {
    ...step,
    [key]: value
  } : step));
  const saveEdits = async () => {
    if (savingRequest.current || !draft || !version || saving || staleDraft || invalidTiming || invalidDraftText || typeof onUpdateTeachingScript !== 'function') return;
    const owner = ++requestOwner.current;
    savingRequest.current = true;
    setSaving(true);
    setLocalError('');
    setNotice('');
    try {
      const result = await onUpdateTeachingScript(plan.id, version.id, draft.map(step => ({
        ...step,
        minutes: Number(step.minutes)
      })));
      if (!mounted.current || owner !== requestOwner.current) return;
      if (result === false || result?.ok === false) {
        setLocalError(_ltsText(result?.error?.message || result?.error) || tr('save_failed', 'Edits could not be added to the plan. Your draft is still here.'));
        return;
      }
      setDraft(null);
      setDraftBase('');
      setNotice(tr('edits_added', 'Script edits added to this plan.'));
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('save_failed', 'Edits could not be added to the plan. Your draft is still here.'));
    } finally {
      if (mounted.current && owner === requestOwner.current) {
        savingRequest.current = false;
        setSaving(false);
      }
    }
  };
  const exportText = async kind => {
    const runtime = window.AlloModules?.LessonTeachingScript;
    if (!version || typeof runtime?.toPlainText !== 'function') {
      setLocalError(tr('export_unavailable', 'Text export is still loading. Please try again.'));
      return;
    }
    const exportVersion = draft ? {
      ...version,
      steps: draft
    } : version;
    try {
      const text = runtime.toPlainText(exportVersion);
      if (kind === 'copy') {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error(tr('copy_unavailable', 'Copy is unavailable here. Download the text instead.'));
        await navigator.clipboard.writeText(text);
        if (mounted.current) setNotice(tr('copied', 'Script text copied.'));
      } else {
        const url = URL.createObjectURL(new Blob([text], {
          type: 'text/plain;charset=utf-8'
        }));
        const timer = setTimeout(() => {
          URL.revokeObjectURL(url);
          downloads.current.delete(url);
        }, 1000);
        downloads.current.set(url, timer);
        const link = document.createElement('a');
        link.href = url;
        link.download = (_ltsText(version.title) || 'teaching-script').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100) + '.txt';
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
        setNotice(tr('downloaded', 'Script text downloaded.'));
      }
      if (mounted.current) setLocalError('');
    } catch (failure) {
      if (mounted.current) setLocalError(_ltsText(failure?.message) || tr('export_failed', 'The script could not be exported. Please try again.'));
    }
  };
  const fieldClass = 'w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:bg-slate-100';
  const buttonClass = 'min-h-11 rounded-lg border border-indigo-600 px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const stepFields = [['teacherSays', tr('teacher_says', 'Teacher says')], ['studentDoes', tr('student_does', 'Learners do')], ['checkQuestion', tr('check_question', 'Check for understanding')], ['possibleResponse', tr('possible_response', 'Possible learner response')], ['ifStruggling', tr('if_struggling', 'If learners need support (likely misconception)')], ['ifReady', tr('if_ready', 'If learners are ready to go further')]];
  const researchLabels = {
    off: tr('research_off', 'Research turned off'),
    disabled: tr('research_off', 'Research turned off'),
    unavailable: tr('research_unavailable_status', 'Live research unavailable'),
    curated: tr('research_curated', 'Curated teaching guidance'),
    fresh: tr('research_fresh', 'Research sources retrieved'),
    completed: tr('research_fresh', 'Research sources retrieved'),
    researched: tr('research_fresh', 'Research sources retrieved'),
    retrieved: tr('research_fresh', 'Research sources retrieved')
  };
  const phaseLabel = phase => phase && _LTS_PHASES[phase] ? tr('phase_' + phase, _LTS_PHASES[phase]) : '';
  const detectedNote = [defaultSettings.subjectDetected ? tr('context_subject_detected', 'Subject detected from the saved plan') : tr('context_subject_unknown', 'Subject could not be detected; choose it below'), defaultSettings.gradeSource === 'plan' ? tr('context_grade_plan', 'Grade from the saved plan') : tr('context_grade_missing', 'The saved plan has no grade; choose one below'), Array.isArray(defaultSettings.phases) && defaultSettings.phases.length ? tr('context_phases', 'Plan phases:') + ' ' + defaultSettings.phases.map(phaseLabel).filter(Boolean).join(', ') : ''].filter(Boolean);
  return /*#__PURE__*/React.createElement("section", {
    className: "rounded-xl border border-indigo-200 bg-white shadow-sm",
    "aria-labelledby": id + '-title',
    "data-teaching-script-plan": planId
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-5"
  }, /*#__PURE__*/React.createElement("h3", {
    id: id + '-title',
    className: "text-lg font-black text-indigo-950"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg",
    "aria-expanded": expanded,
    "aria-controls": id + '-panel',
    onClick: () => setExpanded(!expanded)
  }, /*#__PURE__*/React.createElement("span", null, tr('title', 'Teaching script')), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, expanded ? '−' : '+'))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('tagline', 'Word-for-word teacher wording for this lesson · any subject and grade · a teaching segment or the whole lesson'))), expanded && /*#__PURE__*/React.createElement("div", {
    id: id + '-panel',
    className: "space-y-5 border-t border-indigo-100 p-4 sm:p-5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('intro', 'Review the detected lesson context, then build a scripted teaching sequence from the resources you select. Each generated version is attached to this plan.')), /*#__PURE__*/React.createElement("form", {
    onSubmit: generate,
    className: "space-y-4 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-950",
    "data-teaching-context": true
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold"
  }, tr('context_title', 'Detected lesson context')), /*#__PURE__*/React.createElement("ul", {
    className: "mt-1 list-disc space-y-0.5 pl-5"
  }, detectedNote.map((line, index) => /*#__PURE__*/React.createElement("li", {
    key: index
  }, line)))), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-subject',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('subject', 'Subject area')), /*#__PURE__*/React.createElement("select", {
    id: id + '-subject',
    required: true,
    className: fieldClass,
    value: subject,
    disabled: busy || saving,
    onChange: event => setSubject(event.target.value)
  }, subjectOptions.map(([value, label]) => /*#__PURE__*/React.createElement("option", {
    key: value,
    value: value
  }, tr('subject_' + value.replace(/-/g, '_'), label))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-topic',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('topic', 'Lesson topic')), /*#__PURE__*/React.createElement("input", {
    id: id + '-topic',
    maxLength: 200,
    className: fieldClass,
    value: topic,
    disabled: busy || saving,
    required: subject === 'other',
    onChange: event => setTopic(event.target.value),
    placeholder: tr('topic_hint', 'For example: blending CVC words, photosynthesis, causes of the French Revolution')
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-goal',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('goal', 'Learning goal')), /*#__PURE__*/React.createElement("textarea", {
    id: id + '-goal',
    required: true,
    maxLength: 1200,
    rows: 2,
    className: fieldClass,
    value: goal,
    disabled: busy || saving,
    onChange: event => setGoal(event.target.value)
  })), /*#__PURE__*/React.createElement("fieldset", {
    className: "space-y-2",
    disabled: busy || saving
  }, /*#__PURE__*/React.createElement("legend", {
    className: "mb-1 text-sm font-bold text-slate-900"
  }, tr('scope', 'What to script')), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-2 sm:grid-cols-2"
  }, [['segment', tr('scope_segment', 'Direct-instruction segment'), tr('scope_segment_hint', 'One modelling or explanation segment inside this lesson.')], ['lesson', tr('scope_lesson', 'Whole lesson'), tr('scope_lesson_hint', 'Every phase of the saved plan, from hook to closure.')]].map(([value, label, hint]) => /*#__PURE__*/React.createElement("label", {
    key: value,
    className: 'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-2 ' + (scope === value ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300')
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: id + '-scope',
    className: "mt-1 h-4 w-4",
    value: value,
    checked: scope === value,
    onChange: () => chooseScope(value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-900"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, label), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-700"
  }, hint)))))), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-4 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-grade',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('grade', 'Grade or age group')), /*#__PURE__*/React.createElement("select", {
    id: id + '-grade',
    required: true,
    className: fieldClass,
    value: grade,
    disabled: busy || saving,
    onChange: event => setGrade(event.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, tr('choose_grade', 'Choose grade or age group')), (gradeOptions.includes(grade) || !grade ? gradeOptions : gradeOptions.concat(grade)).map(value => /*#__PURE__*/React.createElement("option", {
    key: value,
    value: value
  }, value)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-duration',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('duration', 'Teaching time'), " (", tr('minutes', 'minutes'), ")"), /*#__PURE__*/React.createElement("input", {
    id: id + '-duration',
    type: "number",
    inputMode: "numeric",
    min: rules.minMinutes,
    max: rules.maxMinutes,
    step: 1,
    required: true,
    className: fieldClass,
    value: durationMinutes,
    disabled: busy || saving,
    onChange: event => setDurationMinutes(event.target.value === '' ? '' : Number(event.target.value))
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tr('duration_hint', 'Whole minutes between'), " ", rules.minMinutes, " ", tr('and', 'and'), " ", rules.maxMinutes, "."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-prior',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('prior', 'Relevant prior learning')), /*#__PURE__*/React.createElement("textarea", {
    id: id + '-prior',
    maxLength: 2000,
    rows: 2,
    className: fieldClass,
    value: priorKnowledge,
    disabled: busy || saving,
    onChange: event => setPriorKnowledge(event.target.value),
    placeholder: tr('prior_hint', 'For example: learners can already name the parts, but confuse the two key terms.')
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-standard',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('standard', 'Target standard (optional)')), /*#__PURE__*/React.createElement("input", {
    id: id + '-standard',
    maxLength: 1000,
    className: fieldClass,
    value: standard,
    disabled: busy || saving,
    onChange: event => setStandard(event.target.value)
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tr('standard_hint', 'Your standard provides context for the script. Retrieved research is matched to the subject and grade, not verified against this standard.'))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('language', 'Script language:'), " ", _ltsText(defaultSettings.language) || 'English'), /*#__PURE__*/React.createElement("fieldset", {
    className: "space-y-2 rounded-lg border border-slate-300 p-3",
    disabled: busy || saving
  }, /*#__PURE__*/React.createElement("legend", {
    className: "px-1 text-sm font-bold text-slate-900"
  }, tr('materials', 'Use lesson resources')), materials.length ? materials.map((material, index) => /*#__PURE__*/React.createElement("label", {
    key: String(material.id),
    className: "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-indigo-50"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "mt-1 h-4 w-4",
    checked: materialIds.includes(String(material.id)),
    onChange: () => toggleMaterial(String(material.id))
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-800"
  }, _ltsText(material.title || material.data?.title) || tr('untitled_resource', 'Lesson resource') + ' ' + (index + 1), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, "(", _ltsText(material.type).replace(/-/g, ' '), ")")))) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600"
  }, tr('no_materials', 'No matching resources are available for this lesson. Add a relevant lesson resource before creating a script.'))), !selectedMaterials.length && materials.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-amber-950"
  }, tr('choose_material', 'Choose at least one lesson resource for the script.')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "flex min-h-11 items-center gap-3 text-sm font-bold text-slate-900"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "h-4 w-4",
    checked: researchEnabled,
    disabled: busy || saving,
    onChange: event => setResearchEnabled(event.target.checked)
  }), tr('research', 'Use research to inform teaching choices')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tr('research_hint', 'Public practice guides are matched to the subject, topic and grade above and read in full; if none can be verified, generation stops so you can decide.')), !canResearch && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('research_unavailable', 'Live research is unavailable here. Turn off research to generate from the lesson, or try again when research is available.'))), !canGenerate && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
  }, tr('ai_unavailable', 'Script generation needs an available AI connection. Saved versions remain available to read, edit and export.')), !!draft && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-900"
  }, tr('finish_edits', 'Save or discard your script edits before generating another version.')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tr('retention', 'The three most recent script versions are kept. Download a version to keep a separate copy.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: buttonClass + ' bg-indigo-50',
    disabled: !canGenerate || researchEnabled && !canResearch || busy || saving || !!draft || !formReady
  }, error ? tr('retry', 'Try generating again') : tr('generate', 'Generate script')), busy && typeof onCancelTeachingScript === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    onClick: cancel
  }, tr('cancel', 'Cancel generation')))), /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "text-sm font-bold text-indigo-950"
  }, busy ? _ltsText(hostRun.stage) || tr('generating', 'Preparing the teaching script…') : notice), error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"
  }, error), version && /*#__PURE__*/React.createElement("div", {
    className: "space-y-5 border-t border-slate-200 pt-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end gap-3 no-print"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full min-w-0 sm:w-auto sm:flex-1"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id + '-version',
    className: "mb-1 block text-sm font-bold text-slate-900"
  }, tr('version', 'Script version')), /*#__PURE__*/React.createElement("select", {
    id: id + '-version',
    className: fieldClass,
    value: String(version.id),
    disabled: !!draft || saving || busy,
    onChange: event => {
      setSelectedId(event.target.value);
      setNotice('');
      setLocalError('');
    }
  }, versions.map((item, index) => /*#__PURE__*/React.createElement("option", {
    key: item.id,
    value: String(item.id)
  }, tr('version_number', 'Version'), " ", index + 1, " · ", _ltsText(item.title) || tr('title', 'Teaching script'))))), !draft && typeof onUpdateTeachingScript === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: busy || saving,
    onClick: edit
  }, tr('edit', 'Edit script')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => exportText('copy')
  }, tr('copy', 'Copy text')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => exportText('download')
  }, tr('download', 'Download text'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-black text-slate-900"
  }, _ltsText(version.title) || tr('title', 'Teaching script')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, scopeLabel(version), " · ", version.durationMinutes, " ", tr('minutes', 'minutes'), version.inputSnapshot?.settings?.grade ? ' · ' + _ltsGradeLabel(version.inputSnapshot.settings.grade) : '', version.inputSnapshot?.settings?.subject ? ' · ' + subjectLabel(version.inputSnapshot.settings.subject) : '', " · ", researchLabels[version.researchStatus] || _ltsText(version.researchStatus).replace(/[-_]/g, ' ') || tr('research_unspecified', 'Research status not recorded')), version.createdAt && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, /*#__PURE__*/React.createElement("time", {
    dateTime: _ltsText(version.createdAt)
  }, _ltsText(version.createdAt).replace('T', ' ').replace(/\.\d+Z$/, ' UTC')))), Array.isArray(version.warnings) && version.warnings.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "list-disc space-y-1 rounded-lg bg-amber-50 py-3 pl-7 pr-3 text-sm text-amber-950"
  }, version.warnings.map((warning, index) => /*#__PURE__*/React.createElement("li", {
    key: index
  }, _ltsText(warning)))), /*#__PURE__*/React.createElement("ol", {
    className: "space-y-4"
  }, steps.map((step, index) => /*#__PURE__*/React.createElement("li", {
    key: step.id || index,
    className: "space-y-3 rounded-xl border border-slate-300 p-4",
    "data-teaching-step": step.id || index
  }, draft ? /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-[1fr_8rem]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold"
  }, tr('step_title', 'Step title'), " ", index + 1, /*#__PURE__*/React.createElement("input", {
    className: fieldClass + ' mt-1',
    value: step.title || '',
    maxLength: 240,
    disabled: saving,
    onChange: event => updateStep(index, 'title', event.target.value)
  })), /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold"
  }, tr('step_minutes', 'Minutes'), " ", index + 1, /*#__PURE__*/React.createElement("input", {
    className: fieldClass + ' mt-1',
    type: "number",
    min: 1,
    max: versionRules.maxStepMinutes,
    step: 1,
    value: step.minutes,
    disabled: saving,
    onChange: event => updateStep(index, 'minutes', event.target.value)
  }))) : /*#__PURE__*/React.createElement("h5", {
    className: "font-black text-indigo-950"
  }, index + 1, ". ", _ltsText(step.title), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal"
  }, "· ", step.minutes, " ", tr('minutes', 'minutes'), phaseLabel(step.phase) ? ' · ' + phaseLabel(step.phase) : '')), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-2"
  }, stepFields.map(([key, label]) => /*#__PURE__*/React.createElement("div", {
    key: key,
    className: key === 'teacherSays' ? 'sm:col-span-2' : ''
  }, draft ? /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-bold text-slate-900"
  }, label, " · ", index + 1, /*#__PURE__*/React.createElement("textarea", {
    className: fieldClass + ' mt-1',
    rows: 3,
    value: step[key] || '',
    maxLength: 5000,
    disabled: saving,
    onChange: event => updateStep(index, key, event.target.value)
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h6", {
    className: "text-xs font-black uppercase tracking-wide text-slate-600"
  }, label), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 whitespace-pre-wrap text-sm text-slate-900"
  }, _ltsText(step[key]) || '—'))))), Array.isArray(step.resourceIds) && step.resourceIds.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-700"
  }, tr('step_materials', 'Lesson resources:')), step.resourceIds.map(resourceId => {
    const material = materials.find(item => String(item.id) === String(resourceId));
    return material && typeof onOpenTeachingMaterial === 'function' ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: resourceId,
      className: buttonClass + ' no-print',
      disabled: !!draft || saving,
      onClick: () => onOpenTeachingMaterial(material.id)
    }, _ltsText(material.title || material.data?.title) || _ltsText(material.type)) : /*#__PURE__*/React.createElement("span", {
      key: resourceId,
      className: "text-sm text-slate-700"
    }, material ? _ltsText(material.title || material.data?.title) || _ltsText(material.type) : tr('missing_material', 'Resource no longer available in this lesson'));
  })), Array.isArray(step.recommendationIds) && step.recommendationIds.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950",
    "aria-label": tr('step_evidence', 'Teaching guidance used in this step')
  }, step.recommendationIds.map(recommendationId => {
    const entry = recommendationById.get(String(recommendationId));
    if (!entry) return /*#__PURE__*/React.createElement("li", {
      key: recommendationId
    }, tr('missing_recommendation', 'The cited teaching guidance is unavailable. Review this step.'));
    const href = _ltsSafeUrl(entry.source.url);
    return /*#__PURE__*/React.createElement("li", {
      key: recommendationId
    }, /*#__PURE__*/React.createElement("p", null, _ltsText(entry.recommendation.text)), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs"
    }, href ? /*#__PURE__*/React.createElement("a", {
      href: href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "font-bold underline"
    }, _ltsText(entry.source.title)) : _ltsText(entry.source.title), entry.recommendation.locator ? ' · ' + _ltsText(entry.recommendation.locator) : '', entry.recommendation.evidenceLevel ? ' · ' + _ltsText(entry.recommendation.evidenceLevel) : ''));
  }))))), draft && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 rounded-lg border border-indigo-300 bg-indigo-50 p-3 no-print"
  }, invalidTiming && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('timing_error', 'Step times must be positive whole minutes and add up to the version’s teaching time.'), " (", timings, " / ", version.durationMinutes, " ", tr('minutes', 'minutes'), ")"), invalidDraftText && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('text_error', 'Give each step a title and complete every teaching field. Expand each teacher prompt into the words you will say (at least 60 characters).')), staleDraft && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-900"
  }, tr('stale_edits', 'This saved version changed while you were editing. Copy your draft if needed, then discard edits to review the current version.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving || invalidTiming || invalidDraftText || staleDraft,
    onClick: saveEdits
  }, saving ? tr('saving', 'Adding edits…') : tr('save', 'Save edits')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: saving,
    onClick: () => {
      setDraft(null);
      setDraftBase('');
      setLocalError('');
    }
  }, tr('discard', 'Discard edits')))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 border-t border-slate-200 pt-4"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-black text-slate-900"
  }, tr('sources', 'Teaching sources and evidence')), sources.length ? /*#__PURE__*/React.createElement("ul", {
    className: "space-y-3"
  }, sources.map((source, index) => {
    const href = _ltsSafeUrl(source.url);
    return /*#__PURE__*/React.createElement("li", {
      key: source.id || index,
      className: "rounded-lg border border-slate-200 p-3 text-sm text-slate-800"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-bold"
    }, href ? /*#__PURE__*/React.createElement("a", {
      href: href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "text-indigo-800 underline"
    }, _ltsText(source.title) || href) : _ltsText(source.title) || tr('source_unavailable', 'Source link unavailable')), /*#__PURE__*/React.createElement("p", null, [_ltsText(source.author), _ltsText(source.publishedAt), source.evidenceKind === 'general-practice' ? tr('evidence_general', 'General instructional practice') : source.evidenceKind === 'content-specific' ? tr('evidence_content', 'Content-specific guidance') : ''].filter(Boolean).join(' · ')), source.scope && /*#__PURE__*/React.createElement("p", {
      className: "mt-1"
    }, tr('scope_label', 'Scope:'), " ", _ltsText(source.scope)), source.evidenceLevel && /*#__PURE__*/React.createElement("p", null, tr('evidence_level', 'Evidence level:'), " ", _ltsText(source.evidenceLevel)), source.retrievedAt && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-600"
    }, tr('retrieved', 'Retrieved:'), " ", _ltsText(source.retrievedAt)), Array.isArray(source.recommendations) && source.recommendations.length > 0 && /*#__PURE__*/React.createElement("ul", {
      className: "mt-2 list-disc space-y-1 pl-5"
    }, source.recommendations.map((recommendation, offset) => /*#__PURE__*/React.createElement("li", {
      key: recommendation.id || offset
    }, _ltsText(recommendation.text), recommendation.locator ? ' (' + _ltsText(recommendation.locator) + ')' : ''))));
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700"
  }, tr('no_sources', 'No research sources are attached to this version. Review the teaching choices against your lesson and learners.'))))));
}
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LessonTeachingScriptView = LessonTeachingScriptView;
  window.AlloModules.ViewLessonTeachingScriptModule = true;
})();
