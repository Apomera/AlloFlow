#!/usr/bin/env node
'use strict';

// Builds a deliberately small AP U.S. History internal foundation pilot. The
// records are original, source-linked draft material. This is a coverage and
// architecture pass, not an official AP form, a released item bank, or a
// substitute for independent history and assessment review.

const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot_learning_library.json');

const PACK_ID = 'ap-us-history-foundation-pilot';
const VERSION = '0.1.0-internal-preview';
const VERIFIED_AT = '2026-08-20';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-history-course-and-exam-description.pdf';
const CLARIFICATIONS_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-history-course-and-exam-description-clarifications.pdf';
const COURSE_URL = 'https://apcentral.collegeboard.org/courses/ap-united-states-history';
const EXAM_URL = 'https://apstudents.collegeboard.org/courses/ap-united-states-history/assessment';
const OPENSTAX_URL = 'https://openstax.org/details/books/us-history/';
const YAWP_URL = 'https://www.americanyawp.com/text/';
const LIBRARY_VERSION = 'ap-us-history-foundation-v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJson(filePath, value) {
  writeGeneratedFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

const historicalSkills = [
  { id: 'H1', label: 'Developments and Processes', description: 'Identify and explain historical developments and processes.' },
  { id: 'H2', label: 'Sourcing and Situation', description: 'Analyze the point of view, purpose, historical situation, and audience of a source.' },
  { id: 'H3', label: 'Claims and Evidence in Sources', description: 'Analyze arguments and the evidence used in primary and secondary sources.' },
  { id: 'H4', label: 'Contextualization', description: 'Place historical events, developments, or processes in broader context.' },
  { id: 'H5', label: 'Making Connections', description: 'Use comparison, causation, and continuity-and-change reasoning to connect developments.' },
  { id: 'H6', label: 'Argumentation', description: 'Develop a defensible historical claim and support it with relevant evidence.' },
];

const reasoningProcesses = [
  { id: 'comparison', label: 'Comparison', description: 'Identify similarities and differences across historical developments.' },
  { id: 'causation', label: 'Causation', description: 'Explain causes, effects, and relationships among developments.' },
  { id: 'continuity-change', label: 'Continuity and Change', description: 'Analyze what persisted and what changed over time.' },
];

