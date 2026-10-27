import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers = [];
let frames;

function mountTool(path, forceHunt) {
  resetStemLab();
  const config = loadTool(path, 'climateExplorer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current;
  function Host() {
    const [data, setData] = React.useState({ climateExplorer: { tab: 'forceHunt', ...(forceHunt === undefined ? {} : { forceHunt }) } });
    current = data.climateExplorer.forceHunt;
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current,
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}
async function settle() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settle();
}
async function fill(input, value) {
  expect(input).toBeTruthy(); input.focus();
  await act(async () => {
    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await settle();
}
function expectVisibleLabel(view, id) {
  const field = view.one('#' + id), label = view.one('label[for="' + id + '"]');
  expect(field).toBeTruthy(); expect(label).toBeTruthy();
  expect(label.textContent.trim()).toBeTruthy();
  expect(label.hidden).toBe(false);
  return field;
}
function records(view) { return view.all('#fh-observations li'); }

beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose()); await settle();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Radiative Forcing accessibility: %s', path => {
  it('labels reflection and range controls, associates results, and does not take initial focus', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path); await settle();
    expect(document.activeElement).toBe(outside);
    expectVisibleLabel(view, 'fh-hypothesis');
    for (const id of ['fh-albedo', 'fh-cloudFB', 'fh-ghg']) {
      const slider = expectVisibleLabel(view, id);
      expect(slider.type).toBe('range');
      expect(slider.getAttribute('aria-describedby')?.split(/\s+/)).toContain('fh-result-summary');
    }
    expect(view.one('#fh-result-summary').textContent).toMatch(/0\.00/);
    expect(view.one('#fh-result-summary').textContent).toMatch(/stable/i);
    const status = view.one('#fh-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    const log = view.one('#fh-observations');
    expect(log.getAttribute('role')).toBe('region');
    expect(log.getAttribute('aria-labelledby')).toBe('fh-observations-title');
    expect(view.one('#fh-observations-title').textContent.trim()).toBeTruthy();
    expect(records(view)).toHaveLength(0);
  });

  it('updates range values and the current result without moving focus', async () => {
    const view = mountTool(path), slider = view.one('#fh-ghg');
    await fill(slider, 90);
    expect(view.state().ghg).toBe(90);
    expect(slider.value).toBe('90');
    expect(view.one('#fh-result-summary').textContent).toMatch(/2\.00/);
    expect(view.one('#fh-result-summary').textContent).toMatch(/warming/i);
    expect(document.activeElement).toBe(slider);
  });

  it('keeps reflection labels and typed text while revealing and hiding the explanation', async () => {
    const view = mountTool(path);
    const hypothesis = expectVisibleLabel(view, 'fh-hypothesis');
    await fill(hypothesis, 'Lower albedo may increase the index.');
    expect(view.state().hypothesis).toBe('Lower albedo may increase the index.');
    expect(document.activeElement).toBe(hypothesis);
    const checkbox = view.one('#fh-understood'), panel = view.one('#fh-explanation-panel');
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.hidden).toBe(true);
    await activate(checkbox);
    expect(panel.hidden).toBe(false);
    const explanation = expectVisibleLabel(view, 'fh-explanation');
    await fill(explanation, 'Albedo, clouds, and gases partly offset one another.');
    expect(view.state().explanation).toBe('Albedo, clouds, and gases partly offset one another.');
    expect(document.activeElement).toBe(explanation);
    await activate(checkbox);
    expect(view.one('#fh-explanation-panel')).toBe(panel);
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(checkbox);
    await activate(checkbox);
    expect(view.one('#fh-explanation').value).toBe('Albedo, clouds, and gases partly offset one another.');
  });

  it('keeps the prompts disclosure focusable and linked when opened and closed', async () => {
    const view = mountTool(path), toggle = view.one('#fh-prompts-toggle'), panel = view.one('#fh-prompts-panel');
    expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    await activate(toggle);
    expect(view.one('#fh-prompts-toggle')).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toMatch(/albedo/i);
    expect(document.activeElement).toBe(toggle);
    await activate(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it('shows one observation with the actual values and confirms logging without moving focus', async () => {
    const view = mountTool(path);
    await fill(view.one('#fh-albedo'), 15);
    await fill(view.one('#fh-cloudFB'), 20);
    await fill(view.one('#fh-ghg'), 90);
    const button = view.one('#fh-log'), status = view.one('#fh-status');
    await activate(button);
    expect(records(view)).toHaveLength(1);
    const text = records(view)[0].textContent;
    for (const value of ['15', '20', '90', '3.15']) expect(text).toContain(value);
    expect(text).toMatch(/warming/i);
    expect(view.state().log).toHaveLength(1);
    expect(view.state().log[0]).toMatchObject({ a: 15, c: 20, g: 90 });
    expect(view.one('#fh-status')).toBe(status);
    expect(status.textContent).toMatch(/log|record|sav/i);
    expect(status.textContent).toMatch(/1/);
    expect(document.activeElement).toBe(button);
  });

  it('retains the latest eight observations and keeps them available as a list', async () => {
    const view = mountTool(path), button = view.one('#fh-log');
    for (let albedo = 20; albedo < 30; albedo++) {
      await fill(view.one('#fh-albedo'), albedo);
      await activate(button);
    }
    expect(view.state().log.map(record => record.a)).toEqual([22, 23, 24, 25, 26, 27, 28, 29]);
    expect(records(view)).toHaveLength(8);
    expect(view.one('#fh-observations').textContent).toMatch(/8/);
    for (const albedo of [22, 23, 24, 25, 26, 27, 28, 29]) {
      expect(records(view).some(record => record.textContent.includes(String(albedo)))).toBe(true);
    }
    expect(document.activeElement).toBe(button);
  });

  it('resets controls, observations and reflections with visible confirmation and retained focus', async () => {
    const view = mountTool(path);
    await fill(view.one('#fh-albedo'), 15);
    await fill(view.one('#fh-hypothesis'), 'A saved hypothesis');
    await activate(view.one('#fh-understood'));
    await fill(view.one('#fh-explanation'), 'A saved explanation');
    await activate(view.one('#fh-prompts-toggle'));
    await activate(view.one('#fh-log'));
    const reset = view.one('#fh-reset'), status = view.one('#fh-status');
    await activate(reset);
    expect(document.activeElement).toBe(reset);
    expect(view.one('#fh-albedo').value).toBe('30');
    expect(view.one('#fh-cloudFB').value).toBe('0');
    expect(view.one('#fh-ghg').value).toBe('50');
    expect(view.one('#fh-hypothesis').value).toBe('');
    expect(view.one('#fh-understood').checked).toBe(false);
    expect(view.one('#fh-explanation-panel').hidden).toBe(true);
    expect(view.one('#fh-prompts-panel').hidden).toBe(true);
    expect(records(view)).toHaveLength(0);
    expect(view.state()).toMatchObject({ hypothesis: '', explanation: '', log: [] });
    expect(view.one('#fh-status')).toBe(status);
    expect(status.textContent).toMatch(/reset|clear|restor/i);
  });

  it.each([null, 7, 'stale-state', [], {}])('recovers usable defaults from the malformed restored activity %j', async seed => {
    const view = mountTool(path, seed); await settle();
    expect(view.one('#fh-albedo').value).toBe('30');
    expect(view.one('#fh-cloudFB').value).toBe('0');
    expect(view.one('#fh-ghg').value).toBe('50');
    expect(view.one('#fh-result-summary').textContent).toContain('0.00');
    await activate(view.one('#fh-log'));
    expect(records(view)).toHaveLength(1);
  });

  it('ignores nonfinite values and malformed saved logs without rendering NaN', async () => {
    const view = mountTool(path, { albedo: Infinity, cloudFB: NaN, ghg: 'invalid', log: { stale: true } });
    expect(view.one('#fh-albedo').value).toBe('30');
    expect(view.one('#fh-cloudFB').value).toBe('0');
    expect(view.one('#fh-ghg').value).toBe('50');
    expect(view.one('#fh-result-summary').textContent).not.toMatch(/NaN|Infinity/);
    expect(records(view)).toHaveLength(0);
    await activate(view.one('#fh-log'));
    expect(records(view)).toHaveLength(1);
  });

  it('keeps restored numeric controls within their ranges and omits invalid observation entries', async () => {
    const view = mountTool(path, { albedo: -900, cloudFB: 900, ghg: 900, log: [null, 'stale', {}, { a: Infinity, c: 0, g: 50, f: 'NaN', st: 'stable' }] });
    for (const id of ['fh-albedo', 'fh-cloudFB', 'fh-ghg']) {
      const input = view.one('#' + id);
      expect(Number(input.value)).toBeGreaterThanOrEqual(Number(input.min));
      expect(Number(input.value)).toBeLessThanOrEqual(Number(input.max));
    }
    expect(view.one('#fh-result-summary').textContent).not.toMatch(/NaN|Infinity/);
    expect(records(view)).toHaveLength(0);
    await activate(view.one('#fh-log'));
    expect(records(view)).toHaveLength(1);
  });
});
