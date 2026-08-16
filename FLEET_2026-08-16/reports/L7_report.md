# Lane 7 — AlloBot hands-free and commands

**Scope:** A1, A2, A3, A4, A5, V7.
**Owned:** `allobot_source.jsx`, `allo_commands_source.jsx`, `test_prep_hub_source.jsx`,
`dev-tools/i18n/cmd_keys_en.json`. Under lock: `AlloFlowANTI.txt`, `ui_strings.js`.
**Nothing staged, nothing committed, nothing deployed.**

---

## 1. The intake design I chose, and why (read this first)

**Hybrid, offer-first.** Not "fully fluid", not an explicit command mode.

Four tiers, in this order on every utterance:

| Tier | When | What happens |
|------|------|--------------|
| **Control** | kill phrases and session control: "stop listening", "pause listening", an answer to a live confirmation, the wake word | unchanged, never gated |
| **Act** | a confident match on a command that does **not** change what is on screen | runs immediately, as today |
| **Offer** | a match on anything that changes the screen, or any low-confidence match | AlloBot **says what it could do and waits for a yes**. Nothing runs. |
| **Converse** | nothing matched, or the reply to an offer is not yes/no | the utterance becomes an ordinary AlloBot chat turn |

### Why not fully fluid

Aaron leaned this way, and the thing that made him hesitate (A2) is real and is not a tuning
problem. A fluid intake decides act-or-not from an intent estimate. When it errs toward acting, the
cost is asymmetric and unrecoverable: it navigates the user out of a workflow and there is no undo
for "where I was and what I had in my head". No confidence threshold fixes this, because the
utterances that trigger it are exactly the ones where the *words* match confidently and the *stage*
does not. "Build a lesson" is a perfect match on `create_lesson` whether you are starting a lesson
or finishing one, and no matcher can see which.

### Why not an explicit command mode

It solves A2 by making the user do the disambiguation, which is precisely what Aaron ruled out.
It also fails the accessibility case hands-free exists for: a voice-only user would have to
remember and speak a mode word before every action.

### Why offer-first works

It takes Aaron's own suggestion (tell them about the tool, or offer to open it, rather than opening
it) and makes it the general rule instead of a patch for one phrase. The user still just talks. The
entire "a command took me somewhere I did not ask to go" class disappears, at a cost of one spoken
"yes" for the screen-changing commands only. And critically, **an ignored offer is not an error**:
keep talking and the offer is dropped silently and your sentence is handled as a fresh turn. There
is no state you can be stuck in and no way to be told you said the wrong thing.

