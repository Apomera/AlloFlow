# Approach 1 — Unified Tag Tree (createTaggedPdf)

Status: **design + mechanism proven; Slice 1 ready to implement.**
Owner: doc/PDF remediation pipeline. Gate: `tests/e2e/pdf_tag_tree_golden.spec.ts`.

## Problem (the "orphaned tag tree")

`createTaggedPdf` (`doc_pipeline_source.jsx`) builds **two disconnected subtrees** under
`StructTreeRoot.K`:

1. **Semantic outline** — `_buildOutlineStructElems` / `buildLeaf` (~`:11683`–`:11852`) walks the
   accessible HTML and emits StructElems (H1/P/Table/Figure/TH/TD/Link) carrying rich attributes
   (`/Alt`, `/Scope`, `/Headers`, `/ColSpan`, `/Lang`, `ActualText`) **but no `/K`→MCID** — i.e. no
   link to any marked content on a page. These are `structElemRefs` (`:11910`).
2. **Per-page content** — the page loop wraps page content in marked content: Stage 4
   (`_stage4_tryWrapPage`, ~`:3278`) does proper per-block `/<role> <</MCID n>> BDC … EMC` with
   `/K`→MCR (text PDFs only); Stage 3 fallback (~`:12163`) wraps the whole page in one `/P <</MCID 0>>`.
   These are `pageElemRefs`.

`combinedK = structElemRefs.concat(pageElemRefs).concat(fieldElemRefs)` (~`:12296`) concatenates the
two — so the rich semantic tree a screen reader navigates is **disconnected from page content**, and
the content-linked tree is flat/duplicated.

**Measured baseline** (golden master, Latin text fixture): **13 of 13 semantic leaves orphaned**
(`orphanedLeafCount`), i.e. 100% of the semantic tree has no `/K`→MCID. PDF/UA-1 §7.18 requires an
unambiguous element→marked-content mapping; strict validators (PAC 2024, Acrobat) flag this.

## Mechanism (PROVEN — pdf-lib prototype, 2026-06-07)

Per-element marked content + `/K` linkage works with pdf-lib 1.17.1:

```js
const BDC = PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, // === 'BDC'
            [PDFName.of(role), context.obj({ MCID: PDFNumber.of(mcid) })]);
const EMC = PDFOperator.of(PDFOperatorNames.EndMarkedContent, []);      // === 'EMC'
page.pushOperators(BDC);
page.drawText(text, { font, size: 1, opacity: 0, x, y });  // pushOperators + drawText interleave in stream order
page.pushOperators(EMC);
// StructElem:
const mcr  = context.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(mcid) });
const elem = context.obj({ Type: PDFName.of('StructElem'), S: PDFName.of(role), P: parent, Pg: page.ref, K: context.obj([mcr]) });
```

Re-parsing the output, the walker reports each such element as **content-linked** (`/K`→MCR detected).
`PDFOperatorNames.BeginMarkedContentSequence`/`EndMarkedContent` resolve to `'BDC'`/`'EMC'`; the inline
`<</MCID n>>` dict serializes correctly as a BDC operand. The throwaway prototype lived at
`tests/e2e/_proto_mcid.spec.ts` (deleted after confirmation).

## Sub-cases (why one fix doesn't cover everything)

- **Scanned PDFs** — the page has *no real text*; the pipeline DRAWS an invisible OCR layer. We have
  **full control** of that content, so we can draw each semantic element as its own MCID run and link
  it. No duplicate-text problem. (Reuses the Noto Unicode-font embed shipped in `04c3aadf`.)
- **Text PDFs** — the page already contains real text. Drawing an invisible structured duplicate would
  make screen readers read everything **twice**. Here unification means linking the existing Stage-4
  per-block MCIDs to the HTML outline's rich attributes (a matching problem), or suppressing the
  orphaned HTML outline where Stage 4 already covers the page.

## Slice plan (each slice gated by the golden master)

