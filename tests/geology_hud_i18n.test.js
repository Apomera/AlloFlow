// Geology Explorer walk-mode HUD in the student's language. The engine writes the status badge,
// the reticle label, the drill readout and the hover card straight into the DOM, outside React,
// so for a long time they were English in every language. The text now comes from pure builders
// that take the host's translator. These tests pin three things:
//   1. with no translator the English is byte-for-byte what it was (nothing else changes);
//   2. with a pseudo-locale that rewrites every translatable letter, NO English letter survives
//      (so a string that skips the translator shows up as ASCII in the output);
//   3. the engine's DOM writers call the builders with the host's translator, and hold no prose.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const acorn = require('acorn');
const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const sourcePath = process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

let P;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(source)();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
beforeEach(() => { P.setScene('crust'); P.setGrid('standard'); });

// Every letter outside a {placeholder} becomes 'ẍ': translated text has no ASCII letters left.
const fill = (s, vars) => { let out = s; for (const [k, v] of Object.entries(vars || {})) out = out.split('{' + k + '}').join(String(v)); return out; };
const pseudo = (k, fb, vars) => fill(String(fb).replace(/\{[a-z_0-9]+\}|[A-Za-z]/gi, (m) => (m.length > 1 ? m : 'ẍ')), vars);
const keyed = (k) => k;                                    // returns the key: proves a literal key per string
// ASCII letters left once the units that stay as symbols are removed. Data values are passed in as #n#.
const leak = (s) => String(s).replace(/km|°C/g, '').match(/[A-Za-z]+/g) || [];

describe('HUD text with no translator is the English it always was', () => {
  it('status badge, every state', () => {
    const here = { depthKm: 3.2, tempC: 120 };
    expect(P.fpStatusLine({ state: 'grounded', onGround: true, here })).toBe('Grounded · 3.2 km · ≈ 120 °C');
    expect(P.fpStatusLine({ state: 'grounded', onGround: true, here: null })).toBe('Grounded');
    expect(P.fpStatusLine({ state: 'grounded', onGround: false })).toBe('Falling');
    expect(P.fpStatusLine({ state: 'grounded', fly: true })).toBe('Free flight');
    expect(P.fpStatusLine({ state: 'mining', tool: 'pick', profile: 'Layered', pct: 40 })).toBe('Mining layered rock · 40%');
    expect(P.fpStatusLine({ state: 'mining', tool: 'drill', profile: 'Crystalline', pct: 130 })).toBe('Drilling crystalline rock · 100%');
    expect(P.fpStatusLine({ state: 'hazard', here: { depthKm: 9, tempC: 900 } })).toBe('Heat warning · molten rock within one block · ≈ 900 °C here');
    expect(P.fpStatusLine({ state: 'hazard', here: null })).toBe('Heat warning · molten rock within one block');
    expect(P.fpStatusLine({ state: 'overheated' })).toBe('Drill overheated · cooling down');
    expect(P.fpStatusLine({ state: 'climbing' })).toBe('Climbing · hold Space and forward');
    expect(P.fpStatusLine({ state: 'swimming' })).toBe('Swimming · Space rises');
    expect(P.fpStatusLine({ state: 'blocked' })).toBe('Blocked · dig or jump to clear a path');
  });

  it('reticle label, every branch', () => {
    expect(P.fpTargetLabelText({ prop: { label: 'Boulder', stand: true } })).toBe('Boulder · surface relief, not dug here: dig the ground beside it');
    expect(P.fpTargetLabelText({ prop: { label: 'Boulder' } })).toBe('Boulder · dig the ground beside it');
    expect(P.fpTargetLabelText({})).toBe('Aim at an exposed block');
    expect(P.fpTargetLabelText({ specimen: { icon: '🐚', name: 'Brachiopod' } })).toBe('🐚 Brachiopod in the wall · dig it free');
    expect(P.fpTargetLabelText({ specimen: { name: 'Garnet' } })).toBe('💎 Garnet in the wall · dig it free');
    expect(P.fpTargetLabelText({ material: 'Sandstone', profile: 'Layered', mineable: true, tool: 'pick' })).toBe('Sandstone · Layered · click or X to dig');
    expect(P.fpTargetLabelText({ material: 'Sandstone', profile: 'Layered', mineable: true, tool: 'drill' })).toBe('Sandstone · Layered · hold X to drill');
    expect(P.fpTargetLabelText({ material: 'Magma', profile: 'Molten hazard', mineable: false })).toBe('Magma · Molten hazard · cannot excavate');
    expect(P.fpTargetLabelText({ material: 'Sandstone', relief: 'Mesa', profile: 'Layered', mineable: true, tool: 'pick', sign: 'a thin white vein shows here' }))
      .toBe('Mesa · Sandstone · Layered · click or X to dig · 🔍 a thin white vein shows here');
  });

  it('drill readout, hover card, signs, directions', () => {
    expect(P.fpDrillReadoutText(0.456, false)).toBe('46% heat');
    expect(P.fpDrillReadoutText(1, true)).toBe('Cooling…');
    expect(P.fpHoverMetaText(2.4, 300)).toBe('Depth ≈ 2.4 km · ≈ 300 °C');
    expect(P.specimenSign('quartzVein')).toBe('a thin white vein shows here');
    expect(P.specimenSign('fossil-trilobite')).toBe('fossil traces show on this face');
    expect(P.specimenSign('somethingNew')).toBe('something glints inside');
    expect(P.fpDirectionText('northeast')).toBe('northeast');
    expect(P.fpVerticalText('below you')).toBe('below you');
    expect(P.fpBlocksText(1)).toBe('block');
    expect(P.fpBlocksText(4)).toBe('blocks');
    expect(P.rockTypeText('Igneous (intrusive)')).toBe('Igneous (intrusive)');
  });
});

