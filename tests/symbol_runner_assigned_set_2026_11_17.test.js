import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// 2026-11-17 (round 6, owner: "please keep improving further"):
//   A. A teacher saves the Symbol Runner set (set, cards in a round, rehearsal, an own list) into the resource; students
//      who open the resource start with it, and are told their teacher chose it.
//   B. A printable naming grid of the student's tricky symbols (symbol_runner_core.js: buildPrintableRanSheetHtml onlyAnswers).
const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function load() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { runScripts: 'outside-only', url: 'https://alloflow-cdn.pages.dev/app/' });
  const w = dom.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = require(path.resolve(md, 'react'));
  w.eval(read('math_fluency_module.js'));
  return w;
}

const React = require(path.resolve(md, 'react'));
const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
const { act } = require(path.resolve(md, 'react-dom/test-utils'));

async function mount(extra, storage) {
  const w = load();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  w.IS_REACT_ACT_ENVIRONMENT = true;
  if (storage) w.localStorage.setItem('symbol_runner_bests', JSON.stringify(storage));
  const given = [];
  const realCore = w.AlloSymbolRunnerCore;
  w.AlloSymbolRunnerCore.mountRunner = (container, config) => { given.push(config); return { destroy() {} }; };
  w.fetch = () => Promise.resolve({ ok: false });
  const host = w.document.getElementById('root');
  const root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(w.AlloModules.FluencyMaze, Object.assign({ React, t: (k) => k, addToast: () => {}, handleScoreUpdate: () => {}, initialTab: 'runner' }, extra)));
  });
  const finish = async (st) => { await act(async () => { given[given.length - 1].onComplete(st); }); };
  return { w, host, given, finish, core: realCore, unmount: () => act(async () => { root.unmount(); }) };
}

describe('A. a set saved into the resource', () => {
  it('starts the panel with the saved set, length and rehearsal', async () => {
    const p = await mount({ runnerSettings: { mode: 'digits_single', count: 10, rehearsal: true } });
    const cfg = p.given[p.given.length - 1];
    expect(cfg).toMatchObject({ modeId: 'digits_single', count: 10 });
    expect(p.host.querySelector('[data-testid="symbol-runner-count"]').value).toBe('10');
    // A student (no save button): told the teacher chose it.
    expect(p.host.querySelector('[data-testid="symbol-runner-save-set"]')).toBe(null);
    expect(p.host.querySelector('[data-testid="symbol-runner-teacher-set"]').textContent).toBe('Your teacher chose this practice: Numbers 0 to 9, 10 cards, with rehearsal.');
    await p.unmount();
  });

  it('gives a teacher a Save button that hands the current set to the host and says what students will get', async () => {
    const saved = [];
    const p = await mount({ onSaveRunnerSettings: (s) => saved.push(s) });
    expect(p.host.querySelector('[data-testid="symbol-runner-teacher-set"]')).toBe(null);
    const select = p.host.querySelector('[data-testid="symbol-runner-count"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(p.w.HTMLSelectElement.prototype, 'value').set;
      setter.call(select, '30');
      select.dispatchEvent(new p.w.Event('change', { bubbles: true }));
    });
    await act(async () => { p.host.querySelector('[data-testid="symbol-runner-save-set"]').click(); });
    expect(saved).toEqual([{ mode: 'confusable_letters', count: 30, rehearsal: false, custom: '' }]);
    expect(p.host.textContent).toContain('Saved. Students who open this resource start with: Letters that look alike (b, d, p, q), 30 cards.');
    await p.unmount();
  });

  it('shows the teacher what students start with when the resource already has a set, and keeps an own list', async () => {
    const saved = [];
    const p = await mount({ runnerSettings: { mode: 'custom', count: 20, custom: 'cat dog sun' }, onSaveRunnerSettings: (s) => saved.push(s) });
    expect(p.host.querySelector('[data-testid="symbol-runner-assign"]').textContent).toContain('Students start with: My own list, 20 cards.');
    expect(p.given[p.given.length - 1]).toMatchObject({ modeId: 'custom', customSymbols: 'cat dog sun' });
    await act(async () => { p.host.querySelector('[data-testid="symbol-runner-save-set"]').click(); });
    expect(saved[0]).toEqual({ mode: 'custom', count: 20, rehearsal: false, custom: 'cat dog sun' });
    await p.unmount();
  });

  it('reads only a well-formed saved set', () => {
    const I = load().AlloModules.MathFluencyInternals;
    expect(I._srSettings(null)).toBe(null);
    expect(I._srSettings([])).toBe(null);
    expect(I._srSettings({ mode: '<b>' })).toBe(null);
    expect(I._srSettings({ mode: 'digits_single', count: 999, rehearsal: 'yes', custom: 'x' })).toEqual({ mode: 'digits_single', count: 20, rehearsal: false, custom: '' });
    expect(I._srSettings({ mode: 'custom', count: 30, rehearsal: true, custom: 'a'.repeat(3000) }).custom).toHaveLength(2000);
  });

  it('the host passes the saved set and, for a teacher, a saver that writes it into the resource', () => {
    const anti = read('AlloFlowANTI.txt');
    const at = anti.indexOf('<FluencyMazeComponent');
    const el = anti.slice(at, anti.indexOf('/>', anti.indexOf('onSaveRunnerSettings=', at)));
    expect(el).toContain('runnerSettings={generatedContent?.config?.runner || null}');
    expect(el).toContain("onSaveRunnerSettings={isTeacherMode && generatedContent?.id ? (runner) => {");
    expect(el).toContain("config: { ...(item.config || {}), startTab: 'runner', runner }");
    expect(el).toContain('setHistory(prev => prev.map(item => item && item.id === id ? put(item) : item));');
  });
});

