import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 35, lane visual (tag vz35). Road Ready 3D:
// - the player's headlights reach what the lesson teaches (Maine manual: low beams about 250 ft, high beams
//   twice that): one constant in feet drives the 3D lamp distance, and every place the lesson, the Night Vision
//   screen and the night card state the reach must equal it;
// - Maine Snow / Free Explore snow: a little more sun (still overcast, soft shadows) and a packed-snow road a
//   shade darker than the banks, so the road edge, the lines and the banks read (measured in the real shell:
//   lane_visual/harness/snowc.cjs, NOTES.md).

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let HL, SKY, SOURCE, UPDATE;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').split(path.sep).join('/'));
  mod.resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  mod.loadTool(TOOL, 'roadReady');
  HL = window.__RR_TEST_EXPORTS__.roadReadyHeadlights;
  SKY = window.__RR_TEST_EXPORTS__.roadReadySky;
  SOURCE = readFileSync(TOOL, 'utf8');
  UPDATE = SOURCE.slice(SOURCE.indexOf('        function updateThreeScene(s3) {'));
}, 300000);

const FT_PER_M = 3.28084;
const num = (re, text) => { const m = (text || SOURCE).match(re); expect(m, String(re)).toBeTruthy(); return Number(m[1]); };
// three.js r128 without physically correct lights (the tool never turns them on): a spot light's distance factor.
const falloff = (d, distance, decay) => Math.pow(Math.max(0, Math.min(1, 1 - d / distance)), decay);
// The frame code's headlight block, cut out of the source and run on stand-in lamps.
function runHeadlightBlock(highBeams, weather) {
  const start = UPDATE.indexOf('          // High beam toggle + headlight direction tracking');
  const end = UPDATE.indexOf('          // 3D Dashboard updates', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const lamp = () => ({ distance: 30, decay: 1, angle: 0, intensity: 0, target: { position: { set() {} } } });
  const s3 = { headlightL: lamp(), headlightR: lamp() };
  const names = ['s3', 'd', 'isNightNow', 'scn'];
  if (HL) names.push('rrHeadlightLamp');
  new Function(...names, UPDATE.slice(start, end))(s3, { highBeams }, true, { weather: weather || 'clear' }, HL && HL.rrHeadlightLamp);
  return s3;
}

describe('vz35: the 3D headlights reach what the lesson says', () => {
  it('one constant in feet, and it is the Maine manual\'s: low 250, high twice that', () => {
    expect(HL).toBeTruthy();
    expect(HL.RR_HEADLIGHT_REACH_FT).toEqual({ low: 250, high: 500 });
    expect(HL.RR_HEADLIGHT_REACH_FT.high).toBe(2 * HL.RR_HEADLIGHT_REACH_FT.low);
  });
  it('every place the tool states the reach equals the constant', () => {
    const { low, high } = HL.RR_HEADLIGHT_REACH_FT;
    const lessonAt = SOURCE.indexOf('At night your low beams let you see clearly only about');
    expect(lessonAt).toBeGreaterThan(0);
    const lesson = SOURCE.slice(lessonAt, lessonAt + 1900);
    expect(num(/only about (\d+) feet ahead \(Maine driver's manual\)/, lesson)).toBe(low);
    expect(num(/High beams reach about twice as far, ~(\d+) feet/, lesson)).toBe(high);
    expect(num(/headlight_range ≈ (\d+) ft \(low\)/, lesson)).toBe(low);
    expect(num(/headlight_range ≈ \d+ ft \(low\) \/ (\d+) ft \(high\)/, lesson)).toBe(high);
    // the Night Vision screen (its literals are what dev-tools/check_roadready_night_vision_model.cjs reads)
    expect(num(/var headlightRange = nvBeams === 'high' \? \d+ : (\d+);/)).toBe(low);
    expect(num(/var headlightRange = nvBeams === 'high' \? (\d+) : \d+;/)).toBe(high);
    expect(num(/'💡 Low \((\d+) ft\)'/)).toBe(low);
    expect(num(/'🔆 High \((\d+) ft\)'/)).toBe(high);
    expect(num(/Low beams show about (\d+) ft \(Maine driver/)).toBe(low);
    // the Night Driving card and the permit question
    expect(num(/Headlights reach ~(\d+) ft with lows/)).toBe(low);
    expect(num(/Headlights reach ~\d+ ft with lows, (\d+) ft with highs/)).toBe(high);
    expect(num(/Headlights let you see clearly only about (\d+) feet ahead/)).toBe(low);
  });
  it('the lamp goes out at 1.3 times the reach and fades like a real one (decay 2)', () => {
    for (const high of [false, true]) {
      const lamp = HL.rrHeadlightLamp(high);
      const reachM = (high ? 500 : 250) / FT_PER_M;
      expect(lamp.reachFt).toBe(high ? 500 : 250);
      expect(lamp.distance).toBeCloseTo(reachM * HL.RR_HEADLIGHT_CUTOFF, 9);
      expect(HL.RR_HEADLIGHT_CUTOFF).toBeGreaterThan(1.2); expect(HL.RR_HEADLIGHT_CUTOFF).toBeLessThan(1.4);
      expect(lamp.decay).toBe(2);
      // brightest at the car, always darker further on, still some light at the reach, none at the cutoff
      let last = 2;
      for (let d = 0; d <= lamp.distance; d += 1) { const f = falloff(d, lamp.distance, lamp.decay); expect(f).toBeLessThan(last + 1e-12); last = f; }
      expect(falloff(reachM, lamp.distance, 2)).toBeGreaterThan(0.04);
      expect(falloff(reachM * 1.2, lamp.distance, 2)).toBeLessThan(0.01);
      expect(falloff(lamp.distance, lamp.distance, 2)).toBe(0);
    }
    // the old lamps (25 m / 50 m, decay 1) gave nothing at all at the stated reach
    expect(falloff(250 / FT_PER_M, 25, 1)).toBe(0);
    expect(falloff(500 / FT_PER_M, 50, 1)).toBe(0);
  });
  it('the frame code takes the lamp distance and decay from that constant (low, high, in fog)', () => {
    for (const weather of ['clear', 'fog']) for (const high of [false, true]) {
      const s3 = runHeadlightBlock(high, weather);
      const want = HL.rrHeadlightLamp(high);
      for (const side of ['headlightL', 'headlightR']) {
        expect(s3[side].distance).toBeCloseTo(want.distance, 9);
        expect(s3[side].decay).toBe(2);
        expect(s3[side].intensity).toBe(high ? 2.5 : 1.5); // brightness as before
      }
    }
    expect(UPDATE).not.toContain('var hlDist = highBeams ? 50 : 25;');
  });
  it('a clear night lets the high beams reach 500 ft: the dark haze is past them', () => {
    const haze = HL.RR_NIGHT_HAZE_M;
    expect(UPDATE).toContain('s3.scene.fog = new T.Fog(0x0a0f1e, RR_NIGHT_HAZE_M.near, RR_NIGHT_HAZE_M.far);');
    const highReachM = 500 / FT_PER_M, lowReachM = 250 / FT_PER_M;
    expect(haze.near).toBeLessThan(lowReachM);              // what is past the low beams still fades
    expect(haze.far).toBeGreaterThan(HL.rrHeadlightLamp(true).distance); // the haze is complete only past the high-beam light
    expect((highReachM - haze.near) / (haze.far - haze.near)).toBeLessThan(0.45); // at 500 ft the haze takes under half
    // the High level builds 8 chunks of 32 m ahead: the road reaches into the haze
    expect(8 * 32).toBeGreaterThan(haze.near + 0.6 * (haze.far - haze.near));
  });
  it('weather fog still limits what you see at night, and high beams in fog still glare', () => {
    // weather fog wins over the night haze and is unchanged: fog at the stated visibility, snow, rain
    expect(UPDATE).toContain("var skyState = isFogNow ? 'fog'");
    expect(UPDATE).toContain('s3.scene.fog = new T.Fog(0x94a3b8, skyFogRange.near, skyFogRange.far);');
    expect(UPDATE).toContain('s3.scene.fog = new T.Fog(0xcbd5e1, 10, 60);');
    expect(UPDATE).toContain('s3.scene.fog = new T.Fog(0x475569, 8, 50);');
    // clear-day haze is as it was (chunk ranges are checked against 120 m in roadready_pf30_graphics)
    expect(UPDATE).toContain('s3.scene.fog = new T.Fog(0x87ceeb, 30, 120);');
    // the veil in front of the car with high beams in fog, and the light pool that does not grow in fog
    expect(UPDATE).toContain("child.visible = scn.weather === 'fog' && !!(d && d.highBeams);");
    expect(UPDATE).toContain("var poolReach = (d && d.highBeams && scn.weather !== 'fog') ? 1.7 : 1.0;");
  });
});

describe('vz35: Maine Snow is a little brighter and its edges read', () => {
  const SCN = (id, time, weather) => ({ id, time, weather });
  const lum = (hex) => (0.2126 * ((hex >> 16) & 255) + 0.7152 * ((hex >> 8) & 255) + 0.0722 * (hex & 255)) / 255;
  // light on a level surface in the sun / in shade, from the plan (three r128: ambient + hemisphere sky + sun x N.L)
  const level = (plan) => {
    const n = plan.direction[1];
    const shade = plan.ambient.intensity * lum(plan.ambient.color) + plan.hemi.intensity * lum(plan.hemi.sky);
    return { shade, lit: shade + plan.sun.intensity * lum(plan.sun.color) * n };
  };
  it('snow by day: more sun than fog, still overcast (no disc, soft shadows), a little brighter than round 32', () => {
    const snow = SKY.rrSkyPlan(SCN('snow', 'day', 'snow'));
    const fog = SKY.rrSkyPlan(SCN('fog', 'day', 'fog'));
    const clear = SKY.rrSkyPlan(SCN('residential', 'day', 'clear'));
    expect(snow.overcast).toBe(true); expect(snow.disc).toBe(null);
    expect(snow.sun.intensity).toBe(0.4);
    expect(snow.sun.intensity).toBeGreaterThan(fog.sun.intensity);
    expect(snow.sun.intensity).toBeLessThan(clear.sun.intensity / 2);
    expect(snow.ambient).toEqual({ color: 0xffffff, intensity: 0.55 });
    expect(snow.hemi.intensity).toBe(0.45);
    const L = level(snow);
    // shade keeps at least 3/4 of the light: soft shadows (clear day: about 1/2)
    expect(L.shade / L.lit).toBeGreaterThanOrEqual(0.75);
    expect(level(clear).shade / level(clear).lit).toBeLessThan(0.6);
    // round 32 had sun 0.3: the level road gets 4 to 10% more light now
    const r32 = level(Object.assign({}, snow, { sun: Object.assign({}, snow.sun, { intensity: 0.3 }) }));
    expect(L.lit / r32.lit).toBeGreaterThan(1.04); expect(L.lit / r32.lit).toBeLessThan(1.10);
    // fog and rain unchanged; a snowy night is as dark as before
    expect(fog.sun.intensity).toBe(0.3);
    expect(SKY.rrSkyPlan(SCN('rain', 'day', 'rain')).sun.intensity).toBe(0.22);
    expect(SKY.rrSkyPlan(SCN('snow', 'night', 'snow')).sun.intensity).toBe(0.12);
  });
  it('the snowy road is packed snow a shade darker than the banks and the shoulder', () => {
    const m = SOURCE.match(/var asphaltBase = scn\.weather === 'snow' \? \[(0x[0-9a-f]{6}), (0x[0-9a-f]{6}), (0x[0-9a-f]{6})\]/);
    expect(m).toBeTruthy();
    const road = m.slice(1, 4).map(Number);
    const old = [0x8c9ba8, 0x7d8c9a, 0x9aa7b4]; // round 32
    road.forEach((hex, i) => {
      for (const shift of [16, 8, 0]) expect(Math.abs(((hex >> shift) & 255) - 0.8 * ((old[i] >> shift) & 255))).toBeLessThanOrEqual(1);
    });
    const bankTop = 0xf2f5f8, bankBase = 0xc8d0d4, shoulder = 0xb8c0c8, dryAsphalt = 0x353a40;
    expect(SOURCE).toContain('var sbBaseColor = 0xf2f5f8;'); expect(SOURCE).toContain('var sbDirtyColor = 0xc8d0d4;');
    expect(SOURCE).toContain(": scn.weather === 'snow' ? 0xb8c0c8");
    for (const hex of road) {
      // under the same light: banks and shoulder at least 40% brighter than the road (Weber >= 0.4) ...
      for (const edge of [bankTop, bankBase, shoulder]) expect(lum(edge) / lum(hex)).toBeGreaterThanOrEqual(1.4);
      // ... and it still reads as snow on the road, not bare dry asphalt
      expect(lum(hex) / lum(dryAsphalt)).toBeGreaterThan(1.8);
    }
  });
});
