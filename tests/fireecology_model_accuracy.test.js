// Fire Ecology, sports-labs pass 2026-11-23: one simulator model, a published fire-spread
// model with predict-first, and the fact audit. Calibrated against the pre-pass file
// (C:/tmp/sports_labs_1123/fireecology/start.js): every describe block below fails there.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_fireecology.js';
let cfg;
beforeEach(() => {
  resetStemLab();
  cfg = loadTool(FILE, 'fireEcology');
});
const render = (state = {}) => renderTool('fireEcology', { fireEcology: state });
const base = () => ({
  seed: 'fire-ecology-classroom-v1', year: 0, fuelLoad: 15, canopyCover: 60, understoryDensity: 20,
  soilHealth: 80, biodiversity: 85, carbonStored: 50, waterYield: 80, yearsSinceLastBurn: 0,
  totalBurns: 0, wildfires: 0, strategy: 'indigenous', visualSequence: 0, visualEvent: null, eventLog: [], decade: []
});

describe('one forest simulator model', () => {
  it('exposes the pure step function and applies the carbon ledger on every path', () => {
    const m = cfg.model;
    expect(typeof m.advance).toBe('function');
    const burn = m.advance(base(), 'culturalBurn').next;
    expect(burn.carbonStored).toBe(52);           // a cultural burn is a small sink (CARBON_DATA netCarbon10yr -2)
    expect(burn.fuelLoad).toBe(7);
    expect(burn.year).toBe(10);
    expect(burn.decade[0]).toMatchObject({ year: 10, fuel: 7, carbon: 52, water: 85, soil: 85 });
    const rx = m.advance(base(), 'prescribe').next;
    expect(rx.carbonStored).toBe(50);              // prescribed: a wash
  });

  it('runs the side-by-side comparison through the same function', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const compare = src.slice(src.indexOf("// Both forests step through the same fireSimAdvance"), src.indexOf("checkBadge('comparisonChamp')"));
    expect(compare).toContain("fireSimAdvance(sim, 'culturalBurn')");
    expect(compare).toContain("fireSimAdvance(simB, 'suppress', 'comparison-wildfire')");
    // the drifted copy subtracted carbon on a cultural burn
    expect(src).not.toContain('newA.carbonStored = clamp(sim.carbonStored - 2');
    // clicking "advance both" used to hand out the Mosaic Master badge, which belongs to the Cultural Mosaic
    expect(compare).not.toContain("checkBadge('mosaicMaster')");
    // Forest A is the main forest, so Forest B has to start from the same state, not the defaults
    expect(src).toContain("updMulti({ comparisonMode: true, simB: Object.assign({}, sim, { visualEvent: null, strategy: 'suppress' }) });");
  });

  it('allows a crown fire only above the stated fuel threshold, with the stated chance', () => {
    const m = cfg.model;
    expect(m.crownFuel).toBe(55);
    expect(m.crownChance(55)).toBe(0);
    expect(m.crownChance(56)).toBeCloseTo(0.2, 6);
    expect(m.crownChance(100)).toBeCloseTo(0.75, 6);
    // Suppress from fuel 40: lands on 52, below the threshold, so never a crown fire.
    for (let y = 0; y < 30; y++) {
      const r = m.advance(Object.assign(base(), { fuelLoad: 40, year: y * 10 }), 'suppress');
      expect(r.wildfire).toBe(false);
      expect(r.chance).toBe(0);
    }
    // Over many decades from fuel 60 some crown fires happen, and each one says why in model numbers.
    let fires = 0;
    for (let y = 0; y < 60; y++) {
      const r = m.advance(Object.assign(base(), { fuelLoad: 60, year: y * 10 }), 'suppress');
      expect(r.chance).toBeCloseTo((72 - 40) / 80, 6);
      if (r.wildfire) {
        fires++;
        expect(r.event).toContain('72 tons per acre');
        expect(r.event).toContain('over the 55');
        expect(r.event).toContain('40%');
        expect(r.next.fuelLoad).toBe(42);
      }
    }
    expect(fires).toBeGreaterThan(5);
    expect(fires).toBeLessThan(45);
  });

  it('labels wildfire risk from the model, not from separate fuel bands', () => {
    const m = cfg.model;
    const low = render({ tab: 'simulator', sim: Object.assign(base(), { fuelLoad: 40 }) });
    // fuel 40 + 12 = 52: still at or below 55, so the model gives no chance (the old bands said "Moderate")
    expect(m.nextDecadeRisk({ fuelLoad: 40 })).toBe(0);
    expect(low).toContain('data-fe-crown-risk="0"');
    const mid = render({ tab: 'simulator', sim: Object.assign(base(), { fuelLoad: 50 }) });
    expect(Math.round(m.nextDecadeRisk({ fuelLoad: 50 }) * 100)).toBe(28);
    expect(mid).toContain('data-fe-crown-risk="28"');
    expect(mid).toContain('28% chance of a crown fire');
    expect(mid).not.toContain('megafire territory');
  });
});

