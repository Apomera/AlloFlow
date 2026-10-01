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
//
// Second regression (2026-09-13), found by enumerating every week (2,187
// decision paths x 128 routine-care patterns x 3 species):
//   * The five routine-care buttons added +49/+35/+28/+35 over a week, more
//     than the seven decisions combined, so "keep the pet-store cage, never
//     spay, home-remedy the GI stasis" + daily clicking EARNED the badge,
//     while the all-correct rabbit week (free-roam, hay, bonded partner,
//     spay, ER) finished $46 in debt and was DENIED. Routine care is now
//     small upkeep with an overnight cost for skipping, and budgets are
//     tuned against the all-best week rather than the cheapest badge week.
//   * The lowest energy any week could reach was 39, so the fatigue rule
//     and the "finish above 20%" row could never fire: two of the four badge
//     criteria were decorative. Careless choices now carry the effort they
//     cause (an accident to clean, a night at the ER) and recovery is 8.
//   * The highest-welfare option was authored first on 20 of 21 days and
//     rendered in authored order; a cat student who clicked the top button
//     seven times earned the badge without reading. Choices now rotate
//     deterministically by species and day.
//   * The scene-event chips were a second, hand-kept table that had drifted
//     from the day prompts on cat days 4-5 and rabbit days 3, 5, 6, 7. They
//     are now derived from the day table.

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

/** Extract a top-level `function <name>(...) {...}` and instantiate it. */
function extractFunction(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('could not find function ' + name);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < SRC.length; end++) {
    if (SRC[end] === '{') depth++;
    else if (SRC[end] === '}') { depth--; if (depth === 0) { end++; break; } }
  }
  // eslint-disable-next-line no-new-func
  return Function('return (' + SRC.slice(start, end) + ')')();
}

const CARE_SIM_DAYS = extractObject('CARE_SIM_DAYS');
const CARE_SIM_WEEK2 = extractObject('CARE_SIM_WEEK2');
const START_MONEY = extractObject('CARE_SIM_START_MONEY');
const INTERACT_EFFECTS = extractObject('INTERACT_EFFECTS');
const SKIP_COST = extractObject('CARE_SIM_ROUTINE_SKIP_COST');
const CONSEQUENCES = extractObject('CARE_SIM_CONSEQUENCES');
const CONSEQUENCE_BELOW = Number((SRC.match(/var CARE_SIM_CONSEQUENCE_BELOW = (\d+)/) || [])[1]);
const CONSEQUENCES_PER_NIGHT = Number((SRC.match(/var CARE_SIM_CONSEQUENCES_PER_NIGHT = (\d+)/) || [])[1]);
const evaluateCareWelfare = extractFunction('evaluateCareWelfare');
const petsCareOutlook = extractFunction('petsCareOutlook');
const RECOVERY = Number((SRC.match(/var CARE_SIM_ENERGY_RECOVERY = (\d+)/) || [])[1]);
const TIRED_BELOW = Number((SRC.match(/var CARE_SIM_TIRED_BELOW = (\d+)/) || [])[1]);
const SPECIES = Object.keys(CARE_SIM_DAYS);
const KINDS = Object.keys(INTERACT_EFFECTS);
const DOMAINS = ['phys', 'ment', 'soc', 'env'];

const clamp = (v) => Math.max(0, Math.min(100, v));

/**
 * Replays a week exactly as renderCareSim does: routine care (optional per
 * day, halved while fatigued) and the day's scenario choice in either order,
 * then overnight upkeep (each skipped task costs its domain) and energy
 * recovery between days. The final night's upkeep counts too.
 */
function playWeek(species, picks, careMask, scenarioFirst = false, table = CARE_SIM_DAYS) {
  const days = table[species];
  const start = START_MONEY[species];
  const s = {
    phys: 50, ment: 50, soc: 50, env: 50, en: 100, money: start,
    lowMoney: false, tiredCare: 0, minTaskStart: 100, events: 0,
  };
  const snapshots = [];
  const snap = (dI, chosen, careDone) => {
    const dailyInteractions = {};
    for (let i = 0; i < dI; i++) if ((careMask >> i) & 1) dailyInteractions[i] = { pet: true, feed: true, water: true, play: true, clean: true };
    if (careDone) dailyInteractions[dI] = { pet: true, feed: true, water: true, play: true, clean: true };
    const choices = [];
    for (let i = 0; i < dI; i++) choices.push({ choiceId: days[i].choices[picks[i]].id });
    if (chosen) choices.push({ choiceId: days[dI].choices[picks[dI]].id });
    snapshots.push({
      species, day: dI, choices, dailyInteractions,
      phys: s.phys, ment: s.ment, soc: s.soc, env: s.env, en: s.en, money: s.money,
      lowMoney: s.lowMoney, tiredCare: s.tiredCare,
    });
  };
  const doTask = (kind) => {
    const fx = INTERACT_EFFECTS[kind];
    const tired = s.en < TIRED_BELOW;
    s.minTaskStart = Math.min(s.minTaskStart, s.en);
    if (tired) s.tiredCare++;
    const sc = tired ? 0.5 : 1;
    for (const d of DOMAINS) s[d] = clamp(s[d] + (fx[d] || 0) * sc);
    s.en = clamp(s.en + (fx.en || 0));
    s.money += fx.money || 0;
    if (s.money < 0) s.lowMoney = true;
  };
  const doScenario = (dI) => {
    const choice = days[dI].choices[picks[dI]];
    const e = choice.effects || {};
    const after = choice.aftermath || {};
    for (const d of DOMAINS) s[d] = clamp(s[d] + (e[d] || 0));
    s.en = clamp(s.en + (e.en || 0) + (after.en || 0));
    s.money += (e.money || 0) + (after.money || 0);
    if (s.money < 0) s.lowMoney = true;
  };
  for (let dI = 0; dI < days.length; dI++) {
    const care = (careMask >> dI) & 1;
    snap(dI, false, false);
    if (scenarioFirst) { doScenario(dI); if (care) KINDS.forEach(doTask); }
    else { if (care) KINDS.forEach(doTask); doScenario(dI); }
    snap(dI, true, !!care);
    if (!care) {
      for (const kind of KINDS) {
        const cost = SKIP_COST[kind] || {};
        for (const d of Object.keys(cost)) s[d] = clamp(s[d] + cost[d]);
      }
    }
    // Consequences: the lowest domains under the threshold, at most N.
    const table = CONSEQUENCES[species] || {};
    const fired = DOMAINS.filter((d) => table[d] && s[d] < CONSEQUENCE_BELOW)
      .sort((a, b) => s[a] - s[b]).slice(0, CONSEQUENCES_PER_NIGHT);
    for (const d of fired) {
      const ev = table[d];
      s.money += ev.money || 0;
      if (s.money < 0) s.lowMoney = true;
      s.en = clamp(s.en + (ev.en || 0));
      if (ev.env) s.env = clamp(s.env + ev.env);
      s.events++;
    }
    if (dI < days.length - 1) s.en = clamp(s.en + RECOVERY);
  }
  s.minDomain = Math.min(s.phys, s.ment, s.soc, s.env);
  s.average = (s.phys + s.ment + s.soc + s.env) / 4;
  s.spent = start - s.money;
  // Mirrors evaluateCareWelfare() plus nextDay()'s award test.
  s.welfareTarget = Math.round(s.minDomain) >= 70 && Math.round(s.average) >= 80;
  s.moneySustainable = !s.lowMoney && s.money >= 0;
  s.energySustainable = s.en > 20 && s.tiredCare === 0;
  s.sustainable = s.moneySustainable && s.energySustainable;
  s.badge = s.welfareTarget && s.sustainable;
  s.snapshots = snapshots;
  return s;
}

