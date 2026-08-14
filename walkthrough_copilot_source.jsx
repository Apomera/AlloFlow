/*
 * AlloFlow Walkthrough Copilot - Leadership Hub panel.
 *
 * Formative walkthrough and coaching support. Never assigns a rating, never
 * calculates a summative score, never makes an employment recommendation.
 * See CLAUDE_WALKTHROUGH_COPILOT_HANDOFF.md.
 *
 * This panel owns no rules. Every decision about what may be shown, approved,
 * or copied is asked of window.AlloModules.WalkthroughCopilot, the same core
 * the unit tests exercise, so the interface and the tests cannot drift apart.
 *
 * The built module bundles the core, the framework fixtures, and the practice
 * scenarios, so the panel can assume all three are on window by the time it
 * renders.
 */

/* global React */

const WCOP_ADVISORY_QUESTIONS = [
  'Which AI provider may process observation notes, and under what data agreement.',
  'Whether a walkthrough counts as one of the evidence collections in your evaluation system. If it does, this is not formative-only, whatever it is called.',
  'How long anything typed here is retained, where, and who can see it.'
];

const WCOP_STEPS = [
  ['Capture', 'Read the notes, then lock them so nothing can quietly rewrite them.'],
  ['Review', 'Work through each suggestion. Nothing moves forward until you decide on it.'],
  ['Read', 'See the feedback the way the teacher will read it.'],
  ['Copy', 'Paste it into the form your school already uses. Nothing is sent or saved.']
];

const WCOP_STAGES = [
  { id: 'capture', n: 'Step 1', label: 'Capture notes' },
  { id: 'analyze', n: 'Step 2', label: 'Your call on each suggestion' },
  { id: 'feedback', n: 'Step 3', label: 'Read the feedback' },
  { id: 'copy', n: 'Step 4', label: 'Copy to your form' }
];

function wcopCore() {
  return (window.AlloModules && window.AlloModules.WalkthroughCopilot) || null;
}
function wcopFixtures() {
  return (window.AlloModules && window.AlloModules.WalkthroughCopilotFixtures) || null;
}
function wcopScenarios() {
  return (window.AlloModules && window.AlloModules.WalkthroughCopilotScenarios) || null;
}

function wcopAnnounce(message) {
  try {
    const region = document.getElementById('allo-live-wcop');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => { region.textContent = message; }, 30);
  } catch (err) { /* announcing must never break the panel */ }
}

/* ------------------------------------------------------------------ *
 * Presentational pieces. Declared at module scope so their identity is
 * stable across renders.
 * ------------------------------------------------------------------ */

function WcopFlag(props) {
  const tone = props.tone || 'warn';
  const cls = tone === 'stop'
    ? 'bg-rose-50 text-rose-800 border-rose-200'
    : tone === 'go'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-amber-50 text-amber-900 border-amber-200';
  return React.createElement('p', { className: 'text-sm border rounded px-3 py-2 mt-2 ' + cls }, props.children);
}

function WcopFrozenNotes(props) {
  return React.createElement('div', { className: 'rounded-lg border border-stone-300 bg-stone-50 p-3' },
    React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2' },
      'Source notes, locked'),
    React.createElement('pre', { className: 'whitespace-pre-wrap break-words text-[13px] leading-relaxed text-stone-800 m-0 font-mono' },
      props.notes),
    React.createElement('p', { className: 'text-xs text-stone-500 mt-2' },
      'These are never edited by this tool.')
  );
}

