'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, INTASC, IES_LEARNING, IES_GUIDES, IDEA_EVAL, IDEA_MTSS, DISABILITY_RIGHTS, ENGLISH_LEARNERS, IES_BEHAVIOR } = sources;

module.exports = [
  {
    id: 'learning-theory-cognition-transfer',
    chapterId: 'plt5622-ch-01',
    domainId: 'students-as-learners',
    domain: 'Students as Learners',
    label: 'Learning Theory, Cognition, and Transfer',
    references: [ETS, INTASC, IES_LEARNING],
    questions: [
      q(
        'A fourth-grade class holds persistent misconceptions before a science unit. Which planning step best uses schema theory?',
        'Students interpret a new history topic only through an inaccurate prior idea. What should the teacher do first?',
        'Surface prior ideas, highlight conflicts with evidence, and link revised concepts to schemas.',
        [
          'Begin the unit by having students copy textbook glossary terms silently into notebooks before class discussion.',
          'Avoid mentioning inaccurate prior ideas aloud so misconceptions fade naturally once accurate facts are presented.',
          'Administer the summative end-of-unit exam on day one to motivate closer reading during upcoming lessons.',
        ],
        'Schema influences how learners notice, organize, and retrieve new information; instruction should activate relevant knowledge and explicitly reorganize misconceptions.',
        [
          'Copying isolated vocabulary definitions does not activate or challenge existing mental models, allowing persistent misconceptions to distort how students interpret new content.',
          'Ignoring inaccurate prior ideas leaves flawed schemas intact; learners often assimilate new facts into their old misconception unless conflicts are surfaced explicitly.',
          'Giving a graded summative exam before instruction induces unnecessary anxiety without diagnosing how existing mental models need to be restructured through evidence.',
        ]
      ),
      q(
        'Which classroom routine most directly develops metacognition during multistep problem solving?',
        'A student can complete a task with help but cannot explain how to choose a strategy. What teacher response best builds metacognition?',
        'Model planning and monitoring, prompt strategy justifications, and require reflection on changes.',
        [
          'Praise rapid task completion publicly so students focus on finishing multistep problems as fast as possible.',
          'Supply the correct numerical answer right after an initial mistake so learners do not practice wrong steps.',
          'Require learners to memorize one standard procedure and apply it identically to every problem in the chapter.',
        ],
        'Metacognition includes planning, monitoring understanding and strategy use, evaluating results, and adjusting deliberately rather than merely completing a task.',
        [
          'Emphasizing speed over reasoning rewards quick execution without teaching students how to plan steps, monitor accuracy, or evaluate their own thinking.',
          'Handing out the answer after an initial error bypasses self-monitoring and deprives the learner of guided reflection on why a chosen strategy broke down.',
          'Relying on one memorized procedure removes strategic decision making about when and why to choose or adapt a method across varied problems.',
        ]
      ),
      q(
        'Students solve fraction problems in one familiar format but fail when the context changes. Which instructional move best promotes transfer?',
        'A learned reading strategy appears only on the worksheet used during instruction. How should the teacher promote transfer?',
        'Vary contexts, compare deep structures, ask when the strategy applies, and fade prompts.',
        [
          'Assign additional pages of the identical worksheet format until students finish every item without hesitation.',
          'Switch to unrelated academic topics quickly without prompting students to compare how concepts connect.',
          'Remind students verbally that mastered strategies should carry over naturally into unfamiliar assignments.',
        ],
        'Transfer improves when learners recognize underlying relationships, retrieve the strategy across varied situations, explain its conditions, and practice independently.',
        [
          'Drilling one narrow item layout strengthens surface-format familiarity rather than teaching students to recognize underlying structure inside novel problem contexts.',
          'Moving abruptly to unrelated topics without explicit structural comparisons prevents learners from seeing when a previously learned strategy applies.',
          'Assuming transfer will happen automatically without varied practice, conditional cues, and prompt fading leaves students stuck on unfamiliar classroom tasks.',
        ]
      ),
      q(
        'A learner succeeds on a complex task only while the teacher gives well-timed prompts. How should instruction proceed within the zone of proximal development?',
        'During guided practice, a second grader needs a visual cue and one question to continue. What is the strongest next step?',
        'Provide contingent support enabling success, track performance, and fade prompts as control grows.',
        [
          'Withdraw all visual cues and teacher questions right away so the learner practices unassisted problem solving.',
          'Complete the remaining challenging steps for the learner so the assignment finishes accurately on schedule.',
          'Maintain the identical visual cue and verbal prompt permanently across units regardless of growing accuracy.',
        ],
        'Scaffolding is responsive temporary support for work a learner can accomplish with assistance; it is adjusted and faded as competence and self-regulation increase.',
        [
          'Removing support abruptly before the learner internalizes the steps pushes the task outside the zone of proximal development and causes rapid breakdown.',
          'Completing the task for the learner removes productive cognitive effort and prevents the gradual transfer of responsibility from teacher to student.',
          'Keeping identical prompts indefinitely creates lasting prompt dependence rather than calibrating instructional support downward as independent mastery strengthens.',
        ]
      ),
      q(
        'Which use of teacher modeling best reflects social learning theory?',
        'A class needs to learn how to disagree productively during discussion. What modeling approach is most defensible?',
        'Model the skill and thinking, highlight key cues, guide rehearsal with feedback, and reinforce use.',
        [
          'State the classroom discussion rule clearly once at the start of the week without demonstrating an example.',
          'Wait for students to observe and copy polite peer disagreement organically during unstructured group talk.',
          'Deliver firm behavioral penalties after every early misstep during discussion without guided rehearsal first.',
        ],
        'Observational learning is strengthened by attention to a credible model, retention of what was observed, opportunities to reproduce it, feedback, and motivation.',
        [
          'Simply naming a rule without a vivid model omits attentional cues and concrete phrasing needed for observational learning and durable retention.',
          'Waiting for chance peer imitation leaves productive disagreement unmodeled and risks students imitating louder or less constructive behaviors instead.',
          'Penalizing errors without demonstration and guided rehearsal punishes an unlearned social skill rather than building successful reproduction and motivation.',
        ]
      ),
      q(
        'Which mathematics experience is most appropriate for many learners developing concrete-operational reasoning?',
        'A teacher introduces conservation and equivalence to elementary learners. Which design best connects with their developing reasoning?',
        'Let learners manipulate concrete models, explain transformations, and connect actions to symbols.',
        [
          'Present symbolic equations exclusively while setting physical manipulatives aside to encourage abstract thinking.',
          'Ask learners to accept the conservation rule on teacher authority without testing physical examples first.',
          'Postpone logical classification and equivalence reasoning until later school grades when abstract thought matures.',
        ],
        'Elementary learners often reason more successfully about logical relationships when ideas are grounded in observable objects and actions before abstraction is increased.',
        [
          'Jumping straight to abstract symbols without concrete referents leaves developing learners memorizing surface notation without grasping why mathematical equivalence holds.',
          'Requiring acceptance of a rule on teacher authority without hands-on evidence bypasses active reasoning about observable transformations and conservation.',
          'Delaying logical classification underestimates developing learners who can reason rigorously about equivalence when grounded in concrete models and guided talk.',
        ]
      ),
      q(
        'A teacher wants inquiry to produce conceptual learning rather than unstructured activity. Which design is strongest?',
        'Students are exploring plant growth, but their observations are disconnected from the learning goal. How should the teacher scaffold the inquiry?',
        'Pose a focused problem, activate knowledge, give strategic prompts, require evidence, and synthesize.',
        [
          'Let open-ended hands-on exploration continue freely without a guiding question or closing concept synthesis.',
          'State all scientific conclusions upfront before students begin observing materials so no errors occur.',
          'Evaluate the investigation primarily on whether lab partners handled materials neatly and worked quietly.',
        ],
        'Guided inquiry combines active construction with clear goals, productive constraints, evidence, teacher prompts, discussion, and consolidation of the intended concept.',
        [
          'Unstructured activity without a driving question or conceptual synthesis often leaves students busy and entertained yet unclear about the target principle.',
          'Giving away every conclusion before investigation turns authentic inquiry into passive verification and strips away meaningful evidence-based scientific reasoning.',
          'Grading neatness and quiet compliance assesses general classroom deportment rather than conceptual understanding or scientific analysis of gathered evidence.',
        ]
      ),
      q(
        'A teacher removes an unpleasant extra practice requirement when students meet a fluency criterion. Which behavioral concept describes the consequence?',
        'Students begin a routine more consistently because completing it ends an unwanted monitoring step. What process is illustrated?',
        'Negative reinforcement, because removing an aversive requirement increases the preceding behavior.',
        [
          'Positive punishment, because taking away an unpleasant classroom requirement decreases future compliance.',
          'Behavioral extinction, because removing the extra task caused the target routine to occur more frequently.',
          'Classical conditioning, because pairing neutral classroom cues changed behavior without any consequence.',
        ],
        'Negative reinforcement increases behavior through removal of an aversive condition; it is not punishment, which is intended to decrease behavior.',
        [
          'Positive punishment adds an aversive stimulus to reduce unwanted behavior, whereas here removing an aversive task increases the desired academic routine.',
          'Extinction weakens and decreases a behavior by withholding a maintaining reinforcer; here the preceding target routine actually grows stronger.',
          'Classical conditioning pairs involuntary stimuli and reflexive responses rather than strengthening voluntary classroom routines through contingent behavioral consequences.',
        ]
      ),
    ],
  },
  {
    id: 'human-development-k6',
    chapterId: 'plt5622-ch-02',
    domainId: 'students-as-learners',
    domain: 'Students as Learners',
    label: 'Human Development Across Grades K–6',
    references: [ETS, INTASC, IES_GUIDES],
    questions: [
      q(
        'Why should an elementary teacher examine cognitive, physical, social, emotional, and moral development together?',
        'A student shows rapid academic growth while peer relationships and motor stamina are changing. How should the teacher interpret development?',
        'Treat domains as interacting and uneven, using multiple contextual observations rather than one milestone.',
        [
          'Expect cognitive, physical, social, and emotional skills to advance at the identical pace within each learner.',
          'Use chronological age alone as a sufficient explanation for why classroom performance varies across domains.',
          'Interpret a single uneven classroom behavior across domains as reliable evidence of a clinical diagnosis.',
        ],
        'Developmental domains interact, yet rates and pathways vary within and among children; instruction uses patterns as guides rather than rigid labels or diagnoses.',
        [
          'Asynchronous development across domains is common; assuming uniform growth rates leads educators to misread normal learner strengths and support needs.',
          'Chronological age provides a rough reference point but cannot explain how health, relationships, prior experience, and task demands shape learning.',
          'Classroom educators observe and document patterns for instructional planning and team referral rather than diagnosing clinical disorders from isolated behaviors.',
        ]
      ),
      q(
        'Which learning experience is most developmentally responsive for young elementary students learning a new classification system?',
        'First graders must organize objects by multiple attributes. Which instructional sequence best fits the task?',
        'Begin with active sorting and comparison talk, explain shifting rules, then represent groups symbolically.',
        [
          'Open the lesson with an extended abstract textbook definition before showing concrete attribute examples.',
          'Require silent rote memorization of category names before letting students touch or sort real objects.',
          'Keep one rigid sorting category throughout the week and discourage students from reclassifying attributes.',
        ],
        'Active manipulation, talk, comparison, and representation make relationships visible and support movement from concrete experience toward symbolic reasoning.',
        [
          'Starting instruction with abstract verbal definitions detached from concrete objects makes attribute relationships opaque and inaccessible for developing learners.',
          'Silent rote memorization prior to hands-on exploration removes the language and physical comparison that anchor deep conceptual understanding.',
          'Blocking reclassification prevents learners from discovering how the identical set of objects can be organized flexibly by multiple attributes.',
        ]
      ),
      q(
        'Two children of the same age display different fine-motor control during writing. What is the most appropriate teacher conclusion?',
        'A student develops coordination later than several classmates but is making steady progress. How should the teacher respond?',
        'Recognize normal variation, check task demands and growth, provide access supports, and consult if needed.',
        [
          'Expect same-age learners to demonstrate nearly identical fine-motor precision on standard writing tools.',
          'Reduce conceptual writing expectations permanently until the student’s pencil grip matches faster peers.',
          'Determine that the student has a motor disability based directly on classroom handwriting samples alone.',
        ],
        'Age-based expectations describe broad patterns, not fixed schedules; teachers distinguish variation from persistent concern using multiple evidence sources and appropriate referral processes.',
        [
          'Normal developmental ranges vary widely among same-age peers; treating variation as a uniform standard creates unnecessary worry and poor placement.',
          'Lowering conceptual writing expectations confounds fine-motor development with cognitive capability when adapted writing access preserves ambitious thinking.',
          'Classroom educators cannot diagnose disabilities from handwriting samples alone; persistent concerns must be reviewed through qualified multidisciplinary processes.',
        ]
      ),
      q(
        'Which classroom condition best supports a learner navigating the elementary years task of industry versus inferiority in Erikson’s original framework?',
        'A student begins to describe personal worth entirely through comparison with faster classmates. Which teacher response is strongest?',
        'Offer attainable challenges, specific competence feedback, valued roles, and self-referenced progress.',
        [
          'Reserve respected classroom leadership roles for the fastest, highest-scoring students during each unit.',
          'Display ranked public leaderboards of quiz scores to motivate learners to work harder against peers.',
          'Remove challenging academic tasks so the student never experiences difficulty or risk of making mistakes.',
        ],
        'Elementary learners develop a sense of competence through purposeful work, supported mastery, contribution, and credible feedback rather than humiliation or empty praise.',
        [
          'Limiting valued classroom leadership contributions to top scorers reinforces feelings of inferiority among peers who are still developing proficiency.',
          'Public peer-ranking charts amplify anxious social comparison and discouragement rather than helping learners notice meaningful personal skill growth.',
          'Eliminating genuine academic challenge deprives learners of authentic mastery experiences needed to build durable self-efficacy and industry.',
        ]
      ),
      q(
        'A student argues that a rule should be followed only to avoid immediate punishment. What can the teacher responsibly infer from an original Kohlberg stage framework?',
        'During a moral discussion, a learner focuses only on personal consequences. How should the teacher use that response?',
        'View it as context-specific reasoning and guide discussion of perspectives and care without fixed labeling.',
        [
          'Conclude that the student lacks core moral values and cannot participate responsibly in class norms.',
          'Expect the student to apply identical punishment-focused moral reasoning across every social situation.',
          'Record a formal developmental diagnosis based directly on the student’s single verbal classroom comment.',
        ],
        'Stage frameworks can help analyze the structure of stated reasoning, but classroom responses are contextual and do not justify a total or permanent judgment about a learner.',
        [
          'Consequence-focused reasoning is a normal developmental pattern in unfamiliar or tense situations and does not indicate an absence of moral character.',
          'Moral reasoning shifts with familiarity, empathy, and social context; one classroom reply does not predict reasoning across all situations.',
          'Moral-stage frameworks are analytical teaching lenses for guiding perspective-taking discussions, not diagnostic tools for assigning clinical labels from one remark.',
        ]
      ),
      q(
        'What is the strongest basis for deciding that a student is ready for a more complex learning task?',
        'A curriculum guide assigns a task by age, but class evidence shows wide differences in prerequisite knowledge. What should guide adaptation?',
        'Use demonstrated prerequisites, language access, support needs, motivation, and task demands, not age alone.',
        [
          'Sequence complex assignments strictly by student birth dates and chronological age across the roster.',
          'Delay advancing any student into richer tasks until the entire class demonstrates uniform skill mastery.',
          'Assume prior exposure to last year’s textbook chapter establishes sufficient readiness for complex work.',
        ],
        'Readiness is task specific and reflects current knowledge, development, experience, and available support; teachers assess it and provide appropriate challenge and scaffolding.',
        [
          'Chronological age overlooks wide differences in background knowledge, language experience, and prior instruction among learners sharing the same birthday year.',
          'Holding back ready learners until every classmate reaches identical mastery restricts growth instead of using flexible scaffolds and targeted extensions.',
          'Prior curriculum coverage does not guarantee durable retention; brief diagnostic evidence is needed to verify actual prerequisite readiness.',
        ]
      ),
      q(
        'Which recess and classroom plan best recognizes the relationship between physical development and learning in grades K–6?',
        'Students become restless during long sedentary lessons and show uneven motor confidence. What design is most responsive?',
        'Provide safe movement, varied motor demands, accessible participation, appropriate breaks, and observation of individual needs while protecting instructional purpose.',
        [
          'Withhold physical movement breaks routinely as a standard classroom consequence whenever students become restless during lengthy seated academic lessons.',
          'Require uniform timed motor execution from every learner across physical transitions and classroom games so group pacing remains consistent throughout the day.',
          'Keep daily lesson planning separate from physical activity schedules because movement and motor stamina fall outside classroom attention and academic engagement.',
        ],
        'Physical development, movement, health, attention, participation, and social experience interact; responsive environments offer access without turning differences into fixed judgments.',
        [
          'Removing movement breaks from restless students often worsens fatigue and off-task behavior while cutting off essential physical self-regulation.',
          'Demanding uniform timed motor performance ignores natural physical variation across learners and can discourage active participation and peer belonging.',
          'Physical stamina, safe movement, and overall health directly influence attention, emotional regulation, and academic engagement throughout the school day.',
        ]
      ),
    ],
  },
  {
    id: 'learner-differences-access-language',
    chapterId: 'plt5622-ch-03',
    domainId: 'students-as-learners',
    domain: 'Students as Learners',
    label: 'Learner Differences, Access, Disability, Giftedness, and Language',
    references: [ETS, INTASC, IDEA_EVAL, IDEA_MTSS, DISABILITY_RIGHTS, ENGLISH_LEARNERS],
    questions: [
      q(
        'A teacher wants to understand why students engage differently with the same task. Which analysis is strongest?',
        'Several learners produce different outcomes after the same lesson. What should the teacher examine before attributing the pattern to ability?',
        'Examine prior knowledge, language, culture, opportunity, access, task demands, instruction, and strengths.',
        [
          'Explain the uneven classroom outcomes through a single demographic background trait shared by some students.',
          'Assume the lesson gave equal access to every learner because verbal directions were read aloud identically.',
          'Rank learners from highest to lowest ability before inspecting instructional clarity or task barriers.',
        ],
        'Learning and performance reflect interacting learner and context variables; responsible analysis avoids stereotypes and examines opportunity and access as well as individual needs.',
        [
          'Attributing achievement differences to one demographic characteristic relies on stereotyping and overlooks modifiable instructional and environmental access factors.',
          'Uniform delivery does not create equitable access when learners differ in prior knowledge, language proficiency, sensory needs, or executive supports.',
          'Ranking students by inferred ability before reviewing instructional clarity and scaffolds mislabels removable design barriers as fixed learner deficits.',
        ]
      ),
      q(
        'Which adaptation best supports an English learner during a grade-level science investigation?',
        'A multilingual student understands the experiment but needs support explaining cause and effect in English. What should the teacher do?',
        'Keep the science goal intact while adding visuals, language models, structured talk, and varied expression.',
        [
          'Substitute unrelated basic-English grammar drills in place of participating in the grade-level science lab.',
          'Prohibit home-language notes or bilingual dictionaries during science so English acquisition speeds up.',
          'Simplify the science investigation to copying bolded textbook vocabulary definitions onto a study sheet.',
        ],
        'English learners need meaningful access to grade-level content alongside explicit language development; language support should not remove the intended thinking.',
        [
          'Pulling the student out of science for isolated grammar drills denies grade-level content access and separates language growth from authentic disciplinary meaning.',
          'Banning home-language tools discards valuable conceptual bridges that help multilingual learners connect prior knowledge to academic English explanations.',
          'Reducing cause-and-effect science reasoning to copying definitions strips away cognitive rigor instead of scaffolding academic language expression.',
        ]
      ),
      q(
        'A student has an IEP accommodation for text-to-speech on eligible classroom materials. What is the teacher’s responsibility?',
        'A classroom assessment approaches, and a documented access support is inconvenient to arrange. What should the teacher do?',
        'Implement the documented support faithfully, raise team questions properly, and protect the construct.',
        [
          'Withhold the accommodation temporarily whenever the student appears to be performing well on recent work.',
          'Swap out the documented access support unilaterally for a shorter, simplified version of the classroom quiz.',
          'Poll classmates informally to decide whether providing the accommodation feels fair to the whole group.',
        ],
        'Teachers implement authorized IEP or accommodation provisions consistently and bring concerns to the qualified team rather than changing services unilaterally.',
        [
          'An IEP accommodation is a legally binding access support; individual educators cannot suspend it unilaterally based on recent strong scores.',
          'Replacing an access accommodation with an easier test alters the learning standard without team authorization and violates the written IEP.',
          'Legal fairness and student confidentiality strictly prohibit polling classroom peers about a classmate’s documented disability accommodations.',
        ]
      ),
      q(
        'Which response best serves a student who has already mastered the unit objectives?',
        'Preassessment shows that a learner can explain and apply the upcoming content. What should the teacher plan?',
        'Provide purposeful enrichment or acceleration extending depth, complexity, or transfer while monitoring.',
        [
          'Require the student to complete all standard practice worksheets first to ensure fair classroom workload.',
          'Assign the student primarily as an informal peer tutor for classmates who struggle with basic concepts.',
          'Move the student to an isolated study carrel for the entire unit so peer pacing does not cause boredom.',
        ],
        'Gifted and advanced learners require evidence-based challenge, not extra repetition; enrichment and acceleration should respond to demonstrated readiness and broader development.',
        [
          'Requiring repetitive practice on already mastered objectives wastes valuable learning time and undermines academic motivation for advanced learners.',
          'Using an advanced student mainly as an unpaid tutor prioritizes classroom management over providing appropriate intellectual challenge and continuous growth.',
          'Permanently isolating advanced learners removes collaborative peer belonging when curriculum compacting and flexible enrichment can work inside the class.',
        ]
      ),
      q(
        'Which lesson design most clearly anticipates learner variability without lowering the common objective?',
        'A class must explain relationships in an ecosystem, but students differ in reading, language, and communication access. What is the strongest design?',
        'Keep a clear shared goal, offer accessible media and scaffolds, allow varied expression, and assess core ideas.',
        [
          'Assign lower, unrelated content objectives to learners who need reading or communication accommodations.',
          'Use one dense print passage and one written essay format so every student faces identical conditions.',
          'Waive evidence requirements for students who receive language or reading scaffolds during the ecosystem unit.',
        ],
        'Inclusive differentiation varies pathways, scaffolds, materials, pacing, or response access while preserving worthwhile goals and valid evidence of learning.',
        [
          'Lowering objectives proactively denies equitable exposure to grade-level science concepts when access supports allow learners to reach the shared goal.',
          'Sticking to one inaccessible text and response mode confounds reading or motor barriers with conceptual understanding of ecosystem relationships.',
          'Removing evidence criteria weakens cognitive rigor; scaffolds should help learners express evidence-based reasoning rather than exempt them from it.',
        ]
      ),
      q(
        'A teacher learns that a familiar participation routine conflicts with norms some families use around adult-child interaction. What response is culturally responsive?',
        'Students participate differently during whole-group discussion, and the teacher suspects cultural and linguistic factors. What should happen next?',
        'Learn from families without stereotyping, offer varied participation structures, teach norms, and check access.',
        [
          'Assign a fixed cultural participation script to each student based on family background records.',
          'Treat quiet or indirect discussion habits as clear evidence of low academic motivation or disengagement.',
          'Drop structured classroom discussion expectations altogether so no family norm is ever unintentionally crossed.',
        ],
        'Cultural responsiveness uses inquiry, assets, explicit access, and flexible participation while avoiding assumptions that reduce individuals to group stereotypes.',
        [
          'Predicting an individual student’s participation style from group background stereotypes learners instead of inviting authentic family and student input.',
          'Equating one familiar vocal style with motivation misinterprets culturally varied ways of showing respect, careful reflection, and academic engagement.',
          'Abandoning explicit classroom structures removes helpful guidance; responsive teaching pairs multiple participation pathways with clear shared expectations.',
        ]
      ),
      q(
        'A student receives tiered intervention but shows signs that may indicate a disability. Which action respects evaluation rights?',
        'A team wants to require completion of every intervention tier before considering a disability evaluation. What should the teacher know?',
        'Continue supports while referring promptly; MTSS must not delay or deny a full individual evaluation.',
        [
          'Wait until every multi-tiered intervention block has been completed for a full academic year before referring.',
          'Decide inside the general classroom intervention team whether the student qualifies for a disability diagnosis.',
          'Suspend all classroom reading and mathematics scaffolds until formal special education eligibility is settled.',
        ],
        'Tiered support and disability evaluation can proceed in coordination; federal guidance does not permit MTSS to become a barrier to timely evaluation.',
        [
          'Federal IDEA guidance prohibits using multi-tiered systems of support to delay or deny a timely individual evaluation when disability is suspected.',
          'Eligibility under IDEA requires a comprehensive multidisciplinary evaluation with parent participation rather than an informal classroom-team diagnosis.',
          'Withholding helpful classroom supports during an evaluation needlessly harms learning; interventions can continue concurrently alongside formal assessment.',
        ]
      ),
      q(
        'A family needs important special-education information in a language it understands. What is the most appropriate school response?',
        'A teacher is preparing for a meeting with caregivers who use another primary language. Which communication plan is strongest?',
        'Arrange qualified accessible language support via school procedures, speak directly, and protect privacy.',
        [
          'Ask the student to translate confidential special education records and meeting decisions for caregivers.',
          'Send standard English notices home and treat the absence of a family reply as informal agreement.',
          'Invite a bilingual parent from another family to interpret private assessment details during the meeting.',
        ],
        'Meaningful family participation requires understandable, accessible, confidential communication and qualified support rather than reliance on children or informal disclosure.',
        [
          'Using a student to interpret sensitive educational decisions is unethical, compromises translation accuracy, and places an inappropriate burden on the learner.',
          'English-only notices do not provide meaningful language access, and family silence cannot substitute for informed parental understanding or consent.',
          'Involving an unrelated community member breaches student confidentiality and lacks the impartiality and professional training of a qualified interpreter.',
        ]
      ),
    ],
  },
  {
    id: 'motivation-environment-behavior',
    chapterId: 'plt5622-ch-04',
    domainId: 'students-as-learners',
    domain: 'Students as Learners',
    label: 'Motivation, Learning Environment, and Behavior',
    references: [ETS, INTASC, IES_BEHAVIOR],
    questions: [
      q(
        'Which task design best supports autonomy, competence, and relatedness without abandoning the learning goal?',
        'Students comply with a project but show little ownership. What adjustment is most likely to strengthen self-determined motivation?',
        'Provide bounded choices, attainable challenge with useful feedback, and purposeful peer collaboration.',
        [
          'Allow learners to select any personal hobby activity regardless of whether it connects to unit standards.',
          'Highlight public score rankings across table groups as the primary incentive for strong project quality.',
          'Step back from offering checkpoints or instructional guidance so students experience full independence.',
        ],
        'Motivation is supported when learners experience genuine agency, growing competence, connection, and purpose within clear educational boundaries.',
        [
          'Unbounded choices detached from the learning objective sacrifice curriculum coherence and fail to build competence on priority academic standards.',
          'Public group score competition can heighten anxiety and undermine supportive classroom relatedness among classmates with varied readiness levels.',
          'Removing instructional guidance and checkpoints leaves learners without scaffolding or informative feedback, threatening their developing sense of competence.',
        ]
      ),
      q(
        'A class begins reading only when prizes are announced. How should the teacher strengthen intrinsic motivation?',
        'Students focus on earning points rather than the substance of a learning task. What is the most defensible response?',
        'Build choice, relevance, achievable challenge, strategy feedback, and visible growth while fading prizes.',
        [
          'Increase prize value and point totals after every reading block so classroom participation remains brisk.',
          'Inform students that personal reading motivation is their own responsibility outside teacher planning.',
          'Remove specific learning feedback during reading tasks so students focus purely on personal enjoyment.',
        ],
        'External incentives can sometimes initiate behavior, but durable engagement is better supported by value, agency, competence, interest, belonging, and informative feedback.',
        [
          'Escalating tangible prizes deepens dependence on extrinsic rewards and can further erode intrinsic interest in authentic reading itself.',
          'Treating motivation as solely a student trait overlooks powerful instructional levers like text choice, relevance, and achievable challenge.',
          'Eliminating informative feedback removes the competence cues learners need to notice their own reading growth and build genuine agency.',
        ]
      ),
      q(
        'A student says, “I failed because I am just bad at math.” Which feedback best supports an adaptive attribution?',
        'After an error, a learner treats ability as fixed and uncontrollable. What should the teacher emphasize?',
        'Name the specific strategy gap, affirm effective effort, model an option, and give a near-term retry.',
        [
          'Assure the student that working harder on the same approach ensures top scores on the next quiz.',
          'Acknowledge that mathematical talent comes more easily to some learners and shift focus to stronger subjects.',
          'Offer warm general praise about the student’s positive personality without examining the missed math steps.',
        ],
        'Adaptive feedback connects outcomes with controllable strategies, knowledge, help seeking, and effective effort while providing credible evidence that improvement is possible.',
        [
          'Empty promises that generic effort alone guarantees mastery backfire when the learner actually needs a different strategy or missing prerequisite.',
          'Validating fixed-ability beliefs reinforces academic helplessness and lowers expectations instead of teaching controllable mathematical problem-solving strategies.',
          'Global personal praise detached from the math work fails to show the learner what specific step to adjust on the next attempt.',
        ]
      ),
      q(
        'Which approach is most effective when introducing a new classroom transition routine?',
        'A class loses learning time during materials cleanup. What should the teacher do before relying on consequences?',
        'Define and model the routine, guide rehearsal, give prompts and feedback, reinforce use, and reteach.',
        [
          'Announce the new cleanup expectation clearly once on Monday morning and expect consistent follow-through.',
          'Add a longer set of written cleanup rules to the wall poster without scheduling guided practice time.',
          'Wait for messy transitions to occur and assign a whole-class loss of recess to build accountability.',
        ],
        'Routines become efficient when they are explicitly taught, practiced, prompted, acknowledged, monitored, and retaught like other learned behavior.',
        [
          'Mentioning an expectation once without modeling or rehearsal rarely produces fluent transitions, especially for learners who need visual cues.',
          'Posting extra written rules without guided practice creates wordy wall reminders that students easily overlook during busy materials cleanup.',
          'Punishing the entire class before teaching and rehearsing the routine penalizes unclear expectations and damages positive classroom climate.',
        ]
      ),
      q(
        'A student repeatedly leaves a difficult independent task and receives extended adult conversation. What should the teacher examine first?',
        'A behavior persists despite repeated reprimands. Which analysis is most useful for selecting instruction and support?',
        'Observe behavior, triggers, and consequences, check task access and function, then teach a replacement.',
        [
          'Attribute repeated leaving of seats to a disrespectful classroom attitude that needs firmer authority.',
          'Assign a harsher disciplinary consequence right away without reviewing classroom antecedent patterns.',
          'Focus strictly on seat-leaving compliance while keeping the independent task difficulty unexamined.',
        ],
        'A functional classroom analysis examines what precedes and follows behavior and what need it may serve so prevention and replacement-skill instruction can be matched.',
        [
          'Labeling behavior as bad attitude ignores observable triggers and maintaining consequences—such as escaping hard work or gaining adult attention.',
          'Escalating punishment without functional antecedent data can inadvertently reinforce attention-seeking or escape-maintained patterns and worsen classroom conflict.',
          'Ignoring task accessibility misses whether a removable instructional mismatch is triggering the learner to leave the desk repeatedly.',
        ]
      ),
      q(
        'Which statement correctly distinguishes reinforcement from bribery in classroom practice?',
        'A teacher plans to acknowledge students after they demonstrate a taught discussion routine. What makes the plan instructional?',
        'Expectations and acknowledgements are set ethically upfront, follow target behavior, and support transfer.',
        [
          'An unplanned treat is negotiated quietly during active disruption to persuade the student to stop.',
          'Frequent material rewards replace explicit modeling and practice of the expected classroom routine.',
          'The educator agrees to grant whichever preferred privilege a student demands in exchange for calm.',
        ],
        'Planned reinforcement follows a defined behavior and supports learning; an improvised inducement during misconduct may reinforce the wrong behavior and bypass instruction.',
        [
          'Offering improvised rewards during active disruption is bribery and often teaches learners that escalating behavior earns negotiated treats.',
          'Using rewards in place of explicit teaching leaves students unsure how to perform the discussion routine once external incentives fade.',
          'Letting student demands dictate ad-hoc concessions undermines consistent, transparent classroom expectations and weakens long-term instructional skill building.',
        ]
      ),
      q(
        'Which classroom arrangement best supports attention, belonging, safety, and flexible learning?',
        'A room layout prevents one student from seeing demonstrations and makes group transitions chaotic. What should the teacher prioritize?',
        'Arrange physical and communication access, clear sightlines, safe traffic flow, and flexible grouping.',
        [
          'Maintain the original fall desk layout unchanged so classroom routines stay completely predictable.',
          'Seat every student who needs extra instructional support along a separate back wall away from peers.',
          'Design seating charts primarily around tidy visual symmetry without observing how students move or see.',
        ],
        'The physical environment is an instructional variable; access, traffic, visibility, interaction, sensory needs, and task purpose should guide its design and revision.',
        [
          'Refusing to adjust a flawed classroom layout leaves sightline barriers and chaotic traffic bottlenecks interfering with daily instructional time.',
          'Segregating learners who need support along a separate back wall harms peer belonging and undermines inclusive access to live demonstrations.',
          'Prioritizing decorative symmetry over observed sightlines, accessibility, and movement fails to treat physical room design as an instructional variable.',
        ]
      ),
    ],
  },
];
