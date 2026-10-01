// Auto Repair Shop - Learning Path visual, progress, and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_PATH_FILE || CANONICAL;
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
      if (stack.length === 0) {
        return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
      }
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const PATH = extractAssignedValue(SOURCE, 'LEARNING_PATH');
const EXPECTED_MODULE_IDS = [
  ['firstcar', 'underhood', 'vin', 'glossary', 'maint'],
  ['diagnose', 'tree', 'damage', 'lab', 'repairbay'],
  ['safety', 'tools', 'repair', 'tyre', 'log'],
  ['estimate', 'scams', 'roi', 'usedcar', 'career', 'race']
];
const EXPECTED_THEMES = [
  "Build the basic mental model. Who is this car? What's its history? What's normal?",
  "Develop diagnostic vocabulary + active reasoning. Don't just memorize parts — learn to think about what's wrong.",
  'Move from theory to actual hands. Pick small jobs, do them safely, log them.',
  'Protect yourself when you DO need a shop. Look at the trade as a career path.'
];
const EXPECTED_OUTCOMES = [
  "You can describe your specific car in writing: year, make, model, engine, mileage, last service, open recalls, what's due soon.",
  'You can read a customer-style symptom + walk through a defensible diagnostic sequence. You earn at least 2 lab simulator badges, and you diagnose at least 4 Repair Bay cases correctly without a safety violation.',
  'You complete one real-world Tier-1 maintenance job (oil change, tire rotation, or filter swap) on your own car, and you can change a wheel in the right order without prompting. You record the job in the Service Log.',
  'You complete the Knowledge Quiz at 80%+. You have at least 12 badges. You know what 1-2 modules you want to revisit deeper.'
];

