// Auto Repair Shop - Cold-Weather Prep visual, state, accessibility, and print contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_COLD_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const FILTERS = ['all', 'oct-nov', 'nov-dec', 'mar-apr'];

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

const ITEMS = extractAssignedValue(SOURCE, 'COLD_WEATHER_CHECKLIST');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function cold(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'cold' }, extra || {})
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
  const progress = host.querySelector('[data-ar-cold-progressbar][role="progressbar"]');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe(String(ITEMS.length));
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of ' + ITEMS.length);
  expect(parseFloat(progress.querySelector('.ar-cold-progress-fill').style.width)).toBe(Math.round((now / ITEMS.length) * 100));
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Cold-Weather Prep visual checklist', () => {
  it('renders one labelled 12-task workbench with complete default and print content', () => {
    const { html, host } = cold();
    const shell = host.querySelector('main.ar-cold-shell[data-ar-cold-filter="all"][data-ar-cold-progress="empty"]');
    const hero = shell.querySelector('[data-ar-cold-hero]');
    const progress = shell.querySelector('[data-ar-cold-progress-card]');
    const filters = [...shell.querySelectorAll('button[data-ar-cold-filter-id]')];
    const catalog = shell.querySelector('[data-ar-cold-catalog]');
    const items = [...shell.querySelectorAll('button[data-ar-cold-item-id]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Cold-weather prep navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expectLabelled(host, progress);
    expectLabelled(host, shell.querySelector('[data-ar-cold-filter-card]'));
    expectLabelled(host, catalog);
    expect([...hero.querySelectorAll('[data-ar-cold-stat]')].map((stat) => stat.textContent)).toEqual([
      '12prep tasks', '0completed', '12remaining'
    ]);
    expect(filters.map((filter) => filter.dataset.arColdFilterId)).toEqual(FILTERS);
    expect(filters.filter((filter) => filter.getAttribute('aria-pressed') === 'true')).toEqual([filters[0]]);
    expect(items.map((item) => item.dataset.arColdItemId)).toEqual(ITEMS.map((item) => item.id));
    expect(items.every((item) =>
      item.type === 'button' &&
      item.getAttribute('aria-pressed') === 'false' &&
      item.dataset.arColdItemState === 'todo'
    )).toBe(true);
    expectProgress(shell, 0);
    expect(shell.querySelector('[data-ar-cold-complete]')).toBeNull();
    expect([...shell.querySelectorAll('[data-ar-cold-print-item]')].map((item) => item.dataset.arColdPrintItem)).toEqual(ITEMS.map((item) => item.id));
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('filters the exact authored timing windows with one active control', () => {
    const expected = {
      all: ITEMS,
      'oct-nov': ITEMS.filter((item) => item.urgency === 'Oct–Nov'),
      'nov-dec': ITEMS.filter((item) => item.urgency === 'Nov–Dec'),
      'mar-apr': ITEMS.filter((item) => item.urgency === 'Mar–Apr')
    };
    for (const filter of FILTERS) {
      const { html, host } = cold({ coldSeason: filter });
      const shell = host.querySelector('[data-ar-cold-shell][data-ar-cold-filter="' + filter + '"]');
      const filters = [...shell.querySelectorAll('[data-ar-cold-filter-id]')];
      const items = [...shell.querySelectorAll('[data-ar-cold-item-id]')];
      expect(filters.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.arColdFilterId)).toEqual([filter]);
      expect(items.map((item) => item.dataset.arColdItemId)).toEqual(expected[filter].map((item) => item.id));
      expect(items.map((item) => item.dataset.arColdUrgency)).toEqual(expected[filter].map((item) => item.urgency));
      expect(shell.querySelector('[data-ar-cold-filter-card]').textContent).toContain(expected[filter].length + ' of 12 tasks shown');
      expect(shell.querySelector('[data-ar-cold-catalog]').textContent).toContain(expected[filter].length + ' shown');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('renders bounded empty, partial, and complete progress from exact authored keys', () => {
    expectProgress(cold().host, 0);

    const partial = cold({
      coldChecked: checkedFor([ITEMS[0].id, ITEMS[1].id], {
        ghost: true,
        [ITEMS[2].id]: 1,
        [ITEMS[3].id]: 'true'
      })
    });
    const partialShell = partial.host.querySelector('[data-ar-cold-progress="in-progress"]');
    expectProgress(partialShell, 2);
    expect([...partialShell.querySelectorAll('[data-ar-cold-item-state="checked"]')].map((item) => item.dataset.arColdItemId)).toEqual([
      ITEMS[0].id, ITEMS[1].id
    ]);
    expect(partialShell.querySelectorAll('[data-ar-cold-item-id][aria-pressed="true"]')).toHaveLength(2);
    expect(partialShell.querySelector('[data-ar-cold-complete]')).toBeNull();

    const complete = cold({ coldChecked: checkedFor(ITEMS.map((item) => item.id), { ghost: true }) });
    const completeShell = complete.host.querySelector('[data-ar-cold-progress="complete"]');
    expectProgress(completeShell, ITEMS.length);
    expect(completeShell.querySelectorAll('[data-ar-cold-item-state="checked"]')).toHaveLength(ITEMS.length);
    expect(completeShell.querySelector('[data-ar-cold-complete][role="status"]')).toBeTruthy();
  });

  it('clamps malformed filters and checklist containers to safe empty state', () => {
    for (const coldSeason of ['retired-season', ' ', 42, { id: 'oct-nov' }, ['oct-nov'], null]) {
      const { html, host } = cold({ coldSeason });
      const shell = host.querySelector('[data-ar-cold-shell][data-ar-cold-filter="all"]');
      expect(shell.querySelectorAll('[data-ar-cold-item-id]')).toHaveLength(ITEMS.length);
      expect(shell.querySelector('[data-ar-cold-filter-id="all"]').getAttribute('aria-pressed')).toBe('true');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
    for (const coldChecked of [null, 'battery-test', 42, ['battery-test'], { length: 12 }, { ghost: true, 'battery-test': 1, 'tires-check': 'true' }]) {
      const { html, host } = cold({ coldChecked });
      expectProgress(host, 0);
      expect(host.querySelectorAll('[data-ar-cold-item-state="checked"]')).toHaveLength(0);
      expect(host.querySelector('[data-ar-cold-complete]')).toBeNull();
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('preserves hierarchy, progress, and active-control contrast across all themes', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];
    const states = [
      {},
      { coldSeason: 'oct-nov' },
      { coldChecked: checkedFor(ITEMS.slice(0, 3).map((item) => item.id)) },
      { coldSeason: 'nov-dec', coldChecked: checkedFor(ITEMS.slice(0, 9).map((item) => item.id)) },
      { coldChecked: checkedFor(ITEMS.map((item) => item.id)) },
      { coldSeason: { stale: true }, coldChecked: { ghost: true } }
    ];
    const counts = { all: 12, 'oct-nov': 8, 'nov-dec': 3, 'mar-apr': 1 };

    for (const theme of themes) {
      for (const state of states) {
        const { html, host } = cold(state, theme.value);
        const shell = host.querySelector('[data-ar-cold-shell]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
        const active = [...shell.querySelectorAll('[data-ar-cold-filter-id][aria-pressed="true"]')];
        const progress = shell.querySelector('[data-ar-cold-progressbar]');

        expect(shell.getAttribute('style')).toContain('color:' + theme.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(active).toHaveLength(1);
        expect(active[0].getAttribute('style')).toContain('color:' + theme.strong);
        expect(shell.querySelectorAll('[data-ar-cold-item-id]')).toHaveLength(counts[shell.dataset.arColdFilter]);
        expect(shell.querySelectorAll('[data-ar-cold-print-item]')).toHaveLength(ITEMS.length);
        expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);
        expect(Number(progress.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(ITEMS.length);
        expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
        expect(new Set(ids).size).toBe(ids.length);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards desktop layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    cold();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-cold-hero');
    const filters = ruleForSelector(topRules, '.ar-cold-filters');
    const grid = ruleForSelector(topRules, '.ar-cold-grid');
    const catalog = ruleForSelector(topRules, '.ar-cold-catalog');
    const touch = ruleForSelector(topRules, '.ar-cold-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(filters.style.getPropertyValue('grid-template-columns')).toContain('repeat(4');
    expect(grid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(catalog.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(medium, '.ar-cold-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-cold-filters').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(medium, '.ar-cold-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(medium, '.ar-cold-item').style.getPropertyValue('min-height'))).toBe(0);

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    const smallGrids = small.find((rule) =>
      hasSelector(rule, '.ar-cold-hero-stats') &&
      hasSelector(rule, '.ar-cold-filters')
    );
    expect(smallGrids.style.getPropertyValue('grid-template-columns')).toBe('1fr');
  });

  it('guards reduced-motion, forced-color, and complete print contracts', () => {
    cold({ coldChecked: checkedFor(ITEMS.map((item) => item.id)) });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedControls = reduced.find((rule) =>
      hasSelector(rule, '.ar-cold-progress-fill') &&
      hasSelector(rule, '.ar-cold-filter') &&
      hasSelector(rule, '.ar-cold-item')
    );
    const reducedHover = ruleForSelector(reduced, '.ar-cold-item:hover');
    expect(reducedControls.style.getPropertyValue('transition')).toBe('none');
    expect(reducedControls.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => hasSelector(rule, '.ar-cold-hero') && hasSelector(rule, '.ar-cold-item'));
    const forcedActive = forced.find((rule) =>
      hasSelector(rule, '.ar-cold-filter[data-ar-filter-state=active]') &&
      hasSelector(rule, '.ar-cold-item[aria-pressed=true]')
    );
    const forcedFocus = forced.find((rule) =>
      hasSelector(rule, '.ar-cold-filter:focus-visible') &&
      hasSelector(rule, '.ar-cold-item:focus-visible')
    );
    const forcedFill = forced.find((rule) =>
      hasSelector(rule, '.ar-cold-progress-fill') &&
      hasSelector(rule, '.ar-cold-item-icon') &&
      hasSelector(rule, '.ar-cold-check[data-ar-check-state=checked]')
    );
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedActive.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedFill.style.getPropertyValue('background').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-cold-shell [role=navigation]') &&
      hasSelector(rule, '.ar-cold-filter-card') &&
      hasSelector(rule, '.ar-cold-catalog')
    );
    const printGuide = ruleForSelector(print, '.ar-cold-print-guide');
    const avoidBreak = print.find((rule) =>
      hasSelector(rule, '.ar-cold-print-item') &&
      hasSelector(rule, '.ar-cold-complete') &&
      /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );
    const printGrid = ruleForSelector(print, '.ar-cold-print-grid');
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printGuide.style.getPropertyValue('display')).toBe('block');
    expect(printGuide.style.getPropertyPriority('display')).toBe('important');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(printGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(printGrid.style.getPropertyPriority('grid-template-columns')).toBe('important');
    expect(style.textContent).toContain('.ar-cold-shell, .ar-cold-shell * { color: black !important; }');
  });

  it('preserves authored inventory, strict reward logic, hooks, syntax, and mirror parity', () => {
    expect(ITEMS.map((item) => item.id)).toEqual([
      'battery-test',
      'tires-check',
      'antifreeze',
      'wiper-fluid',
      'wipers',
      'block-heater',
      'oil-grade',
      'belts-hoses',
      'emergency-kit',
      'door-locks',
      'windshield-wash',
      'undercarriage-rinse'
    ]);
    expect(ITEMS.reduce((counts, item) => {
      counts[item.urgency] = (counts[item.urgency] || 0) + 1;
      return counts;
    }, {})).toEqual({ 'Oct–Nov': 8, 'Nov–Dec': 3, 'Mar–Apr': 1 });
    expect(ITEMS.every((item) =>
      typeof item.icon === 'string' && item.icon.length > 0 &&
      typeof item.task === 'string' && item.task.length > 10 &&
      typeof item.detail === 'string' && item.detail.length > 75 &&
      typeof item.action === 'string' && item.action.length > 50
    )).toBe(true);

    const start = SOURCE.indexOf('function renderColdPrep()');
    const end = SOURCE.indexOf('function renderRoadside()', start);
    const coldSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderColdPrep\(\)/g)).toHaveLength(1);
    expect(coldSource).toMatch(/typeof d\.coldSeason === ['"]string['"]/);
    expect(coldSource).toMatch(/COLD_FILTER_IDS\.indexOf\(requestedFilter\) >= 0/);
    expect(coldSource).toMatch(/typeof d\.coldChecked === ['"]object['"]/);
    expect(coldSource).toContain('!Array.isArray(d.coldChecked)');
    expect(coldSource).toContain('checkedSource[item.id] === true');
    expect(coldSource).not.toContain('Object.keys(checked)');
    expect(coldSource.match(/awardBadge\('winter-prep'/g)).toHaveLength(1);
    expect(coldSource).toMatch(/if\s*\(\s*nextValue\s*&&\s*nextDone\s*===\s*total\s*\)\s*awardBadge\('winter-prep',\s*'Maine Winter Prepped'\)/);
    expect(coldSource).not.toMatch(/if\s*\(\s*done\s*===\s*total\s*\)\s*awardBadge/);
    expect(coldSource).not.toMatch(/#064e3b|#d1fae5|#a7f3d0/i);
    for (const hook of [
      'data-ar-cold-shell',
      'data-ar-cold-filter',
      'data-ar-cold-progress',
      'data-ar-cold-hero',
      'data-ar-cold-stat',
      'data-ar-cold-progress-card',
      'data-ar-cold-progressbar',
      'data-ar-cold-filter-card',
      'data-ar-cold-filter-id',
      'data-ar-cold-catalog',
      'data-ar-cold-item-id',
      'data-ar-cold-urgency',
      'data-ar-cold-item-state',
      'data-ar-check-state',
      'data-ar-cold-complete',
      'data-ar-cold-print-guide',
      'data-ar-cold-print-item'
    ]) expect(coldSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
