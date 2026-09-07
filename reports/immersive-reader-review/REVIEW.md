# Immersive Reader review

Reviewed the main Immersive Reader, its toolbar and word controls, Focus Mode (single-word RSVP and bionic chunks), Cinematic Crawl, and Karaoke/Focus Reader. Changes are implemented locally. Generated reader modules and desktop copies were rebuilt, and reader loader cache pins were refreshed.

## Fixes and refinements

| Area | Result |
|---|---|
| Focus playback | Closing or replacing a passage stops timers and countdown. Advancement uses one cancellable timer, without side effects inside React state updaters. Replay starts at the beginning; the last partial chunk uses its actual word count. |
| Focus text | Empty passages have a clear message and cannot start playback. Grapheme-safe highlighting keeps emoji and combining characters together. Long words wrap within narrow screens. |
| Keyboard controls | Space activates reading surfaces once. Native inputs retain their keys, modified shortcuts are ignored, and arrow navigation remains available on the reading surface. Dialog focus wraps and returns to the opener. |
| Toolbar | Settings wrap in a collapsible panel with bounded height on phones. Toggle nodes retain keyboard focus and announce their state. Colour presets display the selection, several control colours have stronger contrast, and Close has the correct label. |
| Reading passage | Words support Enter/Space without adding blank whitespace or punctuation to the tab order. Heading tokens flow together and inherit the chosen colour. Inline typography keeps punctuation attached to words. |
| Reading ruler | Touch/pointer movement and keyboard focus move the reading window. The passage supports Up/Down ruler movement. Shading starts below the toolbar, and initial positioning accounts for toolbar height. |
| Karaoke playback | Keyboard pause stops audio. Stale audio and device-voice callbacks cannot end or advance a newer sentence. Stop/close invalidates queued advances. Changing auto-advance or capture settings preserves current playback. Initial preparation/startup feedback remains visible. |
| Karaoke readability | Unread sentences remain legible across the three palettes. Empty passages and missing audio have explicit feedback; missing audio no longer silently marks a sentence read. |
| Recording | Closing, unmounting, replacing text, or changing sentence invalidates pending microphone permission and releases tracks. Cancelled takes cannot save or replay after the session changes. Microphone and save failures have visible feedback. |
| Crawl | Reduced-motion users start with a still, scrollable passage. Background-tab time gaps are bounded, the ending waits for the final text to leave the viewport, and closing releases ambient audio resources. |
| Main reader exit | Closing clears open submodes and stops chunk autoplay. |

## Verification

- Added behavioral regressions for timing, StrictMode, close/reopen, empty text, Unicode, replay, keyboard controls, generated/device audio races, late microphone permission, recording cleanup, toolbar focus, colour presets, and word activation.
- The broader 20-file reader/audio suite passed **218 of 220 tests**. Two failures existed before this review:
  - The artifact-host test expects CDN URLs in a desktop host whose starting copy already uses relative URLs.
  - The speech handoff test expects tts-unavailable; the committed Phase K implementation already reports browser-tts-unavailable.
- Final focused rerun: **66/66 passed**, including all 23 new behavioral regressions. Results: final-focused-results.json. A prior rerun hit the default five-second test deadline on the busy shared workstation; the final run used a 30-second limit without changing behavioral assertions.
- **19 browser layouts** passed at 1280, 390, and 320 px, including high contrast, long words, ruler bounds, toolbar focus retention, keyboard word activation, nested Escape, and punctuation wrapping. Screenshots were visually reviewed.
- Browser QA uses the actual SimplifiedView, reader modules, production text parser, React, Tailwind, translations, and app styles. Audio/microphone races use controlled test doubles; live cloud synthesis and hardware microphone recording were not exercised.
- Evidence: browser-results.json, test-results-summary.json, and preexisting-checks.json.

## Screenshots

- [Phone reader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/Reader-settings-390.png)
- [Desktop reader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/Reader-settings-1280.png)
- [Reading ruler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/Reader-line-focus-390.png)
- [High-contrast reader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/Reader-high-contrast-390.png)
- [Karaoke reader](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/KaraokeReaderOverlay-390.png)
- [Reduced-motion Crawl](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/PerspectiveCrawlOverlay-390.jpg)
- [Long Focus word](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/immersive-reader-review/Focus-long-word-390.png)

## Reproduce

Browser review: node dev-tools/check_immersive_reader_review.cjs

New regressions: npx vitest run tests/immersive_reader_review_runtime.test.js --maxWorkers=1 --testTimeout=30000

Primary files: immersive_reader_source.jsx, view_simplified_source.jsx, the reader close handler in the three app hosts, and generated module copies. Browser harness: dev-tools/check_immersive_reader_review.cjs. New tests: tests/immersive_reader_review_runtime.test.js.

