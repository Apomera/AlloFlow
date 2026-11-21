'use strict';

const q = (promptA, promptB, correct, distractors, rationale, distractorNotes, difficulty = 'application') => ({
  promptA,
  promptB,
  correct,
  distractors,
  rationale,
  distractorNotes,
  difficulty,
});

const academicInstruction = [
  q(
    'During multistep algebra, a student begins arguing only after repeated errors on the prerequisite fraction step. What should the special educator do first?',
    'Progress data show accurate equation solving when fractions are supplied, but refusal when the student must calculate them. Which instructional response is best?',
    'Assess the prerequisite fraction skill briefly, explicitly model the missing step, guide practice, and track accuracy and engagement.',
    [
      'Escalate disciplinary consequences for arguing in class before modifying any prerequisite mathematics instruction.',
      'Remove grade-level algebra instruction from the student’s schedule until behavioral incidents stop across all periods.',
      'Grant open-ended hallway breaks after every algebra mistake without teaching or scaffolding the fraction prerequisite.',
    ],
    'The task-specific pattern points to an instructional mismatch that should be assessed directly. Teaching the prerequisite while preserving access to the larger learning goal addresses the likely barrier and produces data on academic and behavioral change.',
    [
      'Punishing arguing before addressing a clear prerequisite skill bottleneck ignores the documented academic trigger and often escalates avoidance during math.',
      'Removing grade-level algebra restricts curriculum access unnecessarily when the student already solves equations accurately once fraction barriers are addressed.',
      'Providing unguided breaks after errors reinforces task escape while leaving the missing fraction skill untaught and unresolved.',
    ]
  ),
  q(
    'A student disengages during long reading assignments but participates when the same text is divided into short, purposeful segments. Which support best preserves the learning goal?',
    'During content-area reading, off-task behavior rises as page length increases even though oral comprehension is strong. What should the teacher try?',
    'Chunk the text, preview its purpose, offer a bounded response choice, teach a help request, and monitor comprehension.',
    [
      'Replace the assigned grade-level text with brief, unrelated recall worksheets that require minimal reading effort.',
      'Require quiet, uninterrupted completion of the entire reading passage before offering check-ins or instructional supports.',
      'Award behavior points for seated silence during reading blocks without collecting data on content comprehension.',
    ],
    'Chunking and a taught request reduce a predictable response-effort barrier without lowering the content target. Monitoring comprehension and engagement shows whether the preventive and instructional supports improve meaningful access.',
    [
      'Substituting unrelated easy worksheets lowers academic expectations and denies content-area learning when chunking preserves the original rigorous text.',
      'Withholding scaffolds until an overwhelming passage is finished intensifies the exact response-effort trigger that drives off-task behavior.',
      'Rewarding quiet posture without checking comprehension mistakes passive compliance for actual reading understanding and educational progress.',
    ]
  ),
  q(
    'Public error correction reliably precedes a student shouting and leaving the group. Which feedback practice is most appropriate during instruction?',
    'A student accepts corrective feedback privately but escalates when errors are announced in front of peers. How should the teacher respond?',
    'Deliver brief, neutral, private correction followed by a supported opportunity to respond accurately.',
    [
      'Continue announcing academic errors aloud during group lessons so the student builds resilience to peer feedback.',
      'Discontinue correcting the student’s academic mistakes for the semester to avoid triggering classroom escalation.',
      'Remove the student from the classroom to the hallway after every incorrect response that causes frustration.',
    ],
    'Private, neutral feedback changes a documented antecedent while retaining instruction. An immediate successful response builds the academic skill and lets the teacher reinforce persistence rather than inadvertently strengthening escape or public conflict.',
    [
      'Persisting with a known public-embarrassment trigger escalates conflict and undermines trust when private feedback delivers the same instructional correction safely.',
      'Stopping all error correction sacrifices academic growth and prevents the student from learning accurate content or receiving supportive feedback.',
      'Removing the student after mistakes inadvertently reinforces escape from challenging work while reducing instructional time and peer belonging.',
    ]
  ),
  q(
    'A student tears up an independent writing task when asked to organize several ideas but completes one-sentence responses accurately. What is the strongest initial instructional plan?',
    'Work refusal occurs during paragraph planning, not during transcription or brief responses. Which plan best matches the observed pattern?',
    'Assess paragraph planning, model one clear step with a visual organizer, and reinforce starting and asking for help.',
    [
      'Assign longer multi-paragraph writing prompts without scaffolds to test whether refusal reflects low effort.',
      'Have a paraprofessional compose and write every extended paragraph response so frustration does not recur.',
      'Interpret all worksheet tearing as peer attention seeking without comparing brief and multi-paragraph writing demands.',
    ],
    'The uneven performance identifies a specific component for assessment and explicit instruction. A scaffolded first step plus an efficient help response preserves writing access, reduces escape value, and supports gradual independence.',
    [
      'Increasing unassisted writing volume amplifies the exact organizational barrier driving task tearing and provides no explicit strategy instruction.',
      'Having an adult write every response removes student authorship, builds prompt dependence, and substitutes completion for teaching planning skills.',
      'Assuming an attention function without analyzing the contrast between brief and extended writing tasks leads to a mismatched intervention.',
    ]
  ),
  q(
    'A learner often becomes frustrated after teachers give several directions at once and then misses steps. Which instructional adjustment is most likely to help?',
    'Observation shows that escalation follows lengthy verbal directions during laboratory routines. What should the teacher change first?',
    'Give concise single-step directions paired with a visual checklist, verify understanding, and fade support gradually.',
    [
      'Repeat the complete multi-step verbal direction more loudly each time the student misses an expected step.',
      'Exclude the student from laboratory activities and multistep classroom routines to avoid direction overload.',
      'Wait until frustration escalates after missed steps and assign a classroom penalty for failing to follow directions.',
    ],
    'Reducing language load and making the sequence visible addresses the documented antecedent while teaching task completion. Checking understanding and fading the checklist prevent the support from becoming a permanent adult prompt.',
    [
      'Repeating lengthy oral instructions louder does not lower working-memory load and can intensify sensory stress and power struggles.',
      'Excluding the student from multistep labs restricts curriculum access when concise visual checklists can support safe, independent participation.',
      'Penalizing missed steps after cognitive overload punishes an instructional delivery barrier instead of modifying how directions are presented.',
    ]
  ),
  q(
    'High error rates during new vocabulary practice are followed by avoidance. Which lesson design best combines prevention and explicit instruction?',
    'A student participates in review but withdraws when every item in a lesson is unfamiliar. Which adjustment is most defensible?',
    'Intermix known and new items, model responses explicitly, guide frequent practice, and adjust pacing from data.',
    [
      'Present unbroken blocks of unfamiliar vocabulary terms until the student stops withdrawing from hard practice.',
      'Transition the student to preferred free-choice time whenever an initial mistake appears on new material.',
      'Reinforce quiet seated posture during vocabulary lessons while disregarding whether target words are mastered.',
    ],
    'Interspersal and guided responding create achievable success while the new skill is taught systematically. Joint academic and engagement data show whether pacing and support are reducing errors rather than simply suppressing visible behavior.',
    [
      'Unbroken blocks of difficult practice keep error rates high, increasing frustration and strengthening escape-maintained withdrawal from classroom instruction.',
      'Granting free time right after an error reinforces task escape and interrupts the guided practice needed to master new vocabulary.',
      'Reinforcing quiet classroom compliance without tracking vocabulary accuracy conceals persistent learning gaps behind superficial behavioral stillness.',
    ]
  ),
  q(
    'A student completes assignments in a quiet conference but not in a busy cooperative group. What should the team conclude?',
    'Performance is strong one-to-one and inconsistent during group instruction. What is the best next step before changing the behavior plan?',
    'Compare task demands, noise, peer interaction, cues, and reinforcement across settings, then test a targeted support.',
    [
      'Conclude that the student is deliberately refusing to collaborate because the underlying academic skill is present.',
      'Move all of the student’s core instruction into an isolated one-to-one setting for the remainder of the semester.',
      'Apply a standard schoolwide behavior package assigned to every student who shares the same support profile.',
    ],
    'A setting difference is evidence to investigate, not proof of motive. Comparing ecological and instructional variables supports a testable, least-intensive adjustment and avoids unnecessary segregation or label-based assumptions.',
    [
      'Inferring deliberate refusal overlooks real sensory, social, and cueing differences between quiet conferences and busy cooperative groups.',
      'Shifting permanently to an isolated setting violates LRE principles before testing whether modest environmental or role supports enable group success.',
      'Applying a generic label-based package ignores the specific ecological contrast that points directly to testable classroom adjustments.',
    ]
  ),
  q(
    'Assessment shows that missing multiplication facts make grade-level problem solving slow and aversive. Which response maintains ambitious instruction?',
    'A learner needs a prerequisite computation skill but can reason about grade-level situations with supports. What should the teacher do?',
    'Teach the prerequisite explicitly while maintaining supported grade-level problem solving and tracking both.',
    [
      'Postpone all grade-level problem-solving lessons until every multiplication fact is memorized automatically.',
      'Supply finished computational answers on every assignment so prerequisite fact instruction is no longer needed.',
      'Target classroom behavior management first and assume prerequisite math facts will catch up indirectly.',
    ],
    'Concurrent instruction avoids an all-or-nothing choice between remediation and meaningful curriculum access. Data on the prerequisite and grade-level application reveal whether support is improving competence and reducing the task barrier.',
    [
      'Withholding grade-level math until full fact memorization denies ambitious conceptual instruction and often increases stigma and disengagement.',
      'Giving away answers without teaching the prerequisite leaves the underlying fluency bottleneck unresolved and creates lasting dependence.',
      'Focusing solely on behavior without addressing the aversive academic skill barrier fails to remove the root trigger of task frustration.',
    ]
  ),
  q(
    'A plan rewards assignment completion, but accuracy remains low and the student never uses the taught help request. Which data are needed to judge the plan?',
    'Engagement has increased under a classroom plan, yet staff are unsure whether the student is learning or becoming independent. What should they measure?',
    'Track academic accuracy, independent engagement, replacement-request use, and implementation fidelity together.',
    [
      'Count total completed worksheet pages each afternoon because completion volume captures instructional success.',
      'Raise tangible reward frequency whenever accuracy slips so motivation to finish assignments remains high.',
      'Evaluate plan effectiveness at the end of the grading term using informal recollections from classroom staff.',
    ],
    'Completion alone can conceal errors, prompt dependence, or absence of the replacement skill. Multiple direct measures and fidelity evidence distinguish genuine instructional benefit from superficial compliance.',
    [
      'Page-completion counts can hide rapid guessing, low conceptual accuracy, heavy adult prompting, and zero use of the replacement communication skill.',
      'Increasing rewards for inaccurate work reinforces rushing rather than learning and fails to diagnose why accuracy and help-seeking remain low.',
      'Informal end-of-term impressions lack direct baseline, accuracy, replacement-behavior, and fidelity evidence needed for timely instructional changes.',
    ]
  ),
  q(
    'A multilingual student pauses before responding and becomes quiet during unfamiliar language-heavy tasks. What should guide interpretation of the behavior?',
    'A team sees withdrawal during English-only instruction but participation with familiar adults and accessible language. What should it do before selecting an intervention?',
    'Examine language access, task load, cultural context, and performance across people and settings with varied evidence.',
    [
      'Classify extended pausing and classroom silence as task defiance and initiate a formal consequence ladder.',
      'Treat withdrawal during one English-only observation as sufficient evidence to suspect an emotional disorder.',
      'Set family background and home-language input aside so classroom behavior is scored identically for all peers.',
    ],
    'Culturally and linguistically responsive assessment separates an access mismatch from a behavioral hypothesis. Multiple contexts and informants reduce bias and help the team choose instruction based on observable need rather than assumption.',
    [
      'Treating second-language processing time as willful defiance misreads a linguistic access barrier and risks inequitable disciplinary escalation.',
      'Drawing an emotional-disorder hypothesis from one English-heavy observation ignores strong participation in accessible contexts and violates multi-source safeguards.',
      'Omitting family cultural background and home-language context obscures critical explanatory evidence and undermines culturally responsive, unbiased behavioral assessment.',
    ]
  ),
];

