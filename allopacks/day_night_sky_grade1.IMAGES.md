# Day Sky, Night Sky — image shot list (text-free policy)

Companion to `day_night_sky_grade1.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/day_night_sky_grade1/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, simple, flat, friendly for six-year-olds; large shapes, few details, one idea per picture.

## The two mistakes this topic invites

Almost every "day and night" picture on the internet gets one of these wrong, and either one teaches the opposite of the reading. Reject a generated image that does either.

1. **The Sun must never be drawn orbiting Earth**, and never on a curved arc that sweeps over a landscape. The reading's whole point is that the Sun stays put and Earth turns. The only curved arrow allowed is the one around Earth's own axis.
2. **The night side must not be black-and-starry while the day side is a separate scene.** Day and night are the same planet at the same moment, so wherever both appear together they belong on one globe, one lit half and one dark half, with the light arriving from a single direction.

Scale is a third trap. The Sun, Earth and Moon can never be drawn to scale together at this size, so every panel that shows more than one of them states "not to scale" in its native caption.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| sk-term-sun | Sun | A single bright yellow-orange disc with soft rays, on pale blue, nothing else in frame | no face; no arc; not sitting on a horizon |
| sk-term-star | Star | A deep navy square of sky with one glowing white-blue point clearly larger than the small dots around it | round glowing points, **not** five-pointed cartoon stars |
| sk-term-moon | Moon | A pale grey-white crescent with faint round craters, on deep blue | crescent only, no face, no cow, no cap |
| sk-term-earth | Earth | A blue-and-green globe with white cloud swirls, seen whole, one side softly lit and the other in shade | terminator (the light-to-dark edge) visible and soft |
| sk-term-spin | Spin | A child's spinning top upright on a wooden floor with a curved arrow circling it | arrow curls around the top's own axis |
| sk-term-day | Day | A small house and one tree under a bright blue sky with the Sun high and to one side | shadow of the house falls away from the Sun |
| sk-term-night | Night | The same house and tree under a deep blue sky with scattered small light points and a lit window | identical house and tree, so only the sky changed |
| sk-term-sunrise | Sunrise | The same house with the Sun a low half-disc at the horizon, sky peach fading to blue above | long shadow stretching away from the Sun |
| sk-term-sunset | Sunset | The same house with a low half-disc Sun on the opposite side, sky orange-pink | shadow stretches the other way; mirror of the sunrise card |
| sk-term-pattern | Pattern | Four small sky squares in a row: bright, dark, bright, dark | equal squares, obvious repeat, no arrows or numbers |

Sunrise and sunset are a deliberate pair: keep the house, tree and camera identical so the only differences are the Sun's side and the shadow's direction.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — Why the sky changes (after the reading)**

1. `sk-img-earth-turning` — *One planet, two times of day.* Earth as a globe in the centre, the Sun as a large disc off to the right with straight parallel light rays arriving from it. The half facing the Sun is lit, the far half is in shade. A small child figure stands on the lit half and the same child, smaller, on the dark half. A curved arrow wraps the globe's axis. Labels: Day (lit half), Night (dark half), Earth turns this way (on the curved arrow), Light from the Sun (on the rays). Caption: the same planet at the same moment; you get day or night depending on which side you are standing on. Not to scale.
2. `sk-img-you-turn` — *You are the one moving.* Three frames of one child standing in place beside a lamp on a table: facing the lamp, turned a quarter, turned fully away. The lamp is in exactly the same spot in all three frames. Labels: Facing the light, Turning, Turned away. Caption: the lamp never moved. This is what Earth does with the Sun.
3. `sk-img-sunrise-sunset` — *Turned toward, then turned away.* One landscape, two halves: on the left a low Sun rising with a long shadow reaching right; on the right a low Sun setting with the long shadow reaching left. Labels: Sunrise, Sunset, Shadow points away from the Sun (once per half). Caption: Earth turns you toward the Sun in the morning and away from it in the evening.

**Group B — Stars and the Moon (after the anchor chart)**

4. `sk-img-stars-still-there` — *The stars never left.* Two frames of the identical patch of sky above one rooftop: at night, small glowing points scattered across deep blue; in daytime, bright blue with those same points drawn very faintly in the same positions. Labels: Night, Daytime, Same stars (anchored across both frames). Caption: the bright sky hides the stars; it does not send them away.
5. `sk-img-moon-borrows` — *Borrowed light.* The Sun off to one side with straight rays reaching a grey Moon, and a second set of rays bouncing from the Moon toward a small Earth. Labels: Light from the Sun, Bounces to us, The Moon makes no light of its own. Caption: the Moon is bright the way a mirror is bright. Not to scale.
6. `sk-img-daytime-moon` — *A moon at lunchtime.* A bright blue afternoon sky over a playground, with a pale white crescent Moon low in the frame and a child pointing up at it. Labels: Pale daytime Moon (anchored on the crescent). Caption: the Moon is often up while it is still light out; you just have to look.

**Group C — The pattern (after the FAQ)**

7. `sk-img-day-night-wheel` — *Around it goes.* A circle divided into four wedges around a small Earth: bright, dimming, dark, brightening, with a curved arrow running around the outside in one direction. Labels: Day, Sunset, Night, Sunrise. Caption: the same four in the same order, over and over. That is the pattern.
8. `sk-img-shadow-watch` — *The Shadow Watch.* A sunny stretch of pavement seen from slightly above, with a chalk X and three traced shadow outlines fanning out from it: one long, one short, one long the other way. A child stands on the X. Labels: Morning, Middle of the day, Afternoon. Caption: same spot, same child, three different shadows, because Earth kept turning.

## Alt text rules for the illustrated pass

- One or two sentences under 250 characters describing the rendered picture, including which side is lit and which way arrows and shadows point, because those carry the science.
- Do not describe the prompt; describe the finished image, review it against the picture, and store the hash, as in the Water Cycle pilot.
- Never name the glossary term inside its own picture description: flashcard quiz mode shows the image while asking for the word.
- For any panel holding two or more of the Sun, Earth and Moon, the native caption states that it is not to scale.
