# Perception Lab: enlarged recorded drawings

Updated October 4, 2026. Changes are left uncommitted.

Revealed active studies, saved-study reviews, and A/B comparison previews now offer **Enlarge drawing**. The recorded drawing opens in a native modal viewer that uses nearly the full window width and can be scrolled to inspect the complete note and recorded details.

The viewer starts with the originating preview's selected trial and guide visibility. Choose any of the three actual recorded trials or toggle measurement guides; the same choices remain in that preview after closing. A and B keep independent choices. The viewer includes the original drawing geometry, surroundings, impression, valid date, recorded values, and full note. It does not change notebook records, live experiment settings, pinned drawings, or exported content.

The native modal makes the surrounding page inactive, and Tab and Shift+Tab wrap through the viewer controls. The heading receives initial focus; **Close enlarged drawing** and Escape return to the originating control or the notebook heading if that control is no longer available. Escape closes the viewer without collapsing the expanded workspace. The viewer follows the selected theme and system forced colors while preserving the drawing's original colors and white background.

Only complete, consistent, revealed studies can be enlarged. The viewer rechecks the originating preview's identity, learner profile, and current study availability. Changing saved content, removing or hiding a trial, invalidating its comparison, closing its review, or switching profile removes the enlarged drawing. Finder filters and unrelated live draft edits preserve the open viewer.

## Verification

Final verification will be recorded in [validation.json](validation.json).

New coverage lives in `tests/perception_lab_drawing_viewer.test.js` and `dev-tools/perception_lab_drawing_viewer_qa.cjs`. Browser checks exercise native modal focus and cancellation, actual SVG geometry, responsive widths, themes, enlarged text, safe note rendering, state preservation, and invalidation. Existing Perception tests and recorded-preview browser assertions remain unchanged.