const PATH_ENTRIES = PATH.flatMap((week) => week.modules.map((module) => ({
  week: week.week,
  id: module.id,
  key: 'w' + week.week + '-' + module.id,
  why: module.why
})));
const PATH_KEYS = PATH_ENTRIES.map((entry) => entry.key);

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function path(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'path' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function doneFor(keys, additions) {
  return Object.assign(
    {},
    Object.fromEntries(keys.map((key) => [key, true])),
    additions || {}
  );
}

function expectOverallProgress(shell, now) {
  const progress = shell.querySelector('[data-ar-path-progress][role="progressbar"]');
  expect(progress).toBeTruthy();
  expect(progress.getAttribute('aria-label')).toBe('Learning Path progress');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe('21');
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toBe(now + ' of 21 modules visited');
  expect(progress.parentElement.textContent).toContain(now + ' of 21 modules visited');
}

function expectWeekProgress(week, now, maximum) {
  const progress = week.querySelector('[role="progressbar"]');
  expect(progress).toBeTruthy();
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe(String(maximum));
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of ' + maximum);
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

describe('AutoRepair Learning Path visual roadmap', () => {
  it('renders the exact four-week, 21-module authored curriculum in order', () => {
    const { html, host } = path();
    const shell = host.querySelector('main.ar-path-shell[data-ar-path-shell][data-ar-path-state="empty"]');
    const hero = shell.querySelector('[data-ar-path-hero]');
    const weeks = [...shell.querySelectorAll('[data-ar-path-week]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('h1').textContent).toContain('A 4-week curated walkthrough');
    expect(shell.querySelector('[role="navigation"][aria-label="Learning Path navigation"]')).toBeTruthy();
    expect(hero).toBeTruthy();
    expect(weeks.map((week) => Number(week.dataset.arPathWeek))).toEqual([1, 2, 3, 4]);
    expect(weeks.map((week) => week.dataset.arPathWeekState)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(weeks[0].getAttribute('aria-current')).toBe('step');
    expect(weeks.slice(1).every((week) => !week.hasAttribute('aria-current'))).toBe(true);

    weeks.forEach((week, weekIndex) => {
      const authored = PATH[weekIndex];
      const modules = [...week.querySelectorAll('[data-ar-path-module]')];
      const outcome = week.querySelector('[data-ar-path-outcome]');
      const heading = week.querySelector('h2');

      expect(heading).toBeTruthy();
      expect(heading.textContent).toContain(authored.title);
      expect(week.textContent).toContain(EXPECTED_THEMES[weekIndex]);
      expect(outcome).toBeTruthy();
      expect(outcome.textContent).toContain(EXPECTED_OUTCOMES[weekIndex]);
      expect(modules.map((module) => module.dataset.arPathModule)).toEqual(EXPECTED_MODULE_IDS[weekIndex]);
      expect(modules.map((module) => module.dataset.arPathKey)).toEqual(
        EXPECTED_MODULE_IDS[weekIndex].map((id) => 'w' + authored.week + '-' + id)
      );
      expectWeekProgress(week, 0, authored.modules.length);

      modules.forEach((module, moduleIndex) => {
        const entry = authored.modules[moduleIndex];
        expect(module.dataset.arPathModuleState).toBe('ready');
        expect(module.textContent).toContain(entry.why);
      });
    });

    const modules = [...shell.querySelectorAll('[data-ar-path-module]')];
    const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
    expect(modules).toHaveLength(21);
    expect(modules.map((module) => module.dataset.arPathKey)).toEqual(PATH_KEYS);
    expect(new Set(modules.map((module) => module.dataset.arPathKey)).size).toBe(21);
    expect(new Set(ids).size).toBe(ids.length);
    expect(shell.textContent).toContain('Under-hood tour (3D)');
    expect(shell.textContent).toContain('Repair Bay (3D)');
    expect(shell.textContent).toContain('Change a tyre (3D)');
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expectOverallProgress(shell, 0);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('shows a bounded empty state with one current week and explicit ready controls', () => {
    const { host } = path();
    const shell = host.querySelector('[data-ar-path-shell][data-ar-path-state="empty"]');
    const modules = [...shell.querySelectorAll('[data-ar-path-module]')];
    const toggles = [...shell.querySelectorAll('button[data-ar-path-toggle]')];
    const opens = [...shell.querySelectorAll('button[data-ar-path-open]')];
    const status = shell.querySelector('[data-ar-path-status][role="status"]');
    const statePills = [...shell.querySelectorAll('.ar-path-module-state')];

    expectOverallProgress(shell, 0);
    expect(modules.map((module) => module.dataset.arPathModuleState)).toEqual(Array(21).fill('ready'));
    expect(toggles).toHaveLength(21);
    expect(opens).toHaveLength(21);
    expect(status).toBeTruthy();
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(statePills).toHaveLength(21);
    expect(toggles.every((button) =>
      button.type === 'button' &&
      button.getAttribute('aria-pressed') === 'false' &&
      button.textContent.includes('Mark visited')
    )).toBe(true);
    expect(opens.every((button) =>
      button.type === 'button' &&
      !button.hasAttribute('aria-pressed') &&
      button.textContent.includes('Open')
    )).toBe(true);
    expect(statePills.every((pill) => pill.textContent.trim() === 'Not visited')).toBe(true);
  });

  it('counts only strict-true canonical keys and derives correct weekly states', () => {
    const pathDone = doneFor(PATH_KEYS.slice(0, 5).concat(['w2-diagnose']), {
      firstcar: true,
      retiredModule: true,
      'w2-tree': false,
      'w3-safety': 1,
      'w4-race': 'true'
    });
    const { html, host } = path({ pathDone });
    const shell = host.querySelector('[data-ar-path-shell][data-ar-path-state="in-progress"]');
    const weeks = [...shell.querySelectorAll('[data-ar-path-week]')];

    expectOverallProgress(shell, 6);
    expect(weeks.map((week) => week.dataset.arPathWeekState)).toEqual(['complete', 'current', 'upcoming', 'upcoming']);
    expect(weeks.filter((week) => week.getAttribute('aria-current') === 'step')).toEqual([weeks[1]]);
    [5, 1, 0, 0].forEach((now, index) => expectWeekProgress(weeks[index], now, PATH[index].modules.length));

    const visited = [...shell.querySelectorAll('[data-ar-path-module-state="visited"]')];
    const ready = [...shell.querySelectorAll('[data-ar-path-module-state="ready"]')];
    expect(visited.map((module) => module.dataset.arPathKey)).toEqual(PATH_KEYS.slice(0, 5).concat(['w2-diagnose']));
    expect(ready).toHaveLength(15);
    expect(visited.every((module) =>
      module.querySelector('.ar-path-module-state').textContent.includes('Visited') &&
      module.querySelector('[data-ar-path-toggle]').getAttribute('aria-pressed') === 'true' &&
      module.querySelector('[data-ar-path-toggle]').textContent.includes('Undo visited')
    )).toBe(true);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('reaches complete with all canonical keys even when stale keys remain', () => {
    const { host } = path({ pathDone: doneFor(PATH_KEYS, { retiredModule: true, firstcar: true }) });
    const shell = host.querySelector('[data-ar-path-shell][data-ar-path-state="complete"]');
    const weeks = [...shell.querySelectorAll('[data-ar-path-week]')];

    expectOverallProgress(shell, 21);
    expect(weeks.map((week) => week.dataset.arPathWeekState)).toEqual(Array(4).fill('complete'));
    expect(weeks.every((week) => !week.hasAttribute('aria-current'))).toBe(true);
    weeks.forEach((week, index) => expectWeekProgress(week, PATH[index].modules.length, PATH[index].modules.length));
    expect(shell.querySelectorAll('[data-ar-path-module-state="visited"]')).toHaveLength(21);
    expect(shell.querySelectorAll('[data-ar-path-toggle][aria-pressed="true"]')).toHaveLength(21);
  });

  it('treats unknown-only and non-object persisted progress as empty', () => {
    const unknownTwentyOne = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => ['retired-' + index, true])
    );
    const staleValues = [
      unknownTwentyOne,
      null,
      '',
      'w1-firstcar',
      42,
      true,
      ['w1-firstcar'],
      { 'w1-firstcar': 'true', 'w1-underhood': 1 }
    ];

    for (const pathDone of staleValues) {
      const { html, host } = path({ pathDone });
      const shell = host.querySelector('[data-ar-path-shell][data-ar-path-state="empty"]');
      expect(shell).toBeTruthy();
      expectOverallProgress(shell, 0);
      expect(shell.querySelectorAll('[data-ar-path-module-state="visited"]')).toHaveLength(0);
      expect(shell.querySelectorAll('[data-ar-path-toggle][aria-pressed="true"]')).toHaveLength(0);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps open and visited actions separate, native, and non-nested', () => {
    const { host } = path({ pathDone: { 'w1-firstcar': true } });
    const modules = [...host.querySelectorAll('[data-ar-path-module]')];

    expect(modules).toHaveLength(21);
    modules.forEach((module, index) => {
      const entry = PATH_ENTRIES[index];
      const toggle = module.querySelector('button[data-ar-path-toggle]');
      const open = module.querySelector('button[data-ar-path-open]');

      expect(toggle).toBeTruthy();
      expect(open).toBeTruthy();
      expect(toggle).not.toBe(open);
      expect(toggle.type).toBe('button');
      expect(open.type).toBe('button');
      expect(toggle.dataset.arPathToggle).toBe(entry.key);
      expect(open.dataset.arPathOpen).toBe(entry.id);
      expect(toggle.contains(open)).toBe(false);
      expect(open.contains(toggle)).toBe(false);
      expect(module.querySelectorAll('button button, button a, a button')).toHaveLength(0);
    });
  });

  it('preserves progress, state text, and unique structure across themes', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff' }
    ];
    const states = [
      { extra: {}, state: 'empty', now: 0 },
      { extra: { pathDone: doneFor(PATH_KEYS.slice(0, 6), { ghost: true }) }, state: 'in-progress', now: 6 },
      { extra: { pathDone: doneFor(PATH_KEYS, { ghost: true }) }, state: 'complete', now: 21 },
      { extra: { pathDone: ['w1-firstcar'] }, state: 'empty', now: 0 }
    ];

    for (const theme of themes) {
      for (const state of states) {
        const { html, host } = path(state.extra, theme.value);
        const shell = host.querySelector('[data-ar-path-shell][data-ar-path-state="' + state.state + '"]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);

        expect(shell.getAttribute('style')).toContain('color:' + theme.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(shell.querySelectorAll('[data-ar-path-week]')).toHaveLength(4);
        expect(shell.querySelectorAll('[data-ar-path-module]')).toHaveLength(21);
        expect(shell.querySelectorAll('[data-ar-path-toggle]')).toHaveLength(21);
        expect(shell.querySelectorAll('[data-ar-path-open]')).toHaveLength(21);
        expect(shell.querySelectorAll('[data-ar-path-status][role="status"]')).toHaveLength(1);
        expect(shell.querySelectorAll('.ar-path-module-state')).toHaveLength(21);
        expect(new Set(ids).size).toBe(ids.length);
        expectOverallProgress(shell, state.now);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards desktop, touch, and 860/560 responsive layout contracts through CSSOM', () => {
    path({ pathDone: { 'w1-firstcar': true } });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-path-hero');
    const moduleList = ruleForSelector(topRules, '.ar-path-module-list');
    const wrapping = topRules.find((rule) =>
      hasSelector(rule, '.ar-path-module') && rule.style.getPropertyValue('overflow-wrap')
    );
    const touch = ruleForSelector(topRules, '.ar-path-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(moduleList.style.getPropertyValue('display')).toBe('grid');
    expect(moduleList.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(wrapping.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(medium, '.ar-path-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-path-module-list').style.getPropertyValue('grid-template-columns')).toBe('1fr');

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    expect(ruleForSelector(small, '.ar-path-module-actions').style.getPropertyValue('flex-direction')).toBe('column');
    expect(ruleForSelector(small, '.ar-path-module-actions > button').style.getPropertyValue('width')).toBe('100%');
  });

  it('guards reduced-motion, forced-color, and printable roadmap contracts', () => {
    path({ pathDone: doneFor(PATH_KEYS.slice(0, 6)) });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransition = reduced.find((rule) =>
      hasSelector(rule, '.ar-path-progress-fill') && hasSelector(rule, '.ar-path-module')
    );
    const reducedHover = ruleForSelector(reduced, '.ar-path-module:hover');
    expect(reducedTransition.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransition.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) =>
      hasSelector(rule, '.ar-path-week') && hasSelector(rule, '.ar-path-module')
    );
    const forcedProgress = ruleForSelector(forced, '.ar-path-progress-fill');
    const forcedCurrent = ruleForSelector(forced, '.ar-path-week[data-ar-path-week-state="current"]');
    const forcedFocus = forced.find((rule) =>
      hasSelector(rule, '.ar-path-toggle:focus-visible') && hasSelector(rule, '.ar-path-open:focus-visible')
    );
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedBoundary.style.getPropertyPriority('box-shadow')).toBe('important');
    expect(forcedProgress.style.getPropertyValue('background').toLowerCase()).toContain('highlight');
    expect(forcedCurrent.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printShell = ruleForSelector(print, '.ar-path-shell');
    const printActions = ruleForSelector(print, '.ar-path-module-actions');
    const avoidModule = print.find((rule) =>
      hasSelector(rule, '.ar-path-module') && /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );
    const avoidOutcome = print.find((rule) =>
      hasSelector(rule, '.ar-path-outcome') && /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );
    expect(printShell.style.getPropertyValue('max-width')).toBe('none');
    expect(printActions.style.getPropertyValue('display')).toBe('none');
    expect(printActions.style.getPropertyPriority('display')).toBe('important');
    expect(avoidModule.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(avoidOutcome.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(style.textContent).toContain('.ar-path-shell, .ar-path-shell * { color: black !important; }');
    expect(style.textContent).toContain('background: white !important');
  });

  it('preserves authored data, canonical-key badge logic, hooks, and mirror parity', () => {
    expect(PATH.map((week) => week.week)).toEqual([1, 2, 3, 4]);
    expect(PATH.map((week) => week.modules.map((module) => module.id))).toEqual(EXPECTED_MODULE_IDS);
    expect(PATH.map((week) => week.modules.length)).toEqual([5, 5, 5, 6]);
    expect(PATH.map((week) => week.theme)).toEqual(EXPECTED_THEMES);
    expect(PATH.map((week) => week.outcome)).toEqual(EXPECTED_OUTCOMES);
    expect(PATH_ENTRIES).toHaveLength(21);
    expect(new Set(PATH_ENTRIES.map((entry) => entry.id)).size).toBe(21);
    expect(new Set(PATH_KEYS).size).toBe(21);
    expect(PATH_ENTRIES.every((entry) => typeof entry.why === 'string' && entry.why.length > 60)).toBe(true);

    const start = SOURCE.indexOf('function renderPath()');
    const end = SOURCE.indexOf('function renderTires()', start);
    const pathSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(pathSource).toContain("'w' + w.week + '-' + m.id");
    expect(pathSource).toContain('pathKeys.filter');
    expect(pathSource).toMatch(/done\s*\[[^\]]+\]\s*===\s*true/);
    expect(pathSource).not.toContain('Object.keys(done).filter');
    expect(pathSource).toMatch(/if\s*\(\s*nextValue\s*&&\s*nextDoneCount\s*===\s*totalMods\s*\)\s*awardBadge\('path-graduate',\s*'Curriculum Path Graduate'\)/);
    for (const hook of [
      'data-ar-path-shell',
      'data-ar-path-hero',
      'data-ar-path-progress',
      'data-ar-path-week',
      'data-ar-path-week-state',
      'data-ar-path-module',
      'data-ar-path-key',
      'data-ar-path-module-state',
      'data-ar-path-toggle',
      'data-ar-path-open',
      'data-ar-path-outcome',
      'data-ar-path-status'
    ]) expect(pathSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