### Slice 1 — single-page scanned unification (next; low-risk, high pilot value)
The common pilot case (worksheets, handouts, notices) and the cleanest. Gated to
`isScanned && pages.length === 1`; **all other paths stay byte-identical** (zero regression risk).

Edits in `createTaggedPdf`:
1. **Ordering:** move `const pages = doc.getPages()` + `isScanned` + `ocrPages` (currently `:11953`–`:11963`)
   to **before** `_buildOutlineStructElems()` (`:11910`) so `buildLeaf` can see the unify flag.
   Add: `const _unifyScanned = isScanned && pages.length === 1; const _unifyPage = pages[0];`
   `const _mcidRuns = []; let _mcidCounter = 0;`
2. **`buildLeaf`** (leaf path, after `const elemRef = context.register(...)` `:11839`): when `_unifyScanned`
   and the role is a content leaf (H1-6/P/Figure/Caption/BlockQuote/TH/TD/Link — and LBody inside LI),
   assign `const mcid = _mcidCounter++`, set the dict's `K` to `[MCR(_unifyPage, mcid)]` **before**
   register, and push `{ mcid, elemRef, text: item.text, role: item.role, lang: item.lang }` to `_mcidRuns`.
   (Grouping roles — Sect/Table/TR/L/Document — keep `/K`→child refs, no MCID.)
3. **Page loop** (`:12000`+): guard the single scanned page — `if (_unifyScanned) { …draw runs…; continue/skip the OCR-blob draw + Stage 3 wrap + flat pageElem… }`. For each run: pick the font
   (`_getUnicodeFont(_detectScript(run.text))` else Helvetica — same logic as the OCR layer), then
   `pushOperators(BDC role mcid) → drawText(run.text, {font, size:1, opacity:0, y: descending}) → pushOperators(EMC)`.
4. **ParentTree:** `parentTreeNums.push(PDFNumber.of(0)); parentTreeNums.push(register(array indexed by mcid → elemRef))`,
   and `_unifyPage.node.set(StructParents, 0)`.
5. **`combinedK`** is unchanged — `structElemRefs` now contains content-linked leaves; `pageElemRefs` is
   empty for this page (no flat `/P`).

**Verify:** extend the golden master's Arabic scanned fixture to assert `orphanedLeafCount === 0` and
coverage stays 100%; the Latin text fixture must stay unchanged (orphaned still 13/13, all invariants
green, no crash). Then flip that fixture's soft baseline to a hard `toBe(0)`.

### Slice 2 — multi-page scanned
Same mechanism, but assign runs to pages. Needs a page↔outline mapping (segment the per-page OCR into
its outline items, or anchor by `groundTruthPages` offsets). Until then, multi-page scanned keeps the
current (orphaned) behavior.

### Slice 3 — text PDFs
Avoid duplicate text. Either (a) when Stage 4 succeeds, **merge** its per-block MCIDs into the HTML
outline elements (match block text → outline item, transplant `/K`→MCR onto the rich element and drop
the duplicate Stage-4 element), or (b) suppress the orphaned HTML outline on pages Stage 4 fully
covered. Hardest slice; do last, behind the gate.

### Follow-ups
- Extend `/K`→MCR to list `LBody` leaves (Slice 1 covers non-list leaves first).
- Populate `RoleMap`; validate `ParentTree` bidirectionality (audit "low" items).

## Guardrails
- The golden master (`tests/e2e/pdf_tag_tree_golden.spec.ts`) is the regression gate: per slice, flip the
  relevant `orphanedLeafCount` soft check to a hard `toBe(0)`; the Latin baseline guards against
  collateral regressions until Slice 3.
- Each slice committed by pathspec; **no deploy** without sign-off. Stay clear of `gemini_api`/`AlloFlowANTI`
  while the model-config change is in flight.
- The invisible-layer positioning is irrelevant (opacity 0) — only Unicode code points + `ToUnicode`
  (provided by `embedFont`) + `/K`→MCID + reading order matter.