describe('fire spread model (Alexandridis et al. 2008 parameters)', () => {
  it('uses the published neighbour probability p0 * pw * ps', () => {
    const ch = cfg.model.spreadChance;
    expect(ch(1, 0, 0, 0)).toBeCloseTo(0.58, 6);
    expect(ch(1, 0, 8, 0)).toBeCloseTo(0.58 * Math.exp(0.045 * 8), 6);                       // downwind
    expect(ch(-1, 0, 8, 0)).toBeCloseTo(0.58 * Math.exp(0.045 * 8) * Math.exp(8 * 0.131 * -2), 6); // upwind
    expect(ch(0, 1, 0, 15)).toBeCloseTo(0.58 * Math.exp(-0.078 * 15), 6);                    // downhill
    expect(ch(0, -1, 0, 15)).toBe(1);                                                        // uphill, capped
  });

  it('spreads with the wind and up the slope, and evenly with neither', () => {
    const run = cfg.model.spreadRun;
    const tally = (opts) => {
      const t = {};
      for (let r = 0; r < 12; r++) { const a = run(Object.assign({ run: r }, opts)).answer; t[a] = (t[a] || 0) + 1; }
      return t;
    };
    expect(tally({ wind: 'none', slope: 'flat', fuel: 'continuous' }).even).toBeGreaterThanOrEqual(8);
    expect(tally({ wind: 'light', slope: 'flat', fuel: 'continuous' }).east).toBeGreaterThanOrEqual(8);
    expect(tally({ wind: 'strong', slope: 'flat', fuel: 'continuous' }).east).toBe(12);
    expect(tally({ wind: 'none', slope: 'moderate', fuel: 'continuous' }).north).toBe(12);
    const solid = run({ wind: 'none', slope: 'flat', fuel: 'continuous', run: 0 });
    const patchy = run({ wind: 'none', slope: 'flat', fuel: 'patchy', run: 0 });
    expect(patchy.burned).toBeLessThan(solid.burned);
  });

  it('asks for a prediction before it shows any result', () => {
    const setup = render({ tab: 'science', selectedScience: 'fireSpread' });
    expect(setup).toContain('data-fe-spread="setup"');
    expect(setup).toMatch(/<button[^>]*disabled=""[^>]*data-fe-spread-light="true"|<button[^>]*data-fe-spread-light="true"[^>]*disabled=""/);
    expect(setup).not.toContain('data-fe-spread-result');
    // Lit without a prediction (a stale flag) still shows nothing.
    const noPick = render({ tab: 'science', selectedScience: 'fireSpread', spreadLit: true });
    expect(noPick).not.toContain('data-fe-spread-result');
  });

  it('scores the prediction against the same run the grid draws', () => {
    const m = cfg.model;
    const r = m.spreadRun({ wind: 'strong', slope: 'flat', fuel: 'continuous', run: 0 });
    expect(r.answer).toBe('east');
    const hit = render({ tab: 'science', selectedScience: 'fireSpread', spreadWind: 'strong', spreadSlope: 'flat', spreadFuel: 'continuous', spreadPick: 'east', spreadLit: true });
    expect(hit).toContain('data-fe-spread-result="hit"');
    expect(hit).toContain('Of the ' + r.burned + ' burned squares, ' + r.sides.east + ' are east of the start, ' + r.sides.west + ' west');
    expect(hit).toContain('downwind (east) each step is ' + Math.round(r.ahead * 100) + '%');
    const miss = render({ tab: 'science', selectedScience: 'fireSpread', spreadWind: 'strong', spreadSlope: 'flat', spreadFuel: 'continuous', spreadPick: 'west', spreadLit: true });
    expect(miss).toContain('data-fe-spread-result="miss"');
  });
});

