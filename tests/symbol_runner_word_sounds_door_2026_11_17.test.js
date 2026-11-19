import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// 2026-11-17 (Aaron: "word sounds seems good"): a door to Symbol Runner from the Word Sounds sidebar panel.
//   - view_sidebar_panels: the Word Sounds panel has a second button that opens the Fluency Maze view (math_fluency_module.js)
//     on its Symbol Runner tab, as a history entry with config.startTab 'runner' (so it reopens there from history).
//   - math_fluency_module.js: FluencyMaze takes initialTab 'runner'; opened that way, its other tab is named for what it is.
//   - AlloFlowANTI.txt hands config.startTab to the view as initialTab, keyed by the entry, and heads the view "Symbol Runner".
const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(path.resolve(md, 'react'));
const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
const { act } = require(path.resolve(md, 'react-dom/test-utils'));
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function dom() {
  const d = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { runScripts: 'outside-only', url: 'https://alloflow-cdn.pages.dev/app/' });
  const w = d.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  w.IS_REACT_ACT_ENVIRONMENT = true;
  return w;
}
async function render(w, element) {
  const host = w.document.getElementById('root');
  const root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(element); });
  return { host, unmount: () => act(async () => { root.unmount(); }) };
}

describe('the door in the Word Sounds panel', () => {
  const load = () => {
    const w = dom();
    // The module's icons come from the host; stand-ins are enough here.
    w.Sparkles = () => null;
    w.eval(read('view_sidebar_panels_module.js'));
    return w;
  };

  it('opens the Fluency Maze view on Symbol Runner, as a history entry that reopens there', async () => {
    const w = load();
    const Panel = w.AlloModules.UiToolWordsoundsPanel;
    expect(typeof Panel).toBe('function');
    const calls = { history: [], content: [], view: [] };
    let history = [];
    const props = {
      expandedTools: ['ui-tool-wordsounds'], handleOpenWordSounds: () => {}, t: () => undefined, gradeLevel: '1st Grade', addToast: () => {},
      setHistory: (fn) => { history = fn(history); calls.history.push(history); }, setGeneratedContent: (c) => calls.content.push(c), setActiveView: (v) => calls.view.push(v),
    };
    const p = await render(w, React.createElement(Panel, props));
    const door = p.host.querySelector('[data-testid="wordsounds-open-symbol-runner"]');
    expect(door.textContent).toBe('Quick naming practice (Symbol Runner)');
    expect(door.getAttribute('aria-label')).toBe('Open Symbol Runner, quick naming practice, in the main view');
    expect(p.host.textContent).toContain('Quick naming practice: letters, sounds, sight words and numbers, against the clock. Students say each one aloud as they tap it.');
    // The Word Sounds button comes first; the door is under it.
    const buttons = [...p.host.querySelectorAll('button')].map((b) => b.textContent.trim());
    expect(buttons).toEqual(['Open Generator', 'Quick naming practice (Symbol Runner)']);
    await act(async () => { door.click(); });
    expect(calls.view).toEqual(['math-fluency-maze']);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ type: 'math-fluency-maze', title: 'Symbol Runner · 1st Grade', config: { grade: '1st Grade', startTab: 'runner' } });
    expect(history[0].id).toMatch(/^symbol-runner-\d+$/);
    expect(calls.content[0]).toEqual({ type: 'math-fluency-maze', data: history[0].data, id: history[0].id, config: history[0].config });
    await p.unmount();
  });

  it('uses the translated words when the app has them, and shows no door where the panel cannot open a view', async () => {
    const w = load();
    const Panel = w.AlloModules.UiToolWordsoundsPanel;
    const words = { 'fluency_maze.runner_open': 'Práctica de nombrar rápido', 'fluency_maze.runner_description': 'Nombra letras y números.', 'fluency_maze.runner_open_aria': 'Abrir' };
    const p = await render(w, React.createElement(Panel, { expandedTools: ['ui-tool-wordsounds'], handleOpenWordSounds: () => {}, t: (k) => words[k],
      setHistory: () => {}, setGeneratedContent: () => {}, setActiveView: () => {} }));
    expect(p.host.querySelector('[data-testid="wordsounds-open-symbol-runner"]').textContent).toBe('Práctica de nombrar rápido');
    expect(p.host.textContent).toContain('Nombra letras y números.');
    await p.unmount();
    const q = await render(w, React.createElement(Panel, { expandedTools: ['ui-tool-wordsounds'], handleOpenWordSounds: () => {}, t: () => undefined }));
    expect(q.host.querySelector('[data-testid="wordsounds-open-symbol-runner"]')).toBe(null);
    expect([...q.host.querySelectorAll('button')].map((b) => b.textContent.trim())).toEqual(['Open Generator']);
    await q.unmount();
  });

  it('the panel\'s parent hands it what it needs, and the labels are registered', () => {
    const src = read('view_sidebar_panels_source.jsx');
    expect(src).toContain('expandedTools, handleOpenWordSounds, t, setHistory, setGeneratedContent, setActiveView, gradeLevel, addToast\n                 })}');
    const parent = src.slice(src.indexOf('function GeneratorActionsView(props) {'), src.indexOf('function GeneratorActionsView(props) {') + 20000);
    for (const name of ['setHistory', 'setGeneratedContent', 'setActiveView', 'gradeLevel', 'addToast']) expect(parent, name).toMatch(new RegExp('\\b' + name + '\\b'));
    const ui = JSON.parse(read('ui_strings.js')).fluency_maze;
    expect(ui).toMatchObject({ runner_title: 'Symbol Runner', runner_tagline: 'Quick naming practice', runner_history_title: 'Symbol Runner',
      runner_open: 'Quick naming practice (Symbol Runner)', runner_open_aria: 'Open Symbol Runner, quick naming practice, in the main view' });
    for (const copy of ['desktop/web-app/public/ui_strings.js', 'desktop/app-build/ui_strings.js', 'desktop/web-app/build/ui_strings.js']) {
      if (fs.existsSync(copy)) expect(JSON.parse(read(copy)).fluency_maze.runner_open, copy).toBe('Quick naming practice (Symbol Runner)');
    }
  });
});

