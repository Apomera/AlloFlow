(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PyodideRuntime) {
  console.log('[CDN] PyodideRuntime already loaded, skipping');
  return;
}

// pyodide_runtime_module.js — Pyodide-based Python sandbox for AlloFlow.
//
// Phase 2 of the Report Writer accuracy layer. Phase 1 added Gemini's
// server-side code execution for mid-generation sanity. This module adds
// client-side Python that runs deterministic post-generation checks
// (score-classification table lookups, numerical existence in fact chunks,
// date math, citation existence, etc.).
//
// Architecture:
//   • Lazy singleton — Pyodide (~10MB) is only fetched after first .get()
//   • One shared `pyodideInstance` across all callers; one shared init promise
//     so concurrent callers don't trigger duplicate downloads
//   • All checks live in `REPORT_CHECKS_PY` below — pure-Python, no I/O
//   • Public API:
//       PyodideRuntime.warmup()       — start download, returns promise
//       PyodideRuntime.ready()        — true once loaded
//       PyodideRuntime.run(code)      — eval Python, return JS value
//       PyodideRuntime.runAudit(opts) — run report_checks.audit(...) and
//                                       return findings array
//
// Phase 3 will fill REPORT_CHECKS_PY with the real check library; Phase 2
// ships just the runtime + smoke tests so the wiring is verifiable.

// ── Configuration ────────────────────────────────────────────────────
// Pinned version for reproducibility. Bump when Pyodide ships a new release
// and we've validated it still passes report_checks tests.
const PYODIDE_VERSION = '0.27.5';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// ── Embedded Python: report_checks ───────────────────────────────────
// Phase 2 ships a stub. Phase 3 fills out the real checks. Keeping it inline
// here (rather than fetching a .py file) means: (a) one CDN round-trip,
// (b) the JS module's version pins the Python's version automatically.
const REPORT_CHECKS_PY = `
"""
report_checks — deterministic accuracy checks for AlloFlow Report Writer.

Phase 2: scaffolding + smoke test only. Phase 3 will add:
  - classify_standard_score(test_name, score) -> (label, range)
  - classify_t_score(test_name, score) -> (label, range)
  - ss_to_percentile(score) and inverse
  - find_numeric_claims(text) -> [(value, context)]
  - verify_claim_in_chunks(claim_value, fact_chunks, tolerance=1.0)
  - parse_dates(text) -> [datetime]
  - check_date_math(text) -> [finding]
  - flesch_kincaid(text) -> float
  - check_citations(text, fact_chunks) -> [finding]
  - audit(report_sections, fact_chunks, score_entries) -> [finding]
"""
import math
import json
from typing import Any

VERSION = "0.1.0-stub"

def smoke_test() -> dict:
    """Confirms Pyodide is alive and math works."""
    return {
        "version": VERSION,
        "math_works": (2 + 2 == 4),
        "sqrt_2": math.sqrt(2),
    }

def audit(report_sections_json: str, fact_chunks_json: str, score_entries_json: str) -> str:
    """
    Phase 2 stub. Returns an empty findings array so the JS pipeline can wire
    it in safely. Phase 3 fills this out.
    """
    try:
        report_sections = json.loads(report_sections_json) if report_sections_json else {}
        fact_chunks = json.loads(fact_chunks_json) if fact_chunks_json else []
        score_entries = json.loads(score_entries_json) if score_entries_json else []
    except json.JSONDecodeError as e:
        return json.dumps([{
            "source": "python",
            "severity": "low",
            "section": "_setup",
            "claim": "input parse",
            "finding": f"Could not parse audit input JSON: {e}",
            "status": "error",
        }])

    findings = []
    # Phase 3 plugs in actual checks here. Example shape of a finding:
    # {
    #   "source": "python",
    #   "severity": "high",        # "high" | "medium" | "low"
    #   "section": "Cognitive",    # which report section the issue is in
    #   "claim": "SS 95 (Above Average)",
    #   "finding": "SS 95 classifies as Average per WISC-V table, not Above Average.",
    #   "status": "contradicts",   # "verified" | "contradicts" | "unsourced" | "info"
    #   "fix_hint": "Replace 'Above Average' with 'Average'.",
    # }
    return json.dumps(findings)
`;

