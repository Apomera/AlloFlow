# Track 18 — reader accessibility candidate

Implemented in an isolated source snapshot of `fd4044c862ed9b345b340d69cb1411a19c09dafb`. The shared checkout still reported this HEAD at final verification, but has concurrent uncommitted reader changes. This is not a deployed-release verification. The earlier `d2351f4…` audit baseline is superseded.

The managed full checkout failed with “No space left on device” while copying historical reports and was automatically cleaned up. A small source snapshot is at `../../.tmp/reader-a11y-isolated18/`, with junctions to the existing installed dependencies. No dependency installation was required. No applicable AGENTS.md was found during the investigation. Shared production reader, host, CSS and generated files were not edited by this track.

## Delivered change

`reader-accessibility.patch` contains eight source/test/fixture files. `candidate/` contains the same files for review. The patch applies to the audited baseline and was independently applied in a disposable directory; resulting contents match after Windows CRLF/LF normalization. `manifest.json` records hashes and validation.

| Change | Evidence and scope | Candidate source location |
| --- | --- | --- |
| Preserve headings and links in Original/Both Explain mode; use a separate native Explain button and ignore descendant control activation | Source defect; DOM regression tests and Chromium Enter/Escape exercised | `candidate/view_simplified_source.jsx:3827` |
| Recover focus after adaptation discard, apply, stale result, external version invalidation and undo; preserve focus already moved elsewhere | Source gap; DOM tests reproduce invalidation dropping focus to body and verify recovery | `candidate/view_simplified_source.jsx:3609` |
| Scope reader IDs per instance, including preview sentences, and omit references to unmounted disclosure panels | Source defect; DOM and browser checks find no duplicate IDs in student preview. Main `sentence-N` IDs remain unchanged for host read-aloud integration | `candidate/view_simplified_source.jsx:1754` |
| Let the student-preview header scroll with its content | Chromium reproduced a focused Read control hidden behind the sticky header at 320×256. After the change, 20 Tab transitions remain visibly reachable at normal and doubled text sizes | `candidate/view_simplified_source.jsx:3596` |
| Give Selected passage a persistent visible Close, allow custom controls to wrap, and return focus from the custom subview | Source gap plus narrow-width verification; Escape from the input closes only the subview. Closing the subview using its button also returns focus to persistent Close | `candidate/view_simplified_source.jsx:4321` |
| Wrap definition/revision headers and keep Close/Replace reachable | Narrow-layout risk addressed; Chromium checked long content at 320 CSS pixels with text-spacing overrides | `candidate/view_simplified_source.jsx:4321` |
| Keep popup Listen/Stop text in the accessible name | Source label mismatch; DOM tests verify both playback states | `candidate/view_simplified_source.jsx:2961` |
| Add persistent polite status regions for definition, phonics and revision loading/completion | Source announcement gap; DOM tests verify the same status node updates. Actual screen-reader announcements remain unverified | `candidate/view_simplified_source.jsx:1744` |

No global 44px minimum was imposed on inline word targets. The WCAG 2.2 AA target-size criterion is 24×24 CSS pixels with exceptions, including inline targets; 44×44 is the enhanced criterion.

## Verification completed

- 209 tests passed, zero failed, across 11 focused suites. See `validation/unit-results.json`.
- Chromium 148.0.7778.96 passed 12 fixture cases. See `validation/browser-results.json`.
- Browser cases: definition/revision/custom selection/comparison at 320×640 with and without spacing overrides; student preview with unique IDs and Escape return; nested Focus Reader Escape preserving Immersive Reader and restoring its opener; student preview at 320×256 with normal and simulated 200% text. Revision Replace and popup Close were focused and checked within the viewport. Original Explain was activated with Enter and closed with Escape back to the same button.
- Spacing fixture: line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph spacing 2em. The 200% fixture doubles computed font sizes; it is not a browser text-zoom test. A 320×256 viewport exercises relevant small-viewport geometry; it is not actual 400% browser zoom.
- Fixture uses production React, the baseline AppStyles and reader modules, and generated Tailwind CSS. It intercepts requests in memory, uses disposable state and makes no model calls or live application writes. Reduced-motion emulation is enabled; this alone does not verify every animation.
- Root and desktop-public candidate generated reader copies match byte-for-byte. Generated output is omitted from the integration patch: regenerate after source integration.

