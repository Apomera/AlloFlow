You are **Lane 7** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L7**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: give AlloBot its conversation back

This is the highest-judgment lane in the fleet. Read the whole brief before writing code.

AlloBot's hands-free mode has drifted into being command-first. It listens expecting a command,
and when it does not hear one it answers with something like "no command recognized." Aaron's
position, in his words: "I would rather not have any commands than force the user to not be
able to speak freely with the AI, because the more natural conversation works really well. So I
just need to get that back."

Treat that as the requirement. **Free-flowing conversation is the default and must never be
punished.** Command recognition is an enhancement layered on top of it, and if the layering
cannot be made reliable, conversation wins.

## Files you own

- `allobot_source.jsx` (builder `node _build_allobot_module.js`)
- `allo_commands_source.jsx` (builder `node _build_allo_commands_module.js`)
- `test_prep_hub_source.jsx` (builder `node dev-tools/build_test_prep_hub_release.cjs`)
- `cmd_keys_en.json` and whatever `dev-tools/check_cmd_i18n.cjs` governs

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`.

Lane 6 owns the TTS engine layer. Where a fix belongs in `tts_source.jsx`,
`kokoro_tts_loader.js`, `piper_tts_loader.js`, or `audio_helpers_source.jsx`, file it into
`CROSS_LANE_REQUESTS.md` for L6 rather than editing it.

Note: `dev-tools/check_cmd_i18n.cjs` requires that `cmd_keys_en.json` equals a fresh extraction
from `allo_commands_source.jsx`. If you change commands, regenerate it or the gate fails.

## Scope

**A1 — Conversation first, commands opportunistic.** Redesign the intake so that speech is
handled as conversation by default and a command fires only on a confident match. Aaron laid
out the options himself and did not pick one, so this is your call to make and justify:

- Fully fluid, with the model intuiting intent and acting only when a command is clearly meant.
- An explicit command mode, entered by saying "command" or pressing a control, with free
  conversation everywhere else.
- A hybrid, where obvious commands fire fluidly and everything else falls through to
  conversation.

He leaned toward fluid but was clear about the risk that makes it hard, which is A2 below. His
one hard constraint: **"no command recognized" as a response to ordinary speech must stop
happening.** Unmatched speech is a conversation turn, not an error.

He also suggested that when someone says something like "I want to build a lesson," AlloBot
could *tell them about* the relevant tool or offer to open it, rather than opening it. That
offer-instead-of-act pattern resolves most of the tension in A2 and is worth taking seriously
as the general design, not just for that one phrase.

**A2 — Accidental command triggers.** "Build a lesson" or "help me build a lesson" currently
opens Quick Start. That is often wrong: Quick Start generates source text, and a user saying
that sentence may be well past that stage and want something else entirely. The lesson
generalizes past this one phrase. A command that navigates the user somewhere they did not ask
to go is worse than no command, because it destroys their place in a workflow. Prefer
confirming, or offering, over acting, for any command that changes what is on screen. Where a
command is unambiguous and cheap to undo, acting directly is fine.

**A3 — Disable entanglement.** There are two ways to make AlloBot go away: the X button on the
bot itself, and a control in the header. They currently behave inconsistently. Required
behavior: **both disable AlloBot tips and nothing else.** Neither may disable text-to-speech.
Specifically, if AlloBot is not visible and the user asks for speech to be generated, they must
still hear it. Verify this end to end rather than by reading the state flags, and check both
directions of both controls.

**A4 — Mic input feedback.** There is no indication that the microphone is picking the user up.
Aaron wants something small showing their own audio, so they can see they are being heard.
A compact level meter or waveform driven by the analyser node on the existing stream is enough.
Keep it tiny and non-distracting. This is a real accessibility and confidence win, not decoration.

**A5 — Recording state has no accessible label.** Red means recording and orange means standby,
conveyed by color alone with no ARIA labeling. That is a WCAG failure on two counts: color as
the sole channel of information, and an unlabeled live state. Give the control a proper
accessible name and role, announce state changes, and add a non-color cue. Aaron also thinks
the visual design here may not be optimal; improving it is in scope.

Two known traps in this codebase for this kind of work. First, a control given `role` and
`tabIndex` but no `onKeyDown` is dead to keyboard users, so wire the keyboard path. Second,
there is a documented failure where a component defined its own announcer that only wrote to
local state, so every screen reader announcement was silently dropped. Use the app's real
announcer, and confirm your announcements actually reach it.

**V7 — Test Prep Hub hands-free.** Unreliable, and Aaron suspects latency from Gemini or
Kokoro, noting it works best with browser text-to-speech. Lane 6 is making browser TTS a
first-class selectable narrator option, which may resolve most of this. Investigate whether the
Test Prep Hub problem is latency alone or a genuine bug in its hands-free loop, since Aaron is
"not totally convinced that's working properly." He also floated a voice selector local to the
Test Prep Hub and was unsure about it; decide whether that is warranted or whether the global
narrator setting is enough, and say which.

## Notes

- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Voice work cannot be verified by reading code. Exercise the actual paths.
- New user-facing strings go through `ui_strings.js` under lock so Lane 5 can localize them;
  list the new keys in your report. No em dashes in user-facing text.
- Write `FLEET_2026-08-16/reports/L7_report.md` as you go, per RULES section 6. Lead it with
  the intake design you chose and why, since Aaron will want to evaluate that decision first.
