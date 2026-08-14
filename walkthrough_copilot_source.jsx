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

const WCOP_STORE_KEY = 'allo_wcop_delivery_v1';

const WCOP_TIERS = [
  {
    key: 'practice',
    name: 'Practice, on this device',
    cost: 'Nothing to set up',
    body: 'Invented scenarios, no AI contacted, nothing saved. This is what you are in now, and what to use for training or a staff meeting.'
  },
  {
    key: 'deliver',
    name: 'Deliver to your teachers',
    cost: 'You deploy a script, about three minutes',
    body: 'A small script in your own Google account saves each finished note to your Drive and shares it with one named teacher. Your district permits it rather than administering it.'
  },
  {
    key: 'district',
    name: 'District system of record',
    cost: 'Your district deploys and runs it',
    body: 'Verified identity, evaluator assignments, teacher acknowledgment and a tamper-evident audit trail. A separate portal your district opens, not something this panel can switch on.'
  }
];

function wcopCore() {
  return (window.AlloModules && window.AlloModules.WalkthroughCopilot) || null;
}
function wcopScriptSource() {
  return (window.AlloModules && window.AlloModules.WalkthroughScriptSource) || null;
}

// Apps Script answers exactly one request shape. A JSON content type triggers a
// CORS preflight it cannot respond to, so the body goes as text/plain.
function wcopPost(url, body) {
  return window.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then((response) => response.json());
}

function wcopLoadConnection() {
  try {
    const raw = window.localStorage.getItem(WCOP_STORE_KEY);
    if (!raw) return { execUrl: '', token: '', owner: '' };
    const saved = JSON.parse(raw);
    return {
      execUrl: typeof saved.execUrl === 'string' ? saved.execUrl : '',
      token: typeof saved.token === 'string' ? saved.token : '',
      owner: typeof saved.owner === 'string' ? saved.owner : ''
    };
  } catch (err) {
    return { execUrl: '', token: '', owner: '' };
  }
}

function wcopSaveConnection(connection) {
  try {
    window.localStorage.setItem(WCOP_STORE_KEY, JSON.stringify({
      execUrl: connection.execUrl, token: connection.token, owner: connection.owner
    }));
  } catch (err) { /* private browsing: the connection just will not persist */ }
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
      + 'approved AI provider, which is a separate decision.'),
    React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-3' },
      'Three ways this gets used'),
    React.createElement('div', { className: 'grid gap-2 sm:grid-cols-3' },
      WCOP_TIERS.map((tier) => React.createElement('div', {
        key: tier.key,
        className: 'rounded border p-2 '
          + (tier.key === 'practice' ? 'border-teal-600 bg-teal-50'
            : tier.key === 'deliver' && props.connected ? 'border-emerald-600 bg-emerald-50'
              : 'border-slate-200 bg-white')
      },
        React.createElement('h4', { className: 'text-sm font-bold' }, tier.name),
        React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold' }, tier.cost),
        React.createElement('p', { className: 'text-xs text-slate-600 mt-1' }, tier.body),
        tier.key === 'deliver' && props.connected
          ? React.createElement('p', { className: 'text-xs text-emerald-800 font-semibold mt-1' },
            'Connected to ' + (props.owner || 'your Google account') + '.')
          : null,
        tier.key === 'deliver' && !props.connected
          ? React.createElement('button', {
            type: 'button',
            className: 'mt-2 px-2 py-1 rounded border border-slate-300 text-xs font-semibold',
            onClick: props.onSetup
          }, 'Set up delivery')
          : null)))
  );
}