const communicationSelfAdvocacy = [
  q(
    'A student escapes difficult work by yelling and already responds to a visual cue. Which replacement communication should be taught first?',
    'When academic demand becomes overwhelming, a learner leaves the area before requesting assistance. Which response is most functionally useful?',
    'Teach a brief, accessible help or break request that earns a prompt response and a planned return to work.',
    [
      'Teach the student to deliver a verbal apology after leaving the classroom and returning from the hallway.',
      'Require the student to write a detailed multi-sentence explanation before any instructional help is offered.',
      'Allow open-ended dismissal from every difficult assignment whenever frustration signals first appear.',
    ],
    'A functionally equivalent request must be easier and more efficient than the problem behavior while still preserving instruction. Prompt reinforcement followed by a supported return makes the replacement usable and sustainable.',
    [
      'An after-the-fact apology does not replace the escape function during task overload or prevent yelling and leaving the instructional area.',
      'Requiring a lengthy written explanation during high distress makes the replacement far more effortful than yelling, so the student will not use it.',
      'Permitting permanent escape from challenging tasks reinforces avoidance and halts academic growth instead of pairing brief relief with a supported return.',
    ]
  ),
  q(
    'A student uses insults when trying to enter a peer activity. Which communication lesson best matches the likely social function?',
    'Peer conflict occurs because a learner wants to join games but lacks a successful entry routine. What should instruction emphasize?',
    'Model and rehearse a concise peer-entry phrase with feedback, then coach supported practice in natural games.',
    [
      'Assign enjoyable solitary recreation routines so the student avoids the stress of approaching peer groups.',
      'Deliver a thorough public verbal lecture explaining social rules after every unsuccessful peer interaction.',
      'Award behavior points for remaining completely silent beside peer games without teaching how to join in.',
    ],
    'Direct teaching and natural rehearsal address the social outcome the student is seeking. Feedback and supported peer opportunities build a response that can contact the same reinforcement as the challenging behavior.',
    [
      'Routing the student into solitary play removes opportunities to practice social inclusion and fails to satisfy the student’s desire to join peers.',
      'Public lecturing after peer friction increases embarrassment and resentment without providing coached rehearsal of a workable entry phrase.',
      'Rewarding passive silence does not teach a socially effective way to enter games, leaving the underlying skill gap unresolved.',
    ]
  ),
  q(
    'A writing prompt asks students to describe a frightening personal event, and a learner shows distress. Which response preserves access and privacy?',
    'A student declines to disclose private emotional experiences in a reflective essay. What is the most appropriate instructional alternative?',
    'Offer private, non-disclosing topic and response-mode options that still measure the target writing skill.',
    [
      'Require personal disclosure on the original topic because reflective prompts are part of the written syllabus.',
      'Excuse the student from participating in upcoming writing units to avoid potential emotional discomfort.',
      'Invite supportive classmates to share their own stories first so the student feels encouraged to disclose.',
    ],
    'The writing construct can be assessed without compelled personal disclosure. Meaningful choices protect dignity and emotional safety while maintaining the academic goal and participation.',
    [
      'Compelling students to write about frightening personal experiences compromises emotional safety and privacy when other topics assess the exact same writing construct.',
      'Excusing the student from writing instruction lowers academic access unnecessarily when non-disclosing topic choices preserve full participation.',
      'Peer pressure to disclose sensitive personal experiences violates learner privacy and trauma-aware boundaries rather than offering safe academic choice.',
    ]
  ),
  q(
    'A student uses AAC to request space during early escalation, but staff remove the device to prevent damage. What should the team plan?',
    'Communication access is most needed during dysregulation, yet a device is often placed out of reach. Which revision is best?',
    'Maintain accessible communication, plan safe mounting or durable backup with the AAC team, and honor requests.',
    [
      'Store all communication devices out of reach whenever early signs of emotional distress appear in class.',
      'Require spoken verbal requests before honoring a break or space request during heightened emotion.',
      'Allow individual classroom adults to decide informally whether a student’s AAC request is valid that day.',
    ],
    'Removing communication access can eliminate the very replacement response intended to prevent escalation. Safe positioning, partner consistency, and prompt reinforcement support autonomy and make the plan functionally coherent.',
    [
      'Removing AAC during early dysregulation eliminates the learner’s safe replacement voice and reliably drives more intense behavioral escalation.',
      'Demanding spoken speech from an AAC user during stress removes functional communication access at the exact moment it is needed most.',
      'Inconsistent adult responses make the AAC request unreliable, undermining trust and causing the student to revert to faster problem behaviors.',
    ]
  ),
  q(
    'A learner wants to request a quieter testing location without relying on an adult to speak first. What is the best instructional approach?',
    'A student knows an accommodation is available but does not yet ask for it across classes. What should the educator teach?',
    'Teach when and how to request the accommodation, rehearse across partners, honor requests, and track independence.',
    [
      'Have a special educator or aide submit the testing-location request on the student’s behalf indefinitely.',
      'Encourage the student to demand any preferred room during tests without referencing the written IEP plan.',
      'Wait until the student earns a failing quiz score in the noisy room before reviewing the accommodation.',
    ],
    'Self-advocacy requires explicit knowledge, a practicable communication form, and opportunities to generalize. Measuring independent requests shows whether prompts can be faded while the documented accommodation remains accessible.',
    [
      'Having adults request accommodations permanently fosters dependence and deprives the student of self-advocacy skills needed across classes and adulthood.',
      'Demanding unaligned classroom settings without linking requests to documented IEP accommodations undermines realistic, constructive student self-advocacy skills.',
      'Waiting for academic failure before addressing accommodation use causes avoidable harm and delays teaching proactive self-advocacy.',
    ]
  ),
  q(
    'A replacement request is taught, but staff respond several minutes later while problem behavior produces an immediate break. What change is most important?',
    'A student abandons a coping card because yelling obtains assistance faster. How should the team improve the communication plan?',
    'Make the replacement efficient, honor it promptly and consistently, and teach a clear return routine.',
    [
      'Expand the coping-card routine into several written reflection steps so it feels more academically rigorous.',
      'Withhold adult responses to both the coping card and yelling until the student sits quietly for ten minutes.',
      'Eliminate challenging academic assignments whenever the student enters the classroom to prevent requests.',
    ],
    'A replacement is unlikely to compete when it is slower or less reliable than the behavior it replaces. Timely, consistent responses establish its value, and the return routine protects continued instructional access.',
    [
      'Adding extra steps increases response effort and makes the coping card even less competitive against rapid yelling.',
      'Ignoring the taught replacement request extinguishes the very skill staff want to build and risks severe extinction bursts or escalation.',
      'Removing all challenging academic instruction avoids teaching practical coping and self-advocacy skills while sacrificing meaningful educational progress.',
    ]
  ),
  q(
    'A student uses a constructive disagreement phrase with one counselor but not with teachers or family. Which plan best promotes generalization?',
    'A self-advocacy script appears only in the training room. What should the team do next?',
    'Align common cues and partner responses across natural settings while tracking student use and adult fidelity.',
    [
      'Continue rehearsing the phrase with the same counselor in the original office until delivery is effortless.',
      'Conclude that classroom transfer is complete once office accuracy is high and end progress monitoring.',
      'Ask each teacher and parent to improvise a distinct classroom response so the student practices flexibility.',
    ],
    'Generalization is programmed through varied examples, common essential cues, and consistent consequences. Student and fidelity data help the team identify whether transfer failure reflects instruction or inconsistent partner response.',
    [
      'Continuing isolated drills in one office strengthens narrow setting-specific stimulus control instead of transferring the phrase to real classes and home.',
      'Discontinuing data collection before verifying natural-setting use leaves generalization unmeasured and risks losing the newly taught skill.',
      'Uncoordinated partner responses confuse the learner about whether the constructive phrase actually works across classrooms and adults.',
    ]
  ),
  q(
    'After a conflict, staff want a student to make a public apology immediately while still visibly distressed. What is a more educationally useful approach?',
    'A restorative conversation is planned after a classroom incident. Which sequence best protects dignity and teaches repair?',
    'Support regulation first, then hold a private process to review impact, choose a repair, and rehearse next steps.',
    [
      'Require a prompt verbal apology in front of the entire class before the student leaves the conflict area.',
      'Skip all restorative follow-up because discussing interpersonal impact feels stressful to a distressed learner.',
      'Invite classmates to vote together on an appropriate classroom consequence and exact apology wording.',
    ],
    'Restorative practice is most useful when the student can participate safely and with agency. A specific, private repair plus rehearsal teaches responsibility without forced disclosure, humiliation, or a purely punitive response.',
    [
      'Forcing a public apology during active dysregulation risks humiliation and secondary escalation rather than genuine reflection or skill learning.',
      'Skipping follow-up altogether misses an opportunity—once the student is calm—to repair relationships and rehearse a better future response.',
      'Having classmates vote on disciplinary punishments compromises student confidentiality, personal dignity, and trauma-aware restorative classroom boundaries.',
    ]
  ),
];

