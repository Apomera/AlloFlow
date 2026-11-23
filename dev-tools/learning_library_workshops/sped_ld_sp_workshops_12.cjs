'use strict';

// Applied special-education case workshops for Praxis Special Education:
// Teaching Students with Learning Disabilities (5383) and Praxis Special Education:
// Severe to Profound (5547).
// 12 original, unscored applied case workshops (6 per library) aligned to official
// ETS domains and verified catalog URLs.

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE =
  'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or eligibility/licensure determination. AlloFlow does not score written responses.';

const special_education_learning_disabilities_5383 = {
  workshopLabel: 'Applied SLD case workshops',
  workshopPracticeNote:
    'Independent applied learning-disabilities case workshops designed to build SLD evaluation, explicit reading/writing/math SDI, assistive technology, and secondary-transition reasoning for Special Education: Learning Disabilities (5383) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'ld5383-workshop-01',
      taskType: 'SLD IDEA exclusionary criteria & RTI/PSW evaluation',
      title: 'Audit Exclusionary Factors and RTI Dosage Before Making an SLD Eligibility Call',
      prompt:
        'Evaluate a fourth-grade referral packet containing conflicting RTI slopes, cognitive processing subtests, and attendance records to determine what evidence is required under IDEA 34 CFR 300.309 before deciding SLD eligibility.',
      stimulus:
        'Caleb (Grade 4) reads 52 words correct per minute on grade-level passages (benchmark 105) with a 0.5-word weekly slope across eight Tier 2 weeks. Records show he transferred schools twice in Grade 2, missed 19 school days this year, and had a substitute teacher during 6 of 8 Tier 2 weeks with no fidelity logs. On psychological testing, his verbal comprehension is 104, phonological processing is 76, and oral science discussions are strong.',
      estimatedMinutes: 15,
      taskParts: [
        'Analyze how Caleb\'s school mobility, 19 absences, and unverified Tier 2 substitute instruction affect IDEA 34 CFR 300.309 exclusionary criteria regarding lack of appropriate instruction in reading.',
        'Explain how a multidisciplinary team should integrate RTI progress-monitoring data, pattern of strengths and weaknesses (PSW) findings, and mandatory classroom observation without relying on a single score or IQ-achievement discrepancy.',
        'Specify the immediate data-verification steps, parent-communication safeguards, and instructional supports required while completing a compliant SLD eligibility determination.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Weigh Caleb\'s 52 WRCM score, flat 0.5 weekly slope, and 76 phonological processing score against his 104 verbal comprehension, strong oral science reasoning, 19 absences, and 6 undocumented substitute-led Tier 2 weeks.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply 34 CFR 300.309 rules requiring documentation of appropriate reading instruction by qualified personnel, repeated achievement assessments, classroom observation, and ruling out primary exclusionary factors before confirming SLD.',
        },
        {
          label: 'Support plan',
          guidance:
            'Deliver high-fidelity, explicit phonological and decoding intervention with trained staff, conduct a structured general-education reading observation, and collect family developmental and attendance-barrier history.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Protect IDEA evaluation timelines without using unverified RTI to delay parental consent, document intervention fidelity checklists weekly, and provide parents clear written notice of every data source reviewed.',
        },
      ],
      successCriteria: [
        'Explicitly flags the 6 undocumented substitute-led Tier 2 weeks and 19 absences as threats to proving Caleb received appropriate reading instruction under 34 CFR 300.309(b).',
        'Integrates Caleb\'s 104 verbal comprehension and 76 phonological processing pattern with classroom work samples and direct observation rather than treating any single subtest as definitive.',
        'Identifies the mandatory IDEA classroom observation in Caleb\'s area of reading difficulty and collaboration with parents to address attendance barriers.',
        'Maintains strict adherence to IDEA evaluation timelines while immediately restoring fidelity-monitored, explicit reading instruction.',
      ],
      commonPitfalls: [
        'Declaring Caleb SLD solely because of the 28-point spread between verbal comprehension (104) and phonological processing (76) without validating instructional opportunity.',
        'Automatically denying SLD eligibility because Caleb missed 19 days rather than investigating whether his severe phonological deficit persists during verified high-fidelity instruction.',
        'Treating undocumented substitute-led sessions as proof of nonresponse to evidence-based Tier 2 intervention.',
        'Omitting the required general-education classroom observation and repeated progress-monitoring documentation mandated by 34 CFR 300.309 and 300.310.',
      ],
      sampleOutline: [
        'Instructional-opportunity audit: Six substitute-led Tier 2 weeks without fidelity logs plus 19 absences prevent the team from claiming Caleb failed to respond to verified reading instruction.',
        'Converging evaluation synthesis: Pair Caleb\'s 76 phonological score and 52 WRCM baseline with a structured classroom reading observation, phonics error inventory, and parent interview on early language and attendance.',
        'IDEA 300.309 decision framework: Rule out visual, hearing, motor, emotional, environmental, and instructional-opportunity explanations while documenting whether phonological deficits persist despite qualified explicit teaching.',
        'Concurrent action and safeguards: Honor the statutory evaluation clock, share repeated CBM graphs with parents, partner to resolve absences, and immediately restore fidelity-checked structured literacy sessions.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.309',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5383.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ld5383-workshop-02',
      taskType: 'Explicit phonological, orthographic & morphological reading SDI',
      title: 'Design Multisyllabic Decoding and Morphology SDI for an Upper-Elementary Reader',
      prompt:
        'Use diagnostic word-reading, spelling, and oral reading error data for a fifth-grade student with dyslexia to build an explicit structured-literacy Specially Designed Instruction (SDI) sequence that transfers to connected Grade 5 text.',
      stimulus:
        'Tessa (Grade 5, SLD in basic reading skills and fluency) reads single-syllable CVC and silent-e words at 95% accuracy but drops to 58% on multisyllabic words in Grade 5 social studies text. Miscue analysis shows she guesses from initial letters ("conclude" as "collect", "transportation" as "transparent"), omits medial vowel teams, and spells "unbelievable" as "unbelevbl." Her oral listening comprehension is at the 78th percentile.',
      estimatedMinutes: 15,
      taskParts: [
        'Interpret Tessa\'s miscue and spelling profile to pinpoint the exact phonological, syllable-division, orthographic, and morphological gaps driving her 58% multisyllabic accuracy.',
        'Design a systematic, explicit SDI lesson sequence (modeling, guided practice, corrective feedback, and cumulative review) targeting multisyllabic word-attack routines and high-utility prefixes, roots, and suffixes.',
        'Specify how to bridge isolated word study into Grade 5 fluency and comprehension while monitoring orthographic transfer weekly.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Connect Tessa\'s 95% single-syllable mastery and 78th-percentile listening comprehension against her 58% multisyllabic accuracy, initial-letter guessing, medial vowel omissions, and spelling of "unbelevbl."',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply WWC Grades 4-9 reading intervention recommendations: teach explicit multisyllabic decoding routines, morphological analysis (affixes and roots), and structured connected-text fluency practice.',
        },
        {
          label: 'Support plan',
          guidance:
            'Implement a daily 4-step word-attack routine (circle prefixes/suffixes, underline vowel graphemes, divide and flex syllables, blend and check meaning) paired with encoding dictation and partner repeated reading.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Collect weekly multisyllabic nonsense-and-real-word probes, dictated morphological spelling checks, and oral reading accuracy/rate graphs while preserving Tessa\'s access to Grade 5 concepts via audio.',
        },
      ],
      successCriteria: [
        'Accurately diagnoses Tessa\'s reliance on initial-letter guessing and weak medial-vowel/morpheme mapping despite intact single-syllable decoding and strong listening comprehension.',
        'Constructs an explicit, systematic SDI sequence (I do, we do, you do) teaching both syllable-division strategies and structural/morphological analysis rather than whole-word memorization.',
        'Integrates encoding (spelling dictation) and connected Grade 5 text practice so decoded words transfer to authentic fluency and comprehension.',
        'Establishes weekly diagnostic mastery criteria and protects Tessa\'s access to Grade 5 social studies knowledge through text-to-speech while remediation proceeds.',
      ],
      commonPitfalls: [
        'Encouraging Tessa to guess multisyllabic words using picture clues or surrounding sentence context (three-cueing), which reinforces her initial-letter guessing habit.',
        'Re-teaching kindergarten CVC phonics drills even though Tessa already decodes single-syllable closed and silent-e words at 95% accuracy.',
        'Having Tessa copy weekly vocabulary lists five times each without explicit phoneme-grapheme or morpheme mapping.',
        'Pulling Tessa into simplified Grade 2 reading comprehension books that starve her 78th-percentile oral language and background knowledge.',
      ],
      sampleOutline: [
        'Diagnostic profile: Tessa\'s 95% single-syllable mastery and 78th-percentile listening comprehension rule out broad language deficits; her core breakdown is multisyllabic vowel mapping and morphological segmentation.',
        'Explicit decoding and morphology SDI: Explicitly model peeling high-frequency prefixes and suffixes (un-, trans-, -port-, -able), locating vowel teams per syllable, and flexing schwa pronunciations with immediate corrective feedback.',
        'Encoding and text transfer: Pair decoded word families with morpheme-by-morpheme spelling dictation, then practice targeted Grade 5 social studies paragraphs through choral and timed partner rereading.',
        'Progress monitoring: Track weekly accuracy on unpracticed multisyllabic words and connected-text WCPM while providing audio access to full Grade 5 textbooks so content learning never stalls.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/29',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5383.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ld5383-workshop-03',
      taskType: 'CRA & schema-based math SDI with CBM decision rules',
      title: 'Repair Multiplicative Word-Problem Errors Using CRA, Schemas, and CBM Rules',
      prompt:
        'Analyze a fourth-grade student\'s mathematics error patterns and flat CBM graph to redesign Specially Designed Instruction using Concrete-Representational-Abstract (CRA) progression, schema-based instruction, and explicit data-decision rules.',
      stimulus:
        'Malik (Grade 4, SLD in math calculation and problem solving) adds every number when he sees "more" or "altogether," scoring 25% on multiplicative comparison items. He writes 1/4 is larger than 1/2 because 4 is bigger than 2. Weekly math-concepts CBM probes show four straight scores below his aimline (8, 9, 8, 9 vs. aimline 14). Current support relies on keyword posters and flash-card drills.',
      estimatedMinutes: 15,
      taskParts: [
        'Diagnose the conceptual misconceptions behind Malik\'s keyword guessing and whole-number bias in fractions, and explain why four consecutive CBM points below the aimline mandate an instructional change.',
        'Design an explicit CRA and schema-based SDI sequence targeting multiplicative comparison word problems and fraction magnitude on number lines.',
        'Define clear CBM progress-monitoring procedures, error-analysis checks, and four-point decision rules to evaluate whether the revised math SDI accelerates Malik\'s slope.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Pair Malik\'s 25% multiplicative comparison score, keyword-triggered addition errors, whole-number fraction misconception (1/4 over 1/2), and four consecutive CBM points stuck at 8-9 against a 14-point aimline.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply WWC elementary math intervention recommendations: replace keyword tricks with schema-based problem solving, use CRA visual representations including number lines, and apply data-based individualization.',
        },
        {
          label: 'Support plan',
          guidance:
            'Remove keyword posters; model equal-groups and multiplicative comparison tape diagrams with manipulatives before symbolic equations, and teach fraction magnitude using concrete strips aligned to 0-to-1 number lines.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Graph weekly parallel math CBM probes against the IEP aimline, run error-pattern checks every two weeks, and trigger a documented DBI intensification if four consecutive scores remain below the aimline.',
        },
      ],
      successCriteria: [
        'Explicitly rejects keyword-poster instruction as counterproductive and identifies whole-number bias in Malik\'s fraction comparison error.',
        'Applies the four-point CBM decision rule (four consecutive data points below the aimline) to justify an immediate instructional redesign rather than waiting for the annual IEP review.',
        'Sequences explicit CRA instruction (concrete manipulatives to tape diagrams/number lines to abstract equations) alongside schema-based problem classification.',
        'Incorporates brief daily fluency practice paired with conceptual feedback and clear fidelity plus biweekly error-pattern reviews.',
      ],
      commonPitfalls: [
        'Doubling the number of multiplication flash-card drills while leaving Malik\'s conceptual schema and fraction-magnitude gaps unaddressed.',
        'Teaching expanded "keyword cheat sheets" (such as circling "more" to add or "times" to multiply), which fails on multi-step and comparison problems.',
        'Waiting until the end of the grading quarter to adjust SDI even though four consecutive weekly CBM probes sit flat below the aimline.',
        'Skipping directly from concrete fraction tiles to cross-multiplication rules without linking pictorial number lines to abstract symbols.',
      ],
      sampleOutline: [
        'Error and CBM diagnosis: Four straight CBM scores of 8-9 against an aimline of 14 trigger an immediate DBI change; Malik\'s errors reflect keyword dependency and whole-number fraction bias rather than mere fact-recall slowness.',
        'Schema-based problem solving: Replace keyword posters with explicit attack strategies (read, identify problem schema, draw a multiplicative comparison bar model, write equation, verify reasonableness).',
        'CRA fraction-magnitude sequence: Move systematically from concrete fraction bars to partitioned number lines to symbolic inequality comparisons so Malik sees why larger denominators create smaller unit parts.',
        'CBM decision protocol: Maintain weekly comparable probes, insert a vertical phase-change line on the graph, audit instructional fidelity, and reconvene the IEP team if the new slope still lags after four to six weeks.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/26',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5383.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ld5383-workshop-04',
      taskType: 'SRSD writing SDI & executive-function assistive technology',
      title: 'Combine SRSD Argument Writing with Speech-to-Text and Executive-Function Supports',
      prompt:
        'Plan Specially Designed Instruction and assistive technology integration for a seventh-grade student with dysgraphia and working-memory challenges so she can independently plan, draft, and revise Grade 7 argumentative essays.',
      stimulus:
        'Hannah (Grade 7, SLD in written expression with dysgraphia and slow orthographic motor speed) speaks clearly during debate and cites two text sources accurately aloud. When handwriting a 25-minute essay, she produces only 38 cramped words with omitted endings, no counterargument, and frequent off-topic restarts. Her current IEP lists only "extended time" and "copies of teacher notes," and teachers occasionally excuse her from essays altogether.',
      estimatedMinutes: 15,
      taskParts: [
        'Analyze how Hannah\'s oral debate strengths versus her 38-word handwritten output separate transcription/executive-function barriers from higher-order argumentative reasoning.',
        'Design a six-stage Self-Regulated Strategy Development (SRSD) writing plan (such as POW+TREE or STOP+DARE) incorporating explicit self-talk, goal setting, and revision checklists.',
        'Select and justify matched assistive technology (speech-to-text, word prediction, text-to-speech playback for editing) alongside a training and fading routine that ends essay exemptions.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast Hannah\'s accurate oral source citations during debate against her 38-word handwritten draft, omitted endings, missing counterargument, and ineffective accommodations that led to essay exemptions.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply evidence-based SRSD writing stages, IDEA assistive technology consideration and service training duties, and WWC adolescent literacy guidance integrating explicit writing-strategy instruction with reading.',
        },
        {
          label: 'Support plan',
          guidance:
            'Teach an explicit argumentative SRSD mnemonic with graphic planners and self-monitoring checklists while training Hannah to dictate drafts via speech-to-text and revise using text-to-speech read-back.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Score biweekly argumentative essays with an analytic rubric (claim, evidence, counterargument, transitions, conventions) and track independent AT workflow fluency across ELA and social studies.',
        },
      ],
      successCriteria: [
        'Distinguishes transcription/working-memory overload from conceptual knowledge and explicitly rejects excusing Hannah from grade-level essays.',
        'Details concrete SRSD stages (develop background knowledge, discuss, model with think-alouds, memorize mnemonic, support with scaffolds, independent performance) rather than handing out an untaught organizer.',
        'Pairs speech-to-text and word prediction with explicit instruction in punctuation dictation and text-to-speech auditory proofreading so AT builds rather than replaces writing skill.',
        'Establishes objective rubric and word-production/essay-element progress monitoring across multiple content classes.',
      ],
      commonPitfalls: [
        'Continuing to excuse Hannah from written arguments or substituting fill-in-the-blank worksheets, which lowers Grade 7 academic expectations.',
        'Turning on speech-to-text without explicitly teaching planning, spoken punctuation commands, and text-to-speech editing routines.',
        'Relying solely on extended time, which prolongs motor fatigue without reducing dysgraphia transcription bottlenecks.',
        'Grading only spelling mechanics while ignoring Hannah\'s mastery of claim, textual evidence, and counterargument organization.',
      ],
      sampleOutline: [
        'Profile synthesis: Hannah\'s strong oral debate citations prove she understands argumentative reasoning; her 38-word drafts reflect severe transcription load and unguided planning rather than weak content knowledge.',
        'SRSD instructional cycle: Explicitly model POW+TREE (or STOP+DARE) using think-alouds, co-construct argument organizers, embed self-regulation checklists, and gradually fade visual prompts toward independence.',
        'Integrated AT workflow: Conduct a feature-matched trial of speech-to-text plus word prediction for drafting and text-to-speech read-back for auditory editing, writing both AT devices and staff/student training into the IEP.',
        'Generalization and monitoring: End essay exemptions across core classes, measure essay elements and total words written biweekly via analytic rubrics, and align daily AT supports with allowable state testing accommodations.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/29',
        'https://praxis.ets.org/test/special-education-teaching-students-with-learning-disabilities-5383.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ld5383-workshop-05',
      taskType: 'Academic-frustration FBA/BIP & self-regulation support',
      title: 'Interrupt Escape-Maintained Reading Avoidance with Academic Antecedents and Self-Regulation',
      prompt:
        'Interpret functional behavior assessment data for a sixth-grade student with SLD whose disruptive outbursts occur exclusively during independent reading and math problem sets, and design an integrated academic-behavioral intervention plan.',
      stimulus:
        'Diego (Grade 6, SLD in reading fluency and math reasoning) throws his binder, makes sarcastic jokes, or walks to the nurse during silent reading and word-problem blocks. Over 12 observation days, 14 of 16 incidents occurred within 4 minutes of dense multi-paragraph handouts and ended with a 15-minute hallway cool-down or nurse visit. During hands-on science labs and audio-supported discussions, he had zero incidents and completed 90% of tasks.',
      estimatedMinutes: 15,
      taskParts: [
        'Construct a clear ABC functional hypothesis linking Diego\'s academic skill barriers to the negative reinforcement cycle maintaining his disruptive behavior.',
        'Design a proactive BIP that pairs antecedent academic access supports (text chunking, audio/preview scaffolds, worked examples) with explicit teaching of a dignified self-advocacy replacement skill and self-monitoring.',
        'Specify how teachers will avoid reinforcing task escape during incidents while tracking both replacement-skill usage and independent academic completion.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast the 14 of 16 incidents occurring within 4 minutes of dense handouts (ending in 15-minute nurse/hallway escapes) against Diego\'s zero incidents and 90% completion during audio-supported labs.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply functional behavioral assessment logic, negative reinforcement mechanics, explicit adolescent reading/math scaffolding, and self-regulation strategy instruction without punitive exclusion.',
        },
        {
          label: 'Support plan',
          guidance:
            'Pre-teach key vocabulary, chunk dense handouts with audio/worked-model access, teach a discreet help-or-two-minute-reset pass, and coach Diego to self-graph task starts and check-ins.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Collect daily latency to task initiation, percentage of chunked work completed, discreet pass frequency, and office/nurse exit counts while checking adult fidelity to non-punitive redirection.',
        },
      ],
      successCriteria: [
        'Correctly identifies escape from aversive reading/math task demands (rather than peer attention alone) as the primary hypothesized behavioral function.',
        'Addresses the root academic trigger through antecedent SDI and access scaffolds (chunked passages, vocabulary preview, worked examples, audio support) instead of relying solely on behavioral contingencies.',
        'Teaches a socially dignified, age-appropriate middle-school replacement behavior (discreet check-in cue or brief structured reset with immediate return to scaffolded work).',
        'Includes explicit self-monitoring goals and fidelity checks so staff stop inadvertently reinforcing task avoidance with 15-minute hallway or nurse removals.',
      ],
      commonPitfalls: [
        'Diagnosing Diego\'s sarcastic jokes as pure attention-seeking without noticing that 87.5% of incidents begin with dense text and end in task removal.',
        'Assigning detention or in-school suspension for binder-throwing, which escalates academic frustration and still allows Diego to escape the assignment.',
        'Using an embarrassing elementary sticker chart in front of sixth-grade peers instead of a private self-monitoring card and natural reinforcers.',
        'Allowing open-ended nurse visits whenever Diego requests a break instead of pairing a brief structured reset with scaffolded task completion.',
      ],
      sampleOutline: [
        'Functional hypothesis: Dense, unscaffolded multi-paragraph reading and word-problem handouts trigger academic embarrassment and frustration; binder-throwing and jokes are negatively reinforced by 15-minute hallway or nurse escapes.',
        'Antecedent academic repairs: Provide digital audio access, pre-taught academic vocabulary, worked math examples, and chunked two-part checkpoints before independent work begins.',
        'Replacement and self-regulation teaching: Privately rehearse a discreet desk signal for immediate teacher check-in or a timed 2-minute reset, paired with a private self-monitoring tracker for task initiation.',
        'Consequence shift and data review: Prompt the taught help signal at early frustration cues, maintain brief instructional follow-through rather than lengthy removals, and review weekly work completion alongside incident counts.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/29',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/26',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ld5383-workshop-06',
      taskType: 'IDEA procedural safeguards & secondary self-advocacy transition',
      title: 'Build a Compliant Secondary Transition Plan and Self-Advocacy Bridge to College',
      prompt:
        'Audit a tenth-grade transition IEP for a student with SLD who plans to enter a community-college nursing-assistant program, correcting procedural safeguard omissions and strengthening measurable postsecondary goals and self-advocacy instruction.',
      stimulus:
        'Aaliyah (Grade 10, age 16, SLD in reading comprehension and math fluency) wants to earn a CNA certificate and an associate nursing degree. Her draft IEP was written without inviting Aaliyah or giving a transition assessment; it states only "Aaliyah will graduate and go to college." She cannot explain her disability or needs because teachers always arrange her extended time and audio texts automatically.',
      estimatedMinutes: 15,
      taskParts: [
        'Identify the IDEA secondary transition and procedural-safeguard violations in Aaliyah\'s draft IEP, including missing student invitation, age-appropriate transition assessments, and non-measurable postsecondary goals.',
        'Draft aligned, measurable postsecondary goals (education/training and employment), coordinated transition services, and an annual IEP self-advocacy goal grounded in her nursing pathway.',
        'Explain how to prepare Aaliyah for the legal shift from IDEA K-12 entitlements to ADA/Section 504 college disability services, including documentation readiness and the Summary of Performance (SOP).',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Anchor revisions in Aaliyah\'s age (16), nursing-assistant and associate-degree career goals, reading comprehension and math fluency profile, omitted transition assessment, and passive reliance on teacher-initiated accommodations.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA transition mandates effective by age 16 (student invitation, age-appropriate assessments, measurable postsecondary goals, aligned course of study, Summary of Performance) and ADA/Section 504 postsecondary disclosure rules.',
        },
        {
          label: 'Support plan',
          guidance:
            'Administer interest, study-skill, and accommodation inventories; coach Aaliyah to lead a portion of her IEP meeting; teach scripted self-advocacy role-plays; and align high school biology/health-science courses and assistive tech.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Document formal student invitation and Prior Written Notice, track independent accommodation requests across classes each quarter, and maintain updated psychoeducational records for future college disability-office review.',
        },
      ],
      successCriteria: [
        'Flags all core IDEA age-16 transition defects: failure to invite Aaliyah, absence of age-appropriate transition assessments, and vague non-measurable postsecondary goals.',
        'Connects measurable postsecondary education and employment goals directly to high school coursework, explicit self-advocacy instruction, and nursing-relevant reading/math SDI.',
        'Clearly explains the K-12 IDEA versus postsecondary ADA/Section 504 shift (no college IEP or FAPE; student must self-disclose, submit documentation, and request reasonable accommodations).',
        'Specifies how a student-led IEP, accommodation portfolio, and graduation Summary of Performance (SOP) build durable adult self-determination.',
      ],
      commonPitfalls: [
        'Assuming Aaliyah\'s high school IEP transfers automatically to community college so disability counselors will arrange her audio texts without her initiating contact.',
        'Writing a transition goal that focuses solely on high school graduation ("will pass Grade 11") rather than measurable post-high-school training and employment outcomes.',
        'Continuing to manage Aaliyah\'s accommodations silently behind the scenes through Grade 12 without practicing direct self-disclosure and request scripts.',
        'Omitting formal student invitation records, parental procedural safeguards, or transfer-of-rights notification planning prior to the age of majority.',
      ],
      sampleOutline: [
        'Compliance audit: At age 16, omitting Aaliyah\'s formal IEP invitation, age-appropriate transition assessments, and measurable postsecondary goals violates IDEA transition requirements.',
        'Aligned transition goals: Use career/learning-profile assessments to write measurable post-graduation enrollment and CNA employment goals backed by health-science coursework, dosage-calculation math SDI, and text-to-speech mastery.',
        'Self-advocacy curriculum: Write an annual IEP goal requiring Aaliyah to articulate her SLD strengths, barriers, and needed accommodations during teacher check-ins and a student-led IEP presentation.',
        'Postsecondary legal bridge: Teach Aaliyah the IDEA-to-ADA/Section 504 transition (self-disclosure, documentation standards, reasonable accommodations without curriculum modification) and prepare an evidence-rich Summary of Performance before exit.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.309',
        'https://praxis.ets.org/test/special-education-teaching-students-with-learning-disabilities-5383.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

const special_education_severe_profound_5547 = {
  workshopLabel: 'Applied low-incidence SPED workshops',
  workshopPracticeNote:
    'Independent applied low-incidence special-education case workshops designed to build presumed competence, IHP health safety, multimodal AAC, systematic instruction, AA-AAS, and transdisciplinary transition reasoning for Special Education: Severe to Profound (5547) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'sp5547-workshop-01',
      taskType: 'Ecological profiling & presumed competence in inclusive classrooms',
      title: 'Replace Mental-Age Exclusion with Presumed Competence and Grade 7 Partial Participation',
      prompt:
        'Challenge a deficit-based placement recommendation for a seventh-grade student with complex motor and communication needs by constructing an ecological inventory, age-respectful Grade 7 access plan, and peer-supported participation matrix.',
      stimulus:
        'Maya (Grade 7, Rett syndrome with hand apraxia and nonspeaking profile) uses eye gaze to choose music, greet classmates, and laugh at teen comics. A draft report labels her "functioning at an 18-month level" and proposes moving her out of Grade 7 science and ELA into a separate room to sort plastic preschool bears. Her parents emphasize that Maya stays alert during peer labs and responds strongly to age-appropriate novels read aloud.',
      estimatedMinutes: 15,
      taskParts: [
        'Critique the "18-month mental age" label and preschool-bear task using presumed competence, age-appropriateness, and IDEA Least Restrictive Environment (LRE) principles.',
        'Conduct an ecological inventory and discrepancy analysis for Grade 7 science and ELA to design meaningful partial participation and adapted grade-aligned academic access.',
        'Specify natural peer supports and an embedded instruction matrix so Maya practices her IEP communication and literacy goals alongside seventh-grade classmates.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Center Maya\'s purposeful eye-gaze selections, engagement with teen comics and read-aloud novels, and alertness in peer labs rather than a flawed developmental-age equivalent that confounds hand apraxia with intellect.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA Part B LRE and general-curriculum access mandates (34 CFR 300.114 and 300.320), CEC initial special-education standards on dignity and high expectations, and the principle of partial participation.',
        },
        {
          label: 'Support plan',
          guidance:
            'Embed eye-gaze partner choices, adapted Grade 7 text summaries with core vocabulary overlays, switch-activated lab timers/recordings, and structured peer-support roles inside general-education routines.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Collect embedded trial data on Maya\'s eye-gaze comprehension responses and peer communicative turns during Grade 7 lessons, reviewing inclusion fidelity and adult-proximity fading monthly.',
        },
      ],
      successCriteria: [
        'Explicitly rejects mental-age labeling and preschool sorting materials as violations of chronological age-appropriateness and presumed competence.',
        'Uses ecological inventory and discrepancy analysis to adapt Grade 7 science and ELA routines rather than removing Maya to a segregated classroom.',
        'Designs concrete partial-participation adaptations (eye-gaze response boards, adapted Grade 7 text, switch-activated lab contributions) aligned to standards.',
        'Builds natural peer supports and schedules fading of hovering paraprofessional proximity so classmates interact directly with Maya.',
      ],
      commonPitfalls: [
        'Accepting the 18-month age-equivalent score as justification for toddler toys and segregated life-skills drills.',
        'Confusing hand apraxia and absence of speech with inability to understand seventh-grade literature or science concepts.',
        'Placing Maya in Grade 7 science as a passive observer parked at the back of the room without an active communication or response role.',
        'Assigning a one-to-one adult to whisper answers or hover continuously, blocking authentic peer relationships.',
      ],
      sampleOutline: [
        'Presumed competence critique: Age-equivalent scores confound Maya\'s severe hand apraxia with cognition; substituting preschool bear sorting violates age-respectful practice and IDEA LRE access to Grade 7 curriculum.',
        'Ecological inventory: Map typical Grade 7 ELA and science routines (shared reading, lab data recording, group wrap-up) and identify exact motor/communication barriers to solve via adaptation.',
        'Grade-aligned partial participation: Provide adapted Grade 7 novel excerpts with eye-gaze comprehension choices, a switch-activated voice output device to announce lab steps, and peer-partnered lab tables.',
        'Embedded measurement: Track Maya\'s independent eye-gaze literacy/science responses and peer-directed communicative turns across three weekly lessons while monitoring adult-prompt fading.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://exceptionalchildren.org/standards/initial-practice-based-professional-preparation-standards-special-educators',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sp5547-workshop-02',
      taskType: 'IHP health safety, positioning & paraprofessional delegation',
      title: 'Enforce IHP Feeding, Positioning, and Nursing Delegation Boundaries Safely',
      prompt:
        'Resolve urgent health, positioning, and staffing-boundary gaps for a third-grade student with complex medical and motor support needs by coordinating the Individualized Healthcare Plan (IHP), therapy protocols, and legal delegation rules.',
      stimulus:
        'Ethan (Grade 3, spastic quadriplegia, G-tube, honey-thickened liquids, focal seizures) needs 90-degree pelvic-trunk alignment at meals and a written seizure protocol. Yesterday a new paraprofessional gave him unthickened juice after he coughed, tried a solo two-person lift without his gait belt, and asked the special educator to train her on G-tube bolus feeds since the school nurse comes only twice weekly.',
      estimatedMinutes: 15,
      taskParts: [
        'Identify the immediate aspiration, musculoskeletal transfer, and medical-delegation hazards in Ethan\'s current school routine and state the required emergency response.',
        'Clarify the distinct legal and professional scope-of-practice roles of the school nurse (RN), PT/OT, special educator, and paraprofessional regarding the IHP, G-tube feeds, thickened-liquid dysphagia protocols, and two-person transfers.',
        'Design a documented training, sign-off, positioning-schedule, and emergency-action verification plan integrated with Ethan\'s IEP health services under IDEA Part B.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Flag the three acute safety breaches: giving unthickened juice after coughing (aspiration risk), executing an unauthorized solo transfer without a gait belt, and requesting non-nurse training on G-tube bolus feeds.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA Part B school health services mandates (related services for medical access), CEC safety and supervision ethics, and state Nurse Practice Act delegation rules reserving clinical training and G-tube delegation to a licensed RN.',
        },
        {
          label: 'Support plan',
          guidance:
            'Halt unauthorized practices immediately, convene the RN, PT, OT, SLP, family, and administrator to update the IHP and Emergency Action Plan, post visual positioning/dysphagia guides, and schedule RN-led competency sign-offs.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Require documented RN competency verification before any delegated health procedure, enforce strict two-person transfer staffing logs, track repositioning intervals for skin integrity, and maintain confidential quick-access seizure plans.',
        },
      ],
      successCriteria: [
        'Explicitly prohibits the special educator from training or delegating G-tube feeds, identifying clinical medical delegation and competency sign-off as a licensed school nurse (RN) responsibility.',
        'Recognizes unthickened juice paired with coughing as an urgent aspiration hazard requiring strict adherence to SLP/physician dysphagia orders and immediate RN/family notification.',
        'Addresses PT/OT-guided 90-degree pelvic alignment, safe two-person transfer mechanics, and pressure-relief repositioning schedules.',
        'Integrates the IHP and Seizure Action Plan into Ethan\'s IEP related health services while respecting FERPA confidentiality and staff emergency readiness.',
      ],
      commonPitfalls: [
        'Having the special educator demonstrate G-tube feeding to the paraprofessional to cover days when the school nurse is off campus.',
        'Offering small sips of regular water or juice to "clear a cough," which sharply increases silent or overt aspiration risk.',
        'Allowing one adult to complete a transfer when a colleague is running late rather than enforcing mandatory two-person or mechanical-lift protocols.',
        'Keeping Ethan\'s seizure and aspiration protocols locked solely in the main-office binder instead of accessible confidentially to all trained staff accompanying him.',
      ],
      sampleOutline: [
        'Immediate hazard containment: Stop all unauthorized oral thin liquids, solo lifts, and non-RN G-tube instruction immediately; notify the school nurse, administrator, and Ethan\'s family regarding the aspiration incident.',
        'Scope-of-practice boundaries: The RN authors the IHP, coordinates physician orders, and conducts any legally permitted medical delegation/supervision; the SLP/OT/PT set dysphagia and positioning protocols; the special educator supervises instructional routines.',
        'Coordinated safety protocols: Embed jargon-free visual mealtime alignment checklists (90-degree pelvis/trunk, pacing, honey-thick verification), scheduled two-person lift coverage, and seizure-response drills for every assigned adult.',
        'Accountability and dignity: Document RN and PT/OT competency sign-offs, verify daily positioning and feeding logs, and maintain Ethan\'s full inclusive participation safely alongside peers.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sp5547-workshop-03',
      taskType: 'Multimodal AAC, switch-access feature matching & partner scanning',
      title: 'Match Multimodal AAC and Partner-Assisted Scanning for Complex Visual-Motor Needs',
      prompt:
        'Design a feature-matched, multimodal Augmentative and Alternative Communication (AAC) access plan and partner-modeling routine for a fifth-grade student with cortical visual impairment and severe motor apraxia.',
      stimulus:
        'Zara (Grade 5, cortical visual impairment [CVI Phase II], dystonic quadriplegia, and complex communication needs) reliably activates a right-cheek head switch and turns toward high-contrast yellow targets on black backgrounds when visual clutter is minimal. An outside consultant left a 60-cell glossy tablet grid that Zara ignores, leading staff to claim she "is not ready for AAC" and must first master cause-and-effect toys for a year.',
      estimatedMinutes: 15,
      taskParts: [
        'Refute the "not ready for AAC" prerequisite claim and analyze why the cluttered 60-cell glossy tablet grid failed to match Zara\'s CVI and motor-access profile.',
        'Conduct a multidisciplinary feature-matching plan (SLP, OT, TVI, special educator, family) pairing her reliable head-switch access with auditory-visual scanning, high-contrast reduced-array symbols, and low-tech partner-assisted scanning.',
        'Establish an Aided Language Stimulation (partner modeling) and daily communication-opportunity routine across academic, social, and transition periods without waiting for prerequisite mastery.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Connect Zara\'s reliable right-cheek switch activation and visual response to high-contrast yellow-on-black low-clutter targets against the mismatched 60-cell glossy tablet grid.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA Part B assistive technology and communication special-factor requirements, zero-prerequisite AAC evidence, and multidisciplinary feature matching across sensory (CVI), motor, and linguistic domains.',
        },
        {
          label: 'Support plan',
          guidance:
            'Deploy a low-glare, high-contrast core-vocabulary array with auditory-visual switch scanning plus a portable partner-assisted scanning flipbook, and train every partner in Aided Language Stimulation with extended wait time.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Collect daily data across communicative functions (requesting, protesting, commenting, answering academic questions), audit battery/switch mounting reliability daily, and ensure AAC travels seamlessly between home and school.',
        },
      ],
      successCriteria: [
        'Explicitly rejects cognitive or cause-and-effect prerequisites for AAC access, diagnosing the failure as an environmental and feature-matching mismatch rather than a student deficit.',
        'Integrates CVI accommodations (matte anti-glare surfaces, high-contrast color-on-black targets, reduced visual complexity, controlled lighting) with Zara\'s reliable right-cheek switch movement.',
        'Builds a true multimodal system combining high-tech auditory-visual switch scanning with low-tech partner-assisted scanning and natural gestures/vocalizations so Zara is never without a voice.',
        'Embeds Aided Language Stimulation (modeling core words without demanding immediate imitation) and generous expectant pause time across all Grade 5 settings.',
      ],
      commonPitfalls: [
        'Removing robust AAC to drill isolated cause-and-effect switch toys for a year before allowing communicative vocabulary.',
        'Forcing direct finger pointing or keeping a dense 60-cell glossy grid despite CVI Phase II visual complexity and dystonic motor barriers.',
        'Treating AAC strictly as a device for requesting snacks while omitting protesting, social joking, and Grade 5 academic commenting.',
        'Testing Zara with constant "show me X" commands instead of modeling core vocabulary naturally through Aided Language Stimulation.',
      ],
      sampleOutline: [
        'Reframing readiness: There are no prerequisites for AAC; Zara ignored the 60-cell glossy grid because glare, visual clutter, and direct-touch demands mismatched her CVI Phase II and motor profile.',
        'Multidisciplinary feature matching: Partner with the SLP, OT, and Teacher of Students with Visual Impairments (TVI) to configure a matte, high-contrast black-background core array accessed via her right-cheek head switch with auditory preview scanning.',
        'Multimodal redundancy: Pair the speech-generating system with a low-tech high-contrast partner-assisted scanning book and honor Zara\'s eye gaze, facial expressions, and vocalizations during bathing, recess, or device charging.',
        'Partner instruction and tracking: Train classroom adults and peers in Aided Language Stimulation and 10-to-15-second wait time, tracking independent communicative turns across diverse functions weekly.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://praxis.ets.org/test/special-education-severe-to-profound-5547.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sp5547-workshop-04',
      taskType: 'Systematic instruction, constant time delay & chaining',
      title: 'Eliminate Prompt Dependence Through Task Analysis, Chaining, and Constant Time Delay',
      prompt:
        'Redesign an inconsistent vocational-and-daily-living instructional routine for a ninth-grade student with severe intellectual disability and autism using systematic task analysis, chaining, constant time delay, and planned generalization.',
      stimulus:
        'Owen (Grade 9, severe intellectual disability and autism) restocks school-cafe napkin dispensers using a 10-step picture checklist. Over six weeks he completes only 2 of 10 steps independently because staff give rapid verbal cues and immediate hand-over-hand help after any one-second pause. He waits motionless for adult touch before step 3, and his routine does not transfer to the library supply cart.',
      estimatedMinutes: 15,
      taskParts: [
        'Diagnose how staff\'s one-second verbal and hand-over-hand interventions created prompt dependence, and explain why systematic errorless prompting outperforms unsystematic trial-and-error corrections.',
        'Design a 10-step task analysis paired with an explicit chaining procedure (total-task, forward, or backward) and a Constant Time Delay (CTD) schedule transitioning from 0-second to 4-second delay intervals.',
        'Build a systematic generalization and prompt-fading data sheet so Owen transfers independent work routines from the school cafe to the library cart and community settings.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Link Owen\'s 2-of-10 independent step ceiling, motionless waiting at step 3, and lack of transfer to the library cart directly to staff jumping in after one second with verbal and hand-over-hand prompts.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply evidence-based systematic instruction for learners with extensive support needs: task analysis, chaining, constant time delay (0-second errorless to fixed delay), most-to-least fading, and multiple-exemplar generalization.',
        },
        {
          label: 'Support plan',
          guidance:
            'Pair a visual step checklist with total-task chaining and Constant Time Delay (0-second controlling prompt during acquisition, then fixed 4-second wait before a gestural/model prompt), reinforcing unprompted steps differentially.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Score each task-analysis step daily by prompt level (independent, gestural, model, partial physical), set objective fade criteria, check interobserver staff fidelity, and probe generalization in the library weekly.',
        },
      ],
      successCriteria: [
        'Accurately diagnoses adult-induced prompt dependence caused by one-second verbal chatter and immediate hand-over-hand intervention.',
        'Correctly structures Constant Time Delay (0-second delay trials first for errorless acquisition, then shifting systematically to a consistent 4-second wait interval to invite independent initiation).',
        'Selects and justifies a chaining method (such as total-task chaining with a picture checklist) and differential reinforcement favoring independent responses over prompted ones.',
        'Embeds explicit generalization strategies (multiple settings, varied materials, natural cues, and fading adult proximity) alongside step-by-step prompt-level data collection.',
      ],
      commonPitfalls: [
        'Continuing hand-over-hand assistance while verbally repeating directions, which deepens prompt dependence and compromises student bodily autonomy.',
        'Jumping straight to a long wait interval without initial 0-second errorless trials when Owen has not yet learned a new step, leading to repeated errors and frustration.',
        'Recording only a global "completed job with help" checkmark instead of step-by-step independence and prompt-level data.',
        'Assuming mastery in the school cafe will automatically generalize to the library supply cart without training across multiple exemplars and natural cues.',
      ],
      sampleOutline: [
        'Prompt-dependence analysis: Immediate 1-second verbal and hand-over-hand interventions turned adult touch into the discriminative stimulus for step 3, blocking independent initiation.',
        'Task analysis and CTD protocol: Break cafe restocking into 10 observable steps paired with a visual strip; run 0-second controlling-prompt trials on unlearned steps, then move to a strict 4-second Constant Time Delay before delivering the least-intrusive effective prompt.',
        'Differential reinforcement and autonomy: Deliver richer praise and preferred reinforcers for unprompted steps than prompted steps, replacing intrusive hand-over-hand guidance with visual/model cues and natural task endpoints.',
        'Generalization and data tracking: Graph percent of independent steps daily across staff, run fidelity checks on the 4-second pause rule, and train across both cafe and library supply carts using natural environmental cues.',
      ],
      references: [
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf',
        'https://exceptionalchildren.org/standards/initial-practice-based-professional-preparation-standards-special-educators',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sp5547-workshop-05',
      taskType: 'AA-AAS construct-vs-access assessment & FCT behavior support',
      title: 'Ensure Construct-Valid AA-AAS Assessment and Function-Based Communication Support',
      prompt:
        'Address both an inaccessible state alternate-assessment plan and escalating self-injurious behavior for an eighth-grade student with deaf-blindness and multiple disabilities by aligning construct-valid AA-AAS access with medical rule-out and Functional Communication Training (FCT).',
      stimulus:
        'Nadia (Grade 8, deaf-blindness with residual low vision, tactile sign, and object-calendar routines) qualifies for the state AA-AAS. Her team plans to give standard paper-print AA-AAS items without tactile graphics or an intervener. Over three weeks, Nadia began biting her wrist during abrupt transitions and unannounced table tasks, and her mother reported mild ear-pulling at home.',
      estimatedMinutes: 15,
      taskParts: [
        'Evaluate the AA-AAS administration plan using construct-versus-access validity principles, explaining how omitting tactile/intervener accommodations invalidates academic measurement and violates IDEA assessment participation rules.',
        'Outline the required medical/pain rule-out and accessible Functional Behavior Assessment (FBA) steps before finalizing a behavioral hypothesis for Nadia\'s wrist-biting.',
        'Design a proactive Functional Communication Training (FCT) and antecedent transition plan (tactile object calendars, touch cues, finish-or-break tactile sign) that protects Nadia\'s safety without aversive or restrictive practices.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Connect Nadia\'s deaf-blind sensory profile (tactile sign, residual low vision, object calendar), paper-only AA-AAS barrier, abrupt-transition wrist-biting, and home ear-pulling indicating possible acute pain or ear infection.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA Part B assessment participation and AA-AAS guidelines (34 CFR 300.160), construct-versus-access validity, mandatory medical/sensory rule-out prior to FBA conclusions, and evidence-based FCT.',
        },
        {
          label: 'Support plan',
          guidance:
            'Secure tactile/braille/large-print AA-AAS formats with trained intervener access aligned to daily instruction, refer for immediate medical/otologic screening, and teach an instant tactile-sign/object cue for "wait," "break," or "hurts."',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Track daily transition predictability, independent FCT tactile-sign requests, and wrist-biting frequency/intensity; prohibit aversive consequences; and verify family consent and nurse/physician follow-up.',
        },
      ],
      successCriteria: [
        'Distinguishes the measured academic construct from sensory access barriers, insisting that AA-AAS administration mirror Nadia\'s daily tactile, low-vision, and intervener accommodations.',
        'Prioritizes immediate medical and dental/otologic rule-out (given recent onset of wrist-biting plus ear-pulling) before attributing self-injury solely to learned behavior.',
        'Designs a function-matched FCT plan teaching an accessible, rapid tactile-sign or tangible-symbol replacement response alongside predictable touch cues and object-calendar transition warnings.',
        'Rejects physical restraint or punitive loss of preferred sensory items, grounding safety responses in proactive de-escalation and continuous team-family data review.',
      ],
      commonPitfalls: [
        'Administering visual paper-print AA-AAS items and concluding Nadia lacks Grade 8 alternate academic comprehension when the score only reflects inaccessible print.',
        'Launching behavioral extinction (ignoring wrist-biting) before ruling out ear pain, sinus infection, or sensory shock from unannounced touch.',
        'Assuming AA-AAS eligibility automatically excuses Nadia from grade-aligned standards or removes her right to testing accommodations.',
        'Expecting Nadia to use an unfamiliar multi-step AAC sequence during distress instead of a rapid, low-effort tactile sign or object symbol that immediately honors her request.',
      ],
      sampleOutline: [
        'Construct-valid AA-AAS access: Under IDEA Part B, AA-AAS must measure alternate Grade 8 academic content rather than vision/hearing barriers; embed tactile graphics, enlarged high-contrast materials, and a trained intervener matching daily instruction.',
        'Medical rule-out first: Because wrist-biting emerged over three weeks alongside home ear-pulling, immediately coordinate with Nadia\'s parents and school nurse for medical/otologic evaluation to rule out pain.',
        'Antecedent predictability and FCT: Introduce consistent touch cues and a tactile object calendar two minutes before every transition, and teach a low-effort tactile sign or textured card for "stop/break" reinforced immediately.',
        'Ethical safety monitoring: Log transition antecedents, FCT usage, and self-injury duration daily, avoiding aversive punishments and reviewing progress jointly with the family, TVI/TODHH, and SLP.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sp5547-workshop-06',
      taskType: 'Transdisciplinary teaming & postsecondary interagency transition',
      title: 'Coordinate Transdisciplinary Role Release and Adult Interagency Handoff Before Age-21 Exit',
      prompt:
        'Design a person-centered, transdisciplinary transition and interagency coordination plan for a 19-year-old student with profound multiple disabilities approaching IDEA exit so his communication, health, community inclusion, and adult services transfer without gaps.',
      stimulus:
        'Isaiah (age 19, profound multiple disabilities, head-array power chair, eye-gaze AAC, suctioning needs) attends a district 18-21 program. His PT, OT, SLP, nurse, and teacher run isolated pull-out sessions with conflicting seating and AAC routines. No adult DD waiver, Medicaid, or VR representative has been invited to his IEP, and staff told his mother to seek plenary guardianship immediately.',
      estimatedMinutes: 15,
      taskParts: [
        'Contrast Isaiah\'s current fragmented multidisciplinary pull-out model with a true transdisciplinary teaming model featuring structured role release, integrated therapy inside community routines, and unified seating/AAC/health protocols.',
        'Design a person-centered transition and interagency handoff timeline (with parental/student consent to invite adult DD, Medicaid waiver, and vocational agencies) alongside an actionable Summary of Performance (SOP).',
        'Evaluate the staff\'s plenary-guardianship directive by explaining transfer of rights at age of majority, less-restrictive supported decision-making alternatives, and ethical boundaries against educators giving legal advice.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Address Isaiah\'s age (19, approaching 21/22 exit), head-array power mobility, eye-gaze AAC, suctioning care, conflicting pull-out therapy routines, absent adult agency invitations, and improper guardianship directive.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance:
            'Apply IDEA Part B transition interagency invitation rules (requiring prior consent), Summary of Performance requirements, transfer-of-rights notice rules, transdisciplinary teaming principles, and CEC family-empowerment ethics.',
        },
        {
          label: 'Support plan',
          guidance:
            'Facilitate a person-centered MAPS/PATH meeting centering Isaiah\'s eye-gaze preferences, unify PT/OT/SLP/RN protocols into community volunteer/recreation settings, and execute consent-backed invitations to adult DD/Medicaid/VR liaisons.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance:
            'Maintain a 24-month exit countdown checklist tracking adult waiver waitlists, portable AAC/wheelchair funding ownership, updated health care plans, and objective community-participation outcomes.',
        },
      ],
      successCriteria: [
        'Replaces fragmented pull-out therapy with transdisciplinary role release (cross-discipline coaching with clear RN safety limits on suctioning) embedded in real adult community settings.',
        'Corrects the improper plenary-guardianship directive by presenting less-restrictive options (supported decision-making, power of attorney, representative payee) and referring the family to qualified legal/advocacy resources.',
        'Specifies obtaining prior written consent before inviting outside adult agencies (DD services, Medicaid waiver, vocational rehabilitation) to Isaiah\'s transition IEP.',
        'Details a comprehensive Summary of Performance (SOP) plus equipment/AAC ownership and health-plan continuity steps to prevent the post-school "services cliff."',
      ],
      commonPitfalls: [
        'Telling Isaiah\'s mother that plenary guardianship is legally mandatory for every young adult with severe disabilities, stripping self-determination rights without exploring supported decision-making.',
        'Inviting adult DD or vocational rehabilitation representatives to the IEP meeting without first securing written consent from the adult student or authorized parent.',
        'Allowing PT, OT, and SLP to run separate therapy goals in clinic rooms rather than aligning positioning, eye-gaze communication, and head-array mobility during authentic community activities.',
        'Waiting until the final month before age-21 exit to discover that Isaiah\'s school-owned eye-gaze AAC device will not follow him into adult life.',
      ],
      sampleOutline: [
        'Transdisciplinary integration: Shift PT, OT, SLP, and transition staff to shared community routines with unified seating, eye-gaze AAC overlays, and RN-supervised suctioning protocols via disciplined role release.',
        'Person-centered planning and self-determination: Host a MAPS/PATH session incorporating Isaiah\'s eye-gaze choices; replace the blanket plenary-guardianship push with unbiased information on supported decision-making and independent legal-aid referrals.',
        'Consent-based interagency handoff: Obtain prior written consent to invite adult DD waiver, Medicaid home-health, and vocational rehabilitation liaisons now so funding, nursing coverage, and personal AAC device funding finalize before exit.',
        'Exit continuity package: Deliver an individualized Summary of Performance documenting Isaiah\'s eye-gaze communication profile, seating/transfer guides, health protocols, and preferred adult community environments.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://exceptionalchildren.org/standards/initial-practice-based-professional-preparation-standards-special-educators',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

module.exports = {
  special_education_learning_disabilities_5383,
  special_education_severe_profound_5547,
};
