// Watershed fact fixes, 2026-11-24 (Water Cycle > Watershed Steward). Field Journeys copied this watershed text from
// Water Cycle, and its accuracy audit found wrong facts (Penobscot dam years swapped, Maine shoreland distances
// reversed, farms called the "dominant land use" in mostly forested Maine, eels said to swim upriver to spawn) plus
// unsourced numbers and hints that promised one action was enough. This pins the same fixes in Water Cycle, and checks
// every model-describing sentence by RUNNING Water Cycle's own steward functions (extracted from the tool file).
// Fail-first: WATERCYCLE_TOOL_FILE=C:/tmp/sports_labs_1123/watercycle/start.js npx vitest run <this file>
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';

const FILE = process.env.WATERCYCLE_TOOL_FILE || 'stem_lab/stem_tool_watercycle.js';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8').replace(/\r\n/g, '\n');
// Student-facing code only: whole-line comments quote the old claims on purpose.
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

const FUNCTIONS = ['wcWatershedCopy', 'localizeWatershedComponents', 'wcStewardCopy', 'applyStewardCopy',
  'defaultStewardState', 'watershedComponents', 'getWatershedComponent', 'stewardRng', 'stewardClamp',
  'startStewardCampaign', 'applyStewardTech', 'endStewardYear', 'advanceFromStewardReview',
  'stewardCoachingTip', 'stewardYearDebrief', 'watershedArtifact'];
const VARIABLES = ['MAINE_WATERSHED_COMPONENTS', 'STEWARD_TECHNIQUES', 'STEWARD_EVENTS', '_wcById',
  'STEWARD_FEEDBACK_RULES', 'STEWARD_CASCADE_HINTS', 'STEWARD_DIFFICULTIES', '_wcT', '_wcLocalizedCache', '_wcLocalizedFor'];

function walk(node, visit) {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== 'object') continue;
    if (typeof n.type === 'string') visit(n);
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) stack.push(...v);
      else if (v && typeof v === 'object') stack.push(v);
    }
  }
}

// Same bridge shape as dev-tools/campaign-adventure-pilot/build.cjs extractWatershed(), but for any file and with the
// coaching and debrief helpers included.
function buildRuntime(text) {
  const found = new Map();
  walk(parse(text, { ecmaVersion: 'latest' }), (n) => {
    if (n.type === 'FunctionDeclaration' && FUNCTIONS.includes(n.id.name)) {
      if (found.has(n.id.name)) throw new Error('ambiguous ' + n.id.name);
      found.set(n.id.name, { start: n.start, text: text.slice(n.start, n.end) });
    } else if (n.type === 'VariableDeclarator' && n.id && VARIABLES.includes(n.id.name)) {
      if (found.has(n.id.name)) throw new Error('ambiguous ' + n.id.name);
      found.set(n.id.name, { start: n.start, text: 'var ' + text.slice(n.start, n.end) + ';' });
    }
  });
  for (const name of FUNCTIONS.concat(VARIABLES)) if (!found.has(name)) throw new Error('missing ' + name);
  const body = [...found.values()].sort((a, b) => a.start - b.start).map((x) => x.text).join('\n\n');
  const src = [
    '(function () {',
    'var window = { StemLab: { findById: function (items, id) { return items.find(function (it) { return it.id === id; }); } } };',
    'var t = function (key, fallback) { return fallback == null ? key : fallback; };',
    'var addToast = null, announceToSR = null, awardStemXP = null;',
    'var setTimeout = function () {}, checkWaterCycleChallenges = function () {};',
    'var steward, d = {};',
    'var setSteward = function (patch) { steward = Object.assign({}, steward, patch); };',
    'var upd = function (k, v) { d[k] = v; };',
    body,
    'applyStewardCopy(t);',
    'var copy = function (v) { return JSON.parse(JSON.stringify(v)); };',
    'return {',
    '  components: copy(watershedComponents()), techniques: copy(STEWARD_TECHNIQUES), hints: STEWARD_CASCADE_HINTS,',
    '  rules: STEWARD_FEEDBACK_RULES, events: STEWARD_EVENTS,',
    '  start: function (o) { steward = defaultStewardState(); startStewardCampaign(o); return copy(steward); },',
    '  apply: function (s, tech, target) { steward = copy(s); applyStewardTech(tech, target); return copy(steward); },',
    '  endYear: function (s) { steward = copy(s); endStewardYear(); return copy(steward); },',
    '  cont: function (s) { steward = copy(s); advanceFromStewardReview(); return copy(steward); },',
    '  tip: function (s) { steward = copy(s); return stewardCoachingTip(); },',
    '  debrief: function (s) { steward = copy(s); return stewardYearDebrief(); },',
    '};',
    '})()',
  ].join('\n');
  return vm.runInNewContext(src, {});
}

