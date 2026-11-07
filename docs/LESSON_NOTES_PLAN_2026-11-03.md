# Lesson Notes: Plan (2026-11-03)

This is a teacher tool. AlloFlow listens to a lesson and the teacher shapes the notes with spoken commands during class ("Allo, key point"). At the end, the lesson becomes notes, a glossary, a quiz and leveled or translated versions. Status: plan only, nothing built yet. Line numbers are from 11-03 and will drift.

## Principles

1. **Teacher first.**
   - The teacher records their own lesson, after telling the class (a checkbox at start).
   - This automates the common IEP/504 accommodation "provide a copy of class notes".
   - A student version comes later, and only through sessions a teacher starts (Phase 3).
2. **Audio is never saved.** The tool keeps text only, and keeps it in memory until the teacher sends it on.
3. **On-device recognition only, by default** (decided 11-03).
   - The tool uses desktop Whisper or in-browser Whisper. Nothing else runs unless the teacher turns it on.
   - Browser speech (Chrome sends that audio to Google) and Gemini audio are **off by default**. They are explicit opt-ins in Speech setup, each with a clear disclosure.
   - If the device can't keep up, the tool says so and suggests a smaller model or the desktop app. It never switches to the cloud on its own.
   - On iPhone or iPad inside Canvas, in-browser Whisper is paused, so the tool there needs an opt-in or the web app.
   - This fits the school's existing Google agreement. Districts still decide for themselves.
4. **"Off the record" is a first-class command.** It keeps student discussion and personal moments out of the notes.
5. **Reuse the existing pipeline and output tools.** Only the long-capture loop and the command grammar are new.

## What already exists (reuse)

| Need | Existing piece |
|---|---|
| Microphone, voice activity detection, 16 kHz audio, Whisper/Gemini engines | `createHandsFreeRecognizer` in `voice_module.js:1303`. The voice detector `createHandsFreeVad` is at :989. |
| Browser speech with auto-restart | `initWebSpeechCapture({restartOnEnd})`, `voice_module.js:379`, :455–467 |
| Picking the engine | `resolveHandsFreeEngine`, `voice_module.js:270` (auto never picks Gemini) |
| Single microphone owner | `acquireVoiceSession(owner)`, `voice_module.js:1839` |
| Wake phrase | `detectWakeCommand` in `allo_commands_source.jsx:4054`. It is a pure function, exposed as `AlloCommands._voicePure`, and turns "Allo, key point" into `{woke:true, command:'key point'}`. |
| Sending a transcript to Source, with output shortcuts | `onSendTranscriptToFlow` in `video_studio_host_bridge_source.jsx:24`. Also `handleTranscriptSourceAction` in `host_handlers_source.jsx:10240` (exit ticket, glossary, guided notes, anchor chart, summary). |
| Note formats | The `note-taking` generator has these templates: Cornell, guided notes, Q&A, double-entry and others (`generate_dispatcher_source.jsx:9234–9360`). |
| Long text | `chunkText` (ANTI :34179). The dispatcher splits text into 9,000-character chunks. |
| Export | `ExportHandlers.handleExport` covers HTML, print/PDF, worksheet and slides. Google Docs output goes through DriveDelivery. |
| A teacher tool in the Educator Hub | Communications Studio is the model to copy: a lazy loader, a `CDNModuleGate` and a Hub card. |
| Live class sessions (for Phase 3) | `startClassSession` / `joinClassSession`, using Firestore `sessions/{code}` |

## Gaps the research found

1. **No long capture.** Every capture path is turn-based.
   - The PCM recognizer caps each segment at 10 s.
   - While a transcription is running, it holds only **one** waiting segment, and a newer segment overwrites it (`voice_module.js:1471`). Under load, lecture speech would be silently lost.
2. **No filter for Whisper hallucinations.** On silence, Whisper tends to invent phrases like "Thank you." or "Thanks for watching!". Only bracketed tokens are stripped today.
3. **Whisper is hard to reach and to prepare:**
   - The engine choice is in the header popover, but the download is on the Launch Pad, in a collapsed section labelled "Optional".
   - No size or time estimate is shown, and there is no microphone test.
   - The size tier is effectively stuck on tiny: no UI sets `whisperTier`.
   - The "download voice models" voice command calls `prefetchWhisper`, which never sets `whisperPreparedModelId`. So Auto may still choose browser speech, and standby is refused, until the model has loaded once. (This is inferred, not tested.)
   - Two status checks can disagree: `hasWhisper` and `isWhisperPrepared`.
4. **Two separate Whisper stacks, neither using the graphics card (WebGPU):**
   - `voice_module.js` uses `@xenova/transformers@2.17.2` (WASM only).
   - `allo_commands` uses `@huggingface/transformers@3.3.1` (`device:'wasm'`), through the verified-runtime loader.
