// Auto Repair Shop - dimensional dashboard service-bay visual and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_MENU_BAY_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const TARGETS = ['underhood', 'tyre', 'repairbay'];

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function menu(extra, theme) {
  const html = renderTool(ID, { autoRepair: Object.assign({}, extra || {}) }, theme);
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

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair dimensional dashboard service bay', () => {
  it('renders one labelled perspective garage with complete vehicle, lift, cart, and station controls', () => {
    const { html, host } = menu();
    const dashboard = host.querySelector('[data-ar-menu-dashboard]');
    const hero = dashboard.querySelector('[data-ar-menu-hero]');
    const bay = hero.querySelector('aside[data-ar-menu-bay][aria-label="Interactive 3D service bay shortcuts"]');
    const scene = bay.querySelector('[data-ar-menu-bay-scene]');
    const svg = scene.querySelector('svg[role="img"]');
    const targets = [...bay.querySelectorAll('button[data-ar-menu-bay-target]')];

    expect(dashboard).toBeTruthy();
    expect(dashboard.querySelectorAll('h1')).toHaveLength(1);
    expect(bay.getAttribute('data-ar-print-hide')).toBe('true');
    expect(svg.querySelector('title').textContent).toContain('automotive service bay');
    expect(svg.querySelector('desc').textContent).toContain('Three overlaid buttons');
    expect(svg.querySelector('[data-ar-menu-bay-object="vehicle"]')).toBeTruthy();
    expect(svg.querySelector('[data-ar-menu-bay-object="lift"]')).toBeTruthy();
    expect(svg.querySelector('[data-ar-menu-bay-object="diagnostic-cart"]')).toBeTruthy();
    expect(targets.map((button) => button.dataset.arMenuBayTarget)).toEqual(TARGETS);
    expect(targets.every((button) => button.type === 'button' && button.getAttribute('aria-label')?.startsWith('Open '))).toBe(true);
    expect(targets.every((button) => button.querySelector('.ar-menu-bay-hotspot-marker').getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(bay.querySelector('[data-ar-menu-bay-status]').textContent).toContain('3 practice bays ready');
    expect(bay.querySelector('[data-ar-menu-bay-status]').textContent).toContain('Progress saves automatically');
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('surfaces exact saved progress in each matching 3D practice station', () => {
    const { html, host } = menu({
      uhSeen: { battery: true, alternator: true },
      tcDone: ['secure_car', 'retrieve_tools'],
      rbDone: { seeded_case: { verdict: 'incorrect' } }
    });
    const underhood = host.querySelector('[data-ar-menu-bay-target="underhood"]');
    const tyre = host.querySelector('[data-ar-menu-bay-target="tyre"]');
    const repairbay = host.querySelector('[data-ar-menu-bay-target="repairbay"]');

    expect(Number(underhood.dataset.arMenuBayProgress)).toBe(17);
    expect(Number(tyre.dataset.arMenuBayProgress)).toBe(15);
    expect(Number(repairbay.dataset.arMenuBayProgress)).toBe(0);
    expect(underhood.getAttribute('aria-label')).toContain('2/12 complete');
    expect(tyre.getAttribute('aria-label')).toContain('2/13 complete');
    expect(repairbay.getAttribute('aria-label')).toContain('0/7 complete');
    expect(host.querySelector('[data-ar-primary-action="underhood"]')).toBeTruthy();
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('keeps every displayed station progress value bounded for oversized saved records', () => {
    const manySeen = {};
    for (let index = 0; index < 40; index += 1) manySeen['part-' + index] = true;
    const { html, host } = menu({
      uhSeen: manySeen,
      tcDone: Array.from({ length: 40 }, (_, index) => 'step-' + index),
      rbDone: { ghost: { verdict: 'correct' } }
    });
    const progressValues = [...host.querySelectorAll('[data-ar-menu-bay-progress]')]
      .map((button) => Number(button.dataset.arMenuBayProgress));

    expect(progressValues).toHaveLength(3);
    expect(progressValues.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)).toBe(true);
    expect(progressValues[0]).toBe(100);
    expect(progressValues[1]).toBe(100);
    expect(progressValues[2]).toBe(0);
    expect(html).not.toMatch(/\b(?:undefined|NaN)/);
  });

  it('preserves hierarchy, target visibility, and marker contrast across every theme', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', marker: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', marker: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', marker: '#000000' }
    ];

    for (const theme of themes) {
      const { html, host } = menu({
        uhSeen: { battery: true },
        tcDone: ['secure_car'],
        rbDone: { seeded_case: { verdict: 'incorrect' } }
      }, theme.value);
      const dashboard = host.querySelector('[data-ar-menu-dashboard]');
      const bay = dashboard.querySelector('[data-ar-menu-bay]');
      const ids = [...dashboard.querySelectorAll('[id]')].map((node) => node.id);
      const targets = [...bay.querySelectorAll('[data-ar-menu-bay-target]')];

      expect(dashboard.getAttribute('style')).toContain('color:' + theme.text);
      expect(dashboard.querySelectorAll('h1')).toHaveLength(1);
      expect(targets).toHaveLength(3);
      expect(targets.every((button) => button.offsetParent === null || button.getAttribute('style').includes('display') || button.tagName === 'BUTTON')).toBe(true);
      expect(targets.every((button) => button.querySelector('.ar-menu-bay-hotspot-marker').getAttribute('style').includes('color:' + theme.marker))).toBe(true);
      expect(bay.querySelectorAll('svg[role="img"]')).toHaveLength(1);
      expect(new Set(ids).size).toBe(ids.length);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('guards perspective geometry, touch targets, and both responsive breakpoints through CSSOM', () => {
    menu();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const heroTop = ruleForSelector(topRules, '.ar-menu-hero-top');
    const scene = ruleForSelector(topRules, '.ar-menu-bay-scene');
    const frame = ruleForSelector(topRules, '.ar-menu-bay-frame');
    const svg = ruleForSelector(topRules, '.ar-menu-bay-svg');
    const hotspot = ruleForSelector(topRules, '.ar-menu-bay-hotspot');

    expect(heroTop.style.getPropertyValue('display')).toBe('grid');
    expect(heroTop.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(scene.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(290);
    expect(scene.style.getPropertyValue('perspective')).toBe('1000px');
    expect(frame.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(frame.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(svg.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(290);
    expect(parseFloat(hotspot.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-menu-hero-top').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-menu-bay').style.getPropertyValue('max-width')).toBe('720px');

    const small = rulesForMedia(topRules, /max-width:\s*480px/i);
    const smallScene = small.find((rule) => hasSelector(rule, '.ar-menu-bay-scene') && hasSelector(rule, '.ar-menu-bay-svg'));
    expect(parseFloat(smallScene.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(260);
    expect(ruleForSelector(small, '.ar-menu-bay-hotspot-copy small').style.getPropertyValue('display')).toBe('none');
  });

  it('guards reduced-motion, forced-color, and print fallbacks through CSSOM', () => {
    menu();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransitions = reduced.find((rule) =>
      hasSelector(rule, '.ar-menu-bay-frame') &&
      hasSelector(rule, '.ar-menu-bay-car') &&
      hasSelector(rule, '.ar-menu-bay-hotspot')
    );
    const reducedPulse = ruleForSelector(reduced, '.ar-menu-bay-hotspot-marker::after');
    const reducedHover = ruleForSelector(reduced, '.ar-menu-bay-hotspot:hover');
    expect(reducedTransitions.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransitions.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedPulse.style.getPropertyValue('animation')).toBe('none');
    expect(reducedPulse.style.getPropertyPriority('animation')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => hasSelector(rule, '.ar-menu-bay') && hasSelector(rule, '.ar-menu-bay-scene') && hasSelector(rule, '.ar-menu-bay-hotspot'));
    const forcedFocus = ruleForSelector(forced, '.ar-menu-bay-hotspot:focus-visible');
    const forcedMarker = ruleForSelector(forced, '.ar-menu-bay-hotspot-marker');
    const forcedGeometry = forced.find((rule) => hasSelector(rule, '.ar-menu-bay-car path') && hasSelector(rule, '.ar-menu-bay-lift path') && hasSelector(rule, '.ar-menu-bay-cart rect'));
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedMarker.style.getPropertyValue('background').toLowerCase()).toContain('highlight');
    expect(forcedGeometry.style.getPropertyValue('fill').toLowerCase()).toContain('canvas');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = ruleForSelector(print, '[data-ar-print-hide="true"]');
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
  });

  it('preserves exact station routing, visual hooks, syntax, and mirror parity', () => {
    const start = SOURCE.indexOf('function renderMenu()');
    const end = SOURCE.indexOf('function renderDiagnose()', start);
    const menuSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderMenuBay\(\)/g)).toHaveLength(1);
    expect(menuSource).toContain("{ id: 'underhood'");
    expect(menuSource).toContain("{ id: 'tyre'");
    expect(menuSource).toContain("{ id: 'repairbay'");
    expect(menuSource).toContain("onClick: function() { setView(target.id); }");
    for (const hook of [
      'data-ar-menu-bay',
      'data-ar-menu-bay-scene',
      'data-ar-menu-bay-object',
      'data-ar-menu-bay-target',
      'data-ar-menu-bay-progress',
      'data-ar-menu-bay-status'
    ]) expect(menuSource).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
