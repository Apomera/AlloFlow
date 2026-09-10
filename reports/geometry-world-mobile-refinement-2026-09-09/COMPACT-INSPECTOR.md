# Compact phone measurement inspector

The phone inspector now keeps length, width, height and occupied volume visible above a native **Explore measurement details** disclosure. The equation, surface-area analysis, layer explorer, representation tools, material breakdown and physical build card remain available inside it. Desktop keeps these details expanded.

The inspector uses the workspace’s pine and ivory palette, with 44px Close and disclosure targets, explicit focus styling and high-contrast overrides. Its expanded contents scroll while Close stays in the sticky header. Root removed the obsolete builder height override that had clipped the phone inspector.

Opening or closing details changes only local presentation state. An explicit measurement, lesson change or closed/reopened inspector starts compact. Equivalent polling results and connected-build edits preserve the open state and the focused control; the reset keys use the explicit measurement history timestamp, rather than the replaced result object or changing dimensions.

Incomplete measurements retain their partial-result alert and now distinguish counted blocks from occupied cubic units. A fractional block count is no longer mislabeled as cubic volume. Solid-prism multiplication and composite bounding-box subtraction keep their existing semantics.

Validation: **99 unique tests passed** across `inspector-tests.json` and `inspector-display-retry.json`. The first run passed all 11 new inspector cases and all 61 keyboard cases; three existing settings/HUD cases hit timing failures under host load. Only those 3 cases were rerun with a 30s ceiling and passed unchanged in 486ms, 309ms and 954ms. Both runs are retained. The new mounted React suite is `tests/geometry_world_mobile_inspector.test.js`; it exercises native disclosure state, focus persistence, live updates, explicit measurement resets, retained selection, layer controls, desktop expansion and fractional/composite accuracy. Existing display-control and keyboard-access suites run alongside it. Canonical core and the desktop mirror were checked for syntax and byte equality after the edit.

Actual viewport screenshots and hit-target checks are supplied separately by the coordinated mobile QA pass at 320×700, 390×844, 844×390 and 1440×900. This implementation pass did not launch a browser or modify rendering, camera, geometry, collision, history or STL export behavior.
