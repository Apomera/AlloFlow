# Timeline Studio review, 2026-09-06

Scope: `timeline_studio_module.js` (the Learning Hub modal, hand-written, mirrored byte-for-byte to `desktop/web-app/public/`) and `timeline_studio/timeline_studio.html` (the TimelineJS3 companion window it opens and feeds by postMessage). Both read end to end; the host render site and lazy loader in `AlloFlowANTI.txt` checked for what is actually passed in.

## Fixed

**The companion's data channel was open to any window.** Its theme listener already required `event.source === window.opener`; the data listener required nothing, and TimelineJS renders every text field as HTML. Any page that opened the companion URL could post `allotimeline-data` carrying markup and have it rendered on the CDN origin, which is the same origin the app itself runs on. A source check alone does not close this, because a page that opens the URL is the opener; the listener now requires the opener and an origin AlloFlow runs on. The first draft of that allowlist reused the module's loose `/(^|\.)alloflow/` host pattern and the retired Firebase suffixes, which would have admitted `alloflow.evil.example` and every `*.web.app` site; the lifted-function test caught it, and the list is now exact: the companion's own origin, `alloflow-cdn.pages.dev` and its Cloudflare preview subdomains over https, and localhost for the desktop build. Standalone use with no opener needs no messages and is unchanged. On the studio side, messages from windows it did not open are ignored and every post names the companion's origin instead of `*`.

**Model output reached the companion unescaped.** Topic mode escaped event text; paste mode did not, and the timeline title was raw in both. Both modes now run through the same escaper, and a response with no title stays title-less rather than gaining an empty title slide.

**The companion always opened dark.** It reads `?theme=` once at load and defaults to dark when absent, and nothing ever passed it; the host also has no `alloflow-theme-change` broadcast, so the companion's listener for that message has never fired. The studio now reads the host's theme class from `html`/`body` and passes it. A high-contrast teacher gets a high-contrast window.

**The host's `gradeLevel` prop was ignored.** It now seeds the reading-level select through a small mapper (K, 2, "Grade 4", 7, "10th grade", the four ids; unknown shapes land on middle school).

**The manual-builder drawer.** Closed, it sat off-screen but in the tab order. Open, it is a fixed panel that covers the header's "Add events" toggle, so a mouse user could open it and never close it (Playwright refused the click because the drawer intercepts it), and Escape did nothing. It is now hidden and `inert` when closed, the toggle carries `aria-expanded`/`aria-controls`, opening moves focus to the first field, and a 44 px close control inside the drawer and Escape both close it and return focus to the toggle. Reduced-motion users get no slide.

## Verified

`tests/timeline_studio_review.test.js`, 16 tests, including the origin allowlist lifted out of the page and exercised directly, hostile markup through both escaping paths, and the grade mapper. The six existing timeline suites still pass (52). Chromium smoke of the companion standalone with `?theme=light`: theme applied, closed drawer inert and hidden, Tab from the toggle does not enter it, opening focuses the headline field, `toggleCoveredWhileOpen` measured true, close button and Escape both close it with focus back on the toggle, a posted timeline renders, zero page errors.

## Not done, recorded

- **Every `timeline_studio.*` key is missing from `ui_strings.js`.** The module asks the translator for 61 keys through `tr(t, key, fallback)` and none exist, so the modal, every status line, and every disclosure and badge inside the timeline is English for every language. The pairs are harvested (regenerate with the script named in the handoff); registration was deferred because another session had `ui_strings.js` modified in both index and working tree at the time.
- The companion page itself is hard-coded English and ignores the `lang` parameter the studio passes it.
- The studio's `aiHintsEnabled` check is a no-op: the host never passes that prop, so the studio calls the model whenever `callGemini` exists. Whether `callGemini` is gated upstream was not established here.
- Closing the modal mid-generation leaves the popup open and empty; the result is discarded with the unmounted component.
- The companion recreates the TimelineJS instance on every data message without destroying the previous one.
