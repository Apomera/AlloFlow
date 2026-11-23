'use strict';

const LEAD_CASE_META = {
  schemaVersion: 1,
  label: 'Applied leadership case',
  presentationLabel: 'School leadership scenario',
  answerLabel: 'Best principal decision',
  explanationLabel: 'Leadership & legal rationale',
};

const LIB_CASE_META = {
  schemaVersion: 1,
  label: 'Applied school library case',
  presentationLabel: 'Library program scenario',
  answerLabel: 'Best librarian decision',
  explanationLabel: 'AASL & ethical rationale',
};

const educational_leadership_5412 = {
  'lead5412-ch-01-section-04': {
    ...LEAD_CASE_META,
    title: 'Co-Constructing Shared Vision Commitments After Disaggregated Literacy Drops',
    clinicalDescription:
      'A newly appointed high school principal inherits a generic mission plaque while state data show literacy proficiency fell 14 points for emergent bilinguals. Faculty focus groups blame attendance, parents cite opaque grading, and multilingual families report feeling excluded from prior planning meetings.',
    diagnosis:
      'Convene representative stakeholders to co-construct measurable equity goals, clarify role commitments, and publish bilingual review milestones.',
    explanation:
      'PSEL Standard 1 and NELP vision leadership require moving beyond top-down slogans to shared commitments anchored in student-outcome evidence. Translating priorities into clear roles, accessible channels, and transparent progress reviews builds genuine buy-in rather than drafting a solitary vision statement.',
  },
  'lead5412-ch-02-section-04': {
    ...LEAD_CASE_META,
    title: 'Initiative Mapping and Bounded PDSA Pilot to Curb Middle School Burnout',
    clinicalDescription:
      'A middle school is juggling seven overlapping literacy, advisory, and behavior mandates simultaneously. Grade 7 math growth has stalled for two years, PLC agendas are rushed, and 64% of teachers report initiative fatigue, yet a district director urges launching an eighth curriculum toolkit schoolwide next Monday.',
    diagnosis:
      'Lead an initiative-mapping audit and root-cause analysis, retire redundant mandates, and run a bounded PDSA pilot with protected PLC capacity.',
    explanation:
      'Continuous improvement fails when leaders layer competing programs onto stretched staff without testing root causes. Mapping initiatives to core priorities, building readiness, and running small Plan-Do-Study-Act cycles protect instructional coherence and fidelity far better than abrupt schoolwide mandates.',
  },
  'lead5412-ch-03-section-03': {
    ...LEAD_CASE_META,
    title: 'Actionable Walkthrough Feedback Versus Premature Formal Remediation',
    clinicalDescription:
      'During two brief 10-minute walkthroughs, a veteran Grade 5 teacher relies on teacher-led lecture with minimal student discourse and few checks for understanding. An assistant principal recommends placing the teacher on a formal improvement plan immediately without holding a coaching conference or reviewing prior evaluations.',
    diagnosis:
      'Hold a non-evaluative coaching conference with specific evidence, select one high-leverage discourse step, and reserve formal plans for due process.',
    explanation:
      'Instructional supervision distinguishes formative coaching from formal personnel action. Grounding feedback in observable evidence, inviting teacher reflection, scheduling peer modeling, and honoring contract and evaluation due-process thresholds builds instructional capacity while preventing unfair or legally vulnerable sanctions.',
  },
  'lead5412-ch-04-section-03': {
    ...LEAD_CASE_META,
    title: 'Disaggregated Benchmark Validity and MTSS Alignment in Grade 8 Math',
    clinicalDescription:
      'Aggregate Grade 8 math benchmark scores rose 6% this quarter, prompting department leads to cancel Tier 2 math intervention blocks. However, disaggregated data show students with disabilities and multilingual learners dropped 11%, and an item review reveals benchmark tasks tested standards not yet covered in core pacing.',
    diagnosis:
      'Triangulate multiple formative measures, realign Tier 1 curriculum pacing to standards, and retain targeted MTSS math supports for underserved subgroups.',
    explanation:
      'Assessment literacy requires checking construct validity, opportunity to learn, and disaggregated subgroup trends before making program cuts. Schoolwide averages mask widening equity gaps, and treating misaligned interim scores as proof of mastery undermines both curriculum coherence and MTSS responsiveness.',
  },
  'lead5412-ch-05-section-03': {
    ...LEAD_CASE_META,
    title: 'Protecting Non-Disruptive Student Voice and Due Process in Dress-Code Protests',
    clinicalDescription:
      'After data show Black and Latina students receive 71% of dress-code referrals, 40 high schoolers wear silent color-coded wristbands to protest unequal enforcement. Classes proceed normally, yet a dean recommends issuing immediate five-day suspensions without hearings to deter further student organizing.',
    diagnosis:
      'Protect peaceful student expression under Tinker, ensure Goss due process for any discipline, and charter a representative student-staff policy review.',
    explanation:
      'Under Tinker v. Des Moines, non-disruptive symbolic speech is protected, and Goss v. Lopez guarantees notice and a hearing before short-term suspensions. Engaging representative student voice with transparent feedback loops addresses the root equity disparity rather than escalating unconstitutional exclusionary discipline.',
  },
  'lead5412-ch-06-section-04': {
    ...LEAD_CASE_META,
    title: 'Rebalancing Distributed Leadership Workload and Collaborative Recognition',
    clinicalDescription:
      'After midyear staffing cuts, the same five teacher-leaders chair three new committees without release time while a new principal launches a monthly "Top Test Scorer" plaque. Within two months, voluntary PLC collaboration stalls, cross-grade lesson sharing stops, and two veteran mentors request transfers.',
    diagnosis:
      'Audit and redistribute committee workloads, protect collaborative PLC planning time, and redesign recognition around collective instructional growth.',
    explanation:
      'Sustainable professional culture depends on equitable work design, psychological safety, and collaborative norms. Overloading a few informal leaders accelerates burnout, while competitive individual awards erode trust and collective responsibility across grade-level teams.',
  },
  'lead5412-ch-07-section-03': {
    ...LEAD_CASE_META,
    title: 'Conflict-of-Interest Recusal in Title I Supplemental Tutoring Procurement',
    clinicalDescription:
      'A high-poverty elementary school solicits bids for a $65,000 Title I supplemental tutoring contract. The lowest bid comes from a firm co-owned by the principal\'s brother-in-law, and a lead teacher urges awarding it quickly before fiscal year-end so the campus does not forfeit categorical funds.',
    diagnosis:
      'Disclose the family tie in writing, recuse completely from vendor review, and route selection through district procurement and Title I compliance.',
    explanation:
      'PSEL ethical leadership requires avoiding both actual and apparent conflicts of interest, especially when managing restricted Title I categorical dollars. Immediate written disclosure, recusal, objective committee scoring, and supplement-not-supplant verification safeguard public trust and statutory compliance.',
  },
  'lead5412-ch-08-section-03': {
    ...LEAD_CASE_META,
    title: 'Title IX Reporting, Anti-Retaliation, and Impartial Review in Athletics',
    clinicalDescription:
      'A Grade 10 student reports repeated sexual harassment by a varsity teammate and tells her counselor that the coach benched her for two games after she spoke up. The athletic director asks the principal to settle the issue informally with a locker-room apology before regional playoffs begin.',
    diagnosis:
      'Report immediately to the Title IX Coordinator, institute non-punitive supportive measures, halt retaliation, and preserve an impartial investigation.',
    explanation:
      'Federal civil rights obligations under Title IX prohibit informal cover-ups and strictly bar retaliation against complainants. Activating formal reporting channels, protecting student safety and educational access, preserving evidence, and avoiding premature findings uphold legal duty and student rights.',
  },
  'lead5412-ch-09-section-04': {
    ...LEAD_CASE_META,
    title: 'FERPA Breach Containment and Vendor Data Governance After Unvetted AI Upload',
    clinicalDescription:
      'A Grade 6 teacher uploads spreadsheets containing 140 students\' IEP goals, Section 504 plans, and ID numbers into a free consumer AI grading site without district approval. That afternoon, IT flags repeated unauthorized login attempts targeting the school\'s student information system.',
    diagnosis:
      'Activate district cybersecurity incident response and FERPA breach review, revoke unapproved tool use, and enforce MFA plus vendor DPA vetting.',
    explanation:
      'Effective technology governance connects instructional innovation with FERPA privacy protection and K-12 cybersecurity controls. Rapid incident containment, multifactor authentication, signed data-privacy agreements, and staff training protect sensitive disability records far better than informal apologies or ad hoc bans.',
  },
  'lead5412-ch-10-section-03': {
    ...LEAD_CASE_META,
    title: 'Accessible Emergency Operations and Reunification Planning After Drill Failures',
    clinicalDescription:
      'During an unannounced fire evacuation drill, two students using wheelchairs are left waiting at a locked second-floor stairwell without assigned staff support. Meanwhile, alarmed families jam the bus loop because reunification roles and pickup verification procedures were never communicated or practiced.',
    diagnosis:
      'Update the site EOP with individualized evacuation plans, coordinate with first responders, clarify reunification roles, and run debriefed exercises.',
    explanation:
      'Comprehensive emergency operations planning under IDEA, Section 504, and FEMA guidance must guarantee accessible evacuation and continuity for every learner. Role-clear staffing, developmentally appropriate drills, tested reunification checkpoints, and structured after-action reviews close life-safety gaps proactively.',
  },
  'lead5412-ch-11-section-03': {
    ...LEAD_CASE_META,
    title: 'Closing Multilingual Family Feedback Loops Beyond an English-Only Portal',
    clinicalDescription:
      'After a middle school shifts all family notices and Title I tutoring sign-ups exclusively to an English-only web portal, survey participation among immigrant households plunges to 8%. Rumors spread that bilingual tutoring is being eliminated, and families stop attending evening advisory forums.',
    diagnosis:
      'Deploy accessible multilingual multi-channel outreach, report disaggregated survey input openly, explain constraints clearly, and track participation gains.',
    explanation:
      'Reciprocal family engagement requires plain-language, accessible, two-way communication rather than single-channel broadcasts that exclude families by language or connectivity. Closing feedback loops by documenting how caregiver input shaped decisions rebuilds trust and equitable participation.',
  },
  'lead5412-ch-12-section-03': {
    ...LEAD_CASE_META,
    title: 'Navigating Board Decision Rights and Curriculum Policy During Individual Demands',
    clinicalDescription:
      'A newly elected school board member emails a principal directly, demanding immediate removal of a board-adopted Grade 11 civics unit and reassignment of the department chair before Monday. The member warns that raising the request with the superintendent will cause public friction at the next meeting.',
    diagnosis:
      'Clarify governance decision rights, route the concern through the superintendent and board policy, and share objective instructional evidence.',
    explanation:
      'School board authority is exercised collectively through formal policy and superintendent channels, not via unilateral directives from an individual trustee. Upholding governance boundaries, documenting curriculum alignment objectively, and following lawful board procedures protect professional integrity and public accountability.',
  },
};

