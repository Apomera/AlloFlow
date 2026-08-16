You are **Lane 6** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L6**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: make the voice stack predictable

Aaron's summary of this area: "we have a lot of complexity and I don't know if it's always for
the best." He is not asking you to rebuild it. He is asking you to take a fine-tooth comb to
it, fix the concrete failures below, and streamline where streamlining is clearly right.
Do not reinvent parts that work.

## Files you own

- `tts_source.jsx` (builder `node _build_tts_module.js`)
- `view_kokoro_offer_modal_source.jsx` (builder `node _build_view_kokoro_offer_modal_module.js`)
- `audio_helpers_source.jsx` (builder `node _build_audio_helpers_module.js`)
- `kokoro_tts_loader.js` and `piper_tts_loader.js` — **plain JS, no source pair, edit directly**
- Narrator voice settings surface (locate it; the panel itself may be shared, see below)

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`.

Lane 7 owns AlloBot and Test Prep Hub hands-free behavior. You own the TTS engine layer they
call. Where a fix belongs in `allobot_source.jsx`, `allo_commands_source.jsx`, or
`test_prep_hub_source.jsx`, file it into `CROSS_LANE_REQUESTS.md` for L7.
Lane 2 owns the dark-mode invisibility of the narrator dropdown; do not fix that yourself.

## Scope

**V1 — The Kokoro loading screen.** Aaron's strongest complaint in this lane. A full-screen
loading takeover appears, disrupts the flow, and appears **even when Kokoro is already
downloaded** and **even when the user never initiated a download**. He does not think the
screen needs to exist at all: at most a small non-blocking indicator, perhaps a spinner at the
bottom of the screen. Requirements: if the model is present, the voice is ready and nothing
appears. If a download genuinely is happening, show a small unobtrusive progress indicator, not
a modal. If the user did not initiate it, do not interrupt them. Start by finding why the
"already downloaded" check fails, because that is the actual bug and it may be the same
root cause as V2.

**V2 — Kokoro cold start.** The first attempt to use Kokoro after load does not work; it only
works on a later attempt, even though the model is on device. That reads as an initialization
or warm-up step that is not awaited, with the first call racing it. Find out whether the first
request is dropped, queued, or failing silently, and make the first call behave like the
second. This repo has a documented prior incident of a **truncated model cached in OPFS**
producing Kokoro failures; check the integrity of what is cached before assuming the bug is in
the code path.

**V3 — Piper errors reach the user.** Aaron sees raw messages like "unexpected token E",
"entry not found", "not valid JSON", apparently when a non-English language is in use. That
signature is an HTTP error page or a missing-file response being handed to `JSON.parse`.
Piper may not be correctly set up in this deployment while the code path is still reachable.
Determine whether Piper is meant to be live. There is a `tts-server/` directory with
`piper_server.py` and `piper-voices`. Two acceptable outcomes: wire Piper up properly and put
it under the narrator settings alongside Kokoro as Aaron suggested, or make the path fail
gracefully to a working voice with no raw parser error ever shown. Either way, **no user
should ever see a JSON parse error.** Aaron's requirement is that if Piper is used at all, it
is simple for the user.

**V4 — Browser TTS toggle breaks Gemini non-English.** With the browser text-to-speech toggle
off, Gemini-generated non-English speech (Spanish) fails. Aaron has seen this consistently and
cannot explain it. Look for the toggle gating something broader than browser speech, such as a
shared audio-context unlock, a voice-list load that other engines depend on, or a permissions
prompt that only the browser path triggers. The toggle should control only which engine is
used, never whether another engine works.

**V5 — Kokoro missing on iPhone.** Kokoro does not appear in the selectable voice list on
Aaron's iPhone. Determine whether it is deliberately excluded on iOS, excluded by a capability
check that iOS Safari fails, or genuinely unable to run there. If it cannot run, the voice list
should say so rather than silently omitting it. If it can, fix the detection.

**V6 — Browser TTS as a first-class choice.** Browser speech is currently only a fallback,
with no straightforward way to select it as the primary voice. Aaron wants it selectable, and
his reasoning is worth preserving: it is not that the voice is good, it is that the latency is
low, and for interactive use a mediocre instant voice beats a good slow one. Make it a normal,
selectable narrator option with honest labeling about the tradeoff.

**V10 — Visibility into what TTS is doing.** Users cannot tell whether audio is generating,
downloading, or already saved. There is a stop control with animated bars, which Aaron thinks
may be enough, but he notes users do not know when a download is happening. He is explicitly
open to being told he is overcomplicating this. His own diagnosis is sharp: this would matter
much less if generation were reliable, and the reason it feels bad is that it sometimes works
flawlessly and sometimes does not. Weigh that. Prefer distinguishing the states that have
different user consequences (downloading a model, generating speech, saved to device) over
adding a busier display. Coordinate with Lane 9, which owns the "saved to device" chip
lifecycle and toast placement; file requests rather than editing their files.

**L2 — Karaoke TTS not saving for non-English.** Aaron generates karaoke audio in a non-English
language, hears it play, then finds no saved audio under edit. He is unsure whether it is a UI
display problem, a real save failure, or a one-off glitch. Determine which. The save path
probably keys stored audio by language or by a text hash; if the key written and the key read
disagree when language is non-default, the audio saves but never displays, which matches
exactly what he described. Note that karaoke timing tolerance in this app is a follow-along
aid at roughly plus or minus 150ms, so do not chase timing precision here. Also note that a
module rebuild requires restamping the `?v=` cache pins.

**V9 — Faster open-source TTS (research only).** Aaron wants to know whether something exists
that is meaningfully faster than Kokoro without dropping to browser-speech quality. Kokoro is
good but its latency rules it out for interactive use. **Research and report; do not adopt
anything.** Adopting a new engine is Aaron's call. Give him a short comparison with real
latency numbers where you can find them, licensing, on-device feasibility in a browser, and
language coverage, since multilingual support is the whole point here.

## Notes

- Worker code inside template literals is invisible to `node --check`. This repo has shipped a
  broken worker that way. If you touch worker source, validate it by extracting and checking it.
- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Write `FLEET_2026-08-16/reports/L6_report.md` as you go, per RULES section 6.
