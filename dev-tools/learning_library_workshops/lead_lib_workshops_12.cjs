'use strict';

const REVIEW_STATUS = 'source-reviewed-editorial-pass';
const REVIEW_NOTE =
  'Independent applied case-analysis practice; not an official ETS prompt, rubric, score, pass prediction, or licensure determination. AlloFlow does not score written responses.';

const educational_leadership_5412 = {
  workshopLabel: 'Applied leadership case workshops',
  workshopPracticeNote:
    'Independent applied school-leadership case workshops designed to build PSEL/NELP strategic improvement, instructional supervision, budgeting, and legal-ethical reasoning for Educational Leadership (5412) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'edlead5412-workshop-01',
      taskType: 'Strategic improvement case brief (unscored)',
      title: 'Root-cause inquiry and PDSA planning for 7th-grade mathematics',
      prompt:
        'As principal of Cedar Ridge Middle School, write a concise strategic leadership response guiding your improvement team from surface achievement dips to a disciplined, equity-centered PDSA improvement cycle before committing capital funds.',
      stimulus:
        'Cedar Ridge Middle School (720 students) recorded a 14-point drop in 7th-grade math proficiency (58% to 44%), with steeper declines among multilingual learners (22%) and students with IEPs (19%). Chronic absenteeism reached 21%, and 4 of 6 math teachers are in years 1–2 using inconsistent pacing guides. Several site-council members press to buy a $68,000 test-prep platform immediately.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Diagnose the system-level evidence gaps and explain why purchasing the $68,000 platform right away risks solving the wrong problem.',
        'B. Design a focused 6-week Plan-Do-Study-Act (PDSA) improvement cycle aligned to school mission, core values, and disaggregated equity needs.',
        'C. Specify leading implementation indicators, lagging student outcomes, and governance checkpoints that will determine whether to adapt, adopt, or abandon the change.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Triangulate the 14-point overall math decline with the 22% multilingual and 19% IEP gaps, 21% chronic absenteeism, early-career staffing, and misaligned pacing before naming root causes.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Anchor decisions in PSEL Standard 1 (mission and core values) and Standard 10 (continuous improvement) plus IES continuous-improvement principles for disciplined inquiry.'
        },
        {
          label: 'Action plan',
          guidance:
            'Sequence root-cause fishbone analysis with math teachers, common formative assessment alignment, targeted induction mentoring, and a small-scale PDSA pilot instead of a premature $68,000 purchase.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Pair biweekly leading metrics (attendance, common unit mastery, coaching fidelity) with disaggregated 6-week review meetings involving teachers and site-council representatives.'
        }
      ],
      successCriteria: [
        'Connects disaggregated math declines (multilingual learners at 22%, students with IEPs at 19%) to alterable instructional and attendance factors rather than blaming students.',
        'Delays the $68,000 purchase until root-cause verification confirms whether curriculum coherence, novice-teacher coaching, or attendance is the primary lever.',
        'Defines a testable, time-bound PDSA cycle with clear ownership, modest initial scope, and explicit adapt-adopt-abandon decision criteria.',
        'Links leading process indicators and lagging proficiency outcomes transparently to the school mission and site-council communication.'
      ],
      commonPitfalls: [
        'Approving the $68,000 test-prep software immediately to appear decisive without verifying root causes or instructional fit.',
        'Treating the 44% schoolwide math average as a uniform problem while overlooking the sharper multilingual and IEP opportunity gaps.',
        'Blaming novice math teachers through punitive evaluation instead of strengthening pacing alignment, collaboration, and induction support.',
        'Listing broad annual goals without short-cycle leading measures to check implementation fidelity within 6 weeks.'
      ],
      sampleOutline: [
        'Evidence synthesis: disaggregate the 14-point drop alongside 21% absenteeism, novice staffing, and inconsistent pacing; pause the $68,000 spend pending root-cause inquiry.',
        'Standards framing: apply PSEL Standards 1 and 10 and IES continuous-improvement protocols to align resources with equitable student learning.',
        'PDSA pilot: convene the 7th-grade math PLC to unify one priority unit, pair novice teachers with structured coaching, and deploy bilingual visual scaffolds plus attendance outreach.',
        'Monitoring loop: track weekly attendance, unit formative exit tickets, and walkthrough fidelity; review disaggregated 6-week results with the site council before scaling or budgeting.'
      ],
      references: [
        'https://ies.ed.gov/use-work/resource-library/resource/other-resource/continuous-improvement-education-toolkit-schools-and-districts',
        'https://www.npbea.org/wp-content/uploads/2017/06/Professional-Standards-for-Educational-Leaders_2015.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'edlead5412-workshop-02',
      taskType: 'Instructional supervision case brief (unscored)',
      title: 'Walkthrough coaching, Tier 1 literacy, and MTSS-IDEA compliance',
      prompt:
        'As principal of Oakview Elementary, outline how you will address K–2 foundational literacy instruction, stagnant Tier 3 intervention outcomes, and two pending parental requests for special education evaluation.',
      stimulus:
        'Across 36 fifteen-minute literacy walkthroughs at Oakview Elementary (540 students), observers logged 82% teacher talk and limited explicit decoding practice in K–2. Thirty-four students remained in Tier 3 reading pull-out groups for 18 weeks with flat fluency gains. Two parents submitted written requests for IDEA evaluations, and an interventionist advised waiting until Tier 3 concludes.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Correct the legal and procedural error regarding the two written parental evaluation requests while preserving ongoing Tier 3 instructional support.',
        'B. Translate the walkthrough and Tier 3 trend data into a job-embedded coaching and PLC plan that strengthens Tier 1 explicit literacy instruction.',
        'C. Establish MTSS progress-monitoring decision rules and fidelity checks so students do not stall indefinitely in ineffective pull-out groups.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Link the 82% teacher-talk walkthrough finding and scarce explicit decoding practice to the 34 stalled Tier 3 students—signaling a Tier 1 core problem as well as intervention drift.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Apply IDEA Child Find rules (MTSS/RTI cannot delay or deny an initial evaluation after written parental request) alongside PSEL Standards 4 and 6 on instructional quality and adult learning.'
        },
        {
          label: 'Action plan',
          guidance:
            'Trigger formal IDEA consent/evaluation notice timelines immediately, retrain staff on Child Find, and launch non-evaluative K–2 coaching cycles focused on explicit phonics and active student response.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Track evaluation-timeline compliance, biweekly K–2 walkthrough look-fors, and 6-week MTSS data-team decision rules for intensifying, adjusting, or exiting interventions.'
        }
      ],
      successCriteria: [
        'Explicitly states that MTSS/Tier 3 intervention cannot be used to delay or deny an IDEA evaluation once a parent requests one in writing.',
        'Maintains reading support for the two students during the evaluation window rather than withdrawing Tier 3 services while testing occurs.',
        'Diagnoses the high teacher-talk ratio and weak K–2 decoding as a Tier 1 core instructional priority requiring modeling, co-teaching, and formative feedback.',
        'Defines clear 4-to-6-week MTSS fidelity and progress-monitoring checkpoints with concrete criteria for modifying ineffective interventions.'
      ],
      commonPitfalls: [
        'Supporting the interventionist by requiring parents to wait for Tier 3 completion before initiating IDEA evaluation procedures.',
        'Using 15-minute non-evaluative walkthrough snapshots directly for formal summative teacher ratings instead of formative coaching.',
        'Expanding Tier 3 pull-out groups while leaving weak Tier 1 core literacy instruction unaddressed.',
        'Stopping Tier 3 support for the two referred students while their special education eligibility evaluation is underway.'
      ],
      sampleOutline: [
        'Immediate legal correction: contact both families promptly, issue prior written notice/consent steps under IDEA Child Find, and brief staff that MTSS never delays evaluation.',
        'Tier 1 instructional coaching: share aggregated walkthrough trends with K–2 PLCs, model explicit decoding routines, and run brief feedback cycles targeting active student practice.',
        'MTSS recalibration: audit Tier 3 group size, instructional match, and session fidelity for the 34 stalled students; adjust grouping and evidence-based protocols.',
        'Verification metrics: audit statutory evaluation timelines, repeat K–2 walkthroughs after 4 weeks, and review biweekly oral-reading fluency trendlines at data meetings.'
      ],
      references: [
        'https://sites.ed.gov/idea/idea-files/rts-qa-child-find-part-b-08-24-2021/',
        'https://www.npbea.org/wp-content/uploads/2017/06/Professional-Standards-for-Educational-Leaders_2015.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'edlead5412-workshop-03',
      taskType: 'Climate and equity case brief (unscored)',
      title: 'Addressing disproportionate discipline through restorative climate systems',
      prompt:
        'As principal of Northside High School, develop a comprehensive leadership plan that reduces exclusionary discipline disparities, builds consistent adult practices, and strengthens student belonging and psychological safety.',
      stimulus:
        'Northside High School (1,180 students) recorded 412 out-of-school suspensions in one semester, up 29%. Black students (24% of enrollment) received 53% of discretionary defiance referrals, and students with disabilities (14% of enrollment) received 31%. Staff surveys show 61% feel unsupported during hallway transitions, while student focus groups report unpredictable rules across departments.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Analyze the disaggregated referral and survey evidence to identify adult-system inconsistencies and civil-rights or disability compliance risks.',
        'B. Propose a tiered school-climate strategy integrating clear Tier 1 behavioral expectations, restorative practices, and structured staff support.',
        'C. Detail how you will partner with students, families, and faculty to monitor equity progress without lowering safety standards.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Pair the 53% Black discretionary-defiance share and 31% disability suspension share with the 61% staff transition concern and student reports of inconsistent departmental rules.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Ground action in PSEL Standards 3 (equity and cultural responsiveness) and 5 (community of care), federal civil-rights nondiscrimination duties, and IDEA discipline safeguards.'
        },
        {
          label: 'Action plan',
          guidance:
            'Calibrate objective versus subjective referral definitions, deploy coordinated hallway supervision, train staff in de-escalation and restorative conferences, and check IEP behavior supports.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Publish monthly disaggregated discipline dashboards by offense code, location, and subgroup alongside periodic student belonging and staff efficacy pulse checks.'
        }
      ],
      successCriteria: [
        'Distinguishes subjective categories such as defiance from safety-critical infractions and flags civil-rights and IDEA manifestation/BIP implications.',
        'Addresses staff concerns directly through structured hallway-transition coverage and de-escalation coaching rather than issuing a top-down ban on referrals.',
        'Co-constructs clear, consistent schoolwide expectations with both faculty and diverse student voices to eliminate cross-department unpredictability.',
        'Specifies ongoing monthly disaggregated tracking of suspensions, instructional minutes recovered, and climate pulse indicators.'
      ],
      commonPitfalls: [
        'Prohibiting teachers from writing referrals without providing calibrated definitions, transition coverage, or de-escalation alternatives.',
        'Imposing uniform zero-tolerance suspensions on the false assumption that identical punishment produces equitable outcomes.',
        'Treating restorative conferences as a substitute for legally required IDEA manifestation determinations or behavior intervention plans.',
        'Tracking only total suspension counts while failing to disaggregate discretionary referrals by race, disability status, and classroom context.'
      ],
      sampleOutline: [
        'Disparity and risk diagnosis: highlight disproportionate Black (53%) and disability (31%) referrals concentrated in subjective defiance codes alongside inconsistent rules and hallway friction.',
        'Legal and standards alignment: uphold PSEL Standards 3 and 5, Title VI and Section 504 nondiscrimination duties, and IDEA procedural protections for students with IEPs.',
        'System redesign: calibrate a clear referral matrix distinguishing teacher-managed versus office-managed behaviors, organize active hallway transitions, and embed restorative repair and de-escalation coaching.',
        'Shared accountability: review monthly disaggregated referral and belonging metrics with a student-family-staff climate team and verify fidelity of IEP behavioral supports.'
      ],
      references: [
        'https://www.ed.gov/laws-and-policy/civil-rights-laws',
        'https://www.npbea.org/wp-content/uploads/2017/06/Professional-Standards-for-Educational-Leaders_2015.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'edlead5412-workshop-04',
      taskType: 'Ethical and legal case brief (unscored)',
      title: 'Title I procurement conflict of interest and FERPA vendor data safeguards',
      prompt:
        'As principal of Maplewood Elementary, respond to two urgent ethical and legal integrity risks involving a Title I tutoring contract recommendation and an unencrypted vendor request for student records.',
      stimulus:
        'At Maplewood Elementary (a Title I schoolwide school), an assistant principal urges awarding a $42,000 Title I tutoring contract without bids to a firm co-owned by her spouse. The same week, a contracted after-school vendor emailed requesting a spreadsheet of all 480 students’ IEP statuses, home addresses, and reading scores via unencrypted email before any data-sharing contract is signed.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Outline the immediate ethical, procurement, and supervisory actions required regarding the $42,000 Title I tutoring proposal and conflict of interest.',
        'B. Explain why releasing the 480-student spreadsheet violates FERPA and specify the exact legal and technical preconditions before any vendor receives student data.',
        'C. Design preventive staff norms and audit controls that protect public trust, federal grant integrity, and student privacy going forward.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Separate the two concrete compliance breaches: an undisclosed spousal financial interest in a no-bid $42,000 Title I contract and an overbroad, unencrypted bulk student-record request.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Apply FERPA school-official requirements (direct institutional control, legitimate educational interest, redisclosure limits), federal Title I procurement ethics, and PSEL Standard 2.'
        },
        {
          label: 'Action plan',
          guidance:
            'Halt the no-bid award, enforce written conflict disclosure and recusal, route Title I bidding through district finance, deny the unencrypted email request, and execute a formal data-privacy agreement.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Document human-resources/central-office escalation, audit data minimization so vendors receive only enrolled students’ necessary fields, and run annual procurement and FERPA refresher training.'
        }
      ],
      successCriteria: [
        'Halts the sole-source $42,000 award immediately, mandates formal recusal of the assistant principal, and routes procurement through district competitive-bidding and Title I allowability checks.',
        'Refuses the unencrypted bulk spreadsheet transfer and explains FERPA’s legitimate educational interest and school-official direct-control criteria.',
        'Requires data minimization (enrolled participants only, not all 480 students) plus a signed data-privacy agreement and encrypted transfer prior to sharing any protected record.',
        'Balances fair, confidential supervisory follow-up with transparent documentation to district compliance officials.'
      ],
      commonPitfalls: [
        'Allowing the assistant principal to remain on the vendor selection committee as long as she promises to be objective.',
        'Assuming parental consent is unnecessary for any outside after-school company merely because the school hired it, without establishing FERPA school-official contract controls.',
        'Sending all 480 students’ IEP and address records when only enrolled tutoring participants have a legitimate educational need.',
        'Handling a serious Title I conflict of interest informally through a verbal warning without notifying district procurement or legal authorities.'
      ],
      sampleOutline: [
        'Procurement integrity: pause the $42,000 recommendation, require conflict-of-interest disclosure and recusal, notify district finance/HR, and run competitive Title I procurement aligned to needs.',
        'FERPA enforcement: deny the unencrypted email request immediately; verify written contract terms establishing school-official status, direct district control, and zero unauthorized redisclosure.',
        'Data minimization and security: restrict any future transfer to enrolled students’ essential instructional fields via district-approved encrypted channels or parental written consent.',
        'Preventive governance: institute a principal pre-release checklist for external data requests and conduct annual staff training on PSEL ethical norms, grant rules, and student privacy.'
      ],
      references: [
        'https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'edlead5412-workshop-05',
      taskType: 'Operations and safety case brief (unscored)',
      title: 'Equity-weighted budgeting, accessible emergency planning, and cyber hygiene',
      prompt:
        'As principal of Riverbend High School, construct an operational leadership plan that absorbs a $185,000 budget cut while closing urgent ADA emergency-evacuation, visual-alert, and cybersecurity vulnerabilities.',
      stimulus:
        'Riverbend High School faces a $185,000 general-fund cut while serving 45 additional students with mobility or sensory disabilities. An autumn safety tabletop drill found three second-floor classrooms lack evacuation chairs, PA alerts omit visual strobes for deaf students, and a legacy attendance server still shares one administrator password across 14 front-office logins.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Establish transparent, equity-weighted budgeting criteria to absorb the $185,000 reduction without compromising core instruction or mandatory safety and accessibility compliance.',
        'B. Upgrade the school Emergency Operations Plan (EOP) so evacuation, alerting, and reunification protocols explicitly protect students with mobility and sensory disabilities.',
        'C. Coordinate rapid technical and staff remediation with district IT to eliminate the shared attendance-server credential vulnerability.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Weigh the $185,000 shortfall against rising enrollment of 45 students with mobility/sensory disabilities, three unequipped upper-floor rooms, absent visual strobes, and 14 users sharing one admin password.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Align decisions with U.S. Department of Education inclusive emergency-planning principles, CISA K-12 cybersecurity controls, ADA/Section 504 access duties, and PSEL Standard 9.'
        },
        {
          label: 'Action plan',
          guidance:
            'Prioritize life-safety capital/IDEA/facilities requests for evacuation chairs and strobes, reassign accessible first-floor classrooms temporarily, trim low-impact discretionary lines, and enforce individual MFA accounts.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Conduct an accessible functional drill with local first responders, review after-action logs, verify password/access-control remediation with district IT, and share budget trade-offs openly with stakeholders.'
        }
      ],
      successCriteria: [
        'Rejects across-the-board percentage cuts in favor of strategic reallocation that protects core learning, statutory accessibility, and life-safety mandates.',
        'Pairs immediate interim risk mitigation (relocating classes to accessible ground-floor rooms and buddy/visual-alert protocols) with funded permanent equipment upgrades.',
        'Treats the shared administrator password across 14 logins as an urgent data-integrity and continuity risk requiring individual role-based accounts and multifactor authentication.',
        'Incorporates multi-agency coordination, staff role training, and after-action drill verification into the updated EOP.'
      ],
      commonPitfalls: [
        'Applying a flat across-the-board percentage cut to every department, which underfunds mandatory disability access and life-safety equipment.',
        'Deferring evacuation chairs and visual strobes to next fiscal year without interim classroom relocation or alternative alert safeguards.',
        'Assuming emergency planning ends with a binder update rather than staff training, functional drills, and first-responder walkthroughs.',
        'Dismissing the shared attendance-server login as an IT-only inconvenience instead of an active student-privacy and operational-continuity threat.'
      ],
      sampleOutline: [
        'Strategic budget prioritization: protect core instruction and statutory safety/ADA duties; request district facilities/capital or grant funding for strobes and chairs while trimming underused discretionary contracts.',
        'Immediate safety mitigation: relocate affected classes to ground-floor accessible rooms where feasible, assign trained staff evacuation buddies, and update individualized EOP functional-needs annexes.',
        'Cybersecurity containment: partner with district IT today to disable the shared admin login, provision individual least-privilege accounts with MFA, and audit attendance-system access logs.',
        'Operational validation: run a live accessible evacuation and communication drill with fire/police partners, document after-action fixes, and report quarterly budget and safety status.'
      ],
      references: [
        'https://www.ed.gov/teaching-and-administration/safe-learning-environments/school-safety-and-security/emergency-planning',
        'https://www.cisa.gov/resources-tools/resources/report-protecting-our-future'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'edlead5412-workshop-06',
      taskType: 'Community and governance case brief (unscored)',
      title: 'Equitable multilingual family engagement and dual-language board governance',
      prompt:
        'As principal of Sunnyside K-8, design a community-engagement and governance communication plan that ensures meaningful language access, rebuilds trust around transparent data, and prepares an objective briefing ahead of the board vote.',
      stimulus:
        'At Sunnyside K-8 (610 students), 38% of families speak Spanish, Arabic, or Vietnamese at home, yet PTA attendance is 92% English-only and family portal activation among multilingual households is 27%. Before a school-board vote on a dual-language magnet proposal, two community groups filed opposing petitions alleging that school leaders hid achievement data behind technical jargon.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Identify the structural language-access and trust barriers reflected in the PTA, portal, and petition data under civil-rights expectations and PSEL standards.',
        'B. Plan a reciprocal, multilingual family and community engagement process that invites diverse perspectives without relying on students as interpreters.',
        'C. Outline how you will work within district governance channels to provide transparent, plain-language evidence for the upcoming school-board decision.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Connect the 38% multilingual student body to the 92% English-only PTA skew, 27% multilingual portal activation, and polarized petitions questioning data transparency.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Apply Title VI meaningful language-access obligations for limited-English-proficient parents, U.S. Department of Education equitable family-engagement practices, and PSEL Standard 8.'
        },
        {
          label: 'Action plan',
          guidance:
            'Publish translated plain-language data briefs in Spanish, Arabic, and Vietnamese; host flexible neighborhood listening sessions with qualified interpreters; and coordinate board materials through the superintendent.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Track multilingual family participation, portal onboarding support, and balanced reporting of community feedback and disaggregated outcomes before and after the board vote.'
        }
      ],
      successCriteria: [
        'Recognizes that low multilingual PTA attendance (8%) and portal activation (27%) reflect institutional access barriers rather than family disengagement.',
        'Provides qualified adult interpreters and translated plain-language visuals in Spanish, Arabic, and Vietnamese—explicitly avoiding student interpreters or unverified machine translation for critical notices.',
        'Uses reciprocal listening sessions at varied times and trusted community venues to surface concerns from both petition groups constructively.',
        'Respects superintendent-board governance protocols while presenting complete, disaggregated, non-partisan evidence rather than lobbying selectively.'
      ],
      commonPitfalls: [
        'Asking bilingual students or untrained staff to interpret sensitive family meetings or board-proposal briefings.',
        'Assuming posting an English PDF on the family portal satisfies meaningful communication when 73% of multilingual households have not activated the portal.',
        'Bypassing the superintendent to lobby individual board members privately for one petition group’s preferred outcome.',
        'Interpreting low multilingual PTA attendance as parent apathy instead of examining scheduling, translation, and welcoming-climate barriers.'
      ],
      sampleOutline: [
        'Access-barrier analysis: contrast 38% multilingual enrollment against 92% English-only PTA attendance and 27% portal use; commit to proactive Title VI language access.',
        'Reciprocal outreach: partner with cultural liaisons to offer translated plain-language data summaries, hands-on portal help, and evening/weekend listening sessions with qualified interpreters in Spanish, Arabic, and Vietnamese.',
        'Balanced governance briefing: synthesize input from both community petitions alongside transparent disaggregated achievement and staffing-capacity facts through the superintendent for the board packet.',
        'Sustained partnership: establish a multilingual family advisory structure and monitor growth in two-way communication and equitable engagement post-vote.'
      ],
      references: [
        'https://www.ed.gov/teaching-and-administration/lead-and-manage-my-school/state-support-network/ssn-resources/strategies-for-equitable-family-engagement',
        'https://www.ed.gov/laws-and-policy/civil-rights-laws'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    }
  ]
};

