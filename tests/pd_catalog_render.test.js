// PD catalog tab — SSR render test.
//
// Proves the Phase-2 catalog_module.js edits (the third "Professional
// Development" tab + PdHome) load and render without error, and that the
// window.__alloPdIntent deep-link flag opens the modal straight to the PD tab.
//
// catalog_module.js is a browser IIFE (window.AlloModules.CommunityCatalog). We
// load it the proven harness way — real React 18 from prismflow-deploy, eval the
// source against a sandbox window, then renderToStaticMarkup. Static render
// exercises the RENDER phase only (no useEffect), so no fetch/script-injection
// happens — each tab shows its loading state, which is exactly the marker we
// assert on to prove tab routing. (Interaction-level gating is covered by
// tests/pd_core.test.js.)

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const PD_CORE_SRC = readFileSync(resolve(process.cwd(), 'pd_core_module.js'), 'utf8');
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/approved/udl-representation-quickstart.json'), 'utf8'));

beforeAll(() => {
  // Minimal ambient globals the module touches at load/render time (no-ops are
  // fine; effects that would use these never run under static render).
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      currentScript: { src: 'https://example.test/catalog_module.js' },
      createElement: () => ({}),
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} },
    };
  }
  if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
  }
});

// Fresh evaluation each call so the IIFE dedup guard re-registers; returns the
// CommunityCatalog component. `pdIntent` sets the deep-link flag before render.
// `withPdCore` also loads pd_core_module.js into the same window so PdRunner's
// window.AlloModules.PdCore lookup resolves.
function loadCommunityCatalog(pdIntent, withPdCore) {
  const win = { React: React, AlloModules: {}, __alloPdIntent: !!pdIntent };
  if (withPdCore) {
    // eslint-disable-next-line no-new-func
    new Function('window', 'module', PD_CORE_SRC)(win, { exports: {} });
  }
  // eslint-disable-next-line no-new-func
  new Function('window', SRC)(win);
  return win.AlloModules.CommunityCatalog;
}

function render(component, props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(component, props));
}

describe('CommunityCatalog PD tab', () => {
  it('registers the component and renders all three tabs', () => {
    const CC = loadCommunityCatalog(false);
    expect(typeof CC).toBe('function');
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Browse');
    expect(html).toContain('Submit');
    expect(html).toContain('Professional Development');
  });

  it('defaults to the Browse tab when no PD intent flag is set', () => {
    const CC = loadCommunityCatalog(false);
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Loading catalog');     // BrowseTab loading marker
    expect(html).not.toContain('Loading PD library');
  });

  it('opens straight to the PD tab when window.__alloPdIntent is set', () => {
    const CC = loadCommunityCatalog(true);
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Loading PD library');   // PdHome loading marker
    expect(html).toContain('self-paced completion record'); // honest PD framing
    expect(html).not.toContain('Loading catalog');
  });

  it('returns null when closed', () => {
    const CC = loadCommunityCatalog(false);
    const html = render(CC, { isOpen: false, onClose() {}, addToast() {} });
    expect(html).toBe('');
  });
});

describe('PdRunner (rendered directly with PdCore + the seed module)', () => {
  it('renders the first activity, progress, and a Next button', () => {
    const CC = loadCommunityCatalog(false, true);
    expect(typeof CC.PdRunner).toBe('function');
    const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
    expect(html).toContain(SEED.metadata.title);                 // header title
    expect(html).toContain('step 1 of 3');                       // progress (3 activities)
    expect(html).toContain('progressbar');                       // a11y progress bar
    expect(html).toContain('read this');                         // first activity is a read (acknowledge)
    expect(html).toContain('Next');
    // The read gate is unmet on first render, so the hint shows.
    expect(html).toContain('Finish this activity to continue');
  });

  it('shows a clear loading state if the PD engine is absent', () => {
    const CC = loadCommunityCatalog(false, false); // no PdCore loaded
    const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
    expect(html).toContain('Loading the PD engine');
  });
});

// ── AI authoring (generatePdModule + PdGenerate) ──
function loadWithCore() {
  const win = { React: React, AlloModules: {}, __alloPdIntent: false };
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', PD_CORE_SRC)(win, { exports: {} });
  // eslint-disable-next-line no-new-func
  new Function('window', SRC)(win);
  return { CC: win.AlloModules.CommunityCatalog, PdCore: win.AlloModules.PdCore };
}

