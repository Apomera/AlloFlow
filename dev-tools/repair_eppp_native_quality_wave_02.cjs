#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const auditName = 'eppp_native_quality_audit_wave_02';
const reviewedAt = '2026-07-15';
const paddedPrefix = 'Under the conditions in the question, the best response is ';

const choiceRewrites = {
  'eppp-v3-cognitive-affective-046': [
    'Vivid, confidently held memories that can still contain inaccuracies',
    'Unconscious memories expressed only through changes in behavior',
    'Exact visual records preserved with photographic accuracy',
    'Emotionally neutral memories recalled with unusually low confidence',
  ],
  'eppp-v3-cognitive-affective-047': [
    'Bottom-up perception overriding every form of learned knowledge',
    'Automatic word reading interfering with controlled color naming',
    'Deliberate word reading occurring before automatic color perception',
    'Automatic color naming proceeding without interference from words',
  ],
  'eppp-v3-cognitive-affective-048': [
    'Distributed practice benefits motor learning but not verbal learning',
    'Massed practice produces stronger retention after a long delay',
    'Distributed practice improves long-term retention compared with cramming',
    'Equivalent study time produces identical retention across all schedules',
  ],
  'eppp-v3-cognitive-affective-049': [
    'Retrieval succeeds independently of the context used during learning',
    'Visual cues support retrieval whereas verbal cues generally do not',
    'Every encoding strategy creates equally effective retrieval cues',
    'Retrieval improves when available cues overlap with encoded information',
  ],
  'eppp-v3-cognitive-affective-050': [
    'High confidence and vivid detail despite declining consistency over time',
    'Low confidence and poor detail despite stable accuracy over time',
    'Unconscious procedural learning that improves performance across trials',
    'Exact preservation of every detail because the event was emotional',
  ],
  'eppp-v3-cognitive-affective-051': [
    'Improved judgment after completing many unrelated choices',
    'Reduced decision quality after making numerous prior choices',
    'Persistent fear whenever any choice must be made',
    'Rapid responding caused by insufficient factual information',
  ],
  'eppp-v3-cognitive-affective-052': [
    'Children, but not adults, incorporating suggestions into memory',
    'Eyewitness accounts remaining unchanged after misleading questions',
    'Post-event suggestions altering memory for the original experience',
    'Memory resisting distortion whenever an event is emotionally important',
  ],
  'eppp-v3-cognitive-affective-053': [
    'Structural analysis creating more durable memory than semantic analysis',
    'All processing levels producing equivalent long-term memory traces',
    'Semantic analysis producing more durable memory than shallow analysis',
    'Simple repetition determining retention regardless of processing depth',
  ],
  'eppp-v3-cognitive-affective-054': [
    'Intentionally rehearsing words for a later free-recall test',
    'Consciously describing a personally experienced event in detail',
    'Deliberately recognizing facts learned during an earlier lesson',
    'Showing priming or skill learning without conscious recollection',
  ],
  'eppp-v3-cognitive-affective-055': [
    'Recognizing an unconventional use for a familiar object',
    'Using a familiar object according to its usual purpose',
    'Repairing a familiar object by following standard instructions',
    'Remembering where a familiar object was previously stored',
  ],
  'eppp-v3-cognitive-affective-056': [
    'Focused attention detecting every visible change in a scene',
    'Focused attention causing an unexpected event to go unnoticed',
    'Visual impairment consistently reducing a person’s attentional capacity',
    'Unattended visual input receiving complete and conscious processing',
  ],
  'eppp-v3-cognitive-affective-057': [
    'Alcohol consumption increasing sustained attention in crowded settings',
    'Background noise uniformly disrupting every kind of cognitive task',
    'Selective attention following one conversation while filtering competing speech',
    'Social gatherings consistently weakening later recall of conversations',
  ],
  'eppp-v3-cognitive-affective-058': [
    'A sensory register, short-term store, and permanent archive',
    'Encoding, consolidation, storage, and retrieval as separate stages',
    'Semantic memory, episodic memory, and procedural memory systems',
    'A central executive with phonological and visuospatial subsystems',
  ],
  'eppp-v3-cognitive-affective-059': [
    'Integrating information across working-memory systems and long-term memory',
    'Storing speech sounds without any attentional control processes',
    'Rehearsing visuospatial material through an exclusively verbal mechanism',
    'Holding unlimited information in a single temporary storage system',
  ],
  'eppp-v3-cognitive-affective-060': [
    'Applying general intelligence to every emotionally difficult situation',
    'Perceiving, using, understanding, and managing emotion-related information',
    'Recalling academic facts about major theories of human emotion',
    'Maintaining physical fitness to regulate mood and interpersonal behavior',
  ],
  'eppp-v3-cognitive-affective-061': [
    'The body’s automatic neurochemical response regardless of interpretation',
    'The objective severity of an event regardless of available resources',
    'The person’s appraisal of demands and perceived coping resources',
    'The number of stressful events experienced during a given period',
  ],
  'eppp-v3-cognitive-affective-062': [
    'Recall improves whenever the retrieval setting is completely novel',
    'Recall depends on meaning and is unaffected by contextual cues',
    'Recall remains constant across different physiological and environmental states',
    'Recall improves when retrieval conditions reinstate relevant encoding cues',
  ],
  'eppp-v3-cognitive-affective-063': [
    'Competing information disrupts access to the target memory',
    'Finite storage capacity forces older memories to be deleted',
    'Random neural activity erases memories without a predictable pattern',
    'Every memory trace weakens solely because time has passed',
  ],
  'eppp-v3-cognitive-affective-064': [
    'Suppressing emotional reactions before identifying what they communicate',
    'Identifying another person’s emotion and choosing a constructive response',
    'Scoring highly on intelligence tests while avoiding emotional situations',
    'Experiencing intense emotion without monitoring or regulating its effects',
  ],
  'eppp-v3-cognitive-affective-065': [
    'Change pleasant mood without influencing attention or behavior',
    'Narrow attention toward immediate threats and defensive responses',
    'Expand possible actions and help develop enduring personal resources',
    'Provide short-lived pleasure without an adaptive psychological function',
  ],
  'eppp-v3-social-cultural-045': [
    'Overt physical attacks directed at members of a marginalized group',
    'Explicit discriminatory policies intentionally adopted by an institution',
    'Direct insults that are always delivered with conscious hostile intent',
    'Commonplace slights that can communicate bias without conscious intent',
  ],
  'eppp-v3-social-cultural-046': [
    'A favorable global judgment shaped by one positive characteristic',
    'A negative first impression that remains permanently resistant to change',
    'An attractiveness judgment that cannot influence any other evaluation',
    'A spiritual interpretation assigned to an unexplained visual experience',
  ],
  'eppp-v3-social-cultural-047': [
    'Completing enough training to master every cultural group’s practices',
    'Sustained self-reflection about power, bias, and limits of knowledge',
    'Avoiding cross-cultural work until complete cultural knowledge is achieved',
    'Studying dominant cultural practices while disregarding individual experience',
  ],
  'eppp-v3-social-cultural-048': [
    'Explaining both success and failure mainly through external circumstances',
    'Explaining both success and failure mainly through personal characteristics',
    'Claiming personal credit for success while externalizing responsibility for failure',
    'Evaluating personal strengths and weaknesses with consistently unbiased accuracy',
  ],
  'eppp-v3-social-cultural-049': [
    'Use objective standards exclusively when judging abilities and opinions',
    'Compare only with people perceived as less successful or capable',
    'Avoid interpersonal comparisons because they distort self-evaluation',
    'Compare with others when objective standards for self-evaluation are unavailable',
  ],
  'eppp-v3-social-cultural-050': [
    'Following refusal of a large request with a smaller target request',
    'Repeating the same request until the other person eventually agrees',
    'Beginning with a small request before presenting a larger target request',
    'Offering a reward before asking someone to complete the target request',
  ],
  'eppp-v3-social-cultural-051': [
    'Assimilation, conformity, obedience, and social identification',
    'Integration, assimilation, separation, and marginalization',
    'Acculturation, enculturation, accommodation, and cognitive assimilation',
    'Cooperation, competition, avoidance, and interpersonal compromise',
  ],
  'eppp-v3-social-cultural-052': [
    'Improve performance equally across simple and unfamiliar tasks',
    'Impair performance equally across simple and unfamiliar tasks',
    'Improve dominant responses but impair performance on difficult new tasks',
    'Produce no predictable effect on arousal or task performance',
  ],
  'eppp-v3-social-cultural-053': [
    'Membership provides objective evidence that the in-group is superior',
    'Favoritism is acquired only through direct reinforcement from group leaders',
    'People impartially compare each group before choosing the better one',
    'Positive group distinctiveness supports a favorable social identity',
  ],
  'eppp-v3-social-cultural-054': [
    'Equal-status teams cooperate toward a shared goal with institutional support',
    'A higher-status group supervises a lower-status group on separate tasks',
    'Group members briefly observe one another without meaningful interaction',
    'Groups compete for limited resources while authorities remain neutral',
  ],
  'eppp-v3-social-cultural-055': [
    'Any repeated contact, regardless of status or institutional context',
    'Equal status, common goals, cooperation, and support from authorities',
    'Mandatory proximity without cooperation or a meaningful shared objective',
    'Competition against another group without equal status between participants',
  ],
  'eppp-v3-lifespan-047': [
    'Remain comparatively stable or increase through much of adulthood',
    'Peak during infancy before language and schooling begin',
    'Develop independently of education and accumulated cultural knowledge',
    'Decline rapidly beginning in early adulthood for most people',
  ],
  'eppp-v3-lifespan-050': [
    'Easy, difficult, and slow-to-warm-up patterns of infant temperament',
    'Authoritative, authoritarian, permissive, and uninvolved parenting styles',
    'Secure and insecure attachment without distinct insecure patterns',
    'Secure, avoidant, resistant, and the later-described disorganized pattern',
  ],
  'eppp-v3-lifespan-051': [
    'Interpreting new information through an existing cognitive schema',
    'Creating an entirely new schema whenever information is unfamiliar',
    'Discarding prior knowledge that conflicts with a new experience',
    'Changing an existing schema to fit discrepant new information',
  ],
  'eppp-v3-lifespan-052': [
    'Tasks the child has already mastered without any assistance',
    'Tasks possible with guidance but not yet completed independently',
    'Skills that cannot be learned until a fixed biological age',
    'The child’s maximum ability under standardized testing conditions',
  ],
  'eppp-v3-lifespan-053': [
    'Social rules remain stable despite changes in cultural expectations',
    'Natural resources remain available despite changes in consumption',
    'Quantity remains constant despite a transformation in appearance',
    'Information remains permanently stored despite failures of retrieval',
  ],
  'eppp-v3-lifespan-054': [
    'Avoids contact with the caregiver when the caregiver returns',
    'Alternates between seeking and resisting contact during reunion',
    'Shows no preference between the caregiver and an unfamiliar adult',
    'Seeks the caregiver at reunion and is readily comforted',
  ],
  'eppp-v3-lifespan-055': [
    'A teacher supplies graduated help for a task just beyond independent ability',
    'A teacher seats a child physically close during independent practice',
    'A psychologist estimates ability using an individually administered IQ test',
    'A child repeatedly practices a task that is already independently mastered',
  ],
  'eppp-v3-lifespan-056': [
    'A neurological timetable controlling universal stages of motor development',
    'A relationship schema shaping expectations about self and attachment figures',
    'A learned sequence governing the acquisition of complex motor behavior',
    'A linguistic representation controlling the order of language development',
  ],
  'eppp-v3-lifespan-058': [
    'The theory contains too few qualitatively distinct stages',
    'The theory relies too heavily on evidence from many cultures',
    'The theory uses methods that cannot examine moral reasoning',
    'Its justice emphasis may undervalue care-oriented moral reasoning',
  ],
  'eppp-v3-lifespan-059': [
    'Critical periods have narrower windows with less opportunity for later development',
    'Sensitive periods apply to cognition whereas critical periods apply to emotion',
    'The two terms describe identical developmental timing and plasticity',
    'Critical periods allow more later compensation than sensitive periods',
  ],
  'eppp-v3-lifespan-060': [
    'Low responsiveness with few expectations or behavioral limits',
    'High responsiveness with clear, developmentally appropriate expectations',
    'Low responsiveness with rigid rules and unilateral decision-making',
    'High responsiveness with few consistent expectations or behavioral limits',
  ],
};

