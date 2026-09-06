# Filling Space — image shot list (text-free policy)

Companion to `volume_grade5.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/volume_grade5/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: clean, three-dimensional but simple; consistent isometric view; one idea per picture.

## The rule that makes this pack work

The reading's whole argument is that `l × w × h` is not three arbitrary numbers multiplied — it is *cubes in a layer, times layers*. Artwork either carries that argument or quietly destroys it.

So: **the cubes must always be countable.** Not a shaded box with dimension arrows, which is the standard textbook picture and teaches the formula as a rule handed down. Every panel that shows a prism shows its unit cubes as visible, separable, countable objects. A child should be able to check the arithmetic by counting the picture. If a generated image renders a smooth box, reject it — that image belongs to a different lesson.

Two more:

1. **One consistent isometric angle** across the whole set, and one cube design. Layers only read as layers if the cubes stack visibly.
2. **No dimension numbers in the artwork.** Edge lengths are native labels on plain arrows. The cubes supply the count; AlloFlow supplies the numeral. Same separation as the grade-2 place value pack, for the same reason.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (isometric, countable cubes, no numerals) | must show / must avoid |
|---|---|---|---|
| vl-term-volume | Volume | An open-topped box with unit cubes filling it exactly, a few cubes lifted out and floating above | the fit is exact; no gaps |
| vl-term-unit | Unit | One single cube, alone on white, edges clearly equal | the reference object; nothing else in frame |
| vl-term-cubic | Cubic | One cube with three edges from a corner drawn as three plain arrows in three directions | three directions, no numbers |
| vl-term-prism | Prism | A triangular prism beside a rectangular one, both with the same cross-section repeated along their length | the repeated cross-section is the point |
| vl-term-base | Base | A prism with its bottom face tinted and slightly separated from the rest | the base is one face, not the whole solid |
| vl-term-layer | Layer | Three identical flat sheets of cubes floating apart with clear gaps between them | sheets identical; gaps obvious |
| vl-term-area | Area | A flat grid of unit squares covering a rectangle, no depth at all | strictly 2D; no cubes |
| vl-term-height | Height | A stack of cubes with a plain vertical arrow beside it from base to top | arrow runs base to top, nothing else |
| vl-term-capacity | Capacity | A cross-section of a thick-walled box, the inner space tinted, the walls plain | the wall thickness must be obvious |
| vl-term-decompose | Decompose | An L-shaped solid of cubes pulled apart into two rectangular blocks, a gap between them | mid-separation; nothing counted twice |

Area and Volume are a deliberate pair: same rectangle, one flat and one with depth, at the same angle.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — Where the formula comes from (after the reading)**

1. `vl-img-layers` — *One layer, then stack.* Four frames left to right: a single row of 4 cubes; a full floor of 4 by 3 cubes; two such floors stacked with a visible seam; five floors stacked into the finished box. Labels: 4 in a row, 12 in a layer, 2 layers, 5 layers = 60. Caption: length times width builds one layer. Height counts how many layers.
2. `vl-img-not-three-numbers` — *The same box, two stories.* Two panels of an identical 4 by 3 by 5 box. Left: a smooth grey box with three dimension arrows on its edges. Right: the same box built from countable cubes with the layers visibly seamed. Labels: The formula as a rule, The formula as counting. Caption: both give 60. Only one shows you why.
3. `vl-img-base-times-height` — *It works for any prism.* A rectangular prism and a triangular prism side by side, both built from countable layers, both the same height. Labels: Base area, Height, Same rule. Caption: base area times height, as long as the cross-section does not change going up.

**Group B — Awkward shapes and units (after the anchor chart)**

4. `vl-img-decompose` — *Cut it, then add.* An L-shaped solid of cubes shown twice: whole, then split along a dotted plane into two rectangular blocks drawn slightly apart. Labels: 4 × 2 × 2 = 16, 3 × 2 × 2 = 12, Total 28. Caption: decompose it, find each volume, add them. Nothing is counted twice because the blocks do not overlap.
5. `vl-img-one-two-three` — *Why the little 3.* Three panels: a single line of cubes; a flat sheet of cubes; a solid block of cubes — same cube, same angle, growing by one direction each time. Labels: Length, Area, Volume, One direction, Two, Three. Caption: the small number counts directions, not decoration.

**Group C — The design challenge (after the FAQ)**

6. `vl-img-same-volume` — *Same amount, different box.* Two open boxes side by side, one long and low, one nearly a cube, both filled exactly with the same number of countable cubes. Labels: 9 × 2 × 2, 6 × 3 × 2, Both hold 36. Caption: equal volume does not mean equal shape, and it does not mean equal cardboard.
7. `vl-img-capacity` — *Volume is not quite capacity.* A cutaway of a thick-walled wooden crate, the inner space packed with cubes, the wall thickness clearly drawn and shaded. Labels: Outside volume, Wall, Capacity inside. Caption: the walls take up room, so a container holds less than its outside suggests.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and **stating the counts** — "twelve cubes in each of five layers" — because the count is the argument.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- If a rendered image shows a smooth box where cubes were asked for, it fails review even if it looks good. The countability is the lesson.
