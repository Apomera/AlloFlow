# Why We Have Rules — image shot list (text-free policy)

Companion to `rules_and_fairness_grade1.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/rules_and_fairness_grade1/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, simple, flat, friendly for six-year-olds; large shapes, few details, one idea per picture.

## The three mistakes this topic invites

Civics art for young children goes wrong in a specific and consistent way. Reject a generated image that does any of these.

1. **No adult standing over children, pointing.** The reading says a rule is something *we all agree to do*, not one person telling you what to do — and it says so in a sentence a child will be read aloud. A picture of an adult issuing an instruction contradicts the text on the page it sits beside. Where an adult appears, they are seated at child height or part of the circle.
2. **No signage, no crossed-out symbols, no red circles with a slash.** Those are text by another route, and they turn "rules" into prohibitions. The reading is at pains to say most rules are about safety and fairness, not about forbidding things.
3. **Nobody is drawn as the rule-breaker.** No child in a corner, no isolated figure with a downturned mouth, no finger pointed at a face. Consequences appear as a missed turn or a wait, never as shame. A six-year-old reads a scolding picture as being about them.

A fourth thing, less a mistake than a requirement: the children in these panels should visibly differ from one another in skin tone, hair and build, and at least one should use a mobility aid, because a unit about who a rule leaves out cannot be illustrated with one repeated child.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| rf-term-rule | Rule | Four children sitting in a circle on a bright rug, all with a hand raised together | everyone's hand is up, including the adult if one is present |
| rf-term-fair | Fair | Three children on a bench each holding an identical cup | the cups are visibly the same size, filled to the same line |
| rf-term-safe | Safe | A child's hand resting on a stair rail, stairs receding gently upward | hand is *on* the rail, relaxed; no falling, no alarm |
| rf-term-share | Share | Two children's hands meeting over an open box of markers, one passing a marker across | the marker is mid-hand-off, not being pulled |
| rf-term-turn | Turn | A child swinging while a second child sits waiting on the grass nearby, both smiling | the waiting child is calm and included, not left out |
| rf-term-agree | Agree | Two children facing each other, both nodding, thumbs up at their sides | both are agreeing; neither is persuading the other |
| rf-term-vote | Vote | Six raised hands seen from behind, above the tops of small chairs | just hands and chair backs; no ballot, no box, no tally |
| rf-term-change | Change | The same rug and circle, but the chairs have been rearranged into a new shape | recognisably the same room, visibly rearranged |
| rf-term-group | Group | Five children standing shoulder to shoulder, facing forward, holding one long ribbon | all five hold the same ribbon |
| rf-term-ask | Ask | One child with a hand raised high and an open, curious expression, others seated around | raised hand reads as a question, not as an answer |

The `rf-term-fair` cups matter more than they look: identical cups are the whole concept at this age. Do not draw one large and one small cup to "show unfairness" — this card defines the word, and the sort activity is where contrast belongs.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — What a rule is (after the reading)**

1. `rf-img-rules` — *One plan we all share.* A classroom rug from a slightly high angle. Six children of visibly different appearance sit in a loose circle; one uses a wheelchair pulled into the ring so the circle is unbroken. Every child has one hand raised. An adult sits cross-legged as part of the circle at the same height, hand also raised. Warm daylight from a window at the left. Nothing on the walls. Native caption carries the idea that a rule is something everyone agreed to, so the artwork only needs to show the agreeing.

**Group B — The two jobs (beside the anchor chart)**

2. `rf-img-safe` — *Rules about bodies.* Two small scenes side by side in one frame, separated by a soft gap rather than a line: a child's hand on a stair rail, and a child stopped at a kerb with toes behind the edge. Both children are calm. No traffic, no hazard, no motion blur — the point is the habit, not the danger.
3. `rf-img-fair` — *Rules about turns.* A playground swing set. One child swings gently; two others sit on the grass close by, one watching the swinger, one drawing with a stick. Everyone is relaxed. The waiting must not read as punishment.

**Group C — The big question (beside the memory aid)**

4. `rf-img-two-doors` — *Which door does it walk in?* The memory aid's own image: two simple archways side by side on a plain background. Through the left arch, a stair rail. Through the right arch, a swing. Empty floor in front of both, so a child can imagine placing a rule there. No labels above the arches — the native fields carry those, and this panel is useless if the words get drawn in.
5. `rf-img-who-helps` — *Who does this rule help?* Four children at a table with one bowl of fruit between them. Three can reach it easily; the fourth is seated slightly further back and is stretching. Nobody is upset — this is a puzzle to notice, not a wrong to condemn. This is the most important panel in the pack and the easiest to get wrong: the stretch should be subtle enough that a class has to look twice.

**Group D — Rules can change (after the FAQ)**

6. `rf-img-asking` — *Asking is not breaking.* A child stands beside a seated adult, both looking at a paper chart on the wall that is deliberately drawn as blank ruled lines with no readable marks. The child is mid-sentence with an open hand; the adult is listening, leaning in. Neither looks unhappy. The blank chart is the trick that keeps this text-free while still obviously being a list of rules.

## Alt text rules for this pack

Alt text describes what the picture shows, for a student who cannot see it, in the reading's own vocabulary — *rule, fair, safe, turn, share, vote*. It never describes the prompt, never says "illustration of", and never explains the lesson. For `rf-img-who-helps` the alt text must mention the stretching child, because that detail is the panel's entire content and a description without it describes a different picture.
