# For Educators: Using the SEL Hub Responsibly

A practical guide to what this tool is, how student data flows through it, and what you need to set up before you hand it to a class.

> **Guide status:** Responsible-use reference, reviewed August 20, 2026. Product behavior, AI-service terms, crisis resources, and district requirements can change; verify the current release and your approved deployment before student use.

---

## 1. What this Hub is — and what it isn't

**What it is:**
- A **formative practice space** for social-emotional skills: noticing emotions, naming them, practicing regulation strategies, reflecting on choices.
- A **conversation starter** between you and a student, or between a student and a caregiver.
- A **low-stakes sandbox** where students can rehearse before situations get hard.

**What it is not:**
- Not a validated **assessment instrument**. The activities aren't normed, scored against a reference population, or psychometrically reliable.
- Not a **clinical screener** for depression, anxiety, ADHD, trauma, suicidality, or anything else. Nothing a student does here should appear in a referral, an IEP present-levels statement, or a tiered-intervention decision as evidence.
- Not a **counseling substitute**. If a student needs a counselor, they need a counselor.
- Not a **behavior surveillance tool**. There is no teacher dashboard tracking who clicked what.

If a colleague treats Hub activity as data for a high-stakes decision, gently push back. The tool isn't built for that, and pretending it is harms students.

---

## 2. How student data works

The Hub is designed for local-first use, but **local-first does not mean ephemeral in every runtime**. Canvas, Desktop, exported files, browser storage, and school-hosted live sessions have different persistence and network behavior. Treat each approved deployment as its own data-flow review.

**Understand the active mode:**
- A solo activity can keep answers and progress in the browser tab, while preferences, safety flags, or recovery data may use browser storage. Closing a tab may discard unsaved activity state, but it is not proof of secure deletion.
- A local solo session does not create an AlloFlow account. Optional AI calls send the current prompt and relevant student text to the configured AI service; a school-hosted live session can send the progress or safety signals described below to the teacher session.
- Educators generally cannot retrieve an unsaved solo activity after the fact. Exported files, AI-service records, browser storage, and school-controlled live-session records are separate artifacts and must follow district policy.

**The sneakernet save/load pattern:**
- If a student wants to keep their work, they click **Export** (or **Save Progress**). The Hub generates a **JSON file** and downloads it to the student's own device.
- That file lives in their Downloads folder — or wherever they save it — on their personal or school-issued device. The export action itself does not upload the file, but a student can later place it in Drive, email, or another service.
- To resume later, the student opens the Hub fresh and clicks **Import**, then selects the JSON file from their device. The Hub reads it back into memory and they pick up where they left off.
- This is called "sneakernet" because the data moves only when a human physically carries it (on a USB stick, a Drive folder they choose, an email attachment, etc.). The default Hub save/load path does not upload it to an AlloFlow-operated database.

**What gets saved into the JSON:**
- Reflections the student typed.
- Activity progress and choices.
- Any tags or check-ins the student created during the session.

**What the exported JSON is designed not to add:**
- A separate student-name field, unless the student typed identifying information into a response.
- Unrelated work from other students or activities.
- A new AlloFlow account or cloud profile.

Inspect an example export from the current release before deployment. Do not infer what an AI provider, browser, network, or school-hosted service logs from what the local export contains.

**Practical implication for you:**
- If a student says "I lost my work" and they did not Export, assume the activity is not recoverable through the normal classroom workflow. Frame this expectation upfront without promising that every technical trace has been erased.
- If a student emails you their JSON, treat it like any other student-generated document under your district's records policies. You are now the custodian of that file.

---

## 3. AI features and student safety

Some Hub activities can use a generative AI helper for things like rephrasing a reflection, suggesting coping strategies, or generating a practice scenario. This piece needs careful setup.

**The runtime and account context:**
- AlloFlow can run with Gemini Canvas, another configured cloud AI service, or a local model. Opening the Hub in Canvas does not by itself prove which contractual protections, retention settings, or age rules apply.
- Google states that Gemini access and data protections for school accounts depend on the Workspace edition and administrator configuration. Access must be enabled by the institution's administrator, and feature availability can differ by age, service, and license.
- Before student use, ask the Workspace administrator to confirm the exact organizational unit, whether Gemini Apps is a core or additional service for that account, the displayed data-protection status, activity retention, Connected Apps settings, minimum-age rules, and any notice or consent required by district policy.
- **You cannot bypass an account or administrator restriction from inside the Hub.** If the approved AI service is unavailable, use the non-AI activities or a district-approved alternative.

