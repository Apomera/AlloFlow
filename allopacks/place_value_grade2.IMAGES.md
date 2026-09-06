# Ten Is a Bundle — image shot list (text-free policy)

Companion to `place_value_grade2.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/place_value_grade2/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, flat, friendly for seven-year-olds; white or very light backgrounds; one idea per picture.

## The problem this topic has with the no-text rule

This is a pack about *numerals*, and the policy forbids raster text — which includes digits. That is not an accident and it is not a loophole to route around. **Every numeral in these pictures is a native label with an anchor, never part of the artwork.** The image supplies the quantity; AlloFlow supplies the symbol. That separation is exactly the lesson: the bundle is the amount, the digit is only a name for it.

So a generated image must contain **no digits at all** — not on a place-value mat, not on a card a child is holding, not on a ruler. If a generator writes "245" into the picture, reject it. The same picture with the number gone is the right one, and the 2, the 4 and the 5 get anchored on afterwards.

Two more rules specific to this topic:

1. **Bundles must be countable.** Ten straws in a bundle means ten drawn straws, not a vague bunch. A child will count them, and if the artwork shows eight the picture teaches the wrong thing.
2. **Keep the same object across the set.** Straws throughout, one style, one colour per place (loose ones in one colour, tens-bundles in another, hundreds-boxes in a third). A picture that switches to blocks halfway breaks the comparison the pack is built on.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text, NO DIGITS) | must show / must avoid |
|---|---|---|---|
| tn-term-digit | Digit | Ten small blank cards fanned out in a row on a desk, all empty | the emptiness is the point; numerals are added natively |
| tn-term-ones | Ones | Five loose straws lying separately on a white surface, none touching | countable at a glance; no band, no bundle |
| tn-term-tens | Tens | Four bundles of straws, each tied with a single rubber band, ten straws visible per bundle | ten per bundle, actually countable |
| tn-term-hundreds | Hundreds | One open shallow box holding ten tied bundles standing upright | ten bundles, countable; box clearly holds exactly these |
| tn-term-bundle | Bundle | Two hands sliding a rubber band around a group of ten straws, mid-action | caught in the act of bundling |
| tn-term-value | Value | One straw beside one tied bundle beside one full box, left to right, same straw style | three sizes of the same thing; no numerals |
| tn-term-regroup | Regroup | Ten loose straws on the left with a plain arrow to one tied bundle on the right | the arrow is the trade; nothing else in frame |
| tn-term-compare | Compare | Two boxes of bundles side by side on a balance beam, one side tipping down | quantity comparison, no numerals on the beam |
| tn-term-expand | Expand | One box, some bundles and some loose straws pulled apart into three separate groups | the same collection, taken apart |
| tn-term-zero | Zero | Three shallow trays in a row; the middle tray is empty with a soft dotted outline | the empty tray is the subject and must read as deliberate |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — What a place means (after the reading)**

1. `tn-img-bundles` — *One number, three kinds of thing.* A place-value mat with three blank columns: two boxes of bundles in the left column, four tied bundles in the middle, five loose straws on the right. Labels: Hundreds, Tens, Ones (column headers), 2, 4, 5 (one on each group). Caption: the same number written two ways, as stuff you can count and as three digits.
2. `tn-img-same-digit` — *Same symbol, three jobs.* Three small scenes in a row, each showing a different quantity of the same straws: two loose straws, two tied bundles, two full boxes. Labels: 2, 2, 2 (one per scene), and Worth 2, Worth 20, Worth 200. Caption: the digit never changed. Its place did.
3. `tn-img-zero-holds` — *The empty place.* Two place-value mats side by side. Left: three boxes, an empty tens tray with a dotted outline, five loose straws. Right: three boxes and five loose straws crowded together with no gap. Labels: 305, 35. Caption: without the zero the digits slide over, and the number changes.

**Group B — The two moves (after the anchor chart)**

4. `tn-img-regroup-add` — *Ten ones become one ten.* Three frames: fifteen loose straws in the ones column; a hand gathering ten of them; the mat with one new bundle in the tens column and five straws remaining. Labels: 15 ones, Trade ten, 1 ten and 5 ones. Caption: you cannot leave ten or more sitting in one place, so you trade up.
5. `tn-img-compare-left` — *Start at the left.* Two place-value mats stacked, both with five boxes in the hundreds column, one with a single bundle in the tens and the other with nine. A plain arrow points at the tens column of both. Labels: Same hundreds, 1 ten, 9 tens. Caption: the hundreds tie, so the tens decide it. The ones never get looked at.

**Group C — Making it (after the FAQ)**

6. `tn-img-buddy-poster` — *The poster test.* A second grader and a first grader on a rug with a hand-made poster between them, showing straws taped in three groups. The younger child points at the middle group. No writing is legible on the poster. Labels: Digits, Bundles, Expanded form (one per band of the poster). Caption: a poster works only if the younger reader can use it without you.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and **stating the counts** — "four tied bundles and five loose straws" — because the quantity is the content.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- If a rendered image contains any digit anywhere in the artwork, it fails review. Regenerate rather than crop.
