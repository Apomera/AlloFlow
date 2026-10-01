// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// What Kitchen Lab TEACHES must agree with the model it cooks on and with
// USDA guidance. Each block pins a contradiction the 2026-09-27 review found:
// the text said one thing, the numbers another. A number shown must come
// from the model (minutesToBrowning, microCook, dangerClock), not be typed in.
const source = readFileSync('stem_lab/stem_tool_kitchenlab.js', 'utf8');
vi.setConfig({ testTimeout: 30000 });   // full-tool renders and bench runs; slow on a loaded machine
let E;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_kitchenlab.js', 'kitchenLab');
  E = window.StemLab._registry.kitchenLab.engine;
});
const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
// A failing toContain on the whole tool source or page makes vitest diff the
// entire string and hang; name what was missing instead.
const mustContain = (s, x) => expect(s.includes(x), 'missing: ' + x).toBe(true);
const mustNotContain = (s, x) => expect(s.includes(x), 'unexpected: ' + x).toBe(false);
const zoneAt = (T) => E.MAILLARD_ZONES.find((z) => T < z.maxF) || E.MAILLARD_ZONES[E.MAILLARD_ZONES.length - 1];

describe('Maillard zones describe speed, and agree with the model and the recipes', () => {
  it('never calls a temperature the recipes sear at inedible or charred', () => {
    for (const id of ['steak', 'stirFry', 'panSeared']) {
      const peak = E.runBench(E.RECIPES[id], 'dial', '0').result.snapshot.maxPanTempF;
      expect(zoneAt(peak).label, id + ' at ' + Math.round(peak) + '°F').not.toMatch(/inedible|charred|acrylamide/i);
      expect(zoneAt(peak).visual, id).not.toMatch(/inedible|on fire/i);
    }
    expect(zoneAt(400).label).not.toMatch(/bitter|charred/i);
  });

  it('quotes the model’s own times for a chicken breast surface', () => {
    const golden = (T) => E.minutesToBrowning(T, E.sandboxFood('chicken').doneness.browningScale[1]);
    expect(golden(290)).toBeGreaterThan(30);                                   // "over half an hour"
    expect(zoneAt(285).science).toMatch(/over half an hour/);                  // the 250-290°F zone
    expect(golden(320)).toBeGreaterThanOrEqual(14); expect(golden(340)).toBeLessThanOrEqual(20);   // "15-20 minutes"
    expect(zoneAt(320).visual).toMatch(/15-20 minutes/);
    expect(golden(360)).toBeLessThanOrEqual(10); expect(golden(400)).toBeGreaterThanOrEqual(5);    // "about 5-10 minutes"
    expect(zoneAt(360).visual).toMatch(/5-10 minutes/);
    expect(golden(425)).toBeGreaterThan(2); expect(golden(425)).toBeLessThan(4);                   // "2-4 minutes"
    expect(zoneAt(425).visual).toMatch(/2-4 minutes/);
    expect(golden(480)).toBeLessThan(1.5);                                     // "about a minute"
  });

  it('gets faster zone by zone, and puts acrylamide at about 250°F everywhere it is mentioned', () => {
    const mids = [270, 315, 370, 425, 475].map((T) => E.minutesToBrowning(T, 4));
    for (let i = 1; i < mids.length; i++) expect(mids[i]).toBeLessThan(mids[i - 1]);
    const acryl = (source.match(/acrylamide[^.]{0,80}/gi) || []).join(' | ');
    expect(acryl).not.toMatch(/425°F|480°F/);
    expect(zoneAt(500).science).toMatch(/about 250°F/);
  });

  it('times the sear the way the model does', () => {
    const sear = E.TECHNIQUES.find((t) => t.id === 'sear');
    expect(sear.keyScience).not.toMatch(/30-60 seconds/);
    expect(sear.keyScience).toMatch(/about 3 minutes/);
    const m = E.minutesToBrowning(425, E.sandboxFood('steak').doneness.browningScale[1]);
    expect(m).toBeGreaterThan(2.5); expect(m).toBeLessThan(3.5);
    mustNotContain(source, 'above 400°F you get crust within 60 seconds');
  });
});

