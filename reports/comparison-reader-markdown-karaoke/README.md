# Comparison formatting and karaoke read-along

Completed locally on 2026-09-20. No deployment or push was performed for this change.

The Original/Adapted comparison used an exact plain-text renderer and a basic speech action. It now renders supported Markdown headings, emphasis, code, links, quotes and lists, and each pane has a **Read along** button that opens the existing karaoke reader for that pane. Short-text change highlighting compares readable words without showing Markdown delimiters.

Stored original text, snapshots and raw annotation offsets stay unchanged. Glosses, word help, keyboard navigation and linked-passage highlighting retain their source coordinates. The existing exact original-only view remains unchanged.

The karaoke reader receives cleaned sentences and the selected pane's language, including per-sentence languages for bilingual content. The device-voice fallback uses that language too. Comparison playback hides recording/editing controls and disables resource audio capture to avoid saving the original's audio into the currently selected adaptation. Closing returns focus to the invoking button.

Validation:

- **193/193 focused unit tests across seven files passed**: comparison formatting, gloss offsets, navigation, pane-language routing, playback-only capture protection, existing audio loading, persistence and fallback behavior.
- **6/6 Chromium browser scenarios passed** using actual generated SimplifiedView and KaraokeReaderOverlay: long comparison formatting, local WAV playback and animated word sweep, adapted sentence navigation, Spanish device fallback, 320px layout/focus restoration, and no runtime errors or external requests.
- Both sources parse; render-reference checks pass; generated root/public pairs are byte-identical; scoped whitespace checks pass.
- Desktop and phone comparison screenshots and the settled phone karaoke screenshot were visually inspected. An initial browser harness assertion expected bold text where the existing adaptation normalizer produces a heading; another assertion ran before the reader's initialization effect. Both fixture checks were corrected, then all six scenarios passed.

The browser fixture uses a silent local WAV for media playback and an instrumented device speech API. It does not evaluate voice quality, live AI, microphones, screen readers, the full application shell, or a deployed build.

Reproduce from the repository root:

```powershell
node _build_view_simplified_module.js
node _build_immersive_reader_module.js
node reports/comparison-reader-markdown-karaoke/browser-qa.cjs
npx.cmd vitest run tests/adapted_reading_enhancements.test.js tests/novak_reading_navigation.test.js tests/leveled_text_karaoke_persistence_e2e.test.js tests/adapted_reading_popup_read_aloud.test.js tests/tts_karaoke_handoff_regressions.test.js tests/karaoke_tts_regressions.test.js tests/karaoke_tts_review_runtime.test.js --maxWorkers=2
```

Evidence: `tests.json`, `browser-results.json`, `source-verification.json`, `comparison-desktop.png`, `comparison-320.png`, `karaoke-desktop.png`, and `karaoke-320.png`.
