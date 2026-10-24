// Coaster Lab — Engineer concept checks must actually grade what students type.
//
// Regression: renderProblems() writes the answer boxes as id="inP1" / "vP1",
// but checkPredictions() looked them up as 'clab-inP1' / 'clab-vP1'. Every
// lookup came back null, grade() returned null, the verdicts stayed blank, and
// the inspection report said "Some calculations were never checked" forever —
// so Engineer certification could never pass. It shipped that way from the
// tool's first commit because the only pin grepped the source for the
// "CERTIFIED" banner string.
//
// These tests run the REAL renderProblems + checkPredictions against a DOM and
// do what a student does: read the givens off the panel, calculate, type, check.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL_PATHS = [
  'stem_lab/stem_tool_coasterlab.js',
  'desktop/web-app/public/stem_lab/stem_tool_coasterlab.js',
];

// The panel's static containers, as the tool's own markup declares them.
const HOST_IDS = ['clab-markerLegend', 'clab-engineerBtns', 'clab-certIntro', 'clab-problems', 'clab-certResult'];

function loadEngineerPanel(file) {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  const opts = (label) => ({ file, label });
  const body = [
    sliceBetween(src, 'const G0 = ', ';', { ...opts('G0'), includeEnd: true }),
    sliceBetween(src, 'const TOL = ', ';', { ...opts('TOL'), includeEnd: true }),
    sliceBetween(src, 'const MARKER_COL = ', ';', { ...opts('MARKER_COL'), includeEnd: true }),
    sliceBetween(src, 'const fmt = ', '\n', opts('fmt')),
    sliceBetween(src, 'function __clabGet(id){', '\n', opts('__clabGet')),
    "const problemsEl = __clabGet('clab-problems');",
    "const certResultEl = __clabGet('clab-certResult');",
    "function renderExplore(){ throw new Error('Explore is not under test here'); }",
    // the host the check-4 buttons call into: a design change re-renders the
    // cards, exactly as the tool's fullRebuild() does
    'const banners = [], saves = [];',
    'function banner(msg){ banners.push(msg); }',
    'function designLocked(){ return false; }',
    'function saveDesign(){ saves.push(JSON.stringify(design.points)); }',
    'function fullRebuild(){ renderProblems(); }',
    // renderProblems through applyCertBankAnswer + showCertTurn, which sit
    // before the Explore section on purpose so this slice carries them
    sliceBetween(src, 'function renderProblems(){', '\n/* ---------------- Explore level', opts('renderProblems')),
    sliceBetween(src, 'function checkPredictions(){', '\nfunction gradeCertRun(', opts('checkPredictions')),
  ].join('\n');
  const make = new Function('rootEl', 'analysis', 'design',
    "let level = 'engineer';\nlet preds = {};\n" + body +
    '\nreturn { renderProblems, checkPredictions, applyCertBankAnswer, preds: () => preds, banners, saves, G0 };');
  return { src, make };
}

// design stub: the flagged turn (node 5) is banked 50°, like the Classic Looper
const looperDesign = () => ({ certTurnIdx: 5, points: Array.from({ length: 8 }, (_, i) => ({ x: i, y: 5, z: 0, bank: i === 5 ? 50 : 0 })) });

// A looper like the live starter: crest, valley, loop apex, flagged turn.
// Givens are already at the panel's one-decimal precision.
function looperAnalysis(G0) {
  const A = { h: 29.4, v: 3.5 }, B = { h: 4.6, r: 18 }, C = { h: 26.3, r: 6.5 }, D = { h: 12, r: 20 };
  const vAt = (h) => Math.sqrt(A.v * A.v + 2 * G0 * (A.h - h));
  return {
    L: null, A, B, C, D, clears: true,
    ans: {
      vL: null, vB: vAt(B.h), vCmin: Math.sqrt(G0 * C.r), vC: vAt(C.h),
      gB: 1 + vAt(B.h) ** 2 / (G0 * B.r), vD: vAt(D.h),
      bankD: Math.atan(vAt(D.h) ** 2 / (G0 * D.r)) * 180 / Math.PI,
    },
  };
}

// Detach every mounted panel even when a test throws mid-mount. jsdom answers a
// scoped '#id' query through the DOCUMENT's id map, so a leftover panel with the
// same ids makes rootEl.querySelector('#clab-problems') return null in every
// later test — one failure would cascade into unrelated ones.
const mounted = [];
afterEach(() => { while (mounted.length) mounted.pop().remove(); });

function mount(file, analysisFor = looperAnalysis) {
  const { src, make } = loadEngineerPanel(file);
  const rootEl = document.createElement('div');
  rootEl.innerHTML = HOST_IDS.map((id) => `<div id="${id}"></div>`).join('');
  document.body.appendChild(rootEl);
  mounted.push(rootEl);
  const G0 = make(rootEl, null, looperDesign()).G0;
  const design = looperDesign();
  const panel = make(rootEl, analysisFor(G0), design);
  panel.renderProblems();
  return { src, rootEl, panel, G0, design };
}