const strategySelfMonitoring = [
  q(
    'A student will self-monitor on-task behavior during independent work. What should the teacher establish before using a timer and checklist?',
    'A learner marks whether work behavior was on task every five minutes. How can the team make the data meaningful?',
    'Define on-task behavior observably, teach the recording routine, and periodically check agreement directly.',
    [
      'Use a broad verbal reminder to behave well and accept every self-recorded tally mark without verification.',
      'Display the student’s self-monitoring tally chart publicly on the wall so classmates can double-check marks.',
      'Track final assignment grades in place of accuracy checks because self-monitoring needs no direct validation.',
    ],
    'An observable definition and explicit practice make self-recording teachable. Occasional comparison with direct observation checks accuracy while preserving the student ownership that can support independence.',
    [
      'Vague expectations like behaving well give the student no observable criterion to judge, making self-recorded marks inconsistent and uninformative.',
      'Posting individual behavior charts publicly breaches confidentiality and creates peer stigma rather than supportive private self-regulation.',
      'Grades alone do not confirm whether the student accurately recognizes and records on-task behavior during work intervals.',
    ]
  ),
  q(
    'A student can list coping strategies but does not select one when early tension appears. Which instruction is most likely to improve use?',
    'A learner recognizes escalation only after losing instructional control. What should a coping plan include?',
    'Teach individualized early cues, practice selecting a strategy while calm, prompt early, and monitor outcomes.',
    [
      'Wait for a peak crisis episode and introduce several brand-new coping options while tension is highest.',
      'Assign one standard calming routine for every school setting without asking for the student’s preferences.',
      'Reinforce reciting emotion vocabulary on flashcards without rehearsing an actionable coping response.',
    ],
    'Strategy knowledge alone does not ensure timely use. Teaching antecedent cues, choice, calm rehearsal, and supported application builds fluency before high-intensity moments and provides evidence about which response works.',
    [
      'Introducing unfamiliar coping steps during acute crisis overloads a dysregulated learner and prevents effective skill acquisition.',
      'Imposing one rigid strategy across all contexts without student input lowers buy-in and may fit poorly in certain classrooms or peer settings.',
      'Naming emotions without practicing concrete early-cue action steps does not bridge the gap between knowing a strategy and using it in real time.',
    ]
  ),
  q(
    'A student needs repeated adult directions to complete the arrival routine. Which task-analysis approach best builds independence?',
    'Morning organization breaks down at several predictable steps. What should the educator do?',
    'Break the routine into observable steps, prompt only missed steps, reinforce completion, and fade systematically.',
    [
      'Deliver step-by-step adult verbal prompts every morning indefinitely so arrival errors stay rare.',
      'Introduce every complex organization routine simultaneously without assessing which steps are already solid.',
      'Complete any skipped morning organization steps quietly for the student without recording adult support.',
    ],
    'A task analysis locates the exact teaching points and permits planned prompting and fading. Step-level data distinguish skill acquisition from adult completion and guide movement toward independent routine use.',
    [
      'Continuous verbal directing keeps stimulus control on the adult and prevents the student from initiating arrival steps independently.',
      'Teaching all steps without baseline assessment wastes time on mastered parts and overwhelms the student at genuine breakdown points.',
      'Quietly finishing steps for the student masks support needs in the data and reinforces prompt dependence instead of independence.',
    ]
  ),
  q(
    'A student wants to reduce call-outs during discussion. Which goal-setting routine most supports agency?',
    'A learner is ready to track use of a hand-raising strategy. What should the teacher do?',
    'Co-create a realistic target, graph private data, review patterns together, and choose the next adjustment.',
    [
      'Post the student’s daily call-out graph beside the classroom door to strengthen public accountability.',
      'Select the behavioral criterion privately as staff and reveal progress only when report cards go home.',
      'Record informal daily ratings of teacher frustration instead of counting observable hand-raising or call-outs.',
    ],
    'Collaborative, private goal review makes the observable data useful to the learner and supports self-determination. Frequent reflection permits realistic adjustment without public shaming or reliance on subjective impressions.',
    [
      'Posting individual behavior graphs publicly compromises student privacy and dignity and can trigger embarrassment or oppositional classroom escalation.',
      'Setting goals without student input and delaying feedback until grading time removes learner agency and timely self-correction.',
      'Measuring adult frustration reflects subjective impressions rather than objective student response counts needed for fair goal evaluation.',
    ]
  ),
  q(
    'A school is considering check-in/check-out for a student with inconsistent morning engagement. What should determine whether it is appropriate?',
    'A common Tier 2 routine is proposed automatically after several missed assignments. Which decision process is strongest?',
    'Align the routine to documented needs and likely reinforcers, gather student input, and track outcomes and fidelity.',
    [
      'Enroll the student in check-in/check-out because every learner with EBD should participate in Tier 2 routines.',
      'Launch the daily check-in sheet without defining measurable targets and keep it running through spring.',
      'Discontinue existing individualized IEP supports once the standard Tier 2 check-in routine begins.',
    ],
    'A standardized support is not automatically functionally relevant. Individualized matching, voice, measurable outcomes, and fidelity checks allow the team to determine benefit and revise rather than treating placement in the intervention as the goal.',
    [
      'Assigning check-in/check-out by eligibility label ignores whether adult attention is actually reinforcing or aversive for that specific learner.',
      'Running an intervention all year without clear goals or data review wastes time and fails to detect whether the support is working.',
      'A Tier 2 routine supplements rather than replaces individualized IEP services and supports documented as necessary for FAPE.',
    ]
  ),
  q(
    'A learner acts impulsively during peer disagreement. Which strategy lesson is most likely to transfer?',
    'The team wants to teach a stop-think-choose routine for conflict. What should instruction include?',
    'Model the steps with realistic examples, rehearse with feedback, prompt in low-risk routines, and fade cues.',
    [
      'Present the stop-think-choose sequence once during an advisory lecture and expect reliable classroom transfer.',
      'Limit strategy instruction to paper-and-pencil reflection worksheets detached from real peer interactions.',
      'Reserve the stop-think-choose routine as a written reflection consequence after serious behavioral incidents.',
    ],
    'Cognitive-behavioral strategies require explicit modeling, multiple examples, active rehearsal, and supported use where the response is needed. Planned fading avoids permanent dependence on adult cues.',
    [
      'A single verbal explanation builds awareness at best and rarely transfers under the emotional heat of real peer disagreements.',
      'Worksheet-only strategy practice omits realistic peer social cues, guided role-play rehearsal, and coached transfer into authentic daily classroom routines.',
      'Using a self-regulation routine strictly as post-incident punishment pairs the strategy with aversive consequences instead of proactive skill use.',
    ]
  ),
  q(
    'Staff successfully de-escalate a dangerous episode. When should instruction in the replacement skill occur?',
    'A student is safe after an acute escalation but is still recovering. Which sequence is most appropriate?',
    'Follow the safety plan through full recovery, then teach and rehearse the replacement skill when regulated.',
    [
      'Deliver a comprehensive replacement-skill lesson during peak agitation so the mistake stays fresh in mind.',
      'Treat successful crisis de-escalation as confirmation that the student has mastered the replacement skill.',
      'Omit follow-up replacement-skill teaching because the emergency safety protocol managed the episode safely.',
    ],
    'Crisis response prioritizes immediate safety and is not an optimal teaching context. Delayed, planned instruction after recovery separates de-escalation from skill acquisition and supports future prevention.',
    [
      'Attempting extended replacement-skill instruction during peak emotional agitation overloads cognitive processing and frequently triggers renewed crisis escalation.',
      'De-escalation restores immediate physical safety; it does not mean the learner can fluently execute an alternative skill next time a trigger appears.',
      'Skipping proactive skill instruction after recovery leaves the student dependent on crisis protocols instead of preventing future escalations.',
    ]
  ),
  q(
    'A self-management plan works with daily adult reminders. How should the team move toward durable independence?',
    'A student uses a regulation checklist accurately in one class with dense reinforcement. What is the best maintenance plan?',
    'Fade prompts and reinforcement gradually from data while probing use across people, tasks, settings, and time.',
    [
      'Withdraw every prompt and reinforcer at once after the student achieves a single successful school day.',
      'Keep identical daily adult reminders in place throughout the school year so no classroom slip occurs.',
      'Track checklist maintenance strictly inside the original classroom where the routine was first introduced.',
    ],
    'Systematic fading based on stable data reduces prompt dependence without abrupt loss of support. Generalization and maintenance probes show whether the strategy remains functional beyond the original teaching conditions.',
    [
      'Abruptly removing all supports after one good day risks rapid skill collapse before independent self-management habits stabilize.',
      'Maintaining permanent adult reminders sustains prompt dependence and prevents testing whether the student can self-manage independently.',
      'Monitoring only in the original classroom cannot verify whether the checklist transfers to other teachers, routines, or later weeks.',
    ]
  ),
];

module.exports = { academicInstruction, communicationSelfAdvocacy, strategySelfMonitoring };
