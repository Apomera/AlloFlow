import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let core;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
  core = window.__MicrobiologyCore;
});
afterEach(() => vi.restoreAllMocks());

const conditions = (patch = {}) => ({ profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100, ...patch });
const trial = (id = 7, patch = {}) => ({ id, control: conditions(), conditions: conditions({ oxygen: 0 }), prediction: 'higher', hypothesis: 'Original reasoning before the run.', explanation: 'Later explanation from the evidence.', ...patch });
const measurement = (value = 2, unit = 'um', patch = {}) => ({ value, unit, context: { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2, ...patch } });
const mysteryReport = (reasoning = 'Saved cilia and nuclei reasoning.') => ({ claim: 'protist', evidence: ['structure', 'behavior'], reasoning, limitation: 'bounded' });
const run = (patch = {}) => ({ dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original run notes.', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }], ...patch });
function section(seed, id) { return core.work.portfolio(seed).sections.find(item => item.id === id); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

describe('Micro Lab portable evidence projection', () => {
  it.each([undefined, null, [], 'malformed', 42, {}])('keeps an empty or malformed root empty: %s', seed => {
    const report = core.work.portfolio(seed);
    expect(report.canDownload).toBe(false);
    expect(report.text).toBe('');
    expect(report.sections.map(item => item.id)).toEqual(['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz']);
    expect(report.sections.every(item => !item.hasContent && item.text === 'No evidence or working notes yet.')).toBe(true);
  });

  it('does not turn normalized defaults, unknown properties, or forged progress into evidence', () => {
    const seed = {
      tab: 'home', xp: 500, quizCorrect: 15, quizSubmitted: true, quizAnswers: Array(15).fill('1'),
      mysteryLab: core.mystery.normalize(), gramInvestigation: core.gram.normalize(),
      microscopeMeasurements: { ecoli: { result: measurement(Infinity) } },
      growthLab: { profile: 'ecoli', tempC: 30, pH: 7, oxygen: 50, hypothesis: '', explanation: '', log: [{ secret: 'DO NOT EXPORT' }] },
      growthInvestigation: core.growth.normalizeNotebook(), resistanceInvestigation: core.normalizeResistanceInvestigation(),
      resistanceNotebook: { records: [{ id: 4, evidence: { day: 99, history: 'forged' } }] }, unrelated: 'DO NOT EXPORT'
    };
    const report = core.work.portfolio(seed);
    expect(report.canDownload).toBe(false);
    expect(report.text).toBe('');
  });

  it('returns frozen ordered sections and joins only the activities with content', () => {
    const report = core.work.portfolio({ growthInvestigation: { hypothesis: 'A growth question.' }, quizAnswers: [0] });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.sections)).toBe(true);
    expect(report.sections.every(Object.isFrozen)).toBe(true);
    expect(report.sections.filter(item => item.hasContent).map(item => item.id)).toEqual(['growth', 'quiz']);
    expect(report.text).toContain('=== Growth investigations ===');
    expect(report.text).toContain('=== Quiz and practice ===');
    expect(report.text).not.toContain('=== Mystery specimens ===');
    expect(report.text.indexOf('=== Growth')).toBeLessThan(report.text.indexOf('=== Quiz'));
    expect(report.text).toContain('not an importable backup or an overall mastery score');
  });

  it('uses optional portfolio label translations without changing recorded text or invoking ambient translation', () => {
    const translate = vi.fn((key, fallback) => key === 'portfolio_growth' ? 'Mes essais' : key === 'portfolio_title' ? 'Mon dossier' : fallback);
    const seed = { growthInvestigation: { hypothesis: 'Learner text stays literal.' }, mysteryLab: { cases: { pond: { reasoning: 'Only a question.' } } }, quizAnswers: [0] };
    const report = core.work.portfolio(seed, translate);
    expect(report.sections.find(item => item.id === 'growth').title).toBe('Mes essais');
    expect(report.text).toContain('Mon dossier');
    expect(report.text).toContain('Learner text stays literal.');
    expect(translate.mock.calls.every(([key]) => key.startsWith('portfolio_'))).toBe(true);
    const catalogTranslate = vi.fn((key, fallback) => key === 'pond_context' ? 'Explicit supplied context.' : fallback);
    expect(core.mystery.catalog(catalogTranslate)[0].context).toBe('Explicit supplied context.');
  });

  it('keeps saved and previous Mystery citations independent of current revealed observations', () => {
    const seed = { mysteryLab: { cases: { pond: {
      record: mysteryReport('Current saved claim.'), previousRecord: mysteryReport('Previous saved claim.'),
      revealed: ['context', 'size'], evidence: ['behavior', 'size'], reasoning: 'Unfinished revised reasoning.'
    } } } };
    const text = section(seed, 'mystery').text;
    const saved = text.slice(text.indexOf('Current saved evidence'), text.indexOf('Previous saved evidence'));
    const previous = text.slice(text.indexOf('Previous saved evidence'), text.indexOf('Current working notes'));
    const working = text.slice(text.indexOf('Current working notes'));
    expect(saved).toContain('Current saved claim.'); expect(saved).toContain('many cilia beat together');
    expect(previous).toContain('Previous saved claim.'); expect(previous).toContain('two nuclei');
    expect(working).toContain('Unfinished revised reasoning.'); expect(working).toContain('about 200 µm long');
    expect(working).not.toContain('many cilia beat together'); expect(working).not.toContain('two nuclei');
    expect(text).not.toContain('A cell with nuclei and coordinated cilia supports a ciliated protist.');
    expect(text).not.toContain('A growing neighbor');
  });

  it('exports a context-only Mystery question without unseen observations, feedback, or a fabricated saved report', () => {
    const text = section({ mysteryLab: { cases: { pond: { reasoning: 'What further observations would help?' } } } }, 'mystery').text;
    expect(text).toContain('What further observations would help?');
    expect(text).toContain('A fictional freshwater sample');
    expect(text).not.toContain('Current saved evidence');
    expect(text).not.toContain('two nuclei');
    expect(text).not.toContain('many cilia beat together');
    expect(text).not.toContain('supports a ciliated protist');
  });

  it('exports each checked microscope estimate with its own units, calibration, and later draft', () => {
    const current = measurement(2250, 'nm'), previous = measurement(1, 'um', { method: 'em', mag: 10000, zoom: 1, fieldUm: 4, scaleUm: 1 });
    const text = section({ microscopeMeasurements: { ecoli: { result: current, previousResult: previous, draft: { ...measurement('3.100'), value: '3.100' } } } }, 'microscope').text;
    expect(text.indexOf('Current saved evidence')).toBeLessThan(text.indexOf('Previous saved evidence'));
    expect(text.indexOf('Previous saved evidence')).toBeLessThan(text.indexOf('Unchecked working estimate'));
    expect(text).toContain('Original estimate: 2250 nm'); expect(text).toContain('Estimate in micrometers: 2.25');
    expect(text).toContain('Absolute difference from the drawing reference (%): 12.5');
    expect(text).toContain('em; 10000×; display zoom 1×'); expect(text).toContain('Field width (µm): 4; scale bar (µm): 1');
    expect(text).toContain('Original estimate: 3.100 um');
    const draft = text.slice(text.indexOf('Unchecked working estimate'));
    expect(draft).not.toContain('Drawing reference (µm):'); expect(draft).not.toContain('Absolute difference from');
  });

  it.each(['=2+2', '1e-9999', '0'])('preserves invalid microscope draft text without invented conversion or a reference answer: %s', value => {
    const report = section({ microscopeMeasurements: { ecoli: { draft: measurement(value, 'nm') } } }, 'microscope');
    expect(report.hasContent).toBe(true);
    expect(report.text).toContain('Original estimate: ' + value + ' nm');
    expect(report.text).toContain('Estimate in micrometers: Invalid numeric estimate');
    expect(report.text).not.toContain('Drawing reference (µm):');
    expect(report.text).not.toContain('Within the ±20% practice band:');
  });

  it('keeps Gram saved writing, previous writing, and currently observed stages separate', () => {
    const record = { prediction: 'thick', interpretation: 'wall', explanation: 'Current saved mechanism.' };
    const previousRecord = { ...record, prediction: 'both', explanation: 'Previous saved mechanism.' };
    const text = section({ gramInvestigation: { record, previousRecord, step: 1, maxStep: 2, prediction: 'thin', interpretation: 'shape', explanation: 'Current draft speculation.' } }, 'gram').text;
    expect(text).toContain('Current saved mechanism.'); expect(text).toContain('Previous saved mechanism.'); expect(text).toContain('Current draft speculation.');
    expect(text.match(/no historical log of observed stages/g)).toHaveLength(2);
    expect(text).toContain('Stages observed in the current investigation: 2/4');
    expect(text).toContain('Iodine: both models remain purple.');
    expect(text).not.toContain('Decolorization:'); expect(text).not.toContain('Safranin counterstain:');
    expect(text.indexOf('Current working notes')).toBeLessThan(text.indexOf('Stages observed'));
  });

  it('supports note-only Gram work without revealing any staining results', () => {
    const text = section({ gramInvestigation: { explanation: 'A question before observing.' } }, 'gram').text;
    expect(text).toContain('A question before observing.');
    expect(text).toContain('Stages observed in the current investigation: 0/4');
    expect(text).not.toContain('Crystal violet:'); expect(text).not.toContain('Current saved evidence');
  });

  it('reconstructs all saved Growth hours against each original control, leaving the original prediction literal', () => {
    const original = trial(), second = trial(8, { control: conditions({ tempC: 20 }), prediction: 'lower', hypothesis: 'A different original control.' });
    const text = section({ growthInvestigation: { trials: [original, second], control: conditions({ tempC: 80 }), prediction: 'unsure' }, growthReviewHour: 3 }, 'growth').text;
    const firstText = text.slice(text.indexOf('Current saved evidence — Trial 7'), text.indexOf('Current saved evidence — Trial 8'));
    const expected = core.growth.compare(original.control, original.conditions);
    expect(firstText).toContain('Temperature (°C): 37');
    expect(firstText).not.toContain('Temperature (°C): 80');
    expect(firstText).toContain('Original prediction: Higher population');
    expect(firstText).toContain('Reasoning before the run: Original reasoning before the run.');
    expect(firstText).toContain('Later evidence and explanation: Later explanation from the evidence.');
    expect(firstText.match(/^\d+\t/gm)).toHaveLength(25);
    expect(firstText).toContain('24\t' + Number(expected.control.finalPopulation.toFixed(2)) + '\t' + Number(expected.trial.finalPopulation.toFixed(2)));
    expect(text).toContain('A different original control.');
    expect(text).toContain('Prediction comparisons use hour 24');
  });

  it('does not invent an original control or zero comparison for a legacy Growth trial', () => {
    const text = section({ growthInvestigation: { trials: [trial(17, { control: null })] } }, 'growth').text;
    expect(text).toContain('Original saved control: Not recorded');
    expect(text).toContain('Comparison unavailable: no original control was saved.');
    expect(text).toContain('0\t\t5'); expect(text).not.toContain('Model comparison at hour 24:');
  });

  it('includes a removed Growth trial without restoring it or labeling it active', () => {
    const seed = { growthInvestigation: { trials: [], selectedId: null, nextId: 10, removed: { trial: trial(9), index: 0 } } };
    const before = JSON.stringify(seed), text = section(seed, 'growth').text;
    expect(text).toContain('Removed evidence (available to restore; outside the active notebook) — Trial 9');
    expect(text).not.toContain('Current saved evidence — Trial');
    expect(text.match(/^\d+\t/gm)).toHaveLength(25);
    expect(JSON.stringify(seed)).toBe(before);
  });

  it('includes both complete saved sweeps and the held settings for each', () => {
    const sweep = { variable: 'oxygen', conditions: conditions() }, previousSweep = { variable: 'tempC', conditions: conditions({ profile: 'thermus', tempC: 70, pH: 7.5 }) };
    const text = section({ growthInvestigation: { sweep, previousSweep } }, 'growth').text;
    expect(text).toContain('Current saved sweep'); expect(text).toContain('Previous saved sweep (available to restore)');
    expect(text).toContain('Thermus aquaticus'); expect(text).toContain('maximum modeled rate 0.4 per hour');
    const current = text.slice(text.indexOf('Current saved sweep'), text.indexOf('Previous saved sweep'));
    const previous = text.slice(text.indexOf('Previous saved sweep'));
    expect(current.match(/^\d+\t/gm)).toHaveLength(core.growth.sweepSteps.oxygen.length);
    expect(previous.match(/^\d+\t/gm)).toHaveLength(core.growth.sweepSteps.tempC.length);
    expect(current).toContain('Temperature (°C): 37'); expect(previous).toContain('pH: 7.5');
  });

  it('exports Growth draft settings and reasoning without running a model or revealing an outcome', () => {
    const exp = vi.spyOn(Math, 'exp').mockImplementation(() => { throw new Error('Draft must not simulate'); });
    const text = section({ growthLab: conditions({ profile: 'thermus', tempC: 70 }), growthInvestigation: { control: conditions(), prediction: 'higher', hypothesis: 'My pending prediction.', explanation: 'Draft note.' } }, 'growth').text;
    expect(text).toContain('Next-run setup only; no outcome is calculated for this draft.');
    expect(text).toContain('Working prediction: Higher population'); expect(text).toContain('My pending prediction.');
    expect(text).toContain('Temperature (°C): 70'); expect(text).not.toContain('Model comparison at hour 24:');
    expect(text).not.toContain('Model hour\tOriginal control population'); expect(exp).not.toHaveBeenCalled();
  });

  it('recognizes a changed Growth setup and exports whitelisted legacy notes without dumping unknown log fields', () => {
    expect(section({ growthLab: { tempC: 45 } }, 'growth').hasContent).toBe(true);
    const text = section({ growthLab: { hypothesis: 'Earlier hypothesis.', explanation: 'Earlier explanation.', log: [{ profile: 'ecoli', t: 37, p: 7, o: 0, state: 'low', privatePayload: 'DO NOT EXPORT' }, { privatePayload: 'DO NOT EXPORT' }] } }, 'growth').text;
    expect(text).toContain('Earlier hypothesis.'); expect(text).toContain('Earlier explanation.'); expect(text).toContain('Earlier Growth Lab log');
    expect(text).toContain('Temperature (°C): 37'); expect(text).not.toContain('DO NOT EXPORT'); expect(text).not.toContain('[object Object]');
  });

  it('keeps Resistance original notes, later reflection, recovery, and current observed culture separate', () => {
    const saved = core.resistance.evidence(run()), removed = core.resistance.evidence(run({ notes: 'Removed original notes.' }));
    const seed = { resistanceNotebook: { records: [{ id: 4, evidence: saved, reviewNote: 'Later saved reflection.' }], removed: { record: { id: 9, evidence: removed, reviewNote: 'Removed later reflection.' }, index: 0 } }, resistanceInvestigation: run({ notes: 'Current unsaved notes.' }) };
    const text = section(seed, 'resistance').text;
    expect(text).toContain('Evidence 4'); expect(text).toContain('Evidence 9');
    expect(text).toContain('My written evidence: Original run notes.'); expect(text).toContain('Later reflection: Later saved reflection.');
    expect(text).toContain('Removed original notes.'); expect(text).toContain('Removed later reflection.');
    expect(text).toContain('Current written evidence: Current unsaved notes.'); expect(text).toContain('Run status: in-progress');
    expect(text.match(/^1\t60\t8\t68\t12%$/gm)).toHaveLength(3);
    expect(text).not.toContain('prediction was correct');
  });

  it('marks extinction shares undefined and never samples future Resistance rounds', () => {
    const seed = { resistanceInvestigation: run({ history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 0, resistant: 0 }] }) };
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('No sampling'); });
    const text = section(seed, 'resistance').text;
    expect(text).toContain('Run status: extinct'); expect(text).toContain('1\t0\t0\t0\tUndefined');
    expect(text).not.toMatch(/^2\t/m); expect(random).not.toHaveBeenCalled();
  });

  it('exports pending Resistance notes/settings without presenting the untouched default culture as evidence', () => {
    expect(section({ resistanceInvestigation: { dose: 60, duration: 14, initRes: 3 } }, 'resistance').hasContent).toBe(false);
    const text = section({ resistanceInvestigation: { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'My initial question.' } }, 'resistance').text;
    expect(text).toContain('Run status: ready'); expect(text).toContain('My initial question.');
    expect(text).toContain('0\t72\t8\t80\t10%'); expect(text).not.toContain('Evidence 1');
  });

  it('never exports scores, solutions, explanations, or injected practice for an unfinished quiz', () => {
    const seed = { quizAnswers: [0], quizSubmitted: true, quizCorrect: 15, quizPractice: { answers: Array(15).fill(1), checked: Array(15).fill(true), reflections: Array(15).fill('INJECTED PRACTICE') } };
    const text = section(seed, 'quiz').text;
    expect(text).toContain('Unsubmitted or incomplete attempt'); expect(text).toContain('Recorded answers: 1/15');
    expect(text).not.toContain('Original score:'); expect(text).not.toContain('Correct answer:');
    expect(text).not.toContain('Explanation:'); expect(text).not.toContain('Original result:');
    expect(text).not.toContain('INJECTED PRACTICE'); expect(text).not.toContain('Practice answer:');
  });

  it('retains quiz submission gating for a complete unsubmitted attempt and keeps submitted reflections separate', () => {
    const answers = Array(15).fill(0), draft = { quizAnswers: answers, quizSubmitted: false };
    expect(section(draft, 'quiz').text).not.toContain('Original score:');
    const initial = core.quiz.report({ quizAnswers: answers, quizSubmitted: true });
    const missed = initial.questions.find(question => question.originalStatus === 'incorrect').index;
    const reflections = []; reflections[missed] = 'A later learner reflection.';
    const seed = { quizAnswers: answers, quizSubmitted: true, quizPractice: { answers: Array(15).fill(1), checked: Array(15).fill(true), reflections } };
    const text = section(seed, 'quiz').text;
    expect(text).toBe(core.quiz.exportText(seed));
    expect(text).toContain('Original score: ' + initial.originalScore + '/15');
    expect(text).toContain('Correct answer:');
    expect(text).toContain('Correction reflection (learner written, ungraded): A later learner reflection.');
  });

  it('is repeatable through JSON restore and leaves frozen mixed evidence, selections, XP, and playback unchanged', () => {
    const seed = {
      tab: 'growthLab', xp: 871, resistancePlaying: true, showMicroLibrary: true, growthReviewHour: 3,
      mysteryLab: { cases: { pond: { record: mysteryReport(), previousRecord: mysteryReport('Earlier saved report.'), reasoning: 'Current question.' } } },
      microscopeMeasurements: { ecoli: { result: measurement(), previousResult: measurement(1.5), draft: measurement('3.000') } },
      gramInvestigation: { record: { prediction: 'thick', interpretation: 'wall', explanation: 'Saved Gram reasoning.' }, maxStep: 2, explanation: 'Working Gram notes.' },
      growthLab: { ...conditions({ tempC: 40 }), hypothesis: 'Legacy note.', custom: { keep: true } },
      growthInvestigation: { trials: [trial()], selectedId: 7, removed: { trial: trial(9), index: 0 }, sweep: { variable: 'pH', conditions: conditions() }, previousSweep: { variable: 'oxygen', conditions: conditions() } },
      resistanceNotebook: { records: [{ id: 3, evidence: core.resistance.evidence(run()), reviewNote: 'Reflection.' }], selectedId: 3 },
      resistanceComparison: { aId: 3, bId: 99 }, resistanceInvestigation: run({ privateObservationMetadata: 'UNEXPORTED_RESISTANCE_METADATA_871' }), quizAnswers: [0]
    };
    const before = JSON.stringify(seed); freeze(seed);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('No RNG'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('No timestamp'); });
    const first = core.work.portfolio(seed), second = core.work.portfolio(JSON.parse(before));
    expect(first).toEqual(second); expect(first.sections.every(item => item.hasContent)).toBe(true);
    expect(JSON.stringify(seed)).toBe(before); expect(seed.xp).toBe(871); expect(seed.resistancePlaying).toBe(true);
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
    expect(first.text).not.toContain('"custom"');
    expect(first.text).not.toContain('UNEXPORTED_RESISTANCE_METADATA_871');
    expect(first.text).not.toMatch(/(?:^|[\n,{])\s*"?(?:bact|privateObservationMetadata)"?\s*:/m);
  });
});
