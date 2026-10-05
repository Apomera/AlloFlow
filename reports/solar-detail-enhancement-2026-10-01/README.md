# Solar System world detail and map enhancement — October 1, 2026

This pass improves the selected-world detail card, makes existing camera/comparison actions easier to find, and refines map labels and orbit emphasis. It follows the [explorer](../solar-visual-enhancement-2026-09-30/README.md) and [Orrery navigator/readout](../solar-orrery-visual-enhancement-2026-09-30/README.md) enhancements.

## Changes

- The detail card replaces eleven compact badges with named definition-list groups: current readings and orbit/world properties. Values are 16–18px, the main description is 13px, and science explanations are at least 12px. Plain-language labels retain the orbital symbols, with a short explanation of shape and tilt. Portraits reuse the existing cache; comets and other small bodies retain decorative symbols.
- Follow camera and the native comparison selector now appear beside world selection. Each action has one control and preserves its existing callback, accessible name, and state. Comparison results and the evidence workflow remain in the detail card.
- Playback and phase controls stay visible. Map display, zoom, marker sizes, and filters share a native collapsible panel. It opens by default to preserve discoverability, and the user's expanded/collapsed choice persists across world changes.
- Selected and compared world labels receive space before ordinary labels. The collision map reserves the Sun core and name, the scale ruler, the readout, the full-system inset, and orbital anchor labels when present. Displaced priority labels use short leaders. The selected orbit uses a solid cue and the comparison uses a dashed cue with readable theme outlines.
- Classification and table numbers use readable theme colors. World colors remain accents on borders and canvas marks. The same system-font default now applies when opening the Orrery directly. Computed samples confirm that the card, heading, definition labels, and values inherit this stack; existing reader font preferences retain their overrides.
- The canvas-accessibility source scanner now follows each canvas's binding rather than a 12-line text window. This resolves the existing specimen-canvas false positive while rejecting unnamed or incorrectly classified canvases in focused fixtures.

Scientific positions, scales, orbital calculations, evidence gating, and the shared clock remain unchanged. Live value IDs remain text leaves. The work adds no asset downloads, animation loops, or WebGL resources. Canonical and desktop tool modules are byte-identical.

## Visual evidence

The before images were captured from the local source immediately before this pass. Both passes use the repository's real tool module and compiled app stylesheet in its GL harness, with English labels and reduced motion.

| View | Before | After |
| --- | --- | --- |
| Mercury detail, desktop dark | [Baseline](before-mercury-1180-dark-detail.png) | [Enhanced](after-mercury-1180-dark-detail.png) |
| Mercury detail, phone light | [Baseline](before-mercury-320-light-detail.png) | [Enhanced](after-mercury-320-light-detail.png) |
| Mercury map, desktop dark | [Baseline](before-mercury-1180-dark-map.png) | [Enhanced](after-mercury-1180-dark-map.png) |
| Mercury map, phone light | [Baseline](before-mercury-320-light-map.png) | [Enhanced](after-mercury-320-light-map.png) |
| Mercury detail, desktop light | — | [Enhanced](after-mercury-1180-light-detail.png) |
| Saturn detail, tablet dark | — | [Enhanced](after-saturn-736-dark-detail.png) |
| Halley's Comet detail, phone dark | — | [Enhanced](after-halley-320-dark-detail.png) |

## Verification

The visual review passed all five layout/theme/world cases with no page overflow or browser runtime errors. It checked the definition-list groups, live summary consistency, unique navigator actions, native summary keyboard behavior, Follow camera state, comparison-label retention, and snapshot A. The minimum contrast below covers the detail classification, labels, values, description, and comparison table after selecting a second world.

| Width | Theme | World | Page overflow | Minimum detail-text contrast |
| --- | --- | --- | --- | --- |
| 1180px | Dark | Mercury | None | 6.08:1 |
| 1180px | Light | Mercury | None | 5.50:1 |
| 736px | Dark | Saturn | None | 6.08:1 |
| 320px | Light | Mercury | None | 5.50:1 |
| 320px | Dark | Halley's Comet | None | 6.08:1 |

Measurements, including computed font samples: [after-metrics.json](after-metrics.json). Final visual run: [log](final-visual-qa.log).

All **104 focused unit checks** across seven files passed across the final runs. The final complete run passed 103/104; the remaining assertion still named the previous camera-control location. After updating that expectation to the world navigator, its focused rerun passed. The source scanner's 17 cases include seven existing checks and ten new boundary fixtures. Evidence: [complete unit JSON](final-all-focused-unit-tests.json), [complete unit log](final-all-focused-unit-tests.log), [camera-help rerun JSON](final-camera-help-unit-tests.json), and [scanner JSON](canvas-a11y-unit-tests.json).

All **21 targeted Chromium browser cases** passed across the initial run and focused rerun. The initial run passed 16/21. Five test expectations/setup steps were corrected: the full comet name, renamed detail labels, the eight-item comparison legend, and bringing the canvas into view before observing playback. The five affected cases then passed with one worker and retries disabled. These checks cover detail semantics, unique navigator actions, native keyboard disclosure, phone/tablet containment, light/dark comparison and evidence tables, map label collisions and reserved areas after resize, camera normalization, HiDPI/touch sizing, hover status, hidden-world behavior, focus recovery, live metric identity and synchronization, comparison updates, keyboard selection, zoom presets, and camera follow. Evidence: [initial browser log](solar-detail-browser-tests.log), [final browser log](solar-detail-browser-final-tests.log), and [browser artifacts](browser-final-results/).

Source syntax, scoped whitespace checks, and SHA-256 parity between the canonical tool and desktop mirror passed. No commit was created.

Reproduce the current visual checks from the repository root:

```powershell
node reports/solar-detail-enhancement-2026-10-01/visual-qa.cjs
```

The saved baseline images are historical review evidence. This report covers local implementation verification.
