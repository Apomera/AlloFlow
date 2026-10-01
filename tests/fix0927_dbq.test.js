// Document-Based Question fixes (2026-09-27 review of the 24 core resources).
//  D1  every excerpt says whether it is quoted, adapted or reconstructed (view, print, prompt)
//  D3  document ids are unique and claim/perspective references point at real documents
//  D4  generation settings stored with the request win over the sidebar
//  D5  with student AI off, the learner's own work completes the progress steps
//  D6  the live "View Original Source" link only opens http(s) URLs
// Mutation hooks: FIX0927_DBQ_VIEW, FIX0927_DBQ_DISPATCHER.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const VIEW = process.env.FIX0927_DBQ_VIEW || 'view_dbq_module.js';
const DISPATCHER = process.env.FIX0927_DBQ_DISPATCHER || 'generate_dispatcher_module.js';
let React, createRoot, act, root, host, DbqView, dispatcher;
const t = () => '';

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(fs.readFileSync(VIEW, 'utf8'))();
  DbqView = window.AlloModules.DbqView;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  new Function(fs.readFileSync(DISPATCHER, 'utf8'))();
  dispatcher = window.AlloModules.GenDispatcher;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks();
});
function render(data, responses = {}, extra = {}) {
  if (!host) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  const handleStudentInput = vi.fn();
  act(() => root.render(React.createElement(DbqView, {
    generatedContent: { id: 'dbq-fix', type: 'dbq', data }, studentResponses: { 'dbq-fix': responses },
    handleStudentInput, cleanJson: text => text, gradeLevel: '8th', t, isTeacherMode: false, ...extra,
  })));
  return handleStudentInput;
}
const doc = (over = {}) => ({ id: 'A', title: 'Letter', excerpt: 'Dear friend, the mill closed today.', source: 'Mill worker, 1911', sourcingQuestions: ['Who wrote it?'], analysisQuestions: ['What changed?'], ...over });

describe('D1 + D6: how an excerpt relates to its source, and safe links', () => {
  it('labels a linked excerpt with no kind as reconstructed, never as a plain quotation', () => {
    render({ title: 'T', documents: [doc({ documentType: 'linked', sourceUrl: 'https://www.loc.gov/item/1' })], rubric: [] });
    expect(host.textContent).toContain('Reconstructed from: Mill worker, 1911');
    expect(host.textContent).toContain('It is not a quotation');
    expect(host.textContent).not.toMatch(/(^|[^d] )Source: Mill worker/);
  });
  it('keeps "Source:" for a verbatim excerpt and "Adapted from:" for an adapted one', () => {
    render({ title: 'T', documents: [doc({ excerptKind: 'verbatim' })], rubric: [] });
    expect(host.textContent).toContain('Source: Mill worker, 1911');
    render({ title: 'T', documents: [doc({ excerptKind: 'adapted' })], rubric: [] });
    expect(host.textContent).toContain('Adapted from: Mill worker, 1911');
  });
  it('prints the same label in the packet', () => {
    render({ title: 'T', documents: [doc({ excerptKind: 'reconstructed' })], rubric: [] });
    const printed = document.implementation.createHTMLDocument('');
    printed.open();
    vi.spyOn(window, 'open').mockReturnValue({ document: printed });
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Print DBQ Packet')).click());
    expect(printed.body.textContent).toContain('Reconstructed from: Mill worker, 1911');
  });
  it('never renders a live link for a non-http(s) sourceUrl', () => {
    render({ title: 'T', documents: [doc({ sourceUrl: 'javascript:alert(1)' })], rubric: [] });
    expect(host.querySelector('a[href^="javascript"]')).toBeNull();
    render({ title: 'T', documents: [doc({ sourceUrl: 'https://archives.gov/doc' })], rubric: [] });
    expect(host.querySelector('a[href="https://archives.gov/doc"]')).not.toBeNull();
  });
});

describe('D3: unique document ids and live references', () => {
  it('gives duplicate and missing ids their own document and drops dangling claim references', () => {
    const onInput = render({
      title: 'T', rubric: [],
      documents: [doc({ id: 'A', title: 'First' }), doc({ id: 'A', title: 'Second' }), doc({ id: undefined, title: 'Third' })],
      corroborationClaims: [{ claim: 'Mills closed', supportingDocs: ['A', 'Z'], challengingDocs: ['Q'] }],
    }, { _dbqTab: 'documents' });
    const docButtons = [...host.querySelectorAll('button')].filter(b => /^Doc /.test(b.textContent.trim()));
    expect(docButtons.map(b => b.textContent.trim().slice(0, 5))).toEqual(['Doc A', 'Doc B', 'Doc C']);
    act(() => docButtons[1].click());
    expect(onInput).toHaveBeenLastCalledWith('dbq-fix', '_dbqActiveDoc', 'B');
    render({
      title: 'T', rubric: [], documents: [doc({ id: 'A' }), doc({ id: 'A' })],
      corroborationClaims: [{ claim: 'Mills closed', supportingDocs: ['A', 'Z'], challengingDocs: ['Q'] }],
    }, { _dbqTab: 'corroboration' });
    expect(host.textContent).not.toContain('Doc Z');
    expect(host.textContent).not.toContain('Doc Q');
  });
});

