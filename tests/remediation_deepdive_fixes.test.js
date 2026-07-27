// @vitest-environment jsdom
// Fixes from the 2026-07-27 regression deep dive (22-agent workflow, adversarially verified).
//
// Every pin here is BEHAVIOURAL where the code allows it. The deep dive's own headline lesson —
// carried over from the M15 breaker regression — is that a pin asserting a construct EXISTS will
// stay green through a total failure of what that construct DECIDES.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// H9 rewrite — inline anchors, matched as opener+closer pairs.
// ─────────────────────────────────────────────────────────────────────────────
describe('H9 — inline anchors survive real hrefs and stay balanced', () => {
  let render;
  beforeAll(() => {
    loadAlloModule('doc_builder_renderer_module.js');
    render = window.AlloModules.DocBuilderRenderer.createRenderer({
      docStyle: {}, _accessibleHeaderColors: () => ({}), _alloCellRichText: (s) => s,
      _emitAccessibleTableHtml: () => '', _pipeLog: () => {}, _sanitizeRawHtmlBlock: (s) => s,
      _validateTableGrid: (t) => t, renderWordArtHtml: () => '', warnLog: () => {},
    });
  });
  const p = (text) => render([{ type: 'paragraph', text }]);
  const counts = (html) => ({ open: (html.match(/<a\s/g) || []).length, close: (html.match(/<\/a>/g) || []).length });

  it('a QUERY-STRING href becomes a real link — the defect that made H9 near-useless', () => {
    // escapeTextField escapes & to &amp; first, and the old capture was [^&]*?, which cannot span
    // it. Every district-portal / Google / utm-tagged link shipped as visible literal markup.
    const out = p('See <a href="https://maine.gov/doe?topic=iep&lang=en">the DOE page</a>.');
    expect(out).toContain('<a href="https://maine.gov/doe?topic=iep&lang=en">');
    expect(out).toContain('the DOE page</a>');
    expect(out).not.toMatch(/&lt;a\s/);
  });

  it('a bare href still works', () => {
    expect(p('See <a href="https://maine.gov/doe">the DOE page</a>.')).toContain('<a href="https://maine.gov/doe">');
  });

  it('a FAILING anchor beside a passing one leaves both balanced', () => {
    // The old count-and-replay assigned </a> in document order while the counter only knew HOW MANY
    // openers succeeded — so the closer belonging to the still-escaped anchor was consumed, leaving
    // an orphan </a> and a real link that never closed.
    const out = p('See <a href="https://x.org" onclick="steal()">bad</a> and <a href=\'https://y.org\'>good</a>.');
    const c = counts(out);
    expect(c.open, 'unbalanced anchors reach PDF/UA and axe as real defects').toBe(c.close);
    expect(out).toContain('<a href="https://y.org">');
    // The rejected anchor stays escaped, so the literal text "onclick" is still visible in the
    // paragraph — that is the intended, safe outcome. What must not exist is a LIVE onclick
    // attribute on a real element.
    expect(out).not.toMatch(/<a[^>]*onclick/i);
    expect(out).toContain('&lt;a href=');
  });

  it('an anchor with any extra attribute stays fully escaped — the security property', () => {
    const out = p('See <a href="https://x.org" target="_blank">x</a>.');
    expect(out).not.toMatch(/<a\s/);
    expect(counts(out).open).toBe(counts(out).close);
  });

  it('a javascript: href is neutralised, not emitted', () => {
    const out = p('See <a href="javascript:alert(1)">bad</a>.');
    expect(out).not.toContain('javascript:');
    expect(counts(out).open).toBe(counts(out).close);
  });

  it('text with no anchors is untouched and balanced', () => {
    const out = p('No links here at all.');
    expect(counts(out)).toEqual({ open: 0, close: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The "Fix Remaining" lane — never filter a kind you do not recompute.
// ─────────────────────────────────────────────────────────────────────────────
describe('Fix Remaining recomputes and filters the SAME set', () => {
  let pipeline;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    });
  });

  it('the lane set excludes placement — the lane has no orphan scan', () => {
    const lane = pipeline.refixLaneRecomputedFidelityKinds;
    expect(lane).toBeTruthy();
    expect(lane.placement, 'filtering placement without recomputing it deletes the preserved-source-box disclosure').toBeFalsy();
    expect(lane).toMatchObject({ links: 1, tables: 1, refusal: 1, numeric: 1, 'reading-order': 1 });
  });

  it('the reducer set DOES include placement — the two lanes are deliberately different', () => {
    expect(pipeline.refixRecomputedFidelityKinds.placement).toBe(1);
  });

  it('merging with the lane set preserves a placement note', () => {
    const prev = [
      { kind: 'placement', msg: '4 source passages could not be placed…' },
      { kind: 'lowOcrAccuracy', msg: 'durable' },
      { kind: 'numeric', msg: 'STALE numeric' },
    ];
    const out = pipeline.mergeFidelityNotes(prev, [], pipeline.refixLaneRecomputedFidelityKinds);
    expect(out.some((n) => n.kind === 'placement'), 'the re-fix deleted a disclosure it never regenerates').toBe(true);
    expect(out.some((n) => n.kind === 'lowOcrAccuracy')).toBe(true);
    expect(out.some((n) => n.kind === 'numeric'), 'numeric IS recomputed by this lane, so a clean pass clears it').toBe(false);
  });

  it('the M12 link baseline is reachable from every lane through one accessor', () => {
    window.__alloSourceLinkCount = 14;
    expect(pipeline.sourceLinkCount()).toBe(14);
    window.__alloSourceLinkCount = 0;
    expect(pipeline.sourceLinkCount(), '0 means "nothing measured", not "measured zero"').toBeNull();
  });

  it('the link net fires on a pdf.js source text once the baseline is supplied', () => {
    // The whole point of M12: pdf.js text contains no markdown, so without the measured baseline
    // the net reads 0 source links and can never fire.
    const src = 'Homework Portal Grades Attendance Library Catalog Family Handbook. Visit the portal.';
    const htmlNoLinks = '<main><h1>Resources</h1><p>' + src + '</p></main>';
    expect(pipeline.computeStructuralFidelityNotes(src, htmlNoLinks).some((n) => n.kind === 'links')).toBe(false);
    expect(pipeline.computeStructuralFidelityNotes(src, htmlNoLinks, { links: 14 }).some((n) => n.kind === 'links')).toBe(true);
  });

  it('the view lane passes both the baseline and its own kind set', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('_docPipeline.computeStructuralFidelityNotes(_srcRaw, bestHtml, _srcLinks ? { links: _srcLinks } : null)');
    expect(view).toContain('_docPipeline.mergeFidelityNotes(_fixRemainingSource.fidelityNotes, _notes, _laneKinds)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L7 — a storm signal must be EARNED by the current run.
// ─────────────────────────────────────────────────────────────────────────────
describe('the breaker reset clears every storm signal', () => {
  it('recentlyThrottled does not survive a run-entry reset', async () => {
    loadAlloModule('doc_pipeline_module.js');
    const throttle = async () => { const e = new Error('API_AUTH_FAILED'); e.canvasTransientAuth = true; throw e; };
    const p = window.AlloModules.createDocPipeline({
      callGemini: throttle, callGeminiVision: throttle, callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    });
    for (let i = 0; i < 2; i++) {
      try { await p.auditOutputAccessibility('<main><h1>x</h1><p>y</p></main>'); } catch (_) {}
    }
    expect(p.geminiThrottleInfo().recentlyThrottled, 'a real storm should set it').toBe(true);
    p.resetGeminiBreaker();
    // Document B must not inherit A's storm — recentlyThrottled is what the final-audit sites use
    // to blame a rate limit for a coverage shortfall.
    expect(p.geminiThrottleInfo().recentlyThrottled, 'document B inherited document A storm').toBe(false);
    expect(p.geminiThrottleInfo().storming).toBe(false);
  }, 60000);

  it('the reset clears the field, not just the streaks', () => {
    const fn = dp.slice(dp.indexOf('var _resetGeminiBreaker = function()'));
    const body = fn.slice(0, fn.indexOf('_usesLocalTextBackend()'));
    expect(body).toContain('_geminiLastStormTripAt = 0;');
    expect(body).toContain('_geminiOffRouteOkStreak = 0;');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A batch must not be graded more loosely than one file run by hand.
// ─────────────────────────────────────────────────────────────────────────────
describe('batch "fully verified" respects needsExpertReview', () => {
  it('the count and the toast use one predicate that reads needsExpertReview', () => {
    // verificationState comes ONLY from engine statuses — _alloDeriveVerificationState never sees
    // needsExpertReview or the fidelity notes — so a document that lost hyperlinks comes back
    // 'complete' and was counted as fully verified in the summary, toast, CSV and report.
    expect(dp).toContain("const _batchFullyVerified = (q) => _batchVerificationFor(q.result).verificationState === 'complete' && !(q.result && q.result.needsExpertReview);");
    expect(dp).toContain('const fullyVerifiedItems = done.filter(_batchFullyVerified);');
    expect(dp).toContain('const _verifiedDone = done.filter(_batchFullyVerified).length;');
    expect(dp).not.toContain("done.filter(q => _batchVerificationFor(q.result).verificationState === 'complete')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M17 — a failed recovery download must not suppress the next attempt's save.
// ─────────────────────────────────────────────────────────────────────────────
describe('the recovery-save latch is earned by a successful save', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  it('latches only after a save that returned true', () => {
    // saveProjectToFile returns false without throwing when the Blob/download fails, and that
    // payload is tens of megabytes for the scanned document this feature exists for.
    expect(anti).toContain('if (_saved && _incDocKey && ');
    const i = anti.indexOf('const _saved = saveProjectToFile(false, _inc);');
    const j = anti.indexOf('if (_saved && _incDocKey && ');
    expect(i).toBeGreaterThan(0);
    expect(j, 'the latch must come AFTER the save it reports').toBeGreaterThan(i);
  });
});
