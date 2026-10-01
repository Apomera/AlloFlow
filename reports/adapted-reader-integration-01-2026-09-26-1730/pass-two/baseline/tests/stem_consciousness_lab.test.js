import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_consciousness.js';
const TOOL_ID = 'consciousnessLab';

let config;

beforeEach(() => {
  resetStemLab();
  config = loadTool(TOOL_FILE, TOOL_ID);
});

function renderView(gradeLevel, activeView, state = {}) {
  return renderTool(
    TOOL_ID,
    { consciousnessLab: { activeView, ...state } },
    { gradeLevel },
  );
}

describe('Consciousness Lab registration and grade adaptation', () => {
  it('registers a complete, discoverable STEM Lab plugin contract', () => {
    expect(config).toMatchObject({
      id: TOOL_ID,
      label: 'Consciousness Theory Lab',
      title: 'Consciousness Theory Lab',
      icon: '💭',
      category: 'science',
      color: 'violet',
      gradeRange: 'K-Graduate',
      ready: true,
    });
    expect(config.desc).toMatch(/scientific theories and philosophical views/i);
    expect(config.aliases).toEqual(expect.arrayContaining([
      'consciousness',
      'phenomenal consciousness',
      'global workspace',
      'integrated information',
    ]));
    expect(config.render).toBeTypeOf('function');
    expect(config.testHooks).toMatchObject({
      resolveProfile: expect.any(Function),
      parseGradeNumber: expect.any(Function),
      availableTheoryIds: expect.any(Function),
      copyFor: expect.any(Function),
      caseIdsFor: expect.any(Function),
      evidenceLadderLabels: ['Established', 'Suggestive', 'Disputed', 'Unknown'],
      guidedDebateFields: ['positionA', 'positionB', 'evidence', 'uncertainty'],
      debateMinimumFor: expect.any(Function),
      debateReadyFor: expect.any(Function),
    });
  });

  it.each([
    ['Kindergarten', 'early', 'K-2 explorer'],
    ['5th Grade', 'elementary', 'Grades 3-5 investigator'],
    ['8th Grade', 'middle', 'Grades 6-8 analyst'],
    ['12th Grade', 'high', 'Grades 9-12 scholar'],
    ['College', 'college', 'College seminar'],
    ['Graduate Level', 'graduate', 'Graduate research lens'],
  ])('resolves %s to the %s learning profile', (grade, profileId, label) => {
    const profile = config.testHooks.resolveProfile(grade);
    expect(profile).toMatchObject({ id: profileId, label });
    expect(profile.intro.length).toBeGreaterThan(40);
    expect(profile.vocabulary.length).toBeGreaterThanOrEqual(4);
    expect(profile.targets.length).toBeGreaterThanOrEqual(3);
  });

  it('materially expands theory breadth, terminology, and explanatory depth', () => {
    const grades = ['Kindergarten', '5th Grade', '8th Grade', '12th Grade', 'College', 'Graduate Level'];
    const profiles = grades.map((grade) => config.testHooks.resolveProfile(grade));
    const theoryCounts = grades.map((grade) => config.testHooks.availableTheoryIds(grade).length);

    expect(theoryCounts).toEqual([4, 6, 10, 11, 12, 13]);
    expect(config.testHooks.availableTheoryIds('Kindergarten')).not.toContain('functionalism');
    expect(config.testHooks.availableTheoryIds('5th Grade')).toContain('functionalism');
    expect(config.testHooks.availableTheoryIds('College')).toContain('biological');
    expect(config.testHooks.availableTheoryIds('Graduate Level')).toContain('neutral');
    expect(new Set(profiles.map((profile) => profile.intro)).size).toBe(grades.length);
    expect(profiles[0].vocabulary).toContain('clue');
    expect(profiles[2].vocabulary).toContain('phenomenal consciousness');
    expect(profiles[4].vocabulary).toContain('operationalization');
    expect(profiles[5].vocabulary).toContain('causal identifiability');

    const earlyGnw = config.testHooks.copyFor('gnw', 'Kindergarten');
    const elementaryGnw = config.testHooks.copyFor('gnw', '5th Grade');
    const middleGnw = config.testHooks.copyFor('gnw', '8th Grade');
    const highGnw = config.testHooks.copyFor('gnw', '12th Grade');
    const collegeGnw = config.testHooks.copyFor('gnw', 'College');
    const graduateGnw = config.testHooks.copyFor('gnw', 'Graduate Level');

    expect(earlyGnw).not.toHaveProperty('mechanism');
    expect(elementaryGnw.mechanism).toMatch(/amplified and broadcast/i);
    expect(middleGnw.target).toMatch(/access consciousness/i);
    expect(highGnw.challenge).toMatch(/report-independent|phenomenality/i);
    expect(collegeGnw.evidence).toMatch(/operational contrasts/i);
    expect(graduateGnw.prediction).toMatch(/preregister/i);
  });

  it('renders genuinely different knowledge checks at each selected level', () => {
    const levels = [
      ['Kindergarten', 'What is evidence?', 3],
      ['5th Grade', 'What does GNWT emphasize?', 4],
      ['8th Grade', 'Which best describes access consciousness?', 5],
      ['12th Grade', 'Which result would most directly discriminate GNWT from RPT?', 6],
      ['College', 'Which is a constitutive rather than merely evidential claim?', 6],
      ['Graduate Level', 'What threatens construct validity in a seen/unseen contrast?', 6],
    ];

    const outputs = levels.map(([grade, anchor, count]) => {
      const html = renderView(grade, 'check');
      expect(html).toContain(anchor);
      expect((html.match(/<fieldset/g) || []).length).toBe(count);
      expect(html).toContain('GRADE-ADAPTED CHECK');
      return html;
    });

    expect(new Set(outputs).size).toBe(levels.length);
  });

  it('adapts the case inventory and core cases to the selected reading level', () => {
    expect(config.testHooks.caseIdsFor('Kindergarten')).toEqual([
      'green-light',
      'animal-moral-patient',
      'ai-emotion',
      'masking',
    ]);
    expect(config.testHooks.caseIdsFor('8th Grade')).toContain('dream');
    expect(config.testHooks.caseIdsFor('8th Grade')).not.toContain('jspace');
    expect(config.testHooks.caseIdsFor('12th Grade')).toEqual(expect.arrayContaining([
      'green-light',
      'animal-moral-patient',
      'ai-emotion',
      'jspace',
    ]));

    const earlyGreen = renderView('Kindergarten', 'cases', { selectedCase: 'green-light' });
    const graduateGreen = renderView('Graduate Level', 'cases', { selectedCase: 'green-light' });
    const earlyAnimal = renderView('Kindergarten', 'cases', { selectedCase: 'animal-moral-patient' });
    const graduateAnimal = renderView('Graduate Level', 'cases', { selectedCase: 'animal-moral-patient' });

    expect(earlyGreen).toContain('At a crosswalk, Maya looks at a green light.');
    expect(graduateGreen).toContain('Design a preregistered within-subject study');
    expect(earlyAnimal).toContain('A dog hurts its paw');
    expect(graduateAnimal).toContain('Cross-species construct validity and moral patiency');
  });

  it('shows every available theory as a named interpretation of the selected case', () => {
    const html = renderView('12th Grade', 'cases', { selectedCase: 'green-light' });

    expect(html).toContain('How each theory reads this case');
    expect(html).toContain('Global Neuronal Workspace Theory');
    expect(html).toContain('Recurrent Processing Theory');
    expect(html).toContain('Integrated Information Theory');
    expect(html).toContain('Functionalism');
    expect(html).toContain('GNWT asks whether the green representation');
    expect(html).toContain('This is the theory’s interpretation, not an extra observation.');
  });

  // Recovered 2026-08-17 from an abandoned Codex worktree (.codex/worktrees/92da,
  // Aug 3). The portfolio shipped and then lost its only test when this file was
  // rewritten: 30 references in the tool and zero coverage here.
  // The original asserted through config.testHooks.portfolioMinimumFor /
  // portfolioCompleteFor. Neither is on testHooks in the shipped tool (the
  // surviving analogues are debateMinimumFor/debateReadyFor, and the portfolio
  // equivalent is a local portfolioMinimumForProfile), so this drives the render
  // path instead. That is the better seam anyway: it asserts what a learner sees
  // and needs no production change to make the tool testable.
  it('collects grade-isolated artifacts into a claim-evidence-uncertainty portfolio', () => {
    const middleSynthesis = {
      claim: 'C'.repeat(28),
      evidence: 'E'.repeat(28),
      uncertainty: 'U'.repeat(28),
    };
    const portfolioState = {
      selectedTheory: 'gnw',
      mapSessions: {
        middle: { interactions: 2, reflection: 'Two theories overlap on access but differ in proposed mechanism.' },
      },
      portfolioSynthesis: { middle: middleSynthesis },
    };

    const empty = renderView('Kindergarten', 'portfolio');
    const middle = renderView('8th Grade', 'portfolio', portfolioState);
    const graduate = renderView('Graduate Level', 'portfolio');

    // The early-grades folder speaks plainly and starts at zero.
    expect(empty).toContain('My consciousness learning folder');
    expect(empty).toContain('Your folder shows your thinking today.');

    // Artifacts accumulate per grade profile rather than globally.
    expect(middle).toContain('Consciousness Learning Portfolio');
    expect(middle).toContain('artifacts ready');
    expect(middle).toContain('Portfolio synthesis complete');

    // The epistemic framing has to survive: a learner portfolio is not a
    // scientific finding, and the tool says so on the artifact itself.
    expect(middle).toContain('Learner-authored, not scientific consensus');
    expect(middle).toContain('provisional and evidence-calibrated');

    // Graduate level asks for a stricter, identification-aware account, and the
    // same synthesis that satisfies 8th grade does not satisfy it.
    expect(graduate).toContain('Current model-relative position');
    expect(graduate).toContain('Evidential chain and identification limits');
    expect(graduate).not.toContain('Portfolio synthesis complete');
  });

  // Also from the abandoned worktree, which tested knowledge-check completion
  // through a knowledgeCheckCompleteFor hook that is no longer exported and a
  // completedChecks state key that no longer exists. completedCheckCount IS on
  // testHooks and had no coverage at all, so this tests the shipped contract
  // rather than resurrecting the old one. It gates progress, so a silent change
  // here would over- or under-credit a learner.
  it('counts completed knowledge checks from either the flag or the per-view map', () => {
    const count = config.testHooks.completedCheckCount;
    // Legacy shape: a single boolean means one completed check.
    expect(count({ checkComplete: true })).toBe(1);
    // Per-view shape: only truthy entries count.
    expect(count({ checkComplete: { early: true, middle: true, graduate: false } })).toBe(2);
    expect(count({ checkComplete: { early: false } })).toBe(0);
    // Nothing recorded is zero, not a crash, on every empty-ish shape.
    expect(count({ checkComplete: {} })).toBe(0);
    expect(count({})).toBe(0);
    expect(count(null)).toBe(0);
    expect(count(undefined)).toBe(0);
    // A false flag must not be read as the object form.
    expect(count({ checkComplete: false })).toBe(0);
  });

  // Restored 2026-08-17. VOCAB_GLOSSARY and the .cns-glossary-detail styles
  // shipped in the "Consciousness merge" with no code reading them, so ~20
  // authored terms sat dead in the bundle. This pins the reader AND the render,
  // because the data being present is exactly what did NOT prove it was live.
  it('turns each grade path vocabulary into an interactive, example-based glossary', () => {
    expect(config.testHooks.glossaryFor('clue')).toMatchObject({
      term: 'clue',
      definition: expect.stringMatching(/observed or measured/i),
      example: expect.stringMatching(/brain signal|report/i),
    });
    expect(config.testHooks.glossaryFor('causal identifiability')).toMatchObject({
      definition: expect.stringMatching(/distinguish the causal effect/i),
    });
    // An unknown term returns null rather than a half-built entry.
    expect(config.testHooks.glossaryFor('not-a-term')).toBeNull();

    const early = renderView('Kindergarten', 'learn');
    const graduate = renderView('Graduate Level', 'learn', { selectedVocab: 'causal identifiability' });

    // The terms are real controls, not inert text: they carry pressed state and
    // are keyboard-operable because they are buttons.
    expect(early).toContain('aria-pressed');
    expect(early).toContain('WORD EXPLORER');
    expect(early).toContain('A state in which a person is usually ready to have experiences and respond.');

    // Graduate level gets the same mechanism with its own vocabulary.
    expect(graduate).toContain('INTERACTIVE GLOSSARY');
    expect(graduate).toContain('distinguish the causal effect');
  });
});

