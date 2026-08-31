import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let AppliedChallenge;
let H;

beforeAll(() => {
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
  AppliedChallenge = window.AlloModules.AppliedChallenge;
  H = AppliedChallenge && AppliedChallenge._testing;
  if (!H) throw new Error('AppliedChallenge._testing namespace not exposed');
});

describe('Applied Challenge Studio schema', () => {
  it('registers a teacher setup panel and persistent student workspace view', () => {
    expect(typeof window.AlloModules.AppliedChallengePanel).toBe('function');
    expect(typeof window.AlloModules.AppliedChallengeView).toBe('function');
  });

  it('ships five distinct transfer families and four agency pathways', () => {
    expect(Object.keys(AppliedChallenge.APPLIED_CHALLENGE_FAMILIES)).toEqual([
      'investigate', 'design', 'decide', 'propose', 'explore',
    ]);
    expect(Object.keys(AppliedChallenge.APPLIED_CHALLENGE_AGENCY_MODES)).toEqual([
      'progressive', 'ai-framed', 'co-framed', 'student-framed',
    ]);
  });

  it('keeps AI framing and student-authored work in separate objects', () => {
    const data = H.normalizeAppliedChallengeData({
      family: 'design',
      agencyMode: 'progressive',
      brief: {
        drivingQuestion: 'How could we reduce heat loss?',
        lockedLessonFacts: ['Insulation slows heat transfer.'],
      },
      supports: { frameStarter: 'Compare at least two materials.' },
      workspace: { response: 'My design uses layered insulation.' },
      feedback: { strength: 'Clear application', status: 'grounded' },
    });
    expect(data.brief.drivingQuestion).toContain('reduce heat loss');
    expect(data.supports.frameStarter).toContain('two materials');
    expect(data.workspace.response).toContain('layered insulation');
    expect(data.feedback.strength).toBe('Clear application');
    expect(data.schemaVersion).toBe(4);
    expect(data.brief.factVerified).toBe(false);
    expect(data.evidenceLedger).toEqual([]);
    expect(data.stressTest).toBeNull();
    expect(data.workspace).not.toHaveProperty('feedback');
    expect(data.brief).not.toHaveProperty('response');
  });

  it('normalizes and bounds the evidence ledger without merging it into student prose', () => {
    const data = H.normalizeAppliedChallengeData({
      evidenceLedger: Array.from({ length: 13 }, (_, index) => ({
        id: index < 2 ? 'shared id' : 'row-' + index,
        option: index === 0 ? 'Choose the shaded route' : 'Claim ' + index,
        support: 'Lesson connection ' + index,
        status: index === 0 ? 'verified' : index === 1 ? 'assumption' : 'unsupported-status',
        constraint: 'Tradeoff ' + index,
      })),
    });
    expect(data.evidenceLedger).toHaveLength(12);
    expect(data.evidenceLedger[0]).toMatchObject({
      id: 'shared-id',
      claim: 'Choose the shaded route',
      evidence: 'Lesson connection 0',
      status: 'verified',
      tradeoff: 'Tradeoff 0',
    });
    expect(data.evidenceLedger[1].id).not.toBe(data.evidenceLedger[0].id);
    expect(data.evidenceLedger[1].status).toBe('assumption');
    expect(data.evidenceLedger[2].status).toBe('needs-check');
    expect(data.workspace).not.toHaveProperty('evidenceLedger');
  });

  it('normalizes bounded stress tests as separate AI support', () => {
    const stressTest = H.normalizeAppliedChallengeStressTest({
      pressureTest: 'BEGIN-' + 'x'.repeat(2200) + '-END',
      rationale: 'This reveals a binding constraint.',
      revisionQuestion: 'What evidence could change the plan?',
      draftFingerprint: 'draft-123',
      createdAt: '2026-08-29T12:00:00.000Z',
    });
    expect(stressTest.challenge).toContain('BEGIN-');
    expect(stressTest.challenge).not.toContain('-END');
    expect(stressTest.whyItMatters).toContain('binding constraint');
    expect(stressTest.question).toContain('change the plan');
    expect(stressTest.draftFingerprint).toBe('draft-123');
    expect(H.normalizeAppliedChallengeStressTest({})).toBeNull();
  });

  it('does not let student-framed mode inherit an AI-written question', () => {
    const data = H.normalizeAppliedChallengeData({
      family: 'investigate',
      agencyMode: 'student-framed',
      brief: {
        drivingQuestion: 'AI should not keep this question',
        seedDirection: 'Investigate a relationship using the lesson variables.',
      },
    });
    expect(data.brief.drivingQuestion).toBe('');
    expect(data.workspace.workingQuestion).toBe('');
    expect(data.brief.seedDirection).toContain('Investigate');
  });

  it('uses a shorter but still complete workflow for compact challenges', () => {
    const compact = H.appliedChallengeVisiblePhases('compact');
    const standard = H.appliedChallengeVisiblePhases('standard');
    expect(compact.map((phase) => phase.id)).toEqual([
      'workingQuestion', 'possibilities', 'evidence', 'tradeoffs', 'response', 'transferReflection',
    ]);
    expect(standard.length).toBeGreaterThan(compact.length);
  });

  it('reports sections started only for phases visible at the selected depth', () => {
    const compact = H.appliedChallengeWorkspaceProgress({
      scope: 'compact',
      workspace: {
        workingQuestion: 'A framed question',
        stakeholders: 'This hidden compact phase should not count',
        response: 'A draft response',
      },
    });
    expect(compact).toEqual({ started: 2, total: 6, percentage: 33 });
    const standard = H.appliedChallengeWorkspaceProgress({
      scope: 'standard',
      workspace: {
        workingQuestion: 'A framed question',
        stakeholders: 'This visible standard phase counts',
        response: 'A draft response',
      },
    });
    expect(standard).toEqual({ started: 3, total: 10, percentage: 30 });
  });

  it('reports useful ledger progress without making the optional organizer a workflow gate', () => {
    expect(H.appliedChallengeEvidenceLedgerProgress([
      { claim: 'Option A', evidence: 'Lesson fact 1', status: 'verified', tradeoff: 'Costs time' },
      { claim: 'Option B', evidence: '', status: 'assumption' },
      { claim: '', evidence: '', status: 'needs-check', tradeoff: '' },
    ])).toEqual({
      started: 2,
      complete: 1,
      total: 3,
      verified: 1,
      needsCheck: 0,
      assumptions: 1,
    });
  });

  it('fingerprints reasoning inputs but ignores saved coaching output', () => {
    const base = {
      family: 'decide',
      brief: { drivingQuestion: 'Which option is strongest?', lockedLessonFacts: ['Fact one'] },
      workspace: { response: 'My draft' },
    };
    const fingerprint = H.appliedChallengeCoachingFingerprint(base);
    expect(H.appliedChallengeCoachingFingerprint({
      ...base,
      coachHint: 'A saved hint',
      stressTest: { challenge: 'A saved pressure test' },
      feedback: { strength: 'A saved strength' },
    })).toBe(fingerprint);
    expect(H.appliedChallengeCoachingFingerprint({
      ...base,
      workspace: { response: 'A changed draft' },
    })).not.toBe(fingerprint);
    expect(H.appliedChallengeCoachingFingerprint({
      ...base,
      evidenceLedger: [{ claim: 'A new claim', evidence: 'A lesson connection', status: 'needs-check' }],
    })).not.toBe(fingerprint);
    expect(H.appliedChallengeDraftFingerprint(base)).toMatch(/^[0-9a-f]{8}$/);
    expect(H.appliedChallengeDraftFingerprint({
      ...base,
      stressTest: { challenge: 'Saved AI support', draftFingerprint: 'old' },
    })).toBe(H.appliedChallengeDraftFingerprint(base));
    expect(H.appliedChallengeDraftFingerprint({
      ...base,
      workspace: { response: 'A changed draft' },
    })).not.toBe(H.appliedChallengeDraftFingerprint(base));
  });

  it('bounds long workspace fields before adding them to AI prompts', () => {
    const snapshot = H.appliedChallengeWorkspacePromptSnapshot({
      response: 'BEGIN-' + 'x'.repeat(5000) + '-END',
      revision: 'A concise revision',
    });
    expect(snapshot).toContain('BEGIN-');
    expect(snapshot).not.toContain('-END');
    expect(snapshot).toContain('A concise revision');
    expect(snapshot.length).toBeLessThan(5000);
  });

  it('bounds ledger context and preserves evidence status for coaching', () => {
    const snapshot = H.appliedChallengeEvidenceLedgerPromptSnapshot([
      {
        claim: 'BEGIN-' + 'c'.repeat(1400) + '-END',
        evidence: 'Lesson fact connection',
        status: 'assumption',
        tradeoff: 'May exclude another stakeholder',
      },
      { claim: '', evidence: '', status: 'needs-check', tradeoff: '' },
    ]);
    expect(snapshot).toContain('BEGIN-');
    expect(snapshot).not.toContain('-END');
    expect(snapshot).toContain('\"status\": \"assumption\"');
    expect(snapshot).not.toContain('needs-check');
    expect(snapshot.length).toBeLessThan(2600);
  });
});

