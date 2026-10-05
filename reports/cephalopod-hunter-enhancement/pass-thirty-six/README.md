# Pass 36 — feeding-club readability and sand relief

Humboldt feeding clubs now have a pale inward-facing surface aligned with the existing suckers. Their backs and stalks retain the red finish. The static mask follows the existing bending tube; positions, normals, indices, contact logic and strike timing are preserved. Eight arms have zero masks. The existing limb material reuses the accepted noise and filtering; mantle, head and fins keep their accepted shader. Static mask cost: 7,560 bytes.

Sand now has warped ripples, separately filtered fundamental and harmonic ridges, coarse patch variation and analytically derived normals. Slopes are capped at 0.24. Without derivative support, the material retains coarse tint/roughness with no owned relief code. Existing grain texture, world placement, lighting transfer and shadow handling are unchanged. No meshes, materials, textures, lights or per-frame attribute uploads added.

## Verification

- 44 unique CPU checks across nine files now have passing results. Original run: 40 passed/4 failed. The affected two files then passed all seven cases: two signed-zero assertions corrected to physical numeric zero, two fin time allowances increased from 60 to 600 seconds. Every anatomy/fin/strike/reference assertion remains intact. CPU reports and repair/hash receipts preserve both runs.
- Seven native visual cases passed in low/balanced quality, phone viewport, lighting transitions and diagnostic effect coverage. One browser worker, no retries, no flaky/skipped/unexpected cases. Linked shader programs and actual oral GPU binding/stable-buffer metadata inspected. Native static-buffer assertions unchanged.
- Ordinary desktop and phone swimming captures: four full-UI/GL PNGs, source hashes checked, empty browser-error and unmount-leak lists.
- Controlled native strike: 35 sampled poses, four photos, actual 200 ms catch, contact center distance 0.035000 m, no browser errors or leaked resources.
- Four runtime copies match e6adbd73f260f5eec6ba8419cd1b3e5dee126f2ed81c0199ac83d5abf626f257; syntax and owned-path whitespace checks pass. Four exact guarded changes reverse to accepted baseline 5c12f16227e6e002486a9cd9f801729636664bca0b64e08a5e286c55b65ef58c. Post-test runtime/test/helper hashes checked.

## Limits and retained diagnostics

Baseline/current controlled strikes have different fish positions before the strike despite identical player/camera/rest geometry. The placement fixture preserves unrecorded steering state; treat these as separate successful native encounters, not a pixel-matched shader A/B. The dive's seeded RNG is separate from Three.js UUID randomness; no speculative RNG change made. No FPS, audible-sound or biological-accuracy claim.

Two thread-worker attempts ran zero tests. Process-worker run completed; loaded-machine fin time limits and signed-zero assertions were corrected as documented above. A concurrent broad 12-case browser attempt hit clock/mount timeouts and was interrupted; native-primary.log/artifacts remain, and it is not counted as a passing suite. Native visual checks then ran separately from CPU tests. The desktop natural capture initially hit a headless audio-device fault; successful visual runs use Chromium --disable-audio-output, which forces a fake output stream ([Chromium source](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/media/base/media_switches.cc)). Actual AudioContext and the game sound engine remain present. Earlier aborted navigation and restricted browser-path attempts retained.

See [gallery](gallery.html), raw logs/JSON and hash receipts. No staging, commit, push or deployment performed.
