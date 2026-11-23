'use strict';

const BASE_CASE_META = {
  schemaVersion: 1,
  label: 'Applied practice case',
  presentationLabel: 'Case presentation',
  answerLabel: 'Best professional decision',
  explanationLabel: 'Evidence-based rationale',
};

const school_psychologist_5403 = {
  'sp5403-ch-01-section-04': {
    ...BASE_CASE_META,
    title: 'Divergent RIOT/ICEL Attention and Reading Data in Grade 4',
    clinicalDescription:
      'A Grade 4 student is referred for inattention and reading struggles. WISC-V FSIQ is 94, WIAT-4 reading comprehension is 78, teacher BASC-3 attention is T=72, and parent attention is T=53. Structured observation shows 88% on-task behavior during hands-on science labs versus 42% during unassisted independent reading.',
    diagnosis:
      'Synthesize RIOT/ICEL convergence and divergence around reading demands, note score uncertainty, and target decoding before assuming ADHD.',
    explanation:
      'NASP problem solving requires synthesizing RIOT/ICEL evidence across settings rather than listing isolated scores. Because off-task behavior peaks during difficult text tasks while home and science ratings remain typical, attributing attention gaps to intrinsic ADHD overlooks task-escape reading barriers and overstates single-informant ratings.',
  },
  'sp5403-ch-02-section-04': {
    ...BASE_CASE_META,
    title: 'Nondiscriminatory SLD Evaluation for an Emergent Bilingual Learner',
    clinicalDescription:
      'A Grade 3 Spanish-English emergent bilingual student (WIDA Level 2.4, 18 months in U.S. schools) scores SS 74 on English verbal comprehension and SS 76 on English oral reading. Her family reports rich Spanish storytelling and steady gains in bilingual tutoring, yet the teacher requests immediate SLD eligibility.',
    diagnosis:
      'Conduct bilingual nondiscriminatory evaluation with dynamic assessment and opportunity-to-learn review rather than classifying SLD from English norms.',
    explanation:
      'Under IDEA and NASP standards, English-normed tests introduce construct-irrelevant linguistic variance for developing bilinguals. Distinguishing language acquisition from disability requires cross-linguistic evidence, instructional history, and intervention response rather than treating low English test scores as innate cognitive deficits.',
  },
  'sp5403-ch-03-section-04': {
    ...BASE_CASE_META,
    title: 'Interagency Consultation Boundaries and Attendance Outcome Tracking',
    clinicalDescription:
      'A Grade 6 parent signs a release for the school psychologist to coordinate with an outpatient CBT therapist treating school-avoidant anxiety. The therapist requests the full cumulative folder and raw protocols, while student attendance remains 62% after three weeks of informal hallway check-ins with no shared metric.',
    diagnosis:
      'Share only consent-authorized attendance and trigger data, define clear school-clinic roles, and track weekly attendance goals in consultation.',
    explanation:
      'FERPA and NASP consultation ethics restrict external disclosures to parent-authorized, purpose-relevant information rather than transferring full cumulative records or raw test protocols. Aligning clinic coping tools with classroom re-entry routines and tracking weekly attendance verifies whether consultation actually improves outcomes.',
  },
  'sp5403-ch-04-section-04': {
    ...BASE_CASE_META,
    title: 'MTSS Reading CBM Goal-Line Decision Rule After High-Fidelity Tier 2',
    clinicalDescription:
      'A Grade 2 student attends Tier 2 small-group phonics 25 minutes four times weekly with 95% logged fidelity and full attendance. After six weeks of weekly ORF CBM probes, four consecutive scores fall below the aimline (median 31 WCPM vs. 46 WCPM target), with miscues concentrated on multisyllabic vowel teams.',
    diagnosis:
      'Apply the four-point decision rule to intensify instruction via error analysis and Tier 3 explicit decoding adjustments rather than waiting or bypassing MTSS.',
    explanation:
      'Four consecutive CBM points below the aimline under verified implementation fidelity signal insufficient response to current Tier 2 dosage or skill alignment. Adjusting instructional explicitness and group intensity before inferring disability maintains evidence-based decision rules and avoids passive waiting or premature referral.',
  },
  'sp5403-ch-05-section-04': {
    ...BASE_CASE_META,
    title: 'Differential Screening for Somatic Complaints and Withdrawal in Grade 8',
    clinicalDescription:
      'Following a parent hospitalization, a formerly high-achieving Grade 8 student shows six weeks of social withdrawal, irritability, daytime fatigue, declining homework completion, and frequent nurse visits for headaches. Her advisor asks for a quick depression screen and immediate weekly coping sessions.',
    diagnosis:
      'Complete a safety check and multimethod screening to test medical, stressor, and mood hypotheses before pairing school support with clinical referral.',
    explanation:
      'Withdrawal, headaches, and fatigue can reflect sleep deprivation, physical illness, acute family stress, or emerging mood disorder. Ruling out immediate safety risk and gathering parent, nurse, and teacher input prevents misdirected counseling while establishing clear progress and maintenance benchmarks.',
  },
  'sp5403-ch-06-section-04': {
    ...BASE_CASE_META,
    title: 'Imminent Suicide Risk Disclosure During a High School FBA Follow-Up',
    clinicalDescription:
      'During a Tier 2 FBA check-in, a Grade 10 student reveals fresh forearm cuts and states she has a bottle of pills in her backpack and plans to swallow them after track practice tonight. Tearfully, she asks the school psychologist to promise secrecy and offers to sign a safety contract instead of calling home.',
    diagnosis:
      'Maintain continuous supervision, activate the suicide crisis protocol, notify caregivers per policy, and coordinate emergency evaluation and reentry.',
    explanation:
      'Explicit intent, plan, and access to lethal means represent imminent risk requiring immediate protective action. Under NASP ethics and school safety protocols, duty to protect overrides confidentiality, and verbal promises or no-harm contracts never replace supervised crisis triage, caregiver involvement, and continuity planning.',
  },
  'sp5403-ch-07-section-04': {
    ...BASE_CASE_META,
    title: 'Disaggregated PBIS Fidelity Audit After Aggregate Referral Gains',
    clinicalDescription:
      'One year after launching Tier 1 PBIS expectations, schoolwide office discipline referrals dropped 18%. However, disaggregated reports show Black students still receive subjective defiance referrals at 2.9 times the rate of peers, and fidelity walkthroughs show only 54% of classrooms meet positive-feedback targets.',
    diagnosis:
      'Coach Tier 1 core-component fidelity across classrooms, operationalize subjective referral definitions, and monitor disaggregated equity outcomes quarterly.',
    explanation:
      'Aggregate referral declines often obscure inequitable discipline patterns and incomplete Tier 1 adoption. Implementation science calls for coaching core behavioral practices and defining observable infraction criteria rather than attributing disparities to students or overloading Tier 3 with individual behavior plans.',
  },
  'sp5403-ch-08-section-03': {
    ...BASE_CASE_META,
    title: 'Multidisciplinary Behavioral Threat Assessment Versus Zero-Tolerance Removal',
    clinicalDescription:
      'After weeks of cafeteria taunting, a Grade 9 student posts online that he will "make the lunchroom regret messing with me." An assistant principal plans an immediate 10-day suspension and expulsion referral without interviewing the student, reviewing supports, or notifying the school threat assessment team.',
    diagnosis:
      'Convene the multidisciplinary threat assessment team to evaluate context, intent, means, and protective factors before choosing safety and support steps.',
    explanation:
      'Evidence-based behavioral threat assessment distinguishes transient anger from substantive threats through structured inquiry across school, family, and safety contexts. Reflexive zero-tolerance suspension fails to assess lethal means, intensifies grievance, and leaves safety risks unmonitored outside school.',
  },
  'sp5403-ch-09-section-04': {
    ...BASE_CASE_META,
    title: 'Family-Driven Wraparound Reentry After Residential Placement',
    clinicalDescription:
      'A Grade 11 student with an emotional disability and probation oversight returns from a 30-day residential program. School staff, the probation officer, and an outpatient clinician each draft separate compliance checklists without inviting the student or his grandmother to shape reentry priorities or schedules.',
    diagnosis:
      'Convene a family-driven wraparound transition team centering student voice, shared strengths-based goals, clear roles, and signed consent boundaries.',
    explanation:
      'Competing, adult-imposed mandates erode family trust and destabilize reentry transitions. NASP family-school-community collaboration emphasizes culturally responsive partnership, shared outcome metrics, signed consent scopes, and coordinated accountability so school and community supports reinforce one another.',
  },
  'sp5403-ch-10-section-04': {
    ...BASE_CASE_META,
    title: 'Upstream Equity Audit for Emotional Disturbance Disproportionality',
    clinicalDescription:
      'A district equity review reveals Indigenous students carry a 3.4 risk ratio for Emotional Disturbance eligibility. Further inspection shows only 12% received documented Tier 2 behavioral supports prior to referral compared with 61% of White peers referred for comparable classroom disruptions.',
    diagnosis:
      'Audit upstream referral, screening, discipline, and Tier 2 reach decision points to fix unequal prereferral support access rather than setting quotas.',
    explanation:
      'Disproportionality frequently accumulates upstream through biased discipline gateways and unequal Tier 2 intervention reach. Correcting access gaps and standardizing prereferral criteria addresses systemic roots, whereas imposing numeric eligibility quotas violates IDEA individualized evaluation mandates.',
  },
  'sp5403-ch-11-section-03': {
    ...BASE_CASE_META,
    title: 'Appraising External Validity of a Commercial Cognitive Training App',
    clinicalDescription:
      'A vendor markets a costly working-memory computer program to a Title I urban middle school, citing one non-randomized pilot of 24 suburban private-school students whose digit-span scores rose. The brochure promises rapid gains in state reading proficiency without local implementation coaching.',
    diagnosis:
      'Decline adoption, appraise design rigor and external validity, and prioritize replicated reading interventions matching local learners and capacity.',
    explanation:
      'Evidence-based practice integrates methodological quality, transfer evidence, and local population fit. Small non-randomized trials demonstrating narrow cognitive-task gains rarely transfer to reading comprehension, making replicated direct literacy instruction with local fidelity checks a sounder investment.',
  },
  'sp5403-ch-12-section-04': {
    ...BASE_CASE_META,
    title: 'Mandated Child-Abuse Reporting Despite Administrative Delay Request',
    clinicalDescription:
      'During a triennial IEP reevaluation, a Grade 5 student discloses recent belt welts on her back from a caregiver and begs the psychologist not to tell anyone. When briefed, the principal suggests waiting until Friday to hold a parent conference and "hear both sides" before contacting child protective services.',
    diagnosis:
      'File an immediate mandated child-abuse report per state law, document objective facts accurately, and explain protective steps to the student without delay.',
    explanation:
      'Under NASP Ethical Principles and state mandated-reporting statutes, reasonable suspicion requires prompt reporting to child protective services without administrative veto. Delaying to confront caregivers can escalate danger to the child, compromise forensic inquiry, and violate legal protection duties.',
  },
};

