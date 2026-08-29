// Auto Repair Shop - Used-car buyer guide visual, state, and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_USEDCAR_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const VIEWS = ['overview', 'flags', 'walk'];

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

const CHECK = extractAssignedValue(SOURCE, 'USED_CAR_CHECK');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function usedcar(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'usedcar' }, extra || {})
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

function walkDone(steps, extras) {
  const checked = Object.assign({}, extras || {});
  steps.forEach((step) => { checked[step] = true; });
  return checked;
}

function expectOneActiveView(shell, view) {
  const tabs = [...shell.querySelectorAll('[data-ar-usedcar-tab][role="tab"]')];
  const panels = [...shell.querySelectorAll('[data-ar-usedcar-panel][role="tabpanel"]')];
  expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').map((tab) => tab.dataset.arUsedcarTab)).toEqual([view]);
  expect(tabs.filter((tab) => tab.getAttribute('tabindex') === '0').map((tab) => tab.dataset.arUsedcarTab)).toEqual([view]);
  expect(panels.filter((panel) => !panel.hidden).map((panel) => panel.dataset.arUsedcarPanel)).toEqual([view]);
  expect(panels.filter((panel) => panel.getAttribute('tabindex') === '0').map((panel) => panel.dataset.arUsedcarPanel)).toEqual([view]);
}

