# Butterfly Habitat Lab and shared meadow foundation

A separate playable STEM activity now explores local monarch habitat in a Mid-Atlantic summer meadow. Learners can fly freely with keyboard or held touch controls, use guided travel, land at three patches, and examine them to record evidence. The activity compares common milkweed, wild bergamot, and a mown patch with no flowers or milkweed. A life-cycle reference and an evidence question connect the observations to adult and caterpillar feeding needs.

The journal uses the host's saved tool data. Only validated, unique patch observations are saved; returning to the activity starts a new flight safely paused. A map offers the same movement, landing, examination, and journal activities when WebGL is unavailable. Paused WebGL loss switches to the map without losing evidence. Window blur and page visibility changes pause flight. Decorative wing motion respects reduced motion.

## Shared code

- `stem_lab/stem_sim_meadow.js` contains three pure functions extracted from Bee Lab: vegetation geometry, patterned butterfly-wing geometry, and ambient butterfly motion driven by simulation time.
- Bee Lab delegates to these functions; Butterfly Lab uses the same recipes. Returned arrays, meshes, renderers, and live state belong to each consumer. No bee flight or colony rules were imported into Butterfly Lab.
- The app loader declares the meadow module as a prerequisite of both tools, and shares an in-flight request. `StemLab.ensureMeadow()` also resolves the module beside the host/tool script for local and bundled use.
- Butterfly Lab is included in STEM discovery, the plugin renderer allowlist, saved-state keys, and the canonical/desktop app loader sources.
- Static scenery is instanced by geometry/material. Grass uses one batch; each scene disposes its own resources.

## Scientific scope

This is a qualitative educational activity, not a population forecast or measured flight model. Movement, energy, guided paths, distances, and enlarged plant/animal models are explicitly described as teaching abstractions. The life-cycle panel is explanatory; it does not simulate rapid development. The activity represents an adult monarch, and does not extend its milkweed requirement to all butterfly species.

Sources checked on September 19, 2026:

- [Xerces Society: Mid-Atlantic monarch nectar plants](https://www.xerces.org/publications/plant-lists/monarch-nectar-plants-mid-atlantic), including its regional plant table listing common milkweed and wild bergamot as summer bloomers.
- [USDA NRCS: Monarch butterflies](https://www.nrcs.usda.gov/programs-initiatives/monarch-butterflies), for milkweed leaves as caterpillar food and nectar as adult food.
- [Monarch Joint Venture: Life cycle](https://monarchjointventure.org/monarch-biology/life-cycle).
- [Monarch Watch: Biology](https://www.monarchwatch.org/biology/), for the reduced front legs held near the thorax in the illustrative avatar.

## Validation

Initial focused model/extraction run: 30 tests passed across Butterfly Habitat Lab, bee butterfly observation/anatomy, and natural foliage.

The initial browser run completed all three habitat visits, persistence assertions, and paused context-loss recovery, but failed the accessibility audit because a labeled control group lacked a semantic role. The role was corrected before the final browser run. Rendered desktop screenshots were inspected, then scene color and foliage density were improved.

Final verification:

- Five browser checks passed: two existing Bee Lab anatomy regressions (desktop and phone), Butterfly Lab keyboard flight/pause/camera switching, all three guided habitat visits and paused WebGL loss, and mobile map/touch/restored-journal/dark-theme behavior. Axe WCAG checks passed within these browser scenarios.
- Twelve final focused unit checks passed: the nine Butterfly Lab/shared-geometry checks were rerun, plus three new loader checks proving prerequisite order, independent tool loading, and one shared pending download. Together with the initial run, this covers 33 distinct focused unit checks.
- Four changed runtime scripts passed Node syntax checks. The three app-source copies passed Babel JSX parsing. Focused git whitespace checks passed. Source and desktop runtime mirrors match.
- A broader integration run produced 21 passes and three failures: an existing Lumen dependency test and two existing host entry-point pattern tests. A separate read-only baseline run removed only this change's loader additions in memory and reproduced all three failures. No unrelated project source was changed to address these failures.

Logs: `scratch/butterfly-unit.log`, `scratch/butterfly-final-unit.log`, `scratch/butterfly-final-browser.log`, `scratch/butterfly-integration-unit.log`, and `scratch/butterfly-baseline-unit.log`.

The desktop 3D view and mobile fallback screenshots were both inspected. This work updates the local source and desktop mirrors; it does not publish a deployment.

## Visual evidence

- `scratch/butterfly-habitat/desktop.png`
- `scratch/butterfly-habitat/mobile-map.png`

This change creates the first shared component boundary and a distinct habitat activity. Migration remains in Animal Migration Lab; broader flight-engine extraction and habitat editing are future extensions.
