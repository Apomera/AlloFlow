'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, IDEA_EVAL, IDEA_ASSESS, IDEA_IEP, IES_DATA } = sources;

module.exports = [
  {
    id: 'assessment-quality-selection',
    chapterId: 'sp5355-ch-07',
    domainId: 'assessment',
    domain: 'Assessment',
    label: 'Assessment Purpose, Quality, and Access',
    references: [ETS, IDEA_EVAL, IDEA_ASSESS],
    questions: [
      q(
        'A vocabulary test is used to decide whether a student can solve multistep equations. What is the primary concern?',
        'A spelling inventory is used as the sole measure of reading comprehension. Which assessment concept is weakest?',
        'Validity, because the scores do not support the intended construct interpretation and decision.',
        [
          'Reliability, because numerical test scores fluctuate whenever vocabulary or spelling tasks are short.',
          'Administration efficiency, because brief screening tools take less time than full-length unit exams.',
          'National norming, because classroom skill evaluations must compare learners against national peer samples.',
        ],
        'Validity concerns whether evidence supports the interpretation and use of scores. A measure dominated by a different skill cannot justify a conclusion about the intended construct.',
        [
          'A vocabulary or spelling test can yield highly consistent, reliable scores yet still be invalid for drawing conclusions about math problem solving or reading comprehension.',
          'Test brevity or efficiency does not explain the core psychometric flaw, which is measuring a mismatched construct rather than taking too little time.',
          'National norms are unnecessary for criterion-referenced instructional decisions and would not fix the mismatch between the skill tested and the claim made.',
        ]
      ),
      q(
        'A progress measure gives very different scores on consecutive days even though instruction and performance appear stable. What quality is in question?',
        'Two trained examiners score the same performance very differently under the same rubric. Which property needs attention?',
        'Reliability, or the consistency of measurement across occasions and scorers.',
        [
          'Face validity, or whether the assessment directions appear relevant to students and families.',
          'Eligibility classification, or whether the student’s primary disability label matches the test manual.',
          'Documentation length, or whether the student’s IEP includes enough narrative background detail.',
        ],
        'Reliability concerns consistency across occasions, forms, items, or raters as relevant. Large unexplained variation weakens confidence that score changes reflect actual performance rather than measurement error.',
        [
          'Face validity reflects superficial appearance of relevance and does not explain unstable day-to-day scores or inconsistent rubric ratings across examiners.',
          'A student’s eligibility category does not cause unexplained score swings between stable days or wide scoring discrepancies between trained raters.',
          'The length of narrative background in an IEP has no bearing on the test-retest or inter-rater consistency of an assessment instrument.',
        ]
      ),
      q(
        'Why should an eligibility team use multiple assessment tools and strategies?',
        'A team has one low standardized score and must decide whether a student has a disability and needs special education. What is required?',
        'Converging sources test competing explanations and prevent a single score from deciding eligibility.',
        [
          'Combining multiple standardized tests ensures the team can document eligibility for preferred services.',
          'When assessment scores disagree, the team should replace lower results with the single highest score.',
          'Formal standardized batteries should be used exclusively because informal classroom observations lack rigor.',
        ],
        'IDEA requires varied tools and strategies and prohibits using a single measure as the sole criterion. Multiple sources help the team understand functional, developmental, academic, and contextual evidence.',
        [
          'Multiple measures are meant to produce an accurate, unbiased picture of learner needs—not to guarantee a predetermined eligibility outcome.',
          'Simply discarding discrepant scores in favor of the highest or lowest value ignores why performance varied across tasks, settings, or response demands.',
          'IDEA explicitly calls for functional, developmental, and academic information—including classroom observations, work samples, and parent input—alongside formal tools.',
        ]
      ),
      q(
        'A newly arrived multilingual learner is assessed only in rapid academic English. What is the central evaluation concern?',
        'A student who uses a communication device is evaluated through spoken responses only. What should be changed?',
        'Assess in the language or communication mode most likely to yield accurate evidence of knowledge.',
        [
          'Convert the resulting test score into a translated report while keeping the original administration format.',
          'Interpret low performance under standard administration as reliable proof of an underlying disability.',
          'Omit parent interviews and language-history records so the evaluation relies on uniform school testing.',
        ],
        'Evaluation procedures must reduce racial, cultural, linguistic, sensory, manual, and communication barriers so results reflect the intended aptitude or achievement rather than an access limitation.',
        [
          'Translating a report after an inaccessible administration cannot repair invalid scores gathered through a language or response modality the student could not access.',
          'Standardized administration that ignores linguistic or AAC access needs confounds communication barriers with disability, yielding misleading conclusions.',
          'Language-history and family information are essential under IDEA to interpret evaluation data accurately and avoid biased identification.',
        ]
      ),
      q(
        'Which assessment is most useful for adjusting tomorrow’s instruction?',
        'A teacher wants immediate evidence about which step in a strategy students misunderstand. What should be used?',
        'A brief formative check aligned to the taught steps, paired with targeted error analysis.',
        [
          'An annual statewide accountability score report summarizing broad end-of-year proficiency bands.',
          'A norm-referenced intelligence battery administered by a school psychologist for triennial review.',
          'A final cumulative semester grade calculated after the instructional unit has already concluded.',
        ],
        'Formative assessment supplies timely, instructionally relevant evidence during learning. Alignment and error analysis help the teacher decide what to reteach, model differently, or release to independent practice.',
        [
          'Annual accountability scores arrive long after daily lessons occur and are too broad to pinpoint which step of a current strategy needs reteaching tomorrow.',
          'An intelligence battery estimates broad cognitive constructs rather than diagnosing specific errors in a daily classroom strategy.',
          'A summative final grade arrives after instruction ends, providing retrospective evaluation rather than timely diagnostic guidance for the next lesson.',
        ]
      ),
      q(
        'A reading assessment is intended to measure comprehension, but a student’s documented motor disability prevents use of the response booklet. What is the best response?',
        'A student understands science content but cannot manipulate the standard answer sheet. How should the assessment be administered?',
        'Provide a response accommodation removing the motor barrier while preserving the content construct.',
        [
          'Reduce the grade-level content rigor of the test items so the student can finish fewer questions.',
          'Score all unmarked answer bubbles as incorrect because standardized booklets must stay unmodified.',
          'Offer leading verbal cues that point the student toward the intended correct content responses.',
        ],
        'An appropriate accommodation improves access while preserving the construct. The team should avoid both construct-irrelevant motor barriers and supports that supply the knowledge being measured.',
        [
          'Lowering the content rigor turns an access accommodation into a modification and prevents measuring the student’s actual comprehension or science knowledge.',
          'Scoring unentered items as content errors measures motor access rather than comprehension or science understanding, producing invalid assessment results.',
          'Giving hints that cue the correct answer compromises assessment validity by supplying the very knowledge the test is intended to measure.',
        ]
      ),
      q(
        'What does a criterion-referenced interpretation show?',
        'A teacher reports that a student correctly performs seven of eight defined skill steps. What kind of interpretation is this?',
        'Performance relative to specified skills or standards rather than relative standing among peers.',
        [
          'The student’s percentile rank compared with a nationally representative norming sample of peers.',
          'The statistical consistency of rubric scores across multiple independent examiners on the task.',
          'The primary biological or environmental cause underlying the student’s identified disability.',
        ],
        'Criterion-referenced results describe mastery of defined content or performance criteria. Norm-referenced results describe relative position within a comparison group; neither alone establishes disability cause.',
        [
          'Percentile rank within a comparison group describes a norm-referenced interpretation rather than mastery against explicit skill criteria.',
          'Scoring consistency across examiners measures inter-rater reliability, not how a student’s score is interpreted against defined learning standards.',
          'Classroom and standardized assessment scores describe observed performance levels rather than diagnosing the underlying biological or environmental cause of a disability.',
        ]
      ),
      q(
        'Which observation definition is most useful for collecting behavior data?',
        'A team wants different observers to record the same target consistently. Which definition is strongest?',
        '“Leaves seat” means both feet cross the desk-area boundary without teacher permission during seatwork.',
        [
          '“Disruptive behavior” means any classroom action that interferes with a calm instructional atmosphere.',
          '“Poor behavior” means acting inappropriately too frequently during structured daily school routines.',
          '“Negative attitude” means displaying visible resistance or reluctance toward teacher assignments.',
        ],
        'An operational definition is observable, measurable, and bounded enough for different people to identify the same event. Labels and inferred attitudes do not produce dependable observation data.',
        [
          'Describing behavior vaguely as disruptive leaves observers to guess which actions count, producing low inter-observer agreement.',
          'Phrases such as acting inappropriately too frequently are subjective judgments rather than countable, clearly bounded behaviors.',
          'Attitude and reluctance are unobservable internal inferences that different staff members interpret inconsistently during data collection.',
        ]
      ),
    ],
  },
  {
    id: 'evaluation-eligibility-intervention',
    chapterId: 'sp5355-ch-08',
    domainId: 'assessment',
    domain: 'Assessment',
    label: 'Evaluation, Eligibility, and Intervention',
    references: [ETS, IDEA_EVAL],
    questions: [
      q(
        'A general education team sees persistent difficulty and begins a targeted intervention. What is an appropriate prereferral practice?',
        'A student struggles with written expression. Which early intervention step is strongest?',
        'Define the skill concern, deliver an evidence-based intervention with fidelity, and monitor progress.',
        [
          'Monitor regular classroom grades for another semester without altering instructional intensity or scaffolds.',
          'Inform the family that strong or weak prereferral response will settle IDEA eligibility by itself.',
          'Assign supplemental general review worksheets that do not target the specific documented skill gap.',
        ],
        'Prereferral intervention should be specific, evidence based, implemented as intended, and monitored. It can improve instruction and contribute data, but it does not predetermine eligibility.',
        [
          'Waiting for failure without adjusting instruction delays timely support and produces no evidence on how the learner responds to targeted teaching.',
          'Intervention response contributes valuable data, but IDEA requires a comprehensive multidisciplinary evaluation and forbids using any single criterion to decide eligibility.',
          'Unaligned worksheets fail to test whether explicit, evidence-based instruction in the target skill closes the performance gap.',
        ]
      ),
      q(
        'A school says it will not evaluate a student until every tier of intervention has been completed. What is the problem?',
        'A parent requests an evaluation, but the school proposes an indefinite RTI trial first. Which statement is correct?',
        'RTI procedures cannot be used to delay or deny a timely IDEA evaluation when disability is suspected.',
        [
          'General education interventions must stop as soon as a multidisciplinary evaluation is discussed.',
          'A written parent evaluation request establishes IDEA eligibility before testing is conducted.',
          'Once an evaluation begins, teams are restricted to standardized cognitive tests rather than RTI data.',
        ],
        'Multi-tiered supports and evaluation can inform one another, but an intervention process cannot become a barrier to IDEA evaluation duties. The agency must follow notice, consent, and timeline requirements.',
        [
          'Schools can continue providing supportive multi-tiered instruction concurrently while honoring IDEA notice, consent, and evaluation timelines.',
          'A parent request triggers procedural notice and consideration of evaluation—not an automatic determination that the student has a qualifying disability.',
          'IDEA encourages integrating progress-monitoring and intervention data with multiple formal and informal measures rather than relying solely on standardized tests.',
        ]
      ),
      q(
        'What is the role of parent information in an evaluation?',
        'A family describes successful communication strategies that are not visible at school. How should the evaluation team use this information?',
        'Integrate parent input as required evidence alongside academic, developmental, and functional data.',
        [
          'Set family observations aside because formal school evaluations rely on clinician-administered protocols.',
          'Treat the parent’s home description as the decisive criterion establishing eligibility and services.',
          'File the family’s observations for review after eligibility and classroom placement have been finalized.',
        ],
        'IDEA explicitly includes information provided by parents among the sources used in evaluation. It should be integrated with other evidence, not dismissed or made the only basis for a decision.',
        [
          'Excluding family observations violates IDEA’s explicit mandate to consider information provided by parents and misses vital cross-setting communication data.',
          'Parent input is an essential component of a comprehensive evaluation, but no single source may serve as the sole criterion for determining eligibility.',
          'Waiting until after eligibility and placement are set defeats the purpose of using family evidence to inform accurate evaluation and IEP planning.',
        ]
      ),
      q(
        'A student is referred for reading difficulty, but records also show significant hearing and communication concerns. How broad should the evaluation be?',
        'An evaluation begins with a suspected attention difficulty but reveals motor and language concerns. What must the team do?',
        'Assess all areas related to the suspected disability and identify all special education needs.',
        [
          'Restrict evaluation tools strictly to the original referral concern listed on the initial screening form.',
          'Administer one broad intellectual screening measure to represent every developmental domain efficiently.',
          'Defer assessing hearing, motor, or language concerns until eligibility is confirmed at the next annual review.',
        ],
        'Evaluation must be comprehensive enough to identify special education and related-service needs, including needs not commonly linked to the eventual disability category.',
        [
          'Limiting testing to the initial referral symptom violates IDEA’s comprehensive evaluation mandate and risks overlooking key sensory, motor, or communication barriers.',
          'A single general cognitive screener cannot diagnose hearing, speech-language, or motor access needs or guide related-service recommendations.',
          'Delaying evaluation of documented secondary concerns leaves critical access and communication needs unaddressed during initial IEP development.',
        ]
      ),
      q(
        'Why can no single test score determine special education eligibility?',
        'A student earns one unusually low score but shows stronger classroom and curriculum data. What should the team do?',
        'Synthesize multiple technically sound measures, observations, histories, and context as a team.',
        [
          'Disregard classroom work samples that conflict with the lowest standardized assessment result.',
          'Compute a mathematical average of all numerical scores across different academic and cognitive tests.',
          'Follow the test publisher’s cutoff table as the binding determinant of IDEA eligibility classification.',
        ],
        'No single measure may serve as the sole criterion. Teams evaluate patterns, validity, access, instruction, exclusionary factors, functional impact, and need for specially designed instruction.',
        [
          'Dismissing stronger authentic classroom performance elevates a single potentially noisy or inaccessible score over converging functional evidence.',
          'Averaging scores from distinct constructs obscures specific strengths and needs and has no psychometric or legal validity for eligibility decisions.',
          'Publisher cut scores inform interpretation, but eligibility under IDEA is a team determination considering adverse educational impact and need for specially designed instruction.',
        ]
      ),
      q(
        'A multilingual learner has had limited access to instruction in English and is referred for SLD. What must the team carefully examine?',
        'A student’s reading difficulty appears only in the newly learned school language. Which eligibility safeguard matters most?',
        'Rule out limited English proficiency or lack of appropriate instruction using valid multilingual evidence.',
        [
          'Verify whether English is the primary language spoken by family members during everyday home routines.',
          'Consider whether an SLD eligibility classification would unlock additional small-group literacy supports.',
          'Check whether a single English reading norm-referenced test places the student below the grade average.',
        ],
        'Eligibility decisions must not mistake language acquisition, cultural difference, or lack of appropriate instruction for disability. Evidence across languages, instruction, progress, and contexts is necessary.',
        [
          'Speaking another language at home is a linguistic difference, not a disability indicator; the key safeguard is ensuring language proficiency and instructional access are not mistaken for disability.',
          'Assigning a disability label to gain extra supports violates IDEA eligibility rules and can lead to inappropriate placement and lowered expectations.',
          'A single below-average English reading score is expected during early English acquisition and cannot establish a specific learning disability on its own.',
        ]
      ),
      q(
        'What is the main purpose of a functional behavioral assessment?',
        'A student’s serious behavior persists despite general supports. Why would the team conduct an FBA?',
        'Identify environmental patterns and form a testable hypothesis about variables maintaining behavior.',
        [
          'Determine which escalated disciplinary consequence will deter future classroom incidents most rapidly.',
          'Establish a clinical psychiatric diagnosis based on patterns observed in general education routines.',
          'Document whether the student’s challenging classroom behavior is premeditated and intentional.',
        ],
        'An FBA gathers direct and indirect data about antecedents, behavior, consequences, and context. Its practical purpose is to design and evaluate preventive, instructional, and consequence strategies.',
        [
          'An FBA is a problem-solving assessment designed to guide proactive, function-based supports and replacement-skill instruction—not to select harsher punishment.',
          'School-based FBAs analyze environmental contingencies rather than diagnosing clinical psychiatric disorders, which lies outside the FBA’s purpose and scope.',
          'Functional assessment focuses on observable antecedents and maintaining consequences rather than inferring internal intent or assigning moral blame.',
        ]
      ),
      q(
        'After evaluation data are collected, who determines eligibility and educational needs?',
        'A multidisciplinary evaluation is complete. What is the next appropriate decision process?',
        'A team of qualified professionals and the parent reviews converging evidence against eligibility criteria.',
        [
          'The student’s primary general education teacher reviews the report and issues the final decision.',
          'A computerized scoring platform applies statistical cutoffs to assign the qualifying category.',
          'School administrators finalize eligibility and notify the parent once classroom placement begins.',
        ],
        'Eligibility is a team determination using multiple sources and applicable criteria. Parent participation and qualified professional judgment are integral; no test or individual makes the decision automatically.',
        [
          'Under IDEA, eligibility cannot be decided unilaterally by one classroom teacher; it requires qualified multidisciplinary professionals together with the parent.',
          'Automated score software cannot weigh exclusionary factors, adverse educational impact, or the need for specially designed instruction.',
          'Finalizing eligibility or classroom placement without parent participation violates core IDEA procedural safeguards and meaningful family involvement in team decisions.',
        ]
      ),
    ],
  },
  {
    id: 'progress-monitoring-data-decisions',
    chapterId: 'sp5355-ch-09',
    domainId: 'assessment',
    domain: 'Assessment',
    label: 'Progress Monitoring and Data-Based Decisions',
    references: [ETS, IES_DATA, IDEA_IEP],
    questions: [
      q(
        'A student’s weekly reading-fluency scores are 62, 64, 63, 65, and 64 while the goal line rises steadily. What is the best interpretation?',
        'A learner’s computation probes remain flat for six weeks while the expected trajectory increases. What should the team conclude?',
        'Growth trails the aim line, so check implementation fidelity and adjust instruction before annual review.',
        [
          'The slight upward uptick between earlier and later probes confirms the student will meet the goal on time.',
          'Consistent scores across consecutive weeks indicate the student has stabilized at independent skill mastery.',
          'Weekly progress charts should be archived for documentation and revisited at the scheduled annual IEP meeting.',
        ],
        'Progress decisions should compare the pattern or trend with the goal trajectory, not react to one score. A persistently inadequate rate calls for a fidelity check and instructional adjustment.',
        [
          'Small one- or two-point fluctuations around a flat trend do not indicate adequate rate of improvement when the goal trajectory rises steeply above observed scores.',
          'Stability far below the target criterion signals stagnation rather than mastery and calls for timely instructional intensification.',
          'Progress monitoring is designed to trigger timely mid-year instructional adjustments—waiting until the annual review wastes months of instructional time.',
        ]
      ),
      q(
        'What is the purpose of a goal line on a progress graph?',
        'A teacher graphs baseline performance and the expected end-of-year criterion. What does the connecting aim line represent?',
        'The expected rate of improvement connecting baseline performance to the target goal.',
        [
          'The median weekly score earned by same-grade classmates on the same curriculum probe.',
          'A formal commitment guaranteeing that the student will reach the target score on schedule.',
          'The test-retest reliability index quantifying measurement error across repeated probe forms.',
        ],
        'A goal or aim line visualizes the trajectory from current baseline to the desired outcome. Comparing observed data and trend with that line supports timely, rule-based decisions.',
        [
          'An aim line reflects the individual student’s baseline-to-goal trajectory rather than plotting weekly peer-group class medians.',
          'An aim line is a visual benchmark for evaluating whether current instruction is sufficient—not a guarantee that growth will occur without adjustments.',
          'Reliability coefficients summarize measurement consistency numerically rather than charting the expected growth slope from baseline to goal.',
        ]
      ),
      q(
        'How often should progress be measured for a student receiving an intensive intervention?',
        'A team needs to know quickly whether a new high-intensity intervention is working. What schedule is best?',
        'Frequently enough with a sensitive, repeatable measure to detect growth and guide timely changes.',
        [
          'Once per year shortly before the annual IEP review so cumulative growth can be summarized cleanly.',
          'On a uniform district-wide calendar schedule regardless of skill type or intervention intensity.',
          'Daily using a brand-new, informal teacher task each morning to capture broad classroom impressions.',
        ],
        'Monitoring frequency depends on the measure, skill, goal, and decision window. More intensive support typically requires sufficiently frequent comparable data, not arbitrary testing or annual-only review.',
        [
          'Annual-only measurement cannot tell the team in time whether an intensive intervention is failing or needs prompt intensification.',
          'Rigid calendars detached from intervention intensity may collect data too infrequently for high-need learners requiring rapid data-based individualization.',
          'Using a different unvalidated task each day destroys comparability across data points, making trend analysis unreliable.',
        ]
      ),
      q(
        'A family finds a progress graph confusing. What is the clearest explanation?',
        'A teacher is presenting progress data to an IEP team. Which communication approach is strongest?',
        'Label skill, baseline, goal, dates, and phase changes, then explain the trend in plain language.',
        [
          'Share a table of raw numerical probe scores without axis labels, target lines, or administration dates.',
          'Summarize progress informally by describing whether the teacher feels encouraged about class effort.',
          'Read psychometric growth-rate formulas verbatim from the software printout without pausing for questions.',
        ],
        'Stakeholders need transparent information about what was measured, under what conditions, what changed, and how the trend compares with the goal. Plain language supports meaningful team participation.',
        [
          'Unlabeled raw numbers give families no way to tell what skill was measured, when instruction changed, or how scores compare to the goal.',
          'Personal encouragement without objective data prevents families from evaluating actual rate of improvement or participating in informed decisions.',
          'Reading unexplained technical jargon verbatim creates avoidable communication barriers and undermines clear, collaborative parent participation at the IEP team table.',
        ]
      ),
      q(
        'A student’s answers show accurate computation but frequent errors choosing the operation in word problems. What should instruction address?',
        'Error analysis shows a learner can decode words but misses pronoun referents in connected text. What is the best response?',
        'Explicitly teach the specific decision or comprehension step shown by error analysis and monitor it.',
        [
          'Assign additional fluency drills on the computation or decoding component the student already performs accurately.',
          'Simplify the entire grade-level curriculum unit rather than targeting the specific breakdown point.',
          'Tally overall percent correct while treating every missed item as equivalent evidence of low mastery.',
        ],
        'Total scores can conceal distinct skill patterns. Error analysis identifies which step or concept needs explicit instruction, allowing the teacher to match feedback and practice to the actual barrier.',
        [
          'Drilling an already accurate subskill wastes instructional time and leaves the real conceptual bottleneck—problem structure or pronoun tracking—untouched.',
          'Lowering the whole curriculum reduces exposure to grade-level concepts when focused instruction on one specific process can resolve the error pattern.',
          'Treating all errors as interchangeable hides actionable diagnostic patterns that show exactly which step needs modeling and guided practice.',
        ]
      ),
      q(
        'Outcome data improve only in classrooms where the intervention steps are followed. What does this suggest?',
        'One teacher implements all components of a plan and sees growth; another omits practice and feedback and sees little change. What should the team examine?',
        'Implementation fidelity likely explains part of the gap and must be checked before rejecting the plan.',
        [
          'Differences in students’ disability eligibility labels account for the uneven outcomes across classrooms.',
          'The intervention protocol should be replaced right away because it failed to produce uniform gains.',
          'Fidelity checklists are unnecessary whenever weekly student outcome probes are already being graphed.',
        ],
        'Fidelity data show whether the intended intervention was delivered with adequate dosage and quality. They help teams separate an ineffective plan from inconsistent implementation and provide coaching targets.',
        [
          'When growth tracks closely with faithful delivery of intervention steps, blaming student labels overlooks a clear, modifiable adult implementation variable.',
          'Abandoning an effective intervention that worked when implemented properly discards a promising practice instead of providing targeted coaching and support.',
          'Outcome scores alone cannot distinguish a flawed instructional program from an unimplemented one; pairing outcome and fidelity data prevents wrong conclusions.',
        ]
      ),
      q(
        'Which progress-monitoring decision rule is most defensible for guiding instructional changes?',
        'A team wants to avoid making program changes from one unusually low score. Which rule is most defensible?',
        'When four consecutive comparable points fall below the aim line with adequate fidelity, adjust instruction.',
        [
          'Replace the instructional intervention whenever a student earns a single probe score below the aim line.',
          'Keep the original instructional plan unchanged through the end of the school year regardless of trend.',
          'Lower the annual IEP mastery criterion whenever a student misses items on a weekly progress probe.',
        ],
        'A prespecified rule based on multiple comparable observations, trend, and fidelity reduces overreaction to measurement noise while still prompting timely response to an inadequate trajectory.',
        [
          'Reacting to one isolated low point overreacts to normal day-to-day measurement variability and disrupts effective instruction prematurely.',
          'Ignoring a persistently flat or declining trend until year’s end defeats the purpose of ongoing progress monitoring and delays needed intensification.',
          'Lowering the goal whenever errors occur reduces expectations rather than adjusting instructional intensity, dosage, or scaffolding to help the student grow.',
        ]
      ),
    ],
  },
];
