// Round 32, lane words (wd32). The English of Road Ready is frozen for translation after this round, so these
// tests hold the wording rules in place:
//   1. permit stems are questions, not sentence fragments that end in a colon;
//   2. the explanations this round rewrote in plain sentences keep every number and statute section of the
//      old text (pair-truth), except the listed fact corrections, each of which is checked on its own;
//   3. the 20-question quick test is never called the BMV format, and no text hard-codes or prints the bank size;
//   4. the provisional-license wording is the same everywhere (29-A M.R.S. sec. 2472(1) and (2));
//   5. safety lines that are spoken from a translated string carry the explicit 'critical' argument;
//   6. navigation arrows are outside the translated string; new strings carry no emoji;
//   7. STRINGS.json (the fixture) matches the tool word for word.
// The tool is read from ROADREADY_SOURCE so the same file runs on the base copy (fails) and the lane copy (passes).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import STRINGS from './roadready_wd32_strings.json';
import PAIRS from './roadready_wd32_pairs.json';

const FILE = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(resolve(process.cwd(), FILE), 'utf8');

let RR, BANK, LIVE;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(FILE, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__');
  BANK = RR.PERMIT_BANK;
  LIVE = BANK.map((q, i) => ({ q, i })).filter((x) => !x.q.retired);
});

