# Water cycle: a visible droplet merger

The precipitation chamber now shows two round cloud droplets approaching, touching, then becoming one larger drop. The incoming pair disappears at the merge. Both views share the same three-stage illustration, and the larger radius preserves the combined volume of the two equal inputs. Paused and reduced-motion views retain examples of all three stages.

In the local tool, open **Storm Lab**, choose a warm cloud, then compare **2D chamber** and **3D cloud chamber → Inside cloud**. Existing pause, view and camera controls apply. The neighboring explanation describes the sequence and its schematic timing.

The 3D drawing accounts for point-sprite projection, camera orientation and the cloud's changing shape, so the pair visibly touches after orbiting. The new round texture joins the existing resource cleanup. Weather calculations and saved learner data are outside the changed drawing blocks.

The camera controls and Air column card now share a responsive layout, so wrapped controls keep all three temperatures visible on phones and in narrow embedded chambers.

Collision–coalescence is supported by [NWS cloud-development guidance](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm). This animation illustrates one successful merger; particle sizes and timing are magnified, and further growth may be needed before rain forms.

## Verification

- 9 focused tests passed against the helper extracted from both actual shipped runtimes: phase boundaries, exclusive droplet counts, conserved spherical volume, tangent contact, bounded motion and malformed-input handling.
- 42 browser checks passed on actual 2D arcs and 3D rendered geometry, with 7 captures. Coverage includes native play/pause, camera changes, projected contact, cold-cloud behavior and reduced motion. Layout checks cover readable camera choices, visible air temperatures and nonoverlapping controls on desktop, a 390px phone and a 330px chamber inside a wide viewport.
- The tested browser and local server closed. Source and public mirror match. Reversing the 13 recorded changes restores every earlier source byte.

The raw results, exact tested helper test, native runner/config, browser harness and captures are included. Earlier diagnostic runs are excluded. Nothing was committed.

## Reproduce

From the project root:

```text
node reports/watercycle-coalescence/verify.cjs
node node_modules/vitest/vitest.mjs run --config reports/watercycle-coalescence/unit/coalescence-vitest.config.mjs
```

Final source SHA-256: `1281abe1619064fa59fd31b71a598068563c4a588db35597de5972c356946e5f`. Previous source: `fbfbcf84e06cf48575ec74cbc8a640abdba0a4cae0db5320d3ce06d660e88daf`.