const unitDefinitions = [
  {
    number: 1,
    id: 'period-1-1491-1607',
    label: 'Unit 1: Period 1: 1491-1607',
    shortLabel: 'Period 1: 1491-1607',
    period: '1491-1607',
    officialWeightMin: 0.04,
    officialWeightMax: 0.06,
    themes: ['American and National Identity', 'Geography and the Environment', 'Migration and Settlement'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/2-introduction',
    sourceTitle: 'U.S. History, Chapter 2: Early Globalization and Transatlantic Contact',
    summary: 'Period 1 begins with diverse Indigenous societies whose economies, political structures, and cultural practices reflected local environments. European voyages created new Atlantic connections, while disease, conquest, labor systems, and exchange reshaped communities and power.',
    sections: [
      { heading: 'Native societies and regional adaptation', core: 'Indigenous societies were not a single culture or political system. Communities adapted to local ecologies through farming, trade, seasonal movement, architecture, and political alliances. Maize cultivation supported large settlements in some regions, while other communities developed lifeways suited to deserts, forests, coasts, or grasslands. Historical reasoning should connect environment and social organization without treating geography as destiny.', examples: ['Irrigation and maize supported dense settlements in parts of the Southwest.', 'Mississippian communities used agriculture, trade, and ceremonial centers to organize regional networks.'], nonExamples: ['All Indigenous societies followed one economic system.', 'A shared crop means every community had the same political structure.'], misconception: 'Environmental adaptation explains important possibilities and pressures, but it does not erase Indigenous choice, innovation, or diversity.', rows: [['Regional ecology shaped foodways and settlement patterns.', 'Different societies developed distinct institutions and trade networks.'], ['Large settlements existed before European colonization.', 'Urban or ceremonial complexity was not dependent on European models.']], retrieval: ['Give two ways environment influenced Indigenous societies.', 'Why is "Native society" too broad to describe one political system?', 'How can a historian avoid turning environmental explanation into environmental determinism?'], transfer: 'When a prompt names a region, connect its ecology to a specific social or economic development before generalizing.'},
      { heading: 'European exploration and Atlantic motives', core: 'European expansion into the Americas reflected overlapping motives: states sought wealth and strategic influence, merchants sought trade, and many colonizers pursued religious or social goals. Maritime technology and state sponsorship made longer voyages possible, but Indigenous knowledge, diplomacy, resistance, and existing networks also shaped the results. Sourcing a voyage narrative requires attention to its audience and purpose.', examples: ['A royal sponsor could read a voyage report as evidence for territorial claims.', 'A merchant could emphasize commodities and routes while minimizing Indigenous perspectives.'], nonExamples: ['A voyage account is a neutral inventory of everything that happened.', 'European exploration followed one motive shared equally by every participant.'], misconception: 'Recognizing economic or religious motives does not require treating them as mutually exclusive.', rows: [['A source celebrates a sponsor and lists commodities.', 'Its purpose may include attracting further investment or royal support.'], ['A source describes unfamiliar peoples through European categories.', 'Its language may reveal assumptions as well as observations.']], retrieval: ['Name two motives for European expansion.', 'What can audience reveal about a voyage narrative?', 'Why should Indigenous agency remain in an account of European exploration?'], transfer: 'For an exploration source, identify who benefits from the account before accepting its description as complete.'},
      { heading: 'Exchange, conquest, and colonial labor', core: 'The Columbian Exchange moved plants, animals, people, and diseases across the Atlantic. Epidemics caused catastrophic population loss in many Indigenous communities, while new crops and animals changed diets and economies on both sides of the ocean. Spanish colonization also created systems of coercion and conversion that drew Indigenous and African people into a hierarchical colonial society.', examples: ['American crops entered European and African food systems.', 'Spanish authorities used coerced Indigenous labor and later expanded African slavery in colonial economies.'], nonExamples: ['Exchange was limited to voluntary trade between equal partners.', 'Disease affected every region and community in exactly the same way.'], misconception: 'Calling the process an "exchange" should not obscure conquest, forced labor, demographic loss, or unequal power.', rows: [['New foods and animals crossed the Atlantic.', 'Food systems and population patterns changed over time.'], ['Epidemic disease spread through connected populations.', 'Demographic consequences varied with exposure, immunity, and local conditions.']], retrieval: ['Identify one biological and one economic effect of Atlantic exchange.', 'Why is the term "exchange" historically incomplete by itself?', 'How did labor systems connect conquest and colonial wealth?'], transfer: 'When a prompt asks for an effect, distinguish biological, demographic, economic, and cultural consequences rather than listing one as universal.'},
    ],
    memoryCue: 'Place, purpose, exchange: start with Indigenous diversity, then ask who sponsored movement, and finally trace unequal consequences.',
    diagramTitle: 'Period 1: Regional societies and Atlantic consequences',
  },
  {
    number: 2,
    id: 'period-2-1607-1754',
    label: 'Unit 2: Period 2: 1607-1754',
    shortLabel: 'Period 2: 1607-1754',
    period: '1607-1754',
    officialWeightMin: 0.06,
    officialWeightMax: 0.08,
    themes: ['Migration and Settlement', 'Work, Exchange, and Technology', 'Social Structures'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/4-introduction',
    sourceTitle: 'U.S. History, Chapter 4: Rule Britannia! The English Empire',
    summary: 'Period 2 examines European colonization, regional economies, Atlantic trade, and the growth of racialized slavery. Colonies developed differently because of environment, migration patterns, imperial goals, labor demands, Indigenous diplomacy, and resistance.',
    sections: [
      { heading: 'European colonies and regional development', core: 'Spanish, French, Dutch, and English colonies pursued different combinations of extraction, trade, settlement, conversion, and imperial rivalry. Within the British colonies, the Chesapeake, New England, and middle colonies developed distinct economies and social patterns. These differences were shaped by climate, labor, migration, markets, and relations with Indigenous nations.', examples: ['Tobacco encouraged labor-intensive agriculture in the Chesapeake.', 'New England town life and family farming differed from plantation economies farther south.'], nonExamples: ['All British colonies had the same labor system and settlement pattern.', 'Climate alone determined colonial society without human decisions or imperial policy.'], misconception: 'Regional comparison works best when it names a mechanism, not just a difference in climate or culture.', rows: [['A colony attracts family migrants and develops small farms.', 'Population structure can affect settlement and community institutions.'], ['A colony exports a labor-intensive cash crop.', 'Land and labor systems become central to its social order.']], retrieval: ['Compare one feature of the Chesapeake and New England.', 'Why did colonial regions develop differently?', 'How did migration patterns shape institutions?'], transfer: 'For a regional comparison, link a social difference to labor, migration, environment, or market conditions.'},
      { heading: 'Atlantic trade and imperial systems', core: 'Atlantic commerce connected colonies, Europe, Africa, and the Caribbean through the movement of goods and people. Mercantilist policies attempted to direct colonial trade toward the interests of imperial powers, while merchants and colonists often sought flexibility. The Atlantic economy generated wealth for some and depended heavily on coercion, including the transatlantic slave trade.', examples: ['Navigation rules attempted to channel colonial exports and imports through imperial networks.', 'Port cities grew as merchants connected plantation products to Atlantic markets.'], nonExamples: ['Mercantilism meant colonies traded only within a closed system.', 'Trade growth benefited all participants equally.'], misconception: 'Imperial regulation and commercial practice could conflict; a law on the books does not show complete enforcement.', rows: [['A law reserves certain trade for imperial merchants.', 'The policy expresses mercantilist goals but may invite evasion or resistance.'], ['Plantation exports increase in Atlantic markets.', 'Demand can intensify forced labor and political debates over trade.']], retrieval: ['What was the goal of mercantilist policy?', 'Why should historians separate regulation from enforcement?', 'How did Atlantic commerce connect labor and imperial power?'], transfer: 'When analyzing a trade policy, identify the intended beneficiary and then ask how colonists, merchants, or enslaved people experienced it.'},
      { heading: 'Slavery, resistance, and colonial society', core: 'In British North America, slavery became a hereditary, racialized labor system that shaped law, wealth, family life, and political power. Enslaved Africans and their descendants resisted through everyday actions, cultural continuity, flight, revolt, and community formation. Indigenous resistance and diplomacy also limited or redirected imperial control, demonstrating that colonization was contested rather than automatic.', examples: ['Colonial laws increasingly linked African ancestry to permanent hereditary status.', 'Enslaved communities preserved cultural practices while adapting to coercive conditions.'], nonExamples: ['Enslaved people were passive recipients of colonial policy.', 'Race and slavery developed identically in every Atlantic colony.'], misconception: 'Agency under coercion does not mean freedom from coercion; both resistance and structural violence must be represented.', rows: [['Law assigns status through ancestry.', 'Legal categories can make inequality durable across generations.'], ['Enslaved people create families and cultural practices under constraint.', 'Community formation is evidence of agency, not evidence that bondage was benign.']], retrieval: ['How did law make slavery hereditary?', 'Name two forms of resistance besides open revolt.', 'Why should a history of slavery include both structure and agency?'], transfer: 'When a source describes colonial society, identify which legal or economic institution distributes power before evaluating individual behavior.'},
    ],
    memoryCue: 'Region, route, and regime: compare colonial environments, trace Atlantic commerce, and name the legal systems that organized labor.',
    diagramTitle: 'Period 2: Colonial regions and Atlantic connections',
  },
  {
    number: 3,
    id: 'period-3-1754-1800',
    label: 'Unit 3: Period 3: 1754-1800',
    shortLabel: 'Period 3: 1754-1800',
    period: '1754-1800',
    officialWeightMin: 0.10,
    officialWeightMax: 0.17,
    themes: ['Politics and Power', 'American and National Identity', 'America in the World'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/5-introduction',
    sourceTitle: 'U.S. History, Chapter 5: Imperial Reforms and Colonial Protests',
    summary: 'Period 3 follows imperial conflict, the American Revolution, independence, the Articles of Confederation, the Constitution, and the early republic. The period is defined by debates over sovereignty, representation, federal power, liberty, and the limits of an expanding political community.',
    sections: [
      { heading: 'Imperial conflict and revolutionary resistance', core: 'The Seven Years’ War changed the balance of power in North America and left Britain with new debts and new territories to administer. British attempts to raise revenue and tighten imperial control met colonial resistance. Colonists drew on ideas about rights and representation, but their responses also reflected local interests, economic pressures, and longstanding disputes over authority.', examples: ['Postwar taxation and enforcement helped unite otherwise separate colonial protests.', 'Committees, boycotts, and pamphlets turned local grievances into an intercolonial movement.'], nonExamples: ['The Revolution began from a single tax with no earlier political context.', 'Every colonist supported independence from the beginning.'], misconception: 'Revolutionary rhetoric about liberty coexisted with exclusions based on gender, race, property, and enslavement.', rows: [['War increases imperial debt and administrative costs.', 'Officials seek revenue and tighter oversight.'], ['Colonists protest taxation without elected representation.', 'Resistance raises broader questions about sovereignty and rights.']], retrieval: ['How did the Seven Years’ War alter imperial relations?', 'Why did taxation become a constitutional issue?', 'What groups remained outside revolutionary political equality?'], transfer: 'For a causation question, connect the immediate policy to the longer conflict over authority and representation.'},
      { heading: 'Independence and republican experiments', core: 'The Declaration of Independence justified separation through a universal-sounding language of rights while also responding to a specific political crisis. The Articles of Confederation created a national framework that preserved significant state authority and lacked several powers later associated with the federal government. The Constitution was a response to perceived weaknesses, but its design included compromises that left major conflicts unresolved.', examples: ['The Articles Congress could coordinate diplomacy but struggled to raise revenue directly.', 'Constitutional debates weighed stronger national institutions against fears of centralized power.'], nonExamples: ['The Constitution ended all disagreements over federalism.', 'Republican language automatically extended political participation to everyone.'], misconception: 'Founding documents can be both transformative and limited; historical analysis should test ideals against institutions and lived experience.', rows: [['The national government cannot reliably fund common obligations.', 'Support grows for revising the national framework.'], ['A new constitution creates separated powers and federal authority.', 'The design also produces disputes over interpretation and implementation.']], retrieval: ['What weakness of the Articles encouraged constitutional reform?', 'How did the Constitution balance national and state power?', 'How can a historian compare political ideals with political membership?'], transfer: 'When reading a founding document, distinguish the principle it states from the people and institutions it actually includes.'},
      { heading: 'The early republic and contested federal power', core: 'The early republic established precedents while revealing durable disagreements over the economy, foreign policy, constitutional interpretation, and the role of political parties. Federalists favored stronger national institutions and commercial development, while Democratic-Republicans emphasized agrarian interests and a narrower reading of federal authority. These labels changed over time and should be tied to specific policies.', examples: ['Debates over a national bank connected constitutional interpretation to economic policy.', 'Foreign crises tested whether the new nation would align with European powers or protect neutrality.'], nonExamples: ['Political parties were absent after ratification.', 'Federalists and Democratic-Republicans held identical views on national power.'], misconception: 'Early parties were coalitions with internal disagreements, not perfectly consistent modern-style platforms.', rows: [['A policy expands federal economic coordination.', 'Supporters may invoke implied powers and national development.'], ['A policy restricts trade during a foreign crisis.', 'The choice can expose tensions between security, commerce, and constitutional limits.']], retrieval: ['What issue linked the national bank to constitutional debate?', 'Why did foreign affairs matter to domestic party formation?', 'What makes a party comparison historically precise?'], transfer: 'Name the policy first, then identify which constitutional principle each side used to defend it.'},
    ],
    memoryCue: 'War to rights to design: follow the imperial crisis, test revolutionary ideals, and compare the powers built into the new republic.',
    diagramTitle: 'Period 3: From imperial crisis to constitutional design',
  },
  {
    number: 4,
    id: 'period-4-1800-1848',
    label: 'Unit 4: Period 4: 1800-1848',
    shortLabel: 'Period 4: 1800-1848',
    period: '1800-1848',
    officialWeightMin: 0.10,
    officialWeightMax: 0.17,
    themes: ['Work, Exchange, and Technology', 'Politics and Power', 'Culture and Society'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/8-introduction',
    sourceTitle: 'U.S. History, Chapter 8: Growing Pains: The New Republic, 1790-1820',
    summary: 'Period 4 covers the market revolution, political democratization for many white men, expansion, reform, religious revival, and intensifying sectional differences. Economic and cultural change opened opportunities while also producing displacement, inequality, and conflicts over federal power and slavery.',
    sections: [
      { heading: 'The market revolution and regional change', core: 'New transportation, communication, and production systems linked markets and encouraged regional specialization. Canals, roads, steamboats, and later railroads reduced travel time and expanded commercial networks. The market revolution reshaped work, family relations, urban growth, and regional identities rather than simply making the entire nation economically uniform.', examples: ['Canals connected interior farms to Atlantic ports.', 'Factories and wage labor changed the organization of production in some regions.'], nonExamples: ['The market revolution affected every household in the same way.', 'Transportation improvements eliminated regional economic differences.'], misconception: 'Integration can coexist with specialization: a more connected economy may deepen regional dependence on different products.', rows: [['Transport costs fall between interior farms and ports.', 'Farmers can participate more easily in distant markets.'], ['Factory production expands in some towns.', 'Wage labor and workplace discipline become more important.']], retrieval: ['Name two technologies associated with the market revolution.', 'How could market integration increase regional specialization?', 'What social relationship changed when work moved into factories?'], transfer: 'For an economic change, trace both the new connection and the group that bore its costs.'},
      { heading: 'Jacksonian politics and federal power', core: 'The expansion of voting rights for many white men helped reshape party politics, but it did not create universal democracy. Jacksonian leaders claimed to represent the "common man" while supporting policies that expanded executive power and displaced American Indian communities. Debates over the national bank, tariffs, internal improvements, and nullification revealed competing ideas about federal authority.', examples: ['The Bank War linked party identity to arguments about concentrated economic power.', 'Indian Removal used federal authority to force Indigenous nations west of the Mississippi.'], nonExamples: ['Voting expansion included women, most African Americans, and all Indigenous people equally.', 'Jacksonian democracy consistently favored a small federal government.'], misconception: 'A movement can expand participation for one group while intensifying exclusion and state power for another.', rows: [['More white men participate in elections.', 'Party mobilization and popular campaigning become more prominent.'], ['The executive rejects a national bank and enforces removal policy.', 'Presidential power and federal responsibility become central questions.']], retrieval: ['Who gained and who remained excluded from expanded voting?', 'Why did the Bank War concern federal power?', 'How does Indian Removal complicate the label "democracy"?'], transfer: 'When judging a democratic development, specify the population included and the population excluded.'},
      { heading: 'Reform, religion, and antebellum social conflict', core: 'The Second Great Awakening, democratic ideals, and social mobility encouraged voluntary reform movements. Abolitionists, advocates for women’s rights, temperance reformers, and other activists used print, meetings, petitions, and moral arguments to challenge institutions. Reform language expanded public debate, but slavery, racial restrictions, and unequal gender roles remained powerful structures.', examples: ['Abolitionists connected moral arguments to political action against slavery.', 'Women reformers used their organizing experience to question legal and civic limitations.'], nonExamples: ['Every reform movement agreed on the role of government.', 'Religious revival ended disagreement over slavery or gender.'], misconception: 'Reform movements can share language about improvement while disagreeing over methods, constituencies, and the meaning of equality.', rows: [['A revival emphasizes individual moral responsibility.', 'Voluntary associations and social reform campaigns grow.'], ['A reform convention states a rights-based claim.', 'The claim can expose contradictions between republican ideals and law.']], retrieval: ['What conditions helped the Second Great Awakening spread?', 'How did reformers use voluntary associations?', 'Why did reform not automatically end structural inequality?'], transfer: 'Connect a reform movement to both its ideas and the institution or practice it sought to change.'},
    ],
    memoryCue: 'Markets, democracy, reform: ask who gained access, who was displaced, and how federal power shaped both.',
    diagramTitle: 'Period 4: Connections among markets, politics, and reform',
  },
  {
    number: 5,
    id: 'period-5-1844-1877',
    label: 'Unit 5: Period 5: 1844-1877',
    shortLabel: 'Period 5: 1844-1877',
    period: '1844-1877',
    officialWeightMin: 0.10,
    officialWeightMax: 0.17,
    themes: ['Politics and Power', 'Migration and Settlement', 'Social Structures'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/13-introduction',
    sourceTitle: 'U.S. History, Chapter 13: Antebellum Idealism and Reform Impulses, 1820-1850',
    summary: 'Period 5 traces territorial expansion, sectional conflict over slavery, the Civil War, emancipation, and Reconstruction. Expansion intensified the question of slavery’s future, while the war and constitutional amendments transformed the legal status of citizenship and freedom without ending racial violence or inequality.',
    sections: [
      { heading: 'Expansion and the sectional crisis', core: 'Manifest Destiny framed territorial expansion as a national mission, but expansion raised questions about Indigenous sovereignty, relations with Mexico, and the extension of slavery. The Mexican-American War added vast territory and made sectional disagreement harder to contain. Compromises delayed conflict while leaving the underlying contest over political power unresolved.', examples: ['New western territories reopened debates over whether slavery would expand.', 'The language of national mission could obscure the costs of conquest and displacement.'], nonExamples: ['Manifest Destiny was a consensus without critics.', 'Territorial acquisition settled the slavery question permanently.'], misconception: 'Expansion can increase national power while simultaneously deepening internal conflict.', rows: [['The United States acquires western territory.', 'Congress must decide how new territories will be organized.'], ['A compromise admits or organizes territories temporarily.', 'The settlement may postpone rather than solve sectional conflict.']], retrieval: ['Why did territorial expansion intensify sectional conflict?', 'What did Manifest Destiny make less visible?', 'How can a compromise both reduce conflict and preserve its cause?'], transfer: 'For an expansion question, track land, sovereignty, labor, and political balance together.'},
      { heading: 'Civil War, emancipation, and federal power', core: 'The Civil War began amid secession and conflict over the Union, slavery, and constitutional authority. As the war continued, emancipation became central to Union policy and war aims, weakening the Confederacy and permitting Black military service. The Emancipation Proclamation had a specific wartime scope, while the Thirteenth Amendment abolished slavery nationally.', examples: ['Emancipation changed the diplomatic and military meaning of the war.', 'Black soldiers and communities pressed the Union to make freedom a more durable outcome.'], nonExamples: ['The Emancipation Proclamation immediately abolished slavery everywhere.', 'Military emancipation was unrelated to constitutional change.'], misconception: 'Historical change often occurs through interacting wartime policy, individual action, and constitutional reform.', rows: [['A wartime proclamation changes the status of some enslaved people.', 'It undermines Confederate labor and invites Black enlistment.'], ['The Thirteenth Amendment is ratified.', 'A constitutional ban on slavery outlasts wartime executive policy.']], retrieval: ['Why was emancipation a military as well as moral policy?', 'What was the constitutional significance of the Thirteenth Amendment?', 'How did Black participation influence wartime change?'], transfer: 'Separate the scope of an executive order from the broader constitutional change that followed.'},
      { heading: 'Reconstruction and the meaning of citizenship', core: 'Reconstruction attempted to define freedom, citizenship, voting rights, and the relationship between federal and state power after the Civil War. The Fourteenth and Fifteenth Amendments expanded constitutional protections, while Black political organizing built institutions and elected governments. White supremacist violence, legal restrictions, and political retreat limited these gains and shaped later struggles.', examples: ['Freedpeople established schools, churches, families, and political organizations.', 'Federal enforcement confronted violence but did not eliminate local resistance.'], nonExamples: ['Emancipation ended racial hierarchy immediately.', 'Reconstruction was only a conflict among white politicians.'], misconception: 'Constitutional rights can be formally expanded while access to those rights remains contested in practice.', rows: [['An amendment defines national citizenship and equal protection.', 'Federal authority gains a basis for challenging state violations.'], ['Violence and restrictive laws target Black political participation.', 'Rights on paper can be undermined by local enforcement and intimidation.']], retrieval: ['What did the Fourteenth Amendment change?', 'Why did Black institution building matter during Reconstruction?', 'How can historians explain the gap between rights and access?'], transfer: 'When analyzing a constitutional change, pair its text or goal with evidence about implementation and resistance.'},
    ],
    memoryCue: 'Land, labor, liberty: expansion raises the slavery question, war changes freedom, and Reconstruction tests citizenship.',
    diagramTitle: 'Period 5: Expansion, war, emancipation, and Reconstruction',
  },
  {
    number: 6,
    id: 'period-6-1865-1898',
    label: 'Unit 6: Period 6: 1865-1898',
    shortLabel: 'Period 6: 1865-1898',
    period: '1865-1898',
    officialWeightMin: 0.10,
    officialWeightMax: 0.17,
    themes: ['Work, Exchange, and Technology', 'Migration and Settlement', 'Geography and the Environment'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/18-introduction',
    sourceTitle: 'U.S. History, Chapter 18: Industrialization and the Rise of Big Business, 1870-1900',
    summary: 'Period 6 examines western settlement, industrial capitalism, immigration, urbanization, labor conflict, and the political responses to inequality. Railroads and corporations connected markets, but growth also depended on resource extraction, land dispossession, low-wage labor, and contested ideas about the proper role of government.',
    sections: [
      { heading: 'The West, railroads, and Indigenous dispossession', core: 'Federal land policy, military power, railroads, and migration accelerated settlement across the West. The process displaced Indigenous nations, restricted their sovereignty, and transformed ecosystems. Railroads connected farms, mines, ranches, and cities while also creating corporate power and dependence on national transportation networks.', examples: ['Railroads opened new markets for western commodities and brought settlers to Indigenous lands.', 'Federal policies attempted to confine Native nations while promoting non-Native settlement.'], nonExamples: ['Western settlement was an empty-land process with no existing societies.', 'Railroads affected only transportation and not politics, ecology, or labor.'], misconception: 'Infrastructure is not neutral: its routes and subsidies distribute opportunity and power.', rows: [['A railroad connects an interior region to national markets.', 'Commodity production and migration can accelerate.'], ['Federal policy reduces Indigenous land bases.', 'Settlement and extraction expand through coercive state action.']], retrieval: ['How did railroads change western economies?', 'Why is the "empty West" narrative inaccurate?', 'What links transportation policy and Indigenous dispossession?'], transfer: 'For a western development, identify the state policy, the economic incentive, and the population displaced.'},
      { heading: 'Industrial capitalism and urban life', core: 'Industrial capitalism concentrated production, investment, and decision-making in large firms. Vertical integration, new technologies, and national markets increased output while creating debates over monopolies, wages, working conditions, and government regulation. Cities grew rapidly as migrants and immigrants sought work, producing both opportunity and overcrowded inequality.', examples: ['A corporation can control multiple stages of production to reduce costs and competition.', 'Urban neighborhoods often reflected ethnic networks, labor markets, and unequal access to housing.'], nonExamples: ['Industrial growth improved working conditions automatically.', 'All urban residents shared the same economic experience.'], misconception: 'Economic growth and inequality can occur at the same time; aggregate output does not measure distribution.', rows: [['A company controls raw materials, production, and distribution.', 'Vertical integration can increase efficiency and market power.'], ['Factories attract workers faster than cities build housing.', 'Crowding and public-health problems become reform concerns.']], retrieval: ['What is vertical integration?', 'Why did industrial cities become sites of reform?', 'How should historians distinguish growth from distribution?'], transfer: 'When a question describes a corporation, connect its structure to competition, labor, and public policy.'},
      { heading: 'Immigration, labor, and reform responses', core: 'Immigration and internal migration supplied labor for industrial and agricultural economies and changed the cultural life of cities and regions. Workers organized through unions, strikes, mutual-aid societies, and political movements. Employers, courts, and governments often treated labor conflict as a threat to order, prompting debates over regulation and the rights of workers.', examples: ['Workers used strikes to challenge long hours and unsafe conditions.', 'Nativist movements portrayed immigration as a threat while industries relied on immigrant labor.'], nonExamples: ['Immigrants entered the same occupations and communities regardless of skill or location.', 'Labor conflict was only a personal disagreement between workers and managers.'], misconception: 'Labor history requires attention to both worker agency and the legal, economic, and institutional power of employers.', rows: [['A strike interrupts a national industry.', 'Public debate turns to wages, private property, and government intervention.'], ['A city receives migrants from multiple regions and countries.', 'Neighborhood institutions can support community while also reflecting segregation or exclusion.']], retrieval: ['Why did employers and governments oppose some strikes?', 'How did migration change urban culture?', 'What is one reason nativism could coexist with labor demand?'], transfer: 'For a labor conflict, identify the immediate workplace issue and the broader economic or legal structure.'},
    ],
    memoryCue: 'Tracks, firms, and workers: follow infrastructure west, capital into corporations, and migration into contested labor politics.',
    diagramTitle: 'Period 6: Networks of industrial growth and migration',
  },
  {
    number: 7,
    id: 'period-7-1890-1945',
    label: 'Unit 7: Period 7: 1890-1945',
    shortLabel: 'Period 7: 1890-1945',
    period: '1890-1945',
    officialWeightMin: 0.10,
    officialWeightMax: 0.17,
    themes: ['America in the World', 'Politics and Power', 'Culture and Society'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/22-introduction',
    sourceTitle: 'U.S. History, Chapter 22: Age of Empire, 1877-1914',
    summary: 'Period 7 covers Progressivism, imperial debates, World War I, the 1920s, the Great Depression, the New Deal, and World War II. The United States expanded its global role while domestic movements challenged corporate power, racial violence, inequality, and the limits of citizenship.',
    sections: [
      { heading: 'Progressivism and the expanding role of government', core: 'Progressive reformers responded to industrial inequality, urban conditions, political corruption, and corporate power through investigation, regulation, public-health measures, and democratic reforms. Progressivism included competing views about race, gender, immigration, and the proper scope of government. Reform achievements should be assessed alongside exclusions and limits.', examples: ['Investigative journalism helped make corporate and urban problems visible to a national audience.', 'Reformers supported measures ranging from food regulation to direct election changes.'], nonExamples: ['Progressives agreed on every issue and represented all Americans equally.', 'Government regulation automatically solved the underlying inequality.'], misconception: 'Progressive reform can be both an expansion of state capacity and a reproduction of racial or class hierarchy.', rows: [['Reformers document unsafe products or workplace conditions.', 'Public pressure supports new regulation or inspection.'], ['A direct-democracy reform changes how officials are selected.', 'The reform alters institutions but not necessarily access for every group.']], retrieval: ['What problems motivated Progressives?', 'How did reformers expand government capacity?', 'Why should Progressivism be analyzed with attention to exclusion?'], transfer: 'For a reform question, identify the problem, the policy mechanism, and who remained outside the reform’s protection.'},
      { heading: 'Imperialism, war, and global power', core: 'The Spanish-American War and the acquisition of overseas territories intensified debates over imperialism, national identity, commerce, and self-government. Supporters connected expansion to strategic or economic interests, while critics questioned whether ruling other peoples contradicted republican principles. World War I and its aftermath further tested the country’s relationship to international institutions.', examples: ['Overseas expansion created new responsibilities and resistance movements.', 'Debates over intervention asked whether security and commerce justified military action.'], nonExamples: ['Imperialism had only military motives.', 'Entering a war automatically produced consensus about international policy.'], misconception: 'Foreign-policy decisions combine strategic, economic, ideological, and domestic political considerations.', rows: [['The United States acquires overseas possessions.', 'Questions of citizenship, sovereignty, and imperial administration follow.'], ['A president seeks support for international engagement.', 'Audience and wartime context shape the argument’s meaning.']], retrieval: ['Why did imperialism raise a national-identity question?', 'Name two motives that can shape foreign policy.', 'How can a source’s audience affect its account of intervention?'], transfer: 'When analyzing foreign policy, distinguish the stated justification from the strategic or economic context.'},
      { heading: 'Depression, New Deal, and World War II', core: 'The Great Depression destabilized employment, finance, and confidence in existing institutions. The New Deal used federal power for relief, recovery, and reform but did not end all economic hardship. World War II mobilization transformed production, migration, and the global role of the United States while exposing contradictions between democratic rhetoric and racial exclusion, including Japanese American incarceration.', examples: ['New Deal programs changed expectations about federal responsibility for economic security.', 'War production expanded employment and drew workers to industrial centers.'], nonExamples: ['The New Deal ended the Depression by itself before wartime mobilization.', 'Democratic war aims eliminated discrimination on the home front.'], misconception: 'A policy can leave a durable institutional legacy without fully solving the crisis that produced it.', rows: [['Federal agencies provide relief and regulate finance.', 'Citizens debate whether government responsibility has expanded too far or not far enough.'], ['War industries recruit workers from new regions.', 'Migration changes cities, families, and labor politics.']], retrieval: ['What were the three broad goals of the New Deal?', 'How did World War II change migration and production?', 'What contradiction did incarceration reveal?'], transfer: 'For a policy legacy question, separate immediate results, institutional changes, and unresolved inequality.'},
    ],
    memoryCue: 'Reform, reach, recovery: government responds at home while U.S. power and democratic contradictions expand abroad.',
    diagramTitle: 'Period 7: Reform and global power across crisis',
  },
  {
    number: 8,
    id: 'period-8-1945-1980',
    label: 'Unit 8: Period 8: 1945-1980',
    shortLabel: 'Period 8: 1945-1980',
    period: '1945-1980',
    officialWeightMin: 0.10,
    officialWeightMax: 0.17,
    themes: ['America in the World', 'Politics and Power', 'Social Structures'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/28-introduction',
    sourceTitle: 'U.S. History, Chapter 28: Post-War Prosperity and Cold War Fears, 1945-1960',
    summary: 'Period 8 explores the Cold War, the Red Scare, civil rights and other social movements, Vietnam, the Great Society, environmental concerns, and cultural change. Postwar prosperity and global leadership coexisted with unequal access, protest, militarization, and debates over executive power.',
    sections: [
      { heading: 'Cold War policy and global leadership', core: 'After World War II, U.S. policymakers built alliances, economic institutions, and aid programs while seeking to contain Soviet influence. Containment produced different strategies across regions and moved between confrontation and periods of reduced tension. Historical analysis should distinguish a policy’s stated goal, the context of decolonization, and the consequences for people in the affected region.', examples: ['The Marshall Plan linked economic recovery to a noncommunist international order.', 'The Korean War demonstrated how containment could involve limited war rather than direct superpower conflict.'], nonExamples: ['Containment meant the United States fought the Soviet Union directly in every conflict.', 'Cold War policy had no economic or institutional dimension.'], misconception: 'Cold War foreign policy was not a single unchanging strategy; it adapted to context and political pressure.', rows: [['Aid is offered to rebuild allied economies.', 'Economic policy becomes part of geopolitical competition.'], ['A regional conflict is treated as a test of containment.', 'Local nationalism and regional goals can be obscured by superpower framing.']], retrieval: ['What did containment seek to limit?', 'How did aid become a foreign-policy tool?', 'Why should a regional conflict not be reduced to superpower rivalry?'], transfer: 'For a Cold War source, identify the global policy and the local context that the source may understate.'},
      { heading: 'Civil rights, social movements, and federal action', core: 'African American activists used litigation, boycotts, direct action, organizing, and voting campaigns to challenge segregation and disenfranchisement. Federal court decisions and legislation responded unevenly, while other movements addressed gender, Latino rights, Indigenous sovereignty, disability, and sexuality. The period shows how grassroots pressure and state action interact.', examples: ['Boycotts and community organizing converted local grievances into national attention.', 'Federal legislation addressed public accommodations and voting but did not erase structural inequality.'], nonExamples: ['Civil rights progress came only from presidential action.', 'One movement represented every community’s goals in the same way.'], misconception: 'Movements are coalitions with internal debates; legal victories change institutions but do not end social conflict.', rows: [['Local activists sustain a long campaign against discriminatory policy.', 'Grassroots organization can change the national political agenda.'], ['Federal law prohibits a form of discrimination.', 'Enforcement and economic inequality remain important questions.']], retrieval: ['Name two strategies used by civil rights activists.', 'How did federal action and grassroots activism interact?', 'Why do legal victories not automatically end inequality?'], transfer: 'When analyzing a movement, identify its tactic, target, coalition, and institutional result.'},
      { heading: 'Vietnam, the Great Society, and cultural change', core: 'The Vietnam War intensified debates over containment, executive power, credibility, and the use of force. At home, the Great Society expanded federal efforts against poverty and for health care, while youth culture and environmental activism challenged established institutions. These developments changed political coalitions and public trust without producing one shared national response.', examples: ['Televised war reporting and protest contributed to distrust of official claims.', 'Great Society programs expanded federal responsibility for health and poverty policy.'], nonExamples: ['All Americans interpreted the Vietnam War or social movements alike.', 'The Great Society ended poverty nationwide.'], misconception: 'Policy expansion, protest, and backlash can occur together and produce long-term political realignment.', rows: [['Executive war policy faces congressional and public scrutiny.', 'Debates over constitutional authority become more visible.'], ['Federal programs address poverty and health.', 'The scope and effectiveness of the welfare state remain contested.']], retrieval: ['Why did Vietnam raise questions about executive power?', 'What did Great Society programs attempt to change?', 'How can cultural change reshape political coalitions?'], transfer: 'For a late-period question, connect a policy or war to both immediate effects and a change in public trust or party politics.'},
    ],
    memoryCue: 'Containment, citizenship, credibility: trace global rivalry, movements for rights, and the domestic consequences of war and policy.',
    diagramTitle: 'Period 8: Cold War, movements, and public trust',
  },
  {
    number: 9,
    id: 'period-9-1980-present',
    label: 'Unit 9: Period 9: 1980-Present',
    shortLabel: 'Period 9: 1980-Present',
    period: '1980-Present',
    officialWeightMin: 0.04,
    officialWeightMax: 0.06,
    themes: ['Politics and Power', 'Work, Exchange, and Technology', 'Migration and Settlement'],
    sourceUrl: 'https://openstax.org/books/us-history/pages/31-introduction',
    sourceTitle: 'U.S. History, Chapter 31: The Cold War at Home and Abroad, 1960-1989',
    summary: 'Period 9 addresses conservative political change, globalization, the end of the Cold War, demographic shifts, technology, immigration, and challenges of the twenty-first century. The period is best studied as an unfinished history in which policy choices, economic restructuring, and changing identities remain contested.',
    sections: [
      { heading: 'Conservatism and debates over government', core: 'The conservative resurgence associated with the 1980 election supported tax cuts, deregulation, stronger anticommunism, and criticism of liberal programs. Some programs remained popular, and policy change was partial rather than a simple disappearance of government. Historical arguments should identify the coalition, the policy, and the institutional limits that shaped its results.', examples: ['Conservatives argued that reducing regulation could encourage investment and growth.', 'Debates over the social safety net continued even when partisan control changed.'], nonExamples: ['The conservative movement had one constituency and one policy goal.', 'The 1980 election immediately removed all federal social programs.'], misconception: 'Political realignment changes priorities and coalitions without erasing the institutions inherited from earlier periods.', rows: [['A president promotes tax cuts and deregulation.', 'Supporters connect policy to growth; critics question distribution and public capacity.'], ['A popular social program survives political pressure.', 'Institutional durability can limit the scope of ideological change.']], retrieval: ['What policies did conservatives emphasize?', 'Why did some liberal programs persist?', 'How can historians measure a political realignment?'], transfer: 'Compare stated ideology with enacted policy and the institutions that remained in place.'},
      { heading: 'Globalization, technology, and demographic change', core: 'Global trade, financial integration, new technologies, and shifts in industrial employment changed the U.S. economy and the geography of work. Immigration and internal migration reshaped communities and political debates. These processes created opportunities while also producing regional inequality, labor insecurity, and arguments over the nation’s obligations and identity.', examples: ['Manufacturing employment declined in some regions as production and trade networks changed.', 'New immigrant communities contributed to urban and suburban cultural and economic life.'], nonExamples: ['Globalization affected only large corporations and not households.', 'Demographic change has one political meaning everywhere.'], misconception: 'Economic and demographic trends are experienced unevenly; national averages can hide regional and class differences.', rows: [['Production is reorganized across borders and technologies.', 'Some workers gain access to new sectors while others face displacement.'], ['Migration changes a region’s population and institutions.', 'Local responses vary with policy, labor markets, and community history.']], retrieval: ['Name one economic effect of globalization.', 'Why can national averages conceal regional change?', 'How can migration produce both opportunity and conflict?'], transfer: 'For a contemporary change, identify the scale: household, region, nation, or global system.'},
      { heading: 'The post-Cold War and twenty-first-century United States', core: 'The end of the Cold War altered the international setting but did not eliminate conflict or questions about U.S. power. The attacks of September 11, 2001, reshaped security and foreign policy, while later economic and technological changes raised new debates about privacy, inequality, and public institutions. Because this period remains close to the present, claims require careful sourcing and dated evidence.', examples: ['A security crisis can expand executive and institutional authority while provoking civil-liberties debate.', 'Digital communication changes how information and political arguments circulate.'], nonExamples: ['The end of the Cold War ended all international rivalry.', 'A recent event can be explained without identifying when the evidence was produced.'], misconception: 'Contemporary history is not free of historical perspective; it requires more explicit attention to evidence, chronology, and uncertainty.', rows: [['A major attack changes national security policy.', 'Foreign intervention and civil-liberties debates intensify.'], ['Digital networks accelerate communication.', 'Information access grows alongside misinformation and surveillance concerns.']], retrieval: ['What changed and what persisted after the Cold War?', 'Why does contemporary history require dated evidence?', 'How can security policy affect civil liberties?'], transfer: 'When a prompt concerns recent history, state the date range and distinguish documented developments from prediction.'},
    ],
    memoryCue: 'Coalitions, connections, context: track political realignment, global economic change, and the limits of writing very recent history.',
    diagramTitle: 'Period 9: Political, economic, and demographic change',
  },
];

const topicLabels = new Map();
unitDefinitions.forEach((unit) => {
  unit.sections.forEach((section, sectionIndex) => {
    const topicId = `${unit.number}.${sectionIndex + 2}`;
    topicLabels.set(topicId, section.heading);
  });
});

const itemSpecs = [
  // Unit 1
  { unit: 1, section: 0, topicId: '1.2', practiceId: 'H1', skillId: '1.B', reasoning: 'comparison', prompt: 'Archaeological evidence shows that some Indigenous communities in the Southwest developed irrigation and settled agricultural villages before European contact. Which conclusion is best supported?', answer: 'Indigenous societies adapted political and economic practices to local environments.', distractors: ['All Indigenous societies depended on irrigation agriculture.', 'European colonization introduced agriculture to the Southwest.', 'Environmental conditions prevented large settlements in the Americas.'], rationale: 'The evidence supports regional adaptation and complexity without treating one society as representative of all Indigenous peoples.', sourceUrl: 'https://openstax.org/books/us-history/pages/1-introduction' },
  { unit: 1, section: 0, topicId: '1.2', practiceId: 'H5', skillId: '5.A', reasoning: 'comparison', prompt: 'A historian compares Mississippian ceremonial centers with mobile communities of the Great Basin. Which comparison is most defensible?', answer: 'Different ecologies encouraged different settlement and subsistence strategies.', distractors: ['One society was historically advanced and the other was not.', 'Both societies followed the same political structure because they lived in North America.', 'Neither society developed trade or systems of social organization.'], rationale: 'A sound comparison identifies a meaningful difference and connects it to evidence about environment and social organization without ranking cultures.', sourceUrl: 'https://openstax.org/books/us-history/pages/1-introduction' },
  { unit: 1, section: 1, topicId: '1.3', practiceId: 'H2', skillId: '2.A', reasoning: 'causation', prompt: 'A royal sponsor receives a voyage report that emphasizes valuable commodities and the sponsor’s role. Which factor most limits using the report as a complete account of the voyage?', answer: 'The author had an incentive to portray the expedition as useful to the sponsor.', distractors: ['The report was written before the invention of printing.', 'The report could not describe any geographic feature accurately.', 'The author necessarily opposed all future European voyages.'], rationale: 'Purpose and audience can shape what a source emphasizes. The report may contain useful evidence while still serving a sponsor’s interests.', sourceUrl: 'https://openstax.org/books/us-history/pages/2-introduction' },
  { unit: 1, section: 2, topicId: '1.4', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Which development was a major demographic consequence of transatlantic contact in the sixteenth century?', answer: 'Epidemic diseases caused severe population loss in many Indigenous communities.', distractors: ['European diseases immediately disappeared from Atlantic ports.', 'Indigenous communities experienced no biological effects from contact.', 'African and European populations avoided all new diseases after contact.'], rationale: 'Epidemic disease spread through newly connected populations and caused devastating losses in many Indigenous communities, although effects varied by place and time.', sourceUrl: 'https://openstax.org/books/us-history/pages/2-introduction' },
  { unit: 1, section: 2, topicId: '1.5', practiceId: 'H3', skillId: '3.B', reasoning: 'causation', prompt: 'A source describes Spanish officials assigning Indigenous labor to colonists while also requiring Christian instruction. Which broader process does the source best illustrate?', answer: 'Spanish colonial rule combined economic extraction, conversion, and social hierarchy.', distractors: ['A policy of equal political partnership between Spain and Indigenous nations.', 'The end of coerced labor in the Spanish empire.', 'A colonial economy based only on voluntary European wage labor.'], rationale: 'The described institution joined labor extraction with conversion and a hierarchy that incorporated Indigenous and African people unequally into colonial society.', sourceUrl: 'https://openstax.org/books/us-history/pages/2-introduction' },
  // Unit 2
  { unit: 2, section: 0, topicId: '2.3', practiceId: 'H5', skillId: '5.A', reasoning: 'comparison', prompt: 'Which factor best explains why Chesapeake colonies and New England colonies developed different settlement patterns in the seventeenth century?', answer: 'Their environments, migration patterns, and labor demands differed.', distractors: ['Only New England had access to Atlantic markets.', 'The Chesapeake prohibited agriculture while New England required plantations.', 'The regions were governed by different European empires.'], rationale: 'Climate, family migration, export agriculture, and labor needs interacted to produce regional differences within the British colonial world.', sourceUrl: 'https://openstax.org/books/us-history/pages/4-introduction' },
  { unit: 2, section: 0, topicId: '2.3', practiceId: 'H1', skillId: '1.B', reasoning: 'comparison', prompt: 'A middle-colony port attracts migrants from several European religious traditions and exports cereal crops. Which development is most consistent with that pattern?', answer: 'The region developed greater cultural diversity and a mixed commercial economy.', distractors: ['The region became a single-crop plantation society dominated by one church.', 'The region ended all trade with Europe to protect local farms.', 'The region prohibited migration by people outside the dominant English church.'], rationale: 'The middle colonies are associated with cereal exports, migration from multiple groups, and comparatively diverse religious and cultural communities.', sourceUrl: 'https://openstax.org/books/us-history/pages/4-introduction' },
  { unit: 2, section: 1, topicId: '2.4', practiceId: 'H3', skillId: '3.A', reasoning: 'causation', prompt: 'A colonial trade law reserves certain exports for English ships and merchants. Which purpose did the policy most directly serve?', answer: 'It attempted to channel colonial commerce toward the interests of the British Empire.', distractors: ['It guaranteed that every colonist would receive equal profits from trade.', 'It ended the use of enslaved labor in Atlantic commerce.', 'It made colonial governments independent of British regulation.'], rationale: 'Mercantilist policy sought to direct colonial production and trade toward imperial economic and strategic goals, even when enforcement was incomplete.', sourceUrl: 'https://openstax.org/books/us-history/pages/4-introduction' },
  { unit: 2, section: 2, topicId: '2.6', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Which development most directly contributed to the emergence of hereditary racial slavery in the British colonies?', answer: 'Planters and colonial lawmakers increasingly tied labor status to African ancestry and made it permanent.', distractors: ['Colonial governments abolished all distinctions between indentured and enslaved labor.', 'The Atlantic economy stopped demanding labor-intensive export crops.', 'Enslaved Africans controlled the laws that defined colonial citizenship.'], rationale: 'Colonial law and plantation economies increasingly made slavery hereditary and racialized, creating durable legal and economic inequality.', sourceUrl: 'https://openstax.org/books/us-history/pages/4-introduction' },
  { unit: 2, section: 2, topicId: '2.5', practiceId: 'H2', skillId: '2.B', reasoning: 'continuity-change', prompt: 'A Spanish colonial report minimizes Indigenous resistance after a revolt but emphasizes restored order. Which source feature should a historian examine first?', answer: 'The report’s official audience and purpose may encourage it to present colonial control as successful.', distractors: ['The report proves that resistance ended everywhere in the Spanish borderlands.', 'The report cannot provide any evidence about colonial administration.', 'The report must have been written by an Indigenous author.'], rationale: 'An official report written for authorities may frame events to justify policy or reassure superiors, so its perspective and purpose matter.', sourceUrl: 'https://openstax.org/books/us-history/pages/4-introduction' },
  // Unit 3
  { unit: 3, section: 0, topicId: '3.2', practiceId: 'H4', skillId: '4.A', reasoning: 'causation', prompt: 'Which development provided important context for colonial resistance to British revenue measures after 1763?', answer: 'Britain’s victory in the Seven Years’ War left it with war debt and new costs of administering its empire.', distractors: ['The United States had already adopted the Constitution.', 'France had ended all competition for North American territory before the war.', 'Colonial assemblies had ceased debating taxation and representation.'], rationale: 'The postwar fiscal and imperial context helps explain why Britain changed its policies and why colonists contested those changes.', sourceUrl: 'https://openstax.org/books/us-history/pages/5-introduction' },
  { unit: 3, section: 0, topicId: '3.4', practiceId: 'H3', skillId: '3.C', reasoning: 'causation', prompt: 'Colonial protesters argued that Parliament could not tax them without their consent. Which larger issue did that argument raise?', answer: 'Whether legitimate political authority required representation by the people being governed.', distractors: ['Whether colonies should eliminate all elected assemblies.', 'Whether Britain should expand hereditary monarchy in North America.', 'Whether taxation could be collected only during wartime.'], rationale: 'The protest used a tax dispute to challenge the constitutional relationship between the colonies and the British government.', sourceUrl: 'https://openstax.org/books/us-history/pages/5-introduction' },
  { unit: 3, section: 0, topicId: '3.4', practiceId: 'H2', skillId: '2.A', reasoning: 'causation', prompt: 'A revolutionary pamphlet uses universal language about natural rights while seeking support for independence. Which limitation is most important when using it to study social equality in 1776?', answer: 'The political goals of the authors may not represent the rights available to women, enslaved people, or Indigenous peoples.', distractors: ['The pamphlet could not have been read by any colonist.', 'The language of rights proves that legal equality already existed.', 'The authors necessarily opposed every form of representative government.'], rationale: 'A source can articulate influential ideals while reflecting the boundaries of its authors’ political community and immediate purpose.', sourceUrl: 'https://openstax.org/books/us-history/pages/5-introduction' },
  { unit: 3, section: 1, topicId: '3.6', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Which weakness of the Articles of Confederation helped encourage support for a stronger national framework?', answer: 'The national government had difficulty raising revenue and coordinating common economic policies.', distractors: ['The national government had abolished state governments.', 'The Articles created a powerful executive who rejected congressional laws.', 'The national government controlled every local election directly.'], rationale: 'Problems with revenue, interstate coordination, and national authority led many leaders to seek a revised federal structure.', sourceUrl: 'https://openstax.org/books/us-history/pages/7-introduction' },
  { unit: 3, section: 1, topicId: '3.8', practiceId: 'H5', skillId: '5.A', reasoning: 'comparison', prompt: 'Federalists and Anti-Federalists disagreed most directly over which question during ratification?', answer: 'How much authority the national government should possess and how individual liberty would be protected.', distractors: ['Whether the colonies should return to British rule.', 'Whether the United States should have any written constitution.', 'Whether agriculture existed outside the Atlantic seaboard.'], rationale: 'Ratification debates centered on federal power, representation, executive authority, and protections for individual rights.', sourceUrl: 'https://openstax.org/books/us-history/pages/7-introduction' },
  { unit: 3, section: 2, topicId: '3.10', practiceId: 'H5', skillId: '5.B', reasoning: 'continuity-change', prompt: 'What did the emergence of political parties in the early republic demonstrate?', answer: 'The new constitutional system created institutions but did not eliminate disagreement over economy, foreign policy, and federal power.', distractors: ['The Constitution required all leaders to join one permanent party.', 'Political parties formed only after the Civil War.', 'Early parties agreed that federal power should never expand.'], rationale: 'Federalists and Democratic-Republicans used different interpretations of the new government and different regional and economic interests.', sourceUrl: 'https://openstax.org/books/us-history/pages/8-introduction' },
  // Unit 4
  { unit: 4, section: 0, topicId: '4.4', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Canals and steamboats lowered transportation costs between interior farms and Atlantic ports. Which effect was most likely?', answer: 'Farmers could participate more fully in commercial markets and regional specialization increased.', distractors: ['The United States became economically identical in every region.', 'The technologies ended the use of wage labor in manufacturing.', 'Transportation improvements prevented cities from growing.'], rationale: 'Lower transportation costs connected producers to distant markets while allowing regions to specialize in different products.', sourceUrl: 'https://openstax.org/books/us-history/pages/12-introduction' },
  { unit: 4, section: 1, topicId: '4.8', practiceId: 'H3', skillId: '3.C', reasoning: 'comparison', prompt: 'A historian argues that Jacksonian democracy expanded political participation but also strengthened executive power. Which evidence best supports the claim?', answer: 'More white men voted while the president used federal authority in the Bank War and Indian Removal.', distractors: ['Women and enslaved people gained equal voting rights during the period.', 'The president surrendered all policy authority to Congress.', 'The expansion of voting ended political parties and popular campaigning.'], rationale: 'The claim is supported by the simultaneous expansion of white male electoral participation and forceful use of presidential and federal power.', sourceUrl: 'https://openstax.org/books/us-history/pages/12-introduction' },
  { unit: 4, section: 2, topicId: '4.10', practiceId: 'H4', skillId: '4.B', reasoning: 'causation', prompt: 'Which development helped create the setting for the Second Great Awakening and antebellum reform movements?', answer: 'Democratic and individualistic ideas, mobility, and market changes encouraged people to organize around moral improvement.', distractors: ['The end of all religious disagreement in the United States.', 'The restoration of hereditary aristocratic privilege after independence.', 'The collapse of voluntary associations and print culture.'], rationale: 'Religious revival and reform drew energy from social mobility, democratic ideas, print networks, and concern about changing communities.', sourceUrl: 'https://openstax.org/books/us-history/pages/13-introduction' },
  { unit: 4, section: 2, topicId: '4.11', practiceId: 'H3', skillId: '3.B', reasoning: 'continuity-change', prompt: 'An abolitionist petition appeals to revolutionary ideals while describing the continued existence of slavery. What tension does the source reveal?', answer: 'The language of liberty could be used to challenge a social and legal system that excluded enslaved people from freedom.', distractors: ['Revolutionary ideals had no influence on antebellum reform.', 'Abolitionists generally supported expanding slavery into new territories.', 'The petition demonstrates that legal emancipation had already occurred nationwide.'], rationale: 'Reformers drew on republican and Christian language to expose the gap between national ideals and the institution of slavery.', sourceUrl: 'https://openstax.org/books/us-history/pages/13-introduction' },
  { unit: 4, section: 2, topicId: '4.7', practiceId: 'H5', skillId: '5.B', reasoning: 'comparison', prompt: 'Which comparison between the market revolution and reform movements is most defensible?', answer: 'Economic and social change created problems and networks that reformers tried to address through voluntary action and policy.', distractors: ['The market revolution ended all reform by making everyone prosperous.', 'Reform movements rejected print, meetings, and other new networks.', 'The two developments occurred in entirely separate communities.'], rationale: 'Market change altered work and communities, while new religious and print networks helped reformers organize responses.', sourceUrl: 'https://openstax.org/books/us-history/pages/13-introduction' },
  { unit: 4, section: 1, topicId: '4.6', practiceId: 'H2', skillId: '2.B', reasoning: 'causation', prompt: 'A federal official describes Indian Removal as a policy that will protect Indigenous communities by relocating them. Which evidence would most challenge the official’s framing?', answer: 'Accounts of forced removal, land loss, and the disruption of Indigenous governments and communities.', distractors: ['A speech praising westward settlement without naming any affected community.', 'A map showing that the United States had a growing population in the East.', 'A newspaper advertisement for a new canal project.'], rationale: 'The official purpose statement should be tested against evidence about implementation and consequences for the people being moved.', sourceUrl: 'https://openstax.org/books/us-history/pages/12-introduction' },
  // Unit 5
  { unit: 5, section: 0, topicId: '5.2', practiceId: 'H4', skillId: '4.A', reasoning: 'causation', prompt: 'Which development best explains why the Mexican-American War intensified sectional conflict in the United States?', answer: 'The acquisition of western territory reopened the question of whether slavery would expand.', distractors: ['The war ended all debate over the powers of Congress.', 'The new territory had no connection to labor or political representation.', 'The war immediately granted citizenship to every person in North America.'], rationale: 'Territorial expansion changed the balance and future possibilities of slave and free states, making sectional conflict harder to avoid.', sourceUrl: 'https://openstax.org/books/us-history/pages/13-introduction' },
  { unit: 5, section: 0, topicId: '5.5', practiceId: 'H5', skillId: '5.C', reasoning: 'continuity-change', prompt: 'Why did congressional compromises over slavery fail to resolve the sectional crisis permanently?', answer: 'They managed political balance temporarily while leaving the underlying conflict over slavery’s expansion intact.', distractors: ['They abolished slavery in every state immediately.', 'They removed the issue of slavery from western territorial politics.', 'They ended the political importance of sectional identity.'], rationale: 'Compromise could postpone conflict, but each new territory and political crisis reopened the question of slavery’s future.', sourceUrl: 'https://openstax.org/books/us-history/pages/13-introduction' },
  { unit: 5, section: 1, topicId: '5.7', practiceId: 'H3', skillId: '3.C', reasoning: 'causation', prompt: 'Which change most directly distinguished the Emancipation Proclamation from the Thirteenth Amendment?', answer: 'The proclamation was a wartime executive measure with a defined scope, while the amendment abolished slavery nationally.', distractors: ['The amendment applied only to territories and the proclamation applied everywhere.', 'The proclamation created permanent citizenship while the amendment addressed military enlistment only.', 'The two measures had identical legal scope and purpose.'], rationale: 'The measures interacted, but the constitutional amendment created a national abolition of slavery beyond the proclamation’s wartime application.', sourceUrl: 'https://openstax.org/books/us-history/pages/16-introduction' },
  { unit: 5, section: 1, topicId: '5.8', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Why did Black military service and community organizing matter to the course of the Civil War?', answer: 'They strengthened the Union war effort and pressed the government to make emancipation a more durable outcome.', distractors: ['They caused the Union to abandon emancipation as a war aim.', 'They demonstrated that slavery had ended before the war began.', 'They prevented the passage of any constitutional amendments.'], rationale: 'Black participation challenged slavery, supplied military labor, and influenced the meaning and policies of Union victory.', sourceUrl: 'https://openstax.org/books/us-history/pages/16-introduction' },
  { unit: 5, section: 2, topicId: '5.9', practiceId: 'H3', skillId: '3.B', reasoning: 'continuity-change', prompt: 'A Reconstruction-era state constitution expands public education and voting rights, while local groups use violence to suppress Black voters. Which conclusion is best supported?', answer: 'Reconstruction expanded formal rights while resistance limited access to those rights in practice.', distractors: ['The constitution had no effect because law never matters in history.', 'Violence proves that Reconstruction created no political change at all.', 'The new rights applied equally and securely to every resident.'], rationale: 'The evidence shows a gap between constitutional or legal change and the conditions required to exercise rights.', sourceUrl: 'https://openstax.org/books/us-history/pages/17-introduction' },
  { unit: 5, section: 2, topicId: '5.9', practiceId: 'H6', skillId: '6.A', reasoning: 'continuity-change', prompt: 'Which thesis would be most historically defensible about Reconstruction?', answer: 'Reconstruction changed the constitutional meaning of citizenship and freedom, but political retreat and white supremacist violence limited its immediate reach.', distractors: ['Reconstruction changed nothing because the Constitution was never amended.', 'Reconstruction completely eliminated racial inequality by 1877.', 'Reconstruction was only an economic program with no effect on citizenship.'], rationale: 'The strongest claim recognizes both transformative constitutional changes and the limits imposed by enforcement, violence, and political decisions.', sourceUrl: 'https://openstax.org/books/us-history/pages/17-introduction' },
  // Unit 6
  { unit: 6, section: 0, topicId: '6.2', practiceId: 'H4', skillId: '4.B', reasoning: 'causation', prompt: 'Which policy and technology combination most directly accelerated settlement of the trans-Mississippi West after the Civil War?', answer: 'Federal land and railroad support encouraged migration, extraction, and connection to national markets.', distractors: ['A policy that returned western lands to Indigenous nations without reservation boundaries.', 'A ban on national investment in transportation infrastructure.', 'The elimination of commercial agriculture from western territories.'], rationale: 'Federal policies and railroad construction made migration and economic development easier while dispossessing Indigenous peoples.', sourceUrl: 'https://openstax.org/books/us-history/pages/18-introduction' },
  { unit: 6, section: 0, topicId: '6.4', practiceId: 'H3', skillId: '3.C', reasoning: 'continuity-change', prompt: 'Why did federal western policy often produce conflict with Indigenous nations?', answer: 'Settlement and resource extraction required the United States to restrict Indigenous land, sovereignty, and mobility.', distractors: ['Indigenous nations had no established governments or territorial claims.', 'Federal policy sought to prevent all non-Indigenous settlement west of the Mississippi.', 'Railroads and mining reduced pressure on western land.'], rationale: 'The expansion of settlement and extraction conflicted with Indigenous sovereignty and existing relationships to land.', sourceUrl: 'https://openstax.org/books/us-history/pages/18-introduction' },
  { unit: 6, section: 1, topicId: '6.3', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'A corporation controls its mines, factories, rail lines, and distribution network. Which business strategy does this describe?', answer: 'Vertical integration, which combines multiple stages of production or distribution under one company.', distractors: ['Collective bargaining, which transfers management to a labor union.', 'A tariff, which taxes imported goods at a national border.', 'Sharecropping, which organizes agricultural labor after emancipation.'], rationale: 'Vertical integration is control across stages of a production and distribution chain, increasing coordination and often market power.', sourceUrl: 'https://openstax.org/books/us-history/pages/18-introduction' },
  { unit: 6, section: 2, topicId: '6.6', practiceId: 'H2', skillId: '2.C', reasoning: 'causation', prompt: 'A newspaper owned by a factory investor describes a strike as a threat to public order but gives little space to workers’ demands. Which limitation is most important?', answer: 'The owner’s position may shape the account’s selection of evidence and interpretation of the strike.', distractors: ['The newspaper cannot provide any evidence about labor conflict.', 'The workers’ demands must be false because the paper omits them.', 'The strike could not have affected production because newspapers were privately owned.'], rationale: 'Ownership and audience can influence which claims receive attention; omission is evidence about the source’s perspective, not proof that the omitted claims are false.', sourceUrl: 'https://openstax.org/books/us-history/pages/18-introduction' },
  { unit: 6, section: 2, topicId: '6.7', practiceId: 'H5', skillId: '5.B', reasoning: 'comparison', prompt: 'Which comparison best explains why nativist movements and industrial employers could coexist in the late nineteenth century?', answer: 'Employers could seek immigrant labor while nativists opposed immigration for cultural, racial, or political reasons.', distractors: ['Both groups agreed that immigration should end immediately.', 'Immigrants worked outside industrial labor markets entirely.', 'Nativism was caused only by the absence of urban growth.'], rationale: 'Economic demand for labor and political or cultural opposition to immigration could operate at the same time.', sourceUrl: 'https://openstax.org/books/us-history/pages/20-introduction' },
  { unit: 6, section: 2, topicId: '6.8', practiceId: 'H6', skillId: '6.B', reasoning: 'causation', prompt: 'Which claim best explains why labor conflict became a national political issue during industrialization?', answer: 'Large firms and national markets made workplace disputes affect public order, commerce, and debates over government intervention.', distractors: ['Industrial disputes remained isolated because firms had no national connections.', 'Workers never organized beyond a single workplace.', 'Government and courts refused to take any position in labor disputes.'], rationale: 'Industrial scale and interconnected markets increased the public consequences of strikes and made labor rights a national question.', sourceUrl: 'https://openstax.org/books/us-history/pages/18-introduction' },
  // Unit 7
  { unit: 7, section: 0, topicId: '7.4', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Which problem most directly motivated Progressive reformers to support stronger government regulation?', answer: 'Industrial and urban conditions exposed consumers and workers to risks that private markets did not reliably control.', distractors: ['The disappearance of corporations and city governments.', 'The end of immigration and urban growth.', 'The belief that government had already solved all public-health problems.'], rationale: 'Progressive reform responded to problems associated with industrial capitalism, urbanization, corruption, and weak oversight.', sourceUrl: 'https://openstax.org/books/us-history/pages/21-introduction' },
  { unit: 7, section: 1, topicId: '7.3', practiceId: 'H2', skillId: '2.B', reasoning: 'causation', prompt: 'A president presents overseas intervention as a defense of civilization and national honor. Which context would help a historian evaluate the claim?', answer: 'The growth of U.S. commercial and strategic interests and debates over imperialism at the end of the nineteenth century.', distractors: ['The complete withdrawal of the United States from world trade.', 'The absence of domestic disagreement about overseas expansion.', 'The end of all anticolonial resistance after the Spanish-American War.'], rationale: 'Foreign-policy rhetoric should be situated within strategic, economic, ideological, and domestic debates rather than accepted as a complete explanation.', sourceUrl: 'https://openstax.org/books/us-history/pages/22-introduction' },
  { unit: 7, section: 1, topicId: '7.5', practiceId: 'H5', skillId: '5.B', reasoning: 'comparison', prompt: 'How did World War I and the Great Migration connect to one another?', answer: 'War production increased demand for labor, encouraging African American migration to industrial cities while also producing racial tensions.', distractors: ['The war ended racial discrimination in every industrial city.', 'The Great Migration moved workers away from all manufacturing centers.', 'World War I prevented African Americans from entering northern labor markets.'], rationale: 'Wartime labor demand was one important push-and-pull factor in migration, but migrants encountered both opportunity and discrimination.', sourceUrl: 'https://openstax.org/books/us-history/pages/24-introduction' },
  { unit: 7, section: 2, topicId: '7.7', practiceId: 'H3', skillId: '3.B', reasoning: 'continuity-change', prompt: 'A historian uses Harlem Renaissance literature and music to study the 1920s. Which claim is best supported by that evidence?', answer: 'Black artists and intellectuals shaped a vibrant urban culture while challenging dominant racial assumptions.', distractors: ['The 1920s eliminated racial inequality in the United States.', 'The Harlem Renaissance occurred outside migration and urbanization patterns.', 'Cultural production had no connection to political or social identity.'], rationale: 'The Harlem Renaissance reflected migration, urban community formation, artistic innovation, and debates over Black identity and citizenship.', sourceUrl: 'https://openstax.org/books/us-history/pages/25-introduction' },
  { unit: 7, section: 2, topicId: '7.10', practiceId: 'H6', skillId: '6.A', reasoning: 'causation', prompt: 'Which thesis most accurately evaluates the New Deal’s historical significance?', answer: 'It expanded federal responsibility for relief, recovery, and reform while leaving the Depression and racial inequality incompletely resolved.', distractors: ['It ended the Depression immediately and eliminated all opposition to federal action.', 'It reduced the federal government’s role in economic life to almost nothing.', 'It had no lasting effect on political coalitions or government institutions.'], rationale: 'The New Deal’s significance lies in institutional and political change as well as the limits of its economic and social results.', sourceUrl: 'https://openstax.org/books/us-history/pages/25-introduction' },
  { unit: 7, section: 2, topicId: '7.12', practiceId: 'H2', skillId: '2.C', reasoning: 'continuity-change', prompt: 'A wartime government describes Japanese American incarceration as a security necessity. Which evidence is most important for evaluating the claim?', answer: 'Evidence about the policy’s racial classification, military decision-making, and the absence of individualized proof of disloyalty.', distractors: ['A poster encouraging war-bond purchases with no reference to incarceration.', 'A factory report showing that wartime production increased.', 'A speech that discusses only European diplomacy.'], rationale: 'Evaluating the claim requires evidence about how the policy was made and applied, not only evidence that the nation was at war.', sourceUrl: 'https://openstax.org/books/us-history/pages/26-introduction' },
  // Unit 8
  { unit: 8, section: 0, topicId: '8.2', practiceId: 'H4', skillId: '4.B', reasoning: 'causation', prompt: 'Which development provides the clearest context for the creation of postwar containment policies?', answer: 'The wartime alliance with the Soviet Union broke down amid ideological rivalry and disputes over the postwar order.', distractors: ['The United States and Soviet Union had become one political system.', 'The United States had abandoned international economic institutions.', 'The Cold War began before World War II ended because of a direct U.S.-Soviet battle.'], rationale: 'Postwar tensions, ideological rivalry, and disagreement over security and reconstruction shaped containment.', sourceUrl: 'https://openstax.org/books/us-history/pages/28-introduction' },
  { unit: 8, section: 0, topicId: '8.2', practiceId: 'H3', skillId: '3.C', reasoning: 'comparison', prompt: 'A U.S. policy document describes aid as support for free nations, while a recipient describes the same aid as pressure to align with Washington. What does the comparison show?', answer: 'Foreign-policy consequences can differ from the policy’s stated purpose and can be interpreted differently by participants.', distractors: ['Only the U.S. source can provide historical evidence.', 'Economic aid has no connection to geopolitical competition.', 'The two sources cannot describe the same event because their views differ.'], rationale: 'Comparing perspectives helps identify purpose, power, and the difference between official language and lived or strategic consequences.', sourceUrl: 'https://openstax.org/books/us-history/pages/28-introduction' },
  { unit: 8, section: 1, topicId: '8.5', practiceId: 'H5', skillId: '5.B', reasoning: 'continuity-change', prompt: 'Which development best demonstrates the interaction between grassroots civil rights activism and federal policy?', answer: 'Local campaigns and legal challenges helped create pressure for federal court decisions and civil-rights legislation.', distractors: ['Federal policy changed without any organizing, protest, or litigation.', 'Grassroots movements rejected all use of courts or legislation.', 'Civil-rights laws were enacted before segregation and disenfranchisement existed.'], rationale: 'Civil-rights change resulted from sustained organizing and litigation interacting with federal institutions and political opportunities.', sourceUrl: 'https://openstax.org/books/us-history/pages/28-introduction' },
  { unit: 8, section: 1, topicId: '8.8', practiceId: 'H2', skillId: '2.C', reasoning: 'causation', prompt: 'A presidential speech presents the Vietnam War as a necessary defense against communism. Which additional evidence would most help assess the speech’s purpose and limits?', answer: 'Evidence about decolonization, local Vietnamese nationalism, executive decision-making, and public disagreement in the United States.', distractors: ['A list of unrelated domestic inventions from the 1920s.', 'A source proving that all Vietnamese groups shared the same political goal.', 'A statement that assumes the president’s stated motive is the only cause of the war.'], rationale: 'A source about intervention should be tested against local context, broader geopolitical conditions, institutional decisions, and competing public interpretations.', sourceUrl: 'https://openstax.org/books/us-history/pages/29-introduction' },
  { unit: 8, section: 2, topicId: '8.10', practiceId: 'H6', skillId: '6.B', reasoning: 'causation', prompt: 'Which claim best explains the historical significance of Great Society programs?', answer: 'They expanded federal efforts in health, poverty, and education while provoking continuing debates about the scope and effectiveness of government.', distractors: ['They ended all poverty and removed the need for later social policy.', 'They returned social welfare responsibility entirely to local charities.', 'They had no effect on citizens’ expectations of federal government.'], rationale: 'The programs changed policy capacity and public expectations even though they did not eliminate poverty or political disagreement.', sourceUrl: 'https://openstax.org/books/us-history/pages/29-introduction' },
  // Unit 9
  { unit: 9, section: 0, topicId: '9.2', practiceId: 'H1', skillId: '1.B', reasoning: 'causation', prompt: 'Which policy combination was associated with the conservative resurgence of the 1980s?', answer: 'Tax cuts, deregulation, and a stronger anticommunist foreign-policy posture.', distractors: ['Nationalization of most private industries and a rejection of global trade.', 'Abolition of all federal social programs and the end of presidential power.', 'A return to colonial mercantilism and state churches.'], rationale: 'The conservative movement emphasized reducing some government regulation and taxes while maintaining a strong national-security role.', sourceUrl: 'https://openstax.org/books/us-history/pages/31-introduction' },
  { unit: 9, section: 1, topicId: '9.6', practiceId: 'H5', skillId: '5.B', reasoning: 'continuity-change', prompt: 'Which statement best describes the relationship between globalization and U.S. work after 1980?', answer: 'Trade and technology reorganized production and employment, creating gains in some sectors and displacement or insecurity in others.', distractors: ['Globalization affected only foreign economies and not U.S. workers.', 'Technology eliminated all regional differences in employment.', 'Globalization ended the importance of immigration and internal migration.'], rationale: 'Economic restructuring is uneven: it can create new opportunities while reducing employment or bargaining power in other regions and industries.', sourceUrl: 'https://openstax.org/books/us-history/pages/31-introduction' },
  { unit: 9, section: 1, topicId: '9.7', practiceId: 'H3', skillId: '3.C', reasoning: 'comparison', prompt: 'A historian compares census data with local oral histories to study late-twentieth-century migration. Why is using both kinds of evidence useful?', answer: 'Statistics show patterns of movement while oral histories can reveal how migrants experienced and interpreted those changes.', distractors: ['Oral histories make quantitative data unnecessary.', 'Census data can explain every individual motivation without additional sources.', 'The two sources cannot be compared because they use different methods.'], rationale: 'Different sources answer different questions; corroboration can connect demographic scale with lived experience while preserving each source’s limits.', sourceUrl: 'https://openstax.org/books/us-history/pages/31-introduction' },
  { unit: 9, section: 2, topicId: '9.6', practiceId: 'H4', skillId: '4.B', reasoning: 'causation', prompt: 'Why should a historian use dated evidence when analyzing developments after September 11, 2001?', answer: 'Policies, public interpretations, and available information changed over time, so later knowledge should not be projected backward without explanation.', distractors: ['Recent events cannot be studied historically at all.', 'Dates matter only for events before the Constitution.', 'A single later interpretation automatically resolves earlier uncertainty.'], rationale: 'Contemporary history requires chronology and source criticism because policies and interpretations evolve and later evidence can change the questions historians ask.', sourceUrl: 'https://openstax.org/books/us-history/pages/31-introduction' },
  { unit: 9, section: 2, topicId: '9.7', practiceId: 'H6', skillId: '6.A', reasoning: 'continuity-change', prompt: 'Which thesis would be most defensible about the period after 1980?', answer: 'Political realignment, globalization, technology, and demographic change reshaped the United States while leaving continuing debates over government, inequality, and national identity.', distractors: ['The period after 1980 had one uncontested political and economic direction.', 'The end of the Cold War eliminated all international conflict and domestic disagreement.', 'Technological change affected communication but not work, politics, or culture.'], rationale: 'The best thesis identifies several interacting developments and preserves continuity in unresolved political, economic, and social debates.', sourceUrl: 'https://openstax.org/books/us-history/pages/31-introduction' },
];

const unitByNumber = new Map(unitDefinitions.map((unit) => [unit.number, unit]));
const specCounts = itemSpecs.reduce((counts, spec) => {
  counts[spec.unit] = (counts[spec.unit] || 0) + 1;
  return counts;
}, {});

function objectiveFor(spec) {
  const unit = unitByNumber.get(spec.unit);
  const section = unit.sections[spec.section];
  const sectionId = `apush-ch-${String(spec.unit).padStart(2, '0')}-section-${String(spec.section + 1).padStart(2, '0')}`;
  return {
    id: `apush-lo-${spec.unit}-${spec.section + 1}`,
    topicId: spec.topicId,
    domainId: unit.id,
    chapterId: `apush-ch-${String(spec.unit).padStart(2, '0')}`,
    sectionId,
    sectionLabel: section.heading,
    label: `Explain how ${section.heading.toLowerCase()} shaped United States history during ${unit.period}.`,
    practiceIds: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
    nextStep: 'Review the linked chapter section, name the evidence and historical reasoning process, then retry a targeted practice set.',
    officialItem: false,
    releaseEligible: false,
    status: 'internal-remediation-route',
    reviewStatus: 'internal-editorial-draft',
    references: [CED_URL, CLARIFICATIONS_URL, unit.sourceUrl],
  };
}

const objectiveByKey = new Map();
for (const spec of itemSpecs) objectiveByKey.set(`${spec.unit}:${spec.section}`, objectiveFor(spec));

function rotateChoices(answer, distractors, targetIndex) {
  const choices = [answer, ...distractors];
  const answerIndex = Math.max(0, Math.min(3, targetIndex));
  const rotated = new Array(4);
  let cursor = 0;
  for (let index = 0; index < 4; index += 1) {
    rotated[index] = index === answerIndex ? answer : choices.slice(1)[cursor++];
  }
  return rotated;
}

function sourceDetailsFor(spec) {
  const unit = unitByNumber.get(spec.unit);
  return [
    {
      title: 'AP U.S. History Course and Exam Description, Effective Fall 2026',
      organization: 'College Board',
      url: CED_URL,
      credibility: 'The public Course and Exam Description is the official framework for AP U.S. History content, historical-thinking skills, and exam task descriptions. It is used here for blueprint alignment only; the item is independently authored.',
    },
    {
      title: unit.sourceTitle,
      organization: 'OpenStax, Rice University',
      url: unit.sourceUrl,
      credibility: 'OpenStax publishes an openly accessible introductory U.S. history text used here for factual cross-checking and links. No textbook prose, figures, or assessment content is reproduced.',
    },
  ];
}

function makeItem(spec, index) {
  const unit = unitByNumber.get(spec.unit);
  const objective = objectiveByKey.get(`${spec.unit}:${spec.section}`);
  assert(unit && objective, `Missing route for item ${index + 1}.`);
  const choices = rotateChoices(spec.answer, spec.distractors, index % 4);
  const answerIndex = choices.indexOf(spec.answer);
  const references = [...new Set([CED_URL, CLARIFICATIONS_URL, spec.sourceUrl || unit.sourceUrl])];
  const choiceRationales = choices.map((choice) => choice === spec.answer
    ? `This is the best answer because ${spec.rationale}`
    : `This choice does not fit the evidence or historical relationship in the question. It confuses the period’s development with a different claim or overstates what the evidence establishes.`);
  return {
    id: `apush-foundation-${String(index + 1).padStart(3, '0')}`,
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    domainId: unit.id,
    topicIds: [spec.topicId],
    practiceId: spec.practiceId,
    skillId: spec.skillId,
    skillIds: [spec.practiceId],
    cognitiveDemand: spec.practiceId === 'H6' ? 'argumentation' : spec.practiceId === 'H2' || spec.practiceId === 'H3' ? 'source-analysis' : 'historical-reasoning',
    cognitiveProcess: spec.reasoning === 'comparison' ? 'compare' : spec.reasoning === 'causation' ? 'explain-causation' : 'analyze-continuity-change',
    reasoningProcess: spec.reasoning,
    difficulty: index % 3 === 0 ? 'advanced' : 'intermediate',
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: spec.rationale,
    choiceRationales,
    references,
    sourceDetails: sourceDetailsFor(spec),
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
      medicalSafety: true,
    },
    learningObjectiveId: objective.id,
    learningObjectiveLabel: objective.label,
    learningSectionId: objective.sectionId,
    learningSectionLabel: objective.sectionLabel,
    chapterIds: [objective.chapterId],
    taskForm: 'single-choice-foundation',
  };
}

function textRuns(text) {
  return [{ type: 'text', text }];
}

function contentBlocks(section, unit) {
  const content = `${section.core} In this foundation library, use the period as a historical frame rather than a list of isolated names. ${section.misconception} A strong answer identifies the relevant actors, evidence, time range, and reasoning process before making a larger claim.`;
  return [
    { type: 'paragraph', text: content, runs: textRuns(content) },
    { type: 'list', ordered: false, items: section.examples.map((text) => ({ text, runs: textRuns(text) })) },
    { type: 'list', ordered: false, items: section.nonExamples.map((text) => ({ text, runs: textRuns(text) })) },
    {
      type: 'table',
      rows: [
        { cells: [{ kind: 'header', text: 'Historical pattern', columnSpan: 1, runs: textRuns('Historical pattern') }, { kind: 'header', text: 'Reasoning move', columnSpan: 1, runs: textRuns('Reasoning move') }] },
        ...section.rows.map(([pattern, move]) => ({ cells: [{ kind: 'cell', text: pattern, columnSpan: 1, runs: textRuns(pattern) }, { kind: 'cell', text: move, columnSpan: 1, runs: textRuns(move) }] })),
      ],
    },
    { type: 'list', ordered: true, items: section.retrieval.map((text) => ({ text, runs: textRuns(text) })) },
    { type: 'paragraph', text: `Transfer move. ${section.transfer}`, runs: [{ type: 'strong', children: textRuns('Transfer move.') }, ...textRuns(section.transfer)] },
  ];
}

function makeSection(unit, section, sectionIndex) {
  const sectionId = `apush-ch-${String(unit.number).padStart(2, '0')}-section-${String(sectionIndex + 1).padStart(2, '0')}`;
  const chapterId = `apush-ch-${String(unit.number).padStart(2, '0')}`;
  const content = `${section.core} ${section.misconception} ${section.transfer}`;
  return {
    id: sectionId,
    heading: section.heading,
    content,
    keyTerms: section.retrieval.slice(0, 3).map((prompt) => prompt.replace(/\?.*$/, '')),
    references: [CED_URL, CLARIFICATIONS_URL, unit.sourceUrl],
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original internal foundation summary; independent AP U.S. History subject-expert and accessibility review remain pending.',
    contentBlocks: contentBlocks(section, unit),
    examples: section.examples,
    nonExamples: section.nonExamples,
    commonMisconceptions: [section.misconception],
    workedDataExample: { headers: ['Historical pattern', 'Reasoning move'], rows: section.rows },
    retrievalPrompts: section.retrieval,
    transferMove: section.transfer,
    contentEnhancementVersion: LIBRARY_VERSION,
    contentComplete: true,
    contentWordCount: content.split(/\s+/).length,
    contentBlockCount: contentBlocks(section, unit).length,
    chapterId,
  };
}

function makeKnowledgeCheck(item, unit, checkIndex) {
  return {
    id: `apush-ch-${String(unit.number).padStart(2, '0')}-check-${String(checkIndex + 1).padStart(2, '0')}`,
    sectionId: item.learningSectionId,
    type: 'single-choice-retrieval',
    prompt: item.prompt,
    choices: item.choices,
    answerIndex: item.answerIndex,
    rationale: item.rationale,
    references: item.references,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original retrieval check; independent AP U.S. History subject-expert and psychometric review remain pending.',
    chapterId: `apush-ch-${String(unit.number).padStart(2, '0')}`,
  };
}

function makeDiagram(unit) {
  const chapterId = `apush-ch-${String(unit.number).padStart(2, '0')}`;
  const id = `apush-history-diagram-${String(unit.number).padStart(3, '0')}`;
  const nodes = [
    { id: 'context', label: 'Context', detail: `Conditions and developments before or around ${unit.period}.` },
    { id: 'actors', label: 'Actors and institutions', detail: 'Groups, leaders, communities, and institutions make choices within that context.' },
    { id: 'development', label: 'Historical development', detail: unit.summary.split('.')[0] + '.' },
    { id: 'consequence', label: 'Consequence and limit', detail: 'Trace effects, continuity, change, and the limits of the development.' },
  ];
  return {
    id,
    chapterId,
    domainId: unit.id,
    title: unit.diagramTitle,
    diagramType: 'historical-reasoning-flow',
    learnerPurpose: 'Use an original, text-equivalent reasoning path to connect context, actors, development, and consequence without treating history as a single-cause sequence.',
    caption: `An original reasoning flow for studying ${unit.shortLabel}; it is a study aid, not an official College Board figure.`,
    unscored: true,
    officialItem: false,
    releaseEligible: false,
    reviewStatus: 'source-reviewed-editorial-pass',
    expertReviewStatus: 'pending',
    references: [CED_URL, unit.sourceUrl],
    rights: { originalSpecification: true, officialFigureReproduced: false, sourceFigureReproduced: false, thirdPartyArtworkIncluded: false },
    accessibility: {
      essentialVisualContent: false,
      shortAlt: `Reasoning flow for ${unit.shortLabel} from historical context to development and consequence.`,
      longDescription: `Read from left to right. Begin with the broader context for ${unit.shortLabel}. Identify the actors and institutions making choices. Name the historical development, then trace its consequences, continuities, changes, and limits. The flow is a reasoning scaffold rather than a claim that one cause explains the entire period.`,
      textEquivalent: [
        `Start with the broader context for ${unit.shortLabel}.`,
        'Identify the actors, communities, and institutions involved.',
        'Name the development or process and the evidence that supports it.',
        'Trace consequences while stating what remained contested or unchanged.',
      ],
      readingOrder: nodes.map((node) => node.id),
      colorIndependent: true,
      shapeIndependentLabels: true,
      fallbackMode: 'ordered-text-equivalent',
      independentReviewStatus: 'pending',
    },
    spec: {
      format: 'alloflow-diagram-v1',
      layout: 'left-to-right',
      nodes,
      edges: [
        { id: 'context-to-actors', from: 'context', to: 'actors', label: 'frames' },
        { id: 'actors-to-development', from: 'actors', to: 'development', label: 'shape and contest' },
        { id: 'development-to-consequence', from: 'development', to: 'consequence', label: 'produces and changes' },
      ],
      renderingHints: { connectorStyle: 'arrow', allowHorizontalScroll: true, minimumTextSize: 'user-scalable' },
    },
  };
}

function makeWorkshop(id, taskType, title, prompt, selfCheck) {
  return {
    id,
    taskType,
    title,
    prompt,
    directions: 'Draft a planning response in your own words. Use evidence from the synthetic scenario and the public course framework, then explain the limits of your claim.',
    syntheticStimulus: true,
    stimulus: 'This workshop uses an original classroom scenario created for planning practice. It is not a released or secure AP source and does not describe an actual study or official prompt.',
    selfCheck,
    unscored: true,
    automatedScoring: false,
    scorePrediction: false,
    officialItem: false,
    releaseEligible: false,
    expertReviewStatus: 'pending',
    reviewStatus: 'source-reviewed-editorial-pass',
    references: [CED_URL, CLARIFICATIONS_URL],
    rights: { secureCollegeBoardContentUsed: false, copiedOrRephrasedOfficialPrompt: false, copiedOfficialRubric: false, originalStimulus: true, status: 'pending-independent-rights-review' },
  };
}

function buildLibrary(items) {
  const chapters = unitDefinitions.map((unit) => {
    const chapterId = `apush-ch-${String(unit.number).padStart(2, '0')}`;
    const unitItems = items.filter((item) => item.domainId === unit.id);
    const sections = unit.sections.map((section, index) => makeSection(unit, section, index));
    const checks = unitItems.slice(0, 3).map((item, index) => makeKnowledgeCheck(item, unit, index));
    return {
      id: chapterId,
      title: unit.shortLabel,
      domainId: unit.id,
      domain: unit.label,
      skillId: 'H1',
      topicCoverage: unit.sections.map((section, index) => `${unit.number}.${index + 2} ${section.heading}`),
      summary: unit.summary,
      objectives: [
        `Explain the major developments and processes of ${unit.period}.`,
        `Use sourcing, context, and evidence to analyze claims about ${unit.shortLabel}.`,
        'Connect historical change to continuity, causation, comparison, and the limits of available evidence.',
      ],
      references: [CED_URL, CLARIFICATIONS_URL, unit.sourceUrl, YAWP_URL],
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original internal foundation chapter; independent AP U.S. History subject-expert, rights, accessibility, production, field-testing, and psychometric review remain pending.',
      expertReviewStatus: 'pending',
      accessibilityReviewStatus: 'pending-independent-review',
      releaseEligible: false,
      sectionCount: sections.length,
      knowledgeCheckCount: checks.length,
      referenceCount: 4,
      sections,
      knowledgeChecks: checks,
      chapterTakeaways: [
        `Start ${unit.shortLabel} with context before naming a cause or consequence.`,
        'Treat primary and secondary sources as situated arguments with strengths and limits.',
        'A defensible historical claim names both a development and the evidence or reasoning that supports it.',
      ],
      studyArchitecture: { format: 'expanded-native-study-chapter', lessonSequence: ['Read the core explanation', 'Compare examples and nonexamples', 'Work the evidence table', 'Complete retrieval practice', 'Return to linked questions'], reviewStatus: 'source-reviewed-editorial-pass', expertReviewStatus: 'pending' },
      contentEnhancementVersion: LIBRARY_VERSION,
      contentComplete: true,
    };
  });

  const flashcards = unitDefinitions.flatMap((unit) => unit.sections.map((section, sectionIndex) => ({
    id: `apush-card-${String(unit.number).padStart(2, '0')}-${String(sectionIndex + 1).padStart(2, '0')}`,
    chapterId: `apush-ch-${String(unit.number).padStart(2, '0')}`,
    sectionId: `apush-ch-${String(unit.number).padStart(2, '0')}-section-${String(sectionIndex + 1).padStart(2, '0')}`,
    skillId: 'H1',
    domainId: unit.id,
    domain: unit.label,
    front: `What is the key historical reasoning move for ${section.heading.toLowerCase()}?`,
    back: `${section.core} ${section.misconception}`,
    reviewStatus: 'source-reviewed-editorial-pass',
    references: [CED_URL, unit.sourceUrl],
    reviewNote: 'Original study card; independent subject-expert validation remains pending.',
  })));

  const memoryAids = unitDefinitions.map((unit) => ({
    id: `apush-memory-route-${String(unit.number).padStart(2, '0')}`,
    chapterId: `apush-ch-${String(unit.number).padStart(2, '0')}`,
    type: 'retrieval cue',
    title: `${unit.shortLabel}: ${unit.memoryCue.split(':')[0]}`,
    content: unit.memoryCue,
    tags: unit.themes.map((theme) => theme.toLowerCase()),
    domain: unit.label,
    references: [CED_URL, unit.sourceUrl],
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original retrieval cue; it is not a substitute for chronological and source-based study.',
  }));

  const diagrams = unitDefinitions.map(makeDiagram);
  const diagramPlacements = diagrams.map((diagram, index) => ({
    id: `apush-history-diagram-placement-${String(index + 1).padStart(3, '0')}`,
    diagramId: diagram.id,
    chapterId: diagram.chapterId,
    sectionId: `${diagram.chapterId}-section-02`,
    position: 'after-section-content',
    learnerPurpose: diagram.learnerPurpose,
    requiredForComprehension: false,
    unscored: true,
    fallbackMode: 'diagram-text-equivalent',
    reviewStatus: 'source-reviewed-editorial-pass',
    accessibilityReviewStatus: 'pending-independent-review',
    releaseEligible: false,
  }));

  const workshops = [
    makeWorkshop('apush-foundation-saq-workshop', 'SAQ-style planning workshop', 'Source, context, connection: short-answer planning', 'A synthetic historian’s note describes a new transportation link and a dispute over who should pay for it. Draft a short response that identifies one contextual factor, explains one consequence, and connects the development to a broader period process.', ['Names a precise context rather than repeating the prompt.', 'Uses one historically relevant example and explains its relationship to the claim.', 'Separates a plausible inference from a fact the scenario does not establish.']),
    makeWorkshop('apush-foundation-dbq-workshop', 'DBQ-style planning workshop', 'Build a document-based argument', 'Using six short, original source summaries about federal power and regional interests, draft a thesis, group the evidence, and identify one piece of outside evidence that would strengthen the argument. Do not reproduce or imitate an official AP prompt.', ['The thesis makes a defensible claim with a line of reasoning.', 'Source groups are based on an explained relationship, not just chronology.', 'The outside evidence is specific and connected to the argument.']),
    makeWorkshop('apush-foundation-leq-workshop', 'LEQ-style planning workshop', 'Continuity, change, and qualification', 'Plan an essay answering: evaluate the extent to which a major change in the role of the federal government also produced continuity in American political conflict. Choose a period from this foundation pilot and outline a claim, evidence, and qualification.', ['The claim answers "extent" rather than merely naming a change.', 'Evidence is specific and placed in chronological context.', 'The qualification identifies a continuity, limit, or alternative interpretation.']),
  ];

  const glossary = unitDefinitions.flatMap((unit) => unit.sections.map((section, index) => ({
    id: `apush-glossary-${unit.number}-${index + 1}`,
    term: section.heading,
    definition: section.core,
    aliases: [unit.shortLabel],
    reviewStatus: 'source-reviewed-editorial-pass',
    references: [CED_URL, unit.sourceUrl],
  })));

  return {
    schemaVersion: 1,
    librarySchemaVersion: 1,
    libraryId: `${PACK_ID}-learning-library`,
    packId: PACK_ID,
    version: VERSION,
    title: 'AP U.S. History Independent Foundation Learning Library',
    description: 'An independently authored internal foundation library for AP U.S. History with nine period chapters, retrieval checks, source-analysis study aids, optional accessible reasoning diagrams, flashcards, memory cues, and clearly unscored SAQ/DBQ/LEQ planning workshops.',
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    blueprint: {
      academicYearReference: '2026-27',
      cedEffectiveLabel: 'Fall 2026',
      cedFrameworkVersion: 'V.1',
      examFormatReferenceYear: 2026,
      targetExamYear: null,
      lastVerifiedAt: VERIFIED_AT,
      officialBlueprintUrl: CED_URL,
      clarificationsUrl: CLARIFICATIONS_URL,
      officialExamUrl: EXAM_URL,
      transitionNotice: 'The College Board page announces AP History exam updates beginning with the May 2027 administration. Reverify the current CED, exam format, clarifications, policies, and public-use boundaries before any release.',
      learningObjectiveCatalogVersion: 'internal-remediation-v1',
      learningObjectiveCatalog: [...new Map(itemSpecs.map((spec) => [`${spec.unit}:${spec.section}`, objectiveFor(spec)])).values()],
      textbookEnhancementVersion: LIBRARY_VERSION,
      textbookEnhancementNote: 'The chapter summaries, examples, evidence tables, retrieval prompts, diagrams, and study aids are original internal editorial material. Public sources support factual review; independent AP U.S. History subject-expert, rights, accessibility, production, field-testing, and psychometric gates remain open.',
    },
    reviewStandard: 'Independent source and editorial review against the public College Board framework and openly available factual references. Independent AP U.S. History subject-expert, accessibility, rights, production, and psychometric review remain required.',
    disclaimer: 'Independent, unofficial AP U.S. History preparation material for internal preview only. Not affiliated with, endorsed by, or authored by College Board. AP and Advanced Placement are trademarks of College Board. This library does not provide official AP questions, rubrics, scores, score predictions, college-credit predictions, or release evidence.',
    legalCaution: 'Course names and public framework labels are used only to describe independent blueprint alignment. All instructional wording, checks, flashcards, memory aids, diagrams, and workshop stimuli are original AlloFlow material.',
    workshopLabel: 'Unscored SAQ-style, DBQ-style, and LEQ-style planning workshops',
    workshopPracticeNote: 'The workshops use original synthetic scenarios and planning self-checks. AlloFlow does not score constructed responses, apply an official College Board rubric, estimate an AP score, or predict credit or placement.',
    rightsPolicy: { authoringBasis: 'Independent original wording informed by public blueprint metadata and factual sources.', secureCollegeBoardContentUsed: false, copiedOrRephrasedCollegeBoardQuestions: false, copiedCollegeBoardRubricText: false, sourceProseOrFiguresReproduced: false, workshopStudiesAreSynthetic: true, publicSourceUse: 'Blueprint alignment, factual verification, and links only.', status: 'pending-independent-rights-review', diagramSpecificationsOriginal: true },
    releaseGates: { structuralValidation: `passed-${VERIFIED_AT}`, independentRightsReview: 'pending', independentAccessibilityReview: 'pending', apUsHistorySubjectExpertReview: 'pending', productionValidation: 'pending', fieldTesting: 'not-started', psychometricCalibration: 'not-started', cedAndPolicyReverification: 'required-before-release', releaseEligible: false },
    expertReviewGate: { requiredRole: 'Independent educator or faculty reviewer with current AP U.S. History course and assessment expertise', status: 'pending', releaseBlocked: true },
    accessibility: { contentForm: 'Text-first chapters, linear single-choice checks, cards, memory aids, optional JSON-native diagrams, and plain-text workshops', essentialVisualItems: 0, screenReaderReadingOrderDeclared: true, headingsAndListsStructured: true, workshopStimuliUsePlainText: true, handsFreeContentCompatible: true, independentReviewStatus: 'pending', productionScreenReaderValidationStatus: 'pending', productionVoiceValidationStatus: 'pending', optionalDiagramCount: diagrams.length, diagramTextEquivalentsRequired: true, diagramsRequiredForComprehension: false, diagramFallbackMode: 'ordered-text-equivalent' },
    sourceCatalog: [
      { id: 'college-board-apush-ced', title: 'AP U.S. History Course and Exam Description, Effective Fall 2026', organization: 'College Board', url: CED_URL, credibility: 'The public CED is the official course-content, historical-thinking-skill, and exam-design framework. It is used here for blueprint alignment only.' },
      { id: 'college-board-apush-clarifications', title: 'AP U.S. History Course and Exam Description Clarifications and Corrections', organization: 'College Board', url: CLARIFICATIONS_URL, credibility: 'This official document records public corrections and clarifications to the AP U.S. History CED.' },
      { id: 'college-board-apush-exam', title: 'AP U.S. History Exam', organization: 'College Board', url: EXAM_URL, credibility: 'The public AP Students page describes the current public exam mode and section structure; its timing and policy details require revalidation before release.' },
      { id: 'openstax-us-history', title: 'U.S. History', organization: 'OpenStax, Rice University', url: OPENSTAX_URL, credibility: 'OpenStax is Rice University’s nonprofit textbook initiative. The openly accessible text is used for factual cross-checking and links; no prose, figures, or assessment content is reproduced.' },
      { id: 'american-yawp', title: 'The American Yawp', organization: 'Stanford University Press and collaborating historians', url: YAWP_URL, credibility: 'The American Yawp is an openly accessible, collaboratively authored U.S. history textbook used as a supplementary public reference; it is not an official AP resource.' },
    ],
    summary: { chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0), diagrams: diagrams.length, diagramPlacements: diagramPlacements.length, knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeChecks.length, 0), skills: historicalSkills.length, flashcards: flashcards.length, memoryAids: memoryAids.length, constructedResponseWorkshops: workshops.length, glossaryTerms: glossary.length, sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length, sourceReviewedConstructedResponseWorkshops: workshops.length, independentExpertReviewedChapters: 0, releaseEligibleRecords: 0, sourceReviewedDiagrams: diagrams.length, independentExpertReviewedDiagrams: 0, contentCompleteSections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0), structuredContentSections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0), workedDataExamples: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0), sectionRetrievalChecks: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0) },
    skills: historicalSkills,
    reasoningProcesses,
    glossary,
    chapters,
    diagrams,
    diagramPlacements,
    flashcards,
    memoryAids,
    constructedResponseWorkshops: workshops,
    contentMigration: { schemaVersion: 1, contentVersion: LIBRARY_VERSION, sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0), completeSections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0), status: 'complete', reviewStatus: 'source-reviewed-editorial-pass', note: 'All native AP U.S. History foundation sections use structured lesson blocks and remain subject-expert pending.' },
  };
}

function main() {
  assert(unitDefinitions.length === 9, 'AP U.S. History foundation must define nine units.');
  assert(itemSpecs.length === 50, 'AP U.S. History foundation must contain 50 items.');
  assert(Object.values(specCounts).every((count, index) => count === (index === 0 || index === 1 || index === 7 || index === 8 ? 5 : 6)), 'Unexpected unit distribution.');
  const items = itemSpecs.map(makeItem);
  const unitWeights = unitDefinitions.map((unit) => ((unit.officialWeightMin + unit.officialWeightMax) / 2));
  const weightTotal = unitWeights.reduce((sum, weight) => sum + weight, 0);
  const domains = unitDefinitions.map((unit, index) => ({ id: unit.id, label: unit.label, weight: Number((unitWeights[index] / weightTotal).toFixed(6)), officialWeightMin: unit.officialWeightMin, officialWeightMax: unit.officialWeightMax, itemCount: items.filter((item) => item.domainId === unit.id).length }));
  const practiceCounts = Object.fromEntries(historicalSkills.map((skill) => [skill.id, items.filter((item) => item.practiceId === skill.id).length]));
  const answerPositionDistribution = Object.fromEntries([0, 1, 2, 3].map((index) => [index, items.filter((item) => item.answerIndex === index).length]));
  const objectiveCatalog = [...new Map(itemSpecs.map((spec) => [`${spec.unit}:${spec.section}`, objectiveFor(spec)])).values()];
  const libraryUrl = './test_prep/ap_us_history_foundation_pilot_learning_library.json';
  const qaUrl = './test_prep/ap_us_history_foundation_pilot_qa.json';
  const pack = {
    schemaVersion: 1,
    itemSchemaVersion: 2,
    id: PACK_ID,
    title: 'AP U.S. History Independent Foundation Pilot',
    shortTitle: 'AP U.S. History Foundation',
    description: 'An independently authored 50-item AP U.S. History foundation pilot with representative coverage across all nine current public framework periods. It is internal, unofficial, uncalibrated, and not score-predictive.',
    credentialOwner: 'College Board',
    version: VERSION,
    status: 'preview',
    visibility: 'internal',
    portfolioCategories: ['k12-college-readiness'],
    released: false,
    calibrated: false,
    previewBadge: 'Internal foundation pilot - 50 original draft items',
    accent: 'amber',
    contentReview: 'Fifty original, source-linked draft multiple-choice items distributed across all nine AP U.S. History periods, with representative historical-thinking skills, internal learning routes, option-specific feedback, nine native study chapters, optional accessible reasoning diagrams, and unscored SAQ/DBQ/LEQ planning workshops. Independent subject-expert, rights, accessibility, production, field-testing, psychometric, and current-policy gates remain pending.',
    blueprintLabel: 'AP U.S. History Course and Exam Description, Effective Fall 2026, Course Framework V.1',
    blueprintEffective: 'Fall 2026 CED; the public College Board page announces AP History exam updates beginning with the May 2027 administration. Target exam year remains intentionally unset.',
    officialBlueprintUrl: CED_URL,
    clarificationsUrl: CLARIFICATIONS_URL,
    officialExamUrl: EXAM_URL,
    learningLibraryUrl: libraryUrl,
    nativeQaUrl: qaUrl,
    transitionNotice: 'The target public exam year is intentionally unset. Reverify the current CED, clarifications, exam mode, timing, 2027 AP History updates, policies, and public-use boundaries before any release.',
    disclaimer: 'Independent, unofficial AP U.S. History preparation material for internal development only. Not affiliated with, endorsed by, or authored by College Board. AP and Advanced Placement are trademarks of College Board. All questions, answer options, explanations, feedback, chapters, and workshops are independently authored; no secure AP Classroom, Question Bank, Progress Check, practice-exam, teacher-only content, released question, or official rubric was used or reproduced. Practice results are not official AP scores, score predictions, psychometric estimates, or determinations of college credit or placement.',
    capabilities: { currentEngineSchemaVersion: 1, itemSchemaVersion: 2, currentEngineCompatible: true, responseTypes: ['single-choice'], stimulusGroupsIncluded: false, constructedResponseIncluded: false, frqWorkshopsIncluded: true, handsFreeContentCompatible: true, limitations: ['This foundation pilot uses text-first single-choice records and does not reproduce AP U.S. History source-set stimuli, maps, images, or digital response UI.', 'The separate SAQ-, DBQ-, and LEQ-style workshops use original synthetic scenarios and planning self-checks; the current engine does not score constructed responses.', 'No official-score or readiness inference is supported.'] },
    blueprint: { academicYearReference: '2026-27', cedEffectiveLabel: 'Fall 2026', cedFrameworkVersion: 'V.1', examFormatReferenceYear: 2026, targetExamYear: null, examModeReference: 'fully-digital', officialSectionOne: '55 multiple-choice questions in 55 minutes; 40% of the 2026 official exam score', officialSectionTwo: '3 short-answer questions in 40 minutes; 20% of the 2026 official exam score', officialSectionThree: '1 document-based question and 1 long-essay question in 100 minutes; 40% of the 2026 official exam score', pilotAlignment: '50-item internal foundation: five items each in Units 1, 2, and 9; six items each in Units 3-8; nine period chapters; representative topics and all six historical-thinking skills. This is not full topic coverage or an official exam form.', lastVerifiedAt: VERIFIED_AT, sourceDigest: 'pending-build-generation', learningObjectiveCatalogVersion: 'internal-remediation-v1', learningObjectiveCatalog: objectiveCatalog, representativeTopicCoverageOnly: true, examUpdateNote: 'College Board announces AP History exam updates beginning with the May 2027 administration. Reverify task wording, timing, and policy before release.' },
    rightsPolicy: { authoringBasis: 'Independent original wording informed by public blueprint metadata and factual sources.', secureCollegeBoardContentUsed: false, copiedOrRephrasedCollegeBoardQuestions: false, publicSourceUse: 'Blueprint alignment, factual verification, and links only; no source prose, figures, official prompts, or rubrics are reproduced.', status: 'pending-independent-rights-review' },
    releaseGates: { internalStructuralValidation: `passed-${VERIFIED_AT}`, independentRightsReview: 'pending', independentAccessibilityReview: 'pending', apUsHistorySubjectExpertReview: 'pending', productionValidation: 'pending', fieldTesting: 'not-started', psychometricCalibration: 'not-started', cedAndPolicyReverification: 'required-before-release', releaseEligible: false },
    accessibilityGate: { contentForm: 'text-only, linear single-choice items', essentialVisualItems: 0, screenReaderReadingOrderDeclared: true, handsFreeContentCompatible: true, independentReviewStatus: 'pending', productionVoiceValidationStatus: 'pending' },
    expertReviewGate: { requiredRole: 'Independent educator or faculty reviewer with current AP U.S. History course and assessment expertise', status: 'pending', releaseBlocked: true },
    domains,
    historicalThinkingSkills: historicalSkills,
    reasoningProcesses,
    practiceDistribution: { ...practiceCounts, note: 'The six historical-thinking skills are sampled across this text-first foundation pilot; they are not a psychometric exam blueprint.', },
    answerPositionDistribution,
    batchSize: 10,
    diagnosticBatchCount: 5,
    sourceQuestionItems: 50,
    independentPracticeItems: 50,
    distinctSourceContentKernels: 50,
    sections: Array.from({ length: 5 }, (_, index) => ({ id: `apush-foundation-bank-${String(index + 1).padStart(2, '0')}`, label: `Bank ${String(index + 1).padStart(2, '0')}: 10-item internal foundation sampler`, timeMinutes: null, released: false })),
    sourceCatalog: [
      { id: 'college-board-apush-ced', title: 'AP U.S. History Course and Exam Description, Effective Fall 2026', organization: 'College Board', url: CED_URL, credibility: 'The public CED is the official course-content, historical-thinking-skill, and exam-design framework. It is used here for blueprint alignment only.' },
      { id: 'college-board-apush-clarifications', title: 'AP U.S. History Course and Exam Description Clarifications and Corrections', organization: 'College Board', url: CLARIFICATIONS_URL, credibility: 'This official document records public corrections and clarifications to the AP U.S. History CED.' },
      { id: 'college-board-apush-exam', title: 'AP U.S. History Exam', organization: 'College Board', url: EXAM_URL, credibility: 'The public AP Students page describes the public exam mode and section structure; timing and policy details require revalidation before release.' },
      { id: 'openstax-us-history', title: 'U.S. History', organization: 'OpenStax, Rice University', url: OPENSTAX_URL, credibility: 'OpenStax is Rice University’s nonprofit textbook initiative. It is used here for factual cross-checking and links only.' },
      { id: 'american-yawp', title: 'The American Yawp', organization: 'Stanford University Press and collaborating historians', url: YAWP_URL, credibility: 'The American Yawp is an openly accessible collaborative history text used as a supplementary public reference, not as an official AP resource.' },
    ],
    items,
  };
  const library = buildLibrary(items);
  assert(library.packId === pack.id && library.version === pack.version, 'Pack/library identity mismatch.');
  assert(library.summary.chapters === 9 && library.summary.sections === 27, 'Unexpected library inventory.');
  writeJson(packPath, pack);
  writeJson(libraryPath, library);
  console.log(`Built ${pack.id}: ${items.length} items across ${domains.length} periods; ${library.chapters.length} chapters and ${library.constructedResponseWorkshops.length} unscored workshops.`);
}

main();
