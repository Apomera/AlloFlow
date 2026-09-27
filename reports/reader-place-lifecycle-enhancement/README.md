# Track 03 — page lifetime, export, and storage recovery

Completed local implementation/candidate validation on 2026-09-26.
Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
Checked HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb`.
This is a local source baseline, not evidence of a deployed release.

The user authorized the recommended follow-ups. On rechecking source, the
previous conflict-review UI had already been integrated by track 01. Track 01
is still actively assembling the shared reader. This pass changes only the
owned persistence helper, a new helper test file, documentation, and this
isolated candidate. No canonical reader, builder, generated bundle, shared
translation catalog, host, or other owner's test was edited in this pass.
No deployment, server, install, Git mutation, external request, live-app state
change, or message to another chat was performed.

## Implemented behavior

- A page-level, dynamically attached `beforeunload` guard covers pending/failed
  answers, anonymous work, and recovery copies, including previously opened
  readings. The normal reader guard survives component unmount. Preview guards
  are removed when the preview closes. Position-only activity and blank
  anonymous answers do not create a warning. A successful save removes the
  warning unless recovery copies still need attention.
- A readable text download includes the active learner's opened readings,
  each exact passage, section/question labels, answers, bookmarks, and recovery
  copies. It never enumerates other learners' work. Selectable text remains
  available when downloading is unavailable. The UI reports a download
  request; it does not claim the browser completed or the user retained it.
- Explicit storage review can remove the current learner/version's saved
  record, or repair its malformed fields while retaining readable data. The UI
  requires acknowledgment that needed work has been copied. The raw original
  row and displaced local work remain in scoped page-memory recovery copies.
  Changed drafts or saved rows invalidate the review under the shared Web Lock.
  Failed writes leave the old durable bytes and typed draft intact.
- Removal can free a protected capacity slot, including from an oversized
  store. Neither queued nor later scroll/retry saves recreate an intentionally
  removed reading. A new authored answer/bookmark can intentionally save again.
- Size failures now expose structured `problem` metadata distinguishing an
  individual answer from the total store budget. The UI identifies the affected
  section/question, distinguishes browser quota, and explains the recovery path.
- Existing learner identity, v1 storage keys, exact-version matching, legacy
  read support, protected eviction, and anonymous non-persistence are preserved.

## Directly changed files

- `reader_place_store.js`: additive `watchPage`, `hasUnsavedWork`,
  `hasSessionWork`, `exportSession`, `inspectSaved`, and `manageSaved` APIs;
  diagnostics; suppression of accidental recreation after removal.
- `tests/reader_place_lifecycle.test.js`: 13 focused lifecycle/management cases.
- `docs/reader-place-persistence-contract.md`: follow-up link.
- This report directory: UI delta, preparation and validation fixtures,
  generated candidates, results, and handoff.

The existing helper regression file is unchanged in this pass.

## Candidate and integration

`lifecycle-ui.jsx` contains the bounded new UI. `prepare.cjs` applies it to the
current shared reader in this directory only, embeds both
`reader_place_store.js` and track 04's `reader_support_drafts.js`, and generates
`shared-ui.patch` for the canonical reader source and root English catalog.
Preparation records input SHA-256 values in `candidate-inputs.json` and rejects
inputs that change during compilation/diffing. Generated candidate files must
not be copied wholesale over the active shared reader.

Validated helper SHA-256:
`b1861d25b5466d829b05e115cba776bd8d9cc419d12598d473ff1b6b20a9d2fc`.
Validated pre-delta reader SHA-256:
`687866a6202a20700ba8dd40bcf59a7b8a5edc0552ffed4091f8c764a01ba9f1`.
The full helper/source/catalog input hashes are in `candidate-inputs.json`.
The final `handoff-input-status.json` confirms that the tested helper stayed
unchanged while shared reader source advanced. The bounded patch still passed
`git apply --check --whitespace=error-all` against that newer source. Scoped
whitespace checks were clean. Do not treat candidate testing as validation of
all newer shared reader changes; rerun after integration.

Integration owner 01 should:

1. Preserve the in-place helper/test changes and check the patch against current
   reader/catalog bytes. Re-run candidate preparation or rebase individual
   hunks if the integration surface changes.
2. Apply only the bounded delta, preserve all other tracks, merge the root
   catalog into its desktop/public mirror, and retain both helper dependencies
   in the shared builder. Rebuild the two reader bundles together.
3. Set `ALLO_READING_RECOVERY_UI_ROOT=./` for the validation process and run the
   candidate suite and Chromium script below against integrated artifacts.
4. Resolve the separately reproduced surrounding failures described below,
   verify mirror parity and input stability, and record the assembled result.

Track 03 releases helper/test ownership at this handoff and does not hold shared
reader ownership. Track 12's existing host-owned learner contract is unchanged.
Track 17 can translate the additions enumerated in `strings.json` after merging.

## Executed verification

```text
node reports/reader-place-lifecycle-enhancement/prepare.cjs
node node_modules/vitest/vitest.mjs run --config reports/reader-place-lifecycle-enhancement/vitest.config.mjs --reporter=default --reporter=json --outputFile=reports/reader-place-lifecycle-enhancement/test-results.json
node reports/reader-place-lifecycle-enhancement/browser-check.cjs
git --no-optional-locks apply --check reports/reader-place-lifecycle-enhancement/shared-ui.patch
```

Final combined run: **159 passed, 4 failed, 163 total across 9 files**.
All 58 persistence/recovery cases passed: 32 existing helper, 13 new helper,
and 13 candidate UI cases. Reader-place workflows, keyboard, render cost, and
sentence-link suites also passed. The patch applicability check succeeded and
did not apply the patch.

The four surrounding failures were reproduced without this UI delta using
`baseline-check.cjs`, which reconstructs and hash-verifies the exact pre-delta
source before compiling it into a report artifact. Its two-suite run recorded
22 passed and the same four failed test cases in `baseline-results.json`:

- Two `reader_display_menu.test.js` teacher-drawer cases expect a
  `simplified-teacher-tools-panel-*` node which the pre-delta reader does not
  render.
- Two `reader_i18n.test.js` cases identify missing word-help catalog entries
  and untranslated support-draft conflict text. That suite reads canonical
  source/catalog files by default; additional popup-fallback discrepancies
  appeared as shared integration advanced. The reproduced baseline failures
  and original missing keys are preserved in the JSON results. Every new
  lifecycle/recovery string passes the candidate-specific registration check.

The first broader run (160 passed, 2 failed) preceded the final removal guard
case and further concurrent reader changes. It is superseded by the final
run, not added to the totals. None of the failures was hidden or changed here.

**All 8 real Chromium checks passed**, recorded in `browser-results.json`:
real Web Locks and two tabs; native storage events; independent/conflicting
answers; stale choices; actual before-unload dialog dismissal/acceptance and
reload; lock-delayed saving; injected denied reads; malformed JSON; native
localStorage quota exhaustion; a legacy direct writer detected on retry;
exact-version bookmark separation; and an actual readable recovery download
from the rendered reader. The downloadable contents were read and checked.

Browser fixtures use intercepted localhost URLs, isolated temporary contexts,
and locally installed dependencies. No server listens and no request reaches
the deployed app. The screenshot is a functional fixture without production
CSS; it is not a production visual-layout sign-off.

## Limits retained deliberately

- Before-unload prompts are best effort and browser-controlled. No protection
  against crashes, forced termination, or every mobile lifecycle is claimed.
  Downloading does not automatically dismiss the warning or discard copies.
- A wholly malformed JSON root cannot be safely assigned to one learner.
  The UI preserves it and offers draft recovery; it does not reset a collection
  that could contain other learners' work. Row-level repair/removal does not
  rewrite other learners' values. Other malformed rows can still block saving.
- Legacy open tabs do not use this locking protocol. Detection on retry was
  tested; atomic safety against arbitrary legacy writers is not claimed.
- Tests ran in Chromium and jsdom. Other browsers and the deployed release were
  not exercised. New UI behavior remains in this candidate until track 01
  integrates and rebuilds the canonical reader.
