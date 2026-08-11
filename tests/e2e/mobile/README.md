# Mobile + tablet responsive suite

Phone and tablet coverage for AlloFlow, driving the **working tree** rather
than the deployed site.

```bash
npm run test:mobile              # every device profile
npm run test:mobile:phone        # iPhone 14, iPhone SE, Pixel 7
npm run test:mobile:tablet       # iPad portrait + landscape
npm run test:mobile:report       # open the HTML report

npx playwright test -c playwright.mobile.config.ts --project=phone-ios
```

## Why this is a separate config

`playwright.config.ts` points at `https://prismflow-911fe.web.app`, so it can
only tell you about code that is already deployed. `playwright.mobile.config.ts`
starts the CRA dev server against the working tree instead, which means a
layout fix can be verified in the same loop that found the bug, without a
deploy.

The first run compiles a 3MB `App.jsx` and takes several minutes. Leave the dev
server running between runs and `reuseExistingServer` reattaches instantly.

## The CDN trap (read this before trusting a green run)

Running the dev server is **not sufficient** to test the working tree. The
React shell is local, but every extracted module is loaded from
`https://alloflow-cdn.pages.dev/<name>_module.js?v=<hash>`, which is the
**deployed** CDN. Edit any `*_module.js` locally, rebuild it, reload the app,
and the running page still executes the shipped code.

This cost real time to find: a scroll-lock fix looked like it had no effect,
because `window.__alloScrollLockState.count` stayed at 0 while the module
reported as loaded. It was loaded, just not the local one.

`routeCdnToWorkingTree()` in `mobile-helpers.ts` fixes this by intercepting
that origin and serving the repo-root file instead (about 160 modules per
run). `bootMobile()` installs it automatically. If you write a spec that
navigates without `bootMobile`, install the route yourself or you will be
testing production.

## Device profiles

| Project | Engine | Why |
|---|---|---|
| `phone-android` | Chromium, Pixel 7 | Android Chrome, the most common phone |
| `phone-ios` | **WebKit**, iPhone 14 | Real iOS Safari, not a Chromium imitation of it |
| `phone-small` | WebKit, iPhone SE (375px) | The width where flex rows and fixed panels break first |
| `tablet-ios-portrait` | WebKit, iPad gen 7 | |
| `tablet-ios-landscape` | WebKit, iPad gen 7 | Landscape crosses the 1024px "desktop" breakpoint, which can re-enable a sidebar that has no room |

iOS runs on genuine WebKit because iOS Safari diverges from Chromium on exactly
what this suite measures: `100vh`, safe-area insets, `position: fixed`,
momentum scrolling, and zoom-on-focus. Chromium device emulation would report
those as passing.

## What is checked

`responsive-helpers.ts` holds the invariants. Each returns **named offenders**
rather than a boolean, so a failure names the element and the rule to fix:

- **Horizontal overflow** — nothing extends past the right edge. The check is
  clipping-aware: an element cut off by an ancestor's `overflow` is not
  reported, because decorative blobs (`right-[-10%]` blur circles) routinely
  extend past their container without producing a scrollbar or a visual defect.
  Reporting those buries the real findings.
- **Document scroll** — the page itself must not scroll sideways.
- **Tap targets** — interactive controls meet the 44px minimum. Links inline in
  prose are exempt, per the WCAG 2.5.8 exception.
- **Dialog fit** — an open dialog fits the viewport, or scrolls internally. A
  modal taller than the screen with no scrollable region is the worst class of
  mobile bug: its buttons *and* its close control are both unreachable.
- **Clipped text** — leaf text nodes cut off by a fixed-size container with no
  ellipsis.
- **iOS zoom-on-focus** — controls with a font under 16px, which make Safari
  zoom the page on focus and never zoom back.
- **Background scroll lock** — the page behind a modal must not scroll.

## Suite layout

| File | Covers |
|---|---|
| `01-core-chrome.spec.ts` | Launch pad, workspace shell, fixed header, orientation change |
| `02-hubs-and-modals.spec.ts` | Each pathway's hub: fit, overflow, tap targets, close, scroll lock |
| `03-tile-sweep.spec.ts` | Every tile in every catalog, including the 148-tile STEM Lab |

The tile sweep walks the catalogs the app actually renders rather than a
hard-coded list, so a newly added tool is covered the day it ships.

## Boot flow

`bootMobile()` in `mobile-helpers.ts`. Two things about it are non-obvious and
were read off the running app rather than guessed:

- The launch-pad cards are `button.lp-card` with **no aria-label**, so
  `getByRole('button', { name: ... })` does not find them. Match on text.
- The mic card's skip control is named **"Skip microphone setup"** by
  aria-label, not by its visible "Skip for Now" text.
- Choosing a pathway lands on that **hub dialog**, not a bare workspace. Tests
  that want the workspace must call `closeOpenHub()` first.

Waits are on elements, never on timers: WebKit boots this app roughly three
times slower than Chromium, and a fixed sleep tuned on Chromium reports a
phantom "launch pad missing" on iOS.

## Known coverage gap

The app loads `drag-drop-touch` (the polyfill that makes HTML5 drag-and-drop
work under touch) from jsdelivr at runtime. Where that CDN is unreachable the
polyfill does not load, so **touch drag-and-drop is not covered by this suite**.
Treat drag interactions as untested rather than as passing.
