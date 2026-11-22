'use strict';

// Balanced-choice overrides for the Praxis School Librarian (5312) source item banks.
// Entries are keyed by space-separated "SL<bankIndex>.<questionIndex>" ids matching
// item_content.cjs order, replacing the choice set with balanced, plausible options
// and three authored option-specific distractor notes.
const entries = [
  {
    ids: 'SL0.0 SL0.1 SL0.2 SL0.3',
    correct: 'Combine disaggregated use, achievement, curriculum, stakeholder, and access data before setting program priorities.',
    distractors: [
      'Use annual print circulation totals alone to determine every instructional and purchasing priority for the year.',
      'Roll last year’s library improvement plan forward unchanged so program expectations stay steady for staff.',
      'Survey frequent regular library visitors alone and generalize their preferences across the entire school.',
    ],
    notes: [
      'Circulation totals count checkouts yet miss database access, instructional collaboration, nonusers, and subgroup equity gaps across the school.',
      'Repeating last year’s plan ignores shifts in enrollment, curriculum standards, student needs, and newly documented access barriers.',
      'Sampling only frequent visitors introduces severe selection bias and omits the very students currently underserved by the library program.',
    ],
  },
  {
    ids: 'SL0.4 SL0.5 SL0.6 SL0.7',
    correct: 'Align the library mission and measurable goals with school priorities, learner needs, access, and freedom.',
    distractors: [
      'Draft annual library goals primarily around hardware and furniture purchases rather than student learning outcomes.',
      'Adopt a generic model mission statement from an external handbook without gathering local stakeholder input.',
      'Operate the library program independently from classroom curriculum priorities and building improvement plans.',
    ],
    notes: [
      'Equipment purchases are inputs rather than student outcomes; goals should show how resources expand equitable learning and inquiry.',
      'A generic statement drafted without local input lacks ownership and fails to reflect the community’s distinct learner needs.',
      'Separating the library from schoolwide curriculum weakens collaboration, instructional relevance, and measurable impact on student achievement across grades.',
    ],
  },
  {
    ids: 'SL0.8 SL0.9 SL0.10 SL0.11',
    correct: 'Build a transparent evidence-based budget linking spending to priorities, lifecycle costs, access, and equity.',
    distractors: [
      'Spend remaining year-end funds rapidly on the newest commercial gadgets regardless of documented student needs.',
      'Divide collection funds evenly across every format without reviewing usage patterns, curriculum gaps, or access.',
      'List initial purchase prices alone while omitting annual licensing renewals, upkeep, accessibility, and replacement.',
    ],
    notes: [
      'Buying unaligned products wastes scarce public funds and leaves documented curriculum, language, and accessibility priorities underfunded.',
      'Equal format splits ignore sharply differing curricular needs, digital access realities, and subgroup demand across the building.',
      'Omitting renewal, maintenance, and replacement costs creates multi-year budget cliffs that threaten sustained access to vital resources.',
    ],
  },
  {
    ids: 'SL0.12 SL0.13 SL0.14 SL0.15',
    correct: 'Use process, participation, access, and learner-outcome data to evaluate delivery and revise the program.',
    distractors: [
      'Report total annual book checkouts alone as comprehensive evidence of the school library’s instructional impact.',
      'Alter staffing, scheduling, and instruction at once without documenting how planned changes were implemented.',
      'Claim strong schoolwide academic impact strictly from informal positive hallway comments shared by visitors.',
    ],
    notes: [
      'Checkout totals track circulation volume yet fail to capture inquiry learning, co-teaching outcomes, or equitable subgroup access.',
      'Changing multiple undocumented variables at once prevents the librarian from identifying what worked or diagnosing implementation gaps.',
      'Informal hallway praise reflects selective personal impressions rather than systematic participation, equitable access, and student-outcome evaluation data.',
    ],
  },
  {
    ids: 'SL0.16 SL0.17 SL0.18 SL0.19',
    correct: 'Set clear, consistent procedures with stakeholder input, law, safety, privacy, reconsideration, and appeals.',
    distractors: [
      'Handle each collection or access dispute informally case by case without relying on written policy criteria.',
      'Apply looser approval or access standards to popular viewpoints while scrutinizing unfamiliar topics more strictly.',
      'Promise absolute secrecy over every student library conversation regardless of safety or mandated-reporting law.',
    ],
    notes: [
      'Informal ad-hoc handling invites inconsistency, bias, and legal vulnerability when written board-approved procedures should govern fairly.',
      'Viewpoint-based double standards violate core intellectual freedom principles and leave collection governance open to serious legal and community challenge.',
      'Student privacy is vital, yet librarians cannot promise secrecy that overrides immediate safety or statutory reporting obligations.',
    ],
  },
  {
    ids: 'SL1.0 SL1.1 SL1.2 SL1.3',
    correct: 'Apply board selection policy, curriculum and community data, professional reviews, diversity audits, and access.',
    distractors: [
      'Select new collection titles primarily from genres and authors the school librarian personally enjoys reading.',
      'Use bestseller popularity charts as the single deciding criterion for building every section of the collection.',
      'Avoid acquiring resources representing unfamiliar cultural or intellectual perspectives to prevent potential complaints.',
    ],
    notes: [
      'Personal reading taste narrows collection breadth and overlooks diverse learner identities, grade-level curriculum standards, and vital accessibility formats.',
      'Popularity matters for engagement, yet relying on it alone neglects curricular depth, authoritative nonfiction, and underrepresented voices.',
      'Self-censorship to avoid controversy violates intellectual freedom and deprives learners of windows, mirrors, and balanced inquiry.',
    ],
  },
  {
    ids: 'SL1.4 SL1.5 SL1.6 SL1.7',
    correct: 'Apply consistent descriptive and subject metadata, authorized access points, and unbiased local notes.',
    distractors: [
      'Create a custom informal classification rule for each new book so shelving reflects intuitive daily judgments.',
      'Strip subject headings out of catalog records to shorten cataloging time and simplify search displays.',
      'Keep outdated stigmatizing subject labels in local records even when neutral current terminology is available.',
    ],
    notes: [
      'Inconsistent ad-hoc rules break collocation and make it difficult for students and educators to locate related resources reliably.',
      'Removing subject headings severely limits topical discovery when students search by concept rather than exact title or author.',
      'Outdated biased subject labels alienate student learners and impede accurate topical discovery when respectful standardized terms already exist.',
    ],
  },
  {
    ids: 'SL1.8 SL1.9 SL1.10 SL1.11',
    correct: 'Apply written weeding criteria covering accuracy, condition, relevance, use, duplication, and curriculum.',
    distractors: [
      'Discard every book that did not circulate during the past academic year without checking curricular value.',
      'Keep scientifically outdated or inaccurate reference volumes on shelves so library stacks continue looking full.',
      'Pull challenged viewpoints from shelves quietly during routine weeding without using formal reconsideration policy.',
    ],
    notes: [
      'Low annual checkout can reflect poor display or shifting units rather than low value; weeding requires multi-factor criteria.',
      'Retaining inaccurate or misleading materials harms student inquiry and clutters shelves so quality current titles are harder to find.',
      'Using routine weeding as stealth censorship circumvents transparent, viewpoint-neutral board reconsideration procedures and fair due process protections.',
    ],
  },
  {
    ids: 'SL1.12 SL1.13 SL1.14 SL1.15',
    correct: 'Use flexible scheduling and accessible physical and digital design so learners reach library resources on demand.',
    distractors: [
      'Lock the entire library calendar into fixed weekly class rotations so every homeroom visits on set days.',
      'Close independent student browsing and checkout whenever another classroom group is working in the library.',
      'Subscribe to digital databases that function strictly inside school buildings on district-managed desktops.',
    ],
    notes: [
      'Rigid fixed scheduling blocks point-of-need inquiry collaboration and severely restricts flexible resource access during authentic classroom units.',
      'Shutting out independent learners during class sessions creates avoidable bottlenecks when zoned spaces can support simultaneous use.',
      'Restricting digital access to school desktops widens homework and equity gaps for learners working from varied home devices.',
    ],
  },
  {
    ids: 'SL1.16 SL1.17 SL1.18',
    correct: 'Collect minimal needed user data, limit access and retention, state practices, and use lawful sharing rules.',
    distractors: [
      'Post individual students’ reading histories on hallway bulletin boards to spark friendly checkout competition.',
      'Retain identifiable student checkout logs indefinitely in the system so past reading choices stay searchable.',
      'Share a single staff login across multiple classes so students bypass individual licensed database restrictions.',
    ],
    notes: [
      'Publishing reading histories violates student privacy and chills free intellectual exploration of sensitive or personal topics.',
      'Keeping identifiable borrowing logs without a legitimate purpose increases data-breach exposure and conflicts with privacy minimization.',
      'Sharing staff credentials violates vendor license agreements and basic security controls instead of using lawful interlibrary resource-sharing agreements.',
    ],
  },
  {
    ids: 'SL2.0 SL2.1 SL2.2 SL2.3',
    correct: 'Turn an information need into focused questions, keywords, synonyms, source types, tools, and iterative search plans.',
    distractors: [
      'Type the entire classroom assignment prompt into one general search box and rely on the top hit shown.',
      'Pick a familiar favorite website first before clarifying what specific question or evidence the task requires.',
      'Conclude after one unsuccessful keyword search that no credible information exists on the assigned topic.',
    ],
    notes: [
      'Pasting full prompts and taking the first hit skips strategic keyword analysis, source-type matching, and iterative refinement.',
      'Choosing a source before defining the information need often leads to mismatched evidence, bias, or shallow coverage.',
      'Empty initial hits usually signal narrow terms or the wrong database; effective searchers revise synonyms and search strategies.',
    ],
  },
  {
    ids: 'SL2.4 SL2.5 SL2.6 SL2.7',
    correct: 'Evaluate authority, evidence, purpose, currency, context, corroboration, and fit for the specific need.',
    distractors: [
      'Treat a website’s domain suffix such as .org or .edu as reliable proof that its claims are accurate.',
      'Discard every source that expresses an explicit point of view rather than analyzing its supporting evidence.',
      'Select whichever webpage has the cleanest visual design without checking authorship, citations, or corroboration.',
    ],
    notes: [
      'Domain suffixes show registration type rather than accuracy; advocacy groups and student pages routinely hold .org or .edu domains.',
      'Perspective alone does not make a source useless; learners should inspect evidence quality, purpose, and lateral corroboration.',
      'Polished page design can mask misinformation or commercial motives, making careful authority and evidence verification completely indispensable.',
    ],
  },
  {
    ids: 'SL2.8 SL2.9 SL2.10 SL2.11',
    correct: 'Keep access under viewpoint-neutral selection and review policies while honoring family choice and due process.',
    distractors: [
      'Pull a questioned library book off the shelf right away after receiving an informal verbal complaint.',
      'Allow one family’s personal objection to dictate whether other families’ children may access a shared resource.',
      'Defend a challenged title during review strictly because the school librarian personally values the author.',
    ],
    notes: [
      'Immediate informal shelf removal bypasses adopted board reconsideration procedures and undermines fair, transparent, viewpoint-neutral collection governance.',
      'Families guide their own children’s reading choices, yet one household cannot restrict lawful access for the wider school community.',
      'Formal reconsideration reviews evaluate curricular alignment, professional reviews, and selection criteria objectively rather than personal librarian preference.',
    ],
  },
  {
    ids: 'SL2.12 SL2.13 SL2.14 SL2.15',
    correct: 'Weigh ownership, license terms, public domain, permission, and fact-specific fair use before sharing works.',
    distractors: [
      'Assume any classroom copying for nonprofit school lessons qualifies automatically under fair-use protections.',
      'Upload a complete copy of a licensed commercial workbook to a public school webpage for easy family access.',
      'Treat accurate bibliographic citation as a legal substitute for securing copyright permission or license rights.',
    ],
    notes: [
      'Educational purpose is only one fair-use factor; nature, amount, and market effect must still be weighed against license terms.',
      'Posting an entire licensed work publicly exceeds educational exceptions and typically breaches both copyright law and contract terms.',
      'Proper citation prevents plagiarism ethically yet does not grant legal permission to reproduce or distribute copyrighted material.',
    ],
  },
  {
    ids: 'SL2.16 SL2.17 SL2.18 SL2.19',
    correct: 'Teach identity, consent, data sharing, security, respectful dialogue, algorithms, and platform risks actively.',
    distractors: [
      'Cover digital citizenship through one brief annual assembly lecturing students about choosing strong passwords.',
      'Require students to create public social-media accounts without checking age restrictions or privacy policies.',
      'Enter sensitive identifiable student data into a free online platform simply because its signup screen asks.',
    ],
    notes: [
      'A single password lecture misses critical habits around consent, algorithmic persuasion, digital footprint, and respectful online dialogue.',
      'Requiring public accounts without privacy and COPPA/FERPA vetting exposes minors to tracking, contact risks, and policy violations.',
      'Free web tools still require privacy and legal review; collecting unnecessary student data violates data-minimization safeguards.',
    ],
  },
  {
    ids: 'SL3.0 SL3.1 SL3.2 SL3.3',
    correct: 'Co-plan standards, inquiry goals, roles, resources, access, formative checks, and transfer with teachers.',
    distractors: [
      'Wait until a teacher asks for a quick list of websites right after an instructional unit has already ended.',
      'Teach an isolated library catalog drill disconnected from current classroom content, inquiry, or assignments.',
      'Define collaboration strictly as pulling requested books onto a cart while never sharing instructional planning.',
    ],
    notes: [
      'Late website lists after instruction ends miss the chance to embed inquiry skills, scaffolds, and assessment inside authentic learning.',
      'Isolated library catalog drills rarely transfer to authentic academic research compared with integrated, curriculum-embedded collaborative co-teaching.',
      'Supplying resources supports teachers logistically, yet genuine instructional partnership integrates shared curriculum planning, co-teaching, and formative assessment.',
    ],
  },
  {
    ids: 'SL3.4 SL3.5 SL3.6 SL3.7',
    correct: 'State observable learner outcomes and align instruction, practice, resources, and assessment to thinking rigor.',
    distractors: [
      'Write the lesson objective around what slides and databases the librarian plans to cover during class.',
      'Administer a brief factual recall quiz when the stated objective requires evaluating sources and creating arguments.',
      'Select engaging technology activities first and infer a matching learning objective after the lesson finishes.',
    ],
    notes: [
      'Learning objectives should specify observable, measurable student outcomes rather than listing adult presentation activities or resource coverage.',
      'Testing basic recall fails to assess evaluation or creation, creating a clear mismatch between objective rigor and assessment.',
      'Backward design starts with desired learning outcomes first so activities and resources purposefully serve clear instructional targets.',
    ],
  },
  {
    ids: 'SL3.8 SL3.9 SL3.10 SL3.11',
    correct: 'Keep rigorous goals while adapting representation, scaffolds, language aids, tools, and response options.',
    distractors: [
      'Simplify the core inquiry standard whenever a student requires language or accessibility accommodations.',
      'Assign one identical text and single written essay format to every student so grading stays strictly equal.',
      'Wait for a student to fail an independent research task before implementing documented IEP accommodations.',
    ],
    notes: [
      'Lowering core goals denies equitable rigor when scaffolds and accessible formats allow learners to master the same target.',
      'Identical unadapted formats create avoidable construct-irrelevant barriers instead of offering flexible pathways for learners to demonstrate mastery.',
      'Documented IEP and Section 504 accommodations are legally required upfront rather than withheld until academic failure occurs.',
    ],
  },
  {
    ids: 'SL3.12 SL3.13 SL3.14 SL3.15',
    correct: 'Gather interpretable evidence during learning and use it with learners to give actionable feedback and adjust plans.',
    distractors: [
      'Enter a final unit project grade after instruction concludes and label the score as formative assessment.',
      'Collect daily inquiry exit tickets faithfully each class without reviewing patterns or adjusting upcoming lessons.',
      'Offer warm general praise for student effort without identifying a concrete research strategy or next step.',
    ],
    notes: [
      'End-of-unit grading is summative rather than formative because it occurs too late to guide in-progress instructional adjustments.',
      'Unexamined exit tickets add routine paperwork without generating timely feedback or responsive instructional shifts for struggling learners.',
      'Effort praise feels encouraging yet gives learners no actionable guidance on how to strengthen their inquiry or evaluation skills.',
    ],
  },
  {
    ids: 'SL3.16 SL3.17 SL3.18 SL3.19',
    correct: 'Pair learner knowledge, wide choice, sustaining collections, book access, dialogue, and warm support.',
    distractors: [
      'Restrict each student to checking out books within one single assigned reading-level bin all semester.',
      'Measure and reward reading engagement strictly through total page counts logged for classroom prizes.',
      'Narrow book choices and checkout limits for reluctant readers so they finish assigned texts faster.',
    ],
    notes: [
      'Confining voluntary reading to one narrow level strips autonomy, stigmatizes readers, and ignores interest and background knowledge.',
      'Page-count rewards foster extrinsic gaming and discourage complex genres, graphic novels, poetry, and authentic reading joy.',
      'Reluctant readers benefit most from broader choice, appealing formats, and low-pressure access rather than tighter restrictions.',
    ],
  },
  {
    ids: 'SL3.20 SL3.21 SL3.22 SL3.23',
    correct: 'Teach learners to test claims across media, trace evidence, spot persuasion, verify, and share ethically.',
    distractors: [
      'Instruct students that detecting any author perspective or bias makes an information source completely unusable.',
      'Require students to apply one rigid static fact-checking acronym identically across every media context.',
      'Analyze camera angles and graphic polish alone without examining factual claims, evidence, or corroboration.',
    ],
    notes: [
      'Nearly all sources carry context or viewpoint; media literacy teaches analyzing evidence and corroboration rather than blanket rejection.',
      'Static checklists often fail on manipulated media; lateral reading and context-sensitive verification adapt far more reliably across formats.',
      'Focusing solely on production polish misses whether underlying claims are accurate, sourced, or corroborated by independent evidence.',
    ],
  },
  {
    ids: 'SL3.24 SL3.25 SL3.26 SL3.27',
    correct: 'Build co-created norms, flexible zones, smooth transitions, tech habits, and restorative responses.',
    distractors: [
      'Enforce strict total silence across every library corner regardless of collaborative inquiry or maker tasks.',
      'Arrange fixed permanent furniture layouts before identifying instructional activities and accessibility needs.',
      'Use public hallway removal as the immediate first response whenever minor off-task chatter occurs.',
    ],
    notes: [
      'Modern school libraries support both quiet focus and active collaboration simultaneously through purposeful zoning and clear norms.',
      'Rigid furniture planned without learner tasks or mobility access restricts flexible instruction and excludes students with physical needs.',
      'Public exclusion escalates embarrassment and cuts learning time when calm, restorative redirection and clear routines work better.',
    ],
  },
  {
    ids: 'SL3.28',
    correct: 'Adopt tech when it advances learning goals and meets access, privacy, support, and evidence standards.',
    distractors: [
      'Adopt the newest classroom software app quickly so the library demonstrates visible technological innovation.',
      'Roll out a required student research platform before verifying screen-reader and assistive-tech compatibility.',
      'Treat student click counts and excitement metrics as sufficient proof that the digital tool deepened learning.',
    ],
    notes: [
      'Novelty does not establish instructional alignment, privacy protection, or sustainable technical support for real classroom goals.',
      'Deploying unverified digital tools creates immediate disability access barriers and risks violating federal and district accessibility mandates.',
      'Clicks and surface engagement metrics do not prove students achieved target inquiry, synthesis, or critical-thinking learning outcomes.',
    ],
  },
  {
    ids: 'SL4.0',
    correct: 'Base ongoing educator capacity-building on needs data with demonstration, rehearsal, feedback, and impact.',
    distractors: [
      'Deliver the identical one-time software demonstration to every teacher regardless of role or documented need.',
      'Evaluate professional learning effectiveness strictly by counting faculty sign-in attendance sheets afterward.',
      'Introduce a complex inquiry framework in a brief meeting without providing follow-up time for supported practice.',
    ],
    notes: [
      'One-size tool demos ignore differing educator skill levels and rarely translate into sustained classroom instructional improvement.',
      'Attendance counts track seat time rather than showing whether educator practice or student inquiry outcomes actually improved.',
      'Without protected time, peer coaching, and actionable feedback, new instructional strategies rarely transfer beyond the initial awareness session.',
    ],
  },
  {
    ids: 'SL4.1',
    correct: 'Clarify competing assumptions, agree on target learner outcomes, and pick an evaluable learning format.',
    distractors: [
      'Adopt whichever professional development format the most senior committee member personally prefers right away.',
      'Schedule a single quick after-school workshop so competing opinions do not delay the yearly calendar.',
      'Take a rapid majority vote among team members and implement the top choice without examining evidence.',
    ],
    rationale: 'Professional learning design should follow shared learner outcomes rather than seniority, calendar pressure, or an unexamined vote. Naming competing assumptions and agreeing on evaluable outcomes enables a defensible, evidence-based format decision.',
    notes: [
      'Seniority reflects tenure rather than evidence that a proposed professional learning format will improve target student outcomes.',
      'Rushing into a single after-school session protects the calendar while leaving core instructional disagreements and transfer needs unaddressed.',
      'A quick vote captures initial preference without testing which professional learning structure is most likely to shift classroom practice.',
    ],
  },
  {
    ids: 'SL4.2',
    correct: 'Tie the learning design to research, define observable classroom transfer, and plan impact reporting.',
    distractors: [
      'Report workshop attendance totals and brief post-session satisfaction ratings as proof of program impact.',
      'Document the total number of workshops delivered and cumulative staff training hours across the semester.',
      'Present a chronological list of library technology topics covered during recent faculty professional meetings.',
    ],
    rationale: 'Evidence-based professional learning connects its design to research standards, observable classroom transfer, and measurable learner impact. Attendance counts, training hours, and topic lists document delivery volume without establishing changes in practice.',
    notes: [
      'Attendance totals and satisfaction surveys measure participation and immediate reaction rather than durable changes in classroom instructional practice.',
      'Total training hours describe delivery input volume yet reveal nothing about whether educators applied new strategies with learners.',
      'A chronological list of covered topics documents meeting agendas rather than demonstrating authentic classroom transfer or student benefit.',
    ],
  },
  {
    ids: 'SL4.3',
    correct: 'Add a follow-up cycle with classroom practice, peer coaching, and student-evidence review before advancing.',
    distractors: [
      'Double the number of standalone overview sessions offered each term using the same lecture presentation style.',
      'Replace the internal facilitator with an external consultant while keeping the same one-shot workshop format.',
      'Move standalone training workshops earlier in the fall calendar so a slightly larger share of staff attends.',
    ],
    rationale: 'When audits show that one-off sessions fail to change instruction, adding a follow-up cycle of application, coaching, and classroom evidence directly targets transfer. Increasing lecture volume, swapping presenters, or shifting dates leaves the transfer gap untouched.',
    notes: [
      'Repeating more standalone overview sessions scales the exact one-shot delivery model that failed to support instructional transfer.',
      'Hiring a different presenter without adding job-embedded coaching and follow-up leaves the underlying implementation weakness completely unchanged.',
      'Moving workshops earlier may raise initial attendance while still providing no structured coaching or classroom evidence review afterward.',
    ],
  },
  {
    ids: 'SL4.4',
    correct: 'Build reciprocal partnerships with learners, families, staff, public libraries, and community around shared goals.',
    distractors: [
      'Contact community partners primarily to request financial donations after school library plans are already final.',
      'Promise expansive joint services to community organizations beyond either partner’s staffing capacity or authority.',
      'Exclude affected students from partnership planning meetings because adult leaders know best what youth need.',
    ],
    notes: [
      'Asking only for money after decisions are set treats partners transactionally instead of co-designing reciprocal goals.',
      'Overpromising beyond authority or staffing capacity erodes community partner trust and causes high-visibility joint commitments to break down.',
      'Leaving students out misses vital insight into real access barriers, reading interests, and culturally sustaining priorities.',
    ],
  },
  {
    ids: 'SL4.5',
    correct: 'Define shared goals, each partner’s roles, decision rights, and scheduled review checkpoints collaboratively.',
    distractors: [
      'Assign the school librarian sole authority over every joint initiative so partner roles stay uniform.',
      'Postpone launching any community collaboration until every minor operational detail receives unanimous consent.',
      'Allow each partner organization to define its own responsibilities informally after joint services begin.',
    ],
    rationale: 'Productive partnerships clarify shared goals, responsibilities, decision rights, and review checkpoints upfront so roles stay transparent and revisable. Centralizing control, waiting for total consensus on minor details, or improvising roles creates avoidable friction.',
    notes: [
      'Centralizing all authority under the librarian replaces genuine reciprocal partnership with unilateral control and weakens shared community ownership.',
      'Waiting for unanimous agreement on every minor detail stalls valuable learner support indefinitely instead of using iterative review checkpoints.',
      'Leaving partner responsibilities undefined until after launch produces overlapping efforts, accountability gaps, and predictable communication breakdowns.',
    ],
  },
  {
    ids: 'SL4.6',
    correct: 'Document shared partnership goals, active contributions, and target learner outcomes for clear reporting.',
    distractors: [
      'Compile a contact directory listing every local civic group emailed or called during the school year.',
      'Count the total number of joint planning meetings held with external organizations across both semesters.',
      'Gather informal appreciative quotes from partner representatives to summarize overall collaborative success.',
    ],
    rationale: 'An evidence-based account of partnerships links shared goals and partner participation directly to expected learner outcomes. Outreach logs, meeting counts, and informal testimonials capture effort and goodwill without demonstrating student impact.',
    notes: [
      'A contact directory records initial outreach activity rather than showing whether joint work strengthened learner access or outcomes.',
      'Counting planning meetings measures administrative time spent talking rather than evaluating actual program delivery or student benefit.',
      'Informal partner praise captures general goodwill yet cannot replace structured outcome evidence tied to shared partnership goals.',
    ],
  },
  {
    ids: 'SL4.7',
    correct: 'Set regular joint reviews to inspect shared evidence, adjust roles, and decide whether to continue or revise.',
    distractors: [
      'Recruit several new external partner organizations right away to expand overall program visibility widely.',
      'Publish a celebratory brochure summarizing partnership events for local families and community readers.',
      'Ask each partner group to submit a separate end-of-year summary letter without holding a joint review.',
    ],
    rationale: 'Addressing partnership weaknesses requires a standing review structure where partners examine shared evidence and adjust or revise commitments. Adding more partners, publicizing events, or collecting siloed reports leaves underlying misalignment unresolved.',
    notes: [
      'Recruiting additional organizations multiplies coordination demands before diagnosing and resolving weaknesses in current partnership roles and outcomes.',
      'Publishing a promotional summary boosts public visibility yet does not repair unclear responsibilities or uneven learner outcomes.',
      'Separate end-of-year letters collect disconnected narratives without creating shared accountability or authority to revise joint practices.',
    ],
  },
  {
    ids: 'SL4.8',
    correct: 'Ground advocacy in learner needs, program data, vivid examples, stakeholder priorities, and feasible asks.',
    distractors: [
      'Base budget requests solely on the general principle that school libraries are inherently good institutions.',
      'Share raw annual activity counts without connecting library services to equitable access or student learning.',
      'Deliver the exact same technical slide deck and metrics to families, students, principals, and board trustees.',
    ],
    notes: [
      'Broad assertions about inherent value rarely persuade decision makers facing tight budgets without concrete local learner evidence.',
      'Activity counts alone show busyness rather than demonstrating how library staffing and resources advance schoolwide learning goals.',
      'Effective advocacy tailors clear evidence, examples, and feasible actions to each audience’s distinct priorities and questions.',
    ],
  },
  {
    ids: 'SL4.9',
    correct: 'Identify the specific decision and audience first, then select relevant evidence and one feasible request.',
    distractors: [
      'Build one dense universal slide presentation meant to serve every family, teacher, and board audience alike.',
      'Open advocacy talks with a multi-year chronology of past library budget cuts to establish historical context.',
      'Delay sharing library needs until after the annual budget closes so requests avoid appearing self-interested.',
    ],
    rationale: 'Effective advocacy is anchored in the specific decision to be influenced and the audience making it. Matching relevant evidence and a feasible ask to that decision outperforms universal decks, historical preambles, or poorly timed messages.',
    notes: [
      'A single universal presentation dilutes relevance and fails to answer the distinct questions each stakeholder group actually holds.',
      'Extended funding histories provide background context yet rarely answer the concrete forward-looking choices current decision makers face.',
      'Waiting until after budget decisions close forfeits the chance to inform resource priorities with timely learner-need evidence.',
    ],
  },
  {
    ids: 'SL4.10',
    correct: 'Link documented learner needs to program evidence, state a feasible ask, and commit to reporting results.',
    distractors: [
      'Emphasize in broad emotional terms how warmly students and faculty appreciate the school library space.',
      'Compare local library staffing totals against neighboring districts as the primary justification for funding.',
      'Circulate a comprehensive inventory listing every routine catalog, shelving, and circulation service offered.',
    ],
    rationale: 'Beginning-practice advocacy connects documented learner needs and program evidence to a concrete, feasible request and transparent follow-up reporting. Emotional appeals, neighbor comparisons, and service inventories do not establish a decision-ready case.',
    notes: [
      'General expressions of warmth convey goodwill yet provide neither verifiable learner-need data nor a concrete actionable proposal.',
      'Comparing neighboring districts often triggers debates over district wealth and demographics rather than addressing local student priorities.',
      'A routine service inventory describes current daily tasks without demonstrating a specific learner gap or measurable improvement goal.',
    ],
  },
  {
    ids: 'SL4.11',
    correct: 'Establish a communication schedule sharing program evidence with decision makers ahead of resource cycles.',
    distractors: [
      'Increase the frequency of general monthly book-event newsletters emailed to families throughout the year.',
      'Launch an extra social-media account posting daily photos of hallway displays and library book covers.',
      'Add a static library overview page to the school website summarizing general hours and borrowing rules.',
    ],
    rationale: 'Advocacy gaps frequently stem from timing and audience alignment rather than message volume. Delivering concise program evidence to key stakeholders ahead of budget and staffing cycles connects library data directly to real resource decisions.',
    notes: [
      'Sending more event newsletters increases volume to general readers without delivering decision-ready evidence when resource priorities are set.',
      'Daily display photos build friendly awareness yet rarely reach budget decision makers with structured student-impact evidence at key moments.',
      'A static overview webpage remains passive and fails to place timely program outcomes before stakeholders during active planning cycles.',
    ],
  },
];

