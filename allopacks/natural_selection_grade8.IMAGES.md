# Nothing Is Trying — image shot list (text-free policy)

Companion to `natural_selection_grade8.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/natural_selection_grade8/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: clean scientific illustration, muted palette, closer to a field guide than a poster.

## The problem this pack has: the standard illustration of this topic is wrong

Search for a picture of natural selection and most of what comes back **teaches the misconception the pack exists to correct.** The single most common image is a row of giraffes with progressively longer necks, or an ape straightening into a person. Both show *one lineage transforming*, which is the wrong version, drawn.

The correct image is dull-looking by comparison and much better: **a population whose composition changes while none of its members do.** Rows of individuals where the proportion of one variant grows. Nothing morphs. Nothing marches. Nothing improves.

Every panel below is built on one rule, and it is the acceptance test for the whole set: **no individual may differ between one frame and the next.** If a viewer can point at one organism and say "that one changed", the panel has failed, however attractive it is.

## The mistakes this topic invites

1. **No transformation sequences.** No progressively longer necks, no straightening ape, no fish walking onto land in five steps. These are the canonical wrong images and they are what students already have in their heads.
2. **No upward arrows, no ladders, no staircases.** Selection has no direction and no destination, so any composition implying progress contradicts the reading directly.
3. **No individual organism drawn mid-change.** Nothing stretching, straining, reaching or effortfully becoming.
4. **No struggle imagery.** No fighting, no baring of teeth, no dramatic predation. Fitness is not strength, and combat pictures reinforce exactly the "strongest survives" misconception the sort activity marks as wrong.
5. **No goal-directed body language.** An organism eyeing a high branch with visible determination smuggles intention back in.

## Glossary pictures (square, 480 px, one per term)

Abstract shapes throughout. Individuals are drawn as simple beetle-like ovals in two colours — one dark, one pale — so that composition is readable instantly and no real species implies a real claim.

| slot | term | generator prompt (flat, scientific, no text) | must show / must avoid |
|---|---|---|---|
| ns-term-population | Population | Twenty small ovals of mixed dark and pale, evenly scattered in one field | one group, clearly bounded, mixed |
| ns-term-variation | Variation | Eight ovals in a row, each slightly different in shade and size | differences are small and continuous, not two types |
| ns-term-heritable | Heritable | One dark oval above, with three dark ovals below joined by fine lines | offspring match the parent |
| ns-term-mutation | Mutation | Three identical pale ovals and one with a small notch in its outline | the notch is neutral-looking; nothing glows or sparks |
| ns-term-frequency | Frequency | Three stacked rows of ten ovals, dark ones making up more of each row down | same count per row; only the mix changes |
| ns-term-fitness | Fitness | One oval above with five below it, beside another oval above with one below | measured in offspring, not in size or strength |
| ns-term-selection | Selection | A field of mixed ovals with several pale ones drawn faint and outlined only | removal, not transformation |
| ns-term-acquired | Acquired | An oval with a chipped edge above, and three unchipped offspring below | the chip does not pass down |
| ns-term-generation | Generation | Two rows of ovals joined by fine vertical lines between them | one round, parents to offspring |
| ns-term-resistance | Resistance | A field of ovals with a pale wash over it, three ovals unaffected | the survivors were already drawn identically before |
| ns-term-environment | Environment | The same beetle ovals shown on a dark ground and on a pale ground | identical beetles, different background |
| ns-term-adaptation | Adaptation | A field where dark ovals dominate, on a dark ground | the match to the background is the whole card |

`ns-term-acquired` carries more weight than its size suggests: the chipped parent and the three unchipped offspring is the entire refutation of inherited acquired traits, in one image, with no words.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — What actually changes (after the reading)**

1. `ns-img-frequency-shift` — *The population changes; its members do not.* The pack's anchor image and the one that must be right. Four horizontal rows, each holding exactly twelve beetle ovals on a mid-grey ground. Row one: three dark, nine pale. Row two: five dark, seven pale. Row three: eight dark, four pale. Row four: eleven dark, one pale. **Every dark beetle is drawn identically to every other dark beetle, in every row, and the same for the pale ones.** No beetle darkens gradually. No beetle is larger later. Counts must be exact and checkable. The native caption carries the generations; the picture carries the argument. Acceptance test: cut any single beetle out of any row and it must be impossible to say which row it came from.
2. `ns-img-already-there` — *It was there before.* One frame, two halves with a soft seam. Left: a mixed field of ovals on a pale ground, dark ones scarce but plainly present. Right: the identical field on a dark ground, the same ovals in the same positions, with several pale ones now drawn faint and outlined. Nothing has moved and nothing has changed colour. Only the ground changed and only some individuals are gone. This panel does what the antibiotic paragraph does: shows that the variant pre-existed and the environment did the removing.

**Group B — The four conditions (beside the outline)**

3. `ns-img-four-conditions` — *Differ, inherit, crowd, filter.* Four small scenes in one frame, evenly spaced, no arrows and no numbering. First: eight ovals, all slightly different. Second: one oval with three matching offspring beneath, joined by fine lines. Third: a crowded field where ovals overlap slightly at the edges. Fourth: the same crowded field with a portion drawn faint. Deliberately not laid out as a flowing sequence, because a chain of arrows would suggest a process someone is running.

**Group C — What cannot happen (beside the sort)**

4. `ns-img-acquired` — *The chip does not pass down.* A single oval at the top with a distinct notch cut from its right edge, and four offspring below joined by fine lines, every one of them with a complete unbroken outline. Nothing else in frame. This is the giraffe misconception answered without drawing a giraffe, and it is the panel most likely to be spoiled by a generator helpfully making one offspring "partly" notched. None of them are.
5. `ns-img-not-strongest` — *Fitness is offspring, not size.* Two ovals side by side at the top of the frame, the left noticeably larger than the right. Beneath the large one, a single offspring. Beneath the small one, six. Fine lines join each parent to its own offspring. No conflict, no interaction between the two adults, and neither is emphasised by lighting or position.

**Group D — No direction (after the FAQ)**

6. `ns-img-reversal` — *Change the conditions and it runs backwards.* Six rows of twelve ovals. Across the first three rows the dark ones increase, exactly as in panel 1. The ground then changes from dark to pale, and across the last three rows the pale ones increase again. Same beetles throughout, drawn identically. The composition must not read as a rise and a fall — no curve, no peak — because it is not a story with a climax. It is the same mechanism running with a different input.

## Alt text rules for this pack

Alt text **states the counts in each row**, because the counts are the evidence: "twelve beetles, three dark and nine pale" and not "mostly pale beetles". A reader who cannot see the panels must be able to track the frequency shift as precisely as one who can.

It must also state explicitly, where it applies, that **every individual is drawn identically and none changes between rows.** That sentence is not describing a stylistic choice; it is describing the panel's entire scientific content, and alt text that omits it describes a picture which would teach the misconception. For `ns-img-acquired` the alt text must say that all four offspring have unbroken outlines.