describe('Fluency Maze opened on its Symbol Runner tab', () => {
  const load = () => {
    const w = dom();
    w.eval(read('math_fluency_module.js'));
    w.AlloSymbolRunnerCore.mountRunner = () => ({ destroy() {} });
    w.fetch = () => Promise.resolve({ ok: false });
    return w;
  };
  const props = (w, extra) => ({ React, gradeLevel: '1', t: () => undefined, addToast: () => {}, handleScoreUpdate: () => {}, ...extra });

  it('starts on Symbol Runner, and its other tab is named Fluency Maze (math facts)', async () => {
    const w = load();
    const p = await render(w, React.createElement(w.AlloModules.FluencyMaze, props(w, { initialTab: 'runner' })));
    expect(p.host.querySelector('[data-testid="symbol-runner-panel"]')).not.toBe(null);
    const back = [...p.host.querySelectorAll('button')].find((b) => b.textContent === 'Fluency Maze (math facts)');
    expect(back).toBeTruthy();
    await act(async () => { back.click(); });
    expect(p.host.querySelector('[data-testid="symbol-runner-panel"]')).toBe(null);
    expect(p.host.querySelector('[data-testid="fluency-symbol-runner-tab"]')).not.toBe(null);
    await p.unmount();
  });

  it('opened from Math, as before: the maze first, and "Back to Math Maze" on the Symbol Runner tab', async () => {
    const w = load();
    for (const extra of [{}, { initialTab: 'maze' }, { initialTab: 'other' }]) {
      const p = await render(w, React.createElement(w.AlloModules.FluencyMaze, props(w, extra)));
      expect(p.host.querySelector('[data-testid="symbol-runner-panel"]')).toBe(null);
      await act(async () => { p.host.querySelector('[data-testid="fluency-symbol-runner-tab"]').click(); });
      expect([...p.host.querySelectorAll('button')].some((b) => b.textContent === 'Back to Math Maze')).toBe(true);
      await p.unmount();
    }
  });
});

describe('the host view', () => {
  it('hands config.startTab to the view as initialTab, keyed by the entry, and heads it Symbol Runner', () => {
    const anti = read('AlloFlowANTI.txt');
    const at = anti.indexOf("{activeView === 'math-fluency-maze' && (() => {");
    expect(at).toBeGreaterThan(0);
    const block = anti.slice(at, anti.indexOf("{activeView === 'stem-assessment'", at));
    expect(block).toContain("const runnerFirst = generatedContent?.config?.startTab === 'runner';");
    expect(block).toContain("initialTab={runnerFirst ? 'runner' : 'maze'}");
    expect(block).toContain('key={generatedContent?.id || \'fluency-maze\'}');
    expect(block).toContain("runnerFirst ? (t('fluency_maze.runner_title') || 'Symbol Runner') : (t('fluency_maze.title') || 'Fluency Maze')");
    expect(block).toContain("runnerFirst ? (t('fluency_maze.runner_tagline') || 'Quick naming practice') : (t('fluency_maze.tagline') || 'Math facts unlock the gates')");
    // The two src copies carry the same lines (a local build may rewrite other parts of them, so they are not compared whole).
    for (const copy of ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) expect(read(copy), copy).toContain("const runnerFirst = generatedContent?.config?.startTab === 'runner';");
  });
});
