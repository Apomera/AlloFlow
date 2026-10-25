import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// These tests exercise the rendered native controls and their persisted data.
// Enter/Space activation, visual focus and reflow are covered in the browser;
// jsdom does not synthesize a button's default keyboard activation.
const sourcePath = process.env.MIGRATION_DISCLOSURES_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const { act } = React;
const mounts = [];
let tool;

function fixture(seed, translate) {
  let state = { ...seed }, refresh;
  const writes = [];
  const ctx = makeCtx({
    t: translate || ((key, fallback) => fallback == null ? key : fallback),
    update: (_, key, value) => {
      writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1);
    },
    updateMulti: (_, values) => {
      writes.push(values); state = { ...state, ...values }; refresh(value => value + 1);
    }
  });
  const host = document.createElement('form'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  function Component() {
    refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx);
  }
  act(() => root.render(React.createElement(Component)));
  return {
    host, writes,
    get state() { return state; },
    triggers() { return [...host.querySelectorAll('.migration-disclosure-trigger')]; },
    click(element) { act(() => element.click()); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    dispose() {
      act(() => root.unmount()); host.remove();
      mounts.splice(mounts.findIndex(mount => mount.root === root), 1);
    }
  };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const noop = () => {};
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return new Proxy({
      canvas: this, measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop })
    }, { get: (target, key) => key in target ? target[key] : noop });
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', noop);
  resetStemLab(); tool = loadTool(sourcePath, 'migration');
});

afterEach(() => {
  act(() => mounts.splice(0).forEach(({ root }) => root.unmount()));
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each([
  { tab: 'vformation', key: 'expandedFact', value: 0, otherValue: 1, prefix: 'migration-formation-description-' },
  { tab: 'navigate', key: 'expandedNav', value: 'magnetic', otherValue: 'stars', prefix: 'migration-navigation-description-' }
])('$tab learning disclosures', ({ tab, key, value, otherValue, prefix }) => {
  it('provides six native triggers with unique references to initially hidden sibling prose', () => {
    const ui = fixture({ tab }), triggers = ui.triggers();
    expect(triggers).toHaveLength(6);
    const ids = new Set();
    for (const trigger of triggers) {
      expect(trigger.tagName).toBe('BUTTON'); expect(trigger.type).toBe('button');
      expect(trigger.tabIndex).toBe(0); expect(trigger.getAttribute('aria-expanded')).toBe('false');
      const targetId = trigger.getAttribute('aria-controls');
      expect(targetId.startsWith(prefix)).toBe(true); expect(ids.has(targetId)).toBe(false); ids.add(targetId);
      const prose = ui.host.querySelector('#' + targetId);
      expect(prose).not.toBeNull(); expect(prose.tagName).toBe('P'); expect(prose.hidden).toBe(true);
      expect(prose.parentElement).toBe(trigger.parentElement); expect(trigger.nextElementSibling).toBe(prose);
      expect(prose.textContent.trim().length).toBeGreaterThan(20);
      expect(trigger.contains(prose)).toBe(false);
      expect(trigger.querySelector('button, a, input, select, textarea, [tabindex]')).toBeNull();
    }
  });

  it('expands and collapses without changing the trigger or moving focused keyboard users', () => {
    const ui = fixture({ tab }), trigger = ui.triggers()[0];
    const prose = ui.host.querySelector('#' + trigger.getAttribute('aria-controls'));
    const name = trigger.textContent.replace(/[\u25B2\u25BC]/g, '').trim();
    trigger.focus(); ui.click(trigger);
    expect(ui.state[key]).toBe(value); expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(prose.hidden).toBe(false); expect(ui.triggers()[0]).toBe(trigger); expect(document.activeElement).toBe(trigger);
    expect(trigger.textContent.replace(/[\u25B2\u25BC]/g, '').trim()).toBe(name);
    expect(trigger.textContent).not.toContain(prose.textContent);
    ui.click(trigger);
    expect(ui.state[key]).toBeNull(); expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(prose.hidden).toBe(true); expect(ui.triggers()[0]).toBe(trigger); expect(document.activeElement).toBe(trigger);
    expect(ui.writes).toEqual([{ [key]: value }, { [key]: null }]);
  });

  it('moves the expanded state to a second card while keeping both trigger nodes stable', () => {
    const ui = fixture({ tab }), [first, second] = ui.triggers();
    ui.click(first); second.focus(); ui.click(second);
    expect(ui.state[key]).toBe(otherValue);
    expect(first.getAttribute('aria-expanded')).toBe('false'); expect(second.getAttribute('aria-expanded')).toBe('true');
    expect(ui.host.querySelector('#' + first.getAttribute('aria-controls')).hidden).toBe(true);
    expect(ui.host.querySelector('#' + second.getAttribute('aria-controls')).hidden).toBe(false);
    expect(ui.triggers()[0]).toBe(first); expect(ui.triggers()[1]).toBe(second); expect(document.activeElement).toBe(second);
    expect(ui.triggers().filter(trigger => trigger.getAttribute('aria-expanded') === 'true')).toHaveLength(1);
  });

  it('leaves expanded reading content open when its text is clicked and never submits a host form', () => {
    const ui = fixture({ tab }), trigger = ui.triggers()[0], submit = vi.fn(event => event.preventDefault());
    ui.host.addEventListener('submit', submit); ui.click(trigger);
    const prose = ui.host.querySelector('#' + trigger.getAttribute('aria-controls'));
    ui.click(prose);
    expect(ui.state[key]).toBe(value); expect(prose.hidden).toBe(false);
    expect(ui.writes).toEqual([{ [key]: value }]); expect(submit).not.toHaveBeenCalled();
  });

  it('restores the selected disclosure after leaving the tab and remounting saved data', () => {
    const ui = fixture({ tab }); ui.click(ui.triggers()[0]);
    ui.set({ tab: tab === 'navigate' ? 'vformation' : 'navigate' }); ui.set({ tab });
    expect(ui.triggers()[0].getAttribute('aria-expanded')).toBe('true');
    const saved = { ...ui.state }; ui.dispose();
    const restored = fixture(saved), trigger = restored.triggers()[0];
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(restored.host.querySelector('#' + trigger.getAttribute('aria-controls')).hidden).toBe(false);
    expect(restored.writes).toEqual([]);
  });

  it('keeps translated headings concise while translating the separately readable description', () => {
    const ui = fixture({ tab }, (key, fallback) => 'Translated: ' + (fallback == null ? key : fallback));
    const trigger = ui.triggers()[0], prose = ui.host.querySelector('#' + trigger.getAttribute('aria-controls'));
    expect(trigger.textContent).toContain('Translated: '); expect(prose.textContent).toContain('Translated: ');
    ui.click(trigger); expect(prose.hidden).toBe(false); expect(trigger.textContent).not.toContain(prose.textContent);
    for (const ornament of trigger.querySelectorAll('[aria-hidden]')) expect(ornament.getAttribute('aria-hidden')).toBe('true');
  });
});
