# In-place regional reading — 2026-09-19

Regional structure cards now offer Read more / Read less disclosures. The preview remains visible and the disclosure supplies the remaining authored description, plus existing contextual detail for older learner levels. Short descriptions without additional content do not get an empty disclosure. Cards have clearer title weight and align independently when one explanation expands.

Reading does not select a structure, switch systems, or change the camera. The Blueprint action remains separate. Disclosure state survives ordinary lighting rerenders and returning to the region in the same viewer session. No new medical facts or assets were added.

Validation:
- 36 regression tests passed across anatomy_region_learning, anatomy_structure_browser, and anatomy_view_model_refinement.
- The real-WebGL anatomy-region-reading browser scenario passed.
- Verified keyboard expansion/collapse and focus, exact camera snapshot preservation, stable canvas identity, unchanged selection and notes, disclosure retention, and subsequent Blueprint navigation.
- Targeted Axe scans of the expanded panel found zero violations in light, dark, and high-contrast themes. This is not a whole-application accessibility audit.
- Desktop and phone screenshots visually reviewed; no phone horizontal overflow or browser page errors.
- The initial browser assertion included CSS-hidden label text; it was corrected to check the accessible name and the complete scenario passed on rerun.
- Syntax, scoped whitespace, and runtime mirror checks passed. Temporary edit scripts were removed.

Evidence: desktop-panel.png, phone-panel.png, accessibility.json.