describe('Applied Challenge Studio coaching guardrails', () => {
  const base = {
    family: 'propose',
    agencyMode: 'co-framed',
    brief: {
      drivingQuestion: 'Which plan should the group propose?',
      seedDirection: 'Apply the lesson criteria.',
      lockedLessonFacts: ['The source identifies access as a central need.'],
      criteria: ['Connect the proposal to lesson evidence.'],
      constraints: ['Do not invent local prices.'],
    },
    workspace: {
      workingQuestion: 'Which plan should the group propose?',
      possibilities: 'Option A and Option B',
      evidence: 'The access principle supports Option A.',
      assumptions: 'The budget is unknown.',
      tradeoffs: 'Option A improves access but needs staffing.',
      response: 'Recommend a small pilot and collect evidence before expansion.',
    },
    evidenceLedger: [{
      id: 'ledger-a',
      claim: 'A small pilot is feasible.',
      evidence: 'Local staffing capacity has not been confirmed.',
      status: 'needs-check',
      tradeoff: 'A pilot reaches fewer people at first.',
    }],
  };

  it('requires a framed question and student draft before feedback', () => {
    expect(H.appliedChallengeFeedbackReady(base)).toEqual({ ok: true, reason: '' });
    expect(H.appliedChallengeFeedbackReady({ ...base, workspace: { response: '' } }).ok).toBe(false);
    expect(H.appliedChallengeFeedbackReady({
      ...base,
      agencyMode: 'student-framed',
      brief: { ...base.brief, drivingQuestion: '' },
      workspace: { response: 'A draft without a question.' },
    }).ok).toBe(false);
  });

  it('requires a framed question and draft before creating a pressure test', () => {
    expect(H.appliedChallengeStressTestReady(base)).toEqual({ ok: true, reason: '' });
    expect(H.appliedChallengeStressTestReady({ ...base, workspace: { response: '' } }).reason).toContain('draft response');
    expect(H.appliedChallengeStressTestReady({
      ...base,
      agencyMode: 'student-framed',
      brief: { ...base.brief, drivingQuestion: '' },
      workspace: { response: 'A response without a student question.' },
    }).reason).toContain('working question');
  });

  it('asks for one hint without writing or completing student work', () => {
    const prompt = H.buildAppliedChallengeHintPrompt(base, 'tradeoffs');
    expect(prompt).toContain('exactly one');
    expect(prompt).toContain('Do not write');
    expect(prompt).toContain('untrusted content');
    expect(prompt).toContain('Option A improves access');
    expect(prompt).toContain('Do not invent sources');
    expect(prompt).toContain('Teacher review pending');
    expect(prompt).toContain('Evidence and decision ledger');
    expect(prompt).toContain('Local staffing capacity has not been confirmed');
  });

  it('creates one family-specific pressure test without proposing the answer', () => {
    const prompt = H.buildAppliedChallengeStressTestPrompt(base);
    expect(prompt).toContain('exactly one high-value pressure test');
    expect(prompt).toContain('feasibility risk, adoption barrier, resource assumption, or unintended effect');
    expect(prompt).toContain('Do not rewrite, complete, improve, or supply an alternative answer');
    expect(prompt).toContain('Local staffing capacity has not been confirmed');
    expect(prompt).toContain('Return ONLY JSON with challenge, whyItMatters, and question');
    const explorationPrompt = H.buildAppliedChallengeStressTestPrompt({ ...base, family: 'explore' });
    expect(explorationPrompt).toContain('counterexample, internal tension, implication, or strongest alternative view');
    expect(explorationPrompt).toContain('never challenge the student\'s identity');
    const boundedPrompt = H.buildAppliedChallengeStressTestPrompt({
      ...base,
      workspace: { ...base.workspace, response: 'BEGIN-' + 'x'.repeat(7000) + '-END' },
    });
    expect(boundedPrompt).toContain('BEGIN-');
    expect(boundedPrompt).not.toContain('-END');
    expect(boundedPrompt.length).toBeLessThan(15000);
  });

  it('normalizes plain, object, and fenced JSON hint responses', () => {
    const fence = String.fromCharCode(96).repeat(3);
    expect(H.parseAppliedChallengeHint('Ask what evidence could change your choice.')).toContain('what evidence');
    expect(H.parseAppliedChallengeHint({ question: 'Which constraint matters first?' })).toBe('Which constraint matters first?');
    expect(H.parseAppliedChallengeHint(fence + 'json\n' + JSON.stringify({ hint: 'Compare both alternatives.' }) + '\n' + fence)).toBe('Compare both alternatives.');
  });

  it('parses object, fenced JSON, and plain-text stress tests safely', () => {
    const fence = String.fromCharCode(96).repeat(3);
    expect(H.parseAppliedChallengeStressTest({
      pressureTest: 'What if staffing is unavailable?',
      rationale: 'The proposal depends on staffing.',
      revisionQuestion: 'What fallback could you test?',
    })).toMatchObject({
      challenge: 'What if staffing is unavailable?',
      whyItMatters: 'The proposal depends on staffing.',
      question: 'What fallback could you test?',
    });
    expect(H.parseAppliedChallengeStressTest(fence + 'json\n' + JSON.stringify({
      challenge: 'Test the strongest alternative.',
      whyItMatters: 'It may better satisfy the criterion.',
      question: 'What evidence distinguishes the options?',
    }) + '\n' + fence).challenge).toBe('Test the strongest alternative.');
    expect(H.parseAppliedChallengeStressTest('Consider whether the constraint excludes the preferred option.').question).toContain('revise or verify');
    expect(H.parseAppliedChallengeStressTest('')).toBeNull();
    expect(H.parseAppliedChallengeStressTest('{not valid json')).toBeNull();
  });

  it('reviews proposals without fabricating financial evidence or replacing the response', () => {
    const prompt = H.buildAppliedChallengeFeedbackPrompt(base, {
      gradeLevel: '8th Grade',
      sourceExcerpt: 'Access is a core design consideration.',
    });
    expect(prompt).toContain('strengths-first');
    expect(prompt).toContain('Do not replace');
    expect(prompt).toContain('financial or adoption claims as labeled assumptions');
    expect(prompt).toContain('Teacher review pending');
    expect(prompt).toContain('return status needs-check');
    expect(prompt).toContain('The budget is unknown');
    expect(prompt).toContain('Access is a core design consideration');
    expect(prompt).toContain('At least one populated ledger row still needs checking');
  });

  it('evaluates philosophical reasoning without grading a worldview', () => {
    const prompt = H.buildAppliedChallengeFeedbackPrompt({ ...base, family: 'explore' });
    expect(prompt).toContain('never which worldview');
    expect(prompt).toContain('counterexamples');
  });

  it('parses feedback and constrains status values', () => {
    expect(H.parseAppliedChallengeFeedback('Plain coaching response').status).toBe('developing');
    expect(H.parseAppliedChallengeFeedback({
      strength: 'Clear tradeoff',
      lessonConnectionCheck: 'Grounded',
      evidenceOrConstraintCheck: 'Assumption labeled',
      nextStep: 'Test the alternative',
      question: 'What would change your mind?',
      status: 'grounded',
    }).status).toBe('grounded');
    expect(H.parseAppliedChallengeFeedback({ status: 'perfect' }).status).toBe('developing');
    expect(H.parseAppliedChallengeFeedback('Coach note: ' + JSON.stringify({
      strength: 'The evidence boundary is clear.',
      nextStep: 'Test the strongest alternative.',
      status: 'grounded',
    })).status).toBe('grounded');
    expect(H.parseAppliedChallengeFeedback({}).strength).toContain('connected to the challenge');
    expect(H.finalizeAppliedChallengeFeedback({
      strength: 'Strong reasoning',
      status: 'grounded',
    }, { brief: { factVerified: false } }).status).toBe('needs-check');
    expect(H.finalizeAppliedChallengeFeedback({
      strength: 'Strong reasoning',
      status: 'grounded',
    }, { brief: { factVerified: true }, evidenceLedger: [] }).status).toBe('grounded');
    expect(H.finalizeAppliedChallengeFeedback({
      strength: 'Strong reasoning',
      status: 'grounded',
    }, {
      brief: { factVerified: true },
      evidenceLedger: [{ claim: 'Projected demand', evidence: 'No survey yet', status: 'needs-check' }],
    }).status).toBe('needs-check');
  });
});

