'use strict';

const audiology_5343 = {
  misconceptionFamilies: [
    {
      id: 'aud5343-masking-ia-under-or-overmasking',
      label: 'Clinical masking, interaural attenuation, and under- or overmasking',
      description:
        'Test-takers frequently compare test-ear air conduction against non-test-ear air conduction instead of non-test-ear bone conduction, confuse supra-aural (~40 dB) with insert-earphone (~55–70 dB) and bone-conduction (0 dB) interaural attenuation, or overlook the occlusion effect and overmasking ceiling when a conductive component exists.',
      remediationMove:
        'Check transducer-specific interaural attenuation first (AC_TE minus IA compared against BC_NTE; BC gap of 10–15 dB or more requires masking), add occlusion-effect correction for low-frequency BC masking, and verify that NTE masker minus IA stays below BC_TE to avoid overmasking.',
      remediationPlaybookId: 'audiology-5343-remediation-masking-ia-under-or-overmasking',
      itemIds: [
        'aud5343-b1-031',
        'aud5343-b1-032',
        'aud5343-b1-033',
        'aud5343-b1-034',
        'aud5343-b1-038',
        'aud5343-b1-040',
        'aud5343-b1-041',
        'aud5343-b1-042',
        'aud5343-b1-007',
        'aud5343-b1-008',
        'aud5343-b1-010',
        'aud5343-b1-011',
      ],
    },
    {
      id: 'aud5343-cross-check-single-test-reliance',
      label: 'Single-test reliance instead of the audiologic cross-check principle',
      description:
        'Candidates often treat one isolated audiometric result—such as unmasked pure tones, a standalone tympanogram, or a single behavioral response—as diagnostic proof without verifying agreement across pure-tone average, SRT, immittance, acoustic reflexes, and physiologic measures.',
      remediationMove:
        'Apply Jerger and Hayes cross-check logic on every case: confirm PTA–SRT agreement within 5–10 dB, pair tympanometric peak admittance with ear-canal volume and acoustic reflexes, and corroborate pediatric or inconsistent behavioral thresholds with OAEs or ABR.',
      remediationPlaybookId: 'audiology-5343-remediation-cross-check-single-test-reliance',
      itemIds: [
        'aud5343-b1-031',
        'aud5343-b1-033',
        'aud5343-b1-034',
        'aud5343-b1-035',
        'aud5343-b1-036',
        'aud5343-b1-037',
        'aud5343-b1-038',
        'aud5343-b1-039',
        'aud5343-b1-040',
        'aud5343-b1-041',
        'aud5343-b1-042',
        'aud5343-b1-026',
      ],
    },
    {
      id: 'aud5343-ansd-vs-cochlear-snhl',
      label: 'Confusing auditory neuropathy spectrum disorder with cochlear SNHL',
      description:
        'Test-takers commonly misclassify absent or grossly abnormal ABR with preserved OAEs and inverting cochlear microphonics as typical outer-hair-cell cochlear SNHL, or assume an OAE-only newborn screen is sufficient for NICU infants at risk for neural dyssynchrony.',
      remediationMove:
        'Separate outer-hair-cell status (OAEs and polarity-inverting cochlear microphonic) from neural synchrony (ABR Waves I–V and acoustic reflexes): intact OHC markers paired with absent ABR indicate ANSD, mandating AABR screening in NICU cohorts and behavioral threshold confirmation before amplification.',
      remediationPlaybookId: 'audiology-5343-remediation-ansd-vs-cochlear-snhl',
      itemIds: [
        'aud5343-b1-002',
        'aud5343-b1-003',
        'aud5343-b1-004',
        'aud5343-b1-005',
        'aud5343-b1-006',
        'aud5343-b1-012',
        'aud5343-b1-027',
        'aud5343-b1-028',
        'aud5343-b1-030',
        'aud5343-b1-035',
        'aud5343-b1-075',
        'aud5343-b1-076',
      ],
    },
    {
      id: 'aud5343-osha-sts-and-ehdi-timelines',
      label: 'Misapplying OSHA hearing-conservation rules and JCIH EHDI 1-3-6 timelines',
      description:
        'Candidates frequently swap OSHA 85 dBA TWA action-level triggers with the 90 dBA TWA permissible exposure limit, miscalculate the 10 dB Standard Threshold Shift across 2000–4000 Hz, or miss JCIH 1-3-6 early-hearing benchmarks and late-onset surveillance after an initial newborn pass.',
      remediationMove:
        'Anchor regulatory cases to exact thresholds and clocks: prioritize engineering controls over HPDs, use 85 dBA for HCP enrollment vs 90 dBA for PEL, average 2–3–4 kHz shifts ≥10 dB for OSHA STS (21-day written notice, 30-day retest), and enforce 1-month screen → 3-month diagnosis → 6-month intervention plus risk-factor monitoring.',
      remediationPlaybookId: 'audiology-5343-remediation-osha-sts-and-ehdi-timelines',
      itemIds: [
        'aud5343-b1-021',
        'aud5343-b1-022',
        'aud5343-b1-023',
        'aud5343-b1-024',
        'aud5343-b1-025',
        'aud5343-b1-026',
        'aud5343-b1-027',
        'aud5343-b1-028',
        'aud5343-b1-029',
        'aud5343-b1-030',
        'aud5343-b2-021',
        'aud5343-b2-022',
      ],
    },
    {
      id: 'aud5343-verification-rem-vs-validation',
      label: 'Equating hearing-aid verification with functional outcome validation',
      description:
        'Test-takers often treat manufacturer first-fit software or self-report questionnaires as acoustic verification, or assume probe-microphone Real-Ear Measurement alone proves real-world communication benefit without functional validation and follow-up.',
      remediationMove:
        'Keep the two clinical pillars distinct and sequential: verify electroacoustic and in-situ prescriptive target match (DSL v5 or NAL-NL2 via probe-mic REM and pediatric RECD) first, then validate real-world listening benefit and participation with COSI, APHAB, IOI-HA, or aided speech-in-noise measures.',
      remediationPlaybookId: 'audiology-5343-remediation-verification-rem-vs-validation',
      itemIds: [
        'aud5343-b1-066',
        'aud5343-b1-067',
        'aud5343-b1-068',
        'aud5343-b1-069',
        'aud5343-b1-070',
        'aud5343-b1-071',
        'aud5343-b1-072',
        'aud5343-b1-073',
        'aud5343-b1-074',
        'aud5343-b1-075',
        'aud5343-b1-076',
        'aud5343-b1-077',
      ],
    },
    {
      id: 'aud5343-ferpa-hipaa-asha-ethics',
      label: 'Misapplying FERPA vs HIPAA, informed consent, and ASHA ethical boundaries',
      description:
        'Candidates regularly misidentify whether school educational records fall under FERPA or HIPAA, overlook cross-state teleaudiology licensure rules, attempt unfamiliar procedures without training, or delay medical referral when acute red-flag otologic symptoms appear.',
      remediationMove:
        'Check setting and legal authority before acting: FERPA governs school-maintained education records whereas HIPAA covers clinic PHI and cross-entity release requires signed authorization; confirm competence, informed consent, dual-state teleaudiology licensure, and immediate medical referral for red flags.',
      remediationPlaybookId: 'audiology-5343-remediation-ferpa-hipaa-asha-ethics',
      itemIds: [
        'aud5343-b1-091',
        'aud5343-b1-092',
        'aud5343-b1-093',
        'aud5343-b1-094',
        'aud5343-b1-095',
        'aud5343-b1-096',
        'aud5343-b1-097',
        'aud5343-b1-098',
        'aud5343-b1-099',
        'aud5343-b1-100',
        'aud5343-b2-091',
        'aud5343-b2-092',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'audiology-5343-remediation-masking-ia-under-or-overmasking',
      familyId: 'aud5343-masking-ia-under-or-overmasking',
      familyLabel: 'Clinical masking, interaural attenuation, and under- or overmasking',
      title: 'Compute transducer IA and masking window before trusting a threshold',
      recognitionCue:
        'The chosen answer checks AC-to-AC asymmetry instead of AC_TE minus IA against BC_NTE, uses supra-aural IA for inserts, or overlooks overmasking in a bilateral conductive loss.',
      repairQuestion:
        'Which transducer IA applies here, does AC_TE minus IA reach or exceed BC_NTE (or does a 10–15 dB air-bone gap exist), and where does the overmasking ceiling sit?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the audiogram stem and flag whether your initial response relied on unmasked shadow thresholds, wrong transducer IA values, or an unverified NTE air-bone gap.',
          requiredOutput:
            'Identify the exact masking trap (omitted BC_NTE comparison, wrong IA constant, missed occlusion effect, or bilateral conductive masking dilemma).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Write the clinical masking rule for the stated transducer: AC masking when AC_TE − IA ≥ BC_NTE (supra-aural ~40 dB, inserts ~55–70 dB), BC masking when test-ear ABG ≥ 10–15 dB (IA = 0 dB plus low-frequency occlusion effect), and overmasking when NTE masker − IA ≥ BC_TE.',
          requiredOutput:
            'State the exact minimum effective masking level and the overmasking boundary in dB HL for the case.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Work two contrasting masking profiles: (1) right ear 65 dB AC with left ear 10 dB BC using supra-aural vs insert earphones, and (2) bilateral 55 dB AC with 10 dB BC at 500 Hz under supra-aural headphones.',
          requiredOutput:
            'Document whether masking is required in each case, why switching to insert earphones enlarges the plateau, and how to recognize a masking dilemma.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed masking item and transfer the plateau logic to speech-recognition masking when presentation level minus IA reaches or exceeds the best NTE BC threshold.',
          requiredOutput:
            'Select the defensible masking decision and verify in one line that neither undermasking nor crossover overmasking invalidates the test-ear threshold.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'audiology-5343-remediation-cross-check-single-test-reliance',
      familyId: 'aud5343-cross-check-single-test-reliance',
      familyLabel: 'Single-test reliance instead of the audiologic cross-check principle',
      title: 'Cross-check behavioral and physiologic results before naming site of lesion',
      recognitionCue:
        'The chosen answer diagnoses middle-ear, cochlear, or non-organic status from a single metric while ignoring conflicting SRT, tympanometric ear-canal volume, acoustic reflexes, or pediatric physiologic findings.',
      repairQuestion:
        'Do pure-tone thresholds, SRT, immittance volume/pressure, acoustic reflexes, and OAEs or ABR tell the same physiologic story—and what explains any mismatch?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Audit every test finding in the vignette and underline the secondary measure you ignored when locking onto the first apparent abnormality.',
          requiredOutput:
            'Name the specific pair of findings that either corroborate or contradict each other (such as Type B + large ECV vs normal ECV, or PTA vs SRT gap greater than 10 dB).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Map the expected cross-check triad for middle-ear effusion, TM perforation/patent PE tube, cochlear SNHL, retrocochlear pathology, and functional hearing loss before choosing the next clinical step.',
          requiredOutput:
            'Build a compact 4-column check (PTA/BC, SRT/WRS, Tympanogram + ECV, Reflexes/OAE) confirming the site of lesion or non-organic red flag.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Compare two flat Type B tympanograms (one with 0.6 mL ECV and conductive loss, one with 3.2 mL ECV) plus a 9-month-old with borderline VRA responses and absent DPOAEs.',
          requiredOutput:
            'Assign the correct anatomical interpretation to each Type B profile and specify the physiologic cross-check required for the infant.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed assessment item and transfer the cross-check lens to an adult whose PTA is 55 dB HL while SRT measures 25 dB HL with normal OAEs.',
          requiredOutput:
            'Choose the clinically justified answer and explain why cross-checking prevents both misdiagnosis and inappropriate amplification.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'audiology-5343-remediation-ansd-vs-cochlear-snhl',
      familyId: 'aud5343-ansd-vs-cochlear-snhl',
      familyLabel: 'Confusing auditory neuropathy spectrum disorder with cochlear SNHL',
      title: 'Separate outer-hair-cell integrity from neural synchrony in ANSD',
      recognitionCue:
        'The chosen answer recommends OAE-only NICU screening, fits hearing aids solely from absent ABR thresholds, or labels present OAEs with absent ABR as outer-hair-cell cochlear SNHL.',
      repairQuestion:
        'What do OAEs and polarity-inverting cochlear microphonics prove about outer hair cells versus what an absent ABR proves about neural synchrony?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Compare the stem findings for OAEs, cochlear microphonic polarity reversal, ABR morphology, and speech-in-noise performance against classic cochlear SNHL expectations.',
          requiredOutput:
            'Pinpoint the exact feature in the vignette that rules out pure outer-hair-cell cochlear loss and points to ANSD.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Trace the auditory pathway from OHC active amplification (OAEs/CM) to the IHC ribbon synapse and CN VIII firing synchrony (ABR/acoustic reflexes), noting why behavioral thresholds in ANSD can fluctuate and fail to match ABR estimates.',
          requiredOutput:
            'Write the diagnostic signature of ANSD and state why NICU protocols mandate AABR rather than OAE-only screening.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Contrast two infant charts: Infant A (NICU hyperbilirubinemia, present DPOAEs, inverting CM, absent ABR Waves I–V) and Infant B (absent DPOAEs, absent CM, elevated Wave V thresholds matching moderate loss).',
          requiredOutput:
            'Specify the diagnosis, threshold-estimation strategy (behavioral VRA confirmation vs tone-burst ABR), and initial counseling plan for each infant.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed electrophysiology or pediatric item and transfer the distinction to an adult with disproportionately poor speech-in-noise recognition despite mild pure-tone loss and present OAEs.',
          requiredOutput:
            'Defend the selected clinical management plan (monitoring, behavioral verification, FM/RM technology, and CI evaluation if amplification fails).',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'audiology-5343-remediation-osha-sts-and-ehdi-timelines',
      familyId: 'aud5343-osha-sts-and-ehdi-timelines',
      familyLabel: 'Misapplying OSHA hearing-conservation rules and JCIH EHDI 1-3-6 timelines',
      title: 'Lock in OSHA dBA/STS rules and JCIH 1-3-6 screening clocks',
      recognitionCue:
        'The chosen answer puts ear-plugs ahead of engineering controls, confuses 85 dBA AL with 90 dBA PEL, miscalculates an STS, or drops follow-up after an infant passes newborn screening despite risk factors.',
      repairQuestion:
        'Which regulatory benchmark governs this scenario—hierarchy of controls, OSHA 85/90 dBA and 10 dB STS rules, or JCIH 1-3-6 and late-onset risk surveillance?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Identify whether the question tests occupational hearing conservation (OSHA 29 CFR 1910.95) or pediatric early identification (JCIH EHDI) and spot the exact threshold or timeline you misread.',
          requiredOutput:
            'Name the misapplied cutoff, control tier, or follow-up deadline from your initial answer choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Recite the exact rules: hierarchy of controls starts with elimination/engineering controls before administrative controls and PPE; OSHA AL = 85 dBA TWA (HCP enrollment), PEL = 90 dBA TWA, STS = average shift ≥10 dB at 2, 3, and 4 kHz in either ear (21-day written notice, optional 30-day retest); JCIH EHDI = screen by 1 month, diagnose by 3 months, enroll in EI by 6 months, plus ongoing monitoring for CMV, NICU stay over 5 days, ototoxic drugs, or caregiver concern.',
          requiredOutput:
            'Write the exact numeric rule or timeline step that dictates the right action in this vignette.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate two cases: (1) a factory worker with baseline thresholds of 15/20/25 dB and annual thresholds of 25/35/35 dB at 2/3/4 kHz in the left ear, and (2) an 8-month-old who passed newborn screening but had congenital CMV and now shows delayed babbling.',
          requiredOutput:
            'Compute the worker average shift (11.7 dB → STS triggered) with required OSHA actions, and specify the immediate diagnostic audiology referral for the infant.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed prevention or screening item and transfer the rule to an oncology patient starting cisplatin therapy who needs baseline and serial ultra-high-frequency ototoxicity monitoring.',
          requiredOutput:
            'Choose the compliant preventive action and explain why screening establishes referral need rather than a definitive diagnosis.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'audiology-5343-remediation-verification-rem-vs-validation',
      familyId: 'aud5343-verification-rem-vs-validation',
      familyLabel: 'Equating hearing-aid verification with functional outcome validation',
      title: 'Verify acoustic targets with REM before validating real-world benefit',
      recognitionCue:
        'The chosen answer relies on manufacturer first-fit screens or patient satisfaction ratings as verification, or stops after probe-microphone verification without assessing functional outcomes.',
      repairQuestion:
        'Does this step verify that target SPL is physically delivered at the eardrum (REM/RECD), or validate that the patient hears and participates better in daily life (COSI/APHAB/speech-in-noise)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Label whether the question asks about electroacoustic/in-situ target verification or patient-centered functional validation, and note where your original choice blurred the two.',
          requiredOutput:
            'State whether the item targets verification (device/ear-canal SPL match) or validation (functional benefit and participation).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Contrast verification methods (ANSI 2-cc coupler check, probe-microphone REM matching NAL-NL2 or DSL v5 targets across soft/average/loud speech, and pediatric RECD) against validation tools (COSI, APHAB, IOI-HA, QuickSIN/HINT aided benefit) and acoustic coupling adjustments (venting, earmold seal, WDRC, directional mics).',
          requiredOutput:
            'Pair the exact clinical goal in the stem with its valid measurement tool and explain why manufacturer first-fit cannot substitute for REM.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Design a fitting sequence for two patients: a 6-month-old infant with bilateral moderate SNHL (requiring RECD-coupled DSL v5 verification) and an adult reporting muffled voice and feedback in restaurants despite accurate REM targets.',
          requiredOutput:
            'List the verification step, coupling/venting or directional-mic adjustment, and specific validation measure for each patient.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed intervention item and extend the verification-versus-validation lens to cochlear-implant mapping (T/C levels and electrode impedance vs aided speech-in-noise and functional auditory milestones).',
          requiredOutput:
            'Justify the correct option by explicitly naming both the physical verification evidence and the functional validation outcome.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'audiology-5343-remediation-ferpa-hipaa-asha-ethics',
      familyId: 'aud5343-ferpa-hipaa-asha-ethics',
      familyLabel: 'Misapplying FERPA vs HIPAA, informed consent, and ASHA ethical boundaries',
      title: 'Check legal jurisdiction, competence, and medical red flags before acting',
      recognitionCue:
        'The chosen answer applies HIPAA to school IEP records, skips dual-state licensure checks for teleaudiology, performs an untrained procedure, or delays physician referral for an acute otologic red flag.',
      repairQuestion:
        'Which statute governs these records (FERPA vs HIPAA), am I licensed and competent for this procedure/state, and is there an acute medical red flag requiring immediate referral?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Scan the professional-practice scenario for the exact boundary cue—entity type (school vs clinic), clinician competence, supervision ratio, interstate teleaudiology, billing integrity, or urgent otologic symptom.',
          requiredOutput:
            'Identify which ethical or legal principle (FERPA/HIPAA, ASHA Code Principle I/II, informed consent, or medical red-flag triage) governs the item.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'State the governing rule: FERPA covers educational records maintained by public schools whereas HIPAA covers health-care clinic PHI (and sharing between them requires written parental/patient authorization); clinicians must decline or refer procedures beyond documented competence, verify licensure in both clinician and patient jurisdictions for teleaudiology, and refer sudden unilateral SNHL, otalgia, drainage, or acute vertigo immediately for medical evaluation.',
          requiredOutput:
            'Write the exact compliant action sequence and identify why the distractor violates law or ASHA ethics.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Resolve two ethical vignettes: (1) a private clinic audiologist receives a phone call from a school IEP coordinator requesting a child audiogram without signed release, and (2) an audiologist is asked to run VNG testing without prior vestibular training.',
          requiredOutput:
            'Specify the exact authorization workflow under HIPAA/FERPA for Case 1 and the competence-preserving referral/training response for Case 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed ethics item and transfer the same compliance check to a financial conflict-of-interest scenario involving manufacturer incentives for fitting a specific hearing-aid brand.',
          requiredOutput:
            'Select the ethically sound course of action and articulate how patient welfare, transparency, and regulatory authority take precedence.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const speech_language_pathology_5331 = {
  misconceptionFamilies: [
    {
      id: 'slp5331-bilingual-difference-vs-disorder',
      label: 'Mistaking bilingual language difference or dialectal variation for a disorder',
      description:
        'Candidates frequently diagnose a speech or language disorder from English-only standardized test scores, misinterpret cross-linguistic transfer, code-switching, or rule-governed dialect features as errors, or skip dynamic assessment and L1 evaluation.',
      remediationMove:
        'Evaluate both L1 and L2 (with a trained interpreter if needed), check whether difficulties appear in BOTH languages, distinguish rule-governed dialect or transfer patterns from true disorder, and pair language sampling with test-teach-retest dynamic assessment.',
      remediationPlaybookId: 'slp-5331-remediation-bilingual-difference-vs-disorder',
      itemIds: [
        'slp5331-b1-035',
        'slp5331-b1-036',
        'slp5331-b1-038',
        'slp5331-b1-039',
        'slp5331-b1-040',
        'slp5331-b1-042',
        'slp5331-b1-043',
        'slp5331-b1-044',
        'slp5331-b1-045',
        'slp5331-b1-005',
        'slp5331-b1-006',
        'slp5331-b1-072',
      ],
    },
    {
      id: 'slp5331-broca-aos-dysarthria-differential',
      label: 'Conflating Broca aphasia, apraxia of speech, and dysarthria',
      description:
        'Test-takers often blur linguistic breakdown (Broca aphasia), motor-planning/programming disruption without weakness (apraxia of speech), and neuromuscular execution impairment with weakness or tone abnormality (dysarthria), leading to mismatched treatment targets.',
      remediationMove:
        'Triangulate three clinical markers: language formulation/agrammatism (Broca aphasia), inconsistent articulatory groping with intact strength and automatic-volitional dissociation (AOS), and consistent neuromuscular weakness, spasticity, flaccidity, or ataxia across speech and nonspeech tasks (dysarthria).',
      remediationPlaybookId: 'slp-5331-remediation-broca-aos-dysarthria-differential',
      itemIds: [
        'slp5331-b1-001',
        'slp5331-b1-002',
        'slp5331-b1-006',
        'slp5331-b1-007',
        'slp5331-b1-041',
        'slp5331-b1-043',
        'slp5331-b1-044',
        'slp5331-b1-045',
        'slp5331-b1-068',
        'slp5331-b1-071',
        'slp5331-b1-074',
        'slp5331-b1-078',
      ],
    },
    {
      id: 'slp5331-dysphagia-bedside-vs-instrumental',
      label: 'Relying on bedside screening to rule out silent aspiration or prescribe diet changes',
      description:
        'Candidates regularly assume a clean clinical bedside swallow exam without overt coughing rules out pharyngeal silent aspiration, or recommend thickened liquids and postural maneuvers without instrumental verification of swallow physiology.',
      remediationMove:
        'Treat bedside exams as clinical hypotheses that cannot visualize pharyngeal biomechanics or silent aspiration; refer for MBSS/VFSS or FEES to identify the exact physiological deficit and confirm that any posture, maneuver, or viscosity change actually improves airway protection and clearance.',
      remediationPlaybookId: 'slp-5331-remediation-dysphagia-bedside-vs-instrumental',
      itemIds: [
        'slp5331-b1-001',
        'slp5331-b1-002',
        'slp5331-b1-004',
        'slp5331-b1-010',
        'slp5331-b1-011',
        'slp5331-b1-035',
        'slp5331-b1-036',
        'slp5331-b1-041',
        'slp5331-b1-043',
        'slp5331-b1-070',
        'slp5331-b1-075',
      ],
    },
    {
      id: 'slp5331-voice-medical-clearance-before-therapy',
      label: 'Starting behavioral voice therapy before ENT laryngeal visualization',
      description:
        'Test-takers often jump directly to vocal hygiene, resonant voice therapy, or vocal function exercises for chronic dysphonia or sudden breathiness without first requiring otolaryngology (ENT) laryngoscopy to rule out structural, neurologic, or neoplastic pathology.',
      remediationMove:
        'Require medical clearance and laryngeal imaging by an ENT before initiating behavioral voice therapy for persistent hoarseness (over 2–4 weeks) or unexplained voice change, then match aerodynamic and myoelastic exercises to the confirmed laryngeal diagnosis.',
      remediationPlaybookId: 'slp-5331-remediation-voice-medical-clearance-before-therapy',
      itemIds: [
        'slp5331-b1-002',
        'slp5331-b1-003',
        'slp5331-b1-004',
        'slp5331-b1-010',
        'slp5331-b1-011',
        'slp5331-b1-036',
        'slp5331-b1-041',
        'slp5331-b1-043',
        'slp5331-b1-069',
        'slp5331-b1-071',
        'slp5331-b1-075',
      ],
    },
    {
      id: 'slp5331-aac-prerequisite-myths',
      label: 'Withholding AAC due to cognitive, age, or speech-inhibition myths',
      description:
        'Candidates frequently select distractors that delay AAC until a learner proves cognitive prerequisites, fails oral speech therapy, or reaches an arbitrary age—or that warn caregivers AAC might suppress natural spoken language.',
      remediationMove:
        'Apply the Participation Model and zero-exclusion AAC principles: introduce multimodal AAC immediately when natural speech does not meet daily communication needs, match features to motor/sensory/language access, train partners in aided language input, and reassure families that AAC supports rather than inhibits speech.',
      remediationPlaybookId: 'slp-5331-remediation-aac-prerequisite-myths',
      itemIds: [
        'slp5331-b1-005',
        'slp5331-b1-006',
        'slp5331-b1-036',
        'slp5331-b1-040',
        'slp5331-b1-042',
        'slp5331-b1-068',
        'slp5331-b1-069',
        'slp5331-b1-071',
        'slp5331-b1-072',
        'slp5331-b1-074',
        'slp5331-b1-075',
        'slp5331-b1-079',
      ],
    },
    {
      id: 'slp5331-idea-educational-impact-vs-medical-diagnosis',
      label: 'Equating a medical diagnosis or low test score with IDEA school eligibility',
      description:
        'Test-takers commonly assume an outside medical diagnosis or a single below-average standard score automatically qualifies a student for school-based IEP speech-language services, overlooking IDEA three-prong educational-impact and LRE criteria.',
      remediationMove:
        'Verify all three IDEA eligibility prongs before recommending an IEP: (1) confirmed speech-language impairment using non-biased multi-source assessment, (2) documented adverse educational impact across academic, social, or classroom participation, and (3) need for specially designed instruction from an SLP in the least restrictive environment.',
      remediationPlaybookId: 'slp-5331-remediation-idea-educational-impact-vs-medical-diagnosis',
      itemIds: [
        'slp5331-b1-010',
        'slp5331-b1-012',
        'slp5331-b1-037',
        'slp5331-b1-038',
        'slp5331-b1-039',
        'slp5331-b1-043',
        'slp5331-b1-046',
        'slp5331-b1-068',
        'slp5331-b1-070',
        'slp5331-b1-072',
        'slp5331-b1-073',
        'slp5331-b1-076',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'slp-5331-remediation-bilingual-difference-vs-disorder',
      familyId: 'slp5331-bilingual-difference-vs-disorder',
      familyLabel: 'Mistaking bilingual language difference or dialectal variation for a disorder',
      title: 'Test across both languages and dynamic modifiability before diagnosing disorder',
      recognitionCue:
        'The chosen answer relies on an English-only standard score, treats L1 phonological transfer or AAE grammar as a deficit, or recommends therapy without assessing the home language.',
      repairQuestion:
        'Does this communication pattern occur across BOTH languages (L1 and L2) with low modifiability during dynamic assessment, or is it an expected dialect or cross-linguistic transfer feature?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the student linguistic background in the vignette and identify whether your selected choice treated an English-normed score or dialect feature as proof of underlying language impairment.',
          requiredOutput:
            'Name the specific cultural-linguistic bias in the distractor (unmatched norm sample, ignored L1 proficiency, or misclassified dialect/transfer pattern).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Build a non-biased bilingual assessment plan: caregiver language-exposure history, assessment in both L1 and L2 (using a trained interpreter if the SLP is not fluent), conceptual vocabulary scoring across both languages, naturalistic language sampling, and test-teach-retest dynamic assessment.',
          requiredOutput:
            'State the two diagnostic criteria required to confirm a true language disorder in a bilingual learner (impairment in both L1 and L2 plus reduced learning modifiability).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Classify two cases: (1) a 6-year-old Spanish-English speaker who omits English third-person singular -s and devoices final /z/ but shows age-appropriate Spanish narratives and rapid gains on dynamic cues, and (2) a bilingual peer who shows limited vocabulary, reduced MLU, and poor story grammar in both Spanish and English with high cueing effort.',
          requiredOutput:
            'Label Case 1 as language difference and Case 2 as language disorder, citing the exact L1/L2 and dynamic-assessment evidence.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed assessment item and transfer the difference-versus-disorder filter to an African American English speaker whose final consonant cluster reduction matches AAE phonology.',
          requiredOutput:
            'Choose the non-biased clinical decision and explain why criterion-referenced and dynamic tools outperform unnormed English standard scores here.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'slp-5331-remediation-broca-aos-dysarthria-differential',
      familyId: 'slp5331-broca-aos-dysarthria-differential',
      familyLabel: 'Conflating Broca aphasia, apraxia of speech, and dysarthria',
      title: 'Separate language, motor programming, and neuromuscular execution',
      recognitionCue:
        'The chosen answer recommends oral-motor strengthening for apraxia of speech, labels inconsistent groping with intact strength as dysarthria, or ignores agrammatism pointing to Broca aphasia.',
      repairQuestion:
        'Is the breakdown primarily linguistic (Broca aphasia), motor-programming with inconsistent groping and normal strength (AOS), or neuromuscular weakness/tone/incoordination with consistent errors (dysarthria)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Extract every speech, language, and oral-mechanism clue from the clinical stem and highlight the feature that conflicts with your initial diagnosis or therapy pick.',
          requiredOutput:
            'Identify whether you confused language formulation, motor planning, or neuromuscular execution in your original response.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Contrast the three disorders across four clinical probes: oral-mechanism strength/symmetry, error consistency across repetitions, automatic vs volitional speech performance, and syntax/word-retrieval deficits.',
          requiredOutput:
            'Complete a 3-row differential summary (Broca aphasia, AOS, dysarthria) linking each profile to its primary treatment family (such as VNeST/script training vs SPT/integral stimulation vs loudness/rate/respiratory-phonatory subsystems).',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Differentiate two post-stroke patients: Patient 1 shows normal lingual strength and chewing but inconsistent sound substitutions, visible articulatory groping, and fluent automatic greetings; Patient 2 shows left facial droop, consistent slurred consonants, hypernasality, and breathy voice on both automatic and volitional tasks.',
          requiredOutput:
            'Diagnose Patient 1 (AOS) and Patient 2 (dysarthria) and specify why nonspeech oral-motor exercises are inappropriate for Patient 1.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed neurogenic item and transfer the differential lens to a patient with co-occurring Broca aphasia and AOS following a left MCA infarct.',
          requiredOutput:
            'Select the clinically aligned assessment or intervention move and explain how motor-learning principles (high-repetition speech practice, distributed feedback) guide AOS treatment.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'slp-5331-remediation-dysphagia-bedside-vs-instrumental',
      familyId: 'slp5331-dysphagia-bedside-vs-instrumental',
      familyLabel: 'Relying on bedside screening to rule out silent aspiration or prescribe diet changes',
      title: 'Match dysphagia decisions to instrumental physiology, not bedside guesses',
      recognitionCue:
        'The chosen answer clears thin liquids solely because no cough occurred at bedside, or prescribes thickened liquids or a chin tuck without instrumental proof of pharyngeal biomechanics.',
      repairQuestion:
        'Can a clinical bedside exam visualize pharyngeal silent aspiration or prove that a specific posture or viscosity fixes the biomechanical breakdown—or is MBSS/VFSS or FEES required first?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Examine the dysphagia stem to see whether you equated absence of overt coughing with safe airway protection or recommended a compensatory diet modification without instrumental confirmation.',
          requiredOutput:
            'State the clinical risk created by your initial answer (missed silent aspiration, dehydration/reduced compliance from unneeded thickening, or unverified maneuver).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Distinguish the scope of a clinical swallow evaluation (history, oral-motor/CN V-VII-IX-X-XII exam, alertness, secretion management, hypothesis generation) from instrumental assessment (MBSS/VFSS showing oral-pharyngeal-UES kinematics across phases; FEES showing laryngeal anatomy, secretions, residue, and airway closure).',
          requiredOutput:
            'Map three specific pharyngeal impairments (delayed trigger, reduced laryngeal elevation, unilateral pharyngeal weakness) to their targeted physiological strategies verified during instrumentation.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate two cases: (1) a post-stroke patient with wet voice quality and weak volitional cough who does not cough on 5 mL water trials at bedside, and (2) a patient whose MBSS demonstrates reduced hyolaryngeal excursion and post-swallow pyriform residue.',
          requiredOutput:
            'Recommend instrumental referral for Case 1 (ruling out silent aspiration) and link Case 2 to targeted physiologic rehabilitation (such as Mendelsohn/Shaker/effortful swallow) rather than arbitrary diet restriction.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed dysphagia or screening item and transfer the principle to an SLP asked to perform FEES independently without documented instrumental competency.',
          requiredOutput:
            'Select the evidence-based action and explain how instrumental confirmation and clinician competence jointly protect patient safety.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'slp-5331-remediation-voice-medical-clearance-before-therapy',
      familyId: 'slp5331-voice-medical-clearance-before-therapy',
      familyLabel: 'Starting behavioral voice therapy before ENT laryngeal visualization',
      title: 'Secure ENT laryngeal visualization before starting voice therapy',
      recognitionCue:
        'The chosen answer begins vocal hygiene, resonant voice therapy, or pitch exercises for persistent hoarseness or breathiness without first obtaining ENT medical clearance and laryngeal imaging.',
      repairQuestion:
        'Has an otolaryngologist visualized the vocal folds to rule out structural, neurologic, or malignant disease before behavioral voice therapy starts?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Check the voice vignette for duration of dysphonia, risk factors (smoking, neck surgery, sudden onset, odynophagia), and whether ENT laryngoscopy has already occurred.',
          requiredOutput:
            'Identify the missing medical-clearance gate in your initial treatment selection.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Trace the mandatory voice-evaluation sequence: case history + perceptual/acoustic/aerodynamic appraisal (CAPE-V, MPT, s/z ratio, subglottal pressure requirements) → ENT referral for laryngoscopy/videostroboscopy → collaborative behavioral therapy matched to confirmed physiology (such as semi-occluded vocal tract or resonant voice for phonotraumatic nodules vs glottal-closure/medical options for unilateral paralysis).',
          requiredOutput:
            'State why an SLP cannot diagnose vocal fold pathology without visualization and explain how myoelastic-aerodynamic mechanics guide post-clearance therapy.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Triage two referrals: (1) a 58-year-old former smoker with 6 weeks of progressive hoarseness and no ENT exam, and (2) a teacher cleared by ENT with bilateral early vocal fold nodules and hyperfunctional pressed phonation.',
          requiredOutput:
            'Specify immediate ENT referral before therapy for Referral 1 and an evidence-based behavioral voice plan (resonant voice/SOVT + vocal hygiene) for Referral 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed voice or foundations item and transfer the medical-clearance rule to a child with persistent hypernasality and nasal emission where velopharyngeal insufficiency vs mislearning must be differentiated with nasometry/nasopharyngoscopy.',
          requiredOutput:
            'Select the clinically safe sequence and justify why structural clearance precedes behavioral intervention.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'slp-5331-remediation-aac-prerequisite-myths',
      familyId: 'slp5331-aac-prerequisite-myths',
      familyLabel: 'Withholding AAC due to cognitive, age, or speech-inhibition myths',
      title: 'Apply zero-exclusion AAC feature matching instead of prerequisite gates',
      recognitionCue:
        'The chosen answer postpones AAC until cognitive milestones or oral-speech trials are completed, or endorses caregiver fears that AAC will reduce spoken-word development.',
      repairQuestion:
        'What daily participation barriers exist right now, which AAC features fit the learner motor and language profile, and how will partners model AAC while supporting natural speech?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Spot any outdated prerequisite language in the answer options (must demonstrate object permanence, must reach age 3, must fail verbal therapy first, or avoid AAC to protect speech).',
          requiredOutput:
            'Name the specific AAC myth that steered your initial answer away from immediate multimodal support.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Outline the Participation Model workflow: assess participation/opportunity barriers alongside access capabilities (direct selection, eye gaze, switch scanning), conduct feature matching (core + fringe vocabulary, symbol complexity, voice output), implement aided language modeling with communication partners, and counsel families using evidence that AAC maintains or increases spoken output.',
          requiredOutput:
            'Write a 3-point feature-matching and partner-training rationale that upholds zero-exclusion AAC access.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Plan AAC next steps for two learners: (1) a 28-month-old nonspeaking toddler with cerebral palsy whose parents worry a speech-generating device will stop him from talking, and (2) an elementary student with severe apraxia who has a robust device that stays in his backpack during class.',
          requiredOutput:
            'Draft an evidence-based parent counseling response for Case 1 and an opportunity-barrier / partner-modeling intervention for Case 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed treatment-planning item and transfer the Participation Model lens to selecting functional, person-centered stuttering or aphasia goals that prioritize real-world communication over perfectionistic drills.',
          requiredOutput:
            'Confirm the correct option and explain how removing opportunity barriers drives measurable generalization.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'slp-5331-remediation-idea-educational-impact-vs-medical-diagnosis',
      familyId: 'slp5331-idea-educational-impact-vs-medical-diagnosis',
      familyLabel: 'Equating a medical diagnosis or low test score with IDEA school eligibility',
      title: 'Verify all three IDEA eligibility prongs beyond medical labels',
      recognitionCue:
        'The chosen answer grants or denies school IEP speech services solely from a physician diagnosis, a single standard-score cutoff, or convenience pull-out scheduling without proving educational impact.',
      repairQuestion:
        'Does multi-source evidence confirm all three IDEA prongs—(1) disability/impairment, (2) adverse educational impact, and (3) need for specially designed SLP instruction in the LRE?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Check whether your original answer jumped straight from a medical diagnosis or a single test score to IEP eligibility—or confused clinical medical necessity with school-based educational relevance.',
          requiredOutput:
            'Identify which of the three IDEA prongs (impairment, adverse educational impact, or need for specialized instruction) was skipped or misapplied.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Review the school-based SLP legal decision chain: gather multi-source data (classroom observation, teacher/parent input, criterion-referenced work samples, standardized scores with confidence intervals, hearing screening), verify all three IDEA prongs, select service delivery in the LRE (push-in, consultation, or pull-out matched to need), and protect records under FERPA.',
          requiredOutput:
            'Write the exact 3-prong IDEA eligibility test and state when dismissal/discharge from skilled SLP services is warranted.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Determine eligibility for two students: (1) a third grader with an outside medical diagnosis of mild frontal /s/ lisp who reads above grade level, participates eagerly, and shows zero academic or peer-social impact, and (2) a fifth grader who scores at the 18th percentile on a single language subtest but struggles severely to comprehend classroom narratives and write organized paragraphs.',
          requiredOutput:
            'Justify why Student 1 does not meet IDEA educational-impact criteria (consider MTSS/monitoring) while Student 2 warrants comprehensive multi-source evaluation for adverse educational impact.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed school-practice or assessment item and transfer the multi-source impact standard to choosing discharge criteria when a student achieves classroom generalization and no longer requires skilled SLP support.',
          requiredOutput:
            'Defend the chosen answer by linking measurable baseline/outcome data, LRE service intensity, and educational impact.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const school_psychologist_5403 = {
  misconceptionFamilies: [
    {
      id: 'sp5403-single-score-vs-riot-icel',
      label: 'Over-relying on a single IQ or screening score instead of RIOT-ICEL triangulation',
      description:
        'Test-takers frequently treat a single global IQ score, universal screener flag, or vague teacher label as sufficient for diagnosis or placement instead of triangulating multi-method RIOT evidence across ecological ICEL domains.',
      remediationMove:
        'Operationalize the referral concern first, then gather convergent multi-source data across RIOT (Review, Interview, Observe, Test) and ICEL (Instruction, Curriculum, Environment, Learner), actively investigating discrepancies across settings before concluding.',
      remediationPlaybookId: 'school-psych-5403-remediation-single-score-vs-riot-icel',
      itemIds: [
        'sp5403-b1-001',
        'sp5403-b1-002',
        'sp5403-b1-003',
        'sp5403-b1-004',
        'sp5403-b1-005',
        'sp5403-b1-006',
        'sp5403-b1-011',
        'sp5403-b1-012',
        'sp5403-b1-040',
        'sp5403-b1-058',
        'sp5403-b1-063',
        'sp5403-b1-079',
      ],
    },
    {
      id: 'sp5403-mtss-fidelity-before-referral',
      label: 'Blaming the student or rushing to special education before verifying Tier 1–2 fidelity',
      description:
        'Candidates often interpret stagnant student progress as intrinsic disability without checking Tier 1 core-instruction adequacy or Tier 2/3 treatment integrity—or conversely, wrongly use MTSS tiers to delay a parent-requested IDEA evaluation.',
      remediationMove:
        'Verify core Tier 1 adequacy (≥80% classwide proficiency) and documented intervention fidelity (adherence, dosage, quality) before attributing non-response to learner deficits, while remembering IDEA prohibits using MTSS/RTI to delay or deny an initial evaluation.',
      remediationPlaybookId: 'school-psych-5403-remediation-mtss-fidelity-before-referral',
      itemIds: [
        'sp5403-b1-004',
        'sp5403-b1-005',
        'sp5403-b1-007',
        'sp5403-b1-008',
        'sp5403-b1-009',
        'sp5403-b1-033',
        'sp5403-b1-036',
        'sp5403-b1-039',
        'sp5403-b1-056',
        'sp5403-b1-057',
        'sp5403-b1-060',
        'sp5403-b1-064',
      ],
    },
    {
      id: 'sp5403-fba-topography-vs-function',
      label: 'Designing a BIP around behavior topography instead of hypothesized function',
      description:
        'Test-takers commonly select consequences matched to how a behavior looks (such as hallway removal for shouting) rather than what maintains it (such as escaping hard academic tasks), accidentally reinforcing the very behavior they aim to reduce.',
      remediationMove:
        'Identify the ABC pattern and maintaining function (escape/avoidance, attention, tangible access, or sensory reinforcement) first, then build a BIP around antecedent supports, a functionally equivalent replacement behavior (FERB), and extinction of the problem behavior.',
      remediationPlaybookId: 'school-psych-5403-remediation-fba-topography-vs-function',
      itemIds: [
        'sp5403-b1-001',
        'sp5403-b1-005',
        'sp5403-b1-009',
        'sp5403-b1-010',
        'sp5403-b1-033',
        'sp5403-b1-035',
        'sp5403-b1-036',
        'sp5403-b1-037',
        'sp5403-b1-041',
        'sp5403-b1-042',
        'sp5403-b1-064',
        'sp5403-b1-087',
      ],
    },
    {
      id: 'sp5403-test-bias-and-linguistic-validity',
      label: 'Ignoring cultural-linguistic validity, psychometric reliability, and disproportionality',
      description:
        'Candidates regularly accept English-normed scores for multilingual learners or students with sensory impairments without examining construct-irrelevant variance, confuse accommodations with modifications, or miss systemic disproportionality patterns.',
      remediationMove:
        'Evaluate cultural loading, language proficiency (BICS vs CALP), sensory-access fairness, and norm representativeness before interpreting scores; separate accommodations (access without lowering standards) from modifications (changed construct), and disaggregate systemic equity data.',
      remediationPlaybookId: 'school-psych-5403-remediation-test-bias-and-linguistic-validity',
      itemIds: [
        'sp5403-b1-012',
        'sp5403-b1-034',
        'sp5403-b1-035',
        'sp5403-b1-038',
        'sp5403-b1-059',
        'sp5403-b1-061',
        'sp5403-b1-076',
        'sp5403-b1-077',
        'sp5403-b1-078',
        'sp5403-b1-079',
        'sp5403-b1-080',
        'sp5403-b1-082',
      ],
    },
    {
      id: 'sp5403-prepare-crisis-triage-and-postvention',
      label: 'Misapplying NASP PREPaRE crisis triage, threat assessment, and safe postvention',
      description:
        'Test-takers frequently pick universal psychological debriefing after trauma, endorse public suicide memorials that heighten contagion risk, recommend peer mediation for bullying, or confuse behavioral threat assessment with punitive zero-tolerance suspension.',
      remediationMove:
        'Apply NASP PREPaRE psychological triage (matching intervention tier to exposure, vulnerability, and distress), follow safe suicide postvention guidelines (avoid glorification and large assemblies), use CSTAG-style behavioral threat assessment focused on safety and support, and avoid peer mediation when a bullying power imbalance exists.',
      remediationPlaybookId: 'school-psych-5403-remediation-prepare-crisis-triage-and-postvention',
      itemIds: [
        'sp5403-b1-041',
        'sp5403-b1-043',
        'sp5403-b1-044',
        'sp5403-b1-056',
        'sp5403-b1-062',
        'sp5403-b1-063',
        'sp5403-b1-065',
        'sp5403-b1-066',
        'sp5403-b1-067',
        'sp5403-b1-081',
        'sp5403-b1-083',
      ],
    },
    {
      id: 'sp5403-nasp-confidentiality-and-iee-legal-duties',
      label: 'Misjudging NASP ethics, confidentiality limits, informed consent, and IEE legal duties',
      description:
        'Candidates often treat student confidentiality as absolute despite imminent harm or suspected abuse, skip informed parental consent for evaluations, mishandle parent Independent Educational Evaluation (IEE) requests, or conflate equality with equitable service access.',
      remediationMove:
        'Verify legal and NASP ethical thresholds: break confidentiality when required for imminent safety or mandated abuse reporting, obtain informed written parental consent before evaluations, respond to IEE requests without unnecessary delay (either fund at public expense or file due process), and align service allocation with equity.',
      remediationPlaybookId: 'school-psych-5403-remediation-nasp-confidentiality-and-iee-legal-duties',
      itemIds: [
        'sp5403-b1-003',
        'sp5403-b1-011',
        'sp5403-b1-059',
        'sp5403-b1-061',
        'sp5403-b1-066',
        'sp5403-b1-067',
        'sp5403-b1-078',
        'sp5403-b1-081',
        'sp5403-b1-082',
        'sp5403-b1-083',
        'sp5403-b1-084',
        'sp5403-b1-085',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'school-psych-5403-remediation-single-score-vs-riot-icel',
      familyId: 'sp5403-single-score-vs-riot-icel',
      familyLabel: 'Over-relying on a single IQ or screening score instead of RIOT-ICEL triangulation',
      title: 'Triangulate across RIOT methods and ICEL domains before concluding',
      recognitionCue:
        'The chosen answer diagnoses, classifies, or labels a learner from one test score, one screener flag, or one informant rating without checking ecological or multi-method convergence.',
      repairQuestion:
        'Which RIOT methods (Review, Interview, Observe, Test) and ICEL factors (Instruction, Curriculum, Environment, Learner) are still missing—and why might two informants disagree?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Examine the assessment scenario and circle the single data point (IQ composite, screener cutoff, or teacher complaint) that lured you into premature diagnostic closure.',
          requiredOutput:
            'Name the omitted RIOT method(s) and non-learner ICEL variable(s) (Instruction, Curriculum, or Environment) left unexamined.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Map the problem-solving sequence: define the concern in observable, measurable terms → collect convergent RIOT data across ICEL domains → analyze error patterns and cross-setting discrepancies (such as home vs math class demands) rather than averaging away disagreements.',
          requiredOutput:
            'Draft a 4-cell RIOT plan and specify one testable ecological hypothesis explaining informant discrepancy.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Apply RIOT-ICEL to two referrals: (1) a fourth grader described as "unmotivated" who scores low on a universal reading screener, and (2) a middle schooler rated high on inattention by the science teacher but typical by parents and the ELA teacher.',
          requiredOutput:
            'Write an observable behavioral definition for Case 1 and list the exact classroom observation and curriculum-alignment checks needed for Case 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed assessment item and transfer the triangulation rule to writing a psychoeducational report that integrates test scores with error analysis and classroom recommendations.',
          requiredOutput:
            'Select the multi-source answer and justify how convergent RIOT-ICEL evidence makes the recommendation defensible to families and educators.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-psych-5403-remediation-mtss-fidelity-before-referral',
      familyId: 'sp5403-mtss-fidelity-before-referral',
      familyLabel: 'Blaming the student or rushing to special education before verifying Tier 1–2 fidelity',
      title: 'Check Tier 1 health and intervention fidelity—without delaying IDEA rights',
      recognitionCue:
        'The chosen answer escalates a student to special education after an unverified or inconsistently delivered intervention, or illegally tells a parent they must finish Tier 3 before an IDEA evaluation.',
      repairQuestion:
        'Was Tier 1 effective for at least 80% of peers, was Tier 2/3 delivered with documented fidelity and matched to the skill phase—and has a parent triggered IDEA evaluation timelines?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the MTSS vignette for two distinct red flags: low implementation fidelity (such as sessions delivered half the scheduled time or classwide failure) versus a formal parental evaluation request.',
          requiredOutput:
            'Identify whether your original mistake was blaming the learner for low fidelity or misusing MTSS to obstruct IDEA evaluation rights.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Anchor decision rules across MTSS tiers: strengthen Tier 1 first when fewer than 80% meet benchmarks; match intervention to the Instructional Hierarchy (modeling/explicit instruction for acquisition vs timed practice for fluency); verify treatment integrity before changing tiers; and initiate IDEA evaluation immediately without MTSS delay when a parent requests one or disability is suspected.',
          requiredOutput:
            'State the exact next step required when intervention fidelity is low (coach/restore integrity before re-evaluating student response) alongside the IDEA non-delay rule.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Decide the next action in two cases: (1) a Tier 2 reading group shows flat CBM slopes, but attendance and coaching logs show the intervention ran only twice per week instead of five, and (2) a parent submits a written request for a special education evaluation during Week 3 of Tier 2 math support.',
          requiredOutput:
            'Specify fidelity remediation and consultation for Case 1 and concurrent IDEA consent/evaluation initiation (while continuing Tier 2 support) for Case 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed MTSS or consultation item and transfer the fidelity check to a district-wide PBIS rollout that succeeded in a pilot school but stalled after expansion.',
          requiredOutput:
            'Choose the system-valid action and explain how monitoring adherence, dosage, and skill match prevents false-positive referrals.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-psych-5403-remediation-fba-topography-vs-function',
      familyId: 'sp5403-fba-topography-vs-function',
      familyLabel: 'Designing a BIP around behavior topography instead of hypothesized function',
      title: 'Match every BIP component to behavior function, never surface topography',
      recognitionCue:
        'The chosen answer applies a generic consequence (like hallway timeout for classroom disruption) that matches what the behavior looks like while accidentally feeding its maintaining function.',
      repairQuestion:
        'What specific antecedent triggers the behavior, what consequence immediately maintains it (escape, attention, tangible, sensory), and what replacement behavior serves that exact same function?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Trace the ABC sequence in the vignette and check whether your originally chosen consequence would actually deliver the student preferred payoff (such as escaping hard work via office referral).',
          requiredOutput:
            'Name the maintaining function shown in the ABC data and explain how the distractor reinforces it.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Construct the four-part function-based BIP model: (1) setting-event/antecedent modification (such as instructional match, pre-correction, chunking), (2) explicitly taught Functionally Equivalent Replacement Behavior (FERB, such as requesting a brief break or help), (3) immediate reinforcement of the FERB, and (4) extinction/neutral redirection so the problem behavior no longer pays off.',
          requiredOutput:
            'Write one matched antecedent change, one FERB, and one consequence change tied directly to the hypothesized function.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Contrast two students who both throw pencils during math: Student A throws pencils only during independent multi-step word problems and is sent to the hallway; Student B throws pencils during whole-group lessons and laughs when peers gasp and the teacher lectures loudly.',
          requiredOutput:
            'Identify each student function (escape vs peer/adult attention) and design two completely different FERBs and consequence plans.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed FBA/BIP item and transfer function-based logic to evaluating single-case intervention graphs (such as multiple baseline or reversal showing experimental control when the BIP is introduced).',
          requiredOutput:
            'Confirm the function-matched option and state the measurable progress-monitoring metric that verifies BIP effectiveness.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-psych-5403-remediation-test-bias-and-linguistic-validity',
      familyId: 'sp5403-test-bias-and-linguistic-validity',
      familyLabel: 'Ignoring cultural-linguistic validity, psychometric reliability, and disproportionality',
      title: 'Audit linguistic, sensory, and psychometric validity before interpreting scores',
      recognitionCue:
        'The chosen answer treats an English-standardized score as valid for a multilingual learner or student with sensory loss, blurs accommodations with modifications, or ignores subgroup disproportionality.',
      repairQuestion:
        'Is this low score measuring the target construct—or construct-irrelevant language load, sensory barriers, low test reliability, or systemic instructional inequity?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the student demographic, language, sensory, or psychometric details in the stem and flag the validity threat your original choice overlooked.',
          requiredOutput:
            'Identify the specific source of bias or measurement error (language load, sensory barrier, poor test-retest reliability, or unexamined disproportionality).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply non-biased assessment rules: evaluate L1 and L2 proficiency (conversational BICS vs academic CALP) and opportunity to learn; use culturally and linguistically appropriate or nonverbal/dynamic measures when English norms introduce construct-irrelevant variance; separate accommodations (same construct/standards, such as Braille or extended time) from modifications (altered construct/expectations); and disaggregate risk ratios for disproportionality.',
          requiredOutput:
            'State the exact fairness safeguard required for the learner profile and explain how accommodations preserve construct validity.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Evaluate two cases: (1) an eighth-grade multilingual learner with strong social English (BICS) who fails fast-paced oral science quizzes, and (2) a school where overall office discipline referrals fell 20% while referrals for one racial group stayed twice the district average.',
          requiredOutput:
            'Specify why oral-English quiz failure reflects CALP/instructional-access needs in Case 1 and why Case 2 requires disaggregated root-cause equity review rather than celebrating the aggregate average.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed foundations or psychometrics item and transfer the validity filter to a test showing unstable retest scores (low reliability sets a ceiling on validity).',
          requiredOutput:
            'Select the psychometrically and culturally defensible option and explain why unreliable or biased scores cannot anchor eligibility decisions.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-psych-5403-remediation-prepare-crisis-triage-and-postvention',
      familyId: 'sp5403-prepare-crisis-triage-and-postvention',
      familyLabel: 'Misapplying NASP PREPaRE crisis triage, threat assessment, and safe postvention',
      title: 'Match PREPaRE crisis tiers, threat assessment, and contagion-safe postvention',
      recognitionCue:
        'The chosen answer provides uniform crisis debriefing to all students, holds a large schoolwide suicide memorial, uses peer mediation for bullying, or equates threat assessment with automatic expulsion.',
      repairQuestion:
        'Which crisis tier fits each student exposure and distress level under NASP PREPaRE, and does this response prevent suicide contagion and power-imbalance harm?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Scan the crisis, bullying, or threat-assessment stem and flag any unsafe or mismatched response (blanket debriefing, sensationalized memorial, peer mediation for bullying, or punitive zero-tolerance exclusion).',
          requiredOutput:
            'Name the specific crisis-safety or PREPaRE principle violated by the distractor.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Organize the NASP PREPaRE response hierarchy: re-establish physical/psychological safety and normal routines first; conduct psychological triage (physical proximity, emotional proximity, threat perceptions, vulnerability, coping) to assign Tier 1 (reaffirming health/psychoeducation), Tier 2 (classroom/small-group crisis intervention), or Tier 3 (individual trauma-focused psychotherapy); follow contagion-safe suicide postvention (small-group factual notification, no permanent public memorials, monitor high-risk peers); and distinguish behavioral threat assessment (transient vs substantive threat + safety/support plan) from zero-tolerance discipline.',
          requiredOutput:
            'Specify the exact PREPaRE tier or threat-assessment action required by the scenario and state why peer mediation is contraindicated in bullying.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Triage two school events: (1) following a student death by suicide, student leaders ask for an all-school auditorium memorial with a slideshow, and (2) after a terrifying lockdown, most students recover quickly with routine while three eyewitnesses show persistent hypervigilance and nightmares.',
          requiredOutput:
            'Design a contagion-safe alternative for Event 1 (classroom factual scripts, quiet support rooms, living prevention focus) and tiered PREPaRE triage for Event 2 (Tier 1 routine for most, Tier 2/3 targeted support for the three eyewitnesses).',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed systems-crisis item and transfer the threat-assessment mindset to evaluating a seventh grader who wrote an angry note after being excluded at lunch.',
          requiredOutput:
            'Choose the evidence-based safety protocol and explain how structured inquiry, protective factors, and parent collaboration reduce risk more effectively than automatic suspension.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-psych-5403-remediation-nasp-confidentiality-and-iee-legal-duties',
      familyId: 'sp5403-nasp-confidentiality-and-iee-legal-duties',
      familyLabel: 'Misjudging NASP ethics, confidentiality limits, informed consent, and IEE legal duties',
      title: 'Apply NASP ethical boundaries, consent rules, and IDEA IEE timelines',
      recognitionCue:
        'The chosen answer withholds safety/abuse disclosures to preserve rapport, tests without written parental consent, ignores or flatly refuses a parent IEE request, or equates equal hours with equitable access.',
      repairQuestion:
        'Does this situation trigger a legal duty to breach confidentiality, require prior written informed consent, or obligate the district to fund an IEE or file due process without delay?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Identify the exact legal or NASP ethical obligation embedded in the vignette (confidentiality limit, informed consent, IDEA IEE procedural safeguard, or equitable service access).',
          requiredOutput:
            'State the legal or ethical rule your initial answer violated or overlooked.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'State the binding legal/ethical duties: (1) explain confidentiality limits upfront and breach only for imminent harm, suspected abuse/neglect (mandated reporting), or legal mandate—sharing the minimum necessary information; (2) obtain informed written parental consent before initial evaluation or reevaluation; (3) when a parent disagrees with a district evaluation and requests an IEE at public expense, the district must without unnecessary delay either fund the IEE or request a due process hearing to defend its evaluation; and (4) distinguish equity (need-based resources/access) from equality (identical allocation).',
          requiredOutput:
            'Write the exact two-option legal duty for an IEE request and the exact threshold for breaking confidentiality.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Resolve two legal-ethical dilemmas: (1) parents disagree with a district SLD evaluation and request an IEE at public expense, and the administrator asks you to deny it by email because the district test was thorough; and (2) an effective parent-training workshop is scheduled only at 10:00 a.m. on weekdays, excluding hourly-wage families.',
          requiredOutput:
            'Specify the IDEA-compliant IEE response (fund or file due process without delay, never unilaterally refuse) for Dilemma 1 and the systemic equity redesign for Dilemma 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed legal-ethical item and transfer the ethical-rigor standard to evaluating whether a non-randomized matched-school comparison can support a strict causal claim.',
          requiredOutput:
            'Select the compliant action and articulate how legal safeguards, transparent limitations, and equity principles protect students and families.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

const school_counselor_5422 = {
  misconceptionFamilies: [
    {
      id: 'sc5422-confidentiality-duty-to-warn-mandated-reporting',
      label: 'Mismanaging confidentiality limits, mandated reporting, and FERPA record boundaries',
      description:
        'Test-takers frequently either promise absolute secrecy to minors despite abuse or imminent-harm disclosures, wait for principal permission before calling CPS, or violate FERPA by over-sharing counseling details or storing identifiable student notes on personal cloud drives.',
      remediationMove:
        'Explain confidentiality limits developmentally upfront, report suspected abuse/neglect directly to CPS immediately without investigating or waiting for administrative approval, break confidentiality strictly on a need-to-know basis for foreseeable serious harm, and keep sole-possession notes separate and secure from FERPA educational records.',
      remediationPlaybookId: 'school-counselor-5422-remediation-confidentiality-duty-to-warn',
      itemIds: [
        'sc5422-b1-005',
        'sc5422-b1-007',
        'sc5422-b1-008',
        'sc5422-b1-026',
        'sc5422-b1-032',
        'sc5422-b1-069',
        'sc5422-b1-071',
        'sc5422-b1-072',
        'sc5422-b1-086',
        'sc5422-b1-087',
        'sc5422-b1-094',
        'sc5422-b1-097',
      ],
    },
    {
      id: 'sc5422-participation-vs-outcome-data-claims',
      label: 'Conflating participation, Mindsets & Behaviors, and outcome data or overclaiming causality',
      description:
        'Candidates regularly mistake headcounts (participation data) or pre/post skill checks (Mindsets & Behaviors data) for attendance, behavior, or achievement outcome data—or claim a counseling group caused improvement without baseline trends, fidelity checks, or experimental control.',
      remediationMove:
        'Classify every metric into the exact ASCA data tier—Participation (who/how many/how long), Mindsets & Behaviors (attitudes, knowledge, skills), or Outcome (achievement, attendance, discipline)—and pair baseline comparison, implementation fidelity, and correlational wording rather than causal overclaims.',
      remediationPlaybookId: 'school-counselor-5422-remediation-participation-vs-outcome-data',
      itemIds: [
        'sc5422-b1-073',
        'sc5422-b1-074',
        'sc5422-b1-075',
        'sc5422-b1-076',
        'sc5422-b1-077',
        'sc5422-b1-088',
        'sc5422-b1-089',
        'sc5422-b1-090',
        'sc5422-b1-092',
        'sc5422-b1-093',
        'sc5422-b1-094',
        'sc5422-b1-095',
      ],
    },
    {
      id: 'sc5422-non-counseling-duties-vs-asca-80-20',
      label: 'Accepting inappropriate non-counseling duties instead of protecting the ASCA 80/20 allocation',
      description:
        'Test-takers often either comply silently with inappropriate administrative duties (standardized test coordination, master scheduling, discipline) or refuse antagonistically instead of using ASCA Use-of-Time data and the Annual Administrative Conference to realign toward 80% direct/indirect student services.',
      remediationMove:
        'Document actual time allocation with Use-of-Time logs, bring disaggregated student-outcome impact data to the Annual Administrative Conference, and collaboratively negotiate reassignment of non-counseling duties to protect the ASCA 80% direct/indirect and 20% program-planning benchmark.',
      remediationPlaybookId: 'school-counselor-5422-remediation-non-counseling-duties-80-20',
      itemIds: [
        'sc5422-b1-001',
        'sc5422-b1-002',
        'sc5422-b1-004',
        'sc5422-b1-005',
        'sc5422-b1-008',
        'sc5422-b1-066',
        'sc5422-b1-067',
        'sc5422-b1-068',
        'sc5422-b1-069',
        'sc5422-b1-070',
        'sc5422-b1-072',
        'sc5422-b1-086',
      ],
    },
    {
      id: 'sc5422-suicide-risk-supervision-and-parent-notification',
      label: 'Failing immediate supervision, structured risk screening, or parent notification in suicide crises',
      description:
        'Candidates frequently select unsafe crisis shortcuts—sending a student expressing suicidal ideation back to class alone, relying on discredited no-harm contracts, delaying parent notification, or providing ongoing clinical therapy beyond the school counselor brief-support role.',
      remediationMove:
        'Never leave a student at suicide risk unsupervised; conduct structured district-approved risk screening, collaborate on a safety plan (not a no-harm contract), notify parents/guardians (or CPS/emergency services if parent contact increases danger), and execute a documented warm handoff to community mental-health care.',
      remediationPlaybookId: 'school-counselor-5422-remediation-suicide-risk-supervision',
      itemIds: [
        'sc5422-b1-007',
        'sc5422-b1-008',
        'sc5422-b1-009',
        'sc5422-b1-026',
        'sc5422-b1-027',
        'sc5422-b1-029',
        'sc5422-b1-030',
        'sc5422-b1-031',
        'sc5422-b1-032',
        'sc5422-b1-071',
        'sc5422-b1-087',
      ],
    },
    {
      id: 'sc5422-small-group-screening-and-consent-ethics',
      label: 'Skipping small-group screening, informed consent, or confidentiality norms',
      description:
        'Test-takers commonly place students into small counseling groups based on unscreened teacher nominations, blur Tier 1 classroom instruction with Tier 2 small-group intervention, skip parent/guardian consent requirements, or promise members that peers will keep everything confidential.',
      remediationMove:
        'Use data to match Tier 1 (classroom) vs Tier 2 (targeted small group), conduct individual pre-group screening for fit and readiness, secure parent/guardian informed consent per policy, and establish explicit group norms explaining that peer confidentiality is encouraged but cannot be guaranteed.',
      remediationPlaybookId: 'school-counselor-5422-remediation-small-group-screening-consent',
      itemIds: [
        'sc5422-b1-009',
        'sc5422-b1-010',
        'sc5422-b1-011',
        'sc5422-b1-012',
        'sc5422-b1-028',
        'sc5422-b1-030',
        'sc5422-b1-031',
        'sc5422-b1-033',
        'sc5422-b1-034',
        'sc5422-b1-035',
        'sc5422-b1-036',
        'sc5422-b1-037',
      ],
    },
    {
      id: 'sc5422-systemic-equity-vs-deficit-framing',
      label: 'Defaulting to individual student deficit framing instead of systemic equity advocacy',
      description:
        'Candidates frequently respond to racial, linguistic, or socioeconomic gaps in discipline, course access, or attendance by trying to "fix" individual students or celebrating schoolwide averages that mask persistent subgroup disparities.',
      remediationMove:
        'Disaggregate achievement, attendance, discipline, and access data by student subgroups to pinpoint systemic barriers, engage stakeholders to examine inequitable policies or gatekeeping practices, and build measurable closing-the-gap action plans.',
      remediationPlaybookId: 'school-counselor-5422-remediation-systemic-equity-vs-deficit',
      itemIds: [
        'sc5422-b1-003',
        'sc5422-b1-006',
        'sc5422-b1-007',
        'sc5422-b1-034',
        'sc5422-b1-036',
        'sc5422-b1-067',
        'sc5422-b1-075',
        'sc5422-b1-077',
        'sc5422-b1-091',
        'sc5422-b1-095',
        'sc5422-b1-096',
        'sc5422-b1-097',
      ],
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'school-counselor-5422-remediation-confidentiality-duty-to-warn',
      familyId: 'sc5422-confidentiality-duty-to-warn-mandated-reporting',
      familyLabel: 'Mismanaging confidentiality limits, mandated reporting, and FERPA record boundaries',
      title: 'Hold strict confidentiality except for mandated safety duties and FERPA rules',
      recognitionCue:
        'The chosen answer delays a CPS report to consult an administrator, investigates abuse personally, shares private session details casually, or saves identifiable student notes in a personal cloud account.',
      repairQuestion:
        'Does this situation trigger a legal exception to confidentiality (suspected abuse/neglect or foreseeable serious harm), and how must student records be protected under FERPA and ASCA standards?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the ethical dilemma and flag whether your original response erred toward improper secrecy (failing to report abuse/harm) or improper disclosure/storage (violating FERPA or personal-cloud security).',
          requiredOutput:
            'Identify the exact ASCA Ethical Standard or FERPA boundary crossed by your initial choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'State the dual ethical rule: (1) mandated reporting of suspected child abuse/neglect goes directly to CPS without waiting for principal permission or conducting a forensic investigation, and duty to warn/protect discloses only minimum necessary details when foreseeable serious harm exists; (2) under FERPA, educational records belong in secured district systems while sole-possession memory-aid notes remain strictly private and never live in unsecured personal cloud accounts.',
          requiredOutput:
            'Write the exact reporting or record-security sequence required by the scenario, including transparent student notification when safe.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Resolve two ethical scenarios: (1) a fifth grader discloses bruises inflicted by a caregiver and begs you not to tell anyone, while the assistant principal asks you to wait until she calls the caregiver first; and (2) a counselor uploads identifiable student counseling notes to a personal cloud folder to work from home.',
          requiredOutput:
            'Specify immediate direct CPS reporting (without calling the suspected perpetrator) in Scenario 1 and district-secured FERPA-compliant record storage in Scenario 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed ethics item and transfer the confidentiality boundary to a teacher asking for full details from a student individual counseling session.',
          requiredOutput:
            'Select the ASCA-compliant action and explain how to support classroom collaboration through need-to-know functional strategies without disclosing confidential session content.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-counselor-5422-remediation-participation-vs-outcome-data',
      familyId: 'sc5422-participation-vs-outcome-data-claims',
      familyLabel: 'Conflating participation, Mindsets & Behaviors, and outcome data or overclaiming causality',
      title: 'Separate participation, Mindsets & Behaviors, and outcome data before claiming impact',
      recognitionCue:
        'The chosen answer cites session attendance counts or a skill post-test as an achievement/attendance outcome, ignores missing fidelity when results are flat, or claims a non-randomized group caused higher graduation.',
      repairQuestion:
        'Which ASCA data tier does this measure represent (Participation, Mindsets & Behaviors, or Outcome), were sessions delivered with fidelity, and does the design support association rather than causation?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Examine the data statement in the vignette and identify whether your chosen answer mislabeled an ASCA data tier, overlooked uncompleted sessions, or endorsed a causal claim from observational data.',
          requiredOutput:
            'Name the exact data-interpretation fallacy present in the distractor (tier confusion, missing baseline/fidelity check, leading survey item, or correlation-as-causation).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Sort all three ASCA National Model data tiers: Participation (number of students, sessions, minutes), Mindsets & Behaviors (pre/post attitude, knowledge, or demonstrated skill checks), and Outcome (measurable shifts in achievement, attendance, or discipline)—and verify baseline data, implementation fidelity, unbiased survey wording, and correlational language in results reports.',
          requiredOutput:
            'Write one concrete example of Participation, Mindsets & Behaviors, and Outcome data for a single ninth-grade transition intervention.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Audit two program-evaluation findings: (1) a lesson series shows zero improvement in tardies, but logs reveal only 3 of 6 lessons were delivered, and (2) a counselor results report states that a study-skills group "caused" a 14% rise in passing grades because group participants outperformed non-participants.',
          requiredOutput:
            'Diagnose Finding 1 as an implementation-fidelity failure (not proof the curriculum failed) and rewrite Finding 2 using accurate pre/post association language.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed Manage or Assess item and transfer the evaluation rigor to reconciling three conflicting data sources on school belonging.',
          requiredOutput:
            'Choose the methodologically sound evaluation action and explain how triangulating baseline, fidelity, and subgroup data guides program improvement.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-counselor-5422-remediation-non-counseling-duties-80-20',
      familyId: 'sc5422-non-counseling-duties-vs-asca-80-20',
      familyLabel: 'Accepting inappropriate non-counseling duties instead of protecting the ASCA 80/20 allocation',
      title: 'Use Use-of-Time data and the Annual Conference to defend 80/20 services',
      recognitionCue:
        'The chosen answer passively absorbs full-time testing coordination or discipline duty, or refuses an administrator without offering Use-of-Time evidence and collaborative solutions.',
      repairQuestion:
        'Is this assigned task an appropriate counseling role or an inappropriate non-counseling duty, and how do Use-of-Time data and the Annual Administrative Conference protect the ASCA 80/20 balance?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Classify the assigned duty in the vignette against the ASCA Appropriate vs Inappropriate Activities list and note whether your original choice fell into passive compliance or unproductive confrontation.',
          requiredOutput:
            'Label the task as direct student service, indirect student service, program planning/school support (≤20%), or inappropriate non-counseling duty.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Follow the ASCA collaborative advocacy sequence: track actual hours via a Use-of-Time assessment → show how non-counseling duties displace direct/indirect student services needed for annual student outcome goals → bring data and a feasible transition plan to the Annual Administrative Conference (and advisory council if systemic) to restore the 80% direct/indirect / 20% planning-support target.',
          requiredOutput:
            'Draft a concise 3-step talking frame pairing Use-of-Time numbers with student achievement, attendance, or mental-health impact.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Respond to two staffing assignments: (1) a principal assigns the school counselor to coordinate all state standardized testing logistics for three weeks during spring transition planning, and (2) weekly calendar logs show only 52% direct/indirect student services due to lunchroom supervision and clerical schedule entry.',
          requiredOutput:
            'Specify the data-driven collaborative advocacy move for Assignment 1 and the Annual Administrative Conference realignment proposal for Assignment 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed Define or Manage item and transfer role-clarity principles to addressing counselor burnout and maintaining alignment between the program mission and the school educational mission.',
          requiredOutput:
            'Confirm the ASCA-aligned response and explain why linking role advocacy to student outcomes persuades administrators better than personal complaints.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-counselor-5422-remediation-suicide-risk-supervision',
      familyId: 'sc5422-suicide-risk-supervision-and-parent-notification',
      familyLabel: 'Failing immediate supervision, structured risk screening, or parent notification in suicide crises',
      title: 'Maintain continuous supervision, structured screening, and caregiver handoff in suicide crises',
      recognitionCue:
        'The chosen answer allows a student with suicidal ideation to return to class alone, relies on a no-harm contract, delays parent notification, or initiates long-term clinical therapy in school.',
      repairQuestion:
        'Is the student under continuous adult supervision right now, has structured risk screening and collaborative safety planning occurred, and have parents/guardians and clinical referrals been activated?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Scan the crisis stem for immediate safety gaps—unsupervised movement, reliance on a verbal promise or no-harm contract, delayed parent notification, or scope-of-practice overreach into ongoing psychotherapy.',
          requiredOutput:
            'Pinpoint the specific safety lapse or role-boundary error in your initial answer choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Lock in the non-negotiable suicide-response sequence: (1) maintain continuous line-of-sight adult supervision—never leave the student alone; (2) conduct a district-approved structured risk screen (ideation, intent, plan, means, prior attempts, protective factors); (3) notify parents/guardians promptly (unless parent involvement threatens safety, then contact CPS/emergency responders); (4) build a collaborative safety plan rather than a no-harm contract; and (5) document actions and provide warm-handoff referrals to community mental-health clinicians with a school re-entry plan.',
          requiredOutput:
            'List the exact ordered steps from disclosure to safe release/transfer and state why no-harm contracts are contraindicated.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Manage two urgent scenarios: (1) a tenth grader tells you they have a plan to end their life tonight and asks to go back to fourth-period math to grab their backpack while you call home; and (2) after emergency hospitalization, a caregiver asks the school counselor to provide weekly long-term trauma therapy.',
          requiredOutput:
            'Write the immediate supervision + parent-notification protocol for Scenario 1 and the brief school-support + community-referral boundary response for Scenario 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Deliver or ethics item and transfer the scope-of-practice boundary to distinguishing short-term solution-focused school counseling from external clinical treatment.',
          requiredOutput:
            'Select the safest, ASCA-compliant action and justify why immediate supervision and caregiver/community linkage supersede routine confidentiality.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-counselor-5422-remediation-small-group-screening-consent',
      familyId: 'sc5422-small-group-screening-and-consent-ethics',
      familyLabel: 'Skipping small-group screening, informed consent, or confidentiality norms',
      title: 'Screen members, secure consent, and set realistic group confidentiality norms',
      recognitionCue:
        'The chosen answer enrolls students into a small group without pre-screening, uses small groups for a grade-wide need better served in Tier 1, skips parent consent, or guarantees peer secrecy.',
      repairQuestion:
        'Does data call for Tier 1 classroom lessons or a Tier 2 small group, has every member been individually screened with appropriate consent, and do norms clarify that peer confidentiality cannot be guaranteed?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Review the group-counseling or tiered-delivery stem to see whether your initial answer skipped member screening, mismatched Tier 1 vs Tier 2 delivery, omitted informed consent, or overpromised confidentiality.',
          requiredOutput:
            'Name the exact ethical or group-design step omitted in your original choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Map the ASCA group-counseling checklist: use school data to decide Tier 1 (most students need the skill → classroom instruction) vs Tier 2 (targeted subgroup → 4–8 week small group); screen each candidate individually for topic fit, readiness, and exclusion of acute crisis or incompatible dynamics; obtain parent/guardian informed consent per district policy; and teach group norms stating that the counselor maintains confidentiality within legal limits but cannot guarantee peers will keep disclosures private.',
          requiredOutput:
            'Specify the screening criterion, consent step, and confidentiality disclaimer required before Session 1 begins.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Design tiered delivery for two situations: (1) grade-level data show 75% of sixth graders struggle with planner organization while 8 students also show severe test anxiety; and (2) during screening for a grief group, one student discloses active suicidal ideation.',
          requiredOutput:
            'Assign Tier 1 classroom lessons vs Tier 2 small group cleanly in Situation 1, and explain why the student in Situation 2 is excluded from the group for immediate individual crisis intervention and referral.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed Deliver item and transfer the developmental-fit standard to choosing age-appropriate career exploration activities (awareness in elementary vs exploration in middle vs postsecondary planning in high school).',
          requiredOutput:
            'Defend the correct tiered/group decision by citing member screening, consent, realistic confidentiality norms, and measurable group goals.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'school-counselor-5422-remediation-systemic-equity-vs-deficit',
      familyId: 'sc5422-systemic-equity-vs-deficit-framing',
      familyLabel: 'Defaulting to individual student deficit framing instead of systemic equity advocacy',
      title: 'Disaggregate data to dismantle systemic barriers instead of blaming students',
      recognitionCue:
        'The chosen answer tells struggling or underrepresented students to work harder, celebrates aggregate gains that hide subgroup gaps, or treats a systemic policy disparity as an individual counseling issue.',
      repairQuestion:
        'What do disaggregated subgroup data reveal about institutional policies, access barriers, or low survey reach—and what systemic advocacy move closes the gap?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the equity scenario and check whether your original answer focused solely on fixing an individual student mindset or relied on a schoolwide average that concealed an underserved subgroup gap.',
          requiredOutput:
            'Identify the deficit-framing assumption or aggregate-data blind spot in your initial choice.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the ASCA systemic-change lens: disaggregate achievement, attendance, discipline, course-enrollment, and survey-response data by race/ethnicity, language status, disability, and socioeconomic indicators; examine policies, prerequisites, and scheduling barriers driving disparities; partner with teachers, administrators, families, and the advisory council; and launch a measurable closing-the-gap action plan.',
          requiredOutput:
            'State the exact data disaggregation check and one policy- or practice-level advocacy move that addresses the root barrier.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Respond to two equity reports: (1) schoolwide attendance rose 4% after an incentive campaign, but multilingual-learner attendance declined 6%; and (2) an annual parent needs survey shows strong satisfaction overall, yet responses came from fewer than 10% of families in two neighborhood feeders.',
          requiredOutput:
            'Specify root-cause subgroup inquiry and barrier removal for Report 1 and multilingual/accessible outreach to correct non-response bias in Report 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed Define or Assess item and transfer the equity lens to reviewing ninth-grade course-placement prerequisites that disproportionately track first-generation students out of college-preparatory pathways.',
          requiredOutput:
            'Select the systemic-advocacy option and explain how disaggregated outcome tracking holds the school counseling program accountable for equitable results.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

module.exports = {
  audiology_5343,
  speech_language_pathology_5331,
  school_psychologist_5403,
  school_counselor_5422,
};
