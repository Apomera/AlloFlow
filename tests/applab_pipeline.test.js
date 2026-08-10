/**
 * Behavioural tests for the AppLab generation pipeline.
 *
 * The other applab_*.test.js files assert on source strings. These actually
 * RUN the tool: the module is evaluated in a vm with a minimal React/DOM shim,
 * render() is invoked, and the Generate button's handler is driven with a
 * stubbed callGemini. That is the only way to catch the bugs this file guards:
 *
 *   - sections built serially instead of concurrently
 *   - agent reordering being cosmetic (order ignored by the pipeline)
 *   - a truncated model reply replacing the user's whole app
 *   - an oversized app being sliced and silently amputated
 *   - the preview error reporter being unreachable across the sandbox origin
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_applab.js');
let source;
// Compiling this ~1MB file costs over a second. Compile once, run the same
// vm.Script into a fresh context per test so the tests stay isolated but fast.
let script;

beforeAll(() => {
  source = fs.readFileSync(sourcePath, 'utf8');
  script = new vm.Script(source, { filename: 'stem_tool_applab.js' });
});

function makeReact() {
  return {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({
      type, props: props || {}, children: children.flat(Infinity),
    }),
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useCallback: (fn) => fn,
    useRef: (init) => ({ current: init }),
    useEffect: () => {},
    useMemo: (fn) => fn(),
  };
}

function loadTool(seed = {}) {
  const store = { ...seed };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: (i) => Object.keys(store)[i] || null,
  };
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    localStorage, setTimeout, clearTimeout,
    Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
    Promise, Symbol, Map, Set, parseInt, parseFloat, isNaN, encodeURIComponent,
    Blob: class {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
    FileReader: class { readAsText() {} },
    document: {
      createElement: () => ({ click() {}, style: {}, appendChild() {}, setAttribute() {} }),
      querySelector: () => null,
      getElementById: () => null,
      head: { appendChild() {} },
      body: { appendChild() {} },
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.addEventListener = () => {};
  sandbox.window.removeEventListener = () => {};
  vm.createContext(sandbox);
  script.runInContext(sandbox);
  return sandbox.window.StemLab._registry.appLab;
}

function findAll(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out)); return out; }
  if (pred(node)) out.push(node);
  (node.children || []).forEach((c) => findAll(c, pred, out));
  return out;
}

const DRAFT = JSON.stringify({ html: '', prompt: 'a demo counter app' });

async function generate({ reply, seed = {} }) {
  const tool = loadTool({ alloAppLabDraft: DRAFT, ...seed });
  const prompts = [];
  const toasts = [];
  const toolData = { appLab: {} };
  let inflight = 0;
  let peakConcurrency = 0;

  const tree = tool.render({
    React: makeReact(),
    t: (k, fb) => fb,
    toolData,
    setToolData: (fn) => { Object.assign(toolData, fn(toolData)); },
    callGemini: async (p, jsonMode) => {
      prompts.push(p);
      inflight++;
      peakConcurrency = Math.max(peakConcurrency, inflight);
      await new Promise((r) => setTimeout(r, 4));
      inflight--;
      return reply(p, jsonMode);
    },
    addToast: (m, kind) => toasts.push({ m, kind }),
    awardXP: () => {},
    announceToSR: () => {},
    gradeLevel: '5th Grade',
    icons: { ArrowLeft: 'x' },
  });

  const btn = findAll(tree, (n) => n.props && n.props['aria-label'] === 'Generate app')[0];
  expect(btn, 'Generate button should exist').toBeTruthy();

  // onClick does not return the promise, so wait for the run to go quiet.
  btn.props.onClick();
  let last = -1;
  let idle = 0;
  for (let i = 0; i < 2000 && idle < 8; i++) {
    await new Promise((r) => setTimeout(r, 2));
    if (inflight === 0 && prompts.length === last) idle++; else idle = 0;
    last = prompts.length;
  }

  return { prompts, toasts, peakConcurrency, log: toolData.appLab.lastPipelineLog || [] };
}

const PLAN = JSON.stringify({
  appTitle: 'Demo',
  sections: [
    { id: 'a', name: 'Header', desc: 'x', css: 'x', deps: '' },
    { id: 'b', name: 'Main', desc: 'x', css: 'x', deps: '' },
    { id: 'c', name: 'Controls', desc: 'x', css: 'x', deps: '' },
  ],
  sharedState: 'none',
  colorScheme: 'modern',
});
const FULL_DOC = `<!DOCTYPE html><html><head></head><body>${'z'.repeat(400)}</body></html>`;
const SECTION = `<section id="a">${'s'.repeat(200)}</section>`;

function standardReply(p) {
  if (p.includes('software architect decomposing')) return PLAN;
  if (p.includes('Review this HTML section')) return '[{"type":"a11y","description":"missing label","fix":"add one"}]';
  if (p.includes('Review this HTML app')) return '[]';
  if (p.includes('Fix these issues in this HTML section')) return SECTION;
  if (p.includes('assembling sections')) return FULL_DOC;
  if (p.includes('building ONE SECTION')) return SECTION;
  return FULL_DOC;
}

function pipelineText(log) { return JSON.stringify(log); }

describe('App Lab generation pipeline', () => {
  it('builds sections concurrently rather than one at a time', async () => {
    const r = await generate({ reply: standardReply });
    // architect + 3 builds + 3 reviews + 3 fixes + assemble
    expect(r.prompts).toHaveLength(11);
    expect(r.peakConcurrency).toBeGreaterThanOrEqual(3);
    expect(r.toasts.some((t) => t.kind === 'success')).toBe(true);
    expect(pipelineText(r.log)).toContain('Assembler');
  });

  it('bounds the section fan-out instead of bursting one call per section', async () => {
    // The Architect is *asked* for 2-4 sections but can return any number.
    // An unbounded burst of concurrent calls is what trips provider throttling.
    const wide = JSON.stringify({
      appTitle: 'Wide',
      sections: Array.from({ length: 12 }, (_, i) => ({
        id: 's' + i, name: 'Section ' + i, desc: 'x', css: 'x', deps: '',
      })),
      sharedState: 'none',
      colorScheme: 'modern',
    });
    const r = await generate({
      reply: (p) => (p.includes('software architect decomposing') ? wide : standardReply(p)),
    });
    expect(r.peakConcurrency).toBeLessThanOrEqual(3);
    const text = pipelineText(r.log);
    expect(text).toContain('building the first 6 only');
    // 6 sections, not 12.
    expect(r.log.filter((s) => String(s.agent).startsWith('Section:'))).toHaveLength(6);
  });

  it('honours agent ORDER: an Architect placed after the Builder is skipped', async () => {
    const seed = {
      alloAppLabPipeline: JSON.stringify([
        { id: 'builder', enabled: true },
        { id: 'architect', enabled: true },
        { id: 'reviewer', enabled: true },
        { id: 'fixer', enabled: true },
      ]),
    };
    const r = await generate({ reply: standardReply, seed });
    expect(r.prompts.filter((p) => p.includes('software architect decomposing'))).toHaveLength(0);
    expect(pipelineText(r.log)).toContain('too late');
  });

  it('reports a Fixer that has no Reviewer to take an issue list from', async () => {
    const seed = {
      alloAppLabPipeline: JSON.stringify([
        { id: 'architect', enabled: false },
        { id: 'builder', enabled: true },
        { id: 'reviewer', enabled: false },
        { id: 'fixer', enabled: true },
      ]),
    };
    const r = await generate({ reply: standardReply, seed });
    expect(pipelineText(r.log)).toContain('no issue list');
  });

  it('discards a truncated fixer reply instead of replacing the app with it', async () => {
    const r = await generate({
      reply: (p) => {
        if (p.includes('software architect')) return 'not json';
        if (p.includes('Review this HTML app')) return '[{"type":"error","description":"bug"}]';
        if (p.includes('Fix these issues')) return '<!DOCTYPE html><html><head></head><body>cut off';
        return FULL_DOC;
      },
    });
    expect(pipelineText(r.log)).toContain('kept the original app');
  });

  it('refuses to send an oversized app for fixing rather than slicing it', async () => {
    const big = `<!DOCTYPE html><html><head></head><body>${'y'.repeat(70000)}</body></html>`;
    const r = await generate({
      reply: (p) => {
        if (p.includes('software architect')) return 'not json';
        if (p.includes('Review this HTML app')) return '[{"type":"error","description":"bug"}]';
        if (p.includes('Fix these issues')) throw new Error('fixer must not be called on an oversized app');
        return big;
      },
    });
    const text = pipelineText(r.log);
    expect(text).toContain('too large to fix');
    expect(text).toContain('reviewed the first');
  });

  it('assembles locally, losslessly, when the sections exceed the model budget', async () => {
    const bigSection = (id) =>
      `<section id="${id}"><style>.${id}{color:red}</style><p>${id.repeat(12000)}</p>`
      + `<script>var ${id}=1;<` + `/script></section>`;
    const plan = JSON.stringify({
      appTitle: 'Big Demo',
      sections: [
        { id: 'aaa', name: 'One', desc: 'x', css: 'x', deps: '' },
        { id: 'bbb', name: 'Two', desc: 'x', css: 'x', deps: '' },
      ],
      sharedState: 'none',
      colorScheme: 'modern',
    });
    let assemblerCalled = false;
    const r = await generate({
      reply: (p) => {
        if (p.includes('software architect decomposing')) return plan;
        if (p.includes('assembling sections')) { assemblerCalled = true; return FULL_DOC; }
        if (p.includes('building ONE SECTION')) return bigSection(p.includes('One') ? 'aaa' : 'bbb');
        return '[]';
      },
    });
    expect(assemblerCalled).toBe(false);
    expect(pipelineText(r.log)).toContain('assembled locally');
  });

  it('keeps the pipeline log when a run fails, so the failure is inspectable', async () => {
    const r = await generate({
      reply: (p) => {
        if (p.includes('software architect decomposing')) return PLAN;
        if (p.includes('building ONE SECTION')) return '';
        return '';
      },
    });
    expect(r.log.length).toBeGreaterThan(0);
    expect(pipelineText(r.log)).toContain('Stopped:');
  });
});

describe('App Lab preview frame', () => {
  function renderWithApp(app) {
    const tool = loadTool({
      alloAppLabTab: 'build',
      alloAppLabDraft: JSON.stringify({ html: app, prompt: 'demo' }),
    });
    return tool.render({
      React: makeReact(),
      t: (k, fb) => fb,
      toolData: {},
      setToolData: () => {},
      callGemini: async () => '',
      addToast: () => {},
      awardXP: () => {},
      announceToSR: () => {},
      gradeLevel: '5th Grade',
      icons: { ArrowLeft: 'x' },
    });
  }

  const APP = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>hi</h1></body></html>';

  it('injects a postMessage error reporter into the previewed document', () => {
    const frame = findAll(renderWithApp(APP), (n) => n.type === 'iframe' && n.props.srcDoc)[0];
    expect(frame).toBeTruthy();
    const doc = frame.props.srcDoc;
    // Reading contentWindow across the sandbox's opaque origin throws, so the
    // reporter has to live INSIDE the frame and post outward.
    expect(doc).toContain('applab-preview-error');
    expect(doc).toContain('window.onerror');
    expect(doc).toContain('unhandledrejection');
    expect(doc).toContain('parent.postMessage');
    expect(doc).toContain('<h1>hi</h1>');
  });

  it('permits modals and forms while still withholding same-origin', () => {
    const frame = findAll(renderWithApp(APP), (n) => n.type === 'iframe' && n.props.srcDoc)[0];
    expect(frame.props.sandbox).toBe('allow-scripts allow-modals allow-forms');
    expect(frame.props.sandbox).not.toContain('allow-same-origin');
  });

  it('exposes Import as a real button, not a label wrapping a hidden input', () => {
    const tree = renderWithApp(APP);
    const importBtn = findAll(tree, (n) => n.type === 'button' && n.props['aria-label'] === 'Import HTML file');
    expect(importBtn).toHaveLength(1);
    // A <label> is not in the tab order and display:none strips the input from
    // the a11y tree, so the old markup was mouse-only.
    const labels = findAll(tree, (n) => n.type === 'label' && n.props.title === 'Import HTML file');
    expect(labels).toHaveLength(0);
  });

  it('gives the code playground the same modal-capable sandbox', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    // The playground's own default sample calls alert().
    expect(source).toContain("'Playground preview'), sandbox: 'allow-scripts allow-modals allow-forms'");
  });
});
