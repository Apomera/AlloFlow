# Why Windows Are Not Wool — image shot list (text-free policy)

Companion to `materials_grade2.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/materials_grade2/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, flat, friendly for seven-year-olds; white or very light backgrounds; large simple shapes.

## The one thing these pictures must do

This pack is about **properties you can observe**, so the artwork has to make a property visible rather than merely name an object. A picture of a sweater teaches nothing on its own; a picture of a finger pressing into a sweater and leaving a dent teaches *soft*. Every glossary image below shows a property being demonstrated, usually by a hand doing something to the material.

That rules out the obvious catalogue-of-objects approach, and it is deliberate. A second grader who sees the drop rolling off the raincoat has seen the evidence. One who sees a raincoat has seen a raincoat.

Two supporting rules:

1. **Pair the opposites at the same angle.** Waterproof and Absorb are the same cloth square, the same drop, the same camera — only the outcome differs. Rough and Smooth likewise. The pair only teaches if nothing else changes.
2. **Show the property mid-action.** A finger pressing, a drop landing, a band stretching. Frozen action beats a still object.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| mt-term-material | Material | Four squares of different stuff laid in a row: wood grain, woven wool, clear glass, grey metal | four textures, no objects made from them |
| mt-term-property | Property | One hand pressing a finger into a soft cushion beside the same hand tapping a hard block | the difference in the surface is the subject |
| mt-term-hard | Hard | A fingertip pressing on a brick, the brick completely unchanged, the fingertip slightly flattened | the finger gives, not the brick |
| mt-term-soft | Soft | A fingertip pressing into a cushion leaving a clear dent | the dent must be obvious |
| mt-term-bendy | Bendy | Two hands stretching a rubber band into a wide curve | mid-stretch, tension visible |
| mt-term-rough | Rough | A close view of coarse woven wool, fibres standing up, raking light across it | texture exaggerated by the lighting |
| mt-term-smooth | Smooth | The same close view distance, but clear glass with a clean highlight sliding across it | identical framing to the rough card |
| mt-term-waterproof | Waterproof | A single water drop beading on a red raincoat fabric, sitting up on the surface | the drop keeps its round shape |
| mt-term-absorb | Absorb | The same drop on a cotton cloth, spreading into a dark wet patch | same drop, same angle; only the outcome changed |
| mt-term-test | Test | Three identical cloth squares in a row on a tray, one drop landing on each | fairness is visible: same drop, same squares |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The rule (after the reading)**

1. `mt-img-window-sweater` — *Nobody mixes these up.* Two halves. Left: a window pane with daylight coming through, a hand resting flat against the hard smooth surface. Right: a knitted sweater with a hand pressing in, leaving a dent. Labels: Hard, Smooth, See-through (left), Soft, Warm, Bendy (right). Caption: each material was picked to fit its job.
2. `mt-img-two-water-jobs` — *Same water, opposite jobs.* One drop shown twice at the same angle and size. Left: beading on a raincoat, running off down the slope. Right: sinking into a towel, spreading dark. Labels: Water runs off, Water soaks in. Caption: a raincoat keeps water out; a towel takes it in. Both are right for their own job.
3. `mt-img-wrong-material` — *The wrong stuff for the job.* A paper umbrella in the rain, sagging and torn, water coming through, a child underneath looking unimpressed. Labels: Paper soaks up water, So it fails as an umbrella. Caption: paper is great for drawing. It is terrible for a raincoat.

**Group B — Testing (after the anchor chart)**

4. `mt-img-fair-test` — *What makes it fair.* A tray with three cloth squares in a row — paper towel, cotton rag, plastic sheet — each with one identical spoonful of water just landing. A measuring spoon sits beside the tray. Labels: Same spoonful each time, Paper towel, Cotton rag, Plastic. Caption: change one thing only, and the difference has to be the cloth.
5. `mt-img-spill-results` — *What happened.* The same three squares a minute later: the paper towel with a large dark patch, the rag with a smaller one, the plastic with the water still sitting on top in a puddle. Labels: Soaked up most, Soaked up some, Soaked up none. Caption: the plastic is waterproof, so the water had nowhere to go.

**Group C — Look around (after the FAQ)**

6. `mt-img-look-around` — *Why is it made of that?* One ordinary kitchen scene from a child's eye height: a glass window, a wooden chair, a metal pan, a cotton towel on a rail, a plastic bowl. Labels: one per object, naming the material. Caption: pick one thing and ask what job it has to do.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and **naming the observable outcome** — "the drop sits up in a bead" or "the drop has spread into a dark patch" — because the outcome is the evidence.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word. The Absorb and Waterproof cards need care here.
- For the paired images, the alt must make clear which side is which, since the pair teaches entirely by difference.
