# Dissection Lab: observation points and measurements

2026-10-05. Changes are uncommitted.

## Improvements

- Pointer and keyboard marking preserve the selected structure, hovered structure, pinned lens, camera, notes, evidence frames, and technique progress.
- Ruler and annotation modes share point placement. Arrow keys, Home, and End choose exposed structure locations; Enter or Space places a point. Escape and Return to instruments exit the mode.
- The canvas guide has readable instructions, point counts, first/second endpoint states, approximate model distances, Undo, and measurement clearing. Controls wrap at narrow widths, support larger text and forced colors, and keep visible keyboard focus.
- Numbered endpoints and a keyboard crosshair clarify placement. Live instrument previews stop during marking and measuring. Completed measurements remain visible for the current specimen session.
- Essentials exits point modes. Specimen changes, successful progress loading, and confirmed reset clear transient ruler state. Annotation changes are immutable.

## Visual review

| Layout | Earlier guide | Enhanced guide |
| --- | --- | --- |
| phone | [Before](before-captures/before-phone.png) | [After](browser-final/after-phone.png) |
| tablet | [Before](before-captures/before-tablet.png) | [After](browser-final/after-tablet.png) |
| desktop | [Before](before-captures/before-desktop.png) | [After](browser-final/after-desktop.png) |
| embedded-medium | [Before](before-captures/before-embedded-medium.png) | [After](browser-final/after-embedded-medium.png) |
| embedded-large | [Before](before-captures/before-embedded-large.png) | [After](browser-final/after-embedded-large.png) |
| forced-colors | [Before](before-captures/before-forced-colors.png) | [After](browser-final/after-forced-colors.png) |

[Keyboard crosshair on phone](browser-final/keyboard-anchor-phone.png) · [Pointer measurement on desktop](browser-final/pointer-measurement-desktop.png) · [Text spacing and narrow layout](browser-final/text-spacing.png)

## Validation

- **14 browser checks passed**, using native pointer and keyboard input. They cover six layouts, nonempty saved evidence and reference preservation, zoom/pan inversion, ready-probe isolation, undo, restart, clear, mode exits, and specimen/reset boundaries.
- **206 unit checks passed**, including eight native React regressions.
- Six scoped accessibility audits contain no violations or incomplete results. Minimum control height: 48.00 px; minimum control font: 16.00 px; minimum guide text: 14.00 px. No measured text or controls clipped.
- Both renderer copies match and parse. Exact reverse edits restore the original renderer and unit-test bytes. [Validation details](validation.json), [browser run](browser-final/attempt.json), and [unit run](unit-verified/attempt.json) record tested inputs and outcomes.

The ruler reports a schematic model estimate using the existing specimen scale. Keyboard points use exposed structure locations; the pointer can choose other canvas positions. Measurements are retained for the current session and cleared at specimen/load/reset boundaries.

## Recorded attempts

The successful final runs are separate from earlier diagnostics. The first unit run had 199 passes and six failures: five existing text contracts and one native fixture lookup. A subsequent unit run passed all native regressions and had three failures in existing exact blur-handler text contracts; those contracts now include the conditional redraw. The first browser run had 13 passes and one fixture-key failure (worm versus earthworm). Compressed raw diagnostic outputs are retained under diagnostics.

The exact edits are recorded in source-edits.json, source-polish.json, source-visual-polish.json, unit-edits.json, unit-polish-edits.json, unit-residue-edits.json, unit-blur-edits.json, workspace-blur-edits.json, browser-edits.json, browser-polish-edits.json, and browser-final-edits.json.
