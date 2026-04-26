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

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-ethicalreasoning')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-ethicalreasoning'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Audio + WCAG (auto-injected) ──
  var _ethicAC = null;
  function getEthicAC() { if (!_ethicAC) { try { _ethicAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_ethicAC && _ethicAC.state==="suspended") { try { _ethicAC.resume(); } catch(e) {} } return _ethicAC; }
  function ethicTone(f,d,tp,v) { var ac=getEthicAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxEthicClick() { ethicTone(600,0.03,"sine",0.04); }
  function sfxEthicSuccess() { ethicTone(523,0.08,"sine",0.07); setTimeout(function(){ethicTone(659,0.08,"sine",0.07);},70); setTimeout(function(){ethicTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("ethic-a11y")){var _s=document.createElement("style");_s.id="ethic-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-400{color:#64748b!important}";document.head.appendChild(_s);}


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

  // ── Ethical Case Studies (grade-banded) ──
  var CASE_STUDIES = {
    elementary: [
      {
        id: 'cs-e-last-cookie', title: 'The Last Cookie', emoji: '\uD83C\uDF6A',
        background: 'It\u2019s snack time at school. There is one cookie left on the plate. You\u2019re hungry, but so is your friend who forgot their snack today. Your friend looks at the cookie hopefully.',
        stakeholders: ['You (hungry, it\u2019s technically your turn)', 'Your friend (forgot their snack, also hungry)', 'The teacher (wants fairness in the classroom)', 'Other classmates (watching what happens)'],
        competingValues: ['Sharing vs. keeping what\u2019s yours', 'Kindness vs. self-care', 'Fairness vs. generosity'],
        questions: ['Is it selfish to keep the cookie? Or is it okay to take care of yourself?', 'What if you split it? Is half a cookie fair enough?', 'What would you want your friend to do if YOU forgot your snack?', 'Does it matter who is hungrier?'],
        socraticSeed: 'If keeping the cookie makes you happy but your friend sad, and sharing makes your friend happy but you a little hungry, which choice creates more total happiness?'
      },
      {
        id: 'cs-e-telling-friend', title: 'Telling on a Friend', emoji: '\uD83E\uDD2B',
        background: 'Your best friend showed you a bruise on their arm and said someone at home did it. They begged you not to tell anyone because they\u2019re afraid of what might happen. You promised not to tell, but you\u2019re worried about your friend.',
        stakeholders: ['Your friend (scared, asked you to keep a secret)', 'You (worried, promised to keep the secret)', 'A trusted adult (could help but doesn\u2019t know yet)', 'Your friend\u2019s family (the situation at home is complicated)'],
        competingValues: ['Loyalty vs. safety', 'Keeping a promise vs. doing the right thing', 'Trust vs. protection'],
        questions: ['Is there a time when breaking a promise is the RIGHT thing to do?', 'What\u2019s the difference between tattling and telling to keep someone safe?', 'If you don\u2019t tell and something worse happens, how would you feel?', 'Can you find a way to help without breaking trust completely?'],
        socraticSeed: 'If your friend made you promise to keep a secret that could hurt them, was that a fair promise to ask for?'
      },
      {
        id: 'cs-e-found-phone', title: 'Found a Phone', emoji: '\uD83D\uDCF1',
        background: 'You find a shiny new phone on a bench at the park. Nobody is around. The phone has no lock screen and you can see it has cool games on it. You\u2019ve always wanted a phone but your family can\u2019t afford one right now.',
        stakeholders: ['You (want a phone, found it fair and square)', 'The phone\u2019s owner (probably worried, might be a kid like you)', 'Your parents (would want you to do the right thing)', 'A park worker (could help find the owner)'],
        competingValues: ['Honesty vs. temptation', 'Wanting something vs. doing what\u2019s right', 'Finders keepers vs. the Golden Rule'],
        questions: ['How would you feel if YOU lost your phone and someone kept it?', 'Does "finders keepers" apply to expensive things?', 'Would you feel truly happy using a phone you know belongs to someone else?', 'What\u2019s the difference between finding something and stealing it?'],
        socraticSeed: 'If keeping the phone would make you happy for a while but guilty forever, and returning it would be hard but make you proud, which feeling lasts longer?'
      },
      {
        id: 'cs-e-unfair-rule', title: 'The Unfair Rule', emoji: '\uD83D\uDCCB',
        background: 'Your school made a new rule: no recess if ANY student in the class doesn\u2019t finish their homework. You always do your homework, but a few students in your class often don\u2019t. Now you\u2019re losing recess because of them.',
        stakeholders: ['You and other students who do their homework (losing recess unfairly)', 'Students who struggle with homework (may have tough home situations)', 'The teacher (trying to motivate everyone)', 'Parents (concerned about fairness)'],
        competingValues: ['Obedience vs. justice', 'Following rules vs. speaking up', 'Group responsibility vs. individual fairness'],
        questions: ['Is it fair to punish everyone for what a few people do?', 'Should you follow a rule you think is unfair, or speak up?', 'What if the students who don\u2019t do homework have a reason you don\u2019t know about?', 'How could the rule be changed to be more fair?'],
        socraticSeed: 'If a rule is meant to help but ends up hurting people who did nothing wrong, is it still a good rule?'
      },
      {
        id: 'cs-e-helping-cheating', title: 'Helping vs. Cheating', emoji: '\u270D\uFE0F',
        background: 'During a test, your friend whispers "What\u2019s the answer to number 5?" They look really stressed and you know they studied hard but are blanking out. The teacher isn\u2019t looking.',
        stakeholders: ['You (want to help your friend but don\u2019t want to cheat)', 'Your friend (stressed, struggling, asking for help)', 'The teacher (trusts students to be honest)', 'Other students (taking the test fairly on their own)'],
        competingValues: ['Helping a friend vs. following the rules', 'Kindness vs. honesty', 'Short-term help vs. long-term learning'],
        questions: ['Is whispering an answer "helping" or "cheating"?', 'If the teacher can\u2019t see, does that make it okay?', 'Would your friend actually learn anything if you gave them the answer?', 'What could you do AFTER the test to actually help your friend?'],
        socraticSeed: 'If helping someone cheat means they never learn how to do it themselves, is that really helping them?'
      }
    ],
    middle: [
      {
        id: 'cs-m-ai-homework', title: 'AI-Generated Homework', emoji: '\uD83E\uDD16',
        background: 'A new AI tool can write essays and solve math problems that are nearly impossible for teachers to detect. About half your class is using it to complete assignments. Your grades are dropping because you\u2019re doing your own work while others get perfect scores from AI. A friend says "You\u2019re putting yourself at a disadvantage for no reason."',
        stakeholders: ['Students using AI (getting higher grades, less stress)', 'Students doing their own work (lower grades, more effort)', 'Teachers (can\u2019t detect it, trust is eroding)', 'Future employers/colleges (expecting real skills)', 'AI companies (profiting from the tools)'],
        competingValues: ['Integrity vs. competitive advantage', 'Individual ethics vs. systemic pressure', 'Short-term grades vs. long-term learning'],
        questions: ['If everyone is doing it, does that make it okay?', 'Is using AI for homework different from using a calculator for math?', 'Where is the line between "tool" and "doing the work for you"?', 'What happens when these students face a test or job that requires real skills?'],
        socraticSeed: 'If the purpose of homework is to learn, and AI does the learning for you, have you completed the assignment or just produced a document?'
      },
      {
        id: 'cs-m-cancel-culture', title: 'Cancel Culture Debate', emoji: '\uD83D\uDCF2',
        background: 'A popular student at your school posted something offensive on social media two years ago, when they were in 6th grade. Someone found the old post and shared it. Now many students are calling for this person to be removed from student council, kicked off sports teams, and socially excluded. The student has apologized and says they\u2019ve changed.',
        stakeholders: ['The student who posted (apologized, says they\u2019ve grown)', 'Students who were hurt by the post (still feel the impact)', 'Student body (debating accountability vs. forgiveness)', 'School administration (deciding consequences)', 'Social media (amplifies everything)'],
        competingValues: ['Accountability vs. forgiveness', 'Justice vs. mercy', 'Growth vs. consequences', 'Public shaming vs. private resolution'],
        questions: ['Can people truly change? How do we know?', 'Should a 12-year-old be held accountable for something they said at 10?', 'Is there a difference between consequences and punishment?', 'Does public shaming help anyone grow, or does it just feel satisfying?'],
        socraticSeed: 'If we judge people only by their worst moment and never allow for growth, what incentive does anyone have to become a better person?'
      },
      {
        id: 'cs-m-fast-fashion', title: 'Fast Fashion', emoji: '\uD83D\uDC55',
        background: 'Your favorite clothing brand sells trendy clothes for very cheap prices. An investigative report reveals that the clothes are made by workers in another country who earn $2 a day, work 14-hour shifts, and face unsafe conditions. The brand says they follow local labor laws. Your friends all wear this brand.',
        stakeholders: ['Garment workers (low wages, poor conditions)', 'Consumers/you (want affordable trendy clothes)', 'The clothing company (following local laws, maximizing profit)', 'Local economies (jobs depend on these factories)', 'The environment (fast fashion creates massive waste)'],
        competingValues: ['Convenience vs. exploitation', 'Affordable clothing vs. fair wages', 'Individual choices vs. systemic problems', 'Following the law vs. doing what\u2019s right'],
        questions: ['If the workers agreed to the job, is it still exploitation?', 'Are consumers responsible for how products are made?', 'Is it fair for wealthy countries to impose their labor standards on poorer countries?', 'Can you be ethical and still buy affordable clothes?'],
        socraticSeed: 'If something is legal but causes suffering, does legality make it ethical?'
      },
      {
        id: 'cs-m-social-media-privacy', title: 'Social Media Privacy', emoji: '\uD83D\uDD12',
        background: 'Your friend group went to a party and someone took photos. One friend posted a group photo on social media without asking. In the photo, another friend is doing something embarrassing. The embarrassing friend asks for it to be taken down, but the poster says "It\u2019s my photo, I can post what I want."',
        stakeholders: ['The person who posted (took the photo, feels ownership)', 'The embarrassed friend (didn\u2019t consent, reputation at risk)', 'Other people in the photo (didn\u2019t consent either)', 'Social media audience (sharing and commenting)', 'School community (may see the photo)'],
        competingValues: ['Freedom of expression vs. consent', 'Ownership vs. privacy', 'Sharing memories vs. respecting boundaries'],
        questions: ['Does taking a photo give you the right to share it with anyone?', 'Should you always ask before posting photos of others?', 'Is "it\u2019s my photo" a valid argument when other people are in it?', 'How would YOU feel if someone posted an embarrassing photo of you?'],
        socraticSeed: 'If you have the legal right to post a photo but it hurts someone, does having the right make it the right thing to do?'
      },
      {
        id: 'cs-m-grade-inflation', title: 'Grade Inflation', emoji: '\uD83D\uDCCA',
        background: 'Your teacher is known for being tough but fair \u2014 students earn their grades honestly. Another teacher gives almost everyone A\u2019s regardless of work quality. Students in that class have higher GPAs and get into better programs. Parents are complaining that your teacher is "too hard" and hurting students\u2019 futures.',
        stakeholders: ['Students in the tough class (learning more but lower GPAs)', 'Students in the easy class (higher GPAs, less learning)', 'The tough teacher (committed to real standards)', 'The easy teacher (wants students to feel successful)', 'Colleges and future programs (relying on grades to be meaningful)'],
        competingValues: ['Fairness vs. compassion', 'Honest assessment vs. student self-esteem', 'Real learning vs. grade competition', 'Individual teachers vs. system-wide standards'],
        questions: ['Is a grade meaningful if everyone gets an A?', 'Should teachers make students feel good or prepare them for reality?', 'Is it fair that two students doing the same work get different grades?', 'Whose job is it to fix this \u2014 teachers, schools, or the system?'],
        socraticSeed: 'If an A means "excellent" but everyone gets one, does the word "excellent" lose its meaning?'
      }
    ],
    high: [
      {
        id: 'cs-h-self-driving', title: 'Self-Driving Car Dilemma', emoji: '\uD83D\uDE97',
        background: 'A self-driving car\u2019s brakes fail on a busy street. The AI must choose: swerve left and hit an elderly pedestrian, swerve right and hit a young parent with a child, or continue straight into a concrete barrier (killing the passenger). The car must decide in 0.3 seconds. The company needs to program this decision BEFORE the situation occurs.',
        stakeholders: ['The passenger (purchased the car expecting safety)', 'The elderly pedestrian (has a right to walk safely)', 'The parent and child (vulnerable, crossing legally)', 'The car manufacturer (liable for the programming decision)', 'Society (needs to trust autonomous vehicles)', 'Insurance companies (who pays for what outcome?)'],
        competingValues: ['Utilitarian calculation (save the most lives) vs. dignity (no life is worth less)', 'Consumer safety vs. public safety', 'Algorithm-driven decisions vs. human moral judgment', 'Progress vs. precaution'],
        questions: ['Can morality be programmed into an algorithm?', 'Should a car value its passenger over pedestrians, or vice versa?', 'Who is responsible when an algorithm kills someone \u2014 the programmer, the company, or the buyer?', 'Would you buy a car that might sacrifice you to save others?'],
        socraticSeed: 'If we program a car to calculate who "deserves" to live based on age, health, or number, have we reduced human beings to data points?'
      },
      {
        id: 'cs-h-genetic-engineering', title: 'Genetic Engineering', emoji: '\uD83E\uDDEC',
        background: 'CRISPR gene editing can now eliminate genetic diseases like sickle cell anemia and cystic fibrosis from embryos before birth. The same technology could enhance intelligence, athleticism, and appearance. A wealthy family wants to use it to ensure their child is "optimized." A family with a genetic disease wants to use it to prevent their child\u2019s suffering. The technology costs $100,000 \u2014 insurance doesn\u2019t cover it.',
        stakeholders: ['Families with genetic diseases (desperately want to prevent suffering)', 'Wealthy families (can afford enhancement)', 'Children who will be born (can\u2019t consent to genetic changes)', 'Disability rights advocates (argue genetic conditions are part of human diversity)', 'Scientists (pushing boundaries of what\u2019s possible)', 'Insurance/healthcare systems (who pays, who benefits?)'],
        competingValues: ['Curing disease vs. "playing God"', 'Parental choice vs. child\u2019s future autonomy', 'Medical necessity vs. enhancement', 'Equality vs. genetic privilege'],
        questions: ['Where is the line between curing a disease and "improving" a human?', 'If only the rich can afford genetic enhancement, does that create a new form of inequality?', 'Do parents have the right to make permanent genetic decisions for unborn children?', 'Is eliminating a genetic condition the same as saying people with that condition shouldn\u2019t exist?'],
        socraticSeed: 'If we define some genetic traits as "defects" to be eliminated, who gets to decide what counts as normal?'
      },
      {
        id: 'cs-h-surveillance-safety', title: 'Surveillance for Safety', emoji: '\uD83D\uDCF7',
        background: 'After a series of crimes, a city proposes installing facial recognition cameras on every street corner. Police say it will reduce crime by 40%. Civil liberties groups note that the technology misidentifies people of color at 10x the rate of white people. A recent study shows that cities with surveillance see a 15% decrease in public protests and political speech.',
        stakeholders: ['Crime victims (want safety and prevention)', 'Police (want effective tools)', 'People of color (disproportionately misidentified)', 'Political activists (chilled speech and protest)', 'Technology companies (selling the systems)', 'General public (trading privacy for safety)'],
        competingValues: ['Privacy vs. security', 'Safety vs. civil liberties', 'Efficiency vs. accuracy', 'Majority safety vs. minority rights'],
        questions: ['Is a 40% crime reduction worth universal surveillance?', 'If the technology is biased, is using it a form of discrimination?', 'Does constant surveillance change how people behave, even if they\u2019re innocent?', 'Who controls the data, and what else could it be used for?'],
        socraticSeed: 'If you have nothing to hide, you have nothing to fear \u2014 but who decides what counts as "something to hide," and can that definition change?'
      },
      {
        id: 'cs-h-wealth-inequality', title: 'Wealth Inequality', emoji: '\uD83D\uDCB0',
        background: 'The world\u2019s 8 richest people own as much wealth as the poorest 3.6 billion combined. A billionaire argues they created thousands of jobs, pay taxes, and donate to charity. Critics argue that no one "earns" a billion dollars \u2014 it requires systemic advantages, others\u2019 labor, and often regulatory capture. Meanwhile, 10% of the world lives on less than $2.15 per day.',
        stakeholders: ['Billionaires (argue wealth was earned through innovation)', 'Workers (created the actual value through labor)', 'People in extreme poverty (lack basic necessities)', 'Governments (set tax policies and regulations)', 'Consumers (benefit from products, fund wealth accumulation)', 'Future generations (inherit or don\u2019t inherit wealth)'],
        competingValues: ['Merit vs. luck/privilege', 'Property rights vs. human rights', 'Innovation incentives vs. redistribution', 'Individual freedom vs. collective welfare'],
        questions: ['Is extreme wealth a personal achievement or a systemic outcome?', 'Does voluntary charity address inequality, or just make the wealthy feel better?', 'If you were behind Rawls\u2019 veil of ignorance (not knowing your position), what economic system would you choose?', 'Is it possible to have billionaires and no poverty at the same time?'],
        socraticSeed: 'If one person\u2019s wealth depends on a system that keeps others in poverty, can we separate the wealth from the poverty?'
      },
      {
        id: 'cs-h-climate-development', title: 'Climate vs. Development', emoji: '\uD83C\uDF0D',
        background: 'A developing nation with widespread poverty discovers massive oil reserves that could lift millions out of poverty. Wealthy nations \u2014 which industrialized using fossil fuels for 200 years \u2014 demand the developing nation leave the oil in the ground to meet global climate targets. The developing nation\u2019s leader says: "You got rich burning oil. Now you want us to stay poor to fix YOUR problem?"',
        stakeholders: ['Citizens of the developing nation (desperate to escape poverty)', 'Future generations everywhere (will bear climate consequences)', 'Wealthy nations (historically responsible for most emissions)', 'Indigenous communities (land and water threatened by extraction)', 'The global ecosystem (approaching tipping points)', 'International climate negotiators (trying to find consensus)'],
        competingValues: ['Present survival vs. future sustainability', 'Historical responsibility vs. current action', 'National sovereignty vs. global commons', 'Economic justice vs. environmental justice'],
        questions: ['Is it fair to ask poor countries to sacrifice development for a problem rich countries created?', 'Who owes the "climate debt" \u2014 and how should it be paid?', 'Can economic development and climate action coexist?', 'If wealthy nations won\u2019t pay for the transition, do they have the right to demand it?'],
        socraticSeed: 'If the wealthiest nations became wealthy by doing exactly what they now forbid others from doing, is their demand for climate action justice or hypocrisy?'
      }
    ]
  };

  // ── Values Clarification Exercise Data ──
  var VALUES_LIST = [
    { id: 'honesty', name: 'Honesty', emoji: '\uD83D\uDCA1', desc: 'Being truthful and transparent, even when it\u2019s hard.' },
    { id: 'kindness', name: 'Kindness', emoji: '\uD83D\uDC9B', desc: 'Being caring, generous, and considerate toward others.' },
    { id: 'fairness', name: 'Fairness', emoji: '\u2696\uFE0F', desc: 'Treating everyone equally and standing up for what\u2019s right.' },
    { id: 'loyalty', name: 'Loyalty', emoji: '\uD83E\uDD1D', desc: 'Being faithful and dependable to the people and causes you care about.' },
    { id: 'freedom', name: 'Freedom', emoji: '\uD83D\uDD4A\uFE0F', desc: 'Having the ability to make your own choices and live your own way.' },
    { id: 'responsibility', name: 'Responsibility', emoji: '\uD83D\uDCCB', desc: 'Taking ownership of your actions and doing what you\u2019re supposed to do.' },
    { id: 'courage', name: 'Courage', emoji: '\uD83E\uDD81', desc: 'Being brave enough to do the right thing, even when it\u2019s scary.' },
    { id: 'respect', name: 'Respect', emoji: '\uD83C\uDF1F', desc: 'Treating others with dignity, even when you disagree with them.' },
    { id: 'creativity', name: 'Creativity', emoji: '\uD83C\uDFA8', desc: 'Using imagination and original thinking to express yourself and solve problems.' },
    { id: 'family', name: 'Family', emoji: '\uD83C\uDFE0', desc: 'Caring for and being close to the people you call family.' },
    { id: 'achievement', name: 'Achievement', emoji: '\uD83C\uDFC6', desc: 'Working hard to reach your goals and do your best.' },
    { id: 'community', name: 'Community', emoji: '\uD83C\uDF0D', desc: 'Being part of something bigger and helping your neighborhood, school, or world.' }
  ];

  // ── Philosophy Corner Data (grade-banded) ──
  var PHILOSOPHERS = {
    elementary: [
      {
        id: 'aesop', name: 'Aesop', emoji: '\uD83E\uDD8A', years: 'c. 620\u2013564 BCE',
        tagline: 'Fables teach morals',
        bio: 'Aesop was a storyteller from ancient Greece who used short stories about animals to teach important life lessons. His fables \u2014 like "The Tortoise and the Hare" and "The Boy Who Cried Wolf" \u2014 have been told for over 2,500 years because the lessons still apply today!',
        keyIdea: 'We can learn about right and wrong through stories. Animals in fables represent different human choices.',
        famousQuote: 'No act of kindness, no matter how small, is ever wasted.',
        tryIt: 'Think of a time when you learned an important lesson. Can you turn it into a short animal fable?'
      },
      {
        id: 'confucius', name: 'Confucius', emoji: '\uD83C\uDFAF', years: '551\u2013479 BCE',
        tagline: 'Respect your elders and be kind',
        bio: 'Confucius was a teacher from ancient China who believed that being a good person starts with respecting your family, your teachers, and your community. He thought that if everyone practiced kindness and respect at home, the whole world would be a better place.',
        keyIdea: 'Respect for elders, teachers, and family creates a chain of kindness that makes communities strong.',
        famousQuote: 'What you do not wish for yourself, do not do to others.',
        tryIt: 'Confucius said to treat others how you want to be treated. Sound familiar? Try being extra respectful to someone older than you today.'
      },
      {
        id: 'mrogers', name: 'Fred Rogers', emoji: '\uD83D\uDC4B', years: '1928\u20132003',
        tagline: 'Kindness is the most important thing',
        bio: 'Mister Rogers hosted a TV show for children for over 30 years. He believed that every single person is special and worthy of love. He taught kids that feelings are natural, kindness matters more than being cool, and that being yourself is the best thing you can be.',
        keyIdea: 'Everyone deserves to be treated with kindness. Your feelings are valid. You are special just by being you.',
        famousQuote: 'You\u2019ve made this day a special day, by just your being you.',
        tryIt: 'Think of someone who might need a kind word today. What could you say to make them feel special?'
      }
    ],
    middle: [
      {
        id: 'socrates', name: 'Socrates', emoji: '\u2753', years: '470\u2013399 BCE',
        tagline: 'Question everything',
        bio: 'Socrates was an ancient Greek philosopher who believed the best way to find truth was to ask questions, not give answers. He would walk around Athens asking people "Why do you believe that?" until they realized they didn\u2019t fully understand their own ideas. He never wrote anything down \u2014 we know about him from his student Plato.',
        keyIdea: 'The "Socratic method" means learning through questions. True wisdom begins with admitting what you don\u2019t know.',
        famousQuote: 'The unexamined life is not worth living.',
        tryIt: 'Pick something you believe strongly. Now ask yourself: WHY do I believe this? What evidence do I have? Could I be wrong?'
      },
      {
        id: 'aristotle', name: 'Aristotle', emoji: '\u2696\uFE0F', years: '384\u2013322 BCE',
        tagline: 'The golden mean \u2014 balance in all things',
        bio: 'Aristotle was Plato\u2019s student and one of the most influential thinkers in history. He believed that being a good person means finding the "golden mean" \u2014 the balance between two extremes. For example, courage is the balance between cowardice (too little) and recklessness (too much).',
        keyIdea: 'Virtue is about balance. Every good quality exists between two extremes. Becoming good takes practice, like learning an instrument.',
        famousQuote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
        tryIt: 'Pick a virtue (like courage, generosity, or honesty). What does "too little" look like? What does "too much" look like? Where\u2019s the healthy middle?'
      },
      {
        id: 'mlk', name: 'Martin Luther King Jr.', emoji: '\u270A', years: '1929\u20131968',
        tagline: 'Just vs. unjust laws',
        bio: 'Dr. King was a civil rights leader who argued that people have a moral DUTY to disobey unjust laws. He distinguished between just laws (which apply equally to everyone) and unjust laws (which oppress a group). He believed in nonviolent resistance \u2014 breaking unfair laws peacefully and accepting the consequences to awaken the conscience of the community.',
        keyIdea: 'An unjust law is no law at all. We have a moral responsibility to disobey laws that violate human dignity, but we must do so nonviolently and accept the consequences.',
        famousQuote: 'Injustice anywhere is a threat to justice everywhere.',
        tryIt: 'Think of a rule at school or in your community that feels unfair. Is it truly unjust, or just inconvenient? How would Dr. King approach it?'
      }
    ],
    high: [
      {
        id: 'kant', name: 'Immanuel Kant', emoji: '\uD83D\uDCDC', years: '1724\u20131804',
        tagline: 'The categorical imperative',
        bio: 'Kant argued that moral rules must be universal \u2014 if an action is right, it must be right for EVERYONE, always. His "categorical imperative" says: act only according to rules you could will to be universal laws. He also insisted we must treat people as ends in themselves, never merely as means to our own goals.',
        keyIdea: 'Morality is about duty, not consequences. Ask: "What if everyone did this?" If the answer is chaos, it\u2019s wrong. Always respect human dignity.',
        famousQuote: 'Act only according to that maxim whereby you can, at the same time, will that it should become a universal law.',
        tryIt: 'Apply the universalizability test to a common action (lying, littering, cheating). What happens if EVERYONE does it?'
      },
      {
        id: 'mill', name: 'John Stuart Mill', emoji: '\uD83D\uDCCA', years: '1806\u20131873',
        tagline: 'Utilitarianism \u2014 the greatest good',
        bio: 'Mill developed utilitarianism, the idea that the right action is whatever produces the most happiness (or least suffering) for the most people. But he distinguished between "higher" and "lower" pleasures \u2014 intellectual and moral pleasures matter more than physical ones. He was also a strong advocate for women\u2019s rights and free speech.',
        keyIdea: 'Calculate the consequences: which action creates the most total well-being? But remember that not all pleasures are equal \u2014 quality matters as much as quantity.',
        famousQuote: 'It is better to be Socrates dissatisfied than a fool satisfied.',
        tryIt: 'Think of a policy decision. Can you calculate the total happiness and suffering it would cause? What are the limits of this approach?'
      },
      {
        id: 'rawls', name: 'John Rawls', emoji: '\uD83C\uDFAD', years: '1921\u20132002',
        tagline: 'Justice as fairness',
        bio: 'Rawls proposed a thought experiment: imagine you\u2019re designing society from scratch, but you don\u2019t know what position you\u2019ll hold \u2014 rich or poor, healthy or sick, majority or minority. Behind this "veil of ignorance," what rules would you choose? Rawls argued you\u2019d choose to protect the most vulnerable, because you might BE the most vulnerable.',
        keyIdea: 'The veil of ignorance: design society as if you don\u2019t know who you\u2019ll be. Fair rules are the ones you\u2019d choose without knowing your position.',
        famousQuote: 'Justice is the first virtue of social institutions, as truth is of systems of thought.',
        tryIt: 'Redesign your school\u2019s rules from behind the veil of ignorance. How would things change if you didn\u2019t know your grades, popularity, or family income?'
      },
      {
        id: 'de-beauvoir', name: 'Simone de Beauvoir', emoji: '\uD83D\uDD25', years: '1908\u20131986',
        tagline: 'The ethics of ambiguity',
        bio: 'De Beauvoir argued that human freedom is the foundation of ethics, but freedom comes with radical responsibility. We cannot escape choosing \u2014 even refusing to choose is a choice. She challenged people to accept the ambiguity of moral life rather than hiding behind rules or excuses, and showed how systems of oppression deny freedom to entire groups.',
        keyIdea: 'Ethics requires embracing ambiguity. There are no guaranteed right answers \u2014 but that doesn\u2019t free us from the responsibility of choosing. Oppression denies others the freedom that makes ethics possible.',
        famousQuote: 'One is not born, but rather becomes, a woman.',
        tryIt: 'Think of a moral decision where there\u2019s no clear "right" answer. Can you sit with the ambiguity instead of forcing certainty?'
      },
      {
        id: 'hooks', name: 'bell hooks', emoji: '\u2764\uFE0F', years: '1952\u20132021',
        tagline: 'Love as a practice of freedom',
        bio: 'bell hooks (she wrote her name in lowercase intentionally) argued that love isn\u2019t just a feeling \u2014 it\u2019s a practice, a verb, an action. She defined love as "the will to nurture our own and another\u2019s spiritual growth." She connected love to justice, arguing that you cannot truly love someone while participating in systems that oppress them.',
        keyIdea: 'Love is action, not just feeling. True love requires justice. You cannot love people and support systems that harm them. Ethics starts with how we love.',
        famousQuote: 'The moment we choose to love we begin to move against domination, against oppression.',
        tryIt: 'Think about someone you love. Are there ways the systems around you make their life harder? What would it mean to love them not just personally, but politically?'
      },
      {
        id: 'singer', name: 'Peter Singer', emoji: '\uD83D\uDC3E', years: 'b. 1946',
        tagline: 'Animal rights and effective altruism',
        bio: 'Singer argues that the capacity to suffer \u2014 not species, intelligence, or language \u2014 is what matters morally. If an animal can suffer, its suffering counts. He also developed "effective altruism," the idea that we have a moral obligation to help others as effectively as possible, and that failing to donate to life-saving causes is morally equivalent to letting someone drown.',
        keyIdea: 'Suffering is suffering, regardless of species. We have a moral obligation to reduce suffering wherever we can, as effectively as we can.',
        famousQuote: 'If it is in our power to prevent something bad from happening, without thereby sacrificing anything of comparable moral importance, we ought, morally, to do it.',
        tryIt: 'Singer asks: if you walked past a drowning child, would you save them even if it ruined your expensive shoes? If yes, why don\u2019t you donate that shoe money to save children in poverty?'
      }
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
    { id: 'case-study-scholar', name: 'Case Study Scholar', emoji: '\uD83D\uDCD6', desc: 'Completed 3+ ethical case studies', check: function(d) { return (d.caseStudiesCompleted || []).length >= 3; } },
    { id: 'values-explorer', name: 'Values Explorer', emoji: '\uD83D\uDC8E', desc: 'Completed the values clarification exercise', check: function(d) { return d.valuesComplete === true; } },
    { id: 'decision-tree-builder', name: 'Decision Tree Builder', emoji: '\uD83C\uDF32', desc: 'Built an ethical decision tree', check: function(d) { return d.decisionTreeComplete === true; } },
    { id: 'philosophy-fan', name: 'Philosophy Fan', emoji: '\uD83E\uDDD0', desc: 'Explored 4+ philosophers', check: function(d) { return (d.philosophersExplored || []).length >= 4; } },
    { id: 'ethical-leader', name: 'Ethical Leader', emoji: '\uD83C\uDF1F', desc: 'Earned 8+ other badges', check: function(d) {
      var count = 0;
      for (var i = 0; i < BADGES.length; i++) {
        if (BADGES[i].id !== 'ethical-leader' && BADGES[i].check(d)) count++;
      }
      return count >= 8;
    } },
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
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
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
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({ 'aria-label': 'Back to SEL Hub', className: 'p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })), h(ArrowLeft, { size: 20 })),
          h('div', null,
            h('h2', { className: 'text-xl font-black text-slate-800' }, '\u2696\uFE0F Ethical Reasoning Lab'),
            h('p', { className: 'text-xs text-slate-600' }, 'There are no easy answers \u2014 only honest questions')
          ),
          // Badge counter
          h('div', { className: 'ml-auto flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1' },
            h('span', { className: 'text-sm' }, '\uD83C\uDFC5'),
            h('span', { className: 'text-xs font-bold text-amber-700' }, countBadges(d) + '/' + BADGES.length)
          )
        ),

        // Tabs
        h('div', { role: 'tablist', 'aria-label': 'Ethical Reasoning tabs', className: 'flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200 flex-wrap' },
          [
            { id: 'dilemmas', label: '\uD83D\uDD25 Dilemmas' },
            { id: 'branching', label: '\uD83C\uDF33 Scenarios' },
            { id: 'casestudies', label: '\uD83D\uDCD6 Cases' },
            { id: 'frameworks', label: '\uD83C\uDFDB\uFE0F Frameworks' },
            { id: 'explore', label: '\uD83D\uDD0D Explore' },
            { id: 'dialogue', label: '\uD83D\uDCAC Socratic' },
            { id: 'values', label: '\uD83D\uDC8E Values' },
            { id: 'decisiontree', label: '\uD83C\uDF32 Tree' },
            { id: 'philosophy', label: '\uD83E\uDDD0 Thinkers' },
            { id: 'kohlberg', label: '\uD83E\uDDE0 Reasoning' },
            { id: 'debate', label: '\uD83C\uDFA4 Debate' },
            { id: 'badges', label: '\uD83C\uDFC5 Badges' },
          ].map(function(t) {
            return h('button', { 'aria-label': 'aria-selected', key: t.id, role: 'tab', 'aria-selected': tab === t.id, onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all min-w-[70px] focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 ' + (tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-700')
            }, t.label);
          })
        ),

        // ═══ DILEMMAS TAB ═══
        tab === 'dilemmas' && !selectedDilemma && h('div', {  className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose a dilemma to explore. Each one has no single right answer.'),
          h('div', {  className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            DILEMMAS.map(function(dl) {
              return h('button', { 'aria-label': 'Explore', key: dl.id, onClick: function() {
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
                    h('span', { className: 'text-[10px] text-slate-600 font-bold uppercase' }, dl.category)
                  )
                ),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed line-clamp-2' }, dl.scenario.substring(0, 120) + '...')
              );
            })
          )
        ),

        // ═══ BRANCHING SCENARIOS TAB ═══
        tab === 'branching' && h('div', {  className: 'space-y-4' },
          h('div', {  className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDF33 Ethical Scenarios'),
            h('p', { className: 'text-sm text-slate-600' }, 'Choose wisely \u2014 every decision has consequences.')
          ),

          // If no scenario selected, show list
          !d.branchingId && h('div', {  className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            (BRANCHING_SCENARIOS[gradeBand] || BRANCHING_SCENARIOS.elementary).map(function(sc) {
              var completed = (d.dilemmasCompleted || []).indexOf(sc.id) !== -1;
              return h('button', { 'aria-label': 'Back to scenarios', key: sc.id, onClick: function() { updMulti({ branchingId: sc.id, branchChoice: null, branchReflection: '' }); },
                className: 'p-4 rounded-2xl border-2 bg-white text-left hover:border-emerald-300 hover:shadow-md transition-all ' + (completed ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200')
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-xl' }, sc.emoji),
                  h('span', { className: 'font-bold text-sm text-slate-800' }, sc.title),
                  completed && h('span', { className: 'ml-auto text-emerald-500 text-xs font-bold' }, '\u2713 Done')
                ),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, sc.scenario.substring(0, 100) + '...')
              );
            })
          ),

          // If scenario selected, show it
          d.branchingId && (function() {
            var scenarios = BRANCHING_SCENARIOS[gradeBand] || BRANCHING_SCENARIOS.elementary;
            var sc = scenarios.find(function(s) { return s.id === d.branchingId; });
            if (!sc) return null;

            return h('div', {  className: 'space-y-4' },
              // Back button
              h('button', { 'aria-label': '},', onClick: function() { updMulti({ branchingId: null, branchChoice: null, branchReflection: '', branchAIDiscussion: null }); }, className: 'text-xs text-slate-600 hover:text-slate-600 font-bold' }, '\u2190 All Scenarios'),

              // Scenario card
              h('div', {  className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-5' },
                h('div', {  className: 'flex items-center gap-2 mb-3' },
                  h('span', {  className: 'text-3xl' }, sc.emoji),
                  h('h3', { className: 'text-lg font-black text-slate-800' }, sc.title)
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, sc.scenario),
                callTTS && h('button', { 'aria-label': '},', onClick: function() { callTTS(sc.scenario); }, className: 'mt-2 text-[10px] text-emerald-600 hover:text-emerald-800 font-bold' }, '\uD83D\uDD0A Read Aloud')
              ),

              // Choices
              !d.branchChoice && h('div', {  className: 'space-y-2' },
                h('h4', { className: 'text-sm font-bold text-slate-700' }, 'What would you do?'),
                sc.choices.map(function(ch, idx) {
                  return h('button', { 'aria-label': 'div', key: idx, onClick: function() {
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
                        h('p', { className: 'text-[10px] text-slate-600 mt-1' }, 'Framework: ' + ch.framework)
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
                    h('p', { className: 'text-xs text-slate-600 mt-2 italic' }, '\uD83D\uDD2E What happened: ' + chosen.result)
                  ),

                  // Framework analysis for each choice
                  h('div', { className: 'bg-white border border-slate-200 rounded-xl p-4' },
                    h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFDB\uFE0F Framework Analysis: All Choices'),
                    sc.choices.map(function(ch, idx) {
                      var isMine = idx === d.branchChoice;
                      return h('div', { key: idx, className: 'mb-2 p-3 rounded-lg ' + (isMine ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-slate-200') },
                        h('div', { className: 'flex items-center gap-2' },
                          h('span', { className: 'font-bold text-xs ' + (isMine ? 'text-indigo-700' : 'text-slate-600') }, String.fromCharCode(65 + idx) + '. ' + ch.text),
                          isMine && h('span', { className: 'text-[11px] text-indigo-500 font-bold' }, '(your choice)')
                        ),
                        h('p', { className: 'text-[10px] text-slate-600 mt-1' }, 'Framework: ' + ch.framework + ' | ' + renderStars(ch.stars)),
                        h('p', { className: 'text-[10px] text-slate-600 italic' }, ch.result)
                      );
                    })
                  ),

                  // Discussion prompt
                  h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
                    h('h4', { className: 'text-sm font-bold text-amber-700 mb-1' }, '\uD83D\uDCA1 Think Deeper'),
                    h('p', { className: 'text-xs text-amber-800' }, sc.discuss)
                  ),

                  // Reflection textarea
                  h('div', {  className: 'bg-white border border-slate-200 rounded-xl p-4' },
                    h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\u270D\uFE0F Reflect: Why did you choose this? Would you change your answer?'),
                    h('textarea', { value: d.branchReflection || '', onChange: function(e) { upd('branchReflection', e.target.value); },
                      placeholder: 'I chose this because...',
                      className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-emerald-300',
                      'aria-label': 'Reflection on ethical choice'
                    })
                  ),

                  // AI discussion button
                  callGemini && h('button', { 'aria-label': 'AI discussion button', onClick: function() {
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
                    className: 'px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-2'
                  }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '\uD83D\uDCAC Discuss with AI'),

                  // AI discussion response
                  d.branchAIDiscussion && h('div', {  className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4' },
                    h('div', {  className: 'flex items-center gap-2 mb-2' },
                      h(Sparkles, { size: 14, className: 'text-emerald-500' }),
                      h('h4', { className: 'text-sm font-bold text-emerald-700' }, 'AI Response')
                    ),
                    h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.branchAIDiscussion)
                  ),

                  // Try another button
                  h('button', { 'aria-label': 'Back to scenarios', onClick: function() { updMulti({ branchingId: null, branchChoice: null, branchReflection: '', branchAIDiscussion: null }); },
                    className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
                  }, '\u2190 Try Another Scenario')
                );
              })()
            );
          })()
        ),

        // ═══ FRAMEWORKS TAB (Grade-Banded) ═══
        tab === 'frameworks' && h('div', {  className: 'space-y-4' },
          h('p', { className: 'text-sm text-slate-600 text-center mb-2' }, 'Ethical frameworks are different lenses for examining the same question. No single framework has all the answers.'),

          // Grade band indicator
          h('div', {  className: 'flex justify-center gap-2 mb-3' },
            ['elementary', 'middle', 'high'].map(function(band) {
              return h('button', { 'aria-label': 'frameworkBand', key: band, onClick: function() { upd('frameworkBand', band); },
                className: 'px-3 py-1 rounded-full text-[10px] font-bold transition-all ' +
                  ((d.frameworkBand || gradeBand) === band ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }, band === 'elementary' ? '\uD83C\uDF1F Elementary' : band === 'middle' ? '\uD83D\uDE80 Middle' : '\uD83C\uDF93 High');
            })
          ),

          // Frameworks for selected band
          (FRAMEWORKS_BY_BAND[d.frameworkBand || gradeBand] || FRAMEWORKS_BY_BAND.elementary).map(function(fw) {
            var isActive = selectedFramework === fw.id;
            return h('div', {  key: fw.id,
              className: 'rounded-2xl border-2 overflow-hidden transition-all ' + (isActive ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300')
            },
              h('button', { 'aria-label': 'px-4 pb-4 space-y-3', onClick: function() {
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
                    fw.thinker && h('div', { className: 'text-[10px] text-slate-600 font-medium' }, fw.thinker)
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
                h('div', {  className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
                  h('p', { className: 'text-xs text-amber-700 italic font-medium' }, '\uD83D\uDCA1 Try applying it: ', fw.tryIt)
                ),

                // Try It reflection area
                h('textarea', { value: d['fwReflect_' + fw.id] || '', onChange: function(e) { upd('fwReflect_' + fw.id, e.target.value); },
                  placeholder: 'Write your thoughts here...',
                  className: 'w-full text-xs p-2 border border-slate-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-indigo-300',
                  'aria-label': 'Framework reflection'
                }),

                // Apply to active dilemma
                selectedDilemma && h('button', { 'aria-label': 'explore', onClick: function() { analyzeWithFramework(fw.id); upd('tab', 'explore'); },
                  disabled: aiLoading,
                  className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-2'
                }, h(Sparkles, { size: 14 }), 'Analyze "' + selectedDilemma.title + '" with this framework')
              )
            );
          }),

          // Original deep frameworks reference (for high schoolers)
          (d.frameworkBand || gradeBand) === 'high' && h('div', { className: 'mt-4 pt-4 border-t border-slate-200' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDD2C Analysis Frameworks (for Deep Dilemmas)'),
            h('p', { className: 'text-[10px] text-slate-600 mb-2' }, 'These frameworks power the AI analysis when you explore a contemporary dilemma.'),
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
        tab === 'explore' && selectedDilemma && h('div', {  className: 'space-y-4' },

          // Dilemma header
          h('div', {  className: 'bg-gradient-to-r from-slate-50 to-indigo-50 rounded-2xl border-2 border-slate-200 p-5' },
            h('div', {  className: 'flex items-center gap-2 mb-3' },
              h('span', {  className: 'text-3xl' }, selectedDilemma.emoji),
              h('div', null,
                h('h3', { className: 'text-lg font-black text-slate-800' }, selectedDilemma.title),
                h('span', {  className: 'text-[10px] text-slate-600 font-bold uppercase' }, selectedDilemma.category)
              ),
              h('button', { 'aria-label': '},', onClick: function() { updMulti({ dilemmaId: null, tab: 'dilemmas', frameworkAnalysis: null }); }, className: 'ml-auto text-xs text-slate-600 hover:text-slate-600 font-bold' }, '\u2190 All Dilemmas')
            ),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
              gradeBand === 'elementary' && selectedDilemma.gradeBands.elementary ? selectedDilemma.gradeBands.elementary : selectedDilemma.scenario
            ),
            callTTS && h('button', { 'aria-label': '},', onClick: function() { callTTS(gradeBand === 'elementary' && selectedDilemma.gradeBands.elementary ? selectedDilemma.gradeBands.elementary : selectedDilemma.scenario); }, className: 'mt-2 text-[10px] text-indigo-500 hover:text-indigo-700 font-bold' }, '\uD83D\uDD0A Read Aloud')
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
          h('div', {  className: 'bg-white rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\uD83E\uDD14 Where do you stand? (Write your reasoning)'),
            h('textarea', { value: d.position || '', onChange: function(e) { upd('position', e.target.value); },
              placeholder: 'I think... because...',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-300',
              'aria-label': 'Your ethical position'
            }),
            d.position && d.position.length > 20 && h('button', { 'aria-label': 'dialogue', onClick: function() { upd('tab', 'dialogue'); askSocratic(d.position); },
              className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2'
            }, '\uD83D\uDCAC Challenge my reasoning with Socratic dialogue')
          ),

          // Quick analyze buttons
          h('div', {  className: 'flex flex-wrap gap-2' },
            FRAMEWORKS.map(function(fw) {
              return h('button', { 'aria-label': 'Analyze with framework', key: fw.id, onClick: function() { analyzeWithFramework(fw.id); }, disabled: aiLoading,
                className: 'px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-40'
              }, fw.emoji + ' Analyze with ' + fw.name);
            })
          )
        ),

        // ═══ EXPLORE TAB - no dilemma selected ═══
        tab === 'explore' && !selectedDilemma && h('div', {  className: 'bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center' },
          h('p', { className: 'text-slate-600 font-bold' }, 'Choose a dilemma from the Dilemmas tab first, then come here to explore it deeply.'),
          h('button', { 'aria-label': '},', onClick: function() { upd('tab', 'dilemmas'); }, className: 'mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700' }, 'Go to Dilemmas')
        ),

        // ═══ SOCRATIC DIALOGUE TAB ═══
        tab === 'dialogue' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDCAC Socratic Dialogue'),
            h('p', { className: 'text-sm text-slate-600' }, selectedDilemma ? 'Exploring: ' + selectedDilemma.title : 'Select a dilemma first, then share your thinking.')
          ),

          !selectedDilemma && h('div', { className: 'bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center' },
            h('p', { className: 'text-slate-600 font-bold' }, 'Choose a dilemma from the Dilemmas tab first, then come here to discuss it.')
          ),

          selectedDilemma && h('div', { className: 'space-y-3' },
            // Dialogue history
            dialogueHistory.length > 0 && h('div', { className: 'space-y-2 max-h-[400px] overflow-y-auto' },
              dialogueHistory.map(function(msg, i) {
                return h('div', { key: i, className: 'flex ' + (msg.role === 'student' ? 'justify-end' : 'justify-start') },
                  h('div', { className: 'max-w-[80%] rounded-2xl px-4 py-3 ' + (msg.role === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200') },
                    h('div', { className: 'text-[10px] font-bold mb-1 ' + (msg.role === 'student' ? 'text-indigo-200' : 'text-slate-300') }, msg.role === 'student' ? 'You' : '\uD83C\uDFDB\uFE0F Socrates'),
                    h('p', { className: 'text-sm leading-relaxed' }, msg.text)
                  )
                );
              })
            ),

            dialogueHistory.length === 0 && h('div', { className: 'bg-slate-50 rounded-xl p-4 text-center' },
              h('p', { className: 'text-sm text-slate-600' }, 'Share your initial thoughts about "', selectedDilemma.title, '" and I\'ll ask you questions to deepen your reasoning.')
            ),

            // Input
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: d.dialogueInput || '', onChange: function(e) { upd('dialogueInput', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter' && d.dialogueInput && d.dialogueInput.trim()) askSocratic(d.dialogueInput); },
                placeholder: 'Share your reasoning...', disabled: aiLoading,
                className: 'flex-1 text-sm p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-40',
                'aria-label': 'Your response to Socratic dialogue'
              }),
              h('button', { 'aria-label': 'Send response', onClick: function() { if (d.dialogueInput && d.dialogueInput.trim()) askSocratic(d.dialogueInput); }, disabled: aiLoading || !(d.dialogueInput && d.dialogueInput.trim()),
                className: 'px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40'
              }, aiLoading ? '...' : '\u2192')
            ),

            h('p', { className: 'text-[11px] text-slate-300 text-center' }, 'The AI will challenge your thinking with questions \u2014 not give you answers. There are no wrong responses.')
          )
        ),

        // ═══ KOHLBERG MORAL REASONING ASSESSMENT TAB ═══
        tab === 'kohlberg' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDDE0 Moral Reasoning Style'),
            h('p', { className: 'text-sm text-slate-600' }, 'Discover how you think about right and wrong. There are no wrong answers \u2014 only YOUR reasoning.')
          ),

          // Intro card
          !d.kohlbergStarted && h('div', {  className: 'bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-5 text-center' },
            h('span', {  className: 'text-4xl block mb-3' }, '\uD83E\uDDD9'),
            h('h4', { className: 'text-base font-bold text-purple-800 mb-2' }, 'What Kind of Moral Thinker Are You?'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed mb-3' }, 'Psychologist Lawrence Kohlberg found that people reason about ethics at different levels \u2014 and all levels are a normal part of growing up. This assessment helps you see YOUR pattern.'),
            h('div', {  className: 'bg-white rounded-xl p-4 border border-purple-200 text-left mb-4' },
              h('div', {  className: 'space-y-2' },
                h('p', { className: 'text-xs text-purple-700' }, '\uD83D\uDD35 Level 1 \u2014 "What happens to ME?" (Self-interest: rewards and punishments)'),
                h('p', { className: 'text-xs text-purple-700' }, '\uD83D\uDFE2 Level 2 \u2014 "What do others expect?" (Rules, authority, social approval)'),
                h('p', { className: 'text-xs text-purple-700' }, '\uD83D\uDFE1 Level 3 \u2014 "What is universally right?" (Principles like justice, dignity, human rights)')
              ),
              h('p', { className: 'text-[10px] text-slate-600 mt-2 italic' }, 'Remember: ALL levels are valid and normal. Most adults use a mix of all three!')
            ),
            h('button', { 'aria-label': 'Start assessment', onClick: function() { updMulti({ kohlbergStarted: true, kohlbergStep: 0, kohlbergAnswers: {} }); },
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

            return h('div', {  className: 'space-y-4' },
              // Progress bar
              h('div', {  className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                h('div', {  className: 'bg-purple-500 h-full transition-all duration-300', style: { width: Math.round((step / total) * 100) + '%' } })
              ),
              h('p', { className: 'text-[10px] text-slate-600 text-center' }, 'Question ' + (step + 1) + ' of ' + total),

              // Scenario
              h('div', {  className: 'bg-white rounded-2xl border-2 border-purple-200 p-5' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed mb-4' }, sc.scenario),
                callTTS && h('button', { 'aria-label': '},', onClick: function() { callTTS(sc.scenario); }, className: 'text-[10px] text-purple-500 hover:text-purple-700 font-bold mb-3 block' }, '\uD83D\uDD0A Read Aloud'),

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
                answers[sc.id] && answers[sc.id].length > 15 && h('div', {  className: 'mt-3 bg-purple-50 rounded-xl p-3 border border-purple-200' },
                  h('p', { className: 'text-[10px] font-bold text-purple-700 mb-2' }, '\uD83D\uDD0D Different people reason like this:'),
                  h('p', { className: 'text-[10px] text-slate-600 mb-1' }, '\uD83D\uDD35 Self-interest: "' + sc.levels.preconv + '"'),
                  h('p', { className: 'text-[10px] text-slate-600 mb-1' }, '\uD83D\uDFE2 Rules/Society: "' + sc.levels.conv + '"'),
                  h('p', { className: 'text-[10px] text-slate-600' }, '\uD83D\uDFE1 Universal principles: "' + sc.levels.postconv + '"'),
                  h('p', { className: 'text-[11px] text-slate-600 mt-2 italic' }, 'Your answer doesn\u2019t have to match any of these exactly. Most people use a blend!')
                )
              ),

              // Navigation
              h('div', {  className: 'flex gap-2' },
                step > 0 && h('button', { 'aria-label': 'kohlbergStep', onClick: function() { upd('kohlbergStep', step - 1); },
                  className: 'px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200'
                }, '\u2190 Previous'),
                h('div', {  className: 'flex-1' }),
                step < total - 1 && h('button', { 'aria-label': 'See reasoning pattern', onClick: function() {
                  if (answers[sc.id] && answers[sc.id].length > 10) {
                    upd('kohlbergStep', step + 1);
                    ctx.awardXP(3);
                  } else {
                    addToast('Please write at least a sentence explaining your reasoning.');
                  }
                },
                  className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors'
                }, 'Next \u2192'),
                step === total - 1 && answeredCount >= Math.ceil(total * 0.6) && h('button', { 'aria-label': 'See reasoning pattern', onClick: function() {
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
                  return h('div', {  key: lv.level, className: 'p-3 rounded-lg border ' + colorMap[lv.color] },
                    h('div', {  className: 'font-bold text-xs' }, lv.level),
                    h('p', { className: 'text-[10px] mt-1' }, lv.desc),
                    h('p', { className: 'text-[11px] mt-1 opacity-70 italic' }, lv.ages)
                  );
                })
              ),
              h('p', { className: 'text-[11px] text-slate-600 mt-3 text-center italic' }, 'Most people use a mix of all three levels depending on the situation. Growth is a journey, not a destination.')
            ),

            // Retake button
            h('button', { 'aria-label': 'Retake assessment', onClick: function() { updMulti({ kohlbergStarted: false, kohlbergComplete: false, kohlbergStep: 0, kohlbergAnswers: {}, kohlbergFeedback: null }); },
              className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
            }, '\uD83D\uDD04 Retake Assessment')
          )
        ),

        // ═══ DEBATE PREP TAB ═══
        tab === 'debate' && h('div', {  className: 'space-y-4' },
          h('div', {  className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFA4 Debate Prep Tool'),
            h('p', { className: 'text-sm text-slate-600' }, 'Pick a topic, choose a side, and build your argument.')
          ),

          // Topic selection
          !d.debateTopicObj && h('div', {  className: 'space-y-3' },
            h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose a topic to debate:'),
            (DEBATE_TOPICS[gradeBand] || DEBATE_TOPICS.elementary).map(function(topic) {
              return h('button', { 'aria-label': ', debateCounter:', key: topic.id, onClick: function() { updMulti({ debateTopicObj: topic, debateSide: null, debateArgs: '', debateCounter: '', debateFeedback: null }); },
                className: 'w-full p-4 rounded-xl border-2 border-slate-200 bg-white text-left hover:border-violet-300 hover:shadow-md transition-all'
              },
                h('p', { className: 'text-sm font-bold text-slate-800' }, topic.topic),
                h('div', {  className: 'flex gap-4 mt-2' },
                  h('p', { className: 'text-[10px] text-emerald-600 flex-1' }, '\u2713 For: ' + topic.forSide.substring(0, 60) + '...'),
                  h('p', { className: 'text-[10px] text-red-500 flex-1' }, '\u2717 Against: ' + topic.againstSide.substring(0, 60) + '...')
                )
              );
            })
          ),

          // Active debate
          d.debateTopicObj && h('div', {  className: 'space-y-4' },
            // Back button
            h('button', { 'aria-label': ', debateCounter:', onClick: function() { updMulti({ debateTopicObj: null, debateSide: null, debateArgs: '', debateCounter: '', debateFeedback: null }); },
              className: 'text-xs text-slate-600 hover:text-slate-600 font-bold'
            }, '\u2190 All Topics'),

            // Topic display
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border-2 border-violet-200 p-5' },
              h('h4', { className: 'text-base font-bold text-slate-800 mb-2' }, d.debateTopicObj.topic),
              h('div', {  className: 'grid grid-cols-2 gap-3 mt-3' },
                h('div', {  className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200' },
                  h('p', { className: 'text-xs font-bold text-emerald-700 mb-1' }, '\u2713 For:'),
                  h('p', { className: 'text-[10px] text-emerald-600' }, d.debateTopicObj.forSide)
                ),
                h('div', {  className: 'bg-red-50 rounded-lg p-3 border border-red-200' },
                  h('p', { className: 'text-xs font-bold text-red-700 mb-1' }, '\u2717 Against:'),
                  h('p', { className: 'text-[10px] text-red-600' }, d.debateTopicObj.againstSide)
                )
              )
            ),

            // Side selection
            !d.debateSide && h('div', {  className: 'flex gap-3' },
              h('button', { 'aria-label': 'for', onClick: function() { upd('debateSide', 'for'); ctx.awardXP(3); },
                className: 'flex-1 p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all text-center'
              },
                h('p', { className: 'text-lg font-bold text-emerald-700' }, '\u2713'),
                h('p', { className: 'text-sm font-bold text-emerald-700' }, 'Argue FOR')
              ),
              h('button', { 'aria-label': 'against', onClick: function() { upd('debateSide', 'against'); ctx.awardXP(3); },
                className: 'flex-1 p-4 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 transition-all text-center'
              },
                h('p', { className: 'text-lg font-bold text-red-700' }, '\u2717'),
                h('p', { className: 'text-sm font-bold text-red-700' }, 'Argue AGAINST')
              )
            ),

            // Argument building
            d.debateSide && !d.debateFeedback && h('div', {  className: 'space-y-4' },
              h('div', {  className: 'bg-white rounded-xl border border-slate-200 p-4' },
                h('div', {  className: 'flex items-center gap-2 mb-2' },
                  h('span', {  className: 'text-sm font-bold ' + (d.debateSide === 'for' ? 'text-emerald-700' : 'text-red-700') },
                    d.debateSide === 'for' ? '\u2713 You are arguing FOR' : '\u2717 You are arguing AGAINST'),
                  h('button', { 'aria-label': 'for', onClick: function() { upd('debateSide', d.debateSide === 'for' ? 'against' : 'for'); },
                    className: 'ml-auto text-[10px] text-slate-600 hover:text-slate-600 font-bold'
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
                h('div', {  className: 'bg-violet-50 rounded-lg p-3 border border-violet-200 mt-3' },
                  h('p', { className: 'text-[10px] font-bold text-violet-700 mb-1' }, '\uD83D\uDCA1 Debate Tips:'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 Use evidence and examples to support your points'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 Acknowledge the strongest argument of the other side'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 Explain WHY your reasoning matters, not just what you think'),
                  h('p', { className: 'text-[10px] text-violet-600' }, '\u2022 A strong debater can argue EITHER side convincingly')
                )
              ),

              // Submit for feedback
              callGemini && h('button', { 'aria-label': 'Get debate feedback', onClick: function() {
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
            d.debateFeedback && h('div', {  className: 'space-y-3' },
              h('div', {  className: 'bg-violet-50 border border-violet-200 rounded-2xl p-5' },
                h('div', {  className: 'flex items-center gap-2 mb-3' },
                  h(Sparkles, { size: 14, className: 'text-violet-500' }),
                  h('h4', { className: 'text-sm font-bold text-violet-700' }, 'Debate Coach Feedback')
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.debateFeedback)
              ),

              // Challenge: argue the other side
              h('div', {  className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 text-center' },
                h('p', { className: 'text-xs font-bold text-amber-700 mb-2' }, '\uD83C\uDFC6 Challenge: Can you argue the OTHER side just as well?'),
                h('button', { 'aria-label': ', debateCounter:', onClick: function() { updMulti({ debateSide: d.debateSide === 'for' ? 'against' : 'for', debateArgs: '', debateCounter: '', debateFeedback: null }); },
                  className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors'
                }, 'Switch Sides & Try Again')
              ),

              h('button', { 'aria-label': ', debateCounter:', onClick: function() { updMulti({ debateTopicObj: null, debateSide: null, debateArgs: '', debateCounter: '', debateFeedback: null }); },
                className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
              }, '\u2190 Choose Another Topic')
            )
          )
        ),

        // ═══ CASE STUDIES TAB ═══
        tab === 'casestudies' && h('div', {  className: 'space-y-4' },
          h('div', {  className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDCD6 Ethical Case Studies'),
            h('p', { className: 'text-sm text-slate-600' }, 'Real-world ethical situations for deeper analysis and Socratic dialogue.')
          ),

          // Case study list (when none selected)
          !d.caseStudyId && h('div', {  className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            (CASE_STUDIES[gradeBand] || CASE_STUDIES.elementary).map(function(cs) {
              var completed = (d.caseStudiesCompleted || []).indexOf(cs.id) !== -1;
              return h('button', { 'aria-label': 'Back to case studies', key: cs.id, onClick: function() {
                updMulti({ caseStudyId: cs.id, caseStudyReflection: '', caseStudyAIResp: null, caseStudySocratic: [] });
              },
                className: 'p-4 rounded-2xl border-2 bg-white text-left hover:border-teal-300 hover:shadow-md transition-all ' + (completed ? 'border-teal-300 bg-teal-50' : 'border-slate-200')
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-xl' }, cs.emoji),
                  h('span', { className: 'font-bold text-sm text-slate-800' }, cs.title),
                  completed && h('span', { className: 'ml-auto text-teal-500 text-xs font-bold' }, '\u2713 Done')
                ),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, cs.background.substring(0, 100) + '...')
              );
            })
          ),

          // Active case study
          d.caseStudyId && (function() {
            var studies = CASE_STUDIES[gradeBand] || CASE_STUDIES.elementary;
            var cs = studies.find(function(s) { return s.id === d.caseStudyId; });
            if (!cs) return null;
            var csSocratic = d.caseStudySocratic || [];

            return h('div', {  className: 'space-y-4' },
              h('button', { 'aria-label': 'Read aloud', onClick: function() { updMulti({ caseStudyId: null, caseStudyReflection: '', caseStudyAIResp: null, caseStudySocratic: [] }); },
                className: 'text-xs text-slate-600 hover:text-slate-600 font-bold'
              }, '\u2190 All Case Studies'),

              // Background
              h('div', {  className: 'bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200 p-5' },
                h('div', {  className: 'flex items-center gap-2 mb-3' },
                  h('span', {  className: 'text-3xl' }, cs.emoji),
                  h('h3', { className: 'text-lg font-black text-slate-800' }, cs.title)
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, cs.background),
                callTTS && h('button', { 'aria-label': 'Read Aloud', onClick: function() { callTTS(cs.background); }, className: 'mt-2 text-[10px] text-teal-600 hover:text-teal-800 font-bold' }, '\uD83D\uDD0A Read Aloud')
              ),

              // Stakeholders
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDC65 Stakeholders'),
                h('div', { className: 'space-y-1.5' },
                  cs.stakeholders.map(function(s, i) {
                    return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100' },
                      h('span', { className: 'text-teal-500 mt-0.5 shrink-0 font-bold' }, (i + 1) + '.'),
                      h('span', null, s)
                    );
                  })
                )
              ),

              // Competing values
              h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
                h('h4', { className: 'text-sm font-bold text-amber-700 mb-2' }, '\u26A1 Competing Values'),
                h('div', { className: 'space-y-1.5' },
                  cs.competingValues.map(function(v, i) {
                    return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-amber-800' },
                      h('span', { className: 'text-amber-500 mt-0.5 shrink-0' }, '\u27F7'),
                      h('span', null, v)
                    );
                  })
                )
              ),

              // Discussion questions
              h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4' },
                h('h4', { className: 'text-sm font-bold text-indigo-700 mb-2' }, '\u2753 Discussion Questions'),
                h('div', { className: 'space-y-2' },
                  cs.questions.map(function(q, i) {
                    return h('p', { key: i, className: 'text-xs text-indigo-800' }, (i + 1) + '. ' + q);
                  })
                )
              ),

              // Student reflection
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
                h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\u270D\uFE0F Your Analysis: What do you think is the right thing to do here, and why?'),
                h('textarea', { value: d.caseStudyReflection || '', onChange: function(e) { upd('caseStudyReflection', e.target.value); },
                  placeholder: 'I think the ethical choice is... because...',
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-teal-300',
                  'aria-label': 'Case study reflection'
                })
              ),

              // Socratic dialogue for case study
              h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 space-y-3' },
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCAC Socratic Dialogue'),

                csSocratic.length > 0 && h('div', { className: 'space-y-2 max-h-[300px] overflow-y-auto' },
                  csSocratic.map(function(msg, i) {
                    return h('div', { key: i, className: 'flex ' + (msg.role === 'student' ? 'justify-end' : 'justify-start') },
                      h('div', { className: 'max-w-[80%] rounded-2xl px-4 py-3 ' + (msg.role === 'student' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200') },
                        h('div', { className: 'text-[10px] font-bold mb-1 ' + (msg.role === 'student' ? 'text-teal-200' : 'text-slate-300') }, msg.role === 'student' ? 'You' : '\uD83C\uDFDB\uFE0F Socrates'),
                        h('p', { className: 'text-sm leading-relaxed' }, msg.text)
                      )
                    );
                  })
                ),

                csSocratic.length === 0 && h('p', { className: 'text-xs text-slate-600 italic text-center' }, 'Share your thinking to begin a Socratic dialogue about this case.'),

                // Socratic input
                h('div', { className: 'flex gap-2' },
                  h('input', { type: 'text', value: d.caseStudySocraticInput || '', onChange: function(e) { upd('caseStudySocraticInput', e.target.value); },
                    onKeyDown: function(e) {
                      if (e.key === 'Enter' && d.caseStudySocraticInput && d.caseStudySocraticInput.trim() && callGemini) {
                        var userInput = d.caseStudySocraticInput;
                        upd('aiLoading', true);
                        var histCtx = csSocratic.length > 0 ? 'Previous dialogue:\n' + csSocratic.slice(-6).map(function(m) { return m.role + ': ' + m.text; }).join('\n') : '';
                        var prompt = 'You are a Socratic philosophy teacher helping a ' + (gradeLevel || '5th grade') + ' student analyze an ethical case study.\n' +
                          'Case: "' + cs.title + '": ' + cs.background + '\n' +
                          'Socratic seed question for this case: ' + cs.socraticSeed + '\n' +
                          histCtx + '\nStudent says: "' + userInput + '"\n\n' +
                          'Respond with ONE thought-provoking follow-up question. Do NOT give answers. Be warm, challenging, 2-3 sentences max.';
                        callGemini(prompt).then(function(resp) {
                          var newHist = csSocratic.concat([{ role: 'student', text: userInput }, { role: 'socrates', text: resp }]);
                          updMulti({ caseStudySocratic: newHist, aiLoading: false, caseStudySocraticInput: '' });
                          ctx.awardXP(5);
                        }).catch(function() { upd('aiLoading', false); });
                      }
                    },
                    placeholder: 'Share your reasoning...', disabled: aiLoading,
                    className: 'flex-1 text-sm p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-40',
                    'aria-label': 'Socratic dialogue input for case study'
                  }),
                  h('button', { 'aria-label': 'Send Socratic response', disabled: aiLoading || !(d.caseStudySocraticInput && d.caseStudySocraticInput.trim()), onClick: function() {
                    if (d.caseStudySocraticInput && d.caseStudySocraticInput.trim() && callGemini) {
                      var userInput = d.caseStudySocraticInput;
                      upd('aiLoading', true);
                      var histCtx = csSocratic.length > 0 ? 'Previous dialogue:\n' + csSocratic.slice(-6).map(function(m) { return m.role + ': ' + m.text; }).join('\n') : '';
                      var prompt = 'You are a Socratic philosophy teacher helping a ' + (gradeLevel || '5th grade') + ' student analyze an ethical case study.\n' +
                        'Case: "' + cs.title + '": ' + cs.background + '\n' +
                        'Socratic seed question for this case: ' + cs.socraticSeed + '\n' +
                        histCtx + '\nStudent says: "' + userInput + '"\n\n' +
                        'Respond with ONE thought-provoking follow-up question. Do NOT give answers. Be warm, challenging, 2-3 sentences max.';
                      callGemini(prompt).then(function(resp) {
                        var newHist = csSocratic.concat([{ role: 'student', text: userInput }, { role: 'socrates', text: resp }]);
                        updMulti({ caseStudySocratic: newHist, aiLoading: false, caseStudySocraticInput: '' });
                        ctx.awardXP(5);
                      }).catch(function() { upd('aiLoading', false); });
                    }
                  },
                    className: 'px-4 py-3 bg-teal-700 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-40'
                  }, aiLoading ? '...' : '\u2192')
                )
              ),

              // Mark complete & get AI insight
              callGemini && d.caseStudyReflection && d.caseStudyReflection.length > 20 && !d.caseStudyAIResp && h('button', { 'aria-label': 'Mark complete & get AI insight', onClick: function() {
                upd('aiLoading', true);
                var prompt = 'A ' + (gradeLevel || '5th grade') + ' student just analyzed an ethical case study.\n' +
                  'Case: "' + cs.title + '": ' + cs.background + '\n' +
                  'Competing values: ' + cs.competingValues.join('; ') + '\n' +
                  'Student\u2019s analysis: "' + d.caseStudyReflection + '"\n\n' +
                  'Provide a brief (3-4 sentence), warm, insightful response that:\n' +
                  '1. Validates their reasoning\n2. Identifies which ethical framework(s) their thinking aligns with\n' +
                  '3. Offers one perspective they might not have considered\n4. Ends with an encouraging thought about their ethical growth.\nBe age-appropriate and non-judgmental.';
                callGemini(prompt).then(function(resp) {
                  var completed = (d.caseStudiesCompleted || []).slice();
                  if (completed.indexOf(cs.id) === -1) completed.push(cs.id);
                  updMulti({ caseStudyAIResp: resp, aiLoading: false, caseStudiesCompleted: completed });
                  ctx.awardXP(10);
                  if (completed.length >= 3) { addToast('\uD83D\uDCD6 Case Study Scholar badge earned!'); }
                }).catch(function() { upd('aiLoading', false); });
              }, disabled: aiLoading,
                className: 'w-full px-4 py-3 bg-teal-700 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
              }, h(Sparkles, { size: 14 }), aiLoading ? 'Analyzing...' : '\uD83D\uDCD6 Get AI Insight on My Analysis'),

              // AI insight response
              d.caseStudyAIResp && h('div', {  className: 'bg-teal-50 border border-teal-200 rounded-2xl p-5' },
                h('div', {  className: 'flex items-center gap-2 mb-2' },
                  h(Sparkles, { size: 14, className: 'text-teal-500' }),
                  h('h4', { className: 'text-sm font-bold text-teal-700' }, 'AI Ethical Insight')
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.caseStudyAIResp)
              ),

              // Try another
              h('button', { 'aria-label': 'Back to case studies', onClick: function() { updMulti({ caseStudyId: null, caseStudyReflection: '', caseStudyAIResp: null, caseStudySocratic: [], caseStudySocraticInput: '' }); },
                className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
              }, '\u2190 Try Another Case Study')
            );
          })()
        ),

        // ═══ VALUES CLARIFICATION TAB ═══
        tab === 'values' && h('div', {  className: 'space-y-4' },
          h('div', {  className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDC8E Values Clarification'),
            h('p', { className: 'text-sm text-slate-600' }, 'What matters most to you? Rank your top values and reflect on why.')
          ),

          // Intro or active exercise
          !d.valuesStarted && h('div', {  className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl border-2 border-rose-200 p-5 text-center' },
            h('span', {  className: 'text-4xl block mb-3' }, '\uD83D\uDC8E'),
            h('h4', { className: 'text-base font-bold text-rose-800 mb-2' }, 'What Do You Value Most?'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed mb-3' }, 'There are no wrong answers here. Your values are yours \u2014 they shape how you see the world and make decisions. Tap or click on values to select your top 5, then rank them from most to least important to you.'),
            h('button', { 'aria-label': 'Begin values exploration', onClick: function() { updMulti({ valuesStarted: true, valuesSelected: [], valuesRanked: [], valuesReflection: '', valuesComplete: false, valuesAIResp: null }); },
              className: 'px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors'
            }, 'Start Values Exercise')
          ),

          // Step 1: Select top 5
          d.valuesStarted && !d.valuesComplete && !(d.valuesRanked && d.valuesRanked.length === 5) && (function() {
            var selected = d.valuesSelected || [];
            return h('div', {  className: 'space-y-4' },
              h('div', {  className: 'bg-rose-50 border border-rose-200 rounded-xl p-3 text-center' },
                h('p', { className: 'text-sm font-bold text-rose-700' }, 'Step 1: Select Your Top 5 Values (' + selected.length + '/5)')
              ),
              h('div', {  className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
                VALUES_LIST.map(function(v) {
                  var isSelected = selected.indexOf(v.id) !== -1;
                  var canSelect = selected.length < 5 || isSelected;
                  return h('button', { 'aria-label': 'text-slate-700', key: v.id, onClick: function() {
                    var newSelected = selected.slice();
                    if (isSelected) {
                      newSelected = newSelected.filter(function(s) { return s !== v.id; });
                    } else if (canSelect) {
                      newSelected.push(v.id);
                    }
                    upd('valuesSelected', newSelected);
                  },
                    className: 'p-3 rounded-xl border-2 text-left transition-all ' +
                      (isSelected ? 'border-rose-400 bg-rose-50 shadow-md' : canSelect ? 'border-slate-200 bg-white hover:border-rose-300' : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed')
                  },
                    h('div', {  className: 'flex items-center gap-2' },
                      h('span', {  className: 'text-lg' }, v.emoji),
                      h('div', null,
                        h('div', {  className: 'font-bold text-xs ' + (isSelected ? 'text-rose-800' : 'text-slate-700') }, v.name),
                        h('div', {  className: 'text-[10px] text-slate-600 leading-tight' }, v.desc.substring(0, 50) + '...')
                      )
                    ),
                    isSelected && h('div', {  className: 'mt-1 text-[11px] text-rose-500 font-bold' }, '\u2713 Selected')
                  );
                })
              ),
              selected.length === 5 && h('button', { 'aria-label': 'div', onClick: function() {
                upd('valuesRanked', selected.slice());
              },
                className: 'w-full px-4 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors'
              }, 'Now Rank Them \u2192')
            );
          })(),

          // Step 2: Rank top 5 (simple tap-to-reorder)
          d.valuesStarted && !d.valuesComplete && d.valuesRanked && d.valuesRanked.length === 5 && (function() {
            var ranked = d.valuesRanked;
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-rose-50 border border-rose-200 rounded-xl p-3 text-center' },
                h('p', { className: 'text-sm font-bold text-rose-700' }, 'Step 2: Rank Your Top 5 (tap arrows to reorder)')
              ),
              h('div', {  className: 'space-y-2' },
                ranked.map(function(vid, idx) {
                  var v = VALUES_LIST.find(function(val) { return val.id === vid; });
                  if (!v) return null;
                  return h('div', {  key: vid, className: 'flex items-center gap-3 p-3 rounded-xl border-2 border-rose-200 bg-white' },
                    h('span', {  className: 'text-lg font-black text-rose-600 w-6 text-center shrink-0' }, '#' + (idx + 1)),
                    h('span', {  className: 'text-xl' }, v.emoji),
                    h('div', {  className: 'flex-1' },
                      h('div', {  className: 'font-bold text-sm text-slate-800' }, v.name),
                      h('div', {  className: 'text-[10px] text-slate-600' }, v.desc)
                    ),
                    h('div', {  className: 'flex flex-col gap-1 shrink-0' },
                      idx > 0 && h('button', { 'aria-label': 'Move up', onClick: function() {
                        var newRanked = ranked.slice();
                        var tmp = newRanked[idx - 1];
                        newRanked[idx - 1] = newRanked[idx];
                        newRanked[idx] = tmp;
                        upd('valuesRanked', newRanked);
                      }, className: 'text-xs text-slate-600 hover:text-rose-600 font-bold px-2 py-0.5 rounded hover:bg-rose-50' }, '\u25B2'),
                      idx < ranked.length - 1 && h('button', { 'aria-label': 'Move down', onClick: function() {
                        var newRanked = ranked.slice();
                        var tmp = newRanked[idx + 1];
                        newRanked[idx + 1] = newRanked[idx];
                        newRanked[idx] = tmp;
                        upd('valuesRanked', newRanked);
                      }, className: 'text-xs text-slate-600 hover:text-rose-600 font-bold px-2 py-0.5 rounded hover:bg-rose-50' }, '\u25BC')
                    )
                  );
                })
              ),

              // Reflection
              h('div', {  className: 'bg-white rounded-xl border border-slate-200 p-4' },
                h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\u270D\uFE0F Why did you rank "' + (function() { var v = VALUES_LIST.find(function(val) { return val.id === ranked[0]; }); return v ? v.name : ''; })() + '" highest?'),
                h('textarea', { value: d.valuesReflection || '', onChange: function(e) { upd('valuesReflection', e.target.value); },
                  placeholder: 'I ranked this highest because...',
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-rose-300',
                  'aria-label': 'Values reflection'
                })
              ),

              // Complete button
              callGemini && d.valuesReflection && d.valuesReflection.length > 10 && h('button', { 'aria-label': 'Complete button', onClick: function() {
                upd('aiLoading', true);
                var rankedNames = ranked.map(function(vid) { var v = VALUES_LIST.find(function(val) { return val.id === vid; }); return v ? v.name : vid; });
                var prompt = 'A ' + (gradeLevel || '5th grade') + ' student completed a values clarification exercise.\n' +
                  'Their top 5 values, in order: ' + rankedNames.join(', ') + '\n' +
                  'Why they ranked #1 highest: "' + d.valuesReflection + '"\n\n' +
                  'Provide a warm, insightful analysis (3-4 sentences) that:\n' +
                  '1. Identifies the PATTERN in their values (are they more people-oriented, principle-oriented, self-growth oriented, community-oriented?)\n' +
                  '2. Notes how their top value might guide them in ethical dilemmas\n' +
                  '3. Gently mentions one value NOT in their top 5 that could complement their choices\n' +
                  '4. Affirms that their values are valid and will serve them well.\nBe warm, non-judgmental, and age-appropriate.';
                callGemini(prompt).then(function(resp) {
                  updMulti({ valuesAIResp: resp, valuesComplete: true, aiLoading: false });
                  ctx.awardXP(10);
                  addToast('\uD83D\uDC8E Values Explorer badge earned!');
                }).catch(function() { upd('aiLoading', false); });
              }, disabled: aiLoading,
                className: 'w-full px-4 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
              }, h(Sparkles, { size: 14 }), aiLoading ? 'Analyzing...' : '\uD83D\uDC8E See My Values Insight')
            );
          })(),

          // Values complete — show results
          d.valuesComplete && h('div', { className: 'space-y-4' },
            // Ranked values display
            h('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl border-2 border-rose-200 p-5' },
              h('h4', { className: 'text-base font-bold text-rose-800 mb-3' }, '\uD83D\uDC8E Your Values Profile'),
              h('div', { className: 'space-y-2' },
                (d.valuesRanked || []).map(function(vid, idx) {
                  var v = VALUES_LIST.find(function(val) { return val.id === vid; });
                  if (!v) return null;
                  return h('div', { key: vid, className: 'flex items-center gap-3 bg-white rounded-lg p-3 border border-rose-100' },
                    h('span', { className: 'text-lg font-black text-rose-600 w-6 text-center' }, '#' + (idx + 1)),
                    h('span', { className: 'text-lg' }, v.emoji),
                    h('span', { className: 'font-bold text-sm text-slate-800' }, v.name)
                  );
                })
              )
            ),

            // AI insight
            d.valuesAIResp && h('div', {  className: 'bg-rose-50 border border-rose-200 rounded-2xl p-5' },
              h('div', {  className: 'flex items-center gap-2 mb-2' },
                h(Sparkles, { size: 14, className: 'text-rose-500' }),
                h('h4', { className: 'text-sm font-bold text-rose-700' }, 'AI Values Insight')
              ),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.valuesAIResp)
            ),

            h('button', { 'aria-label': 'Retake values exploration', onClick: function() { updMulti({ valuesStarted: false, valuesComplete: false, valuesSelected: [], valuesRanked: [], valuesReflection: '', valuesAIResp: null }); },
              className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
            }, '\uD83D\uDD04 Retake Values Exercise')
          )
        ),

        // ═══ DECISION TREE BUILDER TAB ═══
        tab === 'decisiontree' && h('div', {  className: 'space-y-4' },
          h('div', {  className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDF32 Ethical Decision Tree Builder'),
            h('p', { className: 'text-sm text-slate-600' }, 'Walk through ethical reasoning step by step and build your decision tree.')
          ),

          !d.dtStarted && h('div', {  className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-5 text-center' },
            h('span', {  className: 'text-4xl block mb-3' }, '\uD83C\uDF32'),
            h('h4', { className: 'text-base font-bold text-green-800 mb-2' }, 'Build Your Ethical Decision Tree'),
            h('p', { className: 'text-sm text-slate-600 leading-relaxed mb-3' }, 'Think through an ethical question step by step. At each step, you\u2019ll go deeper into the reasoning. At the end, you\u2019ll have a clear summary of your thinking process.'),
            h('button', { 'aria-label': ', dtDecision:', onClick: function() { updMulti({ dtStarted: true, dtStep: 0, dtQuestion: '', dtAffected: '', dtActions: '', dtFrameworks: '', dtDecision: '', decisionTreeComplete: false, dtSummary: null }); },
              className: 'px-6 py-3 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors'
            }, 'Start Building')
          ),

          d.dtStarted && !d.decisionTreeComplete && (function() {
            var step = d.dtStep || 0;
            var steps = [
              { label: 'Step 1: What is the ethical question?', field: 'dtQuestion', placeholder: 'e.g., "Should I tell the teacher that my friend cheated?" or "Is it okay to use AI for homework?"', prompt: 'Describe the ethical question or dilemma you\u2019re facing.' },
              { label: 'Step 2: Who is affected?', field: 'dtAffected', placeholder: 'e.g., "Me, my friend, the teacher, other students, my friend\u2019s parents..."', prompt: 'List all the people (stakeholders) who would be affected by your decision.' },
              { label: 'Step 3: What are the possible actions?', field: 'dtActions', placeholder: 'e.g., "Option A: Tell the teacher. Option B: Talk to my friend first. Option C: Stay quiet."', prompt: 'List at least 2-3 possible actions you could take.' },
              { label: 'Step 4: Apply ethical frameworks', field: 'dtFrameworks', placeholder: 'e.g., "Golden Rule: How would I want to be treated? Utilitarianism: What creates the most good? Duty ethics: What\u2019s the right principle?"', prompt: 'Think about what different ethical frameworks would say about each option. Use frameworks you\u2019ve learned.' },
              { label: 'Step 5: What would you decide and why?', field: 'dtDecision', placeholder: 'e.g., "I would choose Option B because... The framework that resonates most with me is... because..."', prompt: 'State your decision and explain your reasoning clearly.' }
            ];
            var currentStep = steps[step];
            if (!currentStep) return null;

            return h('div', { className: 'space-y-4' },
              // Progress
              h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                h('div', { className: 'bg-green-500 h-full transition-all duration-300', style: { width: Math.round(((step + 1) / steps.length) * 100) + '%' } })
              ),
              h('p', { className: 'text-[10px] text-slate-600 text-center' }, 'Step ' + (step + 1) + ' of ' + steps.length),

              // Previous steps summary (show completed steps)
              step > 0 && h('div', { className: 'space-y-2' },
                steps.slice(0, step).map(function(s, i) {
                  return h('div', { key: i, className: 'bg-green-50 border border-green-200 rounded-lg p-3' },
                    h('p', { className: 'text-[10px] font-bold text-green-700' }, s.label),
                    h('p', { className: 'text-xs text-slate-600 mt-1' }, d[s.field] || '(not answered)')
                  );
                })
              ),

              // Current step
              h('div', { className: 'bg-white rounded-2xl border-2 border-green-200 p-5' },
                h('h4', { className: 'text-sm font-bold text-green-800 mb-2' }, currentStep.label),
                h('p', { className: 'text-xs text-slate-600 mb-3' }, currentStep.prompt),
                h('textarea', { value: d[currentStep.field] || '', onChange: function(e) { upd(currentStep.field, e.target.value); },
                  placeholder: currentStep.placeholder,
                  className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-green-300',
                  'aria-label': currentStep.label
                }),

                // Framework helper on step 4
                step === 3 && h('div', {  className: 'mt-3 bg-green-50 rounded-lg p-3 border border-green-200' },
                  h('p', { className: 'text-[10px] font-bold text-green-700 mb-1' }, '\uD83C\uDFDB\uFE0F Frameworks you\u2019ve learned:'),
                  h('div', {  className: 'flex flex-wrap gap-1' },
                    (FRAMEWORKS_BY_BAND[gradeBand] || FRAMEWORKS_BY_BAND.elementary).map(function(fw) {
                      return h('span', {  key: fw.id, className: 'px-2 py-0.5 bg-white border border-green-200 rounded text-[11px] text-green-700 font-medium' }, fw.emoji + ' ' + fw.name);
                    })
                  )
                )
              ),

              // Navigation
              h('div', {  className: 'flex gap-2' },
                step > 0 && h('button', { 'aria-label': 'dtStep', onClick: function() { upd('dtStep', step - 1); },
                  className: 'px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200'
                }, '\u2190 Previous'),
                h('div', {  className: 'flex-1' }),
                step < steps.length - 1 && h('button', { 'aria-label': ') +', onClick: function() {
                  if (d[currentStep.field] && d[currentStep.field].length > 5) {
                    upd('dtStep', step + 1);
                    ctx.awardXP(3);
                  } else {
                    addToast('Please write a response before moving to the next step.');
                  }
                },
                  className: 'px-4 py-2 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors'
                }, 'Next \u2192'),
                step === steps.length - 1 && d[currentStep.field] && d[currentStep.field].length > 10 && h('button', { 'aria-label': 'div', onClick: function() {
                  // Generate summary
                  var summaryText = '\u2550\u2550\u2550 ETHICAL DECISION TREE SUMMARY \u2550\u2550\u2550\n\n' +
                    '\u2753 ETHICAL QUESTION:\n' + (d.dtQuestion || '') + '\n\n' +
                    '\uD83D\uDC65 WHO IS AFFECTED:\n' + (d.dtAffected || '') + '\n\n' +
                    '\uD83D\uDD00 POSSIBLE ACTIONS:\n' + (d.dtActions || '') + '\n\n' +
                    '\uD83C\uDFDB\uFE0F FRAMEWORK ANALYSIS:\n' + (d.dtFrameworks || '') + '\n\n' +
                    '\u2705 MY DECISION:\n' + (d.dtDecision || '') + '\n';
                  updMulti({ decisionTreeComplete: true, dtSummary: summaryText });
                  ctx.awardXP(15);
                  addToast('\uD83C\uDF32 Decision Tree Builder badge earned!');
                },
                  className: 'px-6 py-2 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2'
                }, '\u2705 Complete Decision Tree')
              )
            );
          })(),

          // Decision tree complete
          d.decisionTreeComplete && h('div', {  className: 'space-y-4' },
            h('div', {  className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-5' },
              h('div', {  className: 'flex items-center gap-2 mb-3' },
                h('span', {  className: 'text-3xl' }, '\uD83C\uDF32'),
                h('h4', { className: 'text-base font-bold text-green-800' }, 'Your Ethical Decision Tree')
              ),
              h('pre', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-white rounded-xl p-4 border border-green-200' }, d.dtSummary)
            ),

            // Copy/export button
            h('button', { 'aria-label': 'Copy/export button', onClick: function() {
              if (navigator.clipboard && d.dtSummary) {
                navigator.clipboard.writeText(d.dtSummary).then(function() {
                  addToast('\u2705 Decision tree copied to clipboard!');
                }).catch(function() {
                  addToast('Could not copy. Try selecting and copying the text manually.');
                });
              }
            },
              className: 'w-full px-4 py-2 bg-green-100 border border-green-200 rounded-lg text-xs font-bold text-green-700 hover:bg-green-200 transition-colors'
            }, '\uD83D\uDCCB Copy to Clipboard'),

            h('button', { 'aria-label': ', dtDecision:', onClick: function() { updMulti({ dtStarted: false, decisionTreeComplete: false, dtStep: 0, dtQuestion: '', dtAffected: '', dtActions: '', dtFrameworks: '', dtDecision: '', dtSummary: null }); },
              className: 'w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors'
            }, '\uD83C\uDF32 Build Another Decision Tree')
          )
        ),

        // ═══ PHILOSOPHY CORNER TAB ═══
        tab === 'philosophy' && h('div', {  className: 'space-y-4' },
          h('div', {  className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83E\uDDD0 Philosophy Corner'),
            h('p', { className: 'text-sm text-slate-600' }, 'Meet the thinkers who shaped how we reason about right and wrong.')
          ),

          // Grade band selector
          h('div', {  className: 'flex justify-center gap-2 mb-3' },
            ['elementary', 'middle', 'high'].map(function(band) {
              return h('button', { 'aria-label': 'philBand', key: band, onClick: function() { upd('philBand', band); },
                className: 'px-3 py-1 rounded-full text-[10px] font-bold transition-all ' +
                  ((d.philBand || gradeBand) === band ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }, band === 'elementary' ? '\uD83C\uDF1F Elementary' : band === 'middle' ? '\uD83D\uDE80 Middle' : '\uD83C\uDF93 High');
            })
          ),

          // Philosopher cards
          (PHILOSOPHERS[d.philBand || gradeBand] || PHILOSOPHERS.elementary).map(function(phil) {
            var isExpanded = d.philExpanded === phil.id;
            var explored = (d.philosophersExplored || []).slice();
            return h('div', {  key: phil.id,
              className: 'rounded-2xl border-2 overflow-hidden transition-all ' + (isExpanded ? 'border-purple-400 bg-purple-50 shadow-md' : 'border-slate-200 bg-white hover:border-purple-300')
            },
              h('button', { 'aria-label': 'px-4 pb-4 space-y-3', onClick: function() {
                if (!isExpanded) {
                  if (explored.indexOf(phil.id) === -1) explored.push(phil.id);
                  updMulti({ philExpanded: phil.id, philosophersExplored: explored });
                  ctx.awardXP(3);
                  if (explored.length >= 4) { addToast('\uD83E\uDDD0 Philosophy Fan badge earned!'); }
                } else {
                  upd('philExpanded', null);
                }
              }, className: 'w-full p-4 text-left' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, phil.emoji),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'font-bold text-sm text-slate-800' }, phil.name),
                    h('div', { className: 'text-[10px] text-slate-600 font-medium' }, phil.years + ' \u2014 ' + phil.tagline)
                  ),
                  (d.philosophersExplored || []).indexOf(phil.id) !== -1 && h('span', { className: 'text-[11px] text-purple-500 font-bold' }, '\u2713 Explored')
                )
              ),
              isExpanded && h('div', { className: 'px-4 pb-4 space-y-3' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, phil.bio),

                h('div', { className: 'bg-white rounded-xl p-3 border border-purple-200' },
                  h('p', { className: 'text-[10px] font-bold text-purple-700 mb-1' }, '\uD83D\uDCA1 Key Idea:'),
                  h('p', { className: 'text-xs text-slate-600' }, phil.keyIdea)
                ),

                h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
                  h('p', { className: 'text-[10px] font-bold text-amber-700 mb-1' }, '\uD83D\uDDE3\uFE0F Famous Quote:'),
                  h('p', { className: 'text-xs text-amber-800 italic' }, '"' + phil.famousQuote + '"')
                ),

                h('div', {  className: 'bg-green-50 rounded-xl p-3 border border-green-200' },
                  h('p', { className: 'text-[10px] font-bold text-green-700 mb-1' }, '\uD83E\uDDEA Try It Yourself:'),
                  h('p', { className: 'text-xs text-green-800' }, phil.tryIt)
                ),

                // Reflection area
                h('textarea', { value: d['philReflect_' + phil.id] || '', onChange: function(e) { upd('philReflect_' + phil.id, e.target.value); },
                  placeholder: 'What do you think about ' + phil.name + '\u2019s ideas? Do you agree or disagree?',
                  className: 'w-full text-xs p-2 border border-slate-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-purple-300',
                  'aria-label': 'Reflection on ' + phil.name
                }),

                // TTS
                callTTS && h('button', { 'aria-label': 'Read Bio Aloud', onClick: function() { callTTS(phil.bio); }, className: 'text-[10px] text-purple-500 hover:text-purple-700 font-bold' }, '\uD83D\uDD0A Read Bio Aloud')
              )
            );
          })
        ),

        // ═══ BADGES TAB ═══
        tab === 'badges' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFC5 Badges & Achievements'),
            h('p', { className: 'text-sm text-slate-600' }, 'Earn badges by exploring ethical reasoning deeply.')
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
                    h('p', { className: 'font-bold text-sm ' + (earned ? 'text-amber-800' : 'text-slate-300') }, badge.name),
                    h('p', { className: 'text-[10px] ' + (earned ? 'text-amber-600' : 'text-slate-300') }, badge.desc),
                    earned && h('p', { className: 'text-[11px] text-amber-500 font-bold mt-1' }, '\u2713 Earned!')
                  )
                )
              );
            })
          ),

          // Stats summary
          h('div', { className: 'bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200 p-4 mt-2' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCCA Your Progress'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3 text-center' },
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, (d.dilemmasCompleted || []).length),
                h('p', { className: 'text-[10px] text-slate-600' }, 'Scenarios Completed')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, (d.frameworksStudied || []).length),
                h('p', { className: 'text-[10px] text-slate-600' }, 'Frameworks Studied')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, d.debatesCompleted || 0),
                h('p', { className: 'text-[10px] text-slate-600' }, 'Debates Completed')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, Math.floor((d.dialogue || []).length / 2)),
                h('p', { className: 'text-[10px] text-slate-600' }, 'Socratic Exchanges')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, (d.caseStudiesCompleted || []).length),
                h('p', { className: 'text-[10px] text-slate-600' }, 'Case Studies')
              ),
              h('div', { className: 'bg-white rounded-lg p-3 border border-slate-200' },
                h('p', { className: 'text-xl font-black text-indigo-600' }, (d.philosophersExplored || []).length),
                h('p', { className: 'text-[10px] text-slate-600' }, 'Philosophers Explored')
              )
            )
          )
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_ethicalreasoning.js loaded');
