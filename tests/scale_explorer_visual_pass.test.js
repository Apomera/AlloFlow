// Scale Explorer visual pass (2026-10-17): the numbers the new visuals show
// must come from the catalogue, and the new strings must ship in every copy.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.SCALE_VISUAL_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js';
const src = fs.readFileSync(FILE, 'utf8');
// The two tracked copies are required; the gitignored build outputs are checked
// only when a local build has produced them.
const UI_COPIES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].concat(['desktop/app-build/ui_strings.js', 'desktop/web-app/build/ui_strings.js'].filter((rel) => fs.existsSync(rel)));

const helpers = vm.runInNewContext('(function(){' + sliceBetween(src, '  function bigCount(v) {', '  // Mid-sentence, "A person"', { file: FILE }) + sliceBetween(src, '  function round2(v) {', '  // "about 60 million times"', { file: FILE }) + 'return {humanLength:humanLength};})()');
const ITEMS = vm.runInNewContext(sliceBetween(src, '  var ITEMS = [', '\n  ];', { file: FILE, includeEnd: true }).replace('var ITEMS = ', '').trim().replace(/;$/, ''));
const STORIES = vm.runInNewContext('(' + sliceBetween(src, '  var RULER_STORIES = ', '\n  };', { file: FILE, includeEnd: true }).replace('var RULER_STORIES = ', '').trim().replace(/;$/, '') + ')');
const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const AU = 1.496e11, LY = 9.461e15, R_SUN = 6.957e8;

