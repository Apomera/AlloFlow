# Living Island · EvoLab enhancement

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

Living Island is the first view for a new EvoLab visit. Saved activity selections still open the student's previous activity. The existing hub has a prominent island entry, and all 17 existing focused activities remain available.

## Student experience

- A Galápagos-inspired procedural island with an irregular coastline, sheltered bay, volcanic ridge and crater, sandy beaches, basalt outcrops, shallow coastal water, distant islets, scrub trees, grasses, and cactus silhouettes.
- Selectable spriglets with coat textures, terrain grounding and shadows; orbit/zoom controls, a creature close-up, island/coast/highland viewpoints, and four habitats.
- Individual identities, two recorded parents, three inherited traits, allele inspection, and descendant tracking across up to 60 generations.
- Manual environmental interventions or automatic habitat changes every five generations. A repeatable seed controls the model independently of rendering and playback speed.
- Play, pause, single-generation stepping, and a read-only timeline of every past population.
- Guided cold-adaptation, family-tracing, and drift investigations; predictions compared against measured outcomes; survival probabilities; a generation log; trait charts; accessible tables; and CSV export.
- A recorded generation replay switches the island between parents, actual survivors, and offspring. Survivors retain their original positions and inherited genes. Trait distributions and exact cohort means show variation and the difference between survival and reproduction.
- A visual family navigator links both parents and direct offspring to their recorded birth generations. Allele tracing shows which values match a parent and which changed at inheritance.
- Local resumption of the world, selected family, and prediction. Recorded evidence uses a separate journal entry so saving a finding cannot overwrite the student's written explanation.
- Keyboard-equivalent organism selection and camera controls, live reduced-motion support, phone layout, and a playable map when WebGL is unavailable.

## Scientific boundaries

Spriglets are fictional. The model uses three independent diploid loci, averages the two alleles for each phenotype, and inherits one allele from each of two distinct surviving parents. Random mutations occur at inheritance without an environmental target. Survival combines phenotype/environment relationships with stochastic sampling; disabling trait selection preserves random sampling and drift. Generation snapshots never mutate earlier individuals.

Generations do not overlap. Fewer than two survivors leads to extinction; there is no forced rescue. Offspring number is `min(60, floor(survivors * 2.65))`. Trait scales, effects, mutation rates, and carrying capacity are teaching choices. Migration, linkage, dominance, age structure, learned behavior, and reproductive isolation are omitted. The interface explains these limits and does not claim a complete simulation of evolution or speciation.

