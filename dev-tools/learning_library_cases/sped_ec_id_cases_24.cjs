'use strict';

const SPED_CASE_LABELS = {
  schemaVersion: 1,
  label: 'Applied SPED case',
  presentationLabel: 'Case scenario',
  answerLabel: 'Best professional decision',
  explanationLabel: 'Evidence-based rationale'
};

const special_education_early_childhood_5692 = {
  'se5692-ch-01-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Evaluating Bilingual Development and Prematurity in Part C',
    clinicalDescription:
      'A 26-month-old toddler born at 32 weeks gestation (adjusted age 24 months) from a Mandarin-English home combines two-word phrases in Mandarin, uses 20 English words, and enjoys sibling play. A screening checklist flags "delayed English vocabulary" using chronological age and suggests English-only flashcard drills.',
    diagnosis:
      'Use corrected age, measure total conceptual vocabulary across both languages, and co-create routines-based Part C IFSP outcomes for mealtimes.',
    explanation:
      'DEC Recommended Practices require interpreting early milestones with prematurity correction and dual-language conceptual vocabulary rather than monolingual English norms. Framing home-language development as a deficit or setting family-detached drill goals misrepresents authentic competence and weakens family partnership.'
  },
  'se5692-ch-02-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Removing Sensory Barriers and Label Bias in Inclusive Pre-K',
    clinicalDescription:
      'A 4-year-old with Down syndrome and bilateral sensorineural hearing loss wears hearing aids in an inclusive Pre-K classroom. Staff seat the child near a loud HVAC unit, skip daily amplification checks with the audiologist and nurse, and assign simplified sorting bins instead of emergent literacy centers based on the medical diagnosis.',
    diagnosis:
      'Establish a daily Ling Six-Sound hearing-aid check, move seating away from noise with visual cues, and maintain high individualized literacy expectations.',
    explanation:
      'IDEA and DEC environmental practices emphasize removing sensory barriers and coordinating individualized health and hearing-access protocols rather than lowering expectations from a diagnostic label. Placing an amplified learner in high background noise mistakes environmental inaccessibility for limited cognitive potential.'
  },
  'se5692-ch-03-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Replacing Over-Assistance with Low-Tech AT in Daily Routines',
    clinicalDescription:
      'A 4.5-year-old with cerebral palsy (GMFCS Level III) uses a walker and experiences hand fatigue during self-care. A classroom paraprofessional puts on the child\'s coat, feeds them every bite at snack, and recommends transferring to a segregated class until the child independently masters standard utensils and crayon grip.',
    diagnosis:
      'Retain inclusive Pre-K placement while introducing curved built-up utensils, slant-board grips, accessible hooks, and least-to-most prompting.',
    explanation:
      'DEC Recommended Practices reject segregated readiness prerequisites and call for low-tech assistive technology paired with systematic prompt fading during daily routines. Over-assisting self-care cultivates learned helplessness and violates least restrictive environment mandates when simple adaptations support peer participation.'
  },
  'se5692-ch-04-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Writing Functional Natural-Environment Part C IFSP Outcomes',
    clinicalDescription:
      'A 19-month-old with motor and expressive speech delays qualifies for IDEA Part C services. Therapists propose three weekly clinic visits targeting isolated peg-stacking and consonant imitation written in dense clinical jargon, while parents want help making bath time calmer and teaching the toddler to request preferred foods at home.',
    diagnosis:
      'Write plain-language, functional Part C IFSP outcomes embedded in home routines and deliver services in natural environments unless team-justified otherwise.',
    explanation:
      'IDEA Part C mandates service delivery in natural environments with a written justification required for clinic settings, alongside jargon-free outcomes rooted in family priorities. Defaulting to clinic pullout and isolated developmental-domain drills undermines caregiver capacity and reduces skill transfer to everyday life.'
  },
  'se5692-ch-05-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Embedding Explicit Trials and Prompt Fading in Play Centers',
    clinicalDescription:
      'A 4-year-old with developmental delay has Part B IEP goals for requesting turns and matching quantities 1 to 5. Staff pull the child out daily for 20 minutes of solitary counting worksheets while classroom aides use continuous hand-over-hand prompts during play without recording trial accuracy or prompt levels.',
    diagnosis:
      'Deliver embedded learning opportunities with constant time delay across snack, blocks, and centers while graphing independent responses weekly.',
    explanation:
      'Embedded instruction pairs brief, systematic explicit trials and planned prompt fading with motivating natural routines, accelerating acquisition and generalization in preschool. Pullout worksheets are developmentally mismatched and unfaded hand-over-hand assistance builds prompt dependence while eliminating peer language models.'
  },
  'se5692-ch-06-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Using Objective Multi-Setting Observation Over Trait Labeling',
    clinicalDescription:
      'During one crowded Monday morning, a 5-year-old kindergartner leaves the rug twice during a 25-minute teacher-led calendar lecture. An intern writes "child is defiant and incapable of sustained attention" on an unstructured sticky note and requests an immediate Tier 3 behavioral evaluation without reviewing lesson pacing.',
    diagnosis:
      'Gather structured, objective anecdotal and event-recording observations across routines while adjusting circle-time length and active-response opportunities.',
    explanation:
      'DEC assessment practices require repeated, multi-context objective observation and inspection of instructional quality before attributing behavior to child traits. Relying on a single-snapshot subjective label confuses developmentally excessive passive seat time with an underlying behavioral disorder.'
  },
  'se5692-ch-07-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing Preschool Exclusion Through Pyramid Model FBA',
    clinicalDescription:
      'A 3.5-year-old in a community preschool bites peers around 11:30 a.m. during loud cleanup transitions before lunch (four incidents in two weeks). After repeated 10-minute chair time-outs fail to reduce biting, the program director recommends suspending and disenrolling the child from the center.',
    diagnosis:
      'Complete an ecological FBA and apply Pyramid Model Tier 3 supports: transition warnings, visual first-then cues, quiet breaks, and FCT.',
    explanation:
      'Joint federal policy and the Pyramid Model oppose preschool suspension and expulsion, emphasizing function-based ecological plans that address fatigue, sensory overload, and communication gaps. Punitive time-outs and behavior-without-context analysis escalate distress and fail to teach safe replacement behaviors.'
  },
  'se5692-ch-08-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing Single-Score and Language Bias in Eligibility Decisions',
    clinicalDescription:
      'A 5-year-old Somali-speaking kindergartner scores 1.8 standard deviations below the mean on a single norm-referenced English expressive vocabulary test. A team member proposes immediate developmental-delay eligibility from that score alone and suggests waiting until the next annual review to check instructional progress.',
    diagnosis:
      'Conduct a nondiscriminatory, multi-source assessment across home language and English paired with frequent curriculum-based progress monitoring.',
    explanation:
      'IDEA forbids determining eligibility from any single procedure or linguistically biased measure, requiring valid multi-source data across languages and ongoing progress tracking. Relying on static annual-only measurement delays responsive Tier 2 adjustments and risks misclassifying typical second-language acquisition as disability.'
  },
  'se5692-ch-09-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Eliminating Wait-and-See Delays with Family-Centered Child Find',
    clinicalDescription:
      'Parents of a 22-month-old report loss of six previously used words, minimal joint attention, and no communicative pointing. A childcare director advises waiting until age 3 to see whether the toddler catches up, and the program intake form omits caregiver routine observations and child play strengths.',
    diagnosis:
      'Initiate an immediate IDEA Part C Child Find referral and schedule a strengths-based transdisciplinary arena evaluation centering caregiver observations.',
    explanation:
      'IDEA Child Find mandates prompt identification and evaluation without wait-and-see delays, especially when language regression or early social-communication indicators appear. Play-based arena evaluations integrating family knowledge yield authentic functional profiles while avoiding deficit-only evaluation framing.'
  },
  'se5692-ch-10-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Coordinating Timely Part C-to-Part B Transition with Translation',
    clinicalDescription:
      'A toddler receiving IDEA Part C services turns 3 in 110 days. The OT, PT, and SLP currently mail separate, uncoordinated English-only progress notes to the Spanish-speaking family, and no school-district Part B representative has been contacted to align evaluations or service start dates.',
    diagnosis:
      'Convene the Part C-to-Part B transition conference at least 90 days before age 3 with a qualified interpreter, unified summary, and defined team handoffs.',
    explanation:
      'IDEA Part C requires a written transition plan and conference at least 90 days (up to 9 months) before the third birthday so Part B IEP goals and services begin seamlessly by age 3. Fragmented parallel reports and untranslated communications violate family participation rights and cause preventable service gaps.'
  },
  'se5692-ch-11-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Stopping Informal Preschool Exclusions and Consent Violations',
    clinicalDescription:
      'A Pre-K teacher asks a Black family to pick up their 4-year-old with an IEP every day at noon because of lunchroom meltdowns, discusses the child\'s test scores aloud during dismissal, and begins a formal speech evaluation after a parent fails to return an opt-out flyer.',
    diagnosis:
      'End informal shortened days immediately, protect FERPA confidentiality, obtain informed written parental consent before evaluating, and reconvene the IEP team.',
    explanation:
      'IDEA procedural safeguards require explicit written parental consent rather than passive opt-out assumptions, protect confidential records, and treat informal early pickups as disciplinary exclusions that fuel racial equity disparities. Unilateral shortened days deny FAPE and bypass required behavioral assessment and support.'
  },
  'se5692-ch-12-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Respecting Credential Scope and Coaching Families with Evidence',
    clinicalDescription:
      'After watching social-media videos on sensory diets, an early-intervention educator plans to prescribe a daily weighted-vest schedule and oral-motor swallowing exercises independently while telling parents to watch quietly from the hallway so the educator can handle therapy as the sole expert.',
    diagnosis:
      'Refer swallowing and sensory-motor needs to licensed SLP and OT colleagues, select evidence-based strategies, and use DEC family coaching within home routines.',
    explanation:
      'CEC and DEC ethical standards require practicing strictly within credential scope, choosing research-validated interventions over unverified trends, and building caregiver confidence through collaborative coaching. Prescribing clinical feeding or sensory regimens outside one\'s license endangers children and creates expert dependency.'
  }
};