describe('Heat & Technique: water cannot pass its boiling point', () => {
  it('cooks simmer, boil and steam in water: capped, wet, never browned, no oil', () => {
    for (const food of ['onion', 'mushrooms', 'chicken']) {
      const r = E.microCook(E.sandboxFood(food), 480, 300, { water: true });
      expect(r.panF, food).toBe(212);
      expect(r.label.idx, food).toBeLessThanOrEqual(1);
      expect(r.smokeSec, food).toBe(0);
      expect(r.oil, food).toBeNull();
      expect(r.sizzle.caption, food).toMatch(/boil/);
    }
    expect(E.microCook(E.sandboxFood('mushrooms'), 480, 300).label.label).toBe('burnt');   // the same heat in a dry pan does burn
    expect(E.waterCue(190)).toMatch(/simmer/);
    expect(E.waterCue(160)).toMatch(/no simmer yet/);
  });

  it('stops the slider at the boiling point and talks about water, not smoke', () => {
    const boil = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'heat', heatTechnique: 'boil', heatPanTempF: 480 } }));
    mustContain(boil, 'no oil: the water does the cooking');
    mustContain(boil, 'no browning in water');
    mustNotContain(boil, 'Smoking + risky');
    mustContain(boil, 'Perfect for Boil');
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'heat', heatTechnique: 'boil', heatPanTempF: 480 } });
    mustContain(html, 'data-kl-heat-max="212"');
    const denver = renderTool('kitchenLab', { kitchenLab: { activeSection: 'heat', heatTechnique: 'boil', heatPanTempF: 212, klAltitudeFt: 5280 } });
    mustContain(denver, 'data-kl-heat-max="201"');                           // water boils cooler up high
    const simmer = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'heat', heatTechnique: 'simmer', heatPanTempF: 212 } }));
    mustContain(simmer, 'Boiling, not simmering');
    const saute = renderTool('kitchenLab', { kitchenLab: { activeSection: 'heat', heatTechnique: 'saute', heatPanTempF: 480 } });
    mustContain(saute, 'data-kl-heat-max="500"');                            // a dry pan still goes to 500
  });

  it('fries something that cooks in three minutes', () => {
    expect(E.HEAT_DEFAULT_FOOD.fry).toBe('onion');
    const rings = E.microCook(E.sandboxFood('onion'), 350, E.HEAT_MICRO_SEC.fry);
    expect(rings.foodEndF).toBeGreaterThan(E.sandboxFood('onion').doneness.setF);
  });
});

