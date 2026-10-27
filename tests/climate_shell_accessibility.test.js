import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const coreTabs = ['carbon', 'renewables', 'keeling', 'tipping', 'justice', 'solutions'];
const tabLabels = ['Carbon Calculator', 'Renewables', 'Keeling Curve', 'Tipping Points', 'Climate Justice', 'Solutions'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'climateExplorer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ climateExplorer: { tab: 'solutions', ...seed } });
    current = data.climateExplorer;
    setCurrent = patch => setData(previous => ({ ...previous, climateExplorer: { ...previous.climateExplorer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}
async function settleFocus() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settleFocus();
}
async function press(target, key, modifiers = {}) {
  target.focus();
  act(() => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers })));
  await settleFocus();
}
function selectedTab(view) {
  const selected = view.all('#ce-tabs [role="tab"][aria-selected="true"]');
  expect(selected).toHaveLength(1);
  expect(selected[0].tabIndex).toBe(0);
  expect(selected[0].getAttribute('aria-controls')).toBe('ce-panel');
  expect(view.one('#ce-panel').getAttribute('aria-labelledby')).toBe(selected[0].id);
  return selected[0];
}

beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose()); await settleFocus();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Climate shell accessibility: %s', path => {
  it('exposes linked tabs and disclosures without taking focus on mount or unrelated updates', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path); await settleFocus();
    expect(document.activeElement).toBe(outside);
    expect(view.one('#ce-tabs').getAttribute('role')).toBe('tablist');
    expect(view.one('#ce-tabs').getAttribute('aria-label')).toBe('Climate Explorer sections');
    expect(view.one('#ce-panel').getAttribute('role')).toBe('tabpanel');
    expect(selectedTab(view).id).toBe('ce-tab-solutions');
    expect(view.all('#ce-tabs [role="tab"][tabindex="-1"]')).toHaveLength(5);
    for (const [toggleId, panelId] of [['ce-advanced-toggle', 'ce-tabs'], ['ce-badges-toggle', 'ce-badges-panel']]) {
      expect(view.one('#' + toggleId).getAttribute('aria-controls')).toBe(panelId);
      expect(view.one('#' + panelId)).toBeTruthy();
    }
    view.patch({ exportedReport: 'Retained report' }); await settleFocus();
    expect(document.activeElement).toBe(outside);
  });

  it('expands and collapses advanced tabs while preserving the trigger and core selection', async () => {
    const view = mountTool(path);
    const trigger = view.one('#ce-advanced-toggle'), tabs = view.one('#ce-tabs');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(view.all('#ce-tabs [role="tab"]')).toHaveLength(6);
    await activate(trigger);
    expect(view.one('#ce-tabs')).toBe(tabs);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(view.all('#ce-tabs [role="tab"]')).toHaveLength(8);
    expect(document.activeElement).toBe(trigger);
    await activate(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(view.all('#ce-tabs [role="tab"]')).toHaveLength(6);
    expect(selectedTab(view).id).toBe('ce-tab-solutions');
    expect(document.activeElement).toBe(trigger);
  });

  it.each([
    ['pathways', undefined], ['pathways', true], ['forceHunt', undefined], ['forceHunt', true],
  ])('can hide advanced labs from %s with restored expanded state %s', async (tab, showClimateAdvanced) => {
    const view = mountTool(path, { tab, showClimateAdvanced });
    const trigger = view.one('#ce-advanced-toggle');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(selectedTab(view).id).toBe('ce-tab-' + tab);
    await activate(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('Show advanced labs');
    expect(view.state().showClimateAdvanced).toBe(false);
    expect(coreTabs).toContain(view.state().tab);
    expect(view.all('#ce-tabs [role="tab"]')).toHaveLength(6);
    expect(selectedTab(view).id).toBe('ce-tab-' + view.state().tab);
    expect(document.activeElement).toBe(trigger);
  });

  it('names the badges disclosure and exposes earned status in text', async () => {
    const view = mountTool(path, { badges: { firstCalc: true } });
    const toggle = view.one('#ce-badges-toggle'), panel = view.one('#ce-badges-panel');
    expect(toggle.textContent).toMatch(/Badges\s+1\/18/);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.hidden).toBe(true);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe('ce-badges-title');
    expect(view.one('#ce-badges-title').textContent).toMatch(/badges/i);
    await activate(toggle);
    expect(view.one('#ce-badges-panel')).toBe(panel);
    expect(panel.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.textContent).toContain('First Calculation');
    const statusLabels = [...panel.querySelectorAll('*')].filter(node => !node.children.length).map(node => node.textContent.trim());
    expect(statusLabels.filter(text => text === 'Earned')).toHaveLength(1);
    expect(statusLabels.filter(text => text === 'Not yet earned')).toHaveLength(17);
    expect(document.activeElement).toBe(toggle);
    await activate(toggle);
    expect(panel.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it.each(coreTabs.map((tab, index) => [tab, index + 1, tabLabels[index]]))('Alt shortcut to %s selects and focuses its tab with one announcement', async (tab, number, label) => {
    const view = mountTool(path, { tab: 'pathways' });
    view.announce.mockClear();
    await press(view.one('#ce-panel'), String(number), { altKey: true });
    expect(selectedTab(view).id).toBe('ce-tab-' + tab);
    expect(document.activeElement).toBe(selectedTab(view));
    expect(view.announce).toHaveBeenCalledTimes(1);
    expect(view.announce.mock.calls[0][0]).toContain(label);
  });

  it('supports unmodified tab arrows, Home and End with roving focus', async () => {
    const view = mountTool(path, { tab: 'carbon' });
    await press(selectedTab(view), 'ArrowRight');
    expect(selectedTab(view).id).toBe('ce-tab-renewables');
    expect(document.activeElement).toBe(selectedTab(view));
    await press(selectedTab(view), 'End');
    expect(selectedTab(view).id).toBe('ce-tab-solutions');
    await press(selectedTab(view), 'Home');
    expect(selectedTab(view).id).toBe('ce-tab-carbon');
    await press(selectedTab(view), 'ArrowLeft');
    expect(selectedTab(view).id).toBe('ce-tab-solutions');
    expect(document.activeElement).toBe(selectedTab(view));
  });

  it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'])('does not take over %s-modified tab navigation', async modifier => {
    const view = mountTool(path, { tab: 'carbon' });
    const current = selectedTab(view);
    view.announce.mockClear();
    await press(current, 'ArrowRight', { [modifier]: true });
    expect(selectedTab(view)).toBe(current);
    expect(document.activeElement).toBe(current);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it.each(['ArrowRight', 'Home', 'End'])('does not change tabs for composing %s events', async key => {
    const view = mountTool(path, { tab: 'keeling' });
    const current = selectedTab(view);
    view.announce.mockClear();
    await press(current, key, { isComposing: true });
    expect(selectedTab(view)).toBe(current);
    expect(document.activeElement).toBe(current);
    expect(view.announce).not.toHaveBeenCalled();
  });
});