describe('Consciousness Lab epistemic neutrality and frontier cases', () => {
  it('provides a four-rung evidence ladder distinct from the claim-type sorter', () => {
    expect(config.testHooks.evidenceLadderLabels).toEqual([
      'Established',
      'Suggestive',
      'Disputed',
      'Unknown',
    ]);

    const early = renderView('Kindergarten', 'evidence');
    const graduate = renderView('Graduate Level', 'evidence');
    for (const label of config.testHooks.evidenceLadderLabels) {
      expect(early).toContain(label);
      expect(graduate).toContain(label);
    }
    expect(early).toContain('A current AI helper feels emotions from the inside.');
    expect(graduate).toContain('Current AI systems possess phenomenal consciousness or felt valence.');
    expect(graduate).toContain('A rung describes confidence in this precise claim');
  });

  it('requires two distinct articulated positions, evidence, and uncertainty to finish a debate', () => {
    expect(config.testHooks.debateMinimumFor('Kindergarten')).toBe(10);
    expect(config.testHooks.debateMinimumFor('5th Grade')).toBe(18);
    expect(config.testHooks.debateMinimumFor('Graduate Level')).toBe(28);

    const earlyDebate = {
      theoryA: 'gnw',
      theoryB: 'rpt',
      positionA: 'A fair idea.',
      positionB: 'Other idea.',
      evidence: 'A clue plus limit.',
      uncertainty: 'Still unknown.',
    };
    expect(config.testHooks.debateReadyFor('Kindergarten', earlyDebate)).toBe(true);
    expect(config.testHooks.debateReadyFor('Graduate Level', earlyDebate)).toBe(false);
    expect(config.testHooks.debateReadyFor('Graduate Level', {
      ...earlyDebate,
      positionA: 'A'.repeat(28),
      positionB: 'B'.repeat(28),
      evidence: 'E'.repeat(28),
      uncertainty: 'U'.repeat(28),
    })).toBe(true);
    expect(config.testHooks.debateReadyFor('Kindergarten', {
      ...earlyDebate,
      theoryB: 'gnw',
    })).toBe(false);

    const html = renderView('8th Grade', 'cases', { selectedCase: 'green-light' });
    expect(html).toContain('Guided two-position debate');
    expect(html).toContain('1. Fair account of');
    expect(html).toContain('2. Fair account of');
    expect(html).toContain('3. Evidence and limit');
    expect(html).toContain('4. Uncertainty and next test');
    expect(html).toContain('Finish guided debate');
  });

  it('keeps empirical evidence, theoretical interpretation, and open questions distinct', () => {
    const html = renderView('12th Grade', 'evidence', {
      evidenceAnswers: {
        'mask-result': 'evidence',
        'broadcast-proof': 'claim',
        'other-minds': 'question',
      },
    });

    expect(html).toContain('Empirical result');
    expect(html).toContain('Theory-based interpretation');
    expect(html).toContain('Unresolved question');
    expect(html).toContain('This is an empirical result.');
    expect(html).toContain('This goes beyond the result.');
    expect(html).toContain('No agreed experiment currently settles this question.');

    const boundaries = renderView('12th Grade', 'sources');
    expect(boundaries).toContain('No current scientific theory has been established as the complete explanation of consciousness.');
    expect(boundaries).toContain('A reasoning tool that tests implications or concepts; it is not empirical evidence');
  });

  it('states the AI-emotion caveat without ruling experience in or out by assertion', () => {
    const html = renderView('12th Grade', 'cases', { selectedCase: 'ai-emotion' });

    expect(html).toContain('functional equivalence is not phenomenal proof');
    expect(html).toContain('There is no scientific consensus that current AI has subjective feelings.');
    expect(html).toContain('emotion-like behavior or functions; this alone does not settle whether it felt anything');
  });

  it('frames the 2026 J-space result as access-like evidence, not phenomenal proof', () => {
    const html = renderView('12th Grade', 'cases', { selectedCase: 'jspace' });

    expect(html).toContain('J-space (2026)');
    expect(html).toContain('functional hallmarks associated with access-conscious/global-workspace processing');
    expect(html).toContain('Not established: phenomenal consciousness, subjective feeling, or AI emotion.');
    expect(html).toContain('New vendor-authored preprint; model- and method-specific.');
    expect(html).toContain('experiments do not show experience or feeling');
  });
});

