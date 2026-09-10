# Accurate building previews

The previous hover/break-target feedback always used an unrotated unit cube. Actual-source inspection showed a half slab and quarter wedge ending at Y=3.5 highlighted through Y=4.01, and an eight-triangle wedge represented by a twelve-triangle box. The placement ghost used the correct shape but inflated its scale by up to 2% while pulsing.

The hover now uses an owned clone of the target's actual geometry and an owned `EdgesGeometry` outline. Its two overlay objects/materials persist while their geometry is refreshed only when the source geometry, position attribute/version, or index attribute/version changes. Changes to AO color attributes and target transforms do not rebuild the buffers. The overlays copy the target world transform relative to the scene, preserving fractional offsets, rotations, nested parents, nonuniform scale, and placement-pop animation. The fill uses polygon offset to stay legible without expanding its geometry. Both overlays are decorative, skip picking, and leave construction resources untouched.

The placement ghost remains at unit scale in valid, blocked, reduced-motion, and ambient-disabled states. Its optional movement is opacity only. Hover fill and edge opacity both honor reduced motion and ambient motion being disabled. Protected-target red and the existing quieter fill during measurement remain. No-target, inactive, and Showcase states still hide the previews. Existing teardown disposes the independent hover resources and clears `_hoverGeometryState`, releasing its source geometry/attribute references.

Production edits are limited to the core hover/ghost section, decorative flags, and the existing hover teardown cache release, plus the identical desktop mirror. No changes were made to actual placement transforms, eligibility, construction geometry/materials, collision, history, STL, or the new retained-selection corner markers.

## Verification

`accurate-preview-tests.json`: **156 passed, 0 failed, 0 failed suites**. This includes 43 new actual-THREE preview tests, 24 placement transaction tests, 19 rotated-face placement tests, 55 visual pipeline tests, and 15 visual-state lifecycle tests.

The new cases compare world-space hover vertices and edge geometry for all four shapes at all four rotations. They compare target position/quaternion/scale, user data, material JSON, every geometry attribute and index, undo/redo, placed count, and exact selected STL hash before and after preview. Further cases cover transformed scenes/nested parents/nonuniform pop scale, 60 unchanged/transform-only frames reusing owned geometry, buffer invalidation, target switching with owned-only disposal, no-target/inactive/Showcase hiding, protected and measurement feedback, steady motion-disabled opacity, real teardown, and ghost geometry matching actual placed geometry in both allowed and blocked states.

`accurate-preview-diagnostic.json` is a bounded actual-source Node/THREE check for all 16 shapes/rotations, including world-space vertex deviation and 60-call geometry reuse. It is not a frame-rate or screenshot-quality measurement. Parent browser QA is responsible for matched rendered review. Canonical core and desktop mirror syntax/parity passed after the changes.