Object.assign(choiceRewrites, {
  'eppp-v3-assessment-054': ['Whether scores remain consistent across repeated administrations', 'Whether administration time is appropriate for the setting', 'Whether test content appears relevant to untrained observers', 'Whether the measure adds prediction beyond existing information'],
  'eppp-v3-assessment-055': ['Experts judge that items adequately represent the intended content domain', 'Scores remain stable when the same examinees repeat the test', 'Item correlations support a proposed set of latent dimensions', 'Scores correlate with an independently measured external criterion'],
  'eppp-v3-assessment-056': ['Visual construction, spatial planning, and nonverbal problem-solving performance', 'Verbal learning, recall, recognition, strategy use, and interference effects', 'Fine-motor speed, manual dexterity, and coordinated movement performance', 'Sustained visual attention, response inhibition, and processing speed'],
  'eppp-v3-assessment-057': ['Identify the latent dimensions responsible for correlations among items', 'Determine whether score interpretations support an intended clinical use', 'Estimate a likely true-score interval around the observed score', 'Measure agreement among independent raters scoring the same behavior'],
  'eppp-v3-assessment-058': ['Test length and the reliability of the resulting total score', 'Examinee age and expected performance in a normative sample', 'Item difficulty and discrimination considered apart from examinee trait level', 'Latent-trait level and probability of a particular item response'],
  'eppp-v3-assessment-060': ['A performance task assessing ambiguous-stimulus interpretation', 'A 21-item self-report inventory of depressive symptom severity', 'An individually administered measure of general cognitive ability', 'An informant rating scale of everyday adaptive functioning'],
  'eppp-v3-assessment-061': ['Correlating scores from two administrations separated by several weeks', 'Using current scores to predict an outcome measured years later', 'Correlating test scores with a criterion measured at the same time', 'Asking experts whether items adequately cover the intended domain'],
  'eppp-v3-assessment-062': ['Normative-sample size, with larger samples always producing a smaller SEM', 'Administration time, with longer tests always producing a larger SEM', 'Criterion validity, with stronger validity always producing a larger SEM', 'Score reliability, with lower reliability producing a larger SEM'],
  'eppp-v3-assessment-063': ['Typical prediction error around criterion scores estimated from test scores', 'Variability of test scores within the original normative sample', 'Average financial cost associated with an incorrect classification', 'Instability of test scores across two repeated administrations'],
  'eppp-v3-assessment-064': ['The scoring metric used to compare an examinee with norms', 'The condition prevalence in the population being assessed', 'The monetary cost of administering the diagnostic procedure', 'The decision threshold selected for assigning a diagnosis'],
  'eppp-v3-assessment-065': ['Fine-motor dexterity and speed during a repetitive manual task', 'Delayed recall and recognition of previously presented verbal material', 'Cognitive flexibility and shifting strategies in response to feedback', 'Receptive vocabulary and comprehension of increasingly complex syntax'],
  'eppp-v3-assessment-066': ['Reliable test scores become progressively more accurate with repetition', 'The group mean remains unchanged across every assessment', 'Repeated scores for each individual eventually equal the population mean', 'Unusually extreme initial scores tend to be less extreme on retesting'],
  'eppp-v3-assessment-067': ['Many examinees reach the upper limit, obscuring high-score differences', 'The testing environment provides insufficient physical space for examinees', 'The scoring program replaces high raw scores with an arbitrary maximum', 'Most items are too difficult, obscuring low-score differences'],
  'eppp-v3-assessment-069': ['Aptitude tests measure intelligence, whereas achievement tests measure personality', 'The labels are interchangeable because both assess identical constructs', 'Aptitude forecasts learning potential; achievement assesses acquired learning', 'Achievement tests are inherently more reliable than all aptitude tests'],
  'eppp-v3-assessment-071': ['Interpret performance by comparison with a defined reference group', 'Always provide more valid interpretations than criterion-referenced tests', 'Are appropriate only for decisions made in educational settings', 'Interpret performance against specified knowledge or skill standards'],
  'eppp-v3-assessment-073': ['Contains inconsistent items and was administered without standard procedures', 'Measures a stable construct consistently within and across occasions', 'Has homogeneous items but assesses a construct that changes over time', 'Predicts an external criterion despite inconsistent item content'],
  'eppp-v3-assessment-074': ['An extreme elevation far above the usual clinical interpretation range', 'A below-average score approximately one standard deviation below the mean', 'An average score that generally requires no contextual interpretation', 'An elevation commonly used as a threshold for clinical interpretation'],
  'eppp-v3-assessment-075': ['Scores cluster at the upper or lower limit of the instrument', 'Reliability becomes perfect because all examinees receive similar scores', 'Only one examinee completes the assessment during standardization', 'Items evenly differentiate examinees across the entire ability continuum'],
  'eppp-v3-assessment-076': ['Removing standardized coding so examiners rely on clinical impressions', 'Using evidence-guided variables, international norms, and standardized administration', 'Converting the inkblot task into a conventional self-report questionnaire', 'Reducing administration to one card selected by the individual examiner'],
  'eppp-v3-assessment-077': ['Ninety-five percent of examinees in the norm group earned scores in that interval', 'The observed score has a ninety-five percent probability of being perfectly reliable', 'Across repeated interval construction, about ninety-five percent contain the true score', 'The true score has a ninety-five percent probability of equaling the interval midpoint'],
  'eppp-v3-assessment-078': ['Achievement scales used to compare academic skills with grade-level norms', 'No response-style indicators because only clinical scales are interpreted', 'Clinical scales without measures of inconsistent or atypical responding', 'L, F, K, VRIN, TRIN, and other response-validity indicators'],
  'eppp-v3-assessment-080': ['Score reliability without regard to prevalence or classification accuracy', 'Condition prevalence together with test sensitivity and specificity', 'Examiner experience without considering classification properties of the test', 'Test length without regard to prevalence or decision thresholds'],
});

