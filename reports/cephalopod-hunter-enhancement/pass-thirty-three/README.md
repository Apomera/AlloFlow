# Cephalopod Hunter enhancement pass33

Moon-jelly bells now composite their inner surface before the outer crown. This removes the asymmetric staircase bands without changing the dome geometry, pulse, rim, anatomy, actor movement, or world randomness. Static index reversal was tested and rejected because it only moved the bands to the opposite half.

Failed strikes now give a concrete next action: rise or dive for a depth mismatch, approach for range, or select nearby prey when the committed target disappears. Visible and screen-reader advice match. Cover priority, capture rules, contact/recovery timing, scores, awareness, and feeding remain unchanged.

Accepted source: ad1970ff112df529cc9115e0fbd69061c80393af9570aba38fa05b1c9cb6b91c. Baseline: 7c37f74fe6f091e7b0e24ec37af280ac3d578b522c3e0dd586e24b9310a6f963. Reversing the two exact source guards reproduces the baseline bytes; all four runtime copies match the accepted source.

Validation passes 10 unit cases in 3 files and 7 unique native browser cases. Native cases cover low/balanced linked side programs, actual culling/group order, stable buffers, pulse/pause/inspection/reduced-motion/cleanup and shelter streaming, plus far/blocked strikes, held clam feeding, successful contact timing, and actual keyboard/touch signed advice. Two saved-source faults were caught. Source, test, and support hashes remained unchanged during the accepted runs.

The initial new test fixtures required corrections to ray arithmetic, desktop viewport height, halo observation, input visibility, and contact sampling. The raw failed runs are retained. No production change was made to accommodate these fixtures; accepted native coverage combines the unchanged five preservation cases with the two corrected guidance cases. The native fault was correctly caught; its reporter ANSI highlighting required a display-only qualification correction.

| Per jelly | Baseline | Current |
|---|---:|---:|
| Meshes / geometries | 8 / 8 | 8 / 8 |
| Materials | 8 | 9 |
| Geometry vertices / triangles | 1,721 / 2,970 | 1,721 / 2,970 |
| Attribute and index bytes | 79,776 | 79,776 |
| Draw submissions when all parts are visible | 8 | 9 |
| Submitted triangles before culling | 2,970 | 3,882 |

Across five visible jellies this adds five materials and five draws. Geometry buffers and textures remain unchanged; new side programs and binding state add backend work. Fourteen watched native draw records are not a global program count. Absolute final renderer samples are saved; no FPS or global-program delta is claimed.

Twelve matched jelly pairs use three real live phases and side, oblique, phone, and underside cameras. The final pixels exactly match the independently reviewed accepted probe. A small contracted-crown interior sample reduces its largest adjacent-row luminance step from 12.12 to 0.46 (5 steps over 2 to 0). This is a fixture-specific artifact check, not a general image-quality score.

Two complete scene profiles preserve world/player/prey/camera/plant/UI/tick snapshots. Actual keyboard/touch screenshots show readable lost-target advice. Inherited oral-ribbon faceting and phone hint/fin clearance remain; ordinary HUD refresh can briefly show the preceding strike state. The bell fix does not solve transparency ordering between arbitrary scene objects.

Evidence: [validation](validation-summary.json), [resources](resource-integrity.json), [matched jelly comparison](capture-comparison.json), [scene comparison](scene-comparison.json), [visual review](visual-review.json), [independent review](independent-jelly-review.md). Selected images are in matched-baseline-jelly-views, current-jelly-views, baseline-views/current-views, and current-guidance-views. Extra inherited narrow/landscape baseline images and exploratory probes are excluded from the 34-image accepted count.

All changes remain uncommitted and unstaged. No push or deployment was performed.
