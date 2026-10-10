# Raindrop ray lab readability

The two ray diagrams now have dark optical frames, visible incoming and internal rays, clearer reflection markers and larger captions. Red and violet exit paths also have different line patterns. The existing ray geometry and scientific descriptions are preserved.

## Layout

The open lab responds to its actual width. At 560 CSS pixels, primary and secondary paths sit together and the dark-band explanation spans the next row. Narrow panels stack all three. The compare-exits explanation uses the full width. Diagrams reach 240 by 180 CSS pixels with a 160 by 120 minimum in the reviewed matrix. Captions and caveats use at least 13px text, headings use 16px, and the disclosure control uses 15px text and a 44px minimum height. Compact cards reduce padding below 280px of panel space.

All visible ray marks clear 3:1 contrast against the frame and the drop interior. The lab heading and outer notes sit on a theme-matched paper surface. Forced colors use system colors; exit line patterns and one-versus-two reflection geometry remain visible. The schematic ray animation is static.

## Scope and validation

Runtime SHA256: bef9797b926aafb7430bcce82d7f24252c1d9e09361efc6a9cc6aea6ed29ec88

The recorded single CSS append reverses exactly to the preceding comparison runtime 33b52526fd61b3441d91052c3f2f44e8aa577ffa0d47981fb6a9ac46b62f97fd. Both installed runtime copies match. Renderers, model, questions, callbacks, translated strings, notebook behavior and SVG bytes are unchanged by this enhancement.

- 12 passing native rainbow regressions; no failed or skipped tests. The suite checks optical conditions, both bows, saved evidence, reviewed strings and mirror parity.
- 777 passing browser checks, 32 native disclosure actions and eight scoped accessibility audits with zero violations.
- Eight final captures and two matched baseline views cover desktop light and dark, narrow desktop hosts, 320px and 390px phones, high contrast, forced colors and 150% CSS zoom.
- Native clicks and Space preserve the paused parcel, canvas, time, saved notebook, optical evidence, scores and awards. Both SVGs match the frozen baseline exactly.

The QA harness omits WebGL drawing during SVG checks. The native model, input handling and frame loop run normally during interaction checks. After those checks, the exact rendered lab DOM and ancestor styles are copied for capture and the engine is unmounted. Screenshots contain the SVG ray lab and exclude WebGL. Captures use explicit measured bounds and a viewport height capped at 2400px. The original screenshot stability timeout, browser startup diagnostic and native worker startup timeout remain in the task scratch directory. The passing native run uses worker threads. No validation count includes an unstarted test.

## Verify

Run node reports/watercycle-ray-readability/verify.cjs from the repository. Add --snapshot-only to validate archived evidence after future enhancements. The source verifier checks the exact CSS append. Run dev-tools/watercycle_ray_readability_qa.cjs with --expected-sha=<current source hash> and a fresh --out=<report folder> to repeat the browser matrix. WC_BROWSER_EXECUTABLE can select an installed compatible Chromium binary.

All changes remain uncommitted.
