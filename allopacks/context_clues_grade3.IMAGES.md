# The Words Around the Word — image shot list (text-free policy)

Companion to `context_clues_grade3.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/context_clues_grade3/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, flat, friendly for eight-year-olds; light backgrounds; one idea per picture.

## The pack the policy fights hardest

This one is about sentences. The obvious illustration for every clue type is a sentence with part of it highlighted — and a sentence is raster text, which is forbidden. Do not sneak it in as "just a short example".

The resolution is the same one the Map Skills pack uses, and it is worth stating plainly: **the artwork carries the situation, the native labels carry the words.** Where a panel needs to show a sentence, the artwork renders the *shape* of a sentence — a line of even grey bars standing in for words, with one bar highlighted — and the actual words are anchored on natively. That is not a compromise. A reader who can retype, translate or read aloud the example sentence is better served than one looking at a picture of it.

So: **no legible words anywhere in the artwork.** Grey word-bars, yes. Real letters, no. This applies to the dictionary pages, the book pages and the cards a child holds.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no legible words) | must show / must avoid |
|---|---|---|---|
| cc-term-context | Context | A line of grey word-bars with the middle bar blank and the bars either side glowing softly | the glow points inward at the gap |
| cc-term-clue | Clue | A magnifying glass held over a line of grey word-bars, one bar in focus and enlarged | detective mood, no letters |
| cc-term-definition | Definition | A line of word-bars with a section set off by two commas, that section tinted a different colour | the commas are the only punctuation drawn |
| cc-term-example | Example | One large grey bar with three small pictures — an apple, a carrot, a lettuce — branching below it | the branch structure is the meaning |
| cc-term-synonym | Synonym | Two jigsaw pieces of the same colour clicking together | same colour = same meaning |
| cc-term-antonym | Antonym | Two jigsaw pieces of opposite colours, back to back, not fitting | clearly refusing to join |
| cc-term-prefix | Prefix | A word-bar with a small separate block attached at its left end, in a different colour | the block is clearly an add-on |
| cc-term-suffix | Suffix | The same word-bar with the small block attached at its right end instead | mirror of the prefix card |
| cc-term-root | Root | A word-bar with both end blocks lifted away, floating, the middle bar left glowing | the middle is the subject |
| cc-term-signal | Signal | A small flag planted in the middle of a line of word-bars, a soft arrow pointing right from it | the flag marks a turn ahead |

The prefix, suffix and root cards are a deliberate set: same bar, same colours, only the position of the blocks changes.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The four clues (after the reading)**

1. `cc-img-four-clues` — *Four shapes a sentence can make.* Four stacked rows, each a line of grey word-bars with a different structure highlighted: one with a comma-set middle section; one with a colon and three short bars after it; one with two bars of matching colour; one with two bars of opposing colour either side of a small flag. Labels: Definition, Example, Synonym, Antonym, plus the example sentence for each row anchored beneath it. Caption: the clue is a shape in the sentence, and you can learn to see the shape.
2. `cc-img-narrow-path` — *You already did this.* A steep path through rocks so tight that three hikers walk in single file, one behind the other. No text anywhere. Labels: narrow (anchored on the gap between the rocks). Caption: the picture tells you what the word means, and so did the sentence.
3. `cc-img-signal-flag` — *The little words that warn you.* One line of word-bars with a small flag partway along; to the left of the flag the bars are warm-toned, to the right they are cool-toned. Labels: but, however, instead (on the flag), Meaning turns here. Caption: a signal word tells you which kind of clue is coming.

**Group B — Word parts (after the anchor chart)**

4. `cc-img-cover-the-ends` — *Find the root.* Three frames of the same long word-bar. First: whole, with both end blocks attached. Second: two child's fingers covering the end blocks. Third: only the middle bar visible and glowing. Labels: unhappy, cover the ends, happy. Caption: cover the ends and a long word turns into one you already know.
5. `cc-img-parts-change` — *What each part did.* One middle bar shown three times: alone; with a left block added; with a right block added instead. Labels: happy, unhappy, happiness. Caption: the root stays put. The parts change what it does.

**Group C — When there is no clue (after the FAQ)**

6. `cc-img-look-it-up` — *Knowing when to stop.* A child at a desk with a book open on one side and a dictionary open on the other, finger resting on a dictionary page. Neither page has legible text. Labels: No clue here, So look it up. Caption: guessing harder does not help. Choosing to look it up is a reading skill too.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and for the word-bar panels stating **which bar is highlighted and where**, since the position is the content.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word. This bites hard here, where the natural sentence for the Root card is "a word with its root showing".
- If a rendered image contains any legible word, it fails review. Regenerate rather than blur it out.
