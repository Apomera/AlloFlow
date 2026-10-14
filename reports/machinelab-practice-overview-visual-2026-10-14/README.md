# Machine Lab: clearer saved-practice overview

The skill map now separates checked answers, viewed worked solutions and skills with no saved record into three large count cards. Their solid, striped and empty swatches match the family coverage bars. The saved-total caption and practice-history guidance remain visible above the skill families.

Family headings, coverage text and skill names are larger. Subtle dividers separate each family. Count cards and next-practice shortcuts stack on narrow screens; count labels sit beside their values on phones. All categories retain explicit text and high-contrast patterns.

Only `skillMap()` presentation changed. The underlying record aggregation, skill inventory, three navigation callbacks, calculation models, grading and saved records remain unchanged. The source and public mirror match.

Baseline: `a79635257`. Reviewed source SHA-256: `acace95abe66b48440693edddd610c8f26aa7f1d7723f4c6aed7c75d41e0c366`.

## Verification

75 selected existing tests passed in six serial native processes: 29 skill-map cases, 10 practice-coverage cases, 28 accessibility checks and eight translation-hygiene checks. The wrapper exited successfully. No new unit tests were added for this presentation change.

The browser run passed 1,559 checks across ten mounts and all six machines. It exercised real checked-answer and viewed-solution saves, record versions 1–5, invalid-record filtering, earlier-setup provenance, keyboard navigation, responsive layouts, text contrast and exact family proportions. Six screenshots cover the previous desktop layout, updated rotary and linear desktop layouts, dark phone, forced colors and simulated 200% text enlargement.

Both the browser reviewer and root independently inspected all six screenshots. Native and wrapper processes exited successfully; no failed test or browser runs were needed. `verify-scope.cjs` proves that only the map renderer changed; `verify-evidence.cjs` verifies the source, test receipts and browser artifacts. Final counts are recorded in `validation-summary.json`.

This is a local change; no push or deployment. Browser checks use local Chromium and software WebGL. Forced colors and text enlargement are simulations, not a physical assistive technology session or a deployed host build.