function expectProgress(panel, now) {
  const total = CHECK.walkaround.length;
  const progress = panel.querySelector('[data-ar-usedcar-walk-progress][role="progressbar"]');
  const fill = progress.querySelector('.ar-usedcar-progress-fill');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe(String(total));
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of ' + total);
  expect(parseFloat(fill.style.width)).toBeCloseTo((now / total) * 100, 1);
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Used-car buyer visual workbench', () => {
  it('renders one labelled shell with all six best-practice cards', () => {
    const { html, host } = usedcar();
    const shell = host.querySelector('main.ar-usedcar-shell[data-ar-usedcar-shell][data-ar-usedcar-view="overview"]');
    const hero = shell.querySelector('[data-ar-usedcar-hero]');
    const tabs = shell.querySelector('[data-ar-usedcar-tabs][role="tablist"]');
    const overview = shell.querySelector('[data-ar-usedcar-panel="overview"]');
    const practices = [...overview.querySelectorAll('[data-ar-usedcar-practice]')];
    const disclaimer = shell.querySelector('[role="note"][aria-label="Educational disclaimer"]');

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Used car navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expect(hero.querySelectorAll('.ar-usedcar-hero-stat')).toHaveLength(3);
    expect(hero.textContent).toContain('6');
    expect(hero.textContent).toContain('10');
    expect(hero.textContent).toContain('9');
    expect(tabs.getAttribute('aria-orientation')).toBe('horizontal');
    expect(tabs.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expectOneActiveView(shell, 'overview');
    expectLabelled(host, overview);
    expect(practices).toHaveLength(6);
    expect(practices.map((practice) => Number(practice.dataset.arUsedcarPractice))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(practices.every((practice) => practice.querySelector('h3') && practice.querySelector('p'))).toBe(true);
    expect(overview.textContent).toContain(CHECK.intro);
    expect(disclaimer).toBeTruthy();
    expect([...shell.querySelectorAll('[data-ar-usedcar-panel]')].some((panel) => panel.contains(disclaimer))).toBe(false);
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders all ten authored red flags in order with stable empty and active detail', () => {
    const idle = usedcar({ ucView: 'flags' });
    const idlePanel = idle.host.querySelector('[data-ar-usedcar-panel="flags"]');
    const idleFlags = [...idlePanel.querySelectorAll('button[data-ar-usedcar-flag-id]')];
    const idleDetail = idlePanel.querySelector('article[data-ar-usedcar-flag-detail]');

    expect(idleFlags.map((flag) => flag.dataset.arUsedcarFlagId)).toEqual(CHECK.redFlags.map((flag) => flag.id));
    expect(idleFlags).toHaveLength(10);
    expect(idleFlags.every((flag) =>
      flag.type === 'button' &&
      flag.getAttribute('aria-pressed') === 'false' &&
      idle.host.querySelector('#' + flag.getAttribute('aria-controls')) === idleDetail
    )).toBe(true);
    expect(idleDetail.dataset.arUsedcarFlagDetailState).toBe('empty');
    expectLabelled(idle.host, idleDetail);

    for (const item of CHECK.redFlags) {
      const { html, host } = usedcar({ ucView: 'flags', ucFlagPicked: item.id });
      const panel = host.querySelector('[data-ar-usedcar-panel="flags"]');
      const choices = [...panel.querySelectorAll('button[data-ar-usedcar-flag-id]')];
      const selected = panel.querySelector('[data-ar-usedcar-flag-id="' + item.id + '"]');
      const detail = panel.querySelector('article[data-ar-usedcar-flag-detail]');

      expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toEqual([selected]);
      expect(selected.type).toBe('button');
      expect(selected.textContent).toContain(item.flag);
      expect(selected.textContent).toContain('Viewing');
      expect(detail.dataset.arUsedcarFlagDetailState).toBe('active');
      expect(detail.textContent).toContain(item.flag);
      expect(detail.textContent).toContain(item.what);
      expect(detail.textContent).toContain(item.ifFound);
      expectLabelled(host, detail);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('renders the exact nine-step walkaround with bounded empty, partial, and complete progress', () => {
    const empty = usedcar({ ucView: 'walk' });
    const emptyPanel = empty.host.querySelector('[data-ar-usedcar-panel="walk"]');
    const emptySteps = [...emptyPanel.querySelectorAll('button[data-ar-usedcar-walk-step]')];
    expect(emptySteps.map((step) => Number(step.dataset.arUsedcarWalkStep))).toEqual(CHECK.walkaround.map((step) => step.step));
    expect(emptySteps.map((step) => step.querySelector('.ar-usedcar-walk-text').textContent)).toEqual(CHECK.walkaround.map((step) => step.do));
    expect(emptySteps.map((step) => step.dataset.arUsedcarWalkState)).toEqual(['current', ...Array(8).fill('upcoming')]);
    expect(emptySteps.filter((step) => step.getAttribute('aria-current') === 'step')).toEqual([emptySteps[0]]);
    expect(emptySteps.every((step) => step.type === 'button' && step.getAttribute('aria-pressed') === 'false')).toBe(true);
    expectProgress(emptyPanel, 0);
    expect(emptyPanel.querySelectorAll('[data-ar-usedcar-status][role="status"]')).toHaveLength(1);
    expect(emptyPanel.querySelector('[data-ar-usedcar-complete]')).toBeNull();

    const partial = usedcar({ ucView: 'walk', ucWalkChecked: walkDone([1, 2, 3], { ghost: true }) });
    const partialPanel = partial.host.querySelector('[data-ar-usedcar-panel="walk"]');
    const partialSteps = [...partialPanel.querySelectorAll('button[data-ar-usedcar-walk-step]')];
    expect(partialSteps.map((step) => step.dataset.arUsedcarWalkState)).toEqual([
      'checked', 'checked', 'checked', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'
    ]);
    expect(partialSteps.filter((step) => step.getAttribute('aria-pressed') === 'true')).toEqual(partialSteps.slice(0, 3));
    expect(partialSteps.filter((step) => step.getAttribute('aria-current') === 'step')).toEqual([partialSteps[3]]);
    expectProgress(partialPanel, 3);

    const complete = usedcar({ ucView: 'walk', ucWalkChecked: walkDone(CHECK.walkaround.map((step) => step.step), { ghost: true }) });
    const completePanel = complete.host.querySelector('[data-ar-usedcar-panel="walk"]');
    const completeSteps = [...completePanel.querySelectorAll('button[data-ar-usedcar-walk-step]')];
    expect(completeSteps.map((step) => step.dataset.arUsedcarWalkState)).toEqual(Array(9).fill('checked'));
    expect(completeSteps.every((step) => step.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(completeSteps.every((step) => !step.hasAttribute('aria-current'))).toBe(true);
    expectProgress(completePanel, 9);
    expect(completePanel.querySelector('[data-ar-usedcar-complete]').textContent).toContain('Used Car Buyer');
  });

  it('ignores malformed walk state, unknown keys, and truthy non-booleans', () => {
    for (const ucWalkChecked of [null, '1', 42, ['1'], { length: 9 }]) {
      const { html, host } = usedcar({ ucView: 'walk', ucWalkChecked });
      const panel = host.querySelector('[data-ar-usedcar-panel="walk"]');
      expectProgress(panel, 0);
      expect(panel.querySelectorAll('[data-ar-usedcar-walk-state="checked"]')).toHaveLength(0);
      expect(panel.querySelector('[data-ar-usedcar-complete]')).toBeNull();
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    const ghosts = Object.fromEntries(Array.from({ length: 9 }, (_, index) => ['ghost-' + index, true]));
    const ghostRender = usedcar({ ucView: 'walk', ucWalkChecked: ghosts });
    expectProgress(ghostRender.host.querySelector('[data-ar-usedcar-panel="walk"]'), 0);
    expect(ghostRender.host.querySelector('[data-ar-usedcar-complete]')).toBeNull();

    const strict = usedcar({
      ucView: 'walk',
      ucWalkChecked: { 1: true, 2: 1, 3: 'true', 4: false, ghost: true }
    });
    const strictPanel = strict.host.querySelector('[data-ar-usedcar-panel="walk"]');
    const strictSteps = [...strictPanel.querySelectorAll('[data-ar-usedcar-walk-step]')];
    expectProgress(strictPanel, 1);
    expect(strictSteps.map((step) => step.dataset.arUsedcarWalkState)).toEqual([
      'checked', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'
    ]);
  });

  it('clamps stale views and flag selections to complete empty fallbacks', () => {
    for (const extra of [
      { ucView: 'retired-view' },
      { ucView: ' ' },
      { ucView: 42 },
      { ucView: { id: 'flags' } },
      { ucView: ['walk'] }
    ]) {
      const { html, host } = usedcar(extra);
      const shell = host.querySelector('[data-ar-usedcar-shell][data-ar-usedcar-view="overview"]');
      expect(shell).toBeTruthy();
      expectOneActiveView(shell, 'overview');
      expect(shell.querySelectorAll('[data-ar-usedcar-practice]')).toHaveLength(6);
      expect(html).not.toMatch(/autorepair-usedcar-(?:tab|panel)-(?:retired-view|42)/);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    for (const ucFlagPicked of ['retired-flag', ' ', 42, { id: 'frame-rust' }, ['frame-rust']]) {
      const { html, host } = usedcar({ ucView: 'flags', ucFlagPicked });
      const panel = host.querySelector('[data-ar-usedcar-panel="flags"]');
      expect(panel.querySelectorAll('[data-ar-usedcar-flag-id][aria-pressed="true"]')).toHaveLength(0);
      expect(panel.querySelector('[data-ar-usedcar-flag-detail]').dataset.arUsedcarFlagDetailState).toBe('empty');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps three stable tabpanels and the complete roving-keyboard contract', () => {
    for (const view of VIEWS) {
      const { host } = usedcar({ ucView: view });
      const shell = host.querySelector('[data-ar-usedcar-shell]');
      const tabs = [...shell.querySelectorAll('[data-ar-usedcar-tabs] > [role="tab"]')];
      const panels = [...shell.querySelectorAll('[data-ar-usedcar-panel][role="tabpanel"]')];

      expect(tabs.map((tab) => tab.dataset.arUsedcarTab)).toEqual(VIEWS);
      expect(panels.map((panel) => panel.dataset.arUsedcarPanel)).toEqual(VIEWS);
      expectOneActiveView(shell, view);
      tabs.forEach((tab) => {
        const active = tab.dataset.arUsedcarTab === view;
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

    const start = SOURCE.indexOf('function renderUsedCar()');
    const end = SOURCE.indexOf('function renderEv()', start);
    const source = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain("var USED_CAR_TAB_IDS = ['overview', 'flags', 'walk'];");
    expect(source).toMatch(/typeof d\.ucView === ['"]string['"]/);
    expect(source).toMatch(/USED_CAR_TAB_IDS\.indexOf\([^)]*\)\s*>=\s*0/);
    expect(source).toContain('e.preventDefault();');
    expect(source).toContain('nextIndex = (index + 1) % USED_CAR_TAB_IDS.length');
    expect(source).toContain('nextIndex = (index - 1 + USED_CAR_TAB_IDS.length) % USED_CAR_TAB_IDS.length');
    expect(source).toContain("if (key === 'Home') nextIndex = 0;");
    expect(source).toContain("if (key === 'End') nextIndex = USED_CAR_TAB_IDS.length - 1;");
    expect(source).toContain("querySelectorAll('[role=\"tab\"]')");
    expect(source).toContain('if (nextTab) { nextTab.focus(); nextTab.click(); }');
  });

  it('preserves hierarchy and state across light, dark, and contrast themes', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];
    const states = [
      { extra: {}, view: 'overview' },
      { extra: { ucView: 'flags' }, view: 'flags' },
      { extra: { ucView: 'flags', ucFlagPicked: CHECK.redFlags[0].id }, view: 'flags', selected: '[data-ar-usedcar-flag-id="' + CHECK.redFlags[0].id + '"]' },
      { extra: { ucView: 'walk' }, view: 'walk' },
      { extra: { ucView: 'walk', ucWalkChecked: walkDone([1, 2, 3]) }, view: 'walk' },
      { extra: { ucView: 'walk', ucWalkChecked: walkDone(CHECK.walkaround.map((step) => step.step)) }, view: 'walk' },
      { extra: { ucView: { stale: true } }, view: 'overview' }
    ];

    for (const theme of themes) {
      for (const state of states) {
        const { html, host } = usedcar(state.extra, theme.value);
        const shell = host.querySelector('[data-ar-usedcar-shell][data-ar-usedcar-view="' + state.view + '"]');
        const activeTab = shell.querySelector('[data-ar-usedcar-tab="' + state.view + '"]');
        const activePanel = shell.querySelector('[data-ar-usedcar-panel="' + state.view + '"]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);

        expect(shell.getAttribute('style')).toContain('color:' + theme.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(activeTab.getAttribute('style')).toContain('color:' + theme.strong);
        expect(activePanel.hidden).toBe(false);
        expectOneActiveView(shell, state.view);
        expect(shell.querySelectorAll('[data-ar-usedcar-practice]')).toHaveLength(6);
        expect(shell.querySelectorAll('[data-ar-usedcar-flag-id]')).toHaveLength(10);
        expect(shell.querySelectorAll('[data-ar-usedcar-walk-step]')).toHaveLength(9);
        expect(shell.querySelectorAll('[data-ar-usedcar-status][role="status"]')).toHaveLength(1);
        expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
        expect(new Set(ids).size).toBe(ids.length);
        if (state.selected) {
          const selected = shell.querySelector(state.selected);
          expect(selected.getAttribute('aria-pressed')).toBe('true');
          expect(selected.getAttribute('style')).toContain('color:' + theme.strong);
          expect(selected.textContent).toContain('Viewing');
        }
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards desktop layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    usedcar({ ucView: 'flags', ucFlagPicked: CHECK.redFlags[0].id });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-usedcar-hero');
    const tabs = ruleForSelector(topRules, '.ar-usedcar-tabs');
    const practices = ruleForSelector(topRules, '.ar-usedcar-practice-grid');
    const masterDetail = ruleForSelector(topRules, '.ar-usedcar-master-detail');
    const wrapping = ruleForSelector(topRules, '.ar-usedcar-section');
    const touch = ruleForSelector(topRules, '.ar-usedcar-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(tabs.style.getPropertyValue('grid-template-columns')).toContain('repeat(3');
    expect(practices.style.getPropertyValue('grid-template-columns')).toContain('repeat(3');
    expect(masterDetail.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(wrapping.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(medium, '.ar-usedcar-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-usedcar-practice-grid').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(medium, '.ar-usedcar-master-detail').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-usedcar-flag-detail').style.getPropertyValue('position')).toBe('static');

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    expect(ruleForSelector(small, '.ar-usedcar-hero-stats').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(small, '.ar-usedcar-practice-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(small, '.ar-usedcar-flag-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(small, '.ar-usedcar-tab').style.getPropertyValue('flex-direction')).toBe('column');
    expect(ruleForSelector(small, '.ar-usedcar-walk-step').style.getPropertyValue('grid-template-columns')).toBe('1fr');
  });

  it('guards reduced-motion, forced-color, and printable three-panel contracts', () => {
    const { host } = usedcar({ ucView: 'walk', ucWalkChecked: walkDone([1, 2, 3]) });
    expect(host.querySelectorAll('[data-ar-usedcar-panel][hidden]')).toHaveLength(2);

    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransitions = reduced.find((rule) =>
      hasSelector(rule, '.ar-usedcar-tab') &&
      hasSelector(rule, '.ar-usedcar-practice') &&
      hasSelector(rule, '.ar-usedcar-flag') &&
      hasSelector(rule, '.ar-usedcar-walk-step')
    );
    const reducedHover = reduced.find((rule) =>
      hasSelector(rule, '.ar-usedcar-practice:hover') &&
      hasSelector(rule, '.ar-usedcar-flag:hover') &&
      hasSelector(rule, '.ar-usedcar-walk-step:hover')
    );
    expect(reducedTransitions.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransitions.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) =>
      hasSelector(rule, '.ar-usedcar-hero') && hasSelector(rule, '.ar-usedcar-walk-step')
    );
    const forcedActive = forced.find((rule) =>
      hasSelector(rule, '.ar-usedcar-tab[data-ar-tab-state="active"]') &&
      hasSelector(rule, '.ar-usedcar-flag[aria-pressed="true"]') &&
      hasSelector(rule, '.ar-usedcar-walk-step[aria-current="step"]')
    );
    const forcedFocus = forced.find((rule) =>
      hasSelector(rule, '.ar-usedcar-tab:focus-visible') &&
      hasSelector(rule, '.ar-usedcar-flag:focus-visible') &&
      hasSelector(rule, '.ar-usedcar-walk-step:focus-visible')
    );
    const forcedFill = ruleForSelector(forced, '.ar-usedcar-progress-fill');
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedBoundary.style.getPropertyPriority('box-shadow')).toBe('important');
    expect(forcedActive.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedFill.style.getPropertyValue('background').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-usedcar-tabs') && hasSelector(rule, '[data-ar-usedcar-print-hide="true"]')
    );
    const revealPanels = ruleForSelector(print, '.ar-usedcar-panel[hidden]');
    const revealFlags = ruleForSelector(print, '.ar-usedcar-print-flags');
    const avoidBreak = print.find((rule) =>
      hasSelector(rule, '.ar-usedcar-practice') &&
      hasSelector(rule, '.ar-usedcar-print-flag') &&
      hasSelector(rule, '.ar-usedcar-walk-step') &&
      /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );
    const printGrid = ruleForSelector(print, '.ar-usedcar-practice-grid');
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(revealPanels.style.getPropertyValue('display')).toBe('block');
    expect(revealPanels.style.getPropertyPriority('display')).toBe('important');
    expect(revealFlags.style.getPropertyValue('display')).toBe('block');
    expect(revealFlags.style.getPropertyPriority('display')).toBe('important');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(printGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(printGrid.style.getPropertyPriority('grid-template-columns')).toBe('important');
    expect(style.textContent).toContain('.ar-usedcar-shell, .ar-usedcar-shell * { color: black !important; }');
  });

  it('preserves authored data, strict completion logic, hooks, syntax, and mirror parity', () => {
    expect(CHECK.redFlags.map((flag) => flag.id)).toEqual([
      'frame-rust',
      'rocker',
      'oil-leaks',
      'milky-oil',
      'trans-fluid',
      'no-cold-start',
      'modifications',
      'no-records',
      'salvage',
      'open-recall'
    ]);
    expect(CHECK.walkaround.map((step) => step.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(CHECK.redFlags.every((flag) =>
      typeof flag.area === 'string' && flag.area.length > 2 &&
      typeof flag.flag === 'string' && flag.flag.length > 10 &&
      typeof flag.what === 'string' && flag.what.length > 20 &&
      typeof flag.ifFound === 'string' && flag.ifFound.length > 20
    )).toBe(true);
    expect(CHECK.walkaround.every((step) => typeof step.do === 'string' && step.do.length > 60)).toBe(true);

    const start = SOURCE.indexOf('function renderUsedCar()');
    const end = SOURCE.indexOf('function renderEv()', start);
    const usedcarSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderUsedCar\(\)/g)).toHaveLength(1);
    expect(usedcarSource).toMatch(/checked\s*\[\s*s\.step\s*\]\s*===\s*true/);
    expect(usedcarSource).not.toContain('Object.keys(checked).filter');
    expect(usedcarSource.match(/awardBadge\('used-car-buyer'/g)).toHaveLength(1);
    expect(usedcarSource).toMatch(/if\s*\(\s*nextValue\s*&&\s*nextDone(?:Count)?\s*===\s*total\s*\)\s*\{?\s*awardBadge\('used-car-buyer'/);
    for (const hook of [
      'data-ar-usedcar-shell',
      'data-ar-usedcar-view',
      'data-ar-usedcar-hero',
      'data-ar-usedcar-tabs',
      'data-ar-usedcar-tab',
      'data-ar-usedcar-panel',
      'data-ar-usedcar-practice',
      'data-ar-usedcar-flag-id',
      'data-ar-usedcar-flag-detail',
      'data-ar-usedcar-flag-detail-state',
      'data-ar-usedcar-walk-progress',
      'data-ar-usedcar-walk-step',
      'data-ar-usedcar-walk-state',
      'data-ar-usedcar-status',
      'data-ar-usedcar-complete'
    ]) expect(usedcarSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
