# Magnetism — illustrated edition

[Importable AlloPack](../allopacks/illustrated/magnetism_grade6.allopack.json) · [Artwork, prompts and descriptions](../allopacks/media/magnetism_grade6/manifest.json) · [Before/after content audit](../allopacks/media/magnetism_grade6/content-refinements.json)

This edition contains 34 image placements across 14 resources: eleven glossary images, five anchor-section images, ten concept-sort pictures and eight lesson panels. Ten original colored-pencil/gouache specimen illustrations were made with the built-in image generator. Eleven SVG diagram designs explain the scientific relationships. Reuse gives 11 generated-art placements and 23 diagram placements. The portable JSON contains 428,766 characters.

The object pictures include a paperclip, aluminum can, nail, copper tube, plain coin silhouette, refrigerator, gold ring, cobalt sample, plastic bottle and screwdriver. Material identity comes from the card wording; appearance cannot prove an alloy. The coin deliberately omits all minted text and decoration. Its caption specifies the intended U.S. copper-nickel five-cent coin.

Artwork is text-free. Editable native captions explain diagram colors and distinguish force arrows from field-direction arrows. Every image has a reviewed description and a production-compatible hash.

## Accuracy refinements

Seventy-four field changes apply only to this illustrated edition. The original text-only source remains unchanged. The audit records before and after values; the directions-body entry includes the image guidance already appended by the shared builder.

The material examples now specify alloys and ordinary stationary sticking-test conditions. Some stainless steels respond differently from carbon steel, and a sticking test cannot identify composition by itself. The copper-penny ambiguity is replaced with a copper tube; the cobalt card describes an initially unmagnetized sample rather than an oriented permanent magnet. [British Stainless Steel Association](https://bssa.org.uk/bssa_articles/magnetic-properties-of-stainless-steel/)

The five-cent coin is explicitly identified by its 75% copper and 25% nickel composition. The illustration is a plain representative silhouette, not a numismatic reproduction. [U.S. Mint specifications](https://www.usmint.gov/learn/coins-and-medals/circulating-coins/coin-specifications)

Earth’s liquid outer core is distinguished from the solid inner core. The compass explanation uses the local field and avoids equating magnetic and geographic north. [USGS core explanation](https://www.usgs.gov/faqs/how-does-earths-core-generate-a-magnetic-field), [USGS introduction to geomagnetism](https://www.usgs.gov/programs/geomagnetism/introduction-geomagnetism)

Electromagnet wording now accounts for residual magnetism, geometry and current when comparing coil turns, and mechanical release mechanisms for permanent magnets. Reading, anchor charts, memory aids, quiz answers, sentence frames and the design brief have been aligned. The directions now distinguish a force from the field used to describe it.

The activity uses small clean objects over a tray, a teacher-approved current-limited kit with fixed settings, or a non-electrical release model. It does not direct students to short a loose wire across a battery, add batteries, or lift full cans. Coil heating is a real limitation that requires attention to the chosen equipment’s instructions. [Science Buddies electromagnet project](https://www.sciencebuddies.org/science-fair-projects/project-ideas/Elec_p035/electricity-electronics/strength-of-an-electromagnet)

## Visual review

Facing unlike poles have inward force arrows; like poles have outward arrows. Each smaller bar in the division thought experiment retains both pole colors. That image is not a cutting instruction.

Field-direction arrows point north to south outside the bar and return inside. The curves are schematic, not measurements or physical threads. The compass arrow represents a chosen local horizontal field direction, not true north on a map.

The two circuit diagrams show a closed versus open switch and a held versus released paperclip. The supply block represents approved equipment; these are conceptual illustrations, not construction wiring. The release caption explicitly acknowledges residual magnetism.

The Earth cutaway keeps the fluid-motion arrows in the outer-core ring. Rings and arrows are illustrative rather than a literal measured flow pattern.

## Verification

- All 15 targeted pack/catalog checks passed, including six pack tests.
- Tests check pole orientation, force-arrow direction, internal/external field direction, switch state, full image coverage, alt hashes, answer-option consistency and every recorded content refinement.
- All 70 pack files, containing 793 resources, passed the production-loader import check.
- Local CommunityCatalog loading, download and offline reopening preserved all 14 resources.
- All 34 embedded images decoded offline; all eight lesson descriptions reached native alt attributes.
- Five anchor images, ten teacher-sort images and ten student-sort images rendered with zero pending slots.
- Generated originals, diagram contact sheet, all four mobile lesson groups and the native-resource mobile screenshot were visually reviewed.

[Test results](allopack-quality-2026-09-10/magnetism-tests.json) · [Integration evidence](allopack-quality-2026-09-10/magnetism-integration.json) · [Native-resource evidence](allopack-quality-2026-09-10/magnetism-native-resources.json) · [Collection imports](allopack-quality-2026-09-10/imports.json)

Checks use local production-component harnesses, not a live deployment or full signed-in teacher session. Harness styling and translations are incomplete. Small anchor thumbnails serve as reminders; use the larger lesson diagrams for teaching details.

Rich descriptions are stored in every image slot. Existing anchor and teacher-sort views treat images as decorative beside text; student-sort uses card statements as alt. Glossary and lesson views consume the reviewed descriptions. Full accessibility review of those existing renderer behaviors remains separate from pack integration.

Educator review is pending. No community-library entry was published.

## Rebuild

Run `node dev-tools/build_magnetism_illustrated.cjs`. It runs the shared builder and then `dev-tools/magnetism_content_refinements.cjs`. Running the generic builder alone would omit the scientific corrections.

Final prompts, selected sources and descriptions are in the manifest. Source PNGs, editable SVGs and embedded WebPs are retained under `allopacks/media/magnetism_grade6`. The planner refuses to overwrite an existing manifest.

Twenty illustrated editions are now present.

