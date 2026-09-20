# Machine Lab pass 35: camera control panel

The workshop camera now has a dedicated panel with separate Views, Rotate, and Zoom groups. Controls have at least 40-pixel height and a visible keyboard focus outline. Side and Close show when their exact preset is selected; rotating clears that selection. Responsive wrapping keeps all controls visible on narrow phones.

Validated keyboard preset selection, camera angles, pose preservation, custom-angle deselection, reset, button sizing, and horizontal overflow across all six benches at 1150, 390, and 320 pixels in light, dark, and high-contrast themes: 270 browser checks passed and 12 screenshots captured. Visually reviewed the examples below.

All 255 unique UI regression tests passed across the recorded runs. The first run exposed a brittle fixed-length HTML assertion, now replaced with inspection of the actual camera group. Three initial timeouts and one later timeout passed on rerun; the last isolated check completed in 268ms. No simulation geometry changed in this pass. Source and desktop copies are identical and JavaScript syntax validation passed.

- [Phone controls](pass35-light/camera-windlass-320.png)
- [Dark desktop](pass35-dark/camera-lever-1150.png)
- [High-contrast phone](pass35-contrast/camera-windlass-390.png)
- [Validation details](pass35-summary.json)

Changes remain local; no commit, push, or deployment was performed.
