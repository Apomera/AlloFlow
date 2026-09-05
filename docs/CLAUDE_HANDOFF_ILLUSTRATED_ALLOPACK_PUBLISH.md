# Claude handoff: publish and test the illustrated Water Cycle AlloPack

Prepared September 4, 2026. This is a continuation brief, not a claim that the pilot is production-ready.

## User intent and authorization

The user wants dozens of images added to existing AlloPacks, starting with a complete Water Cycle pilot tested through the live Community Library. They explicitly approved built-in image generation after Gemini sign-in failed. They now request this handoff so Claude can finish verification and live publication while Codex starts the next pack.

Artwork must contain NO raster text, labels, numbers, captions, or watermarks. Labels/captions belong in AlloFlow's editable native fields. Alt text must describe actual final artwork, not repeat generation prompts. Do not send messages to other people.

## Repository and caution

Workspace: C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated
Origin: https://github.com/Apomera/AlloFlow.git
Promo: https://apomera.github.io/AlloFlow/

There are many unrelated local and concurrent changes, including extensive promo work. Inspect git status/diffs before editing. Do not bulk-stage, reset, overwrite, or publish unrelated work. No commit or push was made for this pilot.

## Completed locally

- allopacks/illustrated/water_cycle_grade6.allopack.json
  Self-contained illustrated edition of the original pack; 24 embedded WebP images, 12 resources, last successful build 1,621,114 characters.
- allopacks/water_cycle_grade6.allopack.json
  Original text-only source remains separate.
- allopacks/media/water_cycle_grade6/
  PNG artwork, optimized WebP assets, alt-text.json, and manifest.json with actual prompts, descriptions, hashes, dimensions and review status.
  Two old labeled drafts are superseded and must NOT be included in the published media set.
- dev-tools/build_water_cycle_illustrated.cjs
  Rebuilds from the source pack, durable media manifest/alt-text and PNG masters. Uses local Playwright canvas solely for resizing/WebP encoding; built-in generation made the artwork. First-run bootstrap references scratch files; subsequent runs use the durable manifest. Verify this behavior.
- catalog/index.json
  Added a DISTINCT local entry:
  slug: water_cycle_grade6_illustrated
  title: The Water Cycle — Illustrated Grade 6 Pilot
  grade_level: 6
  path: allopacks/illustrated/water_cycle_grade6.allopack.json
  license: CC-BY-4.0
  Credit explicitly says AI-generated illustrations / educator review pending.
  Preserve the existing water_cycle entry (different grade 2–3 lesson, CC0, catalog/approved/water_cycle.json).
- view_glossary_source.jsx, view_glossary_module.js,
  desktop/web-app/public/view_glossary_module.js
  Added getGlossaryImageAlt and connected descriptions to the glossary table and both flashcard image tags. Previously all three rendered alt="" role="presentation".
  Description hashes invalidate stale text when image bytes change. Explicit decorative images remain skipped. No alt-editor UI has been added.
- tests/allopack_illustrated.test.js
  Added draft checks for 24 images, byte equality, descriptions, native labels, actual glossary img markup, artifact contract and catalog separation. These tests have NOT run successfully.

## Data shapes and placement

Ten glossary entries have:
image: embedded data:image/webp;base64,...
imageAlt: reviewed description
imageAltSource: "vision"
imageAltHash: image fingerprint
imageDecorative: false

Four image resources contain 14 native visualPlan panels:
- wc-visual-pathways after wc-reading: overview, reservoirs, groundwater, surface/infiltration
- wc-visual-changes after wc-glossary: puddle, cold glass, rain/snow, breath mist
- wc-visual-drivers after wc-anchor: roots/leaf pore, sun/gravity, salt remaining
- wc-visual-clouds after wc-faq: droplets, kettle clear gap, mixed-phase cloud

Each panel uses imageUrl, alt, altSource:"vision", altHash, decorative:false, caption, labels and imagenPrompt.
Labels use text, position, anchorX/anchorY in 0–100 coordinates.
Keep groups with multiple panels: ImageView only selects VisualPanelGrid when panels.length > 1.
All 24 descriptions are <=250 characters. Native panel descriptions use "vision", not "author": the AI reviewed the generated artwork; a human has not yet approved the illustrated edition.

The last review corrected an ambiguous water-molecule drawing and a leaf-pore arrow that pointed both ways. Current canonical files contain the corrected versions.

## Verification status / environment failure

Build and renderer compilation completed successfully. NO passing test result should be inferred.
The Vitest run failed to start worker processes and reported no tests executed:
npx vitest run tests/allopack_illustrated.test.js tests/allopack_flagship.test.js tests/allopack_catalog.test.js tests/glossary_flashcard_text_a11y.test.js tests/view_glossary_wcag_a11y.test.js --maxWorkers=1

Later read-only inspection was blocked twice by automatic permission-review timeouts, and apply_patch failed with a Windows deny-read ACL helper error. These were environment failures, not findings about pack safety.

