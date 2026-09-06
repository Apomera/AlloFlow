# Says Who? — image shot list (text-free policy)

Companion to `argument_evidence_grade6.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/argument_evidence_grade6/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: clean, diagrammatic, restrained colour; no clip-art debate podiums.

## Two traps specific to this topic

**First, the text trap.** This is a pack about sentences and proposals, so the obvious illustration is a page of writing with parts highlighted — which is raster text. Same resolution as the Context Clues and Map Skills packs, and it should be stated the same way: the artwork carries the *structure*, native labels carry the words. A proposal is drawn as a block of even grey text-bars with sections tinted; the actual claim and evidence are anchored labels.

**Second, and more important, the sides trap.** Almost every stock image for "argument" shows two people facing off, or a courtroom, or a tug of war. Every one of those teaches that an argument is a fight between people. This pack teaches that an argument is a *structure* that can be taken apart, and that you should run the test on things you already agree with. So:

- **No two people arguing.** No pointing fingers, no raised voices, no red-versus-blue.
- **No winners.** No trophies, gavels, scoreboards or crossed-out speech bubbles.
- The recurring visual is **construction**: rocks, planks, bridges, foundations. An argument holds or it does not, the way a bridge holds or does not, and the question is never who shouted.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (diagrammatic, no legible words) | must show / must avoid |
|---|---|---|---|
| ag-term-argument | Argument | A small stone bridge spanning a gap, seen from the side, complete and standing | structure, not people |
| ag-term-claim | Claim | A single flag planted on top of a rock | one flag, unsupported so far |
| ag-term-evidence | Evidence | Three flat stones stacked into a firm base, no flag yet | support without a claim on it |
| ag-term-reasoning | Reasoning | A single plank laid across a gap between two rocks | the plank is the whole subject |
| ag-term-counterclaim | Counterclaim | A second flag planted on the far side of the same gap, facing back | opposing position, no conflict imagery |
| ag-term-fact | Fact | A stone with a ruler laid along it, being measured | checkable, settled |
| ag-term-opinion | Opinion | Three identically shaped stones painted different colours, one being picked up | preference with nothing to measure |
| ag-term-relevant | Relevant | A plank that exactly reaches both rocks, beside a shorter one that falls short | the near-miss is the teaching |
| ag-term-source | Source | A spring emerging from rock with a channel running away from it | where something came from |
| ag-term-rebuttal | Rebuttal | A second plank laid to meet the far flag's side of the gap | answering, not removing |

Claim, Evidence and Reasoning are one deliberate set: same rocks, same angle, one element added each time.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The structure (after the reading)**

1. `ag-img-three-parts` — *Two rocks and a plank.* Three frames of the same gap. First: a rock with a flag, nothing else. Second: a stack of stones on the other side, still no connection. Third: a plank laid across, the whole thing a bridge. Labels: Claim, Evidence, Reasoning, and beneath the third frame An argument. Caption: two solid rocks and no plank is not a bridge, however good the rocks are.
2. `ag-img-the-gap` — *The most common weakness.* One wide frame: a flag on one rock, a firm stack of stones on the other, and an obvious empty gap between them with nothing spanning it. A small figure stands at the edge looking across. Labels: The claim, The evidence, No reasoning here. Caption: most weak arguments are not lies. They are true facts beside a claim they do not reach.
3. `ag-img-same-evidence` — *One stack, two flags.* One stack of stones in the centre with a plank running to a flag on the left and a second plank running to a different flag on the right, both reaching. Labels: Tired from biology, Tired from late screens, The same evidence. Caption: if the evidence would support a different conclusion just as well, it has not settled yours.

**Group B — The other side (after the anchor chart)**

4. `ag-img-counterclaim` — *Naming the objection.* The bridge from panel one, with a second flag planted on the far bank facing back toward it, and a short second plank reaching out to meet it. Labels: Your claim, The strongest objection, Your rebuttal. Caption: stating the other side and answering it makes the span harder to knock down.
5. `ag-img-proposal-anatomy` — *A real proposal, taken apart.* A single page rendered as even grey text-bars with three sections tinted different colours and a margin bracket beside each. No legible words anywhere. Labels: Claim, Evidence, Reasoning, plus one anchored quotation per section. Caption: take any argument apart before you decide whether you agree with it.

**Group C — The hard part (after the FAQ)**

6. `ag-img-your-own-side` — *Test the one you like.* Two identical bridges side by side. One is tinted in a warm, appealing colour and has a visible gap under its plank; the other is plain grey and complete. A figure stands examining the warm one closely. Labels: The one you agree with, The one that holds. Caption: a conclusion you like can still be badly argued. Checking that is the whole skill.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and **stating whether the gap is spanned**, because the presence or absence of the plank is the content in almost every panel.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word. Reasoning and Rebuttal both need care, since "a plank across a gap" is close to the definition.
- If a rendered image contains people in conflict, a trophy, a gavel or any legible word, it fails review.
