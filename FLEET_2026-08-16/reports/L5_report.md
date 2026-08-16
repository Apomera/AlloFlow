# Lane 5 — Localization sweep and help strings

**Lane:** L5 · **Issues:** S1 (extraction sweep), S2 (help string accuracy/coverage), S2b (propagate)
**Status:** in progress

---

## Method note (read this before trusting any number below)

The two documented traps were both real and both already handled by an existing tool:

- `dev-tools/scan_shell_i18n.cjs` is AST-based and resolves the translator alias **per file**
  from that file's own declarations. The aliases in play are `t` (ANTI, most `_source.jsx`),
  `tr` (`reading_library_module.js`, `catalog_module.js`), `tx`, `ts`, `__alloT`. A grep on
  `ctx.t(` would have found essentially none of them.
- Key presence in `ui_strings.js` is not evidence. The scanner decides coverage at the **call
  site** only: a literal counts as covered when it is an argument to a resolved translator, or
  the `|| 'English fallback'` right-hand side of one.

I extended rather than duplicated it. See "What the sweep cannot see" at the bottom for the
honest limits.

---

## S1 — Extraction sweep

### Found (baseline, before any of my edits)

`node dev-tools/scan_shell_i18n.cjs` (default surface set, 11 files) reported
**1,030 user-facing hardcoded strings**:

| File | Count |
|------|-------|
| `AlloFlowANTI.txt` | 770 |
| `view_sidebar_panels_source.jsx` | 107 |
| `view_renderers_source.jsx` | 59 |
| `reading_library_module.js` | 48 |
| `view_header_source.jsx` | 15 |
| `misc_components_source.jsx` | 12 |
| `quickstart_source.jsx` | 10 |
| `catalog_module.js` | 5 |
| `view_fab_stack_source.jsx` | 3 |
| `onboarding_coach_source.jsx` | 1 |

The distribution is not flat. `AlloFlowANTI.txt`'s 770 cluster hard into a handful of
**recently built features that never went through the string layer at all**:

| Line range | Feature | Findings |
|-----------|---------|----------|
| 45850–47050 | Share & Collect / Assignment Center / Class Mailbox UI | 197 |
| 34850–35800 | Saved-work encryption, recovery keys, educator access code | 73 |
| 45250–45800 | Storage and recovery manager (Manage local storage) | 59 |
| 50700–51500 | AlloHaven recognition + class goals | 39 |
| 47050–48500 | Workspace view tabs, transcript strip, export families | 27 |
| 20900–21450 | Share & Collect / Class Mailbox toasts | 22 |
| elsewhere | scattered long tail | ~294 |

### Changed — burst 1: every hardcoded accessible name in the shell

Aria labels were the explicit ask, and they are the class you cannot see on screen.
**60 of the 61 hardcoded `aria-label` / `title` / `placeholder` / `alt` values in
`AlloFlowANTI.txt` are now routed through `t()`.**

The one left is `AlloFlowANTI.txt:52561` — `alt="AlloFlow"` on the logo image. "AlloFlow" is
a do-not-translate brand name, so wrapping it would create a key whose only correct
translation is the English source. Deliberate no-change.

New/extended namespaces in `ui_strings.js`: `saved_work`, `share_collect`, `mailbox`,
`allohaven`, `class_goals`, plus additions to `directions`, `a11y` and `session`.

Two of those aria labels also carried em dashes, which is a standing editorial violation in
user-facing text. Rewritten without them:

- `class_goals.name_aria` — was "Class goal name — kept on this device only"
- `class_goals.criteria_help` — was "…prompt you when met — awarding is always your tap…"
- `directions.body_placeholder` — was "Directions for students — steps, what finished work looks like…"

### Changed — burst 2: the Share & Collect dialog, end to end

I localized this one **completely** rather than skimming the top of several panels. A
half-translated dialog reads worse than an English one, so the unit of work is the panel, not
the string.

Covers `AlloFlowANTI.txt` ~46170–46545: the panel header, the "Add a shared activity"
configurator (activity types, prompts, availability/sign-up options, identity modes), the
survey builder (question rows, answer types, scale steps, min/max, choices), the assignment
status tiles, the filter bar, and every row action in the Assignment Center.
`share_collect` now holds **122 keys**.

Three things surfaced that the scanner could not have told me, and that are worth Aaron
seeing:

1. **`AlloFlowANTI.txt:46519` printed a raw internal token as a user-visible badge.** The
   lifecycle chip rendered `{row.lifecycle}` directly, so every user in every language saw
   `active` / `revoked` / `expired` lowercase, straight out of the data model. Now mapped to
   `share_collect.stat_active` / `lifecycle_revoked` / `lifecycle_expired` via a
   `lifecycleLabel` const, used by both the chip and the summary line.
2. **Seeded default content is user-visible but invisible to the scanner.** The `prompts`
   object at ~46193 supplies the default question a *student* sees ("What word or short phrase
   best captures your thinking?"). It is an object literal with feature-name keys
   (`word_cloud`, `rating`, …), so no attribute or prop heuristic flags it, yet it is the most
   student-facing text in the whole panel. Same for the Likert defaults "Strongly disagree" /
   "Strongly agree". All localized.
3. **One paragraph had to be split.** The pre/mid/post pairing note wove `<b>` tags through a
   single sentence. `t()` interpolates strings, not JSX, so a single key could not have kept
   the bold. I split it into an intro plus three clause keys, each with its own bolded term,
   so translators still get whole clauses rather than word fragments. Clause order is fixed by
   the JSX, which is a real limitation for languages that would reorder them. Recorded as a
   tradeoff, not a defect.

**Verified:** `@babel/parser` full-file parse OK after each burst; `JSON.parse` of
`ui_strings.js` OK after each burst; re-ran the scanner — `AlloFlowANTI.txt` 770 → 711 after
burst 1, with `attr:` findings 60 → 1.

(continued below)

---

## S2 — Help strings

(in progress)

---

## S2b — Propagation

(deliberately run late, per the lane prompt. Status appended at the end.)
