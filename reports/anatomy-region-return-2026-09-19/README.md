# Return to a regional body view — 2026-09-20

Opening a regional structure in Blueprint now creates a Back to [region] view shortcut. Returning restores the prior system, diagram orientation, detail level, selected structure, Surface/Blueprint mode, model source, lighting, Focus model setting, region, camera angle, zoom, and body rotation. The original return point is retained when following additional Blueprint cards. Dismiss removes the shortcut without changing the current camera.

Only viewing context is restored. Notes and learning progress made during the detour remain intact. Saved return data is validated before use. Restoration waits for the appropriate model and scene; if the detailed asset cannot load, the simple body is fitted to the saved region while preserving the viewing direction.

Validation:
- 40 regression tests passed across anatomy_region_learning, anatomy_structure_browser, and anatomy_view_model_refinement.
- Two real-WebGL browser scenarios passed: exact restoration across systems and within an unchanged Blueprint scene; and recovery when the detailed GLB is unavailable.
- Verified keyboard return/dismiss actions, focus restoration, retained notes, saved camera position/target/rotation, light and focus settings, and phone layout.
- Scoped Axe checks of the return controls found zero violations in light, dark, and high-contrast themes. This is not a whole-application audit.
- Desktop and phone screenshots visually reviewed; no page errors or horizontal overflow in the tested phone layout.
- JavaScript syntax and scoped whitespace checks passed. Source and desktop runtime mirror hashes match. Temporary editing scripts were removed.

Evidence: desktop.png, phone.png, accessibility.json. The report directory uses the start date of this pass.