Object.assign(choiceRewrites, {
  'eppp-v3-intervention-059': ['Diagnostic agreement, case formulation, and a discharge plan', 'Assessment selection, intervention delivery, and outcome measurement', 'Interpretation of transference, countertransference, and resistance', 'Agreement on goals and tasks plus a collaborative bond'],
  'eppp-v3-intervention-060': ['Building psychological flexibility through acceptance and values-guided action', 'Following fixed behavioral protocols while avoiding private experiences', 'Interpreting dreams to uncover unconscious wishes and unresolved conflict', 'Eliminating unwanted thoughts before taking meaningful behavioral action'],
  'eppp-v3-intervention-061': ['Giving standardized reading material without checking client understanding', 'Lecturing clients about diagnosis without inviting questions or collaboration', 'Teaching clients and families about symptoms, treatment, coping, and self-management', 'Withholding clinical information to prevent clients from becoming distressed'],
  'eppp-v3-intervention-062': ['Clinical intuition without systematic research or patient input', 'Patient preferences without clinical expertise or research evidence', 'Research findings without clinical expertise or patient characteristics', 'Research evidence, clinical expertise, and patient characteristics and preferences'],
  'eppp-v3-intervention-064': ['Id impulses, ego defenses, superego demands, and libido', 'Grief, role disputes, role transitions, and interpersonal deficits', 'Childhood, adolescence, adulthood, and later-life developmental change', 'Biological, psychological, social, and cultural levels of analysis'],
  'eppp-v3-intervention-065': ['Free association and interpretation of unconscious dream symbolism', 'Early-childhood conflicts presumed to determine all current symptoms', 'Current interpersonal relationships, roles, losses, and communication patterns', 'Behavioral experiments and thought records targeting cognitive distortions'],
  'eppp-v3-intervention-067': ['Repeated imaginal and in-vivo exposure that supports corrective learning', 'Medication management without systematic confrontation of trauma reminders', 'Relaxation training while consistently avoiding trauma-related memories', 'Cognitive restructuring without behavioral contact with avoided situations'],
  'eppp-v3-intervention-069': ['Substance-use triggers without examining trauma-related beliefs or meanings', 'Somatic sensations without examining interpretations of the traumatic event', 'Stuck points involving maladaptive beliefs about the trauma and its aftermath', 'Interpersonal conflict without examining beliefs related to traumatic experience'],
  'eppp-v3-intervention-071': ['Current grief, role disputes, role transitions, or interpersonal deficits', 'Negative automatic thoughts and enduring maladaptive cognitive schemas', 'Neurotransmitter abnormalities considered independently of social relationships', 'Repressed childhood memories considered independently of current relationships'],
  'eppp-v3-intervention-072': ['Developing an extensive causal analysis before discussing any desired change', 'Building exceptions, strengths, and concrete descriptions of a preferred future', 'Using medication as the primary intervention for every presenting problem', 'Requiring long-term exploration before establishing observable treatment goals'],
  'eppp-v3-intervention-074': ['Classical psychoanalysis using interpretation of dreams and free association', 'Gestalt therapy using present-centered awareness and experiential dialogue', 'Person-centered therapy using empathy and unconditional positive regard', 'Rational emotive behavior therapy using disputation and effective new beliefs'],
});

