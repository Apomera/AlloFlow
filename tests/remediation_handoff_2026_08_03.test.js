// Regressions for the 2026-08-03 remediation-pipeline handoff fixes:
//  (1) _cancelRemediationOperationPrefix must not throw when no operation is owned — the thrown
//      TypeError made Preview X / Escape / bottom Close / Generate Tagged PDF all inert.
//  (2) Auto-continuation ownership is an explicit end-to-end transport parameter: every
//      aiFixChunked / auto-fix / re-audit Gemini call passes the loop's owner so heartbeats carry
//      the LIVE run identity and the host watchdog re-arms on real activity.
//  (3) A watchdog cancellation is attributed to the watchdog, never to an invented newer run.
//  (4) Preview "Generate Tagged PDF" calls the shared export directly (no 220ms DOM-click relay),
//      hands over the just-captured edited HTML, and queues behind active continuation.
//  (5) PDF/UA-1 s7.2 t10: every TR child in the built tag tree resolves to TH or TD, with nested
//      tables nesting beneath their cell.
//  (6) Short exact-duplicate sentences and truncated curly/straight-quote fragments are never
//      appended to the "Preserved source content" block; genuinely missing content still is.
//  (7) The print-style download uses the requested filename for the document title and is
//      labeled unverified.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const VIEW_SRC = fs.readFileSync(path.resolve(__dirname, '../view_pdf_audit_source.jsx'), 'utf8');
const PIPE_SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
const MISC_SRC = fs.readFileSync(path.resolve(__dirname, '../misc_handlers_source.jsx'), 'utf8');
const ANTI_SRC = fs.readFileSync(path.resolve(__dirname, '../AlloFlowANTI.txt'), 'utf8');

const sliceBetween = (src, startMarker, endMarker, label) => {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error('start marker missing for ' + label);
  const e = src.indexOf(endMarker, s);
  if (e < 0) throw new Error('end marker missing for ' + label);
  return src.slice(s, e + endMarker.length);
};

// ── (1) prefix-cancel helper: runtime extraction ────────────────────────────────────────────────
const cancelPrefixCode = sliceBetween(
  VIEW_SRC,
  'const _cancelRemediationOperationPrefix = (prefix) => {',
  '\n  };',
  '_cancelRemediationOperationPrefix'
);
const makeCancelPrefix = (current, cancelSpy) => new Function(
  '_remediationOperationOwnerRef', '_cancelRemediationOperation',
  cancelPrefixCode + '\n; return _cancelRemediationOperationPrefix;'
)({ current: { getCurrent: () => current } }, cancelSpy);

describe('preview controls: _cancelRemediationOperationPrefix', () => {
  it('returns false and does NOT throw when no operation is owned (the inert-buttons bug)', () => {
    const cancel = vi.fn();
    const fn = makeCancelPrefix(null, cancel);
    expect(() => fn('preview-')).not.toThrow();
    expect(fn('preview-')).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  });
  it('still cancels an owned operation whose kind matches the prefix', () => {
    const owned = { metadata: { kind: 'preview-theme' } };
    const cancel = vi.fn(() => true);
    const fn = makeCancelPrefix(owned, cancel);
    expect(fn('preview-')).toBe(true);
    expect(cancel).toHaveBeenCalledWith(owned);
  });
  it('does not cancel an operation of a different kind', () => {
    const cancel = vi.fn();
    const fn = makeCancelPrefix({ metadata: { kind: 'export-tagged' } }, cancel);
    expect(fn('preview-')).toBe(false);
    expect(cancel).not.toHaveBeenCalled();
  });
  it('tolerates an owned operation with no metadata', () => {
    const cancel = vi.fn();
    const fn = makeCancelPrefix({}, cancel);
    expect(() => fn('preview-')).not.toThrow();
    expect(cancel).not.toHaveBeenCalled();
  });
});