function* allPicks(species, table = CARE_SIM_DAYS) {
  const counts = table[species].map((d) => d.choices.length);
  const total = counts.reduce((a, b) => a * b, 1);
  for (let idx = 0; idx < total; idx++) {
    let r = idx;
    const picks = [];
    for (let i = 0; i < counts.length; i++) { picks.push(r % counts[i]); r = Math.floor(r / counts[i]); }
    yield picks;
  }
}

/** Every scenario-choice combination, played with and without routine care. */
function* allWeeks(species) {
  const fullCare = (1 << CARE_SIM_DAYS[species].length) - 1;
  for (const picks of allPicks(species)) {
    for (const mask of [0, fullCare]) yield playWeek(species, picks, mask);
  }
}

const welfareSum = (choice) => DOMAINS.reduce((sum, d) => sum + ((choice.effects || {})[d] || 0), 0);
const fullCareMask = (sp) => (1 << CARE_SIM_DAYS[sp].length) - 1;
/** Index of the highest-welfare choice on each day. */
const bestPicks = (sp, table = CARE_SIM_DAYS) => table[sp].map((d) => {
  let best = 0;
  d.choices.forEach((c, i) => { if (welfareSum(c) > welfareSum(d.choices[best])) best = i; });
  return best;
});
/** Index of the lowest-welfare choice on each day. */
const worstPicks = (sp, table = CARE_SIM_DAYS) => table[sp].map((d) => {
  let worst = 0;
  d.choices.forEach((c, i) => { if (welfareSum(c) < welfareSum(d.choices[worst])) worst = i; });
  return worst;
});
const picksById = (sp, ids) => ids.map((id, i) => {
  const idx = CARE_SIM_DAYS[sp][i].choices.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error(sp + ' day ' + (i + 1) + ' has no choice ' + id);
  return idx;
});

