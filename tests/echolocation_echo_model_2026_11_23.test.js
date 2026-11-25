// Echolocation Lab pass, 2026-11-23: one echo model for every number the lab shows.
//
// Before this pass:
//  - the Doppler simulator multiplied an unlabeled slider by 10 and used a one-way,
//    moving-source formula, so "5 toward the bat" at 50 kHz read 58.5 kHz while the
//    worked example on the same tab (5 m/s, two-way echo) said 51,479 Hz;
//  - the Doppler Challenge told the answer ("Waves are COMPRESSED") and always put the
//    three answers in the same order; wrong answers got no reason;
//  - the 3D cave stored the one-way time (d / 343) but printed d = 343 x t / 2, which
//    gives half the distance it showed;
//  - the Speed of Sound Calculator showed the answer before anything was asked, and its
//    Emit Pulse button did nothing;
//  - the concrete wall on the reflection canvas was painted with a CSS var() (canvas
//    ignores it), so it was invisible;
//  - every XP call in the sonar hunt and Doppler quiz passed one number, awardXP(5),
//    to a (toolId, points, reason) function;
//  - a first visit opened on a species picker instead of the hunt.
// ECHOLOCATION_FILE=<path> points the suite at another copy (start.js turns it red).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ECHOLOCATION_FILE || 'stem_lab/stem_tool_echolocation.js';
const SRC = readFileSync(FILE, 'utf8');

function loadModel() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.window = sandbox;
  vm.runInNewContext(SRC, sandbox);
  return sandbox.__alloEcholocationModel;
}
const M = loadModel();

