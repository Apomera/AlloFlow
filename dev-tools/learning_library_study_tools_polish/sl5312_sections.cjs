'use strict';

/**
 * Replacement sections for the 22 duplicated section slots in
 * test_prep/school_librarian_5312_learning_library.json.
 *
 * Each entry aligns to its chapter's Praxis School Librarian (5312) domain,
 * uses the exact section schema keys (`heading`, `content`, `keyTerms`), and
 * introduces concrete, non-overlapping concepts.
 */
module.exports = {
  'sl5312-ch-02-section-01': {
    heading: 'Budget models, grants, and procurement cycles',
    content:
      'Effective school library budgeting pairs fiscal stewardship with instructional goals. School librarians navigate line-item budgets (fixed allocations by category such as print, databases, and supplies), program or performance budgets tied to school improvement objectives, and zero-based budgets that justify every expenditure anew each cycle. Sound fiscal planning accounts for multi-year hardware lifecycles, recurring database renewal escalations, and district procurement rules such as approved-vendor lists and competitive quotes. When pursuing grants, book fairs, or E-rate discounts, librarians confirm that external funds supplement rather than supplant core district support and avoid launching subscription services without a sustainable renewal plan.',
    keyTerms: [
      'zero-based budgeting',
      'line-item budget',
      'procurement compliance',
      'grant sustainability',
      'total cost of ownership',
    ],
  },

  'sl5312-ch-02-section-02': {
    heading: 'Staffing, paraprofessionals, and volunteer supervision',
    content:
      'Sustaining daily library operations requires clear role differentiation between certified school librarians and support personnel. While the school librarian leads curriculum collaboration, collection curation, information-literacy instruction, and policy enforcement, trained paraprofessionals, student aides, and parent volunteers handle essential routines such as circulation desk coverage, shelving, book processing, and display upkeep. A written procedures manual standardizes opening and closing routines, emergency protocols, and material repair so service stays consistent during absences. Before any clerk, student helper, or volunteer interacts with patron records, the librarian must provide explicit training on student confidentiality and FERPA expectations.',
    keyTerms: [
      'paraprofessional supervision',
      'role differentiation',
      'volunteer confidentiality',
      'procedures manual',
      'workflow delegation',
    ],
  },

  'sl5312-ch-02-section-04': {
    heading: 'Data-driven reporting and continuous improvement cycles',
    content:
      'Operational and instructional data become actionable when synthesized into clear reports for administrators, teachers, and school boards. Rather than reporting raw circulation counts in isolation, strong annual library reports combine disaggregated circulation trends, database search sessions, collection age and diversity metrics, co-taught unit counts, and student learning artifacts. Framing findings within a Plan-Do-Study-Act (PDSA) cycle connects baseline gaps to targeted interventions and measurable next steps. Sharing concise quarterly dashboards and year-end executive summaries demonstrates return on investment, informs school improvement plans, and grounds requests for staffing, flexible scheduling, or collection upgrades in verifiable evidence.',
    keyTerms: [
      'annual library report',
      'collection age analysis',
      'PDSA improvement cycle',
      'outcome metrics',
      'disaggregated data',
    ],
  },

  'sl5312-ch-04-section-01': {
    heading: 'Classification systems, MARC21, and OPAC discovery',
    content:
      'Consistent bibliographic organization makes both print and digital collections discoverable for independent learners. School libraries commonly arrange nonfiction using the Dewey Decimal Classification system and encode holdings in MARC21 records following Resource Description and Access (RDA) conventions alongside authorized subject vocabularies such as Sears List of Subject Headings or Library of Congress Subject Headings. When a library adopts student-friendly genrefication for fiction, catalog records and spine labels must stay synchronized so discovery remains reliable. Configuring the Online Public Access Catalog (OPAC) with visual search icons, faceted limiters, series links, and direct database access lowers search barriers without locking readers into restrictive reading-level tiers.',
    keyTerms: [
      'Dewey Decimal Classification',
      'MARC21 bibliographic record',
      'RDA cataloging',
      'OPAC discovery',
      'controlled vocabulary',
    ],
  },

  'sl5312-ch-04-section-02': {
    heading: 'Fixed, flexible, and mixed scheduling models',
    content:
      'Library scheduling directly shapes whether information-literacy instruction integrates with classroom learning or operates as an isolated special. Under a fixed schedule, classes visit on a rigid weekly rotation often tied to teacher planning time, which limits extended inquiry and point-of-need research. A flexible schedule enables teachers and the school librarian to book single sessions or multi-day inquiry blocks exactly when disciplinary research, reading projects, or technology creation align with curriculum pacing. Where staffing realities require a mixed (hybrid) schedule—commonly at the elementary level—librarians reserve daily open blocks, use shared booking calendars, and maintain open-pass checkout policies so individual learners and small groups retain equitable access.',
    keyTerms: [
      'flexible scheduling',
      'fixed scheduling',
      'mixed schedule model',
      'point-of-need access',
      'open circulation',
    ],
  },

  'sl5312-ch-04-section-04': {
    heading: 'Inventory management, CREW weeding, and digital licensing',
    content:
      'Accurate collection stewardship combines routine physical inventory audits with planned deselection and digital license management. Running periodic Integrated Library System (ILS) barcode inventories identifies lost, damaged, or misshelved titles so catalog records reflect true shelf availability. For deselection, librarians apply the CREW method and MUSTIE criteria—removing materials that are Misleading, Ugly, Superseded, Trivial, Irrelevant, or readily available Elsewhere—while consulting curriculum maps and retaining historically significant or uniquely representative works. For e-books, audiobooks, and databases, stewardship requires comparing licensing models (one-copy/one-user, metered access, and simultaneous multi-user plans) and leveraging interlibrary loan networks to stretch budgets equitably.',
    keyTerms: [
      'CREW weeding method',
      'MUSTIE criteria',
      'ILS inventory audit',
      'e-book licensing models',
      'interlibrary loan',
    ],
  },

  'sl5312-ch-06-section-01': {
    heading: 'Reconsideration procedures and ALA intellectual freedom principles',
    content:
      'Protecting learners\' right to read and inquire rests on First Amendment principles, the ALA Library Bill of Rights, the Freedom to Read Statement, and board-approved reconsideration procedures adopted well before any challenge arises. When a stakeholder questions a library resource, the librarian listens respectfully, explains selection criteria, shares the formal reconsideration form, and keeps the item accessible on shelves while a representative committee evaluates the work as a whole rather than isolated excerpts. Librarians avoid quiet self-censorship, prejudicial warning labels, or restricted-shelf barriers that chill student exploration, while honoring every parent or guardian\'s right to guide reading choices for their own child without restricting access for other families.',
    keyTerms: [
      'Library Bill of Rights',
      'reconsideration committee',
      'self-censorship',
      'prejudicial labeling',
      'First Amendment rights',
    ],
  },

  'sl5312-ch-06-section-02': {
    heading: 'Fair use, TEACH Act, and Creative Commons licensing',
    content:
      'Ethical information use requires distinguishing copyright ownership, statutory exemptions, and open licensing. Under 17 U.S.C. Section 107, fair use is evaluated case by case across four balanced factors: purpose and character of use (including nonprofit educational and transformative use), nature of the copyrighted work, amount and substantiality used, and effect on the potential market. Librarians help educators separate face-to-face classroom performance and display permissions under Section 110(1) from the narrower Section 110(2) TEACH Act conditions governing mediated digital transmissions. Teaching staff and students to locate public domain materials, Open Educational Resources (OER), and Creative Commons licenses (such as CC BY, NC, SA, and ND) promotes lawful creation alongside proper citation.',
    keyTerms: [
      'four-factor fair use',
      'transformative use',
      'TEACH Act',
      'Creative Commons licenses',
      'public domain',
    ],
  },

  'sl5312-ch-06-section-04': {
    heading: 'Student data privacy laws, CIPA filtering, and ethical AI use',
    content:
      'Safeguarding learners in digital environments involves both federal legal compliance and proactive instructional guidance. Librarians uphold FERPA by protecting student education and circulation records from unauthorized disclosure, enforce COPPA by verifying parental consent or vetted school-official agreements before students under age 13 use online accounts, and align with CIPA requirements for E-rate-funded schools—pairing required technology protection measures with prompt, transparent procedures to unblock overfiltered educational sites. Before adopting any web platform or AI tool, librarians review data-retention terms to ensure vendors do not profile or sell student data, while teaching learners to detect algorithmic bias, protect personal information, and disclose generative AI assistance with academic integrity.',
    keyTerms: [
      'FERPA compliance',
      'COPPA protections',
      'CIPA filtering',
      'edtech privacy vetting',
      'academic integrity',
    ],
  },

  'sl5312-ch-08-section-01': {
    heading: 'Universal Design for Learning and assistive library access',
    content:
      'Universal Design for Learning (UDL) shifts library instruction and resource design from reactive retrofits to proactive accessibility. Librarians build multiple means of engagement, representation, and action/expression into inquiry units—offering print, audio, captioned video, and graphic organizers alongside varied ways to demonstrate mastery—without lowering cognitive rigor. In partnership with special educators and multilingual learner specialists, librarians verify that subscription databases meet WCAG screen-reader and keyboard-navigation standards, connect eligible learners with Bookshare or NIMAS accessible formats, maintain clear ADA aisle widths and adjustable workstations, and curate bilingual glossaries and high-interest, accessible texts for diverse readers.',
    keyTerms: [
      'Universal Design for Learning',
      'assistive technology',
      'WCAG accessibility',
      'multilingual scaffolds',
      'ADA physical access',
    ],
  },

  'sl5312-ch-08-section-02': {
    heading: 'Performance rubrics, inquiry artifacts, and evidence of learning',
    content:
      'Measuring the instructional impact of the school library requires transparent assessment tools co-created with classroom teachers. Analytic rubrics, checkpoint conferences, research logs, and annotated bibliographies evaluate both disciplinary content mastery and AASL Shared Foundations—such as formulating focused questions, refining search terms, corroborating evidence, and synthesizing findings ethically. Separating process evidence (how learners select, evaluate, and cite sources) from final presentation polish lets educators deliver timely, criterion-referenced feedback and adjust mini-lessons mid-unit. Aggregated anonymized rubric data also provides compelling evidence to administrators showing how collaborative library instruction strengthens student achievement.',
    keyTerms: [
      'analytic rubric',
      'inquiry process evidence',
      'research log',
      'criterion-referenced feedback',
      'AASL Shared Foundations',
    ],
  },

  'sl5312-ch-09-section-01': {
    heading: 'Readers\' advisory, diverse literature, and reading culture',
    content:
      'Cultivating lifelong readers starts with welcoming, judgment-free readers\' advisory conversations that match books to student curiosity and appeal factors—pacing, tone, character voice, storyline, and visual layout—rather than restricting choice to numerical reading-level bands. Drawing on Rudine Sims Bishop\'s metaphor of books as windows, mirrors, and sliding glass doors, librarians curate culturally authentic literature across formats including graphic novels, verse novels, audiobooks, magazines, and narrative nonfiction. Schoolwide reading culture grows through energetic booktalks, peer recommendation shelves, mock award committees, author visits, and barrier-free checkout policies that honor voluntary independent reading.',
    keyTerms: [
      'readers\' advisory',
      'windows and mirrors',
      'appeal factors',
      'format inclusivity',
      'booktalks',
    ],
  },

  'sl5312-ch-09-section-02': {
    heading: 'Lateral reading, SIFT verification, and news literacy',
    content:
      'Modern source evaluation moves learners beyond static surface checklists (such as judging a site by its domain suffix or layout) toward civic online reasoning. Librarians explicitly model lateral reading—opening new tabs to investigate who funds or publishes an unfamiliar site—alongside Mike Caulfield\'s SIFT routine: Stop before sharing, Investigate the source, Find better coverage, and Trace claims, quotes, and media back to their original context. Students practice spotting native advertising, manipulated images, cherry-picked charts, and confirmation bias across news feeds and short-form video, building habits of calm verification before citing or amplifying information.',
    keyTerms: [
      'lateral reading',
      'SIFT method',
      'civic online reasoning',
      'claim tracing',
      'confirmation bias',
    ],
  },

  'sl5312-ch-10-section-01': {
    heading: 'Learning commons design and flexible spatial zoning',
    content:
      'A contemporary school library operates as a flexible learning commons engineered to host multiple instructional and independent activities simultaneously. Thoughtful spatial design establishes clear acoustic zones—separating quiet reading and individual study areas from collaborative table clusters, presentation screens, and hands-on creation benches. Mobile shelving, lightweight modular furniture, abundant power access, and unobstructed supervision sightlines allow the room to reconfigure rapidly between whole-class seminars and small-group inquiry. Clear multilingual wayfinding signage, universal physical accessibility, and student voice in displays foster an inclusive third space where every learner experiences ownership and belonging.',
    keyTerms: [
      'learning commons',
      'acoustic zoning',
      'wayfinding signage',
      'mobile furnishings',
      'supervision sightlines',
    ],
  },

  'sl5312-ch-10-section-02': {
    heading: 'Makerspaces, design thinking, and participatory creation',
    content:
      'Library makerspaces and digital media studios extend information literacy from consumption to participatory creation. Grounded in the design-thinking cycle—empathize, define, ideate, prototype, and test—students combine research with hands-on iteration across both low-tech materials (cardboard engineering, textiles, circuits) and digital tools (podcasting, video editing, coding, and 3D fabrication). Rather than operating as an unguided play zone or exclusive club, an equitable school library makerspace enforces clear tool-safety protocols, ties maker challenges directly to curricular inquiry in science, social studies, or ELA, and provides open drop-in access so all learners can experiment, troubleshoot failure, and share authentic products.',
    keyTerms: [
      'school library makerspace',
      'design thinking cycle',
      'participatory learning',
      'safety protocols',
      'authentic creation',
    ],
  },

  'sl5312-ch-10-section-03': {
    heading: 'Instructional technology frameworks: SAMR, TPACK, and Triple E',
    content:
      'Evaluating educational technology through established instructional frameworks keeps pedagogy ahead of novelty. Librarians apply TPACK to align technological choices with sound pedagogy and disciplinary content knowledge; use Puentedura\'s SAMR model to distinguish basic substitution and augmentation from modification and redefinition tasks that enable collaboration or creation impossible without digital tools; and check Liz Kolb\'s Triple E framework to verify that a tool genuinely engages learners on task, enhances conceptual understanding, and extends learning to real-world contexts. Pairing these lenses with accessibility, bandwidth equity, and data-privacy vetting prevents tool overload and ensures technology measurably improves student learning.',
    keyTerms: [
      'TPACK framework',
      'SAMR model',
      'Triple E framework',
      'pedagogical alignment',
      'digital curation',
    ],
  },

  'sl5312-ch-10-section-04': {
    heading: 'Inquiry process models and scaffolded research instruction',
    content:
      'Structured inquiry models give students a repeatable roadmap for navigating complex research without feeling overwhelmed. School librarians select and adapt frameworks matched to learner readiness, such as Barbara Stripling\'s Model of Inquiry (Connect, Wonder, Investigate, Construct, Express, Reflect), Carol Kuhlthau\'s Guided Inquiry Design and Information Search Process—which deliberately supports learners through predictable dips of uncertainty during topic exploration—and Eisenberg and Berkowitz\'s Big6 or Super3 for younger students. Pairing each phase with targeted mini-lessons, curated digital pathfinders, and note-taking organizers helps learners move from initial curiosity to evidence-backed synthesis and metacognitive reflection.',
    keyTerms: [
      'Stripling Model of Inquiry',
      'Guided Inquiry Design',
      'Big6 research model',
      'digital pathfinder',
      'Information Search Process',
    ],
  },

  'sl5312-ch-11-section-04': {
    heading: 'Instructional coaching, PLCs, and curriculum committee leadership',
    content:
      'School librarians amplify instructional impact by serving as collaborative teacher-leaders across building and district decision-making structures. Active participation in grade-level Professional Learning Communities (PLCs), textbook and digital-curriculum adoption committees, and school improvement teams embeds information literacy, diverse texts, and accessibility standards into schoolwide units from the outset. Through non-evaluative instructional coaching—co-planning, modeling research or edtech strategies, co-teaching, and debriefing student work—librarians build faculty confidence steadily. Sustaining this leadership requires ongoing personal professional growth via AASL and state library associations, peer-reviewed research, and regular reflective self-assessment.',
    keyTerms: [
      'Professional Learning Communities',
      'instructional coaching',
      'curriculum leadership',
      'job-embedded PD',
      'reflective practice',
    ],
  },

  'sl5312-ch-12-section-01': {
    heading: 'Public library and community organization partnerships',
    content:
      'Strategic partnerships with public libraries, museums, local archives, and civic nonprofits extend student learning well beyond school walls and calendars. High-impact school-public library collaborations include automatic student library e-cards, coordinated summer reading outreach to counter seasonal learning loss, shared homework-help databases, and reciprocal visits that familiarize families with free community resources. Strong partnerships rest on clear memoranda of understanding (MOUs) defining shared goals, communication leads, FERPA-compliant student data boundaries, and equitable access for students lacking home transportation or broadband—creating durable community ecosystems rather than one-off events.',
    keyTerms: [
      'public library partnership',
      'student e-card access',
      'memorandum of understanding',
      'summer reading bridge',
      'community resources',
    ],
  },

  'sl5312-ch-12-section-02': {
    heading: 'Family engagement and multilingual program outreach',
    content:
      'Meaningful family engagement treats caregivers as knowledgeable partners in literacy and digital learning rather than passive recipients of school announcements. School librarians lower participation barriers by translating library guides and event notices into home languages, offering flexible scheduling for family literacy nights, and hosting practical workshops on navigating research databases, e-book apps, and healthy digital-citizenship routines at home. Inviting families to suggest culturally sustaining collection titles, join library advisory groups, or share community heritage ensures every household sees its language, identity, and aspirations respected inside the school library program.',
    keyTerms: [
      'two-way family communication',
      'multilingual outreach',
      'family literacy nights',
      'culturally sustaining engagement',
      'home-school connection',
    ],
  },

  'sl5312-ch-12-section-03': {
    heading: 'Stakeholder communication, public relations, and program marketing',
    content:
      'Effective library communication distinguishes everyday public relations and marketing from targeted advocacy. Public relations and marketing build ongoing visibility and trust—highlighting new acquisitions, collaborative student showcases, virtual library portals, and concise newsletters tailored to teachers, families, and administrators. Advocacy mobilizes those informed relationships around specific policy, funding, or staffing decisions backed by student-impact data. Across all channels, librarians write in clear, jargon-free language focused on learner outcomes rather than internal library procedures, honor district media-release and student-privacy permissions, and maintain a regular communication cadence throughout the entire academic year.',
    keyTerms: [
      'public relations',
      'program marketing',
      'virtual library portal',
      'audience-tailored messaging',
      'stakeholder engagement',
    ],
  },

  'sl5312-ch-12-section-04': {
    heading: 'Professional ethics, AASL standards alignment, and legislative advocacy',
    content:
      'Daily library leadership is anchored by the ALA Code of Ethics, which commits practitioners to equitable service, intellectual freedom, patron confidentiality, respect for intellectual property, and avoidance of personal conflicts of interest in vendor or collection decisions. Mapping local program goals to the AASL National School Library Standards and state library frameworks provides an authoritative benchmark when presenting budget testimony to school boards or participating in nonpartisan legislative advocacy for certified library staffing and funding. By equipping parents, educators, and professional associations with accurate program evidence, librarians safeguard students\' long-term access to effective school libraries.',
    keyTerms: [
      'ALA Code of Ethics',
      'AASL National Standards',
      'conflict of interest',
      'board budget testimony',
      'legislative advocacy',
    ],
  },
};
