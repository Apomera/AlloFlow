# First Response Lab — clearer hand surfaces

## Improvements

- **Calmer hand shading:** reduced diffuse washout and broad specular highlights retain the palms' and fingers' curved surfaces. Nails keep a distinct, quieter finish.
- **Readable high-contrast hands:** dark contours derived from the rendered surface normals separate overlapping palms, fingers and wrists. They follow the camera and the existing geometry, adding no meshes or draw calls.
- **Consistent motion and contact:** the same treatment follows the adult, child and infant hands through release and compression, one/two-hand choices, camera changes and resizing.

The changes are confined to rescuer skin and nail materials. Patient materials, teaching-marker colors, geometry, hand alignment, camera fitting, clinical behavior and saved learner state retain their prior behavior. All source outside this material treatment is byte-identical to the starting snapshot, and canonical/public sources match.

## Visual review

- Normal views retain midtones across the palms and fingers instead of broad pale highlights.
- High-contrast views separate the previously merged stack while keeping white hand surfaces visible.
- Some fine contours appear dotted at phone resolution. Review found no large black gaps or falsely disconnected wrists; wider contours would emphasize joins excessively.

### Captures

- Adult: [normal oblique](adult-standard-oblique.png), [normal side](adult-standard-side.png), [contrast oblique](adult-contrast-oblique.png), [contrast side](adult-contrast-side.png)
- 320px child: [normal oblique](phone-child-standard-oblique.png), [normal side](phone-child-standard-side.png), [contrast oblique](phone-child-contrast-oblique.png), [contrast side](phone-child-contrast-side.png)
- [Infant contrast side](phone-infant-contrast-side.png)
- Matching prior-view comparison: [previous normal](../firstresponse-contact-exploration/adult-oblique-contact-compression.png) / [refined normal](inspection-regression/adult-oblique-contact-compression.png); [previous contrast](../firstresponse-contact-exploration/phone-heel-side-app-contrast.png) / [refined contrast](inspection-regression/phone-heel-side-app-contrast.png)

## Validation

**73 unit cases passed**: surface clarity (11), contact exploration (25), reference clearance (12), hand alignment (12), and arm contours (13). Compact fingerprints confirm exact pre-change hand vertices, normals, indices and local poses for all three ages. The tests also cover material ownership, opaque depth behavior, shader integration, phase stability and resource reuse.

**Four native Chromium workflows passed** across the existing contact-exploration and new surface-clarity suites. They verify actual rendered hand framing and contact, keyboard/camera controls, resizing, age/hand changes, preserved learner state, accessibility, shader errors and renderer cleanup.

Two matched contour on/off/on comparisons measure dark detail appearing inside previously white hand regions, with same-input raster noise calibration and unchanged surrounding pixels:

| Capture | White-to-dark hand pixels | Largest connected feature | Changed exterior pixels |
| --- | ---: | ---: | ---: |
| adult-contrast-oblique | 942 | 116 | 0 |
| phone-child-contrast-side | 169 | 72 | 0 |

The screenshots use local Chromium with software WebGL. Initial fixture failures are retained for [the capture selector](surface-browser-selector-diagnostic.log) and [keyboard focus after screenshots](surface-browser-focus-diagnostic.log). The corrected fixture waits for restored frames and verifies visibility/focus before sending the key. Final checks kept the original pixel, geometry and keyboard requirements.

[Validation and hashes](validation.json) · [rendered measurements](surface-metrics.json) · [inspection regression measurements](inspection-regression/contact-metrics.json)

## Delivery

**Uncommitted and unstaged. No push or deployment.** Prior uncommitted First Response enhancements and other agents' files are preserved.
