# Cephalopod Hunter: eleventh enhancement pass

Completed visual implementation and validation. The user requested better environment and animal visuals. This pass changes the canonical Cephalopod module, synchronizes three desktop runtime mirrors, and adds focused tests and reports. Previous visual work is committed as `758bdb5e7`. No deployment is included.

## Result

- Cuttlefish, bobtail, Dumbo and vampire eyes now use curved muted irises, dark domed pupils, embedded skin sockets and upper skin folds. The cuttlefish has an illustrative light-adapted W aperture; it does not simulate pupil dilation. A final cuttlefish-only placement correction clears the wide mantle and moving front fin while keeping the sockets attached to the head. Other species and non-eye geometry are preserved.
- The 200 ambient water particles surround the swimmer at shallow and deep locations. Soft circular edges, near-camera fading, index-based variation and a three-CSS-pixel diameter cap keep the field subtle. Fixed buffers preserve nearby particles in world space; distant particles wrap at the field bounds. Decorative drift stops during inspection, pause and reduced motion. The original decorative simulation buffer and RNG calls remain separate and unchanged.
- The same 28 edible marine-snow objects now use small irregular translucent flocs. Their spawning, falling, recycling, reach, gathering, rewards and random calls are unchanged. Food remains distinct from ambient dust and retains its existing gameplay movement under reduced motion.

Each affected eye pair still uses eight meshes: 2,040 vertices and 3,408 triangles, down from 3,400 vertices and 5,760 triangles. The ambient field remains one Points draw; the food remains 28 meshes, each with a shared 84-vertex/28-triangle floc geometry. No new textures, lights, render passes, timers or per-frame eye geometry updates are introduced. See [model notes](visual-notes.md) and [environment notes](environment-notes.md) for design details and reference limits.

## Validation and retained failures

The parsed evidence covers **122 distinct unit cases and six browser cases**. Repeated unit cases are counted once; this is not a claim that a single final 122-case run was executed.

| Evidence | Result | Meaning |
| --- | --- | --- |
| `unit-initial.json` / `.log` | 121/121 passed | Eight files: accessibility 4, eyes 7, facts 78, fins 9, prey memory 6, squid arm detail 7, strike clock 3, water particles 7. |
| `unit-placement-final.json` / `.log` | Incomplete run; nine fin cases passed, two fork-startup errors | Eye and squid-arm workers timed out starting. Raw Vitest JSON reports `success: true` for its nine collected cases, but the process exited 1 and the log records both infrastructure errors. This run is not reported as fully passed. |
| `unit-placement-recovery.json` / `.log` | 15/15 passed using threads | Eight eye cases, including the new mantle/fin-clearance regression, plus seven protected-body/squid-arm cases. This resolves the two files that could not start. |
| `water-visuals-initial.json` / `.log` | 4/4 passed initially; zero skipped, unexpected or flaky | Low/balanced actual GPU shader compilation/linking, active particle size cap, deep/distant submissions, fixed buffers, inspection/reduced-motion freeze, resume and disposal. |
| `foraging-initial.json` / `.log` | 2/2 passed initially; zero skipped, unexpected or flaky | Existing vampire button-forage single-meal behavior and held-key gathering/no-ink behavior. |

The distinct unit total is the initial 121 plus the new cuttlefish-clearance case. All five raw validation JSON files were parsed successfully. Both browser runners exited 0 with empty top-level error arrays and no retries. Browser durations were 613,784.885 ms for the four new cases and 202,056.587 ms for the two existing foraging cases.

The four water/eye browser cases preceded the final cuttlefish-only placement refinement. That final pose was checked by the additional production-rig clearance case, recovered eye/body tests and the final desktop, phone and detail captures. The vampire feeding path is unaffected by the placement change.

## Visual review and fixture limits

Twelve final PNGs cover reef/deep water, the affected animals, protected Humboldt, desktop inspection and phone inspection. The final cuttlefish desktop, phone and eye-detail views were visually accepted: the full W aperture clears the mantle and the eyelids remain attached. `capture-results.json` and the recovered `cuttle-placement-captures.json` both parse with empty error arrays.

The final detail-capture attempt was interrupted when the previous preview server died between user turns. An earlier detail PNG/JSON was corrupt, and a subsequent attempt encountered connection refusal. After starting a fresh local preview server, the three cuttlefish views were regenerated successfully with process exit 0. The accepted files replace the incomplete artifacts; the recovery is recorded here and in `cuttle-placement-recovery.log`.

Captures use ordinary field study and standard paused inspection/orbit/zoom controls, with no camera-coordinate, geometry, material, light or pose overrides. The browser travel fixture relocates only X/Z and uses actual Dive input for authoritative depth. It verifies native shader programs after real render submissions and confirms particles project within the camera frustum. These structural checks complement visual review; they do not quantify attractiveness or food recognition at every distance. Phone inspection captures do not establish active phone gathering usability.

Selected final views: [cuttlefish desktop](cuttlefish-model.png), [eye detail](cuttlefish-eye-detail.png), [cuttlefish phone](cuttlefish-phone.png), [Dumbo water](dumboOcto-environment.png), [vampire water](vampireSquid-environment.png), [bobtail](bobtailSquid-model.png).

## Source parity and ownership

All four working runtime copies have identical raw and LF-normalized SHA-256:

`afe15987b562098d4d89667999abdf041a34335c3557a692c0612bc2c73f37d0`

- `stem_lab/stem_tool_cephalopodlab.js`
- `desktop/web-app/public/stem_lab/stem_tool_cephalopodlab.js`
- `desktop/app-build/stem_lab/stem_tool_cephalopodlab.js` (ignored runtime mirror)
- `desktop/web-app/build/stem_lab/stem_tool_cephalopodlab.js` (ignored runtime mirror)

The canonical and tracked public files began with twelve pre-existing screen-reader translation wrappers per file. Those exact wrappers remain in the working files and are excluded from this pass's prepared commit candidate, remaining unstaged. `ownership-check.json` confirms 12 preserved wrappers in each tracked file, their absence from HEAD, and a clean candidate index check without staging. The prepared candidate's LF-normalized SHA-256 is:

`fafaed50ec90eae98117e8e0bebd9f09e8ff7de37e8f6804f88476b0298e2b24`

The candidate/runtime hash difference reflects preserved unrelated working changes, not mirror drift. Shared handoff, host, translation catalogs and unrelated domains are outside this pass. The machine-readable [validation summary](validation-summary.json) records the exact counts, infrastructure failures, capture recovery and hashes. Raw logs, JSON and scratch patch artifacts are retained locally and ignored; the summary is tracked.

## Scoped commit gate exception

The normal commit hook initially stopped on pre-existing shared work: `content_engine_source.jsx` and `desktop/web-app/src/content_engine_source.jsx` differed by one line. Neither file belongs to this pass. The twelve remaining hook commands were executed unchanged and all exited zero; their results are retained in `remaining-hooks.json` and `.log`. Automatic approval review rejected a proposed hook bypass without explicit user authorization, so no bypass ran and no hook, Git configuration or unrelated file was changed. The unrelated drift subsequently cleared externally. The combined pass-eleven/twelve changes then committed normally as `ea4f1d845`, with the full original hook enabled and passing.
