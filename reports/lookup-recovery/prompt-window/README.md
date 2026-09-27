# Track 11: complete selected text in lookup prompts

Integrated a bounded engine follow-up that preserves the entire selected word/phrase
when constructing its contextual definition or phonics prompt. **463 tests passed in
16 files, and all 11 isolated Chromium cases passed.** No Git mutation, commit, merge,
push, deployment, install, or other-session messaging was performed.

## Confirmed gap and fix

The prior `lookupContextPrompt` started its excerpt up to 5,000 characters before the
selection and always took 12,000 characters. An 8,000-character selection starting at
offset 6,000 therefore lost its final 1,000 characters from the passage excerpt, while
its reported end offset extended beyond that excerpt. The prompt separately contained
the full selected text, so this was inconsistent context and offsets, not total loss of
the selection from the provider request. Excerpt edges could also split a UTF-16
surrogate pair, and malformed/mismatched offsets were forwarded without validation.

The baseline run reproduced **15 assertion failures**, with four existing-compatible
cases passing and 24 unrelated projection cases excluded by the name filter.
`source-reproduction.json` records that run against `engine.baseline.js`, wrapped from
the captured current source rather than assuming a generated module was current.

The engine now validates that the recorded range actually matches the selected text.
If only an end offset is missing, it derives one only when the start and exact text
match. Invalid or mismatched ranges produce null prompt offsets; it does not guess an
occurrence using a text search.

The normal passage window remains 12,000 UTF-16 code units, with up to 5,000 preceding
units. Surrounding context is reduced first to include the entire selection. If the
selection itself exceeds 12,000 units, the excerpt contains that full selection. Edges
expand by at most one unit each when needed to keep a surrogate pair intact. This is
a context-window policy, not a new hard provider-input limit. Full selected text was
already included in the lookup request. Grapheme-cluster clipping was not added.

Only the serialized prompt excerpt changes. The immutable lookup request retains the
full passage, saved grade, pane language, and original offsets used by popup speech and
dictionary meaning selection. Retry retains the identical prompt after settings change;
close still rejects late completion. Reader, host-handler, dictionary, and locale
implementations were not changed in this follow-up.

## Scope and evidence

Baseline HEAD: `c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`.
Verified HEAD: `a63e347b7d193cbc95b5fc3a9fec844322f1f455`.
HEAD moved concurrently; the scoped engine files remained stable through verification.
Neither HEAD identifies the deployed release. No applicable `AGENTS.md` was found;
the existing shared handoff and ownership notes were inspected and updated.

Changed production scope: `content_engine_source.jsx`, its desktop source mirror,
root/public engine modules, and only the ContentEngine pin in each of the three hosts.
The canonical scoped builder generated the module. The resulting pin is **`698fbbc6`**.
`before.json`, `before/`, and `after.json` retain the precise scoped baseline and output
hashes; `runtime.patch` records the delta. A transient host rename failure was recovered
with fresh guarded reads; the stale task-owned temporary file was removed.

After the first passing run, concurrent work advanced the reader pin from `413cd330`
to `8f2dd725`. The only subsequent differences in all three hosts are that reader pin.
The reader root/public modules match. Those changes were preserved, and the complete
16-file regression and all 11 browser cases passed again against the current reader.
`current-reader-tests.json`, `current-reader-browser.json`, `current-inputs.json`, and
`concurrent-reader-review.json` record this second check; the original evidence and
`after.json` remain frozen. The scoped runtime patch contains only this follow-up's
engine changes and engine-pin updates, not the concurrent reader changes.

Nineteen new unit cases cover 8,000/12,000/14,000-character selections for definition
and phonics, short selections at several offsets, unchanged short passages, both
surrogate-pair edges, a valid missing end, invalid/mismatched ranges, retry, and dismissal.
The added Chromium case uses a native DOM range over an 8,000-character selection and
checks its complete prompt excerpt and relative offsets. The other browser cases retain
bilingual/Arabic context, dictionary recovery, speech arguments, and close behavior.

| Evidence | Result |
| --- | --- |
| `tests.json` | 463 passed, zero failed, zero skipped, 16 production-default suites |
| `browser.json` | 11 passed; zero page errors, external requests, or browser-input drift |
| `current-reader-tests.json` | 463 passed, zero failed, zero skipped, 16 files after the concurrent reader update |
| `current-reader-browser.json` | 11 passed against reader `8f2dd725`; no page errors, external requests, or input drift |
| `verification.json` | Stable scoped engine inputs, exact canonical source/output parity, mirrors and pins; reviewed reader-pin changes only |
| Scoped whitespace check | Passed |

Tests use deferred/mock providers; browser cases use disposable synthetic state with
external requests blocked. Live AI explanation quality, provider size limits, and
pronunciation quality are not certified by these results. No full application build
or deployed-release smoke test ran.

## Handoff

This change is integrated locally and ready for scoped review. Do not reapply the
earlier candidate patches. Preserve concurrent work when preparing any commit or PR.
Dependencies 06 and 17 retain their existing transaction and language contracts; this
follow-up introduces no UI copy, language argument, or saved artifact field.

The 16-file regression gate is the integration gate in `../integration/README.md` using
production defaults. The focused new cases can be run with:

```powershell
node node_modules/vitest/vitest.mjs run tests/reading_lookup_context.test.js --maxWorkers=1 --testTimeout=15000
$env:ALLO_LOOKUP_BROWSER_REPORT='reports/lookup-recovery/prompt-window/browser.json'
node tests/reading_lookup_browser_acceptance.cjs
```
