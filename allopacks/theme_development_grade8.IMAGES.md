# Tracing Theme — image shot list (text-free policy)

Companion to `theme_development_grade8.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/theme_development_grade8/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: restrained, editorial, low-saturation; closer to a serious book cover than to a classroom poster. Eighth graders read decoration as condescension.

## The problem this pack has that no other pack has

**This is a pack about reading, and the text-free policy forbids drawing anything readable.** Every instinct — an open book with legible print, a highlighted passage, a margin note — is out of bounds. That constraint is sharper here than anywhere else in the catalog, and it cannot be solved by finding a clever way to sneak words in.

It is solved by drawing **the shape of an argument rather than its content**. Books appear closed, or open at an angle where the page reads as texture rather than as type. Annotation appears as a pencil mark, a dog-ear, a slip of paper between pages — the physical evidence that someone thought about something, without the thought being spelled out. Where a panel genuinely needs a passage, the page is rendered as soft grey lines at a size where no character resolves, which is what a page looks like from across a room anyway.

This is also the honest solution pedagogically. The unit is about accumulation and structure, not about any one text, and pictures of specific passages would tie an abstract skill to a book most students are not reading.

## The mistakes this topic invites

1. **No lightbulbs, no keys, no locks, no treasure chests.** Theme-as-hidden-treasure is precisely the misconception the reading opens by rejecting: a theme is not "hidden in a story like a key under a mat," it is built. An image of a key contradicts the first sentence of the lesson.
2. **No single glowing sentence on a page.** That is the "theme is stated somewhere" error, which the reading warns is often a trap set by the writer.
3. **No thinker at a desk with a hand on the chin.** It is inert, it is a stock pose, and it says nothing about how theme develops.
4. **No scales of justice for the two-readings idea.** Weighing readings against each other suggests one must fall, and the pack argues both can be strong.

## Glossary pictures (square, 480 px, one per term)

These are abstract terms and the pictures should stay near-diagrammatic. Muted palette, one accent colour per card, generous negative space.

| slot | term | generator prompt (editorial, abstract, no text) | must show / must avoid |
|---|---|---|---|
| th-term-theme | Theme | Many thin translucent sheets stacked at slight offsets, forming one solid darker shape where they overlap | the shape emerges only from accumulation |
| th-term-topic | Topic | One single flat sheet lying alone on a plain ground | one layer; deliberately thinner than the theme card |
| th-term-moral | Moral | A straight arrow running from left to right and terminating at a small square, no branches | one direction, one destination, no ambiguity |
| th-term-development | Development | Five vertical bars rising left to right, each one taller and darker than the last | steady accumulation, not a sudden jump |
| th-term-motif | Motif | The same small circular mark appearing four times across a field of soft grey lines | identical mark, varied placement, nothing else recurring |
| th-term-objective | Objective | A plain glass of water on a white surface, evenly lit, no reflection of a room | no viewpoint, no atmosphere, no styling |
| th-term-inference | Inference | Two solid dots joined by a dashed line that curves slightly | the join is inferred, hence dashed; both dots solid |
| th-term-evidence | Evidence | Three paper slips protruding from the closed edge of a book | slips only; no writing on them, book stays closed |
| th-term-turningpoint | Turning point | A single line travelling straight, then bending sharply once, then continuing | exactly one bend; both segments equally weighted |
| th-term-counterevidence | Counterevidence | A field of small marks all leaning one way, with one leaning against them | the outlier is clear but not highlighted in red |
| th-term-resolution | Resolution | A knot in a cord, partly loosened, with one end still tucked under | partly, not fully; the unresolved end is the point |
| th-term-summary | Summary | Six shapes of varied size reduced to six small uniform squares in a row | order preserved, detail removed, nothing added |

`th-term-theme` and `th-term-topic` must be recognisably the same material and the same drawing style, differing only in how many sheets there are. That pair is the single most important image in the pack, and its argument is carried entirely by the layering.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — Theme is built (after the reading)**

1. `th-img-theme-build` — *Accumulation.* The pack's anchor image. Roughly twenty translucent vellum sheets, each carrying a few soft grey line-marks that read as text at a distance but resolve into nothing, stacked with small rotational offsets so the pile fans slightly. Seen from above at a shallow angle, side-lit, so the stack reads as having real depth. Where the sheets happen to align, the marks darken into a shape that is clearly emerging but not yet a recognisable form. No single sheet is emphasised. This is the whole standard in one picture, and its correctness test is simple: **remove any one sheet and the shape should still be there.**

**Group B — Three things people call theme (beside the anchor chart)**

2. `th-img-three-kinds` — *Topic, advice, claim.* Three objects on one neutral ground, evenly spaced, same lighting. Left: a single flat sheet. Centre: a straight arrow ending in a square. Right: the layered translucent stack from panel 1, small. Consistent scale so the comparison is between structures and not between sizes. The native labels name the three; the artwork only distinguishes them.

**Group C — Where evidence gathers (beside the memory aid)**

3. `th-img-four-margins` — *The four margins.* One page seen straight on, its centre rendered as soft indistinct grey lines, with a generous blank margin on all four sides. In each margin sits one small pencil mark, each visually distinct: a short bracket at the left, a small circled dot at the right, a tally of three at the top, and — at the bottom — nothing at all, just clean paper with a faint pencil dash trailing off. The empty bottom margin is the panel's whole argument, since it stands for what the ending withholds, and a generator will want to fill it. It stays empty.
4. `th-img-motif` — *Repetition is a writer pointing.* A long horizontal strip, like a book's fore-edge, made of many thin page-lines. Four of those lines carry the same small circular mark, spaced unevenly along the strip. Every other line is plain. Nothing directs the eye to the marks except their sameness.

**Group D — Two readings (after the FAQ)**

5. `th-img-two-readings` — *Both can be strong.* The same layered translucent stack, drawn twice, lit from two different angles. Under each light, a different shape emerges from where the marks align — genuinely different shapes, both coherent. Identical stacks, identical marks, different light. Neither version is brighter, larger or centred, and no arrow connects them. This panel does the work the FAQ answer does, and it fails if a viewer can tell which one the artist preferred.

**Group E — The argument (after the challenge)**

6. `th-img-disputed` — *The evidence you both want.* Two hands, from opposite sides of the frame, reaching toward one book that lies closed on a table between them with three paper slips protruding from its edge. Neither hand has reached it. No faces, no bodies, no expressions. The tension is entirely in the symmetry, and the panel would be ruined by drawing one hand closer.

## Alt text rules for this pack

Alt text at this level describes structure, since structure is the content: "roughly twenty translucent sheets stacked at slight offsets, with a darker shape emerging where their marks align." It does not interpret the panel, because interpreting it is the student's task and an alt text that explains the metaphor hands the answer to exactly the students who most need to do the work. For `th-img-four-margins` the alt text must state that the bottom margin is empty — the absence is the evidence, and an alt text that lists only the three marks describes a panel that would have failed review.
