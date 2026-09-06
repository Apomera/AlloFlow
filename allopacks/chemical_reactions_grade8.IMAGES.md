# Did Anything New Actually Form? — image shot list (text-free policy)

Companion to `chemical_reactions_grade8.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/chemical_reactions_grade8/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: clean laboratory realism, neutral background, consistent glassware; no cartoon explosions.

## The rule this pack lives or dies on

The reading's argument is that **every indicator has a physical impostor**, and that appearance alone settles nothing. Artwork can wreck that in one image. A dramatic picture of a fizzing beaker captioned "chemical reaction" teaches exactly the reflex the lesson exists to break.

So the image set is built in **pairs that look the same and are not the same**. Bubbles from a reaction beside bubbles from boiling, shot at the same angle, in the same glassware, under the same light. If the two halves of a pair are visually distinguishable by anything except their native labels, the pair has failed and must be regenerated. The viewer is supposed to be unable to tell.

Two further rules:

1. **No flames, no smoke, no glowing green liquid.** This is not that kind of chemistry set. The one combustion panel shows a log and ash on a balance, not a fireball.
2. **Molecular diagrams use consistent atom colours across the whole set** — one colour per element, the same size, the same style — because the conservation panels only work if a reader can count atoms across two frames.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (lab realism, no text, no numerals) | must show / must avoid |
|---|---|---|---|
| cr-term-reaction | Reaction | Two grouped atom clusters on the left, a plain arrow, two differently grouped clusters on the right, same atoms throughout | atom count identical both sides; countable |
| cr-term-reactant | Reactant | Two labelled-free beakers of different coloured liquid standing apart, untouched | before-state; nothing mixed yet |
| cr-term-product | Product | One beaker holding a liquid of a third colour, the two original beakers empty beside it | the originals are visibly used up |
| cr-term-substance | Substance | A single pure white crystalline solid on a watch glass, evenly formed | uniform; no mixture, no debris |
| cr-term-property | Property | A thermometer, a density hydrometer and a balance arranged around one sample | measuring instruments, not adjectives |
| cr-term-physical | Physical | An ice cube half melted in a dish with the meltwater pooled around it | same substance, two states, nothing new |
| cr-term-precipitate | Precipitate | Two clear liquids meeting in a beaker with a pale cloudy solid forming at the boundary | the solid forms where they meet |
| cr-term-indicator | Indicator | A magnifying glass held over a bubbling beaker, the bubbles slightly out of focus behind it | investigative mood, deliberately inconclusive |
| cr-term-atom | Atom | One single sphere on white with a soft highlight | the reference object; one colour from the set |
| cr-term-conserved | Conserved | A sealed flask on a balance pan, the pointer dead centre | the seal must be visible |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The impostors (after the reading)**

1. `cr-img-impostors` — *Four pairs that look identical.* A four-by-two grid. Each row is one indicator, shot twice in matched glassware: bubbling from a reaction and bubbling from boiling; a colour change from a product and a colour change from dilution; a warming from a reaction and a warming from dissolving; a settling solid that is a precipitate and one that was only suspended. Labels: Reaction / Physical on each cell, plus the four indicator names down the side. Caption: the camera cannot tell these apart, and neither can you. Every pair must be genuinely indistinguishable.
2. `cr-img-properties-test` — *The test that actually works.* A bench with two samples side by side and three instruments in use on each: a melting-point apparatus, a balance for density, and a beaker testing solubility. Labels: Before, After, Melting point, Density, Solubility. Caption: compare the properties. Different properties mean different substances.

**Group B — Conservation (after the anchor chart)**

3. `cr-img-log-and-ash` — *Where the mass went.* Three panels: a log on a balance pan; the same log burning in a hearth with visible heat shimmer rising; a small heap of ash on the same balance, the pointer clearly lower. Labels: Wood, Gases leaving, unweighed, Ash. Caption: mass looks lost because the gases were never on the balance.
4. `cr-img-sealed-vs-open` — *Same reaction, two verdicts.* Two balances side by side. Left: an open beaker mid-reaction with bubbles escaping, pointer falling. Right: a sealed bag holding the same reaction, visibly inflated, pointer dead centre. Labels: Open, gas escapes, Sealed, gas stays, Mass unchanged. Caption: seal the system and conservation is not a claim, it is a reading.
5. `cr-img-atom-count` — *Nothing created, nothing destroyed.* A before-and-after molecular diagram across one frame: the same atoms, same colours, regrouped into different molecules, arranged so a reader can count each element on both sides. Labels: Before, After, Same atoms, new groupings. Caption: the atoms are rearranged, which is why the mass has nowhere to go.

**Group C — The investigation (after the FAQ)**

6. `cr-img-uncertainty` — *Is that difference real?* A close view of a balance display area shown twice with a very slightly different needle position, beside a sheet where three repeated readings have been tallied. Labels: Reading one, Reading two, Repeat before you conclude. Caption: compare the size of a difference to what your instrument can actually resolve.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture. For the impostor pairs the alt must state that the two cells look alike, since that is the entire point and a listener would otherwise assume a visible difference.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- For the molecular panels, the alt must give the atom counts on both sides, because the count is the argument.
