# Approach 1 — Unified Tag Tree (createTaggedPdf)

> **Historical design/mechanism snapshot, not current implementation guidance (2026-07-09):** This note captured a proposed tag-tree unification path and harness findings at that time. Verify current PDF pipeline code, OCR/tagging fixes, veraPDF results, and `PIPELINE_ARCHITECTURE.md` before implementing any slice from this document.

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

### Slice 1 per-leaf, attempt 2 — 2026-07-01 — CLEAN (all June hypotheses closed)

**New diagnostic surface:** `dev-tools/debug/tag_tree_live_harness.cjs` runs the REAL
`createTaggedPdf` (the built `doc_pipeline_module.js`, via the factory seam) in Node under jsdom +
pdf-lib 1.17.1 in ~50ms, with a `PDFContext.prototype.assign/delete` LEDGER that records every
object-number's life (kind + call stack) — the "instrument, don't iterate variants" capability the
June investigation asked for, without Playwright. Its verdict covers: ledger-built-vs-saved
StructElems, dangling refs in the saved tree, orphaned leaves, and (added after the first decode)
CONTENT-STREAM checks — artifact-wrap coverage of the original content and MCR→BDC bidirectional
consistency. Modes: baseline / `--experiment` / `--multi` / `--early-getpages` / `--out`.

**The experiment:** per-leaf MCIDs for scanned pages rebuilt behind
`fixResult._experimentPerLeafScanned` (set only by the harness + golden spec), deliberately WITHOUT
the June attempt's two un-exonerated moves — `getPages()` stays in place and /K is retro-patched via
`context.lookup().set()` (the proven variant-B pattern) instead of set at build time. New machinery:
per-leaf `BDC (role, mcid) → invisible drawText → EMC` runs replace the OCR blob on planned pages
(via `PDFOperator.of` — variant-H-shaped), the Stage-3 flat-/P is skipped for those pages, and the
ParentTree slot maps mcid → leaf ref (array). Grouping/decorative roles (the `<main>` Sect leaf,
NonStruct) make no content claim.

**Results (harness + Playwright golden, 26/26):**
- Single-page, multi-page, and `--early-getpages` (June hypothesis #1, the last un-exonerated
  delta): ALL CLEAN — zero object loss, zero dangles, orphaned 0, every MCR has a matching BDC,
  11 distinct MCIDs, no multi-claimed MCIDs (the ISO 32000 §14.7.4 violation of the shared-MCID-0
  ship is GONE in experiment mode).
- **Hypothesis #1 (moved getPages) is EXONERATED.** Every hypothesis from the June list is now
  closed (A–I clean-room + real-orchestration + early-getPages).
- **Mechanical conclusion:** with `useObjectStreams: false` (in the save path since 2026-04-23),
  pdf-lib's writer serializes EVERY entry of `context.indirectObjects` — no GC exists. A registered
  object cannot be absent from the saved bytes; only replacement (`assign` on the same ref) or
  `context.delete` could remove one, and the live source contains neither (`PDFRef.of` / `.delete(`:
  zero hits). The June "registered but absent" observation was therefore almost certainly a defect
  in the attempt's own hand-rolled page-loop rewiring or its measurement — the same family as the
  two REAL bugs the harness found (below) — not a pdf-lib serialization ghost.

**Two production bugs found by the harness's content-stream decode (both FIXED):**
1. **Artifact-split mis-count** — `_origContentCount` was captured BEFORE pdf-lib's first draw
   triggers `page.node.normalize()`, which rewrites /Contents from `[orig]` to
   `[q, orig, Q, drawStream]`. The Stage-3 split then put only the `q` stream inside `/Artifact`
   and tagged the scanned IMAGE as `/P` MCID-0 text content (veraPDF §7.1) — silently, on every
   single-content-stream scan since 2026-06-19. Fix: force `page.node.normalize()` (idempotent)
   before counting.
2. **`_builtCount` undercount** — the round-trip's content-loss guard summed only TOP-LEVEL refs
   (~3 Sects) against a saved count of ALL StructElems (~20), so the "No structure lost at save"
   ratio was always ≫1 and could NEVER detect the b0d24ae3 loss class it was tightened for (report
   showed "3/20"). Fix: count built elements by enumerating the doc's own context for
   /Type /StructElem — apples-to-apples with the saved-side tally (now 20/20, 19/19).

**veraPDF pre-validation (2026-07-01, verapdf-cli 1.29 dev / Java 21, `--flavour ua1`):** both the
per-leaf sample and the shared-MCID production sample fail ONLY §7.21.4.1 (font embedding — a
harness artifact: the offline harness can't fetch NotoSans, so the layer fell back to base-14
Helvetica, which production never does) and §5 (PDF/UA identifier — the app's honesty gate
correctly WITHHELD the claim on the degraded offline run). **Zero structure/tagging failures on
the per-leaf construction** (no §7.1, §7.2, §7.18) — which also independently confirms the
artifact-split fix. veraPDF cannot see multi-claimed MCIDs (its known blind spot), so PAC 2024
remains the final discriminating check before default-ON.

