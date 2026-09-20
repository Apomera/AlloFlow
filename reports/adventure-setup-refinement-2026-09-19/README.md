# Adventure setup refinements — 2026-09-19

## Changes

- Custom episode length: the shared Episode length control now offers a 3–50 decision count. Blank or invalid drafts do not replace the last valid state while typing. Leaving the field restores a blank draft or rounds and bounds the value. Open-ended and suggested-choice counts remain independent.
- Student editing: teachers can configure the existing interaction-mode, language, energy/rewards, guidance, visuals and cloud permissions directly in either setup panel. The full lock disables individual permission controls without clearing their values. Existing defaults, including the legacy visual permission default, are preserved.
- Collapsed sections: Story & game rules summarizes energy/rewards, peaceful mode and chance. Saving & permissions shows whether student setup is fixed or adjustable.
- Language management: teachers retain a direct Universal Settings shortcut after adding languages.
- Teacher-defined resources: empty-state examples, accessible field feedback for unnamed and repeated names, matching 80-character name/30-character unit entry limits, and a 24-row add limit. Saved rows beyond the engine cap remain visible and are explained, never silently removed.

The resource feedback follows `applyAdventureSystemUpdate` in adventure_session_handlers_source.jsx: names are trimmed, truncated to 80 characters and compared without case; unnamed and later duplicate entries are skipped; only the first 24 rows are considered. These changes do not change the story engine.

## Verification

- Focused unit suite: 13 passed (setup semantics, summary, view accessibility and root/public bundle parity).
- Browser suite: see browser-results and the final run result. Covers both entry points, teacher-to-student permission behavior, custom numeric drafts, open-ended switching, resource cap/duplicate corrections, language navigation, preserved presets and resources, and light/dark/high-contrast reflow with scoped axe checks at 375px and 1200px.
- Targeted whitespace checks passed. Both view bundles rebuilt and mirrored.
- No live AI session, full-app navigation run, deployment, or commit was performed.

Run browser checks with:

    node node_modules/@playwright/test/cli.js test -c reports/adventure-setup-refinement-2026-09-19/playwright.config.cjs

Final result: **28 browser tests passed** in the completed run. The student-editing section and mobile resource-feedback screenshot were visually inspected. The tested controls had no scoped axe violations or horizontal overflow in the light, dark and high-contrast fixtures.

## Resource recovery and visual-summary follow-up

- Added one-step Undo for the most recently removed resource. It restores the complete removed row at its prior position (or the end if the list is shorter), while preserving edits to other rows. The undo record is local to the open setup editor and clears when the current story scene changes.
- Added polite removal/restoration announcements. Adding focuses the new name field; removing focuses the adjacent remaining row or Add resource; undo focuses the restored name.
- Resource data controls now also disable when the host provides no state setter. Busy/locked setup continues to block removal and undo.
- Visuals summaries include protagonist age and enabled consistent-character and faster-visual options.
- The focused 13-check unit suite passed after rebuilding. Additional browser coverage exercises restoration of metadata and subsequent edits, busy-state protection, focus after list changes, last-row recovery, and collapsed visual summaries.

Follow-up verification complete: **13 unit checks and 32 browser tests passed**. The mobile Undo control was visually reviewed. Existing light/dark/high-contrast reflow and scoped accessibility checks passed. Application changes remain local; no deployment or live AI run was performed.

## Shared pacing editor follow-up

- Custom/preset length presentation now uses shared `episodeLengthMode` metadata. Applying a learning profile explicitly resets it, including when the fixed count is unchanged.
- Switching to Open-ended records `lastEpisodeTurnLimit`; either panel can restore it after reopening the setup. Existing adventures without this optional metadata retain the previous 12-decision fallback.
- Custom length and earliest finale use the same draft-aware numeric input. Valid whole numbers commit during editing. Empty, fractional, and out-of-range drafts do not replace the last valid count until blur restores or normalizes the value. Zero now correctly bounds to three instead of falling back to the prior count.
- The initial browser run exposed a helper-name collision with the gameplay decision counter. The setup helper was renamed to `adventureSetupDecisionCount`, and a unit test now renders the actual combined bundle in both custom-length and open-ended-finale configurations.
- A transient OneDrive error while syncing the sidebar bundle was resolved by rerunning the builder.

Pacing follow-up verification: **14 unit checks and 36 browser tests passed** after the helper collision fix. The final browser run covered simultaneous launch/sidebar controls, setup remounts, same-value preset resets, finale digit entry and bounds, existing permissions, resource undo, and light/dark/high-contrast accessibility and reflow. Targeted diff checks passed. No deployment or live AI generation was performed.

## Student permission clarity follow-up

- Permission-controlled dropdowns, response format, custom guidance, custom art and visual toggles explain teacher restrictions in linked accessible descriptions.
- Temporary processing locks display their own status message and suppress the generic editable-student notice during processing. The teacher-policy explanation remains independent of processing state.
- Consistent characters now uses the existing allowVisualsToggle policy, matching the other visual controls. Explicit false blocks editing; teacher mode and the existing unset-permission default are preserved. Saved values are not changed.
- Added per-surface browser checks for every visual control, allowed-language contrast, response/guidance/difficulty descriptions, busy/unbusy transitions and legacy visual defaults. The restricted student mobile fixture includes an axe and overflow check.

Permission-clarity verification complete: **14 unit checks and 40 browser tests passed**. The student-facing mobile Visuals section was visually reviewed. Linked restriction descriptions, legacy visual defaults, explicit visual locks and busy/unbusy transitions passed in both setup surfaces; scoped accessibility and overflow checks passed. Changes remain local, with no deployment or live AI generation.
