// Auto Repair Shop - Maine Inspection visual, state, accessibility, and print contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_INSPECTION_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');

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

const ITEMS = extractAssignedValue(SOURCE, 'INSPECTION_ITEMS');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function inspection(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'inspection' }, extra || {})
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

function checkedFor(ids, extras) {
  const checked = Object.assign({}, extras || {});
  ids.forEach((id) => { checked[id] = true; });
  return checked;
}

function expectProgress(host, now) {
  const progress = host.querySelector('[data-ar-inspection-progressbar][role="progressbar"]');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe(String(ITEMS.length));
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of ' + ITEMS.length);
  expect(parseFloat(progress.querySelector('.ar-inspection-progress-fill').style.width)).toBeCloseTo((now / ITEMS.length) * 100, 1);
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Maine Inspection visual workbench', () => {
  it('renders one labelled eight-area workbench with stable default and print content', () => {
    const { html, host } = inspection();
    const shell = host.querySelector('main.ar-inspection-shell[data-ar-inspection-selection="empty"][data-ar-inspection-progress="empty"]');
    const hero = shell.querySelector('[data-ar-inspection-hero]');
    const catalog = shell.querySelector('[data-ar-inspection-catalog]');
    const detail = shell.querySelector('article#autorepair-inspection-detail[data-ar-inspection-detail]');
    const reality = shell.querySelector('aside[data-ar-inspection-reality]');
    const choices = [...shell.querySelectorAll('button[data-ar-inspection-item-id]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Inspection prep navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expectLabelled(host, catalog);
    expectLabelled(host, detail);
    expectLabelled(host, reality);
    expect([...hero.querySelectorAll('[data-ar-inspection-stat]')].map((stat) => stat.textContent)).toEqual([
      '8inspection areas', '0self-checked', '8remaining'
    ]);
    expect(choices.map((choice) => choice.dataset.arInspectionItemId)).toEqual(ITEMS.map((item) => item.id));
    expect(choices.every((choice) =>
      choice.type === 'button' &&
      choice.getAttribute('aria-pressed') === 'false' &&
      choice.getAttribute('aria-expanded') === 'false' &&
      choice.dataset.arInspectionItemState === 'todo'
    )).toBe(true);
    expect(detail.dataset.arInspectionDetailState).toBe('empty');
    expectProgress(shell, 0);
    expect(shell.querySelector('[data-ar-inspection-complete]')).toBeNull();
    expect([...shell.querySelectorAll('[data-ar-inspection-print-item]')].map((item) => item.dataset.arInspectionPrintItem)).toEqual(ITEMS.map((item) => item.id));
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders every authored area with one selected control and complete detail', () => {
    for (const item of ITEMS) {
      const { html, host } = inspection({ inspectionPicked: item.id });
      const shell = host.querySelector('[data-ar-inspection-shell][data-ar-inspection-selection="active"]');
      const choices = [...shell.querySelectorAll('button[data-ar-inspection-item-id]')];
      const selected = shell.querySelector('[data-ar-inspection-item-id="' + item.id + '"]');
      const detail = shell.querySelector('#autorepair-inspection-detail[data-ar-inspection-detail-state="active"]');
      const action = detail.querySelector('[data-ar-inspection-check-action="' + item.id + '"]');

      expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toEqual([selected]);
      expect(selected.type).toBe('button');
      expect(selected.dataset.arOptionState).toBe('active');
      expect(selected.dataset.arInspectionItemState).toBe('viewing');
      expect(selected.getAttribute('aria-expanded')).toBe('true');
      expect(selected.getAttribute('aria-controls')).toBe(detail.id);
      expect(selected.getAttribute('aria-label')).toContain(item.area);
      expect(selected.getAttribute('aria-label')).toContain('viewing');
      expect(selected.textContent).toContain('Viewing guide');
      for (const value of [item.area, item.whatTheyCheck, item.commonFails, item.diy, item.shop, item.tip]) {
        expect(detail.textContent).toContain(value);
      }
      expect(action.type).toBe('button');
      expect(action.getAttribute('aria-pressed')).toBe('false');
      expectLabelled(host, detail);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('renders bounded empty, partial, and complete progress from exact authored keys', () => {
    const empty = inspection();
    expectProgress(empty.host, 0);

    const partialChecked = checkedFor([ITEMS[0].id, ITEMS[1].id], {
      ghost: true,
      [ITEMS[2].id]: 1,
      [ITEMS[3].id]: 'true'
    });
    const partial = inspection({ inspectionPicked: ITEMS[0].id, inspectionChecked: partialChecked });
    const partialShell = partial.host.querySelector('[data-ar-inspection-progress="in-progress"]');
    expectProgress(partialShell, 2);
    expect([...partialShell.querySelectorAll('[data-ar-inspection-item-state="checked"]')].map((item) => item.dataset.arInspectionItemId)).toEqual([ITEMS[1].id]);
    expect(partialShell.querySelector('[data-ar-inspection-item-id="' + ITEMS[0].id + '"]').dataset.arInspectionItemState).toBe('viewing');
    expect(partialShell.querySelector('[data-ar-inspection-check-action]').getAttribute('aria-pressed')).toBe('true');
    expect(partialShell.querySelector('[data-ar-inspection-complete]')).toBeNull();

    const allIds = ITEMS.map((item) => item.id);
    const complete = inspection({ inspectionChecked: checkedFor(allIds, { ghost: true }) });
    const completeShell = complete.host.querySelector('[data-ar-inspection-progress="complete"]');
    expectProgress(completeShell, ITEMS.length);
    expect(completeShell.querySelectorAll('[data-ar-inspection-item-state="checked"]')).toHaveLength(ITEMS.length);
    expect(completeShell.querySelector('[data-ar-inspection-complete][role="status"]')).toBeTruthy();
  });

  it('clamps malformed selections and checklist containers to safe empty state', () => {
    for (const inspectionPicked of ['retired-area', ' ', 42, { id: 'brakes' }, ['brakes'], null]) {
      const { html, host } = inspection({ inspectionPicked });
      const shell = host.querySelector('[data-ar-inspection-shell][data-ar-inspection-selection="empty"]');
      expect(shell.querySelectorAll('[data-ar-inspection-item-id][aria-pressed="true"]')).toHaveLength(0);
      expect(shell.querySelector('[data-ar-inspection-detail]').dataset.arInspectionDetailState).toBe('empty');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
    for (const inspectionChecked of [null, 'brakes', 42, ['brakes'], { length: 8 }, { ghost: true, brakes: 1, lights: 'true' }]) {
      const { html, host } = inspection({ inspectionChecked });
      expectProgress(host, 0);
      expect(host.querySelectorAll('[data-ar-inspection-item-state="checked"]')).toHaveLength(0);
      expect(host.querySelector('[data-ar-inspection-complete]')).toBeNull();
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('preserves hierarchy, progress, and strong-fill contrast across all themes', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];
    const allIds = ITEMS.map((item) => item.id);
    const states = [
      {},
      { inspectionPicked: ITEMS[0].id },
      { inspectionChecked: checkedFor(allIds.slice(0, 3)) },
      { inspectionPicked: ITEMS[0].id, inspectionChecked: checkedFor([ITEMS[0].id]) },
      { inspectionChecked: checkedFor(allIds) },
      { inspectionPicked: { stale: true }, inspectionChecked: { ghost: true } }
    ];

    for (const theme of themes) {
      for (const state of states) {
        const { html, host } = inspection(state, theme.value);
        const shell = host.querySelector('[data-ar-inspection-shell]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
        const selected = [...shell.querySelectorAll('[data-ar-inspection-item-id][aria-pressed="true"]')];
        const progress = shell.querySelector('[data-ar-inspection-progressbar]');

        expect(shell.getAttribute('style')).toContain('color:' + theme.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(shell.querySelectorAll('[data-ar-inspection-item-id]')).toHaveLength(ITEMS.length);
        expect(shell.querySelectorAll('[data-ar-inspection-print-item]')).toHaveLength(ITEMS.length);
        expect(selected.length).toBeLessThanOrEqual(1);
        if (selected.length) expect(selected[0].getAttribute('style')).toContain('color:' + theme.strong);
        expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);
        expect(Number(progress.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(ITEMS.length);
        expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
        expect(new Set(ids).size).toBe(ids.length);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards desktop layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    inspection({ inspectionPicked: ITEMS[0].id });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-inspection-hero');
    const layout = ruleForSelector(topRules, '.ar-inspection-layout');
    const grid = ruleForSelector(topRules, '.ar-inspection-grid');
    const detailGrid = ruleForSelector(topRules, '.ar-inspection-detail-grid');
    const wrapping = topRules.find((rule) => hasSelector(rule, '.ar-inspection-catalog') && hasSelector(rule, '.ar-inspection-detail'));
    const touch = ruleForSelector(topRules, '.ar-inspection-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(layout.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(grid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(detailGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(wrapping.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(medium, '.ar-inspection-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-inspection-layout').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-inspection-detail').style.getPropertyValue('position')).toBe('static');

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    expect(ruleForSelector(small, '.ar-inspection-hero-stats').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    const smallGrids = small.find((rule) => hasSelector(rule, '.ar-inspection-grid') && hasSelector(rule, '.ar-inspection-detail-grid'));
    expect(smallGrids.style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(small, '.ar-inspection-detail-block[data-ar-inspection-span=full]').style.getPropertyValue('grid-column')).toBe('auto');
  });

  it('guards reduced-motion, forced-color, and complete print contracts', () => {
    inspection({ inspectionPicked: ITEMS[0].id, inspectionChecked: checkedFor([ITEMS[0].id]) });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransitions = reduced.find((rule) => hasSelector(rule, '.ar-inspection-progress-fill') && hasSelector(rule, '.ar-inspection-item'));
    const reducedHover = ruleForSelector(reduced, '.ar-inspection-item:hover');
    expect(reducedTransitions.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransitions.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => hasSelector(rule, '.ar-inspection-hero') && hasSelector(rule, '.ar-inspection-detail'));
    const forcedActive = forced.find((rule) =>
      hasSelector(rule, '.ar-inspection-item[data-ar-option-state=active]') &&
      hasSelector(rule, '.ar-inspection-check-action[aria-pressed=true]')
    );
    const forcedFocus = forced.find((rule) =>
      hasSelector(rule, '.ar-inspection-item:focus-visible') &&
      hasSelector(rule, '.ar-inspection-check-action:focus-visible')
    );
    const forcedFill = forced.find((rule) => hasSelector(rule, '.ar-inspection-progress-fill') && hasSelector(rule, '.ar-inspection-detail-icon'));
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedActive.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedFill.style.getPropertyValue('background').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-inspection-shell [role=navigation]') &&
      hasSelector(rule, '.ar-inspection-progress-card') &&
      hasSelector(rule, '.ar-inspection-layout')
    );
    const printGuide = ruleForSelector(print, '.ar-inspection-print-guide');
    const avoidBreak = print.find((rule) =>
      hasSelector(rule, '.ar-inspection-print-item') &&
      hasSelector(rule, '.ar-inspection-reality') &&
      /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );
    const printGrid = ruleForSelector(print, '.ar-inspection-print-grid');
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printGuide.style.getPropertyValue('display')).toBe('block');
    expect(printGuide.style.getPropertyPriority('display')).toBe('important');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(printGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(printGrid.style.getPropertyPriority('grid-template-columns')).toBe('important');
    expect(style.textContent).toContain('.ar-inspection-shell, .ar-inspection-shell * { color: black !important; }');
  });

  it('preserves authored inventory, strict reward logic, hooks, syntax, and mirror parity', () => {
    expect(ITEMS.map((item) => item.id)).toEqual([
      'brakes',
      'lights',
      'tires',
      'frame-body',
      'exhaust',
      'wipers-glass',
      'horn-mirrors',
      'suspension-steering'
    ]);
    expect(ITEMS.every((item) =>
      typeof item.icon === 'string' && item.icon.length > 0 &&
      typeof item.area === 'string' && item.area.length > 3 &&
      typeof item.whatTheyCheck === 'string' && item.whatTheyCheck.length > 50 &&
      typeof item.commonFails === 'string' && item.commonFails.length > 25 &&
      typeof item.diy === 'string' && item.diy.length > 20 &&
      typeof item.shop === 'string' && item.shop.length > 20 &&
      typeof item.tip === 'string' && item.tip.length > 50
    )).toBe(true);

    const start = SOURCE.indexOf('function renderInspection()');
    const end = SOURCE.indexOf('function renderUsedCarLegacy()', start);
    const inspectionSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderInspection\(\)/g)).toHaveLength(1);
    expect(inspectionSource).toMatch(/typeof d\.inspectionPicked === ['"]string['"]/);
    expect(inspectionSource).toContain("typeof d.inspectionChecked === 'object'");
    expect(inspectionSource).toContain('!Array.isArray(d.inspectionChecked)');
    expect(inspectionSource).toMatch(/checkedSource\[item\.id\]\s*===\s*true/);
    expect(inspectionSource).not.toContain('Object.keys(checked)');
    expect(inspectionSource.match(/awardBadge\('inspection-prep'/g)).toHaveLength(1);
    expect(inspectionSource).toMatch(/if\s*\(\s*nextValue\s*&&\s*nextDone\s*===\s*totalCount\s*\)\s*awardBadge\('inspection-prep'/);
    expect(inspectionSource).not.toContain("color: sel ? '#0f172a'");
    for (const hook of [
      'data-ar-inspection-shell',
      'data-ar-inspection-selection',
      'data-ar-inspection-progress',
      'data-ar-inspection-hero',
      'data-ar-inspection-stat',
      'data-ar-inspection-progress-card',
      'data-ar-inspection-progressbar',
      'data-ar-inspection-catalog',
      'data-ar-inspection-item-id',
      'data-ar-inspection-item-state',
      'data-ar-inspection-detail',
      'data-ar-inspection-detail-state',
      'data-ar-inspection-check-action',
      'data-ar-inspection-complete',
      'data-ar-inspection-reality',
      'data-ar-inspection-print-guide',
      'data-ar-inspection-print-item'
    ]) expect(inspectionSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
