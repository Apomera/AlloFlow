# Persona conversation navigation and saved-session recovery

Implemented September 19, 2026.

## Changes

- On phones, character details collapse into an accessible disclosure button. The conversation uses the remaining height, keeping the latest-reply control and writing box on-screen during long interviews. Details can still be expanded and scrolled; the desktop character panel remains visible.

- Both individual interviews and panel discussions offer **Jump to latest** when the reader scrolls back. A **New reply** notice appears when another response arrives, while preserving the reader's scroll position. Selecting the control focuses the transcript and resumes following new messages. Resuming a saved conversation also restores automatic following.
- Transcript regions support keyboard focus and show a visible focus indicator. A polite status message announces that an unread response is available.
- Failed **Saved sessions** loads offer **Retry loading saved sessions**. Retrying keeps focus inside the dialog while its contents reload. Closing with Escape or the Close button returns focus to the opener, including when pointer activation did not first focus that button.
- Rapport percentages use darker green, yellow, and red text. Browser accessibility checks exposed insufficient contrast in the middle rapport range.
- Persona regression assertions now inspect the extracted host handlers for reflection generation, automatic reading, and teacher edits, with host delegation assertions retained. Seven older checks were still looking for those implementations in the main application file.

The chat renderer was rebuilt in both distribution locations, and its CDN loader version was refreshed. English labels have matching source and desktop copies, with fallback text for language packs that do not yet include these labels.

## Verification

- **161 Persona unit checks passed** across 12 files: 154 in the final full run, plus all seven workspace checks in a targeted rerun. The workspace suite exceeded its default 10-second setup timeout before running; its rerun used a 60-second setup allowance. See [workspace rerun](unit-workspace-results.json).
- **20/20 Chromium browser scenarios passed**, including six new navigation/archive scenarios. The navigation checks assert viewport visibility and at least 180 px of reading space with character details collapsed.
- Bundle syntax, matching source/desktop distribution files, English string parity, and the chat loader version passed verification.
- Visually inspected the final individual-interview phone layout, new-reply notices in both modes, and the saved-sessions dialog.

The browser fixture uses the shipped chat and workspace modules, React, generated Tailwind styles, and application styles. The six added scenarios cover individual and panel conversation navigation at 375 px and 1100 px, plus failed archive loading and focus restoration in both modes. Existing scenarios cover the composer, mode switching, hints, retries, and workspace selection. Accessibility checks use axe WCAG A/AA rules.

Archive responses and arriving messages are controlled in the fixture. These checks do not exercise live AI services or real saved-session storage. Panel portrait and harmony components are fixture stubs.

Reproduce from the repository root:

```powershell
npx vitest run tests/persona_ --maxWorkers=1 --testTimeout=30000 --hookTimeout=60000
npx playwright test --config reports/persona-conversation-2026-09-19/playwright.config.cjs
node reports/persona-conversation-2026-09-19/verify.cjs
```

Results: [unit results](unit-results.json), [browser log](browser.log), and screenshots in [browser-tests](browser-tests/).
