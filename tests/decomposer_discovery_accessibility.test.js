import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_decomposer.js', 'desktop/web-app/public/stem_lab/stem_tool_decomposer.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const name = element => element.getAttribute('aria-label') || element.textContent.trim();
const disposers = [];
let frames;
const defaults = { tempC: 25, humidity: 70, oxygen: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };

// Mount shipped handlers with React and real DOM focus. Native QA owns layout,
// default keyboard activation and painted contrast; only drawing/RAF are stubbed.
function mountDiscovery(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current;
  function Host() {
    const [data, setData] = React.useState({ decomposer: { tab: 'decompHunt', selected: 'Water', materialsExplored: ['Water'], ...seed,
      decompHunt: { ...defaults, ...(seed.decompHunt || {}) } } });
    current = data.decomposer;
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, state: () => current,
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    button: pattern => [...host.querySelectorAll('button')].find(button => pattern.test(name(button))) };
}
function flushFrame() { const pending = frames.splice(0); act(() => pending.forEach(callback => callback(16))); }
function activate(button) { expect(button).toBeDefined(); expect(button).not.toBeNull(); button.focus(); act(() => button.click()); flushFrame(); }
function readingName(reading, host) {
  const ids = (reading.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
  return reading.getAttribute('aria-label') || ids.map(id => host.querySelector('#' + id)?.textContent || '').join(' ') || reading.querySelector('h4,h5,h6,strong')?.textContent || '';
}
function definition(reading, label) {
  const term = [...reading.querySelectorAll('dt')].find(element => element.textContent.trim().startsWith(label));
  expect(term, label + ' definition term').toBeDefined();
  expect(term.nextElementSibling?.tagName).toBe('DD');
  return term.textContent + ' ' + term.nextElementSibling.textContent;
}
function range(input, value) {
  input.focus();
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
function key(tab, key, modifiers = {}) {
  tab.focus();
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
  act(() => tab.dispatchEvent(event));
  return event;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});
afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Decomposer discovery accessibility: %s', path => {
  it('records readable current values in a named list item and announces success without taking Log focus', () => {
    const view = mountDiscovery(path, { researchPoints: 12 });
    const status = view.one('[data-decomposer-reading-status]');
    expect(status?.getAttribute('role')).toBe('status'); expect(status?.getAttribute('aria-atomic')).toBe('true');
    const log = view.button(/\bLog\b/); activate(log);
    expect(document.activeElement).toBe(log);
    expect(view.one('[data-decomposer-reading-status]')).toBe(status);
    expect(status.textContent).toMatch(/reading|logged|saved/i);
    expect(view.one('[data-decomposer-readings]')?.tagName).toBe('OL');
    const readings = view.all('[data-decomposer-reading]'); expect(readings).toHaveLength(1);
    expect(readingName(readings[0], view.host)).toMatch(/Reading 1\b/i);
    expect(readings[0].querySelector('dl')).not.toBeNull();
    expect(definition(readings[0], 'Temperature')).toMatch(/25.*(?:°C|Celsius)/i);
    expect(definition(readings[0], 'Humidity')).toMatch(/70.*%/);
    expect(definition(readings[0], 'Oxygen')).toMatch(/50.*%/);
    expect(definition(readings[0], 'Rate')).toMatch(/Medium/i);
    expect(view.state().decompHunt).toMatchObject({ logCount: 1, log: [{ t: 25, h: 70, o: 50, st: 'medium', sequence: 1 }] });
    expect(view.state().researchPoints).toBe(12);
  });

  it('keeps two rapid saves as distinct readings rather than losing one through stale state', () => {
    const view = mountDiscovery(path), log = view.button(/\bLog\b/);
    log.focus(); act(() => { log.click(); log.click(); }); flushFrame();
    expect(document.activeElement).toBe(log);
    expect(view.state().decompHunt.logCount).toBe(2);
    expect(view.state().decompHunt.log.map(reading => reading.sequence)).toEqual([1, 2]);
    expect(view.all('[data-decomposer-reading]').map(reading => readingName(reading, view.host))).toEqual(expect.arrayContaining([expect.stringMatching(/Reading 1\b/i), expect.stringMatching(/Reading 2\b/i)]));
    for (const reading of view.state().decompHunt.log) expect(reading).toMatchObject({ t: 25, h: 70, o: 50, st: 'medium' });
  });

  it('retains the latest eight readings with cumulative sequence numbers after repeated saves', () => {
    const view = mountDiscovery(path), log = view.button(/\bLog\b/);
    for (let index = 0; index < 12; index++) activate(log);
    expect(view.state().decompHunt.logCount).toBe(12);
    expect(view.state().decompHunt.log).toHaveLength(8);
    expect(view.state().decompHunt.log.map(reading => reading.sequence)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    const readings = view.all('[data-decomposer-reading]'); expect(readings).toHaveLength(8);
    expect(readingName(readings[0], view.host)).toMatch(/Reading 5\b/i);
    expect(readingName(readings.at(-1), view.host)).toMatch(/Reading 12\b/i);
    expect(view.one('[data-decomposer-reading-status]').textContent).toContain('12');
  });

  it('continues a cumulative saved count rather than numbering from only the retained eight', () => {
    const log = Array.from({ length: 8 }, (_, index) => ({ t: 25, h: 70, o: 50, st: 'medium', sequence: index + 13 }));
    const view = mountDiscovery(path, { decompHunt: { log, logCount: 20 } });
    activate(view.button(/\bLog\b/));
    expect(view.state().decompHunt.logCount).toBe(21);
    expect(view.state().decompHunt.log.map(reading => reading.sequence)).toEqual([14, 15, 16, 17, 18, 19, 20, 21]);
    expect(readingName(view.all('[data-decomposer-reading]').at(-1), view.host)).toMatch(/Reading 21\b/i);
  });

  it('renders legacy t/h/o/st readings and numbers the next saved reading without discarding them', () => {
    const legacy = [{ t: 10, h: 30, o: 40, st: 'slow' }, { t: 32, h: 80, o: 90, st: 'fast' }];
    const view = mountDiscovery(path, { decompHunt: { log: legacy } });
    const before = view.all('[data-decomposer-reading]'); expect(before).toHaveLength(2);
    expect(readingName(before[0], view.host)).toMatch(/Reading 1\b/i);
    expect(definition(before[0], 'Temperature')).toContain('10');
    expect(definition(before[1], 'Rate')).toMatch(/Fast/i);
    activate(view.button(/\bLog\b/));
    expect(view.state().decompHunt.logCount).toBe(3);
    expect(view.state().decompHunt.log).toHaveLength(3);
    expect(view.state().decompHunt.log[0]).toMatchObject(legacy[0]);
    expect(view.state().decompHunt.log[1]).toMatchObject(legacy[1]);
    expect(view.state().decompHunt.log[2]).toMatchObject({ sequence: 3, t: 25, h: 70, o: 50, st: 'medium' });
  });

  it('clears saved readings on Reset and announces the reset while keeping focus on Reset', () => {
    const view = mountDiscovery(path, { decompHunt: { tempC: 32, humidity: 80, oxygen: 90, hypothesis: 'Warm conditions will help.', understood: true, explanation: 'The readings support the claim.',
      logCount: 1, log: [{ t: 32, h: 80, o: 90, st: 'fast', sequence: 1 }] } });
    const status = view.one('[data-decomposer-reading-status]'), reset = view.button(/\bReset\b/);
    activate(reset);
    expect(document.activeElement).toBe(reset);
    expect(view.all('[data-decomposer-reading]')).toHaveLength(0);
    expect(view.one('[data-decomposer-reading-status]')).toBe(status);
    expect(status.textContent).toMatch(/reset|cleared/i);
    expect(view.state().decompHunt).toMatchObject({ tempC: 25, humidity: 70, oxygen: 50, log: [], logCount: 0, hypothesis: '', explanation: '', understood: false });
    activate(view.button(/\bLog\b/));
    expect(view.state().decompHunt.log[0].sequence).toBe(1);
  });

  it('updates the live rate label and explanation through the shipped range handler', () => {
    const view = mountDiscovery(path), rate = view.one('[data-decomposer-rate]');
    expect(rate?.getAttribute('role')).toBe('status');
    expect(rate.textContent).toMatch(/Medium/); expect(rate.textContent.length).toBeGreaterThan(20);
    const humidity = view.one('#dh-humidity'); range(humidity, 0);
    expect(document.activeElement).toBe(humidity);
    expect(view.state().decompHunt.humidity).toBe(0);
    expect(view.one('[data-decomposer-rate]')).toBe(rate);
    expect(rate.textContent).toMatch(/Stopped/); expect(rate.textContent).toMatch(/moisture|oxygen|temperature/i);
  });

  it('keeps the prompts toggle focused and exposes a persistent named region with honest disclosure state', () => {
    const view = mountDiscovery(path), toggle = view.one('[data-decomposer-prompts-toggle]');
    expect(toggle?.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('aria-controls')).toBe('decomposer-discovery-prompts');
    const region = view.one('#decomposer-discovery-prompts');
    expect(region).not.toBeNull(); expect(region.hidden).toBe(true);
    expect(region.getAttribute('role') === 'region' || region.tagName === 'SECTION').toBe(true);
    expect(readingName(region, view.host).trim().length).toBeGreaterThan(0);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    activate(toggle);
    expect(document.activeElement).toBe(toggle); expect(view.one('[data-decomposer-prompts-toggle]')).toBe(toggle);
    expect(view.one('#decomposer-discovery-prompts')).toBe(region); expect(region.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(name(toggle)).toMatch(/hide/i);
    expect(region.textContent).toMatch(/compost|decomposition/i);
    activate(toggle);
    expect(document.activeElement).toBe(toggle); expect(region.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(name(toggle)).toMatch(/show|stuck/i);
  });

  it('preserves browser and assistive navigation shortcuts, composition, and horizontal-tab Up/Down scrolling', () => {
    const view = mountDiscovery(path, { tab: 'explore' });
    const tab = view.one('#stem-decomposer-tab-explore');
    for (const modifier of ['ctrlKey', 'altKey', 'metaKey', 'isComposing']) for (const pressed of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      const event = key(tab, pressed, { [modifier]: true });
      expect(event.defaultPrevented, modifier + '+' + pressed).toBe(false);
      expect(view.state().tab).toBe('explore'); expect(document.activeElement).toBe(tab);
    }
    for (const pressed of ['ArrowUp', 'ArrowDown']) {
      expect(key(tab, pressed).defaultPrevented).toBe(false);
      expect(view.state().tab).toBe('explore'); expect(document.activeElement).toBe(tab);
    }
  });

  it('keeps unmodified Left/Right/Home/End navigation and wrapping functional with one tab stop', () => {
    const view = mountDiscovery(path, { tab: 'explore' });
    for (const [pressed, expected] of [['ArrowRight', 'scenes'], ['ArrowLeft', 'explore'], ['End', 'decompHunt'], ['Home', 'explore'], ['ArrowLeft', 'decompHunt'], ['ArrowRight', 'explore']]) {
      const tab = view.one('[role=tab][aria-selected=true]');
      expect(key(tab, pressed).defaultPrevented).toBe(true);
      expect(view.state().tab).toBe(expected);
      const selected = view.one('[role=tab][aria-selected=true]');
      expect(selected.id).toBe('stem-decomposer-tab-' + expected); expect(document.activeElement).toBe(selected);
      expect(view.all('[role=tab][tabindex="0"]')).toHaveLength(1);
      const panel = view.one('#' + selected.getAttribute('aria-controls'));
      expect(panel?.getAttribute('role')).toBe('tabpanel'); expect(panel.getAttribute('aria-labelledby')).toBe(selected.id);
    }
  });
});