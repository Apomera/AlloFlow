# First Response Lab: supporting-hand inspection

The far hand beside the cheek was small and nearly edge-on in the Head close-up, especially on phones. A new **Supporting hand close-up** follows that hand's palm and includes visible cheek context. It refits after pose, age, guides, contrast, fullscreen or viewer-size changes.

Completed-pose controls compare support before and after the turn. The observation disclosure asks learners to follow the palm and back of the hand. Comparisons change the shown pose; completed steps, credit, saved depth settings and inquiry responses remain intact. Completed-pose review remains available when the 3D viewer is unavailable.

## Rendered views

These are actual Chromium stage captures. Raw canvas captures and ray/GPU evidence are saved alongside them.

| View | Standard | Contrast |
| --- | --- | --- |
| Adult, before the turn | [View](adult-standard-pose-4-support-stage.png) | [View](adult-contrast-pose-4-support-stage.png) |
| Adult, after the turn | [View](adult-standard-pose-8-support-stage.png) | [View](adult-contrast-pose-8-support-stage.png) |
| Child, after the turn | [View](child-standard-pose-8-support-stage.png) | [View](child-contrast-pose-8-support-stage.png) |
| Infant, 320px phone | [View](phone-infant-standard-pose-8-support-stage.png) | [View](phone-infant-contrast-pose-8-support-stage.png) |

The table measures the complete hand's projected bounding area and CSS width against the unchanged Head close-up, using the same pose and viewport.

| Model | Pose | Hand area increase | Head view width | Supporting view width |
| --- | --- | --- | --- | --- |
| adult | 4 | 3.11× | 95.4px | 209.5px |
| adult | 5 | 11.41× | 80.9px | 213.0px |
| adult | 8 | 7.79× | 69.4px | 202.6px |
| child | 4 | 3.62× | 104.9px | 203.9px |
| child | 5 | 13.94× | 69.1px | 200.9px |
| child | 8 | 9.10× | 66.1px | 201.7px |
| phone-infant | 4 | 5.42× | 82.7px | 150.5px |
| phone-infant | 5 | 14.96× | 45.9px | 143.0px |
| phone-infant | 8 | 10.22× | 49.6px | 155.3px |

## Validation

- **109 distinct unit checks passed** in eight fresh serial processes: 54 fixed complete-scene geometry/material/resource fingerprints, 36 framing cases in desktop and phone viewports, eight lifecycle checks and 11 controls/state checks. The runner verifies the expected pass count for every group.
- **Three native Chromium workflows passed**, one worker and zero retries: adult and child at 1280px, infant at 320px. Standard and contrast views cover poses 4, 5 and 8. Rays prove hand/cheek visibility; raw GPU pixels confirm the rendered surfaces differ from the scene background.
- **18 identical-camera replays** against the saved source preserve actual draw calls and triangle counts, scene geometry, materials and cameras. Nine existing Head cameras and three near-palm cameras also match the saved source exactly.
- Keyboard activation/orbit, 320↔760 resize and camera restoration, contrast rebuild, guides, age changes, forced colors, context loss and unmount disposal passed. Four scoped axe scans found zero violations; the forced-color scan excludes the automatic color-contrast rule.

The target aliases the existing hand Group. It adds no scene node, mesh, geometry, material or quiz region. Build-time fit metadata contains numbers only. The new camera can see more existing meshes than the Head view; rendering cost is therefore compared at identical cameras.

## Source preservation

All 14 edits reverse exactly to the saved starting source. Canonical and public files match at **754,410 bytes**.

- Before SHA256: `642b337db93a4c13cdbb1f95040662f3db45cf50529e5fd333938cd3de86be99`
- After SHA256: `6e24299465bceafcce0f079ef8171d6ab2871f852a64483acad90ac57cd79a9f`
- [Source preservation](source-preservation.json), [validation](validation.json), [unit summary](unit-final-summary.json), [browser log](browser-final.log), [exact changes](changes.json).

## Retained diagnostics

The first .09 cheek patch lay beneath the hand; widening it to .14 exposes adjacent cheek while keeping the full hand framed. The first refined browser fixture compared different camera angles' draw counts. That invalid check was replaced by identical-camera saved-source replays; its failure artifacts remain in context-refined-artifacts-2. An interrupted run produced no completed result. Initial unit filters skipped all cases because interpolated age names include quotes; the corrected runner uses matching expressions and verifies exact nonzero pass counts.

**Local changes only. No staging, commit, push or deployment.**
