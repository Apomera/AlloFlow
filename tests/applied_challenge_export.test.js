import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Applied Challenge Studio export lane. Locks the 2026-09-01 fixes:
//   - the export renders the module's exportModel (one derivation for visible
//     phases, family-aware labels, phase prompts, and status labels);
//   - the student workspace is a real response field in interactive HTML and
//     ruled lines on paper, with an existing snapshot printed as text;
//   - evidence ledger, validation cycles, stress test, and the feedback
//     question all survive export;
//   - no inline ink colours, so the document's dark/sepia/hc rules apply.

let pipeline;
let AC;

const challenge = () => ({
  id: 'ac-export-1',
  type: 'applied-challenge',
  title: 'Water Access Decision',
  data: {
    family: 'design',
    scope: 'compact',
    agencyMode: 'progressive',
    instructions: 'Use lesson evidence and revise after testing.',
    fitReason: 'The lesson presents a design problem with real constraints.',
    sourceExcerpt: 'PRIVATE SOURCE EXCERPT MUST NOT APPEAR',
    brief: {
      context: 'A town must improve access to clean water.',
      role: 'Junior engineer',
      audience: 'Town council',
      drivingQuestion: 'Which design best balances access and cost?',
      lockedLessonFacts: ['Gravity moves water downhill.'],
      openQuestions: ['What maintenance capacity exists?'],
      stakeholders: ['Residents', 'Maintenance staff'],
      criteria: ['Uses lesson evidence'],
      constraints: ['Do not invent prices.'],
      deliverable: 'A design proposal.',
      evidenceBoundary: 'Treat costs as assumptions unless sourced.',
      factVerified: true,
    },
    supports: {
      parallelExample: { context: 'Choosing a garden site', move: 'Compare access and upkeep.', whyItHelps: 'Notice the tradeoff.' },
      frameStarter: 'Design ___ so that ___.',
      frameChoices: ['Gravity-fed', 'Pumped'],
      coachPrompts: ['What would fail first?'],
      phasePrompts: { workingQuestion: 'CUSTOM PHASE PROMPT for framing.' },
    },
    workspace: {
      workingQuestion: 'How can gravity reduce pumping needs?',
      response: 'Start with a terrain study.',
      stakeholders: 'HIDDEN IN COMPACT SCOPE',
    },
    evidenceLedger: [
      { id: 'row-1', claim: 'Gravity storage is cheaper to run.', evidence: 'Lesson: gravity moves water downhill.', status: 'verified', tradeoff: 'Needs elevation.' },
    ],
    stressTest: { challenge: 'What if the terrain is flat?', whyItMatters: 'Gravity storage depends on elevation.', question: 'How would you verify elevation?' },
    validationCycles: [
      {
        id: 'cycle-1', family: 'design', source: 'peer',
        plan: { methodId: 'constraint-test', testQuestion: 'Does the design meet the budget constraint?', changeThreshold: 'If it exceeds budget, redesign.', evidenceMode: 'data' },
        observation: { evidence: 'Peer review flagged pumping cost.', outcome: 'challenges' },
        decision: { action: 'revise', reasoning: 'The evidence shows a cost gap.', nextStep: 'Add a gravity option.' },
      },
    ],
    feedback: {
      strength: 'Clear separation of evidence and assumptions.',
      lessonConnectionCheck: 'Gravity claim stays connected to the lesson.',
      evidenceOrConstraintCheck: 'Terrain remains unresolved.',
      nextStep: 'Define confirming evidence.',
      question: 'FEEDBACK QUESTION SURVIVES EXPORT',
      status: 'grounded',
    },
  },
});

function render(item, isWorksheet, extra = {}) {
  return pipeline.generateFullPackHTML([item], 'Applied challenge export', isWorksheet, {}, {
    includeTeacherKey: false,
    annotations: [],
    ...extra,
  });
}

