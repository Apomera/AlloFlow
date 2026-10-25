import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React } from './helpers/stem_widgets_smoke_harness.js';
import { SRC, node, freshTool, renderState, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';
import { stripWeldlabAccessibleNavigation } from './helpers/weldlab_wcag_navigation_restore.js';

const TABSETS = [
  ['beadLab', 'bead-view'], ['symbolsReader', 'symbols'], ['ppeSafety', 'ppe'],
  ['careerPaths', 'careers'], ['underwater', 'underwater'], ['consumables', 'consumables'],
  ['maineEcosystem', 'ecosystem'], ['safetyHealth', 'safety'], ['mathBlueprint', 'math'],
  ['careerStories', 'stories'],
];
let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });

async function key(target, value, extra = {}) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, ...extra });
  await React.act(() => { target.dispatchEvent(event); });
  return event;
}
const strip = name => node().querySelector(`[data-weld-tabset="${name}"]`);
const tabs = name => [...strip(name).querySelectorAll('[role="tab"]')];
const selected = name => strip(name).querySelector('[aria-selected="true"]');
function expectPanel(name, active, container = node()) {
  const panel = container.querySelector(`[data-weld-tabpanel="${name}"]`);
  expect(panel?.getAttribute('role')).toBe('tabpanel');
  expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
  expect(active.getAttribute('aria-controls')).toBe(panel.id);
  expect(panel.tabIndex).toBe(0);
  expect(panel.contains(active)).toBe(false);
  return panel;
}

