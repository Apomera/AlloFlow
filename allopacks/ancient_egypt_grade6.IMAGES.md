# Why Cities Grew on the Nile — image shot list (text-free policy)

Companion to `ancient_egypt_grade6.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/ancient_egypt_grade6/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, grounded, historically careful; muted earth palette; one idea per picture.

## What this pack must not illustrate

The reading argues that the pyramids are real and are not the point, and that the surviving record over-represents the powerful. Artwork can quietly undo both arguments, so three rules:

1. **Do not lead with monuments.** The image set is weighted toward silt, ditches, grain, workshops and tallies. Pyramids appear twice, once as a result at the end of the chain and once as a source to be questioned. A gallery of golden treasures would teach the opposite of the text.
2. **Do not romanticise the labour.** Farmers and builders are shown working, clothed for heat, in ordinary settlements — not as anonymous crowds hauling stone under a whip, which is the image the FAQ specifically corrects.
3. **Do not invent hieroglyphs.** Any sign shown must be drawn from a real attested glyph, or the surface must be shown at a distance or angle where individual signs are not legible. Invented glyphs are the historical equivalent of raster text: a made-up thing presented as a record. If a generator produces plausible-looking nonsense script, reject it.

Egyptians are depicted as North African people with a range of skin tones, which is what the evidence supports and what the tomb art itself shows. No pharaoh should look like a European actor.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, historically careful, no text, no invented glyphs) | must show / must avoid |
|---|---|---|---|
| eg-term-nile | Nile | A wide calm river seen from a low bank, green reeds on both sides, pale desert beyond | the abrupt green-to-sand edge is the subject |
| eg-term-silt | Silt | A close view of dark wet mud over pale dry sand, a hand pressing into it | the colour difference must be obvious |
| eg-term-surplus | Surplus | A mud-brick granary with sacks stacked well above one household's needs | abundance without treasure; no gold |
| eg-term-specialist | Specialist | A potter at a wheel, absorbed, with finished pots in rows behind | one person, one craft, clearly practised |
| eg-term-hieroglyph | Hieroglyph | A weathered stone surface at a shallow angle, carved signs catching light but not readable | attested forms only, or deliberately not legible |
| eg-term-bureaucracy | Bureaucracy | Three seated scribes with tablets and a queue of people waiting | the queue is the point |
| eg-term-pharaoh | Pharaoh | A seated ruler figure in formal pose on a carved throne, viewed from a respectful distance | grand but not glittering; North African features |
| eg-term-irrigation | Irrigation | A shallow ditch carrying water from a river into a field of young green shoots | the water is clearly being led somewhere |
| eg-term-archaeologist | Archaeologist | A modern researcher kneeling in a shallow excavation square, brushing a plain pottery shard | ordinary object, not treasure |
| eg-term-evidence | Evidence | A plain broken pot, a grain husk and a bone laid on a cloth beside a measuring stick | mundane on purpose |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The land (after the reading)**

1. `eg-img-green-strip` — *A country a few miles wide.* An aerial view along the Nile: a narrow band of dark green fields hugging the river, sharp edges, desert filling the rest of the frame in every direction. Labels: The Nile, Farmland, Desert. Caption: Egypt is mostly desert. Nearly everyone lived in the green strip.
2. `eg-img-flood-silt` — *What the flood left.* Two panels of the same field. Left: water spread across low ground, the river swollen. Right: the water gone, a dark layer of silt over the soil, green shoots pushing through. Labels: Flood, Silt left behind, New crop. Caption: the flood came at about the same time each year, which is what made it useful.

**Group B — The chain (after the anchor chart)**

3. `eg-img-chain` — *Four links.* A single horizontal strip in four equal panels: a flooded field; a granary with stacked sacks; a potter and a weaver at work; a scribe marking a tally beside those same sacks. A plain arrow joins each panel to the next. Labels: Predictable flood, Surplus, Specialists, Records. Caption: each link is only possible because of the one before it.
4. `eg-img-irrigation` — *Past where the flood reached.* A field with ditches cut in a grid, workers opening a channel with hoes, water moving along it toward dry ground. Labels: River, Ditch, Ground the flood never covered. Caption: the flood was the gift; the ditches were the work.
5. `eg-img-receipt` — *Writing begins with counting.* A scribe seated with a tablet, tallying sacks being carried past him into a granary. The tablet is angled so marks are visible but individual signs are not legible. Labels: Grain in, Tally kept. Caption: much of the earliest writing anywhere is receipts, not poetry.

**Group C — The record and its gaps (after the FAQ)**

6. `eg-img-two-graves` — *What survived, and what did not.* Two halves. Left: a carved, painted tomb wall, elaborate and intact. Right: a plain patch of settlement ground with post holes, a bread oven and pottery fragments. Labels: Made for the powerful, Where most people lived. Caption: both are evidence. Only one was built to last.
7. `eg-img-workers-village` — *The builders had bread ovens.* A workers' settlement near a pyramid: mud-brick rows, large bread ovens, people eating and resting, the monument visible in the background but small in frame. Labels: Workers' village, Bread ovens, The pyramid, in the distance. Caption: the evidence points to paid labourers who were fed and cared for, not to the enslaved crowds of the old story.
8. `eg-img-source-table` — *One source, three questions.* A flat top-down view of a table with four objects laid out: a tomb-painting fragment, a grain tally tablet, a bread oven brick, and a temple relief fragment. Labels: one per object, plus Who made it, Who paid, Who is missing arranged along the edge. Caption: the three questions the investigation asks of every source.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture. For the paired and multi-panel images, state the panels in order, because the sequence is the argument.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- If a rendered image contains legible invented script, it fails review, the same as raster text would.
