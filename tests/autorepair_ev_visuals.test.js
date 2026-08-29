// Auto Repair Shop - EV / hybrid visual, state, and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_EV_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const VIEWS = ['overview', 'safety', 'diffs'];

function extractAssignedValue(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error('Missing ' + name + ' fixture');

  const objectAt = source.indexOf('{', markerAt + marker.length);
  const arrayAt = source.indexOf('[', markerAt + marker.length);
  const starts = [objectAt, arrayAt].filter((index) => index >= 0);
  const start = Math.min(...starts);
  if (!Number.isFinite(start)) throw new Error('Missing value for ' + name);

  const pairs = { '{': '}', '[': ']', '(': ')' };
  const closers = new Set(Object.values(pairs));
  const stack = [];
  let quote = '';
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (pairs[character]) stack.push(pairs[character]);
    else if (closers.has(character)) {
      if (stack.pop() !== character) throw new Error('Unbalanced ' + name + ' fixture');
      if (stack.length === 0) {
        return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
      }
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const OVERVIEW = extractAssignedValue(SOURCE, 'EV_OVERVIEW');
const SAFETY = extractAssignedValue(SOURCE, 'EV_SAFETY');
const DIFFERENCES = extractAssignedValue(SOURCE, 'EV_KEY_DIFFERENCES');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function ev(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'ev' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function expectLabelled(host, region) {
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId).toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
}

function mediaText(rule) {
  return rule.conditionText || rule.media?.mediaText || '';
}

function rulesForMedia(topRules, pattern) {
  return topRules
    .filter((rule) => pattern.test(mediaText(rule)))
    .flatMap((rule) => [...(rule.cssRules || [])]);
}

function hasSelector(rule, selector) {
  return (rule.selectorText || '').split(',').map((part) => part.trim()).includes(selector);
}

function ruleForSelector(rules, selector) {
  return rules.find((rule) => hasSelector(rule, selector));
}

function expectOneActiveView(host, view) {
  const tabs = [...host.querySelectorAll('[data-ar-ev-tab][role="tab"]')];
  const panels = [...host.querySelectorAll('[data-ar-ev-panel][role="tabpanel"]')];
  expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').map((tab) => tab.dataset.arEvTab)).toEqual([view]);
  expect(tabs.filter((tab) => tab.getAttribute('tabindex') === '0').map((tab) => tab.dataset.arEvTab)).toEqual([view]);
  expect(panels.filter((panel) => !panel.hidden).map((panel) => panel.dataset.arEvPanel)).toEqual([view]);
  expect(panels.filter((panel) => panel.getAttribute('tabindex') === '0').map((panel) => panel.dataset.arEvPanel)).toEqual([view]);
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair EV / hybrid visual workbench', () => {
  it('renders one labelled overview shell with all four authored guide facts', () => {
    const { html, host } = ev();
    const shell = host.querySelector('main.ar-ev-shell[data-ar-ev-shell][data-ar-ev-view="overview"]');
    const hero = shell.querySelector('[data-ar-ev-hero]');
    const tabs = shell.querySelector('[data-ar-ev-tabs][role="tablist"]');
    const overview = shell.querySelector('[data-ar-ev-panel="overview"]');
    const facts = [...overview.querySelectorAll('[data-ar-ev-stat]')];
    const expectedValues = [OVERVIEW.aseCert, OVERVIEW.tooling, OVERVIEW.salaryDelta, OVERVIEW.where];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="EV navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expect(tabs.getAttribute('aria-orientation')).toBe('horizontal');
    expect(tabs.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expectOneActiveView(shell, 'overview');
    expectLabelled(host, overview);
    expect(overview.textContent).toContain(OVERVIEW.bigPicture);
    expect(facts).toHaveLength(4);
    expectedValues.forEach((value, index) => expect(facts[index].textContent).toContain(value));
    expect(overview.textContent).toContain('do not service HV components');
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders all six safety choices in order with stable empty and active details', () => {
    const idle = ev({ evView: 'safety' });
    const idlePanel = idle.host.querySelector('[data-ar-ev-panel="safety"]');
    const idleChoices = [...idlePanel.querySelectorAll('button[data-ar-ev-safety-id]')];
    const idleDetail = idlePanel.querySelector('article[data-ar-ev-safety-detail]');

    expect(idleChoices.map((choice) => choice.dataset.arEvSafetyId)).toEqual(SAFETY.map((item) => item.id));
    expect(idleChoices).toHaveLength(6);
    expect(idleChoices.every((choice) =>
      choice.type === 'button' &&
      choice.getAttribute('aria-pressed') === 'false' &&
      idle.host.querySelector('#' + choice.getAttribute('aria-controls')) === idleDetail
    )).toBe(true);
    expect(idleDetail).toBeTruthy();
    expect(idleDetail.dataset.arEvSafetyDetailState).toBe('empty');
    expectLabelled(idle.host, idleDetail);

    for (const item of SAFETY) {
      const { html, host } = ev({ evView: 'safety', evSafetyPicked: item.id });
      const panel = host.querySelector('[data-ar-ev-panel="safety"]');
      const choices = [...panel.querySelectorAll('button[data-ar-ev-safety-id]')];
      const selected = panel.querySelector('[data-ar-ev-safety-id="' + item.id + '"]');
      const detail = panel.querySelector('article[data-ar-ev-safety-detail]');

      expect(choices).toHaveLength(6);
      expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toEqual([selected]);
      expect(selected.type).toBe('button');
      expect(selected.textContent).toContain(item.name);
      expect(selected.textContent).toContain('Viewing');
      expect(detail.dataset.arEvSafetyDetailState).toBe('active');
      expect(detail.textContent).toContain(item.name);
      expect(detail.textContent).toContain(item.rule);
      expect(detail.textContent).toContain(item.detail);
      expect(detail.textContent).toContain(item.action);
      expectLabelled(host, detail);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('renders all seven ICE differences and preserves the valid index-zero selection', () => {
    const idle = ev({ evView: 'diffs' });
    const idlePanel = idle.host.querySelector('[data-ar-ev-panel="diffs"]');
    const idleChoices = [...idlePanel.querySelectorAll('button[data-ar-ev-diff-index]')];
    const idleDetail = idlePanel.querySelector('article[data-ar-ev-diff-detail]');

    expect(idleChoices.map((choice) => Number(choice.dataset.arEvDiffIndex))).toEqual(DIFFERENCES.map((_, index) => index));
    expect(idleChoices.map((choice) => choice.textContent)).toEqual(expect.arrayContaining(DIFFERENCES.map((item) => expect.stringContaining(item.topic))));
    expect(idleChoices).toHaveLength(7);
    expect(idleDetail.dataset.arEvDiffDetailState).toBe('empty');
    expectLabelled(idle.host, idleDetail);

    for (let index = 0; index < DIFFERENCES.length; index += 1) {
      const item = DIFFERENCES[index];
      const { html, host } = ev({ evView: 'diffs', evDiffPicked: index });
      const panel = host.querySelector('[data-ar-ev-panel="diffs"]');
      const choices = [...panel.querySelectorAll('button[data-ar-ev-diff-index]')];
      const selected = panel.querySelector('[data-ar-ev-diff-index="' + index + '"]');
      const detail = panel.querySelector('article[data-ar-ev-diff-detail]');

      expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toEqual([selected]);
      expect(selected.type).toBe('button');
      expect(selected.textContent).toContain(item.topic);
      expect(selected.textContent).toContain('Viewing');
      expect(detail.dataset.arEvDiffDetailState).toBe('active');
      expect(detail.textContent).toContain(item.topic);
      expect(detail.textContent).toContain(item.what);
      expect(detail.textContent).toContain(item.maintenanceShift);
      expectLabelled(host, detail);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('clamps stale and non-string persisted state without orphaning the tab contract', () => {
    for (const extra of [
      { evView: 'retired-view' },
      { evView: ' ' },
      { evView: 42 },
      { evView: { id: 'safety' } },
      { evView: ['diffs'] }
    ]) {
      const { html, host } = ev(extra);
      const shell = host.querySelector('[data-ar-ev-shell][data-ar-ev-view="overview"]');
      expect(shell).toBeTruthy();
      expectOneActiveView(shell, 'overview');
      expect(shell.querySelector('[data-ar-ev-panel="overview"] [data-ar-ev-stat]')).toBeTruthy();
      expect(html).not.toMatch(/autorepair-ev-(?:tab|panel)-(?:retired-view|42)/);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    for (const evSafetyPicked of ['retired-rule', 42, { id: 'orange-cables' }, ['hv-disable']]) {
      const { html, host } = ev({ evView: 'safety', evSafetyPicked });
      const panel = host.querySelector('[data-ar-ev-panel="safety"]');
      expect(panel.querySelectorAll('[data-ar-ev-safety-id][aria-pressed="true"]')).toHaveLength(0);
      expect(panel.querySelector('[data-ar-ev-safety-detail]').dataset.arEvSafetyDetailState).toBe('empty');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    for (const evDiffPicked of [-1, DIFFERENCES.length, '0', 'retired', {}, []]) {
      const { html, host } = ev({ evView: 'diffs', evDiffPicked });
      const panel = host.querySelector('[data-ar-ev-panel="diffs"]');
      expect(panel.querySelectorAll('[data-ar-ev-diff-index][aria-pressed="true"]')).toHaveLength(0);
      expect(panel.querySelector('[data-ar-ev-diff-detail]').dataset.arEvDiffDetailState).toBe('empty');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps three reciprocal panels and the complete roving-keyboard contract', () => {
    for (const view of VIEWS) {
      const { host } = ev({ evView: view });
      const shell = host.querySelector('[data-ar-ev-shell]');
      const tabs = [...shell.querySelectorAll('[data-ar-ev-tabs] > [role="tab"]')];
      const panels = [...shell.querySelectorAll('[data-ar-ev-panel][role="tabpanel"]')];

      expect(tabs.map((tab) => tab.dataset.arEvTab)).toEqual(VIEWS);
      expect(panels.map((panel) => panel.dataset.arEvPanel)).toEqual(VIEWS);
      expectOneActiveView(shell, view);
      tabs.forEach((tab) => {
        const active = tab.dataset.arEvTab === view;
        const panel = shell.querySelector('#' + tab.getAttribute('aria-controls'));
        expect(tab.tagName).toBe('BUTTON');
        expect(tab.type).toBe('button');
        expect(tab.getAttribute('aria-selected')).toBe(active ? 'true' : 'false');
        expect(tab.getAttribute('tabindex')).toBe(active ? '0' : '-1');
        expect(tab.dataset.arTabState).toBe(active ? 'active' : 'inactive');
        expect(tab.textContent.includes('Current view')).toBe(active);
        expect(panel).toBeTruthy();
        expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
        expect(panel.getAttribute('tabindex')).toBe(active ? '0' : '-1');
        expect(panel.hidden).toBe(!active);
        expect(panel.dataset.arPanelState).toBe(active ? 'active' : 'inactive');
      });
    }

    const start = SOURCE.indexOf('function renderEv()');
    const end = SOURCE.indexOf('function renderGlossary()', start);
    const source = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("var EV_TAB_IDS = ['overview', 'safety', 'diffs'];");
    expect(source).toContain('e.preventDefault();');
    expect(source).toContain('nextIndex = (index + 1) % EV_TAB_IDS.length');
    expect(source).toContain('nextIndex = (index - 1 + EV_TAB_IDS.length) % EV_TAB_IDS.length');
    expect(source).toContain("if (key === 'Home') nextIndex = 0;");
    expect(source).toContain("if (key === 'End') nextIndex = EV_TAB_IDS.length - 1;");
    expect(source).toContain("querySelectorAll('[role=\"tab\"]')");
    expect(source).toContain('if (nextTab) { nextTab.focus(); nextTab.click(); }');
  });

  it('renders six meaningful states across every theme with strong-fill text', () => {
    const themes = [
      { theme: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { theme: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { theme: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];
    const states = [
      { extra: {}, view: 'overview' },
      { extra: { evView: 'safety' }, view: 'safety' },
      { extra: { evView: 'safety', evSafetyPicked: SAFETY[0].id }, view: 'safety', selected: '[data-ar-ev-safety-id="' + SAFETY[0].id + '"]' },
      { extra: { evView: 'diffs' }, view: 'diffs' },
      { extra: { evView: 'diffs', evDiffPicked: 0 }, view: 'diffs', selected: '[data-ar-ev-diff-index="0"]' },
      { extra: { evView: { stale: true } }, view: 'overview' }
    ];

    for (const fixture of themes) {
      for (const state of states) {
        const { html, host } = ev(state.extra, fixture.theme);
        const shell = host.querySelector('[data-ar-ev-shell][data-ar-ev-view="' + state.view + '"]');
        const activeTab = shell.querySelector('[data-ar-ev-tab="' + state.view + '"]');
        const activePanel = shell.querySelector('[data-ar-ev-panel="' + state.view + '"]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);

        expect(shell.getAttribute('style')).toContain('color:' + fixture.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(activeTab.getAttribute('style')).toContain('color:' + fixture.strong);
        expect(activePanel.hidden).toBe(false);
        expect(activePanel.querySelector('h2')).toBeTruthy();
        expectOneActiveView(shell, state.view);
        expect(shell.querySelectorAll('[data-ar-ev-stat]')).toHaveLength(4);
        expect(shell.querySelectorAll('[data-ar-ev-safety-id]')).toHaveLength(6);
        expect(shell.querySelectorAll('[data-ar-ev-diff-index]')).toHaveLength(7);
        expect(new Set(ids).size).toBe(ids.length);
        if (state.selected) {
          const selected = shell.querySelector(state.selected);
          expect(selected.getAttribute('aria-pressed')).toBe('true');
          expect(selected.getAttribute('style')).toContain('color:' + fixture.strong);
          expect(selected.textContent).toContain('Viewing');
        }
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards desktop layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    const { host } = ev({ evView: 'safety', evSafetyPicked: SAFETY[0].id });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-ev-hero');
    const tabs = ruleForSelector(topRules, '.ar-ev-tabs');
    const factGrid = ruleForSelector(topRules, '.ar-ev-fact-grid');
    const masterDetail = ruleForSelector(topRules, '.ar-ev-master-detail');
    const sectionWrap = ruleForSelector(topRules, '.ar-ev-section');
    const detailWrap = topRules.find((rule) =>
      hasSelector(rule, '.ar-ev-detail') && rule.style.getPropertyValue('overflow-wrap')
    );
    const touch = ruleForSelector(topRules, '.ar-ev-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(tabs.style.getPropertyValue('grid-template-columns')).toContain('repeat(3');
    expect(factGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(4');
    expect(host.querySelector('.ar-ev-fact-grid').classList.contains('ar-ev-overview-grid')).toBe(true);
    expect(masterDetail.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(sectionWrap.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(detailWrap.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(medium, '.ar-ev-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-ev-overview-grid').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(medium, '.ar-ev-master-detail').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-ev-detail').style.getPropertyValue('position')).toBe('static');

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    expect(ruleForSelector(small, '.ar-ev-fact-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(small, '.ar-ev-safety-list').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(small, '.ar-ev-tab').style.getPropertyValue('flex-direction')).toBe('column');
  });

  it('guards reduced-motion, forced-color, and printable three-panel contracts', () => {
    const { host } = ev({ evView: 'diffs', evDiffPicked: 0 });
    expect(host.querySelectorAll('[data-ar-ev-panel][hidden]')).toHaveLength(2);

    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedChoice = ruleForSelector(reduced, '.ar-ev-option');
    const reducedHover = ruleForSelector(reduced, '.ar-ev-option:hover');
    const reducedTab = ruleForSelector(reduced, '.ar-ev-tab');
    expect(reducedChoice.style.getPropertyValue('transition')).toBe('none');
    expect(reducedChoice.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedTab.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTab.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedChoice = ruleForSelector(forced, '.ar-ev-option');
    const forcedTabActive = ruleForSelector(forced, '.ar-ev-tab[data-ar-tab-state="active"]');
    const forcedChoiceActive = ruleForSelector(forced, '.ar-ev-option[data-ar-option-state="active"]');
    const forcedFocus = ruleForSelector(forced, '.ar-ev-option:focus-visible');
    expect(forcedChoice.style.getPropertyPriority('border')).toBe('important');
    expect(forcedChoice.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedChoice.style.getPropertyPriority('box-shadow')).toBe('important');
    expect(forcedTabActive.style.getPropertyValue('outline')).toContain('Highlight');
    expect(forcedTabActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedChoiceActive.style.getPropertyValue('outline')).toContain('Highlight');
    expect(forcedChoiceActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedFocus.style.getPropertyValue('outline')).toContain('Highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printTabs = ruleForSelector(print, '.ar-ev-tabs');
    const revealPanels = ruleForSelector(print, '.ar-ev-panel[hidden]');
    const printGrid = ruleForSelector(print, '.ar-ev-fact-grid');
    const avoidChoice = print.find((rule) => hasSelector(rule, '.ar-ev-option') && /(?:break-inside|page-break-inside)/.test(rule.cssText));
    const avoidDetail = print.find((rule) => hasSelector(rule, '.ar-ev-detail') && /(?:break-inside|page-break-inside)/.test(rule.cssText));
    expect(printTabs.style.getPropertyValue('display')).toBe('none');
    expect(printTabs.style.getPropertyPriority('display')).toBe('important');
    expect(revealPanels.style.getPropertyValue('display')).toBe('block');
    expect(revealPanels.style.getPropertyPriority('display')).toBe('important');
    expect(printGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(printGrid.style.getPropertyPriority('grid-template-columns')).toBe('important');
    expect(avoidChoice.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(avoidDetail.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(style.textContent).toContain('.ar-ev-shell, .ar-ev-shell * { color: black !important; }');
  });

  it('preserves authored data, source validity, visual hooks, and canonical mirror parity', () => {
    expect([OVERVIEW.bigPicture, OVERVIEW.aseCert, OVERVIEW.tooling, OVERVIEW.salaryDelta, OVERVIEW.where]
      .every((value) => typeof value === 'string' && value.length > 20)).toBe(true);
    expect(SAFETY.map((item) => item.id)).toEqual([
      'orange-cables',
      'hv-disable',
      'class-0-gloves',
      'do-not-touch-while-charging',
      'thermal-runaway',
      'lvi-still-matters'
    ]);
    expect(SAFETY.every((item) =>
      typeof item.name === 'string' && item.name.length > 5 &&
      typeof item.rule === 'string' && item.rule.length > 20 &&
      typeof item.detail === 'string' && item.detail.length > 20 &&
      typeof item.action === 'string' && item.action.length > 20
    )).toBe(true);
    expect(DIFFERENCES.map((item) => item.topic)).toEqual([
      'No oil change',
      'Regenerative braking',
      'Cold weather range',
      'Charging types',
      'Diagnostic tools',
      'Hybrid still has an engine',
      'Tires wear faster'
    ]);
    expect(DIFFERENCES.every((item) =>
      typeof item.what === 'string' && item.what.length > 20 &&
      typeof item.maintenanceShift === 'string' && item.maintenanceShift.length > 20
    )).toBe(true);

    expect(SOURCE.match(/function renderEv\(\)/g)).toHaveLength(1);
    for (const hook of [
      'data-ar-ev-shell',
      'data-ar-ev-view',
      'data-ar-ev-hero',
      'data-ar-ev-tabs',
      'data-ar-ev-tab',
      'data-ar-ev-panel',
      'data-ar-ev-stat',
      'data-ar-ev-safety-id',
      'data-ar-ev-diff-index',
      'data-ar-ev-safety-detail',
      'data-ar-ev-diff-detail'
    ]) expect(SOURCE).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
