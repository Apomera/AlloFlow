# Energy Moves — image shot list (text-free policy)

Companion to `energy_transfer_grade4.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated (in-app or by a later ChatGPT/Codex pass following the Water Cycle illustrated pilot), go into a separate `allopacks/illustrated/` edition with WebP assets and a `manifest.json` under `allopacks/media/energy_transfer_grade4/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: bright, flat, friendly for nine-year-olds; clear silhouettes, one idea per picture.

## The mistakes this topic invites

Energy is invisible, so illustrators reach for symbols that quietly teach the wrong physics. Reject a generated image that does any of these.

1. **Energy must never be drawn as a glowing substance travelling like a fluid.** No luminous liquid pouring along a wire, no sparkling dust drifting from a battery. The reading is explicit that energy is not stuff you can hold or put in a jar. A picture of glowing goo makes it exactly that, and it is a misconception that survives for years.
2. **No lightning bolts as decoration.** A jagged bolt is the universal shorthand for "electricity, vaguely" and it says nothing about transfer. Where a current is shown, show the wire, the source and the thing that lights up.
3. **No faces, no eyes, no expressions on objects.** A smiling battery handing energy to a grateful bulb reintroduces intention into a topic that has none.
4. **Nothing may be drawn being destroyed or disappearing.** The pack's closing idea is that energy never vanishes, so no puffs of smoke, no fading-out, no empty outline where something used to be.

How energy *is* shown: by its **effects**, and by simple arrows indicating direction of travel. A warm spoon handle, blocks scattering, a bulb lit, a cup knocked off a desk. If a panel would still make sense with the arrow removed, the arrow is decoration and can go.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, kid-friendly, no text) | must show / must avoid |
|---|---|---|---|
| en-term-energy | Energy | A ball mid-roll toward a small stack of three blocks, blocks still upright | the moment before, so the cause is visible |
| en-term-motion | Motion | A single ball with three short trailing lines behind it on a plain ground | trail lines only; no speed bursts or stars |
| en-term-speed | Speed | The same ball drawn twice, once with one short trail and once with four long ones | identical ball, only the trail differs |
| en-term-transfer | Transfer | Two touching marbles, the left one still and the right one with a short trail | contact is visible; the arrow is unnecessary here |
| en-term-collide | Collide | Two marbles at the exact instant of contact, both slightly squashed | no impact stars, no jagged burst |
| en-term-sound | Sound | A drum seen from the side with three curved arcs spreading from its skin | arcs, not musical notes |
| en-term-light | Light | A torch with straight pale lines reaching a flat wall and a soft bright patch there | straight lines; the patch on the wall matters |
| en-term-heat | Heat | A spoon standing in a bowl, with three small arrows travelling up the handle | arrows point up the handle, warm end to cool |
| en-term-current | Current | A battery joined by two plain wires to a small round bulb that is glowing | complete loop; no bolts, no sparkles |
| en-term-change | Change | A battery on the left, a wire, and a lit bulb with a soft glow on the right | one arrangement, showing before and after in one frame |

`en-term-speed` only works if the ball is **identical** in both drawings. Same size, same colour, same shading. The reading makes a point that the ball did not get heavier, so a card that draws the fast one bigger contradicts the text beside it.

## Lesson panels (900 px wide; each carries native labels and a caption)

**Group A — Faster means more (after the reading)**

1. `en-img-speed` — *Same ball, different speed.* One frame split into two rows with a soft gap. Top row: a ball with one short trail arriving at a stack of four blocks, one block tipping. Bottom row: the identical ball with four long trails arriving at an identical stack, blocks flying apart. Same ball, same stack, same table, same lighting. The only differences are the trail and the result. Acceptance test: cover the trails and the two balls must be indistinguishable.

**Group B — The four ways (beside the anchor chart)**

2. `en-img-transfer` — *Four ways, one room.* The pack's anchor image. A single simple room drawn flat from one side. On the floor, a drum with curved arcs spreading from it. On a table, a lamp with straight pale lines reaching the nearby wall. Beside the lamp, a mug with three small arrows rising from it toward a pair of hands cupped around it. On the wall, a socket with a cord running to a kettle. Four transfers, four visual languages, one scene a child could point at. Nothing glows that should not, and no arrows appear anywhere they are not carrying meaning.
3. `en-img-spoon` — *Warm to cool, never the other way.* A close view of a bowl of soup with a metal spoon standing in it, handle rising out. Four small arrows travel up the handle at even spacing, all pointing the same way. A hand approaches the top of the handle but has not touched it. The single direction is the entire teaching point, so no arrow may point back down.

**Group C — Collisions (beside the quiz)**

4. `en-img-marbles` — *The energy went across.* Three small frames in a row, like a comic strip without a border. First: a marble rolling toward a still marble, short trail behind it. Second: the two touching, both marbles drawn plainly, no burst. Third: the first marble at rest exactly where contact happened, the second one away to the right with a trail behind it. Positions must be consistent across the three frames so the swap is readable.

**Group D — It never vanishes (after the FAQ)**

5. `en-img-where-went` — *Where did it go?* A ball at rest on the floor, with a faint dotted arc above it showing three progressively lower bounces it has already made. Two small curved arcs spread outward from the point where it last touched the floor, and a soft warm patch marks that spot. Nothing is fading out and nothing has disappeared: the sound and the warmth are drawn as things that are there. This panel is the answer to the pack's most-tested misconception, and it fails if the ball looks like it simply ran out.

## Alt text rules for this pack

Alt text describes what is visible and in which direction things travel, using the pack's own words — *energy, motion, speed, transfer, collide, sound, light, heat, current*. It never says energy is "flowing" or "pouring", because those words re-import the fluid misconception that the artwork was carefully drawn to avoid. For `en-img-speed` the alt text must state that the ball is the same in both rows and only the trail and the result differ, since that identity is the panel's claim. For `en-img-where-went` it must mention the arcs and the warm patch, because a description ending at "a ball lying still" describes a picture that would have failed this shot list.
