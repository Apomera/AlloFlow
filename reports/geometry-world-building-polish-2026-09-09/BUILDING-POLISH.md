# Geometry World: precise previews and clearer building controls

Building now looks more accurate and feels more consistent. Hover highlights follow the real shape and rotation of slabs and wedges, placement previews stay at their exact eventual size, and shape controls give clear feedback across keyboard and touch.

## Shape-accurate previews

The old hover highlight always drew a full cube, including over fractional pieces. Its fill and outline now follow the target's actual geometry and world transform. The placement ghost no longer expands as it pulses; only its opacity changes. Both hover layers respect reduced motion and the ambient-motion setting.

The overlays own their resources and do not change construction materials, geometry, picking, or printable output. Unchanged frames reuse their geometry. Protected targets, blocked placement, measurement quieting, Showcase hiding, and teardown retain their existing behavior.

![Accurate quarter-wedge preview on phone](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/after-hover-quarter-r3-390x844.png)

## Consistent controls and helpful guidance

Choosing a shape starts at zero degrees using either Q or the shape tray. Rotation reads the current state, including rapid inputs before the next React render. Native buttons support Enter and Space, preserve focus, and retain 44-pixel targets. The existing feedback shows the full shape name and angle; its placement clears the utility controls on desktop, portrait phones, and landscape screens.

Older ruler and measurement timers cannot dismiss a newer shape cue early. Leaving the tool clears its owned cue. Print Lab project capture and restoration also clear this temporary feedback, including older pending snapshots, so Revise does not resurrect it.

The empty sandbox introduction now says to aim at the ground and press B or tap Place. It changes to selection guidance once a student block exists and returns to first-block guidance after the last one is removed. This uses the existing refresh and cached block array rather than the lifetime placement counter.

[Narrow-phone controls](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/supplemental-shape-feedback-320x700.png) · [Landscape controls](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/supplemental-shape-feedback-844x390.png) · [Desktop preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/after-hover-quarter-r3-1440x900.png)

## Verification

**336 unique tests passed across 14 files**, including the full 14-case Print Lab workflow suite. Canonical and desktop files match byte for byte and parse successfully.

Actual THREE geometry checks cover all four shapes at all four rotations, with zero hover vertex error. Actual React/THREE browser checks cover rotated fractional previews on desktop and phone, native controls and cue clearance at 1440 × 900, 390 × 844, 320 × 700, and 844 × 390, and first placement followed by Undo. Preview rendering and denied placement leave authored geometry, materials, STL bytes, and history unchanged.

The final actual Send to Print Lab → Revise roundtrip preserves the full world, STL, history, and a custom 12.5 mm-per-block scale. A cue was active when Send was dispatched; it was absent after unmount and after return.

Earlier browser runs identified the Space interception, cue overlap, and stale return cue. Those raw results remain available. The aggregate verifier requires their corrected follow-ups to pass, checks final source hashes, and proves the differences between snapshots are limited to the specific verified fixes. Its final result is successful.

Browser coverage uses Chromium with software WebGL, controlled hit payloads, and Saver rendering. It does not establish physical-device Safari coverage or a frame-rate improvement.

[Final verification](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/building-pass-summary.json) · [Visual QA](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/BUILDING-VISUAL-QA.md) · [Geometry and lifecycle checks](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-building-polish-2026-09-09/ACCURATE-PREVIEW-REVIEW.md)