describe('with a translator, no English survives', () => {
  it('status badge, every state', () => {
    const here = { depthKm: 3.2, tempC: 120 };
    const states = [
      { state: 'grounded', onGround: true, here }, { state: 'grounded', onGround: false }, { state: 'grounded', fly: true },
      { state: 'hazard', here }, { state: 'hazard' }, { state: 'overheated' }, { state: 'climbing' }, { state: 'swimming' }, { state: 'blocked' }
    ];
    for (const profile of ['Loose', 'Layered', 'Crystalline', 'Hard', 'Dense']) for (const tool of ['pick', 'drill']) states.push({ state: 'mining', tool, profile, pct: 55 });
    for (const s of states) expect(leak(P.fpStatusLine(s, pseudo)), JSON.stringify(s)).toEqual([]);
  });

  it('reticle label, every branch (data names passed in as #n#)', () => {
    const cases = [
      { prop: { label: '#1#', stand: true } }, { prop: { label: '#1#' } }, {}, { specimen: { icon: '*', name: '#2#' } },
      { material: '#3#', relief: '#4#', profile: 'Layered', mineable: true, tool: 'pick', sign: P.specimenSign('quartzVein', pseudo) },
      { material: '#3#', profile: 'Dense', mineable: true, tool: 'drill' }, { material: '#3#', profile: 'Molten hazard', mineable: false }, { material: '#3#', profile: 'Fluid', mineable: false }
    ];
    for (const c of cases) expect(leak(P.fpTargetLabelText(c, pseudo)), JSON.stringify(c)).toEqual([]);
    expect(leak(P.fpDrillReadoutText(0.3, false, pseudo))).toEqual([]);
    expect(leak(P.fpDrillReadoutText(1, true, pseudo))).toEqual([]);
    expect(leak(P.fpHoverMetaText(2, 50, pseudo))).toEqual([]);
    expect(leak(P.fpProfileReasonText('Fluid', pseudo))).toEqual([]);
    expect(leak(P.fpProfileReasonText('Molten hazard', pseudo))).toEqual([]);
  });

  it('every token the engine produces has its own key (none falls through to English)', () => {
    // Profiles and material types: every one any scene can produce.
    const profiles = new Set(), types = new Set();
    for (const id of P.scenes()) for (const m of P.sceneMaterials(id)) {
      profiles.add(P.fpMiningProfile(m.key, m.type).label);
      if (m.type) types.add(m.type);
    }
    expect(profiles.size).toBeGreaterThan(4);
    for (const label of profiles) expect(P.fpProfileText(label, keyed).tag, label).toMatch(/^stem\.geology\.hud\./);
    for (const type of types) expect(P.rockTypeText(type, keyed), type).toMatch(/^stem\.geology\.rock_type\./);
    // Directions: the 8 compass words of the tilt reading and the 4 of the survey reading.
    for (let b = 0; b < 360; b += 45) expect(P.fpDirectionText(P.fpCompassWord(b), keyed)).toMatch(/^stem\.geology\.dir\./);
    for (const w of ['north', 'south', 'east', 'west']) expect(P.fpDirectionText(w, keyed)).toMatch(/^stem\.geology\.dir\./);
    for (const v of ['above you', 'below you', 'near your level']) expect(P.fpVerticalText(v, keyed)).toMatch(/^stem\.geology\.vertical\./);
    // Signs: every kind the table knows, plus the fossil and unknown fallbacks.
    for (const kind of ['skarnGarnet', 'quartzVein', 'schistGarnet', 'summitFossil', 'amethystPoint', 'agateSlice', 'diamond', 'mantleOlivine', 'wedgeOlivine', 'islandOlivine', 'bridgmanite', 'eclogiteGarnet', 'pumice', 'sulfideChimney', 'basaltRecord', 'oozeMicrofossils', 'reefCoral', 'fossil-ammonite', 'unknownKind']) {
      expect(P.specimenSign(kind, keyed), kind).toMatch(/^stem\.geology\.sign\./);
    }
  });

  it('every builder key is registered in ui_strings.js with the same English', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
    const seen = new Map();
    const record = (k, fb) => { seen.set(k, fb); return fb; };
    const here = { depthKm: 1, tempC: 2 };
    for (const s of [{ state: 'grounded', onGround: true, here }, { state: 'grounded', onGround: false }, { state: 'grounded', fly: true }, { state: 'hazard', here }, { state: 'hazard' }, { state: 'overheated' }, { state: 'climbing' }, { state: 'swimming' }, { state: 'blocked' }, { state: 'mining', tool: 'drill', profile: 'Hard', pct: 1 }, { state: 'mining', tool: 'pick', profile: 'Hard', pct: 1 }]) P.fpStatusLine(s, record);
    for (const c of [{ prop: { label: 'x', stand: true } }, { prop: { label: 'x' } }, {}, { specimen: { name: 'x' } }, { material: 'x', profile: 'Loose', mineable: true, tool: 'pick' }, { material: 'x', profile: 'Loose', mineable: true, tool: 'drill' }, { material: 'x', profile: 'Fluid', mineable: false }]) P.fpTargetLabelText(c, record);
    P.fpDrillReadoutText(0, false, record); P.fpDrillReadoutText(0, true, record); P.fpHoverMetaText(1, 2, record);
    P.fpProfileReasonText('Fluid', record); P.fpProfileReasonText('Molten hazard', record);
    for (const l of ['Loose', 'Layered', 'Crystalline', 'Hard', 'Dense', 'Fluid', 'Molten hazard']) P.fpProfileText(l, record);
    P.fpDirectionText('north', record); P.fpVerticalText('above you', record); P.fpBlocksText(1, record); P.fpBlocksText(2, record);
    P.rockTypeText('Mantle', record); P.specimenSign('quartzVein', record);
    expect(seen.size).toBeGreaterThan(60);
    const get = (k) => k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), reg);
    const bad = [...seen].filter(([k, en]) => get(k) !== en).map(([k, en]) => k + ' (code "' + en + '", registry ' + JSON.stringify(get(k)) + ')');
    expect(bad, 'unregistered or drifted:\n  ' + bad.join('\n  ')).toEqual([]);
  });
});