Object.assign(choiceRewrites, {
  'eppp-v3-professional-001': ['Take reasonable steps to avoid harm and minimize foreseeable unavoidable harm', 'Guarantee that no client experiences distress or an unfavorable outcome', 'Limit professional practice to clients whose treatment carries no risk', 'Avoid any intervention that could produce temporary emotional discomfort'],
  'eppp-v3-professional-002': ['Managing fees and financial records with complete administrative accuracy', 'Establishing trust, honoring responsibilities, and clarifying professional roles', 'Applying personal religious commitments within every professional relationship', 'Following institutional rules even when they conflict with ethical duties'],
  'eppp-v3-professional-004': ['A fixed number of years in independent clinical practice', 'Board certification in every specialty area addressed in treatment', 'Possession of a doctoral degree regardless of relevant supervised training', 'Relevant education, training, supervised experience, consultation, study, or experience'],
  'eppp-v3-professional-005': ['Strive to contribute some professional time for little or no compensation', 'Provide free treatment whenever any prospective client requests it', 'Reserve uncompensated services exclusively for psychologists in public agencies', 'Devote a mandatory percentage of all clinical hours to free services'],
  'eppp-v3-professional-006': ['Occur outside the office, because location alone makes them unethical', 'Could impair objectivity or effectiveness or risk exploitation or harm', 'Involve an adult client, because age determines whether roles may overlap', 'Arise in forensic practice, because only forensic multiple roles are prohibited'],
  'eppp-v3-professional-007': ['Stop all professional activity until a court resolves the conflict', 'Follow the legal demand without considering duties under the Ethics Code', 'Clarify the conflict and take reasonable steps to resolve it ethically', 'Ignore the law whenever it differs from personal values held by the psychologist'],
  'eppp-v3-professional-008': ['Giving legal institutions authority over every psychological decision', 'Restricting psychological services to clients with the greatest resources', 'Punishing every ethical violation with an identical professional sanction', 'Promoting fair access and guarding against bias or unjust practices'],
  'eppp-v3-professional-009': ['Clarify the evaluative role and provide only accurate, supportable conclusions', 'Assume the client is committing fraud and report the request immediately', 'Refuse every request because any advocacy document creates a dual relationship', 'Include the requested conclusions even when clinical information does not support them'],
  'eppp-v3-professional-010': ['Is prohibited whenever goods or services replace monetary payment', 'May occur if it is not clinically contraindicated and is not exploitative', 'Is preferred because it eliminates financial boundaries in treatment', 'Is permitted only when a psychologist practices in a rural community'],
  'eppp-v3-professional-013': ['Protect the rights and welfare of people participating in research', 'Select journals and prepare accepted studies for scientific publication', 'Recruit and appoint investigators for an institutional research program', 'Award grant funding according to the scientific value of proposals'],
  'eppp-v3-professional-014': ['Resign immediately without first addressing the ethical implications internally', 'Clarify the conflict and seek an ethical resolution within the organization', 'Follow the organizational demand because employment policies supersede ethics', 'Publicly disclose confidential information before using available institutional channels'],
  'eppp-v3-professional-015': ['Advocate for the position of the party whose case appears strongest', 'Advance the retaining attorney theory even when evidence is inconsistent', 'Offer objective, supportable opinions within the relevant area of professional competence', 'Help the jury reach a preferred verdict regardless of evidentiary limitations'],
  'eppp-v3-professional-016': ['Ignore the unfamiliar issue and continue unchanged treatment in familiar areas', 'Continue independently while relying only on unsupervised reading about the issue', 'End services immediately without considering continuity of care or referral needs', 'Obtain appropriate consultation or training, or arrange a suitable referral'],
  'eppp-v3-professional-019': ['What this particular client expected the psychologist to do', 'What an average person without professional training might have done', 'What a reasonably prudent psychologist would do under similar circumstances', 'What the most risk-averse specialist could possibly have done'],
  'eppp-v3-professional-020': ['Provides psychological services in more than one physical setting', 'Uses techniques drawn from multiple evidence-based treatment approaches', 'Maintains a professional caseload involving many unrelated clients', 'Holds a professional role and another role with the same person'],
  'eppp-v3-professional-021': ['Remain impartial, define the referral scope, and gather sufficient relevant data', 'Advocate for the parent who initially requested and funded the evaluation', 'Interview only the child because collateral information creates unavoidable bias', 'Determine custody from test scores without examining relationships or context'],
  'eppp-v3-professional-025': ['After considering treatment issues and discussing them with the client', 'Only after obtaining a written court order requiring concurrent treatment', 'Never, because concurrent or successive services are always prohibited', 'Only after the client permanently ends every service with the other psychologist'],
  'eppp-v3-professional-026': ['Wait for a formal client complaint before discussing the conduct', 'Address the conduct, protect the client, and take proportionate corrective action', 'File a licensing-board complaint before obtaining enough information to assess risk', 'Terminate supervision immediately without arranging client protection or continuity'],
  'eppp-v3-professional-027': ['A competence concern caused solely by the pending divorce', 'An informed-consent issue with no implications for roles or objectivity', 'A multiple-role conflict that may impair objectivity or create harm', 'An automatic confidentiality breach before any information has been disclosed'],
});