describe('D5: progress without student AI', () => {
  it('reaches 100% from the learner\'s own work when AI feedback is unavailable', () => {
    const data = { title: 'T', documents: [doc()], corroborationClaims: [{ claim: 'Mills closed', supportingDocs: ['A'] }], synthesisPrompt: 'Explain.', rubric: [{ criteria: 'Evidence', 1: 'b', 4: 'a' }] };
    render(data, {
      _happNotes: { A: { historical: 'x', audience: 'x', purpose: 'x', pointOfView: 'x' } },
      'doc-A-sourcing-0': 'A worker.', 'doc-A-analysis-0': 'The mill closed.',
      _corrobNotes: { 0: 'Document A supports it.' }, _essayText: 'Document A shows the mill closed.', _selfScores: { Evidence: '3' },
    });
    expect(host.textContent).toContain('100%');
  });
});

describe('D1 + D3 + D4: generation', () => {
  async function generate({ reply, configOverride = {}, sidebarMode = 'standard', inputText = 'The mill closed in 1911. Workers marched to the town hall.' }) {
    window._dbqMode = sidebarMode;
    const prompts = [];
    const captured = [];
    const explicit = {
      history: [], inputText, gradeLevel: '8th Grade', leveledTextLanguage: 'English', selectedLanguages: [], isTeacherMode: true, isParentMode: false, isIndependentMode: false,
      GUIDED_STEPS: [], LENGTH_THRESHOLDS: { short: 200, medium: 500, long: 900 }, TIMELINE_MODE_DEFINITIONS: {}, alloBotRef: { current: null },
      cleanJson: text => String(text), safeJsonParse: text => JSON.parse(text),
      callGemini: vi.fn(async prompt => { prompts.push(String(prompt)); return JSON.stringify(reply); }),
      setGeneratedContent: value => { if (value && value.type === 'dbq') captured.push(value); },
      setHistory: () => {}, t: key => key, warnLog: () => {}, debugLog: () => {}, addToast: () => {},
    };
    const CALLABLE = /^(set|handle|get|call|build|format|parse|validate|compute|generate|execute|apply|fetch|is|has|can|should|split|chunk|count|filter|detect|repair|reset|reverify|perform|normalize|sanitize|fix|extract|process|reg|flyTo|fisher)/;
    const deps = new Proxy(explicit, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (CALLABLE.test(prop)) return () => '';
        if (/s$/.test(prop) && /^(selected|target|suggested)/.test(prop)) return [];
        return '';
      },
      has: () => true,
    });
    try { await dispatcher.handleGenerate('dbq', null, false, null, configOverride, true, deps); } catch (_) { /* later pipeline steps may need more deps */ }
    delete window._dbqMode;
    return { prompt: prompts.find(p => p.includes('Document-Based Question')) || '', item: captured.at(-1) };
  }
  const reply = {
    title: 'Mill closing', historicalContext: 'c', synthesisPrompt: 'Explain', rubric: [],
    documents: [
      { id: 'A', title: 'A', excerptKind: 'verbatim', excerpt: 'The mill closed in 1911.', source: 'Town paper' },
      { id: 'A', title: 'B', excerptKind: 'verbatim', excerpt: 'I will never forget the silence of the looms that morning.', source: 'A weaver' },
      { title: 'C', excerpt: 'Workers marched.', source: 'Unknown' },
    ],
    corroborationClaims: [{ claim: 'Closing hurt workers', supportingDocs: ['Document A', 'Z'], challengingDocs: ['C'] }],
  };
  it('asks for excerptKind and never tells the model to create or expand documents', async () => {
    const { prompt } = await generate({ reply });
    expect(prompt).toContain('"excerptKind"');
    expect(prompt).not.toContain('Extract or create');
    expect(prompt).not.toContain('EXPAND it to a substantial passage');
  });
  it('normalizes ids, downgrades an unsupported "verbatim" claim, and drops dangling references', async () => {
    const { item } = await generate({ reply });
    const docs = item.data.documents;
    expect(docs.map(d => d.id)).toEqual(['A', 'B', 'C']);
    expect(docs.map(d => d.excerptKind)).toEqual(['verbatim', 'adapted', 'adapted']);
    expect(item.data.corroborationClaims[0].supportingDocs).toEqual(['A']);
    expect(item.data.corroborationClaims[0].challengingDocs).toEqual(['C']);
  });
  it('uses the generation record\'s DBQ mode over the sidebar\'s', async () => {
    const { prompt } = await generate({ reply, configOverride: { dbqMode: 'perspectives' }, sidebarMode: 'standard' });
    expect(prompt).toContain('COMPETING PERSPECTIVES');
  });
});
