'use strict';

const references = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5312.pdf',
  'https://praxis.ets.org/test/school-librarian-5312.html',
  'https://standards.aasl.org/',
  'https://www.ala.org/advocacy/intfreedom/librarybill',
  'https://www.copyright.gov/circs/circ21.pdf',
];

const domains = [
  {
    id:'program-administration', label:'Program Administration', target:20,
    concepts:[
      ['needs assessment','Combine disaggregated use, achievement, curriculum, stakeholder, and access evidence before setting measurable program priorities.',['Let circulation totals alone determine every priority.','Copy last year’s plan without reviewing current needs.','Survey only frequent library users and generalize to everyone.'],'A defensible needs assessment triangulates quantitative and qualitative evidence and looks for groups whose needs or access may be hidden by schoolwide averages.'],
      ['mission and goals','Align the library mission and measurable goals with school improvement priorities, learner needs, intellectual freedom, and equitable access.',['Write goals around equipment purchases rather than learner outcomes.','Adopt a generic mission without stakeholder input.','Treat the library as separate from curriculum and school improvement.'],'Program goals should connect library services to learning while preserving the school librarian’s professional responsibilities and the rights of all learners.'],
      ['budget stewardship','Build a transparent, evidence-based budget that connects expenditures to priorities, lifecycle costs, accessibility, and equitable learner benefit.',['Spend the remaining budget on the newest products regardless of need.','Divide funds equally across formats without examining use or access.','Exclude renewal, maintenance, licensing, and replacement costs.'],'Sound budgeting considers total cost of ownership, documented needs, instructional value, accessibility, and whether resources expand equitable opportunity.'],
      ['program evaluation','Use process, participation, access, and learner-outcome evidence to evaluate implementation and revise the program.',['Report only how many books were checked out.','Change several variables without documenting implementation.','Claim impact from satisfaction comments alone.'],'Evaluation is strongest when measures match stated goals, implementation is documented, evidence is disaggregated, and findings lead to a monitored improvement cycle.'],
      ['policy and operations','Develop clear, consistently applied procedures with stakeholder input, current law and policy, safety, privacy, reconsideration, and appeal pathways.',['Resolve each concern informally without written criteria.','Apply different access rules to favored viewpoints.','Promise absolute confidentiality regardless of safety or legal duties.'],'Written, viewpoint-neutral procedures protect access and due process while helping staff respond consistently and consult authorized decision makers when facts are complex.'],
    ],
  },
  {
    id:'organization-access', label:'Organization and Access', target:19,
    concepts:[
      ['collection development','Use a board-approved selection policy, curriculum and community evidence, professional reviews, diversity audits, and format/accessibility needs.',['Select only titles personally preferred by the librarian.','Use popularity as the sole selection criterion.','Avoid resources that present unfamiliar perspectives.'],'Collection decisions should follow documented criteria and build a relevant, representative, accessible collection rather than reflecting one person’s preferences.'],
      ['cataloging and metadata','Apply consistent descriptive and subject metadata, authorized access points, and local notes that improve accurate discovery without embedding bias.',['Invent a different classification rule for each item.','Remove subject access to simplify the catalog.','Use stigmatizing labels when neutral current terminology exists.'],'Consistent, inclusive metadata supports discovery, interoperability, and user independence; local practice should be documented and reviewed for harmful or obsolete language.'],
      ['weeding and retention','Apply documented deselection criteria such as accuracy, condition, relevance, use, duplication, curricular need, and archival value.',['Discard every item not circulated this year.','Retain inaccurate resources because the shelves look full.','Remove challenged viewpoints without following reconsideration policy.'],'Weeding is a planned collection-development function, not censorship; multiple criteria and exceptions for enduring, local, and curricular value are essential.'],
      ['equitable access and scheduling','Use flexible, timely scheduling and accessible physical and digital design so learners can obtain resources when instructional or personal needs arise.',['Reserve all library time for fixed weekly classes.','Close independent access whenever a class is present.','Offer digital resources that work only on school-owned devices.'],'Equitable access considers time, disability, language, device, connectivity, transportation, and instructional need rather than assuming identical arrangements are equally usable.'],
      ['circulation privacy and resource sharing','Collect only necessary user data, limit access and retention, explain practices, and use lawful resource-sharing procedures.',['Publish students’ reading histories to motivate circulation.','Keep identifiable checkout data indefinitely without purpose.','Share account credentials so classes can reach licensed content.'],'Privacy-aware circulation protects intellectual inquiry while allowing limited, authorized operational use of records and lawful interlibrary or licensed access.'],
    ],
  },
  {
    id:'information-access-learning-environment', label:'Information Access in the Learning Environment', target:20,
    concepts:[
      ['inquiry and search strategy','Translate an information need into focused questions, concepts, synonyms, source types, search tools, and an iterative search-and-refine plan.',['Enter the entire assignment as one search and use the first result.','Choose a source before clarifying the information need.','Treat an unsuccessful first search as proof that no evidence exists.'],'Expert searching is iterative: learners clarify the need, vary language and tools, examine results, and revise the strategy as their understanding grows.'],
      ['source evaluation','Evaluate authority, evidence, purpose, currency, context, corroboration, and fitness for the specific information need.',['Use domain suffix as proof that a claim is accurate.','Reject every source that expresses a perspective.','Choose the most visually polished page without checking evidence.'],'Source evaluation is contextual rather than a checklist score; credible use depends on how claims are supported and whether the source fits the task.'],
      ['intellectual freedom and challenges','Maintain access under adopted, viewpoint-neutral selection and reconsideration procedures while protecting lawful family choices and due process.',['Remove a resource immediately after a verbal complaint.','Require one family’s preference to govern access for all learners.','Defend a challenged title solely because the librarian likes it.'],'Intellectual freedom is supported by advance policy, documented criteria, formal review, continued access under policy, and decisions based on the work as a whole.'],
      ['copyright and licensing','Distinguish ownership, license terms, public domain, permission, and fact-specific educational exceptions before copying or sharing a work.',['Assume any educational use is automatically fair use.','Upload an entire licensed work to a public site.','Treat citation as a substitute for copyright permission.'],'Attribution and copyright compliance are related but distinct; educators examine purpose, nature, amount, market effect, license terms, and current institutional guidance.'],
      ['digital citizenship privacy and security','Teach learners to manage identity, consent, data sharing, security, respectful participation, algorithms, and platform risks through authentic decisions.',['Reduce digital citizenship to a one-time password lecture.','Require public accounts without reviewing age and privacy terms.','Collect sensitive student data because a free tool requests it.'],'Digital citizenship combines critical participation with privacy and security; tools should be vetted for instructional need, accessibility, data practices, and age-appropriate use.'],
    ],
  },
  {
    id:'teaching-learning', label:'Teaching and Learning', target:29,
    concepts:[
      ['collaborative instructional planning','Co-plan standards, inquiry goals, roles, resources, accessibility, formative evidence, and transfer with classroom educators.',['Wait for a teacher to request a list of websites after the unit ends.','Teach an isolated library skill unrelated to the assignment.','Let collaboration mean the librarian supplies materials but never shares planning.'],'High-impact collaboration begins before instruction and joins disciplinary content with inquiry, literacy, technology, and assessment responsibilities.'],
      ['learning objectives and alignment','State observable learner outcomes and align instruction, guided practice, resources, and assessment to the intended level of thinking.',['Write an objective describing what the librarian will cover.','Assess recall when the objective requires evaluation and creation.','Choose activities first and infer an objective afterward.'],'Alignment makes the expected learning and evidence explicit; activities and tools serve the outcome instead of becoming the outcome.'],
      ['differentiation and accessibility','Preserve rigorous goals while varying representation, scaffolds, language supports, tools, grouping, and response options based on learner evidence.',['Lower the learning goal for every learner who needs access support.','Provide one text and one response format to ensure fairness.','Wait for failure before using documented accommodations.'],'Accessible differentiation anticipates variability and distinguishes access supports from changes to the construct or learning expectation.'],
      ['formative assessment and feedback','Elicit interpretable evidence during learning and use it with learners to provide actionable feedback and adjust next steps.',['Assign a grade after the unit and call it formative.','Collect exit tickets without reviewing or using them.','Praise effort without identifying a strategy or next step.'],'Assessment becomes formative through use: evidence must inform timely instructional and learner action linked to clear success criteria.'],
      ['reading engagement and reader development','Use knowledge of learners, broad voluntary choice, culturally sustaining collections, book access, conversation, and nonpunitive support to build reading lives.',['Require every learner to read at one labeled level exclusively.','Reward only the number of pages completed.','Assume reluctant readers need fewer choices and less access.'],'Reading engagement grows through relevance, agency, belonging, abundant access, responsive guidance, and opportunities to share meaning without turning pleasure reading into surveillance.'],
      ['media and information literacy','Teach learners to investigate claims across formats, trace evidence, recognize persuasion and manipulation, verify media, and communicate conclusions responsibly.',['Tell learners that bias makes a source unusable.','Use a single fact-checking checklist for every context.','Focus on production effects without examining claims or evidence.'],'Media literacy integrates close reading, lateral investigation, evidence tracing, contextual judgment, and ethical creation across text, image, audio, data, and algorithms.'],
      ['learning environment and management','Establish co-created routines, zones, transitions, technology expectations, restorative responses, and flexible spaces that support simultaneous learning needs.',['Demand silence everywhere regardless of the learning activity.','Arrange fixed spaces before identifying learner tasks.','Use public exclusion as the first response to minor off-task behavior.'],'A well-managed library makes expectations teachable and predictable while using space, supervision, relationships, and proportionate responses to preserve access and safety.'],
      ['technology integration','Select technology only when it advances the learning goal and meets accessibility, privacy, interoperability, support, and evidence requirements.',['Adopt the newest application to demonstrate innovation.','Require a tool before checking whether it works with assistive technology.','Use engagement metrics as the sole evidence of learning.'],'Purposeful integration starts with pedagogy and learner need, then evaluates the tool’s added value, risks, usability, and evidence of learning.'],
    ],
  },
  {
    id:'professional-development-leadership-advocacy', label:'Professional Development, Leadership, and Advocacy', target:12,
    concepts:[
      ['professional learning','Use needs evidence to design sustained, job-embedded professional learning with modeling, practice, feedback, follow-up, and impact evidence.',['Offer the same one-time tool demonstration regardless of staff need.','Measure success only by attendance.','Introduce a strategy without time for supported application.'],'Effective professional learning is relevant, active, sustained, and evaluated through changes in practice and learner access or outcomes.'],
      ['leadership and partnerships','Build reciprocal partnerships with learners, families, educators, administrators, public libraries, and community groups around shared goals and defined responsibilities.',['Ask partners only for donations after decisions are final.','Promise services beyond each partner’s authority or capacity.','Exclude affected learners from planning because adults know best.'],'Sustainable partnerships share purpose, voice, roles, communication, safeguards, and evaluation rather than treating community members as resources to be used.'],
      ['advocacy and communication','Frame advocacy around documented learner needs, program evidence, compelling examples, stakeholder priorities, and a specific feasible action.',['Argue that the library deserves funding because libraries are inherently good.','Report activity counts without connecting them to access or learning.','Use the same message and evidence for every audience.'],'Advocacy connects credible evidence and human impact to the concerns of a particular audience and makes a clear, ethical request.'],
    ],
  },
];

