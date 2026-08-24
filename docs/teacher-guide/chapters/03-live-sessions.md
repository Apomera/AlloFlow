# Run a live lesson safely and calmly

A Live Session lets a teacher pace a lesson, route resources to the class, groups, or individuals, run checks for understanding, and respond to student signals. It works best when the lesson has been prepared and previewed before students join.

Live availability, join URLs, storage, and network behavior depend on the school's deployment. Rehearse on the same network and device types students will use. Always keep a non-live fallback ready.

## Decide whether live delivery fits

Use a Live Session when you need:

- A shared sequence with teacher-controlled transitions.
- In-the-moment checks for understanding.
- Private routing of different supports.
- A way for students to send brief help signals.
- A whole-class activity with immediate facilitation.

Use a homework link, accessible document, learning-management assignment, or other asynchronous route when students need flexible timing, the connection is unreliable, or the work should not depend on everyone being online at once.

### Choose the pacing mode

The **Live Dashboard** can toggle between two pacing approaches.

| Mode | What it supports | Teacher responsibility |
| --- | --- | --- |
| **Teacher-led** | The class follows the teacher's current resource; useful for modeling, discussion, and coordinated transitions. | Announce each change, watch delivery status, and allow enough time for assistive technology and reading. |
| **Student-paced** | Students work more independently while the teacher monitors and may route targeted resources. | Make sequence and finish criteria explicit; do not assume every student is on the same screen. |

Switch deliberately. A whole-class presentation or follow-up may require Teacher-led mode, while independent work may be less disruptive in Student-paced mode. Tell students before changing the mode so a screen transition does not feel like lost work.

## Prepare before students join

### Build the resource set

Complete the workflow in [Prepare a lesson](02-prepare-a-lesson.md). Keep the live resource set small enough to navigate while teaching. A useful sequence is:

1. Opening goal and prompt.
2. Core source or model.
3. One or two optional access supports.
4. Guided practice.
5. Quick check or response.
6. Follow-up, revision, or exit prompt.

Open every student-facing resource once. Remove teacher notes and answer keys. If the workspace marks an item as teacher-only, do not try to send it to students.

### Import an existing lesson deck

Use **Import lesson deck** in the Source panel to bring in material from another presentation tool. A PowerPoint `.pptx` is the best choice: it opens in Page Designer as editable slides and preserves supported text, pictures, alt text, and layout. A PDF opens in the document pipeline and is better treated as visual source material.

Curipod, Nearpod, Pear Deck, and similar tools do not place their proprietary polls, response data, drawing prompts, or AI-feedback behavior inside an exported PowerPoint or PDF. After importing, review every slide and recreate the intended interactions as AlloFlow activities. For Google Slides or Keynote, export a `.pptx` first when possible.

### Rehearse the join and delivery path

![The Start live session dialog offering three choices: Prepare live run, marked optional, for attaching presenter cues and checkpoints to lesson steps without starting a session; Standard live session using the configured Firebase, district, or local network backend; and Class Mailbox QR session, where students scan a code and join without accounts through your Google Apps Script mailbox.](../assets/live-screenshots/09-live-session-choices.png)

Starting a live class opens this dialog. The first option prepares material without starting anything, so you can build the run in advance and start it later.

Before class:

- Start a practice session.
- Join from a student device or a separate browser profile.
- Confirm the approved student URL and session code.
- Send one resource and verify that it opens.
- Test the pacing toggle.
- Test one activity you intend to use.
- Check audio and microphone permissions only for activities that need them.
- End the practice session and reopen the saved project.

If school filters, browser privacy controls, embedded environments, or blocked real-time services interfere, use the approved deployment guidance. Do not ask students to disable device security settings.

### Plan names and groups

Decide how students will identify themselves. Follow district policy and the purpose of the lesson:

- Use a stable teacher-issued codename when names are not needed.
- Use only the minimum identifying information needed to manage the session.
- Do not encode disability, reading level, behavior, or other sensitive information in a codename or group name.
- Name groups neutrally, such as colors, table numbers, topics, or roles.
- Keep your private roster mapping outside any projected view.

Prepare groups before the activity when possible. Grouping should serve an instructional purpose and can change during the lesson.

### Prepare the room

Write the fallback task where students can see it. Decide whether the session code may be projected and hide any roster or teacher-only material before sharing your screen. Have headphones available for audio supports when possible, and avoid starting every student's read-aloud at the same time.

## Start the session and admit the class

### 1. Start from the teacher workspace

Use **Teach live** in the header or delivery workflow. Choose the connection options shown in your deployment. Once a session is active, the **Live Dashboard** becomes available to the teacher.

