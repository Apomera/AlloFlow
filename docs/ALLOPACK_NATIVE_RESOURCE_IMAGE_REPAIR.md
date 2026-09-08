# Native anchor-chart and concept-sort image repair

Completed September 8, 2026 for the six illustrated editions. Image generation was available again. This pass generated and integrated the 27 previously missing sorting images using the built-in image generator. One additional city-comparison candidate was rejected for tropical vegetation inconsistent with Seattle and regenerated.

## Coverage

| Pack | Anchor sections illustrated | Sorting cards illustrated | Pending |
|---|---:|---:|---:|
| forces_motion_grade3 | 4/4 | 10/10 | 0 |
| materials_grade2 | 4/4 | 9/9 | 0 |
| plant_needs_grade3 | 5/5 | 10/10 | 0 |
| states_of_matter_grade4 | 5/5 | 9/9 | 0 |
| water_cycle_grade6 | 5/5 | 10/10 | 0 |
| weather_vs_climate_grade5 | 4/4 | 10/10 | 0 |

All 27 anchor-chart sections and all 58 concept-sort cards now have embedded images. No native-resource image slots remain pending in these six editions. The 50 text-only packs, including the five newest drafts, still await their separate illustration passes.

## Files and rebuild

Finished source PNGs, exact scene prompts, reviewed descriptions, and source provenance are in [the artwork manifest](../allopacks/media/resource_backfill/manifest.json). `mappings.json` connects the assets to native resource slots; `encoded.json` holds optimized embedded WebP data and hashes. The source files are copied into the project, not left only in the image-generator output directory.

Run `node dev-tools/backfill_allopack_resource_images.cjs` to rebuild embedded artwork. The illustrated pack builders reapply this mapping, preserving illustrations through rebuilds. All six JSON files remain below the existing 2,000,000-character portability limit. The weather/climate file is close to that limit, so check size before adding more resources.

## Accuracy and accessibility

Artwork has no instructional labels or answer markings. Native card text remains editable. Alt descriptions reflect reviewed pixels, rather than inferred experimental results. Invisible water vapor is not drawn as a visible cloud. Weather and climate images provide context; they are not measured records of dates, temperatures, forecasts, or trends. One still scene cannot independently establish a long-term claim.

Descriptions and matching hashes are stored beside each image. Current anchor and teacher-review components render decorative empty alt attributes next to lesson text; the sorting game uses item content for its image alt. These components do not yet consistently consume the newly stored descriptive fields. Educator review remains pending.

## Verification

The actual AnchorChartView, ConceptSortView teacher review, and ConceptSortGame rendered offline for all six packs. Every populated image decoded, with zero pending slots or page errors. Desktop and mobile screenshots are in `scratch/resource-backfill-qa/<slug>/`. [Saved production-component results](allopack-quality-2026-09-08/native-resource-images-complete.json).

The native-image regression test now requires every sort mapping to be filled, with zero pending images, and continues checking descriptions, hashes, portability limits, and idempotent rebuilds. All 600 tests passed across 12 AlloPack/catalog suites. The production import harness also loaded all 56 pack files and preserved all 595 resources.

This is local production-component verification. The updated files have not been published to the live community library.
