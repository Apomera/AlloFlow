import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host, model;
const tick = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const button = name => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === name);
const click = async name => { const el = typeof name === 'string' ? button(name) : name; expect(el).toBeTruthy(); await React.act(async () => el.click()); };
const change = async (selector, value) => { const el = host.querySelector(selector); expect(el).toBeTruthy(); await React.act(async () => Simulate.change(el, { target: { value } })); };
const workspace = (id = 'preview-a') => JSON.parse(localStorage.getItem('behaviorLens_workspace_' + id));
async function mount() { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }] })))); await tick(); }
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; }
const targets = [{ id: 'help', label: 'Requests help', measurement: 'count', operationalDefinition: 'Shows a help card.' }, { id: 'break', label: 'Requests break' }];
const when = index => { const date = new Date(); date.setDate(date.getDate() - 6 + index); return date.toISOString(); };
const session = (index, extra = {}) => ({ id: 'session-' + index, timestamp: when(index), behaviorId: 'help', method: 'frequency', duration: 600, phase: index < 3 ? 'Baseline' : 'Visual prompt', data: { count: index }, ...extra });
function seed(extra = {}) { localStorage.setItem('behaviorLens_workspace_preview-a', JSON.stringify({ targetBehaviors: targets, observationSessions: [session(0), session(1), session(2, { data: {} }), session(3), session(4)], ...extra })); }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); delete window.AlloModules.BehaviorLens; new Function(readFileSync('behavior_lens_module.js', 'utf8').replace(/\}\)\(\);\s*$/, 'window.__previewTests={buildBehaviorReviewSeries};})();'))(); model = window.__previewTests.buildBehaviorReviewSeries; });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase; localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'preview-a', name: 'Student A' }, { id: 'preview-b', name: 'Student B' }])); });
afterEach(async () => { await unmount(); vi.restoreAllMocks(); });

describe('Shared review measurement model', () => {
  it('never treats context notes as measured occurrences or fills unobserved days with zeros', () => {
    const entries = [{ id: 'a', timestamp: when(0), behaviorId: 'help' }, { id: 'b', timestamp: when(2), behaviorId: 'help' }, { id: 'c', behaviorId: 'help' }];
    const result = model({ entries, targets, targetId: 'help' });
    expect(result.rows.map(row => row.value)).toEqual([1, 1]); expect(result.undated).toBe(1); expect(result.caption).toContain('do not measure behavior frequency');
    expect(model({ entries, targets, measurement: 'count' }).requiresTarget).toBe(true);
  });
  it('uses only matching counters and observed time for rates, keeping zero distinct from missing', () => {
    const sessions = [session(0, { data: { count: 100, counters: [{ behaviorId: 'help', count: 2 }, { behaviorId: 'break', count: 98 }] } }), session(1, { duration: 0 }), session(2, { data: { count: 0 } }), session(3, { data: {} })];
    expect(model({ sessions, targets, targetId: 'help', measurement: 'rate' }).rows.map(row => row.value)).toEqual([0.2, null, 0, null]);
  });
  it('uses behavior duration and latency units without falling back to session length', () => {
    const sessions = [session(0, { method: 'duration', data: { totalDuration: 12 } }), session(1, { method: 'duration', data: {} }), session(2, { method: 'latency', data: { latencyMs: 2500 } })];
    expect(model({ sessions, targets, targetId: 'help', measurement: 'duration' }).rows.map(row => row.value)).toEqual([12, null]);
    expect(model({ sessions, targets, targetId: 'help', measurement: 'latency' }).rows[0].value).toBe(2.5);
  });
  it('separates interval procedures and lengths, rejecting incomplete or invalid percentages', () => {
    const sessions = [session(0, { method: 'interval', data: { mode: 'partial', intervalSec: 10, percentage: 0 } }), session(1, { method: 'interval', data: { mode: 'whole', intervalSec: 10, percentage: 50 } }), session(2, { method: 'interval', data: { mode: 'partial', intervalSec: 20, percentage: 50 } }), session(3, { method: 'interval', data: { mode: 'partial', intervalSec: 10, percentage: 101 } }), session(4, { method: 'interval', data: { mode: 'partial', intervalSec: 10, percentage: 25, complete: false } })];
    const result = model({ sessions, targets, targetId: 'help', measurement: 'interval:partial:10' });
    expect(result.rows.map(row => row.value)).toEqual([0, null, null]); expect(result.options.filter(option => option.id.startsWith('interval:'))).toHaveLength(3); expect(result.max).toBe(100);
  });
});

