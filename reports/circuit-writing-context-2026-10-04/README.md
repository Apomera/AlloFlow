The explanation editor now includes an optional **Review my question and prediction** disclosure. Students can see their own investigation plan beside their writing, including original line breaks and text direction. Empty plans offer a short prompt and an **Add question** or **Add prediction** action.

**Edit question** and **Edit prediction** focus the original fields at the top of the notebook. A **Return to explanation** button appears below those fields for the trip back. **Review saved readings** opens the existing comparison from the writing area; the comparison's existing writing action returns to the draft.

Navigation preserves authored text, cursor selections, manual writing size, the selected comparison and open disclosures. Editing a plan field updates its preview through the existing state handler. The review is available before any observations are recorded, and saved-reading navigation appears when a comparison is available.

Verification: **145 tests passed across 10 files**, including 13 new workflow tests. Native Chromium checks cover keyboard navigation, original-field editing and returning from saved readings. Six visual states cover desktop, an empty plan on a phone, long text at 320 px, enlarged text with expanded labels, forced colors and authored Arabic text in an RTL layout. All eight captures were reviewed at original resolution. Automated accessibility checks found no violations in the editor; forced-color contrast was checked using actual computed colors because axe uses authored colors in that mode. The browser checks use a local synthetic CircuitTool host and do not exercise deployment. Final counts and integrity checks are in [validation.json](validation.json).

The first test process failed at startup with a memory allocation error before reporting any test results. The system had about 392 MiB of free physical memory and 322 MiB of free virtual memory when inspected. After the browser closed, the focused tests passed with a smaller V8 heap. The grouped runner uses the same memory bounds and one worker. Details are retained in [test-startup-failure.json](test-startup-failure.json).

- [Desktop writing area](writing-context-desktop.png)
- [Empty plan on a phone](writing-context-phone-empty.png)
- [Long text on a narrow screen](writing-context-narrow-long.png)
- [Enlarged text](writing-context-doubled-text.png)
- [Forced colors](writing-context-forced-colors.png)
- [Arabic plan in an RTL layout](writing-context-rtl.png)
- [Original plan editor focus](original-plan-editor.png)
- [Return to the explanation](writer-return-focus.png)
- [Grouped test receipt](regression-receipt.json)
- [Browser measurements](browser-results.json)
- [Visual review](visual-review.json)
- [Source preservation](source-preservation.json)

Source and desktop mirror match. The eight scoped source fragments reverse byte for byte to the preceding verified version, and the prior test files are preserved. Changes remain uncommitted and unstaged.