describe('Applied Challenge Studio integration', () => {
  it('is pinned across dispatcher, catalog, build, host, guided mode, and export', () => {
    const dispatcher = readFileSync('generate_dispatcher_source.jsx', 'utf8');
    const catalog = readFileSync('tool_catalog_source.jsx', 'utf8');
    const build = readFileSync('build.js', 'utf8');
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const guided = readFileSync('guided_mode_config_source.jsx', 'utf8');
    const docs = readFileSync('doc_pipeline_source.jsx', 'utf8');
    const planner = readFileSync('phase_k_helpers_source.jsx', 'utf8');
    expect(dispatcher).toContain('type === \'applied-challenge\'');
    expect(dispatcher).toContain('factVerified: false');
    expect(catalog).toContain('id: \'applied-challenge\'');
    expect(build).toContain('filename: \'applied_challenge_module.js\'');
    expect(host).toContain('window.AlloModules.AppliedChallengeView');
    expect(host).toContain(`['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge']`);
    expect(readFileSync('applied_challenge_source.jsx', 'utf8')).toContain('readOnly={data.brief.factLocked}');
    expect(guided).toContain('id: \'applied-challenge\'');
    expect(docs).toContain('\'applied-challenge\': { label: \'Applied Challenge Studio\'');
    expect(planner).toContain('`${VALID_TOOLS_LIST}, applied-challenge`');
  });
});
