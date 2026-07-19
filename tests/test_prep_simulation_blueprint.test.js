import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
});

const countDomains = (items) => items.reduce((counts, item) => {
  counts[item.domainId] = (counts[item.domainId] || 0) + 1;
  return counts;
}, {});

const expectedMinutesByPack = {
  'parapro-1755-practice-1': 150,
  'praxis-audiology-5343': 120,
  'praxis-early-childhood-5025': 120,
  'praxis-educational-leadership-5412': 165,
  'praxis-esol-5362': 120,
  'praxis-plt-grades-5-9-5623': 70,
  'praxis-plt-grades-7-12-5624': 70,
  'praxis-plt-early-childhood-5621': 70,
  'praxis-plt-k6-5622': 70,
  'praxis-core-5752': 215,
  'praxis-reading-specialist-5302': 150,
  'praxis-school-counselor-5422': 120,
  'praxis-school-librarian-5312': 120,
  'praxis-school-psychologist-5403': 125,
  'praxis-special-education-5355': 120,
  'praxis-special-education-behavior-emotional-5372': 120,
  'praxis-special-education-early-childhood-5692': 120,
  'praxis-special-education-intellectual-disabilities-5322': 120,
  'praxis-special-education-learning-disabilities-5383': 120,
  'praxis-special-education-severe-profound-5547': 120,
  'praxis-speech-language-pathology-5331': 150,
  'praxis-teaching-reading-5205': 120,
};

const expectedOfficialTotalMinutesByPack = {
  ...expectedMinutesByPack,
  'praxis-plt-grades-5-9-5623': 120,
  'praxis-plt-grades-7-12-5624': 120,
  'praxis-plt-early-childhood-5621': 120,
  'praxis-plt-k6-5622': 120,
  'praxis-core-5752': 275,
  'praxis-teaching-reading-5205': 150,
};