describe('the engine writes the HUD through the host translator', () => {
  const ast = acorn.parse(source, { ecmaVersion: 'latest' });
  const fnBody = (name) => {
    let found = null;
    (function walk(n) {
      if (!n || found || typeof n.type !== 'string') return;
      if (n.type === 'FunctionDeclaration' && n.id && n.id.name === name) { found = n; return; }
      for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
    })(ast);
    if (!found) throw new Error(name + ' not found');
    return found;
  };
  const proseLiterals = (fn) => {
    const out = [];
    (function walk(n) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'Literal' && typeof n.value === 'string' && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(n.value)) out.push(n.value);
      for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); }
    })(fn);
    return out;
  };

  it('the DOM writers hold no English prose of their own', () => {
    for (const name of ['fpUpdatePlayerStatus', 'fpUpdateTargetLabel', 'fpUpdateDrillHud', 'updateHoverCard3d']) {
      expect(proseLiterals(fnBody(name)), name).toEqual([]);
    }
  });

  it('each writer passes the engine translator to its builder', () => {
    const src = (name) => source.slice(fnBody(name).start, fnBody(name).end);
    expect(src('fpUpdatePlayerStatus')).toMatch(/fpStatusLine\(\{[\s\S]*\}, geoT\)/);
    expect((src('fpUpdateTargetLabel').match(/fpTargetLabelText\([^;]*, geoT\)/g) || []).length).toBe(4);
    expect(src('fpUpdateTargetLabel')).toContain('specimenSign(sign, geoT)');
    expect(src('fpUpdateDrillHud')).toContain('fpDrillReadoutText(fp.drillHeat, fp.drillOverheated, geoT)');
    expect(src('updateHoverCard3d')).toContain('fpHoverMetaText(f.depthKm, f.tempC, geoT)');
    expect(src('updateHoverCard3d')).toContain('rockTypeText(R.type, geoT)');
    expect(source).toContain('opts.onFlash(fpProfileReasonText(profile.label, geoT))');
    expect(source).toContain('opts.onSpecimenSign({ sign: specimenSign(hiddenSpecimen.info.kind, geoT) })');
    expect(source).toContain('sign: specimenSign(nearest.info.kind, geoT) }');
  });

  it('the engine translator is the host t, read through a ref so a language switch reaches it', () => {
    expect(source).toMatch(/var geoT = opts && typeof opts\.t === 'function' \? function \(k, fb, vars\) \{/);
    expect(source).toContain('var geoTRef = React.useRef(t); geoTRef.current = t;');
    expect(source).toContain('t: function (k, fb, vars) { return geoTRef.current(k, fb, vars); },');
  });

  it("the host t fills a template, and tf is a one-line delegate the aria gate can recognise", () => {
    expect(source).toMatch(/var t = function \(k, fb, vars\) \{[\s\S]{0,400}s = String\(s\)\.split\('\{' \+ name \+ '\}'\)\.join\(String\(vars\[name\]\)\);/);
    expect(source).toContain('var tf = function (k, fb, vars) { return t(k, fb, vars); };');
  });

  it('the survey and tilt sentences take translated words, not the engine tokens', () => {
    // two survey readings (hidden find, field-run target): count them, one pattern would pass with either broken
    const words = "blocks: fpBlocksText(result.distanceBlocks, t), direction: fpDirectionText(result.direction, t), vertical: fpVerticalText(result.vertical, t)";
    expect(source.split(words).length - 1).toBe(2);
    expect(source).not.toMatch(/direction: result\.direction|vertical: result\.vertical|blocks: result\.distanceBlocks === 1/);
    expect(source).toContain('dir = fpDirectionText(fpCompassWord(r.dipBearing), t);');
    expect(source).toContain("type: rockTypeText(r.type, t).toLowerCase()");
    expect(source).not.toMatch(/'[^']*Turning you to face it\.'\s*,\s*'info'/);
    expect(source).not.toMatch(/\+ ' Turning you to face it\.'/);
  });
});

