'use strict';

// Applied practice case workshops for Praxis School Psychologist (5403) and
// Praxis School Counselor (5422): 12 original, unscored applied case-analysis
// workshops (6 per library) aligned to official domains and verified catalog URLs.

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE =
  'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or professional determination. AlloFlow does not score written responses.';

const school_psychologist_5403 = {
  workshopLabel: 'Applied practice case workshops',
  workshopPracticeNote:
    'Independent applied case-analysis workshops designed to build RIOT/MTSS data synthesis, consultation, crisis prevention, and NASP legal-ethical reasoning for School Psychologist (5403) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or clinical determinations.',
  workshops: [
    {
      id: 'spsych5403-workshop-01',
      taskType: 'Nondiscriminatory RIOT/ICEL evaluation synthesis',
      title: 'Differentiate Language Acquisition from Specific Learning Disability',
      prompt:
        'Analyze referral data for a fourth-grade multilingual learner using RIOT/ICEL and IDEA nondiscriminatory evaluation standards to determine what additional evidence is required before any SLD eligibility decision.',
      stimulus:
        'Mateo (age 9, Grade 4, Spanish home language, 2.5 years of English schooling, WIDA ACCESS composite 2.4) is referred for reading SLD after an English-only test yielded a standard score of 74. Records show Grade 3 Spanish phonics mastery before transfer and 88% math accuracy when items are read in Spanish. Observation shows Mateo tracks partner reading smoothly yet stalls on English idioms and multistep verbal directions.',
      estimatedMinutes: 15,
      taskParts: [
        'Synthesize the existing Review, Interview, Observation, and Test evidence across ICEL domains to separate English language proficiency limits from core reading impairment.',
        'Specify the bilingual, native-language, and dynamic assessment methods required under IDEA 34 CFR 300.304 to ensure a valid, nondiscriminatory evaluation.',
        'Explain how you will communicate score validity limits and instructional recommendations to the IEP team and Mateo\'s family in their preferred language.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast Mateo\'s English score of 74 and WIDA 2.4 status against his documented Spanish phonics mastery, 88% Spanish-supported math accuracy, and idiom-specific comprehension stalls.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply RIOT/ICEL analysis, IDEA 34 CFR 300.304 nondiscriminatory assessment rules, and the SLD exclusionary factor for limited English proficiency.',
        },
        {
          label: 'Action plan',
          guidance:
            'Detail dual-language reading assessment, developmental language history interviews, peer-comparison norms, and sheltered Tier 1/2 language scaffolds before eligibility determination.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Ensure a trained bilingual evaluator or vetted interpreter, written parental consent in Spanish, and explicit caveats against treating the English norm-referenced score as valid.',
        },
      ],
      successCriteria: [
        'Explicitly flags the English standard score of 74 as construct-irrelevant variance confounded by second-language acquisition rather than proof of SLD.',
        'Organizes findings across both RIOT data sources and ICEL alterable variables (Instruction, Curriculum, Environment, Learner).',
        'Proposes native-language or bilingual evaluation methods alongside peer comparison with similarly situated multilingual learners.',
        'Addresses IDEA exclusionary criteria, qualified interpretation, and accessible family communication in Spanish.',
      ],
      commonPitfalls: [
        'Accepting the standard score of 74 at face value because it falls more than 1.5 standard deviations below the English-normed mean.',
        'Using an untrained bilingual paraprofessional or family member to translate standardized test items on the fly.',
        'Delaying instructional English language development supports while waiting for formal special education testing.',
        'Confusing conversational social fluency (BICS) with academic language proficiency (CALP) needed for Grade 4 text.',
      ],
      sampleOutline: [
        'Evidence synthesis: Cross-linguistic records (Spanish phonics mastery, 88% Spanish-read math) and WIDA 2.4 indicate language-access barriers rather than generalized decoding failure.',
        'Nondiscriminatory assessment plan: Conduct a Spanish-English language dominance review, bilingual reading and phonological evaluation, caregiver developmental interview, and dynamic assessment of decoding transfer.',
        'Instructional alignment: Recommend explicit English academic vocabulary, visual anchors, and native-language transfer bridges while monitoring growth against true multilingual peers.',
        'Legal-ethical safeguards: Document IDEA 34 CFR 300.304 compliance, explain test-norm limitations in the report, and engage Mateo\'s family with a qualified Spanish interpreter.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/d/300.304',
        'https://www.nasponline.org/standards-and-certification/nasp-2020-professional-standards-adopted/nasp-2020-domains-of-practice',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'spsych5403-workshop-02',
      taskType: 'MTSS Tier 2/3 CBM data decision',
      title: 'Audit Intervention Fidelity and CBM Trend Before Escalating Tiers',
      prompt:
        'Evaluate eight weeks of Tier 2 oral reading fluency progress-monitoring data and implementation logs to recommend whether to repair Tier 2 fidelity, intensify instruction, or initiate an IDEA referral.',
      stimulus:
        'Nadia (Grade 3) completed 8 weeks of Tier 2 oral reading fluency support. Baseline CBM was 42 words read correctly per minute (WRCM) against a 70 WRCM benchmark; probes now average 48 WRCM (slope 0.75 vs. 1.8 aimline). Error analysis shows 96% accuracy on regular CVC and digraph words but frequent stalls on multisyllabic vowel teams. Logs show she missed 9 of 32 sessions for speech pullout and group size grew from 4 to 9.',
      estimatedMinutes: 15,
      taskParts: [
        'Interpret Nadia\'s CBM level, slope, and error pattern alongside the treatment-integrity data to explain why her response appears flat.',
        'Design an immediate intervention adjustment targeting both skill alignment (multisyllabic vowel teams) and delivery fidelity (dosage and group size).',
        'Establish explicit data-based decision rules, monitoring cadence, and IDEA Child Find boundaries so MTSS never delays a parent-requested evaluation.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Weigh the 0.75 vs. 1.8 WRCM/week slope gap against 28% missed dosage (9 of 32 sessions), doubled group size, and skill-specific stalls on multisyllabic vowel teams.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Use MTSS data-based individualization (DBI), treatment-integrity verification prior to nonresponse conclusions, and diagnostic CBM error analysis.',
        },
        {
          label: 'Action plan',
          guidance:
            'Eliminate the speech scheduling conflict, cap the group at 3 to 5 students, shift instruction to explicit multisyllabic vowel-team decoding, and track weekly CBM accuracy and rate.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Set a 4-to-6-week review window with pre-stated decision rules, communicate weekly graphs to parents, and honor immediate IDEA evaluation rights if a disability is suspected or requested.',
        },
      ],
      successCriteria: [
        'Identifies compromised implementation fidelity (missed sessions and 9-student group size) as an alternative explanation for slow CBM slope.',
        'Connects Nadia\'s 96% CVC accuracy and vowel-team stalls to a targeted instructional skill mismatch rather than generic repeated reading.',
        'Specifies concrete structural fixes (schedule deconfliction, smaller group size, explicit multisyllabic phonics) with fidelity checks.',
        'Defines objective progress-monitoring decision rules while noting that MTSS cannot be used to delay or deny an IDEA evaluation.',
      ],
      commonPitfalls: [
        'Labeling Nadia a Tier 2 nonresponder and referring directly for SLD evaluation without verifying treatment integrity.',
        'Recommending faster timed fluency drills when error analysis reveals an underlying multisyllabic vowel-team decoding gap.',
        'Leaving the speech pullout conflict unresolved, guaranteeing continued 25-to-30 percent dosage loss.',
        'Claiming the school must wait an entire semester of MTSS even if parents submit a written IDEA evaluation request.',
      ],
      sampleOutline: [
        'Data & fidelity audit: Flat slope (0.75 vs. 1.8 WRCM/week) cannot be attributed solely to learner deficit because 28% of sessions were missed and group size rose to 9.',
        'Targeted skill match: Replace generic fluency reads with explicit instruction in vowel-team and multisyllabic word-attack routines matched to her error profile.',
        'Delivery repair: Deconflict speech scheduling, restore a 4-student group, and conduct biweekly brief fidelity observations.',
        'Decision rule & legal guardrail: Re-evaluate weekly CBM trend after 4 to 6 high-fidelity weeks; promptly honor IDEA referral triggers without using RTI to stall evaluation.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
        'https://www.nasponline.org/x55315.xml',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'spsych5403-workshop-03',
      taskType: 'FBA/BIP and trauma-informed mental health design',
      title: 'Build a Function-Based Support Plan for Task-Avoidant Outbursts',
      prompt:
        'Synthesize ABC behavioral observations, academic screening, and social-emotional risk data to hypothesize behavioral function and design an integrated BIP and Tier 2/3 mental health support plan.',
      stimulus:
        'Devon (Grade 7) accrued 11 referrals in 6 weeks for ripping worksheets and yelling during math seatwork, always ending in hallway removal. Across 14 ABC observations, zero incidents occurred in science labs or group talks, while 12 of 14 followed timed multistep fractions drills. A screener flags sleep loss and racing thoughts after a family housing eviction, and math screening places Devon two grade levels behind in rational numbers.',
      estimatedMinutes: 15,
      taskParts: [
        'Formulate an observable behavior definition and competing-pathway hypothesis linking antecedents, setting events, skill deficits, and maintaining consequences.',
        'Design a function-matched Behavior Intervention Plan specifying antecedent modifications, a functionally equivalent replacement behavior (FERB), reinforcement, and non-reinforcing de-escalation.',
        'Integrate trauma-informed school mental health and family-resource coordination to address Devon\'s acute stress and housing instability.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Link timed fractions drills (antecedent), two-year skill gap plus eviction-related sleep loss (setting events), and hallway removal (negative reinforcement via task escape).',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply Functional Behavioral Assessment (ABC competing-behavior pathway), function-based BIP engineering, and trauma-informed tiered mental health supports.',
        },
        {
          label: 'Action plan',
          guidance:
            'Pair chunked scaffolded math tasks and prerequisite remediation with a taught help/break pass (FERB), immediate task-completion reinforcement, and check-in counseling.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Obtain parental consent for counseling and FBA, connect the family to the McKinney-Vento liaison, and track daily referral frequency and replacement-skill usage.',
        },
      ],
      successCriteria: [
        'Correctly identifies escape/avoidance from aversive, frustration-level math tasks as the primary maintaining function reinforced by hallway removal.',
        'Accounts for both academic skill deficits (two grades behind in rational numbers) and contextual setting events (housing eviction and sleep disruption).',
        'Selects a low-effort, functionally equivalent replacement behavior (such as a discreet help or brief reset card) that serves the same escape/support function appropriately.',
        'Eliminates punitive exclusion that inadvertently rewards escape and connects the student to trauma-informed counseling plus McKinney-Vento supports.',
      ],
      commonPitfalls: [
        'Assuming Devon\'s outbursts are attention-seeking or willful defiance despite zero incidents during social labs and group discussions.',
        'Maintaining hallway removal or in-school suspension as a consequence, which strengthens escape-maintained behavior.',
        'Teaching a replacement behavior without adjusting the frustration-level timed fractions worksheets or remediating rational-number gaps.',
        'Overlooking homelessness protections (McKinney-Vento) and acute trauma symptoms flagged by the student screener.',
      ],
      sampleOutline: [
        'Functional hypothesis: When presented with timed multistep fractions work under sleep/eviction stress, Devon rips papers and yells to escape aversive academic failure via hallway removal.',
        'Antecedent & skill supports: Remove timed pressure, chunk problems with worked examples, and enroll Devon in Tier 2 rational-number intervention.',
        'FERB & consequence shift: Teach a discreet pass to request teacher check-in or a 2-minute calm reset before returning to one supported problem; stop exclusionary removal.',
        'Mental health & wraparound: Obtain guardian consent for brief CBT/coping check-ins, coordinate with the school McKinney-Vento liaison, and graph weekly engagement and FERB rates.',
      ],
      references: [
        'https://www.nasponline.org/standards-and-certification/nasp-2020-professional-standards-adopted/nasp-2020-domains-of-practice',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5403.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'spsych5403-workshop-04',
      taskType: 'Conjoint behavioral consultation and wraparound coordination',
      title: 'Align Teacher and Caregiver Priorities Through Conjoint Consultation',
      prompt:
        'Structure a culturally responsive conjoint behavioral consultation (CBC) process that resolves conflicting adult explanations, removes communication barriers, and protects FERPA consent rules during outside medical coordination.',
      stimulus:
        'Amina (Grade 1) cries at drop-off and refuses afternoon transitions, missing 25 minutes of instruction daily. Her teacher views this as defiance and wants a point-loss chart. Amina\'s grandmother, a night-shift worker who speaks Somali at home, reports poor sleep and separation worry after a recent hospitalization. Prior English-only daytime calls went unanswered. Amina\'s pediatrician requested school rating scales, but no release is signed.',
      estimatedMinutes: 15,
      taskParts: [
        'Use the four stages of Conjoint Behavioral Consultation to reframe blame into a shared, observable goal across home and school.',
        'Specify concrete linguistic, scheduling, and cultural access adaptations that build an equitable partnership with Amina\'s grandmother.',
        'Outline the legal and ethical steps required before sharing school behavioral observations or rating scales with the pediatrician.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Reconcile the teacher\'s defiance lens with the grandmother\'s separation-anxiety and post-hospitalization context, noting English-only daytime outreach caused the communication gap.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply Conjoint Behavioral Consultation (needs identification, needs analysis, plan implementation, plan evaluation), trauma/separation awareness, and FERPA release rules.',
        },
        {
          label: 'Action plan',
          guidance:
            'Co-create a warm morning greeting routine, visual transition cue, and predictable caregiver-reassurance check-in instead of a punitive point-loss chart.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Use a qualified Somali interpreter at night-shift-friendly times, obtain written guardian consent (FERPA ROI) prior to pediatrician contact, and review daily transition minutes.',
        },
      ],
      successCriteria: [
        'Moves from competing adult blame to a nonjudgmental, observable shared target (such as independent entry and afternoon transition latency).',
        'Replaces punitive point-loss plans with supportive, separation-informed antecedent routines co-designed by teacher and grandmother.',
        'Addresses both language access (qualified Somali interpreter and translated materials) and work-schedule flexibility for the night-shift caregiver.',
        'Explicitly prohibits sending rating scales or discussing student records with the pediatrician until signed written parental/guardian consent is secured.',
      ],
      commonPitfalls: [
        'Interpreting unanswered daytime English phone calls as low family engagement or caregiver apathy.',
        'Taking the teacher\'s side to implement a response-cost chart that escalates anxiety-driven crying at drop-off.',
        'Faxing behavioral rating scales directly to the pediatrician as a courtesy without a signed FERPA release specifying scope and recipient.',
        'Running consultation as an expert directive rather than a collaborative, reciprocal partnership with shared data tracking.',
      ],
      sampleOutline: [
        'Collaborative reframing: Convene teacher and grandmother with a Somali interpreter at an accessible hour to redefine the concern around separation distress and predictable transitions.',
        'Home-school plan: Pair a brief warm handoff ritual, visual schedule, and comfort photo card with brief positive home-school notes celebrating smooth transitions.',
        'FERPA & medical coordination: Explain confidentiality options in Somali and obtain a signed, time-limited Release of Information before sharing any rating scales with the pediatrician.',
        'Outcome monitoring: Track daily minutes of transition distress and instructional participation for three weeks, adjusting supports jointly based on shared logs.',
      ],
      references: [
        'https://www.nasponline.org/x55315.xml',
        'https://studentprivacy.ed.gov/ferpa',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'spsych5403-workshop-05',
      taskType: 'PREPaRE crisis triage and postvention planning',
      title: 'Sequence Psychological Triage and Memorial Policy After a Student Death',
      prompt:
        'Apply the NASP PREPaRE crisis response model and suicide postvention guidelines to coordinate immediate Monday morning stabilization, risk triage, staff messaging, and contagion prevention.',
      stimulus:
        'Sunday evening, a sophomore died by suicide off campus; two teammates saw social media posts before police notice. By Monday at 7:30 AM, 18 students are crying in the main hallway, teachers want to read an unplanned intercom message, and student council requests a permanent locker shrine and all-school assembly. Crisis logs flag 6 students with prior safety plans, including a ninth-grade sibling and a close friend with recent passive ideation.',
      estimatedMinutes: 15,
      taskParts: [
        'Prioritize immediate Monday morning safety and psychological triage using PREPaRE exposure-and-vulnerability risk stratification.',
        'Guide administration and teachers on safe, accurate suicide postvention communication, explaining why an intercom announcement, assembly, and locker shrine heighten contagion risk.',
        'Establish a multi-day tiered recovery plan covering caregiver notification, individual safety screening for high-risk peers, and staff self-care debriefing.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Stratify risk across physical/emotional proximity and preexisting vulnerability: ninth-grade sibling, close friend with ideation, 6 students with safety plans, two teammates, and 18 distressed peers.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply NASP PREPaRE psychological triage, psychological first aid, and safe suicide postvention principles designed to prevent imitation and contagion.',
        },
        {
          label: 'Action plan',
          guidance:
            'Hold a brief faculty briefing with a verified written script for classroom delivery, set up quiet counseling drop-in rooms, and immediately check in with prioritized high-risk students.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Protect family privacy regarding death details, decline permanent shrines/assemblies in favor of living prevention memorials, notify parents of screened youth, and schedule crisis-team debriefing.',
        },
      ],
      successCriteria: [
        'Stratifies psychological triage by both crisis exposure (sibling, teammates, close friends) and preexisting vulnerability (6 students with prior safety plans).',
        'Advises against intercom announcements, large assemblies, and permanent locker shrines because they romanticize suicide and elevate contagion risk.',
        'Replaces unplanned teacher remarks with a verified, concise written script delivered in small classrooms with clear referral pathways.',
        'Plans ongoing postvention follow-up, parent notification for at-risk students, safe memorial alternatives, and crisis-responder debriefing.',
      ],
      commonPitfalls: [
        'Approving an all-school assembly or permanent hallway shrine to honor student council grief requests without considering suicide contagion.',
        'Allowing teachers to share unverified details or method specifics over the intercom before family confirmation and factual scripting.',
        'Providing blanket group debriefing to all students simultaneously instead of targeted psychological triage and opt-in quiet support.',
        'Focusing solely on visibly crying students in the hallway while missing quiet high-risk students who have prior safety plans.',
      ],
      sampleOutline: [
        'Immediate stabilization: Verify facts with administration/family, brief staff before first period with a factual classroom script, and maintain predictable school routines.',
        'Risk-based triage: Proactively locate and conduct individual risk check-ins with the ninth-grade sibling, close friend with ideation, teammates, and the 6 students with existing safety plans.',
        'Contagion-safe postvention: Redirect locker-shrine and assembly requests toward safe alternatives (such as private grief rooms, cards for the family, or a mental health awareness initiative).',
        'Continuity & monitoring: Send caregivers factual resource letters, coordinate warm referrals to community clinicians, track high-risk students across weeks, and debrief the crisis team.',
      ],
      references: [
        'https://www.nasponline.org/standards-and-certification/nasp-2020-professional-standards-adopted/nasp-2020-domains-of-practice',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5403.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'spsych5403-workshop-06',
      taskType: 'Legal-ethical decision analysis under NASP, IDEA, and FERPA',
      title: 'Resolve an IEE Request, Protocol Release Demand, and Section 504 Dispute',
      prompt:
        'Apply IDEA 34 CFR 300.502, FERPA, NASP Principles for Professional Ethics, and Section 504 to navigate a parent IEE demand, a copyrighted test-protocol request, and an unauthorized third-party data-sharing directive.',
      stimulus:
        'After an IDEA team found Liam (Grade 5, outside ADHD diagnosis) ineligible because he earns B-minus grades with informal reminders, his parents submit a written disagreement requesting a district-funded IEE and photocopies of copyrighted cognitive protocols. Meanwhile, the principal directs you to email raw behavior protocols to a private tutor hired by the family, and parents ask whether testing accommodations exist without an IEP.',
      estimatedMinutes: 15,
      taskParts: [
        'Detail the district\'s two lawful procedural options and timeliness obligations upon receiving a written parent request for a publicly funded IEE under 34 CFR 300.502.',
        'Reconcile parent inspection rights under FERPA with NASP test-security and copyright ethics regarding raw cognitive protocols, and address the principal\'s email directive.',
        'Explain why an external medical ADHD diagnosis does not guarantee IDEA eligibility yet warrants considering a Section 504 evaluation for substantial impairment and accommodations.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Separate four distinct issues in the prompt: written IEE disagreement, copyrighted protocol copying, principal\'s private-tutor email order, and ADHD accommodation access without an IEP.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Cite IDEA 34 CFR 300.502 (IEE without unnecessary delay), FERPA parent inspection and third-party consent rules, NASP ethical test security, and Section 504 eligibility.',
        },
        {
          label: 'Action plan',
          guidance:
            'Notify special education leadership to either fund the IEE or file for due process, offer supervised protocol inspection with explanation, decline emailing the tutor without written consent, and initiate a 504 referral.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Document prior written notice (PWN), provide IEE agency criteria neutrally, respectfully explain FERPA/NASP limits to the principal, and ensure the team considers any future IEE results.',
        },
      ],
      successCriteria: [
        'Accurately states that under 34 CFR 300.502 the district must, without unnecessary delay, either fund the IEE or file a due process complaint to defend its evaluation.',
        'Distinguishes FERPA\'s right to inspect and review educational records from distributing copyrighted test protocols, offering supervised review or release to a qualified professional.',
        'Refuses to email raw protocols to the private tutor without explicit written parental consent because a private tutor is not a school official with legitimate educational interest.',
        'Explains that IDEA requires adverse educational impact needing specialized instruction, while Section 504 can provide testing accommodations if ADHD substantially limits a major life activity.',
      ],
      commonPitfalls: [
        'Telling parents they must prove the district\'s evaluation was flawed or give detailed reasons before the district will respond to an IEE request.',
        'Obeying the principal\'s directive to email raw test protocols to a private tutor without written parental authorization under FERPA.',
        'Photocopying and mailing copyrighted cognitive test items directly without checking copyright, state law, and NASP test-security safeguards.',
        'Assuming that ineligibility under IDEA automatically disqualifies Liam from Section 504 accommodations or means the external ADHD diagnosis is irrelevant.',
      ],
      sampleOutline: [
        'IEE duty (34 CFR 300.502): District must promptly fund the IEE (providing criteria and evaluator list) or file for a due process hearing; it cannot impose extra conditions or unnecessary delay.',
        'Test security & FERPA inspection: Honor parents\' right to inspect and receive an explanation of test protocols in a supervised meeting (or transfer raw data to a qualified psychologist) without freely copying copyrighted items.',
        'Third-party privacy: Politely decline the principal\'s request to email raw protocols to a private tutor unless parents sign a specific FERPA written release.',
        'Section 504 pathway: Clarify IDEA vs. Section 504 criteria and refer Liam to the 504 team to evaluate whether ADHD substantially limits learning/concentrating and warrants formal accommodations.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b/e/300.502',
        'https://www.nasponline.org/standards-and-certification/professional-ethics',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

const school_counselor_5422 = {
  workshopLabel: 'Applied counseling case workshops',
  workshopPracticeNote:
    'Independent applied case-analysis workshops designed to build ASCA National Model program design, crisis triage, equity data disaggregation, and ethical reasoning for School Counselor (5422) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or clinical determinations.',
  workshops: [
    {
      id: 'sc5422-workshop-01',
      taskType: 'ASCA ethical confidentiality and duty-to-warn analysis',
      title: 'Balance Student Privacy, Mandated Reporting, and Parent Notification',
      prompt:
        'Apply the ASCA Ethical Standards for School Counselors, mandated-reporting duties, and FERPA need-to-know boundaries when a student discloses physical abuse and nonsuicidal self-injury while an administrator demands session details.',
      stimulus:
        'Jordan (age 15, Grade 10) arrives shaken and asks for total secrecy before sharing that an older cousin at home struck them twice this week, bruising their shoulder, and that they cut their forearm last night to cope without suicidal intent. Five minutes later, an assistant principal texts asking why Jordan missed chemistry and requesting a summary of the disclosure. Intake forms previously explained confidentiality limits.',
      estimatedMinutes: 15,
      taskParts: [
        'Identify which elements of Jordan\'s disclosure legally and ethically require breaching confidentiality (suspected abuse and self-harm safety) and explain how to tell Jordan transparently.',
        'Sequence immediate safety steps, including mandated child-protective reporting, nonsuicidal self-injury risk screening, and caregiver notification safeguards when household abuse is alleged.',
        'Explain how to respond to the assistant principal\'s text message in alignment with ASCA confidentiality standards and FERPA legitimate educational interest.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Separate three distinct facts: physical injury by a household member (mandated report), forearm cutting without stated suicidal intent (still requires safety check), and an administrator\'s attendance inquiry.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Use ASCA Ethical Standards (A.2 confidentiality, A.9 serious and foreseeable harm, A.11 abuse reporting), state mandated-reporter statutes, and FERPA need-to-know limits.',
        },
        {
          label: 'Action plan',
          guidance:
            'Decline promising absolute secrecy, assess immediate medical and suicide risk, file a mandated CPS report promptly, involve Jordan in safety planning, and verify attendance only to the administrator.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Consult CPS/policy before contacting caregivers if doing so increases abuse risk, document objective facts in protected notes, and arrange ongoing check-ins and outside clinical referrals.',
        },
      ],
      successCriteria: [
        'Refuses to promise unconditional secrecy and compassionately reminds Jordan of the foreseeable-harm and abuse-reporting limits reviewed at intake.',
        'Immediately initiates a mandated child-abuse report without conducting an independent forensic investigation of the cousin.',
        'Assesses both medical care for the forearm cut and potential suicide risk even though Jordan denies suicidal intent, coordinating safe caregiver notification per CPS guidance.',
        'Limits communication with the assistant principal to attendance verification unless a specific school-safety need-to-know applies, avoiding casual text summaries.',
      ],
      commonPitfalls: [
        'Promising Jordan complete confidentiality to preserve rapport, then feeling trapped when mandated reporting is triggered.',
        'Calling the household immediately to confront the family before checking whether notifying caregivers could endanger Jordan or compromise CPS.',
        'Texting confidential abuse and self-harm details to the assistant principal over an unencrypted message because the administrator outranks the counselor.',
        'Dismissing self-harm screening simply because Jordan stated they did not intend to die.',
      ],
      sampleOutline: [
        'Transparent boundaries: Acknowledge Jordan\'s courage, avoid promising secrecy, and clearly state the legal duty to keep them safe around physical abuse and self-injury.',
        'Safety & reporting sequence: Check whether the bruise or forearm cut needs nurse attention, screen for covert suicidal ideation, and immediately file the mandated CPS report per statute.',
        'Caregiver notification safeguard: Follow CPS and district protocol on notifying non-offending guardians so reporting does not escalate home danger.',
        'FERPA & staff boundary: Reply briefly (not with sensitive details via text) confirming Jordan is excused in counseling, and document objective actions in secure, separate records.',
      ],
      references: [
        'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29',
        'https://studentprivacy.ed.gov/ferpa',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sc5422-workshop-02',
      taskType: 'Disaggregated equity audit and closing-the-gap plan',
      title: 'Design a Closing-the-Gap Plan From Disaggregated Ninth-Grade Failure Data',
      prompt:
        'Use ASCA National Model Manage tools—disaggregated school data, annual student outcome goals, closing-the-gap action plans, and use-of-time reallocation—to address hidden ninth-grade Algebra I inequities.',
      stimulus:
        'Schoolwide ninth-grade Algebra I pass rates sit at 82 percent, yet disaggregated data show only 54 percent of multilingual learners and 58 percent of low-income students passed, compared with 91 percent of higher-income English-proficient peers. Attendance records show 63 percent of failing students missed eight or more fall days, and counselor time logs show 44 percent of hours went to master-schedule clerical fixes and lunch duty.',
      estimatedMinutes: 15,
      taskParts: [
        'Interpret the disaggregated achievement, attendance, and counselor use-of-time data to pinpoint the core equity gap obscured by the 82 percent aggregate average.',
        'Draft a measurable ASCA Annual Student Outcome Goal and aligned Closing-the-Gap Action Plan targeting both Algebra I credit attainment and chronic absenteeism.',
        'Formulate a data-based administrative conference proposal to shift non-counseling clerical and lunch-duty hours toward the ASCA 80 percent direct/indirect student service benchmark.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Highlight the 33-to-37 percentage point pass-rate gaps for multilingual and low-income ninth graders, the 63% overlap with fall absences, and the 44% non-counseling time drain.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply the ASCA National Model Manage component: School Data Summary, Annual Student Outcome Goal, Closing-the-Gap Action Plan, Use-of-Time Calculator, and Annual Administrative Conference.',
        },
        {
          label: 'Action plan',
          guidance:
            'Combine Tier 1 study/goal-setting lessons, Tier 2 attendance/credit-recovery small groups with bilingual family outreach, and math-department collaboration around tutoring access.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Track participation, Mindsets & Behaviors pre/post gains, and semester Algebra I pass and attendance outcomes while protecting individual student privacy in public equity reports.',
        },
      ],
      successCriteria: [
        'Explains how the 82 percent building aggregate masks a 33-to-37 point equity gap affecting multilingual and economically disadvantaged ninth graders.',
        'Links attendance patterns (63% missing eight or more days) to a concrete, measurable outcome goal with baseline, target, subgroup, and timeline.',
        'Selects ASCA Mindsets & Behaviors standards paired with direct (classroom/group/individual) and indirect (family/teacher collaboration) interventions.',
        'Uses the 44% non-counseling time audit constructively during an Annual Administrative Conference to advocate for the ASCA 80/20 direct-indirect service allocation.',
      ],
      commonPitfalls: [
        'Accepting the 82 percent schoolwide pass rate as acceptable and planning only generic schoolwide motivation assemblies.',
        'Writing a Closing-the-Gap goal focused only on how many meetings counselors hold (participation data) rather than student pass rates and attendance (outcome data).',
        'Confronting the principal about lunch duty without connecting reclaimed counselor hours directly to ninth-grade credit recovery and graduation outcomes.',
        'Blaming student motivation while ignoring language access, transportation/attendance barriers, and classroom instructional supports.',
      ],
      sampleOutline: [
        'Equity diagnosis: Aggregate 82% pass rate hides 33-to-37 point gaps for multilingual (54%) and low-income (58%) freshmen, heavily compounded by chronic fall absences (63%).',
        'Outcome goal & action plan: Target raising multilingual and low-income Algebra I pass rates by 15 percentage points and cutting absences below 5 days via targeted check-ins, tutoring links, and bilingual family nights.',
        'Use-of-time advocacy: Present the 44% clerical/lunch-duty log at the Annual Administrative Conference to reassign fair-share non-counseling duties and reach the 80% student-service standard.',
        'Assessment & reporting: Collect pre/post Mindsets & Behaviors data alongside quarter grades and attendance, sharing disaggregated progress with the advisory council.',
      ],
      references: [
        'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sc5422-workshop-03',
      taskType: 'Tier 1 classroom lesson and Tier 2 small-group design',
      title: 'Pair Universal Coping Lessons With Targeted Attendance Small-Group Support',
      prompt:
        'Design a tiered Deliver plan combining Tier 1 school counseling classroom instruction with ethically screened Tier 2 small-group counseling while resolving teacher scheduling and parent-consent requests.',
      stimulus:
        'Fall screening of 420 sixth graders shows 68 percent report moderate test worry and weak planner habits during the middle-school transition, while 14 students already have 5 to 7 unexcused absences and frequent morning nurse visits. Teachers ask you to pull all 14 students into one large coping group during core math class without parent permission slips, arguing that counseling is standard general-education programming.',
      estimatedMinutes: 15,
      taskParts: [
        'Justify why the 68 percent universal transition need belongs in Tier 1 classroom lessons while the 14 chronically absent students require Tier 2 small-group intervention.',
        'Correct the teachers\' group-design request regarding optimal group size, screening/composition, rotating schedules to protect core math instruction, and written parental consent.',
        'Outline group confidentiality limits, developmental norms for sixth graders, and pre/post metrics linking sessions to morning attendance and nurse-visit reductions.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Distinguish the broad Tier 1 signal (68% of 420 sixth graders with test worry/organization needs) from the high-need Tier 2 cluster (14 students with 5 to 7 absences and somatic nurse visits).',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply ASCA Deliver tiered services (classroom instruction vs. small-group counseling), ASCA Ethical Standard A.7 (group work), and MTSS alignment.',
        },
        {
          label: 'Action plan',
          guidance:
            'Deliver 3 universal sixth-grade executive-functioning and coping lessons, split the 14 students after individual screening into two 6-to-7-student groups on a rotating non-math schedule, and secure caregiver consent.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Explain that group confidentiality is encouraged but cannot be guaranteed among peers, coordinate with the school nurse on somatic triggers, and monitor weekly attendance.',
        },
      ],
      successCriteria: [
        'Matches Tier 1 classroom instruction to the 68 percent universal transition need and Tier 2 small-group counseling to the 14 high-absence students.',
        'Splits the 14 students into smaller developmentally appropriate groups (typically 5 to 8 middle schoolers) following brief individual screening rather than forming one 14-student group.',
        'Protects core math access via rotating or non-core scheduling and secures active written parental/guardian permission before small-group participation.',
        'Addresses group-confidentiality limits explicitly and links nurse collaboration plus attendance logs to pre/post evaluation.',
      ],
      commonPitfalls: [
        'Placing all 14 sixth graders into a single group, which weakens psychological safety, peer participation, and counseling effectiveness.',
        'Pulling struggling students repeatedly from the same core math block, inadvertently compounding academic anxiety and avoidance.',
        'Skipping written parent/guardian consent for small-group counseling by treating targeted group sessions as identical to universal classroom lessons.',
        'Promising sixth graders absolute peer confidentiality inside a group rather than teaching norms while acknowledging limits.',
      ],
      sampleOutline: [
        'Tiered match: Serve the 68% transition need through Tier 1 classroom lessons on planner routines and test-anxiety strategies; reserve Tier 2 groups for the 14 students with absences and nurse visits.',
        'Ethical group structure: Screen each of the 14 students individually, obtain written parent/guardian permission, form two balanced groups of 6 to 7, and rotate meeting times outside core math.',
        'Group norms & collaboration: Teach realistic peer-confidentiality boundaries, align coping plans with the school nurse, and involve caregivers in morning routines.',
        'Progress tracking: Measure Mindsets & Behaviors pre/post coping mastery alongside six-week reductions in unexcused absences and morning nurse visits.',
      ],
      references: [
        'https://schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-School-Counselor-and-School-Counseling-Program',
        'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sc5422-workshop-04',
      taskType: 'Suicide-risk triage, parent notification, and referral protocol',
      title: 'Execute Imminent Suicide-Risk Triage and Warm Handoff After a Peer Report',
      prompt:
        'Sequence immediate suicide-risk screening, continuous supervision, parent notification, crisis referral, and school re-entry planning for an eleventh grader with active ideation and access to lethal means.',
      stimulus:
        'At 1:45 PM, two juniors show you a screenshot where friend Maya wrote "I cannot do this anymore and everyone is better off without me" after a breakup and cyberbullying. Privately, Maya admits wishing she would not wake up, knows where her stepfather keeps sleeping pills, and begs you not to call her mother because she gets angry under stress. Bus dismissal is in 45 minutes, and Maya has a Section 504 plan for anxiety.',
      estimatedMinutes: 15,
      taskParts: [
        'Identify Maya\'s acute suicide risk indicators (ideation, hopelessness, access to sleeping pills, recent stressors, and impending 45-minute dismissal) and specify non-negotiable immediate supervision rules.',
        'Outline how to conduct a structured risk screening, notify Maya\'s mother ethically despite Maya\'s plea, and arrange a warm handoff to emergency or clinical crisis services.',
        'Plan the post-crisis re-entry meeting, cyberbullying safety follow-up, and review of Maya\'s existing Section 504 anxiety accommodations upon her return.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Flag high-imminence risk markers: explicit hopelessness message, passive-to-active ideation, identified access to sleeping pills, acute cyberbullying trigger, and bus dismissal in 45 minutes.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply ASCA Ethical Standard A.9 (serious and foreseeable harm), structured school suicide-risk protocol, lethal-means counseling for guardians, and Section 504 review duties.',
        },
        {
          label: 'Action plan',
          guidance:
            'Keep Maya under continuous adult supervision (never send her to the bus alone), notify her mother directly with calm collaboration and lethal-means safety steps, and facilitate same-day crisis evaluation.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Thank and check in with the reporting peers without disclosing Maya\'s session details, document notifications objectively, and hold a re-entry and 504-review meeting before return.',
        },
      ],
      successCriteria: [
        'Maintains continuous, unbroken adult supervision from 1:45 PM until Maya is safely transferred to her guardian or emergency crisis responders—never releasing her to the school bus.',
        'Notifies Maya\'s mother despite her request for secrecy under ASCA A.9 while involving Maya in how the call is framed and advising safe locking of the sleeping pills.',
        'Completes district suicide-risk documentation, initiates a warm referral to qualified crisis/clinical evaluators, and avoids relying on a discredited no-suicide contract.',
        'Plans structured school re-entry, cyberbullying administrative intervention, peer-reporter check-in, and a Section 504 team review of Maya\'s anxiety supports.',
      ],
      commonPitfalls: [
        'Honoring Maya\'s plea not to call her mother to protect counseling rapport when imminent lethal-means risk is present.',
        'Having Maya sign a written "no-harm contract" and allowing her to ride the 2:30 PM bus home alone.',
        'Attempting to provide long-term clinical suicide therapy inside the school counseling office instead of facilitating immediate outside clinical crisis evaluation.',
        'Revealing Maya\'s risk-assessment details back to the two friends who reported the screenshot.',
      ],
      sampleOutline: [
        'Immediate safety & supervision: Keep Maya with a trusted adult at all times; suspend routine bus dismissal and run the district\'s structured suicide-risk screener.',
        'Guardian notification & means safety: Transparently inform Maya that safety requires calling her mother; invite Maya\'s input, brief her mother calmly on immediate crisis evaluation, and emphasize securing sleeping pills.',
        'Warm referral & documentation: Coordinate same-day crisis assessment (or emergency transport if guardian cannot safely assume care) and log objective risk actions per district policy.',
        'Re-entry & 504 alignment: Check in confidentially with reporting peers, address cyberbullying through school policy, and convene a re-entry and Section 504 review meeting prior to Maya\'s return.',
      ],
      references: [
        'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29',
        'https://www.ed.gov/laws-and-policy/individuals-disabilities/section-504',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sc5422-workshop-05',
      taskType: 'ASCA Assess program evaluation and results reporting',
      title: 'Separate Participation, Mindsets and Behaviors, and Outcome Evidence',
      prompt:
        'Evaluate mixed small-group results data using the ASCA Assess framework, resist an unsupported building-wide causal claim, and design an ethical, improvement-focused results report.',
      stimulus:
        'After a six-week eighth-grade conflict group for 10 students with fighting referrals, surveys show 9 of 10 enjoyed the group and 8 of 10 named three de-escalation steps on a vignette. Discipline logs show referrals fell for 4 students, stayed flat for 4, and rose for 2 who missed half the sessions from bus tardiness. The principal asks for a one-page brief proving your group caused the school\'s 12 percent overall referral drop.',
      estimatedMinutes: 15,
      taskParts: [
        'Classify every metric in the scenario into ASCA participation, Mindsets & Behaviors (learning/perception), and outcome data, explaining why enjoyment alone cannot verify behavior transfer.',
        'Explain methodologically why the small group cannot be credited as the cause of the building\'s 12 percent overall referral decline and how to respond transparently to the principal.',
        'Propose concrete program revisions informed by the flat-response subgroup (4 students) and the bus-tardiness dosage barrier (2 students).',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Distinguish participation (10 enrolled, 2 missed half the sessions), Mindsets & Behaviors (8 of 10 named steps; 9 of 10 liked it), and outcome results (4 improved, 4 flat, 2 increased).',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply ASCA National Model Assess standards (Small-Group Results Report), evidence triangulation, implementation-dosage analysis, and honest limits on causal inference.',
        },
        {
          label: 'Action plan',
          guidance:
            'Present an accurate one-page results brief celebrating skill acquisition and 40% referral reduction while rescheduling morning sessions around late buses and adding classroom generalization practice.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Report only de-identified aggregate and subgroup trends, avoid fabricating causality to please leadership, and connect the 6 non-improving students to Tier 3 check-ins or FBA collaboration.',
        },
      ],
      successCriteria: [
        'Accurately categorizes enrollment/attendance (participation), vignette knowledge and satisfaction (Mindsets & Behaviors), and discipline referrals (outcome data).',
        'Politely declines the principal\'s request to claim the 10-student group caused the school\'s 12 percent building-wide referral drop, citing scale, confounders, and lack of a comparison design.',
        'Diagnoses both the knowledge-to-behavior transfer gap (8 knew steps yet only 4 dropped referrals) and the bus-tardiness attendance barrier affecting 2 students.',
        'Recommends targeted program adaptations (rescheduling past morning arrival, in-vivo role-play/teacher prompting, and Tier 3 escalation) while preserving student privacy.',
      ],
      commonPitfalls: [
        'Agreeing to present the 12 percent schoolwide referral drop as proof of small-group efficacy to secure administrative goodwill.',
        'Highlighting the 90 percent enjoyment rating as primary evidence of intervention effectiveness while downplaying unchanged or rising referrals.',
        'Scrapping the entire conflict-resolution curriculum without first examining dosage loss from bus tardiness and classroom generalization gaps.',
        'Including individual students\' names or identifiable discipline counts in a general faculty or stakeholder results summary.',
      ],
      sampleOutline: [
        'Data taxonomy: Separate participation (10 students; 2 with 50% attendance), Mindsets & Behaviors (8/10 step recall; 9/10 enjoyment), and outcome data (4 reduced referrals, 4 flat, 2 increased).',
        'Causal integrity: Inform the principal transparently that a 10-student group cannot establish causation for a schoolwide 12% drop due to scale and concurrent building factors.',
        'Root-cause refinement: Move group timing away from late-bus arrivals, shift from verbal vignettes to active role-play and teacher cueing, and refer non-improving students for individualized Tier 3 support.',
        'Results reporting: Deliver a concise, de-identified ASCA Small-Group Results Report pairing honest outcomes with next-cycle improvement steps.',
      ],
      references: [
        'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw1272f63e/pdfs/5422.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'sc5422-workshop-06',
      taskType: 'Postsecondary readiness advising and systemic barrier advocacy',
      title: 'Remove Gatekeeping Barriers in Dual-Enrollment and Postsecondary Advising',
      prompt:
        'Combine student-centered postsecondary/career advising for a junior with an IEP and systemic equity advocacy to dismantle exclusionary dual-enrollment and financial-aid access barriers.',
      stimulus:
        'An annual audit shows 41 percent of juniors qualify by GPA for dual-enrollment or AP classes, yet only 16 percent of first-generation students and 12 percent of students with IEPs enroll, amid an unwritten teacher-signature rule and an English-only 6:00 PM FAFSA night. Junior Carlos (IEP for written expression, strong in automotive diagnostics) says nobody explained apprenticeships, technical colleges, or college accommodation rules.',
      estimatedMinutes: 15,
      taskParts: [
        'Outline an individualized postsecondary and career advising plan for Carlos that leverages his automotive diagnostics strengths, IEP transition planning, and disability-support differences after high school.',
        'Identify the systemic institutional barriers (unwritten teacher-signature policy, English-only evening FAFSA sessions, four-year-only fairs) suppressing enrollment for first-generation and IEP students.',
        'Construct a collaborative advocacy strategy with administrators, special educators, and families to replace subjective gatekeeping with transparent, equitable postsecondary pathways.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Pair system-level gaps (41% GPA-eligible vs. 16% first-generation and 12% IEP enrollment) with Carlos\'s lived experience of narrow four-year advising and unaddressed IEP transition needs.',
        },
        {
          label: 'Professional framework',
          guidance:
            'Apply ASCA Professional Standards (systemic change and advocacy), IDEA secondary transition planning, ADA/Section 504 postsecondary self-advocacy rules, and inclusive career development.',
        },
        {
          label: 'Action plan',
          guidance:
            'Coordinate with Carlos\'s IEP case manager on apprenticeships and technical-college certifications while proposing objective open-enrollment criteria, multilingual FAFSA labs, and multi-pathway career fairs.',
        },
        {
          label: 'Follow-up & ethics',
          guidance:
            'Clarify that IDEA IEPs do not transfer directly to colleges (students self-disclose to disability services under ADA/504), protect student autonomy, and audit next-year disaggregated enrollment.',
        },
      ],
      successCriteria: [
        'Centers Carlos\'s strengths in automotive diagnostics by exploring registered apprenticeships, industry certifications, and technical colleges alongside two- and four-year options.',
        'Explains the legal transition from IDEA (school-initiated IEP services) to postsecondary ADA/Section 504 (student self-disclosure and documentation to disability services) and links advising to his IEP transition plan.',
        'Challenges the unwritten teacher-signature policy with disaggregated data (41% eligible vs. 16% first-generation and 12% IEP) and proposes objective, transparent course-access criteria.',
        'Redesigns family financial-aid outreach with multilingual interpreters, varied schedules, and hands-on FAFSA completion labs rather than a single English-only evening lecture.',
      ],
      commonPitfalls: [
        'Steering Carlos away from rigorous dual-enrollment or technical-college pathways because of his written-expression IEP.',
        'Telling Carlos his high school IEP automatically transfers to a technical college without explaining self-disclosure and documentation requirements under ADA/Section 504.',
        'Advising Carlos individually while leaving the unwritten teacher-signature barrier and English-only FAFSA model untouched.',
        'Equating postsecondary readiness exclusively with four-year university admission rather than affirming apprenticeships and skilled career credentials.',
      ],
      sampleOutline: [
        'Individualized career & transition advising: Partner with Carlos and his IEP team to map automotive apprenticeship, technical-college, and dual-enrollment CTE routes aligned to his strengths and goals.',
        'Postsecondary disability literacy: Prepare Carlos to use his Summary of Performance and self-advocate with postsecondary disability services (ADA/504) since IDEA IEPs end at graduation.',
        'Systemic barrier removal: Present the 41% vs. 16%/12% enrollment disparity to leadership to abolish unwritten teacher signatures in favor of transparent criteria and opt-out advanced course notification.',
        'Accessible family & career ecosystems: Expand fairs to include trades/apprenticeships and host multilingual FAFSA workshops across daytime, evening, and virtual slots, tracking next-year enrollment equity.',
      ],
      references: [
        'https://sites.ed.gov/idea/',
        'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

module.exports = {
  school_psychologist_5403,
  school_counselor_5422,
};
