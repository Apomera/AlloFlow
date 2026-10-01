// RTI progress-monitoring decision rules (2026-08-17).
//
// These outputs tell a team whether an intervention is working, and feed the
// "Consider a tier or intervention change" banner. Until now only four_point was
// computed; trend_line and median_3 were disabled "(coming soon)" placeholders.
//
// The highest-stakes property here is NOT which band a series lands in — it is
// that a rule never returns a verdict it has not earned. The prior code reported
// "On track toward goal" from a single data point, because no rule declared a
// minimum. Every 'insufficient' assertion below is guarding that.
//
// Runs the REAL calculateAimline through the module's test seam.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let calc;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  try { window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom')); } catch (e) {}
  loadAlloModule('student_analytics_module.js');
  const Panel = window.AlloModules.StudentAnalytics;
  try {
    ReactDOMServer.renderToStaticMarkup(React.createElement(Panel, { isOpen: true, onClose: () => {}, students: [], dashboardData: null }));
  } catch (e) { /* seam is captured before the JSX return */ }
  calc = window.AlloModules.StudentAnalyticsInternals.calculateAimline;
});

const BASE = '2026-01-05T00:00:00.000Z';
// 60 -> 100 over 10 weeks: aimline slope = +4/week.
const GOAL = { baseline: 60, target: 100, baselineDate: BASE, targetDate: '2026-03-16T00:00:00.000Z' };

// Build points at weekly intervals from the baseline date.
function series(values) {
  return values.map((v, i) => ({
    value: v,
    date: new Date(Date.parse(BASE) + i * 7 * 24 * 60 * 60 * 1000).toISOString()
  }));
}

describe('the aimline itself', () => {
  it('slopes from baseline to target across the goal window', () => {
    const a = calc(GOAL, series([60]), 4, 'four_point');
    expect(a.totalWeeks).toBe(10);
    expect(a.slope).toBeCloseTo(4, 5);
  });

  it('returns null without a complete goal rather than inventing one', () => {
    expect(calc(null, series([60, 61]), 4, 'four_point')).toBeNull();
    expect(calc({ baseline: 60, target: 100 }, series([60]), 4, 'four_point')).toBeNull();
  });
});

describe('no rule reports a verdict it has not earned', () => {
  it('four-point stays silent below its threshold of points', () => {
    // This is the regression: one point used to yield alert 'ok' = "On track".
    const a = calc(GOAL, series([20]), 4, 'four_point');
    expect(a.alert).toBe('insufficient');
    expect(a.detail).toMatch(/1 of 4 points/);
  });

  it('median rule stays silent under 3 points', () => {
    expect(calc(GOAL, series([20, 21]), 4, 'median_3').alert).toBe('insufficient');
  });

  it('trend line stays silent under 6 points', () => {
    const a = calc(GOAL, series([20, 21, 22, 23, 24]), 4, 'trend_line');
    expect(a.alert).toBe('insufficient');
    expect(a.detail).toMatch(/5 of 6 points/);
  });

  it('trend line refuses when every point lands in the same week', () => {
    // No spread on x means no slope is defined; must not divide by zero and
    // must not report a trend.
    const sameWeek = [10, 12, 14, 16, 18, 20].map((v) => ({ value: v, date: BASE }));
    const a = calc(GOAL, sameWeek, 4, 'trend_line');
    expect(a.alert).toBe('insufficient');
    expect(a.trendSlope).toBeNull();
  });

  it('an empty series never reads as on track under any rule', () => {
    for (const rule of ['four_point', 'median_3', 'trend_line']) {
      expect(calc(GOAL, [], 4, rule).alert, rule).toBe('insufficient');
    }
  });
});

describe('four-point rule', () => {
  it('flags consecutive points below the aimline at the threshold', () => {
    // Aimline at weeks 0..5 is 60,64,68,72,76,80. All well below.
    const a = calc(GOAL, series([50, 50, 50, 50]), 4, 'four_point');
    expect(a.consecutiveBelow).toBe(4);
    expect(a.alert).toBe('warning');
  });

  it('escalates to critical at threshold + 2', () => {
    const a = calc(GOAL, series([50, 50, 50, 50, 50, 50]), 4, 'four_point');
    expect(a.alert).toBe('critical');
    expect(a.changeThreshold).toBe(6);
  });

  it('a point at or above the aimline resets the run', () => {
    // Last point above the aimline: the streak breaks, so no alert.
    const a = calc(GOAL, series([50, 50, 50, 50, 99]), 4, 'four_point');
    expect(a.consecutiveBelow).toBe(0);
    expect(a.alert).toBe('ok');
  });

  it('honours a non-default threshold in BOTH the verdict and the text', () => {
    // The banner used to hardcode "6 consecutive" / "4+" while the picker moved
    // the real thresholds, so the text could contradict the verdict.
    const a = calc(GOAL, series([50, 50, 50]), 3, 'four_point');
    expect(a.warnThreshold).toBe(3);
    expect(a.changeThreshold).toBe(5);
    expect(a.alert).toBe('warning');
    expect(a.detail).toContain('3 consecutive');
  });
});

