# Delivery dialog browser QA

Run from the repository root:

```sh
node reports/novak-delivery-preview/browser-qa.cjs
```

The check loads the actual generated `instructional_context_module.js`, `shared_activity_module.js`, and `view_share_session_surfaces_module.js` into local Chromium, with the local React runtime and existing built desktop CSS. External requests are blocked. `browser-results.json` records the tested artifact hashes and Chromium version.

Four scenarios passed:

- At desktop width 1280 and mobile width 320, the original and companion show their opening order, matching original, and one validated, unsuppressed word support. Metadata excludes reading and gloss bodies. Neither the document nor dialog has horizontal overflow.
- Keyboard Enter operates the reading disclosure, both conversions, student preview, copy, and close. Conversion callbacks receive only the saved companion ID, even with an unrelated current selection. Mutating the callback's argument does not mutate the saved summary.
- Legacy links without a recorded selection retain preview and copy; both conversion controls are disabled and explain reselection.
- A reduced reading with an HTML-looking title displays literal text, reports the unavailable matching original and reduction, and creates no image or event-handler element.

No page errors or external requests occurred. Screenshots: `saved-selection-1280.png`, `saved-selection-320.png`, and `escaped-reduced-320.png`. The 320-pixel screenshot was visually inspected: text is readable, contained within the dialog, and the dialog scrolls vertically for its actions.

Scope: component integration and local contract behavior. Callbacks and decorative icons are controlled fixtures; the dialog wrapper is supplied by the harness. This does not validate the full host focus trap, real QR generation, remote upload/hosting, student navigation, live AI output, an installed desktop package, or a deployment. The pre-existing built CSS is used without rebuilding the desktop application.

## Long-assignment and metadata follow-up

Run `node reports/novak-delivery-preview/browser-qa.cjs --edge` for the bounded follow-up audit. Seven scenarios passed in local Chromium 148; `edge-browser-results.json` records artifact hashes, tab order, and dimensions.

- At widths 1280 and 320, 25 explicitly selected companions plus 25 matching originals render all 50 reading rows. Neither the page nor the dialog scrolls horizontally.
- Tab reaches the reading-list scroll area. End reaches the final reading: scrollTop 5100 of 5292 pixels at desktop width, and 6412 of 6604 pixels at mobile width, both with a 192-pixel viewport. Tab then reaches preview, copy, the link field, revoke, and both conversion buttons.
- Empty packets, schema-1 metadata without fields, absent legacy metadata, and unsupported old metadata safely disable conversion and leave preview/copy usable.
- Missing translations use readable fallbacks. The actual host translator returns undefined for missing keys; that behavior is used in these scenarios. An additional key-echo robustness check also passes for the new summary.

No reproducible user-visible issue was found within this scope, and no production file was changed for this follow-up audit. No page errors or external requests occurred. Screenshots are `long-assignment-1280.png` and `long-assignment-320.png`; the mobile screenshot was visually inspected with the final reading in view. This is a Chromium component check; other browser engines and the full host focus trap were not exercised.

## Saved AI policy conversion comparison

Run `node reports/novak-delivery-preview/browser-qa.cjs --before-policy` and `node reports/novak-delivery-preview/browser-qa.cjs --policy` to compare the saved pre-change view with the current generated view. The before view is rebuilt in memory with the production `buildFirstWaveModule` wrapper; it does not overwrite application files.

Both saved settings (`off` and `student-byok`) reproduced the old missing-options behavior. In the current generated view, keyboard activation passes `{ aiPolicy: savedPolicy }` to self-contained conversion and `{ includeSharedActivity: false, aiPolicy: savedPolicy }` to mailbox conversion. Both retain the saved companion ID. All two before reproductions and two after checks passed, with no page errors or external requests. Evidence: `before-policy-browser-results.json` and `policy-browser-results.json`.

These checks verify actual view-to-callback arguments. The separate `tests/homework_link_conversion.test.js` suite exercises the actual host callbacks and builder, including queued connection and prepared oversize packets. The independent read-only host review found no concrete new regression in those changes.
