# AlloPack MCP decoded-media budgets

The illustrated and native authoring profiles enforce both embedded-file byte
limits and decoded pixel budgets before export. A small compressed file can have
a large decoded canvas, so byte limits alone do not bound image work.

| Budget | Published maximum |
| --- | ---: |
| One embedded image file | 1,000,000 bytes |
| All image placements | 1,500,000 bytes |
| One raster dimension | 4,096 pixels |
| One raster, including every GIF canvas frame | 16,777,216 pixels |
| All image placements and their canvas frames | 33,554,432 pixels |
| Image placements | 256 |
| Frames in one native animation | 60 |
| Encoded animation frames plus preserved still frames in a pack | 120 |

The aggregate pixel maximum corresponds to 128 MiB of one RGBA buffer per charged
canvas. This is an accounting bound, **not a browser memory guarantee**: browsers
can keep additional surfaces and decoder state. It accepts all 126 canonical and
illustrated packs checked when introduced on 2026-10-23, including Katie’s 32
cut-paper image placements. Authors can reduce image dimensions or split a pack
that exceeds the budget.

Every placement counts, even when identical image bytes are cached during
inspection. Original images, annotation overrides, playback GIFs, and separately
preserved still frames count independently. GIFs are charged their full logical
canvas for every encoded image frame, including frames that update only a small
rectangle. Frame counts and dimensions come from image containers; author-supplied
`frameWidth`, `frameHeight`, or frame-list metadata cannot reduce their cost.
The native animation count includes both GIF frames and its still-frame controls,
allowing one 60-frame animation with 60 saved stills. Counting both representations
also bounds many small animations that would otherwise fit the pixel budget.

`resource_pack_capabilities` exposes `limits.media.maxTotalPixels` and
`limits.media.maxTotalAnimationFrames`. The media module’s `stats.pixels` includes
all GIF canvases; `stats.animationFrames` reports the combined animation count.
`inspectDataImage().pixels` reports one image’s full canvas-frame charge. Local
validation options may tighten limits but cannot increase published caps.

Failures use `pack-media-pixels-exceeded` or `pack-animation-budget-exceeded`.
Existing byte, individual-raster, and per-animation limits remain enforced.
Container inspection does not decompress every pixel or establish visual or
educator approval. Regression tests create complete, highly compressed PNG
containers for the aggregate attack and inspect only their headers and chunks;
they deliberately never render that aggregate into decoded pixel buffers.