const special_education_intellectual_disabilities_5322 = {
  'id5322-ch-01-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Applying the AAIDD Supports Paradigm Over IQ-Only Ceilings',
    clinicalDescription:
      'A 15-year-old ninth grader with moderate intellectual disability (FSIQ 56) enjoys robotics club, reads community signage, and needs intermittent prompting for budgeting. Staff give the student cartoon toddler stickers as reinforcers, cite the IQ score as a learning ceiling, and propose permanent self-contained placement.',
    diagnosis:
      'Use the AAIDD supports-intensity paradigm with age-respectful materials, inclusive electives, and tailored conceptual, social, and practical supports.',
    explanation:
      'AAIDD defines intellectual functioning through the interaction of individual strengths, environment, and personalized supports rather than a static IQ ceiling. Infantilizing adolescents with preschool rewards and defaulting to segregation undermine dignity, LRE mandates, and adaptive skill growth.'
  },
  'id5322-ch-02-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing Diagnostic Overshadowing of Coexisting Health Needs',
    clinicalDescription:
      'A 10-year-old with Down syndrome and mild intellectual disability begins squinting at print, covering their ears during hallway transitions, refusing seated tasks, and coughing while drinking juice. Staff attribute the shift to "stubbornness from intellectual disability" without checking the IHP or requesting screenings.',
    diagnosis:
      'Avoid diagnostic overshadowing by consulting the nurse, verifying seizure and feeding IHP protocols, and requesting vision, hearing, and medical checks.',
    explanation:
      'Students with intellectual disabilities face higher rates of coexisting vision, hearing, dysphagia, thyroid, and seizure conditions that often surface as sudden behavioral changes. Explaining away acute sensory or swallowing signs as disability traits delays critical medical care and creates serious aspiration hazards.'
  },
  'id5322-ch-03-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Leading Person-Centered Transition Planning by Age Sixteen',
    clinicalDescription:
      'At a 16-year-old\'s annual IEP meeting, staff present prewritten goals focused on sorting colored beads, postpone transition assessment until age 18, direct all questions exclusively to the parent while the student sits quietly, and assume automatic placement in a segregated sheltered workshop after graduation.',
    diagnosis:
      'Conduct transition assessments now, coach the student to voice preferences via visuals or AAC, and align IEP goals with competitive employment.',
    explanation:
      'IDEA mandates postsecondary transition planning no later than age 16 driven by student strengths, interests, and measurable community-participation goals. Proxy-only meetings, detached busywork goals, and sheltered-workshop defaults violate self-determination principles and WIOA competitive integrated employment priorities.'
  },
  'id5322-ch-04-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Protecting AAC Access, Dysphagia Safety, and Lift Protocols',
    clinicalDescription:
      'A 12-year-old with moderate ID, dysphagia, and complex communication needs uses a speech-generating device (SGD). At lunch, an aide removes the SGD for repetitive tapping, pours thin water instead of prescribed nectar-thick liquid, and attempts a solo transfer despite a written two-person lift protocol.',
    diagnosis:
      'Keep the SGD continuously accessible, follow SLP dysphagia liquid orders strictly, enforce two-person transfer rules, and establish daily AT maintenance checks.',
    explanation:
      'Removing an AAC device silences a student\'s voice and intensifies behavioral frustration, while deviating from feeding textures or two-person transfer protocols risks life-threatening aspiration and musculoskeletal injury. Ongoing SETT review and device maintenance protect both communication autonomy and physical safety.'
  },
  'id5322-ch-05-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Replacing Permanent 1:1 Hovering and Earned Inclusion Rules',
    clinicalDescription:
      'A fourth grader with mild intellectual disability attends general education only when a 1:1 paraprofessional hovers directly beside the desk. When the student taps loudly during group work, staff send them to a solitary corner booth and tell the family peer activities must be "earned" after five quiet days.',
    diagnosis:
      'Fade constant adult proximity in favor of structured peer supports, visual schedule cues, and proactive positive behavior supports inside inclusive routines.',
    explanation:
      'Under IDEA, least restrictive environment is a statutory right rather than a privilege earned through silent compliance, and constant 1:1 hovering creates stigma and social isolation. Coercive seclusion booths fail to teach replacement skills and deprive the learner of natural peer modeling.'
  },
  'id5322-ch-06-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Delivering Comprehensive Age-Respectful Literacy for AAC Users',
    clinicalDescription:
      'A 14-year-old nonspeaking student with moderate ID uses an eye-gaze SGD but receives only 15 functional sight words taught from toddler picture books. The teacher omits phonics instruction and eighth-grade adapted literature because the student cannot decode passages aloud.',
    diagnosis:
      'Provide systematic phonics alongside age-respectful adapted grade-level texts, explicit vocabulary instruction, and AAC-accessible comprehension checks.',
    explanation:
      'Empirical research confirms that adolescents with intellectual disabilities—including nonspeaking AAC users—develop decoding and grade-level comprehension when taught systematic phonics and shared reading with accessible response modes. Sight-word-only routines and preschool texts impose an artificial literacy ceiling.'
  },
  'id5322-ch-07-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Presuming Authorship and Honoring Nonverbal Refusal in Writing',
    clinicalDescription:
      'During seventh-grade persuasive writing, a paraprofessional moves an adolescent\'s hand to copy a model paragraph verbatim, asks rapid-fire yes/no prompts with zero pause time, and pulls the paper back each time the student pushes it away and shakes their head.',
    diagnosis:
      'Honor communicative refusal, extend wait time, and teach authentic writing using word prediction, speech-to-text, or choice banks.',
    explanation:
      'Hand-over-hand tracing and copying-only assignments replace authentic student authorship with adult output and suppress self-advocacy. Presuming competence requires respecting nonverbal refusal cues, reducing communication-partner dominance, and providing assistive writing tools for genuine self-expression.'
  },
  'id5322-ch-08-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Fading Prompts and Programming Generalization in Functional Math',
    clinicalDescription:
      'An 11th grader with moderate ID scores 95% identifying plastic coins at a classroom table when given immediate verbal hints on every trial, yet freezes at a real grocery checkout, unable to locate the register subtotal or select enough bills independently.',
    diagnosis:
      'Use a checkout task analysis with total-task chaining, constant time delay (0s to 4s), next-dollar strategy, and community-based instruction.',
    explanation:
      'Pairing task analysis with systematic constant time delay prevents prompt dependence, while teaching across multiple authentic stores, cashiers, and price points builds true generalization. Isolated classroom drills with immediate verbal prompting create fragile skills that collapse in real community settings.'
  },
  'id5322-ch-09-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Preventing IQ-Cutoff and Language-Difference Eligibility Errors',
    clinicalDescription:
      'A bilingual third grader scores 69 on an English-only IQ test given without visual instructions. Relying exclusively on that score and one teacher\'s brief adaptive checklist—with no parent interview or home-language evaluation—the team proposes intellectual disability eligibility.',
    diagnosis:
      'Complete a nondiscriminatory evaluation integrating multi-informant home and school adaptive scales with accessible, linguistically valid testing.',
    explanation:
      'IDEA and AAIDD require concurrent deficits in intellectual functioning and adaptive behavior documented across multiple settings—never an IQ-cutoff-only or single-rater decision—while ruling out limited English proficiency as the determinant factor. Inaccessible English testing confounds language difference with ID.'
  },
  'id5322-ch-10-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Enforcing AA-AAS Eligibility Rules and BIP Fidelity Monitoring',
    clinicalDescription:
      'A principal urges assigning all six students with mild ID to the Alternate Assessment Aligned with Alternate Achievement Standards (AA-AAS) to lift school accountability scores, while one student\'s BIP relies on losing recess with zero implementation-fidelity logs and eight weeks of flat progress data.',
    diagnosis:
      'Limit AA-AAS to students with the most significant cognitive disabilities per IEP criteria, verify BIP fidelity, and revise instruction from data.',
    explanation:
      'ESSA caps statewide AA-AAS participation at 1.0% and limits eligibility to students with the most significant cognitive disabilities because alternate pathways can restrict diploma and postsecondary options. Stagnant eight-week data demand fidelity checks and function-based instructional redesign rather than punitive consequences.'
  },
  'id5322-ch-11-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Protecting Adult Rights, Family Co-Creation, and Restraint Safety',
    clinicalDescription:
      'As a student with mild ID approaches age 18, staff tell parents they must pursue full plenary guardianship, present a finalized IEP before the team convenes, and use a face-down prone restraint when the student refuses to leave a noisy cafeteria.',
    diagnosis:
      'Present less-restrictive options like supported decision-making, co-create IEP drafts with family and student, and prohibit unsafe prone restraint.',
    explanation:
      'IDEA requires timely transfer-of-rights notice and meaningful family and student participation rather than IEP predetermination or automatic plenary-guardianship steering that strips legal autonomy. Prone restraint poses severe asphyxiation risks and violates ethical, trauma-informed non-aversive crisis standards.'
  },
  'id5322-ch-12-section-04': {
    ...SPED_CASE_LABELS,
    title: 'Maintaining Teacher Supervision, Medical Scope, and Evidence-Based AAC',
    clinicalDescription:
      'A high-school special educator delegates all primary math lesson planning and gastrostomy tube feedings to a paraprofessional, allows OT and SLP to run uncoordinated pullout drills, and tolerates a colleague promoting discredited facilitated communication.',
    diagnosis:
      'Retain teacher ownership of instruction, route tube feeding to licensed nursing protocols, integrate related services, and reject facilitated communication.',
    explanation:
      'Under IDEA and CEC ethics, licensed educators hold non-delegable responsibility for instructional design and paraprofessional supervision, medical procedures must follow state nurse-delegation laws, and teams coordinate related services around evidence-based AAC rather than unproven facilitated communication.'
  }
};

module.exports = {
  special_education_early_childhood_5692,
  special_education_intellectual_disabilities_5322
};