const lenses = [
  (concept) => `A school librarian is reviewing ${concept} after noticing uneven learner outcomes. Which action is most defensible?`,
  (concept) => `During collaborative planning, a team disagrees about ${concept}. What should the school librarian recommend first?`,
  (concept) => `A principal asks for an evidence-based approach to ${concept}. Which response best reflects beginning-practice standards?`,
  (concept) => `A library program audit identifies a weakness involving ${concept}. Which improvement is most appropriate?`,
  (concept) => `A family and student advisory group raises a new concern about ${concept}. Which response best protects learning and equitable access?`,
];

module.exports = domains.map((domain) => {
  const questions = [];
  for (const [title, correct, distractors, rationale] of domain.concepts) {
    for (let lens = 0; lens < 4; lens += 1) questions.push({
      promptA:lenses[lens](title),
      promptB:'In a parallel school, ' + lenses[(lens+1)%lenses.length](title).replace(/^./, (letter) => letter.toLowerCase()),
      correct,distractors,rationale,
      difficulty:lens<2?'application':'analysis',
    });
  }
  while (questions.length < domain.target) {
    const [title,correct,distractors,rationale]=domain.concepts[questions.length%domain.concepts.length];
    questions.push({promptA:lenses[4](title),promptB:'In a parallel school, '+lenses[0](title).replace(/^./,(letter)=>letter.toLowerCase()),correct,distractors,rationale,difficulty:'analysis'});
  }
  return {...domain,references:references.slice(),questions:questions.slice(0,domain.target)};
});
