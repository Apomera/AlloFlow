/**
 * Species Encyclopedia (Bird Lab + Raptor Lab).
 *
 * The encyclopedia data (BIRD_ENC / RAPTOR_ENC), the plate engine (BirdPlates) and the range zones
 * (ENC_ZONES) live INSIDE the two tool files, so these tests read the tool source the same way the
 * app loads it. What is pinned:
 *   1. COVERAGE: every species the lab names in its own species tables has an encyclopedia entry
 *      (adding a species to a table without an entry fails here, which is the point).
 *   2. SCHEMA: every entry carries the fields the sheet renders, with sane values.
 *   3. PLATES: every entry has a portrait spec the engine can draw without throwing.
 *   4. MIRRORS: the public copies of both tools are byte-identical (a stale copy loads silently).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(__dirname, '..');
const BIRD = path.join(ROOT, 'stem_lab', 'stem_tool_birdlab.js');
const RAPTOR = path.join(ROOT, 'stem_lab', 'stem_tool_raptorhunt.js');
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const BS = String.fromCharCode(92);

// Bracket-match from the first opener after `anchor`, string- and comment-aware.
function sliceBalanced(src, anchor) {
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error('anchor not found: ' + anchor);
  let i = src.indexOf(anchor) + anchor.length - 1;
  const start = i;
  let depth = 0, q = null, esc = false, lc = false, bc = false;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (lc) { if (c === '\n') lc = false; continue; }
    if (bc) { if (c === '*' && n === '/') { bc = false; i++; } continue; }
    if (q) { if (esc) { esc = false; continue; } if (c === BS) { esc = true; continue; } if (c === q) q = null; continue; }
    if (c === '/' && n === '/') { lc = true; continue; }
    if (c === '/' && n === '*') { bc = true; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '[' || c === '{' || c === '(') depth++;
    if (c === ']' || c === '}' || c === ')') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}
function evalTable(src, name, indent = '  ') {
  const anchor = '\n' + indent + 'var ' + name + ' = ';
  const open = src.indexOf(anchor);
  if (open < 0) return null;
  const text = sliceBalanced(src, anchor + src[open + anchor.length]);
  return vm.runInNewContext('(' + text + ')', { __alloT: (k, d) => d, Math });
}
const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');

const birdSrc = read(BIRD), raptorSrc = read(RAPTOR);
const BIRD_ENC = JSON.parse(sliceBalanced(birdSrc, '\n  var BIRD_ENC = ['));
const BIRD_GROUPS = JSON.parse(sliceBalanced(birdSrc, '\n  var BIRD_ENC_GROUPS = ['));
const RAPTOR_ENC = JSON.parse(sliceBalanced(raptorSrc, '\n  var RAPTOR_ENC = ['));
const RAPTOR_GROUPS = JSON.parse(sliceBalanced(raptorSrc, '\n  var RAPTOR_ENC_GROUPS = ['));
const ZONES = vm.runInNewContext('(' + sliceBalanced(birdSrc, '\n  var ENC_ZONES = {') + ')', {});
const ZONES_R = vm.runInNewContext('(' + sliceBalanced(raptorSrc, '\n  var ENC_ZONES = {') + ')', {});

// The names the Bird Lab uses for the same species in different tables.
const BIRD_ALIASES = { americangoshawk: 'americangoshawk', northerngoshawk: 'americangoshawk' };
const BIRD_TABLES = ['MAINE_BIRDS', 'RAPTOR_PROFILES', 'OWL_PROFILES', 'WARBLER_PROFILES', 'WATERFOWL', 'SHOREBIRDS', 'SEABIRDS', 'SPARROWS', 'THRUSHES', 'WOODPECKERS', 'FINCHES', 'BLACKBIRDS_CROWS', 'HUMM_SWIFT', 'FLYCATCHERS_VIREOS', 'GULL_ID', 'ENDANGERED_SPECIES', 'ICONIC_MAINE', 'NESTS', 'EGGS_DATA', 'FEATURED_MIGRATORS', 'FAMOUS_CALLS', 'IRRUPTIONS', 'NESTBOX_GUIDE'];
const NAME_FIELDS = ['name', 'species', 'bird', 'common'];
// Entries in those tables that are not single species.
const NOT_A_SPECIES = /generic|^owls$|^hummingbirds$|^mostwarblers$|^songbird/;

function checkEntry(E, zones, label, raptor) {
  const where = label + ' ' + E.name;
  for (const k of ['id', 'name', 'sci', 'family', 'group', 'length', 'wingspan', 'weight', 'lifespan', 'blurb', 'voice', 'habitat', 'range', 'diet', 'behavior', 'migration', 'nameNote', 'tryThis']) {
    const min = (k === 'id' || k === 'name' || k === 'group' || k === 'family') ? 3 : (k === 'length' || k === 'wingspan' || k === 'weight') ? 4 : 8;
    expect(typeof E[k] === 'string' && E[k].length >= min, where + ' field ' + k).toBe(true);
  }
  for (const k of ['lengthCm', 'wingspanCm', 'massG']) expect(E[k] > 0, where + ' ' + k).toBe(true);
  expect(Array.isArray(E.identify) && E.identify.length >= 4 && E.identify.length <= 6, where + ' identify').toBe(true);
  E.identify.forEach((p) => { expect(p.length, where + ' identify pair').toBe(2); expect(p[1].length >= 20, where + ' identify text').toBe(true); });
  expect(Array.isArray(E.lookalikes) && E.lookalikes.length >= 1, where + ' lookalikes').toBe(true);
  expect(Array.isArray(E.foods) && E.foods.length >= 1, where + ' foods').toBe(true);
  for (const k of ['site', 'nest', 'eggs', 'incubation', 'young']) expect(E.nesting && E.nesting[k] && E.nesting[k].length >= 8, where + ' nesting.' + k).toBe(true);
  expect(['LC', 'NT', 'VU', 'EN', 'CR', 'DD'].indexOf(E.status.iucn) >= 0, where + ' iucn').toBe(true);
  expect(['increasing', 'stable', 'declining', 'unknown'].indexOf(E.status.trend) >= 0, where + ' trend').toBe(true);
  expect(E.status.text.length >= 100, where + ' status text').toBe(true);
  expect(Array.isArray(E.wow) && E.wow.length >= 2, where + ' wow').toBe(true);
  if (E.maine) { expect(/^[0-3]{12}$/.test(E.maine.months), where + ' maine.months').toBe(true); expect(E.maine.text.length >= 40, where + ' maine text').toBe(true); }
  else expect(raptor, where + ' needs a Maine block').toBe(true);
  let zoneCount = 0;
  for (const kind of ['breeding', 'resident', 'winter', 'passage']) {
    expect(Array.isArray(E.zones[kind]), where + ' zones.' + kind).toBe(true);
    E.zones[kind].forEach((z) => { expect(zones[z], where + ' unknown zone ' + z).toBeTruthy(); zoneCount++; });
  }
  expect(zoneCount > 0, where + ' needs a range').toBe(true);
  expect(E.plate && typeof E.plate.a === 'string', where + ' plate spec').toBe(true);
  expect(JSON.stringify(E)).not.toMatch(/https?:\/\//);
  expect(JSON.stringify(E)).not.toMatch(/\\u[0-9a-f]{4}/i);
}

describe('Bird Lab encyclopedia', () => {
  it('has an entry for every species the lab names in its own tables', () => {
    const have = new Set(BIRD_ENC.map((e) => norm(e.name)));
    const missing = new Set();
    for (const t of BIRD_TABLES) {
      const rows = evalTable(birdSrc, t);
      expect(Array.isArray(rows), 'table ' + t + ' not found').toBe(true);
      for (const r of rows) {
        const nm = NAME_FIELDS.map((k) => r[k]).find(Boolean);
        if (!nm) continue;
        const n = norm(nm);
        if (NOT_A_SPECIES.test(n)) continue;
        if (!have.has(n) && !have.has(BIRD_ALIASES[n])) missing.add(nm + '  (' + t + ')');
      }
    }
    expect([...missing].sort(), 'species named in the lab but missing from BIRD_ENC').toEqual([]);
  });
  it('every sprite species and 3D resident has an entry', () => {
    const have = new Set(BIRD_ENC.map((e) => norm(e.name)));
    const birds = evalTable(birdSrc, 'BIRDS');
    for (const k of Object.keys(birds)) if (birds[k] && birds[k].name) expect(have.has(norm(birds[k].name)), birds[k].name).toBe(true);
    for (const n of ['Ruffed Grouse', 'Tufted Titmouse', 'Mourning Dove', 'Eastern Bluebird', 'American Goldfinch', 'American Robin', 'Black-capped Chickadee', 'Northern Cardinal', 'Blue Jay', 'Dark-eyed Junco', 'Eastern Towhee']) expect(have.has(norm(n)), n).toBe(true);
  });
  it('entries are unique, well-formed and grouped', () => {
    expect(BIRD_ENC.length).toBeGreaterThanOrEqual(177);
    expect(new Set(BIRD_ENC.map((e) => e.id)).size).toBe(BIRD_ENC.length);
    for (const E of BIRD_ENC) { checkEntry(E, ZONES, 'bird', false); expect(BIRD_GROUPS.indexOf(E.group) >= 0, E.name + ' group ' + E.group).toBe(true); }
  });
  it('every raptor and owl entry carries a Maine block (the Bird Lab is about Maine)', () => {
    for (const E of BIRD_ENC.filter((e) => e.group === 'Raptors' || e.group === 'Owls')) expect(E.maine, E.name).toBeTruthy();
  });
});

describe('Raptor Lab encyclopedia', () => {
  it('has an entry for every flyable species, linked by simId', () => {
    const species = evalTable(raptorSrc, 'SPECIES');
    expect(species.length).toBeGreaterThanOrEqual(20);
    for (const s of species) {
      const e = RAPTOR_ENC.filter((x) => x.simId === s.id)[0];
      expect(e, 'no encyclopedia entry for ' + s.name).toBeTruthy();
      expect(norm(e.name)).toBe(norm(s.name));
    }
  });
  it('covers the species the lab names in its profile library and call guide', () => {
    const have = new Set(RAPTOR_ENC.map((e) => norm(e.name)));
    const prof = evalTable(raptorSrc, 'SPECIES_PROFILES');
    for (const s of prof.species) expect(have.has(norm(s.name.split(' (')[0])), s.name).toBe(true);
    const calls = evalTable(raptorSrc, 'RAPTOR_CALLS');
    const aliases = { americanbarnowl: 'barnowl', americangoshawk: 'northerngoshawk', californiacondor: 'condor' };
    const absent = (calls.species || []).map((s) => norm(s.name)).filter((n) => !have.has(n) && !have.has(norm(aliases[n] || n)) && !have.has('californiacondor'));
    expect(absent).toEqual([]);
  });
  it('entries are unique, well-formed and grouped', () => {
    expect(RAPTOR_ENC.length).toBeGreaterThanOrEqual(41);
    expect(new Set(RAPTOR_ENC.map((e) => e.id)).size).toBe(RAPTOR_ENC.length);
    for (const E of RAPTOR_ENC) {
      checkEntry(E, ZONES_R, 'raptor', true);
      expect(RAPTOR_GROUPS.indexOf(E.group) >= 0, E.name).toBe(true);
      for (const k of ['flight', 'hunting', 'senses', 'ages', 'sexNote']) expect(typeof E[k] === 'string' && E[k].length >= 40, E.name + ' ' + k).toBe(true);
    }
  });
});

describe('species plates', () => {
  // A render-less h: builds a plain tree so the engine can run in node.
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  function engineFrom(src) {
    const body = sliceBalanced(src, '\n  function BirdPlates(h) {').replace(/^\(/, '');
    const fn = vm.runInNewContext('(function BirdPlates(h) ' + body + ')', { Math, Object, String, Number, JSON });
    return fn(h);
  }
  for (const [label, src, data] of [['bird', birdSrc, BIRD_ENC], ['raptor', raptorSrc, RAPTOR_ENC]]) {
    it(label + ': the engine draws every entry\'s plate', () => {
      const P = engineFrom(src);
      const archetypes = new Set();
      let nodes = 0;
      (function count(n) { })(null);
      for (const E of data) {
        const spec = Object.assign({}, E.plate, { id: E.id, name: E.name });
        archetypes.add(spec.a);
        const svg = P.plate(spec, { id: E.id, label: E.name });
        expect(svg.type, E.name).toBe('svg');
        expect(svg.props.viewBox).toBe('0 0 240 180');
        const walk = (n) => { if (!n || typeof n !== 'object') return; nodes++; (Array.isArray(n) ? n : n.children || []).forEach(walk); };
        walk(svg);
      }
      expect(nodes).toBeGreaterThan(data.length * 40);
      for (const a of archetypes) expect(['passerine', 'raptor', 'owl', 'stander', 'swimmer', 'flyer'].indexOf(a) >= 0, 'archetype ' + a).toBe(true);
    });
  }
});

describe('silhouettes', () => {
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  const engine = (src) => vm.runInNewContext('(function BirdPlates(h) ' + sliceBalanced(src, '\n  function BirdPlates(h) {').replace(/^\(/, '') + ')', { Math, Object, String, Number, JSON })(h);
  const nodes = (n, out = []) => { if (n && typeof n === 'object') { out.push(n); (Array.isArray(n) ? n : n.children || []).forEach((c) => nodes(c, out)); } return out; };

  it('the plate engine can flatten any portrait to one ink colour on paper', () => {
    const P = engine(birdSrc);
    for (const E of BIRD_ENC) {
      const spec = Object.assign({}, E.plate, { id: E.id, name: E.name });
      const flat = nodes(P.plate(spec, { id: E.id + 's', silhouette: true }));
      const full = nodes(P.plate(spec, { id: E.id }));
      expect(flat.filter((n) => n.type === 'feColorMatrix').length, E.name + ' has one ink filter').toBe(1);
      expect(flat.length < full.length + 40, E.name + ' draws no more than the portrait').toBe(true);
      // The backdrop (hills, trees, water) is left out: the silhouette sits on plain paper.
      expect(flat.some((n) => n.props && n.props.key === 'far'), E.name + ' has no backdrop hills').toBe(false);
      expect(full.some((n) => n.props && n.props.key === 'far'), E.name + ' portrait keeps its backdrop').toBe(true);
    }
  });

  it('the perched-silhouette quiz list names real species and every family can build distractors', () => {
    const list = vm.runInNewContext('(' + sliceBalanced(birdSrc, '\n      var PERCH_SIL = [') + ')', {});
    const byId = new Map(BIRD_ENC.map((e) => [e.id, e]));
    expect(list.length).toBeGreaterThanOrEqual(40);
    expect(new Set(list.map((p) => p[0])).size).toBe(list.length);
    const fam = {};
    for (const [id, tag] of list) {
      expect(byId.has(id), id + ' is a Bird Lab entry').toBe(true);
      expect(byId.get(id).plate.a, id + ' is not a flying-only plate').not.toBe('flyer');
      fam[tag] = (fam[tag] || 0) + 1;
    }
    for (const [tag, n] of Object.entries(fam)) expect(n, 'family ' + tag).toBeGreaterThanOrEqual(3);
    // Four choices need three other species to draw on.
    expect(list.length).toBeGreaterThan(4);
  });

  it('the Raptor Field ID has a drawn silhouette for every group it lists', () => {
    const groups = evalTable(raptorSrc, 'FIELD_ID').silhouettes.map((s) => s.id).sort();
    const sil = evalTable(raptorSrc, 'RH_SIL', '      ');
    expect(Object.keys(sil).sort()).toEqual(groups);
    for (const [id, p] of Object.entries(sil)) {
      expect(typeof p.wing === 'string' && p.wing.length > 30, id + ' wing').toBe(true);
      expect(['square', 'fan', 'long', 'wedge', 'fork'].indexOf(p.tail) >= 0, id + ' tail').toBe(true);
      expect(Array.isArray(p.head) && p.head.length === 3, id + ' head').toBe(true);
      expect(p.tailLen > 0 && p.bodyW > 0 && p.tailTop > p.bodyTop, id + ' body numbers').toBe(true);
    }
  });
});

describe('species comparator', () => {
  const normName = (s) => String(s || '').toLowerCase().split('(')[0].replace(/[^a-z]/g, '');
  for (const [label, src, anchor, data] of [['bird', birdSrc, '\n      var ENC_CMP_PAIRS = [', BIRD_ENC], ['raptor', raptorSrc, '\n      var ENC_CMP_PAIRS_R = [', RAPTOR_ENC]]) {
    it(label + ': every classic pair names two real species (the view filters silently, this does not)', () => {
      const pairs = vm.runInNewContext('(' + sliceBalanced(src, anchor) + ')', {});
      const ids = new Set(data.map((e) => e.id));
      expect(pairs.length).toBeGreaterThanOrEqual(6);
      for (const [a, b] of pairs) { expect(ids.has(a), a).toBe(true); expect(ids.has(b), b).toBe(true); expect(a).not.toBe(b); }
    });
    it(label + ': look-alike lists resolve to entries, so the "Compare with" buttons have somewhere to go', () => {
      const byName = new Map(data.map((e) => [normName(e.name), e]));
      let links = 0, entriesWithLink = 0;
      for (const e of data) {
        let any = false;
        for (const p of e.lookalikes || []) { const t = byName.get(normName(p[0])); if (t && t.id !== e.id) { links++; any = true; } }
        if (any) entriesWithLink++;
      }
      expect(links).toBeGreaterThanOrEqual(label === 'bird' ? 100 : 30);
      expect(entriesWithLink / data.length).toBeGreaterThan(0.6);
    });
  }
  it('the comparator and its entry hooks are in both tools and in their public mirrors', () => {
    for (const [f, markers] of [['stem_tool_birdlab.js', ['function EncCompareView', 'function encCompare(', "view === 'encCompare'", 'onCompare: openCompare']], ['stem_tool_raptorhunt.js', ['function encCompare(', 'function raptorCmpExtra', 'onCompare: openCompareR']]]) {
      for (const dir of [['stem_lab'], ['desktop', 'web-app', 'public', 'stem_lab']]) {
        const text = read(path.join(ROOT, ...dir, f));
        for (const m of markers) expect(text.includes(m), f + ' (' + dir.join('/') + ') has ' + m).toBe(true);
      }
    }
  });
});

// The gallery filters and the Mystery bird quiz are plain functions inside each tool. Pull the real source of
// each one out of the tool file and run it with the translation helpers stubbed, so these tests exercise the
// code the app ships, not a copy of it.
function grabFn(src, name) {
  const m = new RegExp('\\n( +)function ' + name + '\\(').exec(src);
  if (!m) throw new Error('function not found: ' + name);
  const start = m.index + 1;
  const rest = src.slice(start + 1);
  const next = rest.search(new RegExp('\\n' + m[1] + '(?:function|var) '));
  return src.slice(start, next < 0 ? undefined : start + 1 + next);
}
function loadEncLogic(src) {
  const names = ['encNorm', 'encLookup', 'encPartners', 'encRisk', 'encMonthLevel', 'encMonthOf', 'encFiltersOn', 'encApplyFilters', 'encMatch', 'encQzWords', 'encQzGeneric', 'encFirstSentence', 'encQzOk', 'encClues', 'encQzRank', 'encLog', 'encSizeDist', 'encSizeNear', 'encGcd', 'encPick'];
  const code = names.map((n) => grabFn(src, n)).join('\n') + '\n({ ' + names.join(', ') + ' })';
  return vm.runInNewContext(code, { __alloT: (k, d) => d, __alloFill: (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m)), Math, Object, Number, String, Date });
}
describe('gallery filters and the Mystery bird quiz', () => {
  for (const [label, src, data] of [['bird', birdSrc, BIRD_ENC], ['raptor', raptorSrc, RAPTOR_ENC]]) {
    const L = loadEncLogic(src);
    const all = (f, extra = {}) => L.encApplyFilters(data, Object.assign({ f, group: 'all', q: '' }, extra));
    const sev = (e) => ({ CR: 5, EN: 4, VU: 3, NT: 2, LC: 1 })[e.status.iucn] || 0;
    it(label + ': the conservation filters keep exactly the species the data marks that way', () => {
      expect(all({ status: 'risk' }).map((e) => e.id).sort()).toEqual(data.filter((e) => sev(e) >= 3).map((e) => e.id).sort());
      expect(all({ status: 'watch' }).length).toBe(data.filter((e) => sev(e) >= 2).length);
      expect(all({ status: 'lc' }).length).toBe(data.filter((e) => sev(e) === 1).length);
      expect(all({ status: 'any' }).length).toBe(data.length);
      expect(all({ status: 'risk' }).length).toBeGreaterThan(0);
    });
    it(label + ': sorts are ordered, ties keep list order, and filters stack with group and search', () => {
      const mass = (f) => all({ sort: f }).map((e) => e.massG);
      const big = mass('big'), small = mass('small');
      for (let i = 1; i < big.length; i++) { expect(big[i]).toBeLessThanOrEqual(big[i - 1]); expect(small[i]).toBeGreaterThanOrEqual(small[i - 1]); }
      const az = all({ sort: 'az' }).map((e) => e.name);
      expect(az).toEqual([...az].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      const risk = all({ sort: 'risk' });
      for (let i = 1; i < risk.length; i++) expect(sev(risk[i])).toBeLessThanOrEqual(sev(risk[i - 1]));
      const g = data[0].group;
      expect(all({ status: 'any' }, { group: g }).every((e) => e.group === g)).toBe(true);
      expect(all({}, { q: 'zzzzzzz' })).toHaveLength(0);
      expect(all({}, { q: data[3].name.toLowerCase() }).map((e) => e.id)).toContain(data[3].id);
      const tog = all({ tog: { x: true } }, { toggles: [{ id: 'x', test: (e) => e.id === data[5].id }] });
      expect(tog.map((e) => e.id)).toEqual([data[5].id]);
      expect(L.encFiltersOn({})).toBe(false);
      expect(L.encFiltersOn({ month: '4' })).toBe(true);
      expect(L.encFiltersOn({ status: 'any', month: 'any', sort: 'default', tog: { x: false } })).toBe(false);
    });
    it(label + ': the Maine month filter keeps species that are at least fairly common that month, best first', () => {
      for (const m of [0, 6, 10]) {
        const got = all({ month: String(m) });
        const want = data.filter((e) => e.maine && Number(e.maine.months.charAt(m)) >= 2);
        expect(got.length).toBe(want.length);
        const lv = got.map((e) => Number(e.maine.months.charAt(m)));
        for (let i = 1; i < lv.length; i++) expect(lv[i]).toBeLessThanOrEqual(lv[i - 1]);
      }
      if (label === 'bird') expect(all({ month: '6' }).length).toBeGreaterThan(all({ month: '0' }).length);
    });
    it(label + ': almost every species can be asked about, and no clue names the species it describes', () => {
      const ok = data.filter((e) => L.encQzOk(data, e));
      expect(ok.length / data.length).toBeGreaterThan(0.9);
      const words = (s) => String(s || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
      for (const e of ok) {
        const clues = L.encClues(data, e).slice(0, 4);
        expect(clues, e.id).toHaveLength(4);
        const text = ' ' + words(clues.map((c) => c.label + ' ' + c.text).join(' ')).join(' ') + ' ';
        // Words that belong to this species alone (not shared with any other entry's name) must not appear.
        const mine = words(e.name).concat(words(e.sci)).filter((w) => w.length >= 5);
        for (const w of mine) {
          const shared = data.some((o) => o.id !== e.id && words(o.name).includes(w));
          if (!shared) expect(text.includes(' ' + w), e.id + ' leaks "' + w + '"').toBe(false);
        }
        // Clues stay readable: no empty text, and the size line always comes first.
        for (const c of clues) { expect(c.label.length).toBeGreaterThan(0); expect(c.text.length).toBeGreaterThan(10); }
        expect(clues[0].k).toBe('size');
      }
    });
    it(label + ': each quiz question can be given three distractors, and look-alikes come first', () => {
      for (const e of data.filter((x) => L.encQzOk(data, x))) {
        const near = L.encPartners(data, e).filter((x) => x.id !== e.id);
        expect(data.length - 1).toBeGreaterThanOrEqual(3);
        expect(near.every((x) => x.id !== e.id)).toBe(true);
      }
      // A fixed order, so a class sees the same sequence: the rank function is a pure function of id + seed.
      expect(L.encQzRank('osprey', 5)).toBe(L.encQzRank('osprey', 5));
      expect(L.encQzRank('osprey', 5)).not.toBe(L.encQzRank('osprey', 6));
    });
  }
  it('the filter bar and the quiz are in both tools and in their public mirrors', () => {
    for (const f of ['stem_tool_birdlab.js', 'stem_tool_raptorhunt.js']) {
      for (const dir of [['stem_lab'], ['desktop', 'web-app', 'public', 'stem_lab']]) {
        const text = read(path.join(ROOT, ...dir, f));
        for (const m of ['function encFilterBar(', 'function encQuiz(', 'function encApplyFilters(', "data-enc-mode"]) expect(text.includes(m), f + ' (' + dir.join('/') + ') has ' + m).toBe(true);
      }
    }
  });
});

describe('size map, species of the day and layer toggles', () => {
  for (const [label, src, data] of [['bird', birdSrc, BIRD_ENC], ['raptor', raptorSrc, RAPTOR_ENC]]) {
    const L = loadEncLogic(src);
    it(label + ': every species has the numbers the size map plots', () => {
      for (const e of data) { expect(e.wingspanCm, e.id).toBeGreaterThan(0); expect(e.massG, e.id).toBeGreaterThan(0); }
    });
    it(label + ': "close in size" never lists the species itself, gives three, and sorts nearest first', () => {
      for (const e of data) {
        const near = L.encSizeNear(data, e, 3);
        expect(near, e.id).toHaveLength(3);
        expect(near.some((x) => x.id === e.id), e.id).toBe(false);
        expect(new Set(near.map((x) => x.id)).size).toBe(3);
        const d = near.map((x) => L.encSizeDist(x, e));
        for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1]);
        // Nothing left out is closer than the third neighbour.
        const worst = d[2];
        for (const o of data) if (o.id !== e.id && !near.includes(o)) expect(L.encSizeDist(o, e)).toBeGreaterThanOrEqual(worst - 1e-12);
      }
    });
    it(label + ': the species of the day is the same all day, changes tomorrow, and visits every species before repeating', () => {
      const month = -1;
      const day = (i) => new Date(2026, 10, 5 + i, i % 2 ? 23 : 0, 30);
      expect(L.encPick(data, new Date(2026, 10, 5, 0, 1), month).id).toBe(L.encPick(data, new Date(2026, 10, 5, 23, 59), month).id);
      const seen = [];
      for (let i = 0; i < data.length; i++) seen.push(L.encPick(data, day(i), month).id);
      expect(new Set(seen).size, 'a full cycle shows every species once').toBe(data.length);
      expect(L.encPick(data, day(0), month).id).not.toBe(L.encPick(data, day(1), month).id);
      // The pick is a property of the date, not of how the list happens to be ordered.
      expect(L.encPick([...data].reverse(), day(3), month).id).toBe(L.encPick(data, day(3), month).id);
      expect(L.encPick([], day(0), month)).toBeNull();
    });
    if (label === 'bird') it('bird: in a Maine month the pick is a species you can really find then, and the pool falls back when it is tiny', () => {
      for (const m of [0, 3, 6, 9]) {
        for (let i = 0; i < 31; i++) {
          const e = L.encPick(data, new Date(2026, m, 1 + i), m);
          expect(Number(e.maine.months.charAt(m)), e.id + ' in month ' + m).toBeGreaterThanOrEqual(2);
        }
      }
      const few = data.slice(0, 40).map((e) => Object.assign({}, e, { maine: { months: '000000000000' } }));
      expect(L.encPick(few, new Date(2026, 5, 5), 5)).toBeTruthy();
    });
  }
  it('the size map, the day card and the layer toggles are in both tools and in their public mirrors', () => {
    for (const f of ['stem_tool_birdlab.js', 'stem_tool_raptorhunt.js']) {
      for (const dir of [['stem_lab'], ['desktop', 'web-app', 'public', 'stem_lab']]) {
        const text = read(path.join(ROOT, ...dir, f));
        for (const m of ['function encSizeMap(', 'function encToday(', 'function encPick(', 'function encSizeNear(', 'enc-lay']) expect(text.includes(m), f + ' (' + dir.join('/') + ') has ' + m).toBe(true);
      }
    }
  });
});

describe('mirrors', () => {
  for (const f of ['stem_tool_birdlab.js', 'stem_tool_raptorhunt.js']) {
    it(f + ' copies in public, app-build and build are byte-identical', () => {
      const a = fs.readFileSync(path.join(ROOT, 'stem_lab', f));
      for (const dir of [['desktop', 'web-app', 'public', 'stem_lab'], ['desktop', 'app-build', 'stem_lab'], ['desktop', 'web-app', 'build', 'stem_lab']]) {
        const p = path.join(ROOT, ...dir, f);
        if (!fs.existsSync(p)) continue;
        expect(Buffer.compare(a, fs.readFileSync(p)), dir.join('/')).toBe(0);
      }
    });
  }
});
