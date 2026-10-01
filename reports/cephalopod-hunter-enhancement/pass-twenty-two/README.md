# Pass 22 — coconut and bottle shelters

This pass replaces the coconut's overlapping primitives with a connected, open bowl and gives the glass bottle a real neck opening, interior walls, rolled mouth and thick base. It also fixes dropped shelter placement so cover reaches the terrain before early predator AI checks whether the player is sheltered.

The coconut has a dark textured cortex, pale cut edge and recessed bowl in one opaque mesh. The bottle uses two independently owned meshes: translucent green glass walls and an opaque lip/base finish. Glass uses ordinary alpha blending with depth writes disabled; no new texture, shader or render pass is introduced.

The original spawn randomness, actor counts, carry poses, movement penalties, camouflage bonuses, shelter reach and strict lifetimes remain unchanged. The bottle keeps its existing sideways pose and partial sand burial, with its open mouth clear of flat terrain. Retrieval of already dropped cover is deferred; this pass does not redesign deployment or remaining lifetime.

## Same-frame shelter protection

The original drop branch wrote a fixed Y of 0.32, then corrected the shelter to `terrainHeight(x,z)+0.12` later in the frame. On negative terrain, early predator AI could therefore see an exposed player even after an accepted G drop.

The corrected baseline browser scenario reproduced that failure with a genuinely spawned barracuda. A positive no-drop control reduced health from 100 to 65. After the hit cooldown, an accepted G drop still allowed health to fall from 65 to 30: the original placement remained at Y 0.32 during the bite check, although later grounding moved it to approximately Y −4.379. Bite eligibility remained true and IN DEN was absent in that frame.

The fix writes the existing terrain-relative height immediately. Pickup, protection radius/height, predator damage and lifetime rules are unchanged.

## Resource comparison

Counts below are per actor. Geometry bytes include all vertex-attribute and index buffer payloads, not total renderer or browser memory.

| Model | Meshes | Unique materials | Vertices | Triangles | Geometry bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Coconut before | 9 | 8 | 629 | 916 | 25,624 |
| Coconut after | 1 | 1 | 1,346 | 2,688 | 64,584 |
| Bottle before | 3 | 2 | 204 | 128 | 7,296 |
| Bottle after | 2 | 2 | 1,442 | 2,560 | 67,272 |

Across the four coconuts and three bottles, mesh count falls from 45 to 10. Geometry buffer payload rises from 124,384 to 460,152 bytes. The additional triangles form actual cavities and wall thickness; the lower mesh count does not imply a reduction in every resource cost. Each new mesh owns its geometry and material independently.

## Confirmed validation

- Final runtime SHA256: `b34c982127743a9d1f47ed392d0d48d09fa6adba588560bb178ab5e180e5d369`. Canonical source and all three runtime mirrors match.
- Final CPU run: **99 distinct cases across 19 files passed**, actual exit 0. Candidate checks are not added again to this total.
- Geometry coverage includes actual openings and thickness measured by rays, connected triangle boundaries, winding, finite unit normals, bounds, ordered spawn randomness, strict expiry and independent resource disposal.
- Final native browser coverage: **17 distinct cases passed across two batches** (15 combined cases plus 2 mission cases), both actual exit 0, with zero skipped, unexpected, flaky or retried cases and no global errors. The low/balanced model cases passed actual shader linking and PNC buffer checks, glass/opaque blend and depth-write checks, independent lifecycle/disposal, and phone layout assertions.
- The corrected grounding case completed in 116,681ms. Its positive no-drop control still reduced health from 100 to 65; the accepted drop then preserved health at 65, set bite eligibility false and immediately reported IN DEN. The placement write was exactly Y `-4.379020242974084`, equal to authoritative terrain plus 0.12. Its recorded maturity ran from tick 1 to tick 1,203 at 64×64 and restored the original 440×520 renderer.
- The genuine baseline browser defect reproduction is retained in `browser-initial-grounding-physics.json`. It completed with the four expected soft assertion failures after all setup and positive-control assertions passed.
- Earlier attempts remain recorded separately: an expensive spawn-maturation timeout, then a fixture precondition that incorrectly treated the coarse rendered seabed as the exact physics floor. The corrected fixture extracts the selected source's actual terrain function and records both authoritative and rendered heights. Neither earlier attempt is counted as gameplay defect evidence.

The grounding fixture preserves all 1,202 real 50ms maturation updates and GPU renders. Only that long maturation interval uses 64×64 rendering; it restores the original 440×520 renderer before the paired gameplay checks. The separate model cases use the normal full-size harness.

## Final visual review

All 17 native cases, including the two mission regressions, have passed. The passed low/balanced model cases cover actual linked programs, position/normal/color bindings, correct native blend/depth-write state, stable resources, carry/drop/countdown behavior, pause/inspection/reduced-motion preservation, phone layout and exactly-once cleanup.

All **10 final fixed-view model captures completed and were visually accepted**. The capture process exited 0 with errors `[]`; its four warnings were ReadPixels warnings only. Root reviewed all ten views. The model reviewer independently accepted all five coconut views against their initial counterparts; the environment reviewer did the same for all five bottle views.

The strict comparison retained the same actors, phases, state, seed, cameras and 20 counted simulation ticks. No actor or scenery was moved or hidden; only the pause veil was hidden for the images. These fixed natural views complement the relocated diagnostic actors used in the native GPU tests.

The models still have visible stylistic limits. Coconut fibers are broad and stylized, the pale bowl is smooth, and the cut edge is rounded and wavy. The bottle shows angular bands from nested alpha surfaces and a strong boundary at its opaque green base/disc; its original partial burial remains. The absence of a native contact shadow means these images do not independently prove floor contact. Geometry and gameplay grounding are verified by the CPU and counted-clock checks.

Root verified an HTTP 200 preview serving the final `b34c9821…` runtime. Opening it in Codex was queued; that is not claimed as a completed UI navigation. See `validation-notes.md` for detailed retained evidence and fixture limits.

| View | Coconut | Bottle |
| --- | --- | --- |
| Oblique | [Coconut oblique](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/coconut-oblique.png) | [Bottle oblique](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/bottle-oblique.png) |
| Opening | [Coconut cavity](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/coconut-cavity.png) | [Bottle mouth](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/bottle-mouth.png) |
| Surface | [Coconut rim](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/coconut-rim.png) | [Bottle side](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/bottle-side.png) |
| Base | [Coconut base](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/coconut-base.png) | [Bottle base](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/bottle-base.png) |
| Phone | [Coconut phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/coconut-phone.png) | [Bottle phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/cephalopod-hunter-enhancement/pass-twenty-two/bottle-phone.png) |

## Working-tree ownership

The user requested no staging or commit. This pass's owned changes remain unstaged and uncommitted. A separate ScaleExplorer owner committed its unrelated work during this turn; the observed repository HEAD is `ea9138e5d74fe2ec7c166c19ed0dabb056869cc5`. That commit is not this pass, and the unrelated owner's work was preserved.