let rt;
beforeAll(() => { rt = buildRuntime(SOURCE); });

const comp = (id) => rt.components.find((c) => c.id === id);
const tech = (id) => rt.techniques.find((t) => t.id === id);
const q = (s, id, field = 'quality') => s.components.find((c) => c.id === id)[field];
function seedFor(eventId, difficulty = 'coordinator') {
  for (let i = 0; i < 800; i++) {
    const seed = 'WC-AUDIT-' + i;
    if (rt.endYear(rt.start({ seed, difficulty })).lastEvent.id === eventId) return seed;
  }
  throw new Error('no seed for ' + eventId);
}

describe('facts the old text got wrong or could not source are gone', () => {
  it('no longer shows swapped dam years, reversed shoreland distances or unsourced numbers', () => {
    for (const bad of [
      'Veazie 2012', 'Great Works 2013', 'removed Veazie Dam in 2012', '75 feet around great ponds',
      'dominant land use in central Maine', 'cut runoff by 50-80%', '50 to 80 percent', 'over 1000-fold',
      'single most cost-effective', 'flowed downhill into the headwaters', '2023 Maine Climate Action Plan',
      '(one riparian buffer planting)', 'would tip it past 60',
      'documented anadromous', 'roughly 7,500 farms', 'up to 10 acres', 'under 100,000 by 1900',
      'Native brook trout, native eastern brook trout', 'single highest-impact', 'eels, sturgeon',
      'Most successful Maine projects', 'dominant pressure on this watershed', 'Penobscot Nation led',
      'the backlash is real',
    ]) expect(CODE.includes(bad), bad).toBe(false); // boolean: a failing toContain on a 3.8 MB string dumps it all
  });

  it('names the dam removals with the right years, in order', () => {
    const desc = comp('riverMainstem').desc;
    expect(desc).toContain('Edwards Dam (Kennebec, 1999)');
    expect(desc).toContain('Fort Halifax Dam (Sebasticook, 2008)');
    expect(desc).toContain('Great Works Dam (Penobscot, 2012)');
    expect(desc).toContain('Veazie Dam (Penobscot, 2013)');
    expect(desc).not.toMatch(/\beels?\b/i);
    expect(comp('riverMainstem').deepDive.casework).toContain('Great Works Dam (2012) and Veazie Dam (2013)');
    expect(comp('riverMainstem').deepDive.modernContext).toMatch(/endangered since 2000/);
    expect(comp('riverMainstem').deepDive.modernContext).toMatch(/about 1,200 adults/);
  });

  it('states the shoreland zone the way Maine law does (250 ft ponds and rivers, 75 ft streams)', () => {
    const text = comp('forestBuffer').deepDive.casework;
    expect(text).toMatch(/250 feet of great ponds, rivers and tidal waters/);
    expect(text).toMatch(/75 feet of many streams/);
  });

  it('says Maine is mostly forest and uses the 2022 farm census', () => {
    expect(comp('agriculturalWatershed').desc).not.toMatch(/dominant/);
    expect(comp('agriculturalWatershed').deepDive.casework).toMatch(/2022 Census of Agriculture counted about 7,000 farms/);
    expect(comp('agriculturalWatershed').deepDive.casework).toMatch(/Most of Maine is forest/);
  });

  it('every changed string has a new key, and the extractor invariants still hold', () => {
    for (const key of ['ws_riverMainstem_desc_v2', 'ws_forestBuffer_casework_v2', 'ws_agriculturalWatershed_desc_v2',
      'ws_headwaterStreams_desc_v2', 'sw_ev_salmonReturn_desc_v3', 'sw_ev_majorFlood_desc_v2', 'sw_fb_runRestoration_msg_v2',
      'sw_hint_bufferFeedsHeadwaters_near_v2', 'sw_hint_agCleansUp_near_v2', 'sw_tech_easement_desc_v2']) {
      expect(CODE.includes("t('stem.watercycle." + key + "', "), "t('stem.watercycle." + key + "', ").toBe(true);
    }
    const copy = SOURCE.slice(SOURCE.indexOf('function wcWatershedCopy('), SOURCE.indexOf('function localizeWatershedComponents('));
    expect((copy.match(/t\('stem\.watercycle\.ws_/g) || []).length).toBe(30);
    const steward = SOURCE.slice(SOURCE.indexOf('function wcStewardCopy('), SOURCE.indexOf('function applyStewardCopy('));
    expect((steward.match(/t\('stem\.watercycle\.sw_/g) || []).length).toBe(48);
    expect((steward.match(/\{v\}/g) || []).length).toBe(4);
  });

  it('the AI coach prompt no longer overstates who led the Penobscot project and has the right years', () => {
    expect(CODE.includes('the Penobscot Indian Nation was one of the partners in the Penobscot River Restoration Project'), 'the Penobscot Indian Nation was one of the partners in the Penobscot River Restoration Project').toBe(true);
    expect(CODE.includes('Great Works Dam 2012 and Veazie Dam 2013 (Penobscot)'), 'Great Works Dam 2012 and Veazie Dam 2013 (Penobscot)').toBe(true);
  });

  it('the setup cards show the corrected desc, not the registered pre-audit text under a computed "<id>_desc" key', () => {
    // ui_strings.js registers stem.watercycle.riverMainstem_desc etc. with the OLD wording (Veazie 2012, "dominant land
    // use"), and the setup screen used to look that key up, so the registered value would have won over the fix.
    expect(CODE.includes("__alloT('stem.watercycle.' + (c.id) + '_desc', c.desc)"), 'computed desc key').toBe(false);
  });

  it('labels the made-up debrief conversions (stream miles, acres, farms) as game scale', () => {
    expect(CODE.includes("art.text + ' (game scale)'"), "art.text + ' (game scale)'").toBe(true);
  });
});

describe('event sentences agree with what the model does (run, not read)', () => {
  it('the sewage overflow hits both the mainstem and the town streams, and the text names both', () => {
    const s0 = rt.start({ seed: seedFor('sewageRelease'), difficulty: 'coordinator' });
    const s1 = rt.endYear(s0);
    expect(q(s1, 'riverMainstem')).toBeLessThan(q(s0, 'riverMainstem'));
    expect(q(s1, 'suburbanEdges')).toBeLessThan(q(s0, 'suburbanEdges'));
    expect(s1.lastEvent.desc).toMatch(/Mainstem and town-stream quality drop/);
  });

  it('the flood only cuts buffers under 65 quality, which the text now says', () => {
    const s0 = rt.start({ seed: seedFor('majorFlood'), difficulty: 'coordinator' });
    const weak = rt.endYear(s0);
    expect(q(weak, 'forestBuffer')).toBeLessThan(q(s0, 'forestBuffer'));
    let strong = rt.apply(s0, 'bufferPlant', 'forestBuffer');
    strong = rt.apply(strong, 'bufferPlant', 'forestBuffer'); // 58 -> 74
    expect(q(rt.endYear(strong), 'forestBuffer')).toBeGreaterThanOrEqual(q(strong, 'forestBuffer'));
    expect(weak.lastEvent.desc).toMatch(/under 65 quality in this game/);
  });

  it('the drought lowers headwaters and mainstem, as the text says', () => {
    const s0 = rt.start({ seed: seedFor('drought'), difficulty: 'coordinator' });
    const s1 = rt.endYear(s0);
    expect(q(s1, 'headwaterStreams')).toBeLessThan(q(s0, 'headwaterStreams'));
    expect(q(s1, 'riverMainstem')).toBeLessThan(q(s0, 'riverMainstem'));
    expect(s1.lastEvent.desc).toMatch(/headwater and mainstem quality dropped/);
  });

  it('the farm sale lowers farm and suburban quality without resetting everything', () => {
    const s0 = rt.start({ seed: seedFor('farmSold'), difficulty: 'coordinator' });
    const helped = rt.apply(s0, 'bmpOutreach', 'agriculturalWatershed');
    const s1 = rt.endYear(helped);
    expect(q(s1, 'agriculturalWatershed')).toBeLessThan(q(helped, 'agriculturalWatershed'));
    expect(q(s1, 'agriculturalWatershed')).toBeGreaterThan(q(s0, 'agriculturalWatershed')); // part of the BMP gain stays
    expect(q(s1, 'suburbanEdges')).toBeLessThan(q(helped, 'suburbanEdges'));
    expect(s1.lastEvent.desc).not.toMatch(/reset/);
  });

  it('the sea-run fish event raises support more after a dam removal OR fish passage, as the text says', () => {
    const seed = seedFor('salmonReturn');
    const s0 = rt.start({ seed, difficulty: 'coordinator' });
    const gain = (before, after) => q(after, 'headwaterStreams', 'support') - q(before, 'headwaterStreams', 'support');
    const plain = gain(s0, rt.endYear(s0));
    for (const t of ['fishPassage', 'damRemoval']) {
      const opened = rt.apply(s0, t, 'riverMainstem');
      expect(gain(opened, rt.endYear(opened)), t).toBeGreaterThan(plain);
    }
    const desc = rt.endYear(s0).lastEvent.desc;
    expect(desc).toMatch(/endangered/);
    expect(desc).toMatch(/about 1,200 adults/);
    expect(desc).toMatch(/support rises more if you already removed a dam or built fish passage/);
    expect(rt.endYear(s0).lastEvent.name).toBe('Sea-run fish return');
  });

  it('the grant really adds 5 hours next year', () => {
    const s1 = rt.endYear(rt.start({ seed: seedFor('fundingBump'), difficulty: 'coordinator' }));
    expect(rt.cont(s1).hoursLeft).toBe(s1.hoursPerYear + 5);
    expect(s1.lastEvent.desc).toContain('+5');
  });
});

describe('coaching numbers come from the model', () => {
  it('a near-hint can show when one action is NOT enough, so hints state the step size instead of promising one move', () => {
    const buffer = rt.hints.find((h) => h.id === 'bufferFeedsHeadwaters');
    const ag = rt.hints.find((h) => h.id === 'agCleansUp');
    // stewardYearDebrief shows a near-hint for values from threshold-8 up to the threshold; the rule needs MORE than it.
    expect(buffer.threshold - 8 + tech('bufferPlant').effects.quality).toBeLessThanOrEqual(buffer.threshold);
    expect(ag.threshold - 8 + tech('bmpOutreach').effects.quality).toBeLessThanOrEqual(ag.threshold);
    // Run it: buffers at 62 plus one planting land on 70, and the rule does not fire.
    let s = rt.start({ seed: 'near-edge' });
    s.components.find((c) => c.id === 'forestBuffer').quality = buffer.threshold - 8;
    s = rt.apply(s, 'bufferPlant', 'forestBuffer');
    const bufferRule = rt.rules.find((r) => r.id === 'bufferFeedsHeadwaters');
    expect(bufferRule.when(s.components)).toBe(false);
  });

  it('keeps the Beaver Dam Analog promise, because in Water Cycle’s model one BDA IS enough from any near value', () => {
    // Field Journeys reworded this hint too, but Water Cycle only shows it from threshold-8, and 52 + 11 = 63 > 60.
    const wet = rt.hints.find((h) => h.id === 'beaverHelpsFloodplain');
    const rule = rt.rules.find((r) => r.id === 'beaverHelpsFloodplain');
    for (let v = wet.threshold - 8; v < wet.threshold; v++) {
      let s = rt.start({ seed: 'bda-' + v });
      s.components.find((c) => c.id === 'floodplainWetlands').quality = v;
      s = rt.apply(s, 'beaverDamAnalog', 'floodplainWetlands');
      expect(rule.when(s.components), 'wetlands at ' + v).toBe(true);
    }
    expect(CODE.includes('A single Beaver Dam Analog would push past 60'), 'A single Beaver Dam Analog would push past 60').toBe(true);
  });

  it('the near-hint the debrief actually shows quotes the real step size', () => {
    let s = rt.start({ seed: 'near-text' });
    s.components.find((c) => c.id === 'forestBuffer').quality = 64;
    s.components.find((c) => c.id === 'agriculturalWatershed').quality = 55;
    s.components.find((c) => c.id === 'floodplainWetlands').quality = 55;
    s.phase = 'review';
    s.yearLog = [{ year: 1, actions: [], cascades: [] }];
    const near = rt.debrief(s).near.join(' | ');
    expect(near).toContain('Forest-buffer quality is at 64. Each riparian buffer planting adds ' + tech('bufferPlant').effects.quality + '.');
    expect(near).toContain('Agricultural quality is 55. BMP outreach is cheap (' + tech('bmpOutreach').hours + ' hours) and adds ' + tech('bmpOutreach').effects.quality + ' each time.');
    expect(near).toContain('Floodplain wetlands sit at 55.');
  });

  it('the year-1 tip gives the real number of BMP rounds needed and no longer calls farms the dominant pressure', () => {
    let s = rt.start({ seed: 'tip' });
    const tip = rt.tip(s);
    let rounds = 0;
    const ag = rt.hints.find((h) => h.id === 'agCleansUp');
    while (q(s, 'agriculturalWatershed') <= ag.threshold) { s.hoursLeft = 99; s = rt.apply(s, 'bmpOutreach', 'agriculturalWatershed'); rounds++; }
    expect(rounds).toBeGreaterThan(1); // one round is not enough from the start
    expect(tip.text).toContain('About ' + rounds + ' rounds would lift farm quality past ' + ag.threshold);
    expect(tip.text).toContain('BMP outreach costs ' + tech('bmpOutreach').hours + ' hours and adds ' + tech('bmpOutreach').effects.quality);
    // The debrief's own weakest-link rule does not pick farms at the start, so "dominant" was not supported.
    const start = rt.start({ seed: 'tip' });
    start.phase = 'review'; start.yearLog = [{ year: 1, actions: [], cascades: [] }];
    expect(rt.debrief(start).weakest.c.id).not.toBe('agriculturalWatershed');
  });

  it('the connectivity tip quotes dam removal costs from the model and no wrong year', () => {
    const s = rt.start({ seed: 'tip2' });
    s.components.find((c) => c.id === 'agriculturalWatershed').quality = 55;
    const tip = rt.tip(s);
    const dam = tech('damRemoval');
    expect(tip.text).toContain('(+' + dam.effects.connectivity + ')');
    expect(tip.text).toContain(dam.hours + ' hours and ' + -dam.effects.support + ' community support');
    expect(tip.text).not.toMatch(/Veazie|Edwards/);
  });
});