Commands, from the isolated snapshot or integrated checkout:

```powershell
node _build_view_simplified_module.js
node node_modules/vitest/vitest.mjs run tests/reader_route_a11y.test.js tests/reader_keyboard_a11y.test.js tests/reader_sentence_links.test.js tests/view_simplified_wcag_a11y.test.js tests/view_simplified_dialog_a11y.test.js tests/reader_display_menu.test.js tests/reader_layout_quick_wins.test.js tests/adapted_reading_enhancements.test.js tests/adapted_reading_popup_read_aloud.test.js tests/reader_sentence_numbering.test.js tests/reader_place_review_adapt.test.js
node dev-tools/reader_route_browser.cjs
```

## Integration ownership and order

The reader owner/integrator should merge the small source delta into the assembled 04/09/10 reader. Do not overwrite the current reader with the baseline candidate file. Review `reader-accessibility.patch` and port conflicting hunks, especially preview state/effects, the exact renderer, and popup markup. Keep any reader-place persistence work and updated build-input concatenation already present in the shared checkout.

Track 18 owns the new route test and browser fixture and the five existing test-selector/name updates. The shared reader owner owns `view_simplified_source.jsx`; build/release ownership covers generated reader copies, Tailwind output and any host asset pins. This candidate changes neither `app_styles_source.jsx` nor `immersive_reader_source.jsx`. Regenerate with the assembled build scripts, update asset pins through the normal integration process, and rerun the focused commands after 04/09/10 are assembled.

## Remaining manual acceptance gates

These are unverified risks, not claims of reproduced failures or an accessibility conformance certification. Automated DOM/Chromium checks do not establish real screen-reader or mobile behavior.

| Route/task | Required focus, announcement and visibility outcome |
| --- | --- |
| Original and Both: navigate headings and links, edit a gloss, then activate Explain with Enter and Space | Heading semantics remain intact; links and Edit perform only their own action; Explain opens a named Selected passage dialog; Escape/Close returns to its initiating control |
| Adapted reading: use Read, Word meaning, Word sounds and Explain; move between inline targets, including RTL text | Roving targets remain keyboard reachable; no nested interactive control captures a descendant action; no keyboard trap; inline targets are assessed with applicable target-size exceptions |
| Definition/phonics/revision: wait for loading, ready and error; listen/stop; replace text using a disposable fixture; close | Dialog name and concise status updates are announced once appropriately by real AT; focus stays inside the active modal; long content scrolls; Close and Replace are reachable; closing restores a useful opener |
| Selected passage: open Custom, enter text, leave using Escape and its Close button; then dismiss the whole dialog | First Escape exits Custom only and focuses persistent Close; a later Escape or Close exits the dialog; no lost focus or hidden input/action at spacing or zoom overrides |
| Teacher adaptation: preview, discard, apply, undo; invalidate a pending preview by changing version; exercise delayed responses | Preview receives focus; discard/stale/version removal returns to a surviving trigger; apply reaches Back to previous version; undo returns to the trigger; unrelated user focus is preserved; status is announced |
| Student preview: traverse controls and passage, open Display/Practice/section prompts, then close | All IDs and relationships belong to the correct instance; background content is not exposed as the active modal by the AT; Tab/Shift+Tab remain contained; no focused control is obscured; Close preview restores its teacher opener |
| Immersive → Focus/Chunk/Crawl/Karaoke; also open available word-help overlays | Only the active layer handles Escape and focus; closing a child restores its trigger in the surviving parent; all close/settings/playback controls remain reachable in short viewports; verify screen-reader browse-mode isolation |
| Edit and word-help authoring routes: change disposable text, save/cancel, close | Labels identify inputs and controls; validation/save status is announced; no save/close control is lost; focus returns to a surviving control after removed editor content |

Repeat these tasks on the assembled checkout in keyboard-only desktop browsers, NVDA with Firefox/Chrome, VoiceOver with Safari, and a real touch device with its screen reader. Cover 320 CSS-pixel width, actual 200% text enlargement, actual 400% browser zoom, the spacing override values above, all supported reading/shell themes, forced colors and reduced motion. Check focus occlusion while scrolling nested/sticky layers and opening the mobile keyboard. Record actual browser/AT versions, deployed release identity if testing deployment, and expected versus observed behavior.

Standards references: [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), and [modal dialog keyboard/focus guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
