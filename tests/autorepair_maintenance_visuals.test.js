// Auto Repair Shop - Maintenance Planner dimensional service-bay, state, and fallback contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_MAINTENANCE_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const EXPECTED_ITEMS = [
  'Engine oil + filter',
  'Tire rotation',
  'Tire pressure check',
  'Cabin air filter',
  'Engine air filter',
  'Brake fluid flush',
  'Transmission fluid (drain + fill)',
  'Coolant flush',
  'Spark plugs (iridium)',
  'Spark plugs (copper)',
  'Timing belt (if equipped)',
  'Battery test',
  'Wiper blades',
  'Maine state inspection',
  'Serpentine belt',
  'Fuel filter (in-tank)',
  'Wheel alignment'
];
const OBJECTS = ['vehicle', 'lift', 'odometer', 'service-lane', 'warning-lights'];
const STATES = ['review', 'soon', 'reference'];
const FILTERS = ['all', ...STATES];

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

const INTERVALS = extractAssignedValue(SOURCE, 'MAINT_INTERVALS');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function maintenance(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'maint' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function expectLabelled(host, region) {
  expect(region).toBeTruthy();
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId).toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
}

function labelFor(form, input) {
  if (input.id) {
    const explicit = [...form.querySelectorAll('label[for]')]
      .find((label) => label.getAttribute('for') === input.id);
    if (explicit) return explicit;
  }
  return input.closest('label');
}

function inputMatching(form, pattern) {
  return [...form.querySelectorAll('input')].find((input) => {
    const label = labelFor(form, input);
    return pattern.test((label?.textContent || '') + ' ' + (input.getAttribute('aria-label') || ''));
  });
}

function visibleItems(host) {
  return [...host.querySelectorAll('button[data-ar-maint-item]')]
    .filter((item) => !item.hidden && item.getAttribute('aria-hidden') !== 'true');
}

