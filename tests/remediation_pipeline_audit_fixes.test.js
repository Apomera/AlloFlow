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

  it('H20: a dead chunk is never joined into the document as placeholder text', () => {
    // "[Chunk N could not be extracted]" was joined into extractedText, recorded as the OCR ground
    // truth, and — being longer than the 20-char emptiness guard — sailed through. A run where every
    // chunk failed shipped a document made entirely of those strings, with coverage measured against
    // them. Now: dead chunks contribute nothing, and an all-dead run aborts with a real explanation.
    expect(dp).not.toContain('could not be extracted]`;');
    expect(dp).toContain("if (!chunk || !chunk.trim()) { _failedChunks.push(i); return ''; }");
    expect(dp).toContain('if (_failedChunks.length === chunkResults.length && chunkResults.length > 0) {');
    expect(dp).toContain("extractedText = chunks.filter((c) => c && c.trim()).join('\\n\\n---\\n\\n');");
  });

  it('H13: the AI truncation notice is stripped and surfaced, not treated as content', () => {
    // gemini_api appends "[Note: Document was partially extracted...]" when it truncates. Nothing
    // consumed it, so a truncated extraction became authoritative ground truth at 100% coverage.
    const gemini = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
    expect(gemini).toContain('Document was partially extracted'); // the producer still exists
    // both chunk paths now detect it
    expect(dp).toContain('const _TRUNCATION_NOTE = /\\n*\\[Note: Document was partially extracted[^\\]]*\\]\\s*$/i;');
    expect(dp).toContain('const _TRUNC_RE = /\\n*\\[Note: Document was partially extracted[^\\]]*\\]\\s*$/i;');
    expect(dp).toContain('_truncatedChunkIdx.add(i)');
    expect(dp).toContain('_truncatedChunks.push(i)');
  });

  it('H13/H20: the regexes actually match what the producer emits', () => {
    // A pin on a regex that never fires is worse than no pin. Exercise it against the real strings.
    const producer = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
    const emitted = (producer.match(/\[Note: Document was partially extracted[^\]]*\]/g) || []);
    expect(emitted.length).toBeGreaterThanOrEqual(2); // both truncation sites
    const RE = /\n*\[Note: Document was partially extracted[^\]]*\]\s*$/i;
    for (const note of emitted) {
      expect(RE.test('Some real extracted text.\n\n' + note)).toBe(true);
      expect('Some real extracted text.\n\n'.concat(note).replace(RE, '')).toBe('Some real extracted text.');
    }
    // and it must not eat legitimate bracketed content mid-document
    expect(RE.test('See [Note: Document was partially extracted] and then more text follows.')).toBe(false);
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

  // H6 is TWO-WAY as of 2026-07-26 (Aaron's call): the round's own evidence both raises and
  // clears the accessibility half. The full truth table is pinned behaviourally against the live
  // reducer in tests/finalize_round_reducer.test.js. What is pinned HERE is the one invariant a
  // refactor could quietly drop without failing any of those cases:
  it('H6: clearing is gated on evidence actually existing, not on its absence', () => {
    // Without this gate, `_freshAccessibilityReview` is false whenever no audit ran at all — so a
    // round that gathered nothing (or whose axe run crashed) would read as "audited clean" and
    // retire a real warning. `_scored` already rejects error objects; this keeps null from
    // counting too.
    expect(dp).toContain('const _haveFreshAccessibilityEvidence = !!(_freshAxe || _freshEa);');
    expect(dp).toMatch(/_baseAccessibilityReview = _haveFreshAccessibilityEvidence\s*\n?\s*\?\s*_freshAccessibilityReview/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H12 — RTL documents lost intra-line reading order in the deterministic path.
//
// pdf.js emits a line's text items in LOGICAL order; for RTL script that runs right-to-left,
// i.e. DESCENDING x. The within-line sort was unconditionally ascending-x, so every multi-run
// line of an Arabic/Hebrew/Farsi/Urdu handout came out with its phrases reversed. The RTL
// detector existed but sat BELOW the single-column early return, so on a one-column handout —
// the common case — it never even ran.
//
// Nothing downstream could catch this: the character count, _numericFidelityLosses and the
// autoRestore word-set comparison are count/set based, so a pure reordering scores 100%
// fidelity, and readingOrderSequenceRatio compares two texts that both came through this same
// helper. Hence a behavioural pin here rather than a source match.
//
// Non-Latin text is written as \u escapes on purpose: this repo has a documented history of
// shell/tooling round-trips silently mangling literal non-ASCII into false-negative tests.
// ─────────────────────────────────────────────────────────────────────────────
describe('H12 — right-to-left lines are read right-to-left', () => {
  let orderTextItems;

  // Three text runs on ONE baseline. Visually left-to-right they sit at x=100, 250, 400;
  // for RTL the logically-FIRST run is the RIGHTMOST one.
  const RUN_RIGHT = '\u0627\u0644\u0645\u062F\u0631\u0633\u0629\u0627\u0644\u0645'; // logical 1st
  const RUN_MID = '\u0648\u0627\u0644\u0637\u0627\u0644\u0628\u0627\u062A\u0648';   // logical 2nd
  const RUN_LEFT = '\u0641\u064A\u0627\u0644\u0635\u0641\u0627\u0644\u062B\u0627';  // logical 3rd

  const item = (str, x, y) => ({ str, width: 40, transform: [10, 0, 0, 10, x, y] });
  const order = (items, opts) => orderTextItems(items, opts || {}).items.map((i) => i.str);

  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    orderTextItems = window.AlloModules.createDocPipeline.orderTextItems;
  });

  it('exposes the ordering helper (it is pure, so it is testable without pdf.js)', () => {
    expect(typeof orderTextItems).toBe('function');
  });

  it('a single-column Arabic line keeps its phrases in logical order', () => {
    // Deliberately fed in scrambled input order: the SORT is what is under test.
    const items = [item(RUN_LEFT, 100, 700), item(RUN_RIGHT, 400, 700), item(RUN_MID, 250, 700)];
    expect(order(items)).toEqual([RUN_RIGHT, RUN_MID, RUN_LEFT]);
  });

  it('reports that it applied right-to-left ordering (the only signal any net can see)', () => {
    const items = [item(RUN_LEFT, 100, 700), item(RUN_RIGHT, 400, 700), item(RUN_MID, 250, 700)];
    expect(orderTextItems(items, {}).rtl).toBe(true);
  });

  it('an English line is unaffected — still left-to-right', () => {
    const items = [item('third', 400, 700), item('first', 100, 700), item('second', 250, 700)];
    expect(order(items)).toEqual(['first', 'second', 'third']);
    expect(orderTextItems(items, {}).rtl).toBe(false);
  });

  it('an English worksheet with a few Arabic terms sprinkled in stays left-to-right', () => {
    // The detector requires RTL letters to OUTNUMBER Latin ones, so a vocabulary handout that
    // glosses a couple of words is not treated as an RTL document.
    const items = [
      item('The word for school is', 100, 700),
      item('\u0627\u0644\u0645\u062F\u0631\u0633\u0629', 300, 700),
      item('and the word for class is', 100, 680),
      item('\u0627\u0644\u0635\u0641', 300, 680),
    ];
    expect(orderTextItems(items, {}).rtl).toBe(false);
    expect(order(items)[0]).toBe('The word for school is');
  });

  it('still sorts lines top-to-bottom — direction applies WITHIN a line, not between lines', () => {
    const items = [
      item(RUN_LEFT, 100, 680), item(RUN_RIGHT, 400, 680),   // second line
      item(RUN_MID, 250, 700), item(RUN_RIGHT, 400, 700),    // first line (higher y)
    ];
    expect(order(items)).toEqual([RUN_RIGHT, RUN_MID, RUN_RIGHT, RUN_LEFT]);
  });

  it('an explicit opts.rtl still wins over detection', () => {
    const items = [item('third', 400, 700), item('first', 100, 700), item('second', 250, 700)];
    expect(order(items, { rtl: true })).toEqual(['third', 'second', 'first']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M13 — the Vision extraction fan-out was sized from a guess with no upper bound.
//
// When pdf.js cannot open a file (encrypted, corrupt) the pipeline keeps a "~3KB base64 per
// page" estimate — two orders of magnitude off for a scanned page. An 8 MB scanned IEP
// estimated ~2700 pages, became ~1366 Vision chunks, and every one of them was out of range:
// each threw 'slice out of range' and fell back to re-uploading the whole 8 MB file.
// ─────────────────────────────────────────────────────────────────────────────
describe('M13 — a guessed page count cannot drive an unbounded extraction fan-out', () => {
  let resolve_;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    resolve_ = window.AlloModules.createDocPipeline.resolveExtractionPageCount;
  });

  it('a KNOWN page count is never second-guessed', () => {
    expect(resolve_(2731, false, 0, 200)).toEqual({ pageCount: 2731, isEstimate: false, source: 'known' });
  });

  it('a reader that could open the file beats the size estimate', () => {
    // pdf-lib opens plenty of files pdf.js refuses — it is more permissive, and ignoreEncryption
    // reads owner-password documents. That real count wins outright.
    expect(resolve_(2731, true, 34, 200)).toEqual({ pageCount: 34, isEstimate: false, source: 'probed' });
  });

  it('a probed count LARGER than the cap is still honoured — the cap only bounds guesses', () => {
    expect(resolve_(2731, true, 640, 200)).toEqual({ pageCount: 640, isEstimate: false, source: 'probed' });
  });

  it('an unverifiable estimate is capped', () => {
    // The 8 MB encrypted-IEP case: nothing could open the file, so the fan-out is bounded.
    expect(resolve_(2731, true, 0, 200)).toEqual({ pageCount: 200, isEstimate: true, source: 'capped' });
  });

  it('an estimate under the cap passes through, still flagged as an estimate', () => {
    expect(resolve_(40, true, 0, 200)).toEqual({ pageCount: 40, isEstimate: true, source: 'estimated' });
  });

  it('the pipeline actually applies the verdict before sizing the chunk fan-out', () => {
    // Ordering matters more than the numbers: computing numChunks from the raw estimate and
    // clamping afterwards would fix nothing.
    const iVerdict = dp.indexOf('const _pageCountVerdict = _alloResolveExtractionPageCount(');
    const iChunks = dp.indexOf('const numChunks = Math.max(1, Math.ceil(effectivePageCount / PAGES_PER_CHUNK));');
    expect(iVerdict).toBeGreaterThan(0);
    expect(iChunks).toBeGreaterThan(iVerdict);
  });

  it('the probe document is reused as the slice source rather than parsing the file twice', () => {
    expect(dp).toContain('_sliceSrcDoc = _pageCountProbeDoc;');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M14 — Tesseract ignored the page range.
//
// A teacher remediating pages 1-20 of a 200-page scanned textbook — the exact workflow the
// page-range feature exists for — had all 200 pages rendered and recognised, watched a progress
// label counting to 200, and then had 180 of them discarded. Worse, an out-of-scope page that
// failed to render still reached window.__lastOcrPageErrors, where it named untouched pages in
// the Stage-1 banner and (because _ocrEvidenceCompatible rejects any record carrying page
// errors) permanently blocked OCR-evidence banking, forcing a full re-OCR on every retry.
//
// These pins are STRUCTURAL, not behavioural: the extractor needs pdf.js, a canvas and the
// Tesseract worker in the loop, so there is no honest way to exercise it in jsdom. The ordering
// assertion is the one that would actually catch a regression.
// ─────────────────────────────────────────────────────────────────────────────
describe('M14 — Tesseract OCRs only the selected pages', () => {
  it('the extractor accepts a page range', () => {
    expect(dp).toContain('const extractPdfTextTesseract = async (base64, onProgress, lang, pageRange) => {');
  });

  it('the render loop is bounded by it, clamped to the real document length', () => {
    // Clamping matters as much as the bound: a teacher who types "1-500" on a 30-page file must
    // get 30 pages, not 470 render failures.
    expect(dp).toContain('const _ocrFirstPage = Math.max(1, Math.min(pdf.numPages, (pageRange && pageRange[0]) || 1));');
    expect(dp).toContain('const _ocrLastPage = Math.max(_ocrFirstPage, Math.min(pdf.numPages, (pageRange && pageRange[1]) || pdf.numPages));');
    expect(dp).toContain('for (let p = _ocrFirstPage; p <= _ocrLastPage; p++) {');
    expect(dp).not.toContain('for (let p = 1; p <= pdf.numPages; p++) {\n        let canvas = null');
  });

  it('progress counts against the range, not the document length', () => {
    // "Tesseract OCR page 137/200" during a 20-page job is a lie about what the run is doing.
    expect(dp).not.toContain("onProgress({ page: p, total: pdf.numPages, phase:");
  });

  it('the caller passes the range through', () => {
    expect(dp).toMatch(/\}, _ocrTessLang, _pageRange\);/);
  });

  it('out-of-range page errors are dropped BEFORE they reach the banner and the evidence cache', () => {
    expect(dp).toContain('const _keptErrors = tessResult.pageErrors.filter(');
    const iFilter = dp.indexOf('const _keptErrors = tessResult.pageErrors.filter(');
    const iConsolidate = dp.indexOf('window.__lastOcrPageErrors = _unrecovered;');
    expect(iFilter).toBeGreaterThan(0);
    expect(iConsolidate).toBeGreaterThan(iFilter);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M12 — the dropped-hyperlink net measured markdown that pdf.js never produces.
//
// _computeStructuralFidelityNotes counted `[text](url)` in the source. The Vision-OCR prompts do
// ask for that format, so the net worked on scanned input — but the deterministic pdf.js path
// joins raw text items and emits no markdown at all, so on a born-digital PDF the source link
// count was always 0 and the net could not fire however many hyperlinks the remediation dropped.
// A PDF's links are annotations, not text.
// ─────────────────────────────────────────────────────────────────────────────
describe('M12 — the link net measures a baseline that exists for the input', () => {
  let notes_;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    notes_ = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
    }).computeStructuralFidelityNotes;
  });

  // What extractPdfTextDeterministic really produces: raw text items joined with spaces.
  const PDFJS_TEXT = 'Homework Portal Grades Attendance Library Catalog Family Handbook '
    + 'Visit the portal for assignments. Check attendance weekly. Browse the catalog. Read the handbook.';
  const HTML_NO_LINKS = '<main><h1>Resources</h1><p>' + PDFJS_TEXT + '</p></main>';

  it('with NO measured baseline, pdf.js text yields no link finding — the old, inert behaviour', () => {
    expect((notes_(PDFJS_TEXT, HTML_NO_LINKS) || []).some((n) => n.kind === 'links')).toBe(false);
  });

  it('with a measured annotation count, a document that dropped every link is flagged', () => {
    const found = (notes_(PDFJS_TEXT, HTML_NO_LINKS, { links: 4 }) || []).filter((n) => n.kind === 'links');
    expect(found).toHaveLength(1);
    expect(found[0].msg).toContain('4');
  });

  it('links that SURVIVED are not flagged', () => {
    const html = '<main>' + [1, 2, 3, 4].map((i) => `<p><a href="https://example.org/${i}">Link ${i}</a></p>`).join('') + '</main>';
    expect((notes_(PDFJS_TEXT, html, { links: 4 }) || []).some((n) => n.kind === 'links')).toBe(false);
  });

  it('one lost link out of four stays under the conservative slack — the net does not cry wolf', () => {
    const html = '<main>' + [1, 2, 3].map((i) => `<p><a href="https://example.org/${i}">Link ${i}</a></p>`).join('') + '</main>';
    expect((notes_(PDFJS_TEXT, html, { links: 4 }) || []).some((n) => n.kind === 'links')).toBe(false);
  });

  it('the markdown fallback still works for OCR input, which really is markdown', () => {
    const md = 'See [the portal](https://example.org/a) and [the catalog](https://example.org/b) and [the handbook](https://example.org/c).';
    expect((notes_(md, '<main><p>See the portal and the catalog and the handbook.</p></main>') || []).some((n) => n.kind === 'links')).toBe(true);
  });

  it('a measured count of 0 does not suppress the markdown fallback', () => {
    // A scanned document has no pdf.js annotations, so the count is legitimately 0 there. Zero
    // must mean "nothing measured", not "measured, and there are none".
    const md = 'See [a](https://example.org/a) and [b](https://example.org/b) and [c](https://example.org/c).';
    expect((notes_(md, '<main><p>See a and b and c.</p></main>', { links: 0 }) || []).some((n) => n.kind === 'links')).toBe(true);
  });

  it('the extractor really does collect Link annotations, and resets the count per run', () => {
    expect(dp).toContain("if (_a && _a.subtype === 'Link' && (_a.url || _a.unsafeUrl || _a.dest || _a.action)) _srcLinkAnnotations++;");
    expect(dp).toContain('window.__alloSourceLinkCount = _srcLinkAnnotations;');
    expect(dp).toContain('window.__alloSourceLinkCount = 0;');
  });

  it('the re-fix recompute reads the SAME baseline, so it cannot clear a real warning', () => {
    // 'links' is a recomputable note kind: a recompute that fell back to counting markdown in a
    // pdf.js source text would read 0 and silently retire the primary pass's finding.
    const iRecompute = dp.indexOf('out.structuralNotes = _computeStructuralFidelityNotes(sourceText, html, _srcCounts)');
    expect(iRecompute).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H15 — throttle waits were never budgeted against the batch per-file wall.
//
// The pass loop reserved 90s at pass ENTRY and then handed control to machinery with no idea a
// wall existed: aiFixChunked could spend 2x90s of calm waits plus 2x90s in the catch-up drain,
// the drain re-fixed each deferred chunk serially at a 180s per-call timeout, and the loop's
// verify wait added another 120s. A pass entered at deadline-91s could run minutes past the
// wall — at which point _withTimeout rejected, the file was marked FAILED, and every completed
// pass's keep-best HTML was discarded. Exactly what ending the loop early exists to prevent.
// ─────────────────────────────────────────────────────────────────────────────
describe('H15 — a throttle wait must fit inside the batch file wall', () => {
  let budget;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    budget = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
    }).calmBudgetMs;
  });

  it('an interactive run keeps the full wait — there is no wall to fit inside', () => {
    expect(budget(120000, 0)).toBe(120000);
    expect(budget(90000, null)).toBe(90000);
  });

  it('plenty of budget left → the full wait', () => {
    expect(budget(90000, Date.now() + 10 * 60 * 1000)).toBe(90000);
  });

  it('the wait is trimmed to what is actually left, minus a finalize reserve', () => {
    const left = budget(120000, Date.now() + 100000);
    expect(left).toBeGreaterThan(60000);   // ~70s: 100s left minus the 30s reserve
    expect(left).toBeLessThan(80000);
  });

  it('inside the reserve → no wait at all', () => {
    // wait-not-stop: waitForGeminiCalm returns immediately and the run proceeds slower. Waiting
    // here would blow the wall and discard finished work, which is strictly worse.
    expect(budget(120000, Date.now() + 10000)).toBe(0);
  });

  it('past the wall → no wait', () => {
    expect(budget(120000, Date.now() - 5000)).toBe(0);
  });

  it('every calm wait in the fix path is clamped — no bare constants left', () => {
    expect(dp).not.toContain('waitForGeminiCalm({ maxWaitMs: 90000, shouldAbort: _control');
    expect(dp).not.toContain('waitForGeminiCalm({ maxWaitMs: 120000, shouldAbort: _shouldAbort');
    expect(dp).toContain('_alloCalmBudgetMs(90000, _control && _control.perFileDeadlineTs)');
    expect(dp).toContain('_alloCalmBudgetMs(120000, loopCtx.perFileDeadlineTs)');
  });

  it('the wall is actually threaded into aiFixChunked', () => {
    // The clamps above are no-ops unless the deadline reaches _control.
    expect(dp).toContain('perFileDeadlineTs: loopCtx.perFileDeadlineTs || 0,');
  });

  it('the catch-up drain checks the wall per round AND between chunks', () => {
    // Each revisit is a document-sized call with a 180s timeout, so a drain that fitted when it
    // started may not fit by chunk 5.
    expect(dp).toContain('const _drainOutOfTime = () => _drainWall > 0 && Date.now() > _drainWall - _DRAIN_RESERVE_MS;');
    expect((dp.match(/if \(_drainOutOfTime\(\)\) \{/g) || []).length).toBe(2);
  });

  it('chunks the drain never reached are reported as still deferred, not as revisited', () => {
    expect(dp).toContain('for (const _u of _unreached) if (_deferredIdx.indexOf(_u) === -1) _deferredIdx.push(_u);');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H16 — a batch never took the single-file remediation lock.
//
// Only the EXPORT is wrapped; the batch runner resolves the closure-local fixAndVerifyPdf. So a
// teacher could start a single-file "Fix & Verify" over a live batch, and the two runs shared
// mutable state: _pipelineStats is a module-level global re-pointed at run entry and read at CALL
// time, so the single-file run's calls, retries and every _pipeLog/watchdog heartbeat were
// stamped with the batch file's runId — and the single-file watchdog drops heartbeats whose runId
// does not match, so it can fire on a run that is demonstrably alive. The second run also
// overwrites window.__alloPdfAbortSignal and aborts that controller in its finally, cancelling a
// batch file's in-flight Gemini calls.
//
// The claim is MANAGED on purpose: a batch owns its own progress UI, so the busy probe must keep
// reporting idle and the single-file controls must stay armed. The lock's only job is to reject a
// concurrent START.
// ─────────────────────────────────────────────────────────────────────────────
describe('H16 — a batch holds the remediation lock as a managed claim', () => {
  it('the batch claims the lock before publishing any owner state', () => {
    // A refused claim must leave nothing behind — no half-registered _activeBatchRun.
    const iClaim = dp.indexOf('const _batchLockToken = _claimRemediationLockForBatch();');
    const iOwnerPublish = dp.indexOf('_activeBatchRun = owner;');
    expect(iClaim).toBeGreaterThan(0);
    expect(iOwnerPublish).toBeGreaterThan(iClaim);
  });

  it('a concurrent start is refused with the same error shape the single-file lane uses', () => {
    expect(dp).toContain("_busyError.name = 'RemediationAlreadyRunningError';");
    expect(dp).toContain('_busyError.isAlreadyRunning = true;');
  });

  it('the claim is MANAGED, so the busy probe still reports idle during a batch', () => {
    // _getActiveRemediationRun returns null whenever _activeRemediationManaged is true. If this
    // flipped, every single-file control would grey out for the length of a batch.
    const claim = dp.slice(dp.indexOf('var _claimRemediationLockForBatch = function()'), dp.indexOf('var _releaseRemediationLockForBatch'));
    expect(claim).toContain('_activeRemediationManaged = true;');
    expect(dp).toContain('if (!_activeSingleFixPromise || _activeRemediationManaged) return null;');
  });

  it('the lock is released on EVERY exit, and only by its own holder', () => {
    // Token identity matters: a superseding batch takes the lock over, so the superseded run's
    // finally must not then release the new owner's claim.
    expect(dp).toContain('if (token && _activeSingleFixPromise === token) {');
    expect(dp).toContain('_releaseRemediationLockForBatch(_batchLockToken); // H16: no-op if a superseding batch already took it');
  });

  it('a superseded batch hands the lock over instead of stranding it', () => {
    // The old run was aborted but unwinds asynchronously, so without the handover the NEW batch
    // would be refused a lock its own predecessor still nominally holds — a permanent deadlock
    // until the page reloads.
    expect(dp).toContain('_releaseRemediationLockForBatch(_activeBatchRun.lockToken);');
    expect(dp).toContain('owner.lockToken = _batchLockToken;');
  });

  it('a stale single-file lock does not block a batch forever', () => {
    const claim = dp.slice(dp.indexOf('var _claimRemediationLockForBatch = function()'), dp.indexOf('var _releaseRemediationLockForBatch'));
    expect(claim).toContain('liveGeneration !== _activeSingleFixGeneration');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M15 / M16 / L6 / L7 — the Gemini throttle gate.
// ─────────────────────────────────────────────────────────────────────────────
describe('M15 — the breaker outcome is recorded before the slot is released', () => {
  it('the slot hold waits for the outcome, not just the transport', () => {
    // _geminiGate released the slot one `.then` off the transport hold and pumped the queue
    // immediately, while the breaker note sat two-plus links downstream. On a fast-settling
    // failure — an empty-200 body or a quick canvasTransientAuth rejection, which this file's own
    // comments call the dominant Canvas throttle shape — the release always won, so _geminiPump
    // admitted fresh document-sized calls under the PRE-TRIP cap with no cooldown: the exact
    // re-fan-out the breaker exists to prevent.
    expect(dp).toContain('var _slotUntil = Promise.all([_transportHold, _outcomeRecorded]);');
    const iRecord = dp.indexOf('var _outcomeRecorded = _raced.then(');
    const iSlot = dp.indexOf('var _slotUntil = Promise.all([_transportHold, _outcomeRecorded]);');
    expect(iRecord).toBeGreaterThan(0);
    expect(iSlot).toBeGreaterThan(iRecord);
  });

  it('there is ONE classifier, and the handlers call it rather than repeating it', () => {
    // The alternative — classifying separately inside the gate body and in the handlers — is the
    // two-lane drift this whole audit keeps finding. A once-flag makes the second call a no-op.
    expect(dp).toContain('var _noteGeminiOutcome = function (res, err) {');
    expect(dp).toContain('if (_outcomeNoted) return;');
    expect((dp.match(/_noteGeminiOutcome\(/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it('an aborted or permanent failure still feeds the breaker nothing', () => {
    const body = dp.slice(dp.indexOf('var _noteGeminiOutcome = function (res, err) {'));
    const classifier = body.slice(0, body.indexOf('\n      };') + 1);
    expect(classifier.length).toBeGreaterThan(0);
    expect(classifier).toContain('if (_gateSignal && _gateSignal.aborted) return;');
    expect(classifier).toContain('if (_perm) return;');
  });
});

describe('M16 — a failure wave expires instead of pinning the gate for the whole run', () => {
  it('failures are timestamped', () => {
    expect(dp).toContain("at: ((typeof Date !== 'undefined' && Date.now) ? Date.now() : 0), // M16: waves expire");
  });

  it('a stale wave stops vetoing recovery', () => {
    // The wave was only ever cleared by a representative success or by a run-entry reset, so a
    // storm that tripped on the last whole-document Vision call could never be disproved: the
    // rest of the run is text-only and `kind !== failure.kind` short-circuits every success.
    expect(dp).toContain('if (_geminiWaveIsStale()) return true;');
    expect(dp).toContain('var _GEMINI_WAVE_STALE_MS = 50000;');
  });

  it('the staleness bound is longer than the longest escalated cooldown', () => {
    // Otherwise a wave could be declared stale while its own cooldown was still running.
    const cooldownCap = 25000; // Math.min(25000, …) at both trip sites
    expect(50000).toBeGreaterThan(cooldownCap);
    expect(dp).toContain('Math.min(25000, _GEMINI_COOLDOWN_MS');
  });

  it('enough off-route successes clear the wave on their own', () => {
    // A run that has moved on to a different route can never produce the failed route's evidence.
    expect(dp).toContain('_geminiOffRouteOkStreak++;');
    expect(dp).toContain('if (_geminiOffRouteOkStreak < _GEMINI_RECOVER_HITS) return;');
  });

  it('any real failure resets the off-route recovery run', () => {
    expect(dp).toContain('_geminiOffRouteOkStreak = 0; // M16: a real failure invalidates any off-route recovery run');
  });

  it('storming ignores a stale streak but never a live cooldown', () => {
    const info = dp.slice(dp.indexOf('var _geminiThrottleInfo = function ()'));
    const body = info.slice(0, info.indexOf('return _r;'));
    expect(body).toContain('storming: cooldownRemainingMs > 0');
    expect(body).toContain('!_staleWave &&');
  });
});

describe('L6 — recovery probes are visible to telemetry and to the teacher', () => {
  it('probe calls, payload and latency are counted', () => {
    // A run that paused for minutes waiting for probes to clear looked, from the Log panel, like
    // a run doing nothing at all.
    expect(dp).toContain('_probeStats.probeCalls = (_probeStats.probeCalls || 0) + 1;');
    expect(dp).toContain('_probeStats.probeChars =');
    expect(dp).toContain('_probeStats.probeMs =');
  });

  it('each probe writes one line to the log the teacher can read', () => {
    expect(dp).toContain("_pipeLog('Throttle', 'Recovery probe '");
  });

  it('a CANCELLED run\'s probe is not counted — it is not evidence about the service', () => {
    const probe = dp.slice(dp.indexOf('var _geminiProbe = function (opts)'));
    const abortArm = probe.slice(probe.indexOf('if ((err && err.isAbort)'), probe.indexOf('_noteProbe(false, err);'));
    expect(abortArm).not.toContain('_noteProbe(');
  });
});

describe('L7 — only a RECENT throttle may be blamed for a coverage shortfall', () => {
  it('the fact has one definition, on the gate snapshot', () => {
    expect(dp).toContain('recentlyThrottled: cooldownRemainingMs > 0');
    expect(dp).toContain('var _GEMINI_RECENT_THROTTLE_MS = 120000;');
  });

  it('a real breaker trip is timestamped at both trip sites', () => {
    expect((dp.match(/_geminiLastStormTripAt = \(\(typeof Date/g) || []).length).toBe(2);
  });

  it('no site re-derives "a storm happened" by hand any more', () => {
    // Four hand-rolled `cooldown || cap < ceiling` expressions were true for the WHOLE run once
    // anything tripped, because recovery needs four consecutive representative successes and may
    // never get them. So a final audit that came back partial on malformed JSON published "the
    // rest were throttled by a temporary Canvas rate-limit" — the false attribution R3 wrote that
    // branch to avoid — and the teacher re-ran a document whose bad section fails identically.
    expect(dp).not.toContain('|| (_geminiCap < _geminiEffectiveMax); // R7');
    expect(dp).toContain('const _throttleCaused = _finalAuditThrottled || _geminiThrottleInfo().recentlyThrottled;');
    // The only two remaining cap-vs-ceiling comparisons are the gate's own recovery check and the
    // `capped` field it publishes.
    expect((dp.match(/_geminiCap < _geminiEffectiveMax/g) || []).length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L9 / L3 — view-side lifecycle leaks.
// ─────────────────────────────────────────────────────────────────────────────
describe('L9/L3 — the re-OCR flag and the re-audit abort signal', () => {
  const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  it('L9: the force-OCR flag is released even when the launch is REJECTED', () => {
    // Two of the three early bails cleared it; the rejection path did not. A click landing during
    // a managed batch is rejected with RemediationAlreadyRunningError, the .catch swallows it, and
    // __alloForceOcr stays set to 'all' — so the NEXT run re-OCRs the whole PDF, ignoring a good
    // embedded text layer, with no dialog and nothing tying it to the earlier click.
    expect(view).toContain('try { if (window.__alloForceOcr === force) window.__alloForceOcr = null; } catch (_) {}');
    expect(view).toContain('await fixAndVerifyPdf(_launchArgs);');
    // Released only if it is still OURS — a later run may legitimately have armed its own.
    expect(view).not.toMatch(/finally \{\s*try \{ window\.__alloForceOcr = null;/);
  });

  it('L9: both Re-OCR buttons are gated like Fix & Verify, not on bare pdfFixLoading', () => {
    // _reRun starts the same pipeline call, so it needs the same guard — pdfFixLoading is false
    // for the whole of a managed batch.
    expect(view).toContain("onClick={() => _reRun('all')} disabled={_remediationBusy || pdfAutoContinueRunning}");
    expect(view).toContain('onClick={() => _reRun({ pages: _lowPages })} disabled={_remediationBusy || pdfAutoContinueRunning}');
    expect(view).not.toContain("_reRun('all')} disabled={pdfFixLoading}");
  });

  it('L3: the re-audit signal reaches auditOutputAccessibility as its options argument', () => {
    // It was the THIRD argument to a two-parameter function, so it was dropped and the audit fell
    // back to the global signal — a superseded operation kept burning the most expensive call in
    // the flow to completion.
    expect(view).toContain('auditOutputAccessibility(newHtml, { signal: _reauditSignal })');
    expect(view).not.toContain('auditOutputAccessibility(newHtml, undefined,');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L2 / L4 / L5 — diagnosability and disclosures that describe what was measured.
// ─────────────────────────────────────────────────────────────────────────────
describe('L2 — the copyable log carries the run identity', () => {
  it('runId and documentEpoch are in the string that actually travels', () => {
    // They were computed in _pipeLog and pushed to window._alloflowPipelineWarnings, which nothing
    // in the app reads. The panel a teacher copies from renders window.__alloDiagLog, which got
    // only the flattened prefix — so a pasted field log was one interleaved stream with no way to
    // tell which run, document or batch file a line belonged to. The +12.4s elapsed prefix even
    // restarts at zero each run, so it reads as time travel.
    expect(dp).toContain("var prefix = '[DocPipe][' + tag + '][' + _runTag + '/e' + _epochTag + '] ' + elapsed + ' — ';");
    expect(dp).toContain("var _runTag = String(_logRunId || '-').slice(-6);");
  });

  it('the comment no longer sends the next reader to a buffer with no reader', () => {
    expect(dp).toContain('The ARRAY below has no in-app reader');
  });
});

describe('L4 — the partial-coverage reframe is reachable', () => {
  it('it runs after the headline ladder, not inside a branch that excludes partials', () => {
    // `_aiDegraded` is `!_alloUsableCompleteAiAudit(verification) || …`, and that predicate returns
    // false for any audit with _partialAudit === true — so inside the `!_aiDegraded` arm the block's
    // own guard was provably false and _aiReCheckThrottled was a field nothing could ever write.
    const iLadderEnd = dp.indexOf('no deterministic engine score available');
    const iReframe = dp.indexOf('verification._aiReCheckThrottled = _finalAuditThrottled;');
    expect(iLadderEnd).toBeGreaterThan(0);
    expect(iReframe).toBeGreaterThan(iLadderEnd);
  });

  it('it is messaging only — the headline and its suppression are untouched', () => {
    const block = dp.slice(dp.indexOf('honest reframe of a residual throttled partial'), dp.indexOf('Score divergence check'));
    expect(block).not.toMatch(/finalAfterScore\s*=/);
    expect(block).not.toMatch(/_aiVerificationIncomplete\s*=/);
  });

  it('it still refuses to name an engine that did not run', () => {
    const block = dp.slice(dp.indexOf('honest reframe of a residual throttled partial'), dp.indexOf('Score divergence check'));
    expect(block).toContain("eaScoreAvailable ? 'IBM Equal Access' : null");
    expect(block).toContain('const _reason = _finalAuditThrottled');
  });
});

describe('L5 — the reading-order claim is backed by a reading-order measurement', () => {
  it('the output is compared against the SOURCE, not HTML-to-HTML within one pass', () => {
    // integrityCoverage is a character-count ratio and completely order-blind: a document whose
    // sections were re-ordered, or whose columns were interleaved, scores 100%. The verdict was
    // turning that number into a reading-order claim.
    expect(dp).toContain('const _orderRatio = readingOrderSequenceRatio(_srcRaw, _outPlainOrder);');
    expect(dp).toContain("kind: 'sourceReadingOrder'");
  });

  it('it uses a DISTINCT kind from the view\'s within-pass reading-order note', () => {
    // The view's 'reading-order' note compares a re-fix against the PREVIOUS version and is
    // replaced by the re-fix lane. This one is a property of the source document, so sharing the
    // kind would let a re-fix silently clear it — the two-lane drift this audit keeps finding.
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain("kind: 'reading-order'");
    expect(view).not.toContain("kind: 'sourceReadingOrder'");
  });

  it('the declaration sits ABOVE the block that assigns it (TDZ)', () => {
    const iDecl = dp.indexOf('let _readingOrderWarn = null;');
    const iAssign = dp.indexOf('_readingOrderWarn = \'The output text runs in a noticeably different order');
    expect(iDecl).toBeGreaterThan(0);
    expect(iAssign).toBeGreaterThan(iDecl);
  });

  it('the distribution verdict can now cite it', () => {
    expect(dp).toContain('if (kinds.sourceReadingOrder) review.push(');
  });
});
