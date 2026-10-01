// Auto Repair Shop — professional Repair Bay close-out contract.
//
// Diagnosing a fault is only the middle of a real work order. These tests pin
// the new learning loop: choose the repair, select an authentic post-repair
// verification, run it, and only then release (or safely refer) the vehicle.

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
const SRC = readFileSync(resolve(process.cwd(), CANONICAL), 'utf8');

function extractAssignedArray(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  expect(markerAt, name + ' not found').toBeGreaterThan(-1);
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
    if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        // eslint-disable-next-line no-new-func
        return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
      }
    }
  }
  throw new Error('Unterminated ' + name + ' array');
}

function extractAssignedObject(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  expect(markerAt, name + ' not found').toBeGreaterThan(-1);
  const start = source.indexOf('{', markerAt + marker.length);
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
      expect(stack.pop(), name + ' has unbalanced delimiters').toBe(character);
      if (stack.length === 0) {
        // eslint-disable-next-line no-new-func
        return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
      }
    }
  }
  throw new Error('Unterminated ' + name + ' object');
}

const CASES = extractAssignedArray(SRC, 'REPAIR_CASES');
const VERIFICATIONS = extractAssignedObject(SRC, 'REPAIR_VERIFICATIONS');
for (const repairCase of CASES) repairCase.verification = VERIFICATIONS[repairCase.id];

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function bay(extra) {
  return renderTool(ID, {
    autoRepair: Object.assign({ view: 'repairbay' }, extra || {})
  });
}

function verificationText(repairCase) {
  return JSON.stringify(repairCase.verification || {});
}

function planExplanation(plan) {
  return plan.result || plan.feedback || plan.outcome || plan.why || '';
}

function mediaText(rule) {
  return rule.conditionText || rule.media?.mediaText || '';
}

function rulesForMedia(topRules, pattern) {
  return topRules
    .filter((rule) => pattern.test(mediaText(rule)))
    .flatMap((rule) => [...(rule.cssRules || [])]);
}

function isVerifyRule(rule) {
  return /ar-(?:rb-)?verif|data-ar-repair-verify/i.test(rule.selectorText || '');
}

function findButton(host, pattern) {
  return [...host.querySelectorAll('button')]
    .find((button) => pattern.test(button.textContent || '') || pattern.test(button.getAttribute('aria-label') || ''));
}

let mountedRoots = [];
let previousActEnvironment;

