// Companion Planting round 4 (2026-11-24): released ladybugs mostly fly away (UC IPM), so the release no longer
// halves pests or adds lasting helpers; marigold timing is one sentence citing UF and UC IPM; the workshop soil panel
// has 12 px text and a phone layout for the Whole-soil checkpoint; the microscope fullscreen button is 44 px; an
// opened pest card shows in full; Sisters particles cover the whole scene.
// Fail-first check: CP_TOOL_FILE=C:/tmp/sports_labs_1123/companionplanting/start_r4.js npx vitest run <this file>
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab, newStore, makeCtx, React } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CP_TOOL_FILE || 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
}
function garden(overrides = {}) {
  const grid = emptyGrid();
  grid[0] = { plantId: 'corn', growthDay: 10, health: 95, watered: false, pests: 20 };
  grid[1] = { plantId: 'beans', growthDay: 10, health: 95, watered: false, pests: 20 };
  grid[4] = { plantId: 'squash', growthDay: 10, health: 95, watered: false, pests: 20 };
  return { grid, phase: 'grow', day: 0, budget: 20, moisture: 60, pestPop: 30, beneficialPop: 6, ...overrides };
}
function harness(seed) {
  resetStemLab();
  const config = loadTool(FILE, TOOL_ID);
  const store = newStore({ companionPlanting: { gardenMode: 'community', communityGarden: seed } });
  const state = () => store.toolData.companionPlanting.communityGarden;
  const tree = () => config.render(makeCtx({ toolData: store.toolData, awardXP: vi.fn(), saveSnapshot: vi.fn() }, store));
  function find(key, value = true) {
    const visit = (node) => {
      if (Array.isArray(node)) { for (const child of node) { const m = visit(child); if (m) return m; } return null; }
      if (!React.isValidElement(node)) return null;
      if (node.props[key] === value) return node;
      return visit(node.props.children);
    };
    const node = visit(tree());
    if (!node) throw new Error(`Control not found: ${key}=${value}`);
    return node;
  }
  return { state, find, patch: (p) => Object.assign(state(), p), click: (key, value = true) => find(key, value).props.onClick({ currentTarget: null, stopPropagation() {} }) };
}
function render(data) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, { companionPlanting: data || {} });
}
// The ladybug model lives at module level; evaluate that block on its own.
function ladybugModel() {
  const start = SOURCE.indexOf('  var CP_PREDATOR_EAT_RATE');
  const end = SOURCE.indexOf('  // Evidence grades shared');
  if (start < 0 || end < start) throw new Error('ladybug model block missing');
  // eslint-disable-next-line no-new-func
  return new Function(SOURCE.slice(start, end) + '\nreturn { CP_PREDATOR_EAT_RATE, CP_LADYBUG_RELEASE, companionReleasedBeetlesStep, companionLadybugReleaseForecast };')();
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

afterEach(() => { vi.restoreAllMocks(); });

describe('Released ladybugs follow the UC IPM finding that most fly away', () => {
  it('sources the dispersal claim with the exact UC IPM quote', () => {
    const at = SOURCE.indexOf('var CP_LADYBUG_RELEASE');
    const notes = SOURCE.slice(Math.max(0, at - 1200), at);
    expect(notes).toContain('https://ipm.ucanr.edu/natural-enemies/convergent-lady-beetle/');
    expect(notes).toContain('Most will');
    expect(notes).toContain('fly away from the release site within 1 or 2 days after they are released even if aphids are plentiful');
    expect(notes).toContain('purchased Hippodamia inherently disperse');
  });

  it('the model: 70% leave each day, 91% are gone after two days, and they eat at the wild-helper rate', () => {
    const m = ladybugModel();
    expect(m.CP_PREDATOR_EAT_RATE).toBe(0.15);
    expect(m.companionReleasedBeetlesStep(10)).toEqual({ eaten: 1.5, left: 3 });
    const f = m.companionLadybugReleaseForecast(10, 6, 30);
    expect(f.daysPresent).toBe(3);
    expect(f.days.map((d) => d.present)).toEqual([10, 3, 0.9]);
    expect(f.leftAfterTwoDays / 10).toBeLessThan(0.1);
    expect(f.eaten).toBe(2.1); // 1.5 + 0.45 + 0.135
    expect(f.wildEatenSameDays).toBe(2.7); // 6 units x 0.15 x 3 days
    expect(m.companionLadybugReleaseForecast(10, 6, 1).eaten).toBe(1); // cannot eat more pests than there are
    // The day engine uses the same eat rate for wild helpers.
    expect(CODE.includes('newPestPop = Math.max(0, newPestPop - newBeneficialPop * CP_PREDATOR_EAT_RATE)')).toBe(true);
  });

  it('a release no longer halves pests or adds lasting helpers; it shows the model forecast', () => {
    const f = ladybugModel().companionLadybugReleaseForecast(10, 6, 30);
    const app = harness(garden({ playView: 'workshop' }));
    app.click('aria-label', 'Release ladybugs ($1.50)'); app.click('data-ladybug-predict-choice', 'model'); // round 5: predict first
    const s = app.state();
    expect(s.pestPop).toBe(30);
    expect(s.beneficialPop).toBe(6);
    expect(s.releasedBeetles).toBe(10);
    expect(s.budget).toBe(18.5);
    expect(s.ladybugRelease).toMatchObject({ day: 0, units: 10, eaten: f.eaten, daysPresent: 3, wildUnits: 6, wildEaten: f.wildEatenSameDays });
    // Plots lose the same share the release is forecast to eat (2.1 of 30 pests = 7%).
    expect(s.grid[0].pests).toBeCloseTo(20 * (1 - 2.1 / 30), 6);
    expect(s.lastCareAction.effect).toContain('Most fly away within 1 or 2 days');
    expect(s.lastCareAction.effect).toContain('about 2.1 pests');
    const note = app.find('data-ladybug-release-note');
    expect(note.props.role).toBe('status');
    const html = render({ gardenMode: 'community', communityGarden: s });
    expect(html.includes('Released ladybugs still here: 10 helper units')).toBe(true);
    expect(html.includes('Most bought lady beetles fly away within 1 or 2 days, even when there are lots of aphids (UC IPM).')).toBe(true);
    expect(html.includes('Model forecast: the released beetles still here eat about 2.1 pests over the next 3 days, then they are gone. Your wild helpers (6 on the Beneficials meter) eat about 2.7 in those same days, and they stay.')).toBe(true);
    expect(html.includes('Lasting help: flowers with nectar and pollen keep wild predators in your garden.')).toBe(true);
    expect(CODE.includes('-50% pests, +10 beneficials')).toBe(false);
  });

  it('released beetles eat on the next day and then mostly leave', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const runDay = (app) => { app.patch({ showAdvanceReview: true }); app.click('data-community-run-day'); };
    const withRelease = harness(garden({ playView: 'workshop' }));
    withRelease.click('aria-label', 'Release ladybugs ($1.50)'); withRelease.click('data-ladybug-predict-choice', 'model'); // round 5: predict first
    runDay(withRelease);
    const control = harness(garden({ playView: 'workshop' }));
    runDay(control);
    expect(withRelease.state().day).toBe(1);
    expect(control.state().day).toBe(1);
    expect(withRelease.state().releasedBeetles).toBe(3);
    expect(control.state().releasedBeetles).toBe(0);
    expect(Math.round((control.state().pestPop - withRelease.state().pestPop) * 10) / 10).toBe(1.5);
    expect(withRelease.state().beneficialPop).toBe(control.state().beneficialPop);
    const live = (app) => render({ gardenMode: 'community', communityGarden: app.state() });
    expect(live(withRelease).includes('Released ladybugs still here: 3 helper units')).toBe(true);
    runDay(withRelease);
    expect(withRelease.state().releasedBeetles).toBe(0.9);
    // One day left: the note says "1 day", not "1 days".
    expect(/eat about 0\.1 pests over the next 1 day,/.test(live(withRelease))).toBe(true);
    runDay(withRelease);
    expect(withRelease.state().releasedBeetles).toBe(0);
    const gone = live(withRelease);
    expect(gone.includes('All the released ladybugs have flown away.')).toBe(true);
    expect(gone.includes('data-ladybug-release-model')).toBe(false);
    // Four days after the release the note is gone.
    runDay(withRelease);
    expect(live(withRelease).includes('data-ladybug-release-note')).toBe(false);
  });

  it('a second release stacks the beetles still here and the note counts them all', () => {
    const app = harness(garden({ playView: 'workshop' }));
    app.click('aria-label', 'Release ladybugs ($1.50)'); app.click('data-ladybug-predict-choice', 'model'); // round 5: predict first
    app.click('aria-label', 'Release ladybugs ($1.50)'); app.click('data-ladybug-predict-choice', 'model'); // round 5: predict first
    expect(app.state().releasedBeetles).toBe(20);
    expect(app.state().budget).toBe(17);
    expect(app.state().pestPop).toBe(30);
    const f = ladybugModel().companionLadybugReleaseForecast(20, 6, 30);
    const html = render({ gardenMode: 'community', communityGarden: app.state() });
    expect(html.includes('Released ladybugs still here: 20 helper units')).toBe(true);
    expect(html.includes('eat about ' + f.eaten + ' pests over the next ' + f.daysPresent + ' days')).toBe(true);
  });
});