const school_librarian_5312 = {
  'sl5312-ch-01-section-03': {
    ...LIB_CASE_META,
    title: 'Evidence-Based Library Budget Stewardship Over Impulse Year-End Purchasing',
    clinicalDescription:
      'A principal offers $4,000 in unspent year-end funds to buy glossy hardcover bestsellers by Friday. However, a recent collection and circulation audit shows 68% of Grade 6-8 science and bilingual texts are over 15 years old, and student holds on curriculum e-books average six weeks.',
    diagnosis:
      'Present a transparent needs-based budget linking funds to science accuracy, diverse multilingual formats, and sustainable digital licensing costs.',
    explanation:
      'AASL program administration requires aligning finite funds with documented learner needs, curriculum gaps, equity of access, and total cost of ownership. Replacing outdated STEM and underrepresented multilingual materials builds measurable instructional impact rather than chasing unaligned bestseller displays.',
  },
  'sl5312-ch-02-section-03': {
    ...LIB_CASE_META,
    title: 'Upholding Formal Reconsideration Policy Against Quiet Closet Censorship',
    clinicalDescription:
      'A caregiver confronts the school librarian at the circulation desk demanding immediate removal of an award-winning young adult novel featuring LGBTQ+ protagonists. Hoping to prevent a board-meeting dispute, an assistant principal advises quietly moving the title into a locked back storage closet.',
    diagnosis:
      'Listen respectfully, provide the board-approved selection and reconsideration policy, keep the title accessible during review, and notify leadership.',
    explanation:
      'Under the ALA Library Bill of Rights and AASL intellectual freedom principles, written viewpoint-neutral reconsideration policies protect due process and student access. Stealth removal or restricted shelving bypasses board governance, chills intellectual freedom, and leaves the district legally vulnerable.',
  },
  'sl5312-ch-03-section-04': {
    ...LIB_CASE_META,
    title: 'Transitioning From Rigid Planning-Coverage Scheduling to Equitable Access',
    clinicalDescription:
      'An elementary school library operates on a rigid fixed schedule designed solely to provide classroom teacher planning coverage. As a result, self-contained special education classes, late-arriving bus riders, and Grade 4 inquiry teams have zero open blocks for point-of-need research or book checkout.',
    diagnosis:
      'Use circulation and co-teaching evidence to propose a mixed or flexible schedule with open checkout windows and accessible digital access.',
    explanation:
      'AASL Include and Collaborate standards emphasize flexible, point-of-need access rather than confining library visits to teacher prep blocks. Designing schedules around disability accommodations, transportation windows, and inquiry timing removes structural barriers so every learner can use library resources equitably.',
  },
  'sl5312-ch-04-section-04': {
    ...LIB_CASE_META,
    title: 'CREW/MUSTIE Weeding, ILS Inventory Cleanup, and E-Book License Rebalancing',
    clinicalDescription:
      'An ILS barcode inventory uncovers 18% phantom OPAC records, 1990s health books citing disproven medical advice, and a popular YA audiobook locked in a single-user perpetual license with 34 active student holds. A volunteer urges keeping every old print volume to preserve the library\'s total book count.',
    diagnosis:
      'Apply CREW and MUSTIE deselection while preserving diverse classics, reconcile MARC/OPAC records, and shift high-demand audio to metered licenses.',
    explanation:
      'Accurate collection stewardship prioritizes currency, discoverability, and circulation access over inflated shelf counts. Removing misleading or superseded items via CREW/MUSTIE, cleaning catalog metadata, and matching digital licensing models to hold ratios improve reliability for learners and teachers alike.',
  },
  'sl5312-ch-05-section-04': {
    ...LIB_CASE_META,
    title: 'Four-Factor Fair Use and OER Alternatives for Workbook Copying and Film Streaming',
    clinicalDescription:
      'A Grade 10 history teacher asks the librarian to scan four complete chapters from a newly published consumable workbook and upload a full commercial documentary stream to a public class website for 150 students, insisting that nonprofit school use makes any copying automatically legal.',
    diagnosis:
      'Walk through four-factor fair use and license terms, decline consumable copying and public streaming, and supply licensed databases or Creative Commons OER.',
    explanation:
      'Educational purpose alone does not satisfy copyright fair use when copying substantial portions of consumable materials or streaming publicly harms the commercial market. Evaluating purpose, nature, amount, market effect, and existing license agreements preserves legal compliance while meeting instructional goals through lawful alternatives.',
  },
  'sl5312-ch-06-section-03': {
    ...LIB_CASE_META,
    title: 'Protecting Patron Circulation Privacy While Resolving Over-Blocking CIPA Filters',
    clinicalDescription:
      'A Grade 7 ELA teacher asks for individual student checkout histories to verify independent reading logs, while the district\'s CIPA web filter blocks reputable public-health and reproductive-biology articles needed for an assigned science inquiry unit.',
    diagnosis:
      'Protect individual borrowing privacy by sharing only aggregate usage trends, request curriculum-aligned CIPA unblocking with IT, and teach digital privacy.',
    explanation:
      'ALA ethics and FERPA principles safeguard patron circulation records as confidential to prevent chilling intellectual exploration. Simultaneously, CIPA permits schools to unblock legitimate educational resources for bona fide research rather than allowing blunt filtering to censor curriculum-aligned inquiry.',
  },
  'sl5312-ch-07-section-03': {
    ...LIB_CASE_META,
    title: 'UDL Scaffolds for Co-Taught Primary-Source Inquiry Without Lowering Rigor',
    clinicalDescription:
      'While co-planning a Grade 8 civics primary-source inquiry unit, a social studies teacher proposes excusing emergent bilinguals and students with dyslexia from document analysis and assigning them a basic matching worksheet instead to save instructional time.',
    diagnosis:
      'Preserve the shared inquiry goal while co-designing UDL scaffolds: text-to-speech databases, bilingual glossaries, tiered sources, and multimodal options.',
    explanation:
      'AASL Include and Collaborate standards distinguish access supports from watered-down expectations. Providing assistive audio, structured graphic organizers, and flexible expression formats removes decoding and language barriers while holding every student to authentic evidence-based inquiry.',
  },
  'sl5312-ch-08-section-04': {
    ...LIB_CASE_META,
    title: 'Replacing Static Website Checklists With Lateral Reading and SIFT Verification',
    clinicalDescription:
      'During a Grade 11 environmental policy project, most students cite a polished industry-funded front group as unbiased science because the site uses a ".org" domain, clean graphs, and recent dates that passed a vertical checklist without checking who funded the organization.',
    diagnosis:
      'Co-teach lateral reading and the SIFT method so learners leave the site to verify funding, compare independent coverage, and trace claims to primary studies.',
    explanation:
      'Vertical checklists reward surface polish that deceptive actors easily imitate. Media and information literacy grounded in lateral reading and SIFT (Stop, Investigate the source, Find better coverage, Trace claims) equips students to evaluate credibility, algorithmic amplification, and original evidence accurately.',
  },
  'sl5312-ch-09-section-04': {
    ...LIB_CASE_META,
    title: 'Vetting Gamified Reading Apps for Student Privacy, Accessibility, and Pedagogy',
    clinicalDescription:
      'An edtech vendor pitches a free gamified reading-quiz app that requires student email logins and collects behavioral profile data for partner marketing. A Grade 5 team wants all classes enrolled by Friday to raise weekly reading-log completion before parent conferences.',
    diagnosis:
      'Evaluate the app against learning goals, COPPA/FERPA privacy vetting, and WCAG accessibility, rejecting unvetted trackers in favor of compliant tools.',
    explanation:
      'Purposeful technology integration starts with instructional fit, student data protection, and inclusive usability rather than novelty or zero upfront cost. Rejecting tools that monetize minors\' data protects statutory privacy rights and directs teams toward vetted platforms that genuinely deepen reading engagement.',
  },
  'sl5312-ch-10-section-04': {
    ...LIB_CASE_META,
    title: 'Scaffolding Exploration Uncertainty With Guided Inquiry Design and Pathfinders',
    clinicalDescription:
      'Two weeks into an open-ended Grade 9 history paper, over half the class abandons their research questions in frustration after typing whole sentences into a search engine and pasting unverified encyclopedia summaries. The teacher fears students lack basic motivation for independent research.',
    diagnosis:
      'Co-teach Guided Inquiry Design and Kuhlthau\'s ISP with an immersion phase, curated digital pathfinder, keyword mini-lessons, and synthesis checkpoints.',
    explanation:
      'Kuhlthau\'s Information Search Process shows that uncertainty and frustration during early exploration are predictable cognitive stages rather than apathy. Embedding structured inquiry models like Guided Inquiry Design or Stripling\'s Model with targeted pathfinders and formative checkpoints guides learners from confusion to original synthesis.',
  },
  'sl5312-ch-11-section-03': {
    ...LIB_CASE_META,
    title: 'Data-Driven Library Advocacy When Certified Staffing Faces Budget Reductions',
    clinicalDescription:
      'Facing a district budget deficit, the superintendent proposes reducing the certified middle school librarian position to half-time and hiring an uncertified clerk to keep the checkout desk open. Several teachers express concern privately but lack shared evidence for the board hearing.',
    diagnosis:
      'Deliver an evidence-based advocacy brief linking co-taught inquiry, disaggregated literacy gains, database use, and AASL standards to district goals.',
    explanation:
      'Effective school library advocacy goes beyond emotional appeals or book-checkout totals to show how certified instruction drives student achievement and equity. Connecting disaggregated learning artifacts, teacher collaboration metrics, and feasible budget alternatives directly to superintendent priorities makes a persuasive policy case.',
  },
  'sl5312-ch-12-section-03': {
    ...LIB_CASE_META,
    title: 'Audience-Tailored Multilingual Outreach and Virtual Library Portal Revitalization',
    clinicalDescription:
      'Despite adding bilingual e-books and curriculum research databases, family and teacher engagement remains flat because the library posts only an annual MARC inventory report filled with cataloging jargon on a stale webpage and shares unconsented student photos in an informal social feed.',
    diagnosis:
      'Launch a jargon-free communication cadence with an updated virtual portal, multilingual family guides, teacher highlights, and strict media-release compliance.',
    explanation:
      'Strategic public relations and marketing build year-round visibility before advocacy crises arise. Tailoring plain-language updates to teachers and multilingual families, focusing on learner outcomes, maintaining an intuitive digital portal, and honoring student media-release privacy foster durable community trust.',
  },
};

module.exports = {
  educational_leadership_5412,
  school_librarian_5312,
};
