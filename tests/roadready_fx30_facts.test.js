// Round 30, lane facts (fx30). Road Ready teaches Maine teens safety and legal facts, so the facts
// are pinned against the primary sources the round-30 content review checked them against:
//   - Maine Driver's License Manual (Rev 4/24): 4-second following distance, low beams ~250 ft,
//     look 20-30 seconds ahead, hydroplaning from 30-40 mph, packed snow = half speed, window escape;
//   - 29-A M.R.S. 2252/2255 (give name AND address after a crash), 2472(4) (under-21 refusal = 18 months),
//     1304 (driver ed completed; 6 months + 70 hours), 2075 (only SPEEDING fines double in work zones),
//     2308 (stop when the bus has stopped with red lights flashing), 2070 (careful and prudent speed);
//   - the tool's own models: every number the tool shows is recomputed here from the function.
// A number the tool shows must come from the function that models it: these tests run the functions.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import STRINGS from './roadready_fx30_strings.json';

const FILE = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(FILE, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__');
});

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const view = (d) => text(renderTool('roadReady', { roadReady: d }));

// Every English string the tool can show under a translation key: literal __alloT / __alloRRT calls,
// the positional permit keys, and the dynamic lesson / scenario / pillar families.
function toolEnglish() {
  const map = new Map();
  const re = /__allo(?:RR)?T\((['"])stem\.roadready\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(src))) { if (!map.has(m[2])) map.set(m[2], new Function('return ' + m[3])()); }
  RR.PERMIT_BANK.forEach((q, i) => {
    map.set('permit_q' + i + '_q', q.q);
    q.a.forEach((a, j) => map.set('permit_q' + i + '_a' + j, a));
    if (q.exp) map.set('permit_q' + i + '_exp', q.exp);
  });
  Object.keys(RR.LESSONS).forEach((k) => map.set(k + '_content', RR.LESSONS[k].content));
  RR.SCENARIOS.forEach((s) => map.set(s.id + '_desc', s.desc));
  Object.keys(RR.UNIVERSAL_RULES).forEach((k) => { if (RR.UNIVERSAL_RULES[k].summary) map.set(k + '_summary', RR.UNIVERSAL_RULES[k].summary); });
  return map;
}

// All string literals in the source (single, double), so un-keyed coach tips and rule lists are scanned too.
function allLiterals() {
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) { const s = m[1] != null ? m[1] : m[2]; if (s && s.length > 12 && /[a-z] [a-z]/i.test(s)) out.push(s.replace(/\\'/g, "'")); }
  return out;
}

describe('fx30 following distance: the Maine manual minimum is 4 seconds', () => {
  it('the shared model returns 4 s dry and a rising ladder for worse weather', () => {
    expect(RR.drivingFollowingTarget('clear')).toBe(4);
    expect(RR.drivingFollowingTarget('rain')).toBe(5);
    expect(RR.drivingFollowingTarget('fog')).toBe(6);
    expect(RR.drivingFollowingTarget('snow')).toBe(6);
    expect(RR.drivingFollowingTarget('ice')).toBe(8);
    expect(/function followingSecondsFor\(weather\) \{[^}]*return 4;\s*\}/.test(src)).toBe(true);
  });
  it('every caller of the model moves with it (feet, metres, HUD target, rule cue)', () => {
    expect(RR.safeFollowingFeet(60, 'clear')).toBeCloseTo(60 * 1.467 * 4, 6);
    expect(RR.safeFollowingFeet(60, 'snow')).toBeCloseTo(60 * 1.467 * 6, 6);
    expect(RR.recommendedFollowingMeters(10, 'clear', 1)).toBeCloseTo(2.5 + 40, 6);
    const hud = RR.drivingFollowingDisplay(35, 10, 'clear'); // 3.5 s gap at 10 m/s
    expect(hud.target).toBe(4);
    expect(hud.action).toBe('Increase gap');
    expect(RR.drivingFollowingDisplay(41, 10, 'clear').action).toBe('Keep scanning');
    const cue = RR.rrRuleCueFor({ speedMph: 30, limitMph: 30, gapSeconds: 3.5 });
    expect(cue.title).toBe('ADD FOLLOWING SPACE');
    expect(cue.detail).toContain('aim for 4+ seconds');
    expect(RR.rrRuleCueFor({ speedMph: 30, limitMph: 30, gapSeconds: 4.2 }).title).not.toBe('ADD FOLLOWING SPACE');
  });
  it('no text states a 2- or 3-second following gap', () => {
    const GAP = /(?:\b(?:2|3|two|three)\+?[- ](?:seconds?|sec)\b|\b(?:2|3)\+ seconds)/i;
    const ABOUT = /follow|second rule|-second rule|\bgap\b|dry road|dry pavement\)|Mississippi/i;
    const NOT = /reaction|eyes-off|phone|stop sign|full stop|arriving in|no car is arriving|blind|vision|wait \d|look away|glance|countdown|hold|mirror scan/i;
    const bad = allLiterals().filter((s) => {
      const m = GAP.exec(s);
      if (!m) return false;
      const near = s.slice(Math.max(0, m.index - 90), m.index + 110);
      return ABOUT.test(near) && !NOT.test(near);
    });
    expect(bad).toEqual([]);
  });
  it('the texts that name the dry gap say 4', () => {
    const en = toolEnglish();
    expect(en.get('permit_q13_a1')).toBe('Seconds (4-second rule minimum)');
    expect(en.get('permit_q37_q')).toContain('4-second rule');
    expect(en.get('permit_q72_a1')).toContain('4+ seconds');
    expect(en.get('permit_q87_q')).toContain('four-second rule');
    expect(en.get('permit_q108_q')).toContain('"4-second rule"');
    expect(en.get('permit_q108_exp')).toContain('At 30 mph, 4 seconds = ' + Math.round(30 * 1.4667 * 4) + ' ft. At 60 mph, 4 seconds = ' + Math.round(60 * 1.4667 * 4) + ' ft.');
    expect(en.get('i_will_keep_3_seconds_of_following_dis')).toContain('at least 4 seconds');
    expect(en.get('highway_desc')).toContain('4-second following distance');
    expect(RR.coachTipFor({ type: 'tailgate', mu: 0.72 }).advice).toContain('4-second rule');
  });
  it('snow says one thing everywhere: 6 seconds (tool guidance), the value the model uses', () => {
    const en = toolEnglish();
    const snow = RR.drivingFollowingTarget('snow');
    expect(en.get('winterdriving_c2_3')).toBe(snow + ' seconds or more');
    expect(en.get('winterdriving_exp2')).toContain('At least ' + snow + ' seconds on snow');
    expect(en.get('winter_content')).toContain('at least ' + snow + ' seconds on snow');
    expect(en.get('i_will_keep_3_seconds_of_following_dis')).toContain(snow + ' or more in snow');
    expect(src).not.toMatch(/6-10 seconds|8–10 seconds|8-10 seconds/);
  });
  it('the cheat sheet gap list matches the model', () => {
    const t = view({ view: 'cheatSheet' });
    expect(t).toMatch(/Dry road:\s*4\+ seconds/);
    expect(t).toMatch(/Wet road:\s*5\+ seconds/);
    expect(t).toMatch(/Snow or fog:\s*6\+ seconds\s*; ice: 8\+ seconds/);
  });
  it('visual lead is the manual figure, 20 to 30 seconds', () => {
    expect(src).not.toMatch(/12[-–]15 sec/);
    // (the Smith System question describes that named method, which says 15 s: left as it is)
    expect(allLiterals().filter((s) => /look 15 seconds|15 seconds (?:ahead|down)/i.test(s) && !/Smith System/.test(s))).toEqual([]);
    expect(toolEnglish().get('permit_q58_a1')).toBe('20-30 seconds ahead down the road');
  });
});

describe('fx30 night: low beams show about 250 ft', () => {
  const ceiling = (range) => { for (let v = 80; v > 10; v--) if (RR.stoppingDistance(v, 'clear', 2.0).total_ft <= range) return v; return 10; };
  it('Night Vision Math uses 250 ft and its ceiling follows from stoppingDistance()', () => {
    expect(ceiling(250)).toBe(48);
    expect(ceiling(500)).toBe(76);
    const low = view({ view: 'nightVision', nvSpeed: 55, nvBeams: 'low' });
    expect(low).toContain('Headlight range: 250 ft');
    expect(low).toContain(ceiling(250) + ' mph');
    expect(low).toContain('Stopping distance: ' + Math.round(RR.stoppingDistance(55, 'clear', 2.0).total_ft) + ' ft');
    expect(low).toContain('OVERDRIVING YOUR HEADLIGHTS');
    const ok = view({ view: 'nightVision', nvSpeed: 45, nvBeams: 'low' });
    expect(ok).toContain('You can stop within your headlight range');
    const high = view({ view: 'nightVision', nvSpeed: 55, nvBeams: 'high' });
    expect(high).toContain('Headlight range: 500 ft');
    expect(high).toContain(ceiling(500) + ' mph');
  });
  it('no text gives 350 ft for low beams, and the lesson numbers are the model numbers', () => {
    expect(allLiterals().filter((s) => /350 ?(ft|feet)/.test(s) && /beam|headlight/i.test(s))).toEqual([]);
    const sd = RR.stoppingDistance(50, 'clear', 2.0);
    const night = RR.LESSONS.night;
    expect(night.content).toContain('about 250 feet');
    expect(night.content).toContain('braking distance at 50 mph is about ' + Math.round(sd.braking_ft) + ' ft');
    expect(night.content).toContain('~' + Math.round(sd.reaction_ft) + ' ft, so roughly ' + Math.round(sd.total_ft) + ' ft total');
    expect(night.variables).toContain(Math.round(sd.total_ft) + ' ft');
    expect(Math.round(sd.total_ft)).toBeGreaterThan(250);
    expect(RR.SCENARIOS.find((s) => s.id === 'night').desc).toContain('~250 ft with lows');
  });
});

describe('fx30 cheat sheet stopping table', () => {
  it('every cell equals stoppingDistance(mph, weather, 1.5)', () => {
    const html = renderTool('roadReady', { roadReady: { view: 'cheatSheet' } });
    const table = /<table[^>]*aria-label="Typical stopping distance by road condition"[\s\S]*?<\/table>/.exec(html);
    expect(table).toBeTruthy();
    const rows = [...table[0].matchAll(/<tr>\s*<th[^>]*scope="row"[^>]*>(\d+) mph<\/th>([\s\S]*?)<\/tr>/g)];
    expect(rows.map((r) => Number(r[1]))).toEqual([25, 35, 55, 65]);
    for (const r of rows) {
      const cells = [...r[2].matchAll(/<td[^>]*>([\d,]+) ft<\/td>/g)].map((c) => Number(c[1].replace(/,/g, '')));
      expect(cells).toEqual(['clear', 'rain', 'ice'].map((w) => Math.round(RR.stoppingDistance(Number(r[1]), w, 1.5).total_ft)));
    }
  });
  it('says the true braking rule and gives the manual table, labelled as the manual', () => {
    const t = view({ view: 'cheatSheet' });
    expect(t).not.toContain('Braking doubles');
    expect(t).toContain('double the speed, about four times the braking distance');
    expect(RR.stoppingDistance(60, 'clear', 1.5).braking_ft / RR.stoppingDistance(30, 'clear', 1.5).braking_ft).toBeCloseTo(4, 6);
    expect(t).toContain("Maine driver's manual table (dry, level road): 20 mph 45 ft, 30 mph 78 ft, 40 mph 125 ft, 50 mph 188 ft, 60 mph 272 ft, 70 mph 381 ft.");
  });
  it('the stopping-lesson chart uses the shared friction model', () => {
    const html = renderTool('roadReady', { roadReady: { view: 'lesson', lesson: 'stopping' } });
    const t = text(html);
    expect(t).toContain('Dry (μ=' + RR.frictionCoef('clear') + ')');
    expect(t).toContain('Wet (μ=' + RR.frictionCoef('rain') + ')');
    expect(html).toContain('at 60 mph about ' + Math.round(RR.stoppingDistance(60, 'clear', 1.5).total_ft) + ' feet dry and ' + Math.round(RR.stoppingDistance(60, 'rain', 1.5).total_ft) + ' feet wet.');
  });
});

describe('fx30 Maine law', () => {
  it('post-crash: give your name AND address (29-A 2252, 2255); no folklore list', () => {
    expect(src).not.toContain('NOT your home address');
    const t = view({ view: 'postCrash' });
    expect(t).toContain('your name and address');
    expect(t).not.toContain('Never Say These Words');
    expect(t).not.toContain('admission of fault');
    expect(t).toContain('Stay at the scene');
    expect(t).toContain('call 911');
    expect(t).toContain('Tell a parent or guardian');
  });
  it('under-21 breath-test refusal is 18 months (29-A 2472(4))', () => {
    const en = toolEnglish();
    expect(en.get('duidrill_q2')).toContain("You're 19");
    expect(en.get('duidrill_c2_2')).toContain('18-month');
    expect(en.get('duidrill_c2_2')).not.toContain('275');
    expect(en.get('duidrill_exp2')).toContain('18-month suspension');
    expect(en.get('driving_on_a_maine_road_is_legal_conse')).toContain('18 months if you are under 21');
  });
  it('permit: driver ed COMPLETED under 18; 6 months + 70 hours, no "no violations" condition (29-A 1304)', () => {
    const en = toolEnglish();
    expect(en.get('permit_q34_exp')).toContain('COMPLETE a driver education course');
    expect(src).not.toMatch(/no violations\)|with NO violations|hold 6 months no violations/);
    expect(en.get('you_must_hold_the_permit_6_months_with')).toContain('70 hours');
    expect(RR.MAINE_RULES.permitHoldPeriod).toContain('70');
  });
  it('work zones double SPEEDING fines only; school bus duty starts when it has stopped with red lights', () => {
    const en = toolEnglish();
    expect(src).not.toContain('doubled-fine');
    expect(en.get('rightofway_exp16')).not.toContain('doubled fines in work zones');
    expect(en.get('rightofway_exp16')).toContain('SPEEDING');
    expect(en.get('schoolbus_exp4')).not.toContain('counts as passing a school bus');
    expect(en.get('schoolbus_exp4')).toContain('has stopped with its red lights flashing');
    expect(en.get('schoolbus_exp4')).toContain('prepare to stop');
  });
  it('the licence stays provisional after the 270 days', () => {
    const en = toolEnglish();
    expect(src).not.toContain('full unrestricted');
    expect(src).not.toContain('You have a full Maine driver');
    expect(en.get('permit_q114_exp')).toContain('PROVISIONAL');
    expect(en.get('permit_q114_exp')).toContain('30 days');
    expect(en.get('congratulations_you_have_a_full_maine_')).toContain('provisional');
  });
  it('move over: a careful and prudent speed, no invented number (29-A 2070)', () => {
    expect(toolEnglish().get('emergencyvehicle_c5_2')).not.toMatch(/\d+ mph/);
  });
});

describe('fx30 drills whose options are rotated on screen', () => {
  it('no option refers to another option by letter', () => {
    const en = toolEnglish();
    const LETTER = /\b(?:[A-D] or [A-D]|[A-D] and [A-D]|either [A-D]\b|both [A-D]\b|(?:all|none) of the above|option [A-D]\b|answers? [A-D]\b)/i;
    const options = [...en].filter(([k]) => /_c\d+_\d+$/.test(k));
    expect(options.length).toBeGreaterThan(150);
    expect(options.filter(([, v]) => LETTER.test(v)).map(([k]) => k)).toEqual([]);
    // un-keyed option lists too: a literal that opens with a letter reference
    expect(allLiterals().filter((v) => /^(?:[A-D] or [A-D]|Either [A-D] or [A-D]|Both [A-D] and [A-D])(?![A-Za-z])/.test(v))).toEqual([]);
  });
  it('duidrill q1 keys "call a ride or a trusted adult", wherever rotation puts it', () => {
    const block = /duidrill_c1_1'[\s\S]*?correct: (\d),/.exec(src);
    expect(block).toBeTruthy();
    const en = toolEnglish();
    const keyed = en.get('duidrill_c1_' + (Number(block[1]) + 1));
    expect(keyed).toMatch(/call a ride or a trusted adult/);
    expect(en.get('duidrill_exp1')).toContain('§1311');
    // rrRotateScenario is not in the test exports: run the production function sliced from the source.
    const a = src.indexOf('function rrRotateScenario('), b = src.indexOf('function buildRandomTest(');
    const rotate = new Function(src.slice(a, b) + ';return rrRotateScenario;')();
    for (let i = 0; i < 6; i++) {
      const sc = { id: 'x', choices: [1, 2, 3, 4].map((n) => en.get('duidrill_c1_' + n)), correct: Number(block[1]) };
      const r = rotate(sc, i);
      expect(r.choices[r.correct]).toBe(keyed);
    }
  });
  it('constructionzone q3 keys a self-contained answer and no other option is also right', () => {
    const block = /constructionzone_c3_1'[\s\S]*?correct: (\d),/.exec(src);
    const en = toolEnglish();
    expect(en.get('constructionzone_c3_' + (Number(block[1]) + 1))).toMatch(/^Merge early when traffic is light; when it is backed up, use both lanes and take turns/);
    expect(en.get('constructionzone_c3_2')).toContain('speed up');
  });
});

describe('fx30 one value per quantity', () => {
  it('moose weight', () => {
    const vals = new Set();
    for (const s of allLiterals()) {
      for (const m of s.matchAll(/([\d,]{3,6}(?:[–-][\d,]{3,6})?) ?lbs?\b/g)) {
        const near = s.slice(Math.max(0, m.index - 80), m.index + 60);
        if (/moose/i.test(near) && !/deer|tractor|car|vehicle|truck/i.test(s.slice(Math.max(0, m.index - 30), m.index))) vals.add(m[1].replace(/,/g, ''));
      }
    }
    expect([...vals]).toEqual(['1000']);
    expect(src).not.toContain('1,000 lb deer');
  });
  it('football field: 300 ft, or 360 ft with the end zones', () => {
    expect(src).not.toContain('360 ft / 100 yd');
    expect(src).toContain('football field with its end zones (360 ft)');
    expect(src).toContain('longer than a football field (300 ft)');
  });
  it('tyre pressure and MPG: text and model agree with fueleconomy.gov (0.2% per PSI, up to about 3%)', () => {
    expect(allLiterals().filter((s) => /0\.3% MPG|-3 to -10%|≈ 0\.3%/.test(s))).toEqual([]);
    const sedan = RR.VEHICLES.find((v) => v.id === 'sedan');
    const loss = 1 - RR.instantMPG(55, 0, sedan, 'clear', true, { tireUnderinflated: true }) / RR.instantMPG(55, 0, sedan, 'clear', true, {});
    expect(loss).toBeGreaterThan(0.02);
    expect(loss).toBeLessThan(0.04);
  });
  it('impairment: no unsourced multiplier beside the tool\'s own +280 ms model', () => {
    expect(src).not.toContain('double your reaction distance');
    expect(src).not.toContain('Typical for 0.08% BAC drivers');
    expect(toolEnglish().get('permit_q27_a2')).not.toMatch(/\d/);
  });
  it('hydroplaning: the manual wording everywhere, and the model sits inside it', () => {
    expect(allLiterals().filter((s) => /hydroplan/i.test(s) && /\b45\b|as low as 35/.test(s))).toEqual([]);
    const en = toolEnglish();
    expect(en.get('rain_desc')).toContain('Hydroplaning can begin at 30 to 40 mph');
    expect(en.get('permit_q68_a2')).toContain('30 to 40 mph');
    const worn = RR.hydroplaneThresholdMph(32, 2, 0.5), fresh = RR.hydroplaneThresholdMph(32, 10, 0.05);
    expect(worn).toBeGreaterThanOrEqual(30);
    expect(worn).toBeLessThanOrEqual(40);
    expect(fresh).toBeLessThanOrEqual(60);
  });
});

describe('fx30 other corrected claims', () => {
  it('safety wording', () => {
    const en = toolEnglish();
    expect(en.get('permit_q103_a1')).not.toMatch(/or door/);
    expect(en.get('permit_q103_exp')).toContain('window is the best way out');
    expect(en.get('permit_q127_a2')).toBe('About half of your normal dry-road speed');
    expect(en.get('black_ice_forms_between_28_f_and_38_f_')).not.toContain('between 28°F and 38°F');
    expect(src).not.toContain('Pull right and stop if you lose visibility entirely');
    expect(src).not.toContain('If water is unavoidable and still');
    expect(src).not.toContain('never run a yellow light');
    expect(src).not.toContain('ELIMINATING BLIND SPOTS');
    expect(src).not.toContain('highway shoulder →');
    expect(en.get('nd_adhd_strategy3')).not.toMatch(/^Use cruise control/);
    expect(en.get('permit_q121_exp')).toContain('Cetirizine (Zyrtec) is not one of them');
    expect(en.get('permit_q185_exp')).toContain('$18.50');
    expect(en.get('signsview_interstate_highway_limited_access_65_70_mph_in')).toContain('75 mph');
  });
  it('roundabouts follow the manual: lane chosen before entering, follow the lane lines, signal your exit', () => {
    const en = toolEnglish();
    expect(en.get('roundaboutdrill_c4_2')).not.toMatch(/move right/);
    expect(en.get('roundaboutdrill_exp4')).toContain('do not change lanes');
    expect(en.get('roundaboutdrill_exp4')).not.toContain('Signal LEFT entering');
    expect(en.get('roundaboutdrill_exp6')).toContain('"Signal your exit."');
    expect(en.get('roundaboutdrill_c6_2')).not.toMatch(/Signal left/);
    // tutorial and drill agree: straight (within two exits) = right lane
    expect(en.get('in_a_multi_lane_roundabout_right_lane_')).toContain('right lane to leave within two exits (right turn or straight)');
    expect(en.get('roundaboutdrill_exp4')).toContain('within two exits (right turn or straight), use the right lane');
  });
  it('seriousness without shock wording, and no unsupported promises', () => {
    expect(src).not.toMatch(/, you die\./);
    expect(src).not.toContain('YOU HIT A CHILD');
    expect(src).not.toMatch(/or funerals/);
    expect(src).not.toContain('free teen ride programs');
    expect(src).not.toContain('Research shows signing a written pledge');
    expect(src).not.toContain('*SP for State Police');
    expect(src).not.toContain('sign reflectivity drops 30 percent');
    expect(src).not.toContain('through road always goes first');
    expect(src).not.toContain('Car going UPHILL has right-of-way');
    expect(src).not.toContain('18,000 tons');
    expect(src).not.toContain('Maine BMV examiner-policy documentation');
  });
  it('the 20-question practice test is not called the BMV format', () => {
    const t = view({ view: 'permitStart' });
    expect(t).toContain('the real Maine knowledge test has 30 questions and you need 24 right to pass');
    expect(t).not.toContain('Maine BMV Permit Test');
  });
});

describe('fx30 STRINGS.json matches the tool', () => {
  it('every changed and new key has exactly the English recorded for ui_strings', () => {
    const en = toolEnglish();
    const wrong = [];
    for (const [k, v] of Object.entries(STRINGS.changed)) if (en.get(k) !== v.new) wrong.push(k);
    for (const [k, v] of Object.entries(STRINGS.new)) if (en.get(k) !== v) wrong.push(k);
    expect(wrong).toEqual([]);
    expect(Object.keys(STRINGS.changed).length).toBeGreaterThan(100);
  });
});