Object.assign(choiceRewrites, {
  'eppp-v3-professional-028': ['Alphabetical order regardless of the actual contribution made by each author', 'Academic rank and seniority within the department or institution', 'Responsibility for obtaining funding regardless of scientific involvement', 'Relative scientific or professional contribution to the published work'],
  'eppp-v3-professional-030': ['Protecting psychotherapy notes without addressing standardized assessment materials', 'Maintaining test integrity and preventing unauthorized access to protected content', 'Ensuring every assessment occurs in a physically secured examination room', 'Reporting every suspected testing irregularity directly to the national association'],
  'eppp-v3-professional-031': ['Proceed without permission because the service is intended to be beneficial', 'Obtain permission while disregarding individual preferences and welfare', 'Obtain appropriate permission, seek assent, and consider preferences and welfare', 'Treat silence as informed agreement whenever direct consent is unavailable'],
  'eppp-v3-professional-033': ['Standard 4.07, concerning confidential information used in publications or teaching', 'Standard 5.01, concerning false or deceptive public statements', 'Standard 6.01, concerning documentation and maintenance of professional records', 'Standard 2.01, concerning boundaries of professional competence'],
  'eppp-v3-professional-034': ['Only the organization, because individual participants cannot have confidentiality interests', 'All relevant parties through clear explanations of roles, recipients, and confidentiality limits', 'Only the referral source, because it controls every later use of information', 'No party, because organizational services are exempt from confidentiality standards'],
  'eppp-v3-professional-037': ['Facilitating services, later accountability, and compliance with legal or institutional duties', 'Creating deidentified content for routine advertising on social-media platforms', 'Supporting marketing claims about treatment effectiveness and client satisfaction', 'Preserving information solely for private future use by the psychologist'],
  'eppp-v3-professional-038': ['Debrief only when deception occurred and withhold all study findings otherwise', 'Offer appropriate information about the research and correct known misconceptions', 'Debrief animal studies but not research involving human participants', 'Provide detailed results immediately even when delay is scientifically justified'],
  'eppp-v3-professional-040': ['Memorizing fixed traits and customs attributed to each cultural group', 'Assuming cultural similarity is necessary for an effective therapeutic alliance', 'Achieving final mastery that eliminates the need for further self-reflection', 'Practicing ongoing self-reflection and learning from clients lived expertise'],
  'eppp-v3-professional-041': ['Assessment purpose, test characteristics, abilities, and situational influences on accuracy', 'Clinical impression alone without considering standardized test information', 'The conclusion preferred by the referral source regardless of data limitations', 'Numerical test scores without considering language, disability, or contextual factors'],
  'eppp-v3-professional-043': ['Patient preferences without relevant research evidence or clinical expertise', 'Randomized trials without other research designs or individual patient context', 'Best research, clinical expertise, and patient characteristics and preferences', 'Clinical experience without systematic evidence or patient collaboration'],
  'eppp-v3-professional-048': ['Accurate descriptions of completed specialized professional training', 'Accurate statements about languages in which services are provided', 'Clear information about a legitimately offered sliding-fee arrangement', 'Testimonials from current clients or people vulnerable to undue influence'],
  'eppp-v3-professional-049': ['Supervisees progress toward autonomy and need changing supervisory support', 'Only independently licensed clinicians benefit from structured professional supervision', 'Supervisee growth is random and cannot inform supervisory interventions', 'Every supervisee requires the same structure regardless of developmental level'],
  'eppp-v3-professional-050': ['Only payment arrangements because couple and individual sessions are otherwise equivalent', 'Confidentiality expectations, role clarity, and informed consent for individual sessions', 'Only insurance coding because clinical boundaries remain unchanged', 'Only record storage because information-sharing expectations are self-evident'],
  'eppp-v3-professional-051': ['Administrator, mediator, and researcher as the three supervisory roles', 'Mentor, sponsor, and evaluator as the three supervisory roles', 'Teacher, counselor, and consultant as the three supervisory roles', 'Therapist, diagnostician, and case manager as the three supervisory roles'],
  'eppp-v3-professional-053': ['Changes in beliefs and worldview from empathic exposure to trauma', 'General dissatisfaction with salary, promotion, or organizational leadership', 'Workload strain caused by too many unrelated administrative responsibilities', 'Physical tiredness after a temporary period of unusually long workdays'],
  'eppp-v3-professional-055': ['Unethical only when they occur in rural or close-knit communities', 'Always unethical whenever two roles exist with the same person', 'Problematic when they risk impaired work, exploitation, or harm', 'Acceptable whenever a client signs a document acknowledging both roles'],
  'eppp-v3-professional-057': ['Avoid actions that create an unreasonable risk of client harm', 'Maintain complete neutrality about every client goal and personal value', 'Maximize administrative efficiency even when individual needs differ', 'Guarantee that every professional action produces a measurable benefit'],
  'eppp-v3-professional-058': ['A client misses one payment without a contractual or clinical review', 'Services are no longer needed, are not beneficial, or are causing harm', 'A client respectfully questions the rationale for the current treatment approach', 'The psychologist prefers to end services without pretermination planning'],
  'eppp-v3-professional-060': ['The first ethics code was adopted in 1950 and has never changed', 'A wholly new enforceable code replaced the prior code during 2025', 'The 1990 code remains current without any later revisions or amendments', 'The 2002 code remains published with amendments effective in 2010 and 2017'],
});

