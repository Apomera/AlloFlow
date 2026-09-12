# Digital Friendship: context, privacy and response choices

Date: 2026-09-12. Sixteenth SEL enhancement pass.

## Learning purpose

Digital Friendship now uses 14 fictional dilemmas to practice interpreting limited information, considering needs and boundaries, and choosing a response that fits the situation. Each has two possible routes, conditions that make each useful, a limit to consider, and new information that may change the learner's reasoning. The activity does not infer motives from a receipt, photo or silence, require an upbeat interpretation, or rank online connection below offline friendship.

The examples remove unsupported percentages, a universal waiting period before a follow-up, guaranteed privacy for direct messages, a requirement to mediate privately, and an obligation to provide a closing message when ending contact. Learners may choose no contact, seek trusted support, or describe a different route.

## Teaching sequence

1. **Separate the signal from the story.** Read the situation, known information, uncertainty, and needs. Optional fields support checking an inference and describing a first response or no-contact plan.
2. **Compare approaches and their limits.** Each route gives a possible message or action, when it might fit, and what it cannot solve or should avoid. Learners may compare without selecting, select a route to explore, deselect it, combine routes in their writing, or use a different idea. The privacy prompt asks who needs information and why.
3. **Reconsider after new information.** A case-specific development may reveal a boundary, access need, repeated targeting, or changed expectation. A separate route selection and reflection keep earlier reasoning available. The follow-through disclosure offers a case-specific review criterion and an optional support-planning note.

Use one step at a time when useful. All writing is optional; learners can think, draw or discuss fictional examples. Nothing in this activity sends a message, contacts a person or opens a report. Adults should help younger learners read scenarios and locate support, without asking them to disclose actual private conversations. A learner's first and later responses are both editable; the activity does not provide an immutable version history.

## Pedagogical and safety distinctions

A separate invitation is not automatically exclusion, but repeated targeting or ignored access needs deserve attention. A private message can be copied. Asking for help through a trusted route differs from sharing ridicule with peers. The screenshot examples explicitly concern ordinary messages. They are not instructions for handling intimate imagery.

A learner need not mediate, contact both parties, confront someone, or remain available to a friend. Supporting someone who posted harm does not require defending that post or dismissing those affected. Threats need a support route rather than a peer debate. Responding skillfully cannot guarantee a reply, forgiveness, renewed closeness or someone else's compliance with a boundary.

[StopBullying.gov's bystander guidance](https://www.stopbullying.gov/resources/research-resources/bystanders-are-essential) supports offering safe routes to trusted adults rather than making public intervention compulsory. Its [cyberbullying prevention guidance](https://www.stopbullying.gov/cyberbullying/prevention) emphasizes supporting those targeted and addressing harmful behavior. The [eSafety consent guidance](https://www.esafety.gov.au/key-topics/staying-safe/consent) informs attention to freely given permission and boundaries; its [unwanted-contact guidance for young people](https://www.esafety.gov.au/young-people/unsafe-contact) describes setting limits when safe and seeking help with continued unwanted contact. These are general principles, not a claim that this activity has been validated or a substitute for local procedures. All case narratives, response pairs and the teaching sequence are authored design choices.

## Case coverage

### Elementary

- **When a joke hurts:** Your friend says, 'I do not want to talk about it today.'
- **A photo without you:** You learn that a message mocking you was added to the photo.
- **A group chat turns hurtful:** One person keeps being singled out after asking everyone to stop.
- **A private message becomes a joke:** The sender asks for help because the screenshot is now in a class chat.

### Middle

- **A read receipt without a reply:** The friend replies, 'I care, but I cannot be your main support for this.'
- **An argument with an audience:** You notice one person is being mocked repeatedly, including outside the chat.
- **Mocking a private conversation:** The mocked person asks you to help them show a trusted adult what happened.
- **Contact has stopped:** You learn that they asked another friend to tell you they want no contact.
- **A feed and a feeling of exclusion:** You realize this follows several invitations where your access needs were ignored.
- **Intent, wording and repair:** The friend asks you to correct the impression in the same group, without quoting the joke.

### High

- **Different kinds of online connection:** You realize the creator's moderated community is your main accessible social space.
- **Accountability during a pile-on:** A reply shares the friend's location and encourages people to find them.
- **Staying connected after a move:** The friend says video calls are exhausting and asks for occasional voice notes or text.
- **Choosing distance from a friendship:** After you reduce contact, the person uses new accounts to keep messaging you.

## Saved state and compatibility

`digitalSelections` stores a case ID per grade band. `digitalCases` uses `band:caseID` keys and records optional `notice`, `first`, `privacy`, `choice`, `revisedChoice`, `revised`, `followup`, and `changeSeen` values. Selecting or revealing does not overwrite the first draft or add XP or completion totals. Case switches and hub reopening preserve notes; reopening disclosures is a viewing choice rather than required saved state.

The existing tool/project callbacks handle these updates. No new storage service or transmission is added. An older `digitalDraft` remains available as an unassigned draft because the previous format did not record its case and band. The explicit copy action fills only an empty first-response field and keeps the original copy. Historical `digitalDone` entries remain intact. Invalid case IDs use a bounded legacy index or the first case; malformed note values display as empty. The workshop's existing default My Style tab and saved tab selections remain respected.

## Validation and limits

Validation passed **527 existing regression checks and 22 browser workflows** (20 focused workflows and two actual-hub checks), with two existing regression skips. All 72 tools passed initial-render smoke checks. Three full-rule axe scans scoped to the activity returned zero violations. Dark comparison and high-contrast revision phone captures were visually reviewed. Syntax, source/public byte parity and scoped whitespace checks passed. Final results are archived in `reports/sel-friendship-depth/validation.json`. Focused browser tests render the actual tool with simulated state callbacks; real hub return/reopen is checked separately. Coverage includes all 14 cases and 28 response routes, optional writing, separate first/revised choices, serialized restoration, independent case/band state, non-overwriting legacy recovery, keyboard use and 320 px layouts in three themes.

The scoped accessibility audit covers the new Digital Friendship region. Real project-file round trips, packaged Desktop behavior, live assistive-technology usability and classroom outcomes remain unvalidated. Other Friendship Workshop tabs and AI outputs were not substantively reviewed in this pass. Nothing was pushed or deployed.
