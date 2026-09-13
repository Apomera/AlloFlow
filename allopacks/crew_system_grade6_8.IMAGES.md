# Crew Launch Week 4: One System for the Week - image shot list (text-free policy)

Companion to `crew_system_grade6_8.allopack.json`. The pack ships text-only and renders fully without images. Illustrations, when generated, go into a separate `allopacks/illustrated/` edition with WebP assets under `allopacks/media/crew_system_grade6_8/`.

Policy: **no raster text, labels, numbers, captions or watermarks in the artwork.** Speech bubbles stay empty or carry a simple icon. Labels and captions live in AlloFlow's native fields. Alt text describes the final artwork and is reviewed against it before shipping. Style: warm, simple, flat; a diverse middle-school Crew of about ten students and one adult; no logos, no school names, no faces of real people.

## Glossary pictures (square, 480 px, one per term)

| slot | term | generator prompt (flat, no text) | must show / must avoid |
|---|---|---|---|
| cs-term-system | System | Three simple gears meshing, each a different color | no labels on gears |
| cs-term-capture | Capture | One open notebook with an arrow from a speech bubble (empty) into the page | single notebook only |
| cs-term-launch | Launch | A backpack being zipped, a small clock beside it, a doorway behind | daytime, end of school |
| cs-term-reset | Reset | A blank week grid with one block split into three smaller blocks | no numbers |
| cs-term-willpower | Willpower | A phone battery icon nearly empty, red sliver | no percentage text |
| cs-term-chunk | Chunk | A large block being cut into three pieces by a plain line | pieces equal-ish |

## Lesson panels (900 px wide; each carries native labels and a caption)

1. `cs-img-marcus-before` - *Three places, no system.* A student with writing on the back of his hand, sticky notes on a laptop lid, and a loose paper falling from a bag. Labels: Hand, Sticky notes, Falling paper. Caption: three places means the assignment can be in the one you did not check.
2. `cs-img-marcus-after` - *One capture spot.* The same student typing into a single notes window on a laptop, the sticky notes gone, the hand clean. Labels: One place. Caption: nothing about his brain changed; his system did.
3. `cs-img-launch` - *The launch check.* The student at his desk in the last minutes of the day, laptop open to tomorrow, sliding a notebook into a bag. Labels: Look at tomorrow, Pack tonight. Caption: not in your locker at 8:04.
