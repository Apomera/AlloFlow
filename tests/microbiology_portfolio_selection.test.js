import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let core;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
  core = window.__MicrobiologyCore;
});
afterEach(() => vi.restoreAllMocks());
const ids = ['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz'];
const conditions = (patch = {}) => ({ profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100, ...patch });
const trial = (id = 7, patch = {}) => ({ id, control: conditions(), conditions: conditions({ oxygen: 0 }), prediction: 'higher', hypothesis: 'Original growth reasoning.', explanation: 'Later growth explanation.', ...patch });
const measurement = value => ({ value, unit: 'um', context: { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 } });
const mysteryReport = reasoning => ({ claim: 'protist', evidence: ['structure', 'behavior'], reasoning, limitation: 'bounded' });
const run = (patch = {}) => ({ dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Current culture notes.', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }], ...patch });
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function allActivities() {
  return {
    mysteryLab: { cases: { pond: { reasoning: 'MYSTERY_WORKING_SENTINEL' } } },
    microscopeMeasurements: { ecoli: { draft: measurement('2.500') } },
    gramInvestigation: { explanation: 'GRAM_WORKING_SENTINEL' },
    growthInvestigation: { hypothesis: 'GROWTH_WORKING_SENTINEL' },
    resistanceInvestigation: run({ notes: 'RESISTANCE_WORKING_SENTINEL' }), quizAnswers: [0]
  };
}

describe('Selected Micro Lab portfolio projection', () => {
  it('includes exactly the chosen populated activities and excludes the others completely', () => {
    const portfolio = core.work.portfolio(allActivities());
    const result = core.work.selectPortfolio(portfolio, ['growth', 'gram']);
    expect(result.includedIds).toEqual(['gram', 'growth']);
    expect(result.canDownload).toBe(true);
    expect(result.text).toContain('GRAM_WORKING_SENTINEL'); expect(result.text).toContain('GROWTH_WORKING_SENTINEL');
    expect(result.text).not.toContain('MYSTERY_WORKING_SENTINEL'); expect(result.text).not.toContain('RESISTANCE_WORKING_SENTINEL');
    expect(result.text).not.toContain('Original estimate: 2.500'); expect(result.text).not.toContain('Q1.');
    expect(result.sections.map(section => section.id)).toEqual(result.includedIds);
    for (const selected of result.sections) expect(selected.text).toBe(portfolio.sections.find(section => section.id === selected.id).text);
  });

  it('deduplicates strict IDs and uses canonical order regardless of selection or source order', () => {
    const original = core.work.portfolio(allActivities());
    const portfolio = { ...original, sections: [...original.sections].reverse() };
    const selected = ['quiz', 'growth', 'mystery', 'quiz', 'resistance', 'gram', 'microscope', 'growth', 'unknown'];
    const result = core.work.selectPortfolio(portfolio, selected);
    expect(result.includedIds).toEqual(ids);
    expect(result.sections.map(section => section.id)).toEqual(ids);
    for (const title of result.sections.map(section => section.title)) expect(result.text.split('=== ' + title + ' ===')).toHaveLength(2);
    expect(selected).toEqual(['quiz', 'growth', 'mystery', 'quiz', 'resistance', 'gram', 'microscope', 'growth', 'unknown']);
  });

  it.each([undefined, null, 'growth', {}, 42, true, new Set(['growth'])])('treats malformed selections as empty instead of falling back to the full portfolio: %s', activityIds => {
    const result = core.work.selectPortfolio(core.work.portfolio(allActivities()), activityIds);
    expect(result).toEqual({ sections: [], includedIds: [], canDownload: false, text: '' });
  });

  it('does not coerce, trim, case-fold or expand unknown selection entries', () => {
    const portfolio = core.work.portfolio(allActivities());
    const invalid = [null, false, 0, ['growth'], { id: 'growth' }, new String('growth'), ' growth', 'growth ', 'Growth', 'all', '*', '__proto__'];
    expect(core.work.selectPortfolio(portfolio, invalid).canDownload).toBe(false);
    expect(core.work.selectPortfolio(portfolio, [...invalid, 'growth']).includedIds).toEqual(['growth']);
    expect(core.work.selectPortfolio(portfolio, []).text).toBe('');
  });

  it('excludes selected empty activities and never enables export from the producer’s overall flag alone', () => {
    const portfolio = core.work.portfolio({ growthInvestigation: { hypothesis: 'Only growth has notes.' } });
    expect(portfolio.canDownload).toBe(true);
    const empty = core.work.selectPortfolio(portfolio, ['mystery', 'quiz']);
    expect(empty).toEqual({ sections: [], includedIds: [], canDownload: false, text: '' });
    expect(core.work.selectPortfolio(portfolio, ids).includedIds).toEqual(['growth']);
    expect(core.work.selectPortfolio(core.work.portfolio({}), ids).canDownload).toBe(false);
  });

  it.each([undefined, null, [], 'raw', 17, { sections: {} }, { canDownload: true, text: 'DO NOT COPY RAW TEXT' }])('handles malformed portfolio input without reconstructing or exporting raw text: %s', portfolio => {
    expect(core.work.selectPortfolio(portfolio, ids)).toEqual({ sections: [], includedIds: [], canDownload: false, text: '' });
  });

  it('ignores malformed sections, unknown IDs, and duplicate later copies without altering source objects', () => {
    const source = { sections: [null, [], { id: 'mystery', title: 'Mystery', hasContent: 'true', text: 'WRONG FLAG' },
      { id: 'microscope', title: '', hasContent: true, text: 'EMPTY TITLE' }, { id: 'gram', title: 'Gram', hasContent: true, text: '   ' },
      { id: 'growth', title: 'Growth literal', hasContent: true, text: 'FIRST COMPLETE SECTION', future: 'DO NOT COPY EXTRA' },
      { id: 'growth', title: 'Duplicate', hasContent: true, text: 'DUPLICATE SECTION' },
      { id: 'resistance', title: 'Resistance', hasContent: true, text: {} }, { id: 'quiz', title: 'Quiz', hasContent: false, text: 'EMPTY CLAIM' },
      { id: 'unknown', title: 'Unknown', hasContent: true, text: 'UNKNOWN SECTION' }], text: 'DO NOT COPY WHOLE REPORT' };
    const before = JSON.stringify(source), result = core.work.selectPortfolio(source, [...ids, 'unknown']);
    expect(result.includedIds).toEqual(['growth']);
    expect(result.sections[0]).toEqual({ id: 'growth', title: 'Growth literal', hasContent: true, text: 'FIRST COMPLETE SECTION' });
    expect(result.text).not.toContain('DUPLICATE SECTION'); expect(result.text).not.toContain('DO NOT COPY');
    expect(JSON.stringify(source)).toBe(before); expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(source.sections[4])).toBe(false);
  });

  it('returns a frozen result and arrays without freezing or sharing mutable caller section objects', () => {
    const source = { sections: [{ id: 'growth', title: 'Growth', hasContent: true, text: 'Original complete text.' }] };
    const result = core.work.selectPortfolio(source, ['growth']);
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.sections)).toBe(true);
    expect(Object.isFrozen(result.includedIds)).toBe(true); expect(result.sections.every(Object.isFrozen)).toBe(true);
    source.sections[0].text = 'Changed after selection.';
    expect(result.sections[0].text).toBe('Original complete text.');
    expect(result.text).toContain('Original complete text.'); expect(result.text).not.toContain('Changed after selection.');
  });

  it('preserves complete literal learner content, whitespace, punctuation, and line endings', () => {
    const literal = '  Learner text: =SUM(A1:A2)\r\n"quotes", café 🦠\n\tFinal line.  ';
    const source = freeze({ sections: [{ id: 'gram', title: 'Gram literal', hasContent: true, text: literal }] });
    const result = core.work.selectPortfolio(source, freeze(['gram']));
    expect(result.sections[0].text).toBe(literal);
    expect(result.text.endsWith('=== Gram literal ===\n' + literal)).toBe(true);
  });

  it('uses the selected heading, explicit included titles, and the unchanged scope warning', () => {
    const portfolio = core.work.portfolio({ growthInvestigation: { hypothesis: 'Working note.' }, quizAnswers: [0] });
    const result = core.work.selectPortfolio(portfolio, ['quiz', 'growth']);
    const lines = result.text.split('\n');
    expect(lines[0]).toBe('Micro Lab selected evidence portfolio');
    expect(lines[1]).toBe('Included activities: Growth investigations, Quiz and practice');
    expect(lines[2]).toBe(portfolio.text.split('\n')[1]);
    expect(lines[2]).toContain('not an importable backup or an overall mastery score');
    expect(result.text).toContain('\n=== Growth investigations ===\n');
    expect(result.text).not.toContain('\\n=== Growth investigations');
    expect(result.text).not.toContain('=== Mystery specimens ===');
  });

  it('translates only the selected-report framing and retains producer titles and text literally', () => {
    const producerTranslate = (key, fallback) => key === 'portfolio_growth' ? 'Données de croissance' : fallback;
    const portfolio = core.work.portfolio({ growthInvestigation: { hypothesis: 'Une note inchangée.' } }, producerTranslate);
    const translate = vi.fn((key, fallback) => ({ portfolio_selected_title: 'Dossier choisi', portfolio_included_activities: 'Activités incluses', portfolio_scope: 'AVERTISSEMENT TRADUIT' })[key] || fallback);
    const result = core.work.selectPortfolio(portfolio, ['growth'], translate);
    expect(result.text.startsWith('Dossier choisi\nActivités incluses: Données de croissance\nAVERTISSEMENT TRADUIT\n')).toBe(true);
    expect(result.sections[0].text).toBe(portfolio.sections.find(section => section.id === 'growth').text);
    expect(result.text).toContain('Une note inchangée.');
    expect(translate.mock.calls.map(([key]) => key)).toEqual(['portfolio_selected_title', 'portfolio_included_activities', 'portfolio_scope']);
    expect(translate.mock.calls[2][1]).toContain('Labels distinguish original evidence from later reflection and unfinished work.');
  });

  it('retains all Growth saved trials, drafts, sweeps, recoverable evidence and pinned hours in a selected section', () => {
    const seed = { growthLab: conditions({ tempC: 40 }), growthInvestigation: {
      control: conditions(), prediction: 'lower', hypothesis: 'Pending next-run reasoning.', explanation: 'Pending explanation.',
      trials: [trial(7, { citedHours: [0, 6, 24] }), trial(8, { explanation: 'Second saved explanation.' })],
      removed: { trial: trial(9, { control: null, citedHours: [0], explanation: 'Recoverable explanation.' }), index: 1 },
      sweep: { variable: 'pH', conditions: conditions() }, previousSweep: { variable: 'oxygen', conditions: conditions() }
    } };
    const portfolio = core.work.portfolio(seed), growth = portfolio.sections.find(section => section.id === 'growth');
    const result = core.work.selectPortfolio(portfolio, ['growth']);
    expect(result.sections[0].text).toBe(growth.text);
    for (const expected of ['Current saved evidence — Trial 7', 'Current saved evidence — Trial 8', 'outside the active notebook) — Trial 9',
      'Evidence selected for my explanation', '0\tUnavailable\t5\tUnavailable', 'Current saved sweep', 'Previous saved sweep',
      'Pending next-run reasoning.', 'Recoverable explanation.', 'Original growth reasoning.', 'Later growth explanation.']) expect(result.text).toContain(expected);
    expect(result.text).toContain('24\t');
  });

  it('retains original Resistance notes, later reflection, removed snapshots, and observed current rounds', () => {
    const saved = core.resistance.evidence(run({ notes: 'Saved original notes.' }));
    const removed = core.resistance.evidence(run({ notes: 'Removed original notes.' }));
    const portfolio = core.work.portfolio({ resistanceNotebook: { records: [{ id: 4, evidence: saved, reviewNote: 'Later reflection.' }],
      removed: { record: { id: 9, evidence: removed, reviewNote: 'Removed reflection.' }, index: 0 } }, resistanceInvestigation: run() });
    const result = core.work.selectPortfolio(portfolio, ['resistance']);
    expect(result.sections[0].text).toBe(portfolio.sections.find(section => section.id === 'resistance').text);
    for (const text of ['Evidence 4', 'Evidence 9', 'Saved original notes.', 'Later reflection.', 'Removed original notes.', 'Removed reflection.', 'Current culture notes.', '1\t60\t8\t68\t12%']) expect(result.text).toContain(text);
  });

  it('retains current, previous, and working microscope, Mystery and Gram evidence without choosing a version for the learner', () => {
    const gram = { prediction: 'thick', interpretation: 'wall', explanation: 'Saved Gram writing.' };
    const seed = { microscopeMeasurements: { ecoli: { result: measurement(2), previousResult: measurement(1.5), draft: measurement('3.250') } },
      mysteryLab: { cases: { pond: { record: mysteryReport('Current Mystery writing.'), previousRecord: mysteryReport('Previous Mystery writing.'), reasoning: 'Working Mystery writing.' } } },
      gramInvestigation: { record: gram, previousRecord: { ...gram, explanation: 'Previous Gram writing.' }, explanation: 'Working Gram writing.', maxStep: 1 } };
    const portfolio = core.work.portfolio(seed), result = core.work.selectPortfolio(portfolio, ['gram', 'microscope', 'mystery']);
    expect(result.includedIds).toEqual(['mystery', 'microscope', 'gram']);
    for (const text of ['Original estimate: 2 um', 'Original estimate: 1.5 um', 'Original estimate: 3.250 um',
      'Current Mystery writing.', 'Previous Mystery writing.', 'Working Mystery writing.', 'Saved Gram writing.', 'Previous Gram writing.', 'Working Gram writing.']) expect(result.text).toContain(text);
    result.sections.forEach(selected => expect(selected.text).toBe(portfolio.sections.find(section => section.id === selected.id).text));
  });

  it('preserves quiz, microscope, Mystery and Gram disclosure boundaries for unfinished work', () => {
    const seed = { quizAnswers: [0], quizSubmitted: true, quizCorrect: 15, quizPractice: { answers: Array(15).fill(1), checked: Array(15).fill(true), reflections: Array(15).fill('HIDDEN_PRACTICE_SENTINEL') },
      microscopeMeasurements: { ecoli: { draft: measurement('=2+2') } }, mysteryLab: { cases: { pond: { reasoning: 'A question before inspecting.' } } },
      gramInvestigation: { explanation: 'A question before staining.' } };
    const portfolio = core.work.portfolio(seed), result = core.work.selectPortfolio(portfolio, ids);
    expect(result.includedIds).toEqual(['mystery', 'microscope', 'gram', 'quiz']);
    expect(result.text).not.toContain('Original score:'); expect(result.text).not.toContain('Correct answer:');
    expect(result.text).not.toContain('Original result:'); expect(result.text).not.toContain('HIDDEN_PRACTICE_SENTINEL');
    expect(result.text).not.toContain('Drawing reference (µm):'); expect(result.text).not.toContain('Absolute difference from the drawing reference (%):');
    expect(result.text).not.toContain('two nuclei'); expect(result.text).not.toContain('many cilia beat together');
    expect(result.text).not.toContain('Decolorization:'); expect(result.text).not.toContain('Crystal violet:');
    expect(result.text).toContain('Original estimate: =2+2 um');
  });

  it('retains a submitted quiz and learner practice reflection without recomputing or rewriting its report', () => {
    const answers = Array(15).fill(0), quiz = core.quiz.report({ quizAnswers: answers, quizSubmitted: true });
    const missed = quiz.questions.find(question => question.originalStatus === 'incorrect').index;
    const reflections = []; reflections[missed] = 'My later correction reflection.';
    const portfolio = core.work.portfolio({ quizAnswers: answers, quizSubmitted: true, quizPractice: { answers: Array(15).fill(1), checked: Array(15).fill(true), reflections } });
    const result = core.work.selectPortfolio(portfolio, ['quiz']);
    expect(result.sections[0].text).toBe(portfolio.sections.find(section => section.id === 'quiz').text);
    expect(result.text).toContain('Original score: ' + quiz.originalScore + '/15');
    expect(result.text).toContain('Correction reflection (learner written, ungraded): My later correction reflection.');
  });

  it('performs no portfolio generation, model simulation, random draw or timestamp while selecting an existing projection', () => {
    const portfolio = core.work.portfolio({ growthInvestigation: { trials: [trial(7, { citedHours: [6] })] }, resistanceInvestigation: run() });
    const producer = vi.spyOn(core.work, 'portfolio').mockImplementation(() => { throw new Error('Must reuse existing projection'); });
    const exponential = vi.spyOn(Math, 'exp').mockImplementation(() => { throw new Error('Must not simulate'); });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Must not draw'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Must not timestamp'); });
    const result = core.work.selectPortfolio(portfolio, ['growth', 'resistance']);
    expect(result.canDownload).toBe(true); expect(result.text).toContain('Evidence selected for my explanation');
    expect(producer).not.toHaveBeenCalled(); expect(exponential).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
  });

  it('leaves frozen raw state, selection inputs, and full portfolio output exactly unchanged across JSON reload', () => {
    const state = { ...allActivities(), xp: 925, tab: 'growthLab', growthReviewHour: 6, resistancePlaying: true,
      growthLab: { ...conditions({ tempC: 40 }), custom: 'KEEP_RAW_METADATA' },
      growthInvestigation: { trials: [trial(7, { citedHours: [6] })], selectedId: 7, nextId: 8, prediction: 'lower', hypothesis: 'Next run.', custom: { keep: true } },
      resistanceComparison: { aId: 4, bId: 9 }, unrelated: { keep: 'UNCHANGED' } };
    const before = JSON.stringify(state); freeze(state);
    const portfolio = core.work.portfolio(state), portfolioBefore = JSON.stringify(portfolio), selection = freeze(['quiz', 'growth', 'growth']);
    const first = core.work.selectPortfolio(portfolio, selection), second = core.work.selectPortfolio(JSON.parse(portfolioBefore), [...selection]);
    expect(first).toEqual(second);
    expect(JSON.stringify(state)).toBe(before); expect(JSON.stringify(portfolio)).toBe(portfolioBefore);
    expect(selection).toEqual(['quiz', 'growth', 'growth']);
    expect(core.work.portfolio(state)).toEqual(portfolio); expect(state.xp).toBe(925); expect(state.resistancePlaying).toBe(true);
    expect(first.text).not.toContain('KEEP_RAW_METADATA'); expect(first.text).not.toContain('UNCHANGED');
  });
});
