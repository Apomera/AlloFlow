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
