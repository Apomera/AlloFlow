# Page Designer (AlloStudio slides/PPTX) + session loose threads — handoff

Date: 2026-08-02. Author: Claude Code. Audience: Aaron + any agent continuing this work
(read `AGENT_HANDOFF.md` coordination rules first).

## The plan of record

Approved by Aaron 2026-07-31/08-01: AlloStudio grows into a multi-page **Page Designer**
(user-facing rename only) that authors slide decks and refines PPTX. Decisions locked in:

- **Uniform page size per document** (no mixed sizes) so PPTX export is faithful —
  PPTX stores ONE slide size per presentation (`<p:sldSz>` is presentation-level).
- **PPTX import in the first pass**, plus "Open in Page Designer" routing so the
  existing `handleExportSlides` deck content can open in the editor directly
  (build studio doc from content; do NOT round-trip through a generated .pptx).
- Rename candidate: **Page Designer** (pairs with Document Builder). LABEL ONLY —
  keep `studio_module.js`, `AlloModules.AlloStudio`, and `allostudio_*` localStorage
  keys unchanged or saved projects are stranded.
- Word-processing stays in Document Hub / doc pipeline; the deferred
  "worksheet → Document Hub handoff" (docs/studio_design.md) is the bridge, not a merge.
- LibreOffice/OpenOffice embedding: rejected (server hosting breaks no-egress FERPA;
  WASM build is alpha + far over Pages' 25MB file limit). ODF export already exists
  (`_buildAccessibleOfficeExport`, view_pdf_audit_source.jsx ~2646).

## Status by phase (verified 2026-08-02, 176/176 studio tests green, CDN current)

| Phase | Status | Where |
|---|---|---|
| 1. Multi-page schema | ✅ deployed | `studio_module.js` — `page` index per object, `pageCount`, `page.add/remove/reorder`, `object.page` ops; committed @a75c7b527 |
| 2. Page-aware HTML export | ✅ deployed | `stExportHtml` — one `.st-page` per page; single-page output byte-identical to pre-change (goldens pin it) |
| 3. PPTX export engine | ✅ deployed, **UI-UNWIRED** | `stExportPptxSpec` (pure) + `stRenderPptx` (PptxGenJS driver), `tests/allostudio_pptx.test.js` (17) |
| 5. Page navigation UI | ✅ deployed (ChatGPT/Codex) | toolbar ~line 6520: reorder/select/add/duplicate/remove, SR announcements, gesture-grouped duplicate |
| 4. PPTX import | ❌ not started | — |
| 6. "Open in Page Designer" | ❌ not started | — |
| 7. Rename to Page Designer | ❌ not started | — |

ChatGPT also added editor extras beyond the plan (all good): multi-select group
drag/resize/arrange, find/replace (`stFindTextMatches`/`stReplaceTextInObjects`),
zoom-to-selection. Nothing of mine was modified; tests confirm.

## THE TWO GAPS THAT BLOCK THE DECK STORY (do these first)

1. **No UI path creates a `slide-16x9` document.** The preset exists only in the
   engine. Every template calls `stCreateDoc('letter-portrait', …)` (~line 2904+)
   and the page-size dropdown (~line 6509) offers only portrait/landscape/square.
   Fix: add a "Slide deck (16:9)" option to the page-size select AND a deck
   template (title slide seeded) to the template picker.
2. **PPTX export is unreachable.** `stRenderPptx` has zero call sites. Fix: add
   an "Export PowerPoint (.pptx)" entry to the studio export menu →
   `stRenderPptx(stExportPptxSpec(doc), window.PptxGenJS)` → `deck.writeFile()`.
   MUST be gated by `stAltGate` like every other export. `window.PptxGenJS` is
   already loaded by the host (the main app's slides export uses it, incl. in
   Canvas); fail with the same "library loading" toast `handleExportSlides` uses.

## Remaining phases, in order

- **Phase 4 — PPTX import**: pptx = zip of OOXML; `window.JSZip` is already global.
  Parse `ppt/slides/slideN.xml` (+ `_rels` for images in `ppt/media/`) into studio
  objects; EMU → px = value / 9525. Import as actor `'import'` (closed actor set —
  `stAppend` throws on anything else). Missing alt on imported pictures is the
  FEATURE: the alt gate then blocks re-export until fixed. Text: one text object
  per `<p:sp>` with a `<p:txBody>`; don't chase full fidelity (themes, transitions,
  SmartArt) — placeholder-shape + picture + text coverage is the honest v1; TOAST
  what was skipped (no silent drops).
