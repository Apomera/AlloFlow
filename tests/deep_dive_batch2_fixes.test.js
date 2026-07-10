// Deep dive 2026-07-09, batch 2 (H4/H5/H6/H7) — goldens + anti-drift pins.
//
// H4 — the page-edge strip's >=2-page digitless-key rule deleted repeated CONTENT headings
//      ("Chapter 3" + "Chapter 7" both key `chapter`) from the OCR ground truth, silently. Now a key
//      qualifies by frequency (>=max(3, 40% of pages)) OR folio consistency (digits track the page
//      index with one constant offset — the verso/recto alternating-head shape), and the deleted
//      line TEXT is disclosed via a fidelity note (it used to ride out only as digits).
// H5 — assessment mode promised "the file no longer contains the key in any form" but only blanked
//      MCQ data-correct: every concept-sort strip shipped its correct category in data-category-id
//      and the self-grade Check button stayed live. Now strip ids are blanked (dropzones keep
//      theirs) and .alloflow-cs-controls is hidden.
// H6 — the placement/reading-order warning lived ONLY in integrityWarning (3-second toast + the
//      downloadable report) — no persistent render; the fidelity panel could simultaneously claim
//      "100% preserved". Now it also rides _structuralFidelityNotes as kind:'placement' (drives
//      fidelityLimited + the panel; the report dedupe already skips notes integrityWarning contains).
// H7 — the batch per-file wall was a bare Promise.race: a timed-out file kept running as a zombie
//      under the next file. Now each file gets its own AbortController in the __alloPdfAbortSignal
//      slot (aborted in finally → kills the zombie's in-flight/queued calls), and the main fix loop
//      self-terminates before the wall so keep-best work ships instead of being discarded.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

let strip;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  strip = window.AlloModules.createDocPipeline.stripPageEdgeArtifacts;
  expect(typeof strip).toBe('function');
});

describe('H4 — repeated content headings are KEPT; real running heads still strip (LIVE)', () => {
  it('"Chapter 3" + "Chapter 7" on realistically-spaced pages survive (the old rule deleted both)', () => {
    const pages = [
      'Chapter 3\n\nThe water cycle begins with evaporation.',
      'body page one.', 'body page two.', 'body page three.', 'body page four.',
      'Chapter 7\n\nCondensation forms clouds in the upper air.',
      'body page five.', 'body page six.', 'body page seven.', 'body page eight.',
    ];
    const r = strip(pages);
    expect(r.texts[0]).toContain('Chapter 3');   // offsets 3 and 2 — NOT folio-consistent, count 2 < max(3,40%)
    expect(r.texts[5]).toContain('Chapter 7');
    expect(r.folios).toEqual([]);                // no legitimate "3"/"7" primed into the folio-leak net
    expect(r.strippedLines).toEqual([]);
  });
  it('verso/recto alternating heads (each on only HALF the pages) still strip via folio consistency', () => {
    const pages = [
      '90 HIGH-IMPACT ASSESSMENT REPORTS\n\nbody a.',
      'Consumer-Responsive Report Writing 91\n\nbody b.',
      '92 HIGH-IMPACT ASSESSMENT REPORTS\n\nbody c.',
      'Consumer-Responsive Report Writing 93\n\nbody d.',
    ];
    const r = strip(pages);
    expect(r.texts[0]).not.toContain('HIGH-IMPACT');
    expect(r.texts[1]).not.toContain('Report Writing 91');
    expect(r.folios).toEqual(expect.arrayContaining(['90', '91', '92', '93']));
    // H4's disclosure half: the deleted TEXT is reported, not just its digits
    expect(r.strippedLines.length).toBe(4);
    expect(r.strippedLines.join(' ')).toContain('HIGH-IMPACT ASSESSMENT REPORTS');
  });
  it('an inconsistent-offset repeat stays even at count 2 on a tiny doc', () => {
    const pages = ['Question 5\nSolve for x.', 'Question 9\nSolve for y.', 'notes page.'];
    const r = strip(pages);
    expect(r.texts[0]).toContain('Question 5'); // offsets 5 and 8 — kept
    expect(r.texts[1]).toContain('Question 9');
  });
  it('wiring pins: strippedEdgeLines threads reconcile → window stash → gated fidelity note', () => {
    expect(dp).toContain('strippedEdgeLines: _edge.strippedLines || []');
    expect(dp).toContain('window.__alloStrippedEdgeLines = (rec && rec.strippedEdgeLines) || []');
    expect(dp).toContain("kind: 'pageEdge'");
    // read is staleness-gated like the echo-collapse note (a born-digital doc after a scanned one
    // must not inherit the stash)
    expect(dp).toContain("const _sel = (_heavyScanned && typeof window !== 'undefined' && Array.isArray(window.__alloStrippedEdgeLines)) ? window.__alloStrippedEdgeLines : [];");
  });
});

