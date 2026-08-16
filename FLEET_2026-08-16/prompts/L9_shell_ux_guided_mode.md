You are **Lane 9** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L9**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: the shell — onboarding, navigation, and things that cover the screen

A cluster of issues that share a theme: the app's scaffolding is getting in the user's way
instead of supporting them.

## Files you own

- `guided_mode_config_source.jsx` (builder `node _build_guided_mode_config_module.js`)
- `view_guided_mode_banner_source.jsx` (builder `node _build_view_guided_mode_banner_module.js`)
- The tour implementation (locate it)
- The toast system and the "saved to device" / cached-remediation chips
- The AI settings storage panel and resource pack history

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`,
`view_sidebar_panels_source.jsx` (shared with Lanes 2 and 4 — hold it briefly).

Lane 2 owns dark-mode contrast repairs; do not fix those yourself, file them.

## Scope

**N1 — Guided mode is too complex.** Aaron's diagnosis is precise and worth quoting: the point
of guided mode is to reduce cognitive load, but the panel throws a lot at the user at once, and
"if you were just looking at that as a novice, you might have no idea what should I actually
click on, and am I doing the right thing." A tutorial that presents options rather than a next
step is not a tutorial. He likes that it focuses on the resource you want; he does not like the
volume.

Direction: reduce to one clear next action at a time, with the rest available but not shouting.
He specifically suggested drawing the eye to the next step, noting that new resources appearing
in history already pulse a little and that tutorials legitimately use that. Use a single
attention cue at a time, and be careful not to make it busy, which he called out as the thing
to avoid. Target audience is a teacher who does not consider themselves good with technology.

**N2 — Guided mode blocks History.** Clicking History while guided mode is active does not go
to History, because focus stays locked on the resource. The feature is effectively broken until
the user exits guided mode, and nothing tells them that. Either let History work while guided
mode is active, which is the better answer, or make the constraint visible and give an obvious
way out. Silently swallowing a navigation click is the one option that is not acceptable.
Aaron also suggested AlloBot could carry more of the guidance load here; note whether that is
worth pursuing, but coordinate rather than editing AlloBot, which Lane 7 owns.

**N3 — The tour is out of date.** It was written before the Create Resource panel changed.
Walk the tour against the current UI, fix every step that no longer matches, and remove steps
for things that no longer exist.

**N4 — "Create Resource" is really a filter.** The panel filters resources rather than creating
them, and Aaron thinks the name should change but has not settled on what. He also raised its
behavior: it currently floats and follows the scroll, and he is unsure whether it should stay
fixed; it can collapse, but he can imagine wanting to dismiss it entirely; and he thinks it can
get in the way. His one guardrail: if it becomes dismissible, dismissing should only be
possible in a state where the user is not left with a hidden filter silently narrowing what
they see. That is the real risk with a dismissible filter, and it is why he tied dismissal to
having selected all resources. Rename it, and make one clear decision about placement and
dismissal. Explain your reasoning. If you make it dismissible, make the active-filter state
visible from outside the panel.

**N5 — "Manage local storage" opens the wrong thing.** In AI settings, it opens an old
diagnostics view that only confirms storage works, which was answered long ago. It should show
what the resource pack history shows, because that is what users want to see. Point it at the
resource pack history. For the diagnostics view: Aaron says it may be fine to eliminate
entirely, or to fold into the platform diagnostics panel that already exists. Prefer folding it
in if it costs little; delete it if it is genuinely dead. Do not leave two doors to two
different things with one label.

**N6 — Panel ordering.** Analyze Source Material sits after Universal Settings, but Universal
Settings does not apply to it. Aaron wonders whether the order should be reversed and admits
that might not look right either. Assess whether reordering actually helps or whether the real
problem is that the relationship between the two is unclear. A cheap and possibly better fix is
making the scope of Universal Settings legible rather than moving panels. He is genuinely
unsure here, so a well-argued "leave it, do this instead" is a fine answer.

**D4 — Toasts.** Two problems. First, placement: they are at bottom-left, and during generation
they land near the cursor and get in the way. Aaron believes it used to be top-center and is
not sure the move was right, acknowledging bottom-left is more visible but more intrusive.
Choose a placement that does not collide with the primary work area during generation, and say
why. Second, and more interesting: toasts vanish before slower readers finish, and some carry
information that matters. Aaron wants a way to see them again. He noted the app already keeps a
log of the "did you know" tips that feed brainstorming, and likes that pattern. Build a toast
history along the same lines, ideally reusing that mechanism rather than inventing a parallel
one.

**D5 — "Saved to device" chip is permanent.** It sits in the bottom-left indefinitely. It
should auto-dismiss after a while. Aaron's general principle: do not permanently cover the UI
with things that do not need to be permanent.

**D6 — Cached-remediation chip covers the student tools bar.** It appears bottom-right and
blocks a real control. Aaron floated several fixes and did not settle: move it, let the user
dismiss it, or make the remediation cache reachable from Manage Local Storage instead. His
own leaning was that the cache belongs in Manage Local Storage, since that is where it lives.
Do both halves of that: make it dismissible so it stops blocking the tools bar, and make the
cached remediation reachable from the storage panel so dismissing it does not lose anything.
That is the combination that makes dismissal safe, which was his actual worry.

**D7 — The "You write it" pill.** In assignment directions, it is decorative but looks
clickable, and Aaron finds it unprofessional and misleading. Replace it with an arrow. Users
reasonably expect a pill to be interactive.

## Notes

- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Anything visual must be rendered and looked at, not inferred.
- No em dashes in user-facing text. New strings go through `ui_strings.js` under lock; list the
  new keys in your report for Lane 5.
- Write `FLEET_2026-08-16/reports/L9_report.md` as you go, per RULES section 6.
