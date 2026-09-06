# Learn One, Read Many — image shot list (text-free policy)

Companion to `word_families_grade1.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/word_families_grade1/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bold, flat, high contrast, friendly for six-year-olds; white backgrounds.

## The sharpest version of the symbol problem in the whole catalog

Place value is about numerals, maps are about place names, context clues is about sentences — and this pack is about **letters themselves**. It is the hardest case of the same collision, and the resolution is the same and matters most here.

**The artwork never contains a letter.** It contains the *things the words name*: a cat, a hat, a bat, a mat. The letters are native labels anchored beneath each picture. A first grader must decode the label, which is the entire skill; a picture with "cat" painted into it does the decoding for them and teaches nothing.

The one structural exception is the flip-book panel, where the *shape* of a flip book is drawn — a fixed back card and a hinged front card — with both parts blank. The letters go on as labels.

Two supporting rules:

1. **Rhyming sets must be drawn in one visual style, at one scale, on one background.** The whole point is that only the front changes. If the cat is a photo-real tabby and the hat is a flat cartoon, the child sees difference where the lesson needs sameness.
2. **Every object must be unmistakable to a six-year-old.** A "fig" and a "wig" have to be instantly nameable. If an object needs explaining, it is the wrong object; swap the word.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, bold, NO LETTERS ANYWHERE) | must show / must avoid |
|---|---|---|---|
| wf-term-word | Word | Three small cards lying in a row, all blank, one being picked up | blank cards; the label lands on them |
| wf-term-letter | Letter | One single blank card held up between finger and thumb | one card, held; nothing written |
| wf-term-sound | Sound | A child's open mouth mid-sound with three soft arcs travelling out | sound as motion, not as symbols |
| wf-term-chunk | Chunk | One card split into a small left piece and a larger right piece, slightly apart | the right piece is bigger; both blank |
| wf-term-start | Start | The same split card with the small LEFT piece lifted and highlighted | mirrors the chunk card exactly |
| wf-term-family | Family | Four objects in a row on one shelf: a cat, a hat, a bat, a mat | one style, one scale, one background |
| wf-term-rhyme | Rhyme | Two children face to face, matching sound arcs leaving both mouths | the arcs match in shape |
| wf-term-vowel | Vowel | Five blank round tokens in a row, all one colour, distinct from other tokens | five, and clearly a set |
| wf-term-blend | Blend | Two blank tokens pressed together with a small spark where they meet | joined, not separate |
| wf-term-pattern | Pattern | A repeating row of three shapes, repeated three times across the frame | obvious repeat, no letters |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The swap (after the reading)**

1. `wf-img-swap-front` — *Six words, one chunk.* A single horizontal strip of six objects, evenly spaced, all in the same style on the same background: a cat, a hat, a bat, a mat, a rat, a pat of butter. Labels: one word beneath each object, plus a bracket across the shared ending. Caption: you did not learn six words. You learned one ending and swapped the front.
2. `wf-img-op-family` — *Another family.* Four objects in the same layout and style: a hopping frog, a mop, a spinning top, a popping corn kernel. Labels: one word each. Caption: keep the ending, change the front, and the family grows.
3. `wf-img-blend-front` — *Two letters, one sound.* Three objects whose names start with a blend: a stop sign shape with no writing on it, an axe chopping, a shop front with a blank sign. Labels: one word each, with the first two letters tinted. Caption: sometimes the front is two letters said fast together.

**Group B — Eyes and ears (after the anchor chart)**

4. `wf-img-eyes-ears` — *Two checks, in order.* Two panels. Left: a child's eyes, looking down at a blank card. Right: the same child's ear, with sound arcs arriving. Labels: Does it LOOK the same at the end?, Does it SOUND the same at the end? Caption: check with your eyes, then check with your ears.
5. `wf-img-rhyme-mismatch` — *They rhyme and they do not match.* Two objects side by side in the same style: a hand humming (a person mid-hum, eyes closed) and a small pile representing "some" — say, a few counters. The two objects look unrelated. Labels: some, hum, These rhyme. Caption: English does this sometimes, so your ears matter as much as your eyes.

**Group C — Making one (after the FAQ)**

6. `wf-img-flip-book` — *How a flip book works.* A flip book drawn from a three-quarter angle: a fixed back card and three hinged front cards, all blank, one mid-flip. A child's hand turns the top one. Labels: This part never moves, These flip. Caption: write the ending once, and let only the front change.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture. Name the objects, since the objects are how a listener gets the words.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- If any letter appears anywhere in the artwork, it fails review. This pack has no exceptions to that, because reading the label *is* the exercise.