// Material, find and world names: translated IN the data tables (name / label), English kept in
// nameEn / labelEn, so every panel, the engine HUD and every {name} template follow the language.
describe('material, find and world names follow the language', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
  const get = (o, k) => k.split('.').reduce((x, p) => (x && typeof x === 'object' ? x[p] : undefined), o);
  const named = () => {
    const out = [];
    for (const table of P.geoNameTables()) for (const k of Object.keys(table)) if (table[k] && typeof table[k].name === 'string') out.push(table[k]);
    return out;
  };
  afterEach(() => P.localizeGeologyNames(null));

  it('with no translator every name and world label is the English it always was', () => {
    const before = named().map((x) => x.name), labels = P.sceneLabels();
    expect(labels).toContain('⛰️ Layered crust');
    P.localizeGeologyNames((k, fb) => fb);
    expect(named().map((x) => x.name)).toEqual(before);
    expect(P.sceneLabels()).toEqual(labels);
    P.localizeGeologyNames(null);
    expect(named().map((x) => x.name)).toEqual(before);
    expect(P.sceneLabels()).toEqual(labels);
    expect(named().every((x) => x.nameEn === x.name)).toBe(true);
  });

  it('with a translator no English name survives, the emoji stay, and it never compounds', () => {
    expect(named().length).toBeGreaterThan(60);
    P.localizeGeologyNames(pseudo);
    P.localizeGeologyNames(pseudo);                     // twice: translates from nameEn, not from the last result
    for (const x of named()) expect(leak(x.name), x.nameEn).toEqual([]);
    const english = ['⛰️ Layered crust', '💎 Crystal cavern', '🌍 Deep Earth', '🌊 Subduction zone', '🌋 Mid-ocean ridge', '🏝️ Hotspot chain', '🏔️ Mountain belt'];
    P.sceneLabels().forEach((label) => {
      const emoji = english.map((e) => e.split(' ')[0]).find((e) => label.startsWith(e + ' '));
      expect(emoji, label).toBeTruthy();                 // the world's emoji is kept
      expect(leak(label), label).toEqual([]);            // and its words are translated
    });
    // what the panels and the engine actually read
    const facts = P.rockFacts('sandstone', 4);
    expect(leak((facts.R || facts).name), 'rockFacts').toEqual([]);
    for (const id of P.scenes()) for (const find of P.sceneSpecimenCatalog(id)) expect(leak(find.name), id + ' ' + find.kind).toEqual([]);
    P.localizeGeologyNames(null);
    expect(named().every((x) => x.nameEn === x.name)).toBe(true);
    // a marking translator shows compounding directly: two passes must still mark once
    const mark = (k, fb) => fb + '*';
    P.localizeGeologyNames(mark); P.localizeGeologyNames(mark);
    expect(named().filter((x) => x.name !== x.nameEn + '*').map((x) => x.name)).toEqual([]);
    expect(P.sceneLabels().filter((l) => !/[^*]\*$/.test(l))).toEqual([]);
  });

  it('every name has its own registered key, with the same English (a renamed material gets a NEW key)', () => {
    const keys = new Map(), bad = [];
    for (const x of named()) {
      const key = P.geoNameKey(x.nameEn);
      if (keys.has(key) && keys.get(key) !== x.nameEn) bad.push('slug clash ' + key + ': ' + keys.get(key) + ' / ' + x.nameEn);
      keys.set(key, x.nameEn);
      if (get(reg, key) !== x.nameEn) bad.push(key + ' registry=' + JSON.stringify(get(reg, key)) + ' code=' + x.nameEn);
    }
    for (const id of P.scenes()) if (typeof get(reg, 'stem.geology.world.' + id) !== 'string') bad.push('stem.geology.world.' + id + ' unregistered');
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('the host localizes on every render, before any panel reads a name', () => {
    expect(source).toMatch(/var tf = function \(k, fb, vars\) \{ return t\(k, fb, vars\); \};\s*\n\s*localizeGeologyAll\(t\);/);
    expect(source).toContain('geoI18nProbe = probe; localizeGeologyNames(t); localizeGeologyText(t);');
  });

  it('the five translated packs carry every name and world label', () => {
    for (const pack of ['spanish_latin_america', 'french', 'portuguese_angola', 'arabic', 'ukrainian']) {
      const data = JSON.parse(fs.readFileSync(path.join(root, 'lang', pack + '.js'), 'utf8'));
      const missing = named().map((x) => P.geoNameKey(x.nameEn)).concat(P.scenes().map((id) => 'stem.geology.world.' + id)).filter((k) => typeof get(data, k) !== 'string');
      expect(missing, pack).toEqual([]);
    }
  });
});

// Longer scene text (story stages, landmarks, process cues, orientation): translated IN its tables,
// keyed by a hash of the English, English kept aside. What the Process story panel and the scene
// orientation panel read must follow the language; the tokens beside the text must not.
describe('scene text follows the language', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
  const get = (o, k) => k.split('.').reduce((x, p) => (x && typeof x === 'object' ? x[p] : undefined), o);
  const textLeak = (s) => String(s).replace(/km|°C|\bm\b/g, '').match(/[A-Za-z]+/g) || [];
  const fields = () => new Set(P.geoTextFields());
  const collect = () => {   // every [holder, field-or-index, value] the localizer owns
    const out = [], F = fields();
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      for (const [k, v] of Object.entries(n)) {
        if (typeof v === 'string' && F.has(k)) out.push(v);
        else if (k === 'labels' && Array.isArray(v)) v.forEach((x) => out.push(x));
        else if (v && typeof v === 'object') walk(v);
      }
    };
    P.geoTextRoots().forEach(walk);
    return out;
  };
  const tokens = () => JSON.stringify(P.scenes().map((id) => {
    P.setScene(id);   // material types drive the dig feel and depths drive the facts: both must survive
    return [P.sceneBeacons(id).map((b) => [b.id, b.key, b.view, b.stage]), P.sceneJourney(id).map((s) => s.key), P.processCues(id).axis.gradient,
      P.sceneMaterials(id).map((m) => [m.key, m.type, P.rockFacts(m.key, 2).depthKm, P.rockFacts(m.key, 2).tempC])];
  }));
  afterEach(() => { P.localizeGeologyText(null); P.localizeGeologyNames(null); });

  it('with no translator the text is the English it always was', () => {
    const before = collect(), journey = P.sceneJourney('crust').map((s) => s.label);
    expect(before.length).toBeGreaterThan(200);
    expect(journey).toEqual(['Read the layers', 'Find what cuts', 'Notice the heat']);
    P.localizeGeologyText((k, fb) => fb);
    expect(collect()).toEqual(before);
    P.localizeGeologyText(null);
    expect(collect()).toEqual(before);
  });

  it('with a translator no English survives in what the panels read, and the tokens are untouched', () => {
    const toks = tokens();
    P.localizeGeologyText(pseudo);
    P.localizeGeologyText(pseudo);
    for (const s of collect()) expect(textLeak(s), s).toEqual([]);
    for (const id of P.scenes()) {
      for (const s of P.sceneJourney(id)) { expect(textLeak(s.label), id).toEqual([]); expect(textLeak(s.body), id).toEqual([]); }
      for (const b of P.sceneBeacons(id)) { expect(textLeak(b.label), id).toEqual([]); expect(textLeak(b.detail), id).toEqual([]); }
      const cue = P.processCues(id);
      for (const s of [cue.title, cue.summary, cue.depth, cue.axis.label, cue.axis.value, cue.axis.ariaLabel].concat(cue.axis.labels, cue.steps.map((x) => x.label), cue.steps.map((x) => x.detail))) expect(textLeak(s), id + ': ' + s).toEqual([]);
    }
    expect(tokens()).toBe(toks);
  });

  it('never compounds: two passes of a marking translator mark each string once', () => {
    const mark = (k, fb) => fb + '*';
    P.localizeGeologyText(mark); P.localizeGeologyText(mark);
    expect(collect().filter((s) => !/[^*]\*$/.test(s))).toEqual([]);
  });

  it('every string has a registered key, and each key is the hash of its registered English', () => {
    const bad = [];
    for (const en of collect()) {
      const key = P.geoTextKey(en);
      if (get(reg, key) !== en) bad.push(key + ' registry=' + JSON.stringify(get(reg, key)) + ' code=' + JSON.stringify(en));
    }
    for (const [k, en] of Object.entries(reg.stem.geology.text || {})) if (P.geoTextKey(en) !== 'stem.geology.text.' + k) bad.push('stale key ' + k + ' for ' + JSON.stringify(en));
    expect(bad, bad.slice(0, 5).join('\n')).toEqual([]);
  });

  it('the five translated packs carry every string, and step labels keep their "N · " prefix', () => {
    for (const pack of ['spanish_latin_america', 'french', 'portuguese_angola', 'arabic', 'ukrainian']) {
      const data = JSON.parse(fs.readFileSync(path.join(root, 'lang', pack + '.js'), 'utf8'));
      const missing = [], prefix = [];
      for (const en of collect()) {
        const tr = get(data, P.geoTextKey(en));
        if (typeof tr !== 'string') { missing.push(en); continue; }
        const m = /^(\d+) · /.exec(en);
        if (m && !tr.startsWith(m[1] + ' · ')) prefix.push(tr);
      }
      expect(missing, pack).toEqual([]);
      expect(prefix, pack).toEqual([]);
    }
  });

  it('the host redoes names and text only when the language changes', () => {
    const calls = [];
    const t = (lang) => (k, fb) => { calls.push(k); return lang === 'en' ? fb : pseudo(k, fb); };
    expect(P.localizeGeologyAll(t('xx'))).toBe(true);
    const n = calls.length;
    expect(P.localizeGeologyAll(t('xx'))).toBe(false);          // same language: probes only
    expect(calls.length - n).toBe(3);
    expect(P.localizeGeologyAll(t('en'))).toBe(true);           // back to English: redone
    expect(P.sceneJourney('crust')[0].label).toBe('Read the layers');
  });
});

