'use strict';

const ap_calculus_ab_foundation_pilot = {
  'ap-calc-ab-ch-01': [
    'A two-sided limit exists only when left- and right-hand limits both exist and are equal; continuity at x = c further requires f(c) to exist and equal that limit.',
    'Factor, rationalize, or simplify common factors to resolve 0/0 removable holes, whereas a nonzero numerator over zero signals a vertical asymptote and infinite limit behavior.',
    'To apply the Intermediate Value Theorem on [a, b], first verify continuity on the closed interval and show the target value k lies strictly between f(a) and f(b).'
  ],
  'ap-calc-ab-ch-02': [
    'Recognize difference-quotient limits of (f(x+h)-f(x))/h or (f(x)-f(a))/(x-a) as f\'(x) or f\'(a) so you differentiate directly instead of evaluating an indeterminate limit.',
    'Differentiability implies continuity, but continuity does not guarantee differentiability; sharp corners, cusps, vertical tangents, and jumps all make f\'(c) fail to exist.',
    'Apply the product rule (f\'g + fg\') and quotient rule ((f\'g - fg\')/g^2) systematically, and remember trig derivatives for cos, cot, and csc carry negative signs.'
  ],
  'ap-calc-ab-ch-03': [
    'For nested compositions, differentiate from the outermost layer inward and multiply by every inner derivative; omitting an inner factor is the top Chain Rule error.',
    'In implicit differentiation, attach dy/dx whenever differentiating a y-term with respect to x, then isolate dy/dx; for d^2y/dx^2, substitute dy/dx back into the result.',
    'For an inverse function g = f^-1, evaluate g\'(b) = 1 / f\'(a) where f(a) = b, matching the output b to its corresponding input a before substituting into f\'.'
  ],
  'ap-calc-ab-ch-04': [
    'Always interpret a derivative in context with four elements: the quantity changing, whether it increases or decreases, units of output per input, and the exact instant.',
    'In straight-line motion, speed increases when velocity and acceleration share the same sign and decreases when they have opposite signs; never judge speed from acceleration alone.',
    'Verify the 0/0 or infinity/infinity form by checking numerator and denominator limits separately before invoking L\'Hospital\'s Rule, then differentiate top and bottom independently.'
  ],
  'ap-calc-ab-ch-05': [
    'Before invoking the Mean Value Theorem on [a, b], explicitly state that f is continuous on [a, b] and differentiable on (a, b) to guarantee f\'(c) = (f(b)-f(a))/(b-a).',
    'Justify relative extrema by showing f\' changes sign at a critical point (where f\' = 0 or DNE), and confirm absolute extrema on a closed interval using the Candidates Test with endpoints.',
    'Inflection points require f\'\' to change sign, not merely equal zero; use concavity to tell whether a tangent-line estimate overestimates (concave down) or underestimates (concave up).'
  ],
  'ap-calc-ab-ch-06': [
    'By FTC Part 1, the derivative of the integral from a to g(x) of f(t) dt equals f(g(x)) times g\'(x), connecting accumulation graphs directly to f as the derivative of the integral.',
    'For Riemann sums on monotonic functions, left sums underestimate increasing curves and overestimate decreasing ones, while trapezoidal sums depend on concavity rather than monotonicity.',
    'When using u-substitution in a definite integral, transform the original x-limits into u-limits immediately so you evaluate directly without converting back to x.'
  ],
  'ap-calc-ab-ch-07': [
    'To solve a separable differential equation, separate all y-terms with dy and x-terms with dx before integrating, include +C right after integration, and solve for C using the initial condition.',
    'When verifying a proposed solution to a differential equation, compute its required derivatives and substitute directly into both sides while confirming the initial value holds.',
    'In a logistic model dP/dt = kP(1 - P/M), population grows fastest at half the carrying capacity (P = M/2), where the solution curve shifts from concave up to concave down.'
  ],
  'ap-calc-ab-ch-08': [
    'Compute average value as (1/(b-a)) times the definite integral of f(x) over [a, b], and distinguish net displacement (integral of v(t)) from total distance (integral of |v(t)|).',
    'Set up area between curves by integrating (top minus bottom) with respect to x or (right minus left) with respect to y, splitting the integral wherever curves intersect and switch.',
    'For solids of revolution, measure outer radius R and inner radius r from the actual axis of rotation (not blindly from zero) and integrate pi times (R^2 - r^2) rather than pi(R - r)^2.'
  ]
};

