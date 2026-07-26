'use strict';

module.exports = [
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A seventh-grade science intervention has been delivered as planned for six weeks, but the student still cannot explain cause-and-effect relationships in unfamiliar experiments. What is the best next step for the school psychologist and teacher?',
    correct: 'Analyze responses to varied examples, identify the unresolved reasoning component, and revise instruction to model and practice that component before applying the team decision rule again.',
    distractors: [
      {
        text: 'Continue the same lessons with added coaching and weekly fidelity observations, compare curriculum-based scores with the existing goal line, and delay changing the reasoning model until another full grading period is complete.',
        reason: 'Strong fidelity makes the outcome interpretable, but it does not prove that the selected instructional mechanism matches the student\'s remaining learning need.',
      },
      {
        text: 'Replace science instruction with general study-skills counseling and use improved attendance as evidence that scientific reasoning has increased.',
        reason: 'A broad counseling activity and attendance measure do not directly teach or assess the specific cause-and-effect reasoning difficulty shown in the work samples.',
      },
      {
        text: 'Recommend a disability category from the six-week trend because a flat intervention slope establishes the cause of the student\'s performance.',
        reason: 'Limited response is important evidence, but it does not independently establish etiology or eligibility and should instead prompt better-aligned problem analysis.',
      },
    ],
    rationale: 'When implementation is adequate but progress remains weak, the team should use fine-grained performance evidence to reconsider the instructional hypothesis. Modeling and rehearsing the unresolved reasoning step creates a testable revision while preserving the existing goal and a planned review rule.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A fourth-grade student accurately explains spelling patterns aloud but produces very little written work because handwriting is slow and effortful. The team wants to assess spelling knowledge during intervention checks. Which plan is strongest?',
    correct: 'Allow an efficient response mode that reduces handwriting demand, keep spelling as the scored target, and document whether the access change alters interpretation.',
    distractors: [
      {
        text: 'Keep handwritten spelling probes but shorten each passage, provide additional completion time, and score accuracy from the words produced so results remain comparable with the student’s earlier intervention data.',
        reason: 'Shortening passages and adding time may reduce burden, but handwriting still constrains how much spelling knowledge the student can demonstrate and remains confounded with the scored result.',
      },
      {
        text: 'Score handwriting speed and spelling accuracy as one combined outcome so the team can avoid distinguishing between the two skills.',
        reason: 'Combining separate constructs would obscure whether intervention changed spelling knowledge and would make the resulting decision less instructionally useful.',
      },
      {
        text: 'Excuse the student from every spelling task and infer mastery from the quality of oral classroom participation.',
        reason: 'Removing all aligned measurement eliminates needed evidence; an accessible spelling response can preserve both participation and a defensible inference.',
      },
    ],
    rationale: 'The assessment response should minimize a barrier unrelated to the intended spelling construct while retaining the same knowledge target. The team should trial the access method, record any departure from usual administration, and interpret results in light of how the response mode may affect performance.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A ninth-grade algebra student completes practiced equation types accurately during tutoring but cannot select a strategy when the same concepts appear in word problems. Which instructional revision best addresses the pattern?',
    correct: 'Teach the student to identify problem features, compare strategy choices across varied examples, explain selections, and practice transfer with gradually reduced prompts.',
    distractors: [
      {
        text: 'Increase tutoring for the student with mixed worksheets that alternate familiar equations and word problems, provide a formula-selection chart during each set, and record accuracy across formats before changing the course goal.',
        reason: 'Mixed practice is more relevant than familiar equations alone, but a supplied selection chart can perform the conditional decision for the student without explicitly teaching and fading that decision process.',
      },
      {
        text: 'Provide the correct equation beside every word problem indefinitely so inaccurate strategy selection can no longer affect performance.',
        reason: 'Permanent provision of the solution setup may improve immediate completion while concealing whether the student can independently analyze and transfer the strategy.',
      },
      {
        text: 'Reduce the course goal to computation fluency because difficulty transferring a learned strategy shows that conceptual application should no longer be expected.',
        reason: 'The observed gap calls for explicit transfer instruction and evidence, not an automatic reduction of meaningful curricular expectations.',
      },
    ],
    rationale: 'The student has demonstrated the procedure in a familiar format but not conditional knowledge about when to use it. Contrasting examples, verbalized strategy selection, varied application, feedback, and deliberate prompt fading directly teach transfer and allow the team to measure growing independence.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A fifth-grade student referred for mathematics support has missed substantial instruction because of repeated school changes and transportation problems. What should the team do before interpreting the student\'s current low performance?',
    correct: 'Document opportunity to learn, examine attendance and instructional continuity, assess current prerequisite skills, and provide matched instruction with ongoing progress evidence.',
    distractors: [
      {
        text: 'Treat the current score as the primary estimate of skill, place the student in a standard intensive mathematics intervention, and reconsider attendance and instructional continuity after a full cycle produces a benchmark trend.',
        reason: 'An intervention trend could add evidence, but treating the initial score as primary before examining opportunity and prerequisite skills risks matching support to an incomplete problem definition.',
      },
      {
        text: 'Wait until the student has attended the school for a full year before offering any targeted instruction or monitoring academic response.',
        reason: 'Delaying all support withholds useful instruction and data when the team can address current needs while continuing to clarify the performance pattern.',
      },
      {
        text: 'Assign the student to the lowest available mathematics group permanently so future classroom expectations match the initial score.',
        reason: 'A permanent placement based on incomplete opportunity data risks entrenching low access and does not test how the student responds to appropriate instruction.',
      },
    ],
    rationale: 'Educational performance must be interpreted in relation to access, continuity, instruction, and present skill evidence. Immediate targeted teaching with careful monitoring both supports the learner and helps the team distinguish remediable opportunity gaps from other contributors without making a premature classification.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A student with decoding difficulty is trialing text-to-speech during social studies. The class goal is to evaluate understanding of historical arguments rather than oral reading. Which evaluation of the trial is most useful?',
    correct: 'Compare access, comprehension, independence, workload, and student experience across authentic tasks while keeping disciplinary reasoning as the performance target.',
    distractors: [
      {
        text: 'Adopt text-to-speech for social studies after the successful assignment, train the student and teachers on its features, and use end-of-semester software-usage reports as the main evidence for reconsidering the decision.',
        reason: 'Training and usage data can inform implementation, but adoption from one task and review based mainly on usage do not establish comprehension, independence, burden, or construct-preserving benefit.',
      },
      {
        text: 'Reject the tool because listening support inevitably changes a content-knowledge task into a different and less rigorous curriculum.',
        reason: 'When decoding is not the target, text-to-speech may reduce an irrelevant access barrier while preserving the intended historical reasoning demand.',
      },
      {
        text: 'Measure primarily how many minutes the student uses the software and disregard comprehension or the amount of adult assistance required.',
        reason: 'Usage time alone cannot show whether the tool improves meaningful access, preserves the target, or supports increasingly independent performance.',
      },
    ],
    rationale: 'Assistive technology decisions should be based on the task, the access barrier, and evidence from realistic use. A structured trial should preserve the content construct and examine outcomes, usability, independence, burden, and student perspective before the team decides how the support should be used.',
    difficulty: 'application',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'Across three sixth-grade classrooms, screening and work samples show that most students misunderstand equivalent fractions after the same core unit. What should the school psychologist recommend first?',
    correct: 'Review the shared lesson sequence and student error patterns, strengthen classwide instruction, and monitor whether the revised teaching improves the common misconception.',
    distractors: [
      {
        text: 'Begin individual supplemental fraction intervention for each student below the screening cut point, preserve the existing core unit for the rest of the grade, and compare participant growth after eight instructional weeks.',
        reason: 'Individual support and growth data may help some learners, but preserving the same core sequence ignores evidence that the misconception is widespread after shared instruction.',
      },
      {
        text: 'Create separate behavior contracts for the students with incorrect answers because a shared academic error indicates insufficient effort.',
        reason: 'A common conceptual error does not establish a motivation problem, and behavior contracts would not teach the missing fraction relationship.',
      },
      {
        text: 'Average all screening scores into one grade-level number and stop examining which representations or fraction comparisons produced errors.',
        reason: 'An overall average can hide the specific misconception and variation needed to select and evaluate an effective instructional response.',
      },
    ],
    rationale: 'When a large proportion of learners shows the same misconception after a shared unit, the first hypothesis should include the adequacy and alignment of core instruction. Item-level analysis, revised teaching, and classwide progress evidence address the likely leverage point while preserving individual follow-up for students who continue to need support.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A multilingual middle school student can organize an argument during a conference but loses the structure when writing independently in English. Which intervention plan best uses the available evidence?',
    correct: 'Teach a visual organizer with modeled examples, permit strategic language resources, rehearse its transfer into a composition, and monitor organization separately from language conventions.',
    distractors: [
      {
        text: 'Remove all visual and home-language supports so the intervention measures whether the student can perform under the most difficult condition.',
        reason: 'Eliminating useful access supports confounds English demands with the target organization skill and does not create responsive instruction.',
      },
      {
        text: 'Provide an English grammar intervention using the student’s completed essays, add sentence frames and editing conferences, and judge success through fewer convention errors before returning to independent argument planning.',
        reason: 'Grammar instruction and frames may support composition, but convention-error reduction does not address the demonstrated gap in transferring an already available argument structure to independent writing.',
      },
      {
        text: 'Conclude that the student lacks abstract reasoning because oral organization did not transfer automatically to independent English composition.',
        reason: 'The student\'s successful oral explanation is contrary evidence, and the difficulty may reflect planning, language, transcription, or transfer demands.',
      },
    ],
    rationale: 'The intervention should build from demonstrated oral organization and explicitly bridge that strength to independent writing. Visual planning, appropriate language access, modeling, rehearsal, and separate measurement of organization reduce construct confusion and help the team identify which support improves transfer.',
    difficulty: 'analysis',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'academic-instructional-interventions',
    prompt: 'A student begins assignments when an interventionist sits nearby but rarely starts work in the general classroom. Which plan is most likely to promote independent use of the learned routine?',
    correct: 'Identify natural instructional cues, rehearse the routine in that setting, fade adult proximity systematically, and collect initiation data across people and periods.',
    distractors: [
      {
        text: 'Keep the interventionist nearby during general-class assignments, increase physical distance within each period as work is completed, and consider the routine generalized after four weeks of high assignment completion.',
        reason: 'Increasing distance is a useful fading attempt, but the adult remains the central cue and assignment completion alone does not demonstrate independent initiation across people and periods.',
      },
      {
        text: 'Remove all support without warning and interpret any missed assignment as proof that the intervention routine was ineffective.',
        reason: 'Abrupt withdrawal does not teach transfer or provide a planned test of which cues and fading steps support independent performance.',
      },
      {
        text: 'Measure only the student\'s behavior in the intervention room because performance in one setting is sufficient evidence of generalized skill use.',
        reason: 'Generalization is an outcome that must be demonstrated across the settings and cues in which the student is expected to use the routine.',
      },
    ],
    rationale: 'A skill learned under close adult prompting may not transfer without explicit programming. Teaching natural cues, practicing in the general classroom, fading assistance according to performance, and measuring across contexts allow the team to distinguish genuine independence from support-dependent completion.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'A district proposes universal emotional-health screening next month, but schools have no defined follow-up process for students with elevated results. What should the school psychology team recommend?',
    correct: 'Establish notice or consent procedures, culturally and technically appropriate screening, timely follow-up capacity, crisis pathways, privacy protections, and an evaluation plan before launch.',
    distractors: [
      {
        text: 'Launch the screener as scheduled using the vendor’s standard notice, ask each school counselor to contact students with elevated scores within five days, and refine privacy and crisis procedures after the first administration.',
        reason: 'A vendor notice and delayed counselor contact create some structure, but they do not establish adequate consent or notice, timely triage, crisis escalation, privacy, or system capacity before identification begins.',
      },
      {
        text: 'Limit follow-up to students whose classroom teachers already suspect a disorder so the screening results merely confirm existing impressions.',
        reason: 'Using prior impressions as the gate can reinforce referral bias and defeats the purpose of a systematic, equitable screening process.',
      },
      {
        text: 'Send every student with an elevated score directly to emergency services because a screening threshold establishes immediate clinical danger.',
        reason: 'A screener signals need for appropriate follow-up; it does not by itself determine diagnosis, urgency, or the level of response required.',
      },
    ],
    rationale: 'Responsible universal screening requires an ethical service system around the measure, not just administration. Schools need valid procedures, understandable communication, equitable access, secure data practices, adequate follow-up, crisis escalation routes, and monitoring for reach, false signals, and student outcomes.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'An eighth-grade student has visited the nurse repeatedly with headaches before oral presentations, yet medical information available to the school is inconclusive. What is the best school psychologist response?',
    correct: 'Explore timing, function, safety, health follow-up, student perspective, and classroom demands, then collaborate on a brief support plan and review the results.',
    distractors: [
      {
        text: 'Tell the student the headaches are psychological because they occur before presentations and require participation without additional inquiry.',
        reason: 'The timing suggests a hypothesis but cannot establish cause, and dismissing possible health or contextual factors may undermine safety and trust.',
      },
      {
        text: 'Temporarily excuse oral presentations, provide written alternatives, and ask the student and teachers to track nurse visits for a month before the school considers additional health or behavioral follow-up.',
        reason: 'A temporary alternative may reduce immediate demand, but a month-long delay still leaves health, safety, function, student perspective, and appropriate support insufficiently examined.',
      },
      {
        text: 'Begin a clinical treatment protocol based solely on the nurse-visit pattern without discussing scope, consent, or other qualified supports.',
        reason: 'A school attendance pattern alone does not justify a diagnosis or treatment plan and does not replace role-appropriate assessment and coordination.',
      },
    ],
    rationale: 'Somatic complaints near a recurring demand warrant a respectful, multi-source inquiry rather than a psychological or medical conclusion. The psychologist can assess educational impact and safety, coordinate appropriate health follow-up, reduce manageable barriers, teach a brief coping or preparation strategy, and review data.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'Teachers nominate students for a stress-management group using the description “seems anxious,” and nominations differ sharply by classroom and cultural background. What should happen before enrollment?',
    correct: 'Define the target need, use multiple culturally responsive indicators, invite student and family perspective as appropriate, screen for group fit, and document an alternate support pathway.',
    distractors: [
      {
        text: 'Enroll nominated students after asking each teacher to complete a common anxiety checklist, use the same group curriculum across classrooms, and remove students who report that sessions do not match their concerns.',
        reason: 'A common teacher checklist improves consistency, but teacher-only evidence and post-enrollment removal do not establish culturally responsive need, safe group fit, or an alternate support pathway.',
      },
      {
        text: 'Select only students with the quietest classroom behavior because outward calm is the most objective sign that a stress group will be effective.',
        reason: 'Quiet behavior does not establish the target need, and this rule could exclude students whose stress appears differently or include students without group fit.',
      },
      {
        text: 'Cancel all targeted groups because variation in nominations means schools cannot use any judgment when identifying students who may benefit.',
        reason: 'Variation calls for clearer, fairer procedures and converging evidence rather than abandoning potentially useful supports altogether.',
      },
    ],
    rationale: 'Targeted group placement should be tied to a clearly defined need and a safe, developmentally and culturally appropriate fit. Multiple indicators, student voice, transparent participation procedures, and alternatives reduce referral bias while helping the team avoid treating a group assignment as a diagnosis.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'A high school student asks for help managing family-related stress but says prior school services felt dismissive of the family’s cultural values. Which initial response is most appropriate?',
    correct: 'Invite the learner’s account of goals, strengths, cultural commitments, and earlier service barriers; explain privacy limits; agree on feasible campus support or referral; and check fit over time.',
    distractors: [
      {
        text: 'Begin with the school’s standard stress-management sequence, invite the student to suggest cultural examples during sessions, and revisit referral options if the student does not engage after several meetings.',
        reason: 'Inviting examples is more responsive than an unchanged worksheet, but the preset sequence still precedes collaborative goals, privacy discussion, barrier review, and an informed choice of support.',
      },
      {
        text: 'Ask a staff member from a presumed similar background to decide what the student’s family believes before meeting with the student.',
        reason: 'Shared or assumed identity does not authorize speaking for an individual, and stereotyping would displace the student’s own perspective.',
      },
      {
        text: 'Promise that no information could ever be shared with anyone so the student will feel secure enough to discuss the family situation.',
        reason: 'An absolute secrecy promise is inaccurate because privacy can have safety and legal limits that should be explained clearly before disclosure.',
      },
    ],
    rationale: 'Culturally responsive support begins with respectful curiosity about the individual student rather than a standardized assumption. Clear privacy boundaries, collaborative goals, attention to prior service barriers, meaningful choice, and ongoing feedback can improve trust while keeping support within school role and competence.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'During a class presentation, a student begins trembling, breathing rapidly, and saying, “I cannot do this.” There is no known plan on file. What should the school psychologist do first?',
    correct: 'Move with the student to a calmer supervised setting, check immediate safety and possible medical needs, support regulation without assigning a diagnosis, and arrange appropriate follow-up.',
    distractors: [
      {
        text: 'Escort the student to a quiet office, coach paced breathing until visible symptoms decrease, and arrange another presentation later that day because the episode appears limited to performance stress.',
        reason: 'A quiet setting and regulation support may help, but assuming performance stress and rescheduling the demand without checking medical needs, immediate safety, or broader context is premature.',
      },
      {
        text: 'Announce to the class that the student is having a panic attack so peers will understand why the presentation has stopped.',
        reason: 'Publicly labeling the event discloses sensitive information and asserts a clinical interpretation before the situation has been assessed.',
      },
      {
        text: 'Send the student alone to an unsupervised hallway and wait until the next school day to determine whether support is needed.',
        reason: 'Leaving a visibly distressed student alone bypasses immediate safety and health checks and delays a proportionate supportive response.',
      },
    ],
    rationale: 'Acute distress calls for calm, private, supervised stabilization and a brief check for immediate safety or health concerns. The psychologist should avoid diagnostic claims, use role-appropriate regulation support, communicate according to current procedures, and coordinate follow-up based on the student’s needs and context.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'A recently transferred sixth-grade student eats alone, has stopped attending an extracurricular activity, and says school feels unfamiliar. No immediate safety concern is disclosed. Which response best builds protective support?',
    correct: 'Ask about the student’s interests and preferred supports, connect the student with a trusted adult and compatible peer opportunity, address access barriers, and monitor adjustment.',
    distractors: [
      {
        text: 'Conclude from social withdrawal that the student has a depressive disorder and tell staff to use that label when documenting classroom behavior.',
        reason: 'Withdrawal after a transition can have several explanations, and a small set of observations does not justify a diagnosis or broad disclosure.',
      },
      {
        text: 'Invite the student to a well-established peer club, assign a trained peer ambassador, and use attendance and club participation for six weeks before asking whether the match supports belonging.',
        reason: 'A peer ambassador can be supportive, but choosing the activity before eliciting interests or access needs and delaying the student’s feedback makes the fit provider-directed.',
      },
      {
        text: 'Wait until the student fails a course because adjustment concerns should not receive school support unless they produce severe academic consequences.',
        reason: 'Early, proportionate support can strengthen belonging and access before difficulties intensify while still allowing the team to monitor actual need.',
      },
    ],
    rationale: 'Connection to supportive adults, peers, routines, and valued activities can protect adjustment, but the specific support should fit the student rather than impose a generic social solution. Collaborative linkage and follow-up address current functioning without converting a transition pattern into a diagnosis.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'After a private check finds no immediate safety concern, a student who has missed many assignments says, “Nothing I try matters.” Which brief school-based conversation best supports movement toward an achievable academic action?',
    correct: 'Ask about an exception when work was started, identify what made it possible, define one student-chosen next step, and agree on how progress will be noticed.',
    distractors: [
      {
        text: 'Review the missing-work consequences, ask the student to select the assignment worth the most points, create a completion schedule, and check whether that assignment is submitted by the next meeting.',
        reason: 'A concrete schedule may support completion, but selecting work by point value does not explore exceptions, existing strengths, or what would make the student-chosen action feel possible.',
      },
      {
        text: 'Assure the student that the problem will disappear soon without selecting an action, support, or way to evaluate whether circumstances improve.',
        reason: 'Reassurance without a concrete collaborative step provides neither a usable strategy nor evidence for adapting support.',
      },
      {
        text: 'Complete the first missing assignment for the student so the grade improves before discussing ownership or an independent routine.',
        reason: 'Doing the work may change a grade temporarily while bypassing the student’s skill, agency, and ability to repeat a successful process.',
      },
    ],
    rationale: 'A strengths- and solution-focused exchange can turn a global statement of helplessness into a small, observable action. Exploring exceptions identifies existing resources, while student choice and a clear progress indicator support agency without implying that a brief conversation replaces more intensive help when needed.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'mental-behavioral-health',
    prompt: 'A six-week coping-skills group shows modest average improvement, but multilingual participants attended less often and report that examples did not fit their experiences. What is the strongest program response?',
    correct: 'Disaggregate outcomes and participation, ask participants about barriers and relevance, examine fidelity and adaptations, revise access and content, and evaluate the next cycle.',
    distractors: [
      {
        text: 'Keep the group manual unchanged for another cycle, add translated reminder messages and attendance incentives, and compare the overall pre-post average with the prior cycle before revising content.',
        reason: 'Reminders and incentives may affect attendance, but an unchanged manual and aggregate comparison do not test reported relevance barriers or reveal which participants gained access and benefit.',
      },
      {
        text: 'Exclude multilingual students from future groups so attendance rates and average outcomes are easier to interpret across participants.',
        reason: 'Exclusion responds to a program access problem by restricting service and fails to investigate or remove the barriers identified by students.',
      },
      {
        text: 'Translate the session titles and declare the program culturally responsive without reviewing examples, participation conditions, or student feedback.',
        reason: 'Surface translation alone may not address relevance, scheduling, trust, language access, facilitation, or other mechanisms affecting participation.',
      },
    ],
    rationale: 'Evaluation should identify who was reached, who benefited, and what implementation or access conditions shaped the result. Disaggregated evidence and participant voice support targeted adaptation, while continued measurement prevents the team from assuming that a revision improved equity or outcomes.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'A student posts a drawing in a shared class document showing a named classmate being harmed, then tells a peer it was “only a joke.” What should the school psychologist do?',
    correct: 'Preserve the information, notify the designated multidisciplinary safety team, assess urgency through current threat procedures, arrange needed supervision, and avoid making a solo prediction from the drawing.',
    distractors: [
      {
        text: 'Save the drawing, meet privately with the student to clarify intent and context, document a denial of weapon access and an agreement that the image was humorous, and close the concern in counseling notes before notifying the multidisciplinary safety team.',
        reason: 'A private interview and preservation are useful, but denial of access and stated humor do not justify solo closure or delaying the designated team’s contextual safety assessment.',
      },
      {
        text: 'Announce to the class that the student is dangerous so classmates can report any other unusual behavior they have observed.',
        reason: 'Public labeling can create stigma and misinformation, compromises privacy, and is not a substitute for structured safety procedures.',
      },
      {
        text: 'Conduct an extended interrogation alone and promise that the information will remain confidential regardless of what the student reveals.',
        reason: 'A solo interrogation and absolute confidentiality promise exceed appropriate process and may interfere with coordinated safety assessment.',
      },
    ],
    rationale: 'A targeted depiction and named person require prompt preservation, consultation, and use of the school’s current multidisciplinary threat-assessment pathway. The response should be proportionate to evidence, protect potentially affected students, avoid public or diagnostic labels, and escalate immediately when the assessment identifies urgent danger.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'A middle school student tells the psychologist, “My friend keeps saying everyone would be better off if they did not wake up, but they made me promise not to tell.” What is the best response?',
    correct: 'Thank the student for reporting, locate the friend promptly, activate the school safety pathway for a private risk assessment, and share information only with personnel needed for protection.',
    distractors: [
      {
        text: 'Meet with the reporting student for additional detail, ask that student to encourage the friend to visit the counseling office during the day, and contact the friend’s caregiver at dismissal if the friend has not appeared, treating the statement as unverified until then.',
        reason: 'Additional detail may inform follow-up, but asking a peer to recruit or monitor the friend and waiting until dismissal delays direct location and trained assessment of a potentially urgent concern.',
      },
      {
        text: 'Ask the reporting student to monitor the friend overnight and return with proof before the school begins any assessment process.',
        reason: 'Placing monitoring responsibility on a peer delays trained assessment and creates an inappropriate burden for a student.',
      },
      {
        text: 'Send a general wellness email to the entire grade and wait to see whether the friend independently requests an appointment.',
        reason: 'A broad message does not address the identified student or provide the timely, private assessment indicated by the reported language.',
      },
    ],
    rationale: 'Indirect reports of possible self-harm language should be taken seriously without assuming a conclusion. The psychologist should respond promptly through current school procedures, ensure the identified student is located and assessed by qualified personnel, protect the reporting student from carrying the safety burden, and document follow-up.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'During dismissal, an elementary student overturns furniture and throws classroom objects while other students are nearby. Which sequence is the most appropriate immediate school response?',
    correct: 'Move peers out of the area, summon trained assistance, use the least restrictive approved safety procedures, maintain observation, and conduct problem analysis only after stabilization.',
    distractors: [
      {
        text: 'Begin asking detailed questions about the behavior’s function while classmates remain in the room and objects are still being thrown.',
        reason: 'Functional inquiry is important after stabilization, but questioning during active danger delays immediate environmental protection for everyone nearby.',
      },
      {
        text: 'Have trained crisis staff move the student to a designated low-stimulation room using the school’s standard physical escort whenever furniture is thrown, and evaluate afterward whether the level of danger required restrictive contact.',
        reason: 'A calm location may help, but using a standard physical escort before determining necessity makes restrictive contact routine rather than proportionate to the active danger and approved procedure.',
      },
      {
        text: 'Leave the student alone in the classroom and close the door so staff do not inadvertently reinforce the escalation with attention.',
        reason: 'Unsupervised isolation can increase danger and ignores the school’s duty to use trained, approved crisis and monitoring procedures.',
      },
    ],
    rationale: 'Active object throwing requires immediate protection of students and staff through the current school crisis plan and trained response. Safety comes before hypothesis testing; after stabilization, the team can review antecedents, setting events, consequences, communication needs, student perspective, and prevention strategies.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'Observation shows that a student leaves cooperative-learning groups after peers repeatedly mock reading errors, and staff then permit solitary work. Which behavior plan best addresses the pattern?',
    correct: 'Stop and monitor peer mistreatment, adjust the group context, teach an efficient help or pause request, reinforce safe participation, and measure both student and environmental outcomes.',
    distractors: [
      {
        text: 'Teach the student a scripted request to leave difficult groups, honor each request for the rest of the grading period, and collect exit frequency while the teacher addresses peer conduct through a separate classroom process.',
        reason: 'A leave request can protect the student briefly, but prolonged escape and separately managed peer conduct do not coordinate environmental repair, safe participation, reinforcement, or reintegration.',
      },
      {
        text: 'Remove the student from cooperative work permanently because solitary completion appears to eliminate the leaving behavior.',
        reason: 'Permanent removal may strengthen escape and restrict instructional access without teaching a safer response or correcting peer conditions.',
      },
      {
        text: 'Reward classmates whenever the student finishes alone because peer reinforcement is unrelated to the function of the student’s behavior.',
        reason: 'This contingency does not address the peer trigger, teach the student an efficient alternative, or restore safe participation in the setting.',
      },
    ],
    rationale: 'Functional planning should include the social environment rather than locating the entire problem within the referred student. Correcting peer mistreatment, changing predictable antecedents, teaching a workable communication response, reinforcing safe engagement, and monitoring both climate and student behavior create a more ethical function-matched plan.',
    difficulty: 'analysis',
    cognitiveLevel: 'analyze',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'A counseling-group member discovers that another student posted a screenshot of a private group comment in a peer chat. What should the school psychologist leading the group do first?',
    correct: 'Meet privately with the affected student, assess safety and impact, preserve relevant information, follow authorized procedures, and address group privacy limits and participation before resuming routine work.',
    distractors: [
      {
        text: 'Tell the affected student that peer confidentiality was never guaranteed, so the psychologist has no further responsibility to respond.',
        reason: 'Explaining limits does not remove the leader’s responsibility to assess harm, use school procedures, and restore the safest feasible group conditions.',
      },
      {
        text: 'Meet with the student who posted the screenshot, request voluntary deletion from the peer chat, review the group agreement, and resume sessions after an apology without discussing the incident with the affected student unless that student raises it again.',
        reason: 'Deletion and accountability may become part of an authorized response, but an offender-centered apology does not assess the affected student’s safety, impact, wishes, or continued group fit.',
      },
      {
        text: 'Discuss the affected student’s full disclosure with the entire group so members understand why sharing private information can be harmful.',
        reason: 'Repeating the sensitive content compounds the disclosure and is unnecessary for reviewing boundaries, accountability, and future participation.',
      },
    ],
    rationale: 'Peer privacy cannot be guaranteed in a group, but a breach still requires a supportive and procedurally appropriate response. The psychologist should first protect the affected student, evaluate safety and continued fit, coordinate only necessary action, and then reteach limits and norms without redisclosing private content.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'A fifth-grade team introduced a break-request card after an FBA indicated that difficult independent tasks often precede shouting. Staff respond quickly to shouting but frequently overlook the card. What should the school psychologist recommend first?',
    correct: 'Make the card response efficient and reliable, prompt and rehearse its use, adjust task demands when the evidence supports it, and compare card use, shouting, and implementation fidelity.',
    distractors: [
      {
        text: 'Deliver the same rapid break after either shouting or card use for several weeks so the student experiences equal access to relief while staff decide which response is easier to track across classroom periods.',
        reason: 'Equal access to escape following both responses leaves shouting as efficient as the replacement and weakens the contingency intended to shift behavior toward the card.',
      },
      {
        text: 'Require unprompted card use before honoring requests, then thin access after the first successful day so adults do not create dependence on the replacement response.',
        reason: 'Requiring independent use before teaching and thinning after one success can make the card less efficient than shouting and does not establish fluent generalization.',
      },
      {
        text: 'Keep the current response pattern and judge the plan from the weekly shouting total without recording card opportunities, staff responses, task difficulty, or fidelity.',
        reason: 'Shouting totals alone cannot show whether the student had card opportunities, adults honored the request, task conditions changed, or the plan was implemented as designed.',
      },
    ],
    rationale: 'A function-matched replacement response must obtain the relevant outcome at least as efficiently and consistently as problem behavior while the new response is taught. Prompted practice, task adjustment, differential reinforcement, and fidelity-plus-outcome data let the team test whether implementation changes response allocation.',
    difficulty: 'application',
    cognitiveLevel: 'apply',
  },
  {
    skillId: 'behavior-counseling-crisis',
    prompt: 'A student returns to school after emergency psychiatric care, and staff ask the school psychologist to obtain every treatment detail before allowing attendance. Which reentry approach is most appropriate?',
    correct: 'Use current return-to-campus procedures to develop a collaborative safety and support plan, request only authorized necessary information, address academic access, and schedule follow-up.',
    distractors: [
      {
        text: 'Ask the caregiver to authorize the discharge summary and treatment recommendations, postpone return until the school team reviews those records, and adopt the outside provider’s plan as the initial school reentry plan.',
        reason: 'Authorization does not make every requested clinical detail necessary, and delaying return or importing an outside plan wholesale bypasses individualized school access, privacy, and collaborative reentry decisions.',
      },
      {
        text: 'Resume the prior schedule without any student or caregiver planning because discharge from emergency care proves that no school support is needed.',
        reason: 'Discharge does not determine readiness for every school demand, and coordinated planning can address safety, workload, connection, and monitoring.',
      },
      {
        text: 'Tell all teachers the suspected diagnosis so they can independently decide which assignments and behavioral expectations should apply.',
        reason: 'Broad diagnostic disclosure is unnecessary, risks stigma, and replaces a coordinated need-based plan with inconsistent individual judgments.',
      },
    ],
    rationale: 'Effective reentry balances safety, privacy, educational access, and continuity. The school psychologist should collaborate with the student, caregivers, appropriate school personnel, and outside providers when authorized; clarify supports and response steps; minimize unnecessary disclosure; and review the plan as needs change.',
    difficulty: 'analysis',
    cognitiveLevel: 'evaluate',
  },
];
