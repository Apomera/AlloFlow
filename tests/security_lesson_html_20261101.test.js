import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const marker = '<img src="invalid" data-audit-injected="yes" onerror="void(0)">';
const hostileId = 'resource\'"</script><img data-audit-injected="yes">';
let pipeline;
let mount;

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule(process.env.ALLO_SECURITY_DOC_MODULE || 'doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => { throw Error('No provider calls in security regression'); },
    callGeminiVision: async () => { throw Error('No provider calls in security regression'); },
    callImagen: async () => null, addToast() {}, t: key => key, isRtlLang: () => false,
    updateExportPreview() {}, getDefaultTitle: () => 'Lesson',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} }
  });
  window.React = globalThis.React = React;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.__alloT = key => key;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule(process.env.ALLO_SECURITY_TEACHER_MODULE || 'teacher_module.js');
});

afterEach(() => {
  if (mount) { act(() => ReactDOM.unmountComponentAtNode(mount)); mount.remove(); mount = null; }
  vi.restoreAllMocks();
});

function assertNoInjectedMarkup(doc) {
  expect(doc.querySelector('[data-audit-injected]')).toBeNull();
  const unexpected = [...doc.querySelectorAll('*')].flatMap(el => [...el.attributes]
    .filter(attr => /^on/i.test(attr.name) && attr.value === 'void(0)')
    .map(attr => attr.name));
  expect(unexpected).toEqual([]);
}

