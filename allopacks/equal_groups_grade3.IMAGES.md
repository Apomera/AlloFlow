# Equal Groups — image shot list (text-free policy)

Companion to `equal_groups_grade3.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/equal_groups_grade3/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, flat, clean; countable objects with clear edges and generous spacing.

## The problem this pack has that no other pack has

**This is a mathematics pack, and mathematics artwork wants to contain numerals.** Every default rendering of "4 × 6" is a picture of the characters 4, ×, and 6. None of that is allowed here, and working around it is not a compromise — it is the better pedagogy, because the entire reading argues that multiplication is a picture of equal groups and only afterwards a piece of notation.

So: **the artwork carries quantity, never notation.** Four plates each holding six counters. Three rows of eight chairs. The numerals belong in AlloFlow's native labels, anchored over the image, where a student can toggle between the picture and the symbols. That toggle is the lesson.

One consequence to enforce: **everything in these panels must be countable.** A generator asked for "a group of counters" will produce an artful scatter of indeterminate size. Every panel below specifies an exact count, and an image whose objects cannot be counted confidently at a glance is rejected regardless of how good it looks. Objects do not overlap. Nothing is cut off by the frame edge.

## The mistakes this topic invites

1. **Unequal groups drawn where equal ones are called for.** A generator will happily draw plates with five, six and seven counters because it looks natural. That is the exact error the pack exists to correct. Count every group in every panel.
2. **Arrays with a ragged final row.** A 3 × 8 array has three rows of eight. Not three rows of eight, eight and seven.
3. **Objects too similar to their background.** Counting is the task, so contrast between object and surface is a correctness requirement, not a style choice.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, clean, no text or numerals) | must show / must avoid |
|---|---|---|---|
| eq-term-multiply | Multiply | Three identical bowls on a table, each holding exactly four round berries | all three counts identical and easy to verify |
| eq-term-product | Product | Twelve berries gathered into one single pile on a plate | one undivided pile; the groups are gone |
| eq-term-factor | Factor | Two bowls set slightly apart, one holding three berries, one holding five | two distinct group sizes side by side |
| eq-term-array | Array | Sixteen round buttons in four straight rows of four on a plain cloth | rows and columns both aligned; no stragglers |
| eq-term-row | Row | Six buttons in one horizontal line, plain ground, nothing else | strictly horizontal, evenly spaced |
| eq-term-column | Column | Six buttons in one vertical line, plain ground, nothing else | strictly vertical; same buttons as the row card |
| eq-term-group | Group | One bowl holding five acorns, viewed from slightly above | one container, one countable set |
| eq-term-equal | Equal | Two bowls side by side, each holding exactly five acorns | identical bowls, identical counts, identical spacing |
| eq-term-total | Total | Ten acorns poured together into a shallow wooden tray | countable but merged into one set |
| eq-term-repeat | Repeat | The same single bowl of three acorns drawn four times in a row | genuinely identical repeats, evenly spaced |

The `eq-term-row` and `eq-term-column` cards must use the same buttons, the same size and the same background, rotated. Students confuse these two words permanently, and two cards that differ only in direction is the clearest possible statement of the difference.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — What the symbol means (after the reading)**

1. `eq-img-array` — *Four groups of six.* A tabletop from directly above. Four identical round plates in a row, each holding exactly six wrapped sweets, arranged so each plate's six are instantly countable (two rows of three per plate). Warm neutral tabletop, strong contrast, no hands, nothing else in frame. This is the pack's anchor image and the native labels will point at one plate to mark it as a group and at one sweet to mark it as a member of that group.
2. `eq-img-not-equal` — *When you cannot multiply.* The same three plates, same table, same lighting, holding two, five and one sweets. Nothing signals that this is wrong — no cross, no red, no frown. The picture is neutral and the class does the noticing. Paired with the panel above, the difference is the entire rule.

**Group B — The array turns (beside the memory aid)**

3. `eq-img-rotate` — *Nothing fell out.* One egg carton holding twelve eggs, drawn twice on a plain surface: once with its long side horizontal (two rows of six) and once rotated a quarter turn (six rows of two). The carton is identical in both, down to its shading. A single curved arrow between them shows the rotation and carries no arrowhead label. This panel earns its place only if a student can count twelve in both.
4. `eq-img-chairs` — *Three rows of eight.* A classroom floor from a high angle, twenty-four identical chairs in three straight rows of eight, all facing the same way. Empty room, clean floor, plenty of space between rows so the structure reads immediately.

**Group C — Leaning on a fact you know (after the anchor chart)**

5. `eq-img-take-one-away` — *Nine groups is ten groups, minus one.* Ten identical small paper bags in a row on a shelf, each holding six marbles with the tops open so the contents are visible. The tenth bag is lifted slightly clear of the row and set apart, still upright and intact. No hand, no motion lines. The picture states the strategy without a single numeral.

**Group D — The investigation (after the challenge)**

6. `eq-img-real-arrays` — *Arrays are already everywhere.* A four-panel grid in one frame, each quadrant a real everyday array photographed flat: a window of nine panes in three rows of three, a muffin tray of twelve in three rows of four, a sheet of stickers in four rows of five, and a bank of lockers two high and six across. Counts must be exact and verifiable in every quadrant. This is the panel that sends students out looking.

## Alt text rules for this pack

Alt text for this pack **states the counts**, because the count is the content: "four plates, each holding six wrapped sweets" and not "several plates of sweets." A student who cannot see the image must be able to do the same mathematics as one who can, and a vague description takes the task away entirely. It still never states the product — the reader works that out, exactly as the seeing student does. For `eq-img-not-equal` the alt text gives the three different counts plainly and adds no comment about them.
