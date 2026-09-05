# Illustrated Water Cycle AlloPack: verification and publication record

Claude, September 5, 2026. Continues `docs/CLAUDE_HANDOFF_ILLUSTRATED_ALLOPACK_PUBLISH.md`. Everything below was run against the working tree; nothing is claimed as live until the "Publication" section says so.

## What changed since the handoff

- **Science corrections in the source pack** (`allopacks/water_cycle_grade6.allopack.json`, 12 lines), then the illustrated edition was rebuilt from it with `dev-tools/build_water_cycle_illustrated.cjs`. Image bytes, hashes and descriptions were confirmed identical before and after the rebuild; only text changed.
  - Reading: the "cold air cannot hold as much vapor" model is replaced with cooling, slower molecules and condensation on dust and salt specks; clouds are droplets "plus tiny ice crystals when the cloud is cold enough"; droplets fall when "too heavy for the rising air to keep them up".
  - Anchor chart: "cooling turns vapor back into droplets"; "billions of floating droplets (and ice crystals when cold)".
  - Concept sort: "Steam rises from a hot pot of soup" (visible steam is condensed mist) is now "Hot soup sends invisible water vapor into the air", still in the evaporation category.
  - Quiz: the cloud-composition answer is "Tiny floating water droplets and ice crystals"; the condensation-aloft answer is "Water vapor cools there and turns back into liquid". Two distractors were lengthened so the correct option carries no length tell. Every correctAnswer still matches an option byte for byte.
  - FAQ: the ocean-balance answer now says evaporation removes far more than rivers add, most falls back on the ocean, the rest returns via land; rain is "fresh water" with traces of sea-salt rather than "salt-free".
- **Agent Core contract depth** (`agent_core_contracts_module.js` and its public mirror): the safety scanner's nesting cap moved from 8 to 10 levels. A real AlloPack nests envelope, data, history item, data, visualPlan, panels, labels: nine levels. At 8 the contract rejected any lesson with labelled visuals, not only this pilot. The existing "fails closed on a 10-deep secret" test still passes, and a new test pins that a labelled visual panel validates.
- **Draft test repaired** (`tests/allopack_illustrated.test.js`): React now resolves from `desktop/web-app`, using a filesystem path because `import.meta.url` is an http URL under jsdom. One assertion added: no glossary description names its own term, since flashcard quiz mode shows the picture beside the term prompt.
- **Visual harness moved out of the repo.** Contact sheets and the deployed-app harness live in the session scratchpad and `scratch/allopack-images-2026-09-04/`, not in tracked files.

## Verification

| Check | Result |
| --- | --- |
| `tests/allopack_illustrated.test.js` | 9 passed |
| `tests/agent_core_contracts.test.js` | 27 passed (includes the new depth case) |
| `tests/allopack_catalog.test.js` | 128 passed |
| `tests/glossary_flashcard_text_a11y.test.js`, `tests/view_glossary_wcag_a11y.test.js` | passed |
| `tests/allopack_flagship.test.js` | 1 failure, pre-existing: it greps `AlloFlowANTI.txt` for a translate-tether string that HEAD contains and the working copy (another session's in-flight 1053/1956-line edit) does not. Unrelated to this pack. |
| `Contracts.validateArtifact` on the illustrated pack | ok, 1,621,652 serialized characters against the 2,000,000 ceiling (about 19 percent headroom for teacher edits) |
| Source/public parity | `view_glossary_module.js` rebuilt from source and byte-identical to its mirror; `agent_core_contracts_module.js` identical to its mirror |
| Builder | second run used the durable `manifest.json` and `alt-text.json`, no scratch files; output identical images |

### Images at display size

All 24 WebP assets were rendered at the sizes the app uses (glossary table 150 px, flashcard, panel width 440 px) with the native label positions and anchor dots overlaid, and inspected. No raster text, labels, numbers or watermarks. Anchors land on the intended features: Evaporation on the rising arrows over the ocean, Precipitation on the mountain rain, Runoff on the surface arrow, Infiltration on the downward arrows, Roots on the roots, Leaf pore on the pore opening. The leaf pore shows one outward arrow and the vapor model shows four separated H2O molecules, matching the corrected descriptions. The two superseded labelled drafts are not in the manifest and are not committed.

### Real app, deployed host, local pack routed in

Playwright drove `https://alloflow-cdn.pages.dev/app/` with the service worker blocked and three requests intercepted: the raw GitHub catalog manifest (local `catalog/index.json`), the pack path (local illustrated JSON), and `view_glossary_module.js` (local build). Everything else was the deployed application.

- Community Catalog lists both "The Water Cycle" (grade 2-3, CC0) and "The Water Cycle — Illustrated Grade 6 Pilot" (grade 6, CC-BY-4.0, credit "AI-generated illustrations, educator review pending").
- "Load in AlloFlow" ran the production `MiscHandlers.handleLoadProject` path. All 12 resources appear in History; the last one opens as resource 12 of 12; the project auto-saved to the device.
- Glossary table: 10 WebP images, 10 with descriptive alt, none with `role="presentation"`.
- Lesson Images: the four-panel group renders four images with alt, the caption text, and the Evaporation and Precipitation labels.
- Flashcards ("Standard Deck"): with images shown, the card image exposes the description; the quiz side shows the term and definition choices, and the description does not name the term.
- Save Project (Teacher Full Backup) produced `resource-pack-project-2026-09-05.json`: 24 WebP data URLs, 10 `imageAlt`, 14 panel `altHash`, 6 label anchors, 14 captions.
- After a fresh page load, History > More > Load Project with that file restored the pack; the glossary again showed 10 images with alt and no presentation role.
- No page errors in any run.

Two host observations, both pre-existing and outside this pack: clicking "Load in AlloFlow" before the deferred module pump has registered `MiscHandlers` fails with "MiscHandlers module not loaded - reload the page" (see the module pump note in memory); and the catalog dialog stays open after a successful load.

Not done: a physical screen reader session (the accessibility tree was checked through DOM attributes only), Spanish whole-pack translation, Send home shelf reopen, and the seed plan's cross-set checks 8-10, which gate the catalog launch rather than a single pack.

## Publication

Committed locally by pathspec (see the commit for the exact list): source and illustrated packs, WebP assets with `manifest.json` and `alt-text.json`, catalog entry, glossary source/module/mirror, contracts module/mirror, builder, both tests, this report and the handoff. The PNG masters (24 files, about 55 MB) are deliberately not committed: each pack of this kind would add tens of megabytes to a repository that also feeds the CDN deploy. They remain in `allopacks/media/water_cycle_grade6/` on disk and are reproducible from the prompts and hashes recorded in `manifest.json`.

Publication to the live Community Library is a `git push origin main` (the catalog reads raw main). At the time of writing, main also carries ten unpushed commits from other sessions (Art Studio, Machine Lab, Brain Atlas, Fisher Lab), so the push was held for the user's decision rather than made here. Note also that the deployed app loads modules by CDN hash reference, so the glossary alt renderer goes live only with the next deploy, not with the catalog push; until then the pack loads and renders normally but glossary images announce as decorative, exactly as before this work.

Rollback, if ever needed: remove only the `water_cycle_grade6_illustrated` entry from `catalog/index.json`; the original `water_cycle` entry and the source pack are untouched by that.
