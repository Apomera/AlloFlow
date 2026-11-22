'use strict';

// Balanced-choice overrides for Early Childhood Education (5025) banks 4-7 (EC4.0-EC7.6).
module.exports = [
  {
    id: 'EC4.0',
    correct: '6 units',
    distractors: [
      '3 units',
      '4 units',
      '7 units',
    ],
    notes: [
      'Selecting 3 units misreads the vertical span on the grid instead of counting from y = −1 across zero to y = 5.',
      'Choosing 4 units subtracts 5 − 1 without accounting for the negative sign on −1, which adds 1 unit below zero.',
      'Picking 7 units adds the coordinates carelessly (5 + 2) instead of finding the vertical difference |5 − (−1)| = 6.',
    ],
  },
  {
    id: 'EC4.1',
    correct: '10',
    distractors: [
      '9',
      '11',
      '12',
    ],
    notes: [
      'Choosing 9 identifies the middle value (median) of the ordered set rather than dividing the total sum 50 by 5.',
      'Selecting 11 reflects an addition or division slip when averaging 6 + 8 + 9 + 12 + 15 = 50 across five numbers.',
      'Picking 12 overestimates the mean by anchoring near the upper values rather than balancing all five terms around 10.',
    ],
  },
  {
    id: 'EC4.2',
    correct: '8.5',
    distractors: [
      '7',
      '10',
      '11.5',
    ],
    notes: [
      'Choosing 7 selects the lower of the two middle numbers (or the mode) instead of averaging both middle terms 7 and 10.',
      'Selecting 10 reports the fourth ordered value alone rather than taking the midpoint halfway between 7 and 10.',
      'Picking 11.5 averages the fourth and fifth values (10 and 13) instead of averaging the two center values 7 and 10.',
    ],
  },
  {
    id: 'EC4.3',
    correct: '1/5',
    distractors: [
      '1/10',
      '1/2',
      '2/3',
    ],
    notes: [
      'Selecting 1/10 places 1 in the numerator instead of 2 green tiles out of all 10 total tiles (2/10 = 1/5).',
      'Choosing 1/2 matches the probability of drawing a blue tile (5/10) rather than the 2 green tiles in the bag.',
      'Picking 2/3 compares green tiles to red tiles (2:3) instead of comparing 2 green tiles to all 10 tiles.',
    ],
  },
  {
    id: 'EC4.4',
    correct: '9 notebooks',
    distractors: [
      '3 notebooks',
      '6 notebooks',
      '45 notebooks',
    ],
    notes: [
      'Choosing 3 notebooks compares Tuesday and Wednesday or Thursday and Tuesday rather than subtracting Monday (18) from Thursday (27).',
      'Selecting 6 notebooks compares Tuesday (24) with Monday (18) instead of using Thursday’s total of 27 notebooks.',
      'Picking 45 notebooks adds Monday’s and Thursday’s sales together (18 + 27) instead of finding how many more were sold.',
    ],
  },
  {
    id: 'EC4.5',
    correct: '0.84',
    distractors: [
      '0.084',
      '8.4',
      '84',
    ],
    notes: [
      'Selecting 0.084 shifts the decimal point one extra place left, placing four decimal digits instead of counting three total decimal places.',
      'Choosing 8.4 places only one decimal digit in the product, ignoring that 2.4 × 0.35 must be smaller than 2.4.',
      'Picking 84 omits decimal placement entirely, reporting 24 × 35 ÷ 10 without estimating that about 2.4 × 0.35 is near 0.8.',
    ],
  },
  {
    id: 'EC4.6',
    correct: '275 centimeters',
    distractors: [
      '27.5 centimeters',
      '2,750 centimeters',
      '0.0275 centimeters',
    ],
    notes: [
      'Choosing 27.5 centimeters multiplies by 10 instead of 100, confusing centimeters per meter with decimeters per meter.',
      'Selecting 2,750 centimeters multiplies by 1,000 instead of 100, treating centimeters as if they were millimeters per meter.',
      'Picking 0.0275 centimeters divides by 100 instead of multiplying, reversing the conversion from larger meters to smaller centimeters.',
    ],
  },
  {
    id: 'EC4.7',
    correct: '243',
    distractors: [
      '27',
      '81',
      '729',
    ],
    notes: [
      'Selecting 27 evaluates 3 cubed alone (27) without multiplying by 3 squared (9) to obtain 3 to the fifth power.',
      'Choosing 81 computes 3 to the fourth power (9 × 9) instead of multiplying 9 × 27 to reach 3 to the fifth.',
      'Picking 729 multiplies exponents (2 × 3 = 6, giving 3^6) instead of adding exponents when multiplying like bases (2 + 3 = 5).',
    ],
  },
  {
    id: 'EC5.0',
    correct: '17',
    distractors: [
      '1',
      '49',
      '145',
    ],
    notes: [
      'Arriving at 1 multiplies 2 × 4 = 8 before squaring incorrectly or computes 16 − 15 instead of doubling 16 first to get 32.',
      'Choosing 49 squares a correctly to get 16 and doubles to 32, yet adds 15 instead of subtracting 3b = 15.',
      'Selecting 145 computes (2a)^2 = 64 or confuses exponents and products rather than applying order of operations: 2(16) − 15.',
    ],
  },
  {
    id: 'EC5.1',
    correct: '$35',
    distractors: [
      '$21',
      '$29',
      '$90',
    ],
    notes: [
      'Choosing $21 understates the unit price at $1.50 per notebook instead of dividing $15 by 6 to get $2.50 each.',
      'Selecting $29 adds the difference in notebooks (14 − 6 = 8) directly to $15 or miscomputes $2.50 × 14.',
      'Picking $90 multiplies 6 × $15 instead of scaling the proportional unit rate of $2.50 per notebook across 14 notebooks.',
    ],
  },
  {
    id: 'EC5.2',
    correct: '168 cubic centimeters',
    distractors: [
      '17 cubic centimeters',
      '68 cubic centimeters',
      '336 cubic centimeters',
    ],
    notes: [
      'Selecting 17 cubic centimeters adds the three dimensions (7 + 4 + 6) instead of multiplying length × width × height.',
      'Choosing 68 cubic centimeters adds partial products rather than multiplying 7 × 4 = 28 and then 28 × 6 = 168.',
      'Picking 336 cubic centimeters doubles the true prism volume (2 × 168) rather than computing V = l × w × h once.',
    ],
  },
  {
    id: 'EC5.3',
    correct: '15%',
    distractors: [
      '13%',
      '36%',
      '85%',
    ],
    notes: [
      'Choosing 13% divides the 36-student increase by the new total 276 instead of dividing by the original base of 240.',
      'Selecting 36% treats the raw student gain (276 − 240 = 36) directly as a percentage without dividing by 240.',
      'Picking 85% reports the complement (100% − 15%) rather than the percent increase itself (36 ÷ 240 = 0.15).',
    ],
  },
  {
    id: 'EC5.4',
    correct: '50 - 3n = 32',
    distractors: [
      '50 + 3n = 32',
      '3(50 - n) = 32',
      '50 - n = 96',
    ],
    notes: [
      'Writing 50 + 3n = 32 adds the purchase cost to the starting $50 instead of subtracting spent money from $50.',
      'Choosing 3(50 - n) = 32 triples the remaining balance after one notebook rather than subtracting 3 notebooks from $50.',
      'Selecting 50 - n = 96 multiplies the remaining $32 by 3 instead of representing the cost of 3 notebooks as 3n.',
    ],
  },
  {
    id: 'EC5.5',
    correct: 'Use fraction strips to model twelfths, then connect 4/12 + 3/12 directly to the sum 7/12.',
    distractors: [
      'Ask the learner to memorize 7/12 through flashcards without modeling why common units work.',
      'Confirm that adding numerators and denominators works across common classroom fraction sums.',
      'Switch the lesson to whole-number addition facts and set fraction addition aside indefinitely.',
    ],
    notes: [
      'Memorizing 7/12 without visual models leaves the underlying common-unit misconception intact when new fraction sums appear.',
      'Endorsing adding numerators and denominators directly reinforces the exact conceptual error that produced 2/7 instead of 7/12.',
      'Retreating to whole-number addition avoids addressing equal-sized fractional partitions and stalls important grade-level rational-number reasoning progress.',
    ],
  },
  {
    id: 'EC5.6',
    correct: 'Represent both decimals on a place-value chart and compare tenths directly with hundredths.',
    distractors: [
      'Explain that interior zeros carry no numerical value when written inside a decimal fraction.',
      'Have the student drop decimal points first to compare 407 and 47 as simple whole numbers.',
      'Direct the child to round both decimals to the nearest whole number instead of comparing digits.',
    ],
    notes: [
      'Interior zeros act as crucial place-value holders; omitting the zero in 4.07 shifts 7 hundredths into 7 tenths.',
      'Removing decimal points turns 4.07 and 4.7 into misleading whole numbers (407 vs. 47) that reverse the actual magnitude comparison.',
      'Rounding both decimals to 4 or 5 erases the tenths and hundredths place distinction the student specifically needs to grasp.',
    ],
  },
  {
    id: 'EC5.7',
    correct: 'A grouped bar graph using a clear scale and consistent category colors across months.',
    distractors: [
      'A separate individual circle graph drawn for every single category value in each month.',
      'An unlabeled line graph placing the four calendar months in scrambled arbitrary order.',
      'A decorative pictograph that changes each picture symbol’s numeric value from month to month.',
    ],
    notes: [
      'Separate circle graphs fragment part-to-whole snapshots and make direct magnitude comparisons across categories and months very difficult.',
      'An unlabeled scrambled line graph distorts chronological continuity and misrepresents discrete categorical totals as continuous trends.',
      'Changing symbol values inside a pictograph breaks proportional scaling and misleads readers comparing category heights across months.',
    ],
  },
  {
    id: 'EC6.0',
    correct: 'A timeline orders events chronologically using dated or relative intervals backed by evidence.',
    distractors: [
      'A chronological timeline proves the exact underlying cause behind every historical event listed.',
      'Events plotted on any timeline must sit at identical visual spacing regardless of years elapsed.',
      'The most famous historical event in a unit belongs first on the far left of every timeline.',
    ],
    notes: [
      'Chronological sequence shows what happened before or after, yet sequence alone cannot prove causal relationships between events.',
      'Equal visual spacing regardless of elapsed years distorts time intervals unless clearly marked as a simple relative-order sequence.',
      'Placing events by perceived fame rather than date breaks chronological order, which is the defining rule of a timeline.',
    ],
  },
  {
    id: 'EC6.1',
    correct: 'A photograph taken during an event can be primary evidence; a later textbook is usually secondary.',
    distractors: [
      'Any historical photograph provides a fully objective, unframed record capturing every detail present.',
      'A school social-studies textbook counts as a primary source because teachers use it directly in class.',
      'Locating one credible primary source removes the need to compare multiple perspectives or accounts.',
    ],
    notes: [
      'Every historical photograph reflects framing, angle, timing, and subject choices, so photographs require contextual analysis rather than blind trust.',
      'A school textbook synthesizes and interprets earlier records after the fact, making it a secondary source rather than a primary source.',
      'Primary sources reflect particular vantage points and limits, so historians still corroborate multiple accounts to build accurate interpretations.',
    ],
  },
  {
    id: 'EC6.2',
    correct: 'A map key defines symbols, a compass rose shows direction, and scale links map distance to ground.',
    distractors: [
      'Horizontal lines of latitude measure east-west angular distance away from the prime meridian.',
      'A flat classroom wall map preserves exact area, distance, and shape across Earth with no distortion.',
      'Standard map colors carry one fixed universal meaning across every atlas without consulting a key.',
    ],
    notes: [
      'Lines of latitude run east-west yet measure north-south distance from the equator; longitude measures east-west from the prime meridian.',
      'Flattening a spherical Earth onto a flat map introduces geometric distortion, whereas globes minimize distortion across area and shape.',
      'Map colors vary by cartographic purpose (elevation, climate, or political boundaries), so readers must check the map key.',
    ],
  },
  {
    id: 'EC6.3',
    correct: 'Rules and laws structure shared life, protect rights and safety, and carry legitimate consequences.',
    distractors: [
      'Every classroom expectation written on a school poster carries the same legal force as a federal law.',
      'Once enacted by a legislative body, formal public laws remain permanently fixed without amendment.',
      'A municipal or state law holds legitimate authority solely when every single citizen votes in favor.',
    ],
    notes: [
      'Classroom rules guide local school conduct, whereas federal laws are enacted by Congress and enforced through legal courts.',
      'Constitutions and legislatures provide lawful procedures for amending or repealing laws as public needs and values evolve.',
      'Democratic legal legitimacy rests on constitutional and representative processes rather than requiring unanimous personal agreement from every resident.',
    ],
  },
  {
    id: 'EC6.4',
    correct: 'A right safeguards a freedom or entitlement; a responsibility is a duty tied to community membership.',
    distractors: [
      'Basic civic rights function as optional classroom rewards earned after completing assigned daily chores.',
      'Civic responsibilities apply strictly to elected public officials rather than ordinary community members.',
      'Rights and responsibilities serve as interchangeable civic labels describing the exact same legal duty.',
    ],
    notes: [
      'Rights are protected entitlements or freedoms grounded in law and community principles rather than conditional prizes for chores.',
      'All community members share civic responsibilities such as respecting others’ rights, staying informed, and contributing to shared spaces.',
      'Rights protect what individuals may claim or exercise freely, whereas responsibilities specify duties owed to the wider community.',
    ],
  },
  {
    id: 'EC6.5',
    correct: 'Food and shelter are core needs, toys are wants, goods are tangible objects, and services are actions.',
    distractors: [
      'Any everyday product purchased with money at a neighborhood store qualifies economically as a basic need.',
      'A barbershop haircut counts economically as a physical good because cash or a card changes hands.',
      'Professional services such as bus driving or teaching can be boxed and stored on warehouse shelves.',
    ],
    notes: [
      'Purchasing an item shows market exchange rather than necessity; consumers regularly spend money on discretionary wants alongside basic needs.',
      'Payment occurs for both goods and services; a haircut is a service because it is an action performed rather than a tangible object.',
      'Services are intangible activities performed for others at the time of delivery and cannot be shelved like physical goods.',
    ],
  },
  {
    id: 'EC6.6',
    correct: 'Scarcity means resources are limited relative to wants, so economic choices carry opportunity cost.',
    distractors: [
      'Economic scarcity describes an outdated item that has lost all practical usefulness or market value.',
      'Money is the sole economic resource that can become scarce inside a family, school, or community.',
      'Choosing one preferred activity over another involves no economic tradeoff when both options are free.',
    ],
    notes: [
      'Scarcity reflects limited availability relative to demand rather than zero usefulness; scarce goods often hold high value.',
      'Time, classroom space, clean water, skilled labor, and school materials can all become scarce alongside family money.',
      'Even zero-dollar choices carry an opportunity cost equal to the next-best alternative activity given up with that time.',
    ],
  },
  {
    id: 'EC7.0',
    correct: 'Producers create goods or services while consumers use them, and one person fills both roles across contexts.',
    distractors: [
      'Household consumers physically manufacture most everyday goods they purchase inside local stores.',
      'Business producers and service workers avoid acting as consumers while operating inside a market economy.',
      'Economic identities as either producer or consumer remain fixed permanently across an individual’s lifetime.',
    ],
    notes: [
      'Consumers purchase or use goods and services created by others rather than manufacturing every item they buy themselves.',
      'Producers regularly act as everyday consumers when buying raw materials, shop equipment, groceries, healthcare, and household services.',
      'People shift constantly between producer and consumer identities across a lifetime depending on whether they supply work or use goods.',
    ],
  },
  {
    id: 'EC7.1',
    correct: 'Families differ in structure, language, customs, and roles; sound study avoids ranking one norm as superior.',
    distractors: [
      'Communities worldwide organize household family structures and daily caregiver roles in identical patterns.',
      'Highlighting one festive annual holiday gives children a complete portrait of an entire cultural heritage.',
      'Classroom comparisons should rank diverse family traditions from most effective to least effective.',
    ],
    notes: [
      'Family structures and caregiving roles vary widely across cultures and households, including multigenerational and blended families.',
      'Reducing a rich living culture to a single holiday creates superficial tokenism and misses everyday language, history, and diversity.',
      'Ranking diverse cultural family patterns imposes ethnocentric bias rather than fostering accurate, respectful, evidence-based social-studies understanding.',
    ],
  },
  {
    id: 'EC7.2',
    correct: 'Groups define a shared issue, weigh voices and evidence, compare options, decide fairly, and review effects.',
    distractors: [
      'Holding a quick majority vote ensures every resulting community decision is equitable and well informed.',
      'Civic problem solving belongs strictly to adult voters because young children lack community perspectives.',
      'Factual evidence becomes unnecessary in civic discussions whenever group members hold firm personal views.',
    ],
    notes: [
      'Majority voting is one decision method, yet without evidence and protection of minority rights it does not guarantee fairness.',
      'Young children belong to school and neighborhood communities and can practice age-appropriate civic inquiry and shared decision making.',
      'Disagreement makes credible evidence more vital, not less, so groups can test claims and evaluate likely consequences.',
    ],
  },
  {
    id: 'EC7.3',
    correct: 'People depend on, adapt to, and modify environments, producing both intended benefits and tradeoffs.',
    distractors: [
      'Local climate and physical landforms rigidly dictate every cultural custom and economic choice people make.',
      'Human settlement, farming, and construction leave surrounding land, waterways, and habitats unchanged.',
      'Adapting to local physical conditions and modifying a landscape represent the exact same geographic process.',
    ],
    notes: [
      'Environmental determinism ignores human agency, technology, trade, and cultural creativity in shaping how communities respond to geography.',
      'Human activities such as irrigation, road building, and urbanization visibly reshape soils, waterways, and local ecosystems.',
      'Adapting adjusts human clothing or housing to nature, whereas modifying physically alters the land or water itself.',
    ],
  },
  {
    id: 'EC7.4',
    correct: 'Local, state, and national governments hold distinct and shared powers rooted in constitutions and laws.',
    distractors: [
      'An elected city mayor serves as the chief executive officer leading the national federal government.',
      'Individual states enforce federal statutes without authority to enact or amend state-level laws.',
      'Every public service from local parks to national defense is administered by one single government tier.',
    ],
    notes: [
      'A mayor leads municipal local government, whereas the President serves as chief executive of the national federal government.',
      'Under federalism, states possess broad constitutional authority to pass state laws governing schools, highways, and public safety.',
      'Public responsibilities are distributed across local, state, and federal levels, with some powers shared and others distinct.',
    ],
  },
  {
    id: 'EC7.5',
    correct: 'Accounts vary with vantage point, experience, purpose, and evidence, so claims should be checked with sources.',
    distractors: [
      'When two historical eyewitnesses disagree, one single narrative holds all truth while the other is false.',
      'Accounts written decades after an event are routinely more trustworthy than contemporary primary records.',
      'Recognizing an author’s perspective makes factual evidence irrelevant because every interpretation is equal.',
    ],
    notes: [
      'Different witnesses often experience distinct facets of the same event, so corroborating multiple accounts yields a fuller truth.',
      'Later accounts bring hindsight yet can also lose firsthand detail or introduce new biases, so both eras require evaluation.',
      'Perspective explains why accounts differ, yet historical claims still stand or fall on verifiable documentary and material evidence.',
    ],
  },
  {
    id: 'EC7.6',
    correct: 'Historical accounts weigh conditions, triggers, actions, and effects rather than one simple cause.',
    distractors: [
      'Any earlier event occurring before a later outcome can be classified directly as its primary cause.',
      'Major historical outcomes unfold directly as intended goals planned in advance by historical actors.',
      'One dramatic primary quotation by itself establishes complete causation for a complex historical shift.',
    ],
    notes: [
      'Assuming earlier timing proves causation commits the post-hoc fallacy; historians look for documented causal mechanisms and context.',
      'Major historical actions frequently generate unexpected, unintended consequences alongside planned goals, requiring careful analysis of actual effects.',
      'A single quotation offers one individual perspective and cannot prove multi-factor causation without broader corroborating evidence.',
    ],
  },
];