const promptRewrites = {
  'eppp-v3-cognitive-affective-050': 'In a longitudinal study, confidence in memories of learning about a major public event remains high while consistency declines. This pattern best illustrates:',
  'eppp-v3-cognitive-affective-059': 'In Baddeley’s working-memory model, the episodic buffer primarily supports:',
  'eppp-v3-cognitive-affective-064': 'Which behavior best demonstrates emotional intelligence as described by Mayer and Salovey?',
  'eppp-v3-social-cultural-054': 'Which intergroup program best reflects Allport’s contact hypothesis?',
  'eppp-v3-lifespan-055': 'Which example best illustrates teaching within Vygotsky’s zone of proximal development?',
};

const rationaleRewrites = {
  'eppp-v3-cognitive-affective-050': 'Flashbulb memories can remain vivid and confidently held even as their consistency declines. Emotional importance does not make memory a literal or perfectly accurate record.',
  'eppp-v3-cognitive-affective-059': 'Baddeley added the episodic buffer as a limited-capacity system that binds information from the phonological loop, visuospatial sketchpad, and long-term memory into integrated representations.',
  'eppp-v3-cognitive-affective-064': 'The ability model of emotional intelligence includes perceiving emotion, using emotion to facilitate thought, understanding emotion, and managing emotion. Identifying another person’s feelings and responding constructively applies these abilities.',
  'eppp-v3-social-cultural-054': 'Allport proposed that intergroup contact is most likely to reduce prejudice when participants have equal status, pursue common goals, cooperate, and receive support from authorities or institutions.',
  'eppp-v3-lifespan-055': 'The zone of proximal development spans tasks a learner cannot yet perform independently but can complete with capable guidance. Graduated assistance, or scaffolding, is therefore the best example.',
};


Object.assign(promptRewrites, {
  'eppp-v3-assessment-074': 'On many MMPI-2 clinical scales, a T-score of 65 is typically interpreted as:',
  'eppp-v3-assessment-077': 'Which interpretation best describes a 95% confidence interval constructed around an observed test score?',
  'eppp-v3-professional-005': 'APA General Principle E indicates that psychologists should:',
  'eppp-v3-professional-006': 'Psychologists should avoid multiple relationships that:',
  'eppp-v3-professional-009': 'A treating psychologist is asked to write a letter supporting a disability claim submitted by a client. The psychologist should:',
  'eppp-v3-professional-010': 'Under APA Ethics Code Standard 6.05, bartering for psychological services:',
  'eppp-v3-professional-021': 'In a child-custody evaluation, the psychologist most appropriate guiding approach is to:',
  'eppp-v3-professional-031': 'When a person lacks capacity to give informed consent, psychologists generally should:',
  'eppp-v3-professional-033': 'A psychologist publishes identifiable material from sessions with a client without disguising it or obtaining written consent. Which standard is most directly implicated?',
  'eppp-v3-professional-034': 'When psychologists provide services through an organization, confidentiality and role information should be explained to:',
  'eppp-v3-professional-038': 'Under APA Ethics Code Standard 8.08, psychologists generally should:',
  'eppp-v3-professional-055': 'Under APA Ethics Code Standard 3.05, multiple relationships are:',
  'eppp-v3-professional-058': 'Which circumstance is explicitly recognized by APA Ethics Code Standard 10.10 as a possible basis for terminating therapy?',
  'eppp-v3-professional-060': 'Which description accurately identifies the APA Ethics Code currently published by APA?',
});