// ── (2) explicit ownership plumbing (invariant pins) ────────────────────────────────────────────
describe('auto-continuation ownership propagation', () => {
  it('callGemini accepts an explicit owner in slot 6, duck-typed apart from the signal, and strips it before transport', () => {
    expect(PIPE_SRC).toContain("typeof args[6].aborted !== 'boolean'");
    expect(PIPE_SRC).toContain('Array.prototype.slice.call(args, 0, 6)');
  });
  it('every aiFixChunked call path (full, chunk, image-token retry, half) forwards _control.owner', () => {
    const forwarded = (PIPE_SRC.match(/_control && _control\.signal, _control && _control\.owner\)/g) || []).length;
    expect(forwarded).toBeGreaterThanOrEqual(4);
  });
  it('autoFixAxeViolations stamps the caller-supplied owner on every chunk Gemini call', () => {
    expect(PIPE_SRC).toContain('args[6] = _sessMeta.owner || null;');
  });
  it('auditOutputAccessibility accepts an owner and the auto-continue loop passes its loop owner + trigger', () => {
    expect(PIPE_SRC).toContain('const _outputAuditOwner = (options && options.owner) || null;');
    expect(MISC_SRC).toContain("auditOutputAccessibility(result.html, { signal: _abortCtrl.signal, owner: _loopOwner, trigger: 'auto-continue-round-'");
  });
  it('every output-audit launch carries a trigger label', () => {
    expect(PIPE_SRC).toContain("output audit launched (trigger: ' + ((options && options.trigger) || 'unspecified')");
    // The known launch sites are each labeled.
    for (const trig of ['primary-baseline-verification', 'primary-final-audit', 'fix-pass-reverify', 'post-mutation-reaudit']) {
      expect(PIPE_SRC).toContain(trig);
    }
  });
});

// ── (3) watchdog cancellation attribution ───────────────────────────────────────────────────────
describe('watchdog cancellation is reported as a watchdog cancellation', () => {
  it('the host watchdog records its fire (reason + resulting gen) before bumping the run generation', () => {
    expect(ANTI_SRC).toContain("reason: 'idle-timeout'");
    expect(ANTI_SRC).toContain('window.__alloPdfWatchdogFired = {');
  });
  it('the auto-continue loop names the watchdog instead of inventing a newer document/run', () => {
    expect(MISC_SRC).toContain('_watchdogInvalidatedThisLoop');
    expect(MISC_SRC).toContain('Loop cancelled by the host idle watchdog');
    // Attribution requires the recorded gen to equal the live gen — a genuinely newer run bumps past it.
    expect(MISC_SRC).toContain('_wf.gen === (window.__alloPdfRunGen || 0)');
  });
});

// ── (4) direct shared export instead of the 220ms DOM-click relay ───────────────────────────────
describe('Generate Tagged PDF uses the shared direct export', () => {
  it('the shared export exists and both the results button and preview invoke it with trigger labels', () => {
    expect(VIEW_SRC).toContain('const _runOriginalTaggedPdfExport = async (opts) => {');
    expect(VIEW_SRC).toContain("_runOriginalTaggedPdfExport({ trigger: 'results-button' })");
    expect(VIEW_SRC).toContain("_runOriginalTaggedPdfExport({ trigger: 'preview-generate', resultOverride: _editedResult || undefined })");
    expect(VIEW_SRC).toContain("_runOriginalTaggedPdfExport({ trigger: 'advanced-fidelity-override' })");
  });
  it('the preview path no longer relies on a fixed-delay synthetic DOM click', () => {
    const previewIdx = VIEW_SRC.indexOf("trigger: 'preview-generate'");
    expect(previewIdx).toBeGreaterThan(0);
    // No setTimeout-clicks-#allo-tagged-pdf-btn relay remains anywhere.
    expect(VIEW_SRC).not.toMatch(/setTimeout\([^)]*allo-tagged-pdf-btn[\s\S]{0,200}?220\)/);
  });
  it('an export requested during active continuation queues until the run settles', () => {
    expect(VIEW_SRC).toContain('const _pendingTaggedExportRef = useRef(null);');
    expect(VIEW_SRC).toContain('queued until remediation settles');
  });
  it('export start/withheld/delivered/failed are all diagnosed with the trigger', () => {
    for (const s of ['Tagged PDF export started', 'Tagged PDF export withheld: content-fidelity gate',
      'Tagged PDF export withheld: post-save structure check failed', 'Tagged PDF export delivered', 'Tagged PDF export FAILED']) {
      expect(VIEW_SRC).toContain(s);
    }
  });
});

