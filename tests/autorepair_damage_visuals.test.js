// Auto Repair Shop - dimensional Damage ID visual, state, accessibility, and fallback contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_DAMAGE_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const MODES = ['vehicle', 'systems', 'closeup'];

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

const CASES = extractAssignedValue(SOURCE, 'DAMAGE_CASES');
const META = extractAssignedValue(SOURCE, 'DAMAGE_SCENE_META');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function damage(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'damage' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
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

function answersForAll(choice) {
  const answers = {};
  CASES.forEach((item) => {
    ['part', 'cause', 'sev'].forEach((kind) => { answers[item.id + '_' + kind] = choice; });
  });
  return answers;
}

function expectProgress(host, now) {
  const progress = host.querySelector('[data-ar-damage-progressbar][role="progressbar"]');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe(String(CASES.length * 3));
  expect(progress.getAttribute('aria-valuenow')).toBe(String(now));
  expect(progress.getAttribute('aria-valuetext')).toContain(now + ' of ' + (CASES.length * 3));
  expect(parseFloat(progress.querySelector('.ar-damage-progress-fill').style.width)).toBe(Math.round((now / (CASES.length * 3)) * 100));
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair dimensional Damage ID studio', () => {
  it('renders a complete default vehicle scene with one clear diagnostic hierarchy', () => {
    const { html, host } = damage();
    const shell = host.querySelector('main.ar-damage-shell[data-ar-damage-state="active"][data-ar-damage-case="d1"][data-ar-damage-mode="vehicle"]');
    const scene = shell.querySelector('[data-ar-damage-scene]');
    const controls = [...shell.querySelectorAll('button[data-ar-damage-view]')];
    const svg = scene.querySelector('svg[role="img"]');

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Damage ID navigation"]')).toBeTruthy();
    expect(controls.map((button) => button.dataset.arDamageView)).toEqual(MODES);
    expect(controls.every((button) => button.type === 'button')).toBe(true);
    expect(controls.filter((button) => button.getAttribute('aria-pressed') === 'true')).toEqual([controls[0]]);
    expect(scene.dataset.arDamageKind).toBe(META.d1.kind);
    expect(scene.dataset.arDamageZone).toBe(META.d1.zone);
    expect(svg.querySelector('title').textContent).toContain(META.d1.zone);
    expect(svg.querySelector('desc').textContent).toContain(META.d1.system);
    expect(svg.querySelector('[data-ar-damage-car-shell]')).toBeTruthy();
    expect(svg.querySelector('[data-ar-damage-system-layer]')).toBeTruthy();
    expect(svg.querySelector('[data-ar-damage-hotspot]')).toBeTruthy();
    expect(scene.querySelector('[data-ar-damage-closeup="' + META.d1.kind + '"]')).toBeTruthy();
    expect(shell.querySelectorAll('[data-ar-damage-readout]')).toHaveLength(3);
    expect(shell.querySelector('[data-ar-damage-observation]').textContent).toContain(CASES[0].visual);
    expect(shell.querySelectorAll('[data-ar-damage-question]')).toHaveLength(3);
    expect(shell.querySelectorAll('button[data-ar-damage-option]')).toHaveLength(12);
    expect([...shell.querySelectorAll('button[data-ar-damage-option]')].every((button) => button.type === 'button' && !button.disabled)).toBe(true);
    expectProgress(shell, 0);
    expect(shell.querySelector('[data-ar-damage-next]')).toBeNull();
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('maps every authored case to its exact vehicle zone, system, depth, and observation', () => {
    CASES.forEach((item, index) => {
      const { html, host } = damage({ damageIdx: index, damageView: 'systems' });
      const meta = META[item.id];
      const shell = host.querySelector('[data-ar-damage-shell][data-ar-damage-case="' + item.id + '"]');
      const scene = shell.querySelector('[data-ar-damage-scene][data-ar-damage-mode="systems"]');
      const readouts = [...shell.querySelectorAll('[data-ar-damage-readout] strong')].map((node) => node.textContent);

      expect(meta).toBeTruthy();
      expect(scene.dataset.arDamageKind).toBe(meta.kind);
      expect(scene.dataset.arDamageZone).toBe(meta.zone);
      expect(scene.querySelector('title').textContent).toContain(meta.zone);
      expect(scene.querySelector('desc').textContent).toContain(meta.system);
      expect(readouts).toEqual([meta.system, meta.zone, meta.depth]);
      expect(shell.querySelector('[data-ar-damage-observation]').textContent).toContain(item.visual);
      expect(shell.querySelector('[data-ar-damage-view="systems"]').getAttribute('aria-pressed')).toBe('true');
      expect(shell.querySelectorAll('[data-ar-damage-question]')).toHaveLength(3);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    });
  });

  it('supports three exclusive scene modes and safely clamps malformed mode values', () => {
    for (const mode of MODES) {
      const { host } = damage({ damageView: mode });
      const shell = host.querySelector('[data-ar-damage-shell][data-ar-damage-mode="' + mode + '"]');
      const active = [...shell.querySelectorAll('[data-ar-damage-view][aria-pressed="true"]')];
      expect(active.map((button) => button.dataset.arDamageView)).toEqual([mode]);
      expect(shell.querySelector('[data-ar-damage-scene]').dataset.arDamageMode).toBe(mode);
      expect(shell.querySelector('[data-ar-damage-closeup]').getAttribute('aria-hidden')).toBe(mode === 'closeup' ? 'false' : 'true');
    }
    for (const damageView of ['wireframe', ' ', 42, { id: 'systems' }, ['closeup'], null]) {
      const { html, host } = damage({ damageView });
      expect(host.querySelector('[data-ar-damage-shell][data-ar-damage-mode="vehicle"]')).toBeTruthy();
      expect(host.querySelector('[data-ar-damage-view="vehicle"]').getAttribute('aria-pressed')).toBe('true');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('counts only bounded authored answers and exposes deterministic locked feedback', () => {
    const { host } = damage({
      damageAnswers: {
        d1_part: 0,
        d1_cause: 1,
        d1_sev: 2,
        ghost: 0,
        d2_part: 99,
        d3_part: '0'
      }
    });
    const questions = [...host.querySelectorAll('[data-ar-damage-question]')];
    expectProgress(host, 3);
    expect(questions.every((question) => question.dataset.arQuestionState === 'answered')).toBe(true);
    questions.forEach((question) => {
      expect(question.querySelectorAll('[data-ar-option-state="correct"]')).toHaveLength(1);
      expect(question.querySelectorAll('[data-ar-damage-option][aria-pressed="true"]')).toHaveLength(1);
      expect([...question.querySelectorAll('[data-ar-damage-option]')].every((button) => button.disabled)).toBe(true);
    });
    expect(host.querySelector('[data-ar-damage-next]')).toBeTruthy();
  });

  it('clamps malformed indices and answer containers without entering a false completion state', () => {
    for (const damageIdx of [-1, 16, 99, '1', { index: 1 }, [1], null]) {
      const { html, host } = damage({ damageIdx });
      expect(host.querySelector('[data-ar-damage-shell][data-ar-damage-state="active"][data-ar-damage-case="d1"]')).toBeTruthy();
      expectProgress(host, 0);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
    for (const damageAnswers of [null, 'd1_part', 42, ['d1_part'], { length: 45 }, { ghost: 0, d1_part: -1, d1_cause: 4, d1_sev: 1.5 }]) {
      const { html, host } = damage({ damageAnswers });
      expectProgress(host, 0);
      expect(host.querySelectorAll('[data-ar-question-state="answered"]')).toHaveLength(0);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
    const completed = damage({ damageIdx: CASES.length, damageAnswers: answersForAll(0) });
    expect(completed.host.querySelector('[data-ar-damage-shell][data-ar-damage-state="complete"]')).toBeTruthy();
    expect(completed.host.querySelector('[data-ar-damage-result]')).toBeTruthy();
    expect(completed.host.querySelectorAll('h1')).toHaveLength(1);
  });

  it('preserves scene hierarchy and strong-fill contrast across every theme', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];
    for (const theme of themes) {
      for (const mode of MODES) {
        const { html, host } = damage({ damageIdx: 7, damageView: mode }, theme.value);
        const shell = host.querySelector('[data-ar-damage-shell]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
        const active = shell.querySelector('[data-ar-damage-view][aria-pressed="true"]');

        expect(shell.getAttribute('style')).toContain('color:' + theme.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(active.getAttribute('style')).toContain('color:' + theme.strong);
        expect(shell.querySelectorAll('svg[role="img"]')).toHaveLength(1);
        expect(shell.querySelectorAll('[data-ar-damage-question]')).toHaveLength(3);
        expect(shell.querySelectorAll('[data-ar-damage-option]')).toHaveLength(12);
        expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
        expect(new Set(ids).size).toBe(ids.length);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards dimensional layout, motion preferences, forced colors, and print through CSSOM', () => {
    damage();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const workbench = ruleForSelector(topRules, '.ar-damage-workbench');
    const controls = ruleForSelector(topRules, '.ar-damage-view-controls');
    const scene = ruleForSelector(topRules, '.ar-damage-scene');
    const perspective = ruleForSelector(topRules, '.ar-damage-scene-perspective');
    const frame = ruleForSelector(topRules, '.ar-damage-scene-frame');
    const options = ruleForSelector(topRules, '.ar-damage-options');
    const touch = ruleForSelector(topRules, '.ar-damage-view-button');

    expect(workbench.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(controls.style.getPropertyValue('grid-template-columns')).toContain('repeat(3');
    expect(parseFloat(scene.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(340);
    expect(perspective.style.getPropertyValue('perspective')).toBe('1100px');
    expect(frame.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(frame.style.getPropertyValue('transform')).toContain('rotateX');
    expect(options.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(style.textContent).toContain('@keyframes arDamagePulse');
    expect(style.textContent).toContain('@keyframes arDamageScan');

    const medium = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(medium, '.ar-damage-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-damage-workbench').style.getPropertyValue('grid-template-columns')).toBe('1fr');

    const small = rulesForMedia(topRules, /max-width:\s*620px/i);
    const smallGrids = small.find((rule) =>
      hasSelector(rule, '.ar-damage-view-controls') &&
      hasSelector(rule, '.ar-damage-stage-footer') &&
      hasSelector(rule, '.ar-damage-options')
    );
    expect(smallGrids.style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(small, '.ar-damage-scene').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(300);

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransitions = reduced.find((rule) =>
      hasSelector(rule, '.ar-damage-progress-fill') &&
      hasSelector(rule, '.ar-damage-view-button') &&
      hasSelector(rule, '.ar-damage-closeup')
    );
    const reducedAnimations = reduced.find((rule) => hasSelector(rule, '.ar-damage-hotspot-wave') && hasSelector(rule, '.ar-damage-scan-line'));
    expect(reducedTransitions.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransitions.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedAnimations.style.getPropertyValue('animation')).toBe('none');
    expect(reducedAnimations.style.getPropertyPriority('animation')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => hasSelector(rule, '.ar-damage-scene') && hasSelector(rule, '.ar-damage-option'));
    const forcedActive = forced.find((rule) => hasSelector(rule, '.ar-damage-view-button[data-ar-view-state=active]') && hasSelector(rule, '.ar-damage-option[data-ar-option-state=correct]'));
    const forcedVehicle = forced.find((rule) => hasSelector(rule, '.ar-damage-car-shell path') && hasSelector(rule, '.ar-damage-car-shell ellipse'));
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedActive.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedVehicle.style.getPropertyValue('fill').toLowerCase()).toContain('canvas');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) => hasSelector(rule, '.ar-damage-shell [role=navigation]') && hasSelector(rule, '.ar-damage-view-controls') && hasSelector(rule, '.ar-damage-next'));
    const printTransform = print.find((rule) => hasSelector(rule, '.ar-damage-scene-frame') && hasSelector(rule, '.ar-damage-result-donut'));
    const printPseudo = print.find((rule) => hasSelector(rule, '.ar-damage-scene::before') && hasSelector(rule, '.ar-damage-scene::after'));
    const avoidBreak = print.find((rule) => hasSelector(rule, '.ar-damage-scene-card') && hasSelector(rule, '.ar-damage-question') && /(?:break-inside|page-break-inside)/.test(rule.cssText));
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printTransform.style.getPropertyValue('transform')).toBe('none');
    expect(printTransform.style.getPropertyPriority('transform')).toBe('important');
    expect(printPseudo.style.getPropertyValue('display')).toBe('none');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(style.textContent).toContain('.ar-damage-shell, .ar-damage-shell * { color: black !important; }');
  });

  it('preserves authored cases, strict transition reward logic, hooks, syntax, and mirror parity', () => {
    expect(CASES.map((item) => item.id)).toEqual([
      'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15'
    ]);
    expect(Object.keys(META)).toEqual(CASES.map((item) => item.id));
    expect(CASES.every((item) =>
      typeof item.visual === 'string' && item.visual.length > 50 &&
      ['part', 'cause', 'sev'].every((kind) => item[kind].a.length === 4 && Number.isInteger(item[kind].correct))
    )).toBe(true);
    expect(Object.values(META).every((meta) =>
      typeof meta.icon === 'string' && meta.icon.length > 0 &&
      typeof meta.kind === 'string' && meta.kind.length > 3 &&
      typeof meta.system === 'string' && meta.system.length > 5 &&
      typeof meta.zone === 'string' && meta.zone.length > 5 &&
      typeof meta.depth === 'string' && meta.depth.length > 5 &&
      Number.isFinite(meta.x) && meta.x >= 0 && meta.x <= 620 &&
      Number.isFinite(meta.y) && meta.y >= 0 && meta.y <= 300
    )).toBe(true);

    const start = SOURCE.indexOf('function renderDamage()');
    const end = SOURCE.indexOf('function renderROI()', start);
    const damageSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderDamage\(\)/g)).toHaveLength(1);
    expect(damageSource).toContain('Number.isInteger(d.damageIdx)');
    expect(damageSource).toMatch(/typeof d\.damageAnswers === ['"]object['"]/);
    expect(damageSource).toContain('!Array.isArray(d.damageAnswers)');
    expect(damageSource).toContain('Number.isInteger(value)');
    expect(damageSource).toMatch(/typeof d\.damageView === ['"]string['"]/);
    expect(damageSource).toMatch(/DAMAGE_VIEW_IDS\.indexOf\(requestedDamageView\) >= 0/);
    expect(damageSource.match(/awardBadge\('damage-id-ace'/g)).toHaveLength(1);
    expect(damageSource).toMatch(/if\s*\(finalResult\.pct >= 80\) awardBadge\('damage-id-ace',\s*'Damage ID Ace'\)/);
    expect(damageSource).not.toMatch(/if\s*\(pct >= 80\) awardBadge/);
    expect(damageSource).not.toMatch(/#064e3b|#d1fae5|#7f1d1d|#fee2e2/i);
    for (const hook of [
      'data-ar-damage-shell',
      'data-ar-damage-state',
      'data-ar-damage-case',
      'data-ar-damage-mode',
      'data-ar-damage-hero',
      'data-ar-damage-progress-card',
      'data-ar-damage-progressbar',
      'data-ar-damage-workbench',
      'data-ar-damage-scene-card',
      'data-ar-damage-view',
      'data-ar-view-state',
      'data-ar-damage-scene',
      'data-ar-damage-car-shell',
      'data-ar-damage-system-layer',
      'data-ar-damage-hotspot',
      'data-ar-damage-closeup',
      'data-ar-damage-readout',
      'data-ar-damage-observation',
      'data-ar-damage-questions',
      'data-ar-damage-question',
      'data-ar-question-state',
      'data-ar-damage-option',
      'data-ar-option-state',
      'data-ar-damage-next',
      'data-ar-damage-result'
    ]) expect(damageSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
