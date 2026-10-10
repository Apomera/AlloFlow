# Cloud and soil visual clarity

Completed on 2026-10-05. Changes remain uncommitted.

## What changed

- Storm clouds now use a shared silhouette, body shading and clipped crown lighting. The original lobe sizes and positions, convective tower, anvil and cloud-base envelope are retained. The separate luminous puff rims and dark oval base have been replaced by a continuous cloud volume.
- Charge signs retain their original colors, positions and counts, with a dark outline for legibility. Lightning captions use opaque, measured cards with 11px text. Their original STATIC and STUDY qualifiers remain visible. Phone placement was refined through native captures so the added card fits between charge rows and preserves the existing label layout.
- Infiltration diagrams show four hatched soil grains, a partial liquid pore pocket, a water film and open pore space. Compare, Check and Journey share this 48px diagram. The original liquid phase descriptions and recharge caveat remain, with an added scope sentence: “This pore view is illustrative; soil saturation varies.”

## Scope and preservation

Installed source and public mirror SHA-256: `f00632bfe4eb8f57091aca4550b05d0eb0272a745dccbdf7a1f8a8d740d50086` (3,167,249 bytes).

Frozen starting source: `f2360e271a96e40308aeb0b45a4ded56aaecec4366eafa92781278713a6f2a36` (3,163,319 bytes).

[presentation-changes.json](presentation-changes.json) records nine exact presentation replacements. Reversing them restores every byte of the starting source. This preserves the precipitation model, lightning paths and timing, lifecycle, terrain, input handlers, scoring, saved learner work, 3D implementation and earlier Journey enhancements. Soil scope copy is appended only to the infiltration comparison and infiltration chapter note.

## Validation

| Evidence | Result |
| --- | --- |
| [Focused preservation](focused-final.json) | 54 deterministic cloud fixtures, 12 charge fixtures, 24 lightning title/anchor fixtures, 13 unchanged diagram variants, 12 bounded soil shapes and nine unchanged actual model cases |
| [Frozen baseline](baseline3-results.json) | 511 checks, 25 scenes, 26 captures and one native wind action |
| [Full Storm matrix](final-storm-results.json) | 816 checks, 25 scenes, 26 captures and one native wind action; exact model and scientific geometry compared with the baseline |
| [Live Storm preview](storm-live-final-results.json) | 92 checks, three scenes, four captures and one native wind action; actual server delivery with interception disabled |
| [Live soil consumers](soil-live-final2-results.json) | 114 checks, eight scenes and captures, 30 native keyboard actions; actual server delivery with interception disabled |
| [Behavioral regressions](regression-summary.json) | 173 passed, zero failed across six original files; three historical preservation assertions excluded by the Journey suite filter |

Storm coverage includes rain, snow, sleet, hail, virga and clear skies; storm lifecycle stages; stepped leader, upward streamer and return stroke; narrow phones and desktop; dark, light and contrast themes; forced colors; reduced motion and paused rendering. The browser observes the actual native canvas methods and loaded bytes. Source code is never rewritten for instrumentation. Full baseline/final evidence uses byte-for-byte response routing; the live runs use the server response directly. All browsers closed successfully.

The soil checks cover Compare selection and answer feedback, Check evidence disclosure and Journey chapter inspection through trusted keyboard events. They verify liquid phase text, visible grain hatching, water and air geometry, scope copy, viewport fit and protected learner records.

The six original test files retain their frozen hashes. Journey regressions select the chapter catalog and native chapter suites. Historical whole-engine preservation guards already differ from the starting source because of earlier presentation work; those guards and their archived reports were left intact. The new exact restoration contract uses the actual starting source for this enhancement.

## Visual review

| Scene | Before | Enhanced |
| --- | --- | --- |
| Storm anatomy, desktop | [Baseline](baseline3-hail-anatomy-desktop.png) | [Enhanced](final-storm-hail-anatomy-desktop.png) |
| Storm anatomy, phone | [Baseline](baseline3-hail-anatomy-phone320.png) | [Enhanced](final-storm-hail-anatomy-phone320.png) |
| Virga, phone | [Baseline](baseline3-virga-phone320.png) | [Enhanced](final-storm-virga-phone320.png) |
| Soil comparison, phone | — | [Enhanced](soil-live-final2-compare-light-phone320.png) |
| Soil chapter, phone | — | [Enhanced](soil-live-final2-chapter-light-phone320.png) |
| Soil comparison, forced colors | — | [Enhanced](soil-live-final2-compare-forced-phone390.png) |

Independent reviews accepted the final cloud, lightning and soil captures. Two inherited opportunities were recorded for later work: the SURFACE card covers one ground-charge sign in narrow Storm scenes, and Compare’s dark theme uses a muted diagram accent. The added lightning card introduces no new charge occlusion; all added cards pass mutual clearance checks.

## Read-only verification

From the repository root:

```powershell
node reports/watercycle-cloud-and-pore-visuals/verify.cjs
```

This verifies the installed source and public mirror, exact restoration, frozen artifact hashes, completed browser evidence, original test hashes and regression receipts. It writes no files.

The frozen browser harnesses and focused verifier are included for reproduction. Browser harnesses require the existing local preview on port 8770 and the repository’s installed Playwright. Use a fresh output directory and run prefix; existing evidence is never overwritten.
