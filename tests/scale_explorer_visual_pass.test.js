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
    for (const id of ['rbc', 'water', 'sand', 'flea', 'ecoli', 'hair', 'mitochondrion', 'ribosome', 'virus', 'light', 'xray', 'gamma', 'eiffel', 'milkyway', 'jupiter', 'pyramid', 'chicxulub', 'football-pitch', 'rice', 'pollen', 'mouse', 'dust-mite', 'paramecium', 'hydrogen', 'carbon', 'nucleus', 'proton', 'solar-system', 'heliosphere', 'virgo-sc', 'orion-nebula', 'oort', 'local-bubble', 'grand-canyon', 'universe', 'laniakea', 'egg', 'moon', 'sun', 'betelgeuse', 'trex', 'blue-whale', 'ladybird', 'dna']) expect(glyph(g, id, 0, 0, 100), id).toBe(true);
    for (const id of ['earth', 'human']) expect(glyph(g, id, 0, 0, 100), id + ' keeps its emoji').toBe(false);
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

  it('words a comparison by what the two sizes measure, never tiling a height along a length', () => {
    const kind = vm.runInNewContext(sliceBetween(src, '  var SPECIMEN_COPY={', '\n};', { file: FILE, includeEnd: true }) + sliceBetween(src, '  function fitMeasureKind(a,b){', '  function dimensionText(item,S){', { file: FILE }) + 'fitMeasureKind;');
    const k = (a, b) => kind(byId[a], byId[b]);
    expect(k('elephant', 'trex')).toBe('mixed');        // shoulder height vs body length
    expect(k('egg', 'basketball')).toBe('mixed');       // length vs diameter
    expect(k('human', 'giraffe')).toBe('tall');         // heights stack
    expect(k('door', 'elephant')).toBe('mixed');        // its 3.2 m is a shoulder, not a whole height
    expect(k('trex', 'blue-whale')).toBe('long');       // lengths end to end
    expect(k('moon', 'earth')).toBe('across');          // diameters side by side
    expect(k('au', 'light-minute')).toBe('mixed');      // distances are only a ratio
    const tiling = sliceBetween(src, '      function tiling() {', '      function staircase() {', { file: FILE });
    expect(tiling.includes('var kind = fitMeasureKind(compare.small, compare.big);'), 'tiling uses the rule').toBe(true);
    // Each sentence is chosen by its kind; "side by side" is left only for widths.
    const at = (key) => tiling.indexOf("S('" + key + "'");
    for (const key of ['fit_line_measure', 'fit_line_long', 'fit_line_close_long', 'fit_line_tall', 'fit_line_close_tall', 'fit_line_close', 'fit_line']) expect(at(key), key).toBeGreaterThan(-1);
    expect(at('fit_line_measure')).toBeLessThan(at('fit_line_long'));
    expect(tiling.indexOf("kind === 'mixed'")).toBeLessThan(at('fit_line_measure'));
    // The headline sentence follows the same rule: a height is never called "long".
    const sentence = sliceBetween(src, '      function compareSentence() {', '      function openItem(', { file: FILE });
    expect(sentence.includes('var kind = fitMeasureKind(compare.small, compare.big)'), 'sentence uses the rule').toBe(true);
    expect(sentence.indexOf("if (kind === 'mixed') return S('atlas_comparison_line_measure'"), 'mixed measures named').toBeGreaterThan(-1);
    expect(sentence.indexOf("if (kind === 'mixed')")).toBeLessThan(sentence.indexOf("return S('atlas_comparison_line',"));
    for (const rel of UI_COPIES) {
      const sec = JSON.parse(fs.readFileSync(rel, 'utf8')).stem.scaleExplorer;
      for (const m of tiling.matchAll(/S\('(fit_line\w*)', '([^']+)'/g)) expect(sec[m[1]], rel + ' ' + m[1]).toBe(m[2]);
      for (const m of sentence.matchAll(/S\('(atlas_comparison_line\w*)', '([^']+)'/g)) expect(sec[m[1]], rel + ' ' + m[1]).toBe(m[2]);
    }
  });

  it('makes only open ocean glint on the Earth, never ice, land or bright shallows', () => {
    const water = vm.runInNewContext(sliceBetween(src, '  function earthIsWater(r,g,b){', '\n', { file: FILE }) + 'earthIsWater;');
    for (const [name, rgb] of Object.entries({ 'deep Pacific': [6, 16, 52], 'Indian Ocean': [12, 28, 74], 'coastal water': [24, 48, 92] })) expect(water(...rgb), name).toBe(true);
    for (const [name, rgb] of Object.entries({ forest: [32, 64, 28], desert: [205, 172, 120], 'polar ice': [238, 242, 250], 'Bahamas shallows': [70, 170, 190], tundra: [96, 90, 78] })) expect(water(...rgb), name).toBe(false);
    // Water is smoother (lower roughness) than everything else, and the map is optional.
    const rough = sliceBetween(src, '  function earthOceanRoughness(T,image){', '  function earthNightMaterial(', { file: FILE });
    expect(rough.includes('earthIsWater(d[i],d[i+1],d[i+2])?105:235'), 'water smooth, land matte').toBe(true);
    expect(rough.includes('catch(e){return null;}'), 'unreadable pixels keep the old look').toBe(true);
    expect(src.includes('if(oceanRough){track(oceanRough);planetMat.roughnessMap=oceanRough;planetMat.roughness=1;}'), 'applied only when built').toBe(true);
  });

  it('keeps the Milky Way star samples in the disc, bulge and bar proportions it always had', () => {
    const loop = sliceBetween(src, '      // 44,000 samples in the original proportions', '        px=clamp(px,-.497,.497);', { file: FILE });
    const n = (re) => Number(re.exec(loop)[1]);
    const total = n(/for\(var j=0;j<(\d+);j\+\+\)/), thin = n(/if\(j<(\d+)\)\{/), thick = n(/\}else if\(j<(\d+)\)\{\s*var r=Math\.min/), bulge = n(/\}else if\(j<(\d+)\)\{\s*px=gaussian\(\)\*\.037/);
    // The 29,000-sample original: 21,600 thin disc, 3,400 thick disc, 2,700 bulge, 1,300 bar.
    const was = [21600, 3400, 2700, 1300].map((v) => v / 29000), now = [thin, thick - thin, bulge - thick, total - bulge].map((v) => v / total);
    now.forEach((f, i) => expect(f, ['thin disc', 'thick disc', 'bulge', 'bar'][i]).toBeCloseTo(was[i], 2));
    expect(total).toBeGreaterThan(29000);
  });

  it('puts the whale in open water without touching the measured body, comparisons or high contrast', () => {
    expect(src.includes("'open-ocean':[[0,"), 'ocean gradient').toBe(true);
    const whale = sliceBetween(src, "      if(focal&&focal.id==='blue-whale'){", "      var distance=", { file: FILE });
    expect(whale.includes("if(state.contrast)scene.background.set('#000000');else scene.background=skyGradient('open-ocean');"), 'contrast keeps black').toBe(true);
    expect(src.includes("var whaleActive=!!activeRoot&&state.focusId==='blue-whale'&&close>.8&&!state.neighbors&&!state.flight&&!state.contrast;"), 'context only in the whale view').toBe(true);
    const comparison = sliceBetween(src, '      var pair = state.comparison, visible = []', '      bloodBackdrop.visible=false;', { file: FILE });
    expect(comparison.includes('if(whaleWater)whaleWater.visible=false;'), 'hidden in comparisons').toBe(true);
    const water = sliceBetween(src, '    function buildWhaleWater(){', '      return water;', { file: FILE });
    expect(water.includes("water.userData.whaleWater=true"), 'scene-level group').toBe(true);
    expect(/depthWrite:false/.test(water) && !/castShadow=true/.test(water), 'never occludes or shadows the whale').toBe(true);
  });

  it('draws a height chart only behind two heights side by side, on the same scale as the objects', () => {
    const step = vm.runInNewContext('function log10(v){return Math.log(v)/Math.LN10;}' + sliceBetween(src, '    function chartStep(top){', '\n', { file: FILE }) + 'chartStep;');
    // Round-number steps that give three to six lines up to the taller object.
    expect(step(byId.giraffe.size)).toBe(1);
    expect(step(byId.elephant.size)).toBeCloseTo(1, 10);
    expect(step(byId.eiffel.size)).toBe(100);
    expect(step(byId.everest.size)).toBe(2000);
    for (const id of ['door', 'human', 'giraffe', 'elephant', 'eiffel', 'liberty', 'sequoia', 'everest']) {
      const lines = Math.floor(byId[id].size * 1.08 / step(byId[id].size)) + 1;
      expect(lines, id).toBeGreaterThanOrEqual(3); expect(lines, id).toBeLessThanOrEqual(12);
    }
    // A line k steps up sits where an object k steps tall would reach.
    expect(src.includes('root.scale.setScalar(3 * item.size / pair.big.size);'), 'object scale').toBe(true);
    const layout = sliceBetween(src, '    function layoutComparisonGrid(grid,big,bounds,contrast){', '    }\n', { file: FILE });
    expect(layout.includes('var metre=3/big.size,'), 'chart scale matches').toBe(true);
    expect(layout.includes('var y=k<count?k*step*metre:0'), 'lines at whole steps').toBe(true);
    expect(src.includes("var chartable=!silhouette&&visible.length===2&&pair.a.dim==='tall'&&pair.b.dim==='tall';"), 'only heights, only side by side').toBe(true);
    expect(sliceBetween(src, '      }else if(footballStadium)footballStadium.visible=false;', '      if(whaleActive){', { file: FILE }).includes('if(comparisonGrid)comparisonGrid.visible=false;'), 'hidden when exploring').toBe(true);
  });

  it('crops each chart glyph to what was painted and tiles it at its own proportions', () => {
    const box = vm.runInNewContext(sliceBetween(src, '  function glyphPaintedBox(rgba, size) {', '  function glyphAspect(id)', { file: FILE }) + 'glyphPaintedBox;');
    const size = 40, rgba = new Uint8ClampedArray(size * size * 4);
    const paint = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) rgba[(y * size + x) * 4 + 3] = 255; };
    expect(box(rgba, size), 'nothing painted').toBeNull();
    paint(10, 18, 29, 21); // a long, low shape, 20 x 4
    rgba[(2 * size + 2) * 4 + 3] = 8; // anti-alias haze below the threshold is ignored
    expect(box(rgba, size)).toEqual({ x: 8, y: 16, w: 24, h: 8 });
    paint(0, 0, 0, 0); paint(39, 39, 39, 39); // the margin is clamped at the canvas edge
    expect(box(rgba, size)).toEqual({ x: 0, y: 0, w: 40, h: 40 });
    // The tile keeps the glyph's ratio and stays inside the cell and the bar,
    // with lying copies (heights) swapping the two sides.
    const tiling = sliceBetween(src, '      function tiling() {', '      function staircase() {', { file: FILE });
    const fit = /var gk = lying \? Math\.min\(along, across \/ ga\) : Math\.min\(along \/ ga, across\), gw = gk \* ga, gh = gk;/;
    expect(fit.test(tiling), 'aspect fit').toBe(true);
    const gkOf = (lying, along, across, ga) => (lying ? Math.min(along, across / ga) : Math.min(along / ga, across));
    for (const [lying, along, across, ga] of [[false, 120, 26, 3], [false, 30, 26, 1], [true, 80, 26, .4], [false, 20, 26, 4]]) {
      const gk = gkOf(lying, along, across, ga), gw = gk * ga, gh = gk, run = lying ? gh : gw, side = lying ? gw : gh;
      expect(run).toBeLessThanOrEqual(along + 1e-9); expect(side).toBeLessThanOrEqual(across + 1e-9);
      expect(Math.max(run / along, side / across)).toBeCloseTo(1, 9); // as large as fits
    }
    expect(src.includes('function glyphAspect(id) { return glyphImage(id) && glyphAspects[id] || 1; }'), 'falls back to square').toBe(true);
  });

  it('draws DNA as B-DNA: 10 base pairs a turn, strands 0.38 of a turn apart so the grooves differ', () => {
    const dna = sliceBetween(src, "    } else if (id === 'dna') {", "    } else if (id === 'light')", { file: FILE });
    const shape = /var turns = ([\d.]+), steps = (\d+)/.exec(dna), turns = Number(shape[1]), steps = Number(shape[2]);
    // Rungs are spaced one per tenth of a turn, the real 10 base pairs per turn of B-DNA.
    expect(steps / turns).toBeCloseTo(10, 10);
    const off = Number(/off = Math\.PI \* 2 \* ([\d.]+)/.exec(dna)[1]);
    // Equal strand spacing (0.5) would make identical grooves; B-DNA has a wide and a narrow one.
    expect(off).toBeGreaterThan(0.3); expect(off).toBeLessThan(0.45);
  });

  it('drops the stadium crowd in high contrast, keeping the measured pitch', () => {
    const block = sliceBetween(src, "      if(footballActive){", "      }else if(footballStadium)footballStadium.visible=false;", { file: FILE });
    expect(block.includes('footballStadium.visible=!state.contrast;'), 'stadium hidden in contrast').toBe(true);
    // The pitch itself is never gated on contrast: only the stadium context is.
    expect(block.includes("floor.visible=ground.visible=garden.visible=motes.visible=false;"), 'pitch scene unchanged').toBe(true);
  });

  it('keeps chart label text at 4.5:1 and rings at 3:1 however far an item fades (WCAG 1.4.3, 1.4.11)', () => {
    const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return .2126 * lin(n >> 16) + .7152 * lin((n >> 8) & 255) + .0722 * lin(n & 255); };
    const blend = (fg, bg, a) => { const F = parseInt(fg.slice(1), 16), B = parseInt(bg.slice(1), 16); return '#' + [16, 8, 0].map((s) => Math.round(((F >> s) & 255) * a + ((B >> s) & 255) * (1 - a)).toString(16).padStart(2, '0')).join(''); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const palette = vm.runInNewContext('(function(){' + sliceBetween(src, '  function palette(theme) {', '\n  }\n', { file: FILE, includeEnd: true }) + 'return palette;})()');
    const draw = sliceBetween(src, '      function draw() {', '        // Labels are a second pass', { file: FILE });
    const labels = sliceBetween(src, '        // Labels are a second pass', '        // Film chrome', { file: FILE });
    const ringFloor = Number(/g\.globalAlpha = Math\.max\(alpha, ([\d.]+)\);/.exec(draw)[1]);
    const textFloor = Number(/clamp\(1 - \(lc\.dist \/ \(DECADES_ACROSS \* 1\.35\)\), ([\d.]+), 1\)/.exec(labels)[1]);
    for (const theme of ['dark', 'light', 'contrast']) {
      const P = palette(theme);
      expect(ratio(blend(P.stageFg, P.stage, textFloor), P.stage), theme + ' name').toBeGreaterThanOrEqual(4.5);
      expect(ratio(blend(P.stageDim, P.stage, textFloor), P.stage), theme + ' size line').toBeGreaterThanOrEqual(4.5);
      expect(ratio(blend(P.ring, P.stage, ringFloor), P.stage), theme + ' ring').toBeGreaterThanOrEqual(3);
    }
    // The old floor really was illegible, so the assertion above is not vacuous.
    const P = palette('dark');
    expect(ratio(blend(P.stageDim, P.stage, .12), P.stage)).toBeLessThan(1.5);
  });

  it('keeps pressed buttons and legend text readable in every theme (WCAG 1.4.3)', () => {
    const lin = (c) => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return .2126 * lin(n >> 16) + .7152 * lin((n >> 8) & 255) + .0722 * lin(n & 255); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const palette = vm.runInNewContext('(function(){' + sliceBetween(src, '  function palette(theme) {', '\n  }\n', { file: FILE, includeEnd: true }) + 'return palette;})()');
    // The pressed lighting button is drawn in the theme's selected colours, never plain text on them.
    const eiffel = sliceBetween(src, '      function eiffelLightingControls(scroll){', '      function eiffelNavigator(){', { file: FILE });
    expect(eiffel.includes('background:!evening?P.selBg:P.bg,color:!evening?P.selFg:P.text'), 'daylight button').toBe(true);
    expect(eiffel.includes('background:evening?P.selBg:P.bg,color:evening?P.selFg:P.text'), 'evening button').toBe(true);
    for (const theme of ['dark', 'light', 'contrast']) { const P = palette(theme); expect(ratio(P.selFg, P.selBg), theme + ' selected').toBeGreaterThanOrEqual(4.5); expect(ratio(P.text, P.bg), theme + ' text').toBeGreaterThanOrEqual(4.5); }
    // The water legend's oxygen colour, per theme, on that theme's panel.
    const legend = /color:theme==='contrast'\?P\.text:theme==='light'\?'(#[0-9a-f]{6})':'(#[0-9a-f]{6})'\}\},S\('atlas_water_oxygen_legend'/.exec(src);
    expect(legend, 'oxygen legend colours').toBeTruthy();
    expect(ratio(legend[1], palette('light').panel), 'light').toBeGreaterThanOrEqual(4.5);
    expect(ratio(legend[2], palette('dark').panel), 'dark').toBeGreaterThanOrEqual(4.5);
  });

  it('lets overlay labels wrap and steer clear of each other under WCAG text spacing (1.4.12)', () => {
    // Pins wrap inside the stage instead of staying on one clipped line.
    for (const cls of ['sx-ruler-pin', 'sx-scene-pin']) {
      const rule = new RegExp('\\.' + cls + '\\{[^}]*\\}').exec(src)[0];
      expect(rule.includes('white-space:nowrap'), cls + ' must not force one line').toBe(false);
      expect(rule.includes('max-width:calc(100% - 16px)') && rule.includes('overflow-wrap:anywhere'), cls + ' wraps inside the stage').toBe(true);
    }
    // The length tag is painted first, so the story pins can steer around where it landed.
    const order = sliceBetween(src, '      // The length tag goes first', '      paintBetelgeusePins(', { file: FILE });
    expect(order.includes('paintRulerTag(flight?null:activeRoot,width,height);'), 'tag first').toBe(true);
    const pins = sliceBetween(src, '    function paintRulerStoryPins(root,state,width,height){', '    // A glazed egg cup', { file: FILE });
    expect(pins.includes("comparisonLabels.querySelector('[data-scale-ruler-tag]')"), 'tag looked up where it lives').toBe(true);
    expect(pins.includes('if(story&&tagAt)placed.push('), 'tag is an obstacle').toBe(true);
    // The transform pattern really reads the tag's own transform (a stripped backslash once broke it).
    const pattern = /tagAt=lengthTag&&!lengthTag\.hidden&&(\/translate[^\n]*?\/)\.exec/.exec(pins);
    expect(pattern, 'transform pattern present').toBeTruthy();
    const re = vm.runInNewContext(pattern[1]);
    expect(re.exec('translate(102.5px, 282.3px)').slice(1, 3)).toEqual(['102.5', '282.3']);
    // A pin tries both sides of the ruler, nearest first, and never gives up for lack of a free slot.
    expect(pins.includes('top=slots.filter(function(t){return inView(t)&&free(t);})[0];if(top===undefined)top=slots.filter(inView)[0];'), 'free slots then any visible').toBe(true);
  });

  it('gives screen readers every scene note, worded as the source shows it', () => {
    const notes = {};
    for (const m of src.matchAll(/S\('(atlas_\w+_scene_note)',\s*'([^']+)'\)/g)) notes[m[1]] = m[2];
    // Each composed setting is described: the stadium, Paris, the grove and the AU orbits included.
    for (const key of ['atlas_pitch_scene_note', 'atlas_eiffel_scene_note', 'atlas_sequoia_scene_note', 'atlas_au_scene_note', 'atlas_pyramid_scene_note', 'atlas_liberty_scene_note', 'atlas_helio_scene_note']) expect(notes[key], key).toBeTruthy();
    expect(notes.atlas_pitch_scene_note.includes('stadium'), 'pitch note names the stadium').toBe(true);
    for (const rel of UI_COPIES) {
      const sec = JSON.parse(fs.readFileSync(rel, 'utf8')).stem.scaleExplorer;
      for (const [key, english] of Object.entries(notes)) expect(sec[key], rel + ' ' + key).toBe(english);
    }
  });
});