Object.assign(rationaleRewrites, {
  'eppp-v3-assessment-074': 'A T-score has a mean of 50 and standard deviation of 10. On many MMPI-2 clinical scales, 65 is commonly used as an interpretive elevation threshold, but meaning still depends on the scale, validity indicators, referral question, and broader assessment context.',
  'eppp-v3-assessment-077': 'Under a frequentist interpretation, the procedure is calibrated so that about 95% of intervals constructed across repeated comparable measurements contain the examinee true score. The statement concerns the long-run performance of the interval procedure.',
  'eppp-v3-professional-005': 'APA General Principle E states that psychologists strive to contribute a portion of their professional time for little or no compensation or personal advantage. General Principles are aspirational rather than enforceable rules.',
  'eppp-v3-professional-006': 'Standard 3.05 prohibits entering a multiple relationship when it could reasonably be expected to impair objectivity, competence, or effectiveness, or otherwise risk exploitation or harm. The existence of two roles alone does not make every relationship unethical.',
  'eppp-v3-professional-007': 'Standard 1.02 directs psychologists to clarify the nature of a law-ethics conflict, make known their commitment to the Ethics Code, and take reasonable steps to resolve the conflict consistently with the Code. The standard may never be used to justify violating human rights.',
  'eppp-v3-professional-009': 'Before writing the letter, the psychologist should clarify whether the task is treatment advocacy or a formal disability evaluation, remain within competence, identify the information supporting each conclusion, and avoid claims the clinical record cannot support.',
  'eppp-v3-professional-010': 'Standard 6.05 permits barter only when it is not clinically contraindicated and the resulting arrangement is not exploitative. The Code does not describe barter as universally prohibited or preferred.',
  'eppp-v3-professional-014': 'When organizational demands conflict with the Ethics Code, Standard 1.03 calls for psychologists to clarify the conflict, make known their ethical commitment, and take reasonable steps to resolve it consistently with the Code. It cannot justify human-rights violations.',
  'eppp-v3-professional-015': 'An expert witness should provide impartial, accurate, and supportable opinions within the boundaries of competence. Retention by one party does not turn the psychologist into an advocate for that party preferred conclusion.',
  'eppp-v3-professional-016': 'A psychologist who lacks needed competence should obtain appropriate education, training, consultation, or supervision, or arrange a suitable referral. Any transition should also address client welfare and continuity of care rather than imposing abrupt abandonment.',
  'eppp-v3-professional-021': 'A custody evaluator should remain impartial, define the referral question and scope, use methods sufficient to support the opinions offered, and consider relevant relationships and collateral information. The evaluator is not an advocate for either parent.',
  'eppp-v3-professional-026': 'Supervisors are responsible for addressing supervisee conduct that may endanger a client. The response should protect the client, assess the facts, provide corrective supervision, and escalate proportionately when risk or reporting duties require it.',
  'eppp-v3-professional-031': 'When a person lacks capacity to provide informed consent, Standard 3.10 calls for psychologists to obtain appropriate permission, seek assent when feasible, and consider individual preferences and best interests.',
  'eppp-v3-professional-033': 'Standard 4.07 permits using confidential information in writings, lectures, or other public media when the psychologist reasonably disguises the person or organization, obtains written consent, or has another valid authorization.',
  'eppp-v3-professional-034': 'Standard 3.11 requires psychologists serving organizations to explain the nature and objectives of services, intended recipients, which individuals are clients, the psychologist relationship to relevant parties, probable uses of information, and confidentiality limits.',
  'eppp-v3-professional-037': 'Standard 6.01 links records to facilitating later services, allowing replication of research, meeting institutional requirements, ensuring billing accuracy, and complying with law. Records are not maintained primarily for marketing or personal use.',
  'eppp-v3-professional-038': 'Standard 8.08 generally requires a prompt opportunity to obtain appropriate information about the nature, results, and conclusions of research and requires correction of known misconceptions. Disclosure may be delayed or withheld when scientifically or humanely justified and harm is reduced.',
  'eppp-v3-professional-055': 'A multiple relationship is not automatically unethical. Standard 3.05 focuses on relationships reasonably expected to impair objectivity, competence, or effectiveness, or to create exploitation or harm; informed consent alone does not neutralize those risks.',
  'eppp-v3-professional-058': 'Standard 10.10 recognizes termination when it is reasonably clear that the client no longer needs the service, is not likely to benefit, or is being harmed by continued service. It also addresses threat and nonpayment circumstances and ordinarily requires appropriate pretermination planning.',
  'eppp-v3-professional-060': 'APA continues to publish the Ethics Code adopted in 2002, as amended effective June 1, 2010, and January 1, 2017. A broader revision process has been underway, but a draft or public-comment process is not itself a newly enforceable replacement code.',
});

const feedbackRewrites = {
  'eppp-v3-assessment-065': { 3: 'The WCST does not assess receptive-language comprehension; it requires the examinee to infer and shift sorting rules from feedback.' },
  'eppp-v3-professional-049': { 2: 'Developmental supervision models propose discernible changes in skill, confidence, autonomy, and support needs rather than random development.' },
  'eppp-v3-professional-031': {
    0: 'Beneficial intent does not replace informed-consent protections when a person lacks capacity to consent.',
    1: 'Appropriate permission is necessary, but individual preferences, assent, and best interests also remain ethically relevant.',
    3: 'Silence is not informed agreement; the psychologist should obtain appropriate permission and seek assent when feasible.',
  },
};

const sourceRepairs = {
  'eppp-v3-cognitive-affective-046': {
    references: ['https://doi.org/10.1016/0010-0277(77)90018-X'],
    sourceDetails: [{
      url: 'https://doi.org/10.1016/0010-0277(77)90018-X',
      title: 'Brown, R., & Kulik, J. (1977). Flashbulb memories. Cognition, 5(1), 73-99.',
      credibility: 'Cognition is a peer-reviewed scientific journal, and this traceable DOI identifies the foundational empirical article that introduced the flashbulb-memory construct.',
    }],
  },
  'eppp-v3-cognitive-affective-050': {
    references: ['https://doi.org/10.1037/0278-7393.29.3.455'],
    sourceDetails: [{
      url: 'https://doi.org/10.1037/0278-7393.29.3.455',
      title: 'Talarico, J. M., & Rubin, D. C. (2003). Confidence, not consistency, characterizes flashbulb memories. Journal of Experimental Psychology: General, 132(3), 455-476.',
      credibility: 'This peer-reviewed longitudinal study directly compares confidence and consistency in flashbulb and everyday memories, making it a primary source for the tested distinction.',
    }],
  },
  'eppp-v3-professional-060': {
    references: ['https://www.apa.org/ethics/code'],
    sourceDetails: [{
      url: 'https://www.apa.org/ethics/code',
      title: 'American Psychological Association. Ethical Principles of Psychologists and Code of Conduct (2002, amended effective 2010 and 2017).',
      credibility: 'The American Psychological Association publishes the controlling professional ethics standards tested by this item, so its official code page is the primary authoritative source.',
    }],
  },
};

Object.assign(sourceRepairs, {
  'eppp-v3-cognitive-affective-052': {
    references: ['https://doi.org/10.1016/S0022-5371(74)80011-3'],
    sourceDetails: [{
      url: 'https://doi.org/10.1016/S0022-5371(74)80011-3',
      title: 'Loftus, E. F., & Palmer, J. C. (1974). Reconstruction of automobile destruction: An example of the interaction between language and memory. Journal of Verbal Learning and Verbal Behavior, 13(5), 585-589.',
      credibility: 'This peer-reviewed experimental article is the primary study demonstrating that post-event question wording can alter later eyewitness reports.',
    }],
  },
  'eppp-v3-cognitive-affective-053': {
    references: ['https://doi.org/10.1016/S0022-5371(72)80001-X'],
    sourceDetails: [{
      url: 'https://doi.org/10.1016/S0022-5371(72)80001-X',
      title: 'Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. Journal of Verbal Learning and Verbal Behavior, 11(6), 671-684.',
      credibility: 'This peer-reviewed scholarly article introduced the levels-of-processing framework directly tested by the item.',
    }],
  },
  'eppp-v3-lifespan-047': {
    references: ['https://doi.org/10.1016/0001-6918(67)90011-X'],
    sourceDetails: [{
      url: 'https://doi.org/10.1016/0001-6918(67)90011-X',
      title: 'Horn, J. L., & Cattell, R. B. (1967). Age differences in fluid and crystallized intelligence. Acta Psychologica, 26, 107-129.',
      credibility: 'This peer-reviewed primary study directly examined adult age differences in fluid and crystallized intelligence.',
    }],
  },
});

