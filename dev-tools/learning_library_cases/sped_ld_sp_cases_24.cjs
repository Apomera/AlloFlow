'use strict';

const SPED_CASE_LABELS = {
  schemaVersion: 1,
  label: 'Applied SPED case',
  presentationLabel: 'Case scenario',
  answerLabel: 'Best professional decision',
  explanationLabel: 'Evidence-based rationale'
};

const special_education_learning_disabilities_5383 = {
  'ld5383-ch-01-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Applying SLD Exclusionary Criteria for an Emergent Bilingual',
    clinicalDescription:
      'A third grader who arrived from Guatemala 16 months ago tells detailed stories in Spanish but scores low on one English silent reading benchmark. Records show 24 absences during winter housing instability and a core reading curriculum lacking explicit phonics, yet a team member requests immediate SLD eligibility.',
    diagnosis:
      'Apply IDEA SLD exclusionary criteria by assessing home-language literacy, instructional opportunity, and attendance before attributing difficulty to SLD.',
    explanation:
      'IDEA prohibits identifying SLD when low achievement stems primarily from limited English proficiency, lack of appropriate reading instruction, or environmental disadvantage. Relying on one English benchmark without evaluating Spanish literacy and instructional quality conflates language difference with disability.'
  },
  'ld5383-ch-02-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Replacing Processing-Training Software with Targeted LD Instruction',
    clinicalDescription:
      'A fifth grader with SLD in reading fluency and coexisting ADHD struggles with multisyllabic decoding and multi-digit subtraction. Staff enroll him in a commercial auditory-processing brain-training app, assign generic LD worksheets, and blame his math errors solely on ADHD without analyzing conceptual gaps.',
    diagnosis:
      'Replace unproven processing-training software with explicit decoding, fluency, and math instruction paired with targeted ADHD executive supports.',
    explanation:
      'Empirical research shows isolated perceptual or cognitive processing training fails to generalize to reading or mathematics gains. Effective LD instruction directly remediates specific academic skill deficits while avoiding diagnostic overshadowing and one-size-fits-all worksheets that ignore individual profiles.'
  },
  'ld5383-ch-03-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Aligning Measurable IEP Goals, Minutes, and Rigorous Access',
    clinicalDescription:
      'A seventh grader with SLD in written expression has a draft IEP goal stating she will "improve paragraph writing with support," zero specialized writing minutes, and a copy-pasted list of 14 unused accommodations. Meanwhile, a teacher replaces grade-level history essays with third-grade coloring worksheets.',
    diagnosis:
      'Write a measurable PLAAFP-linked writing goal with aligned specialized minutes and targeted accommodations that preserve grade-level curriculum rigor.',
    explanation:
      'Under IDEA and the Endrew F. standard, annual goals must connect directly to objective baseline data with observable mastery criteria and matched specialized instruction. Boilerplate accommodation checklists obscure true needs, and lowering curriculum expectations unnecessarily denies access to grade-level general-education standards.'
  },
  'ld5383-ch-04-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Addressing Escape-Maintained Reading Frustration Through FBA',
    clinicalDescription:
      'A sixth grader with SLD in basic reading tears up social studies packets and argues loudly whenever asked to read aloud in front of peers, resulting in four weekly hallway removals. Each referral immediately ends the reading task, and no behavioral progress data has been reviewed since October.',
    diagnosis:
      'Conduct an academic-frustration FBA, end escape-reinforcing removals, add audio text access, and teach help-requesting and self-monitoring.',
    explanation:
      'In students with SLD, disruptive behavior during literacy tasks frequently serves an escape function triggered by unaddressed decoding demands. Punitive hallway removals negatively reinforce escape and widen academic gaps, whereas accessible text scaffolds, taught replacement skills, and regular data monitoring resolve the trigger.'
  },
  'ld5383-ch-05-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing AT Abandonment Using SETT and Accessible Media',
    clinicalDescription:
      'A ninth grader with dyslexia and dysgraphia receives a speech-to-text tablet chosen before reviewing classroom demands. Neither teachers nor the student receive training, digital readings are unsearchable scanned images that break screen readers, and an adult permanently writes all outlines for the student.',
    diagnosis:
      'Use the SETT framework to pair OCR-accessible texts and speech-to-text with writing tasks, train student and staff, and schedule scaffold fading.',
    explanation:
      'IDEA requires individualized assistive technology consideration and training for students and educators to prevent device abandonment. Applying the Student, Environments, Tasks, and Tools framework ensures accessible digital formats and faded executive-function routines build independence instead of permanent over-scaffolding.'
  },
  'ld5383-ch-06-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Shifting from Three-Cueing and Speed Drills to Structured Literacy',
    clinicalDescription:
      'A fourth grader with SLD in word reading decodes CVC words accurately but misreads vowel teams and multisyllabic words at 74 percent accuracy and 48 words correct per minute. Current intervention prompts picture-guessing via three-cueing and runs speed-only timed drills without morphology or topic background building.',
    diagnosis:
      'Deliver explicit structured literacy targeting phonics, syllable division, and morphology paired with accuracy-focused repeated reading and knowledge building.',
    explanation:
      'Structured literacy systematically remediates phonological and orthographic decoding deficits, whereas three-cueing reinforces inaccurate guessing habits. Speed-only fluency drills erode accuracy and comprehension; aligning instructional text with decoding patterns, prosody modeling, and domain vocabulary produces durable reading growth.'
  },
  'ld5383-ch-07-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Using SRSD and Sentence Combining Instead of Red-Pen Grading',
    clinicalDescription:
      'An eighth grader with SLD in written expression writes four fragmented sentences when given an unscaffolded argumentative essay prompt. Feedback consists solely of red-pen spelling and comma marks, weekly spelling lists rely on isolated rote memorization, and no planning or substantive revision strategy is modeled.',
    diagnosis:
      'Teach SRSD planning and revision strategies, pair sentence-combining with morphological spelling, and separate content feedback from mechanics.',
    explanation:
      'SRSD explicitly models genre structures, planning mnemonics, self-talk, and substantive revision, consistently yielding strong writing gains for students with SLD. Mechanics-only red-pen grading and isolated spelling lists suppress writing volume without teaching syntactic construction or transferable orthographic patterns.'
  },
  'ld5383-ch-08-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Replacing Keyword Hunting with CRA and Schema-Based Math',
    clinicalDescription:
      'A fifth grader with dyscalculia automatically adds whenever spotting "more" in comparison word problems and forgets regrouping steps taught only through rote algorithms. Teachers skip fraction tiles and visual diagrams while barring a four-function calculator during multi-step conceptual problem-solving tasks.',
    diagnosis:
      'Teach Concrete-Representational-Abstract (CRA) bridges and schema-based word-problem instruction while allowing strategic calculator access on reasoning tasks.',
    explanation:
      'CRA sequencing links hands-on manipulatives and visual diagrams to abstract symbols, building conceptual understanding that rote algorithms lack. Schema-based instruction teaches deep mathematical problem structures rather than misleading keyword tricks, and strategic calculator access keeps fact retrieval from blocking higher reasoning.'
  },
  'ld5383-ch-09-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Stopping RTI Evaluation Delays and Single-Score Placement',
    clinicalDescription:
      'Parents of a third grader showing flat oral-reading CBM slopes of 0.3 words per week across 14 weeks of Tier 2 phonics submit a written evaluation request. The principal insists the student complete 12 more weeks of Tier 3 first, while a committee plans self-contained LD placement based on one subtest score.',
    diagnosis:
      'Obtain written consent promptly for a comprehensive multidisciplinary evaluation integrating CBM, PSW, and classroom data, then determine LRE individually.',
    explanation:
      'OSEP guidance strictly forbids using RTI tiers to delay or deny an initial IDEA evaluation once disability is suspected or parents request testing. Eligibility and placement require multiple valid, unbiased data sources rather than a single score, and LRE placement must never follow a disability label automatically.'
  },
  'ld5383-ch-10-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Enforcing Prior Written Notice, Team Decisions, and FERPA Privacy',
    clinicalDescription:
      'When a tenth grader with SLD struggles in chemistry, a counselor unilaterally moves him to a pullout remedial track without convening the IEP team or issuing Prior Written Notice. The counselor also emails the student\'s psychoeducational report to a private outside tutor without consent and drafts a completed transition plan alone.',
    diagnosis:
      'Halt the unilateral placement change, issue Prior Written Notice, reconvene the IEP team with student and family, and enforce FERPA privacy.',
    explanation:
      'IDEA procedural safeguards require full IEP team deliberation, Prior Written Notice, and active student and parent participation rather than unilateral placement shifts or predetermined transition plans. Disclosing confidential evaluation records to outside third parties without written parental consent violates FERPA and IDEA.'
  },
  'ld5383-ch-11-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Upgrading Co-Teaching, Team Alignment, and Plain-Language Meetings',
    clinicalDescription:
      'In a co-taught seventh-grade English class, the special educator permanently stands at the back supporting one table while an unsupervised paraprofessional plans daily reading interventions. IEP meetings rely on unexplained psychometric acronyms, and the speech-language pathologist never aligns vocabulary with English units.',
    diagnosis:
      'Use station and parallel co-teaching, retain teacher oversight of paraprofessionals, align SLP vocabulary, and use plain language with families.',
    explanation:
      'Deliberate co-teaching models such as station and parallel teaching deliver intensive specialized instruction inclusively, whereas chronic one-teach, one-drift wastes expertise. Licensed teachers must direct paraprofessional instruction, coordinate specialist goals, and communicate data clearly so families participate as equal partners.'
  },
  'ld5383-ch-12-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Upholding Evidence-Based Practice, Clinical Scope, and Fidelity',
    clinicalDescription:
      'A coach urges an LD teacher to purchase colored-lens overlays marketed to cure dyslexia immediately. Meanwhile, the teacher tells parents their child definitely has clinical ADHD requiring stimulant medication and switches reading interventions every two weeks without fidelity checks or graphed CBM review.',
    diagnosis:
      'Reject unvalidated colored-lens claims, refer medical questions to licensed clinicians, verify intervention fidelity, and apply graphed CBM decision rules.',
    explanation:
      'CEC professional ethics require selecting peer-reviewed, evidence-based interventions over commercial fads lacking empirical validity. Educators must stay within instructional scope without diagnosing medical disorders or advising medication, and intervention changes must follow verified implementation fidelity and systematic progress data.'
  }
};