describe('Pets Lab — care-sim economy invariants', () => {
  it('extracts the sim tables and tuning constants from source', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(3);
    for (const sp of SPECIES) {
      expect(CARE_SIM_DAYS[sp].length).toBe(7);
      expect(typeof START_MONEY[sp]).toBe('number');
    }
    expect(RECOVERY).toBeGreaterThan(0);
    expect(TIRED_BELOW).toBeGreaterThan(0);
    expect(Object.keys(SKIP_COST).sort()).toEqual(KINDS.slice().sort());
  });

  // THE headline regression, twice over. Doing right by the animal must be
  // affordable — and "right" means the choices the tool itself praises,
  // with the animal fed every day, not the cheapest week that scrapes 70.
  it.each(SPECIES)('%s: the all-best week is affordable and earns the badge in either task order', (sp) => {
    for (const scenarioFirst of [false, true]) {
      const w = playWeek(sp, bestPicks(sp), fullCareMask(sp), scenarioFirst);
      expect(w.money).toBeGreaterThanOrEqual(0);
      expect(w.lowMoney).toBe(false);
      expect(w.minDomain).toBeGreaterThanOrEqual(70);
      expect(w.tiredCare).toBe(0);
      expect(w.en).toBeGreaterThan(20);
      expect(w.minTaskStart).toBeGreaterThanOrEqual(TIRED_BELOW);
      expect(w.badge).toBe(true);
    }
  });

  // The budget margin must be measured against the all-best week. The 07-27
  // retune measured it against the cheapest badge week and left the rabbit
  // student who made every correct call $46 in debt.
  it.each(SPECIES)('%s: the all-best week keeps a real margin, not a rounding error', (sp) => {
    const w = playWeek(sp, bestPicks(sp), fullCareMask(sp));
    expect(w.money).toBeGreaterThanOrEqual(100);
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
    expect(gate).toContain('finalWelfare.welfareTarget');
    expect(gate).toContain('finalWelfare.sustainable');
    // The welfare target is a floor on the weakest domain AND on the average.
    // Probed on the lifted function, so the literal in evaluateCareWelfare,
    // the replay above and the criteria copy cannot drift apart silently.
    const base = { money: 100, lowMoney: false, en: 50, tiredCare: 0 };
    expect(evaluateCareWelfare({ ...base, phys: 70, ment: 70, soc: 70, env: 70 }).welfareTarget).toBe(false);
    expect(evaluateCareWelfare({ ...base, phys: 80, ment: 80, soc: 80, env: 80 }).welfareTarget).toBe(true);
    expect(evaluateCareWelfare({ ...base, phys: 70, ment: 90, soc: 90, env: 90 }).welfareTarget).toBe(true);
    expect(evaluateCareWelfare({ ...base, phys: 69, ment: 100, soc: 100, env: 100 }).welfareTarget).toBe(false);
    expect(evaluateCareWelfare({ ...base, phys: 72, ment: 75, soc: 78, env: 74 }).verdict).toContain('Adequate is not the same as good');
    expect(SRC).toContain('finish at 70% or higher and average 80% or more');
    expect(SRC).toContain('the four domains averaging 80%+');
    expect(SRC).toMatch(/details\.averagePct >= 80 && details\.stayedInBudget === true/);
  });

  it('no species can scrape 70 everywhere with a merely adequate week and still earn the badge', () => {
    for (const sp of SPECIES) {
      for (const w of allWeeks(sp)) {
        if (w.badge) expect(Math.round(w.average)).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it('no species can neglect a domain and still earn the badge', () => {
    for (const sp of SPECIES) {
      for (const w of allWeeks(sp)) {
        if (w.badge) expect(w.minDomain).toBeGreaterThanOrEqual(70);
      }
    }
  });

  // ── Routine care is upkeep, not a second score ─────────────────────────

  it('routine care is bounded: a week of clicking adds at most 21 points to any domain', () => {
    const weekly = {};
    for (const kind of KINDS) {
      for (const d of DOMAINS) weekly[d] = (weekly[d] || 0) + (INTERACT_EFFECTS[kind][d] || 0) * 7;
    }
    for (const d of DOMAINS) expect(weekly[d]).toBeLessThanOrEqual(21);
  });

  it('skipping a routine task costs at least as much overnight as doing it gains', () => {
    for (const kind of KINDS) {
      const gain = DOMAINS.reduce((sum, d) => sum + (INTERACT_EFFECTS[kind][d] || 0), 0);
      const cost = DOMAINS.reduce((sum, d) => sum + Math.abs((SKIP_COST[kind] || {})[d] || 0), 0);
      expect(gain).toBeGreaterThan(0);
      expect(cost).toBeGreaterThanOrEqual(gain);
    }
  });

  it('the sim charges overnight upkeep on every night, including the last', () => {
    expect(SRC).toMatch(/function overnightUpkeep\(state\)/);
    expect(SRC).toMatch(/var upkeep = overnightUpkeep\(careSim\);/);
    // Day-to-day transition carries the upkeep...
    expect(SRC).toMatch(/Object\.assign\(\{\}, careSim, upkeep, \{\s*day: careSim\.day \+ 1/);
    // ...and the final evaluation reads the upkept state, not the pre-night one.
    expect(SRC).toMatch(/var c = Object\.assign\(\{\}, careSim, upkeep\);\s*\n\s*var finalWelfare = evaluateCareWelfare\(c\);/);
    // The cost is announced on the next day's view, not applied silently.
    expect(SRC).toContain("className: 'petslab-care-overnight'");
    expect(SRC).toContain('Overnight: every routine task done yesterday');
  });

  // The weeks that made the old tuning indefensible. Each of these includes
  // choices the tool's own notes call welfare failures.
  const NEGLECT_WEEKS = [
    ['rabbit', ['cage', 'hay_first', 'solo', 'never', 'home_remedy', 'floor_visit', 'honest']],
    ['cat', ['space', 'one_quiet', 'free_roam', 'caps', 'wait_24', 'auto_feed', 'outside_temp']],
    ['dog', ['full', 'walk_first', 'reduce', 'skip', 'short_outside', 'alone_visits', 'shoo']],
  ];
  it.each(NEGLECT_WEEKS)('%s: a neglect week cannot be rescued by daily clicking (%j)', (sp, ids) => {
    for (const scenarioFirst of [false, true]) {
      const w = playWeek(sp, picksById(sp, ids), fullCareMask(sp), scenarioFirst);
      expect(w.badge).toBe(false);
    }
  });

  // Ratchet: with full routine care, how many worst-option days can a badge
  // week absorb? It was 5 / 4 / 5 before the retune and 4 / 3 / 3 before the
  // average floor. The threshold model will always allow some slack on a
  // strong week (cat's third is a week that rounds to exactly the 80%
  // average the student is shown); this pins that it cannot grow back.
  const WORST_DAY_CEILING = { dog: 3, cat: 3, rabbit: 3 };
  it.each(SPECIES)('%s: routine care cannot carry more worst-option days than the ratchet allows', (sp) => {
    const worst = worstPicks(sp);
    let maxWorst = 0;
    for (const picks of allPicks(sp)) {
      const w = playWeek(sp, picks, fullCareMask(sp));
      if (!w.badge) continue;
      const n = picks.filter((p, i) => p === worst[i]).length;
      if (n > maxWorst) maxWorst = n;
    }
    expect(maxWorst).toBeLessThanOrEqual(WORST_DAY_CEILING[sp]);
  });

  // Upkeep is part of care: a week of perfect decisions with an animal that
  // was never fed, watered, played with or cleaned up after is not badge-worthy.
  it.each(SPECIES)('%s: perfect decisions with no routine care do not earn the badge', (sp) => {
    const w = playWeek(sp, bestPicks(sp), 0);
    expect(w.badge).toBe(false);
  });

  // ── Consequence events ──────────────────────────────────────────────────

  it('every species has an overnight event for every domain, and none lowers the domain that caused it', () => {
    expect(CONSEQUENCE_BELOW).toBeGreaterThan(0);
    expect(CONSEQUENCES_PER_NIGHT).toBeGreaterThan(0);
    for (const sp of SPECIES) {
      for (const d of DOMAINS) {
        const ev = CONSEQUENCES[sp][d];
        expect(ev, sp + ' ' + d).toBeTruthy();
        for (const key of ['icon', 'label', 'note']) expect(typeof ev[key]).toBe('string');
        // An event costs the OWNER (money and/or effort); it never lowers its own domain.
        expect((ev.money || 0) <= 0 && (ev.en || 0) <= 0).toBe(true);
        expect((ev.money || 0) < 0 || (ev.en || 0) < 0).toBe(true);
        expect(ev[d]).toBeUndefined();
        // A second wording for consecutive nights, same cost, different words.
        expect(ev.alt, sp + ' ' + d + ' alt').toBeTruthy();
        expect(typeof ev.alt.label).toBe('string');
        expect(typeof ev.alt.note).toBe('string');
        expect(ev.alt.label).not.toBe(ev.label);
        expect(ev.alt.note).not.toBe(ev.note);
        expect(Object.keys(ev.alt).sort()).toEqual(['label', 'note']);
      }
    }
  });

  it.each(SPECIES)('%s: the all-best week never triggers an overnight event', (sp) => {
    for (const scenarioFirst of [false, true]) {
      expect(playWeek(sp, bestPicks(sp), fullCareMask(sp), scenarioFirst).events).toBe(0);
    }
    // ...and neither does skipping routine care on its own: events come from decisions.
    expect(playWeek(sp, bestPicks(sp), 0).events).toBe(0);
  });

  it.each(SPECIES)('%s: careless weeks do trigger overnight events', (sp) => {
    const w = playWeek(sp, worstPicks(sp), 0);
    expect(w.events).toBeGreaterThan(0);
  });

  it('consecutive nights alternate the event wording, and every call site passes the night', () => {
    expect(SRC).toMatch(/function describeConsequence\(species, dom, night\)/);
    expect(SRC).toMatch(/var useAlt = !!\(ev\.alt && Number\.isInteger\(night\) && night % 2 === 1\);/);
    const calls = [...SRC.matchAll(/describeConsequence\(([^)]*)\)/g)].map((m) => m[1]);
    const callSites = calls.filter((args) => !/^species, dom, night$/.test(args));
    expect(callSites.length).toBeGreaterThanOrEqual(5);
    for (const args of callSites) expect(args.split(',').length, args).toBe(3);
  });

  it('overnight events are charged in nextDay, announced, and listed on the reflection', () => {
    expect(SRC).toMatch(/var table = CARE_SIM_CONSEQUENCES\[state\.species\] \|\| \{\};/);
    expect(SRC).toMatch(/\.slice\(0, CARE_SIM_CONSEQUENCES_PER_NIGHT\)/);
    // Recovery is applied to the energy AFTER the night's events, not before.
    expect(SRC).toMatch(/var rested = Math\.max\(0, Math\.min\(100, upkeep\.en \+ CARE_SIM_ENERGY_RECOVERY\)\);/);
    expect(SRC).toContain("className: 'petslab-care-overnight-event'");
    expect(SRC).toContain("className: 'petslab-care-events'");
    expect(SRC).toMatch(/overnightEvents: \(c\.consequenceLog \|\| \[\]\)\.length/);
  });

  // ── Caregiver energy must have a real consequence ──────────────────────

  it('low energy degrades routine care instead of being decorative', () => {
    expect(SRC).toMatch(/var tired = careSim\.en < CARE_SIM_TIRED_BELOW/);
    expect(SRC).toMatch(/var scale = tired \? 0\.5 : 1/);
    // Each domain's routine-care gain must be scaled by fatigue, not just
    // one of them. (Stay on a single line so a match can't span domains.)
    for (const domain of DOMAINS) {
      expect(SRC).toMatch(new RegExp('\\b' + domain + ':\\s*clamp01\\([^\\n]*\\* scale'));
    }
  });

  it('energy recovers overnight so a full-care week stays sustainable', () => {
    expect(SRC).toMatch(/upkeep\.en \+ CARE_SIM_ENERGY_RECOVERY/);
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
      const w = playWeek(sp, cheapPicks, fullCareMask(sp));
      expect(w.en).toBeGreaterThan(0);
    }
  });

  // Both energy rows on the badge check must be able to fail SOMEWHERE, or
  // they are theatre. Before the retune no week in any species could reach
  // energy 25 at a task start or finish at 20 or below.
  it('fatigue and the finish-energy target are reachable by careless weeks', () => {
    // One witness is enough: the most energy-expensive week (the costliest
    // choice every day, every routine task done, scenario first so tasks
    // start as low as possible) must be able to exhaust the caregiver in
    // at least one species. The full enumeration lives in the scratch
    // analysis; here we only need existence.
    let tiredWeeks = 0;
    let lowFinish = 0;
    const witnesses = [];
    for (const sp of SPECIES) {
      const drain = (c) => ((c.effects || {}).en || 0) + ((c.aftermath || {}).en || 0);
      const drainPicks = CARE_SIM_DAYS[sp].map((d) => {
        let worst = 0;
        d.choices.forEach((c, i) => { if (drain(c) < drain(d.choices[worst])) worst = i; });
        return worst;
      });
      const w = playWeek(sp, drainPicks, fullCareMask(sp), true);
      if (w.tiredCare > 0) tiredWeeks++;
      if (w.en <= 20) lowFinish++;
      witnesses.push(sp + ': en ' + w.en + ', tired tasks ' + w.tiredCare);
    }
    expect(tiredWeeks, witnesses.join(' | ')).toBeGreaterThan(0);
    expect(lowFinish, witnesses.join(' | ')).toBeGreaterThan(0);
  });

  it.each(SPECIES)('%s: at least one badge path is sustainable for the caregiver', (sp) => {
    const badgeWeeks = [...allWeeks(sp)].filter((w) => w.badge);
    expect(badgeWeeks.length).toBeGreaterThan(0);
    expect(badgeWeeks.every((w) => w.moneySustainable && w.energySustainable)).toBe(true);
  });

  // ── Aftermath: costs the owner could not have known before choosing ─────

  it('aftermath is money/energy only, always a cost, and never previewed', () => {
    let count = 0;
    for (const sp of SPECIES) {
      for (const day of CARE_SIM_DAYS[sp]) {
        for (const choice of day.choices) {
          if (!choice.aftermath) continue;
          count++;
          const keys = Object.keys(choice.aftermath).sort();
          expect(keys.every((k) => k === 'en' || k === 'money')).toBe(true);
          expect(keys.length).toBeGreaterThan(0);
          for (const k of keys) expect(choice.aftermath[k]).toBeLessThan(0);
          // A choice with an aftermath is never the day's best-welfare option:
          // aftermath is what a careless choice turns out to cost.
          const best = day.choices.reduce((b, c) => (welfareSum(c) > welfareSum(b) ? c : b), day.choices[0]);
          expect(choice.id, sp + ' ' + day.label).not.toBe(best.id);
        }
      }
    }
    expect(count).toBeGreaterThan(0);
    // Applied at choose time...
    expect(SRC).toMatch(/var after = choice\.aftermath \|\| \{\};/);
    expect(SRC).toMatch(/var newEn\s*=\s*clamp\(careSim\.en\s*\+ \(choice\.effects\.en\s*\|\| 0\) \+ \(after\.en \|\| 0\)\)/);
    expect(SRC).toMatch(/var newMoney = careSim\.money \+ \(choice\.effects\.money \|\| 0\) \+ \(after\.money \|\| 0\)/);
    // ...but the preview chips read `effects` only.
    const previewStart = SRC.indexOf('var eff = ch.effects || {};');
    const previewEnd = SRC.indexOf('var previewRow = previews.length', previewStart);
    expect(previewStart).toBeGreaterThan(0);
    expect(previewEnd).toBeGreaterThan(previewStart);
    expect(SRC.slice(previewStart, previewEnd)).not.toContain('aftermath');
    // ...and it is revealed after the choice.
    expect(SRC).toContain("className: 'petslab-choice-aftermath'");
  });

  // ── Retry loop ──────────────────────────────────────────────────────────

  it('the reflection shows the attempt trajectory from the evidence log, with no new persisted key', () => {
    const start = SRC.indexOf("className: 'petslab-care-attempts'");
    expect(start).toBeGreaterThan(0);
    const section = SRC.slice(start - 1200, start + 2400);
    // Read from evidence records for this species, at least two before it renders.
    expect(section).toMatch(/record\.moduleId === 'careSim' && record\.kind === 'activity'/);
    expect(section).toMatch(/x\.species === c\.species/);
    expect(section).toMatch(/if \(attempts\.length < 2\) return null;/);
    expect(section).toContain('This week');
    // Every completion writes a record (so retries accumulate), and the
    // details the section reads are on the evidence allowlist.
    expect(SRC).toMatch(/recordEvidence\(modId, evidenceReason, evidenceDetails, reason \? 'activity' : 'self-review'\);\s+if \(currentCompletion\)/);
    const allow = (SRC.match(/careSim: \[([^\]]*)\]/) || [])[1] || '';
    for (const key of ['species', 'weakestDomain', 'weakestPct', 'averagePct', 'moneyLeft', 'energyLeft', 'criterionMet']) {
      expect(allow).toContain("'" + key + "'");
    }
    expect(SRC).not.toMatch(/PETS_PERSIST_KEYS = \[[^\]]*careHistory/);
  });

  // ── Choice order ────────────────────────────────────────────────────────

  it('rendered choice order rotates by species and day so the authored-first option is not always on top', () => {
    const order = extractFunction('petsCareChoiceOrder');
    expect(SRC).toMatch(/petsCareChoiceOrder\(careSim\.species, careSim\.day, dayObj\.choices\)\.map\(/);
    for (const sp of SPECIES) {
      const slotsSeen = new Set();
      CARE_SIM_DAYS[sp].forEach((day, dayIdx) => {
        const rendered = order(sp, dayIdx, day.choices);
        // A permutation: same ids, same count, nothing lost or duplicated.
        expect(rendered.map((c) => c.id).sort()).toEqual(day.choices.map((c) => c.id).sort());
        slotsSeen.add(rendered.findIndex((c) => c.id === day.choices[0].id));
      });
      // Over a week the authored-first option must land in every slot.
      expect(slotsSeen.size).toBe(CARE_SIM_DAYS[sp][0].choices.length);
    }
    // Deterministic: the same inputs give the same order (no randomness).
    const a = order('dog', 3, CARE_SIM_DAYS.dog[3].choices).map((c) => c.id);
    const b = order('dog', 3, CARE_SIM_DAYS.dog[3].choices).map((c) => c.id);
    expect(a).toEqual(b);
    expect(order('dog', 0, [])).toEqual([]);
  });

  // ── Scene chips ─────────────────────────────────────────────────────────

  it('scene events are derived from the day table, so they cannot drift from the prompts', () => {
    expect(SRC).toMatch(/CARE_SCENE_EVENTS\[speciesId\] = CARE_SIM_DAYS\[speciesId\]\.map\(function\(day\)/);
    expect(SRC).not.toMatch(/var CARE_SCENE_EVENTS = \{\s*\n\s*dog: \[/);
    for (const sp of SPECIES) {
      const labels = new Set();
      for (const day of CARE_SIM_DAYS[sp]) {
        expect(day.scene, sp + ' ' + day.label).toBeTruthy();
        for (const key of ['icon', 'label', 'detail', 'kind']) {
          expect(typeof day.scene[key]).toBe('string');
          expect(day.scene[key].length).toBeGreaterThan(0);
        }
        labels.add(day.scene.label);
      }
      expect(labels.size).toBe(CARE_SIM_DAYS[sp].length);
    }
  });

  // ── Reflection: a stronger call, only after net harm ────────────────────

  /** Lift two module-scope helpers together (the second calls the first). */
  function liftStrongest() {
    const grab = (name) => {
      const start = SRC.indexOf('function ' + name + '(');
      const open = SRC.indexOf('{', start);
      let depth = 0; let end = open;
      for (; end < SRC.length; end++) {
        if (SRC[end] === '{') depth++;
        else if (SRC[end] === '}') { depth--; if (depth === 0) { end++; break; } }
      }
      return SRC.slice(start, end);
    };
    // eslint-disable-next-line no-new-func
    return Function(grab('petsCareWelfareSum') + '\n' + grab('petsCareStrongestChoice') + '\nreturn { sum: petsCareWelfareSum, strongest: petsCareStrongestChoice };')();
  }

  it('the strongest option per day agrees with the welfare oracle, and the stronger-call hint fires only after net harm', () => {
    const lifted = liftStrongest();
    // Defensible alternatives the authored notes call acceptable/valid: never "corrected".
    const DEFENSIBLE = ['kong', 'leash', 'reschedule', 'no', 'core_only', 'caps', 'unsure', 'big_pen', 'quick', 'one_quiet', 'puzzle_only', 'kennel'];
    // Choices whose notes warn of harm: always get the stronger call named.
    const HARMFUL = ['skip', 'long_alone', 'ignore', 'nothing', 'allow', 'pull', 'declaw', 'wait_week', 'cage', 'never', 'home_remedy', 'just_add', 'wait_morning', 'outside_temp', 'boarding', 'auto_feed', 'pellets_main', 'free_food', 'wait', 'easy'];
    const seenDefensible = new Set(); const seenHarmful = new Set();
    for (const sp of SPECIES) {
      CARE_SIM_DAYS[sp].forEach((day, i) => {
        const strongest = lifted.strongest(day);
        expect(strongest.id).toBe(day.choices[bestPicks(sp)[i]].id);
        for (const choice of day.choices) {
          const flagged = strongest.id !== choice.id && lifted.sum(choice) < 0;
          if (DEFENSIBLE.includes(choice.id)) { expect(flagged, sp + ' ' + choice.id).toBe(false); seenDefensible.add(choice.id); }
          if (HARMFUL.includes(choice.id)) { expect(flagged, sp + ' ' + choice.id).toBe(true); seenHarmful.add(choice.id); }
        }
      });
    }
    expect(seenDefensible.size).toBe(DEFENSIBLE.length);
    expect(seenHarmful.size).toBe(HARMFUL.length);
    // Wired into the decisions log with exactly that rule.
    expect(SRC).toMatch(/var harmful = !!\(authoredChoice && strongest && strongest\.id !== authoredChoice\.id &&\s*\n\s*petsCareWelfareSum\(authoredChoice\) < 0\);/);
    expect(SRC).toContain("className: 'petslab-care-stronger-call'");
  });

  it('the timeline marks each night, the picker shows per-species history, and the reflection nudges breadth', () => {
    expect(SRC).toContain("className: 'petslab-care-timeline-night'");
    expect(SRC).toMatch(/nightEvents = \(Array\.isArray\(careSim\.consequenceLog\) \? careSim\.consequenceLog : \[\]\)\.filter/);
    expect(SRC).toContain("className: 'petslab-care-species-history'");
    expect(SRC).toContain("className: 'petslab-care-breadth'");
    // Both read the evidence log, never a new persisted key.
    expect(SRC).not.toMatch(/PETS_PERSIST_KEYS = \[[^\]]*(careHistory|speciesHistory)/);
  });

  // ── Mid-week outlook ────────────────────────────────────────────────────

  const outlookOf = (state) => petsCareOutlook(state, CARE_SIM_DAYS[state.species], INTERACT_EFFECTS, RECOVERY);

  it('the outlook never tells a week that goes on to earn the badge that it is out of reach', () => {
    let checked = 0;
    for (const sp of SPECIES) {
      for (const picks of allPicks(sp)) {
        for (const mask of [0, fullCareMask(sp)]) {
          for (const scenarioFirst of [false, true]) {
            const w = playWeek(sp, picks, mask, scenarioFirst);
            if (!w.badge) continue;
            for (const state of w.snapshots) {
              const o = outlookOf(state);
              expect(o.reachable, sp + ' day ' + (state.day + 1) + ': ' + o.reasons.join('; ')).toBe(true);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  }, 30_000);  // replays every week twice; ~4 s alone, longer under a parallel run

  it('the outlook does call a lost week before it ends, and a negative balance is always final', () => {
    // The neglect rabbit week (cage, never spay, home-remedied stasis) with
    // every routine task done: the outlook must say so before day 7.
    const w = playWeek('rabbit', picksById('rabbit', ['cage', 'hay_first', 'solo', 'never', 'home_remedy', 'floor_visit', 'honest']), fullCareMask('rabbit'), true);
    expect(w.badge).toBe(false);
    const firstCall = w.snapshots.findIndex((state) => !outlookOf(state).reachable);
    expect(firstCall).toBeGreaterThanOrEqual(0);
    expect(w.snapshots[firstCall].day).toBeLessThan(6);
    // Any state that has gone below $0 is out of reach, whatever else is true.
    let negatives = 0;
    for (const sp of SPECIES) {
      for (const picks of allPicks(sp)) {
        const week = playWeek(sp, picks, 0, true);
        for (const state of week.snapshots) {
          if (!state.lowMoney) continue;
          negatives++;
          const o = outlookOf(state);
          expect(o.reachable).toBe(false);
          expect(o.reasons.join(' ')).toContain('money went below $0');
        }
      }
    }
    expect(negatives).toBeGreaterThan(0);
  }, 30_000);

  it('the provisional badge check states the outlook and the day states what tonight will cost', () => {
    expect(SRC).toMatch(/petsCareOutlook\(targetState, petsCareDays\(targetState\.species, targetState\.week\), INTERACT_EFFECTS, CARE_SIM_ENERGY_RECOVERY\)/);
    expect(SRC).toContain("'data-pets-care-outlook': isFinal ? 'final' : (outlook.reachable ? 'reachable' : 'out-of-reach')");
    expect(SRC).toContain('This check is provisional until the week ends; later choices can change it. The badge is still within reach.');
    expect(SRC).toContain("'Out of reach this week: ' + outlook.reasons.join('; ') + '. Play the week out for the animal, then retry.'");
    // Tonight's note is the same upkeep function the night will run.
    expect(SRC).toMatch(/var tonight = overnightUpkeep\(careSim\)\.overnight;/);
    expect(SRC).toContain("className: 'petslab-care-tonight'");
  });

  // ── Support links under the prompt ──────────────────────────────────────

  it('every day support link opens a real view with a valid patch and never echoes an option', () => {
    const tilesStart = SRC.indexOf('var MENU_TILES = [');
    const tileIds = new Set([...SRC.slice(tilesStart, SRC.indexOf('];', tilesStart)).matchAll(/\{ id: '(\w+)', cat: /g)].map((m) => m[1]));
    expect(tileIds.size).toBeGreaterThan(20);
    const persist = (SRC.match(/var PETS_PERSIST_KEYS = \[([\s\S]*?)\];/) || [])[1] || '';
    const welfareKeys = (SRC.match(/var welfareKeys = \[([^\]]*)\]/) || [])[1] || '';
    const costSpecies = (SRC.match(/var costSpecies = \[([\s\S]*?)\]\.indexOf/) || [])[1] || '';
    const VALID = {
      welfareSec: (v) => welfareKeys.includes("'" + v + "'"),
      blMode: (v) => ['read', 'quiz', 'context'].includes(v),
      trMode: (v) => ['read', 'sim'].includes(v),
      costSpecies: (v) => costSpecies.includes("'" + v + "'"),
      diagramView: (v) => ['skull', 'airsac', 'operant', 'bodylang'].includes(v),
    };
    let count = 0;
    for (const sp of SPECIES) {
      for (const day of CARE_SIM_DAYS[sp]) {
        if (!day.link) continue;
        count++;
        expect(tileIds.has(day.link.view), sp + ' ' + day.label + ' -> ' + day.link.view).toBe(true);
        for (const key of ['label', 'why']) expect(typeof day.link[key]).toBe('string');
        for (const [key, value] of Object.entries(day.link.patch || {})) {
          expect(persist, key).toContain("'" + key + "'");
          expect(VALID[key], key).toBeTruthy();
          expect(VALID[key](value), key + '=' + value).toBe(true);
        }
        // Support, not a hint: the link text must not quote any option's label.
        for (const choice of day.choices) {
          const head = choice.label.slice(0, 18).toLowerCase();
          expect(day.link.why.toLowerCase()).not.toContain(head);
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(12);
    expect(SRC).toContain("className: 'petslab-care-support'");
    expect(SRC).toMatch(/goToView\(dayObj\.link\.view, dayObj\.link\.label, dayObj\.link\.patch\)/);
  });

  // ── Care Trade-off widget: the constraint that makes it a trade-off ─────

  it('the care trade-off widget has a time budget that binds for the most demanding species and not for the rest', () => {
    // Lift the species factors and the hours model from the widget source.
    const spSrc = (SRC.match(/var sp = \(\{([\s\S]*?)\}\)\[iq\.species\]/) || [])[1];
    const hoursSrc = (SRC.match(/var hoursAtFull = (\{[^}]*\});/) || [])[1];
    expect(spSrc).toBeTruthy();
    expect(hoursSrc).toBeTruthy();
    // eslint-disable-next-line no-eval
    const species = eval('({' + spSrc + '})');
    // eslint-disable-next-line no-eval
    const hoursAtFull = eval('(' + hoursSrc + ')');
    const defaultHours = Number((SRC.match(/if \(source\.hours == null \|\| source\.hours === ''\) return (\d+);/) || [])[1]);
    const maxHours = Number((SRC.match(/return isFinite\(value\) \? Math\.max\(4, Math\.min\((\d+), Math\.round\(value\)\)\) : 14;/) || [])[1]);
    expect(defaultHours).toBeGreaterThan(0);
    expect(maxHours).toBeGreaterThan(defaultHours);
    const keys = ['food', 'exercise', 'social', 'vet', 'training'];
    // Hours needed when every slider sits exactly on its species target (mult × 50).
    const atTarget = {};
    for (const [id, sp] of Object.entries(species)) {
      atTarget[id] = keys.reduce((sum, k) => sum + ((sp[k] * 50) / 100) * hoursAtFull[k] * sp[k], 0);
    }
    const fits = Object.entries(atTarget).filter(([, h]) => h <= defaultHours).map(([id]) => id);
    const binds = Object.entries(atTarget).filter(([, h]) => h > defaultHours).map(([id]) => id);
    // A dog at target does not fit the default week: the student must trade.
    expect(binds).toContain('dog');
    // ...but the constraint is not a wall: most species fit at target...
    expect(fits.length).toBeGreaterThanOrEqual(3);
    // ...and the largest budget fits everything.
    for (const h of Object.values(atTarget)) expect(h).toBeLessThanOrEqual(maxHours);
    // Rendered, announced, logged.
    expect(SRC).toContain("className: 'petslab-tradeoff-time'");
    expect(SRC).toContain("'data-pets-tradeoff-over': hoursOver > 0.05 ? 'true' : 'false'");
    expect(SRC).toMatch(/This plan takes about ' \+ hoursNeeded\.toFixed\(1\) \+ ' hours a week against ' \+ iq\.hours \+ ' available'/);
    expect(SRC).toMatch(/hours: hoursNeeded\.toFixed\(1\), budget: iq\.hours \}/);
  });

  // ── Closing reflection ──────────────────────────────────────────────────

  it('the week ends with a reflection note that persists per species and is recorded once as self-review, with no text in evidence', () => {
    expect(SRC).toContain("className: 'petslab-care-reflect-note'");
    // Persisted under its own sanitised key (free text never goes into evidence).
    expect(SRC).toMatch(/var PETS_PERSIST_KEYS = \[[\s\S]*?'careReflections'[\s\S]*?\];/);
    expect(SRC).toContain('snapshot.careReflections = normalizeCareReflections(snapshot.careReflections);');
    expect(SRC).toContain("addIfChanged('careReflections', d.careReflections, careReflections);");
    // Typing writes through the updater form, keyed by species.
    expect(SRC).toMatch(/upd\('careReflections', function\(cur\) \{[\s\S]*?next\[noteKey\] = text;/);
    // Keyed per species AND week, so a week-2 note never overwrites the week-1 note.
    expect(SRC).toMatch(/var noteKey = c\.species \+ \(c\.week === 2 \? '-w2' : ''\);/);
    // Recording is self-review evidence, once per finished week (a later
    // self-review row after the week's activity row means "already recorded").
    expect(SRC).toContain("recordEvidence('careSim', 'Reflected on the care week', { species: c.species }, 'self-review');");
    expect(SRC).toMatch(/var recordedThisWeek = !!\(lastCareRecord && lastCareRecord\.kind === 'self-review'\);/);
    expect(SRC).toMatch(/if \(recordedThisWeek \|\| words === 0\) return;/);
    // The careSim evidence allowlist carries no free-text field.
    const allow = (SRC.match(/careSim: \[([^\]]*)\]/) || [])[1] || '';
    expect(allow).not.toMatch(/reflection|note|text/i);
    // Privacy note travels with the field.
    expect(SRC).toContain("'Your reflection saves with this project. Do not include names or identifying details.'");
  });

  // ── Teacher tab, trainer hand-off, species preview ──────────────────────

  it('the teacher tab explains both simulators and offers debrief prompts; the trainer hands off to the care week; the picker previews the seven days', () => {
    const targetsStart = SRC.indexOf('var learningTargets = [');
    const targetsEnd = SRC.indexOf('];', targetsStart);
    // eslint-disable-next-line no-eval
    const targets = eval(SRC.slice(SRC.indexOf('[', targetsStart), targetsEnd + 1));
    for (const name of ['Pet Training', 'Pet-Care Week']) {
      const row = targets.find((t) => t.module === name);
      expect(row, name).toBeTruthy();
      expect(row.mechanics.length, name + ' mechanics').toBeGreaterThanOrEqual(3);
      expect(row.discuss.length, name + ' discuss').toBeGreaterThanOrEqual(2);
      for (const line of row.mechanics.concat(row.discuss)) expect(typeof line).toBe('string');
    }
    // The care-week rules summary states the numbers the code enforces.
    const care = targets.find((t) => t.module === 'Pet-Care Week').mechanics.join(' ');
    expect(care).toContain('below 40%');
    expect(care).toContain('recovers 8 a night');
    expect(SRC).toContain("'How the simulation works'");
    expect(SRC).toContain("'Debrief prompts'");
    expect(SRC).toContain("className: 'petslab-teacher-mechanics'");
    expect(SRC).toContain("'📅 Apply it in Pet-Care Week'");
    expect(SRC).toContain("className: 'petslab-care-species-days'");
  });

  // ── Money formatting ────────────────────────────────────────────────────

  it('every balance the sim prints puts the sign before the dollar sign', () => {
    const petsMoney = extractFunction('petsMoney');
    expect(petsMoney(-225)).toBe('−$225');
    expect(petsMoney(204)).toBe('$204');
    expect(petsMoney(0)).toBe('$0');
    expect(petsMoney(-0.4)).toBe('$0');
    expect(petsMoney(117.6)).toBe('$118');
    expect(petsMoney('junk')).toBe('$0');
    // No raw "$" + number concatenations left on the care-sim surfaces.
    const simStart = SRC.indexOf('function renderCareSim()');
    const simEnd = SRC.indexOf('function renderSensory()', simStart);
    const sim = SRC.slice(simStart, simEnd);
    expect(sim).not.toMatch(/'\$' \+ Math\.round\(c\.money\)/);
    expect(sim).not.toMatch(/'💰 \$' \+/);
    expect(sim).not.toMatch(/'\$' \+ x\.moneyLeft/);
    expect(sim).not.toMatch(/'\$' \+ Math\.round\(Number\(targetState\.money\)/);
    // The teacher outcome line handles the sign inline (that helper is lifted into a VM by tests).
    expect(SRC).toContain("(x.moneyLeft < 0 ? '\u2212$' + Math.abs(x.moneyLeft) : '$' + x.moneyLeft) + ' left)'");
    // The day header speaks energy and money in words and hides the emoji figures.
    expect(sim).toContain("'Your energy ' + Math.round(careSim.en) + ' percent. Money ' + petsMoney(careSim.money)");
  });

  // ── Week 2 ──────────────────────────────────────────────────────────────
  // The same species budget and the same rules, so the same properties
  // must hold for every authored second week.

  const WEEK2_SPECIES = Object.keys(CARE_SIM_WEEK2);

  it('week 2 exists for at least one species, with seven fully authored days', () => {
    expect(WEEK2_SPECIES.length).toBeGreaterThanOrEqual(1);
    for (const sp of WEEK2_SPECIES) {
      expect(CARE_SIM_DAYS[sp], sp + ' needs a week 1 to unlock from').toBeTruthy();
      expect(CARE_SIM_WEEK2[sp]).toHaveLength(7);
      for (const day of CARE_SIM_WEEK2[sp]) {
        expect(day.choices.length).toBeGreaterThanOrEqual(3);
        for (const key of ['icon', 'label', 'detail', 'kind']) expect(typeof day.scene[key]).toBe('string');
        expect(typeof day.link.view).toBe('string');
        for (const c of day.choices) {
          expect(typeof c.note).toBe('string');
          expect(c.note.length).toBeGreaterThan(40);
          for (const d of DOMAINS.concat(['en', 'money'])) expect(typeof c.effects[d]).toBe('number');
        }
      }
      // New situations, not week 1 again.
      const week1Prompts = new Set(CARE_SIM_DAYS[sp].map((d) => d.prompt));
      for (const day of CARE_SIM_WEEK2[sp]) expect(week1Prompts.has(day.prompt)).toBe(false);
    }
  });

  it.each(WEEK2_SPECIES)('%s week 2: the all-best week is affordable, rested and earns the badge; perfect decisions without routine care do not', (sp) => {
    for (const scenarioFirst of [false, true]) {
      const w = playWeek(sp, bestPicks(sp, CARE_SIM_WEEK2), fullCareMask(sp), scenarioFirst, CARE_SIM_WEEK2);
      expect(w.money).toBeGreaterThanOrEqual(100);
      expect(w.tiredCare).toBe(0);
      expect(w.minTaskStart).toBeGreaterThanOrEqual(TIRED_BELOW);
      expect(w.en).toBeGreaterThan(20);
      expect(w.events).toBe(0);
      expect(w.badge).toBe(true);
    }
    expect(playWeek(sp, bestPicks(sp, CARE_SIM_WEEK2), 0, false, CARE_SIM_WEEK2).badge).toBe(false);
  });

  it.each(WEEK2_SPECIES)('%s week 2: careless weeks can go bankrupt, the all-worst week is denied, and daily clicking cannot carry more than three worst days', (sp) => {
    let maxSpend = 0; let maxWorst = 0; let badges = 0;
    const worst = worstPicks(sp, CARE_SIM_WEEK2);
    for (const picks of allPicks(sp, CARE_SIM_WEEK2)) {
      for (const mask of [0, fullCareMask(sp)]) {
        const w = playWeek(sp, picks, mask, true, CARE_SIM_WEEK2);
        if (w.spent > maxSpend) maxSpend = w.spent;
        if (w.badge) {
          badges++;
          const n = picks.filter((p, i) => p === worst[i]).length;
          if (n > maxWorst) maxWorst = n;
        }
      }
    }
    expect(maxSpend).toBeGreaterThan(START_MONEY[sp]);
    expect(badges).toBeGreaterThan(0);
    expect(playWeek(sp, worst, fullCareMask(sp), true, CARE_SIM_WEEK2).badge).toBe(false);
    expect(maxWorst).toBeLessThanOrEqual(3);
  });

  it.each(WEEK2_SPECIES)('%s week 2: aftermath only on careless options, links valid, and the outlook never gives up on a winnable week', (sp) => {
    const tilesStart = SRC.indexOf('var MENU_TILES = [');
    const tileIds = new Set([...SRC.slice(tilesStart, SRC.indexOf('];', tilesStart)).matchAll(/\{ id: '(\w+)', cat: /g)].map((m) => m[1]));
    for (const day of CARE_SIM_WEEK2[sp]) {
      const best = day.choices.reduce((b, c) => (welfareSum(c) > welfareSum(b) ? c : b), day.choices[0]);
      for (const c of day.choices) {
        if (!c.aftermath) continue;
        expect(c.id).not.toBe(best.id);
        for (const [k, v] of Object.entries(c.aftermath)) { expect(['en', 'money']).toContain(k); expect(v).toBeLessThan(0); }
      }
      expect(tileIds.has(day.link.view), day.link.view).toBe(true);
      for (const c of day.choices) expect(day.link.why.toLowerCase()).not.toContain(c.label.slice(0, 18).toLowerCase());
    }
    let checked = 0;
    for (const picks of allPicks(sp, CARE_SIM_WEEK2)) {
      for (const mask of [0, fullCareMask(sp)]) {
        const w = playWeek(sp, picks, mask, false, CARE_SIM_WEEK2);
        if (!w.badge) continue;
        for (const state of w.snapshots) {
          const o = petsCareOutlook(Object.assign({ week: 2 }, state), CARE_SIM_WEEK2[sp], INTERACT_EFFECTS, RECOVERY);
          expect(o.reachable, 'day ' + (state.day + 1) + ': ' + o.reasons.join('; ')).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  }, 30_000);

  it('a second week that meets the target earns its own badge, and only a second week does', () => {
    expect(SRC).toMatch(/if \(earned && c\.week === 2\) awardBadge\('pets_seasoned', 'Seasoned Owner \(week 2 target met\)'\);/);
    expect(SRC).toMatch(/var BADGE_XP = \{[\s\S]*?pets_seasoned: 15[\s\S]*?\};/);
    expect(SRC).toContain("pets_seasoned: 'Seasoned Owner (week 2 target met)',");
    // The tool's own descriptions know about the second week.
    expect(SRC).toContain('Finish it to unlock a harder second week.');
    expect(SRC).toContain('meeting its target earns the Seasoned Owner badge');
  });

  it('week 2 is wired: selected from state, unlocked by a finished week 1, continued from the reflection, and recorded in evidence', () => {
    expect(SRC).toMatch(/function petsCareDays\(species, week\)/);
    expect(SRC).not.toMatch(/var dayObj = CARE_SIM_DAYS\[careSim\.species\]/);
    expect(SRC).not.toMatch(/var allDays = CARE_SIM_DAYS\[careSim\.species\]/);
    expect(SRC).toContain("className: 'petslab-care-week2-continue'");
    expect(SRC).toContain("className: 'petslab-care-week2-start'");
    expect(SRC).toMatch(/x\.species === id && x\.week !== 2/);
    expect(SRC).toMatch(/week: c\.week === 2 \? 2 : 1,/);
    const allow = (SRC.match(/careSim: \[([^\]]*)\]/) || [])[1] || '';
    expect(allow).toContain("'week'");
  });

  // ── Trainer simulator ───────────────────────────────────────────────────

  it('the trainer HUD does not show the moment classification glyph before the response', () => {
    // TR_MOMENTS labels start with a classification glyph (target / wrong /
    // almost). Shown before the response, that glyph is the answer key.
    const momentsStart = SRC.indexOf('var TR_MOMENTS = [');
    const momentsEnd = SRC.indexOf('];', momentsStart);
    const labels = [...SRC.slice(momentsStart, momentsEnd).matchAll(/label: '([^']*)'/g)].map((m) => m[1]);
    expect(labels.length).toBe(10);
    for (const label of labels) expect(label).toMatch(/^[✓×~] /);
    // The pre-response chip strips exactly that prefix.
    expect(SRC).toContain("revealed ? responseNames[selected] : moment.label.replace(/^[✓×~]\\s*/, '')");
  });

  it('the park session is a transfer task: same type sequence and poses as the kitchen bank, different situations', () => {
    const bank = (name) => {
      const start = SRC.indexOf('var ' + name + ' = [');
      const end = SRC.indexOf('];', start);
      // eslint-disable-next-line no-eval
      return eval(SRC.slice(SRC.indexOf('[', start), end + 1));
    };
    const home = bank('TR_MOMENTS');
    const park = bank('TR_MOMENTS_PARK');
    expect(home).toHaveLength(10);
    expect(park).toHaveLength(10);
    // Identical type sequence: the model, the optimal path and the badge maths carry over.
    expect(park.map((m) => m.type)).toEqual(home.map((m) => m.type));
    // Every "wrong" moment says how the puppy is drawn; targets and approximations are typed.
    for (const set of [home, park]) {
      for (const m of set) {
        expect(m.label).toMatch(/^[\u2713\u00d7~] /);
        expect(typeof m.desc).toBe('string');
        if (m.type === 'wrong') expect(['sniff', 'jump', 'bark']).toContain(m.pose);
      }
    }
    // Different situations, not a reskin: no description is shared.
    const homeDescs = new Set(home.map((m) => m.desc));
    for (const m of park) expect(homeDescs.has(m.desc), m.desc).toBe(false);
    // Wiring: the active bank comes from state, sessions alternate, the pose is read off the moment.
    expect(SRC).toContain("var TR_MOMENT_BANKS = { home: TR_MOMENTS, park: TR_MOMENTS_PARK };");
    expect(SRC).toMatch(/var trMoments = TR_MOMENT_BANKS\[trBank\];/);
    expect(SRC).toMatch(/function nextTrBank\(\) \{ return trBank === 'home' \? 'park' : 'home'; \}/);
    expect(SRC).toMatch(/var pose = moment\.pose \|\| \(moment\.type === 'target' \? 'sit'/);
    expect(SRC).not.toMatch(/trSim\.idx === 1 \? 'sniff'/);
    expect(SRC).toMatch(/bank: raw\.bank === 'park' \? 'park' : 'home'/);
    expect(SRC).toContain("'Illustrated park training scene. Round '");
    // No leftover direct reads of the kitchen bank inside the trainer.
    const trainerStart = SRC.indexOf('var TR_RESPONSE_NAMES = {');
    const trainerEnd = SRC.indexOf('function renderCareTimeline(');
    expect(SRC.slice(trainerStart, trainerEnd)).not.toMatch(/\bTR_MOMENTS\b(?!_PARK)/);
  });

  it('the trainer summary names the stronger response, derived from the same model that scores the rounds', () => {
    // Parse pickResponse: three branches (target / almost / wrong), each a
    // list of `rxn === 'x') { dProb = +0.10 ...` clauses. The best response
    // for a moment type is the clause with the highest behaviour gain.
    const start = SRC.indexOf('function pickResponse(rxn)');
    const end = SRC.indexOf('function nextTrRound()', start);
    expect(start).toBeGreaterThan(0);
    const body = SRC.slice(start, end);
    const branch = (from, to) => body.slice(body.indexOf(from), to ? body.indexOf(to) : undefined);
    const branches = {
      target: branch("moment.type === 'target'", "moment.type === 'almost'"),
      almost: branch("moment.type === 'almost'", '} else {  // wrong'),
      wrong: branch('} else {  // wrong'),
    };
    const bestFromModel = {};
    for (const [type, src] of Object.entries(branches)) {
      const gains = [...src.matchAll(/rxn === '(\w+)'\)\s+\{ (?:dProb = ([+-]?[\d.]+))?/g)]
        .map((m) => ({ rxn: m[1], gain: m[2] == null ? 0 : Number(m[2]) }));
      expect(gains.length).toBe(4);
      bestFromModel[type] = gains.reduce((b, g) => (g.gain > b.gain ? g : b), gains[0]).rxn;
    }
    const TR_BEST_RESPONSE = extractObject('TR_BEST_RESPONSE');
    for (const type of ['target', 'almost', 'wrong']) {
      expect(TR_BEST_RESPONSE[type].id, type).toBe(bestFromModel[type]);
      expect(typeof TR_BEST_RESPONSE[type].why).toBe('string');
    }
    // Every moment type in the bank has a best response, and the review is rendered.
    const momentsStart = SRC.indexOf('var TR_MOMENTS = [');
    const types = new Set([...SRC.slice(momentsStart, SRC.indexOf('];', momentsStart)).matchAll(/type: '(\w+)'/g)].map((m) => m[1]));
    for (const type of types) expect(TR_BEST_RESPONSE[type]).toBeTruthy();
    expect(SRC).toContain("className: 'petslab-trainer-review'");
    expect(SRC).toContain("className: 'petslab-trainer-stronger'");
    expect(SRC).toMatch(/var wasBest = !!\(best && ch\.rxn === best\.id\);/);
  });

  it('the stated badge criteria match the code', () => {
    expect(SRC).toContain('all four welfare domains');
    expect(SRC).toMatch(/Physical, Mental, Social, and Environmental/);
  });

  it('the species picker discloses its budget and the routine-care rule', () => {
    expect(SRC).toContain('Week budget: $');
    expect(SRC).toContain('each one skipped costs the animal a little overnight');
    for (const sp of SPECIES) expect(START_MONEY[sp]).toBeGreaterThan(0);
  });
});
