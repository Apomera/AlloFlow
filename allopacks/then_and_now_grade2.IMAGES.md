# Then and Now — image shot list (text-free policy)

Companion to `then_and_now_grade2.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/then_and_now_grade2/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, simple, flat, friendly for seven-year-olds; large shapes, few details, one idea per picture.

## The mistakes this topic invites

"Then and now" art has a strong pull toward two errors, and both teach something the pack explicitly denies.

1. **The past must not be drawn in sepia or grey while the present is in colour.** Every generator does this by default, and it quietly tells a seven-year-old that the past was a duller world rather than a different one. Both halves of every comparison use the same bright palette. The difference between then and now is what is *in* the picture, never how the picture is coloured.
2. **The past must not be drawn as hardship.** No exhausted faces, no bleak rooms. The reading's argument is that kids still played and families still ate together — a picture that makes the past look miserable contradicts the whole "stayed the same" half of the unit.

A third, more specific one: the timeline panels illustrate dated inventions, and **the objects must be right for their dates**. A 1876 telephone is not a 1930s candlestick phone. A 1886 Benz is three-wheeled. A 1927 television image is a single bright line, not a picture of a family watching a cabinet. Where an accurate object cannot be drawn confidently, draw the person or the moment instead and let the native caption carry the date.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| tw-term-past | Past | A closed wooden box with a worn brass clasp, sitting on a floor | closed, intact, inviting; not broken or cobwebbed |
| tw-term-present | Present | The same box open, with a child's hands resting on its edge | same box, unmistakably; hands are the only new thing |
| tw-term-change | Change | One kitchen drawn twice side by side, same room, different appliances | identical walls and window, so only the objects differ |
| tw-term-same | Same | Two children playing catch, drawn twice side by side in different clothes | same pose, same ball, same joy; only clothing differs |
| tw-term-history | History | An open picture album with three photo-shaped rectangles, each holding a simple scene | the rectangles hold pictures, never writing |
| tw-term-timeline | Timeline | A plain horizontal line with five evenly spaced dots on it, small simple objects above each | no numbers, no ticks, no arrowheads with labels |
| tw-term-order | Order | Three stacked blocks being placed, lowest first, a hand adding the top one | the order of placement is readable from the hand |
| tw-term-memory | Memory | An older person and a child sitting together, the older one gesturing while talking | both are engaged; the child is listening, not bored |
| tw-term-clue | Clue | A magnifying glass held over an old shoe on floorboards | ordinary object, examined closely; no mystery tropes |
| tw-term-invent | Invent | A workbench with a half-built wooden and brass contraption, tools laid beside it | unfinished on purpose; no lightbulb over a head |

The `tw-term-past` and `tw-term-present` pair only works if the box is visibly the *same box*. Same grain, same clasp, same dent. If a generator produces two different boxes the pair means nothing.

## Timeline panels (600 px wide, one per event; native caption carries the date)

These are the only panels where historical accuracy is load-bearing. Each shows the thing, not a scene around it.

7. `tw-tl-telephone` — A hand-cranked wooden wall telephone with a separate earpiece on a cord, drawn plainly against a light ground.
8. `tw-tl-car` — A three-wheeled open motor carriage: one wheel at the front, two at the back, a bench seat, a tiller rather than a steering wheel.
9. `tw-tl-flight` — A biplane with a forward elevator, low over flat sand, one figure lying prone at the controls and another running alongside a wingtip.
10. `tw-tl-television` — A dark screen showing one bright horizontal line, viewed straight on, with a plain cabinet edge visible at the frame's border.
11. `tw-tl-moon` — A figure in a white suit on grey ground, boot prints behind, black sky above, a blue-and-white crescent Earth small and high.
12. `tw-tl-web` — A boxy beige computer with a small screen showing simple coloured shapes, a cable running off the desk edge.
13. `tw-tl-phone` — A flat rectangular phone held in one hand, its screen showing a small grid of coloured squares.

For `tw-tl-web` and `tw-tl-phone` the screens show shapes, never a rendered interface, both because interfaces contain text and because a specific product's screen would date the artwork immediately.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The two halves of the argument (after the reading)**

1. `tw-img-then-now` — *One street, two times.* A single frame divided by a soft vertical seam. Left: a street with a horse-drawn cart, a shopfront with a striped awning, two children rolling a hoop. Right: the same street, recognisably — same building outlines, same corner, same tree grown taller — with a car, the same shopfront modernised, two children on scooters. Both sides in full colour and equal brightness. The children on both sides are doing the same kind of thing, which is the "stayed the same" half made visible without a caption.

**Group B — Change builds in steps (beside the memory aid)**

2. `tw-img-stairs` — *You cannot skip a step.* A simple flight of five stairs seen from the side, plain background. On each tread sits one small object from the timeline in order: wall telephone, motor carriage, biplane, television, flat phone. No figures, no arrows, no numbers. The rising line does all the work.

**Group C — How we know (after the FAQ)**

3. `tw-img-clue-box` — *Three kinds of clue.* A shoebox seen from above with its lid off. Inside: a photograph face-up showing a simple scene, an old hand tool, and a folded cloth. Beside the box, an empty chair drawn small. The chair is the point — it stands for the person who remembers — and the native caption is what explains it, so it must be drawn plainly and not decorated.
4. `tw-img-interview` — *Ask them.* A child sitting on a step beside an older adult, both leaning slightly toward each other, the adult's hands mid-gesture. A notebook rests closed on the child's knee, closed so no writing is visible. Warm afternoon light. Nobody is posed for a camera.

## Alt text rules for this pack

Alt text uses the pack's own words — *past, present, change, same, timeline, clue, memory*. For `tw-img-then-now` it must say explicitly that both halves show the same street, because a description that reads as two unrelated streets describes a picture that would fail this shot list. Timeline panel alt text names the object and what is distinctive about it (three wheels, a single bright line) rather than naming the invention, so that a student meets the evidence before the label.
