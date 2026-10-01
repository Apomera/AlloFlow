# Cephalopod Hunter — pass 25

Completed 2026-10-01. Unstaged and uncommitted by user request.

The compact dive layout exposes more of the animal and environment. Health, energy, stamina, camouflage, depth and substrate remain live; target distance, bearing and action readiness stay beside the view. Pause, Forage and Tools form a small primary dock. The minimap, score, time, propulsion details and secondary actions move into a paused Tools dialog. Movement/depth, Jet, Strike / hold, finite ink readiness, Target, Interact and species defense remain directly available, including landscape and wider touch devices. Ordinary wide fine-pointer controls retain their existing order and names.

Touch guidance now names the displayed actions. Failed Forage attempts show the same actionable advice visually and to screen readers, replace an active Observe card, and expire after 3.5 active simulation seconds. Food eligibility and successful gathering are unchanged. Settings retain an already paused dive. Dialog return, inspection, pointer cancellation, focus loss and orientation changes release held input; deferred layout work, observers and viewport listeners are removed at teardown.

All four runtimes have SHA-256 `a2c72a41312e97f9d8e35dde908b35476b2158e1b83adc409d4bc0e77cdbe5a2`. 33 guarded source hunks reverse exactly to pass24 baseline `3f8aa5f3215d33df0f7dbccc60fc495f71f2b5754a482cd3d482bd8446e28937`. The 149 random-containing lines / 157 literal calls and 12 pre-existing translation wrappers remain exact. Previous uncommitted passes, models, habitat, lighting, physics, AI, mission, ink and shelter rules are preserved outside the stated UI/input/feedback changes. No new scene meshes, materials, lights, textures or post-processing passes.

## Verification

- 388 distinct CPU cases across 43 files have passing final outcomes. The initial run passed 383 and failed 5; actual-source grounding/cue dependencies repaired the stale fixtures, then the two affected files passed 83/83. Original outcome assertions remain. Counts use distinct case identities rather than add repeated runs.
- 15 distinct native Chromium cases have passing final outcomes across saved batches: six new touch/layout/feedback cases and nine existing pause, targeting, mission, foraging and inspection cases. One worker, zero automatic retries, skips or flaky outcomes. The last production change only fixes Forward label wrapping; the native portrait geometry case reran on the final source. Earlier new cases retain the otherwise identical source behavior.
- Native touch includes trusted CDP touch streams, simultaneous movement/Jet, orientation changes, paused Tools/Settings/Inspection interruptions, focus return, 44px targets, no overlapping/clipped action buttons, correct projection, and no stale held input. Visible failed-Forage feedback and active-time expiry cover common octopus and vampire squid.
- Actual page-created GL pixels are nonblank, context/scene/resource identities stay stable across UI transitions, and context release is checked before harness cleanup. This does not claim exactly-once disposal of every native buffer; earlier ownership suites remain intact.

## Matched natural visibility

Same common-octopus seed 2741, balanced quality, 20 active 50ms production steps, DPR1 touch/mobile profiles. Both sources use the same standard viewport metadata omitted by the standalone harness. All player/actor transforms and phases, natural camera position/orientation/FOV, time, energy and score match exactly. Responsive aspect is checked against the actual canvas. Only the native pause veil is hidden; all ordinary UI overlays remain. One complete-stage entry scroll is allowed, with no individual-action scrolling.

| Profile | Clear world area before → after | Central clear height before → after |
|---|---:|---:|
|390×844 |44.1% →55.0% |142 →232 px |
|320×568 |30.1% →42.5% |16 →116 px |
|844×390 landscape |55.8% →59.6% |219 →141 px |
|390×844 larger text |33.7% →44.6% |76 →167 px |

The 40×64 grid counts visible opaque panel/button/map/text rectangles, including pointer-events:none HUDs, ancestor clipping and off-viewport samples. Decorative translucent gradients are excluded; this is an occlusion proxy, not a perception or performance measurement. Landscape trades central vertical space for a stage that fits the viewport and exposes touch actions that were absent before. HUD/mission details can scroll under constrained height or larger text; primary target/depth context remains visible. Root and independent image review accept all four final pairs and representative GL views. These captures cover daylight/common octopus; physical-phone and WebKit behavior remain unmeasured.

## Retained findings

Initial test/capture failures remain saved. Native fixtures were corrected for natural bobbing, the existing 8Hz HUD cadence and CDP stream order. Legacy Forage selectors now accept compact labels. Strike assertions still inspect the original single-strike disabled/cooldown state; substituting the always-enabled held control was rejected and corrected. Four baseline science fixtures referenced an old numeric spawn/uppercase floor constant, although baseline already used species-adjusted grounding; the accepted actual model is lifted into those fixtures for common and giant Pacific octopus while retaining their reef, safe-depth, propulsion, full-camouflage and bidirectional-fade outcomes.

Final source captures were all completed before cached-baseline JSON serialization exposed absent versus undefined optional phase keys. Saved final data was reanalyzed with the same representation on both sides; numeric state equality, projection, source hashes, nonblank pixels and cleanup checks remain strict. No additional GPU rendering was needed. Closing audit measures 149 random-containing lines/157 literal calls instead of the earlier notes' hardcoded 150. No RNG code changed.

HEAD remains `1bce28945b84b84299a462c3d32209be18f3c4e6`; owned index entries and commits since the initial snapshot are empty. No staging, commit, push or deployment by this task.

Preview: [Open Humboldt squid](http://127.0.0.1:57343/__harness?species=humboldtSquid&mode=observe&pass=25). HTTP 200 and served final-source hash verified. The old preview expired; this is a fresh local server with ordinary production timing.

Evidence: `validation-summary.json`, `resource-integrity.json`, `change-guards.json`, `fact-fixture-evidence.json`, `audit-history.json`, native/unit logs, and `mobile-world-comparison/` including final overlays, GL images, exact state and retained failures. Native suite: `tests/e2e/cephalopod-mobile-experience.spec.ts`; matched capture runner: `compare-mobile-world.cjs`.
