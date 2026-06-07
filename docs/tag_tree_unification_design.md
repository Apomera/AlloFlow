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

## Attempt log

### Slice 1, attempt 1 — REVERTED (content-loss bug; gate caught it pre-commit)
Implemented the gated single-page-scanned unification end to end (moved `pages`/`isScanned` above
the outline build; recorded leaf MCID runs in `buildLeaf`; drew each run as a `/<role> <</MCID n>> BDC
… EMC` invisible run in the page loop with the Noto font; set `/K`→MCR; wired StructParents/ParentTree;
`continue`d past the flat-`/P` path). The harness (extended with an Arabic single-page scanned fixture
+ a full StructTree walk + an `enumerateIndirectObjects` tally) exposed a **content-loss regression**:

- **Headings linked correctly** (`H1`/`H2` → `/K`→`MCR`, present in output), but **every level-0 leaf
  (`<p>`) DANGLED** — `buildLeaf` ran and `context.register` returned a ref (confirmed via a temporary
  `window.__dbgLeaves` probe: `["Sect","H1+mcid","P+mcid"]`), the ref appeared in its parent `Sect`'s
  `/K`, yet the P StructElem object was **absent from the saved output** (`allByRole` enumeration over
  the loaded PDF found `Sect`/`H1`/`H2` but **no `P`** — so it's dropped at save, not merely unlinked).
- Reproduced **with and without** the build-time `d.K = MCR` mutation (so `d.K` is NOT the cause), and
  on a `<main>`-less 2-heading/2-paragraph fixture (so it's not the `<main>` Sect either).
- **Pattern:** leaves created via `pushChild(buildLeaf(it, parentRef))` (level-0 items, tryNested
  `:11900`) dangle; leaves created via `s.kids.push(buildLeaf(it, s.ref))` (headings) survive. Both
  paths call `buildLeaf`→`context.register` identically, so the differentiator is upstream of the leaf
  object itself.

**Leading hypotheses for the next focused attempt (trace PDF object numbers):**
1. The **moved `doc.getPages()`** changed when page refs are allocated relative to the StructElem
   registrations — possible ref-number interaction with pdf-lib's writer. Test: keep `getPages()` where
   it was and compute `_unifyScanned`/`_unifyPage` lazily without calling `getPages()` early.
2. A pdf-lib **save/GC interaction** with `openSect`'s reserved-but-unassigned refs (`context.nextRef()`
   without immediate `assign`) interleaved with the level-0 `register` calls — the reserved Sect refs
   are only `context.assign`ed later in `closeTo`, which may confuse object-number bookkeeping for the
   refs registered in between.
3. **Reproduce in isolation** (a standalone pdf-lib script like the BDC prototype): build
   `Sect→[H1(register), P(register)]` with an `openSect`-style reserved-ref-assigned-later pattern, save,
   reload, and check whether the level-0 leaf object survives. This pinpoints whether it's the
   nested-build ref pattern or something in `createTaggedPdf` specifically.

The orphaned-but-complete tree (current shipped behavior) is the correct safe state until this is
root-caused — a content-losing unification is strictly worse. The gate (`pdf_tag_tree_golden.spec.ts`)
catching this pre-commit is the gate-first approach working as intended.

### Investigation update — 2026-06-07 (no live code change; diagnostic only)

A standalone pdf-lib repro at `dev-tools/debug/tag_tree_repro.cjs` was built to test the three leading
hypotheses against the openSect/closeTo/buildLeaf flow in isolation. The repro builds the same shape
the failed attempt produced — `StructTreeRoot → Sect → [H1, P, P]`, each leaf with `/K → MCR(page, mcid)`
and a matching BDC/EMC pair drawn into the page content stream — across three variants:

- **A**: mirrors `openSect` exactly — `context.nextRef()` for the Sect, register leaves with that as
  parent, `context.assign()` the Sect last with `K = sectKids`
- **B**: register Sect FIRST with empty `K`, register leaves AFTER, patch `K` via `context.lookup().set()`
- **C**: no Sect wrapper — flat leaves directly under StructTreeRoot

**Result: A and B both PASS. All four objects (Sect + H1 + P + P) survive `save()` + reload + an
`enumerateIndirectObjects` walk.** C also serializes its three leaves (H1 + P + P, no Sect by design).

**What this rules out:**
- Hypothesis #2 (pdf-lib save-time GC dropping objects registered between `nextRef()` and `assign()`
  on the reserved Sect ref) — **REFUTED**. The reserved-ref pattern works fine.
- Hypothesis "the nested-build ref pattern itself is broken" — **REFUTED**. The pattern works
  identically for leaves built before the parent Sect is assigned, regardless of whether they go
  through `pushChild` or directly into `s.kids`.

**What this implicates:** the bug is in Slice-1-specific orchestration the failed attempt added on top
of the working nested-build pattern. Candidates (in suspected order):

1. **The `continue` past Stage-3 flat-/P interacts with the page loop's `page.node.set(StructParents, pi)`**
   indexing. If `StructParents` isn't set for the unify-page or is set to a stale value, the ParentTree
   lookup at save-time may fail to confirm each MCID has a back-pointer, and pdf-lib's writer may quietly
   drop the StructElem (this is the most suspicious gap, since the failed attempt explicitly described
   `continue`ing past the flat-/P path).
2. **The ParentTree Nums-array shape**: if `ParentTree.Nums = [pageStructParentsIndex, [leafRef0, leafRef1, ...]]`
   has any leaf ref that's NOT yet in the context (or is the wrong PDFRef), pdf-lib may skip it.
3. **The BDC operand encoding of `{ MCID: n }`**: pdf-lib's `PDFOperator.of(BeginMarkedContentSequence, [...])`
   expects the second operand to be a `PDFDict`, not a plain JS object — the repro confirms `context.obj({MCID: n})`
   works, but the failed attempt may have passed a plain `{MCID: n}` which would fail silently.
4. **Hypothesis #1 (moved `doc.getPages()`)** still un-tested in isolation. The current recommendation
   stands: don't move `getPages()` — compute `_unifyScanned`/`_unifyPage` lazily.

**Next focused attempt: keep `getPages()` in its original position** and, instead of forcing the unify
path through `tryNested`, **route unify-scanned through `tryFlat`** (synthesis's Rank 4) so the
nested-build path is bypassed entirely for the unify case. Wire BDC/EMC per leaf in the page loop AND
preserve `page.node.set(StructParents, pi)` AND keep the existing Stage-3 wrap as a control — only the
unify-page should skip the flat `/P` wrap, and only after confirming the unify-page's StructParents
indexing is consistent with the ParentTree Nums shape. The standalone repro should be extended to
isolate each of the above suspects before any change lands in `createTaggedPdf`.

The standalone repro at `dev-tools/debug/tag_tree_repro.cjs` is the diagnostic surface for the next
attempt. It's cheap (1-2 seconds to run; pdf-lib only; no AlloFlow context). Add a Variant D that
includes the explicit `page.node.set(StructParents, 0)` and a ParentTree.Nums shape exactly matching
the failed attempt — that should narrow further.