describe('H5 — assessment mode withholds the concept-sort key (behavioral slice)', () => {
  const start = dp.indexOf('let _packHtml = rawHtml;');
  const end = dp.indexOf('// Run WCAG sanitizer', start);
  const postProcess = new Function('rawHtml', 'cfg', dp.slice(start, end) + '\nreturn _packHtml;');
  const FIXTURE = '<html><head></head><body>'
    + '<div class="question" data-correct="2">MCQ</div>'
    + '<div role="listitem" class="alloflow-cs-dropzone" data-category-id="cat-a" data-category-color="#123">Zone</div>'
    + '<div role="listitem" class="alloflow-cs-strip" data-strip-idx="0" data-category-id="cat-a" style="x">Strip</div>'
    + '<div class="alloflow-cs-controls" data-cs-section="s1"><button>Check</button></div>'
    + '</body></html>';

  it('blanks MCQ data-correct AND strip data-category-id; dropzones keep theirs; controls hidden', () => {
    const out = postProcess(FIXTURE, { assessmentMode: true });
    expect(out).toContain('data-correct=""');
    expect(out).not.toContain('data-correct="2"');
    expect(out).toContain('class="alloflow-cs-dropzone" data-category-id="cat-a"'); // placement target intact
    expect(out).toMatch(/alloflow-cs-strip[^>]*data-category-id=""/);               // key withheld
    expect(out).not.toMatch(/alloflow-cs-strip[^>]*data-category-id="cat-a"/);
    expect(out).toContain('.alloflow-cs-controls{display:none !important}');
    expect(out).toContain('.quiz-controls{display:none !important}');
  });
  it('practice mode (assessmentMode off) is untouched', () => {
    const out = postProcess(FIXTURE, {});
    expect(out).toContain('data-correct="2"');
    expect(out).toMatch(/alloflow-cs-strip[^>]*data-category-id="cat-a"/);
    expect(out).not.toContain('.alloflow-cs-controls{display:none');
  });
});

describe('H6 — placement warning rides the persistent fidelity notes', () => {
  it('pipeline: _placeWarn is carried into _structuralFidelityNotes as kind placement', () => {
    expect(dp).toContain('_placementWarn = _placeWarn;');
    expect(dp).toContain("if (_placementWarn) _structuralFidelityNotes.push({ kind: 'placement', msg: _placementWarn });");
  });
  it('report dedupe still guards the doubled text (warning contains the note)', () => {
    // the downloadable report renders integrityWarning + notes and skips a note whose text the
    // warning already contains — placement now relies on that exact guard
    expect(dp).toContain("if (n && n.msg && !(_iw && _iw.indexOf(String(n.msg)) !== -1)) out.push(String(n.msg));");
  });
  it('view: placement notes render amber with their own icon (not the default link glyph)', () => {
    expect(view).toContain("n.kind === 'placement' ? '📑'");
    expect(view).toContain("(n.kind === 'numeric' || n.kind === 'placement') ? 'text-amber-800 font-semibold'");
  });
});

describe('H7 — the batch wall cancels WORK, not just results', () => {
  it('each file gets its own AbortController published into the __alloPdfAbortSignal slot', () => {
    expect(dp).toContain('const _fileCtrl = new AbortController();');
    expect(dp).toContain('window.__alloPdfAbortSignal = _fileCtrl.signal;');
    // finally: abort fires on EVERY exit (kills a wall-orphaned zombie's in-flight/queued calls)
    expect(dp).toContain("try { _fileCtrl.abort(); } catch (_) {} // kills a wall-orphaned zombie's in-flight/queued calls; a no-op on clean completion");
    // and the slot is restored only if it still holds this file's signal
    expect(dp).toContain("if (typeof window !== 'undefined' && window.__alloPdfAbortSignal === _fileCtrl.signal) {");
  });
  it('Stop Batch still cancels the current file (chained to the batch controller)', () => {
    expect(dp).toContain('const _onBatchAbort = () => { try { _fileCtrl.abort(); } catch (_) {} };');
    expect(dp).toContain("_batchAbortCtrl.signal.addEventListener('abort', _onBatchAbort);");
  });
  it('the main fix loop self-terminates before the wall so keep-best work ships', () => {
    expect(dp).toContain('perFileDeadlineTs: _perFileDeadlineTs });');
    expect(dp).toContain('if (loopCtx.perFileDeadlineTs && Date.now() > loopCtx.perFileDeadlineTs - 90000) {');
  });
});