function wordCount(value) {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function cleanOptionFeedback(value, item) {
  let cleaned = String(value || '').trim();
  cleaned = cleaned.replace(/^"[^"]+" is not best because\s*/i, '');
  cleaned = cleaned.replace(/\s*Compare this option with the keyed response and the cited distinction\.?$/i, '');
  cleaned = cleaned.replace(/\b(ALTER|SUCCESSES|FAILURES|AT THE SAME TIME|OVER AND ABOVE|DEPTH|EXPLICIT|NOT|ALL)\b/g, (match) => match.toLowerCase());
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned && !/[.!?]$/.test(cleaned)) cleaned += '.';
  if (cleaned) cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  if (cleaned.length < 80) {
    const contrast = item.choices[item.answerIndex].replace(/[.]$/, '');
    cleaned += ' The keyed response instead describes ' + contrast[0].toLowerCase() + contrast.slice(1) + '.';
  }
  return cleaned;
}

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

let bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
const rewriteIds = Object.keys(choiceRewrites).sort();
const rewriteSet = new Set(rewriteIds);
const queued = bank.filter((item) => rewriteSet.has(item.id));
if (queued.length !== 113) throw new Error('Expected exactly 113 rewrite targets, found ' + queued.length + '.');
const queuedIds = queued.map((item) => item.id).sort();
if (JSON.stringify(queuedIds) !== JSON.stringify(rewriteIds)) throw new Error('Choice rewrite map does not exactly match the 113-item target set.');

for (const item of bank) {
  const choices = choiceRewrites[item.id];
  if (!choices) continue;
  if (!Array.isArray(choices) || choices.length !== 4 || choices.some((choice) => !String(choice).trim())) throw new Error('Invalid choices for ' + item.id + '.');
  item.prompt = promptRewrites[item.id] || item.prompt;
  item.choices = choices;
  item.rationale = rationaleRewrites[item.id] || item.rationale;
  item.choiceRationales = item.choiceRationales.map((feedback, index) => index === item.answerIndex ? item.rationale : (feedbackRewrites[item.id]?.[index] || cleanOptionFeedback(feedback, item)));
  if (item.choiceRationales.some((feedback) => wordCount(feedback) < 5)) throw new Error('Insufficient option feedback for ' + item.id + '.');
  if (sourceRepairs[item.id]) Object.assign(item, sourceRepairs[item.id]);
  item.qaReviewedAt = reviewedAt;
  item.wordingReviewStatus = 'editorial-deep-rewrite-pass';
  item.wordingReviewWave = 'eppp-native-quality-wave-02';
}

const remainingPadded = bank.filter((item) => item.choices.some((choice) => choice.includes(paddedPrefix)));
const lengthFindings = [];
for (const id of rewriteIds) {
  const item = bank.find((candidate) => candidate.id === id);
  const lengths = item.choices.map(wordCount);
  const answerLength = lengths[item.answerIndex];
  const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  const ratio = Math.max(...lengths) / Math.max(1, Math.min(...lengths));
  if (answerLength - longestDistractor > 2 || ratio > 1.8) lengthFindings.push({ id, lengths, answerIndex: item.answerIndex, ratio: Number(ratio.toFixed(2)) });
}
if (remainingPadded.length) throw new Error('Mechanically padded choices remain after wave two.');
if (lengthFindings.length) throw new Error('Parallel-choice gate failed: ' + JSON.stringify(lengthFindings, null, 2));

const audit = {
  schemaVersion: 1,
  reviewWave: 'eppp-native-quality-wave-02',
  reviewedAt,
  scope: 'Deep editorial rewrite of all 113 choice sets held from wave one because removing their mechanical padding would expose answer-length clues.',
  summary: {
    totalItems: bank.length,
    queuedItemsReviewed: queued.length,
    choiceSetsRewritten: rewriteIds.length,
    promptsReframedToReduceDuplicationOrCorrectScope: Object.keys(promptRewrites).length,
    rationalesSubstantivelyRevised: Object.keys(rationaleRewrites).length,
    sourceRecordsRepaired: Object.keys(sourceRepairs).length,
    remainingMechanicallyPaddedItems: remainingPadded.length,
    remainingParallelChoiceFindings: lengthFindings.length,
    status: 'pass',
  },
  domainCounts: Object.fromEntries(Object.entries(queued.reduce((counts, item) => {
    counts[item.domainId] = (counts[item.domainId] || 0) + 1;
    return counts;
  }, {})).sort(([left], [right]) => left.localeCompare(right))),
  rewrittenItemIds: rewriteIds,
  sourceRepairs: Object.keys(sourceRepairs),
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};
const markdown = '# EPPP native quality repair - wave 02\n\nReviewed: ' + reviewedAt + '\n\n## Result\n\n- All 113 mechanically padded choice sets received content-specific rewrites.\n- All incorrect choices retain option-specific explanatory feedback.\n- ' + Object.keys(promptRewrites).length + ' prompts were reframed to reduce duplication or correct scope.\n- ' + Object.keys(rationaleRewrites).length + ' rationales received substantive accuracy or scope revisions.\n- ' + Object.keys(sourceRepairs).length + ' source records were repaired or upgraded.\n- 0 mechanical-padding or parallel-choice findings remain in this wave.\n\n> Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.\n\n## Rewritten items\n\n' + rewriteIds.map((id) => '- ' + id).join('\n') + '\n';
const json = JSON.stringify(bank, null, 2) + '\n';
writeFileWithRetry(sourcePath, json);
writeFileWithRetry(deployPath, json);
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, auditName + '.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, auditName + '.md'), markdown);
}
console.log('EPPP quality wave 02: ' + rewriteIds.length + ' deep choice-set rewrites; 0 padding or parallel-choice findings remain.');
