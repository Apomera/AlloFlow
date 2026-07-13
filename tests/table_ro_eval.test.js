// Table / reading-order golden-master EVAL HARNESS (2026-06-14).
//
// Part A of the Beat-Adobe-on-3 / golden-master plans: a reproducible TEDS +
// reading-order score over a fixed corpus WITH ground truth, asserted against
// committed baselines so prompt/model/emitter changes can't silently regress.
//
// CI-SAFE BY DESIGN: the vision extraction that produces tables is Canvas-only,
// so this harness never calls Gemini. It scores two CI-runnable things:
//   - mode 'emit'     : run the REAL deterministic _emitAccessibleTableHtml on a
//                       fixture grid → TEDS vs hand-authored ground-truth HTML.
//                       (Regression-guards the shipped emitter.)
//   - mode 'captured' : score a STORED pipeline output (captured once from a
//                       Canvas run, or an OmniDocBench reference) vs ground truth.
//                       (The slot for the real "beat-Adobe" corpus.)
// Reading-order fixtures score a captured block order vs the reference order.
//
// Add real corpus items as fixtures under tests/fixtures/table_ro/ (see the
// README there for OmniDocBench licensing + how to capture AlloFlow outputs).
// Re-baseline after a deliberate improvement by editing table_ro_baselines.json.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { teds, tedsStruct } from './lib/teds.js';
import { readingOrderDistance } from './lib/edit_distance.js';

const FIX_DIR = resolve(process.cwd(), 'tests/fixtures/table_ro');
const BASELINE_FILE = resolve(process.cwd(), 'tests/fixtures/table_ro_baselines.json');

// Runtime-extract the REAL shipped emitter (anti-drift), so 'emit' fixtures
// exercise production code, not a copy.
function loadEmitter() {
  const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
  const start = src.indexOf('function _validateTableGrid(grid) {');
  const end = src.indexOf('var createDocPipeline = function(deps) {', start);
  if (start === -1 || end === -1) return null;
  const slice = src.slice(start, end);
  try { return new Function('warnLog', slice + '; return _emitAccessibleTableHtml;')(() => {}); }
  catch (_) { return null; }
}
const _esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function loadFixtures() {
  if (!existsSync(FIX_DIR)) return [];
  return readdirSync(FIX_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => { try { return JSON.parse(readFileSync(resolve(FIX_DIR, f), 'utf8')); } catch (_) { return null; } })
    .filter(Boolean);
}
function loadBaselines() {
  if (!existsSync(BASELINE_FILE)) return {};
  try { return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')); } catch (_) { return {}; }
}

const fixtures = loadFixtures();
const baselines = loadBaselines();
const emitter = loadEmitter();

describe('table / reading-order golden master', () => {
  if (fixtures.length === 0) {
    it('has no fixtures yet (add corpus under tests/fixtures/table_ro/) — see README', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const report = [];
  for (const fx of fixtures) {
    it(`[${fx.kind}] ${fx.name} meets its baseline`, () => {
      let score, metric;
      if (fx.kind === 'table') {
        let producedHtml;
        if (fx.mode === 'emit') {
          expect(emitter, 'could not extract _emitAccessibleTableHtml').toBeTypeOf('function');
          producedHtml = emitter(fx.inputGrid, { sanitize: _esc });
        } else {
          producedHtml = fx.captured;
        }
        metric = fx.metric === 'tedsStruct' ? 'tedsStruct' : 'teds';
        score = metric === 'tedsStruct' ? tedsStruct(producedHtml, fx.groundTruth) : teds(producedHtml, fx.groundTruth);
        const base = (baselines[fx.name] && typeof baselines[fx.name].minScore === 'number') ? baselines[fx.name].minScore : 0.99;
        report.push({ name: fx.name, metric, score: +score.toFixed(4), baseline: base, info: !!fx.informational });
        // 'informational' fixtures (e.g. a fresh real-corpus item whose baseline
        // isn't trusted yet) REPORT but do not block — the plans' "informational
        // first, promote to blocking once stable" policy, done per-fixture so we
        // never need to teach verify_all about vitest.
        if (fx.informational) { if (score < base - 1e-9) console.warn(`[table_ro_eval][info] ${fx.name} ${metric} ${score.toFixed(4)} < baseline ${base}`); }
        else expect(score, `${fx.name} ${metric} ${score.toFixed(4)} < baseline ${base}`).toBeGreaterThanOrEqual(base - 1e-9);
      } else if (fx.kind === 'reading-order') {
        metric = 'reading-order-dist';
        score = readingOrderDistance(fx.captured, fx.groundTruth);
        const maxDist = (baselines[fx.name] && typeof baselines[fx.name].maxDistance === 'number') ? baselines[fx.name].maxDistance : 0.0;
        report.push({ name: fx.name, metric, score: +score.toFixed(4), baseline: '≤' + maxDist, info: !!fx.informational });
        if (fx.informational) { if (score > maxDist + 1e-9) console.warn(`[table_ro_eval][info] ${fx.name} reading-order ${score.toFixed(4)} > max ${maxDist}`); }
        else expect(score, `${fx.name} reading-order distance ${score.toFixed(4)} > max ${maxDist}`).toBeLessThanOrEqual(maxDist + 1e-9);
      } else {
        throw new Error('unknown fixture kind: ' + fx.kind);
      }
    });
  }

  it('prints the comparative score report', () => {
    // Visible in `vitest --reporter=verbose`; a placeholder for the eventual
    // Adobe-comparison panel (run once, offline — Adobe scores 0/error on the
    // BAD_PDF_COMPLEX_TABLE cases, which is the headline).
    if (report.length) {
      // eslint-disable-next-line no-console
      console.log('\n[table_ro_eval] ' + report.length + ' fixture(s):\n' +
        report.map((r) => `  ${r.metric.padEnd(18)} ${String(r.score).padEnd(8)} (baseline ${r.baseline})${r.info ? ' [info]' : ''}  ${r.name}`).join('\n'));
    }
    expect(true).toBe(true);
  });
});