describe('fact audit: retracted claims stay out', () => {
  // Each phrase was in the tool before this pass and either contradicted its source or had
  // no findable source (Aaron's rule: keep the guidance, drop the number).
  const RETRACTED = [
    '40-60% less area burned', '70% more species', 'National Emerging Technologies Fund',
    'direct consequence of the cessation of Aboriginal burning', 'Black Summer was not a natural disaster',
    'were, ultimately, a consequence of fire suppression', 'discovered in 2020', '1 part per BILLION',
    'over 1,200 plant species', 'Since 2000, wildfire seasons have grown 78 days longer',
    'killed 85 firefighters', '10-50x more fuel', 'Prescribed burning has recovered it',
    'burned boreal forest to grow reindeer lichen', 'from 50+ miles away', '100-1000x',
    'Over 60% of US fresh water', '500,000 (10% of state', 'Trina Cunningham', '3-5x',
    'camas production increases', '20-60 tons of CO', 'Paradise in less than 4 hours',
    'fuel accumulated for over a century until 1988', 'eliminating 90% of the original species',
    'Old-growth chaparral becomes decadent', 'Cultural burning predates colonization by 65,000+ years',
    'The pattern is the same everywhere', '25 million beaver dams', 'Fire Behavior Modeling showed'
  ];
  it('no retracted phrase remains in the tool source', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const found = RETRACTED.filter((p) => src.toLowerCase().includes(p.toLowerCase()));
    expect(found).toEqual([]);
  });

  it('re-keys reworded registered strings instead of editing their fallbacks', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).toContain("'stem.fireecology.cultural_burning_predates_colonization_v2'");
    expect(src).toContain("'stem.fireecology.these_are_not_natural_disasters_each_w_v2'");
    expect(src).toContain("'stem.fireecology.suppress_fire_accumulate_fuel_catastro_v2'");
    expect(src).not.toContain("'stem.fireecology.cultural_burning_predates_colonization',");
    expect(src).not.toContain("'stem.fireecology.suppress_fire_accumulate_fuel_catastro',");
  });

  it('keeps sourced figures where the source supports them', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).toContain('153,336 acres');                  // CAL FIRE
    expect(src).toContain('0.54 inches in 5 minutes');       // NASA Earth Observatory
    expect(src).toContain('167 singing males in 1987');      // USFWS delisting rule
    expect(src).toContain('more than 24 million hectares');  // Royal Commission final report
  });
});

describe('quiz answer cues', () => {
  it('spreads correct answers across positions and rarely makes the key the longest choice', () => {
    const Q = cfg.model.quiz;
    expect(Q.length).toBe(32);
    const pos = [0, 0, 0, 0];
    let longest = 0;
    Q.forEach((q) => {
      pos[q.answer]++;
      const lens = q.choices.map((c) => c.length);
      const sorted = [...lens].sort((a, b) => b - a);
      if (lens[q.answer] === sorted[0] && sorted[0] > sorted[1] * 1.3) longest++;
    });
    pos.forEach((n) => expect(n).toBeGreaterThan(3));
    expect(longest).toBe(0);
    Q.forEach((q) => expect(typeof q.why).toBe('string'));
  });
});