function validModuleObj() {
  return {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'gen', title: 'Generated', topic: 'X', summary: 's', estMinutes: 15, audience: 'educator', license: 'CC-BY-SA-4.0' },
    sections: [
      { title: 'Learn', activities: [{ id: 'read-1', type: 'read', title: 'R', content: { body: 'b', keyPoints: ['a', 'b', 'c'] }, gate: { kind: 'none' } }] },
      { title: 'Check', activities: [{ id: 'quiz-1', type: 'quiz', title: 'Q', gate: { kind: 'score', threshold: 0.75 }, content: { questions: [
        { prompt: 'p1', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
        { prompt: 'p2', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
      ] } }] },
      { title: 'Apply', activities: [{ id: 'reflect-1', type: 'reflect', title: 'A', content: { prompt: 'why' }, gate: { kind: 'none' } }] },
    ],
  };
}
const validJson = () => JSON.stringify(validModuleObj());
function invalidJson() {
  const o = validModuleObj();
  delete o.sections[1].activities[0].content.questions[0].correctIndex; // quiz w/o answer key
  return JSON.stringify(o);
}

describe('AI authoring — generatePdModule (mocked callGemini)', () => {
  it('extractFirstJsonObject strips ```json fences and surrounding prose', () => {
    const { CC } = loadWithCore();
    expect(CC._extractFirstJsonObject('sure:\n```json\n{"a":1}\n```\ndone')).toEqual({ a: 1 });
    expect(CC._extractFirstJsonObject('no json here')).toBeNull();
  });

  it('returns a validated module on the happy path (1 AI call)', async () => {
    const { CC, PdCore } = loadWithCore();
    let calls = 0;
    const callAI = async () => { calls++; return validJson(); };
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(true);
    expect(res.module.kind).toBe('pd_module');
    expect(calls).toBe(1);
  });

  it('handles fence-wrapped AI output', async () => {
    const { CC, PdCore } = loadWithCore();
    const callAI = async () => '```json\n' + validJson() + '\n```';
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(true);
  });

  it('auto-repairs once when the first draft fails validation', async () => {
    const { CC, PdCore } = loadWithCore();
    let calls = 0;
    const callAI = async () => { calls++; return calls === 1 ? invalidJson() : validJson(); };
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(true);
    expect(res.repaired).toBe(true);
    expect(calls).toBe(2);
  });

  it('fails gracefully when both attempts are invalid', async () => {
    const { CC, PdCore } = loadWithCore();
    const callAI = async () => invalidJson();
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/correctIndex|valid|score/i);
  });

  it('rejects an empty topic before calling the AI', async () => {
    const { CC, PdCore } = loadWithCore();
    let calls = 0;
    await expect(
      CC._generatePdModule({ topic: '   ' }, { callAI: async () => { calls++; return validJson(); }, getCore: () => PdCore })
    ).rejects.toThrow(/topic/i);
    expect(calls).toBe(0);
  });

  it('the prompt enforces evidence-based, anti-neuromyth, answer-keyed output', () => {
    const { CC } = loadWithCore();
    const prompt = CC._buildPdGenPrompt({ topic: 'Learning science', numQuestions: 3 });
    expect(prompt).toMatch(/EVIDENCE-BASED/);
    expect(prompt).toMatch(/neuromyth|learning styles/i);
    expect(prompt).toMatch(/correctIndex/);
  });

  it('PdGenerate renders the form + an honest AI-review banner', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdGenerate, { addToast() {}, onBack() {}, onRun() {}, onUse() {} });
    expect(html).toContain('Create a PD module with AI');
    expect(html).toMatch(/Review and edit/);
    expect(html).toContain('AI-assisted draft');
    expect(html).toContain('Topic');
  });
});

describe('video + checklist runner views', () => {
  const vcModule = {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'vc', title: 'VC Module', topic: 'T' },
    sections: [
      { title: 'Watch', activities: [{ id: 'v1', type: 'video', title: 'Watch it', content: { url: 'https://example.org/v', body: 'a clip' }, gate: { kind: 'none' } }] },
      { title: 'Commit', activities: [{ id: 'c1', type: 'checklist', title: 'Commit', content: { items: ['Try A', 'Try B'] }, gate: { kind: 'none' } }] },
    ],
  };

  it('VideoActivity renders a watch link + an acknowledge control', () => {
    const { CC } = loadWithCore();
    const html = render(CC.VideoActivity, { activity: vcModule.sections[0].activities[0], raw: {}, onRaw() {} });
    expect(html).toContain('Watch the video');
    expect(html).toContain('https://example.org/v');
    expect(html).toContain('watched this');
  });

  it('ChecklistActivity renders each item as a checkbox', () => {
    const { CC } = loadWithCore();
    const html = render(CC.ChecklistActivity, { activity: vcModule.sections[1].activities[0], raw: {}, onRaw() {} });
    expect(html).toContain('Try A');
    expect(html).toContain('Try B');
    expect(html).toContain('commit to');
  });

  it('PdRunner renders a video-first module with progress + the video view', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdRunner, { module: vcModule, addToast() {}, onExit() {} });
    expect(html).toContain('VC Module');
    expect(html).toContain('step 1 of 2');
    expect(html).toContain('Watch the video');
  });
});

