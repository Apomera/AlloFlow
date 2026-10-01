// Auto Repair Shop - dimensional Diagnose scanner visual, state, and fallback contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_DIAGNOSE_SCANNER_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const VIEWS = ['overview', 'obd', 'listen', 'listenQuiz', 'fluid', 'visual'];
const CHANNELS = [
  { id: 'obd', name: 'OBD-II data', zone: 'Cabin data link', cue: 'Stored codes + live data' },
  { id: 'listen', name: 'Sound pattern', zone: 'Engine + chassis', cue: 'When, where, load, speed' },
  { id: 'fluid', name: 'Fluid trace', zone: 'Engine + underbody', cue: 'Location, color, smell, level' },
  { id: 'visual', name: 'Visual sweep', zone: 'Whole vehicle', cue: 'Leaks, wear, rust, loose parts' }
];

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function diagnose(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'diagnose' }, extra || {})
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

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair dimensional Diagnose scanner', () => {
  it('renders one labelled perspective vehicle with four complete evidence channels', () => {
    const { html, host } = diagnose({ dxView: 'overview' });
    const shell = host.querySelector('main.ar-diagnose-shell[data-ar-diagnose-shell]');
    const scanner = shell.querySelector('section[data-ar-diagnose-scanner]');
    const scene = scanner.querySelector('[data-ar-diagnose-scanner-scene]');
    const svg = scene.querySelector('svg[role="img"]');
    const targets = [...scene.querySelectorAll('button[data-ar-diagnose-scanner-target]')];
    const readouts = [...scanner.querySelectorAll('[data-ar-diagnose-scanner-readout]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(scanner.getAttribute('aria-labelledby')).toBe('autorepair-diagnose-scanner-title');
    expect(host.querySelector('#autorepair-diagnose-scanner-title')).toBeTruthy();
    expect(svg.querySelector('title').textContent).toContain('vehicle diagnostic scanner');
    expect(svg.querySelector('desc').textContent).toContain('Four overlaid buttons');
    for (const object of ['vehicle', 'systems', 'scan-tool', 'fluid-trace']) {
      expect(svg.querySelector('[data-ar-diagnose-scanner-object="' + object + '"]')).toBeTruthy();
    }
    expect(targets.map((button) => button.dataset.arDiagnoseScannerTarget)).toEqual(CHANNELS.map((channel) => channel.id));
    expect(targets.every((button) => button.type === 'button' && button.getAttribute('aria-label')?.startsWith('Open '))).toBe(true);
    expect(targets.every((button) => button.querySelector('.ar-diagnose-scanner-marker').getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(readouts.map((node) => node.dataset.arDiagnoseScannerReadout)).toEqual(CHANNELS.map((channel) => channel.id));
    expect(shell.querySelectorAll('article[data-ar-diagnose-channel]')).toHaveLength(4);
    expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('maps every target and readout to its exact vehicle zone and evidence cue', () => {
    const { host } = diagnose();
    for (const channel of CHANNELS) {
      const target = host.querySelector('[data-ar-diagnose-scanner-target="' + channel.id + '"]');
      const readout = host.querySelector('[data-ar-diagnose-scanner-readout="' + channel.id + '"]');

      expect(target.textContent).toContain(channel.name);
      expect(target.textContent).toContain(channel.zone);
      expect(target.getAttribute('aria-label')).toContain(channel.zone);
      expect(target.getAttribute('aria-label')).toContain(channel.cue);
      expect(readout.textContent).toContain(channel.name);
      expect(readout.textContent).toContain(channel.zone);
      expect(readout.textContent).toContain(channel.cue);
    }
  });

  it('clamps stale saved modes to overview while preserving every authored mode', () => {
    for (const dxView of ['stale', ' ', 42, {}, [], null]) {
      const { html, host } = diagnose({ dxView });
      const panel = host.querySelector('[data-ar-diagnose-panel="overview"]');
      const active = host.querySelector('[data-ar-diagnose-tab="overview"]');
      expect(panel).toBeTruthy();
      expect(panel.querySelector('[data-ar-diagnose-scanner]')).toBeTruthy();
      expect(active.getAttribute('aria-selected')).toBe('true');
      expect(active.getAttribute('tabindex')).toBe('0');
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }

    for (const dxView of VIEWS) {
      const { host } = diagnose({ dxView });
      expect(host.querySelector('[data-ar-diagnose-panel="' + dxView + '"]')).toBeTruthy();
      expect(host.querySelector('[data-ar-diagnose-tab="' + dxView + '"][aria-selected="true"]')).toBeTruthy();
    }
  });

  it('preserves hierarchy, unique SVG IDs, and marker contrast across every theme', () => {
    const themes = [
      { value: { isDark: false, isContrast: false }, text: '#0f172a', marker: '#ffffff' },
      { value: { isDark: true, isContrast: false }, text: '#f1f5f9', marker: '#000000' },
      { value: { isDark: false, isContrast: true }, text: '#ffffff', marker: '#000000' }
    ];

    for (const theme of themes) {
      const { html, host } = diagnose({}, theme.value);
      const shell = host.querySelector('[data-ar-diagnose-shell]');
      const scanner = shell.querySelector('[data-ar-diagnose-scanner]');
      const targets = [...scanner.querySelectorAll('[data-ar-diagnose-scanner-target]')];
      const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);

      expect(shell.getAttribute('style')).toContain('color:' + theme.text);
      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expect(targets).toHaveLength(4);
      expect(targets.every((button) => button.querySelector('.ar-diagnose-scanner-marker').getAttribute('style').includes('color:' + theme.marker))).toBe(true);
      expect(scanner.querySelectorAll('svg[role="img"]')).toHaveLength(1);
      expect(new Set(ids).size).toBe(ids.length);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('guards perspective geometry, touch targets, and both responsive breakpoints through CSSOM', () => {
    diagnose();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const grid = ruleForSelector(topRules, '.ar-diagnose-scanner-grid');
    const stage = ruleForSelector(topRules, '.ar-diagnose-scanner-stage');
    const frame = ruleForSelector(topRules, '.ar-diagnose-scanner-frame');
    const svg = ruleForSelector(topRules, '.ar-diagnose-scanner-svg');
    const target = ruleForSelector(topRules, '.ar-diagnose-scanner-target');

    expect(grid.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(stage.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(350);
    expect(stage.style.getPropertyValue('perspective')).toBe('1100px');
    expect(frame.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(frame.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(svg.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(318);
    expect(parseFloat(target.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*860px/i);
    expect(ruleForSelector(tablet, '.ar-diagnose-scanner-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-diagnose-scanner-rail').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');

    const small = rulesForMedia(topRules, /max-width:\s*560px/i);
    const smallGrid = small.find((rule) => hasSelector(rule, '.ar-diagnose-scanner-grid') && hasSelector(rule, '.ar-diagnose-scanner-rail'));
    expect(smallGrid.style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(parseFloat(ruleForSelector(small, '.ar-diagnose-scanner-stage').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(300);
    expect(ruleForSelector(small, '.ar-diagnose-scanner-target-copy').style.getPropertyValue('position')).toBe('absolute');
  });

  it('guards reduced-motion, forced-color, and print fallbacks through CSSOM', () => {
    diagnose();
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedMotion = reduced.find((rule) => hasSelector(rule, '.ar-diagnose-scanner-beam') && hasSelector(rule, '.ar-diagnose-scanner-marker::after'));
    const reducedHover = reduced.find((rule) => hasSelector(rule, '.ar-diagnose-scanner-stage:hover .ar-diagnose-scanner-frame') && hasSelector(rule, '.ar-diagnose-scanner-target:hover'));
    expect(reducedMotion.style.getPropertyValue('animation')).toBe('none');
    expect(reducedMotion.style.getPropertyPriority('animation')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedBoundary = forced.find((rule) => hasSelector(rule, '.ar-diagnose-scanner') && hasSelector(rule, '.ar-diagnose-scanner-stage') && hasSelector(rule, '.ar-diagnose-scanner-target'));
    const forcedFocus = ruleForSelector(forced, '.ar-diagnose-scanner-target:focus-visible');
    const forcedMarker = forced.find((rule) =>
      hasSelector(rule, '.ar-diagnose-scanner-marker') && rule.style.getPropertyValue('background')
    );
    const forcedVehicle = forced.find((rule) => hasSelector(rule, '.ar-diagnose-scanner-vehicle path') && hasSelector(rule, '.ar-diagnose-scanner-vehicle ellipse'));
    expect(forcedBoundary.style.getPropertyValue('border').toLowerCase()).toContain('canvastext');
    expect(forcedFocus.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');
    expect(forcedMarker.style.getPropertyValue('background').toLowerCase()).toContain('highlight');
    expect(forcedVehicle.style.getPropertyValue('fill').toLowerCase()).toContain('canvas');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) => hasSelector(rule, '.ar-diagnose-scanner-hotspots') && hasSelector(rule, '.ar-diagnose-scanner-beam'));
    const printFrame = ruleForSelector(print, '.ar-diagnose-scanner-frame');
    const printScene = print.find((rule) => hasSelector(rule, '.ar-diagnose-scanner-stage::before') && hasSelector(rule, '.ar-diagnose-scanner-stage::after'));
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printFrame.style.getPropertyValue('transform')).toBe('none');
    expect(printScene.style.getPropertyValue('display')).toBe('none');
  });

  it('preserves exact channel routing, visual hooks, syntax, and mirror parity', () => {
    const start = SOURCE.indexOf('function renderDiagnose()');
    const end = SOURCE.indexOf('function renderRepair()', start);
    const diagnoseSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderDxScanner\(channels\)/g)).toHaveLength(1);
    expect(diagnoseSource).toContain("var DX_TAB_IDS = ['overview', 'obd', 'listen', 'listenQuiz', 'fluid', 'visual'];");
    expect(diagnoseSource).toContain("DX_TAB_IDS.indexOf(requestedDxView) >= 0 ? requestedDxView : 'overview'");
    expect(diagnoseSource).toContain("onClick: function() { upd('dxView', channel.id); arAnnounce(channel.name + ' diagnostic channel opened.'); }");
    for (const channel of CHANNELS) expect(diagnoseSource).toContain("id: '" + channel.id + "'");
    for (const hook of [
      'data-ar-diagnose-scanner',
      'data-ar-diagnose-scanner-scene',
      'data-ar-diagnose-scanner-object',
      'data-ar-diagnose-scanner-target',
      'data-ar-diagnose-scanner-readout'
    ]) expect(diagnoseSource).toContain(hook);
    expect(diagnoseSource).not.toMatch(/\b(?:THREE|WebGLRenderer|canvas\.getContext)\b/);
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
