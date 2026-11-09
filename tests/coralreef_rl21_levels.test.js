import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels (round 21). A saved "Simpler words" switch swaps some long passages for a
// shorter version with the same facts. The default follows the app's grade (on for grade 5
// or lower), the student's own choice always wins, and the host saves the choice (a boolean).
// Every (full, simple) pair written with rl21Text is found in the source and checked: same
// numbers, placeholders, names, species and hedges, and an easier reading grade. A new pair
// added later is checked here with no test edit.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const HUB = process.env.MATH_AUTOSAVE_HUB || 'stem_lab/stem_lab_module.js';
const SRC = readFileSync(TOOL, 'utf8');
let loadTool, resetStemLab, React, ReactDOMClient, RL, PHOTO;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  RL = window.__RR_TEST_EXPORTS__.coralReefRl21;
  PHOTO = window.__RR_TEST_EXPORTS__.coralReefPhoto;
});

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(seed, extra = {}) {
  let data = { coralReef: seed };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {}, ...extra });
  }
  const out = { host, root, get data() { return data.coralReef; } };
  mounted.push(out);
  await React.act(async () => root.render(React.createElement(Shell)));
  return out;
}
const click = (el) => React.act(async () => { el.click(); await new Promise((r) => setTimeout(r, 5)); });
const sw = (host) => host.querySelector('input[data-rl21-switch]');