beforeAll(() => {
  // The studio IIFE bails out without window.React; the export model never renders.
  window.React = window.React || {
    useState: (value) => [value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('doc_pipeline_module.js');
  AC = window.AlloModules.AppliedChallenge;
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});

describe('Applied Challenge Studio export model', () => {
  it('exposes one export model with scope-aware phases, prompts, and status labels', () => {
    expect(typeof AC.exportModel).toBe('function');
    const model = AC.exportModel(challenge().data);
    expect(model.phases.map((p) => p.id)).toEqual(['workingQuestion', 'possibilities', 'evidence', 'tradeoffs', 'response', 'transferReflection']);
    expect(model.phases[0].prompt).toBe('CUSTOM PHASE PROMPT for framing.');
    expect(model.phases[1].label).toBe('3. Possible designs or approaches');
    expect(model.familyLabel).toBe('Design');
    expect(model.evidenceLedger[0].statusLabel).toBe('Verified lesson evidence');
    expect(model.validationCycles[0].plan.methodLabel).toBe('Constraint test');
    expect(model.validationCycles[0].observation.outcomeLabel).toBe('Challenges the current direction');
    expect(model.validationCycles[0].decision.actionLabel).toBe('Revise part of it');
    expect(model.validationCycles[0].complete).toBe(true);
    expect(model.feedback.statusLabel).toBe('Grounded in verified facts');
    expect(JSON.stringify(model)).not.toContain('PRIVATE SOURCE EXCERPT');
  });

  it('treats a translator that echoes the key as a miss and keeps the English fallback', () => {
    const echo = (key) => key;
    expect(AC._testing._apsT(echo, 'applied_challenge.phase.workingQuestion', 'Fallback')).toBe('Fallback');
    expect(AC._testing._apsT((key) => (key === 'applied_challenge.phase.workingQuestion' ? 'Translated' : undefined), 'applied_challenge.phase.workingQuestion', 'Fallback')).toBe('Translated');
    expect(AC.phaseLabel('workingQuestion', 'decide', () => 'Enmarca el reto')).toBe('Enmarca el reto');
  });

  it('registers every applied_challenge key it reads in ui_strings.js', () => {
    const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    const group = strings.applied_challenge;
    expect(group && typeof group).toBe('object');
    const lookup = (dotted) => dotted.split('.').slice(1).reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), group);
    const source = readFileSync('applied_challenge_source.jsx', 'utf8') + readFileSync('doc_pipeline_source.jsx', 'utf8');
    const keys = new Set();
    const re = /'(applied_challenge\.[a-z0-9_.]+)'/g;
    let m;
    while ((m = re.exec(source))) if (!m[1].endsWith('.')) keys.add(m[1]);
    expect(keys.size).toBeGreaterThan(100);
    const missing = Array.from(keys).filter((key) => typeof lookup(key) !== 'string');
    expect(missing).toEqual([]);
    expect(lookup('applied_challenge.family.design.possibilitiesLabel')).toBe('Possible designs or approaches');
  });
});