const special_education_severe_profound_5547 = {
  'sp5547-ch-01-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Presuming Competence with Age-Respectful High-School Access',
    clinicalDescription:
      'A 16-year-old with multiple disabilities and complex communication needs enters high school. Citing her severe intellectual disability label, staff assign preschool nursery-rhyme puzzles in a segregated basement classroom, assume she cannot engage with literature, and skip ecological profiling of her strengths and peer preferences.',
    diagnosis:
      'Presume competence, complete an ecological profile of strengths, adapt age-respectful high-school literature, and build peer partial participation.',
    explanation:
      'Best practice for learners with extensive support needs rejects severity-driven expectation ceilings and infantilizing materials. Presuming competence and conducting ecological inventories identify meaningful partial-participation roles and supports that provide authentic access to age-appropriate academic and social environments.'
  },
  'sp5547-ch-02-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Removing AAC Prerequisites and Modeling Aided Language Input',
    clinicalDescription:
      'A nine-year-old nonspeaking student with Rett syndrome communicates preferences through eye gaze, smiles, and vocalizations. Staff withhold an eye-gaze speech-generating device until she passes a picture-matching prerequisite test, speak on her behalf during routines, and rarely model core symbols on her low-tech gaze board.',
    diagnosis:
      'Remove prerequisite barriers, launch immediate high- and low-tech AAC access, honor nonsymbolic signals, and train all partners in Aided Language Input.',
    explanation:
      'Research in augmentative and alternative communication establishes zero cognitive or motor prerequisites for AAC access. Treating nonsymbolic behaviors as communicative while ensuring every adult consistently models core vocabulary through Aided Language Input replaces adult over-speaking and expands autonomous expression.'
  },
  'sp5547-ch-03-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Enforcing Feeding Safety, IHP Updates, Positioning, and CVI Access',
    clinicalDescription:
      'A seven-year-old with spastic quadriplegic cerebral palsy, cortical visual impairment (CVI), seizures, and dysphagia slumps and coughs during lunch. His emergency seizure plan is two years outdated, a substitute aide offers thin liquids contrary to feeding orders, and classroom pages use cluttered black-and-white graphics.',
    diagnosis:
      'Halt unsafe feeding immediately, update the IHP and seizure protocol with the nurse, schedule PT/OT positioning checks, and apply high-contrast CVI visuals.',
    explanation:
      'Protecting medically complex learners requires current Individualized Healthcare Plans, strict compliance with dysphagia feeding protocols, and nurse-supervised delegation. Monitoring positioning fatigue reduces aspiration risk, while simplified, high-contrast visual layouts remove sensory access barriers linked to CVI.'
  },
  'sp5547-ch-04-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Centering Student Voice and Competitive Employment in Transition',
    clinicalDescription:
      'At a 17-year-old\'s transition IEP meeting, adults assign goals for sorting plastic bolts in a sheltered workshop without inviting input from the student or family. Academic goals involve isolated worksheet tracing disconnected from daily life, and the team treats modified alternative content standards as routine accommodations.',
    diagnosis:
      'Lead person-centered transition planning with student and family, align interagency competitive-employment supports, and write participation goals.',
    explanation:
      'IDEA and WIOA promote person-centered planning and competitive integrated employment with customized supports rather than default sheltered-workshop tracking. Distinguishing curriculum modifications from access accommodations ensures IEP goals link adapted academic instruction directly to valued adult community participation.'
  },
  'sp5547-ch-05-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Fading Prompt Dependence with Constant Time Delay and Chaining',
    clinicalDescription:
      'An 11-year-old with severe intellectual disability practices activating a single-switch blender only in a quiet therapy room with immediate hand-over-hand guidance on every trial. Whenever the aide pauses, he waits passively for physical touch and cannot transfer switch activation to science or cafeteria routines.',
    diagnosis:
      'Apply errorless constant time delay with task-analyzed chaining and systematic prompt fading across natural classroom routines using multiple exemplars.',
    explanation:
      'Unfaded hand-over-hand guidance creates chronic prompt dependence and suppresses independent initiation. Constant time delay systematically transfers stimulus control to natural environmental cues, while task-analyzed chaining and multiple-exemplar instruction across real settings establish durable maintenance and generalization.'
  },
  'sp5547-ch-06-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Replacing Seclusion and Aversives with Medical Rule-Out and FCT',
    clinicalDescription:
      'A 13-year-old nonspeaking student with autism and severe intellectual disability begins striking his ears and pinching staff during noisy assemblies and transitions. Without screening for ear infections, dental pain, or auditory overload, staff use locked seclusion and confiscate his preferred weighted vest as punishment.',
    diagnosis:
      'Stop seclusion and aversive consequences immediately, request medical and sensory rule-out, complete an ecological FBA, and teach break requests via FCT.',
    explanation:
      'Sudden self-injury or aggression in students with complex communication needs frequently signals untreated medical pain or sensory overload rather than willful defiance. Seclusion and aversive punishment violate ethical safety standards, whereas medical screening, FBA, and Functional Communication Training establish safe replacement skills.'
  },
  'sp5547-ch-07-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Separating Target Construct from Motor and Language Access Barriers',
    clinicalDescription:
      'A 10-year-old Vietnamese-English learner with severe dysarthria and quadriplegia takes a timed, norm-referenced English oral and written test without her dual-switch scanning array or extended time. Scoring at the floor, evaluators report profound cognitive decline despite strong comprehension shown on eye-gaze storyboards.',
    diagnosis:
      'Use accessible alternate or dynamic assessments protecting construct validity, allow untimed switch or eye-gaze responses, and provide home-language access.',
    explanation:
      'IDEA requires valid, nondiscriminatory assessments that measure intended knowledge rather than motor, speech, timing, or English-language barriers. Testing a switch user with timed oral-motor norms confounds physical access with cognition; matching response mode and language preserves construct validity.'
  },
  'sp5547-ch-08-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing RTI Delays, IQ Cutoffs, and Diagnostic Overshadowing',
    clinicalDescription:
      'A six-year-old with extensive motor, communication, and medical support needs enrolls from out of state. The district requires 16 weeks of RTI tiers before evaluating, relies solely on one brief office IQ score, and dismisses suspected visual impairment as part of her existing severe disability label.',
    diagnosis:
      'Start an immediate multi-setting evaluation with functional vision and adaptive assessments rather than delaying for RTI or single IQ cutoffs.',
    explanation:
      'Federal policy forbids using RTI to delay evaluating students with suspected extensive disabilities, and IDEA prohibits basing eligibility or service decisions on a single IQ cutoff or clinic snapshot. Comprehensive multi-setting evaluations counter diagnostic overshadowing so co-occurring sensory needs receive timely support.'
  },
  'sp5547-ch-09-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Tracking Prompt Hierarchies and Fidelity in Functional Data',
    clinicalDescription:
      'Staff log daily checkmarks for a student\'s AAC requesting goal in binders that go unreviewed until quarterly report cards. Sheets mark trials "correct" without distinguishing full physical prompts from independent activations, and the teacher discards a switch mount after three days without verifying staff positioning.',
    diagnosis:
      'Track accuracy and prompt-level hierarchy across settings, verify implementation fidelity before changing tools, and apply weekly data rules.',
    explanation:
      'Effective progress monitoring for students with extensive support needs records prompt levels and setting generalization rather than unused compliance tallies. Checking adult implementation fidelity prevents prematurely abandoning effective AAC or assistive tools when inconsistent positioning or cueing caused flat data.'
  },
  'sp5547-ch-10-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Protecting LRE, Manifestation Safeguards, and Health Privacy',
    clinicalDescription:
      'A district automatically assigns every student taking the Alternate Assessment (AA-AAS) to a separate regional school without reviewing general-education supplementary aids. Staff post a student\'s seizure medication schedule in a public hallway and send him home for 12 cumulative days without a manifestation review.',
    diagnosis:
      'Restore individualized LRE review with supplementary aids, hold an immediate manifestation determination review, protect FERPA privacy, and honor consent.',
    explanation:
      'AA-AAS participation never justifies automatic separate-school placement; IDEA requires individualized LRE decisions supported by supplementary aids and services. Exceeding 10 cumulative disciplinary removal days mandates manifestation determination protections, and displaying medical schedules publicly breaches FERPA health privacy.'
  },
  'sp5547-ch-11-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Replacing Velcro-Aide Isolation with Transdisciplinary Collaboration',
    clinicalDescription:
      'In a fifth-grade inclusive class, a one-to-one paraprofessional sits continuously beside a student with severe disabilities, blocking peer talk and improvising lesson changes without teacher direction. PT, OT, and SLP pull the student out separately for 150 weekly minutes while overlooking family home routines.',
    diagnosis:
      'Shift to transdisciplinary push-in collaboration, coach paraprofessionals to fade proximity for peer support, and center family lived expertise.',
    explanation:
      'Transdisciplinary role-release integrates PT, OT, and SLP strategies directly into natural classroom routines instead of fragmented pullout silos. Coaching paraprofessionals to facilitate peer-mediated interactions prevents proximity isolation, and incorporating family expertise aligns instruction across home and school.'
  },
  'sp5547-ch-12-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Maintaining Clinical Scope, Safety Boundaries, and Inclusive Advocacy',
    clinicalDescription:
      'An administrator pressures a special educator to perform uncertified tracheostomy suctioning during nurse shortages, adjust a student\'s wheelchair trunk supports without PT input, and accept excluding her class from school assemblies while a colleague introduces discredited rapid prompting.',
    diagnosis:
      'Decline out-of-scope medical and seating procedures, escalate nurse and PT coverage, advocate for inclusive schoolwide access, and uphold evidence-based AAC.',
    explanation:
      'CEC ethical standards and state nurse-practice statutes prohibit educators from performing uncertified invasive medical procedures or altering specialized orthopedic seating beyond professional scope. Enforcing safe team boundaries, challenging routine exclusion, and rejecting unvalidated methods protect student health, dignity, and sustainable practice.'
  }
};

module.exports = {
  special_education_learning_disabilities_5383,
  special_education_severe_profound_5547
};
