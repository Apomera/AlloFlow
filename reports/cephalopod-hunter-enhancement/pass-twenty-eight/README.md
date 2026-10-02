# Cephalopod Hunter enhancement pass 28

This pass makes the surrounding ecosystem feel more alive. Fish turn their noses toward travel, hold loose formations that rotate with the school, tighten while wary, spread into an escape fan and regroup as the existing alarm decays. Kelp and seagrass receive a slow shared water pulse with smaller blade ripples, giving nearby plants related movement while retaining individual variation.

Fish remain governed by the existing visibility, camouflage, cover, display and remembered-threat rules. The new movement uses bounded scalar steps and reuses seeded spawn offsets. It removes a temporary target vector per living fish per frame and fixes the corner case where simultaneous edge crossings previously cancelled the school's turn.

Plant roots and root slopes remain fixed. The analytic derivative includes both ripple harmonics and the shared pulse; normal correction still precedes instance and world transforms. Local displacement stays within the original 0.12-height X, 0.035-height Z and 0.125-height horizontal envelopes. No meshes, materials, geometries, attributes, uniforms, textures or gameplay RNG draws are added.

## Change boundary

The final runtime is `9aa7ce02c22844fda042e27d7d2b0a50716c7f5d3717157a1052bf87d61cc671`. Seven exact guarded changes reverse byte-for-byte to pass 27 source `9b4781523f5b93570734728e59b0911d034069e37240372b6142b63401de292e`; all four runtime copies match. The cephalopod factory, prey fish factory and threat-memory helper are byte-identical. All 150 lines containing the 158 `Math.random` references remain exact. The frozen habitat fixture is unchanged; its original hash protection reverses only the three explicitly approved plant shader, cache-key and clock changes.

## Validation

- CPU: 34 cases across five files passed on the final runtime. Existing plant bounds, finite-difference normals, resource ownership and habitat/RNG oracles retain their tolerances.
- Fault sensitivity: three copied-source controls rejected broken nose alignment, corner reflection and pulse formulas through the intended assertions. Three focused cases passed again on the unchanged production source.
- Native browser coverage: 15 unique cases passed on the same final runtime with one worker and zero retries. The initial run had nine passes and six old-locator failures; correcting compact Tools-menu interactions produced ten passes across the four changed fixture files. Five unchanged prey-memory/foraging passes were retained with exact test hashes. This is two recorded runs, not one 15-case green run. Capture, cover, display interruption, hidden-threat memory, pause/inspection, reduced motion, actual compiled plant programs, phone pixels and disposal were exercised. The exact desktop cooldown button remains the oracle, even when hidden in the compact layout; touch-hold cooldown semantics are outside that assertion.
- Visual review: four fresh natural views and eight PNGs passed root and independent review: desktop squid quiet/approach, phone squid approach and desktop octopus reef. Native input changes the quiet 16 unaware fish to eight fleeing fish during both approaches. Actual grass and kelp programs submit in all four views; capture checks found no errors or leaks. The action prompt overlaps part of the squid on phone, a useful later refinement. These are current-only views: movement intentionally changes trajectories, so they are not matched baseline comparisons.

## Practical limits

Plant vertex trigonometric evaluations rise from four to nine per vertex; fragment work and resource counts remain unchanged. This is a deliberate visual cost. Native shader and lifecycle checks establish compatibility and stability for the tested renderer, without a hardware frame-rate claim. Reduced motion and pause retain their existing controls. Geometry and cephalopod materials are not changed in this pass.

`validation-summary.json` retains compact case identities, failed-attempt accounting, exact report hashes and copied-source control outcomes. `resource-integrity.json` and `baseline-reversal.json` record the guarded source boundary. `natural-views/capture-manifest.json` records native camera/input/state evidence; `visual-review.json` records both reviewers. Raw logs, full native attachments and copied sources remain ignored local diagnostics.
