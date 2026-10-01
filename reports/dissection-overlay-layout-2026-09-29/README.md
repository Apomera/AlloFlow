# Dissection Lab overlay clarity

September 29, 2026

Selected anatomy now gets space to remain readable when the specimen is zoomed, panned, or mirrored. Inspection captions stay inside the canvas and consider the selected name's measured bounds. A dashed leader connects captions that move from their anatomical anchor.

The scale and anatomical-axis panels choose positions around painted anatomy text and the other fixed panels. Placement considers the layer footer, guided prompt, physiology slot, instrument bay, and fullscreen system key. Instrument contact feedback uses the same actual panel bounds and gives selected text and fixed panels priority.

The anatomical-axis heading and endpoint labels use larger reading-size text. Its width follows the measured heading, and its height and line spacing accommodate that text.

## Visual review

| Previous 320-pixel layout | Updated 320-pixel layout |
| --- | --- |
| [Scale panel covering the depth caption](before-phone-320.png) | [Caption beside the name, with clear feedback and scale](phone-320.png) |

- [Dorsal view after pan](phone-dorsal.png)
- [Ventral view after pan](phone-ventral.png)
- [Lateral perch at the canvas edge](perch-edge.png)
- [Fullscreen view](fullscreen.png)

## Verification

Browser checks compare published layout bounds with actual painted rectangles, verify selected name/caption clearance, check the scale and axis panels against other panels, measure the painted axis heading, and preserve saved observations. Existing cases cover label clicks, mirrored views, zoom, and marker alignment.

All 109 focused regression checks passed on the completed renderers. The two renderer copies match byte for byte and pass JavaScript syntax and scoped whitespace checks.

All 24 distinct Chromium scenarios passed across the main run and a targeted retry. The main run passed 23 cases and timed out while closing the remaining case's browser context; that case passed separately. All nine affected overlay/contact cases then passed on the final placement, including the measured heading size and 320-pixel title clearance.

- [Final overlay and contact checks](overlay-final-tests.log)
- [Browser run tail](browser-run-tail.log)
- [Ventral context teardown recheck](ventral-recheck.log)
- [Focused regression results](unit-results.json)
- [Verification summary](verification.json)
