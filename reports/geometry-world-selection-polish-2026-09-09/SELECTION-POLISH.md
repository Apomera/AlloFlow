# Geometry World: clearer creations and print size

This pass gives the selected creation a quieter frame, makes the physical print dimensions easier to read, and brings the measurement tools into the same pine-and-ivory visual style.

## The creation comes forward

Eight small corner markers replace the persistent full wireframe cage. They leave the roof, openings, and surface detail visible, using pale sage for a clean joined mesh and warm amber when the selection needs review. The educational dimension guides and temporary layer highlights remain available while measuring.

The markers use actual transformed geometry bounds and ignore temporary placement-pop scaling, so a newly placed piece does not leave the frame stuck at its animated size. The frame is one static drawing object with 24 short segments. It does not intercept picking or enter exported geometry.

Showcase hides the current frame immediately, before its first render or saved photo. Returning restores the current frame, including after a replacement, while cleared or disposed frames stay removed. This is covered across Meadow, Studio, engine replacement, and unmount.

## Physical size at a glance

The Print Lab envelope now separates **Width**, **Depth**, and **Height**, with millimeter units on every value. Axes that exceed the saved printer profile receive an **Over limit** label and amber emphasis. The screen-reader announcement gives the same values and their axis order once.

The readout uses the existing physical scale and conservative whole-block envelope. Print Lab still checks the exported mesh, which can have smaller bounds for fractional shapes. The pinned Send action and existing profile/scale explanation remain available. Clear selection now has a 44-pixel target.

The status card and corner markers use the same review rule. A result is healthy only when it has one component, no open edges, no non-manifold edges, and no error. Open surfaces and incomplete checks no longer fall through to “One joined piece.” Review feedback remains advisory; the existing Print Lab handoff is unchanged.

## Consistent measurement tools

Layer Explorer and equivalent-volume views now use coordinated pine surfaces, ivory/sage text, larger readable type, and 44-pixel controls. Build This uses a quieter outlined treatment. Draft, ready, and saved connection states remain distinct. Estimate warnings, recommendations, and revision feedback retain their meaningful colors and high-contrast styles.

The compact summary, native disclosure, sticky Close button, measurement calculations, and learning actions keep their existing behavior. Visual review also caught the floating Build launcher covering expanded phone measurement content. It now hides only while those details are expanded and returns when they collapse or close.

## Verification

268 unique regression tests passed across 15 files. They cover frame geometry and ownership, immediate Showcase transitions, camera fitting, high-resolution photo export, measurement/keyboard behavior, labeled physical dimensions, truthful review feedback, selected STL preservation, and Print Lab workflows.

Matched desktop (1440 × 900) and phone (390 × 844) checks passed using the same 44-block fractional pavilion and all 45 authored blocks. Browser checks cover static corner geometry, default/custom print dimensions, per-axis limits, keyboard focus, 44-pixel controls, both Showcase looks, and an actual Print Lab Send/Revise roundtrip at 20 mm per block. The selected STL bytes, complete world, and history remain identical. A clean 991 × 2048 Studio PNG was saved and inspected.

A focused phone follow-up verified the overlay fix through expansion, collapse, scrolling, and Close. The final source differs from the full browser run only by the exact workspace state attribute and scoped visibility rule for that fix; aggregate verification checks this explicitly and matches the final follow-up hashes. Canonical/desktop mirror equality and syntax pass. Counts are deduplicated across the repeated inspector suite.

These checks use Chromium browser emulation and Saver rendering; they do not claim physical-device Safari coverage or a frame-rate improvement.

[Visual QA](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/SELECTION-VISUAL-QA.md) · [Frame geometry and lifecycle](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/SELECTION-FRAME-REVIEW.md) · [Measurement styling](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/MEASUREMENT-INTERIOR.md) · [Final verification](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/polish-pass-summary.json)

## Previews

![Refined creation frame on desktop](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/after-focus-1440x900.png)

[Phone creation preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/after-focus-390x844.png) · [Labeled print dimensions](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/after-dock-1440x900.png) · [Final phone measurement tools](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/supplemental-measurement-expanded-scrolled-390x844.png) · [Full-resolution Studio image](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-selection-polish-2026-09-09/after-studio-export-phone.png)
