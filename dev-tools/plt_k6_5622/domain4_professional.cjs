'use strict';

const { sources, q } = require('./sources.cjs');
const { ETS, INTASC, IES_GUIDES, IES_DATA, FERPA, ENGLISH_LEARNERS, IDEA_MTSS, DISABILITY_RIGHTS, EOP } = sources;

module.exports = [
  {
    id: 'reflection-research-professional-learning',
    chapterId: 'plt5622-ch-10',
    domainId: 'professional-development-leadership-community',
    domain: 'Professional Development, Leadership, and Community',
    label: 'Reflection, Research, and Professional Learning',
    references: [ETS, INTASC, IES_GUIDES, IES_DATA],
    questions: [
      q(
        'Which reflective-practice cycle is most likely to improve instruction?',
        'A teacher notices that discussion participation is inequitable. What should happen after identifying the concern?',
        'Define the access question, collect data, weigh assumptions, test one focused shift, and review.',
        [
          'Record a brief personal feeling about the lesson in a journal without altering future classroom routines.',
          'Adopt an appealing new discussion technique right away before gathering baseline participation evidence.',
          'Judge whether classroom discussion improved primarily by whether the teacher intended to be inclusive.',
        ],
        'Reflection becomes professional inquiry when it connects goals and evidence with a reasoned adjustment and follow-up rather than remaining an impression.',
        [
          'Recording personal impressions without taking a reasoned, evidence-based instructional step leaves inequitable classroom discussion patterns completely unchanged.',
          'Choosing an appealing fix before inspecting baseline evidence risks addressing the wrong barrier instead of matching the actual classroom need.',
          'Positive educator intentions alone cannot verify whether quieter or marginalized learners actually gained equitable discussion access and voice.',
        ]
      ),
      q(
        'Which professional-learning experience is most likely to transfer into classroom practice?',
        'A one-time workshop introduces a useful strategy, but implementation is inconsistent. What support should follow?',
        'Link the strategy to student needs via modeling, co-planning, classroom use, feedback, and review.',
        [
          'Schedule an identical follow-up lecture summarizing the same slide deck for the faculty next month.',
          'Expect teachers to implement the new strategy accurately after one workshop without coaching or rehearsal.',
          'Conduct formal evaluative ratings on the new strategy before clarifying shared implementation criteria.',
        ],
        'Job-embedded, sustained, collaborative professional learning supports enactment and refinement better than exposure alone.',
        [
          'Repeating a passive faculty lecture rarely resolves practical classroom enactment barriers that require sustained co-planning, rehearsal, and coaching feedback.',
          'Expecting fluent classroom transfer from one isolated session overlooks the active rehearsal and coaching needed to embed complex strategies.',
          'Evaluating staff formally before clarifying shared criteria and supporting practice creates workplace defensiveness rather than authentic professional growth.',
        ]
      ),
      q(
        'A study reports that students using a program had higher outcomes than a comparison group, but assignment was not random and baseline groups differed. What is the strongest conclusion?',
        'A teacher reads a correlational program evaluation with important group differences. How should the claim inform practice?',
        'Treat it as limited correlational data, weigh baseline bias, and pair with stronger research locally.',
        [
          'Conclude confidently that the commercial program directly caused the higher student achievement gains.',
          'Dismiss every educational study that lacks random assignment as offering zero value for local planning.',
          'Expect the identical outcome gain to appear across every local classroom once the program is purchased.',
        ],
        'Educators interpret evidence according to design quality, comparison, measurement, implementation, context, uncertainty, and convergence rather than a headline alone.',
        [
          'Without random assignment and baseline equivalence, preexisting group differences—rather than the commercial program—may explain the observed outcome gap.',
          'Non-randomized studies still offer useful descriptive or feasibility insights when interpreted cautiously alongside stronger convergent research evidence.',
          'Program effects depend heavily on local context, student needs, and fidelity, so one study cannot guarantee identical outcomes everywhere.',
        ]
      ),
      q(
        'What can a teacher reasonably learn from a small classroom action-research cycle?',
        'A teacher changes a feedback routine and sees improvement over four weeks without a comparison group. What claim is defensible?',
        'Local data can guide continued adaptation, yet cannot prove causality or broad generalization alone.',
        [
          'The four-week classroom gain proves the feedback routine works effectively across every school district.',
          'Small classroom inquiry yields no useful professional insight because formal comparison groups are absent.',
          'Any observed gain across four weeks must stem from the single feedback routine rather than other shifts.',
        ],
        'Action inquiry supports disciplined local learning when measures and implementation are documented, while causal and generalizability limits remain explicit.',
        [
          'One small classroom cycle without control groups cannot establish broad external generalizability or causal proof across diverse school districts.',
          'Action research provides valuable formative evidence for refining local instructional practice even when formal causal claims remain carefully bounded.',
          'Maturation, unit topic changes, or parallel supports can contribute to four-week gains, so single-cause attribution overclaims local evidence.',
        ]
      ),
      q(
        'Which use of a mentor best supports a beginning teacher’s development?',
        'A novice teacher struggles with transitions and wants actionable help. What mentoring response is strongest?',
        'Clarify goals, co-plan and model one manageable routine, observe agreed data, and give private feedback.',
        [
          'Step in and lead the novice teacher’s daily classroom transitions indefinitely so routines stay calm.',
          'Forward every routine question the beginning teacher raises directly to building administrators as a flaw.',
          'Offer warm general encouragement after school without observing transitions or giving concrete suggestions.',
        ],
        'Effective mentoring combines relational trust with concrete practice, evidence, feedback, role clarity, and follow-up rather than dependence or surveillance.',
        [
          'Taking over the class indefinitely prevents the novice teacher from practicing routines, troubleshooting breakdowns, and building independent authority.',
          'Breaching coaching trust by reporting routine learning questions to leadership turns supportive instructional mentoring into punitive workplace surveillance.',
          'Offering warm general encouragement without focused classroom observation and concrete feedback leaves daily transition challenges completely unresolved.',
        ]
      ),
      q(
        'What should be established before a peer observation used for professional learning?',
        'Two colleagues want to learn from one another’s questioning practices. Which design best protects usefulness and trust?',
        'Agree on the focus question, evidence, observer role, confidentiality bounds, feedback, and next steps.',
        [
          'Conduct the peer classroom visit as an unannounced formal personnel evaluation submitted to leadership.',
          'Attempt to record every observable classroom behavior during the period without choosing a clear focus.',
          'Circulate raw peer observation notes across the grade-level email list without consent or policy review.',
        ],
        'Focused peer observation supports inquiry when purpose, evidence, roles, confidentiality, feedback, and intended use are transparent.',
        [
          'Turning a voluntary peer-learning visit into an undisclosed formal evaluation destroys collegial trust and violates transparent professional role boundaries.',
          'Recording unfocused classroom details produces noisy notes rather than actionable evidence centered on the agreed questioning practice.',
          'Sharing peer observation notes broadly without consent breaches clear confidentiality agreements and discourages honest, reflective professional inquiry.',
        ]
      ),
      q(
        'Which professional goal is most actionable?',
        'A teacher writes, “Become better at differentiation.” How should the goal be improved?',
        'Name learner need, target practice, baseline data, action steps, supports, evidence, and review date.',
        [
          'Adopt a brief motivational teaching slogan for the year without attaching observable classroom metrics.',
          'Pick an ambitious year-end test score target without naming any instructional change or practice steps.',
          'Base the professional growth goal on a staffing outcome controlled primarily by district administrators.',
        ],
        'A strong growth goal links a meaningful student need with a specific practice, learning supports, observable evidence, and a time-bounded inquiry cycle.',
        [
          'An inspiring professional slogan lacks baseline data, concrete classroom actions, and observable evidence criteria needed to track growth.',
          'Naming a year-end test score without specifying instructional practices and monitoring cycles gives no actionable plan for improving teaching.',
          'Setting goals outside an educator’s direct sphere of influence cannot guide deliberate daily classroom practice, reflection, and adjustment.',
        ]
      ),
    ],
  },
  {
    id: 'collaboration-families-supports-community',
    chapterId: 'plt5622-ch-11',
    domainId: 'professional-development-leadership-community',
    domain: 'Professional Development, Leadership, and Community',
    label: 'Collaboration, Families, Support Personnel, and Community',
    references: [ETS, INTASC, FERPA, ENGLISH_LEARNERS],
    questions: [
      q(
        'A student needs coordinated academic, communication, and motor supports. What is the classroom teacher’s strongest collaborative role?',
        'Several specialists work with one learner, but classroom recommendations are disconnected. What should the teacher do?',
        'Share classroom data, clarify roles, align feasible routines with the team, and track progress privately.',
        [
          'Ask one related-service specialist to take over all daily classroom scheduling and instructional decisions.',
          'Set aside specialist recommendations that require coordination across classroom transitions or routines.',
          'Email the complete cumulative evaluation file to every building staff member so everyone stays informed.',
        ],
        'Teachers contribute instructional context and carry out team decisions while respecting professional roles, privacy, family participation, and coordinated monitoring.',
        [
          'Handing over full classroom authority abdicates the teacher’s instructional role instead of building a cohesive, integrated team plan.',
          'Ignoring specialist recommendations fragments equitable student access and undermines coordinated classroom implementation of agreed team supports.',
          'Distributing full cumulative student records broadly to building staff without a legitimate educational interest violates federal FERPA confidentiality.',
        ]
      ),
      q(
        'What makes a family conference reciprocal rather than one-way reporting?',
        'A teacher needs to discuss learning progress with caregivers. Which plan best builds partnership?',
        'Invite family goals and insights, ensure language access, share clear evidence, and co-plan next steps.',
        [
          'Read through the printed report-card grades efficiently and close the meeting once averages are covered.',
          'Assume caregivers hold the exact same homework priorities and schedules without asking about home context.',
          'Focus the entire conference on missed assignments and academic deficits so urgent problems receive priority.',
        ],
        'Reciprocal partnership treats families as knowledgeable collaborators and connects accessible evidence, assets, concerns, shared actions, and follow-up.',
        [
          'One-way grade reading leaves no space for family observations, reciprocal questions, or shared planning around student learning needs.',
          'Assuming uniform family priorities overlooks valuable cultural knowledge, home strengths, and practical scheduling realities shared by caregivers.',
          'Focusing strictly on academic weaknesses erodes family trust and overlooks learner strengths that can anchor collaborative next steps.',
        ]
      ),
      q(
        'Which step should begin a collaborative team action plan?',
        'A grade-level team wants to improve student transitions but members disagree about the problem. What should happen first?',
        'Clarify shared purpose and observable problem data first, then set roles, measures, and review dates.',
        [
          'Divide up classroom tasks immediately so members feel productive before reaching agreement on the goal.',
          'Allow the most vocal team member to define the problem statement and success metric to save meeting time.',
          'Keep team agreements verbal and informal rather than documenting roles, measures, or follow-up dates.',
        ],
        'Collaboration is strengthened by a shared evidence-based purpose, meaningful participation, clear responsibility, communication, and accountability for review.',
        [
          'Assigning tasks before agreeing on the observable problem produces misaligned effort and duplicated work across participating classrooms.',
          'Letting one dominant voice override team parity suppresses relevant classroom evidence and reduces shared ownership of the plan.',
          'Skipping written roles, metrics, and review dates makes it impossible to track implementation or evaluate whether transitions improved.',
        ]
      ),
      q(
        'How should a school communicate essential information to caregivers with limited English proficiency?',
        'A family must understand a consequential school decision and requests language assistance. What should the teacher arrange?',
        'Use qualified school language-access procedures, speak directly with caregivers, and check understanding.',
        [
          'Ask an older sibling or the student to interpret important school decisions during the family conference.',
          'Send an unreviewed automated online translation for a high-stakes notice without checking accuracy.',
          'Send repeated printed copies of the English notice home until caregivers sign and return the form.',
        ],
        'Meaningful language access and confidentiality require qualified supports and direct respectful communication, especially for important or sensitive information.',
        [
          'Relying on children or siblings to interpret sensitive school matters compromises privacy, accuracy, and ethical family communication.',
          'Unreviewed machine translations often garble legal or educational terminology on high-stakes decisions and require qualified human review.',
          'Sending repeated English-only notices fails to provide meaningful, understandable language access required under federal civil-rights obligations.',
        ]
      ),
      q(
        'Which collaboration practice best supports a paraeducator assigned to a classroom?',
        'A paraeducator receives vague directions and is left to design instruction independently. What should the teacher do?',
        'Clarify authorized roles, goals, prompts, data, and privacy rules, give feedback, and keep lead duties.',
        [
          'Delegate independent lesson design, instructional planning, and summative grading to the paraeducator.',
          'Assign the paraeducator primarily to escort students out of the room during behavioral disruptions.',
          'Leave the paraeducator out of instructional briefings to avoid sharing authorized classroom plan details.',
        ],
        'Paraeducators are valuable team members who need role clarity, preparation, communication, supervision, and access to only the information required for assigned responsibilities.',
        [
          'Licensed educators remain responsible for designing instruction and grading; delegating those professional duties exceeds paraeducator scope.',
          'Using a paraeducator primarily for disciplinary removal wastes valuable instructional support and undermines an inclusive classroom climate.',
          'Excluding support staff from authorized plan details leaves them unable to implement prompts, accommodations, and data routines accurately.',
        ]
      ),
      q(
        'A family questions why its child is receiving a new intervention. What is the best teacher response?',
        'Caregivers report that a classroom support conflicts with what they observe at home. How should the teacher proceed?',
        'Listen carefully, share purpose and evidence clearly, inspect differences, explain process, and involve teams.',
        [
          'Defend the school’s intervention decision firmly right away before hearing the family’s home observations.',
          'Promise the family a formal legal placement change independently to resolve the concern quickly.',
          'Discontinue the classroom intervention quietly on your own without informing the broader support team.',
        ],
        'Trustworthy collaboration respects family evidence and questions, distinguishes classroom roles from team authority, and uses transparent qualified processes for decisions.',
        [
          'Becoming defensive before listening carefully dismisses valuable home evidence and weakens collaborative trust with the student’s family.',
          'Promising formal placement or eligibility outcomes exceeds an individual educator’s legal authority outside the multidisciplinary team process.',
          'Ending an agreed support secretly bypasses team review, violates transparency, and leaves the student’s documented need unaddressed.',
        ]
      ),
      q(
        'A community organization offers tutoring that requires student-level data. What must be resolved before participation?',
        'A potential school partner requests names, schedules, scores, and disability information to plan services. What is the strongest response?',
        'Establish purpose, consent, minimum needed data, security limits, roles, and oversight via policy.',
        [
          'Share the requested student files promptly because the community tutoring program is offered free of charge.',
          'Accept a friendly verbal assurance from the tutor coordinator as sufficient protection for student privacy.',
          'Let the external organization set its own privacy and classroom access rules for participating students.',
        ],
        'Community partnership does not remove privacy, consent, data minimization, safety, accessibility, contracting, oversight, or continuity responsibilities.',
        [
          'Free community services never waive federal FERPA consent, data-minimization rules, or formal district data-sharing governance requirements.',
          'Informal verbal promises provide no enforceable legal or technical safeguards against unauthorized redisclosure of sensitive student records.',
          'Schools retain legal responsibility for student safety, accessibility, and privacy oversight whenever external partners serve enrolled learners.',
        ]
      ),
    ],
  },
  {
    id: 'ethics-law-privacy-rights-safety',
    chapterId: 'plt5622-ch-12',
    domainId: 'professional-development-leadership-community',
    domain: 'Professional Development, Leadership, and Community',
    label: 'Ethics, Law, Privacy, Rights, and Student Safety',
    references: [ETS, INTASC, FERPA, IDEA_MTSS, DISABILITY_RIGHTS, EOP],
    questions: [
      q(
        'A teacher is curious about a student in another grade and can access the cumulative file. What does FERPA’s school-official exception require?',
        'An employee wants to review records unrelated to assigned professional responsibilities. Which privacy principle controls?',
        'Access records only for a legitimate educational interest tied to professional responsibility and policy.',
        [
          'District employment authorizes any licensed school staff member to browse every student cumulative file.',
          'Electronic storage inside the school portal removes confidentiality restrictions for logged-in employees.',
          'Personal professional curiosity about a former or sibling student establishes legitimate educational interest.',
        ],
        'FERPA permits disclosure without consent to qualifying school officials with legitimate educational interests; employment alone does not authorize access to every student record.',
        [
          'School employment alone does not grant open access; FERPA limits non-consensual access to personnel with a legitimate educational role.',
          'Digital student information systems carry the exact same federal privacy and access-control obligations as locked paper cumulative files.',
          'Personal professional curiosity—even with benign intent—does not constitute a legitimate educational interest tied to assigned duties.',
        ]
      ),
      q(
        'A teacher believes a documented disability support gives one student an unfair advantage. What is the appropriate response?',
        'A classroom teacher wants to suspend an approved accommodation until the next meeting. What should happen?',
        'Implement the active plan faithfully, log objective data, and raise concerns through the qualified team.',
        [
          'Invite classmates to vote anonymously on whether the accommodation feels fair during classroom quizzes.',
          'Suspend the approved accommodation temporarily whenever the student earns an above-average quiz score.',
          'Pair the accommodation with an extra penalty assignment so total classroom workload stays balanced.',
        ],
        'Disability supports and services are determined through authorized individualized processes; teachers implement them and collaborate with the responsible team.',
        [
          'Involving classroom peers breaches student confidentiality and improperly treats legally protected civil-rights access as a popularity vote.',
          'Strong performance with an accommodation indicates the access barrier was removed—not that an educator may revoke the plan unilaterally.',
          'Penalizing a student for using a legally documented accommodation constitutes discriminatory retaliation and violates federal civil-rights protections.',
        ]
      ),
      q(
        'A student makes a disclosure that may trigger child-abuse reporting duties. What is the safest professional response?',
        'A teacher receives information suggesting possible neglect but is unsure of the exact local procedure. What should the teacher do?',
        'Protect safety, avoid promising secrecy, and promptly follow current mandated-reporting law and school procedure.',
        [
          'Conduct detailed follow-up interviews with peers and caregivers to confirm facts before filing an official report.',
          'Wait to submit an official agency report until unmistakable physical proof confirms abuse beyond reasonable doubt.',
          'Promise the student strict personal secrecy so classroom trust remains intact while reviewing the disclosure.',
        ],
        'Reporting thresholds and procedures vary, but teachers should not investigate or make unsupported promises; they follow current law and safety procedures promptly.',
        [
          'Mandated reporters do not conduct independent investigations; unauthorized questioning can endanger the student and compromise official protective inquiries.',
          'Mandated-reporting statutes require educators to report reasonable suspicion promptly rather than waiting for definitive physical proof beyond doubt.',
          'Promising secrecy cannot be kept under mandatory reporting law and risks betraying trust while delaying urgent child-safety protection.',
        ]
      ),
      q(
        'Which use of copyrighted material is safest for a teacher planning instruction?',
        'A teacher wants to post an entire commercial workbook online for unrestricted access. What should happen first?',
        'Use licensed, public-domain, open, or permission-cleared work and check fair use under policy.',
        [
          'Upload the complete commercial workbook publicly because nonprofit educational use waives copyright limits.',
          'Remove the publisher logo and author credit from scanned pages before sharing them on a public class site.',
          'Post the full workbook openly online because students and families are not charged a fee to download it.',
        ],
        'Educational use is not an automatic copyright exception; amount, purpose, nature, market effect, license terms, access controls, and current guidance matter.',
        [
          'Classroom instruction does not grant a blanket copyright exemption; copying an entire consumable workbook typically exceeds fair-use limits.',
          'Stripping publisher logos and author credits compounds copyright infringement with unethical attribution removal rather than making reposting lawful.',
          'Distributing a complete commercial workbook free on the open web harms the copyright holder’s market even when no fee is charged.',
        ]
      ),
      q(
        'A student club requests access to a school forum that is open to other noncurricular groups. What is the teacher’s best first step?',
        'A viewpoint-sensitive student activity raises First Amendment and equal-access questions. How should a teacher respond?',
        'Apply current viewpoint-neutral school policy, protect safety and nondiscrimination, and consult leadership.',
        [
          'Deny the club meeting space right away because the educator personally disagrees with the group’s viewpoint.',
          'Approve unrestricted club access independently without checking established district forum and safety rules.',
          'Enforce stricter room-use and supervision rules for unpopular student clubs than for favored groups.',
        ],
        'School speech and forum questions are fact specific; educators use current policy and qualified authority while avoiding viewpoint discrimination and protecting lawful safety boundaries.',
        [
          'Denying access to an open noncurricular school forum based on personal disagreement risks unlawful viewpoint discrimination under federal law.',
          'Approving forum access independently without consulting school policy and authorized administrators bypasses neutral safety and equal-access procedures.',
          'Applying stricter supervision rules selectively to disfavored student groups violates basic viewpoint neutrality and civil-rights nondiscrimination standards.',
        ]
      ),
      q(
        'A disciplinary referral may affect a student’s access and includes conflicting accounts. Which process is most ethical?',
        'Before a consequential classroom or school response, evidence is incomplete and the student disputes the allegation. What should the teacher support?',
        'Protect safety, gather facts fairly, give notice and voice, honor civil-rights rules, and document clearly.',
        [
          'Announce the student’s guilt publicly in class before reviewing conflicting accounts so order returns fast.',
          'Apply harsher disciplinary consequences toward students from groups with higher prior referral counts.',
          'Omit witness statements that complicate the referral narrative so the written disciplinary file looks clear.',
        ],
        'Ethical and lawful discipline requires fair evidence, proportionality, voice, documentation, nondiscrimination, required protections, and current school procedures.',
        [
          'Declaring guilt before gathering evidence and hearing the student violates basic due process, procedural fairness, and classroom dignity.',
          'Imposing harsher disciplinary rules based on group membership violates civil-rights nondiscrimination laws and fuels inequitable school discipline.',
          'Omitting exculpatory or complicating witness evidence corrupts record integrity and undermines fair, accurate administrative decision making.',
        ]
      ),
    ],
  },
];
