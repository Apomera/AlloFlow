# Moon Phases and Eclipses — image shot list (text-free policy)

Companion to `moon_phases_grade6.allopack.json`. Nothing here is embedded in the pack; the pack ships text-only and renders fully without images. When illustrations are generated (in-app, or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), they go into a separate `allopacks/illustrated/` edition built by a script like `dev-tools/build_water_cycle_illustrated.cjs`, with WebP assets and a `manifest.json` under `allopacks/media/moon_phases_grade6/`.

Policy (settled 2026-09-04): **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's editable native fields (`visualPlan.panels[].labels` with 0-100 anchor coordinates, `caption`). Alt text describes the final artwork, not the prompt, and is reviewed against the image before it ships (`altSource: "vision"`). Every image is a model: the descriptions below say what is exaggerated or not to scale, and the caption must say so too.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat educational illustration, white background, no text) | must show / must avoid |
|---|---|---|---|
| mp-term-orbit | Orbit | Earth at center, a thin circular path around it, a small Moon on the path with a short arrow showing direction of travel | one clean path, one arrow; avoid the Sun so orbit is not confused with phases |
| mp-term-phase | Phase | A single Moon showing a waxing gibbous shape, the lit part bright, the dark part faintly visible against a night sky | the dark part must be faintly visible so the Moon reads as a whole ball |
| mp-term-crescent | Crescent | A thin waxing crescent low over a darkening horizon after sunset | lit edge on the right (northern-hemisphere evening view) |
| mp-term-gibbous | Gibbous | A Moon more than half lit but clearly not full | no rays or glow that hide the edge |
| mp-term-waxing | Waxing | Three Moons left to right growing: thin crescent, half, gibbous, with a small arrow pointing right | growth direction unambiguous; lit side consistent |
| mp-term-waning | Waning | Three Moons left to right shrinking: gibbous, half, crescent, with a small arrow pointing right | mirror of waxing; lit side on the left |
| mp-term-eclipse | Eclipse | A dim copper-red full Moon against a dark sky | red, not orange-sunset; no horizon so it is not confused with a rising Moon |
| mp-term-shadow | Shadow | A ball lit from one side by a lamp, casting a dark cone-shaped shadow onto a wall behind it | the lit half and dark half of the ball both visible |
| mp-term-rotate | Rotate | A spinning top with curved motion arrows around its axis | no orbit path; rotation only |
| mp-term-model | Model | A hand holding a small ball at arm's length toward a desk lamp in a dim room | the ball half lit toward the lamp |

## Lesson panels (900 px wide unless noted; each carries native labels and a caption)

**Group A — Why phases happen (place after the reading)**

1. `mp-img-halflit` — *Half lit, always.* The Moon as a ball with the Sun off-frame to the right; exactly half bright, half dark; no Earth in view. Labels: none. Caption states: half of the Moon is always lit; the phase depends on where Earth is when we look.
2. `mp-img-orbit-ring` — *Eight positions, eight phases.* Earth at center, the Sun's light arriving from the right as parallel rays, the Moon drawn at eight positions around its orbit, each one half lit toward the right; outside the ring, the shape seen from Earth at each position. Labels (anchor to the inner Moons): New (right), First quarter (top), Full (left), Third quarter (bottom). Caption: not to scale; the Moon is drawn far too large and far too close.
3. `mp-img-lamp-ball` — *The proof you can do tonight.* A student turning in place under a lamp, holding a ball out; the ball shows a half-lit shape; the student's own shadow falls on the floor away from the ball. Labels: Lamp = Sun; Ball = Moon; You = Earth. Caption: the shadow on the floor never reaches the ball, so the shapes cannot be shadows.
4. `mp-img-same-face` — *Same face.* Earth and the Moon at four points of the orbit, with a small marked crater on the Moon always pointing at Earth. Labels: anchor one label "Same side toward Earth" on the marked crater at one position. Caption: the Moon rotates once for each orbit.

**Group B — Eclipses (place after the anchor chart)**

5. `mp-img-lunar` — *Lunar eclipse.* Side view: Sun far left, Earth in the middle casting a long dark cone, the full Moon inside the cone glowing dim red. Labels: Earth's shadow (on the cone), Full Moon (on the Moon). Caption: happens only at full moon; everyone on Earth's night side can see it; not to scale.
6. `mp-img-solar` — *Solar eclipse.* Side view: Sun far left, the new Moon in the middle casting a thin shadow cone whose tip touches a small region of Earth. Labels: Moon's shadow, Path on Earth. Caption: only people inside the small shadow see the Sun blocked; not to scale.
7. `mp-img-tilt` — *Why not every month.* Side view of Earth with two orbits of the Moon drawn: one flat through Earth's shadow, one tilted so the full Moon passes just above the shadow cone. Labels: Tilted orbit (about 5°), Shadow. Caption: the real tilt is about five degrees; the drawing exaggerates it so the miss is visible.

**Group C — Observing (place after the FAQ)**

8. `mp-img-day-moon` — *Moon in daylight.* A blue afternoon sky with a pale first-quarter Moon high above rooftops. Labels: none. Caption: the Moon is above the horizon about twelve hours a day, half of them in daylight.
9. `mp-img-horizon-size` — *The horizon illusion.* Two Moons the same drawn size: one just above a treeline, one high in an empty sky, with a hand and thumb held up beside each. Labels: Same size. Caption: the thumb test shows the two are the same size; the horizon Moon only looks bigger.

## Alt text rules for the illustrated pass

- Describe what is in the final image in one or two sentences under 250 characters; do not repeat the prompt.
- Name directions (lit side, arrow direction) because they carry the science.
- Say "model" or "not to scale" only if the caption does not already; alt describes, caption qualifies.
- Every alt is reviewed against the rendered image and stored with the image hash, as in the Water Cycle pilot.