function WcopAffirm(props) {
  const described = props.described;
  return React.createElement('div', null,
    React.createElement('h3', { className: 'font-bold text-slate-800 mb-1' }, 'Use this for a real observation'),
    React.createElement('p', { className: 'text-xs text-slate-500 mb-3' }, described.note),
    React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-3' },
      React.createElement('p', { className: 'text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1' },
        'Confirm each of these'),
      described.terms.map((term) => React.createElement('label', {
        key: term.key, className: 'flex gap-2 items-start text-sm my-2'
      },
        React.createElement('input', {
          type: 'checkbox',
          className: 'w-5 h-5 mt-0.5 flex-none',
          checked: !!props.checks[term.key],
          onChange: (e) => props.onCheck(term.key, e.target.checked)
        }),
        React.createElement('span', null, term.text))),
      React.createElement('label', { className: 'block text-xs font-semibold mt-3 mb-1', htmlFor: 'wcop-affirm-name' },
        'Your name, recorded with the affirmation'),
      React.createElement('input', {
        id: 'wcop-affirm-name',
        type: 'text',
        className: 'w-full rounded border border-slate-300 p-2 text-sm',
        value: props.name,
        onChange: (e) => props.onName(e.target.value)
      }),
      props.message ? React.createElement(WcopFlag, { tone: 'stop' }, props.message) : null,
      React.createElement('div', { className: 'flex flex-wrap gap-2 mt-3' },
        React.createElement('button', {
          type: 'button',
          className: 'px-4 py-2 rounded bg-teal-700 text-white text-sm font-semibold',
          onClick: props.onAffirm
        }, 'Affirm and continue'),
        React.createElement('button', {
          type: 'button',
          className: 'px-3 py-2 rounded border border-slate-300 text-sm',
          onClick: props.onCancel
        }, 'Stay in practice mode'))),
    React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4' },
      React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'What this does and does not change'),
      React.createElement('p', { className: 'text-xs text-slate-600' },
        'It removes the practice watermark and lets you work from your own notes. It changes nothing about '
        + 'how evidence is checked. It is not remembered after this session, and it is not a substitute for '
        + 'your district actually having approved anything.'))
  );
}

function WcopManualEntry(props) {
  return React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-3 mb-3' },
    React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'Add evidence'),
    React.createElement('p', { className: 'text-xs text-slate-500 mb-2' },
      'Pick the component, quote the line of your notes it rests on, then say what you observed. '
      + 'Keep any conclusion in the separate interpretation field.'),
    React.createElement('label', { className: 'block text-xs font-semibold mb-1', htmlFor: 'wcop-manual-component' },
      'Component'),
    React.createElement('select', {
      id: 'wcop-manual-component',
      className: 'w-full rounded border border-slate-300 p-2 text-sm mb-2',
      value: props.entry.componentId,
      onChange: (e) => props.onField('componentId', e.target.value)
    },
      React.createElement('option', { value: '' }, 'Choose a component'),
      props.components.map((component) => React.createElement('option', { key: component.id, value: component.id },
        component.id + ' ' + component.label))),
    [
      ['quote', 'Quote from your notes', 'Paste the exact line this rests on'],
      ['evidence', 'What you observed', 'Describe only what happened'],
      ['interpretation', 'What it might mean (optional)', 'Your reading of it, kept separate']
    ].map((spec) => React.createElement('div', { key: spec[0], className: 'mb-2' },
      React.createElement('label', { className: 'block text-xs font-semibold mb-1', htmlFor: 'wcop-manual-' + spec[0] },
        spec[1]),
      React.createElement('textarea', {
        id: 'wcop-manual-' + spec[0],
        className: 'w-full rounded border border-slate-300 p-2 text-sm',
        rows: 2,
        placeholder: spec[2],
        value: props.entry[spec[0]],
        onChange: (e) => props.onField(spec[0], e.target.value)
      }))),
    props.message ? React.createElement(WcopFlag, { tone: 'stop' }, props.message) : null,
    React.createElement('button', {
      type: 'button',
      className: 'px-3 py-2 rounded bg-teal-700 text-white text-sm font-semibold',
      onClick: props.onAdd
    }, 'Add this evidence')
  );
}

