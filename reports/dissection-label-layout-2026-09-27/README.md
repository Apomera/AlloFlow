# Dissection Lab: label layout and perch proportions

## Changes

- The perch keeps the proportions of its existing lateral artwork. The generic lateral transform previously squeezed that already side-facing drawing to 66% width. Drawing, landmark placement, and pointer hit testing continue to share one transform.
- Labels wrap onto up to three lines. Card widths use the same font weight as the displayed text, including bold selected labels.
- Label columns stay apart and within the tray. Placement leaves room around hotspot markers and uses the available upper-right space in Essentials.
- Connectors have stronger contrast and scale with the label size so displaced labels remain visibly attached to anatomy on small screens.
- Touch users can read a selected structure's full name across lines instead of the former fixed 19-character abbreviation. Very long descriptions still use an ellipsis; the structure panel retains the full description.
- The Labels toggle now hides default-visible labels on its first click, including sessions without an explicitly saved label preference.

## Screenshots

- [Perch lateral view and selected label](perch-lateral.png)
- [Phone: selected heart label, dorsal](heart-label-dorsal.png)
- [Phone: selected heart label, ventral](heart-label-ventral.png)
- [Phone: frog labels and exposed hotspots](frog-phone.png)
- [Full specimen gallery](../dissection-visual-presentation-2026-09-27/README.md)

## Verification

Browser checks measure real canvas text and card coordinates after transforms, click the visible perch label, check the default Labels toggle, and ensure phone labels leave frog hotspot centers exposed. The existing specimen gallery additionally checks all seven specimens, phone layout, illumination boundaries, and Advanced/fullscreen guidance.

- Combined browser run: **16 passed** (`final-browser-tests.log`).
- Final label run: **5 passed**, including both real touch-device orientations (`verified-browser-tests.log`). The fixture uses the app's mobile viewport setting; its drawing recorder distinguishes numbered marker paths from label cards.
- Final focused unit run: **109 passed** (`unit-final-results.json`). An earlier concurrent run timed out in the paused-canvas lifecycle test and then failed its following test; rerunning the suite after the browser work completed passed both.
- Both JavaScript copies pass syntax checks, and the scoped diff passes whitespace checks.
- Canonical and desktop renderer copies match byte for byte.
