import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { transformSync } = require('@babel/core');
const { act } = React;
let api, host, root, latest;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = {};
  window.__alloT = (key, options) => options?.defaultValue || key;
  const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
  const matcherStart = hostSource.indexOf('const quizAnswerMatches = (option, key) => {');
  const matcherEnd = hostSource.indexOf('window.quizAnswerMatches = quizAnswerMatches;', matcherStart);
  window.quizAnswerMatches = new Function(hostSource.slice(matcherStart, matcherEnd) + '; return quizAnswerMatches;')();
  const code = transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] }, compact: false,
  }).code;
  api = new Function('window', 'React', code + '\nreturn {AssessmentTextListEditor, AssessmentCoreFields, AssessmentDiagnosticFields, AssessmentQualityPanel, patch: _quizAuthoringListPatch, audit: _quizAuditAssessment};')(window, React);
}, 120000);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; latest = null;
});

function question(type, values) {
  return { type, question: 'Review the relationships.', conceptLabel: 'relationships', ...values };
}
function Editor({ initial }) {
  const [q, setQ] = React.useState(initial);
  latest = q;
  const patch = value => setQ(previous => ({ ...previous, ...value }));
  return React.createElement(React.Fragment, null,
    React.createElement(api.AssessmentCoreFields, { q, patch }),
    React.createElement(api.AssessmentDiagnosticFields, { q, patch }),
    React.createElement(api.AssessmentQualityPanel, { audit: api.audit({ questions: [q] }) }));
}
async function render(q) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Editor, { initial: q })));
}
async function clickLabel(label) {
  const element = Array.from(host.querySelectorAll('button')).find(button => button.getAttribute('aria-label') === label || button.textContent === label);
  expect(element, label).toBeTruthy();
  await act(async () => element.click());
}
async function changeLabel(label, value) {
  const element = Array.from(host.querySelectorAll('input')).find(input => input.getAttribute('aria-label') === label);
  expect(element, label).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function auditCodes(q) { return api.audit({ questions: [q] }).issues.map(issue => issue.code); }
function media(field, stem, values = ['A', 'B', 'C', 'D']) {
  return {
    [field + '_en']: values.map(value => value + ' translated'),
    [stem + 'ImageUrls']: values.map(value => value + '.png'),
    [stem + 'ImageAltTexts']: values.map(value => value + ' description'),
    [stem + 'ImagePrompts']: values.map(value => value + ' prompt'),
  };
}

describe('assessment authoring keeps choice identity', () => {
  it('emits operation metadata for edits, removals and additions', () => {
    const changes = [];
    const element = api.AssessmentTextListEditor({ label: 'Choices', values: ['A', 'B', 'C'], minimum: 2, onChange: (...args) => changes.push(args) });
    const rows = element.props.children[1];
    rows[1].props.children[0].props.onChange({ target: { value: 'Bee' } });
    rows[0].props.children[1].props.onClick();
    element.props.children[2].props.onClick();
    expect(changes).toEqual([
      [['A', 'Bee', 'C'], { type: 'edit', index: 1 }],
      [['B', 'C'], { type: 'remove', index: 0 }],
      [['A', 'B', 'C', ''], { type: 'add', index: 3 }],
    ]);
  });

  it('deletes a multi-select distractor without transferring correct answers or media', async () => {
    const q = question('multi-select', { options: ['A', 'B', 'C', 'D'], correctAnswers: ['B', 'D'], ...media('options', 'option') });
    await render(q);
    await clickLabel('Remove Answer options 1');
    expect(latest.options).toEqual(['B', 'C', 'D']);
    expect(latest.correctAnswers).toEqual(['B', 'D']);
    expect(latest.options_en).toEqual(['B translated', 'C translated', 'D translated']);
    expect(latest.optionImageUrls).toEqual(['B.png', 'C.png', 'D.png']);
    expect(latest.optionImageAltTexts).toEqual(['B description', 'C description', 'D description']);
    expect(latest.optionImagePrompts).toEqual(['B prompt', 'C prompt', 'D prompt']);
    expect(api.audit({ questions: [latest] }).ready).toBe(true);
    expect(q.options).toEqual(['A', 'B', 'C', 'D']);
    expect(q.optionImageUrls).toEqual(['A.png', 'B.png', 'C.png', 'D.png']);
  });

  it('requires an explicit new correct set when a keyed multi-select choice is removed', async () => {
    await render(question('multi-select', { options: ['A', 'B', 'C', 'D', 'E'], correctAnswers: ['B', 'D', 'E'] }));
    await clickLabel('Remove Answer options 2');
    expect(latest.options).toEqual(['A', 'C', 'D', 'E']);
    expect(latest.correctAnswers).toEqual([]);
    expect(auditCodes(latest)).toContain('multi-key');
    expect(host.textContent).toContain('Review before sharing');
  });

  it.each([
    ['answerOptions', 'answerOption', 'correctAnswer', 'Answer choices', 'evidence-answer-key'],
    ['evidenceOptions', 'evidenceOption', 'correctEvidence', 'Evidence choices', 'evidence-key'],
  ])('preserves the %s key and metadata when an earlier distractor is removed', async (field, stem, key, label) => {
    const q = question('answer-evidence', { answerOptions: ['A', 'B', 'C', 'D'], correctAnswer: 'B', evidenceOptions: ['A', 'B', 'C', 'D'], correctEvidence: 'B', ...media(field, stem) });
    await render(q);
    await clickLabel('Remove ' + label + ' 1');
    expect(latest[field]).toEqual(['B', 'C', 'D']);
    expect(latest[key]).toBe('B');
    expect(latest[field + '_en']).toEqual(['B translated', 'C translated', 'D translated']);
    expect(latest[stem + 'ImageUrls']).toEqual(['B.png', 'C.png', 'D.png']);
    expect(latest[stem + 'ImageAltTexts']).toEqual(['B description', 'C description', 'D description']);
    expect(latest[stem + 'ImagePrompts']).toEqual(['B prompt', 'C prompt', 'D prompt']);
  });

  it.each([
    ['correctAnswer', 'Answer choices', 'evidence-answer-key'],
    ['correctEvidence', 'Evidence choices', 'evidence-key'],
  ])('clears %s when its keyed choice is deleted', async (key, label, code) => {
    await render(question('answer-evidence', { answerOptions: ['A', 'B', 'C'], correctAnswer: 'B', evidenceOptions: ['A', 'B', 'C'], correctEvidence: 'B' }));
    await clickLabel('Remove ' + label + ' 2');
    expect(latest[key]).toBe('');
    expect(auditCodes(latest)).toContain(code);
    expect(host.textContent).toContain('Review before sharing');
  });

  it('renames the keyed answer using the canonical choice, preserving same-row media', async () => {
    await render(question('answer-evidence', { answerOptions: ['A', 'B', 'C'], correctAnswer: ' b ', evidenceOptions: ['Yes', 'No'], correctEvidence: 'Yes', ...media('answerOptions', 'answerOption', ['A', 'B', 'C']) }));
    await changeLabel('Answer choices 2', 'Bee');
    expect(latest.correctAnswer).toBe('Bee');
    expect(latest.answerOptionImageUrls).toEqual(['A.png', 'B.png', 'C.png']);
  });

  it('extends existing media arrays with empty entries when a choice is added', async () => {
    await render(question('multi-select', { options: ['A', 'B', 'C'], correctAnswers: ['A', 'B'], ...media('options', 'option', ['A', 'B', 'C']) }));
    await clickLabel('+ Add option');
    expect(latest.options).toEqual(['A', 'B', 'C', '']);
    expect(latest.correctAnswers).toEqual(['A', 'B']);
    expect(latest.optionImageUrls).toEqual(['A.png', 'B.png', 'C.png', '']);
    expect(latest.options_en).toEqual(['A translated', 'B translated', 'C translated', '']);
  });

  it('moves every legacy answer/evidence media alias with its retained choice', () => {
    for (const [field, names] of [
      ['answerOptions', ['answerImageUrls', 'answerImageAltTexts', 'answerImagePrompts', 'optionImageUrls', 'optionImageAltTexts', 'optionImagePrompts']],
      ['evidenceOptions', ['evidenceImageUrls', 'evidenceImageAltTexts', 'evidenceImagePrompts']],
    ]) {
      const q = question('answer-evidence', { [field]: ['A', 'B', 'C'], ...Object.fromEntries(names.map(name => [name, ['a', 'b', 'c']])) });
      const patch = api.patch(q, field, ['B', 'C'], { type: 'remove', index: 0 });
      for (const name of names) expect(patch[name]).toEqual(['b', 'c']);
    }
  });
});

describe('diagnostic authoring preserves order and relation identity', () => {
  const sequence = () => question('sequence-sense', { items: ['A', 'B', 'C', 'D', 'E'], presentedOrder: [0, 1, 3, 2, 4], intentionallyWrongIndex: 2, orderingPrinciple: 'process', principleOptions: ['size', 'process', 'time', 'rank'], ...media('items', 'item', ['A', 'B', 'C', 'D', 'E']) });
  const relation = () => question('relation-mismatch', { pairs: ['A', 'B', 'C', 'D'].map(left => ({ left, right: left + ' right', leftImageUrl: left + '.png', leftImageAltText: left + ' picture' })), pairs_en: ['A', 'B', 'C', 'D'].map(left => ({ left: left + ' translated', right: left + ' partner' })), wrongPairIndex: 2, correctPartnerForWrong: 'Repair', candidatePartners: ['Other', 'Repair', 'Extra'], ...media('candidatePartners', 'candidatePartner', ['Other', 'Repair', 'Extra']) });

  it('does not reset the presented order when a canonical step is edited', async () => {
    await render(sequence());
    await changeLabel('Steps in canonical order 2', 'Bee');
    expect(latest.items[1]).toBe('Bee');
    expect(latest.presentedOrder).toEqual([0, 1, 3, 2, 4]);
    expect(latest.intentionallyWrongIndex).toBe(2);
    expect(latest.itemImageUrls[1]).toBe('B.png');
  });

  it('remaps sequence order, diagnosis position and media when an earlier step is deleted', async () => {
    await render(sequence());
    await clickLabel('Remove Steps in canonical order 1');
    expect(latest.items).toEqual(['B', 'C', 'D', 'E']);
    expect(latest.presentedOrder).toEqual([0, 2, 1, 3]);
    expect(latest.intentionallyWrongIndex).toBe(1);
    expect(latest.itemImageUrls).toEqual(['B.png', 'C.png', 'D.png', 'E.png']);
    expect(latest.items_en).toEqual(['B translated', 'C translated', 'D translated', 'E translated']);
  });

  it('clears the diagnosis when removing a step restores canonical order', async () => {
    await render(sequence());
    await clickLabel('Remove Steps in canonical order 4');
    expect(latest.presentedOrder).toEqual([0, 1, 2, 3]);
    expect(latest.intentionallyWrongIndex).toBeNull();
  });

  it('adds a new canonical step after the existing displayed order', async () => {
    await render(sequence());
    await clickLabel('+ Add step');
    expect(latest.presentedOrder).toEqual([0, 1, 3, 2, 4, 5]);
    expect(latest.intentionallyWrongIndex).toBe(2);
    expect(latest.itemImageUrls.at(-1)).toBe('');
  });

  it('keeps principle translations/media aligned and invalidates a deleted correct principle', async () => {
    const q = { ...sequence(), ...media('principleOptions', 'principleOptions', ['size', 'process', 'time', 'rank']) };
    await render(q);
    await clickLabel('Remove Principle choices 2');
    expect(latest.orderingPrinciple).toBe('');
    expect(latest.principleOptions_en).toEqual(['size translated', 'time translated', 'rank translated']);
    expect(latest.principleOptionsImageUrls).toEqual(['size.png', 'time.png', 'rank.png']);
    expect(auditCodes(latest)).toContain('sequence-principle');
  });

  it('shifts a retained relation mismatch and its translated pair when an earlier pair is removed', async () => {
    await render(relation());
    await clickLabel('Remove pair 1');
    expect(latest.wrongPairIndex).toBe(1);
    expect(latest.correctPartnerForWrong).toBe('Repair');
    expect(latest.pairs[1]).toMatchObject({ left: 'C', leftImageUrl: 'C.png', leftImageAltText: 'C picture' });
    expect(latest.pairs_en[1]).toEqual({ left: 'C translated', right: 'C partner' });
  });

  it('clears the mismatch key and visibly selects the placeholder when the keyed pair is removed', async () => {
    await render(relation());
    await clickLabel('Remove pair 3');
    expect(latest.wrongPairIndex).toBeNull();
    expect(latest.correctPartnerForWrong).toBe('');
    const selector = Array.from(host.querySelectorAll('select')).find(select => select.closest('label').textContent.startsWith('Incorrect pair'));
    expect(selector.value).toBe('');
    expect(auditCodes(latest)).toContain('relation-index');
    expect(host.textContent).toContain('Review before sharing');
  });

  it('keeps the correct replacement and its media when a candidate distractor is deleted', async () => {
    await render(relation());
    await clickLabel('Remove Candidate partners 1');
    expect(latest.correctPartnerForWrong).toBe('Repair');
    expect(latest.candidatePartners).toEqual(['Repair', 'Extra']);
    expect(latest.candidatePartnerImageUrls).toEqual(['Repair.png', 'Extra.png']);
    expect(latest.candidatePartners_en).toEqual(['Repair translated', 'Extra translated']);
  });

  it('requires a new key when the correct replacement is removed', async () => {
    await render(relation());
    await clickLabel('Remove Candidate partners 2');
    expect(latest.correctPartnerForWrong).toBe('');
    expect(auditCodes(latest)).toContain('relation-key');
  });
});
