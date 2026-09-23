# King PD paths under classroom conditions

Lane K4, 2026-09-22.
- **Where measured:** the live shell and the working tree, in real Chromium.
- **Conditions:** cold profile, 1366x768, 4x CPU throttle, on "school Wi-Fi" (10 Mbps, 40 ms) and "Fast 3G".
- **How timed:** every time below comes from the page's own clock (a MutationObserver plus `performance.now()`), not from polling.
- **Statistics:** median of 3 runs, with min-max in brackets.

Numbers are seconds from opening `https://alloflow-cdn.pages.dev/app/` unless marked.

## The short version

- **Teacher: open the Crew Norms pack and start its first SEL station.**
  - Tool ready at **71.3 s** on school Wi-Fi and **103.1 s** on Fast 3G.
  - It takes **14 clicks and 3 file picks**; 9 clicks and 1 file pick would do it without the bugs below.
- **Student: no session, open the pack, then Crew Protocols from the pack's link.**
  - Tool ready at **70.4 s** (Wi-Fi) and **115.0 s** (Fast 3G).
  - It takes **9 clicks and 3 file picks**. The five changes below bring that to 6 clicks and 1 file pick, and 5 once a loaded pack opens at its directions.
- **Load Project fails if clicked early, then retrying silently does nothing.** Every run hit this on the first try. It throws `MiscHandlers module not loaded` until a background module arrives, 24.9 s (Wi-Fi) to 36.0 s (Fast 3G) after the menu item appears. The only visible sign is a red "1 error" badge. Retrying with the same file fires no `change` event, so nothing happens again. Only a differently named copy (or a reload) works.
- **The pack's Crew Protocols link never asks for the tool.** The hub opens on its home grid. After the full 20 s pending window it toasts **"Crew Protocols is not available in this SEL Hub."**, and only then starts the station. The tool itself loads in about a second once anything requests it.
- **Most labels are blank until a 3 MB file arrives.** They come from `ui_strings.js` (9.4 MB raw, 3.0 MB on the wire), which is fetched after page load, every visit, because its localStorage cache is rejected for size. It arrived at 11.7 s on Wi-Fi and 38.6 s on Fast 3G. Until then:
  - the teacher's wizard, the History "More" button and the "Load Project" item have no text and no accessible name;
  - the student's codename dialog buttons are blank.
  A person cannot pick "Load Project" or "Load Saved File" before that moment.
- **Bytes per cold Chromebook:** about 12.5 MB (teacher) and 8.9 MB (student); a class of 25 is roughly 226 MB for 1 teacher and 24 students. The teacher's figure includes 3.5 MB of Word Sounds audio, 3 probe banks and chart.js, all loaded by a *closed* analytics panel.
- **Third-party domains** a district filter may block:
  - `cdnjs.cloudflare.com` (every session);
  - `cdn.jsdelivr.net` (every teacher session, for chart.js; in 2 earlier runs also the storage-library fallback);
  - `raw.githubusercontent.com` (teacher every session).
  Nine same-origin paths come back as the 54 KB homepage HTML instead of the asset. `/app/lang/manifest.json` is requested twice per visit.
- **"Clear All Data & Reload" never became visible.** It was *injected into the hidden loader* in 2 of the 24 earlier Fast 3G runs. In the final runs the smallest margin before it would show was 14.8 s. It did not show on one 10 Mbps link shared by 25 cold Chromebooks either, nor on Slow 3G, because the watchdog's 20 s clock only starts once the stylesheet has arrived.
- **Touch works on a touch Chromebook.** At 390 px the lowest sort bucket starts under the pinned card deck, so a finger drop lands on the deck until the student scrolls. Tap-to-place works everywhere.

## The five changes that save the most

Ranked by seconds and clicks saved. "Measured" means the fix was emulated inside the real app and the path re-timed (table *Measured with the proposed fixes emulated* below). Every anchor is `file:line`, re-checked against the working tree at `10ec1266b` on 2026-09-22.