function WcopSuggestion(props) {
  const s = props.suggestion;
  const core = props.core;
  const titleId = 'wcop-sugg-' + s.id;
  const border = s.decision === 'accepted'
    ? 'border-l-4 border-l-emerald-500'
    : s.decision === 'edited'
      ? 'border-l-4 border-l-amber-500'
      : '';
  const faded = s.decision === 'rejected' ? ' opacity-60' : '';

  const body = [];
  if (s.result === 'insufficient_evidence') {
    body.push(React.createElement('p', {
      key: 'h', id: titleId, className: 'text-xs uppercase tracking-wider font-bold text-teal-700 mb-1'
    }, 'Not established by these notes'));
    body.push(React.createElement('p', { key: 'n', className: 'text-sm text-slate-700' }, s.note));
  } else {
    body.push(React.createElement('p', {
      key: 'h', id: titleId, className: 'text-xs uppercase tracking-wider font-bold text-teal-700 mb-1'
    }, props.componentLabel));
    body.push(React.createElement('p', { key: 'l1', className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-2' }, 'What was observed'));
    body.push(React.createElement('p', { key: 'e', className: 'text-sm text-slate-800' }, s.objectiveEvidence));
    if (s.interpretation) {
      body.push(React.createElement('p', { key: 'l2', className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-2' }, 'What it might mean'));
      body.push(React.createElement('p', { key: 'i', className: 'text-sm text-slate-700 italic' }, s.interpretation));
    }
    body.push(React.createElement('p', { key: 'l3', className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-2' }, 'Cited from the notes'));
    s.sourceSpans.forEach((span, i) => {
      body.push(React.createElement('blockquote', {
        key: 'q' + i,
        className: 'text-[13px] italic bg-stone-50 border-l-2 border-stone-300 px-2 py-1 my-1'
      }, span.text));
    });
  }

  s.warnings.forEach((flag, i) => {
    body.push(React.createElement(WcopFlag, { key: 'w' + i }, flag.message));
  });

  if (s.decision === 'edited' && s.approvedText) {
    body.push(React.createElement('p', { key: 'l4', className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-2' }, 'Your wording'));
    body.push(React.createElement('p', { key: 'a', className: 'text-sm text-slate-800' }, s.approvedText));
  }

  if (props.editing) {
    body.push(React.createElement('div', { key: 'edit', className: 'mt-3' },
      React.createElement('label', {
        className: 'block text-xs font-semibold mb-1', htmlFor: 'wcop-edit-' + s.id
      }, 'Your wording for this feedback'),
      React.createElement('textarea', {
        id: 'wcop-edit-' + s.id,
        className: 'w-full rounded border border-slate-300 p-2 text-sm',
        rows: 3,
        value: props.editText,
        onChange: (e) => props.onEditText(e.target.value)
      }),
      React.createElement('button', {
        type: 'button',
        className: 'mt-2 px-3 py-1.5 rounded bg-teal-700 text-white text-sm font-semibold',
        onClick: () => props.onDecide(s.id, 'edited', props.editText)
      }, 'Save and approve this wording')
    ));
  }

  const controls = React.createElement('div', { className: 'flex flex-wrap gap-2 mt-3' },
    React.createElement('button', {
      type: 'button', 'aria-pressed': s.decision === 'accepted', 'aria-describedby': titleId,
      className: 'px-3 py-1.5 rounded border text-sm font-semibold '
        + (s.decision === 'accepted' ? 'bg-emerald-50 border-emerald-600 text-emerald-800' : 'border-slate-300 text-slate-700'),
      onClick: () => props.onDecide(s.id, 'accepted')
    }, 'Keep'),
    React.createElement('button', {
      type: 'button', 'aria-pressed': s.decision === 'edited', 'aria-describedby': titleId,
      className: 'px-3 py-1.5 rounded border text-sm font-semibold '
        + (s.decision === 'edited' ? 'bg-amber-50 border-amber-600 text-amber-900' : 'border-slate-300 text-slate-700'),
      onClick: () => props.onStartEdit(s)
    }, 'Reword'),
    React.createElement('button', {
      type: 'button', 'aria-pressed': s.decision === 'rejected', 'aria-describedby': titleId,
      className: 'px-3 py-1.5 rounded border text-sm font-semibold '
        + (s.decision === 'rejected' ? 'bg-rose-50 border-rose-600 text-rose-800' : 'border-slate-300 text-slate-700'),
      onClick: () => props.onDecide(s.id, 'rejected')
    }, 'Throw out')
  );

  return React.createElement('div', {
    className: 'rounded-lg border border-slate-200 bg-white p-3 mb-3 ' + border + faded
  }, body, controls);
}

function WcopIntro(props) {
  return React.createElement('div', { className: 'rounded-lg border border-slate-200 border-l-4 border-l-teal-600 bg-white p-4 mb-4' },
    React.createElement('div', { className: 'flex items-start justify-between gap-3' },
      React.createElement('h3', { className: 'font-bold text-slate-800' }, 'What this does'),
      React.createElement('button', {
        type: 'button', className: 'text-sm px-2 py-1 rounded border border-slate-300', onClick: props.onHide
      }, 'Hide this')
    ),
    React.createElement('p', { className: 'text-sm text-slate-700 mt-2' },
      'You type the shorthand you already write during a walkthrough. This organizes it into '
      + 'evidence-based feedback under your framework, shows you the exact line of your notes behind '
      + 'every claim, and lets you keep, reword, or throw out each one. You write and approve the '
      + 'feedback. It never rates anyone.'),
    React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-3' }, 'Four steps'),
    React.createElement('ol', { className: 'list-decimal ml-5 text-sm text-slate-700' },
      WCOP_STEPS.map((step) => React.createElement('li', { key: step[0], className: 'mb-1' },
        React.createElement('strong', null, step[0] + '. '), step[1]))),
    React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-3' },
      'Before using this with a real staff member'),
    React.createElement('p', { className: 'text-sm text-slate-700' },
      'Everything built in here is invented practice material, so you can explore it freely. Using it '
      + 'on a real observation is a district decision, not a settings change. Get answers to:'),
    React.createElement('ul', { className: 'list-disc ml-5 text-sm text-slate-700' },
      WCOP_ADVISORY_QUESTIONS.map((q, i) => React.createElement('li', { key: i, className: 'mb-1' }, q))),
    React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
      'This build analyzes the practice scenarios only. Analyzing notes you write yourself needs an '
      + 'approved AI provider, which is a separate decision.')
  );
}

/* ------------------------------------------------------------------ *
 * The panel
 * ------------------------------------------------------------------ */

function WalkthroughCopilotPanel(props) {
  const t = (props && props.t) || ((k, d) => d || k);
  const core = wcopCore();
  const fixtures = wcopFixtures();
  const scenarioLib = wcopScenarios();

  const [stage, setStage] = React.useState('capture');
  const [scenario, setScenario] = React.useState(null);
  const [notes, setNotes] = React.useState('');
  const [draft, setDraft] = React.useState(null);
  const [introOpen, setIntroOpen] = React.useState(true);
  const [editingId, setEditingId] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [comparison, setComparison] = React.useState(null);
  const [problem, setProblem] = React.useState('');

  if (!core || !fixtures || !scenarioLib) {
    return React.createElement('div', { className: 'p-4 text-sm text-rose-800' },
      'The Walkthrough Copilot modules did not finish loading. Close and reopen this tool.');
  }

  const componentLabels = React.useMemo(() => {
    const map = {};
    fixtures.PORTLAND_FRAMEWORK.components.forEach((c) => { map[c.id] = c.id + ' ' + c.label; });
    return map;
  }, [fixtures]);

  const edited = !!scenario && notes !== scenario.notes;

  function pickScenario(id) {
    const next = scenarioLib.getScenario(id);
    setScenario(next);
    setNotes(next.notes);
    setDraft(null);
    setComparison(null);
    setProblem('');
    wcopAnnounce('Scenario selected: ' + next.title + '. Notes loaded.');
  }

  function lockAndAnalyze() {
    const created = core.createDraft({
      framework: fixtures.PORTLAND_FRAMEWORK,
      sourceNotes: notes,
      collectionType: 'practice'
    });
    if (!created.ok) { setProblem(created.errors[0].message); return; }
    const analyzed = core.validateSuggestions(created.value, scenario.candidates);
    if (!analyzed.ok) { setProblem(analyzed.errors[0].message); return; }
    setProblem('');
    setDraft(analyzed.value);
    setStage('analyze');
    wcopAnnounce('Notes locked. ' + analyzed.value.suggestions.length + ' suggestions to review.');
  }

  function decide(id, decision, text) {
    const report = core.decideSuggestion(draft, id, decision, text);
    if (!report.ok) { setProblem(report.errors[0].message); return; }
    setProblem('');
    setDraft(report.value);
    setEditingId(null);
    const remaining = report.value.suggestions.filter((s) => s.decision === 'pending').length;
    wcopAnnounce('Marked ' + decision + '. '
      + (remaining === 0 ? 'All suggestions decided.' : remaining + ' still to decide.'));
  }

  function startEdit(suggestion) {
    setEditingId(suggestion.id);
    setEditText(suggestion.approvedText
      || (suggestion.result === 'insufficient_evidence' ? suggestion.note : suggestion.objectiveEvidence));
    wcopAnnounce('Editing. The cited excerpt does not change when you reword the feedback.');
  }

  function setDisclosureText(value) {
    const next = JSON.parse(JSON.stringify(draft));
    next.disclosure.text = value;
    setDraft(next);
  }

  function toggleFormative() {
    const next = JSON.parse(JSON.stringify(draft));
    next.disclosure.includeFormativeSentence = !next.disclosure.includeFormativeSentence;
    setDraft(next);
  }

  function compare() {
    const report = core.compareToReference(scenario, draft);
    if (!report.ok) { setProblem(report.errors[0].message); return; }
    setProblem('');
    setComparison(report.value);
    wcopAnnounce('Comparison ready. ' + report.value.agreements.length + ' agreements, '
      + report.value.divergences.length + ' differences to talk about.');
  }

  function copyText(text, what) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => wcopAnnounce(what + ' copied.'),
          () => wcopAnnounce('Could not copy. Select the text and copy manually.')
        );
        return;
      }
    } catch (err) { /* fall through */ }
    wcopAnnounce('Could not copy. Select the text and copy manually.');
  }

  function clearAll() {
    core.clearDraft(draft);
    setDraft(null);
    setScenario(null);
    setNotes('');
    setComparison(null);
    setStage('capture');
    wcopAnnounce('Cleared. Nothing was kept.');
  }

  const readiness = draft ? core.exportReadiness(draft) : null;

  function stageReachable(id) {
    if (id === 'capture') return true;
    if (!draft) return false;
    if (id === 'analyze') return true;
    const decided = draft.suggestions.every((s) => s.decision !== 'pending');
    if (id === 'feedback') return decided;
    if (id === 'copy') return !!readiness && readiness.ok;
    return false;
  }

  const banner = React.createElement('div', {
    className: 'flex flex-wrap gap-x-4 gap-y-1 items-center rounded border border-violet-300 bg-violet-50 text-violet-800 px-3 py-2 text-sm font-semibold mb-3'
  },
    React.createElement('span', null, draft && draft.mode === 'approved' ? 'Approved mode' : 'Demo mode'),
    React.createElement('span', { className: 'opacity-60 font-normal' }, '|'),
    React.createElement('span', { className: 'font-normal' },
      'Synthetic practice only. Nothing here is a record of a real observation.'),
    React.createElement('span', { className: 'opacity-60 font-normal' }, '|'),
    React.createElement('span', { className: 'font-normal' }, 'Nothing is saved. Closing discards everything.')
  );

  const nav = React.createElement('ol', { className: 'flex flex-wrap gap-2 mb-4 list-none p-0' },
    WCOP_STAGES.map((s) => React.createElement('li', { key: s.id, className: 'flex-1 min-w-[9rem]' },
      React.createElement('button', {
        type: 'button',
        disabled: !stageReachable(s.id) && stage !== s.id,
        'aria-current': stage === s.id ? 'step' : undefined,
        onClick: () => setStage(s.id),
        className: 'w-full text-left rounded border px-3 py-2 text-sm '
          + (stage === s.id ? 'border-teal-600 text-slate-800 bg-white' : 'border-slate-200 text-slate-500 bg-white')
          + (!stageReachable(s.id) && stage !== s.id ? ' opacity-50 cursor-not-allowed' : '')
      },
        React.createElement('span', { className: 'block text-[10px] uppercase tracking-wider opacity-75' }, s.n),
        React.createElement('span', null, s.label))
    ))
  );

  let bodyNode = null;

  if (stage === 'capture') {
    bodyNode = React.createElement('div', null,
      introOpen
        ? React.createElement(WcopIntro, { onHide: () => setIntroOpen(false) })
        : React.createElement('button', {
          type: 'button', className: 'mb-4 px-3 py-1.5 rounded border border-slate-300 text-sm',
          onClick: () => setIntroOpen(true)
        }, 'What is this?'),
      React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-4' },
        React.createElement('h3', { className: 'font-bold text-slate-800 mb-1' }, 'Choose a practice scenario'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-3' },
          'Each scenario is a synthetic observation that teaches one habit of evidence-based feedback. '
          + 'They carry their own suggestions, so nothing here calls an AI service.'),
        scenarioLib.listScenarios().map((meta) => React.createElement('button', {
          key: meta.id,
          type: 'button',
          'aria-pressed': !!scenario && scenario.id === meta.id,
          onClick: () => pickScenario(meta.id),
          className: 'block w-full text-left rounded border px-3 py-2 mb-2 '
            + (scenario && scenario.id === meta.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white')
        },
          React.createElement('span', { className: 'block font-semibold text-sm text-slate-800' }, meta.title),
          React.createElement('span', { className: 'block text-xs text-slate-500' },
            meta.setting + ' | about ' + meta.minutes + ' minutes | teaches: ' + meta.teaches)))
      ),
      React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4' },
        React.createElement('h3', { className: 'font-bold text-slate-800 mb-1' }, 'The observer notes'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-2' },
          'This is the shorthand someone typed during the visit. Locking it means your original wording '
          + 'is kept exactly as written for the rest of the session, so nothing can quietly tidy it up, '
          + 'summarize it, or put words in your mouth. Every claim later has to point back to a line in here.'),
        React.createElement('textarea', {
          className: 'w-full rounded border border-slate-300 p-2 font-mono text-[13px]',
          rows: 10,
          'aria-label': 'Observation notes',
          value: notes,
          onChange: (e) => setNotes(e.target.value)
        }),
        edited ? React.createElement(WcopFlag, null,
          'You have changed the scenario notes. The prepared suggestions quote the original wording, so '
          + 'they no longer match and cannot be used. Restore the notes to continue. Analyzing notes you '
          + 'write yourself needs an approved AI provider, which is not connected here.') : null,
        React.createElement('div', { className: 'flex flex-wrap gap-2 mt-3' },
          React.createElement('button', {
            type: 'button',
            disabled: !scenario || edited,
            onClick: lockAndAnalyze,
            className: 'px-4 py-2 rounded bg-teal-700 text-white text-sm font-semibold '
              + (!scenario || edited ? 'opacity-50 cursor-not-allowed' : '')
          }, 'Lock these notes and see suggestions'),
          edited ? React.createElement('button', {
            type: 'button',
            className: 'px-3 py-2 rounded border border-slate-300 text-sm',
            onClick: () => { setNotes(scenario.notes); wcopAnnounce('Scenario notes restored.'); }
          }, 'Restore scenario notes') : null,
          !scenario ? React.createElement('span', { className: 'text-xs text-slate-500 self-center' },
            'Pick a scenario first.') : null)
      )
    );
  } else if (stage === 'analyze' && draft) {
    const total = draft.suggestions.length;
    const settled = draft.suggestions.filter((s) => s.decision !== 'pending').length;
    bodyNode = React.createElement('div', { className: 'grid gap-4 md:grid-cols-[22rem_minmax(0,1fr)] items-start' },
      React.createElement(WcopFrozenNotes, { notes: draft.sourceNotesOriginal }),
      React.createElement('div', null,
        React.createElement('h3', { className: 'font-bold text-slate-800' }, 'Your call on each suggestion'),
        React.createElement('p', { className: 'text-sm font-bold text-teal-700 mb-1', role: 'status' },
          settled === total ? 'All ' + total + ' decided. You can move on.' : settled + ' of ' + total + ' decided.'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-3' },
          'Nothing reaches your form until you decide on it. Keep what the notes genuinely support, reword '
          + 'anything you would put differently, and throw out the rest. Rejecting a lot is a normal outcome, '
          + 'not a sign something went wrong.'),
        draft.suggestions.map((s) => React.createElement(WcopSuggestion, {
          key: s.id,
          suggestion: s,
          core: core,
          componentLabel: componentLabels[s.componentId] || s.componentId,
          editing: editingId === s.id,
          editText: editText,
          onEditText: setEditText,
          onStartEdit: startEdit,
          onDecide: decide
        })),
        draft.globalWarnings.map((w, i) => React.createElement(WcopFlag, { key: 'g' + i }, w.message)),
        React.createElement('button', {
          type: 'button',
          disabled: settled !== total,
          onClick: () => setStage('feedback'),
          className: 'mt-3 px-4 py-2 rounded bg-teal-700 text-white text-sm font-semibold '
            + (settled !== total ? 'opacity-50 cursor-not-allowed' : '')
        }, 'Continue to the feedback')
      )
    );
  } else if (stage === 'feedback' && draft) {
    const output = readiness.ok ? core.buildFormOutput(draft, fixtures.SAMPLE_FIELD_MAP) : null;
    bodyNode = React.createElement('div', null,
      React.createElement('h3', { className: 'font-bold text-slate-800 mb-2' }, 'The feedback as the teacher will read it'),
      React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-3' },
        React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'Disclosure'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-2' },
          'This travels with every field you copy. You can reword it, but it cannot be empty, and the last '
          + 'sentence is a claim only your school can make truthfully.'),
        React.createElement('label', { className: 'block text-xs font-semibold mb-1', htmlFor: 'wcop-disclosure' },
          'Disclosure wording'),
        React.createElement('textarea', {
          id: 'wcop-disclosure',
          className: 'w-full rounded border border-slate-300 p-2 text-sm',
          rows: 3,
          value: draft.disclosure.text,
          onChange: (e) => setDisclosureText(e.target.value)
        }),
        React.createElement('div', { className: 'flex flex-wrap gap-2 items-center mt-2' },
          React.createElement('button', {
            type: 'button',
            'aria-pressed': draft.disclosure.includeFormativeSentence,
            onClick: toggleFormative,
            className: 'px-3 py-1.5 rounded border border-slate-300 text-sm'
          }, draft.disclosure.includeFormativeSentence ? 'Formative sentence included' : 'Formative sentence removed'),
          React.createElement('span', { className: 'text-xs text-slate-500' }, draft.disclosure.formativeSentence))
      ),
      readiness.ok
        ? React.createElement(WcopFlag, { tone: 'go' },
          'Ready to copy. ' + readiness.value.approvedCount + ' approved item(s).')
        : readiness.errors.map((e, i) => React.createElement(WcopFlag, { key: i, tone: 'stop' }, e.message)),
      output ? output.value.fields.map((f) => React.createElement('div', {
        key: f.domainId,
        className: 'rounded border border-slate-200 bg-white p-3 mt-2' + (f.empty ? ' border-dashed' : '')
      },
        React.createElement('h4', { className: 'font-semibold text-sm' }, f.key),
        React.createElement('pre', { className: 'whitespace-pre-wrap break-words text-[13px] mt-1 font-mono' }, f.text)
      )) : null,
      React.createElement('div', { className: 'flex flex-wrap gap-2 mt-4' },
        React.createElement('button', {
          type: 'button',
          disabled: !readiness.ok,
          onClick: () => setStage('copy'),
          className: 'px-4 py-2 rounded bg-teal-700 text-white text-sm font-semibold '
            + (!readiness.ok ? 'opacity-50 cursor-not-allowed' : '')
        }, 'Continue to copy'),
        React.createElement('button', {
          type: 'button',
          onClick: compare,
          className: 'px-4 py-2 rounded border border-slate-300 text-sm font-semibold'
        }, 'Compare with the reference reading')),
      comparison ? React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mt-3' },
        React.createElement('h4', { className: 'font-semibold text-sm' }, 'Your reading and the reference reading'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-2' }, comparison.disclaimer),
        comparison.agreements.map((a, i) => React.createElement(WcopFlag, { key: 'a' + i, tone: 'go' },
          (a.componentId ? a.componentId + ': ' : '') + a.note)),
        comparison.divergences.map((d, i) => React.createElement(WcopFlag, { key: 'd' + i },
          (d.componentId ? d.componentId + ': ' : '') + d.note)),
        comparison.referenceNote ? React.createElement('p', { className: 'text-sm text-slate-700 mt-2' }, comparison.referenceNote) : null,
        comparison.discussion.length ? React.createElement('div', { className: 'mt-2' },
          React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold' }, 'Worth discussing'),
          React.createElement('ul', { className: 'list-disc ml-5 text-sm text-slate-700' },
            comparison.discussion.map((p, i) => React.createElement('li', { key: i }, p)))) : null
      ) : null
    );
  } else if (stage === 'copy' && draft) {
    const output = core.buildFormOutput(draft, fixtures.SAMPLE_FIELD_MAP);
    bodyNode = output.ok
      ? React.createElement('div', null,
        React.createElement('h3', { className: 'font-bold text-slate-800 mb-1' }, 'Copy into your walkthrough form'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-3' },
          'This tool does not submit anything, send anything, or store anything. You paste these into the '
          + 'form your school already uses.'),
        React.createElement('button', {
          type: 'button',
          onClick: () => copyText(output.value.copyAll, 'All fields'),
          className: 'px-4 py-2 rounded bg-teal-700 text-white text-sm font-semibold mb-3'
        }, 'Copy everything'),
        output.value.contextFields.concat(output.value.fields).map((f, i) => React.createElement('div', {
          key: 'f' + i,
          className: 'rounded border border-slate-200 bg-white p-3 mb-2' + (f.empty ? ' border-dashed' : '')
        },
          React.createElement('div', { className: 'flex items-center justify-between gap-2' },
            React.createElement('h4', { className: 'font-semibold text-sm' }, f.key),
            React.createElement('button', {
              type: 'button',
              onClick: () => copyText(f.text, f.key),
              className: 'px-3 py-1 rounded border border-slate-300 text-sm'
            }, 'Copy')),
          React.createElement('pre', { className: 'whitespace-pre-wrap break-words text-[13px] mt-1 font-mono' }, f.text)
        )),
        React.createElement('button', {
          type: 'button',
          onClick: clearAll,
          className: 'mt-3 px-3 py-2 rounded border border-slate-300 text-sm'
        }, 'Clear and start over')
      )
      : React.createElement(WcopFlag, { tone: 'stop' }, output.errors[0].message);
  }

  return React.createElement('div', { className: 'p-4' },
    banner,
    nav,
    problem ? React.createElement(WcopFlag, { tone: 'stop' }, problem) : null,
    bodyNode,
    React.createElement('div', { className: 'mt-6 pt-3 border-t border-slate-200 text-xs text-slate-500' },
      React.createElement('p', null,
        'Formative walkthrough and coaching support. This tool never assigns a rating, calculates a '
        + 'summative score, or makes an employment recommendation.'),
      React.createElement('p', { className: 'mt-1' },
        'Practice material here is invented. Before using this with a real staff member, confirm with your '
        + 'district which AI provider may process observation notes, whether a walkthrough counts as '
        + 'evidence in your evaluation system, and how long anything typed here is retained.'),
      React.createElement('p', { className: 'mt-1' }, scenarioLib.DISCLAIMER))
  );
}
