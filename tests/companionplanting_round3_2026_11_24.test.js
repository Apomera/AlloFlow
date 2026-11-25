// Companion Planting round 3 (2026-11-24): pest controls and "attract with" lists sourced to UC IPM / university
// extension (weak controls labelled), nitrogenase line sourced, seasonal-calendar region note on screen, canvas and
// SVG chart text at a 12 px rendered floor (or moved to HTML legends), and the dead skipNextPlantXPPlot flag removed.
// Fail-first check: CP_TOOL_FILE=C:/tmp/sports_labs_1123/companionplanting/start_r3.js npx vitest run <this file>
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CP_TOOL_FILE || 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// Student-facing code only: whole-line comments quote the sources (and old claims) on purpose.
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
}
function render(data) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, { companionPlanting: data || {} });
}
function extractArray(name) {
  const start = SOURCE.indexOf('var ' + name + ' = [');
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0, i = SOURCE.indexOf('[', start), end = -1;
  for (; i < SOURCE.length; i++) {
    const ch = SOURCE[i];
    if (ch === '\'' || ch === '"') { const q = ch; i++; while (i < SOURCE.length && SOURCE[i] !== q) { if (SOURCE[i] === '\\') i++; i++; } continue; }
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', 'return ' + SOURCE.slice(SOURCE.indexOf('[', start), end + 1))((k, t) => t);
}
const byName = (list) => Object.fromEntries(list.map((x) => [x.name, x]));
const commentsBefore = (marker, span) => {
  const at = SOURCE.indexOf(marker);
  return SOURCE.slice(Math.max(0, at - span), at);
};

describe('Pests & Allies: every control and "attract with" item is sourced or cut', () => {
  const pests = byName(extractArray('GARDEN_PESTS'));
  const allies = byName(extractArray('BENEFICIAL_INSECTS'));

  it('labels the weak controls the way extension describes them', () => {
    const slug = pests['Slug/Snail'].organic;
    expect(slug).toMatch(/copper bands \(work until they tarnish\)/);
    expect(slug).toMatch(/beer traps \(reach only a few feet\)/);
    expect(slug).toMatch(/diatomaceous earth \(stops working once damp\)/);
    const jb = pests['Japanese Beetle'].organic;
    expect(jb).toMatch(/Milky spore has not helped in university trials/);
    expect(jb).toMatch(/Neem helps only when there are few/);
    expect(jb).not.toMatch(/milky spore for grubs, neem/);
    expect(pests['Flea Beetle'].organic).toMatch(/kaolin clay \(mixed results\)/);
    expect(pests['Root-Knot Nematode'].organic).toMatch(/rotation helps less/);
    expect(pests['Tomato Hornworm'].organic).toMatch(/Bt works best on young caterpillars/);
  });

  it('cuts items no extension source supports', () => {
    expect(pests['Squash Bug'].organic).not.toMatch(/neem/i);
    expect(pests['Squash Bug'].organic).not.toMatch(/copper-colored/);
    expect(pests['Flea Beetle'].organic).not.toMatch(/neem/i);
    expect(pests['Slug/Snail'].companion).not.toMatch(/mulch/i);
    expect(pests['Japanese Beetle'].damage).not.toMatch(/beans/);
    expect(pests['Root-Knot Nematode'].damage).not.toMatch(/invisible above ground/);
    expect(pests['Spider Mites'].companion).not.toMatch(/flowers/);
    expect(allies.Ladybug.attract).not.toMatch(/dandelion|Dill|fennel/i);
    expect(allies.Hoverfly.role).not.toMatch(/excellent/);
    expect(allies.Hoverfly.attract).not.toMatch(/calendula|Alyssum/i);
    expect(allies['Green Lacewing'].role).not.toMatch(/Aphid lion/);
    expect(allies['Praying Mantis'].attract).not.toMatch(/Tall grasses/);
    expect(allies['Braconid Wasp'].attract).not.toMatch(/parsley|yarrow/i);
    expect(allies['Ground Beetle'].attract).not.toMatch(/logs/);
  });

  it('keeps an exact source quote and URL comment for every pest and ally', () => {
    const pestNotes = commentsBefore('var GARDEN_PESTS = [', 100) + SOURCE.slice(SOURCE.indexOf('var GARDEN_PESTS = ['), SOURCE.indexOf("{ name: __alloT('stem.companionplanting.aphids'"));
    for (const url of [
      'ipm.ucanr.edu/home-and-landscape/aphids/', 'extension.umn.edu/yard-and-garden-insects/caterpillars-cole-crops',
      'extension.umn.edu/yard-and-garden-insects/tomato-hornworms', 'extension.umn.edu/yard-and-garden-insects/squash-bugs',
      'extension.umn.edu/yard-and-garden-insects/japanese-beetles', 'ipm.ucanr.edu/home-and-landscape/snails-and-slugs/',
      'extension.umn.edu/yard-and-garden-insects/flea-beetles', 'ipm.ucanr.edu/home-and-landscape/spider-mites/',
      'ipm.ucanr.edu/home-and-landscape/nematodes/',
    ]) expect(pestNotes).toContain(url);
    expect(pestNotes).toContain('has not been shown to provide any benefit');
    expect(pestNotes).toContain('until it becomes tarnished');
    const allyNotes = commentsBefore('var BENEFICIAL_INSECTS = [', 2600);
    for (const url of [
      'extension.psu.edu/attracting-beneficial-insects', 'ohioline.osu.edu/factsheet/ent-79', 'ipm.ucanr.edu/natural-enemies/green-lacewings/',
      'ipm.ucanr.edu/natural-enemies/predaceous-ground-beetles/', 'ipm.ucanr.edu/natural-enemies/syrphids/', 'extension.psu.edu/earthworms',
    ]) expect(allyNotes).toContain(url);
  });

  it('the Japanese beetle garden event no longer calls milky spore an organic control', () => {
    expect(CODE).not.toMatch(/milky spore disease \(which kills grubs\) are organic controls/);
    expect(CODE).toMatch(/Milky spore \(a grub disease\) has not helped in university trials/);
  });

  it('renders the source note, readable tabs (no truncated aria-labels) and 12 px detail text', () => {
    const html = render({ gardenWorkspace: 'reference', showPests: true, pestIdx: 5 });
    expect(html).toContain('data-pests-sources');
    expect(html).not.toContain('aria-label="Pests ("');
    expect(html).not.toContain('aria-label="Allies ("');
    expect(html).toMatch(/aria-pressed="true"[^>]*min-h-\[44px\][^>]*>[^<]*Pests \(10\)/);
    expect(html).toContain('Iron phosphate bait');
    expect(html).toContain('Organic control: Iron phosphate bait');
    const pestBlock = html.slice(html.indexOf('Garden Pests &amp; Allies'));
    expect(pestBlock.slice(0, 6000)).not.toContain('text-[0.6875rem]');
  });
});

describe('Nitrogenase line and calendar note', () => {
  it('replaces the unsourced "strongest bonds" claim with a sourced, re-keyed sentence', () => {
    expect(CODE).not.toMatch(/one of the strongest chemical bonds in nature/);
    expect(CODE).toContain("swollen_pink_red_nodules_on_the_roots__v3");
    expect(CODE).toContain('It is the only kind of enzyme that can break the very strong triple bond in nitrogen gas');
    expect(SOURCE).toContain('news.mit.edu/2021/metals-nitrogen-nitrogen-bonds-0527');
  });

  it('shows "timing varies by region" on screen in the seasonal calendar', () => {
    const html = render({ gardenWorkspace: 'reference', showCalendar: true });
    expect(html).toContain('data-calendar-region-note');
    expect(html).toContain('Timing varies by region');
    expect(html).toContain('Check your local frost dates');
  });
});

describe('Canvas and chart text keep a 12 px rendered floor', () => {
  it('every literal canvas font is at least 24 canvas px (2x backing store = 12 CSS px)', () => {
    const sizes = [...CODE.matchAll(/\.font\s*=\s*'([^']*?)(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[2]));
    expect(sizes.length).toBeGreaterThan(5);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
  });

  it('garden-scene computed fonts all pass through the 12 px floor helper', () => {
    const start = CODE.indexOf('function companionDrawGardenScene(');
    const end = CODE.indexOf('function CompanionGrowthReplay(');
    const scene = CODE.slice(start, end);
    expect(scene).toContain('function gfs(px) { return Math.max(px, Math.ceil(12.3 / cssTextScale)); }');
    const dynamic = [...scene.matchAll(/\.font\s*=\s*'[^']*'\s*\+\s*([A-Za-z_(][^+;]*)\+\s*'px/g)].map((m) => m[1].trim());
    expect(dynamic.length).toBeGreaterThan(5);
    for (const expr of dynamic) expect(expr).toMatch(/^(gfs\(|size\b|tagFont|titleFont|subFont|previewFont|selectionFont)/);
    // The floor itself: a canvas drawn at half scale needs 25 canvas px for 12.3 CSS px.
    // eslint-disable-next-line no-new-func
    const gfs = new Function('cssTextScale', 'return function gfs(px) { return Math.max(px, Math.ceil(12.3 / cssTextScale)); };')(0.5);
    expect(gfs(17)).toBe(25);
    expect(gfs(17) * 0.5).toBeGreaterThanOrEqual(12);
    expect(gfs(32)).toBe(32);
  });

  it('soil-history chart labels are 12 px HTML, not viewBox-scaled SVG text', () => {
    const soilHistory = [
      { day: 2, nitrogen: 42, phosphorus: 30, potassium: 35, ph: 6.4, organic: 3.1, event: null },
      { day: 3, nitrogen: 41.7, phosphorus: 27.5, potassium: 33.5, ph: 6.4, organic: 3.15, event: null },
      { day: 4, nitrogen: 42.2, phosphorus: 28, potassium: 34, ph: 6.4, organic: 3.25, event: 'Compost delivery' },
    ];
    const html = render({ gardenMode: 'community', communityGarden: { phase: 'grow', grid: emptyGrid(), soilDiagramFocus: 'phosphorus', soilHistory, phosphorus: 28 } });
    const svg = html.slice(html.indexOf('data-soil-history-chart="phosphorus"'));
    expect(svg.slice(0, svg.indexOf('</svg>'))).not.toContain('<text');
    expect((html.match(/data-soil-history-label="value"/g) || []).length).toBe(3);
    expect((html.match(/data-soil-history-label="day"/g) || []).length).toBe(3);
    expect((html.match(/data-soil-history-label="axis"/g) || []).length).toBe(3);
    expect(html).toMatch(/class="cp-soil-lbl cp-soil-fday"[^>]*data-soil-history-label="forecast-day"[^>]*>D5 forecast/);
    // 12 px floor that grows with the chart like the old SVG text did (9/600 of the width), capped at 18 px.
    expect(html).toContain('.cp-soil-lbl{position:absolute;font-size:12px;font-size:clamp(12px,1.45cqw,18px)');
    expect((html.match(/class="cp-soil-lbl[^"]*"/g) || []).length).toBe(3 + 6 + 2);
    // Middle labels may hide on narrow charts; the first and last never do.
    expect(html).toContain('@container (max-width: 520px){.cp-soil-mid{display:none}');
    expect((html.match(/class="cp-soil-lbl cp-soil-mid"/g) || []).length).toBe(2);
  });

  it('nitrogen labels moved off the Sisters canvas into a 12 px legend', () => {
    expect(CODE).not.toContain("ctx.fillText('N₂→NH₃'");
    expect(CODE).not.toContain("ctx.fillText('N₂', p.x, p.y)");
    const html = render({ phase: 'grow', cornPlanted: true, beansPlanted: true, squashPlanted: true, growthTime: 60 });
    expect(html).toMatch(/data-canvas-legend="sisters"[^>]*>Glowing green dots on the bean roots are nodules/);
    expect(render({ phase: 'plant' })).not.toContain('data-canvas-legend="sisters"');
  });

  it('microscope ion names and scale notes live in an HTML legend', () => {
    const grid = emptyGrid();
    grid[2] = { plantId: 'beans', growthDay: 20, health: 95, watered: false, pests: 0 };
    const chem = render({ gardenMode: 'community', communityGarden: { phase: 'grow', grid, microscopeCell: 2, microscopeLayer: 'chemistry' } });
    expect(chem).toMatch(/data-canvas-legend="microscope"[^>]*data-microscope-legend="chemistry"/);
    expect(chem).toContain('real ions are far too small to see');
    expect(chem).toContain('nitrate');
    const roots = render({ gardenMode: 'community', communityGarden: { phase: 'grow', grid, microscopeCell: 2, microscopeLayer: 'roots' } });
    expect(roots).toContain('Blue dot pairs: nitrogen gas');
    expect(CODE).not.toMatch(/mx\.fillText\(mol\.label/);
    expect(CODE).not.toMatch(/'400x' : activeLayer === 'fungi'/);
  });
});

describe('Dead XP flag removed', () => {
  it('skipNextPlantXPPlot is gone and planting or undoing a plant never awards XP', () => {
    expect(SOURCE).not.toContain('skipNextPlantXPPlot');
    const ids = [...CODE.matchAll(/awardStemXP\('([a-z_]+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) expect(id).not.toMatch(/place|undo|plant_plot|planting_plot/);
  });
});
