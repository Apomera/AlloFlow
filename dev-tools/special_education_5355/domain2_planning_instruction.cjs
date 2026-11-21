'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, IDEA_IEP, IDEA_IEP_REVIEW, IDEA_LRE, IDEA_PLACEMENT, IES_READING, IES_MATH, IES_BEHAVIOR } = sources;

module.exports = [
  {
    id: 'individualized-planning-transition',
    chapterId: 'sp5355-ch-04',
    domainId: 'planning-instruction-environment',
    domain: 'Effective Planning and Instruction and Productive Learning Environments',
    label: 'Individualized Planning, IEPs, LRE, and Transition',
    references: [ETS, IDEA_IEP, IDEA_IEP_REVIEW, IDEA_LRE, IDEA_PLACEMENT],
    questions: [
      q(
        'Which present-level statement best supports individualized planning?',
        'An IEP team needs a useful present-level statement for written expression. Which example is strongest?',
        'Across three writing samples, the student wrote a clear topic sentence twice and added supporting details once.',
        [
          'Compared with classmates across the grade level, the student performs significantly below expectations in writing.',
          'The student expresses reluctance during extended writing tasks and continues to need frequent encouragement from adults.',
          'Evaluation records document a specific learning disability in written expression affecting classroom writing assignments.',
        ],
        'Present levels should describe current, measurable academic or functional performance and how disability affects progress. Specific baseline evidence supports goal design and later comparison.',
        [
          'A broad grade-level comparison does not specify which writing skills are already mastered or which component needs targeted instruction and baseline tracking.',
          'Describing attitude or general need for encouragement provides subjective impressions rather than objective, measurable baseline data tied to curriculum tasks.',
          'Restating the eligibility classification tells the team nothing about current performance levels, baseline strengths, or measurable starting points for annual goals.',
        ]
      ),
      q(
        'Which draft annual IEP goal is written in measurable terms?',
        'A team is revising a vague reading goal. Which replacement is most measurable?',
        'Given a 150-word instructional passage, the student will read 120 correct words per minute on three consecutive probes.',
        [
          'With continued special education reading instruction, the student will demonstrate stronger oral reading fluency by spring.',
          'During daily small-group literacy lessons, the student will sustain consistent effort while reading grade-level passages aloud.',
          'Across independent classroom reading blocks, the student will develop greater confidence and enjoyment when reading narrative text.',
        ],
        'A measurable annual goal states the condition, observable behavior, criterion, and often a consistency requirement. These features permit repeated progress measurement and instructional decisions.',
        [
          'Stating that the student will demonstrate stronger fluency omits the condition, observable metric, and mastery criterion needed to judge whether the goal has been met.',
          'Sustaining effort is an inferred internal state rather than a measurable reading skill with an objective accuracy, rate, or consistency standard.',
          'Confidence and enjoyment are valuable dispositions, but they do not specify an observable academic behavior or quantifiable criterion for IDEA progress monitoring.',
        ]
      ),
      q(
        'An IEP contains a measurable goal but no description of how progress will be measured. What is missing?',
        'A family asks how the team will know whether an annual math goal is being achieved. What must the IEP specify?',
        'The measurement method and schedule for periodic progress reports.',
        [
          'A written assurance that the school will bring the student to mastery before the next annual review.',
          'Weekly normative charts ranking the student’s score against every nondisabled classmate in the grade.',
          'A separate disability classification listing each academic subskill that requires targeted remediation.',
        ],
        'IDEA requires the IEP to describe how progress toward annual goals will be measured and when periodic reports will be provided. A goal without a monitoring plan is incomplete for decision making.',
        [
          'IDEA requires an appropriately ambitious, individualized program and progress tracking, not a legal guarantee of specific end-of-year achievement outcomes.',
          'Progress reporting tracks the individual student’s growth against annual IEP criteria rather than issuing weekly peer rankings against classmates.',
          'IEPs link goals to present levels and measurable skills without assigning a new eligibility category for every individual academic deficit.',
        ]
      ),
      q(
        'A student’s goal targets independent paragraph planning, but the service description addresses only oral reading. What should the team do?',
        'An IEP goal addresses functional communication, while listed services contain no communication instruction or support. What is the best response?',
        'Align specially designed instruction, related services, supports, and monitoring with the stated goal.',
        [
          'Leave the service grid unchanged because annual IEP goals and service minutes are developed as independent sections.',
          'Remove the unaligned annual goal from the draft IEP so the documented need matches the existing service schedule.',
          'Substitute a standard district service package associated with the student’s primary eligibility category instead.',
        ],
        'IEP components should form a coherent program: present needs lead to measurable goals, services and supports address those goals, and progress measures show whether the program is effective.',
        [
          'IDEA requires internal coherence across present levels, annual goals, and services; leaving a goal unsupported by instruction or services renders the IEP defective.',
          'Deleting a documented goal to fit an existing schedule ignores an identified student need rather than designing services around the learner.',
          'Applying a category-based service template violates individualized planning and still fails to ensure instruction targets the student’s specific documented skill need.',
        ]
      ),
      q(
        'A student is allowed to use a calculator on a test that measures multistep problem solving, not computation. This is best described as what?',
        'A learner receives extended time on a reading-comprehension assessment when speed is not the target. What kind of change is this?',
        'An accommodation altering access or response conditions without changing the target construct.',
        [
          'A curricular modification that lowers the grade-level performance expectation being evaluated on the task.',
          'An alternate assessment pathway assigned whenever a student qualifies for special education services.',
          'A restrictive placement determination that shifts how instructional minutes are delivered across settings.',
        ],
        'An accommodation changes how a learner accesses or responds while preserving what is measured. A modification changes the expected content, complexity, or performance standard.',
        [
          'A modification alters the learning target or content standard itself, whereas here the intended construct—problem solving or comprehension—remains fully intact.',
          'Alternate assessments are reserved for a small group of students with the most significant cognitive disabilities, not used for standard access adjustments.',
          'Placement decisions concern where educational services occur along the LRE continuum rather than how a student accesses or responds to an assessment.',
        ]
      ),
      q(
        'During IEP development, when should assistive technology be considered?',
        'A student has difficulty accessing grade-level text and producing written responses. What is the team’s AT responsibility?',
        'Consider at every IEP review whether assistive technology devices or services are needed for the student.',
        [
          'Defer assistive technology consideration until low-technology classroom strategies have been documented as unsuccessful for a year.',
          'Limit assistive technology planning to devices that the student’s family has purchased and brought from home.',
          'Reserve assistive technology consideration for students whose primary eligibility involves physical or sensory impairments.',
        ],
        'IDEA requires the IEP team to consider whether the child needs assistive technology. Consideration is individualized and task-based; it is not restricted to a disability type or private purchase.',
        [
          'IDEA treats assistive technology as a mandatory special factor in IEP development and does not require a year-long wait or documented failure of low-tech supports first.',
          'Public agencies must provide required assistive technology devices and services at no cost when needed for FAPE, regardless of whether families own personal equipment.',
          'Students across disability categories—including learning, language, and executive-function disabilities—may require assistive technology for text access, writing, or organization.',
        ]
      ),
      q(
        'Which information must the IEP team consider during development?',
        'A team is drafting an IEP primarily from test deficits. Which additional information must be considered?',
        'The student’s strengths, parent concerns, evaluation results, and academic, developmental, and functional needs.',
        [
          'Standardized subtest weaknesses that fall furthest below national grade-level averages on the evaluation report.',
          'Existing intervention blocks, staff schedules, and instructional programs currently open within the student’s home school.',
          'The special educator’s preferred curriculum sequence and service delivery model from the prior academic year.',
        ],
        'Federal IEP requirements direct the team to consider strengths, parent concerns, evaluation results, and the child’s academic, developmental, and functional needs rather than start from a preset service menu.',
        [
          'Focusing strictly on deficit scores omits learner strengths, family priorities, and everyday functional needs that IDEA explicitly requires the team to weigh.',
          'Basing the IEP on pre-existing building schedules or available slots puts administrative convenience ahead of the student’s individualized educational needs.',
          'Starting from a provider’s preferred program rather than multidisciplinary evaluation data and parent input undermines individualized, team-based IEP development.',
        ]
      ),
      q(
        'A student can make progress in general education with supplementary aids, but the team prefers a separate class because scheduling is easier. What should govern placement?',
        'A school proposes a more restrictive setting because staff assignments are convenient. What is the correct placement principle?',
        'Base placement on the IEP and LRE, asking whether general education succeeds with supplementary aids.',
        [
          'Prioritize building-wide staffing schedules and master-schedule efficiency when selecting special education settings.',
          'Match classroom placement directly to the student’s primary IDEA eligibility category across the district.',
          'Assign the classroom that houses the greatest concentration of specialized materials regardless of individualized need.',
        ],
        'Placement is individually determined, based on the IEP, and as close as possible to the child’s home. Removal from regular education occurs only when education there cannot be achieved satisfactorily with supports.',
        [
          'Administrative and scheduling convenience cannot justify removing a student from general education when supplementary aids and services support satisfactory progress.',
          'Category-based placement violates IDEA’s mandate to determine placement individually from the student’s IEP along the least restrictive environment continuum.',
          'Placing a student in a more restrictive room simply because specialized equipment is stored there ignores whether needed aids can be brought into the general education setting.',
        ]
      ),
      q(
        'Under the federal IDEA baseline, by when must transition content begin in the IEP unless the team determines an earlier age is appropriate?',
        'A team asks when federal IDEA requires measurable postsecondary goals and transition services to appear. What is the correct baseline?',
        'No later than the first IEP in effect when the student turns 16, updated annually, or earlier if appropriate.',
        [
          'During the first semester of the student’s senior year of high school, shortly before graduation planning begins.',
          'Starting on the student’s eighteenth birthday once the age of majority transfers educational rights to the student.',
          'Following the student’s formal acceptance into a postsecondary training program, college, or paid employment setting.',
        ],
        'The federal IDEA baseline begins no later than the first IEP in effect at age 16, with annual updates, and permits earlier planning. States may impose an earlier requirement, so current local rules also matter.',
        [
          'Waiting until senior year violates IDEA’s age-16 baseline and leaves far too little time to align courses of study, transition services, and agency linkages.',
          'Federal law sets age 16—not age 18—as the latest baseline for transition services (with many states setting an even earlier age such as 14), distinct from age-of-majority rules.',
          'Transition planning is designed to prepare the student to reach postsecondary education, employment, or independent living goals rather than beginning after placement is secured.',
        ]
      ),
      q(
        'Which transition goal is based on an age-appropriate transition assessment?',
        'A student’s interest inventory and job-shadow evaluation show a sustained interest and skill in culinary work. Which postsecondary goal is strongest?',
        'After high school, the student will enroll in a culinary certificate program and pursue food-service employment.',
        [
          'Before completing high school, the student will spend time exploring general career fields that seem interesting.',
          'During the upcoming academic year, the student will pass every required core subject needed for graduation.',
          'Across school routines, the student will demonstrate courteous, cooperative workplace behavior with peers and teachers.',
        ],
        'Measurable postsecondary goals describe intended outcomes after high school in education or training, employment, and when appropriate independent living, and they are grounded in age-appropriate transition assessment.',
        [
          'Exploring careers sometime during high school describes a vague in-school activity rather than a measurable post-high-school outcome tied to culinary assessment data.',
          'Passing current courses is an in-school academic benchmark—not a postsecondary goal specifying education, training, or employment after exiting high school.',
          'Demonstrating appropriate school behavior is a general school expectation that lacks both a post-high-school timeframe and alignment to the culinary assessment results.',
        ]
      ),
      q(
        'What distinguishes an IFSP emphasis from a school-age IEP emphasis at a high level?',
        'A candidate compares early-intervention IFSP planning with school-age IEP planning. Which statement is most accurate?',
        'An IFSP is family-centered for natural early-intervention environments, while an IEP directs school-age education.',
        [
          'An IFSP and an IEP follow identical documentation rules, differing primarily in the name used for younger children.',
          'An IFSP centers strictly on clinical child milestones while keeping family routines and priorities outside the plan.',
          'An IEP is a physician-authored medical treatment plan, whereas an IFSP is written by school district administrators.',
        ],
        'IFSP and IEP requirements differ by age, system, and focus. For this exam, the key distinction is family-centered early intervention and natural environments versus the school-age educational program.',
        [
          'IFSPs under IDEA Part C and IEPs under Part B differ substantively in service coordination, review frequency, family outcomes, and natural-environment emphasis, not just title.',
          'Family resources, priorities, and concerns are central to an IFSP because Part C early intervention strengthens the family’s capacity to support infant and toddler development.',
          'An IEP is an educational plan developed by a school-based multidisciplinary team including parents—not a medical prescription written by a physician.',
        ]
      ),
    ],
  },
  {
    id: 'explicit-instruction-curriculum-access',
    chapterId: 'sp5355-ch-05',
    domainId: 'planning-instruction-environment',
    domain: 'Effective Planning and Instruction and Productive Learning Environments',
    label: 'Explicit Instruction and Curriculum Access',
    references: [ETS, IES_READING, IES_MATH],
    questions: [
      q(
        'A teacher introduces a new strategy by naming it, modeling a think-aloud, guiding several examples, checking responses, and then assigning independent practice. What approach is this?',
        'Which lesson sequence best illustrates explicit and systematic instruction?',
        'Model the strategy, guide structured practice with feedback, and release to independent practice.',
        [
          'Open-ended discovery exploration in which students invent their own procedures before seeing any teacher demonstration.',
          'Continuous adult prompting throughout every class assignment so students do not risk making an independent mistake.',
          'Repeated independent worksheet drills that assign the same problems daily without modeling or step-by-step feedback.',
        ],
        'Explicit instruction makes the target and thinking visible, sequences examples, elicits frequent responses, provides feedback, and transfers responsibility as learners demonstrate readiness.',
        [
          'Unassisted discovery omits clear modeling and guided feedback, which often leaves learners with disabilities confused or practicing inefficient strategies.',
          'Maintaining permanent adult prompts prevents transfer of responsibility and fosters prompt dependence rather than building independent mastery.',
          'Unstructured repetition without explicit modeling or corrective feedback reinforces errors instead of teaching the underlying strategy step by step.',
        ]
      ),
      q(
        'A learner is acquiring a multistep hand-washing routine. What is the purpose of task analysis?',
        'A student is learning to use a school copier independently. Why would the teacher begin with a task analysis?',
        'Break the routine into observable, teachable steps that can be prompted, tracked, and chained.',
        [
          'Estimate the student’s overall intellectual functioning by comparing routine speed against same-age norms.',
          'Standardize the routine so every environmental variation is removed from school and community settings.',
          'Replace hands-on functional skill instruction with a written multiple-choice test of sequential steps.',
        ],
        'Task analysis identifies the component steps and their sequence. The teacher can then select a chaining approach, teach missing steps, record performance, and fade prompts toward independence.',
        [
          'Task analysis is an instructional design tool for sequencing behaviors, not a psychometric instrument for measuring cognitive ability or intelligence.',
          'Good task-analytic instruction still plans for natural variations across sinks, copiers, or settings so the routine generalizes beyond one exact setup.',
          'A written test measures verbal recall of steps rather than building fluent physical execution of the functional routine in authentic contexts.',
        ]
      ),
      q(
        'A student solves equations accurately with a step card. What should happen next?',
        'A learner independently uses a paragraph organizer on four consecutive assignments. How should the scaffold change?',
        'Fade or simplify the scaffold gradually while monitoring whether independent accuracy holds.',
        [
          'Withdraw the entire scaffold abruptly on the next graded unit and discontinue tracking accuracy data.',
          'Keep the full step card or organizer in place indefinitely so the student never experiences reduced support.',
          'Raise task complexity and add heavier adult prompting simultaneously without checking baseline transfer.',
        ],
        'Scaffolds are temporary supports. Planned fading based on performance data promotes independence while monitoring guards against removing the support faster than the learner can maintain success.',
        [
          'Abrupt removal without ongoing data monitoring risks sudden performance breakdown and leaves the teacher unable to tell which step still needs fading.',
          'Leaving temporary instructional scaffolds unchanged after consistent mastery prevents the learner from building autonomous self-regulation and generalized independence.',
          'Changing task complexity and prompt levels at the same time confounds performance data and moves away from independent use rather than toward it.',
        ]
      ),
      q(
        'Which lesson design best reflects Universal Design for Learning?',
        'A teacher is planning a unit for learners with varied language, sensory, and executive-function needs. Which design is most consistent with UDL?',
        'Set a clear goal, anticipate barriers, and build purposeful options for engagement, representation, and expression.',
        [
          'Write a separate simplified learning objective for each student before launching the grade-level unit.',
          'Add varied decorative themes and unrelated activity choices so every lesson feels visually lively and novel.',
          'Deliver one uniform lesson format first and design access alternatives after students struggle on the unit quiz.',
        ],
        'UDL is proactive design around a common, clear goal. Options are selected because they reduce predictable barriers while preserving the intended learning target, not merely because they add variety.',
        [
          'Lowering objectives proactively undermines UDL’s core premise of maintaining rigorous, clear goals while offering flexible pathways and supports to reach them.',
          'Superficial variety unrelated to predictable access barriers can add distraction and executive-function load without improving meaningful learning.',
          'Waiting for failure before adding access options is reactive remediation rather than proactive Universal Design built into the lesson from the start.',
        ]
      ),
      q(
        'A student guesses unfamiliar words from pictures. Which instructional response best targets decoding?',
        'A learner reads known words but cannot sound out unfamiliar regular words. What should instruction emphasize?',
        'Explicit, cumulative practice linking phonemes to graphemes and blending them to decode words.',
        [
          'Increasing daily silent reading minutes with self-selected books while avoiding direct word-level intervention.',
          'Coaching the student to inspect story illustrations closely before attempting unfamiliar words in text.',
          'Encouraging the student to skip unknown words and infer their identity from surrounding sentence context.',
        ],
        'Decoding instruction makes sound-symbol relationships and blending procedures explicit, provides cumulative guided practice, and gives immediate corrective feedback rather than relying on guessing.',
        [
          'Additional silent reading without explicit phonics instruction does not teach sound-symbol mapping or blending and allows inaccurate guessing habits to continue.',
          'Relying on picture cues reinforces the very guessing strategy that breaks down as texts become more complex and less illustrated.',
          'Context guessing is unreliable for accurate word identification and deprives the learner of systematic decoding skills needed for unfamiliar regular words.',
        ]
      ),
      q(
        'A student reads accurately but slowly and without phrasing. Which practice is best matched to the need?',
        'A learner’s word reading is accurate, but oral reading is labored. What is the strongest fluency support?',
        'Modeled and repeated oral reading of appropriate-level text with feedback on rate and phrasing.',
        [
          'Independent reading of substantially harder above-grade-level texts to stretch stamina and reading pace.',
          'Having the student copy glossary definitions into a notebook before beginning each classroom reading passage.',
          'Replacing oral and print reading practice with recorded audio books across all future literacy blocks.',
        ],
        'Fluency practice should use text at an appropriate level, a model of fluent reading, repeated opportunities, and feedback. It builds automaticity and prosody without confusing speed with comprehension.',
        [
          'Assigning frustration-level text increases decoding strain and cognitive overload, slowing rate further and undermining phrasing and confidence.',
          'Copying vocabulary definitions into a notebook does not build automatic word recognition, expressive prosody, or smooth connected-text reading fluency.',
          'Although audio provides helpful content access, permanently abandoning print reading practice prevents the student from building independent reading fluency.',
        ]
      ),
      q(
        'A learner can decode a passage but cannot explain its meaning. Which instruction is most appropriate?',
        'A student reads content-area text accurately yet misses causal relationships. What should the teacher do?',
        'Explicitly model a comprehension strategy, guide text-based practice, and require evidence-based explanations.',
        [
          'Shift reading intervention time back to isolated letter-sound correspondence and phonics blending drills.',
          'Provide a printed summary of the passage answers before the student begins reading the assigned selection.',
          'Administer additional graded comprehension quizzes without modeling how to track meaning across paragraphs.',
        ],
        'Accurate decoding does not guarantee comprehension. Explicit modeling and guided use of a relevant strategy—such as identifying cause and effect, summarizing, or monitoring meaning—targets the observed need.',
        [
          'Because decoding is already accurate, returning to basic letter-sound drills misses the documented comprehension barrier and wastes instructional time.',
          'Supplying the answers upfront bypasses cognitive processing and prevents the student from learning how to extract meaning and causal links independently.',
          'Repeatedly testing comprehension without teaching an explicit strategy measures the deficit repeatedly without giving the learner tools to fix it.',
        ]
      ),
      q(
        'A student is learning subtraction with regrouping but treats each digit independently. Which representation sequence is most helpful?',
        'A learner does not understand why ten ones can be exchanged for one ten. Which instructional sequence is strongest?',
        'Link concrete base-ten models to visual drawings, then explicitly connect both to the written algorithm.',
        [
          'Assign daily flashcards and step memorization drills until the student recites the borrowing procedure quickly.',
          'Start instruction with timed computational fluency sprints before introducing visual or manipulative models.',
          'Pause subtraction instruction and rotate to an unrelated math topic until number sense develops naturally.',
        ],
        'Concrete and visual representations can make place-value exchanges visible. Explicitly connecting each representation to mathematical symbols supports conceptual understanding and accurate procedural use.',
        [
          'Rote memorization of procedural steps without place-value understanding leaves underlying misconceptions intact and leads to systematic regrouping errors.',
          'Timed drills prior to conceptual mastery amplify anxiety and reinforce flawed digit-by-digit habits rather than clarifying why ten ones equal one ten.',
          'Rotating away from subtraction without concrete, visual, and symbolic instruction leaves the underlying place-value regrouping misconception unresolved for later units.',
        ]
      ),
      q(
        'A teacher sees that a student repeatedly subtracts the smaller digit from the larger digit regardless of position. What feedback is best?',
        'A learner consistently reverses numerator and denominator when forming ratios. What should the teacher do first?',
        'Pinpoint the error pattern, model the governing rule, and guide correction on a closely matched example.',
        [
          'Record the total percentage score on the paper and assign an extra worksheet of similar practice problems.',
          'Offer encouraging praise for neat work and effort while leaving the recurring procedural error unaddressed.',
          'Write the correct final answer beside each missed problem without explaining the rule or prompting correction.',
        ],
        'Error analysis reveals the misconception driving repeated errors. Specific feedback and a guided comparison help the learner revise the rule, after which new examples can test whether the correction transfers.',
        [
          'Assigning more unguided practice after giving only a total score causes the student to rehearse and entrench the exact same systematic misconception.',
          'Effort praise without corrective mathematical feedback leaves the learner unaware of the rule violation and unsure how to change future problem solving.',
          'Supplying correct answers without explanation or active student correction does not repair the underlying conceptual error or verify transfer.',
        ]
      ),
      q(
        'When is flexible grouping most appropriate?',
        'A teacher wants groups that respond to changing skill needs rather than fixed labels. What should guide grouping?',
        'Form temporary groups using current performance data and lesson purpose, then regroup as skills shift.',
        [
          'Assign students to year-long instructional reading groups organized by their special education eligibility category.',
          'Group classmates according to informal teacher impressions of classroom motivation and work habits.',
          'Keep initial fall small-group rosters unchanged through spring to maintain predictable seating and save prep time.',
        ],
        'Flexible grouping is purposeful and temporary. Recent performance, task goals, and needed intensity guide membership, and ongoing evidence indicates when students should move or the group focus should change.',
        [
          'Grouping by eligibility label ignores individual skill profiles, lowers instructional precision, and creates unnecessary segregation within the classroom.',
          'Perceived motivation is subjective and does not identify which specific academic skills or scaffolds learners need during a given lesson.',
          'Static year-long groups ignore student growth and prevent learners from moving up or receiving targeted reteaching as formative data evolve.',
        ]
      ),
      q(
        'A student rushes through multistep work without checking. Which metacognitive support is best?',
        'A learner completes a strategy correctly during modeling but does not monitor independent work. What should the teacher add?',
        'Model a brief plan-do-check think-aloud with a self-questioning cue that fades as use stabilizes.',
        [
          'Double the length of independent assignments so the student has more opportunities to notice careless mistakes.',
          'Have an instructional aide inspect and correct every intermediate step before the student moves forward.',
          'Remind the student verbally at the start of each period to slow down and double-check every answer carefully.',
        ],
        'Metacognitive instruction makes planning, monitoring, and evaluation visible. A concise self-questioning routine gives the learner an actionable process and can be faded as self-regulation develops.',
        [
          'Adding more unguided problems without teaching a monitoring routine increases fatigue and reinforces rushing rather than building self-checking habits.',
          'Adult step-by-step correction shifts monitoring responsibility onto the aide and prevents the student from internalizing independent error checking.',
          'A general reminder to be careful does not give the learner a concrete, teachable procedure for planning, monitoring, and verifying multistep work.',
        ]
      ),
    ],
  },
  {
    id: 'behavior-environments-engagement',
    chapterId: 'sp5355-ch-06',
    domainId: 'planning-instruction-environment',
    domain: 'Effective Planning and Instruction and Productive Learning Environments',
    label: 'Behavior, Engagement, and Productive Environments',
    references: [ETS, IES_BEHAVIOR, IDEA_IEP_REVIEW],
    questions: [
      q(
        'A class loses instructional time because arrival routines change each day. Which preventive support is best?',
        'Students frequently ask what to do during the first ten minutes of class. What should the teacher establish?',
        'Teach, model, practice, and visually post a concise arrival routine, then reinforce consistent use.',
        [
          'Wait for off-task behavior during arrival and issue progressively firmer disciplinary consequences for delays.',
          'Post a comprehensive twenty-rule classroom contract on the bulletin board without rehearsing entry expectations.',
          'Vary arrival directions each morning so students learn to adapt rapidly to unpredictable classroom procedures.',
        ],
        'Predictable routines reduce ambiguity and increase available learning time. Expectations become useful when they are explicitly taught, practiced in context, prompted as needed, and reinforced consistently.',
        [
          'Relying on escalating consequences punishes confusion caused by unclear routines instead of proactively teaching students what to do on entry.',
          'A dense posted rule list without modeling, guided practice, or feedback rarely translates into smooth daily behavior, especially for learners with executive-function needs.',
          'Frequent unpredictable routine changes create ambiguity and transition friction, reducing instructional time rather than building self-regulation.',
        ]
      ),
      q(
        'A student tears worksheets after receiving a long independent assignment, and the task is then removed. Which information is most relevant to a functional hypothesis?',
        'A learner shouts during difficult writing tasks and is sent to the hallway each time. What pattern should the team examine?',
        'The antecedent demand, observable behavior, and resulting escape or delay from the task.',
        [
          'Trait-based personality inventories estimating whether the student prefers independent or social school tasks.',
          'Anecdotal staff ratings describing how frustrating the student’s behavior feels during whole-class instruction.',
          'A standard schoolwide discipline chart listing consequences previously assigned to classmates for similar incidents.',
        ],
        'Functional assessment examines relationships among antecedents, observable behavior, and consequences. Repeated removal of a difficult task may maintain behavior through escape, a hypothesis that must be tested with data.',
        [
          'Personality labels describe broad internal traits rather than observable environmental contingencies that trigger and maintain a specific classroom behavior.',
          'How annoying a behavior feels to adults reflects observer reactions, not the functional antecedent-behavior-consequence relationship maintaining the student’s response.',
          'Standard disciplinary charts list punitive options rather than identifying whether removing the assignment or sending the student out is negatively reinforcing the behavior.',
        ]
      ),
      q(
        'An FBA suggests that disruption reliably produces peer attention. Which BIP component is most important?',
        'Data indicate that calling out is maintained by adult interaction. Which intervention is best aligned with function?',
        'Teach and reinforce an appropriate attention-requesting skill while altering maintaining triggers and responses.',
        [
          'Apply a generic loss-of-privilege consequence that does not address how attention is delivered in class.',
          'Suspend group academic instruction for the student until calling out or disruption stops for a full month.',
          'Teach the student to request quiet hallway breaks even though FBA data point to attention rather than escape.',
        ],
        'A function-based plan should prevent predictable triggers, teach a socially appropriate replacement that serves the same function, and arrange consequences so the replacement is more efficient and successful.',
        [
          'Unaligned punishment fails to teach a socially acceptable way to access attention and often increases escalation or covert disruption.',
          'Removing academic instruction restricts educational access and does not equip the learner with an appropriate communication skill for seeking attention.',
          'Teaching an escape-oriented break request mismatches the documented attention function, making the replacement unlikely to compete with the problem behavior.',
        ]
      ),
      q(
        'Which replacement behavior is best for a student who leaves work to escape confusing directions?',
        'A learner crumples assignments when the first step is unclear. Which replacement skill is most functionally equivalent?',
        'Use a taught help card to ask for clarification or a brief guided start on the first step.',
        [
          'Sit quietly at the desk without speaking or signaling until the instructional period ends.',
          'Raise a hand to share an unrelated personal story with classmates whenever frustration builds.',
          'Put away the confusing assignment and transition independently to a preferred classroom center.',
        ],
        'A replacement behavior must be teachable, efficient, and serve the same function as the problem behavior. Requesting clarification addresses escape from confusion while keeping the learner engaged in the task.',
        [
          'Sitting silently leaves the confusion unresolved and still results in work avoidance without teaching an active self-advocacy skill.',
          'Seeking peer social attention serves an attention function rather than resolving aversive confusion about the assignment directions.',
          'Switching to a preferred activity reinforces full task escape without addressing the unclear directions or supporting academic progress.',
        ]
      ),
      q(
        'A teacher says, “You opened your notebook and began within one minute—that followed our start routine.” Why is this feedback effective?',
        'Which acknowledgment best strengthens an expected transition behavior?',
        'It gives prompt, behavior-specific feedback linking the observable action to the taught routine.',
        [
          'It highlights an innate personal strength rather than naming the student’s specific classroom action.',
          'It accumulates general approval points to be reviewed during a summary conference at month’s end.',
          'It compares the student’s starting speed favorably against slower classmates in the same row.',
        ],
        'Behavior-specific praise names the observable action and its connection to an expectation. Immediate, contingent feedback helps learners identify what to repeat and is more informative than global approval.',
        [
          'Global trait praise does not clarify which observable behavior met the classroom expectation, making it less effective for strengthening routines.',
          'Delayed feedback loses its immediate contingency link to the transition behavior and provides far weaker reinforcement during skill acquisition.',
          'Publicly comparing students against classmates can breed resentment, anxiety, or embarrassment rather than reinforcing clear, self-referenced expectations.',
        ]
      ),
      q(
        'A teacher wants to increase engagement during review. Which change is most likely to help?',
        'During a long lecture, only one student responds every several minutes. What is the best instructional adjustment?',
        'Embed frequent, varied opportunities for all students to respond with brief corrective feedback.',
        [
          'Extend the uninterrupted teacher explanation while saving student questions for the final five minutes.',
          'Call primarily on the fastest volunteer so review pacing stays brisk and error-free for the group.',
          'Assign extra silent review packets after class whenever whole-group participation appears sluggish.',
        ],
        'Frequent opportunities to respond—such as response cards, partner rehearsal, brief writing, or choral responses—produce active practice and give the teacher information for immediate adjustment.',
        [
          'Longer passive lecture reduces active engagement further and deprives the teacher of timely formative checks on student understanding.',
          'Calling on one rapid volunteer leaves most learners passive and masks misconceptions among students who need more processing time.',
          'Using extra review work as a consequence pairs academic practice with punishment and fails to improve active engagement during instruction.',
        ]
      ),
      q(
        'A student avoids beginning writing when only one topic is assigned. Which low-intensity support may increase agency without changing the target?',
        'A learner engages more consistently when allowed to choose the order of two required tasks. What principle is illustrated?',
        'Offer bounded instructional choices among options that all target the same learning goal.',
        [
          'Allow the student to opt out of written assignments whenever initial task motivation is low.',
          'Provide completely open-ended choices with no structure, criteria, or defined classroom expectations.',
          'Substitute a lower-grade academic standard so the student can finish faster with minimal effort.',
        ],
        'Instructional choice can increase engagement and agency when each option remains aligned to the same goal. Bounded choices are clear enough to avoid adding executive-function demands.',
        [
          'Letting the student skip the learning target reinforces avoidance and undermines progress toward essential grade-level and IEP writing skills.',
          'Unbounded open-ended choices can overwhelm learners with executive-function needs and drift away from the intended instructional objective.',
          'Changing the underlying standard lowers academic rigor unnecessarily when structured choice can boost initiation on the original target.',
        ]
      ),
      q(
        'A student is escalating verbally after an unexpected schedule change. What should staff prioritize?',
        'During a conflict, a learner shows signs of increasing distress and cannot process lengthy language. What is the best immediate response?',
        'Follow the safety plan, lower verbal load, communicate calmly, and offer regulated space.',
        [
          'Engage in a detailed verbal debate until the student acknowledges breaking the classroom rule.',
          'Issue several rapid multi-step compliance directives so the student refocuses on academic expectations.',
          'Apply an unapproved physical hold briefly to end the disruption quickly and restore quiet.',
        ],
        'During escalation, staff should follow established safety procedures, reduce unnecessary stimulation and language, and avoid power struggles. Any emergency intervention must comply with law, policy, training, and the individual plan.',
        [
          'Debating an escalating student intensifies power struggles and cognitive overload when the learner cannot process complex verbal reasoning.',
          'Rapid-fire directions escalate distress during dysregulation by increasing auditory and executive-function demands beyond what the student can manage.',
          'Unauthorized restraint violates legal, ethical, and safety standards; physical intervention is restricted to trained, lawful emergency responses for imminent physical danger.',
        ]
      ),
      q(
        'A learner becomes distressed when activities end without warning. Which support is most preventive?',
        'A student misses instructions whenever the class shifts unexpectedly between locations. What should the teacher add?',
        'Provide predictable transition cues, a visual schedule, brief change previews, and routine practice.',
        [
          'Deliver consistent after-the-fact consequences each time the student misses an unannounced shift.',
          'Eliminate all daily transitions and room changes from the student’s schedule for the semester.',
          'Direct classmates to guide the student physically to the next classroom station when time expires.',
        ],
        'Advance cues and visual schedules make time and sequence more predictable. Explicit practice and reinforcement teach what to do, while planned previews help the learner respond to unavoidable changes.',
        [
          'Consequences delivered after a stressful, unannounced shift punish a predictability barrier without teaching or cueing how to transition smoothly.',
          'Removing all transitions is neither realistic nor helpful for building adaptive flexibility across school and community routines.',
          'Having peers physically move a classmate compromises safety, dignity, and personal autonomy and can trigger rapid behavioral escalation.',
        ]
      ),
      q(
        'A behavior plan appears ineffective after two weeks. What should the team check before concluding the hypothesis was wrong?',
        'Student outcome data are flat after a new intervention begins. Which additional evidence is essential?',
        'Implementation-fidelity data showing whether supports, teaching, and consequences were delivered as planned.',
        [
          'Informal staff surveys measuring how personally appealing the written behavior strategies feel to implement.',
          'A document audit counting the total number of pages and signatures included in the behavior plan.',
          'A record review verifying whether the student recently qualified for an additional disability category.',
        ],
        'Outcome data cannot be interpreted well without fidelity information. If the plan was not implemented consistently, the team cannot tell whether the intervention itself was ineffective or was never adequately tested.',
        [
          'Staff preference may inform coaching needs, but it cannot reveal whether the core intervention components were actually implemented consistently.',
          'The length or formatting of a written plan does not measure whether adults delivered the antecedents, replacement-skill teaching, and reinforcement accurately.',
          'Eligibility labels do not explain why a specific behavior plan produced flat two-week data; the team must first verify faithful delivery of the intervention.',
        ]
      ),
    ],
  },
];