describe('Steak follows the USDA rule: measured at 145°F before it leaves the heat', () => {
  it('tells the student to pull on the number, never under 145°F', () => {
    const s3 = E.RECIPES.steak.steps.find((s) => s.id === 's3');
    expect(s3.title).toMatch(/pull at your target \(never under 145°F\)/);
    expect(s3.instruction).toMatch(/before it leaves the heat/);
    expect(s3.title + s3.instruction).not.toMatch(/before your target|early/);
  });

  it('grades the textbook, pulled on the number, an A on every pan and every target', () => {
    for (const [v, c] of [['pan', 'stainless'], ['pan', 'castIron'], ['pan', 'nonstick'], ['opt:target', 'medium'], ['opt:target', 'mediumWell'], ['opt:target', 'well']]) {
      const r = E.runBench(E.RECIPES.steak, v, c).result;
      expect(r.judgement.grade, v + ':' + c + ' peak ' + r.snapshot.doneness.foodPeakF).toBe('A');
      expect(r.snapshot.doneness.foodPeakF).toBeGreaterThanOrEqual(145);
    }
    expect(E.runBench(E.RECIPES.steak, 'pull', '-10').result.judgement.score).toBeLessThanOrEqual(49);
  });

  it('keeps medium-rare advice and a 130°F steak out of the glossary', () => {
    expect(source).not.toMatch(/medium-rare \(130/);
    mustNotContain(source, 'steak to exactly 130°F');
    expect(source).not.toMatch(/Pull a steak at 125°F/);
  });
});

describe('Carryover text matches a model that adds a few degrees', () => {
  it('no longer promises 5-10°F of carryover', () => {
    expect(source).not.toMatch(/5-10°F/);
    const roast = E.runBench(E.RECIPES.roastChicken, 'x:door', 'shut').result;
    expect(roast.judgement.grade).toBe('A');
  });
});

describe('The danger-zone clock takes the one-hour rule from the room', () => {
  it('offers the room toggle and says where the doubling times come from', () => {
    const text = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'safety', safetyTemp: 139, safetyHours: 1.5 } }));
    mustContain(text, 'The room is over 90°F');
    mustContain(text, 'USDA limit for this room');
    mustContain(text, 'illustrative curve');
    mustNotContain(text, 'FDA Food Code');
  });
});

describe('Browning Lab tells caramelisation from Maillard, and shows the student’s own trials', () => {
  it('names sugar browning on its own as caramelisation', () => {
    const text = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'maillardHunt', maillardHunt: { tempF: 400, aminoPct: 0, sugarPct: 100, log: [] } } }));
    mustContain(text, 'Caramelisation');
    const none = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'maillardHunt', maillardHunt: { tempF: 250, aminoPct: 0, sugarPct: 100, log: [] } } }));
    mustNotContain(none, 'Caramelisation');
  });

  it('lists every logged trial in words, not just emoji', () => {
    const log = [{ t: 300, a: 50, s: 50, st: 'beginning' }, { t: 400, a: 0, s: 100, st: 'caramel' }];
    const html = renderTool('kitchenLab', { kitchenLab: { activeSection: 'maillardHunt', maillardHunt: { tempF: 350, aminoPct: 50, sugarPct: 50, log } } });
    mustContain(html, 'data-kl-mh-log="2"');
    expect(strip(html)).toContain('browning begins');
    expect(strip(html)).toContain('caramelisation');
  });
});

describe('Small facts put right', () => {
  it('ranks the smoke points highest to lowest, as the heading says', () => {
    const text = strip(renderTool('kitchenLab', { kitchenLab: { activeSection: 'resources', resourcesSub: 'smoke' } }));
    mustContain(text, 'Ranked highest to lowest');
    const shown = E.SMOKE_POINTS.map((o) => ({ at: text.indexOf(o.oil), f: o.smokeF })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
    expect(shown.length).toBe(E.SMOKE_POINTS.length);
    for (let i = 1; i < shown.length; i++) expect(shown[i].f).toBeLessThanOrEqual(shown[i - 1].f);
  });

  it('corrects the glossary, allergen and technique slips the review listed', () => {
    mustNotContain(source, 'Julienne (Allumette)');                       // allumette is 1/4 inch
    expect(source).not.toMatch(/carrageenan/);                                  // seaweed, not shellfish
    mustNotContain(source, 'Acid slows it');                              // acid and alkali both speed caramelisation
    mustNotContain(source, 'brining + acid marinades');                   // a brine is salt water
    expect(source).not.toMatch(/peanut, or grapeseed — any oil with smoke point above 450/);
    mustNotContain(source, 'Boiling kills bacteria instantly');          // spores survive
    mustNotContain(source, '1 large egg ≈ 4 tbsp');
    mustNotContain(source, 'The fond is caramelised sugar');
    mustContain(source, '20 seconds with soap and running water, warm or cold.');   // CDC: any temperature
    mustContain(source, "'🧼 20-Second Handwash (CDC)'");                   // WHO's full procedure is 40-60 s
  });
});
