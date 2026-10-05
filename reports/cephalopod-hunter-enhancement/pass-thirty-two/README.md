# Cephalopod Hunter enhancement pass 32

Moon-jelly bells now contract into a deeper profile and open into a broader, flatter dome. The existing rolled rim, rest shape, pink anatomy, tentacles, drift and pulse timing remain intact.

Seagrass now has fuller folded straps using its existing vertices. Across 80 controlled variants, measured surface area increases 12.56% and aggregate upper width increases 39.89%. Actual bounds, rooted placement, kelp geometry, seed order and water motion remain unchanged. The improvement is modest at normal scene distance.

Vampire squid guidance now reflects marine-snow feeding: Observe measures actual snow distance, touch uses Gather / hold, unavailable hunting controls are hidden, and T gives feeding advice. Held gathering, one-meal Forage, cancellation and scoring retain their existing behavior.

- 47 CPU cases passed across 10 files.
- Eight unique native browser scenarios passed with one worker and zero retries. Five accepted habitat/touch cases come from final-native.json; three accepted cases come from native-verified.json.
- Three copied-source regressions were caught: old dome aspect, original grass fullness and prey-based vampire Observe guidance.
- 34 baseline/current PNGs were checked, with exact recorded scene/player/camera/phase parity. Two independent reviewers inspected all images.
- All four runtime copies match the source SHA in baseline-reversal.json. Nine guarded changes reverse byte-exactly to the saved pass 31 source.

Older plant tests still used sway expressions from before pass 28. Test-only migrations execute the accepted live shader pulse and verify its phases, cache key and clocks while retaining all geometry/contact/normal tolerances and original golden fixtures. Three long browser cases reached their time limit of 180 seconds; their reruns with a time limit of 480 seconds preserve every frame, control, assertion and retry setting. Raw attempts and the rejected404 fault-harness attempt remain recorded.

The pass adds no geometry bytes, vertices, triangles, materials, textures, lights or rendering passes. Seagrass adds startup scalar work and opaque coverage. Jelly bells add scalar arithmetic per existing vertex; unchanged resource counts do not imply zero CPU or raster cost. No target-device frame-rate claim is made.

Close jelly views still show existing transparency bands and angular oral ribbons. Existing narrow phone hint and fin-clearance limits remain. These are recorded in visual-review.json and the independent review files.

Changes are unstaged and uncommitted. No push or deployment was performed.

Evidence: [validation](validation-summary.json), [resource integrity](resource-integrity.json), [matched captures](capture-comparison.json), [visual review](visual-review.json), [baseline reversal](baseline-reversal.json).
