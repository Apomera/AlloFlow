# Source run — W3C BAD "CityLights" inaccessible home page (2026-08-11)

First real-world run of the source-remediation pathway (skill 0.1.0), on the
best-calibrated target available: the W3C WAI **Before/After Demonstration**
(https://www.w3.org/WAI/demos/bad/), a page W3C built to be inaccessible and
for which W3C publishes its own accessible rebuild — ground truth to
benchmark against. Fetched copies live in `mcp-testing/source-corpus/w3c-bad/`
(gitignored per the documents-corpus licensing pattern; MANIFEST.json carries
URLs + SHA-256 for re-fetching).

## Scoreboard

| Measure | Before | After (39 surgical patches) | W3C's own official rebuild |
| --- | --- | --- | --- |
| axe violation classes | 7 | **2** | 2 |
| axe details | image-alt ×33, link-name ×7, region ×22, select-name, html-has-lang, color-contrast ×2, landmark-one-main | image-alt ×14 (refused spacers), region ×12 | landmark-one-main ×1, region ×14 |
| Keyboard-unreachable interactive elements | **42 of 56** | **0** | 0 |
| Unlabeled controls | 1 | 0 | 0 |
| `lang` | absent | `en` | `en` |
| Verdict (engine compare) | — | `improved`, 0 problems, 0 introduced | reference only |

The patched page audits with **no landmark violation and fewer region nodes
than W3C's official remediation** — while being 39 find/replace patches on the
original file rather than the ground-up rewrite W3C's after-version is. (Fair
context: W3C's rebuild dates to 2012, before landmark-one-main was a common
expectation.) The keyboard result is the headline: the original page threw
focus away with `onFocus="blur();"` on nearly every link and used
`javascript:` hrefs on image links with no names — 42 of 56 interactive
elements were unreachable. All reachable after.

## What the plan deliberately did NOT do (review_notes, disclosed)

- 14 remaining image-alt nodes are byte-identical repeated spacer GIFs
  (`marker2_w.gif` ×6, `headline_middle.gif` ×3, `blank_5x5.gif` ×2,
  `marker2_t.gif` ×2): the engine's exactly-once find contract cannot address
  one occurrence at a time. **Engine follow-up E-SRC-1: an occurrence-indexed
  patch form** (`find` + `occurrence: n`, or all-occurrences with a declared
  count) — this run is its motivating case.
- The QUICKMENU select still navigates on change (3.2.2); converting it to a
  go-button changes behavior and belongs to the page owner.
- `region` improves only partially: table-based chrome outside landmarks
  needs structural rework beyond surgical scope.

## Engine findings this run produced

- **E-SRC-1** (above): occurrence-indexed patches for repeated identical markup.
- **E-SRC-2 (fixed mid-run):** axe violations without node selectors are
  homework, not evidence — `targets` added to the auditor's violation
  entries. ("image-alt ×33" was unactionable blind.)
- Earlier fixture run: the auditor's interactive-element selector must
  include `[onclick]` or click-only divs are invisible to the keyboard walk.

## Method notes

Plan: 39 patches built by `build_plan.py` (rationale + WCAG SC per patch; the
two link-text rewrites declare `changes_rendered_text`); validated and
applied to a COPY; before/after audited offline (http(s) blocked, 0 requests
escaped); `evidence.json` is the stamped compare verdict. Independent
verification is human-manual in skill 0.1.x, and this record says so:
these patches await a fresh-context reader/human review before any claim
beyond "the automated evidence above."