describe('lesson HTML encodes imported text at its actual output boundary', () => {
  it.each(['simplified', 'udl-advice'])('keeps %s title, metadata and ID as literal content', type => {
    const item = JSON.parse(JSON.stringify({ id: hostileId, type, title: marker, meta: marker, data: 'A safe passage.' }));
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, {}));
    assertNoInjectedMarkup(doc);
    expect(doc.querySelector('.section').id).toBe(hostileId);
    expect(doc.querySelector('.resource-header').textContent).toContain(marker);
  });

  it.each([false, true])('keeps full-pack contents and links inert (worksheet=%s)', worksheet => {
    const items = [
      { id: hostileId, type: 'simplified', title: marker, meta: marker, data: 'A safe passage.' },
      { id: 'ordinary', type: 'simplified', title: 'Fish & "chips"', data: '**Bold** and *italic*.' }
    ];
    const doc = parse(pipeline.generateFullPackHTML(items, 'Topic', worksheet, {}, { includeTeacherKey: false, annotations: [] }));
    assertNoInjectedMarkup(doc);
    expect(doc.querySelector('.alloflow-toc a').textContent).toBe(marker);
    expect(doc.querySelector('.alloflow-toc a').getAttribute('href')).toBe('#' + hostileId);
    expect(doc.body.textContent).toContain('Fish & "chips"');
    expect(doc.querySelector('.section strong').textContent).toBe('Bold');
  });

  it('does not turn a quote in a bare URL into a new attribute', () => {
    const doc = parse(pipeline.parseMarkdownToHTML('https://example.invalid/"data-audit-injected="yes'));
    assertNoInjectedMarkup(doc);
    expect(doc.querySelector('a').getAttribute('href')).toBe('https://example.invalid/"data-audit-injected="yes');
    expect(doc.querySelector('a').getAttribute('rel')).toContain('noopener');
  });

  it('keeps explicit links, query parameters and formatting without relinking generated markup', () => {
    const doc = parse(pipeline.parseMarkdownToHTML('[**Read**](https://example.invalid/?a=1&b=2)\nhttps://example.invalid/path\n2 * 3 * 4'));
    const links = [...doc.querySelectorAll('a')];
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('https://example.invalid/?a=1&b=2');
    expect(links[0].querySelector('strong').textContent).toBe('Read');
    expect(doc.body.textContent).toContain('2 * 3 * 4');
  });

  it('keeps document-based-question source text, questions, rubric and notes literal', () => {
    const item = { id: 'dbq', type: 'dbq', title: 'Source inquiry', data: {
      historicalContext: marker, synthesisPrompt: marker, teacherNotes: marker,
      documents: [{ id: 'doc', title: marker, source: marker, excerpt: marker, sourcingQuestions: [marker], analysisQuestions: [marker] }],
      rubric: [{ criteria: marker, 1: marker, 2: marker, 3: marker, 4: marker }]
    } };
    for (const teacher of [false, true]) {
      const doc = parse(pipeline.generateResourceHTML(item, teacher, {}, {}));
      assertNoInjectedMarkup(doc);
      expect(doc.body.textContent).toContain(marker);
    }
  });

  it('keeps bridge prompt text literal', () => {
    const doc = parse(pipeline.generateResourceHTML({ id: 'bridge', type: 'gemini-bridge', title: 'Prompt', data: marker }, false, {}, {}));
    assertNoInjectedMarkup(doc);
    expect(doc.body.textContent).toContain(marker);
  });

  it.each([false, true])('sanitizes imported math graphs while retaining static accessible SVG (teacher=%s)', teacher => {
    const graphData = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" role="img" aria-labelledby="graph-title" onload="void(0)">
      <title id="graph-title">A line graph</title><desc>The line rises from left to right.</desc>
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
      <g transform="translate(10 10)"><line x1="0" y1="70" x2="170" y2="70" stroke="black" marker-end="url(#arrow)" />
      <path d="M0 70 L150 0" stroke="blue" fill="none" /><circle cx="150" cy="0" r="3" /><text x="10" y="10">y = x</text></g>
      <script>void(0)</script><foreignObject><p>Active foreign content</p></foreignObject>
      <animate attributeName="href" values="javascript:void(0)" /><use href="https://example.invalid/graph.svg#shape" />
      <a href="javascript:void(0)"><text>Unsafe link</text></a>
    </svg><img src="https://example.invalid/pixel" onerror="void(0)"><iframe src="https://example.invalid/frame"></iframe>`;
    const item = { id: 'math-graph', type: 'math', title: 'Graph', data: { graphData, problems: [{ question: '1 + 1', answer: '2' }] } };
    const doc = parse(pipeline.generateResourceHTML(item, teacher, {}, {}));
    const svg = doc.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 100');
    expect(svg.getAttribute('aria-labelledby')).toBe('graph-title');
    expect(svg.querySelector('title').textContent).toBe('A line graph');
    expect(svg.querySelector('desc').textContent).toContain('rises');
    expect(svg.querySelector('g').getAttribute('transform')).toBe('translate(10 10)');
    expect(svg.querySelector('line').getAttribute('marker-end')).toBe('url(#arrow)');
    expect(svg.querySelectorAll('path')).toHaveLength(2);
    expect(svg.querySelector('circle').getAttribute('r')).toBe('3');
    expect(svg.querySelector('g text').textContent).toBe('y = x');
    expect(svg.querySelector('script, foreignObject, animate')).toBeNull();
    expect(svg.getAttribute('onload')).toBeNull();
    expect(svg.querySelector('use').hasAttribute('href')).toBe(false);
    expect(svg.querySelector('a').hasAttribute('href')).toBe(false);
    expect(doc.querySelector('iframe')).toBeNull();
    expect(doc.querySelector('img').hasAttribute('src')).toBe(false);
    assertNoInjectedMarkup(doc);
  });

  it.each([false, true])('keeps teacher math explanations and real-world connections literal (collapsed=%s)', mathHideSolution => {
    const item = { id: 'math-text', type: 'math', title: 'Math', data: {
      problems: [{ question: '1 + 1', answer: '2', steps: [{ explanation: marker, latex: '1 + 1 = 2' }], realWorld: marker }]
    } };
    const doc = parse(pipeline.generateResourceHTML(item, true, {}, { mathHideSolution }));
    assertNoInjectedMarkup(doc);
    expect(doc.body.textContent).toContain(marker);
    expect(doc.querySelector('.math-symbol')).not.toBeNull();
  });

  it.each([
    ['glossary', [{ term: 'River', definition: 'Flowing water' }]],
    ['faq', [{ question: 'Why?', answer: 'Because.' }]],
    ['math', { problems: [{ question: '1 + 1', answer: '2', steps: ['Two ones.'] }] }]
  ])('keeps %s identifiers out of embedded script source and attribute syntax', (type, data) => {
    const item = { id: hostileId, type, title: marker, data };
    const teacher = type === 'math';
    const safe = parse(pipeline.generateResourceHTML({ ...item, id: 'ordinary' }, teacher, {}, {}));
    const doc = parse(pipeline.generateResourceHTML(item, teacher, {}, {}));
    assertNoInjectedMarkup(doc);
    expect(doc.querySelector('.section').id).toBe(hostileId);
    expect(doc.querySelectorAll('script')).toHaveLength(safe.querySelectorAll('script').length);
    expect(doc.querySelectorAll('script').length).toBeGreaterThan(0);
    for (const script of doc.querySelectorAll('script')) expect(() => new Function(script.textContent)).not.toThrow();
    if (type === 'faq' || type === 'math') {
      for (const script of doc.querySelectorAll('script')) new Function('document', script.textContent)(doc);
      const button = doc.querySelector(type === 'faq' ? '.alloflow-faq-expand' : '.alloflow-math-reveal-all');
      expect(button).not.toBeNull();
      button.click();
      expect([...doc.querySelectorAll('details')].every(node => node.open)).toBe(true);
    }
  });

  it('prints imported mastery-map keys as text through the real progress button', () => {
    mount = document.createElement('div'); document.body.appendChild(mount);
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { write, close() {} } });
    act(() => ReactDOM.render(React.createElement(window.AlloModules.LearnerProgressView, {
      phonemeMastery: { [marker]: { independentAttempts: 5, independentAccuracy: 100 } },
      t: key => key, onClose() {}
    }), mount));
    const print = mount.querySelector('[data-help-key="learner_progress_print_report_btn"]');
    expect(print).not.toBeNull();
    act(() => print.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(write).toHaveBeenCalledOnce();
    const doc = parse(write.mock.calls[0][0]);
    assertNoInjectedMarkup(doc);
    expect(doc.body.textContent).toContain('/' + marker + '/');
  });
});