describe('Workspace Bench simulation', () => {
  const sim = (cfg) => config.testHooks.runWorkspaceSim(cfg);

  it('clamps and defaults every control value', () => {
    const n = config.testHooks.normalizeSimConfig;
    expect(n(undefined)).toEqual({
      substrate: 'human', strength: 65, interference: 30, topDown: 45,
      reportRequired: true, bypass: false,
    });
    expect(n({ strength: 999, interference: -50, topDown: 'x' }))
      .toMatchObject({ strength: 100, interference: 0, topDown: 45 });
    expect(n({ substrate: 'nonsense' }).substrate).toBe('human');
  });

  it('produces an all-or-none ignition step rather than a linear ramp', () => {
    expect(sim({ strength: 40, interference: 25 }).markers.ignited).toBe(false);
    expect(sim({ strength: 50, interference: 25 }).markers.ignited).toBe(false);
    expect(sim({ strength: 60, interference: 25 }).markers.ignited).toBe(true);
    expect(sim({ strength: 100, interference: 25 }).markers.ignited).toBe(true);
  });

  it('is deterministic: identical settings give identical markers', () => {
    const a = sim({ strength: 72, interference: 33, topDown: 51 }).markers;
    const b = sim({ strength: 72, interference: 33, topDown: 51 }).markers;
    expect(a).toEqual(b);
  });

  it('runs both substrates on identical arithmetic, so markers converge', () => {
    const cfg = { strength: 85, interference: 15, topDown: 50 };
    const human = sim(Object.assign({}, cfg, { substrate: 'human' })).markers;
    const model = sim(Object.assign({}, cfg, { substrate: 'model' })).markers;
    expect(model).toEqual(human);
  });

  it('drops late markers but not recurrence when report is switched off', () => {
    const withReport = sim({ strength: 90, interference: 0 }).markers;
    const noReport = sim({ strength: 90, interference: 0, reportRequired: false }).markers;

    expect(noReport.recurrence).toBeCloseTo(withReport.recurrence, 5);
    expect(noReport.workspace).toBeCloseTo(withReport.workspace, 5);
    expect(noReport.output).toBeLessThan(withReport.output / 3);
  });

  it('dissociates local recurrence from global availability under masking and sedation', () => {
    const masked = sim({ strength: 90, interference: 95 }).markers;
    expect(masked.sensory).toBeGreaterThan(0.5);
    expect(masked.recurrence).toBeLessThan(0.3);
    expect(masked.ignited).toBe(false);

    const sedated = sim({ substrate: 'human', strength: 90, interference: 0, bypass: true }).markers;
    expect(sedated.recurrence).toBeGreaterThan(0.7);
    expect(sedated.workspace).toBeLessThan(0.1);
    expect(sedated.ignited).toBe(false);
  });

  it('collapses the verbalizable readout for non-verbalizable model content', () => {
    const open = sim({ substrate: 'model', strength: 90, interference: 0 }).markers;
    const closed = sim({ substrate: 'model', strength: 90, interference: 0, bypass: true }).markers;

    expect(closed.recurrence).toBeCloseTo(open.recurrence, 5);
    expect(closed.workspace).toBeCloseTo(open.workspace, 5);
    expect(closed.monitor).toBeLessThan(open.monitor / 3);
  });

  it('never applies a pass/fail criterion to a metaphysical view', () => {
    const cfg = { strength: 90, interference: 0 };
    expect(config.testHooks.simTheoryReadoutFor('gnw', cfg).met).toBe(true);
    expect(config.testHooks.simTheoryReadoutFor('gnw', { strength: 20 }).met).toBe(false);

    ['iit', 'predictive', 'functionalism', 'dualism', 'panpsychism', 'illusionism', 'neutral'].forEach((id) => {
      expect(config.testHooks.simTheoryReadoutFor(id, cfg).met).toBe(null);
    });
  });

  it('renders the bench without claiming the simulation measures experience', () => {
    const html = renderView('11th Grade', 'bench');

    expect(html).toContain('Workspace Bench');
    expect(html).toContain('Not measured');
    expect(html).toContain('Felt experience');
    expect(html).toContain('not PCI');
    expect(html).toContain('What this bench cannot show');
  });

  it('keeps the youngest reading path on a simplified bench', () => {
    const html = renderView('1st Grade', 'bench');

    expect(html).toContain('It is not a real brain');
    expect(html).not.toContain('What each view would say about this run');
    expect(html).not.toContain('Integration index');
  });
});

describe('Progress tracking rewards correctness, not participation', () => {
  const hook = (id) => config.questHooks.find((q) => q.id === id);

  it('requires correct answers before the sorting quests complete', () => {
    const sort = hook('evidence_sort');
    expect(sort.check({ evidenceAnswers: { 'mask-result': 'claim', 'broadcast-proof': 'evidence', 'other-minds': 'claim', 'pci-result': 'claim' } })).toBe(false);
    expect(sort.check({ evidenceAnswers: { 'mask-result': 'evidence', 'broadcast-proof': 'claim', 'other-minds': 'question', 'pci-result': 'evidence' } })).toBe(true);

    const ladder = hook('evidence_ladder');
    expect(ladder.check({ evidenceLadderAnswers: { 'brain-dependence': 'Unknown', 'complexity-mechanism': 'Unknown', 'frontal-necessity': 'Unknown', 'current-ai-feeling': 'Unknown' } })).toBe(false);
    expect(ladder.check({ evidenceLadderAnswers: { 'brain-dependence': 'Established', 'complexity-mechanism': 'Suggestive', 'frontal-necessity': 'Disputed', 'current-ai-feeling': 'Unknown' } })).toBe(true);
  });

  it('does not count comparing a theory with itself', () => {
    const compare = hook('compare_theories');
    expect(compare.check({ compareCount: 3, compareA: 'gnw', compareB: 'gnw' })).toBe(false);
    expect(compare.check({ compareCount: 1, compareA: 'gnw', compareB: 'iit' })).toBe(true);
  });

  it('tracks knowledge-check completion per reading path and honours legacy saves', () => {
    const check = hook('knowledge_check');
    expect(check.check({})).toBe(false);
    expect(check.check({ checkComplete: {} })).toBe(false);
    expect(check.check({ checkComplete: { high: true } })).toBe(true);
    expect(check.check({ checkComplete: true })).toBe(true);
  });

  it('completes the bench quest only after both substrates and a no-report run', () => {
    const bench = hook('workspace_bench');
    expect(bench.check({ simFlags: { human: true } })).toBe(false);
    expect(bench.check({ simFlags: { human: true, model: true } })).toBe(false);
    expect(bench.check({ simFlags: { human: true, model: true, noReport: true } })).toBe(true);
  });
});

describe('Theory journey placement', () => {
  it('highlights a stage only for scientific theories that claim one', () => {
    expect(config.testHooks.journeyStagesFor('gnw')).toEqual(['global']);
    expect(config.testHooks.journeyStagesFor('rpt')).toEqual(['recurrence']);
    expect(config.testHooks.journeyStagesFor('predictive')).toEqual([]);
    expect(config.testHooks.journeyStagesFor('dualism')).toEqual([]);
  });

  it('explains itself instead of silently highlighting nothing', () => {
    expect(config.testHooks.journeyNoteFor('gnw')).toBe(null);
    expect(config.testHooks.journeyNoteFor('predictive')).toContain('does not single out one turning point');
    expect(config.testHooks.journeyNoteFor('dualism')).toContain('not a proposal about where on this journey');
    expect(config.testHooks.journeyNoteFor('panpsychism')).toContain('intrinsic integration');
  });
});

