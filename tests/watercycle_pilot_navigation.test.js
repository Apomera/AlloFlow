import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

for (const file of ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('  var WC_PILOT_UNIT_M =');
  const end = source.indexOf('\n  };', source.indexOf('  window.WaterCyclePilotKernel = {'));
  const host = {};
  new Function('window', source.slice(start, end + 5))(host);
  const K = host.WaterCyclePilotKernel;
  describe(`navigation assistance: ${file}`, () => {
    const env = K.environment('tropicalOcean');
    const initial = K.initialState('tropicalOcean');
    const target = { x: 50, z: -30, altitudeM: env.lclM + 100 };
    const position = { x: 0, z: 0 };
    it('yields to manual controls, pause, disabling, and missing targets', () => {
      for (const options of [{}, { enabled: false }, { enabled: true, manual: true }, { enabled: true, paused: true }]) {
        expect(K.assistControls(initial, env, position, target, 0, options)).toEqual({ thrust: 0, surge: 0, strafe: 0, active: false });
      }
      expect(K.assistControls(initial, env, position, null, 0, { enabled: true }).active).toBe(false);
    });
    it('steers toward the same world destination at every camera angle with bounded input', () => {
      for (const yaw of [-3, -1.05, 0, 1.2, Math.PI]) {
        const controls = K.assistControls(initial, env, position, target, yaw, { enabled: true });
        const vx = -Math.sin(yaw) * controls.surge + Math.cos(yaw) * controls.strafe;
        const vz = -Math.cos(yaw) * controls.surge - Math.sin(yaw) * controls.strafe;
        expect(vx).toBeGreaterThan(0); expect(vz).toBeLessThan(0);
        expect(Math.hypot(controls.surge, controls.strafe)).toBeLessThanOrEqual(1.000001);
        expect(Math.abs(controls.thrust)).toBeLessThanOrEqual(1);
      }
    });
    it('cancels ordinary wind drift when hovering over a target', () => {
      const state = { ...initial, form: 'vapor', altitudeM: target.altitudeM };
      const controls = K.assistControls(state, env, target, target, 0, { enabled: true });
      expect(controls.strafe * 22 + env.windMs * 0.11 * K.UNIT_M).toBeCloseTo(0, 8);
      expect(controls.surge).toBeCloseTo(0, 8);
    });
    it('cannot lift falling rain or award phase-change and collision credit', () => {
      const state = { ...initial, form: 'rain', altitudeM: 500, mass: 1 };
      const original = JSON.stringify({state, env, position, target});
      const controls = K.assistControls(state, env, position, target, 0, { enabled: true });
      expect(controls.thrust).toBe(0);
      expect(Object.keys(controls).sort()).toEqual(['active','strafe','surge','thrust']);
      expect(JSON.stringify({state, env, position, target})).toBe(original);
      let vapor = { ...initial, form: 'vapor', altitudeM: env.lclM + 50, nucleus: false };
      for(let i=0;i<600;i++) vapor = K.step(vapor, { ...K.assistControls(vapor, env, position, target, 0, { enabled: true }), dt: 0.016 });
      expect(vapor.form).toBe('vapor'); expect(vapor.nucleus).toBe(false); expect(vapor.droplets).toBe(0);
    });
    it('converges horizontally and vertically through normal physics', () => {
      let state = { ...initial, form: 'vapor', altitudeM: env.lclM + 25, vy: 0 };
      const location = { x: -20, z: 20 };
      for(let i=0;i<1800;i++) {
        const c = K.assistControls(state, env, location, target, 0, {enabled:true});
        location.x += (c.strafe * 22 + env.windMs * 0.11 * K.UNIT_M) * 0.016;
        location.z -= c.surge * 22 * 0.016;
        state = K.step(state, {thrust:c.thrust,dt:0.016});
      }
      expect(Math.hypot(location.x-target.x,location.z-target.z)).toBeLessThan(1);
      expect(Math.abs(state.altitudeM-target.altitudeM)).toBeLessThan(15);
    });
    it('selects a real live particle above cloud base without reviving consumed particles', () => {
      const positions = new Float32Array([0,100,0, 0,-9999,0, 0,1,0, 20,110,10, 100,110,100]);
      const seeds = [{live:false},{live:true},{live:true},{live:true},{live:true}];
      const before = Array.from(positions);
      expect(K.nearestAssistParticle(positions,seeds,{x:0,z:0,altitudeM:1200},1000)).toEqual({x:20,z:10,altitudeM:1320});
      expect(Array.from(positions)).toEqual(before);
      expect(K.nearestAssistParticle(positions,seeds,{x:0,z:0,altitudeM:1200},2000)).toBeNull();
    });
  });
}