1. **Ship the boot strings with the shell instead of gating every label on a 3 MB download.**
   - **Where:** `AlloFlowANTI.txt:5645-5703` (`_refreshRemoteStrings`, scheduled at idle after `load`). Its `localStorage.setItem('alloflow_ui_strings_cache', ...)` (`:5666`) always fails with `QuotaExceededError` (probe: 0 characters cached; localStorage rejects 6 M characters). The launch-pad fallback is at `view_launch_pad_source.jsx:297` ("Full AlloFlow" vs "Full Platform" in `ui_strings.js:204`).
   - **Effect now:** every labelled step before the strings arrive is blocked for a person, as is every screen-reader label. On Fast 3G that point is 38.6 s, while the launch pad is on screen at 15.6 s.
   - **Fix:** build the English strings the boot surfaces use into the shell, or a small hashed boot subset. Fetch the full pack only for a non-English language, and drop the 9.4 MB localStorage write.
   - **Saves:** 3.0 MB per device per cold visit, a 9.4 MB parse on every visit, and the gap between "launch pad on screen" and "strings arrive" in the table below (Fast 3G: 23.0 s).
   - **What-if evidence:** with changes 2 to 5 emulated, the pack still cannot load until the strings arrive, because "Load Project" has no label before then. That wait is what bounds the Fast 3G what-if runs.
2. **Make Load Project wait for its handler instead of throwing, and reset the file input.**
   - **Where:** `AlloFlowANTI.txt:35795-35929` (`handleLoadProject` throws at `:35929`). The homework path next to it already does this right (`:36035`: `window.__alloEnsureLazyModule('MiscHandlersModule', '__alloLazyFileIntake', 'MiscHandlers')`). The input is at `view_history_panel_source.jsx:980` (`onChange={handleLoadProject}`). Its value is only cleared inside the module (`misc_handlers_source.jsx` about 672), so after a throw the same file cannot be chosen again.
   - **Also affected:** the student "Load Saved File" path (`AlloFlowANTI.txt:19164-19168`), which uses the same input.
   - **Saves:** 4 clicks and 2 file picks for the teacher, 2 clicks and 2 file picks for the student. On time, the wait for the module drops from 24.9 s / 36.0 s to about one module fetch.
3. **Let a pack's `#sel-hub/<tool>` link request its tool, start the station at once, and make sure the link works before `sel_hub_module.js` arrives.**
   - **Where:** `sel_hub/sel_hub_module.js:2894-2906` (`settle()` ignores `status === 'waiting'`, so nothing calls `window.__alloEnsureSelPluginLoaded(toolId)`; `openSelToolById` at `:2808-2854` already knows how). The station is only activated in the `ready` / `unknown` branches, so it waits out `PENDING_TTL_MS: 20000` (`:2015`).
   - **Second defect:** the click handler itself lives in `sel_hub_module.js:2011-2086`, which is a deferred module (`AlloFlowANTI.txt:14332`). It registered at 25.7 s (Wi-Fi) and 44.3 s (Fast 3G). Once change 2 lands, a teacher can reach the link before that, and the click then only changes `location.hash`. The what-if runs count these dead clicks.
   - **Fix for the second defect:** delegate `#sel-hub/` clicks from the host, or promote `SelHub` on the first such click.
   - **What-if evidence:** with the tool request emulated, the link opened Crew Protocols with the station already started in every run. But 3 of 5 what-if runs had a dead first click, because `sel_hub_module.js` had not registered yet. Only the host-side half fixes that.
   - **Saves:** about 20 s and 1 click on every pack-link arrival, and removes a false "not available" error.
4. **Stop the closed Student Analytics panel from downloading at boot.**
   - **Where:** `student_analytics_module.js:1610-1615` calls `loadProbeBanks()` on mount. That pulls `word_audio_kokoro_bank.json` (3.5 MB, `AlloFlowANTI.txt:5532-5533`) plus three probe banks. Those banks are fetched relative to `/app/` (`AlloFlowANTI.txt:5536-5556`), come back as HTML, and then fall back to `raw.githubusercontent.com`.
   - **Also:** `student_analytics_module.js:1874-1880` injects chart.js from `cdn.jsdelivr.net`.
   - **Why it runs:** the panel is rendered for every teacher, with `isOpen` false (`AlloFlowANTI.txt:43711-43713`).
   - **Fix:** gate both effects on `isOpen`, and fetch the probe banks from `pluginCdnBase`.
   - **Saves:** about 3.9 MB and 2 third-party hosts per teacher device; on Fast 3G that is about 22 s of link time shared with the modules the path needs.