// What a student reads off the rendered cards.
function readGivens(rootEl) {
  const given = (p) => rootEl.querySelector(`[data-p="${p}"] .given`).textContent;
  const num = (text, re) => {
    const m = text.match(re);
    if (!m) throw new Error(`given not found: ${re} in "${text}"`);
    return Number(m[1]);
  };
  const g1 = given('p1'), g2 = given('p2'), g3 = given('p3'), g4 = given('p4');
  return {
    hA: num(g1, /crest A: h = ([\d.]+) m/), vA: num(g1, /at v = ([\d.]+) m\/s/), hB: num(g1, /valley B: h = ([\d.]+) m/),
    hC: num(g2, /apex C: h = ([\d.]+) m/), rC: num(g2, /curvature r = ([\d.]+) m/),
    rB: num(g3, /curvature r = ([\d.]+) m/),
    hD: num(g4, /turn D: h = ([\d.]+) m/), rD: num(g4, /turn radius r = ([\d.]+) m/),
  };
}

function type(rootEl, id, value) {
  const el = rootEl.querySelector('#' + id);
  if (!el) throw new Error(`answer box #${id} is not on the panel`);
  el.value = String(value);
}

const verdict = (rootEl, id) => (rootEl.querySelector('#' + id) || {}).textContent;

describe('coaster lab — Engineer concept checks grade what students type', () => {
  it.each(TOOL_PATHS)('%s: the panel containers the grader needs exist in the tool markup', (p) => {
    const { src } = loadEngineerPanel(p);
    for (const id of HOST_IDS) expect(src.includes(`id="${id}"`) || src.includes(`id=\\"${id}\\"`), id).toBe(true);
  });

  it.each(TOOL_PATHS)('%s: correct answers calculated from the shown givens are all marked correct', (p) => {
    const { rootEl, panel, G0 } = mount(p);
    const g = readGivens(rootEl);
    const vAt = (h) => Math.sqrt(g.vA ** 2 + 2 * G0 * (g.hA - h));
    const vB = vAt(g.hB);
    type(rootEl, 'inP1', vB.toFixed(1));
    type(rootEl, 'inP2a', Math.sqrt(G0 * g.rC).toFixed(1));
    type(rootEl, 'inP2b', vAt(g.hC).toFixed(1));
    type(rootEl, 'inP3', (1 + vB ** 2 / (G0 * g.rB)).toFixed(2));
    type(rootEl, 'inP4', Math.round(Math.atan(vAt(g.hD) ** 2 / (G0 * g.rD)) * 180 / Math.PI));
    panel.checkPredictions();

    for (const v of ['vP1', 'vP2a', 'vP2b', 'vP3', 'vP4']) expect(verdict(rootEl, v), v).toBe('✓ matches physics');
    const preds = panel.preds();
    for (const k of ['p1', 'p2a', 'p2b', 'p3', 'p4']) {
      expect(preds[k], k).toBeTruthy();
      expect(preds[k].ok, k).toBe(true);
    }
    rootEl.remove();
  });

  it.each(TOOL_PATHS)('%s: a wrong answer is marked off with its error, a blank one asks for a value', (p) => {
    const { rootEl, panel, G0 } = mount(p);
    const g = readGivens(rootEl);
    const vB = Math.sqrt(g.vA ** 2 + 2 * G0 * (g.hA - g.hB));
    type(rootEl, 'inP1', (vB * 1.25).toFixed(1));
    panel.checkPredictions();

    expect(verdict(rootEl, 'vP1')).toMatch(/^✗ off by 2[45]% — recheck$/);
    expect(panel.preds().p1.ok).toBe(false);
    expect(verdict(rootEl, 'vP3')).toBe('enter a value');
    expect(panel.preds().p3).toBe(null);
    rootEl.remove();
  });
});

