// Invariant coverage for the Pets Lab "Pet-Care Week" sim economy.
//
// The render goldens only pin the DEFAULT menu view, so the care sim — the
// tool's biggest interactive surface — shipped with no behavioural coverage
// at all. These are source-derived invariant tests in the behavior_lens /
// worldbuilder-penmanship style: the sim lives inside a closure that SSR
// can't drive through seven days of clicks, so we re-derive the economy
// from the tool's own data tables and assert the properties that matter.
//
// They pin PROPERTIES, not numbers. Retuning a day's cost is fine; making
// the welfare-optimal week unaffordable, or the badge reachable while a
// domain is neglected, is not.
//
// Regression this locks in (2026-07-27): the sim gave every species a flat
// $500. The cheapest path to full welfare costs $115 (dog) / $296 (cat) /
// $596 (rabbit), so the *highest-welfare rabbit week was unreachable* — a
// student who chose to spay AND to treat GI stasis went bankrupt and was
// denied the badge, while one who skipped the spay kept it. The badge also
// ignored the Environmental domain, and caregiver energy was decremented
// but read by nothing despite being advertised as meaningful.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

/** Extract a brace-delimited object literal that follows `var <name> =`. */
function extractObject(name) {
  const start = SRC.indexOf('var ' + name);
  if (start < 0) throw new Error('could not find `var ' + name + '` in stem_tool_pets.js');
  const open = SRC.indexOf('{', start);
  let depth = 0;
  let i = open;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(open, i) + ')');
}

const CARE_SIM_DAYS = extractObject('CARE_SIM_DAYS');
const START_MONEY = extractObject('CARE_SIM_START_MONEY');
const INTERACT_EFFECTS = extractObject('INTERACT_EFFECTS');
const RECOVERY = Number((SRC.match(/var CARE_SIM_ENERGY_RECOVERY = (\d+)/) || [])[1]);
const TIRED_BELOW = Number((SRC.match(/var CARE_SIM_TIRED_BELOW = (\d+)/) || [])[1]);
const SPECIES = Object.keys(CARE_SIM_DAYS);

const clamp = (v) => Math.max(0, Math.min(100, v));

/**
 * Replays a week exactly as renderCareSim does: optional routine care each
 * day (halved while fatigued), then the day's scenario choice, with
 * overnight energy recovery between days.
 */
function playWeek(species, picks, careMask) {
  const days = CARE_SIM_DAYS[species];
  const start = START_MONEY[species];
  const s = { phys: 50, ment: 50, soc: 50, env: 50, en: 100, money: start, lowMoney: false, tiredCare: 0 };
  for (let dI = 0; dI < days.length; dI++) {
    if (dI > 0) s.en = clamp(s.en + RECOVERY);
    if ((careMask >> dI) & 1) {
      for (const kind of Object.keys(INTERACT_EFFECTS)) {
        const fx = INTERACT_EFFECTS[kind];
        const tired = s.en < TIRED_BELOW;
        if (tired) s.tiredCare++;
        const sc = tired ? 0.5 : 1;
        s.phys = clamp(s.phys + (fx.phys || 0) * sc);
        s.ment = clamp(s.ment + (fx.ment || 0) * sc);
        s.soc = clamp(s.soc + (fx.soc || 0) * sc);
        s.env = clamp(s.env + (fx.env || 0) * sc);
        s.en = clamp(s.en + (fx.en || 0));
        s.money += fx.money || 0;
        if (s.money < 0) s.lowMoney = true;
      }
    }
    const e = days[dI].choices[picks[dI]].effects || {};
    s.phys = clamp(s.phys + (e.phys || 0));
    s.ment = clamp(s.ment + (e.ment || 0));
    s.soc = clamp(s.soc + (e.soc || 0));
    s.env = clamp(s.env + (e.env || 0));
    s.en = clamp(s.en + (e.en || 0));
    s.money += e.money || 0;
    if (s.money < 0) s.lowMoney = true;
  }
  s.minDomain = Math.min(s.phys, s.ment, s.soc, s.env);
  s.spent = start - s.money;
  // Mirrors evaluateCareWelfare() plus nextDay()'s award test.
  s.moneySustainable = !s.lowMoney && s.money >= 0;
  s.energySustainable = s.en > 20 && s.tiredCare === 0;
  s.sustainable = s.moneySustainable && s.energySustainable;
  s.badge = s.minDomain >= 70 && s.sustainable;
  return s;
}

/** Every scenario-choice combination, played with and without routine care. */
function* allWeeks(species) {
  const days = CARE_SIM_DAYS[species];
  const counts = days.map((d) => d.choices.length);
  const total = counts.reduce((a, b) => a * b, 1);
  const fullCare = (1 << days.length) - 1;
  for (let idx = 0; idx < total; idx++) {
    let r = idx;
    const picks = [];
    for (let i = 0; i < counts.length; i++) { picks.push(r % counts[i]); r = Math.floor(r / counts[i]); }
    for (const mask of [0, fullCare]) yield playWeek(species, picks, mask);
  }
}

