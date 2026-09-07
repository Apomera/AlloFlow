import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, DbqView;
const t = key => ({
  'ui_common.completed': 'Completed',
  'ui_common.supporting_label': 'Supporting translated:',
  'ui_common.challenging_label': 'Challenging translated:',
  'ui_common.criteria': 'Criteria translated',
  'ui_common.historical_context': 'Context translated'
}[key] || '');

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_dbq_module.js');
  DbqView = window.AlloModules.DbqView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.restoreAllMocks();
});
const makeData = () => ({
  title: 'Source investigation', historicalContext: 'Context',
  documents: [{ id: 'A', title: 'Source A', excerpt: 'Source excerpt', sentenceStarters: [], sourcingQuestions: ['Who created it?'], analysisQuestions: ['What is the claim?'] }],
  corroborationClaims: [{ claim: 'A claim', supportingDocs: ['A'], challengingDocs: [] }],
  perspectives: [{ label: 'First' }, { label: 'Second' }],
  synthesisPrompt: 'Write an evidence-based answer.',
  rubric: [{ criteria: 'Evidence', 1: 'Beginning', 4: 'Advanced' }, { criteria: 'Reasoning', 1: 'Beginning', 4: 'Advanced' }]
});
function render(data = makeData(), responses = {}) {
  if (!host) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  }
  const handleStudentInput = vi.fn();
  act(() => root.render(React.createElement(DbqView, {
    generatedContent: { id: 'dbq-test', type: 'dbq', data }, studentResponses: { 'dbq-test': responses },
    handleStudentInput, cleanJson: text => text, gradeLevel: '8th', t, isTeacherMode: false
  })));
  return handleStudentInput;
}
function printPacket() {
  const printed = document.implementation.createHTMLDocument('');
  printed.open();
  vi.spyOn(window, 'open').mockReturnValue({ document: printed });
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Print DBQ Packet'));
  act(() => button.click());
  return printed;
}

describe('DBQ learner completion', () => {
  it('counts all displayed task fields, excluding whitespace and obsolete rubric scores', () => {
    render(makeData(), { 'doc-A-sourcing-0': ' ', _happNotes: { A: { historical: '  ' } }, _selfScores: { Obsolete: '4', Evidence: '5' } });
    const progress = host.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuemax')).toBe('14');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-label')).toBe('Completed');
  });
  it('reaches completion only after analysis, reliability, corroboration, perspectives, essay and current rubric work are filled', () => {
    render(makeData(), {
      'doc-A-sourcing-0': 'The author', 'doc-A-analysis-0': 'The claim',
      _happNotes: { A: { historical: 'Context', audience: 'Public', purpose: 'Inform', pointOfView: 'First-hand witness' } },
      _reliability_A: { rating: 'Very Reliable', bias: 'None detected', reasoning: 'Matches other evidence' },
      _corrobNotes: { 0: 'Sources agree' }, _perspectiveResponse: 'The first perspective cites evidence',
      _essayText: 'My synthesis', _selfScores: { Evidence: '4', Reasoning: '3', Obsolete: '4' }
    });
    expect(host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('14');
    expect(host.querySelector('[role="progressbar"]').getAttribute('aria-valuemax')).toBe('14');
  });
  it('counts fallback comparison-table fields only when no authored corroboration claims exist', () => {
    const data = makeData();
    data.corroborationClaims = [];
    data.perspectives = [];
    render(data, { 'corrob-claim-A': 'Claim', 'corrob-agree-A': 'None', 'corrob-disagree-A': 'None', _corrobNotes: { 0: 'Old claim' }, _perspectiveResponse: 'Old perspective' });
    expect(host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
    expect(host.querySelector('[role="progressbar"]').getAttribute('aria-valuemax')).toBe('15');
  });
  it('announces selected reliability and bias controls and retains their response callbacks', () => {
    const onInput = render(makeData(), { _reliability_A: { rating: 'Very Reliable', bias: 'None detected', reasoning: 'Evidence agrees' } });
    const selected = host.querySelector('button[aria-label="Rate as Very Reliable"]');
    const alternate = host.querySelector('button[aria-label="Rate as Questionable"]');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(alternate.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('button[aria-label="Bias: None detected"]').getAttribute('aria-pressed')).toBe('true');
    act(() => alternate.click());
    expect(onInput).toHaveBeenLastCalledWith('dbq-test', '_reliability_A', { rating: 'Questionable', bias: 'None detected', reasoning: 'Evidence agrees' });
  });
});

describe('DBQ printable packet integrity', () => {
  it('renders translated headings, omits missing sentence starters and preserves literal source/question text', () => {
    const data = makeData();
    const literal = '<img id="should-not-render" src="x"> & a < b';
    data.title = literal;
    data.historicalContext = literal;
    data.documents[0].excerpt = literal;
    data.documents[0].source = literal;
    data.documents[0].sourcingQuestions = [literal];
    data.documents[0].happPrompts = { purpose: literal };
    data.corroborationClaims[0].claim = literal;
    data.rubric[0].criteria = literal;
    data.rubric[0]['1'] = literal;
    data.synthesisPrompt = literal;
    data.thesisStarter = literal;
    render(data);
    const printed = printPacket();
    expect(printed.title).toBe('DBQ: ' + literal);
    expect(printed.querySelector('#should-not-render')).toBeNull();
    expect(printed.querySelector('script')).toBeNull();
    expect(printed.body.textContent).toContain(literal);
    for (const text of ['Supporting translated:', 'Challenging translated:', 'Criteria translated', 'Context translated']) expect(printed.body.textContent).toContain(text);
    expect(printed.body.textContent).not.toContain('{t(');
    expect(printed.body.textContent).not.toContain('undefined');
  });
  it('keeps usable HTTP sources and excludes executable and malformed source links', () => {
    const data = makeData();
    data.documents[0].sourceUrl = 'https://example.org/document?q="quoted"&page=2';
    data.documents.push({ id: 'B', sourceUrl: 'javascript:alert(1)', excerpt: 'Unsafe link' });
    data.documents.push({ id: 'C', sourceUrl: 'not a URL', excerpt: 'Malformed link' });
    render(data);
    const printed = printPacket();
    const links = [...printed.querySelectorAll('a')];
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe(new URL(data.documents[0].sourceUrl).href);
    expect(links[0].hasAttribute('onclick')).toBe(false);
  });
});
