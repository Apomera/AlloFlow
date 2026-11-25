// Accuracy audit, 2026-11-24 (Companion Planting). Folklore stated as fact was removed or labelled, unsourced numbers were
// cut, every modeled companion pair carries an evidence grade, and two panels became predict-first.
// Fail-first check: CP_TOOL_FILE=C:/tmp/sports_labs_1123/companionplanting/start.js npx vitest run <this file>
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CP_TOOL_FILE || 'stem_lab/stem_tool_companionplanting.js';
const TOOL_ID = 'companionPlanting';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// Student-facing code only: drop whole-line comments (the source notes quote the old claims on purpose).
const CODE = SOURCE.split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n');

function render(data) {
  resetStemLab();
  loadTool(FILE, TOOL_ID);
  return renderTool(TOOL_ID, { companionPlanting: data || {} });
}

// Pull an array literal such as `var quizzes = [ ... ];` out of the source and evaluate it (plain data only).
function extractArray(name, stubs) {
  const start = SOURCE.indexOf('var ' + name + ' = [');
  if (start < 0) return null;
  let depth = 0, i = SOURCE.indexOf('[', start), end = -1;
  for (; i < SOURCE.length; i++) {
    const ch = SOURCE[i];
    if (ch === '\'' || ch === '"') { const q = ch; i++; while (i < SOURCE.length && SOURCE[i] !== q) { if (SOURCE[i] === '\\') i++; i++; } continue; }
    if (ch === '[') depth++;
    if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = SOURCE.slice(SOURCE.indexOf('[', start), end + 1);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', 'return ' + body)(stubs || ((key, text) => text));
}

afterEach(() => { vi.restoreAllMocks(); });

describe('Companion Planting accuracy audit (2026-11-24)', () => {
  it('no longer states the unsourced numbers and folklore found in the audit', () => {
    const banned = [
      /5,000\+? aphids/i, /Pollinates 80%/, /200\+ aphids/, /connects? 90% of plant species/, /90% of plant species/,
      /100-1000\s*[x×]/, /100\u20131000x/, /EROI/, /500 lbs CO/, /43x LESS water/, /living mulch cuts water use 40-60%/i,
      /Basil repels/, /Marigold roots kill/, /kills? root-knot nematodes/i, /Solitary bees pollinate 95%/, /Dill cross-pollinates/,
      /mine minerals from subsoil/, /80 offspring per week/, /3x their body weight/, /up to 3,000 miles/, /holding 20× its weight/,
      /5× more nitrogen and 7× more phosphorus/, /harvest in spring/, /Bolts in heat >\d+/, /Prickly stems deter animal pests\./,
      /every breath you take was made by a plant/, /Add gypsum, compost, and sand/, /add 50-200 lbs N\/acre/, /saves \$200\+/,
    ];
    const found = banned.filter((re) => re.test(CODE)).map(String);
    expect(found).toEqual([]);
  });

  it('grades every modeled companion pair and keeps garden tradition from outscoring tested mechanisms', () => {
    const pairs = extractArray('CG_COMPANIONS');
    expect(pairs.length).toBeGreaterThan(30);
    const grades = new Set(pairs.map((p) => p.evidence));
    expect([...grades].sort()).toEqual(['mixed', 'tested', 'tradition']);
    for (const pair of pairs) {
      expect(['tested', 'mixed', 'tradition']).toContain(pair.evidence);
      if (pair.evidence === 'tradition') {
        expect(Math.abs(pair.bonus)).toBeLessThanOrEqual(5);
        expect(pair.desc).toMatch(/tradition/i);
      }
      if (pair.evidence === 'mixed') expect(Math.abs(pair.bonus)).toBeLessThanOrEqual(8);
    }
    // The strongest helpful pairs are all tested mechanisms (Three Sisters structure, onion/carrot fly, living mulch).
    const top = pairs.filter((p) => p.bonus > 0).sort((a, b) => b.bonus - a.bonus).slice(0, 5);
    expect(top.every((p) => p.evidence === 'tested')).toBe(true);
    // The reference guide grades its pairs too.
    const guide = extractArray('COMPANION_PAIRS');
    expect(guide.every((p) => ['tested', 'mixed', 'tradition'].includes(p.evidence))).toBe(true);
  });

  it('derives the water-footprint bars from the cited litres-per-kilogram averages', () => {
    const rows = extractArray('WATER_FOOTPRINT');
    const litresPerKg = { Vegetables: 300, Potatoes: 400, Fruit: 1000, Grains: 1600, 'Dry beans': 4000, Chicken: 4300, Beef: 15400 };
    expect(rows.map((r) => r.crop).sort()).toEqual(Object.keys(litresPerKg).sort());
    const galPerLbPerLPerKg = 0.264172 / 2.20462;
    for (const row of rows) expect(row.gallons).toBe(Math.round(litresPerKg[row.crop] * galPerLbPerLPerKg));
  });

  it('gives every wrong quiz option its own misconception note and avoids answer-position and length cues', () => {
    const quizzes = extractArray('quizzes');
    for (const q of quizzes) {
      for (const opt of q.opts) if (opt !== q.correct) expect(q.why && q.why[opt], q.q + ' / ' + opt).toBeTruthy();
      const longest = Math.max(...q.opts.map((o) => o.length));
      const correctIsUniqueLongest = q.correct.length === longest && q.opts.filter((o) => o.length === longest).length === 1;
      if (correctIsUniqueLongest) expect(q.correct.length - Math.max(...q.opts.filter((o) => o !== q.correct).map((o) => o.length))).toBeLessThan(8);
    }
    // Positions after the tool's load-time rotation ((i * 7 + 3) % n) are not all the same slot.
    const slots = quizzes.map((q, i) => (q.opts.indexOf(q.correct) + ((i * 7) + 3) % q.opts.length) % q.opts.length);
    expect(new Set(slots).size).toBeGreaterThan(1);
    expect(CODE).toMatch(/currentQuiz\.why && currentQuiz\.why\[opt\]/);
  });

  it('hides each pair\'s evidence grade until the student guesses, then reveals it', () => {
    const hidden = render({ gardenWorkspace: 'reference', showPairs: true, pairGuessMode: true });
    expect(hidden).toContain('data-pair-guess-mode="true"');
    expect(hidden).toContain('data-pair-evidence="hidden"');
    expect(hidden).not.toContain('data-pair-evidence-badge');
    const guessed = render({ gardenWorkspace: 'reference', showPairs: true, pairGuessMode: true, pairGuesses: { 'Tomato+Basil': 'tradition' } });
    expect(guessed).toContain('data-pair-evidence-badge="mixed"');
    expect(guessed).toContain('You guessed Garden tradition');
    expect(guessed).toContain('data-pair-guess-score="0/1"');
    const reading = render({ gardenWorkspace: 'reference', showPairs: true });
    expect(reading).toContain('data-pair-evidence-badge="tested"');
    expect(reading).toContain('data-pair-evidence-badge="tradition"');
  });

  it('asks for a food-miles prediction before showing the evidence, and shows no invented emissions numbers', () => {
    const before = render({ gardenWorkspace: 'systems', showFoodMiles: true });
    expect(before).toContain('data-food-miles-choice="distance"');
    expect(before).toContain('data-food-miles-choice="kind"');
    expect(before).not.toContain('data-food-miles-result');
    expect(before).not.toMatch(/kg CO|\d MJ/);
    const wrong = render({ gardenWorkspace: 'systems', showFoodMiles: true, foodMilesPrediction: 'distance' });
    expect(wrong).toContain('data-food-miles-result="distance"');
    expect(wrong).toContain('Not quite.');
    const right = render({ gardenWorkspace: 'systems', showFoodMiles: true, foodMilesPrediction: 'kind' });
    expect(right).toContain('under 10%');
  });

  it('compares farming systems in words, without the invented EROI and score bars', () => {
    const html = render({ gardenWorkspace: 'systems', showFarmCompare: true, farmSystemIdx: 'regenerative' });
    expect(html).toContain('data-farm-compare-note');
    expect(html).not.toMatch(/EROI|x return|\/100</);
    expect(html).toContain('Still being studied');
  });

  it('shows each neighbor pair\'s evidence grade in the crop inspector', () => {
    const grid = Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
    const put = (i, plantId) => { grid[i] = { plantId, growthDay: 30, health: 95, watered: false, pests: 0 }; };
    put(5, 'tomato'); put(4, 'basil'); put(6, 'potato'); put(1, 'carrot');
    const html = render({ gardenMode: 'community', communityGarden: { phase: 'plan', grid, relationshipLens: true, relationshipFocus: 5 } });
    expect(html).toContain('data-inspector-pair-evidence="tradition"');
    expect(html).toContain('Supports growth · Garden tradition');
    expect(html).toContain('Supports growth · Mixed results');
    expect(html).toContain('Growth conflict · Tested');
  });

  it('tells the AI advisor to separate garden tradition from evidence', () => {
    expect(CODE).toMatch(/Many "companion plant" pairings are garden tradition/);
  });
});