describe('B. a printable grid of the tricky symbols', () => {
  it('the grid can be limited to some symbols of the set, and falls back to the whole set with fewer than two', () => {
    const core = load().AlloSymbolRunnerCore;
    const answers = (html) => [...html.matchAll(/<span><b>\d+\.<\/b> ([^<]*)<\/span>/g)].map((m) => m[1].trim());
    const only = answers(core.buildPrintableRanSheetHtml({ modeId: 'confusable_letters', onlyAnswers: ['b', 'd'], title: 'Tricky' }));
    expect(only).toHaveLength(40);
    expect([...new Set(only)].sort()).toEqual(['b', 'd']);
    const whole = answers(core.buildPrintableRanSheetHtml({ modeId: 'confusable_letters', onlyAnswers: ['b'] }));
    expect(new Set(whole).size).toBeGreaterThan(2);
    // Without the option, the grid is as before (same seed, same grid).
    expect(core.buildPrintableRanSheetHtml({ modeId: 'digits_single', seed: 's1' })).toBe(core.buildPrintableRanSheetHtml({ modeId: 'digits_single', seed: 's1', onlyAnswers: [] }));
  });

  it('offers the tricky grid in the teacher\'s fold once two or more tricky symbols are kept', async () => {
    const p = await mount({}, { 'confusable_letters|tricky': ['b', 'd'] });
    const btn = p.host.querySelector('[data-testid="sr-export-tricky-grid"]');
    expect(btn.textContent).toBe('Printable grid of the tricky symbols (.html)');
    const calls = [];
    p.w.AlloSymbolRunnerCore.buildPrintableRanSheetHtml = (o) => { calls.push(o); return '<html></html>'; };
    p.w.URL.createObjectURL = () => 'blob:x';
    p.w.URL.revokeObjectURL = () => {};
    p.w.HTMLAnchorElement.prototype.click = () => {};
    await act(async () => { btn.click(); });
    expect(calls[0]).toMatchObject({ modeId: 'confusable_letters', onlyAnswers: ['b', 'd'], title: 'Naming grid: tricky symbols (b, d)' });
    expect(p.host.textContent).toContain('Printable grid of the tricky symbols downloaded.');
    await p.unmount();
    const q = await mount({}, { 'confusable_letters|tricky': ['b'] });
    expect(q.host.querySelector('[data-testid="sr-export-tricky-grid"]')).toBe(null);
    await q.unmount();
  });
});