describe('sim activity (AI-assessed scenario)', () => {
  const simModule = {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 's', title: 'S Module' },
    sections: [{ title: 'Practice', activities: [{ id: 's1', type: 'sim', title: 'Try it', content: { scenario: 'A student needs help.', rubric: 'empathy' }, gate: { kind: 'none' } }] }],
  };

  it('SimActivity renders the scenario + response box + AI-feedback button', () => {
    const { CC } = loadWithCore();
    const html = render(CC.SimActivity, { activity: simModule.sections[0].activities[0], raw: {}, onRaw() {} });
    expect(html).toContain('A student needs help.');
    expect(html).toContain('Your response');
    expect(html).toMatch(/AI feedback/);
  });

  it('buildSimScorePrompt asks for a formative masteryScore + feedback JSON', () => {
    const { CC } = loadWithCore();
    const p = CC._buildSimScorePrompt({ scenario: 'SCN', rubric: 'RUB' }, 'my response');
    expect(p).toContain('SCN');
    expect(p).toContain('RUB');
    expect(p).toMatch(/masteryScore/);
    expect(p).toMatch(/feedback/);
    expect(p).toMatch(/FORMATIVE/i);
  });

  it('PdRunner renders a sim module step', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdRunner, { module: simModule, addToast() {}, onExit() {} });
    expect(html).toContain('S Module');
    expect(html).toContain('A student needs help.');
  });
});

describe('certificate + completion history', () => {
  it('buildPdCertificateHtml renders a print-ready, honestly-labelled certificate (escaped)', () => {
    const { CC } = loadWithCore();
    const mod = { metadata: { title: 'Safe <b>Title</b>', topic: 'UDL' } };
    const html = CC._buildPdCertificateHtml(mod, { passed: 3, total: 3 }, 'Pat O\'Neil', '2026-06-20T12:00:00.000Z');
    expect(html).toContain('Certificate of Completion');
    expect(html).toContain('Safe &lt;b&gt;Title&lt;/b&gt;');         // title escaped
    expect(html).toContain('Pat O&#39;Neil');                         // name escaped
    expect(html).toContain('3 of 3 activities passed');
    expect(html).toMatch(/NOT accredited/i);
    expect(html).toContain('window.print()');
  });

  it('recordPdCompletion + loadPdHistory round-trip and de-dupe by moduleId', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({ moduleId: 'm1', moduleTitle: 'M1', complete: true, completedAt: '2026-06-20', passed: 2, total: 2 });
    CC._recordPdCompletion({ moduleId: 'm1', moduleTitle: 'M1 (retake)', complete: true, completedAt: '2026-06-21', passed: 2, total: 2 });
    const hist = CC._loadPdHistory();
    expect(hist.filter((h) => h.moduleId === 'm1')).toHaveLength(1); // de-duped
    expect(hist[0].moduleTitle).toBe('M1 (retake)');                  // newest kept
  });
});

describe('runner resume + home history (render)', () => {
  it('PdRunner resumes from saved progress', () => {
    const { CC } = loadWithCore();
    const KEY = 'alloflow_pd_progress::udl-representation-quickstart';
    globalThis.localStorage.setItem(KEY, JSON.stringify({ idx: 1, rawById: { 'read-representation': { acknowledged: true } }, done: false }));
    try {
      const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
      expect(html).toContain('step 2 of 3');                 // resumed at the quiz
      expect(html).toContain('Resumed where you left off');
      expect(html).toContain('Start over');
    } finally {
      globalThis.localStorage.removeItem(KEY);
    }
  });

  it('PdHome surfaces a "My learning" entry point when history exists', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({ moduleId: 'm9', moduleTitle: 'M9', complete: true, completedAt: '2026-06-20', passed: 1, total: 1 });
    try {
      const html = render(CC.PdHome, { addToast() {} });
      expect(html).toContain('My learning (1)');
    } finally {
      globalThis.localStorage.removeItem('alloflow_pd_history');
    }
  });
});