function render(state) {
  resetStemLab();
  loadTool(FILE, 'echolocation');
  return renderTool('echolocation', { echolocation: state || {} });
}
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('echo model', () => {
  it('is exposed and uses the round trip for echo delay', () => {
    expect(M).toBeTruthy();
    expect(M.echoDelaySec(1.715)).toBeCloseTo(0.01, 6); // 3.43 m there and back at 343 m/s
    expect(M.distanceFromDelay(M.echoDelaySec(7.3))).toBeCloseTo(7.3, 9);
    expect(M.echoDelaySec(50, M.speed('water'))).toBeCloseTo(100 / 1480, 9);
  });

  it('gives real wavelengths and says which prey sends a strong echo', () => {
    expect(M.wavelengthM(45000)).toBeCloseTo(0.00762, 5);
    expect(M.wavelengthM(50000) * 1000).toBeCloseTo(6.86, 2); // the lab's "6.9 mm at 50 kHz"
    expect(M.strongEcho(45000, 0.02)).toBe(true);   // moth body
    expect(M.strongEcho(45000, 0.005)).toBe(false); // mosquito: wave too long
    expect(M.strongEcho(80000, 0.005)).toBe(true);  // higher call finds it
  });

  it('computes the two-way Doppler echo that the worked example quotes', () => {
    expect(Math.round(M.echoFrequency(50000, 0, 5))).toBe(51479);
    expect(M.echoFrequency(50000, 0, -5)).toBeLessThan(50000);
    expect(M.echoFrequency(50000, 0, 0)).toBe(50000);
    // bat closing too: both steps shift
    expect(M.echoFrequency(50000, 3, 5)).toBeGreaterThan(M.echoFrequency(50000, 0, 5));
    expect(M.closingSpeed(50000, M.echoFrequency(50000, 0, 4))).toBeCloseTo(4, 9);
    expect(M.direction(50000, 51000)).toBe('toward');
    expect(M.direction(50000, 49000)).toBe('away');
    expect(M.direction(50000, 50000)).toBe('across');
  });

  it('builds echo-time options from two real slips and spreads the right answer over all positions', () => {
    const o = M.echoTimeOptions(50);
    expect(o.map((x) => x.id)).toEqual(['right', 'oneway', 'halved']);
    expect(o[0].sec).toBeCloseTo(100 / 343, 9);
    expect(o[1].sec).toBeCloseTo(50 / 343, 9);
    expect(o[2].sec).toBeCloseTo(25 / 343, 9);
    const positions = new Set();
    for (let s = 0; s < 6; s++) positions.add(M.order3(s).indexOf(0));
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
});

describe('numbers on screen come from the model', () => {
  beforeEach(() => resetStemLab());

  it('Doppler readout agrees with the worked example (5 m/s toward at 50 kHz)', () => {
    const t = text(render({ tab: 'doppler', mothSpeed: -5, dopplerFreq: 50000 }));
    expect(t).toContain('51.48 kHz');
    expect(t).toContain('+1,479 Hz');
    expect(t).toContain('5 m/s toward the bat');
    expect(t).not.toContain('58.5 kHz');
  });

  it('Doppler Challenge shows a call and an echo, not the answer, and explains a wrong pick', () => {
    const echo = Math.round(M.echoFrequency(45000, 0, 4));
    const q = { f: 45000, closing: 4, dir: 'toward', echo, order: [2, 0, 1], answer: null };
    const open = text(render({ tab: 'doppler', dopplerQ: q }));
    expect(open).toContain('45,000 Hz');
    expect(open).toContain(echo.toLocaleString('en-US') + ' Hz');
    expect(open).not.toMatch(/COMPRESSED \(bunched|STRETCHED \(spread/);
    // order [2,0,1] puts "across" first
    const iAcross = open.indexOf('Flying across'), iToward = open.indexOf('Flying toward');
    expect(iAcross).toBeGreaterThan(-1);
    expect(iAcross).toBeLessThan(iToward);
    const wrong = text(render({ tab: 'doppler', dopplerQ: Object.assign({}, q, { answer: 'away' }) }));
    expect(wrong).toContain('HIGHER than the call');
    const right = text(render({ tab: 'doppler', dopplerQ: Object.assign({}, q, { answer: 'toward' }) }));
    expect(right).toMatch(/about 4\.0 m\/s toward the bat/);
  });

  it('Echo Timer asks before it tells, and the right answer moves between positions', () => {
    const where = new Set();
    for (const dist of [1, 2, 3, 4, 5, 6]) {
      const html = render({ tab: 'waves', distCalcDist: dist, distCalcMedium: 'air' });
      const block = html.slice(html.indexOf('data-echo-timer'));
      const t = text(block);
      expect(t).toContain('How long until the echo comes back?');
      expect(t).not.toContain('time = 2'); // the math only appears after a pick
      const ms = (sec) => { const v = sec * 1000; return (v < 10 ? v.toFixed(2) : v.toFixed(1)) + ' ms'; };
      const labels = M.echoTimeOptions(dist).map((o) => ms(o.sec));
      const order = labels.map((l) => t.indexOf(l));
      order.forEach((i) => expect(i).toBeGreaterThan(-1));
      const rightRank = [...order].sort((a, b) => a - b).indexOf(order[0]);
      where.add(rightRank);
    }
    expect(where.size).toBeGreaterThan(1);
    const picked = text(render({ tab: 'waves', distCalcDist: 50, distCalcMedium: 'air', echoTimerPick: { key: '50|air', pick: 'oneway' } }));
    expect(picked).toContain('only the trip OUT');
    expect(picked).toContain('291.5 ms');
  });

  it('wavelength panel compares the call to real prey sizes', () => {
    const t = text(render({ tab: 'waves', waveFreq: 45000 }));
    expect(t).toContain('One wavelength: 7.6 mm');
    expect(t).toMatch(/Moth body 2\.0 cm: strong echo/);
    expect(t).toMatch(/Mosquito 5\.0 mm: weak echo/);
  });

  it('a first visit starts in the hunt with flight buttons; Change species opens the picker', () => {
    const first = render({});
    expect(first).toContain('data-echolocation-canvas');
    expect(first).toContain('data-echolocation-flight-pad');
    expect(text(first)).not.toContain('Choose Your Bat Species');
    expect(text(first)).toContain('10 times lower');
    const picker = render({ playableSpecies: null });
    expect(text(picker)).toContain('Choose Your Bat Species');
  });
});

describe('species and scenes', () => {
  beforeEach(() => resetStemLab());
  it('a fruit bat left on the Cave scene is moved to its own Tropical Canopy', () => {
    const html = render({ playableSpecies: 'frugivore', sonarScene: 0 });
    expect(html).toMatch(/aria-label="Tropical Canopy scene, selected"/);
    expect(html).not.toContain('Cave Exploration scene');
  });
});

describe('source-level fixes', () => {
  it('3D cave: no rock on the start point, and a bump costs energy at most twice a second', () => {
    expect(SRC).toContain('if (Math.hypot(gMesh.position.x, gMesh.position.z) < 2.5)');
    expect(SRC).toContain('if (!eng._lastBumpT || t - eng._lastBumpT > 0.5) { eng.energy -= 0.5; eng._lastBumpT = t; }');
  });

  it('3D cave stores the round-trip echo time', () => {
    expect(SRC).toContain('eng._lastEchoTime = EchoModel.echoDelaySec(closestWallDist);');
    expect(SRC).not.toContain('(closestWallDist / 343).toFixed(4)');
  });

  it('no Doppler number uses the old x10 one-way formula', () => {
    expect(SRC).not.toMatch(/mothSpeed \* 10\)/);
  });

  it('every awardXP call passes (toolId, points, reason)', () => {
    const calls = SRC.match(/awardXP\([^)]*\)/g) || [];
    expect(calls.length).toBeGreaterThan(5);
    calls.forEach((c) => expect(c).toMatch(/^awardXP\('echolocation', \d+, '/));
  });

  it('the reflection wall is painted with a canvas-safe color', () => {
    expect(SRC).toContain('gfx.fillStyle = canvasColor(mat.color);');
  });
});

describe('mounted', () => {
  let host, root;
  beforeEach(() => { resetStemLab(); host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { try { root && root.unmount(); } catch (e) {} host.remove(); delete window._echoLabAC; delete window.AudioContext; });

  it('closes its own AudioContext when the tool unmounts', async () => {
    let closed = 0;
    function FakeAC() {
      this.state = 'running'; this.currentTime = 0; this.sampleRate = 44100; this.destination = {};
      const node = () => ({ connect() {}, start() {}, stop() {}, type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
      this.createOscillator = node; this.createGain = node;
      this.close = () => { closed++; this.state = 'closed'; return Promise.resolve(); };
      this.resume = () => Promise.resolve();
    }
    window.AudioContext = FakeAC;
    const cfg = loadTool(FILE, 'echolocation');
    const data = { echolocation: {} };
    let bump = null;
    const ctx = {
      React, toolData: data, t: (k, f) => f || k, icons: new Proxy({}, { get: () => () => null }),
      update: (b, k, v) => { data[b] = Object.assign({}, data[b], { [k]: v }); if (bump) bump(); },
      updateMulti: (b, p) => { data[b] = Object.assign({}, data[b], p); if (bump) bump(); },
      addToast() {}, awardXP() {}, beep() {}, celebrate() {}, announceToSR() {}, setStemLabTool() {},
    };
    function Comp() { const s = React.useState(0); bump = () => s[1]((n) => n + 1); return cfg.render(ctx); }
    const act = React.act;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Comp)); });
    const call = [...host.querySelectorAll('[data-echolocation-flight-pad] button')].find((b) => /Call/.test(b.textContent));
    expect(call).toBeTruthy();
    await act(async () => { call.click(); });
    expect(window._echoLabAC).toBeTruthy();
    await act(async () => { root.unmount(); });
    root = null;
    expect(closed).toBe(1);
  });
});