const byId = new Map();
for (const entry of entries) {
  if (!Array.isArray(entry.notes) || entry.notes.length !== 3) throw new Error(`School Librarian 5312 override ${entry.ids} must supply three notes.`);
  if (!Array.isArray(entry.distractors) || entry.distractors.length !== 3) throw new Error(`School Librarian 5312 override ${entry.ids} must supply three distractors.`);
  for (const id of entry.ids.split(/\s+/).filter(Boolean)) {
    if (byId.has(id)) throw new Error(`Duplicate School Librarian 5312 override id ${id}.`);
    byId.set(id, entry);
  }
}

function applyChoiceOverrides(banks) {
  let applied = 0;
  const output = banks.map((bank, bankIndex) => ({
    ...bank,
    concepts: Array.isArray(bank.concepts)
      ? bank.concepts.map((concept, conceptIndex) => {
          const entry = byId.get(`SL${bankIndex}.${conceptIndex * 4}`);
          if (!entry) return concept;
          return [concept[0], entry.correct, entry.distractors.slice(), entry.rationale || concept[3]];
        })
      : bank.concepts,
    questions: bank.questions.map((question, questionIndex) => {
      const entry = byId.get(`SL${bankIndex}.${questionIndex}`);
      if (!entry) return question;
      applied += 1;
      return {
        ...question,
        correct: entry.correct,
        distractors: entry.distractors.slice(),
        distractorNotes: entry.notes.slice(),
        rationale: entry.rationale || question.rationale,
      };
    }),
  }));
  const total = banks.reduce((sum, bank) => sum + bank.questions.length, 0);
  if (applied !== total || byId.size !== total) throw new Error(`School Librarian 5312 choice overrides covered ${applied}/${total} questions (${byId.size} entries).`);
  return output;
}

module.exports = { applyChoiceOverrides, entries };