**What gets sent to the AI model when a student uses an AI feature:**
- The specific prompt the activity generates (e.g., "rephrase this reflection in a calmer tone: [student text]").
- The student's free-text input for that prompt.

**What is NOT sent:**
- The student's name or identity (the Hub doesn't know it).
- Previous session history.
- Other students' work.
- Anything from outside the current activity.

**Practical guidance:**
- Tell students explicitly: "When you use the AI helper, it sees what you type into that box. Don't put your full name, address, phone number, or anyone else's private information in there."
- Model this yourself in the first session.

---

## 4. Crisis-flag handling

Before classroom use, trigger the safety flow in the current release, verify the displayed phone/text resources for your country or region, and confirm exactly what the teacher receives in solo and live-session modes. A software flag is not crisis monitoring and must never replace the school's response protocol.

The Hub has a **safety layer** that watches for language suggesting a student may be in crisis — self-harm, suicidal ideation, abuse disclosures, severe distress.

**What the student sees when the safety layer fires:**
- The current activity pauses.
- A modal appears with **988** (Suicide & Crisis Lifeline, call or text) and **741741** (Crisis Text Line, text HOME).
- A short message encourages them to talk to a trusted adult and lists generic supports.
- The student can dismiss the modal and return to the activity, or close the Hub entirely.

**What you, the teacher, can and cannot do:**
- You **cannot** retrieve a transcript of the conversation. No transcript is retained anywhere — the crisis modal holds the flagged text only while it is open.
- **In a live web session** (students joined with your session code, not the Canvas build): your dashboard shows a **count-based safety alert** per student — a flag total and a "critical" indicator, **never the student's words**. Treat a critical indicator as a prompt to check in personally.
- **In solo mode or the Canvas build**: nothing reaches you, administrators, or the vendor — no alert, no list of which students saw the modal. The student sees crisis resources in the moment; adult follow-up depends entirely on someone telling you.
- For the record: each flag does write a small entry (category plus a ~100-character excerpt) to the **browser's local storage on the student's device**. It is not transmitted anywhere, but on a shared device it is not invisible either — "no paper trail" is approximately true, not literally true. (Reducing this footprint further is on the roadmap.)
- The in-app consent screen tells students the same story for their mode — in solo/Canvas it explicitly says **no adult is automatically notified** and urges them to tell a trusted adult directly.

**What you should do:**
- If a student tells you the modal appeared, treat that as a disclosure and follow your building's standard crisis-response protocol — typically: stay with the student, contact the counselor or designated mental health staff, do not leave them alone, document per your district's reporting requirements.
- Do **not** rely on the Hub to surface at-risk students for you. Even the live-session alert is a blunt count that depends on the AI being reachable; in solo/Canvas there is no alert at all. Your eyes, your relationship with the student, and your colleagues' observations are still the actual safety net.
- Before launching the Hub with a class, confirm you know who to call when a student is in crisis and how fast they can respond.

---

## 5. Parent notification

The Hub's data flow depends on the approved mode: solo activity state may stay local, exports create files, optional AI sends the current prompt to the configured service, and live sessions can send progress summaries or safety signals to the teacher session. Families deserve a description of the mode students will actually use. Norms vary by district; this is a starting template, not a substitute for approved district language.

**Sample parent letter (copy and adapt):**