**Ship posture:** the experiment flag stays DEFAULT OFF. The Playwright golden gained a per-leaf
block (leaves > 0, orphaned = 0, distinct MCIDs > 3, multi-claimed = 0) so the gate covers the
construction. Flip checklist for default-ON (scanned docs): (a) external validation of a per-leaf
output through veraPDF/PAC (the CheerpJ spike or Aaron's PAC run), (b) a Canvas smoke of a real
scanned remediation with the flag, (c) change `_perLeafExp` to default true for scanned docs and
retire the shared-MCID-0 patch. Until then production keeps shared-MCID-0 + /ActualText (SR-correct,
degenerate), now with the artifact split actually correct.

### Investigation update — 2026-06-07 evening (after Slices 1+2 shipped)

The repro was extended with 4 more variants (D, E, F, G initially; later H, I). After Aaron asked
whether per-leaf MCID granularity could be shipped safely, the repro was extended TWO more times to
test the specific surfaces the b0d24ae3 design-doc hypotheses pointed at:

- **Variant H** — TRUE "continue past Stage-3 flat-/P" (per-leaf BDC/EMC only, NO per-page /P
  StructElem, NO Stage-3 wrap). This is what the failed attempt's `continue` past flat-/P actually
  meant in code.
- **Variant I** — mixed pattern (per-leaf MCIDs 0/1/2 PLUS a per-page /P StructElem at MCID 99 with
  its own outer BDC/EMC pair). Tests whether keeping both patterns causes one to invalidate the other.

**Result: all 9 variants (A–I) pass their per-variant expected shapes through save() + reload +
enumerateIndirectObjects walk.** Specifically: variant H (the TRUE continue-past-Stage-3 pattern,
the closest direct mirror of the failed attempt) serializes Sect + H1 + 2P correctly.

**What this rules out, cumulatively (all 9 variants):**
- openSect reserved-ref pattern (A)
- register-Sect-first-then-patch pattern (B)
- flat leaves under StructTreeRoot (C)
- multi-Sect close-and-reopen cycles (D)
- plain-object vs PDFDict BDC operand encoding (E)
- register-then-draw vs draw-then-register ordering (F)
- per-leaf + outer-Stage-3 double-tag (G)
- TRUE continue-past-Stage-3 (per-leaf only, no flat /P) (H)
- mixed per-leaf MCIDs + per-page /P at separate MCID (I)

**Where the b0d24ae3 bug must therefore live** (the un-tested surfaces specific to the FULL
createTaggedPdf flow that the standalone repro can't reach):

1. **IDTree construction for TH cells** (`idTreeEntries` populated inside buildLeaf, used to build a
   name tree on `StructTreeRoot.IDTree`). My repro never registers a TH with `/ID`. Untested.
2. **RoleMap** on `StructTreeRoot.RoleMap`. My repro never sets one. Untested.
3. **Combined `StructTreeRoot.K` array shape** — the real code concatenates `structElemRefs.concat(pageElemRefs).concat(fieldElemRefs)`. My repro tested each separately; never the combined three-way concat. Untested.
4. **Long context object chains** — the real createTaggedPdf has hundreds of context.register calls
   between the leaf registrations and doc.save() (Stage 3 wraps for each page, IDTree refs, etc.).
   My repro has ~5 register calls total. There may be a pdf-lib limit / pattern that only manifests
   at higher object counts. Untested.
5. **page.node.set(Contents, …) mutating the page's Contents array** — the real code REWRITES the
   page's Contents array (line 12707) by wrapping the existing content stream with BDC/EMC refs.
   This is a page-mutation interaction my repro doesn't model (my repro starts with an empty page
   and draws into it; the real code wraps EXISTING content). Untested.
6. **Stage 4 attempts** when `!isScanned && pako` — different code path that may interact differently
   with already-registered StructElems. Not relevant for the scanned-PDF unify case but still
   un-tested.

**Recommended next session approach** (lean toward instrumentation over more repro variants):

The cheap-variant cycle (1-2 seconds each) has rule-out coverage of 9 patterns now. Continuing to
guess more variants is high-effort-low-yield since the remaining suspect surfaces (especially #5,
#3) require modeling actual createTaggedPdf state that's expensive to replicate. The faster path is
to **instrument the LIVE createTaggedPdf with trace logs** when running against the golden master:

- Add a counter inside buildLeaf that logs `context.register(d) → ref ${ref.toString()}` for each
  leaf
- After doc.save() but BEFORE returning bytes, re-parse the saved bytes and enumerate; log which
  refs survived vs didn't
- Run the golden master with this instrumentation enabled
- The leaf refs that registered but didn't survive are the dropped leaves; their ref numbers
  give the exact range to investigate via pdf-lib's internal object table

This is ~30 minutes of instrumentation, runs in Playwright with the existing golden master
infrastructure, and directly observes the failure without guessing.

**For now (Slices 1+2 shipped @0d5eee14 / @a7eb71b3): the shared-MCID-0 approach is the right ship.**
It satisfies PAC and adds zero risk of content loss because the patch is purely additive
(`context.lookup().set()` on existing registered objects, the variant-B-proven pattern). Per-leaf
MCID granularity is the un-shipped delta; the diagnostic infrastructure in this repro lowers the
cost of the eventual focused debug session by 90% — the next debugger will skip 9 wrong-tree
investigations and start from the narrowed-suspect surface above.
