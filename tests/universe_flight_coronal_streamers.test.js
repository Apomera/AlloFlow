import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const renderer = readFileSync('stem_lab/universe_flight_scene.js', 'utf8');
const exposed = {};
new Function('window', renderer.replace('global.UniverseFlight = {', 'global.__streamerShader = FRAGMENT; global.UniverseFlight = {'))(exposed);
const shader = exposed.__streamerShader;
const start = shader.indexOf('      vec3 streamerA = '), end = shader.indexOf('      corona = ', start);
if (start < 0 || end < start) throw new Error('Source-fixed streamer shader unavailable.');

// Evaluate the actual scalar shader expressions, rather than duplicating the
// lobe formula in an oracle. The surrounding vector basis has existing draw tests.
const scalarSource = shader.slice(start, end).replace(/\b(?:float|vec3)\s+/g, 'const ');
const evaluate = new Function('radius', 'phase', 'rim', 'u_stellarRight', 'u_stellarUp', 'u_stellarStructure', 'angle', 'normalize', 'vec3', 'cos', 'sin', 'dot', 'smoothstep', 'mix', scalarSource + '\nreturn { profile, streamerProfile };');
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const normalize = v => v.map(value => value / Math.hypot(...v));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const smoothstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a * (1 - t) + b * t;
function basis(toward) {
  toward = normalize(toward);
  const right = normalize(cross(Math.abs(toward[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], toward));
  return [right, cross(toward, right)];
}
function profile(angle, radius, seed, [right, up], structure = 1) {
  const rim = right.map((v, i) => v * Math.cos(angle) - up[i] * Math.sin(angle));
  return evaluate(radius, seed * 6.28318530718, rim, right, up, structure, angle, normalize, (...v) => v, Math.cos, Math.sin, dot, smoothstep, mix).profile;
}

// Reuse the existing GL fixture and its real camera/source-frame construction.
const fixtureSource = readFileSync('tests/universe_flight_stellar_structure.test.js', 'utf8').split('\ndescribe(')[0].replace(/^import[^\n]*\n/gm, '');
const fixture = new Function('afterEach', 'beforeAll', 'beforeEach', 'expect', 'vi', 'readFileSync', fixtureSource + `
  return { get scene(){return scene;}, get created(){return created;}, get uploads(){return uploads;}, get updates(){return updates;},
    STARS, pose, draw, starQuad, quads, advance, frame };
`)(afterEach, beforeAll, beforeEach, expect, vi, readFileSync);

describe('Broad source-fixed coronal streamers', () => {
  it('preserves ring mean and bounded nonnegative light at every radial and size fade', () => {
    let minimum = Infinity, maximum = -Infinity, worstMean = 0;
    for (const toward of [[0, 0, -1], [1, 0, 0], [0, 1, 0], [1, 2, -3], [-3, 1, 2]]) {
      for (const seed of [0, 0.17, 0.53, 0.91]) for (const radius of [0.35, 0.44, 0.55, 0.65, 0.95]) for (const structure of [0, 0.25, 0.6, 1]) {
        let sum = 0;
        for (let i = 0; i < 128; i++) {
          const value = profile(i * 2 * Math.PI / 128, radius, seed, basis(toward), structure);
          minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); sum += value;
        }
        worstMean = Math.max(worstMean, Math.abs(sum / 128 - 0.88));
      }
    }
    expect(Number.isFinite(minimum) && Number.isFinite(maximum)).toBe(true);
    expect(minimum).toBeGreaterThanOrEqual(0.67 - 1e-12); expect(maximum).toBeLessThanOrEqual(1.23 + 1e-12);
    expect(worstMean).toBeLessThan(1e-12);
  });

  it('keeps a source direction fixed when the screen basis turns and varies with source identity', () => {
    const [right, up] = basis([1, -2, 3]), turn = 0.71, c = Math.cos(turn), s = Math.sin(turn);
    const rotated = [right.map((v, i) => v * c + up[i] * s), up.map((v, i) => v * c - right[i] * s)];
    let seedDifference = 0, worstRotation = 0;
    for (let i = 0; i < 128; i++) {
      const angle = i * 2 * Math.PI / 128;
      worstRotation = Math.max(worstRotation, Math.abs(profile(angle, 0.7, 0.17, [right, up]) - profile(angle + turn, 0.7, 0.17, rotated)));
      seedDifference += Math.abs(profile(angle, 0.7, 0.17, [right, up]) - profile(angle, 0.7, 0.53, [right, up]));
    }
    expect(worstRotation).toBeLessThan(1e-12); expect(seedDifference / 128).toBeGreaterThan(0.015);
  });

  it('contains only broad angular modes and joins the radial fade smoothly', () => {
    const frame = basis([0.3, 0.7, -0.8]), samples = 128;
    for (let mode = 5; mode <= 24; mode++) {
      let cosine = 0, sine = 0;
      for (let i = 0; i < samples; i++) {
        const angle = i * 2 * Math.PI / samples, value = profile(angle, 0.8, 0.53, frame) - 0.88;
        cosine += value * Math.cos(mode * angle); sine += value * Math.sin(mode * angle);
      }
      expect(Math.hypot(cosine, sine) / samples).toBeLessThan(1e-12);
    }
    for (const radius of [0.35, 0.65]) for (const angle of [0, 0.7, 1.8, 3.5]) {
      const at = profile(angle, radius, 0.53, frame);
      expect(Math.abs(profile(angle, radius - 1e-5, 0.53, frame) - at)).toBeLessThan(1e-8);
      expect(Math.abs(profile(angle, radius + 1e-5, 0.53, frame) - at)).toBeLessThan(1e-8);
    }
  });

  it('gates the new shading to resolved named quads and keeps the original small-star calculation', () => {
    const old = 'corona = (1.0 - disk) * 0.16 * exp(-max(0.0, radius - 0.35) * 6.0) * (0.88 + 0.12 * cos(angle * 6.0 + phase));';
    expect(shader).toContain(old);
    const guard = shader.indexOf('if (u_stellarStructure > 0.0 && u_stellarQuad > 0.5)');
    expect(guard).toBeGreaterThan(shader.indexOf(old)); expect(guard).toBeLessThan(start);
    expect(shader.slice(guard, end)).not.toMatch(/u_time|random|texture2D/);
    const star = fixture.STARS[0];
    fixture.pose(star, { fov: 65 }); expect(fixture.starQuad(fixture.draw()).uniforms.u_stellarStructure).toBe(0);
    fixture.pose(star); const medium = fixture.starQuad(fixture.draw());
    expect(medium.uniforms.u_stellarStructure).toBeGreaterThan(0.9);
    fixture.pose(star, {}, { position: star.center.map((v, i) => v + (i === 2 ? -0.25 : 0)) });
    expect(fixture.starQuad(fixture.draw()).uniforms.u_stellarStructure).toBe(1);
    for (const region of ['galaxy', 'cosmic']) {
      fixture.scene.set({ region }); fixture.advance(); expect(fixture.quads(fixture.draw())).toHaveLength(0);
    }
  });

  it('preserves the static profile, resource counts and camera clocks through paused draws and restore', () => {
    fixture.pose(); const saved = fixture.scene.snapshot(), before = fixture.starQuad(fixture.draw());
    const resources = structuredClone(fixture.created), uploads = fixture.uploads.length, updates = fixture.updates.length;
    const original = profile(0.7, 0.6, 0.53, fixture.frame(before));
    fixture.advance(1000); expect(fixture.scene.snapshot()).toEqual(saved); expect(fixture.starQuad(fixture.draw())).toEqual(before);
    fixture.scene.look(0.1, -0.04); fixture.advance();
    const changed = fixture.scene.snapshot();
    expect(changed.state.position).toEqual(saved.state.position);
    for (const key of ['distanceLy', 'universeYears', 'travelerYears']) expect(changed.state[key]).toBe(saved.state[key]);
    expect(fixture.scene.restore(saved)).toBe(true); fixture.advance();
    expect(profile(0.7, 0.6, 0.53, fixture.frame(fixture.starQuad(fixture.draw())))).toBe(original);
    expect(fixture.created).toEqual(resources); expect(fixture.uploads).toHaveLength(uploads); expect(fixture.updates).toHaveLength(updates);
  });
});
