# Crew Launch Week 6: Feedback Is Information, Not a Verdict - image shot list (text-free policy)

Companion to `crew_feedback_grade6_8.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated, go into a separate `allopacks/illustrated/` edition with WebP assets under `allopacks/media/crew_feedback_grade6_8/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Speech bubbles stay empty or carry a simple icon. Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, simple, flat; a diverse middle-school Crew of about ten students and one adult; no logos, no school names, no faces of real people.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, no text) | must show / must avoid |
|---|---|---|---|
| cf-term-feedback | Feedback | A returned page with three small plain marks in the margin, no legible words | marks only |
| cf-term-verdict | Verdict | A gavel on a block | plain symbol |
| cf-term-rubric | Rubric | A three-row grid with shaded cells stepping up from left to right | no words in cells |
| cf-term-revise | Revise | A page with one paragraph highlighted and a pencil touching only that paragraph | the rest untouched |
| cf-term-gap | Gap | Two platforms with a small space between them and a plank almost across | gap is small |
| cf-term-yet | Yet | A house frame under construction with scaffolding, clearly in progress | not ruined, being built |

## Lesson panels (900 px wide; each carries native labels and a caption)

1. `cf-img-sinking` - *The first thirty seconds.* A student holding a returned page, shoulders dropped, three margin marks visible. Labels: Three comments. Caption: the sinking feeling is normal; the skill is what happens next.
2. `cf-img-map` - *The rubric as a map.* The same student with the page beside a three-row rubric grid; two rows marked lower, a small route line drawn from the low rows to the page. Labels: Claim, Evidence, Reasoning. Caption: the comments and her own ratings match; now they are a map.
3. `cf-img-revision` - *The whole revision.* The page with one new sentence inserted and one small evidence note added, everything else unchanged; a clock showing a short span. Labels: One piece of evidence, One connecting sentence. Caption: revising keeps what works.