describe('median of last 3', () => {
  it('is not swayed by one bad administration', () => {
    // Weeks 0..3, aimline 60,64,68,72. Last three: 80, 5, 85 -> median 80 vs 72.
    const a = calc(GOAL, series([70, 80, 5, 85]), 4, 'median_3');
    expect(a.medianLast3).toBe(80);
    expect(a.alert).toBe('ok');
  });

  it('warns when the median is below but one point held the line', () => {
    // Weeks 0..3, aimline at week 3 is 72. Last three: 68, 70, 90 -> median 70,
    // below the line, but one point above it. Short of "all three below".
    const a = calc(GOAL, series([60, 68, 70, 90]), 4, 'median_3');
    expect(a.medianLast3).toBe(70);
    expect(a.alert).toBe('warning');
    expect(a.detail).toContain('2 of 3 points below');
  });

  it('escalates to critical only when all three are below', () => {
    const allBelow = calc(GOAL, series([60, 10, 11, 12]), 4, 'median_3');
    expect(allBelow.alert).toBe('critical');
    expect(allBelow.detail).toContain('3 of 3 points below');
    // One of the three above the line keeps it at warning, not critical.
    const mixed = calc(GOAL, series([60, 10, 11, 999]), 4, 'median_3');
    expect(mixed.alert).toBe('warning');
  });
});

describe('trend-line comparison', () => {
  it('is on track when the observed slope meets the aimline slope', () => {
    // +4/week, exactly the aimline.
    const a = calc(GOAL, series([60, 64, 68, 72, 76, 80]), 4, 'trend_line');
    expect(a.trendSlope).toBeCloseTo(4, 5);
    expect(a.alert).toBe('ok');
  });

  it('warns when improving too slowly to reach the goal', () => {
    // +1/week against an aimline of +4/week: real growth, wrong rate.
    const a = calc(GOAL, series([60, 61, 62, 63, 64, 65]), 4, 'trend_line');
    expect(a.trendSlope).toBeCloseTo(1, 5);
    expect(a.alert).toBe('warning');
  });

  it('is critical when flat or declining', () => {
    expect(calc(GOAL, series([60, 60, 60, 60, 60, 60]), 4, 'trend_line').alert).toBe('critical');
    const declining = calc(GOAL, series([80, 78, 76, 74, 72, 70]), 4, 'trend_line');
    expect(declining.trendSlope).toBeLessThan(0);
    expect(declining.alert).toBe('critical');
  });

  it('reports n so a reader can weigh how stable the slope is', () => {
    const a = calc(GOAL, series([60, 64, 68, 72, 76, 80]), 4, 'trend_line');
    expect(a.detail).toContain('n=6');
    expect(a.pointCount).toBe(6);
  });

  it('a strong level but flat slope still fails, where four-point passes', () => {
    // Scores far ABOVE the aimline but not growing. Four-point sees every point
    // above the line and says fine; the trend line sees no growth. The rules
    // genuinely disagree, which is why the choice is a team decision and the UI
    // calls all three decision aids.
    const flatHigh = series([95, 95, 95, 95, 95, 95]);
    expect(calc(GOAL, flatHigh, 4, 'four_point').alert).toBe('ok');
    expect(calc(GOAL, flatHigh, 4, 'trend_line').alert).toBe('critical');
  });
});

describe('the rule actually selected is the rule reported', () => {
  it('echoes the method back, and defaults unknown values to four_point', () => {
    expect(calc(GOAL, series([60]), 4, 'trend_line').method).toBe('trend_line');
    expect(calc(GOAL, series([60]), 4, 'median_3').method).toBe('median_3');
    // Spelled-out alias must not silently fall through to four_point.
    expect(calc(GOAL, series([60]), 4, 'median_last_3').method).toBe('median_3');
    expect(calc(GOAL, series([60]), 4, 'nonsense').method).toBe('four_point');
    expect(calc(GOAL, series([60]), 4, undefined).method).toBe('four_point');
  });
});
