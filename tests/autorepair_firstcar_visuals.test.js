// Auto Repair Shop — First Car ownership route state, interaction, visual, and safety contract.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_FIRSTCAR_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractFirstCarPlan(source) {
  const start = source.indexOf('  var FIRST_CAR_PLAN =');
  const end = source.indexOf('  var LAB_SCENARIOS =', start);
  expect(start, 'FIRST_CAR_PLAN was not found').toBeGreaterThan(-1);
  expect(end, 'FIRST_CAR_PLAN has no closing source boundary').toBeGreaterThan(start);
  // Exercise the production-authored plan without maintaining a second fixture.
  // eslint-disable-next-line no-new-func
  return Function('"use strict";\n' + source.slice(start, end) + '\nreturn FIRST_CAR_PLAN;')();
}

const PLAN = extractFirstCarPlan(SOURCE);
const ENTRIES = PLAN.flatMap((week) => week.tasks.map((task, index) => ({
  week,
  task,
  index,
  stableKey: 'firstcar-' + task.id,
  legacyKey: 'w' + week.week + '-' + index
})));
const INTERNAL_VIEWS = new Set([
  'walk', 'vin', 'maint', 'underhood', 'cold', 'inspection', 'tires', 'tyre',
  'roadside', 'log', 'diagnose'
]);

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function firstCar(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'firstcar' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function doneMap(options = {}) {
  const omit = new Set(options.omit || []);
  const result = Object.assign({}, options.extra || {});
  for (const entry of ENTRIES) {
    if (!omit.has(entry.task.id)) result[entry.stableKey] = true;
  }
  return result;
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

function expectProgress(shell, now) {
  const progress = shell.querySelector('[data-ar-firstcar-progress][role="progressbar"]');
  expect(progress).toBeTruthy();
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe('18');
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of 18');
  expect(Number(shell.dataset.arFirstcarCount)).toBe(now);
  expect(now).toBeGreaterThanOrEqual(0);
  expect(now).toBeLessThanOrEqual(18);
}

let mountedRoots = [];
let previousActEnvironment;

async function mountFirstCar(seed) {
  const config = window.StemLab._registry[ID];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  let latest = { autoRepair: Object.assign({ view: 'firstcar' }, seed || {}) };
  const toasts = [];
  const announcements = [];

  function Harness() {
    const [toolData, setToolData] = React.useState(latest);
    latest = toolData;
    const ctx = makeCtx();
    ctx.toolData = toolData;
    ctx.update = function update(toolId, key, value) {
      setToolData(function apply(previous) {
        const previousTool = previous[toolId] || {};
        const nextValue = typeof value === 'function' ? value(previousTool[key]) : value;
        return Object.assign({}, previous, {
          [toolId]: Object.assign({}, previousTool, { [key]: nextValue })
        });
      });
    };
    ctx.updateMulti = function updateMulti(toolId, values) {
      setToolData(function apply(previous) {
        return Object.assign({}, previous, {
          [toolId]: Object.assign({}, previous[toolId] || {}, values || {})
        });
      });
    };
    ctx.addToast = function addToast(message) { toasts.push(message); };
    ctx.announceToSR = function announce(message) { announcements.push(message); };
    return config.render(ctx);
  }

  const root = ReactDOMClient.createRoot(mount);
  mountedRoots.push({ root, mount });
  await act(async () => root.render(React.createElement(Harness)));

  return {
    host: mount,
    state: () => latest.autoRepair,
    toasts,
    announcements,
    async click(element) {
      expect(element, 'First Car click target was not rendered').toBeTruthy();
      await act(async () => {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
  };
}

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  loadTool(FILE, ID);
});

afterEach(async () => {
  const roots = mountedRoots;
  mountedRoots = [];
  for (const item of roots) {
    await act(async () => item.root.unmount());
    item.mount.remove();
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

describe('First Car authored plan and safety boundaries', () => {
  it('keeps four ordered weeks, 18 unique stable task identities, and complete authored fields', () => {
    expect(PLAN.map((week) => week.week)).toEqual([1, 2, 3, 4]);
    expect(PLAN.map((week) => week.tasks.length)).toEqual([5, 4, 4, 5]);
    expect(ENTRIES).toHaveLength(18);
    expect(new Set(ENTRIES.map((entry) => entry.task.id)).size).toBe(18);
    expect(new Set(ENTRIES.map((entry) => entry.stableKey)).size).toBe(18);
    expect(new Set(ENTRIES.map((entry) => entry.legacyKey)).size).toBe(18);
    expect(ENTRIES.map((entry) => entry.stableKey)).toEqual(
      ENTRIES.map((entry) => 'firstcar-' + entry.task.id)
    );

    for (const week of PLAN) {
      expect(week.id).toMatch(/^[a-z][a-z-]+$/);
      expect(week.title.length).toBeGreaterThan(8);
      expect(week.range).toMatch(/^Days \d+–\d+$/);
      expect(week.focus.length).toBeGreaterThan(25);
      expect(week.outcome.length).toBeGreaterThan(45);
      for (const task of week.tasks) {
        expect(task.id).toMatch(/^[a-z][a-z-]+$/);
        expect(task.do.length).toBeGreaterThan(50);
        expect(task.why.length).toBeGreaterThan(55);
        expect(['required', 'baseline', 'safety', 'readiness']).toContain(task.kind);
      }
    }
  });

  it('uses qualified safety copy and only explicit official or internal actions', () => {
    const copy = ENTRIES.map((entry) => entry.task.do + ' ' + entry.task.why).join(' ');
    expect(copy).toMatch(/Confirm active insurance before driving/i);
    expect(copy).toMatch(/never open a hot cooling system/i);
    expect(copy).toMatch(/Never get beneath a vehicle supported only by a jack/i);
    expect(copy).toMatch(/professional lift or rated stands/i);
    expect(copy).toMatch(/Do not use the maximum pressure molded on the tire sidewall/i);
    expect(copy).toMatch(/Do not stage abrupt maneuvers in traffic/i);
    expect(copy).toMatch(/manufacturer(?:'s)? schedule/i);

    const actions = ENTRIES.filter((entry) => entry.task.action);
    const external = actions.filter((entry) => entry.task.action.type === 'external');
    const internal = actions.filter((entry) => entry.task.action.type === 'view');
    expect(actions).toHaveLength(17);
    expect(external).toHaveLength(2);
    expect(internal).toHaveLength(15);
    for (const entry of external) {
      const url = new URL(entry.task.action.url);
      expect(url.protocol).toBe('https:');
      expect(url.hostname === 'maine.gov' || url.hostname.endsWith('.maine.gov')).toBe(true);
      expect(entry.task.action.label.length).toBeGreaterThan(10);
    }
    for (const entry of internal) {
      expect(INTERNAL_VIEWS.has(entry.task.action.view)).toBe(true);
      expect(entry.task.action.label.length).toBeGreaterThan(10);
      expect(entry.task.action.url).toBeUndefined();
    }
  });

  it('renders action metadata as safe official links and sibling internal-route buttons', () => {
    const shell = firstCar().host.querySelector('[data-ar-firstcar-shell]');
    const official = [...shell.querySelectorAll('a[data-ar-firstcar-link-kind="official"]')];
    const internal = [...shell.querySelectorAll('button[data-ar-firstcar-link-kind="module"]')];
    expect(official).toHaveLength(2);
    expect(internal).toHaveLength(15);
    for (const link of official) {
      const url = new URL(link.href);
      expect(url.protocol).toBe('https:');
      expect(url.hostname.endsWith('maine.gov')).toBe(true);
      expect(link.target).toBe('_blank');
      expect((link.getAttribute('rel') || '').split(/\s+/)).toEqual(
        expect.arrayContaining(['noopener', 'noreferrer'])
      );
      expect(link.getAttribute('aria-label')).toMatch(/opens in a new tab/i);
      expect(link.closest('[data-ar-firstcar-task]')).toBeTruthy();
    }
    for (const button of internal) {
      expect(button.type).toBe('button');
      expect(button.dataset.arFirstcarLink).toBeTruthy();
      expect(button.closest('[data-ar-firstcar-task]')).toBeTruthy();
    }
    expect(shell.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});

describe('First Car persisted-state hardening', () => {
  it('distinguishes not-started, in-progress, and complete states with a bounded 18-item meter', () => {
    const empty = firstCar().host.querySelector('[data-ar-firstcar-shell]');
    expect(empty.dataset.arFirstcarState).toBe('not-started');
    expectProgress(empty, 0);
    expect(empty.querySelector('[data-ar-firstcar-complete]')).toBeNull();

    const partialDone = {
      [ENTRIES[0].stableKey]: true,
      [ENTRIES[5].stableKey]: true,
      [ENTRIES[13].stableKey]: true,
      staleRetiredTask: true,
      [ENTRIES[1].stableKey]: 'true',
      [ENTRIES[2].stableKey]: 1
    };
    const partial = firstCar({ firstCarDone: partialDone }).host.querySelector('[data-ar-firstcar-shell]');
    expect(partial.dataset.arFirstcarState).toBe('in-progress');
    expectProgress(partial, 3);
    expect(partial.querySelector('[data-ar-firstcar-status]').textContent).toContain('15 remain');

    const complete = firstCar({
      firstCarDone: doneMap({ extra: { staleRetiredTask: true, 'w1-0': true } })
    }).host.querySelector('[data-ar-firstcar-shell]');
    expect(complete.dataset.arFirstcarState).toBe('complete');
    expectProgress(complete, 18);
    expect(complete.querySelector('[data-ar-firstcar-complete]')).toBeTruthy();
    expect(complete.querySelector('[data-ar-firstcar-next]')).toBeNull();
    expect(complete.querySelector('[data-ar-firstcar-status]').textContent).toMatch(/does not certify vehicle safety or legal status/i);
  });

  it('treats malformed, stale, duplicate, and non-boolean persistence values as untrusted', () => {
    for (const malformed of [null, [], 'firstcar-title-transfer', 18, true]) {
      const { html, host } = firstCar({ firstCarDone: malformed, firstCarWeek: { bad: true } });
      const shell = host.querySelector('[data-ar-firstcar-shell]');
      expect(shell.dataset.arFirstcarState).toBe('not-started');
      expectProgress(shell, 0);
      expect(html).not.toMatch(/\b(?:undefined|NaN|Infinity)\b|\[object Object\]/);
    }

    const noisy = {};
    for (let index = 0; index < 100; index += 1) noisy['retired-' + index] = true;
    for (const entry of ENTRIES) {
      noisy[entry.stableKey] = true;
      noisy[entry.legacyKey] = true;
    }
    const bounded = firstCar({ firstCarDone: noisy }).host.querySelector('[data-ar-firstcar-shell]');
    expectProgress(bounded, 18);

    const strict = firstCar({
      firstCarDone: {
        [ENTRIES[0].stableKey]: false,
        [ENTRIES[0].legacyKey]: true,
        [ENTRIES[1].stableKey]: 'true',
        [ENTRIES[2].stableKey]: 1,
        [ENTRIES[3].stableKey]: true
      }
    }).host.querySelector('[data-ar-firstcar-shell]');
    // A present stable key wins over its legacy alias, and only boolean true counts.
    expectProgress(strict, 1);
    expect(strict.querySelector('[data-ar-firstcar-task="title-transfer"]').dataset.arFirstcarTaskState).toBe('todo');
  });

  it('reads legacy positional keys without double-counting their stable replacements', () => {
    const legacy = {
      'w1-0': true,
      'w2-3': true,
      'w4-4': true,
      'firstcar-title-transfer': true
    };
    const shell = firstCar({ firstCarDone: legacy }).host.querySelector('[data-ar-firstcar-shell]');
    expectProgress(shell, 3);
    expect(shell.querySelector('[data-ar-firstcar-task="title-transfer"]').dataset.arFirstcarTaskState).toBe('complete');
    expect(shell.querySelector('[data-ar-firstcar-task="wiper-blades"]').dataset.arFirstcarTaskState).toBe('complete');
    expect(shell.querySelector('[data-ar-firstcar-task="driving-baseline"]').dataset.arFirstcarTaskState).toBe('complete');
  });
});

describe('First Car navigation, semantics, and mounted behavior', () => {
  it('connects four week controls to four panels with one valid selected/current route', () => {
    const shell = firstCar({ firstCarWeek: 99 }).host.querySelector('[data-ar-firstcar-shell]');
    const controls = [...shell.querySelectorAll('button[data-ar-firstcar-week]')];
    const panels = [...shell.querySelectorAll('[data-ar-firstcar-week-panel]')];
    expect(controls).toHaveLength(4);
    expect(panels).toHaveLength(4);
    expect(controls.map((button) => Number(button.dataset.arFirstcarWeek))).toEqual([1, 2, 3, 4]);
    expect(panels.map((panel) => Number(panel.dataset.arFirstcarWeekPanel))).toEqual([1, 2, 3, 4]);
    expect(controls.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(controls.filter((button) => button.getAttribute('aria-current') === 'step')).toHaveLength(1);
    expect(panels.filter((panel) => panel.getAttribute('aria-hidden') !== 'true')).toHaveLength(1);

    for (const control of controls) {
      const panel = shell.querySelector('#' + control.getAttribute('aria-controls'));
      expect(panel).toBeTruthy();
      expect(panel.dataset.arFirstcarWeekPanel).toBe(control.dataset.arFirstcarWeek);
      const selected = control.getAttribute('aria-pressed') === 'true';
      expect(panel.getAttribute('aria-hidden') !== 'true').toBe(selected);
      expect(panel.style.display === 'none').toBe(!selected);
      const labelledBy = panel.getAttribute('aria-labelledby');
      expect(panel.querySelector('#' + labelledBy)).toBeTruthy();
    }
  });

  it('renders one heading, a labelled route illustration, the before-driving gate, and 18 described tasks', () => {
    const { html, host } = firstCar();
    const shell = host.querySelector('main.ar-firstcar-shell[data-ar-firstcar-shell]');
    const hero = shell.querySelector('header[data-ar-firstcar-hero]');
    const svg = shell.querySelector('[data-ar-firstcar-scene="ownership-route"] svg[role="img"]');
    const title = svg.querySelector('title[id]');
    const desc = svg.querySelector('desc[id]');
    const gate = shell.querySelector('section[data-ar-firstcar-before-drive]');
    const tasks = [...shell.querySelectorAll('li[data-ar-firstcar-task]')];

    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(hero.getAttribute('aria-labelledby')).toBe('autorepair-firstcar-title');
    expect(svg.getAttribute('aria-labelledby').split(/\s+/)).toEqual(
      expect.arrayContaining([title.id, desc.id])
    );
    expect([...svg.querySelectorAll('[data-ar-firstcar-object]')].map((node) => node.dataset.arFirstcarObject)).toEqual(
      expect.arrayContaining(['road', 'keys', 'fluids', 'tire', 'shield', 'vehicle', 'key-tag'])
    );
    expect(gate.getAttribute('aria-labelledby')).toBe('ar-firstcar-gate-title');
    expect(gate.querySelectorAll('li')).toHaveLength(5);
    expect(gate.textContent).toMatch(/Do not drive until your insurer confirms effective coverage/i);
    expect(gate.textContent).toMatch(/qualified inspection or tow/i);
    expect(tasks).toHaveLength(18);

    for (const task of tasks) {
      const check = task.querySelector(':scope > button.ar-firstcar-check');
      const titleId = check.getAttribute('aria-labelledby');
      const whyId = check.getAttribute('aria-describedby');
      expect(check.type).toBe('button');
      expect(task.querySelector('#' + titleId)).toBeTruthy();
      expect(task.querySelector('#' + whyId)).toBeTruthy();
      expect(task.dataset.arFirstcarStorageKey).toBe('firstcar-' + task.dataset.arFirstcarTask);
      expect(task.dataset.arFirstcarLegacyKey).toMatch(/^w[1-4]-[0-4]$/);
      expect(task.querySelector('button button, button a, a button, a a')).toBeNull();
    }
    expect(html).not.toMatch(/\b(?:undefined|NaN|Infinity)\b|\[object Object\]/);
  });

  it('navigates weeks and migrates a toggled legacy task to its stable identity', async () => {
    const app = await mountFirstCar({ firstCarDone: { 'w1-0': true }, firstCarWeek: 1 });
    let task = app.host.querySelector('[data-ar-firstcar-task="title-transfer"]');
    expect(task.dataset.arFirstcarTaskState).toBe('complete');
    expectProgress(app.host.querySelector('[data-ar-firstcar-shell]'), 1);

    await app.click(task.querySelector('.ar-firstcar-check'));
    expect(app.state().firstCarDone).toEqual({});
    task = app.host.querySelector('[data-ar-firstcar-task="title-transfer"]');
    expect(task.dataset.arFirstcarTaskState).toBe('todo');

    await app.click(task.querySelector('.ar-firstcar-check'));
    expect(app.state().firstCarDone).toEqual({ 'firstcar-title-transfer': true });
    expect(app.state().firstCarDone).not.toHaveProperty('w1-0');
    expectProgress(app.host.querySelector('[data-ar-firstcar-shell]'), 1);

    await app.click(app.host.querySelector('button[data-ar-firstcar-week="3"]'));
    expect(app.state().firstCarWeek).toBe(3);
    expect(app.host.querySelector('button[data-ar-firstcar-week="3"]').getAttribute('aria-pressed')).toBe('true');
    expect(app.host.querySelector('[data-ar-firstcar-week-panel="3"]').getAttribute('aria-hidden')).toBeNull();
    expect(app.host.querySelector('[data-ar-firstcar-week-panel="1"]').getAttribute('aria-hidden')).toBe('true');
  });

  it('awards the milestone only on the 18th completion transition and keeps it after reopening', async () => {
    const app = await mountFirstCar({
      firstCarDone: doneMap({ omit: ['service-reminder', 'driving-baseline'] }),
      firstCarWeek: 4,
      badges: {}
    });
    expectProgress(app.host.querySelector('[data-ar-firstcar-shell]'), 16);

    await app.click(app.host.querySelector('[data-ar-firstcar-task="service-reminder"] .ar-firstcar-check'));
    expectProgress(app.host.querySelector('[data-ar-firstcar-shell]'), 17);
    expect(app.state().badges || {}).not.toHaveProperty('first-car-30day');
    expect(app.toasts).toHaveLength(0);

    await app.click(app.host.querySelector('[data-ar-firstcar-task="driving-baseline"] .ar-firstcar-check'));
    expectProgress(app.host.querySelector('[data-ar-firstcar-shell]'), 18);
    expect(app.host.querySelector('[data-ar-firstcar-shell]').dataset.arFirstcarState).toBe('complete');
    expect(app.host.querySelector('[data-ar-firstcar-complete]')).toBeTruthy();
    expect(app.state().badges['first-car-30day'].label).toBe('First-Month Setup Reviewed');
    expect(app.toasts).toEqual(['🏅 First-Month Setup Reviewed']);

    await app.click(app.host.querySelector('[data-ar-firstcar-task="driving-baseline"] .ar-firstcar-check'));
    expectProgress(app.host.querySelector('[data-ar-firstcar-shell]'), 17);
    expect(app.state().badges).toHaveProperty('first-car-30day');
    expect(app.toasts).toHaveLength(1);
  });

  it('routes an authored module action internally without creating a nested control', async () => {
    const app = await mountFirstCar({ firstCarWeek: 1 });
    const action = app.host.querySelector('button[data-ar-firstcar-link="exterior-lights"][data-ar-firstcar-link-kind="module"]');
    const task = action.closest('[data-ar-firstcar-task]');
    expect(task.dataset.arFirstcarTask).toBe('exterior-lights');
    expect(action.closest('button button, a button')).toBeNull();
    await app.click(action);
    expect(app.state().view).toBe('walk');
  });
});

describe('First Car visual resilience and source contract', () => {
  it('pins dimensional surfaces, 44px controls, and 900/680/440 responsive layouts', () => {
    firstCar();
    const style = document.getElementById('allo-ar-firstcar-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-firstcar-hero');
    const routeDepth = topRules.find((rule) =>
      hasSelector(rule, '.ar-firstcar-route-card') && rule.style?.getPropertyValue('box-shadow')
    );
    const weekStop = ruleForSelector(topRules, '.ar-firstcar-week-stop');
    const check = ruleForSelector(topRules, '.ar-firstcar-check');
    const action = ruleForSelector(topRules, '.ar-firstcar-action');
    const next = ruleForSelector(topRules, '.ar-firstcar-next-button');

    expect(style).toBeTruthy();
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(hero.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(300);
    expect(hero.style.getPropertyValue('overflow')).toBe('hidden');
    expect(routeDepth.style.getPropertyValue('box-shadow')).not.toBe('');
    expect(parseFloat(weekStop.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(check.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(check.style.getPropertyValue('min-width'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(action.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(next.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-firstcar-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-firstcar-workspace').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-firstcar-gate').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-firstcar-sidebar').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');

    const compact = rulesForMedia(topRules, /max-width:\s*680px/i);
    expect(ruleForSelector(compact, '.ar-firstcar-week-list').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(compact, '.ar-firstcar-gate ul').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(compact, '.ar-firstcar-sidebar').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(compact, '.ar-firstcar-action').style.getPropertyValue('grid-column')).toBe('2');

    const phone = rulesForMedia(topRules, /max-width:\s*440px/i);
    expect(ruleForSelector(phone, '.ar-firstcar-week-list').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(phone, '.ar-firstcar-gate ul').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(phone, '.ar-firstcar-check').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
  });

  it('removes nonessential motion, preserves forced-color boundaries, and unhides every week for print', () => {
    const shell = firstCar({ firstCarWeek: 2 }).host.querySelector('[data-ar-firstcar-shell]');
    const style = document.getElementById('allo-ar-firstcar-css');
    const topRules = [...style.sheet.cssRules];

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const noAnimation = reduced.find((rule) =>
      hasSelector(rule, '.ar-firstcar-scene-car') && hasSelector(rule, '.ar-firstcar-scene-beacon')
    );
    const noTransition = reduced.find((rule) =>
      hasSelector(rule, '.ar-firstcar-week-stop') && hasSelector(rule, '.ar-firstcar-task') && hasSelector(rule, '.ar-firstcar-action')
    );
    expect(noAnimation.style.getPropertyValue('animation')).toBe('none');
    expect(noAnimation.style.getPropertyPriority('animation')).toBe('important');
    expect(noTransition.style.getPropertyValue('transition')).toBe('none');
    expect(noTransition.style.getPropertyPriority('transition')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedSurfaces = forced.find((rule) =>
      hasSelector(rule, '.ar-firstcar-hero') &&
      hasSelector(rule, '.ar-firstcar-week-panel') &&
      hasSelector(rule, '.ar-firstcar-task')
    );
    const forcedSelected = forced.find((rule) =>
      hasSelector(rule, '.ar-firstcar-week-stop[aria-pressed="true"]') &&
      hasSelector(rule, '.ar-firstcar-check[aria-pressed="true"]')
    );
    expect(forcedSurfaces.style.getPropertyValue('background').toLowerCase()).toContain('canvas');
    expect(forcedSurfaces.style.getPropertyPriority('background')).toBe('important');
    expect(forcedSurfaces.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedSelected.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedSelected.style.getPropertyPriority('outline')).toBe('important');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-firstcar-route-card') &&
      hasSelector(rule, '.ar-firstcar-timeline') &&
      hasSelector(rule, '.ar-firstcar-sidebar') &&
      hasSelector(rule, '.ar-firstcar-action')
    );
    const printPanels = ruleForSelector(print, '.ar-firstcar-week-panel');
    const printWorkspace = ruleForSelector(print, '.ar-firstcar-workspace');
    const printTask = ruleForSelector(print, '.ar-firstcar-task');
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printPanels.style.getPropertyValue('display')).toBe('block');
    expect(printPanels.style.getPropertyPriority('display')).toBe('important');
    expect(printWorkspace.style.getPropertyValue('display')).toBe('block');
    expect(printTask.cssText).toMatch(/break-inside:\s*avoid/i);
    // Runtime keeps one panel visible; the !important print rule deliberately
    // overrides the other three inline display:none declarations.
    expect([...shell.querySelectorAll('[data-ar-firstcar-week-panel]')].filter((panel) => panel.style.display === 'none')).toHaveLength(3);
  });

  it('preserves stable hooks, strict completion/migration logic, source syntax, and optional mirror parity', () => {
    const start = SOURCE.indexOf('function renderFirstCar()');
    const end = SOURCE.indexOf('function renderLab()', start);
    const firstCarSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderFirstCar\(\)/g)).toHaveLength(1);
    for (const hook of [
      'data-ar-firstcar-shell',
      'data-ar-firstcar-state',
      'data-ar-firstcar-count',
      'data-ar-firstcar-progress',
      'data-ar-firstcar-scene',
      'data-ar-firstcar-object',
      'data-ar-firstcar-before-drive',
      'data-ar-firstcar-timeline',
      'data-ar-firstcar-week',
      'data-ar-firstcar-week-state',
      'data-ar-firstcar-week-panel',
      'data-ar-firstcar-task',
      'data-ar-firstcar-storage-key',
      'data-ar-firstcar-legacy-key',
      'data-ar-firstcar-task-state',
      'data-ar-firstcar-link-kind',
      'data-ar-firstcar-next',
      'data-ar-firstcar-complete',
      'data-ar-firstcar-status'
    ]) expect(firstCarSource).toContain(hook);

    expect(firstCarSource).toMatch(/typeof d\.firstCarDone === 'object'\s*&&\s*!Array\.isArray\(d\.firstCarDone\)/);
    expect(firstCarSource).toMatch(/map\[entry\.stableKey\]\s*===\s*true/);
    expect(firstCarSource).toMatch(/map\[entry\.legacyKey\]\s*===\s*true/);
    expect(firstCarSource).toMatch(/delete nextMap\[entry\.legacyKey\]/);
    expect(firstCarSource).toMatch(/nextMap\[entry\.stableKey\]\s*=\s*true/);
    expect(firstCarSource).toMatch(/nextDone\s*&&\s*nextCount\s*===\s*totalTasks\)\s*awardBadge\('first-car-30day'/);
    expect(firstCarSource).not.toMatch(/Object\.keys\(rawDone\).*length/);
    expect(() => Function(SOURCE)).not.toThrow();

    if (process.env.AUTOREPAIR_FIRSTCAR_PARITY === '1') {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