describe('Workspace Bench presets', () => {
  const sim = (cfg) => config.testHooks.runWorkspaceSim(cfg);
  const preset = (id) => config.testHooks.simPresetById(id);

  it('gates presets by reading path', () => {
    const early = config.testHooks.simPresetIdsFor('1st Grade');
    expect(early).toEqual(['clear', 'masked']);

    const middle = config.testHooks.simPresetIdsFor('7th Grade');
    expect(middle).toContain('noreport');
    expect(middle).toContain('threshold');
    expect(middle).not.toContain('non-verbalizable');

    const high = config.testHooks.simPresetIdsFor('11th Grade');
    expect(high).toContain('non-verbalizable');
    expect(high).toContain('attention-starved');
  });

  it('gives every preset a full copy set, including plain language', () => {
    config.testHooks.simPresetIdsFor('Graduate').forEach((id) => {
      const p = preset(id);
      expect(p.icon, id).toBeTruthy();
      expect(p.label, id).toBeTruthy();
      expect(p.plainLabel, id).toBeTruthy();
      expect(p.asks, id).toBeTruthy();
      expect(p.note, id).toBeTruthy();
      expect(p.plainNote, id).toBeTruthy();
    });
  });

  it('stores a complete control state so a preset never inherits stray dials', () => {
    config.testHooks.simPresetIdsFor('Graduate').forEach((id) => {
      const c = preset(id).config;
      ['substrate', 'strength', 'interference', 'topDown', 'reportRequired', 'bypass']
        .forEach((key) => expect(c[key], id + '.' + key).toBeDefined());
    });
  });

  it('actually produces the dissociation each preset claims', () => {
    const clear = sim(preset('clear').config).markers;
    expect(clear.ignited).toBe(true);

    // masked: early sweep survives, everything downstream collapses
    const masked = sim(preset('masked').config).markers;
    expect(masked.sensory).toBeGreaterThan(0.5);
    expect(masked.ignited).toBe(false);

    // threshold: subthreshold, but +10 strength ignites (all-or-none, not a ramp)
    const thr = preset('threshold').config;
    expect(sim(thr).markers.ignited).toBe(false);
    expect(sim({ ...thr, strength: thr.strength + 10 }).markers.ignited).toBe(true);

    // no-report: late markers fall, recurrence does not
    const noreport = sim(preset('noreport').config).markers;
    expect(noreport.recurrence).toBeCloseTo(clear.recurrence, 5);
    expect(noreport.output).toBeLessThan(clear.output / 3);

    // sedated: recurrence holds, global availability collapses
    const sedated = sim(preset('sedated').config).markers;
    expect(sedated.recurrence).toBeGreaterThan(0.7);
    expect(sedated.ignited).toBe(false);

    // non-verbalizable: workspace ignites, self-monitor readout collapses
    const nv = sim(preset('non-verbalizable').config).markers;
    expect(nv.ignited).toBe(true);
    expect(nv.monitor).toBeLessThan(clear.monitor / 3);

    // attention withdrawn: same signal fails to ignite without top-down gain
    const starved = preset('attention-starved').config;
    expect(sim(starved).markers.ignited).toBe(false);
    expect(sim({ ...starved, topDown: 60 }).markers.ignited).toBe(true);
  });

  it('renders preset buttons with the question stated before the numbers', () => {
    const html = renderView('11th Grade', 'bench');
    expect(html).toContain('Set up a known comparison');
    expect(html).toContain('Backward masking');
    expect(html).toContain('Non-verbalizable content');
    expect(html).toContain('a bench you interpret after the fact can seem to confirm anything');
  });

  it('shows the youngest path only its two presets, in plain words', () => {
    const html = renderView('1st Grade', 'bench');
    expect(html).toContain('Try one of these');
    expect(html).toContain('Easy to see');
    expect(html).toContain('Covered up');
    expect(html).not.toContain('Backward masking');
    expect(html).not.toContain('No-report paradigm');
  });
});

describe('3D network view', () => {
  const nodes = (s) => config.testHooks.networkNodesFor(s);
  const STAGES = ['sensory', 'recurrent', 'workspace', 'monitor', 'output'];

  it('lays out both substrates from the same five stages', () => {
    ['human', 'model'].forEach((s) => {
      const ns = nodes(s);
      expect(ns.length, s).toBeGreaterThan(10);
      const seen = new Set(ns.map((n) => n.stage));
      STAGES.forEach((stage) => expect(seen.has(stage), s + ' missing ' + stage).toBe(true));
      ns.forEach((n) => {
        expect(STAGES).toContain(n.stage);
        ['x', 'y', 'z'].forEach((ax) => expect(Number.isFinite(n[ax]), n.id + '.' + ax).toBe(true));
      });
      expect(new Set(ns.map((n) => n.id)).size, s + ' duplicate ids').toBe(ns.length);
    });
  });

  it('shows global availability as a distributed population, not one node', () => {
    // GNWT's claim is that the content becomes broadly available. If the view
    // drew that as a single sphere it would be picturing the rival claim.
    const ws = nodes('human').filter((n) => n.stage === 'workspace');
    expect(ws.length).toBeGreaterThanOrEqual(5);
    const spanX = Math.max(...ws.map((n) => n.x)) - Math.min(...ws.map((n) => n.x));
    expect(spanX).toBeGreaterThan(0.6);
  });

  it('opens on the busiest tick, not the drained tail', () => {
    const cfg = { substrate: 'human', strength: 85, interference: 10, topDown: 60 };
    const idx = config.testHooks.peakTickIndexFor(cfg);
    const run = config.testHooks.runWorkspaceSim(cfg);
    const sum = (t) => STAGES.reduce((a, k) => a + (t[k] || 0), 0);
    expect(idx).toBeLessThan(run.ticks.length - 1);
    run.ticks.forEach((t) => expect(sum(t)).toBeLessThanOrEqual(sum(run.ticks[idx]) + 1e-9));
  });

  it('drives every node from its own stage value, clamped to 0..1', () => {
    const cfg = { substrate: 'human', strength: 85, interference: 10, topDown: 60 };
    const levels = config.testHooks.networkLevelsFor('human', cfg);
    const ns = nodes('human');
    expect(Object.keys(levels).length).toBe(ns.length);
    Object.keys(levels).forEach((id) => {
      expect(levels[id]).toBeGreaterThanOrEqual(0);
      expect(levels[id]).toBeLessThanOrEqual(1);
    });
    // nodes sharing a stage must share a level - the view must not invent variation
    const byStage = {};
    ns.forEach((n) => { (byStage[n.stage] = byStage[n.stage] || []).push(levels[n.id]); });
    Object.keys(byStage).forEach((stage) => {
      const vals = byStage[stage];
      vals.forEach((v) => expect(v, stage).toBeCloseTo(vals[0], 10));
    });
  });

  it('renders a masked run with early stages lit and later stages dark', () => {
    const masked = { substrate: 'human', strength: 85, interference: 90, topDown: 60 };
    const levels = config.testHooks.networkLevelsFor('human', masked);
    const ns = nodes('human');
    const at = (stage) => levels[ns.find((n) => n.stage === stage).id];

    expect(at('sensory')).toBeGreaterThan(0.5);
    expect(at('workspace')).toBeLessThan(0.2);
    expect(at('output')).toBeLessThan(0.2);
  });

  it('separates masked from sedated on the recurrence stage', () => {
    const ns = nodes('human');
    const rec = (cfg) => config.testHooks.networkLevelsFor('human', cfg)[ns.find((n) => n.stage === 'recurrent').id];

    const masked = rec({ substrate: 'human', strength: 85, interference: 90, topDown: 60 });
    const sedated = rec({ substrate: 'human', strength: 85, interference: 10, topDown: 60, bypass: true });

    // The two presets must not look alike: this is the whole point of drawing it.
    expect(sedated).toBeGreaterThan(masked * 2);
  });

  it('keeps the numeric table as the non-visual equivalent and labels the diagram schematic', () => {
    const html = renderView('11th Grade', 'bench');
    expect(html).toContain('Watch it propagate');
    expect(html).toContain('Position is schematic');
    expect(html).toContain('role="img"');
    expect(html).toContain('Step through the run');
    // the accessible marker table still ships alongside the canvas
    expect(html).toContain('Peak activity by stage');
  });

  it('omits the 3D view on the youngest reading path', () => {
    const html = renderView('1st Grade', 'bench');
    expect(html).not.toContain('Watch it propagate');
    expect(html).not.toContain('Step through the run');
  });
});

