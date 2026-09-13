# Area and Composite Volume guidance audit

Only `areaSurface` and `compositeVolume` are changed. The fixtures contain original activities and dialogue, with all existing assessment questions retained. Activity checklists and journals are learner self-review; they do not claim automatic build grading or scripted unlocks.

Apply the prepared literal replacements with:

```powershell
node reports/geometry-world-guidance-2026-09-12/apply-guided-presets.cjs --apply
npx vitest run tests/geometry_world_guided_preset_correctness.test.js --maxWorkers=1
```

Without `--apply`, the patch script validates the resulting JavaScript and reports its size without changing production. It preserves the source line endings and all unrelated preset regions. The preparation script writes reviewable JSON fixtures only; do not rerun it on an already-corrected Composite preset.

## Concrete corrections

- The Composite T stem was actually 2 × 5 × 3 = 30 cubes although its dialogue and questions expected 20. Lowering the stem to two layers makes the intended total 48 + 20 = 68. A gold stem and blue bar make the non-overlapping decomposition visible. Measure still selects both touching colors together.
- Both lessons spawned the learner inside a protected model. Initial positions now have clear body space above supported ground.
- Guides previously stood on the 8-high gold prism, other model tops, or floated above the U. Every guide now stands on a walkable ground cell. All activity travel points also have clear body columns and ground paths from spawn.
- Composite U guidance now counts the shared corners once: 24 + 24 + 16 = 64. Its 6 × 6 × 4 bounding box is 144; its 4 × 5 × 4 opening is 80. The original multiple-choice questions remain unchanged.

## Richer optional activities

Area has five stops: base area to volume, equal volume with different dimensions, alternating layers, full surface area, and a learner build. The new sand work pad is empty and supports two separated 24-cube examples. A non-question Design Coach explains how to check them. Composite has four stops: the two-color T, shrinking pyramid layers, the open U, and a genuinely composite 50-unit step built by the learner.

| Lesson/model | Actual occupied volume | Bounding volume | Full exposed surface area |
| --- | ---: | ---: | ---: |
| Area blue 6 × 4 × 3 | 72 | 72 | 108 |
| Area gold 3 × 3 × 8 | 72 | 72 | 114 |
| Area striped 5 × 5 × 4 | 100 | 100 | 130 |
| Composite T | 68 | 168 | — |
| Composite stepped pyramid | 56 | 108 | — |
| Composite open U | 64 | 144 | — |

Surface area counts all six exterior sides of the selected model, including its underside. Separate ground cells are excluded from model measurement. The striped prism has four 25-cube layers: 50 sand cubes and 50 wood cubes. Its two materials should not be mistaken for only two layers.

The hinted 50-unit build has a 5 × 3 × 2 base of 30 cubes, with a 5 × 2 × 2 upper section of 20 cubes on the back two rows. Its occupied volume is 50 and its bounding volume is 60. The hint is not prebuilt on the pad.

## Capacity and assessment continuity

Area retains three question NPCs and eight total question steps. Composite retains four question NPCs and ten total steps. Only the stem question wording changes to state length, width and height clearly; its correct answer remains 20.

Area has 244 protected non-ground blocks and a 625-cell ground surface, leaving 1,256 cells of the 1,500 construction budget for learner builds. Composite has 188 protected non-ground blocks and a 775-cell ground surface, leaving 1,312 construction cells. Flat floor and work-pad overlays explicitly use `measurementLayer: 'ground'`.

The production-reading regression test verifies connected components, exact block/material/layer counts, the engine’s actual exposed-face helper, complete geometric fit of the proposed builds, assessment continuity, ground bounds, walking reachability and safe travel columns. Separate model components contain no accidental scenery contacts.
