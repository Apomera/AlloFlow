import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Retirement planner: "Starting 10 years earlier ... That's N% more money".
// At start age 55 the later start (65) has no years to save, so its balance is
// $0 and the old Math.max(1, 0) divisor printed "That's 5222634% more money".
//
// MR2_NUMBERSENSE_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MONEY_SRC || 'stem_lab/stem_tool_money.js';

beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });

const text = (state) => renderTool('moneyMath', { _moneyMath: Object.assign({ tab: 'finance', finSub: 'retire', currency: 'USD' }, state) })
  .replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

// Independent model of the planner: monthly deposit + employer match, monthly compounding, to 65.
function balance(startAge, monthly, match, cap, annual) {
  const years = 65 - startAge;
  if (years <= 0) return 0;
  const r = annual / 100 / 12;
  const employer = Math.min(monthly, (monthly * 12 / (cap / 100)) * cap / 100) * (match / 100);
  let b = 0;
  for (let m = 0; m < years * 12; m++) b = (b + monthly + employer) * (1 + r);
  return b;
}

describe('the early-start comparison states a sensible percentage', () => {
  it('start age 55: the later start has no years left, so no percentage is printed', () => {
    const t = text({ retAge: 55 });
    expect(t).toContain('Start at 65');
    expect(t).not.toMatch(/\d{5,}%/);
    expect(t).not.toMatch(/That's [\d,]+% more money/);
    expect(t).toMatch(/no years to save/);
  });

  it('every other start age prints the true ratio, with thousands separators', () => {
    const bad = [];
    for (let age = 18; age <= 54; age++) {
      const early = balance(age, 200, 50, 6, 7), late = balance(age + 10, 200, 50, 6, 7);
      const want = Math.round((early / late - 1) * 100).toLocaleString();
      const m = /That's ([\d,]+)% more money/.exec(text({ retAge: age }));
      if (!m || m[1] !== want) bad.push(age + ': ' + (m ? m[1] : 'none') + ' want ' + want);
    }
    expect(bad.slice(0, 5), bad.length + ' ages wrong').toEqual([]);
  });
});