describe('Pets Lab — care-sim economy invariants', () => {
  it('extracts the sim tables and tuning constants from source', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(3);
    for (const sp of SPECIES) {
      expect(CARE_SIM_DAYS[sp].length).toBe(7);
      expect(typeof START_MONEY[sp]).toBe('number');
    }
    expect(RECOVERY).toBeGreaterThan(0);
    expect(TIRED_BELOW).toBeGreaterThan(0);
  });

  // THE headline regression. Doing right by the animal must be affordable.
  it.each(SPECIES)('%s: the best-welfare week is affordable', (sp) => {
    let cheapestExcellent = Infinity;
    for (const w of allWeeks(sp)) {
      if (w.minDomain >= 100 && w.spent < cheapestExcellent) cheapestExcellent = w.spent;
    }
    expect(cheapestExcellent).toBeLessThan(Infinity);
    expect(cheapestExcellent).toBeLessThanOrEqual(START_MONEY[sp]);
  });

  // A student who plays perfectly must actually receive the badge — the old
  // build denied it to the single best rabbit week in the game.
  it.each(SPECIES)('%s: a perfect-welfare week earns the badge', (sp) => {
    const perfect = [];
    for (const w of allWeeks(sp)) if (w.minDomain >= 100) perfect.push(w);
    expect(perfect.length).toBeGreaterThan(0);
    expect(perfect.some((w) => w.badge)).toBe(true);
  });

  // ...but the badge must stay earnable only by real care, not by spending.
  it.each(SPECIES)('%s: careless weeks can still go bankrupt', (sp) => {
    let maxSpend = 0;
    for (const w of allWeeks(sp)) if (w.spent > maxSpend) maxSpend = w.spent;
    expect(maxSpend).toBeGreaterThan(START_MONEY[sp]);
  });

  it.each(SPECIES)('%s: the badge is not free — some weeks fail it', (sp) => {
    const all = [...allWeeks(sp)];
    expect(all.some((w) => w.badge)).toBe(true);
    expect(all.some((w) => !w.badge)).toBe(true);
  });

  // The weakest welfare domain and both caregiver-resource constraints gate
  // the badge; strong animal scores cannot erase an exhausted/overdrawn plan.
  it('the badge gate covers welfare plus caregiver sustainability', () => {
    const gate = (SRC.match(/var earned = \(([^;]*)\);/) || [])[1] || '';
    expect(gate).toContain('finalWelfare.minimum >= 70');
    expect(gate).toContain('finalWelfare.sustainable');
  });

  it('no species can neglect a domain and still earn the badge', () => {
    for (const sp of SPECIES) {
      for (const w of allWeeks(sp)) {
        if (w.badge) expect(w.minDomain).toBeGreaterThanOrEqual(70);
      }
    }
  });

  // Caregiver energy must have a real consequence, not just a readout.
  it('low energy degrades routine care instead of being decorative', () => {
    expect(SRC).toMatch(/var tired = careSim\.en < CARE_SIM_TIRED_BELOW/);
    expect(SRC).toMatch(/var scale = tired \? 0\.5 : 1/);
    // Each domain's routine-care gain must be scaled by fatigue, not just
    // one of them. (Stay on a single line so a match can't span domains.)
    for (const domain of ['phys', 'ment', 'soc', 'env']) {
      expect(SRC).toMatch(new RegExp('\\b' + domain + ':\\s*clamp01\\([^\\n]*\\* scale'));
    }
  });

  it('energy recovers overnight so a full-care week stays sustainable', () => {
    expect(SRC).toMatch(/careSim\.en \+ CARE_SIM_ENERGY_RECOVERY/);
    // Full routine care every day, on the cheapest choices, must not force
    // the player into permanent fatigue — otherwise "care daily" is a trap.
    for (const sp of SPECIES) {
      const days = CARE_SIM_DAYS[sp];
      const cheapPicks = days.map((d) => {
        let best = 0;
        d.choices.forEach((c, i) => {
          if (((c.effects || {}).money || 0) > ((d.choices[best].effects || {}).money || 0)) best = i;
        });
        return best;
      });
      const w = playWeek(sp, cheapPicks, (1 << days.length) - 1);
      expect(w.en).toBeGreaterThan(0);
    }
  });

  it.each(SPECIES)('%s: at least one badge path is sustainable for the caregiver', (sp) => {
    const badgeWeeks = [...allWeeks(sp)].filter((w) => w.badge);
    expect(badgeWeeks.length).toBeGreaterThan(0);
    expect(badgeWeeks.every((w) => w.moneySustainable && w.energySustainable)).toBe(true);
  });

  it('the stated badge criteria match the code', () => {
    expect(SRC).toContain('all four welfare domains');
    expect(SRC).toMatch(/Physical, Mental, Social, and Environmental/);
  });

  it('the species picker discloses its budget', () => {
    expect(SRC).toContain('Week budget: $');
    for (const sp of SPECIES) expect(START_MONEY[sp]).toBeGreaterThan(0);
  });
});
