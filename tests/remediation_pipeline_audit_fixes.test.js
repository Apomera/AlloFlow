// Pins for the 2026-07-26 remediation-pipeline audit fixes.
// Findings and evidence: REMEDIATION_PIPELINE_AUDIT_2026-07-26.md
//
// Where possible these are BEHAVIOURAL (run the real code) rather than source-substring pins — the
// audit's own headline test finding (H1/H2) was that this repo's pins are mostly raw-source matches
// that cannot see runtime behaviour and drift into permanent redness.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// C2 — extracted images were never spliced into the remediated document.
//
// The splice pattern demanded data-img-placeholder as the FIRST attribute; the renderer emits
// `<figure id="…" data-img-placeholder="true" …>`. It therefore matched zero figures, and every
// downstream image step (imgIdx, _deferredImageMap, dropped-image recovery, the reinsertion
// report) no-opped in silence — the teacher shipped grey placeholder boxes with nothing in the log.
//
// This is deliberately a BEHAVIOURAL pin: it lifts the live regex literal out of the pipeline
// source and runs it against the renderer's REAL output. A source-substring pin would have been
// satisfied by the broken pattern too.
// ─────────────────────────────────────────────────────────────────────────────
describe('C2 — the image splice pattern matches what the renderer actually emits', () => {
  let renderedFigureHtml;
  let spliceRegexSource;

  beforeAll(() => {
    loadAlloModule('doc_builder_renderer_module.js');
    const renderer = window.AlloModules.DocBuilderRenderer;
    const renderJsonToHtml = renderer.createRenderer({
      docStyle: {},
      _accessibleHeaderColors: () => ({}),
      _alloCellRichText: (s) => s,
      _emitAccessibleTableHtml: () => '',
      _pipeLog: () => {},
      _sanitizeRawHtmlBlock: (s) => s,
      _validateTableGrid: (t) => t,
      renderWordArtHtml: () => '',
      warnLog: () => {},
    });
    renderedFigureHtml = renderJsonToHtml([
      { type: 'image', description: 'Bar chart showing enrollment trends from 2020 to 2024' },
    ]);
    // Lift the live pattern out of the splice call site rather than hard-coding a copy here.
    const m = dp.match(/bodyContent = bodyContent\.replace\((\/[^\n]*?\/gi), \(match\) => \{/);
    spliceRegexSource = m && m[1];
  });

  it('the renderer really does emit a placeholder figure with id before the marker', () => {
    expect(renderedFigureHtml).toContain('data-img-placeholder="true"');
    // The exact shape that broke the old pattern. If the renderer is ever changed to put the
    // marker first, this pin should be updated deliberately — not silently relied upon.
    expect(renderedFigureHtml).toMatch(/<figure id="[^"]*" data-img-placeholder="true"/);
  });

  it('the live splice regex matches that output', () => {
    expect(spliceRegexSource).toBeTruthy();
    const body = spliceRegexSource.slice(1, spliceRegexSource.lastIndexOf('/'));
    const flags = spliceRegexSource.slice(spliceRegexSource.lastIndexOf('/') + 1);
    const live = new RegExp(body, flags);
    expect(live.test(renderedFigureHtml)).toBe(true);
  });

  it('the splice regex does not require the marker to be the first attribute', () => {
    // The specific defect, pinned directly: a pattern anchored on `<figure data-img-placeholder`
    // is unsatisfiable against the renderer and must never come back.
    expect(dp).not.toContain('replace(/<figure data-img-placeholder="true"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C1 — "Fix Remaining" deleted the durable extraction-time disclosures.
//
// Fidelity notes are two different things wearing one array. Recomputable notes describe the
// CURRENT html; durable ones describe the SOURCE document and stay true across every fix pass.
// The re-fix lane replaced the whole array with its three recomputable kinds, taking the
// "OCR quality is POOR — the text may be garbled" warning with it, along with fidelityLimited,
// needsExpertReview, the distribution cautions, and the exported accessibility statement.
// ─────────────────────────────────────────────────────────────────────────────
describe('C1 — a re-fix pass may replace only what it recomputed', () => {
  let pipeline;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
    });
  });

  const DURABLE = [
    { kind: 'lowOcrAccuracy', msg: 'Estimated OCR quality is POOR (~52%)' },
    { kind: 'lowOcrConfidence', msg: '3 page(s) were OCR at low confidence' },
    { kind: 'altQuality', msg: '4 image descriptions are information-free' },
    { kind: 'folioLeak', msg: 'leaked page number inline in the body' },
    { kind: 'pageEdge', msg: 'repeated page-edge lines removed' },
    { kind: 'ocrColumnOrder', msg: 'reading order rebuilt column-aware' },
    { kind: 'activeContent', msg: 'the ORIGINAL PDF contains JavaScript actions' },
  ];

  it('exports the merge helper and the recomputed-kind set', () => {
    expect(typeof pipeline.mergeFidelityNotes).toBe('function');
    expect(pipeline.refixRecomputedFidelityKinds).toMatchObject({
      links: 1, tables: 1, refusal: 1, placement: 1, numeric: 1, 'reading-order': 1,
    });
  });

  it('keeps every durable extraction-time disclosure across a re-fix', () => {
    const fresh = [{ kind: 'numeric', msg: '2 source numeric value(s) not found' }];
    const out = pipeline.mergeFidelityNotes(DURABLE, fresh);
    for (const d of DURABLE) {
      expect(out.some((n) => n.kind === d.kind), `durable note '${d.kind}' was dropped`).toBe(true);
    }
    expect(out.some((n) => n.kind === 'numeric')).toBe(true);
  });

  it('replaces — does not duplicate — the kinds the pass recomputed', () => {
    const prev = [
      { kind: 'lowOcrAccuracy', msg: 'durable' },
      { kind: 'numeric', msg: 'STALE numeric note' },
      { kind: 'reading-order', msg: 'STALE reading-order note' },
      { kind: 'tables', msg: 'STALE tables note' },
    ];
    const fresh = [{ kind: 'numeric', msg: 'FRESH numeric note' }];
    const out = pipeline.mergeFidelityNotes(prev, fresh);
    expect(out.filter((n) => n.kind === 'numeric')).toHaveLength(1);
    expect(out.find((n) => n.kind === 'numeric').msg).toBe('FRESH numeric note');
    // Recomputed kinds with no fresh finding must CLEAR, not linger as a stale warning.
    expect(out.some((n) => n.kind === 'reading-order')).toBe(false);
    expect(out.some((n) => n.kind === 'tables')).toBe(false);
    expect(out.some((n) => n.kind === 'lowOcrAccuracy')).toBe(true);
  });

  it('survives the empty / non-array shapes the callers really pass', () => {
    expect(pipeline.mergeFidelityNotes(undefined, undefined)).toEqual([]);
    expect(pipeline.mergeFidelityNotes(null, [{ kind: 'numeric', msg: 'x' }])).toHaveLength(1);
    expect(pipeline.mergeFidelityNotes(DURABLE, null)).toHaveLength(DURABLE.length);
  });

  it('the view routes its re-fix lane through the shared helper, not a flat assignment', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('_docPipeline.mergeFidelityNotes(_fixRemainingSource.fidelityNotes, _notes)');
    expect(view).not.toContain("_refixNotes = _notes; // THIS run's findings replace the prior run's");
  });

  it('the finalization reducer uses the same helper', () => {
    expect(dp).toContain('_mergeFidelityNotes(cur.fidelityNotes, _roundFid.fidelityNotes, _RECOMPUTABLE_FIDELITY_KINDS)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C3 — a lost page was invisible, and then banked.
//
// A failed Vision chunk was blanked to '' and still pushed one empty page record per page it
// covered; a whole-engine death returned pageErrors: []. So window.__lastOcrPageErrors stayed
// empty, the Stage-1 partial-extraction banner never rendered, the shortened text became the
// ground truth every coverage net measures against, and the OCR evidence cache — which checked
// only that a page record EXISTED — banked the hole for every retry in the session.
// ─────────────────────────────────────────────────────────────────────────────
describe('C3 — lost pages are reported, and a hole is never banked as evidence', () => {
  it('both engines emit page-level records on a whole-engine failure', () => {
    // The two failure surfaces that used to return a bare `pageErrors: []`.
    expect(dp).toContain("const _enginePageErrors = (engine, err) => {");
    expect(dp).toContain("return { fullText: '', pages: [], pageErrors: _enginePageErrors('Tesseract', e) };");
    expect(dp).toContain("return { fullText: '', pages: [], pageErrors: _enginePageErrors('Gemini Vision', e) };");
    expect(dp).not.toContain("sourceCharCount: 0, error: e && e.message, pageErrors: [] };");
  });

  it('a failed Vision chunk records every page it was supposed to cover', () => {
    expect(dp).toContain('const _failedChunkIdx = new Set();');
    expect(dp).toContain("if (!chunk || !chunk.trim()) { _failedChunkIdx.add(i); return ''; }");
    expect(dp).toContain('pages: pagesOut, pageErrors: _visionPageErrors };');
  });

  it('a page recovered by the OTHER engine is not reported as lost', () => {
    // The engines are redundant on purpose. Now that a dead engine emits a record per page, a raw
    // concat would fire the banner on every degraded-but-complete run. Only pages the RECONCILED
    // merge left empty count as lost.
    expect(dp).toContain('if (p && typeof p.pageNum === \'number\' && String(p.text || \'\').trim()) _recovered.add(p.pageNum);');
    expect(dp).toContain('window.__lastOcrPageErrors = _unrecovered;');
  });

  it('the evidence cache requires TEXT on every expected page, not merely a record', () => {
    // The exact predicate that let a truncated extraction bank: presence-only membership.
    expect(dp).toContain(".filter(p => p && String(p.text || '').trim().length > 0)");
    expect(dp).not.toMatch(/const present = new Set\(record\.groundTruthPages\s*\n\s*\.map\(p => p && Number\(p\.pageNum\)\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H11 / H14 / M10 — the image lane. All three were dormant until C2 made the splice reachable;
// every one of them ships a WRONG answer confidently rather than an absent one, which is the worse
// failure for a screen-reader user.
// ─────────────────────────────────────────────────────────────────────────────
describe('H11/H14/M10 — the image lane refuses to guess', () => {
  it('H11: crops are skipped when the page geometry cannot be mapped to the described images', () => {
    // imagePositions comes from the RAW operator list (decoratives included); imgs has them filtered
    // out. Pairing by counter therefore gives the diagram the logo's rectangle — a wrong picture
    // under a correct alt text, which passes every alt-PRESENCE check we run.
    expect(dp).toContain('const _cropGeometryTrusted = imagePositions.length === imgs.length;');
    expect(dp).toContain('const pos = _cropGeometryTrusted ? imagePositions[imgOpIdx] : null;');
    expect(dp).not.toContain('const pos = imagePositions[imgOpIdx] || imagePositions[0];');
  });

  it('H14: image extraction is scoped to the remediated page range', () => {
    expect(dp).toContain('shouldAbort: _runGenStale, pageRange: _pageRange });');
    expect(dp).toContain('if (Array.isArray(imgCtx.pageRange) && imgCtx.pageRange.length === 2) {');
    // An image with no page number is kept — dropping it would lose content.
    expect(dp).toContain('return !Number.isFinite(_p) || (_p >= _pgFrom && _p <= _pgTo);');
  });

  it('H14: a mismatched count keeps each figure\'s OWN caption as its alt text', () => {
    expect(dp).toContain('const _imagePairingTrusted = _placeholderCount === extractedImages.length;');
    expect(dp).toContain('const desc = (imgInfo && _imagePairingTrusted) ? imgInfo.description : altText;');
  });

  it('H14: the pairing doubt reaches the fidelity notes without touching a TDZ variable', () => {
    // _structuralFidelityNotes is declared with `let` ~1700 lines LATER. Pushing to it from Step 2
    // throws a ReferenceError that the surrounding try/catch swallows, so the disclosure would
    // vanish silently — the exact failure mode this audit exists to remove. Park it on the
    // run-scoped signal and consume it where the array is built.
    expect(dp).toContain('window.__alloImagePairingUncertain = {');
    expect(dp).toContain("if (_ip && _ip.msg) _structuralFidelityNotes.push({ kind: 'imagePairing', msg: _ip.msg });");
    // and reset per run, so a previous document's doubt cannot leak into this one
    expect(dp).toContain('window.__alloImagePairingUncertain = null; // H14');
  });

  it('H14: imagePairing is a DURABLE note — a re-fix pass must not silently drop it', () => {
    const kinds = dp.slice(dp.indexOf('_REFIX_RECOMPUTED_FIDELITY_KINDS = Object.assign'), dp.indexOf('_REFIX_RECOMPUTED_FIDELITY_KINDS = Object.assign') + 200);
    expect(kinds).not.toContain('imagePairing');
  });

  it('M10: placeholder controls are re-authored unconditionally, not only when images exist', () => {
    // The renderer's placeholders carry their whole interaction surface as inline on* handlers, and
    // the fragment sanitizer strips every one. This block re-authors them on the trusted side, so
    // gating it left dead Upload / Pick-extracted buttons on any document with no extracted images.
    expect(dp).not.toMatch(/if \(extractedImages\.length > 0\) \{\s*\n\s*let imgIdx = 0;/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H9 — inline links were escaped into visible literal markup.
// The extraction prompt explicitly asks the model for <a href='url'>text</a> inside paragraphs;
// the text-field escaper turned every one into &lt;a href=...&gt;, so sighted readers saw raw markup
// and screen-reader users got no links at all — in a pipeline whose purpose is WCAG conformance.
// Behavioural, against the REAL renderer: re-allowing a tag is exactly where an XSS hole would go,
// so the whole point is to prove the allow-list is still strict.
// ─────────────────────────────────────────────────────────────────────────────
describe('H9 — inline anchors survive, and nothing else does', () => {
  let render;
  beforeAll(() => {
    loadAlloModule('doc_builder_renderer_module.js');
    render = window.AlloModules.DocBuilderRenderer.createRenderer({
      docStyle: {}, _accessibleHeaderColors: () => ({}), _alloCellRichText: (s) => s,
      _emitAccessibleTableHtml: () => '', _pipeLog: () => {}, _sanitizeRawHtmlBlock: (s) => s,
      _validateTableGrid: (t) => t, renderWordArtHtml: () => '', warnLog: () => {},
    });
  });
  const para = (text) => {
    const html = render([{ type: 'p', text }]);
    return (html.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [, html])[1];
  };
  // Escaped markup is inert text, not a vector — strip it before judging safety.
  const liveMarkup = (out) => out.replace(/&lt;[\s\S]*?&gt;/g, '');

  it('renders a real anchor for safe schemes', () => {
    expect(para("See <a href='https://example.org/policy'>the district policy</a>."))
      .toContain('<a href="https://example.org/policy">the district policy</a>');
    expect(para('See <a href="https://example.org/x">policy</a>.')).toContain('<a href="https://example.org/x">');
    expect(para("Email <a href='mailto:sped@school.org'>the team</a>.")).toContain('<a href="mailto:sped@school.org">');
    expect(para("See <a href='/handbook'>the handbook</a>.")).toContain('<a href="/handbook">');
  });

  it('neutralises dangerous schemes to # rather than dropping the link text', () => {
    for (const scheme of ["javascript:alert(1)", 'data:text/html,x', 'vbscript:x']) {
      const out = para("Click <a href='" + scheme + "'>here</a>.");
      expect(out).toContain('<a href="#">');
      expect(out).toContain('here');
      expect(liveMarkup(out)).not.toMatch(/javascript:|data:|vbscript:/i);
    }
  });

  it('refuses any anchor carrying a second attribute — it stays escaped', () => {
    for (const text of [
      "Click <a href='https://x.org' onclick='alert(1)'>here</a>.",
      "Click <a href='https://x.org' target='_blank'>here</a>.",
      "Click <a href='https://x.org' style='x'>here</a>.",
    ]) {
      const live = liveMarkup(para(text));
      expect(live).not.toMatch(/\son\w+\s*=|target\s*=|style\s*=/i);
      expect(live).not.toContain('<a href=');
    }
  });

  it('leaves the pre-existing vectors exactly as inert as before', () => {
    for (const text of ['Text <script>alert(1)</script> more.', 'Text <img src=x onerror=alert(1)> more.']) {
      expect(liveMarkup(para(text))).not.toMatch(/<script|<img|onerror/i);
    }
  });

  it('never emits an unbalanced </a>', () => {
    // A rejected anchor stays escaped, so its closing tag must stay escaped too — otherwise the
    // document ships a stray </a>, and this pipeline's output is validated against PDF/UA and axe.
    for (const text of [
      "Click <a href='https://x.org' onclick='alert(1)'>here</a>.",
      "Mixed <a href='https://ok.org'>good</a> and <a href='https://x.org' target='_blank'>bad</a>.",
      'No anchors at all.',
    ]) {
      const live = liveMarkup(para(text));
      expect((live.match(/<a href="/g) || []).length).toBe((live.match(/<\/a>/g) || []).length);
    }
  });

  it('still allows attribute-less emphasis', () => {
    expect(para('This is <strong>bold</strong> and <em>italic</em>.'))
      .toBe('This is <strong>bold</strong> and <em>italic</em>.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H8 / H10 — a failed chunk counted as success; a throttled legend deleted real rows.
// ─────────────────────────────────────────────────────────────────────────────
describe('H8/H10 — a failure must not be recorded as content', () => {
  it('H8: both extraction paths share ONE renderable-block predicate', () => {
    // The single-pass path has guarded this since 2026-07-02; the chunked path — used by every
    // document over 8 pages — only tested Array.isArray, so ["I'm sorry, I can't help"] rendered to
    // nothing, was recorded status:'success', and the recovery ladders below never ran.
    expect(dp).toContain('function _alloAsBlockArray(v) {');
    expect(dp).toContain('let parsed = _alloAsBlockArray(repairAndParseJson(cleaned));');
    expect(dp).not.toContain('if (parsed && Array.isArray(parsed)) {');
    // the single-pass path delegates rather than keeping a second copy
    expect(dp).toContain('const _asBlockArray = _alloAsBlockArray;');
  });

  it('H8: the predicate rejects refusal shapes and accepts real blocks', () => {
    const src = dp.slice(dp.indexOf('function _alloRenderableBlock('), dp.indexOf('function _alloUsableCompleteAiAudit('));
    const asBlockArray = new Function(src + '\nreturn _alloAsBlockArray;')();
    expect(asBlockArray(["I'm sorry, I can't help with that"])).toBe(null);
    expect(asBlockArray([])).toBe(null);
    expect(asBlockArray({ error: 'refused' })).toBe(null);
    expect(asBlockArray(null)).toBe(null);
    expect(asBlockArray([{ type: 'p', text: 'real content' }])).toBeTruthy();
    expect(asBlockArray({ blocks: [{ type: 'h1', text: 'wrapped' }] })).toBeTruthy();
    expect(asBlockArray({ type: 'p', text: 'bare single block' })).toBeTruthy();
  });

  it('H10: a failed legend re-extraction keeps the original table', () => {
    // `null` from _reextractAsLegend is also what a Canvas throttle returns. Replacing the table
    // with an image stub deleted every row the deterministic pass had already recovered.
    expect(dp).toContain("_legendDiag({ phase: 'fallback-kept-original-table', pageRange, rows: _rowCount });");
    expect(dp).not.toContain("_legendDiag({ phase: 'fallback-table-to-image', pageRange });");
    expect(dp).not.toContain('Automatic extraction could not enumerate every entry; refer to the source PDF image');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M9 — a superseded round's score ESTIMATE was displayed against the current document.
// This is the divergence the frozen-reference parity suite deliberately excludes; pinned here
// instead so it is tested rather than merely exempted.
// ─────────────────────────────────────────────────────────────────────────────
describe('M9 — a new round never inherits the previous round\'s score estimate', () => {
  it('clears the three stale-estimate fields in the reducer result', () => {
    expect(dp).toContain('const _staleEstimateReset = {');
    expect(dp).toContain('_estimatedMinimumScore: null,');
    expect(dp).toContain('_estimatedScoreBasis: null,');
    expect(dp).toContain('_finalAuditRetryAvailable: !!(_aiVerificationIncomplete && html),');
  });

  it('applies the reset BEFORE the round overrides, so an override still wins', () => {
    // Object.assign order matters: cur → reset → this round's fields.
    expect(dp).toContain('return Object.assign({}, cur, _staleEstimateReset, {');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H6 / H7 — expert review and "AI incomplete" must reflect THIS round.
// ─────────────────────────────────────────────────────────────────────────────
describe('H6/H7 — round-scoped verdicts', () => {
  it('H7: a complete-with-review audit is a COMPLETE audit, not a throttled one', () => {
    // 'complete-with-review' is what the policy emits when the AI returned an issue it could not
    // classify. Treating it as incomplete hid the score behind an em dash, printed "8 of 8 sections
    // audited — the AI service was throttled", and invited a pointless full re-audit.
    expect(dp).toContain("const _aiVerificationIncomplete = !/^complete(?:-with-review)?$/.test(String(_verificationCoverage.ai || ''));");
  });

  it('H6: fresh axe/EA evidence can RAISE the accessibility review flag', () => {
    expect(dp).toContain('const _freshAccessibilityReview = !!(');
    expect(dp).toContain('const _baseAccessibilityReview = _inheritedAccessibilityReview || _freshAccessibilityReview;');
  });

  it('H6: the flag is strictly one-way — fresh evidence must not CLEAR an inherited warning', () => {
    // Clearing an expert-review warning from an automated signal is a product decision, not a
    // mechanical fix. A `? :` here instead of `||` would silently make it two-way.
    expect(dp).not.toMatch(/_baseAccessibilityReview = _hasFreshDeterministicEvidence\s*\?/);
  });
});
