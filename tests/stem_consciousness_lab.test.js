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