5. **The desktop Whisper shim has a 60 s idle cap and a 12 s turn cap** (ANTI :17458–17605). Check that it survives a 60-minute lesson.
6. **Lectures can contain student names.** Communications Studio and MeetingDocs already remove names before sending text to Gemini. Do the same here.

## Phase 0: Whisper access and usability (helps every voice feature)

1. **One "Speech setup" panel**, opened from the header popover, the Launch Pad and the Lesson Notes start screen. It offers:
   - the engine choice with a plain-language privacy line for each option;
   - the size tier (tiny, base, small) with download size and expected speed;
   - a download button with a progress bar;
   - a **microphone test** that records 5 s and shows what was heard.
2. **One status check.**
   - `prefetchWhisper` and the Launch Pad button both record `whisperPreparedModelId`.
   - `hasWhisper` and `isWhisperPrepared` read the same truth, per tier.
3. **Hallucination filter** in `voice_module` (pure and tested):
   - Drop segments whose energy is below the speech threshold.
   - Drop known silence phrases when the segment is short or quiet.
   - Collapse runs of the same line repeated.
4. **Consolidate on transformers v3** through the verified runtime, using `device:'webgpu'` when it is available and falling back to WASM. This is the riskiest item: it touches every voice feature, so it lands behind its own tests, separately from Lesson Notes.
5. **The device picks the model size.** No reliable published browser benchmarks exist (see "Model size" below), so Speech setup measures speed itself.
   - It transcribes a bundled 10 s clip with each size the device can download.
   - It picks the largest size that runs at least **1.5× faster than real time**.
   - For a lesson, transcription may lag a little, but it has to catch up, or the backlog grows for the whole class.
   - The teacher can override the choice. The result is stored per device.

**Status 11-05:** items 1, 2 and 3 are built; item 4 is not started. Item 5 changed:
- Speech setup does not download every size to compare them, because a 238 MB test download is unreasonable on a school network.
- It times the model already on the device against the person's own microphone test, stores the result per device and per model, and suggests a bigger size only when that size should still keep up.
- Measured in native Chrome on one Snapdragon X laptop with other work running. Seconds to transcribe 3 s / 8 s / 25 s of speech:
  - Tiny as built: 3.5 / 4.0 / 5.5. Base as built: 5.1 / 6.6 / 8.4.
  - Tiny with the encoder on the GPU and the decoder on the CPU: 0.9 / 1.4 / 2.9. Base, same setup: 1.6 / 2.1 / 4.8.
  - An earlier figure here (Tiny 1.5 to 1.9 times faster than speech) came from an emulated browser and is withdrawn.
- **Item 4 changes as a result:**
  - Run only Whisper's encoder on the GPU. With the whole model on the GPU (q4 decoder), an 8 s clip came back as just "like this."
  - The library upgrade alone gives no speed gain; it only unlocks the GPU.
  - Where there is no GPU, use threads in an isolated frame (`Document-Isolation-Policy`, Chrome 137+). This ran in testing, but not yet inside real Canvas.
- None of this has been measured on a Chromebook.

### Model size (web search, 11-03)

| Size | Parameters | Download (quantized) | Notes |
|---|---|---|---|
| tiny (.en) | 39M | ~40 MB | Fastest; weakest on subject vocabulary |
| base (.en) | 74M | ~75 MB | The common default in browser Whisper projects |
| small (.en) | 244M | ~250 MB | Noticeably better; borderline without a good GPU |

- The only speed figures found come from one unverified blog: on WebGPU, tiny 10–15×, base 5–8× and small 2–4× faster than real time, with no hardware stated.
- WebGPU shipped for ChromeOS in Chrome 113 (Vulkan devices). No school-Chromebook measurements were found.
- **Expected outcome:** base on recent laptops, tiny on older Chromebooks, small only with WebGPU and a good GPU. The desktop app's whisper.cpp should handle base or small easily.

## Phase 1: Lesson Notes first version (teacher)

**Start screen:**
- the "I've told my class" checkbox;
- an optional title;
- custom instructions, for example "7th grade, focus on vocabulary";
- the engine status, with a link to Speech setup;
- the microphone test.

