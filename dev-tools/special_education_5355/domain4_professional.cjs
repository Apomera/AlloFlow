'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, IDEA_SAFEGUARDS, IDEA_EVAL, SECTION_504, IDEA_DISCIPLINE, IDEA_IEP_REVIEW, IES_DATA } = sources;

module.exports = [
  {
    id: 'law-ethics-equity',
    chapterId: 'sp5355-ch-10',
    domainId: 'professional-practice-collaboration',
    domain: 'Professional Learning, Practice, and Collaboration',
    label: 'Law, Ethics, Safeguards, and Equity',
    references: [ETS, IDEA_SAFEGUARDS, IDEA_EVAL, SECTION_504, IDEA_DISCIPLINE],
    questions: [
      q(
        'What does FAPE require at a foundational level under IDEA?',
        'A candidate is asked to distinguish FAPE from a guarantee of a particular outcome. Which statement is best?',
        'Eligible students receive public special education and related services through an appropriate IEP.',
        [
          'Public schools must ensure that every eligible student reaches identical standardized achievement benchmarks.',
          'Families share tuition or co-payment expenses for specialized related services written into the IEP.',
          'A qualifying disability classification determines a uniform instructional program across the district.',
        ],
        'FAPE concerns an individualized public educational program and required services provided without charge under IDEA procedures. It does not promise a specific score or justify a category-based program.',
        [
          'FAPE requires an IEP reasonably calculated to enable appropriately ambitious progress in light of the child’s circumstances, not a guarantee of identical test scores.',
          'Under IDEA, required special education and related services must be provided at public expense and at no cost to parents.',
          'FAPE is fundamentally individualized through the IEP team process rather than assigned as a one-size-fits-all program tied to a disability label.',
        ]
      ),
      q(
        'A school suspects a disability in a student who is passing classes with extensive informal help. What duty remains relevant?',
        'A highly mobile student shows persistent disability-related needs but has not been formally referred. Which IDEA responsibility applies?',
        'Child Find requires locating, identifying, and evaluating children who may need special education, even if advancing grades.',
        [
          'District staff must wait for parents or guardians to initiate a formal written concern before reviewing needs.',
          'Passing report-card grades and grade-level promotion suspend the district’s IDEA evaluation obligations.',
          'Special education referral procedures begin once a student fails at least one required core academic course.',
        ],
        'Child Find is an affirmative obligation and is not limited to students who are failing or already referred. The school should follow screening, referral, notice, consent, and evaluation procedures as appropriate.',
        [
          'Child Find is an affirmative public-agency obligation; schools cannot wait passively for families to request an evaluation when staff suspect a disability.',
          'IDEA regulations explicitly state that Child Find covers children suspected of having a disability and needing special education even though they are advancing from grade to grade.',
          'Requiring course failure before considering evaluation violates IDEA’s affirmative identification duty and delays timely specially designed instruction.',
        ]
      ),
      q(
        'A district proposes changing a student’s placement. What procedural communication is required?',
        'A school refuses a parent’s requested evaluation. Which safeguard should the parent receive?',
        'Prior written notice explaining the proposed or refused action, reasons, evidence, and procedural safeguards.',
        [
          'A brief informal phone call summarizing the administrative decision after the classroom change takes effect.',
          'A shared building memo naming the student so staff across departments know the updated schedule.',
          'Internal administrative notes kept in the district office without written notice when staff agree on the choice.',
        ],
        'Prior written notice supports informed participation by documenting what the agency proposes or refuses and why, the records or assessments used, alternatives considered, and available safeguards.',
        [
          'IDEA requires written notice before—not after—implementing a proposed or refused change in identification, evaluation, placement, or FAPE.',
          'Circulating identifiable IEP or placement changes broadly violates student confidentiality and does not satisfy the statutory prior written notice owed to parents.',
          'Agreement among school personnel does not waive prior written notice; parents are legally entitled to a clear written explanation and notice of safeguards.',
        ]
      ),
      q(
        'A teacher wants to discuss a student’s IEP in a public elevator with a colleague who does not serve the student. What should the teacher do?',
        'An educator is asked to share identifiable disability information with staff who have no educational need to know. What is the ethical response?',
        'Protect confidentiality by discussing records in private authorized channels with staff who hold a legitimate role.',
        [
          'Discuss the IEP openly with fellow building staff because school employment grants broad access to student files.',
          'Display an abbreviated IEP accommodation chart on a shared clipboard where substitutes and visitors can consult it.',
          'Omit the student’s first name during the public conversation while describing specific classroom details.',
        ],
        'Confidentiality protects personally identifiable educational information. Professionals should use secure channels, limit access to legitimate educational interests, and follow federal, state, and local record policies.',
        [
          'Under FERPA and IDEA confidentiality provisions, access to personally identifiable records is restricted to personnel with a legitimate educational interest in serving the student.',
          'Leaving confidential IEP information accessible to visitors or unauthorized staff compromises student privacy and breaches record-security policies.',
          'Describing unique behavioral or classroom details in a public space still allows listeners to identify the student, violating confidentiality even without using a name.',
        ]
      ),
      q(
        'What is a central protection of Section 504 in public schools receiving federal funds?',
        'A student has a disability that substantially limits a major life activity but does not need specially designed instruction. Which law may still require equal access supports?',
        'Section 504 bars disability discrimination and can require accommodations and related aids for equal access.',
        [
          'Section 504 protections become available after a student first qualifies under an IDEA disability category.',
          'Section 504 requires selective academic programs to waive essential technical admission criteria for applicants.',
          'Section 504 obligations are restricted to physical building accessibility such as ramps, elevators, and restrooms.',
        ],
        'Section 504 is a civil-rights law distinct from IDEA eligibility. It protects qualified students from disability discrimination and can require an appropriate plan of access supports.',
        [
          'Section 504 has a broader functional definition of disability than IDEA and protects qualified students who do not require IDEA specially designed instruction.',
          'Section 504 requires reasonable accommodations and nondiscrimination for otherwise qualified individuals, not waiving essential program standards.',
          'While physical accessibility is included, Section 504 also covers instructional accommodations, health plans, communication aids, and equal access to school programs.',
        ]
      ),
      q(
        'A district’s referral data show one linguistic group is identified at a much higher rate. What is the best professional response?',
        'A team notices that behavior referrals disproportionately affect students from one cultural community. What should happen next?',
        'Audit definitions, instructional access, referral practices, and assessment bias using multiple sources.',
        [
          'Conclude from the referral trend that the linguistic or cultural group has a higher underlying rate of disability.',
          'Suspend all special education evaluations and behavioral screenings for students from the overrepresented group.',
          'Apply the existing referral rubric more strictly across classrooms without reviewing its cultural or linguistic fairness.',
        ],
        'Disproportionality warrants careful examination of systems and individual evidence. Teams should address bias without withholding needed evaluation or assuming that group membership explains an individual learner’s performance.',
        [
          'Treating disproportionality as proof of higher group disability ignores systemic factors such as biased definitions, unequal opportunity to learn, and language-access gaps.',
          'Halting evaluations for a specific group violates Child Find and denies individual students who genuinely need special education supports.',
          'Enforcing an unexamined, potentially biased referral tool more strictly perpetuates systemic inequity instead of fixing root causes.',
        ]
      ),
      q(
        'A colleague recommends a restrictive practice based only on social-media testimonials. What is the best ethical response?',
        'A popular intervention makes strong claims but offers no credible evidence and conflicts with a student’s plan. What should the teacher do?',
        'Evaluate credible research, ethics, student data, policy, and team review before adopting any practice.',
        [
          'Trial the trending intervention promptly in class because widespread educator enthusiasm signals practical value.',
          'Implement the unapproved strategy discreetly during small-group time to avoid delaying services for consent.',
          'Rely on personal classroom intuition and informal anecdotes in place of formal evidence and team safeguards.',
        ],
        'Safe and ethical practice integrates credible evidence, individual data, professional competence, legal requirements, and collaborative decision making. Popularity alone does not establish benefit or safety.',
        [
          'Popularity or social-media testimonials do not establish empirical efficacy or safety and cannot override a student’s individualized IEP or behavior plan.',
          'Using an unapproved or restrictive practice secretly violates parental consent, transparency, IEP fidelity, and professional ethical standards.',
          'Personal anecdote cannot replace peer-reviewed evidence, policy compliance, and multidisciplinary safeguards when student safety and access are at stake.',
        ]
      ),
    ],
  },
  {
    id: 'collaboration-families-teams',
    chapterId: 'sp5355-ch-11',
    domainId: 'professional-practice-collaboration',
    domain: 'Professional Learning, Practice, and Collaboration',
    label: 'Collaboration with Families and School Teams',
    references: [ETS, IDEA_IEP_REVIEW],
    questions: [
      q(
        'In effective co-teaching, what is the special educator’s role?',
        'A co-taught class assigns the special educator only to students with IEPs at the back table. What change is most appropriate?',
        'Share planning, instruction, assessment, and responsibility for all learners while contributing specialized expertise.',
        [
          'Serve primarily as a classroom assistant preparing photocopies and circulating while the general educator teaches.',
          'Manage whole-class behavioral reminders while the general educator directs all curriculum planning and grading.',
          'Work separately at a back table with students who have IEPs during every shared instructional period.',
        ],
        'Co-teaching is a partnership with shared ownership. Roles may vary by lesson, but both educators contribute to planning, instruction, assessment, classroom management, and access for the whole class.',
        [
          'Reducing the special educator to a clerical assistant wastes specialized instructional expertise and undermines parity in a co-taught partnership.',
          'Splitting roles strictly into behavior manager versus content teacher fragments instruction and limits specially designed instruction across the curriculum.',
          'Isolating students with IEPs permanently at a separate table recreates segregation inside an inclusive room and stigmatizes learners.',
        ]
      ),
      q(
        'How should a special educator work with a paraprofessional?',
        'A paraprofessional is supporting a new communication routine. What is the teacher’s responsibility?',
        'Provide clear direction, training, boundaries, observation, and feedback while retaining instructional responsibility.',
        [
          'Delegate annual IEP goal drafting, instructional planning, and summative grading to the paraprofessional.',
          'Encourage the paraprofessional to design and improvise specialized communication interventions independently.',
          'Withhold relevant communication goals and prompt hierarchies from the paraprofessional to protect student privacy.',
        ],
        'Teachers remain accountable for instruction and supervision. Paraprofessionals need enough authorized information, modeling, and feedback to implement supports consistently without being assigned professional duties outside their role.',
        [
          'Drafting IEP goals, designing specially designed instruction, and determining grades are licensed educator responsibilities that cannot be delegated to support staff.',
          'Asking a paraprofessional to improvise specialized routines without training or teacher direction risks inconsistent prompting and ineffective intervention.',
          'Paraprofessionals directly supporting a student have a legitimate educational need for authorized plan details so they can implement communication prompts safely and accurately.',
        ]
      ),
      q(
        'A family disagrees with the team’s interpretation of progress data. What is the best first response?',
        'During a conference, a parent reports that homework performance differs sharply from school data. What should the team do?',
        'Listen carefully, clarify concerns, review evidence together, invite home context, and plan next steps.',
        [
          'Explain that standardized school probes carry greater weight than informal family observations during homework.',
          'Pause the conference and reschedule once the family is ready to accept the team’s written progress summary.',
          'Revise the student’s annual IEP goals on the spot to match the parent’s impression before checking data.',
        ],
        'Family collaboration is reciprocal. Respectful inquiry can reveal contextual variables and improve the evidence base, while shared review keeps decisions connected to student needs and procedural requirements.',
        [
          'Dismissing parent observations undermines partnership and overlooks meaningful differences in distractions, prompts, fatigue, or generalization between home and school.',
          'Ending collaboration until families concede blocks meaningful parent participation and fails to investigate why school and home performance diverge.',
          'Changing the IEP without examining the underlying evidence together bypasses data-based decision making and may misdiagnose the actual instructional need.',
        ]
      ),
      q(
        'A student’s occupational therapist recommends a classroom positioning support. How should the teacher proceed?',
        'A speech-language pathologist suggests a communication prompt for use during academic groups. What is the best collaborative action?',
        'Clarify the goal, embed the support into authentic routines, define roles, and share outcome data.',
        [
          'Keep the positioning or communication strategy confined to pull-out therapy sessions rather than classroom lessons.',
          'Alter the specialist’s recommended setup unilaterally whenever classroom furniture or grouping feels tight.',
          'Ask the related-service specialist to assume primary responsibility for teaching the student’s classroom units.',
        ],
        'Related services support educational access. Coordination connects specialist expertise with classroom routines, promotes consistency, and creates shared data for determining whether the support is feasible and effective.',
        [
          'Restricting related-service supports to therapy rooms prevents generalization and leaves the student without needed access during authentic academic lessons.',
          'Modifying a clinical positioning or communication prompt without consulting the specialist risks discomfort, reduced effectiveness, or inconsistent cueing.',
          'Related-service providers collaborate to support educational access, while classroom educators retain joint responsibility for core curriculum instruction.',
        ]
      ),
      q(
        'How can a student contribute meaningfully to an IEP meeting?',
        'A transition-age learner will attend the IEP meeting. Which preparation best supports authentic participation?',
        'Prepare the student to share strengths, preferences, goals, and helpful supports via an accessible mode.',
        [
          'Hand the student a prewritten script to read aloud at the meeting without inviting personal input or choices.',
          'Conduct the postsecondary goal discussion privately among adults so the student avoids feeling overwhelmed.',
          'Invite the student to sit in the meeting room without previewing the agenda, terms, or participation options.',
        ],
        'Student participation supports self-determination when learners understand the process and can communicate preferences, evaluate supports, and contribute to goals with whatever access tools they need.',
        [
          'A rigid script written by adults gives the appearance of participation without fostering genuine student voice, preference sharing, or self-determination.',
          'Excluding a transition-age student from planning their own future goals runs counter to IDEA transition expectations and removes critical self-advocacy practice.',
          'Bringing a learner into an unfamiliar formal meeting without preparation or accessible communication tools creates confusion rather than meaningful engagement.',
        ]
      ),
      q(
        'Two team members disagree about whether an intervention is working. What is the strongest next step?',
        'A general and special educator offer competing explanations for low participation. How should they proceed?',
        'Define the target observably, review shared outcome and fidelity data, test one change, and reconvene.',
        [
          'Defer to the judgment of whichever educator has worked at the school longer to settle the disagreement quickly.',
          'Continue debating competing personal interpretations at weekly meetings without selecting shared outcome metrics.',
          'Modify seating, materials, grouping, and incentives simultaneously without tracking which adjustment helped.',
        ],
        'Productive collaboration converts disagreement into a testable question. Shared definitions, data, a planned change, and a follow-up point support learning while keeping the focus on student outcomes.',
        [
          'Relying on seniority instead of observable evidence undermines team parity and does not test which explanation accurately fits the student’s classroom data.',
          'Unstructured debate without operational definitions or agreed metrics stalls instructional improvement while the student’s needs remain unresolved.',
          'Changing multiple variables at once without data makes it impossible to identify what actually improved or hindered participation.',
        ]
      ),
    ],
  },
  {
    id: 'professional-learning-advocacy',
    chapterId: 'sp5355-ch-12',
    domainId: 'professional-practice-collaboration',
    domain: 'Professional Learning, Practice, and Collaboration',
    label: 'Professional Learning, Advocacy, and Boundaries',
    references: [ETS, IES_DATA, IDEA_IEP_REVIEW],
    questions: [
      q(
        'Which reflection question is most useful after an instructional unit?',
        'A teacher wants professional reflection to improve practice rather than document impressions. What should the teacher ask?',
        'Which students met the target, what error patterns emerged, and what evidence should guide next lessons?',
        [
          'Did the pacing calendar allow the class to finish every slide deck and worksheet scheduled for the unit?',
          'Did most students appear warm, enthusiastic, and personally comfortable with the teacher’s classroom style?',
          'Could most unfinished assignments be explained by fluctuating student motivation rather than lesson design?',
        ],
        'Professional reflection links educator actions to observable learner outcomes and implementation evidence. It identifies a specific change to test instead of relying on coverage, popularity, or blame.',
        [
          'Checking curriculum coverage measures pacing rather than whether learners actually mastered target concepts or which instructional scaffolds worked.',
          'Perceived likability reflects general rapport rather than diagnostic evidence of student learning, instructional effectiveness, or access barriers.',
          'Attributing missed targets broadly to student motivation deflects attention from modifiable instructional design, scaffolding, and progress-monitoring choices.',
        ]
      ),
      q(
        'How should a teacher choose professional development?',
        'A special educator has repeated difficulty designing progress measures. Which learning plan is strongest?',
        'Choose credible training matched to the practice gap, apply it with coaching, and check student outcomes.',
        [
          'Register for whichever district workshop fits an open afternoon slot regardless of alignment to classroom needs.',
          'Complete short online modules mainly to accumulate renewal certificates without altering instructional routines.',
          'Gather quick classroom tips from unvetted educator social-media threads instead of evidence-based workshops.',
        ],
        'High-value professional learning is targeted, evidence informed, applied in authentic work, supported by feedback, and evaluated through implementation and learner outcomes rather than attendance alone.',
        [
          'Choosing sessions purely for schedule convenience does not address the documented skill gap in progress-monitoring design.',
          'Accumulating attendance credits without classroom application, feedback, or outcome review produces little lasting improvement in student learning.',
          'Informal social-media posts vary widely in accuracy and lack the empirical grounding, coaching, and systematic evaluation of high-quality professional learning.',
        ]
      ),
      q(
        'A student lacks an accessible communication tool needed to participate. What is an appropriate advocacy step?',
        'A required accessibility support is repeatedly unavailable because of a scheduling problem. What should the teacher do?',
        'Document educational impact, use formal team and administrative channels, propose solutions, and follow up.',
        [
          'Assure the family verbally that the teacher will arrange specialized equipment outside district approval channels.',
          'Share details of the student’s unmet IEP accommodations publicly with community members to build pressure.',
          'Adjust classroom activities quietly around the missing support without notifying the IEP team or administration.',
        ],
        'Professional advocacy is specific, evidence based, collaborative, and persistent. It protects confidentiality, stays within role, and uses formal channels to address barriers to services, resources, and equitable participation.',
        [
          'Making unauthorized resource promises exceeds an individual teacher’s authority and can erode family trust when formal approval processes are required.',
          'Publicly disclosing a student’s confidential disability records or IEP disputes breaches FERPA/IDEA privacy obligations even when intended to advocate.',
          'Working quietly around a recurring access barrier leaves an IEP implementation failure undocumented and deprives the student of required FAPE supports.',
        ]
      ),
      q(
        'A student reveals information suggesting immediate risk of harm and asks the teacher to keep it secret. What should the teacher do?',
        'An educator learns of a possible abuse or safety concern. Which response is professionally appropriate?',
        'Follow mandatory reporting and safety protocols promptly, share with authorized personnel, and avoid promising secrecy.',
        [
          'Conduct private follow-up interviews with peers and family members to verify the report before notifying authorities.',
          'Agree to keep the student’s disclosure completely confidential so counseling trust and rapport remain intact.',
          'Consult informally with several colleagues in the staff lounge to gauge whether the concern warrants reporting.',
        ],
        'Safety and reporting duties override a promise of secrecy. Educators should know their jurisdiction and policy, report through required channels, preserve privacy, and avoid conducting an unauthorized investigation.',
        [
          'Educators are mandated reporters, not investigators; conducting an unauthorized investigation can compromise child safety and interfere with official protective agencies.',
          'Promising secrecy when immediate harm or suspected abuse is disclosed violates legal reporting duties and endangers the student.',
          'Discussing sensitive safety disclosures with unrelated colleagues breaches confidentiality rather than routing the report promptly through authorized channels.',
        ]
      ),
      q(
        'A transition team wants an adult-service agency representative to attend an IEP meeting. What safeguard matters?',
        'An outside employment provider may contribute to transition planning. What should the school address before inviting the representative?',
        'Secure required parent or adult-student consent before inviting an outside agency likely to fund or deliver services.',
        [
          'Send a meeting invitation to the outside agency automatically because transition planning is on the agenda.',
          'Transfer ongoing IDEA transition obligations to the outside employment agency once its representative attends.',
          'Wait until after the student graduates from high school before coordinating contacts with adult-service agencies.',
        ],
        'Transition collaboration can improve continuity, but outside-agency participation must follow consent and confidentiality requirements. The public agency retains its IDEA responsibilities even when another agency is involved.',
        [
          'IDEA regulations explicitly require prior consent from parents—or the student who has reached the age of majority—before inviting an outside transition agency.',
          'Inviting an outside partner supports interagency linkage, but the school district retains its legal IDEA duty to provide transition services and reconvene if an agency does not follow through.',
          'Waiting until after graduation defeats seamless transition planning and misses the opportunity to establish eligibility and supports before IDEA entitlement ends.',
        ]
      ),
      q(
        'Why should special educators verify current state and local requirements in addition to studying federal baselines?',
        'A candidate learns the federal IDEA transition age but will practice in a state with additional rules. What is the correct professional habit?',
        'Federal law sets the baseline, while state statutes, licensure rules, and local policies may add stricter protections.',
        [
          'Local district handbooks may reduce federal IDEA procedural rights whenever regional staffing is constrained.',
          'A published certification study guide remains an authoritative legal substitute for current state regulations.',
          'Special education timelines and transition ages stay uniform across states and rarely change after passage.',
        ],
        'Competent practice checks current authoritative requirements. State and local rules can provide additional protections or earlier timelines but cannot reduce controlling federal rights; this study tool is not legal advice.',
        [
          'State and local policies may expand protections or set earlier timelines—such as age-14 transition planning—but they can never undercut controlling federal IDEA rights.',
          'Study guides summarize foundational concepts and cannot replace current official statutes, state administrative codes, or district compliance procedures.',
          'States frequently differ in evaluation timelines, caseload rules, and transition start ages, and regulations evolve over time, requiring ongoing verification.',
        ]
      ),
    ],
  },
];
