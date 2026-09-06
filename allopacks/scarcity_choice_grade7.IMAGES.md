# Everything Has a Cost — image shot list (text-free policy)

Companion to `scarcity_choice_grade7.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/scarcity_choice_grade7/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: clean, restrained, diagrammatic where the idea is abstract; ordinary life where it is concrete.

## The two things this pack must not look like

**Not money.** The reading's first move is that economics is about scarcity rather than money, and that time and attention are scarce for everyone. Coins, banknotes, dollar signs and piggy banks would undo that in one image. **The set contains no currency at all.** Where a cost is shown, it is shown as a closed door, an unlit slice, an empty chair — the thing not taken.

**Not two people arguing.** Trade-offs are not conflicts between people; they are structural. Keep the imagery in objects and space.

The recurring visual is **the option not taken**: doors, one open and one closed; a podium with a visible second place; a pie with a wedge missing. If a reader can see what is absent, the panel is working.

One accuracy note: the sand example in the reading is real and specific — construction sand is scarce in some regions because demand outruns supply, not because sand is rare. Any panel illustrating it must show a construction context and an active pit or barge, not a picturesque beach, or it teaches the rare-equals-scarce error the pack exists to correct.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (restrained, no currency, no text) | must show / must avoid |
|---|---|---|---|
| sc-term-scarcity | Scarcity | Many hands reaching toward one glass of water on a table | demand exceeding supply, visibly |
| sc-term-scarce | Scarce | A single seat left in a long row of occupied seats | one remaining, many wanting |
| sc-term-choice | Choice | A corridor with two doors, one open with light beyond, one shut | the shut door is equally prominent |
| sc-term-tradeoff | Trade-off | A simple beam balance with an object on each pan, tipped one way | both objects visible; nothing labelled |
| sc-term-opportunity | Opportunity | A door closing slowly with light narrowing in the gap | mid-close, not shut |
| sc-term-alternative | Alternative | Two identical doors side by side, one being opened | near-identical, so ranking is the only difference |
| sc-term-benefit | Benefit | A lit lamp on a desk, warm pool of light beneath it | gain shown as light, not as coins |
| sc-term-sunk | Sunk | A torn ticket stub on wet pavement, footprints leading away | spent and left behind |
| sc-term-marginal | Marginal | A stack of blocks with one hand placing a single extra block on top | the increment is the subject |
| sc-term-incentive | Incentive | Two identical paths, one gently downhill, footprints going that way | the pull is structural, not a reward |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The core idea (after the reading)**

1. `sc-img-two-columns` — *One hour, three doors.* A corridor with three doors. One stands open with warm light beyond. The second is closed but has a hand still resting on the handle. The third is closed and further away. Labels: Sleep, chosen, Friends, the next best, Project, third. Caption: the opportunity cost is the second door only. The third one does not count.
2. `sc-img-scarce-not-rare` — *Common, and still scarce.* Two panels. Left: an active sand-and-gravel pit beside a construction site with trucks waiting. Right: an open beach with nobody on it. Labels: Demand outruns supply here, Common, and not scarce here. Caption: scarce means wanted more than exists, which is not the same as rare. The left panel must read as industrial, not scenic.
3. `sc-img-podium` — *The silver medal.* A three-step podium seen from the front, first place occupied, second place occupied, third place empty and shaded out. Labels: What you chose, The cost, Not part of the price. Caption: opportunity cost is the runner-up, and only the runner-up.

**Group B — The traps (after the anchor chart)**

4. `sc-img-sunk-cost` — *The money is already gone.* One frame split by a vertical line. Behind the line: a ticket stub and a receipt lying on the ground, greyed out. Ahead of it: two doors, both open, and a person standing at the divide facing forward. Labels: Already spent, cannot return, The only real choice. Caption: what you already paid should not decide what you do next.
5. `sc-img-margin` — *One more, not all or nothing.* A stack of blocks with a hand adding a single block at the top, and beside it a small beam balance weighing that one block against a clock face. Labels: One more hour of practice, What that hour costs. Caption: most real questions are about one more, not about everything.

**Group C — Public choices (after the FAQ)**

6. `sc-img-town-pie` — *A road instead of a library.* A pie chart from above with one slice lifted clear and set beside a small road icon, leaving a visible empty wedge with a small library icon greyed inside it. Labels: Funded, road, Given up, library. Caption: the town is not against libraries. The library was the cost.
7. `sc-img-one-hour-four` — *Four groups, one room.* A single closed door with four groups waiting outside it in separate clusters: people with homework folders, people in exercise clothes, people with instrument cases, people with crates of tinned food. Labels: one per group. Caption: one hour, one room, and a decision that has to name what it gave up.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, and **stating what is absent or closed**, because the thing not taken is the content in most of these panels.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word. Opportunity and Alternative are both close to their own pictures and need care.
- If a rendered image contains currency of any kind, it fails review, however incidental it looks.
