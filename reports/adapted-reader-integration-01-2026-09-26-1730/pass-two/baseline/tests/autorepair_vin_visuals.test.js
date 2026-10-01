// Auto Repair Shop — VIN identity bench science, state, visual, and privacy contract.

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
const ID = 'autoRepair';
const SOURCE_BUFFER = readFileSync(resolve(process.cwd(), CANONICAL));
const SOURCE = SOURCE_BUFFER.toString('utf8');
const VALID_HONDA = '1HGCM82633A004352';
const MISMATCH_HONDA = '1HGCM82633A123456';
const VALID_MCI_X = '1M8GDM9AXKP042788';
const SEGMENTS = ['wmi', 'vds', 'check', 'year', 'plant', 'sequence'];

function extractVinApi(source) {
  const start = source.indexOf('  var VIN_REGION =');
  const end = source.indexOf('  var MAINT_INTERVALS =', start);
  expect(start, 'VIN helper block not found').toBeGreaterThan(-1);
  expect(end, 'VIN helper block has no closing boundary').toBeGreaterThan(start);
  const block = source.slice(start, end);
  // Evaluate the production helpers together so every vector exercises the
  // real transliteration, weights, WMI table, and year cycle without copying
  // those rules into the test.
  // eslint-disable-next-line no-new-func
  return Function(
    '"use strict";\n' + block + '\nreturn {' +
      'VIN_WMI: VIN_WMI, VIN_YEAR_SEQUENCE: VIN_YEAR_SEQUENCE,' +
      'normalizeVin: normalizeVin, validateVinFormat: validateVinFormat,' +
      'calculateVinCheckDigit: calculateVinCheckDigit,' +
      'vinYearCandidates: vinYearCandidates, resolveWmi: resolveWmi,' +
      'splitVinFields: splitVinFields, decodeVin: decodeVin' +
    '};'
  )();
}

const VIN = extractVinApi(SOURCE);

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function vin(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'vin' }, extra || {})
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

let mountedRoots = [];
let previousActEnvironment;

