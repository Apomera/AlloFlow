// Auto Repair Shop - Repair Decision Bay state, dimensional visual, and fallback contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_ROI_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('Missing function ' + name);
  const bodyStart = source.indexOf('{', start + marker.length);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
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
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error('Unterminated function ' + name);
}

function extractAssignedValue(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error('Missing ' + name + ' fixture');
  const start = source.indexOf('[', markerAt + marker.length);
  let depth = 0;
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
    if (character === '[' || character === '{') depth += 1;
    if (character === ']' || character === '}') {
      depth -= 1;
      if (depth === 0) return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const NORMALIZE = Function(extractFunction(SOURCE, 'arNormalizeROIState') + '; return arNormalizeROIState;')();
const CALCULATE = Function(extractFunction(SOURCE, 'repairROI') + '; return repairROI;')();
const PRESETS = extractAssignedValue(SOURCE, 'REPAIR_DECISION_PRESETS');

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function decision(extra, theme) {
  const html = renderTool(ID, { autoRepair: Object.assign({ view: 'roi' }, extra || {}) }, theme);
  return { html, host: hostFor(html) };
}

function expectLabelled(host, region) {
  expect(region).toBeTruthy();
  const headingId = region.getAttribute('aria-labelledby');
  expect(headingId).toBeTruthy();
  expect(host.querySelector('#' + headingId)).toBeTruthy();
}

function mediaText(rule) {
  return rule.conditionText || rule.media?.mediaText || '';
}

function rulesForMedia(topRules, pattern) {
  return topRules.filter((rule) => pattern.test(mediaText(rule))).flatMap((rule) => [...(rule.cssRules || [])]);
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

describe('AutoRepair Repair Decision Bay', () => {
  it('renders an honest empty working surface with labelled native inputs and no premature result', () => {
    const { html, host } = decision();
    const shell = host.querySelector('main.ar-roi-shell[data-ar-roi-shell][data-ar-roi-state="empty"]');
    const hero = shell.querySelector('[data-ar-roi-hero]');
    const form = shell.querySelector('form[data-ar-roi-form]');
    const inputs = [...form.querySelectorAll('input[type="number"]')];

    expect(shell.dataset.arRoiCompareState).toBe('empty');
    expect(shell.querySelectorAll('h1')).toHaveLength(1);
    expectLabelled(host, hero);
    expectLabelled(host, form);
    expect(inputs).toHaveLength(7);
    expect(inputs.filter((input) => input.required)).toHaveLength(2);
    for (const input of inputs) {
      expect(input.id).toBeTruthy();
      expect(form.querySelector('label[for="' + input.id + '"]')).toBeTruthy();
      expect(Number.isFinite(Number(input.min))).toBe(true);
      expect(Number.isFinite(Number(input.max))).toBe(true);
      const described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      expect(described.length).toBeGreaterThan(0);
      expect(described.every((id) => host.querySelector('#' + id))).toBe(true);
    }
    expect(shell.querySelector('[data-ar-roi-empty="empty"]')).toBeTruthy();
    expect(shell.querySelector('[data-ar-roi-workbench]')).toBeNull();
    expect(shell.querySelector('[data-ar-roi-result]')).toBeNull();
    expect(shell.querySelector('[data-ar-roi-evidence]')).toBeNull();
    expect(shell.querySelector('[data-ar-roi-reference]')).toBeTruthy();
    for (const button of shell.querySelectorAll('button')) expect(button.type).toBe('button');
    expectCleanMarkup(html);
    expect(html).not.toMatch(/math favors|recommendation\s*<\/div>/i);
  });

  it('strictly distinguishes incomplete, invalid, quote-share, partial comparison, and two-path states', () => {
    const cases = [
      [{ roiVehVal: '8500' }, 'incomplete', 'empty', false, 0],
      [{ roiVehVal: '8500junk', roiRepCost: '900' }, 'invalid', 'empty', false, 0],
      [{ roiVehVal: '8500', roiRepCost: '900' }, 'ready-share', 'empty', true, 1],
      [{ roiVehVal: '8500', roiRepCost: '900', roiReplacement: '18000' }, 'ready-share', 'partial', true, 1],
      [{ roiVehVal: '8500', roiRepCost: '900', roiReplacement: '18000', roiAsIsOffer: '7000' }, 'ready-compare', 'ready', true, 2]
    ];
    for (const [extra, state, compareState, hasWorkbench, stage] of cases) {
      const { html, host } = decision(extra);
      const shell = host.querySelector('[data-ar-roi-shell]');
      expect(shell.dataset.arRoiState).toBe(state);
      expect(shell.dataset.arRoiCompareState).toBe(compareState);
      expect(Boolean(shell.querySelector('[data-ar-roi-workbench]'))).toBe(hasWorkbench);
      expect(Boolean(shell.querySelector('[data-ar-roi-result]'))).toBe(hasWorkbench);
      expect(Boolean(shell.querySelector('[data-ar-roi-evidence]'))).toBe(hasWorkbench);
      expect(shell.querySelector('[data-ar-roi-stages]').dataset.arRoiStages).toBe(stage + '/3');
      expect(shell.querySelectorAll('[data-ar-roi-stage]')).toHaveLength(3);
      if (state === 'invalid') expect(shell.querySelector('[data-ar-roi-status][role="alert"]')).toBeTruthy();
      expectCleanMarkup(html);
    }
    const prepared = decision({
      roiVehVal: '8500', roiRepCost: '900', roiReplacement: '18000', roiAsIsOffer: '7000',
      roiEvidence: { diagnosis: true, secondQuote: true, warranty: true, asIsOffer: true }
    });
    expect(prepared.host.querySelector('[data-ar-roi-stages]').dataset.arRoiStages).toBe('3/3');
    expect(prepared.host.querySelectorAll('[data-ar-roi-stage-state="complete"]')).toHaveLength(3);
  });

  it('rejects malformed scalars, preserves valid zero and cents, and strictly normalizes context state', () => {
    const malformed = ['8500junk', '1e4', '-1', '1.234', Infinity, NaN, {}, []];
    for (const vehicleValue of malformed) {
      const state = NORMALIZE({ vehicleValue, repairCost: '900' });
      expect(state.state).toBe('invalid');
      expect(state.vehicleValue.valid).toBe(false);
    }

    const state = NORMALIZE({
      vehicleValue: '8500.25', repairCost: '900.50', loomingCost: '0',
      replacementCost: '18000.75', asIsOffer: '0', age: '0', miles: '0',
      attachment: 'ghost', lens: 'ghost', evidence: { diagnosis: true, secondQuote: 1, warranty: 'true', asIsOffer: false, ghost: true }
    });
    expect(state.state).toBe('ready-compare');
    expect(state.vehicleValue.raw).toBe('8500.25');
    expect(state.loomingCost.value).toBe(0);
    expect(state.asIsOffer.value).toBe(0);
    expect(state.age.value).toBe(0);
    expect(state.miles.value).toBe(0);
    expect(state.attachment).toBe('medium');
    expect(state.lens).toBe('cost');
    expect(state.evidence).toEqual({ diagnosis: true, secondQuote: false, warranty: false, asIsOffer: false });
    expect(state.evidenceCount).toBe(1);

    const rendered = decision({ roiVehVal: '8500.25', roiRepCost: '900.50', roiLooming: '0', roiReplacement: '18000.75', roiAsIsOffer: '0', roiAge: '0', roiMiles: '0' });
    expect(rendered.host.querySelector('#ar-roi-vehicle-value').value).toBe('8500.25');
    expect(rendered.host.querySelector('#ar-roi-looming-cost').value).toBe('0');
    expect(rendered.host.querySelector('#ar-roi-as-is-offer').value).toBe('0');
    expectCleanMarkup(rendered.html);
  });

  it('resolves exact cost markers without allowing age, mileage, or attachment to become hidden arithmetic', () => {
    const scenarios = [
      [2999, 'fix', 29.99],
      [3000, 'fix-cautiously', 30],
      [4999, 'fix-cautiously', 49.99],
      [5000, 'consider-selling', 50],
      [12500, 'consider-selling', 125]
    ];
    for (const [repairCost, verdict, percent] of scenarios) {
      const result = CALCULATE({ vehicleValue: 10000, repairCost, loomingCost: 0, attachment: 'medium' });
      expect(result.verdict).toBe(verdict);
      expect(result.repairPercent).toBe(percent);
    }
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 2000, loomingCost: 4999 }).combinedPercent).toBe(69.99);
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 2000, loomingCost: 4999 }).verdict).toBe('fix');
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 2000, loomingCost: 5000 }).verdict).toBe('consider-selling');
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 2999.99 }).repairPercent).toBe(29.99);
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 4999.99 }).repairPercent).toBe(49.99);
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 2000, loomingCost: 4999.99 }).combinedPercent).toBe(69.99);

    const baseline = CALCULATE({ vehicleValue: 10000, repairCost: 2000, loomingCost: 500, age: 4, miles: 40000, attachment: 'medium' });
    for (const context of [
      { age: 25, miles: 40000, attachment: 'medium' },
      { age: 4, miles: 400000, attachment: 'medium' },
      { age: 25, miles: 400000, attachment: 'high' },
      { age: 4, miles: 40000, attachment: 'low' }
    ]) {
      const compared = CALCULATE({ vehicleValue: 10000, repairCost: 2000, loomingCost: 500, ...context });
      expect(compared.verdict).toBe(baseline.verdict);
      expect(compared.repairPercent).toBe(baseline.repairPercent);
      expect(compared.combinedPercent).toBe(baseline.combinedPercent);
      expect(compared.totalKnown).toBe(baseline.totalKnown);
    }
  });

  it('keeps quote-share heuristics separate from actual repair-versus-replacement cash arithmetic', () => {
    const result = CALCULATE({
      vehicleValue: 8500, repairCost: 900, loomingCost: 300,
      replacementCost: 18000, asIsOffer: 7000, age: 9, miles: 110000, attachment: 'medium'
    });
    expect(result.totalKnown).toBe(1200);
    expect(result.hasComparison).toBe(true);
    expect(result.replaceUpfront).toBe(11000);
    expect(result.cashDifference).toBe(9800);

    const { html, host } = decision({
      roiVehVal: '8500', roiRepCost: '900', roiLooming: '300',
      roiReplacement: '18000', roiAsIsOffer: '7000'
    });
    const shell = host.querySelector('[data-ar-roi-shell]');
    const repairPath = shell.querySelector('[data-ar-roi-path="repair"]');
    const replacePath = shell.querySelector('[data-ar-roi-path="replace"]');
    expect(shell.dataset.arRoiState).toBe('ready-compare');
    expect(repairPath.textContent).toContain('$1,200');
    expect(replacePath.textContent).toContain('$11,000');
    expect(shell.querySelector('[data-ar-roi-compare-gap="ready"]').textContent).toMatch(/\$9,800.*more than/i);
    expect(shell.textContent).toMatch(/not a recommendation/i);
    expectCleanMarkup(html);

    const partial = decision({ roiVehVal: '8500', roiRepCost: '900', roiReplacement: '18000' });
    expect(partial.host.querySelector('[data-ar-roi-path="replace"]').textContent).toMatch(/not ready/i);
    expect(partial.host.querySelector('[data-ar-roi-status]').textContent).toMatch(/comparison incomplete|both replacement fields/i);

    const tie = decision({ roiVehVal: '10000', roiRepCost: '1000', roiLooming: '0', roiReplacement: '5000', roiAsIsOffer: '4000' });
    expect(tie.host.querySelector('[data-ar-roi-compare-gap]').textContent).toMatch(/cash paths are equal/i);
    expect(tie.host.querySelector('[data-ar-roi-compare-gap]').textContent).not.toMatch(/\$0 more than/i);
    const lower = decision({ roiVehVal: '10000', roiRepCost: '1000', roiLooming: '0', roiReplacement: '1000', roiAsIsOffer: '500' });
    expect(lower.host.querySelector('[data-ar-roi-compare-gap]').textContent).toMatch(/\$500.*less than/i);
    const decimalTie = decision({ roiVehVal: '10000', roiRepCost: '100.10', roiLooming: '200.20', roiReplacement: '500.50', roiAsIsOffer: '200.20' });
    expect(decimalTie.host.querySelector('[data-ar-roi-compare-gap]').textContent).toMatch(/cash paths are equal/i);
    expect(CALCULATE({ vehicleValue: 10000, repairCost: 100.10, loomingCost: 200.20, replacementCost: 500.50, asIsOffer: 200.20 }).cashDifference).toBe(0);
  });

  it('shows exact meter values while capping only visual geometry at the rail edge', () => {
    const exact = decision({ roiVehVal: '10000', roiRepCost: '5000', roiLooming: '2000' });
    const quote = exact.host.querySelector('[data-ar-roi-meter="quote-share"]');
    const combined = exact.host.querySelector('[data-ar-roi-meter="known-exposure"]');
    expect(quote.querySelector('[role="meter"]').getAttribute('aria-valuetext')).toContain('50%');
    expect(quote.querySelector('[data-ar-roi-object="repair-block"]').style.width).toBe('50%');
    expect(combined.querySelector('[role="meter"]').getAttribute('aria-valuetext')).toContain('70%');
    expect(combined.querySelector('[data-ar-roi-object="looming-block"]').style.width).toBe('70%');

    const over = decision({ roiVehVal: '10000', roiRepCost: '12500' });
    const overMeter = over.host.querySelector('[data-ar-roi-meter="quote-share"] [role="meter"]');
    const overBar = over.host.querySelector('[data-ar-roi-object="repair-block"]');
    expect(overMeter.getAttribute('aria-valuenow')).toBe('100');
    expect(overMeter.getAttribute('aria-valuetext')).toMatch(/125%.*capped at 100%/i);
    expect(overBar.style.width).toBe('100%');
    expect(over.host.querySelector('[data-ar-roi-meter="quote-share"]').textContent).toContain('125%');
    expectCleanMarkup(over.html);
  });

  it('whitelists practice scenarios, lenses, and exact-boolean evidence without awarding financial-choice badges', () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(['routine-repair', 'narrow-margin', 'major-work']);
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
    expect(PRESETS.every((preset) => preset.vehicleValue > 0 && preset.repairCost > 0 && preset.replacementCost > 0 && preset.asIsOffer >= 0)).toBe(true);

    for (const preset of PRESETS) {
      const { html, host } = decision({
        roiPreset: preset.id,
        roiVehVal: String(preset.vehicleValue), roiRepCost: String(preset.repairCost), roiLooming: String(preset.loomingCost),
        roiReplacement: String(preset.replacementCost), roiAsIsOffer: String(preset.asIsOffer),
        roiAge: String(preset.age), roiMiles: String(preset.miles), roiAttach: preset.attachment
      });
      const selected = [...host.querySelectorAll('[data-ar-roi-preset][aria-pressed="true"]')];
      expect(selected.map((button) => button.dataset.arRoiPreset)).toEqual([preset.id]);
      expect(host.querySelector('[data-ar-roi-shell]').dataset.arRoiState).toBe('ready-compare');
      expectCleanMarkup(html);
    }

    const strict = decision({
      roiVehVal: '8500', roiRepCost: '900', roiLens: 'ghost', roiPreset: 'ghost',
      roiEvidence: { diagnosis: true, secondQuote: 1, warranty: 'true', asIsOffer: false, ghost: true }
    });
    expect([...strict.host.querySelectorAll('[data-ar-roi-preset][aria-pressed="true"]')]).toHaveLength(0);
    expect(strict.host.querySelector('[data-ar-roi-lens="cost"]').getAttribute('aria-pressed')).toBe('true');
    expect(strict.host.querySelector('[data-ar-roi-detail]').dataset.arRoiDetail).toBe('cost');
    expect([...strict.host.querySelectorAll('[data-ar-roi-evidence-state="checked"]')].map((item) => item.dataset.arRoiEvidenceItem)).toEqual(['diagnosis']);
    expect(strict.host.querySelector('[data-ar-roi-stat="evidence"] strong').textContent).toBe('1/4');

    const stale = decision({
      roiPreset: 'routine-repair', roiVehVal: '8501', roiRepCost: '900', roiLooming: '300',
      roiReplacement: '18000', roiAsIsOffer: '7000', roiAge: '9', roiMiles: '110000', roiAttach: 'medium'
    });
    expect(stale.host.querySelectorAll('[data-ar-roi-preset][aria-pressed="true"]')).toHaveLength(0);

    const start = SOURCE.indexOf('function renderROI()');
    const end = SOURCE.indexOf('function renderLog()', start);
    const rendererSource = SOURCE.slice(start, end);
    expect(rendererSource).not.toContain('awardBadge(');
    expect(rendererSource).not.toMatch(/math favors|['"]Recommendation['"]|approve this repair|end-of-design-life/i);
  });

  it('uses complete semantics, visible state, safe references, and native controls in every theme', () => {
    const themes = [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ];
    for (const theme of themes) {
      const { html, host } = decision({
        roiVehVal: '8500', roiRepCost: '900', roiLooming: '300',
        roiReplacement: '18000', roiAsIsOffer: '7000', roiAge: '9', roiMiles: '110000',
        roiEvidence: { diagnosis: true }
      }, theme);
      const shell = host.querySelector('[data-ar-roi-shell]');
      const form = shell.querySelector('[data-ar-roi-form]');
      const scene = shell.querySelector('[data-ar-roi-scene]');
      const result = shell.querySelector('[data-ar-roi-result]');
      const evidence = shell.querySelector('[data-ar-roi-evidence]');
      const ids = [...shell.querySelectorAll('[id]')].map((node) => node.id);

      expect(shell.querySelectorAll('h1')).toHaveLength(1);
      expectLabelled(host, shell.querySelector('[data-ar-roi-hero]'));
      expectLabelled(host, form);
      expectLabelled(host, scene);
      expectLabelled(host, result);
      expectLabelled(host, evidence);
      expect(new Set(ids).size).toBe(ids.length);
      const signal = result.querySelector('[data-ar-roi-signal]');
      const detail = result.querySelector('[data-ar-roi-detail]');
      expect(result.hasAttribute('role')).toBe(false);
      expect(signal.getAttribute('role')).toBe('status');
      expect(signal.getAttribute('aria-live')).toBe('polite');
      expect(signal.getAttribute('aria-atomic')).toBe('true');
      expect(detail.getAttribute('role')).toBe('region');
      expect(detail.hasAttribute('aria-live')).toBe(false);
      expect(scene.getAttribute('role')).toBe('group');
      expect(host.querySelector('#ar-roi-scene-desc').textContent).toMatch(/30%.*50%.*70%.*do not decide/i);
      expect(scene.querySelectorAll('[role="meter"]')).toHaveLength(2);
      for (const meter of scene.querySelectorAll('[role="meter"]')) {
        expect(meter.getAttribute('aria-label')).toBeTruthy();
        expect(Number.isFinite(Number(meter.getAttribute('aria-valuenow')))).toBe(true);
        expect(meter.getAttribute('aria-valuetext')).toMatch(/% of entered vehicle value/i);
      }
      const lenses = [...result.querySelectorAll('button[data-ar-roi-lens]')];
      expect(lenses).toHaveLength(3);
      expect(lenses.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
      expect(lenses.every((button) => button.getAttribute('aria-controls') === 'ar-roi-detail')).toBe(true);
      expect(evidence.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
      expect(evidence.querySelectorAll('button[data-ar-roi-next-step]')).toHaveLength(4);
      for (const checkbox of evidence.querySelectorAll('input[type="checkbox"]')) expect(checkbox.closest('label')).toBeTruthy();
      for (const button of shell.querySelectorAll('button')) expect(button.type).toBe('button');
      for (const link of shell.querySelectorAll('[data-ar-roi-reference] a')) {
        expect(link.target).toBe('_blank');
        expect(link.rel).toContain('noopener');
        expect(link.rel).toContain('noreferrer');
        expect(link.getAttribute('aria-label')).toMatch(/opens in a new tab/i);
      }
      expectCleanMarkup(html);
    }
  });

  it('guards dimensional layout, responsive fallbacks, accessibility media, routing, syntax, and mirror parity', () => {
    decision({ roiVehVal: '8500', roiRepCost: '900', roiLooming: '300', roiReplacement: '18000', roiAsIsOffer: '7000' });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const workbench = ruleForSelector(topRules, '.ar-roi-workbench');
    const scene = ruleForSelector(topRules, '.ar-roi-scene');
    const board = ruleForSelector(topRules, '.ar-roi-board');
    const stageList = ruleForSelector(topRules, '.ar-roi-stage-list');
    const evidenceList = ruleForSelector(topRules, '.ar-roi-evidence-list');
    const shellButton = ruleForSelector(topRules, '.ar-roi-shell button');
    const fieldInput = ruleForSelector(topRules, '.ar-roi-field input');

    expect(workbench.style.getPropertyValue('grid-template-columns')).toContain('minmax');
    expect(parseFloat(scene.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(365);
    expect(scene.style.getPropertyValue('perspective')).toBe('1100px');
    expect(scene.style.getPropertyValue('overflow')).toBe('hidden');
    expect(board.style.getPropertyValue('transform-style')).toBe('preserve-3d');
    expect(board.style.getPropertyValue('transform')).toContain('rotateX');
    expect(parseFloat(board.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(315);
    expect(stageList.style.getPropertyValue('grid-template-columns')).toContain('repeat(3');
    expect(evidenceList.style.getPropertyValue('grid-template-columns')).toContain('repeat(4');
    expect(parseFloat(shellButton.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);
    expect(parseFloat(fieldInput.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const tablet = rulesForMedia(topRules, /max-width:\s*900px/i);
    expect(ruleForSelector(tablet, '.ar-roi-workbench').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-roi-hero').style.getPropertyValue('grid-template-columns')).toBe('1fr');
    expect(ruleForSelector(tablet, '.ar-roi-result').style.getPropertyValue('position')).toBe('static');
    expect(ruleForSelector(tablet, '.ar-roi-evidence-list').style.getPropertyValue('grid-template-columns')).toContain('repeat(2');

    const mobile = rulesForMedia(topRules, /max-width:\s*620px/i);
    for (const selector of ['.ar-roi-stats', '.ar-roi-stage-list', '.ar-roi-form-grid', '.ar-roi-lanes', '.ar-roi-evidence-list']) {
      expect(ruleForSelector(mobile, selector).style.getPropertyValue('grid-template-columns')).toBe('1fr');
    }
    expect(parseFloat(ruleForSelector(mobile, '.ar-roi-scene').style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(320);
    expect(ruleForSelector(mobile, '.ar-roi-board').style.getPropertyValue('transform')).toBe('none');
    expect(ruleForSelector(mobile, '.ar-roi-lenses').style.getPropertyValue('grid-template-columns')).toBe('1fr');

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i);
    const reducedTransition = reduced.find((rule) => hasSelector(rule, '.ar-roi-board') && hasSelector(rule, '.ar-roi-bar'));
    const reducedHover = reduced.find((rule) => hasSelector(rule, '.ar-roi-scene:hover .ar-roi-board') && hasSelector(rule, '.ar-roi-lens:hover'));
    expect(reducedTransition.style.getPropertyValue('transition')).toBe('none');
    expect(reducedTransition.style.getPropertyPriority('transition')).toBe('important');
    expect(reducedHover.style.getPropertyValue('transform')).toBe('none');
    expect(reducedHover.style.getPropertyPriority('transform')).toBe('important');

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i);
    for (const selector of ['.ar-roi-scene', '.ar-roi-result', '.ar-roi-evidence', '.ar-roi-field input']) {
      const boundary = forced.find((rule) => hasSelector(rule, selector) && /canvastext/i.test(rule.style.getPropertyValue('border')));
      expect(boundary).toBeTruthy();
      expect(boundary.style.getPropertyPriority('border')).toBe('important');
    }
    const forcedBar = ruleForSelector(forced, '.ar-roi-bar');
    const forcedPressed = forced.find((rule) => hasSelector(rule, '.ar-roi-lens[aria-pressed="true"]') && hasSelector(rule, '.ar-roi-preset[aria-pressed="true"]'));
    expect(forcedBar.style.getPropertyValue('background').toLowerCase()).toContain('highlight');
    expect(forcedBar.style.getPropertyPriority('background')).toBe('important');
    expect(forcedPressed.style.getPropertyValue('outline').toLowerCase()).toContain('highlight');

    const print = rulesForMedia(topRules, /^print$/i);
    const printHide = print.find((rule) => hasSelector(rule, '.ar-roi-form') && hasSelector(rule, '.ar-roi-lenses') && hasSelector(rule, '.ar-roi-actions'));
    const printBoard = print.find((rule) => hasSelector(rule, '.ar-roi-board') && hasSelector(rule, '.ar-roi-scene:hover .ar-roi-board'));
    const printBreak = print.find((rule) => hasSelector(rule, '.ar-roi-scene-card') && hasSelector(rule, '.ar-roi-reference') && /(?:break-inside|page-break-inside)/.test(rule.cssText));
    expect(printHide.style.getPropertyValue('display')).toBe('none');
    expect(printHide.style.getPropertyPriority('display')).toBe('important');
    expect(printBoard.style.getPropertyValue('transform')).toBe('none');
    expect(printBoard.style.getPropertyPriority('transform')).toBe('important');
    expect(printBreak.cssText).toMatch(/(?:break-inside|page-break-inside):\s*avoid/);

    const start = SOURCE.indexOf('function renderROI()');
    const end = SOURCE.indexOf('function renderLog()', start);
    const rendererSource = SOURCE.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(SOURCE.match(/function renderROI\(\)/g)).toHaveLength(1);
    expect(SOURCE).not.toContain('function renderROILegacy(');
    expect(SOURCE).not.toMatch(/Math favors|70% threshold rule|Repair ROI calculator|Should I fix it or sell it/i);
    const quiz34Start = SOURCE.indexOf("{ id: 'q34'");
    const quiz34End = SOURCE.indexOf("{ id: 'q35'", quiz34Start);
    const quiz34 = SOURCE.slice(quiz34Start, quiz34End);
    expect(quiz34).toMatch(/reaches the worksheet\\'s compare-both-paths marker but proves neither choice/i);
    expect(quiz34).toMatch(/whole-vehicle inspection.*comparable replacement price.*actual as-is offer/i);
    expect(rendererSource).not.toMatch(/parseInt\s*\(\s*d\.roi/);
    expect(rendererSource).not.toContain('awardBadge(');
    expect(rendererSource).toContain("setView(action.id)");
    for (const hook of [
      'data-ar-roi-shell', 'data-ar-roi-state', 'data-ar-roi-compare-state', 'data-ar-roi-hero', 'data-ar-roi-stat',
      'data-ar-roi-form', 'data-ar-roi-stages', 'data-ar-roi-stage', 'data-ar-roi-stage-state', 'data-ar-roi-field', 'data-ar-roi-field-state', 'data-ar-roi-status', 'data-ar-roi-empty',
      'data-ar-roi-preset', 'data-ar-roi-reset', 'data-ar-roi-workbench', 'data-ar-roi-print-sheet', 'data-ar-roi-scene',
      'data-ar-roi-object', 'data-ar-roi-meter', 'data-ar-roi-path', 'data-ar-roi-compare-gap', 'data-ar-roi-result',
      'data-ar-roi-signal', 'data-ar-roi-lens', 'data-ar-roi-detail', 'data-ar-roi-assumption', 'data-ar-roi-evidence',
      'data-ar-roi-evidence-item', 'data-ar-roi-evidence-state', 'data-ar-roi-evidence-check', 'data-ar-roi-actions',
      'data-ar-roi-next-step', 'data-ar-roi-reference'
    ]) expect(rendererSource).toContain(hook);
    expect(SOURCE).toContain("case 'roi':        return renderROI();");
    expect(() => Function(SOURCE)).not.toThrow();

    if (resolve(process.cwd(), FILE) === resolve(process.cwd(), CANONICAL)) {
      const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
      const mirror = readFileSync(resolve(process.cwd(), MIRROR));
      expect(Buffer.compare(canonical, mirror)).toBe(0);
    }
  });
});
