# Tell It Back — image shot list (text-free policy)

Companion to `story_retell_grade2.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/story_retell_grade2/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, flat, friendly for seven-year-olds; light backgrounds; one idea per picture.

## Why this pack is harder to illustrate than a science pack

A reading-strategy pack has no apparatus to draw, and the obvious illustration for every term is a picture of the word itself. That is exactly what the policy forbids, and it would also break the glossary flashcard quiz, which shows the picture while asking for the term. Three rules follow.

1. **Nothing readable in the frame.** No book covers with titles, no words on a chalkboard, no numbered boxes, no letters on the cards a child is holding. Where a book appears, its pages carry grey squiggle lines, never real text.
2. **Draw the idea as a moment, not as a label.** "Problem" is a rock in the path, not a sign that says problem. "Order" is three stepping stones in a line, not the digits 1-2-3.
3. **Keep the two stories visually consistent.** Ada and her puppy appear across several panels, as do Sam and his bike. Same hair, same clothes, same bike colour every time, or the sequence panels stop reading as one story.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| st-term-story | Story | A child curled in a beanbag holding an open picture book, small warm imagined shapes floating above the page | pages are squiggle lines; no readable title |
| st-term-beginning | Beginning | A closed garden gate standing open just a crack, a path visible beyond it | inviting, empty; nothing has happened yet |
| st-term-middle | Middle | A winding path with a large rock sitting squarely in the way and footprints stopping at it | the rock is unmoved; no person needed |
| st-term-end | End | The same winding path, the rock rolled to one side, the path clear to a small house | must match the middle card's path exactly |
| st-term-character | Character | One friendly child standing alone in a spotlight of soft colour, facing the viewer | a single figure, clearly the subject |
| st-term-setting | Setting | An empty room with a window showing a snowy evening outside, one lamp lit | place and time obvious, no people at all |
| st-term-problem | Problem | A bicycle lying on grass with its front wheel bent visibly out of line | the trouble is the whole picture |
| st-term-solution | Solution | The same bicycle upright with the wheel straight and a small wrench resting beside it | same bike, same grass; only the trouble is gone |
| st-term-retell | Retell | Two children on a rug facing each other, one talking with open hands, the other listening, a closed book set aside | the book is shut — this is telling, not reading |
| st-term-order | Order | Three flat stepping stones in a straight line across a shallow stream, evenly spaced | no numbers, no arrows; the line does the work |

The middle/end pair and the problem/solution pair are deliberate reuses: keep the path and the bicycle pixel-identical apart from the one change, so the pair teaches by difference.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The three parts (after the reading)**

1. `st-img-three-parts` — *One story, three parts.* A single horizontal strip cut into three equal panels: the garden gate ajar; the path with the rock; the path clear to the house. Labels: Beginning, Middle, End (one per panel). Caption: every story moves through these three, in this order.
2. `st-img-ada-beginning` — *Who and where.* Ada, a child with short curly hair, sitting on the front steps of a house on a summer afternoon with a small brown puppy in her lap. Labels: Character (anchored on Ada), Setting (anchored on the house and sunny yard). Caption: the beginning tells you who it is about and where they are.
3. `st-img-ada-middle` — *The trouble piles up.* The same living room three times across the frame: a chewed shoe, then a chewed hat added, then a chewed library book added, the puppy looking pleased and Ada looking tired. Labels: The problem (anchored on the pile). Caption: the middle is where things go wrong, and the first fixes do not stick.
4. `st-img-ada-end` — *Fixed.* Ada handing the puppy a knotted rope toy, the shoe and hat sitting safely up on a shelf behind them, the puppy chewing the rope. Labels: The solution (anchored on the rope toy). Caption: the end fixes the problem, and things go quiet again.

**Group B — Retelling (after the anchor chart)**

5. `st-img-the-but-door` — *The word that turns a story.* A hallway with one open door in it: on the near side, Ada happily hugging the puppy in warm light; through the doorway, the same room in cooler light with the chewed shoe on the floor. Labels: Before the turn, After the turn (one per side of the doorway). Caption: listen for the word but; almost always, that is where the middle starts.
6. `st-img-retelling-hand` — *Count it on your hand.* A child's hand seen from the side with the thumb up, then the same hand with thumb and pointer up, then with three fingers up, drawn as three stages left to right. Labels: Who and where, What went wrong, How it got fixed. Caption: one finger per part, so nobody skips the middle.
7. `st-img-buddy-card` — *Testing the card.* A second grader and a first grader side by side on a rug, the younger one holding a small blank index card with three empty boxes drawn on it and pointing at the middle box while talking. Labels: The buddy holds it, Three boxes in order. Caption: a card works only if the younger reader can use it without help.

**Group C — Sorting practice (after the concept sort)**

8. `st-img-sam-strip` — *Sam's story, out of order.* Four small scenes scattered at slight angles as if dropped: Sam unwrapping a bike; Sam sitting in the grass beside a wobbling front wheel; an adult's hands and a wrench at the wheel bolt; Sam riding past a park gate. Labels: one per scene, naming what happens (Gets the bike, Falls, Aunt tightens the bolt, Rides to the park). Caption: four moments from one story, deliberately out of order — put them back.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, including which of a paired image is the "before" and which is the "after", since the pairs teach by difference.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word. This bites hardest here, where the natural sentence for the Problem card is "a bicycle with a problem".
- Alt for the three-panel and four-panel strips must say the number of panels and describe them in order, so a screen-reader listener gets the sequence the sighted reader gets.
