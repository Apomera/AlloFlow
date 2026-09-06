# Ten Is a Friendly Number — image shot list (text-free policy)

Companion to `making_ten_grade1.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/making_ten_grade1/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: very simple, flat, high contrast, friendly for six-year-olds; white backgrounds; large shapes.

## The numeral problem, again

Like the grade-2 place value pack, this one is about numbers, and numerals are raster text. The resolution is identical and non-negotiable: **the artwork supplies the quantity, AlloFlow's native labels supply the numeral.** A ten frame is rendered with counters and no digits. The 8, the 5 and the 13 are anchored labels.

That is not a workaround. A six-year-old should be counting the counters, not reading the answer off the picture. If a generator writes any digit into the artwork, reject it.

Two rules that matter more here than anywhere else in the catalog:

1. **Counters must be countable and correct.** A frame that is meant to hold eight must show exactly eight. A child will count them, and a picture that shows nine teaches the wrong partner. Every frame in this set needs checking by eye against the number it is labelled with.
2. **One consistent ten frame** throughout: two rows of five, same cell size, same counter shape, same two colours (one for the starting amount, one for what moves across). The whole strategy is visible only if the frames match each other.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, high contrast, NO DIGITS) | must show / must avoid |
|---|---|---|---|
| mn-term-ten | Ten | Two open hands, palms out, all ten fingers up | the reference image for the whole pack |
| mn-term-add | Add | Two small groups of counters on a table with two hands sliding them together | mid-motion, groups still distinguishable |
| mn-term-sum | Sum | One single merged group of counters in a neat cluster, hands withdrawn | the after-state of the Add card |
| mn-term-partner | Partner | A ten frame with six counters in one colour and four in another, filling it exactly | full frame; two colours; countable |
| mn-term-bond | Bond | Two small groups joined by a simple arc, sitting above one full ten frame | the arc links the pair to the whole |
| mn-term-break | Break | One group of five counters with a hand separating two of them away | mid-separation, both parts visible |
| mn-term-double | Double | Two rows of four counters, identical in colour and spacing, one above the other | the sameness is the point |
| mn-term-left | Left | A group of counters with three sitting apart, a faint trail showing where others went | the remainder is the subject |
| mn-term-count | Count | A child's finger touching the third counter in a line of counters | one-to-one touching, mid-count |
| mn-term-equal | Equal | A simple balance beam with the same number of counters on each pan, level | level beam; counters countable on both sides |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The partners (after the reading)**

1. `mn-img-make-ten` — *Move two across.* Four frames left to right. First: a ten frame with eight counters and two empty cells, and five loose counters beside it. Second: a hand lifting two of the loose counters. Third: those two placed into the empty cells, the frame now full, three counters left outside. Fourth: the full frame and the three, side by side. Labels: 8, 5, needs 2, 10 and 3, which is 13. Caption: make the ten first, and the rest is easy.
2. `mn-img-all-partners` — *Every way to fill it.* Five ten frames stacked in a column, each full, each split differently between the two colours: nine and one, eight and two, seven and three, six and four, five and five. Labels: one pair per row. Caption: every number has a partner that makes ten.
3. `mn-img-hands-partner` — *Your hands already know.* Three photos-style frames of the same two hands: all ten fingers up; six folded down; the remaining four held still. Labels: Ten, Fold six, Four are left. Caption: fold down the number you have, and what is still up is its partner.

**Group B — Why it works (after the anchor chart)**

4. `mn-img-nothing-lost` — *You only moved them.* Two ten frames plus loose counters, shown before and after the move, with the total counters visibly identical in both. A faint dotted outline marks where the moved counters came from. Labels: Before, After, Still the same amount. Caption: moving some across does not change how many there are.
5. `mn-img-doubles` — *Ones you can just know.* Three pairs of matched rows: two and two, three and three, four and four, each pair identical in colour and spacing. Labels: one sum per pair. Caption: a double is one you can learn by sight, so save the trick for the hard ones.

**Group C — The hunt (after the FAQ)**

6. `mn-img-ten-hunt` — *Ten things, two piles.* A tabletop from above with ten buttons arranged in a line, and below it the same ten buttons split into two piles in three different ways, drawn as three rows. Labels: All ten, and one pair per row. Caption: move one across at a time and you will find every way without losing count.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and **always giving the counts** — "a ten frame holding eight counters with two cells empty" — because the quantity is the entire content.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- Count the counters in every rendered image against its label before shipping. A frame showing nine where eight was asked for teaches a wrong number bond, and no reviewer catches that by skimming.
