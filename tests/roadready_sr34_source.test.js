// Round 34, lane source (sr34). English source flaws that translators found in the permit
// bank, the drills and the guides. Each fix is checked against its primary source:
//   M = Maine Driver's License Manual Rev 4/24; 29-A = Maine Title 29-A.
// Answer keys are positional, so the touched items also keep their key index and length rank.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import STRINGS from './roadready_sr34_strings.json';

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let SRC, RR, BANK, DRILLS;

function loadDrills(src) {
  const drills = [];
  const reQ = /q:\s*__alloT\('stem\.roadready\.([a-z]+)_q(\d+)',\s*('(?:[^'\\]|\\.)*')\)/g; let m;
  while ((m = reQ.exec(src))) {
    const seg = src.slice(m.index, m.index + 6000);
    const cm = /choices:\s*\[([\s\S]*?)\]\s*,\s*correct:\s*(\d+)/.exec(seg); if (!cm) continue;
    const next = seg.slice(1).search(/q:\s*__alloT\('stem\.roadready\.[a-z]+_q\d+'/); if (next > 0 && cm.index > next) continue;
    const a = [...cm[1].matchAll(/__alloT\('stem\.roadready\.[A-Za-z0-9_]+',\s*('(?:[^'\\]|\\.)*')\)/g)].map((x) => new Function('return ' + x[1])());
    if (a.length >= 2) drills.push({ id: m[1] + '_q' + m[2], a, correct: +cm[2] });
  }
  return drills;
}
// The English fallback the tool carries for a key (every occurrence must agree).
function fallback(key) {
  const re = new RegExp("__allo(?:T|RRT)\\('stem\\.roadready\\." + key + "',\\s*('(?:[^'\\\\]|\\\\.)*')", 'g');
  const all = [...new Set([...SRC.matchAll(re)].map((m) => new Function('return ' + m[1])()))];
  expect(all.length, key + ' fallbacks').toBe(1);
  return all[0];
}
const rankOf = (q) => { const L = q.a.map((x) => x.length); return 1 + L.filter((x) => x > L[q.correct]).length; };
const drill = (id) => { const d = DRILLS.find((x) => x.id === id); expect(d, id).toBeTruthy(); return d; };

beforeAll(() => {
  SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  BANK = RR.PERMIT_BANK;
  DRILLS = loadDrills(SRC);
});

describe('sr34 permit bank', () => {
  it('q14: the keyed wet-road figure is the model\'s, and agrees with the explanation', () => {
    const q = BANK[14];
    const key = q.a[q.correct];
    const m = /about (\d+)-(\d+)% longer/.exec(key);
    expect(m, key).not.toBeNull();
    const lo = +m[1], hi = +m[2];
    // Road Ready's model, 35 to 65 mph, taught 1.5 s reaction (the range the explanation names).
    for (let v = 35; v <= 65; v += 5) {
      const pct = (RR.stoppingDistance(v, 'rain', 1.5).total_ft / RR.stoppingDistance(v, 'clear', 1.5).total_ft - 1) * 100;
      expect(Math.round(pct), v + ' mph').toBeGreaterThanOrEqual(lo - 1);
      expect(Math.round(pct), v + ' mph').toBeLessThanOrEqual(hi + 1);
    }
    expect(q.exp).toContain('about ' + lo + '% to ' + hi + '% longer');
  });

  it('q35: the explanation links the road test to the intermediate license the question asks about', () => {
    expect(BANK[35].q).toMatch(/before getting an intermediate license/);
    expect(BANK[35].exp).toMatch(/70 hours .* before you can take the road test/);
    expect(BANK[35].exp).toMatch(/pass the road test to get your intermediate license/);
  });

  it('q125: the explanation gives the same months as the key and says which tires go on', () => {
    const q = BANK[125];
    expect(q.a[q.correct]).toMatch(/late October-November/);
    expect(q.exp).toMatch(/put winter tires on in late October or November/);
    expect(q.exp).toMatch(/back to all-season tires in April/);
  });

  it('q136: the explanation no longer calls the shoulder unsafe and then sends you there (M: pull off the road)', () => {
    const e = BANK[136].exp;
    expect(e).not.toMatch(/The shoulder is unsafe/);
    expect(e).not.toMatch(/Hazards on the shoulder/);
    expect(e).toMatch(/pull off the road/);
    expect(e).toMatch(/If you must stop there, .*hazard lights/);
    expect(e).toMatch(/Never stop in the lane/);
  });

  it('q151: the explanation rules out the "pump at every stop" distractor and gives the manual\'s emergency advice', () => {
    const q = BANK[151];
    expect(q.a[3]).toMatch(/Pump the brake pedal .* at every single stop/);
    expect(q.exp).toMatch(/no need to pump the brakes at every stop/);
    expect(q.exp).toMatch(/In an emergency stop, pump the brakes/);
    expect(q.exp).toMatch(/Leave extra room to stop/);
    expect(q.a[q.correct]).toMatch(/allow extra stopping distance/);
  });

  it('q153: key and explanation say AWAY from the tracks as well as toward the train (M: 4113-4114)', () => {
    const q = BANK[153];
    expect(q.correct).toBe(1);
    expect(q.a[1]).toMatch(/AWAY from the tracks/);
    expect(q.a[1]).toMatch(/TOWARD the train/);
    expect(q.exp).toMatch(/AWAY from the tracks at a 45° angle, TOWARD the train/i);
    // roadready_rules bans the literal 'Run AWAY from the tracks at a 45' (an old self-contradictory line).
    expect(SRC).not.toContain('Run AWAY from the tracks at a 45');
    expect(rankOf(q)).toBe(4);
  });

  it('q172 and q175 agree with 29-A sec. 1311(3)-(5): restrictions extended 270 days and the license IS suspended', () => {
    expect(BANK[172].exp).toMatch(/your license is suspended \(60 days for a first offense\)/);
    expect(BANK[172].exp).not.toMatch(/can be suspended/);
    expect(BANK[172].exp).toMatch(/the restrictions last another 270 days/);
    const q = BANK[175];
    expect(q.correct).toBe(1);
    expect(q.a[1]).toBe('It is extended by 270 more days, and the license is suspended');
    expect(q.a[1]).not.toMatch(/fines\/suspension/);
    expect(q.exp).toMatch(/your license is suspended/);
    expect(rankOf(q)).toBe(1);
  });

  it('keyed index and length rank of the other touched permit items are unchanged', () => {
    expect(BANK[14].correct).toBe(1); expect(rankOf(BANK[14])).toBe(3);
    expect(BANK.length).toBe(261);
  });
});

describe('sr34 drills and guides', () => {
  it('every railroad 45° escape line says away from the tracks (no line can be read as running along the rails)', () => {
    const lits = [...SRC.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map((m) => m[1]).filter((s) => /45°|45-degree/.test(s) && /\btrain\b/i.test(s) && /toward/i.test(s));
    expect(lits.length).toBeGreaterThanOrEqual(8);
    const bad = lits.filter((s) => !/(away from|leave) the tracks/i.test(s));
    expect(bad).toEqual([]);
    expect(fallback('get_out_run_45_toward_approaching_trai')).toMatch(/away from the tracks/);
  });

  it('railroad drill keys keep their index and length rank', () => {
    const c3 = drill('railroadcrossing_q3'); expect(c3.correct).toBe(2); expect(rankOf(c3)).toBe(2);
    expect(c3.a[2]).toMatch(/away from the tracks at a 45° angle, TOWARD the train/);
    const r14 = drill('rightofway_q14'); expect(r14.correct).toBe(1); expect(rankOf(r14)).toBe(3);
    expect(r14.a[1]).toMatch(/leave the tracks/);
  });

  it('winterdriving_exp6: no "four brake pads" (a car has a brake at each of four wheels, two pads per disc brake)', () => {
    const e = fallback('winterdriving_exp6');
    expect(e).not.toMatch(/four brake pads/);
    expect(e).toMatch(/every car brakes with all four wheels/);
  });

  it('schoolbus_c5_3 is plainly wrong (the rule applies whether or not an adult is there)', () => {
    const d = drill('schoolbus_q5');
    expect(d.correct).toBe(1);
    expect(d.a[2]).toBe('It applies only when an adult is present at the stop');
    expect(rankOf(d)).toBe(4);
  });

  it('emergencyvehicle_c5_2 names the lane the law asks for (29-A sec. 2054(9): a lane not adjacent to the stopped vehicle)', () => {
    const d = drill('emergencyvehicle_q5');
    expect(d.correct).toBe(1);
    expect(d.a[1]).not.toMatch(/adjacent/);
    expect(d.a[1]).toMatch(/left lane/);
    expect(d.a[1]).toMatch(/careful, prudent speed/);
    expect(rankOf(d)).toBeLessThanOrEqual(2);
  });

  it('intersection guide: the 4-way tie rule is not self-contradictory (M: one turning, one straight)', () => {
    const t = fallback('intersectionguide_tie_and_both_going_straight_left_turner_yields');
    expect(t).not.toMatch(/both going straight/);
    expect(t).toMatch(/turning left yields to one going straight/);
  });

  it('intersection guide: the T card no longer teaches a through-road rule Maine does not have (29-A sec. 2053(3))', () => {
    expect(fallback('intersectionguide_traffic_on_the_through_road_has_the_right_of_w')).toMatch(/stop or yield sign/);
    expect(fallback('intersectionguide_the_vehicle_on_the_terminating_road_must_yield')).toMatch(/no special T rule/);
    expect(fallback('the_top_of_the_t_is_the_through_road_t')).not.toMatch(/stem.{0,3} yields/);
    // and it now agrees with permit q111 and right-of-way q3
    expect(BANK[111].exp).toMatch(/no special T-intersection rule/);
    expect(fallback('rightofway_exp3')).toMatch(/no special T-intersection rule/);
  });

  it('no "1 times" or "1 of your 1 crashes": count-neutral debrief line, singular coach line', () => {
    const ai = fallback('debrief_ai_caused_crashes');
    expect(ai).not.toMatch(/\{n\} of your \{m\} crashes/);
    expect(ai).toMatch(/: \{n\} of \{m\}\./);
    expect(ai).not.toMatch(/claim —/);
    expect(fallback('next_seen_one')).toBe('Seen {n} time on your last drive.');
    expect(SRC).toContain("(step.evidenceCount === 1 ? __alloT('stem.roadready.next_seen_one'");
  });
});

describe('sr34 STRINGS.json matches the tool', () => {
  it('every new and changed key carries the lane English', () => {
    const val = (k) => {
      const pm = /^permit_q(\d+)_(q|a\d+|exp)$/.exec(k);
      if (!pm) return fallback(k);
      const it = BANK[+pm[1]]; return pm[2] === 'q' ? it.q : pm[2] === 'exp' ? it.exp : it.a[+pm[2].slice(1)];
    };
    for (const [k, v] of Object.entries(STRINGS.new)) expect(val(k), k).toBe(v);
    for (const [k, v] of Object.entries(STRINGS.changed)) { expect(val(k), k).toBe(v.new); expect(v.old, k).not.toBe(v.new); }
    expect(Object.keys(STRINGS.changed).length).toBe(23);
    for (const v of Object.values(STRINGS.new)) expect(v).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
