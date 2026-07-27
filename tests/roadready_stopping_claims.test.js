// RoadReady — the stopping-distance numbers a student is TAUGHT must match the
// numbers the tool COMPUTES.
//
// The tool has both: prose lessons quoting figures, and stoppingDistance(), which
// drives the interactive "Total stopping distance vs speed (the v² curve)" chart.
// They had drifted apart, and in the dangerous direction.
//
// The lesson said reaction time is 1.5 s, gave the 60 mph reaction distance
// correctly FOR 1.5 s (132 ft), and then quoted totals that only come out if
// reaction is ~0.7-0.85 s -- understating total stopping distance by 24-44%. A
// student taught "240 ft at 60 mph" who follows at that distance is ~60 ft short
// of what this tool's own physics says they need.
//
// So: parse the figures out of the teaching copy and check them against the model.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_roadready.js';
const CATALOG = 'ui_strings.js';

let RR;
let source;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(SOURCE, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR || !RR.stoppingDistance) throw new Error('stoppingDistance not exported');
  source = readFileSync(SOURCE, 'utf8');
});

// The reaction time the lesson tells the student to assume.
const TAUGHT_REACTION_SEC = 1.5;

describe('the model itself', () => {
  it('defaults to the reaction time the lesson teaches', () => {
    const withDefault = RR.stoppingDistance(60, 'clear');
    const explicit = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC);
    expect(withDefault.total_ft).toBeCloseTo(explicit.total_ft, 6);
  });

  it('splits reaction from braking, and only braking follows v²', () => {
    const a = RR.stoppingDistance(30, 'clear', TAUGHT_REACTION_SEC);
    const b = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC);
    expect(b.reaction_ft / a.reaction_ft).toBeCloseTo(2, 2);   // linear in v
    expect(b.braking_ft / a.braking_ft).toBeCloseTo(4, 1);     // quadratic in v
  });
});

describe('the teaching copy agrees with the model', () => {
  // "At 30 mph total stopping distance is ~110 ft. At 60 mph it is ~300 ft. ..."
  const quoted = () => {
    const m = source.match(/At 30 mph total stopping distance is ≈(\d+) ft\. At 60 mph it is ≈(\d+) ft\. At 80 mph it is ≈(\d+) ft/);
    if (!m) throw new Error('could not find the stopping-distance sentence in the lesson copy');
    return { 30: Number(m[1]), 60: Number(m[2]), 80: Number(m[3]) };
  };

  it('states a total for each speed that the model actually produces', () => {
    const said = quoted();
    [30, 60, 80].forEach((mph) => {
      const computed = RR.stoppingDistance(mph, 'clear', TAUGHT_REACTION_SEC).total_ft;
      const err = Math.abs(said[mph] - computed) / computed;
      expect(
        err,
        `lesson says ${said[mph]} ft at ${mph} mph; the model says ${computed.toFixed(0)} ft at the ${TAUGHT_REACTION_SEC}s reaction the lesson teaches`
      ).toBeLessThan(0.05);
    });
  });

  it('never understates the stop — erring short is the dangerous direction', () => {
    const said = quoted();
    [30, 60, 80].forEach((mph) => {
      const computed = RR.stoppingDistance(mph, 'clear', TAUGHT_REACTION_SEC).total_ft;
      expect(said[mph], `${mph} mph figure is shorter than the model`).toBeGreaterThan(computed * 0.95);
    });
  });

  it('quotes a reaction distance consistent with the reaction time it teaches', () => {
    // Two claims, worded differently: the quick-tip bullet (whose apostrophe is
    // backslash-escaped in the source) and the lesson prose.
    const claims = [
      /At 60 mph that\\?'s (\d+) ft before your brake even engages/,
      /at 60 mph, that is (\d+) feet before the brakes even touch/,
    ].map((re) => {
      const m = source.match(re);
      expect(m, `reaction-distance claim not found for ${re}`).not.toBeNull();
      return Number(m[1]);
    });

    const computed = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC).reaction_ft;
    claims.forEach((said) => {
      expect(
        Math.abs(said - computed) / computed,
        `copy says ${said} ft of reaction distance at 60 mph; the model says ${computed.toFixed(0)} ft`
      ).toBeLessThan(0.05);
    });
    // And the two places must agree with each other.
    expect(claims[0]).toBe(claims[1]);
  });

  it('keeps the v² claim about BRAKING distance, not total', () => {
    // Doubling speed quadruples braking distance but NOT the total, because
    // reaction distance only doubles. The copy used to conflate the two.
    const a = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC);
    const b = RR.stoppingDistance(120, 'clear', TAUGHT_REACTION_SEC);
    const totalRatio = b.total_ft / a.total_ft;
    expect(totalRatio).toBeLessThan(3.5);
    expect(totalRatio).toBeGreaterThan(2.5);

    const claim = source.match(/Double your speed = quadruple your ([A-Z]+) distance/);
    expect(claim, 'v-squared claim not found').not.toBeNull();
    expect(claim[1]).toBe('BRAKING');
  });
});