5. **Put `vendor/`, `fonts/` and the logo in the `/app/` shell, and stop requesting files that do not exist.**
   - **Where the shell copy comes from:** `build.js:53-61` (`STUDENT_SHELL_ENTRIES` has no `vendor` or `fonts`). The shell therefore gets HTML for:
     - `./vendor/lz-string` and `./vendor/idb-keyval` (`AlloFlowANTI.txt:11950-11959`), then falls back to cdnjs and sometimes jsdelivr after a 12 s timeout (`:8019`);
     - the preloaded `/fonts/Inter-latin.woff2` (`desktop/web-app/public/index.html:68,78`; the fonts exist only in `desktop/web-app/public/fonts/`);
     - `rainbow-book.jpg` (`view_launch_pad_source.jsx:746`, relative; the real file is at the root, 16 KB; the logo never shows on `/app/`).
   - **Other requests that come back as HTML:** `/allo-shell-config.json` (`AlloFlowANTI.txt:2094`, every boot) and `/app/lang/manifest.json`.
   - **Precedent:** `build.js:119-120` already rewrites one root path to `./` for the `/app/` copy.
   - **Saves:** 6 to 9 HTML downloads of 54 KB to 374 KB each on the critical path, and the cdnjs/jsdelivr dependency for storage.

Just outside the five: two clicks per session.
- A loaded pack opens at its *last* resource (`misc_handlers_source.jsx:1139-1146`) rather than its directions.
- The SEL Hub's "Choose what to keep and share" explainer returns in every new tab (`sel_hub/sel_hub_module.js:2315-2321`, `sessionStorage`).

## The paths as measured

**Teacher (14 clicks, 3 file picks):**
1. **Full Platform:** the card reads "Full AlloFlow" until the strings arrive.
2. **Teacher.**
3. **Close the Quick Start wizard:** the X has no label before the strings.
4. **History.**
5. **More:** blank before the strings.
6. **Load Project + file:** throws.
7. The retry takes **More, Load Project, same file** (nothing happens), then **More, Load Project, renamed file**, which loads.
8. The pack opens on "Decide Challenge", so **Open: Crew Launch Week 1**.
9. The **Crew Protocols** link opens the SEL Hub.
10. **Got it** on the explainer.
11. After 20 s: the "not available" toast, and the station appears.
12. **1. Crew Protocols:** the tool loads.

**Student (9 clicks, 3 file picks):**
1. **Full Platform.**
2. **Student:** the codename dialog's buttons are blank before the strings.
3. **Load Saved File + file:** throws.
4. **Load File + same file:** nothing happens.
5. **Load File + renamed file:** loads.
6. **Open the directions.**
7. **Crew Protocols** link.
8. **Got it.**
9. After 20 s, **1. Crew Protocols.**

#### Live shell (alloflow-cdn.pages.dev/app/)

| Path and network | n | Launch pad on screen | Strings arrive (3 MB) | Workspace ready | 1st Load attempt | Load handler registered | Pack loaded | SEL Hub open | Station starts (link) | Tool ready | Clicks | File picks | MB moved |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Teacher, school Wi-Fi | 3 | 5.4 (5.3-6.0) | 11.7 (11.4-14.1) | 11.0 (9.7-15.0) | 15.8 (14.2-16.7) | 39.1 (36.7-40.4) | 46.5 (44.0-48.7) | 48.6 (46.8-53.3) | 70.5 (67.9-74.6) | **71.3 (68.6-75.5)** | 14 | 3 | 12.5 |
| Teacher, Fast 3G | 3 | 15.6 (13.0-19.1) | 38.6 (34.0-42.6) | 24.3 (20.4-59.4) | 40.8 (36.1-60.0) | 71.7 (70.2-106.1) | 78.4 (76.6-115.1) | 80.8 (78.9-120.6) | 101.8 (100.0-142.0) | **103.1 (101.7-143.5)** | 14 | 3 | 12.2 |
| Student, school Wi-Fi | 3 | 5.2 (5.2-8.7) | 13.1 (12.1-14.3) | 14.4 (13.2-16.1) | 16.4 (14.3-17.1) | 39.2 (32.3-49.7) | 44.9 (38.9-57.0) | 49.2 (43.8-63.5) | 69.7 (64.8-86.6) | **70.4 (65.5-91.3)** | 9 | 3 | 8.9 |
| Student, Fast 3G | 3 | 13.1 (13.0-14.7) | 36.7 (36.7-38.2) | 39.5 (39.1-39.6) | 42.2 (40.2-46.7) | 72.6 (72.6-94.4) | 79.8 (79.7-100.3) | 90.1 (86.2-106.5) | 112.5 (107.2-127.3) | **115.0 (108.9-129.6)** | 9 | 3 | 8.6 |

