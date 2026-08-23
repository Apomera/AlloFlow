// Advocacy Knowledge Quiz contracts (2026-08-23).
//
// ADVOCACY_QUIZ_BANK - 25 authored questions across rights, self-advocacy,
// identity, mental health and transition, each with an explanation and a
// follow-up - was defined and consumed by NOTHING: a fully authored feature
// with no surface. It also carried the catalog's worst answer-position bias
// (17 of 25 correct answers at B), and the bias scanner had excused it because
// the mentor-quote "Carrie Fisher" keyword-matched Fisher(-Yates).
//
// Now: a slot-targeted rotation runs at module load (exactly 7/6/6/6 across
// A-D, letters re-derived from the new order, grading by the option's own
// `correct` flag so no index exists to desync), and a Knowledge Quiz tab
// renders the bank. These tests execute the SHIPPED bank + rotation and
// SSR-render the tab in all four states, because a definition that merely
// exists proved exactly nothing last time.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const { renderToStaticMarkup } = require(resolve(MODULES_DIR, 'react-dom/server'));

const sourcePath = 'sel_hub/sel_tool_advocacy.js';
const publicPath = 'desktop/web-app/public/sel_hub/sel_tool_advocacy.js';
const source = readFileSync(sourcePath, 'utf8');

function loadTool() {
  const registry = {};
  const g = globalThis;
  const hadWindow = 'window' in g ? g.window : undefined;
  const hadSelHub = hadWindow && hadWindow.SelHub;
  g.window = g.window || g;
  const prevSelHub = g.window.SelHub;
  g.window.SelHub = {
    _registry: registry,
    registerTool: (id, cfg) => { registry[id] = cfg; },
  };
  try {
    new Function(source)();
    return registry.advocacy;
  } finally {
    if (prevSelHub !== undefined) g.window.SelHub = prevSelHub; else delete g.window.SelHub;
    if (hadWindow === undefined && !hadSelHub) { /* leave jsdom window intact */ }
  }
}

function makeCtx(state) {
  const noop = () => {};
  const iconsProxy = new Proxy({}, { get: () => () => React.createElement('span') });
  const base = {
    React,
    toolData: { advocacy: state },
    update: noop, updateMulti: noop, setToolData: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: '', selHubTool: '',
    addToast: noop, awardXP: noop, getXP: () => 0,
    announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, isDark: false, isContrast: false,
    theme: new Proxy({}, { get: () => '#888888' }),
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: null, selectedVoice: null, activeSessionCode: null,
    icons: iconsProxy, gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (text) => React.createElement('span', { className: 'sr-only' }, text),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

const renderTab = (tool, state) =>
  renderToStaticMarkup(React.createElement(() => tool.render(makeCtx(state))));

describe('advocacy knowledge quiz', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source);
  });

  it('bank + rotation: exactly uniform answer positions, letters re-derived, texts untouched', () => {
    const start = source.indexOf('var ADVOCACY_QUIZ_BANK = [');
    const end = source.indexOf('})();', start) + 5;
    const bank = new Function(source.slice(start, end) + '; return ADVOCACY_QUIZ_BANK;')();
    expect(bank.length).toBe(25);
    const counts = [0, 0, 0, 0];
    for (const q of bank) {
      const flagged = q.options.filter((o) => o.correct);
      expect(flagged.length, q.id + ' must have exactly one correct option').toBe(1);
      counts[q.options.indexOf(flagged[0])]++;
      expect(q.options.map((o) => o.letter).join(''), q.id).toBe('ABCD'.slice(0, q.options.length));
    }
    // Slot-targeted rotation makes this exact, not merely decorrelated.
    expect(counts).toEqual([7, 6, 6, 6]);
    // The authored bank really was biased - calibration: if this fails, the
    // measurement above is broken, not the tool.
    const authored = new Function(source.slice(start, source.indexOf('];', start) + 2) + '; return ADVOCACY_QUIZ_BANK;')();
    const ac = [0, 0, 0, 0];
    for (const q of authored) ac[q.options.findIndex((o) => o.correct)]++;
    expect(ac[1]).toBe(17);
    // Rotation moved nothing but positions: same option texts, same answer text.
    const key = (b) => b.map((q) => q.options.map((o) => o.text).sort().join('|')).join('~');
    expect(key(bank)).toBe(key(authored));
    const answers = (b) => b.map((q) => q.options.find((o) => o.correct).text).join('~');
    expect(answers(bank)).toBe(answers(authored));
  });

  it('the tab renders the first question with its choices', () => {
    const html = renderTab(loadTool(), { activeTab: 'knowquiz' });
    expect(html).toContain('Knowledge Quiz');
    expect(html).toContain('Question 1 of 25');
    expect(html).toContain('What does IEP stand for?');
    expect(html).toContain('Individual Education Program');
  });

  it('answered states show grading, the explanation, and the follow-up', () => {
    const tool = loadTool();
    // After rotation, qz1's correct answer sits at A (slot cycle starts at 0).
    const right = renderTab(tool, { activeTab: 'knowquiz', kqPicked: 'A', kqScore: 1 });
    expect(right).toContain('Correct.');
    expect(right).toContain('legally binding document');
    const wrong = renderTab(tool, { activeTab: 'knowquiz', kqPicked: 'B', kqScore: 0 });
    expect(wrong).toContain('Not quite.');
    expect(wrong).toContain('Next question');
    expect(wrong).toContain('Worth sitting with:');
  });

  it('the results state shows the score and a restart control', () => {
    const html = renderTab(loadTool(), { activeTab: 'knowquiz', kqDone: true, kqScore: 19 });
    expect(html).toContain('19 / 25');
    expect(html).toContain('Start over');
  });

  it('the tab is reachable: registered in the tab bar and the content chain', () => {
    expect(source).toContain("{ id: 'knowquiz',");
    expect(source).toContain('rightsContent || knowquizContent ||');
    // and the bank is no longer write-only data
    expect(source.match(/ADVOCACY_QUIZ_BANK/g).length).toBeGreaterThanOrEqual(3);
  });
});
