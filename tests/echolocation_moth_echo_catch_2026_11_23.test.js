// Echolocation Lab round 5 (2026-11-23, night).
// 1. A moth was caught by flying into it and calling: echoes were optional. Now a moth can only be caught
//    once its echo has come back to the bat on a recent call ("located", marked with a gold ring for
//    EchoModel.LOCATE_WINDOW_S = 5 s). The catch is by touch, and its announcement gives the echo time and
//    the distance that located the moth. A call reaches each moth once, so a moth gets one chance to dodge
//    per call (it used to roll the dodge every frame the call's disk covered it).
// 2. On a phone the two goal pills on the sonar scene wrapped into two rows over the top of the scene.
//    They now drop the long words, fit one row and sit just under the scene when the scene is narrow.
// ECHOLOCATION_FILE=C:/tmp/sports_labs_1123/echolocation/start_r3.js runs the checks against the earlier copy.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.ECHOLOCATION_FILE || 'stem_lab/stem_tool_echolocation.js';
const SRC = readFileSync(FILE, 'utf8');

function loadModel() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.window = sandbox;
  vm.runInNewContext(SRC, sandbox);
  return sandbox.__alloEcholocationModel;
}
const M = loadModel();
const PULSE_SPEED = Number(/var PULSE_SPEED = (\d+);/.exec(SRC)[1]);

describe('a moth is caught only after its echo has come back', () => {
  it('the echo takes as many frames back as the call took out', () => {
    expect(typeof M.echoReturnFrames).toBe('function');
    for (const px of [5, 20, 100, 237, 400]) expect(M.echoReturnFrames(px)).toBe(Math.max(1, Math.ceil(px / PULSE_SPEED)));
  });

  it('the announced time is 2 x the announced distance / 343 m/s', () => {
    for (const px of [40, 105, 137, 250, 399]) {
      const r = M.locateReport(px);
      expect(r.distM).toBe(Math.round(px * M.M_PER_PX * 10) / 10);
      expect(r.delayMs).toBeCloseTo(2 * r.distM / M.SPEED_AIR * 1000, 1);
      expect(r.delayMs.toFixed(1)).toBe((Math.round(2 * r.distM / M.SPEED_AIR * 10000) / 10).toFixed(1));
    }
  });

  it('located lasts the window and no longer; a mark from an earlier flight never counts', () => {
    expect(M.LOCATE_WINDOW_S).toBe(5);
    const loc = { t: 10 };
    expect(M.isLocated(loc, 10)).toBe(true);
    expect(M.isLocated(loc, 15)).toBe(true);
    expect(M.isLocated(loc, 15.01)).toBe(false);
    expect(M.isLocated(loc, 2)).toBe(false); // the clock restarted at 0 on a new flight
    expect(M.isLocated(null, 10)).toBe(false);
  });

  it('touching a moth catches it only when it is located', () => {
    const loc = { t: 1 };
    expect(M.canCatch(loc, 2, 25, 20, 8)).toBe(true);   // touching (25 < 20 + 8), located
    expect(M.canCatch(null, 2, 5, 20, 8)).toBe(false);  // touching, never located
    expect(M.canCatch(loc, 7, 5, 20, 8)).toBe(false);   // located too long ago
    expect(M.canCatch(loc, 2, 40, 20, 8)).toBe(false);  // located but not touching
  });

  it('the sonar loop wires it up: echoes back, catch by touch, the echo in the announcement, XP only for catches', () => {
    // the old catch (inside the call's hit loop, any moth within 20 px of the bat) is gone
    expect(SRC).not.toContain("if (hit.type === 'moth' && !isFrug && dist < catchR) {");
    expect(SRC).toContain('st.echoesBack.push({ obj: hit.obj, frames: EchoModel.echoReturnFrames(dist), distPx: dist, jammed: !!st.sonarJammed });');
    expect(SRC).toContain('if (EchoModel.canCatch(mo._loc, st.time, gap, mCatchR, mo.radius)) {');
    expect(SRC).toContain("'{value1} caught! You found it by its echo: it came back in {value2} milliseconds, so the moth was {value3} meters away. Total: {value4}.'");
    expect(SRC).toContain("'Moth located: its echo came back in {value1} milliseconds, so it is {value2} meters away{value3}. Fly into it in the next {value4} seconds.'");
    // one dodge roll per call, not one per frame
    expect(SRC).toContain('if (!pulse.mothSeen[hit.obj.id]) {');
    // XP: catches and the existing milestones only, never for locating
    const xpLines = SRC.split('\n').filter((l) => /awardXP\('echolocation', \d+, '/.test(l));
    expect(xpLines.filter((l) => /Caught a moth by sonar/.test(l)).length).toBe(1);
    const reasons = xpLines.map((l) => /awardXP\('echolocation', \d+, '([^']*)'/.exec(l)[1]);
    expect(reasons.some((r) => /located|locating/i.test(r))).toBe(false);
    // the fruit-bat path keeps its call-to-collect rule
    expect(SRC).toContain("if (hit.type === 'fruit' && isFrug && dist < catchR) {");
  });

  it('the located moth is marked on the scene, readable without motion, and in text under it', () => {
    expect(SRC).toContain("drawMoth(gfx, mo.x, mo.y, mo.radius || 8, reducedMotion.current ? 0 : st.time);");
    expect(SRC).toContain("'data-echolocation-located': ln && ln.n ? String(ln.n) : '0',");
    expect(SRC).toContain("t('stem.echolocation.sonar_vision_simulator_v2',");
    expect(SRC).toContain("t('stem.echolocation.call_wait_for_echo_then_fly_in',");
  });
});

describe('the goal pills fit one row on a phone', () => {
  it('a narrow scene drops the long words and moves the pills under it', () => {
    expect(SRC).toContain("'#echo-sonar-fs-wrap{container-type:inline-size}',");
    expect(SRC).toMatch(/@container \(max-width:560px\)\{\.echo-goal-pills\{position:static!important;[^}]*flex-wrap:nowrap!important/);
    expect(SRC).toContain('.echo-goal-long{display:none!important}');
    expect(SRC).toContain("className: 'echo-goal-pills', 'data-echolocation-goal-pills': 'true',");
    expect((SRC.match(/className: 'echo-goal-long'/g) || []).length).toBe(2);
  });

  it('the moth goal shows a moth, not a cricket', () => {
    expect(SRC).not.toContain("var preyIcon = isFrugivore ? '\\uD83C\\uDF4C' : '\\uD83E\\uDD97';");
    expect(SRC).toContain("var preyIcon = isFrugivore ? '\\uD83C\\uDF4C' : '\\uD83E\\uDD8B';");
  });
});