describe('WeldLab tab keyboard navigation', () => {
  it.each(TABSETS)('%s exposes a named panel and one selected tab stop', (view, name) => {
    const container = renderState({ view });
    const group = container.querySelector(`[data-weld-tabset="${name}"]`);
    const options = [...group.querySelectorAll('[role="tab"]')];
    const active = options.filter(tab => tab.getAttribute('aria-selected') === 'true');
    expect(active).toHaveLength(1);
    expect(options.filter(tab => tab.tabIndex === 0)).toEqual(active);
    expect(new Set(options.map(tab => tab.id)).size).toBe(options.length);
    const panel = expectPanel(name, active[0], container);
    for (const tab of options) {
      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
      expect(tab.hasAttribute('aria-pressed')).toBe(false);
      expect(tab.tabIndex).toBe(tab === active[0] ? 0 : -1);
    }
  });

  it.each(TABSETS)('%s wraps arrows, supports Home/End and preserves native Tab/vertical scrolling', async (view, name) => {
    const app = await mountState({ view });
    const first = tabs(name)[0], last = tabs(name).at(-1);
    first.focus();
    expect((await key(first, 'ArrowLeft')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    expect(selected(name)).toBe(last);
    expectPanel(name, last);
    expect(tabs(name).filter(tab => tab.tabIndex === 0)).toEqual([last]);
    await key(last, 'ArrowRight');
    expect(document.activeElement).toBe(first);
    expect(selected(name)).toBe(first);
    await key(first, 'End');
    expect(selected(name)).toBe(last);
    await key(last, 'Home');
    expect(selected(name)).toBe(first);
    expectPanel(name, first);
    expect((await key(first, 'ArrowDown')).defaultPrevented).toBe(false);
    expect((await key(first, 'ArrowUp')).defaultPrevented).toBe(false);
    expect((await key(first, 'Tab')).defaultPrevented).toBe(false);
    expect((await key(first, 'Tab', { shiftKey: true })).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(first);
    expect(app.latest().view).toBe(view);
  });

  it('skips unavailable and nested tabs without consuming shortcuts or descendant input keys', () => {
    const group = document.createElement('div');
    group.setAttribute('role', 'tablist');
    group.innerHTML = '<button role="tab">A</button><button role="tab" disabled>B</button>' +
      '<button role="tab" aria-disabled="true">C</button><button role="tab">D</button>' +
      '<div role="tablist"><button role="tab">Nested</button></div>';
    document.body.append(group);
    try {
      const [a, , , d, nested] = group.querySelectorAll('[role="tab"]');
      const activated = vi.fn(); d.addEventListener('click', activated);
      const run = (target, key, extra = {}) => {
        const preventDefault = vi.fn();
        window.__WeldLabCore.tabGroupKeys({ currentTarget: group, target, key, preventDefault, ...extra });
        return preventDefault;
      };
      a.focus();
      expect(run(a, 'ArrowRight')).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(d);
      expect(activated).toHaveBeenCalledOnce();
      expect(run(d, 'ArrowRight')).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(a);
      expect(run(nested, 'Home')).not.toHaveBeenCalled();
      expect(run(a, 'ArrowRight', { ctrlKey: true })).not.toHaveBeenCalled();
      expect(run(a, 'ArrowLeft', { altKey: true })).not.toHaveBeenCalled();
      expect(run(a, 'End', { metaKey: true })).not.toHaveBeenCalled();
      const input = document.createElement('input'); a.append(input);
      expect(run(input, 'ArrowRight')).not.toHaveBeenCalled();
    } finally { group.remove(); }
  });

  it('keeps the existing Joint Catalog tabs and panel relationship intact', async () => {
    await mountState({ view: 'jointCatalog' });
    const group = node().querySelector('[role="tablist"]');
    const first = group.querySelector('[role="tab"]');
    first.focus(); await key(first, 'End');
    const active = group.querySelector('[aria-selected="true"]');
    expect(document.activeElement).toBe(active);
    expect(active.tabIndex).toBe(0);
    expect(node().querySelector('#proc2-joint-panel').getAttribute('aria-labelledby')).toBe(active.id);
  });
});

describe('WeldLab module navigation focus', () => {
  it('leaves initial focus alone, including restored modules and subsequent form changes', async () => {
    outside = document.createElement('button'); document.body.append(outside); outside.focus();
    await mountState({ view: 'careerStories', cs_mode: 'browse', car2_reflect: 'Keep this.' });
    expect(document.activeElement).toBe(outside);
    const field = node().querySelector('#car2-reflect'); field.focus();
    await change(field, 'My next question.');
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe('My next question.');
  });

  it('focuses the new module heading and the menu heading on every intentional visit', async () => {
    outside = document.createElement('button'); document.body.append(outside); outside.focus();
    const app = await mountState({ view: 'menu', menu_mode: 'all' });
    expect(document.activeElement).toBe(outside);
    const query = () => node().querySelector('[data-weld-module-query]');
    for (let visit = 0; visit < 2; visit++) {
      query().focus(); await change(query(), 'Symbols Reader');
      expect(document.activeElement).toBe(query());
      const open = node().querySelector('[data-weld-module-result="symbolsReader"] button');
      open.focus(); await click(open);
      const heading = node().querySelector('[data-weld-view="symbolsReader"] h1');
      expect(document.activeElement).toBe(heading);
      expect(heading.tabIndex).toBe(-1);
      expect(app.latest().view).toBe('symbolsReader');
      const back = node().querySelector('button[aria-label="Back to WeldLab menu"]');
      back.focus(); await click(back);
      expect(app.latest().view).toBe('menu');
      expect(document.activeElement).toBe(node().querySelector('[data-weld-view="menu"] h1'));
    }
  });

  it('focuses a related module while preserving existing badge and learner state', async () => {
    const app = await mountState({ view: 'symbolsReader', sr_view: 'anatomy', car2_reflect: 'Do not replace me.', weldBadges: { ppeSafety: true } });
    const next = [...node().querySelectorAll('button')].find(button => button.textContent === 'Shop math + print reading →');
    next.focus(); await click(next);
    expect(app.latest().view).toBe('mathBlueprint');
    expect(document.activeElement).toBe(node().querySelector('[data-weld-view="mathBlueprint"] h1'));
    expect(app.latest().car2_reflect).toBe('Do not replace me.');
    expect(app.latest().weldBadges).toMatchObject({ ppeSafety: true, mathBlueprint: true });
  });

  it('retains an exact reversible fixture for existing model-preservation checks', () => {
    const source = readFileSync(SRC, 'utf8');
    const restored = stripWeldlabAccessibleNavigation(source);
    expect(restored).not.toContain('  function tabGroupKeys(e) {');
    expect(restored).not.toContain('data-weld-tabset');
    expect(restored).not.toContain('pendingViewFocusRef');
    expect(restored.includes('\r\n')).toBe(source.includes('\r\n'));
    expect(restored.startsWith('\uFEFF')).toBe(source.startsWith('\uFEFF'));
    expect(stripWeldlabAccessibleNavigation(restored)).toBe(restored);
  });
});
