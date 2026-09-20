# Memory Aid refinement — September 19, 2026

Implemented the five refinements approved after the September 19 review.

## Learner experience

- **Clearer recall:** Generated resources now request a short neutral recall question. Teachers can edit it alongside the facts. Recall without hints and the corresponding print preset show that question while hiding the cue, answers, images and mnemonic type. A conservative direct-copy check rejects long verbatim answer/cue copies; it does not certify semantic neutrality. Older resources explicitly explain how to identify the topic before starting.
- **Private follow-up recovery:** Application explanations, self-checks, comparison state and review dates save as they change. “Continue my application and plan” resumes the same completed recall record. Saving and failure states remain visible; manual saving retries a failed write. If the application question changes, the earlier explanation is shown separately instead of being presented as the new answer.
- **Review continuity:** Changing a cue keeps the review plan when the fact identities remain the same. Earlier-cue attempts are labeled and are not evidence of success with the new cue. Changed facts require fresh practice. The existing teacher verification requirements still apply.
- **Due reviews:** “Practice due targets” starts a bounded sequence, lets learners choose their support, counts newly completed recalls, and allows skipping or leaving. Resuming an older plan never counts as a new completed recall. These are self-checks, not mastery scores or notifications.
- **Learner connections:** “Connect my cue to the facts” records the cue fragment and optional explanation for each fact. The display shows current coverage, retains earlier notes, and requires learners to recheck connections when their cue changes. Connections travel with learner responses, backups and full exports. An unchanged copy of the supplied cue retains its original mapping in study and print.

Teacher fact-review landmarks now have unique target-specific accessible names. Hidden type badges also stay hidden during unsupported recall at screen sizes where utility display styles previously overrode the hidden attribute.

## Persistence and export boundaries

Private application work remains in the existing browser/profile practice store. Field-level follow-up patches merge into the latest saved attempt instead of replacing unrelated recall evidence. The patch cannot recreate a missing or deleted attempt, and async completion cannot populate a different learner's view. Existing browser-storage fallback messages remain accurate, without a repeated notification for every keystroke.

Learner connection identifiers use opaque hashes rather than embedding teacher fact text. Submission and backup serialization allowlists only the connection's identifier, cue fragment, explanation and cue identity. Private application responses and practice history remain outside these shared response projections and print presets. Exports escape connection text and label retained notes when current applicability cannot be established.

## Validation

- **201 tests passed across 10 files**, including 15 new functional regressions. After the final accessibility-label change, the affected teacher, translation, export and refinement tests were rerun; label-specific assertions now check the unique names. Two existing host-wiring assertions were updated to follow handlers already extracted into `host_handlers_source.jsx`.
- **10 real-browser states** checked with Playwright and axe at 1280, 390 and 320 px: study, connection editing, unsupported recall, application, reload/resume, due-review setup/completion, and teacher editing.
- **Zero detected axe violations, horizontal overflow or page runtime errors** in those states. Desktop study and mobile recall screenshots were visually inspected.
- Verified private draft/self-check/date recovery after reload, no answer-bearing visible metadata during unsupported recall, stale connection reconfirmation, due-sequence completion, teacher question editing, and private-work exclusion from print.
- The Memory Aid generated module is byte-for-byte fresh. Root and desktop public copies match for Memory Aid, generation dispatcher, document pipeline, response boundary and UI strings.

Evidence: [final validation](REFINEMENT-VALIDATION-2026-09-19.json), [browser checks](refinement-browser-qa.json), [updated local preview](current-preview.html).

The browser fixture is authored and uses mocked AI services. Live model/image generation quality and classroom learning outcomes were not tested in this pass. No deployment was performed.