> Dear families,
>
> This year, our class will occasionally use an online tool called the SEL Hub. It offers short activities to help students notice their feelings, practice coping strategies, and reflect on social situations.
>
> A few things to know:
>
> - **It is not a test or assessment.** Nothing students do in the Hub is graded or recorded in their school file.
> - **No AlloFlow student account.** The Hub does not create an AlloFlow login for your child. Unsaved solo activity work is normally not recoverable through the classroom workflow; exports, browser storage, AI use, and live sessions are handled as described in our district-approved setup.
> - **Optional AI helper.** Some activities can send the text entered into that activity to our district-approved AI service to suggest words or coping ideas. Our technology team has reviewed the service, account type, data protections, retention, and age requirements. [Replace this sentence with your district's approved description, or state that AI features are turned off.]
> - **Safety support built in.** If a student writes about being in crisis, the activity pauses and shows the 988 Suicide & Crisis Lifeline (call or text 988) and Crisis Text Line (text HOME to 741741), along with a reminder to talk to a trusted adult.
>
> If you'd prefer your child opt out of Hub activities, or if you have questions, please reach out. I'm happy to walk you through what students will see.

**Add to your AUP / class syllabus:**
- A line naming the SEL Hub as a tool used in class.
- A statement that it is formative, not assessed, not a screener.
- A pointer to the parent contact for opt-out.

**Suggested timing:**
- Send the notice **before** the first session, not after.
- Re-send or link it at the start of any term where you reintroduce the tool.
- Keep the opt-out easy and ungated — no form fees, no required meeting.

---

## 6. Verification checklist

Before you use the Hub with students, walk through this list:

- [ ] **AUP check.** Confirm your district's Acceptable Use Policy permits classroom use of third-party SEL tools, and that this tool is covered (either by name or by category).
- [ ] **AI-service confirmation.** Ask IT to verify the exact AI backend, organizational unit, license/service status, age access, data-protection indicator, activity retention, Connected Apps, and district approval. If any point is unclear, plan to use the Hub without AI features.
- [ ] **Parent notice sent.** Either the letter above (adapted) or your district's standard family-communication channel — sent before students start.
- [ ] **Opt-out path clear.** You know how a parent can decline, and you have a non-tech alternative activity ready.
- [ ] **Crisis-response protocol ready.** You know who to contact, how fast they respond, and where the student should be while you wait.
- [ ] **Student orientation done.** Students know (a) their work disappears unless they Export, (b) the AI helper sees what they type, and (c) the 988/741741 modal exists and how to use it.
- [ ] **Your own boundaries set.** You've decided what you will and won't ask students to share in reflections, and what you'll do with any JSONs they send you.

---

## 7. Limitations to be honest about

The Hub is genuinely useful for what it's designed for. It is also genuinely limited. Tell students and colleagues the truth:

- **It does not replace counseling.** A student working through grief, trauma, or chronic anxiety needs a trained mental-health professional, not a web activity.
- **It does not screen for anything.** It cannot tell you which students are depressed, suicidal, anxious, neurodivergent, abused, or anything else. Activities that look diagnostic are practice scaffolds, not instruments.
- **It does not produce IEP-quality data.** Nothing from a Hub session belongs in present-levels, goal-progress monitoring, or evaluation reports. If you need progress data, use validated tools.
- **It cannot verify a student's emotional state.** A student can click "I feel great" while feeling terrible, or vice versa. Treat self-report as one data point among many — and a weak one.
- **It is not a substitute for relationships.** The reason SEL works in schools is that adults notice, name, and respond to what kids are going through. The Hub can rehearse vocabulary. It cannot care about your students. You can.

If you keep that frame, the Hub is a useful piece of a thoughtful SEL practice. If you let it drift into "assessment," "screener," or "early-warning system," it will quietly cause harm. Use it like a journal prompt or a role-play card — supportive, formative, low-stakes — and it will earn its place in your room.

---

## Current sources to verify before deployment

- [Google: Use Gemini Apps with a work or school account](https://support.google.com/gemini/answer/14620100?co=DASHER._Family%3DEducation) — account access and data protections vary by Workspace edition.
- [Google: What you need to sign in to Gemini Apps](https://support.google.com/gemini/answer/13278668) — current school-account access and administrator requirements.
- [Google: Gemini Apps Privacy Hub](https://support.google.com/gemini/answer/13594961) — current activity, retention, and privacy disclosures.
- [988 Suicide & Crisis Lifeline](https://988lifeline.org/) and [Crisis Text Line](https://www.crisistextline.org/) — verify current contact methods and adapt for your country or region.

Record the date, reviewer, deployment, and policy decision whenever this guide is approved for student use.