function itemFor(host, id) {
  return host.querySelector('button[data-ar-maint-item="' + id + '"]');
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

function expectCleanMarkup(html) {
  expect(html).not.toMatch(/\b(?:undefined|NaN|Infinity)\b|\[object Object\]/);
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Maintenance Planner dimensional service bay', () => {
  it('renders a labelled empty service bay, form, SVG scene, and all required vehicle objects', () => {
    const { html, host } = maintenance();
    const shell = host.querySelector('main.ar-maint-shell[data-ar-maint-shell][data-ar-maint-state="empty"]');
    const hero = shell.querySelector('[data-ar-maint-hero]');
    const form = shell.querySelector('form[data-ar-maint-form]');
    const scene = shell.querySelector('[data-ar-maint-scene]');
    const svg = scene.querySelector('svg[role="img"]');
    const title = svg.querySelector('title[id]');
    const desc = svg.querySelector('desc[id]');
    const labelledBy = (svg.getAttribute('aria-labelledby') || '').split(/\s+/);
    const describedBy = (svg.getAttribute('aria-describedby') || '').split(/\s+/);
    const inputs = [...form.querySelectorAll('input[type="number"]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expectLabelled(host, hero);
    expectLabelled(host, form);
    expect(title.textContent.trim().length).toBeGreaterThan(10);
    expect(desc.textContent.trim().length).toBeGreaterThan(20);
    expect(labelledBy).toContain(title.id);
    expect(labelledBy.includes(desc.id) || describedBy.includes(desc.id)).toBe(true);
    for (const object of OBJECTS) {
      expect(svg.querySelector('[data-ar-maint-object="' + object + '"]')).toBeTruthy();
    }
    expect(inputs).toHaveLength(3);
    for (const input of inputs) {
      expect(input.id).toBeTruthy();
      expect(labelFor(form, input)).toBeTruthy();
      expect(input.step).toBe('1');
      expect(input.min).not.toBe('');
      expect(input.max).not.toBe('');
      expect(Number.isFinite(Number(input.min))).toBe(true);
      expect(Number.isFinite(Number(input.max))).toBe(true);
      const describedIds = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      expect(describedIds.length).toBeGreaterThan(0);
      expect(describedIds.every((id) => host.querySelector('#' + id))).toBe(true);
    }
    expect(shell.querySelector('[data-ar-maint-list]')).toBeNull();
    expect(shell.querySelector('[data-ar-maint-detail]')).toBeNull();
    expectCleanMarkup(html);
    expect(html).not.toMatch(/\boverdue\b/i);
  });

  it('preserves all 17 authored intervals, stable IDs, priority states, buckets, and conditional guidance', () => {
    expect(INTERVALS).toHaveLength(17);
    expect(INTERVALS.map((entry) => entry.item)).toEqual(EXPECTED_ITEMS);
    const ids = INTERVALS.map((entry) => entry.id);
    expect(ids.every((id) => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(INTERVALS.every((entry) => Number.isInteger(entry.miles) && entry.miles >= 0)).toBe(true);
    expect(INTERVALS.every((entry) => Number.isInteger(entry.months) && entry.months >= 0)).toBe(true);
    expect(INTERVALS.every((entry) => typeof entry.note === 'string' && entry.note.length > 10)).toBe(true);

    const { html, host } = maintenance({ maintMiles: 99000, maintMonths: 11, maintYear: 2015 });
    const shell = host.querySelector('[data-ar-maint-shell][data-ar-maint-state="ready"]');
    const summary = shell.querySelector('[data-ar-maint-summary]');
    const list = shell.querySelector('[data-ar-maint-list]');
    const items = visibleItems(shell);
    const buckets = [...summary.querySelectorAll('[data-ar-maint-bucket]')];

    expectLabelled(host, summary);
    expectLabelled(host, list);
    expect(items).toHaveLength(INTERVALS.length);
    expect(items.map((item) => item.dataset.arMaintItem).sort()).toEqual([...ids].sort());
    expect(buckets.map((bucket) => bucket.dataset.arMaintBucket)).toEqual(STATES);
    const counts = Object.fromEntries(STATES.map((state) => [
      state,
      items.filter((item) => item.dataset.arMaintItemState === state).length
    ]));
    expect(Object.values(counts).every((count) => count > 0)).toBe(true);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(INTERVALS.length);
    for (const bucket of buckets) {
      expect(bucket.textContent).toContain(String(counts[bucket.dataset.arMaintBucket]));
    }
    for (const entry of INTERVALS) {
      const item = itemFor(shell, entry.id);
      expect(item.textContent).toContain(entry.item);
      expect(STATES).toContain(item.dataset.arMaintItemState);
      expect(item.type).toBe('button');
    }

    const conditional = INTERVALS.filter((entry) =>
      /spark plugs|timing belt|fuel filter/i.test(entry.item)
    );
    expect(conditional).toHaveLength(4);
    for (const entry of conditional) {
      const item = itemFor(shell, entry.id);
      const marker = item.matches('[data-ar-maint-conditional]')
        ? item
        : item.querySelector('[data-ar-maint-conditional]');
      expect(marker).toBeTruthy();
      expect(marker.textContent).toMatch(/verify|equipped|spec|type/i);
    }
    expectCleanMarkup(html);
    expect(html).not.toMatch(/\boverdue\b/i);
  });

  it('distinguishes empty, invalid, and ready state while strictly preserving valid zero', () => {
    for (const extra of [{}, { maintMiles: '', maintMonths: '', maintYear: '' }, { maintYear: 2019 }]) {
      const { html, host } = maintenance(extra);
      expect(host.querySelector('[data-ar-maint-shell]').dataset.arMaintState).toBe('empty');
      expect(host.querySelector('[data-ar-maint-list]')).toBeNull();
      expectCleanMarkup(html);
    }

    const zero = maintenance({ maintMiles: 0, maintMonths: 0, maintYear: new Date().getFullYear() });
    const zeroShell = zero.host.querySelector('[data-ar-maint-shell]');
    const zeroForm = zeroShell.querySelector('[data-ar-maint-form]');
    expect(zeroShell.dataset.arMaintState).toBe('ready');
    expect(inputMatching(zeroForm, /odometer|mileage/i).value).toBe('0');
    expect(inputMatching(zeroForm, /months/i).value).toBe('0');
    expect(zeroShell.querySelector('[data-ar-maint-list]')).toBeTruthy();
    expectCleanMarkup(zero.html);

    const emptyForm = maintenance().host.querySelector('[data-ar-maint-form]');
    const mileageInput = inputMatching(emptyForm, /odometer|mileage/i);
    const monthsInput = inputMatching(emptyForm, /months/i);
    const yearInput = inputMatching(emptyForm, /year/i);
    const malformed = [
      { maintMiles: -1, maintMonths: 6 },
      { maintMiles: Number(mileageInput.max) + 1, maintMonths: 6 },
      { maintMiles: 1.5, maintMonths: 6 },
      { maintMiles: '85000junk', maintMonths: 6 },
      { maintMiles: {}, maintMonths: 6 },
      { maintMiles: [], maintMonths: 6 },
      { maintMiles: 85000, maintMonths: -1 },
      { maintMiles: 85000, maintMonths: Number(monthsInput.max) + 1 },
      { maintMiles: 85000, maintMonths: 1.5 },
      { maintMiles: 85000, maintMonths: '6months' },
      { maintMiles: 85000, maintYear: Number(yearInput.min) - 1 },
      { maintMiles: 85000, maintYear: Number(yearInput.max) + 1 },
      { maintMiles: 85000, maintYear: '2015model' },
      { maintMiles: Infinity, maintMonths: 6 },
      { maintMiles: NaN, maintMonths: 6 }
    ];
    for (const extra of malformed) {
      const { html, host } = maintenance(extra);
      const shell = host.querySelector('[data-ar-maint-shell]');
      const alert = shell.querySelector('[data-ar-maint-form] [role="alert"]');
      expect(shell.dataset.arMaintState).toBe('invalid');
      expect(alert).toBeTruthy();
      expect(alert.textContent.trim().length).toBeGreaterThan(5);
      expect(shell.querySelector('[data-ar-maint-list]')).toBeNull();
      expectCleanMarkup(html);
    }
  });

  it('keeps mileage and time evidence independent and resolves exact milestones without contradiction', () => {
    const timing = INTERVALS.find((entry) => entry.item === 'Timing belt (if equipped)');
    const brakes = INTERVALS.find((entry) => entry.item === 'Brake fluid flush');
    const coolant = INTERVALS.find((entry) => entry.item === 'Coolant flush');

    const mileageOnly = maintenance({ maintMiles: 100000, maintFocus: timing.id });
    const mileageItem = itemFor(mileageOnly.host, timing.id);
    const mileageDetail = mileageOnly.host.querySelector('[data-ar-maint-detail]');
    expect(mileageItem.dataset.arMaintItemState).toBe('review');
    expect(mileageDetail.querySelector('[data-ar-maint-basis="mileage"]')).toBeTruthy();
    expect(mileageDetail.textContent).toMatch(/current mileage milestone|0 miles/i);
    expect(mileageDetail.textContent).not.toMatch(/100,?000 miles to next/i);
    expect(mileageOnly.html).not.toMatch(/\boverdue\b/i);

    const timeOnly = maintenance({ maintMonths: 36, maintFocus: brakes.id });
    const timeDetail = timeOnly.host.querySelector('[data-ar-maint-detail]');
    expect(timeOnly.host.querySelector('[data-ar-maint-shell]').dataset.arMaintState).toBe('ready');
    expect(itemFor(timeOnly.host, brakes.id).dataset.arMaintItemState).toBe('review');
    expect(timeDetail.querySelector('[data-ar-maint-basis="time"]')).toBeTruthy();
    expect(timeDetail.querySelector('[data-ar-maint-basis="mileage"]')).toBeNull();

    const dual = maintenance({ maintMiles: 60000, maintMonths: 60, maintFocus: coolant.id });
    const dualDetail = dual.host.querySelector('[data-ar-maint-detail]');
    const bases = [...dualDetail.querySelectorAll('[data-ar-maint-basis]')]
      .map((basis) => basis.dataset.arMaintBasis);
    expect(bases).toContain('mileage');
    expect(bases).toContain('time');
    expect(itemFor(dual.host, coolant.id).dataset.arMaintItemState).toBe('review');
    for (const render of [mileageOnly, timeOnly, dual]) expectCleanMarkup(render.html);
  });

  it('filters all, review, soon, and reference lanes without losing authored items', () => {
    const baseline = maintenance({ maintMiles: 99000, maintMonths: 11 });
    const baselineItems = visibleItems(baseline.host);
    const counts = Object.fromEntries(STATES.map((state) => [
      state,
      baselineItems.filter((item) => item.dataset.arMaintItemState === state).length
    ]));
    expect(baselineItems).toHaveLength(INTERVALS.length);
    expect(Object.values(counts).every((count) => count > 0)).toBe(true);

    for (const filter of FILTERS) {
      const { html, host } = maintenance({ maintMiles: 99000, maintMonths: 11, maintFilter: filter });
      const controls = [...host.querySelectorAll('button[data-ar-maint-filter]')];
      const selected = controls.filter((button) => button.getAttribute('aria-pressed') === 'true');
      const authoredItems = [...host.querySelectorAll('button[data-ar-maint-item]')];
      const items = visibleItems(host);
      expect(controls.map((button) => button.dataset.arMaintFilter)).toEqual(FILTERS);
      expect(controls.every((button) => button.type === 'button')).toBe(true);
      expect(selected.map((button) => button.dataset.arMaintFilter)).toEqual([filter]);
      expect(authoredItems).toHaveLength(INTERVALS.length);
      expect(items).toHaveLength(filter === 'all' ? INTERVALS.length : counts[filter]);
      if (filter !== 'all') {
        expect(items.every((item) => item.dataset.arMaintItemState === filter)).toBe(true);
      }
      expectCleanMarkup(html);
    }

    for (const maintFilter of ['overdue', ' ', 42, {}, [], null]) {
      const { html, host } = maintenance({ maintMiles: 99000, maintMonths: 11, maintFilter });
      const selected = [...host.querySelectorAll('[data-ar-maint-filter][aria-pressed="true"]')];
      expect(selected.map((button) => button.dataset.arMaintFilter)).toEqual(['all']);
      expect(visibleItems(host)).toHaveLength(INTERVALS.length);
      expectCleanMarkup(html);
    }
  });

  it('whitelists focused item IDs and keeps detail, authored notes, and Service Log action reciprocal', () => {
    const seed = { maintMiles: 99000, maintMonths: 11 };
    for (const entry of INTERVALS) {
      const { html, host } = maintenance({ ...seed, maintFocus: entry.id });
      const item = itemFor(host, entry.id);
      const detail = host.querySelector('[data-ar-maint-detail]');
      const selected = [...host.querySelectorAll('[data-ar-maint-item][aria-pressed="true"]')];
      const action = detail.querySelector('button[data-ar-maint-service-log-action]');

      expect(selected.map((button) => button.dataset.arMaintItem)).toEqual([entry.id]);
      expect(item.getAttribute('aria-controls')).toBe(detail.id);
      expectLabelled(host, detail);
      expect(detail.textContent).toContain(entry.item);
      expect(detail.textContent).toContain(entry.note);
      expect(action).toBeTruthy();
      expect(action.type).toBe('button');
      expect(action.textContent).toMatch(/record|service log/i);
      expectCleanMarkup(html);
    }

    for (const maintFocus of ['missing-item', ' ', 3, {}, [], null]) {
      const { html, host } = maintenance({ ...seed, maintFocus });
      const selected = [...host.querySelectorAll('[data-ar-maint-item][aria-pressed="true"]')];
      const bestPriority = Math.min(...selected.map((item) => STATES.indexOf(item.dataset.arMaintItemState)));
      expect(selected).toHaveLength(1);
      expect(bestPriority).toBe(0);
      expect(INTERVALS.map((entry) => entry.id)).toContain(selected[0].dataset.arMaintItem);
      expectCleanMarkup(html);
    }
  });

  it('uses semantic lists, visible status text, unique relationships, and complete controls in every theme', () => {
    const themes = [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ];
    const visibleState = {
      review: /review now/i,
      soon: /coming up/i,
      reference: /reference/i
    };

    for (const theme of themes) {
      const { html, host } = maintenance({ maintMiles: 99000, maintMonths: 11 }, theme);
      const shell = host.querySelector('[data-ar-maint-shell]');
      const list = shell.querySelector('ol[data-ar-maint-list], ul[data-ar-maint-list]');
      const items = visibleItems(shell);
      const detail = shell.querySelector('[data-ar-maint-detail]');
      const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);

      expect(shell.dataset.arMaintState).toBe('ready');
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(list).toBeTruthy();
      expect(items).toHaveLength(INTERVALS.length);
      expect(new Set(ids).size).toBe(ids.length);
      expect(detail.getAttribute('aria-live')).toBe('polite');
      for (const item of items) {
        expect(item.closest('li')).toBeTruthy();
        expect(item.textContent).toMatch(visibleState[item.dataset.arMaintItemState]);
        expect(item.getAttribute('aria-controls')).toBe(detail.id);
        expect(item.getAttribute('aria-pressed')).toMatch(/^(?:true|false)$/);
      }
      for (const button of shell.querySelectorAll('button')) expect(button.type).toBe('button');
      expectCleanMarkup(html);
      expect(html).not.toMatch(/\boverdue\b/i);
    }
  });

  it('guards service-bay perspective, touch targets, and responsive layouts through CSSOM', () => {
    maintenance();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const layout = ruleForSelector(topRules, '.ar-maint-layout');
    const scene = ruleForSelector(topRules, '.ar-maint-scene');
    const frame = ruleForSelector(topRules, '.ar-maint-scene-frame');
    const svg = ruleForSelector(topRules, '.ar-maint-svg');
    const item = ruleForSelector(topRules, '.ar-maint-item');
    const filter = ruleForSelector(topRules, '.ar-maint-filter');

    expect(layout).toBeTruthy();
    expect(scene).toBeTruthy();
    expect(frame).toBeTruthy();
    expect(svg).toBeTruthy();
    expect(item).toBeTruthy();
    expect(filter).toBeTruthy();
    expect(layout.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(scene.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(360);
    expect(scene.style.getPropertyValue('perspective')).toMatch(/\d+px/);
    expect(frame.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(frame.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(svg.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(300);
    expect(parseFloat(item.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(filter.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-maint-layout').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-maint-detail').style.getPropertyValue('position')).toBe('static');

    const mobile = rulesForMedia(topRules, /max-width:\s*620px/i);
    expect(ruleForSelector(mobile, '.ar-maint-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(mobile, '.ar-maint-form-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(mobile, '.ar-maint-scene').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(260);
  });

  it('guards motion, forced-color, print, source-state, syntax, routing, and mirror parity contracts', () => {
    maintenance({ maintMiles: 99000, maintMonths: 11 });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedAnimation = reduced.find((rule) =>
      hasSelector(rule, '.ar-maint-scan') && hasSelector(rule, '.ar-maint-warning-lights')
    );
    const reducedTransition = reduced.find((rule) =>
      hasSelector(rule, '.ar-maint-scene-frame') && hasSelector(rule, '.ar-maint-item') && hasSelector(rule, '.ar-maint-filter')
    );
    expect(reducedAnimation).toBeTruthy();
    expect(reducedAnimation.style.getPropertyValue('animation')).toBe('none');
    expect(reducedAnimation.style.getPropertyPriority('animation')).toBe('important');
    expect(reducedTransition).toBeTruthy();
    expect(reducedTransition.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransition.style.getPropertyPriority('transition')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    for (const selector of ['.ar-maint-scene', '.ar-maint-detail', '.ar-maint-item', '.ar-maint-filter']) {
      const boundary = forced.find((rule) =>
        hasSelector(rule, selector) && /canvastext/i.test(rule.style.getPropertyValue('border'))
      );
      expect(boundary).toBeTruthy();
      expect(boundary.style.getPropertyPriority('border')).toBe('important');
    }
    const forcedFocus = forced.find((rule) =>
      hasSelector(rule, '.ar-maint-item:focus-visible') && hasSelector(rule, '.ar-maint-filter:focus-visible')
    );
    const forcedVehicle = forced.find((rule) =>
      /\.ar-maint-vehicle-body/.test(rule.selectorText || '') && /canvas/i.test(rule.style.getPropertyValue('fill'))
    );
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedVehicle).toBeTruthy();

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-maint-form') && hasSelector(rule, '.ar-maint-filters') && hasSelector(rule, '.ar-maint-scan')
    );
    const printFrame = ruleForSelector(print, '.ar-maint-scene-frame');
    const printBreak = print.find((rule) => hasSelector(rule, '.ar-maint-item'));
    const printRestore = print.find((rule) =>
      /\[data-ar-maint-item\].*\[hidden\]/.test(rule.selectorText || '') && rule.style.getPropertyValue('display') !== 'none'
    );
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printFrame.style.getPropertyValue('transform')).toBe('none');
    expect(printBreak.cssText).toMatch(/(?:break-inside|page-break-inside):\s*avoid/);
    expect(printRestore).toBeTruthy();

    const start = SOURCE.indexOf('function renderMaint()');
    const end = SOURCE.indexOf('function renderScams()', start);
    const maintSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderMaint\(\)/g)).toHaveLength(1);
    expect(maintSource).not.toMatch(/parseInt\s*\(\s*d\.maint(?:Miles|Months|Year)/);
    expect(maintSource).not.toContain('d.maintMonths || 6');
    expect(maintSource).not.toMatch(/\boverdue\b/i);
    expect(maintSource).toContain("setView('log')");
    for (const hook of [
      'data-ar-maint-shell',
      'data-ar-maint-state',
      'data-ar-maint-hero',
      'data-ar-maint-form',
      'data-ar-maint-scene',
      'data-ar-maint-object',
      'data-ar-maint-summary',
      'data-ar-maint-bucket',
      'data-ar-maint-filter',
      'data-ar-maint-list',
      'data-ar-maint-item',
      'data-ar-maint-item-state',
      'data-ar-maint-detail',
      'data-ar-maint-basis',
      'data-ar-maint-conditional',
      'data-ar-maint-service-log-action'
    ]) expect(maintSource).toContain(hook);
    for (const state of ['empty', 'invalid', 'ready', ...STATES, ...FILTERS]) {
      expect(maintSource).toContain("'" + state + "'");
    }
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