const school_librarian_5312 = {
  workshopLabel: 'Applied school library case workshops',
  workshopPracticeNote:
    'Independent applied library-program case workshops designed to build AASL instructional co-teaching, collection stewardship, intellectual freedom, copyright, and advocacy reasoning for School Librarian (5312) study. These are original unscored practice cases—not official ETS prompts, rubrics, scores, or licensure determinations.',
  workshops: [
    {
      id: 'sl5312-workshop-01',
      taskType: 'Program administration case brief (unscored)',
      title: 'Needs-based budgeting and transitioning from fixed to flexible scheduling',
      prompt:
        'As the newly hired school librarian at Crestview Elementary, design an evidence-based proposal to reform the fixed library schedule and replace flat per-grade budgeting with needs-driven resource allocation.',
      stimulus:
        'Crestview Elementary (520 students) operates a rigid fixed schedule where classes visit the library 30 minutes weekly solely to cover teacher planning periods. Print circulation fell 18%, 4th-grade science inquiry standards lack library support, and the $6,400 materials budget is divided equally across grades K–5 despite a 2007 average STEM nonfiction copyright year and zero bilingual audiobooks.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Conduct a focused program needs assessment linking the fixed schedule, 18% circulation drop, outdated STEM nonfiction, and missing bilingual audio formats to learner impact.',
        'B. Propose a realistic phased transition toward hybrid or flexible scheduling that protects teacher planning time while opening point-of-need inquiry access.',
        'C. Reallocate the $6,400 materials budget using transparent, curriculum-aligned criteria and define evaluation metrics to verify improvement.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Combine the 18% circulation drop, 2007 average STEM copyright year, zero bilingual audiobooks, and unsupported 4th-grade science inquiry with stakeholder input from teachers and students.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Align with AASL National School Library Standards emphasizing equitable point-of-need access, collaborative inquiry, and evidence-based program administration.'
        },
        {
          label: 'Action plan',
          guidance:
            'Co-design a hybrid schedule with the principal (preserving contract planning coverage while opening flexible inquiry blocks) and reweight the $6,400 budget toward current STEM and bilingual audio.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Track co-planned inquiry lessons, STEM and audio circulation growth, teacher satisfaction, and end-of-semester student reading and research outcomes.'
        }
      ],
      successCriteria: [
        'Links schedule rigidity directly to instructional barriers (missed 4th-grade science inquiry and declining circulation) rather than framing scheduling solely around librarian convenience.',
        'Proposes a collaborative hybrid-to-flexible transition with administration that respects teachers’ contractual planning periods instead of abruptly canceling fixed coverage.',
        'Replaces equal-per-grade budget splitting with prioritized spending justified by collection age (2007 STEM), curriculum alignment, and multilingual accessibility.',
        'Specifies concrete baseline-to-target evaluation indicators (co-taught units, STEM/audio usage, student inquiry products) to report back to leadership.'
      ],
      commonPitfalls: [
        'Demanding an immediate switch to 100% flexible scheduling without solving how the principal will cover contractual teacher planning time.',
        'Keeping the equal per-grade $6,400 split to avoid faculty friction even though 2007 STEM nonfiction and multilingual access gaps remain acute.',
        'Spending the entire budget on popular fiction to boost circulation numbers quickly while ignoring 4th-grade science inquiry and accessible formats.',
        'Redesigning the schedule or budget unilaterally without surveying teachers, students, and administration first.'
      ],
      sampleOutline: [
        'Needs-assessment baseline: pair the 18% circulation decline, 2007 STEM age, and zero bilingual audiobooks with a brief faculty-student survey on curriculum and reading gaps.',
        'Phased scheduling solution: collaborate with the principal on a hybrid model (such as fixed primary checkout paired with open flexible upper-grade inquiry blocks) that safeguards teacher prep.',
        'Needs-based $6,400 budget: target prioritized funding toward updated STEM nonfiction for 4th-grade inquiry, bilingual audiobooks, and high-interest print renewal using clear selection criteria.',
        'Program evaluation: report quarterly metrics on flexible bookings, co-taught science units, STEM and audiobook circulation, and student inquiry growth.'
      ],
      references: [
        'https://standards.aasl.org/',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5312.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'sl5312-workshop-02',
      taskType: 'Collection stewardship case brief (unscored)',
      title: 'Collection diversity audit and CREW deselection stewardship',
      prompt:
        'As school librarian at Brookside Middle School, develop a transparent collection-management plan that pairs a systematic diversity audit with CREW/MUSTIE weeding while addressing teacher concerns about withdrawing old books.',
      stimulus:
        'Brookside Middle School (680 students: 46% Latine, 19% Black, 12% Asian, 15% students with disabilities) audited its 11,400-volume collection: average copyright year is 2009, 28% of 500s–600s science and health books contain outdated medical or planetary facts, and only 9% of fiction depicts underrepresented protagonists. Two teachers object to any weeding, calling book removal a waste of public funds.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Interpret the audit metrics to prioritize immediate deselection and acquisition targets across both informational accuracy and cultural/disability representation.',
        'B. Apply board-approved CREW/MUSTIE weeding criteria and explain professionally to skeptical teachers why retaining inaccurate or damaged volumes harms learning rather than saving money.',
        'C. Build a multi-year acquisition and cataloging workflow that strengthens discoverability and monitors representation progress.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Contrast student demographics (77% students of color; 15% students with disabilities) against 9% underrepresented fiction, a 2009 collection age, and 28% outdated 500s–600s science/health titles.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Anchor practice in board-approved collection development and deselection policies, AASL Include and Curate competencies, and ALA Library Bill of Rights principles against censorship.'
        },
        {
          label: 'Action plan',
          guidance:
            'Apply objective MUSTIE criteria (starting with misleading/inaccurate 500s–600s titles), document lawful district disposal, consult diverse review journals, and enhance catalog subject/genre access.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Publish an annual collection-health snapshot tracking average copyright age, circulation turnover rate, and representation balance across print, audio, and digital holdings.'
        }
      ],
      successCriteria: [
        'Distinguishes evidence-based CREW/MUSTIE deselection of inaccurate (28% outdated STEM/health) or worn books from viewpoint-based censorship.',
        'Addresses teachers’ stewardship concerns with concrete examples showing how misleading health/science facts and overcrowded shelves reduce circulation and student trust.',
        'Targets acquisitions using professional, culturally responsive selection tools so holdings act as both mirrors and windows for Brookside’s diverse learners, including disability representation.',
        'Follows formal district surplus/disposal rules and tracks post-weeding circulation turnover and collection age.'
      ],
      commonPitfalls: [
        'Halting weeding to appease vocal teachers, leaving scientifically inaccurate health and space books on shelves where students cite them.',
        'Discarding books quietly without documenting MUSTIE criteria or following district surplus-property disposal procedures.',
        'Assuming a single cultural-heritage display replaces systematic collection analysis and balanced cataloging across all genres.',
        'Evaluating collection quality solely by total volume count (11,400 books) rather than currency, accuracy, diversity, and circulation turnover.'
      ],
      sampleOutline: [
        'Collection diagnosis: prioritize replacing the 28% outdated 500s–600s science/health titles first for factual safety while closing the gap between student demographics and 9% diverse fiction.',
        'Objective CREW/MUSTIE communication: share sample inaccurate pages with faculty, cite district deselection policy, and show how weeding raises shelf visibility and circulation turnover.',
        'Inclusive curation: select vetted, culturally sustaining and disability-inclusive print/audio/ebook titles using recognized review sources, and refine catalog tags and genrefied signage for discovery.',
        'Ongoing stewardship: follow formal property-disposal rules and report annual changes in average copyright year, diversity audit ratios, and checkouts per item.'
      ],
      references: [
        'https://standards.aasl.org/',
        'https://www.ala.org/advocacy/intfreedom/librarybill'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'sl5312-workshop-03',
      taskType: 'Information access and privacy case brief (unscored)',
      title: 'Patron circulation confidentiality and CIPA research unblocking',
      prompt:
        'As school librarian at Harbor High School, address three intersecting information-access challenges: exposed circulation histories at the desk, an informal administrative request for checkout records, and overbroad CIPA web filtering blocking AP Seminar research.',
      stimulus:
        'At Harbor High School (940 students), the circulation system retains multi-year student borrowing histories visible to student library aides at checkout. Meanwhile, the district CIPA filter blocks peer-reviewed CDC reproductive health pages and LGBTQ+ history archives required for AP Seminar research, and an assistant principal asks informally for a list of students who borrowed mental-health books.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Resolve the integrated library system (ILS) privacy exposure and respond professionally to the assistant principal’s informal request for mental-health checkout records.',
        'B. Initiate a compliant CIPA filter-review and timely unblocking process so AP Seminar students can access bona fide educational research sites.',
        'C. Establish sustainable staff, student-aide, and digital-access protocols that balance student safety, legal compliance, and intellectual privacy.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Address all three risks distinctly: visible multi-year checkout histories seen by student aides, an informal mental-health reading list request, and blocked CDC and historical archive sites.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Apply ALA Library Bill of Rights privacy and access principles, district student-record confidentiality/FERPA rules, and CIPA provisions permitting disabling or unblocking for bona fide research.'
        },
        {
          label: 'Action plan',
          guidance:
            'Configure the ILS to purge history upon return and limit student-aide screen views, decline informal record release while routing any urgent safety concern through proper policy channels, and file IT filter-override tickets.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Verify unblocked research URLs before AP Seminar deadlines, train library aides on confidentiality boundaries, and document filter-override turnaround times with district IT.'
        }
      ],
      successCriteria: [
        'Immediately remediates ILS circulation-history retention and strips student aides’ access to sensitive patron borrowing logs.',
        'Declines the assistant principal’s informal request for mental-health book borrowers calmly and cites board confidentiality/library privacy policy while distinguishing genuine safety procedures from reading surveillance.',
        'Uses formal district IT/CIPA override channels to unblock peer-reviewed CDC and historical archive sites for bona fide research rather than bypassing the filter improperly.',
        'Protects students’ equitable inquiry rights while preserving constructive working relationships with school administration and IT.'
      ],
      commonPitfalls: [
        'Handing over the mental-health checkout list to an assistant principal without formal legal or board-policy authorization, chilling confidential student reading.',
        'Instructing students to use personal VPNs or proxy workarounds to defeat the district CIPA filter instead of submitting formal unblocking requests.',
        'Claiming CIPA requires permanently blocking all health or LGBTQ+ educational websites, confusing lawful filtering with viewpoint censorship.',
        'Leaving student library aides logged into full staff ILS accounts where peers’ overdue items and borrowing histories remain visible.'
      ],
      sampleOutline: [
        'ILS privacy hardening: disable unnecessary borrowing-history retention upon item return, restrict student-aide checkout screens to minimal fields, and train aides on confidentiality.',
        'Administrative request response: decline informal disclosure of mental-health borrowing records under ALA privacy ethics and district confidentiality policy; if a specific student safety concern exists, direct it through established counseling/legal protocols.',
        'CIPA research unblocking: document curricular alignment for the CDC and LGBTQ+ archive URLs and submit priority district IT filter-review requests citing CIPA’s bona fide educational access standards.',
        'Sustained access governance: establish a predictable 24-to-48-hour instructional unblocking workflow with IT and provide curated scholarly database alternatives during review.'
      ],
      references: [
        'https://www.ala.org/advocacy/intfreedom/librarybill',
        'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5312.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'sl5312-workshop-04',
      taskType: 'Instructional collaboration case brief (unscored)',
      title: 'Co-taught UDL civic inquiry and SIFT lateral-reading instruction',
      prompt:
        'As school librarian at Meadowlark Middle School, transform a requested one-day database tour into a co-planned, UDL-accessible civic inquiry sequence that equips 8th graders to evaluate online sources laterally and synthesize evidence ethically.',
      stimulus:
        'Eighth-grade social studies teachers at Meadowlark Middle bring 135 students—including 24 multilingual learners and 18 students with reading IEPs—for a civics policy project. Pre-assessment shows 71% judge site credibility by visual design or ".org" domains, and 64% copy-paste opening paragraphs without synthesis. Teachers ask for a single 40-minute database tour before independent essay writing.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Use the pre-assessment data to negotiate a co-planned, co-taught, and co-assessed inquiry sequence instead of a standalone 40-minute database demonstration.',
        'B. Embed explicit SIFT lateral-reading instruction and note-making scaffolds that directly counter ".org" heuristics and copy-paste habits.',
        'C. Integrate Universal Design for Learning (UDL) accessibility supports so all 24 multilingual learners and 18 students with reading IEPs participate fully in rigorous inquiry.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Leverage the pre-assessment findings—71% relying on surface design or ".org" cues and 64% copy-pasting—plus the learning profiles of 24 multilingual learners and 18 students with IEPs.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Align with AASL Inquire, Collaborate, Curate, and Engage foundations alongside UDL guidelines for multiple means of representation, engagement, and expression.'
        },
        {
          label: 'Action plan',
          guidance:
            'Co-design three chunked workshops: (1) SIFT lateral reading on real civic claims, (2) curated multi-level text sets with read-aloud/translation tools, and (3) paraphrasing/citation checkpoints before drafting.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Co-assess a brief formative source-evaluation rubric and synthesis check mid-unit, then compare pre-to-post mastery with social studies teachers to refine future units.'
        }
      ],
      successCriteria: [
        'Moves beyond a passive database tour to shared instructional ownership (co-planning, co-teaching, and co-assessing) grounded in the 71% and 64% pre-assessment gaps.',
        'Teaches lateral reading via SIFT (Stop, Investigate the source, Find better coverage, Trace claims to the original) rather than outdated surface-level checklists or ".org" rules.',
        'Builds proactive UDL supports—such as text-to-speech databases, leveled articles, multilingual glossaries, and structured synthesis organizers—into core instruction for all learners.',
        'Includes formative checkpoints that catch patchwriting and weak source claims before final essays are submitted.'
      ],
      commonPitfalls: [
        'Accepting the one-day database tour passively and leaving students without guided practice in lateral reading or ethical note-taking.',
        'Teaching rigid domain-extension shortcuts (such as claiming ".org" sites are automatically reliable) that fail against modern advocacy misinformation.',
        'Simplifying the research task into lower-rigor worksheets for multilingual learners or IEP students instead of maintaining grade-level inquiry with UDL scaffolds.',
        'Treating copy-paste behavior strictly as punitive plagiarism rather than teaching structured paraphrasing, attribution, and synthesis routines.'
      ],
      sampleOutline: [
        'Collaborative reframing: share the 71% credibility and 64% copy-paste pre-assessment data with teachers to expand the single tour into three co-taught inquiry checkpoints.',
        'SIFT lateral-reading lab: model leaving an unfamiliar civic website to verify who funds it, compare independent news/research coverage, and trace statistics back to primary reports.',
        'UDL-accessible curation: assemble a multi-format research pathfinder featuring audio/read-aloud databases, Lexile-varied articles, bilingual key-term guides, and color-coded claim-evidence-paraphrase frames.',
        'Co-assessment loop: co-score a mid-project source-justification and paraphrasing ticket before essay drafting, then debrief post-unit growth with the social studies PLC.'
      ],
      references: [
        'https://standards.aasl.org/',
        'https://praxis.ets.org/test/school-librarian-5312.html'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'sl5312-workshop-05',
      taskType: 'Intellectual freedom and copyright case brief (unscored)',
      title: 'Board-policy reconsideration process and four-factor copyright guidance',
      prompt:
        'As school librarian at Pinecrest High School, respond simultaneously to a demand for immediate removal of an award-winning graphic novel and a teacher’s request to post two full commercial documentaries on an open public website.',
      stimulus:
        'At Pinecrest High School, a community member emails the principal demanding immediate removal by Friday of an award-winning young-adult graphic novel from the library shelf, admitting they have not read the book in full. That same week, a film teacher asks the librarian to digitize and upload two complete commercially licensed documentaries to a public course website for summer viewing.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Guide the principal and complainant through the board-adopted reconsideration procedure while upholding intellectual freedom and keeping the graphic novel accessible during review.',
        'B. Conduct a structured four-factor fair-use and classroom-exemption analysis explaining why uploading two complete commercial documentaries to an open public site exceeds lawful copyright boundaries.',
        'C. Recommend lawful instructional alternatives for the film teacher and preventive documentation practices for both challenges and copyright compliance.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Note two distinct legal-policy triggers: an informal demand for Friday removal of an unread graphic novel and a request to reproduce and publicly post two complete commercial films.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Apply ALA Library Bill of Rights reconsideration standards (objective review, no summary removal) alongside U.S. Copyright Office Circular 21 (Section 107 four-factor fair use and Section 110 classroom/TEACH limits).'
        },
        {
          label: 'Action plan',
          guidance:
            'Keep the graphic novel in circulation, invite the complainant to read the full work and submit a formal reconsideration form for committee review, decline full public film upload, and locate licensed streaming or short-clip options.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Maintain a factual selection-rationale dossier (reviews, awards, curriculum ties) for the review committee and share a concise copyright/licensing guide with faculty.'
        }
      ],
      successCriteria: [
        'Insists on following board-approved reconsideration policy, keeping the graphic novel on the shelf during review and requiring the complainant to engage the work as a whole.',
        'Applies all four fair-use factors accurately (purpose/character, nature of the work, amount/substantiality of the entire film, and market effect) rather than quoting rigid myths.',
        'Explains that face-to-face classroom display exemptions do not authorize digitizing full commercial films for open, public-facing summer web hosting.',
        'Offers practical lawful solutions for the teacher—such as licensed educational streaming platforms, library DVD/digital checkout, public-domain/Creative Commons films, or brief transformative excerpts behind authenticated LMS access.'
      ],
      commonPitfalls: [
        'Quietly pulling or restricting the graphic novel behind the desk before Friday to avoid controversy while awaiting committee review.',
        'Arguing that any nonprofit educational use by a public school automatically qualifies as fair use even when uploading entire commercial films to a public webpage.',
        'Responding defensively or dismissively to the community member instead of calmly offering the formal board reconsideration pathway.',
        'Citing unverified numerical copy limits as binding law while omitting the four statutory fair-use factors and market-harm analysis.'
      ],
      sampleOutline: [
        'Reconsideration protocol: advise the principal to keep the graphic novel accessible, respond respectfully to the complainant with the board-approved reconsideration form, and assemble professional reviews for committee review.',
        'Four-factor fair-use analysis: explain why uploading two complete commercial documentaries to an open public website fails fair use—especially amount (100% of each work) and direct market harm—and exceeds Section 110 face-to-face display rules.',
        'Lawful film alternatives: help the teacher secure licensed educational streaming access, check out legal library copies, use open-licensed documentaries, or embed brief transformative excerpts inside a password-protected LMS.',
        'Proactive stewardship: document selection rationales routinely and offer a short faculty workshop on copyright, licensing, and intellectual freedom policies.'
      ],
      references: [
        'https://www.ala.org/advocacy/intfreedom/librarybill',
        'https://www.copyright.gov/circs/circ21.pdf'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    },
    {
      id: 'sl5312-workshop-06',
      taskType: 'Leadership and advocacy case brief (unscored)',
      title: 'Data-driven advocacy for certified school librarian staffing',
      prompt:
        'As school librarian at Valley View K-8, craft a constructive, evidence-driven advocacy strategy to demonstrate the instructional and equity impact of a full-time certified librarian ahead of a district staffing reduction proposal.',
      stimulus:
        'Facing a district shortfall, the superintendent proposes cutting Valley View K-8’s full-time certified school librarian to 0.5 FTE and staffing the library with an untrained clerk three days weekly. Program logs document 62 co-taught inquiry lessons across 14 teachers, a 31% gain in scholarly database use by grades 6–8 writers, and 440 after-school digital-access visits by students without home broadband.',
      estimatedMinutes: 15,
      taskParts: [
        'A. Synthesize the library’s instructional, research, and digital-equity data into a concise executive impact brief aligned to district improvement priorities.',
        'B. Distinguish clearly between clerical circulation duties and the specialized instructional, curation, and accessibility expertise of a certified school librarian.',
        'C. Mobilize faculty, family, and student stakeholders constructively within district governance norms while outlining transparent service-impact projections if staffing drops to 0.5 FTE.'
      ],
      planningFrame: [
        {
          label: 'Evidence',
          guidance:
            'Highlight 62 co-taught lessons across 14 teachers, 31% higher grade 6–8 scholarly database usage, and 440 after-school broadband-access visits tied directly to equity and writing goals.'
        },
        {
          label: 'Policy & standards',
          guidance:
            'Ground advocacy in AASL National School Library Standards on instructional leadership and equitable access, linking certified staffing to district literacy and digital-citizenship targets.'
        },
        {
          label: 'Action plan',
          guidance:
            'Deliver a one-page data brief to the principal and superintendent, invite collaborating teachers and families to share concrete student-learning stories, and map exact instructional losses under a 0.5 FTE clerk model.'
        },
        {
          label: 'Accountability & follow-up',
          guidance:
            'Establish quarterly program-impact reporting tied to school improvement goals so library staffing value remains visible year-round rather than only during budget crises.'
        }
      ],
      successCriteria: [
        'Frames advocacy around measurable student learning and digital equity (62 co-taught lessons, 31% database gain, 440 broadband visits) rather than personal job preservation.',
        'Articulates respectfully why a clerk can assist with shelving and checkouts but cannot legally or pedagogically replace certified co-teaching, inquiry assessment, and collection curation.',
        'Works transparently through the building principal and appropriate district governance channels rather than organizing adversarial attacks on administrators.',
        'Includes concrete service-impact modeling showing which co-taught units and after-school access hours would disappear under a 0.5 FTE cut, alongside sustainable year-round reporting.'
      ],
      commonPitfalls: [
        'Centering advocacy on circulation totals or personal job security rather than co-taught student learning and closing the 440-visit broadband equity gap.',
        'Disparaging clerical paraprofessionals instead of distinguishing complementary clerical versus certified instructional responsibilities.',
        'Bypassing the principal or attacking the superintendent publicly, which erodes leadership credibility during budget deliberations.',
        'Waiting until a staffing cut is proposed to collect evidence instead of building ongoing quarterly impact reporting aligned to school goals.'
      ],
      sampleOutline: [
        'Executive evidence brief: connect the 62 co-taught lessons, 31% grade 6–8 database growth, and 440 after-school broadband visits directly to district literacy and equity priorities.',
        'Role clarity: distinguish clerical operations (shelving, circulation) from certified librarian functions (co-teaching SIFT/inquiry, UDL curation, copyright/privacy stewardship, and formative assessment).',
        'Coalition and governance: partner with the principal first, share transparent 0.5 FTE service-loss scenarios (lost co-teaching blocks and reduced after-school access), and invite teachers, families, and students to contribute student-centered testimonials.',
        'Year-round visibility: institute concise termly library impact dashboards linked to school-improvement metrics to sustain funding long-term.'
      ],
      references: [
        'https://standards.aasl.org/',
        'https://praxis.ets.org/test/school-librarian-5312.html'
      ],
      reviewStatus: REVIEW_STATUS,
      reviewNote: REVIEW_NOTE
    }
  ]
};

module.exports = {
  educational_leadership_5412,
  school_librarian_5312
};