async function mountBay(seed) {
  const config = window.StemLab._registry[ID];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  let latest = { autoRepair: Object.assign({ view: 'repairbay' }, seed || {}) };

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
  await act(async () => {
    root.render(React.createElement(Harness));
  });

  return {
    host: mount,
    state: () => latest.autoRepair,
    async click(element) {
      expect(element, 'click target was not rendered').toBeTruthy();
      await act(async () => {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
  };
}

async function completeChargingWorkOrder(app) {
  const repairCase = CASES.find((item) => item.id === 'charging');
  const correctRepair = repairCase.choices.find((choice) => choice.verdict === 'correct');
  const adequatePlan = repairCase.verification.plans.find((plan) => plan.adequate);
  await app.click([...app.host.querySelectorAll('button')]
    .find((button) => button.getAttribute('aria-label') === correctRepair.label));
  await app.click(app.host.querySelector('[data-ar-verify-plan="' + adequatePlan.id + '"] input[type="radio"]'));
  await app.click(findButton(app.host, /run verification|verify (?:the )?repair|run (?:the )?check|run proof test/i));
  return { repairCase, correctRepair, adequatePlan };
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

describe('Repair Bay verification metadata', () => {
  it('authors one and only one adequate verification plan for every case', () => {
    expect(CASES).toHaveLength(7);
    for (const repairCase of CASES) {
      const verification = repairCase.verification;
      expect(verification, repairCase.id + ' has no verification close-out').toBeTruthy();
      expect(verification.plans, repairCase.id + ' has no verification plans').toBeInstanceOf(Array);
      expect(verification.plans.length, repairCase.id + ' needs a meaningful choice').toBeGreaterThanOrEqual(2);
      expect(
        verification.plans.filter((plan) => plan.adequate === true),
        repairCase.id + ' must have exactly one adequate plan'
      ).toHaveLength(1);
      expect(new Set(verification.plans.map((plan) => plan.id)).size).toBe(verification.plans.length);

      for (const plan of verification.plans) {
        expect(plan.id, repairCase.id + ' plan missing id').toMatch(/^[a-z0-9-]+$/);
        expect(plan.label, repairCase.id + '/' + plan.id + ' missing label').toBeTruthy();
        expect(typeof plan.adequate, repairCase.id + '/' + plan.id + ' must state adequacy').toBe('boolean');
        expect(
          planExplanation(plan).length,
          repairCase.id + '/' + plan.id + ' needs useful result feedback'
        ).toBeGreaterThan(30);
      }
    }
  });

  it('uses case-specific post-repair science instead of one generic road test', () => {
    const expectedScience = {
      charging: /13\.7[^\d]{0,20}14\.7\s*V/i,
      squeal: /belt|tensioner/i,
      overheat: /fan[^.]{0,80}(?:cycle|run|spin)|fuse[^.]{0,80}hold/i,
      nocrank: /(?:below|under|less than|<)\s*(?:(?:roughly|about)\s*)?0\.2\s*V/i,
      headgasket: /refer|tow|do not (?:drive|release)|no road release/i,
      oilpressure: /warning lamp|tick|repaired area|settled level|dry/i,
      badbattery: /load test|capacity|10\.2\s*V/i
    };
    for (const repairCase of CASES) {
      expect(
        verificationText(repairCase),
        repairCase.id + ' verification lost its case-specific science'
      ).toMatch(expectedScience[repairCase.id]);
    }
    expect(new Set(CASES.map((repairCase) => {
      const plan = repairCase.verification.plans.find((item) => item.adequate);
      return plan.label + '|' + planExplanation(plan);
    })).size).toBe(CASES.length);
  });
});

describe('Repair Bay diagnose → repair → verify state machine', () => {
  it('does not complete on diagnosis or an inadequate check, then records verified:true after the adequate check', async () => {
    const repairCase = CASES.find((item) => item.id === 'charging');
    const correctRepair = repairCase.choices.find((choice) => choice.verdict === 'correct');
    const inadequate = repairCase.verification.plans.find((plan) => !plan.adequate);
    const adequate = repairCase.verification.plans.find((plan) => plan.adequate);
    const app = await mountBay({ rbCase: repairCase.id, rbEngine: 'off' });

    await app.click([...app.host.querySelectorAll('button')]
      .find((button) => button.getAttribute('aria-label') === correctRepair.label));
    expect(app.state().rbPhase).toBe('verify');
    expect(app.state().rbDone?.[repairCase.id]).toBeUndefined();

    const verify = app.host.querySelector('[data-ar-repair-verify]');
    expect(verify).toBeTruthy();
    expect(verify.querySelector('fieldset')).toBeTruthy();
    expect(verify.querySelector('legend')?.textContent.trim()).toBeTruthy();
    const radios = [...verify.querySelectorAll('[data-ar-verify-plan] input[type="radio"]')];
    expect(radios).toHaveLength(repairCase.verification.plans.length);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    for (const radio of radios) {
      const label = radio.id && verify.querySelector('label[for="' + radio.id + '"]');
      expect(label || radio.closest('label'), radio.dataset.arVerifyPlan + ' radio has no label').toBeTruthy();
    }
    const stages = [...app.host.querySelectorAll('[data-ar-work-order-stage]')];
    expect(stages.length).toBeGreaterThanOrEqual(3);

    await app.click(verify.querySelector('[data-ar-verify-plan="' + inadequate.id + '"] input[type="radio"]'));
    expect(app.state().rbVerifyChoice).toBe(inadequate.id);
    await app.click(findButton(app.host, /run verification|verify (?:the )?repair|run (?:the )?check|run proof test/i));
    expect(app.state().rbDone?.[repairCase.id]).toBeUndefined();
    expect(app.state().rbVerifyResult).toBeTruthy();
    const inadequateOutput = app.host.querySelector('[data-ar-verify-result]');
    expect(inadequateOutput).toBeTruthy();
    expect(
      inadequateOutput.tagName === 'OUTPUT' || ['status', 'alert'].includes(inadequateOutput.getAttribute('role'))
    ).toBe(true);

    await app.click(app.host.querySelector('[data-ar-verify-plan="' + adequate.id + '"] input[type="radio"]'));
    expect(app.state().rbVerifyChoice).toBe(adequate.id);
    await app.click(findButton(app.host, /run verification|verify (?:the )?repair|run (?:the )?check|run proof test/i));
    expect(app.state().rbDone?.[repairCase.id]).toMatchObject({
      verdict: 'correct',
      verified: true
    });
    expect(['complete', 'verified']).toContain(app.state().rbPhase);
  });

  it('clears verification state when the technician runs the case again', async () => {
    const app = await mountBay({ rbCase: 'charging', rbEngine: 'off' });
    await completeChargingWorkOrder(app);
    await app.click(findButton(app.host, /run it again/i));

    expect(app.state().rbCase).toBe('charging');
    expect(app.state().rbVerdict).toBeNull();
    expect(app.state().rbVerifyChoice ?? null).toBeNull();
    expect(app.state().rbVerifyResult ?? null).toBeNull();
    expect(['diagnose', null, undefined]).toContain(app.state().rbPhase);
  });

  it('clears verification state when the technician returns to the case board', async () => {
    const app = await mountBay({ rbCase: 'charging', rbEngine: 'off' });
    await completeChargingWorkOrder(app);
    await app.click(findButton(app.host, /next case/i));

    expect(app.state().rbCase).toBeNull();
    expect(app.state().rbVerifyChoice ?? null).toBeNull();
    expect(app.state().rbVerifyResult ?? null).toBeNull();
    expect(['diagnose', null, undefined]).toContain(app.state().rbPhase);
  });
});

describe('Repair Bay verification presentation and resilience', () => {
  it('renders semantic verification hooks without requiring the 3D bay', () => {
    const repairCase = CASES.find((item) => item.id === 'charging');
    const correctRepair = repairCase.choices.find((choice) => choice.verdict === 'correct');
    const host = hostFor(bay({
      rbCase: repairCase.id,
      rbVerdict: correctRepair.id,
      rbPhase: 'verify',
      uh3dStatus: 'failed'
    }));

    expect(host.textContent).toContain('3D bay unavailable');
    expect(host.querySelector('[data-ar-repair-verify]')).toBeTruthy();
    expect(host.querySelectorAll('[data-ar-verify-plan] input[type="radio"]'))
      .toHaveLength(repairCase.verification.plans.length);
    expect(host.querySelectorAll('[data-ar-work-order-stage]').length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the close-out usable on small screens, reduced motion, forced colors, and print', () => {
    bay({ rbCase: 'charging', rbVerdict: 'alt', rbPhase: 'verify' });
    const style = document.getElementById('allo-ar-flair-css');
    expect(style?.sheet).toBeTruthy();
    const topRules = [...style.sheet.cssRules];
    const baseVerify = topRules.filter(isVerifyRule);
    expect(baseVerify.length).toBeGreaterThanOrEqual(3);
    expect(baseVerify.some((rule) => /min-height:\s*44px/i.test(rule.cssText))).toBe(true);

    const responsive = topRules
      .filter((rule) => /max-width/i.test(mediaText(rule)))
      .flatMap((rule) => [...(rule.cssRules || [])])
      .filter(isVerifyRule);
    expect(responsive.length).toBeGreaterThan(0);
    expect(responsive.some((rule) => /grid-template-columns:\s*1fr|flex-direction:\s*column|width:\s*100%/i.test(rule.cssText)))
      .toBe(true);

    const reduced = rulesForMedia(topRules, /prefers-reduced-motion:\s*reduce/i).filter(isVerifyRule);
    expect(reduced.length).toBeGreaterThan(0);
    expect(reduced.some((rule) => /(?:animation|transition):\s*none/i.test(rule.cssText))).toBe(true);

    const forced = rulesForMedia(topRules, /forced-colors:\s*active/i).filter(isVerifyRule);
    expect(forced.length).toBeGreaterThan(0);
    expect(forced.some((rule) => /CanvasText|Highlight|forced-color-adjust/i.test(rule.cssText))).toBe(true);

    const print = rulesForMedia(topRules, /^print$/i).filter(isVerifyRule);
    expect(print.length).toBeGreaterThan(0);
    expect(print.some((rule) => /break-inside:\s*avoid|page-break-inside:\s*avoid/i.test(rule.cssText))).toBe(true);
  });

  it('ships the verification close-out byte-identically in the desktop mirror', () => {
    expect(readFileSync(resolve(process.cwd(), MIRROR), 'utf8')).toBe(SRC);
  });
});