// Spoken readouts and the walk-mode card: measurement speech is rebuilt with the translator (the
// facts keep their English measurementSummary), and the layer blurbs, myth-busters and states are
// looked up by the hash of their English where they are shown or spoken.
describe('spoken readouts and the walk card follow the language', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
  const get = (o, k) => k.split('.').reduce((x, p) => (x && typeof x === 'object' ? x[p] : undefined), o);
  const everyFacts = () => {
    const out = [];
    for (const id of P.scenes()) { P.setScene(id); for (const m of P.sceneMaterials(id)) out.push([id, m.key, P.rockFacts(m.key, 2)]); }
    return out;
  };

  it('with no translator the spoken readout is word for word the English summary', () => {
    for (const [id, key, f] of everyFacts()) expect(P.measurementSpeechText(f.measurements), id + '/' + key).toBe(f.measurementSummary);
  });

  it('with a translator the spoken readout keeps its numbers and loses its English', () => {
    for (const [id, key, f] of everyFacts()) {
      const said = P.measurementSpeechText(f.measurements, pseudo);
      expect(said.replace(/km|°C/g, '').match(/[A-Za-z]+/g) || [], id + '/' + key + ': ' + said).toEqual([]);
      for (const row of f.measurements) if (row.num != null) expect(said, id + '/' + key).toContain(String(row.num));
    }
  });

  it('every blurb, myth-buster and state has a registered key with the same English', () => {
    const texts = P.geoSpokenTexts();
    expect(texts.length).toBeGreaterThan(80);
    const bad = texts.filter((en) => get(reg, P.geoTextKey(en)) !== en);
    expect(bad).toEqual([]);
  });

  it('the host speaks and shows the translated versions', () => {
    expect(source).toContain('announce(fpAnnounceTextFor(p));');
    expect(source).toContain('var readout = measurementSpeechText(facts.measurements, t)');
    expect(source).toContain('geoTT(fpHud.state)');
    expect(source).toContain('geoTT(fpHud.blurb)');
    expect(source).toContain("'⚠ ' + geoTT(fpHud.bust)");
    expect(source).toContain("'💡 ' + geoTT(bust)");            // info panel
    expect(source).toContain("'💡 ' + geoTT(calloutBust)");     // 3D callout
    expect(source).toContain("geoTT(row.label)");                  // info panel measurement rows
    expect(source).toContain("geoTT(f.state)");
    expect(source).toContain('rockTypeText(R.type, t)');
    expect(source).toContain('rockTypeText(fpHud.type, t)');
    expect(source).toMatch(/nodes\.push\(h\('span', \{ key: prefix \+ row\.id \+ '-label', className: muted \}, t\(geoTextKey\(row\.label\), row\.label\)\)\);/);
  });

  it('the five translated packs carry every spoken text', () => {
    for (const pack of ['spanish_latin_america', 'french', 'portuguese_angola', 'arabic', 'ukrainian']) {
      const data = JSON.parse(fs.readFileSync(path.join(root, 'lang', pack + '.js'), 'utf8'));
      expect(P.geoSpokenTexts().filter((en) => typeof get(data, P.geoTextKey(en)) !== 'string'), pack).toEqual([]);
    }
  });
});
