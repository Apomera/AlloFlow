// STEM Lab shell fixes (2026-09-28 audit, batch 1).
//
// - The Quest Log sat inside the tool-grid branch, which renders only when NO
//   tool is open, while the log itself required an open tool. It never
//   appeared, so written-response quests could not be done.
// - Alt+Backspace / Alt+B ("back to all tools") fired inside text fields
//   (Option+Backspace deletes a word on macOS) and Option+B never matched
//   (it types a symbol on macOS, so e.key is not 'b').
// - With a station active, the station filter rebuilt the list from ALL tools,
//   throwing away the search results.
// - Ratios Lab's Back set the Lab's tab to 'tools'; the Lab has one tab,
//   'explore', so the whole Lab went blank.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const HUB = process.env.ALLO_STEM_HUB_CANDIDATE || 'stem_lab/stem_lab_module.js';

const Icon = () => null;
const station = {
  id: 'st-batch1', name: 'Station One', grade: '', tools: ['earlyTool'],
  quests: [{ qid: 'q1', type: 'freeResponse', label: 'Reflect', toolId: 'earlyTool', params: { prompt: 'What did you notice?', minLength: 5 } }],
};
let root, host, api;

function Harness(initial) {
  const [stemLabTool, setStemLabTool] = React.useState(initial.tool || null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  api = { setStemLabTool, setStemLabTab, get tool() { return stemLabTool; } };
  const base = {
    labToolData, setLabToolData, toolSnapshots: [],
    addToast: () => {}, t: (k, fb) => (typeof fb === 'string' ? fb : undefined), isTeacherMode: true,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
    activeStation: initial.station || null, callGemini: null, callTTS: null,
  };
  const props = new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
      if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
      return undefined;
    },
  });
  return window.AlloModules.StemLab(props);
}
async function render(initial) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, initial)));
}
const key = async (target, init) => act(async () => { target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init })); });

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  new Function(readFileSync(HUB, 'utf8'))();
  const tile = (id, label) => window.StemLab.registerTool(id, { label, icon: 'x', desc: label + ' tool', category: 'math', render: () => React.createElement('div', { 'data-tool-body': id }, label + ' body') });
  tile('earlyTool', 'Early Tool');
  tile('otherTool', 'Other Tool');
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

describe('Quest Log', () => {
  it('shows while a station tool is open, with the written-response box', async () => {
    localStorage.setItem('alloflow_stem_stations', JSON.stringify([station]));
    await render({ tool: 'earlyTool', station });
    const log = host.querySelector('[aria-label="Quest log for station Station One"]');
    expect(log).not.toBeNull();
    expect(log.querySelector('textarea[placeholder="What did you notice?"]')).not.toBeNull();
    const toggle = log.querySelector('button[aria-expanded]');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('is not shown on the tool grid', async () => {
    localStorage.setItem('alloflow_stem_stations', JSON.stringify([station]));
    await render({ tool: null, station });
    expect(host.querySelector('[aria-label="Quest log for station Station One"]')).toBeNull();
  });
});

describe('Back to all tools shortcut', () => {
  it('does not fire while typing, and matches the B key by its code', async () => {
    await render({ tool: 'earlyTool' });
    const input = document.createElement('textarea');
    document.body.append(input);
    input.focus();
    await key(input, { key: 'Backspace', altKey: true });
    await key(input, { key: '∫', code: 'KeyB', altKey: true });
    expect(api.tool).toBe('earlyTool');
    input.remove();
    document.body.focus();
    await key(document.body, { key: '∫', code: 'KeyB', altKey: true });
    expect(api.tool).toBe(null);
  });

  it('Alt+Backspace outside a text field still returns to the grid', async () => {
    await render({ tool: 'earlyTool' });
    document.body.focus();
    await key(document.body, { key: 'Backspace', altKey: true });
    expect(api.tool).toBe(null);
  });
});

describe('search with a station active', () => {
  it('narrows the search results to the station instead of replacing them', async () => {
    const both = { ...station, tools: ['numberline', 'areamodel'] };
    localStorage.setItem('alloflow_stem_stations', JSON.stringify([both]));
    await render({ tool: null, station: both });
    const tileNames = () => [...host.querySelectorAll('button')].map((b) => b.textContent);
    expect(tileNames().some((text) => text.includes('Number Line'))).toBe(true);
    expect(tileNames().some((text) => text.includes('Area Model'))).toBe(true);
    const search = host.querySelector('input[type="search"], input[aria-label*="earch"]');
    expect(search).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(search, 'Area Model'); search.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(tileNames().some((text) => text.includes('Area Model'))).toBe(true);
    expect(tileNames().some((text) => text.includes('Number Line'))).toBe(false);
  });
});

it('Ratios Lab Back closes only the tool (the Lab has one tab)', () => {
  for (const file of ['stem_lab/stem_tool_ratios.js', 'desktop/web-app/public/stem_lab/stem_tool_ratios.js']) {
    const ratios = readFileSync(file, 'utf8');
    expect(ratios.includes("setStemLabTab('tools')"), file).toBe(false);
    expect(ratios.includes("if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null);"), file).toBe(true);
  }
});
