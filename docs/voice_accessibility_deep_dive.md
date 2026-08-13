# Voice Access and Hands-Free Accessibility Deep Dive

## Product decision

AlloFlow should remain multimodal. Pointer, touch, keyboard, switch access, screen readers, and voice access should coexist. A voice-only journey is a required acceptance-test profile, not a product mode that disables other inputs.

This distinction matters:

- Disabling pointer or keyboard would remove useful assistive combinations and create new barriers.
- Running selected tests with pointer and keyboard unavailable exposes hidden voice dependencies.
- The app should preserve the same state, permission, validation, and safety rules regardless of input method.

## Accessibility target

After an explicit, consent-respecting Voice Access activation, a learner should be able to:

1. Hear where they are and what actions are available.
2. Open, operate, and leave the current surface.
3. Hear content, control reading, and recover from interruptions.
4. Enter or edit an answer and confirm consequential actions.
5. Move between global commands and a surface-specific hands-free experience without competing microphones.
6. Complete a task without relying on visual pointing, pointer input, or keyboard input.

The first microphone activation is a special boundary. Browsers and operating systems may require an explicit user gesture or permission prompt. AlloFlow must expose a clearly named Voice Access control that can be activated by OS voice control, switch access, keyboard, touch, or pointer; it should not silently open the microphone.

## Findings from the original audit

The previous implementation had several critical voice-only dead ends:

- Talk could start global commands and dictation at the same time.
- Spoken pause released the microphone but could not be spoken-resumed.
- Destructive commands requested an Enter-key confirmation with no spoken yes/no state.
- Read This Page opened a panel but did not begin reading, and the global stop command controlled a different audio path.
- Test Prep had a strong local question loop but required visual setup and completion controls and did not reliably restore global voice access.
- Ordinary quizzes could be opened by voice but not operated by voice.
- Page narration omitted many control names, values, states, messages, and visual alternatives.
- Most tests exercised parsers and source contracts rather than a complete no-pointer/no-keyboard journey.

## Implemented foundation

### One microphone owner

The shared voice coordinator now arbitrates command recognition, dictation, and surface hands-free sessions. It exposes observable starting, listening, paused, stopped, and error state and releases a replaced session safely. Talk stops legacy dictation before enabling command mode and cleans up on stop, pause, and close.

### Voice lifecycle and safety

- Voice Access startup reports actual listening state instead of treating a permission probe as success.
- Spoken pause defaults to a timed pause and automatically resumes; UI/API pause remains indefinite.
- Timers are cleared on resume, stop, or ownership replacement.
- Destructive actions use a private, time-limited pending confirmation with spoken yes/no/repeat handling.
- The spoken response window is 45 seconds so slow reply speech cannot consume the learner's opportunity to answer.
- Spoken multi-step plans require explicit confirmation before execution.
- Replies do not restart a paused recognizer.
- Voice speed and volume are honored, and failed neural speech falls back to browser speech.

### Orientation and recovery

Global semantic commands now include describing the current screen, listing available actions, going back, closing the current surface, and repeating the last response. Onboarding choices are command-addressable while protected roles retain their access-code gate.

### Read This Page

The reader now exposes a shared controller for start, stop, pause, resume, next item, previous item, repeat item, and close. Global stop controls the reader's audio, closing restores focus, and assignment-direction reading starts narration. While narration is audible, command recognition defers through the same voice session; learner speech pauses the reader and returns the microphone through the shared barge-in path.

The readable-content model now includes visible headings and text, meaningful image alternatives, named controls, current values, and relevant disabled, pressed, expanded, checked, invalid, status, and description state. Hidden content and sensitive input values are excluded.

### Test Prep

Test Prep now exposes a semantic voice boundary and scoped setup commands. A learner can list ready practice sets, select one by safe number or exact name, start practice and hands-free mode, choose another set after completion, open progress, or exit. Voice ownership is handed back to the prior global command session unless another legitimate session has taken control.

### Ordinary quiz

The ordinary quiz now exposes scoped commands to describe/list, hear or repeat the question, choose a multiple-choice answer by letter/number/ordinal, check when supported, navigate, repeat feedback, close, and submit with spoken confirmation. It does not expose the answer key before checking.

The same semantic boundary now supports short-answer, fill-blank, self-explanation, numeric-response, multi-select, sequence-sense, and relation-mismatch items. It reuses each item card's React setters and graders rather than simulating DOM clicks, and it narrates type-specific state without exposing answer keys before checking.