const audiology_5343 = {
  'aud5343-ch-01': [
    'The middle ear overcomes air-to-fluid impedance mismatch primarily through the tympanic-membrane-to-stapes-footplate area ratio (about 17:1) plus the ossicular lever (about 1.3:1).',
    'Cochlear tonotopy maps high frequencies to the stiffer, narrower base and low frequencies to the wider, more compliant apex, where outer hair cells supply nonlinear cochlear amplification.',
    'Remember dB SPL uses a 20 microPa reference where doubling pressure adds 6 dB and doubling intensity adds 3 dB; pair annual ANSI electroacoustic calibration with daily listening checks.'
  ],
  'aud5343-ch-02': [
    'Upward spread of masking occurs because low-frequency traveling waves excite basal high-frequency regions at high intensities, making low-frequency noise strongly mask high-frequency speech cues.',
    'Horizontal localization relies on interaural time differences (ITDs) for low frequencies below roughly 1500 Hz and interaural level differences (ILDs) from the head-shadow effect at high frequencies.',
    'Auditory maturation progresses from peripheral cochlear function at birth to prolonged central temporal and speech-in-noise development, whereas presbycusis combines sensory, strial, and central aging.'
  ],
  'aud5343-ch-03': [
    'Apply the hierarchy of controls before issuing earplugs: eliminate or engineer out hazardous noise first, add administrative limits next, and fit hearing protection to communication needs.',
    'Under OSHA, an 85 dBA 8-hour TWA triggers hearing conservation enrollment (5 dB exchange rate), and a standard threshold shift (STS) is an average 10 dB or greater shift at 2, 3, and 4 kHz.',
    'Ototoxic monitoring for cisplatin or aminoglycosides prioritizes ultra-high-frequency audiometry (9 to 20 kHz) and OAEs before baseline shifts reach standard speech frequencies.'
  ],
  'aud5343-ch-04': [
    'Screening identifies risk for further evaluation rather than diagnosing hearing loss; follow the EHDI 1-3-6 benchmark (screen by 1 month, diagnose by 3 months, enroll in intervention by 6 months).',
    'Use automated ABR rather than OAE alone for NICU infants because OAE misses auditory neuropathy spectrum disorder (ANSD), where outer hair cells remain intact despite impaired neural synchrony.',
    'School pure-tone screening typically uses 20 dB HL at 1000, 2000, and 4000 Hz, and program effectiveness depends on closed-loop tracking so every refer result receives timely diagnostic follow-up.'
  ],
  'aud5343-ch-05': [
    'Mask whenever presentation level minus interaural attenuation reaches the nontest ear\'s bone-conduction threshold; insert earphones yield far greater interaural attenuation than supra-aural phones.',
    'Confirm behavioral reliability by checking SRT against the pure-tone average (within 6 to 10 dB), and add speech-in-noise testing when quiet word recognition understates daily listening struggles.',
    'Match behavioral conditioning to developmental age (BOA for infants, VRA for roughly 6 to 24 months, CPA for preschoolers) while recognizing conditioned responses estimate minimum response levels.'
  ],
  'aud5343-ch-06': [
    'Pair tympanograms with ear-canal volume: Type B with normal volume suggests effusion, Type B with high volume indicates perforation or a patent tube, and As versus Ad separates stiffness from flaccidity.',
    'Use a 1000 Hz probe tone for infants under 6 months because compliant neonatal canals distort 226 Hz tympanograms, and remember OAEs test outer hair cell integrity rather than behavioral thresholds.',
    'Apply Jerger\'s cross-check principle across ABR, OAE, and immittance: present OAEs with absent ABR and inverting cochlear microphonics point directly to auditory neuropathy spectrum disorder.'
  ],
  'aud5343-ch-07': [
    'Screen vestibular cases for central red flags first (vertical or direction-changing nystagmus, severe ataxia, or neurologic deficits) and use Dix-Hallpike to identify posterior-canal BPPV.',
    'Match vestibular tests to end-organ and frequency: calorics test low-frequency horizontal canals, vHIT tests high-frequency canals, cVEMP probes the saccule, and oVEMP probes the utricle.',
    'Diagnose central auditory processing disorder only after ruling out peripheral loss, language, cognitive, or attention confounds, and use validated questionnaires for tinnitus and hyperacusis distress.'
  ],
  'aud5343-ch-08': [
    'Refer promptly to medicine for sudden sensorineural loss, asymmetric thresholds or word scores, unilateral tinnitus, otalgia, drainage, or unexplained conductive or retrocochlear signs.',
    'In pediatric cross-checking, reconcile frequency-specific ABR/ASSR, immittance, OAEs, and behavioral thresholds before fitting amplification rather than relying on any single uncorroborated measure.',
    'Educational audiology connects audiometric configuration to classroom speech audibility, distance, reverberation, and noise so IEP or Section 504 teams design measurable access accommodations.'
  ],
  'aud5343-ch-09': [
    'Verification objectively confirms DSL v5 or NAL-NL2 target match via real-ear probe-microphone measures, whereas validation assesses real-world communication benefit with self-report or functional tools.',
    'Wide dynamic range compression (WDRC) applies more gain to soft inputs and less to loud inputs to keep speech audible without discomfort, while MPO limits protect residual hearing from peak output.',
    'Balance acoustic coupling tradeoffs carefully: larger vents reduce occlusion for normal low-frequency thresholds but increase feedback risk and reduce directional microphone benefit in background noise.'
  ],
  'aud5343-ch-10': [
    'Determine cochlear implant candidacy using aided speech-recognition scores with verified hearing aids, imaging of cochlear and neural anatomy, medical clearance, and realistic rehabilitation goals.',
    'Bone-conduction devices bypass outer- and middle-ear pathology for conductive or mixed losses and route sound transcranially for single-sided deafness when cochlear reserve is sufficient.',
    'Remote microphone (DM/FM) systems overcome classroom distance and reverberation far better than hearing aids alone by placing the microphone near the talker\'s mouth to improve signal-to-noise ratio.'
  ],
  'aud5343-ch-11': [
    'Effective audiologic rehabilitation pairs verified technology with repair strategies, visual cues, communication-partner training, and noise control tailored to person- and family-centered goals.',
    'In pediatric early intervention, provide unbiased, family-centered counseling across listening-and-spoken-language, sign, and bimodal options so families build accessible language early without delay.',
    'Promote classroom access by managing background noise and reverberation (ANSI S12.60), ensuring visual access and remote microphones, and coaching progressive student self-advocacy.'
  ],
  'aud5343-ch-12': [
    'Match privacy laws to setting: FERPA governs school educational records, HIPAA governs covered health-care entities, and informed consent requires plain disclosure of risks, alternatives, and costs.',
    'Telepractice requires equivalent clinical standards, verified licensure in both the clinician\'s and patient\'s jurisdictions, secure platforms, and a local emergency or urgent-referral protocol.',
    'Disclose financial conflicts transparently, supervise assistants within scope without delegating diagnostic decisions, and document objective clinical justification for every billed service.'
  ]
};

