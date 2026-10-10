# Universe Flight disk depth

The renderer gives generated spiral galaxies a small, smooth contribution with finite thickness. It supports a modest increase in continuous emission when the galaxy is viewed from the side. The spiral-arm and bar map retains its original world-space plane, and the existing points retain their positions and depth.

Spiral galaxies combine a stellar disk with a central bulge, and their arms can be difficult to see from the side. This provides the general morphology context for the change. The parameters below come from the procedural teaching model. [NASA: Types of Galaxies](https://science.nasa.gov/universe/galaxies/types/)

The spiral generator’s non-bulge disk population uses vertical standard deviation `0.012 R`, where `R` is the model radius. The new component uses the decreasing radial profile `exp(-2.5 r) × max(0, 1 - (r / 1.12)^4)^2`. Its radial second moment gives an oblate axial ratio of `0.03381552170253481`, so its vertical second moment matches that source parameter. The separate resolved galaxy sample retains its existing 700-light-year vertical spread. The projected profile is an exterior orthographic emission approximation; the implementation does not integrate a three-dimensional density along each viewing ray.

The component moves existing light after the atlas's tone mapping and bulge extraction. Integer subtraction stays within every existing RGB byte. Each restored RGB channel is normalized to its actual removed sum after quantization. Projected-area compensation is bounded by the finite axial ratio: its maximum is `29.572218604128178`. For the full exterior component, projected area multiplied by its gain equals the original face-on area.

This conserves the transferred input display RGB before camera styling, perspective rasterization, and clipping. It does not establish calibrated photometry. The source atlas's global RGB sum is `24,153,391`; the reconstructed face-on sum is `24,153,390.998328857`. The maximum reconstruction error is `1.8675111833709985` byte values in a color channel. The arms, their emission gaps, and the bar stay on the planar map; no dust-extinction model is added.

At an observer distance of `0.6 R` or less, the new contribution fades to numerical zero. It reaches full gain at `2 R`, with smooth interpolation between those distances. The extracted planar contribution is not restored during this fade, so nearby views can lose that small component's light. The existing points provide depth there. Exterior normalization must not be presented as conservation for every observer position.

The existing relativistic direction transform is reused. Its RGB tint and clamped `D^1.5` display gain remain visual heuristics; this change adds no spectral camera, physical radiative transfer, or galaxy dynamics.

| Region | Generated models | New disk ranges | Extra vertices | Extra buffer bytes | Projected updates when position changes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Neighborhood | 0 | 0 | 0 | 0 | 0 |
| Galaxy | 1 spiral | 1 | 384 | 9,216 | 2 total |
| Cosmic | 134: 88 spirals and 46 ellipticals | 88 | 33,792 | 811,008 | 222 total |

The new ranges grow the existing galaxy buffer and use three `vec3` uniforms, or nine float components. The existing diffuse draw includes the appended vertices. There are still two buffers, two textures, and two programs per renderer. Position changes upload the extra projected ranges; paused views and changes to look direction, lens, exposure, or quality reuse the cached geometry.

The successful CPU evidence is `candidate-host-audit.json`, bound to its executed driver by `host-audit-provenance.json`. It verifies nonnegative transfer, all input RGB integrals, unchanged point bytes, unchanged preexisting geometry prefixes, exact elliptical and alpha bytes, finite area compensation, and the nearby fade. The canonical baseline is `c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7`; the renderer candidate is `8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9`.

`candidate-test-patch-manifest.json` preserves the original test files and their exact patches. The staged tests retain the historical xyz/UV, point, bulge-alpha, elliptical, cloud, resource, and one-percent integral checks. Historical RGB samples now reconstruct both moved components with a documented `3.5`-byte budget: the prior `1.5`-byte bulge budget plus the measured disk budget. Both staged test files passed syntax checks. The executed native and focused product test reports are included below.

The initial VM audit failed an exact-zero assertion at the fade boundary, where floating-point subtraction produced `5.579169436570361e-31`. Its captured driver and failed outcome are retained in `build-candidate-capture.cjs` and `original-audit-outcome.json`. The successful independent audit accepts only numerical zero below `1e-20`; it does not claim the earlier run completed.

## Paused profile view

“Spiral disk profile” is the sixth scenic view in Galaxy Groups. It opens paused at 450,000 light years from the nearby spiral with a 32° lens and the target selected. Its chief ray is exactly perpendicular to the source disk normal. Existing scenic indices, flyby paths, clocks and free travel behavior are preserved. The fullscreen menu uses the same vista data.

## Executed checks

- Native rest-frame rendering: 20 matched before/after comparisons, using 40 saved PNGs. Side-view outer-light ratios range from 1.0605 to 1.0656 with a fixed exclusion of one quarter of the model’s projected radius. Face-on total light changes remain below 0.5%. Isolated elliptical images are exact.
- Relativistic rendering: the original β=.99 rear central ray emits visible light and retains matched camera, pause, math and resource checks. The original β=.9 rest-direction aim placed the object outside the view; that pair is retained as compilation and finite-input evidence only. A distinct β=.9 comparison uses the aberrated chief ray for the camera aim and requires visible emitted pixels.
- Controls: 7 browser workflows and 15 scoped accessibility audits pass, with 10 captures. Coverage includes the normal and fullscreen menus, 320-pixel phone width, short landscape, reduced motion, system colors and increased text spacing. Installed and served module bytes are pinned.
- Focused Vitest checks: 56 focused tests across 7 files pass in a diagnostic Node environment with a minimal canvas/event shim. The unchanged physics, stellar and bulge files retain their completed main-run coverage. Only the four affected texture/layout files were retried after their fixtures were adapted. The full DOM unit suite was not run in this pass; real DOM and WebGL checks are separate.
- Preview cards: all twelve were rebuilt and checked against the installed renderer, with exact original snapshots and matching web/desktop image bytes. Six galaxy/group images change; the three nebula and three stellar cards remain exact. A full elliptical card includes background spirals and can change even though the isolated elliptical does not.

The earlier attempts remain in the evidence. The initial native metric excluded 57.6 pixels at every range, which covered the whole distant range-12 source and yielded zero outer signal for both versions. The completed offline analysis uses image height, lens, range and model radius to set the same source-derived mask for both versions; it reuses the original 40 PNGs and launches no browser. A slow VM analysis was interrupted and its outcome retained; the successful host analysis has its own executed-driver hash.

The initial focused test startup tried to write Vite’s bundled configuration outside the writable repository. The next fork-based attempt lacked a mocked canvas capture method and had worker startup timeouts. The completed main thread-based run retained 51 passing assertions and recorded five failures in affected tests or a timed-out hook. The four-file retry fixes only those accepted texture/layout fixtures and increases hook time to allow the existing generation work. Every attempt is preserved.

The first affected-file retry ended before test output with Windows status `0xC0000409`. Its executed driver and empty log are retained. The subsequent retry uses one shared fork worker; it preserves the actual test assertions.

The first affected-file retry ended before test output with Windows status `0xC0000409`. Its executed driver and empty log are retained. The subsequent retry uses one shared fork worker; it preserves the actual test assertions.

## Limits and evidence

This enhancement improves the exterior diffuse disk. The legacy authored plane can still show clipping triangles when the observer is inside the disk; the new component is faded there, and these checks do not claim that existing limitation is fixed. The display remains a procedural teaching model with approximate light styling.

[Verification](verification.json), [source and capture hashes](evidence-manifest.json), [rendered contact sheet](native/contact-sheet.png), [browser checks](browser/vista-browser-check.json), [focused test coverage](unit/aggregate.json), and [preview card checks](previews/check.json). The source changes remain uncommitted.
