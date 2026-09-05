# Forces and Motion — image shot list (text-free policy)

Companion to `forces_motion_grade3.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/forces_motion_grade3/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Arrows are allowed and are the main teaching device here, but they must be plain arrows with no letters on them. Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, simple, flat, friendly for eight-year-olds; white or very light backgrounds; one idea per picture.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| fm-term-force | Force | A child's hands, one pushing a box and one pulling a wagon handle, each with a short arrow | two arrows in opposite senses; no faces needed |
| fm-term-push | Push | A child pushing a large box across a floor, arrow pointing away from the child | arrow starts at the hands |
| fm-term-pull | Pull | A child pulling a wagon toward themselves with a rope, arrow toward the child | rope taut |
| fm-term-friction | Friction | A ball on thick carpet with small motion lines fading out behind it | carpet texture obvious; no smoke or sparks |
| fm-term-gravity | Gravity | A pencil in mid-fall above a desk with a downward arrow | arrow straight down, pencil clearly not yet landed |
| fm-term-motion | Motion | A rolling ball with three faint earlier positions behind it | earlier positions lighter than the current ball |
| fm-term-balanced | Balanced | Two equal-sized kids pulling a rope with a ribbon tied at the exact middle, rope straight | ribbon centered; equal effort |
| fm-term-unbalanced | Unbalanced | The same rope with the ribbon pulled toward one side, that side's team leaning back | ribbon clearly off center |
| fm-term-pattern | Pattern | Three identical balls at the bottom of a ramp resting at nearly the same spot, a measuring tape along the floor | tape has no readable numbers (marks only) |
| fm-term-predict | Predict | A child pointing at an empty spot on the floor ahead of a ball still on the ramp | the ball has not arrived yet |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — Pushes and pulls (after the reading)**

1. `fm-img-push-pull` — *Two ways to make it move.* Split scene: left, a kid pushing a box away; right, a kid pulling a wagon closer; plain arrows on each. Labels: Push (anchor on the left arrow), Pull (anchor on the right arrow). Caption: both are forces; the arrow shows the direction of the push or pull.
2. `fm-img-friction-floors` — *Same ball, three floors.* Three lanes side by side: smooth tile, thick carpet, rubber mat, each with a ball that rolled from the same ramp and stopped at a different distance, farthest on tile. Labels: Least friction (tile ball), Most friction (carpet ball). Caption: more friction stops the ball sooner.
3. `fm-img-gravity-chair` — *Two forces, no motion.* A child sitting in a chair with a downward arrow from their middle and an equal upward arrow from the seat. Labels: Gravity pulls down, Chair pushes up. Caption: the arrows are the same size, so the forces are balanced and the child stays still.

**Group B — Balanced and unbalanced (after the anchor chart)**

4. `fm-img-tug-balanced` — *Balanced.* Two teams of three kids pulling a rope, ribbon exactly in the middle, both teams leaning equally. Labels: Same pull (anchor on the ribbon). Caption: equal forces in opposite directions; nothing moves.
5. `fm-img-tug-unbalanced` — *Unbalanced.* The same teams, but the ribbon has slid toward the right team, which leans back harder; a plain arrow along the rope points right. Labels: Bigger pull (right team), Rope moves this way (arrow). Caption: one force is bigger, so the motion changes.
6. `fm-img-bike` — *Your push versus friction.* A child pedaling a bike, a large forward arrow from the pedals and a small backward arrow at the wheels. Labels: Your push (big arrow), Friction (small arrow). Caption: the push is bigger than friction, so the bike speeds up; stop pedaling and friction wins.

**Group C — Patterns predict (after the FAQ)**

7. `fm-img-ramp-heights` — *Higher ramp, farther roll.* Two ramps side by side, one propped on one book and one on three, each with a ball resting where it stopped, the taller ramp's ball farther along a measuring tape (marks only, no numbers). Labels: One book, Three books, Farther. Caption: the pattern lets you predict the next roll.
8. `fm-img-three-rolls` — *Three rolls, one pattern.* One ramp with three faint ball trails ending at nearly the same spot and a child marking that spot with a sticky note. Labels: About the same every time (anchor on the cluster). Caption: repeat the test; a pattern is only real if it keeps happening.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing what is in the picture, including arrow directions and relative sizes, because those carry the science.
- Do not describe the prompt; describe the rendered image, then review it against the picture and store the hash, as in the Water Cycle pilot.
- Where a picture shows a comparison, the alt must state which side is which (for example, which ball rolled farthest).
