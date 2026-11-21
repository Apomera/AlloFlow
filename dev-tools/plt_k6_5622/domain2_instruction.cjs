'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, INTASC, IES_GUIDES, IES_LEARNING, IES_DATA } = sources;

module.exports = [
  {
    id: 'standards-objectives-planning-resources',
    chapterId: 'plt5622-ch-05',
    domainId: 'instructional-process',
    domain: 'Instructional Process',
    label: 'Standards, Objectives, Planning, and Resources',
    references: [ETS, INTASC, IES_GUIDES],
    questions: [
      q(
        'What should a teacher do when unpacking a broad content standard for unit planning?',
        'A grade-level standard combines several concepts and practices. Which planning action best preserves its intent?',
        'Identify concepts, practices, cognitive rigor, mastery evidence, prerequisites, and lesson progression.',
        [
          'Copy the full state standard verbatim onto the daily board as the entire instructional activity plan.',
          'Gather engaging practice worksheets first and decide later which part of the standard they address.',
          'Select the simplest foundational noun in the standard and postpone complex practices until later units.',
        ],
        'Unpacking clarifies what learners must know and do and what evidence will demonstrate the standard without fragmenting away its intended rigor.',
        [
          'Copying a broad standard verbatim onto the board does not clarify prerequisite steps, lesson progression, or what observable mastery looks like.',
          'Choosing worksheets before defining target outcomes leads to fragmented classroom activities that miss the cognitive rigor of the standard.',
          'Isolating an easy recall topic strips away the disciplinary practices and higher-order thinking embedded in the full academic standard.',
        ]
      ),
      q(
        'Which objective is most observable and measurable for a lesson on comparing sources?',
        'A teacher writes that students will understand two accounts of an event. How should the objective be strengthened?',
        'Given two accounts, learners identify two similarities or differences and cite supporting source details.',
        [
          'By the end of the lesson, students will gain deeper appreciation for varied historical accounts of events.',
          'During independent work time, students will finish a two-page source-comparison worksheet before dismissal.',
          'Throughout the group read-aloud, students will listen attentively while classmates share ideas about both texts.',
        ],
        'A useful objective names the conditions, observable performance, important content, and sufficient criterion so instruction and assessment can align.',
        [
          'Appreciation is an unobservable internal disposition that cannot be measured consistently or used to design aligned formative classroom checks.',
          'Completing a worksheet names a classroom activity rather than the target conceptual skill or accuracy criterion demonstrating source comparison.',
          'Listening attentively describes general classroom compliance rather than observable analytical evidence that a learner compared two distinct accounts.',
        ]
      ),
      q(
        'Which plan demonstrates alignment among objective, learning activity, and assessment?',
        'Students must explain a scientific mechanism, but the planned test asks only for vocabulary matching. What revision is needed?',
        'Teach and practice building mechanism explanations, then score explanations with aligned reasoning criteria.',
        [
          'Keep the vocabulary matching test because selected-response items are faster and more consistent to grade.',
          'Rewrite the unit learning objective afterward so it matches the vocabulary matching format used on the quiz.',
          'Count active lab participation points during the week as sufficient proof of mechanism explanation mastery.',
        ],
        'Alignment requires learners to practice and demonstrate the knowledge and cognitive process named in the objective through a valid assessment task.',
        [
          'Scoring convenience cannot justify a construct mismatch; matching definitions does not show whether learners can explain a scientific mechanism.',
          'Downgrading the unit objective to fit an easier vocabulary quiz lowers curricular rigor rather than fixing the assessment misalignment.',
          'Lab participation points record general activity engagement rather than direct evidence that each learner can construct a valid causal explanation.',
        ]
      ),
      q(
        'How do scope and sequence differ in curriculum planning?',
        'A team is deciding both what content belongs in a year and the order in which ideas develop. Which distinction is correct?',
        'Scope defines content breadth and boundaries; sequence organizes a coherent developmental progression.',
        [
          'Scope sets the daily bell schedule order, while sequence tracks textbook purchasing and supply budgets.',
          'Scope and sequence both refer strictly to the summative blueprint used for end-of-year testing.',
          'Sequence lists required state topics alphabetically without considering prerequisite conceptual links.',
        ],
        'Curriculum scope defines what is included; sequence arranges learning so knowledge and skill can build coherently toward standards and transfer.',
        [
          'Scope concerns content breadth and boundaries—not daily bell schedules—while sequence concerns instructional progression rather than supply budgets.',
          'Both curriculum terms guide year-long instructional planning across connected units rather than referring narrowly to a final summative exam.',
          'An arbitrary alphabetical topic list ignores prerequisite dependencies and developmental progression essential for coherent conceptual sequencing across units.',
        ]
      ),
      q(
        'What is the best use of a brief preassessment before a new unit?',
        'A teacher needs to identify prerequisite knowledge and misconceptions before planning groups. Which use of evidence is strongest?',
        'Use low-stakes data to tailor entry points, scaffolds, groups, pacing, and extensions without grading.',
        [
          'Post preassessment scores on a wall chart so students see their starting rank compared with classmates.',
          'Exempt any student who answers a single preview item correctly from participating in the entire unit.',
          'Record the preassessment percentage in the grade book as part of the unit’s summative achievement score.',
        ],
        'Diagnostic evidence informs what learners already know and need next; it should guide responsive planning rather than high-stakes conclusions from a limited sample.',
        [
          'Publicly ranking learners before instruction begins creates stigma and anxiety without using diagnostic patterns to tailor classroom teaching.',
          'Answering one preview item accurately is too narrow a sample to verify full unit mastery or justify opting out of deeper extensions.',
          'Grading unlearned material before instruction penalizes prior background differences and undermines the low-stakes diagnostic purpose of preassessment.',
        ]
      ),
      q(
        'Which interdisciplinary unit design preserves the integrity of each subject?',
        'A team wants to connect science and writing through a common environmental question. What is the strongest plan?',
        'Name rigorous standards from each subject, link them authentically, and assess integrated and subject goals.',
        [
          'Organize engaging activities around a broad nature theme while omitting explicit subject-area standards.',
          'Score the shared environmental poster primarily on visual border neatness and creative color choices.',
          'Simplify the scientific concept slightly so it fits neatly into a familiar creative-story writing template.',
        ],
        'Interdisciplinary planning is more than a shared topic; it maintains meaningful disciplinary goals while using integration to deepen inquiry, communication, and transfer.',
        [
          'A thematic collection of activities without clear standards from both disciplines produces superficial coverage rather than deep conceptual learning.',
          'Grading decorative visual border layout assesses craft appearance instead of evaluating science accuracy or evidence-based writing quality.',
          'Distorting scientific accuracy to fit a writing template compromises disciplinary integrity and risks teaching enduring conceptual misconceptions.',
        ]
      ),
      q(
        'Which criterion should lead selection of a digital or print instructional resource?',
        'A popular app is visually attractive but has unclear alignment and inaccessible navigation. What should the teacher examine before adoption?',
        'Evaluate alignment, accuracy, rigor, accessibility, representation, privacy, and practical classroom fit.',
        [
          'Adopt the digital tool because several neighboring schools purchased licenses during the previous year.',
          'Assign student logins promptly without inspecting data-collection terms or privacy compliance policies.',
          'Rely on polished graphics, animations, and sound effects as reliable proof of strong instructional design.',
        ],
        'Resources are tools for a defined learning purpose and must be accurate, accessible, secure, developmentally appropriate, and usable in the actual instructional context.',
        [
          'Popularity among neighboring schools does not verify alignment to current objectives, accessibility for diverse learners, or empirical classroom effectiveness.',
          'Skipping privacy and data-governance review risks exposing sensitive student records and violating federal and local data-protection policies.',
          'Polished animations and graphics can mask weak alignment, distracting clutter, or inaccessible navigation barriers that hinder meaningful learning.',
        ]
      ),
      q(
        'When is remediation more appropriate than simple repetition?',
        'A student repeatedly misses fraction comparisons because prerequisite magnitude concepts are weak. What should the teacher do?',
        'Diagnose the missing prerequisite, teach explicitly with models and feedback, and check transfer.',
        [
          'Assign an additional packet of identical fraction comparison sheets without examining error patterns.',
          'Replace the grade-level fraction standard permanently with simpler whole-number computation drills.',
          'Move on to the next curriculum chapter because repeating practice problems did not raise quiz scores.',
        ],
        'Remediation responds to a diagnosed learning need by changing support and instruction, whereas unchanged repetition may reproduce the same barrier.',
        [
          'Repeating identical worksheets without diagnosing magnitude misconceptions causes learners to rehearse the exact same faulty rule over and over.',
          'Abandoning grade-level fraction goals permanently lowers expectations when targeted concrete-visual remediation can rebuild prerequisite magnitude understanding.',
          'Moving forward while core magnitude gaps remain unresolved compounds confusion and error rates in later proportional and algebraic units.',
        ]
      ),
      q(
        'What is the strongest starting point for backward unit planning?',
        'A teacher has collected engaging activities but cannot explain how they fit the unit goal. What should happen first?',
        'Clarify priority outcomes and acceptable evidence first, then sequence instruction, tasks, and checks.',
        [
          'Keep every favorite classroom activity on the calendar and draft an overarching unit goal afterward.',
          'Design bulletin boards and theme decorations first so the classroom environment builds excitement.',
          'Decide the final point weights and report-card curve before specifying what evidence shows mastery.',
        ],
        'Backward planning establishes intended results and valid evidence before choosing learning experiences, which improves coherence and protects time for priority learning.',
        [
          'Retrofitting goals onto pre-selected favorite activities creates activity-driven instruction that frequently drifts away from priority academic standards.',
          'Focusing on room decorations before clarifying desired learning outcomes and evidence puts surface aesthetics ahead of instructional coherence.',
          'Setting grading weights without first defining acceptable mastery evidence leaves classroom assessments untethered from clear learning criteria.',
        ]
      ),
      q(
        'How should a teacher decide whether content and examples are developmentally appropriate without reducing rigor?',
        'An elementary lesson uses an abstract context that learners cannot access. Which revision is strongest?',
        'Preserve the core concept while adding relevant contexts, visual models, clear language, and scaffolds.',
        [
          'Replace the challenging academic concept with an entertaining game unrelated to the unit standard.',
          'Leave the inaccessible abstract context unchanged so learners build resilience through hard struggle.',
          'Simplify the lesson to basic recall because developing learners are not ready for deep reasoning.',
        ],
        'Developmental responsiveness changes access, representation, pacing, and support while maintaining meaningful intellectual work and avoiding low expectations.',
        [
          'Substituting unrelated classroom entertainment sacrifices the essential learning target instead of making the rigorous academic idea genuinely accessible.',
          'Keeping an unnecessarily opaque abstract context creates construct-irrelevant student frustration rather than productive, well-scaffolded cognitive challenge during lessons.',
          'Underestimating learners’ reasoning capacity lowers academic rigor when concrete or visual entry points enable deep conceptual thinking.',
        ]
      ),
    ],
  },
  {
    id: 'methods-grouping-scaffolding-practice',
    chapterId: 'plt5622-ch-06',
    domainId: 'instructional-process',
    domain: 'Instructional Process',
    label: 'Instructional Methods, Grouping, Scaffolding, and Practice',
    references: [ETS, INTASC, IES_LEARNING, IES_GUIDES],
    questions: [
      q(
        'Which sequence best represents explicit instruction for a new multistep procedure?',
        'Students need a reliable strategy for solving unfamiliar word problems. What teaching sequence is strongest?',
        'State the goal, activate prior skills, model steps, guide practice with feedback, then release.',
        [
          'Assign independent word-problem sets first so students discover effective steps before any explanation.',
          'Deliver an uninterrupted verbal lecture covering all rules without pausing to check student responses.',
          'Demonstrate one single example at the board and immediately remove all visual cues and teacher hints.',
        ],
        'Explicit instruction makes the process and reasoning visible, elicits frequent responses, corrects errors, and gradually transfers responsibility through supported practice.',
        [
          'Assigning unassisted independent work before explicit modeling leaves learners practicing guesswork or entrenching faulty problem-solving habits.',
          'Lecturing without frequent checks for understanding hides conceptual confusion until systematic errors are already widespread across the class.',
          'Dropping all scaffolds after a single board model skips essential guided practice and corrective feedback needed for reliable transfer.',
        ]
      ),
      q(
        'When is inquiry instruction most likely to be productive in an elementary classroom?',
        'A teacher plans an investigation of erosion. Which condition best supports conceptual inquiry?',
        'Learners have accessible background knowledge, a clear question, prompts, evidence, and synthesis.',
        [
          'The hands-on exploration remains completely open-ended with no targeted scientific concept in mind.',
          'The teacher refrains from giving corrective prompts even when persistent misconceptions dominate lab talk.',
          'The teacher states every experimental result upfront before students handle materials or gather evidence.',
        ],
        'Inquiry supports knowledge construction when it is purposeful and guided, not when discovery is expected without the knowledge, prompts, tools, evidence, or consolidation needed.',
        [
          'Open-ended hands-on exploration without a target concept turns inquiry into unfocused tinkering rather than purposeful scientific knowledge building.',
          'Withholding strategic teacher guidance when misconceptions harden leaves learners drawing inaccurate scientific conclusions from messy lab observations.',
          'Revealing every experimental conclusion beforehand eliminates authentic investigation, evidence analysis, and active student meaning making during inquiry.',
        ]
      ),
      q(
        'Which feature is essential for cooperative learning rather than ordinary group seating?',
        'Four students share a table, but one completes all the reasoning. What should the teacher add?',
        'Design positive interdependence, individual accountability, teamwork skills, fair roles, and reflection.',
        [
          'Assign one shared group grade to the finished poster without checking what each member learned.',
          'Keep group roles fixed all semester so confident students lead reasoning while quiet peers decorate.',
          'Place desks into clusters and assume effective teamwork skills require no explicit modeling or review.',
        ],
        'Cooperative learning requires a task and structures that make members responsible to one another while preserving evidence of individual learning and participation.',
        [
          'A single shared group grade without individual accountability encourages unequal workload and hides whether every learner mastered the objective.',
          'Locking learners into fixed status roles restricts access to higher-order reasoning for peers who need structured leadership turns.',
          'Grouping desks physically does not produce true cooperation unless collaboration routines and equitable roles are explicitly taught and monitored.',
        ]
      ),
      q(
        'What is the strongest reason to use flexible rather than permanent ability grouping?',
        'Assessment evidence shows that student needs change across skills and over time. How should groups be organized?',
        'Form temporary skill-focused groups from current data, teach responsively, and regroup as needs shift.',
        [
          'Maintain initial fall reading and math group placements throughout the year for stable classroom routines.',
          'Assign students to identical ability tracks across every academic subject based on one global estimate.',
          'Keep the specific skill purpose of each small group private so students do not compare group tasks.',
        ],
        'Flexible grouping responds to a specific instructional need and changes with evidence, reducing the access and identity risks associated with static tracking.',
        [
          'Permanent year-long groups ignore uneven individual growth trajectories and trap developing learners inside static low-expectation instructional tracks.',
          'Using one global ability label across subjects overlooks distinct learner strengths and needs across reading, math, writing, and science.',
          'Making clear, temporary skill goals transparent helps learners understand what they are working on without attaching fixed ability labels.',
        ]
      ),
      q(
        'When should an instructional scaffold be faded?',
        'A student completes a task accurately with a graphic organizer and begins anticipating every prompt. What is the next step?',
        'Reduce support gradually while monitoring accuracy, strategy use, and transfer, adjusting if needed.',
        [
          'Eliminate the graphic organizer abruptly on the next graded unit without checking independent retention.',
          'Retain the full graphic organizer permanently across every future assignment so accuracy stays steady.',
          'Step in with heavier verbal hints whenever the student pauses for a few seconds to think through a step.',
        ],
        'Scaffolds should be contingent: enough to enable productive effort, then faded as learners internalize the process while performance remains monitored.',
        [
          'Abrupt scaffold removal without monitoring risks sudden performance breakdown if one intermediate step still needs temporary partial cueing.',
          'Leaving instructional scaffolds unchanged indefinitely builds unnecessary dependence instead of transferring strategic control to the learner.',
          'Jumping in immediately during brief productive thinking time interrupts learner self-regulation and increases ongoing adult prompt dependence.',
        ]
      ),
      q(
        'Which differentiation plan preserves a shared rigorous objective?',
        'Some students need language and organizational support for the same evidence-based explanation task. What should the teacher vary?',
        'Vary models, language scaffolds, grouping, pacing, and access supports while keeping core criteria.',
        [
          'Give advanced students extra unsupported worksheets of the same length while others finish core steps.',
          'Replace the evidence-based explanation task with simple coloring activities for students needing support.',
          'Apply separate grading criteria unrelated to evidence quality so everyone earns comparable marks.',
        ],
        'Differentiation responds to readiness and access through pathways and supports while maintaining clear worthwhile outcomes and valid expectations.',
        [
          'Assigning extra busywork volume rather than deeper conceptual complexity fails to differentiate meaningfully for learners ready for extension.',
          'Replacing rigorous explanation with coloring strips away grade-level thinking instead of scaffolding equitable access to the shared objective.',
          'Detaching grading standards from the target construct obscures actual learning evidence and lowers expectations across the classroom.',
        ]
      ),
      q(
        'Why should guided practice precede independent practice for a newly introduced complex skill?',
        'Students make systematic errors during the first examples of a new procedure. What should the teacher do?',
        'Elicit step-by-step responses, inspect thinking, give timely feedback, and guide extra examples.',
        [
          'Log initial practice errors silently in a notebook without interrupting students to clarify steps.',
          'Assign a longer independent homework sheet right away so students work out confusion through volume.',
          'Solve every remaining example alone at the board while the class watches quietly and takes notes.',
        ],
        'Guided practice gives the teacher evidence and gives learners supported retrieval, feedback, and correction before errors become established in independent work.',
        [
          'Recording systematic practice mistakes without timely corrective feedback allows procedural misconceptions to harden during early skill acquisition.',
          'Assigning heavy unguided homework before accurate performance is established simply gives learners more repetitions of the wrong procedure.',
          'Having the teacher work every example passively removes active student responding and hides whether learners can execute steps independently.',
        ]
      ),
      q(
        'What makes a think-aloud an effective cognitive model?',
        'A teacher wants to model how an expert notices confusion while reading. Which approach is strongest?',
        'Verbalize key cues, strategy choices, monitoring, and repair steps concisely, then guide rehearsal.',
        [
          'Narrate every passing personal thought aloud at length so students hear a realistic stream of consciousness.',
          'Display the clean final comprehension answer without showing how confusion was detected and resolved.',
          'Explain the monitoring strategy verbally from a slide without applying it directly to an authentic text.',
        ],
        'A think-aloud exposes otherwise invisible decision making and self-monitoring so learners can connect cues with strategies and later take control.',
        [
          'Rambling through unrelated personal thoughts creates extraneous cognitive load and obscures the specific decision cues learners need to imitate.',
          'Showing only a polished final answer hides the internal self-monitoring and repair decisions that make a think-aloud genuinely instructive.',
          'Describing a strategy abstractly without demonstrating it on real text leaves learners unsure how to execute it during reading.',
        ]
      ),
      q(
        'Which routine best teaches self-regulated learning rather than simple compliance?',
        'Students wait for the teacher to tell them whether their work is complete. What should the teacher add?',
        'Teach goal setting, strategy use, criteria checks, appropriate help seeking, and planned revision.',
        [
          'Place a completion sticker on finished pages without reviewing quality criteria with the learner.',
          'Direct every planning and checking step verbally so classroom routines stay brisk and error-free.',
          'Evaluate self-regulation primarily by counting quiet minutes spent looking at desk materials.',
        ],
        'Self-regulation coordinates goals, strategies, monitoring, feedback, reflection, and adjustment; it develops through modeling, guided use, and increasing learner ownership.',
        [
          'Giving completion stickers without explicit quality criteria reinforces rushing to finish rather than evaluating work accuracy and deep learning.',
          'Keeping all planning and monitoring decisions in teacher hands perpetuates dependence instead of building independent learner self-regulation.',
          'Counting quiet seat time measures outward classroom compliance rather than strategic goal setting, self-monitoring, and purposeful revision.',
        ]
      ),
      q(
        'Which practice schedule best supports durable learning and flexible retrieval?',
        'Students remember vocabulary on Friday but not several weeks later. What revision is most defensible?',
        'Use spaced cumulative retrieval with feedback, interleave choices, and revisit words across contexts.',
        [
          'Consolidate all vocabulary review into one extended Thursday cramming block before Friday’s quiz.',
          'Have students reread highlighted vocabulary lists silently multiple times as their main study routine.',
          'Set prior unit vocabulary aside after Friday’s test so new chapter terms receive undivided class time.',
        ],
        'Spacing, active retrieval, feedback, cumulative review, and varied application strengthen long-term access and help learners discriminate when knowledge applies.',
        [
          'Massed cramming boosts short-term Friday quiz scores but leads to rapid forgetting over subsequent weeks compared with spaced retrieval.',
          'Passive rereading creates an illusion of familiarity without requiring active memory retrieval or flexible contextual vocabulary application.',
          'Dropping prior unit vocabulary right after a single quiz prevents cumulative consolidation and weakens long-term academic retention.',
        ]
      ),
    ],
  },
  {
    id: 'questioning-communication-monitoring-reflection',
    chapterId: 'plt5622-ch-07',
    domainId: 'instructional-process',
    domain: 'Instructional Process',
    label: 'Questioning, Communication, Monitoring, and Reflection',
    references: [ETS, INTASC, IES_LEARNING, IES_DATA],
    questions: [
      q(
        'Why should a teacher deliberately provide wait time after asking a cognitively demanding question?',
        'A discussion includes only the fastest responders. Which teacher adjustment best broadens reasoning and participation?',
        'Pause adequately for processing, add a thinking structure, and invite varied learners to explain.',
        [
          'Supply the intended answer after one brief second so whole-class lesson pacing stays crisp and energetic.',
          'Call primarily on eager volunteers who raise their hands quickly so discussions stay accurate and smooth.',
          'Simplify demanding open questions to quick factual recall so more classmates can respond rapidly.',
        ],
        'Wait time and preparation structures increase opportunities to formulate responses, improve explanation, and make participation less dependent on rapid verbal processing.',
        [
          'Answering after one second cuts off deep cognitive processing and teaches learners to wait passively for teacher explanations.',
          'Relying on the quickest volunteers narrows classroom participation and leaves multilingual learners and reflective thinkers consistently unheard.',
          'Lowering questions to factual recall sacrifices higher-order reasoning when wait time and structured partner talk preserve rigor and broaden access.',
        ]
      ),
      q(
        'When is a closed question more useful than an open question?',
        'A teacher needs a rapid check of whether students can identify a key prerequisite before continuing. Which question type fits?',
        'Use a crisp closed check to sample the prerequisite, then follow with open probing of reasoning.',
        [
          'Ask open-ended debate questions exclusively across every minute of the lesson regardless of purpose.',
          'Pose a broad, unfocused prompt without clear criteria so learners can interpret the task in any direction.',
          'Accept one accurate spoken reply from a volunteer as clear proof that the entire class holds the prerequisite.',
        ],
        'Question form should match purpose: focused questions can check specific knowledge efficiently, while open and probing questions reveal reasoning, alternatives, and connections.',
        [
          'Using open debate questions for every purpose wastes instructional time when a crisp closed check can rapidly verify essential prerequisites.',
          'Vague unfocused prompts confuse learners and yield uninterpretable responses rather than diagnostic evidence of prerequisite mastery.',
          'Sampling one eager volunteer overlooks hidden misunderstandings held by quiet classmates who have not yet demonstrated the prerequisite.',
        ]
      ),
      q(
        'A student gives an incorrect but plausible answer during discussion. What response best supports learning and psychological safety?',
        'A misconception surfaces publicly in a mathematics conversation. What should the teacher do?',
        'Affirm the effort, probe reasoning, compare evidence, clarify the misconception, and invite revision.',
        [
          'Point out the flaw sharply in front of classmates so peers remember to avoid making the same error.',
          'Move past the comment silently and call on a high-performing student to announce the right solution.',
          'State briefly that the answer is wrong and advance to the next problem without exploring why it arose.',
        ],
        'Errors are diagnostic opportunities; respectful probing reveals the underlying idea, supports correction, and preserves a climate where learners can take intellectual risks.',
        [
          'Embarrassing a learner publicly undermines psychological safety and discourages classmates from sharing authentic thinking in future discussions.',
          'Skipping silently over a plausible misconception leaves the underlying error unexamined for both the speaker and peers who share it.',
          'Marking an answer wrong without probing thinking misses valuable diagnostic evidence and deprives the learner of an opportunity to revise.',
        ]
      ),
      q(
        'Which teacher explanation is most likely to be clear for a new elementary concept?',
        'Students appear confused by a long verbal explanation. What should the teacher change?',
        'Highlight core ideas, connect prior knowledge, use concrete models, check meaning, and refine.',
        [
          'Introduce formal academic jargon rapidly so learners hear precise disciplinary terminology from the start.',
          'Repeat the exact same verbal explanation more slowly and loudly until confused facial expressions fade.',
          'Include quirky contrasting stories that contradict key features of the concept to keep attention high.',
        ],
        'Clear communication manages cognitive demand, uses precise accessible language and representations, and relies on learner evidence rather than assuming the message was received.',
        [
          'Delivering dense academic jargon rapidly overloads working memory before learners anchor new terminology to concrete conceptual meaning.',
          'Repeating identical wording louder does not clarify a confusing explanation when a visual model or simpler analogy is needed.',
          'Presenting inaccurate or contradictory examples builds enduring misconceptions rather than sharpening essential boundaries of the target concept.',
        ]
      ),
      q(
        'Which check for understanding gives the teacher the most useful evidence during a lesson?',
        'After modeling, the teacher needs to decide whether the whole class is ready for independent work. What should happen?',
        'Elicit an aligned response from every learner, inspect error patterns, and decide the next move.',
        [
          'Ask the class whether everyone feels comfortable with the steps and look for nodding heads before release.',
          'Call on one confident student to solve a sample problem aloud as a proxy for whole-class readiness.',
          'Proceed directly into independent work and wait for the end-of-unit test to reveal lingering errors.',
        ],
        'An effective check is aligned, inclusive, interpretable, and actionable; it reveals more than self-reported confidence or one selected response.',
        [
          'Self-reported nodding often reflects politeness or overconfidence rather than verified ability to execute the target objective independently.',
          'One confident volunteer’s accurate spoken response cannot diagnose hidden misconceptions held across the rest of the classroom.',
          'Waiting for a summative unit exam delays feedback far too long to guide immediate classroom reteaching before independent practice.',
        ]
      ),
      q(
        'Half the class selects a distractor that reflects the same misconception. What is the best immediate instructional response?',
        'A formative check shows a coherent error pattern during guided practice. What should the teacher do next?',
        'Pause, probe the shared reasoning, reteach using a contrasting model, and recheck understanding.',
        [
          'Continue advancing through the lesson slides so the team stays aligned with the weekly pacing calendar.',
          'Log the formative check scores in the grade book, reveal the answer key, and assign independent practice.',
          'Re-administer the identical formative item without new modeling so students pay closer attention next try.',
        ],
        'Monitoring matters only when evidence changes instruction; a common misconception warrants focused diagnosis, responsive teaching, and another aligned check.',
        [
          'Pressing ahead strictly for pacing when half the class holds a shared misconception guarantees compounding errors in upcoming lessons.',
          'Simply announcing the correct letter without reteaching leaves the underlying conceptual flaw intact during independent work.',
          'Repeating the same item without changing instruction tests frustration rather than repairing the diagnosed classroom misunderstanding.',
        ]
      ),
      q(
        'Which question most directly promotes higher-order analysis of two historical accounts?',
        'Students have identified facts in two sources and are ready to analyze perspective. What should the teacher ask?',
        'How do purpose, audience, and evidence shape each portrayal, and what supports your conclusion?',
        [
          'Which publication year is printed beside the title heading at the top of each historical document?',
          'How many total paragraphs appear in the first historical account compared with the second reading?',
          'Can you copy the opening topic sentence verbatim from each passage onto your graphic organizer?',
        ],
        'Higher-order questions require learners to relate relevant evidence, criteria, perspectives, or concepts rather than merely retrieve an isolated visible detail.',
        [
          'Locating a printed publication year requires simple surface retrieval rather than analyzing author perspective, intended audience, or evidence.',
          'Counting total paragraphs measures surface text length without engaging historical reasoning or comparing differing author viewpoints.',
          'Copying opening sentences verbatim checks mechanical transcription rather than higher-order analysis of source perspective and evidence.',
        ]
      ),
      q(
        'How should a teacher use an unexpected but relevant student question as a teachable moment?',
        'A student observation reveals a productive connection outside the planned example. What is the strongest response?',
        'Weigh relevance and timing, explore or park the connection briefly, link to the goal, and keep focus.',
        [
          'Set the planned unit standards aside for the rest of the week to pursue every tangent students raise.',
          'Dismiss unplanned questions firmly during lessons so classroom discussions stay strictly on script.',
          'Log unexpected connections as off-task interruptions to protect quiet focus during direct instruction.',
        ],
        'A teachable moment is used purposefully when it deepens or applies intended learning without sacrificing safety, inclusion, or essential instructional coherence.',
        [
          'Abandoning core unit priorities for every tangent fragments curriculum coherence and leaves required learning objectives untaught.',
          'Shutting down relevant student curiosity discourages authentic inquiry and misses valuable connections that deepen conceptual understanding.',
          'Treating productive academic questions as off-task behavior penalizes intellectual engagement and harms a supportive learning climate.',
        ]
      ),
      q(
        'Which discussion move best demonstrates active listening and supports collective meaning making?',
        'Students state ideas but rarely respond to one another. What should the teacher model and prompt?',
        'Paraphrase the idea accurately, check intent, and invite peers to extend or test it with evidence.',
        [
          'Pivot immediately to a fresh question after each speaker finishes so more topics fit into the period.',
          'Evaluate every student comment right away as correct or incorrect before classmates have a chance to talk.',
          'Allow the loudest overlapping speakers to steer the conversation naturally without turn-taking prompts.',
        ],
        'Active listening checks understanding and makes ideas available for response; structured uptake turns parallel answers into evidence-based dialogue.',
        [
          'Jumping rapidly to unrelated questions produces disconnected classroom monologues rather than collaborative peer reasoning and evidence building.',
          'Immediate teacher evaluation funnels all talk back to the educator instead of building student-to-student uptake and evidence testing.',
          'Unstructured overlapping interruptions privilege dominant voices and exclude quieter or reflective peers from equitable collective meaning making.',
        ]
      ),
      q(
        'What is the strongest evidence base for reflecting on whether an instructional strategy worked?',
        'A lesson felt engaging, but the teacher is unsure whether the objective was learned equitably. What should be reviewed?',
        'Compare goals against student work, subgroup access, participation, fidelity, and other factors.',
        [
          'Rely on how smooth and enjoyable the lesson felt to teach as sufficient proof of strong impact.',
          'Credit every positive quiz gain directly to the new classroom strategy without checking other variables.',
          'Keep the lesson design unchanged next year because all scheduled materials were completed on time.',
        ],
        'Professional reflection connects a clear goal with multiple relevant evidence sources and identifies a testable next adjustment without causal overclaiming.',
        [
          'Teacher enjoyment and smooth pacing measure surface comfort rather than whether all learners equitably mastered the target objective.',
          'Attributing gains reflexively to one instructional move ignores prior knowledge, extra review, or subgroup access patterns shaping outcomes.',
          'Finishing scheduled materials tracks pacing coverage rather than verified student learning or equitable instructional effectiveness across groups.',
        ]
      ),
    ],
  },
];