Answer-evidence items require unambiguous answer-part and evidence-part commands, block evidence selection until an answer exists, and never expose keys before checking. Quiz reflections can be listed, selected, read, drafted, appended, cleared, submitted, reopened for editing, and navigated; replacing, clearing, or submitting text is confirmation-gated.

### Named-field entry

A reusable low-priority field scope can list and select fields by exact accessible name or number, then set/dictate, append, read, or clear the selected field. Clear is destructive and always requires spoken confirmation. Values are excluded from public scope state and confirmation snapshots. Host adapters now cover source text, sentence-frame responses, non-manipulative math "show your work" responses, Persona chat/reflection drafts, DBQ essay and analysis fields, and Cornell, lab-report, reading-response, double-entry, guided-notes, and Q&A note templates.

### Student entry

The required Student Entry dialog now has scoped describe/list, private-codename randomize, confirmed start-new-work, and cancel/back commands. Its semantic state exposes only whether a codename is ready, never the codename itself.

### Student save and submission

Student Save and Submit dialogs now expose high-priority semantic scopes for orientation, action listing, validation, cancel/back, filename editing, private codename option selection, work-summary narration, and consequential spoken confirmation. Confirmation names the actual mailbox or device-download destination. Private codenames never enter command state or submission narration; a default filename containing the codename is explicitly withheld from read-filename output. Duplicate voice saves are blocked, and pointer/keyboard saves retain the native FERPA warning.

### Regression coverage

The command coverage audit now has JSON, baseline-write, and non-regression check modes. The checked-in baseline prevents command-count loss, hidden surface loss, a higher uncovered count, or newly uncovered help-key surfaces. This remains a fuzzy inventory guard, not evidence that a matched surface is fully voice-operable.

An isolated Playwright profile now passes a Student journey with one allowed Voice Access activation click. It covers spoken orientation, Full Platform and Student selection, confirmed new-work entry, page narration, Submit-dialog orientation and work-summary narration, spoken refusal of submission, dialog exit, Test Prep status and exit, and global stop-listening. After activation, transcripts enter only through a mocked SpeechRecognition implementation; a capture-phase sentinel recorded zero trusted pointer or keyboard events.

## Current limitations

This is a substantial P0 foundation, not full application parity yet.

- Named-field gaps remain in KWL/local notebook state, grading revision drafts, live written quiz fields outside the ordinary Quiz adapter, settings, and specialized labs/studios.
- Many specialized studios, simulations, settings panels, and document workflows still need their own semantic action manifest or adapter.
- Generic command-coverage auditing is directional: it currently reports 175 registry commands and 225 of 545 help-key surfaces as fuzzily covered. Some uncovered entries are non-actions or should not map directly to commands, but the result still shows meaningful remaining work.
- Newly introduced command strings have English fallbacks; complete reviewed translations and localized recognition grammars remain follow-up work.
- Mocked speech-recognition tests cannot validate real accents, dysarthria, noise, browser permission behavior, or coexistence with NVDA, JAWS, VoiceOver, Dragon, Windows Voice Access, and switch control.

## Required acceptance strategy

Keep ordinary pointer and keyboard tests. Add a second journey profile in which the harness deliberately provides no pointer or keyboard input after Voice Access activation. That profile should cover:

The isolated Student Playwright journey establishes this profile for onboarding, Student Entry, spoken confirmation, reading, Test Prep boundary handoff, closing, and stopping Voice Access. It should be extended rather than used as a replacement for the following full journey:

- onboarding and role selection;
- screen description and action discovery;
- reading directions and controlling narration;
- answering, editing, saving, submitting, and spoken confirmation;
- Test Prep setup through progress and exit;
- microphone handoff and exactly-one-owner enforcement;
- permission denial/recovery, backgrounding, low confidence, no speech, offline behavior, and interruption;
- return to the dashboard with state and focus intact.

Manual assistive-technology validation remains required in addition to browser automation.

## Definition of done for each surface

Every learner-facing view or dialog should provide, directly or through a shared semantic contract:

- a concise state description;
- a list of currently valid actions;
- commands for its primary select/edit/submit workflow;
- complete content and state narration, including a text equivalent for essential visuals;
- confirm/cancel behavior for consequential actions;
- back/close/recovery behavior;
- explicit microphone and audio ownership;
- a no-pointer/no-keyboard acceptance test or a documented equivalent path.
