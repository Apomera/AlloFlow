import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
let createExport, preflight;
beforeAll(() => {
  const compiled = babel.transformSync(readFileSync('export_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  createExport = new Function('window', compiled + ';return createExport;')(window);
  const preview = readFileSync('view_export_preview_source.jsx', 'utf8');
  preflight = new Function(preview.slice(preview.indexOf('function _builderH5PCompatibility'), preview.indexOf('function _builderEditorPageCss')) + ';return _builderH5PCompatibility;')();
});
afterEach(() => vi.restoreAllMocks());

const questions = [
  { type: 'fill-blank', question: 'The capital is ___.', expectedFill: 'Paris', fillBlankPolicy: 'exact' },
  { type: 'fill-blank', question: 'Plants absorb ___.', expectedFill: 'water', fillBlankPolicy: 'normalized' },
  { type: 'numeric-response', question: 'Measure the length.', correctValue: 100, unit: 'cm', numericSettings: { valueWeight: 0.8, allowEquivalentUnits: true } },
  { type: 'relation-mismatch', question: 'Repair the relationship.', pairs: [{ left: 'Root', right: 'Light' }, { left: 'Leaf', right: 'Light' }], wrongPairIndex: 0, correctPartnerForWrong: 'Water', candidatePartners: ['Water', 'Light'], requireReasoning: true, explanationPrompt: 'Explain how roots use this resource.' },
  { type: 'answer-evidence', question: 'Choose the claim.', answerOptions: ['A', 'B'], correctAnswer: 'A', evidenceOptions: ['E', 'F'], correctEvidence: 'E', explanationPrompt: 'Connect the evidence to the claim.' },
  { type: 'sequence-sense', question: 'Arrange the stages.', items: ['Seed', 'Shoot', 'Plant'], presentedOrder: [1, 0, 2], orderingPrinciple: 'time', sequenceMode: 'arrange-explain' },
  { type: 'self-explanation', question: 'Explain the cause.', rubric: 'Reference explanation.', studentCriteria: ['State a claim.', 'Connect two pieces of evidence.'] },
];

async function exportPackage(format, items = questions) {
  let zip;
  window.JSZip = class {
    constructor() { zip = this; this.files = new Map(); }
    file(name, value) { this.files.set(name, value); return this; }
    generateAsync() { return Promise.resolve(new Blob()); }
  };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:assess-policy-export');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const addToast = vi.fn();
  const api = createExport({
    liveRef: { current: { sourceTopic: 'Assessment', addToast, t: key => key } },
    warnLog: vi.fn(), debugLog: vi.fn(), generateUUID: () => '12345678-1234-1234-1234-123456789abc',
    escapeXml: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  });
  const generatedContent = { type: 'quiz', title: 'Policy export', data: { questions: items, scoringPolicy: { partialCredit: false } } };
  await api['handleExport' + format]({ generatedContent });
  return { zip, addToast, generatedContent };
}

describe('Assess policies remain explicit in QTI/H5P', () => {
  it('keeps exact spelling automatic and moves unsupported QTI policies to identified manual responses', async () => {
    const { zip, addToast } = await exportPackage('QTI');
    const xml = zip.files.get('assessment.xml');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    const items = Array.from(doc.getElementsByTagName('item'));
    expect(items).toHaveLength(7);
    expect(items[0].getElementsByTagName('varequal')[0].getAttribute('case')).toBe('Yes');
    for (const item of items.slice(1)) expect(item.getElementsByTagName('resprocessing')).toHaveLength(0);
    expect(xml).toContain('Value credit: 80%');
    expect(xml).toContain('Required explanation: Explain how roots use this resource.');
    expect(xml).toContain('Optional explanation: Connect the evidence to the claim.');
    expect(items[5].textContent).not.toContain('identify the misplaced step');
    expect(items[5].textContent).toContain('two components');
    expect(items[6].textContent).toContain('Connect two pieces of evidence.');
    const report = JSON.parse(zip.files.get('alloflow-assessment-compatibility.json'));
    expect(report.adaptations.map(row => row.question)).toEqual([2, 3, 4, 5]);
    expect(report.adaptations.every(row => row.scoring === 'manual-review')).toBe(true);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('ungraded responses requiring teacher review'), 'warning');
  });
  it('matches the H5P compatibility preview to actual ungraded adaptations', async () => {
    const { zip, addToast, generatedContent } = await exportPackage('H5P');
    expect(preflight(generatedContent)).toMatchObject({ valid: 7, omitted: 0, manualReview: 6, adapted: 5 });
    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.questions).toHaveLength(7);
    expect(content.questions[0].params.behaviour.caseSensitive).toBe(true);
    for (const item of content.questions.slice(1)) {
      expect(item.library).toBe('H5P.Essay 1.5');
      expect(item.params.behaviour.ignoreScoring).toBe(true);
    }
    expect(content.questions[2].params.solution.sample).toContain('Value credit: 80%');
    expect(content.questions[2].params.solution.sample).toContain('Partial credit: disabled');
    expect(content.questions[3].params.taskDescription).toContain('Required explanation');
    expect(content.questions[5].params.taskDescription).not.toContain('State whether');
    expect(content.questions[6].params.taskDescription).toContain('What to show in your response');
    expect(JSON.parse(zip.files.get('alloflow-assessment-compatibility.json')).adaptations).toHaveLength(4);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('preserve the selected'), 'warning');
  });
  it.each(['QTI', 'H5P'])('does not manufacture an answer key for malformed configured numeric items in %s', async format => {
    const invalid = { type: 'numeric-response', question: 'Invalid configured number', correctValue: null, numericSettings: { valueWeight: 0.8, allowEquivalentUnits: true } };
    const { zip, generatedContent } = await exportPackage(format, [questions[0], invalid]);
    expect(preflight(generatedContent)).toMatchObject({ valid: 1, omitted: 1 });
    expect(zip.files.get(format === 'QTI' ? 'assessment.xml' : 'content/content.json')).not.toContain(invalid.question);
  });
});