describe('Accessibility regressions', () => {
  // These pin the two defects the axe sweep found on the live tool, plus the
  // AT contract for the 3D surface. Colour values are asserted directly because
  // jsdom cannot compute contrast, and the failures here were contrast failures.
  const CONTRAST_FIXED = { light: '#92400e', dark: '#fbbf24', contrast: '#facc15' };

  it('themes the OPEN QUESTION label instead of hard-coding an amber that fails AA', () => {
    // #d97706 measured 2.90:1 on the light raised surface for 9px bold text.
    const light = renderView('11th Grade', 'learn');
    expect(light).not.toContain('#d97706');
    expect(light).toContain(CONTRAST_FIXED.light);

    const dark = renderTool(TOOL_ID, { consciousnessLab: { activeView: 'learn' } },
      { gradeLevel: '11th Grade', isDark: true });
    expect(dark).toContain(CONTRAST_FIXED.dark);

    const contrast = renderTool(TOOL_ID, { consciousnessLab: { activeView: 'learn' } },
      { gradeLevel: '11th Grade', isContrast: true });
    expect(contrast).toContain(CONTRAST_FIXED.contrast);
  });

  it('puts role=tabpanel only on elements that allow it', () => {
    const html = renderView('11th Grade', 'cases');
    // <article role="tabpanel"> is not an allowed role pairing, so the mapping
    // was dropped from the accessibility tree entirely.
    expect(html).not.toMatch(/<article[^>]*role="tabpanel"/);
    expect(html).toMatch(/<div[^>]*id="cns-case-panel"[^>]*role="tabpanel"/);
  });

  it('points every tab at a panel id that is actually rendered', () => {
    ['learn', 'cases', 'bench'].forEach((view) => {
      const html = renderView('11th Grade', view);
      const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
      expect(controls.length).toBeGreaterThan(0);
      new Set(controls).forEach((id) => {
        expect(html, view + ' references missing panel ' + id).toContain('id="' + id + '"');
      });
    });
  });

  it('keeps the 3D canvas out of the accessibility tree behind a described container', () => {
    const html = renderView('11th Grade', 'bench');
    expect(html).toMatch(/class="cns-net-stage"[^>]*role="img"/);
    expect(html).toContain('aria-label="Schematic three-dimensional network');
    // the text equivalent must ship alongside it, not instead of it
    expect(html).toContain('Peak activity by stage');
    expect(html).toContain('Step through the run');
  });

  it('gives the source links a 24px target', () => {
    // The stylesheet is injected into document.head, not returned in the markup.
    renderView('11th Grade', 'sources');
    const sheet = document.getElementById('consciousness-lab-styles');
    expect(sheet).toBeTruthy();
    expect(sheet.textContent).toContain('.cns-sources a{display:inline-block;padding:3px 0;min-height:24px}');
  });
});

describe('Case to bench cross-links', () => {
  const link = (caseId, grade) => config.testHooks.benchLinkFor(caseId, grade || '11th Grade');

  it('links only cases whose mechanism the toy actually models', () => {
    expect(link('masking').presetId).toBe('masked');
    expect(link('green-light').presetId).toBe('threshold');
    expect(link('dream').presetId).toBe('sedated');
    expect(link('jspace').presetId).toBe('non-verbalizable');

    // A conceivability argument and a cross-species inference are not things
    // this model speaks to. Linking them would imply the run bears on them.
    expect(link('zombie')).toBe(null);
    expect(link('animal-moral-patient')).toBe(null);
  });

  it('sends the AI-emotion case to the model lane, where its point lives', () => {
    const l = link('ai-emotion');
    expect(l.presetId).toBe('clear');
    expect(l.config.substrate).toBe('model');
  });

  it('hides a link when its preset is not offered at that reading path', () => {
    // non-verbalizable is high+; threshold is middle+
    expect(link('jspace', '7th Grade')).toBe(null);
    expect(link('green-light', '1st Grade')).toBe(null);
    expect(link('masking', '1st Grade').presetId).toBe('masked');
  });

  it('hands the bench a complete control state, not a partial patch', () => {
    ['masking', 'green-light', 'dream', 'jspace', 'ai-emotion'].forEach((id) => {
      const c = link(id).config;
      ['substrate', 'strength', 'interference', 'topDown', 'reportRequired', 'bypass']
        .forEach((k) => expect(c[k], id + '.' + k).toBeDefined());
    });
  });

  it('renders the button with the toy-model caveat attached', () => {
    const html = renderView('11th Grade', 'cases', { selectedCase: 'masking' });
    expect(html).toContain('See the mechanism on the bench');
    expect(html).toContain('Open the bench with the Backward masking setup');
    expect(html).toContain('Watching it is not evidence about the case.');
  });

  it('shows no bench button on a case the model cannot represent', () => {
    const html = renderView('11th Grade', 'cases', { selectedCase: 'zombie' });
    expect(html).not.toContain('See the mechanism on the bench');
  });
});

// 2026-08-25 pedagogy pass. The Portfolio used to require evidenceAnswersByProfile,
// compareReflections and caseAudits, none of which any view wrote, so three of its
// nine artifacts could never complete and it asked for an "observation-
// interpretation-limit note" that did not exist anywhere in the tool. There is
// now ONE derivation (learningArtifactsFor) read by the path strip under the
// tabs, the suggested-next-step card, and the Portfolio grid.
describe('Learning path and portfolio share one derivation', () => {
  const artifacts = (grade, data) => config.testHooks.learningArtifactsFor(grade, data);
  const byId = (list) => Object.fromEntries(list.map((a) => [a.id, a]));
  const completeNote = { theoryId: 'rpt', observation: 'O'.repeat(20), interpretation: 'I'.repeat(20), limit: 'L'.repeat(20), minimum: 20, complete: true };

  it('lists the suggested sequence once, in order', () => {
    expect(config.testHooks.pathStepIds).toEqual(['explore', 'compare', 'evidence', 'bench', 'case', 'debate', 'map', 'experiment', 'check', 'synthesis']);
  });

  it('starts every step unfinished on an empty save', () => {
    const list = artifacts('8th Grade', {});
    expect(list.length).toBe(10);
    expect(list.filter((a) => a.done)).toEqual([]);
  });

  it('marks every artifact reachable from state the views actually write', () => {
    const data = {
      selectedTheory: 'gnw',
      compareReflections: { middle: 'GNWT focuses on access; RPT on local recurrence.' },
      // flat keys: exactly what renderEvidence / renderEvidenceLadder store
      evidenceAnswers: { 'mask-result': 'evidence', 'broadcast-proof': 'claim', 'other-minds': 'question', 'pci-result': 'evidence' },
      evidenceLadderAnswers: { 'brain-dependence': 'Established', 'complexity-mechanism': 'Suggestive', 'frontal-necessity': 'Disputed', 'current-ai-feeling': 'Unknown' },
      simFlags: { human: true, model: true, noReport: true },
      caseAudits: { 'middle:masking': completeNote },
      caseDebates: { 'middle:masking': { theoryA: 'gnw', theoryB: 'rpt', positionA: 'A'.repeat(28), positionB: 'B'.repeat(28), evidence: 'E'.repeat(28), uncertainty: 'U'.repeat(28), minimum: 28, complete: true } },
      mapSessions: { middle: { interactions: 2, reflection: 'R'.repeat(24) } },
      experimentRuns: { middle: { revealed: true, theoryId: 'gnw', settings: { maskDelay: 80 }, preregistered: 'P'.repeat(24) } },
      quizAnswers: { middle: { 0: 2, 1: 0, 2: 3, 3: 1, 4: 0 } },
      checkComplete: { middle: true },
      portfolioSynthesis: { middle: { claim: 'C'.repeat(28), evidence: 'E'.repeat(28), uncertainty: 'U'.repeat(28) } },
    };
    expect(artifacts('8th Grade', data).filter((a) => !a.done).map((a) => a.id)).toEqual([]);
    // The quest tracker must agree, because both read the same key tables.
    const hook = (id) => config.questHooks.find((q) => q.id === id);
    expect(hook('evidence_sort').check(data)).toBe(true);
    expect(hook('evidence_ladder').check(data)).toBe(true);
    expect(hook('workspace_bench').check(data)).toBe(true);
    expect(hook('knowledge_check').check(data)).toBe(true);
    // Answered but miscalibrated is not "done": the bar is correctness, like the hooks.
    const miscalibrated = { ...data, evidenceAnswers: { 'mask-result': 'claim', 'broadcast-proof': 'claim', 'other-minds': 'claim', 'pci-result': 'claim' } };
    expect(byId(artifacts('8th Grade', miscalibrated)).evidence.done).toBe(false);
  });

  it('keeps written artifacts isolated per reading path', () => {
    const data = { compareReflections: { middle: 'X'.repeat(30) }, caseAudits: { 'middle:masking': completeNote } };
    const middle = byId(artifacts('8th Grade', data));
    const high = byId(artifacts('11th Grade', data));
    expect(middle.compare.done).toBe(true);
    expect(high.compare.done).toBe(false);
    expect(middle.case.done).toBe(true);
    expect(high.case.done).toBe(false);
  });

  it('renders the strip on every view except the Portfolio, pointing at the first unfinished step', () => {
    const learn = renderView('8th Grade', 'learn');
    expect(learn).toContain('Learning path');
    expect(learn).toContain('SUGGESTED NEXT STEP');
    expect(learn).toContain('aria-current="step"');
    // Explore is both the first step and the current section: a note, not a dead button.
    expect(learn).toContain('It is in this section.');
    const bench = renderView('8th Grade', 'bench', { selectedTheory: 'gnw' });
    expect(bench).toContain('Go to Compare');
    expect(renderView('8th Grade', 'portfolio')).not.toContain('SUGGESTED NEXT STEP');
  });

  it('speaks plainly on the youngest path, including the tab names', () => {
    const html = renderView('Kindergarten', 'learn');
    expect(html).toContain('My path');
    expect(html).toContain('TRY THIS NEXT');
    expect(html).toContain('Picked a big idea');
    ['Big ideas', 'Clue sorter', 'Toy machine', 'My folder'].forEach((label) => expect(html).toContain(label));
    expect(html).not.toContain('Prediction Simulator');
    expect(renderView('8th Grade', 'learn')).toContain('Prediction Simulator');
  });

  it('logs the comparison reflection per reading path and still shows a legacy flat save', () => {
    expect(renderView('8th Grade', 'compare', { compareReflections: { middle: 'GNWT focuses on access while RPT focuses on local loops.' } })).toContain('Comparison logged');
    expect(renderView('11th Grade', 'compare', { compareReflections: { middle: 'X'.repeat(40) } })).not.toContain('Comparison logged');
    expect(renderView('8th Grade', 'compare', { compareReflection: 'Legacy text that was saved before per-path storage.' })).toContain('Legacy text that was saved');
  });
});

