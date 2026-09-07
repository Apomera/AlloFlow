# Whiteboard (Excalidraw popup) review, 2026-09-06

Scope: `whiteboard/whiteboard.html` (the standalone Excalidraw window the Educator Hub opens, with graphic-organizer templates, Save to AlloFlow, an AI-assist bar, drawing recording and GIF export) and the app-side bridge listener in `AlloFlowANTI.txt` (read, not changed). Mirror at `desktop/web-app/public/whiteboard/whiteboard.html`, kept byte-identical.

## What was already right

The app side accepts `allocwb-*` messages only from `https://alloflow-cdn.pages.dev`, which is the app's own origin and therefore the real trust boundary. Everything the AI returns is re-sanitised in the popup before it touches the canvas (whitelisted element types, clamped geometry, hex-checked colours, capped counts), and text lands on a canvas, not in HTML. The recording path is careful work and its helpers are tested.

## Fixed

**The popup trusted whoever opened it.** Its inbound guard was "the message came from `window.opener`", and the origin it later pinned was whatever the opener said in its ack. The app opens the popup by name, `alloflow-whiteboard`; a page already open in the same browser can create a window of that name first, after which the app's `window.open` navigates that page's window here and it stays `window.opener`. In that state the whiteboard sent its hello to the attacker, and a teacher's Save to AlloFlow posted the drawing to the attacker's page with target `*`. Save and AI now wait for an ack from an origin AlloFlow runs on (the production host and its Cloudflare preview subdomains over https, localhost for the desktop build, and the opaque `null` origin the desktop bundle reports, which the code's own history says must not be refused), and drawing-bearing messages are posted only to that pinned origin. Hello and closed carry nothing and may still go to `*`. The residual case is a sandboxed-frame opener, which is far narrower than any page.

**The AI buttons dropped keyboard focus while busy.** Diagram, Image and Record set the `disabled` attribute during generation, which removes the element under focus for the whole wait. They use `aria-disabled` now and the request refuses a second press; the Record button keeps a real `disabled` only when the browser genuinely cannot record.

**Choosing a template replaced the whole drawing.** With no confirmation and no warning, a student who picked a template mid-way lost their work. A template is now added below the lowest existing element, the flash says so, and the select returns to its placeholder so the same template can be added again.

**An empty export used a blocking `alert()`.** It reports inline like Save does.

**Toolbar text and targets.** Header and AI-bar controls were 12 px text at about 30 px tall; they are 13 px on a 44 px target now, and the privacy line is 12 px.

## Verified

`tests/whiteboard_bridge_review.test.js`, 11 tests, with the origin allowlist and the template offset lifted out of the page and exercised directly; the two existing suites still pass (17), one of them updated to pin the muteness property in its new shape. Chromium smoke standalone with the real Excalidraw 0.17.6 build from the CDN: mounted, AI bar hidden and Save disabled with no opener, empty export flashes with no dialog, first template inserts, second template lands below it, select resets, a PNG downloads, toolbar button 44 px at 13 px, zero page errors.

## Not done, recorded

- **Theme.** The popup is dark chrome over Excalidraw's light canvas regardless of the teacher's theme; the app passes no `?theme=` and has no theme broadcast. Fixing it well needs one line in the app's `openWhiteboard` plus a small handler here; the app file is shared and busy, so it is written down rather than done.
- **A stronger fix for the named-window case** would be a one-time token in the URL the app opens, echoed in the ack. That is a two-line app change in the same shared file; the popup-side gating above closes the practical hole without it.
- The popup is hard-coded English with no language parameter; the app passes none.
- The Excalidraw and React bundles load from jsdelivr without subresource-integrity hashes, as the other CDN-loaded shelves do.
- Save reports success before the app confirms it filed the resource; the app toasts on its own side, so the teacher does see the real outcome.