const speech_language_pathology_5331 = {
  'slp5331-ch-01': [
    'Phonation follows the myoelastic-aerodynamic theory: subglottal air pressure pushes adducted vocal folds apart while tissue elasticity and the Bernoulli effect draw them closed cyclically.',
    'Map key cranial nerves to function: CN V powers mastication, CN VII labial seal, CN IX and X velopharyngeal and pharyngeal-laryngeal mechanics, and CN XII intrinsic and extrinsic tongue movement.',
    'Left perisylvian circuits anchor classic aphasias (Broca nonfluent, Wernicke fluent, arcuate conduction), while upper versus lower motor neuron lesions produce distinct motor-speech profiles.'
  ],
  'slp5331-ch-02': [
    'Under IDEA, school SLP eligibility requires three prongs: a documented communication disorder, adverse educational impact, and demonstrated need for specialized SLP instruction, not a test score alone.',
    'Under ASHA ethics, practice strictly within competence, avoid guaranteeing treatment outcomes, obtain informed consent, and protect privacy under FERPA in schools or HIPAA in health-care settings.',
    'Supervising SLPAs requires direct oversight aligned with state rules and prohibits delegating standardized evaluation, diagnosis, IEP or treatment-plan authorship, or independent clinical discharge.'
  ],
  'slp5331-ch-03': [
    'Evidence-based practice integrates best external research, clinical expertise, and client/family values, using PICO questions to weigh research design, effect size, and real-world relevance.',
    'A language disorder must appear in all languages a multilingual person uses; dialectal or cross-linguistic transfer features observed in a speaker\'s community represent difference, not disorder.',
    'Remember that reliability is necessary but insufficient for validity, and pair sensitivity (true-positive detection) with specificity (true-negative accuracy) when judging diagnostic tests.'
  ],
  'slp5331-ch-04': [
    'Identify childhood apraxia of speech by inconsistent errors on repeated tokens, disrupted coarticulatory transitions, and impaired prosody rather than neuromuscular weakness or paralysis.',
    'Distinguish stuttering-like disfluencies (part-word repetitions, prolongations, blocks with tension) from typical disfluencies (phrase repetitions, interjections), and cluttering by rapid irregular rate.',
    'Separate hypernasality (excessive nasal resonance on vowels and voiced oral consonants from velopharyngeal insufficiency) from hyponasality (obstructed nasal cavity muting /m/, /n/, and /ng/).'
  ],
  'slp5331-ch-05': [
    'Never diagnose from a single norm-referenced score; combine case history, standardized tests (when norm-appropriate), dynamic assessment, language or speech sampling, and functional observation.',
    'Report standard scores and confidence intervals rather than age or grade equivalents, because equivalent scores are ordinal, lack equal intervals, and distort severity and progress.',
    'Use dynamic assessment (test-teach-retest) to measure modifiability in culturally or linguistically diverse learners, distinguishing limited prior exposure from true underlying language impairment.'
  ],
  'slp5331-ch-06': [
    'Assess speech sound disorders in single words and connected speech using stimulability, phonological pattern analysis, oral-mechanism exams, and intelligibility ratings to choose targets.',
    'Before initiating voice therapy for persistent hoarseness or vocal-fold symptoms, obtain an ENT/laryngoscopic medical evaluation to visualize vocal fold structure and rule out organic pathology.',
    'Differentiate dysarthria via subsystem exams and DDK tasks: alternating motion rates (AMRs) probe speed and regularity, whereas sequential motion rates (SMRs) expose motor-planning breakdowns.'
  ],
  'slp5331-ch-07': [
    'Conduct AAC assessment through feature matching of motor, sensory, linguistic, and communication-partner needs across device trials; there are zero cognitive, age, or behavioral prerequisites for AAC.',
    'Distinguish right-hemisphere cognitive-communication deficits (pragmatics, prosody, inferencing, left neglect, anosognosia) from left-hemisphere aphasia and progressive dementia profiles.',
    'Evaluate school-age language and literacy across spoken and written modalities, including phonological awareness, morphology, syntax, discourse, and listening access, to capture curriculum impact.'
  ],
  'slp5331-ch-08': [
    'Bedside clinical swallow exams assess readiness and overt risk signs but cannot rule out silent aspiration; use instrumental testing (VFSS or FEES) to visualize pharyngeal physiology directly.',
    'Select VFSS to view all swallowing phases, hyolaryngeal elevation, and UES opening, or FEES to inspect laryngopharyngeal anatomy, secretions, and vocal folds directly without radiation.',
    'Assess pediatric feeding multidimensionally across medical, nutritional, oral-motor/swallow safety, and psychosocial domains so sensory or behavioral refusal is never misattributed to defiance.'
  ],
  'slp5331-ch-09': [
    'Write measurable functional goals specifying target behavior, observable performance criterion, level of cueing, and real-life communication context so progress transfers beyond therapy drills.',
    'Apply principles of motor learning intentionally: blocked practice with frequent knowledge of performance supports acquisition, whereas random practice with faded knowledge of results drives retention.',
    'Use ongoing session and probe data to step up, modify, or fade intervention, and plan discharge or maintenance once functional criteria plateau or caregivers can sustain participation.'
  ],
  'slp5331-ch-10': [
    'Match speech-sound therapy to mechanism: minimal or maximal pairs and cycles for phonological patterns, phonetic placement for single distortions, and high-repetition DTTC or ReST for apraxia.',
    'Center stuttering treatment on speaker agency and communicative participation by combining stuttering modification, fluency shaping, or desensitization while avoiding rigid demands for unnatural fluency.',
    'Respect structural limits in resonance: velopharyngeal insufficiency requires surgical or prosthetic correction, whereas phoneme-specific nasal emission responds directly to behavioral speech therapy.'
  ],
  'slp5331-ch-11': [
    'Research confirms AAC does not impede natural speech development; implement aided language input (partner modeling on the AAC system) across daily routines to build functional symbolic communication.',
    'Target aphasia mechanisms directly: Semantic Feature Analysis for lexical retrieval, Melodic Intonation Therapy for severe nonfluent profiles, and partner training to maximize daily participation.',
    'Embed school-age language and pragmatic goals within authentic classroom texts and peer interactions using recasting, syntactic combining, and metacognitive strategies rather than isolated worksheets.'
  ],
  'slp5331-ch-12': [
    'Separate compensatory strategies (chin tuck, head turn, bolus changes for immediate safety) from rehabilitative exercises (Shaker, effortful swallow, Mendelsohn) that rebuild swallow physiology.',
    'Thickened liquids do not guarantee pneumonia prevention; weigh dehydration, patient autonomy, and consistent oral hygiene alongside instrumental evidence rather than defaulting to restrictive diets.',
    'In pediatric feeding therapy, apply responsive feeding principles that preserve safety, nutrition, and trust (never forced feeding) and coordinate closely with medical and nutrition specialists.'
  ]
};

