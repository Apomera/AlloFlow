# For Educators: Using the SEL Hub Responsibly

A practical guide to what this tool is, how student data flows through it, and what you need to set up before you hand it to a class.

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

The Hub is designed for the **Canvas runtime** — meaning the app lives inside a chat-style canvas while the student is using it, and **vanishes when the canvas closes**. Read that sentence twice. It is the most important fact on this page.

**Ephemeral by default:**
- While a student is using the Hub, their answers, reflections, and progress live in the browser tab's memory.
- When they close the tab, refresh, or end the session, **everything is gone**. There is no server-side database storing student work. There is no account, no login, no profile tied to a real identity.
- You, as the educator, **cannot retrieve** a student's session after the fact. Neither can IT. Neither can the vendor. It doesn't exist anywhere to retrieve.

**The sneakernet save/load pattern:**
- If a student wants to keep their work, they click **Export** (or **Save Progress**). The Hub generates a **JSON file** and downloads it to the student's own device.
- That file lives in their Downloads folder — or wherever they save it — on their personal or school-issued device. It does not get uploaded anywhere.
- To resume later, the student opens the Hub fresh and clicks **Import**, then selects the JSON file from their device. The Hub reads it back into memory and they pick up where they left off.
- This is called "sneakernet" because the data moves only when a human physically carries it (on a USB stick, a Drive folder they choose, an email attachment, etc.). The Hub itself never transports it.

**What gets saved into the JSON:**
- Reflections the student typed.
- Activity progress and choices.
- Any tags or check-ins the student created during the session.

**What is NOT saved:**
- The student's name (unless they typed it themselves into a reflection).
- Their device ID, IP, location, or any browser fingerprint.
- Time-on-task analytics or behavioral telemetry.

**Practical implication for you:**
- If a student says "I lost my work," and they didn't Export, it's genuinely gone. Frame this expectation upfront.
- If a student emails you their JSON, treat it like any other student-generated document under your district's records policies. You are now the custodian of that file.

---

## 3. AI features and student safety

Some Hub activities can use a generative AI helper for things like rephrasing a reflection, suggesting coping strategies, or generating a practice scenario. This piece needs careful setup.

**The runtime context:**
- The Hub is built to run inside a Google Workspace EDU environment with Gemini Canvas. That means AI calls inherit your domain's Workspace data-handling terms — student prompts are **not** used to train consumer models, and the data stays inside the EDU tenant's contract boundary.

**The 18+ default — and the nuance:**
- Google's default policy restricts Gemini for users under 18.
- **However**, Workspace EDU admins can enable Gemini for under-18 users in their domain, typically with documented parent consent. If your IT department has done this, AI features work for your students. If they haven't, students under 18 will see AI features disabled or get an access error.
- **You cannot bypass this from inside the Hub.** It's an admin-level setting on the Workspace tenant, not a Hub toggle.

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

The Hub has a **safety layer** that watches for language suggesting a student may be in crisis — self-harm, suicidal ideation, abuse disclosures, severe distress.

**What the student sees when the safety layer fires:**
- The current activity pauses.
- A modal appears with **988** (Suicide & Crisis Lifeline, call or text) and **741741** (Crisis Text Line, text HOME).
- A short message encourages them to talk to a trusted adult and lists generic supports.
- The student can dismiss the modal and return to the activity, or close the Hub entirely.

**What you, the teacher, can and cannot do:**
- You **cannot** retrieve a transcript of what triggered the modal. Nothing is logged. Nothing is sent to you, to administrators, or to the vendor.
- You **cannot** get a list of which students saw the modal.
- This is by design — students need to be able to express distress in a practice space without a paper trail following them.

**What you should do:**
- If a student tells you the modal appeared, treat that as a disclosure and follow your building's standard crisis-response protocol — typically: stay with the student, contact the counselor or designated mental health staff, do not leave them alone, document per your district's reporting requirements.
- Do **not** rely on the Hub to surface at-risk students for you. It won't. Your eyes, your relationship with the student, and your colleagues' observations are still the actual safety net.
- Before launching the Hub with a class, confirm you know who to call when a student is in crisis and how fast they can respond.

---

## 5. Parent notification

Even though the Hub stores no persistent student data, parents deserve to know their child is using it. Norms vary by district — here is a starting template.

**Sample parent letter (copy and adapt):**

> Dear families,
>
> This year, our class will occasionally use an online tool called the SEL Hub. It offers short activities to help students notice their feelings, practice coping strategies, and reflect on social situations.
>
> A few things to know:
>
> - **It is not a test or assessment.** Nothing students do in the Hub is graded or recorded in their school file.
> - **No accounts, no stored data.** The Hub does not create a login for your child. When they close the activity, their work disappears unless they choose to save a file to their own device.
> - **Optional AI helper.** Some activities offer an AI helper to suggest words or coping ideas. This runs inside our school's Google Workspace for Education environment, which means student input is not used to train outside AI models. [If your district has not enabled Gemini for under-18 users, delete this paragraph or note that AI features are turned off.]
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
- [ ] **IT confirmation on Gemini.** Ask your IT or Workspace admin whether Gemini is enabled for under-18 users in your Organizational Unit. If yes, AI features will work; if no, plan to use the Hub without AI features (most activities still function).
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
