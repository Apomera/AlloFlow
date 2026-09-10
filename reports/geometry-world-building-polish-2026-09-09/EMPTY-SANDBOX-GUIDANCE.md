# Empty sandbox guidance

The existing dock introduction now explains the first placement: **Aim at the ground and press B to add your first block**, or **tap Place** when the core exposes touch controls. The existing sandbox-open announcement uses the same control-specific instruction, including for a collapsed phone dock. No overlay or control was added.

After a selectable student block exists, the introduction returns to the existing Select build guidance. A retained selection keeps its existing selected-creation message. Removing the final student block restores the first-block instruction, even if the cumulative placement counter is still positive.

Presence is checked with a short-circuit `.some(isStudentBlock)` on the engine’s existing cached block array in the existing 250ms builder refresh. It does not infer floor size, count lesson blocks, add a timer, traverse the scene graph or publish idle React updates. The predicate follows the existing builder definition of selectable student blocks.

Only builder source and its desktop mirror changed. Canonical and mirror parse and match byte for byte. `empty-guidance-tests.json` records the new mounted guidance suite together with the existing retained-selection suite. Cases cover keyboard/touch mode, irregular or replaced floors, imported blocks without placement history, empty/build/empty transitions, selected-state preservation, short-circuit work, idle renders and sandbox-open announcements. The array-transition tests validate the UI response; separate coordinated browser QA exercises actual B placement and Ctrl+Z through the core.

Selector for QA: `.gwe-builder-intro[data-gwe-build-guidance="empty"]`. Other states are `select` and `selected`. This implementation task launched no browser and made no core, geometry or Print Lab handoff changes.
