# Explorer Journey overlay clarity

Presentation enhancement completed on 2026-10-05. Changes remain uncommitted.

## What changed

- A readable foreground card identifies the current parcel and its water phase. It retains the exact phase descriptions from `JOURNEY_MATTER_ENERGY_TRACE`, including liquid transport through roots/xylem and groundwater discharge. The explanation remains visible when paused and after the first part of a leg.
- The footer labels the percentage as **Animation leg**, keeping playback progress distinct from physical water residence time. Route choice and completion have their own footer instead of a moving progress bar.
- At the land decision, **R / U / P** badges identify the original clickable zones. Full route captions wrap naturally and connect to those same zones with plain leaders.
- Cards use opaque dark plates, at least 11px type, and natural text measurement. Their bounds are reserved before evidence and stage labels are placed.
- Other labels take the nearest available vertical lane. Substantially displaced stage captions have a plain connecting line and origin dot; arrowheads continue to identify the existing scientific transfer arrows.

The earlier tiny state bar and fading, single-line fact overlay are replaced by the new phase card. The existing process explanations, chapter diagrams, climate and land controls, and accessible text alternatives remain available.

## Scope and preservation

Current runtime SHA-256: `f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36` (3,163,319 bytes).

Frozen starting runtime: `4bb912b9f1d00c1b54be26d29197f0c1bd9c1277161664d21842532f973f4bf3` (3,153,009 bytes).

[presentation-changes.json](presentation-changes.json) records six exact presentation replacements:

| Slice | Purpose |
| --- | --- |
| `overlay-helpers` | Measured card layout, drawing, read-only transition lookahead, reservations, badges, and leaders |
| `reserve-overlays` | Reserve foreground geometry before other captions |
| `route-badges` | Replace tiny zone text with R/U/P badges |
| `foreground-parcel-plates` | Replace legacy state/fact paint with persistent foreground cards |
| `nearest-label-lane` | Use the nearest valid vertical lane |
| `stage-label-leaders` | Connect displaced stage labels to their original anchors |

Reversing these six replacements reproduces every byte of the starting runtime. Journey paths, original hit rectangles, transition map, clocks, pause/speed gates, callbacks, completion rewards, saved work, and 3D code are preserved. The lookahead computes paint geometry and leaves actual progression to the existing Journey block.

## Validation

**141 passing tests:** 33 focused helper/preservation tests and 108 existing regressions across nine test files.

| Evidence | Result |
| --- | --- |
| [Focused tests](focused-tests-final.json) | 33 passed; exact final candidate and frozen test script hashes recorded |
| [Final regressions](regression-final4/receipt.json) | 108 passed, zero failed; native uninstrumented run, matching source hashes before/after |
| [Detailed regression results](regression-final4/results.json) | All nine files and 108 assertions passed |
| [Frozen baseline browser](baseline-initial-results.json) | 195 checks, 45 scenes, 17 captures, six native route actions |
| [Full browser matrix](final-corrected-results.json) | 631 checks, 45 scenes, 17 captures, six native route actions and the native Space playback smoke |
| [Live preview](live-final-results.json) | 50 checks, three scenes, three captures, native Space playback; actual server response with interception disabled |

The browser matrix covers narrow phones and desktop, light/dark/high-contrast themes, forced colors, idle and every journey state, pause stability, actual text bounds, process evidence, exact route anchors, unchanged learner records, and original native canvas route clicks. Transition-frame unit tests compare the lookahead with the existing progression gate and verify actual reservation geometry.

An independent before/after review identified misplaced generic stage captions at the narrow land decision. Nearest-lane placement returned Precipitation to the sky, and a plain leader made the displaced Transpiration caption readable as an annotation. The reviewed plant-uptake phone and aquifer desktop retain visible parcels and process evidence.

The full browser matrix loads the exact pinned installed-file bytes through browser response routing. The separate live-preview run loads the actual server response with interception disabled. Both record the source bytes, native loaded bytes, and frozen harness hash. Historical report writers and earlier whole-canvas preservation contracts were left unchanged.

The native Space smoke observes rendered HUD progress and the actual parcel position, resumes the existing model, then pauses it through the original canvas handler. Requested redraws must preserve actual progress and the parcel center. The existing ambient render tick can change decorative pixels on an explicit repaint; after the last requested paint, passive paused pixels must remain stable. Saved learner records and the original engine remain intact throughout.

### Visual comparisons

| Scene | Before | Enhanced |
| --- | --- | --- |
| Land choice, phone | [Baseline](baseline-initial-ground_choice-light-320.png) | [Enhanced](final-corrected-ground_choice-light-320.png) |
| Cloud condensation, phone | [Baseline](baseline-initial-condensing-light-320.png) | [Enhanced](final-corrected-condensing-light-320.png) |
| Plant uptake, phone | [Baseline](baseline-initial-plant_absorb-light-320.png) | [Enhanced](final-corrected-plant_absorb-light-320.png) |
| Aquifer flow, desktop | [Baseline](baseline-initial-aquifer_flow-light-1040.png) | [Enhanced](final-corrected-aquifer_flow-light-1040.png) |

## Reproduce

Run from the repository root using native Node. Use fresh receipt/output names; existing evidence is preserved.

```powershell
$repo = (Get-Location).Path
$report = Join-Path $repo 'reports/watercycle-journey-overlay-clarity'
$source = Join-Path $repo 'stem_lab/stem_tool_watercycle.js'

node (Join-Path $report 'journey-overlay-tests.cjs') --source $source --baseline (Join-Path $report 'baseline-runtime.js') --manifest (Join-Path $report 'presentation-changes.json') --receipt (Join-Path $report 'focused-recheck.json')
node (Join-Path $report 'verify.cjs') --root $repo --report $report --qa (Join-Path $report 'journey-overlay-qa.cjs')
```

The verifier reads existing files and receipts without changing them. It checks both runtime copies, exact baseline restoration, focused script/hash provenance, regression source/test hashes, browser source and loaded-source hashes, frozen harnesses, captures, successful checks, and browser/resource cleanup. It requires completed final browser and live-preview receipts before reporting success.

For fresh browser evidence, start the local preview at `http://127.0.0.1:8770/`, then use the packaged QA harness with its explicit output directory:

```powershell
node (Join-Path $report 'journey-overlay-qa.cjs') "--source=$source" --sha=f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36 "--out=$report" --run=recheck
node (Join-Path $report 'journey-overlay-qa.cjs') "--source=$source" --sha=f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36 "--out=$report" --run=live-recheck --live
```

The second command checks three representative scenes through the actual server and exercises native playback. The full matrix remains the primary browser verification.
