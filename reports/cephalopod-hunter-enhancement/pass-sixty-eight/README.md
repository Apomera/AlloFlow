# Cephalopod Hunter — Pass68

Five larger reef octopuses (common, giant Pacific, mimic, Caribbean reef and coconut) now have a lower mantle, flatter underside and shoulder that tapers toward the head. The existing sphere topology and UVs are preserved. Face-area normals are merged across seam/pole duplicates. Conservative bounds include existing camouflage papillae. Blue-ringed octopus and all six swimming species remain unchanged.

Pearl and portable-shelter prompts and G-key pickup use the same nearest reachable target. Existing rock raycasts reject blocked items and allow a farther clear item to be selected. Original strict range/height limits, tie order, pearl priority, one action per held key and carried-shelter drop are preserved. Natural dens and placed cover behavior are outside this change.

The camera previously clamped its desired endpoint before interpolation, allowing the rendered position to cross below rising terrain. All ordinary dive views now apply a final actual-position terrain clearance before lookAt. Camera-mode offsets, controls and inspection behavior are preserved; terrain corrections can adjust pitch and later interpolated height.

## Validation

- 93 tests in 14 focused files pass. New regression cases cover model shape, seam normals, eye/head attachment under squeezing, bounds, pickup occlusion and a camera path across a smooth ridge between valid endpoints. Existing Hunt tests cover twelve species, narrow/wide aspect ratios and animated strikes.
- 8 model rendering checks, 7 native pickup checks and 10 native camera checks pass with no page/console errors or leaked owned GL resources.
- Six baseline/candidate views use the same seeded scene. Fixed study cameras match; natural Follow camera Y/orientation intentionally change under the terrain clamp. Its pre-clamp position, terrain threshold and unchanged target are recorded.
- Native camera controls exercise four views, inspection, ground movement and swimming depth, with desktop and narrow viewports. Receipts retain pitch, azimuth, roll, target and terrain margins.
- 27 report checks at 1280/390/320px pass without horizontal overflow.
- Exact inverse substitutions recover Pass67 source. All four runtime mirrors match SHA d5ec2f692e6b8306cab3b125d290bec3ce08d3926817e6b1d8a0db895d8ff4d3. Git index is preserved across adoption; a concurrent shared-index change during validation is recorded in index-at-adoption.json. Scoped whitespace checks pass.

## Validation details and limits

The arm-tip and grasp comparison fixtures apply the exact approved mantle edit to their historical reference, preserving whole-body equality checks. The G-edge fixture now supplies the extracted reach helper and eligibility filter. The historical eye fixture now restores the whole source before slicing the animal, recovering all original fingerprints on both Pass67 and Pass68. The Hunt historical region reverses only the approved Pass62 squeeze-input edit before its unchanged whole-region comparison. A mistaken local announcement expectation change was reverted; the paused-camera test remains byte-identical to its original. No live camera or eye assertions were removed.

An initial native candidate attempt timed out before mounting. A subsequent comparison correctly detected the intentional camera height change; its comparison was then updated to prove the terrain clamp and look target, while keeping study-camera equality. These incomplete attempts are retained in the work receipts and are not counted as successful native runs.

- Desktop Chromium and narrow viewport emulation, no physical-device, FPS or audio assessment.
- Controlled pickup scenarios reposition existing items and one existing reef rock.
- Camera edge-case coverage includes a controlled invalid starting camera position; source-extracted regression tests reproduce a valid-endpoint path across a ridge.
- Intermediate native simulation steps skip GPU draws.
- Study cameras match exactly; normal Follow camera height can increase under the intended terrain correction.

Changes remain local and uncommitted. Preview: http://127.0.0.1:49806/reports/cephalopod-hunter-enhancement/pass-sixty-eight/gallery.html
