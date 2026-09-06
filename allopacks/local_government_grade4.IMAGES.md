# Who Decided That? — image shot list (text-free policy)

Companion to `local_government_grade4.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/local_government_grade4/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, ordinary, recognisably everyday; no marble columns unless the building really is one.

## What civics artwork usually gets wrong

Search for images of "government" and you get domes, flags, gavels and men in suits at podiums. Every one of those pushes the same message: this is remote, formal, and not for you. The reading argues the opposite — that the level closest to your street is the one you can walk into, and that a room with twenty people in it can change a town.

So the image set is deliberately **unimpressive**. A town hall with a noticeboard and a bike rack. Folding chairs in a room with a low ceiling. A microphone on a stand that anyone can step up to. The one grand building in the set appears in the distance, on purpose, to show how far away the national level is.

Three rules:

1. **No national symbols standing in for government.** No flags draped behind speakers, no eagles, no domes except in the deliberately-distant panel.
2. **The people in the room are ordinary and varied** — different ages, a parent with a pushchair, someone in work clothes, a teenager. If the room looks like a boardroom, the panel has failed.
3. **Nothing in the artwork is country-specific in a way the text is not.** The reading says "many places" about turnout, so the artwork should not carry one nation's flag, seal or ballot design.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (warm, everyday, no text) | must show / must avoid |
|---|---|---|---|
| lg-term-government | Government | A modest civic building with steps, a noticeboard and open doors | approachable; no columns, no flag |
| lg-term-local | Local | An aerial view of a few streets, a park and a small high street | small enough to walk across |
| lg-term-council | Council | Seven people seated along one long table, facing a room of chairs | varied ages and clothing; no suits-only |
| lg-term-mayor | Mayor | One person standing at the centre of that same table, mid-sentence | leading, not commanding |
| lg-term-citizen | Citizen | A person standing at a microphone in a room of folding chairs | ordinary clothes, holding a note |
| lg-term-vote | Vote | A hand posting a folded blank paper into a plain box | blank paper; no ballot design, no seal |
| lg-term-budget | Budget | A pie chart divided into uneven slices, one slice lifted out | shapes only, no numbers or labels |
| lg-term-ordinance | Ordinance | A noticeboard outside a building with a single blank sheet pinned to it | the sheet is blank; the label goes on it |
| lg-term-petition | Petition | A clipboard with a sheet of blank ruled lines and several pens beside it | many lines, implying many names |
| lg-term-service | Service | A row of three: a library door, a bin lorry, a park bench | the ordinary things a town provides |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The three levels (after the reading)**

1. `lg-img-three-levels` — *Near, middle, far.* One deep landscape in a single frame: in the foreground a crosswalk, a park bench and a small town hall; at middle distance a larger state building; on the far horizon a large domed national building, hazy with distance. Labels: Local, State, National, and one example on each. Caption: the level closest to your street is the one you can walk into.
2. `lg-img-what-local-does` — *What your town actually decides.* Six small vignettes in a grid: a crosswalk being painted, library doors opening, a bin lorry, a fire station, a park slide, a street light. Labels: one per vignette. Caption: local government is most of what you touch on an ordinary day.

**Group B — How change happens (after the anchor chart)**

3. `lg-img-open-meeting` — *The room is open.* A plain meeting room: council members along a table, thirty folding chairs facing them, about half of them filled with a mix of ages including a teenager and a parent with a pushchair. A microphone stands in the aisle. Labels: The council, Anyone may sit here, Public comment. Caption: these meetings are open, and most set aside time for anyone to speak.
4. `lg-img-three-tools` — *Three ways in.* Three panels: a person speaking at the aisle microphone; a clipboard of signatures being handed over; a hand posting a folded paper into a box. Labels: Speak, Petition, Vote, plus Slowest and strongest on the third. Caption: the third one takes longest and carries the most weight.
5. `lg-img-who-showed-up` — *The room that decides.* The same meeting room shown twice: on the left, nearly every chair empty with four people scattered; on the right, the same room with twenty people in it. Labels: A quiet night, A full night, Same power either way. Caption: local turnout is often low, which means a small number of people decide.

**Group C — The budget (after the FAQ)**

6. `lg-img-budget-slices` — *One pie, four hands.* A pie chart from above with four hands reaching for slices from different directions, one slice already lifted away and a visible empty wedge left behind. Labels: Roads, Library, Parks, Fire service, The gap left behind. Caption: funding one thing means a gap somewhere else. Ask what got left out.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture. For the near-middle-far panel, the alt must state the distances, because distance carries the whole idea.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- If a rendered image contains a national flag, seal, or a room that reads as a boardroom rather than a public meeting, it fails review.