// ── (5) PDF/UA-1 s7.2 t10: nested table under a cell ────────────────────────────────────────────
const outlineCode = sliceBetween(
  PIPE_SRC,
  'const _buildOutlineStructElems = () => {',
  '\n    };\n    // b0d24ae3 hypothesis-#1 hook',
  '_buildOutlineStructElems'
).replace(/\n    \/\/ b0d24ae3 hypothesis-#1 hook$/, '');

const buildTagTree = (html) => {
  const htmlDoc = new DOMParser().parseFromString(html, 'text/html');
  const assigned = new Map();
  let refSeq = 0;
  const context = {
    nextRef: () => ({ _ref: ++refSeq }),
    obj: (x) => x,
    register: (d) => { const r = { _ref: ++refSeq }; assigned.set(r, d); return r; },
    assign: (r, d) => { assigned.set(r, d); },
    lookup: (r) => ({ set: (k, v) => { const d = assigned.get(r); if (d) d[(k && k._name) || String(k)] = v; } }),
  };
  const mkName = { of: (s) => ({ _name: s }) };
  const mkStr = { of: (s) => ({ _str: s }) };
  const mkHex = { fromText: (s) => ({ _hex: s }) };
  const mkNum = { of: (n) => ({ _num: n }) };
  const structRootRef = context.nextRef();
  const TAG_TO_PDF_ROLE = {
    h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6', p: 'P',
    table: 'Table', tr: 'TR', th: 'TH', td: 'TD', caption: 'Caption',
    ul: 'L', ol: 'L', li: 'LI', img: 'Figure', figure: 'Figure',
    blockquote: 'BlockQuote', a: 'Link',
  };
  const fn = new Function(
    'htmlDoc', '_outlineItems', 'TAG_TO_PDF_ROLE', 'PDFName', 'PDFString', 'PDFHexString', 'PDFNumber',
    'context', 'structRootRef', '_unifiableLeafRefs', 'idTreeEntries', 'warnLog', 'HEADING_LEVEL',
    outlineCode + '\n; return _buildOutlineStructElems;'
  )(htmlDoc, [], TAG_TO_PDF_ROLE, mkName, mkStr, mkHex, mkNum, context, structRootRef, [], [], () => {},
    { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 });
  fn();
  return assigned;
};

const rolesOfKids = (assigned, dict) => (Array.isArray(dict.K) ? dict.K : [])
  .map((kidRef) => { const kd = assigned.get(kidRef); return kd && kd.S && kd.S._name; });

describe('PDF/UA-1 s7.2 t10 — TR children are only TH/TD', () => {
  const NESTED = '<html><body><main><table>'
    + '<tr><th scope="col">Region</th><th scope="col">Detail</th></tr>'
    + '<tr><td>North</td><td>Summary '
    + '<table><tr><th scope="col">Q</th></tr><tr><td>42</td></tr></table>'
    + '</td></tr>'
    + '</table></main></body></html>';

  it('a nested table nests beneath its TD cell, never directly under the outer TR', () => {
    const assigned = buildTagTree(NESTED);
    const trDicts = Array.from(assigned.values()).filter((d) => d && d.S && d.S._name === 'TR');
    expect(trDicts.length).toBeGreaterThanOrEqual(4);
    for (const tr of trDicts) {
      for (const role of rolesOfKids(assigned, tr)) {
        expect(['TH', 'TD']).toContain(role);
      }
    }
    // And the nested Table is a child of a TD container.
    const tdWithTable = Array.from(assigned.values()).filter((d) => d && d.S && d.S._name === 'TD')
      .some((td) => rolesOfKids(assigned, td).includes('Table'));
    expect(tdWithTable).toBe(true);
  });

  it("the promoted cell keeps its own inline text as a child leaf (not silently dropped)", () => {
    const assigned = buildTagTree(NESTED);
    const texts = Array.from(assigned.values())
      .filter((d) => d && d.ActualText && d.ActualText._hex)
      .map((d) => d.ActualText._hex);
    expect(texts).toContain('Summary');
  });

  it('a plain table (no nesting) is unchanged: cells stay leaves with their text', () => {
    const assigned = buildTagTree('<html><body><table><tr><th scope="col">A</th></tr><tr><td>B</td></tr></table></body></html>');
    const th = Array.from(assigned.values()).find((d) => d && d.S && d.S._name === 'TH');
    expect(th).toBeTruthy();
    expect(th.ActualText && th.ActualText._hex).toBe('A');
    expect(th.A && th.A.Scope && th.A.Scope._name).toBe('Column');
  });
});

// ── (6) recovery dedup: short exact duplicates and truncated fragments ──────────────────────────
const restoreCode = sliceBetween(
  PIPE_SRC,
  'const restoreSentencesDeterministic = (html, missingList, sourceText) => {',
  '\n  };\n\n  // ── Stage D: Duplicate detection',
  'restoreSentencesDeterministic'
).replace(/\n\n  \/\/ ── Stage D: Duplicate detection$/, '');
const restoreSentencesDeterministic = new Function(
  '_stripRestoreMarkdown',
  restoreCode + '\n; return restoreSentencesDeterministic;'
)((s) => s);

describe('restoreSentencesDeterministic — preserved-block false positives', () => {
  it('a SHORT exact-duplicate sentence (under the 3-long-word heuristic floor) is not appended', () => {
    const html = '<html><body><main><p>Students often ask questions. What are the consequences of not submitting work? Teachers explain the policies.</p></main></body></html>';
    const source = 'Alpha bravo charlie delta echo. What are the consequences of not submitting work? Zulu yankee xray whiskey victor.';
    const r = restoreSentencesDeterministic(html, [{ word: 'consequences' }], source);
    expect(r.html).not.toContain('data-source-preserved-block');
    const hits = (r.html.match(/consequences of not submitting work/g) || []).length;
    expect(hits).toBe(1);
  });

  it('a truncated straight-punctuation fragment already present as a longer curly sentence is not appended', () => {
    const html = '<html><body><main><p>“Tyrone’s mother, Ms. Jackson, called the school yesterday.” Everyone listened closely.</p></main></body></html>';
    const source = 'Unrelated filler sentence here. "Tyrone\'s mother, Ms. Another entirely different closing line.';
    const r = restoreSentencesDeterministic(html, [{ word: 'mother' }], source);
    expect(r.html).not.toContain('data-source-preserved-block');
  });

  it('genuinely missing content is still preserved (the appendix mechanism is not removed)', () => {
    const html = '<html><body><main><p>This document is about school policy only.</p></main></body></html>';
    const source = 'One unrelated filler line here. Photosynthesis converts sunlight into chemical energy inside plants. Final filler line closes it.';
    const r = restoreSentencesDeterministic(html, [{ word: 'photosynthesis' }], source);
    expect(r.html).toContain('data-source-preserved-block');
    expect(r.html).toContain('Photosynthesis converts sunlight');
  });
});

// ── (7) print-style copy: filename + unverified labeling ────────────────────────────────────────
describe('print-style download honesty', () => {
  it('downloadAccessiblePdf actually reads its filename argument into the document title', () => {
    expect(PIPE_SRC).toContain("const _requestedName = String(filename || '').replace(/\\.pdf$/i, '').trim();");
    expect(PIPE_SRC).toContain('printWindow.document.title = _requestedName;');
  });
  it('the print-style buttons are labeled unverified, distinct from the verified tagged export', () => {
    expect(VIEW_SRC).toContain('Print-style PDF (unverified)');
    expect(VIEW_SRC).toContain('Save as PDF (print-style, unverified)');
  });
  it('the primary pipeline no longer emits terminal wording for the primary pass', () => {
    expect(PIPE_SRC).not.toContain("'Done', 'Pipeline complete'");
    expect(PIPE_SRC).toContain('Primary remediation pass complete');
    expect(VIEW_SRC).toContain('One-click remediation settled');
  });
});