describe('official-length timed simulation assembly', () => {
  it.each([
    ['parapro-1755-practice-1', 90, {
      reading: 30,
      mathematics: 30,
      writing: 30,
    }],
    ['praxis-audiology-5343', 120, {
      'foundations-audiology': 24,
      'prevention-screening': 12,
      assessment: 42,
      intervention: 30,
      'professional-ethical': 12,
    }],
    ['praxis-early-childhood-5025', 120, {
      'language-literacy': 36,
      mathematics: 30,
      'social-studies': 17,
      science: 17,
      'health-physical-arts': 20,
    }],
    ['praxis-educational-leadership-5412', 120, {
      'strategic-leadership': 20,
      'instructional-leadership': 27,
      'climate-cultural-leadership': 22,
      'ethical-leadership': 19,
      'organizational-leadership': 16,
      'community-engagement-leadership': 16,
    }],
    ['praxis-esol-5362', 120, {
      'foundations-linguistics': 22,
      'foundations-language-learning': 26,
      'planning-implementing-instruction': 28,
      'assessment-evaluation': 18,
      culture: 13,
      'professionalism-advocacy': 13,
    }],
    ['praxis-plt-grades-5-9-5623', 70, {
      'students-as-learners': 21,
      'instructional-process': 21,
      assessment: 14,
      'professional-development-leadership-community': 14,
    }],
    ['praxis-plt-grades-7-12-5624', 70, {
      'students-as-learners': 21,
      'instructional-process': 21,
      assessment: 14,
      'professional-development-leadership-community': 14,
    }],
    ['praxis-plt-early-childhood-5621', 70, {
      'students-as-learners': 21,
      'instructional-process': 21,
      assessment: 14,
      'professional-development-leadership-community': 14,
    }],
    ['praxis-plt-k6-5622', 70, {
      'students-as-learners': 21,
      'instructional-process': 21,
      assessment: 14,
      'professional-development-leadership-community': 14,
    }],
    ['praxis-core-5752', 152, {
      'reading-key-ideas-details': 20,
      'reading-craft-structure-language': 16,
      'reading-integration-knowledge-ideas': 20,
      'writing-text-types-production': 10,
      'writing-language-research': 30,
      'math-number-quantity': 20,
      'math-data-statistics-probability': 18,
      'math-algebra-geometry': 18,
    }, 'fixed-product-allocation-within-official-ranges'],
    ['praxis-reading-specialist-5302', 95, {
      'curriculum-instruction': 47,
      assessment: 29,
      'professional-leadership': 19,
    }],
    ['praxis-school-counselor-5422', 120, {
      define: 30,
      deliver: 48,
      manage: 24,
      assess: 18,
    }],
    ['praxis-school-librarian-5312', 120, {
      'program-administration': 24,
      'organization-access': 23,
      'information-access-learning-environment': 24,
      'teaching-learning': 35,
      'professional-development-leadership-advocacy': 14,
    }],
    ['praxis-school-psychologist-5403', 125, {
      'permeating-practices': 40,
      'student-level-services': 28,
      'systems-level-services': 25,
      foundations: 32,
    }],
    ['praxis-special-education-5355', 120, {
      'development-differences': 32,
      'planning-instruction-environment': 38,
      assessment: 27,
      'professional-practice-collaboration': 23,
    }],
    ['praxis-special-education-behavior-emotional-5372', 120, {
      'development-characteristics-ebd': 22,
      'planning-managing-learning-environments': 31,
      instruction: 31,
      assessment: 20,
      'foundations-professional-responsibilities': 16,
    }],
    ['praxis-special-education-early-childhood-5692', 120, {
      'child-development-early-learning': 25,
      'curriculum-planning-instruction': 30,
      assessment: 24,
      'partnering-collaborating': 22,
      'legal-ethical-professionalism': 19,
    }],
    ['praxis-special-education-intellectual-disabilities-5322', 120, {
      'development-characteristics-intellectual-disabilities': 22,
      'planning-managing-learning-environment': 31,
      instruction: 31,
      assessment: 19,
      'foundations-professional-responsibilities': 17,
    }],
    ['praxis-special-education-learning-disabilities-5383', 120, {
      'development-characteristics-learning-disabilities': 20,
      'planning-managing-learning-environment': 32,
      instruction: 33,
      'identification-eligibility-placement': 14,
      'foundations-professional-responsibilities': 21,
    }],
    ['praxis-special-education-severe-profound-5547', 120, {
      'development-individualized-needs': 35,
      'planning-instruction-environment': 38,
      assessment: 23,
      'ethical-legal-professional-collaboration': 24,
    }],
    ['praxis-speech-language-pathology-5331', 132, {
      'foundations-professional-practice': 44,
      'screening-assessment-diagnosis': 44,
      'treatment-planning-evaluation': 44,
    }],
    ['praxis-teaching-reading-5205', 90, {
      'phonological-emergent': 14,
      'phonics-decoding': 18,
      'vocabulary-fluency': 21,
      comprehension: 21,
      'written-expression': 16,
    }],
  ])('%s preserves its timed selected-response domain allocation', (packId, expectedLength, expectedCounts, expectedBasis) => {
    const pack = Hub.listPacks().find((candidate) => candidate.id === packId);
    expect(pack).toBeTruthy();
    expect(pack.simulationDomainCounts).toEqual(expectedCounts);
    expect(pack.simulationTimeMinutes).toBe(expectedMinutesByPack[packId]);
    expect(pack.officialSelectedResponseCount).toBe(expectedLength);
    expect(pack.officialTotalTimeMinutes).toBe(expectedOfficialTotalMinutesByPack[packId]);
    expect(pack.simulationDomainCountsBasis.length).toBeGreaterThanOrEqual(12);
    expect(Object.values(pack.simulationDomainCounts).reduce((sum, count) => sum + count, 0)).toBe(expectedLength);
    if (expectedBasis) expect(pack.simulationDomainCountsBasis).toBe(expectedBasis);

    for (const [domainId, required] of Object.entries(expectedCounts)) {
      const available = pack.items.filter((item) => item.domainId === domainId && item.examItemStatus !== 'not-approved-as-independent-exam-item').length;
      expect(available).toBeGreaterThanOrEqual(required);
    }

    const simulation = Hub.buildSimulationSet(pack);
    expect(simulation).toHaveLength(expectedLength);
    expect(countDomains(simulation)).toEqual(expectedCounts);
    expect(simulation.every((item) => item.examItemStatus !== 'not-approved-as-independent-exam-item')).toBe(true);
  });
});