describe('Case evidence note', () => {
  it('scales the minimum with the reading path and needs a theory plus three parts', () => {
    expect(config.testHooks.caseAuditMinimumFor('Kindergarten')).toBe(8);
    expect(config.testHooks.caseAuditMinimumFor('8th Grade')).toBe(20);
    expect(config.testHooks.caseAuditMinimumFor('Graduate Level')).toBe(32);
    const note = { theoryId: 'rpt', observation: 'O'.repeat(20), interpretation: 'I'.repeat(20), limit: 'L'.repeat(20) };
    expect(config.testHooks.caseAuditReadyFor('8th Grade', note)).toBe(true);
    expect(config.testHooks.caseAuditReadyFor('Graduate Level', note)).toBe(false);
    expect(config.testHooks.caseAuditReadyFor('8th Grade', { ...note, theoryId: '' })).toBe(false);
    expect(config.testHooks.caseAuditReadyFor('8th Grade', { ...note, limit: '' })).toBe(false);
  });

  it('renders observation, interpretation, and limit ahead of the debate, and reads a saved note back', () => {
    const html = renderView('8th Grade', 'cases', { selectedCase: 'masking' });
    expect(html).toContain('Evidence note');
    expect(html).toContain('OBSERVATION · INTERPRETATION · LIMIT');
    expect(html).toContain('Theory doing the interpreting');
    expect(html.indexOf('Evidence note')).toBeLessThan(html.indexOf('Guided two-position debate'));
    const saved = renderView('8th Grade', 'cases', {
      selectedCase: 'masking',
      caseAudits: { 'middle:masking': { theoryId: 'rpt', observation: 'Early activity survived the mask.', interpretation: 'RPT reads the loss of later activity as lost recurrence.', limit: 'The report task adds decision processes.', minimum: 20, complete: true } },
    });
    expect(saved).toContain('Note saved');
    expect(saved).toContain('RPT adds: ');
    expect(saved).toContain('Cannot show: ');
    const early = renderView('Kindergarten', 'cases');
    expect(early).toContain('My clue note');
    expect(early).toContain('What we still cannot tell');
  });
});

describe('Debate self-check', () => {
  it('is a rubric the learner applies, not a gate on finishing', () => {
    const debate = { theoryA: 'gnw', theoryB: 'rpt', positionA: 'A'.repeat(28), positionB: 'B'.repeat(28), evidence: 'E'.repeat(28), uncertainty: 'U'.repeat(28) };
    expect(config.testHooks.debateReadyFor('11th Grade', debate)).toBe(true);
    const partial = renderView('11th Grade', 'cases', { selectedCase: 'masking', caseDebates: { 'high:masking': { ...debate, complete: true, checks: { steelman: true } } } });
    expect(partial).toContain('Self-check before finishing');
    expect(partial).toContain('type="checkbox"');
    expect(partial).toContain('2 self-check items are still unticked');
    const all = renderView('11th Grade', 'cases', { selectedCase: 'masking', caseDebates: { 'high:masking': { ...debate, complete: true, checks: { steelman: true, evidenceLimit: true, uncertainty: true } } } });
    expect(all).toContain('Structure and self-check complete');
  });
});

describe('Bench readouts', () => {
  it('numbers the ignition step the way the scrubber does (1-indexed)', () => {
    // "Ignition at step 3" beside a scrubber reading "Step 4 of 14" for the same
    // tick was two numbers for one event.
    const preset = config.testHooks.simPresetById('clear');
    const run = config.testHooks.runWorkspaceSim(preset.config);
    const html = renderView('11th Grade', 'bench', { sim: preset.config });
    expect(run.markers.ignitionTick).not.toBe(null);
    expect(html).toContain('at step ' + (run.markers.ignitionTick + 1) + '.');
    expect(html).not.toContain('at step ' + run.markers.ignitionTick + '.');
    expect(html).toContain('Step ' + (config.testHooks.peakTickIndexFor(preset.config) + 1) + ' of ' + run.ticks.length);
  });

  it('explains what each slider does before the learner reads the number', () => {
    expect(renderView('11th Grade', 'bench')).toContain('It changes whether ignition happens, not what arrived.');
    expect(renderView('1st Grade', 'bench')).toContain('Slide right to make the picture clearer.');
  });
});

describe('Knowledge check banks are not guessable by slot or length', () => {
  // Both tree scanners (scan_answer_position_bias, scan_tool_answer_length_clue)
  // are blind to this tool's [question, options, index] tuple schema, so the
  // bar lives here. Before this pass: 27/30 keys at slot A, key usually longest.
  const GRADES = ['Kindergarten', '5th Grade', '8th Grade', '12th Grade', 'College', 'Graduate Level'];
  const quizFor = (grade) => config.testHooks.quizFor(grade);

  it('spreads the key across slots within every level and leaves no dead slot', () => {
    GRADES.forEach((grade) => {
      const quiz = quizFor(grade);
      const arity = quiz[0].options.length;
      const counts = {};
      quiz.forEach((q) => { counts[q.correct] = (counts[q.correct] || 0) + 1; });
      // Best achievable balance: no slot holds more than ceil(n / arity) keys.
      const maxCount = Math.max(...Object.values(counts));
      expect(maxCount, grade + ' ' + JSON.stringify(counts)).toBeLessThanOrEqual(Math.ceil(quiz.length / arity));
      expect(Object.keys(counts).length, grade + ' dead slots ' + JSON.stringify(counts)).toBe(arity);
    });
  });

  it('keeps the key from being the uniquely longest or shortest option beyond chance', () => {
    GRADES.forEach((grade) => {
      const quiz = quizFor(grade);
      const arity = quiz[0].options.length;
      const uniquelyLongest = quiz.filter((q) => q.options.every((o, i) => i === q.correct || o.length < q.options[q.correct].length)).length;
      const uniquelyShortest = quiz.filter((q) => q.options.every((o, i) => i === q.correct || o.length > q.options[q.correct].length)).length;
      const bar = arity === 2 ? 0.67 : 1 / arity + 0.01;
      expect(uniquelyLongest / quiz.length, grade + ' longest').toBeLessThanOrEqual(bar);
      expect(uniquelyShortest / quiz.length, grade + ' shortest').toBeLessThanOrEqual(bar);
    });
  });
});

