'use strict';

const CASE_DEFAULTS = {
  schemaVersion: 1,
  label: 'Applied clinical case',
  presentationLabel: 'Case presentation',
  answerLabel: 'Clinical decision',
  explanationLabel: 'Clinical reasoning',
};

function buildCase(entry) {
  return {
    ...CASE_DEFAULTS,
    ...entry,
  };
}

const audiology_5343 = {
  'aud5343-ch-01-section-04': buildCase({
    title: 'Biological Check Reveals 18 dB Output Shift Before Audiometry',
    clinicalDescription:
      'During morning biological calibration, an audiologist hears a noticeably softer 2000 Hz tone in the right supra-aural headphone than yesterday. A 2 cc coupler sound-level meter check confirms an 18 dB SPL drop with normal distortion. Clinic starts in 20 minutes, while the bone oscillator and insert earphones measure within ANSI S3.6 tolerances.',
    diagnosis:
      'Remove the faulty supra-aural headphone from service, schedule electroacoustic recalibration, and test with calibrated insert earphones.',
    explanation:
      'An 18 dB shift far exceeds ANSI S3.6 tolerances (within 3 dB at 2000 Hz) and invalidates air-conduction thresholds. Mentally adding a correction factor is unsafe because output linearity and transducer impedance may also drift. Switching to verified insert earphones preserves measurement quality until the headphone is repaired and recalibrated.',
  }),

  'aud5343-ch-02-section-04': buildCase({
    title: 'Age-Related High-Frequency Loss With Severe Noise Difficulty',
    clinicalDescription:
      'A 72-year-old retired teacher understands one-on-one speech in quiet but struggles severely in noisy restaurants. Audiometry shows bilateral symmetric sloping sensorineural loss (20 dB HL at 500 Hz to 60 dB HL at 4000-8000 Hz), Type A tympanograms, 88% word recognition in quiet, and a QuickSIN SNR loss of 11.5 dB.',
    diagnosis:
      'Classify as presbycusis with age-related temporal processing decline; fit binaural aids with directional microphones and a remote mic.',
    explanation:
      'Symmetric high-frequency SNHL with strong quiet word recognition yet an 11.5 dB QuickSIN SNR loss reflects combined cochlear presbycusis and central temporal aging effects. Relying on basic omnidirectional amplification alone ignores the severe SNR deficit that drives her listening fatigue and real-world communication breakdown.',
  }),

  'aud5343-ch-03-section-04': buildCase({
    title: 'Early Cisplatin Ototoxicity Found on Ultra-High-Frequency Testing',
    clinicalDescription:
      'A 46-year-old receiving cisplatin chemotherapy completes a pre-cycle monitoring visit. Conventional thresholds (250-8000 Hz) remain 15 dB HL or better bilaterally, but ultra-high-frequency audiometry shows a 20 dB threshold shift at 12.5 and 14 kHz bilaterally with a 6 dB DPOAE drop at 6-8 kHz and new tinnitus. He also plays amplified guitar unprotected.',
    diagnosis:
      'Document an ASHA ototoxic shift, notify oncology promptly for regimen review, and counsel on hearing protection for loud music.',
    explanation:
      'Cisplatin damages basal outer hair cells first, so a shift of 20 dB or more at one frequency or 10 dB at two adjacent frequencies meets ASHA ototoxicity criteria before speech frequencies decline. Waiting for conventional 2000-4000 Hz changes delays medical adjustment, and unprotected recreational music further compounds cochlear injury.',
  }),

  'aud5343-ch-04-section-04': buildCase({
    title: 'Closing EHDI Loss to Follow-Up After Newborn Hearing Refers',
    clinicalDescription:
      'Quarterly EHDI audit data from a regional hospital show a 98% birth-screen rate and a 3.2% refer rate, but 44% of referred infants—disproportionately from rural and Spanish-speaking families—miss diagnostic ABR by 3 months of age. Nursery staff currently hand parents an English brochure and instruct them to call an outpatient clinic later.',
    diagnosis:
      'Implement pre-discharge diagnostic ABR scheduling, bilingual care navigation, and active EHR tracking instead of adding extra rescreens.',
    explanation:
      'The hospital meets JCIH 1-3-6 birth-screening benchmarks, so the gap lies in diagnostic follow-up and health equity rather than screening sensitivity. Adding repeated outpatient rescreens increases delay and attrition; warm scheduling before discharge, language-concordant navigation, and active tracking directly reduce loss to follow-up.',
  }),

  'aud5343-ch-05-section-04': buildCase({
    title: 'Interpreting Sound-Field VRA Results in a 14-Month-Old Toddler',
    clinicalDescription:
      'A 14-month-old with recurrent otitis media completes sound-field visual reinforcement audiometry (VRA) with minimum response levels of 25 dB HL at 500 Hz and 20 dB HL at 2000 Hz before fatiguing. Right tympanogram is Type A, whereas the left tympanogram is flat Type B with normal 0.6 mL ear-canal volume and absent left DPOAEs.',
    diagnosis:
      'Recognize sound-field VRA reflects the better right ear; schedule insert-earphone VRA and medical evaluation for left middle-ear effusion.',
    explanation:
      'Sound-field VRA estimates sensitivity of the better-hearing ear only and cannot exclude unilateral conductive loss. The left flat Type B tympanogram with normal volume and absent DPOAEs strongly indicates otitis media with effusion; dismissing the toddler as having bilateral normal hearing from sound-field MRLs misses ear-specific pathology.',
  }),

  'aud5343-ch-06-section-04': buildCase({
    title: 'Cross-Check Battery Reveals Infant Auditory Neuropathy Spectrum',
    clinicalDescription:
      'A 4-month-old NICU graduate with severe neonatal hyperbilirubinemia undergoes sedated electrophysiology. Tympanograms are normal with a 1000 Hz probe, DPOAEs are robustly present from 2 to 6 kHz bilaterally, acoustic reflexes are absent, and click ABR shows absent neural Waves I-V at 90 dB nHL with an inverting cochlear microphonic across polarities.',
    diagnosis:
      'Diagnose bilateral Auditory Neuropathy Spectrum Disorder (ANSD) and defer hearing-aid fitting until reliable behavioral thresholds emerge.',
    explanation:
      'Present DPOAEs and a polarity-reversing cochlear microphonic verify intact outer hair cells, while absent ABR waves and acoustic reflexes indicate severe neural dyssynchrony under the cross-check principle. Immediately fitting high-gain hearing aids from absent ABR risks overamplification because ABR thresholds do not predict behavioral hearing in ANSD.',
  }),

  'aud5343-ch-07-section-04': buildCase({
    title: 'Differential Workup Before Diagnosing Auditory Processing Disorder',
    clinicalDescription:
      'An 8-year-old referred for suspected CAPD struggles with multi-step classroom directions and noisy cafeterias. Pure-tone thresholds are 5-10 dB HL bilaterally with Type A tympanograms and present DPOAEs. Teacher and parent ratings also note distractibility during silent reading, poor impulse control, and receptive language scores 1.8 SD below age norms.',
    diagnosis:
      'Defer a standalone CAPD diagnosis; coordinate psychoeducational ADHD and SLP language evaluations alongside classroom SNR supports.',
    explanation:
      'Central auditory processing tests rely on intact attention, working memory, and language. Difficulty during silent reading and low receptive language scores indicate broader cognitive-linguistic or attentional contributors rather than a modality-specific auditory deficit; diagnosing CAPD prematurely risks misdirecting school intervention.',
  }),

  'aud5343-ch-08-section-04': buildCase({
    title: 'Documenting Classroom Impact of Unilateral Loss for IEP Access',
    clinicalDescription:
      'A 7-year-old with profound right SNHL and normal left hearing (10 dB HL or better) passes quiet hallway checks, so the school team questions service need. Functional assessment shows 96% quiet speech recognition, 58% in +5 dB SNR classroom noise, poor localization, and LIFE-R scores noting fatigue in a classroom with 0.9 s reverberation.',
    diagnosis:
      'Recommend educational audiology services on an IEP or 504 plan with a remote microphone, preferential seating, and acoustic treatment.',
    explanation:
      'Normal quiet speech recognition masks substantial classroom impairment caused by loss of binaural squelch, head-shadow attenuation, and reverberation exceeding the ANSI S12.60 target of 0.6 s or less. Connecting degraded speech-in-noise scores and listening fatigue to classroom participation establishes educational impact beyond audiogram thresholds.',
  }),

  'aud5343-ch-09-section-04': buildCase({
    title: 'Solving Occlusion Dissatisfaction After Verified NAL-NL2 Fitting',
    clinicalDescription:
      'Three weeks after a first bilateral BTE fitting verified within 3 dB of NAL-NL2 targets via real-ear measurement, a 64-year-old reports a hollow own-voice quality, clattering dishes, and COSI progress of only 2/5 for family dinners. Data logging shows 2.5 hours/day wear time, and inspection shows closed occluding domes over 25 dB low-frequency thresholds.',
    diagnosis:
      'Switch to open or larger-vent coupling, re-verify REM and MPO comfort, counsel on gradual acclimatization, and schedule a 2-week check.',
    explanation:
      'Verification confirms prescriptive output, but validation via COSI and data logging exposes occlusion effect and loudness discomfort causing low wear time. Slashing overall gain away from NAL-NL2 targets or dismissing his concerns fails to correct the physical occlusion produced by closed domes over near-normal low-frequency hearing.',
  }),

  'aud5343-ch-10-section-04': buildCase({
    title: 'Pre-MRI Conditional Safety and Streaming Drops in a CI Recipient',
    clinicalDescription:
      'A 58-year-old bilateral cochlear implant recipient scheduled for a 3.0-Tesla brain MRI asks whether removing his external processors makes scanning safe. He also notes his right processor drops Bluetooth phone audio while live speech stays clear; battery voltage, microphone covers, and headpiece coil cable all test normal.',
    diagnosis:
      'Confirm exact internal implant MRI-conditional labeling with radiology before scanning; re-pair Bluetooth and check firmware for drops.',
    explanation:
      'Internal CI magnets can torque, heat, or demagnetize at 3.0 T depending on the exact device generation; certain models require head wrapping or magnet removal even without external processors. Clear live speech rules out coil or microphone hardware failure, guiding systematic troubleshooting toward wireless pairing, routing, and firmware updates.',
  }),

  'aud5343-ch-11-section-04': buildCase({
    title: 'Building Adolescent Self-Advocacy and Section 504 Classroom Access',
    clinicalDescription:
      'A 15-year-old with moderate bilateral SNHL wears verified BTEs daily but leaves her remote microphone in her locker because handing a lanyard transmitter to six high school teachers feels embarrassing. Her grades dropped in a noisy, bare-walled science lab with frequent peer-group discussions, though she meets grade-level academic standards.',
    diagnosis:
      'Update her Section 504 plan with discreet multi-talker tabletop mic options, acoustic dampening, captions, and self-advocacy coaching.',
    explanation:
      'Assistive technology fails when adolescent stigma and multi-talker peer discussions are overlooked; simply insisting teachers wear one lanyard mic leaves peer speech inaccessible. Combining a discreet tabletop or pass-around remote microphone with acoustic modifications, captioned media, and structured self-advocacy scripts restores functional access.',
  }),

  'aud5343-ch-12-section-04': buildCase({
    title: 'Out-of-State Teleaudiology Request With Sudden Unilateral Loss',
    clinicalDescription:
      'During a remote hearing-aid fine-tuning session, an established patient staying at a vacation home in a neighboring state where the audiologist lacks licensure reports waking 12 hours ago with sudden total right-ear hearing loss, roaring tinnitus, and mild unsteadiness. She asks the audiologist to increase her right aid gain instead of seeing a physician.',
    diagnosis:
      'Decline out-of-jurisdiction remote programming and direct the patient to urgent same-day ENT or emergency medical care for SSNHL.',
    explanation:
      'Sudden unilateral sensorineural hearing loss is an otologic emergency with a time-sensitive corticosteroid treatment window; boosting hearing-aid gain delays medical evaluation of retrocochlear or vascular causes. Furthermore, teleaudiology jurisdiction follows the patient\'s physical location, prohibiting clinical care across unlicensed state borders.',
  }),
};

