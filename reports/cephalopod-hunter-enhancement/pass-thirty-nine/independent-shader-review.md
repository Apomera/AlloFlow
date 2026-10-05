# Independent shader review

Reviewed by the read-only pass39 shader-review agent. The signed `pow` in the first candidate was undefined for negative lower-body coordinates; the final candidate uses a bounded temporary multiplied by itself. No other numerical defect was identified.

Three r128 contains all injection anchors in the required scope and order. Surface detail is evaluated before roughness/metalness and standard lighting. Constant per-triangle part IDs match the actual skin, iris, pupil, fin and tail spans. Iris geometry is an annulus, avoiding the zero-vector `atan` case on actual fragments. Divisors are fixed positive constants and smoothstep edges are ordered.

Continuous-coordinate footprints fade scales to zero at 0.72 lattice units per pixel and iris fibers by 0.13 normalized eye units per pixel. The custom fallback omits fine scales, iris fibers and custom derivative calls. Broad gill and mouth cues use derivative antialiasing when supported.

The fallback concerns this custom detail only. Three r128's existing standard lighting itself uses derivatives, so these checks do not establish support for an entire WebGL1 device without the standard derivative extension. Native validation uses the actual supported browser context; no such unsupported-device claim is made.

The review agent performed no edits, tests, browser or GPU work. Root owns integration and execution.
