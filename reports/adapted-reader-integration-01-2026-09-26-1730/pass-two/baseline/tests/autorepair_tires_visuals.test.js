// Auto Repair Shop - Tire Deep Dive dimensional visual, state, and fallback contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_TIRES_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const MODES = ['sizing', 'types', 'rotation', 'replace'];

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
      if (stack.length === 0) return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const SIZE_DECODER = extractAssignedValue(SOURCE, 'TIRE_SIZE_DECODER');
const TYPES = extractAssignedValue(SOURCE, 'TIRE_TYPES');
const ROTATIONS = extractAssignedValue(SOURCE, 'TIRE_ROTATION_PATTERNS');
const REPLACEMENTS = extractAssignedValue(SOURCE, 'TIRE_REPLACEMENT_RULES');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function tires(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'tires' }, extra || {})
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

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Tire Deep Dive dimensional studio', () => {
  it('renders four roving tabs with reciprocal, stable tabpanels in every authored mode', () => {
    for (const mode of MODES) {
      const { html, host } = tires({ tView: mode });
      const shell = host.querySelector('main.ar-tire-shell[data-ar-tire-shell][data-ar-tire-view="' + mode + '"]');
      const hero = shell.querySelector('[data-ar-tire-hero]');
      const tablist = shell.querySelector('.ar-tire-tabs[role="tablist"]');
      const tabs = [...tablist.querySelectorAll('button[data-ar-tire-tab]')];
      const panel = shell.querySelector('[role="tabpanel"][data-ar-tire-panel="' + mode + '"]');

      expect(shell).toBeTruthy();
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expectLabelled(host, hero);
      expect(hero.querySelectorAll('[data-ar-tire-stat]')).toHaveLength(3);
      expect(tabs.map((tab) => tab.dataset.arTireTab)).toEqual(MODES);
      expect(tabs.every((tab) => tab.type === 'button')).toBe(true);
      tabs.forEach((tab) => {
        const active = tab.dataset.arTireTab === mode;
        const stableTabId = 'autorepair-tire-tab-' + tab.dataset.arTireTab;
        const stablePanelId = 'autorepair-tire-panel-' + tab.dataset.arTireTab;
        expect(tab.id).toBe(stableTabId);
        expect(tab.getAttribute('aria-controls')).toBe(stablePanelId);
        expect(tab.getAttribute('aria-selected')).toBe(active ? 'true' : 'false');
        expect(tab.getAttribute('tabindex')).toBe(active ? '0' : '-1');
      });
      expect(panel).toBeTruthy();
      expect(panel.id).toBe('autorepair-tire-panel-' + mode);
      expect(panel.getAttribute('aria-labelledby')).toBe('autorepair-tire-tab-' + mode);
      const panels = [...shell.querySelectorAll('[role="tabpanel"]')];
      expect(panels).toHaveLength(MODES.length);
      expect(panels.filter((candidate) => !candidate.hidden).map((candidate) => candidate.dataset.arTirePanel)).toEqual([mode]);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps a complete, accessible tire assembly and three readouts in every scene mode', () => {
    for (const mode of MODES) {
      const { html, host } = tires({ tView: mode });
      const lab = host.querySelector('section[data-ar-tire-lab]');
      const scene = lab.querySelector('[data-ar-tire-scene][data-ar-tire-mode="' + mode + '"]');
      const svg = scene.querySelector('svg[role="img"]');
      const title = svg.querySelector('title[id]');
      const desc = svg.querySelector('desc[id]');
      const svgLabels = (svg.getAttribute('aria-labelledby') || '').split(/\s+/);
      const svgDescriptions = (svg.getAttribute('aria-describedby') || '').split(/\s+/);
      const readouts = [...lab.querySelectorAll('[data-ar-tire-readout]')];

      expectLabelled(host, lab);
      expect(title.textContent.trim().length).toBeGreaterThan(10);
      expect(desc.textContent.trim().length).toBeGreaterThan(20);
      expect(svgLabels).toContain(title.id);
      expect(svgLabels.includes(desc.id) || svgDescriptions.includes(desc.id)).toBe(true);
      for (const object of ['tire', 'rim', 'tread', 'sidewall', 'rotation-map', 'wear-gauge']) {
        expect(svg.querySelector('[data-ar-tire-object="' + object + '"]')).toBeTruthy();
      }
      expect(readouts).toHaveLength(3);
      expect(readouts.every((readout) => readout.textContent.trim().length > 5)).toBe(true);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('maps every authored tire-size component to a visible decoder part', () => {
    const { html, host } = tires({ tView: 'sizing' });
    const parts = [...host.querySelectorAll('[data-ar-tire-size-part]')];

    expect(parts.map((part) => part.dataset.arTireSizePart)).toEqual(SIZE_DECODER.parts.map((part) => part.code));
    SIZE_DECODER.parts.forEach((part, index) => {
      expect(parts[index].textContent).toContain(part.code);
      expect(parts[index].textContent).toContain(part.name);
      expect(parts[index].textContent).toContain(part.detail);
    });
    expect(host.querySelector('[data-ar-tire-panel="sizing"]').textContent).toContain(SIZE_DECODER.example);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders native tire-type choices and rejects malformed saved selections', () => {
    const defaults = tires({ tView: 'types' });
    const choices = [...defaults.host.querySelectorAll('button[data-ar-tire-type]')];
    expect(choices.map((choice) => choice.dataset.arTireType)).toEqual(TYPES.map((item) => item.type));
    expect(choices.every((choice) => choice.type === 'button')).toBe(true);
    expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toHaveLength(0);

    for (const item of TYPES) {
      const { html, host } = tires({ tView: 'types', tTypePicked: item.type });
      const selected = [...host.querySelectorAll('[data-ar-tire-type][aria-pressed="true"]')];
      expect(selected.map((choice) => choice.dataset.arTireType)).toEqual([item.type]);
      expect(host.querySelector('[data-ar-tire-panel="types"]').textContent).toContain(item.verdict);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    for (const tTypePicked of ['stale tire', ' ', 42, {}, [], null]) {
      const { html, host } = tires({ tView: 'types', tTypePicked });
      expect(host.querySelectorAll('[data-ar-tire-type][aria-pressed="true"]')).toHaveLength(0);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('renders native rotation choices and rejects malformed saved selections', () => {
    const defaults = tires({ tView: 'rotation' });
    const choices = [...defaults.host.querySelectorAll('button[data-ar-tire-rotation]')];
    expect(choices.map((choice) => choice.dataset.arTireRotation)).toEqual(ROTATIONS.map((item) => item.drive));
    expect(choices.every((choice) => choice.type === 'button')).toBe(true);
    expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toHaveLength(0);

    for (const item of ROTATIONS) {
      const { html, host } = tires({ tView: 'rotation', tRotPicked: item.drive });
      const selected = [...host.querySelectorAll('[data-ar-tire-rotation][aria-pressed="true"]')];
      expect(selected.map((choice) => choice.dataset.arTireRotation)).toEqual([item.drive]);
      expect(host.querySelector('[data-ar-tire-panel="rotation"]').textContent).toContain(item.pattern);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    for (const tRotPicked of ['stale pattern', ' ', 42, {}, [], null]) {
      const { html, host } = tires({ tView: 'rotation', tRotPicked });
      expect(host.querySelectorAll('[data-ar-tire-rotation][aria-pressed="true"]')).toHaveLength(0);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('indexes every native replacement choice and strictly bounds restored selection state', () => {
    const defaults = tires({ tView: 'replace' });
    const choices = [...defaults.host.querySelectorAll('button[data-ar-tire-replace]')];
    expect(choices.map((choice) => choice.dataset.arTireReplace)).toEqual(REPLACEMENTS.map((_, index) => String(index)));
    expect(choices.every((choice) => choice.type === 'button')).toBe(true);
    expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toHaveLength(0);

    REPLACEMENTS.forEach((item, index) => {
      const { html, host } = tires({ tView: 'replace', tReplacePicked: index });
      const selected = [...host.querySelectorAll('[data-ar-tire-replace][aria-pressed="true"]')];
      expect(selected.map((choice) => choice.dataset.arTireReplace)).toEqual([String(index)]);
      expect(host.querySelector('[data-ar-tire-panel="replace"]').textContent).toContain(item.verdict);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    });

    for (const tReplacePicked of [-1, REPLACEMENTS.length, 1.5, '1', {}, [], null]) {
      const { html, host } = tires({ tView: 'replace', tReplacePicked });
      expect(host.querySelectorAll('[data-ar-tire-replace][aria-pressed="true"]')).toHaveLength(0);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('clamps stale views and preserves hierarchy, unique IDs, and theme contrast', () => {
    for (const tView of ['stale', ' ', 42, {}, [], null]) {
      const { html, host } = tires({ tView });
      expect(host.querySelector('[data-ar-tire-shell][data-ar-tire-view="sizing"]')).toBeTruthy();
      expect(host.querySelector('[data-ar-tire-tab="sizing"][aria-selected="true"][tabindex="0"]')).toBeTruthy();
      expect(host.querySelector('[data-ar-tire-panel="sizing"]')).toBeTruthy();
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff' }
    ];
    for (const theme of themes) {
      const { html, host } = tires({ tView: 'sizing' }, theme.value);
      const shell = host.querySelector('[data-ar-tire-shell]');
      const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
      expect(shell.getAttribute('style')).toContain('color:' + theme.text);
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(shell.querySelectorAll('svg[role="img"]')).toHaveLength(1);
      expect(shell.querySelectorAll('[data-ar-tire-readout]')).toHaveLength(3);
      expect(new Set(ids).size).toBe(ids.length);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('guards dimensional geometry, responsive layouts, motion, forced colors, and print through CSSOM', () => {
    tires();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const tabs = ruleForSelector(topRules, '.ar-tire-tabs');
    const grid = ruleForSelector(topRules, '.ar-tire-lab-grid');
    const stage = ruleForSelector(topRules, '.ar-tire-stage');
    const frame = ruleForSelector(topRules, '.ar-tire-frame');
    const svg = ruleForSelector(topRules, '.ar-tire-svg');
    const readouts = ruleForSelector(topRules, '.ar-tire-readouts');
    const tab = ruleForSelector(topRules, '.ar-tire-tab');

    expect(tabs.style.getPropertyValue('grid-template-columns')).toContain('repeat(4');
    expect(grid.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(stage.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(380);
    expect(stage.style.getPropertyValue('perspective')).toBe('1100px');
    expect(frame.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(frame.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(svg.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(350);
    expect(readouts.style.getPropertyValue('display')).toBe('grid');
    expect(readouts.style.getPropertyValue('align-content')).toBe('stretch');
    expect(parseFloat(tab.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    for (const selector of ['.ar-tire-type', '.ar-tire-rotation', '.ar-tire-replace']) {
      expect(parseFloat(ruleForSelector(topRules, selector).style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    }

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-tire-lab-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-tire-readouts').style.getPropertyValue('grid-template-columns')).toContain('repeat(3');

    const mobile = rulesForMedia(topRules, /max-width:\s*620px/i);
    expect(ruleForSelector(mobile, '.ar-tire-tabs').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(mobile, '.ar-tire-readouts').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(mobile, '.ar-tire-stage').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(300);

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedAnimation = reduced.find((rule) => /\.ar-tire-/.test(rule.selectorText || '') && rule.style.getPropertyValue('animation') === 'none');
    const reducedTransition = reduced.find((rule) => /\.ar-tire-/.test(rule.selectorText || '') && rule.style.getPropertyValue('transition') === 'none');
    expect(reducedAnimation).toBeTruthy();
    expect(reducedAnimation.style.getPropertyPriority('animation')).toBe('important');
    expect(reducedTransition).toBeTruthy();
    expect(reducedTransition.style.getPropertyPriority('transition')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => /\.ar-tire-(?:lab|stage|tab|type|rotation|replace)/.test(rule.selectorText || '') && /canvastext/i.test(rule.style.getPropertyValue('border')));
    const forcedActive = forced.find((rule) => /\.ar-tire-/.test(rule.selectorText || '') && /highlight/i.test(rule.style.getPropertyValue('outline')));
    const forcedSvg = forced.find((rule) => /\.ar-tire-/.test(rule.selectorText || '') && /canvas/i.test(rule.style.getPropertyValue('fill')));
    expect(forcedBoundary).toBeTruthy();
    expect(forcedActive).toBeTruthy();
    expect(forcedSvg).toBeTruthy();

    const print = rulesForMedia(topRules, /^print$/i);
    const printTabs = ruleForSelector(print, '.ar-tire-tabs');
    const printFrame = ruleForSelector(print, '.ar-tire-frame');
    const printPseudo = print.find((rule) => hasSelector(rule, '.ar-tire-stage::before') || hasSelector(rule, '.ar-tire-stage::after'));
    const printBreak = print.find((rule) => /\.ar-tire-(?:lab|stage-card|choice)/.test(rule.selectorText || '') && /(?:break-inside|page-break-inside)/.test(rule.cssText));
    expect(printTabs.style.getPropertyValue('display')).toBe('none');
    expect(printTabs.style.getPropertyPriority('display')).toBe('important');
    expect(printFrame.style.getPropertyValue('transform')).toBe('none');
    expect(printPseudo.style.getPropertyValue('display')).toBe('none');
    expect(printBreak.cssText).toMatch(/(?:break-inside|page-break-inside):\s*avoid/);
  });

  it('preserves strict state guards, visual hooks, syntax, and desktop mirror parity', () => {
    expect(SIZE_DECODER.parts).toHaveLength(7);
    expect(TYPES).toHaveLength(5);
    expect(ROTATIONS).toHaveLength(4);
    expect(REPLACEMENTS).toHaveLength(7);

    const start = SOURCE.indexOf('function renderTires()');
    const end = SOURCE.indexOf('function renderWalkAround()', start);
    const tireSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderTires\(\)/g)).toHaveLength(1);
    expect(tireSource).toMatch(/typeof d\.tView === ['"]string['"]/);
    expect(tireSource).toMatch(/TIRE_(?:VIEW|TAB)_IDS\.indexOf\([^)]*\)\s*>=\s*0/);
    expect(tireSource).toMatch(/typeof d\.tTypePicked === ['"]string['"]/);
    expect(tireSource).toMatch(/TIRE_TYPES\.(?:some|find)\(/);
    expect(tireSource).toMatch(/typeof d\.tRotPicked === ['"]string['"]/);
    expect(tireSource).toMatch(/TIRE_ROTATION_PATTERNS\.(?:some|find)\(/);
    expect(tireSource).toContain('Number.isInteger(d.tReplacePicked)');
    expect(tireSource).toMatch(/[A-Za-z_$][\w$]*\s*>=\s*0/);
    expect(tireSource).toMatch(/[A-Za-z_$][\w$]*\s*<\s*TIRE_REPLACEMENT_RULES\.length/);
    for (const hook of [
      'data-ar-tire-shell',
      'data-ar-tire-view',
      'data-ar-tire-hero',
      'data-ar-tire-stat',
      'data-ar-tire-tab',
      'data-ar-tire-panel',
      'data-ar-tire-lab',
      'data-ar-tire-scene',
      'data-ar-tire-mode',
      'data-ar-tire-object',
      'data-ar-tire-readout',
      'data-ar-tire-size-part',
      'data-ar-tire-type',
      'data-ar-tire-rotation',
      'data-ar-tire-replace'
    ]) expect(tireSource).toContain(hook);
    for (const className of ['ar-tire-tabs', 'ar-tire-lab-grid', 'ar-tire-stage', 'ar-tire-frame', 'ar-tire-svg']) {
      expect(tireSource).toContain(className);
    }
    expect(tireSource).not.toMatch(/\b(?:THREE|WebGLRenderer|canvas\.getContext)\b/);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