Open the session-code or projection view and verify that it shows only information students should see. Keep the teacher workspace on a non-projected screen if possible.

### 2. Have students join

Students open the school's approved AlloFlow student link, choose the student role if prompted, and enter the session code and approved name or codename. The precise sequence can vary by deployment.

Ask students to stop after they reach the waiting or first-resource screen. This creates a clean point for checking the roster before instruction begins.

### 3. Confirm presence

In the **Live Dashboard**, compare the visible roster with the students who should be present. Look for duplicate or unexpected codenames. A connected indicator or recent check-in is useful operational information, but it does not prove attention or understanding.

If an unknown participant appears, pause before sharing material. Use the session controls available to remove or resolve the entry, and change the session if required by school procedure.

### 4. Send a low-risk test

Open the first student-facing resource and send or present it. Ask students for a simple confirmation, then inspect delivery status. Resolve a failed or pending device before launching a timed activity.

## Use the Live Dashboard

The center groups the main controls under **Run**, **Guide**, and **Signals**. Labels and available activities may vary with loaded modules and deployment settings.

### Run

Use **Run** for student interactions and the prepared lesson sequence. Current workspaces may include:

- A live lesson run panel with resources, audiences, presenter cues, and activity snapshots.
- **Check understanding** for a fast continuum such as confused to ready.
- **Word Cloud** for short contributions.
- Open response or feedback activities.
- Moderated live questions and answers when the teacher enables them.
- **Concept Pictionary** or **Sketch Response** for visual explanation.
- Live quizzes or other prepared interactions.

Launch one activity at a time. State the purpose, response expectations, time limit, and what students should do after submitting. Close or conclude an activity before moving to a different response format.

### Guide

Use **Guide** to manage the flow around the activities. Depending on the current resource and loaded tools, it may provide:

- Presenter cues attached to a lesson step.
- A class timer or focused display.
- The Teacher-led and Student-paced toggle.
- **Groups** and audience management.
- Other session guidance configured for the lesson.

Presenter cues are private teacher reminders, not student directions. Keep anything students must know in the student-facing resource or say it aloud and provide it in another accessible form.

### Signals

Students can use preset signals to communicate a need without interrupting the whole class. The **Signals** area shows the student's codename and selected phrase. Acknowledge the signal, respond privately when appropriate, and clear it when addressed.

A signal is a request for support, not a diagnosis or behavior score. Teach a brief routine before the lesson:

1. Choose the closest signal.
2. Continue with an available support if possible.
3. Watch for the teacher's response.
4. Use the class's urgent-help procedure when a preset signal is not enough.

Do not leave the signal panel projected, especially when only one student is signaling.

## Route resources without exposing needs

### Send to the right audience

The live lesson run controls can route a student-facing resource to the whole class, a group, an individual student, or a selected set when those options are available.

Use whole-class delivery for the shared core. Use targeted delivery for a support, catch-up resource, alternate representation, or extension. A targeted route should not publicly announce why a student received it.

Before sending:

- Open the intended resource.
- Confirm it is student-facing.
- Confirm the selected audience.
- State whether it replaces or supplements the current task.
- Send it once, then check delivery rather than repeatedly clicking.

### Understand delivery status

The center may show whether a learner has a target resource, whether it is loading, pending, open, or failed, and whether the device is connected or quiet. Treat these as troubleshooting signals:

- **No target:** no current assignment is being indicated for that student.
- **Assigned or pending:** the resource was targeted but has not yet been confirmed open.
- **Loading:** the student device is attempting to open it.
- **On it:** the device reports the expected resource.
- **Failed:** the resource did not load and needs a recovery path.

Status does not show whether the student read, understood, or completed the resource. Ask for evidence rather than inferring learning from a green indicator.

Individual and group targets can take precedence over the whole-class resource. If a student appears “stuck” on a different item, check for an individual or group assignment and use the available release control before sending the class resource again.

### Change pace carefully

In Teacher-led mode, changing the current class resource can move connected student devices and may affect devices that reconnect while it remains current. Give a spoken and visible transition cue first.

In Student-paced mode, a whole-class follow pointer may not behave like a synchronized presentation. Use explicit directions and targeted sends as needed, then verify the result on the student device. If a prepared whole-class follow-up reports that Teacher-led mode is required, switch modes only after warning the class.

## Facilitate live activities

### Check understanding

Use **Check understanding** for a decision you are prepared to make. Ask one focused question such as “How ready are you to explain the relationship?” Display what each response option means, allow a short wait, and decide in advance what will happen at each pattern of responses.

Do not use confidence as a substitute for knowledge. Pair it with a prompt, example, or subsequent evidence task when accuracy matters.

### Word Cloud