describe('Applied Challenge Studio HTML export', () => {
  it('renders a persisted, fillable workspace with prompts in interactive HTML', () => {
    const html = render(challenge(), false);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.applied-challenge-export');
    expect(section).not.toBeNull();
    const fields = Array.from(section.querySelectorAll('textarea[data-allo-response-key]'));
    const keys = fields.map((f) => f.getAttribute('data-allo-response-key'));
    expect(keys).toContain('ac-export-1:applied:workingQuestion');
    expect(keys).toContain('ac-export-1:applied:response');
    expect(keys).not.toContain('ac-export-1:applied:stakeholders');
    const framing = fields.find((f) => f.getAttribute('data-allo-response-key') === 'ac-export-1:applied:workingQuestion');
    expect(framing.value).toBe('How can gravity reduce pumping needs?');
    expect(framing.getAttribute('data-allo-question')).toBe('1. Frame the challenge');
    expect(framing.className).toContain('alloflow-response-input');
    expect(section.textContent).toContain('CUSTOM PHASE PROMPT for framing.');
    expect(section.textContent).toContain('3. Possible designs or approaches');
    expect(section.textContent).not.toContain('HIDDEN IN COMPACT SCOPE');
  });

  it('prints snapshot text and ruled lines on the paper worksheet', () => {
    const html = render(challenge(), true);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.applied-challenge-export');
    expect(section.querySelectorAll('textarea').length).toBe(0);
    expect(section.textContent).toContain('How can gravity reduce pumping needs?');
    expect(section.querySelectorAll('.alloflow-ruled-response').length).toBeGreaterThanOrEqual(4);
  });

  it('exports the ledger, validation cycle, stress test, supports, and feedback question', () => {
    const html = render(challenge(), false);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.querySelector('.applied-challenge-export').textContent;
    for (const expected of [
      'Gravity storage is cheaper to run.', 'Verified lesson evidence', 'Needs elevation.',
      'Peer feedback', 'Constraint test', 'Does the design meet the budget constraint?', 'Challenges the current direction', 'Revise part of it', 'Add a gravity option.',
      'What if the terrain is flat?', 'How would you verify elevation?',
      'Notice the tradeoff.', 'Gravity-fed', 'What would fail first?',
      'Junior engineer', 'Town council', 'Maintenance staff',
      'FEEDBACK QUESTION SURVIVES EXPORT', 'Grounded in verified facts', 'Teacher-verified lesson facts',
    ]) expect(text, expected).toContain(expected);
    expect(html).not.toContain('PRIVATE SOURCE EXCERPT');
  });

  it('gives an empty ledger two fillable rows and never paints ink inline', () => {
    const item = challenge();
    item.data.evidenceLedger = [];
    const html = render(item, false);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.applied-challenge-export');
    expect(section.querySelectorAll('textarea[data-allo-response-key$="-claim"]').length).toBe(2);
    // The document's dark theme sets .section to #1e293b; inline ink of the
    // same shade made the workspace invisible. Ink now comes from class tokens.
    const inlineInk = Array.from(section.querySelectorAll('[style]')).filter((el) => /(^|;)\s*color\s*:/i.test(el.getAttribute('style')));
    expect(inlineInk).toEqual([]);
    expect(html).toContain('html[data-alloflow-theme="dark"] .applied-challenge-export');
  });

  it('escapes model text and falls back safely when the studio module is absent', () => {
    const saved = window.AlloModules.AppliedChallenge;
    try {
      delete window.AlloModules.AppliedChallenge;
      const item = challenge();
      item.data.brief.lockedLessonFacts = ['Gravity <script>alert(1)</script> moves water.'];
      const html = render(item, true);
      expect(html).toContain('Gravity &lt;script&gt;alert(1)&lt;/script&gt; moves water.');
      expect(html).not.toContain('<script>alert(1)</script>');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const text = doc.querySelector('.applied-challenge-export').textContent;
      expect(text).toContain('Start with a terrain study.');
      expect(text).toContain('Gravity storage is cheaper to run.');
      expect(text).toContain('FEEDBACK QUESTION SURVIVES EXPORT');
      expect(text).not.toContain('HIDDEN IN COMPACT SCOPE');
    } finally {
      window.AlloModules.AppliedChallenge = saved;
    }
  });
});