One accelerator for people who already know the commands: saying **"command"** (or "hey Allo,
command") before a phrase forces the act path and skips the offer. Never required.

### The precedent that settled it

`udl_chat_source.jsx:1569` carries this exact comment from 2026-07-06: *"The bot chat used to RUN an
app command the instant the router matched one... Now a match only PROPOSES... The Ctrl+K palette
and voice loop still execute directly (explicit surfaces)."* The chat learned this lesson six weeks
ago after `toggle_bot` fired on the word "hi". The reasoning was right and the exemption was wrong:
**the palette is an explicit surface, voice is not.** In the palette you selected a command from a
list. In voice you said a sentence and a scorer guessed. A1 closes that gap.

### Tradeoffs I accepted

- Generations (`generate_simplified`, the `generate_*` family) now offer rather than act. "Simplify
  this" costs one extra word. I chose this because they are slow, expensive, and replace the view
  with their result. The "command" prefix skips it for anyone who finds it tiresome.
- `read_this_page`, `stop_reading`, `go_back`, `close_current_surface`, the read-aloud transport,
  and the tutorial and resource navigation commands act directly even though they change the screen.
  They are unmistakable and one word from being undone. Making a blind user confirm "stop reading"
  would be the friction Aaron is removing.

---

## 2. A1 — free speech is never punished

**Found.** `allo_commands_source.jsx:3593` and `:3596` (pre-edit) both did
`announce("Didn't catch a command in “…” — try “bigger text” or “open the educator hub”.")` on
every unmatched utterance and on every thrown route. There was no conversational sink at all: the
voice loop could only run commands. Two more dead ends did the same thing in different words: a
planner that could not build a plan said "I could not make a safe multi-step plan... Try one command
at a time", and a plan that failed validation said "no actions ran".

**Changed.**

- `allo_commands_source.jsx:3611` `converseWith()` — the conversation sink. Calls `ctx.converse`,
  speaks the reply itself, and never toasts the paragraph. If no chat surface is wired it says
  something true ("I heard you, ask AlloBot in the chat") rather than reporting a failed command.
- `allo_commands_source.jsx:3876` the unmatched branch and the `catch` now call `converseWith`.
  Both planner dead ends do too.
- `AlloFlowANTI.txt:41358` `ctx.converse(text)` — pushes the turn through `_sendUdlToChat`, the same
  single delivery path the typed box uses, so the transcript, persona and workflow context are
  shared and the two input modes cannot drift. Returns a promise resolving to the reply text,
  bounded at 45s.
- `AlloFlowANTI.txt:27220` + `:27237` — a reply owed to a spoken turn is handed to the voice loop
  instead of the avatar. The loop stops the microphone while it talks and supports barge-in; the
  avatar's `speak()` does neither, so an avatar-read reply gets transcribed straight back in as a
  new command. This also means **a hidden AlloBot still answers out loud**, which is half of A3.
- `allo_commands_source.jsx:2313` `stripExplicitCommandPrefix()` — the "command …" accelerator.

**Verified.** `npx vitest run tests/allobot_conversation_first_intake.test.js` — 21 tests, all
passing. They drive the real `createVoiceLoop` through a fake `SpeechRecognition` (the harness
`tests/allo_commands.test.js` already uses), not source greps. Includes a guard that the string
"Didn't catch a command" cannot come back.

---

## 3. A2 — accidental command triggers

**Found, confirmed exactly as reported.** Two routes both landed on the same place:

- `allo_commands_source.jsx:2234` — the `create_lesson` grammar is
  `/^(?:create|make|start|build|plan)\s+(?:a\s+|new\s+)?lesson…/`, so **"build a lesson" matched at
  confidence 1.0** and ran immediately.
- "help me build a lesson" does *not* match that grammar (it is verb-anchored) and scores 0 against
  the aliases, so it reached the Gemini intent call, came back `create_lesson` at high confidence,
  and also ran immediately.

What ran: `create_lesson` → `ctx.startLessonFlow` (`AlloFlowANTI.txt:41144`), which forces
`setIsBotVisible(true)`, `setShowUDLGuide(true)` and `handleAutoFillToggle({checked:true})`. That is
the Quick Start / guided seeding Aaron described, and it happens on top of whatever the teacher was
doing.

**Changed.** `allo_commands_source.jsx:2254-2333` — the shared act/offer policy:

- `commandChangesScreen(cmd)` (`:2290`) is **derived, not hand-listed**: true when the command has
  `opensPanel`, has a `runAsync` (a generation), or its id matches
  `^(open_|go_|generate_|create_|launch_|resume_|run_|onboarding_|preview_|export_|share_|submit_|zen_|app_tour|…)`.
  A new `open_*` command inherits the safe default the day someone adds it, with no list to maintain.
  A small `DIRECT_ACT_COMMAND_IDS` set carves out the transport and navigation commands named above.
- `classifyCommandIntent(cmd, {parseConfidence, explicitCommand})` (`:2302`) returns `act` or
  `offer`. Screen-changing or destructive → always offer. Quiet → act at confidence ≥ 0.8, offer
  below. Explicit "command" prefix → always act.
- `allo_commands_source.jsx:2192` — the kernel consults it before executing and, on `offer`, arms
  the existing confirmation machinery with `offered: true` and an offer prompt instead.
- `allo_commands_source.jsx:2150` and `:3812` — an offer the user does not answer **lapses
  silently** and the utterance is re-handled as a fresh turn. A real destructive confirmation still
  holds the floor; only offers lapse. That distinction is what keeps "never punish speech" from
  weakening the destructive-command guard.

**Verified.** Same test file. "build a lesson about volcanoes" does not call `startLessonFlow` and
speaks an offer; "yes" then runs it with `{topic: 'volcanoes'}` intact; carrying on talking instead
drops the offer and converses; "bigger text" still acts immediately; "command open the learning hub"
skips the offer. The AI-routed path is covered separately with a stubbed `callGemini`, including the
"help me build a lesson" phrasing. A regression test pins that `clear_workspace` (destructive) still
re-prompts on a stray sentence and still runs on a later "yes".

---

## 4. A3 — disable entanglement

**Found. The two controls are not actually inconsistent with each other, and the real bug is worse
than the one reported.**

Both `handleHideBot` (the bot's X, `AlloFlowANTI.txt:17364`) and `handleToggleIsBotVisible` (the
header, `:17359`) write the single `isBotVisible` state and nothing else. `handleHideBot` also moves
focus to the header toggle, which is correct accessibility, not policy. So there is no state-level
divergence.

The actual defect: **AlloBot called the global `window.speechSynthesis.cancel()` from four places.**
That API has no per-utterance form; it stops everything the page is speaking. The four call sites
were the unmount cleanup, `silenceSpeech()`, the mute-toggle effect, and the start of `speak()`.
Consequences:

- Dismissing AlloBot while Read This Page was narrating with browser TTS **killed the narration**.
- So did the header toggle, since both unmount the component.
- So did the 3-minute idle auto-sleep, with no user action at all.
- So did the bot's own mute button.

That is "the X disables TTS", and it was reachable four ways.

**Changed.** `allobot_source.jsx:380-398` — an ownership flag and
`cancelAlloBotBrowserSpeech()`, which returns early unless AlloBot itself owns the current browser
utterance. All four sites now route through it. The bot claims ownership immediately before
`speechSynthesis.speak(utter)` and releases it in both `onend` and `onerror`.

Second half of A3, "if AlloBot is not visible and the user asks for speech, they must still hear
it": handled structurally by the A1 work above (`AlloFlowANTI.txt:27237`). A spoken question is now
answered by the voice loop, which is alive whether or not the avatar is mounted.

**Verified.** `tests/allobot_disable_and_mic_feedback.test.js` — 13 tests. A gate asserts that
exactly **one** non-comment line in `allobot_source.jsx` may call `speechSynthesis.cancel()`, and
that it sits behind the ownership guard. Another asserts `handleHideBot` touches nothing but
`setIsBotVisible` and focus.

**Not verified in a browser.** I could not run the real app here. The specific end-to-end check
worth doing before this ships: start Read This Page on browser TTS, press the bot's X mid-sentence,
confirm the narration continues; repeat with the header toggle; repeat with the bot's mute button;
then re-show the bot from the header and confirm tips return.

**One residual asymmetry I left deliberately.** `AlloFlowANTI.txt:27221` force-closes the AlloBot
chat panel whenever `isBotVisible` goes false. Arguably "more than tips". I left it because the chat
is anchored to the avatar and a floating chat with no bot reads as a bug, and because changing it
would collide with Lane 9's shell work. Flagging it as a judgement call rather than a fix.

---

## 5. A4 — mic input feedback

**Found.** No level indication anywhere. `voice_module.js:322` even documents the gap:
`onLevel(level0to1)` is "deferred — needs Web Audio analyser; stubbed for now".

**Changed.**

- `allo_commands_source.jsx:3143` `micLevelMonitor` — one **reference-counted** analyser publishing
  a compressed RMS level. Reference counting is the point: if each surface opened its own
  `getUserMedia` the user would get several browser recording indicators, and on some devices
  several permission prompts, for one physical microphone. A caller that already owns a stream (the
  on-device Whisper engine) hands it in and no second capture happens. Publishes three ways so
  future consumers need no coordination: a subscriber callback, `window.__alloMicLevel`, and an
  `alloflow:mic-level` window event.
- The voice loop acquires it exactly when the mic opens and releases it when the mic closes, so a
  moving bar is always a true statement (`startMicMeter`/`stopMicMeter`, wired into
  `beginWebSpeech`, `startWhisperEngine`, `stop`, `pause`, `resume`).
- `allobot_source.jsx:239` `AlloMicMeter` — five bars, `aria-hidden` by design (instantaneous
  loudness is noise to a screen reader; A5 carries the state for assistive tech). Rendered at
  `allobot_source.jsx:2226`, **outside** the satellite ring: the satellites are `opacity-0` until
  hover on a fine pointer, and a meter you have to hover to see cannot tell you the mic is picking
  you up.
- Also rendered inline in the global voice pill (`AlloFlowANTI.txt:53081`), which is present even
  when AlloBot is hidden.

**Verified.** Monitor semantics (reference counting, idempotent release, event contract,
stream reuse without `getUserMedia`) by unit test. The component by **real SSR render** against
React in `desktop/web-app/node_modules`: five bars, none lit at rest, `aria-hidden`, renders nothing
when inactive, and the inline placement drops the absolute positioning.

**Not verified in a browser.** SSR runs no effects, so the level stays at 0 in the test. Nobody has
watched the bars move against a live microphone. That is the check to do.

---

## 6. A5 — recording state accessibility

**Found, and the report is partly overtaken.** The red/orange pair Aaron described is
`view_misc_modals_source.jsx:151` and `:171`, the AlloBot chat header Talk/Pause buttons. Those are
better than remembered: both already carry `aria-pressed` and a **visible text label** ("Talk" /
"Listening" / "Paused"), so colour is not the sole channel there. Two real gaps did exist:

1. The AlloBot mic satellite (`allobot_source.jsx:2251`) had an `aria-label` but **no
   `aria-pressed`** and no announcement, so its state was a name change with no toggle semantics.
2. The global voice pill (`AlloFlowANTI.txt:53076`) rendered the fixed string "Listening" for the
   whole session. While paused, or while the mic was closed for synthesis, **it said "Listening" and
   that was false**. Colour was the only thing distinguishing the phases anywhere in the app.

**Changed.**

- `allobot_source.jsx:2289` — `aria-pressed` on the mic control, plus a focus-independent ring on
  the live state so it reads without colour vision. The Mic/MicOff icon swap was already a non-colour
  cue and stays. It is a real `<button>`, so the keyboard path is native; no `role`+`tabIndex`
  without `onKeyDown` was introduced.
- `allobot_source.jsx:1168` — announces every state change through `window.alloAnnounce`, the app's
  **real** announcer (it owns `#allo-live-polite`, `AlloFlowANTI.txt:14953`). Not a component-local
  announcer: that is the documented failure where every announcement is silently dropped. The test
  asserts both that the component calls `window.alloAnnounce` and that the host still defines it.
  The resting state on mount is deliberately not announced.
- `AlloFlowANTI.txt:53081` — the voice pill now names the actual phase in text inside its existing
  `role="status" aria-live="polite"` region (Listening / Paused / Thinking / Speaking / Starting),
  adds `aria-atomic`, changes **shape** as well as hue (a pulsing filled dot when live, a hollow
  square when the mic is closed), swaps the emoji, and carries the level meter. Every phase change
  is now spoken.

That last change is also the visual-design improvement Aaron asked for: the pill now tells you when
the microphone is closed, which was invisible before and is the single most confusing thing about
hands-free mode.

**Verified.** By test for the labelling, the announcer routing, and the non-colour cues.
`node dev-tools/check_aria_handler.cjs` passes. **Not verified with a screen reader or visually.**

---

## 7. V7 — Test Prep Hub hands-free

**Found: it is both, and the bug is the bigger half.**

Aaron suspected latency. There is a latency component, but there is also a concrete defect that
looks identical from the outside.

**The defect.** The only restart of speech recognition lived in `finishSpokenRequest`, the
end-of-speech callback. `recognition.onresult` detaches the handlers and aborts before dispatching,
so `onend` never fires. Any command path that **acts without speaking** therefore left the
microphone permanently closed until the user toggled hands-free off and on. The paths:

- `choose-practice-set`, `start-practice`, `start-practice-hands-free` — the setup commands you use
  at the *start* of a hands-free session. Only `list-practice-sets` and `start-hands-free` speak.
- `another-set` at the results screen.
- `next` at a diagnostic checkpoint, and `next` / `submit` inside a timed simulation.
- Any handler that threw before reaching its `speakTestPrepText`.

**The latency.** `TEST_PREP_HANDS_FREE_SYNTHESIS_TIMEOUT_MS` was a flat 15s, and **the microphone is
closed for the whole synthesis wait**. Questions are prefetched, so that budget mostly applies to
the short uncached interstitials that carry the conversation ("Selected B."). With Gemini throttled,
every one of those could burn up to 15 seconds of dead air before falling back to browser speech.
That is exactly why it "works best with browser text-to-speech": browser TTS has no synthesis wait
at all. Aaron's instinct was right about the mechanism and right that it was not the whole story.

**Changed** (`test_prep_hub_source.jsx`):

- `:4900` `ensureHandsFreeListening()` — one recovery point, guarded against double-starting and
  against interrupting speech in flight. `:4949` runs it after **every** dispatch, on both settle
  paths. This makes the guarantee structural instead of a rule each future command must remember.
- `:33` `testPrepHandsFreeSynthesisTimeoutMs(text)` — scales the budget to the utterance,
  3.5s floor to 15s ceiling at 45ms/char. "Selected B." now falls back to browser speech in 3.5s
  instead of 15s; a full question keeps the full budget and is prefetched anyway.
- `:5168` — stops reporting `speaking` while it is still synthesising. It now says
  `preparing audio`, which is both true and the moment the user most needs to know the mic is shut.

**On the hub-local voice selector: no, and here is why.** The hub already uses the global
`selectedVoice` (`test_prep_hub_source.jsx:5182`). A second selector would be a second place to get
a learner's narrator wrong, and someone who set their voice once would find it ignored here. The
complaint is latency, not timbre, and a voice picker does not fix latency. What does fix it is a
first-class **engine** choice, which is exactly Lane 6's V6, and the hub inherits that for free. The
hub already has the setting that genuinely varies per activity: speech rate, with spoken
slower/faster. My recommendation instead: once V6 lands, surface the **active narrator name** in the
hub's status pill next to rate and prompt mode, so "why is this slow" is answerable without leaving
the screen.

**Verified.** `tests/test_prep_hands_free_mic_recovery.test.js` (7 tests) plus the five existing
test-prep hands-free suites, all passing.

**Not verified at runtime, and this one matters:** see the blocker below.

---

## 8. Blockers and things I deliberately left

### `test_prep_hub_module.js` is NOT rebuilt. The V7 fix is source-only.

`node dev-tools/build_test_prep_hub_release.cjs` cannot complete in this tree. It aborts on
`dev-tools/review_non_eppp_against_eppp.cjs`, which exits 1 with **67 pre-existing content QA hard
findings** unrelated to any source change (it does not read `test_prep_hub_source.jsx`).
`--skip-pack-rebuild` does not help: the pack registration digest check then fails against the
checked-in packs.

My one build attempt rewrote ~105 files under `test_prep/`. **I restored all of them immediately**
with `git restore --worktree -- test_prep/` and confirmed the directory was clean at 10:47.
`test_prep/` and its `desktop/web-app/public/` mirror went dirty again at **10:55:48** with a
different diff shape (adds `"version": "0.7.0"`, drops `generatedAt`) while I was only running
vitest. That is another session, and I have not touched it. **Do not attribute that diff to L7.**

Someone who owns the test-prep content needs to clear those 67 findings; one build then picks up the
V7 fix. Filed in `CROSS_LANE_REQUESTS.md`.

### `npm run verify:gate` is red on pre-existing drift, for everyone

It fails at `check_cmd_i18n` and the six gates after it never run. Not this fleet: the missing keys
(`cmd.describe_current_media*`, `cmd.open_learning_web_explorer*`, `cmd.read_media_descriptions*`,
`cmd.suggest_contextual_next_steps`, +9) are in `allo_commands_source.jsx` **at HEAD** and absent
from `dev-tools/i18n/cmd_keys_en.json`. I did not regenerate it: I added no `cmd.*` or `palette.*`
keys (verified against my own diff), and the fix requires translating ~21 keys across 63 packs,
which is Lane 5's work, not the work of whoever trips over it.

I ran the six blocked gates individually. All pass:
`check_safety_string_spanglish`, `check_build_smoke`, `verify_module_registry`, `check_view_props`,
`check_window_icons`, `check_iife_lazy_lookup`, `check_lang_staleness`. Plus `check_aria_handler`.

### Not verified visually or with a real microphone

Everything voice-shaped here is driven through a fake `SpeechRecognition` and a fake level publisher.
That is real end-to-end coverage of the routing, the offer/act policy, and the recovery logic, but
nobody has spoken into a microphone or watched the meter move. The browser checks worth doing:
the four A3 TTS-survival cases in section 4, the meter against live speech, and one hands-free Test
Prep session that starts by voice ("start practice") to confirm the mic comes back.

### `view_misc_modals_source.jsx` — not mine, and probably fine

The Talk/Pause pair Aaron named is unowned by any lane. It already has `aria-pressed` and visible
text labels; its only gap was an unannounced pause/resume, and I closed the equivalent gap on the
surface I do own (the voice pill now announces every phase). Noted in `CROSS_LANE_REQUESTS.md` as a
nicety, not a WCAG gap.

### Cross-lane request to L6

`micLevelMonitor` is designed so the dictation controller can light the same meter with two lines
and no second microphone stream. Filed.

---

## 9. New `ui_strings.js` keys (for Lane 5)

Added under lock. No em dashes.

| Key | English |
|---|---|
| `voice_control.offer_lead` | `I can {action}.` |
| `voice_control.offer_lead_topic` | `I can {action} about {topic}.` |
| `voice_control.offer_tail` | `Say yes to do it, or just keep talking and I will listen.` |
| `voice_control.no_chat_surface` | `I heard you. I can only run app commands from here right now, so ask AlloBot in the chat and it will answer there.` |
| `voice_control.paused` | `Microphone paused. Voice control is still on.` |
| `voice_control.thinking` | `Thinking. The microphone is closed for a moment.` |
| `voice_control.speaking` | `Speaking. The microphone is closed until this finishes.` |
| `voice_control.starting` | `Starting the microphone.` |
| `bot.mic_live_announce` | `Microphone on. AlloBot is listening.` |
| `bot.mic_off_announce` | `Microphone off. AlloBot has stopped listening.` |

`{action}` and `{topic}` are placeholders and must survive translation.

Voice-loop strings that were already hardcoded English before this lane (the confirmation grammar,
pause and resume messages, engine-selection notices) are still hardcoded. I localized the strings I
added and did not widen the sweep into Lane 5's territory.

---

## 10. Files changed

| File | What |
|---|---|
| `allo_commands_source.jsx` | act/offer policy, offer plumbing in the kernel, conversation sink, `micLevelMonitor`, meter lifecycle |
| `allobot_source.jsx` | scoped browser-speech cancel, `AlloMicMeter`, mic control `aria-pressed` + ring, state announcement |
| `test_prep_hub_source.jsx` | `ensureHandsFreeListening`, scaled synthesis budget, honest `preparing audio` status |
| `AlloFlowANTI.txt` (locked) | `ctx.converse`, voice-reply waiters, voice pill phase text + shape cue + meter |
| `ui_strings.js` (locked) | the ten keys above |
| `_build_allo_commands_module.js` | export `classifyCommandIntent`, `commandChangesScreen`, `stripExplicitCommandPrefix`, `commandOfferPrompt`, `micLevelMonitor` |
| `_build_allobot_module.js` | export `AlloMicMeter` |
| `dev-tools/build_test_prep_hub_release.cjs` | export `handsFreeSynthesisTimeoutMs` |
| `allo_commands_module.js` + public mirror | rebuilt |
| `allobot_module.js` + public mirror | rebuilt |
| `test_prep_hub_module.js` | **NOT rebuilt** (see blockers) |

New tests: `tests/allobot_conversation_first_intake.test.js` (21),
`tests/allobot_disable_and_mic_feedback.test.js` (13),
`tests/test_prep_hands_free_mic_recovery.test.js` (7).
Updated: `tests/allobot_idle_sleep_and_hide.test.js` — one assertion moved from the bare global
`speechSynthesis.cancel()` to the scoped helper, which is the A3 fix.

**Full run of the 23 suites touching this lane: 315 passed, 0 failed.**