const school_counselor_5422 = {
  'sc5422-ch-01-section-04': {
    ...BASE_CASE_META,
    title: 'Disaggregated AP Enrollment Equity Advocacy and Barrier Removal',
    clinicalDescription:
      'High school data show 38% of low-income and multilingual Grade 10 students earn B+ or higher in honors algebra yet make up only 9% of AP STEM enrollments. Course entry currently relies on an English-only teacher nomination slip sent home during a one-week spring window.',
    diagnosis:
      'Use disaggregated access data to advocate for replacing nomination gatekeeping with open, criteria-based AP placement and multilingual family outreach.',
    explanation:
      'Under the ASCA National Model Define domain, school counselors lead systemic advocacy to dismantle avoidable policy barriers. Offering individual study tips alone leaves an inequitable gatekeeping structure intact, whereas partnering with leadership and families expands rigorous course access for every qualified learner.',
  },
  'sc5422-ch-02-section-03': {
    ...BASE_CASE_META,
    title: 'Addressing Escape-Maintained Presentation Anxiety in Grade 7',
    clinicalDescription:
      'A Grade 7 student refuses oral presentations in English, telling the counselor "everyone will laugh and prove I am stupid." When he puts his head down, the teacher sends him to the hallway, providing immediate relief. Meanwhile, a trusted peer mentor successfully models brief partner-read warmups.',
    diagnosis:
      'Pair cognitive reframing of catastrophic beliefs with graduated peer-modeled speaking practice and specific positive reinforcement rather than hallway escape.',
    explanation:
      'Combining cognitive appraisal, social learning, and behavioral principles targets both distorted threat thoughts and negative reinforcement of avoidance. Routine hallway removal strengthens escape behavior, while incremental modeled mastery and reinforcement build self-efficacy and measurable classroom participation.',
  },
  'sc5422-ch-03-section-04': {
    ...BASE_CASE_META,
    title: 'Ethical Confidentiality Balance and Section 504 Exploration in Grade 11',
    clinicalDescription:
      'A Grade 11 student with documented panic episodes discloses skipping fourth-period chemistry twice weekly to hide in the restroom. Her grade has fallen to 54%, and she asks the counselor to promise total secrecy from her parents and teachers while she tries to handle the stress alone.',
    diagnosis:
      'Apply an ethical decision model, consult a supervisor, clarify confidentiality limits, engage caregivers collaboratively, and explore Section 504 supports.',
    explanation:
      'ASCA Ethical Standards require balancing adolescent privacy with caregiver rights and academic welfare through disciplined consultation. Promising absolute secrecy leaves safety and attendance unaddressed, while abruptly calling home without student collaboration can fracture trust and derail Section 504 planning.',
  },
  'sc5422-ch-04-section-03': {
    ...BASE_CASE_META,
    title: 'Scope-of-Practice Boundary and Warm Trauma Referral in Grade 10',
    clinicalDescription:
      'Across six brief school counseling sessions after a serious car crash, a Grade 10 student reports intensifying flashbacks, nightly insomnia, and intrusive trauma memories. Despite classroom grounding cards and weekly goal checks, her attendance and core course grades continue slipping.',
    diagnosis:
      'Keep brief, observable school coping goals while partnering with caregivers on a warm, supported referral to a trauma-specialized community clinician.',
    explanation:
      'Under ASCA scope-of-practice standards, school counseling is brief and tied to educational functioning rather than long-term clinical trauma therapy. Attempting intensive trauma treatment in school exceeds role boundaries and delays care, whereas a supported referral with follow-up bridges clinical recovery and school success.',
  },
  'sc5422-ch-05-section-04': {
    ...BASE_CASE_META,
    title: 'Rejecting Peer Mediation for Power-Imbalanced Cyberbullying in Middle School',
    clinicalDescription:
      'For three consecutive weeks, two Grade 8 students corner a Grade 6 student with a speech impediment at his locker, film his distress, and circulate mocking clips in a group chat. An administrator recommends scheduling a voluntary peer mediation session so the students can "talk it out."',
    diagnosis:
      'Decline peer mediation due to power imbalance, activate bullying protection and reporting protocols immediately, and provide targeted victim safety support.',
    explanation:
      'Peer mediation applies to reciprocal conflicts with relatively balanced power, never ongoing bullying or cyberharassment. Placing a targeted younger student across from aggressors risks intimidation and retaliation; ASCA-aligned response prioritizes immediate safety, administrative accountability, and caregiver notification.',
  },
  'sc5422-ch-06-section-03': {
    ...BASE_CASE_META,
    title: 'Fluid Tier 2 MTSS Support Without Permanent Student Tier Labels',
    clinicalDescription:
      'Midyear screening identifies 18 Grade 5 students with five or more tardies and recess-transition referrals. Several teachers begin calling them "the Tier 2 kids" and request permanent small-group pullout for the rest of the year without reviewing classroom transition routines.',
    diagnosis:
      'Run time-limited Tier 2 skill groups with clear exit criteria while coaching Tier 1 transition fidelity and rejecting fixed student tier labels.',
    explanation:
      'Within MTSS, tiers describe flexible service intensities rather than fixed student identities. Auditing Tier 1 transition fidelity and pairing brief Tier 2 interventions with progress-monitoring exit rules prevents stigmatizing labels and ensures counseling supports target modifiable skill barriers.',
  },
  'sc5422-ch-07-section-04': {
    ...BASE_CASE_META,
    title: 'Advisory Council Governance, FERPA Privacy, and Counselor Role Boundaries',
    clinicalDescription:
      'At the fall school counseling advisory council meeting, a parent member demands individual discipline records for students in an attendance group and urges the counselor to cut classroom SEL lessons in order to supervise daily cafeteria duty alongside assistant principals.',
    diagnosis:
      'Share only aggregate program data to uphold FERPA privacy and align role expectations through the ASCA annual administrative conference.',
    explanation:
      'ASCA advisory councils offer representative stakeholder input on program vision, reach, and aggregate outcomes, never individual confidential files or non-counseling supervisory duties. Upholding privacy and role boundaries preserves 80% direct and indirect student service delivery.',
  },
  'sc5422-ch-08-section-04': {
    ...BASE_CASE_META,
    title: 'Accurate Percentile Rank Interpretation During Grade 9 Course Advising',
    clinicalDescription:
      'After reviewing a Grade 9 career and college-readiness benchmark, a parent asks to withdraw her son from college-prep electives because his 55th percentile rank looks like a failing 55% score. His classroom grades are B+ and his interest inventory highlights engineering pathways.',
    diagnosis:
      'Explain that the 55th percentile equals or exceeds 55% of peers—solidly average—and integrate grades and career interests before course advising.',
    explanation:
      'Confusing norm-referenced percentile ranks with percent-correct mastery leads to harmful course-placement restrictions. Under ASCA Manage measurement principles, valid advising explains score meaning and error bands while triangulating grades, interests, and aspirations rather than relying on one number.',
  },
  'sc5422-ch-09-section-04': {
    ...BASE_CASE_META,
    title: 'Multilingual Communication Plan to Close Family Access Gaps',
    clinicalDescription:
      'A middle school publishes its counseling referral form, crisis protocol, and high-school transition workshop schedule solely as an English PDF on the school website. Spring participation logs reveal 82% of families speaking languages other than English never accessed workshops or referral links.',
    diagnosis:
      'Launch a proactive multilingual communication plan across accessible channels with interpreter support, clear privacy limits, and staff outreach training.',
    explanation:
      'Passive English-only web postings create predictable structural barriers for multilingual caregivers. Under ASCA Manage operations standards, equitable access requires repeated, translated communication of services and urgent-help pathways paired with monitored participation across family language groups.',
  },
  'sc5422-ch-10-section-03': {
    ...BASE_CASE_META,
    title: 'Pre-Delivery Baseline and Aligned Evaluation for Senior FAFSA Lessons',
    clinicalDescription:
      'Before delivering a six-week Grade 12 FAFSA and postsecondary planning classroom curriculum, a counselor plans to evaluate effectiveness solely through a five-point final-day survey asking seniors whether they enjoyed the slides and found the counselor approachable.',
    diagnosis:
      'Establish pre-delivery FAFSA completion and knowledge baselines, align Mindsets & Behaviors and outcome measures, and set decision rules for targeted follow-up.',
    explanation:
      'Satisfaction surveys capture perception rather than student learning or postsecondary behavior change. ASCA Assess standards require designing aligned evaluation before delivery—pairing participation, pre/post Mindset & Behaviors checks, and FAFSA completion rates with clear triggers for follow-up support.',
  },
  'sc5422-ch-11-section-04': {
    ...BASE_CASE_META,
    title: 'Transparent Disaggregated Results Reporting for a Grade 6 Attendance Group',
    clinicalDescription:
      'A Grade 6 attendance group (n=14) increased mean attendance from 83% to 91%, yet three students facing morning bus barriers showed zero gain and two sessions were canceled for state testing. A draft faculty slide claims the group "proved 100% effectiveness" across campus.',
    diagnosis:
      'Report disaggregated results with clear visuals, dosage limitations, and transportation follow-up rather than claiming universal causal proof.',
    explanation:
      'Decision-focused ASCA results reports connect participation, learning, and outcome evidence to next-step improvements. Disclosing small sample size, missed sessions, and non-responder needs avoids misleading causal claims while directing team advocacy toward concrete transportation barriers.',
  },
  'sc5422-ch-12-section-04': {
    ...BASE_CASE_META,
    title: 'Phased Scaling of a Grant-Funded Grade 9 Peer-Mentoring Pilot',
    clinicalDescription:
      'A pilot Grade 9 peer-mentoring transition program in one academy cut first-semester course failures by 22% using two grant-funded coordinator stipends and weekly counselor coaching. District leaders propose mandating immediate unfunded expansion to all six high schools next month.',
    diagnosis:
      'Identify core components, evaluate fidelity, staffing capacity, and equitable reach, and propose a phased, sustainably funded scale-up plan.',
    explanation:
      'Expanding an intervention rapidly without protecting core components such as mentor training, coaching, and time undermines fidelity and widens site inequities. ASCA continuous-improvement advocacy pairs durability evidence with realistic resourcing and ongoing monitoring before districtwide mandates.',
  },
};

module.exports = {
  school_psychologist_5403,
  school_counselor_5422,
};
