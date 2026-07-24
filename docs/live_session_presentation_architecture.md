# Live session presentation architecture

## Goal

Make AlloFlow easier to run as a coherent live lesson while refining the
resources, activities, and session infrastructure that already exist.

The live presentation experience is a coordination layer. It is not a second
lesson editor, resource model, activity framework, or session transport.

## Reuse boundaries

| Concern | Existing owner | Live presentation rule |
| --- | --- | --- |
| Lesson content and order | `history` plus `units` / `activeUnitId` | Read the active unit's filtered History order; do not copy it into deck state. |
| Student-visible eligibility | `_alloStudentSafeResources` / `SessionTransport.studentSafeResources` | Delegate to this one filter and fail closed if it is unavailable. |
| Opening a resource | `handleRestoreView` | Route every lesson-path action through this handler. |
| Teacher-paced following | `_alloFollowResourceLive` via `handleRestoreView` | Do not write `currentResourceId` from the presentation component. |
| Group resource delivery | `handleSetGroupResource` | Pass the selected existing resource id to this handler; retain its nonce and student-paced consume-once behavior. |
| Individual resource delivery | `handleSetStudentResource` | Pass the selected existing resource id to this handler; retain individual > group > class precedence. |
| Live activities | Live Polling, quiz, Pictionary, and other current activity modules | Launch or compose these modules; do not implement parallel activity types. |
| Session health and roster | Existing Live Session Center | Keep the lesson path in that center rather than adding another floating host panel. |

## Phase 1: Lesson path

`LiveLessonRunPanel` adds the missing teacher-facing sequence controller to the
Live Session Center:

- It shows the current active unit's student-facing resources in History order.
- It resolves the current step from the teacher-open resource, then the session
  follow pointer.
- It supports previous, present/start, next, and direct jump actions.
- It explains the current teacher-paced or student-paced behavior.
- It closes the dock and calls the shell's existing `handleRestoreView` when a
  teacher chooses a step.

The component owns only ephemeral UI calculations. It creates no persisted
lesson-path state and makes no network or session writes.

## Phase 2: Audience-aware delivery

The lesson path separates resource selection from delivery:

- Previous, Next, and Choose step only focus a resource. They do not push it.
- Whole-class presentation still calls `handleRestoreView`, preserving the
  current teacher-paced/student-paced behavior.
- Group sends call the existing `handleSetGroupResource(groupId, resourceId)`.
- Individual sends call the existing
  `handleSetStudentResource(uid, resourceId)`.
- The audience list is derived from the live session's existing `groups` and
  `roster`; it is not persisted by the presentation component.
- Last-reported viewing counts are derived from the existing `viewingResourceId` delivery
  acknowledgments. The existing Students section remains the detailed delivery
  and override-management surface.

This keeps the established priority of individual override, then group
override, then class follow. No new audience records, write paths, or resource
copies are introduced.

## Phase 3: Reused presenter controls

The Live Session Center exposes presenter shortcuts without introducing new
engines:

- Focus display calls the existing `handleSetIsZenModeToTrue`, retaining the
  current output renderer, Escape handling, and exit control.
- Class timer opens the existing `StudyTimerModal` and displays its current
  `studyTimeLeft`; no second countdown state or interval exists.
- The existing session-code button opens `SessionModal`, whose current
  projection mode remains the canonical join-code/QR projection surface.
- Private speaker notes are intentionally deferred. Teacher annotations are
  student/export-facing and must not be silently repurposed as private notes.

## Phase 4: Word Cloud through Live Polling

Word Cloud is a poll type, not a separate live-activity engine:

- The existing Live Polling HostPanel composes and broadcasts it.
- Students return one bounded word or short phrase through the current WebRTC
  response payload; nothing is added to the session document.
- Normalization and case-insensitive aggregation happen on the teacher device.
- Terms begin in Hold state. The teacher can approve or hide each normalized
  term, or explicitly approve all pending terms.
- Reveal uses the current anonymous-results broadcast and sends only approved
  labels and counts. Student ids, codenames, held terms, and hidden terms are
  excluded.
- The Live Session Center Word Cloud shortcut only seeds the existing
  HostPanel composer, matching the Quick Check preset pattern.
- Poll response targeting remains connected to the session roster, while
  resource differentiation continues through the existing class, group, and
  individual delivery handlers documented above.

## Phase 5: Sketch Response through Concept Pictionary

Sketch Response is a second mode of the existing Concept Pictionary module,
not a new drawing engine:

- It reuses the Pictionary canvas, undo/toolbox, WebRTC peers, reconnect flow,
  timer, roster gate, and Tier-1 role markers.
- Selected students, an existing group, or the whole class can receive the
  teacher-authored prompt. Nonparticipants are not auto-opened.
- Each participant's strokes remain private between that student and the
  teacher host. The host does not rebroadcast sketch strokes or undo messages
  to classmates.
- Students explicitly submit or return to editing. The teacher gallery keeps
  submissions held until approved or hidden.
- Reveal sends a sanitized, anonymous stroke payload with no uid, codename, or
  group metadata.
- Gallery follow-up actions call the existing individual and group resource
  delivery handlers with an existing student-safe resource id.
- Pictionary remains the default mode with its collaborative canvas, hidden
  concept, guessing, scoring, teams, and round log unchanged.

## Phase 6: Feedback Response through free-text Live Polling

Feedback Response is a configuration of the existing `freetext` poll, not a
new activity or response transport:

- The Live Session Center preset seeds the current HostPanel with feedback and
  one-revision mode. Teachers can also enable the same mode from any free-text
  poll.
- Whole-class, group, and individual audiences are resolved from connected
  polling peers plus the current session roster. Nonparticipants receive an
  id-less close message and are excluded on reconnect and response receipt.
- Student draft content is never streamed. Only bounded `drafting`,
  `editing`, and `submitted` statuses travel to the teacher before submit.
- A submitted response remains on the teacher device. The existing AI backend
  can draft identity-free, criteria-aligned feedback, but the teacher must
  review or edit it and explicitly send it to one student. Generation sends
  the bounded response and criteria—without uid or codename—to the teacher's
  configured AI provider; the teacher UI discloses this before generation.
- The targeted feedback packet contains bounded feedback text, poll id,
  attempt number, revision permission, and timestamps—no uid or codename.
- Attempt one may reopen the original response for one revision. Attempt two
  cannot open a third attempt; the teacher may send final feedback.
- The private gallery calls the existing individual and group resource
  delivery handlers with student-safe resource ids for differentiated
  follow-up.
- Feedback polls cannot enter the anonymous class-results broadcast path.
  Raw writing and feedback are not added to the live session document or the
  current saved-session summary.

## Phase 7: Live Activity Pulse and evidence-to-action

The Live Lesson path now coordinates run-state metadata from existing activity
owners without becoming a new activity engine or reporting stream:

- Live Polling (including Word Cloud and Feedback Response) and Concept
  Pictionary (including Sketch Response) emit the same bounded snapshot shape.
- `sanitizeLiveActivitySnapshot` rebuilds every snapshot from an allowlist:
  activity family/kind/phase, audience uid set, waiting/working/submitted/revised
  status, aggregate moderation counts, and timing metadata.
- Prompts, answers, guesses, strokes, feedback, codenames, routing rules, and
  arbitrary emitter fields are structurally excluded.
- Snapshots remain in teacher React memory. They are not written to Firestore,
  the Class Mailbox live pack, or either WebRTC activity channel.
- Activity Pulse appears inside the existing Lesson path, shows participation
  progress and students still waiting/working, and opens the existing owning
  dashboard rather than recreating its timer or moderation controls.
- A teacher can send the currently selected student-safe Lesson path resource
  to a waiting/working student through the established individual resource
  callback and delivery-ack path.
- At explicit session end, the existing device-local roster history receives
  only aggregate activity records plus codename-matched participation counts.
  Activity ids, uids, and raw student work are omitted from the saved summary.

## Next increments

Future work should continue as refinements over this contract:

1. Define an explicit private presenter-notes owner and visibility contract
   before adding notes to the live controls.
2. Add the existing Live Quiz owner to the same snapshot contract after its
   Firestore/P2P merged response state is normalized at the host boundary.
3. Refine the existing saved-session-history view with activity-kind filters
   and teacher-authored follow-up notes; do not add a cloud reporting stream.
4. Improve ordering/editing in History or units when sequence authoring needs
   grow; do not add a separate slide organizer.

## Verification

The phase is pinned by `tests/live_lesson_run.test.js`,
`tests/live_polling_wordcloud.test.js`,
`tests/live_polling_feedback_response.test.js`,
`tests/live_activity_pulse.test.js`,
`tests/live_polling_feedback_response_ui.test.js`, and the existing live
session, session transport, and canvas live-control suites. The normal build
smoke and extracted-view prop verifiers must also remain green.