- **Phase 6 — Open in Page Designer**: in `export_source.jsx` next to
  `handleExportSlides` (~1513), a sibling that maps the same history content to a
  studio doc (`stCreateDoc('slide-16x9')` + one page per slide's content) and calls
  `openAlloStudio` (host state `isAlloStudioOpen`, ANTI ~10441) with the doc seeded.
  Check how AlloStudio receives an initial doc — template picker path vs a pending-doc
  window handoff; whichever exists, do not invent a second channel.
- **Phase 7 — rename**: user-facing strings + Educator Hub card label only
  (`view_educator_hub_modal_source.jsx`). Requires ANTI edit → `node build.js --mode=dev`
  → all 3 App copies, and studio i18n keys (`studio.*` in lang packs — the i18n
  wave is a separate deferred session per docs/studio_design.md).

## Traps for whoever continues

- **Page 0 is stored as ABSENT, never `page: 0`** (`stSetObjectPage` is the only
  writer). Violating this makes `stValidateDoc`'s scene-vs-ledger replay check
  reject EVERY pre-2026-07-31 saved document. Tests pin it (`allostudio_pages.test.js`).
- Single-page HTML export must stay byte-identical (goldens).
- `stAppend` returns the OP, not the object; the minted object is
  `doc.objects[doc.objects.length - 1]`.
- PptxGenJS wants hex colors WITHOUT `#`, sizes in inches (px/96), font sizes in
  pt (px * 0.75). The spec builder does all conversion — do not convert again in UI code.
- Shared tree: pathspec commits only; never leave new files staged; do not deploy
  unless Aaron asks in that message.

## Other loose threads from 2026-07-31 → 08-02 (not Page Designer)

- **Guided-mode crash report was never received.** Aaron mentioned "this guided mode
  crash" (2026-08-01) but no log arrived. The wizard-suppression fix
  (`useEffect` on `guidedMode` → `setShowWizard(false)`, ANTI ~9948) deployed
  @dc470b857 is in that code path — get the console/error report before touching it.
  Note: much guided work landed later via c0c90a996 (guided checkpoint batches,
  view_guided_mode_banner churn) — re-test guided end-to-end before diagnosing.
- **`className` on `<p>` React warning** (StemPluginBridge, 2026-07-31 log): once,
  not localizable from the truncated stack; neither brainatlas nor spacestation has
  a computed className. If it reappears, the expanded console warning names the
  actual value/tool.
- **Pre-existing test debt confirmed at HEAD** (NOT from tonight's work):
  `brain_atlas_golden` (25) + `brain_atlas_canvas_loop` (2) fail with the file
  unmodified — canvas-loop pins source strings that no longer exist;
  golden buttons drifted 58→68. Someone should rebaseline the brain-atlas goldens
  deliberately (hand-edit the snap, never blanket `vitest -u`).
- **Full test-prep builder still blocked at HEAD**: `expand_test_prep_packs_to_500.cjs:228`
  parapro provenance invariant (corrections-wave collision; content session's lane).
  Snapshot builds work: `dev-tools/build_test_prep_hub_release.cjs --skip-pack-rebuild
  --skip-eppp-preview-rebuild --skip-review-refresh`. Identity stamper
  (`dev-tools/stamp_learning_library_identity.cjs`) is wired into both builders.
- **Deployed and verified earlier**: learning-library binding fix + study-first
  button (@dc470b857), Brain Atlas blob-URL crash fix + Space Station width
  (@42165bf8b), all confirmed live; everything through @0ff6dae6c is on the CDN
  (studio module verified current 2026-08-02 — note `curl | md5sum` false-alarms
  on CRLF; compare with line endings normalized).
- **Mailbox/assignment lane** (ChatGPT's, not mine): Apps Script is at v12 with an
  assignment center (deadlines, fresh copies, hosted packs). My older
  `C:\tmp\QR_PACKCARD_AND_GUIDED_HANDOFF.md` items still open: Share-card PNG
  (visual + QR link, NO byte embedding) + gallery Present mode, mailbox setup
  walkthrough video. Reconcile against v12 before building — the complexity
  argument that motivated the walkthrough may have changed.