**Long capture:** add a `createLectureCapture` in `voice_module`.
- Reuse the PCM graph and the voice detector, with segments up to about 25 s (Whisper's window is 30 s).
- Use an **unbounded first-in, first-out queue** that never drops speech, and show a "transcription behind by N s" indicator.
- The browser-speech engine uses `initWebSpeechCapture({continuous:true, restartOnEnd:true})`.
- Take the microphone lease through `acquireVoiceSession('lesson-notes')`. Pause and resume. Wake lock if possible.

**Commands:** reuse `detectWakeCommand`, plus a small grammar of our own. Commands do not go to `commandKernel`.

| Say | Effect |
|---|---|
| "Allo, key point" (optionally followed by the point) | Highlights the last ~30 s, or the following sentence |
| "Allo, this will be on the test" | Marks the passage as an assessment item, which feeds the quiz |
| "Allo, vocabulary *word*" | Adds a glossary entry, defined from context |
| "Allo, question *…*" | Adds a review question |
| "Allo, note *…*" | Adds a free-form instruction for the summary ("make this a table") |
| "Allo, off the record" / "Allo, back on" | Text is dropped until resumed; the transcript shows a gap marker |
| "Allo, pause" / "Allo, resume" | Stops and starts listening |

Every command also has a button. Commands appear as chips in the live transcript, and each can be undone.

**Rolling notes:**
- About every 10 minutes, or every 6,000 characters, `callGemini` (JSON mode) turns the latest chunk plus its markers into partial notes: key points, terms, questions and flagged items.
- At Stop, the partial notes are merged into one set of notes. Names are removed before each call.
- This keeps each prompt small and makes the end of class fast.

**Review screen:**
- Editable notes in tabs: summary, Cornell notes, key terms and the quick quiz.
- **Send to Source** works like `onSendTranscriptToFlow`, with a `'lesson-transcript'` history type. The existing transcript shortcuts (guided/Cornell notes, glossary, exit ticket, summary) then work, along with translation and export.
- "Discard" clears everything.

**Plumbing** (modelled on Communications Studio):
- New files: `lesson_notes_source.jsx`, `_build_lesson_notes_module.js` → `lesson_notes_module.js`, and its `desktop/web-app/public/` copy.
- In ANTI:
  - `__alloLazyLessonNotes`, the open state, and a `CDNModuleGate` passing `isOpen, onClose, t, addToast, callGemini, onSendToSource`;
  - a Hub card in `view_educator_hub_modal_source.jsx`;
  - a help key in `help_strings.js`.
- Then run `node build.js`, which refreshes the delivery integrity manifest (check that the new module is listed).
- Register every UI key in `ui_strings.js` through `register_ui_strings.cjs`. Do **not** copy Communications Studio's unregistered `tr()` pattern.
- Keep ANTI comments within the comment budget.

**Tests:** vitest on `_testing` seams:
- the command grammar;
- no speech dropped under a slow transcriber (feed 40 segments, transcriber delayed 3×);
- the hallucination filter;
- off-the-record gaps;
- the merge of partial notes;
- the send-to-source payload;
- a modal render test like `communications_studio_modal.test.js`.

**Manual acceptance:** a 45–60 minute live run in Gemini Canvas on a Chromebook, and once in the desktop app. Measure:
- how far transcription falls behind;
- CPU and battery use;
- how many commands are recognized;
- the quality of the notes.

## Phase 2: Instructions and keywords

- Saved instruction presets per class.
- Teacher-defined trigger words, matched only after the wake phrase.
- The "Allo, note …" instructions are applied when the notes are merged.
- Notes per lesson series ("continue from last Tuesday's notes").

## Phase 3: Student access (later)

- The teacher shares the finished notes, never the audio, to a live session. Students get leveled or translated copies as accommodations.
- Live captions for students who need them would stream the transcript through the session document. This needs a separate privacy review.
- Students recording on their own devices is **not** recommended: consent laws and school policies vary.

## Saving and privacy: reuse what Report Writer already extracted

Report Writer itself is a clinical evaluation tool (score verifier, assessment bands), so double-purposing it would not fit. But the two pieces Lesson Notes needs were already pulled out of it as shared modules:

- **`identifier_redaction_module.js`** (`scrubIdentifiers`) is the shared name and identifier scrubber, already used by Report Writer, Dynamic Assessment and Behavior Lens. Lesson Notes runs every Gemini call through it. Students named in class become role tokens ("a student").
- **`sensitive_workspace_module.js`** holds encrypted records on the device, through the existing vault and DeviceStorage, with backup and deletion records.
  - Today it serves only the three clinical tools (`FEATURES` at the top of the file).
  - A saved lesson library could become a fourth feature. It would get encryption, backup and deletion for free.

**Plan:**
- **Phase 1:** session-only, like Report Writer's case documents. A transcript is kept only when the teacher sends it to Source.
- **Phase 2:** an optional saved lesson library on the sensitive workspace. First check that its clinical setup flow (access code) isn't too heavy for everyday teacher use. If it is, use the same device vault without the clinical lock.

## Decisions

1. **Recognition (decided 11-03):** on-device only by default; cloud engines are explicit opt-ins (see Principles).
2. **Saving (decided 11-03):** session-only in Phase 1; an encrypted library through the sensitive workspace in Phase 2.
3. **Model size (decided 11-03):** measured per device in Speech setup (Phase 0.5).
4. **Name (decided 11-03):** **Lesson Notes**, a card in the Educator Hub next to Communications Studio.