Inspect the draft test's React imports first: it currently uses require('react') and require('react-dom/server'). Existing repo tests often resolve React from desktop/web-app/node_modules. An attempted patch to use those paths FAILED and was not applied. Confirm installed dependencies and correct the imports if needed.

If worker startup still fails, try the repo-supported alternative pool or a focused direct Node/browser harness; do not label unexecuted tests passing.

## Required next steps before publication

1. Inspect scoped diffs and artifact sizes. Read the current docs/COMMUNITY_CATALOG_SEED_PLAN.md gate and decide which checks are satisfied versus outstanding. Existing text-only allopack tests intentionally reject embedded data URLs and image resource types; do NOT weaken those tests to accept the derived media edition.
2. Run the illustrated builder and tests. Validate through actual agent_core_contracts_module.js Contracts.validateArtifact:
   { schemaVersion: Contracts.SCHEMA_VERSION, artifactId: 'allopack-water-cycle-grade6-illustrated', type:'allopack', title: pack.allopack.title, language:'en', data:pack }.
   The generic data contract has an approximately 2M-character ceiling; retain room for teacher edits. Verify exact current limits.
3. Inspect all 24 optimized images at the sizes actually displayed. Confirm directions, particle diagrams, crop/legibility, no raster text, no duplicate/missing assets. Check label anchor positions against the final images, especially overview evaporation/precipitation and root/pore labels.
4. Review source lesson science too. Known text-only source concerns that were NOT corrected:
   clouds described only as liquid droplets; wording that cold air "holds" vapor; a soup-mist sorting example may confuse visible condensed droplets with invisible vapor; ocean-balance FAQ simplification; any claim of completely salt-free rain.
   Check the actual file and correct precise errors using authoritative sources. Preserve objective/resource IDs and update tests where appropriate.
5. Test the REAL CommunityCatalog component, production import handler, and image/glossary renderers. Do not substitute a homemade gallery and call that end-to-end app testing.
6. Open glossary table and flashcards with a screen reader/accessibility tree. Confirm meaningful alt is exposed and decorative fallback works. Check that quiz modes do not unintentionally expose hidden answers, including labels/captions/alt. Test replacing an image: old description must not remain attached to new pixels.
7. Test save/download and reopen through the app, not only JSON.parse/stringify. Confirm all embedded image bytes, native labels, captions and descriptions survive. Test offline reopen after the file is saved. Verify original glossary/game/directions still work.
8. Review credits: the illustrated pilot intentionally separates source-author history from new AI artwork. Do not claim educator approval, CC0, or server-side submission checks that never occurred.

## Community Library implementation and live publication

catalog_module.js defines:
MANIFEST_URL = https://raw.githubusercontent.com/Apomera/AlloFlow/main/catalog/index.json
ENTRY_BASE_URL = https://raw.githubusercontent.com/Apomera/AlloFlow/main/

Browse loads entry.path and unwraps lesson_payload only if present; raw AlloPack JSON is supported. Therefore the local catalog path above does not need a fabricated submission wrapper.

"Load in AlloFlow" passes the fetched JSON to loadProjectFromJson. In AlloFlowANTI.txt that bridge constructs a File and calls handleLoadProject. The production file loader delegates to window.AlloModules.MiscHandlers.handleLoadProject in misc_handlers_module.js, built from misc_handlers_source.jsx. Use that real flow in validation.

There is a separate submit Worker that stages pending submissions. Do not submit a duplicate through it if publishing the reviewed repository entry directly.

After checks pass:
- Prepare a tightly scoped commit/PR containing the illustrated JSON, catalog entry, necessary renderer source/build outputs, builder, tests and durable provenance.
- Inspect the project's normal deployment workflow and asset URL/cache-busting conventions. GitHub raw main is the catalog source; merging only the catalog can expose the pack before the application has the new glossary-alt renderer. Coordinate the renderer deployment with the catalog release.
- Do not rely on local PNG paths at runtime: the pack embeds WebP bytes. Full-resolution masters are for authoring and reproducibility; do not accidentally commit rejected/labeled drafts.
- Review the exact publication diff before merging/pushing. The user requested live-library testing, but follow any repository-specific branch protection and required checks.
- Once on main, fetch the exact raw manifest and pack URLs and confirm content/size. Open the deployed AlloFlow app, find the DISTINCT grade-six illustrated pilot, choose Load in AlloFlow, inspect all resources, save, close/reopen and recheck alt text.
- Record what actually passed, the deployed commit, live URLs and any remaining educator review. Do not claim live publication until the remote files and deployed UI are verified.
- If the pilot needs rollback, remove only its distinct manifest entry first; retain the original water_cycle lesson and source history.

## Next pack

Codex is starting Weather vs. Climate (allopacks/weather_vs_climate_grade5.allopack.json), a natural continuation of Water Cycle. It has ten glossary terms; the eventual target should again be dozens of images, not one cover.
The old .IMAGES.md instructions demanding baked-in labels and verbatim planned alt are superseded by the user's text-free policy.
Also fix the old shot list's misleading "one year = weather" graph label: annual averages are aggregate data, and climate depends on long-term distributions/trends. Charts should have editable native axes/labels with genuine or explicitly illustrative data.