describe('wet-weather copy agrees with the model and with the permit bank', () => {
  it('states a wet penalty the model supports', () => {
    const dry = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC);
    const rain = RR.stoppingDistance(60, 'rain', TAUGHT_REACTION_SEC);
    const totalPct = Math.round((rain.total_ft / dry.total_ft - 1) * 100);
    const brakePct = Math.round((rain.braking_ft / dry.braking_ft - 1) * 100);

    // The coaching copy quotes both numbers; they must be the model's.
    const m = source.match(/Wet roads need roughly (\d+)% more total stopping distance[^.]*?about (\d+)% more/);
    expect(m, 'wet-weather coaching claim not found in the expected form').not.toBeNull();
    expect(Math.abs(Number(m[1]) - totalPct)).toBeLessThanOrEqual(10);
    expect(Math.abs(Number(m[2]) - brakePct)).toBeLessThanOrEqual(10);
  });

  it('does not claim a 4x wet penalty anywhere — that is roughly the ICE figure', () => {
    expect(source).not.toMatch(/4× normal stopping distance/);
    const dry = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC);
    const ice = RR.stoppingDistance(60, 'ice', TAUGHT_REACTION_SEC);
    const rain = RR.stoppingDistance(60, 'rain', TAUGHT_REACTION_SEC);
    // Evidence for the claim above: 4x belongs to ice, not rain.
    expect(ice.total_ft / dry.total_ft).toBeGreaterThan(3.5);
    expect(rain.total_ft / dry.total_ft).toBeLessThan(1.6);
  });

  it('matches the permit bank, which says wet is about 30-50% longer', () => {
    const dry = RR.stoppingDistance(60, 'clear', TAUGHT_REACTION_SEC);
    const rain = RR.stoppingDistance(60, 'rain', TAUGHT_REACTION_SEC);
    const pct = (rain.total_ft / dry.total_ft - 1) * 100;
    expect(pct).toBeGreaterThan(25);
    expect(pct).toBeLessThan(55);
  });
});

describe('the shared string catalog cannot drift back', () => {
  // __alloT('key', fallback) means the catalog value WINS at runtime. Fixing the
  // source fallback alone would have left the old numbers live for every user.
  it('carries the same stopping-distance sentence as the source', () => {
    const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
    const text = catalog?.stem?.roadready?.stopping_content;
    expect(text, 'stem.roadready.stopping_content missing from the catalog').toBeTruthy();
    const m = text.match(/At 30 mph total stopping distance is ≈(\d+) ft\. At 60 mph it is ≈(\d+) ft\. At 80 mph it is ≈(\d+) ft/);
    expect(m, 'catalog copy no longer matches the expected sentence shape').not.toBeNull();
    [[30, m[1]], [60, m[2]], [80, m[3]]].forEach(([mph, said]) => {
      const computed = RR.stoppingDistance(mph, 'clear', TAUGHT_REACTION_SEC).total_ft;
      expect(Math.abs(Number(said) - computed) / computed).toBeLessThan(0.05);
    });
  });
});
