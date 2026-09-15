# Crew Launch Week 7: Two Sides of One Story - image shot list (text-free policy)

Companion to `crew_perspective_grade6_8.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated, go into a separate `allopacks/illustrated/` edition with WebP assets under `allopacks/media/crew_perspective_grade6_8/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Speech bubbles stay empty or carry a simple icon. Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, simple, flat; a diverse middle-school Crew of about ten students and one adult; no logos, no school names, no faces of real people.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, no text) | must show / must avoid |
|---|---|---|---|
| cp-term-story | Story | A student looking at a phone with a large thought bubble above, the bubble holding only a tangled line | no words in the bubble |
| cp-term-fact | Fact | A plain camera on a table, viewfinder open, nothing dramatic in frame | no screen text |
| cp-term-perspective | Perspective | Two students on opposite sides of one table looking at the same object, each seeing a different side of it | object simple |
| cp-term-openq | Open question | A student with an open palm turned up, leaning slightly toward a friend, friend relaxed | not pointing |
| cp-term-swap | Viewpoint swap | Two chairs facing each other with a curved arrow between them | chairs empty |
| cp-term-hold | Hold loosely | Two hands cupped loosely around a small paper bird, fingers open | not gripping |

## Lesson panels (900 px wide; each carries native labels and a caption)

1. `cp-img-chat` - *The photo nobody reacted to.* A phone screen showing a photo of a science model with three small reaction marks and one empty space where a fourth would go. Labels: Three reactions, The one that did not come. Caption: by morning Dev has decided what the silence meant.
2. `cp-img-twosides` - *Two sides, one moment.* A split panel: on the left Dev at his desk looking at his phone with a dark thought bubble; on the right Priya at a kitchen table with her phone face down in an adult's hand. Labels: Dev's side, Priya's side. Caption: two stories, one fact, nobody asked.
3. `cp-img-ask` - *The five-second question.* The next morning, Dev leaning over to Priya in the hallway with an open palm, Priya starting to smile. Labels: The question, The answer. Caption: notice, hold, ask.
