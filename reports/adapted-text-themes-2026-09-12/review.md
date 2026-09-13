# Adapted reader theme refinements

Theme behavior now stays consistent across the reader's text, highlights, paragraph focus, and word-help popups. The surrounding app retains its own theme.

## Changes

- **Complete picker:** Dark remains available when the app is dark, and Dim is included. Previously those saved values could display as Default because their options were absent. The selector has a visible Reading theme label and a larger touch target. Use app theme clarifies the default option.
- **Reading canvas:** The passage card follows the selected reading palette. App-default dark mode uses a dark reading surface instead of the orange card's unrelated dark utility color.
- **Inline reading:** Clickable sentences and words keep ordinary prose layout. Shared button rules no longer add borders and separate fills around every interaction target.
- **Listening and focus:** Active sentences, hovered text, and keyboard-focused words use the reading palette's ink/highlight pair. Active narration also has an underline, and keyboard focus has a visible outline. This fixes highlights that disappeared in light app mode and dark-on-dark narration text in app-default dark mode.
- **Paragraph focus:** The focused paragraph uses the selected palette's raised surface and a leading edge indicator. Its reading area no longer forces black behind a light reading palette.
- **Word help:** Definition/explanation dialogs have opaque, themed surfaces. Translucent pale panels inside dark dialogs are remapped to the appropriate surface, preserving readable explanations and badges.
- **System settings and print:** System high-contrast mode uses system highlight colors. Print keeps reading text black and removes inline control borders.
- **Continuity:** Changing only a theme preserves the passage node, reading width, expanded practice controls, and open help. It does not stop playback or clear the current reading state.
- **Build:** The reader build now compiles and synchronizes shared styles alongside the reader, with atomic style writes and updated canonical content-hash references.

## Verification

- **93 tests passed across 7 suites**, including reader behavior, popup read-aloud, keyboard paragraph focus, accessibility contracts, palette contrast, and shared header theme/motion behavior. See `focused-tests.json`.
- **60 browser combinations passed:** all 10 reading themes under light, dark, and contrast app themes at 390px and 1280px. Checks cover picker values, prose borders, narration contrast, keyboard word focus, paragraph focus, popup contrast, and overflow. The phone cases also run axe color-contrast checks with a definition popup open. See `theme-matrix.json`.
- Additional browser checks passed for forced colors and print. Browser fixtures use real React, reader and AppStyles modules, app labels, and generated Tailwind utilities; AI/audio callbacks remain stubbed.
- Root/public reader and style modules match, and canonical cache pins match their current hashes. See `build-verification.json`.
- Final warm and app-default dark screenshots were visually inspected. Other screenshots show dark, high-contrast, and system forced-color rendering.

The broader docsuite audit reports two separate issues: generated theme CSS drift and an unsupported `enabled:hover:bg-indigo-50` variant from `games_source.jsx`. The generated theme block is byte-for-byte unchanged from HEAD; this pass adds scoped reader overrides outside that block. These wider repository issues were not changed here. Browser motion tests that initially timed out passed when rerun with adequate timeouts.

No deployment was performed. New copy is registered in English with translation fallbacks. These are presentation preferences, not claims about learning or reading outcomes.
