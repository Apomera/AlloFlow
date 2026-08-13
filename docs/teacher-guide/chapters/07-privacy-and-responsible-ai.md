# Privacy and responsible AI

AlloFlow is designed to support data-minimizing classroom workflows, but the app name alone does not make a use private, compliant, or instructionally sound. The result depends on the deployment, provider settings, district agreements, content entered, sharing choices, and teacher practice.

Use this chapter as an operational checklist. It is not legal advice and does not replace district policy, an approved data-protection agreement, or review by privacy, security, special education, and legal staff.

## The safest default

Use the minimum information needed for the teaching task.

For routine generation, do not enter:

- student names, initials used as identifiers, email addresses, account names, or student numbers;
- dates of birth, addresses, schedules, locations, or combinations of details that identify a learner;
- disability, diagnosis, IEP or 504 content, health, counseling, discipline, behavior, family, immigration, or child-protection information;
- assessment protocols, copyrighted secure test items, or personally identifying report excerpts;
- a recognizable student photo, face, voice, handwriting sample, or work sample unless the specific workflow is approved; or
- secrets such as passwords, API keys, live-session administrative credentials, or private links.

Replace a named student profile with an instructional description such as "a middle-school learner who benefits from shorter directions, visual examples, and a choice of typed or selected response." Remove rare combinations of details that could still identify the student.

Clinical or specialist tools do not create an exception to this rule. Only authorized staff should use identifiable records, and only in a deployment and workflow that the district has explicitly approved for that purpose.

## Ask five questions before adding content

1. **Is the information necessary?** If the task works with de-identified text or a fictional example, use that.
2. **Where will it be processed?** Confirm whether the selected AI backend is local, district-managed, or an external service.
3. **Where will it be stored?** Consider browser storage, cloud coordination, project files, exports, shared links, LMS copies, and backups.
4. **Who can receive it?** Check the live-session target, group, share permissions, and whether students can see one another’s content.
5. **How will it be removed?** Know the district retention rule and the deletion controls for that deployment before beginning.

If you cannot answer these questions, pause and use non-identifying content.

## Understand the data path

AlloFlow can run in more than one environment. Features and data handling differ.

| Workflow | What to assume until verified | Teacher action |
|---|---|---|
| AI generation | The prompt and source may be sent to the selected AI provider | Use de-identified content and confirm the provider is district-approved |
| Local or desktop generation | Processing may stay on the teacher device, but browser storage, project files, and local logs can still contain content | Use a managed device and approved storage; verify the actual backend status |
| Live Session | Session coordination, delivery, responses, or fallback data may use local peer connections or a configured backend | Use the district-approved live deployment and the approved codename or roster practice |
| Browser drafts and saved state | Work may persist on that browser or device | Do not use a shared profile for sensitive work; clear data according to policy |
| AlloFlow project file | The downloaded file can contain source material, generated resources, settings, notes, and other included state | Use a neutral filename and protect the file as an instructional record |
| Export, QR code, or share link | A new copy or access path is created outside the authoring view | Preview without teacher privileges, limit access, and remove the copy when no longer needed |
| Microphone, image, or portrait feature | Audio or images may be captured or sent to a provider depending on the feature and backend | Obtain required approval, provide a non-recording alternative, and verify the destination |
| LMS launch | Course, role, or assignment context may be supplied by the LMS | Use only the district-configured integration and follow LMS retention rules |

“Local” is not the same as “risk-free.” A lost laptop, shared Windows profile, synced Downloads folder, browser backup, or copied project file can expose local content.

## Confirm the deployment before a live lesson

The main live-session paths have different operational boundaries:

- **Desktop or local-network path:** classroom traffic may remain on the local network, but devices must be able to reach the teacher host and the school must approve the local setup.
- **District-owned web deployment:** the district can configure hosting, authentication, backend rules, retention, and monitoring. Those controls still need to be deployed and tested.
- **Provider-hosted or Canvas-style authoring environment:** the surrounding platform controls important account, processing, and retention terms. Platform assurances do not automatically cover every app data flow or live-session design.
- **LMS-integrated path:** the LMS can add course and assignment context and may create its own records and copies.

Do not infer that a feature is approved merely because it opens. Ask the district which URL, desktop package, AI backend, live-session mode, and storage location teachers should use.

For student sessions:

- use codenames or the district-approved roster approach;
- do not put a student name in a session title, group name, broadcast, or free-text prompt;
- share the session code only with the intended class;
- verify recipients before targeted delivery;
- close the session when instruction is complete; and
- follow the deployment’s documented retention and deletion procedure.

## Use a teacher review loop for every AI output

AI output is a draft. Before students see it:

1. **Compare with the source.** Check claims, quotations, dates, names, calculations, definitions, and citations.
2. **Check the target.** Make sure the resource measures or teaches the intended skill rather than a side skill such as reading speed or typing.
3. **Check difficulty.** Confirm that simplification did not remove the concept, evidence, uncertainty, or disciplinary vocabulary.
4. **Check bias and representation.** Look for stereotypes, deficit language, cultural assumptions, false balance, and missing perspectives.
5. **Check age and context.** Remove patronizing wording, unsafe scenarios, commercial persuasion, and content that is inappropriate for the class.
6. **Check answerability.** Complete each question yourself and confirm that the correct response is supported.
7. **Check accessibility.** Review headings, reading order, contrast, alt text, captions, keyboard use, timing, and response options.
8. **Edit visibly.** Make the resource your own instructional material rather than presenting an unreviewed generation as authority.
9. **Monitor use.** Watch how actual students interpret the task and stop or adjust if the resource causes harm or confusion.

