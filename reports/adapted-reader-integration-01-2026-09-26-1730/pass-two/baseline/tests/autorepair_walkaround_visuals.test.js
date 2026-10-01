// Auto Repair Shop - Pre-drive Walk-Around dimensional visual, state, and fallback contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_WALKAROUND_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const AREAS = [
  'Right front corner',
  'Right side / passenger door',
  'Right rear corner',
  'Rear / tailgate',
  'Left rear corner',
  'Left side / driver door',
  'Left front corner',
  'Front / hood',
  'Inside cabin',
  'Drive away listen'
];
const OBJECTS = ['vehicle', 'inspection-route', 'tires', 'lights', 'ground', 'cabin'];

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

const STEPS = extractAssignedValue(SOURCE, 'WALK_AROUND_STEPS');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function walk(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'walk' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function trueMap(ids, extras) {
  const result = Object.assign({}, extras || {});
  ids.forEach((id) => { result[id] = true; });
  return result;
}

function expectLabelled(host, region) {
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId).toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
}

function expectProgress(shell, now) {
  const progress = shell.querySelector('[data-ar-walk-progress][role="progressbar"]');
  const fill = progress.querySelector('.ar-walk-progress-fill');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe(String(STEPS.length));
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of ' + STEPS.length);
  expect(parseFloat(fill.style.width)).toBeCloseTo((now / STEPS.length) * 100, 1);
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

function actions(detail) {
  return [...detail.querySelectorAll('button[data-ar-walk-action]')];
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Pre-drive Walk-Around dimensional workbench', () => {
  it('renders one labelled dimensional scene with all authored hotspots and vehicle layers', () => {
    const { html, host } = walk();
    const shell = host.querySelector('main.ar-walk-shell[data-ar-walk-shell][data-ar-walk-state="empty"]');
    const hero = shell.querySelector('[data-ar-walk-hero]');
    const lab = shell.querySelector('section[data-ar-walk-lab]');
    const scene = lab.querySelector('[data-ar-walk-scene]');
    const svg = scene.querySelector('svg[role="img"]');
    const title = svg.querySelector('title[id]');
    const desc = svg.querySelector('desc[id]');
    const hotspots = [...scene.querySelectorAll('button[data-ar-walk-hotspot]')];
    const steps = [...shell.querySelectorAll('button[data-ar-walk-step]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expectLabelled(host, hero);
    expectLabelled(host, lab);
    expect(title.textContent.trim().length).toBeGreaterThan(10);
    expect(desc.textContent.trim().length).toBeGreaterThan(20);
    const labelledBy = (svg.getAttribute('aria-labelledby') || '').split(/\s+/);
    const describedBy = (svg.getAttribute('aria-describedby') || '').split(/\s+/);
    expect(labelledBy).toContain(title.id);
    expect(labelledBy.includes(desc.id) || describedBy.includes(desc.id)).toBe(true);
    expect(OBJECTS.every((object) => svg.querySelector('[data-ar-walk-object="' + object + '"]'))).toBe(true);
    expect(hotspots.map((button) => Number(button.dataset.arWalkHotspot))).toEqual(STEPS.map((step) => step.n));
    expect(hotspots.every((button) => button.type === 'button')).toBe(true);
    expect(steps.map((button) => Number(button.dataset.arWalkStep))).toEqual(STEPS.map((step) => step.n));
    expect(steps.every((button) => button.type === 'button')).toBe(true);
    hotspots.forEach((button, index) => {
      expect(button.getAttribute('aria-label')).toContain('Step ' + STEPS[index].n);
      expect(button.getAttribute('aria-label')).toContain(STEPS[index].area);
    });
    expect(shell.querySelectorAll('[data-ar-walk-status][role="status"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('maps every authored area, icon, check, and flag to its checklist and focused detail', () => {
    expect(STEPS).toHaveLength(10);
    expect(STEPS.map((step) => step.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(STEPS.map((step) => step.area)).toEqual(AREAS);
    expect(STEPS.every((step) => typeof step.icon === 'string' && step.icon.length > 0)).toBe(true);
    expect(STEPS.every((step) => typeof step.check === 'string' && step.check.length > 30)).toBe(true);
    expect(STEPS.every((step) => typeof step.flag === 'string' && step.flag.length > 20)).toBe(true);

    const baseline = walk();
    const checklist = [...baseline.host.querySelectorAll('button[data-ar-walk-step]')];
    checklist.forEach((button, index) => {
      const step = STEPS[index];
      expect(button.textContent).toContain(step.icon);
      expect(button.textContent).toContain(step.area);
      expect(button.textContent).toContain(step.check);
      expect(button.textContent).toContain(step.flag);
    });

    for (const step of STEPS) {
      const { html, host } = walk({ walkFocus: step.n });
      const detail = host.querySelector('[data-ar-walk-detail]');
      const visibleActions = actions(detail);
      expectLabelled(host, detail);
      expect(detail.textContent).toContain(step.icon);
      expect(detail.textContent).toContain(step.area);
      expect(detail.textContent).toContain(step.check);
      expect(detail.textContent).toContain(step.flag);
      expect(visibleActions.map((button) => button.dataset.arWalkAction)).toEqual(['no-issue', 'flag']);
      expect(visibleActions.every((button) => button.type === 'button')).toBe(true);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('keeps empty, mixed checked/flagged, and complete progress exact and bounded', () => {
    const empty = walk();
    const emptyShell = empty.host.querySelector('[data-ar-walk-shell]');
    const emptySteps = [...emptyShell.querySelectorAll('[data-ar-walk-step]')];
    expect(emptyShell.dataset.arWalkState).toBe('empty');
    expect(emptySteps.map((step) => step.dataset.arWalkStepState)).toEqual(['current', ...Array(9).fill('upcoming')]);
    expect(emptySteps.filter((step) => step.getAttribute('aria-current') === 'step')).toEqual([emptySteps[0]]);
    expect(emptySteps.every((step) => step.getAttribute('aria-pressed') === 'false')).toBe(true);
    expectProgress(emptyShell, 0);
    expect(emptyShell.querySelector('[data-ar-walk-complete]')).toBeNull();

    const mixed = walk({
      walkChecked: trueMap([1, 2]),
      walkFlags: trueMap([3]),
      walkFocus: 4
    });
    const mixedShell = mixed.host.querySelector('[data-ar-walk-shell]');
    const mixedSteps = [...mixedShell.querySelectorAll('[data-ar-walk-step]')];
    expect(mixedShell.dataset.arWalkState).toBe('active');
    expect(mixedSteps.map((step) => step.dataset.arWalkStepState)).toEqual([
      'checked', 'checked', 'flagged', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'
    ]);
    expect(mixedSteps.slice(0, 3).every((step) => step.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(mixedSteps.filter((step) => step.getAttribute('aria-current') === 'step')).toEqual([mixedSteps[3]]);
    expectProgress(mixedShell, 3);
    const flagSummary = mixedShell.querySelector('[data-ar-walk-flag-summary]');
    expect(flagSummary.textContent).toContain('1');
    expect(flagSummary.textContent).toContain(STEPS[2].area);
    expect(flagSummary.textContent).toContain(STEPS[2].flag);

    const complete = walk({ walkChecked: trueMap(STEPS.map((step) => step.n)), walkFocus: 10 });
    const completeShell = complete.host.querySelector('[data-ar-walk-shell]');
    const completeSteps = [...completeShell.querySelectorAll('[data-ar-walk-step]')];
    expect(completeShell.dataset.arWalkState).toBe('complete');
    expect(completeSteps.map((step) => step.dataset.arWalkStepState)).toEqual(Array(10).fill('checked'));
    expect(completeSteps.every((step) => step.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(completeSteps.every((step) => !step.hasAttribute('aria-current'))).toBe(true);
    expectProgress(completeShell, 10);
    expect(completeShell.querySelector('[data-ar-walk-complete]').textContent).toContain('Walk-Around Pro');
    expect(completeShell.querySelector('button[data-ar-walk-reset]')).toBeTruthy();
  });

  it('routes focused action states and strictly bounds restored focus', () => {
    const open = walk({ walkFocus: 5 });
    const openDetail = open.host.querySelector('[data-ar-walk-detail]');
    expect(openDetail.textContent).toContain(STEPS[4].area);
    expect(actions(openDetail).map((button) => button.dataset.arWalkAction)).toEqual(['no-issue', 'flag']);

    const checked = walk({ walkChecked: trueMap([1]), walkFocus: 1 });
    expect(actions(checked.host.querySelector('[data-ar-walk-detail]')).map((button) => button.dataset.arWalkAction)).toEqual(['undo']);

    const flagged = walk({ walkFlags: trueMap([1]), walkFocus: 1 });
    expect(actions(flagged.host.querySelector('[data-ar-walk-detail]')).map((button) => button.dataset.arWalkAction)).toEqual(['undo']);

    for (const walkFocus of [-1, 0, 11, 1.5, '1', {}, [], null]) {
      const { html, host } = walk({ walkChecked: trueMap([1]), walkFlags: trueMap([2]), walkFocus });
      const detail = host.querySelector('[data-ar-walk-detail]');
      expect(detail.textContent).toContain(STEPS[2].area);
      expect(actions(detail).map((button) => button.dataset.arWalkAction)).toEqual(['no-issue', 'flag']);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    const completeFallback = walk({
      walkChecked: trueMap(STEPS.map((step) => step.n)),
      walkFocus: '1'
    });
    expect(completeFallback.host.querySelector('[data-ar-walk-detail]').textContent).toContain(STEPS[0].area);
  });

  it('ignores malformed maps, ghost keys, and truthy non-booleans', () => {
    for (const badMap of [null, '1', 42, ['1'], { length: 10 }]) {
      for (const key of ['walkChecked', 'walkFlags']) {
        const extra = { walkChecked: {}, walkFlags: {} };
        extra[key] = badMap;
        const { html, host } = walk(extra);
        const shell = host.querySelector('[data-ar-walk-shell]');
        expectProgress(shell, 0);
        expect(shell.querySelectorAll('[data-ar-walk-step-state="checked"]')).toHaveLength(0);
        expect(shell.querySelectorAll('[data-ar-walk-step-state="flagged"]')).toHaveLength(0);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }

    const ghosts = Object.fromEntries(Array.from({ length: 10 }, (_, index) => ['ghost-' + index, true]));
    const ghostRender = walk({ walkChecked: ghosts, walkFlags: ghosts });
    expectProgress(ghostRender.host.querySelector('[data-ar-walk-shell]'), 0);

    const strict = walk({
      walkChecked: { 1: true, 2: 1, 3: 'true', 4: false, ghost: true },
      walkFlags: { 5: true, 6: 1, 7: 'true', 8: false, ghost: true }
    });
    const strictShell = strict.host.querySelector('[data-ar-walk-shell]');
    const strictSteps = [...strictShell.querySelectorAll('[data-ar-walk-step]')];
    expectProgress(strictShell, 2);
    expect(strictSteps.map((step) => step.dataset.arWalkStepState)).toEqual([
      'checked', 'current', 'upcoming', 'upcoming', 'flagged', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'
    ]);
  });

  it('preserves hierarchy, unique IDs, and complete controls across every theme', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff' }
    ];

    for (const theme of themes) {
      const { html, host } = walk({ walkChecked: trueMap([1]), walkFlags: trueMap([2]), walkFocus: 3 }, theme.value);
      const shell = host.querySelector('[data-ar-walk-shell]');
      const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
      expect(shell.getAttribute('style')).toContain('color:' + theme.text);
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(shell.querySelectorAll('svg[role="img"]')).toHaveLength(1);
      expect(shell.querySelectorAll('button[data-ar-walk-hotspot]')).toHaveLength(10);
      expect(shell.querySelectorAll('button[data-ar-walk-step]')).toHaveLength(10);
      expect(shell.querySelectorAll('button[data-ar-walk-action]')).toHaveLength(2);
      expect(new Set(ids).size).toBe(ids.length);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('guards perspective geometry, touch targets, and both responsive layouts through CSSOM', () => {
    walk();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const workbench = ruleForSelector(topRules, '.ar-walk-workbench');
    const scene = ruleForSelector(topRules, '.ar-walk-scene');
    const frame = ruleForSelector(topRules, '.ar-walk-frame');
    const svg = ruleForSelector(topRules, '.ar-walk-svg');
    const hotspot = ruleForSelector(topRules, '.ar-walk-hotspot');
    const step = ruleForSelector(topRules, '.ar-walk-step');

    expect(workbench.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(scene.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(380);
    expect(scene.style.getPropertyValue('perspective')).toBe('1100px');
    expect(frame.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(frame.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(svg.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(340);
    expect(parseFloat(hotspot.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(step.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-walk-workbench').style.getPropertyValue('grid-template-columns')).toBe('1fr');

    const mobile = rulesForMedia(topRules, /max-width:\s*620px/i);
    expect(ruleForSelector(mobile, '.ar-walk-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(mobile, '.ar-walk-step-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(mobile, '.ar-walk-scene').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(300);
    expect(ruleForSelector(mobile, '.ar-walk-hotspot-copy small').style.getPropertyValue('display')).toBe('none');
  });

  it('guards reduced-motion, forced-color, and print fallbacks through CSSOM', () => {
    walk();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedAnimation = reduced.find((rule) =>
      hasSelector(rule, '.ar-walk-route') && hasSelector(rule, '.ar-walk-beam')
    );
    const reducedTransition = reduced.find((rule) =>
      hasSelector(rule, '.ar-walk-frame') && hasSelector(rule, '.ar-walk-hotspot') && hasSelector(rule, '.ar-walk-step')
    );
    const reducedHover = reduced.find((rule) =>
      hasSelector(rule, '.ar-walk-scene:hover .ar-walk-frame') && hasSelector(rule, '.ar-walk-hotspot:hover') && hasSelector(rule, '.ar-walk-step:hover')
    );
    expect(reducedAnimation.style.getPropertyValue('animation')).toBe('none');
    expect(reducedAnimation.style.getPropertyPriority('animation')).toBe('important');
    expect(reducedTransition.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransition.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    for (const selector of ['.ar-walk-scene', '.ar-walk-detail', '.ar-walk-hotspot', '.ar-walk-step']) {
      const boundary = forced.find((rule) => hasSelector(rule, selector) && /canvastext/i.test(rule.style.getPropertyValue('border')));
      expect(boundary).toBeTruthy();
      expect(boundary.style.getPropertyPriority('border')).toBe('important');
    }
    const forcedFocus = forced.find((rule) =>
      hasSelector(rule, '.ar-walk-hotspot:focus-visible') && hasSelector(rule, '.ar-walk-step:focus-visible')
    );
    const forcedFill = ruleForSelector(forced, '.ar-walk-progress-fill');
    const forcedSvg = forced.find((rule) => /\.ar-walk-/.test(rule.selectorText || '') && /canvas/i.test(rule.style.getPropertyValue('fill')));
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedFill.style.getPropertyValue('background').toLowerCase()).toContain('highlight');
    expect(forcedSvg).toBeTruthy();

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-walk-hotspots') && hasSelector(rule, '.ar-walk-beam') && hasSelector(rule, '.ar-walk-reset')
    );
    const printFrame = ruleForSelector(print, '.ar-walk-frame');
    const printPseudo = print.find((rule) => hasSelector(rule, '.ar-walk-scene::before') && hasSelector(rule, '.ar-walk-scene::after'));
    const printBreak = print.find((rule) =>
      hasSelector(rule, '.ar-walk-scene-card') && hasSelector(rule, '.ar-walk-detail') && hasSelector(rule, '.ar-walk-step')
    );
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printFrame.style.getPropertyValue('transform')).toBe('none');
    expect(printPseudo.style.getPropertyValue('display')).toBe('none');
    expect(printBreak.cssText).toMatch(/(?:break-inside|page-break-inside):\s*avoid/);
  });

  it('preserves strict state guards, transition-only badge awarding, hooks, syntax, and mirror parity', () => {
    const start = SOURCE.indexOf('function renderWalkAround()');
    const end = SOURCE.indexOf('function bayViewport(', start);
    const walkSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderWalkAround\(\)/g)).toHaveLength(1);
    for (const key of ['walkChecked', 'walkFlags']) {
      expect(walkSource).toMatch(new RegExp("typeof d\\." + key + " === ['\\\"]object['\\\"]"));
      expect(walkSource).toContain('Array.isArray(d.' + key + ')');
    }
    expect((walkSource.match(/\[[^\]]+\.n\]\s*===\s*true/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(walkSource).toContain('Number.isInteger(d.walkFocus)');
    expect(walkSource).toMatch(/WALK_AROUND_STEPS\.filter\(/);
    expect(walkSource).not.toMatch(/Object\.keys\(checked\)/);
    expect(walkSource).not.toMatch(/if\s*\(\s*done\s*===\s*total\s*\)\s*awardBadge/);
    expect(walkSource).toContain("awardBadge('walkaround-pro', 'Walk-Around Pro')");
    expect(walkSource).toMatch(/(?:doneBefore|previousDone|priorDone|wasDone)\s*<\s*total/);
    expect(walkSource).toMatch(/(?:nextDone|doneAfter|resolvedAfter|nextResolved)\s*===\s*total/);
    for (const hook of [
      'data-ar-walk-shell',
      'data-ar-walk-state',
      'data-ar-walk-hero',
      'data-ar-walk-lab',
      'data-ar-walk-scene',
      'data-ar-walk-object',
      'data-ar-walk-hotspot',
      'data-ar-walk-step',
      'data-ar-walk-step-state',
      'data-ar-walk-progress',
      'data-ar-walk-detail',
      'data-ar-walk-action',
      'data-ar-walk-status',
      'data-ar-walk-flag-summary',
      'data-ar-walk-complete',
      'data-ar-walk-reset'
    ]) expect(walkSource).toContain(hook);
    for (const action of ['no-issue', 'flag', 'undo']) expect(walkSource).toContain("'" + action + "'");
    for (const className of ['ar-walk-workbench', 'ar-walk-scene', 'ar-walk-frame', 'ar-walk-svg', 'ar-walk-step-grid']) {
      expect(SOURCE).toContain(className);
    }
    expect(walkSource).not.toMatch(/\b(?:THREE|WebGLRenderer|canvas\.getContext)\b/);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
