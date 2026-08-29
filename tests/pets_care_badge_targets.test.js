import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

function extractFunction(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Could not find function ' + name);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < SRC.length; end += 1) {
    if (SRC[end] === '{') depth += 1;
    if (SRC[end] === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  // eslint-disable-next-line no-new-func
  return Function('return (' + SRC.slice(start, end) + ')')();
}

const evaluateCareWelfare = extractFunction('evaluateCareWelfare');
const strongWelfare = {
  phys: 75, ment: 75, soc: 75, env: 75,
  money: 100, lowMoney: false, en: 50, tiredCare: 0,
};

describe('Pets Lab - Care Sim badge target clarity', () => {
  it('shows every badge requirement with machine-readable status', () => {
    expect(SRC).toContain('All four welfare domains finish at 70% or higher');
    expect(SRC).toContain('Money never goes below $0');
    expect(SRC).toContain('Finish with more than 20% caregiver energy');
    expect(SRC).toContain('No routine care task started below 25% energy');
    expect(SRC).toContain("'data-pets-care-target-status': row.met ? 'met' : 'needs-attention'");
    expect(SRC).toContain("'data-pets-care-target-met': targetMet ? 'true' : 'false'");
    expect(SRC).toContain('This check is provisional until the week ends');
  });

  it('does not describe an energy-only miss as a successful week', () => {
    const outcome = evaluateCareWelfare({ ...strongWelfare, en: 20 });
    expect(outcome.minimum).toBe(75);
    expect(outcome.moneySustainable).toBe(true);
    expect(outcome.finishedAboveEnergyTarget).toBe(false);
    expect(outcome.avoidedExhaustedCare).toBe(true);
    expect(outcome.sustainable).toBe(false);
    expect(outcome.verdict).toContain('caregiver-sustainability target was missed');
    expect(outcome.verdict).not.toContain('Badge target met');
  });

  it('keeps final energy and exhausted-care history as separate checks', () => {
    const exhausted = evaluateCareWelfare({ ...strongWelfare, tiredCare: 1 });
    expect(exhausted.finishedAboveEnergyTarget).toBe(true);
    expect(exhausted.avoidedExhaustedCare).toBe(false);
    expect(exhausted.energySustainable).toBe(false);

    const met = evaluateCareWelfare(strongWelfare);
    expect(met.finishedAboveEnergyTarget).toBe(true);
    expect(met.avoidedExhaustedCare).toBe(true);
    expect(met.sustainable).toBe(true);
    expect(met.verdict).toContain('Badge target met');
  });

  it('preserves the exact budget and energy facts in new teacher evidence', () => {
    expect(SRC).toMatch(/lowMoney:\s*money < 0/);
    expect(SRC).toMatch(/avoidedNegativeBalance:\s*!c\.lowMoney/);
    expect(SRC).toMatch(/finishedAboveEnergyTarget:\s*finalWelfare\.finishedAboveEnergyTarget/);
    expect(SRC).toMatch(/avoidedExhaustedCare:\s*finalWelfare\.avoidedExhaustedCare/);
    expect(SRC).toMatch(/details\.finishedAboveEnergyTarget = details\.energyLeft > 20/);
    expect(SRC).toMatch(/details\.finishedAboveEnergyTarget && details\.avoidedExhaustedCare/);
    expect(SRC).toContain("careOutcome += ' · Finish-energy target '");
    expect(SRC).toContain("careOutcome += ' · Exhausted-care target '");
  });
});