describe('Marigold timing is one honest sentence citing both sources', () => {
  const SENTENCE = 'Grow French marigolds thick, in the same bed, before the crop: at least two months (University of Florida), and a whole season works best (UC IPM).';

  it('cites UF ENY-056 and UC IPM with exact quotes', () => {
    expect(SOURCE.includes('marigold should be planted at least two months before the desired vegetable crop')).toBe(true);
    expect(SOURCE.includes('The effect of marigolds is greatest when you')).toBe(true);
    expect(SOURCE.includes('grow them as a solid planting for an entire season')).toBe(true);
    expect(SOURCE.includes('Intercropping marigold with other crops to reduce plant-parasitic nematodes does not appear to be')).toBe(true);
  });

  it('the pest card, pair guide, quiz, and tip all carry the same sentence', () => {
    const pests = Object.fromEntries(extractArray('GARDEN_PESTS').map((p) => [p.name, p]));
    expect(pests['Root-Knot Nematode'].companion).toBe(SENTENCE + ' Marigolds tucked in among the crops help little.');
    const pair = extractArray('COMPANION_PAIRS').find((p) => p.plant2 === 'Marigold' && p.plant1 === 'Tomato');
    expect(pair.benefit).toContain(SENTENCE);
    expect(CODE.split(SENTENCE).length - 1).toBe(4);
    expect(CODE.includes('Grow French marigolds thick for at least two months before planting the crop')).toBe(false);
  });
});