#### Measured with the proposed fixes emulated (live, what-if runs)

| Path and network | Tool ready now | Tool ready with fixes | Clicks now | Clicks with fixes | File picks now / with fixes | MB now / with fixes | Dead pack-link clicks with fixes | n (what-if) |
|---|---|---|---|---|---|---|---|---|
| Teacher, school Wi-Fi | 71.3 (68.6-75.5) | 30.9 (30.9-30.9) | 14 | 10 | 3 / 1 | 12.5 / 8.5 | 1 | 1 |
| Teacher, Fast 3G | 103.1 (101.7-143.5) | 55.1 (41.3-69.0) | 14 | 9.5 (9-10) | 3 / 1 | 12.2 / 8.1 | 1, 0 | 2 |
| Student, school Wi-Fi | 70.4 (65.5-91.3) | 43.1 (43.1-43.1) | 9 | 7 | 3 / 1 | 8.9 / 8.5 | 1 | 1 |
| Student, Fast 3G | 115.0 (108.9-129.6) | 56.9 (56.9-56.9) | 9 | 6 | 3 / 1 | 8.6 / 8.3 | 0 | 1 |

#### Where the time goes (live, medians)

| Path and network | Load handler missing after the menu item appears | Link click to station (the 20 s wait) | Station button to tool ready | Background queue drained | Driver latency (included in the totals) |
|---|---|---|---|---|---|
| Teacher, school Wi-Fi | 24.9 (20.4-25.2) | 22.1 (21.5-22.3) | 0.5 (0.4-0.6) | 65.2 (61.8-69.0) | 3.0 (2.7-4.2) |
| Teacher, Fast 3G | 36.0 (29.8-46.2) | 21.4 (21.2-22.0) | 1.0 (1.0-1.3) | 109.5 (108.2-153.5) | 3.1 (3.0-7.5) |
| Student, school Wi-Fi | 25.0 (19.1-33.6) | 21.6 (20.6-23.7) | 0.5 (0.4-1.6) | 66.9 (59.1-93.5) | 3.1 (2.3-6.7) |
| Student, Fast 3G | 33.6 (33.2-55.1) | 21.5 (21.4-22.8) | 1.3 (1.3-2.1) | 121.6 (112.4-134.5) | 4.8 (4.1-9.4) |

#### Failed (driver timeout) runs, excluded from the medians

None in the final runs. The earlier driver generation had 3 driver timeouts on Fast 3G; see data/summary_v2.json.

#### "Clear All Data & Reload" watchdog, Fast 3G runs, closest first

| Run | #root first child (s) | Watchdog margin (s) | Button injected | Visible |
|---|---|---|---|---|
| live-fast3g-teacher-r3 | 8.4 | 14.8 | no | no |
| live-fast3g-teacher-r1 | 7.4 | 15.0 | no | no |
| live-fast3g-teacher-r2 | 8.2 | 15.6 | no | no |
| live-fast3g-student-r3 | 7.3 | 15.6 | no | no |
| live-fast3g-student-r1 | 7.1 | 15.9 | no | no |
| live-fast3g-student-r2 | 6.4 | 16.4 | no | no |

All 12 runs: visible 0, injected-while-hidden 0, smallest margin 14.8 s.

**Reading the tables:**
- **"Launch pad on screen"** is when its DOM exists. The driver clicks the first card as soon as it is clickable, whatever its label.
- **"Strings arrive"** is the `responseEnd` of `ui_strings.js`. Steps whose only label comes from those strings (More, Load Project, Load Saved File) cannot be found before it, by a person or by the driver.
- **"Load handler registered"** is when `window.AlloModules.MiscHandlers` appeared. Load Project cannot work before it.
- **Driver latency** is how long the driver took to click a control after the page made it clickable. It is part of every total, but small next to the waits the app imposes.

## Screenshots

Live shell, school Wi-Fi, 4x CPU, cold profile (from the separate screenshot runs, which are not in the statistics).

