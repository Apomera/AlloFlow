You are **Lane 5** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L5**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: localization coverage and help string quality

Two jobs. The first is mechanical and large: newer UI was built without going through
`ui_strings.js`, so it renders in English regardless of the user's language. The second is
editorial: help strings are stale, some are inaccurate, and the reading level is too high.

Aaron on help strings: an inaccurate help string is **worse than no help string**, because it
actively confuses. And they should sit at roughly a 3rd to 4th grade reading level, because
the whole point of help mode is breaking things down as simply as possible.

## Files you own

- `help_strings.js` (exclusive)
- `lang/*.js` and the mirror `desktop/web-app/public/lang/`
- `dev-tools/i18n/*` and the localization scanners
- `lang/manifest.json` via `node dev-tools/update_lang_manifest.cjs`

Under lock (see RULES section 3): `ui_strings.js`, `AlloFlowANTI.txt`.

**You are the owner of `ui_strings.js` structure and of all translation propagation**, but
five other lanes will be adding keys to it during this run. Always take the lock and re-read
before editing. Expect the file to change under you.

## Sequencing — important

Other lanes are adding new user-facing strings throughout this run. **Do your extraction sweep
and help string work continuously, but run the final translation propagation late**, once the
other lanes have largely landed. Check `FLEET_2026-08-16/reports/` for the other lanes'
reports; each is instructed to list the keys it added. Do a final sweep against those lists
before you finish, and note in your report which keys you propagated and which arrived too
late.

## Scope

**S1 — Extraction sweep.** Find user-facing English that never goes through the string layer,
in the newer surfaces especially. Two traps documented in this repo that will make you
overconfident if you ignore them:

- A grep for `ctx.t(` **misses the aliased form**. Translation lookups are not always called
  through that identifier. Find the aliases before you trust any coverage number.
- A grep for nested dotted keys in `ui_strings.js` **proves nothing** about whether a string is
  reachable or used. Key presence is not coverage.

So build the sweep on something sturdier than a single grep: parse for JSX text nodes and
user-visible string literals in attributes like `aria-label`, `title`, `placeholder`, and
`alt`, then subtract what is demonstrably routed through the string layer. There are existing
scanners in `dev-tools/` including `scan_shell_i18n.cjs` and `check_cmd_i18n.cjs` — read them
first, and extend rather than duplicate. `a11y-audit/` also holds prior audit output that will
tell you what was already known.

Aria labels are a known gap in this codebase and are easy to miss because they are invisible on
screen. Include them.

Extract what you find, and prioritize by user impact rather than doing the whole tail: the
surfaces a teacher touches every session matter more than a rarely-opened diagnostic panel.
Report what you left, so the remainder is visible rather than silently dropped.

**S2 — Help string accuracy and coverage.** Many features shipped since the last help pass.
Work through `help_strings.js` and:

- Remove or correct entries that no longer describe what the feature does. Aaron has seen help
  text that is simply wrong. Verify each entry against the actual behavior in the code, not
  against what the entry claims.
- Add entries for features that have none. `FEATURE_INVENTORY.md` is a reasonable checklist,
  and `a11y-audit/help_anchors_audit.txt` and `a11y-audit/help_audit.txt` hold prior coverage
  analysis.
- Rewrite for reading level. Target 3rd to 4th grade: short sentences, common words, concrete
  verbs, no jargon unless the jargon is the thing being explained. Aaron wants these as
  approachable as they can be.

**S2b — Propagate.** New and corrected strings need to reach the language packs. Follow the
existing process: `lang/*.js` keyed against `ui_strings.js` and `help_strings.js`, mirrored to
`desktop/web-app/public/lang/`, manifest regenerated with
`node dev-tools/update_lang_manifest.cjs`. Check `lang/*_HANDOFF.md` for in-flight translation
work before touching a pack, since some languages are partially complete and have an owner.

Known constraints in this repo: language packs must stay in lockstep with the key files and are
`JSON.parse`d, so a malformed pack fails hard. Hand-translated content outranks machine
rebuilds where both exist. Code-switching in a pack means skipping the license check. ASCII
normalization has produced false passes in validation before, so do not lean on it.

Run `node dev-tools/check_lang_json.cjs` and the i18n checks in `npm run verify:gate`.

## Notes

- `ui_strings.js` is 70,664 lines and `help_strings.js` is 1,084. Edit, never Write.
- No em dashes in user-facing text. Brand names are do-not-translate.
- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Write `FLEET_2026-08-16/reports/L5_report.md` as you go, per RULES section 6. Include a
  coverage number you can defend and an explicit statement of what your sweep cannot see.
