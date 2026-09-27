# Track 11 integrated lookup recovery

The reviewed lookup candidates are integrated into the local application source and
generated modules. The focused integration gate passes: **444 tests across 16 files**
and **10 isolated Chromium scenarios**. Source-to-output parity, affected root/public
mirrors, the engine source pair, and all nine executable host pins pass.

No Git commit, PR merge, push, deployment, package installation, full application build,
or other-session messaging was performed. This completes local integration; repository
merge/release approval and broader project CI remain separate.

## Integrated behavior

- Definitions and phonics use saved artifact grade and the selected pane's language,
  passage, and occurrence offsets. Container-boundary selections, line breaks, table
  cells, hidden/UI exclusion, and empty selections use the reviewed projection.
- Dictionary and prepared help survive provider failure. Explicit retry retains the
  original request and becomes usable when AI availability returns.
- Useful partial phonics remain visible. Dictionary cache validation and the competing
  success/404 race fix are integrated.
- Image and popup audio startup deadlines, cancellation, dismissal, and late-result
  ownership use the reviewed media recovery changes.
- English fallback copy includes the four availability/media timeout keys. Existing
  translation-target and saved-grade contracts remain in place; locale-pack translations
  of these four new keys remain with the localization workflow.

The language dependency checks found two stale expected-failure declarations and one
remaining production issue: target paragraphs and tables forced `ltr` despite a saved
Arabic target. Both expressions now call `getContentDirection(section.label)`. The
language handoff suite requires ordinary passing assertions and adds the table case.
Arabic metadata and lookup language also pass in Chromium. Existing track 06 bilingual
revision tests passed all 46 cases; no bilingual transaction implementation was changed.

## Baseline and scope

Initial inspected HEAD was `286e09850680047d44efcc836075916cf488eff6`; integration and
final verification used `c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`. The checkout moved
concurrently; neither identifier establishes a deployed release. No applicable
`AGENTS.md` was found in the workspace or inspected ancestors. `AGENT_HANDOFF.md` was
read and the work log updated.

`before.json` and `before/` preserve exact inputs. `integration.json` records the
integration's before/after hashes and changed file list. `runtime-integration.patch`
contains only this integration's runtime delta, including its RTL correction and four
English keys, against those inputs. It does not include later concurrent STEM catalog
changes. It is a review record; do not reapply it to the already-integrated checkout.

Shared changes comprise the four runtime sources, engine source mirror, affected
root/public modules and dictionary/catalog mirrors, and the three selected module pins
in each host. The host source files were edited only at those pins. The canonical
scoped builders were used; both reader helpers remain embedded.

The focused test loaders now load production files by default. Explicit environment
overrides remain available to reproduce frozen candidates, but no transform silently
patches the default engine, reader, host handler, or dictionary under test.

An initial direct host write encountered a transient file error after the module builds.
The guarded finish operation completed the pin update using atomic writes. No source
patch was applied twice. The reader builder changed concurrently to expose its pure
compiler; the final parity check uses that canonical compiler and writes only its report.

The final catalog comparison found 36 unrelated STEM keys changed concurrently. Their
values were preserved. `concurrent-catalog-review.json` records the reviewed keys and
exact accepted hashes; the four lookup keys remained intact. `verification.json` lists
that accepted external drift explicitly and reports zero unreviewed drift.

## Validation evidence

| Evidence | Result |
| --- | --- |
| `final-tests.json` | 444 passed, zero failed, zero skipped, 16 files; production defaults |
| `browser.json` | 10 passed in Chromium 148.0.7778.96; zero page errors, network requests, or input drift |
| `parity.json` | Engine, host handlers, and reader reproduce root/public modules from current canonical source; four English messages present |
| `verification.json` | Exact affected mirrors, engine source pair, and all nine executable module pins match; no unreviewed drift |
| Source-pair and scoped whitespace checks | Passed |

`tests.json` preserves the first integrated run: the lookup and bilingual suites passed,
while two language tests failed because they unexpectedly passed under `it.fails`.
`language-strict.json` then isolated the remaining Arabic direction failure. The final
result includes the direction correction, the additional table regression, and removal
of the stale expected-failure behavior.

Browser cases cover whole English/Spanish panes, an Arabic target, dictionary success
with AI failure and retry, passage speech in both panes, an explicit BR in the browser
DOM, close by button/Escape with late completion, and disabled-AI dictionary help. They
use synthetic passages, generated production engine/reader modules, disposable browser
state, deferred mock providers, and blocked external requests. Speech arguments are
asserted; live pronunciation quality and real provider behavior are not evaluated. These
are component integration cases, not full-host/deployed-release smoke tests.

Final module content pins:

| Module | Pin |
| --- | --- |
| Content engine | `014df264` |
| Reader | `413cd330` |
| Host handlers | `50d53486` |

## Review and release handoff

The local Track 11 integration is ready for review. Preserve other owners' uncommitted
work when preparing a commit or PR; use the scoped runtime patch and changed-file record
to distinguish this work. Do not apply the older candidate patches again.

Keep dependency 06 transaction semantics and track 17's pane-language/grade contract.
Long-selection prompt clipping remains a separately documented follow-up; no clipping
policy changed here. Release work still needs the normal full application checks and
validation of the actual published assets, including dynamically versioned catalogs and
dictionary loader. No new desktop installer or deployed release is claimed.

Recheck without rebuilding runtime files:

```powershell
node dev-tools/verify_reading_lookup_integration.cjs
node dev-tools/integrate_reading_lookup.cjs --verify
node tests/reading_lookup_browser_acceptance.cjs
```

The complete 16-file unit command is recorded by the `testResults` paths in
`final-tests.json`; it is the prior context gate plus
`tests/bilingual_revision_transaction.test.js` and
`tests/reader_language_contract_handoff.test.js`, with no candidate overrides.
