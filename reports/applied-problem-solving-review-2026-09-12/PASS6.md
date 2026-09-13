# Pass 6: connect sources to reasoning

Completed searches now stay available when learners move between steps in the same open workspace. Returning to Explore restores the query, results, expanded search panel, and selected destination without another search request. An unfinished search is discarded on leaving the step, with its query available to retry. **Clear this search** clears search UI and leaves saved references and writing intact. Switching resource/profile, revoking runtime access, leaving the workspace, or reloading clears the cached search.

Learners can add a reference to **an existing evidence row** or create a new row. Appending preserves the claim, prior evidence, tradeoff, and lesson connection, while setting the row to **Needs checking**. A full 12-row table can still receive a reference in an existing row. Missing rows, duplicate references, unsafe URLs, and additions exceeding the evidence field’s 2,200-character limit are rejected without cutting off writing. Focus moves to the existing evidence field or the new blank claim, as appropriate.

Saved standalone source URLs now have **Open source** links in the evidence editor and final review, including references collected across multiple searches. Optional questions beside the evidence field cover authorship, date, connection to the claim, and limitations. **Write my source check** focuses the evidence field; it does not insert an answer or mark anything verified. The larger evidence field helps learners read their reference and source notes. Retrieval dates now follow the browser’s local date.

No new saved schema was required. Selected references and learner source notes continue through the existing saving, submission, export, undo, and text-backup paths. Search queries/results stay in temporary component state. This pass makes no additional AI or web-search calls automatically.

## Validation

- **70/70 tests passed across five suites**: source workflow (10), search/evaluation preparation (12), learner interactions (27), exports (12), and backups (9). [Test results](pass6-tests.json).
- Browser coverage at **1280px, 390px, and 320px**: resumed search, source review, and final-review links. **Zero axe violations, horizontal overflow, or page errors** in nine tested states. [Browser results](pass6-browser-results.json).
- A real browser download/reload/restore retained the selected reference and learner source-check notes while leaving search history empty.
- Mobile evidence/source-review layout visually inspected. Screenshots: `pass6-search-{1280,390,320}.png` and `pass6-source-review-{1280,390,320}.png`.
- Source and generated bundles are synchronized; the UI catalog is mirrored in the web-app public directory.

The [updated preview](current-preview.html?pass=6) uses the real component with an authored scenario and mocked AI/search. Changes are local and have not been deployed. The previously prepared live-AI quality evaluation remains pending; this pass does not claim real-generation or learner-trial results. See [the search and evaluation review](SEARCH-AND-EVALUATION.md) for that work’s status and run instructions.
