# Prepared reader checks

Run `npm run test:reader:prepared` before handing off prepared-help reader changes. It runs the focused unit/interaction regressions, then Chromium interaction, repeated-activation, preview, list-layout and card-stress checks against the current JSX with production reader CSS. It does not regenerate runtime files, install browsers, contact providers, or operate saved app state.

Use `npm run test:reader:prepared -- --browser=chromium,webkit` for both installed engines. A requested missing engine fails clearly rather than being silently skipped. Output defaults to `reports/reader-prepared-help`; set `PREPARED_HELP_OUTPUT_DIR` to retain a separate receipt. `PREPARED_HELP_SOURCE_DIR` and `PREPARED_HELP_STYLE_DIR` support a frozen integration candidate and its matching app styling. The summary records input hashes and fails if they change during verification.

The card checks exercise narrow/landscape layouts, long explanations, picture attribution, Arabic/mixed text, doubled text and a 320x225 reflow viewport equivalent to a 1280x900 browser at 400%. The 400%-equivalent fixture requires the first explanation line to be visible immediately. A plain HTML keyboard control identifies engines that skip native links; their credit-link keyboard traversal remains explicitly unverified, while focus/visibility is checked separately. Only claim the coverage reported for each engine.

Audio/AI callbacks are mocks. Actual assistive technology, pronunciation/provider cancellation, browser toolbar zoom, complete app/desktop builds and deployed bytes require separate validation.