const speech_language_pathology_5331 = {
  'slp5331-ch-01-section-04': buildCase({
    title: 'Separating Typical Toddler Speech Variation From Clinical Delay',
    clinicalDescription:
      'Parents of a 30-month-old boy worry he has a severe speech disorder after reading an online checklist. Evaluation reveals over 200 spoken words, regular 2-3 word phrases, strong joint attention, age-appropriate receptive language, 70% intelligibility to familiar caregivers, gliding of /r/ and /l/, cluster reduction on "sp-" words, and passed hearing.',
    diagnosis:
      'Reassure caregivers that communication falls within the typical developmental range and share naturalistic home language tips without therapy.',
    explanation:
      'At 30 months, a 200-word vocabulary, multiword combinations, 70% familiar intelligibility, and persisting cluster reduction or gliding fit well within typical developmental ranges (cluster reduction suppresses around age 4 and gliding around ages 5-6). Initiating therapy for age-expected phonological patterns risks over-identification.',
  }),

  'slp5331-ch-02-section-04': buildCase({
    title: 'Supervision Scope Boundaries for an SLPA in School Telepractice',
    clinicalDescription:
      'A rural district short on clinicians asks a supervising SLP to let an experienced remote SLPA administer an initial standardized language battery and draft IEP eligibility recommendations for a 2nd grader via telepractice, with the SLP reviewing scores afterward. The SLPA has three years of strong therapy performance and rapport with the child.',
    diagnosis:
      'Decline delegating evaluation or eligibility decisions; conduct the assessment directly and keep SLPA duties within authorized scope.',
    explanation:
      'Under ASHA ethics and state supervision standards, SLPAs may not administer standardized diagnostic evaluations, interpret test findings, or make IEP eligibility determinations regardless of staffing shortages or experience. The supervising SLP retains legal accountability, must complete diagnostic testing directly, and delegates only treatment tasks.',
  }),

  'slp5331-ch-03-section-04': buildCase({
    title: 'Bilingual Dynamic Assessment Ruling Out Developmental Language Disorder',
    clinicalDescription:
      'A 6-year-old sequential Spanish-English bilingual student scores 74 on an English-only language test and omits English past-tense "-ed." With a trained Spanish interpreter, narrative sampling reveals rich Spanish syntax and story grammar, and a test-teach-retest dynamic assessment shows rapid modifiability with minimal examiner effort on English morphology.',
    diagnosis:
      'Classify as typical second-language acquisition (language difference), not a language disorder, and decline special education eligibility.',
    explanation:
      'Monolingual English norm-referenced tests penalize emerging bilingual learners and violate IDEA non-discriminatory evaluation mandates. Intact first-language skills confirmed with a qualified interpreter plus high modifiability on dynamic assessment prove strong language-learning capacity, ruling out disorder in favor of classroom ESOL support.',
  }),

  'slp5331-ch-04-section-04': buildCase({
    title: 'Silent Aspiration Risk After Lateral Medullary Stroke',
    clinicalDescription:
      'A 68-year-old man 3 days after a lateral medullary (Wallenberg) stroke presents with wet hoarse voice, weak volitional cough, pooled oral secretions, and throat clearing during bedside thin-liquid trials, without overt coughing on small sips. Chest radiograph shows a new right lower-lobe infiltrate alongside an intermittent low-grade fever.',
    diagnosis:
      'Recommend NPO status pending instrumental VFSS or FEES to evaluate pharyngeal physiology and suspected silent aspiration.',
    explanation:
      'Lateral medullary infarcts frequently impair CN IX and X pharyngeal constriction, cricopharyngeal opening, and laryngeal sensation, producing high silent-aspiration risk that bedside trials cannot exclude. Empirically prescribing thickened liquids without VFSS or FEES risks worsening pharyngeal residue and recurrent aspiration pneumonia.',
  }),

  'slp5331-ch-05-section-04': buildCase({
    title: 'Differential Diagnosis of Fluent Aphasia in an Integrated Report',
    clinicalDescription:
      'A 61-year-old woman 2 weeks after a left MCA ischemic stroke speaks fluently with normal prosody, frequent phonemic paraphasias, empty circumlocutions, impaired multi-step auditory comprehension, and severe repetition breakdown (2/10 phrases). Visual attention and social turn-taking are intact, accompanied by mild right-sided hemiparesis.',
    diagnosis:
      'Diagnose fluent Wernicke aphasia in an integrated report while documenting acute recovery uncertainty and functional communication priorities.',
    explanation:
      'Fluent speech with paraphasias, impaired auditory comprehension, and poor repetition following a left perisylvian MCA infarct defines Wernicke aphasia, distinguishing it from transcortical sensory aphasia (spared repetition) and right-hemisphere cognitive-communication disorder. Clearly noting acute-phase prognosis guides realistic team goals.',
  }),

  'slp5331-ch-06-section-04': buildCase({
    title: 'Separating Acquired Apraxia of Speech From Flaccid Dysarthria',
    clinicalDescription:
      'A 59-year-old post-left frontal stroke shows slow, segmented speech with equalized stress, articulatory groping on multisyllabic words, and inconsistent distortions across three repetitions of the same word. Oral exam reveals symmetrical facial strength, normal sustained /a/, normal resonance, intact AMRs ("puh-puh-puh"), and severely impaired SMRs ("puh-tuh-kuh").',
    diagnosis:
      'Diagnose acquired apraxia of speech (AOS) driven by impaired motor sequencing and programming with spared neuromuscular strength.',
    explanation:
      'Inconsistent articulatory errors, groping, prosodic equalization, and normal alternating motion rates paired with broken sequential motion rates are classic diagnostic markers of AOS. Symmetrical strength, normal phonation, and intact velopharyngeal resonance rule out flaccid dysarthria, which causes consistent weakness across speech subsystems.',
  }),

  'slp5331-ch-07-section-04': buildCase({
    title: 'Unverified Aided Hearing Access Mimicking Primary Language Delay',
    clinicalDescription:
      'A 4-year-old with bilateral moderate-to-severe SNHL who uses hearing aids and spoken English is referred for stagnant morphology and frequent /s/ and /z/ omissions. During SLP intake, he misses /s/ and /sh/ on the Ling Six-Sound Test at 3 feet, his left earmold tubing is cracked with moisture, and parents report he removes aids at preschool.',
    diagnosis:
      'Coordinate prompt audiology device repair and REM verification before attributing speech-language gaps to a primary language disorder.',
    explanation:
      'Unaided audiograms do not guarantee consistent aided speech audibility; missing Ling /s/ and /sh/ with damaged tubing confirms poor high-frequency access that directly disrupts fricatives and grammatical markers. Interpreting standardized language scores without first restoring verified hearing access and classroom remote-mic support risks misdiagnosis.',
  }),

  'slp5331-ch-08-section-04': buildCase({
    title: 'Interprofessional Triage for Toddler Pediatric Feeding Disorder',
    clinicalDescription:
      'A 22-month-old referred for picky eating accepts only 6 crunchy beige foods and milk, dropped from the 50th to the 12th weight-for-length percentile over 4 months, arches and gags at purees, and endures tense meals where parents chase him with spoons. History includes chronic constipation and frequent spit-ups never evaluated medically.',
    diagnosis:
      'Identify Pediatric Feeding Disorder across all four domains; coordinate GI and dietitian referrals alongside caregiver-centered assessment.',
    explanation:
      'Weight faltering, severe diet restriction, gagging with arching, and mealtime distress satisfy Pediatric Feeding Disorder criteria spanning medical, nutritional, feeding-skill, and psychosocial domains. Beginning behavioral food exposure alone without medical evaluation of reflux or constipation and nutrition support risks pain-reinforced aversion.',
  }),

  'slp5331-ch-09-section-04': buildCase({
    title: 'Auditing Dosage and Fidelity Before Discharging a Plateaued Student',
    clinicalDescription:
      'After 10 weeks of twice-weekly group therapy targeting /r/ in sentences, an 8-year-old shows a flat progress graph at 22-28% accuracy despite 100% attendance. Record review shows 4-student mixed-goal groups averaging only 12 /r/ trials per session, no home practice cueing, and 80% accuracy during a brief 1:1 phonetic placement probe.',
    diagnosis:
      'Revise service delivery to high-trial intensity with explicit phonetic placement or biofeedback rather than discharging for plateau.',
    explanation:
      'Strong 1:1 stimulability demonstrates clear learning potential; flat progress reflects insufficient dosage (12 trials falls far below motor-learning needs of 50-100+ trials) and weak treatment fidelity inside heterogeneous groups. Discharging based on a flat graph without auditing dosage and instructional design violates evidence-based progress monitoring.',
  }),

  'slp5331-ch-10-section-04': buildCase({
    title: 'Selecting Integral Stimulation Over Non-Speech Exercises for CAS',
    clinicalDescription:
      'A 5-year-old with moderate-to-severe Childhood Apraxia of Speech (CAS) displays inconsistent vowel distortions, voicing errors, and syllable segregation across repeated words, with strong receptive language and emerging tablet AAC use. Six months of prior therapy using blowing bubbles and tongue push-ups yielded zero intelligibility improvement.',
    diagnosis:
      'Discontinue non-speech oral motor exercises and begin Dynamic Temporal and Tactile Cueing (DTTC) integral stimulation with AAC support.',
    explanation:
      'CAS is a speech motor planning disorder that responds to high-repetition practice of actual speech movement transitions with multisensory cues, blocked-to-random scheduling, and faded feedback (DTTC). Non-speech oral motor exercises do not transfer to speech accuracy, while keeping multimodal AAC supports daily communication during speech gains.',
  }),

  'slp5331-ch-11-section-04': buildCase({
    title: 'Launching Robust AAC Without Cognitive Prerequisite Gating',
    clinicalDescription:
      'A 3-year-old nonspeaking autistic child with strong visual interest leads adults by the hand to preferred snacks, cries during routine transitions, and uses 3 spoken approximations inconsistently. A team member proposes delaying a speech-generating device until he masters picture-to-object matching and proves cause-and-effect on a single switch.',
    diagnosis:
      'Introduce a robust core-and-fringe AAC system immediately with partner aided language input across routines; reject prerequisite gating.',
    explanation:
      'ASHA guidelines and AAC research firmly reject cognitive or behavioral prerequisites because children acquire symbol meaning through partner-modeled aided language input in meaningful routines. Restricting access to a single-message switch caps communicative functions and stalls language growth, whereas robust AAC supports rather than inhibits speech.',
  }),

  'slp5331-ch-12-section-04': buildCase({
    title: 'Pairing Safe NG Tube Nutrition With Responsive Oral Puree Meals',
    clinicalDescription:
      'A 10-month-old infant with repaired congenital heart disease and faltering growth shows silent aspiration of thin and mildly thick liquids on VFSS but swallows smooth purees safely. The team places a nasogastric (NG) tube for fluid and calorie catch-up; parents fear he can never eat orally and ask to push extra puree spoonfuls.',
    diagnosis:
      'Use the NG tube for safe hydration and nutrition while coaching caregivers in low-pressure responsive puree meals aligned with VFSS results.',
    explanation:
      'Alternate nutrition via NG tube protects pulmonary safety and caloric growth while removing pressure from meals rather than banning safe oral intake. Coaching parents in responsive feeding—following infant hunger and satiety cues during safe puree opportunities without coercive spoon-feeding—preserves oral skills and positive caregiver interaction.',
  }),
};

module.exports = {
  audiology_5343,
  speech_language_pathology_5331,
};