// Flesch-Kincaid grade (the formula used for the Coral Reef plain-language pairs).
function syl(w) { if (/^\d/.test(w)) return 2; w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const g = w.match(/[aeiouy]{1,2}/g); return g ? g.length : 1; }
function grade(t) {
  const clean = String(t).replace(/\{[A-Za-z0-9_]+\}/g, 'five').replace(/\b(et al|e\.g|i\.e|Dr|vs)\./g, '$1');
  const sents = clean.split(/[.!?]+(?=\s|$)/).filter((s) => /[A-Za-z0-9]/.test(s));
  const words = clean.split(/\s+/).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9%]+$/g, '')).filter((w) => /[A-Za-z0-9]/.test(w));
  const total = words.reduce((a, w) => a + syl(w), 0);
  return 0.39 * (words.length / Math.max(1, sents.length)) + 11.8 * (total / Math.max(1, words.length)) - 15.59;
}
// The pair-truth signature of a text: its numbers and its statute sections, as sorted sets.
function facts(t) {
  const s = String(t);
  const SEC = /§\s*\d+[A-Za-z-]*(?:\(\d+[A-Za-z-]*\))*/g;
  const secs = (s.match(SEC) || []).map((x) => x.replace(/\s+/g, ''));
  const nums = (s.replace(SEC, ' ').match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || []).map((x) => x.replace(/,/g, ''));
  const uniq = (a) => [...new Set(a)].sort().join(' ');
  return { nums: uniq(nums), secs: uniq(secs) };
}
function toolEnglish() {
  const map = new Map();
  const re = /__allo(?:RR)?T\(\s*(['"])stem\.roadready\.([A-Za-z0-9_]+)\1\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(src))) { if (!map.has(m[2])) map.set(m[2], new Function('return ' + m[3])()); }
  BANK.forEach((q, i) => { map.set('permit_q' + i + '_q', q.q); q.a.forEach((a, j) => map.set('permit_q' + i + '_a' + j, a)); map.set('permit_q' + i + '_exp', q.exp); });
  Object.keys(RR.LESSONS).forEach((k) => map.set(k + '_content', RR.LESSONS[k].content));
  return map;
}
const ICON = /[←-⇿☀-➿\u{1F000}-\u{1FAFF}]/u;

describe('wd32 permit stems are direct questions', () => {
  // No allow-list entries: every live stem was converted. Add an index here only with a reason.
  const FRAGMENT_ALLOW = [];
  it('no live stem is a sentence fragment that ends in a colon', () => {
    const frag = LIVE.filter((x) => /:\s*$/.test(x.q.q) && FRAGMENT_ALLOW.indexOf(x.i) === -1).map((x) => 'q' + x.i + ' ' + x.q.q);
    expect(frag).toEqual([]);
  });
  it('every live stem ends with a question mark (or closes a quoted question)', () => {
    const odd = LIVE.filter((x) => !/\?["”]?\s*$/.test(x.q.q)).map((x) => 'q' + x.i + ' ' + x.q.q);
    expect(odd).toEqual([]);
  });
  it('the bank is the same size and no item moved (keys are positional)', () => {
    expect(BANK.length).toBe(261);
    expect(LIVE.length).toBe(257);
    expect(BANK[0].q).toMatch(/4-way stop/);
    expect(BANK[260].q).toMatch(/pass/i);
  });
});

describe('wd32 plain-language explanations keep their facts (pair-truth)', () => {
  it('each rewritten explanation has the numbers and statute sections of the text it replaced', () => {
    const ids = Object.keys(PAIRS.pairs);
    expect(ids.length).toBeGreaterThanOrEqual(50);
    const bad = [];
    for (const id of ids) {
      const f = facts(BANK[+id].exp), want = PAIRS.pairs[id];
      if (f.nums !== want.nums || f.secs !== want.secs) bad.push('q' + id + ': [' + f.nums + ' | ' + f.secs + '] should be [' + want.nums + ' | ' + want.secs + ']');
    }
    expect(bad).toEqual([]);
  });
  it('each rewrite reads at a lower grade than the text it replaced, and none is above grade 10.5', () => {
    const bad = [];
    for (const id of Object.keys(PAIRS.pairs)) {
      const g = grade(BANK[+id].exp);
      if (g > PAIRS.pairs[id].oldGrade - 0.5 && PAIRS.pairs[id].oldGrade > 8) bad.push('q' + id + ' ' + PAIRS.pairs[id].oldGrade + ' -> ' + g.toFixed(1));
      if (g > 10.5) bad.push('q' + id + ' is grade ' + g.toFixed(1));
    }
    expect(bad).toEqual([]);
  });
  it('the bank as a whole: at most 6 live explanations above grade 10 (it was 37) and at most 45 above grade 8 (it was 79)', () => {
    const g = LIVE.map((x) => grade(x.q.exp));
    expect(g.filter((x) => x > 10).length).toBeLessThanOrEqual(6);
    expect(g.filter((x) => x > 8).length).toBeLessThanOrEqual(45);
  });
  it('the answer-length rank of the keyed answer did not change for any item (wave 2 balanced them)', () => {
    const rank = (q) => { const L = q.a.map((x) => x.length), k = L[q.correct]; return L.filter((x) => x > k).length + '/' + L.filter((x) => x === k).length; };
    const moved = Object.keys(PAIRS.ranks).filter((i) => rank(BANK[+i]) !== PAIRS.ranks[i]).map((i) => 'q' + i + ' ' + PAIRS.ranks[i] + ' -> ' + rank(BANK[+i]));
    expect(Object.keys(PAIRS.ranks).length).toBe(261);
    expect(moved).toEqual([]);
  });
});

describe('wd32 fact corrections, each against its source', () => {
  const item = (i) => BANK[i];
  it('q19 studded tires: 29-A sec. 1919(1) bans them "from the first day of May to the first day of October"', () => {
    expect(item(19).a[item(19).correct]).toBe('October 2 to April 30');
    expect(item(19).exp).toContain('from May 1 to October 1 (29-A §1919)');
    expect(src).not.toMatch(/Oct 1 ?[–-] ?May 1|October 1 to May 1/);
  });
  it('q60 rain: the manual says "Wet road: Slow down 5 to 10 mph"', () => {
    expect(item(60).a[item(60).correct]).toContain('5 to 10 mph');
    expect(item(60).exp).toContain('slow down 5 to 10 mph');
    expect(item(60).exp).not.toMatch(/30-50%|first 10 minutes/);
  });
  it('q14 wet stopping distance: the percentage is the tool model\'s, and the explanation says so', () => {
    const ratios = [35, 45, 55, 65].map((v) => RR.stoppingDistance(v, 'rain', 1.5).total_ft / RR.stoppingDistance(v, 'clear', 1.5).total_ft);
    for (const r of ratios) { expect(r).toBeGreaterThan(1.28); expect(r).toBeLessThan(1.45); }
    expect(item(14).exp).toContain("In Road Ready's model");
    expect(item(14).exp).toContain('about 30% to 40% longer');
    expect(item(14).exp).not.toMatch(/90%/);
  });
  it('q144 white cane: the manual says stop (at least 10 feet away); the statute fine stays', () => {
    expect(item(144).a[item(144).correct]).toBe('Visual impairment — stop, wait, and give room');
    expect(item(144).exp).toContain('stop at least 10 feet away and wait until the person is out of danger');
    expect(item(144).exp).toContain('$50-$1,000 fine');
  });
  it('q139 outside a crosswalk: statute and manual are both stated', () => {
    expect(item(139).exp).toContain('Maine §2056');
    expect(item(139).exp).toContain('drivers must exercise due care');
    expect(item(139).exp).toContain('always yield to pedestrians, even when they are not in a crosswalk');
  });
  it('q120 sleep and alcohol: the CDC figures (17 hours = 0.05%, 24 hours = 0.10%)', () => {
    expect(item(120).exp).toMatch(/CDC says being awake for 17 hours is similar to having a BAC of 0\.05%.*24 hours is similar to a BAC of 0\.10%/);
  });
  it('q29 and the hypermiling lesson quote fueleconomy.gov\'s two ranges', () => {
    expect(item(29).exp).toContain('roughly 15% to 30% at highway speeds and 10% to 40% in stop-and-go traffic');
    expect(src).not.toMatch(/MPG by 20-40%|lower MPG by 15-40%/);
  });
  it('claims with no primary source are gone', () => {
    for (const old of ['70,000+ moose', 'lasts 3–5 minutes', 'kill more people than the first hit', '12-27% of city', 'Rolling stops are #1', 'by up to 25% at night', 'cut fatality risk by ~75%', 'about 525 ft to stop', 'is usually doing 50+ mph', 'fatal crashes by 90%', '% of CROSSING-PATH', 'in roughly 59 ft', 'Wait for water to equalize', 'move to back seat', 'can void your injury claim', 'Insurance adjusters screenshot']) {
      expect(src.indexOf(old), old).toBe(-1);
    }
    expect(src).toContain('a Virginia Tech study of truck drivers put it near 23×');
    expect(src).toContain('72% to 80% fewer injury crashes (IIHS)');
  });
  it('the flood card gives the manual\'s way out: a window, at once', () => {
    const card = src.slice(src.indexOf("id: 'flood_water'"), src.indexOf("id: 'flood_water'") + 2200);
    expect(card).toContain('Get out through a window');
    expect(card).toContain('Do not wait');
  });
});

describe('wd32 the 20-question quick test is not the BMV format; no bank size in text', () => {
  it('no string calls the practice questions "BMV-style" or the quick test the "BMV format"', () => {
    const en = toolEnglish();
    const bad = [];
    for (const [k, v] of en) if (/BMV[- ]style questions|BMV format/i.test(v)) bad.push(k + ': ' + v);
    expect(bad).toEqual([]);
    expect(src).not.toMatch(/Maine BMV-style questions/);
    expect(src).not.toContain("'Permit Test (20q quiz)'");
  });
  it('the catalog and the tour do not print PERMIT_BANK.length', () => {
    const lines = src.split('\n').filter((l) => /PERMIT_BANK\.length/.test(l) && /__alloT\(|desc:|body:|' \+ PERMIT_BANK\.length \+ '/.test(l));
    expect(lines).toEqual([]);
  });
  it('no translated string hard-codes the size of the question bank', () => {
    const en = toolEnglish();
    const bad = [];
    for (const [k, v] of en) if (!/^permit_q\d+_/.test(k) && /\b(193|257|261)\b[^.]{0,40}\bquestions?\b|\bquestions?\b[^.]{0,20}\b(193|257|261)\b/i.test(v)) bad.push(k + ': ' + v);
    expect(bad).toEqual([]);
  });
  it('the practice-set certificate says it is not the real test format', () => {
    expect(toolEnglish().get('cert_about_practice')).toContain('This is not the format of the real Maine test.');
  });
});

describe('wd32 provisional license: one account everywhere', () => {
  it('no string says the license is provisional "for 2 years" or "through {date}" without the age-21 clause', () => {
    const en = toolEnglish();
    const bad = [];
    for (const [k, v] of en) {
      if (/^permit_q(241|244)_/.test(k)) continue; // a 19- and a 20-year-old: both readings agree (wave 2)
      if (/provisional (license )?(for|through)\b[^.]*\b(2 years|two years|\{date\})/i.test(v) && !/21/.test(v)) bad.push(k + ': ' + v);
      if (/2-year provisional (period|suspension rule)/i.test(v)) bad.push(k + ': ' + v);
    }
    expect(bad).toEqual([]);
  });
  it('the guide states both sources in plain words', () => {
    const en = toolEnglish();
    expect(en.get('guide_lic_s3_intro')).toContain('The Maine manual says it is provisional for 2 years.');
    expect(en.get('guide_lic_s3_intro')).toContain('Maine law says 2 years or until you turn 21, whichever comes later.');
    expect(en.get('guide_lic_sources')).toMatch(/Title 29-A, sections 1304, 1311 and 2472/);
  });
  it('the tracker labels its two-year date as the suspension rule, and names age 21', () => {
    const en = toolEnglish();
    expect(en.get('gdl_dates_prov_until')).toBe('The 2-year rule for new drivers lasts through {date}. Days left: {n}.');
    expect(en.get('gdl_stage_provisional_desc')).toMatch(/until your 21st birthday/);
    expect(en.get('gdl_dates_note')).toMatch(/until age 21/);
    // the date itself is still 29-A sec. 2472(2)'s "within 2 years from the date of issue"
    expect(RR.rrGdlTimeline ? RR.rrGdlTimeline('2026-03-01', '2026-11-26').provisionalEnd : '2028-03-01').toBe('2028-03-01');
  });
  it('permit q114 and the last-stage line say the same thing', () => {
    expect(BANK[114].exp).toContain('For 2 years after you get it, a moving-violation conviction suspends it for 30 days');
    expect(BANK[114].exp).toContain('until you turn 21');
    expect(toolEnglish().get('congratulations_you_have_a_full_maine_')).toContain('For 2 years after you got it, a conviction for a moving violation suspends it for 30 days');
  });
});

describe('wd32 in-drive alerts and spoken safety lines go through the translator', () => {
  it('a spoken line that comes from a translated string and names a danger passes \'critical\'', () => {
    const SAFETY = new RegExp(/var RR_SAFETY_LINE = \/(.+)\/i;/.exec(src)[1], 'i');
    const rx = /speak\(__alloT\('stem\.roadready\.(say_[a-z0-9_]+)',\s*'((?:[^'\\]|\\.)*)'\)\s*,\s*(null|'\w+')\s*,\s*'(\w+)'\)/g;
    const lines = []; let m;
    while ((m = rx.exec(src))) lines.push({ key: m[1], text: m[2].replace(/\\'/g, "'"), category: m[3], priority: m[4] });
    expect(lines.length).toBeGreaterThanOrEqual(12);
    for (const l of lines) {
      expect(l.priority, l.key).toBe('critical');
      // each was already a safety line by the English word list, so English behaviour is unchanged
      expect(SAFETY.test(l.text), l.text).toBe(true);
      expect(["null", "'hazard'"]).toContain(l.category);
    }
    // no translated spoken line is left without an explicit priority
    expect(src).not.toMatch(/speak\(__alloT\([^)]*\)\s*\)/);
    expect(lines.map((l) => l.key)).toEqual(expect.arrayContaining(['say_hydroplaning', 'say_wrong_way', 'say_wrong_side', 'say_child_crossing', 'say_bus_passed', 'say_pedestrian_yield', 'say_high_speed_impact']));
  });
  it('the alert cards a student sees most have keys, with the icon outside the string', () => {
    const en = toolEnglish();
    for (const k of ['alert_speed_limit', 'alert_wrong_way', 'alert_wrong_side', 'alert_bus_passed', 'alert_child_running', 'alert_emergency_failed', 'alert_emergency_pull_right', 'alert_pedestrian_crosswalk', 'alert_pedestrian_yield', 'alert_off_road', 'alert_rumble_strip', 'alert_bus_full_stop', 'alert_cyclist_3ft']) {
      expect(en.has(k), k).toBe(true);
      expect(ICON.test(en.get(k)), k).toBe(false);
    }
    expect(en.get('alert_speed_limit')).toBe('Ease off the gas. The posted limit is {n} mph.');
    expect(src).toContain(".replace('{n}', String(scn.speedLimit)), 2.5, 2, 'caution');");
  });
  it('coach wording has no formula jargon', () => {
    const coach = src.slice(src.indexOf('function coachTipFor'), src.indexOf('function rrPracticeFocusFor'));
    expect(coach).not.toMatch(/v²|kinetic-energy|Friction circle: 100%|reaction buffer/);
    expect(src).not.toContain('μ ≈ 0.2. Gentle inputs only.');
    expect(src).not.toContain('Braking distance grows with v².');
  });
});

describe('wd32 translatability', () => {
  it('navigation labels: no arrow inside a translated string', () => {
    const en = toolEnglish();
    const bad = [];
    for (const [k, v] of en) if (/^[←↺↻] \S|\S →$/u.test(v) && ['speed_mph', 'level_w_head_top', 'steer_2', 'steer'].indexOf(k) === -1) bad.push(k + ': ' + v);
    expect(bad).toEqual([]);
    expect(en.get('nav_menu')).toBe('Menu');
    expect(en.get('nav_next')).toBe('Next');
    expect(src).toContain("('← ' + __alloT('stem.roadready.nav_menu', 'Menu'))");
    expect(src).toContain("(__alloT('stem.roadready.nav_next', 'Next') + ' →')");
  });
  it('fewer translated strings carry an emoji or arrow than before (325), and far fewer arrows (129)', () => {
    const en = toolEnglish();
    let icons = 0, arrows = 0;
    const re = /__allo(?:RR)?T\(\s*(['"])stem\.roadready\.([A-Za-z0-9_]+)\1\s*,\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")\)/g; let m;
    while ((m = re.exec(src))) { const v = new Function('return ' + m[3])(); if (/[←-⇿⌀-⏿①-⓿■-➿⤀-⥿⬀-⯿\u{1F000}-\u{1FAFF}️]/u.test(v)) icons++; if (/[←-⇿⤀-⥿⬅-⬇➡]/u.test(v)) arrows++; }
    expect(icons).toBeLessThanOrEqual(215);
    expect(arrows).toBeLessThanOrEqual(15);
    expect(en.size).toBeGreaterThan(3000);
  });
  it('new strings have no emoji, no arrow, and no leading or trailing space', () => {
    const bad = Object.keys(STRINGS.new).filter((k) => ICON.test(STRINGS.new[k]) || /^\s|\s$/.test(STRINGS.new[k]));
    expect(bad).toEqual([]);
  });
});

describe('wd32 STRINGS.json matches the tool', () => {
  it('every new and changed key has exactly the English in the tool', () => {
    const en = toolEnglish();
    const off = [];
    for (const k of Object.keys(STRINGS.new)) if (en.get(k) !== STRINGS.new[k]) off.push('new ' + k);
    for (const k of Object.keys(STRINGS.changed)) if (en.get(k) !== STRINGS.changed[k].new) off.push('changed ' + k);
    expect(off).toEqual([]);
    expect(Object.keys(STRINGS.new).length).toBeGreaterThan(60);
    expect(Object.keys(STRINGS.changed).length).toBeGreaterThan(200);
  });
  it('orphaned keys are really gone from the tool', () => {
    const en = toolEnglish();
    expect(STRINGS.orphaned_by_this_lane.filter((k) => en.has(k))).toEqual([]);
  });
});
