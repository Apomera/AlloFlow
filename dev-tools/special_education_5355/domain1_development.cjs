'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, IDEA_IEP_REVIEW } = sources;

module.exports = [
  {
    id: 'development-milestones-context',
    chapterId: 'sp5355-ch-01',
    domainId: 'development-differences',
    domain: 'Human Development and Individual Learning Differences',
    label: 'Development, Context, and Learner Variability',
    references: [ETS],
    questions: [
      q(
        'A kindergarten teacher notices that one child reaches several language milestones later than classmates. What is the most appropriate first interpretation?',
        'A preschool team sees that one child uses shorter sentences than most same-age peers. Which conclusion is most defensible?',
        'Broad developmental patterns allow wide variation, so the team should gather multi-source evidence across settings before drawing conclusions.',
        [
          'Falling below the typical classroom average on language milestones establishes a developmental disability that warrants formal eligibility.',
          'The team should assign a provisional disability label promptly so specialized speech-language interventions can begin before gathering family input.',
          'Chronological age norms become uninformative once a child trails classmates, so expectations should be based on informal adult impressions instead.',
        ],
        'Milestones provide useful reference points, not stand-alone diagnoses. Educators should document functioning across domains, contexts, and time and involve qualified team members before attributing a pattern to disability.',
        [
          'Classroom averages reflect one peer group rather than a diagnostic standard, and early language variation can stem from experience, exposure, or home-language patterns rather than a disability.',
          'Assigning a provisional disability label before multidisciplinary evaluation and family input bypasses IDEA safeguards and risks misidentifying typical developmental variation as an impairment.',
          'Chronological age remains an essential benchmark for interpreting developmental expectations and selecting age-respectful instructional routines, even when a learner needs targeted supports.',
        ],
        'foundation'
      ),
      q(
        'A student solves multistep problems during small-group instruction but rarely begins the same work during a noisy whole-class period. What should the teacher examine first?',
        'A learner participates successfully in science lab with a visual agenda but disengages during unstructured project time. What is the best next step?',
        'Compare task demands, environmental conditions, supports, and performance across both settings.',
        [
          'Conclude that the student has not yet retained the underlying academic skill and re-teach the lesson from the beginning.',
          'Lower the academic complexity of the independent assignment so the student can finish without using classroom supports.',
          'Treat the drop in task initiation during the busier period as willful avoidance and add a stricter compliance consequence.',
        ],
        'Performance reflects an interaction among learner skills, task demands, supports, and context. Comparing conditions can identify a removable barrier before the team changes expectations or infers a stable trait.',
        [
          'Because the student already demonstrates the skill in the structured setting, the gap points to contextual or support barriers rather than a loss of conceptual understanding.',
          'Reducing academic complexity lowers expectations unnecessarily when the learner has already shown the ability to meet the target under supportive environmental conditions.',
          'Interpreting context-dependent disengagement as intentional defiance overlooks sensory, organizational, or initiation barriers that can be addressed proactively through environmental supports.',
        ]
      ),
      q(
        'A teacher wants to understand a learner’s self-regulation needs. Which information is most useful?',
        'A team is planning supports for a student who becomes overwhelmed during independent work. Which data set offers the strongest starting point?',
        'Current observations of triggers, strategies used, recovery patterns, and successful routines.',
        [
          'A single global behavior rating scale completed by a previous teacher at the start of the school year.',
          'The student’s primary disability eligibility category paired with a general list of typical classroom accommodations.',
          'Whole-class averages showing how long most classmates sustain independent work without requesting teacher support.',
        ],
        'Self-regulation is best understood through specific, current observations of what precedes difficulty, how the learner responds, which strategies help, and whether patterns differ by setting or task.',
        [
          'An outdated global rating summarizes broad impressions from another context and fails to identify the specific triggers, warning signs, and calming strategies relevant to current routines.',
          'Eligibility labels describe broad qualifying criteria rather than individual regulation profiles, so relying on category lists misses the learner’s actual antecedents and effective coping tools.',
          'Peer-group averages show general classroom norms but do not reveal what overwhelms this individual student or which environmental adjustments help restore engagement.',
        ]
      ),
      q(
        'A multilingual learner has difficulty following rapid oral directions in English but demonstrates the task after a peer models it. Which interpretation is best?',
        'A student learning English gives brief oral responses but accurately sorts and explains concepts with drawings in the home language. What should the team conclude first?',
        'Language access may affect how knowledge is shown, so gather culturally and linguistically appropriate evidence.',
        [
          'Difficulty demonstrating understanding through rapid English oral tasks provides sufficient evidence to suspect an intellectual disability.',
          'Peer modeling and visual representations should be removed during checks so the teacher can measure the student’s true academic mastery.',
          'Information about how the student performs in the home language is outside school accountability and should be set aside during planning.',
        ],
        'Difference is not disability. The team should distinguish language acquisition and access from disability by using multiple methods, appropriate language supports, and information about performance in the learner’s languages.',
        [
          'Limited proficiency in rapid English instructions reflects second-language processing demands, not impaired intellectual functioning; accurate demonstration via modeling or visuals argues against cognitive deficit.',
          'Stripping away modeling or visual supports confounds English language load with content mastery, making assessment data less valid rather than more accurate.',
          'Home-language performance is crucial evidence for distinguishing language acquisition from disability and helps educators build on concepts the student already understands.',
        ]
      ),
      q(
        'A middle school student with a disability is embarrassed when an adult uses babyish materials for a functional routine. What principle should guide revision?',
        'A high school learner practices daily-living skills with worksheets designed for very young children. What is the best instructional change?',
        'Use age-respectful materials while adapting task steps and supports to current learner needs.',
        [
          'Select instructional materials strictly by developmental age estimate so the formatting matches early-childhood readiness charts.',
          'Postpone functional and daily-living instruction until the student achieves independent mastery on grade-level academic standards.',
          'Assign helpful classmates to perform the functional routine for the student so embarrassing instructional materials are unnecessary.',
        ],
        'Instruction can be individualized without sacrificing dignity. Materials and contexts should be chronological-age respectful, while prompts, task steps, and response modes are adapted to the learner’s present performance.',
        [
          'Matching materials to early-childhood aesthetics undermines dignity, peer belonging, and motivation when adult or adolescent formats can target the same prerequisite skills effectively.',
          'Delaying essential daily-living instruction until full grade-level mastery denies functional independence and violates the balance between academic access and life-skills preparation.',
          'Having peers complete the routine removes authentic learning opportunities, fosters dependence, and prevents the student from building self-determined functional skills.',
        ]
      ),
      q(
        'A student performs a social routine only with one familiar adult. Which plan best promotes generalization?',
        'A learner uses a requesting strategy in the resource room but not in the cafeteria. What should the team do?',
        'Teach across planned variations in people, materials, and natural settings, then fade prompts.',
        [
          'Continue drilling the skill in the original instructional setting until accuracy stays high across several additional months.',
          'Introduce multiple unrelated social and communication targets simultaneously so the student practices broader flexibility right away.',
          'End direct instruction once mastery appears in the familiar setting and monitor whether transfer emerges spontaneously over time.',
        ],
        'Generalization is more likely when instruction deliberately varies relevant people, materials, and settings, reinforces the skill in natural routines, and gradually transfers stimulus control away from adult prompts.',
        [
          'Over-practicing in one controlled setting with one adult strengthens narrow stimulus control and rarely transfers without deliberate instruction across natural partners and environments.',
          'Adding unrelated targets at the same time increases cognitive load and interferes with consolidating the specific cue-response link the student needs to transfer.',
          'Hoping for spontaneous transfer—often called train-and-hope—frequently fails for learners who need explicit programming across settings, natural cues, and reinforcement contingencies.',
        ]
      ),
      q(
        'A team is writing a learner profile. Which statement is most useful for planning?',
        'Which present-level statement gives an IEP team the most actionable developmental information?',
        'The student completes a two-step visual routine independently and needs one verbal cue when steps change.',
        [
          'The student performs at a low-functioning developmental level across most structured and unstructured school routines.',
          'Because the student has an autism diagnosis, the student prefers fixed classroom schedules and dislikes unexpected changes.',
          'The student operates at a developmental stage several years below same-age classmates in daily classroom independence.',
        ],
        'Objective descriptions identify a demonstrated strength, a specific condition, and the support needed. Global labels and assumptions based on category do not tell the team what to teach or how to measure change.',
        [
          'Broad deficit labels such as low-functioning are non-specific, lack measurable baseline data, and fail to show what the student can already do or which prompts help.',
          'Inferring preferences from a diagnostic label stereotypes the learner instead of documenting observable classroom performance, specific conditions, and effective supports.',
          'Age-equivalent estimates oversimplify uneven skill profiles and do not specify the observable behaviors or instructional cues the team needs to write measurable goals.',
        ]
      ),
      q(
        'A learner’s participation drops after a recent family move and change in transportation. How should the school respond?',
        'A student’s work completion changes sharply after housing instability disrupts sleep and attendance. What is the best interpretation?',
        'Weigh environmental disruptions alongside disability needs and coordinate supports respectfully.',
        [
          'Attribute the sudden drop in classroom participation to progression of the student’s underlying disability profile.',
          'Recommend moving the student to a more restrictive special education classroom so academic expectations can be reduced.',
          'Keep classroom planning focused on curriculum pacing because housing and transportation factors fall outside school instruction.',
        ],
        'Development and learning are influenced by environmental as well as biological factors. A responsive team gathers context, protects privacy, stabilizes access, and avoids treating a situational change as proof of a new disability need.',
        [
          'Blaming an acute performance drop on an existing disability overlooks clear situational stressors such as disrupted sleep, attendance, or routines that require stabilization supports.',
          'Changing placement to a more restrictive setting violates LRE principles when the decline coincides with temporary external disruptions rather than an inability to learn with supports.',
          'Ignoring major environmental stressors misses actionable school-based resources—such as flexible check-ins, McKinney-Vento coordination, and counseling—that directly affect access to learning.',
        ]
      ),
      q(
        'A teacher records one difficult morning and says a student has lost a previously learned skill. What evidence is needed before changing the program?',
        'After one poor assessment session, a team proposes a major reduction in expectations. What should happen first?',
        'Gather repeated observations and work samples under representative conditions and compare them with baseline data.',
        [
          'Revise the instructional program right away because the most recent classroom observation reflects the student’s current true level.',
          'Review the student’s disability classification report to confirm whether regression is commonly associated with that label.',
          'Postpone gathering additional evidence until the scheduled annual IEP meeting so classroom routines remain uninterrupted.',
        ],
        'A single observation may be affected by health, context, fatigue, or task features. Repeated measures and comparison with baseline information support a more reliable decision about whether performance truly changed.',
        [
          'A single low session is vulnerable to fatigue, illness, distraction, or testing glitches and provides insufficient reliability to justify major programmatic changes.',
          'General category expectations cannot verify whether an individual learner experienced genuine skill regression; direct longitudinal performance data are required.',
          'Waiting until an annual review without collecting follow-up probes leaves the team unable to tell whether the dip was temporary or signals an urgent instructional need.',
        ]
      ),
    ],
  },
  {
    id: 'disability-characteristics-impact',
    chapterId: 'sp5355-ch-02',
    domainId: 'development-differences',
    domain: 'Human Development and Individual Learning Differences',
    label: 'Disability Characteristics and Educational Impact',
    references: [ETS],
    questions: [
      q(
        'A student with a specific learning disability reads grade-level text accurately but cannot organize written paragraphs. Which response is best?',
        'A learner identified with SLD calculates accurately but has persistent difficulty decoding unfamiliar words. What should guide support?',
        'Target the documented area of academic need while preserving strengths in unaffected subjects.',
        [
          'Deliver uniform remedial instruction across all core academic subjects so the student receives consistent skill reinforcement.',
          'Interpret the persistent academic bottleneck as evidence of broadly limited cognitive ability across every learning domain.',
          'Assign an instructional aide to complete the demanding academic steps so the student can keep pace with class assignments.',
        ],
        'Specific learning disabilities can affect particular psychological processes and academic skills unevenly. Instruction should be based on the learner’s actual pattern of strengths and needs, not a global assumption.',
        [
          'Applying blanket remediation across strong subjects wastes instructional time, lowers engagement, and ignores the defining uneven skill profile typical of specific learning disabilities.',
          'Specific learning disabilities affect targeted processing and academic skills rather than overall intellectual capacity, so inferring broad cognitive limits misinterprets the learner’s profile.',
          'Having an adult complete the challenging task prevents skill acquisition, creates prompt dependence, and substitutes completion for specially designed instruction.',
        ]
      ),
      q(
        'A student with autism covers their ears during fire-drill announcements and then misses directions. Which support is most responsive?',
        'A learner with ASD becomes distressed when a loud timer signals transitions. What is the best initial support?',
        'Build a predictable warning and accessible cueing routine while teaching the student how to use it.',
        [
          'Treat covering the ears and missing directions as task refusal and apply standard classroom behavior consequences.',
          'Excuse the student from participating in future schoolwide drills or timed transitions to avoid triggering sensory distress.',
          'Continue using loud, unannounced signals without preparation so the student gradually desensitizes through repeated exposure.',
        ],
        'Sensory and communication needs can affect access and behavior. A predictable warning, accessible direction, and taught coping or communication response support participation while preserving safety requirements.',
        [
          'Treating sensory overload as willful defiance misreads a neurobiological access barrier and can escalate distress without teaching an effective safety or transition response.',
          'Excluding the student from safety drills or transitions undermines safety preparedness and reduces inclusive participation when proactive sensory supports can enable success.',
          'Unprepared exposure to painful or overwhelming auditory stimuli risks trauma and escalation rather than building self-regulation or reliable response to emergency directions.',
        ]
      ),
      q(
        'A student with ADHD begins work when directions are chunked and a checklist is visible. What does this pattern suggest?',
        'A learner with ADHD completes projects with interim deadlines but misses work when given one distant due date. Which interpretation is best?',
        'Executive-function scaffolds are strengthening task initiation, planning, and self-monitoring.',
        [
          'The student already mastered the self-management skills needed and had been choosing not to start earlier assignments.',
          'Adding checklists and interim milestones has lowered the rigor of the grade-level academic standard being assessed.',
          'The student’s uneven project completion reflects limited intellectual understanding of the content rather than self-regulation.',
        ],
        'ADHD may affect executive functions such as initiation, working memory, inhibition, and organization. External structures can support performance without changing the learning target or implying weak ability.',
        [
          'Responding well to external structure is a hallmark of executive-function support needs, not evidence of intentional noncompliance or lack of motivation.',
          'Chunking directions and setting interim checkpoints support organization and initiation while keeping the underlying academic content and rigor intact.',
          'Completing the same content accurately once tasks are structured demonstrates intact conceptual capability paired with executive-function barriers to independent planning.',
        ]
      ),
      q(
        'A student with an emotional or behavioral disability argues mainly during unpredictable peer-group tasks. What perspective is most useful?',
        'A learner with EBD withdraws during competitive activities but participates during structured cooperative routines. What should the team examine?',
        'Analyze interactions among the learner, task structure, peers, expectations, and consequences.',
        [
          'Expect the same level of emotional conflict across every school setting because the disability resides within the student.',
          'Conclude that classmates’ interpersonal habits are the sole cause of the student’s behavioral difficulties during group work.',
          'Replace peer-group and cooperative learning tasks with independent seatwork for the remainder of the academic year.',
        ],
        'An ecological perspective considers how behavior emerges through interactions between the learner and the environment. Context-specific data can guide prevention, instruction, and reinforcement of more effective responses.',
        [
          'Assuming behavior is invariant across contexts ignores the clear contextual contrast shown in the scenario and misses preventive instructional levers.',
          'Blaming peers alone oversimplifies a reciprocal interaction and ignores how clear roles, expectations, and taught social skills can improve participation.',
          'Eliminating collaborative opportunities permanently removes vital social-learning contexts and restricts access to inclusive peers instead of teaching structured participation.',
        ]
      ),
      q(
        'Which information is essential when considering educational needs associated with intellectual disability?',
        'A team is reviewing support needs for a student with an intellectual disability. Which evidence is most central?',
        'Combined evidence of intellectual functioning and adaptive behavior across conceptual, social, and practical domains.',
        [
          'A standardized oral reading fluency and comprehension score collected during a single school screening window.',
          'Medical history records and physical growth measurements gathered from the student’s primary health-care provider.',
          'Anecdotal teacher ratings describing the student’s adherence to rules inside one general education classroom.',
        ],
        'Intellectual disability involves limitations in intellectual functioning and adaptive behavior. Educational planning therefore considers functional conceptual, social, and practical performance across relevant environments.',
        [
          'A single academic reading measure cannot capture broader intellectual functioning or everyday social and practical adaptive skills needed to plan comprehensive supports.',
          'Medical history may inform health accommodations, but it does not document cognitive functioning or adaptive performance across school, home, and community settings.',
          'Informal impressions from one classroom omit cross-setting adaptive evidence and standardized cognitive information required for accurate educational planning.',
        ]
      ),
      q(
        'A student understands grade-level ideas but has difficulty producing clear speech. What is the most appropriate instructional assumption?',
        'A learner uses an AAC system and needs extra response time during discussion. Which teacher response is best?',
        'Presume competence, support an accessible response mode, and separate speech production from content mastery.',
        [
          'Simplify the cognitive complexity of class questions so the student can participate with brief, low-demand responses.',
          'Speak for the student during whole-class discussions so the pacing of the lesson remains smooth for classmates.',
          'Require spoken oral answers during formal checks so the student gets daily practice in expressive articulation.',
        ],
        'A communication disability can limit how knowledge is expressed without indicating limited understanding. Accessible response modes and adequate wait time help the student demonstrate the intended construct.',
        [
          'Lowering cognitive rigor confuses speech-production barriers with intellectual capacity and deprives the learner of grade-level conceptual challenge.',
          'Answering on the student’s behalf silences the learner’s voice, denies authentic communication practice, and prevents accurate assessment of what the student knows.',
          'Insisting on spoken production when speech is the barrier measures speech motor skill instead of the intended academic construct and blocks equitable participation.',
        ]
      ),
      q(
        'A learner has both a visual impairment and a motor disability. How should the team plan access?',
        'A student has hearing, mobility, and health-related needs that interact during laboratory work. What is the best approach?',
        'Evaluate how the combined needs interact in each task and coordinate supports across specialists.',
        [
          'Attach standard classroom accommodations for each separate disability label without trialing how they work together.',
          'Prioritize accommodations for the student’s primary eligibility category while keeping other routines unchanged.',
          'Predict all classroom barriers directly from diagnostic descriptions so lab trials are not necessary before starting.',
        ],
        'Co-occurring disabilities may interact in ways that are not captured by treating each label separately. Collaborative task analysis and trials show how combined access, communication, positioning, and health supports function.',
        [
          'Stacking isolated accommodations without testing them together can create conflicts—for instance, enlarging print in a way that exceeds a learner’s safe physical reach.',
          'Addressing only one eligibility label leaves interacting sensory, motor, or health barriers unaddressed and risks unsafe or inaccessible participation.',
          'Diagnostic categories describe broad patterns, not how a specific learner’s multiple needs interact with particular equipment, lighting, acoustics, and positioning.',
        ]
      ),
      q(
        'A student with dyslexia reads familiar words from memory but struggles to decode new words. Which instruction most directly addresses the need?',
        'A learner with persistent word-reading difficulty guesses unfamiliar words from pictures and first letters. What is the strongest instructional focus?',
        'Explicit, systematic instruction in phonics, word analysis, and cumulative decoding practice.',
        [
          'Extended independent silent reading time with self-selected books and minimal adult interruption or feedback.',
          'Repeated flashcard drills aimed at memorizing the visual outline of each new grade-level vocabulary word.',
          'Replacing print reading instruction with audio recordings across all literacy and content-area assignments.',
        ],
        'Dyslexia commonly involves accurate or fluent word recognition, decoding, and spelling. Explicit, systematic instruction with modeling, guided practice, cumulative review, and feedback directly addresses these skills.',
        [
          'Unstructured silent reading without explicit decoding instruction and corrective feedback allows guessing habits to persist rather than building reliable word-reading skills.',
          'Whole-word visual memorization breaks down as vocabulary expands and does not equip the learner to decode unfamiliar multisyllabic words independently.',
          'While audio supports content access, replacing decoding instruction entirely denies the student systematic intervention needed to build foundational literacy.',
        ]
      ),
      q(
        'Two students share the same disability category but respond differently to the same scaffold. What should the teacher do?',
        'Students with the same eligibility label show different strengths, communication preferences, and support needs. What follows?',
        'Use individual performance data to select, monitor, and adapt supports for each student.',
        [
          'Maintain uniform instructional scaffolds for both students so accommodations match their shared eligibility category.',
          'Keep the original scaffold unchanged for fairness until the end of the grading period before comparing outcomes.',
          'Request a reevaluation immediately because divergent responses indicate that one student was misclassified.',
        ],
        'A disability category does not prescribe a single instructional profile. Individualized planning uses current performance, preferences, goals, and response data to decide which supports help each learner.',
        [
          'Standardizing supports by eligibility label ignores wide within-category variability and contradicts IDEA’s core requirement for individualized programming.',
          'Fairness in special education means providing what each learner needs to access learning, not keeping an ineffective scaffold in place for uniformity.',
          'Different responses to a single instructional tool reflect normal learner variability rather than diagnostic error and call for instructional adjustment, not automatic reclassification.',
        ]
      ),
    ],
  },
  {
    id: 'adaptive-sensory-health-supports',
    chapterId: 'sp5355-ch-03',
    domainId: 'development-differences',
    domain: 'Human Development and Individual Learning Differences',
    label: 'Adaptive, Sensory, Physical, and Health Supports',
    references: [ETS, IDEA_IEP_REVIEW],
    questions: [
      q(
        'A student with low vision receives a worksheet containing a dense unlabeled diagram. What is the best access response?',
        'A learner who is blind is assigned a graph that is available only as a small image. What should the team provide?',
        'Provide an equivalent accessible format—such as a verbal description, tactile graphic, or usable enlargement.',
        [
          'Substitute an easier vocabulary activity from an earlier unit so the student can work independently without visual media.',
          'Provide a classmate’s completed responses so the student can record the conclusions without interpreting the figure.',
          'Allow extended time on the original worksheet while keeping the dense visual graphic unchanged in size and contrast.',
        ],
        'Access means preserving the intended concept while changing how information is perceived when necessary. The appropriate representation depends on the learner’s assessed media and access needs.',
        [
          'Substituting an unrelated lower-level task strips away access to the target concept instead of making the grade-level information perceptible.',
          'Copying a peer’s answers removes conceptual engagement and assessment validity rather than enabling the student to analyze the information directly.',
          'Extra time does not resolve a visual-access barrier if the underlying diagram or small graph remains unreadable or unperceivable to the learner.',
        ]
      ),
      q(
        'A student who is deaf uses sign language and will join a fast-paced seminar. Which plan best supports communication access?',
        'A hard-of-hearing student is entering a discussion-heavy class. What should the IEP team consider?',
        'Address communication mode, direct interaction opportunities, acoustics, assistive technology, and speaker visibility.',
        [
          'Assign front-row seating near the teacher’s desk as the primary accommodation for full seminar participation.',
          'Replace live seminar discussions with written summaries so the student can earn participation credit independently.',
          'Maintain rapid open-floor discussions without turn-taking cues so the student experiences realistic peer pacing.',
        ],
        'Communication access is broader than hearing volume. Planning should address the learner’s language and mode, visibility or audibility of speakers, technology, peer access, and direct instruction needs.',
        [
          'Front-row seating alone cannot provide access to rapid multi-speaker peer dialogue, sign-language interpretation, visual turn-taking, or assistive listening needs.',
          'Replacing live peer discussion with solitary written work restricts inclusive interaction and denies authentic communication participation with classmates.',
          'Unstructured overlapping speech makes speechreading, interpreting, and assistive listening far less effective; clear speaker identification supports equitable access.',
        ]
      ),
      q(
        'A student with a physical disability needs support positioning materials during science lab. What is the teacher’s best action?',
        'A learner with limited motor control cannot safely reach equipment in a standard workstation. Which response is best?',
        'Collaborate with the student and specialists to arrange safe, accessible positioning and active lab participation.',
        [
          'Assign the student to record observations from the side of the room during laboratory investigations for safety.',
          'Adjust the student’s wheelchair seating and lab reach setup independently based on quick classroom judgment.',
          'Ask a lab partner to make experimental decisions and manipulate every tool while the student watches the steps.',
        ],
        'Physical access should enable meaningful participation and follow established safety, positioning, and equipment guidance. Collaboration prevents unsafe improvisation and avoids unnecessary removal of learner agency.',
        [
          'Relegating the student to a passive observer role restricts hands-on science participation when adapted equipment or accessible lab stations can support direct involvement.',
          'Improvising physical positioning without OT/PT or student guidance risks discomfort, injury, or equipment instability and bypasses the established health and safety plan.',
          'Having a peer take over experimental decisions strips away cognitive agency; even when a partner assists physically, the student can direct steps and control adapted tools.',
        ]
      ),
      q(
        'A student has a documented seizure action plan. During a classroom seizure, what should staff do first?',
        'A learner with a health condition experiences the event described in the school emergency plan. What is the correct response?',
        'Follow the individualized emergency plan, protect safety, and activate trained medical procedures.',
        [
          'Improvise a quick classroom response based on staff intuition rather than pausing to follow written health protocols.',
          'Offer water, a small snack, or an unprescribed comfort remedy to help stabilize the student during the episode.',
          'Wait to initiate school emergency procedures until a parent or guardian can be reached by telephone for guidance.',
        ],
        'Health supports in school must follow the individualized plan, staff training, delegation rules, and emergency procedures. Improvised treatment can create risk and exceed an educator’s role.',
        [
          'Improvising outside the individualized health plan increases medical risk and violates school nursing delegation and emergency-response protocols.',
          'Giving unauthorized food, liquid, or medication during a seizure or acute health event can cause choking or dangerous medical complications.',
          'Delaying emergency action until family contact is made wastes critical response time; staff must follow the written medical plan first and notify families per protocol.',
        ]
      ),
      q(
        'Which goal best addresses adaptive behavior?',
        'A team wants to measure growth in practical daily functioning. Which target is most appropriate?',
        'Given a visual checklist, the student will complete four cafeteria-purchasing steps in four of five trials.',
        [
          'Over the upcoming grading period, the student will demonstrate noticeably greater daily independence across school routines.',
          'By the end of the annual review cycle, the student will achieve higher composite scores on a standardized intelligence test.',
          'During school hours, the student will perform everyday self-care and social routines identically to same-age classmates.',
        ],
        'Adaptive goals should identify a meaningful conceptual, social, or practical routine and specify observable conditions, performance, and criteria. Vague comparisons do not support instruction or progress monitoring.',
        [
          'Broad phrases such as noticeably greater independence lack observable behaviors, conditions, and mastery criteria, making objective progress monitoring impossible.',
          'Standardized intelligence scores measure broad cognitive constructs rather than functional adaptive routines and are not appropriate targets for annual IEP goals.',
          'Requiring identical performance to peers ignores individualized accommodations and fails to define specific, measurable functional steps the team can teach and track.',
        ]
      ),
      q(
        'A team is considering text-to-speech for a student who understands content but reads print slowly. What is the best next step?',
        'A learner may benefit from speech-to-text for extended writing. How should the team decide?',
        'Run a structured task trial, teach tool use, and compare access data with and without the tool.',
        [
          'Order the most feature-rich commercial software license right away so the student has full options without trial delays.',
          'Decline the assistive technology tool because classmates without IEPs might also find the same feature helpful.',
          'Approve the tool based on the student’s disability eligibility label without collecting baseline or trial performance data.',
        ],
        'Assistive technology decisions are individualized. A structured trial examines whether the tool reduces the relevant barrier, is usable in authentic settings, and improves access without undermining the target skill.',
        [
          'Purchasing costly tools before a task-focused trial risks mismatch, abandonment, and wasted time when simpler or better-aligned supports might work more effectively.',
          'Universal usefulness does not disqualify an assistive technology support; under IDEA, the question is whether the individual student needs the tool for FAPE.',
          'A disability category does not guarantee that a particular tool fits a student’s specific tasks, skills, or environment; empirical trial data are needed to verify benefit.',
        ]
      ),
      q(
        'A school places every student with a particular disability in the same separate classroom. What is the central problem?',
        'A district assigns placement from disability category before reviewing individual needs. Which principle is violated?',
        'Placement must follow the individual IEP and LRE continuum rather than automatic category assignment.',
        [
          'Federal law prohibits school districts from maintaining separate special education classrooms for any student.',
          'Parents hold unilateral authority to select a student’s classroom setting outside the multidisciplinary IEP team.',
          'Once an initial classroom placement is documented in the IEP, the team cannot revise it during subsequent reviews.',
        ],
        'IDEA requires an individualized placement decision based on the IEP and least restrictive environment requirements. A continuum must be available, but no point on it is automatic for a category.',
        [
          'IDEA requires a full continuum of alternative placements—including separate settings when needed—so separate classes are permitted when individualized evidence justifies them.',
          'Parents are essential IEP team members, but placement is a collaborative team determination grounded in the IEP and LRE criteria rather than a unilateral decision.',
          'Placement under IDEA must be reviewed at least annually and updated whenever a student’s individualized needs or progress warrant a less or more supportive setting.',
        ]
      ),
      q(
        'Fluorescent glare and hallway noise interfere with a learner’s sustained work. Which response is most appropriate?',
        'A student’s participation improves in a low-distraction area with predictable sensory breaks. What should the team do?',
        'Document the conditions, provide individualized sensory supports, and monitor participation gains.',
        [
          'Suspend academic work expectations whenever environmental lighting or classroom noise makes the student uncomfortable.',
          'Adopt the identical low-distraction seating and break schedule as a standard prescription for every student with an IEP.',
          'Allow access to the low-distraction area and sensory breaks contingent on completing academic work without errors.',
        ],
        'Environmental adaptations should respond to documented sensory access needs and be evaluated by their effect on meaningful participation. They are access supports, not rewards or universal prescriptions.',
        [
          'Removing academic expectations lowers learning opportunity when targeted environmental adjustments allow the student to engage meaningfully with the same curriculum.',
          'Sensory needs vary widely across learners; applying one student’s environmental setup to everyone ignores individualized assessment and may hinder peers who thrive on movement or collaboration.',
          'Withholding an environmental access accommodation as an earned reward denies the support needed to initiate and sustain learning in the first place.',
        ]
      ),
    ],
  },
];