// The English of every literal __alloT call, as the i18n test reads it.
const EN = new Map();
for (const m of SRC.matchAll(/__alloT\((['"])stem\.coralreef\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) if (!EN.has(m[2])) EN.set(m[2], vm.runInNewContext(m[3]));
const en = (k) => EN.get(k);
const INV_FULL = 'Reef monitors use two methods along the same 20 m tape: a point';
const has = (host, text) => host.textContent.includes(text);

// ── Reading measures and the fact check shared by every pair ─────────────
function syl(w) {
  if (/^\d/.test(w)) return 2;
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0; if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const g = w.match(/[aeiouy]{1,2}/g); return g ? g.length : 1;
}
function grade(t) {
  const clean = t.replace(/\{[A-Za-z0-9_]+\}/g, 'five').replace(/\b(et al|e\.g|i\.e|Dr|vs)\./g, '$1');
  const sents = clean.split(/[.!?]+(?=\s|$)/).filter((s) => /[A-Za-z0-9]/.test(s));
  const words = clean.split(/\s+/).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9%]+$/g, '')).filter((w) => /[A-Za-z0-9]/.test(w));
  const total = words.reduce((a, w) => a + syl(w), 0);
  return 0.39 * (words.length / Math.max(1, sents.length)) + 11.8 * (total / Math.max(1, words.length)) - 15.59;
}
const NUM_WORDS = { two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90', hundred: '100', hundreds: '100', thousand: '1000', thousands: '1000', million: 'million', millions: 'million', billion: 'billion', half: '1/2', halves: '1/2', third: '1/3', thirds: '1/3', quarter: '1/4', quarters: '1/4', twice: 'x2', double: 'x2', doubled: 'x2', doubles: 'x2', triple: 'x3', tripled: 'x3', triples: 'x3' };
function numbers(t) {
  const out = [];
  for (const m of t.matchAll(/\d+(?:[.,]\d+)*/g)) out.push(m[0].replace(/,(?=\d{3}\b)/g, ''));
  for (const m of t.toLowerCase().matchAll(/[a-z]+/g)) if (NUM_WORDS[m[0]]) out.push(NUM_WORDS[m[0]]);
  return out;
}
const count = (list) => list.reduce((o, x) => { o[x] = (o[x] || 0) + 1; return o; }, {});
const placeholders = (t) => [...t.matchAll(/\{[A-Za-z0-9_]+\}/g)].map((m) => m[0]).sort();
// Capitalised words that are not the first word of a sentence: places, people, programs, sources.
function names(t) {
  const out = new Set();
  for (const s of t.split(/(?<=[.!?:])\s+/)) {
    const words = s.split(/\s+/);
    words.slice(1).forEach((w) => { const c = w.replace(/^[^A-Za-z]+|[^A-Za-z-]+$/g, ''); if (/^[A-Z]/.test(c) && c !== 'I') out.add(c); });
  }
  return [...out];
}
const HEDGES = ['about', 'around', 'roughly', 'nearly', 'almost', 'approximately', 'may', 'might', 'could', 'can', 'often', 'usually', 'sometimes', 'rarely', 'some', 'most', 'mostly', 'many', 'few', 'at least', 'more than', 'less than', 'fewer than', 'up to', 'not a forecast', 'what-if'];
// Word families: "projects" and "projected" are the same hedge; the noun "a project" is not one.
const HEDGE_STEMS = { projected: /\bproject(s|ed|ions?)\b/, estimate: /estimat/, simplified: /simplif/, suggests: /suggest/, typical: /typical/, average: /averag/, assumed: /assum/, caution: /caution/, confidence: /confidence/, likely: /likely/, probably: /probabl/, possibly: /possibl/, uncertain: /uncertain/ };
function hedges(t) {
  const s = t.toLowerCase();
  return HEDGES.filter((w) => new RegExp('(^|[^a-z-])' + w.replace(/-/g, '\\-') + '(?![a-z])').test(s)).concat(Object.keys(HEDGE_STEMS).filter((w) => HEDGE_STEMS[w].test(s)));
}
let SPECIES = null;
function speciesNames() {
  if (SPECIES) return SPECIES;
  const TX = PHOTO.speciesText((k, f) => f);
  // Each name, its other name in brackets, and a "-fish" head word (lionfish, parrotfish ...).
  const set = new Set();
  for (const x of Object.values(TX)) {
    const name = String(x.name || '').toLowerCase(), main = name.replace(/\s*\(.*$/, '').trim(), alt = /\(([^)]+)\)/.exec(name);
    [main, alt && alt[1].trim()].forEach((n) => { if (n && n.length > 3) { set.add(n); const last = n.split(/\s+/).pop(); if (/.{3,}fish$/.test(last)) set.add(last); } });
  }
  SPECIES = [...set];
  return SPECIES;
}
// Problems with one (full, simple) pair, as readable strings. Empty means the pair keeps the facts.
function pairProblems(full, simple) {
  const p = [];
  const fn = count(numbers(full)), sn = count(numbers(simple));
  for (const [n, c] of Object.entries(fn)) if ((sn[n] || 0) < c) p.push('number ' + n + ' kept ' + (sn[n] || 0) + ' of ' + c + ' times');
  for (const n of Object.keys(sn)) if (!fn[n]) p.push('new number ' + n);
  if (placeholders(full).join() !== placeholders(simple).join()) p.push('placeholders ' + placeholders(full).join() + ' vs ' + placeholders(simple).join());
  for (const n of names(full)) if (!new RegExp('(^|[^A-Za-z])' + n.replace(/[-]/g, '\\-') + '(?![a-z])').test(simple)) p.push('name ' + n);
  for (const n of speciesNames()) if (full.toLowerCase().includes(n) && !simple.toLowerCase().includes(n)) p.push('species ' + n);
  const sh = hedges(simple);
  for (const h of hedges(full)) if (sh.indexOf(h) < 0) p.push('hedge ' + h);
  if (/[–—]/.test(simple)) p.push('dash');
  if (!(grade(simple) < grade(full))) p.push('not easier: grade ' + grade(simple).toFixed(1) + ' vs ' + grade(full).toFixed(1));
  return p;
}

// Every rl21Text call outside comments, in the one shape the README of the block gives.
const CODE = SRC.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const LIT = "('(?:[^'\\\\]|\\\\.)*')";
const PAIR_RE = new RegExp("rl21Text\\(\\s*([A-Za-z_$][\\w$.]*)\\s*,\\s*__alloT\\('stem\\.coralreef\\.([A-Za-z0-9_]+)',\\s*" + LIT + "\\)\\s*,\\s*__alloT\\('stem\\.coralreef\\.([A-Za-z0-9_]+)',\\s*" + LIT + "\\)\\s*\\)", 'g');
const PAIRS = [...CODE.matchAll(PAIR_RE)].map((m) => ({ env: m[1], key: m[2], full: vm.runInNewContext(m[3]), simpleKey: m[4], simple: vm.runInNewContext(m[5]) }));
const CALLS = (CODE.match(/rl21Text\(/g) || []).length - (CODE.match(/function rl21Text\(/g) || []).length;

describe('grade default', () => {
  it('reads grades the app and teachers write', () => {
    const g = RL.gradeNumber;
    expect([g('5th Grade'), g('Grade 4'), g('K'), g('Kindergarten'), g('kindergarten'), g('Pre-K'), g('1st Grade'), g('12th Grade'), g('College'), g('Graduate Level')]).toEqual([5, 4, 0, 0, 0, -1, 1, 12, 13, 13]);
    expect([g('grade 3'), g('3rd'), g('Grades 3-5'), g('K-2'), g('6-8'), g('fifth grade'), g(' 7th  grade '), g(5), g('')]).toEqual([3, 3, 5, 2, 8, 5, 7, 5, null]);
    expect([g(undefined), g(null), g('Reef club'), g({})]).toEqual([null, null, null, null]);
  });
  it('is on for grade 5 or lower and off otherwise, or when the grade is unknown', () => {
    const on = (gradeLevel) => RL.defaultOn({ gradeLevel }, (k, f) => f);
    expect(['Kindergarten', 'K', '2nd Grade', '4th Grade', '5th Grade', 'Grade 5'].map(on)).toEqual([true, true, true, true, true, true]);
    expect(['6th Grade', '7th Grade', '9th Grade', '12th Grade', 'College', undefined, '', 'Reef club'].map(on)).toEqual([false, false, false, false, false, false, false, false]);
  });
  it('stays off on a translated page, where a new simple text may still be English', () => {
    const somali = (k, f) => (k === 'stem.coralreef.lab_title' ? 'Shaybaarka' : f);
    expect(RL.defaultOn({ gradeLevel: '4th Grade' }, somali)).toBe(false);
  });
  it('follows the app grade on screen when the student has not chosen', async () => {
    const young = await mount({ section: 'methods' }, { gradeLevel: '5th Grade' });
    expect(sw(young.host).checked).toBe(true);
    expect(has(young.host, en('inv_m_intro_simple'))).toBe(true);
    expect(has(young.host, INV_FULL)).toBe(false);
    const older = await mount({ section: 'methods' }, { gradeLevel: '7th Grade' });
    expect(sw(older.host).checked).toBe(false);
    expect(has(older.host, INV_FULL)).toBe(true);
    expect(older.data.simpleWords).toBeUndefined();
  });
});

describe('the student choice', () => {
  it('wins over the grade both ways and is saved as a boolean', async () => {
    const a = await mount({ section: 'methods', simpleWords: false }, { gradeLevel: '4th Grade' });
    expect(sw(a.host).checked).toBe(false);
    expect(has(a.host, INV_FULL)).toBe(true);
    const b = await mount({ section: 'methods', simpleWords: true }, { gradeLevel: '8th Grade' });
    expect(sw(b.host).checked).toBe(true);
    expect(has(b.host, en('inv_m_intro_simple'))).toBe(true);
    await click(sw(b.host));
    expect(b.data.simpleWords).toBe(false);
    expect(has(b.host, INV_FULL)).toBe(true);
  });
  it('is one value for every page: turned on in Methods, it is on in Reef science and Reef future', async () => {
    const t = await mount({ section: 'methods' }, { gradeLevel: '8th Grade' });
    await click(sw(t.host));
    expect(t.data.simpleWords).toBe(true);
    const navTo = (name) => [...t.host.querySelectorAll('nav.cr-nav button')].find((b) => b.textContent.trim() === name);
    for (const [name, key] of [['Reef science', null], ['Reef future', 'vis_key_simple']]) {
      const btn = navTo(name);
      expect(btn, name).toBeTruthy();
      await click(btn);
      expect(sw(t.host).checked, name).toBe(true);
      if (key) expect(has(t.host, en(key)), name).toBe(true);
    }
  });
});

describe('the save allowlist', () => {
  it('lists simpleWords, and the host save keeps the boolean across a restore', async () => {
    const src = readFileSync(path.resolve(process.cwd(), HUB), 'utf8');
    const list = /var _CORAL_REEF_SAVED = (\[[^\]]*\]);/.exec(src);
    expect(list).not.toBe(null);
    expect(vm.runInNewContext(list[1]).includes('simpleWords')).toBe(true);
    const fx = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/math_review3_autosave_fixtures.js').replace(/\\/g, '/'));
    const hub = fx.loadHub();
    for (const v of [true, false]) {
      const { next } = fx.saveAndRestore(hub, { coralReef: { section: 'science', simpleWords: v } }, {});
      expect(next.coralReef.simpleWords).toBe(v);
    }
  });
});

describe('rl21Text', () => {
  it('returns the simple text only when the switch is on and a simple text exists', () => {
    const env = (d, ctx = {}) => ({ d, ctx, t: (k, f) => f });
    expect(RL.text(env({ simpleWords: true }), 'Full.', 'Simple.')).toBe('Simple.');
    expect(RL.text(env({ simpleWords: false }), 'Full.', 'Simple.')).toBe('Full.');
    expect(RL.text(env({}, { gradeLevel: '3rd Grade' }), 'Full.', 'Simple.')).toBe('Simple.');
    expect(RL.text(env({}, { gradeLevel: '10th Grade' }), 'Full.', 'Simple.')).toBe('Full.');
    expect(RL.text(env({ simpleWords: true }), 'Full.', '')).toBe('Full.');
    expect(RL.text(env({ simpleWords: true }), 'Full.', undefined)).toBe('Full.');
  });
  it('reads the switch of the lab being drawn when a text table has no env', async () => {
    await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    expect(RL.now.on).toBe(true);
    expect(RL.text(null, 'Full.', 'Simple.')).toBe('Simple.');
    await mount({ section: 'guide', simpleWords: false }, { gradeLevel: '3rd Grade' });
    expect(RL.text(null, 'Full.', 'Simple.')).toBe('Full.');
  });
});

describe('every (full, simple) pair keeps the facts', () => {
  it('finds the pairs, each in the documented shape with a _simple key', () => {
    expect(PAIRS.length).toBeGreaterThanOrEqual(4);
    expect(PAIRS.length, 'every rl21Text call is a literal pair').toBe(CALLS);
    for (const p of PAIRS) {
      expect(p.simpleKey, p.key).toBe(p.key + '_simple');
      expect(['env', 'null'].includes(p.env) || /env$/.test(p.env), p.key + ' env').toBe(true);
      expect(en(p.key), p.key + ' has one English').toBe(p.full);
      expect(en(p.simpleKey), p.simpleKey + ' has one English').toBe(p.simple);
    }
  });
  it('keeps every number, placeholder, name, species and hedge, and reads easier', () => {
    const bad = {};
    for (const p of PAIRS) { const probs = pairProblems(p.full, p.simple); if (probs.length) bad[p.key] = probs; }
    expect(bad).toEqual({});
  });
  it('catches a simple text that drops or changes a fact', () => {
    const full = 'In one large project in Indonesia, coral cover rose from about 17% to about 56% in four years (Lange et al. 2024).';
    expect(pairProblems(full, 'In Indonesia, coral cover rose from about 17% to about 56% in four years (Lange et al. 2024).')).toEqual([]);
    expect(pairProblems(full, 'In Indonesia, coral cover rose from 17% to 56% in four years (Lange et al. 2024).')).toContain('hedge about');
    expect(pairProblems(full, 'In Indonesia, coral cover rose from about 17% to about 60% in four years (Lange et al. 2024).').join()).toMatch(/number 56.*new number 60/);
    expect(pairProblems(full, 'Coral cover rose from about 17% to about 56% in four years (Lange et al. 2024).')).toContain('name Indonesia');
    expect(pairProblems(full, 'In Indonesia, coral cover rose from about 17% to about 56% in four years.')).toContain('name Lange');
    expect(speciesNames()).toEqual(expect.arrayContaining(['clown anemonefish', 'ocellaris clownfish', 'clownfish', 'lionfish', 'crown-of-thorns starfish']));
    expect(pairProblems('A clownfish hides in {n} big anemones.', 'A fish hides in {n} anemones.')).toContain('species clownfish');
    expect(pairProblems('Corals add {a} kg.', 'Corals add some kg.')).toContain('placeholders {a} vs ');
  });
});

// Step 1: the hardest passages were rewritten for everyone. Same facts as the old English, easier.
const STEP1_OLD = {
  sc_warm_1: 'The IPCC projects that warm-water coral reefs will decline by a further 70 to 90% if global warming reaches 1.5 degrees C (high confidence), with larger losses of more than 99% at 2 degrees C (very high confidence).',
  help_water_1: 'On the Great Barrier Reef, reefs in cleaner water recovered faster after damage, and where divers removed coral-eating crown-of-thorns starfish early and thoroughly, coral cover rose instead of falling.',
  sciLab_bleach_intro: 'Set up a heatwave, predict what will happen to 10 corals on a reef, then watch week by week: the algae inside one coral, the food they make, and the heat stress adding up.',
  sciLab_b_honest: 'Simplified: average rates from Caribbean reef surveys (Perry et al. 2013, 2014, 2018), one growth rate for all corals, and the lab\'s acidification rule. Real budgets also depend on coral types, depth and storms, and acidic water also speeds up erosion, which this budget leaves out.',
  sciLab_b_idea_3: 'Before a disease killed most long-spined sea urchins in 1983, they scraped away 3 to 5 kg on each square meter every year (Perry et al. 2014).',
  m_pit_3: 'Reef Check surveys four 20 m stretches like this one and averages them, and recommends surveying a reef three to five times. Forty points is a small sample: on a reef with 30% cover, one 20 m stretch can read about 14 percentage points higher or lower just by chance, and more when one colony spans several points.',
  sc_acid_1: 'The ocean absorbs carbon dioxide, which leaves less of the carbonate corals use to build limestone. Scientists track this with the aragonite saturation state: about 4.2 in tropical waters before industry and about 3.5 by 2010. Above 1, corals can still build, but more slowly: roughly 15% slower for each 1 unit drop, with a wide spread between studies.',
  help_stars_1: 'Blast fishing leaves reefs as loose rubble that rolls around and buries young corals, so it rarely recovers on its own: untreated rubble at Komodo stayed near 3% coral for 17 years. Divers pin the rubble under webs of sand-coated steel Reef Stars and tie small corals onto them.',
  sc_return_1: 'Across 100 reef locations worldwide, severe bleaching came back about once every 25 to 30 years in the early 1980s. By 2016 the typical gap was about 6 years. The fastest-growing corals usually need 10 to 15 years to recover, so many reefs are hit again before they have recovered.',
  sciLab_sw_hope: 'Tipping points work both ways: protecting grazing fish before a heatwave keeps a reef on the safe side, and enough grazers can bring a seaweed reef back.',
  help_larvae_1: 'Scientists collected millions of coral larvae on a spawning night and released them under net tents on a damaged Philippine reef. Most died, as wild coral babies do, but about 220 grew into corals big enough to spawn within two to three years, starting a new breeding group.'
};
describe('step 1 rewrites', () => {
  it('keep the facts of the old English and read at about grade 8 or below', () => {
    const bad = {};
    for (const [k, old] of Object.entries(STEP1_OLD)) {
      const now = en(k);
      const probs = now === old ? ['not rewritten'] : pairProblems(old, now);
      if (grade(now) > 8.5) probs.push('grade ' + grade(now).toFixed(1));
      if (probs.length) bad[k] = probs;
    }
    expect(bad).toEqual({});
  });
});

describe('the Simpler words toggle', () => {
  it('is a labelled switch with a visible note, on every page with long reading', async () => {
    const pages = [{ section: 'science' }, { section: 'science', sciTopic: 'help' }, { section: 'model' }, { section: 'model', mdlView: 'rescue' }, { section: 'methods' }, { section: 'methods', w2MethodsPart: 'fish' }];
    for (const seed of pages) {
      const t = await mount(seed, { gradeLevel: '8th Grade' });
      const all = t.host.querySelectorAll('input[data-rl21-switch]');
      expect(all.length, JSON.stringify(seed)).toBe(1);
      const input = all[0], label = input.closest('label');
      expect(input.type).toBe('checkbox');
      expect(input.getAttribute('role')).toBe('switch');
      expect(label && label.textContent.trim()).toBe('Simpler words');
      const note = document.getElementById(input.getAttribute('aria-describedby'));
      expect(note && note.textContent).toBe(en('rl21_simple_note'));
      expect(note.closest('[hidden]')).toBe(null);
      expect(input.closest('[hidden]')).toBe(null);
    }
    const css = SRC.includes("[data-coralreef-root] .rl21-toggle label{display:inline-flex;align-items:center;gap:8px;min-height:44px;");
    expect(css).toBe(true);
  });
  it('shows in an open Species guide profile', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="reef_star"]'));
    const profile = t.host.querySelector('[data-marine-profile="reef_star"]');
    expect(profile).not.toBe(null);
    expect(profile.querySelectorAll('input[data-rl21-switch]').length).toBe(1);
  });
});

describe('changing the switch', () => {
  it('keeps focus on the switch and keeps the page where it was', async () => {
    const cases = [
      [{ section: 'methods', w2MethodsPart: 'fish' }, 'inv_m_intro'],
      [{ section: 'science', sciTopic: 'help' }, 'help_stars_2'],
      [{ section: 'model' }, 'vis_key'],
    ];
    for (const [seed, key] of cases) {
      const t = await mount(seed, { gradeLevel: '8th Grade' });
      const input = sw(t.host);
      expect(has(t.host, en(key)), key + ' full first').toBe(true);
      await React.act(async () => { input.focus(); });
      await click(input);
      expect(document.activeElement, key + ' focus').toBe(input);
      expect(sw(t.host)).toBe(input);
      expect(input.checked).toBe(true);
      expect(has(t.host, en(key + '_simple')), key + ' simple shown').toBe(true);
      expect(has(t.host, en(key)), key + ' full gone').toBe(false);
      const rest = { ...t.data }; delete rest.simpleWords;
      expect(rest).toEqual(seed);
      await click(input);
      expect(document.activeElement).toBe(input);
      expect(has(t.host, en(key))).toBe(true);
    }
  });
  it('keeps the profile open and focus on the switch in the Species guide', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="reef_star"]'));
    const input = t.host.querySelector('[data-marine-profile="reef_star"] input[data-rl21-switch]');
    expect(has(t.host, en('sp_reef_star_fact'))).toBe(true);
    await React.act(async () => { input.focus(); });
    await click(input);
    expect(document.activeElement).toBe(input);
    expect(t.host.querySelector('[data-marine-profile="reef_star"]')).not.toBe(null);
    expect(has(t.host, en('sp_reef_star_fact_simple'))).toBe(true);
    expect(has(t.host, en('sp_reef_star_fact'))).toBe(false);
  });
});
