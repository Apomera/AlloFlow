# Cephalopod Hunter — Pass67

Kelp uses opaque depth-tested surfaces while retaining the existing thin-leaf sunlight shader. Closed floats no longer show rear triangles, and overlapping leaves occlude correctly. Geometry, animation, plant placement, camouflage metadata, random stream, and resource budgets remain unchanged.

Held-E marine-snow gathering now needs stationary input and the existing 250ms recovery window after damage. The same partial progress resets used by tap Forage apply to held input. Reach, cover checks, gathering duration, rewards and tap target lock are preserved.

## Validation

- 48 tests in 8 focused files passed; exact inverses recover the accepted Pass66 source.
- 8 native rendering checks and 7 native feeding checks passed with zero page/console errors or leaked GL resources.
- Six matched views: Hunt camera, kelp front/back/grove, later motion and 390px viewport. Candidate cameras, world actors, seeded state, lights, plant buffers and GPU object counts matched the baseline.
- Actual draw-time WebGL state confirms kelp depth writes are enabled and blending disabled; existing tissue lighting shaders compile and link.
- Live Reduced motion, pause, motion, resize and teardown were exercised.
- 12 gallery checks at 1280/390/320px passed with no horizontal overflow.
- Four simulator mirrors match SHA 83772f68e059ef24f75ab9e5e329db9e344c23f347d03e9b9b5aec3f0c150189. The shared index is unchanged; scoped whitespace check passed.

## Verification limits and fixture corrections

Native desktop Chromium; narrow viewport emulation does not establish physical-device performance. Audio disabled; intermediate simulation frames skip GPU draws. The damage check sets the existing hit timestamp, without a simulated predator bite.

The old plant-geometry fixture lacked the renderer now used by actual plant construction and searched for an obsolete pause guard. It now supplies the same renderer stub as adjacent tests, executes the current positive-dt guard, and verifies zero-dt freezing. Two legacy material expectations were updated for solid kelp depth. All geometry assertions remain. The initial fixture failure is retained in cpu-1-initial.log.

Candidate rendering initially hit a harness startup timeout with no browser error. The successful rerun uses unchanged simulator code. A receipt comparison was corrected to JSON-normalize undefined optional light fields before comparing against the saved baseline. These attempts are not counted as passing runs.

A disk-full error interrupted the first source write; the exact baseline was restored from the saved backup, then all runtime copies were adopted through verified temporary files and checked by hash. Only regenerable probes and hash-verified duplicate scratch screenshots were removed; all report images and accepted sources were preserved. New immutable gallery images use local hard links to the verified captures to avoid duplicate disk storage.

Changes remain local and uncommitted. Preview: http://127.0.0.1:54410/reports/cephalopod-hunter-enhancement/pass-sixty-seven/gallery.html