Use **Word Cloud** for short, non-sensitive contributions: a key term, observation, prediction, or theme. Tell students not to enter names or private stories. Review or moderate responses before displaying them when the interface offers that control. A word's visual prominence represents frequency, not importance or correctness.

### Open response and feedback

Give a bounded prompt, response length, and success criterion. If the platform can generate feedback, review the selected response and generated feedback before treating it as instructional guidance. Do not submit identifying text or confidential student work to an AI provider.

### Concept Pictionary and Sketch Response

Use drawing to reveal relationships, models, processes, or vocabulary, not artistic talent. Provide a non-drawing response option when motor, visual, device, or cultural factors make the activity inaccessible. Remind students not to draw identifying or inappropriate content.

### Live quiz

Verify each item and answer key before class. Start with an untimed practice item if students are new to the interface. A missing or unscored response can reflect connection trouble, not lack of knowledge; check the delivery state before drawing conclusions.

### Moderated questions and answers

Enable live questions only when you can actively moderate them. Establish norms for relevance and privacy. Review submissions before sharing them with the class, and use the school's normal safety process for a message that indicates urgent risk.

## Read Activity Pulse and other live evidence

**Activity Pulse** and activity snapshots can help you see counts, statuses, or response patterns while teaching. Use them to choose a next move:

- Pause and model again.
- Send a support to a small group.
- Ask students to compare reasoning.
- Release a targeted resource and return to the shared task.
- Save an item for follow-up rather than extending the live lesson.

These indicators are incomplete classroom evidence. They may omit response content, depend on the connection, or represent device events rather than learning. Never turn a live status directly into a grade, diagnosis, disciplinary judgment, or high-stakes placement decision.

## Recover during class

### A student cannot join

Check the join URL, session code, role, and codename entry. Confirm the teacher session is still active. Have the student reopen the approved link rather than using another student's page. If joining still fails, give the fallback resource and continue the lesson.

### A resource does not arrive

Confirm the student is connected, the resource is student-facing, and the correct audience was selected. Check for a conflicting individual or group target. Use the center's delivery state or session-health control, then try a targeted resend once. If it still fails, share the fallback format.

### The class appears out of sync

Pause transitions. State the title of the screen everyone should have. Check the pacing mode and current class resource, then inspect individual or group assignments. Release outdated targets when appropriate. Avoid creating a second session until you understand whether the original is recoverable; two active codes create more confusion.

### An activity stalls

Close the activity panel if possible and return to the core resource. Capture the instructional question orally, on paper, or in a simple response form. Do not spend the lesson repeatedly reconnecting an optional activity.

### The connection drops

Keep the tab and session code available while devices reconnect. Do not assume a quiet presence indicator means a student intentionally left. Move to the posted fallback if the connection is not restored quickly enough for the learning goal.

See [Troubleshooting](08-troubleshooting.md) for a fuller diagnostic sequence.

## End the session deliberately

Do not treat closing a tab as the same as ending a class session. Use the session's **End Session** control. If an end-session preview is shown, review what will close, what evidence or follow-up is available, and whether any student is still active before confirming.

After ending:

1. Confirm students have saved or submitted the expected work.
2. Record only the evidence you need in the approved system.
3. Note connection failures or missing evidence separately from academic performance.
4. Save the teacher project with **Save Project** when available.
5. Export or retain a session summary only if district policy permits it.
6. Remove projected codes, rosters, and response views.
7. Plan the next instructional move while the lesson context is fresh.

The end-session summary is a starting point for teacher reflection, not a complete record of learning. Continue with [Review evidence and plan next steps](05-review-and-next-steps.md).

## Live lesson checklist

Before students join:

- The student route, first resource, and one activity were rehearsed.
- Resource names and audience assignments are clear.
- The join method and codename routine follow school policy.
- The projected view contains no private teacher or roster information.
- A no-network fallback is ready.

While teaching:

- Students know the goal, pacing mode, and next action.
- Delivery status is used for troubleshooting, not judging effort.
- Targeted supports are routed privately.
- Signals are acknowledged and cleared.
- Activities have a purpose, time boundary, and accessible alternative.

Before ending:

- Student work is saved or submitted.
- Missing evidence is separated from wrong answers.
- The session is ended through the interface.
- The project and appropriate follow-up notes are saved.
- No session code, roster, or student response remains projected.

For a detailed learner-experience check before the next session, see [Accessibility and UDL](04-accessibility-and-udl.md). For privacy boundaries, see [Privacy and responsible AI](07-privacy-and-responsible-ai.md). If your lesson includes a story mode, [Adventure Mode](12-adventure-mode.md) covers when students see it and how resume stays scoped to this lesson.
