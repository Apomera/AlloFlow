# Perception Lab: inspect saved drawings

Enlarged recorded-trial drawings now offer **Inspect drawing**, with Fit, 150%, 200%, and 300% zoom. Saved A/B drawings share one viewing position and magnification in side-by-side, stacked, and Switch layouts.

## Using the inspector

- Choose a zoom level, then use the directional buttons or focus the drawing and press Arrow keys. Shift+Arrow moves farther; Enter centers; Home fits the complete drawing.
- Turn on **Pan drawing** to drag with a mouse or touch. Ordinary page scrolling remains available when Pan is off. Escape turns active Pan off before a second Escape closes the viewer.
- Trial selections, measurement guides, and layout changes retain zoom and position while canceling any active drag. Both drawings remain aligned when switching A/B.
- Closing the inspection controls preserves the view and disables Pan. Closing and reopening the enlarged viewer returns to Fit.
- The position readout and magnification badge make the current view clear. The original drawing stays inside a 5:3 viewport; scientific colors and complete SVG content are preserved.

Inspection is local to the enlarged trial viewer. It does not alter the live camera, saved observations, notes, independent trial/guide choices, or complete exported reports. Ordinary single-observation reviews and inline previews keep their existing behavior.

## Verification

- **37 new native Chromium groups passed**, covering all three matching experiments, actual projected SVG geometry, shared zoom and clamping, native mouse/touch, keyboard and focus, drag cancellation, stale/hidden/invalidated studies, live-camera isolation, and unmount cleanup.
- **97 existing viewer groups passed**: paired 32, single 28, and recorded Switch 32 + edge 4 + report 1.
- **84 baseline scene/model/measurement cases passed**. Engine API, defaults, metadata, scene construction, and measurements are unchanged. Source and desktop copies match, and all **562 catalog entries** agree.
- Responsive checks cover 320–1600px widths and 200% text, with 21 screenshots and 13 accessibility audits containing no reported violations. Dark, contrast, forced-color, and RTL views were checked.
- A native HTML download retains all six complete original drawings and full notes after local zoom, pan, trial, and guide changes.
- The single and paired viewer regressions now measure the projected drawing with the SVG screen matrix. These replace outer-box width assumptions that counted letterboxed space; they verify complete Fit framing, centering, orientation, real enlargement, and equal A/B scale where applicable.
- Existing Vitest/jsdom DOM suites remain unexecuted because their worker stalls before collection. Native browser and pure-engine results are independent evidence.

Source SHA256: `3e4a8c970ecc57c635a249c78c0f355786a5bfce4e248080fb8318d5a40b8295`.

## Evidence

- [Desktop controls](browser/recorded-inspector-1600-16-controls.png)
- [Desktop drawing](browser/recorded-inspector-1600-16-drawing.png)
- [Phone controls at 200% text](browser/recorded-inspector-390-32-controls.png)
- [Phone drawing at 200% text](browser/recorded-inspector-390-32-drawing.png)
- [Dark view](browser/recorded-inspector-dark.png)
- [Complete exported report](browser/recorded-inspector-complete-comparison-report.html)
- [Verification summary](verification.json)
- [Browser evidence manifest](browser-evidence-manifest.json)
- [New native browser results](browser/recorded-inspector-browser-results.json)
- [Paired-viewer regression](paired-viewer-browser-results.json)
- [Single-viewer regression](drawing-viewer-browser-results.json)
- [Switch regression](switch-browser-results.json)
- [Switch narrow-text checks](switch-edge-browser-results.json)
- [Switch report checks](switch-report-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Native regression runner](../../../dev-tools/perception_lab_recorded_inspector_qa.cjs)
- [Pure validator](validate-perception-recorded-inspector.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-recorded-inspector/validate-perception-recorded-inspector.cjs`. The included baseline is the preceding stationary saved-drawing comparison version.

No staging or commit was performed. All changes remain uncommitted.
