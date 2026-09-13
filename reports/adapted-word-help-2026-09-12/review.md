# Adapted Text word-help refinement — September 12, 2026

## Student experience

Word sounds now offers Hear word, Stop audio, and Try audio again controls. Audio starts on request, with an announced preparation message and a clear retry message if synthesis or playback fails. The clicked bilingual segment's language, selected voice, and reading speed are retained.

Pronunciation and dictionary recordings share one managed player within Adapted Text. Switching recordings, starting shared narration, closing help, changing words or resources, and leaving the reader stop the owned audio. Delayed audio results cannot restart a dismissed popup. Audio URLs owned by the shared TTS cache are preserved.

The close control has a larger touch target and keyboard focus indicator. Long words wrap within the popup. Syllables use the available width, and optional IPA notation is in an expandable section. Missing syllable data does not crash the view. Small pronunciation labels now have stronger contrast.

## Verification

153 tests passed across the final run and targeted retry (tests.json, tests-retry.json, and test-summary.json). Three worker startup timeouts required a retry; the retry passed all 65 affected tests, with a warning about terminating one completed worker. Coverage includes request cancellation, failed-playback retry, bilingual language selection, audio exclusivity, cleanup, cached URL ownership, existing reader behavior, theme consistency, and legacy word-sounds callers.

Twelve Chromium combinations cover light, dark, and high-contrast app themes; 320- and 1280-pixel widths; and 16- and 24-pixel root text sizes. The checks verify dialog bounds, horizontal overflow, 44-pixel close targets, audio switching, Escape cleanup, and zero serious/critical axe findings in the tested dialog. Phone screenshots were visually inspected. See browser-results.json.

Root/public reader, content-engine, and stylesheet modules, canonical content hashes, and catalog mirrors are verified in build-verification.json.

## Scope

Local changes only; not deployed. Audio lifecycle tests use controlled audio and TTS doubles rather than live provider calls. Other views retain their existing automatic pronunciation behavior. New copy is available in the English catalog and through reader fallback text.