describe('Workshop soil panel: 12 px text and a phone layout for the checkpoint table', () => {
  const hist = (n) => Array.from({ length: n }, (_, i) => ({ day: i + 2, season: 'Spring', nitrogen: 40 + (i % 3), phosphorus: 30 - i * 0.8, potassium: 35, ph: 6.4, organic: 3.1 + i * 0.02, event: null, forecast: i > 0 ? { nitrogen: 41, phosphorus: 30 - i * 0.7, potassium: 35.4, ph: 6.4, organic: 3.1 } : undefined }));

  it('has no sub-12 px text classes anywhere in the soil panel source', () => {
    const a = SOURCE.indexOf('// \u2500\u2500 Soil Chemistry + Economics + Pest HUD');
    const b = SOURCE.indexOf('// \u2500\u2500 Year indicator + AI Advisor');
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(SOURCE.slice(a, b)).not.toMatch(/text-\[0\.(4375|5|5625|625|6875)rem\]/);
  });

  it('the Whole-soil checkpoint stacks each pool below 460 px of panel width, with value labels and 44 px Map buttons', () => {
    const html = render({ gardenMode: 'community', communityGarden: { playView: 'workshop', phase: 'grow', grid: emptyGrid(), soilDiagramFocus: 'phosphorus', soilHistory: hist(6), phosphorus: 26 } });
    const at = html.indexOf('data-soil-history-checkpoint-matrix');
    expect(at).toBeGreaterThan(0);
    const block = html.slice(at, html.indexOf('</table>', at));
    expect(block).toContain('data-soil-checkpoint-layout');
    expect(block).toContain('class="cp-ckpt mt-1 overflow-x-auto"');
    expect(html.includes('@container (max-width: 460px)')).toBe(true);
    expect(html).toContain('.cp-ckpt tbody tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto');
    expect((block.match(/class="cp-ckpt-lbl" aria-hidden="true">Predicted</g) || []).length).toBe(5);
    expect((block.match(/class="cp-ckpt-lbl" aria-hidden="true">Observed</g) || []).length).toBe(5);
    expect((block.match(/class="cp-ckpt-lbl" aria-hidden="true">Delta</g) || []).length).toBe(5);
    expect((block.match(/role="row"/g) || []).length).toBe(6);
    expect((block.match(/role="rowheader"/g) || []).length).toBe(5);
    expect((block.match(/role="cell"/g) || []).length).toBe(20);
    expect((block.match(/min-h-\[44px\] min-w-\[44px\][^"]*"[^>]*data-soil-history-checkpoint-inspect/g) || []).length).toBe(5);
  });
});

describe('Touch target, pest list, and Sisters particles', () => {
  it('the microscope fullscreen button is 44 x 44 px', () => {
    expect(CODE.includes("position: 'absolute', top: 8, right: 8, zIndex: 30, width: 44, height: 44")).toBe(true);
    expect(CODE.includes('zIndex: 30, width: 34, height: 34')).toBe(false);
  });

  it('an opened pest card drops the 192 px cap and is scrolled into view', () => {
    const closed = render({ gardenWorkspace: 'reference', showPests: true });
    expect(closed).toMatch(/class="space-y-1 max-h-48 overflow-y-auto" data-pest-list="true"/);
    for (const idx of [0, 9]) {
      const open = render({ gardenWorkspace: 'reference', showPests: true, pestIdx: idx });
      expect(open).toMatch(/class="space-y-1 " data-pest-list="true"/);
      expect(open.includes('data-pest-card="' + idx + '" aria-expanded="true"')).toBe(true);
    }
    expect(CODE.includes("card.scrollIntoView({ block: 'nearest', behavior: rm ? 'auto' : 'smooth' })")).toBe(true);
  });

  it('Sisters particles spread over the whole backing store and hold still under reduced motion', () => {
    expect(/Math\.random\(\) \* cW \/ dpr/.test(CODE)).toBe(false);
    expect(/cH \* 0\.35 \/ dpr/.test(CODE)).toBe(false);
    expect(CODE.includes('particles.push({ x: Math.random() * cW, y: cH * (0.08 + Math.random() * 0.77),')).toBe(true);
    expect(CODE.includes('if (p.y < -10 || p.life > 250) { p.y = cH * (0.3 + Math.random() * 0.55); p.x = Math.random() * cW; p.life = 0; }')).toBe(true);
    expect(CODE.includes('if (cpRM) { p.life = 100; } else {')).toBe(true);
  });
});