describe('First-use and shared preview workflow', () => {
  it('records directly without setup and returns to a dashboard with a document preview', async () => {
    await mount(); await click('Record an observation');
    expect(host.querySelector('[aria-label="New ABC entry"]')).toBeTruthy();
    await change('[aria-label="Antecedent narrative"]', 'Task begins'); await change('[aria-label="Behavior narrative"]', 'Shows help card'); await change('[aria-label="Consequence narrative"]', 'Help offered'); await click('Save Entry'); await tick();
    expect(host.querySelector('[data-bl-presentation="dashboard"]')).toBeTruthy(); expect(host.textContent).toContain('1 context note and 0 timed sessions');
    await click('Document'); expect(host.querySelector('[data-bl-document]').textContent).toContain('Student A'); expect(host.querySelector('[data-bl-document]').textContent).toContain('1 context notes');
    expect(workspace().toolState.gettingStarted.started).toBe(true);
  });
  it('persists skipping the guide per student and restores it on request', async () => {
    await mount(); await click('Skip guide'); await tick(); await unmount(); await mount(); expect(host.querySelector('[data-bl-getting-started]')).toBeNull();
    await change('#bl-today-student', 'Student B'); await tick(); expect(host.querySelector('[data-bl-getting-started]')).toBeTruthy();
    await change('#bl-today-student', 'Student A'); await tick(); await click('Show getting started'); expect(host.querySelector('[data-bl-getting-started]')).toBeTruthy();
  });
  it('opens existing data import directly', async () => { await mount(); await click('Import existing data'); expect(host.textContent).toContain('CSV'); });
  it('keeps example data in a separate practice workspace and returns to the original student', async () => {
    await mount(); await click('Explore an example'); await tick(); expect(host.textContent).toContain('Practice workspace: First observation and review');
    await click('Review observations'); await change('#bl-review-target', host.querySelector('#bl-review-target option:nth-child(2)').value); await change('#bl-review-measurement', 'count'); expect(host.querySelectorAll('[data-bl-data-point]')).toHaveLength(6);
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]')); await click('Leave practice'); await tick(); expect(workspace().abcEntries).toHaveLength(0); expect(host.textContent).toContain('Student A');
  });
  it('preserves graph, filters, and notes across presentation changes and reloads; prints exactly the preview', async () => {
    seed(); await mount(); await click('Review observations'); await change('#bl-review-target', 'help'); await change('#bl-review-measurement', 'count');
    const graph = () => host.querySelector('[data-bl-shared-graph]').outerHTML;
    const original = graph(); expect(host.querySelectorAll('[data-bl-data-point]')).toHaveLength(4); expect(host.querySelectorAll('[data-bl-data-path]')).toHaveLength(2); expect(host.querySelectorAll('[data-bl-phase-boundary]')).toHaveLength(1);
    await click('Document'); expect(graph()).toBe(original); await change('#bl-review-narrative', 'Compare session context before choosing next steps.'); await tick();
    const write = vi.fn(), print = vi.fn(); vi.spyOn(window, 'open').mockReturnValue({ document: { write, close: vi.fn() }, focus: vi.fn(), print }); await click('Print / Save PDF');
    expect(write.mock.calls[0][0]).toContain(original); expect(write.mock.calls[0][0]).toContain('Compare session context'); expect(write.mock.calls[0][0]).toContain('Not recorded'); expect(print).toHaveBeenCalled();
    await click('Dashboard'); expect(graph()).toBe(original); await click('Document'); await unmount(); await mount(); await click('Review observations'); expect(host.querySelector('[data-bl-presentation="document"]')).toBeTruthy(); expect(host.querySelector('#bl-review-measurement').value).toBe('count'); expect(host.querySelector('#bl-review-narrative').value).toContain('Compare session');
    await change('#bl-review-target', 'break'); expect(host.querySelector('#bl-review-narrative').value).toBe('');
  });
  it('exposes source records from the accessible table and reports a blocked print window', async () => {
    seed(); await mount(); await click('Prepare a progress review'); await change('#bl-review-target', 'help'); await change('#bl-review-measurement', 'count');
    await click(host.querySelector('[aria-label="Inspect graph point 1"]')); expect(host.querySelector('[data-bl-selected-point]')).toBeTruthy();
    vi.spyOn(window, 'open').mockReturnValue(null); await click('Print / Save PDF'); expect(host.textContent).toContain('print window was blocked');
  });
});
