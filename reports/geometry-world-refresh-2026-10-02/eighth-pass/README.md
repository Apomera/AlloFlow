# Geometry World Eighth Enhancement Pass

Date: 2026-10-05

Position readings and measurement comparisons are clearer, Larger text covers the coordinate controls, and reopening the tool finder cannot be interrupted by an obsolete focus request.

## Changes

- Position distinguishes camera coordinates from targeted block cells, labels X/Y/Z and grid units, and retains the existing flooring and facing calculations. Standard labels are at least 13 px; Larger labels are 15 px and coordinate values are 17 px.
- Spoken coordinates has an explicit On/Off state, immediate local refresh, and screen-reader announcements for both transitions. Hiding the visual panel does not reset the announcement setting or learner work.
- Position has internal scrolling and a sticky disclosure control. Short desktop windows initially collapse it. Responsive capacity reserves space for building controls, fixes landscape availability, and temporarily clears conflicting helper cues during inspection. Short touch portraits restore their building controls when Position closes.
- The notebook shows whether the latest occupied volume and exposed surface area are greater, smaller, or unchanged, with cubic versus square units and singular units for a one-unit change. Exact surface changes remain unavailable when either measurement cannot support them. Surface-efficiency commentary still requires equal occupied volume.
- The collapsed Studio launcher is hidden while the notebook is open, preventing it from covering comparison rows. Studio state is retained; the launcher returns after active inspection panels close.
- Finder focus requests carry a generation token. Escape/reopen and navigation/reopen invalidate older queued focus at both animation frames, retaining the existing engine, dialog, and transition guards.

Measurement algorithms, scoring, answer drafts, retrieval grading, project data, and the saved workspace preference schema are unchanged. The public module copies match the source copies.

## Verification

**222/222 regression tests passed across eight unique suites**, with actual exit code 0 and no failed or pending tests: 19 coordinate clarity, 56 measurement notebook, 20 focus guard, 15 builder navigation, 55 workspace preferences, 12 mobile inspector, 24 native-form keyboard, and 21 inspector clarity. Overlapping and incomplete earlier runs are not added to this count.

**145/145 browser checks passed** in four final workflows:

- [90 Position checks](coordinate-browser-report.json): desktop, shorter desktop, phone, narrow and short touch phones, landscape, narrow mouse input, contrast mode, and Windows forced colors. Both text sizes, unobstructed panel bounds, scrolling, native controls, keyboard isolation, retained preferences/work, and a moving nonblank WebGL scene are checked.
- [30 notebook checks](notebook-browser-report.json): desktop and narrow touch Larger layouts, ten actual-measurement comparison pairs per profile, independent surface/volume directions, fractions, unavailable surfaces, protected learner work, reflection return, reachable close controls, and Studio restoration after inspection.
- [14 finder checks](finder-browser-report.json): real queued-frame reopen races, keyboard search, geometry preservation, and desktop/narrow layout.
- [11 guided-lesson checks](lesson-coordinate-browser-report.json): native Standard/Larger Position controls in a 1024-by-600 surface-area lesson, readable camera coordinates, scrolling, and unchanged lesson, geometry, question drafts, scores, and results. Target coordinates and compact helper cues are absent in this lesson baseline and recorded as not applicable.

The final workflows include **22 scoped accessibility audits with zero violations** and retain 25 screenshots. Representative desktop, phone, landscape, narrow-mouse, notebook, finder, and guided-lesson screenshots were visually inspected. Private QA browsers/servers and test sessions are closed.

See [final source and preview verification](final-verification.json) for JavaScript syntax, source/public SHA-256 parity, scoped whitespace checks, complete test-report counts, and live served-module hashes.

## Diagnostics and Limits

Earlier diagnostics are retained, not counted as clean final runs. Browser review found and repaired short-phone clipping, legacy landscape hiding, Larger-text specificity conflicts, placement/build-control overlaps, and the floating Studio notebook obstruction. Test fixtures were corrected for body-scoped live announcements, already-removed notebook ARIA, capped ten-record history, established fraction notation, and closing all active inspectors before expecting Studio to reappear. Finder race baseline tests failed before the generation guard. One incomplete multi-suite run exited nonzero despite a partial passing JSON report and is excluded.

An earlier coordinate run finished its checks but stalled during browser shutdown. Its verified private helper was closed; the final harness closes the private server first and bounds browser shutdown while requiring a confirmed disconnection.

These are local React/Three.js harness checks, not deployed-host, physical-device, or WebXR validation. The hidden local preview remains available at [Geometry World](http://127.0.0.1:61309/?mode=home).
