**Moon Mission: terrain shadows and tilted touchdown support**

Completed locally on October 4, 2026. Changes remain unstaged and uncommitted.

The lighter 3D descent view now casts the Apollo lander's silhouette onto the actual terrain and rocks. It uses one merged mesh from the visible hardware and a tightly framed 256 by 256 depth map. The detailed tier retains its terrain shadows and 1024 by 1024 map. The new caster writes no color or depth into the normal camera view. Its geometry, material and shadow map are released during scene teardown.

The 2D view now positions a tilted lander using the lowest edge of its four circular footpads. Every pad stays at or above the visual surface through recorded approaches, touchdown and graphics-loss fallback. The model notes explain the fixed scene sunlight, rendering detail and compressed scene height. Flight integration, controls, recording, landing grades and rewards retain their previous behavior.

The initial flat receiving-plane implementation failed the native pixel check because crater relief buried its shadow. The final implementation uses the rendered terrain. The earlier failure, diagnostic, traces and intermediate passes remain available in [attempt notes](attempt-notes.json).

Verification on the final source:

- **266 unit checks passed across 16 files**, including 24 new geometry checks. [Unit results](unit-final.json)
- **Eight distinct Chromium workflows passed**, each in a fresh process with one worker, zero retries and the existing 180-second limit. They cover both banks, replay/contact receipts, 320 px and forced colors, both real WebGL tiers, context loss, dust emission/coasting/settling, pause and hidden time. [Results](verification.json)
- **4 scoped axe scans reported zero violations.** These cover the model-note disclosure in the tested desktop and phone conditions.
- **Sixteen native captures were inspected**, covering the new shadows and tilted contact plus live dust, coasting and fallback. [Visual review](visual-review.json)
- Native WebGL measured **one shadow caster with 5,610 vertices**, a 256 by 256 map and **483 visible shadow pixels**. Hiding only that caster changed the paused scene; it was restored immediately. The real light camera agrees with the analytic parallel-ray projection within 3.89e-16 in clip coordinates. The new resources each disposed exactly once. [WebGL evidence](browser-shadow-3-final/shadow/merged-shadow-evidence.json)
- The independent geometry probe checks **675 ray projections** and **5,781 tilt/clearance combinations**. Maximum plane residual is 1.42e-14 scene units; maximum minimum-footpad clearance error is 5.68e-14 pixels. [Probe results](geometry-probe.json)

The Sun direction remains the authored scene value `(-700, 260, 360)`. Scene altitude is compressed, so shadow length cannot serve as an altitude measurement. The lighter tier casts the lander shadow with coarser sampling; it does not add terrain self-shadowing or rock casters. These checks use the working-tree module, local React/Three assets and app stylesheet in Chromium. Physical-device performance and a full deployed application were outside this pass.

Low-angle sunlight and long shadows are useful lunar visual cues. NASA's [Apollo 11 mission summary](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.summary.html) describes low Sun angles selected for landing visibility, and [Apollo Landing Sites with Shadows](https://svs.gsfc.nasa.gov/3620/) shows how descent-stage shadows help reveal the hardware. This scene does not reconstruct an Apollo landing's exact illumination or terrain.

[Landing approach](browser-shadow-3-final/shadow/reduced-motion-landing-shadow.png) · [Touchdown shadow](browser-shadow-3-final/shadow/reduced-motion-contact-shadow.png) · [Phone contact](browser-shadow-2-final/shadow/phone-tilted-contact.png) · [High-contrast notes](browser-shadow-2-final/shadow/phone-shadow-notes-forced.png) · [Graphics-loss fallback](browser-shadow-3-final/shadow/shadow-context-loss-support.png) · [Visual review](visual-review.json)

Canonical and public modules are byte-identical: `c261c4bbb7fd7ee719164628a0bdf92c1e797d7ff58453943b9dcc5169e75a54` (1,393,910 bytes). Thirteen guarded integrations reverse exactly to accepted pass 23. All 23 earlier test files and the scoped Git index are preserved; the two new test files are unstaged. [Preservation](preservation.json) · [Source diff](pass24.diff) · [Integration map](integration-map.json)

Repeat the numerical check with `node reports/moon-mission-enhancement-pass24-2026-10-04/geometry-probe.cjs`. The new tests are `tests/moonmission_descent_shadow.test.js` and `tests/e2e/moon-mission-descent-shadow.spec.ts`. Use the saved [Playwright configuration](playwright.config.ts), one worker and zero retries; the final browser commands and raw logs are preserved beside each JSON result. The 16-file unit run uses Vitest's thread pool with one worker and file parallelism disabled.