Grounding or citation features can help locate sources; they do not eliminate the need to open the source and verify the claim.

## Be transparent with students

Give an age-appropriate explanation:

- what AI helped create or adapt;
- what information, if any, students are expected to enter;
- whether a teacher will see submissions;
- whether the activity is graded;
- how students should report a wrong, biased, unsafe, or inaccessible result; and
- what non-AI or non-recording alternative is available.

Do not tell students that a free-text space is private, confidential, or continuously monitored unless the school has actually established and staffed that workflow. For sensitive SEL activities, state clearly that the tool is not a counselor or emergency service and point students to trusted adults and school procedures.

## Keep human decisions human

Do not use an AI generation, dashboard pattern, or automated score as the sole basis for:

- a grade with significant consequences;
- discipline, threat assessment, or a behavior plan;
- disability identification, eligibility, placement, or service decisions;
- a mental-health or medical conclusion;
- an English-language proficiency decision;
- a standardized or diagnostic interpretation;
- a recommendation recorded as a fact in an educational record; or
- restricting a student’s access to instruction or an accommodation.

Use validated instruments, required team processes, qualified professional judgment, direct evidence, and student or family participation as applicable.

## Apply extra care to specialist surfaces

### SEL and safety-related activities

Preview prompts, establish an opt-out, and avoid requiring personal disclosure. Automated safety checks can miss risk, misunderstand figurative language, or create false reassurance. Follow school crisis, bullying, mandated-reporting, and student-support procedures whenever a real concern appears.

### BehaviorLens and behavior data

Record observable context and behavior rather than intent or character. Separate facts from hypotheses. Behavior data can be highly identifying and sensitive; use the authorized team workflow and approved deployment. A generated pattern is not an FBA, BIP, diagnosis, or team decision.

### Dynamic Assessment and learning probes

Use prompts to observe strategy, response to support, and instructional next steps. Do not describe a generated activity as standardized, norm-referenced, diagnostic, or equivalent to an evaluation.

### Report Writer and formal documents

Only authorized professionals should use student records. Verify every score, descriptor, name, date, pronoun, source, and recommendation against the original record. Never let generated prose override test manuals, professional standards, team findings, or district document controls.

### Symbol Studio and AAC

Generated symbols, boards, schedules, and stories require review by the student and communication team. Check cultural meaning, age respect, visual clarity, vocabulary placement, motor access, and voice ownership. Do not replace an established AAC system for convenience.

### Accessibility and PDF tools

Automated checks and remediations are evidence, not certification. Confirm reading order, semantics, text alternatives, forms, captions, keyboard operation, and usability with human testing appropriate to the audience.

## Respect copyright, attribution, and media rights

- Use material your school is permitted to copy, adapt, and distribute.
- Keep attribution and citations when adapting a source.
- Do not upload secure assessments, paid curriculum, student publications, or copyrighted media simply because a tool accepts the file.
- Verify the license and provenance of generated or retrieved images, audio, and video before publication.
- Obtain any required consent before using a recognizable student image or voice.
- Teach students to distinguish quotation, paraphrase, synthesis, and AI assistance according to the class and school policy.

## Save and share with intention

Before downloading or sharing:

1. Use a neutral filename that does not contain a student name, disability, behavior, or score.
2. Open the exported file and check that teacher notes, hidden text, annotations, answer keys, comments, metadata, and unused pages are appropriate for the recipient.
3. Store it in a district-approved location rather than a personal drive, consumer account, or unapproved synced folder.
4. Use the narrowest share permission and an expiration date when available.
5. Avoid public QR codes or links for student work or class data.
6. Remove duplicate local downloads and revoke links when the instructional need ends.

An AlloFlow project is a convenient backup, but it is also a container of the content you put into it. Treat it accordingly.

## Respond to a privacy mistake

If identifying or sensitive information is entered, sent to the wrong group, exposed in a share, or included in a bug report:

1. Stop the activity or sharing path.
2. Close or rotate the live session if necessary.
3. Remove access or delete the exposed copy when your role permits.
4. Do not spread the information further while trying to diagnose the problem.
5. Record only the minimum facts needed: time, system, type of information, recipients, and actions taken.
6. Notify the school’s designated administrator, privacy officer, security contact, or IT help desk through the approved process.
7. Follow the district incident-response and family-notification procedure.

Do not paste the sensitive content into a support ticket. Use a redacted screenshot or a fictional reproduction of the technical problem.

## A 60-second teacher preflight

Before generation or delivery, confirm:

- I am on the district-approved deployment and backend.
- My source is de-identified and permitted for this use.
- I know where drafts, responses, project files, and exports will be stored.
- I reviewed the generated content for accuracy, bias, safety, and accessibility.
- Students know the purpose, audience, data expectations, and alternative route.
- Live-session recipients and sharing permissions are correct.
- I have a non-AI or offline fallback.
- I know what to do if a student discloses a safety concern or if data is exposed.

For a practical live-room routine, return to [Live sessions](03-live-sessions.md). For safe interpretation of results, use [Review evidence and plan next steps](05-review-and-next-steps.md). If a deployment or connection problem occurs, continue to [Troubleshooting](08-troubleshooting.md).
