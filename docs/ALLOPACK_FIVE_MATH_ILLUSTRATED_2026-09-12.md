# Five math AlloPacks — illustrated editions

Completed locally on 2026-09-12. These are educator-review drafts; no live publication, commit or push. Original text-only packs are preserved.

## Packs and coverage

| Illustrated pack | Resources | Image placements | Audited text refinements |
| --- | ---: | ---: | ---: |
| [Place Value, Grade 2](../allopacks/illustrated/place_value_grade2.allopack.json) | 14 | 31 | 24 |
| [Ratios in Real Life, Grade 6](../allopacks/illustrated/ratios_real_life_grade6.allopack.json) | 14 | 30 | 43 |
| [Data and Typical, Grade 6](../allopacks/illustrated/data_and_typical_grade6.allopack.json) | 15 | 33 | 42 |
| [Proportional Relationships, Grade 7](../allopacks/illustrated/proportional_relationships_grade7.allopack.json) | 14 | 33 | 47 |
| [Linear Equations, Grade 8](../allopacks/illustrated/linear_equations_grade8.allopack.json) | 14 | 33 | 37 |
| Total | 71 | 160 | 193 |

All 55 glossary entries, 20 anchor-chart sections, 45 concept-sort cards and 40 lesson panels have embedded images. Ten generated originals and 61 precise SVG diagram designs are reused where concepts match; placements do not mean unique paintings. Each file is below the two-million-character import limit.

The artwork uses layered paper and colored pencil for place value, gouache for ratios, paper and pastel for data, pencil and clay-like illustration for proportional relationships, and risograph/cut-paper treatment for linear equations. Pictures focus on lesson content and contain no people or baked-in labels. Exact counts, ratios and graph coordinates use deterministic diagrams. Object illustrations provide context rather than measurement data.

Every placement includes an image-specific description, hash and embedded WebP pixels. Source originals, prompts, diagrams, assets, manifests and content-refinement audits are saved under `allopacks/media/<slug>/`. Sources are copied into the workspace; offline reopening requires neither the generator nor remote image URLs.

## Accuracy refinements

- Place Value: corrected the zero in 230 to the ones place; clarified canonical versus regrouped forms of 305; aligned comparisons by place; corrected the hundreds anchor to show two hundred-flats. Block groups are schematic, not a shared physical scale.
- Ratios: clarified ratio order, units, unit cancellation and nonzero scaling; removed unsupported retailer-intent claims and speed pressure; supplied self-contained hypothetical supplier prices and a feasible budget example. The flour/milk picture is explicitly uncalibrated and must not be used to measure a volume ratio.
- Data: clarified statistical questions, repeated-value medians, sampling and the purpose of different summaries; removed a duplicate correct median-quiz answer; supplied a checkable seven-value example. Close plotted values use stems and vertical staggering to avoid overlap; captions explain that staggering is not a second variable.
- Proportional Relationships: separated the nonzero-input ratio test from checking zero; avoided division by zero; clarified that passing through the origin alone is insufficient; distinguished discrete inputs from continuous lines. Corrected an intercept from 8 to 5 and made model assumptions explicit.
- Linear Equations: qualified nonvertical lines, signed slope and context-dependent intercepts; limited tank, battery and candle models to valid domains; changed battery decrease to percentage points; added a self-contained vendor comparison with intersection at 20 weeks and $800.

All 193 changed source string fields have before/after audit entries. Original packs remain unchanged.

## Verification

- [332 passing tests](allopack-quality-2026-09-12/five-math-tests.json): 30 targeted tests and 302 catalog checks. Checks cover exact diagrams, math facts, quiz keys, image data, hashes, audits, source preservation and production artifact envelopes.
- [Collection imports](allopack-quality-2026-09-12/imports.json): 83 files and 982 resources pass. The collection now includes 33 illustrated editions.
- Local catalog download and offline production-loader reopening preserve all 71 resources. All 160 embedded image placements decode; all 40 lesson-panel alt attributes pass.
- All 20 anchor images and 45 sort images render offline, including teacher review and student sort views. Zero pending sort images.
- Visual review covered all ten generated originals, all diagram contact sheets, all twenty mobile lesson groups and all five mobile native-resource views.

Per-pack integration and native-resource reports are saved in `docs/allopack-quality-2026-09-12/` as `<slug>-integration.json` and `<slug>-native-resources.json`. Screenshots are under `scratch/<slug>-qa/` and `scratch/resource-backfill-qa/<slug>/`.

## Educator review and publication handoff

Import the illustrated files linked above for review. Tests use production components with local catalog responses; they are not a live signed-in community-library publication test. Harness translations and styling are incomplete.

Graph artwork is deliberately text-free. Captions supply axis ranges, units and grid steps, but editable axis labels have not been populated. Add those labels in the app before independent graph-reading activities. Small sort thumbnails accompany the card statements and are qualitative reminders, not standalone quantitative graphs. Enlarge lesson panels for counting and measurement instruction.

Descriptions are stored in all slots. Existing glossary and lesson views consume them; anchor and teacher-sort views treat adjacent images as decorative, while student sort uses card statements as alt. This is not a complete screen-reader audit of those renderers.

Review mathematical wording, graph labels and grade appropriateness before publishing. No live library changes were made in this batch.

## Rebuild

```powershell
node dev-tools/build_five_math_illustrated.cjs place_value_grade2 ratios_real_life_grade6 data_and_typical_grade6 proportional_relationships_grade7 linear_equations_grade8
```

Use this wrapper so each content refiner runs after image assembly. The initial planner (`dev-tools/plan_five_math_illustrated.cjs`) refuses to overwrite an existing manifest. The five `tests/allopack_*_illustrated.test.js` files matching these topics provide targeted checks.
