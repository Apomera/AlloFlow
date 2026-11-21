'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, INTASC, IES_DATA, FERPA } = sources;

module.exports = [
  {
    id: 'assessment-purpose-format-alignment',
    chapterId: 'plt5622-ch-08',
    domainId: 'assessment',
    domain: 'Assessment',
    label: 'Assessment Purpose, Format, Alignment, and Feedback',
    references: [ETS, INTASC, IES_DATA],
    questions: [
      q(
        'What is the defining instructional purpose of formative assessment?',
        'A teacher collects exit responses before tomorrow’s lesson. What makes the assessment formative?',
        'Educators and learners use timely evidence to guide feedback and next instructional steps.',
        [
          'The assessment is administered on printed classroom exit slips rather than through digital platforms.',
          'The assessment generates a formal numerical score entered into the quarterly report-card average.',
          'The assessment is delivered after an instructional unit closes to certify cumulative student mastery.',
        ],
        'Formative assessment is defined by its use in an ongoing learning process, not merely by timing, format, or the absence of points.',
        [
          'Paper versus digital delivery is a formatting choice; an exit slip is formative because its evidence shapes ongoing teaching and feedback.',
          'Generating a report-card grade describes summative evaluation rather than the instructional-adjustment purpose that defines formative assessment.',
          'Measuring achievement after instruction ends characterizes summative evaluation rather than ongoing, in-process monitoring that actively informs tomorrow’s lesson.',
        ]
      ),
      q(
        'Which use is most appropriate for a summative assessment?',
        'At the end of a unit, a teacher needs evidence of achievement across the priority objectives. What should the assessment do?',
        'Sample priority outcomes with aligned tasks and criteria to summarize achievement within clear limits.',
        [
          'Pinpoint every fine-grained prerequisite misconception across the curriculum from one summary score.',
          'Replace ongoing classroom checks and formative feedback throughout the weeks of unit instruction.',
          'Assess the easiest recall objective thoroughly while omitting complex application targets for fairness.',
        ],
        'Summative assessment supports a bounded judgment about achievement after a period of learning; validity depends on representative alignment and defensible interpretation.',
        [
          'A broad end-of-unit score summarizes overall achievement but lacks the fine-grained item structure of a targeted diagnostic probe.',
          'Waiting for a summative test instead of using ongoing formative checks deprives learners of timely feedback while learning is still malleable.',
          'Testing only easy recall items undermines content validity by failing to sample the full cognitive rigor of priority unit objectives.',
        ]
      ),
      q(
        'Which classroom assessment is diagnostic?',
        'Before teaching division, a teacher wants to locate whether errors arise from place value, multiplication facts, or interpretation of equal groups. What should be used?',
        'Targeted probes separating prerequisite strengths, misconceptions, strategies, and error sources.',
        [
          'A weekly classroom participation tally recording how often students volunteer during math discussions.',
          'An unrelated norm-referenced reading score from the previous spring statewide testing administration.',
          'An end-of-chapter math poster scored primarily on visual layout, color contrast, and neat handwriting.',
        ],
        'Diagnostic assessment gathers fine-grained evidence to explain current performance and guide targeted instruction rather than merely ranking or summarizing.',
        [
          'Participation tallies measure speaking frequency rather than pinpointing whether division errors stem from place value, facts, or equal groups.',
          'A prior reading test measures a different academic construct and cannot diagnose specific prerequisite mathematics bottlenecks accurately.',
          'A neatness-graded end-of-unit poster arrives after instruction ends and fails to inspect the underlying mathematical misconceptions.',
        ]
      ),
      q(
        'Which assessment best aligns with an objective requiring students to conduct and explain a scientific investigation?',
        'A science objective emphasizes planning, evidence collection, and explanation. Which assessment format is strongest?',
        'An observed investigation scored on design, evidence, analysis, and explanation with access supports.',
        [
          'A timed matching quiz asking students to link scientific inquiry terms with textbook definitions.',
          'A brief classroom survey asking learners how confident and interested they feel during science labs.',
          'An attendance checklist confirming that every student remained present throughout the laboratory period.',
        ],
        'Assessment should elicit the knowledge and performance named in the objective; a proxy that omits the critical practice cannot support the intended interpretation.',
        [
          'Matching vocabulary definitions measures declarative recall rather than whether learners can plan an investigation, gather data, and explain evidence.',
          'Self-reported confidence and enjoyment measure affective classroom impressions rather than verified scientific inquiry and reasoning skill.',
          'Lab attendance confirms physical presence in class without providing evidence of experimental design, data quality, or causal explanation.',
        ]
      ),
      q(
        'When is a performance assessment preferable to selected response?',
        'A teacher must evaluate whether students can deliver an organized evidence-based oral presentation. Which format best matches the construct?',
        'Have learners deliver the presentation under clear criteria for content, evidence, and organization.',
        [
          'Ask students to choose the textbook definition of an organized oral presentation on a quiz.',
          'Count the total number of digital presentation slides each student created before speaking day.',
          'Base the primary presentation score on the visual neatness of handwritten outline note cards.',
        ],
        'Direct performance evidence is appropriate when the target includes creating, doing, communicating, or applying a process that selected response cannot adequately represent.',
        [
          'Recognizing a definition of good speaking does not show whether a learner can actually organize and deliver an evidence-based presentation.',
          'Slide counts measure output quantity rather than clarity of reasoning, accurate evidence integration, or effective oral delivery.',
          'Scoring note-card handwriting evaluates an irrelevant surface feature instead of the targeted oral communication and organization construct.',
        ]
      ),
      q(
        'What is the main advantage of an analytic rubric over a single holistic score?',
        'Students need feedback on evidence, organization, reasoning, and conventions separately. What scoring tool is most useful?',
        'An analytic rubric scores distinct criteria separately, offering targeted feedback with clear levels.',
        [
          'A single overall teacher impression recorded quickly at the top of the draft without written criteria.',
          'A binary completion checklist that counts whether each required paragraph appears in the submission.',
          'A national percentile rank imported from a standardized language-arts benchmark taken earlier.',
        ],
        'Analytic scoring separates dimensions of performance, which can improve diagnostic feedback, though the criteria and scoring process still require validity and reliability attention.',
        [
          'An undocumented global impression lacks transparent criteria, lowers scoring reliability, and fails to show which writing dimension needs revision.',
          'A completion checklist verifies presence of structural parts but does not evaluate quality of evidence, reasoning, organization, or conventions.',
          'A broad percentile rank from another test compares peer standing rather than providing dimension-specific feedback on current classroom drafts.',
        ]
      ),
      q(
        'Which condition makes peer assessment educationally useful and fair?',
        'Students are giving one another vague praise on drafts. What should the teacher add?',
        'Teach clear criteria, structure evidence-based feedback, ensure respect, and keep grading oversight.',
        [
          'Allow classroom friendships and peer popularity to determine final rubric ratings on group projects.',
          'Enter unreviewed peer-assigned rubric marks directly into the grade book as the summative unit grade.',
          'Keep scoring criteria private until after peer review so learners give spontaneous personal reactions.',
        ],
        'Peer assessment can deepen criteria knowledge and revision when learners are trained, supported, respectful, and not asked to make unsupported high-stakes decisions.',
        [
          'Letting social popularity influence ratings introduces clear bias and undermines trust, fairness, and authentic criteria-based writing improvement.',
          'Using peer marks as the sole high-stakes grade shifts professional evaluation responsibility onto untrained students and risks unreliable grading.',
          'Withholding clear scoring criteria leaves classroom peers offering vague praise rather than specific, evidence-linked revision suggestions.',
        ]
      ),
      q(
        'What distinguishes a purposeful portfolio from a folder of completed work?',
        'A teacher saves every assignment but cannot use the collection to discuss growth. What should change?',
        'Select dated artifacts by clear criteria over time, add learner reflection, and document growth.',
        [
          'Include a single highest-scoring quiz from the semester so the folder highlights peak classroom success.',
          'Remove administration dates and task directions so reviewers judge student products without context.',
          'Treat the physical thickness and total assignment count in the folder as solid proof of skill mastery.',
        ],
        'A portfolio is a systematic, interpreted collection tied to purposes and criteria; selection, context, reflection, and time make the evidence meaningful.',
        [
          'Keeping one peak quiz hides learning progression across time and fails to represent broader conceptual growth or revision processes.',
          'Stripping away dates and task conditions makes it impossible to interpret how skills developed or what instructional scaffolds were used.',
          'Quantity of collected papers reflects simple work volume rather than curated evidence aligned to clear growth or mastery criteria.',
        ]
      ),
      q(
        'How should anecdotal observation notes be made more useful for assessment?',
        'A teacher writes that a student was unmotivated during group work. What documentation is stronger?',
        'Record dated observable actions and context, separate facts from inference, and sample repeatedly.',
        [
          'Use concise personality trait labels in notes without adding concrete behavioral examples or context.',
          'Rely on general memory at the end of the grading period to write narrative summaries of class work.',
          'Document rare disruptive incidents exclusively while omitting everyday routines where the student succeeds.',
        ],
        'Objective descriptive records reduce inference and recall bias; repeated context-rich observations can inform decisions when combined with other evidence.',
        [
          'Broad trait labels such as unmotivated embed untested inferences and fail to capture what actually happened inside the learning routine.',
          'Waiting until the end of the term introduces heavy recall bias and loses specific contextual details needed for fair decisions.',
          'Recording negative classroom moments alone skews the evidence base and hides the conditions under which the learner thrives.',
        ]
      ),
      q(
        'How should an assessment accommodation be evaluated in relation to validity?',
        'A learner uses a documented response support on a classroom assessment. What question should guide implementation?',
        'Does it remove an access barrier without changing the essential construct, applied per the plan?',
        [
          'Does the support ensure that every learner in the room finishes the assessment at the exact same minute?',
          'Should the teacher withdraw the support next time because the student earned a strong passing score?',
          'Does the accommodation simplify the underlying academic standard into a shorter, less rigorous target?',
        ],
        'An appropriate accommodation supports access while preserving what the assessment is intended to measure and follows the documented qualified decision process.',
        [
          'Equal access does not mean identical pacing; valid accommodations remove construct-irrelevant barriers rather than forcing uniform finish times.',
          'Earning a strong score with a valid accommodation shows the access barrier was removed—not that documented support should be revoked unilaterally.',
          'Changing the underlying academic standard defines a curricular modification, whereas a valid accommodation preserves the target construct being assessed.',
        ]
      ),
    ],
  },
  {
    id: 'measurement-scoring-interpretation-communication',
    chapterId: 'plt5622-ch-09',
    domainId: 'assessment',
    domain: 'Assessment',
    label: 'Measurement, Scoring, Interpretation, and Communication',
    references: [ETS, INTASC, IES_DATA, FERPA],
    questions: [
      q(
        'A classroom test produces highly consistent scores but measures mostly reading speed instead of the intended science reasoning. Which conclusion is strongest?',
        'An assessment is reliable across occasions but poorly aligned to the target construct. What does that mean?',
        'Reliability may hold, yet validity for science reasoning is weak because consistency cannot fix mismatch.',
        [
          'Strong consistency across testing days proves the assessment is valid for evaluating science reasoning.',
          'The assessment lacks validity if the class average falls below expectations rather than due to construct drift.',
          'Reliability and validity describe the same technical property of dependable classroom score reports.',
        ],
        'Reliability concerns consistency or precision; validity concerns evidence supporting an intended interpretation and use, and reliable measurement can consistently measure the wrong thing.',
        [
          'Reliability is necessary but not sufficient for validity; a test can measure reading speed very consistently while failing to assess science reasoning.',
          'Validity depends on whether score evidence supports the intended construct interpretation—not on whether the class mean looks high or low.',
          'Reliability refers to measurement consistency across occasions or raters, whereas validity refers to evidence supporting how scores are interpreted and used.',
        ]
      ),
      q(
        'What is the key difference between norm-referenced and criterion-referenced interpretation?',
        'A family asks whether a score describes comparison with peers or mastery of defined skills. Which explanation is accurate?',
        'Norm-referenced scores compare peer standing; criterion-referenced scores compare against defined standards.',
        [
          'Both norm-referenced and criterion-referenced score reports compare learners strictly to the classroom average.',
          'Criterion-referenced reports express student achievement as national percentile ranks against peer samples.',
          'Earning an above-average norm-referenced score confirms mastery of every specific grade-level standard.',
        ],
        'The reference for interpretation differs: relative standing within a norm group versus performance against established criteria, each with its own supported uses and limits.',
        [
          'Neither system is limited to a local classroom average; norm groups are defined reference samples, while criterion scales track explicit standards.',
          'Percentile ranks reflect relative peer standing inside a norm-referenced framework rather than mastery against defined criterion benchmarks.',
          'Standing above the norm-group average indicates relative peer rank, not guaranteed mastery of every individual grade-level curriculum objective.',
        ]
      ),
      q(
        'A percentile rank of 75 on a norm-referenced test means which of the following?',
        'How should a teacher explain a national percentile rank of 75 accurately?',
        'The score was as high as or higher than the scores of approximately 75 percent of the relevant norm group, not that 75 percent of items were correct.',
        [
          'The student demonstrated independent mastery across approximately 75 percent of the grade-level curriculum standards measured on the test blueprint.',
          'The student answered exactly 75 individual raw test items accurately during the timed standardized assessment administration across all subtests.',
          'The student is currently performing at grade 7.5 across core classroom reading, language, and mathematics expectations compared with typical classmates.',
        ],
        'Percentile rank indicates relative standing within the specified norm group and must not be confused with percent correct, mastery, or a grade-equivalent score.',
        [
          'Percentile rank compares a learner’s performance to a peer norm sample rather than reporting percentage of curriculum standards mastered.',
          'A percentile rank is a derived relative-standing index within a norm group, not a raw count of items answered correctly.',
          'Confusing a percentile rank of 75 with a grade-equivalent level misinterprets two completely different norm-referenced score reporting scales.',
        ]
      ),
      q(
        'A fourth grader receives a grade-equivalent score of 6.2 on a standardized test. What is a defensible interpretation?',
        'Which statement avoids the common misuse of a grade-equivalent score above the learner’s current grade?',
        'On that test, the raw score matched the typical score of the referenced sixth-grade second-month group; it does not prove mastery of the sixth-grade curriculum or readiness for placement.',
        [
          'The student should skip two full grade levels next fall because the standardized score confirms full academic and developmental readiness for accelerated placement.',
          'The student has already mastered the full sixth-grade curriculum across reading and mathematics standards and no longer needs instruction on current-grade objectives.',
          'The score carries the exact same statistical interpretation as earning a national percentile rank of 62 when comparing performance against same-age peer norm groups.',
        ],
        'Grade-equivalent scores describe comparison of a test score with norm-group performance and are easily overinterpreted as curriculum mastery or instructional placement.',
        [
          'A single grade-equivalent score cannot justify multi-grade acceleration without broader evidence of mastery, development, and social-academic readiness.',
          'Performing well on current-grade items at the level typical of an older norm group does not prove mastery of unassessed higher-grade content.',
          'Grade-equivalent scales and national percentile ranks represent distinct measurement metrics and cannot be converted directly by reading digits.',
        ]
      ),
      q(
        'A set of scores contains one extremely high outlier. Which measure is generally less affected when describing the typical score?',
        'A teacher is summarizing data with a strong skew caused by one extreme value. Which statistic should be examined alongside the mean?',
        'The median, because it reflects the middle ordered score and resists pull from extreme outliers.',
        [
          'The full score range, because subtracting the lowest value from the highest value ignores extreme outliers.',
          'The arithmetic mean, because extreme high values balance out and leave the class average unaffected.',
          'An individual student’s raw score, because one raw point summarizes the center of the whole class.',
        ],
        'The median is resistant to extreme values, while the mean can shift substantially; distribution, purpose, and additional statistics should guide interpretation.',
        [
          'The range is calculated directly from the minimum and maximum scores, making it highly sensitive—not resistant—to an extreme outlier.',
          'The arithmetic mean incorporates every score’s numerical magnitude and gets pulled sharply upward or downward by extreme class outliers.',
          'A single raw score describes one learner’s performance rather than summarizing the central tendency of a skewed class distribution.',
        ]
      ),
      q(
        'Why might a testing program convert raw scores to scaled scores?',
        'A teacher sees that two forms report scaled rather than raw results. What is the safest general explanation?',
        'A common scale supports reporting and, when equated, comparison across forms per developer guidance.',
        [
          'Converting raw counts into scaled scores transforms every result directly into a national percentile rank.',
          'Applying a mathematical scaling formula converts a poorly aligned assessment into a valid measurement tool.',
          'Every single scaled-score point corresponds neatly to answering one additional test question accurately.',
        ],
        'Raw-to-scale conversion follows a defined measurement model; users should not infer simple item counts, percentiles, or comparability beyond the developer’s evidence.',
        [
          'Scaled scores and percentile ranks are distinct reporting scales; converting raw totals into scaled scores does not produce percentiles.',
          'Mathematical scaling adjusts score reporting across equated test forms but cannot repair construct mismatch or weak validity evidence.',
          'Because scaling transformations are often nonlinear and weighted by item difficulty, one scaled point rarely equals one raw item correct.',
        ]
      ),
      q(
        'When is holistic scoring more suitable than analytic scoring?',
        'A teacher needs one overall judgment of integrated writing quality after also preserving criteria-based feedback elsewhere. Which approach fits?',
        'Use a holistic rubric with clear overall descriptors and calibration for integrated whole quality.',
        [
          'Count mechanical spelling and punctuation errors exclusively to yield one rapid overall writing score.',
          'Score six separate traits independently on different scales and report the multi-part grid as holistic.',
          'Assign global letter grades from quick intuitive impressions because formal criteria slow holistic scoring.',
        ],
        'Holistic scoring evaluates the overall performance pattern efficiently, whereas analytic scoring separates dimensions; either requires aligned criteria and dependable scoring.',
        [
          'Counting surface spelling errors narrows the writing construct and ignores overall ideas, organization, and integrated communicative effectiveness.',
          'Reporting separate sub-scores for distinct writing traits describes analytic rubric scoring rather than a single integrated holistic judgment.',
          'Holistic scoring still requires explicit overall performance descriptors and rater calibration to maintain scoring fairness and dependable reliability.',
        ]
      ),
      q(
        'Why should a teacher avoid making an important instructional placement from one assessment score alone?',
        'One screening result conflicts with classroom work, observation, and recent progress. What should happen next?',
        'Verify administration and access, gather converging evidence over time, and use team review.',
        [
          'Disregard classroom work samples and recent progress because standardized screening data are more objective.',
          'Average unrelated numerical scores from reading, math, and behavior ratings into one composite decision index.',
          'Use the single low screening score to assign a permanent instructional track before starting the new unit.',
        ],
        'Multiple relevant measures reduce the risk of sampling error, construct mismatch, access barriers, and context-driven overinterpretation in consequential decisions.',
        [
          'Discarding conflicting authentic classroom evidence elevates one potentially noisy or inaccessible screening score over converging multi-source data.',
          'Averaging scores from unrelated academic and behavioral constructs obscures distinct strengths and barriers and lacks psychometric validity for placement.',
          'Locking in a permanent instructional placement from one low score risks serious misclassification due to fatigue, language load, or sampling error.',
        ]
      ),
      q(
        'Which explanation of assessment results is most useful to a family?',
        'A score report contains technical terms and uncertainty. How should the teacher communicate it?',
        'Explain purpose, strengths, needs, limits, criteria, and next steps plainly, inviting questions.',
        [
          'Read the technical score table columns aloud verbatim without translating psychometric terms or context.',
          'Assure the family that the current benchmark score predicts end-of-year testing performance with certainty.',
          'Use dense measurement terminology throughout the conference to establish professional authority quickly.',
        ],
        'Clear communication links evidence with its supported meaning and next actions while naming uncertainty, avoiding labels, and inviting reciprocal family understanding.',
        [
          'Reading raw score tables without context leaves families unsure what was measured, what strengths emerged, or how instruction will respond.',
          'Overpromising future outcomes ignores measurement error and instructional responsiveness, misleading families about what a single score can predict.',
          'Unexplained technical measurement jargon creates avoidable communication barriers and discourages reciprocal family questions and genuine team partnership.',
        ]
      ),
      q(
        'A classroom assessment pattern differs sharply by language background. What is the most responsible next step?',
        'A teacher suspects that wording and background knowledge may be affecting performance beyond the intended construct. What should be reviewed?',
        'Audit item wording, cultural load, access, administration, and alignment before revising instruction.',
        [
          'Remove disaggregated subgroup columns from the data sheet so uneven patterns do not raise concerns.',
          'Interpret the language-group score gap as direct confirmation of lower underlying academic aptitude.',
          'Lower the core academic rigor of the objective without checking whether item language blocked access.',
        ],
        'Assessment fairness requires examining whether irrelevant language, experience, access, or administration factors distort evidence while preserving the intended construct and high expectations.',
        [
          'Hiding disaggregated subgroup patterns masks potential assessment bias and prevents educators from fixing construct-irrelevant language or access barriers.',
          'Assuming lower aptitude confuses linguistic wording or cultural background demands with true learner mastery of the intended content construct.',
          'Lowering academic standards reduces expectations prematurely when clarifying item wording and scaffolds can preserve full curricular rigor fairly.',
        ]
      ),
    ],
  },
];
