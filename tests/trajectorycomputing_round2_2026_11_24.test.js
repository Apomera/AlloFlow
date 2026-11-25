// Trajectory Computing Lab, round 2 (2026-11-24): text that matches the model, honest launch wording, a shorter
// first phone screen, readable result-chart labels, and a visible edge on the desk read-aloud button.
// Fail-first: TC_TOOL_FILE=C:/tmp/sports_labs_1123/trajectorycomputing/start_r2.js npx vitest run tests/trajectorycomputing_round2_2026_11_24.test.js
import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.TC_TOOL_FILE || 'stem_lab/stem_tool_trajectorycomputing.js';
const ID = 'trajectoryComputing';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
const CHART_MIN_PX = 620;

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
  delete window.TrajectoryComputingCore;
});

function mountHtml(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function luminance(hex) {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

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

describe('Trajectory Computing Lab round 2', () => {
  it('the program station counts mistakes and compiler messages from the model', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const result = core.compileProgram(core.starterProgram);
    const codes = result.diagnostics.map((d) => d.code).sort();
    // ANGEL fails the name check and the degrees-to-radians check on the same line.
    expect(codes).toEqual(['D203', 'M401', 'M403', 'N301']);
    expect(typeof core.getStarterListingCounts).toBe('function');
    const counts = core.getStarterListingCounts();
    expect(counts).toEqual({ mistakes: 3, messages: result.diagnostics.length });

    const html = renderTool(ID, { _trajectoryComputing: { stage: 'program', completed: { briefing: true, worksheet: true } } });
    expect(html).not.toContain('Three transcription errors were introduced');
    expect(html).toContain('This listing has ' + counts.mistakes + ' copying mistakes');
    expect(html).toContain('The compiler will show ' + counts.messages + ' messages, not ' + counts.mistakes);
    expect(html).toContain('ANGEL fails two checks on the same line');
  });

  it('the story says the capsule is launched, not released, and keeps the air-drag note', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } });
    expect(html).not.toMatch(/will release a research capsule/);
    expect(html).not.toMatch(/tower releasing/);
    expect(html).not.toContain('release speed');
    expect(html).toContain('will launch a research capsule from the top of a 30-meter tower at 215 m/s');
    expect(html).toContain('launch speed');
    expect(html).toMatch(/leaves out air/);
    expect(html).toContain('real air drag would make the capsule land much shorter');
  });

  it('orientation, historical boundary and model note sit behind one closed disclosure before the start button', () => {
    loadTool(FILE, ID);
    for (const dismissed of [false, true]) {
      const root = mountHtml(renderTool(ID, { _trajectoryComputing: { stage: 'briefing', orientationDismissed: dismissed } }));
      const panel = root.querySelector('#tc-panel-briefing');
      const more = panel.querySelectorAll('details.tc-briefing-more');
      expect(more).toHaveLength(1);
      expect(more[0].hasAttribute('open')).toBe(false);
      expect(more[0].querySelector('summary').textContent).toBe('How it works, history, and what the math leaves out');
      const inside = more[0].textContent;
      expect(inside).toContain('Historical boundary');
      expect(inside).toContain('Model note');
      if (!dismissed) {
        expect(inside).toContain('How the mission works');
        expect(inside).toContain('Got it');
      }
      // Nothing from the three pieces is left outside the disclosure.
      const outside = [...panel.children].filter((el) => el !== more[0]).map((el) => el.textContent).join(' ');
      expect(outside).not.toContain('Historical boundary');
      expect(outside).not.toContain('Model note');
      expect(outside).not.toContain('How the mission works');
      // The work still starts from the same panel.
      expect([...panel.querySelectorAll('button')].some((b) => b.textContent === 'Begin hand calculation')).toBe(true);
      expect(panel.querySelector('.tc-data')).toBeTruthy();
    }
  });

  it('every label in both result charts renders at 12 px or more at the 620 px floor', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const batch = renderTool(ID, { _trajectoryComputing: { stage: 'batch', orientationDismissed: true, completed: { briefing: true, worksheet: true, program: true, cards: true }, runStatus: 'complete', printout: core.formatPrintout(core.expected), batchRunId: '62-AUR-03-R01' } });
    const charts = [];
    for (const angle of [30, 38, 46, 52]) {
      const study = Object.assign({}, core.classifyAngleStudy(angle), { prediction: 'longer' });
      charts.push(renderTool(ID, { _trajectoryComputing: verifiedState(core, { extensionView: 'angle', studyAngle: angle, studyPrediction: 'longer', studyResult: study }) }));
    }
    const svgs = [batch, ...charts].flatMap((html) => [...mountHtml(html).querySelectorAll('svg.tc-chart')]);
    expect(svgs.length).toBe(5);
    for (const svg of svgs) {
      const vbWidth = Number(svg.getAttribute('viewBox').split(/\s+/)[2]);
      const scale = CHART_MIN_PX / vbWidth;
      const texts = [...svg.querySelectorAll('text')];
      expect(texts.length).toBeGreaterThan(1);
      for (const text of texts) {
        const size = Number(text.getAttribute('font-size'));
        expect(size * scale, text.textContent + ' in viewBox ' + vbWidth).toBeGreaterThanOrEqual(12);
      }
    }
    // The bigger peak labels must not stack on each other at any study angle.
    for (const html of charts) {
      const peaks = [...mountHtml(html).querySelectorAll('svg.tc-chart text')].filter((el) => / peak /.test(el.textContent));
      expect(peaks).toHaveLength(2);
      const [a, b] = peaks.map((el) => ({ x: Number(el.getAttribute('x')), y: Number(el.getAttribute('y')) }));
      expect(Math.abs(a.y - b.y) >= 18 || Math.abs(a.x - b.x) >= 150, JSON.stringify([a, b])).toBe(true);
    }
    // The 620 px floor holds at every width, not only on phones.
    const css = SRC.slice(SRC.indexOf("style.id = 'trajectory-computing-styles'"));
    const globalRule = "'[data-trajectory-lab] .tc-chart-frame .tc-chart{min-width:620px}',";
    expect(css).toContain(globalRule);
  });

  it('the desk read-aloud button has a 3:1 edge on the dark header and on beige, and 4.5:1 text', () => {
    loadTool(FILE, ID);
    const root = mountHtml(renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } }));
    const button = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Read desk summary aloud');
    expect(button).toBeTruthy();
    expect(button.className.split(' ')).toContain('tc-desk-audio');
    const rule = SRC.match(/\.tc-small\.tc-desk-audio\{border:2px solid (#[0-9a-f]{6});box-shadow:0 0 0 2px (#[0-9a-f]{6})\}/);
    expect(rule).toBeTruthy();
    const [, ring, outer] = rule;
    const fill = '#173c32';
    const darkHeader = '#173c32';
    const beige = ['#d8d0b3', '#f5efd9'];
    expect(contrast(ring, darkHeader)).toBeGreaterThanOrEqual(3);
    for (const bg of beige) expect(contrast(outer, bg)).toBeGreaterThanOrEqual(3);
    expect(contrast('#ffffff', fill)).toBeGreaterThanOrEqual(4.5);
    // Keyboard focus keeps its dark backing behind the white outline.
    expect(SRC).toContain('.tc-small.tc-desk-audio:focus-visible{box-shadow:0 0 0 6px #173c32}');
  });
});
