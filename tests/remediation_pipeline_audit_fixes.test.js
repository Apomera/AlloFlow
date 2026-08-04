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
import { buildLigatureFixturePdf } from './helpers/ligature_fixture.js';
import { buildStampedXObjectPdf } from './helpers/stamped_xobject_fixture.js';

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
    // The call gained a third argument on 2026-07-27 — the lane's OWN recomputed-kind set, because
    // the default included `placement`, which this lane never regenerates and was therefore
    // deleting. Match the call, not its arity.
    expect(view).toContain('_docPipeline.mergeFidelityNotes(_fixRemainingSource.fidelityNotes, _notes');
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
    // Narrowed 2026-07-27 (deep dive): the baseline now counts DISTINCT EXTERNAL URLs only.
    // Counting dest/action-only annotations swept in internal navigation — a Word table of
    // contents, "see page 12" cross-references, and every footnote reference/back-reference PAIR —
    // so a 20-page report with 18 footnotes reported ~37 "source links" the output can never carry,
    // firing a false dropped-hyperlink warning on a document that lost nothing.
    expect(dp).toContain("if (!_a || _a.subtype !== 'Link') continue;");
    expect(dp).toContain('const _u = String(_a.url || _a.unsafeUrl || \'\').trim();');
    expect(dp).toContain('_srcLinkUrls.add(_u);');
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
    // Both numbers are READ FROM THE SOURCE. The first version of this compared two literals
    // hard-coded in the test file (50000 > 25000) and could never fail for any change to the
    // pipeline — a tautology wearing the shape of an invariant.
    const bound = Number((dp.match(/var _GEMINI_WAVE_STALE_MS = (\d+);/) || [])[1]);
    const caps = Array.from(dp.matchAll(/Math\.min\((\d+), _GEMINI_COOLDOWN_MS/g)).map((m) => Number(m[1]));
    expect(Number.isFinite(bound), 'could not read _GEMINI_WAVE_STALE_MS from the source').toBe(true);
    expect(caps.length, 'could not read the escalated-cooldown caps from the source').toBeGreaterThan(0);
    expect(bound).toBeGreaterThan(Math.max(...caps));
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

// ─────────────────────────────────────────────────────────────────────────────
// H18 / M7 — the stranded pdfFixLoading flag.
//
// The auto-continue loop sets setPdfFixLoading(true) on every round. When the 12-minute
// auto-continue watchdog fires it NULLS pdfAutoContinueAbortCtrlRef, so the loop's finally computes
// _ownsExit === false — and unlike the 8-minute switch this watchdog does not bump __alloPdfRunGen,
// so _staleAtExit is false too. The loop therefore took NEITHER branch and never cleared the flag.
// The 8-minute dead-man switch could not rescue it either: it treated "no live owner" as
// "superseded", logged one line, returned without clearing AND without re-arming. The result was a
// permanent spinner over a finished result, with Fix & Verify, Fix Remaining, Additional Sweep,
// Re-OCR, "Complete final audit" and Start New Audit all disabled — escapable only by closing the
// modal.
// ─────────────────────────────────────────────────────────────────────────────
describe('H18/M7 — a stranded loading flag always gets cleared', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const misc = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');

  it('M7: "no live owner" is handled as a stranded flag, not as a supersession', () => {
    expect(anti).toContain('if (!liveOwner) {');
    expect(anti).toContain('no pipeline run owning the host — clearing the stranded flag.');
  });

  it('M7: the genuine supersession branch RE-ARMS instead of dying', () => {
    // arm() was only otherwise reachable from onActivity, which needs a pipeline heartbeat that is
    // never coming once the run has ended.
    const fire = anti.slice(anti.indexOf('Ignoring superseded remediation watchdog timeout'));
    expect(fire.slice(0, 400)).toContain('arm();');
  });

  it('M7: a missing runId is adopted from the live owner rather than disarming forever', () => {
    expect(anti).toContain('watchdogRunId = liveOwner.runId || null;');
  });

  it('H18: the auto-continue watchdog clears what it strands', () => {
    const fire = anti.slice(anti.indexOf('pdfAutoContinueRunning stuck on'));
    const body = fire.slice(0, 2000);
    expect(body).toContain('setPdfAutoContinueRunning(false);');
    expect(body).toContain('setPdfFixLoading(false);');
    expect(body).toContain("setPdfFixStep('');");
  });

  it('H18: the loop\'s finally has a third branch for a vacant controller slot', () => {
    expect(misc).toContain('const _slotVacant = !pdfAutoContinueAbortCtrlRef.current;');
    expect(misc).toContain('clearing the loading flag it would otherwise strand.');
  });

  it('H18: it still refuses to clear a NEWER continuation\'s UI', () => {
    // The M9 guarantee this sits next to: a stale loop's exit must not wipe a live run's spinner.
    const tail = misc.slice(misc.indexOf('const _slotVacant = !pdfAutoContinueAbortCtrlRef.current;'));
    expect(tail.slice(0, 700)).toContain('a newer continuation owns the controller slot');
  });

  it('both watchdogs write to the log the teacher can actually copy', () => {
    expect((anti.match(/logHostDiagnostic\('Watchdog'/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M18 / M20 — a failed attempt must not cost the retry a full re-OCR, and a
// finished run must not look "live" to a watchdog.
// ─────────────────────────────────────────────────────────────────────────────
describe('M18 — the resume seed survives a failed attempt', () => {
  it('the consumed seed is held at RUN scope, not inside the extraction helper', () => {
    // The first placement was one function out; check_free_vars caught it as three
    // ReferenceErrors-in-waiting, which is precisely what that gate is for.
    const iDecl = dp.indexOf('let _consumedResumeSeed = null;');
    const iFn = dp.indexOf('const fixAndVerifyPdf = async (batchOverrides = null) => {');
    const iUse = dp.indexOf('_consumedResumeSeed = _seed || null;');
    expect(iFn).toBeGreaterThan(0);
    expect(iDecl).toBeGreaterThan(iFn);
    expect(iUse).toBeGreaterThan(iDecl);
    expect((dp.match(/let _consumedResumeSeed = null;/g) || []).length).toBe(1);
  });

  it('it is handed back on the failure path', () => {
    // The seed was deleted on the first attempt and never re-armed, so when that attempt died on
    // the very throttle it was loaded to survive, each of the wrapper's up-to-3 retries re-ran the
    // FULL Tesseract + Vision extraction on a 40-page scan.
    expect(dp).toContain('window.__resumeExtractedText = _consumedResumeSeed;');
    const iCatch = dp.indexOf('const _runWasCancelled = !!((err &&');
    const iRestore = dp.indexOf('window.__resumeExtractedText = _consumedResumeSeed;');
    expect(iRestore).toBeGreaterThan(iCatch);
  });

  it('it never overwrites a seed a NEWER run has already armed', () => {
    expect(dp).toContain("if (_consumedResumeSeed && typeof window !== 'undefined' && !window.__resumeExtractedText) {");
  });
});

describe('M20 — a completed run cannot be adopted as a live owner', () => {
  it('the published progress snapshot is retired by its own run', () => {
    // The auto-continue watchdog reads `__alloActivePdfRemediation || __alloRemediationProgress`,
    // and the second half was never cleared — so after a run finished, a watchdog could take a
    // COMPLETED run as proof that something was live. An ownership proof has to be a live fact.
    expect(dp).toContain('window.__alloRemediationProgress\n          && window.__alloRemediationProgress.runId === _runId) {');
    expect(dp).toContain('window.__alloRemediationProgress = null;');
  });

  it('it is cleared only in the run finally, next to the other ownership slots', () => {
    const iActive = dp.indexOf('window.__alloActivePdfRemediation = null;');
    const iProgress = dp.indexOf('window.__alloRemediationProgress = null;');
    expect(iActive).toBeGreaterThan(0);
    expect(iProgress).toBeGreaterThan(iActive);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M8 / M5 / M3 / M6 — the audit that ships, and the reliability rate.
// ─────────────────────────────────────────────────────────────────────────────
describe('M8 — the returned audit describes the HTML that ships', () => {
  it('the promotion keeps the audit with the bytes', () => {
    // Keep-best restored bestHtml but returned `verification` — the LAST pass's audit, for a pass
    // deliberately NOT promoted. Normally the final authoritative audit erases the mismatch by
    // re-auditing the shipped bytes; when that returns null/throws AND the deferred re-audit also
    // fails (the common throttle-storm outcome), the last-pass audit survives and is published as
    // verificationAudit, "Remaining Issues (N)", and the resolved/introduced diff.
    expect(dp).toContain('bestVerification = reVerify || null;');
    const iBestHtml = dp.indexOf('bestHtml = accessibleHtml;\n            bestAiScore');
    const iBestVer = dp.indexOf('bestVerification = reVerify || null;');
    expect(iBestHtml).toBeGreaterThan(0);
    expect(iBestVer).toBeGreaterThan(iBestHtml);
  });

  it('a promoted version with no audit of its own returns NULL, not a mismatched one', () => {
    // fixAndVerifyPdf already fails closed on a null verification (_aiDegraded → deterministic
    // headline). A mismatched issue list is worse than no issue list: the teacher acts on it.
    expect(dp).toContain('if (verification !== bestVerification) {');
    expect(dp).toContain('verification = bestVerification;');
  });
});

describe('M5/M3/M6 — the reliability history counts what actually happened', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  it('M5: a failure row never borrows the LIVE run\'s numbers', () => {
    // getPipelineStats() returns the module-global _pipelineStats, belonging to whatever run is
    // executing — so a duplicate click rejected in microseconds appended a `failed` row carrying
    // the live run's apiCalls, visionCalls, totalApiMs and a fabricated failStage. The live run
    // then added its own success row: one document, one remediation, 50% reported.
    expect(anti).toContain("const _st = (err && err.pipelineStats && typeof err.pipelineStats === 'object') ? err.pipelineStats : {};");
    expect(anti).not.toContain('_docPipeline.getPipelineStats) ? _docPipeline.getPipelineStats() : {});');
    expect(anti).toContain("failStage: _st.lastOpenStepLabel || null,");
  });

  it('M5: errors meaning the run NEVER STARTED are not recorded at all', () => {
    expect(anti).toContain('const _neverStarted = !!(err && (err.isAlreadyRunning');
    expect(anti).toContain("err.code === 'BASELINE_AUDIT_REQUIRED'");
    expect(anti).toContain('if (!_neverStarted) setPdfRunHistory((prev) => {');
  });

  it('M3: a run that finished with no verified score is still recorded', () => {
    expect(anti).toContain('if (!cur || !cur.accessibleHtml) return;');
    expect(anti).not.toContain('if (!cur || !cur.accessibleHtml || cur.afterScore == null) return;');
  });

  it('M6: cancelled runs get their own outcome instead of vanishing', () => {
    expect(anti).toContain("outcome: _cancelled ? 'cancelled' : 'failed',");
  });

  it('M6: cancelled counts in the DENOMINATOR and never the numerator', () => {
    expect(view).toContain("r.outcome === 'cancelled'");
    expect(view).toContain("const _cancelled = _outcomed.filter((r) => r.outcome === 'cancelled');");
    // the numerator is still success-only
    expect(view).toContain("const _succeeded = _outcomed.filter((r) => r.outcome === 'success');");
    expect(view).toContain('_successRate = _outcomed.length ? Math.round(_succeeded.length / _outcomed.length * 100) : null;');
  });

  it('M6: a run with cancellations does not render as all-green', () => {
    expect(view).toContain('(_failed.length === 0 && _incomplete.length === 0 && _cancelled.length === 0)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M11 / M17 — the failed-chunk banner, and one recovery file per document.
// ─────────────────────────────────────────────────────────────────────────────
describe('M11 — the failed-chunk banner survives sanitization', () => {
  it('the banner carries no inline handler', () => {
    // The banner is a rawhtml block, so it goes through _sanitizeRawHtmlBlock: DOMPurify's config
    // FORBIDs `button` and omits `onclick`, and _alloSanitizeRemediationBodyFragment strips every
    // on* attribute again — so the control rendered as inert text. Worse, when DOMPurify has NOT
    // loaded, _execShaped matches the ` onclick=` and replaces the WHOLE banner with the generic
    // "an embedded HTML block was withheld" notice, so the teacher was not even told which pages
    // failed.
    const banner = dp.slice(dp.indexOf("html: '<div data-chunk-fail="), dp.indexOf("html: '<div data-chunk-fail=") + 1400);
    expect(banner).not.toContain('onclick=');
    expect(banner).not.toContain('<button');
  });

  it('it still says which pages are missing, and what to do', () => {
    const banner = dp.slice(dp.indexOf("html: '<div data-chunk-fail="), dp.indexOf("html: '<div data-chunk-fail=") + 1400);
    expect(banner).toContain('failed to process');
    expect(banner).toContain('This section is missing from the document below');
    expect(banner).toContain('data-chunk-pages=');   // so a real control can be built from it later
    expect(banner).toContain('role="alert"');
  });

  it('the retry handler splices ONLY its own section, never the whole body', () => {
    // It used to re-render the entire body from allBlocks — the un-polished, un-sanitized,
    // un-imaged Step-2 draft — discarding the skip link, the main landmark, the footer, every
    // Step-3/4 axe fix, the grammar corrections and the restored image data URLs, while the
    // displayed score stayed unchanged.
    expect(dp).toContain('const _spliceInto = (html) => {');
    expect(dp).toContain('_doc.querySelector(\'[data-chunk-fail="\' + chunkIdx + \'"]\')');
    expect(dp).not.toContain("accessibleHtml: prev.accessibleHtml.replace(/<body[^>]*>[\s\S]*<\/body>/");
  });

  it('it refuses to publish across a document change', () => {
    expect(dp).toContain('const _retryDocumentEpoch = _runDocumentEpoch;');
    expect(dp).toContain('const _liveEpochNow = _readCurrentRemediationDocumentEpoch();');
    expect(dp).toContain('discarding it rather than rewriting the new document');
  });

  it('a successful retry marks the score stale', () => {
    // The score described the document WITHOUT this section.
    expect(dp).toContain('_scoreStaleAfterChunkRetry: true');
  });
});

describe('M17 — one recovery file per document, not per attempt', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

  it('a second failure on the same document does not download another copy', () => {
    // The hands-off wrapper re-runs a failed fix up to 3 more times and this ran in EVERY attempt's
    // catch — four near-identical ~40 MB files carrying the full base64 of the source PDF, and four
    // "Remediation stopped" toasts while the run was in fact still going.
    expect(anti).toContain("if (_incDocKey && typeof window !== 'undefined' && window.__alloLastIncompleteSaveKey === _incDocKey) {");
    expect(anti).toContain('not downloading another copy');
  });

  it('the retry toast says retrying, not stopped', () => {
    expect(anti).toContain("t('toasts.incomplete_project_retrying')");
    expect(anti).toContain('AlloFlow is retrying');
  });

  it('the latch releases on success and on a new document', () => {
    // Otherwise a LATER genuine failure on the same document would bank nothing.
    expect((anti.match(/window\.__alloLastIncompleteSaveKey = null;/g) || []).length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L10 / L11 — a slow file must not end the batch; a round that never ran must
// not be counted as a retry.
// ─────────────────────────────────────────────────────────────────────────────
describe('L10/L11 — batch continuation and hands-off retry accounting', () => {
  const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
  const misc = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');

  it('L10: a drain timeout only stops the batch if a lock is genuinely held', () => {
    // The stated reason for stopping — later files would fail with
    // RemediationAlreadyRunningError — described a hazard that did not exist on this path. The
    // cost was real: a wedged transport can outlast the 30s drain (a gate slot is held up to 45s
    // past a 120-180s timeout), so one slow scan could lose files 11-50 of an overnight batch.
    expect(dp).toContain("_lockStillHeld = !!(typeof _getActiveRemediationRun === 'function' && _getActiveRemediationRun());");
    expect(dp).toContain('if (_lockStillHeld) {');
  });

  it('L10: otherwise the file is marked failed and the batch continues', () => {
    const block = dp.slice(dp.indexOf("err.code === 'ALLO_BATCH_REMEDIATION_DRAIN_TIMEOUT'"));
    const arm = block.slice(0, block.indexOf('// Quota circuit-breaker'));
    expect(arm).toContain('continue;');
    expect(arm).toContain('the batch continued');
  });

  it('L11: the re-entry guard returns a testable sentinel', () => {
    expect(misc).toContain("return { started: false, reason: 'already-running' };");
  });

  it('L11: the hands-off wrapper stops instead of counting a round that never ran', () => {
    expect(view).toContain('if (_loopOutcome && _loopOutcome.started === false) {');
    expect(view).toContain('not counting this as a retry');
    // and it must break BEFORE the retry counter / toast
    const iCheck = view.indexOf('if (_loopOutcome && _loopOutcome.started === false) {');
    const iCount = view.indexOf('_prevScore = _s; _loopTries++;');
    expect(iCheck).toBeGreaterThan(0);
    expect(iCount).toBeGreaterThan(iCheck);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M4 — the batch lane reaches the reliability record.
//
// Batch successes never set pdfFixResult (silent mode returns early) and batch failures never
// reach the host's fixAndVerifyPdf wrapper (the runner calls the pipeline-internal closure, not the
// wrapped export). So the highest-volume path — the one where per-file 8-minute wall timeouts and
// quota stops actually happen — left nothing in pdfRunHistory, nothing in the project file's
// runHistory, and nothing in the CSV, while a comment asserted it covered "single-file + batch +
// page-range call sites at once".
// ─────────────────────────────────────────────────────────────────────────────
describe('M4 — batch files are recorded', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

  it('the runner emits one outcome per file, on BOTH paths', () => {
    expect(dp).toContain('const _emitBatchFileOutcome = (item, result, err) => {');
    expect(dp).toContain('_emitBatchFileOutcome(item, result, null);');
    expect(dp).toContain('_emitBatchFileOutcome(item, null, err);');
  });

  it('the emit sits inside the per-file try/catch, not after the loop', () => {
    const iSuccess = dp.indexOf('_emitBatchFileOutcome(item, result, null);');
    const iFailure = dp.indexOf('_emitBatchFileOutcome(item, null, err);');
    const iAbortCheck = dp.indexOf('if (_batchAbortCtrl.signal.aborted) {', iFailure);
    expect(iSuccess).toBeGreaterThan(0);
    expect(iFailure).toBeGreaterThan(iSuccess);
    // recorded BEFORE the abort branch can break out, so a stopped batch still records the file
    expect(iAbortCheck).toBeGreaterThan(iFailure);
  });

  it('the host listens and appends a row', () => {
    expect(anti).toContain("window.addEventListener('alloflow:batch-file-outcome', onBatchFileOutcome);");
    expect(anti).toContain("window.removeEventListener('alloflow:batch-file-outcome', onBatchFileOutcome);");
    expect(anti).toContain("source: 'batch',");
  });

  it('a COMPLETED batch file is classified by the same rule single files use', () => {
    // Otherwise one reliability number would mean two different things. (The target comes from a
    // ref rather than the render scope — see the M4 follow-up block below for why.)
    expect(anti).toContain('_docPipeline.remediationOutcome(_res || {}, { targetScore: pdfTargetScoreRef.current })');
  });

  it('rows are deduped by runId so a re-render cannot double-count a file', () => {
    expect(anti).toContain("const _k = 'batch:' + (d.runId || (d.fileName + ':' + Date.now()));");
    expect(anti).toContain('if (prev.some((r) => r._k === _k)) return prev;');
  });

  it('the CSV distinguishes batch files from hand-run ones', () => {
    expect(view).toContain("const head = 'date,file,source,outcome,verification,fail_stage");
    expect(view).toContain("_csv(r.source || 'single')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M20 (remainder) — runAutoFixLoop has an ownership identity of its own.
//
// __alloActivePdfRemediation and __alloRemediationProgress are written only by fixAndVerifyPdf, so
// when the loop is entered DIRECTLY — "Fix N Remaining" or the axe auto-fix button after a resume,
// i.e. the whole point of "Continue a previous session" — both were undefined, watchdogRunId stayed
// null, and the loop passed no owner down, so _pipeLog fell back to the factory-initial
// _pipelineStats: every heartbeat carried runId: null, onActivity bailed at !detail.runId, and
// fire() always returned on !watchdogRunId. The stuck-flag safety net was completely inert in that
// entry path, so pdfAutoContinueRunning and pdfFixLoading could never be reset.
// ─────────────────────────────────────────────────────────────────────────────
describe('M20 — the auto-continue loop owns an identity the watchdog can see', () => {
  const misc = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');

  it('the loop publishes a slot with a real runId and epoch', () => {
    expect(misc).toContain("const _loopRunId = 'autocontinue-' + _myRunGen");
    expect(misc).toContain('window.__alloActivePdfRemediation = { runId: _loopRunId, documentEpoch: _loopDocumentEpoch, startedAt: Date.now() };');
  });

  it('it never clobbers a LIVE fixAndVerifyPdf slot', () => {
    // That run's own watchdog is watching that slot.
    expect(misc).toContain("if (typeof window !== 'undefined' && !window.__alloActivePdfRemediation) {");
  });

  it('the identity is threaded into the calls that heartbeat', () => {
    expect(misc).toContain('const _loopOwner = { runId: _loopRunId, documentEpoch: _loopDocumentEpoch, stats: { startTime: 0 } };');
    expect(misc).toContain('owner: _loopOwner, // M20: heartbeats carry this loop\'s identity');
    // the AI round now passes a _control at all — it used to pass none
    expect(misc).toContain("aiFixChunked(cur.accessibleHtml, _instr, 'auto-continue-ai-round-' + (round + 1), null, {");
  });

  it('the slot is released on EVERY exit, and only by its owner', () => {
    // A slot left behind is exactly the stale "live owner" the other half of M20 removed.
    expect(misc).toContain('window.__alloActivePdfRemediation.runId === _loopRunId');
    expect(misc).toContain('_loopOwnsRemediationSlot && ');
  });

  it('the release sits outside the _ownsExit branch', () => {
    // A superseded loop must still clean up after itself.
    const fin = misc.slice(misc.indexOf('const _staleAtExit = _genStale();'));
    const iOwns = fin.indexOf('if (_ownsExit) {');
    const iRelease = fin.indexOf('_loopOwnsRemediationSlot && ');
    const iOwnsClose = fin.indexOf('}', fin.indexOf('pdfAutoContinueAbortCtrlRef.current = null;'));
    expect(iRelease).toBeGreaterThan(iOwns);
    expect(iRelease).toBeGreaterThan(iOwnsClose);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M4 follow-up — the batch-outcome listener must not freeze the target score.
// ─────────────────────────────────────────────────────────────────────────────
describe('M4 follow-up — the batch listener reads a LIVE target score', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

  it('classification reads the ref, not the captured render value', () => {
    // The listener lives in a `[]`-deps effect, so anything it reads from the render scope is
    // frozen at FIRST render — it would have graded every batch row against the 95 default for a
    // teacher who changed their target.
    expect(anti).toContain('remediationOutcome(_res || {}, { targetScore: pdfTargetScoreRef.current })');
    expect(anti).not.toContain('remediationOutcome(_res || {}, { targetScore: pdfTargetScore })');
  });

  it('the ref is kept in sync by its own effect', () => {
    expect(anti).toContain('const pdfTargetScoreRef = React.useRef(95);');
    expect(anti).toContain('useEffect(() => { pdfTargetScoreRef.current = pdfTargetScore; }, [pdfTargetScore]);');
  });

  it('the single-file lane still uses the render value — it is not in a [] effect', () => {
    // That effect re-runs on pdfFixResult, so its capture is fresh; only the batch listener needed
    // the ref. Pinning this keeps someone from "consistently" changing the wrong one.
    expect(anti).toContain('_docPipeline.remediationOutcome(cur, { targetScore: pdfTargetScore })');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Corpus round 7 — the table discriminator vetoed real prose columns.
//
// The i1040's justified 3-column "What's New" shares one baseline grid, so
// 67-89% of left-column baselines match the right side and the ≥0.55 aligned-
// rows veto read the whole page as a table: extraction interleaved the three
// columns mid-sentence. The override splits only when both sides READ as prose
// columns (lines that fill their column, few items and ≥18 chars per line) —
// thresholds with measured daylight to the i1040 p68 tax table (fill 0.72,
// 8.1 items/line) and NIST HB44's 9-char device-code column.
// ─────────────────────────────────────────────────────────────────────────────
describe('R7 — prose columns on a shared baseline grid still split', () => {
  let orderTextItems;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    orderTextItems = window.AlloModules.createDocPipeline.orderTextItems;
  });

  const LONG = 'sentence text that runs long enough to be prose';
  const item = (str, x, y, w) => ({ str, width: w, transform: [9, 0, 0, 9, x, y] });
  const LINES = 30;

  function proseColumns() {
    // Three justified columns at x 40/230/420, width 150, one shared baseline
    // grid — every line of every column sits on the same y as its neighbours.
    const items = [];
    for (let line = 0; line < LINES; line++) {
      const y = 700 - line * 15;
      for (let col = 0; col < 3; col++) {
        items.push(item(`c${col} l${line} ${LONG}`, 40 + col * 190, y, 150));
      }
    }
    return items;
  }

  it('a 3-column baseline-aligned prose page is split into 3 columns', () => {
    const ord = orderTextItems(proseColumns(), {});
    expect(ord.applied).toBe(true);
    expect(ord.columns).toBe(3);
    // Reading order: ALL of column 0, then all of column 1, then column 2.
    const cols = ord.items.map((i) => i.str[1]);
    const firstC1 = cols.indexOf('1');
    const firstC2 = cols.indexOf('2');
    expect(cols.lastIndexOf('0')).toBeLessThan(firstC1);
    expect(cols.lastIndexOf('1')).toBeLessThan(firstC2);
  });

  it('a short-code table column is NOT split away from its row labels (HB44 class)', () => {
    // Code column fills its narrow side (fill ≈0.82 — past the fill gate) with
    // one item per line, but its lines are ~8 chars: only medianChars stops it.
    const items = [];
    for (let line = 0; line < LINES; line++) {
      const y = 700 - line * 15;
      items.push(item('VTM-21.1', 40, y, 80));
      items.push(item(`Diversion of Measured Liquid ${line}`, 150, y, 300));
    }
    const ord = orderTextItems(items, {});
    expect(ord.applied).toBe(false);
    expect(ord.columns).toBe(1);
    // Row-major: each code stays adjacent to its own row's label.
    const strs = ord.items.map((i) => i.str);
    expect(strs[0]).toBe('VTM-21.1');
    expect(strs[1]).toContain('Diversion');
  });

  it('a numeric grid stays row-major (tax-table class)', () => {
    const items = [];
    for (let line = 0; line < LINES; line++) {
      const y = 700 - line * 15;
      for (let cell = 0; cell < 8; cell++) {
        items.push(item(String(1000 + line * 8 + cell), 40 + cell * 62, y, 30));
      }
    }
    const ord = orderTextItems(items, {});
    expect(ord.columns).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Corpus round 7 — simple-font code→text precedence in the CS extractor.
//
// The i1040's HelveticaNeueLTStd subsets park fi at code 0x1F with no
// ToUnicode entry; the glyph is named only in /Encoding /Differences — and as
// /f_i, the AGL underscore convention. The decoder emitted a raw control char
// and 'qualified' read as 'quali␟ed' (68 sites per document). Three layers,
// ToUnicode first: ToUnicode → Differences glyph names → the embedded CFF
// program's own encoding+charset. Ligature presentation forms (U+FB00-06) are
// expanded so the CS text compares cleanly against pdf.js output.
// ─────────────────────────────────────────────────────────────────────────────
describe('R7 — Differences /f_i, ligature expansion, and CFF built-in encoding', () => {
  let pages;
  beforeAll(async () => {
    loadAlloModule('doc_pipeline_module.js');
    const pdf = buildLigatureFixturePdf();
    pages = await window.__alloCsPageTexts(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.length));
  });

  it('a /Differences [31 /f_i] glyph decodes through the AGL underscore rule', () => {
    expect(pages.join('\n')).toContain('qualified');
  });

  it('a ToUnicode hit on U+FB01 is expanded to plain "fi"', () => {
    expect(pages.join('\n')).toContain('benefit');
  });

  it('with no ToUnicode and no Differences, the CFF program encoding speaks', () => {
    expect(pages.join('\n')).toContain('confirm');
  });

  it('no raw control characters survive in the fixture text', () => {
    expect(/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(pages.join(''))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Corpus round 8 — mixed-layout pages and too-narrow gutters.
//
// Two independent reasons a real multi-column page read as one interleaved
// column, both found on the IRS i1040:
//   1. The minimum gutter was 3 of 96 bins — 16.5pt on a letter page — while a
//      normal two-column gutter is 10pt, so it could never be detected. Bins
//      are now ~2pt and the minimum is stated in POINTS.
//   2. On a page whose layout CHANGES down the page (columns above a full-width
//      chart, or a full-width title block above columns), the full-width part
//      fills the gutters. A horizontal band cut now runs when the vertical
//      search is rejected — but only if some band then finds real columns,
//      which is what kept the corpus regression at zero.
// ─────────────────────────────────────────────────────────────────────────────
describe('R8 — narrow gutters and layouts that change down the page', () => {
  let orderTextItems;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    orderTextItems = window.AlloModules.createDocPipeline.orderTextItems;
  });

  const LONG = 'a line of prose long enough to look like a real column of text';
  const item = (str, x, y, w) => ({ str, width: w, transform: [9, 0, 0, 9, x, y] });

  function twoColumns(lines, x0, x1, width, yTop, tag) {
    const items = [];
    for (let i = 0; i < lines; i++) {
      const y = yTop - i * 14;
      items.push(item(`${tag}L${i} ${LONG}`, x0, y, width));
      items.push(item(`${tag}R${i} ${LONG}`, x1, y, width));
    }
    return items;
  }

  it('a 10pt gutter is wide enough to split — 16.5pt was never reachable', () => {
    // Columns at x=42..292 and x=302..552: a completely empty 10pt channel,
    // exactly the i1040 definition pages that read as one column before.
    const ord = orderTextItems(twoColumns(26, 42, 302, 250, 700, ''), {});
    expect(ord.applied).toBe(true);
    expect(ord.columns).toBe(2);
    const sides = ord.items.map((i) => i.str[0]);
    expect(sides.lastIndexOf('L')).toBeLessThan(sides.indexOf('R'));
  });

  it('columns above a full-width block: the columns are still found', () => {
    // Top: two columns. Bottom: full-width rows that cross the gutter, which is
    // what defeated the whole-page gutter search.
    const items = twoColumns(20, 42, 302, 250, 700, '');
    for (let i = 0; i < 10; i++) {
      items.push(item(`WIDE${i} ${LONG} ${LONG}`, 42, 380 - i * 14, 510));
    }
    const ord = orderTextItems(items, {});
    expect(ord.applied).toBe(true);
    const strs = ord.items.map((i) => i.str);
    const lastLeft = strs.map((s) => s.startsWith('L')).lastIndexOf(true);
    const firstRight = strs.map((s) => s.startsWith('R')).indexOf(true);
    const firstWide = strs.map((s) => s.startsWith('WIDE')).indexOf(true);
    expect(lastLeft).toBeLessThan(firstRight); // top band read in column order
    expect(firstRight).toBeLessThan(firstWide); // and before the full-width block
  });

  it('a full-width block ABOVE columns keeps the block first', () => {
    const items = [];
    for (let i = 0; i < 8; i++) items.push(item(`HEAD${i} ${LONG} ${LONG}`, 42, 740 - i * 14, 510));
    items.push(...twoColumns(20, 42, 302, 250, 580, ''));
    const ord = orderTextItems(items, {});
    expect(ord.applied).toBe(true);
    const strs = ord.items.map((i) => i.str);
    expect(strs.map((s) => s.startsWith('HEAD')).lastIndexOf(true))
      .toBeLessThan(strs.map((s) => s.startsWith('L')).indexOf(true));
  });

  it('a single column with a big blank gap is NOT carved into bands', () => {
    // The band cut is only kept when a band then finds real columns; otherwise
    // it would slice ordinary pages into stacked pieces for no benefit.
    const items = [];
    for (let i = 0; i < 14; i++) items.push(item(`top${i} ${LONG}`, 42, 700 - i * 14, 500));
    for (let i = 0; i < 14; i++) items.push(item(`bot${i} ${LONG}`, 42, 400 - i * 14, 500));
    const ord = orderTextItems(items, {});
    expect(ord.applied).toBe(false);
    expect(ord.columns).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Corpus round 8 — Form XObjects are extracted per DRAW, in stream order.
//
// The content-stream extractor walked the page's /XObject resource dictionary,
// so it visited each XObject once no matter how often the page stamped it, and
// appended its text after the page's rather than at the draw site. On the i1040
// that recovered 2 of 9 STOP badges. Worse, an XObject whose own resources name
// the page's dictionary re-entered itself, so the USCIS civics footer came out
// 18 times across 11 pages. Both are settled by following `Do`.
// ─────────────────────────────────────────────────────────────────────────────
describe('R8 — a stamped Form XObject is read once per draw, in place', () => {
  let pages;
  beforeAll(async () => {
    loadAlloModule('doc_pipeline_module.js');
    const pdf = buildStampedXObjectPdf();
    pages = await window.__alloCsPageTexts(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.length));
  });

  it('extracts the stamp once per draw, not once per resource entry', () => {
    expect((pages.join('').match(/STAMP/g) || []).length).toBe(3);
  });

  it('places each stamp at its draw site rather than after the page text', () => {
    const order = (pages.join('').match(/ALPHA|BETA|GAMMA|STAMP/g) || []);
    expect(order).toEqual(['ALPHA', 'STAMP', 'BETA', 'STAMP', 'GAMMA', 'STAMP']);
  });
});