Reference: [UC Berkeley Understanding Evolution: mutations](https://evolution.berkeley.edu/evolution-101/mechanisms-the-processes-of-evolution/mutations/).

## Landscape and ecosystem reuse

The landscape is a fictional teaching diorama, not a geographic replica. The interface explicitly identifies winter as an experimental climate rather than a real Galápagos season. Plants and terrain are scenery; all organisms experience the selected habitat regardless of their positions.

Adapted rendering techniques from the existing Ecosystem tool include height sampling, vertex-colored terrain, procedural ground/bark/coat textures, crossed cutout foliage, instancing, bounded shadow maps, and ground-relative placement. The implementation remains private to EvoLab: it adds no ecosystem food-web logic, shared mutable state, external assets, runtime dependency, or change to the Ecosystem tool.

`IslandLandscape` uses an independent deterministic visual seed and never consumes the genetics RNG. Habitat changes reuse terrain buffers and textures, recolor the same landform, and dispose the previous vegetation instance buffers. Textures, geometry, materials, shadow maps, listeners, and the renderer are released on unmount. Reduced motion and hidden-tab behavior also pause water detail. Narrow screens receive a wider camera fit.

Landscape references: [Galápagos Conservancy: habitats and vegetation zones](https://www.galapagos.org/about_galapagos/biodiversity/) and [UNESCO: volcanic origins](https://whc.unesco.org/en/list/1).

The current translation delta contains **230 source keys**, including landscape, investigation, replay, ancestry, and journal labels. New strings are prepared for the integration owner and currently use source English fallbacks. No additional shared catalog writes were made in the landscape or investigation passes.

## Guided investigations and evidence

The three investigations use the current population, preserve the timeline, and hold Living climate off. Cold snap sets winter with trait selection on; The chance experiment sets meadow with trait selection off; Family detective tracks a current resident under the existing habitat/selection settings. Five-generation investigations and the three-generation family investigation pause playback at their result. An immediate playback guard prevents a queued timer tick from advancing beyond that boundary.

Mission progress is derived from immutable snapshots, with fixed result windows, explicit detection of changed habitat/selection/mutation settings, and early resolution on extinction. An unexpected result still counts as evidence. Students review the result before collecting a field note; no survival outcome or preferred trait is required for a collection badge. Saved mission metadata is bounded and validated against the actual starting population.

`IslandStudy` derives cohort comparisons and lineage without consuming RNG or rerunning survival. Replay uses the recorded habitat and selection setting. Survivor layouts use their parent population's indexing, so creatures stay in their original places between replay phases. Walking remains paused during parent/survivor replay. Family navigation changes only the viewed generation and selected organism.

Investigation notes use separate existing journal records (`livingIslandCold`, `livingIslandFamily`, `livingIslandDrift`), each below the journal's 2,000-character limit. General recorded evidence remains in `livingIslandData`; student writing remains in `livingIsland`. This avoids truncating accumulated notes or overwriting a student's explanation. Saved notes and collected progress resume with the island; restarting resets the current island's investigation progress while existing journal records remain available.

## Files and shared-workspace ownership

- Source: `stem_lab/stem_tool_evolab.js`.
- Exact deployment mirror: `desktop/web-app/public/stem_lab/stem_tool_evolab.js`.
- Focused tests: `tests/evolab_living_island.test.js` and `tests/e2e/evolab-living-island.spec.ts`.
- Local preview: `dev-tools/evolab_island_preview.cjs`. Serves only the explicit preview asset allowlist on loopback. Run `node dev-tools/evolab_island_preview.cjs` and open the printed URL.
- Translation utility: `dev-tools/register_evolab_island_strings.cjs`. Default behavior prepares `ui-strings.delta.json`; `--check` is read-only. `--apply` is reserved for the shared catalog owner.
- Shared files: **154 new `stem.evolab.island_*` English source keys were already registered in `ui_strings.js` and its exact public mirror before the coordination handoff arrived.** Existing unrelated changes were preserved. The same keys are available in `ui-strings.delta.json` for the integration owner. No language-pack translations or broad catalog reconciliation were run.
- All screenshots, logs, and test results for this work are under this report directory. Existing unrelated working-tree changes are not part of this enhancement.

The classic tool script needs no bundle build. The release owner can include the source/mirror pair and translation delta in the normal release and cache-refresh process. No production deployment, push, or commit was performed.

## Verification

Commands:

```text
npx vitest run evolab --maxWorkers=1 --testTimeout=30000 --reporter=json --outputFile=reports/evolab-living-island/unit-results.json
npx playwright test tests/e2e/evolab-living-island.spec.ts --workers=1 --reporter=line --output=reports/evolab-living-island/browser-artifacts
node dev-tools/register_evolab_island_strings.cjs
```

Final result: **117/117 unit tests and 6/6 browser scenarios passed.** The accessibility audit reported no violations for the tested WCAG tags.

Two new unit tests verify seed-stable geography, independence from biological replay, and dry-ground placement across population sizes and extreme seeds. A new browser scenario verifies actual terrain elevation, creature grounding, scenic controls leaving generation/population unchanged, stable terrain geometry across seasons, changed vertex colors, and disposal of all five old vegetation/rock instance buffers.

Five additional unit tests cover replay fidelity, two-parent/direct-child lineage, fixed mission result windows, changed experimental conditions, early extinction, and hostile saved mission metadata. Two additional browser scenarios verify exact playback stopping, review-before-collection, persistent mission progress, separate untruncated journal entries, preserved student writing, unchanged model state during replay/navigation, unchanged survivor positions, and allele-trace accessibility. The phone scenario now exercises replay as well. A discovered header contrast shortfall and a queued playback-tick overshoot were fixed and verified in the final pass.

The unit suite covers inheritance, deterministic replay, immutable historical snapshots, extinction, bounded populations/alleles, neutral survival, a cold-climate response across 40 seeds, ancestry, save restoration, CSV fidelity, early-extinction prediction feedback, and existing EvoLab regression contracts. The browser suite exercises actual WebGL rendering, interaction without renderer remounts, persistent family/prediction state, playback/pause, downloads, camera close-up, mobile layout, reduced motion, fallback controls, and context release. It runs axe against WCAG 2 A/AA and WCAG 2.1 AA tags.

Machine-readable unit results are in `unit-results.json`; browser results are in `browser-results.txt`. The initial broader-test failure was the expected stale deployment mirror before synchronization; it was resolved by copying and verifying the exact EvoLab mirror. A transient test-cache `ENOSPC` and OneDrive write lock were retried successfully; no unrelated files were deleted.

The landscape pass initially encountered two slow unit assertions failing under the default runner budget; all 112 passed with a 30-second per-test budget. Windows also intermittently locked mapped files; atomic replacements preserved complete source and mirror files.

Screenshots: `island-desktop.png`, `island-phone.png`, `island-phone-stage.png`, `winter-generation-five.png`, `creature-closeup.png`, `volcanic-island.png`, `lava-coast.png`, `highlands.png`, `dry-season.png`, `forest-season.png`, `survival-replay.png`, `generation-evidence.png`, `family-inheritance.png`, and `investigation-complete.png`.

Local preview verified to serve the current source at http://127.0.0.1:64557/.
Final source/mirror SHA-256: `f5b78c190bd5aa05c161412e0a519379ae26b60c7cf24a78b5e49c4b14f06c1c`.
User explicitly requested local improvements only; nothing was deployed.
