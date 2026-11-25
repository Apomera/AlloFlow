// Accuracy + pedagogy audit of the Trajectory Computing Lab (2026-11-24).
// Fail-first: TC_TOOL_FILE=C:/tmp/sports_labs_1123/trajectorycomputing/start.js npx vitest run tests/trajectorycomputing_accuracy_audit_2026_11_24.test.js
import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.TC_TOOL_FILE || 'stem_lab/stem_tool_trajectorycomputing.js';
const ID = 'trajectoryComputing';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
  delete window.TrajectoryComputingCore;
});

function verifiedState(core, extra) {
  const e = core.expected;
  return Object.assign({
    stage: 'verify',
    orientationDismissed: true,
    completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
    worksheet: { vx: e.vx.toFixed(2), vy: e.vy.toFixed(2), flightTime: e.flightTime.toFixed(2), range: e.range.toFixed(1) },
    verification: { range: e.range.toFixed(1), verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
    verificationResult: { pass: true, rangePass: true, verdictPass: true, assignmentPass: true, assignment: { pass: true, message: 'Independent desk separation recorded.' } },
    reproducibility: { speed: true, angle: true, height: true, gravity: true },
    reproducibilityResult: { pass: true, correct: 4, total: 4, message: 'Reproducibility note complete. The independent check can be repeated.' },
    awarded: true,
  }, extra || {});
}

describe('Trajectory Computing Lab accuracy audit', () => {
  it('the transposed-output incident quotes the range the model actually prints', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const printed = core.expected.range.toFixed(1);
    expect(core.formatPrintout(core.expected)).toContain('PREDICTED RANGE          ' + printed + ' M');
    const incident = core.getSafeguardCase('transposed-output').incident;
    expect(incident).toContain(printed + ' m');
    expect(incident).not.toContain('4607.7');
    // The operator's copy is the same digits with two swapped, so it is a real transposition.
    const recorded = incident.match(/records ([0-9.]+) m/)[1];
    expect(recorded).not.toBe(printed);
    expect(recorded.split('').sort().join('')).toBe(printed.split('').sort().join(''));
  });

  it('an "about the same" angle result reads as a sentence, in the lab and in the report', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const study = Object.assign({}, core.classifyAngleStudy(52), { prediction: 'shorter' });
    expect(study.relation).toBe('about');
    expect(Math.abs(study.difference)).toBeLessThan(30);
    const html = renderTool(ID, { _trajectoryComputing: verifiedState(core, { extensionView: 'angle', studyAngle: 52, studyPrediction: 'shorter', studyResult: study, reportOpen: true }) });
    expect(html).not.toMatch(/about than/);
    expect(html).toContain('about the same distance as the 38-degree baseline');
  });

  it('the correct angle explanation does not always sit first and wrong picks say why', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const positions = new Set();
    for (const angle of [30, 46, 52]) {
      const study = Object.assign({}, core.classifyAngleStudy(angle), { prediction: 'longer' });
      const html = renderTool(ID, { _trajectoryComputing: verifiedState(core, { extensionView: 'angle', studyAngle: angle, studyPrediction: 'longer', studyResult: study }) });
      const values = [...html.matchAll(/name="tc-study-explanation" value="([a-z]+)"/g)].map((m) => m[1]);
      expect(values.sort()).toEqual(['components', 'gravity', 'speed']);
      const order = [...html.matchAll(/name="tc-study-explanation" value="([a-z]+)"/g)].map((m) => m[1]);
      positions.add(order.indexOf('components'));
    }
    expect(positions.size).toBeGreaterThan(1);
    expect(core.checkAngleExplanation('gravity').message).toMatch(/9\.81/);
    expect(core.checkAngleExplanation('speed').message).toMatch(/215/);
    expect(core.checkAngleExplanation('components').message).toContain('Supported: changing angle redistributes');
  });

  it('history text keeps only claims a NASA source supports', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'verify', completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true } } })
      + renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } })
      + renderTool(ID, { _trajectoryComputing: { stage: 'batch', completed: { briefing: true, worksheet: true, program: true, cards: true } } });
    expect(html).not.toContain('essential part');
    expect(html).not.toContain('checked one another');
    expect(html).not.toContain('used shared tables');
    expect(html).not.toContain('Early programmers did not receive instant feedback');
    expect(html).toContain('John Glenn');
    expect(html).toContain('https://www.nasa.gov/history/langleys-computers-1935-1970/');
    expect(core).toBeTruthy();
  });

  it('the program station says how the listing differs from 1956 FORTRAN', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'program', completed: { briefing: true, worksheet: true } } });
    expect(html).toContain('SINF');
    expect(html).toContain('6H TIME=');
  });

  it('the briefing says the no-air model is a simplification', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } });
    expect(html).toMatch(/leaves out air/i);
  });

  it('small buttons meet 44 px and the style block has no text under 12 px', () => {
    expect(SRC).toContain('.tc-small{background:#173c32;color:#fff;min-width:44px;min-height:44px');
    const styleBlock = SRC.slice(SRC.indexOf("style.id = 'trajectory-computing-styles'"), SRC.indexOf("].join('');", SRC.indexOf("style.id = 'trajectory-computing-styles'")));
    const tiny = styleBlock.match(/(?:font-size:|font:\d{3} )(?:[0-9]|1[01])(?:\.\d+)?px/g) || [];
    expect(tiny).toEqual([]);
  });
});
