'use strict';

// Applied special-education case workshops for Praxis Special Education:
// Early Childhood/Early Intervention (5692) and Praxis Special Education:
// Teaching Students with Intellectual Disabilities (5322).
// Original unscored practice cases designed for IDEA legal compliance,
// authentic assessment, systematic/embedded instruction, and family collaboration.

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE = 'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or eligibility/licensure determination. AlloFlow does not score written responses.';

const special_education_early_childhood_5692 = {
  workshopLabel: 'Applied ECSE case workshops',
  workshopPracticeNote: 'Independent applied early-childhood special-education case workshops designed to build Part C/Part B transition, embedded instruction, authentic play-based assessment, Pyramid Model, and family-coaching reasoning for Special Education: Early Childhood (5692) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'ecse5692-workshop-01',
      taskType: 'Child Find & authentic play-based assessment',
      title: 'Evaluate a bilingual toddler through transdisciplinary arena assessment',
      prompt: 'Critique an English-only clinic evaluation for a bilingual toddler referred under Child Find, and design a compliant Part C authentic play-based assessment plan.',
      stimulus: 'Mateo, 22 months old, was referred to Part C after a failed communication screen. His grandmother speaks Spanish at home while his parents use Spanish and English. On a brief English-only clinic test, Mateo clung to his mother and scored 2.0 SD below the mean. Home video shows him pointing, imitating stirring pots, and using 14 total Spanish and English words. His chart notes three otitis media episodes in nine months.',
      estimatedMinutes: 15,
      taskParts: [
        'Explain why relying on the English-only clinic score violates IDEA Part C nondiscriminatory evaluation standards and misrepresents bilingual conceptual vocabulary.',
        'Design a transdisciplinary play-based arena assessment in a familiar setting that incorporates a qualified Spanish-English interpreter, caregiver coaching, and hearing follow-up.',
        'Specify the IDEA Part C 45-day referral-to-initial-IFSP timeline and the multimethod evidence needed to determine eligibility accurately.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Contrast the single English clinic score against Mateo\'s 14 combined Spanish-English words, joint-attention gestures on home video, and recurrent otitis media history.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply IDEA Part C evaluation rules (34 CFR 303.321): informed clinical opinion, native-language administration, no single procedure for eligibility, and the 45-day Child Find timeline.',
        },
        {
          label: 'Support plan',
          guidance: 'Conduct a home or familiar-space transdisciplinary arena play assessment with one lead facilitator, a trained interpreter, parent-reported routines data, and audiologic screening referral.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Obtain written parental consent in Spanish and English, document total conceptual vocabulary across both languages, and track middle-ear status before finalizing delay conclusions.',
        },
      ],
      successCriteria: [
        'Identifies both English-only testing bias and unfamiliar-setting anxiety as threats to validity in the initial clinic score.',
        'Counts conceptual vocabulary across Spanish and English combined rather than judging expressive language solely in English.',
        'Designs a transdisciplinary arena play assessment with a familiar caregiver facilitator, qualified interpreter, and audiologic follow-up for recurrent otitis media.',
        'Cites the 45-day IDEA Part C referral-to-IFSP timeline and prohibits using any single test score as the sole eligibility criterion.',
      ],
      commonPitfalls: [
        'Treating dual-language acquisition as a communication disorder or advising the family to switch exclusively to English at home.',
        'Using an untrained bilingual relative as the assessment interpreter instead of a qualified interpreter briefed on developmental items.',
        'Ignoring the three episodes of otitis media with effusion when interpreting expressive speech and listening responsiveness.',
        'Scheduling four separate discipline-specific clinic evaluations that exhaust the toddler and miss authentic play competence.',
      ],
      sampleOutline: [
        'Evidence synthesis: Mateo shows purposeful gesturing and 14 cross-linguistic words on home video, contradicting a distressed English-only clinic score while flagging recurrent middle-ear fluid.',
        'Legal and EBP basis: IDEA Part C prohibits single-measure eligibility decisions, requires native-language and culturally valid assessment, values informed clinical opinion, and sets a 45-day referral-to-IFSP timeline.',
        'Assessment plan: Run a home-based transdisciplinary play arena assessment with a qualified Spanish interpreter, caregiver-guided kitchen play, parent Routines-Based Interview, and pediatric audiology follow-up.',
        'Safeguards: Deliver prior written notice and procedural safeguards in the family\'s preferred language, record total conceptual vocabulary, and distinguish language difference or temporary hearing fluctuation from developmental delay.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/c',
        'https://www.naeyc.org/resources/position-statements/dap/principles',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ecse5692-workshop-02',
      taskType: 'Part C IFSP natural environments & routines',
      title: 'Shift clinic therapy proposals into routines-based Part C IFSP outcomes',
      prompt: 'Evaluate a clinic pull-out therapy recommendation for an eligible toddler and rewrite functional, family-centered Part C IFSP outcomes grounded in natural environments.',
      stimulus: 'Amara, 19 months old, qualifies for Part C with hypotonia and motor-communication delays. Her mother works split hospitality shifts while her aunt cares for Amara at home and visits the library toddler story circle. Outpatient therapists urge moving all weekly sessions to a hospital clinic with suspended swings. Her family prioritizes high-chair snacks, calmer dressing, and floor play with her four-year-old brother.',
      estimatedMinutes: 15,
      taskParts: [
        'Evaluate the hospital clinic proposal against IDEA Part C natural-environments requirements and specify what a valid justification requires.',
        'Draft measurable, functional Part C IFSP outcomes anchored in snack, dressing, and sibling floor-play routines rather than isolated clinic tasks.',
        'Structure a routines-based intervention plan that coaches both Amara\'s mother and aunt across home and library settings.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Link Amara\'s hypotonia and communication delays directly to the family\'s stated priorities—snack, dressing, sibling play—and her aunt\'s weekday caregiving role.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply IDEA Part C natural environments (34 CFR 303.126 and 303.344), requiring services in peer-typical settings unless written justification shows outcomes cannot be met there.',
        },
        {
          label: 'Support plan',
          guidance: 'Use a Routines-Based Interview to embed trunk-stability, reaching, and gesture-word targets into high-chair snacks, dressing songs, floor play, and library storytime with caregiver coaching.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Coordinate schedules around split shifts, include the aunt with parental permission, conduct 6-month Part C IFSP reviews, and track participation gains inside daily routines.',
        },
      ],
      successCriteria: [
        'Correctly explains that specialized clinic swings do not constitute a legal justification to remove services from Amara\'s natural environments.',
        'Translates hypotonia and communication needs into observable, functional Part C IFSP outcomes tied to family-identified routines.',
        'Actively engages both the mother and the caregiving aunt in embedded coaching across home and neighborhood library contexts.',
        'Distinguishes Part C family-centered outcomes and 6-month periodic review duties from school-age academic programming.',
      ],
      commonPitfalls: [
        'Approving hospital clinic sessions simply because clinicians cite specialized sensory equipment unavailable at home.',
        'Writing jargon-laden clinical objectives such as improving core strength by 20 percent instead of meaningful daily routine participation.',
        'Limiting coaching solely to the mother and excluding the primary daytime caregiver aunt from hands-on strategy practice.',
        'Confusing Part C natural environments with school-age Part B least restrictive environment classroom continuums.',
      ],
      sampleOutline: [
        'Evidence synthesis: Amara\'s motor and communication needs show up during snack, dressing, and sibling play, and her daily life centers on home with her aunt and the local library.',
        'Legal standard: IDEA Part C mandates delivery in natural environments where same-age peers without disabilities participate; clinic placement requires an individualized justification demonstrating outcomes cannot be met naturally.',
        'Intervention design: Write functional Part C IFSP outcomes—such as sitting supported at snack to point and vocalize for preferred fruit—and coach her mother and aunt to embed positioning and communication prompts during routine care.',
        'Safeguards: Honor split-shift scheduling, obtain consent to coach the aunt, collect routine-based participation data, and review outcomes at the required 6-month IFSP review.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/c',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5692.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ecse5692-workshop-03',
      taskType: 'Embedded instruction & early AAC access',
      title: 'Embed core-vocabulary AAC across inclusive preschool routines',
      prompt: 'Resolve barriers blocking a four-year-old\'s communication and physical participation in an inclusive preschool classroom using embedded learning opportunities and early AAC.',
      stimulus: 'Devon, age 4, has spastic diplegic cerebral palsy and childhood apraxia of speech in an inclusive 18-child Head Start room. He uses a posterior walker, watches peers at the pretend grocery center, and makes vowel approximations, yet adults routinely answer for him. His speech-generating tablet stays locked on a high shelf during centers to prevent spills. A 45-minute observation logged zero peer turns and two adult-prompted responses.',
      estimatedMinutes: 15,
      taskParts: [
        'Analyze how locking away the tablet and adult over-interpreting violate IDEA Part B assistive technology and inclusive access obligations.',
        'Build an Embedded Learning Opportunities (ELO) activity matrix integrating Devon\'s core-vocabulary AAC and motor positioning across four daily preschool routines.',
        'Outline aided language modeling, expectant time delay, and peer-mediated strategies to increase spontaneous peer-directed turns without adult dominance.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Connect zero peer-directed turns and two adult-prompted responses to locked AAC equipment, rapid adult answering, and unadapted dramatic-play positioning.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Cite IDEA Part B special factors for assistive technology (34 CFR 300.324), LRE supplementary aids (34 CFR 300.114), and EBP showing early AAC supports rather than hinders speech.',
        },
        {
          label: 'Support plan',
          guidance: 'Mount the durable-cased tablet at wheelchair or stander height across arrival, snack, grocery play, and outdoor routines; use aided language modeling, 5-second time delay, and peer-buddy turn prompts.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Train classroom staff and family on device care and core words, ensure safe PT-approved positioning, and graph spontaneous peer-directed communication turns weekly.',
        },
      ],
      successCriteria: [
        'Identifies locked-shelf AAC storage as a denial of required assistive technology access and inclusive participation under IDEA Part B.',
        'Maps concrete embedded learning opportunities across multiple authentic preschool routines rather than isolating AAC drills at a back table.',
        'Combines aided language input, expectant 5-second wait time, UDL positioning supports, and peer-mediated interaction strategies.',
        'Directly counters the misconception that speech-generating devices reduce motivation for natural speech development.',
      ],
      commonPitfalls: [
        'Pulling Devon out to a quiet hallway for 30 minutes of discrete tablet tapping while leaving classroom routines unchanged.',
        'Treating spill risk as a valid reason to restrict AAC during snack, art, or sensory play instead of adding protective cases and mounts.',
        'Restricting vocabulary to fringe food-request nouns rather than high-frequency core words (more, go, turn, help, stop) usable across centers.',
        'Allowing paraprofessionals to speak for Devon or prompt hand-over-hand before peers and wait time can invite spontaneous turns.',
      ],
      sampleOutline: [
        'Evidence synthesis: Devon shows clear social intent toward grocery-center peers, but locked AAC storage and immediate adult speaking suppress spontaneous turns to zero.',
        'IDEA and EBP basis: IDEA Part B requires assistive technology access across school routines as a supplementary aid in the LRE; research confirms core-vocabulary AAC accelerates communicative competence and supports spoken language.',
        'Embedded plan: Use a waterproof case and table or walker mount so the tablet travels through arrival, snack, dramatic play, and recess; adults model two-word core combinations, pause 5 seconds, and coach peers to respond to Devon\'s AAC turns.',
        'Monitoring and safeguards: Coordinate PT-verified supportive seating at centers, send home core-word visuals for family continuity, and track weekly spontaneous peer-directed acts.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://www.naeyc.org/resources/position-statements/dap/principles',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ecse5692-workshop-04',
      taskType: 'Pyramid Model & ABC behavior support',
      title: 'Replace exclusionary timeout with Pyramid Model transition supports',
      prompt: 'Interpret ten days of preschool ABC data using the Pyramid Model framework and design a function-based prevention and teaching plan that preserves inclusive placement.',
      stimulus: 'Nora, age 4 in inclusive Pre-K, threw blocks or pushed peers six times in four days. Ten-day ABC logs show five incidents follow the abrupt cleanup bell while Nora is mid-build and an adult clears blocks while scolding her; staff then place her in a hallway chair for eight minutes, delaying circle time. At choice centers with visual turn cards, Nora shares calmly for 20 minutes. Her teacher requests transfer to a self-contained behavioral room.',
      estimatedMinutes: 15,
      taskParts: [
        'Formulate a testable behavioral function hypothesis from the ABC pattern and explain why eight-minute hallway removal worsens the cycle.',
        'Design a multi-tiered Pyramid Model support plan spanning classroom-wide transition predictability, targeted emotional-regulation teaching, and an individualized Prevent-Teach-Reinforce plan.',
        'Address the request for self-contained placement using IDEA Part B LRE and positive behavioral intervention safeguards.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Link five of six incidents to the abrupt cleanup bell and block removal, contrast with 20-minute calm sharing using visual turn cues, and note circle-time avoidance during hallway timeout.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply Pyramid Model tiers (universal, targeted, intensive PTR-YC), IDEA Part B positive behavioral supports (34 CFR 300.324(a)(2)(i)), and LRE prohibitions against premature removal.',
        },
        {
          label: 'Support plan',
          guidance: 'Introduce 5-minute visual sand-timer warnings, a laminated save-my-building mat, explicit teaching of a help or save-it card, and immediate reinforcement of calm transitions into circle.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Track daily cleanup transition latency, replacement-card use, and incident frequency; partner with Nora\'s family on home-school transition cues and avoid exclusionary hallway isolation.',
        },
      ],
      successCriteria: [
        'Hypothesizes escape from abrupt transition demands and preservation of unfinished block play directly from the ABC antecedent-consequence sequence.',
        'Explains that sending Nora to a hallway chair for eight minutes negatively reinforces escape from cleanup and circle time.',
        'Integrates antecedent transition supports, an explicit functionally equivalent communication skill, and positive reinforcement aligned to the Pyramid Model.',
        'Rejects immediate transfer to a self-contained classroom before implementing and evaluating tiered positive behavioral supports in the LRE.',
      ],
      commonPitfalls: [
        'Labeling Nora as willfully defiant or blaming sensory overload without examining the immediate cleanup-bell antecedent and hallway-escape consequence.',
        'Proposing harsher removal consequences or losing choice-center privileges instead of teaching transition coping and communication skills.',
        'Agreeing to a more restrictive behavioral classroom placement based on six incidents prior to functional assessment and tiered intervention.',
        'Using verbal lectures during emotional escalation rather than pre-teaching visual warnings and practicing replacement cues while Nora is calm.',
      ],
      sampleOutline: [
        'ABC evidence: Five of six throwing or pushing incidents follow sudden cleanup bells and adult block removal, ending in an eight-minute hallway chair that delays cleanup and circle time.',
        'Framework and IDEA rule: Within the Pyramid Model and IDEA Part B, teams address behavior through positive, function-based supports in the LRE rather than exclusionary discipline or abrupt placement removal.',
        'Support plan: Strengthen Tier 1 transition warnings (visual countdown, cleanup song), add a Tier 2 feelings check-in, and implement a Tier 3 plan with a photo save-my-tower parking mat, explicit teaching of a save-it card, and praise for transitioning to circle.',
        'Monitoring: Graph daily independent transitions and replacement-card prompts over three weeks, share visual cues with Nora\'s family, and review fidelity before considering any change in supports.',
      ],
      references: [
        'https://www.naeyc.org/resources/position-statements/dap/principles',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5692.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ecse5692-workshop-05',
      taskType: 'Part C to Part B age-3 transition',
      title: 'Correct legal violations in a summer-birthday age-3 transition',
      prompt: 'Identify IDEA compliance violations in a delayed summer Part C-to-Part B transition and build a seamless, LRE-aligned transition timeline.',
      stimulus: 'Liam, age 2 years 7 months, receives Part C home-based developmental and speech therapy for language delay and sensory regulation. His third birthday falls in late August, two weeks before school opens, and no transition conference is scheduled. The district administrator tells his parents Part B testing will wait until October when rooms settle and states Liam will automatically enter a half-day self-contained disability-only class.',
      estimatedMinutes: 15,
      taskParts: [
        'Identify at least three distinct IDEA Part C and Part B compliance violations in the proposed timeline and placement statement.',
        'Map the legally required transition sequence—notification, transition plan, family-consented conference, Part B evaluation, and eligibility—so services bridge seamlessly by Liam\'s third birthday.',
        'Explain how the team should align Part C IFSP outcomes and Part B IEP goals while evaluating inclusive LRE preschool options.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Calculate the five-month window until Liam\'s late-August third birthday and flag the unscheduled transition conference, October evaluation delay, and predetermined self-contained class.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply 34 CFR 303.209 and 34 CFR 300.124: transition plan and LEA conference at least 90 days before age 3, Part B IEP developed and in effect by the third birthday, and LRE individualized placement.',
        },
        {
          label: 'Support plan',
          guidance: 'Convene the transition conference immediately with parent consent, share Part C progress data to avoid redundant testing, determine ESY or late-August start dates, and consider inclusive Head Start or community preschool with itinerant ECSE.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Provide procedural safeguards and written parental consent forms before Part B evaluation, document continuity of family communication, and verify no service gap occurs at age 3.',
        },
      ],
      successCriteria: [
        'Flags the October testing delay as a violation of the mandate to have Part B eligibility and an IEP in effect by the child\'s third birthday.',
        'Identifies automatic assignment to a self-contained disability-only classroom as illegal predetermination violating the Part B LRE continuum.',
        'Specifies the 90-day-minimum (up to 9 months) window prior to age 3 for the transition plan and LEA transition conference with family approval.',
        'Demonstrates how Part C IFSP outcomes and Part B IEP goals connect smoothly while addressing summer-birthday service initiation or ESY decisions.',
      ],
      commonPitfalls: [
        'Assuming school districts may pause Part B transition evaluations during summer recess until fall classes begin.',
        'Treating a transition conference as optional or holding it without inviting the LEA representative and obtaining family consent.',
        'Accepting a default segregated preschool room because the district lacks an in-building general-education Pre-K rather than using community preschools or Head Start.',
        'Discarding existing Part C observational and developmental progress data instead of reviewing it as part of the Part B evaluation.',
      ],
      sampleOutline: [
        'Compliance gaps: Delaying evaluation until October violates the age-3 IEP deadline, skipping the transition conference breaches the 90-day rule, and predetermining a self-contained class violates LRE.',
        'Required timeline: With five months remaining, immediately convene the parent-approved transition conference (at least 90 days before age 3), secure Part B evaluation consent, and complete eligibility and IEP development prior to late August.',
        'Program continuity: Translate Liam\'s current Part C IFSP outcomes and Part B IEP goals around functional language and sensory participation, determine whether late-August ESY or immediate preschool services apply, and examine inclusive Head Start or community preschool with itinerant support.',
        'Safeguards: Deliver Part B procedural safeguards in accessible language, involve parents as equal IEP team members, and schedule a 30-day post-transition check-in.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/c',
        'https://sites.ed.gov/idea/regs/b',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'ecse5692-workshop-06',
      taskType: 'DEC family coaching & transdisciplinary PSP',
      title: 'Redesign fragmented home visits into transdisciplinary PSP coaching',
      prompt: 'Diagnose service-delivery strain caused by four separate multidisciplinary home visits and restructure care using DEC Recommended Practices and a Primary Service Provider coaching model.',
      stimulus: 'Priya, 26 months old with Down syndrome, has four separate weekly home visits from an ECSE teacher, PT, OT, and SLP. Her parents report conflicting exercise sheets, lost wages from four appointments, and jargon-heavy notes, and canceled three visits this month. During sessions, therapists work one-on-one with Priya on the floor while her parents watch from the sofa. One provider logged the family as noncompliant in team notes.',
      estimatedMinutes: 15,
      taskParts: [
        'Reframe the missed visits through DEC Recommended Practices by identifying structural service-delivery barriers rather than caregiver noncompliance.',
        'Transition the team from fragmented multidisciplinary sessions to a transdisciplinary Primary Service Provider (PSP) model with structured joint consultation and role release.',
        'Demonstrate how the primary coach will apply the five evidence-based coaching practices during a parent-chosen daily routine.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Connect three canceled visits, lost wages, conflicting handouts, and sofa-watching sessions to provider-centered multidisciplinary overload rather than low family motivation.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply DEC Recommended Practices (Family, Teaming and Collaboration, Interaction), IDEA Part C family capacity-building principles, and ethical documentation standards.',
        },
        {
          label: 'Support plan',
          guidance: 'Select one PSP matched to Priya\'s top priority, hold regular transdisciplinary team huddles and targeted joint visits, and coach parents via joint planning, observation, action, reflection, and feedback.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Replace deficit chart language with objective records, review family stress and satisfaction at every joint planning check-in, and confirm Part C IFSP team agreement before modifying visit frequency.',
        },
      ],
      successCriteria: [
        'Challenges the noncompliance label and traces cancellations to fragmented scheduling, conflicting advice, and passive parent roles.',
        'Clearly distinguishes transdisciplinary Primary Service Provider (PSP) teaming and role release from parallel multidisciplinary visits.',
        'Applies all five coaching elements (joint planning, observation, action/practice, reflection, feedback) with parents leading hands-on interaction.',
        'Protects family decision-making authority by confirming any service-delivery change through the full Part C IFSP team with informed consent.',
      ],
      commonPitfalls: [
        'Recommending an attendance contract or warning letter that blames parents for missing four weekly appointments.',
        'Eliminating PT, OT, or SLP expertise completely instead of retaining them as active consulting team members supporting the PSP.',
        'Defining parent coaching as demonstrating exercises while caregivers watch and take home printed worksheets.',
        'Unilaterally reducing or changing documented Part C IFSP service minutes without convening the IFSP team and obtaining parental consent.',
      ],
      sampleOutline: [
        'Reframing evidence: Four separate visits, contradictory exercise lists, and therapist-only floor play create wage loss and caregiver burnout—not family noncompliance.',
        'DEC and Part C basis: DEC Recommended Practices emphasize family capacity-building, coordinated transdisciplinary teaming, and respectful, bias-free professional communication.',
        'Transdisciplinary PSP plan: Designate one Primary Service Provider backed by biweekly team huddles and periodic joint specialist visits; shift sessions from therapist-child drills to five-step caregiver coaching during meals or bath-book routines.',
        'Safeguards: Convene the Part C IFSP team with parents as equal partners to revise service delivery, update notes objectively, and verify that unified routine strategies reduce family stress while advancing Priya\'s goals.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/c',
        'https://praxis.ets.org/test/special-education-early-childhoodearly-intervention-5692.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

const special_education_intellectual_disabilities_5322 = {
  workshopLabel: 'Applied ID case workshops',
  workshopPracticeNote: 'Independent applied intellectual-disabilities case workshops designed to build AAIDD supports-intensity planning, systematic instruction, functional literacy/AAC, ecological assessment, and transition reasoning for Special Education: Intellectual Disabilities (5322) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'id5322-workshop-01',
      taskType: 'AAIDD evaluation & nondiscriminatory eligibility',
      title: 'Prevent misidentification and diagnostic overshadowing in an ID referral',
      prompt: 'Evaluate an incomplete Intellectual Disability eligibility referral for a multilingual fourth grader using AAIDD three-prong criteria and IDEA nondiscriminatory safeguards.',
      stimulus: 'Marcus, a 9-year-old fourth grader with interrupted prior schooling and emerging English proficiency (WIDA Level 2), was referred for Intellectual Disability after scoring 68 on an English IQ test. A teacher-only adaptive scale yielded 71. Yet an interpreter-assisted parent interview revealed Marcus makes sibling snacks, runs errands safely, and translates notices. A nurse screen also flagged uncorrected myopia.',
      estimatedMinutes: 15,
      taskParts: [
        'Test the referral evidence against all three AAIDD criteria and explain why the current data cannot establish Intellectual Disability eligibility.',
        'Analyze how limited English proficiency, interrupted schooling, and uncorrected myopia create diagnostic overshadowing and score invalidity.',
        'Recommend a nondiscriminatory multidisciplinary re-evaluation and strengths-based supports plan before making any eligibility determination.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Contrast the English FSIQ 68 and teacher-only adaptive 71 against Marcus\'s strong practical home-community functioning, WIDA Level 2 status, interrupted schooling, and uncorrected vision.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply AAIDD three-prong criteria and five operational assumptions alongside IDEA 34 CFR 300.304–300.306 nondiscriminatory testing and exclusionary factors (English proficiency and lack of instruction).',
        },
        {
          label: 'Support plan',
          guidance: 'Secure optometry follow-up and glasses, collect cross-setting conceptual-social-practical adaptive data with a bilingual evaluator, use nonverbal or home-language cognitive measures, and deliver explicit literacy-ELD scaffolds.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Document response to culturally responsive Tier 2 instruction, ensure interpreter-supported parental participation, and refrain from assigning an ID classification while exclusionary factors remain unaddressed.',
        },
      ],
      successCriteria: [
        'Applies all three AAIDD criteria (intellectual functioning, adaptive behavior across conceptual-social-practical domains, developmental onset before age 22) plus AAIDD cultural-linguistic assumptions.',
        'Identifies IDEA exclusionary rules prohibiting eligibility when limited English proficiency or lack of appropriate instruction is the determinant factor.',
        'Flags uncorrected myopia and teacher-only adaptive sampling as critical validity threats causing diagnostic overshadowing.',
        'Proposes vision correction, bilingual/nonverbal multimethod assessment, and immediate instructional supports rather than waiting passively.',
      ],
      commonPitfalls: [
        'Confirming Intellectual Disability eligibility mechanically because the English FSIQ of 68 and teacher adaptive score of 71 fall near two standard deviations below the mean.',
        'Dismissing parent-reported home and neighborhood competence as biased while treating a single classroom checklist as definitive adaptive truth.',
        'Postponing all classroom reading and visual accommodations until a full re-evaluation is finalized.',
        'Using an English verbal cognitive subtest with informal on-the-spot translation instead of validated nonverbal or home-language assessment methods.',
      ],
      sampleOutline: [
        'Evidence critique: An English IQ of 68 and a single teacher adaptive rating of 71 are invalidated by WIDA Level 2 status, interrupted schooling, uncorrected myopia, and discrepant real-world home-community competence.',
        'AAIDD and IDEA rules: AAIDD requires convergent limitations in intellectual and adaptive functioning interpreted within cultural-linguistic peers and community environments; IDEA bars eligibility driven by limited English proficiency or lack of instruction.',
        'Next-step plan: Coordinate corrective lenses, complete bilingual and nonverbal multidisciplinary evaluation sampling conceptual, social, and practical domains across home and school, and deliver explicit visual-scaffolded reading and ELD instruction.',
        'Safeguards: Maintain interpreter-supported family partnership, analyze instructional response data, and base any future supports plan on verified individual support intensity rather than a flawed label.',
      ],
      references: [
        'https://www.aaidd.org/intellectual-disability/definition',
        'https://sites.ed.gov/idea/regs/b',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'id5322-workshop-02',
      taskType: 'Ecological assessment & AA-AAS decision making',
      title: 'Apply legal criteria to an Alternate Assessment (AA-AAS) recommendation',
      prompt: 'Evaluate an administrator\'s push to assign a fifth grader with moderate intellectual disability to the Alternate Assessment (AA-AAS) and build an ecological access assessment plan.',
      stimulus: 'Elena, an 11-year-old fifth grader with moderate intellectual disability, decodes CVC and sight words, solves two-step money tasks with a calculator and anchor chart, and joins science labs with graphic organizers. Before state testing, an administrator urges the Alternate Assessment (AA-AAS) because her benchmarks lag two years and she spends 60 percent of her day in resource. Parents got a pre-checked form five minutes early.',
      estimatedMinutes: 15,
      taskParts: [
        'Evaluate the administrator\'s rationale and the pre-checked parent form against IDEA and ESSA Alternate Assessment (AA-AAS) eligibility and procedural safeguards.',
        'Design an ecological discrepancy inventory across Elena\'s fifth-grade general-education literacy, math, and science settings to identify required accommodations and supports.',
        'Specify how the IEP team should document assessment participation, inform parents of long-term diploma implications, and align daily instruction with testing accommodations.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Highlight Elena\'s active decoding, calculator-assisted two-step math problem solving, and inclusive science lab engagement against the invalid placement-percentage and low-score rationales.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply IDEA Part B assessment participation rules (34 CFR 300.160 and 300.320(a)(6)): AA-AAS is strictly for students with the most significant cognitive disabilities, never based on label, setting, or predicted scores, and requires non-predetermined IEP team decision making.',
        },
        {
          label: 'Support plan',
          guidance: 'Conduct ecological task-environment analysis across fifth-grade classes, match state-allowed general-assessment accommodations (text-to-speech, extended time, calculation tools where permitted), and embed those exact supports in daily instruction.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Provide written explanation of how AA-AAS participation can affect standard high school diploma pathways, give parents advance review time without pre-checked forms, and review accommodation effectiveness on classroom benchmarks.',
        },
      ],
      successCriteria: [
        'Explains that AA-AAS participation is restricted to students with the most significant cognitive disabilities and cannot be triggered by resource-room minutes or below-grade benchmark scores.',
        'Identifies handing parents a pre-checked decision form five minutes prior to the meeting as unlawful predetermination violating meaningful parent participation.',
        'Uses ecological assessment to align daily classroom accommodations with state-permitted general-assessment accommodations rather than lowering curricular expectations.',
        'Requires explicit parent notification regarding potential state diploma and postsecondary impacts whenever alternate standards are considered.',
      ],
      commonPitfalls: [
        'Assuming every student eligible under the Intellectual Disability category automatically belongs on the Alternate Assessment (AA-AAS).',
        'Allowing school accountability pressures or predicted proficiency scores to guide an individual student\'s assessment pathway.',
        'Introducing accommodations for the first time on state testing day without verifying Elena uses them fluently during daily instruction.',
        'Failing to distinguish accommodations that maintain grade-level construct validity from modifications that alter grade-level achievement standards.',
      ],
      sampleOutline: [
        'Compliance analysis: Neither Elena\'s ID label, her 60 percent resource schedule, nor below-grade benchmarks justify AA-AAS; presenting a pre-checked form five minutes before the meeting violates IDEA\'s prohibition on predetermination.',
        'Ecological assessment: Inventory environmental demands and access barriers in fifth-grade ELA, math, and science to test whether Elena can access the general assessment using allowable accommodations such as read-aloud, visual checklists, and permitted math tools.',
        'IEP team action: Reconvene with advance parent materials, review state AA-AAS eligibility guidelines transparently including diploma-track consequences, and retain Elena on the general grade-level assessment with daily-practiced accommodations if she does not meet most-significant-cognitive-disability criteria.',
        'Monitoring: Track Elena\'s performance with and without each accommodation across quarterly curriculum-based probes to validate access and inform ongoing instruction.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5322.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'id5322-workshop-03',
      taskType: 'Task analysis, chaining & prompt fading',
      title: 'Eliminate paraprofessional prompt dependence using constant time delay',
      prompt: 'Design a systematic task-analysis, chaining, and prompt-fading protocol to build independent execution of a multi-step school job routine and retrain paraprofessional support.',
      stimulus: 'Tariq, a 14-year-old eighth grader with moderate intellectual disability, is learning an eight-step cafeteria tray-prep and checkout routine. Three-day baseline probes show he independently completes Step 1 (apron) and Step 8 (wipe counter) on 100 percent of trials, but stalls on Steps 2 through 7 waiting for elbow touches or verbal narration. To keep the line moving, his paraprofessional now uses continuous hand-over-hand guidance on every step.',
      estimatedMinutes: 15,
      taskParts: [
        'Select an appropriate chaining procedure and response-prompting system (Constant Time Delay or System of Least Prompts) justified by Tariq\'s baseline profile and frustration with errors.',
        'Specify exact 0-second and 4-second delay procedures, controlling prompt, error-correction rule, and transfer of stimulus control to natural environmental cues.',
        'Outline paraprofessional coaching, fidelity checks, and multiple-opportunity probe data graphing to fade adult prompts systematically.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Use baseline mastery of Steps 1 and 8, passive stalling at Steps 2–7, error frustration, and continuous hand-over-hand rushing to pinpoint adult-created prompt dependence.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply evidence-based systematic instruction for ID: total-task chaining, Constant Time Delay (near-errorless acquisition), stimulus-control transfer, and educator supervision of paraprofessionals.',
        },
        {
          label: 'Support plan',
          guidance: 'Run total-task chaining with a picture-sequence strip at eye level; teach Steps 2–7 via Constant Time Delay (0-second controlling model prompt shifting to 4-second wait), reinforcing unprompted correct steps immediately.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Score each step as unprompted correct, prompted correct, or error on daily task-analytic probes, conduct weekly paraprofessional procedural-fidelity checks, and schedule practice during lower-rush prep windows first.',
        },
      ],
      successCriteria: [
        'Diagnoses prompt dependence caused by continuous hand-over-hand guidance and rapid verbal narration during lunch rush.',
        'Justifies total-task chaining paired with Constant Time Delay (0-second then 4-second delay) to minimize error frustration while preserving mastered Steps 1 and 8.',
        'Defines explicit transfer of stimulus control from the controlling prompt to natural cues and an age-appropriate visual task checklist.',
        'Establishes teacher-led paraprofessional training, procedural-fidelity monitoring, and separate tracking of unprompted versus prompted step mastery.',
      ],
      commonPitfalls: [
        'Continuing full hand-over-hand physical prompting across already-mastered Steps 1 and 8 just to speed up cafeteria throughput.',
        'Combining repeated verbal chatter with elbow taps simultaneously so Tariq never learns which natural environmental cue signals the next step.',
        'Graphing combined prompted-plus-independent accuracy, which hides persistent prompt dependence behind artificially high percentages.',
        'Delegating instructional design or prompt-fading decisions solely to the paraprofessional without teacher modeling and fidelity observation.',
      ],
      sampleOutline: [
        'Baseline diagnosis: Tariq already performs Steps 1 and 8 independently; stalling on Steps 2–7 reflects prompt dependence reinforced by continuous hand-over-hand rushing.',
        'Systematic instruction design: Use total-task chaining during a low-rush pre-lunch window with Constant Time Delay—two sessions at 0-second delay using a concise model/gesture controlling prompt, then 4-second delay so Tariq anticipates steps from natural cues and a laminated picture strip.',
        'Reinforcement and error correction: Deliver immediate specific praise for unprompted steps and use a calm non-punitive model correction if an error occurs before 4 seconds.',
        'Supervision and data: Train the paraprofessional through modeling and role-play, verify fidelity weekly, and graph independent percentage of steps mastered until Tariq reaches criterion and generalizes to peak lunch service.',
      ],
      references: [
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5322.pdf',
        'https://www.aaidd.org/intellectual-disability/definition',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'id5322-workshop-04',
      taskType: 'Functional literacy, SETT & core-vocabulary AAC',
      title: 'Integrate grade-aligned shared reading and SETT-based AAC in 6th-grade ELA',
      prompt: 'Replace isolated alphabet worksheets for a sixth grader with intellectual disability and complex communication needs using shared story reading, phonics, and the SETT AAC framework.',
      stimulus: 'Maya, a 12-year-old sixth grader with intellectual disability and complex communication needs, speaks 15 words and points to food photos at lunch. In inclusive sixth-grade ELA, she sits at a back table coloring alphabet sheets while peers study an ecosystem novel. Staff insist Maya must master all 26 letter sounds before joining discussions or trialing a speech-generating device. She loves wildlife videos and laughs at peer jokes in advisory.',
      estimatedMinutes: 15,
      taskParts: [
        'Refute the letter-sound prerequisite barrier using IDEA LRE access standards and evidence-based comprehensive literacy and AAC principles.',
        'Apply all four components of the SETT framework (Student, Environments, Tasks, Tools) to select and implement a robust core-plus-fringe AAC system across Maya\'s sixth-grade day.',
        'Design an age-respectful inclusive ELA plan combining adapted grade-aligned shared story reading with systematic foundational decoding instruction.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Contrast Maya\'s 15 spoken words, food-only photo board, and back-table coloring sheets against her wildlife interests, peer social engagement, and sixth-grade ecosystem unit.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply IDEA Part B general-curriculum access (34 CFR 300.320) and assistive technology consideration (34 CFR 300.324(a)(2)(v)); reject prerequisite readiness myths for both AAC and grade-level literature.',
        },
        {
          label: 'Support plan',
          guidance: 'Complete a team SETT evaluation to trial a dynamic core-plus-ecosystem-fringe AAC display; seat Maya with table peers for adapted chapter text, repeated story lines, partner-assisted commenting, and separate explicit decoding instruction.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Monitor literal and inferential comprehension responses via AAC, track core-word combinations across ELA and advisory, and ensure every adapted material looks age-respectful for a 12-year-old.',
        },
      ],
      successCriteria: [
        'Explicitly dismantles the misconception that mastering all 26 letter sounds is a prerequisite for AAC access or inclusive literature participation.',
        'Systematically walks through Student, Environments, Tasks, and Tools (SETT) before selecting an AAC tool rather than starting with a device catalog.',
        'Pairs age-respectful adapted grade-aligned shared story reading (repeated story line, graphic organizer, core-word commenting) with explicit foundational literacy instruction.',
        'Moves Maya from an isolated back table into authentic peer-group discussions using peer-modeled AAC communication.',
      ],
      commonPitfalls: [
        'Replacing grade-level ELA entirely with functional survival sight words or continuing preschool-style coloring worksheets for a 12-year-old.',
        'Limiting Maya\'s AAC board to choice-making and lunch food nouns rather than generative core vocabulary for commenting, questioning, and peer humor.',
        'Skipping Student, Environment, and Task analysis and jumping straight to purchasing whichever tablet app the district already owns.',
        'Assuming shared story reading alone replaces systematic phonics and phonemic awareness instruction instead of providing comprehensive literacy.',
      ],
      sampleOutline: [
        'Barrier analysis: Withholding AAC and peer literature access until Maya masters 26 letter sounds violates IDEA general-curriculum and AT mandates and replaces age-appropriate learning with stigmatizing busywork.',
        'SETT AAC plan: Analyze Student strengths (wildlife interest, peer humor), Environments (6th-grade ELA, science, lunch, advisory), and Tasks (answering text questions, joking with peers, requesting) to trial a robust core-plus-fringe speech-generating system.',
        'Comprehensive literacy design: Seat Maya with peers for shared reading of an adapted ecosystem novel featuring simplified text, visual concept webs, a repeated main-idea line, and AAC-supported WH-comprehension prompts, complemented by brief daily explicit decoding lessons.',
        'Monitoring: Graph independent AAC comprehension turns, communicative functions beyond requesting, and decoding mastery weekly while training ELA teachers and peers in aided language modeling.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://praxis.ets.org/test/special-education-teaching-students-with-intellectual-disabilities-5322.html',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'id5322-workshop-05',
      taskType: 'Generalization, CBI & natural peer supports',
      title: 'Program community generalization and peer supports beyond classroom simulations',
      prompt: 'Explain why classroom play-money accuracy failed to transfer to a neighborhood pharmacy and design a generalization-focused Community-Based Instruction and peer-support plan.',
      stimulus: 'Jordan, a 16-year-old tenth grader with moderate intellectual disability, uses the next-dollar strategy with plastic coins in a self-contained classroom store at 95 percent accuracy. On a neighborhood pharmacy trip, Jordan froze at the self-checkout screen, handed a 20-dollar bill for a 3.49-dollar item, and waited while an aide finished paying. In hallways and elective art, Jordan sits beside a 1:1 aide with zero reciprocal peer talks all week.',
      estimatedMinutes: 15,
      taskParts: [
        'Diagnose the failure to generalize from classroom play money to the pharmacy checkout using evidence-based generalization principles.',
        'Design a structured Community-Based Instruction (CBI) sequence that programs generalization across real currency, varied registers, and authentic community settings.',
        'Replace hovering 1:1 paraprofessional proximity in elective art and hallways with a structured peer-support arrangement that builds natural social belonging.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Contrast 95 percent plastic-coin accuracy against freezing at the pharmacy self-checkout and link zero reciprocal peer talks to continuous 1:1 paraprofessional hovering in art and hallways.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply Stokes and Baer generalization tactics (sufficient exemplars, common stimuli, natural contingencies, teach loosely), CBI aligned with IEP goals, and peer-support arrangements promoting LRE inclusion.',
        },
        {
          label: 'Support plan',
          guidance: 'Replace plastic coins with real bills, debit-tap practice, and varied store-kiosk simulations before weekly small-group CBI across multiple stores; coach two art-class peers to share materials and cue transitions while fading aide distance.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Collect generalization probes across untrained stores and items, track reciprocal peer exchanges alongside adult-proximity distance, and ensure CBI respects teen dignity, consent, and community safety.',
        },
      ],
      successCriteria: [
        'Identifies artificial classroom stimuli (plastic coins, predictable script) and adult takeover as the root causes of failed community transfer.',
        'Applies explicit generalization programming—real currency, multiple store exemplars, self-checkout screens, and faded prompts—within structured CBI.',
        'Designs an evidence-based peer-support arrangement in tenth-grade art that equips classmates with natural interaction strategies while fading 1:1 adult hovering.',
        'Protects student dignity by scheduling small-group natural community trips and monitoring both independent purchase accuracy and peer-interaction data.',
      ],
      commonPitfalls: [
        'Responding to the pharmacy freeze by drilling additional weeks of plastic-coin worksheets inside the self-contained classroom.',
        'Allowing the aide to step in and finish checkout transactions quickly, inadvertently reinforcing passivity and learned helplessness.',
        'Running large, conspicuous group CBI trips where teenagers wear matching school lanyards that single them out and block natural community interaction.',
        'Assigning classmates as unpaid mini-teachers or charity helpers rather than reciprocal peers sharing an authentic art activity.',
      ],
      sampleOutline: [
        'Generalization diagnosis: Classroom plastic coins lacked common stimuli with real bills and touch-screen self-checkouts, and immediate aide takeover blocked independent problem solving.',
        'CBI generalization plan: Program common stimuli and sufficient exemplars by practicing next-dollar and card-tap purchases with real money across varied prices, followed by weekly small-group CBI at two to three local stores with systematic prompt fading.',
        'Peer-support arrangement: In tenth-grade art, partner Jordan with two trained peers who share supplies and model studio routines while the paraprofessional fades to periodic check-ins across the room.',
        'Safeguards and data: Secure parent permission and safety protocols for CBI, graph independent steps at untrained stores, and track weekly reciprocal peer exchanges versus adult proximity.',
      ],
      references: [
        'https://www.aaidd.org/intellectual-disability/definition',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5322.pdf',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
    {
      id: 'id5322-workshop-06',
      taskType: 'Secondary transition, SDM & supported employment',
      title: 'Rebuild a transition IEP around student voice, SDM, and integrated work',
      prompt: 'Audit a noncompliant secondary transition IEP for a 17-year-old with intellectual disability and redesign it around self-determination, Supported Decision-Making, and competitive integrated employment.',
      stimulus: 'Sofia, a 17-year-old junior with intellectual disability, enjoys arranging floral displays and greeting shoppers at a local garden center. Yet her draft IEP repeats last year\'s sheltered-workshop packet goal, and staff excluded her from the last meeting believing it would confuse her. Approaching age 18, a caseworker told her parents they must obtain plenary guardianship to keep signing forms, and Vocational Rehabilitation was not invited.',
      estimatedMinutes: 15,
      taskParts: [
        'Identify IDEA Part B secondary transition violations in Sofia\'s excluded attendance, recycled sheltered-workshop goal, and omitted Vocational Rehabilitation invitation.',
        'Clarify transfer-of-rights rules at the age of majority and compare full plenary guardianship with less-restrictive Supported Decision-Making (SDM) options.',
        'Design a person-centered transition plan featuring student-led IEP preparation, age-appropriate transition assessments, and competitive supported employment with fading job coaching.',
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance: 'Contrast Sofia\'s genuine garden-center strengths and approaching 18th birthday against her exclusion from IEP meetings, recycled sheltered-workshop goal, absent VR representative, and blanket guardianship advice.',
        },
        {
          label: 'IDEA & EBP rule',
          guidance: 'Apply IDEA Part B transition rules (34 CFR 300.320(b)-(c), 300.321(b)): mandatory student invitation, age-appropriate transition assessments, measurable postsecondary goals, consent-based VR invitation, and one-year-prior transfer-of-rights notice.',
        },
        {
          label: 'Support plan',
          guidance: 'Prepare Sofia with visual slides to co-lead her IEP, obtain consent to invite VR for competitive supported employment and job carving at a retail nursery, and share objective state-specific resources on Supported Decision-Making and limited powers of attorney.',
        },
        {
          label: 'Monitoring & safeguards',
          guidance: 'Verify current state law on age of majority and SDM agreements without offering legal representation, track natural coworker supports as job coaching fades, and update postsecondary goals annually from situational work assessments.',
        },
      ],
      successCriteria: [
        'Cites IDEA requirements to invite Sofia to every transition IEP meeting, update measurable postsecondary goals from current transition assessments, and seek consent to invite Vocational Rehabilitation.',
        'Replaces segregated sheltered-workshop defaults with competitive integrated employment options such as job carving, situational assessment, and fading job-coach supports.',
        'Accurately explains age-of-majority transfer-of-rights notice (at least one year before age 18) and presents Supported Decision-Making as a less-restrictive alternative to plenary guardianship.',
        'Includes concrete self-determination scaffolds (choice making, visual meeting script, goal-setting practice) so Sofia actively leads her transition planning.',
      ],
      commonPitfalls: [
        'Endorsing the caseworker\'s claim that plenary guardianship is automatically required at age 18 for every student with an intellectual disability.',
        'Inviting Vocational Rehabilitation to the IEP meeting without first securing written consent from Sofia\'s parents (or from Sofia once rights transfer).',
        'Copying prior-year transition goals verbatim or equating a student\'s disability label with sheltered-workshop placement.',
        'Inviting Sofia to sit silently in the IEP meeting without pre-teaching accessible self-advocacy tools so she can participate meaningfully.',
      ],
      sampleOutline: [
        'IDEA audit: Excluding Sofia violates 34 CFR 300.321(b), copying a sheltered-workshop goal ignores current assessment of her garden-center strengths, and failing to seek consent to invite VR weakens interagency transition linkages.',
        'Transfer of rights and SDM: IDEA requires notifying Sofia and her parents at least one year before the age of majority; educators should provide unbiased information on less-restrictive options such as Supported Decision-Making agreements or educational proxies rather than pushing plenary guardianship, directing legal questions to qualified state resources.',
        'Person-centered transition plan: Conduct situational vocational assessment at a local nursery, coach Sofia to present her strengths and goals using a visual slide deck at her IEP, and partner with VR (with prior consent) on customized supported employment and fading job coaching.',
        'Monitoring: Track Sofia\'s workplace task mastery, natural coworker supports, and self-advocacy milestones quarterly across her senior year.',
      ],
      references: [
        'https://sites.ed.gov/idea/regs/b',
        'https://www.aaidd.org/intellectual-disability/definition',
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE,
    },
  ],
};

module.exports = {
  special_education_early_childhood_5692,
  special_education_intellectual_disabilities_5322,
};
