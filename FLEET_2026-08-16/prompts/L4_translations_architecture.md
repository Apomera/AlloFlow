You are **Lane 4** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L4**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: make generated translations a deliberate, language-agnostic setting

This lane is a design job first and a coding job second. Read the whole brief before writing
anything.

Right now, when the output language is set to something other than English, most generated
content also comes back with translations. That behavior is undocumented, possibly
inconsistent, and not controllable. Aaron does not even know for certain whether the
translation target is English or the app UI language, and he is right that it matters.

His framing, condensed: the default should suit the most common case, which in the US means
English translations alongside Spanish content. But the app must not be English-centric. A
Spanish immersion teacher deliberately teaching in Spanish does not want English glosses,
because the translation is a hint that makes the task too easy. So translations need to be
controllable, and the control has to work for any language pair, not just to-English.

He is wary of complexity: "I don't want to make it too complicated for the user, but there are
so many different ways AlloFlow could be used."

## Files you own

- Translation plumbing between settings and prompt construction (locate the sites)
- Any new setting storage and its defaults

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`,
`view_sidebar_panels_source.jsx`, `generate_dispatcher_source.jsx`.

`view_sidebar_panels_source.jsx` is shared with Lanes 2 and 9. `generate_dispatcher_source.jsx`
is shared with Lane 3: **Lane 3 owns grade-level and reading-level directives there; you own
translation directives.** Take the lock, re-read the file, edit promptly, release. Never Write
these files, only Edit.

Universal Settings has a test at `tests/universal_settings_panel.test.js` — read it before
changing the panel, and keep it passing.

## Scope

**T2 — Audit first. Do not build until this is done.** Produce a factual inventory of what
happens today:

- Every generation path that can emit a translation. Glossary terms, cloze, lesson plans,
  student directions, adapted text, exports, activity content, and anything else.
- For each: is the translation emitted always, conditionally, or never? What is the target
  language, and where does it come from — a hardcoded "English", the app UI language setting,
  or something else? Aaron believes it may differ by path, which would explain his uncertainty.
- Whether the app UI language setting is currently leaking into generated content, which he
  suspects and which would be a real bug independent of the new feature.

Put this inventory in your report as a table. It is a deliverable in its own right, and the
design depends on it. If the audit shows the behavior is already consistent, say so; that
changes the size of the job.

**T1 and T2b — Design and build the control.** Aaron sketched several shapes and did not
settle on one: a plain on/off toggle; a toggle plus a language picker; defaulting the target to
English versus to the app UI language. **You decide, and justify it in your report.** Design
constraints he gave, which you should treat as requirements:

- Default behavior must serve the common case without configuration.
- It must be language-agnostic. Nothing hardcodes English as "the translation language".
- It must be possible to turn translations off entirely.
- The control should only appear when it is meaningful, that is, when the output language
  differs from the language the translation would be in. Aaron said it "would probably only
  want to come up when you are doing other languages."
- It must not add visible complexity for the majority of users who will never touch it.

Consider that "include translations" and "translate into which language" are genuinely two
different questions, and that collapsing them into one control is what makes the design feel
either too simple or too fiddly. A single selector whose off state is one of the options can
sometimes express both without a second widget. Weigh that against discoverability.

Whatever you choose, the setting must reach **every** path in your T2 inventory. A translation
setting that half the generators ignore is worse than none, because the user will trust it.
This is the part most likely to be done incompletely, so make coverage explicit in your report:
list each path and confirm it honors the setting.

**Regression risk to watch:** a four-state or multi-state setting read with a truthiness check
or a `!== 'off'` comparison has already caused a serious lockout in this codebase. Read the
setting explicitly and exhaustively, handle the unknown or unset state by failing to the safe
default, and make sure the code that consumes the setting reads the same source of truth as
the code that writes it.

## Notes

- Universal Settings is a shared panel; other lanes are adding to it. Keep your diffs tight and
  release the lock promptly.
- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- No em dashes in user-facing text. New user-facing strings go through `ui_strings.js` so Lane 5
  can localize them; list the new keys in your report.
- Write `FLEET_2026-08-16/reports/L4_report.md` as you go, per RULES section 6.