// ── Singleton state ─────────────────────────────────────────────────
let _pyodide = null;
let _initPromise = null;
let _loadStartedAt = null;

// Dynamically inject the Pyodide loader script. Returns a promise that
// resolves once `window.loadPyodide` is callable.
function _loadPyodideScript() {
  if (typeof window.loadPyodide === 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PYODIDE_CDN + 'pyodide.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pyodide.js from ' + script.src));
    document.head.appendChild(script);
  });
}

async function _init() {
  if (_pyodide) return _pyodide;
  _loadStartedAt = Date.now();
  console.log('[PyodideRuntime] Initializing… (~10MB download on first load)');
  await _loadPyodideScript();
  _pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN });
  // Inject the report_checks module into the Pyodide filesystem so we can
  // `import report_checks` cleanly from any caller.
  _pyodide.runPython('import sys; sys.path.insert(0, "/")');
  _pyodide.FS.writeFile('/report_checks.py', REPORT_CHECKS_PY);
  // Eager import to surface any syntax errors at boot, not at first audit.
  _pyodide.runPython('import report_checks');
  const elapsed = ((Date.now() - _loadStartedAt) / 1000).toFixed(1);
  console.log(`[PyodideRuntime] Ready in ${elapsed}s`);
  return _pyodide;
}

// ── Public API ──────────────────────────────────────────────────────
const PyodideRuntime = {
  /** Start the download in the background; returns the init promise. */
  warmup() {
    if (!_initPromise) _initPromise = _init();
    return _initPromise;
  },

  /** True once Pyodide is loaded and report_checks is importable. */
  ready() {
    return _pyodide !== null;
  },

  /** Run an arbitrary Python expression. Used for smoke tests + debugging. */
  async run(code) {
    const py = await this.warmup();
    return py.runPython(code);
  },

  /** Phase 2 smoke test — confirms Pyodide is alive end-to-end. */
  async smokeTest() {
    const py = await this.warmup();
    const result = py.runPython('import report_checks, json; json.dumps(report_checks.smoke_test())');
    return JSON.parse(result);
  },

  /**
   * Run the report_checks audit. Returns an array of findings in the same
   * shape the JS-side reconciliation engine already consumes from the LLM
   * audit passes, just with `source: "python"`.
   *
   * Phase 2 returns []. Phase 3 fills out the real checks.
   *
   * @param {object} opts
   * @param {object} opts.reportSections   { sectionName: "text...", ... }
   * @param {array}  opts.factChunks       [{ id, type, text, verified, ... }]
   * @param {array}  opts.scoreEntries     [{ assessment, subtest, score, scoreType, classification, ... }]
   */
  async runAudit({ reportSections = {}, factChunks = [], scoreEntries = [] } = {}) {
    const py = await this.warmup();
    // Pass everything through JSON to avoid Pyodide proxy lifetime headaches.
    const sectionsJson = JSON.stringify(reportSections);
    const chunksJson = JSON.stringify(factChunks);
    const scoresJson = JSON.stringify(scoreEntries);
    // Bind into the Python globals so we don't have to escape them into a code string.
    py.globals.set('_rw_sections_json', sectionsJson);
    py.globals.set('_rw_chunks_json', chunksJson);
    py.globals.set('_rw_scores_json', scoresJson);
    const result = py.runPython(
      'import report_checks; ' +
      'report_checks.audit(_rw_sections_json, _rw_chunks_json, _rw_scores_json)'
    );
    try { return JSON.parse(result); }
    catch (e) {
      console.error('[PyodideRuntime] audit() returned non-JSON:', result);
      return [];
    }
  },
};

// ── Registration ─────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PyodideRuntime = PyodideRuntime;
  console.log('[PyodideRuntime] Registered (lazy — no download yet)');
}
})();