function WcopSetup(props) {
  const source = wcopScriptSource();
  if (!source) {
    return React.createElement('div', { className: 'p-1' },
      React.createElement(WcopFlag, { tone: 'stop' },
        'The script could not be loaded, so the copy button is unavailable. Close and reopen this tool.'),
      React.createElement('button', {
        type: 'button', className: 'mt-2 px-3 py-2 rounded border border-slate-300 text-sm', onClick: props.onBack
      }, 'Back'));
  }
  return React.createElement('div', null,
    React.createElement('h3', { className: 'font-bold text-slate-800 mb-1' }, 'Set up delivery to your teachers'),
    React.createElement('p', { className: 'text-xs text-slate-500 mb-3' },
      'This runs in your own Google account. Finished notes are saved to your Drive and shared with one '
      + 'named teacher at a time. Nothing goes to an AlloFlow server, and there is no AlloFlow database.'),

    React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-3' },
      React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'Deploy the script'),
      React.createElement('ol', { className: 'list-decimal ml-5 text-sm text-slate-700' },
        source.steps.map((step) => React.createElement('li', { key: step.n, className: 'mb-1' }, step.text))),
      React.createElement('div', { className: 'flex flex-wrap gap-2 items-center mt-2' },
        React.createElement('button', {
          type: 'button',
          className: 'px-3 py-2 rounded bg-teal-700 text-white text-sm font-semibold',
          onClick: () => props.onCopyScript(source.source)
        }, 'Copy script code'),
        React.createElement('span', { className: 'text-xs text-slate-500' },
          source.source.length + ' characters. The script ships inside this tool, so this works offline.'))),

    React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-3' },
      React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'Connect it'),
      React.createElement('label', { className: 'block text-xs font-semibold mb-1', htmlFor: 'wcop-exec-url' },
        'Web app URL (ends in /exec)'),
      React.createElement('input', {
        id: 'wcop-exec-url',
        type: 'text',
        className: 'w-full rounded border border-slate-300 p-2 text-sm',
        placeholder: 'https://script.google.com/macros/s/.../exec',
        value: props.execUrl,
        onChange: (e) => props.onExecUrl(e.target.value)
      }),
      React.createElement('div', { className: 'flex flex-wrap gap-2 mt-2' },
        React.createElement('button', {
          type: 'button',
          disabled: props.busy,
          onClick: props.onConnect,
          className: 'px-3 py-2 rounded bg-teal-700 text-white text-sm font-semibold ' + (props.busy ? 'opacity-50' : '')
        }, props.connected ? 'Reconnect' : 'Connect'),
        props.connected ? React.createElement('button', {
          type: 'button', className: 'px-3 py-2 rounded border border-slate-300 text-sm', onClick: props.onForget
        }, 'Forget this connection') : null),
      props.message ? React.createElement(WcopFlag, { tone: props.tone }, props.message) : null,
      props.selfTest ? React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
        'Owner: ' + (props.selfTest.owner || 'unknown')
        + ' | folder: ' + (props.selfTest.folderName || 'not created yet')
        + ' | email quota available: ' + (props.selfTest.canSendMail ? 'yes' : 'no')) : null),

    React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-3' },
      React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'Before you use this on a real staff member'),
      React.createElement('p', { className: 'text-xs text-slate-500' },
        'This stores feedback you wrote and approved. It does not rate anyone and it is not an evaluation '
        + 'system of record. Using it on real staff is a district decision. Get answers to:'),
      React.createElement('ul', { className: 'list-disc ml-5 text-sm text-slate-700 mt-1' },
        WCOP_ADVISORY_QUESTIONS.map((q, i) => React.createElement('li', { key: i, className: 'mb-1' }, q)))),

    React.createElement('button', {
      type: 'button', className: 'px-3 py-2 rounded border border-slate-300 text-sm', onClick: props.onBack
    }, 'Back to the tool')
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
  const [connection, setConnection] = React.useState(wcopLoadConnection);
  const [setupState, setSetupState] = React.useState({ busy: false, message: '', tone: 'warn', selfTest: null });
  const [sendTo, setSendTo] = React.useState('');
  const [sendResult, setSendResult] = React.useState(null);
  // Session-only. Never persisted: a principal who affirmed in September
  // should be asked again in March.
  const [approval, setApproval] = React.useState(null);
  const [affirmChecks, setAffirmChecks] = React.useState({});
  const [affirmName, setAffirmName] = React.useState('');
  const [affirmMessage, setAffirmMessage] = React.useState('');
  const [manual, setManual] = React.useState({ componentId: '', quote: '', evidence: '', interpretation: '' });
  const [manualMessage, setManualMessage] = React.useState('');
  const [realNotes, setRealNotes] = React.useState('');

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

  const connected = !!connection.execUrl && !!connection.token;

  function deliveryClient(nextToken) {
    return core.createDelivery({
      execUrl: connection.execUrl,
      token: typeof nextToken === 'string' ? nextToken : connection.token,
      post: wcopPost
    });
  }

  function runSelfTest(token) {
    const built = deliveryClient(token);
    if (!built.ok) return;
    built.value.selfTest().then((result) => {
      setSetupState(result.ok
        ? { busy: false, message: 'Self-test passed.', tone: 'go', selfTest: result.value }
        : { busy: false, message: result.errors[0].message, tone: 'stop', selfTest: null });
    }, () => {
      setSetupState({ busy: false, message: 'The self-test could not reach the script.', tone: 'stop', selfTest: null });
    });
  }

  function connect() {
    const check = core.validateExecUrl(connection.execUrl);
    if (!check.ok) {
      setSetupState({ busy: false, message: check.errors[0].message, tone: 'stop', selfTest: null });
      return;
    }
    const cleaned = Object.assign({}, connection, { execUrl: check.value, token: '' });
    setConnection(cleaned);
    setSetupState({ busy: true, message: 'Connecting...', tone: 'warn', selfTest: null });
    const built = core.createDelivery({ execUrl: check.value, post: wcopPost });
    if (!built.ok) {
      setSetupState({ busy: false, message: built.errors[0].message, tone: 'stop', selfTest: null });
      return;
    }
    built.value.claim().then((result) => {
      if (!result.ok) {
        setSetupState({ busy: false, message: result.errors[0].message, tone: 'stop', selfTest: null });
        return;
      }
      const next = { execUrl: check.value, token: result.value.token, owner: result.value.owner || '' };
      setConnection(next);
      wcopSaveConnection(next);
      setSetupState({ busy: false, message: 'Connected to ' + (next.owner || 'your Google account') + '.', tone: 'go', selfTest: null });
      wcopAnnounce('Connected.');
      runSelfTest(next.token);
    }, (err) => {
      setSetupState({
        busy: false,
        message: 'Could not reach the script. Check the URL, and that the deployment is set to "Anyone". ('
          + ((err && err.message) || 'network error') + ')',
        tone: 'stop',
        selfTest: null
      });
    });
  }

  function forget() {
    try { window.localStorage.removeItem(WCOP_STORE_KEY); } catch (err) { /* nothing to clear */ }
    setConnection({ execUrl: '', token: '', owner: '' });
    setSetupState({ busy: false, message: '', tone: 'warn', selfTest: null });
    wcopAnnounce('Connection forgotten on this device. The script and your Drive files are untouched.');
  }

  function deliver() {
    const built = deliveryClient();
    if (!built.ok) { setSendResult({ ok: false, message: built.errors[0].message }); return; }
    setSetupState((current) => Object.assign({}, current, { busy: true }));
    built.value.deliver(draft, fixtures.SAMPLE_FIELD_MAP, {
      teacherEmail: sendTo,
      allowedDomain: setupState.selfTest && setupState.selfTest.allowedDomain
    }).then((result) => {
      setSetupState((current) => Object.assign({}, current, { busy: false }));
      const message = result.ok
        ? 'Saved and shared with ' + result.value.sharedWith
          + (result.value.notified ? '. A notification was sent.' : '. The notification could not be sent, so tell them directly.')
        : result.errors[0].message;
      setSendResult({ ok: result.ok, message: message });
      wcopAnnounce(message);
    }, (err) => {
      setSetupState((current) => Object.assign({}, current, { busy: false }));
      setSendResult({ ok: false, message: 'Could not reach the script. Nothing was saved. (' + ((err && err.message) || 'network error') + ')' });
    });
  }

  function affirmApproval() {
    const described = core.describeApproval();
    const missing = described.terms.filter((term) => !affirmChecks[term.key]);
    const named = affirmName.trim();
    if (missing.length || !named) {
      setAffirmMessage(
        missing.length && !named ? 'Confirm each statement and enter your name.'
          : missing.length ? 'Confirm each statement. These are claims about your district, not settings.'
            : 'Enter your name so the affirmation records who made it.'
      );
      return;
    }
    const affirmed = { affirmedBy: named };
    described.terms.forEach((term) => { affirmed[term.key] = true; });
    setApproval(affirmed);
    setAffirmMessage('');
    setScenario(null);
    setNotes('');
    setRealNotes('');
    setDraft(null);
    setComparison(null);
    setStage('capture');
    wcopAnnounce('Real observation mode. Affirmed by ' + named + ' for this session.');
  }

  function lockRealNotes() {
    const created = core.createDraft({
      framework: fixtures.PORTLAND_FRAMEWORK,
      sourceNotes: realNotes,
      mode: 'approved',
      approval: approval,
      collectionType: 'walkthrough'
    });
    if (!created.ok) { setProblem(created.errors[0].message); return; }
    setProblem('');
    setDraft(created.value);
    setStage('analyze');
    wcopAnnounce('Notes locked. Add the evidence you observed.');
  }

  function addManual() {
    const report = core.addManualSuggestion(draft, {
      componentId: manual.componentId,
      quote: manual.quote,
      objectiveEvidence: manual.evidence,
      interpretation: manual.interpretation
    });
    if (!report.ok) {
      setManualMessage(report.errors[0].message);
      wcopAnnounce(report.errors[0].message);
      return;
    }
    setDraft(report.value);
    setManual({ componentId: '', quote: '', evidence: '', interpretation: '' });
    setManualMessage('');
    wcopAnnounce('Evidence added. ' + report.value.suggestions.length + ' recorded so far.');
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

  const liveMode = draft ? draft.mode === 'approved' : !!approval;
  const affirmedBy = (draft && draft.approval && draft.approval.affirmedBy)
    || (approval && approval.affirmedBy) || 'you';

  const banner = React.createElement('div', {
    className: 'flex flex-wrap gap-x-4 gap-y-1 items-center rounded border px-3 py-2 text-sm font-semibold mb-3 '
      + (liveMode ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-violet-300 bg-violet-50 text-violet-800')
  },
    React.createElement('span', null, liveMode ? 'Real observation' : 'Practice mode'),
    React.createElement('span', { className: 'opacity-60 font-normal' }, '|'),
    React.createElement('span', { className: 'font-normal' },
      liveMode
        ? 'Affirmed by ' + affirmedBy + ' for this session only.'
        : 'Synthetic practice only. Nothing here is a record of a real observation.'),
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

  if (stage === 'setup') {
    bodyNode = React.createElement(WcopSetup, {
      execUrl: connection.execUrl,
      connected: connected,
      busy: setupState.busy,
      message: setupState.message,
      tone: setupState.tone,
      selfTest: setupState.selfTest,
      onExecUrl: (value) => setConnection((current) => Object.assign({}, current, { execUrl: value })),
      onConnect: connect,
      onForget: forget,
      onCopyScript: (text) => copyText(text, 'Script code'),
      onBack: () => setStage('capture')
    });
  } else if (stage === 'affirm') {
    bodyNode = React.createElement(WcopAffirm, {
      described: core.describeApproval(),
      checks: affirmChecks,
      name: affirmName,
      message: affirmMessage,
      onCheck: (key, value) => setAffirmChecks((current) => Object.assign({}, current, { [key]: value })),
      onName: setAffirmName,
      onAffirm: affirmApproval,
      onCancel: () => { setAffirmMessage(''); setStage('capture'); }
    });
  } else if (stage === 'capture' && approval) {
    bodyNode = React.createElement('div', null,
      React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mb-3' },
        React.createElement('h3', { className: 'font-bold text-slate-800 mb-1' }, 'Your observation notes'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-2' },
          'Type the shorthand you wrote during the visit. Locking it keeps your original wording exactly as '
          + 'written, and every claim you record afterwards has to quote a line from it.'),
        React.createElement('textarea', {
          className: 'w-full rounded border border-slate-300 p-2 font-mono text-[13px]',
          rows: 10,
          'aria-label': 'Observation notes',
          value: realNotes,
          onChange: (e) => setRealNotes(e.target.value)
        }),
        React.createElement('div', { className: 'flex flex-wrap gap-2 mt-3' },
          React.createElement('button', {
            type: 'button',
            disabled: !realNotes.trim(),
            onClick: lockRealNotes,
            className: 'px-4 py-2 rounded bg-teal-700 text-white text-sm font-semibold '
              + (!realNotes.trim() ? 'opacity-50 cursor-not-allowed' : '')
          }, 'Lock these notes'),
          React.createElement('button', {
            type: 'button',
            className: 'px-3 py-2 rounded border border-slate-300 text-sm',
            onClick: () => {
              setApproval(null);
              setRealNotes('');
              setDraft(null);
              wcopAnnounce('Back in practice mode.');
            }
          }, 'Back to practice'))),
      React.createElement('p', { className: 'text-xs text-slate-500' },
        'There is no AI connected in this build, so you will write each piece of evidence yourself in the '
        + 'next step. The tool still checks that every claim quotes your notes, keeps what you observed '
        + 'separate from what you concluded, and flags language that reaches past the evidence.')
    );
  } else if (stage === 'capture') {
    bodyNode = React.createElement('div', null,
      React.createElement('div', { className: 'flex flex-wrap gap-2 items-center mb-3' },
        React.createElement('button', {
          type: 'button',
          className: 'px-3 py-1.5 rounded border border-slate-300 text-sm',
          onClick: () => setStage('affirm')
        }, 'Use this for a real observation'),
        React.createElement('span', { className: 'text-xs text-slate-500' },
          'Requires confirming what your district has approved.')),
      introOpen
        ? React.createElement(WcopIntro, {
          onHide: () => setIntroOpen(false),
          connected: connected,
          owner: connection.owner,
          onSetup: () => setStage('setup')
        })
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
        draft.mode === 'approved' ? React.createElement(WcopManualEntry, {
          entry: manual,
          message: manualMessage,
          components: draft.framework.components,
          onField: (key, value) => setManual((current) => Object.assign({}, current, { [key]: value })),
          onAdd: addManual
        }) : null,
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
        React.createElement('div', { className: 'rounded-lg border border-slate-200 bg-white p-4 mt-3' },
          React.createElement('h4', { className: 'font-semibold text-sm mb-1' }, 'Send it to the teacher'),
          !connected
            ? React.createElement('div', null,
              React.createElement('p', { className: 'text-xs text-slate-500 mb-2' },
                'You can paste the fields above into whatever form your school uses. If you would rather have '
                + 'this saved to your Drive and shared with the teacher directly, set that up once.'),
              React.createElement('button', {
                type: 'button', className: 'px-3 py-2 rounded border border-slate-300 text-sm',
                onClick: () => setStage('setup')
              }, 'Set up delivery'))
            : draft.mode === 'demo'
              ? React.createElement(WcopFlag, null,
                'Delivery is connected, but this is a practice scenario. Sending is only available for a real '
                + 'observation, so nothing here can reach a colleague by accident.')
              : React.createElement('div', null,
                React.createElement('label', { className: 'block text-xs font-semibold mb-1', htmlFor: 'wcop-send-to' },
                  'Teacher school email'),
                React.createElement('input', {
                  id: 'wcop-send-to',
                  type: 'text',
                  className: 'w-full rounded border border-slate-300 p-2 text-sm',
                  placeholder: 'teacher@yourschool.org',
                  value: sendTo,
                  onChange: (e) => setSendTo(e.target.value)
                }),
                React.createElement('p', { className: 'text-xs text-slate-500 my-2' },
                  'The note is saved to your Drive and shared with that one address. Google asks them to sign in '
                  + 'to open it, so a forwarded link shows nothing. The notification email contains no feedback text.'),
                React.createElement('button', {
                  type: 'button',
                  disabled: setupState.busy,
                  onClick: deliver,
                  className: 'px-3 py-2 rounded bg-teal-700 text-white text-sm font-semibold ' + (setupState.busy ? 'opacity-50' : '')
                }, 'Save to my Drive and share')),
          sendResult ? React.createElement(WcopFlag, { tone: sendResult.ok ? 'go' : 'stop' }, sendResult.message) : null),
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
