# Cephalopod Hunter: pass 27

Humboldt squid pigment now carries broad root-space mottling that remains visible as fine detail filters away. Variation is stronger across the dorsal surface and fades completely on the pale belly. The existing three noise calls and two derivative evaluations remain; the finish adds no geometry, material, texture, light or render pass.

Anatomy callouts now use measured side rails with clear spacing and leader lines to the actual projected anatomy. The safe region follows the real canvas, title and controls through phone sizing, larger text, orbit and zoom. The inspection view reserves measured title and toolbar height plus room for enlarged callouts in landscape. Entering and leaving inspection schedules a fresh layout. Each label is measured from a fixed left coordinate before rail placement so its previous position cannot shrink its reported width. Geometry, animation and the paused animal state remain protected. The original seven source guards introduce pigment and callout layout; three additional presentation guards stabilize inspection height, entry/exit sizing and label measurement.

All four runtime copies match SHA256 `9b4781523f5b93570734728e59b0911d034069e37240372b6142b63401de292e`. 10 exact source guards reverse to pass 26 `4f69e86395eb9eaa940e6aeffe84f9fa52fe7af8b51a91e58a826678be6676c6`. Random-containing lines remain exact. The full twelve-rig audit retains all geometry expectations and the complete fingerprints of the eleven other species. Twenty-five Humboldt meshes across five animation frames preserve every field outside the four approved pigment compilers.

## Verification

- 128 CPU cases across nine files pass in one complete final-source run. Initial failed runs and missing collection identities remain recorded separately.
- Two copied-source negative controls reject the newly added mottle and label gates by their intended behavior assertions; restored candidates pass. Production runtime files remain unchanged during these controls.
- Six native Chromium cases pass on the final source, with one GPU worker and no automatic retries, skips or flaky cases. Low and balanced squid programs compile and link in actual WebGL, retain the root inverse frame and owned resources through motion, Jet and inspection, and release production resources before harness cleanup. Four callout cases check actual projected anchors, bounds and collisions while actors stay frozen.
- Six matched natural pairs yield 12 fresh captures and 24 DOM/native-GL PNGs. World, camera and readout data match between baseline and current sources. Root and an independent reviewer accept every profile.

## Paired views

| View | Baseline | Enhanced |
|---|---|---|
| squid-follow | [Before](squid-surface-comparison/baseline-squid-follow.png) | [After](squid-surface-comparison/current-squid-follow.png) |
| squid-phone | [Before](squid-surface-comparison/baseline-squid-phone.png) | [After](squid-surface-comparison/current-squid-phone.png) |
| squid-inspection | [Before](squid-surface-comparison/baseline-squid-inspection.png) | [After](squid-surface-comparison/current-squid-inspection.png) |
| squid-phone-inspection | [Before](squid-surface-comparison/baseline-squid-phone-inspection.png) | [After](squid-surface-comparison/current-squid-phone-inspection.png) |
| octopus-phone-inspection | [Before](squid-surface-comparison/baseline-octopus-phone-inspection.png) | [After](squid-surface-comparison/current-octopus-phone-inspection.png) |
| nautilus-phone-inspection | [Before](squid-surface-comparison/baseline-nautilus-phone-inspection.png) | [After](squid-surface-comparison/current-nautilus-phone-inspection.png) |

Both whole-page DOM and overlay-free native GL views are included. Captures use seed 2741, DPR1, balanced desktop and low phone settings, 20 active 50 ms production steps and native pause. Inspection orbit/zoom uses native controls with counted camera-only steps while the actors remain paused. A whole-stage entry scroll is supported.

## Retained history and limits

- The initial isolated-fork CPU batch collected only four of nine files and failed three protected snapshots at their former 20 or 30 second limits. Worker startup errors prevented five requested files from being collected. Its passing outcomes are retained as history and do not count toward final validation.
- An isolated-thread diagnostic passed the six squid surface cases but failed to start the label worker. A single reusable thread then passed the full 128-case collection. Only the four expensive protected snapshot time budgets changed to 240 seconds; their sampling and assertions stayed intact.
- The initial native batch passed three species callout cases. Its squid landscape case exposed a genuinely short inspection stage, fixed by reserving measured title, label and toolbar height and recalculating on entry and exit. Two squid shader cases could not mount because the root test wrapper supplied an absolute source path to the relative-URL harness; the wrapper now uses the canonical relative source.
- The final CPU and native batches are separately bound to the final source and current test hashes. Automatic retries are disabled. Copied-source mutation checks contribute no extra ordinary CPU cases. Raw diagnostic logs, reports and initial failure screenshots remain local ignored evidence.

- Chromium DPR1 software WebGL; no hardware FPS, physical-phone or WebKit claim.
- The bounded broad mottle is an illustrative squid pigment finish. Geometry and animation are protected; no performance improvement is claimed.
- The native inspection controls may hide intervening rocks. The capture helper changes neither actors nor camera independently of those controls.
- Raw runner logs, failure artifacts and frozen source snapshots remain local ignored evidence. Curated reversal data reconstructs only the exact matching baseline.

## Reproduction and commit scope

`capture-organic-squid.cjs` accepts an explicit baseline or reconstructs the exact pass 26 baseline from `baseline-reversal.json` when its ignored snapshot is absent. The helper verifies all 10 guards and the source hash, then removes its temporary source. A changed runtime requires separately matching baseline evidence.

The user authorized a normal-hook commit of the exact 42-path manifest. This validation records the requested transaction; it does not claim it has completed. No push or deployment is requested.

Curated evidence: [validation-summary.json](validation-summary.json), [resource-integrity.json](resource-integrity.json), [visual-review.json](visual-review.json), [baseline-reversal.json](baseline-reversal.json). Raw logs, failure artifacts and frozen snapshots remain local ignored history.