describe('Reasoning-pattern feedback', () => {
  it('names the pattern behind a wrong answer and clears when the answer is fixed', () => {
    const quiz = config.testHooks.quizFor('8th Grade');
    const wrong = (quiz[0].correct + 1) % quiz[0].options.length;
    const flagged = config.testHooks.misconceptionsFor('8th Grade', { quizAnswers: { middle: { 0: wrong } }, evidenceAnswers: { 'pci-result': 'claim' } });
    expect(flagged.map((p) => p.id)).toEqual(['proxy_to_construct']);
    expect(flagged[0].count).toBe(2);
    expect(flagged[0].where).toEqual(['evidence', 'check']);
    expect(config.testHooks.misconceptionsFor('8th Grade', { quizAnswers: { middle: { 0: quiz[0].correct } } })).toEqual([]);
  });

  it('shows the pattern on the feedback line and summarises it once the check is complete', () => {
    const quiz = config.testHooks.quizFor('8th Grade');
    const wrong = {};
    quiz.forEach((q, i) => { wrong[i] = (q.correct + 1) % q.options.length; });
    const html = renderView('8th Grade', 'check', { quizAnswers: { middle: wrong } });
    expect(html).toContain('Pattern: ');
    expect(html).toContain('Patterns to watch');
    expect(html).toContain('A proxy is not the construct');
    const clean = {};
    quiz.forEach((q, i) => { clean[i] = q.correct; });
    expect(renderView('8th Grade', 'check', { quizAnswers: { middle: clean } })).toContain('No patterns flagged');
  });
});

describe('Clarity of sequence and plain copy', () => {
  it('sorts statement kinds before placing claims on the ladder', () => {
    const html = renderView('8th Grade', 'evidence');
    expect(html.indexOf('What kind of statement is this?')).toBeLessThan(html.indexOf('How settled is the claim?'));
    expect(html.indexOf('Reset classifications')).toBeLessThan(html.indexOf('EVIDENCE LADDER'));
  });

  it('captions the signal journey, map lanes, and simulator controls plainly for K-2 only', () => {
    const early = renderView('Kindergarten', 'learn');
    expect(early).toContain('Shared everywhere');
    expect(early).not.toContain('irreducible cause-effect whole');
    expect(renderView('8th Grade', 'learn')).toContain('irreducible cause-effect whole');
    expect(renderView('Kindergarten', 'map')).toContain('Ideas here ask how a clue gets shared with many brain helpers.');
    const experiment = renderView('Kindergarten', 'experiment');
    expect(experiment).toContain('Do we ask what they saw?');
    expect(experiment).toContain('Looking right at it');
    expect(renderView('8th Grade', 'experiment')).toContain('Response condition');
  });

  it('ships styles for every surface it renders and none for surfaces it does not', () => {
    renderView('8th Grade', 'cases');
    const css = document.getElementById('consciousness-lab-styles').textContent;
    ['.cns-progress', '.cns-next-step', '.cns-case-audit', '.cns-debate-selfcheck', '.cns-misconception-summary', '.cns-note-example', '.cns-facilitator', '.cns-portfolio-share'].forEach((selector) => expect(css).toContain(selector));
    expect(css).not.toContain('.cns-migration-note');
  });
});

