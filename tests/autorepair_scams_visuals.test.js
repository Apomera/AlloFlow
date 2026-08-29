// Auto Repair Shop - Scam Spotter visual, state, accessibility, and print contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_SCAMS_FILE || CANONICAL;
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

const SCAMS = extractAssignedValue(SOURCE, 'SCAMS');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function scams(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'scams' }, extra || {})
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

describe('AutoRepair Scam Spotter visual workbench', () => {
  it('renders one labelled 12-pattern workbench with four response moves and print content', () => {
    const { html, host } = scams();
    const shell = host.querySelector('main.ar-scams-shell[data-ar-scams-selection="empty"]');
    const hero = shell.querySelector('[data-ar-scams-hero]');
    const playbook = shell.querySelector('[data-ar-scams-playbook]');
    const catalog = shell.querySelector('[data-ar-scams-catalog]');
    const detail = shell.querySelector('article#autorepair-scams-detail[data-ar-scams-detail]');
    const rights = shell.querySelector('aside[data-ar-scams-rights]');
    const choices = [...shell.querySelectorAll('button[data-ar-scams-item-id]')];
    const steps = [...playbook.querySelectorAll('[data-ar-scams-playbook-step]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.querySelector('[role="navigation"][aria-label="Scam Spotter navigation"]')).toBeTruthy();
    expectLabelled(host, hero);
    expectLabelled(host, playbook);
    expectLabelled(host, catalog);
    expectLabelled(host, detail);
    expectLabelled(host, rights);
    expect([...hero.querySelectorAll('[data-ar-scams-stat]')].map((stat) => stat.textContent)).toEqual([
      '12shop patterns', '4response moves', '1rights guide'
    ]);
    expect(steps.map((step) => Number(step.dataset.arScamsPlaybookStep))).toEqual([1, 2, 3, 4]);
    expect(steps.map((step) => step.textContent)).toEqual([
      '1Hear the pitch',
      '2Check the truth',
      '3Ask for proof',
      '4Choose the next step'
    ]);
    expect(choices.map((choice) => choice.dataset.arScamsItemId)).toEqual(SCAMS.map((scam) => scam.id));
    expect(choices.every((choice) =>
      choice.type === 'button' &&
      choice.getAttribute('aria-pressed') === 'false' &&
      choice.getAttribute('aria-expanded') === 'false'
    )).toBe(true);
    expect(detail.dataset.arScamsDetailState).toBe('empty');
    expect(rights.querySelector('a[href="https://www.maine.gov/ag/consumer"][target="_blank"][rel="noopener"]')).toBeTruthy();
    expect([...shell.querySelectorAll('[data-ar-scams-print-item]')].map((item) => item.dataset.arScamsPrintItem)).toEqual(SCAMS.map((scam) => scam.id));
    expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('renders every authored pattern with one selected control and complete four-part guide', () => {
    for (const scam of SCAMS) {
      const { html, host } = scams({ scamPicked: scam.id });
      const shell = host.querySelector('[data-ar-scams-shell][data-ar-scams-selection="active"]');
      const choices = [...shell.querySelectorAll('button[data-ar-scams-item-id]')];
      const selected = shell.querySelector('[data-ar-scams-item-id="' + scam.id + '"]');
      const detail = shell.querySelector('#autorepair-scams-detail[data-ar-scams-detail-state="active"]');

      expect(choices.filter((choice) => choice.getAttribute('aria-pressed') === 'true')).toEqual([selected]);
      expect(selected.type).toBe('button');
      expect(selected.dataset.arOptionState).toBe('active');
      expect(selected.getAttribute('aria-expanded')).toBe('true');
      expect(selected.getAttribute('aria-controls')).toBe(detail.id);
      expect(selected.getAttribute('aria-label')).toContain(scam.name);
      expect(selected.getAttribute('aria-label')).toContain('viewing');
      expect(selected.textContent).toContain('Viewing guide');
      for (const value of [scam.name, scam.pitch, scam.truth, scam.askFor, scam.doNow]) {
        expect(detail.textContent).toContain(value);
      }
      expect(detail.querySelectorAll('.ar-scams-detail-block')).toHaveLength(4);
      expectLabelled(host, detail);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('clamps malformed and stale selections to the stable empty guide', () => {
    for (const scamPicked of ['retired-pattern', ' ', 42, { id: 'fake-evap' }, ['fake-evap'], null]) {
      const { html, host } = scams({ scamPicked });
      const shell = host.querySelector('[data-ar-scams-shell][data-ar-scams-selection="empty"]');
      expect(shell.querySelectorAll('[data-ar-scams-item-id][aria-pressed="true"]')).toHaveLength(0);
      expect(shell.querySelector('[data-ar-scams-detail]').dataset.arScamsDetailState).toBe('empty');
      expect(shell.querySelectorAll('[data-ar-scams-item-id]')).toHaveLength(SCAMS.length);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('preserves hierarchy and strong-fill contrast across all themes', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', strong: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', strong: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', strong: '#000000' }
    ];
    const states = [
      {},
      { scamPicked: SCAMS[0].id },
      { scamPicked: SCAMS[Math.floor(SCAMS.length / 2)].id },
      { scamPicked: SCAMS[SCAMS.length - 1].id },
      { scamPicked: { stale: true } }
    ];

    for (const theme of themes) {
      for (const state of states) {
        const { html, host } = scams(state, theme.value);
        const shell = host.querySelector('[data-ar-scams-shell]');
        const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);
        const selected = [...shell.querySelectorAll('[data-ar-scams-item-id][aria-pressed="true"]')];

        expect(shell.getAttribute('style')).toContain('color:' + theme.text);
        expect(shell.querySelectorAll('h1')).toHaveLength(1);
        expect(shell.querySelectorAll('[data-ar-scams-item-id]')).toHaveLength(SCAMS.length);
        expect(shell.querySelectorAll('[data-ar-scams-playbook-step]')).toHaveLength(4);
        expect(shell.querySelectorAll('[data-ar-scams-print-item]')).toHaveLength(SCAMS.length);
        expect(selected.length).toBeLessThanOrEqual(1);
        if (selected.length) expect(selected[0].getAttribute('style')).toContain('color:' + theme.strong);
        expect(shell.querySelectorAll('[role="note"][aria-label="Educational disclaimer"]')).toHaveLength(1);
        expect(new Set(ids).size).toBe(ids.length);
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
  });

  it('guards desktop layout, touch targets, and both responsive breakpoints through CSSOM', () => {
    scams({ scamPicked: SCAMS[0].id });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-scams-hero');
    const playbook = ruleForSelector(topRules, '.ar-scams-playbook-grid');
    const layout = ruleForSelector(topRules, '.ar-scams-layout');
    const grid = ruleForSelector(topRules, '.ar-scams-grid');
    const wrapping = topRules.find((rule) => hasSelector(rule, '.ar-scams-catalog') && hasSelector(rule, '.ar-scams-detail'));
    const touch = ruleForSelector(topRules, '.ar-scams-shell button');

    expect(hero.style.getPropertyValue('display')).toBe('grid');
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(playbook.style.getPropertyValue('grid-template-columns')).toContain('repeat(4');
    expect(layout.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(grid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(wrapping.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const medium = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(medium, '.ar-scams-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-scams-playbook-grid').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(medium, '.ar-scams-layout').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(medium, '.ar-scams-detail').style.getPropertyValue('position')).toBe('static');

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    const smallGrids = small.find((rule) =>
      hasSelector(rule, '.ar-scams-hero-stats') &&
      hasSelector(rule, '.ar-scams-playbook-grid') &&
      hasSelector(rule, '.ar-scams-grid')
    );
    expect(smallGrids.style.getPropertyValue('grid-template-columns')).toBe('1fr');
  });

  it('guards reduced-motion, forced-color, and complete print contracts', () => {
    scams({ scamPicked: SCAMS[0].id });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedItem = ruleForSelector(reduced, '.ar-scams-item');
    const reducedHover = ruleForSelector(reduced, '.ar-scams-item:hover');
    expect(reducedItem.style.getPropertyValue('transition')).toBe('none');
    expect(reducedItem.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => hasSelector(rule, '.ar-scams-hero') && hasSelector(rule, '.ar-scams-detail'));
    const forcedActive = ruleForSelector(forced, '.ar-scams-item[data-ar-option-state=active]');
    const forcedFocus = forced.find((rule) => hasSelector(rule, '.ar-scams-item:focus-visible') && hasSelector(rule, '.ar-scams-rights a:focus-visible'));
    const forcedFill = forced.find((rule) => hasSelector(rule, '.ar-scams-item-icon') && hasSelector(rule, '.ar-scams-playbook-step strong'));
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedActive.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedActive.style.getPropertyPriority('outline')).toBe('important');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedFill.style.getPropertyValue('background').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-scams-shell [role=navigation]') &&
      hasSelector(rule, '.ar-scams-playbook') &&
      hasSelector(rule, '.ar-scams-layout')
    );
    const printGuide = ruleForSelector(print, '.ar-scams-print-guide');
    const avoidBreak = print.find((rule) =>
      hasSelector(rule, '.ar-scams-print-item') &&
      hasSelector(rule, '.ar-scams-rights') &&
      /(?:break-inside|page-break-inside)/.test(rule.cssText)
    );
    const printGrid = ruleForSelector(print, '.ar-scams-print-grid');
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printGuide.style.getPropertyValue('display')).toBe('block');
    expect(printGuide.style.getPropertyPriority('display')).toBe('important');
    expect(avoidBreak.cssText).toMatch(/(?:break-inside|page-break-inside): avoid/);
    expect(printGrid.style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(printGrid.style.getPropertyPriority('grid-template-columns')).toBe('important');
    expect(style.textContent).toContain('.ar-scams-shell, .ar-scams-shell * { color: black !important; }');
  });

  it('preserves authored inventory, reward logic, hooks, syntax, and mirror parity', () => {
    expect(SCAMS.map((scam) => scam.id)).toEqual([
      'overnight-hostage',
      'phantom-cv',
      'fake-evap',
      'lifetime-align',
      'synth-markup',
      'brake-flush-upsell',
      'battery-cable',
      'engine-flush-old',
      'ac-recharge-no-leak',
      'computer-reset',
      'warped-just-dirty',
      'tow-hostage'
    ]);
    expect(SCAMS.every((scam) =>
      typeof scam.icon === 'string' && scam.icon.length > 0 &&
      typeof scam.name === 'string' && scam.name.length > 5 &&
      typeof scam.pitch === 'string' && scam.pitch.length > 25 &&
      typeof scam.truth === 'string' && scam.truth.length > 50 &&
      typeof scam.askFor === 'string' && scam.askFor.length > 25 &&
      typeof scam.doNow === 'string' && scam.doNow.length > 25
    )).toBe(true);

    const start = SOURCE.indexOf('function renderScams()');
    const end = SOURCE.indexOf('function renderDamage()', start);
    const scamsSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderScams\(\)/g)).toHaveLength(1);
    expect(scamsSource).toMatch(/typeof d\.scamPicked === ['"]string['"]/);
    expect(scamsSource.match(/awardBadge\('scam-aware'/g)).toHaveLength(1);
    expect(scamsSource).toMatch(/if\s*\(\s*!sel\s*\)\s*awardBadge\('scam-aware',\s*'Scam Aware'\)/);
    expect(scamsSource).not.toContain("color: sel ? '#0f172a'");
    expect(scamsSource).not.toContain("background: '#7c2d12'");
    for (const hook of [
      'data-ar-scams-shell',
      'data-ar-scams-selection',
      'data-ar-scams-hero',
      'data-ar-scams-stat',
      'data-ar-scams-playbook',
      'data-ar-scams-playbook-step',
      'data-ar-scams-catalog',
      'data-ar-scams-item-id',
      'data-ar-scams-detail',
      'data-ar-scams-detail-state',
      'data-ar-scams-rights',
      'data-ar-scams-print-guide',
      'data-ar-scams-print-item'
    ]) expect(scamsSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