describe('Applied Challenge Studio pass 2: self-check, teacher comment, compact scope', () => {
  it('normalizes the criteria self-check against the brief and drops orphans', () => {
    const H = AC._testing;
    const brief = { criteria: ['Uses lesson evidence', 'Names a tradeoff'], constraints: ['No invented prices'] };
    const check = H.normalizeAppliedChallengeCriteriaCheck({
      'criterion-0': { rating: 'met', note: 'See paragraph 2.' },
      'criterion-9': { rating: 'met', note: 'orphan' },
      'constraint-0': { rating: 'bogus', note: '' },
    }, brief);
    expect(Object.keys(check)).toEqual(['criterion-0']);
    expect(H.appliedChallengeSelfCheckItems(brief).map((i) => i.key)).toEqual(['criterion-0', 'criterion-1', 'constraint-0']);
    const data = { brief, criteriaCheck: { 'criterion-0': { rating: 'partly', note: '' } } };
    expect(H.appliedChallengeSelfCheckProgress(data)).toEqual({ rated: 1, total: 3 });
    expect(H.appliedChallengeDraftFingerprint(data)).not.toBe(H.appliedChallengeDraftFingerprint({ brief }));
    expect(H.buildAppliedChallengeFeedbackPrompt(data)).toContain('selfCheck holds the student');
    expect(H.buildAppliedChallengeFeedbackPrompt({ brief })).not.toContain('selfCheck holds the student');
    expect(H.normalizeAppliedChallengeTeacherComment({ text: '  ' })).toBeNull();
    expect(H.normalizeAppliedChallengeTeacherComment({ text: 'Nice framing.', updatedAt: 'x' })).toEqual({ text: 'Nice framing.', updatedAt: 'x' });
    expect(H.appliedChallengeFeedbackReady({ brief }).reasonKey).toBe('feedback_needs_question');
  });

  it('exports the self-check and the teacher comment', () => {
    const item = challenge();
    item.data.criteriaCheck = { 'criterion-0': { rating: 'partly', note: 'Evidence is in paragraph two.' } };
    item.data.teacherComment = { text: 'TEACHER COMMENT REACHES THE STUDENT COPY' };
    const html = render(item, false);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('.applied-challenge-export');
    expect(section.textContent).toContain('Partly met');
    expect(section.textContent).toContain('Evidence is in paragraph two.');
    expect(section.textContent).toContain('Uses lesson evidence');
    expect(section.textContent).toContain('TEACHER COMMENT REACHES THE STUDENT COPY');
    expect(section.querySelectorAll('textarea[data-allo-response-key$="selfcheck-constraint-0"]').length).toBe(1);
    const model = AC.exportModel(item.data);
    expect(model.selfCheck.map((r) => r.rating)).toEqual(['partly', 'pending']);
    expect(model.teacherComment.text).toContain('TEACHER COMMENT');
  });
});

describe('Applied Challenge Studio host wiring', () => {
  it('lifts panel choices into host state and lets the dispatcher fall back to them', () => {
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
    const source = readFileSync('applied_challenge_source.jsx', 'utf8');
    expect(host).toContain("const [appliedChallengeFamily, setAppliedChallengeFamily] = useState('decide');");
    expect(host).toContain('appliedChallengeFamily, setAppliedChallengeFamily,');
    expect(host).toContain('View: window.AlloModules.AppliedChallengeView, studentResponses, studentWorkStatus,');
    expect(host).toContain('handleNoteUpdate, callGemini: studentAiFeaturesHidden ? null : callGemini, addToast, gradeLevel, t,');
    expect(dispatcher).toContain("_acAmbient(appliedChallengeFamily, 'decide')");
    expect(dispatcher).toContain("_acAmbient(appliedChallengeScope, 'standard')");
    expect(source).toContain('props.setAppliedChallengeFamily');
    expect(source).toContain('#applied-challenge-print-root');
  });
});

it('honors studio export toggles in both resource rendering and the table of contents', () => {
  const applied = render(challenge(), true, { includeAppliedChallenge: false });
  expect(applied).not.toContain('Which design best balances access and cost?');
  expect(new DOMParser().parseFromString(applied, 'text/html').querySelector('[id*="ac-export-1"], a[href*="ac-export-1"]')).toBeNull();
  const memory = render({ id: 'memory-excluded', type: 'memory-aid', title: 'Excluded memory target', data: { cards: [{ id: 'card', target: 'UNIQUE MEMORY TARGET', essentialFacts: ['A fact'] }] } }, true, { includeMemoryAid: false });
  expect(memory).not.toContain('UNIQUE MEMORY TARGET');
  expect(new DOMParser().parseFromString(memory, 'text/html').querySelector('[id*="memory-excluded"], a[href*="memory-excluded"]')).toBeNull();
});
