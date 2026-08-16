---
name: render-view-module
description: Run an AlloFlow view module in a real browser to see a change working. Use when asked to run, start, or screenshot the app, or to confirm a UI change is real rather than only asserted by a test. Covers why the obvious launch paths load DEPLOYED code instead of your edits, and the working Playwright recipe with fixture props.
---

# Render an AlloFlow view module in a real browser

Use this when you need to **look at** a change: does the highlight land on the
right option, is the contrast real, did the panel actually disappear. Vitest in
this repo is overwhelmingly source-grep and jsdom, so it can tell you a class
name is present and nothing about whether a user sees it.

## First, know why the obvious paths don't work

All three of these run the **deployed** app, not your edits. Verified 2026-08-16.

| Path | What actually happens |
|---|---|
| `npm run test:e2e` | `playwright.config.ts` defaults `baseURL` to `https://prismflow-911fe.web.app`. Drives production. |
| Serve the repo, open `/` | `loadModule()` fetches every view module from `https://alloflow-cdn.pages.dev/...`. Your local `view_*_module.js` is never read. |
| `cd desktop/web-app && npm start` | Same CDN URLs. `App.jsx` may also be stale relative to `AlloFlowANTI.txt` unless someone ran `build.js`. |

There **is** a local-module mode, and it is narrower than it looks.
`localizeModuleUrl` (`AlloFlowANTI.txt`, search `localizeModuleUrl =`) rewrites
CDN URLs to `./` only when `_isDesktopBundledApp` is true, which requires
hostname `localhost`/`127.0.0.1` **and** a path starting with `/app/`. The `app/`
directory holds a built bundle and **no view modules**, so that route 404s and
falls back to CDN anyway. Don't spend time there.

Reaching a real surface through the full UI is also expensive: a Language Deck
flashcard quiz needs source text, an AI glossary generation, translations, and a
deck launch. That is an API key and several round trips before you see anything.

## The recipe that works

Drive the **built module** directly in Chromium. Playwright and the browsers are
already installed; nothing to add.

```js
// Run with cwd = repo root. `playwright` does not resolve from a script
// outside the repo, so import it by path if your script lives elsewhere:
import { chromium } from 'file:///C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright/index.mjs';
```

Order matters. Each step below exists because skipping it produced a crash.

**1. Page with Tailwind.** Without the Tailwind CDN you can still read
`className` strings but the screenshot is unstyled, which defeats the point.

```js
await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"></script>
</head><body class="p-6 bg-white"><div id="root"></div></body></html>`,
  { waitUntil: 'domcontentloaded' });
```

**2. React UMD, from the repo.** These exact paths:

```
desktop/web-app/node_modules/react/umd/react.development.js
desktop/web-app/node_modules/react-dom/umd/react-dom.development.js
```

**3. Icons and `t`, BEFORE the module loads.** View modules resolve icons at
render. Use a Proxy so you never chase a missing one:

```js
window.AlloIcons = new Proxy({}, { get: (_t, k) => stub(k), has: () => true });
window.__alloT = (k, f) => (typeof f === 'string' ? f : k);   // module-scope t
```

Also set the bare globals (`window.CheckCircle2`, etc.) that some modules read.
**This is not optional and it is not cosmetic:** several names collide with DOM
built-ins. `window.History` is the History *interface constructor*; React calls a
bare class as a function component and throws
`Class constructor History cannot be invoked without 'new'`, taking the whole
panel down. The host hides this in production by `Object.assign`-ing the Lucide
set onto `window` at boot.

**4. Host helpers, sliced out of the monolith — never reimplemented.** Several
correctness helpers live at module scope in `AlloFlowANTI.txt` and are published
on `window` (`quizAnswerMatches`, `flashcardCorrectAnswer`, `fisherYatesShuffle`,
`_alloAdventureLessonKey`, `__alloMakeQrSvg`). Slice the real source and `eval`
it in the page, so you are testing shipped logic:

```js
const s = anti.indexOf('const quizAnswerMatches = (option, key) => {');
const e = anti.indexOf('window.quizAnswerMatches = quizAnswerMatches;', s);
const helper = anti.slice(s, e + 'window.quizAnswerMatches = quizAnswerMatches;'.length);
await page.evaluate((code) => { eval(code); }, helper);
```

**5. Load the built module and render it.**

```js
await page.addScriptTag({ path: resolve(ROOT, 'view_quiz_module.js') });
// window.AlloModules.QuizView is now registered
```

## Where to get the props

**Start from `dev-tools/check_module_render.cjs`.** It maintains working prop
bags, and they are kept current because the gate runs them. Today it covers:

| Module | Export |
|---|---|
| `view_quiz_module.js` | `QuizView` |
| `view_simplified_module.js` | `SimplifiedView` |
| `view_video_ref_player_module.js` | `VideoRefPlayer` |
| `view_end_session_preview_module.js` | `EndSessionPreview` |
| `annotation_suite_module.js` | `AnnotationSuite` |
| `poet_tree_module.js` | `PoetTree` |

For anything else, read `var X = props.X;` at the top of the `*_source.jsx` and
supply what the branch you want actually needs. You do **not** need the full bag;
`GlossaryView` renders its flashcard quiz from a fraction of its props.

**Add missing props by iterating on the error.** Attach the listeners and read
them — a missing function prop surfaces as a `pageerror`, not a React warning:

```js
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text().slice(0, 200)); });
```

`TypeError: isRtlLang is not a function` means add `isRtlLang: () => false`.
Common ones: `isRtlLang`, `getRows: () => 2`, `formatInlineText: (s) => s`.

## Gotchas that cost real time

- **One container per module.** Don't `innerHTML = ''` under React; it throws
  `removeChild` errors that mask the real failure. Use
  `ReactDOM.unmountComponentAtNode(old)` and append a fresh div.
- **Filter React 18 noise.** `ReactDOM.render is no longer supported` and
  `unmountComponentAtNode is deprecated` are expected with the UMD build and
  drown the output: `| grep -vE "ReactDOM.render is no longer"`.
- **Assert on classes AND look at the PNG.** Read back
  `/bg-green-700/.test(b.className)` for a machine-checkable result, then
  `page.screenshot({ fullPage: true })` and actually open it. A blank frame is a
  failed launch, not a passing test.
- **Rebuild first.** The module is generated: edit `*_source.jsx`, run
  `node _build_<name>_module.js`, then render. Editing the module directly is
  wiped by the next build.
- **Mirrors.** Most builders write both the root and
  `desktop/web-app/public/`. Some do not (`_build_view_student_save_adventure_module.js`),
  and `view_quiz_module.js`, `student_analytics_module.js` and four others have a
  **third** copy under `desktop/app-build/` kept by
  `node dev-tools/sync_allosheet_assets.cjs` — `verify:gate` fails on that one
  first, before any other check.

## What this proves, and what it does not

It runs the real built artifact, the real host helpers and real CSS in a real
browser, which is enough to confirm a rendering or styling change. It is **not**
the whole app: no host state, no AI, no live session, no routing. Say which one
you did. If a change depends on host wiring (a prop the host computes, an effect
ordering, a lazy module load), this harness will not catch it.

## Worked example

`verify_answer_key.mjs` in the session scratchpad (2026-08-16) rendered
`view_quiz_module.js` with a case-drifted answer key and confirmed the correct
option highlighted green while the authoring validator still flagged the drift,
then rendered `view_glossary_module.js` in Language Deck quiz mode and confirmed
the correct translation highlighted green rather than red. That verified commit
`e8bbf0aba`. Keep scratch harnesses **out of the repo** — the tree is shared and
often has ten agents in it.