describe('Wave 2: nicknames, worked examples, the explain step, limits, hand-in', () => {
  it('gives K-2 a nickname wherever an acronym used to appear, keeping the formal name as a subtitle', () => {
    const learn = renderView('Kindergarten', 'learn');
    expect(learn).toContain('The sharing idea');
    expect(learn).toContain('Global Neuronal Workspace Theory');
    const cases = renderView('Kindergarten', 'cases');
    expect(cases).toContain('Fair account of the sharing idea');
    expect(cases).not.toContain('Fair account of GNWT');
    expect(renderView('8th Grade', 'cases')).toContain('Fair account of GNWT');
    // The quiz used to offer "GNWT" / "RPT" to a path that had never seen the acronyms.
    const quiz = config.testHooks.quizFor('Kindergarten');
    expect(quiz.some((q) => q.options.includes('GNWT') || q.options.includes('RPT'))).toBe(false);
    expect(config.testHooks.quizFor('5th Grade').some((q) => q.question.includes('GNWT'))).toBe(true);
  });

  it('gives each young-path theory card its own ask instead of one case-level sentence', () => {
    const html = renderView('Kindergarten', 'cases', { selectedCase: 'green-light' });
    const asks = [...html.matchAll(/Here, it looks for ([^<]+)</g)].map((m) => m[1]);
    expect(asks.length).toBe(4);
    expect(new Set(asks).size).toBe(4);
    expect(html).not.toContain('In this case, it asks');
    // Every theory a K-5 path can see carries a plain ask, so no card falls back.
    ['Kindergarten', '5th Grade'].forEach((grade) => {
      expect(renderView(grade, 'cases', { selectedCase: 'masking' }), grade).not.toContain('In this case, it asks');
    });
    // The K-2 Portfolio speaks the same register in its placeholders.
    expect(renderView('Kindergarten', 'portfolio')).toContain('I still wonder...');
    expect(renderView('Kindergarten', 'portfolio')).not.toContain('My current, provisional claim is...');
  });

  it('glosses the ladder rungs for the two youngest paths only', () => {
    expect(renderView('Kindergarten', 'evidence')).toContain('scientists argue about it');
    expect(renderView('5th Grade', 'evidence')).toContain('experts disagree');
    expect(renderView('8th Grade', 'evidence')).not.toContain('experts disagree');
  });

  it('offers a worked example note that names its theory and stays a shape, not an answer', () => {
    const html = renderView('8th Grade', 'cases', { selectedCase: 'masking' });
    expect(html).toContain('<details class="cns-note-example">');
    expect(html).toContain('See an example note, then write your own');
    expect(html).toContain('Early feedforward activity survived the mask');
    expect(html).toContain('RPT adds: ');
    expect(html).toContain('a shape to copy, not an answer to copy');
    const early = renderView('Kindergarten', 'cases', { selectedCase: 'masking' });
    expect(early).toContain('The loop-back idea says: ');
    expect(early).toContain('Your note should use your own words');
    // Every case a path can open has an example whose theory that path can pick.
    ['Kindergarten', '5th Grade', '8th Grade', '12th Grade', 'Graduate Level'].forEach((grade) => {
      config.testHooks.caseIdsFor(grade).forEach((caseId) => {
        expect(renderView(grade, 'cases', { selectedCase: caseId }), grade + ' ' + caseId).toContain('cns-note-example');
      });
    });
  });

  it('adds the explain step only after the reveal', () => {
    const run = { theoryId: 'gnw', settings: { maskDelay: 80 }, preregistered: 'P'.repeat(30) };
    expect(renderView('8th Grade', 'experiment', { experimentRuns: { middle: run } })).not.toContain('Compare your prediction with the forecasts');
    const revealed = renderView('8th Grade', 'experiment', { experimentRuns: { middle: { ...run, revealed: true } } });
    expect(revealed).toContain('THEORY-DERIVED PREDICTIONS');
    expect(revealed).toContain('Compare your prediction with the forecasts');
    expect(renderView('Kindergarten', 'experiment', { experimentRuns: { early: { ...run, preregistered: 'P'.repeat(12), revealed: true } } })).toContain('Did your guess match?');
  });

  it('tells grades 3-8 what the bench cannot show, in plain words', () => {
    const middle = renderView('7th Grade', 'bench');
    expect(middle).toContain('What this bench cannot show');
    expect(middle).toContain('matching results are a fact about the code, not a discovery');
    expect(renderView('11th Grade', 'bench')).toContain('not fitted to neural data');
    expect(renderView('1st Grade', 'bench')).not.toContain('What this bench cannot show');
  });

  it('estimates time on the next step and lists the facilitator sequence in Sources', () => {
    expect(renderView('8th Grade', 'learn')).toContain('About 6 min');
    const sources = renderView('8th Grade', 'sources');
    expect(sources).toContain('For facilitators: the suggested sequence');
    expect(sources).toContain('about 71 minutes in total');
    expect(sources).toContain('Could a supporter of each position accept your account of it?');
    expect(sources).toContain('Nothing it shows is evidence about brains, models, or experience.');
  });

  it('never renders an empty epistemic panel for any theory on any path', () => {
    // mergeLevelCopy accumulates from the theory's first level upward, so a
    // theory introduced without a summary, claim, or challenge would render a
    // titled box with nothing in it. Cheap guard for whoever adds the next one.
    const grades = ['Kindergarten', '5th Grade', '8th Grade', '12th Grade', 'College', 'Graduate Level'];
    const empties = [];
    grades.forEach((grade) => {
      config.testHooks.availableTheoryIds(grade).forEach((id) => {
        const copy = config.testHooks.copyFor(id, grade);
        const boxes = { summary: copy.summary, proposes: copy.claim || copy.mechanism || copy.summary, unresolved: copy.challenge };
        Object.keys(boxes).forEach((key) => {
          if (!String(boxes[key] || '').trim()) empties.push(grade + '/' + id + '/' + key);
        });
      });
    });
    expect(empties).toEqual([]);
  });

  it('states the analysis move once for the grid instead of on every card', () => {
    // It used to be appended to each interpretation, so a graduate reader met
    // the identical sentence under all thirteen theories.
    const high = renderView('12th Grade', 'cases', { selectedCase: 'green-light' });
    expect((high.match(/Comparison move/g) || []).length).toBe(1);
    expect(high).toContain('For two of the cards above');
    expect(high).not.toMatch(/access, phenomenal character, or report[^<]*<\/p>\s*<\/article>/);
    expect(config.testHooks.analysisMoveFor('College').label).toBe('Operational move');
    expect(config.testHooks.analysisMoveFor('Graduate Level').label).toBe('Research audit');
    expect((renderView('Graduate Level', 'cases').match(/Research audit/g) || []).length).toBe(1);
    // The youngest paths never had a move to repeat, and still do not get one.
    expect(config.testHooks.analysisMoveFor('Kindergarten')).toBe(null);
    expect(renderView('Kindergarten', 'cases')).not.toContain('Comparison move');
  });

  it('gives every philosophical view its own standing question instead of one shared tail', () => {
    // Philosophical views have no per-case mechanism entry, so all of them used
    // to render the identical case-level question plus the identical epistemic
    // sentence: four cards, two sentences, verbatim.
    const philosophy = ['functionalism', 'physicalism', 'dualism', 'panpsychism', 'illusionism', 'biological', 'neutral'];
    const asks = philosophy.map((id) => config.testHooks.caseAskFor(id));
    expect(asks.filter(Boolean).length).toBe(philosophy.length);
    expect(new Set(asks).size).toBe(philosophy.length);

    const html = renderView('12th Grade', 'cases', { selectedCase: 'masking' });
    // The epistemic framing is stated once, for the grid, not per card.
    expect((html.match(/This is the theory’s interpretation, not an extra observation\./g) || []).length).toBe(1);
    const tails = [...html.matchAll(/Applied here, it asks ([^<]+)</g)].map((m) => m[1]);
    expect(tails.length).toBeGreaterThanOrEqual(5);
    expect(new Set(tails).size).toBe(tails.length);
  });

  it('separates the two theory families the scope note says are separated', () => {
    const middle = renderView('8th Grade', 'learn');
    expect(middle).toContain('They are separated below because they are not one-for-one rivals.');
    expect(middle).toContain('Scientific models (6)');
    expect(middle).toContain('Philosophical views (4)');
    expect(middle.indexOf('Scientific models (6)')).toBeLessThan(middle.indexOf('Philosophical views (4)'));
    // K-2 has no philosophical views, so it gets no heading to explain.
    const early = renderView('Kindergarten', 'learn');
    expect(early).not.toContain('Science ideas (4)');
    expect(early).toContain('aria-label="Science ideas"');
  });

  it('says whether two compared lenses are even rivals, using the map placements', () => {
    const rivals = config.testHooks.comparisonRelationFor('8th Grade', 'hot', 'ast');
    expect(rivals.same).toBe(true);
    expect(rivals.aLane).toBe('Higher-order or self-model');
    expect(rivals.text).toContain('not discriminating');
    const apart = config.testHooks.comparisonRelationFor('8th Grade', 'gnw', 'rpt');
    expect(apart.same).toBe(false);
    expect(apart.aLane).toBe('Access and global availability');
    expect(apart.bLane).toBe('Sensory phenomenal content');
    expect(apart.text).toContain('may not be direct rivals');
    // A lens compared with itself has no relation to report.
    expect(config.testHooks.comparisonRelationFor('8th Grade', 'gnw', 'gnw')).toBe(null);

    expect(renderView('8th Grade', 'compare')).toContain('Different explanatory targets');
    expect(renderView('8th Grade', 'compare', { compareA: 'hot', compareB: 'ast' })).toContain('Same explanatory target');
    // K-2 gets the same distinction in its own words.
    const early = renderView('Kindergarten', 'compare');
    expect(early).toContain('These are looking for different things');
    expect(early).toContain('sharing and using');
  });

  it('colours a case pill by what kind of case it is', () => {
    expect(config.testHooks.caseKindFor('zombie')).toBe('thought');
    expect(config.testHooks.caseKindFor('ai-emotion')).toBe('thought');
    expect(config.testHooks.caseKindFor('masking')).toBe('empirical');
    // The philosophical zombie used to carry the scientific-case colour.
    expect(renderView('12th Grade', 'cases', { selectedCase: 'zombie' })).toMatch(/style="[^"]*#9d174d[^"]*">Thought experiment</);
    expect(renderView('12th Grade', 'cases', { selectedCase: 'masking' })).toMatch(/style="[^"]*#0369a1[^"]*">Perception</);
  });

  it('tracks the three newer artifacts as quests, so the host sees what the path sees', () => {
    const hook = (id) => config.questHooks.find((q) => q.id === id);
    expect(config.questHooks.length).toBe(10);
    expect(config.testHooks.pathStepIds.length).toBe(10);

    const note = hook('case_note');
    expect(note.check({})).toBe(false);
    expect(note.check({ caseAudits: { 'middle:masking': { theoryId: 'rpt', observation: 'O'.repeat(20), interpretation: 'I'.repeat(20), limit: 'L'.repeat(20), minimum: 20, complete: true } } })).toBe(true);

    const prereg = hook('preregistration');
    expect(prereg.check({ experimentRuns: { middle: { revealed: false, theoryId: 'gnw', settings: {}, preregistered: 'P'.repeat(30) } } })).toBe(false);
    expect(prereg.check({ experimentRuns: { middle: { revealed: true, theoryId: 'gnw', settings: {}, preregistered: 'P'.repeat(30) } } })).toBe(true);

    const portfolio = hook('portfolio_synthesis');
    expect(portfolio.check({ portfolioSynthesis: { middle: { claim: 'C'.repeat(10), evidence: 'E'.repeat(10), uncertainty: 'U'.repeat(10) } } })).toBe(false);
    expect(portfolio.check({ portfolioSynthesis: { middle: { claim: 'C'.repeat(28), evidence: 'E'.repeat(28), uncertainty: 'U'.repeat(28) } } })).toBe(true);
    // An unknown profile key must not crash or count.
    expect(portfolio.check({ portfolioSynthesis: { nonsense: { claim: 'C'.repeat(80), evidence: 'E'.repeat(80), uncertainty: 'U'.repeat(80) } } })).toBe(false);
  });

  it('renders a hand-in summary that carries the epistemic line and the same artifact verdicts', () => {
    const data = { selectedTheory: 'gnw', portfolioSynthesis: { middle: { claim: 'Access and experience may come apart.' } }, evidenceAnswers: { 'pci-result': 'claim' } };
    const html = renderView('8th Grade', 'portfolio', data);
    expect(html).toContain('Summary to share');
    expect(html).toContain('readonly=""');
    expect(html).toContain('Steps done: 1/10');
    expect(html).toContain('[x] Theory explored: Global Neuronal Workspace Theory');
    expect(html).toContain('Claim: Access and experience may come apart.');
    expect(html).toContain('Uncertainty: (not written yet)');
    expect(html).toContain('Patterns to watch: A proxy is not the construct (1)');
    expect(html).toContain('It is not scientific consensus, and no theory is declared the winner.');
  });
});