const school_psychologist_5403 = {
  'sp5403-ch-01': [
    'Follow the four-step problem-solving cycle (identify, analyze, implement, and evaluate) by first converting vague referral labels into observable, measurable discrepancies from expected performance.',
    'Triangulate RIOT methods (Review, Interview, Observe, Test) across ICEL domains (Instruction, Curriculum, Environment, Learner) to pinpoint alterable causes before attributing difficulty to the child.',
    'Verify treatment fidelity before declaring an intervention ineffective; flat student progress paired with low implementation integrity reflects a delivery gap rather than true non-responsiveness.'
  ],
  'sp5403-ch-02': [
    'Interpret every test score within its confidence interval (using the standard error of measurement) and recognize that validity belongs to a specific score interpretation and use, not the test itself.',
    'Remember that reliability sets an upper ceiling on validity, standard scores allow valid cross-test comparison, and percentile ranks represent unequal intervals clustered tightly around the mean.',
    'For linguistically diverse learners, assess in the dominant language when feasible, examine prior opportunity to learn, and never rely on ad hoc translations or a single norm-referenced score.'
  ],
  'sp5403-ch-03': [
    'Behavioral consultation builds a non-hierarchical partnership (identify, analyze, implement, evaluate) in which the consultant strengthens the consultee\'s direct classroom or home support.',
    'In Caplan\'s consultee-centered consultation, look for lack of knowledge, skill, confidence, or objectivity (theme interference) when an educator struggles to implement an otherwise sound strategy.',
    'Treatment acceptability and feasibility drive implementation fidelity; co-design plans that fit teacher routines and secure written parent consent before exchanging records with community providers.'
  ],
  'sp5403-ch-04': [
    'Match instruction to the instructional hierarchy: explicit modeling and immediate feedback for acquisition, timed practice for fluency, varied contexts for generalization, and transfer for adaptation.',
    'Distinguish accommodations (changing access, format, or timing while preserving grade-level standards) from modifications (altering the construct or learning expectation itself).',
    'Use Curriculum-Based Measurement (CBM) probes for frequent progress monitoring, evaluating both level and slope (rate of improvement) against an aimline to adjust instruction promptly.'
  ],
  'sp5403-ch-05': [
    'Organize mental health across three tiers: universal SEL promotion (Tier 1), targeted small-group supports like Check-In/Check-Out (Tier 2), and intensive individualized intervention (Tier 3).',
    'Trauma-informed practice prioritizes physical and emotional safety, predictability, student choice, and relational regulation rather than interpreting trauma responses as willful defiance.',
    'Apply brief school counseling mechanisms (CBT restructuring, behavioral activation, or solution-focused scaling) while coordinating external clinical referrals for intensive long-term psychotherapy.'
  ],
  'sp5403-ch-06': [
    'Conduct a Functional Behavior Assessment (FBA) using operational definitions and ABC data to hypothesize the maintaining function (escape, attention, tangible, or sensory) before writing a BIP.',
    'An effective BIP pairs antecedent prevention with a functionally equivalent replacement behavior (FERB) that earns the maintaining reinforcer faster and more easily than the problem behavior.',
    'When a student discloses suicidal ideation or imminent harm, never leave the student alone, conduct a structured risk assessment, notify parents or guardians promptly, and document a warm handoff.'
  ],
  'sp5403-ch-07': [
    'In an effective MTSS framework, roughly 80 percent of students should respond to core Tier 1 instruction; if far fewer succeed, strengthen universal Tier 1 before flooding Tier 2 and Tier 3.',
    'Universal screening identifies systemic and individual risk early, but schools must pair screeners with clear decision rules, passive or active consent policies, and capacity to intervene immediately.',
    'Evaluate systems change with disaggregated data across race, disability, and language groups plus implementation fidelity metrics so schoolwide initiatives narrow rather than widen equity gaps.'
  ],
  'sp5403-ch-08': [
    'Distinguish bullying from peer conflict by three criteria (intentional harm, repetition or likelihood of repetition, and an imbalance of power) and avoid peer mediation for genuine bullying.',
    'Follow behavioral threat assessment models (such as CSTAG) to distinguish transient from substantive threats, prioritizing preventive problem solving over ineffective zero-tolerance expulsions.',
    'Apply the NASP PREPaRE crisis model: restore physical safety and routines first, triage psychological exposure to match support intensity, and avoid mandatory single-session debriefing.'
  ],
  'sp5403-ch-09': [
    'Conjoint Behavioral Consultation (CBC) treats parents and teachers as equal partners across home and school settings, using shared data and reciprocal expertise to sustain behavioral and academic gains.',
    'Remove structural barriers to family engagement by offering flexible meeting times, qualified interpreters (never students), jargon-free communication, and culturally affirming strengths-based outreach.',
    'Coordinate wraparound and transition planning early (mandated by IDEA no later than age 16) by centering student voice, measurable postsecondary goals, and warm linkages to community agencies.'
  ],
  'sp5403-ch-10': [
    'Audit disproportionality via risk ratios in eligibility, placement, and discipline, distinguishing individual implicit bias from systemic policies that limit equitable opportunity to learn.',
    'Apply cultural humility by gathering individualized sociocultural and linguistic context as working hypotheses rather than relying on group stereotypes or culture-blind assumptions.',
    'Protect construct-relevant access in assessment and intervention by separating language acquisition, sensory or motor barriers, and instructional gaps from true disability.'
  ],
  'sp5403-ch-11': [
    'Randomized experiments anchor group causal claims, whereas single-case designs (ABAB reversal, multiple baseline) show functional control via replicated baseline-to-intervention shifts.',
    'Evaluate statistical significance alongside effect size (such as Cohen\'s d) and practical clinical significance, watching for internal validity threats like history, maturation, testing, and regression.',
    'Use formative evaluation to check fidelity and refine delivery mid-course, and summative evaluation to judge final outcomes; combining both explains whether and why a program worked.'
  ],
  'sp5403-ch-12': [
    'Under IDEA, informed written parent consent is mandatory before initial evaluation and initial placement, evaluations must cover all suspected areas, and LRE maximizes general-education access.',
    'Section 504 protects students with a physical or mental impairment that substantially limits a major life activity, providing FAPE and accommodations without requiring specialized IDEA instruction.',
    'Apply NASP\'s four ethical principles (rights and dignity, competence, integrity, responsibility) and break confidentiality only for imminent danger, mandated abuse reporting, or valid legal orders.'
  ]
};

