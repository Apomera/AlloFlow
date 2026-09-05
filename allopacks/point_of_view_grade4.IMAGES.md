# Point of View — image shot list (text-free policy)

Companion to `point_of_view_grade4.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/point_of_view_grade4/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** In particular, no speech-bubble text and no letters on signs or books; a speech bubble may be drawn empty or with a simple icon (an eye, a heart) if the panel calls for it. Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, simple, flat; diverse kids; consistent character designs for Maya (red boots in the puddle scene) and Dev (striped scarf) across every panel so readers can follow who is who.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| pv-term-narrator | Narrator | An open book with a small figure sitting on its top edge, mouth open as if speaking, an empty speech bubble | bubble empty |
| pv-term-perspective | Perspective | Two children on opposite sides of a low wall; one sees a ball behind it, the other cannot | the wall blocks one child's view clearly |
| pv-term-pronoun | Pronoun | A child pointing at themselves with one hand and at a friend with the other | no letters |
| pv-term-character | Character | Three distinct kids standing together in a row, each with a different posture | no text on clothing |
| pv-term-dialogue | Dialogue | Two kids facing each other, each with an empty speech bubble | bubbles empty |
| pv-term-thoughts | Thoughts | A child with a cloud-shaped thought bubble containing a small picture of a cake | thought bubble, not speech bubble |
| pv-term-scene | Scene | A single moment: a kitchen with two kids and a spilled bowl, framed like a stage | one place, one time |
| pv-term-retell | Retell | The same puddle scene drawn twice side by side, once from behind Maya and once from behind Dev | the two viewpoints must be clearly different angles of one scene |
| pv-term-compare | Compare | Two apples side by side with a small equals-style pair of parallel lines between them (no letters) | plain symbol only |
| pv-term-contrast | Contrast | An apple and an orange side by side with a small divergent-arrows symbol between them | plain symbol only |

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — The puddle, two ways (after the reading)**

1. `pv-img-puddle-maya` — *Inside Maya's head.* Seen from just behind Maya's shoulder: her red boots in a puddle, water splashing, Dev a few steps behind her laughing; Dev's face is only partly visible because we are looking Maya's way. Labels: What Maya sees (anchor on the puddle), What she cannot see (anchor on Dev's turned face). Caption: first person shows only what the narrator knows.
2. `pv-img-puddle-outside` — *The whole scene.* The same moment from across the street, both kids fully visible: Maya's wet boots, Dev laughing but with a worried brow. Labels: Maya, Dev. Caption: a third-person narrator can show both characters at once.
3. `pv-img-puddle-dev` — *Inside Dev's head.* From behind Dev: Maya walking away, and above Dev a thought bubble showing him in the same puddle the day before. Labels: What Dev remembers (anchor on the thought bubble). Caption: the same event, a third telling, with something only Dev could know.

**Group B — The detective move (after the anchor chart)**

4. `pv-img-flashlight` — *One flashlight, one narrator.* A dark room; a child holds a flashlight lighting a small circle that shows a friend's face, while another figure sits unseen in the shadow behind the child. Labels: What the narrator knows (lit circle), What the narrator cannot know (shadowed figure). Caption: a first-person narrator sees only where their light falls.
5. `pv-img-room-lights` — *Room lights on.* The same room fully lit, every figure visible, the flashlight now unnecessary. Labels: none. Caption: a third-person narrator can see the whole room.
6. `pv-img-two-windows` — *Two windows on one yard.* Two children at two different windows of a house, each looking down at the same dog digging a hole; from one window a buried bone is visible, from the other it is hidden by a bush. Labels: Sees the bone, Cannot see the bone. Caption: two honest narrators, two different stories.

**Group C — Writing it (after the FAQ)**

7. `pv-img-choose` — *Choosing a narrator.* A child at a desk with two blank storyboards: one showing a single large face, one showing a small scene with several figures. Labels: Close to one character, Whole picture. Caption: writers pick the point of view on purpose.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing what is in the picture, including who is visible and who is hidden, because visibility is the science of this lesson.
- Do not describe the prompt; describe the rendered image, then review it against the picture and store the hash, as in the Water Cycle pilot.
- Refer to Maya and Dev by name only where the caption or labels already establish them; otherwise describe them by their markers (red boots, striped scarf).
