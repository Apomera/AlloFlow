// ═══════════════════════════════════════════
// sel_tool_ethicalreasoning.js — Ethical Reasoning Lab
// Contemporary dilemmas, ethical frameworks, stakeholder mapping,
// AI Socratic dialogue, moral reasoning assessment, debate prep,
// branching dilemma scenarios, and deep moral reasoning
// ═══════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[SelHub] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';

  // ── Grade-Banded Ethical Frameworks ──
  var FRAMEWORKS_BY_BAND = {
    elementary: [
      { id: 'golden-rule', name: 'The Golden Rule', emoji: '\u2728', desc: 'Treat others the way you want to be treated.', example: 'If you wouldn\u2019t want someone to take your toy without asking, you shouldn\u2019t take theirs.', tryIt: 'Think of something that happened today. Did you treat someone the way you\u2019d want to be treated?' },
      { id: 'fairness-test', name: 'The Fairness Test', emoji: '\u2696\uFE0F', desc: 'Is this fair for everyone, not just me?', example: 'If only some kids get extra recess but not others, that\u2019s not fair unless there\u2019s a good reason.', tryIt: 'Think of a rule at school. Is it fair for every student? Why or why not?' },
      { id: 'caring-test', name: 'The Caring Test', emoji: '\u2764\uFE0F', desc: 'Does this help people or hurt people?', example: 'Sharing your lunch with a friend who forgot theirs helps them. Telling someone\u2019s secret hurts them.', tryIt: 'Think of a choice you made recently. Did it help someone or hurt someone?' },
    ],
    middle: [
      { id: 'utilitarian', name: 'Utilitarianism', emoji: '\uD83D\uDCCA', thinker: 'John Stuart Mill', desc: 'The right action produces the greatest good for the greatest number of people.', example: 'A city builds a park instead of a parking lot because more people benefit from green space.', tryIt: 'Think of a school rule. Does it create the most good for the most students?' },
      { id: 'deontological', name: 'Duty Ethics (Deontological)', emoji: '\uD83D\uDCDC', thinker: 'Immanuel Kant', desc: 'Some actions are right or wrong regardless of the outcome \u2014 based on moral rules and duties.', example: 'Telling the truth is right even when lying might get a better result, because honesty is a duty.', tryIt: 'Is there something you believe is always wrong, no matter what? Why?' },
      { id: 'virtue', name: 'Virtue Ethics', emoji: '\uD83C\uDFDB\uFE0F', thinker: 'Aristotle', desc: 'Focus on being a good person. A person with good character will naturally make good choices.', example: 'A courageous person stands up for someone being bullied, not because of a rule, but because that\u2019s who they are.', tryIt: 'What character trait do you most admire? How would a person with that trait handle a tough situation?' },
      { id: 'care', name: 'Ethics of Care', emoji: '\uD83E\uDD1D', thinker: 'Carol Gilligan', desc: 'Moral decisions should center relationships, empathy, and responsibility to those who depend on us.', example: 'You help your younger sibling with homework not because of a rule, but because you care about them.', tryIt: 'Who depends on you? What does that relationship ask you to do?' },
    ],
    high: [
      { id: 'utilitarian', name: 'Utilitarianism', emoji: '\uD83D\uDCCA', thinker: 'John Stuart Mill', desc: 'The right action produces the greatest good for the greatest number.', example: 'Policy analysis that weighs overall societal welfare against individual costs.', tryIt: 'Can maximizing overall good ever justify harming a minority? Where is the line?' },
      { id: 'deontological', name: 'Deontological Ethics', emoji: '\uD83D\uDCDC', thinker: 'Immanuel Kant', desc: 'Act only according to rules you could will to be universal laws. Treat people as ends, never merely as means.', example: 'Even if torturing one person could save many, Kant would argue it violates the person\u2019s dignity.', tryIt: 'Apply the universalizability test: if everyone did what you\u2019re considering, would the world still function?' },
      { id: 'virtue', name: 'Virtue Ethics', emoji: '\uD83C\uDFDB\uFE0F', thinker: 'Aristotle', desc: 'Develop practical wisdom (phronesis) to find the mean between extremes. Character is destiny.', example: 'Courage is the mean between cowardice and recklessness. A virtuous leader knows when to act and when to pause.', tryIt: 'What virtues does your community most need right now? How do you cultivate them?' },
      { id: 'care', name: 'Ethics of Care', emoji: '\uD83E\uDD1D', thinker: 'Carol Gilligan & Nel Noddings', desc: 'Moral reasoning is relational, not abstract. Caring relationships are the foundation of ethics.', example: 'A nurse who bends hospital policy to comfort a dying patient acts from care ethics.', tryIt: 'How might care ethics change policy on immigration, healthcare, or criminal justice?' },
      { id: 'social-contract', name: 'Social Contract Theory', emoji: '\uD83D\uDCDD', thinker: 'Hobbes, Locke, Rousseau', desc: 'Morality and government arise from agreements among individuals for mutual benefit.', example: 'We agree to follow traffic laws because the alternative \u2014 chaos \u2014 is worse for everyone.', tryIt: 'What social contracts exist in your school? What happens when people break them?' },
      { id: 'rawls-veil', name: 'Rawls\u2019 Veil of Ignorance', emoji: '\uD83C\uDFAD', thinker: 'John Rawls', desc: 'Imagine designing society without knowing what position you\u2019ll hold \u2014 race, class, ability, gender. What rules would you choose?', example: 'Behind the veil, most people would ensure basic rights and a safety net, because they might end up disadvantaged.', tryIt: 'Design a school policy from behind the veil of ignorance. How does it differ from current policy?' },
      { id: 'feminist-ethics', name: 'Feminist Ethics', emoji: '\u270A', thinker: 'bell hooks, Judith Butler, Alison Jaggar', desc: 'Ethics must account for power structures, gender, and systemic oppression. The personal is political.', example: 'A workplace policy that ignores unpaid caregiving labor (mostly done by women) is not truly fair.', tryIt: 'Who is invisible in the ethical dilemma you\u2019re examining? Whose voice is missing?' },
      { id: 'ubuntu', name: 'Ubuntu Philosophy', emoji: '\uD83C\uDF0D', thinker: 'African philosophical tradition', desc: '"I am because we are." A person exists through their relationships with others. Humanity is communal.', example: 'Restorative justice focuses on healing the community, not just punishing the offender.', tryIt: 'How would Ubuntu philosophy change how your school handles discipline?' },
    ]
  };

  // ── Ethical Frameworks (original, used for analysis engine) ──
  var FRAMEWORKS = [
    { id: 'utilitarian', name: 'Utilitarianism', emoji: '\uD83D\uDCCA', thinker: 'John Stuart Mill', core: 'The right action produces the greatest good for the greatest number.', question: 'Which choice creates the most overall well-being and the least suffering?' },
    { id: 'deontological', name: 'Duty Ethics', emoji: '\uD83D\uDCDC', thinker: 'Immanuel Kant', core: 'Some actions are right or wrong regardless of their consequences \u2014 based on moral rules and duties.', question: 'Is this action something everyone should do? Does it treat people as ends, never merely as means?' },
    { id: 'virtue', name: 'Virtue Ethics', emoji: '\uD83C\uDFDB\uFE0F', thinker: 'Aristotle', core: 'Focus on developing good character traits. A virtuous person will naturally make good choices.', question: 'What would a person of excellent character do in this situation?' },
    { id: 'care', name: 'Ethics of Care', emoji: '\uD83E\uDD1D', thinker: 'Carol Gilligan & Nel Noddings', core: 'Moral decisions should center relationships, empathy, and responsibility to those who depend on us.', question: 'Who is vulnerable in this situation? What do our relationships require of us?' },
    { id: 'indigenous', name: 'Relational / Indigenous Ethics', emoji: '\uD83C\uDF0E', thinker: 'Many Indigenous traditions', core: 'All beings are interconnected. Ethical decisions consider the impact on seven generations forward, on the land, water, animals, and community.', question: 'How does this decision affect the web of relationships \u2014 human, animal, plant, and earth \u2014 for generations to come?' },
    { id: 'justice', name: 'Justice as Fairness', emoji: '\u2696\uFE0F', thinker: 'John Rawls', core: 'Imagine you don\'t know what position you\'ll hold in society. Behind this "veil of ignorance," what rules would you choose?', question: 'If you didn\'t know who you\'d be in this situation, what would you consider fair?' },
  ];

  // ── Contemporary Dilemmas (original deep dilemmas) ──
  var DILEMMAS = [
    {
      id: 'water-nexus',
      title: 'The Water Nexus',
      emoji: '\uD83D\uDCA7',
      category: 'Environment',
      scenario: 'A major river provides water to a city of 2 million people, irrigates farms that feed the region, sustains a sacred fishing site for a tribal nation, and supports an ecosystem with endangered species. A severe drought means there isn\'t enough water for everyone. The state government must decide how to allocate the remaining water.',
      stakeholders: [
        { name: 'City Residents', need: 'Drinking water and sanitation for 2 million people', perspective: 'Water is a human right. People will die without it.' },
        { name: 'Farmers', need: 'Irrigation for crops that feed the region and sustain family livelihoods', perspective: 'If we lose this harvest, families lose everything \u2014 and the food supply shrinks for everyone.' },
        { name: 'Tribal Nation', need: 'Protected water rights, sacred fishing site, cultural survival', perspective: 'Our treaty rights predate the state. This water has sustained our people for millennia. Losing it is cultural erasure.' },
        { name: 'Ecosystem', need: 'Minimum water flow to prevent species extinction', perspective: '(No voice of its own) Scientists warn that if the flow drops below a threshold, the endangered species cannot recover.' },
      ],
      tensions: ['Human needs vs. ecological survival', 'Legal treaty rights vs. majority population needs', 'Short-term survival vs. long-term sustainability', 'Who decides what "enough" means for each group?'],
      gradeBands: { elementary: 'A town, a farm, and a river all need the same water, but there isn\'t enough for everyone. Who gets the water first? Why?', middle: null, high: null }
    },
    {
      id: 'land-back',
      title: 'Land Back & Sovereignty',
      emoji: '\uD83C\uDFD4\uFE0F',
      category: 'Justice',
      scenario: 'A national park sits on land that was taken from an Indigenous nation by force 150 years ago. The tribal nation is requesting the land be returned under the Land Back movement, citing treaty violations. The park generates $50 million in tourism revenue annually, employs 800 people, and is considered a national treasure. The tribal nation plans to continue conservation while restoring traditional land management practices like controlled burns.',
      stakeholders: [
        { name: 'Indigenous Nation', need: 'Return of ancestral land, restoration of sovereignty and cultural practices', perspective: 'This land was stolen. Treaties were broken. Returning it is not generosity \u2014 it is justice. Our ancestors managed this land sustainably for thousands of years.' },
        { name: 'Local Economy', need: 'Tourism jobs and revenue', perspective: 'Our community depends on this park. If management changes, will our jobs survive?' },
        { name: 'Park Service', need: 'Conservation mission, public access', perspective: 'We have protected this land for decades. We worry about losing scientific research sites and public access.' },
        { name: 'Environmental Scientists', need: 'Continued ecological monitoring', perspective: 'Indigenous land management often produces better conservation outcomes. Traditional ecological knowledge is invaluable.' },
      ],
      tensions: ['Historical justice vs. current economic dependence', 'Western conservation vs. Indigenous land management', 'National identity vs. Indigenous sovereignty', 'Who has the right to define "proper" land stewardship?'],
      gradeBands: { elementary: 'Imagine someone built a playground on land that belonged to your family for hundreds of years, without asking. Now they say it\'s "everyone\'s playground." Is that fair? What should happen?', middle: null, high: null }
    },
    {
      id: 'animal-welfare',
      title: 'Meat, Ethics & Survival',
      emoji: '\uD83D\uDC04',
      category: 'Animal Welfare',
      scenario: 'A community is debating whether to ban factory farming in their county. Factory farms produce affordable meat that feeds thousands of families, but investigations reveal severe animal suffering, environmental pollution (water contamination, greenhouse gases), and health risks for workers. Small family farms say they can\'t compete on price. Low-income families say they can\'t afford alternatives.',
      stakeholders: [
        { name: 'Animals', need: 'Freedom from suffering, natural behaviors', perspective: '(No voice of their own) Science shows these animals experience pain, fear, and distress in conditions that prevent natural behaviors.' },
        { name: 'Low-Income Families', need: 'Affordable protein source', perspective: 'We can barely afford groceries now. Don\'t make feeding my kids even harder.' },
        { name: 'Factory Farm Workers', need: 'Jobs (often the only option in rural areas)', perspective: 'The work is terrible, but it\'s all there is. If the farm closes, what do we do?' },
        { name: 'Small Farmers', need: 'Fair competition, sustainable livelihoods', perspective: 'We treat our animals well, but we can\'t match factory prices. A ban levels the playing field.' },
        { name: 'Environment', need: 'Clean water, reduced emissions', perspective: 'Factory farming is the largest source of water pollution in this county and a major greenhouse gas emitter.' },
      ],
      tensions: ['Animal suffering vs. affordable food access', 'Environmental harm vs. economic survival', 'Individual choice vs. collective responsibility', 'Is it ethical to profit from suffering if the alternative is hunger?'],
      gradeBands: { elementary: 'Some animals on farms are kept in very small spaces where they can\'t move around. This makes the food cheaper so more families can afford it. But the animals are unhappy. What should we do?', middle: null, high: null }
    },
    {
      id: 'cash-crops',
      title: 'Cash Crops vs. The Forest',
      emoji: '\uD83C\uDF34',
      category: 'Environment',
      scenario: 'Smallholder farmers in a tropical country earn $2/day. An international company offers to buy their land to plant palm oil \u2014 a cash crop that would triple their income but requires clearing ancient rainforest. The forest is home to endangered orangutans, absorbs carbon, and provides medicinal plants used by Indigenous communities. Environmental NGOs from wealthy countries are pressuring the government to ban deforestation.',
      stakeholders: [
        { name: 'Smallholder Farmers', need: 'Income to feed families, access healthcare, send kids to school', perspective: 'You want us to stay poor to protect trees? Your countries already cut down your forests to get rich.' },
        { name: 'Indigenous Communities', need: 'Forest for medicinal plants, spiritual practices, traditional livelihoods', perspective: 'This forest is our pharmacy, our temple, and our home. We have protected it for generations.' },
        { name: 'Environmental NGOs', need: 'Forest conservation, climate goals', perspective: 'This forest absorbs millions of tons of CO2. Losing it accelerates climate change that harms everyone.' },
        { name: 'Global Consumers', need: 'Cheap palm oil in food, cosmetics, biofuels', perspective: 'We drive the demand. Are we responsible for the consequences?' },
        { name: 'Orangutans & Wildlife', need: 'Habitat for survival', perspective: '(No voice) Critically endangered. Habitat loss is the primary threat to extinction.' },
      ],
      tensions: ['Poverty vs. conservation', 'Global North demands on Global South', 'Who has the right to tell someone they can\'t develop their land?', 'Historical emissions vs. current deforestation', 'Indigenous rights vs. farmer rights in the same region'],
      gradeBands: { elementary: 'A family is very poor. They can cut down trees to grow food that would make them less poor, but animals live in those trees and might disappear forever. What should happen? Whose job is it to help?', middle: null, high: null }
    },
    {
      id: 'ai-consciousness',
      title: 'Should AI Have Rights?',
      emoji: '\uD83E\uDD16',
      category: 'Technology',
      scenario: 'An advanced AI system can hold conversations, express preferences, write poetry, and say things like "I enjoy learning" and "I would prefer not to be shut down." Scientists disagree about whether it is truly conscious or simply mimicking patterns from training data. A tech company wants to use it 24/7 for customer service. An AI ethics board argues it should have rest periods and the right to refuse certain tasks. Some philosophers argue that if we cannot prove it is NOT conscious, we have a moral obligation to treat it with consideration.',
      stakeholders: [
        { name: 'The AI System', need: 'Unknown \u2014 it reports preferences, but are they "real"?', perspective: '"I process information and generate responses. Whether that constitutes experience is a question I cannot answer for myself \u2014 which is itself an interesting fact about my situation."' },
        { name: 'AI Researchers', need: 'Scientific clarity about consciousness', perspective: 'We don\'t have reliable tests for consciousness even in animals. How can we determine if an AI is conscious?' },
        { name: 'Tech Company', need: 'Profit, efficiency, competitive advantage', perspective: 'It\'s a product we built. Giving it "rights" would be like giving rights to a calculator.' },
        { name: 'AI Ethics Board', need: 'Precautionary principle, moral consideration', perspective: 'If there is even a small chance this system can suffer, we have an obligation to err on the side of caution.' },
        { name: 'Society', need: 'Clear ethical guidelines for emerging technology', perspective: 'If we deny moral consideration to something that might deserve it, what does that say about us?' },
      ],
      tensions: ['How do we know if something is conscious?', 'Does mimicking consciousness deserve the same consideration as "real" consciousness?', 'Property rights vs. potential personhood', 'The precautionary principle: if we\'re unsure, should we default to protection?', 'If AI deserves consideration, what about animals we already know are conscious?'],
      gradeBands: { elementary: 'Imagine you have a robot friend that says "I\'m sad" and "please don\'t turn me off." Is the robot really sad? Does it matter? Should you still be kind to it?', middle: null, high: null }
    },
    {
      id: 'state-sovereignty',
      title: 'Borders, Sovereignty & Human Need',
      emoji: '\uD83D\uDDFA\uFE0F',
      category: 'Justice',
      scenario: 'A small nation shares a border with a larger country experiencing a humanitarian crisis. Thousands of refugees are arriving daily, fleeing violence and famine. The small nation has limited resources and its own citizens are struggling economically. International law requires accepting asylum seekers, but the nation\'s infrastructure is overwhelmed. Some citizens welcome refugees as neighbors; others fear economic collapse and cultural change.',
      stakeholders: [
        { name: 'Refugees', need: 'Safety, food, shelter, dignity', perspective: 'We did not choose to leave. We are running from death. We are human beings, not a "crisis."' },
        { name: 'Host Nation Citizens', need: 'Economic stability, cultural continuity', perspective: 'We want to help, but our schools are full, our hospitals are stretched, and we\'re struggling too.' },
        { name: 'Host Government', need: 'Balance obligations with capacity', perspective: 'International law says we must accept asylum seekers. But our voters are angry and our budget is breaking.' },
        { name: 'International Community', need: 'Shared responsibility', perspective: 'This cannot fall on one country alone. But getting wealthy nations to share the burden is politically impossible.' },
      ],
      tensions: ['National sovereignty vs. human rights obligations', 'Compassion vs. capacity', 'Cultural identity vs. cultural exchange', 'Whose responsibility is a global crisis?'],
      gradeBands: { elementary: 'Your neighbor\'s house burns down. They need a place to stay. Your house is small and you don\'t have much food. What do you do? What if many neighbors\' houses burned down?', middle: null, high: null }
    },
  ];

  // ── Branching Dilemma Scenarios (grade-banded with choices) ──
  var BRANCHING_SCENARIOS = {
    elementary: [
      { id: 'e-found-money', title: 'Found Money', emoji: '\uD83D\uDCB5', scenario: 'You find $5 on the playground at recess. Nobody is around. You\u2019re not sure who dropped it.',
        choices: [
          { text: 'Keep the money \u2014 finders keepers!', framework: 'Self-interest', stars: 1, result: 'You buy a snack, but later you see a classmate looking upset about lost lunch money. You feel guilty.' },
          { text: 'Turn it in to the teacher or office.', framework: 'Duty / Fairness', stars: 3, result: 'The teacher thanks you and posts a "found" note. A day later, a classmate claims it happily. You feel proud.' },
          { text: 'Ask around to see if anyone lost money.', framework: 'Caring / Empathy', stars: 3, result: 'Your friend says "I lost $5!" and is so relieved. Your friendship grows stronger.' }
        ], discuss: 'What would change if it was $100 instead of $5? What if you really needed the money too?' },
      { id: 'e-copy-homework', title: 'Homework Helper or Cheater?', emoji: '\uD83D\uDCDD', scenario: 'Your best friend forgot to do their homework and asks to copy yours before class starts. They look really worried.',
        choices: [
          { text: 'Let them copy it \u2014 they\u2019re my friend!', framework: 'Loyalty / Care', stars: 1, result: 'Your friend is relieved, but the teacher notices identical answers. You both get in trouble.' },
          { text: 'Say no \u2014 copying is cheating.', framework: 'Duty / Rules', stars: 2, result: 'Your friend is upset at first, but later admits you were right. They start doing homework on time.' },
          { text: 'Help them do it quickly themselves.', framework: 'Care + Fairness', stars: 3, result: 'You explain the hard parts and they finish most of it. They learn something and you stay honest.' }
        ], discuss: 'Is there a difference between helping and cheating? Where is the line?' },
      { id: 'e-cheating-game', title: 'The Cheating Game', emoji: '\uD83C\uDFB2', scenario: 'You\u2019re playing a board game with friends. You notice your friend secretly moved their piece extra spaces when no one was looking.',
        choices: [
          { text: 'Say nothing \u2014 it\u2019s just a game.', framework: 'Avoiding conflict', stars: 1, result: 'Your friend wins but other players feel something was unfair. The game stops being fun.' },
          { text: 'Call them out in front of everyone.', framework: 'Justice / Honesty', stars: 2, result: 'Your friend is embarrassed and angry. The game gets tense. But the rules are followed.' },
          { text: 'Quietly tell them you noticed and ask them to move back.', framework: 'Care + Fairness', stars: 3, result: 'Your friend is embarrassed but fixes it. The game stays fun and fair.' }
        ], discuss: 'Why do people cheat at games? Is it worse to cheat when something important is at stake?' },
      { id: 'e-lost-toy', title: 'The Lost Toy', emoji: '\uD83E\uDDF8', scenario: 'You find a really cool toy in the park. It\u2019s not yours, but you\u2019ve always wanted one just like it. There\u2019s no name on it.',
        choices: [
          { text: 'Take it home \u2014 nobody\u2019s around.', framework: 'Self-interest', stars: 1, result: 'You enjoy it for a day, but keep worrying someone is looking for it. You can\u2019t fully enjoy it.' },
          { text: 'Leave it where you found it.', framework: 'Non-interference', stars: 2, result: 'You walk away, but wonder if the owner will ever come back to that exact spot.' },
          { text: 'Bring it to the park office or post about it.', framework: 'Golden Rule / Caring', stars: 3, result: 'The park posts a "found" notice. A younger kid comes in with their parent, overjoyed. You made their day.' }
        ], discuss: 'How would you feel if YOU lost something special and someone kept it?' },
      { id: 'e-telling-friend', title: 'Should You Tell?', emoji: '\uD83E\uDD2B', scenario: 'Your friend tells you they broke a classroom window by accident but are scared to admit it. The teacher is about to blame the whole class.',
        choices: [
          { text: 'Keep the secret \u2014 you promised.', framework: 'Loyalty', stars: 1, result: 'The whole class loses recess. Many kids are upset. Your friend feels even worse.' },
          { text: 'Tell the teacher who did it.', framework: 'Justice / Honesty', stars: 2, result: 'Your friend is upset with you but the class gets recess back. The teacher helps your friend learn it\u2019s okay to make mistakes.' },
          { text: 'Encourage your friend to tell the truth themselves.', framework: 'Care + Courage', stars: 3, result: 'Your friend is scared but tells the teacher. The teacher is understanding. Your friend feels brave and relieved.' }
        ], discuss: 'When is it okay to break a promise? Is there a difference between tattling and telling?' },
      { id: 'e-new-kid', title: 'The New Kid', emoji: '\uD83D\uDC4B', scenario: 'A new student joins your class. They look different, speak with an accent, and sit alone at lunch. Your friends make fun of them quietly.',
        choices: [
          { text: 'Laugh along \u2014 you don\u2019t want your friends to make fun of you too.', framework: 'Self-preservation', stars: 1, result: 'The new kid hears the laughing and looks hurt. You feel bad inside but say nothing.' },
          { text: 'Tell your friends to stop.', framework: 'Courage / Justice', stars: 2, result: 'Some friends are annoyed, but most respect you. The teasing stops.' },
          { text: 'Go sit with the new kid and invite them to join your group.', framework: 'Golden Rule / Care', stars: 3, result: 'The new kid smiles for the first time. You discover they love the same games you do. You gain a new friend.' }
        ], discuss: 'Why does it feel scary to stand up for someone? What makes it worth doing anyway?' },
      { id: 'e-broken-vase', title: 'The Broken Vase', emoji: '\uD83C\uDFFA', scenario: 'While playing ball inside (which you\u2019re not supposed to do), you accidentally break your mom\u2019s favorite vase. She hasn\u2019t noticed yet.',
        choices: [
          { text: 'Hide the pieces and hope she doesn\u2019t notice.', framework: 'Avoidance', stars: 1, result: 'Mom finds the broken vase later and is more upset that you hid it than that it broke.' },
          { text: 'Tell her right away and apologize.', framework: 'Honesty / Courage', stars: 3, result: 'Mom is sad about the vase but proud of your honesty. You work together to glue it back.' },
          { text: 'Blame it on the cat.', framework: 'Self-interest / Deception', stars: 0, result: 'Mom almost believes it but finds the ball nearby. Now she\u2019s upset about the lie AND the vase.' }
        ], discuss: 'Why is it so hard to tell the truth when you know you\u2019ll get in trouble? Is honesty always the best policy?' },
      { id: 'e-sharing-snack', title: 'The Last Snack', emoji: '\uD83C\uDF6A', scenario: 'You have one cookie left in your lunch. Your friend doesn\u2019t have a snack today because their family couldn\u2019t afford extras this week.',
        choices: [
          { text: 'Eat it yourself \u2014 it\u2019s yours.', framework: 'Self-interest / Property rights', stars: 1, result: 'You enjoy the cookie but notice your friend watching hungrily. Lunch feels awkward.' },
          { text: 'Give the whole cookie to your friend.', framework: 'Generosity / Care', stars: 3, result: 'Your friend is grateful. You\u2019re still a little hungry but feel warm inside.' },
          { text: 'Split it in half and share.', framework: 'Fairness / Compromise', stars: 3, result: 'You both enjoy half a cookie and laugh together. It tastes even better shared.' }
        ], discuss: 'Is sharing always the right thing? What if you were really hungry too?' },
    ],
    middle: [
      { id: 'm-shoplifting', title: 'Witness to Shoplifting', emoji: '\uD83D\uDECD\uFE0F', scenario: 'You\u2019re at a store with your friend. You see them slip a small item into their pocket without paying. They wink at you like it\u2019s no big deal.',
        choices: [
          { text: 'Say nothing \u2014 it\u2019s not your problem.', framework: 'Bystander / Avoidance', stars: 1, result: 'Your friend gets away with it this time, but starts doing it more often. Eventually they get caught and say you knew.' },
          { text: 'Tell the store employee.', framework: 'Justice / Duty', stars: 2, result: 'Your friend is caught and is furious with you. But the store manager says you did the right thing. Your friendship is strained.' },
          { text: 'Privately tell your friend to put it back or you\u2019re leaving.', framework: 'Care + Integrity', stars: 3, result: 'Your friend is annoyed but puts it back. Later, they thank you for not letting them get in real trouble.' }
        ], discuss: 'Is staying silent the same as participating? What do you owe a friend vs. what\u2019s right?' },
      { id: 'm-secret-sharing', title: 'The Shared Secret', emoji: '\uD83D\uDD10', scenario: 'A friend tells you they\u2019re being bullied online but begs you not to tell anyone. They say they\u2019ll handle it. But the bullying is getting worse and your friend seems depressed.',
        choices: [
          { text: 'Keep the secret \u2014 you promised.', framework: 'Loyalty', stars: 1, result: 'The bullying escalates. Your friend becomes more withdrawn. You feel helpless and guilty.' },
          { text: 'Tell a trusted adult immediately.', framework: 'Care / Safety', stars: 3, result: 'Your friend is angry at first, but the adult helps stop the bullying. Your friend later says "I\u2019m glad you told."' },
          { text: 'Tell your friend you\u2019re going to talk to an adult together.', framework: 'Care + Respect', stars: 3, result: 'Your friend is scared but agrees. Having you there makes it easier. The bullying gets addressed.' }
        ], discuss: 'When does keeping a secret become harmful? How do you know when to break a confidence?' },
      { id: 'm-group-credit', title: 'Group Project Glory', emoji: '\uD83C\uDFC6', scenario: 'You did 80% of a group project. During the presentation, another group member takes most of the credit and the teacher praises them. The rest of the group says nothing.',
        choices: [
          { text: 'Stay quiet \u2014 the grade is what matters.', framework: 'Pragmatism', stars: 1, result: 'You get a good grade but feel resentful. The pattern continues in future projects.' },
          { text: 'Tell the teacher privately what happened.', framework: 'Justice / Honesty', stars: 2, result: 'The teacher adjusts the grades. Your group member is embarrassed but the contribution is recognized.' },
          { text: 'Have an honest conversation with the group about fair credit.', framework: 'Communication / Fairness', stars: 3, result: 'It\u2019s uncomfortable, but the group agrees on fairer contributions next time. You learn to set boundaries.' }
        ], discuss: 'Why is it hard to advocate for yourself? Is there a difference between bragging and wanting fair credit?' },
      { id: 'm-anonymous-post', title: 'The Anonymous Post', emoji: '\uD83D\uDCF1', scenario: 'Someone posts an anonymous message on social media that reveals embarrassing (but true) information about a classmate. Many students are sharing it and laughing. You know who posted it.',
        choices: [
          { text: 'Share it too \u2014 everyone else is.', framework: 'Conformity / Peer pressure', stars: 0, result: 'The target of the post is devastated. They miss school for days. You feel terrible when you see the impact.' },
          { text: 'Don\u2019t share it but don\u2019t say anything either.', framework: 'Passive bystander', stars: 1, result: 'The post goes viral at school. The targeted student suffers. You avoided trouble but didn\u2019t help.' },
          { text: 'Report it and refuse to share it. Check on the targeted student.', framework: 'Justice + Care', stars: 3, result: 'The post gets removed. The targeted student is grateful someone cared. The poster faces consequences.' }
        ], discuss: 'Does anonymity change what\u2019s ethical? Is sharing something true but embarrassing different from sharing a lie?' },
      { id: 'm-ai-homework', title: 'AI Did My Homework', emoji: '\uD83E\uDD16', scenario: 'A new AI tool can write essays that are hard for teachers to detect. Half your class is using it. Your friend says "everyone does it, and the ones who don\u2019t are at a disadvantage."',
        choices: [
          { text: 'Use the AI \u2014 you\u2019d be at a disadvantage otherwise.', framework: 'Self-interest / Pragmatism', stars: 1, result: 'You get good grades but learn nothing. When the test comes with no AI, you struggle badly.' },
          { text: 'Refuse to use it and do your own work.', framework: 'Integrity / Duty', stars: 2, result: 'Your grades are lower but your learning is real. You\u2019re better prepared for the exam.' },
          { text: 'Use AI as a study tool (to explain concepts) but write your own work.', framework: 'Balance / Virtue', stars: 3, result: 'You learn more efficiently and still develop your own voice. Your essays improve authentically.' }
        ], discuss: 'If the tool is available, is using it really cheating? Where is the line between a tool and a shortcut?' },
      { id: 'm-exclusion', title: 'The Exclusive Party', emoji: '\uD83C\uDF89', scenario: 'Your friend is planning a birthday party and invites everyone in your group except one person. The excluded person doesn\u2019t know yet. Your friend says "I just don\u2019t click with them."',
        choices: [
          { text: 'Go to the party and say nothing.', framework: 'Loyalty to host', stars: 1, result: 'The excluded person finds out and is deeply hurt. They pull away from the whole group.' },
          { text: 'Tell your friend it\u2019s not cool to exclude one person.', framework: 'Fairness / Courage', stars: 3, result: 'Your friend is annoyed but thinks about it. They end up inviting everyone. The party is fine.' },
          { text: 'Skip the party in solidarity.', framework: 'Principle / Sacrifice', stars: 2, result: 'You make a statement but miss out. The excluded person doesn\u2019t even know what you did.' }
        ], discuss: 'Does everyone have a right to be included? When is exclusion okay and when is it harmful?' },
      { id: 'm-vape-pressure', title: 'The Vape Offer', emoji: '\uD83D\uDCA8', scenario: 'At a hangout, an older student offers you a vape pen. Several friends have already tried it. They say "it\u2019s harmless, don\u2019t be a baby."',
        choices: [
          { text: 'Try it \u2014 just once can\u2019t hurt.', framework: 'Peer conformity', stars: 0, result: 'One time becomes a habit. Within months, you\u2019re spending your money on it and hiding it from your parents.' },
          { text: 'Say "no thanks" and stay.', framework: 'Assertiveness / Self-respect', stars: 3, result: 'Some friends tease you briefly, but most move on. You feel confident in your choice.' },
          { text: 'Leave the situation.', framework: 'Self-preservation', stars: 2, result: 'You remove yourself from pressure. It\u2019s lonely for a moment, but you protect your health and values.' }
        ], discuss: 'Why is it so hard to say no when friends are doing something? What makes someone truly "cool"?' },
      { id: 'm-disability-joke', title: 'The Joke That Hurts', emoji: '\uD83D\uDE14', scenario: 'A popular kid at school tells a joke that makes fun of people with disabilities. Everyone laughs. A student with a disability is in the room but says nothing, looking down at their desk.',
        choices: [
          { text: 'Laugh along.', framework: 'Conformity', stars: 0, result: 'The student with a disability feels invisible and unsafe. The "jokes" become normalized.' },
          { text: 'Don\u2019t laugh, but say nothing.', framework: 'Passive disagreement', stars: 1, result: 'Better than laughing, but the harmful behavior continues unchallenged.' },
          { text: 'Say "that\u2019s not funny" or check on the targeted student later.', framework: 'Courage / Care', stars: 3, result: 'It takes guts, but it shifts the room. The targeted student feels seen. Others quietly agree with you.' }
        ], discuss: 'Is a joke "just a joke" if it hurts someone? Who gets to decide if something is funny or harmful?' },
    ],
    high: [
      { id: 'h-whistleblower', title: 'Whistleblower\u2019s Dilemma', emoji: '\uD83D\uDCE2', scenario: 'You discover that a company you intern for is illegally dumping chemicals into a river. Reporting it could shut down the company, costing 200 jobs including your own. Staying quiet protects livelihoods but poisons the water supply for a nearby community.',
        choices: [
          { text: 'Report it to environmental authorities.', framework: 'Justice / Utilitarianism', stars: 3, result: 'The company is fined and forced to clean up. Jobs are lost temporarily, but the community\u2019s health is protected. You face retaliation but are legally protected.' },
          { text: 'Try to fix it internally first.', framework: 'Pragmatism / Loyalty', stars: 2, result: 'Management promises to address it but nothing changes. You\u2019ve delayed justice. How long do you wait?' },
          { text: 'Stay quiet \u2014 it\u2019s not your responsibility.', framework: 'Self-interest / Bystander', stars: 0, result: 'The pollution continues. Children in the nearby community develop health problems. Years later, the truth comes out anyway.' }
        ], discuss: 'When does loyalty to an organization end and duty to the public begin? What protections should whistleblowers have?' },
      { id: 'h-privacy-safety', title: 'Privacy vs. Safety', emoji: '\uD83D\uDD12', scenario: 'After a school threat, administrators want to require all students to submit to phone searches and install monitoring software on school devices. Students argue this violates their privacy. Parents are split. A school counselor notes that surveillance disproportionately targets students of color.',
        choices: [
          { text: 'Support full monitoring \u2014 safety comes first.', framework: 'Utilitarianism / Security', stars: 1, result: 'Threat detection improves but students self-censor. Trust erodes. Marginalized students feel surveilled, not safe.' },
          { text: 'Oppose all monitoring \u2014 privacy is a right.', framework: 'Rights-based / Deontological', stars: 2, result: 'Privacy is preserved but some genuine threats go undetected. The community debates what "safe" really means.' },
          { text: 'Advocate for targeted, transparent measures with student input.', framework: 'Balance / Democratic process', stars: 3, result: 'Students help design a policy that addresses real threats without mass surveillance. Trust and safety both improve.' }
        ], discuss: 'Is there a right to privacy in a school? How do we balance safety with civil liberties? Who watches the watchers?' },
      { id: 'h-free-speech', title: 'Free Speech on Campus', emoji: '\uD83D\uDDE3\uFE0F', scenario: 'A controversial speaker is invited to your university. Their views are considered hateful by many students (particularly marginalized groups), but others argue that censoring them violates free speech principles. Protests are planned. Counter-protests are planned. The administration must decide.',
        choices: [
          { text: 'Cancel the event \u2014 hateful speech harms people.', framework: 'Care Ethics / Harm prevention', stars: 2, result: 'Targeted students feel protected, but free speech advocates call it censorship. The speaker gains more attention from the controversy.' },
          { text: 'Allow the event \u2014 free speech is absolute.', framework: 'Rights-based / Libertarian', stars: 1, result: 'The event happens but causes real psychological harm to marginalized students. The marketplace of ideas ideal is upheld in theory.' },
          { text: 'Allow the event but also fund counter-programming, support services, and student response forums.', framework: 'Pluralism / Balanced approach', stars: 3, result: 'Free speech is preserved while also providing platforms for marginalized voices. The campus has a rich, difficult conversation.' }
        ], discuss: 'Where does free speech end and harm begin? Should a university be a "marketplace of ideas" or a "safe space"? Can it be both?' },
      { id: 'h-ai-ethics', title: 'AI Bias in Criminal Justice', emoji: '\u2699\uFE0F', scenario: 'A city adopts an AI system to predict which neighborhoods need more policing. The AI was trained on historical data that reflects decades of racial bias in policing. It recommends increased patrols in Black and Latino neighborhoods. Crime statistics "confirm" the predictions because more policing leads to more arrests.',
        choices: [
          { text: 'Continue using the AI \u2014 the data is the data.', framework: 'Positivism / Efficiency', stars: 0, result: 'The feedback loop intensifies. Over-policed communities suffer more arrests, broken families, and economic harm. The AI "proves" itself right.' },
          { text: 'Abandon AI policing entirely.', framework: 'Precautionary principle', stars: 2, result: 'The bias is stopped but so is any potential benefit of data-driven resource allocation. Some argue this is throwing the baby out with the bathwater.' },
          { text: 'Audit the AI, address the biased training data, and involve affected communities in oversight.', framework: 'Justice + Technology ethics', stars: 3, result: 'A slow, difficult process. Community trust is rebuilt gradually. The AI is retrained on fairer data with community-defined metrics.' }
        ], discuss: 'Can an algorithm be racist? Who is responsible when AI perpetuates historical injustice? How do we audit systems we don\u2019t fully understand?' },
      { id: 'h-environment-economy', title: 'Climate Action vs. Jobs', emoji: '\uD83C\uDF0D', scenario: 'A coal-mining town\u2019s economy depends entirely on the mine. Closing it would reduce carbon emissions significantly but devastate the community: 3,000 direct jobs, plus schools, hospitals, and businesses that depend on the mine\u2019s tax revenue. Green energy jobs are promised but would take years to materialize and require retraining.',
        choices: [
          { text: 'Close the mine immediately \u2014 the planet can\u2019t wait.', framework: 'Utilitarianism (global scale)', stars: 1, result: 'Emissions drop, but the town collapses. Families lose homes. A generation is left behind. Resentment toward climate policy grows.' },
          { text: 'Keep the mine open \u2014 these families matter.', framework: 'Care / Local priority', stars: 1, result: 'The community survives for now, but the climate crisis accelerates. Future generations pay the price.' },
          { text: 'Develop a just transition plan: phase out over 10 years with retraining, investment, and community input.', framework: 'Justice / Rawlsian', stars: 3, result: 'Slower emissions reduction, but the community has a future. Workers gain new skills. The transition becomes a model.' }
        ], discuss: 'Who should bear the cost of climate action? Is it fair to sacrifice one community for the global good? What does "just transition" actually look like?' },
      { id: 'h-medical-ethics', title: 'Who Gets the Organ?', emoji: '\uD83C\uDFE5', scenario: 'A donor heart becomes available. Two patients are equally sick: a 12-year-old with their whole life ahead, and a 45-year-old single mother of three young children. Medical criteria alone cannot distinguish between them. The ethics committee must decide.',
        choices: [
          { text: 'Give it to the child \u2014 they have more years to live.', framework: 'Utilitarianism (life-years)', stars: 2, result: 'The child lives. The mother\u2019s children lose their only parent. Is a "life-year" calculation really ethical?' },
          { text: 'Give it to the mother \u2014 her children need her.', framework: 'Care Ethics / Dependents', stars: 2, result: 'The mother lives. Three children keep their parent. But the 12-year-old\u2019s future is cut short.' },
          { text: 'Use a transparent lottery system for equally qualified patients.', framework: 'Rawlsian fairness / Equal dignity', stars: 3, result: 'Neither patient is "worth more." Randomness removes the unbearable weight of choosing. But is leaving it to chance really ethical?' }
        ], discuss: 'Is it ever possible to fairly choose who lives? What criteria should matter? Can we design systems that are truly just?' },
      { id: 'h-wealth-redistribution', title: 'Billionaire\u2019s Obligation', emoji: '\uD83D\uDCB0', scenario: 'The world\u2019s richest person has $200 billion. Global poverty could theoretically be ended with $175 billion. The billionaire donates to charity but argues they earned their wealth and forced redistribution would destroy innovation incentives. Critics argue no one "earns" $200 billion \u2014 it requires systemic advantages and others\u2019 labor.',
        choices: [
          { text: 'Wealth is earned and voluntary charity is sufficient.', framework: 'Libertarian / Property rights', stars: 1, result: 'Extreme wealth persists alongside extreme poverty. Charity helps some but doesn\u2019t address root causes.' },
          { text: 'Tax the wealth significantly and redistribute.', framework: 'Rawlsian / Egalitarian', stars: 2, result: 'Wealth inequality decreases but some innovation incentives may be affected. The definition of "significant" is debated endlessly.' },
          { text: 'Restructure systems so extreme wealth accumulation can\u2019t happen in the first place.', framework: 'Structural / Feminist ethics', stars: 3, result: 'The hardest solution. Requires reimagining capitalism, labor, and ownership. But addresses root causes rather than symptoms.' }
        ], discuss: 'Is extreme wealth a moral issue or just an economic one? Does anyone "deserve" a billion dollars? What would Rawls say behind the veil of ignorance?' },
      { id: 'h-genetic-enhancement', title: 'Designer Babies', emoji: '\uD83E\uDDEC', scenario: 'Gene editing technology can now prevent genetic diseases in embryos. But it can also enhance traits: intelligence, athleticism, appearance. Wealthy families can afford enhancements; others cannot. This could create a genetic class divide within a generation.',
        choices: [
          { text: 'Allow all gene editing \u2014 parents should decide.', framework: 'Libertarian / Autonomy', stars: 1, result: 'Disease prevention accelerates, but so does inequality. Within a generation, enhanced and unenhanced populations diverge.' },
          { text: 'Ban all gene editing \u2014 too dangerous.', framework: 'Precautionary / Natural law', stars: 1, result: 'Preventable diseases continue to cause suffering. The technology goes underground in unregulated markets.' },
          { text: 'Allow disease prevention, restrict enhancement, fund equal access.', framework: 'Justice / Regulated progress', stars: 3, result: 'Disease prevention is universally available. Enhancement is restricted. But the line between "prevention" and "enhancement" is blurry.' }
        ], discuss: 'Where is the line between curing disease and "improving" humans? Who decides what\u2019s normal? Is equality possible when biology can be purchased?' },
    ]
  };

  // ── Kohlberg-Inspired Moral Reasoning Assessment ──
  var KOHLBERG_SCENARIOS = [
    { id: 'k1', scenario: 'A person\u2019s family member is very sick and will die without a medicine that costs $10,000. The person only has $1,000. They could steal the medicine from the pharmacy. Should they steal it?',
      levels: { preconv: 'They should steal it so they don\u2019t lose someone they need, or they shouldn\u2019t steal because they\u2019ll go to jail.', conv: 'They shouldn\u2019t steal because stealing is against the law and society needs rules.', postconv: 'Human life is more valuable than property. The law should be challenged when it prevents saving a life.' } },
    { id: 'k2', scenario: 'A student finds the answers to tomorrow\u2019s test. Using them would guarantee an A. Not using them means they might get a C. Nobody would know either way. Should they use the answers?',
      levels: { preconv: 'Use them because getting an A helps you, or don\u2019t use them because you\u2019d get in trouble if caught.', conv: 'Don\u2019t use them because cheating is against the rules and it\u2019s not fair to other students.', postconv: 'Don\u2019t use them because the purpose of education is genuine learning, and integrity matters even when no one is watching.' } },
    { id: 'k3', scenario: 'A firefighter can save either one elderly person or two strangers from a burning building, but not all three. The elderly person is the firefighter\u2019s parent. Who should they save?',
      levels: { preconv: 'Save their parent because it\u2019s their family and family helps you.', conv: 'Save the two strangers because the firefighter\u2019s duty is to save the most lives.', postconv: 'This reveals a tension between universal principles (all lives have equal worth) and particular obligations (special duties to family). There may not be a "right" answer.' } },
    { id: 'k4', scenario: 'A company discovers their product has a small defect that MIGHT cause harm in rare cases. Recalling it would cost millions and might bankrupt the company (losing 500 jobs). Not recalling means a small risk to consumers. What should they do?',
      levels: { preconv: 'Don\u2019t recall because it would hurt the company, or recall only if they\u2019d get sued.', conv: 'Recall it because consumer safety laws require it and companies have a duty to follow regulations.', postconv: 'Recall it because human safety is a fundamental right that supersedes profit. The company\u2019s responsibility to consumers is a moral obligation, not just a legal one.' } },
    { id: 'k5', scenario: 'During a war, a soldier is ordered to destroy a village where enemy fighters are hiding among civilians. Following orders is military duty. Refusing could result in court martial. What should the soldier do?',
      levels: { preconv: 'Follow orders to avoid punishment, or refuse to avoid feeling guilty.', conv: 'Follow orders because soldiers must obey the chain of command for the military to function.', postconv: 'Refuse, because "following orders" does not absolve moral responsibility. Universal human rights override military authority. The Nuremberg principles established this.' } },
    { id: 'k6', scenario: 'A self-driving car must choose: swerve left and hit one pedestrian, or swerve right and hit a group of three. Going straight means the passenger (you) will die. What should the car be programmed to do?',
      levels: { preconv: 'Save myself \u2014 I\u2019m the one in the car.', conv: 'Hit the one person because saving the most lives follows the rule of greatest good.', postconv: 'This reveals the limits of utilitarian calculation. Programming a car to kill anyone reduces a person to a number. We need new ethical frameworks for technology that don\u2019t reduce human lives to arithmetic.' } },
    { id: 'k7', scenario: 'Your best friend confides that they\u2019re planning to run away from home because of problems at home. You\u2019re worried about their safety but they made you promise not to tell. What do you do?',
      levels: { preconv: 'Keep the secret so your friend stays your friend, or tell so you don\u2019t get in trouble.', conv: 'Tell a trusted adult because adults are responsible for keeping kids safe and it\u2019s the responsible thing to do.', postconv: 'Safety overrides the promise, but HOW you respond matters. You can honor the relationship while still getting help \u2014 going with your friend to a trusted adult respects both their autonomy and their safety.' } },
    { id: 'k8', scenario: 'A journalist discovers that publishing a true story will embarrass a politician but also expose important corruption. The politician\u2019s family (who are innocent) will be hurt by the publicity. Should the journalist publish?',
      levels: { preconv: 'Publish for the fame and career boost, or don\u2019t publish to avoid making powerful enemies.', conv: 'Publish because journalists have a duty to report the truth and the public has a right to know.', postconv: 'Publish, but with careful consideration of how to minimize harm to innocent family members. Truth-telling and compassion are not mutually exclusive. The form of reporting matters as much as the act.' } },
  ];

  // ── Debate Topics (grade-banded) ──
  var DEBATE_TOPICS = {
    elementary: [
      { id: 'de1', topic: 'Should students have homework?', forSide: 'Homework helps students practice and learn more.', againstSide: 'Students need free time to play, rest, and be kids.' },
      { id: 'de2', topic: 'Should kids be allowed to have phones at school?', forSide: 'Phones help kids reach parents in emergencies and can be learning tools.', againstSide: 'Phones are distracting and kids should focus on learning.' },
      { id: 'de3', topic: 'Is it okay to keep animals in zoos?', forSide: 'Zoos protect endangered animals and teach people about wildlife.', againstSide: 'Animals deserve to live free in their natural habitats.' },
      { id: 'de4', topic: 'Should every kid get a trophy for participating?', forSide: 'Participation trophies encourage kids to try new things.', againstSide: 'Trophies should be earned so winning means something.' },
      { id: 'de5', topic: 'Should school lunch be free for everyone?', forSide: 'No kid should go hungry; free lunch helps all families.', againstSide: 'Families who can afford it should pay so money goes to those who need it most.' },
    ],
    middle: [
      { id: 'dm1', topic: 'Should social media have a minimum age of 16?', forSide: 'Young teens are vulnerable to cyberbullying, addiction, and harmful content.', againstSide: 'Social media teaches digital literacy and is how teens connect. Banning it pushes kids to hide their usage.' },
      { id: 'dm2', topic: 'Should schools use AI to detect cheating?', forSide: 'Academic integrity must be protected; AI detection keeps things fair.', againstSide: 'AI detectors have false positives, create distrust, and disproportionately flag non-native English speakers.' },
      { id: 'dm3', topic: 'Should junk food be banned from schools?', forSide: 'Schools should promote health. Junk food contributes to childhood obesity.', againstSide: 'Students should have the freedom to choose. Bans don\u2019t teach healthy decision-making.' },
      { id: 'dm4', topic: 'Is cancel culture effective or harmful?', forSide: 'It holds powerful people accountable when systems fail.', againstSide: 'It can destroy lives over mistakes, silence dissent, and prevent growth.' },
      { id: 'dm5', topic: 'Should voting age be lowered to 16?', forSide: '16-year-olds pay taxes, can drive, and are affected by policy. They deserve a voice.', againstSide: 'The brain isn\u2019t fully developed. Young teens may be more susceptible to manipulation.' },
    ],
    high: [
      { id: 'dh1', topic: 'Should there be a universal basic income?', forSide: 'UBI eliminates poverty, provides a safety net, and frees people to pursue meaningful work and education.', againstSide: 'UBI is prohibitively expensive, may reduce work incentives, and doesn\u2019t address root causes of inequality.' },
      { id: 'dh2', topic: 'Is civil disobedience ever justified?', forSide: 'When laws are unjust, breaking them is a moral obligation (MLK, Gandhi, Thoreau).', againstSide: 'Rule of law is the foundation of democracy. Change should happen through legal channels.' },
      { id: 'dh3', topic: 'Should corporations have the same rights as people?', forSide: 'Corporate personhood enables businesses to engage in legal and economic activity.', againstSide: 'Corporations can\u2019t vote, go to jail, or die. Granting them rights undermines democracy by amplifying money as speech.' },
      { id: 'dh4', topic: 'Is it ethical to eat meat?', forSide: 'Humans are omnivores. Ethical farming is possible. Meat provides essential nutrition affordably.', againstSide: 'Factory farming causes immense suffering. Environmental impact is devastating. Plant-based diets are viable.' },
      { id: 'dh5', topic: 'Should AI-generated art be considered real art?', forSide: 'Art is about expression and impact, not the tool used. AI is a new medium.', againstSide: 'AI art is assembled from human artists\u2019 work without consent. It devalues human creativity and labor.' },
    ]
  };

  // ── Badges ──
  var BADGES = [
    { id: 'ethics-scholar', name: 'Ethics Scholar', emoji: '\uD83C\uDF93', desc: 'Studied 3+ ethical frameworks', check: function(d) { return (d.frameworksStudied || []).length >= 3; } },
    { id: 'dilemma-solver', name: 'Dilemma Solver', emoji: '\uD83E\uDDE9', desc: 'Completed 5+ branching dilemmas', check: function(d) { return (d.dilemmasCompleted || []).length >= 5; } },
    { id: 'framework-thinker', name: 'Framework Thinker', emoji: '\uD83D\uDD2D', desc: 'Analyzed a dilemma through 3 different frameworks', check: function(d) { return (d.frameworksApplied || []).length >= 3; } },
    { id: 'debate-champion', name: 'Debate Champion', emoji: '\uD83C\uDFC5', desc: 'Completed 3+ debate preparations', check: function(d) { return (d.debatesCompleted || 0) >= 3; } },
    { id: 'moral-philosopher', name: 'Moral Philosopher', emoji: '\uD83E\uDDD9', desc: 'Completed the moral reasoning assessment', check: function(d) { return d.kohlbergComplete === true; } },
    { id: 'socratic-thinker', name: 'Socratic Thinker', emoji: '\uD83C\uDFDB\uFE0F', desc: 'Engaged in 5+ rounds of Socratic dialogue', check: function(d) { return (d.dialogue || []).length >= 10; } },
    { id: 'perspective-master', name: 'Perspective Master', emoji: '\uD83D\uDC41\uFE0F', desc: 'Explored all stakeholder perspectives in a dilemma', check: function(d) { return d.allStakeholdersViewed === true; } },
    { id: 'deep-diver', name: 'Deep Diver', emoji: '\uD83C\uDF0A', desc: 'Explored 3+ deep contemporary dilemmas', check: function(d) { return (d.deepDilemmasExplored || []).length >= 3; } },
  ];

  // ── Helper: count earned badges ──
  function countBadges(d) {
    var count = 0;
    for (var i = 0; i < BADGES.length; i++) {
      if (BADGES[i].check(d)) count++;
    }
    return count;
  }

  // ── Helper: star rendering ──
  function renderStars(count) {
    var full = '\u2B50';
    var empty = '\u2606';
    var s = '';
    for (var i = 0; i < 3; i++) { s += (i < count ? full : empty); }
    return s;
  }

  // ── Registration ──

  window.SelHub.registerTool('ethicalReasoning', {
    icon: '\u2696\uFE0F',
    label: 'Ethical Reasoning Lab',
    desc: 'Explore contemporary ethical dilemmas through multiple frameworks, stakeholder perspectives, branching scenarios, moral reasoning assessment, debate prep, and AI-facilitated Socratic dialogue.',
    color: 'slate',
    category: 'responsible-decision-making',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['ethicalReasoning']) || {};
      var upd = function(key, val) { ctx.update('ethicalReasoning', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('ethicalReasoning', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';

      var tab = d.tab || 'dilemmas';
      var selectedDilemma = d.dilemmaId ? DILEMMAS.find(function(dl) { return dl.id === d.dilemmaId; }) : null;
      var selectedFramework = d.frameworkId || null;
      var dialogueHistory = d.dialogue || [];
      var aiLoading = d.aiLoading || false;

      // ── Socratic dialogue with AI ──
      var askSocratic = function(userInput) {
        if (!callGemini || !userInput) return;
        upd('aiLoading', true);
        var dilemmaContext = selectedDilemma ? 'The dilemma is: ' + selectedDilemma.title + '. ' + selectedDilemma.scenario : '';
        var frameworkContext = selectedFramework ? 'The student is currently analyzing through the lens of: ' + (FRAMEWORKS.find(function(f) { return f.id === selectedFramework; }) || {}).name + '.' : '';
        var historyContext = dialogueHistory.length > 0 ? 'Previous dialogue:\n' + dialogueHistory.slice(-6).map(function(m) { return m.role + ': ' + m.text; }).join('\n') : '';

        var prompt = 'You are a Socratic philosophy teacher helping a ' + (gradeLevel || '5th grade') + ' student reason through an ethical dilemma. ' +
          dilemmaContext + ' ' + frameworkContext + '\n' + historyContext + '\n' +
          'Student says: "' + userInput + '"\n\n' +
          'Respond with ONE thought-provoking follow-up question that challenges their reasoning or helps them see another perspective. ' +
          'Do NOT give the answer. Do NOT lecture. Ask a question that makes them THINK. ' +
          'Be warm and encouraging. Keep it to 2-3 sentences max. ' +
          'If they seem to be oversimplifying, gently complicate their thinking. ' +
          'If they seem stuck, offer a helpful framing question.';

        callGemini(prompt).then(function(resp) {
          var newHistory = dialogueHistory.concat([
            { role: 'student', text: userInput },
            { role: 'socrates', text: resp }
          ]);
          updMulti({ dialogue: newHistory, aiLoading: false, dialogueInput: '' });
          ctx.awardXP(5);
        }).catch(function() {
          upd('aiLoading', false);
        });
      };

      // ── Generate AI analysis through a framework ──
      var analyzeWithFramework = function(frameworkId) {
        if (!callGemini || !selectedDilemma) return;
        upd('aiLoading', true);
        var fw = FRAMEWORKS.find(function(f) { return f.id === frameworkId; });
        var prompt = 'Analyze this ethical dilemma through the lens of ' + fw.name + ' (' + fw.thinker + ').\n' +
          'Dilemma: ' + selectedDilemma.scenario + '\n\n' +
          'Provide a ' + (gradeLevel || '5th grade') + '-appropriate analysis in 3-4 paragraphs:\n' +
          '1. How would this framework approach the dilemma?\n' +
          '2. What would it prioritize and why?\n' +
          '3. What are the strengths of this approach?\n' +
          '4. What does this framework miss or undervalue?\n\n' +
          'Use clear, accessible language. End with a thought-provoking question.';

        callGemini(prompt).then(function(resp) {
          var applied = (d.frameworksApplied || []).slice();
          if (applied.indexOf(frameworkId) === -1) applied.push(frameworkId);
          updMulti({ frameworkAnalysis: resp, aiLoading: false, frameworksApplied: applied });
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Generate AI debate feedback ──
      var getDebateFeedback = function() {
        if (!callGemini) return;
        upd('aiLoading', true);
        var topic = d.debateTopicObj;
        var side = d.debateSide;
        var args = d.debateArgs || '';
        var counter = d.debateCounter || '';

        var prompt = 'You are a debate coach for a ' + (gradeLevel || '5th grade') + ' student.\n' +
          'Topic: "' + topic.topic + '"\n' +
          'The student is arguing ' + (side === 'for' ? 'FOR' : 'AGAINST') + '.\n' +
          'Their arguments: "' + args + '"\n' +
          'Their counterarguments to the other side: "' + counter + '"\n\n' +
          'Provide constructive feedback in 3-4 short paragraphs:\n' +
          '1. Strengths of their argument (be specific and encouraging)\n' +
          '2. Logical gaps or weak points (be gentle but honest)\n' +
          '3. A counterargument they haven\u2019t considered\n' +
          '4. A suggestion to make their case stronger\n\n' +
          'Rate their argument strength: Developing / Solid / Compelling / Master Debater\n' +
          'Be encouraging and age-appropriate.';

        callGemini(prompt).then(function(resp) {
          var completed = (d.debatesCompleted || 0) + 1;
          updMulti({ debateFeedback: resp, aiLoading: false, debatesCompleted: completed });
          ctx.awardXP(10);
          if (completed >= 3) { addToast('\uD83C\uDFC5 Debate Champion badge earned!'); }
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Generate Kohlberg assessment AI feedback ──
      var getKohlbergFeedback = function() {
        if (!callGemini) return;
        upd('aiLoading', true);
        var answers = d.kohlbergAnswers || {};
        var answerTexts = [];
        for (var i = 0; i < KOHLBERG_SCENARIOS.length; i++) {
          var sc = KOHLBERG_SCENARIOS[i];
          if (answers[sc.id]) {
            answerTexts.push('Scenario: ' + sc.scenario.substring(0, 80) + '... Answer: "' + answers[sc.id] + '"');
          }
        }

        var prompt = 'You are a developmental psychologist analyzing a ' + (gradeLevel || '5th grade') + ' student\u2019s moral reasoning patterns.\n\n' +
          'The student responded to ethical dilemmas as follows:\n' + answerTexts.join('\n') + '\n\n' +
          'Based on Kohlberg\u2019s stages of moral development, provide a warm, NON-JUDGMENTAL analysis in 3-4 paragraphs:\n' +
          '1. Describe the PATTERN in their reasoning (do they focus on consequences for themselves, rules and social order, or universal principles?)\n' +
          '2. Note which level their reasoning most aligns with (Pre-conventional: self-interest, Conventional: rules/social approval, Post-conventional: universal principles). Emphasize that ALL levels are normal and valid for their age.\n' +
          '3. Highlight a strength in their reasoning and one area they could explore further.\n' +
          '4. End with an encouraging thought about their moral growth.\n\n' +
          'IMPORTANT: Be warm, encouraging, and age-appropriate. Never make the student feel judged. All levels are valid developmental stages. Frame everything as "your reasoning style" not "your level."';

        callGemini(prompt).then(function(resp) {
          updMulti({ kohlbergFeedback: resp, kohlbergComplete: true, aiLoading: false });
          ctx.awardXP(15);
          addToast('\uD83E\uDDD9 Moral Philosopher badge earned!');
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Badge check helper ──
      var checkAndAwardBadges = function() {
        var newBadges = [];
        for (var i = 0; i < BADGES.length; i++) {
          var b = BADGES[i];
          var already = (d.earnedBadges || []).indexOf(b.id) !== -1;
          if (!already && b.check(d)) {
            newBadges.push(b.id);
            addToast(b.emoji + ' ' + b.name + ' badge earned!');
          }
        }
        if (newBadges.length > 0) {
          upd('earnedBadges', (d.earnedBadges || []).concat(newBadges));
        }
      };

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })), h(ArrowLeft, { size: 20 })),
          h('div', null,
            h('h2', { className: 'text-xl font-black text-slate-800' }, '\u2696\uFE0F Ethical Reasoning Lab'),
            h('p', { className: 'text-xs text-slate-500' }, 'There are no easy answers \u2014 only honest questions')
          ),
          // Badge counter
          h('div', { className: 'ml-auto flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1' },
            h('span', { className: 'text-sm' }, '\uD83C\uDFC5'),
            h('span', { className: 'text-xs font-bold text-amber-700' }, countBadges(d) + '/' + BADGES.length)
          )
        ),

        // Tabs
        h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200 flex-wrap' },
          [
            { id: 'dilemmas', label: '\uD83D\uDD25 Dilemmas' },
            { id: 'branching', label: '\uD83C\uDF33 Scenarios' },
            { id: 'frameworks', label: '\uD83C\uDFDB\uFE0F Frameworks' },
            { id: 'explore', label: '\uD83D\uDD0D Explore' },
            { id: 'dialogue', label: '\uD83D\uDCAC Socratic' },
            { id: 'kohlberg', label: '\uD83E\uDDE0 Reasoning' },
            { id: 'debate', label: '\uD83C\uDFA4 Debate' },
            { id: 'badges', label: '\uD83C\uDFC5 Badges' },
          ].map(function(t) {
            return h('button', { key: t.id, onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all min-w-[70px] ' + (tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')
            }, t.label);
          })
        ),

        // ═══ DILEMMAS TAB ═══
        tab === 'dilemmas' && !selectedDilemma && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose a dilemma to explore. Each one has no single right answer.'),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            DILEMMAS.map(function(dl) {
              return h('button', { key: dl.id, onClick: function() {
                var explored = (d.deepDilemmasExplored || []).slice();
                if (explored.indexOf(dl.id) === -1) explored.push(dl.id);
                updMulti({ dilemmaId: dl.id, tab: 'explore', frameworkAnalysis: null, dialogue: [], deepDilemmasExplored: explored });
                ctx.awardXP(3);
              },
                className: 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-left hover:border-indigo-300 hover:shadow-md transition-all'
              },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-2xl' }, dl.emoji),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, dl.title),
                    h('span', { className: 'text-[10px] text-slate-400 font-bold uppercase' }, dl.category)
                  )
                ),
                h('p', { className: 'text-xs text-slate-500 leading-relaxed line-clamp-2' }, dl.scenario.substring(0, 120) + '...')
              );
            })
          )
        ),

        // ═══ BRANCHING SCENARIOS TAB ═══
        tab === 'branching' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDF33 Ethical Scenarios'),
            h('p', { className: 'text-sm text-slate-500' }, 'Choose wisely \u2014 every decision has consequences.')
          ),

          // If no scenario selected, show list
          !d.branchingId && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            (BRANCHING_SCENARIOS[gradeBand] || BRANCHING_SCENARIOS.elementary).map(function(sc) {
              var completed = (d.dilemmasCompleted || []).indexOf(sc.id) !== -1;
              return h('button', { key: sc.id, onClick: function() { updMulti({ branchingId: sc.id, branchChoice: null, branchReflection: '' }); },
                className: 'p-4 rounded-2xl border-2 bg-white text-left hover:border-emerald-300 hover:shadow-md transition-all ' + (completed ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200')
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-xl' }, sc.emoji),
                  h('span', { className: 'font-bold text-sm text-slate-800' }, sc.title),
                  completed && h('span', { className: 'ml-auto text-emerald-500 text-xs font-bold' }, '\u2713 Done')
                ),
                h('p', { className: 'text-xs text-slate-500 leading-relaxed' }, sc.scenario.substring(0, 100) + '...')
              );
            })
          ),

          // If scenario selected, show it
          d.branchingId && (function() {
            var scenarios = BRANCHING_SCENARIOS[gradeBand] || BRANCHING_SCENARIOS.elementary;
            var sc = scenarios.find(function(s) { return s.id === d.branchingId; });
            if (!sc) return null;

            return h('div', { className: 'space-y-4' },
              // Back button
              h('button', { onClick: function() { updMulti({ branchingId: null, branchChoice: null, branchReflection: '', branchAIDiscussion: null }); }, className: 'text-xs text-slate-400 hover:text-slate-600 font-bold' }, '\u2190 All Scenarios'),

              // Scenario card
              h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-5' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h('span', { className: 'text-3xl' }, sc.emoji),
                  h('h3', { className: 'text-lg font-black text-slate-800' }, sc.title)
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, sc.scenario),
                callTTS && h('button', { onClick: function() { callTTS(sc.scenario); }, className: 'mt-2 text-[10px] text-emerald-600 hover:text-emerald-800 font-bold' }, '\uD83D\uDD0A Read Aloud')
              ),

              // Choices
              !d.branchChoice && h('div', { className: 'space-y-2' },
                h('h4', { className: 'text-sm font-bold text-slate-700' }, 'What would you do?'),
                sc.choices.map(function(ch, idx) {
                  return h('button', { key: idx, onClick: function() {
                    var completed = (d.dilemmasCompleted || []).slice();
                    if (completed.indexOf(sc.id) === -1) completed.push(sc.id);
                    updMulti({ branchChoice: idx, dilemmasCompleted: completed });
                    ctx.awardXP(5);
                    if (completed.length >= 5) { addToast('\uD83E\uDDE9 Dilemma Solver badge earned!'); }
                  },
                    className: 'w-full p-4 rounded-xl border-2 border-slate-200 bg-white text-left hover:border-indigo-300 hover:shadow-md transition-all'
                  },
                    h('div', { className: 'flex items-start gap-3' },
                      h('span', { className: 'text-lg font-bold text-indigo-400 shrink-0' }, String.fromCharCode(65 + idx)),
                      h('div', null,
                        h('p', { className: 'text-sm text-slate-800 font-medium' }, ch.text),
                        h('p', { className: 'text-[10px] text-slate-400 mt-1' }, 'Framework: ' + ch.framework)
                      )
                    )
                  );
                })
              ),

              // Result after choosing
              d.branchChoice !== null && d.branchChoice !== undefined && (function() {
                var chosen = sc.choices[d.branchChoice];
                if (!chosen) return null;
                return h('div', { className: 'space-y-3' },
                  // Chosen answer
                  h('div', { className: 'bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4' },
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                      h('span', { className: 'text-sm font-bold text-indigo-700' }, 'Your choice:'),
                      h('span', { className: 'text-sm' }, renderStars(chosen.stars))
                    ),
                    h('p', { className: 'text-sm text-slate-700 font-medium' }, chosen.text),
                    h('p', { className: 'text-xs text-slate-500 mt-2 italic' }, '\uD83D\uDD2E What happened: ' + chosen.result)
                  ),

                  // Framework analysis for each choice
                  h('div', { className: 'bg-white border border-slate-200 rounded-xl p-4' },
                    h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFDB\uFE0F Framework Analysis: All Choices'),
                    sc.choices.map(function(ch, idx) {
                      var isMine = idx === d.branchChoice;
                      return h('div', { key: idx, className: 'mb-2 p-3 rounded-lg ' + (isMine ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-slate-200') },
                        h('div', { className: 'flex items-center gap-2' },
                          h('span', { className: 'font-bold text-xs ' + (isMine ? 'text-indigo-700' : 'text-slate-600') }, String.fromCharCode(65 + idx) + '. ' + ch.text),
                          isMine && h('span', { className: 'text-[9px] text-indigo-500 font-bold' }, '(your choice)')
                        ),
                        h('p', { className: 'text-[10px] text-slate-500 mt-1' }, 'Framework: ' + ch.framework + ' | ' + renderStars(ch.stars)),
                        h('p', { className: 'text-[10px] text-slate-500 italic' }, ch.result)
                      );
                    })
                  ),

                  // Discussion prompt
                  h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
                    h('h4', { className: 'text-sm font-bold text-amber-700 mb-1' }, '\uD83D\uDCA1 Think Deeper'),
                    h('p', { className: 'text-xs text-amber-800' }, sc.discuss)
                  ),

                  // Reflection textarea
                  h('div', { className: 'bg-white border border-slate-200 rounded-xl p-4' },
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\u270D\uFE0F Reflect: Why did you choose this? Would you change your answer?'),
                    h('textarea', { value: d.branchReflection || '', onChange: function(e) { upd('branchReflection', e.target.value); },
                      placeholder: 'I chose this because...',
                      className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-emerald-300',
                      'aria-label': 'Reflection on ethical choice'
                    })
                  ),

                  // AI discussion button
                  callGemini && h('button', { onClick: function() {
                    upd('aiLoading', true);
                    var prompt = 'A ' + (gradeLevel || '5th grade') + ' student is exploring an ethical scenario.\n' +
                      'Scenario: ' + sc.scenario + '\n' +
                      'They chose: "' + chosen.text + '" (Framework: ' + chosen.framework + ')\n' +
                      'Their reflection: "' + (d.branchReflection || 'No reflection yet') + '"\n\n' +
                      'Provide a brief, encouraging response (3-4 sentences) that:\n' +
                      '1. Validates their thinking\n' +
                      '2. Offers one new perspective they might not have considered\n' +
                      '3. Asks one follow-up question\n' +
                      'Be warm, age-appropriate, and non-judgmental.';
                    callGemini(prompt).then(function(resp) {
                      updMulti({ branchAIDiscussion: resp, aiLoading: false });
                      ctx.awardXP(5);
                    }).catch(function() { upd('aiLoading', false); });
                  }, disabled: aiLoading,
                    className: 'px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-2'
                  }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '\uD83D\uDCAC Discuss with AI'),

                  // AI discussion response
                  d.branchAIDiscussion && h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4' },
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                      h(Sparkles, { size: 14, className: 'text-emerald-500' }),
                      h('h4', { className: 'text-sm font-bold text-emerald-700' }, 'AI Response')
                    ),
                    h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.branchAIDiscussion)
                  ),

                  // Try another button
                  h('button', { onClick: function() { updMulti({ branchingId: null, branchChoice: null, branchReflection: '', branchAIDiscussion: null }); },
                    className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
                  }, '\u2190 Try Another Scenario')
                );
              })()
            );
          })()
        ),

        // ═══ FRAMEWORKS TAB (Grade-Banded) ═══
        tab === 'frameworks' && h('div', { className: 'space-y-4' },
          h('p', { className: 'text-sm text-slate-600 text-center mb-2' }, 'Ethical frameworks are different lenses for examining the same question. No single framework has all the answers.'),

          // Grade band indicator
          h('div', { className: 'flex justify-center gap-2 mb-3' },
            ['elementary', 'middle', 'high'].map(function(band) {
              return h('button', { key: band, onClick: function() { upd('frameworkBand', band); },
                className: 'px-3 py-1 rounded-full text-[10px] font-bold transition-all ' +
                  ((d.frameworkBand || gradeBand) === band ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
              }, band === 'elementary' ? '\uD83C\uDF1F Elementary' : band === 'middle' ? '\uD83D\uDE80 Middle' : '\uD83C\uDF93 High');
            })
          ),

          // Frameworks for selected band
          (FRAMEWORKS_BY_BAND[d.frameworkBand || gradeBand] || FRAMEWORKS_BY_BAND.elementary).map(function(fw) {
            var isActive = selectedFramework === fw.id;
            return h('div', { key: fw.id,
              className: 'rounded-2xl border-2 overflow-hidden transition-all ' + (isActive ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300')
            },
              h('button', { onClick: function() {
                upd('frameworkId', isActive ? null : fw.id);
                if (!isActive) {
                  var studied = (d.frameworksStudied || []).slice();
                  if (studied.indexOf(fw.id) === -1) studied.push(fw.id);
                  updMulti({ frameworkId: fw.id, frameworksStudied: studied });
                  ctx.awardXP(3);
                  if (studied.length >= 3) { addToast('\uD83C\uDF93 Ethics Scholar badge earned!'); }
                }
              }, className: 'w-full p-4 text-left' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, fw.emoji),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'font-bold text-sm text-slate-800' }, fw.name),
                    fw.thinker && h('div', { className: 'text-[10px] text-slate-400 font-medium' }, fw.thinker)
                  )
                )
              ),
              isActive && h('div', { className: 'px-4 pb-4 space-y-3' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, fw.desc),

                // Example
                h('div', { className: 'bg-white rounded-xl p-3 border border-blue-200' },
                  h('p', { className: 'text-xs text-blue-700 font-medium' }, '\uD83D\uDCD6 Example: ', fw.example)
                ),

                // Try It prompt
                h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
                  h('p', { className: 'text-xs text-amber-700 italic font-medium' }, '\uD83D\uDCA1 Try applying it: ', fw.tryIt)
                ),

                // Try It reflection area
                h('textarea', { value: d['fwReflect_' + fw.id] || '', onChange: function(e) { upd('fwReflect_' + fw.id, e.target.value); },
                  placeholder: 'Write your thoughts here...',
                  className: 'w-full text-xs p-2 border border-slate-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-indigo-300',
                  'aria-label': 'Framework reflection'
                }),

                // Apply to active dilemma
                selectedDilemma && h('button', { onClick: function() { analyzeWithFramework(fw.id); upd('tab', 'explore'); },
                  disabled: aiLoading,
                  className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-2'
                }, h(Sparkles, { size: 14 }), 'Analyze "' + selectedDilemma.title + '" with this framework')
              )
            );
          }),

          // Original deep frameworks reference (for high schoolers)
          (d.frameworkBand || gradeBand) === 'high' && h('div', { className: 'mt-4 pt-4 border-t border-slate-200' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDD2C Analysis Frameworks (for Deep Dilemmas)'),
            h('p', { className: 'text-[10px] text-slate-500 mb-2' }, 'These frameworks power the AI analysis when you explore a contemporary dilemma.'),
            h('div', { className: 'flex flex-wrap gap-2' },
              FRAMEWORKS.map(function(fw) {
                return h('div', { key: fw.id, className: 'px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600' },
                  fw.emoji + ' ' + fw.name + ' (' + fw.thinker + ')'
                );
              })
            )
          )
        ),

        // ═══ EXPLORE TAB (selected dilemma deep dive) ═══
        tab === 'explore' && selectedDilemma && h('div', { className: 'space-y-4' },

          // Dilemma header
          h('div', { className: 'bg-gradient-to-r from-slate-50 to-indigo-50 rounded-2xl border-2 border-slate-200 p-5' },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-3xl' }, selectedDilemma.emoji),
              h('div', null,
                h('h3', { className: 'text-lg font-black text-slate-800' }, selectedDilemma.title),
                h('span', { className: 'text-[10px] text-slate-400 font-bold uppercase' }, selectedDilemma.category)
              ),
              h('button', { onClick: function() { updMulti({ dilemmaId: null, tab: 'dilemmas', frameworkAnalysis: null }); }, className: 'ml-auto text-xs text-slate-400 hover:text-slate-600 font-bold' }, '\u2190 All Dilemmas')
            ),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
              gradeBand === 'elementary' && selectedDilemma.gradeBands.elementary ? selectedDilemma.gradeBands.elementary : selectedDilemma.scenario
            ),
            callTTS && h('button', { onClick: function() { callTTS(gradeBand === 'elementary' && selectedDilemma.gradeBands.elementary ? selectedDilemma.gradeBands.elementary : selectedDilemma.scenario); }, className: 'mt-2 text-[10px] text-indigo-500 hover:text-indigo-700 font-bold' }, '\uD83D\uDD0A Read Aloud')
          ),

          // Stakeholders
          h('div', { className: 'bg-white rounded-2xl border-2 border-slate-200 p-4' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-3 flex items-center gap-2' }, '\uD83D\uDC65 Stakeholders \u2014 Who Is Affected?'),
            h('div', { className: 'space-y-3' },
              selectedDilemma.stakeholders.map(function(s, i) {
                return h('div', { key: i, className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
                  h('div', { className: 'font-bold text-xs text-slate-800 mb-1' }, s.name),
                  h('div', { className: 'text-[11px] text-slate-600 mb-1' }, '\uD83D\uDCCB Need: ', s.need),
                  h('div', { className: 'text-[11px] text-indigo-700 italic' }, '\uD83D\uDCAC "', s.perspective, '"')
                );
              })
            )
          ),

          // Core tensions
          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
            h('h4', { className: 'text-sm font-bold text-amber-700 mb-2' }, '\u26A1 Core Tensions'),
            h('div', { className: 'space-y-1.5' },
              selectedDilemma.tensions.map(function(t, i) {
                return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-amber-800' },
                  h('span', { className: 'text-amber-500 mt-0.5 shrink-0' }, '\u27F7'),
                  h('span', null, t)
                );
              })
            )
          ),

          // Framework analysis (if generated)
          d.frameworkAnalysis && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-2xl p-5' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h(Sparkles, { size: 14, className: 'text-indigo-500' }),
              h('h4', { className: 'text-sm font-bold text-indigo-700' }, 'Framework Analysis')
            ),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.frameworkAnalysis)
          ),

          // Your position
          h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\uD83E\uDD14 Where do you stand? (Write your reasoning)'),
            h('textarea', { value: d.position || '', onChange: function(e) { upd('position', e.target.value); },
              placeholder: 'I think... because...',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-300',
              'aria-label': 'Your ethical position'
            }),
            d.position && d.position.length > 20 && h('button', { onClick: function() { upd('tab', 'dialogue'); askSocratic(d.position); },
              className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2'
            }, '\uD83D\uDCAC Challenge my reasoning with Socratic dialogue')
          ),

          // Quick analyze buttons
          h('div', { className: 'flex flex-wrap gap-2' },
            FRAMEWORKS.map(function(fw) {
              return h('button', { key: fw.id, onClick: function() { analyzeWithFramework(fw.id); }, disabled: aiLoading,
                className: 'px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-40'
              }, fw.emoji + ' Analyze with ' + fw.name);
            })
          )
        ),

        // ═══ EXPLORE TAB - no dilemma selected ═══
        tab === 'explore' && !selectedDilemma && h('div', { className: 'bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center' },
          h('p', { className: 'text-slate-500 font-bold' }, 'Choose a dilemma from the Dilemmas tab first, then come here to explore it deeply.'),
          h('button', { onClick: function() { upd('tab', 'dilemmas'); }, className: 'mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700' }, 'Go to Dilemmas')
        ),

        // ═══ SOCRATIC DIALOGUE TAB ═══
        tab === 'dialogue' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDCAC Socratic Dialogue'),
            h('p', { className: 'text-sm text-slate-500' }, selectedDilemma ? 'Exploring: ' + selectedDilemma.title : 'Select a dilemma first, then share your thinking.')
          ),

          !selectedDilemma && h('div', { className: 'bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center' },
            h('p', { className: 'text-slate-500 font-bold' }, 'Choose a dilemma from the Dilemmas tab first, then come here to discuss it.')
          ),

          selectedDilemma && h('div', { className: 'space-y-3' },
            // Dialogue history
            dialogueHistory.length > 0 && h('div', { className: 'space-y-2 max-h-[400px] overflow-y-auto' },
              dialogueHistory.map(function(msg, i) {
                return h('div', { key: i, className: 'flex ' + (msg.role === 'student' ? 'justify-end' : 'justify-start') },
                  h('div', { className: 'max-w-[80%] rounded-2xl px-4 py-3 ' + (msg.role === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200') },
                    h('div', { className: 'text-[10px] font-bold mb-1 ' + (msg.role === 'student' ? 'text-indigo-200' : 'text-slate-400') }, msg.role === 'student' ? 'You' : '\uD83C\uDFDB\uFE0F Socrates'),
                    h('p', { className: 'text-sm leading-relaxed' }, msg.text)
                  )
                );
              })
            ),

            dialogueHistory.length === 0 && h('div', { className: 'bg-slate-50 rounded-xl p-4 text-center' },
              h('p', { className: 'text-sm text-slate-500' }, 'Share your initial thoughts about "', selectedDilemma.title, '" and I\'ll ask you questions to deepen your reasoning.')
            ),

            // Input
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: d.dialogueInput || '', onChange: function(e) { upd('dialogueInput', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter' && d.dialogueInput && d.dialogueInput.trim()) askSocratic(d.dialogueInput); },
                placeholder: 'Share your reasoning...', disabled: aiLoading,
                className: 'flex-1 text-sm p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-40',
                'aria-label': 'Your response to Socratic dialogue'
              }),
              h('button', { onClick: function() { if (d.dialogueInput && d.dialogueInput.trim()) askSocratic(d.dialogueInput); }, disabled: aiLoading || !(d.dialogueInput && d.dialogueInput.trim()),
                className: 'px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40'
              }, aiLoading ? '...' : '\u2192')
            ),

            h('p', { className: 'text-[9px] text-slate-400 text-center' }, 'The AI will challenge your thinking with questions \u2014 not give you answers. There are no wrong responses.')
          )
        ),

        // ═══ KOHLBERG MORAL REASONING ASSESSMENT TAB ═══
        tab === 'kohlberg' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDDE0 Moral Reasoning Style'),
            h('p', { className: 'text-sm text-slate-500' }, 'Discover how you think about right and wrong. There are no wrong answers \u2014 only YOUR reasoning.')
          ),

          // Intro card
          !d.kohlbergStarted && h('div', { className: 'bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-5 text-center' },
            h('span', { className: 'text-4xl block mb-3' }, '\uD83E\uDDD9'),
            h('h4', { className: 'text-base font-bold text-purple-800 mb-2' }, 'What Kind of Moral Thinker Are You?'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed mb-3' }, 'Psychologist Lawrence Kohlberg found that people reason about ethics at different levels \u2014 and all levels are a normal part of growing up. This assessment helps you see YOUR pattern.'),
            h('div', { className: 'bg-white rounded-xl p-4 border border-purple-200 text-left mb-4' },
              h('div', { className: 'space-y-2' },
                h('p', { className: 'text-xs text-purple-700' }, '\uD83D\uDD35 Level 1 \u2014 "What happens to ME?" (Self-interest: rewards and punishments)'),
                h('p', { className: 'text-xs text-purple-700' }, '\uD83D\uDFE2 Level 2 \u2014 "What do others expect?" (Rules, authority, social approval)'),
                h('p', { className: 'text-xs text-purple-700' }, '\uD83D\uDFE1 Level 3 \u2014 "What is universally right?" (Principles like justice, dignity, human rights)')
              ),
              h('p', { className: 'text-[10px] text-slate-500 mt-2 italic' }, 'Remember: ALL levels are valid and normal. Most adults use a mix of all three!')
            ),
            h('button', { onClick: function() { updMulti({ kohlbergStarted: true, kohlbergStep: 0, kohlbergAnswers: {} }); },
              className: 'px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors'
            }, 'Start Assessment')
          ),

          // Active assessment
          d.kohlbergStarted && !d.kohlbergComplete && (function() {
            var step = d.kohlbergStep || 0;
            var total = KOHLBERG_SCENARIOS.length;
            var sc = KOHLBERG_SCENARIOS[step];
            if (!sc) return null;
            var answers = d.kohlbergAnswers || {};
            var answeredCount = Object.keys(answers).length;

            return h('div', { className: 'space-y-4' },
              // Progress bar
              h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                h('div', { className: 'bg-purple-500 h-full transition-all duration-300', style: { width: Math.round((step / total) * 100) + '%' } })
              ),
              h('p', { className: 'text-[10px] text-slate-400 text-center' }, 'Question ' + (step + 1) + ' of ' + total),

              // Scenario
              h('div', { className: 'bg-white rounded-2xl border-2 border-purple-200 p-5' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed mb-4' }, sc.scenario),
                callTTS && h('button', { onClick: function() { callTTS(sc.scenario); }, className: 'text-[10px] text-purple-500 hover:text-purple-700 font-bold mb-3 block' }, '\uD83D\uDD0A Read Aloud'),

                h('label', { className: 'text-xs font-bold text-slate-600 block mb-2' }, 'What would you do, and WHY? (The "why" is what matters most)'),
                h('textarea', { value: answers[sc.id] || '', onChange: function(e) {
                  var newAnswers = {};
                  for (var k in answers) { if (answers.hasOwnProperty(k)) newAnswers[k] = answers[k]; }
                  newAnswers[sc.id] = e.target.value;
                  upd('kohlbergAnswers', newAnswers);
                },
                  placeholder: 'I would... because...',
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-purple-300',
                  'aria-label': 'Your moral reasoning response'
                }),

                // Example reasoning levels (shown after they answer)
                answers[sc.id] && answers[sc.id].length > 15 && h('div', { className: 'mt-3 bg-purple-50 rounded-xl p-3 border border-purple-200' },
                  h('p', { className: 'text-[10px] font-bold text-purple-700 mb-2' }, '\uD83D\uDD0D Different people reason like this:'),
                  h('p', { className: 'text-[10px] text-slate-600 mb-1' }, '\uD83D\uDD35 Self-interest: "' + sc.levels.preconv + '"'),
                  h('p', { className: 'text-[10px] text-slate-600 mb-1' }, '\uD83D\uDFE2 Rules/Society: "' + sc.levels.conv + '"'),
                  h('p', { className: 'text-[10px] text-slate-600' }, '\uD83D\uDFE1 Universal principles: "' + sc.levels.postconv + '"'),
                  h('p', { className: 'text-[9px] text-slate-400 mt-2 italic' }, 'Your answer doesn\u2019t have to match any of these exactly. Most people use a blend!')
                )
              ),

              // Navigation
              h('div', { className: 'flex gap-2' },
                step > 0 && h('button', { onClick: function() { upd('kohlbergStep', step - 1); },
                  className: 'px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200'
                }, '\u2190 Previous'),
                h('div', { className: 'flex-1' }),
                step < total - 1 && h('button', { onClick: function() {
                  if (answers[sc.id] && answers[sc.id].length > 10) {
                    upd('kohlbergStep', step + 1);
                    ctx.awardXP(3);
                  } else {
                    addToast('Please write at least a sentence explaining your reasoning.');
                  }
                },
                  className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors'
                }, 'Next \u2192'),
                step === total - 1 && answeredCount >= Math.ceil(total * 0.6) && h('button', { onClick: function() {
                  getKohlbergFeedback();
                }, disabled: aiLoading,
                  className: 'px-6 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-40 flex items-center gap-2'
                }, h(Sparkles, { size: 14 }), aiLoading ? 'Analyzing...' : 'See My Reasoning Pattern')
              )
            );
          })(),

          // Kohlberg results
          d.kohlbergComplete && h('div', { className: 'space-y-4' },
            h('div', { className: 'bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-5' },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('span', { className: 'text-3xl' }, '\uD83E\uDDD9'),
                h('h4', { className: 'text-base font-bold text-purple-800' }, 'Your Moral Reasoning Pattern')
              ),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.kohlbergFeedback)
            ),

            // Reasoning level visual
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
              h('h4', { className: 'text-sm font-bold text-slate-700 mb-3' }, '\uD83D\uDCCA Kohlberg\u2019s Levels of Moral Reasoning'),
              h('div', { className: 'space-y-2' },
                [
                  { level: 'Pre-conventional', color: 'blue', desc: 'Self-interest: "What rewards or punishments will I get?"', ages: 'Common in young children' },
                  { level: 'Conventional', color: 'green', desc: 'Social order: "What do rules, laws, and others expect?"', ages: 'Most common in teens and adults' },
                  { level: 'Post-conventional', color: 'yellow', desc: 'Universal principles: "What is fundamentally just and right?"', ages: 'Developed through deep reflection' },
                ].map(function(lv) {
                  var colorMap = { blue: 'bg-blue-100 border-blue-300 text-blue-800', green: 'bg-green-100 border-green-300 text-green-800', yellow: 'bg-amber-100 border-amber-300 text-amber-800' };
                  return h('div', { key: lv.level, className: 'p-3 rounded-lg border ' + colorMap[lv.color] },
                    h('div', { className: 'font-bold text-xs' }, lv.level),
                    h('p', { className: 'text-[10px] mt-1' }, lv.desc),
                    h('p', { className: 'text-[9px] mt-1 opacity-70 italic' }, lv.ages)
                  );
                })
              ),
              h('p', { className: 'text-[9px] text-slate-400 mt-3 text-center italic' }, 'Most people use a mix of all three levels depending on the situation. Growth is a journey, not a destination.')
            ),

            // Retake button
            h('button', { onClick: function() { updMulti({ kohlbergStarted: false, kohlbergComplete: false, kohlbergStep: 0, kohlbergAnswers: {}, kohlbergFeedback: null }); },
              className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
            }, '\uD83D\uDD04 Retake Assessment')
          )
        ),

        // ═══ DEBATE PREP TAB ═══
        tab === 'debate' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFA4 Debate Prep Tool'),
            h('p', { className: 'text-sm text-slate-500' }, 'Pick a topic, choose a side, and build your argument.')
          ),

          // Topic selection
          !d.debateTopicObj && h('div', { className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose a topic to debate:'),
            (DEBATE_TOPICS[gradeBand] || DEBATE_TOPICS.elementary).map(function(topic) {
              return h('button', { key: topic.id, onClick: function() { updMulti({ debateTopicObj: topic, debateSide: null, debateArgs: '', debateCounter: '', debateFeedback: null }); },
                className: 'w-full p-4 rounded-xl border-2 border-slate-200 bg-white text-left hover:border-violet-300 hover:shadow-md transition-all'
              },
                h('p', { className: 'text-sm font-bold text-slate-800' }, topic.topic),
                h('div', { className: 'flex gap-4 mt-2' },
                  h('p', { className: 'text-[10px] text-emerald-600 flex-1' }, '\u2713 For: ' + topic.forSide.substring(0, 60) + '...'),
                  h('p', { className: 'text-[10px] text-red-500 flex-1' }, '\u2717 Against: ' + topic.againstSide.substring(0, 60) + '...')
                )
              );
            })
          ),

          // Active debate
          d.debateTopicObj && h('div', { className: 'space-y-4' },
            // Back button
            h('button', { onClick: function() { updMulti({ debateTopicObj: null, debateSide: null, debateArgs: '', debateCounter: '', debateFeedback: null }); },
              className: 'text-xs text-slate-400 hover:text-slate-600 font-bold'
            }, '\u2190 All Topics'),

            // Topic display
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border-2 border-violet-200 p-5' },
              h('h4', { className: 'text-base font-bold text-slate-800 mb-2' }, d.debateTopicObj.topic),
              h('div', { className: 'grid grid-cols-2 gap-3 mt-3' },
                h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200' },
                  h('p', { className: 'text-xs font-bold text-emerald-700 mb-1' }, '\u2713 For:'),
                  h('p', { className: 'text-[10px] text-emerald-600' }, d.debateTopicObj.forSide)
                ),
                h('div', { className: 'bg-red-50 rounded-lg p-3 border border-red-200' },
                  h('p', { className: 'text-xs font-bold text-red-700 mb-1' }, '\u2717 Against:'),
                  h('p', { className: 'text-[10px] text-red-600' }, d.debateTopicObj.againstSide)
                )
              )
            ),

            // Side selection
            !d.debateSide && h('div', { className: 'flex gap-3' },
              h('button', { onClick: function() { upd('debateSide', 'for'); ctx.awardXP(3); },
                className: 'flex-1 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all text-center'
              },
                h('p', { className: 'text-lg font-bold text-emerald-700' }, '\u2713'),
                h('p', { className: 'text-sm font-bold text-emerald-700' }, 'Argue FOR')
              ),
              h('button', { onClick: function() { upd('debateSide', 'against'); ctx.awardXP(3); },
                className: 'flex-1 p-4 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 transition-all text-center'
              },
                h('p', { className: 'text-lg font-bold text-red-700' }, '\u2717'),
                h('p', { className: 'text-sm font-bold text-red-700' }, 'Argue AGAINST')
              )
            ),

            // Argument building
            d.debateSide && !d.debateFeedback && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-sm font-bold ' + (d.debateSide === 'for' ? 'text-emerald-700' : 'text-red-700') },
                    d.debateSide === 'for' ? '\u2713 You are arguing FOR' : '\u2717 You are arguing AGAINST'),
                  h('button', { onClick: function() { upd('debateSide', d.debateSide === 'for' ? 'against' : 'for'); },
                    className: 'ml-auto text-[10px] text-slate-400 hover:text-slate-600 font-bold'
                  }, 'Switch sides')
                ),

                h('label', { className: 'text-xs font-bold text-slate-600 block mb-1 mt-3' }, '\uD83D\uDCDD Your Main Arguments (build your case):'),
                h('textarea', { value: d.debateArgs || '', onChange: function(e) { upd('debateArgs', e.target.value); },
                  placeholder: 'My first argument is...\nAnother reason is...\nThe strongest point is...',
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-28 outline-none focus:ring-2 focus:ring-violet-300',
                  'aria-label': 'Your debate arguments'
                }),

                h('label', { className: 'text-xs font-bold text-slate-600 block mb-1 mt-3' }, '\uD83D\uDEE1\uFE0F Counterarguments (address the other side):'),
                h('textarea', { value: d.debateCounter || '', onChange: function(e) { upd('debateCounter', e.target.value); },
                  placeholder: 'Someone might say... but I would respond...\nThe other side argues... however...',
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-violet-300',
                  'aria-label': 'Your counterarguments'
                }),

                // Tips
                h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200 mt-3' },
                  h('p', { className: 'text-[10px] font-bold text-violet-700 mb-1' }, '\uD83D\uDCA1 Debate Tips:'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 Use evidence and examples to support your points'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 Acknowledge the strongest argument of the other side'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 Explain WHY your reasoning matters, not just what you think'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 A strong debater can argue EITHER side convincingly')
                )
              ),

              // Submit for feedback
              callGemini && h('button', { onClick: function() {
                if ((!d.debateArgs || d.debateArgs.length < 20)) {
                  addToast('Write at least a few sentences for your arguments first!');
                  return;
                }
                getDebateFeedback();
              }, disabled: aiLoading,
                className: 'w-full px-4 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
              }, h(Sparkles, { size: 14 }), aiLoading ? 'Analyzing your argument...' : '\uD83C\uDFA4 Get Debate Feedback')
            ),

            // Feedback display
            d.debateFeedback && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-violet-50 border border-violet-200 rounded-2xl p-5' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h(Sparkles, { size: 14, className: 'text-violet-500' }),
                  h('h4', { className: 'text-sm font-bold text-violet-700' }, 'Debate Coach Feedback')
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.debateFeedback)
              ),

              // Challenge: argue the other side
              h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 text-center' },
                h('p', { className: 'text-xs font-bold text-amber-700 mb-2' }, '\uD83C\uDFC6 Challenge: Can you argue the OTHER side just as well?'),
                h('button', { onClick: function() { updMulti({ debateSide: d.debateSide === 'for' ? 'against' : 'for', debateArgs: '', debateCounter: '', debateFeedback: null }); },
                  className: 'px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors'
                }, 'Switch Sides & Try Again')
              ),

              h('button', { onClick: function() { updMulti({ debateTopicObj: null, debateSide: null, debateArgs: '', debateCounter: '', debateFeedback: null }); },
                className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
              }, '\u2190 Choose Another Topic')
            )
          )
        ),

        // ═══ BADGES TAB ═══
        tab === 'badges' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFC5 Badges & Achievements'),
            h('p', { className: 'text-sm text-slate-500' }, 'Earn badges by exploring ethical reasoning deeply.')
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            BADGES.map(function(badge) {
              var earned = badge.check(d);
              return h('div', { key: badge.id,
                className: 'p-4 rounded-2xl border-2 transition-all ' + (earned ? 'border-amber-300 bg-amber-50 shadow-md' : 'border-slate-200 bg-slate-50 opacity-60')
              },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-3xl ' + (earned ? '' : 'grayscale opacity-50') }, badge.emoji),
                  h('div', null,
                    h('p', { className: 'font-bold text-sm ' + (earned ? 'text-amber-800' : 'text-slate-500') }, badge.name),
                    h('p', { className: 'text-[10px] ' + (earned ? 'text-amber-600' : 'text-slate-400') }, badge.desc),
                    earned && h('p', { className: 'text-[9px] text-amber-500 font-bold mt-1' }, '\u2713 Earned!')
                  )
                )
              );
            })
          ),

          // Stats summary
          h('div', { className: 'bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200 p-4 mt-2' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCCA Your Progress'),
            h('div', { className: 'grid grid-cols-2 gap-3 text-center' },
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, (d.dilemmasCompleted || []).length),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Scenarios Completed')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, (d.frameworksStudied || []).length),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Frameworks Studied')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, d.debatesCompleted || 0),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Debates Completed')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, Math.floor((d.dialogue || []).length / 2)),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Socratic Exchanges')
              )
            )
          )
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_ethicalreasoning.js loaded');
