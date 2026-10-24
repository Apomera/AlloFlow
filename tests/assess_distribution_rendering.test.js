import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
let Panel, aggs, root, host;

beforeAll(() => {
  const scope = { AlloModules: {} };
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(scope);
  aggs = scope.AlloModules.QuizLiveAggregators;
  const source = readFileSync('view_quiz_source.jsx', 'utf8');
  const start = source.indexOf('  function AssessmentItemAnalysisPanel(p)');
  const end = source.indexOf('  function LiveResultsDashboard(p)', start);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  const compiled = require('@babel/core').transformSync(source.slice(start, end), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Panel = new Function('React', 'window', compiled + '\nreturn AssessmentItemAnalysisPanel;')(React, scope);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); host?.remove(); root = host = null; });

const original = { type: 'mcq', question: 'Choose the even number.', options: ['2', '3'], correctAnswer: '2' };
const current = { ...original, options: ['3', '2'] };
const packet = (question, optionIdx) => ({ itemType: 'mcq', answer: { optionIdx, optionText: question.options[optionIdx] }, questionSignature: aggs.assessmentItemSignature(question), submitted: true });
function analysisFor(allResponses) {
  return aggs.aggregateItemAnalysis({ allResponses }, { data: { questions: [current] } }, {});
}
async function renderDetails(analysis) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(Panel, { analysis })));
  await React.act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Review items').click());
  return host.querySelector('article');
}
const distributionLabels = article => [...article.querySelectorAll('.tabular-nums')].map(element => element.textContent);
const distributionWidths = article => [...article.querySelectorAll('div[style]')].map(element => element.style.width);

describe('rendered item-analysis distributions', () => {
  it('shows the compatible choice at 100% while retaining both responses in the total', async () => {
    const analysis = analysisFor({ previous: { 0: packet(original, 0) }, latest: { 0: packet(current, 1) } });
    expect(analysis.items[0]).toMatchObject({ respondents: 2, distributionRespondents: 1, versionReviewCount: 1 });
    const article = await renderDetails(analysis);
    expect(article.textContent).toContain('2 responses');
    expect(distributionLabels(article)).toEqual(['0 · 0%', '1 · 100%']);
    expect(distributionWidths(article)).toEqual(['0%', '100%']);
  });

  it('keeps zero compatible responses distinct from the raw response total', async () => {
    const analysis = analysisFor({ previous: { 0: packet(original, 0) } });
    expect(analysis.items[0]).toMatchObject({ respondents: 1, distributionRespondents: 0, versionReviewCount: 1 });
    const article = await renderDetails(analysis);
    expect(article.textContent).toContain('1 responses');
    expect(article.textContent).toContain('Question version review needed');
    expect(distributionLabels(article)).toEqual(['0 · 0%', '0 · 0%']);
    expect(distributionWidths(article)).toEqual(['0%', '0%']);
    expect(article.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('uses the original total for older analysis snapshots without a compatible-count field', async () => {
    const analysis = analysisFor({ first: { 0: packet(current, 0) }, second: { 0: packet(current, 1) } });
    delete analysis.items[0].distributionRespondents;
    const article = await renderDetails(analysis);
    expect(article.textContent).toContain('2 responses');
    expect(distributionLabels(article)).toEqual(['1 · 50%', '1 · 50%']);
    expect(distributionWidths(article)).toEqual(['50%', '50%']);
  });
});
