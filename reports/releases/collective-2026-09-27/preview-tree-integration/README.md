# Current-source preview and Tree Lab integration

Prepared at shared HEAD `1a5067ab673408d8bf33fc6998ab843696043859` on 2026-09-27. The host preimage includes the integrator's newly merged offline-media dependency and autosave changes. Exact preimages and intended postimages are in `preimages.json`; HEAD alone is not the working-source baseline.

`combined.patch` was assembled from the completed isolated preview-focus, preview-scroll, and Tree Lab handoffs. Every existing-source hunk applied with `diff` fuzz factor zero, the resulting patch round-tripped exactly, and `git apply --check` passed against the shared checkout. Candidate source and acceptance-tool syntax were parsed. No runtime tests or browser checks have been run for this newly assembled patch; prior isolated owner results are historical evidence only.

## File map

| Target | Change |
| --- | --- |
| `AlloFlowANTI.txt` | Cancel only pending focus-narration requests when preview transitions; suppress stale speech and automatic opener-focus narration. |
| `view_simplified_source.jsx` | One-line native overscroll containment on the student preview modal. |
| `stem_lab/stem_tool_treelab.js` | Bounded field-guide redesign, condition/season controls, evidence navigation and optional model-grown starting tree. |
| `ui_strings.js` | Sixteen English `stem.treelab` keys inserted into the current catalog, preserving all existing entries. |
| `tests/reader_preview_focus_narration.test.js` | Eleven cases using the actual current host; no candidate transform or environment override. |
| `tests/helpers/reader_focus_effect.cjs` | Minimal host-effect extraction helper; no older host snapshot or patch preparation dependency. |
| `tests/tree_lab_field_guide.test.js` | Six cases using the actual canonical Tree Lab and existing test harness. |

The patch intentionally omits generated reader bytes and desktop mirrors. The root integrator owns applying the patch, rebuilding the current reader, synchronizing both desktop source hosts, Tree Lab/public and English/public pairs, and refreshing affected loader pins. No old isolated module, host, helper or catalog should replace current shared files.

## Application and focused validation

From the repository root, recheck `preimages.json` before applying. Check and apply separately, followed by root-owned generation/mirror/pin work:

```powershell
git apply --check -- reports/releases/collective-2026-09-27/preview-tree-integration/combined.patch
git apply -- reports/releases/collective-2026-09-27/preview-tree-integration/combined.patch
node _build_view_simplified_module.js
```

Focused production tests, after root mirror synchronization:

```powershell
node node_modules/vitest/vitest.mjs run tests/reader_preview_focus_narration.test.js tests/reader_preview_isolation.test.js tests/view_simplified_dialog_a11y.test.js tests/reader_keyboard_a11y.test.js tests/tree_lab_ --maxWorkers=1 --testTimeout=30000
```

Run browser checks sequentially to avoid resource contention:

```powershell
node reports/releases/collective-2026-09-27/preview-tree-integration/focus-browser.cjs
node reports/releases/collective-2026-09-27/preview-tree-integration/scroll-browser.cjs
node reports/releases/collective-2026-09-27/preview-tree-integration/tree-browser.cjs
node dev-tools/check_reader_release.cjs --json
```

The focus and scroll tools load current root `view_simplified_module.js`, `instructional_context_module.js`, and helpers. The focus tool extracts the current root host effect. Tree Lab serves current root `stem_lab/stem_tool_treelab.js` and `stem_lab/stem_lab_module.js`, current STEM browser harness, and the existing compiled app CSS. Its fixtures no longer create or use baseline/candidate source copies.

Browser checks launch fresh intercepted contexts and exercise temporary fixture state. They write receipts/screenshots only under this report directory; they do not start a server or access the live application. Focus covers four viewport/pending-TTS combinations; scroll covers six document/panel configurations; Tree Lab checks thirteen behaviors, fourteen reflow cases, and three theme accessibility scans. These are intended cases, not a claim that the new current-source runs have passed.

## Limits and staging

- New Tree Lab text has English catalog entries and existing fallback behavior. No new non-English translations are supplied.
- Existing Tree Lab browser tests addressing camera/anatomy controls directly may need to open the new `View & anatomy controls` disclosure before clicking them. Investigate any failure against actual user behavior before changing expectations.
- Fixture checks are narrower than the assembled application. Fullscreen stacking, host scrolling, narration, saved learner state, printing, deployed bytes, and physical touch/GPU behavior remain integration acceptance concerns.
- `prepare.cjs` writes only this directory, but requires the isolated handoff checkout to regenerate the patch. It is historical integration machinery, not a production dependency.
- Stage the seven patch targets and root-owned mirrors/generated outputs. The six acceptance scripts/helpers plus this README, `preimages.json`, and `new-translation-keys.json` are compact, reproducible evidence worth retaining. Do not stage older captured source trees or full standalone HTML previews.
