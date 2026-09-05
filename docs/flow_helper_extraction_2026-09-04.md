# Safe flow helper CDN extraction — 2026-09-04

Flowchart shape rendering and elbow connector geometry now live in the existing ViewRenderers module. Deterministic flow layout lives in the existing CmapHandlers module. Their sole consumers already load these modules, so this extraction adds no request, module registration, or loading dependency.

## Scope and size

The extraction removed 6,558 bytes from each of the three shell copies at edit time, including obsolete dependency entries and the flow-only style constant. Other agents continued changing the shared tree; comparing current total sizes with the snapshots does not isolate this change. This is a shell-size reduction, not a measured whole-application speedup or an equivalent reduction in total downloaded bytes. The moved code still ships in the existing modules.

- `view_renderers_source.jsx`: private `renderFlowShape`, `getElbowPath`, and pointer-events style constant. The shape helper receives current host dependencies explicitly.
- `concept_map_handlers_source.jsx`: private `calculateFlowLayout`, called directly by its existing auto-layout handler.
- `AlloFlowANTI.txt` and the two desktop shell copies: removed those declarations and dependency entries. Host state, setters, actions, and persistence remain in place.
- Both existing module/public pairs were rebuilt with their focused builders. No build.js registration changes were necessary.

The helper bodies match the saved originals after accounting for explicit dependency injection and the pointer correction below. No changes were made to geometry, deterministic layout positions, movement bounds, selection, or editing guards.

## Browser-discovered accessibility correction

The compiled-module browser test found an existing parent SVG with `aria-hidden="true"`, hiding its focusable flow nodes and edge controls from role queries and assistive technology. This was also present in the pre-extraction snapshot. The SVG is now hidden only for the decorative Venn layer. Flow nodes also explicitly enable pointer events through the otherwise pointer-transparent SVG container, allowing mouse selection and drag initiation to reach the existing host handlers.

The first fixture attempt omitted nodeInputText; after correcting that fixture, the browser reproduced the hidden-parent issue. The final fixture uses the actual compiled renderer, local React, controlled host callbacks, real mouse and keyboard input, and minimal sizing CSS. It is a focused integration check, not a full-app visual or accessibility audit.

## Validation

- 53 tests passed across six focused suites: flow extraction, concept-map keyboard accessibility, ViewRenderers WCAG safeguards, organizer hardening, organizer live contracts, and root-boundary integrity.
- Coverage includes original shape geometry, keyboard and Shift movement, bounds and metadata preservation, deletion restrictions, locked-map behavior, deterministic auto-layout without AI, private module ownership, mirrors, SVG exposure, and pointer inheritance.
- Isolated Chromium passed pointer selection, Arrow/Shift movement, Enter selection and aria-pressed updates, locked movement/deletion restrictions, and unlocked teacher deletion. No page errors occurred. Legacy host rendering/connector helpers deliberately throw if called; neither was used.
- All three final shell copies passed Babel JSX parsing. Root/public module bytes and canonical content pins matched. Scoped whitespace checks passed.
- Earlier focused source/App.jsx smoke and registry checks passed; the registry had 209 valid consumers and no missing or suspect-null producers. The attribute correction did not change registration or module exports.

Evidence: `scratch/flow-helper-extraction/` contains pre-edit snapshots, original helper blocks, tests-final.log, the reproducible browser-check.cjs fixture, browser-check.json, and final-checks.json.

## Release and shared-tree handling

Canonical content pins: ViewRenderers `a8da5ffeee`; CmapHandlers `da363c9af2`. Desktop shell URLs remain local and queryless.

Publish both updated module files before distributing the updated canonical shell. Older shells can pass the now-unused helper dependencies to the updated modules; the new shell requires the updated modules. Use the normal deployment path when preparing a release.

Only the existing focused builders ran:

```powershell
node _build_view_renderers_module.js
node _build_concept_map_handlers_module.js
```

Edits used fresh contents and exact anchors. A Windows truncation refusal during whitespace cleanup left a verified duplicate six-byte EOF tail; it was repaired without snapshot restoration, and all three files were independently parsed afterward. Extra EOF newlines were then removed using .NET file handles, and final syntax/whitespace checks passed. The later CDN pin update wrote only its ten bytes under a write lock.

No broad application build, staging, commit, or deployment was performed. Concurrent agents' unrelated work was preserved.