// Check 4 told students to set node N's bank in Build; the bank slider's change
// runs fullRebuild -> renderProblems, which wiped every typed answer.
describe('coaster lab — check 4 can be followed without losing work', () => {
  function answerAll(rootEl, G0) {
    const g = readGivens(rootEl);
    const vAt = (h) => Math.sqrt(g.vA ** 2 + 2 * G0 * (g.hA - h));
    const ans = {
      inP1: vAt(g.hB).toFixed(1), inP2a: Math.sqrt(G0 * g.rC).toFixed(1), inP2b: vAt(g.hC).toFixed(1),
      inP3: (1 + vAt(g.hB) ** 2 / (G0 * g.rB)).toFixed(2),
      inP4: String(Math.round(Math.atan(vAt(g.hD) ** 2 / (G0 * g.rD)) * 180 / Math.PI)),
    };
    for (const [id, v] of Object.entries(ans)) type(rootEl, id, v);
    return ans;
  }

  it.each(TOOL_PATHS)('%s: typed answers survive a re-render and are re-checked', (p) => {
    const { rootEl, panel, G0 } = mount(p);
    const ans = answerAll(rootEl, G0);
    panel.checkPredictions();
    panel.renderProblems(); // what any design change does
    for (const [id, v] of Object.entries(ans)) expect(rootEl.querySelector('#' + id).value, id).toBe(v);
    for (const v of ['vP1', 'vP2a', 'vP2b', 'vP3', 'vP4']) expect(verdict(rootEl, v), v).toBe('✓ matches physics');
    expect(panel.preds().p4 && panel.preds().p4.ok).toBe(true);
    rootEl.remove();
  });

  it.each(TOOL_PATHS)('%s: an unchecked panel keeps its values but is not graded behind the student\'s back', (p) => {
    const { rootEl, panel } = mount(p);
    type(rootEl, 'inP1', '22.3');
    panel.renderProblems();
    expect(rootEl.querySelector('#inP1').value).toBe('22.3');
    expect(verdict(rootEl, 'vP1')).toBe('');
    expect(Object.keys(panel.preds())).toEqual([]);
    rootEl.remove();
  });

  it.each(TOOL_PATHS)('%s: "Bank node N to my answer" banks the flagged node and keeps every answer', (p) => {
    const { rootEl, panel, G0, design } = mount(p);
    const ans = answerAll(rootEl, G0);
    panel.checkPredictions();
    expect(rootEl.querySelector('#clab-certBankNow').textContent).toContain('banked 50°');
    rootEl.querySelector('#clab-btnApplyCertBank').click();
    expect(design.points[5].bank).toBe(Number(ans.inP4));
    expect(panel.saves.length).toBe(1); // saveDesign = undo snapshot + storage
    expect(rootEl.querySelector('#clab-certBankNow').textContent).toContain(`banked ${ans.inP4}°`);
    for (const [id, v] of Object.entries(ans)) expect(rootEl.querySelector('#' + id).value, id).toBe(v);
    expect(verdict(rootEl, 'vP4')).toBe('✓ matches physics');
    rootEl.remove();
  });

  it.each(TOOL_PATHS)('%s: with no angle typed, Apply asks for one and leaves the track alone', (p) => {
    const { rootEl, panel, design } = mount(p);
    rootEl.querySelector('#clab-btnApplyCertBank').click();
    expect(design.points[5].bank).toBe(50);
    expect(panel.saves.length).toBe(0);
    expect(panel.banners.join(' ')).toMatch(/Type your bank angle/);
    rootEl.remove();
  });
});

// n = 1 + v²/(gr) builds on check 1. On a steep valley an ACCEPTED v_B (inside
// its 6% tolerance) carried correctly into check 3 used to miss ±0.35 g.
describe('coaster lab — check 3 carries an accepted v_B forward', () => {
  const steepAnalysis = (G0) => {
    const base = looperAnalysis(G0);
    const A = { h: 60, v: 3.5 }, B = { h: 2, r: 12 };
    const vB = Math.sqrt(A.v ** 2 + 2 * G0 * (A.h - B.h));
    return { ...base, A, B, ans: { ...base.ans, vB, gB: 1 + vB ** 2 / (G0 * B.r) } };
  };

  it.each(TOOL_PATHS)('%s: a 5%-high v_B carried through correctly is accepted; a wrong method is not', (p) => {
    const { rootEl, panel, G0 } = mount(p, steepAnalysis);
    const g = readGivens(rootEl);
    const vTrue = Math.sqrt(g.vA ** 2 + 2 * G0 * (g.hA - g.hB));
    const vStudent = +(vTrue * 1.05).toFixed(1);
    const nFromStudent = 1 + vStudent ** 2 / (G0 * g.rB);
    const nTrue = 1 + vTrue ** 2 / (G0 * g.rB);
    expect(Math.abs(nFromStudent - nTrue)).toBeGreaterThan(0.35); // the old grader's blind spot

    type(rootEl, 'inP1', vStudent);
    type(rootEl, 'inP3', nFromStudent.toFixed(2));
    panel.checkPredictions();
    expect(verdict(rootEl, 'vP1')).toBe('✓ matches physics');
    expect(verdict(rootEl, 'vP3')).toBe('✓ matches physics');

    // used the diameter for r (forgetting "1 +" happens to land near the true
    // value on this valley, so it would not prove anything)
    type(rootEl, 'inP3', (1 + vStudent ** 2 / (G0 * 2 * g.rB)).toFixed(2));
    panel.checkPredictions();
    expect(verdict(rootEl, 'vP3')).toMatch(/^✗/);
    rootEl.remove();
  });
});
