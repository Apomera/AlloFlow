#!/usr/bin/env node
'use strict';

// Builds an independently authored AP U.S. Government and Politics internal
// foundation pilot. This is a blueprint/architecture pass, not an official AP
// form, a released item bank, or a calibrated score simulation.

const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_us_government_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_us_government_foundation_pilot_learning_library.json');

const PACK_ID = 'ap-us-government-foundation-pilot';
const VERSION = '0.8.0-internal-preview';
const VERIFIED_AT = '2026-08-20';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description.pdf';
const CLARIFICATIONS_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description-clarifications-effective-fall-2026.pdf';
const COURSE_URL = 'https://apcentral.collegeboard.org/courses/ap-united-states-government-and-politics';
const EXAM_URL = 'https://apcentral.collegeboard.org/courses/ap-united-states-government-and-politics/exam';
const OPENSTAX_URL = 'https://openstax.org/details/books/american-government-3e';
const LIBRARY_VERSION = 'ap-us-government-foundation-v8';

function assert(condition, message) {
  if (!condition) throw new Error('[AP U.S. Government foundation builder] ' + message);
}

function writeJson(filePath, value) {
  writeGeneratedFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

const units = [
  {
    number: 1,
    id: 'foundations-of-american-democracy',
    label: 'Unit 1: Foundations of American Democracy',
    shortLabel: 'Foundations of American Democracy',
    weight: 0.185,
    officialWeightMin: 0.15,
    officialWeightMax: 0.22,
    summary: 'This unit connects democratic ideals, constitutional design, federalism, and the continuing tension between liberty and effective government.',
    topics: [
      ['1.1', 'Ideals of Democracy'],
      ['1.2', 'Types of Democracy'],
      ['1.3', 'Government Power and Individual Rights'],
      ['1.4', 'Challenges of the Articles of Confederation'],
      ['1.5', 'Ratification of the U.S. Constitution'],
      ['1.6', 'Principles of American Government'],
      ['1.7', 'Relationship Between the States and the Federal Government'],
      ['1.8', 'Constitutional Interpretations of Federalism'],
      ['1.9', 'Federalism in Action'],
    ],
  },
  {
    number: 2,
    id: 'interactions-among-branches',
    label: 'Unit 2: Interactions Among Branches of Government',
    shortLabel: 'Interactions Among Branches of Government',
    weight: 0.305,
    officialWeightMin: 0.25,
    officialWeightMax: 0.36,
    summary: 'This unit examines how Congress, the presidency, the courts, and the bureaucracy share power, compete for influence, and shape policy.',
    topics: [
      ['2.1', 'Congress: The Senate and the House of Representatives'],
      ['2.2', 'Structures, Powers, and Functions of Congress'],
      ['2.3', 'Congressional Behavior'],
      ['2.4', 'Roles and Powers of the President'],
      ['2.5', 'Checks on the Presidency'],
      ['2.6', 'Expansion of Presidential Power'],
      ['2.7', 'Presidential Communication'],
      ['2.8', 'The Judicial Branch'],
      ['2.9', 'The Role of the Judicial Branch'],
      ['2.10', 'The Court in Action'],
      ['2.11', 'Checks on the Judicial Branch'],
      ['2.12', 'The Bureaucracy'],
      ['2.13', 'Discretionary and Rulemaking Authority'],
      ['2.14', 'Holding the Bureaucracy Accountable'],
      ['2.15', 'Policy and the Branches of Government'],
    ],
  },
  {
    number: 3,
    id: 'civil-liberties-and-civil-rights',
    label: 'Unit 3: Civil Liberties and Civil Rights',
    shortLabel: 'Civil Liberties and Civil Rights',
    weight: 0.155,
    officialWeightMin: 0.13,
    officialWeightMax: 0.18,
    summary: 'This unit distinguishes civil liberties from civil rights and traces how constitutional text, judicial interpretation, legislation, and social movements shape both.',
    topics: [
      ['3.1', 'The Bill of Rights'],
      ['3.2', 'First Amendment: Freedom of Religion'],
      ['3.3', 'First Amendment: Freedom of Speech'],
      ['3.4', 'First Amendment: Freedom of the Press'],
      ['3.5', 'Second Amendment: Right to Bear Arms'],
      ['3.6', 'Amendments: Balancing Individual Freedom with Public Order and Safety'],
      ['3.7', 'Selective Incorporation'],
      ['3.8', 'Amendments: Due Process and the Rights of the Accused'],
      ['3.9', 'Amendments: Due Process and the Right to Privacy'],
      ['3.10', 'Social Movements and Equal Protection'],
      ['3.11', 'Government Responses to Social Movements'],
      ['3.12', 'Balancing Minority and Majority Rights'],
      ['3.13', 'Affirmative Action'],
    ],
  },
  {
    number: 4,
    id: 'american-political-ideologies-and-beliefs',
    label: 'Unit 4: American Political Ideologies and Beliefs',
    shortLabel: 'American Political Ideologies and Beliefs',
    weight: 0.125,
    officialWeightMin: 0.10,
    officialWeightMax: 0.15,
    summary: 'This unit develops the methods used to measure public opinion and explains how political culture, ideology, parties, and policy preferences interact.',
    topics: [
      ['4.1', 'American Attitudes about Government and Politics'],
      ['4.2', 'Political Socialization'],
      ['4.3', 'Changes in Ideology'],
      ['4.4', 'Influence of Political Events on Ideology'],
      ['4.5', 'Measuring Public Opinion'],
      ['4.6', 'Evaluating Public Opinion Data'],
      ['4.7', 'Ideologies of Political Parties'],
      ['4.8', 'Ideology and Policymaking'],
      ['4.9', 'Ideology and Economic Policy'],
      ['4.10', 'Ideology and Social Policy'],
    ],
  },
  {
    number: 5,
    id: 'political-participation',
    label: 'Unit 5: Political Participation',
    shortLabel: 'Political Participation',
    weight: 0.23,
    officialWeightMin: 0.20,
    officialWeightMax: 0.27,
    summary: 'This unit traces how people participate in representative democracy through voting, parties, interest groups, campaigns, elections, and changing media.',
    topics: [
      ['5.1', 'Voting Rights and Models of Voting Behavior'],
      ['5.2', 'Voter Turnout'],
      ['5.3', 'Political Parties'],
      ['5.4', 'How and Why Political Parties Change and Adapt'],
      ['5.5', 'Third-Party Politics'],
      ['5.6', 'Interest Groups'],
      ['5.7', 'Groups Influencing Policy Outcomes'],
      ['5.8', 'Electing a President'],
      ['5.9', 'Congressional Elections'],
      ['5.10', 'Modern Campaigns'],
      ['5.11', 'Campaign Finance'],
      ['5.12', 'The Media'],
      ['5.13', 'Changing Media'],
    ],
  },
].map((unit) => ({
  ...unit,
  topics: unit.topics.map(([id, label]) => ({ id, label })),
}));

const bigIdeas = [
  { id: 'BI1', label: 'Constitutionalism', description: 'The Constitution establishes a system of checks, balances, and limits on government power.' },
  { id: 'BI2', label: 'Liberty and Order', description: 'Political institutions and citizens continually negotiate the relationship between individual liberty and public order.' },
  { id: 'BI3', label: 'Civic Participation in a Representative Democracy', description: 'Citizens and organized groups use multiple pathways to influence representation and policy.' },
  { id: 'BI4', label: 'Competing Policymaking Interests', description: 'Institutions, parties, interests, and citizens compete and cooperate to shape public policy.' },
  { id: 'BI5', label: 'Methods of Political Analysis', description: 'Political scientists use concepts, cases, data, sources, and arguments to analyze government and politics.' },
];

const skills = [
  {
    id: 'C1',
    label: 'Concept Application',
    description: 'Describe, compare, and apply political principles, institutions, processes, policies, and behaviors.',
    subskills: ['1.A', '1.B', '1.C', '1.D', '1.E'],
  },
  {
    id: 'C2',
    label: 'SCOTUS Application',
    description: 'Apply required Supreme Court case facts, holdings, reasoning, and constitutional connections.',
    subskills: ['2.A', '2.B', '2.C', '2.D'],
  },
  {
    id: 'C3',
    label: 'Data Analysis',
    description: 'Describe, interpret, compare, and evaluate quantitative and visual political data.',
    subskills: ['3.A', '3.B', '3.C', '3.D', '3.E', '3.F'],
  },
  {
    id: 'C4',
    label: 'Source Analysis',
    description: 'Read, analyze, and interpret foundational documents and other text-based or visual sources.',
    subskills: ['4.A', '4.B', '4.C', '4.D'],
  },
  {
    id: 'C5',
    label: 'Argumentation',
    description: 'Make defensible claims, support them with evidence and reasoning, and address alternatives.',
    subskills: ['5.A', '5.B', '5.C', '5.D'],
  },
];

const sourceCatalog = [
  {
    id: 'ap-gov-ced',
    title: 'AP U.S. Government and Politics Course and Exam Description, Effective Fall 2026',
    organization: 'College Board',
    url: CED_URL,
    credibility: 'The public Course and Exam Description supplies the current unit, topic, big-idea, skill, and weighting framework. It is used for blueprint alignment only; no official assessment content is reproduced.',
    sourceType: 'official-blueprint',
    reviewedAt: VERIFIED_AT,
  },
  {
    id: 'ap-gov-course',
    title: 'AP U.S. Government and Politics course page',
    organization: 'College Board',
    url: COURSE_URL,
    credibility: 'The public course page supplies the current course-level context and links to official assessment information.',
    sourceType: 'official-course-page',
    reviewedAt: VERIFIED_AT,
  },
  {
    id: 'ap-gov-ced-clarifications',
    title: 'AP U.S. Government and Politics Course and Exam Description Clarifications and Corrections, Effective Fall 2026',
    organization: 'College Board',
    url: CLARIFICATIONS_URL,
    credibility: 'The public clarification document records the Fall 2026 additions to the required foundational-document list. It is used for metadata crosswalk only; no document text or official assessment content is reproduced.',
    sourceType: 'official-blueprint-clarifications',
    reviewedAt: VERIFIED_AT,
  },
  {
    id: 'american-government-3e',
    title: 'American Government 3e',
    organization: 'OpenStax, Rice University',
    url: OPENSTAX_URL,
    credibility: 'An openly accessible introductory government text used for factual cross-checking and links. No textbook prose, figures, or assessment content is reproduced.',
    sourceType: 'open-factual-cross-check',
    reviewedAt: VERIFIED_AT,
  },
];

const foundationalDocumentCatalog = [
  { id: 'articles-of-confederation', title: 'The Articles of Confederation', unitNumbers: [1], topicIds: ['1.4', '1.6', '1.7', '1.8'], bigIdeaIds: ['BI1', 'BI4'], skillIds: ['C4', 'C5'] },
  { id: 'brutus-no-1', title: 'Brutus No. 1', unitNumbers: [1], topicIds: ['1.2', '1.3', '1.5'], bigIdeaIds: ['BI1', 'BI2', 'BI5'], skillIds: ['C4', 'C5'] },
  { id: 'constitution-of-the-united-states', title: 'The Constitution of the United States, including the Bill of Rights and subsequent amendments', unitNumbers: [1, 2, 3], topicIds: ['1.5', '1.6', '1.7', '1.8', '1.9', '2.2', '2.5', '2.8', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'], bigIdeaIds: ['BI1', 'BI2'], skillIds: ['C4', 'C5'] },
  { id: 'declaration-of-independence', title: 'The Declaration of Independence', unitNumbers: [1], topicIds: ['1.1', '1.3'], bigIdeaIds: ['BI1', 'BI2'], skillIds: ['C4', 'C5'] },
  { id: 'emancipation-proclamation', title: 'The Emancipation Proclamation', unitNumbers: [3], topicIds: ['3.10', '3.11', '3.12'], bigIdeaIds: ['BI2', 'BI4'], skillIds: ['C4', 'C5'] },
  { id: 'federalist-no-10', title: 'Federalist No. 10', unitNumbers: [1], topicIds: ['1.2', '1.3', '5.3', '5.6'], bigIdeaIds: ['BI1', 'BI3', 'BI4'], skillIds: ['C4', 'C5'] },
  { id: 'federalist-no-39', title: 'Federalist No. 39', unitNumbers: [1], topicIds: ['1.2', '1.5', '1.6'], bigIdeaIds: ['BI1', 'BI5'], skillIds: ['C4', 'C5'] },
  { id: 'federalist-no-51', title: 'Federalist No. 51', unitNumbers: [1, 2], topicIds: ['1.6', '2.1', '2.2', '2.5', '2.8', '2.11', '2.15'], bigIdeaIds: ['BI1', 'BI4'], skillIds: ['C4', 'C5'] },
  { id: 'federalist-no-70', title: 'Federalist No. 70', unitNumbers: [2], topicIds: ['2.4', '2.5', '2.6', '2.7', '2.15'], bigIdeaIds: ['BI1', 'BI4'], skillIds: ['C4', 'C5'] },
  { id: 'federalist-no-78', title: 'Federalist No. 78', unitNumbers: [2], topicIds: ['2.8', '2.9', '2.10', '2.11'], bigIdeaIds: ['BI1', 'BI5'], skillIds: ['C4', 'C5'] },
  { id: 'gettysburg-address', title: 'The Gettysburg Address', unitNumbers: [3], topicIds: ['3.10', '3.12', '4.1'], bigIdeaIds: ['BI2', 'BI3'], skillIds: ['C4', 'C5'] },
  { id: 'letter-from-a-birmingham-jail', title: 'Letter from a Birmingham Jail', unitNumbers: [3], topicIds: ['3.10', '3.11', '3.12', '5.1', '5.6'], bigIdeaIds: ['BI2', 'BI3', 'BI5'], skillIds: ['C4', 'C5'] },
  { id: 'adam-smith-wealth-of-nations', title: 'Core Principles from Adam Smith\'s The Wealth of Nations', unitNumbers: [4, 5], topicIds: ['4.7', '4.8', '4.9', '5.6', '5.7'], bigIdeaIds: ['BI4', 'BI5'], skillIds: ['C4', 'C5'] },
].map((document) => ({
  ...document,
  requiredForAcademicYear: '2026-27',
  requirementSource: CED_URL,
  clarificationSource: CLARIFICATIONS_URL,
  sourceUse: 'Title, public requirement metadata, and internal topic crosswalk only; no official document text, excerpt, or assessment content is reproduced.',
  officialItem: false,
  reproducedText: false,
  releaseEligible: false,
  reviewStatus: 'source-reviewed-editorial-pass',
  independentExpertReviewStatus: 'pending',
}));
const allTopicIds = new Set(units.flatMap((unit) => unit.topics.map((topic) => topic.id)));
assert(foundationalDocumentCatalog.length === 13 && new Set(foundationalDocumentCatalog.map((document) => document.id)).size === 13, 'The current public framework must declare thirteen foundational documents.');
assert(foundationalDocumentCatalog.every((document) => document.topicIds.length > 0 && document.topicIds.every((topicId) => allTopicIds.has(topicId))), 'Foundational-document crosswalk contains an unknown or empty topic route.');

function q(unit, topicId, skillId, prompt, answer, distractors, rationale, options = {}) {
  assert(/^([1-5])\.[A-F]$/.test(skillId), 'Invalid AP U.S. Government subskill: ' + skillId);
  assert(Array.isArray(distractors) && distractors.length === 3, 'Each item needs three distractors: ' + prompt);
  return {
    unit,
    topicId,
    skillId,
    prompt,
    answer,
    distractors,
    rationale,
    cognitiveProcess: options.cognitiveProcess || 'apply',
    difficulty: options.difficulty || 'intermediate',
    stimulus: options.stimulus || '',
  };
}

const baseItemSpecs = [
  // Unit 1: 18 items, including at least one item for each current topic.
  q(1, '1.1', '1.D', 'A community creates a government by agreeing to surrender some freedom in exchange for protection and public order. Which democratic ideal is illustrated?', 'The social contract', ['Popular sovereignty', 'Judicial review', 'Federalism'], 'The social contract describes an implicit agreement in which people accept some limits so government can provide order and protection.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(1, '1.2', '1.E', 'A city allows residents to propose and vote directly on a portion of the municipal budget. Which model of representative democracy is most directly illustrated?', 'Participatory democracy', ['Elite democracy', 'Judicial supremacy', 'Bureaucratic autonomy'], 'Participatory democracy emphasizes direct citizen involvement in political decision-making, including initiatives or participatory budgeting.', { cognitiveProcess: 'apply' }),
  q(1, '1.3', '1.A', 'Which claim best represents the Federalist argument that a large republic could protect liberty?', 'A large republic can make it harder for one faction to dominate by multiplying interests and representatives.', ['A large republic eliminates all political factions by requiring unanimous agreement.', 'A large republic makes state governments unnecessary because local interests disappear.', 'A large republic protects liberty only when voters cannot replace elected officials.'], 'Federalist No. 10 argued that an extended republic could control faction by making majority combinations more difficult and by filtering public views through representation.', { cognitiveProcess: 'explain' }),
  q(1, '1.4', '4.B', 'Why did Shays’ Rebellion strengthen arguments for revising the Articles of Confederation?', 'It highlighted the national government’s limited ability to respond to internal unrest.', ['It demonstrated that the national government had an overly powerful executive.', 'It proved that Congress could directly regulate interstate commerce.', 'It showed that the national courts could easily enforce federal law.'], 'The rebellion exposed weaknesses in the Confederation government, including its limited military and fiscal capacity, and encouraged support for a stronger national framework.', { cognitiveProcess: 'explain', stimulus: 'A delegate writes that the Confederation Congress could request funds and troops but could not compel states to provide them.' }),
  q(1, '1.5', '1.C', 'What was the principal effect of the Great Compromise at the Constitutional Convention?', 'It created a bicameral Congress with population-based representation in the House and equal state representation in the Senate.', ['It gave every state the same number of representatives in both chambers.', 'It replaced congressional representation with direct national voting on every law.', 'It required the president to be elected by the Supreme Court.'], 'The Great Compromise balanced large-state and small-state interests by combining proportional representation in the House with equal state representation in the Senate.', { cognitiveProcess: 'explain' }),
  q(1, '1.6', '1.B', 'A president vetoes a bill passed by Congress, and Congress considers overriding the veto. Which constitutional principle is most directly illustrated?', 'Checks and balances', ['Popular sovereignty without representation', 'The supremacy of state constitutions', 'Direct democracy in the national legislature'], 'Checks and balances allow each branch to restrain actions by another branch, while the veto and override process also reflects separation of powers.', { cognitiveProcess: 'apply' }),
  q(1, '1.7', '1.E', 'A state law conflicts with a valid federal law enacted under constitutional authority. Which principle generally resolves the conflict?', 'The Supremacy Clause gives valid federal law priority over conflicting state law.', ['The Tenth Amendment automatically invalidates every federal law affecting a state.', 'The Senate decides which state laws are constitutional without judicial review.', 'State law always prevails because states existed before the federal government.'], 'The Supremacy Clause establishes that the Constitution, valid federal laws, and treaties take priority over conflicting state law.', { cognitiveProcess: 'apply' }),
  q(1, '1.8', '2.B', 'Which constitutional interpretation did McCulloch v. Maryland support?', 'Congress may use implied powers under the Necessary and Proper Clause, and states may not interfere with valid federal actions.', ['Congress may exercise only powers listed word-for-word in Article I.', 'States may tax or veto any federal institution operating within their borders.', 'The Supreme Court may review only state cases involving criminal law.'], 'McCulloch supported implied congressional powers and national supremacy by rejecting Maryland’s attempt to tax the national bank.', { cognitiveProcess: 'explain' }),
  q(1, '1.9', '5.C', 'Why can federalism create multiple access points for an interest group seeking a policy change?', 'The group can pursue action through both national institutions and state governments that share policymaking authority.', ['Federalism requires every policy to be approved by every level of government.', 'Federalism removes state governments from policy implementation.', 'Federalism gives courts exclusive control over all public policy.'], 'Shared authority creates more than one venue for advocacy, implementation, litigation, and coalition building.', { cognitiveProcess: 'explain' }),
  q(1, '1.1', '4.A', 'Which statement best connects the Declaration of Independence to the principle of popular sovereignty?', 'It presents government legitimacy as dependent on the consent and rights of the governed.', ['It establishes a lifetime national judiciary with power to veto legislation.', 'It gives Congress exclusive authority over local elections.', 'It argues that political authority should be inherited through monarchy.'], 'The Declaration frames legitimate government as grounded in the rights and consent of the governed, a foundation for popular sovereignty.', { cognitiveProcess: 'connect', stimulus: 'A student compares a passage about unalienable rights with a passage about governments deriving just powers from the consent of the governed.' }),
  q(1, '1.2', '1.E', 'A small group of business leaders shapes a city’s transportation policy while most residents do not participate. Which model of democracy best describes the scenario?', 'Elite democracy', ['Participatory democracy', 'Direct constitutional review', 'Majoritarian federalism'], 'Elite democracy emphasizes decision-making by a limited group of influential leaders rather than broad direct participation.', { cognitiveProcess: 'classify' }),
  q(1, '1.3', '4.B', 'Which concern did Brutus No. 1 raise about ratifying the Constitution?', 'A large national government could become distant and threaten individual liberty and state authority.', ['A weak national government would be unable to prevent every local election.', 'A small republic would create too many competing factions to govern.', 'A national government with separated powers would automatically abolish states.'], 'Brutus argued that a large, centralized republic could become unresponsive and endanger liberty, a core Anti-Federalist concern.', { cognitiveProcess: 'explain', stimulus: 'The source warns that representatives may become too distant from the people to understand local interests.' }),
  q(1, '1.4', '1.D', 'Which weakness of the Articles of Confederation most directly limited Congress’s ability to pay national debts?', 'Congress lacked a reliable power to tax individuals directly.', ['Congress controlled a permanent national executive with unlimited funds.', 'Congress had exclusive control over all state courts.', 'Congress could regulate every interstate trade dispute without limitation.'], 'The Confederation Congress depended on state contributions and lacked a general direct taxing power, limiting its fiscal capacity.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(1, '1.5', '5.B', 'Why did the promise to add a Bill of Rights help some Anti-Federalists accept ratification?', 'It addressed concerns that the new national government might infringe individual liberties.', ['It eliminated the need for a written Constitution.', 'It transferred all federal powers to state legislatures.', 'It guaranteed that the president would be selected by direct popular vote.'], 'The Bill of Rights responded to concerns that constitutional limits and structural checks alone might not adequately protect individual liberties.', { cognitiveProcess: 'explain' }),
  q(1, '1.6', '1.C', 'Which example best illustrates separation of powers rather than checks and balances?', 'The Constitution assigns legislative, executive, and judicial functions to different branches.', ['The Senate confirms a presidential nominee to a federal court.', 'The Supreme Court declares a statute unconstitutional.', 'Congress overrides a presidential veto with a supermajority.'], 'Separation of powers distributes core governmental functions across branches; the other examples show one branch checking another.', { cognitiveProcess: 'compare' }),
  q(1, '1.7', '1.E', 'Which power is generally reserved to the states by the federal system?', 'Administering local elections and establishing public-school systems subject to constitutional limits', ['Coining national currency', 'Negotiating treaties with foreign governments', 'Declaring war on another country'], 'State and local governments retain many powers over education and election administration, while currency, treaties, and war are national powers.', { cognitiveProcess: 'classify' }),
  q(1, '1.8', '2.D', 'A case asks whether Congress may regulate an activity that affects interstate markets only indirectly. Which constitutional authority is most likely at issue?', 'The Commerce Clause', ['The Appointments Clause', 'The Treaty Clause', 'The Establishment Clause'], 'The Commerce Clause is the principal constitutional basis for disputes over the federal regulation of interstate economic activity.', { cognitiveProcess: 'identify' }),
  q(1, '1.9', '5.B', 'The federal government offers states funds for highway construction but conditions the funds on meeting national safety standards. What federalism tool is illustrated?', 'A conditional grant', ['A treaty', 'An executive privilege claim', 'A judicial writ of certiorari'], 'Conditional grants use federal funding to encourage states to follow specified policy requirements while leaving implementation partly to the states.', { cognitiveProcess: 'apply' }),

  // Unit 2: 30 items, including at least one item for each current topic.
  q(2, '2.1', '1.C', 'Why does the House of Representatives generally respond more quickly to changes in local public opinion than the Senate?', 'House members serve shorter terms and represent smaller constituencies.', ['House members serve life terms and represent entire states.', 'Senators are appointed by the president every two years.', 'The House has no committees through which public demands are filtered.'], 'Two-year House terms and smaller districts create stronger incentives for frequent responsiveness to constituency opinion.', { cognitiveProcess: 'compare' }),
  q(2, '2.2', '1.B', 'Which congressional power is an example of an enumerated power?', 'The power to levy taxes', ['The power to appoint state governors', 'The power to interpret every state constitution', 'The power to conduct local school board elections'], 'Article I lists taxation among Congress’s enumerated powers, while the other choices are not general congressional powers.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(2, '2.3', '1.E', 'A legislator votes against a party position because most constituents in the district oppose the bill. Which influence on congressional behavior is most directly shown?', 'Constituency opinion', ['Judicial precedent', 'Executive privilege', 'Bureaucratic neutrality'], 'Members of Congress balance party positions with constituency preferences, especially when reelection incentives make local opinion salient.', { cognitiveProcess: 'apply' }),
  q(2, '2.4', '1.D', 'Which presidential role is most directly illustrated when the president negotiates with a foreign government on behalf of the United States?', 'Chief diplomat', ['Chief legislator of every state', 'Chief justice of the Supreme Court', 'Speaker of the House'], 'The president acts as chief diplomat when conducting foreign relations, although treaties require Senate approval.', { cognitiveProcess: 'identify' }),
  q(2, '2.5', '1.E', 'Which action is a legislative check on presidential power?', 'Congress overrides a presidential veto with the required supermajority.', ['The president issues an executive order.', 'A federal agency writes a regulation under delegated authority.', 'A federal court hears an appeal from a state court.'], 'The veto override allows Congress to check the president through a constitutionally specified supermajority process.', { cognitiveProcess: 'apply' }),
  q(2, '2.6', '1.E', 'Why have presidents often used executive orders to pursue policy goals?', 'Executive orders can direct executive-branch implementation without waiting for a new statute, although they remain subject to legal limits.', ['Executive orders permanently amend the Constitution without judicial review.', 'Executive orders allow presidents to enact any policy outside the executive branch.', 'Executive orders cannot be changed by a later president.'], 'Executive orders guide the executive branch, but statutes, appropriations, courts, and later administrations can constrain or change them.', { cognitiveProcess: 'explain' }),
  q(2, '2.7', '4.B', 'A president uses a nationally televised address to frame a policy as a matter of shared national identity. Which presidential resource is most directly being used?', 'The power of persuasion and the bully pulpit', ['The power to declare a statute unconstitutional', 'The Senate’s advice and consent power', 'The judicial power to issue warrants'], 'Presidential communication can shape agendas and mobilize public support even when the president lacks unilateral authority to enact the policy.', { cognitiveProcess: 'apply', stimulus: 'The address emphasizes shared values and asks citizens to contact their representatives.' }),
  q(2, '2.8', '2.A', 'Which institutional feature is intended to protect federal judicial independence?', 'Federal judges receive life tenure during good behavior and protected compensation.', ['Federal judges must stand for election every two years.', 'Federal judges serve only while the president approves their opinions.', 'Federal judges can be removed by a simple public petition.'], 'Life tenure and protected compensation reduce direct political pressure on Article III judges, although judges remain subject to impeachment for misconduct.', { cognitiveProcess: 'explain' }),
  q(2, '2.9', '2.B', 'What is the significance of judicial review in the American constitutional system?', 'Courts can invalidate government actions that conflict with the Constitution.', ['Courts can write the national budget without Congress.', 'Courts appoint all members of the executive branch.', 'Courts can remove any elected official without legal process.'], 'Judicial review allows courts to determine whether statutes or executive actions violate the Constitution.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(2, '2.10', '2.A', 'Why might the Supreme Court grant a writ of certiorari?', 'At least four justices may agree that a lower-court decision presents an important legal question for review.', ['The president requests that the Court approve an executive order.', 'A state legislature automatically sends every case to the Court.', 'The Court must review every trial before a verdict is entered.'], 'The rule of four allows four justices to grant certiorari, giving the Court discretion over most of its appellate docket.', { cognitiveProcess: 'explain' }),
  q(2, '2.11', '2.D', 'Which action by Congress is a constitutional check on the federal judiciary?', 'Congress can alter the jurisdiction of lower federal courts within constitutional limits.', ['Congress can order the Supreme Court to reach a particular outcome in a pending case.', 'Congress can remove a justice by passing an ordinary policy bill.', 'Congress can veto every judicial opinion after it is issued.'], 'Congress has authority over lower-court structure and jurisdiction within constitutional limits, but cannot direct a specific judicial result through ordinary legislation.', { cognitiveProcess: 'apply' }),
  q(2, '2.12', '1.A', 'What is a central function of the federal bureaucracy?', 'Implementing laws and administering programs created through the political process', ['Replacing elections with permanent agency appointments', 'Declaring war without authorization from any institution', 'Writing constitutional amendments without ratification'], 'Bureaucratic agencies translate statutes and executive priorities into rules, services, enforcement, and administration.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(2, '2.13', '1.E', 'Congress authorizes an agency to regulate workplace safety and allows it to define technical standards. What does this illustrate?', 'Delegated discretionary authority', ['A constitutional amendment ratified by state conventions', 'A presidential pardon of an agency employee', 'A judicial determination that no regulation is possible'], 'Congress may delegate authority to an agency, which then exercises discretion while implementing the statute within legal boundaries.', { cognitiveProcess: 'apply' }),
  q(2, '2.14', '3.C', 'Which action most directly helps Congress hold a federal agency accountable?', 'A committee conducts oversight hearings and requests agency records.', ['A political party changes its platform without contacting the agency.', 'A federal judge accepts a case unrelated to the agency’s action.', 'A state governor signs a local proclamation.'], 'Oversight hearings, document requests, appropriations, and legislative investigations are tools Congress uses to monitor administration.', { cognitiveProcess: 'identify' }),
  q(2, '2.15', '5.C', 'Why do policy advocates often work with Congress, executive agencies, and courts on the same issue?', 'Each branch has different formal and informal powers that can affect policy design, implementation, and review.', ['Only the courts can create any policy, so other branches are irrelevant.', 'The Constitution requires every advocate to use all three branches in sequence.', 'Branches have identical powers, so using multiple branches does not change strategy.'], 'Multiple institutions create distinct access points and leverage, so groups adapt their strategies to lawmaking, implementation, and litigation.', { cognitiveProcess: 'explain' }),
  q(2, '2.1', '1.C', 'Which Senate procedure allows extended debate to continue unless a supermajority votes to end it?', 'The filibuster', ['The pocket veto', 'The discharge petition', 'The line-item veto'], 'A filibuster can delay or block action by prolonging debate; cloture is the procedure used to end debate under Senate rules.', { cognitiveProcess: 'identify' }),
  q(2, '2.2', '1.B', 'Why are congressional committees important to the legislative process?', 'They divide work, develop expertise, hold hearings, and revise bills before floor consideration.', ['They replace the Constitution’s requirement that bills pass both chambers.', 'They allow courts to appoint committee chairs.', 'They prevent constituents from communicating with legislators.'], 'Committees organize the large volume of legislative work and provide venues for hearings, investigation, markup, and oversight.', { cognitiveProcess: 'explain' }),
  q(2, '2.3', '5.B', 'A representative supports a farm subsidy because it benefits a narrow district industry even though the policy has diffuse national costs. Which concept best explains the vote?', 'Constituency service and concentrated-interest incentives', ['Judicial activism', 'Executive privilege', 'Selective incorporation'], 'Members may respond to concentrated local benefits and organized constituents even when the broader costs are widely distributed.', { cognitiveProcess: 'apply' }),
  q(2, '2.4', '1.D', 'Which action most directly illustrates the president’s role as chief executive?', 'Directing executive agencies to implement a statute according to administration priorities', ['Presiding over a state legislative session', 'Writing the majority opinion in a Supreme Court case', 'Ratifying a constitutional amendment alone'], 'The president is chief executive and supervises the executive branch, subject to statutes, appropriations, and judicial review.', { cognitiveProcess: 'identify' }),
  q(2, '2.5', '2.D', 'Which presidential action requires the Senate’s advice and consent?', 'Nominating a federal judge who must be confirmed by the Senate', ['Issuing a pardon for a federal offense', 'Delivering a State of the Union address', 'Recognizing a foreign government diplomatically'], 'The Senate confirms federal judicial nominations; pardons, communication, and recognition are presidential powers that do not use this confirmation process.', { cognitiveProcess: 'identify' }),
  q(2, '2.6', '5.C', 'Why can a president’s unilateral action be limited even when the action is legally issued?', 'Congress can restrict funding or pass a contrary statute, and courts can review whether the action exceeds executive authority.', ['The president can never direct executive agencies without a new constitutional amendment.', 'Unilateral actions are automatically permanent once published.', 'Only state courts can review federal executive actions.'], 'Unilateral action operates within a separation-of-powers system; legal, fiscal, and political checks can reduce or reverse its effect.', { cognitiveProcess: 'explain' }),
  q(2, '2.7', '4.A', 'Which feature of a presidential speech would best help a student identify its persuasive strategy?', 'The values, audience, evidence, and policy frame used to connect the proposal to public concerns', ['The number of Supreme Court justices in the audience', 'The exact population of every congressional district', 'The private opinions of all agency employees'], 'Source analysis asks readers to identify argument, audience, evidence, and reasoning rather than merely repeat the speaker’s topic.', { cognitiveProcess: 'analyze', stimulus: 'A speech presents a policy proposal as necessary to protect both economic opportunity and public safety.' }),
  q(2, '2.8', '2.A', 'What is the primary constitutional route by which a federal judge joins the Supreme Court?', 'The president nominates the judge and the Senate provides advice and consent.', ['The House appoints the judge after a national referendum.', 'The chief justice selects a successor without political involvement.', 'State governors jointly elect the entire Court.'], 'Article II gives the president nomination power and the Senate advice-and-consent authority for federal judges.', { cognitiveProcess: 'identify' }),
  q(2, '2.9', '2.D', 'A court follows a prior holding when deciding a similar dispute. Which judicial principle is most directly illustrated?', 'Stare decisis', ['Federalism', 'Executive privilege', 'Popular sovereignty'], 'Stare decisis encourages courts to respect precedent, although courts may distinguish or overturn precedent in some circumstances.', { cognitiveProcess: 'identify' }),
  q(2, '2.10', '2.C', 'Two Supreme Court cases involve searches of physical homes and digital cell-phone data. What comparison would best show transfer of constitutional reasoning?', 'Compare how each case treats privacy expectations and the government’s justification for the search.', ['Compare only the names of the parties without examining the legal issue.', 'Assume the cases must have identical outcomes because both involve police.', 'Treat the later case as irrelevant because technology cannot affect constitutional interpretation.'], 'A strong case comparison identifies the facts and issue, then transfers the relevant constitutional principle to the new context.', { cognitiveProcess: 'compare' }),
  q(2, '2.11', '1.E', 'Which development can limit the practical effect of a Supreme Court decision without changing the written opinion?', 'Congress can change a statute or adjust funding in ways that affect implementation when constitutionally permitted.', ['A single state newspaper can overrule the holding.', 'The president can erase the opinion from the United States Reports.', 'A lower court can ignore the Supreme Court without consequence.'], 'The Court interprets law, but implementation also depends on legislation, funding, executive enforcement, and lower-court compliance.', { cognitiveProcess: 'apply' }),
  q(2, '2.12', '3.A', 'An agency’s annual report lists the number of inspections completed, violations found, and penalties collected. What is the best first step in analyzing the report?', 'Describe what each measure represents before drawing a conclusion about enforcement.', ['Assume the agency with the most inspections is always most effective.', 'Treat the number of penalties as proof that every violation was found.', 'Ignore the units and compare the numbers as if they measured the same thing.'], 'Data analysis begins by identifying what is measured and how the measures relate before making claims about performance.', { cognitiveProcess: 'analyze', stimulus: 'Agency A completed 1,000 inspections and found 80 violations; Agency B completed 400 inspections and found 60 violations.' }),
  q(2, '2.13', '3.D', 'An agency publishes a proposed rule, receives public comments, and revises the final rule. Which conclusion is best supported?', 'The notice-and-comment process provides an opportunity for affected interests to influence implementation details.', ['Public comments automatically require the agency to adopt the most common suggestion.', 'The process transfers all legislative power to private organizations.', 'The final rule cannot be challenged in court after publication.'], 'Notice and comment creates an input channel and record for rulemaking, but the agency remains responsible for the final legally authorized rule.', { cognitiveProcess: 'explain' }),
  q(2, '2.14', '5.D', 'Which response would most directly address an argument that bureaucratic oversight is unnecessary?', 'Oversight can identify implementation failures while preserving the agency’s specialized role in carrying out legislation.', ['Oversight is unnecessary because agencies are elected directly by all voters.', 'Oversight proves that agencies should never use technical expertise.', 'Oversight makes statutes and courts irrelevant to policy implementation.'], 'A strong rebuttal acknowledges administrative expertise while explaining why monitoring and accountability remain necessary.', { cognitiveProcess: 'argue' }),
  q(2, '2.15', '3.F', 'A graph shows that the number of stakeholders filing comments on a proposed rule rises sharply, but the final rule changes little. What limitation should a student note?', 'The graph shows participation, not whether comments were persuasive or caused particular changes.', ['The graph proves that every participant supported the final rule.', 'The graph proves the agency ignored all public input.', 'The graph cannot show any information about the rulemaking process.'], 'The visual supports a claim about participation volume, but not a causal claim about influence without additional evidence.', { cognitiveProcess: 'evaluate', stimulus: 'The graph reports the number of comments submitted during three rulemaking periods.' }),

  // Unit 3: 15 items, including at least one item for each current topic.
  q(3, '3.1', '1.D', 'What is the principal purpose of the Bill of Rights?', 'To enumerate protections for individual liberties and limit arbitrary government action', ['To establish the procedures for electing every state official', 'To give the president power to suspend the Constitution permanently', 'To replace the Constitution with ordinary congressional statutes'], 'The first ten amendments identify rights and freedoms that constrain government power.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(3, '3.2', '2.A', 'A public school requires students to participate in a government-written prayer. Which constitutional issue is most directly raised?', 'The Establishment Clause of the First Amendment', ['The Commerce Clause', 'The Takings Clause', 'The Appointments Clause'], 'Government-sponsored prayer raises the Establishment Clause concern that government may not establish or endorse religion.', { cognitiveProcess: 'apply' }),
  q(3, '3.3', '2.D', 'A student wears an armband to protest a policy, and the school bans it without evidence of substantial disruption. Which principle is most relevant?', 'Symbolic speech can receive First Amendment protection.', ['The First Amendment protects only spoken words in private homes.', 'Schools may punish any political viewpoint without constitutional limits.', 'The Fourteenth Amendment eliminates all school authority over student conduct.'], 'Symbolic conduct can communicate an idea and may be protected, although schools retain authority to address substantial disruption and related concerns.', { cognitiveProcess: 'apply' }),
  q(3, '3.4', '4.D', 'A newspaper publishes information about government conduct, and officials seek to stop publication before it occurs. Which constitutional concept is most directly implicated?', 'Prior restraint on the press', ['Double jeopardy', 'Equal protection', 'The right to bear arms'], 'Prior restraint occurs when government attempts to prevent publication in advance, a practice subject to a strong presumption against constitutionality.', { cognitiveProcess: 'identify', stimulus: 'A court is asked to block publication before the public can read the material.' }),
  q(3, '3.5', '2.A', 'Which constitutional interpretation did District of Columbia v. Heller support?', 'The Second Amendment protects an individual right to possess a firearm for lawful purposes such as self-defense in the home.', ['The Second Amendment applies only to state militias and protects no individual right.', 'The Second Amendment prevents every form of firearm regulation.', 'The Second Amendment applies only to voting in federal elections.'], 'Heller recognized an individual right connected to self-defense while also stating that the right is not unlimited.', { cognitiveProcess: 'explain' }),
  q(3, '3.6', '5.B', 'Why might a court uphold a search rule designed to protect public safety while still recognizing Fourth Amendment interests?', 'Constitutional analysis can balance individual rights against a sufficiently justified government interest under the facts of the case.', ['Public safety automatically eliminates every constitutional protection.', 'Individual rights are relevant only when no government interest exists.', 'The Fourth Amendment applies only to private businesses and not government actors.'], 'The unit’s liberty-and-order reasoning asks whether the government’s justification and method are constitutionally sufficient, not whether one value always defeats the other.', { cognitiveProcess: 'argue' }),
  q(3, '3.7', '2.B', 'What is selective incorporation?', 'The process by which the Supreme Court applies particular Bill of Rights protections to the states through the Fourteenth Amendment.', ['The process by which Congress selects which states may vote in federal elections.', 'The power of a state court to rewrite the Bill of Rights.', 'The rule that only federal officials must obey constitutional rights.'], 'Selective incorporation uses the Fourteenth Amendment’s due process protection to apply many, but not all at once, Bill of Rights guarantees to the states.', { cognitiveProcess: 'identify' }),
  q(3, '3.8', '2.A', 'Which protection is most directly associated with procedural due process for an accused person?', 'Notice of the accusation and a fair opportunity to be heard through lawful procedures', ['Automatic conviction whenever police make an arrest', 'A guarantee that every case will be decided by a legislature', 'Permission for officials to use evidence obtained through any search'], 'Procedural due process requires nonarbitrary procedures, including notice, a hearing, and other protections for the accused.', { cognitiveProcess: 'explain' }),
  q(3, '3.9', '2.B', 'Why is privacy often described as an unenumerated constitutional right?', 'The Constitution does not name a general right to privacy in one provision, but the Court has inferred protections from several constitutional guarantees.', ['Privacy is listed as the only right in the First Amendment.', 'Privacy exists only when Congress creates it by ordinary statute.', 'Privacy is a power reserved exclusively to state legislatures.'], 'The Court has reasoned that privacy interests can arise from the combined implications of specific guarantees and substantive due process.', { cognitiveProcess: 'explain' }),
  q(3, '3.10', '2.C', 'What constitutional principle was central to Brown v. Board of Education?', 'State-sponsored racial segregation in public schools violated the Equal Protection Clause of the Fourteenth Amendment.', ['States could segregate schools as long as they offered no public education.', 'The First Amendment required all schools to teach the same religion.', 'Congress could not pass any civil-rights legislation.'], 'Brown rejected school segregation as inconsistent with equal protection, overturning the separate-but-equal approach in public education.', { cognitiveProcess: 'identify' }),
  q(3, '3.11', '1.E', 'Which action is an example of the national government responding legislatively to a civil-rights movement?', 'Congress passes a law prohibiting discrimination in public accommodations and employment.', ['A court declines to hear a case because no legal issue exists.', 'A political party changes its logo without changing policy.', 'A state agency publishes a weather forecast.'], 'Civil-rights legislation uses national law to prohibit discriminatory practices and expand equal protection in public life.', { cognitiveProcess: 'apply' }),
  q(3, '3.12', '2.C', 'Why can majority rule be limited in a constitutional democracy?', 'Constitutional rights and judicial review can protect minority liberties from unconstitutional government action.', ['Majorities are never allowed to participate in elections.', 'Constitutional rights apply only to elected officials.', 'Courts must approve every private disagreement before it can occur.'], 'Constitutional democracy combines majority decision-making with limits that protect individual and minority rights.', { cognitiveProcess: 'explain' }),
  q(3, '3.13', '2.D', 'What constitutional question is central to debates over affirmative-action policies?', 'Whether a policy addressing disparities is consistent with the Equal Protection Clause’s limits on government classifications.', ['Whether Congress may coin money for state universities', 'Whether the president may appoint every local school principal', 'Whether the First Amendment bans all public education'], 'Affirmative-action litigation has focused on how government classifications and remedial goals fit within equal-protection doctrine.', { cognitiveProcess: 'explain' }),
  q(3, '3.3', '5.C', 'Which evidence would best support the claim that student speech restrictions should be limited?', 'Evidence that the expression was peaceful and did not materially disrupt instruction or threaten safety', ['Evidence that the student held a political opinion unpopular with administrators', 'Evidence that the school has a written dress code unrelated to disruption', 'Evidence that no one in the community has ever disagreed about speech'], 'The relevant evidence connects the expression to the constitutional interest and to the school’s claimed justification, especially disruption or safety.', { cognitiveProcess: 'argue' }),
  q(3, '3.10', '4.C', 'A civil-rights organization challenges a state law in court after lobbying the legislature fails. What does the strategy illustrate?', 'Social movements can use litigation as an additional pathway to seek equal protection.', ['Litigation is not a form of political participation because courts are outside government.', 'The organization has transferred all constitutional authority to private citizens.', 'The strategy proves that legislatures cannot address civil-rights issues.'], 'Civil-rights movements have used litigation, organizing, protest, and legislative advocacy together to influence policy and constitutional interpretation.', { cognitiveProcess: 'apply', stimulus: 'The organization first builds a factual record through affected plaintiffs and then asks a court to review the law.' }),

  // Unit 4: 12 items, including at least one item for each current topic.
  q(4, '4.1', '1.A', 'Which statement best describes political culture in the United States?', 'It includes widely held beliefs about individual rights, equality, civic participation, and the proper role of government.', ['It is identical to the platform of whichever party controls Congress.', 'It consists only of the formal text of the Constitution.', 'It changes every day because no political beliefs persist over time.'], 'Political culture refers to broad, durable beliefs and values that influence how people view government and politics.', { cognitiveProcess: 'define', difficulty: 'foundational' }),
  q(4, '4.2', '1.D', 'A teenager develops political attitudes through family discussions, school experiences, peers, and media. What process is illustrated?', 'Political socialization', ['Judicial review', 'Constitutional convention', 'Bureaucratic adjudication'], 'Political socialization is the process through which people acquire political beliefs and orientations from social environments and experiences.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(4, '4.3', '1.E', 'Why can a change in educational attainment or religious affiliation affect patterns of political ideology?', 'Social factors shape the experiences and groups through which people develop political attitudes.', ['Social factors cannot influence ideology because all opinions are genetically fixed.', 'Ideology changes only when the Supreme Court issues a new opinion.', 'Social factors eliminate the role of political events in shaping beliefs.'], 'Political ideology develops through social context, group identities, experiences, and information, not through a single fixed cause.', { cognitiveProcess: 'explain' }),
  q(4, '4.4', '4.B', 'How can a major national crisis influence political ideology?', 'It can change how citizens evaluate government responsibility, security, liberty, and policy priorities.', ['It automatically makes every citizen adopt the same ideology.', 'It prevents political parties from responding to public opinion.', 'It affects only local elections and never national policy debates.'], 'Major events can shift the salience of issues and alter judgments about government’s proper role without producing uniform views.', { cognitiveProcess: 'explain', stimulus: 'A survey conducted before and after a major crisis shows increased concern about national security and executive authority.' }),
  q(4, '4.5', '3.A', 'Which feature most improves the representativeness of a scientific public-opinion poll?', 'A probability sample that gives members of the target population a known chance of selection', ['A voluntary online poll promoted to the strongest supporters of one side', 'A sample made entirely of the pollster’s friends', 'A question asked only to people who already agree with the conclusion'], 'Probability sampling reduces selection bias by giving members of the target population a known chance of inclusion.', { cognitiveProcess: 'identify' }),
  q(4, '4.6', '3.E', 'A poll reports that 51 percent of respondents support a policy, with a margin of error of plus or minus 4 percentage points. Which conclusion is most defensible?', 'The population support could plausibly range from about 47 to 55 percent under the poll’s assumptions.', ['Exactly 51 percent of every citizen supports the policy.', 'The poll proves the policy will pass the legislature.', 'The margin of error means the poll included no sampling uncertainty.'], 'A margin of error identifies a range of plausible population estimates; it does not guarantee an electoral or legislative outcome.', { cognitiveProcess: 'interpret', stimulus: 'The poll uses a probability sample and reports a 95 percent confidence level.' }),
  q(4, '4.7', '1.E', 'Which statement reflects the broad ideological pattern identified in the current course framework?', 'Democratic platforms generally align more closely with liberal positions, while Republican platforms generally align more closely with conservative positions.', ['The two major parties have no ideological differences in any policy area.', 'Party platforms are written by the Supreme Court rather than political organizations.', 'Ideology is irrelevant to party policy debates.'], 'The framework describes broad tendencies while recognizing that party coalitions and platforms can change over time and vary by issue.', { cognitiveProcess: 'apply' }),
  q(4, '4.8', '5.C', 'A policymaker argues that a social issue should be addressed nationally rather than left entirely to states. Which evidence would best support the argument?', 'Evidence that national action would address a cross-state problem through a constitutional power and produce a consistent policy result.', ['A claim that every state has identical political preferences', 'A statement that ideology never influences public policy', 'A poll of one person with no explanation of the policy mechanism'], 'A strong policy argument connects the preferred level of government to the problem’s scope, constitutional authority, and expected consequences.', { cognitiveProcess: 'argue' }),
  q(4, '4.9', '3.D', 'Which institution primarily uses monetary policy to influence interest rates and broader economic conditions?', 'The Federal Reserve', ['The House Rules Committee', 'The Supreme Court', 'A state election board'], 'The Federal Reserve conducts monetary policy, while Congress and the president use fiscal policy through taxing and spending decisions.', { cognitiveProcess: 'identify' }),
  q(4, '4.10', '1.E', 'Which policy position is generally associated with a conservative ideology in the framework?', 'Leaving more responsibility for some social issues to state governments rather than expanding national involvement.', ['Requiring national government to manage every local program directly', 'Rejecting all limits on government power in every context', 'Abolishing state governments from the federal system'], 'The framework generally associates conservative ideology with less national involvement in some social issues and greater state responsibility.', { cognitiveProcess: 'apply' }),
  q(4, '4.5', '3.B', 'A poll’s support estimate rises from 42 percent to 48 percent across four weekly surveys using the same method. What pattern is shown?', 'A gradual upward trend in reported support over the period measured', ['A proof that every individual changed their opinion', 'A decline in support because the number is still below 50 percent', 'No pattern because public-opinion data cannot be compared over time'], 'The sequence shows an upward trend, although additional information is needed to explain why the change occurred.', { cognitiveProcess: 'describe', stimulus: 'Week 1: 42%; Week 2: 44%; Week 3: 46%; Week 4: 48%.' }),
  q(4, '4.6', '3.F', 'An advocacy group publishes an opt-in poll from its own website and claims it represents the entire electorate. What is the strongest limitation?', 'The self-selected sample may overrepresent people motivated to visit and respond to the group’s website.', ['The poll is automatically representative because it has many responses.', 'The poll cannot contain any useful information because all surveys are invalid.', 'The poll proves that respondents who declined to participate oppose the group.'], 'Opt-in samples can be systematically different from the broader population, so sample size alone does not establish representativeness.', { cognitiveProcess: 'evaluate' }),

  // Unit 5: 25 items, including at least one item for each current topic.
  q(5, '5.1', '1.D', 'Which constitutional amendment lowered the voting age to eighteen?', 'The Twenty-Sixth Amendment', ['The Seventeenth Amendment', 'The Nineteenth Amendment', 'The Twenty-Fourth Amendment'], 'The Twenty-Sixth Amendment expanded participation by lowering the voting age to eighteen.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(5, '5.2', '3.B', 'Which pattern is commonly associated with voter turnout in the United States?', 'Turnout is generally higher among older citizens than among younger citizens.', ['Turnout is always identical across age groups.', 'Young citizens vote at higher rates in every election than older citizens.', 'Turnout is determined only by the number of political parties.'], 'Age is one factor associated with turnout, although education, registration rules, election type, mobilization, and other conditions also matter.', { cognitiveProcess: 'describe' }),
  q(5, '5.3', '1.A', 'Which function do political parties perform in representative democracy?', 'They recruit candidates, organize voters, develop platforms, and help structure governing coalitions.', ['They replace the Constitution with private rules.', 'They prevent voters from comparing policy positions.', 'They serve only as temporary court-appointed agencies.'], 'Parties connect citizens and government by recruiting candidates, aggregating interests, mobilizing voters, and organizing institutions.', { cognitiveProcess: 'identify', difficulty: 'foundational' }),
  q(5, '5.4', '5.C', 'Why might a major political party change its platform after a significant shift in the electorate?', 'Adapting positions can help the party build a winning coalition and respond to changing public priorities.', ['Party platforms cannot change because they are constitutional documents.', 'Parties change platforms only when courts order them to do so.', 'A platform change eliminates the need for candidates or voters.'], 'Parties adapt to demographic change, issue salience, electoral incentives, and coalition-building pressures.', { cognitiveProcess: 'explain' }),
  q(5, '5.5', '1.E', 'Why do third-party candidates often face difficulty winning national office?', 'Single-member, plurality elections and ballot-access rules make it difficult to convert support into seats or electoral votes.', ['Third parties are prohibited from appearing on every ballot by the Constitution.', 'Third parties cannot raise any money under federal law.', 'Third parties automatically receive the same electoral votes as major parties.'], 'Electoral rules, ballot access, fundraising, debate access, and strategic voting create structural barriers for third parties.', { cognitiveProcess: 'explain' }),
  q(5, '5.6', '1.E', 'Which activity is a typical form of interest-group lobbying?', 'Providing policy information and communicating with lawmakers about proposed legislation.', ['Selecting the chief justice without presidential involvement', 'Counting every vote in a national election', 'Issuing a judicial opinion on behalf of a federal court'], 'Lobbying seeks to influence policymakers through information, relationships, testimony, and organized advocacy.', { cognitiveProcess: 'identify' }),
  q(5, '5.7', '5.B', 'Why can an interest group with a relatively small membership still influence policy?', 'It may have concentrated resources, specialized information, motivated members, or access to decision-makers.', ['Influence is determined only by the total number of people in the group.', 'Small groups are constitutionally barred from using courts or media.', 'A small group automatically controls every election in its state.'], 'Resources, expertise, intensity, organization, and access can matter in addition to membership size.', { cognitiveProcess: 'explain' }),
  q(5, '5.8', '1.C', 'What is the role of the Electoral College in selecting the president?', 'It formally allocates electoral votes to states and determines the winner under the constitutional process.', ['It directly writes the platforms of the major parties.', 'It selects members of the House according to national popular vote totals.', 'It allows the Supreme Court to choose the president in every election.'], 'The Electoral College uses state-based electoral votes to select the president, subject to constitutional and statutory rules.', { cognitiveProcess: 'identify' }),
  q(5, '5.9', '1.E', 'Why do incumbents often have an advantage in congressional elections?', 'They may benefit from name recognition, constituent service, fundraising networks, and a record of public visibility.', ['Incumbents cannot be challenged in primary elections.', 'Incumbents receive every vote from their party by constitutional requirement.', 'Incumbents are appointed rather than elected after their first term.'], 'Incumbency provides institutional and electoral resources, although it does not guarantee reelection.', { cognitiveProcess: 'explain' }),
  q(5, '5.10', '4.A', 'Which feature of modern campaigns most directly reflects professionalized election strategy?', 'Campaigns use consultants, targeted communication, fundraising operations, polling, and media planning.', ['Campaigns are conducted without parties, donors, or communication.', 'Campaigns require candidates to avoid all public appearances.', 'Campaigns are decided by courts before voters participate.'], 'Modern campaigns rely on specialized organizations and communication strategies, with benefits and costs for democratic participation.', { cognitiveProcess: 'identify' }),
  q(5, '5.11', '1.E', 'What is a central difference between a traditional political action committee and an independent-expenditure-only committee?', 'An independent-expenditure-only committee may spend independently of candidates but cannot coordinate expenditures with them.', ['A traditional PAC may never communicate with voters.', 'An independent-expenditure-only committee is part of the Supreme Court.', 'Both organizations are exempt from all disclosure and campaign-finance rules.'], 'The distinction concerns coordination and independent expenditures; campaign-finance rules and disclosure requirements can still apply.', { cognitiveProcess: 'compare' }),
  q(5, '5.12', '4.B', 'Which media function is illustrated when journalists investigate public officials and publish evidence of possible misconduct?', 'The watchdog function', ['The appointment function', 'The judicial review function', 'The treaty-ratification function'], 'The watchdog role involves monitoring public officials and institutions and informing citizens about possible misconduct or failures.', { cognitiveProcess: 'identify', stimulus: 'A news organization reviews public records, interviews witnesses, and publishes a documented investigation.' }),
  q(5, '5.13', '3.E', 'What is one possible democratic consequence of increasingly fragmented media choices?', 'Citizens may encounter more information but also more ideologically selective content and reinforcement of existing beliefs.', ['All citizens receive exactly the same news from one source.', 'Media fragmentation eliminates political participation.', 'More media choices guarantee that every claim is accurate.'], 'More choices can expand access while also encouraging selective exposure, partisan segmentation, and uneven political knowledge.', { cognitiveProcess: 'explain' }),
  q(5, '5.1', '1.D', 'Which voting model describes a voter who evaluates the incumbent’s recent record before deciding whether to reelect the incumbent?', 'Retrospective voting', ['Prospective voting', 'Straight-ticket voting', 'Elite appointment'], 'Retrospective voting looks backward at the recent performance of the party or candidate in power.', { cognitiveProcess: 'classify' }),
  q(5, '5.2', '1.E', 'Which change would most directly reduce a structural barrier to voting?', 'Making voter registration available through an accessible automatic or same-day process', ['Reducing the number of polling locations in high-population areas', 'Requiring voters to support a particular party before registration', 'Limiting voting information to campaign advertisements'], 'Registration rules, polling access, identification requirements, and election timing can create or reduce opportunities for participation.', { cognitiveProcess: 'apply' }),
  q(5, '5.3', '1.B', 'A party platform combines positions on taxes, education, foreign policy, and environmental regulation. What party function is illustrated?', 'Aggregating diverse interests into a broader policy program', ['Replacing the judicial branch with a party committee', 'Preventing any coalition from forming', 'Converting every voter into a party official'], 'Platforms aggregate and package policy positions so parties can present a governing program to voters and elected officials.', { cognitiveProcess: 'identify' }),
  q(5, '5.4', '3.C', 'A chart shows one party’s support declining among one age cohort while rising among another across several elections. What conclusion is best supported?', 'The party’s coalition changed across the measured cohorts, although the chart alone cannot identify the cause.', ['Every individual in the older cohort changed parties.', 'The party’s platform had no relationship to its support.', 'The chart proves that campaign spending caused the shift.'], 'The data show a cohort pattern, but causal explanations require additional evidence about issues, events, mobilization, and demographics.', { cognitiveProcess: 'interpret', stimulus: 'The chart reports party identification by age cohort across three election years.' }),
  q(5, '5.5', '5.C', 'A third-party candidate wins enough votes to deny either major candidate a plurality in a state. What possible effect is illustrated?', 'The candidate may act as a spoiler by changing which major candidate wins the state’s plurality.', ['The candidate automatically receives all electoral votes in every state.', 'The candidate eliminates the need for a general election.', 'The candidate proves that plurality rules favor every third party equally.'], 'In a plurality system, a third-party candidate can alter the distribution of votes enough to affect the major-party winner without winning the office.', { cognitiveProcess: 'apply' }),
  q(5, '5.6', '4.C', 'An interest group files an amicus brief in a Supreme Court case. What is the group attempting to do?', 'Present arguments or information that may influence the Court’s understanding of the legal and policy issues.', ['Replace the justices with elected interest-group representatives', 'Count ballots in the next congressional election', 'Write a constitutional amendment without ratification'], 'An amicus brief allows an organization to offer legal reasoning or relevant information to the Court without being one of the principal parties.', { cognitiveProcess: 'identify', stimulus: 'The brief explains how a proposed ruling could affect the group’s members and cites constitutional principles.' }),
  q(5, '5.7', '5.D', 'A coalition includes environmental groups, local businesses, and neighborhood organizations that disagree on some issues but support one policy. What does the coalition demonstrate?', 'Groups with different interests can coordinate when they identify a shared policy goal.', ['Interest groups must agree on every issue before they can act together.', 'Coalitions eliminate disagreement among citizens permanently.', 'Only political parties can organize a policy coalition.'], 'Coalition building lets groups pool resources and present broader support while retaining distinct interests on other issues.', { cognitiveProcess: 'explain' }),
  q(5, '5.8', '3.A', 'A state awards all of its electoral votes to the candidate who wins the statewide popular vote. What election rule is being described?', 'A winner-take-all allocation of electoral votes', ['Proportional representation in every state', 'A national popular vote with no state allocation', 'Selection by the Supreme Court’s annual docket'], 'Winner-take-all rules award the state’s electoral votes to the plurality winner, subject to state law and exceptions.', { cognitiveProcess: 'identify' }),
  q(5, '5.9', '3.B', 'A graph shows that incumbent House candidates win a higher percentage of contests than challengers across several election cycles. What pattern is shown?', 'An incumbency advantage in the measured elections', ['A guarantee that all incumbents will win future elections', 'Evidence that challengers cannot raise funds', 'A proof that voters never evaluate policy positions'], 'The graph supports a pattern of higher incumbent success, but it does not establish a permanent guarantee or explain every cause.', { cognitiveProcess: 'describe', stimulus: 'Incumbent success rates are 88%, 91%, and 89% across three cycles; challenger success rates are lower in each cycle.' }),
  q(5, '5.10', '5.A', 'Which claim is most defensible about professional campaign consultants?', 'They can improve a campaign’s communication and fundraising strategy, but their use can also increase costs and reduce candidate autonomy.', ['They guarantee that voters will support the candidate regardless of policy.', 'They make parties and interest groups irrelevant to elections.', 'They eliminate the need for candidates to communicate with citizens.'], 'A defensible claim recognizes both the strategic benefits and the institutional tradeoffs of professionalized campaigns.', { cognitiveProcess: 'argue' }),
  q(5, '5.11', '4.D', 'A political advertisement is funded by an organization that does not disclose its donors. Which source-analysis question is most important?', 'How the funding source and lack of disclosure may affect the advertisement’s perspective and credibility.', ['Whether the advertisement uses the same font as a judicial opinion', 'Whether the organization can appoint federal judges', 'Whether the ad automatically represents every voter’s opinion'], 'Source analysis considers authorship, funding, audience, purpose, evidence, and perspective when evaluating political communication.', { cognitiveProcess: 'analyze', stimulus: 'The advertisement presents a policy claim but identifies only the sponsoring organization, not its donors.' }),
  q(5, '5.12', '1.D', 'When a news organization repeatedly highlights one issue, what media effect may it have on political discussion?', 'Agenda setting by increasing the issue’s perceived importance among citizens and policymakers.', ['Judicial review by declaring the issue unconstitutional', 'Federalism by assigning the issue to state governments', 'Cloture by ending debate in the Senate'], 'Agenda setting concerns the media’s influence over which issues receive attention, not necessarily the direction of every opinion.', { cognitiveProcess: 'identify' }),
];

const depthItemSpecs = require('./ap_us_government_depth_specs.cjs')(q);
const transferItemSpecs = require('./ap_us_government_transfer_specs.cjs')(q);
const itemSpecs = baseItemSpecs.concat(depthItemSpecs, transferItemSpecs);
const expectedItemCountsByUnit = { 1: 45, 2: 75, 3: 43, 4: 34, 5: 63 };
assert(baseItemSpecs.length === 100, 'Expected 100 base item specifications, found ' + baseItemSpecs.length + '.');
assert(depthItemSpecs.length === 100, 'Expected 100 depth item specifications, found ' + depthItemSpecs.length + '.');
assert(transferItemSpecs.length === 60, 'Expected 60 transfer item specifications, found ' + transferItemSpecs.length + '.');
assert(itemSpecs.length === 260, 'Expected 260 item specifications, found ' + itemSpecs.length + '.');
const officialTopicIds = units.flatMap((unit) => unit.topics.map((topic) => topic.id));
const transferTopicCounts = transferItemSpecs.reduce((counts, item) => {
  counts[item.topicId] = (counts[item.topicId] || 0) + 1;
  return counts;
}, {});
assert(Object.keys(transferTopicCounts).length === officialTopicIds.length && officialTopicIds.every((topicId) => transferTopicCounts[topicId] === 1), 'Transfer layer must contain exactly one item for each current topic.');
for (const unit of units) {
  const unitCount = itemSpecs.filter((item) => item.unit === unit.number).length;
  assert(unitCount === expectedItemCountsByUnit[unit.number], 'Unit ' + unit.number + ' expected ' + expectedItemCountsByUnit[unit.number] + ' items, found ' + unitCount + '.');
  for (const topic of unit.topics) {
    assert(itemSpecs.filter((item) => item.unit === unit.number && item.topicId === topic.id).length >= 3, 'Topic ' + topic.id + ' needs at least three practice angles.');
  }
}

const FOUNDATION_ITEM_COUNT = baseItemSpecs.length;
const DEPTH_ITEM_COUNT = depthItemSpecs.length;
function practiceSliceForIndex(index) {
  if (index < FOUNDATION_ITEM_COUNT) return 'foundation-slice';
  if (index < FOUNDATION_ITEM_COUNT + DEPTH_ITEM_COUNT) return 'depth-slice';
  return 'transfer-slice';
}
function practiceAngleForIndex(index) {
  if (index < FOUNDATION_ITEM_COUNT) return 'foundation';
  if (index < FOUNDATION_ITEM_COUNT + DEPTH_ITEM_COUNT) return 'depth';
  return 'transfer';
}

const topicCatalog = units.flatMap((unit) => unit.topics.map((topic) => ({
  ...topic,
  unit: unit.number,
  domainId: unit.id,
  label: 'Topic ' + topic.id + ': ' + topic.label,
})));
const topicById = new Map(topicCatalog.map((topic) => [topic.id, topic]));
const unitByNumber = new Map(units.map((unit) => [unit.number, unit]));

function paragraph(text) {
  return { type: 'paragraph', text, runs: [{ type: 'text', text }] };
}

function labeledParagraph(label, text) {
  return {
    type: 'paragraph',
    text: label + text,
    runs: [{ type: 'strong', children: [{ type: 'text', text: label }] }, { type: 'text', text }],
  };
}

function bulletList(items, ordered = false) {
  return {
    type: 'list',
    ordered,
    items: items.map((text) => ({ text, runs: [{ type: 'text', text }] })),
  };
}

function tableBlock(headers, rows) {
  return {
    type: 'table',
    rows: [
      { cells: headers.map((text) => ({ kind: 'header', text, columnSpan: 1, runs: [{ type: 'text', text }] })) },
      ...rows.map((row) => ({ cells: row.map((text) => ({ kind: 'cell', text, columnSpan: 1, runs: [{ type: 'text', text }] })) })),
    ],
  };
}

const sectionThemes = [
  [
    ['Democratic ideals and models', 'Connect natural rights, popular sovereignty, social contract, and representative models to concrete institutions and civic choices.', ['natural rights', 'popular sovereignty', 'participatory democracy'], ['Do not treat every democratic model as direct voting on every decision.', 'Do not assume a stated ideal automatically describes every historical outcome.']],
    ['Constitutional design and ratification', 'Use the founding debates to compare Federalist and Anti-Federalist concerns and explain how compromise shaped the constitutional system.', ['Federalist No. 10', 'Brutus No. 1', 'Great Compromise'], ['Do not collapse Federalist and Anti-Federalist arguments into modern party labels.', 'Do not treat compromise as evidence that every conflict disappeared.']],
    ['Federalism and policy access', 'Trace how enumerated, reserved, concurrent, and implied powers create multiple venues for policymaking and dispute.', ['Supremacy Clause', 'Necessary and Proper Clause', 'conditional grants'], ['Do not treat federalism as a complete separation between national and state policy.', 'Do not infer that a funding condition makes a state agency a federal agency.']],
  ],
  [
    ['Congress and legislative behavior', 'Compare the House and Senate, then connect committees, parties, constituencies, and institutional rules to legislative outcomes.', ['bicameralism', 'committee system', 'filibuster'], ['Do not assume a roll-call vote reveals only one motivation.', 'Do not treat party membership as identical to agreement on every bill.']],
    ['Presidency and courts', 'Analyze formal powers, persuasion, judicial review, precedent, and the checks that shape executive and judicial action.', ['veto', 'executive order', 'judicial review'], ['Do not treat executive action as an unlimited substitute for legislation.', 'Do not treat judicial review as a power to administer the entire government.']],
    ['Bureaucracy and interbranch policy', 'Explain delegation, rulemaking, oversight, compliance, and the competing access points used by policy advocates.', ['delegation', 'notice and comment', 'congressional oversight'], ['Do not confuse agency expertise with independence from law.', 'Do not infer causation from participation counts alone.']],
  ],
  [
    ['Bill of Rights and religious liberty', 'Distinguish civil liberties from civil rights and apply the First Amendment to religion, speech, press, and related conflicts.', ['civil liberties', 'Establishment Clause', 'symbolic speech'], ['Do not assume a right has no limits in every context.', 'Do not confuse government restriction with private disagreement.']],
    ['Due process and individual security', 'Use selective incorporation, procedural due process, privacy, and liberty-order reasoning to evaluate government action.', ['selective incorporation', 'procedural due process', 'substantive due process'], ['Do not confuse procedural fairness with a guaranteed substantive outcome.', 'Do not treat every privacy interest as an explicitly enumerated right.']],
    ['Equal protection and movements', 'Connect social movements, legislation, litigation, and equal-protection doctrine to debates over majority rule and minority rights.', ['Equal Protection Clause', 'civil-rights legislation', 'affirmative action'], ['Do not treat a legal holding as the only form of movement participation.', 'Do not treat equality of protection as identical treatment in every policy context.']],
  ],
  [
    ['Political culture and socialization', 'Identify durable political values and explain how families, schools, peers, media, identities, and events shape attitudes.', ['political culture', 'political socialization', 'ideology'], ['Do not reduce a person’s political identity to one social influence.', 'Do not treat a broad cultural tendency as a prediction about every individual.']],
    ['Public opinion and data quality', 'Read polling data by checking sampling, question wording, margin of error, trends, and limitations before making a claim.', ['probability sample', 'margin of error', 'sampling bias'], ['Do not treat a poll as a forecast of a policy outcome.', 'Do not treat a large opt-in sample as automatically representative.']],
    ['Ideology and policymaking', 'Compare broad ideological tendencies while tracing how party coalitions and policy debates translate beliefs into government action.', ['liberal ideology', 'conservative ideology', 'fiscal policy'], ['Do not treat party platforms as unchanging or perfectly uniform.', 'Do not confuse fiscal policy with monetary policy.']],
  ],
  [
    ['Voting and participation', 'Connect constitutional amendments, turnout patterns, registration rules, and voting models to opportunities for participation.', ['voting rights', 'retrospective voting', 'voter turnout'], ['Do not infer motivation from turnout alone.', 'Do not confuse eligibility, registration, and voting as identical measures.']],
    ['Parties and interest groups', 'Explain how parties aggregate interests and how groups mobilize, lobby, litigate, and form coalitions to influence policy.', ['party platform', 'lobbying', 'coalition'], ['Do not assume membership size is the only source of influence.', 'Do not treat parties and interest groups as interchangeable institutions.']],
    ['Elections, campaigns, and media', 'Analyze electoral rules, incumbency, campaign finance, professional strategy, agenda setting, and fragmented media environments.', ['Electoral College', 'incumbency advantage', 'agenda setting'], ['Do not treat an election rule as a guarantee of a particular result.', 'Do not confuse media attention with proof that a claim is accurate.']],
  ],
];

function buildObjectiveCatalog() {
  return topicCatalog.map((topic, index) => {
    const sectionIndex = Math.min(2, Math.floor(index / Math.max(1, Math.ceil(unitByNumber.get(topic.unit).topics.length / 3))));
    const chapterId = 'ap-usg-ch-' + String(topic.unit).padStart(2, '0');
    return {
      id: 'ap-usg-lo-' + topic.id.replace('.', '-'),
      topicId: topic.id,
      domainId: topic.domainId,
      chapterId,
      sectionId: chapterId + '-section-' + String(sectionIndex + 1).padStart(2, '0'),
      sectionLabel: sectionThemes[topic.unit - 1][sectionIndex][0],
      label: 'Explain and apply ' + topic.label.toLowerCase() + ' in a constitutional, institutional, or civic context.',
      practiceIds: skills.map((skill) => skill.id),
      skillIds: skills.flatMap((skill) => skill.subskills),
      foundationalDocumentIds: foundationalDocumentCatalog.filter((document) => document.topicIds.includes(topic.id)).map((document) => document.id),
      nextStep: 'Review the linked unit section, explain the governing principle, and retry a targeted practice set using a new scenario.',
      status: 'internal-remediation-route',
      officialItem: false,
      releaseEligible: false,
      reviewStatus: 'internal-editorial-draft',
      references: [CED_URL, COURSE_URL, OPENSTAX_URL],
    };
  });
}

function buildItem(spec, index, objectiveCatalog) {
  const unit = unitByNumber.get(spec.unit);
  const topic = topicById.get(spec.topicId);
  const objective = objectiveCatalog.find((candidate) => candidate.topicId === spec.topicId);
  assert(unit && topic && objective, 'Missing route for item ' + (index + 1) + '.');
  const baseChoices = [spec.answer, ...spec.distractors];
  const answerIndex = index % 4;
  const choices = new Array(4);
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    choices[choiceIndex] = choiceIndex === answerIndex ? spec.answer : baseChoices[1 + distractorIndex++];
  }
  const choiceRationales = choices.map((choice) => choice === spec.answer
    ? spec.rationale
    : 'This choice is not the best answer because it does not match the constitutional principle, institutional process, or evidence identified in the question.');
  const practiceId = 'C' + spec.skillId.split('.')[0];
  const item = {
    id: 'ap-usg-u' + spec.unit + '-' + String(index + 1).padStart(3, '0'),
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    taskForm: 'single-choice-foundation',
    domainId: unit.id,
    topicIds: [spec.topicId],
    foundationalDocumentIds: foundationalDocumentCatalog.filter((document) => document.topicIds.includes(spec.topicId)).map((document) => document.id),
    practiceId,
    practiceIds: [practiceId],
    skillId: spec.skillId,
    skillIds: [spec.skillId],
    practiceSlice: practiceSliceForIndex(index),
    practiceAngle: practiceAngleForIndex(index),
    difficulty: spec.difficulty,
    cognitiveDemand: spec.skillId.startsWith('5.') ? 'argumentation' : spec.skillId.startsWith('3.') || spec.skillId.startsWith('4.') ? 'analysis' : 'application',
    cognitiveProcess: spec.cognitiveProcess,
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: spec.rationale,
    choiceRationales,
    references: [CED_URL, COURSE_URL, OPENSTAX_URL],
    sourceDetails: [
      {
        title: 'AP U.S. Government and Politics Course and Exam Description',
        organization: 'College Board',
        url: CED_URL,
        credibility: 'The public framework supplies the current topic and skill crosswalk. The question is independently authored and uses the CED for blueprint alignment only.',
      },
      {
        title: 'American Government 3e',
        organization: 'OpenStax, Rice University',
        url: OPENSTAX_URL,
        credibility: 'OpenStax is used for factual cross-checking and public reference links. No textbook prose, figure, or assessment content is reproduced.',
      },
    ],
    provenance: 'native-original',
    officialItem: false,
    rights: {
      secureContentUsed: false,
      copiedOfficialQuestion: false,
      sourceUse: 'public-blueprint-and-factual-sources-only',
      status: 'pending-independent-rights-review',
    },
    accessibility: {
      textOnly: true,
      essentialVisual: false,
      linearReadingOrder: true,
      handsFreeContentCompatible: true,
      status: 'pending-independent-accessibility-review',
    },
    expertReview: { status: 'pending', releaseBlocked: true },
    psychometricStatus: 'not-calibrated',
    reviewStatus: 'internal-editorial-draft',
    qaStatus: 'structure-ready-content-review-pending',
    releaseEligible: false,
    editorialChecks: {
      scenarioBased: true,
      singleBestAnswer: true,
      parallelPlausibleOptions: true,
      noKeywordGiveaway: true,
      completeOptionFeedback: true,
      ageAppropriate: true,
      nonpartisanFraming: true,
    },
    learningObjectiveId: objective.id,
    learningObjectiveLabel: objective.label,
    learningSectionId: objective.sectionId,
    learningSectionLabel: objective.sectionLabel,
    chapterIds: [objective.chapterId],
  };
  if (spec.stimulus) item.stimulus = spec.stimulus;
  return item;
}

function buildConstructedResponseWorkshops() {
  const workshops = [
    {
      id: 'ap-usg-workshop-concept-application',
      taskType: 'Concept application planning',
      title: 'Explain the constitutional mechanism before the conclusion',
      prompt: 'Plan a concise response to a new policy scenario. Identify the governing constitutional principle, apply the principle to the facts, and explain one limit on the conclusion. This is a planning exercise, not an official AP prompt or scored response.',
      stimulus: 'Original synthetic scenario: A state creates a public-safety grant for counties that adopt a shared emergency-alert system. The national government offers additional funds if counties meet accessibility and privacy standards. A county argues that the conditions interfere with state authority, while a civil-liberties organization argues that the standards are necessary to protect residents. The scenario is intentionally simplified so the planning focus stays on federalism, individual rights, and conditional spending.',
      taskParts: [
        'Name the constitutional or institutional principle that best organizes the dispute.',
        'Apply that principle to the grant condition and the competing state and individual interests.',
        'State one fact that would change or limit the strength of the conclusion.',
      ],
      planningFrame: [
        { label: 'Principle', guidance: 'Define the relevant power, right, or structural relationship in one sentence.' },
        { label: 'Evidence', guidance: 'Point to the grant condition, the county objection, and the public-safety rationale.' },
        { label: 'Reasoning', guidance: 'Explain why the principle supports or limits the government action rather than merely naming it.' },
        { label: 'Boundary', guidance: 'Identify a missing fact such as the statutory authority, condition scope, or privacy safeguard.' },
      ],
      successCriteria: [
        'The response names a precise principle instead of using a broad label alone.',
        'The application connects the principle to facts from the synthetic scenario.',
        'The reasoning distinguishes shared authority from complete state or national control.',
        'The limitation identifies evidence that could change the analysis.',
      ],
      commonPitfalls: [
        'Treating federalism as a complete wall between state and national policy.',
        'Assuming a funding condition is valid or invalid without examining its connection and scope.',
        'Listing a constitutional clause without explaining the mechanism it creates.',
        'Turning a planning response into a prediction of an official score or court outcome.',
      ],
      sampleOutline: [
        'Claim: shared authority can permit a connected condition while rights protections constrain implementation.',
        'Application: connect the funding terms, state objection, and privacy safeguards to the principle.',
        'Limit: explain which missing legal or factual detail would require a narrower conclusion.',
      ],
      unitIds: [1, 3],
      topicIds: ['1.7', '1.9', '3.6'],
    },
    {
      id: 'ap-usg-workshop-data-analysis',
      taskType: 'Quantitative analysis planning',
      title: 'Describe a political data pattern without overclaiming',
      prompt: 'Plan a response to a small original data display. Describe the pattern, compare the groups or time points, and explain what the display cannot establish. Keep the claim proportional to the evidence and do not treat the exercise as a scored quantitative-analysis response.',
      stimulus: 'Original synthetic data display: In a statewide survey, support for a proposed transit measure is 61 percent among respondents who report voting in every recent election, 48 percent among occasional voters, and 42 percent among people who report not voting recently. The sample reports a margin of error of plus or minus 3 percentage points. The survey is observational and does not measure whether voting caused the difference in support.',
      taskParts: [
        'State one pattern or comparison directly supported by the displayed percentages.',
        'Use the margin of error and the survey design to qualify the comparison.',
        'Explain one conclusion the display cannot establish and identify evidence that would help.',
      ],
      planningFrame: [
        { label: 'Read', guidance: 'Identify the variables, groups, units, and comparison the display actually provides.' },
        { label: 'Compare', guidance: 'Describe the direction and size of the observed difference without inventing a cause.' },
        { label: 'Uncertainty', guidance: 'Use the stated margin of error as sampling context, not as a guarantee that all error is removed.' },
        { label: 'Limit', guidance: 'Separate association from causation and name a possible confounding factor or measurement concern.' },
      ],
      successCriteria: [
        'The response uses the displayed values accurately and keeps the comparison in context.',
        'The margin of error is described as sampling uncertainty rather than proof of a result.',
        'The response distinguishes a relationship in survey data from a causal explanation.',
        'The limitation is specific enough to guide a follow-up study or source check.',
      ],
      commonPitfalls: [
        'Claiming that voting behavior caused the difference in policy support.',
        'Treating the margin of error as a measure of every possible source of bias.',
        'Using the survey to describe every citizen when the population and sampling frame are unspecified.',
        'Reporting percentages without naming the comparison or the direction of the pattern.',
      ],
      sampleOutline: [
        'Pattern: frequent voters show higher reported support than occasional or nonrecent voters in this sample.',
        'Qualification: the margin of error and observational design limit what the comparison can show.',
        'Limit: information about sampling, question wording, demographics, or a longitudinal design would support a stronger explanation.',
      ],
      unitIds: [4, 5],
      topicIds: ['4.5', '4.6', '5.2'],
    },
    {
      id: 'ap-usg-workshop-case-comparison',
      taskType: 'Case-comparison planning',
      title: 'Compare constitutional reasoning across two synthetic cases',
      prompt: 'Plan a comparison of two original case summaries. Identify the constitutional question, explain one meaningful similarity or difference in the reasoning, and connect the comparison to a broader liberty-and-order conflict. The cases are synthetic and are not substitutes for required case study or expert review.',
      stimulus: 'Original synthetic case summaries: Case A concerns a city rule requiring a permit for large demonstrations, with objective limits on time and location and several alternative public spaces. Case B concerns a rule that denies permits only to demonstrations criticizing the mayor. In both cases the city cites traffic and safety, but the second rule uses the message of the demonstration as part of the decision.',
      taskParts: [
        'State the shared constitutional issue raised by both case summaries.',
        'Explain one legally meaningful difference in the government action or standard.',
        'Use the comparison to make a broader claim about liberty, order, or viewpoint neutrality.',
      ],
      planningFrame: [
        { label: 'Issue', guidance: 'Identify the right or constitutional principle common to both cases.' },
        { label: 'Fact', guidance: 'Select the fact that changes the legal or political significance of the two rules.' },
        { label: 'Comparison', guidance: 'Explain the consequence of the difference instead of merely saying the cases are different.' },
        { label: 'Transfer', guidance: 'State how the comparison helps analyze a new public-order dispute.' },
      ],
      successCriteria: [
        'The comparison is based on a material fact, such as content neutrality or official discretion.',
        'The response explains why the fact matters to the constitutional analysis.',
        'The broader claim recognizes that public safety does not erase individual rights.',
        'The response avoids inventing holdings, quotations, or official case names.',
      ],
      commonPitfalls: [
        'Treating any permit requirement as automatically unconstitutional.',
        'Ignoring the difference between a neutral time-place rule and viewpoint discrimination.',
        'Summarizing both cases without explaining the consequence of the comparison.',
        'Presenting a synthetic case as if it were an official Supreme Court decision.',
      ],
      sampleOutline: [
        'Shared issue: government regulation of public expression must be evaluated against speech protections.',
        'Key difference: Case A uses neutral criteria and alternatives, while Case B selects messages for adverse treatment.',
        'Broader claim: order-based regulation is stronger when it controls effects rather than viewpoints.',
      ],
      unitIds: [2, 3],
      topicIds: ['3.3', '3.6', '2.15'],
    },
    {
      id: 'ap-usg-workshop-source-analysis',
      taskType: 'Foundational-document source planning',
      title: 'Build a source-based claim from synthetic civic texts',
      prompt: 'Plan a source-based response using two short, original civic texts. Identify each author\'s claim and audience, connect the texts to a constitutional or democratic principle, and explain one limitation of using the texts as evidence. No official document language is reproduced in this workshop.',
      stimulus: 'Original synthetic source set: Source A is a town-meeting statement arguing that public officials should remain close to local voters and that distant institutions may overlook community needs. Source B is a legislative memorandum arguing that divided institutions and an extended republic can prevent a temporary majority from controlling every decision. Both sources support representative government but emphasize different risks: distance from the people and concentration of power.',
      taskParts: [
        'Identify the central claim and likely audience of each synthetic source.',
        'Explain how the sources reflect competing concerns about representation, liberty, or institutional design.',
        'State one limitation of the sources as evidence and describe what additional evidence would help.',
      ],
      planningFrame: [
        { label: 'Author', guidance: 'Infer the speaker or institutional position from the text description, not from an assumed historical identity.' },
        { label: 'Claim', guidance: 'State what each source wants the reader to believe about democratic design.' },
        { label: 'Connection', guidance: 'Link the claims to a principle such as popular sovereignty, faction control, or representation.' },
        { label: 'Limit', guidance: 'Consider audience, purpose, missing voices, or the gap between institutional design and practice.' },
      ],
      successCriteria: [
        'The response distinguishes source claim, audience, and purpose.',
        'The comparison identifies a real tension rather than forcing the sources into agreement.',
        'The constitutional connection is explained with a mechanism and not just a vocabulary label.',
        'The limitation names missing context or perspective and proposes useful additional evidence.',
      ],
      commonPitfalls: [
        'Treating a source summary as proof of every fact about the historical period.',
        'Assuming that two sources about democracy must have identical priorities.',
        'Naming a foundational principle without connecting it to the source claim.',
        'Using outside facts that overwhelm rather than clarify the source analysis.',
      ],
      sampleOutline: [
        'Source A emphasizes local accountability and warns that distance can weaken representation.',
        'Source B emphasizes institutional checks and warns that concentrated majorities can threaten liberty.',
        'Synthesis: both value self-government but propose different safeguards, so audience and purpose shape the argument.',
      ],
      unitIds: [1],
      topicIds: ['1.1', '1.3', '1.5'],
    },
    {
      id: 'ap-usg-workshop-argumentation',
      taskType: 'Argumentation planning',
      title: 'Make a qualified policy claim with evidence and a counterpoint',
      prompt: 'Plan an argument about whether a proposed participation reform would broaden democratic access. Develop a defensible claim, select evidence from the synthetic record, explain the mechanism connecting evidence to the claim, and address a plausible counterpoint. The workshop does not score argument essays or predict AP results.',
      stimulus: 'Original synthetic policy record: A state proposes automatic voter registration at eligible-agency visits, expands early voting, and requires public reporting about wait times. Supporters argue that the reforms reduce administrative barriers. Critics argue that access changes alone cannot solve unequal information, work schedules, transportation, or trust in institutions. A pilot report shows registration increased, but turnout changed unevenly across counties.',
      taskParts: [
        'Write a qualified claim about the extent to which the reform could broaden participation.',
        'Select two pieces of evidence and explain the mechanism connecting each to the claim.',
        'Address the strongest counterpoint and state what additional evidence would resolve the disagreement.',
      ],
      planningFrame: [
        { label: 'Claim', guidance: 'Answer the extent question with a position that allows for benefits and limits.' },
        { label: 'Evidence', guidance: 'Use the registration result, turnout variation, and policy details as distinct evidence.' },
        { label: 'Mechanism', guidance: 'Explain how an administrative change could affect opportunity without guaranteeing participation.' },
        { label: 'Counterpoint', guidance: 'Recognize barriers the reform does not address and explain how they qualify the claim.' },
      ],
      successCriteria: [
        'The claim is defensible and qualified rather than absolute.',
        'Evidence is specific to the synthetic record and followed by reasoning.',
        'The response distinguishes registration, access, and turnout as different outcomes.',
        'The counterpoint changes the scope of the claim instead of appearing as an unrelated fact.',
      ],
      commonPitfalls: [
        'Claiming that easier registration automatically produces equal turnout.',
        'Using the pilot result without noting differences across counties.',
        'Listing multiple reforms without explaining how each could affect participation.',
        'Treating a counterpoint as something to dismiss rather than a limit to address.',
      ],
      sampleOutline: [
        'Claim: access reforms can broaden opportunity, but their participation effect depends on implementation and remaining barriers.',
        'Evidence and mechanism: registration and early voting reduce administrative friction, while reporting identifies unequal implementation.',
        'Qualification: uneven turnout and nonadministrative barriers require complementary outreach and further evaluation.',
      ],
      unitIds: [4, 5],
      topicIds: ['5.1', '5.2', '4.8'],
    },
  ];

  return workshops.map((workshop) => ({
    ...workshop,
    foundationalDocumentIds: [...new Set(workshop.topicIds.flatMap((topicId) => foundationalDocumentCatalog.filter((document) => document.topicIds.includes(topicId)).map((document) => document.id)))],
    type: 'unscored-planning-workshop',
    references: [CED_URL, COURSE_URL],
    unscored: true,
    automatedScoring: false,
    scorePrediction: false,
    officialItem: false,
    syntheticStimulus: true,
    expertReviewStatus: 'pending',
    releaseEligible: false,
    rights: {
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedOfficialPrompt: false,
      copiedOfficialRubric: false,
      originalStimulus: true,
    },
    accessibility: {
      stimulusFormat: 'plain text',
      essentialVisualContent: false,
      readingOrder: 'linear',
      independentReviewStatus: 'pending',
    },
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original synthetic planning workshop; not an official College Board prompt, rubric, score, or prediction. Independent AP U.S. Government subject-expert and accessibility review remain pending.',
  }));
}

function buildFoundationalDocumentRoutes(chapters, workshops) {
  const sectionRecords = chapters.flatMap((chapter) => chapter.sections || []);
  return foundationalDocumentCatalog.map((document) => {
    const routedCandidates = itemSpecs.flatMap((spec, index) => document.topicIds.includes(spec.topicId) ? [{
      id: 'ap-usg-u' + spec.unit + '-' + String(index + 1).padStart(3, '0'),
      topicId: spec.topicId,
      practiceSlice: practiceSliceForIndex(index),
    }] : []);
    const itemIds = routedCandidates.map((candidate) => candidate.id);
    const foundationItemIds = routedCandidates.filter((candidate) => candidate.practiceSlice === 'foundation-slice').map((candidate) => candidate.id);
    const depthItemIds = routedCandidates.filter((candidate) => candidate.practiceSlice === 'depth-slice').map((candidate) => candidate.id);
    const transferItemIds = routedCandidates.filter((candidate) => candidate.practiceSlice === 'transfer-slice').map((candidate) => candidate.id);
    const sectionIds = sectionRecords
      .filter((section) => (section.topicCoverage || []).some((topicId) => document.topicIds.includes(topicId)))
      .map((section) => section.id);
    const chapterIds = [...new Set(sectionIds.map((sectionId) => sectionId.split('-section-')[0]))];
    const workshopIds = workshops
      .filter((workshop) => (workshop.foundationalDocumentIds || []).includes(document.id))
      .map((workshop) => workshop.id);
    return {
      id: 'ap-usg-document-route-' + document.id,
      documentId: document.id,
      title: document.title,
      academicYearReference: document.requiredForAcademicYear,
      unitNumbers: document.unitNumbers,
      topicIds: document.topicIds,
      bigIdeaIds: document.bigIdeaIds,
      skillIds: document.skillIds,
      chapterIds,
      sectionIds,
      workshopIds,
      itemIds,
      foundationItemIds,
      depthItemIds,
      transferItemIds,
      itemCount: itemIds.length,
      practiceSliceCounts: {
        'foundation-slice': foundationItemIds.length,
        'depth-slice': depthItemIds.length,
        'transfer-slice': transferItemIds.length,
      },
      studyMove: 'Use the document title as a retrieval cue: identify the constitutional principle or argument, connect it to the linked topics, and qualify the conclusion using the source purpose and context.',
      accessNote: 'This route contains public requirement metadata and original practice links only; it does not reproduce official document text, excerpts, prompts, or rubrics.',
      references: [CED_URL, COURSE_URL, CLARIFICATIONS_URL],
      sourceUse: document.sourceUse,
      officialItem: false,
      reproducedText: false,
      releaseEligible: false,
      reviewStatus: 'source-reviewed-editorial-pass',
      independentExpertReviewStatus: 'pending',
    };
  });
}

function buildLibrary(objectiveCatalog) {
  const chapters = units.map((unit, unitIndex) => {
    const chapterId = 'ap-usg-ch-' + String(unit.number).padStart(2, '0');
    const sectionSeeds = sectionThemes[unitIndex];
    const sections = sectionSeeds.map((seed, sectionIndex) => {
      const topicIds = unit.topics
        .slice(Math.floor(sectionIndex * unit.topics.length / 3), Math.floor((sectionIndex + 1) * unit.topics.length / 3) || unit.topics.length)
        .map((topic) => topic.id);
      const practiceCandidates = itemSpecs
        .map((spec, itemIndex) => ({
          id: 'ap-usg-u' + spec.unit + '-' + String(itemIndex + 1).padStart(3, '0'),
          topicId: spec.topicId,
          practiceSlice: practiceSliceForIndex(itemIndex),
        }))
        .filter((candidate) => topicIds.includes(candidate.topicId));
      const sectionPracticeItems = practiceCandidates.filter((candidate) => topicIds.includes(candidate.topicId));
      const practiceTopicCounts = topicIds.reduce((counts, topicId) => {
        counts[topicId] = sectionPracticeItems.filter((candidate) => candidate.topicId === topicId).length;
        return counts;
      }, {});
      const topicItemIds = topicIds.reduce((map, topicId) => {
        map[topicId] = sectionPracticeItems.filter((candidate) => candidate.topicId === topicId).map((candidate) => candidate.id);
        return map;
      }, {});
      const practiceRoute = {
        itemIds: sectionPracticeItems.map((candidate) => candidate.id),
        foundationItemIds: sectionPracticeItems.filter((candidate) => candidate.practiceSlice === 'foundation-slice').map((candidate) => candidate.id),
        depthItemIds: sectionPracticeItems.filter((candidate) => candidate.practiceSlice === 'depth-slice').map((candidate) => candidate.id),
        transferItemIds: sectionPracticeItems.filter((candidate) => candidate.practiceSlice === 'transfer-slice').map((candidate) => candidate.id),
        topicCounts: practiceTopicCounts,
        topicItemIds,
        itemCount: sectionPracticeItems.length,
        foundationItemCount: sectionPracticeItems.filter((candidate) => candidate.practiceSlice === 'foundation-slice').length,
        depthItemCount: sectionPracticeItems.filter((candidate) => candidate.practiceSlice === 'depth-slice').length,
        transferItemCount: sectionPracticeItems.filter((candidate) => candidate.practiceSlice === 'transfer-slice').length,
        studyMove: 'Complete one foundation item, explain the mechanism in your own words, then use a depth item and a transfer item to apply the reasoning in new contexts.',
      };
      const focus = seed[1];
      const terms = seed[2];
      const boundaries = seed[3];
      const examples = [
        'Start with the institution, constitutional principle, or civic behavior named in the prompt.',
        'Connect the concept to a concrete policy, case, source, or participation scenario.',
      ];
      const retrieval = [
        'What political principle or institution is doing the work in this example?',
        'What evidence would distinguish this explanation from a nearby concept?',
        'Which limitation keeps the claim from becoming broader than the evidence?',
      ];
      const contentBlocks = [
        paragraph(focus + ' ' + unit.summary),
        labeledParagraph('Reasoning move. ', 'Name the concept, identify the relevant constitutional or institutional mechanism, and then explain the consequence.'),
        bulletList(examples),
        labeledParagraph('Boundaries. ', 'Use these checks to avoid overgeneralizing:'),
        bulletList(boundaries),
        labeledParagraph('Worked comparison. ', 'Compare the policy or institution with the closest alternative before selecting an answer.'),
        tableBlock(['Question lens', 'Useful check'], [
          ['Concept', 'What principle, institution, process, policy, or behavior is present?'],
          ['Evidence', 'What does the source, case, data, or scenario actually establish?'],
          ['Transfer', 'How would the same reasoning apply in a different context?'],
        ]),
        labeledParagraph('Retrieval practice. ', 'Answer each prompt before opening the related item bank.'),
        bulletList(retrieval, true),
      ];
      return {
        id: chapterId + '-section-' + String(sectionIndex + 1).padStart(2, '0'),
        heading: seed[0],
        content: focus,
        keyTerms: terms,
        topicCoverage: topicIds,
        practiceRoute,
        references: [CED_URL, COURSE_URL, OPENSTAX_URL],
        contentBlocks,
        examples,
        nonExamples: boundaries,
        commonMisconceptions: ['A concept label is not a complete explanation; identify the mechanism and the evidence before generalizing.'],
        workedDataExample: {
          headers: ['Question lens', 'Useful check'],
          rows: [
            ['Concept', 'Name the principle or institution before choosing a conclusion.'],
            ['Evidence', 'Separate what the evidence shows from what it does not show.'],
            ['Transfer', 'Apply the reasoning to a new scenario without importing irrelevant facts.'],
          ],
        },
        retrievalPrompts: retrieval,
        transferMove: 'Transfer the concept to a new policy, institution, source, data display, or civic behavior while preserving the same reasoning step.',
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewNote: 'Original AP U.S. Government foundation lesson shell; independent subject-expert, accessibility, rights, production, and psychometric review remain pending.',
        expertReviewStatus: 'pending',
        accessibilityReviewStatus: 'pending-independent-review',
        contentComplete: true,
        releaseEligible: false,
        contentEnhancementVersion: 'ap-usg-foundation-v8',
      };
    });
    const chapterObjective = objectiveCatalog.find((objective) => objective.domainId === unit.id);
    const knowledgeChecks = sections.map((section, sectionIndex) => ({
      id: section.id + '-check',
      chapterId,
      sectionId: section.id,
      type: 'single-choice',
      prompt: 'Which study move best supports accurate reasoning in ' + unit.shortLabel + '?',
      choices: [
        'Identify the governing concept, connect it to evidence, and state the limit of the conclusion.',
        'Choose the longest option because length guarantees constitutional accuracy.',
        'Treat every political claim as equally supported without checking the evidence.',
        'Memorize a label without identifying the institution or process involved.',
      ],
      answerIndex: 0,
      rationale: 'AP U.S. Government reasoning improves when the learner names the concept, links it to evidence, and avoids claims broader than the evidence.',
      references: [CED_URL, COURSE_URL, OPENSTAX_URL],
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original retrieval check; independent subject-expert and psychometric review remain pending.',
      skillId: chapterObjective ? chapterObjective.skillIds[sectionIndex % chapterObjective.skillIds.length] : '1.A',
    }));
    return {
      id: chapterId,
      title: unit.label,
      domainId: unit.id,
      domain: unit.shortLabel,
      summary: unit.summary,
      objectives: ['Explain the major concepts, institutions, processes, and analytical skills in ' + unit.shortLabel + '.'],
      topicCoverage: unit.topics.map((topic) => topic.id),
      chapterTakeaways: [
        'Start with the constitutional or institutional mechanism before naming the outcome.',
        'Use the evidence type requested by the task: concept, case, source, data, or argument.',
        'Keep the scope of the conclusion aligned with the evidence and acknowledge relevant limits.',
      ],
      references: [CED_URL, COURSE_URL, OPENSTAX_URL],
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original AP U.S. Government foundation chapter shell; independent review remains pending.',
      expertReviewStatus: 'pending',
      accessibilityReviewStatus: 'pending-independent-review',
      releaseEligible: false,
      sectionCount: sections.length,
      knowledgeCheckCount: knowledgeChecks.length,
      referenceCount: 3,
      sections,
      knowledgeChecks,
      contentComplete: true,
      foundationPrototype: true,
    };
  });

  const flashcards = chapters.flatMap((chapter) => chapter.sections.map((section) => ({
    id: section.id + '-card',
    chapterId: chapter.id,
    sectionId: section.id,
    domainId: chapter.domainId,
    domain: chapter.domain,
    front: section.heading + ': what is the core reasoning move?',
    back: section.content,
    tags: section.keyTerms,
    references: section.references,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original foundation study card; independent AP U.S. Government subject-expert validation remains pending.',
  })));

  const memoryAids = chapters.map((chapter) => ({
    id: chapter.id + '-memory',
    chapterId: chapter.id,
    type: 'reasoning cue',
    title: chapter.domain + ': mechanism to evidence',
    content: 'Name the institution or principle, identify the mechanism, connect it to the evidence, and state the limit of the conclusion.',
    tags: chapter.sections.flatMap((section) => section.keyTerms).slice(0, 6),
    domain: chapter.domain,
    references: chapter.references,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original foundation retrieval aid; AP U.S. Government and accessibility validation remain pending.',
  }));
  const constructedResponseWorkshops = buildConstructedResponseWorkshops();
  const foundationalDocumentRoutes = buildFoundationalDocumentRoutes(chapters, constructedResponseWorkshops);
  const practiceRoutes = chapters.flatMap((chapter) => chapter.sections.map((section) => section.practiceRoute));
  const routedItemIds = practiceRoutes.flatMap((route) => route.itemIds);
  const practiceRouting = {
    mode: 'section-linked-item-routes',
    sectionCount: practiceRoutes.length,
    itemCount: routedItemIds.length,
    uniqueItemCount: new Set(routedItemIds).size,
    foundationItemCount: practiceRoutes.reduce((sum, route) => sum + route.foundationItemCount, 0),
    depthItemCount: practiceRoutes.reduce((sum, route) => sum + route.depthItemCount, 0),
    transferItemCount: practiceRoutes.reduce((sum, route) => sum + route.transferItemCount, 0),
    sectionsWithDepth: practiceRoutes.filter((route) => route.depthItemCount > 0).length,
    sectionsWithTransfer: practiceRoutes.filter((route) => route.transferItemCount > 0).length,
    topicDrillMapCount: practiceRoutes.reduce((sum, route) => sum + Object.keys(route.topicItemIds).length, 0),
  };

  return {
    schemaVersion: 1,
    librarySchemaVersion: 1,
    libraryId: PACK_ID + '-learning-library',
    packId: PACK_ID,
    version: VERSION,
    title: 'AP U.S. Government and Politics Foundation Pilot Learning Library',
    description: 'A text-first, independently authored AP U.S. Government and Politics foundation library with five unit chapters, structured lessons, item-linked study routes, thirteen foundational-document study routes, retrieval checks, study cards, reasoning aids, and five explicitly unscored response-planning workshops. It is not released, official, calibrated, or score-predictive.',
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    blueprint: {
      academicYearReference: '2026-27',
      cedEffectiveLabel: 'Fall 2026',
      cedFrameworkVersion: 'V.1',
      officialBlueprintUrl: CED_URL,
      officialCourseUrl: COURSE_URL,
      foundationalDocumentCatalogVersion: LIBRARY_VERSION,
      foundationalDocumentCatalog,
      foundationalDocumentRouteVersion: LIBRARY_VERSION,
      foundationalDocumentRouteCount: foundationalDocumentRoutes.length,
      foundationalDocumentRoutes,
      pilotVersion: LIBRARY_VERSION,
      pilotNote: 'A 260-item foundation across all five units and all 60 current public framework topic IDs, with at least three practice angles per topic, a thirteen-document foundational-document crosswalk with deterministic study routes, item-linked study routes for all fifteen lesson sections, topic-level drill maps, and five explicitly unscored response-planning workshops. It is a study and architecture foundation, not a complete exam simulation.',
      bigIdeas,
      skills,
      learningObjectiveCatalogVersion: LIBRARY_VERSION,
      learningObjectiveCatalog: objectiveCatalog,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
    },
    reviewStandard: 'Independent source and editorial review against the public AP U.S. Government and Politics Course and Exam Description and openly available factual references. Independent subject-expert, accessibility, rights, production, field-testing, and psychometric review remain required.',
    disclaimer: 'Independent, unofficial AP U.S. Government and Politics preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. AP and Advanced Placement are trademarks of College Board. No secure AP Classroom, Question Bank, Progress Check, official question, official rubric, or official source-set stimulus was used or reproduced. This pilot does not provide official scores, score predictions, college-credit predictions, or a substitute for civics instruction.',
    sourceCatalog,
    foundationalDocumentCatalog,
    foundationalDocumentRoutes,
    workshopLabel: 'Unscored AP Government response-planning workshops',
    workshopPracticeNote: 'These explicitly unscored workshops use original synthetic scenarios, data, and source descriptions for planning and self-check. AlloFlow does not score written responses, apply an official College Board rubric, estimate an AP score, or predict credit or placement.',
    chapters,
    practiceRouting,
    diagrams: [],
    diagramPlacements: [],
    flashcards,
    memoryAids,
    constructedResponseWorkshops,
    summary: {
      chapters: chapters.length,
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeChecks.length, 0),
      flashcards: flashcards.length,
      memoryAids: memoryAids.length,
      diagrams: 0,
      diagramPlacements: 0,
      constructedResponseWorkshops: constructedResponseWorkshops.length,
      foundationalDocuments: foundationalDocumentCatalog.length,
      foundationalDocumentRoutes: foundationalDocumentRoutes.length,
      richLessonPrototypes: chapters.length,
      sourceReviewedChapters: chapters.length,
      sourceReviewedFlashcards: flashcards.length,
      sourceReviewedMemoryAids: memoryAids.length,
      sourceReviewedConstructedResponseWorkshops: constructedResponseWorkshops.length,
      sourceReviewedFoundationalDocuments: foundationalDocumentCatalog.length,
      sourceReviewedFoundationalDocumentRoutes: foundationalDocumentRoutes.length,
      releaseEligibleRecords: 0,
    },
    accessibility: {
      contentForm: 'text-first, linear lessons, single-choice items, and plain-text planning workshops',
      essentialVisualItems: 0,
      workshopStimuliUsePlainText: true,
      diagramsRequiredForComprehension: false,
      diagramFallbackMode: 'ordered-text-equivalent',
      independentReviewStatus: 'pending',
      productionScreenReaderValidationStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    rightsPolicy: {
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestions: false,
      copiedCollegeBoardRubricText: false,
      sourceProseOrFiguresReproduced: false,
      diagramSpecificationsOriginal: true,
      authoringBasis: 'Independent original wording informed by public blueprint metadata and factual sources.',
      publicSourceUse: 'Blueprint alignment and factual verification only; no source prose, figures, or assessment content reproduced.',
      openStaxUse: 'Factual cross-checking and links only; no textbook prose, figures, or assessment content reproduced.',
      workshopStudiesAreSynthetic: true,
      status: 'pending-independent-rights-review',
    },
    releaseGates: {
      internalStructuralValidation: 'pending-build-qa',
      independentRightsReview: 'pending',
      independentAccessibilityReview: 'pending',
      apUsGovernmentSubjectExpertReview: 'pending',
      productionValidation: 'pending',
      fieldTesting: 'not-started',
      psychometricCalibration: 'not-started',
      cedAndPolicyReverification: 'required-before-release',
      releaseEligible: false,
    },
    expertReviewGate: {
      requiredRole: 'Independent educator or faculty reviewer with current AP U.S. Government and Politics and assessment expertise',
      status: 'pending',
      releaseBlocked: true,
    },
    transitionNotice: 'Reverify the current AP U.S. Government and Politics CED, exam format, cases, required foundational documents, policies, and public-use boundaries before any release or expansion.',
    contentMigration: {
      schemaVersion: 1,
      contentVersion: LIBRARY_VERSION,
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      completeSections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      richLessonPrototypes: chapters.length,
      status: 'foundation-prototype',
      note: 'All five unit chapters and fifteen structured sections are navigable; the companion 260-item bank adds a third transfer/application angle for every current topic, the thirteen-document public foundational-document list is crosswalked without reproducing document text, and five synthetic response-planning workshops remain explicitly unscored; independent review remains pending.',
    },
  };
}

function buildPack(library) {
  const objectiveCatalog = library.blueprint.learningObjectiveCatalog;
  const items = itemSpecs.map((spec, index) => buildItem(spec, index, objectiveCatalog));
  const domains = units.map((unit) => ({
    id: unit.id,
    label: unit.label,
    weight: unit.weight,
    officialWeightMin: unit.officialWeightMin,
    officialWeightMax: unit.officialWeightMax,
    itemCount: items.filter((item) => item.domainId === unit.id).length,
  }));
  const sections = Array.from({ length: 52 }, (_, index) => ({
    id: 'ap-usg-foundation-bank-' + String(index + 1).padStart(2, '0'),
    label: 'Bank ' + String(index + 1).padStart(2, '0') + ': five-item internal foundation sampler',
    timeMinutes: null,
    released: false,
    itemIds: items.slice(index * 5, index * 5 + 5).map((item) => item.id),
  }));
  const practiceDistribution = {};
  const skillDistribution = {};
  const topicDistribution = {};
  for (const item of items) {
    practiceDistribution[item.practiceId] = (practiceDistribution[item.practiceId] || 0) + 1;
    skillDistribution[item.skillId] = (skillDistribution[item.skillId] || 0) + 1;
    topicDistribution[item.topicIds[0]] = (topicDistribution[item.topicIds[0]] || 0) + 1;
  }
  return {
    schemaVersion: 1,
    id: PACK_ID,
    title: 'AP U.S. Government and Politics Independent Foundation Pilot',
    shortTitle: 'AP U.S. Government Foundation Pilot',
    description: 'An independently authored 260-question AP U.S. Government and Politics foundation pilot spanning all five current units and all 60 current public framework topic IDs. Every topic has at least three practice angles, including a transfer/application layer, with a thirteen-document foundational-document crosswalk, expanded constitutional, institutional, source, data, argumentation, and item-linked study-route coverage for internal QA and study-route testing.',
    disclaimer: 'Independent, unofficial AP U.S. Government and Politics preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. This pilot does not provide official scores, score predictions, college-credit predictions, or a substitute for civics instruction.',
    credentialOwner: 'College Board',
    version: VERSION,
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    calibrated: false,
    accent: 'indigo',
    itemSchemaVersion: 2,
    responseTypes: ['single-choice'],
    examModes: ['fully-digital'],
    contentReview: 'Two hundred sixty original, source-aligned draft multiple-choice items: all five current units and all sixty current public framework topics are represented at least three times, with all five course skill categories and twenty-three named subskills sampled. Each of the fifteen native lesson sections carries a linked foundation/depth/transfer study route and topic-level drill map; a thirteen-document public foundational-document list is crosswalked by title and topic with deterministic item, section, and workshop study routes without reproducing document text; and the learning library adds five explicitly unscored response-planning workshops. This is an internal foundation, not an official exam form or calibrated readiness measure.',
    blueprintLabel: 'AP U.S. Government and Politics Course and Exam Description, effective Fall 2026, Course Framework V.1',
    blueprintEffective: 'Fall 2026 CED; current official public reference reviewed 2026-08-20.',
    officialBlueprintUrl: CED_URL,
    clarificationsUrl: CLARIFICATIONS_URL,
    officialExamUrl: EXAM_URL,
    domains,
    sections,
    items,
    learningLibraryUrl: './test_prep/ap_us_government_foundation_pilot_learning_library.json',
    nativeQaUrl: './test_prep/ap_us_government_foundation_pilot_qa.json',
    learningRouteMode: library.practiceRouting.mode,
    practiceRouting: library.practiceRouting,
    sourceCatalog,
    foundationalDocumentCatalog,
    foundationalDocumentRoutes: library.foundationalDocumentRoutes,
    capabilities: {
      currentEngineSchemaVersion: 1,
      itemSchemaVersion: 2,
      currentEngineCompatible: true,
      responseTypes: ['single-choice'],
      stimulusGroupsIncluded: false,
      constructedResponseIncluded: false,
      frqWorkshopsIncluded: true,
      handsFreeContentCompatible: true,
      limitations: [
        'This foundation pilot is not a complete AP U.S. Government and Politics exam simulation and does not reproduce the official digital exam experience.',
        'Official free-response task forms, source sets, scoring rubrics, and score conversions are not included or scored.',
        'The five response-planning workshops use original synthetic material and do not score written responses or reproduce official prompts or rubrics.',
        'No official score, readiness, college-credit, or civic-competency inference is supported.',
      ],
    },
    blueprint: {
      academicYearReference: '2026-27',
      cedEffectiveLabel: 'Fall 2026',
      cedFrameworkVersion: 'V.1',
      targetExamYear: null,
      examModeReference: 'fully-digital',
      officialFrameworkTopicCount: topicCatalog.length,
      officialFrameworkTopicIds: topicCatalog.map((topic) => topic.id),
      foundationalDocumentCatalogVersion: LIBRARY_VERSION,
      foundationalDocumentCount: foundationalDocumentCatalog.length,
      foundationalDocumentCatalog,
      foundationalDocumentRouteVersion: LIBRARY_VERSION,
      foundationalDocumentRouteCount: library.foundationalDocumentRoutes.length,
      foundationalDocumentRoutes: library.foundationalDocumentRoutes,
      officialUnitCount: units.length,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
      pilotAlignment: '260-item text-first foundation across all five units and all 60 current public framework topic IDs, with at least three practice angles per topic; thirteen required public foundational documents crosswalked by title and topic with item, section, and workshop study routes; fifteen native lesson sections carry linked foundation/depth/transfer routes and sixty topic-level drill maps; 52 five-item internal banks; five unscored response-planning workshops; all five course skill categories represented; no official stimulus sets or FRQ scoring.',
      lastVerifiedAt: VERIFIED_AT,
      sourceDigest: 'pending-build-generation',
      bigIdeas,
      skills,
      learningObjectiveCatalogVersion: LIBRARY_VERSION,
      learningObjectiveCatalog: objectiveCatalog,
    },
    practiceDistribution: { ...practiceDistribution, note: 'The five course skill categories are sampled across this internal foundation; this is not a psychometric exam blueprint.' },
    skillDistribution: { ...skillDistribution, note: 'Named AP course subskills are sampled for routing and study feedback; independent expert review remains pending.' },
    topicDistribution: { ...topicDistribution, note: 'Every current public topic ID receives at least three internal practice items; distribution follows the internal unit sample and is not a psychometric exam blueprint.' },
    depthCoverage: {
      baseItemCount: baseItemSpecs.length,
      depthItemCount: depthItemSpecs.length,
      transferItemCount: transferItemSpecs.length,
      topicsWithAtLeastTwoItems: topicCatalog.filter((topic) => topicDistribution[topic.id] >= 2).length,
      topicsWithAtLeastThreeItems: topicCatalog.filter((topic) => topicDistribution[topic.id] >= 3).length,
      topicCount: topicCatalog.length,
      status: 'third-angle-transfer-topic-coverage',
    },
    foundationalDocumentCount: foundationalDocumentCatalog.length,
    foundationalDocumentRouteCount: library.foundationalDocumentRoutes.length,
    rightsPolicy: library.rightsPolicy,
    releaseGates: library.releaseGates,
    accessibilityGate: {
      contentForm: 'text-only, linear single-choice items and text-first native lessons',
      essentialVisualItems: 0,
      screenReaderReadingOrderDeclared: true,
      handsFreeContentCompatible: true,
      independentReviewStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    expertReviewGate: library.expertReviewGate,
    transitionNotice: library.transitionNotice,
    sourceQuestionItems: items.length,
    independentPracticeItems: items.length,
    distinctSourceContentKernels: items.length,
    constructedResponseWorkshopCount: library.constructedResponseWorkshops.length,
    batchSize: 5,
    diagnosticBatchCount: sections.length,
  };
}

function main() {
  const objectiveCatalog = buildObjectiveCatalog();
  const library = buildLibrary(objectiveCatalog);
  const pack = buildPack(library);
  assert(pack.items.length === 260, 'AP U.S. Government pack must contain 260 items.');
  assert(new Set(pack.items.map((item) => item.id)).size === 260, 'AP U.S. Government item IDs must be unique.');
  assert(pack.domains.every((domain) => domain.itemCount === expectedItemCountsByUnit[units.find((unit) => unit.id === domain.id).number]), 'Unit counts are incorrect.');
  assert(library.chapters.length === 5 && library.summary.sections === 15 && library.constructedResponseWorkshops.length === 5, 'AP U.S. Government library inventory is incorrect.');
  assert(library.foundationalDocumentRoutes.length === 13 && library.foundationalDocumentRoutes.every((route) => route.itemCount > 0 && route.sectionIds.length > 0), 'AP U.S. Government foundational-document routes are incomplete.');
  writeJson(packPath, pack);
  writeJson(libraryPath, library);
  console.log('Built ' + pack.id + ' ' + pack.version + ' with ' + pack.items.length + ' items across ' + pack.domains.length + ' units and ' + library.summary.sections + ' structured sections.');
}

main();