const school_counselor_5422 = {
  'sc5422-ch-01': [
    'Under the ASCA National Model, school counselors spend at least 80 percent of time in direct and indirect student services across academic, career, and social/emotional domains for all students.',
    'Advocate with time-use and student-outcome data to shift inappropriate duties (such as master scheduling, disciplining students, or coordinating statewide testing) away from the counseling role.',
    'Act across five integrated roles (leader, advocate, collaborator, consultant, and systemic change agent) so the school counseling program operates proactively rather than as isolated reactive triage.'
  ],
  'sc5422-ch-02': [
    'Use Erikson\'s psychosocial stages (industry versus inferiority in elementary and identity versus role confusion in adolescence) and Piaget\'s cognitive shifts to match counseling tasks to readiness.',
    'Apply Vygotsky\'s zone of proximal development through temporary scaffolding and Bandura\'s social learning theory through peer modeling and self-efficacy building rather than passive lectures.',
    'Interpret student behavior through Bronfenbrenner\'s ecological systems and family-systems lenses by examining home, peer, school, and cultural interactions instead of labeling problems as fixed traits.'
  ],
  'sc5422-ch-03': [
    'State confidentiality limits upfront in student-friendly language: keep disclosures private except for foreseeable harm to self or others, suspected abuse or neglect, or valid court orders.',
    'Report reasonable suspicion of child abuse or neglect promptly to protective authorities without investigating yourself, and keep sole-possession notes strictly separate from educational records.',
    'Apply ASCA\'s STEPS ethical decision-making model when dilemmas conflict, maintain clear professional boundaries (avoiding dual relationships), and never impose personal values onto students.'
  ],
  'sc5422-ch-04': [
    'Match brief counseling theories to goals: Solution-Focused uses scaling and exception questions, CBT reshapes cognitive distortions, and Motivational Interviewing resolves student ambivalence.',
    'Anchor individual sessions in Rogers\'s core conditions (empathy, unconditional positive regard, and congruence) while keeping school counseling brief and referring intensive clinical needs externally.',
    'Align career development across grades with Super and Holland\'s RIASEC themes: build career awareness in elementary, guided exploration in middle school, and postsecondary planning in high school.'
  ],
  'sc5422-ch-05': [
    'Screen and orient group candidates beforehand, clarify that peer confidentiality cannot be guaranteed, and guide members across forming, storming, norming, performing, and adjourning stages.',
    'Design Tier 1 classroom counseling lessons aligned to ASCA Mindsets and Behaviors with pre- and post-assessments, active engagement, and clear behavioral expectations for all students.',
    'Separate bullying (intentional, repeated, power imbalance; avoid peer mediation) from balanced conflict, and activate district suicide or threat protocols immediately when safety cues arise.'
  ],
  'sc5422-ch-06': [
    'Lead indirect consultation as collaborative problem solving by defining observable concerns, exploring classroom and home context, co-selecting feasible interventions, and reviewing progress data.',
    'Within MTSS, match support intensity dynamically to universal screening and progress-monitoring data; students receive tiered interventions, never permanent tier labels.',
    'Collaborate on IEP and Section 504 teams without assuming sole eligibility or administrative authority, and offer families a neutral list of vetted community providers with warm follow-through.'
  ],
  'sc5422-ch-07': [
    'Distinguish vision from mission: vision states the aspirational future for students years from now, whereas mission defines the counseling program\'s present purpose aligned to the school\'s mission.',
    'Hold an Annual Administrative Conference each fall using time-use and student-outcome data to align counselor caseloads, duties, and annual goals formally with the principal.',
    'Convene a representative Advisory Council (students, parents, teachers, administrators, community) twice yearly to review aggregate program goals and results, never identifiable student data.'
  ],
  'sc5422-ch-08': [
    'Classify ASCA data cleanly: participation tracks who received services, Mindsets and Behaviors tracks knowledge, attitude, and skill gains, and outcome data track attendance, discipline, or grades.',
    'Anchor annual student outcome goals to disaggregated baseline gaps (naming target group, baseline, measurable change, and timeline) and tie them to classroom and closing-the-gap action plans.',
    'Interpret norm-referenced scores accurately: percentiles show relative rank (not percent correct), stanines span 1 to 9 with 4 to 6 average, and reliability is required before scores can be valid.'
  ],
  'sc5422-ch-09': [
    'Triage daily demands transparently: handle imminent safety crises first, protect scheduled direct student services next, and guard preventive Tier 1 calendars against administrative drift.',
    'Deliver virtual counseling and store records within FERPA-compliant platforms, confirming informed consent, private physical settings, and local emergency contacts before remote sessions.',
    'Allocate counseling resources by disaggregated student need rather than uniform volume, share multilingual access pathways with families, and align professional learning to student gaps.'
  ],
  'sc5422-ch-10': [
    'Separate program assessment from student outcome evaluation: the ASCA School Counseling Program Assessment checks which structural components are in place, whereas results reports judge student impact.',
    'Use the ASCA School Counselor Professional Standards and Competencies self-assessment to identify individual growth priorities, supervision needs, and targeted continuing education goals.',
    'Design evaluation before delivering an intervention by collecting aligned baseline or pre-test data and tracking implementation fidelity so post-test changes can be interpreted accurately.'
  ],
  'sc5422-ch-11': [
    'Always disaggregate schoolwide results by race, ethnicity, gender, socioeconomic status, language, and disability to expose hidden opportunity gaps that aggregate averages conceal.',
    'Interpret program results with scientific humility: pre-post gains and correlations show association rather than definitive causation when comparison groups or external confounders are uncontrolled.',
    'Pair quantitative participation and outcome metrics with qualitative student and family voice in concise plain-language results reports that state limitations and recommend specific next actions.'
  ],
  'sc5422-ch-12': [
    'Use transparent decision rules after reviewing results reports to decide what to retain, revise, discontinue, or scale, treating unmet targets as diagnostic feedback rather than hiding misses.',
    'Frame data-based systemic advocacy around disaggregated student equity gaps paired with a concrete, feasible policy or resource ask aligned to district priorities.',
    'Pilot and evaluate fidelity, equity impact, and contextual fit before scaling a counseling intervention schoolwide so local success translates durably across classrooms.'
  ]
};

module.exports = {
  ap_calculus_ab_foundation_pilot,
  audiology_5343,
  speech_language_pathology_5331,
  school_psychologist_5403,
  school_counselor_5422
};