describe('Scale Explorer visual pass', () => {
  it('writes planet-sized lengths with every digit a reader needs', () => {
    expect(helpers.humanLength(byId.earth.size)).toBe('12,742 km');
    expect(helpers.humanLength(byId.jupiter.size)).toBe('143,000 km');
    expect(helpers.humanLength(byId.moon.size)).toBe('3475 km');
    expect(helpers.humanLength(byId.sun.size)).toBe('1.39 million km');
    expect(helpers.humanLength(byId['grand-canyon'].size)).toBe('446 km');
  });

  it('places the light-month and ten-billion-year landmarks at their true fractions', () => {
    const month = STORIES['light-month'], deep = STORIES['ten-billion-ly'];
    const at = (story, id) => story.pins.find((p) => p[0] === id)[1];
    // Voyager 1 is about one light day out; the ruler is thirty light days.
    expect(at(month, 'voyager') * 30).toBeCloseTo(1, 10);
    expect(byId['light-month'].size / (LY / 365.25)).toBeCloseTo(30, 0);
    expect(month.ticks).toBe(30);
    // Light-travel time: 0.46 of ten billion years is 4.6 billion, when the Sun formed.
    expect(at(deep, 'sun') * byId['ten-billion-ly'].size / LY).toBeCloseTo(4.6e9, -7);
    for (const story of [month, deep]) for (const p of story.pins) { expect(p[1]).toBeGreaterThanOrEqual(0); expect(p[1]).toBeLessThanOrEqual(1); }
  });

  it('dashes exactly the orbits Betelgeuse would swallow, for every published radius', () => {
    const orbits = vm.runInNewContext(sliceBetween(src, "      [['mercury',.387]", '.forEach(function(o,i){', { file: FILE }).trim());
    expect(orbits.map((o) => o[0])).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter']);
    const scale = AU / byId.betelgeuse.size; // the model's own unit: diameter = 1
    const inside = orbits.filter((o) => o[1] * scale < 0.5).map((o) => o[0]);
    expect(inside).toEqual(['mercury', 'venus', 'earth', 'mars']);
    // The note's 640-887 solar-radius range keeps the claim true at both ends.
    for (const radius of [640 * R_SUN / AU, 887 * R_SUN / AU]) {
      expect(orbits.filter((o) => o[1] < radius).map((o) => o[0])).toEqual(inside);
    }
  });

  it('draws the distant sky only inside our galaxy, never across intergalactic space', () => {
    const sky = vm.runInNewContext('(' + sliceBetween(src, '    var SKY_SCENES=', ';', { file: FILE }).replace('var SKY_SCENES=', '').trim() + ')');
    for (const id of Object.keys(sky)) expect(byId[id], id).toBeDefined();
    for (const id of ['andromeda-dist', 'coma-dist', 'ten-billion-ly', 'universe', 'laniakea', 'virgo-sc', 'oort']) expect(sky[id], id).toBeUndefined();
  });

  it('draws true shapes on the chart where an emoji showed the wrong thing', () => {
    const glyph = vm.runInNewContext('(function(){' + sliceBetween(src, '  function chartGlyph(g, id, x, y, s) {', '  function palette(theme) {', { file: FILE }) + 'return chartGlyph;})()');
    const calls = [], noop = () => {}, grad = { addColorStop: noop };
    const g = new Proxy({ globalAlpha: 1 }, { get: (t, k) => (k in t ? t[k] : k === 'arc' ? (...a) => calls.push(a) : k.startsWith('create') ? () => grad : noop), set: (t, k, v) => { t[k] = v; return true; } });
    // Includes eiffel (🗼 is officially Tokyo Tower), milkyway (🌀 is a cyclone) and
    // chicxulub (☄️ is the impactor, not the crater).
    for (const id of ['rbc', 'water', 'sand', 'flea', 'ecoli', 'hair', 'mitochondrion', 'ribosome', 'virus', 'light', 'xray', 'gamma', 'eiffel', 'milkyway', 'jupiter', 'pyramid', 'chicxulub', 'football-pitch', 'rice', 'pollen', 'mouse', 'dust-mite', 'paramecium', 'hydrogen', 'carbon', 'nucleus', 'proton', 'solar-system', 'heliosphere', 'virgo-sc', 'orion-nebula', 'oort', 'local-bubble', 'grand-canyon', 'universe', 'laniakea']) expect(glyph(g, id, 0, 0, 100), id).toBe(true);
    for (const id of ['earth', 'human', 'dna']) expect(glyph(g, id, 0, 0, 100), id + ' keeps its emoji').toBe(false);
    calls.length = 0; glyph(g, 'water', 0, 0, 100);
    // Two hydrogens then the oxygen: the H-O-H angle is the real 104.5 degrees.
    const [h1, h2, o] = calls.map((a) => ({ x: a[0], y: a[1], r: a[2] }));
    const angle = Math.acos(((h1.x - o.x) * (h2.x - o.x) + (h1.y - o.y) * (h2.y - o.y)) / (Math.hypot(h1.x - o.x, h1.y - o.y) * Math.hypot(h2.x - o.x, h2.y - o.y))) * 180 / Math.PI;
    expect(angle).toBeCloseTo(104.5, 6);
    expect(o.r).toBeGreaterThan(h1.r);
  });

  it('draws the atomic, solar and cosmic glyphs to the proportions the catalogue gives', () => {
    const glyph = vm.runInNewContext('(function(){' + sliceBetween(src, '  function chartGlyph(g, id, x, y, s) {', '  function palette(theme) {', { file: FILE }) + 'return chartGlyph;})()');
    const arcs = [], stops = [], noop = () => {};
    const g = new Proxy({ globalAlpha: 1 }, { get: (t, k) => (k in t ? t[k] : k === 'arc' ? (...a) => arcs.push(a) : k.startsWith('create') ? () => ({ addColorStop: (at, color) => stops.push(color) }) : noop), set: (t, k, v) => { t[k] = v; return true; } });
    const r = 100 * .46;
    // The outer ring is Neptune's orbit, and its diameter is the Solar System's catalogue size.
    glyph(g, 'solar-system', 0, 0, 100);
    const rings = arcs.filter((a) => a[0] === 0 && a[1] === 0).map((a) => a[2]);
    expect(Math.max(...rings)).toBeCloseTo(r, 10);
    expect(2 * 30.07 * AU / byId['solar-system'].size).toBeCloseTo(1, 2);
    expect(rings.map((q) => q / r * 30.07).slice(0, 5)).toEqual([30.07, 19.19, 9.54, 5.2, 1.52].map((au) => expect.closeTo(au, 10)));
    // A gold nucleus is 79 protons in 197 nucleons; the drawn face keeps that share.
    stops.length = 0; glyph(g, 'nucleus', 0, 0, 100);
    const protons = stops.filter((c) => c === '#ffd99a').length, neutrons = stops.filter((c) => c === '#a9dde5').length;
    expect(protons + neutrons).toBe(37);
    expect(protons / (protons + neutrons)).toBeCloseTo(79 / 197, 1);
    // Virgo is about 54 million light-years from the Local Group; the window is 100 million across.
    const virgo = /var vx = x \+ r \* ([\d.]+), lgx = x - r \* ([\d.]+);/.exec(sliceBetween(src, "    } else if (id === 'virgo-sc') {", "    } else if (id === 'light')", { file: FILE }));
    expect(virgo, 'Virgo and Local Group positions').toBeTruthy();
    expect(Number(virgo[1]) + Number(virgo[2])).toBeCloseTo(54e6 / (byId['virgo-sc'].size / LY / 2), 2);
    // The hydrogen dot stays a speck: the true proton is about 1/60,000 of the atom.
    arcs.length = 0; glyph(g, 'hydrogen', 0, 0, 100);
    expect(Math.min(...arcs.map((a) => a[2])) / r).toBeLessThan(.1);
    expect(byId.hydrogen.size / byId.proton.size).toBeGreaterThan(5e4);
  });

  it('marks a distance on the chart as a ruler, not as a round object', () => {
    const draw = sliceBetween(src, '      function draw() {', '        // Labels are a second pass', { file: FILE });
    expect(draw.includes("var isDistance = obj.dim === 'distance';"), 'distance flag').toBe(true);
    expect(draw.includes('if (isDistance) g.setLineDash([6, 5]);'), 'dashed ring').toBe(true);
    expect(draw.includes('if (isDistance) {'), 'ruler instead of a glyph').toBe(true);
    expect(ITEMS.filter((i) => i.dim === 'distance').length).toBeGreaterThan(5);
  });

  it('keeps the heliosphere and crater stories true to their own data', () => {
    const crossings = vm.runInNewContext('(' + sliceBetween(src, '  var HELIO_CROSSINGS=', ';\n', { file: FILE }).replace('var HELIO_CROSSINGS=', '').trim() + ')');
    const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
    const nose = unit(crossings.map((c) => unit(c.direction)).reduce((a, b) => a.map((x, i) => x + b[i])));
    // "Both Voyagers crossed on the upwind side": each within 45 degrees of the nose.
    for (const c of crossings) expect(Math.acos(unit(c.direction).reduce((s, x, i) => s + x * nose[i], 0)) * 180 / Math.PI, c.id).toBeLessThan(45);
    // The cenote arc lies outside the 80 km peak ring and inside the 180 km rim.
    const cenoteR = Number(vm.runInNewContext(/cenoteR=([\d/.]+)/.exec(src)[1]));
    expect(cenoteR * 180).toBeGreaterThan(40);
    expect(cenoteR).toBeLessThan(0.5);
  });

  it('ships every new string, with its source wording, in all four copies', () => {
    const keys = {};
    for (const m of src.matchAll(/S\('((?:atlas_betelgeuse_(?:orbits(?:_body)?|orbit_\w+|badge)|atlas_lightmonth_pin_\w+|atlas_tenbillion_pin_\w+|atlas_helio_(?:flow(?:_body)?|legend_flow|pin_\w+)|atlas_crater_pin_cenotes|atlas_pitch_pin_players))',\s*(?:"([^"]+)"|'([^']+)')/g)) keys[m[1]] = m[2] || m[3];
    // The orbit pin names are passed through a lookup, not a literal.
    for (const id of ['earth', 'mars', 'jupiter']) keys['atlas_betelgeuse_orbit_' + id] = keys['atlas_betelgeuse_orbit_' + id] || null;
    expect(Object.keys(keys).length).toBe(20);
    for (const rel of UI_COPIES) {
      const sec = JSON.parse(fs.readFileSync(rel, 'utf8')).stem.scaleExplorer;
      for (const [key, english] of Object.entries(keys)) {
        expect(sec[key], rel + ' ' + key).toBeTruthy();
        if (english) expect(sec[key], rel + ' ' + key).toBe(english);
      }
      for (const id of ['alpha_cen_dist', 'au', 'galactic_centre']) expect(sec['item_' + id + '_describe'], rel + ' ' + id).toBe(byId[id.replace(/_/g, '-')].describe);
    }
  });

  it('draws Earth’s orbit through Earth, centred on the Sun, with the inner planets at their true radii', () => {
    const au = sliceBetween(src, '    function auDistanceModel(g){', '      var markerGeo=', { file: FILE });
    const orbits = /\[\[([\d.]+),'#[0-9a-f]{6}',[\d.]+\],\[([\d.]+),'#[0-9a-f]{6}',[\d.]+\],\[([\d.]+),'#[0-9a-f]{6}',[\d.]+\]\]\.forEach/.exec(au);
    expect(orbits, 'orbit table').toBeTruthy();
    // The ruler is one AU from the Sun at x = -0.5 to Earth at x = +0.5.
    expect(au.includes('sun.position.set(-.5,0,0)') && au.includes('earth.position.set(.5,0,0)'), 'bodies at the ruler ends').toBe(true);
    expect(au.includes('pts.push(new T.Vector3(-.5+Math.cos(a)*o[0],0,Math.sin(a)*o[0]))'), 'circles centred on the Sun').toBe(true);
    expect(orbits.slice(1).map(Number)).toEqual([1, .723, .387]);
    // The same semi-major axes the Betelgeuse orbits use.
    expect(src.includes("['mercury',.387]") && src.includes("['venus',.723]"), 'shared orbit radii').toBe(true);
  });

  it('gives screen readers every scene note, worded as the source shows it', () => {
    const notes = {};
    for (const m of src.matchAll(/S\('(atlas_\w+_scene_note)',\s*'([^']+)'\)/g)) notes[m[1]] = m[2];
    // Each composed setting is described: the stadium, Paris, the grove and the AU orbits included.
    for (const key of ['atlas_pitch_scene_note', 'atlas_eiffel_scene_note', 'atlas_sequoia_scene_note', 'atlas_au_scene_note', 'atlas_helio_scene_note']) expect(notes[key], key).toBeTruthy();
    expect(notes.atlas_pitch_scene_note.includes('stadium'), 'pitch note names the stadium').toBe(true);
    for (const rel of UI_COPIES) {
      const sec = JSON.parse(fs.readFileSync(rel, 'utf8')).stem.scaleExplorer;
      for (const [key, english] of Object.entries(notes)) expect(sec[key], rel + ' ' + key).toBe(english);
    }
  });
});