**Before ui_strings.js arrives: the Quick Start wizard has no labels (grade buttons, inputs, Skip and close are all blank)**

![Before ui_strings.js arrives: the Quick Start wizard has no labels (grade buttons, inputs, Skip and close are all blank)](screenshots/pre-strings-quickstart-wizard-blank.png)

**Teacher: first paint after opening /app/**

![Teacher: first paint after opening /app/](screenshots/teacher-00-nav.png)

**Teacher: after Full Platform, the role gate**

![Teacher: after Full Platform, the role gate](screenshots/teacher-01-launchpad-clicked.png)

**Teacher: workspace after closing the wizard**

![Teacher: workspace after closing the wizard](screenshots/teacher-02-workspace.png)

**Teacher: Load Project clicked before the handler loaded; only the red error badge shows**

![Teacher: Load Project clicked before the handler loaded; only the red error badge shows](screenshots/teacher-03b-load-project-failed.png)

**Teacher: pack loaded, opened at its last resource**

![Teacher: pack loaded, opened at its last resource](screenshots/teacher-04-pack-loaded.png)

**Teacher: the directions with the Crew Protocols link**

![Teacher: the directions with the Crew Protocols link](screenshots/teacher-05-directions.png)

**Teacher: the link opens the SEL Hub home and the explainer, not the tool**

![Teacher: the link opens the SEL Hub home and the explainer, not the tool](screenshots/teacher-06-selhub-open.png)

**Teacher: still no tool 8 s after the link**

![Teacher: still no tool 8 s after the link](screenshots/teacher-07-link-no-tool.png)

**Teacher: Crew Protocols with the station, after the 20 s wait and the station button**

![Teacher: Crew Protocols with the station, after the 20 s wait and the station button](screenshots/teacher-08-tool.png)

**Student: first paint after opening /app/**

![Student: first paint after opening /app/](screenshots/student-00-nav.png)

**Student: after Full Platform, the role gate**

![Student: after Full Platform, the role gate](screenshots/student-01-launchpad-clicked.png)

**Student: codename dialog**

![Student: codename dialog](screenshots/student-02-codename.png)

**Student: Load Saved File before the handler loaded**

![Student: Load Saved File before the handler loaded](screenshots/student-03b-load-project-failed.png)

**Student: pack loaded**

![Student: pack loaded](screenshots/student-04-pack-loaded.png)

**Student: the directions with the Crew Protocols link**

![Student: the directions with the Crew Protocols link](screenshots/student-05-directions.png)

**Student: SEL Hub home after the pack link**

![Student: SEL Hub home after the pack link](screenshots/student-06-selhub-open.png)

**Student: still no tool 8 s after the link**

![Student: still no tool 8 s after the link](screenshots/student-07-link-no-tool.png)

**Student: Crew Protocols with the station**

![Student: Crew Protocols with the station](screenshots/student-08-tool.png)

**390 px: the card deck covers the lower buckets**

![390 px: the card deck covers the lower buckets](screenshots/touch-390-game.png)

**390 px: after scrolling the last bucket above the deck, the finger drag works**

![390 px: after scrolling the last bucket above the deck, the finger drag works](screenshots/touch-390-last-bucket-after-scroll-drag.png)

**Touch Chromebook: all three buckets side by side**

![Touch Chromebook: all three buckets side by side](screenshots/touch-chromebook-game.png)

## Requests a district filter or the CDN fallback will hit

Every host below was seen on the live shell during these paths. The working-tree runs add the desktop-bundle Kokoro voice stack (about 10 MB from `cdn.jsdelivr.net` and `huggingface.co`). That comes from the localhost desktop mode (`_isDesktopBundledApp`) and not from the web shell.

#### Downloads over 150 KB (live runs)

| Host and path | KB | Runs |
|---|---|---|
| alloflow-cdn.pages.dev/word_audio_kokoro_bank.json | 3467-3469 | 6 of 12 |
| alloflow-cdn.pages.dev/ui_strings.js | 3029 | 12 of 12 |
| alloflow-cdn.pages.dev/app/static/js/main.2e5e6cb6.js | 535-536 | 12 of 12 |
| alloflow-cdn.pages.dev/audio_bank/phonemes.json | 403 | 12 of 12 |
| alloflow-cdn.pages.dev/app/rainbow-book.jpg | 329-374 | 7 of 12 |
| alloflow-cdn.pages.dev/stem_lab/stem_lab_module.js | 167 | 12 of 12 |
| alloflow-cdn.pages.dev/help_strings.js | 167 | 12 of 12 |
| alloflow-cdn.pages.dev/generate_dispatcher_module.js | 155 | 12 of 12 |

#### Third-party hosts (per target)

| Target and host | Requests | KB | Runs | Paths |
|---|---|---|---|---|
| live cdnjs.cloudflare.com | 24 | 42 | 12 | /ajax/libs/idb-keyval/6.2.0/umd.min.js<br>/ajax/libs/lz-string/1.4.4/lz-string.min.js |
| live cdn.jsdelivr.net | 6 | 419 | 6 | /npm/chart.js@4.4.7/dist/chart.umd.min.js |
| live raw.githubusercontent.com | 18 | 165 | 6 | /Apomera/AlloFlow/main/psychometric_probes.json<br>/Apomera/AlloFlow/main/psychometric_math_probes.json<br>/Apomera/AlloFlow/main/psychometric_literacy_probes.json |

#### Requests answered with HTML instead of the asset

| Path | Times seen |
|---|---|
| `/app/lang/manifest.json` | 24 |
| `/fonts/Inter-latin.woff2` | 12 |
| `/app/vendor/lz-string-1.4.4.min.js` | 12 |
| `/app/vendor/idb-keyval-6.2.0.umd.min.js` | 12 |
| `/allo-shell-config.json` | 12 |
| `/app/rainbow-book.jpg` | 12 |
| `/app/psychometric_probes.json` | 6 |
| `/app/psychometric_math_probes.json` | 6 |
| `/app/psychometric_literacy_probes.json` | 6 |

## Touch drag in the concept sort ("Rule, Norm, or Just Polite?")

The drags used trusted touch input (CDP `Input.dispatchTouchEvent`) on a touch-enabled context. The game uses HTML5 drag and drop, made touch-capable by the DragDropTouch polyfill that `index.html` loads (`/vendor/drag-drop-touch-2.0.3.esm.min.js`, 200 OK). Cards have `touch-action: none`, and no drag caused a page scroll.

| Device | Bucket | Finger drag | Tap card, then "Move here" |
|---|---|---|---|
| Touch Chromebook 1366x768 | first | moved | moved |
| Touch Chromebook 1366x768 | last | moved (all three buckets are side by side) | moved |
| Phone 390x844 | first | moved | moved |
| Phone 390x844 | last | **not moved** at the default scroll: the bucket's centre is covered by the pinned card deck, so the drop landed on the deck. Moved once the sort area was scrolled so the bucket sat above the deck | moved |

At 390 px the deck takes the lower 25 to 45% of the screen and only the first bucket is fully visible. The floating assistant buttons overlap the sort's close button, and the "Loading tools… N left" pill and "Student tools" sit on the deck. The game code and polyfill are byte-identical live and in the working tree.

## "Clear All Data & Reload"

`index.html` (`desktop/web-app/public/index.html:125-140`) swaps its "Loading..." text for a **Clear All Data & Reload** button once 20 s have passed and `#root` is still empty. The button clears localStorage and every IndexedDB database, including student work saved on the device.

**In the final 12 live runs and the 24 earlier runs:** it never became visible.

**It came close:**
- In 2 of the 24 earlier Fast 3G runs, the button was **injected into the loader in the same tick that hid it**. The interval hides the loader and does not `return`, so a late tick also runs the "> 20 s" branch.
- The smallest margin was 14.8 s.
- Boot probe on harsher links:
  - Slow 3G: #root first child at 20.7 s, watchdog started at 9.5 s, button not shown, launch pad at 37.0 s
  - shared 10 Mbps Wi-Fi (400 kbps each): #root first child at 16.5 s, watchdog started at 5.7 s, button not shown, launch pad at 30.9 s

**Recommended:** return after hiding the loader, and replace the destructive button with a plain Reload. Wiping IndexedDB should never be the first remedy offered for a slow network.

## Other things found on the way

- **Background module queue.** It is parked while the launch pad is open (`AlloFlowANTI.txt:14773-14778`). It then drains about 140 modules three at a time, finishing at 65.2 s (Wi-Fi) and 109.5 s (Fast 3G) on the teacher path. `MiscHandlersModule` (`:14661`) and `SelHub` (`:14332`) are deep in that queue.
- **Working tree vs live.** The working tree measured the same as live within the machine noise. The shell bundle (`main.2e5e6cb6.js`), `sel_hub_module.js`, `misc_handlers_module.js`, `games_module.js` and the polyfill are byte-identical (md5), so none of the defects above is fixed in the tree yet. The local numbers ([data/summary_v2.json](data/summary_v2.json)) predate the driver fix described under "Method" and are shown only for that comparison.
- **The station row in History is a `div` with `onClick`** (`view_history_panel_source.jsx` about 1319). It is not reachable by keyboard.
- **Desktop mode opens the "AI Backend Settings, first-time setup" dialog on these paths.** This is the localhost/desktop bundle, not the web shell. That mode also begins downloading the Kokoro voice model with no user action.

## Method

- **Browser.** Playwright 1.60 Chromium: a new browser process and an empty profile for every run (cold HTTP cache, empty storage), 1366x768, a ChromeOS user agent, and a 4x CPU throttle (`Emulation.setCPUThrottlingRate`).
- **Networks** (`Network.emulateNetworkConditions`):
  - *School Wi-Fi*: 40 ms, 10 Mbps both ways.
  - *Fast 3G*: the DevTools preset (562.5 ms, 1.44 Mbps down, 675 kbps up).
  - *Shared Wi-Fi* (boot probe only): 80 ms, 400 kbps, which is one 10 Mbps link split across 25 Chromebooks booting at once.
  - *Slow 3G* (boot probe only): 2 s, 400 kbps.
- **Service worker blocked.** The app's worker calls `clients.claim()` on the first visit, and requests it proxies would escape page-level throttling. On a cold visit it only precaches the four shell files the page already fetched, so the cold numbers barely change. Warm revisits would be faster than shown here.
- **Timing is in-page.** An init script installed before any app script records `performance.now()` for each milestone:
  - DOM milestones, from a `MutationObserver` on `childList` plus the body and loader attributes;
  - module registration, on the loader's own `alloflow:module-registry-changed` event;
  - background queue size, from `__alloModuleSnapshot()`;
  - long tasks, and the `ui_strings.js` `responseEnd`, from `PerformanceObserver`.

  For each step, a hit test records when the control that step needs is actually clickable: present, visible, and on top at its centre by `elementFromPoint`. It samples every 50 ms, only while that step waits. The driver's own polling only decides *when to click*; no number here comes from it.
- **The driver clicks as soon as a control is clickable**, with no think time, so every figure is a floor for a real person.
  - **Load Project failures:** the driver retries the moment the handler registers, which is the earliest a retry can work and a moment no person can know. It retries with the same file first, as a person would, then with a renamed copy.
  - **Unopened tool:** when the pack link does not open the tool, the driver taps the station's "1. Crew Protocols" button as soon as it exists (at the end of the 20 s window).
  - **Counting:** clicks are the driver's own step list. A file pick is one selection in the OS dialog; each is at least two more clicks in the real ChromeOS picker.
- **What-if runs** emulate four proposed fixes inside the real live app:
  - Load Project promotes and awaits its handler (the host's own `__alloLazyFileIntake`);
  - the pack link requests its tool (`__alloEnsureSelPluginLoaded`);
  - the closed analytics panel's downloads are blocked;
  - the missing vendor, font and logo files are served from the repo. These skip the throttle (about 70 KB, about 0.4 s on Fast 3G), so that part is slightly optimistic.

  The strings change is not emulated: blocking `ui_strings.js` leaves most labels blank for good, which no one would ship.
- **Working tree.** The repo is served on `http://127.0.0.1:3000/app/` by a small static server that mirrors Cloudflare Pages:
  - the repo root is the origin;
  - a missing path returns the root `index.html` as `200 text/html`;
  - brotli at quality 4 matches the CDN's byte counts (540,816 vs 547,463 B for `main.js`).

  On localhost the shell's own local mode loads modules from the tree. That mode also turns on the desktop-bundle branch (an AI Backend dialog, which the driver dismisses and does not count, and the Kokoro voice download). The transport is HTTP/1.1, not Cloudflare's HTTP/2 or 3. Minting a certificate for the production domain was declined, so the tree cannot be served under the live hostname.
- **Shared, loaded machine.** About 15 agents were working on this PC, and Windows reported 82 to 100% CPU load for nearly every run. Each run records a fixed CPU workload timed under the same throttle (`calibMs` in the data), and ranges are wide for that reason.

### Two driver corrections, and why the data comes in three generations

1. **The first instrumentation slowed the app it measured.** It ran a document-wide observer on `style` and text changes and scanned every button's text on each mutation batch. An interleaved A/B test on Fast 3G compared it with a minimal body-class observer:

   | Instrumentation | Launch pad on screen |
   |---|---|
   | first version | 40, 71 and 77 s |
   | minimal body-class observer | 13, 19 and 21 s |
   | rewritten version (childList only, marks checked only while a step waits, selector-based) | 13, 16 and 26 s |

   Run data: [`data/overhead_check_v1.json`](data/overhead_check_v1.json) and [`data/overhead_check_v2.json`](data/overhead_check_v2.json). The rewritten version is indistinguishable from the minimal observer, so the first generation's timings ([`data/summary_v1.json`](data/summary_v1.json)) are not used. Its request lists are unaffected, since they don't depend on timing.
2. **The driver waited for a label a person would not.** The launch-pad card reads "Full AlloFlow" until the remote strings arrive, then "Full Platform". The second generation looked for "Full Platform" by text. It therefore waited for the strings (about 53 s after the card was on screen on Fast 3G) and kept the background queue parked all that time. The final generation clicks the card, and the wizard's unlabeled X, as soon as they are clickable. Other steps still wait for their labels, because a person has nothing to go on until then. The second generation is kept in [`data/summary_v2.json`](data/summary_v2.json).

## Data and harness

- [`data/summary.json`](data/summary.json): every per-run and aggregate figure behind the tables (final runs).
- [`data/runs/`](data/runs/): raw per-run timelines, including marks, clicks, module registrations, queue, long tasks and requests.
- [`data/summary_v1.json`](data/summary_v1.json) and [`data/summary_v2.json`](data/summary_v2.json): the earlier driver versions, kept as evidence for the observer effect and the label wait described in "Method".
- [`data/overhead_check_v1.json`](data/overhead_check_v1.json) and [`data/overhead_check_v2.json`](data/overhead_check_v2.json): the observer-effect A/B tests.
- [`harness/`](harness/): the server, driver, what-if driver, touch test, probes and aggregation scripts (see Reproduce).

## Reproduce

The scripts are in [`harness/`](harness/). They import the repo's own Playwright by absolute path (`C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/playwright`), and several default to output under `C:/tmp/alloflow_dispatch/wave1/K4_scratch`. Pass `--out=` to change that.

```
# working-tree target, in its own terminal: serves the repo like Cloudflare Pages on :3000
BR_QUALITY=4 node harness/serve_tree.mjs C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated 3000

# one timed run: --target=live|local --net=wifi|fast3g --flow=teacher|student
node harness/measure.mjs --target=live --net=fast3g --flow=teacher --run=1 --out=runs

# the same path with fixes emulated (load, link, bytes, vendor; any subset)
node harness/measure_whatif.mjs --target=live --net=fast3g --flow=teacher --run=1 --whatif=load,link,bytes,vendor --out=runs_whatif

# boot only: does the "Clear All Data & Reload" watchdog show? (--net=wifi_shared|slow3g|fast3g)
node harness/measure_boot.mjs --target=live --net=wifi_shared --run=1 --out=runs_boot

# touch drag in the concept sort: --device=chromebook|phone --bucket=first|last
node harness/touch_sort.mjs --target=live --device=phone --bucket=last

# aggregate, then the README tables
node harness/analyze.mjs runs summary.json
node harness/tables.mjs summary.json

# probes behind individual claims
node harness/overhead_check.mjs 3      # instrumentation A/B (observer effect)
node harness/probe_prelabels.mjs teacher   # labels before ui_strings.js arrives
node harness/probe_strings_cache.mjs   # the strings cache and the localStorage quota
node harness/initiators.mjs            # which code requests each heavy or fallback URL
```

Add `--shots=1` for a screenshot at each step. Keep those runs out of the statistics: a screenshot under a 4x CPU throttle delays the next click, and the background queue keeps loading in the meantime.