async function mountVin(seed) {
  const config = window.StemLab._registry[ID];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  let latest = { autoRepair: Object.assign({ view: 'vin' }, seed || {}) };

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
    return config.render(ctx);
  }

  const root = ReactDOMClient.createRoot(mount);
  mountedRoots.push({ root, mount });
  await act(async () => root.render(React.createElement(Harness)));

  return {
    host: mount,
    state: () => latest.autoRepair,
    async click(element) {
      expect(element, 'VIN click target was not rendered').toBeTruthy();
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
  loadTool(CANONICAL, ID);
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

describe('VIN Decoder production science', () => {
  it('matches authoritative check-digit vectors, including the X remainder', () => {
    expect(VIN.calculateVinCheckDigit(VALID_HONDA)).toBe('3');
    expect(VIN.decodeVin(VALID_HONDA).check).toMatchObject({
      actual: '3', expected: '3', matches: true, required: true, status: 'pass'
    });

    expect(VIN.calculateVinCheckDigit(MISMATCH_HONDA)).toBe('7');
    expect(VIN.decodeVin(MISMATCH_HONDA).check).toMatchObject({
      actual: '3', expected: '7', matches: false, required: true, status: 'fail'
    });

    expect(VIN.calculateVinCheckDigit(VALID_MCI_X)).toBe('X');
    expect(VIN.decodeVin(VALID_MCI_X).check).toMatchObject({
      actual: 'X', expected: 'X', matches: true, required: true, status: 'pass'
    });
  });

  it('normalizes case but rejects forbidden letters, punctuation, and wrong lengths', () => {
    expect(VIN.normalizeVin('  ' + VALID_HONDA.toLowerCase() + '  ')).toBe(VALID_HONDA);
    expect(VIN.validateVinFormat(VALID_HONDA.toLowerCase())).toMatchObject({ valid: true, vin: VALID_HONDA });
    expect(VIN.validateVinFormat('1HGCM8263IA004352')).toMatchObject({ valid: false, code: 'forbidden' });
    expect(VIN.validateVinFormat('1HGCM8263-A004352')).toMatchObject({ valid: false, code: 'characters' });
    expect(VIN.validateVinFormat('1HGCM82633A00435')).toMatchObject({ valid: false, code: 'length' });
    expect(VIN.validateVinFormat(VALID_HONDA + '9')).toMatchObject({ valid: false, code: 'length' });
    expect(VIN.calculateVinCheckDigit('1HGCM8263IA004352')).toBeNull();
  });

  it('uses exact three-character WMIs and keeps look-alike assignments distinct', () => {
    expect(VIN.resolveWmi('1HG00000000000000')).toEqual({
      wmi: '1HG', maker: 'Honda', country: 'United States', scope: 'exact'
    });
    expect(VIN.resolveWmi('1HD00000000000000')).toEqual({
      wmi: '1HD', maker: 'Harley-Davidson', country: 'United States', scope: 'exact'
    });
    expect(VIN.resolveWmi('5YJ00000000000000')).toEqual({
      wmi: '5YJ', maker: 'Tesla', country: 'United States', scope: 'exact'
    });
    expect(VIN.resolveWmi('1ZZ00000000000000')).toMatchObject({
      wmi: '1ZZ', maker: 'Not in this small local WMI table', scope: 'unknown'
    });
    expect(Object.keys(VIN.VIN_WMI)).toEqual(expect.arrayContaining(['1HG', '1HD', '5YJ']));
  });

  it('preserves the 30-year model-year ambiguity instead of inventing one year', () => {
    expect(VIN.VIN_YEAR_SEQUENCE).toHaveLength(30);
    expect(VIN.vinYearCandidates('A', 2040)).toEqual([1980, 2010, 2040]);
    expect(VIN.vinYearCandidates('3', 2035)).toEqual([2003, 2033]);
    expect(VIN.vinYearCandidates('I', 2100)).toEqual([]);
    for (const years of [VIN.vinYearCandidates('A', 2040), VIN.vinYearCandidates('3', 2035)]) {
      for (let index = 1; index < years.length; index += 1) {
        expect(years[index] - years[index - 1]).toBe(30);
      }
    }
    expect(VIN.decodeVin(VALID_HONDA).yearCandidates).toContain(2003);
  });
});

describe('VIN Decoder renderer states and anatomy', () => {
  it('renders an empty dimensional identity station with labelled locations and a blank 17-cell plate', () => {
    const { html, host } = vin();
    const shell = host.querySelector('main.ar-vin-shell[data-ar-vin-shell][data-ar-vin-state="empty"]');
    const svg = shell.querySelector('[data-ar-vin-scene="location-map"] svg[role="img"]');
    const title = svg.querySelector('title[id]');
    const desc = svg.querySelector('desc[id]');
    const cells = [...shell.querySelectorAll('[data-ar-vin-cell]')];

    expect(shell).toBeTruthy();
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expect(shell.textContent).toContain('Read the stamped identity before you trust the listing.');
    expect(svg.getAttribute('aria-labelledby').split(/\s+/)).toEqual(expect.arrayContaining([title.id, desc.id]));
    expect(svg.querySelector('[data-ar-vin-object="dashboard-plate"]')).toBeTruthy();
    expect(svg.querySelector('[data-ar-vin-object="door-jamb-label"]')).toBeTruthy();
    expect(shell.querySelectorAll('[data-ar-vin-object="rivet"]')).toHaveLength(4);
    expect(shell.querySelector('[data-ar-vin-object="scanner"]')).toBeTruthy();
    expect(cells).toHaveLength(17);
    expect(cells.every((cell) => cell.dataset.empty === 'true' && cell.textContent === '·')).toBe(true);
    expect(shell.querySelector('[data-ar-vin-results]')).toBeNull();
    expect(shell.querySelector('[data-ar-vin-lookups]')).toBeNull();
    expect(html).not.toMatch(/\b(?:undefined|NaN|Infinity)\b|\[object Object\]/);
  });

  it('distinguishes partial, invalid, checksum-matched, and checksum-warning states', () => {
    const partial = vin({ vinInput: '1HGCM' }).host;
    const partialShell = partial.querySelector('[data-ar-vin-shell]');
    expect(partialShell.dataset.arVinState).toBe('partial');
    expect(partialShell.dataset.arVinCount).toBe('5');
    expect(partialShell.querySelector('[data-ar-vin-status]').textContent).toContain('12 characters remaining');
    expect(partialShell.querySelector('[data-ar-vin-detail]').dataset.arVinDetail).toBe('vds');
    expect(partialShell.querySelector('[data-ar-vin-results]')).toBeNull();

    for (const input of ['1HGCM8263IA004352', '1HGCM8263-A004352']) {
      const invalid = vin({ vinInput: input }).host.querySelector('[data-ar-vin-shell]');
      expect(invalid.dataset.arVinState).toBe('invalid');
      expect(invalid.querySelector('[data-ar-vin-input]').getAttribute('aria-invalid')).toBe('true');
      expect(invalid.querySelector('[data-ar-vin-status]').getAttribute('role')).toBe('alert');
      expect(invalid.querySelector('[data-ar-vin-results]')).toBeNull();
      expect(invalid.querySelector('[data-ar-vin-lookups]')).toBeNull();
    }

    const decoded = vin({ vinInput: VALID_HONDA }).host.querySelector('[data-ar-vin-shell]');
    expect(decoded.dataset.arVinState).toBe('decoded');
    expect(decoded.querySelector('[data-ar-vin-status]').textContent).toMatch(/formula matches/i);
    expect(decoded.querySelector('[data-ar-vin-results]')).toBeTruthy();

    const warning = vin({ vinInput: MISMATCH_HONDA }).host.querySelector('[data-ar-vin-shell]');
    expect(warning.dataset.arVinState).toBe('warning');
    expect(warning.querySelector('[data-ar-vin-status]').textContent).toMatch(/expected 7, found 3/i);
    expect(warning.querySelector('[data-ar-vin-confidence]').dataset.arVinConfidence).toBe('mismatch');
    expect(warning.querySelector('[data-ar-vin-results]')).toBeTruthy();
  });

  it('pins every plate position to the correct six-part VIN boundary', () => {
    const shell = vin({ vinInput: VALID_HONDA }).host.querySelector('[data-ar-vin-shell]');
    const cells = [...shell.querySelectorAll('[data-ar-vin-cell]')];
    const expectedGroups = [
      ...Array(3).fill('wmi'),
      ...Array(5).fill('vds'),
      'check', 'year', 'plant',
      ...Array(6).fill('sequence')
    ];

    expect(cells).toHaveLength(17);
    expect(cells.map((cell) => Number(cell.dataset.arVinPosition))).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1)
    );
    expect(cells.map((cell) => cell.dataset.arVinGroup)).toEqual(expectedGroups);
    expect(cells.map((cell) => cell.textContent).join('')).toBe(VALID_HONDA);
    for (const segment of SEGMENTS) {
      expect(cells.filter((cell) => cell.dataset.arVinGroup === segment)).toHaveLength(
        { wmi: 3, vds: 5, check: 1, year: 1, plant: 1, sequence: 6 }[segment]
      );
    }
  });

  it('renders six semantic segment controls and updates the ARIA-controlled detail panel', async () => {
    const app = await mountVin({ vinInput: VALID_HONDA, vinGroup: 'wmi' });
    let buttons = [...app.host.querySelectorAll('button[data-ar-vin-segment]')];
    const detail = app.host.querySelector('#ar-vin-group-detail');

    expect(buttons.map((button) => button.dataset.arVinSegment)).toEqual(SEGMENTS);
    expect(buttons).toHaveLength(6);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
    expect(buttons.every((button) => button.getAttribute('aria-controls') === detail.id)).toBe(true);
    expect(buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(detail.dataset.arVinDetail).toBe('wmi');
    expect(detail.getAttribute('aria-live')).toBe('polite');

    await app.click(buttons.find((button) => button.dataset.arVinSegment === 'sequence'));
    buttons = [...app.host.querySelectorAll('button[data-ar-vin-segment]')];
    const selected = buttons.find((button) => button.dataset.arVinSegment === 'sequence');
    const updatedDetail = app.host.querySelector('#ar-vin-group-detail');
    expect(app.state().vinGroup).toBe('sequence');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(buttons.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(updatedDetail.dataset.arVinDetail).toBe('sequence');
    expect(updatedDetail.querySelector('.ar-vin-detail-value').textContent).toBe('004352');
    expect(updatedDetail.textContent).toMatch(/manufacturer-specific/i);
  });

  it('shows qualified local results, confidence, and limitations without claiming vehicle proof', () => {
    const shell = vin({ vinInput: VALID_HONDA }).host.querySelector('[data-ar-vin-shell]');
    const results = shell.querySelector('[data-ar-vin-results]');
    const fields = [...results.querySelectorAll('[data-ar-vin-field]')];
    const byId = Object.fromEntries(fields.map((field) => [field.dataset.arVinField, field.textContent]));
    const caveat = shell.querySelector('.ar-vin-caveat[role="note"]');

    expect(fields.map((field) => field.dataset.arVinField)).toEqual([
      'region', 'maker', 'year', 'plant', 'sequence', 'check'
    ]);
    expect(byId.region).toMatch(/United States.*exact WMI/i);
    expect(byId.maker).toMatch(/Honda.*Exact local three-character WMI/i);
    expect(byId.year).toMatch(/2003.*30-year cycle/i);
    expect(byId.plant).toMatch(/A.*manufacturer-specific/i);
    expect(byId.sequence).toContain('004352');
    expect(byId.check).toMatch(/Matches.*3.*North-American/i);
    expect(shell.querySelector('[data-ar-vin-confidence="matched"]').textContent).toMatch(/checksum consistent/i);
    expect(caveat.textContent).toMatch(/cannot prove title status, collision history, odometer accuracy/i);
    expect(caveat.textContent).toMatch(/plate belongs to the vehicle/i);
    expect(caveat.textContent).toMatch(/repeat every 30 years/i);
    expect(caveat.textContent).toMatch(/descriptor, plant, and identifier meanings vary/i);
  });

  it('builds safe provider links only for complete VINs and explains the privacy boundary', () => {
    for (const state of [{}, { vinInput: '1HG' }, { vinInput: '1HGCM8263IA004352' }]) {
      const shell = vin(state).host.querySelector('[data-ar-vin-shell]');
      expect(shell.querySelector('[data-ar-vin-lookups]')).toBeNull();
      expect(shell.querySelector('[data-ar-vin-privacy]')).toBeNull();
    }

    const shell = vin({ vinInput: VALID_HONDA }).host.querySelector('[data-ar-vin-shell]');
    const links = [...shell.querySelectorAll('a[data-ar-vin-lookup]')];
    const byProvider = Object.fromEntries(links.map((link) => [link.dataset.arVinLookup, new URL(link.href)]));
    expect(links).toHaveLength(4);
    expect(Object.keys(byProvider)).toEqual(['recalls', 'vpic', 'carfax', 'iihs']);
    for (const link of links) {
      expect(link.target).toBe('_blank');
      expect((link.getAttribute('rel') || '').split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      expect(link.href.startsWith('https://')).toBe(true);
      expect(link.getAttribute('aria-label')).toMatch(/opens in a new tab/i);
    }
    expect(byProvider.recalls.hostname).toBe('www.nhtsa.gov');
    expect(byProvider.recalls.searchParams.get('vin')).toBe(VALID_HONDA);
    expect(byProvider.vpic.hostname).toBe('vpic.nhtsa.dot.gov');
    expect(byProvider.vpic.searchParams.get('vin')).toBe(VALID_HONDA);
    expect(byProvider.carfax.pathname).toBe('/vehicle/' + VALID_HONDA);
    expect(byProvider.iihs.href).toBe('https://www.iihs.org/ratings');

    const privacy = shell.querySelector('[data-ar-vin-privacy]');
    expect(privacy.textContent).toMatch(/Local until you choose a lookup/i);
    expect(privacy.textContent).toMatch(/shares the full VIN with that provider/i);
    expect(privacy.textContent).toMatch(/privacy policy/i);
  });
});

describe('VIN Decoder visual resilience', () => {
  it('pins dimensional depth, 17-column anatomy, touch targets, tablet, and mobile layouts', () => {
    vin();
    const style = document.getElementById('allo-ar-vin-css');
    const topRules = [...style.sheet.cssRules];
    const hero = ruleForSelector(topRules, '.ar-vin-hero');
    const stage = ruleForSelector(topRules, '.ar-vin-plate-stage');
    const plate = ruleForSelector(topRules, '.ar-vin-plate');
    const rail = ruleForSelector(topRules, '.ar-vin-cell-rail');
    const input = ruleForSelector(topRules, '.ar-vin-input');
    const button = ruleForSelector(topRules, '.ar-vin-button');
    const segment = ruleForSelector(topRules, '.ar-vin-segment');

    expect(style).toBeTruthy();
    expect(hero.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(hero.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(280);
    expect(hero.style.getPropertyValue('overflow')).toBe('hidden');
    expect(stage.style.getPropertyValue('perspective')).toMatch(/\d+px/);
    expect(stage.style.getPropertyValue('overflow')).toBe('hidden');
    expect(plate.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(plate.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(110);
    expect(rail.style.getPropertyValue('grid-template-columns')).toMatch(/repeat\(17/i);
    expect(parseFloat(input.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(button.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(segment.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-vin-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-vin-workbench').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-vin-result-grid').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');

    const mobile = rulesForMedia(topRules, /max-width:\s*620px/i);
    expect(ruleForSelector(mobile, '.ar-vin-input-row').style.getPropertyValue('grid-template-columns')).toBe('1fr 1fr');
    expect(ruleForSelector(mobile, '.ar-vin-input').style.getPropertyValue('grid-column')).toMatch(/1\s*\/\s*-1/);
    expect(ruleForSelector(mobile, '.ar-vin-plate').style.getPropertyValue('transform')).toBe('none');
    expect(ruleForSelector(mobile, '.ar-vin-segments').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');
    expect(ruleForSelector(mobile, '.ar-vin-result-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(mobile, '.ar-vin-link-grid').style.getPropertyValue('grid-template-columns')).toBe('1fr');
  });

  it('guards reduced motion, forced colors, printable evidence, source syntax, and desktop parity', () => {
    vin({ vinInput: VALID_HONDA });
    const style = document.getElementById('allo-ar-vin-css');
    const topRules = [...style.sheet.cssRules];

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const noAnimation = reduced.find((rule) =>
      hasSelector(rule, '.ar-vin-location-pulse') && hasSelector(rule, '.ar-vin-scan')
    );
    const noTransition = reduced.find((rule) =>
      hasSelector(rule, '.ar-vin-input') && hasSelector(rule, '.ar-vin-segment') && hasSelector(rule, '.ar-vin-plate')
    );
    const noTransform = reduced.find((rule) =>
      hasSelector(rule, '.ar-vin-segment[aria-pressed="true"]') && hasSelector(rule, '.ar-vin-link-card:hover')
    );
    expect(noAnimation.style.getPropertyValue('animation')).toBe('none');
    expect(noAnimation.style.getPropertyPriority('animation')).toBe('important');
    expect(noTransition.style.getPropertyValue('transition')).toBe('none');
    expect(noTransition.style.getPropertyPriority('transition')).toBe('important');
    expect(noTransform.style.getPropertyValue('transform')).toBe('none');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    const forcedSurfaces = forced.find((rule) =>
      hasSelector(rule, '.ar-vin-hero') && hasSelector(rule, '.ar-vin-plate') && hasSelector(rule, '.ar-vin-link-card')
    );
    const forcedCells = ruleForSelector(forced, '.ar-vin-cell');
    const forcedSelected = ruleForSelector(forced, '.ar-vin-segment[aria-pressed="true"]');
    expect(forcedSurfaces.style.getPropertyValue('background').toLowerCase()).toContain('canvas');
    expect(forcedSurfaces.style.getPropertyPriority('background')).toBe('important');
    expect(forcedSurfaces.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedCells.style.getPropertyValue('color').toLowerCase()).toBe('canvastext');
    expect(forcedCells.style.getPropertyPriority('color')).toBe('important');
    expect(forcedSelected.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) =>
      hasSelector(rule, '.ar-vin-input-row') && hasSelector(rule, '.ar-vin-lookups') && hasSelector(rule, '.ar-vin-scan')
    );
    const printPlate = [...print].reverse().find((rule) =>
      hasSelector(rule, '.ar-vin-plate') && rule.style.getPropertyValue('transform')
    );
    const printableEvidence = print.find((rule) =>
      hasSelector(rule, '.ar-vin-results') && hasSelector(rule, '.ar-vin-caveat')
    );
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printPlate.style.getPropertyValue('transform')).toBe('none');
    expect(printableEvidence.style.getPropertyValue('display')).not.toBe('none');
    expect(printableEvidence.cssText).toMatch(/break-inside:\s*avoid/);

    expect(SOURCE.match(/function renderVin\(\)/g)).toHaveLength(1);
    for (const hook of [
      'data-ar-vin-shell', 'data-ar-vin-state', 'data-ar-vin-scene', 'data-ar-vin-object',
      'data-ar-vin-input', 'data-ar-vin-status', 'data-ar-vin-cell', 'data-ar-vin-position',
      'data-ar-vin-group', 'data-ar-vin-segment', 'data-ar-vin-detail', 'data-ar-vin-results',
      'data-ar-vin-confidence', 'data-ar-vin-lookups', 'data-ar-vin-lookup', 'data-ar-vin-privacy'
    ]) expect(SOURCE).toContain(hook);
    expect(() => Function(SOURCE)).not.toThrow();
    expect(Buffer.compare(
      SOURCE_BUFFER,
      readFileSync(resolve(process.cwd(), MIRROR))
    )).toBe(0);
  });
});
