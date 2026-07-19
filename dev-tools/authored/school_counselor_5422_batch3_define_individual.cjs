'use strict';

module.exports = [
  {
    skillId: 'counselor-role-national-model',
    prompt: 'A middle school counseling advisory council recommends ending all grade-level lessons so counselors can serve only students referred by staff. What is the most appropriate counselor response?',
    correct: 'Compare the council\'s input with student-needs evidence, equitable access, and current standards before deciding.',
    distractors: [
      {
        text: 'Adopt the recommendation as written because advisory-council preferences should outweigh the current service data.',
        reason: 'This mistakes an advisory body for a governing body and bypasses the counselor responsibility to reconcile input with evidence, standards, and equitable access.',
      },
      {
        text: 'Dismiss the recommendation because people outside the counseling department should not influence program priorities.',
        reason: 'This rejects legitimate stakeholder voice and loses useful contextual evidence instead of engaging the council in transparent program improvement.',
      },
      {
        text: 'Seek feedback from students receiving individual counseling and use that sample to judge whether grade-level lessons should continue.',
        reason: 'This samples current service users rather than the full student population and would systematically omit students affected by universal access decisions.',
      },
    ],
    rationale: 'An advisory council supplies perspective and feedback, while program decisions remain grounded in student needs, equitable access, professional standards, available evidence, and transparent follow-up.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'Before a new school year, a principal and counselor are clarifying how the counseling program will support two identified student outcome priorities. Which product would best guide their shared work?',
    correct: 'Create an annual agreement covering outcomes, role-aligned services, time priorities, shared responsibilities, and review.',
    distractors: [
      {
        text: 'A list of every clerical task the counselor might complete whenever another staff member is unavailable.',
        reason: 'This centers miscellaneous coverage rather than connecting counselor time and responsibilities to agreed student outcomes and program delivery.',
      },
      {
        text: 'A confidential roster of students the counselor predicts will require the greatest amount of individual attention.',
        reason: 'This prematurely labels students and does not establish program priorities, universal services, shared responsibilities, or a review process.',
      },
      {
        text: 'The prior year schedule adopted without discussion so the counselor can avoid negotiating responsibilities with administration.',
        reason: 'This assumes last year remains appropriate and misses the collaborative alignment needed when current needs, priorities, or resources have changed.',
      },
    ],
    rationale: 'An annual administrative agreement converts identified student needs into shared expectations about outcomes, services, time, roles, collaboration, and review while preserving counselor professional responsibilities.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'An elementary counselor is creating a peer welcome team for students who enter the school midyear. Which design best preserves the counselor role and protects participating students?',
    correct: 'Set limited welcome tasks, train and supervise peers, preserve choice, provide an adult help route, and evaluate.',
    distractors: [
      {
        text: 'Train peer helpers to provide confidential counseling and decide when a newly enrolled student no longer needs adult support.',
        reason: 'This delegates professional counseling and risk decisions to students who lack the role, training, authority, and safeguards for those responsibilities.',
      },
      {
        text: 'Select only the most popular students as helpers and allow them to develop their own procedures without adult monitoring.',
        reason: 'Popularity is not a safeguard, and an unsupervised process can create exclusion, inconsistent boundaries, and unrecognized student concerns.',
      },
      {
        text: 'Require every newly enrolled student to meet daily with a peer helper even when the student prefers another form of support.',
        reason: 'Mandatory peer contact disregards student choice and individual access needs and may make a supportive program feel intrusive or stigmatizing.',
      },
    ],
    rationale: 'Peer helpers can extend welcoming and connection when their task is bounded, voluntary, trained, supervised, connected to adult support, and evaluated without substituting for professional services.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'Family feedback about the high school counseling program comes almost entirely from English-language online surveys completed during evening hours. What is the best program-level response?',
    correct: 'Offer translated, accessible, phone, in-person, and varied-time options, then examine whose perspectives are still missing.',
    distractors: [
      {
        text: 'Conclude that families who did not complete the survey are satisfied and therefore do not need additional opportunities to respond.',
        reason: 'Nonparticipation cannot be interpreted as satisfaction, especially when language, technology, disability, work, or scheduling barriers may shape response.',
      },
      {
        text: 'Ask students to translate all survey questions and sensitive family comments because they already know the counseling program.',
        reason: 'Using students as default interpreters can compromise accuracy, privacy, and family participation and places an inappropriate burden on students.',
      },
      {
        text: 'Keep the survey unchanged so responses can be compared over time even though the same access barriers will continue.',
        reason: 'Consistency does not justify a method that systematically excludes stakeholders; access changes can be documented when interpreting trend data.',
      },
    ],
    rationale: 'Equitable family engagement requires multiple accessible routes, appropriate language support, and participation analysis so program decisions are not driven only by the easiest voices to collect.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'A school board asks whether a new eighth-grade career exploration unit should continue. Which counselor report would provide the most useful evidence for that decision?',
    correct: 'Report reach, implementation, aligned learning and outcome data, disaggregated results, limitations, and next steps.',
    distractors: [
      {
        text: 'A collection of the three most enthusiastic student comments presented as proof that the unit works for every student.',
        reason: 'Selected testimonials can illustrate experience but cannot establish reach, representative learning, equitable benefit, or implementation quality.',
      },
      {
        text: 'The total number of lessons delivered, without information about attendance, learning, student experience, or later decisions.',
        reason: 'Delivery counts describe activity but do not show who participated, what students learned, whether access differed, or what should change.',
      },
      {
        text: 'A statement that the unit caused improved graduation outcomes because the current class has a higher average than last year.',
        reason: 'A year-to-year average alone does not support that causal claim and may conceal other changes, group differences, and implementation limitations.',
      },
    ],
    rationale: 'Responsible program reporting connects reach, implementation, learning, outcomes, equity, and stakeholder experience while naming limitations and translating the evidence into a reviewable decision.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'A student-support team has three competing proposals for using a small prevention grant, and each department argues that its own plan should take priority. As meeting facilitator, what should the counselor do first?',
    correct: 'Define a shared student outcome and transparent selection criteria, assign roles, examine evidence, and schedule review.',
    distractors: [
      {
        text: 'Choose the counseling department proposal because the counselor was asked to facilitate and therefore owns the final decision.',
        reason: 'Facilitation does not confer unilateral authority; using the role to privilege one department undermines collaboration and transparent stewardship.',
      },
      {
        text: 'Divide the money equally among all proposals without considering need, feasibility, reach, or expected student benefit.',
        reason: 'Equal division may appear neutral but avoids the evidence-based and equity-focused criteria needed for a defensible resource decision.',
      },
      {
        text: 'Postpone the decision until every participant agrees completely, even if the funding deadline will pass.',
        reason: 'Collaboration does not require unanimity, and indefinite delay can forfeit resources without resolving how evidence and student priorities should guide action.',
      },
    ],
    rationale: 'Collaborative leadership creates a fair decision process around a shared outcome, explicit criteria, relevant evidence, assigned roles, and planned evaluation rather than asserting authority or avoiding tradeoffs.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'A district purchases a social-emotional learning curriculum and asks the school counselor to deliver every lesson alone in all classrooms. Which response best supports a comprehensive program?',
    correct: 'Evaluate fit and access, co-plan with educators, preserve responsive services, and monitor learning and reach.',
    distractors: [
      {
        text: 'Accept sole responsibility for every lesson, even if individual support, family consultation, and program evaluation must stop.',
        reason: 'This creates an unsustainable single-person delivery model and displaces other essential direct and indirect counseling services.',
      },
      {
        text: 'Send the purchased materials to teachers without review because classroom instruction is never connected to the counseling program.',
        reason: 'Developmental instruction is part of a comprehensive program, and the counselor has a legitimate role in alignment, consultation, and evaluation.',
      },
      {
        text: 'Replace all responsive counseling with the curriculum because universal lessons should meet every level of student need.',
        reason: 'Universal instruction cannot address every targeted, individual, urgent, or access need and should operate within a broader service continuum.',
      },
    ],
    rationale: 'A sustainable comprehensive program shares implementation, aligns instruction with standards and learner access, preserves responsive services, and evaluates whether the curriculum reaches its intended outcomes.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'counselor-role-national-model',
    prompt: 'On a K-12 campus, three counselors independently repeat some activities while other grade transitions receive no planned support. What is the strongest program-development step?',
    correct: 'Map services across grades and domains, compare them with needs and standards, and build an evaluated scope and sequence.',
    distractors: [
      {
        text: 'Allow each counselor to continue preferred activities because professional autonomy is more important than continuity for students.',
        reason: 'Professional judgment matters, but disconnected activities can create duplication and gaps that a coordinated program should deliberately address.',
      },
      {
        text: 'Require one identical lesson at every grade so the program appears consistent across the entire campus.',
        reason: 'Identical delivery confuses consistency with developmental alignment and ignores changing student contexts, complexity, and autonomy across grades.',
      },
      {
        text: 'Select activities mainly by how attractive they will look in school publicity and defer outcome planning until the year ends.',
        reason: 'Visibility is not a student-need criterion, and delaying outcome planning prevents the team from collecting evidence needed for improvement.',
      },
    ],
    rationale: 'A coherent K-12 program uses an evidence-informed scope and sequence to reduce gaps and unnecessary repetition while adapting services developmentally and defining how progress will be reviewed.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },

  {
    skillId: 'development-learning-family-systems',
    prompt: 'A fifth grader completes homework successfully at home and at school but becomes distressed because family and teacher expectations for checking the work conflict. Which intervention best reflects ecological thinking?',
    correct: 'Clarify the home-school expectation mismatch with both parties and co-design a routine that respects family practices.',
    distractors: [
      {
        text: 'Teach the student to comply with whichever adult is present and avoid discussing the inconsistent expectations across settings.',
        reason: 'This places the entire burden on the student and leaves the cross-setting interaction that is producing the distress unchanged.',
      },
      {
        text: 'Assume the family routine is the problem because school expectations should automatically govern learning practices at home.',
        reason: 'This treats one system as inherently superior and ignores family knowledge, culture, feasibility, and the reciprocal nature of the mismatch.',
      },
      {
        text: 'Provide a reward for finishing homework even though completion is already successful in both environments.',
        reason: 'The target concern is conflicting expectations rather than task completion, so reinforcement does not address the identified ecological problem.',
      },
    ],
    rationale: 'Ecological practice examines interactions among home and school systems. Aligning communication and expectations addresses the actual cross-setting barrier without blaming the student or family.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'A fourth grader often leaves the seat during lengthy independent work; peers laugh, and the student is then allowed to finish in the hallway. Before selecting a support, what should the counselor help the team do?',
    correct: 'Define the behavior and collect antecedent, consequence, task, time, and setting patterns before selecting support.',
    distractors: [
      {
        text: 'Assume peer attention is the primary cause, selecting a separate workspace as the support each time the behavior occurs.',
        reason: 'The laughter is one possible consequence, but the task demand and hallway escape may also matter; selecting a cause before gathering data is premature.',
      },
      {
        text: 'Recommend a stronger consequence before collecting classroom data so the student sees the behavior as unacceptable.',
        reason: 'Punishment selected without understanding function may be ineffective, disproportionate, or strengthen avoidance while failing to teach a replacement behavior.',
      },
      {
        text: 'Interpret the behavior as evidence of a disorder and request a label before examining classroom patterns or instructional fit.',
        reason: 'Observable behavior in one context does not establish a diagnosis, and contextual assessment should precede assumptions about an internal condition.',
      },
    ],
    rationale: 'Antecedent-behavior-consequence and contextual information helps the team form a testable hypothesis about function, choose a matched support, and monitor whether the plan works.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'A second grader can begin a morning task after using a picture checklist but still needs encouragement to use it consistently. Which reinforcement plan is most appropriate?',
    correct: 'Make a valued reinforcer contingent on observable task initiation, apply it consistently, monitor, and fade.',
    distractors: [
      {
        text: 'Offer an increasingly large prize only after the student refuses several times and an adult completes the first step.',
        reason: 'Delivering the reward after refusal and adult completion makes the contingency unclear and may reinforce delay rather than independent task initiation.',
      },
      {
        text: 'Remove all morning work permanently so the student will not experience frustration while learning the routine.',
        reason: 'Eliminating the task prevents skill development and does not use reinforcement to increase an achievable replacement behavior.',
      },
      {
        text: 'Use the same reward chosen for another student without asking whether it is valued or monitoring its effect.',
        reason: 'A consequence functions as reinforcement only if it increases the target behavior, so preference and outcome data must be checked individually.',
      },
    ],
    rationale: 'Effective positive reinforcement is contingent on a clearly defined behavior, meaningful to the learner, delivered consistently, evaluated with data, and faded as natural competence develops.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'A seventh grader avoids a short class presentation and says, "I am not someone who can speak in front of people." Which support is most likely to build self-efficacy?',
    correct: 'Use graduated student-chosen rehearsals, useful models, and specific feedback before increasing the audience.',
    distractors: [
      {
        text: 'Give repeated general praise that the student is naturally confident without arranging any opportunity for successful practice.',
        reason: 'Unsupported praise does not create credible mastery evidence and may conflict with the student experience rather than strengthening capability beliefs.',
      },
      {
        text: 'Require the full presentation without preparation so the student learns that anxiety should simply be ignored.',
        reason: 'An abrupt high-demand exposure without collaboration or skill preparation can produce failure and further weaken perceived competence.',
      },
      {
        text: 'Excuse the student from every future speaking task because avoiding discomfort is the most reliable path to confidence.',
        reason: 'Permanent avoidance removes opportunities for supported mastery and can preserve the belief that the student cannot develop the skill.',
      },
    ],
    rationale: 'Self-efficacy grows through credible mastery experiences, useful models, specific feedback, and manageable progression. Choice and successful rehearsal make new capability evidence personally meaningful.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'Two students experience the same unexpected schedule change. One calls it an adventure, while the other expects the day to be a disaster. What should the counselor infer first?',
    correct: 'Explore how each student interprets the change and how prior experience, support, and perceived control shape the response.',
    distractors: [
      {
        text: 'The student who is distressed must have weaker character because objective events create identical reactions in well-adjusted students.',
        reason: 'This moralizes the response and ignores how appraisal, history, context, and available supports influence a person\'s experience of an event.',
      },
      {
        text: 'The positive reaction proves the schedule change has no meaningful impact and no student perspective needs further exploration.',
        reason: 'One student\'s reaction cannot establish the effect on others, and both positive and negative appraisals still warrant contextual understanding.',
      },
      {
        text: 'Age alone should predict the reaction, so the counselor should use the same developmental explanation without asking either student.',
        reason: 'Developmental patterns are not rigid rules, and students of the same age can differ in appraisal, experience, culture, support, and agency.',
      },
    ],
    rationale: 'Cognitive appraisal helps explain why the same situation produces different responses. The counselor should explore meaning and context rather than treating one reaction as defective or universal.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'A seventh grader understands assignments but repeatedly forgets materials when changing classes. Which developmentally responsive support is best?',
    correct: 'Co-create and rehearse a portable visual routine with transition cues, then use data to fade adult prompts.',
    distractors: [
      {
        text: 'Give daily verbal reminders indefinitely so the student never has to manage the transition without an adult prompt.',
        reason: 'Permanent adult prompting can create dependence and provides no plan for transferring control to student-managed cues and routines.',
      },
      {
        text: 'Lower the academic expectations because forgetting materials demonstrates that the student cannot understand grade-level work.',
        reason: 'The scenario distinguishes organization from content understanding, so reducing academic opportunity mismatches the demonstrated need.',
      },
      {
        text: 'Tell the student to be more responsible and assign consequences without teaching or testing an organization strategy.',
        reason: 'A character-based directive does not build the missing routine, examine transition conditions, or provide evidence about which support is effective.',
      },
    ],
    rationale: 'External routines, authentic rehearsal, and environmental cues can support developing executive skills while planned data-based fading promotes autonomy instead of lowering expectations.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'A family and counselor hold different expectations about when an adolescent should make major educational decisions independently. What is the most culturally responsive next step?',
    correct: 'Ask how the family understands roles and student voice, then co-design a decision process that respects both.',
    distractors: [
      {
        text: 'Tell the family that healthy adolescence always requires the student to make educational decisions without family involvement.',
        reason: 'This turns one cultural expectation into a universal developmental rule and may silence legitimate family and student perspectives.',
      },
      {
        text: 'Defer every decision to the family without checking what participation or autonomy the student wants and can exercise.',
        reason: 'Cultural responsiveness does not mean assuming family preference; the counselor must also understand the student\'s voice, rights, and readiness.',
      },
      {
        text: 'Avoid the topic because differences in family roles cannot be discussed without judging a family\'s culture.',
        reason: 'Respectful inquiry is necessary for collaboration; silence leaves the disagreement unresolved and may prevent an accessible planning process.',
      },
    ],
    rationale: 'Cultural humility replaces rigid assumptions with inquiry about meaning, values, roles, and student voice, allowing the counselor and family to build a developmentally supportive process together.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'development-learning-family-systems',
    prompt: 'After relocating, a high school student is often absent because an unreliable bus route conflicts with a caregiver work schedule, although the student completes missed work. What is the best conceptualization?',
    correct: 'Map the interacting transportation, family, school, and community factors, coordinate access supports, and monitor attendance.',
    distractors: [
      {
        text: 'Treat the absences mainly as evidence of low academic motivation and begin with an individual school-attendance compliance plan.',
        reason: 'This ignores the stated transportation and family-system barriers as well as the student\'s evidence of continued academic engagement.',
      },
      {
        text: 'Focus first on changing the caregiver work schedule, treating that family factor as the central source of the problem.',
        reason: 'This assigns blame to one person and overlooks interacting transportation, school, community, and scheduling conditions that may be changeable.',
      },
      {
        text: 'Wait for grades to decline before responding because completed assignments show that attendance access is not currently important.',
        reason: 'Academic completion does not erase lost instructional access or the opportunity to address a known barrier before additional consequences emerge.',
      },
    ],
    rationale: 'An ecological formulation considers interacting home, school, transportation, and community conditions alongside student strengths, leading to coordinated barrier reduction rather than an internal deficit explanation.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },

  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'After a counseling group meeting, one member posts another member\'s personal disclosure in a class chat. What is the counselor\'s best initial response?',
    correct: 'Assess harm and safety, support the affected student, follow established procedures, reinforce privacy expectations, and document.',
    distractors: [
      {
        text: 'Reassure the affected student that asking the poster to delete the message will likely contain the disclosure.',
        reason: 'The counselor cannot guarantee control of copied digital information or other people\'s behavior and should not offer certainty that cannot be delivered.',
      },
      {
        text: 'Suspend the group after the breach and avoid discussing it with members because revisiting confidentiality could increase discomfort.',
        reason: 'Abrupt closure may remove support and avoids assessing harm, applying procedures, restoring norms, and deciding proportionate next steps.',
      },
      {
        text: 'Treat the post as a peer-discipline matter outside counseling and leave the response to classroom staff.',
        reason: 'Although peer privacy cannot be guaranteed, the counselor still has duties to address foreseeable harm, group safety, expectations, and school procedures.',
      },
    ],
    rationale: 'A peer breach requires a measured response focused on safety, support, established procedures, realistic privacy education, documentation, and future group protection without making impossible guarantees.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'Two adults who disagree about a student\'s schooling send conflicting email demands for counseling records, and the school file does not clearly establish current access rights. What should the counselor do?',
    correct: 'Preserve the records, verify access rights through authorized consultation, and disclose only what is permitted.',
    distractors: [
      {
        text: 'Send identical full records to both adults immediately because each person describes a family relationship to the student.',
        reason: 'A claimed relationship does not resolve current access authority, applicable restrictions, scope, or the need for secure and limited disclosure.',
      },
      {
        text: 'Choose the adult whose request seems more supportive of counseling and ignore the other request without documenting the decision.',
        reason: 'Personal impressions cannot determine legal access rights, and an undocumented unilateral choice creates privacy and due-process risks.',
      },
      {
        text: 'Delete the counseling records so neither adult can obtain information while the disagreement continues.',
        reason: 'Destroying records to avoid a request violates responsible record stewardship and may conflict with retention, legal, and district requirements.',
      },
    ],
    rationale: 'When access authority is unclear, the counselor should not improvise a legal conclusion. Verification, qualified consultation, record preservation, minimum necessary disclosure, and secure handling protect the student and all parties.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'A student asks the counselor to continue a school counseling conversation through the counselor\'s personal social-media account after hours. What is the most appropriate response?',
    correct: 'Redirect to approved channels, explain availability and urgent-help routes, and ensure accessible support.',
    distractors: [
      {
        text: 'Accept the private message request because after-hours contact automatically demonstrates stronger care and commitment.',
        reason: 'Good intent does not remove privacy, documentation, availability, dual-relationship, and emergency-response concerns created by a personal account.',
      },
      {
        text: 'Block the student without explanation and wait until the student independently finds another way to request support.',
        reason: 'A boundary can be maintained without abandoning continuity; the student needs clear approved access routes and urgent-help information.',
      },
      {
        text: 'Use disappearing messages so the conversation remains private and does not become part of any school record.',
        reason: 'Ephemeral personal messaging does not ensure confidentiality and can undermine documentation, supervision, policy compliance, and continuity.',
      },
    ],
    rationale: 'Professional digital communication uses approved secure systems, clear availability limits, appropriate documentation, and emergency pathways while preserving access and avoiding a personal online relationship.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'A free wellness application offers to score students\' daily mood entries but its vendor contract allows broad reuse of student data. What should the counselor do before any school use?',
    correct: 'Pause adoption for authorized review of evidence, privacy, security, data limits, notice, accessibility, and alternatives.',
    distractors: [
      {
        text: 'Use the application immediately because a no-cost product cannot create a financial conflict for the school.',
        reason: 'Lack of purchase cost says nothing about data exploitation, security, validity, accessibility, or the educational appropriateness of the tool.',
      },
      {
        text: 'Ask students to create personal accounts so the school has no responsibility for information collected during counseling activities.',
        reason: 'Moving enrollment to students does not remove school responsibility when staff direct use and the data arise from a school counseling activity.',
      },
      {
        text: 'Remove student names from entries and assume no further review is needed because all remaining data are anonymous.',
        reason: 'Combined details, device identifiers, small groups, or vendor linkage may permit reidentification, and privacy is only one required review area.',
      },
    ],
    rationale: 'Technology adoption requires authorized review of purpose, evidence, privacy, security, data governance, accessibility, informed expectations, and alternatives; free access and removed names are not sufficient safeguards.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'The counselor receives a legal-looking document demanding a student\'s complete counseling file by the next morning. The counselor is unsure what type of document it is. What is the best response?',
    correct: 'Preserve the file, verify the document with authorized legal support, and release only what is required.',
    distractors: [
      {
        text: 'Send the full file before the deadline because every document using legal terminology has the same force and scope.',
        reason: 'Legal documents differ in validity, authority, notice, scope, and response procedure; automatic full disclosure may violate privacy obligations.',
      },
      {
        text: 'Ignore the document because counseling records can never be requested by any outside party under any circumstances.',
        reason: 'This is an inaccurate absolute claim and risks missing a valid legal duty that requires timely verification and coordinated response.',
      },
      {
        text: 'Rewrite the file from memory to include only favorable details before asking anyone else to review the request.',
        reason: 'Altering records in response to a demand is unethical and may destroy relevant information; the existing record should be preserved intact.',
      },
    ],
    rationale: 'A counselor should neither ignore nor automatically comply with an unfamiliar demand. Prompt verification, qualified consultation, preservation, secure handling, and limited lawful disclosure are the defensible process.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'A family requests language assistance for a meeting about counseling supports, and a bilingual older sibling offers to interpret. What is the best counselor response?',
    correct: 'Arrange qualified language assistance, speak directly with the family, provide accessible materials, and verify understanding.',
    distractors: [
      {
        text: 'Rely on the sibling for language assistance because a relative may understand the family\'s emotional and educational language better than a trained interpreter.',
        reason: 'A sibling may face burden, role conflict, incomplete vocabulary, or privacy concerns, and family relationship alone does not establish interpreting competence.',
      },
      {
        text: 'Proceed in English and ask the family to sign the plan because requesting clarification might make the meeting take longer.',
        reason: 'A signature without meaningful language access does not demonstrate understanding or equitable participation in the counseling-support decision.',
      },
      {
        text: 'Address the interpreter rather than the family and rely on the interpreter to frame the decisions discussed during the meeting.',
        reason: 'The family remains the participant and decision partner; the interpreter facilitates communication rather than replacing family voice or authority.',
      },
    ],
    rationale: 'Qualified language assistance, accessible information, direct respectful communication, and confirmation of understanding support privacy and meaningful family participation without placing adult responsibilities on a student.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'After one introductory webinar, a counselor wants to use a specialized trauma-processing technique with a student whose needs are complex. What is the most ethical next step?',
    correct: 'Check role, competence, supervision, evidence, and fit; obtain needed preparation and coordinate referral when appropriate.',
    distractors: [
      {
        text: 'Begin using the technique after the webinar because an introductory course provides enough preparation for school-based use.',
        reason: 'Introductory exposure does not demonstrate supervised skill, scope fit, or readiness to manage risks associated with a specialized intervention.',
      },
      {
        text: 'Use the technique without telling the student or family so expectations will not influence whether it appears to work.',
        reason: 'Concealing the intervention undermines informed participation, trust, documentation, and appropriate oversight of a higher-skill practice.',
      },
      {
        text: 'Pause the student\'s school counseling while referring out because needs beyond current competence reduce the counselor\'s continuity role.',
        reason: 'Referral may be required, but the counselor should still coordinate access and continue appropriate school-based support within competence.',
      },
    ],
    rationale: 'Ethical competence requires more than exposure to a method. The counselor must examine scope, training, supervision, evidence, student fit, informed participation, risks, and continuity before proceeding.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'A counselor is invited to describe a successful student case at a public conference, and removing the student\'s name would still leave distinctive details recognizable in the small community. What should the counselor do?',
    correct: 'Avoid presenting the recognizable case; use a genuinely nonidentifiable composite or other privacy-protecting program evidence after required review.',
    distractors: [
      {
        text: 'Present the case after removing the name because indirect contextual details are unlikely to identify the student.',
        reason: 'Rare events, grade, family circumstances, or community details can permit reidentification even when direct identifiers are removed.',
      },
      {
        text: 'Share the case when the outcome is positive because favorable counseling information creates little privacy risk.',
        reason: 'Privacy does not depend on whether the presenter views the story as favorable; recognizable counseling information remains sensitive.',
      },
      {
        text: 'Ask a colleague who does not know the student to present the same details so the disclosure no longer belongs to the counselor.',
        reason: 'Changing the speaker does not remove identifiability or create authorization to reveal protected student information.',
      },
    ],
    rationale: 'Professional learning and program advocacy do not override student privacy. Because authorization alone may not resolve identifiability, voluntariness, or school-policy concerns, a genuinely nonidentifiable composite or other reviewed program evidence is the safer approach.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'ethics-law-equity-wellness',
    prompt: 'A counselor finds another staff member\'s student counseling notes unattended in an unlocked shared workspace, and the staff member says it is not a concern. What should the counselor do?',
    correct: 'Secure the notes, address the concern, consult the designated privacy or supervisory resource, and follow policy.',
    distractors: [
      {
        text: 'Leave the notes where they are because only the person who created a record has responsibility for protecting it.',
        reason: 'Ignoring a known exposure permits preventable harm and conflicts with a professional duty to protect student information through available procedures.',
      },
      {
        text: 'Read every note to determine whether any student disclosures are interesting enough to justify reporting the problem.',
        reason: 'Unnecessary review expands the privacy breach; the counselor needs only enough information to secure and report the exposure appropriately.',
      },
      {
        text: 'Photograph the notes and post them in a staff message to prove that the colleague handled the records improperly.',
        reason: 'Publicly reproducing the records compounds the disclosure and substitutes shaming for confidential corrective and supervisory processes.',
      },
    ],
    rationale: 'A known record exposure calls for immediate proportionate protection followed by appropriate consultation, documentation, and corrective procedure while limiting any further access or disclosure.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },

  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A high school student is unsure about applying for a paid internship, saying both "It could open doors" and "I might not fit in there." Which counselor response best supports student-directed motivation?',
    correct: 'Reflect both sides, ask permission to explore them, and elicit the student\'s own reasons, confidence, and next step.',
    distractors: [
      {
        text: 'List every advantage of the internship until the student agrees that applying is the only reasonable decision.',
        reason: 'Arguing for change can strengthen resistance and replaces the student\'s values and reasons with the counselor\'s preferred outcome.',
      },
      {
        text: 'Contact the internship supervisor and submit an application before the student has decided whether to participate.',
        reason: 'Acting without the student\'s informed choice overrides autonomy and bypasses exploration of fit, concerns, and readiness.',
      },
      {
        text: 'Interpret hesitation as lack of ambition and warn that future opportunities will disappear unless the student applies today.',
        reason: 'Labeling and pressure distort the decision, ignore legitimate concerns, and are unlikely to build durable self-directed commitment.',
      },
    ],
    rationale: 'A motivational approach explores ambivalence without coercion, evokes the student\'s own values and change language, and supports a feasible choice that remains owned by the student.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student wants to remain on an athletic team but has repeatedly skipped practice to spend time with friends. Which choice-oriented counseling response is best?',
    correct: 'Clarify the student\'s goal, examine whether current choices support it, and develop a feasible student-owned plan.',
    distractors: [
      {
        text: 'Explain that the coach is responsible for changing the student\'s behavior because team membership is a school activity.',
        reason: 'This shifts ownership away from the student and avoids evaluating the connection between the student\'s choices and stated goal.',
      },
      {
        text: 'Assign a punishment contract without asking what the student wants or whether the plan is realistic in the current context.',
        reason: 'A counselor-imposed consequence plan omits student evaluation, autonomy, feasibility, and commitment central to choice-oriented work.',
      },
      {
        text: 'Spend the session identifying a single childhood event that must explain every current practice absence before discussing action.',
        reason: 'This delays work on present wants, behavior, self-evaluation, and planning and assumes a single historical cause without evidence.',
      },
    ],
    rationale: 'Choice-oriented brief counseling connects wants with present behavior, invites honest self-evaluation, and develops a simple attainable student-owned plan rather than imposing control or shifting responsibility.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'Despite a recent period of housing instability, a middle school student has continued attending most days and completing essential assignments. Which counselor question best identifies usable strengths?',
    correct: 'Ask what has helped the student keep attending and completing work during this difficult period.',
    distractors: [
      {
        text: '"Why did your family allow the housing problem to interfere with school in the first place?"',
        reason: 'This assigns blame, assumes family control over structural circumstances, and is unlikely to reveal coping resources or student agency.',
      },
      {
        text: '"Would it be easier if we ignored housing concerns and talked only about the assignments you still owe?"',
        reason: 'This fragments academic functioning from a major contextual stressor and misses strengths and supports already helping the student persist.',
      },
      {
        text: '"Do you agree that students with more stable homes are naturally more motivated than students facing relocation?"',
        reason: 'This embeds a stigmatizing false comparison and treats circumstances as a fixed trait instead of exploring resilience and access.',
      },
    ],
    rationale: 'A coping question recognizes adversity without minimizing it and helps the student identify successful actions, relationships, and routines that can be strengthened in a collaborative support plan.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student says, "My grades are fine," then quietly describes missing several assignments and feeling tense whenever the online grade portal opens. What is the best counselor response?',
    correct: 'Reflect the mismatch between manageable grades and tension about missing work, then invite the student\'s meaning.',
    distractors: [
      {
        text: '"You are contradicting yourself, so I need you to admit that the grades are actually a serious problem."',
        reason: 'An accusatory confrontation can provoke defensiveness and replaces curious exploration with the counselor\'s judgment about the discrepancy.',
      },
      {
        text: '"If the overall grades are passing, there is no reason to discuss your physical reaction or the unfinished assignments."',
        reason: 'This dismisses the student\'s emotional and behavioral information and may overlook a meaningful barrier that is not visible in the average grade.',
      },
      {
        text: '"That reaction confirms a specific anxiety disorder, so we can skip further exploration and begin treating it today."',
        reason: 'A brief description does not establish a diagnosis, and the counselor should clarify meaning, context, safety, and scope before choosing support.',
      },
    ],
    rationale: 'A neutral reflection of discrepancy validates both messages and invites the student to make meaning without accusation, dismissal, or premature diagnosis, preserving collaboration and accurate assessment.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A nonspeaking elementary student uses an augmentative communication device and needs additional response time during an individual counseling check-in. Which approach is best?',
    correct: 'Use the student\'s preferred mode, allow processing time, address the student directly, and check meaning and access.',
    distractors: [
      {
        text: 'Direct all questions to the classroom aide because a support person can describe the student\'s feelings more efficiently.',
        reason: 'The aide may provide context, but substituting the aide\'s voice for the student\'s undermines direct participation and self-determination.',
      },
      {
        text: 'Require spoken answers during counseling so the student practices communicating in the same way as most classmates.',
        reason: 'Requiring speech creates an unnecessary access barrier and disregards an established communication system that supports authentic expression.',
      },
      {
        text: 'Use only rapid yes-or-no questions because open communication is impossible when a student needs extra processing time.',
        reason: 'This unnecessarily narrows the student\'s responses and confuses slower or alternative expression with inability to communicate complex meaning.',
      },
    ],
    rationale: 'Accessible counseling centers the student\'s own communication, provides time and modality choices, and checks understanding without treating a communication difference as lack of insight or agency.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student returns to school after the death of a family member and reports that concentration changes from day to day. What is the best initial school-counseling approach?',
    correct: 'Explore preferences, safety, culture, supports, and school functioning; offer flexible help and monitor changing needs.',
    distractors: [
      {
        text: 'Require the student to follow a standard grief timeline and resume full performance once a predetermined number of days has passed.',
        reason: 'Grief varies across people, relationships, cultures, and time; a fixed timetable can invalidate need and produce poorly matched expectations.',
      },
      {
        text: 'Avoid mentioning the loss unless the student first shows failing grades because discussing grief may create emotions that were not present.',
        reason: 'Respectful invitation does not create grief, and waiting for academic failure can miss student preferences, safety, and early support needs.',
      },
      {
        text: 'Place the student in a grief group immediately without screening fit or asking whether that service is acceptable to the student.',
        reason: 'Group support may help some students, but automatic placement overlooks consent, readiness, privacy, culture, and individual service fit.',
      },
    ],
    rationale: 'Initial grief support should be individualized, culturally responsive, flexible, and connected to school functioning and safety, with collaboration and referral matched to changing need rather than a fixed path.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A ninth grader is repeatedly late because the student must walk a younger sibling to a different school after a caregiver\'s work schedule changed. What should the counselor do first?',
    correct: 'Clarify the constraint, coordinate feasible supports with the student and family, and review a realistic attendance plan.',
    distractors: [
      {
        text: 'Teach a generic time-management lesson and assume the family responsibility will disappear if the student becomes more organized.',
        reason: 'The stated barrier is a caregiving and scheduling constraint, not missing knowledge about clocks or personal organization.',
      },
      {
        text: 'Recommend escalating consequences immediately because discussing contextual barriers would excuse all attendance expectations.',
        reason: 'Understanding context is necessary for a feasible response and does not prevent the school from maintaining expectations and monitoring progress.',
      },
      {
        text: 'Explain the family situation to classmates so peers will understand why the student receives a different arrival plan.',
        reason: 'Public disclosure is unnecessary for coordinating support and would compromise family and student privacy without a legitimate need.',
      },
    ],
    rationale: 'Effective attendance counseling identifies the actual access barrier, includes student and family knowledge, coordinates feasible resources within school procedures, and monitors a realistic plan rather than moralizing the problem.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student understands the science content for a month-long project but becomes overwhelmed when deciding how to begin. Which brief counseling intervention is strongest?',
    correct: 'Break the project into visible milestones, choose a first action, schedule check points, and plan to fade support.',
    distractors: [
      {
        text: 'Complete the project outline for the student so there is no chance of choosing an inefficient starting point.',
        reason: 'Doing the planning for the student may finish the immediate task but does not develop independent initiation and monitoring skills.',
      },
      {
        text: 'Advise waiting until motivation feels complete because planning while overwhelmed can never produce meaningful progress.',
        reason: 'Small structured action can build momentum even when motivation is incomplete; waiting preserves avoidance and deadline pressure.',
      },
      {
        text: 'Recommend moving the student to easier science work because difficulty starting proves the academic content is beyond current ability.',
        reason: 'The scenario states that content understanding is present, so lowering academic challenge mismatches the organization and initiation need.',
      },
    ],
    rationale: 'Task analysis, a manageable first step, planned monitoring, and gradual release directly address initiation while preserving grade-level expectations and helping the student build a reusable self-management routine.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A high school student is choosing between an advanced art course and a technical-design course; both meet graduation requirements and could support the student\'s goals. What should the counselor do?',
    correct: 'Structure comparison of goals, content, workload, access, supports, and tradeoffs while leaving the decision with the student.',
    distractors: [
      {
        text: 'Choose the course with greater prestige because the counselor should prevent a student from selecting a less recognized pathway.',
        reason: 'Prestige is not a substitute for student goals, fit, access, or informed choice and may reproduce status-based bias.',
      },
      {
        text: 'Select the course for the student because professional expertise makes collaborative decision making unnecessary.',
        reason: 'The counselor provides information and structure but should not replace student agency when multiple viable choices remain.',
      },
      {
        text: 'Recommend whichever course the student\'s closest friend chooses so the transition will require the least social adjustment.',
        reason: 'Peer connection can be considered, but using it as the deciding rule ignores learning goals, requirements, interests, and longer-term fit.',
      },
    ],
    rationale: 'When several options are viable, the counselor supports an informed student-owned decision by making values, evidence, access, and tradeoffs visible and establishing a point for later review.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A recently transferred senior may be missing a graduation requirement because courses use different names across districts. Which counselor action is most appropriate?',
    correct: 'Verify records and requirements, explain options, involve the student and family, and monitor a timely completion plan.',
    distractors: [
      {
        text: 'Assume similarly named courses are identical and promise graduation before the records and current requirements are reviewed.',
        reason: 'Course titles alone may not establish equivalence, and an unsupported guarantee can mislead the student about a high-impact decision.',
      },
      {
        text: 'Place the student automatically into the longest available credit-recovery program without examining prior learning or other options.',
        reason: 'Automatic placement may waste time, ignore evidence, and restrict access when a more accurate or individualized pathway could exist.',
      },
      {
        text: 'Tell the student to resolve the discrepancy independently because transfer records are outside academic counseling responsibilities.',
        reason: 'Academic planning includes helping students understand requirements and coordinate records, options, supports, and progress with appropriate staff.',
      },
    ],
    rationale: 'Transfer planning requires accurate record review, current policy verification, transparent explanation, collaborative choice, and close follow-up because assumptions or delay can create avoidable graduation barriers.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A middle school student believes engineering consists only of designing bridges because that is the only example the student has encountered. Which career-learning activity is best?',
    correct: 'Use diverse worker profiles or interviews to explore varied engineering tasks and pathways, followed by student reflection.',
    distractors: [
      {
        text: 'Give one aptitude test and remove every occupation that does not match the student\'s highest score.',
        reason: 'A single score cannot prescribe a career and would narrow exploration before the student has encountered the field\'s range and context.',
      },
      {
        text: 'Provide a list of engineering job titles to memorize without examining daily tasks, pathways, work settings, or personal reactions.',
        reason: 'Memorizing labels adds vocabulary but does not create meaningful exposure, self-knowledge, or informed comparison of work roles.',
      },
      {
        text: 'Assign bridge engineering as the student\'s career goal because early familiarity is stronger evidence than broader exploration.',
        reason: 'Familiarity can reflect limited exposure rather than durable fit, so treating it as a commitment would prematurely restrict possibilities.',
      },
    ],
    rationale: 'Developmental career exploration broadens exposure, counters narrow representations, and connects authentic tasks and pathways with student reflection rather than prescribing an occupation from limited experience.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student shows the counselor a social-media advertisement claiming that a short certificate program guarantees a high-paying job. What is the best counseling response?',
    correct: 'Verify the claim with credible current data and compare outcomes, total cost, program quality, local opportunity, and student fit.',
    distractors: [
      {
        text: 'Endorse the program because advertisements are legally required to describe typical earnings and outcomes for every participant.',
        reason: 'Marketing claims may use selective or unclear evidence and should not be assumed to represent typical outcomes, costs, or local conditions.',
      },
      {
        text: 'Reject all certificate programs because any pathway promoted on social media must be less valuable than a four-year degree.',
        reason: 'This substitutes pathway bias for evidence; certificate programs vary and should be evaluated rather than dismissed by category.',
      },
      {
        text: 'Select the program with the lowest advertised tuition without checking fees, completion, quality, supports, or employment relevance.',
        reason: 'Sticker price alone does not establish total cost, program value, access, completion probability, or alignment with the student\'s plan.',
      },
    ],
    rationale: 'Career-information literacy requires verifying promotional claims and comparing quality, outcomes, costs, opportunity, and personal fit so the student can make an informed choice without privileging or dismissing a pathway.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student receiving disability-related services is preparing for life after high school and wants to take a more active role in requesting supports. Which counseling activity is best?',
    correct: 'Build self-knowledge, practice requesting supports, explain transition processes, and include the student in planning.',
    distractors: [
      {
        text: 'Promise that every current school accommodation will transfer unchanged to any college, training program, or workplace.',
        reason: 'Support systems and eligibility processes differ across settings, so an automatic unchanged transfer cannot be guaranteed.',
      },
      {
        text: 'Discuss all transition choices only with adults because student participation could make the planning meeting less efficient.',
        reason: 'Excluding the student prevents development of self-knowledge, decision skills, self-advocacy, and ownership of the transition plan.',
      },
      {
        text: 'Discourage the student from disclosing any access need because self-advocacy should mean succeeding without support.',
        reason: 'Self-advocacy includes understanding and communicating legitimate needs, not concealing barriers or refusing appropriate supports.',
      },
    ],
    rationale: 'Transition-focused counseling builds self-knowledge, informed participation, communication, and realistic understanding of changing systems so the student can advocate for access without false guarantees.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'individual-counseling-academic-career',
    prompt: 'A student has met the observable goal for a planned series of brief counseling sessions but feels uneasy about ending regular meetings. What is the strongest closing approach?',
    correct: 'Review progress and maintenance strategies, identify warning signs and support routes, invite feedback, and plan follow-up.',
    distractors: [
      {
        text: 'Continue weekly sessions indefinitely because discomfort about ending proves the original goal has not actually been achieved.',
        reason: 'Uneasiness about transition does not by itself justify open-ended service and may prevent consolidation of independence and natural supports.',
      },
      {
        text: 'End the meeting without discussion once the data show improvement so the student does not become dependent on closure rituals.',
        reason: 'Abrupt termination misses an opportunity to consolidate learning, plan for setbacks, clarify access, and obtain student feedback.',
      },
      {
        text: 'Promise that the problem will never return because successful brief counseling should permanently eliminate future difficulty.',
        reason: 'No counselor can guarantee permanent outcomes, and such reassurance prevents realistic planning for recurrence or new stressors.',
      },
    ],
    rationale: 'Planned closure honors progress while supporting maintenance, future help-seeking, realistic preparation for setbacks, and student voice. It avoids both abrupt withdrawal and unnecessary indefinite service.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
];
