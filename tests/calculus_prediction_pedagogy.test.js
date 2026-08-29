import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const canonicalPath = path.join(process.cwd(), 'stem_lab', 'stem_tool_calculus.js');
const mirrorPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_calculus.js');
const source = fs.readFileSync(canonicalPath, 'utf8');

function renderCalculus(state = {}) {
  return renderTool('calculus', { calculus: state });
}

function sourceSection(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, 'missing section start: ' + startMarker).toBeGreaterThanOrEqual(0);
  expect(end, 'missing section end: ' + endMarker).toBeGreaterThan(start);
  return source.slice(start, end);
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_calculus.js', 'calculus');
});

describe('Calculus prediction, estimation, and evidence pedagogy', () => {
  it('keeps the canonical and desktop copies identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });

  it('awards the legacy prediction quest for completing an estimate comparison, not accuracy', () => {
    const registered = typeof window.StemLab.getRegisteredTools === 'function'
      ? window.StemLab.getRegisteredTools()
      : Object.values(window.StemLab._registry || {});
    const tool = registered.find((entry) => entry.id === 'calculus' || entry.label === 'Calculus');
    const quest = tool.questHooks.find((entry) => entry.id === 'predict_correctly');

    expect(quest.label).toBe('Complete an integral estimate comparison');
    expect(quest.check({ predictSubmitted: true, predictInput: '0' })).toBe(true);
    expect(quest.check({ predictSubmitted: false, predictInput: '0' })).toBe(false);
    expect(quest.check({ predictSubmitted: true, predictInput: 'not-a-number' })).toBe(false);
    expect(quest.progress({ predictSubmitted: true, predictInput: '2.5' })).toBe('Compared!');
    expect(source).not.toContain('d.predictCorrect');
    expect(source).not.toContain('Make a correct prediction in predict mode');
  });

  it('treats integral prediction mode as a quantitative, ungraded estimation challenge', () => {
    const setupHtml = renderCalculus({
      tab: 'integral', mode: 'left', a: 1, b: 0, c: 0,
      xMin: 0, xMax: 1, n: 4, predictMode: true
    });
    expect(setupHtml).toContain('data-calculus-estimation-challenge="quantitative-calibration"');
    expect(setupHtml).toContain('This is quantitative calibration practice.');
    expect(setupHtml).toContain('Commit and compare');

    const comparisonHtml = renderCalculus({
      tab: 'integral', mode: 'left', a: 1, b: 0, c: 0,
      xMin: 0, xMax: 1, n: 4, predictMode: true,
      predictInput: '0.4', predictSubmitted: true
    });
    expect(comparisonHtml).toContain('data-calculus-estimate-comparison="descriptive-calibration-ungraded"');
    expect(comparisonHtml).toContain('Committed Estimate');
    expect(comparisonHtml).toContain('Absolute % Difference');
    expect(comparisonHtml).toContain('Calibration note (optional)');

    const zeroIntegralHtml = renderCalculus({
      tab: 'integral', mode: 'left', a: 0, b: 0, c: 0,
      xMin: 0, xMax: 1, n: 4, predictMode: true,
      predictInput: '1', predictSubmitted: true
    });
    expect(zeroIntegralHtml).toContain('percentage difference is undefined');
    expect(zeroIntegralHtml).toContain('Absolute Difference');
    expect(zeroIntegralHtml).not.toContain('Infinity');
  });

  it('separates Mission 1 pattern hypotheses from numerical error estimates', () => {
    const mission = sourceSection('MISSION 0: How does error change with n?', 'MISSION 1: Method Showdown');

    expect(mission).toContain("'data-calculus-error-pattern-comparison':'descriptive-ungraded'");
    expect(mission).toContain('Evidence agrees with your hypothesis.');
    expect(mission).toContain('Evidence differs from your hypothesis.');
    expect(mission).toContain('Agreement is descriptive and ungraded;');
    expect(mission).toContain('Estimated error at n=16:');
    expect(mission).toContain("'aria-label':'Estimated error at n equals 16'");
    expect(mission).toContain('Measured error at n=16:');
    expect(mission).toContain("'aria-label':'Measured error at n equals 16'");
    expect(mission).toContain("var pctOff=actual!==0?absDiff/Math.abs(actual)*100:null;");
    expect(mission).toContain("'data-calculus-error-estimate-comparison':'descriptive-ungraded'");
    expect(mission).toContain('doubling n then reduces that error to roughly one quarter.');
    expect(mission).not.toContain('Excellent prediction! You nailed it!');
  });

  it('uses neutral hypothesis comparison before a separately labeled concept check', () => {
    const mission = sourceSection('MISSION 1: Method Showdown', 'MISSION 2: Find the Power Rule');

    expect(mission).toContain("['Left Riemann','Right Riemann','Midpoint','Trapezoidal',\"Simpson's\"]");
    expect(mission).toContain("'data-calculus-method-hypothesis-comparison':'descriptive-ungraded'");
    expect(mission).toContain('Agreement is descriptive and ungraded; completing the comparison is what counts.');
    expect(mission).toContain("'data-calculus-method-concept-check':'graded-concept'");
    expect(mission).toContain("Concept check: why does Simpson's rule give zero error for this quadratic?");
    expect(mission).not.toContain('Were you right?');
    expect(mission).not.toContain('You predicted correctly!');
  });

  it('treats Derivative Hunt as live evidence with accurate linear states and gated explanation', () => {
    const inquiry = sourceSection('Live derivative evidence inquiry', 'AI Calculus Tutor (reading-level aware)');

    expect(inquiry).toContain("'data-calculus-live-inquiry': 'observe-log-explain'");
    expect(inquiry).toContain("'data-calculus-live-derivative-state': state");
    expect(inquiry).toContain("state = Math.abs(derivAtX) < 0.1 ? 'constant'");
    expect(inquiry).toContain("derivAtX > 0 ? 'linearIncreasing' : 'linearDecreasing'");
    expect(inquiry).toContain('currentAlreadyLogged');
    expect(inquiry).toContain('var evidenceReady = inquiryLog.length >= 2;');
    expect(inquiry).toContain("'data-calculus-post-observation-explanation': 'final'");
    expect(inquiry).toContain('not a hidden prediction result or a score.');
    expect(inquiry).not.toContain("'aria-label': 'Calculus hypothesis'");
    expect(inquiry).not.toContain('No score, no reveal');

    const linearHtml = renderCalculus({
      tab: 'derivHunt',
      derivHunt: { a: 0, b: 2, c: 1, xPoint: 3, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }
    });
    expect(linearHtml).toContain('Increasing line; constant positive slope');
    expect(linearHtml).toContain('0/2 evidence settings logged');

    const constantHtml = renderCalculus({
      tab: 'derivHunt',
      derivHunt: { a: 0, b: 0, c: 4, xPoint: 2, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }
    });
    expect(constantHtml).toContain('Constant function; slope about 0');

    const readyHtml = renderCalculus({
      tab: 'derivHunt',
      derivHunt: {
        a: 0, b: 2, c: 1, xPoint: 3, hypothesis: 'The derivative is positive.',
        stuckRevealed: false, understood: true, explanation: 'Two logged settings show the sign changes with the slope.',
        log: [
          { a: 0, b: 2, c: 1, x: 3, d: '2.00', st: 'linearIncreasing' },
          { a: 1, b: 0, c: 0, x: 0, d: '0.00', st: 'turning' }
        ]
      }
    });
    expect(readyHtml).toContain('Current setting logged');
    expect(readyHtml).toContain('2/2 evidence settings logged');
    expect(readyHtml).toContain('data-calculus-post-observation-explanation="final"');
  });

  it('keeps the distance extension as a descriptive numerical estimate', () => {
    expect(source).toContain("'data-calculus-distance-estimate-comparison':'descriptive-ungraded'");
    expect(source).toContain('This numerical comparison is descriptive and ungraded;');
    expect(source).toContain("'aria-label':'Estimated distance in 5 seconds in meters'");
    expect(source).not.toContain('Did your prediction match?');
  });
});
