import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const phaseStart = source.indexOf('// Render reach after prey movement/contact');
const phaseEnd = source.indexOf('// ─── Ink defense', phaseStart);
if (phaseStart < 0 || phaseEnd <= phaseStart) throw new Error('Could not locate the live strike render step');
const phaseSource = source.slice(phaseStart, phaseEnd);

// Execute the production render step with Three's real transform math. The
// clocks are supplied independently so a meal can occur during strike recovery.
const buildStep = new Function('THREE', 'speciesId', 'state', `
  var bodyScale=1,octopus=new THREE.Group(),gameState=state.gameState;
  var squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();
  var dt=1/60,isMoving=false,isJetting=false,pose;
  var animal={update:function(time,delta,nextPose){pose=nextPose;}};
  return function(now){
    var squidStrikeVisual=state.visual;
    ${phaseSource}
    state.visual=squidStrikeVisual;
    return pose;
  };
`);

function fixture(speciesId = 'humboldtSquid', withStrike = true) {
  const state = {
    gameState: { lastStrikeAt: 1000, camoEff: 0, currentSubstrate: 'sand', isDisplaying: false, a11y: { reducedMotion: false } },
    visual: withStrike ? { startedAt: 1000, aimWorld: new THREE.Vector3(1, 0.5, 1.5) } : null,
  };
  return { state, step: buildStep(THREE, speciesId, state) };
}

describe('Cephalopod Hunter squid strike clock', () => {
  it('finishes one accepted reach without replaying it when a clam meal resets the event clock', () => {
    const { state, step } = fixture();
    expect(step(1200).strike).toBe(1);
    expect(step(1260).strike).toBe(1);
    const recovering = step(1400).strike;
    expect(recovering).toBeGreaterThan(0);
    expect(recovering).toBeLessThan(1);

    // A clam is collected 500 ms after E, while the feeding stalks retract.
    state.gameState.lastStrikeAt = 1500;
    expect(step(1649).strike).toBeGreaterThan(0);
    expect(step(1649).strike).toBeLessThan(recovering);
    for (const now of [1650, 1700, 1900, 2149]) {
      const pose = step(now);
      expect(pose.strike, `feeding reach at ${now} ms`).toBe(0);
      expect(pose.strikeAim).toBeNull();
      expect(state.visual).toBeNull();
    }
  });

  it('does not start a squid feeding strike from a clam meal alone', () => {
    const { state, step } = fixture('humboldtSquid', false);
    state.gameState.lastStrikeAt = 2000;
    for (const now of [2000, 2100, 2200, 2500]) {
      expect(step(now).strike).toBe(0);
      expect(step(now).strikeAim).toBeNull();
    }
  });

  it('preserves the existing non-squid event animation', () => {
    const { step } = fixture('commonCuttlefish', false);
    expect(step(1000).strike).toBe(0);
    expect(step(1200).strike).toBe(1);
    expect(step(1400).strike).toBeGreaterThan(0);
    expect(step(1650).strike).toBe(0);
  });
});
