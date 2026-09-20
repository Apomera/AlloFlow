# Document Builder enhancements — 2026-09-19

The compact builder now makes its existing tools easier to find, shows image/table actions where formatting normally appears, and offers a current HTML backup when local storage is unavailable. Search and contextual actions retain the preview's available space. Full Pack also respects the structured activity generator's two-attempt recovery limit.

## Behavior

- **Find a tool / Alt+Q:** searches existing ribbon and document-setting labels, sections and tooltips. Selecting a result opens its panel and focuses the actual control without executing its action. Arrow keys navigate results; Escape returns to the search opener. Inactive tabs mount inside the hidden tray only while search is open, so their controls can be indexed without occupying preview space.
- **Contextual controls:** selecting a table offers Add row, Add column and More in the existing compact formatting group. Selecting an image offers alternative text and the existing crop dialog. Returning to text restores quick formatting. Image description edits participate in tracked changes and reject stale image/document/prompt state.
- **Save feedback:** session-only recovery is amber and explicitly asks for a backup. Download backup captures the current clean HTML, including unsaved live edits, without signaling an ordinary completed export or claiming persistent storage succeeded. Downloading does not remove the storage warning.
- **Coordinated retries:** exhausted structured activity recovery reports its attempt count and prevents Full Pack from automatically starting another recovery cycle. Provider error properties and the original cause are retained without mutating the original error. Explicit Retry failures remains available for retryable failures.

## Verification

- **243 distinct focused unit tests passed across seven files:** `document_builder_tool_discovery`, `document_builder_draft_protection`, `structured_activity_recovery`, `full_pack_generation_diagnostics`, `document_builder_refinement_pass`, `document_builder_export_handoff`, and `activities_resource`.
- The first combined unit run passed 206 tests but could not start one worker under machine load. That remaining suite was run separately; one stale source-location assertion was updated to follow the existing extracted host handler. The final two-file recheck passed all 49 tests, including the 12 tool-discovery tests already counted above. See `builder-tests.json`.
- **25 Chromium browser tests passed** against the actual generated builder module, with no retries. Coverage includes desktop/tablet/phone layouts, light/dark/contrast themes, editing and undo preservation, nested Escape/focus behavior, export access, saved preferences, search, contextual controls and a simulated quota failure. Final runner result: `25 passed (5.6m)`; `browser-final/.last-run.json` records no failures.
- New browser checks assert unchanged preview width/height while searching, correct focus when revealing an unmounted tab, no horizontal overflow, current edits in the downloaded backup, and no browser errors. Initial checks exposed missing inactive-tab search results and a table shortcut targeting an unmounted panel; both were corrected before the final passing run.
- Reviewed `tool-search-390.png`, `image-tools-390.png`, and `save-warning.png`. Desktop versions and the synthetic downloaded HTML are also included.
- All three canonical module builds succeeded; root and `desktop/web-app/public` copies match byte for byte. Scoped whitespace checks passed.

Final generated module SHA-256:

| Module | SHA-256 |
| --- | --- |
| generate_dispatcher_module.js | ab522bccd3fac2cba2c77a14ffba397d9fdfaa56c1b1d26cd374d49997db58f9 |
| generation_helpers_module.js | e329121ad466f5d70137a4c794ea24f32d175e5eaf0ff4267c5edf59f5a91f4a |
| view_export_preview_module.js | b811874b5f6d630b59dbd9db00faec1b651719e4f1d7e14fdb7dc3570bc4ddb8 |

## Scope and delivery

Changed the three canonical sources, their root/public generated modules, focused tests and this report. Provider behavior was tested with deterministic mocks; no live AI calls were made. The HTML backup is the current document, not a packaged offline project with downloaded external assets.

Changes remain local. No push, deployment or installer build was performed. Existing `desktop/app-build` files differ from both the task-start snapshot and the final modules, and were preserved pending a deliberate desktop build. The shared canonical files already contain other uncommitted work; this pass leaves them uncommitted to preserve ownership of concurrent changes. Task-start snapshots are retained in `.tmp/builder-enhancements-2026-09-19` for isolating this pass during integration.
