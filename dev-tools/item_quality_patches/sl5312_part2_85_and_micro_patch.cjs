'use strict';

/**
 * Curated Option 2 item-quality patch:
 * - school_librarian_5312_pack: 85 editable principle-justification items (slice(86, 171))
 * - early_childhood_5025_pack: ec5025-b3-092 (rebalanced choices + rationale/choiceRationales)
 * - ap_physics_1_foundation_pilot: 2 duplicate-rationale items
 * - ap_statistics_foundation_pilot: 4 duplicate-rationale items
 * - ap_us_history_foundation_pilot: 2 duplicate-rationale items
 * - parapro_pack: 3 writing prose-cue items (rebalanced choices + rationale/choiceRationales)
 */

module.exports = {
  school_librarian_5312_pack: {
    // === Topic 1: inquiry and search strategy (4 items) ===
    'sl5312-b2-040-exp4': {
      rationale: 'During a collaborative planning disagreement over inquiry and search instruction, only the option advocating focused questions, varied keywords, synonyms, source types, and iterative search plans matches the evidence that expert searching evolves as learners test and refine results.',
      choiceRationales: [
        'Pasting an entire assignment prompt into a single general search bar and stopping at the first hit directly contradicts iterative searching, which calls for refining terms, tools, and source choices during collaborative planning.',
        'Defaulting to a familiar favorite site before defining the research question or needed evidence undermines the principle that searchers first clarify their information need and adapt tools as understanding develops.',
        'Abandoning a research inquiry after a single unsuccessful keyword attempt conflicts with the evidence that skilled searchers diagnose weak results, brainstorm synonyms, and adjust search strategies systematically.',
        'Translating a classroom information need into focused questions, alternative keywords, appropriate source types, and iterative search plans aligns directly with the principle that expert searching grows through deliberate revision.',
      ],
    },
    'sl5312-b2-041-exp4': {
      rationale: 'When a principal requests an evidence-based model for inquiry and search strategy, guiding learners to convert information needs into targeted questions, synonyms, database tools, and iterative adjustments is the only practice consistent with the principle that expert searching is cyclical and reflective.',
      choiceRationales: [
        'Teaching students to map an information need onto focused questions, varied vocabulary, specialized tools, and iterative revisions gives the principal an approach that directly enacts the evidence on adaptive searching.',
        'Encouraging students to paste an entire prompt into one broad search box and trust the top result fails the principal’s evidence-based standard because it skips query formulation, tool selection, and result evaluation.',
        'Steering learners to a habitual website prior to identifying the question and required evidence clashes with the principle that purposeful inquiry shapes which tools and search terms are chosen.',
        'Allowing students to give up after one empty keyword search misrepresents research persistence and conflicts with the evidence that searchers test new terminology and databases when initial queries stall.',
      ],
    },
    'sl5312-b2-042-exp4': {
      rationale: 'To remediate an audit-flagged weakness in inquiry and search strategy, moving learners from broad needs to focused questions, synonyms, varied source types, and iterative search revisions is the only pairing coherent with the evidence that skilled searching evolves through continuous refinement.',
      choiceRationales: [
        'Relying on whole-prompt searches and accepting the top hit would perpetuate the exact audit weakness, because one-shot searching ignores vocabulary variation, source selection, and iterative examination of results.',
        'Coaching students to break an information need into focused questions, synonyms, targeted tools, and iterative plans directly addresses the program audit by putting reflective search revision into daily practice.',
        'Opening a familiar website before clarifying what question or proof the assignment demands contradicts the audit’s evidence principle, which requires letting the clarified information need drive tool choice.',
        'Treating one failed keyword query as proof that no credible sources exist reinforces premature closure rather than the iterative troubleshooting and vocabulary shifts needed to repair the audited program gap.',
      ],
    },
    'sl5312-b2-043-exp4': {
      rationale: 'Responding to a family and student advisory concern about inquiry and search skills requires an approach that teaches focused questions, synonym generation, tool variety, and iterative revision, matching the evidence that expert searchers refine strategies as their comprehension deepens.',
      choiceRationales: [
        'Copying a full assignment prompt into a generic search bar and clicking the top link leaves students unprepared for complex research and contradicts the paired evidence emphasizing iterative query refinement.',
        'Choosing a comfortable website before identifying the exact question or evidence needed leaves advisory concerns unresolved because it bypasses need clarification and purposeful matching of information tools.',
        'Equipping learners to turn questions into structured keywords, synonyms, varied source types, and iterative search cycles answers the advisory group with practices that genuinely reflect adaptive searching.',
        'Concluding after a single failed keyword try that credible information is absent discourages student persistence and opposes the principle that effective searchers revise language and tools when results fall short.',
      ],
    },

    // === Topic 2: collaborative instructional planning (4 items) ===
    'sl5312-b2-060-exp4': {
      rationale: 'When a planning team debates what true librarian-teacher collaboration entails, co-planning standards, inquiry goals, instructional roles, resources, access, formative checks, and transfer is the sole response aligned with evidence that high-impact collaboration begins upstream before instruction starts.',
      choiceRationales: [
        'Supplying a hasty list of websites after a classroom unit has already concluded misses the planning window entirely and contradicts evidence that high-impact collaboration starts before instruction begins.',
        'Delivering a standalone library catalog drill detached from classroom content or inquiry goals fragments student learning and conflicts with the principle that collaboration merges disciplinary content with literacy and assessment.',
        'Reducing collaboration to assembling a cart of teacher-requested books without shared instructional design treats the librarian as a clerk rather than an instructional partner sharing inquiry and assessment duties.',
        'Jointly designing standards, inquiry targets, co-teaching roles, accessible resources, formative checkpoints, and transfer tasks fully matches the evidence that effective collaboration integrates instruction from the outset.',
      ],
    },
    'sl5312-b2-061-exp4': {
      rationale: 'A principal seeking an evidence-based model of collaborative instructional planning needs a practice where librarians and teachers co-plan benchmarks, inquiry goals, roles, equity, formative checks, and transfer upstream, directly matching evidence that impactful partnerships precede and span instruction.',
      choiceRationales: [
        'Partnering with teachers beforehand to co-plan benchmarks, inquiry outcomes, shared roles, equitable resources, formative checks, and transfer delivers the upstream, integrated collaboration the principal’s evidence standard requires.',
        'Waiting for a post-unit request for quick links turns library support into an afterthought and contradicts the administrative evidence that meaningful collaboration must begin prior to instructional delivery.',
        'Running an isolated catalog exercise unrelated to current coursework fails the principal’s call for evidence-based alignment because it separates library skills from disciplinary inquiry, technology, and assessment.',
        'Limiting library collaboration to wheeling requested books to classrooms omits shared planning of inquiry and assessment, creating a sharp mismatch with the principle of integrated co-instruction.',
      ],
    },
    'sl5312-b2-062-exp4': {
      rationale: 'When a library program audit flags weak collaborative instructional planning, co-planning standards, inquiry goals, teaching roles, access, formative checks, and transfer with classroom teachers is the only action consistent with the evidence that collaboration unites content, inquiry, and assessment before teaching begins.',
      choiceRationales: [
        'Reacting after a unit closes with a quick list of web links leaves the audited collaboration deficit intact because no shared pre-instruction design of inquiry or assessment ever occurs.',
        'Co-designing standards, inquiry objectives, instructional roles, accessible resources, formative checks, and transfer directly remedies the audit weakness by embedding the librarian before instruction starts.',
        'Offering an unanchored catalog skills lesson apart from classroom assignments perpetuates siloed teaching instead of uniting disciplinary content with inquiry, literacy, and technology as the evidence demands.',
        'Treating book-cart fulfillment as the full scope of collaboration keeps the library on the margins of curriculum design and contradicts the audit principle linking shared planning to instructional impact.',
      ],
    },
    'sl5312-b2-063-exp4': {
      rationale: 'Addressing a family and student advisory concern about collaborative instructional planning calls for co-planning benchmarks, inquiry goals, roles, equity, formative checks, and transfer with teachers, which directly matches evidence that effective collaboration starts before lessons and bridges content with literacy and assessment.',
      choiceRationales: [
        'Waiting until a unit finishes to share a handful of websites leaves students without timely guidance during actual learning and contradicts the principle that strong collaboration precedes instruction.',
        'Teaching a disconnected library catalog drill separate from active classroom projects wastes student time and conflicts with evidence showing collaboration must integrate inquiry with authentic disciplinary work.',
        'Collaborating early with teachers on benchmarks, inquiry aims, shared roles, equitable resources, formative checks, and transfer answers advisory concerns by ensuring coherent, well-supported student learning.',
        'Confining the librarian to loading requested books onto carts excludes shared responsibility for literacy, technology, and assessment, directly clashing with the paired principle of deep instructional partnership.',
      ],
    },

    // === Topic 3: needs assessment (3 items) ===
    'sl5312-b2-002-exp4': {
      rationale: 'To give a principal an evidence-based needs assessment model, combining disaggregated usage, achievement, curriculum, stakeholder, and access data before setting priorities is the only response aligned with the principle of triangulating quantitative and qualitative sources to uncover masked disparities.',
      choiceRationales: [
        'Basing every instructional and purchasing priority solely on annual print checkout totals ignores digital access, curriculum shifts, and underserved subgroups whose barriers are obscured by single aggregate counts.',
        'Synthesizing disaggregated usage, achievement, curriculum, stakeholder feedback, and access metrics equips the principal with triangulated evidence that reveals gaps hidden inside schoolwide averages.',
        'Copying last year’s improvement plan untouched assumes student needs, staffing, and curriculum stayed static, violating the evidence requirement to gather current multi-source data before setting priorities.',
        'Polling only frequent library regulars creates severe sampling bias and misses non-users whose access obstacles or unmet interests are precisely what a triangulated needs assessment must uncover.',
      ],
    },
    'sl5312-b2-003-exp4': {
      rationale: 'When a library program audit uncovers weak needs assessment practices, integrating disaggregated usage, achievement, curriculum, stakeholder, and access data prior to priority setting is the sole pairing consistent with triangulating mixed evidence to expose subgroup disparities.',
      choiceRationales: [
        'Relying exclusively on raw print circulation numbers repeats the audited flaw because aggregate checkout counts cannot explain instructional alignment, qualitative stakeholder experiences, or uneven subgroup access.',
        'Carrying an old library improvement plan forward without re-examining current conditions ignores the audit finding and contradicts evidence that priorities must emerge from fresh, triangulated assessment data.',
        'Combining disaggregated use, achievement, curriculum, stakeholder, and access indicators directly fixes the audit weakness by triangulating quantitative and qualitative evidence beyond schoolwide averages.',
        'Generalizing feedback from habitual library visitors to the whole campus overlooks students who rarely enter the space, defeating the audit principle of identifying groups hidden by overall averages.',
      ],
    },
    'sl5312-b2-004-exp4': {
      rationale: 'When a family and student advisory group raises concerns about needs assessment, blending disaggregated usage, achievement, curriculum, stakeholder, and equity data before choosing priorities is the only option aligned with triangulating diverse evidence to surface underserved communities.',
      choiceRationales: [
        'Letting annual print circulation volume dictate all library spending and instruction ignores family perspectives and equity barriers that aggregate book counts routinely conceal across student groups.',
        'Rolling forward a prior-year library plan unchanged signals unresponsiveness to the advisory group and contradicts the principle of using current quantitative and qualitative data to guide priorities.',
        'Surveying only regular library patrons leaves out families and students facing barriers to participation, directly contradicting the evidence that needs assessments must detect groups masked by averages.',
        'Triangulating disaggregated participation, achievement, curriculum, stakeholder input, and equity metrics honors the advisory concern by exposing hidden access disparities before setting annual priorities.',
      ],
    },

    // === Topic 4: collection development (3 items) ===
    'sl5312-b2-022-exp4': {
      rationale: 'When a principal asks for an evidence-based collection development approach, grounding acquisitions in board selection policy, curriculum and community data, professional reviews, diversity audits, and access directly fulfills the principle that collections rely on documented criteria rather than personal taste.',
      choiceRationales: [
        'Buying mostly genres and authors the librarian personally likes turns public collection stewardship into subjective preference, directly opposing the principle of documented, representative selection criteria.',
        'Applying board selection policy alongside curriculum data, community demographics, professional reviews, diversity audits, and access checks gives the principal a transparent, evidence-based acquisition process.',
        'Treating commercial bestseller lists as the sole purchasing rule neglects specialized curriculum needs, diverse community voices, and accessibility formats required by documented collection criteria.',
        'Skipping unfamiliar cultural or intellectual viewpoints out of fear of complaints practices preemptive self-censorship and undermines the goal of maintaining a representative, balanced school collection.',
      ],
    },
    'sl5312-b2-023-exp4': {
      rationale: 'To resolve a library program audit weakness in collection development, combining board selection policy, curriculum and community data, professional reviews, diversity audits, and access is the only practice aligned with building a documented, representative collection free from individual bias.',
      choiceRationales: [
        'Letting one librarian’s favorite authors and genres drive acquisitions worsens the audited vulnerability by replacing objective, transparent selection criteria with unexamined personal taste.',
        'Using bestseller charts alone to shape every section fails the audit standard because popularity metrics cannot ensure curriculum alignment, balanced perspectives, or accessible formats for all learners.',
        'Anchoring selections in board policy, curriculum and community analyses, professional reviews, diversity audits, and access criteria resolves the audit gap with defensible, documented collection practices.',
        'Avoiding resources that reflect unfamiliar cultural or intellectual viewpoints to dodge complaints violates professional collection standards and prevents the library from representing its full learning community.',
      ],
    },
    'sl5312-b2-024-exp4': {
      rationale: 'Addressing a family and student advisory concern over collection development requires applying board selection policy, curriculum and community data, professional reviews, diversity audits, and accessibility, directly matching the principle of documented, representative, inclusive collection stewardship.',
      choiceRationales: [
        'Selecting new materials primarily from the librarian’s personal reading favorites leaves families questioning fairness and directly conflicts with the principle of documented, community-responsive selection criteria.',
        'Relying strictly on commercial bestseller rankings ignores local student interests, curricular gaps, and accessibility needs raised by the advisory group rather than following multifaceted selection criteria.',
        'Declining to buy titles featuring unfamiliar cultural or intellectual viewpoints to avoid controversy narrows student representation and contradicts the commitment to an inclusive, balanced collection.',
        'Using board selection policy, curriculum and community evidence, professional reviews, diversity audits, and accessibility checks reassures families that acquisitions follow fair, representative standards.',
      ],
    },

    // === Topic 5: learning objectives and alignment (4 items) ===
    'sl5312-b2-064-exp4': {
      rationale: 'During a collaborative planning disagreement about learning objectives and alignment, stating observable learner outcomes and aligning instruction, practice, resources, and assessment to cognitive rigor is the sole option consistent with keeping tools and activities subordinate to explicit learning goals.',
      choiceRationales: [
        'Framing an objective around which slides and databases the librarian intends to present describes adult coverage rather than observable student learning, reversing the principle that tools serve outcomes.',
        'Giving a short factual recall quiz when the objective demands source evaluation and argument building breaks assessment alignment because the evidence collected fails to measure the stated cognitive rigor.',
        'Picking flashy technology activities first and retrofitting an objective afterward turns tools into the goal itself, contradicting backward design where explicit outcomes drive activity selection.',
        'Defining observable learner outcomes first and matching instruction, practice, resources, and assessments to that rigor ensures every classroom activity and tool directly serves explicit learning evidence.',
      ],
    },
    'sl5312-b2-065-exp4': {
      rationale: 'When a principal asks for an evidence-based approach to learning objectives and alignment, specifying observable student targets and calibrating instruction, tasks, resources, and assessment to thinking rigor is the only option aligned with making expected learning explicit while letting tools serve outcomes.',
      choiceRationales: [
        'Establishing observable student targets and aligning tasks, resources, instruction, and assessments to matching cognitive rigor demonstrates to the principal that tools and lessons serve measurable learning.',
        'Writing objectives as a checklist of slides and databases the librarian will cover focuses on instructional delivery rather than student mastery, clashing with evidence-based outcome alignment.',
        'Using a simple recall quiz to evaluate a higher-order objective on source analysis and argumentation produces invalid achievement evidence and fails the principal’s standard for aligned assessment.',
        'Selecting attractive digital activities before deciding what students must learn reverses instructional design and treats technology engagement as the end product rather than a vehicle for outcomes.',
      ],
    },
    'sl5312-b2-066-exp4': {
      rationale: 'Remediating an audit-identified weakness in learning objectives and alignment requires writing observable learner outcomes and aligning instruction, practice, resources, and assessment to cognitive rigor, matching the evidence that activities and tools must serve explicit learning expectations.',
      choiceRationales: [
        'Describing lesson goals by listing librarian slides and databases perpetuates the audited misalignment because educator activities do not specify what learners must independently know or demonstrate.',
        'Stating observable learner outcomes and calibrating instruction, practice, resources, and assessments to rigorous thinking resolves the audit gap by tying every lesson element to explicit evidence of learning.',
        'Pairing an inquiry objective about source evaluation and argumentation with a factual recall quiz leaves the audit defect unresolved because low-level testing cannot verify higher-order reasoning.',
        'Choosing engaging technology tasks first and attaching an objective after teaching confirms poor alignment by allowing tools to dictate instruction instead of serving predefined learner outcomes.',
      ],
    },
    'sl5312-b2-067-exp4': {
      rationale: 'When a family and student advisory group questions learning objectives and alignment, articulating observable learner outcomes and aligning instruction, practice, resources, and assessment to thinking rigor is the sole choice consistent with making learning expectations transparent so tools serve mastery.',
      choiceRationales: [
        'Telling families that lesson objectives consist of whichever slides and databases the librarian covers hides what students are actually expected to learn and contradicts outcome-centered alignment.',
        'Testing students with a brief recall quiz after promising instruction in evaluating sources and building arguments creates an unfair mismatch between taught rigor and graded performance evidence.',
        'Publishing observable learner outcomes and aligning instruction, practice, resources, and assessment to clear cognitive rigor shows families exactly what mastery looks like and how every tool supports it.',
        'Picking entertaining tech tools first and inventing an objective after the lesson finishes leaves students guessing why an activity matters and violates the principle that explicit goals guide tool use.',
      ],
    },

    // === Topic 6: mission and goals (4 items) ===
    'sl5312-b2-005-exp4': {
      rationale: 'When a collaborative planning team disagrees over library mission and goals, aligning the mission and measurable goals with school priorities, student needs, open access, and intellectual freedom is the only pairing consistent with tying library services to learning while safeguarding learner rights.',
      choiceRationales: [
        'Connecting the library mission and measurable goals to building priorities, student needs, open use, and intellectual freedom directly reflects the principle that library services advance learning and learner rights.',
        'Centering annual library goals mostly on purchasing hardware and furniture mistakes physical inventory for educational impact and neglects the principle that program goals must connect services to learning.',
        'Copying a generic mission from an outside manual without local stakeholder input fails to reflect campus priorities or community learners, clashing with collaborative, student-centered goal setting.',
        'Running the library separately from classroom curriculum and building improvement plans isolates the program and breaks the essential link between library services and schoolwide student learning.',
      ],
    },
    'sl5312-b2-006-exp4': {
      rationale: 'Presenting an evidence-based mission and goals framework to a principal requires aligning the library mission and measurable goals with building priorities, student needs, open use, and intellectual freedom, honoring both schoolwide learning aims and professional learner-rights responsibilities.',
      choiceRationales: [
        'Building annual goals mainly around equipment and furniture acquisitions gives the principal a procurement list instead of learning-centered outcomes linked to library instruction and student rights.',
        'Aligning the library mission and measurable goals with school improvement priorities, student needs, open access, and intellectual freedom pairs administrative coherence with professional ethics.',
        'Borrowing a boilerplate mission statement from an external handbook without consulting local educators or families ignores campus context and fails the standard for responsive, evidence-based planning.',
        'Operating outside classroom curriculum priorities and building plans cuts the library off from shared accountability, contradicting the principle that program goals connect library services to learning.',
      ],
    },
    'sl5312-b2-007-exp4': {
      rationale: 'To correct a program audit weakness involving mission and goals, aligning the library mission and measurable goals with school priorities, student needs, open use, and intellectual freedom is the only response matching the principle that goals link services to learning while protecting learner rights.',
      choiceRationales: [
        'Drafting goals centered on buying hardware and furniture fails to remediate the audit finding because physical upgrades alone do not demonstrate alignment to student learning or equitable access rights.',
        'Adopting a generic external handbook statement without local input leaves the audited mission disconnect intact because the goals do not reflect actual campus learners or shared school priorities.',
        'Revising the library mission and measurable goals around building priorities, student needs, open access, and intellectual freedom directly resolves the audit gap while honoring professional responsibilities.',
        'Maintaining an independent library silo apart from curriculum and school improvement plans worsens the audit weakness by severing library services from campuswide teaching and learning objectives.',
      ],
    },
    'sl5312-b2-008-exp4': {
      rationale: 'When a family and student advisory group raises concerns about mission and goals, aligning the mission and measurable goals with building priorities, student needs, open use, and intellectual freedom is the only pairing consistent with connecting library services to learning and safeguarding all learners’ rights.',
      choiceRationales: [
        'Focusing annual goals chiefly on furniture and hardware purchases overlooks the advisory group’s core interest in student learning, inclusive access, and the librarian’s educational responsibilities.',
        'Importing a generic handbook mission without local family or student input ignores the very voices raising concerns and contradicts responsive, community-grounded library goal development.',
        'Operating the library independently from classroom curricula and school improvement plans weakens coherence for students and families and violates the principle linking library services to campus learning.',
        'Co-aligning the mission and measurable goals with building priorities, student needs, open access, and intellectual freedom directly answers advisory concerns while upholding every learner’s rights.',
      ],
    },

    // === Topic 7: budget stewardship (4 items) ===
    'sl5312-b2-009-exp4': {
      rationale: 'When a collaborative planning team disagrees over budget stewardship, building a transparent, data-driven fiscal plan tying spending to priorities, lifecycle costs, access, and equity is the only option consistent with weighing total cost of ownership, documented needs, and equitable opportunity.',
      choiceRationales: [
        'Crafting a transparent, data-informed budget tied to instructional priorities, lifecycle expenses, accessibility, and equity puts total cost of ownership and documented student need at the center of team planning.',
        'Rushing to spend leftover year-end money on trendy commercial gadgets without documented student need wastes public funds and violates the principle of instructional value and evidence-based budgeting.',
        'Splitting funds identically across every format without inspecting usage data, curriculum gaps, or access barriers confuses mechanical equality with equitable budgeting guided by documented learner needs.',
        'Recording only initial sticker prices while ignoring annual license renewals, maintenance, accessibility, and replacement costs hides total cost of ownership and creates unsustainable fiscal commitments.',
      ],
    },
    'sl5312-b2-010-exp4': {
      rationale: 'A principal asking for an evidence-based budget stewardship model requires a transparent, data-driven fiscal plan connecting allocations to priorities, lifecycle costs, access, and equity, matching the principle that sound budgeting weighs total ownership cost, instructional value, and equitable opportunity.',
      choiceRationales: [
        'Spending remaining year-end dollars hastily on new commercial gadgets regardless of documented needs undermines administrative trust and contradicts fiscal stewardship anchored in instructional value.',
        'Submitting a transparent, data-driven fiscal plan linking every expenditure to campus priorities, full lifecycle costs, access, and equity directly fulfills the principal’s call for sound budgeting.',
        'Dividing collection money equally across all formats without analyzing circulation, curricular deficits, or accessibility needs misallocates scarce funds rather than targeting documented learning priorities.',
        'Presenting upfront purchase prices alone without recurring license fees, upkeep, accessibility upgrades, or replacement cycles obscures true ownership costs and leaves the principal with an incomplete budget.',
      ],
    },
    'sl5312-b2-011-exp4': {
      rationale: 'Correcting a library program audit weakness in budget stewardship requires a transparent, data-driven fiscal plan tying spending to priorities, lifecycle costs, access, and equity, which uniquely matches the evidence emphasizing total cost of ownership, documented need, and equitable opportunity.',
      choiceRationales: [
        'Burning remaining year-end funds on commercial gadgets without documented student need exemplifies the exact fiscal weakness an audit warns against and violates instructional-value budgeting criteria.',
        'Allocating equal dollar shares across every format regardless of usage patterns, curriculum gaps, or access barriers fails to remediate the audit because it ignores documented need and equity.',
        'Implementing a transparent, data-driven fiscal plan linking spending to priorities, lifecycle costs, accessibility, and equity directly repairs the audited budget gap with full cost-of-ownership rigor.',
        'Tracking only upfront acquisition prices while omitting recurring renewals, maintenance, accessibility, and replacement schedules leaves hidden fiscal liabilities unaddressed after a program audit.',
      ],
    },
    'sl5312-b2-012-exp4': {
      rationale: 'Addressing a family and student advisory concern about budget stewardship calls for a transparent, data-driven fiscal plan connecting spending to priorities, lifecycle costs, access, and equity, aligning directly with evidence that sound budgets weigh total ownership costs and expand equitable opportunity.',
      choiceRationales: [
        'Spending leftover year-end funds quickly on commercial gadgets without documented student need erodes community confidence and conflicts with budgeting for documented instructional and equity value.',
        'Dividing collection funds evenly across formats without examining usage trends, curriculum gaps, or accessibility leaves underserved student groups without targeted resources that expand equitable opportunity.',
        'Budgeting only initial purchase prices while neglecting license renewals, maintenance, accessibility, and replacement creates future service disruptions for students rather than accounting for lifecycle costs.',
        'Sharing a transparent, data-driven fiscal plan that links allocations to documented priorities, lifecycle costs, access, and equity demonstrates responsible stewardship to families and students alike.',
      ],
    },

    // === Topic 8: program evaluation (4 items) ===
    'sl5312-b2-013-exp4': {
      rationale: 'When a planning team debates how to evaluate the library program, combining process, participation, availability, and achievement data to evaluate delivery and refine operations is the sole option consistent with matching measures to goals, documenting implementation, and driving monitored improvement.',
      choiceRationales: [
        'Collecting process, participation, availability, and achievement data to examine service delivery and refine operations directly satisfies the principle of goal-aligned, disaggregated, cyclical evaluation.',
        'Citing annual print checkout totals alone as proof of instructional impact reduces evaluation to one narrow output metric and misses goal alignment, implementation fidelity, and learning outcomes.',
        'Changing staffing, schedules, and instruction simultaneously without documenting implementation makes it impossible to tell which adjustment worked, violating disciplined, monitored improvement.',
        'Treating casual hallway compliments from visitors as proof of schoolwide academic impact substitutes unsystematic anecdotes for rigorous, disaggregated evidence linked to stated program goals.',
      ],
    },
    'sl5312-b2-014-exp4': {
      rationale: 'When a principal requests an evidence-based program evaluation model, using process, participation, availability, and achievement data to evaluate delivery and refine operations is the only pairing aligned with matching measures to goals, documenting implementation, and sustaining a monitored improvement cycle.',
      choiceRationales: [
        'Reporting only total yearly book checkouts to the principal omits instructional outcomes, subgroup participation, and access availability, failing the standard for comprehensive goal-aligned evaluation.',
        'Integrating process, participation, availability, and achievement indicators to evaluate delivery and adjust operations provides the principal with disaggregated, actionable evidence for ongoing improvement.',
        'Overhauling staffing, scheduling, and instruction at the same time without tracking how changes were carried out undermines accountability because results cannot be tied to documented implementation.',
        'Relying on informal positive hallway remarks to claim schoolwide academic impact lacks validity and disaggregation, falling far short of the evidence-based evaluation framework the principal requested.',
      ],
    },
    'sl5312-b2-015-exp4': {
      rationale: 'Remediating an audit weakness in program evaluation demands using process, participation, availability, and achievement data to evaluate delivery and refine operations, which directly honors the evidence principle of goal-matched measures, documented implementation, disaggregation, and cyclical follow-through.',
      choiceRationales: [
        'Presenting annual circulation totals by themselves fails to fix the audited evaluation weakness because raw checkout counts neither measure instructional goals nor expose disaggregated access patterns.',
        'Altering staffing, scheduling, and instruction all at once without recording implementation details deepens the audit flaw by removing the evidence trail required for a monitored improvement cycle.',
        'Pairing process, participation, availability, and achievement data to evaluate delivery and refine operations resolves the audit finding through goal-aligned metrics and documented continuous improvement.',
        'Claiming strong academic impact solely from upbeat hallway comments leaves the audit weakness uncorrected because anecdotal praise cannot substitute for systematic, disaggregated outcome evidence.',
      ],
    },
    'sl5312-b2-016-exp4': {
      rationale: 'Responding to a family and student advisory concern about program evaluation requires using process, participation, availability, and achievement data to assess delivery and refine operations, matching evidence that credible evaluation aligns metrics with goals, disaggregates findings, and drives monitored action.',
      choiceRationales: [
        'Showing families only annual book checkout counts leaves legitimate questions about student learning, equitable access, and instructional quality unanswered, contradicting goal-aligned evaluation.',
        'Shifting staffing, scheduling, and instruction simultaneously without documenting how changes occurred prevents families and staff from seeing whether adjustments actually improved student experiences.',
        'Pointing to informal hallway compliments as proof of schoolwide academic success dismisses the advisory group’s call for credible, disaggregated evidence connected to clear program outcomes.',
        'Using process, participation, availability, and achievement measures to examine delivery and refine library services shows families and students a transparent, disaggregated, continuously monitored cycle.',
      ],
    },

    // === Topic 9: policy and operations (4 items) ===
    'sl5312-b2-017-exp4': {
      rationale: 'When a planning team disagrees about library policy and operations, establishing clear, consistent procedures with stakeholder input, legal compliance, safety, privacy, reconsideration, and appeals is the sole option consistent with written, viewpoint-neutral governance and due process.',
      choiceRationales: [
        'Developing clear, consistent procedures grounded in stakeholder input, law, safety, privacy, reconsideration, and appeals operationalizes viewpoint-neutral governance and protects due process across the team.',
        'Resolving collection or access disputes informally on an ad hoc basis invites arbitrary treatment and directly contradicts the principle of consistent, written, viewpoint-neutral procedures.',
        'Giving popular viewpoints easier approval while subjecting unfamiliar topics to stricter scrutiny introduces viewpoint discrimination, breaking the neutrality and fairness promised by written policy.',
        'Promising unconditional secrecy over every student library conversation ignores statutory safety and mandated-reporting duties, clashing with consulting authorized decision makers on complex legal facts.',
      ],
    },
    'sl5312-b2-018-exp4': {
      rationale: 'A principal seeking an evidence-based policy and operations model needs clear, consistent procedures incorporating stakeholder input, legal mandates, safety, privacy, reconsideration, and appeals, directly honoring written, viewpoint-neutral standards and timely consultation on complex cases.',
      choiceRationales: [
        'Handling collection or access conflicts case by case without written criteria leaves administrators exposed to inconsistent decisions and fails the standard for documented, viewpoint-neutral due process.',
        'Adopting clear, consistent procedures built with stakeholder input, law, safety, privacy, reconsideration, and appeals provides the principal with defensible, viewpoint-neutral operational governance.',
        'Applying relaxed standards to popular perspectives while scrutinizing unfamiliar topics more heavily embeds bias into operations and violates viewpoint-neutral policy administration.',
        'Guaranteeing total confidentiality for all student conversations regardless of safety or mandated-reporting laws creates serious legal liability instead of following lawful policy and escalation protocols.',
      ],
    },
    'sl5312-b2-019-exp4': {
      rationale: 'Correcting a library program audit weakness in policy and operations calls for clear, consistent procedures covering stakeholder input, law, safety, privacy, reconsideration, and appeals, directly matching the evidence that written, viewpoint-neutral frameworks safeguard access and due process.',
      choiceRationales: [
        'Continuing to settle collection and access disputes informally without written policy criteria leaves the audited governance gap wide open and prevents consistent, equitable staff responses.',
        'Using lenient approval rules for familiar perspectives and stricter hurdles for unfamiliar viewpoints institutionalizes bias rather than repairing the audit finding with viewpoint-neutral policy.',
        'Instituting clear, consistent procedures encompassing stakeholder input, legal compliance, safety, privacy, reconsideration, and appeals fixes the audit weakness through transparent due process.',
        'Pledging absolute secrecy in every student interaction despite safety risks or mandated-reporting obligations violates statutory duties and fails to consult authorized district leaders when required.',
      ],
    },
    'sl5312-b2-020-exp4': {
      rationale: 'Responding to a family and student advisory concern about policy and operations requires clear, consistent procedures grounded in stakeholder input, law, safety, privacy, reconsideration, and appeals, directly aligning with written, viewpoint-neutral policies that uphold due process.',
      choiceRationales: [
        'Addressing access or collection disagreements informally without written standards erodes family trust in fairness and contradicts the principle of consistent, viewpoint-neutral governance.',
        'Favoring popular opinions with looser access rules while heavily scrutinizing unfamiliar topics undermines equity for families and directly breaches viewpoint-neutral policy criteria.',
        'Assuring absolute secrecy over all student conversations regardless of safety or mandated-reporting laws misleads families about legal limits instead of articulating lawful privacy boundaries.',
        'Establishing clear, consistent procedures incorporating stakeholder voice, law, safety, privacy, reconsideration, and appeals directly addresses advisory concerns while ensuring fair due process.',
      ],
    },

    // === Topic 10: cataloging and metadata (4 items) ===
    'sl5312-b2-025-exp4': {
      rationale: 'When a planning team debates cataloging and metadata practices, applying consistent descriptive and subject fields, authorized entry points, and unbiased local notes is the only pairing aligned with inclusive, interoperable metadata that supports independent discovery and avoids harmful language.',
      choiceRationales: [
        'Using standardized descriptive and subject fields, authorized access points, and respectful local notes enables seamless discovery, interoperability, and independent browsing across the school catalog.',
        'Inventing a custom informal classification rule for each newly acquired book breaks cataloging consistency and prevents teachers and students from reliably locating related items across the collection.',
        'Removing subject headings to speed up processing destroys topical access points and forces users to rely on exact titles, contradicting metadata practices that foster user independence.',
        'Retaining obsolete, stigmatizing subject terms when neutral current headings exist perpetuates harmful language and violates the duty to review and update local cataloging descriptions.',
      ],
    },
    'sl5312-b2-026-exp4': {
      rationale: 'Giving a principal an evidence-based approach to cataloging and metadata means applying consistent descriptive and subject fields, authorized entry points, and unbiased local notes, which uniquely enacts inclusive, interoperable metadata standards and regular review of outdated terminology.',
      choiceRationales: [
        'Crafting ad hoc informal classification rules book by book sacrifices catalog interoperability and makes shelving unpredictable for both staff and students, failing the principal’s evidence standard.',
        'Standardizing descriptive and subject fields, authorized entry points, and unbiased local notes gives the principal documented, inclusive metadata that strengthens discovery and user autonomy.',
        'Stripping subject headings from catalog records to save staff minutes weakens subject searchability across curricular units and undercuts independent student research throughout the school.',
        'Leaving stigmatizing legacy subject labels untouched despite available neutral vocabulary contradicts professional stewardship and fails to document inclusive local metadata updates.',
      ],
    },
    'sl5312-b2-027-exp4': {
      rationale: 'To repair an audit-flagged weakness in cataloging and metadata, applying consistent descriptive and subject fields, authorized entry points, and unbiased local notes is the only choice consistent with documented, inclusive metadata that supports discovery, interoperability, and independent access.',
      choiceRationales: [
        'Relying on intuitive daily classification choices for every new book perpetuates the audited metadata inconsistency and disrupts predictable shelving and cross-catalog interoperability.',
        'Deleting subject headings to simplify catalog displays worsens the audit finding by eliminating controlled vocabulary pathways that students need to discover resources by topic independently.',
        'Applying consistent descriptive and subject fields, authorized entry points, and unbiased local notes directly resolves the catalog audit while systematically replacing harmful or obsolete terminology.',
        'Preserving outdated, stigmatizing labels in local records when current neutral alternatives exist leaves inclusive metadata gaps uncorrected and ignores documented review standards.',
      ],
    },
    'sl5312-b2-028-exp4': {
      rationale: 'Addressing a family and student advisory concern over cataloging and metadata calls for consistent descriptive and subject fields, authorized entry points, and unbiased local notes, directly matching the principle that inclusive, documented metadata advances discovery and removes harmful language.',
      choiceRationales: [
        'Improvising informal classification rules for each title confuses students and families trying to navigate shelves independently and breaks the consistency needed for reliable catalog discovery.',
        'Omitting subject headings to shorten processing time strips away topical search pathways that students depend on when exploring subjects beyond exact author names or known book titles.',
        'Keeping outdated, stigmatizing subject labels after neutral terminology becomes available directly harms community belonging and disregards the advisory group’s push for inclusive catalog language.',
        'Maintaining consistent descriptive and subject fields, authorized entry points, and unbiased local notes honors community concerns by pairing accurate discovery with respectful, current terminology.',
      ],
    },

    // === Topic 11: weeding and retention (4 items) ===
    'sl5312-b2-029-exp4': {
      rationale: 'When a planning team disagrees about weeding and retention, applying written criteria covering accuracy, condition, relevance, use, duplication, and curriculum is the sole choice consistent with treating weeding as a multifaceted collection-development function rather than covert censorship.',
      choiceRationales: [
        'Using documented weeding guidelines that balance accuracy, physical condition, relevance, usage, duplication, and curricular value enacts planned deselection while protecting enduring works.',
        'Removing every book with zero checkouts in the past year ignores curricular cycles, local history, and foundational classics that merit retention under multifaceted deselection exceptions.',
        'Retaining scientifically outdated or inaccurate reference materials merely to keep shelves looking full misinforms student researchers and contradicts accuracy-based collection stewardship.',
        'Quietly pulling controversial perspectives during routine weeding bypasses formal reconsideration policy and turns collection maintenance into unauthorized censorship rather than objective curation.',
      ],
    },
    'sl5312-b2-030-exp4': {
      rationale: 'A principal requesting an evidence-based weeding and retention framework needs written criteria weighing accuracy, condition, relevance, use, duplication, and curriculum, directly matching the principle that planned deselection applies multiple criteria with safeguards for enduring value and anti-censorship.',
      choiceRationales: [
        'Discarding any book that did not circulate in a single year applies an arbitrary one-metric cutoff that risks purging vital seasonal curriculum texts and high-value local materials.',
        'Following written weeding criteria across accuracy, condition, relevance, usage, duplication, and curriculum gives the principal a transparent, non-arbitrary retention and deselection process.',
        'Keeping inaccurate or scientifically superseded reference volumes just to preserve shelf density undermines academic credibility and contradicts evidence-based collection maintenance.',
        'Slipping challenged titles off the shelves quietly during weeding circumvents board reconsideration procedures and exposes the school to legitimate allegations of viewpoint-based censorship.',
      ],
    },
    'sl5312-b2-031-exp4': {
      rationale: 'Remediating a program audit weakness in weeding and retention requires written criteria addressing accuracy, condition, relevance, use, duplication, and curriculum, the only option aligned with structured, multi-criteria deselection that honors enduring value and strictly separates weeding from censorship.',
      choiceRationales: [
        'Automatically discarding every title with zero checkouts last year would worsen the audit weakness by stripping out enduring curricular and local works without multi-criteria review.',
        'Leaving outdated, scientifically inaccurate reference books in place so shelves appear stocked preserves the exact collection-quality defect that routine accuracy-based weeding must correct.',
        'Enforcing written weeding criteria covering accuracy, condition, relevance, usage, duplication, and curriculum remedies the audit gap with documented decisions and explicit retention exceptions.',
        'Using routine weeding to quietly remove challenged viewpoints violates intellectual freedom safeguards and replaces transparent reconsideration policy with undocumented backdoor censorship.',
      ],
    },
    'sl5312-b2-032-exp4': {
      rationale: 'When a family and student advisory group raises concerns about weeding and retention, applying written criteria covering accuracy, condition, relevance, use, duplication, and curriculum is the sole response aligned with transparent, multifaceted collection curation distinct from censorship.',
      choiceRationales: [
        'Purging every book that did not circulate last year without verifying curricular or enduring relevance alarms families and ignores important exceptions for classics, local history, and niche needs.',
        'Keeping scientifically outdated or inaccurate reference books simply so stacks look full compromises student research accuracy rather than maintaining a trustworthy, current school collection.',
        'Quietly removing challenged viewpoints under the cover of weeding destroys community trust in fair review and violates the bright line between professional deselection and censorship.',
        'Sharing written weeding criteria covering accuracy, condition, relevance, usage, duplication, and curriculum reassures families that retention choices are objective, thorough, and viewpoint-neutral.',
      ],
    },

    // === Topic 12: equitable access and scheduling (4 items) ===
    'sl5312-b2-033-exp4': {
      rationale: 'During a collaborative planning disagreement over equitable access and scheduling, using a flexible calendar with accessible physical and digital design so learners reach resources on demand directly fulfills the principle of addressing time, disability, language, device, and instructional barriers.',
      choiceRationales: [
        'Operating a flexible schedule alongside accessible physical and digital spaces ensures students and teachers reach library expertise and resources at the point of instructional need.',
        'Locking the entire calendar into rigid weekly homeroom rotations treats identical time slots as fair while blocking timely inquiry collaboration and point-of-need research access.',
        'Shutting down individual browsing and checkout whenever a class visits turns shared space into an unnecessary access barrier for students seeking independent reading or research materials.',
        'Purchasing databases that only work inside campus buildings on district desktops excludes learners with home connectivity or transportation constraints, directly undermining equitable access.',
      ],
    },
    'sl5312-b2-034-exp4': {
      rationale: 'When a principal asks for an evidence-based approach to equitable access and scheduling, pairing a flexible calendar with accessible physical and digital design for on-demand reach is the sole choice consistent with removing time, disability, language, device, connectivity, and transportation barriers.',
      choiceRationales: [
        'Binding the library to fixed weekly class rotations forces instruction to wait for arbitrary calendar slots instead of aligning time and support to authentic classroom inquiry needs.',
        'Combining a flexible calendar with barrier-free physical and digital access gives the principal an equity-centered model responsive to disability, language, device, and instructional variability.',
        'Closing independent student browsing and checkout during scheduled class sessions restricts point-of-need access rather than designing zones that accommodate concurrent library uses.',
        'Licensing digital databases restricted strictly to school desktops leaves students without off-campus access after hours, conflicting with equity across connectivity and transportation differences.',
      ],
    },
    'sl5312-b2-035-exp4': {
      rationale: 'To resolve a library program audit weakness involving equitable access and scheduling, adopting a flexible calendar and accessible physical and digital design for on-demand use is the only pairing coherent with accounting for time, disability, language, device, connectivity, and instructional need.',
      choiceRationales: [
        'Maintaining fixed weekly homeroom rotations preserves the audited access bottleneck by assuming uniform scheduled blocks serve every learner and inquiry unit equally well.',
        'Barring individual students from browsing or checking out materials whenever another class uses the library compounds the audit weakness by cutting off open access throughout the school day.',
        'Transitioning to a flexible calendar supported by accessible physical and digital design directly corrects the audit finding by removing scheduling, language, disability, and device barriers.',
        'Maintaining database subscriptions limited exclusively to school-building desktops leaves off-campus and home-connectivity disparities unresolved after an equitable-access audit.',
      ],
    },
    'sl5312-b2-036-exp4': {
      rationale: 'When a family and student advisory group raises concerns about equitable access and scheduling, maintaining a flexible calendar and accessible physical and digital design for on-demand resource reach is the only response matching the evidence on overcoming time, disability, language, and connectivity barriers.',
      choiceRationales: [
        'Keeping the calendar locked into rigid weekly class rotations prevents students from visiting when projects actually demand research help, ignoring family calls for responsive, equitable access.',
        'Closing individual browsing and checkout whenever another class is present turns away self-directed readers and contradicts inclusive space design that welcomes simultaneous independent use.',
        'Subscribing to databases accessible only inside school buildings on district desktops disadvantages students who rely on evening home study, public transit schedules, or personal assistive devices.',
        'Providing a flexible calendar with accessible physical and digital pathways directly meets advisory concerns by letting diverse learners reach resources whenever and wherever learning happens.',
      ],
    },

    // === Topic 13: circulation privacy and resource sharing (3 items) ===
    'sl5312-b2-037-exp4': {
      rationale: 'When a collaborative planning team disagrees over circulation privacy and resource sharing, collecting minimal data, restricting record access and retention, stating practices transparently, and following lawful lending and license terms is the only option aligned with safeguarding intellectual inquiry.',
      choiceRationales: [
        'Minimizing collected patron data, curbing retention and staff access, publishing clear privacy practices, and honoring lending and license rules directly protects confidential intellectual inquiry.',
        'Displaying individual students’ reading histories on hallway boards exposes private inquiry choices publicly and creates a chilling effect that violates circulation confidentiality standards.',
        'Archiving identifiable student checkout histories indefinitely turns operational circulation logs into permanent surveillance records, directly breaching data-minimization and retention-limit principles.',
        'Distributing one staff login across classes to sidestep database licensing limits violates vendor agreements and undermines lawful, accountable resource-sharing stewardship.',
      ],
    },
    'sl5312-b2-038-exp4': {
      rationale: 'Offering a principal an evidence-based model for circulation privacy and resource sharing requires collecting minimal data, limiting record access and retention, stating practices clearly, and following lawful lending and license rules, matching privacy-aware circulation and lawful access standards.',
      choiceRationales: [
        'Posting students’ individual checkout records on public hallway displays breaches student privacy norms and exposes the school to justified ethical and legal complaints over reading surveillance.',
        'Combining data minimization, tight access and retention limits, transparent privacy notices, and lawful lending and licensing compliance delivers the accountable operational model the principal seeks.',
        'Retaining identifiable checkout logs forever without operational necessity creates avoidable student data exposure and conflicts directly with privacy-preserving circulation administration.',
        'Sharing a single staff credential with whole classrooms to bypass database access terms breaches contract law and risks losing legitimate licensed digital subscriptions for the entire school.',
      ],
    },
    'sl5312-b2-039-exp4': {
      rationale: 'Correcting a program audit weakness in circulation privacy and resource sharing demands minimal data collection, limited record access and retention, clear privacy notices, and lawful lending and license adherence, which uniquely aligns with protecting inquiry alongside authorized operational use.',
      choiceRationales: [
        'Pinning individual student reading histories onto hallway boards to promote competition intensifies privacy violations rather than repairing the audited confidentiality weakness.',
        'Keeping identifiable student borrowing histories indefinitely in the library system leaves the audited retention flaw intact and exposes learners’ past intellectual exploration unnecessarily.',
        'Enforcing minimal data collection, strict access and retention controls, published privacy practices, and lawful lending and license rules fully remediates the circulation-privacy audit finding.',
        'Handing out one staff password across multiple classes to circumvent licensed database controls creates fresh compliance violations instead of establishing lawful resource-sharing procedures.',
      ],
    },

    // === Topic 14: source evaluation (4 items) ===
    'sl5312-b2-044-exp4': {
      rationale: 'During a collaborative planning disagreement about source evaluation, teaching learners to examine authority, evidence, purpose, currency, context, corroboration, and task fit is the only pairing consistent with contextual evaluation rather than mechanical checklist scoring.',
      choiceRationales: [
        'Assuming a .org or .edu suffix guarantees factual accuracy substitutes a superficial domain shortcut for contextual examination of authorship, supporting evidence, and corroboration.',
        'Rejecting every source that states an explicit viewpoint confuses perspective with unreliability, ignoring that credible inquiry analyzes how claims are evidenced and suited to the task.',
        'Choosing the cleanest-looking webpage without inspecting authorship, citations, or corroborating sources mistakes graphic polish for intellectual authority and undermines rigorous evaluation.',
        'Guiding students to weigh authority, evidence quality, purpose, currency, context, corroboration, and task fit directly enacts contextual source evaluation rather than rigid checklist scores.',
      ],
    },
    'sl5312-b2-045-exp4': {
      rationale: 'When a principal asks for an evidence-based approach to source evaluation, assessing authority, evidence, purpose, currency, context, corroboration, and specific task fit is the sole option consistent with contextual judgment over simplistic checklist formulas.',
      choiceRationales: [
        'Teaching students to evaluate authority, evidence, purpose, currency, context, corroboration, and task fit gives the principal a rigorous, contextual model grounded in claim verification.',
        'Instructing learners that .org or .edu web addresses prove accuracy promotes a widely debunked myth because advocacy sites and unvetted student pages routinely use those domains.',
        'Dismissing any text with an explicit point of view strips away primary sources, editorials, and scholarly arguments that students must learn to analyze for evidentiary strength.',
        'Selecting sources based on neat visual layout while skipping authorship, citations, and lateral corroboration leaves students vulnerable to polished misinformation rather than credible research.',
      ],
    },
    'sl5312-b2-046-exp4': {
      rationale: 'Remediating an audit weakness in source evaluation requires teaching students to analyze authority, evidence, purpose, currency, context, corroboration, and task fit, matching the evidence principle that credibility depends on supported claims and contextual fit rather than rigid checklists.',
      choiceRationales: [
        'Relying on top-level domains like .org or .edu as proof of accuracy perpetuates the exact checklist-shortcut weakness flagged by the program audit instead of building critical verification.',
        'Training learners to investigate authority, evidence, purpose, currency, context, corroboration, and task fit resolves the audit gap by anchoring credibility judgments in substantive proof.',
        'Throwing out every source holding a clear viewpoint teaches avoidance rather than critical analysis of evidence, failing to build the contextual discernment the program audit requires.',
        'Judging credibility by sleek webpage design without checking authors, references, or independent corroboration leaves students unable to separate authentic expertise from deceptive packaging.',
      ],
    },
    'sl5312-b2-047-exp4': {
      rationale: 'When a family and student advisory group raises a concern about source evaluation, focusing on authority, evidence, purpose, currency, context, corroboration, and task fit is the sole option consistent with contextual credibility analysis rather than superficial checklist scores.',
      choiceRationales: [
        'Telling students that .org or .edu endings prove accuracy misleads families and learners because domain extensions reveal registration type rather than evidentiary reliability or factual rigor.',
        'Discarding any source expressing a clear point of view prevents students from engaging primary arguments and analyzing whether claims rest on verifiable evidence suited to their inquiry.',
        'Centering instruction on authority, evidence, purpose, currency, context, corroboration, and fit answers advisory concerns by equipping learners to verify claims thoughtfully across varied tasks.',
        'Picking websites for visual cleanliness without checking authorship, citations, or corroboration leaves students easily swayed by slick design instead of substantiated, task-appropriate evidence.',
      ],
    },

    // === Topic 15: intellectual freedom and challenges (4 items) ===
    'sl5312-b2-048-exp4': {
      rationale: 'When a planning team disagrees about intellectual freedom and material challenges, maintaining access under viewpoint-neutral selection and review policies while honoring family choice and due process is the sole option aligned with advance policy, formal review, and whole-work evaluation.',
      choiceRationales: [
        'Removing a questioned title immediately after an informal verbal remark bypasses written reconsideration policy and undermines continued access while formal review procedures are pending.',
        'Letting one family’s personal objection restrict what other families’ children may read overrides parental autonomy across the broader community and violates viewpoint-neutral access.',
        'Defending a challenged title solely out of personal fondness for its author replaces documented selection criteria and whole-work assessment with subjective librarian preference.',
        'Preserving access under viewpoint-neutral selection and reconsideration policies while respecting each family’s choices for their own children upholds due process and intellectual freedom.',
      ],
    },
    'sl5312-b2-049-exp4': {
      rationale: 'A principal asking for an evidence-based approach to intellectual freedom and challenges needs continued access under viewpoint-neutral selection and review policies honoring family choice and due process, directly reflecting advance policy, formal review, and whole-work criteria.',
      choiceRationales: [
        'Upholding viewpoint-neutral selection and reconsideration policies alongside individual family choice and formal due process gives the principal a legally and ethically sound governance model.',
        'Pulling a questioned book from the shelves on the spot after an informal complaint abandons written board procedures and invites arbitrary, inconsistent censorship across the building.',
        'Allowing one household’s objection to determine access for every other family’s children breaches equitable public-school stewardship and conflicts with viewpoint-neutral review standards.',
        'Arguing to retain a challenged book purely because the librarian admires the author weakens institutional credibility by substituting personal taste for documented selection criteria.',
      ],
    },
    'sl5312-b2-050-exp4': {
      rationale: 'To correct a program audit weakness involving intellectual freedom and challenges, keeping access under viewpoint-neutral selection and review policies while honoring family choice and due process is the only choice aligned with advance policy, documented criteria, and whole-work review.',
      choiceRationales: [
        'Yanking a questioned title immediately upon an informal verbal complaint repeats the exact procedural breakdown an intellectual-freedom audit is designed to eliminate.',
        'Protecting access through viewpoint-neutral selection and reconsideration policies while respecting individual family choices and due process directly fixes the audited governance vulnerability.',
        'Permitting a single family’s disapproval to block other families’ children from a shared resource deepens equity and due-process violations rather than restoring consistent board policy.',
        'Justifying a challenged book solely on the librarian’s personal regard for its author fails the audit standard requiring objective, documented criteria applied to the work as a whole.',
      ],
    },
    'sl5312-b2-051-exp4': {
      rationale: 'Addressing a family and student advisory concern about intellectual freedom and challenges calls for keeping access under viewpoint-neutral selection and review policies while honoring family choice and due process, fully matching formal, whole-work review under advance policy.',
      choiceRationales: [
        'Pulling a questioned book immediately after an informal remark denies the community transparent due process and breaks the policy commitment to continued access during formal review.',
        'Letting one family’s personal objection curtail access for other families’ children infringes on other parents’ rights to guide their own children’s reading within a shared school library.',
        'Applying viewpoint-neutral selection and reconsideration policies while respecting each family’s choices for its own children and ensuring due process fairly balances community perspectives.',
        'Defending a challenged title strictly because the librarian personally admires the author sidesteps transparent selection criteria and fails to evaluate the work fairly as a whole.',
      ],
    },

    // === Topic 16: copyright and licensing (4 items) ===
    'sl5312-b2-052-exp4': {
      rationale: 'When a collaborative planning team disagrees over copyright and licensing, weighing ownership, license terms, public domain status, permission, and fact-specific fair use before sharing works is the sole response aligned with four-factor analysis, license review, and institutional guidance.',
      choiceRationales: [
        'Assuming any nonprofit classroom copying automatically counts as fair use ignores the four statutory factors, including amount copied and market harm, as well as binding license terms.',
        'Posting an entire licensed commercial workbook onto a public school webpage violates both copyright limits and market-effect principles by distributing paid material without authorization.',
        'Treating an accurate bibliography citation as permission to reproduce protected work confuses academic attribution with legal copyright clearance or active licensing rights.',
        'Checking ownership, contract license terms, public domain status, permissions, and fact-specific fair-use factors before distributing materials ensures lawful, ethical instructional sharing.',
      ],
    },
    'sl5312-b2-053-exp4': {
      rationale: 'A principal seeking an evidence-based approach to copyright and licensing needs staff to weigh ownership, license terms, public domain status, permissions, and fact-specific fair use before sharing works, matching legal guidance that distinguishes citation from copyright compliance.',
      choiceRationales: [
        'Evaluating ownership, license contracts, public domain eligibility, permissions, and fact-specific fair use prior to sharing gives the principal a compliant, repeatable district workflow.',
        'Treating nonprofit educational status as a blanket fair-use pass exposes the school to infringement risk by skipping nature, amount, market effect, and explicit vendor license restrictions.',
        'Uploading a full licensed commercial workbook to an open public website directly substitutes for commercial purchase and violates both licensing terms and institutional copyright policy.',
        'Assuming proper source citation replaces copyright permission conflates anti-plagiarism attribution with legal reproduction authority, leaving the school unprotected against infringement claims.',
      ],
    },
    'sl5312-b2-054-exp4': {
      rationale: 'To remediate an audit weakness in copyright and licensing, weighing ownership, license terms, public domain status, permission, and fact-specific fair use before sharing works is the only choice consistent with separating attribution from legal compliance and applying multi-factor review.',
      choiceRationales: [
        'Continuing to treat all nonprofit classroom copying as routine fair use leaves the audited compliance risk unresolved because educational purpose alone never overrides the remaining factors.',
        'Reviewing ownership, license agreements, public domain status, permissions, and fact-specific fair use before sharing directly repairs the copyright audit gap with lawful decision making.',
        'Publishing a complete commercial workbook on a public school webpage exemplifies severe infringement and market-effect harm rather than correcting audited licensing weaknesses.',
        'Relying on accurate citations in place of securing copyright permission or honoring license terms perpetuates a classic confusion between scholarly credit and lawful reproduction rights.',
      ],
    },
    'sl5312-b2-055-exp4': {
      rationale: 'When a family and student advisory group raises a concern about copyright and licensing, weighing ownership, license terms, public domain status, permission, and fact-specific fair use before sharing works is the only option aligned with lawful compliance and transparent instructional guidance.',
      choiceRationales: [
        'Assuming every nonprofit classroom copy qualifies as fair use models careless copyright habits for students and ignores statutory limits on amount used, market harm, and vendor licenses.',
        'Uploading an entire commercial workbook onto a public school site for family convenience violates copyright law and licensing contracts instead of arranging authorized home-access editions.',
        'Checking ownership, license terms, public domain status, permissions, and fact-specific fair use before sharing models ethical digital practice for students while respecting creator rights.',
        'Teaching that accurate bibliographic citation eliminates the need for permission or license rights confuses avoiding plagiarism with complying with copyright and contract restrictions.',
      ],
    },

    // === Topic 17: digital citizenship privacy and security (4 items) ===
    'sl5312-b2-056-exp4': {
      rationale: 'When a planning team debates digital citizenship, privacy, and security, actively teaching identity, consent, data sharing, safety, respectful dialogue, algorithms, and platform risks is the sole option consistent with blending critical participation with rigorous tool vetting and privacy protection.',
      choiceRationales: [
        'Reducing digital citizenship to one brief yearly assembly about password rules ignores ongoing critical participation, algorithmic literacy, consent, and thoughtful vetting of instructional tools.',
        'Requiring students to open public social-media accounts without checking age minimums or privacy terms violates student-data safeguards and exposes minors to unvetted commercial tracking.',
        'Submitting identifiable student information to a free online tool just because a registration form requests it breaches privacy vetting standards around data practices and age-appropriate use.',
        'Actively teaching digital identity, consent, data sharing, safety, civil discourse, algorithms, and platform risks unites critical participation with responsible privacy and security habits.',
      ],
    },
    'sl5312-b2-057-exp4': {
      rationale: 'A principal asking for an evidence-based approach to digital citizenship, privacy, and security needs active instruction on identity, consent, data sharing, safety, respectful dialogue, algorithms, and platform risks, aligning directly with critical participation and vetted, age-appropriate digital tools.',
      choiceRationales: [
        'Embedding active lessons on identity, consent, data sharing, safety, civil dialogue, algorithms, and platform risks gives the principal a proactive program paired with thorough tool vetting.',
        'Checking a compliance box with one short annual password lecture fails the principal’s evidence standard because isolated assemblies do not build critical participation or safe data judgment.',
        'Mandating public social-media profiles without reviewing age limits or privacy policies creates acute COPPA and student-safety risks rather than enforcing age-appropriate platform vetting.',
        'Entering sensitive student identifiers into unvetted free platforms simply because signup screens ask forfeits institutional privacy governance and compromises student data security.',
      ],
    },
    'sl5312-b2-058-exp4': {
      rationale: 'Correcting a library program audit weakness in digital citizenship, privacy, and security calls for actively teaching identity, consent, data sharing, safety, respectful dialogue, algorithms, and platform risks, matching the evidence that critical participation must accompany rigorous tool vetting.',
      choiceRationales: [
        'Relying on a single yearly assembly about strong passwords leaves the audited digital-citizenship weakness intact because students never practice evaluating consent, algorithms, or online ethics.',
        'Integrating active instruction on identity, consent, data sharing, safety, respectful dialogue, algorithms, and platform risks remedies the audit gap while reinforcing vetted, age-appropriate tools.',
        'Directing students to create public social-media accounts without confirming age rules or privacy policies compounds the audit failure by exposing minors to avoidable digital privacy hazards.',
        'Typing identifiable student data into free websites on demand ignores data-governance audits and violates the obligation to vet every instructional tool for accessibility and privacy practices.',
      ],
    },
    'sl5312-b2-059-exp4': {
      rationale: 'Responding to a family and student advisory concern about digital citizenship, privacy, and security requires actively teaching identity, consent, data sharing, safety, respectful dialogue, algorithms, and platform risks, aligning with critical digital agency and vetted, age-appropriate data protection.',
      choiceRationales: [
        'Offering only one brief annual password assembly leaves families unconvinced that the school prepares students to navigate consent, algorithmic feeds, respectful dialogue, and online privacy risks.',
        'Requiring public social-media accounts without verifying age limits or privacy terms directly alarms families and contravenes age-appropriate, privacy-respecting digital platform vetting.',
        'Teaching identity, consent, data sharing, safety, respectful dialogue, algorithms, and platform risks actively answers advisory concerns by empowering students while safeguarding their personal data.',
        'Entering sensitive identifiable student details into a free platform merely because a form asks undermines family trust and violates institutional duties to vet vendor data practices beforehand.',
      ],
    },

    // === Topic 18: differentiation and accessibility (4 items) ===
    'sl5312-b2-068-exp4': {
      rationale: 'When a planning team disagrees about differentiation and accessibility, maintaining rigorous goals while adapting representation, scaffolds, language aids, tools, and response options is the sole option consistent with anticipating learner variability without watering down the target construct.',
      choiceRationales: [
        'Lowering the core inquiry standard whenever a student uses language or accessibility supports confuses access accommodations with curriculum modification and undermines high expectations.',
        'Requiring every learner to use one identical text and written essay format mistakes uniformity for fairness while blocking students who need flexible representation or expression pathways.',
        'Delaying documented IEP accommodations until after a student fails an independent research task violates legal obligations and ignores proactive Universal Design for Learning anticipation.',
        'Preserving rigorous inquiry goals while offering flexible representation, scaffolds, language supports, assistive tools, and response options removes barriers without diluting learning expectations.',
      ],
    },
    'sl5312-b2-069-exp4': {
      rationale: 'Providing a principal an evidence-based model for differentiation and accessibility means keeping rigorous goals while adapting representation, scaffolds, language aids, tools, and expression modes, directly matching the principle that access supports preserve rather than reduce the target construct.',
      choiceRationales: [
        'Maintaining rigorous learning goals while differentiating representation, scaffolds, language aids, assistive tools, and expression modes demonstrates equitable, construct-preserving instructional design.',
        'Simplifying core inquiry expectations whenever language or disability accommodations are needed weakens academic rigor and conflates access supports with lowering the underlying learning standard.',
        'Enforcing one identical text and single written essay format for every learner confuses equal treatment with equity and introduces construct-irrelevant barriers for diverse readers and writers.',
        'Waiting for a student to fail before applying documented IEP accommodations breaches compliance standards and contradicts proactive planning for predictable learner variability.',
      ],
    },
    'sl5312-b2-070-exp4': {
      rationale: 'Remediating an audit-flagged weakness in differentiation and accessibility requires maintaining rigorous goals while adapting representation, scaffolds, language aids, tools, and response options, which uniquely aligns with anticipating variability and distinguishing access supports from altered constructs.',
      choiceRationales: [
        'Cutting back core inquiry standards for students needing language or accessibility supports perpetuates the audited equity gap by lowering expectations instead of removing access barriers.',
        'Holding rigorous goals steady while adapting representation, scaffolds, language aids, tools, and response options resolves the audit weakness through proactive, construct-valid accessibility.',
        'Assigning one uniform text and written essay to everyone ignores documented variability and leaves construct-irrelevant barriers embedded in the audited library instruction.',
        'Withholding documented IEP accommodations until a student struggles or fails on independent research deepens legal noncompliance rather than establishing proactive inclusive support.',
      ],
    },
    'sl5312-b2-071-exp4': {
      rationale: 'When a family and student advisory group raises a concern about differentiation and accessibility, keeping rigorous goals while adapting representation, scaffolds, language aids, tools, and expression modes is the sole response aligned with proactive access supports that uphold high expectations.',
      choiceRationales: [
        'Dumbing down the core inquiry standard whenever a learner uses language or accessibility aids denies families rigorous learning opportunities and conflates accommodations with reduced expectations.',
        'Insisting on one identical text and single essay format for strict grading equality disregards diverse strengths and prevents learners with reading or writing barriers from showing true inquiry mastery.',
        'Upholding rigorous expectations while adapting representation, scaffolds, language supports, assistive tools, and expression modes reassures families that every student has fair pathways to mastery.',
        'Waiting for a student to fail before activating documented IEP accommodations erodes family trust and contradicts the principle of anticipating learner variability before instruction begins.',
      ],
    },

    // === Topic 19: formative assessment and feedback (4 items) ===
    'sl5312-b2-072-exp4': {
      rationale: 'During a planning team disagreement over formative assessment and feedback, gathering interpretable in-process data and using it with learners to give actionable guidance and adjust plans is the only pairing aligned with evidence informing timely instructional and student action.',
      choiceRationales: [
        'Recording a final unit grade after instruction ends and calling it formative mislabels summative scoring because no time remains to adjust teaching or help learners revise their work.',
        'Collecting daily inquiry exit tickets without analyzing error patterns or modifying upcoming lessons turns assessment into busywork rather than evidence that drives instructional adjustment.',
        'Giving warm general praise for effort without naming a concrete research move or next step leaves learners unsure how to improve against explicit inquiry success criteria.',
        'Collecting interpretable in-process evidence and using it alongside students to deliver actionable feedback and adapt upcoming lessons fulfills the true purpose of formative assessment.',
      ],
    },
    'sl5312-b2-073-exp4': {
      rationale: 'A principal asking for an evidence-based approach to formative assessment and feedback needs interpretable in-process data used with learners to give actionable guidance and adjust plans, matching the principle that assessment becomes formative only when evidence guides timely action.',
      choiceRationales: [
        'Using interpretable in-process evidence with learners to provide concrete next-step feedback and refine instructional plans shows the principal genuine formative practice linked to success criteria.',
        'Logging a final project score after the unit concludes and labeling it formative provides summative accountability too late to inform instruction or improve student inquiry during learning.',
        'Gathering daily exit tickets faithfully without reviewing trends or adapting subsequent lessons fails the evidence-based standard because unexamined data never becomes formative action.',
        'Offering encouraging but vague praise for student effort without referencing clear criteria or specific research strategies deprives learners of actionable guidance for improvement.',
      ],
    },
    'sl5312-b2-074-exp4': {
      rationale: 'To resolve a program audit weakness in formative assessment and feedback, gathering interpretable in-process data and using it with learners to offer actionable guidance and adjust plans is the sole option consistent with linking timely evidence to explicit success criteria and instructional pivots.',
      choiceRationales: [
        'Relabeling a post-unit summative grade as formative leaves the audited assessment gap untouched because final scores arrive after opportunities for guided revision have already passed.',
        'Collecting interpretable in-process evidence and partnering with students on actionable feedback and lesson adjustments directly corrects the audit finding through responsive formative cycles.',
        'Piling up daily inquiry exit tickets without examining patterns or altering next-day teaching repeats the exact audit flaw of collecting data without converting it into instructional action.',
        'Substituting warm general praise for concrete, criteria-referenced strategy feedback fails to repair the audit weakness because students still lack clear direction on what to strengthen next.',
      ],
    },
    'sl5312-b2-075-exp4': {
      rationale: 'Addressing a family and student advisory concern about formative assessment and feedback calls for gathering interpretable in-process data and using it with learners to deliver actionable guidance and adjust plans, matching evidence that formative work informs timely growth against clear criteria.',
      choiceRationales: [
        'Posting a final unit grade after teaching ends and describing it as formative frustrates families and students who expected timely feedback while improvement was still possible.',
        'Requiring daily inquiry exit tickets that are never reviewed to reshape lessons wastes student effort and contradicts formative practice grounded in responsive instructional adjustments.',
        'Using interpretable in-process data with learners to share concrete strategy feedback and adjust instruction answers advisory concerns by making assessment a transparent partner in growth.',
        'Delivering broad, nonspecific praise without pinpointing a concrete research skill or next step leaves students and families unclear about how work compares to stated success criteria.',
      ],
    },

    // === Topic 20: reading engagement and reader development (4 items) ===
    'sl5312-b2-076-exp4': {
      rationale: 'When a planning team disagrees about reading engagement and reader development, pairing learner knowledge, wide choice, sustaining collections, book access, dialogue, and warm support is the sole choice consistent with fostering agency and belonging without turning reading into surveillance.',
      choiceRationales: [
        'Confining every student to a single assigned reading-level bin all semester strips away reader agency and curiosity, conflicting with wide choice and authentic reader development.',
        'Measuring and rewarding reading engagement exclusively through logged page counts for prizes shifts motivation toward extrinsic surveillance rather than joyful, meaningful reading.',
        'Cutting back book choices and checkout limits for reluctant readers penalizes developing readers and contradicts abundant access and responsive guidance that build reading identity.',
        'Combining deep knowledge of learners with wide choice, culturally sustaining collections, open book access, dialogue, and warm guidance nurtures genuine, lifelong reading engagement.',
      ],
    },
    'sl5312-b2-077-exp4': {
      rationale: 'Offering a principal an evidence-based model for reading engagement and reader development requires pairing learner knowledge, wide choice, sustaining collections, book access, dialogue, and warm support, matching evidence that relevance, agency, and belonging outperform reading surveillance.',
      choiceRationales: [
        'Linking knowledge of individual readers with wide choice, sustaining collections, abundant book access, social dialogue, and warm support provides an evidence-backed culture of reading.',
        'Restricting checkout to one fixed reading-level bin all semester undermines student agency and ignores evidence that interest, background knowledge, and choice drive sustained reading growth.',
        'Equating engagement solely with page-count logs for classroom prizes institutionalizes reading surveillance and risks eroding intrinsic motivation once external rewards disappear.',
        'Narrowing book selections and borrowing limits for reluctant readers creates needless barriers instead of offering abundant, inviting access and responsive reader advisory.',
      ],
    },
    'sl5312-b2-078-exp4': {
      rationale: 'To remediate an audit weakness in reading engagement and reader development, pairing learner knowledge, wide choice, sustaining collections, book access, dialogue, and warm support is the only option aligned with building relevance, agency, belonging, and open access without surveillance.',
      choiceRationales: [
        'Keeping learners locked inside one assigned reading-level bin all term perpetuates the audited engagement barrier by curbing self-selection, curiosity, and reader belonging.',
        'Integrating learner insight, wide choice, culturally sustaining collections, open book access, book talk, and warm guidance directly addresses the audit finding through authentic reader agency.',
        'Tracking reading engagement strictly via logged page totals for prizes repeats surveillance-heavy practices that fail to cultivate lasting pleasure reading or meaningful peer discussion.',
        'Shrinking book choices and checkout allowances for reluctant readers deepens disengagement rather than expanding inviting access and individualized support as the audit requires.',
      ],
    },
    'sl5312-b2-079-exp4': {
      rationale: 'When a family and student advisory group raises concerns about reading engagement and reader development, pairing youth insight, wide choice, sustaining collections, open borrowing, dialogue, and warm support is the sole pairing matching agency, belonging, and joyful non-surveillance reading.',
      choiceRationales: [
        'Restricting students to one assigned reading-level bin all semester frustrates families and young readers by turning personal reading exploration into a rigid, stigmatizing label.',
        'Rewarding reading solely through logged page counts for prizes transforms leisure reading into audited competition rather than shared meaning-making and authentic reading enjoyment.',
        'Honoring youth insight with wide choice, culturally sustaining collections, open borrowing, peer dialogue, and warm support directly responds to advisory hopes for joyful reader growth.',
        'Limiting book choices and checkout numbers for reluctant readers discourages hesitant learners precisely when abundant access, choice, and encouragement are most essential.',
      ],
    },

    // === Topic 21: media and information literacy (4 items) ===
    'sl5312-b2-080-exp4': {
      rationale: 'When a collaborative planning team disagrees over media and information literacy, teaching learners to test claims across media, trace evidence, spot persuasion, verify, and share ethically is the sole option consistent with close reading, lateral investigation, contextual judgment, and ethical creation.',
      choiceRationales: [
        'Teaching students that any author perspective or bias renders a source unusable replaces critical analysis with blanket dismissal rather than tracing claims and evaluating contextual evidence.',
        'Forcing learners to run one rigid, static fact-checking acronym identically across every medium ignores how visual, audio, data, and algorithmic messages demand flexible lateral verification.',
        'Focusing solely on camera angles and graphic polish while ignoring factual claims, evidence, and corroboration leaves out the core verification habits needed in modern media literacy.',
        'Guiding students to test claims across formats, trace original evidence, recognize persuasion tactics, verify laterally, and share ethically directly enacts comprehensive media literacy.',
      ],
    },
    'sl5312-b2-081-exp4': {
      rationale: 'A principal requesting an evidence-based approach to media and information literacy needs instruction that teaches learners to test claims across media, trace evidence, spot persuasion, verify, and share ethically, aligning with lateral investigation, contextual judgment, and multimodal ethical creation.',
      choiceRationales: [
        'Equipping students to test claims across text, image, audio, data, and algorithmic feeds while tracing evidence, spotting persuasion, verifying, and sharing ethically meets the principal’s rigor.',
        'Instructing learners that detecting any perspective disqualifies a source leaves them unable to interpret primary documents, journalism, or policy arguments using evidence-based judgment.',
        'Mandating one rigid static acronym for every media context turns critical inquiry into mechanical formula checking instead of teaching adaptive lateral reading and evidence tracing.',
        'Examining camera angles and visual production alone without interrogating factual accuracy or corroboration omits half of media literacy and fails to protect students from sleek disinformation.',
      ],
    },
    'sl5312-b2-082-exp4': {
      rationale: 'Remediating an audit-identified weakness in media and information literacy demands teaching learners to test claims across media, trace evidence, spot persuasion, verify, and share ethically, directly reflecting close reading, lateral investigation, contextual judgment, and multimodal creation.',
      choiceRationales: [
        'Claiming that any detectable author perspective makes a source unusable reinforces simplistic binary thinking rather than repairing the audit gap with evidence-based contextual judgment.',
        'Coaching learners to test multimodal claims, trace primary evidence, spot persuasion, verify laterally, and share ethically directly resolves the media-literacy audit weakness.',
        'Requiring one unchanging fact-checking acronym across every medium preserves the exact mechanical checklist habit that fails when learners confront algorithms, infographics, or video clips.',
        'Analyzing visual framing and polish alone without checking underlying factual claims or external corroboration leaves students unequipped to verify accuracy across modern media ecosystems.',
      ],
    },
    'sl5312-b2-083-exp4': {
      rationale: 'Addressing a family and student advisory concern about media and information literacy requires teaching learners to test claims across media, trace evidence, spot persuasion, verify, and share ethically, matching the evidence on lateral verification, contextual judgment, and ethical participation.',
      choiceRationales: [
        'Telling students that any author point of view makes a source unusable discourages civic literacy and prevents learners from evaluating how arguments are backed by verifiable evidence.',
        'Insisting on one rigid static acronym for every media format fails to prepare students for fast-changing visual, audio, data, and algorithmic feeds raised by the advisory group.',
        'Teaching learners to interrogate claims across media, trace evidence, detect persuasion, verify laterally, and share ethically directly answers community calls for resilient media literacy.',
        'Evaluating camera angles and graphic polish without checking factual claims or corroboration trains aesthetic commentary while leaving students vulnerable to persuasive misinformation.',
      ],
    },

    // === Topic 22: learning environment and management (4 items) ===
    'sl5312-b2-084-exp4': {
      rationale: 'When a planning team disagrees about learning environment and management, building co-created norms, flexible zones, smooth transitions, tech habits, and restorative responses is the only option aligned with teachable expectations, proportionate responses, access, and safety.',
      choiceRationales: [
        'Demanding strict total silence in every corner regardless of inquiry or maker work treats management as suppression rather than designing flexible zones that fit diverse learning tasks.',
        'Locking in permanent furniture layouts before considering instructional activities and accessibility creates physical bottlenecks that undermine inclusive space design and smooth transitions.',
        'Using immediate public hallway removal for minor off-task chatter escalates small disruptions disproportionately and sacrifices both student belonging and equitable library access.',
        'Establishing co-created norms, flexible activity zones, smooth routines, responsible tech habits, and restorative responses keeps expectations predictable while preserving access and safety.',
      ],
    },
    'sl5312-b2-085-exp4': {
      rationale: 'A principal seeking an evidence-based model of learning environment and management needs co-created norms, flexible zones, smooth transitions, tech habits, and restorative responses, directly enacting teachable expectations, purposeful space design, relationships, and proportionate responses.',
      choiceRationales: [
        'Combining co-created norms, flexible learning zones, predictable transitions, healthy technology routines, and restorative practices gives the principal a safe, access-preserving library climate.',
        'Enforcing blanket silence across every library corner conflicts with collaborative inquiry and maker pedagogy and substitutes rigid restriction for purposeful, teachable spatial norms.',
        'Installing fixed permanent furniture before mapping instructional needs and accessibility requirements wastes facility flexibility and creates avoidable mobility and supervision obstacles.',
        'Responding to minor off-task chatter with immediate public hallway removal applies exclusionary discipline disproportionately instead of using relational, restorative redirection.',
      ],
    },
    'sl5312-b2-086-exp4': {
      rationale: 'Correcting a library program audit weakness in learning environment and management requires co-created norms, flexible zones, smooth transitions, tech habits, and restorative responses, the sole pairing consistent with teachable expectations, supervision, relationships, and proportionate responses.',
      choiceRationales: [
        'Mandating absolute silence everywhere regardless of collaborative or maker tasks intensifies the audited climate problem by stifling active inquiry rather than zoning quiet and active spaces.',
        'Implementing co-created norms, flexible zones, smooth transitions, shared tech habits, and restorative responses directly remediates the audit finding while protecting safety and access.',
        'Setting fixed permanent furniture layouts ahead of instructional and accessibility planning leaves physical barriers unaddressed and prevents agile supervision across concurrent groups.',
        'Relying on immediate public hallway removal for minor chatter replaces teachable expectations and proportionate responses with punitive exclusion that erodes student access and trust.',
      ],
    },
    'sl5312-b2-087-exp4': {
      rationale: 'When a family and student advisory group raises a concern about learning environment and management, building co-created norms, flexible zones, smooth transitions, tech habits, and restorative responses directly honors teachable expectations, strong relationships, safety, and equitable access.',
      choiceRationales: [
        'Imposing strict total silence in every library area regardless of collaborative inquiry or maker tasks alienates active learners and ignores thoughtful zoning for varied student needs.',
        'Arranging permanent fixed furniture before evaluating instructional activities and accessibility leaves students with mobility or sensory needs facing preventable physical barriers.',
        'Developing co-created norms, flexible zones, clear transitions, positive tech habits, and restorative responses answers advisory concerns by uniting welcoming access with predictable safety.',
        'Removing students publicly to the hallway as the first reaction to minor chatter damages relationships and violates proportionate, restorative stewardship of a shared learning commons.',
      ],
    },
  },

  early_childhood_5025_pack: {
    'ec5025-b3-092': {
      choices: [
        'Pitch register',
        'Melodic contour',
        'Tempo and pulse',
        'Musical dynamics',
      ],
      rationale: 'Musical dynamics refer to variations in relative loudness and softness. Because the teacher preserved the exact notes and steady pace across both performances, musical dynamics—not pitch register, melodic contour, or tempo and pulse—changed.',
      choiceRationales: [
        'Pitch register describes how high or low individual tones sound on the musical staff, yet the teacher kept every note identical across both the soft and loud performances.',
        'Melodic contour traces the ordered upward and downward sequence of pitches forming the tune, which the scenario explicitly notes remained completely unchanged between playings.',
        'Tempo and pulse govern the underlying speed and steady beat of a musical piece, whereas the teacher performed both the soft and loud versions at the exact same pace.',
        'Musical dynamics describe changes in relative volume from soft to loud while pitch height, melodic contour, and underlying tempo all remain completely steady.',
      ],
    },
  },

  ap_physics_1_foundation_pilot: {
    'ap-physics-1-u5-090': {
      rationale: 'Modeling the figure skater as an isolated rotating system with negligible air torque means total angular momentum L = Iω stays nearly constant; pulling her arms inward shifts mass closer to the spin axis, lowering rotational inertia I and requiring angular speed ω to increase.',
      choiceRationales: [
        'Pulling arm mass inward reduces rotational inertia I, so conserving angular momentum L = Iω requires angular speed to increase rather than decrease alongside inertia.',
        'Because negligible external air torque keeps total angular momentum L = Iω nearly constant, reducing rotational inertia as the skater pulls her arms inward forces angular speed to rise.',
        'Internal muscular forces exerted between the skater’s torso and arms form action-reaction pairs that produce zero net external torque and therefore cannot reduce the isolated system’s total angular momentum.',
        'The stimulus explicitly treats air torque as negligible during the arm motion, so the surrounding air transfers no appreciable angular momentum to the spinning skater.',
      ],
    },
    'ap-physics-1-u5-228': {
      rationale: 'Because internal muscular forces exert zero net external torque on the isolated skater system, angular momentum remains constant throughout the motion; relocating arm mass closer to the rotation axis reduces rotational inertia, so angular speed must rise proportionally to keep the product Iω unchanged.',
      choiceRationales: [
        'Although moving mass inward decreases rotational inertia, angular speed must increase to conserve angular momentum, and internal muscular work actually increases the skater’s rotational kinetic energy rather than keeping energy constant.',
        'Internal forces between the skater’s body and arms occur in equal and opposite pairs within the isolated system, producing zero net external torque and leaving total angular momentum unchanged.',
        'Zero net external torque keeps angular momentum constant rather than angular speed; whenever rotational inertia changes within an isolated system, angular speed must adjust inversely.',
        'With negligible external torque on the isolated skater, bringing mass closer to the axis lowers rotational inertia while angular momentum stays constant, forcing angular speed to increase.',
      ],
    },
  },

  ap_statistics_foundation_pilot: {
    'ap-statistics-foundation-pilot-item-089': {
      rationale: 'When a linear model fits bivariate data well, residuals scatter randomly above and below zero with no systematic shape. A curved residual pattern shows that predicted values consistently overshoot in some intervals and undershoot in others, signaling that a linear model may not capture the relationship well.',
      choiceRationales: [
        'A systematic curve in the residual plot reveals structured departures from zero across x, showing that a linear equation misses curvature in the relationship and may not fit well.',
        'A correlation of 1 would put every point on the line with zero residuals; a curved residual pattern shows the line misses the shape.',
        'Residual plots are made for quantitative explanatory variables; a curved pattern is about model form, not variable type.',
        'Any least-squares regression line produces a residual y − y-hat for every observation, and a systematic curve in those residuals warns that the true relationship is nonlinear.',
      ],
    },
    'ap-statistics-foundation-pilot-item-175': {
      rationale: 'A clear curve in the residual plot reveals structured, non-random departures from a straight-line fit across values of the explanatory variable. Because a linear equation fails to account for that systematic curvature, a straight line may not fit the relationship and a nonlinear model or transformation is warranted.',
      choiceRationales: [
        'A correlation of 1 means a perfect line with zero residuals; a curved residual pattern shows the line misses the shape.',
        'A distinct curved pattern proves the residuals deviate systematically from zero across x; if every residual were zero, all points would lie flat on the horizontal zero line with a perfect linear fit.',
        'Structured curvature in a residual plot indicates that the fitted straight line systematically overpredicts and underpredicts different ranges of the data, suggesting a nonlinear relationship.',
        'Residual plots exist only when both variables in a regression are quantitative; curvature in the residuals signals a nonlinear relationship between quantitative variables rather than a categorical response.',
      ],
    },
    'ap-statistics-foundation-pilot-item-151': {
      rationale: 'Because scores generally rise along a roughly straight line as hours studied increase, the scatterplot supports a positive linear association between the two quantitative variables. Stronger claims such as causation cannot be concluded from the plot alone without considering study design.',
      choiceRationales: [
        'A linear trend in a scatterplot documents association between study hours and scores, whereas establishing causation requires randomly assigning study hours in a controlled experiment.',
        'Plotting exam score on the vertical axis of a scatterplot requires numerical values, so the response variable is quantitative rather than categorical.',
        'The upward, roughly straight-line pattern across hours studied and score directly supports a positive linear association without making unwarranted causal claims.',
        'A correlation near zero corresponds to no linear trend, whereas an upward straight-line pattern indicates a positive correlation r > 0.',
      ],
    },
    'ap-statistics-foundation-pilot-item-156': {
      rationale: 'An upward, approximately linear trend across study hours and exam scores indicates that higher values of one quantitative variable tend to pair with higher values of the other in a straight-line form. Describing this pattern as a positive linear association accurately summarizes direction and form without overclaiming causation.',
      choiceRationales: [
        'Exam score is a numerical measurement that can be placed along a quantitative axis in a scatterplot, not a categorical label.',
        'Observing an upward trend in a scatterplot shows that higher study hours tend to accompany higher scores, but association alone cannot prove cause and effect.',
        'A clear upward straight-line pattern reflects a positive linear relationship with r > 0 rather than a correlation of zero.',
        'Describing an upward, roughly straight-line scatterplot trend as a positive linear association captures both the positive direction and linear form while avoiding unsupported causal conclusions.',
      ],
    },
  },

  ap_us_history_foundation_pilot: {
    'apush-foundation-277': {
      rationale: 'From 1980 to the present, conservative electoral realignment, accelerating economic globalization, digital innovation, post-1965 demographic shifts, and the collapse of the Soviet Union drove new national debates over federal power, social policy, and U.S. global leadership.',
      choiceRationales: [
        'Conservative politics, global market integration, digital technology, demographic change, and the end of the Cold War directly anchor the defining economic, cultural, and foreign-policy debates of Period 9.',
        'The personal computer, deindustrialization, new immigration, and the Reagan coalition all mark sharp breaks from the 1950s.',
        'From 1980 onward, global trade integration, Middle East military interventions, the digital revolution, Sun Belt migration, and conservative tax and regulatory shifts reshaped American life.',
        'Post-Cold War politics remained intensely polarized, with fierce partisan clashes over tax rates, health care reform, immigration policy, social issues, and the proper scope of federal power.',
      ],
    },
    'apush-foundation-414': {
      rationale: 'Comparing post-1980 America with earlier postwar decades highlights decisive structural shifts: the rise of the modern conservative coalition, global trade integration, computing and internet technologies, growing demographic diversity, and post-Cold War foreign policy realignments transformed American political discourse.',
      choiceRationales: [
        'Factory closures in the Rust Belt, the personal computer and internet revolution, post-1965 immigration from Asia and Latin America, and conservative electoral realignment marked a decisive break from 1950s society.',
        'Highlighting conservative realignment, globalization, new technology, demographic diversity, and the Cold War’s end accurately contrasts Period 9’s political debates with earlier mid-century conditions.',
        'Far from retreating, the United States deepened global integration after 1980 through NAFTA, the World Trade Organization, Middle East military interventions including the Gulf War, and worldwide digital communications.',
        'After the Soviet Union dissolved in 1991, fierce partisan divisions continued over free trade, health care reform, immigration policy, social issues, and the proper scope of federal spending and regulation.',
      ],
    },
  },

  parapro_pack: {
    'parapro-b4-writing-005': {
      choices: [
        'subordinating conjunction',
        'coordinating conjunction',
        'demonstrative pronoun',
        'descriptive adjective',
      ],
      rationale: 'In this sentence, "Although" introduces the dependent clause "Although the field was muddy" and joins it to the independent clause to express contrast, which is the grammatical function of a subordinating conjunction.',
      choiceRationales: [
        '"Although" functions as a subordinating conjunction because it opens the dependent clause "Although the field was muddy" and connects it to the main clause with contrast.',
        'A coordinating conjunction such as "and" or "but" joins two grammatically equal words or independent clauses, whereas "Although" turns its clause into a subordinate unit.',
        'A demonstrative pronoun such as "this" or "those" replaces or points to a specific noun phrase, while "Although" links clauses rather than standing in for a naming word.',
        'A descriptive adjective modifies a noun or pronoun by naming a trait such as "muddy," whereas "Although" introduces an entire dependent clause of concession.',
      ],
    },
    'parapro-b4-writing-006': {
      choices: [
        'had already printed',
        'will have printed',
        'will be printed',
        'has been printing',
      ],
      rationale: 'The time marker "By next Friday" points to an action that will be finished before a specified future deadline. The active future perfect verb phrase "will have printed" expresses that completed future relationship accurately.',
      choiceRationales: [
        'The past perfect phrase "had already printed" places completion before another past event, which clashes with the upcoming deadline signaled by "By next Friday."',
        'The future perfect phrase "will have printed" matches "By next Friday" by showing that the art club will finish printing all 200 invitations before that future point.',
        'The future passive phrase "will be printed" treats the art club as the object being printed rather than the active group completing all 200 invitations before Friday.',
        'The present perfect progressive phrase "has been printing" expresses ongoing activity continuing up to now rather than completion before the future Friday deadline.',
      ],
    },
    'parapro-b5-writing-007': {
      choices: [
        'subordinating conjunction',
        'conjunctive adverb',
        'coordinating conjunction',
        'descriptive adjective',
      ],
      rationale: 'In this compound sentence, "yet" follows a comma to link two independent clauses of equal grammatical rank while signaling contrast, which defines its role as a coordinating conjunction.',
      choiceRationales: [
        'A subordinating conjunction turns one clause into a dependent unit that cannot stand alone, whereas both clauses joined by "yet" remain complete independent clauses.',
        'A conjunctive adverb such as "however" typically follows a semicolon between independent clauses, whereas "yet" is one of the FANBOYS coordinating conjunctions used with a comma.',
        '"Yet" serves as a coordinating conjunction because it follows a comma to connect two equally important independent clauses and highlight the contrast between them.',
        'A descriptive adjective modifies a noun or pronoun with a quality such as "late," whereas "yet" joins two complete clauses without describing any single noun.',
      ],
    },
  },
};
