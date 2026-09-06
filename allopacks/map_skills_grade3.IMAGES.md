# Reading a Map — image shot list (text-free policy)

Companion to `map_skills_grade3.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/map_skills_grade3/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: flat, clear, friendly for eight-year-olds; light backgrounds; one idea per picture.

## The hardest pack in the catalog for the no-text rule

Maps are made of writing. Place names, a key with words beside each symbol, numbers on a scale bar — all of it is raster text, and all of it is forbidden here. Do not treat that as an obstacle to work around, because the separation is the lesson: **the picture carries the place, AlloFlow's native labels carry the words.** A child who sees the key's words appear as real, selectable, translatable labels is seeing the point of a key more clearly than a flattened JPEG would ever show them.

Concretely:

1. **A key box is drawn empty.** Render the box and the row of symbols inside it. The words beside each symbol are native labels anchored to each row. A generated key with words baked in is a reject.
2. **A scale bar is drawn with tick marks and no numbers.** The number goes on natively.
3. **No place names anywhere** — not on a road, not on a river, not on a border.
4. **Two things must not be invented.** Where a panel shows real geography (the Greenland and Africa comparison), the shapes must be the real coastlines, correctly proportioned for the projection being shown. An invented blob teaches nothing and a wrong one teaches something false.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text, no numerals) | must show / must avoid |
|---|---|---|---|
| mk-term-map | Map | A child's hand-drawn map of a bedroom seen from above: bed, desk, door, rug | strictly top-down; no furniture drawn from the side |
| mk-term-symbol | Symbol | Three small map icons on white — a tent, a tree, a bridge — evenly spaced | icons only, no words, no key box |
| mk-term-key | Key | An empty bordered box with four symbols in a vertical row and clear blank space to the right of each | the blank space is where native labels land; it must be obvious |
| mk-term-compass | Compass | A four-point compass rose, north arrow longer than the others | no letters on the points; the long arrow carries north |
| mk-term-scale | Scale | A short horizontal bar with five evenly spaced tick marks, a long winding road behind it | tick marks only; no numerals anywhere |
| mk-term-border | Border | Two flat areas of different colour meeting along a dashed line, a river running beside it | the dashed line reads as drawn, not natural |
| mk-term-globe | Globe | A globe on a stand, tilted, showing one ocean and parts of two continents | real continent shapes; no grid lines, no labels |
| mk-term-distance | Distance | Two small houses on a plain with a dotted line between them and footprints along it | the gap is the subject |
| mk-term-region | Region | A landscape strip split into three bands — forest, farmland, desert — each clearly uniform inside itself | sameness within each band is what makes it a region |
| mk-term-landmark | Landmark | A tall water tower standing above low rooftops, visible from a distance | it must read as findable from far away |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — A map is a set of choices (after the reading)**

1. `mk-img-classroom-map` — *The same room, twice.* Two panels side by side. Left: a photograph-style top-down view of a busy classroom with backpacks, papers, crumbs, chairs at angles. Right: the same room as a clean map with only desks, door, windows and rug, drawn as simple shapes. Labels: Everything, What a map keeps. Caption: the map is not less true. It is the part somebody chose to keep.
2. `mk-img-key-and-map` — *A symbol is just a shape until the key speaks.* A small town map with six symbols scattered on it, and an empty key box in the corner holding the same six symbols in a column with blank space beside each. Labels: one per key row (Campground, River, School, Bridge, Park, Hospital), plus Key. Caption: read the key first, then the map.
3. `mk-img-north-is-a-habit` — *North is not the top of anything.* The same simple continent outline drawn twice at the same size: once with north up, once rotated so east is up, both with a compass rose oriented to match. Labels: North at the top, East at the top, Both are correct. Caption: putting north up is a habit mapmakers settled on, not a rule of the planet.

**Group B — What flattening does (after the anchor chart)**

4. `mk-img-greenland-africa` — *The stretch.* Two panels. Left: Greenland and Africa as they appear on a Mercator-style flat map, where they look close to the same size. Right: the same two landmasses drawn at true relative area, Africa dwarfing Greenland. Labels: On a flat map, At true size, Africa is about 14 times larger. Caption: flattening a round Earth stretches the places far from the middle. Shapes must be the real coastlines.
5. `mk-img-peel-the-globe` — *Why it happens.* A globe with its surface peeled into orange-peel segments, laid flat, with gaps between the segments. Labels: Gaps appear, Something must stretch to close them. Caption: a round surface cannot lie flat without being pulled somewhere.

**Group C — Making one (after the FAQ)**

6. `mk-img-school-route` — *A map with one job.* A school floor plan from above with a single route from the front door to the cafeteria drawn as a bold line, the rest of the building faded to pale grey. A small key box sits in the corner with three symbols. Labels: Front door, Cafeteria, Everything else, faded on purpose. Caption: this map got easier to use by showing less.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and for paired panels stating which is which — a listener needs to know which side is the flat map and which is true size.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- If any readable word or numeral appears in the artwork, it fails review. Regenerate rather than paint over it.
