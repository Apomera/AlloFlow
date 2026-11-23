'use strict';

// Applied clinical case workshops for Praxis Audiology (5343) and
// Praxis Speech-Language Pathology (5331).
// Original unscored practice cases designed for diagnostic reasoning,
// evidence-based intervention planning, and ethical/legal judgment.

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE = 'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or clinical determination. AlloFlow does not score written responses.';

const audiology_5343 = {
  workshopLabel: 'Applied clinical case workshops',
  workshopPracticeNote: 'Independent applied clinical case-analysis workshops designed to build diagnostic reasoning, amplification/rehabilitation planning, and ethical judgment for Audiology (5343) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or clinical determinations.',
  workshops: [
    {
      id: 'aud5343-workshop-01',
      taskType: 'Acoustics & psychoacoustic case analysis',
      title: 'Resolve transducer artifacts and cochlear masking effects',
      prompt: 'Analyze the acoustic and psychoacoustic mechanisms underlying an apparent high-frequency air-bone gap and poor speech clarity in background noise, and formulate a verification and counseling plan.',
      stimulus: 'A 63-year-old machinist reports muffled consonants in a noisy cafeteria. Supra-aural air thresholds are 55 dB HL at 2000 Hz and 65 dB HL at 4000 Hz bilaterally, with bone at 35 and 45 dB HL. Tympanograms are bilateral Type A with present ipsilateral acoustic reflexes at 85 dB HL. Repeat air testing with foam insert earphones drops thresholds to 40 dB HL at 2000 Hz and 45 dB HL at 4000 Hz.',
      estimatedMinutes: 15,
      taskParts: [
        'Explain why switching from supra-aural cushions to foam insert earphones eliminated the 15 to 20 dB high-frequency air-bone gap despite normal middle-ear admittance.',
        'Connect outer hair cell cochlear loss to upward spread of masking and broadened auditory filter bandwidths to account for the cafeteria speech-in-noise complaint.',
        'Recommend transducer calibration checks, ear-canal acoustic measurements, and communication strategies that address both test validity and real-world listening.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Contrast the supra-aural and insert-earphone air thresholds at 2000 and 4000 Hz against the bone thresholds, Type A tympanograms, and present ipsilateral reflexes.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Link pinna and cartilaginous canal collapse under headband pressure to high-frequency attenuation, and connect cochlear outer hair cell loss to reduced frequency selectivity.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Standardize insert-earphone testing with documented coupling depth, add quick speech-in-noise assessment, and address low-frequency noise masking through directional amplification or environmental changes.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Verify ANSI biological and coupler calibration for insert transducers, note collapsing-canal risk in the chart, and review realistic speech-in-noise expectations.',
        },
      ],
      successCriteria: [
        'Accurately identifies collapsing ear canals under supra-aural headphone pressure as the cause of the false high-frequency air-bone gap.',
        'Uses Type A tympanometry and present acoustic reflexes to rule out true middle-ear conductive pathology.',
        'Explains how upward spread of low-frequency cafeteria noise and broadened cochlear filters degrade high-frequency consonant perception.',
        'Proposes insert-earphone protocol documentation, speech-in-noise testing, and targeted signal-to-noise ratio improvements.',
      ],
      commonPitfalls: [
        'Diagnosing otosclerosis or ossicular fixation solely from the initial supra-aural air-bone gap while ignoring normal immittance and reflexes.',
        'Assuming bone-conduction thresholds are erroneous instead of recognizing transducer-induced canal collapse at 2000 to 4000 Hz.',
        'Explaining cafeteria difficulty only by elevated pure-tone thresholds rather than cochlear nonlinearities and upward spread of masking.',
        'Omitting chart alerts for future testers so the collapsing-canal artifact recurs on follow-up monitoring audiograms.',
      ],
      sampleOutline: [
        'Evidence synthesis: Supra-aural headphones produced a 15 to 20 dB gap at 2000 to 4000 Hz that resolved with insert earphones, aligning with Type A tympanograms and present reflexes.',
        'Acoustic and psychoacoustic basis: Headband pressure collapsed the cartilaginous meatus, attenuating high frequencies; residual mild-to-moderate cochlear loss broadens auditory filters and heightens upward spread of masking in low-frequency noise.',
        'Clinical plan: Adopt insert earphones for all follow-up testing, administer speech-in-noise testing such as QuickSIN, and explore directional amplification or remote-microphone options.',
        'Safeguards: Confirm insert-earphone ANSI calibration, flag collapsing-canal anatomy in the record, and counsel the patient on seating away from low-frequency noise sources.',
      ],
      references: [
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5343.pdf',
        'https://www.asha.org/practice-portal/clinical-topics/hearing-loss/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'aud5343-workshop-02',
      taskType: 'Hearing conservation & ototoxicity case analysis',
      title: 'Manage an occupational threshold shift with solvent exposure',
      prompt: 'Evaluate an industrial worker with a newly identified occupational threshold shift and concurrent chemical exposure, and outline compliant hearing conservation and ototoxic monitoring actions.',
      stimulus: 'A 41-year-old metal-fabrication technician works 8-hour shifts at a time-weighted average of 92 dBA while using toluene-based degreasers. Baseline left-ear thresholds were 10, 15, and 15 dB HL at 2000, 3000, and 4000 Hz. Today, the annual audiogram shows left thresholds of 20, 30, and 30 dB HL after 14 noise-free hours, while the right ear remains unchanged. The worker wears foam earplugs labeled NRR 30 dB loosely during hot afternoons.',
      estimatedMinutes: 15,
      taskParts: [
        'Calculate the left-ear threshold shift across 2000, 3000, and 4000 Hz and determine whether OSHA Standard Threshold Shift and hearing-conservation enrollment criteria are met.',
        'Explain how inconsistent earplug insertion, NRR derating, and synergistic toluene-plus-noise ototoxicity compound cochlear risk beyond sound-level dosimetry alone.',
        'Outline the required regulatory follow-up timeline, hearing-protection refitting plan, and expanded audiologic monitoring protocol.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Compute the average left-ear change at 2000, 3000, and 4000 Hz (+13.3 dB), note the 92 dBA TWA exceeding both the 85 dBA action level and 90 dBA PEL, and flag concurrent toluene exposure.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply OSHA 29 CFR 1910.95 STS criteria (10 dB average shift at 2000, 3000, and 4000 Hz), real-world NRR attenuation limits, and organic solvent synergy with noise.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Schedule a 30-day confirmation retest, issue written notification within 21 days if confirmed, refit and fit-test hearing protection, and coordinate engineering or solvent controls.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Add ultra-high-frequency audiometry and DPOAEs for ototoxic surveillance, review OSHA 300 recordability criteria, and arrange medical referral for unilateral asymmetry if persistent.',
        },
      ],
      successCriteria: [
        'Correctly calculates the 13.3 dB average left-ear shift at 2000, 3000, and 4000 Hz and identifies an OSHA Standard Threshold Shift.',
        'Recognizes that 92 dBA TWA exceeds both the 85 dBA action level and the 90 dBA permissible exposure limit, making hearing protection mandatory.',
        'Explains why laboratory NRR 30 dB overestimates field attenuation when earplugs are loosely fitted and notes toluene synergy with noise.',
        'Specifies the 30-day retest option, 21-day written employee notification, HPD refitting/retraining, and evaluation of asymmetric hearing loss.',
      ],
      commonPitfalls: [
        'Averaging 500, 1000, and 2000 Hz instead of 2000, 3000, and 4000 Hz when calculating an OSHA Standard Threshold Shift.',
        'Subtracting the raw NRR 30 dB directly from 92 dBA without applying C-to-A weighting or real-world fit derating.',
        'Overlooking toluene as an ototoxic chemical that increases cochlear vulnerability even at moderate noise levels.',
        'Failing to consider medical referral for unilateral or asymmetric shift alongside noise-induced etiology.',
      ],
      sampleOutline: [
        'Evidence: Left-ear thresholds worsened by 10, 15, and 15 dB at 2000, 3000, and 4000 Hz (mean +13.3 dB), meeting OSHA STS criteria in a 92 dBA TWA workplace with toluene exposure.',
        'Principle: Real-world foam earplug attenuation falls steeply with loose insertion, and aromatic solvents potentiate outer hair cell and central auditory damage from industrial noise.',
        'Action plan: Conduct a confirmation audiogram within 30 days, deliver written notification within 21 days of determination, perform objective HPD fit-testing, and coordinate ventilation or engineering noise controls.',
        'Safeguards: Evaluate age-correction and OSHA 300 log criteria, refer for medical evaluation given unilateral asymmetry, and institute DPOAE and high-frequency ototoxicity monitoring.',
      ],
      references: [
        'https://www.osha.gov/noise/hearing-programs',
        'https://www.asha.org/policy/SP2018-00353/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'aud5343-workshop-03',
      taskType: 'Pediatric EHDI & electrophysiologic cross-check',
      title: 'Synthesize discordant OAE and ABR findings in a NICU infant',
      prompt: 'Apply the audiologic cross-check principle and EHDI 1-3-6 benchmarks to interpret discordant physiologic test results in a high-risk infant and design an immediate family-centered plan.',
      stimulus: 'An 8-week-old NICU graduate treated for severe hyperbilirubinemia and 6 days of gentamicin referred bilaterally on automated ABR after passing an earlier TEOAE screen. Today, 1000-Hz tympanograms are normal bilaterally, DPOAEs are robust from 1500 to 6000 Hz, acoustic reflexes are absent, and 90 dBnHL click ABR shows absent Wave V with a cochlear microphonic inverting across rarefaction and condensation polarities.',
      estimatedMinutes: 15,
      taskParts: [
        'Integrate the 1000-Hz tympanometry, DPOAE, acoustic reflex, and polarity-reversed click ABR findings to identify the most likely site of lesion and clinical classification.',
        'Explain why the newborn passed an initial TEOAE screen and why NICU EHDI protocols require automated ABR screening rather than OAE-only screening.',
        'Outline developmentally appropriate follow-up testing, early intervention referral under EHDI 1-3-6 guidelines, and family counseling on why amplification decisions await behavioral thresholds.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Link preserved DPOAEs and polarity-inverting cochlear microphonics (intact outer hair cells) with absent ABR waves and absent acoustic reflexes (neural dyssynchrony) plus hyperbilirubinemia risk.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply the cross-check principle for Auditory Neuropathy Spectrum Disorder (ANSD), use 1000-Hz probe tones for infants under 6 months, and follow EHDI 1-3-6 timelines.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Refer promptly to Part C early intervention before 6 months, coordinate pediatric neurology and genetics/medical evaluation, and monitor developmental milestones while preparing for behavioral VRA.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Avoid fitting hearing aids solely from absent ABR thresholds before reliable behavioral estimates are obtained, and counsel parents on visual cues, low-noise routines, and fluctuating auditory access.',
        },
      ],
      successCriteria: [
        'Identifies Auditory Neuropathy Spectrum Disorder (ANSD) from preserved DPOAEs and inverting cochlear microphonic paired with absent ABR and reflexes.',
        'Explains why 1000-Hz tympanometry is essential in young infants and why OAE-only screening misses ANSD in NICU populations.',
        'Connects the 8-week diagnostic milestone to the EHDI 1-3-6 framework, initiating Part C early intervention well before 6 months of age.',
        'Cautions against prescribing high-gain amplification based solely on absent ABR without behavioral threshold confirmation and careful trial monitoring.',
      ],
      commonPitfalls: [
        'Misinterpreting the inverting cochlear microphonic as a present Wave I or normal neural ABR response.',
        'Concluding that robust DPOAEs prove normal functional hearing and discharging the infant from follow-up.',
        'Fitting maximum-power hearing aids immediately from absent ABR thresholds without verifying behavioral sensitivity, risking noise trauma to intact outer hair cells.',
        'Using a 226-Hz tympanometry probe tone in a 2-month-old infant, which can yield misleadingly normal tracings despite middle-ear effusion.',
      ],
      sampleOutline: [
        'Diagnostic synthesis: Normal 1000-Hz tympanograms, robust DPOAEs, inverting cochlear microphonic, and absent ABR/reflexes confirm bilateral ANSD linked to hyperbilirubinemia.',
        'EHDI rationale: Because OAEs reflect outer hair cell motility only, NICU infants require automated ABR screening to detect retrocochlear or synaptic dyssynchrony within the 1-3-6 window.',
        'Management plan: Initiate immediate Part C early intervention and family-centered communication support, coordinate pediatric ENT/neurology/imaging evaluation, and track auditory skill development.',
        'Safeguards: Defer permanent amplification settings until reliable behavioral VRA thresholds are established around 6 to 8 months, and monitor for spontaneous maturation or cochlear implant candidacy.',
      ],
      references: [
        'https://www.cdc.gov/hearing-loss-children/about/',
        'https://www.asha.org/practice-portal/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'aud5343-workshop-04',
      taskType: 'Diagnostic masking & retrocochlear triage',
      title: 'Uncover asymmetric retrocochlear pathology across test batteries',
      prompt: 'Determine masking requirements for an asymmetric audiogram, integrate immittance, speech, electrophysiologic, and vestibular findings, and establish an urgent referral and documentation plan.',
      stimulus: 'A 54-year-old teacher reports 9 months of progressive right hearing loss, unilateral tinnitus, and brief imbalance. Left air and bone thresholds are 10 to 15 dB HL. Unmasked right supra-aural air is 55 to 70 dB HL (500 to 4000 Hz) with unmasked bone at 10 to 15 dB HL; masked right bone matches air. Right WRS peaks at 36% (75 dB HL) and drops to 16% (95 dB HL). Right reflexes are absent with decay; VNG shows 38% right caloric weakness.',
      estimatedMinutes: 15,
      taskParts: [
        'Justify why clinical masking was required for both right air conduction (under supra-aural headphones) and right bone conduction using interaural attenuation rules.',
        'Synthesize the asymmetric SNHL, WRS rollover, absent/decaying acoustic reflexes, and 38% unilateral caloric weakness to localize the probable site of lesion.',
        'Specify urgent medical referral actions, additional diagnostic confirmation such as stacked/click ABR or MRI coordination, and interim patient safety counseling.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Inventory every retrocochlear red flag: asymmetric SNHL, severe WRS rollover (36% to 16%), absent right reflexes with decay, unilateral tinnitus, and 38% right caloric weakness.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply supra-aural AC interaural attenuation (40 dB) and BC interaural attenuation (0 dB) rules to prevent cross-hearing shadow curves, and integrate vestibular-auditory CN VIII localization.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Issue an expedited neurotology or ENT referral for contrast-enhanced MRI of the internal auditory canals, defer routine hearing-aid dispensing pending medical clearance, and consider ABR if MRI is contraindicated.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Counsel the patient calmly without diagnosing a tumor directly, screen for acute central neurological emergency signs, document communication of urgency, and track referral completion.',
        },
      ],
      successCriteria: [
        'Applies interaural attenuation rules accurately to show why unmasked right AC and BC crossed over to the normal-hearing left cochlea.',
        'Recognizes the converging CN VIII retrocochlear pattern across asymmetric SNHL, disproportionate WRS rollover, reflex decay, and unilateral caloric weakness.',
        'Prioritizes prompt medical referral for neuroimaging rather than proceeding directly to hearing-aid fitting.',
        'Maintains scope-of-practice communication boundaries by reporting audiologic red flags without rendering a definitive medical diagnosis.',
      ],
      commonPitfalls: [
        'Accepting unmasked bone conduction at 10 to 15 dB HL as a conductive right-ear air-bone gap instead of recognizing 0 dB bone interaural attenuation.',
        'Assuming 38% caloric weakness indicates benign paroxysmal positional vertigo rather than unilateral peripheral-vestibular nerve hypofunction.',
        'Recommending a CROS or right hearing aid before neurotologic clearance for a suspected vestibular schwannoma.',
        'Over-masking the non-test left ear when bone-conduction masking is applied without checking the masking plateau.',
      ],
      sampleOutline: [
        'Masking analysis: Because supra-aural AC IA is 40 dB and BC IA is 0 dB, the 45 to 55 dB interaural gap required Plateau masking to reveal true right sensorineural loss rather than a shadow curve.',
        'Retrocochlear cross-check: Asymmetric SNHL, severe PI-PB rollover (36% dropping to 16%), reflex abnormalities, unilateral tinnitus, and 38% right caloric weakness converge on right CN VIII pathology.',
        'Referral plan: Expedite neurotology/ENT referral for MRI evaluation (or ABR if MRI is contraindicated) and hold amplification decisions until medical clearance.',
        'Safeguards: Deliver clear, non-alarmist counseling within audiology scope, provide fall-safety precautions for disequilibrium, and verify closed-loop referral follow-up.',
      ],
      references: [
        'https://www.asha.org/practice-portal/clinical-topics/hearing-loss/',
        'https://www.asha.org/certification/2020-Audiology-Certification-Standards/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'aud5343-workshop-05',
      taskType: 'Amplification verification & cochlear implant candidacy',
      title: 'Transition from verified hearing aids to cochlear implant evaluation',
      prompt: 'Evaluate probe-microphone verification and aided speech recognition outcomes in an adult hearing-aid user to determine cochlear implant candidacy referral, interim assistive technology, and rehabilitative goals.',
      stimulus: 'A 67-year-old retired librarian with bilateral sloping SNHL (PTA 78 dB HL right, 82 dB HL left) wears 4-year-old BTE hearing aids with custom earmolds. Real-ear aided response (REAR) matches NAL-NL2 targets within 3 dB through 2000 Hz at 55, 65, and 75 dB SPL with MPO below UCL, yet aided AzBio quiet sentence scores are 32% right, 34% left, and 38% bilaterally. Her HHIA score is 68, and she now skips book club.',
      estimatedMinutes: 15,
      taskParts: [
        'Interpret the NAL-NL2 real-ear verification alongside the 38% bilateral aided AzBio score to explain why reprogramming alone is unlikely to restore functional speech understanding.',
        'Justify a formal cochlear implant candidacy evaluation and describe the multidisciplinary assessments, vaccination/medical counseling, and bimodal listening considerations involved.',
        'Design an interim audiologic rehabilitation plan combining remote-microphone technology, communication partner strategies, and measurable COSI/HHIA validation outcomes.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Highlight that REAR already matches NAL-NL2 targets with safe MPO while aided AzBio scores remain at 32% to 38% and HHIA (68) shows severe participation restriction.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Distinguish electroacoustic verification (probe-microphone target match) from functional validation (speech recognition and self-report) and apply adult CI candidacy criteria.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Refer to a cochlear implant center for full candidacy workup, trial a Bluetooth remote microphone for book club immediately, and establish structured communication-strategy training.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Verify custom earmold acoustic seal for any feedback/high-frequency gain limits, counsel on realistic post-CI auditory training timelines, and re-administer COSI and HHIA to track participation.',
        },
      ],
      successCriteria: [
        'Distinguishes electroacoustic verification (REAR matching NAL-NL2) from aided functional performance (AzBio 38% and HHIA 68).',
        'Correctly identifies adult cochlear implant candidacy referral criteria when appropriately verified amplification yields poor open-set sentence recognition.',
        'Integrates person-centered audiologic rehabilitation including remote-microphone HAT, environmental modifications, and realistic counseling.',
        'Specifies structured outcome validation measures (COSI, HHIA, aided speech-in-noise) and bimodal or post-implant follow-up coordination.',
      ],
      commonPitfalls: [
        'Increasing hearing-aid gain above uncomfortable loudness levels (UCL) to force 4000 Hz audibility despite verified severe-to-profound cochlear dead regions or distortion.',
        'Substituting manufacturer first-fit software simulations for live probe-microphone real-ear measurement when establishing best-aided CI candidacy.',
        'Telling the patient that a cochlear implant immediately restores normal hearing without explaining post-activation mapping and auditory training.',
        'Delaying interim remote-microphone or communication-partner supports while the patient waits months for CI candidacy appointments.',
      ],
      sampleOutline: [
        'Verification vs. validation: Probe-microphone REAR confirms well-fitted NAL-NL2 amplification through 2000 Hz, yet 32% to 38% aided AzBio scores and an HHIA of 68 demonstrate persistent functional disability.',
        'Candidacy rationale: Poor open-set speech recognition with verified amplification meets criteria for formal cochlear implant center referral, medical/imaging review, and bimodal hearing discussion.',
        'Interim AR plan: Check earmold seal, introduce a remote microphone for book club, train communication partners on clear-speech and lighting cues, and set COSI participation goals.',
        'Follow-up safeguards: Track CI referral completion, counsel transparently on adaptation timelines and auditory rehabilitation, and re-measure HHIA and speech outcomes post-intervention.',
      ],
      references: [
        'https://www.asha.org/practice-portal/professional-issues/cochlear-implants/',
        'https://www.asha.org/practice-portal/clinical-topics/hearing-loss/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'aud5343-workshop-06',
      taskType: 'Educational audiology, privacy & ethics governance',
      title: 'Navigate FERPA, HIPAA, IDEA evaluation, and vendor conflicts',
      prompt: 'Resolve overlapping privacy law boundaries, IDEA comprehensive evaluation duties, and ASHA Code of Ethics conflict-of-interest pressures in a school-based audiology scenario.',
      stimulus: 'An educational audiologist serves a 9-year-old fourth grader with bilateral moderate SNHL using hearing aids and a classroom DM system. The child\'s private ENT clinic phones requesting IEP speech-in-noise scores without signed parental release. Meanwhile, a DM vendor offers paid resort travel tied to recommending its proprietary receiver, and the principal asks to skip functional listening assessment to finish the triennial IEP faster.',
      estimatedMinutes: 15,
      taskParts: [
        'Differentiate FERPA from HIPAA for the school-held IEP audiology record and state the exact authorization required before releasing data to the private ENT clinic.',
        'Evaluate the manufacturer travel offer against the ASHA Code of Ethics principles governing conflicts of interest, independent clinical judgment, and public trust.',
        'Explain why skipping functional classroom listening evaluation violates IDEA 34 CFR 300.304 comprehensive evaluation standards and outline a collaborative response to the principal.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Separate the three distinct legal and ethical pressures: unauthorized external record request (ENT), financial inducement (DM vendor), and abbreviated triennial assessment (principal).',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply FERPA protection of education records versus HIPAA covered-entity rules, IDEA 34 CFR 300.304 multi-measure evaluation duties, and ASHA Code of Ethics Principle I and III conflict standards.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Require signed parent FERPA release before contacting the ENT, decline the vendor incentive and select DM technology strictly by electroacoustic compatibility and student need, and complete classroom functional listening assessment.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Document all consent forms, electroacoustic verification of the DM system, and IEP team findings objectively; escalate unresolved administrative directives through district special-education leadership.',
        },
      ],
      successCriteria: [
        'Correctly identifies school IEP audiology records as education records governed by FERPA requiring signed parental consent before disclosure to an outside ENT.',
        'Distinguishes HIPAA treatment-disclosure rules for healthcare covered entities from FERPA school-record rules.',
        'Rejects the manufacturer travel incentive under ASHA Code of Ethics conflict-of-interest and independent judgment rules.',
        'Defends comprehensive functional listening and electroacoustic verification under IDEA 34 CFR 300.304 rather than relying on a single clinical audiogram.',
      ],
      commonPitfalls: [
        'Releasing school IEP records to an outside physician under the mistaken belief that HIPAA treatment exceptions override FERPA in public schools.',
        'Accepting the vendor-funded trip while claiming personal objectivity will remain unaffected by the financial tie.',
        'Agreeing to waive functional classroom listening assessment because the child already has a clinical audiogram from six months ago.',
        'Failing to involve parents as equal IEP team members when coordinating school-to-clinic medical communication.',
      ],
      sampleOutline: [
        'Privacy boundary: Public-school IEP audiology reports are FERPA education records; unlike HIPAA treatment disclosures between clinics, sharing them with the private ENT requires signed parental release.',
        'Ethical integrity: Accepting resort travel tied to recommending proprietary equipment violates ASHA Code of Ethics conflict-of-interest standards; DM selection must rest on compatibility, verification, and student access.',
        'IDEA compliance: Under 34 CFR 300.304, triennial evaluation requires multiple relevant functional and academic measures, so classroom speech-in-noise and listening verification cannot be omitted.',
        'Safeguards: Obtain written parent release to coordinate with the ENT, document transparent equipment criteria, and brief the principal on legal compliance and student educational impact.',
      ],
      references: [
        'https://www.asha.org/code-of-ethics/',
        'https://studentprivacy.ed.gov/ferpa',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

const speech_language_pathology_5331 = {
  workshopLabel: 'Applied clinical case workshops',
  workshopPracticeNote: 'Independent applied clinical case-analysis workshops designed to build differential diagnosis, evidence-based treatment planning, and ethical judgment for Speech-Language Pathology (5331) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or clinical determinations.',
  workshops: [
    {
      id: 'slp5331-workshop-01',
      taskType: 'Bilingual difference vs. disorder case analysis',
      title: 'Separate bilingual language transfer from phonological disorder',
      prompt: 'Differentiate second-language acquisition patterns from a true speech-sound disorder in a bilingual first grader and construct a culturally responsive assessment and treatment plan.',
      stimulus: 'A 6-year-old Spanish-English sequential bilingual first grader scored 1.8 SD below the mean on an English-only syntax test. Bilingual samples show age-appropriate Spanish grammar and narrative structure, typical L1-to-L2 English final devoicing and preposition transfer, and rapid learning during dynamic assessment of English past tense. However, velar fronting (t/k, d/g) and cluster reduction persist in both languages with 60% family intelligibility.',
      estimatedMinutes: 15,
      taskParts: [
        'Contrast the English standardized test score against the Spanish sample, cross-linguistic transfer features, and dynamic assessment results to explain why a language disorder is not supported.',
        'Use the bilateral Spanish-and-English velar fronting and cluster reduction findings to justify a diagnosis of a phonological speech-sound disorder.',
        'Select an evidence-based phonological intervention approach and describe how to collaborate with the family and bilingual staff while tracking cross-linguistic generalization.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Separate intact Spanish language and high dynamic-assessment modifiability from consistent velar fronting and cluster reduction occurring across both Spanish and English.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply the difference-versus-disorder rule: a true disorder manifests in both languages, whereas monolingual English norms produce false-positive language bias in emerging bilinguals.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Target shared and language-specific phonological contrasts (such as minimal pairs or complexity-informed velar and cluster targets) without recommending English-only language therapy or home-language restriction.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Engage a trained interpreter or bilingual clinician, counsel the family to maintain rich Spanish input at home, and probe intelligibility and phoneme accuracy in both languages.',
        },
      ],
      successCriteria: [
        'Rejects an expressive language disorder diagnosis by identifying monolingual norm bias, intact L1 Spanish, and strong dynamic-assessment modifiability.',
        'Diagnoses a phonological speech-sound disorder accurately because velar fronting and cluster reduction persist in both languages beyond developmental expectations.',
        'Proposes a contrast-based phonological therapy approach with cross-linguistic target selection rather than isolated phonetic drills alone.',
        'Explicitly supports continued Spanish use at home and bilingual progress monitoring.',
      ],
      commonPitfalls: [
        'Qualifying the student for language therapy based solely on the English standardized score of 1.8 SD below the mean.',
        'Dismissing velar fronting and cluster reduction in both languages as typical second-language interference.',
        'Advising parents to speak only English at home to reduce confusion, which undermines foundational L1 development.',
        'Using an untrained bilingual sibling or classroom aide to administer or interpret standardized speech-language tasks.',
      ],
      sampleOutline: [
        'Differential evidence: Intact Spanish morphosyntax, typical L1-to-L2 transfer, and rapid dynamic-assessment learning rule out language disorder despite the biased English norm score.',
        'Disorder confirmation: Persistent velar fronting and cluster reduction across both Spanish and English at age 6 with 60% family intelligibility confirm a phonological disorder.',
        'Treatment plan: Implement minimal-pair or maximal-opposition phonological intervention targeting shared velar stops and clusters across meaningful bilingual vocabulary.',
        'Safeguards: Partner with a qualified bilingual clinician or trained interpreter, affirm rich Spanish home language use, and monitor generalization in both languages.',
      ],
      references: [
        'https://www.asha.org/practice/multicultural/',
        'https://www.asha.org/practice-portal/clinical-topics/articulation-and-phonology/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'slp5331-workshop-02',
      taskType: 'Adult neurogenic differential diagnosis & treatment',
      title: 'Differentiate Broca aphasia, apraxia of speech, and dysarthria',
      prompt: 'Analyze post-stroke language and motor-speech profiles to separate aphasia, acquired apraxia of speech, and dysarthria, and build an integrated neurogenic rehabilitation plan.',
      stimulus: 'A 64-year-old retired accountant 3 weeks post-left MCA stroke produces effortful, telegraphic speech (MLU 2.4 words) lacking functors. Comprehension is 80% for single commands but 45% for passive sentences; repetition is poor. Speech shows inconsistent sound substitutions, articulatory groping, syllable segregation, and fluent automatic islands. Oral exam shows mild right lower-face droop with symmetrical tongue strength and intact velopharyngeal closure.',
      estimatedMinutes: 15,
      taskParts: [
        'Distinguish the diagnostic features supporting Broca aphasia and acquired apraxia of speech (AOS) from features that argue against primary spastic or flaccid dysarthria.',
        'Select paired evidence-based interventions addressing both motor-speech programming (AOS) and functional syntactic/communicative participation (aphasia).',
        'Design motor-learning practice schedules, multimodal communication supports, and caregiver training to foster generalization beyond clinic drills.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Cluster nonfluent agrammatic output, impaired repetition, and complex-syntax comprehension deficits (Broca aphasia) alongside groping, inconsistent errors, syllable segregation, and automatic-volitional dissociation (AOS).',
        },
        {
          label: 'Clinical principle',
          guidance: 'Separate neuromuscular execution deficits (consistent distortions, weakness, resonance impairment in dysarthria) from motor planning/programming deficits (AOS) and linguistic formulation deficits (aphasia).',
        },
        {
          label: 'Intervention plan',
          guidance: 'Combine articulatory-kinematic AOS treatment (such as Sound Production Treatment with random practice and faded feedback) with functional aphasia approaches (such as VNeST or Script Training and LPAA).',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Monitor neurologic stability and fatigue, screen swallowing given acute stroke history, train family in supported conversation techniques, and measure generalization to untreated words and daily conversations.',
        },
      ],
      successCriteria: [
        'Identifies co-occurring Broca aphasia and acquired apraxia of speech while explaining why intact tongue strength and inconsistent groping differentiate AOS from primary dysarthria.',
        'Connects the mild right lower-face droop to unilateral upper motor neuron involvement without misattributing all speech errors to neuromuscular weakness.',
        'Matches treatment mechanisms appropriately: articulatory-kinematic motor-learning therapy for AOS and verb/script or life-participation therapy for aphasia.',
        'Incorporates caregiver supported-conversation training and probes for retention and generalization rather than immediate drill accuracy alone.',
      ],
      commonPitfalls: [
        'Prescribing non-speech oral motor exercises (NSOMEs) like tongue push-ups for apraxia of speech, which lacks motor-programming specificity.',
        'Diagnosing pure dysarthria from the right lower-face droop while overlooking articulatory groping, inconsistent errors, and fluent automatic islands.',
        'Using massed blocked practice with 100% immediate feedback indefinitely, which boosts short-term acquisition but weakens long-term motor retention in AOS.',
        'Focusing exclusively on confrontation picture naming while neglecting functional life-participation goals and partner training.',
      ],
      sampleOutline: [
        'Differential profile: Agrammatic output, impaired repetition, and reversible-passive comprehension gaps indicate Broca aphasia; groping, inconsistent substitutions, syllable segregation, and automatic speech islands indicate co-occurring AOS.',
        'Motor-speech distinction: Symmetrical lingual strength and intact velopharyngeal closure rule out primary flaccid or spastic dysarthria, with only minor UUMN facial asymmetry.',
        'Integrated treatment: Pair Sound Production Treatment using variable practice and delayed knowledge-of-results feedback with Verb Network Strengthening or personalized Script Training.',
        'Safeguards and transfer: Train caregivers in Supported Conversation for Adults with Aphasia, verify swallow safety post-stroke, and track untreated probes plus real-world participation.',
      ],
      references: [
        'https://www.asha.org/practice-portal/clinical-topics/aphasia/',
        'https://www.asha.org/practice-portal/clinical-topics/dysarthria-in-adults/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'slp5331-workshop-03',
      taskType: 'Co-occurring fluency & voice case analysis',
      title: 'Sequence medical voice clearance with holistic stuttering care',
      prompt: 'Evaluate a preadolescent presenting with persistent developmental stuttering and prolonged dysphonia, prioritizing medical laryngeal visualization alongside multidimensional fluency intervention.',
      stimulus: 'An 11-year-old sixth grader referred for stuttering exhibits 9.2% stuttered syllables with sound prolongations, tense silent laryngeal blocks, and eye blinking; his OASES score indicates moderate-to-severe daily impact and class avoidance. Evaluation also reveals 6 weeks of persistent breathy-rough dysphonia (CAPE-V overall severity 50/100; s/z ratio 1.62), which his parent assumes is vocal fatigue from stuttering.',
      estimatedMinutes: 15,
      taskParts: [
        'Explain why 6 weeks of breathy-rough dysphonia and an elevated s/z ratio of 1.62 mandate otolaryngology videostroboscopy before initiating direct voice therapy.',
        'Analyze the overt stuttering-like disfluencies and OASES impact score to differentiate persistent developmental stuttering from typical disfluencies and guide multidimensional treatment.',
        'Sequence medical clearance, vocal hygiene education, stuttering modification/communication-attitude intervention, and classroom accommodations safely.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Distinguish stuttering-like disfluencies (9.2% prolongations and blocks plus high OASES avoidance) from the separate 6-week breathy-rough voice profile (CAPE-V 50, s/z 1.62).',
        },
        {
          label: 'Clinical principle',
          guidance: 'Enforce medical clearance before behavioral voice therapy for hoarseness lasting beyond 2 to 4 weeks, and ground stuttering care in ICF multidimensional functioning rather than syllable fluency alone.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Refer promptly to pediatric ENT for laryngeal visualization, begin supportive stuttering modification and cognitive-affective work addressing avoidance, and defer direct resonant-voice exercises until ENT clearance.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Educate family on non-punitive communication and hydration without imposing strict voice rest prematurely, coordinate classroom oral-presentation options, and track OASES plus post-ENT voice outcomes.',
        },
      ],
      successCriteria: [
        'Requires ENT laryngoscopy/videostroboscopy before direct voice therapy due to 6-week dysphonia and elevated s/z ratio suggesting possible vocal fold lesions.',
        'Accurately differentiates stuttering-like disfluencies (prolongations, tense blocks, secondary behaviors) and affective avoidance from normal disfluency.',
        'Designs holistic fluency therapy targeting reduced physical tension, self-advocacy, and communication participation rather than demanding zero-stutter speech.',
        'Sequences vocal hygiene and post-clearance voice therapy (such as semi-occluded vocal tract or resonant voice) cohesively with reduced laryngeal block tension.',
      ],
      commonPitfalls: [
        'Launching intensive resonant voice or pushing exercises immediately without ENT visualization of the vocal folds.',
        'Dismissing a 6-week hoarse, breathy voice and 1.62 s/z ratio as an expected harmless side effect of stuttering.',
        'Measuring stuttering therapy success solely by percentage of stuttered syllables while ignoring OASES avoidance and emotional burden.',
        'Recommending that teachers excuse the student from all speaking opportunities permanently rather than offering structured collaborative participation choices.',
      ],
      sampleOutline: [
        'Dual clinical profile: 9.2% stuttering-like disfluencies with tense blocks and elevated OASES confirm persistent stuttering with significant participation impact, while 6-week dysphonia and s/z 1.62 signal possible vocal fold pathology.',
        'Medical safeguard: Refer to pediatric ENT for videostroboscopy to rule out vocal fold nodules or structural lesions before starting direct voice therapy.',
        'Sequenced intervention: Begin non-stigmatizing stuttering modification, easy-onset tension reduction, and self-advocacy work immediately; add targeted voice therapy once ENT clearance and diagnosis are obtained.',
        'Follow-up: Partner with parents and teachers on supportive listening and presentation choices, and track OASES impact alongside post-clearance CAPE-V and acoustic stability.',
      ],
      references: [
        'https://www.asha.org/practice-portal/clinical-topics/voice-disorders/',
        'https://www.asha.org/practice-portal/clinical-topics/fluency-disorders/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'slp5331-workshop-04',
      taskType: 'Instrumental dysphagia biomechanics & safety',
      title: 'Translate VFSS biomechanics into safe dysphagia rehabilitation',
      prompt: 'Interpret videofluoroscopic swallow study findings in a patient with Parkinson disease and pneumonia history, linking physiological impairments to targeted compensatory and rehabilitative strategies.',
      stimulus: 'A 73-year-old man with Parkinson disease and recent pneumonia completes VFSS after wet voice and weak cough at bedside. VFSS shows delayed pharyngeal onset at the pyriform sinuses, reduced hyolaryngeal excursion, incomplete epiglottic inversion, and silent thin-liquid aspiration (PAS 8). Nectar-thick liquids leave pyriform residue (PAS 4) cleared by effortful swallow; chin-tuck stops 5 mL thin aspiration, and purees pass (PAS 2).',
      estimatedMinutes: 15,
      taskParts: [
        'Explain why clinical bedside screening alone could not detect the PAS 8 thin-liquid finding and map each VFSS biomechanical deficit to its aspiration or residue mechanism.',
        'Design an individualized management plan pairing verified compensatory strategies with physiology-matched rehabilitative exercises rather than defaulting to permanent NPO status.',
        'Address whole-patient aspiration pneumonia risk factors including oral hygiene, hydration adherence, pulmonary status, and interprofessional coordination with neurology and dietetics.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Connect delayed pharyngeal onset, reduced hyolaryngeal excursion, and incomplete epiglottic inversion to PAS 8 silent aspiration on thin liquids, PAS 4 residue on nectar-thick, and positive chin-tuck and effortful-swallow trials.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply instrumental confirmation for silent aspiration, match maneuvers directly to impaired physiology, and recognize that aspiration pneumonia depends on oral flora, immunity, and clearance—not aspiration alone.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Implement trial-verified chin-tuck with controlled 5 mL liquid volumes (or IDDSI Level 2 with effortful-swallow clearance if adherence lags) alongside rehabilitative EMST, effortful swallow, and hyolaryngeal strengthening.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Institute rigorous oral care, coordinate with neurology on dopaminergic medication timing and dietetics on hydration/nutrition, educate caregivers on fatigue signs, and plan re-evaluation.',
        },
      ],
      successCriteria: [
        'Explains why bedside clinical exams cannot rule out silent aspiration (PAS 8) and why VFSS was necessary to verify safe postures.',
        'Maps delayed trigger and reduced hyolaryngeal/epiglottic closure directly to airway invasion and pyriform residue mechanisms.',
        'Matches compensatory techniques (verified chin tuck, 5 mL volume control) and rehabilitative exercises (EMST, effortful swallow, hyolaryngeal strengthening) to observed physiology.',
        'Integrates strict oral hygiene, hydration monitoring, patient preferences, and interprofessional care to reduce aspiration pneumonia risk.',
      ],
      commonPitfalls: [
        'Prescribing honey-thick liquids empirically without VFSS verification, which can worsen pharyngeal residue and dehydration.',
        'Recommending a chin-tuck or supraglottic swallow blindly without confirming on VFSS that the maneuver actually prevents airway invasion for this patient.',
        'Treating silent aspiration as an automatic mandate for permanent NPO and PEG placement despite verified safe oral strategies and patient goals.',
        'Ignoring oral hygiene and weak cough clearance (EMST target) even though colonized oral secretions drive aspiration pneumonia.',
      ],
      sampleOutline: [
        'Biomechanics: Delayed pharyngeal onset, reduced hyolaryngeal excursion, and incomplete epiglottic inversion caused PAS 8 silent thin-liquid aspiration (undetectable by bedside cough) and PAS 4 pyriform residue on thickened liquids.',
        'Compensatory plan: Leverage VFSS-verified chin-tuck posture with 5 mL controlled liquid sips and effortful swallows to clear residue, maintaining safe pureed intake (PAS 2) aligned with patient quality of life.',
        'Rehabilitative plan: Pair Expiratory Muscle Strength Training (EMST) for airway protection and cough strength with effortful swallow and hyolaryngeal excursion exercises.',
        'Safeguards: Enforce aggressive oral hygiene, coordinate Parkinson medication timing with meals, monitor hydration and weight with dietetics, and schedule instrumental reassessment.',
      ],
      references: [
        'https://www.asha.org/practice-portal/clinical-topics/adult-dysphagia/',
        'https://www.asha.org/practice-portal/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'slp5331-workshop-05',
      taskType: 'AAC feature matching & school IDEA evaluation',
      title: 'Refute AAC prerequisites and build an IDEA-aligned access plan',
      prompt: 'Challenge invalid AAC candidacy barriers for a student with severe dysarthria and cerebral palsy, and design a feature-matched AAC evaluation and school-based IEP support plan.',
      stimulus: 'An 8-year-old third grader with spastic cerebral palsy (GMFCS Level IV) and severe dysarthria speaks fewer than 10 intelligible words yet shows age-appropriate receptive vocabulary (8;4) via eye-gaze scanning and emerging sight-word reading. A school administrator argues the student must master a 4-icon static board before trialing a dynamic speech-generating device and questions IDEA SLP eligibility since occupational therapy is already provided.',
      estimatedMinutes: 15,
      taskParts: [
        'Refute the 4-icon prerequisite claim using contemporary AAC candidacy evidence and explain how restricting vocabulary size undermines language and literacy access.',
        'Conduct a feature-matching analysis specifying access method, symbol/orthographic representation, core-plus-fringe organization, and OT/SLP seating coordination.',
        'Justify IDEA speech-language eligibility and assistive-technology consideration under 34 CFR 300.304, including nondiscriminatory assessment and classroom partner modeling.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Cite the stark gap between severe dysarthria (fewer than 10 spoken words) and strong receptive vocabulary (8;4) plus emerging literacy, demonstrating immediate need for robust symbolic/orthographic expression.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Apply the no-prerequisites AAC candidacy standard, individualized feature matching across motor/sensory/linguistic demands, and IDEA 34 CFR 300.304 nondiscriminatory multimethod evaluation.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Conduct a collaborative SLP-OT trial of eye-gaze or switch-accessed dynamic SGDs featuring robust core vocabulary and keyboard/orthographic supports, paired with aided language modeling across general education.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Document educational impact across reading, writing, and peer interaction for the IEP team, ensure low-tech backup access, train classroom staff and family, and collect trial communication-turn data.',
        },
      ],
      successCriteria: [
        'Explicitly rejects cognitive or static-board prerequisite gates as unsupported barriers to robust AAC access.',
        'Applies feature matching across alternative access (eye gaze or switch scanning with OT positioning), robust core-plus-fringe layout, and literacy/orthographic growth.',
        'Uses IDEA 34 CFR 300.304 principles to justify adapted, nondiscriminatory evaluation and distinct SLP expertise alongside—not replaced by—occupational therapy.',
        'Incorporates aided language input, partner training, general-education participation, and low-tech redundancy.',
      ],
      commonPitfalls: [
        'Agreeing to a 4-icon static board trial first, which caps communicative functions to basic requesting and stalls academic participation.',
        'Administering standardized spoken-output language tests without response accommodations and misinterpreting motor speech limits as intellectual or receptive impairment.',
        'Selecting an AAC device solely because the district already owns licenses for one app rather than matching features to the student\'s motor and literacy profile.',
        'Treating AAC as a pull-out clinic device rather than embedding aided language modeling across classroom and home routines.',
      ],
      sampleOutline: [
        'Candidacy and evidence: Age-appropriate receptive vocabulary (8;4) and emerging literacy paired with severe dysarthria refute any 4-icon prerequisite; limiting vocabulary restricts FAPE and academic growth.',
        'Feature matching: Partner with OT on wheelchair seating and eye-gaze or switch access to trial dynamic SGDs combining motor-plan-consistent core vocabulary, fringe words, and predictive text.',
        'IDEA eligibility: Under 34 CFR 300.304, adapted multimethod assessment establishes adverse educational impact requiring specialized SLP language/AAC services distinct from OT.',
        'Implementation safeguards: Embed aided language modeling by teachers and peers in general education, supply a low-tech eye-gaze backup board, and track spontaneous communicative turns during device trials.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.304',
        'https://www.asha.org/SLP/schools/School-Based-Service-Delivery-in-Speech-Language-Pathology/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'slp5331-workshop-06',
      taskType: 'EBP, ethical supervision & HIPAA compliance',
      title: 'Uphold EBP standards, SLPA scope limits, and client privacy',
      prompt: 'Resolve workplace directives involving an unvalidated commercial therapy app, improper SLPA delegation, and client video marketing using ASHA EBP, Code of Ethics, and HIPAA standards.',
      stimulus: 'A clinic director instructs a newly certified SLP supervising an SLPA and graduate clinician to (1) bill an unvalidated auditory-rhythm app as skilled dysphagia and apraxia therapy for all adult neurogenic patients, (2) assign the SLPA to perform initial bedside dysphagia evaluations to reduce a 3-week waitlist, and (3) submit client therapy clips for public social-media ads using only the clinic\'s standard treatment-consent intake form.',
      estimatedMinutes: 15,
      taskParts: [
        'Evaluate the mandatory commercial app directive through all three pillars of Evidence-Based Practice (external evidence, clinical expertise, and client values) and ethical billing duties.',
        'Identify exact ASHA Scope of Practice and supervision violations in delegating initial dysphagia evaluations to an SLPA, and distinguish SLPA limits from supervised graduate-clinician training.',
        'Explain why a general intake consent form does not authorize public marketing videos under HIPAA and outline a constructive escalation and compliance plan.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Itemize the three compliance breaches: unvalidated universal billing mandate, out-of-scope SLPA diagnostic delegation, and unauthorized public marketing disclosure of PHI.',
        },
        {
          label: 'Clinical principle',
          guidance: 'Ground decisions in the three-pillar ASHA EBP triangle, ASHA Code of Ethics Principles I and IV (client welfare, competence, truthful billing, supervision), and HIPAA marketing authorization rules.',
        },
        {
          label: 'Intervention plan',
          guidance: 'Decline billing unvalidated app use as skilled therapy, retain all evaluations and clinical interpretation with the licensed SLP (or directly supervised graduate clinician per standards), and block video release without specific written HIPAA marketing authorization.',
        },
        {
          label: 'Follow-up & safeguards',
          guidance: 'Propose evidence-based waitlist triage solutions, document supervision ratios and policy feedback objectively in writing, and consult compliance officers or ASHA ethics guidance if retaliation or ongoing violations occur.',
        },
      ],
      successCriteria: [
        'Applies all three EBP pillars to reject a blanket unvalidated app mandate and flags fraudulent or misrepresentative skilled billing.',
        'Clearly states that SLPAs cannot conduct evaluations, interpret findings, or establish/modify treatment plans, even under waitlist pressure.',
        'Distinguishes routine HIPAA treatment/payment/operations consent from the explicit, standalone written authorization required for public marketing disclosures.',
        'Offers practical, ethical workflow alternatives (prioritized triage, appropriate SLPA delegation of established maintenance drills) and documents escalation steps.',
      ],
      commonPitfalls: [
        'Following the clinic director\'s directives under the assumption that employer policy insulates a licensed clinician from ASHA Code of Ethics accountability.',
        'Allowing the SLPA to perform the bedside swallow evaluation as long as the SLP co-signs the note afterward.',
        'Assuming blurred faces or a generic clinic intake signature satisfies HIPAA authorization for social-media marketing videos.',
        'Evaluating the rhythm app solely on whether clients enjoy it while neglecting external scientific validity and physiological mechanism.',
      ],
      sampleOutline: [
        'EBP and billing: A blanket unvalidated rhythm app lacks external efficacy for dysphagia or AOS, overrides clinical expertise and individualized client goals, and risks unethical billing for non-skilled care.',
        'Supervision boundaries: Initial dysphagia evaluation and clinical interpretation remain strictly within the licensed SLP scope (or directly supervised graduate training), never delegable to an SLPA regardless of co-signatures.',
        'Privacy compliance: Public marketing reels require explicit, revocable written HIPAA marketing authorization—not a routine intake treatment consent—even if names are omitted.',
        'Ethical resolution: Document polite, standards-based refusal, propose ethical waitlist triage and lawful SLPA delegation of established tasks, and escalate through compliance channels if directives persist.',
      ],
      references: [
        'https://www.asha.org/code-of-ethics/',
        'https://www.asha.org/research/ebp/',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

module.exports = {
  audiology_5343,
  speech_language_pathology_5331,
};
