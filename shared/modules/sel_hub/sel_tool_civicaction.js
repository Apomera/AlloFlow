// ═══════════════════════════════════════════
// sel_tool_civicaction.js — Civic Action & Hope Lab
// Grappling with injustice, anxiety about the future,
// building agency, civic engagement, and cultivating hope
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
    if (document.getElementById('allo-live-civicaction')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-civicaction'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Audio + WCAG (auto-injected) ──
  var _civicAC = null;
  function getCivicAC() { if (!_civicAC) { try { _civicAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_civicAC && _civicAC.state==="suspended") { try { _civicAC.resume(); } catch(e) {} } return _civicAC; }
  function civicTone(f,d,tp,v) { var ac=getCivicAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxCivicClick() { civicTone(600,0.03,"sine",0.04); }
  function sfxCivicSuccess() { civicTone(523,0.08,"sine",0.07); setTimeout(function(){civicTone(659,0.08,"sine",0.07);},70); setTimeout(function(){civicTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("civic-a11y")){var _s=document.createElement("style");_s.id="civic-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-400{color:#64748b!important}";document.head.appendChild(_s);}


  // ── Data ──

  var TABS = [
    { id: 'feelings', label: '\ud83d\udcad Name It', desc: 'Identify what you are feeling' },
    { id: 'understand', label: '\ud83d\udd0d Understand It', desc: 'Why does this matter to me?' },
    { id: 'cope', label: '\ud83c\udf3f Cope', desc: 'Healthy ways to hold hard feelings' },
    { id: 'explore', label: '\ud83c\udf0d Explore Issues', desc: 'Learn about civic issues' },
    { id: 'act', label: '\u270a Act', desc: 'Turn feelings into action' },
    { id: 'planner', label: '\ud83d\udcdd Plan', desc: 'Build a civic action plan' },
    { id: 'simulation', label: '\ud83c\udfdb\ufe0f Simulate', desc: 'Civic decision-making simulation' },
    { id: 'survey', label: '\ud83d\udcca Survey', desc: 'Build a community survey' },
    { id: 'rights', label: '\ud83d\udcdc Rights & Dissent', desc: 'Rights frameworks, history of peaceful dissent, and reflection' },
    { id: 'service', label: '\ud83e\udd1d Service', desc: 'Plan a service learning project' },
    { id: 'quiz', label: '\ud83c\udfc6 Quiz', desc: 'Test your civic knowledge' },
    { id: 'scenarios', label: '\ud83c\udfad Scenarios', desc: 'Community change scenarios' },
    { id: 'hope', label: '\ud83c\udf05 Hope', desc: 'Cultivate hope and vision' },
  ];

  var FEELINGS_MAP = [
    { id: 'anxious', label: 'Anxious about the future', emoji: '\ud83d\ude30', color: '#f59e0b',
      validation: 'It makes sense to feel anxious when the future feels uncertain. This feeling means you care about what happens next \u2014 and that caring is actually a strength.',
      reframe: 'Anxiety is your mind\'s way of trying to protect you. You can acknowledge the fear without letting it control your choices.' },
    { id: 'angry', label: 'Angry about injustice', emoji: '\ud83d\ude24', color: '#ef4444',
      validation: 'Anger at injustice is a healthy response. Throughout history, people who felt this anger chose to channel it into creating change. Your anger means your moral compass is working.',
      reframe: 'Anger can be fuel \u2014 but only if you choose where to direct it. Unfocused anger burns you. Focused anger lights the way.' },
    { id: 'sad', label: 'Sad about the state of things', emoji: '\ud83d\ude22', color: '#3b82f6',
      validation: 'Sadness about the world shows that you have empathy and compassion. It is OK to grieve for things that are broken, even if you did not break them.',
      reframe: 'Sadness and hope can exist at the same time. You can hold grief for what is while working toward what could be.' },
    { id: 'helpless', label: 'Helpless or powerless', emoji: '\ud83d\ude1e', color: '#94a3b8',
      validation: 'Feeling powerless is one of the hardest human experiences. But history shows us that almost every major change started with people who felt exactly like you do right now \u2014 and chose to act anyway.',
      reframe: 'You may not be able to change everything, but you can change something. Small actions ripple outward in ways you may never see.' },
    { id: 'overwhelmed', label: 'Overwhelmed by too much', emoji: '\ud83e\udd2f', color: '#8b5cf6',
      validation: 'The world throws a lot at you \u2014 social media, news, school, relationships. Feeling overwhelmed is not a sign of weakness. It means you are paying attention.',
      reframe: 'You do not have to carry everything at once. Choose one thing. Focus there. The rest will wait.' },
    { id: 'numb', label: 'Numb or disconnected', emoji: '\ud83d\ude36', color: '#94a3b8',
      validation: 'Numbness is often your mind protecting itself from too much pain. It is not apathy \u2014 it is a survival response. The fact that you are here, exploring this, means you have not given up.',
      reframe: 'Reconnecting starts small. One conversation. One walk outside. One moment of noticing something beautiful.' },
    { id: 'hopeful', label: 'Hopeful despite everything', emoji: '\ud83c\udf1f', color: '#22c55e',
      validation: 'Hope in difficult times is radical. It is not naive or ignorant \u2014 it is a deliberate choice to believe that things can be better, and to work toward making them so.',
      reframe: 'Hope is not the absence of struggle. It is the decision to keep going because of what is possible.' },
  ];

  var COPING_STRATEGIES = [
    { id: 'ground', label: '\ud83c\udf33 Ground Yourself', category: 'body', steps: ['Name 5 things you can see right now.', 'Name 4 things you can touch.', 'Name 3 things you can hear.', 'Name 2 things you can smell.', 'Name 1 thing you can taste.', 'Take 3 slow breaths. You are here. You are safe.'] },
    { id: 'boundaries', label: '\ud83d\udcf5 Set Info Boundaries', category: 'mind', steps: ['Choose specific times to check the news (not all day).', 'Mute or unfollow accounts that increase your anxiety without adding value.', 'Before reading/watching, ask: "Do I have the capacity for this right now?"', 'It is OK to say "I can\'t take this in right now" \u2014 that is self-care, not ignorance.'] },
    { id: 'community', label: '\ud83e\udd1d Find Your People', category: 'connection', steps: ['Talk to someone you trust about how you are feeling.', 'Find a group \u2014 online or in person \u2014 that shares your values.', 'Volunteer for a cause you care about. Action reduces helplessness.', 'Remember: you are not alone in these feelings. Millions of people share them.'] },
    { id: 'create', label: '\ud83c\udfa8 Create Something', category: 'expression', steps: ['Write a poem, letter, or journal entry about what you are feeling.', 'Draw, paint, or make music that expresses your emotions.', 'Create something that imagines the world you want to live in.', 'Share your creation with someone, or keep it private \u2014 both are valid.'] },
    { id: 'move', label: '\ud83c\udfc3 Move Your Body', category: 'body', steps: ['Walk, run, dance, stretch \u2014 whatever feels right.', 'Notice the physical sensations of the emotion and let movement release them.', 'Even 5 minutes of movement can shift your nervous system out of fight-or-flight.', 'You cannot think your way out of anxiety. Sometimes you have to move your way out.'] },
    { id: 'perspective', label: '\ud83d\udcd6 Seek Perspective', category: 'mind', steps: ['Read about people who faced impossible odds and created change anyway.', 'Talk to someone older about times in their life when things felt hopeless.', 'Study history \u2014 not the highlights, but the long slow work of ordinary people.', 'Remember that the people who changed the world did not know they would succeed when they started.'] },
  ];

  var CIVIC_ACTIONS = {
    elementary: [
      { action: 'Write a letter to your principal about something you want to change at school', impact: 'Local', difficulty: '\u2b50' },
      { action: 'Start a kindness campaign in your classroom', impact: 'School', difficulty: '\u2b50' },
      { action: 'Create a poster about an issue you care about and share it', impact: 'School', difficulty: '\u2b50' },
      { action: 'Organize a clean-up of your school yard or neighborhood park', impact: 'Community', difficulty: '\u2b50\u2b50' },
      { action: 'Interview a family member about a time they stood up for what was right', impact: 'Personal', difficulty: '\u2b50' },
      { action: 'Start a book collection drive for a local shelter or community center', impact: 'Community', difficulty: '\u2b50\u2b50' },
    ],
    middle: [
      { action: 'Research a local issue and present your findings to your class', impact: 'School', difficulty: '\u2b50\u2b50' },
      { action: 'Write a letter to your city council about an issue in your community', impact: 'City', difficulty: '\u2b50\u2b50' },
      { action: 'Start or join a student club focused on a cause you care about', impact: 'School', difficulty: '\u2b50\u2b50' },
      { action: 'Organize a fundraiser or awareness event for a cause', impact: 'Community', difficulty: '\u2b50\u2b50\u2b50' },
      { action: 'Create a social media campaign (with adult guidance) about an issue', impact: 'Digital', difficulty: '\u2b50\u2b50' },
      { action: 'Attend a public town hall meeting and observe how decisions are made', impact: 'City', difficulty: '\u2b50\u2b50' },
      { action: 'Mentor a younger student who is struggling', impact: 'Personal', difficulty: '\u2b50' },
    ],
    high: [
      { action: 'Register to vote (if 18) or pre-register and help others do the same', impact: 'State/National', difficulty: '\u2b50\u2b50' },
      { action: 'Testify at a school board or city council meeting on an issue that matters to you', impact: 'City', difficulty: '\u2b50\u2b50\u2b50' },
      { action: 'Organize a peaceful demonstration or walkout (with planning and purpose)', impact: 'Community', difficulty: '\u2b50\u2b50\u2b50' },
      { action: 'Write an op-ed for your school or local newspaper', impact: 'Community', difficulty: '\u2b50\u2b50\u2b50' },
      { action: 'Start a mutual aid project in your school or neighborhood', impact: 'Community', difficulty: '\u2b50\u2b50\u2b50' },
      { action: 'Contact your state representative about legislation you care about', impact: 'State', difficulty: '\u2b50\u2b50' },
      { action: 'Volunteer for a political campaign or nonprofit organization', impact: 'State/National', difficulty: '\u2b50\u2b50' },
      { action: 'Create a documentary, podcast, or zine about an issue in your community', impact: 'Digital', difficulty: '\u2b50\u2b50\u2b50' },
    ],
  };

  var HOPE_ANCHORS = [
    { person: 'Malala Yousafzai', story: 'Shot by the Taliban at 15 for advocating girls\' education. Became the youngest Nobel Peace Prize laureate. "One child, one teacher, one book, one pen can change the world."', theme: 'Education' },
    { person: 'John Lewis', story: 'Beaten on the Edmund Pettus Bridge at 25. Spent 33 years in Congress fighting for civil rights. "Get in good trouble, necessary trouble."', theme: 'Civil Rights' },
    { person: 'Greta Thunberg', story: 'Started a solo school strike at 15. Inspired millions worldwide. Showed that one person\'s refusal to accept the status quo can ignite a movement.', theme: 'Climate' },
    { person: 'Dolores Huerta', story: 'Co-founded the United Farm Workers at 32. Fought for decades for the rights of migrant farmworkers. "Every moment is an organizing opportunity."', theme: 'Labor Rights' },
    { person: 'Bryan Stevenson', story: 'Founded the Equal Justice Initiative. Has helped free over 140 wrongly condemned people from death row. "Each of us is more than the worst thing we have ever done."', theme: 'Justice' },
    { person: 'Wangari Maathai', story: 'Started the Green Belt Movement in Kenya \u2014 planted over 51 million trees. Won the Nobel Peace Prize. "It\'s the little things citizens do. That\'s what will make the difference."', theme: 'Environment' },
    { person: 'Marley Dias', story: 'At 11 years old, launched #1000BlackGirlBooks to collect books with Black girl protagonists. "I didn\'t wait for someone else to do it."', theme: 'Representation' },
  ];

  // ── NEW: Civic Issues Explorer ──

  var CIVIC_ISSUES = {
    elementary: [
      { id: 'school_safety', emoji: '\ud83c\udfe5', title: 'School Safety', desc: 'Making sure every student feels safe at school.', why: 'When you feel safe, you can learn better and be yourself. Every kid deserves to come to school without feeling scared.', act: 'Talk to a teacher about what makes you feel safe or unsafe. Draw a picture of what a safe school looks like.' },
      { id: 'playground_fair', emoji: '\ud83c\udfa2', title: 'Playground Fairness', desc: 'Making sure everyone gets a fair turn and is included.', why: 'Everyone deserves to play and have fun. When we include others, we make our school a happier place for all.', act: 'Invite someone new to play with you. If you see someone left out, ask them to join.' },
      { id: 'lunch_options', emoji: '\ud83c\udf5e', title: 'Lunch Options', desc: 'Healthy, tasty food choices for every student.', why: 'Good food helps your brain and body work well. Some kids do not have enough food at home, so school lunch really matters.', act: 'Write a letter to the cafeteria about a healthy food you would like to see. Thank the lunch workers for their hard work.' },
      { id: 'recycling', emoji: '\u267b\ufe0f', title: 'Recycling & Waste', desc: 'Reducing trash and taking care of our planet.', why: 'The Earth is our home. When we recycle and reduce waste, we help keep the planet healthy for everyone.', act: 'Start a recycling station in your classroom. Make posters about what can be recycled.' },
      { id: 'library_books', emoji: '\ud83d\udcda', title: 'Library Books', desc: 'Having enough books that represent all kids.', why: 'Books help us learn about the world and see ourselves in stories. Every kid should find books with characters that look like them.', act: 'Donate books you have finished reading. Ask your librarian for books about different cultures.' },
      { id: 'helping_neighbors', emoji: '\ud83c\udfe0', title: 'Helping Neighbors', desc: 'Being kind and helpful to people in your community.', why: 'Communities are stronger when people look out for each other. Even small acts of kindness make a big difference.', act: 'Make a card for an elderly neighbor. Help carry groceries. Wave and say hello to people on your street.' },
      { id: 'clean_water', emoji: '\ud83d\udca7', title: 'Clean Water', desc: 'Making sure everyone has safe water to drink.', why: 'Water is essential for life. Not everyone has clean water, even in our own country. This is something we can help change.', act: 'Learn where your water comes from. Do not waste water. Tell others why clean water matters.' },
      { id: 'animal_welfare', emoji: '\ud83d\udc3e', title: 'Animal Welfare', desc: 'Treating animals with kindness and respect.', why: 'Animals cannot speak up for themselves. It is our job to make sure they are treated well and their habitats are protected.', act: 'Volunteer at an animal shelter with your family. Learn about endangered animals in your area.' },
      { id: 'bus_safety', emoji: '\ud83d\ude8c', title: 'Bus Safety', desc: 'Safe and respectful behavior on the school bus.', why: 'Many kids ride the bus every day. When everyone follows the rules and is kind, the ride is safer and more fun for all.', act: 'Thank your bus driver. Follow bus safety rules. Stand up for someone being bullied on the bus.' },
      { id: 'school_garden', emoji: '\ud83c\udf31', title: 'School Garden', desc: 'Growing food and learning about nature at school.', why: 'Gardens teach us where food comes from and how to care for living things. They bring the school community together.', act: 'Ask your teacher about starting a class garden. Help water and care for plants at school.' },
    ],
    middle: [
      { id: 'social_media', emoji: '\ud83d\udcf1', title: 'Social Media Impact', desc: 'How social media affects mental health and relationships.', why: 'Social media shapes how we see ourselves and others. Understanding its effects helps us use it wisely and protect our well-being.', act: 'Track your screen time for a week. Lead a class discussion about digital wellness. Create guidelines for healthy social media use.' },
      { id: 'mental_health', emoji: '\ud83e\udde0', title: 'Mental Health Resources', desc: 'Access to counseling and support for students.', why: 'One in five young people experiences mental health challenges. Having support at school can make the difference between struggling alone and getting help.', act: 'Learn about mental health resources at your school. Organize a wellness week. Break the stigma by talking openly about mental health.' },
      { id: 'dress_codes', emoji: '\ud83d\udc55', title: 'School Dress Codes', desc: 'Fair policies about what students can wear.', why: 'Dress codes can unfairly target certain students based on gender, race, or body type. Fair policies respect everyone equally.', act: 'Research your school dress code. Survey students about their experiences. Propose changes to your student council if you find unfairness.' },
      { id: 'food_insecurity', emoji: '\ud83c\udf7d\ufe0f', title: 'Food Insecurity', desc: 'Ensuring no student goes hungry.', why: 'Millions of students do not know where their next meal will come from. Hunger makes it nearly impossible to learn.', act: 'Organize a food drive. Learn about free lunch programs. Volunteer at a local food bank.' },
      { id: 'climate_action', emoji: '\ud83c\udf0d', title: 'Climate Action', desc: 'Addressing climate change at the local level.', why: 'Young people will inherit the consequences of climate decisions made today. Your generation has the most at stake.', act: 'Calculate your school\'s carbon footprint. Start a sustainability club. Write to local officials about environmental policy.' },
      { id: 'homelessness', emoji: '\ud83c\udfd8\ufe0f', title: 'Homelessness', desc: 'Understanding and addressing homelessness in your community.', why: 'Homelessness affects families, veterans, and young people. Understanding the root causes helps us find real solutions.', act: 'Volunteer at a shelter. Collect supplies for a donation drive. Research what your community is doing to help.' },
      { id: 'disability_access', emoji: '\u267f', title: 'Disability Access', desc: 'Making sure all spaces are accessible to everyone.', why: 'People with disabilities deserve equal access to education, recreation, and public spaces. Accessibility benefits everyone.', act: 'Audit your school for accessibility barriers. Advocate for accommodations. Learn about universal design.' },
      { id: 'immigration', emoji: '\ud83c\udf0e', title: 'Immigration', desc: 'Understanding the experiences of immigrant communities.', why: 'Immigration is part of our shared human story. Understanding different experiences builds empathy and stronger communities.', act: 'Interview someone in your community who immigrated. Read stories from immigrant perspectives. Welcome newcomers to your school.' },
      { id: 'gun_safety', emoji: '\ud83d\udee1\ufe0f', title: 'Gun Safety', desc: 'Promoting safe practices and policies around firearms.', why: 'Gun violence affects communities across the country. Students have a powerful voice in demanding safer schools and neighborhoods.', act: 'Learn about gun safety programs in your area. Participate in awareness campaigns. Write to your representatives.' },
      { id: 'gender_equality', emoji: '\u2696\ufe0f', title: 'Gender Equality', desc: 'Equal treatment and opportunities regardless of gender.', why: 'Everyone deserves equal opportunities regardless of their gender. When we challenge stereotypes, we create a better world for all.', act: 'Challenge gender stereotypes when you see them. Support equal opportunities in sports, clubs, and classes.' },
    ],
    high: [
      { id: 'voting_rights', emoji: '\ud83d\uddf3\ufe0f', title: 'Voting Rights', desc: 'Protecting and expanding access to voting.', why: 'Voting is the foundation of democracy. When barriers prevent people from voting, the government does not truly represent the people.', act: 'Pre-register to vote. Help organize voter registration drives. Research voting laws in your state and advocate for fair access.' },
      { id: 'criminal_justice', emoji: '\u2696\ufe0f', title: 'Criminal Justice Reform', desc: 'Creating a more fair and equitable justice system.', why: 'The justice system disproportionately impacts communities of color and low-income people. Reform is essential for true equality.', act: 'Research incarceration rates and disparities. Attend court proceedings as an observer. Support organizations working for reform.' },
      { id: 'healthcare_access', emoji: '\ud83c\udfe5', title: 'Healthcare Access', desc: 'Ensuring everyone can get the medical care they need.', why: 'Health is a basic human need. Millions of people, including young people, lack access to affordable healthcare.', act: 'Research healthcare policies in your state. Volunteer at a free clinic. Advocate for expanded school health services.' },
      { id: 'housing_inequality', emoji: '\ud83c\udfe0', title: 'Housing Inequality', desc: 'Addressing the gap in affordable, safe housing.', why: 'Where you live affects your health, education, and opportunities. Housing should be a right, not a privilege.', act: 'Research housing policies in your area. Volunteer with Habitat for Humanity. Attend city council meetings about zoning.' },
      { id: 'environmental_justice', emoji: '\ud83c\udf3f', title: 'Environmental Justice', desc: 'Communities of color and low-income areas facing more pollution.', why: 'Environmental hazards disproportionately affect marginalized communities. Clean air and water should not depend on your zip code.', act: 'Research environmental conditions in different neighborhoods. Join environmental justice organizations. Testify at public hearings.' },
      { id: 'free_speech', emoji: '\ud83d\udce3', title: 'Free Speech', desc: 'Balancing expression rights with responsible discourse.', why: 'Free speech is essential to democracy, but it comes with responsibility. Understanding its limits and power is crucial for citizens.', act: 'Study First Amendment cases. Participate in civil debate. Write for your school newspaper about issues that matter.' },
      { id: 'privacy_rights', emoji: '\ud83d\udd12', title: 'Privacy Rights', desc: 'Protecting personal data and digital privacy.', why: 'In the digital age, your data is constantly collected. Understanding and protecting your privacy is a civic responsibility.', act: 'Audit your digital footprint. Advocate for stronger data protection. Educate others about online privacy.' },
      { id: 'labor_rights', emoji: '\ud83d\udcbc', title: 'Labor Rights', desc: 'Fair wages, safe conditions, and worker protections.', why: 'Workers built this country, but many still lack basic protections. Fair labor practices benefit everyone in the economy.', act: 'Learn about labor laws that affect young workers. Support fair trade products. Research the history of labor movements.' },
      { id: 'education_equity', emoji: '\ud83c\udf93', title: 'Education Equity', desc: 'Equal educational opportunities for all students.', why: 'Your zip code should not determine the quality of your education. Every student deserves excellent teachers, resources, and opportunities.', act: 'Research funding disparities between schools. Tutor students in under-resourced schools. Advocate for equitable funding.' },
      { id: 'police_reform', emoji: '\ud83d\udea8', title: 'Police Reform', desc: 'Building trust between law enforcement and communities.', why: 'Effective policing requires community trust. Reform efforts aim to create accountability, fairness, and safety for everyone.', act: 'Attend community-police dialogue events. Research reform models that have worked. Advocate for transparency and accountability.' },
    ]
  };

  // ── NEW: Civic Skills Quiz ──

  var CIVIC_QUIZ = {
    elementary: [
      { q: 'What is voting?', options: ['A game you play at recess', 'A way to choose leaders and make decisions', 'Something only adults do on the internet', 'A type of school test'], answer: 1, explain: 'Voting is how people in a democracy choose their leaders and make decisions about rules and laws. It gives everyone a voice!' },
      { q: 'What does a mayor do?', options: ['Teaches at a school', 'Leads and makes decisions for a city or town', 'Drives a fire truck', 'Works at a hospital'], answer: 1, explain: 'A mayor is the leader of a city or town. They help make decisions about things like parks, roads, schools, and keeping the community safe.' },
      { q: 'What are rights?', options: ['Things you have to buy at a store', 'Freedoms and protections every person has', 'Rules that only grown-ups follow', 'Answers on a test'], answer: 1, explain: 'Rights are freedoms and protections that every person has. For example, the right to go to school, the right to be safe, and the right to speak your mind.' },
      { q: 'What is a community?', options: ['A type of video game', 'A group of people who live, work, or play in the same area', 'A big building downtown', 'A school subject'], answer: 1, explain: 'A community is a group of people who share a place or interests. Your neighborhood, school, and city are all communities you belong to!' },
      { q: 'Why do we have rules and laws?', options: ['To make life boring', 'To keep people safe and treat everyone fairly', 'Because adults like making rules', 'Only some people have to follow them'], answer: 1, explain: 'Rules and laws help keep everyone safe and make sure people are treated fairly. Without them, it would be hard to live together peacefully.' },
      { q: 'What does it mean to be a good citizen?', options: ['Being the fastest runner', 'Helping others and following rules', 'Having the most friends', 'Getting the best grades'], answer: 1, explain: 'Being a good citizen means caring about your community, helping others, following rules, and doing your part to make things better for everyone.' },
      { q: 'What is a petition?', options: ['A type of pet', 'A written request signed by many people asking for a change', 'A school assignment', 'A math problem'], answer: 1, explain: 'A petition is when people write down what they want to change and collect signatures to show that many people agree. It is a powerful way to make your voice heard!' },
      { q: 'Who makes the rules at your school?', options: ['Only the students', 'The principal, teachers, and school board with input from families', 'Nobody, there are no rules', 'The president of the country'], answer: 1, explain: 'School rules are made by principals, teachers, and school boards. Good schools also listen to students and families when making decisions.' },
    ],
    middle: [
      { q: 'What are the three branches of the U.S. government?', options: ['President, Army, Police', 'Legislative, Executive, Judicial', 'Federal, State, Local', 'Senate, House, Court'], answer: 1, explain: 'The three branches are Legislative (Congress, makes laws), Executive (President, carries out laws), and Judicial (Courts, interprets laws). This system of "checks and balances" prevents any one branch from having too much power.' },
      { q: 'How does a bill become a law?', options: ['The president writes it and it becomes law immediately', 'A member of Congress introduces it, both chambers vote, and the president signs it', 'Citizens vote on every law directly', 'Judges write all the laws'], answer: 1, explain: 'A bill is introduced in Congress, debated in committees, voted on by both the House and Senate, and then sent to the President to sign. The President can also veto (reject) a bill.' },
      { q: 'What is the Bill of Rights?', options: ['A shopping list', 'The first ten amendments to the Constitution that protect individual freedoms', 'A law about paying taxes', 'A document from another country'], answer: 1, explain: 'The Bill of Rights is the first ten amendments to the U.S. Constitution. It protects freedoms like speech, religion, press, and the right to a fair trial.' },
      { q: 'What does the First Amendment protect?', options: ['The right to bear arms', 'Freedom of speech, religion, press, assembly, and petition', 'The right to vote at 18', 'The right to a speedy trial'], answer: 1, explain: 'The First Amendment protects five key freedoms: speech, religion, press, peaceful assembly, and the right to petition the government. These are foundational to democracy.' },
      { q: 'What is the difference between a right and a responsibility?', options: ['They are the same thing', 'A right is something you are entitled to; a responsibility is something you should do for your community', 'Rights are for adults and responsibilities are for kids', 'There is no difference'], answer: 1, explain: 'Rights are protections and freedoms you have. Responsibilities are duties you have as a citizen, like voting, serving on juries, and helping your community.' },
      { q: 'What does "civic engagement" mean?', options: ['Getting married', 'Participating in your community and government to make a difference', 'Joining a sports team', 'Watching the news every day'], answer: 1, explain: 'Civic engagement means actively participating in the life of your community and government. It includes voting, volunteering, speaking up about issues, and working to make positive change.' },
      { q: 'What is an amendment?', options: ['A fancy word for "law"', 'A change or addition to the Constitution', 'A type of election', 'A government building'], answer: 1, explain: 'An amendment is a formal change or addition to the Constitution. There are currently 27 amendments. The process is intentionally difficult to ensure broad agreement.' },
      { q: 'Why is a free press important in a democracy?', options: ['So we can read comics', 'To hold the government accountable and keep citizens informed', 'It is not important', 'So reporters can be famous'], answer: 1, explain: 'A free press investigates wrongdoing, shares information, and holds leaders accountable. Without it, citizens cannot make informed decisions about their government.' },
    ],
    high: [
      { q: 'What is the difference between the Electoral College and the popular vote?', options: ['They are the same thing', 'The Electoral College is a system where electors cast votes for president; the popular vote is the total of all individual votes', 'The popular vote decides state elections and the Electoral College decides local ones', 'The Electoral College only votes in midterm elections'], answer: 1, explain: 'The popular vote is the total count of all individual votes. The Electoral College is a system where each state gets a number of electors based on population, and those electors formally choose the president. A candidate can win the Electoral College without winning the popular vote.' },
      { q: 'What is lobbying?', options: ['Waiting in a hotel lobby', 'Attempting to influence government decisions on behalf of a group or cause', 'Running for political office', 'Counting votes on election day'], answer: 1, explain: 'Lobbying is when individuals or groups try to influence legislators and government officials to support specific policies. While it is a form of civic participation, the outsized influence of wealthy lobbyists is a major concern in modern politics.' },
      { q: 'What is judicial review?', options: ['A review of a judge\'s performance', 'The power of courts to determine if laws are constitutional', 'A type of election for judges', 'A legal document filed in court'], answer: 1, explain: 'Judicial review is the power of courts, especially the Supreme Court, to examine laws and government actions and determine whether they violate the Constitution. This was established in Marbury v. Madison (1803).' },
      { q: 'What is civil disobedience?', options: ['Being rude to people', 'The nonviolent refusal to obey unjust laws as a form of protest', 'Voting against the majority', 'Filing a lawsuit'], answer: 1, explain: 'Civil disobedience is the deliberate, nonviolent refusal to obey laws considered unjust, in order to bring about change. Famous examples include Rosa Parks, Gandhi\'s Salt March, and lunch counter sit-ins during the Civil Rights Movement.' },
      { q: 'What does "gerrymandering" mean?', options: ['A type of dance', 'Manipulating electoral district boundaries to favor a particular party', 'Electing a new governor', 'A foreign policy strategy'], answer: 1, explain: 'Gerrymandering is when political district boundaries are drawn to give one party an unfair advantage. It undermines fair representation and is a significant challenge to democracy.' },
      { q: 'What is the filibuster?', options: ['A pirate ship', 'A tactic used in the Senate to delay or block a vote by extended debate', 'A type of constitutional amendment', 'A campaign fundraising event'], answer: 1, explain: 'A filibuster is a tactic in the U.S. Senate where a senator speaks for an extended time to delay or prevent a vote on a bill. It effectively requires 60 out of 100 senators to agree before most legislation can pass.' },
      { q: 'What is the difference between equity and equality?', options: ['They mean the same thing', 'Equality gives everyone the same resources; equity gives people what they need to have equal outcomes', 'Equality is about money and equity is about fairness', 'Neither is important in government'], answer: 1, explain: 'Equality means treating everyone the same. Equity means giving people what they specifically need to have fair opportunities and outcomes. For example, equality gives every student the same textbook; equity ensures students who need additional support get it.' },
      { q: 'What role does the Supreme Court play in protecting civil liberties?', options: ['It makes new laws', 'It interprets the Constitution and can strike down laws that violate individual rights', 'It enforces laws through police', 'It has no role in civil liberties'], answer: 1, explain: 'The Supreme Court interprets the Constitution and has the final say on whether laws respect civil liberties. Landmark cases like Brown v. Board of Education and Obergefell v. Hodges have expanded rights and protections for millions of Americans.' },
    ]
  };

  // ── NEW: Community Change Scenarios ──

  var CHANGE_SCENARIOS = {
    elementary: [
      { title: 'The Broken Playground', setup: 'The swings at your school playground are broken and nobody has fixed them for weeks. Kids are sad because they cannot play on them. What do you do?',
        choices: [
          { text: 'Tell your teacher and ask them to report it.', score: 3, feedback: 'Great first step! Teachers can contact the people who fix things. But sometimes one voice is not enough.' },
          { text: 'Write a letter to the principal with your classmates.', score: 5, feedback: 'Excellent! When many students speak up together, leaders pay attention. You showed civic action!' },
          { text: 'Make a poster showing why the playground matters and hang it up.', score: 4, feedback: 'Creative advocacy! Raising awareness is a powerful step. Visual messages can inspire others to join your cause.' },
          { text: 'Do nothing \u2014 someone else will fix it.', score: 1, feedback: 'Waiting for someone else can mean waiting forever. Even small actions can start big changes.' },
        ]},
      { title: 'The Lonely New Student', setup: 'A new student joins your class and eats lunch alone every day. Some kids whisper about them. What do you do?',
        choices: [
          { text: 'Sit with them at lunch and introduce yourself.', score: 5, feedback: 'Amazing! One act of kindness can change someone\'s entire school experience. You chose compassion.' },
          { text: 'Ask your teacher to assign a buddy for new students.', score: 4, feedback: 'Smart systemic thinking! Creating a buddy program helps all future new students, not just this one.' },
          { text: 'Tell the whispering kids to stop but do not talk to the new student.', score: 3, feedback: 'Standing up against unkindness is important, but including the new student directly shows real leadership.' },
          { text: 'Feel bad but do nothing because you are nervous.', score: 2, feedback: 'It is normal to feel nervous. But next time, take a deep breath and try one small step. You might make a friend.' },
        ]},
      { title: 'The Polluted Creek', setup: 'You notice that a creek near your school has trash in it and the water looks dirty. Fish seem to be gone. What do you do?',
        choices: [
          { text: 'Organize a creek cleanup day with your class.', score: 5, feedback: 'Direct action! Cleaning up the creek helps right now AND shows the community the problem. Excellent leadership.' },
          { text: 'Research who is responsible for the creek and write them a letter.', score: 4, feedback: 'Smart advocacy! Understanding who has responsibility is key to getting lasting change.' },
          { text: 'Tell your parents and ask them to call the city.', score: 3, feedback: 'Good start! Adults can help, but remember that your voice matters too. Consider joining the effort.' },
          { text: 'Post about it online and hope someone fixes it.', score: 2, feedback: 'Awareness helps, but action is what creates change. Can you pair your post with a concrete plan?' },
        ]},
      { title: 'The Unfair Rule', setup: 'Your school makes a new rule that students cannot bring any outside food to lunch. Some kids with allergies or dietary needs are upset because school food does not work for them. What do you do?',
        choices: [
          { text: 'Help affected students write a petition explaining their needs.', score: 5, feedback: 'Perfect civic action! Petitions show that many people care about an issue. You helped amplify voices that needed to be heard.' },
          { text: 'Ask to speak at the next parent-teacher meeting about the rule.', score: 4, feedback: 'Brave! Speaking at a public meeting is powerful advocacy. Your perspective as a student is valuable.' },
          { text: 'Talk to the principal one-on-one about making exceptions.', score: 3, feedback: 'Good initiative! Sometimes a personal conversation can lead to change. But broader advocacy might help more students.' },
          { text: 'Follow the rule without questioning it.', score: 1, feedback: 'Rules are important, but questioning unfair ones is how we make things better. Good citizens speak up respectfully.' },
        ]},
      { title: 'Not Enough Books', setup: 'Your class library has very few books with characters from different backgrounds. Some classmates say they never see themselves in the books. What do you do?',
        choices: [
          { text: 'Start a diverse book drive and donate books with many different characters.', score: 5, feedback: 'Outstanding! You identified a gap and took action to fill it. Everyone deserves to see themselves in stories.' },
          { text: 'Ask your librarian to order books with more diverse characters.', score: 4, feedback: 'Great idea! Librarians want to know what students need. Speaking up helps them make better choices.' },
          { text: 'Create a reading list of diverse books and share it with classmates.', score: 4, feedback: 'Creative solution! Sharing recommendations helps everyone discover new perspectives.' },
          { text: 'It does not affect you, so you ignore it.', score: 1, feedback: 'Even if an issue does not affect you directly, caring about fairness for others is what good citizens do.' },
        ]},
    ],
    middle: [
      { title: 'The Social Media Rumor', setup: 'A hurtful rumor is spreading about a classmate on social media. It is not true, but people are sharing and commenting on it. Some students are laughing about it in the hallway. What do you do?',
        choices: [
          { text: 'Report the posts, tell a trusted adult, and reach out to the student being targeted.', score: 5, feedback: 'Comprehensive response! You addressed the problem on multiple levels \u2014 reporting, getting adult help, and showing direct support.' },
          { text: 'Publicly defend the student by posting the truth.', score: 3, feedback: 'Brave, but be careful \u2014 engaging publicly can sometimes escalate things. Reporting and private support are often more effective.' },
          { text: 'Talk to the person who started the rumor privately.', score: 4, feedback: 'Good approach! Sometimes a direct, private conversation can stop harmful behavior at the source.' },
          { text: 'Stay out of it \u2014 it is not your business.', score: 1, feedback: 'Bystander silence can feel like approval. You have the power to break the cycle of harm.' },
        ]},
      { title: 'The School Budget Cut', setup: 'Your school announces it is cutting the art and music programs due to budget problems. Many students are devastated. What do you do?',
        choices: [
          { text: 'Organize students to attend the next school board meeting and speak about why these programs matter.', score: 5, feedback: 'Powerful civic action! Decision-makers need to hear directly from the people affected. You mobilized your community.' },
          { text: 'Start a petition and collect signatures from students, parents, and teachers.', score: 4, feedback: 'Smart strategy! A petition shows broad support and gives the school board data about community values.' },
          { text: 'Research alternative funding like grants or fundraisers and present options to the principal.', score: 5, feedback: 'Exceptional problem-solving! Coming with solutions, not just complaints, makes your advocacy much more effective.' },
          { text: 'Complain on social media about how unfair it is.', score: 2, feedback: 'Expressing frustration is understandable, but directing that energy toward decision-makers creates real change.' },
        ]},
      { title: 'The Food Desert', setup: 'You learn that many families in a neighborhood near your school do not have access to a grocery store with fresh fruits and vegetables. The closest one is a 45-minute bus ride away. What do you do?',
        choices: [
          { text: 'Research the issue and present a proposal for a school community garden to your principal.', score: 5, feedback: 'Excellent systems thinking! A community garden addresses immediate food access while building community and teaching valuable skills.' },
          { text: 'Organize a canned food drive at school.', score: 3, feedback: 'Helpful in the short term! But also consider long-term solutions that address the root cause of the problem.' },
          { text: 'Write to city council members about attracting a grocery store to the area.', score: 4, feedback: 'Strong advocacy! Policy changes can create lasting structural improvements that help entire communities.' },
          { text: 'It is not your problem since you have a grocery store near you.', score: 1, feedback: 'Civic responsibility means caring about issues that affect your community, even if they do not affect you directly.' },
        ]},
      { title: 'The Accessibility Problem', setup: 'A student who uses a wheelchair cannot access certain parts of your school building. The science lab, theater, and library second floor have no elevator or ramp. What do you do?',
        choices: [
          { text: 'Research disability rights laws (like the ADA) and present findings to your principal showing the school may be out of compliance.', score: 5, feedback: 'Powerful approach! Knowing the law strengthens your advocacy. The ADA requires public schools to be accessible.' },
          { text: 'Start a student awareness campaign about accessibility.', score: 3, feedback: 'Raising awareness is important, but connecting awareness to specific action demands makes it more effective.' },
          { text: 'Work with the affected student (if they want) to document barriers and submit a formal request to the school district.', score: 5, feedback: 'Excellent! Centering the voice of the person most affected and using formal channels shows sophisticated civic action.' },
          { text: 'Feel bad about it but assume the school will fix it eventually.', score: 1, feedback: 'Systemic problems rarely fix themselves. They require people who see injustice and take action.' },
        ]},
      { title: 'The Climate Pledge', setup: 'Your school talks about being "green" but still uses single-use plastics in the cafeteria, leaves lights on in empty rooms, and has no recycling program. What do you do?',
        choices: [
          { text: 'Propose a detailed sustainability plan to the student council with specific, measurable goals.', score: 5, feedback: 'Incredible civic leadership! Data-driven proposals with clear goals are how real policy change happens.' },
          { text: 'Start a student green team to implement changes one at a time.', score: 4, feedback: 'Great grassroots approach! Starting small and building momentum is an effective strategy for change.' },
          { text: 'Create an environmental audit of the school and share results publicly.', score: 4, feedback: 'Transparency drives accountability. When the community sees the data, it creates pressure for change.' },
          { text: 'Just bring your own reusable items and do not worry about the school.', score: 2, feedback: 'Personal choices matter, but systemic change requires collective action. You can do both!' },
        ]},
    ],
    high: [
      { title: 'The Voter Suppression Bill', setup: 'Your state legislature is considering a bill that would reduce early voting days and require specific types of ID that many students and elderly people do not have. How do you respond?',
        choices: [
          { text: 'Organize a voter registration and education drive. Contact your representative. Testify at a public hearing if possible.', score: 5, feedback: 'Multi-pronged civic engagement at its best! Combining direct action, legislative advocacy, and public testimony maximizes your impact.' },
          { text: 'Write an op-ed for your school and local newspaper explaining how the bill would affect young voters.', score: 4, feedback: 'Excellent use of media advocacy! Shaping public opinion through informed writing is a time-honored civic tradition.' },
          { text: 'Share information about the bill on social media to raise awareness.', score: 3, feedback: 'Awareness is the first step, but effective advocacy also requires direct engagement with decision-makers.' },
          { text: 'You cannot vote yet, so it does not affect you.', score: 1, feedback: 'Laws passed today will affect you for years to come. Pre-registering and advocating now is how you shape your future.' },
        ]},
      { title: 'The School-to-Prison Pipeline', setup: 'Your school has harsh discipline policies that disproportionately affect students of color. Zero-tolerance policies send students to juvenile detention for minor offenses, and there are more resource officers than counselors. What do you do?',
        choices: [
          { text: 'Research restorative justice programs, collect data on discipline disparities, and present an alternative model to the school board.', score: 5, feedback: 'This is advocacy at the highest level \u2014 evidence-based, solution-oriented, and directed at the right decision-makers. Real systemic change.' },
          { text: 'Start a student-led restorative justice circle in your school to demonstrate the alternative.', score: 4, feedback: 'Leading by example is powerful. Demonstrating that alternatives work can build support for broader policy change.' },
          { text: 'Write letters to the school board demanding policy changes.', score: 3, feedback: 'Direct engagement with decision-makers is important. Pairing your demands with evidence and proposed alternatives strengthens your position.' },
          { text: 'The policies exist for a reason and you trust the administration.', score: 1, feedback: 'Questioning systems that produce unequal outcomes is a civic duty. Trust is built through accountability and transparency.' },
        ]},
      { title: 'The Mental Health Crisis', setup: 'Multiple students at your school have experienced mental health crises this year, but the school only has one counselor for 500 students. Wait times are weeks long. What do you do?',
        choices: [
          { text: 'Build a coalition of students, parents, and teachers to advocate for more mental health resources at school board budget meetings.', score: 5, feedback: 'Coalition-building is the gold standard of civic action. When diverse stakeholders unite around a shared goal, change happens.' },
          { text: 'Create a peer support program (with professional training and oversight) while advocating for more counselors.', score: 5, feedback: 'Brilliant dual approach! Address the immediate need while fighting for long-term structural change.' },
          { text: 'Start a social media campaign highlighting the counselor-to-student ratio.', score: 3, feedback: 'Data-driven awareness can build public pressure. Consider also directing the campaign toward specific decision-makers.' },
          { text: 'Mental health is a personal issue, not a school responsibility.', score: 1, feedback: 'Schools play a critical role in student wellbeing. Research shows that mental health support improves attendance, grades, and safety.' },
        ]},
      { title: 'The Gentrification Debate', setup: 'A large developer wants to build luxury condos in a historically low-income neighborhood. Long-time residents fear displacement. The developer promises jobs and new amenities. What do you do?',
        choices: [
          { text: 'Attend community meetings, listen to all sides, research community benefit agreements, and help amplify resident voices to city council.', score: 5, feedback: 'Nuanced, community-centered advocacy. Listening first, then acting to amplify marginalized voices, is the mark of a thoughtful civic leader.' },
          { text: 'Organize a protest against the development.', score: 3, feedback: 'Protests raise visibility, but effective advocacy also engages in the policy process to propose alternatives that benefit everyone.' },
          { text: 'Support the development because new jobs and amenities sound good.', score: 2, feedback: 'Economic development can be positive, but not if it displaces the people it is supposed to help. Consider who benefits and who is harmed.' },
          { text: 'It is not your neighborhood, so you stay out of it.', score: 1, feedback: 'Community issues affect the whole community. Standing with vulnerable neighbors is civic responsibility in action.' },
        ]},
      { title: 'The Data Privacy Dilemma', setup: 'Your school district announces it will use AI software to monitor student social media for "safety." Students, parents, and civil liberties groups have conflicting reactions. What do you do?',
        choices: [
          { text: 'Research the privacy implications, student rights, and similar programs in other districts. Present a balanced analysis to the school board with recommended safeguards.', score: 5, feedback: 'Exceptional civic reasoning! You engaged with complexity, did research, and proposed solutions rather than just taking a side.' },
          { text: 'Organize student forums to discuss the trade-offs between safety and privacy, then bring collective recommendations to the administration.', score: 5, feedback: 'Democratic deliberation at its finest! Facilitating discussion and building consensus is leadership in action.' },
          { text: 'Immediately protest the program as a violation of privacy.', score: 3, feedback: 'Privacy concerns are valid, but effective advocacy considers the full picture and engages with the other side\'s concerns.' },
          { text: 'You have nothing to hide, so you do not care.', score: 1, feedback: '"Nothing to hide" misses the bigger picture. Privacy is a right, and surveillance can affect free expression even for those with nothing to hide.' },
        ]},
    ]
  };

  // ── NEW: Changemaker Profiles ──

  var CHANGEMAKERS = {
    elementary: [
      { name: 'Ruby Bridges', emoji: '\ud83c\udf39', years: '1954\u2013present', bio: 'At just 6 years old, Ruby Bridges became the first Black child to integrate an all-white elementary school in the South. She walked past angry mobs every day with incredible bravery. She later said, "Don\'t follow the path. Go where there is no path and begin the trail."', theme: 'Civil Rights', age: 'Was 6 years old' },
      { name: 'Malala Yousafzai', emoji: '\ud83d\udcda', years: '1997\u2013present', bio: 'Malala spoke up for girls\' right to education in Pakistan when she was just 11. She survived being shot by the Taliban at 15 and became the youngest Nobel Peace Prize winner at 17. "One child, one teacher, one book, one pen can change the world."', theme: 'Education', age: 'Started at age 11' },
      { name: 'Greta Thunberg', emoji: '\ud83c\udf0d', years: '2003\u2013present', bio: 'Greta started skipping school every Friday to sit outside the Swedish parliament with a sign about climate change when she was 15. Her solo protest grew into a global movement of millions of young people demanding climate action.', theme: 'Climate', age: 'Started at age 15' },
      { name: 'Ryan Hickman', emoji: '\u267b\ufe0f', years: '2012\u2013present', bio: 'Ryan started recycling at just 3 years old when his dad took him to a recycling center. By age 10, he had recycled over 1 million cans and bottles and started his own recycling company, Ryan\'s Recycling.', theme: 'Environment', age: 'Started at age 3' },
      { name: 'Marley Dias', emoji: '\ud83d\udcd6', years: '2005\u2013present', bio: 'At 11, Marley was tired of only reading books about "white boys and their dogs." She launched the #1000BlackGirlBooks campaign and collected over 13,000 books featuring Black girl protagonists.', theme: 'Representation', age: 'Started at age 11' },
    ],
    middle: [
      { name: 'Emma Gonz\u00e1lez', emoji: '\u270a', years: '1999\u2013present', bio: 'After surviving the Parkland school shooting, Emma co-founded the March for Our Lives movement at age 18. Her powerful 6-minute speech, which included 4 minutes of silence, became one of the most iconic moments of modern activism.', theme: 'Gun Safety', age: 'Was 18 years old' },
      { name: 'Mari Copeny (Little Miss Flint)', emoji: '\ud83d\udca7', years: '2007\u2013present', bio: 'At age 8, Mari wrote a letter to President Obama about the water crisis in Flint, Michigan. Her letter led to a presidential visit and national attention. She has since raised hundreds of thousands of dollars for clean water.', theme: 'Clean Water', age: 'Started at age 8' },
      { name: 'Autumn Peltier', emoji: '\ud83c\udf0a', years: '2004\u2013present', bio: 'An Anishinaabe water protector, Autumn began advocating for clean water for Indigenous communities at age 8. By 15, she had addressed the United Nations and was named the Anishinabek Nation\'s Chief Water Commissioner.', theme: 'Water Rights', age: 'Started at age 8' },
      { name: 'Xiuhtezcatl Martinez', emoji: '\ud83c\udf3f', years: '2000\u2013present', bio: 'An Indigenous climate activist, hip-hop artist, and author, Xiuhtezcatl began speaking at rallies when he was 6. By 15, he had addressed the United Nations General Assembly about climate change, blending activism with art.', theme: 'Climate', age: 'Started at age 6' },
      { name: 'Jazz Jennings', emoji: '\ud83c\udf08', years: '2000\u2013present', bio: 'Jazz became one of the youngest publicly documented people to identify as transgender. She has used her platform to advocate for transgender rights and helped create the TransKids Purple Rainbow Foundation.', theme: 'LGBTQ+ Rights', age: 'Advocating since childhood' },
    ],
    high: [
      { name: 'John Lewis', emoji: '\u270a', years: '1940\u20132020', bio: 'A leader of the Civil Rights Movement, John Lewis was beaten on Bloody Sunday at 25 and arrested over 40 times. He served in Congress for 33 years, fighting for justice until his death. "Never, ever be afraid to make some noise and get in good trouble."', theme: 'Civil Rights', age: 'Organized sit-ins at 20' },
      { name: 'Bryan Stevenson', emoji: '\u2696\ufe0f', years: '1959\u2013present', bio: 'A lawyer who founded the Equal Justice Initiative, Bryan has helped free over 140 wrongly condemned people from death row. His work exposed racial bias in the criminal justice system. "Each of us is more than the worst thing we have ever done."', theme: 'Justice', age: 'Life\'s work' },
      { name: 'Dolores Huerta', emoji: '\ud83c\udf3e', years: '1930\u2013present', bio: 'Co-founded the United Farm Workers with Cesar Chavez. Led grape boycotts, organized strikes, and fought for decades for migrant workers\' rights. She coined the rallying cry: "\u00a1S\u00ed, se puede!" (Yes, we can!)', theme: 'Labor Rights', age: 'Life\'s work' },
      { name: 'Bayard Rustin', emoji: '\u2764\ufe0f', years: '1912\u20131987', bio: 'The brilliant organizer behind the 1963 March on Washington. As an openly gay Black man, he faced discrimination from multiple directions but never stopped fighting for justice. He mentored Dr. King in nonviolent resistance.', theme: 'Civil Rights / LGBTQ+', age: 'Life\'s work' },
      { name: 'Wangari Maathai', emoji: '\ud83c\udf33', years: '1940\u20132011', bio: 'Founded the Green Belt Movement in Kenya and led the planting of over 51 million trees. Won the Nobel Peace Prize in 2004. She connected environmental conservation with democracy and women\'s rights.', theme: 'Environment', age: 'Founded movement at 37' },
      { name: 'Patrisse Cullors', emoji: '\u270b', years: '1983\u2013present', bio: 'Co-founded the Black Lives Matter movement in 2013, building one of the largest social movements of the 21st century. Her work centers community organizing, art, and abolition to challenge systemic racism.', theme: 'Racial Justice', age: 'Co-founded BLM at 30' },
    ]
  };

  // ── NEW: Civic Simulation Game Data ──

  var CIVIC_SIMULATIONS = {
    elementary: {
      title: 'School Council Meeting',
      intro: 'You have been elected to the School Council! Today you will vote on 3 proposals. Each choice affects your school differently. Think carefully about what is best for everyone.',
      proposals: [
        {
          id: 'recess', title: 'Longer Recess', desc: 'Should recess be extended by 15 minutes each day?',
          options: [
            { text: 'Yes, extend recess by 15 minutes', outcome: 'Students are happier and more energetic, but teachers report less time for reading lessons. Some students fall behind in reading scores.', impact: { happiness: 3, learning: -1, health: 2 } },
            { text: 'Extend recess by 10 minutes as a compromise', outcome: 'Students get a bit more play time and teachers can still cover reading. The school community feels heard on both sides.', impact: { happiness: 2, learning: 0, health: 1 } },
            { text: 'No, keep recess the same length', outcome: 'Teachers are relieved, but many students feel their voices were not heard. Some students have trouble focusing in the afternoon.', impact: { happiness: -1, learning: 1, health: -1 } }
          ]
        },
        {
          id: 'garden', title: 'School Garden Project', desc: 'Should the school spend $500 from the activities fund on a school garden?',
          options: [
            { text: 'Yes, build the garden with the full budget', outcome: 'The garden is beautiful and students learn about plants and food. However, the science fair has less funding this year.', impact: { happiness: 2, learning: 2, health: 2 } },
            { text: 'Use half the budget and ask families to donate supplies', outcome: 'The garden is smaller but the whole community pitches in. Families feel connected to the school. The science fair still happens.', impact: { happiness: 3, learning: 2, health: 1 } },
            { text: 'No, save the money for the science fair', outcome: 'The science fair is great, but students miss out on learning where food comes from. Some students are disappointed.', impact: { happiness: 0, learning: 1, health: 0 } }
          ]
        },
        {
          id: 'buddy', title: 'Buddy Bench Program', desc: 'Should the school install a "buddy bench" where students who need a friend can sit?',
          options: [
            { text: 'Yes, and train student volunteers to be buddy helpers', outcome: 'Lonely students find friends faster. Buddy helpers learn empathy and leadership. The whole school feels kinder.', impact: { happiness: 3, learning: 1, health: 2 } },
            { text: 'Yes, install the bench but without formal volunteers', outcome: 'The bench helps some students, but others are embarrassed to sit there. It works sometimes but not always.', impact: { happiness: 1, learning: 0, health: 1 } },
            { text: 'No, students should find friends on their own', outcome: 'Some students continue to feel lonely at recess. Teachers notice more conflicts and fewer friendships forming.', impact: { happiness: -2, learning: 0, health: -1 } }
          ]
        }
      ]
    },
    middle: {
      title: 'City Budget Challenge',
      intro: 'You are on the Youth Advisory Board for your city. The city has $1,000,000 to allocate across 6 categories. Drag the sliders to decide how much each area gets. Every dollar you add to one area is a dollar you cannot spend on another. Watch how the community reacts!',
      categories: [
        { id: 'parks', label: '\ud83c\udf33 Parks & Recreation', desc: 'Playgrounds, sports fields, trails, community centers', base: 166666 },
        { id: 'schools', label: '\ud83c\udfe5 Schools & Education', desc: 'Teachers, supplies, after-school programs, tutoring', base: 166666 },
        { id: 'safety', label: '\ud83d\udee1\ufe0f Public Safety', desc: 'Fire department, emergency services, crossing guards', base: 166666 },
        { id: 'roads', label: '\ud83d\udea7 Roads & Transit', desc: 'Road repairs, bus routes, bike lanes, sidewalks', base: 166666 },
        { id: 'health', label: '\ud83c\udfe5 Health Services', desc: 'Clinics, mental health programs, food assistance', base: 166668 },
        { id: 'arts', label: '\ud83c\udfa8 Arts & Culture', desc: 'Libraries, museums, public art, music programs', base: 166668 }
      ],
      reactions: {
        parks: { low: 'Families complain that playgrounds are falling apart. Kids have nowhere safe to play after school.', high: 'Beautiful new parks bring the community together. Youth sports leagues grow. Everyone has a place to relax.' },
        schools: { low: 'Class sizes increase. Teachers leave for better-funded districts. Test scores drop.', high: 'New after-school programs thrive. Teachers get better supplies. More students graduate on time.' },
        safety: { low: 'Response times increase. Some residents feel less safe walking at night.', high: 'Emergency response times improve. The community feels protected. New programs build trust.' },
        roads: { low: 'Potholes multiply. Bus routes are cut. Students have trouble getting to school.', high: 'New bike lanes and bus routes make it easier for everyone to get around. Fewer car accidents.' },
        health: { low: 'The free clinic reduces hours. Families without insurance struggle to see a doctor.', high: 'A new mental health program helps students and families. The free clinic expands hours.' },
        arts: { low: 'The library cuts hours. Music programs are eliminated. The community loses a sense of identity.', high: 'A vibrant arts scene attracts visitors and pride. The library becomes a community hub.' }
      }
    },
    high: {
      title: 'Legislative Simulation',
      intro: 'You are a newly elected state representative. You want to pass a bill that matters to you. Navigate the legislative process: draft the bill, build a coalition, survive committee, and win the floor vote.',
      steps: [
        {
          id: 'draft', title: 'Step 1: Draft Your Bill',
          desc: 'Choose an issue for your bill. The more specific and well-defined your bill, the better chance it has.',
          bills: [
            { id: 'climate', title: 'Clean Energy Schools Act', desc: 'Require all public schools to use 50% renewable energy within 5 years', support_base: 55, opposition: 'Energy companies and fiscal conservatives worry about costs' },
            { id: 'mental_health', title: 'Student Mental Health Act', desc: 'Mandate a 1:250 school counselor to student ratio', support_base: 65, opposition: 'Budget hawks say the state cannot afford it' },
            { id: 'voting', title: 'Youth Civic Engagement Act', desc: 'Allow 16-year-olds to pre-register and vote in local school board elections', support_base: 45, opposition: 'Some argue 16-year-olds lack maturity for voting' }
          ]
        },
        {
          id: 'coalition', title: 'Step 2: Build Your Coalition',
          desc: 'You need allies. Each group you convince adds support but may require compromises.',
          allies: [
            { id: 'teachers', label: 'Teachers\' Union', bonus: 10, ask: 'They want a clause protecting teacher pay. Add it?' },
            { id: 'parents', label: 'Parent Association', bonus: 8, ask: 'They want quarterly progress reports made public. Agree?' },
            { id: 'students', label: 'Student Council Federation', bonus: 5, ask: 'They want student representatives on the oversight board. Include it?' },
            { id: 'business', label: 'Local Business Alliance', bonus: 7, ask: 'They want tax incentives included. Add a business tax credit?' },
            { id: 'media', label: 'Local News Partnership', bonus: 6, ask: 'They want exclusive access to report on progress. Grant press access?' }
          ]
        },
        {
          id: 'committee', title: 'Step 3: Committee Hearing',
          desc: 'Your bill goes to committee. You must respond to tough questions from skeptical members.',
          questions: [
            { q: 'How will we pay for this?', good: 'Present a detailed funding plan with specific revenue sources', bad: 'Say the details can be worked out later', goodBonus: 5, badPenalty: -8 },
            { q: 'What evidence shows this will work?', good: 'Cite research from states that have implemented similar policies', bad: 'Appeal to emotion without data', goodBonus: 5, badPenalty: -5 },
            { q: 'Why should this be a priority over other bills?', good: 'Show how it addresses an urgent need with data on who is affected', bad: 'Argue that your bill is simply more important', goodBonus: 5, badPenalty: -5 }
          ]
        },
        {
          id: 'vote', title: 'Step 4: Floor Vote',
          desc: 'Your bill goes to the full legislature. You need 51% to pass.'
        }
      ]
    }
  };

  // ── NEW: Community Survey Builder Data ──

  var SURVEY_TEMPLATES = {
    elementary: [
      { q: 'What is your favorite thing about our school?', type: 'open' },
      { q: 'Do you feel safe at school?', type: 'choice', options: ['Always', 'Usually', 'Sometimes', 'Rarely'] },
      { q: 'What would make our school better?', type: 'open' },
      { q: 'Do you feel like adults at school listen to you?', type: 'choice', options: ['Yes, always', 'Most of the time', 'Sometimes', 'Not really'] },
      { q: 'If you could add one thing to our school, what would it be?', type: 'open' }
    ],
    middle: [
      { q: 'How would you rate the mental health support at your school?', type: 'choice', options: ['Excellent', 'Good', 'Fair', 'Poor', 'I don\'t know what\'s available'] },
      { q: 'What community issue concerns you most?', type: 'open' },
      { q: 'How often do you feel your voice matters in school decisions?', type: 'choice', options: ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'] },
      { q: 'What resources do students in our community need most?', type: 'open' },
      { q: 'Do you feel represented in your school\'s curriculum?', type: 'choice', options: ['Strongly yes', 'Somewhat', 'Not really', 'Not at all'] }
    ],
    high: [
      { q: 'What is the biggest challenge facing young people in your community?', type: 'open' },
      { q: 'How prepared do you feel to participate in civic life after graduation?', type: 'choice', options: ['Very prepared', 'Somewhat prepared', 'Not very prepared', 'Not at all prepared'] },
      { q: 'Have you ever contacted an elected official about an issue?', type: 'choice', options: ['Yes, multiple times', 'Yes, once', 'No, but I would like to', 'No, and I don\'t plan to'] },
      { q: 'What policy change would most improve your community?', type: 'open' },
      { q: 'How would you rate access to healthcare in your community?', type: 'choice', options: ['Excellent', 'Good', 'Fair', 'Poor', 'I\'m not sure'] }
    ]
  };

  // ── NEW: Rights & Responsibilities Explorer Data ──

  var RIGHTS_DATA = {
    elementary: {
      title: 'Your Rights at School',
      intro: 'Every student has rights \u2014 things you are always allowed to have and do. You also have responsibilities \u2014 things you should do to help everyone.',
      rights: [
        { right: 'The right to learn', icon: '\ud83d\udcda', explain: 'Every student deserves a good education. Teachers and schools must help you learn in a way that works for you.', responsibility: 'Pay attention, try your best, and ask for help when you need it.', scenario: 'A student in your class has trouble reading. The teacher spends extra time helping them. Another student says "That\'s not fair, the teacher should spend equal time with everyone." What do you think?' },
        { right: 'The right to be safe', icon: '\ud83d\udee1\ufe0f', explain: 'Nobody should hurt you or make you feel scared at school. Adults at school must keep you safe.', responsibility: 'Follow safety rules, tell an adult if someone is being hurt, and be kind to others.', scenario: 'You see an older student pushing a younger kid on the playground. The younger kid looks scared. What would you do?' },
        { right: 'The right to be heard', icon: '\ud83d\udce2', explain: 'Your ideas and feelings matter. Adults should listen to you and take what you say seriously.', responsibility: 'Speak up respectfully, listen when others talk, and take turns sharing.', scenario: 'Your class is voting on a field trip destination. Your choice does not win. Does that mean your right to be heard was violated? Why or why not?' },
        { right: 'The right to be treated fairly', icon: '\u2696\ufe0f', explain: 'No one should be treated differently because of how they look, where they come from, or what they believe.', responsibility: 'Treat everyone with respect, stand up against bullying, and include others.', scenario: 'A new student who speaks a different language joins your class. Some kids laugh at their accent. What is the right thing to do?' },
        { right: 'The right to be yourself', icon: '\ud83c\udf08', explain: 'You can be who you are. You do not have to pretend to be someone else to fit in.', responsibility: 'Respect other people for who they are, even if they are different from you.', scenario: 'A classmate likes things that other kids say are "weird." They want to share their hobby at show-and-tell but are nervous. How could you help?' }
      ]
    },
    middle: {
      title: 'Rights & Dissent',
      intro: 'Rights are guarantees of what every person is allowed to do or have. Dissent is the right to disagree with a rule or law and ask for it to change, through means the law itself protects. This module covers both: the rights you hold today, and the history of how people have used peaceful dissent to expand them.',
      // ── EDITORIAL RED LINES (encoded as comment so future edits respect them) ──
      // 1. No living politicians by name unless quoted in settled historical record (a 1965 speech, yes; a 2024 statement, no).
      // 2. No movements still being litigated in the news cycle. ~25-year cooling-off rule for case-study inclusion.
      // 3. No advocacy verbs in body text ("you should", "we must"). Historical voice only ("the marchers did", "the law was signed").
      // 4. No live URLs. primarySource is a citation string only.
      // 5. Civil disobedience always framed with its cost (arrest, consequence-acceptance), never as costless or recommended.
      // 6. Disability rights gets equal weight to civil rights and suffrage.
      rights: [
        { right: 'Freedom of Speech (1st Amendment)', icon: '\ud83d\udce3', explain: 'You can express your opinions, including at school, as long as you are not causing a substantial disruption. The landmark case Tinker v. Des Moines (1969) confirmed that students do not "shed their constitutional rights at the schoolhouse gate."', responsibility: 'Use your speech to inform and uplift. Consider the impact of your words on others.', scenario: 'A student wears a T-shirt with a political message to school. The principal says they must change. The student says it is protected speech. Who is right, and where is the line?' },
        { right: 'Freedom of Religion (1st Amendment)', icon: '\ud83d\udd4c', explain: 'You can practice any religion or no religion. The government (including public schools) cannot force you to pray or follow religious practices.', responsibility: 'Respect others\' beliefs even when they differ from yours. Learn about different traditions.', scenario: 'A student asks to be excused from a class activity that conflicts with their religious beliefs. Some classmates say they are just trying to get out of work. How should the school handle this?' },
        { right: 'Due Process (5th & 14th Amendments)', icon: '\u2696\ufe0f', explain: 'The government must follow fair procedures before taking away your rights. At school, this means you have the right to hear the charges against you and tell your side before being suspended or expelled.', responsibility: 'Follow school rules. If you disagree with a punishment, use proper channels to appeal.', scenario: 'A student is accused of cheating on a test. The teacher wants to give them a zero immediately without hearing their side. What rights does the student have?' },
        { right: 'Equal Protection (14th Amendment)', icon: '\ud83e\udd1d', explain: 'The law must treat all people equally. Schools cannot discriminate based on race, gender, religion, disability, or national origin.', responsibility: 'Speak up when you see unequal treatment. Be an ally to those who face discrimination.', scenario: 'You notice that students of one racial group receive harsher punishments than others for the same behavior. What could you do about this?' },
        { right: 'Protection from Unreasonable Searches (4th Amendment)', icon: '\ud83d\udd12', explain: 'The government needs a good reason to search your belongings. At school, officials need "reasonable suspicion" (not just a hunch) to search your locker or bag.', responsibility: 'Know your rights if asked to submit to a search. Stay calm and ask questions respectfully.', scenario: 'A school administrator wants to search every student\'s backpack after an anonymous tip. Is this a reasonable search? What would you do?' }
      ],
      sections: [
        {
          id: 'foundations', label: 'Foundations', icon: '\ud83d\udcdc',
          intro: 'The frameworks that say what rights people have. The U.S. Bill of Rights covers the core American protections; the Universal Declaration of Human Rights (1948) covers the international ones.',
          items: [
            { id: 'speech', title: 'Freedom of Speech', icon: '\ud83d\udce3', summary: 'You can express your opinions, even at school, within limits.', body: 'The 1st Amendment protects speech from government punishment. Tinker v. Des Moines (1969) extended this to public school students, saying students do not "shed their constitutional rights at the schoolhouse gate." Schools may restrict speech that causes a substantial disruption to learning, but not speech they simply disagree with.', primarySource: 'U.S. Const. amend. I; Tinker v. Des Moines, 393 U.S. 503 (1969)', scenario: 'A student wears a T-shirt with a political message. The principal says to change. Where is the legal line between protected speech and a substantial disruption?' },
            { id: 'religion', title: 'Freedom of Religion', icon: '\ud83d\udd4c', summary: 'You can practice any religion, or none.', body: 'The 1st Amendment has two religion clauses. The Establishment Clause prevents the government (including public schools) from endorsing a religion. The Free Exercise Clause protects your right to practice yours. Together they create a wall between government and religious authority.', primarySource: 'U.S. Const. amend. I', scenario: 'A student asks to be excused from a class activity that conflicts with their religious beliefs. How should a public school respond?' },
            { id: 'dueprocess', title: 'Due Process', icon: '\u2696\ufe0f', summary: 'The government must follow fair procedures before taking away your rights.', body: 'The 5th and 14th Amendments require fair procedures before the government takes life, liberty, or property. In schools, Goss v. Lopez (1975) established that students have a due-process right to notice of the charges and a chance to tell their side before suspension.', primarySource: 'U.S. Const. amends. V & XIV; Goss v. Lopez, 419 U.S. 565 (1975)', scenario: 'A student is accused of cheating. The teacher wants to give a zero immediately. What does due process require?' },
            { id: 'equalprotect', title: 'Equal Protection', icon: '\ud83e\udd1d', summary: 'The law must treat all people equally.', body: 'The 14th Amendment\'s Equal Protection Clause was added in 1868 after the Civil War. Brown v. Board of Education (1954) used it to end legally segregated schools. Schools today cannot discriminate based on race, sex, religion, disability, or national origin.', primarySource: 'U.S. Const. amend. XIV; Brown v. Board, 347 U.S. 483 (1954)', scenario: 'You notice students of one group receive harsher discipline than others for the same behavior. What does equal protection say about this pattern?' },
            { id: 'search', title: 'Protection from Unreasonable Searches', icon: '\ud83d\udd12', summary: 'The government needs a real reason to search your belongings.', body: 'The 4th Amendment requires the government to have a warrant or probable cause before searching. New Jersey v. T.L.O. (1985) lowered the bar for school officials to "reasonable suspicion" (more than a hunch, less than probable cause), recognizing schools\' need to maintain safety.', primarySource: 'U.S. Const. amend. IV; New Jersey v. T.L.O., 469 U.S. 325 (1985)', scenario: 'A school administrator wants to search every student\'s backpack after an anonymous tip. Does that meet the "reasonable suspicion" standard?' },
            { id: 'udhr19', title: 'UDHR Article 19 (International)', icon: '\ud83c\udf0d', summary: 'Everyone has the right to seek, receive, and share information.', body: 'The Universal Declaration of Human Rights was adopted by the United Nations General Assembly on December 10, 1948, after World War II. The drafting committee was chaired by Eleanor Roosevelt. Article 19 covers freedom of opinion and expression across borders, in any medium.', primarySource: 'UDHR Art. 19, U.N.G.A. Res. 217A (1948)', scenario: 'A government blocks foreign news sites during a crisis. UDHR Article 19 says people may seek information "regardless of frontiers." What tension does that create?' }
          ]
        },
        {
          id: 'anatomy', label: 'Anatomy of Dissent', icon: '\u2696\ufe0f',
          intro: 'Peaceful disagreement with a law or policy can take four main forms. Each is protected differently, costs different things, and carries different responsibilities.',
          items: [
            { id: 'petition', title: 'Petition', icon: '\u270d\ufe0f', summary: 'A formal written request to government.', body: 'The right to petition appears in the 1st Amendment and predates all the others in English common law (the Magna Carta, 1215). It is the lowest-cost form of dissent: anyone may submit one, and the government has to receive it (though not act on it). Modern petitions include letters to elected officials, online signature drives, and ballot initiatives.', primarySource: 'U.S. Const. amend. I; Magna Carta (1215)', scenario: 'A student wants to change the school dress code. They start with a petition. Why might that be a strategically smart first step before bigger actions?' },
            { id: 'assembly', title: 'Peaceful Assembly', icon: '\ud83e\uddcd\u200d\u2640\ufe0f', summary: 'Gathering peacefully to make a point.', body: 'The 1st Amendment protects "the right of the people peaceably to assemble." Cities can require permits for large gatherings to manage traffic and safety, but they cannot deny permits based on the message. NAACP v. Alabama (1958) extended the right to include freedom of association, since the right to assemble means little if the government can demand a list of who showed up.', primarySource: 'U.S. Const. amend. I; NAACP v. Alabama, 357 U.S. 449 (1958)', scenario: 'A city requires a permit for any gathering over 50 people in a public park. Is that a permitted regulation, or a restriction on assembly?' },
            { id: 'speech_dissent', title: 'Public Speech', icon: '\ud83c\udfa4', summary: 'Speaking against government action.', body: 'Political speech receives the strongest 1st Amendment protection. Schenck v. United States (1919) introduced the limit ("clear and present danger") and Brandenburg v. Ohio (1969) sharpened it: speech can only be punished if it is directed at producing imminent lawless action and likely to do so. Disagreement, criticism, and even harsh attacks on government policy are protected.', primarySource: 'U.S. Const. amend. I; Brandenburg v. Ohio, 395 U.S. 444 (1969)', scenario: 'A speaker at a rally calls a government policy "a disgrace" and urges the crowd to vote out the officials who passed it. Is that protected speech under Brandenburg?' },
            { id: 'civdisob', title: 'Civil Disobedience', icon: '\u26d3\ufe0f', summary: 'Knowingly breaking an unjust law and accepting the legal consequence.', body: 'Civil disobedience is the deliberate, public, nonviolent breaking of a law believed to be unjust. What separates it from ordinary lawbreaking is consequence-acceptance: the person submits to arrest, fine, or jail to expose the law. Henry David Thoreau named the practice in 1849; Mohandas Gandhi developed it in India; Martin Luther King Jr. articulated it in his "Letter from Birmingham Jail" (1963). Important: civil disobedience is not legally protected. Participants are arrested. The strategy depends on that arrest making the unjust law visible.', primarySource: 'Thoreau, "Resistance to Civil Government" (1849); MLK, "Letter from Birmingham Jail" (1963)', scenario: 'A student says any rule they disagree with is "unjust" so they can ignore it without consequence. Where does that argument depart from how civil disobedience actually works?' }
          ]
        },
        {
          id: 'casestudies', label: 'Case Studies', icon: '\ud83d\udcda',
          intro: 'Five movements, all from settled historical record, that used the tools above to expand who has rights in the United States.',
          items: [
            { id: 'selma', title: 'Selma to Montgomery', icon: '\ud83c\udf09', year: 1965, summary: 'Three marches that drove the Voting Rights Act.', body: 'On March 7, 1965, about 600 marchers led by John Lewis and Hosea Williams attempted to walk from Selma, Alabama, to Montgomery to demand voting rights for Black Americans. State troopers attacked them on the Edmund Pettus Bridge, an event later called Bloody Sunday. National coverage of the violence built support for federal action; the Voting Rights Act was signed five months later, on August 6, 1965.', primarySource: 'Voting Rights Act of 1965, Pub. L. 89-110', scenario: 'The marchers used peaceful assembly. The violence came from the state, not the marchers. Why did that contrast matter politically?' },
            { id: 'suffrage', title: '19th Amendment', icon: '\ud83d\uddf3\ufe0f', year: 1920, summary: 'Women\'s right to vote, 72 years after Seneca Falls.', body: 'The Seneca Falls Convention in 1848 issued the first formal call for women\'s suffrage in the U.S. Activists used petitions, marches, public speeches, and civil disobedience (the Silent Sentinels picketed the White House from 1917 and were jailed). The 19th Amendment was ratified August 18, 1920. In practice, it did not extend to all women: Native American women gained citizenship in 1924; many Black women in the South were blocked from voting until the 1965 Voting Rights Act.', primarySource: 'U.S. Const. amend. XIX (1920); Indian Citizenship Act (1924)', scenario: 'A right can exist on paper but not in practice. What was the gap between the 19th Amendment as written and as lived for many women?' },
            { id: 'sec504', title: 'Section 504 Sit-In', icon: '\u267f', year: 1977, summary: '25-day occupation that forced disability accessibility regulations.', body: 'Section 504 of the Rehabilitation Act of 1973 banned disability discrimination in federally funded programs, but the regulations needed to enforce it sat unsigned for four years. On April 5, 1977, about 150 disabled Americans led by Judith Heumann occupied the federal HEW office in San Francisco. The sit-in lasted 25 days, the longest occupation of a federal building in U.S. history. The regulations were signed on April 28, 1977. Section 504 became the foundation for the Americans with Disabilities Act (1990) and IDEA, the law behind every IEP and 504 plan in U.S. schools.', primarySource: 'Rehabilitation Act of 1973, \u00a7 504; Americans with Disabilities Act (1990)', scenario: 'Every student with an IEP or 504 plan today benefits from this 25-day sit-in. Why is it so rarely taught?' },
            { id: 'auburn', title: 'Auburn Shoe Strike', icon: '\ud83d\udc5e', year: 1937, summary: 'A Maine labor strike that turned violent and reshaped the state.', body: 'In April 1937, about 1,500 workers at shoe factories in Auburn and Lewiston, Maine, went on strike for union recognition. The state called in the National Guard; the strike ended after about three months without recognition. The events shaped Maine\'s labor laws for decades and remain a key local example of how dissent meets the limits of state power.', primarySource: 'Maine State Archives; Bates College historical collection', scenario: 'The strikers used peaceful assembly and lost. Does a movement\'s success depend on whether it changes the law immediately, or on something longer-term?' },
            { id: 'ufw', title: 'United Farm Workers', icon: '\ud83c\udf47', year: 1965, summary: 'A five-year grape boycott that won contracts for farm workers.', body: 'In September 1965, mostly Filipino farm workers in Delano, California, went on strike against grape growers. They were soon joined by Cesar Chavez and Dolores Huerta\'s mostly Mexican-American union. The combined group used strikes, marches, and a nationwide consumer boycott of California table grapes. After five years, growers signed contracts in July 1970, raising wages and improving conditions for tens of thousands of workers.', primarySource: 'Delano Grape Strike records, Walter P. Reuther Library', scenario: 'The grape boycott asked ordinary shoppers across the country to participate. How does that change the math of a movement?' }
          ]
        },
        {
          id: 'maine', label: 'Maine & Wabanaki', icon: '\ud83c\udf32',
          intro: 'Three local examples. Maine has its own long history of rights work, and a continuing one in the relationship between the state and the four Wabanaki nations.',
          items: [
            { id: 'wabanaki', title: 'Wabanaki Sovereignty', icon: '\ud83e\udeb6', summary: 'The four nations of Maine and the 1980 Settlement Act.', body: 'The Wabanaki Confederacy includes the Penobscot, Passamaquoddy, Maliseet, and Mi\'kmaq nations, all of whom have lived in what is now Maine for thousands of years. The 1980 Maine Indian Claims Settlement Act resolved a major land claim but also placed Maine tribes under different rules than tribes in other states. The relationship between tribal sovereignty and Maine state law continues to be a live legal and legislative issue today.', primarySource: 'Maine Indian Claims Settlement Act, Pub. L. 96-420 (1980)', scenario: 'A treaty signed in one century is interpreted in another. Why is who interprets the document almost as important as what it says?' },
            { id: 'carson', title: 'Rachel Carson', icon: '\ud83c\udf3f', year: 1962, summary: 'Silent Spring and the modern environmental movement.', body: 'Rachel Carson lived and wrote part-time on Southport Island, Maine. Her 1962 book Silent Spring documented how the pesticide DDT was killing birds and entering the human food supply. The chemical industry attacked her work; later studies confirmed her findings. DDT was banned for agricultural use in 1972, and the Environmental Protection Agency was created in 1970, partly in response to the book\'s impact.', primarySource: 'Carson, Silent Spring (Houghton Mifflin, 1962)', scenario: 'Carson did not march or sit in. She wrote a book. How does that fit into the anatomy of dissent from the earlier section?' },
            { id: 'mainesuffrage', title: 'Equal Suffrage League of Maine', icon: '\ud83d\udcdd', year: 1914, summary: 'Maine\'s long road to the 19th Amendment.', body: 'The Equal Suffrage League of Maine, founded in 1914, organized petitions, public speeches, and lobbying for women\'s right to vote in Maine. A 1917 state referendum to grant women the vote in Maine failed by a wide margin. Maine eventually ratified the 19th Amendment on November 5, 1919, before federal ratification took effect in 1920.', primarySource: 'Maine State Library; Maine Historical Society records', scenario: 'Maine voters rejected suffrage in 1917 and the Maine legislature ratified it two years later. What does that gap tell you about how a state changes its mind?' }
          ]
        },
        {
          id: 'reflection', label: 'Reflection', icon: '\ud83e\udd14',
          intro: 'Three prompts that draw across the previous sections. Pick any or all.',
          items: [
            { id: 'r1', title: 'Pair a Foundation with a Case Study', icon: '\ud83d\udd17', summary: 'Connect a right on paper to a movement that fought for it.', body: 'Choose one item from Foundations and one from Case Studies. Explain how the case study helped the right become real for more people.', scenario: 'Example pairing: Equal Protection (Foundation) and Selma to Montgomery (Case Study). Equal protection existed in the Constitution since 1868, but the Voting Rights Act of 1965 was needed to make it real for Black voters in the South. Pick your own pairing and explain it.' },
            { id: 'r2', title: 'Anatomy in Action', icon: '\ud83d\udd0d', summary: 'Spot one of the four tools at work.', body: 'Petition, assembly, speech, civil disobedience. Pick one. Describe a time you saw it used, in school, in the news, or in a history class. What did it look like? What did it cost the people who used it?', scenario: 'Be specific. "A speech by a person whose name you know" is more useful than "people speak out."' },
            { id: 'r3', title: 'A First Step', icon: '\ud83d\udeb6', summary: 'An issue you care about, and the right tool to start with.', body: 'Pick one issue you care about, in school or in your community. Which of the four tools from Anatomy of Dissent would you use as the first step, and why that one and not the others?', scenario: 'A first step does not have to be a big one. A petition that goes nowhere can still teach you who has the power to change the thing.' }
          ]
        }
      ]
    },
    high: {
      title: 'International Human Rights',
      intro: 'The Universal Declaration of Human Rights (UDHR), adopted in 1948, outlines fundamental rights for all people everywhere. Understanding the difference between civil liberties and civil rights is essential for informed citizenship.',
      rights: [
        { right: 'Right to Life, Liberty, and Security (UDHR Article 3)', icon: '\ud83c\udf0d', explain: 'Every human being has the right to live, to be free, and to feel safe. This is the foundation of all other rights. Civil liberties protect you FROM government overreach; civil rights protect your EQUAL treatment by government.', responsibility: 'Advocate for the safety and freedom of all people, especially those whose rights are threatened.', scenario: 'A government argues that restricting certain freedoms is necessary for national security. Where should the line be drawn between safety and liberty? Use a real-world example to support your argument.' },
        { right: 'Freedom from Discrimination (UDHR Article 2)', icon: '\u2696\ufe0f', explain: 'Everyone is entitled to all rights regardless of race, color, sex, language, religion, political opinion, national origin, property, birth, or other status. This right has been central to every civil rights movement in history.', responsibility: 'Examine your own biases. Actively work against systems that produce unequal outcomes.', scenario: 'A company uses an AI hiring tool that unintentionally screens out candidates from certain racial backgrounds. The company did not intend to discriminate. Is this still a rights violation? Why?' },
        { right: 'Right to Education (UDHR Article 26)', icon: '\ud83c\udf93', explain: 'Everyone has the right to education. Elementary education shall be free and compulsory. Higher education shall be equally accessible based on merit. Around the world, 244 million children are still out of school.', responsibility: 'Value your education. Advocate for educational equity in your community and globally.', scenario: 'Two schools in the same city receive vastly different funding because of property tax differences. One has new technology; the other has outdated textbooks. Is this a human rights issue? What solutions exist?' },
        { right: 'Freedom of Thought and Expression (UDHR Articles 18-19)', icon: '\ud83d\udce3', explain: 'Everyone has the right to freedom of thought, conscience, and religion, and the right to seek, receive, and share information. In the digital age, this right intersects with issues of censorship, misinformation, and platform regulation.', responsibility: 'Use your expression to contribute to truth and understanding. Seek multiple sources. Think critically.', scenario: 'A social media platform removes posts that contain certain political viewpoints, saying they violate community standards. Users say this is censorship. The platform says it is a private company, not the government. Analyze both sides.' },
        { right: 'Right to Participate in Government (UDHR Article 21)', icon: '\ud83d\uddf3\ufe0f', explain: 'Everyone has the right to take part in their government, directly or through representatives. The will of the people shall be the basis of government authority, expressed through genuine periodic elections.', responsibility: 'Register to vote. Stay informed. Engage in civic life beyond just voting \u2014 attend meetings, contact officials, run for office.', scenario: 'In your state, formerly incarcerated people cannot vote even after serving their sentence. Some say this is fair punishment; others say it undermines democracy. Research both positions and form your own argument.' }
      ]
    }
  };

  // ── NEW: Service Learning Project Planner Data ──

  var SERVICE_TEMPLATES = [
    {
      id: 'food_drive', title: '\ud83c\udf5e Food Drive', desc: 'Collect and distribute food to those in need',
      steps: [
        { phase: 'Need', task: 'Research local food insecurity: How many families in your area face food insecurity? Contact a local food bank to learn about their needs.' },
        { phase: 'Research', task: 'Find out what foods are most needed (non-perishable, protein, canned vegetables). Learn about food safety and donation guidelines.' },
        { phase: 'Plan', task: 'Set a goal (e.g., 200 items). Create collection boxes, flyers, and a timeline. Assign roles to team members. Get permission from your school.' },
        { phase: 'Action', task: 'Run the drive for 2-3 weeks. Track donations daily. Send reminders and updates. Organize a sorting and delivery day.' },
        { phase: 'Reflect', task: 'How many items were collected? How many families were served? What did you learn? What would you do differently next time?' }
      ]
    },
    {
      id: 'park_cleanup', title: '\ud83c\udf33 Park Cleanup', desc: 'Organize a community park or beach cleanup',
      steps: [
        { phase: 'Need', task: 'Visit local parks and document litter, damage, or neglect. Take photos. Talk to park visitors about what they notice.' },
        { phase: 'Research', task: 'Learn about local environmental impacts of litter. Contact your parks department about volunteer guidelines and supplies.' },
        { phase: 'Plan', task: 'Choose a date, location, and time. Get supplies (bags, gloves, grabbers). Create sign-up sheets. Plan for water and snacks. Arrange adult supervision.' },
        { phase: 'Action', task: 'Lead the cleanup. Separate recyclables. Document before-and-after with photos. Track bags of trash collected.' },
        { phase: 'Reflect', task: 'How much trash was collected? What types of litter were most common? How can the community prevent this? Write about the experience.' }
      ]
    },
    {
      id: 'tutoring', title: '\ud83d\udcda Tutoring Program', desc: 'Help younger students with reading or math',
      steps: [
        { phase: 'Need', task: 'Talk to teachers at a local elementary school about which students need extra help. Identify subjects where tutoring would make the biggest difference.' },
        { phase: 'Research', task: 'Learn effective tutoring strategies. Practice explaining concepts in simple terms. Gather materials and practice activities.' },
        { phase: 'Plan', task: 'Set a schedule (e.g., twice a week for 6 weeks). Match tutors with students. Create lesson plans. Get background checks and permissions as needed.' },
        { phase: 'Action', task: 'Tutor consistently. Track each student\'s progress. Adjust your approach based on what works. Communicate with teachers and parents.' },
        { phase: 'Reflect', task: 'How did your students improve? What tutoring methods worked best? How did this experience change your own understanding of the subject?' }
      ]
    },
    {
      id: 'supply_drive', title: '\ud83c\udf92 School Supply Drive', desc: 'Collect supplies for students who cannot afford them',
      steps: [
        { phase: 'Need', task: 'Research how many students at local schools qualify for free lunch (an indicator of need). Ask counselors what supplies are most needed.' },
        { phase: 'Research', task: 'Create a list of most-needed supplies with price ranges. Research wholesale options. Identify potential donors (businesses, community groups).' },
        { phase: 'Plan', task: 'Set goals for number of supply kits. Design collection points and donation boxes. Create a budget. Plan an assembly or distribution event.' },
        { phase: 'Action', task: 'Run the drive. Send donation letters to local businesses. Organize supplies into kits. Distribute them discreetly to respect student privacy.' },
        { phase: 'Reflect', task: 'How many kits were distributed? What was the community response? How can this become an annual project? What systemic issues did you notice?' }
      ]
    }
  ];

  var SERVICE_PHASES = [
    { id: 'need', label: '\ud83d\udd0d Need', desc: 'Identify the community need' },
    { id: 'research', label: '\ud83d\udcda Research', desc: 'Learn about the issue' },
    { id: 'plan', label: '\ud83d\udcdd Plan', desc: 'Create your action plan' },
    { id: 'action', label: '\u26a1 Action', desc: 'Carry out your project' },
    { id: 'reflect', label: '\ud83d\udcad Reflect', desc: 'Evaluate your impact' }
  ];

  // ── NEW: Badges (expanded) ──

  var BADGES = [
    { id: 'first_issue', icon: '\ud83c\udf0d', label: 'First Issue', desc: 'Explored your first civic issue' },
    { id: 'action_planner', icon: '\ud83d\udcdd', label: 'Action Planner', desc: 'Created a civic action plan' },
    { id: 'quiz_champion', icon: '\ud83c\udfc6', label: 'Quiz Champion', desc: 'Scored 100% on a civic quiz' },
    { id: 'changemaker', icon: '\u2728', label: 'Changemaker', desc: 'Completed a community change scenario' },
    { id: 'civic_champion', icon: '\ud83c\udde8', label: 'Civic Champion', desc: 'Explored all tabs in Civic Action & Hope' },
    { id: 'hope_keeper', icon: '\ud83c\udf05', label: 'Hope Keeper', desc: 'Wrote your vision for the future' },
    { id: 'empathy_leader', icon: '\u2764\ufe0f', label: 'Empathy Leader', desc: 'Explored 5 or more civic issues' },
    { id: 'scenario_master', icon: '\ud83c\udfad', label: 'Scenario Master', desc: 'Completed all scenarios for your grade band' },
    { id: 'civic_simulator', icon: '\ud83c\udfdb\ufe0f', label: 'Civic Simulator', desc: 'Completed a civic simulation' },
    { id: 'survey_creator', icon: '\ud83d\udcca', label: 'Survey Creator', desc: 'Built and exported a community survey' },
    { id: 'rights_scholar', icon: '\ud83d\udcdc', label: 'Rights Scholar', desc: 'Explored all rights in your grade band' },
    { id: 'service_leader', icon: '\ud83e\udd1d', label: 'Service Leader', desc: 'Completed a service learning project plan' },
    { id: 'democracy_champion', icon: '\ud83c\uddfa\ud83c\uddf8', label: 'Democracy Champion', desc: 'Engaged with all civic tools' },
  ];

  // ── NEW: Template Letters ──

  var LETTER_TEMPLATES = {
    principal: { title: 'Letter to Principal', greeting: 'Dear Principal [Name],', body: 'I am writing to you as a student at [School Name] because I care about our school community. I have noticed [describe the issue] and I believe it is important because [explain why it matters].\n\nI have some ideas for how we could address this:\n1. [First suggestion]\n2. [Second suggestion]\n3. [Third suggestion]\n\nI would welcome the opportunity to discuss this with you further. Thank you for your time and for the work you do for our school.\n\nSincerely,\n[Your Name]\n[Grade/Class]' },
    school_board: { title: 'Letter to School Board', greeting: 'Dear Members of the [District] School Board,', body: 'My name is [Your Name] and I am a student at [School Name]. I am writing to bring your attention to [describe the issue] because it affects students like me every day.\n\nHere is what I have observed:\n- [Observation 1]\n- [Observation 2]\n- [Observation 3]\n\nI believe our district can do better. I propose that [describe your proposed solution]. Research shows that [cite any evidence you have found].\n\nI would be willing to present at a board meeting if given the opportunity. Students deserve a voice in the decisions that affect their education.\n\nRespectfully,\n[Your Name]\n[School and Grade]' },
    elected: { title: 'Letter to Elected Official', greeting: 'Dear [Title] [Last Name],', body: 'My name is [Your Name] and I am a [grade] student and constituent living in [City/Town]. I am writing regarding [describe the issue or legislation].\n\nThis issue matters to me because [explain personal connection]. It also affects my community in the following ways:\n- [Impact 1]\n- [Impact 2]\n- [Impact 3]\n\nI respectfully ask that you [specific action you want them to take]. As young people, we may not all be old enough to vote, but our voices and futures matter.\n\nThank you for your service and for listening to your constituents.\n\nSincerely,\n[Your Name]\n[Address]' }
  };

  // ── Registration ──

  window.SelHub.registerTool('civicAction', {
    icon: '\u270a',
    label: 'Civic Action & Hope',
    desc: 'Process hard feelings about injustice, build civic agency, and cultivate hope through action.',
    color: 'teal',
    category: 'stewardship',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['civicAction']) || {};
      var upd = function(key, val) { ctx.update('civicAction', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('civicAction', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var Heart = ctx.icons.Heart;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';
      var onSafetyFlag = ctx.onSafetyFlag || null;

      // Triangulated safety assessment of student-typed input. Civic topics
      // (racism, immigration fears, school safety, family separation) can
      // surface real distress, so we route any free-text student input through
      // the same pipeline as upstander/coping/journal.
      var _runSafetyAssess = function(userInput, scope) {
        if (!window.SelHub || !window.SelHub.assessSafety || !userInput) return;
        window.SelHub.assessSafety(userInput, gradeBand, 'civicaction', callGemini)
          .catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
          .then(function(_safety) {
            _safety = _safety || { tier: 0 };
            if (_safety.tier >= 2 && onSafetyFlag) {
              onSafetyFlag({
                category: 'ai_civicaction_' + (scope || 'general') + '_' + (_safety.category || 'concerning'),
                match: _safety.rationale || 'SEL civic action safety concern',
                severity: _safety.tier >= 3 ? 'critical' : 'medium',
                source: 'sel_civicaction',
                context: userInput.substring(0, 100),
                timestamp: new Date().toISOString(),
                aiGenerated: true,
                confidence: _safety.tier >= 3 ? 0.9 : 0.7,
                tier: _safety.tier
              });
            }
            upd('_civicTier', _safety.tier || 0);
          });
      };

      var tab = d.tab || 'feelings';
      var selectedFeeling = d.feeling || null;
      var selectedCoping = d.coping || null;
      var aiResponse = d.aiResponse || null;
      var _civicTier = d._civicTier || 0;
      var aiLoading = d.aiLoading || false;
      var actionPlan = d.actionPlan || null;

      // New state vars
      var selectedIssue = d.selectedIssue || null;
      var quizIdx = d.quizIdx || 0;
      var quizAnswer = d.quizAnswer;
      var quizScore = d.quizScore || 0;
      var quizDone = d.quizDone || false;
      var quizAnswered = d.quizAnswered || false;
      var scenarioIdx = d.scenarioIdx || 0;
      var scenarioChoice = d.scenarioChoice;
      var scenarioScore = d.scenarioScore || 0;
      var scenarioDone = d.scenarioDone || false;
      var scenarioChosen = d.scenarioChosen || false;
      var plannerStep = d.plannerStep || 0;
      var plannerData = d.plannerData || {};
      var selectedTemplate = d.selectedTemplate || null;
      var earnedBadges = d.earnedBadges || [];

      // New feature state vars
      var simStep = d.simStep || 0;
      var simChoices = d.simChoices || {};
      var simDone = d.simDone || false;
      var budgetAlloc = d.budgetAlloc || null;
      var legBill = d.legBill || null;
      var legAllies = d.legAllies || [];
      var legAnswers = d.legAnswers || {};
      var legStep = d.legStep || 0;
      var legSupport = d.legSupport || 0;
      var surveyQuestions = d.surveyQuestions || [];
      var surveyCustomQ = d.surveyCustomQ || '';
      var surveyCustomType = d.surveyCustomType || 'open';
      var surveyCustomOpts = d.surveyCustomOpts || '';
      var surveyTitle = d.surveyTitle || '';
      var surveyExported = d.surveyExported || false;
      var rightsIdx = d.rightsIdx || 0;
      var rightsExplored = d.rightsExplored || [];
      var rightsScenarioAnswer = d.rightsScenarioAnswer || '';
      var rightsSection = d.rightsSection || 'foundations';
      var rightsExploredBySection = d.rightsExploredBySection || {};
      var serviceTemplate = d.serviceTemplate || null;
      var servicePhase = d.servicePhase || 0;
      var serviceNotes = d.serviceNotes || {};
      var serviceHours = d.serviceHours || 0;
      var serviceDone = d.serviceDone || false;

      var actions = CIVIC_ACTIONS[gradeBand] || CIVIC_ACTIONS.elementary;
      var issues = CIVIC_ISSUES[gradeBand] || CIVIC_ISSUES.elementary;
      var quizQuestions = CIVIC_QUIZ[gradeBand] || CIVIC_QUIZ.elementary;
      var scenarios = CHANGE_SCENARIOS[gradeBand] || CHANGE_SCENARIOS.elementary;
      var changemakers = CHANGEMAKERS[gradeBand] || CHANGEMAKERS.elementary;
      var simData = CIVIC_SIMULATIONS[gradeBand] || CIVIC_SIMULATIONS.elementary;
      var surveyTemplates = SURVEY_TEMPLATES[gradeBand] || SURVEY_TEMPLATES.elementary;
      var rightsInfo = RIGHTS_DATA[gradeBand] || RIGHTS_DATA.elementary;

      // ── Badge helper ──
      var awardBadge = function(badgeId) {
        if (earnedBadges.indexOf(badgeId) === -1) {
          var newBadges = earnedBadges.concat([badgeId]);
          upd('earnedBadges', newBadges);
          var badge = BADGES.find(function(b) { return b.id === badgeId; });
          if (badge) {
            addToast(badge.icon + ' Badge earned: ' + badge.label + '!', 'success');
            ctx.awardXP(10);
          }
        }
      };

      // ── AI counselor ──
      var askCounselor = function(question) {
        if (!callGemini) return;
        upd('aiLoading', true);
        var feeling = FEELINGS_MAP.find(function(f) { return f.id === selectedFeeling; });
        var prompt = 'You are a compassionate school counselor helping a ' + (gradeLevel || '5th grade') + ' student. ' +
          (feeling ? 'They are feeling ' + feeling.label.toLowerCase() + '. ' : '') +
          'They say: "' + question + '"\n\n' +
          'Respond with warmth and validation. Acknowledge their feelings without minimizing them. ' +
          'Offer 1-2 practical, age-appropriate suggestions. Keep it brief (3-4 sentences). ' +
          'Do NOT suggest they just "think positive." Validate the difficulty of what they are experiencing.';
        _runSafetyAssess(question, 'counselor');
        callGemini(prompt).then(function(resp) {
          updMulti({ aiResponse: resp, aiLoading: false });
        }).catch(function() {
          updMulti({ aiResponse: 'Your feelings are valid. Take a breath \u2014 we can work through this together.', aiLoading: false });
        });
      };

      // ── Generate personalized action plan ──
      var generateActionPlan = function() {
        if (!callGemini) return;
        upd('aiLoading', true);
        var feeling = FEELINGS_MAP.find(function(f) { return f.id === selectedFeeling; });
        var issue = d.issueText || '';
        var prompt = 'A ' + (gradeLevel || '5th grade') + ' student feels ' + (feeling ? feeling.label.toLowerCase() : 'concerned about the world') + '. ' +
          (issue ? 'They care about this issue: "' + issue + '". ' : '') +
          'Create a personalized, age-appropriate civic action plan with 3 concrete steps they can take this week. ' +
          'Each step should be specific, achievable, and empowering. ' +
          'Frame it as: "You have more power than you think." ' +
          'Return ONLY JSON: {"steps": [{"action": "what to do", "why": "why it matters", "how": "specific how-to"}]}';
        _runSafetyAssess(issue, 'actionplan');
        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) { cleaned = cleaned.split('```')[1] || cleaned; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); }
            var plan = JSON.parse(cleaned);
            updMulti({ actionPlan: plan, aiLoading: false });
            addToast('Your action plan is ready!', 'success');
            ctx.awardXP(10);
          } catch(e) { upd('aiLoading', false); }
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Planner steps ──
      var PLANNER_STEPS = [
        { id: 'identify', label: '\ud83d\udd0d Identify the Issue', prompt: 'What issue do you want to address? Be specific about what you see and who is affected.' },
        { id: 'research', label: '\ud83d\udcda Research', prompt: 'What do you need to learn? List 3 questions you want to answer about this issue.' },
        { id: 'stakeholders', label: '\ud83e\udd1d Map Stakeholders', prompt: 'Who has the power to make change? Who is affected? Who are your allies?' },
        { id: 'strategy', label: '\ud83c\udfaf Choose a Strategy', prompt: 'How will you create change? (Letter writing, petition, event, presentation, media, etc.)' },
        { id: 'action', label: '\u26a1 Take Action', prompt: 'Write out your specific action steps with dates and who will do each one.' },
        { id: 'reflect', label: '\ud83d\udcad Reflect', prompt: 'What did you learn? What worked? What would you do differently next time?' },
      ];

      // ═══════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════

      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),

        // ── Header ──
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', Object.assign({ 'aria-label': 'Back to SEL Hub', className: 'p-2 rounded-full hover:bg-teal-100 text-teal-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })),
              h(ArrowLeft, { size: 20 })
            ),
            h('div', null,
              h('h2', { className: 'text-xl font-black text-slate-800' }, '\u270a Civic Action & Hope'),
              h('p', { className: 'text-xs text-slate-600' }, 'Your feelings are valid. Your voice matters. Your actions count.')
            )
          )
        ),

        // ── Badges ribbon ──
        earnedBadges.length > 0 && h('div', { className: 'flex gap-2 flex-wrap bg-amber-50 border border-amber-200 rounded-xl p-2' },
          h('span', { className: 'text-[10px] font-bold text-amber-600 uppercase self-center' }, 'Badges:'),
          earnedBadges.map(function(bid) {
            var badge = BADGES.find(function(b) { return b.id === bid; });
            if (!badge) return null;
            return h('span', { key: bid, className: 'inline-flex items-center gap-1 bg-white border border-amber-300 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-700', title: badge.desc }, badge.icon, ' ', badge.label);
          })
        ),

        // ── Tab Navigation ──
        h('div', { role: 'tablist', className: 'flex gap-1 bg-teal-50 rounded-xl p-1 border border-teal-200 overflow-x-auto' },
          TABS.map(function(t) {
            return h('button', { 'aria-label': t.label,
              key: t.id,
              role: 'tab', 'aria-selected': tab === t.id,
              onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ' +
                (tab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-teal-600/60 hover:text-teal-700')
            }, t.label);
          })
        ),

        // ── Topic-accent hero band per tab ──
        (function() {
          var TAB_META = {
            feelings:   { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)',  icon: '\uD83D\uDCAD', title: 'Name It \u2014 the feelings underneath the news',          hint: 'Civic pain is REAL pain. Lieberman 2007 fMRI: naming a feeling lights up the prefrontal cortex and quiets the amygdala. \u201CI\u2019m anxious about the future\u201D works on the brain the same way \u201CI\u2019m anxious about the test\u201D does.' },
            understand: { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',   icon: '\uD83D\uDD0D', title: 'Understand It \u2014 why this hits YOU',                    hint: 'Different issues land different on different people \u2014 history, identity, lived experience all shape the response. Self-knowledge here is what separates effective civic action from performance.' },
            cope:       { accent: '#10b981', soft: 'rgba(16,185,129,0.10)',  icon: '\uD83C\uDF3F', title: 'Cope \u2014 hold the heavy without breaking',              hint: 'Activists burn out at higher rates than the general population (Plyler 2007). Sustainable change requires sustainable people. The coping is not separate from the action \u2014 it IS the long game.' },
            explore:    { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)',  icon: '\uD83C\uDF0D', title: 'Explore Issues \u2014 learn before you advocate',           hint: 'Ballotpedia, ProPublica, Reuters, AP, BBC \u2014 source diversity matters. The Pew media-bias chart is a useful starting tool, but no source is neutral. Triangulate. Cite primary documents when possible.' },
            act:        { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',   icon: '\u270A',         title: 'Act \u2014 turn feelings into specific moves',          hint: 'Vote, call/email reps, attend a town hall, organize on a campus issue, work the polls, sign a petition with a citation. Specific > general. \u201CI care about climate\u201D \u2192 \u201CI emailed Sen. Collins about LD-1850.\u201D' },
            planner:    { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)',  icon: '\uD83D\uDCDD', title: 'Plan \u2014 your civic action plan',                       hint: 'Implementation intentions (Gollwitzer 1999): \u201CIf my representative\u2019s vote is X, I will respond with Y by Z date.\u201D Pre-commitment doubles follow-through over good intentions alone.' },
            simulation: { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)',  icon: '\uD83C\uDFDB', title: 'Simulate \u2014 walk a decision in real terms',          hint: 'City budget allocation, town-hall mediation, school-board vote. Decisions look different from inside; tradeoffs land different when you have to MAKE them, not just react to them. Reduces \u201Cthey just don\u2019t care\u201D framing.' },
            survey:     { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',   icon: '\uD83D\uDCCA', title: 'Survey \u2014 build your own data',                       hint: 'Listening + measuring beats assuming. Question wording matters enormously (Schuman + Presser 1981). Pilot with 5 people before sending wide. The survey is half the civic skill; reading the responses is the other half.' },
            rights:     { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)',  icon: '\uD83D\uDCDC', title: 'Rights & Dissent \u2014 the legal scaffolding',           hint: '1st Amendment (speech, press, assembly, petition); UDHR 1948; ACLU + EFF + Amnesty primary sources. Peaceful dissent has a track record \u2014 Gandhi, MLK, Mandela. Knowing your rights changes the room when authority oversteps.' },
            service:    { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)',  icon: '\uD83E\uDD1D', title: 'Service \u2014 plan a service-learning project',         hint: 'Best service-learning (Eyler + Giles 1999) integrates ACADEMIC content + community impact + structured reflection. Not volunteerism with extra steps \u2014 a designed loop where the service teaches and the learning serves.' },
            quiz:       { accent: '#fbbf24', soft: 'rgba(251,191,36,0.10)',  icon: '\uD83C\uDFC6', title: 'Quiz \u2014 civic knowledge check',                       hint: 'Civic knowledge (3 branches, levels of govt, Bill of Rights, voting mechanics) predicts civic engagement more than political opinion. NCSS C3 Framework + Civic Mission of Schools 2003.' },
            scenarios:  { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',   icon: '\uD83C\uDFAD', title: 'Scenarios \u2014 community-change practice',              hint: 'Lower-stakes practice for higher-stakes real moments. Try the school-board ask, the call to a rep, the response to a friend\u2019s misinformation. Behavioral rehearsal (Bandura 1977) lowers freezing.' },
            hope:       { accent: '#0d9488', soft: 'rgba(13,148,136,0.10)',  icon: '\uD83C\uDF05', title: 'Hope \u2014 the long-arc commitment',                     hint: 'Snyder\u2019s hope theory (1991): goals + pathways + agency. Cynicism feels safer; hope IS more accurate over long timelines. Organizers who lasted decades (Ella Baker, Bayard Rustin, Dolores Huerta) all kept this fire lit.' }
          };
          var meta = TAB_META[tab] || TAB_META.feelings;
          return h('div', {
            style: {
              margin: '12px 0 0',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══ NAME IT — Feelings ═══
        tab === 'feelings' && h('div', { className: 'space-y-4' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'What are you feeling right now? There are no wrong answers.'),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            FEELINGS_MAP.map(function(f) {
              var isSelected = selectedFeeling === f.id;
              return h('button', { 'aria-label': f.emoji,
                key: f.id,
                onClick: function() { upd('feeling', f.id); ctx.awardXP(3); },
                className: 'p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ' +
                  (isSelected ? 'shadow-lg ring-2 ring-offset-1' : 'bg-white hover:shadow-md'),
                style: { borderColor: isSelected ? f.color : '#e2e8f0', background: isSelected ? f.color + '15' : 'white', '--tw-ring-color': f.color }
              },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, f.emoji),
                  h('span', { className: 'font-bold text-sm text-slate-800' }, f.label)
                )
              );
            })
          ),

          // Validation message
          selectedFeeling && h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 p-5' },
            (function() {
              var f = FEELINGS_MAP.find(function(ff) { return ff.id === selectedFeeling; });
              if (!f) return null;
              return h('div', { className: 'space-y-3' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-2xl' }, f.emoji),
                  h('h4', { className: 'font-bold text-sm text-teal-800' }, 'Your feeling is valid')
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, f.validation),
                h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200' },
                  h('p', { className: 'text-xs text-teal-700 italic' }, '\ud83d\udca1 ', f.reframe)
                ),
                callTTS && h('button', { 'aria-label': 'Hear this read aloud',
                  onClick: function() { callTTS(f.validation + ' ' + f.reframe); },
                  className: 'text-[10px] text-teal-500 hover:text-teal-700 font-bold'
                }, '\ud83d\udd0a Hear this read aloud')
              );
            })()
          ),

          // Free write
          h('div', { className: 'bg-slate-50 rounded-xl border border-slate-400 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\ud83d\udcdd What is on your mind? (private)'),
            h('textarea', {
              value: d.freeWrite || '',
              onChange: function(e) { upd('freeWrite', e.target.value); },
              placeholder: 'Write freely about what you are thinking and feeling. Nobody will see this unless you choose to share it.',
              className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-teal-300',
              'aria-label': 'Free write about your feelings'
            })
          ),

          // AI counselor
          d.freeWrite && d.freeWrite.length > 20 && h('button', { 'aria-label': 'Why Does This Matter to Me?',
            onClick: function() { askCounselor(d.freeWrite); },
            disabled: aiLoading,
            className: 'w-full px-4 py-2 bg-teal-50 border border-teal-600 rounded-lg text-xs font-bold text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
          }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '\ud83d\udcac Talk to AI Counselor about this')
        ),

        // ═══ UNDERSTAND IT ═══
        tab === 'understand' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83d\udd0d Why Does This Matter to Me?'),
            h('p', { className: 'text-sm text-slate-600' }, 'Understanding why you care is the first step toward meaningful action.')
          ),

          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-4' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'What issue or injustice concerns you most right now?'),
              h('input', {
                type: 'text', value: d.issueText || '',
                onChange: function(e) { upd('issueText', e.target.value); },
                placeholder: 'e.g., climate change, inequality, bullying, gun violence, housing...',
                className: 'w-full text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Issue you care about'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Why does this matter to you personally?'),
              h('textarea', {
                value: d.whyItMatters || '',
                onChange: function(e) { upd('whyItMatters', e.target.value); },
                placeholder: 'Connect this issue to your life, your values, or people you care about...',
                className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Why it matters to you'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Who is most affected by this issue?'),
              h('textarea', {
                value: d.whoAffected || '',
                onChange: function(e) { upd('whoAffected', e.target.value); },
                placeholder: 'Think about the people and communities most impacted...',
                className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Who is affected'
              })
            )
          ),

          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-sm text-amber-800 italic' },
              '"The world is not dangerous because of those who do harm, but because of those who look at it without doing anything." \u2014 Albert Einstein'
            )
          )
        ),

        // ═══ COPE ═══
        tab === 'cope' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udf3f Healthy Ways to Hold Hard Feelings'),
            h('p', { className: 'text-sm text-slate-600' }, 'You do not have to fix the world to take care of yourself.')
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            COPING_STRATEGIES.map(function(strategy) {
              var isExpanded = selectedCoping === strategy.id;
              return h('div', {                 key: strategy.id,
                className: 'rounded-2xl border-2 overflow-hidden transition-all ' +
                  (isExpanded ? 'border-teal-400 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-300')
              },
                h('button', { 'aria-label': strategy.label,
                  onClick: function() { upd('coping', isExpanded ? null : strategy.id); if (!isExpanded) ctx.awardXP(3); },
                  className: 'w-full p-4 text-left'
                },
                  h('div', { className: 'font-bold text-sm text-slate-800' }, strategy.label),
                  h('div', { className: 'text-[10px] text-slate-600 mt-0.5 uppercase font-bold' }, strategy.category)
                ),
                isExpanded && h('div', { className: 'px-4 pb-4 space-y-2' },
                  strategy.steps.map(function(step, si) {
                    return h('div', { key: si, className: 'flex items-start gap-2 text-xs text-slate-700' },
                      h('span', { className: 'text-teal-500 font-bold mt-0.5 shrink-0' }, (si + 1) + '.'),
                      h('span', { className: 'leading-relaxed' }, step)
                    );
                  })
                )
              );
            })
          )
        ),

        // ═══ EXPLORE ISSUES (NEW) ═══
        tab === 'explore' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udf0d Explore Civic Issues'),
            h('p', { className: 'text-sm text-slate-600' }, 'Learn about issues that affect your community and the world. (' + gradeBand + ' level)')
          ),

          !selectedIssue && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            issues.map(function(issue) {
              return h('button', { 'aria-label': issue.emoji,
                key: issue.id,
                onClick: function() {
                  upd('selectedIssue', issue.id);
                  awardBadge('first_issue');
                  ctx.awardXP(5);
                  // Track explored issues for empathy leader badge
                  var explored = (d.exploredIssues || []).slice();
                  if (explored.indexOf(issue.id) === -1) explored.push(issue.id);
                  upd('exploredIssues', explored);
                  if (explored.length >= 5) awardBadge('empathy_leader');
                },
                className: 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-left transition-all hover:border-teal-600 hover:shadow-md hover:scale-[1.01]'
              },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, issue.emoji),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, issue.title),
                    h('p', { className: 'text-xs text-slate-600 mt-0.5' }, issue.desc)
                  )
                )
              );
            })
          ),

          selectedIssue && (function() {
            var issue = issues.find(function(i) { return i.id === selectedIssue; });
            if (!issue) return null;
            return h('div', { className: 'space-y-4' },
              h('button', { 'aria-label': issue.emoji,
                onClick: function() { upd('selectedIssue', null); },
                className: 'text-xs text-teal-600 font-bold hover:text-teal-800 flex items-center gap-1'
              }, h(ArrowLeft, { size: 14 }), 'Back to all issues'),

              h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-6 space-y-4' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-4xl' }, issue.emoji),
                  h('div', null,
                    h('h3', { className: 'text-lg font-black text-slate-800' }, issue.title),
                    h('p', { className: 'text-sm text-slate-600' }, issue.desc)
                  )
                ),
                h('div', { className: 'bg-teal-50 rounded-xl p-4 border border-teal-200' },
                  h('h4', { className: 'text-xs font-bold text-teal-700 uppercase tracking-widest mb-1' }, '\u2764\ufe0f Why It Matters'),
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, issue.why)
                ),
                h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200' },
                  h('h4', { className: 'text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1' }, '\u270a What You Can Do'),
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, issue.act)
                ),
                callTTS && h('button', { 'aria-label': 'Hear this read aloud',
                  onClick: function() { callTTS(issue.title + '. ' + issue.why + ' ' + issue.act); },
                  className: 'text-[10px] text-teal-500 hover:text-teal-700 font-bold'
                }, '\ud83d\udd0a Hear this read aloud')
              )
            );
          })()
        ),

        // ═══ ACT ═══
        tab === 'act' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\u270a Turn Feelings Into Action'),
            h('p', { className: 'text-sm text-slate-600' }, 'You have more power than you think. Here are concrete steps you can take.')
          ),

          // Action cards
          h('div', { className: 'space-y-2' },
            actions.map(function(a, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-slate-400 p-4 flex items-start gap-3 hover:border-teal-300 transition-colors' },
                h('div', { className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0' }, a.impact),
                h('div', { className: 'flex-1' },
                  h('p', { className: 'text-sm text-slate-800 font-medium' }, a.action),
                  h('span', { className: 'text-[10px] text-amber-500' }, a.difficulty)
                )
              );
            })
          ),

          // Personalized action plan
          h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-teal-700 mb-2 flex items-center gap-2' }, h(Sparkles, { size: 14 }), 'Get a Personalized Action Plan'),
            d.issueText && h('p', { className: 'text-xs text-slate-600 mb-3' }, 'Based on your concern about: "' + d.issueText + '"'),
            h('button', { 'aria-label': aiLoading ? 'Creating your plan...' : '\u2728 Generate My Action Plan',
              onClick: generateActionPlan,
              disabled: aiLoading,
              className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-2'
            }, aiLoading ? 'Creating your plan...' : '\u2728 Generate My Action Plan'),

            // Display action plan — always-rendered live region so screen readers
            // announce arrival even before the plan exists. aria-busy flips during load.
            h('div', { role: 'region', 'aria-label': 'Civic action plan', 'aria-live': 'polite', 'aria-busy': aiLoading ? 'true' : 'false', className: 'mt-4 space-y-3' },
              actionPlan && actionPlan.steps && actionPlan.steps.map(function(step, i) {
                return h('div', { key: i, className: 'bg-white rounded-xl border border-teal-200 p-3' },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'bg-teal-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0' }, i + 1),
                    h('div', null,
                      h('p', { className: 'text-sm font-bold text-slate-800' }, step.action),
                      h('p', { className: 'text-xs text-slate-600 mt-1' }, step.why),
                      step.how && h('p', { className: 'text-xs text-teal-600 mt-1 font-medium' }, '\ud83d\udccb How: ' + step.how)
                    )
                  )
                );
              })
            )
          )
        ),

        // ═══ ACTION PLAN BUILDER (NEW) ═══
        tab === 'planner' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83d\udcdd Civic Action Plan Builder'),
            h('p', { className: 'text-sm text-slate-600' }, 'Build a step-by-step plan to create real change in your community.')
          ),

          // Progress bar
          h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
            h('div', { className: 'bg-teal-500 h-full rounded-full transition-all', style: { width: ((plannerStep + 1) / PLANNER_STEPS.length * 100) + '%' } })
          ),
          h('div', { className: 'flex justify-between text-[10px] text-slate-600 font-bold' },
            h('span', null, 'Step ' + (plannerStep + 1) + ' of ' + PLANNER_STEPS.length),
            h('span', null, PLANNER_STEPS[plannerStep].label)
          ),

          // Current step
          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-teal-700' }, PLANNER_STEPS[plannerStep].label),
            h('p', { className: 'text-xs text-slate-600' }, PLANNER_STEPS[plannerStep].prompt),
            h('textarea', {
              value: plannerData[PLANNER_STEPS[plannerStep].id] || '',
              onChange: function(e) {
                var newData = {};
                for (var k in plannerData) { if (plannerData.hasOwnProperty(k)) newData[k] = plannerData[k]; }
                newData[PLANNER_STEPS[plannerStep].id] = e.target.value;
                upd('plannerData', newData);
              },
              placeholder: 'Write your response here...',
              className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-28 outline-none focus:ring-2 focus:ring-teal-300',
              'aria-label': PLANNER_STEPS[plannerStep].label
            }),
            h('div', { className: 'flex justify-between' },
              plannerStep > 0 ? h('button', { 'aria-label': 'Previous',
                onClick: function() { upd('plannerStep', plannerStep - 1); },
                className: 'px-4 py-2 border border-slate-400 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50'
              }, '\u2190 Previous') : h('div'),
              plannerStep < PLANNER_STEPS.length - 1 ? h('button', { 
                onClick: function() { upd('plannerStep', plannerStep + 1); ctx.awardXP(5); },
                className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
              }, 'Next \u2192') : h('button', { 'aria-label': 'Next',
                onClick: function() {
                  awardBadge('action_planner');
                  ctx.awardXP(20);
                  addToast('Your civic action plan is complete! You are a changemaker.', 'success');
                  ctx.celebrate();
                },
                className: 'px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700'
              }, '\u2728 Complete My Plan')
            )
          ),

          // Template letters section
          h('div', { className: 'bg-gradient-to-r from-slate-50 to-teal-50 rounded-2xl border border-slate-400 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-slate-700' }, '\ud83d\udce8 Template Letters'),
            h('p', { className: 'text-xs text-slate-600' }, 'Use these templates to write a formal letter advocating for your issue.'),
            h('div', { className: 'flex gap-2 flex-wrap' },
              Object.keys(LETTER_TEMPLATES).map(function(key) {
                var tmpl = LETTER_TEMPLATES[key];
                return h('button', { 'aria-label': tmpl.title,
                  key: key,
                  onClick: function() { upd('selectedTemplate', selectedTemplate === key ? null : key); },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' +
                    (selectedTemplate === key ? 'bg-teal-700 text-white border-teal-600' : 'bg-white text-teal-600 border-teal-600 hover:bg-teal-50')
                }, tmpl.title);
              })
            ),
            selectedTemplate && (function() {
              var tmpl = LETTER_TEMPLATES[selectedTemplate];
              return h('div', { className: 'bg-white rounded-xl border border-slate-400 p-4 mt-2 space-y-2' },
                h('div', { className: 'text-sm font-bold text-slate-700' }, tmpl.title),
                h('div', { className: 'text-xs text-slate-600 italic' }, tmpl.greeting),
                h('pre', { className: 'text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed mt-2 bg-slate-50 rounded-lg p-3 border border-slate-100' }, tmpl.body),
                h('p', { className: 'text-[10px] text-slate-600 mt-1' }, 'Tip: Copy this template and customize the parts in [brackets] with your own words.')
              );
            })()
          ),

          // Petition creator
          h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-amber-700' }, '\u270d\ufe0f Petition Creator'),
            h('p', { className: 'text-xs text-slate-600' }, 'Draft a petition to gather support for your cause.'),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Petition Title'),
              h('input', {
                type: 'text',
                value: d.petitionTitle || '',
                onChange: function(e) { upd('petitionTitle', e.target.value); },
                placeholder: 'e.g., "Add Recycling Bins to Every Classroom"',
                className: 'w-full text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Petition title'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Why This Matters'),
              h('textarea', {
                value: d.petitionDesc || '',
                onChange: function(e) { upd('petitionDesc', e.target.value); },
                placeholder: 'Explain the problem and why this change is important...',
                className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Petition description'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'What We Are Asking For'),
              h('textarea', {
                value: d.petitionAsks || '',
                onChange: function(e) { upd('petitionAsks', e.target.value); },
                placeholder: '1. \n2. \n3. ',
                className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Petition asks'
              })
            ),
            d.petitionTitle && d.petitionDesc && h('button', { 'aria-label': 'Save Petition Draft',
              onClick: function() { addToast('Petition draft saved! Share it with classmates to gather support.', 'success'); ctx.awardXP(10); },
              className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700'
            }, '\ud83d\udcbe Save Petition Draft')
          )
        ),

        // ═══ CIVIC SIMULATION GAME (NEW) ═══
        tab === 'simulation' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udfdb\ufe0f ' + simData.title),
            h('p', { className: 'text-sm text-slate-600' }, simData.intro)
          ),

          // ── Elementary: School Council Meeting ──
          gradeBand === 'elementary' && !simDone && (function() {
            var proposals = simData.proposals;
            var currentProposal = proposals[simStep];
            if (!currentProposal) return null;
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'flex justify-between items-center' },
                h('span', { className: 'text-xs font-bold text-slate-600' }, 'Proposal ' + (simStep + 1) + ' of ' + proposals.length),
                h('span', { className: 'text-xs font-bold text-teal-600' }, 'Decisions made: ' + Object.keys(simChoices).length)
              ),
              h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                h('div', { className: 'bg-teal-500 h-full rounded-full transition-all', style: { width: ((simStep + 1) / proposals.length * 100) + '%' } })
              ),
              h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-4' },
                h('h4', { className: 'text-sm font-bold text-teal-700' }, '\ud83d\udcdd ' + currentProposal.title),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, currentProposal.desc),
                h('div', { className: 'space-y-2 mt-3' },
                  currentProposal.options.map(function(opt, oi) {
                    var chosen = simChoices[currentProposal.id];
                    var isChosen = chosen === oi;
                    var showResult = chosen !== undefined;
                    var btnClass = 'w-full p-3 rounded-xl border-2 text-left text-sm transition-all ';
                    if (showResult && isChosen) btnClass += 'border-teal-400 bg-teal-50 font-bold';
                    else if (!showResult) btnClass += 'border-slate-200 bg-white hover:border-teal-600 hover:bg-teal-50';
                    else btnClass += 'border-slate-200 bg-slate-50 text-slate-400';
                    return h('div', { key: oi },
                      h('button', { 'aria-label': opt.text,
                        disabled: showResult,
                        onClick: function() {
                          var newChoices = {};
                          for (var k in simChoices) { if (simChoices.hasOwnProperty(k)) newChoices[k] = simChoices[k]; }
                          newChoices[currentProposal.id] = oi;
                          upd('simChoices', newChoices);
                          ctx.awardXP(5);
                        },
                        className: btnClass
                      }, opt.text),
                      showResult && isChosen && h('div', { className: 'mt-2 ml-2 bg-blue-50 border border-blue-200 rounded-xl p-3' },
                        h('p', { className: 'text-xs font-bold text-blue-700 mb-1' }, '\ud83d\udcca Outcome:'),
                        h('p', { className: 'text-xs text-blue-800 leading-relaxed' }, opt.outcome),
                        h('div', { className: 'flex gap-3 mt-2' },
                          h('span', { className: 'text-[10px] font-bold ' + (opt.impact.happiness > 0 ? 'text-emerald-600' : opt.impact.happiness < 0 ? 'text-red-500' : 'text-slate-300') }, '\ud83d\ude0a Happiness: ' + (opt.impact.happiness > 0 ? '+' : '') + opt.impact.happiness),
                          h('span', { className: 'text-[10px] font-bold ' + (opt.impact.learning > 0 ? 'text-emerald-600' : opt.impact.learning < 0 ? 'text-red-500' : 'text-slate-300') }, '\ud83d\udcda Learning: ' + (opt.impact.learning > 0 ? '+' : '') + opt.impact.learning),
                          h('span', { className: 'text-[10px] font-bold ' + (opt.impact.health > 0 ? 'text-emerald-600' : opt.impact.health < 0 ? 'text-red-500' : 'text-slate-300') }, '\ud83d\udc9a Health: ' + (opt.impact.health > 0 ? '+' : '') + opt.impact.health)
                        )
                      )
                    );
                  })
                ),
                simChoices[currentProposal.id] !== undefined && h('button', { 'aria-label': simStep < proposals.length - 1 ? 'Next Proposal \u2192' : '\u2728 See Overall Results',
                  onClick: function() {
                    if (simStep < proposals.length - 1) {
                      upd('simStep', simStep + 1);
                    } else {
                      upd('simDone', true);
                      awardBadge('civic_simulator');
                      ctx.awardXP(15);
                      ctx.celebrate();
                    }
                  },
                  className: 'w-full px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700 mt-2'
                }, simStep < proposals.length - 1 ? 'Next Proposal \u2192' : '\u2728 See Overall Results')
              )
            );
          })(),

          // ── Middle: City Budget Challenge ──
          gradeBand === 'middle' && !simDone && (function() {
            var cats = simData.categories;
            var alloc = budgetAlloc || {};
            // Initialize budget if not set
            if (Object.keys(alloc).length === 0) {
              cats.forEach(function(c) { alloc[c.id] = c.base; });
            }
            var total = 0;
            cats.forEach(function(c) { total += (alloc[c.id] || 0); });
            var remaining = 1000000 - total;
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-4' },
                h('div', { className: 'flex justify-between items-center' },
                  h('span', { className: 'text-xs font-bold text-slate-600' }, 'Total Budget: $1,000,000'),
                  h('span', { className: 'text-xs font-bold ' + (Math.abs(remaining) < 100 ? 'text-emerald-600' : 'text-amber-600') }, 'Remaining: $' + remaining.toLocaleString())
                ),
                cats.map(function(cat) {
                  var val = alloc[cat.id] || 0;
                  var pct = Math.round(val / 1000000 * 100);
                  return h('div', { key: cat.id, className: 'space-y-1' },
                    h('div', { className: 'flex justify-between items-center' },
                      h('span', { className: 'text-xs font-bold text-slate-700' }, cat.label),
                      h('span', { className: 'text-xs font-bold text-teal-600' }, '$' + val.toLocaleString() + ' (' + pct + '%)')
                    ),
                    h('p', { className: 'text-[10px] text-slate-600' }, cat.desc),
                    h('input', {
                      type: 'range',
                      min: 0,
                      max: 500000,
                      step: 10000,
                      value: val,
                      onChange: function(e) {
                        var newAlloc = {};
                        for (var k in alloc) { if (alloc.hasOwnProperty(k)) newAlloc[k] = alloc[k]; }
                        newAlloc[cat.id] = parseInt(e.target.value, 10);
                        upd('budgetAlloc', newAlloc);
                      },
                      className: 'w-full accent-teal-600',
                      'aria-label': cat.label + ' budget'
                    })
                  );
                }),
                h('button', { 'aria-label': 'Submit Budget & See Reactions',
                  onClick: function() {
                    upd('simDone', true);
                    awardBadge('civic_simulator');
                    ctx.awardXP(15);
                    ctx.celebrate();
                  },
                  className: 'w-full px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700 mt-2'
                }, '\ud83d\udcca Submit Budget & See Reactions')
              )
            );
          })(),

          // ── High: Legislative Simulation ──
          gradeBand === 'high' && !simDone && (function() {
            var steps = simData.steps;
            var currentStep = steps[legStep];
            if (!currentStep) return null;

            // Step 1: Draft
            if (currentStep.id === 'draft') {
              return h('div', { className: 'space-y-4' },
                h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                  h('div', { className: 'bg-indigo-500 h-full rounded-full transition-all', style: { width: ((legStep + 1) / steps.length * 100) + '%' } })
                ),
                h('div', { className: 'text-xs font-bold text-slate-600 text-center' }, currentStep.title),
                h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3' },
                  h('p', { className: 'text-sm text-slate-600' }, currentStep.desc),
                  currentStep.bills.map(function(bill) {
                    var isSelected = legBill === bill.id;
                    return h('button', { 'aria-label': bill.title,
                      key: bill.id,
                      onClick: function() {
                        updMulti({ legBill: bill.id, legSupport: bill.support_base });
                        ctx.awardXP(5);
                      },
                      className: 'w-full p-4 rounded-xl border-2 text-left transition-all ' + (isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-600')
                    },
                      h('div', { className: 'font-bold text-sm text-slate-800' }, bill.title),
                      h('p', { className: 'text-xs text-slate-600 mt-1' }, bill.desc),
                      h('p', { className: 'text-[10px] text-amber-600 mt-1' }, '\u26a0\ufe0f Opposition: ' + bill.opposition),
                      h('p', { className: 'text-[10px] text-teal-600 font-bold mt-1' }, 'Base support: ' + bill.support_base + '%')
                    );
                  }),
                  legBill && h('button', { 'aria-label': 'Next: Build Coalition',
                    onClick: function() { upd('legStep', 1); },
                    className: 'w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 mt-2'
                  }, 'Next: Build Coalition \u2192')
                )
              );
            }

            // Step 2: Coalition
            if (currentStep.id === 'coalition') {
              return h('div', { className: 'space-y-4' },
                h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                  h('div', { className: 'bg-indigo-500 h-full rounded-full transition-all', style: { width: ((legStep + 1) / steps.length * 100) + '%' } })
                ),
                h('div', { className: 'flex justify-between text-xs font-bold' },
                  h('span', { className: 'text-slate-300' }, currentStep.title),
                  h('span', { className: 'text-indigo-600' }, 'Current Support: ' + legSupport + '%')
                ),
                h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3' },
                  h('p', { className: 'text-sm text-slate-600' }, currentStep.desc),
                  currentStep.allies.map(function(ally) {
                    var isRecruited = legAllies.indexOf(ally.id) !== -1;
                    return h('div', { key: ally.id, className: 'p-3 rounded-xl border-2 ' + (isRecruited ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white') },
                      h('div', { className: 'flex justify-between items-center' },
                        h('span', { className: 'font-bold text-sm text-slate-800' }, ally.label),
                        h('span', { className: 'text-[10px] font-bold text-emerald-600' }, '+' + ally.bonus + '% support')
                      ),
                      h('p', { className: 'text-xs text-slate-600 mt-1' }, ally.ask),
                      !isRecruited && h('div', { className: 'flex gap-2 mt-2' },
                        h('button', { 'aria-label': 'Accept & Recruit',
                          onClick: function() {
                            var newAllies = legAllies.concat([ally.id]);
                            updMulti({ legAllies: newAllies, legSupport: legSupport + ally.bonus });
                            ctx.awardXP(3);
                          },
                          className: 'px-3 py-1 bg-emerald-700 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700'
                        }, '\u2705 Accept & Recruit'),
                        h('button', { 'aria-label': 'Decline',
                          onClick: function() {
                            addToast(ally.label + ' declined to support your bill.', 'info');
                          },
                          className: 'px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-300'
                        }, '\u274c Decline')
                      ),
                      isRecruited && h('span', { className: 'text-[10px] text-emerald-600 font-bold mt-1 block' }, '\u2705 Recruited')
                    );
                  }),
                  h('button', { 'aria-label': 'Next: Committee Hearing',
                    onClick: function() { upd('legStep', 2); },
                    className: 'w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 mt-2'
                  }, 'Next: Committee Hearing \u2192')
                )
              );
            }

            // Step 3: Committee
            if (currentStep.id === 'committee') {
              return h('div', { className: 'space-y-4' },
                h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                  h('div', { className: 'bg-indigo-500 h-full rounded-full transition-all', style: { width: ((legStep + 1) / steps.length * 100) + '%' } })
                ),
                h('div', { className: 'flex justify-between text-xs font-bold' },
                  h('span', { className: 'text-slate-300' }, currentStep.title),
                  h('span', { className: 'text-indigo-600' }, 'Current Support: ' + legSupport + '%')
                ),
                h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-4' },
                  h('p', { className: 'text-sm text-slate-600' }, currentStep.desc),
                  currentStep.questions.map(function(cq, qi) {
                    var answered = legAnswers[qi] !== undefined;
                    return h('div', { key: qi, className: 'p-3 rounded-xl border-2 ' + (answered ? 'border-slate-200 bg-slate-50' : 'border-amber-300 bg-amber-50') },
                      h('p', { className: 'font-bold text-sm text-slate-800' }, '\ud83d\udde3\ufe0f "' + cq.q + '"'),
                      !answered && h('div', { className: 'flex gap-2 mt-2' },
                        h('button', { 'aria-label': '\u2705 ' + cq.good,
                          onClick: function() {
                            var newAnswers = {};
                            for (var k in legAnswers) { if (legAnswers.hasOwnProperty(k)) newAnswers[k] = legAnswers[k]; }
                            newAnswers[qi] = 'good';
                            updMulti({ legAnswers: newAnswers, legSupport: legSupport + cq.goodBonus });
                            ctx.awardXP(5);
                            addToast('Strong answer! Support increased.', 'success');
                          },
                          className: 'flex-1 px-3 py-2 bg-emerald-700 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700'
                        }, '\u2705 ' + cq.good),
                        h('button', { 'aria-label': '\u274c ' + cq.bad,
                          onClick: function() {
                            var newAnswers = {};
                            for (var k in legAnswers) { if (legAnswers.hasOwnProperty(k)) newAnswers[k] = legAnswers[k]; }
                            newAnswers[qi] = 'bad';
                            updMulti({ legAnswers: newAnswers, legSupport: Math.max(0, legSupport + cq.badPenalty) });
                            addToast('Weak answer. Support decreased.', 'warning');
                          },
                          className: 'flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold hover:bg-red-200'
                        }, '\u274c ' + cq.bad)
                      ),
                      answered && h('p', { className: 'text-[10px] mt-1 font-bold ' + (legAnswers[qi] === 'good' ? 'text-emerald-600' : 'text-red-500') }, legAnswers[qi] === 'good' ? '\u2705 Strong response \u2014 committee impressed' : '\u274c Weak response \u2014 committee skeptical')
                    );
                  }),
                  Object.keys(legAnswers).length >= currentStep.questions.length && h('button', { 'aria-label': 'Next: Floor Vote',
                    onClick: function() { upd('legStep', 3); },
                    className: 'w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 mt-2'
                  }, 'Next: Floor Vote \u2192')
                )
              );
            }

            // Step 4: Floor Vote
            if (currentStep.id === 'vote') {
              var passed = legSupport >= 51;
              return h('div', { className: 'space-y-4' },
                h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                  h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'bg-indigo-500 h-full rounded-full', style: { width: '100%' } })
                ),
                h('div', { className: 'text-xs font-bold text-slate-600 text-center' }, currentStep.title),
                h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-4 text-center' },
                  h('p', { className: 'text-sm text-slate-600' }, currentStep.desc),
                  h('div', { className: 'bg-slate-100 rounded-full h-6 overflow-hidden relative mt-4' },
                    h('div', { className: 'h-full rounded-full transition-all ' + (passed ? 'bg-emerald-500' : 'bg-red-400'), style: { width: Math.min(legSupport, 100) + '%' } }),
                    h('div', { className: 'absolute inset-0 flex items-center justify-center text-xs font-bold text-white', style: { textShadow: '0 1px 2px rgba(0,0,0,0.3)' } }, legSupport + '% Support')
                  ),
                  h('div', { className: 'absolute left-1/2 top-0 bottom-0 border-l-2 border-dashed border-slate-400', style: { left: '50%' } }),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Need 51% to pass'),
                  h('div', { className: 'text-4xl mt-4' }, passed ? '\ud83c\udf89' : '\ud83d\udcaa'),
                  h('h4', { className: 'text-lg font-black ' + (passed ? 'text-emerald-700' : 'text-amber-700') }, passed ? 'Your Bill Passed!' : 'Your Bill Did Not Pass'),
                  h('p', { className: 'text-sm text-slate-600' }, passed ? 'Congratulations! Your coalition-building and strong committee answers made the difference. This is how democracy works.' : 'Your bill fell short of 51%. Consider building a broader coalition and preparing stronger evidence next time. Many great bills take multiple attempts to pass.'),
                  h('button', { 'aria-label': 'Complete Simulation',
                    onClick: function() {
                      upd('simDone', true);
                      awardBadge('civic_simulator');
                      ctx.awardXP(20);
                      if (passed) ctx.celebrate();
                    },
                    className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 mt-2'
                  }, '\u2728 Complete Simulation')
                )
              );
            }

            return null;
          })(),

          // ── Simulation Complete (all bands) ──
          simDone && (function() {
            // Elementary results
            if (gradeBand === 'elementary') {
              var proposals = simData.proposals;
              var totalH = 0, totalL = 0, totalHe = 0;
              proposals.forEach(function(p) {
                var ci = simChoices[p.id];
                if (ci !== undefined && p.options[ci]) {
                  totalH += p.options[ci].impact.happiness;
                  totalL += p.options[ci].impact.learning;
                  totalHe += p.options[ci].impact.health;
                }
              });
              return h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border-2 border-teal-200 p-6 text-center space-y-4' },
                h('div', { className: 'text-4xl' }, '\ud83c\udfdb\ufe0f'),
                h('h4', { className: 'text-lg font-black text-slate-800' }, 'School Council Results!'),
                h('div', { className: 'flex justify-center gap-6' },
                  h('div', null, h('div', { className: 'text-2xl' }, '\ud83d\ude0a'), h('div', { className: 'text-sm font-bold ' + (totalH >= 0 ? 'text-emerald-600' : 'text-red-500') }, (totalH >= 0 ? '+' : '') + totalH), h('div', { className: 'text-[10px] text-slate-600' }, 'Happiness')),
                  h('div', null, h('div', { className: 'text-2xl' }, '\ud83d\udcda'), h('div', { className: 'text-sm font-bold ' + (totalL >= 0 ? 'text-emerald-600' : 'text-red-500') }, (totalL >= 0 ? '+' : '') + totalL), h('div', { className: 'text-[10px] text-slate-600' }, 'Learning')),
                  h('div', null, h('div', { className: 'text-2xl' }, '\ud83d\udc9a'), h('div', { className: 'text-sm font-bold ' + (totalHe >= 0 ? 'text-emerald-600' : 'text-red-500') }, (totalHe >= 0 ? '+' : '') + totalHe), h('div', { className: 'text-[10px] text-slate-600' }, 'Health'))
                ),
                h('p', { className: 'text-sm text-slate-600' }, 'Every decision has trade-offs. Great civic leaders think about how their choices affect everyone, not just themselves.'),
                h('button', { 'aria-label': 'Try Again',
                  onClick: function() { updMulti({ simStep: 0, simChoices: {}, simDone: false }); },
                  className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
                }, '\ud83d\udd04 Try Again')
              );
            }

            // Middle results
            if (gradeBand === 'middle') {
              var cats = simData.categories;
              var alloc = budgetAlloc || {};
              var reactions = simData.reactions;
              return h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border-2 border-teal-200 p-6 space-y-4' },
                h('div', { className: 'text-center' },
                  h('div', { className: 'text-4xl' }, '\ud83d\udcb0'),
                  h('h4', { className: 'text-lg font-black text-slate-800' }, 'Budget Results: Community Reactions')
                ),
                cats.map(function(cat) {
                  var val = alloc[cat.id] || 0;
                  var isLow = val < 100000;
                  var isHigh = val > 250000;
                  var reaction = isHigh ? reactions[cat.id].high : (isLow ? reactions[cat.id].low : 'Adequate funding maintains current service levels. The community accepts this allocation.');
                  return h('div', { key: cat.id, className: 'bg-white rounded-xl border p-3 ' + (isHigh ? 'border-emerald-300' : isLow ? 'border-red-300' : 'border-slate-200') },
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-xs font-bold text-slate-700' }, cat.label),
                      h('span', { className: 'text-xs font-bold text-teal-600' }, '$' + val.toLocaleString())
                    ),
                    h('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, reaction)
                  );
                }),
                h('p', { className: 'text-sm text-slate-600 text-center mt-2' }, 'Budgeting is about balancing competing needs. There is no perfect answer \u2014 only thoughtful trade-offs.'),
                h('button', { 'aria-label': 'Try Again',
                  onClick: function() { updMulti({ budgetAlloc: null, simDone: false }); },
                  className: 'w-full px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
                }, '\ud83d\udd04 Try Again')
              );
            }

            // High results (handled in floor vote step above)
            if (gradeBand === 'high') {
              return h('div', { className: 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-6 text-center space-y-4' },
                h('div', { className: 'text-4xl' }, '\ud83c\udfdb\ufe0f'),
                h('h4', { className: 'text-lg font-black text-slate-800' }, 'Legislative Simulation Complete!'),
                h('p', { className: 'text-sm text-slate-600' }, 'You experienced the full legislative process: drafting, coalition-building, committee testimony, and the floor vote. Real democracy requires patience, persuasion, and persistence.'),
                h('button', { 'aria-label': 'Try Again',
                  onClick: function() { updMulti({ legStep: 0, legBill: null, legAllies: [], legAnswers: {}, legSupport: 0, simDone: false }); },
                  className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
                }, '\ud83d\udd04 Try Again')
              );
            }

            return null;
          })()
        ),

        // ═══ COMMUNITY SURVEY BUILDER (NEW) ═══
        tab === 'survey' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83d\udcca Community Survey Builder'),
            h('p', { className: 'text-sm text-slate-600' }, 'Create a survey to learn about community needs. Add template questions or write your own.')
          ),

          // Survey title
          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, 'Survey Title'),
            h('input', {
              type: 'text',
              value: surveyTitle,
              onChange: function(e) { upd('surveyTitle', e.target.value); },
              placeholder: 'e.g., "Our Community Needs Assessment"',
              className: 'w-full text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-teal-300',
              'aria-label': 'Survey title'
            })
          ),

          // Template questions
          h('div', { className: 'bg-slate-50 rounded-2xl border border-slate-400 p-5 space-y-3' },
            h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest' }, '\ud83d\udccb Template Questions (' + gradeBand + ')'),
            h('p', { className: 'text-[10px] text-slate-600' }, 'Click to add a template question to your survey.'),
            h('div', { className: 'space-y-2' },
              surveyTemplates.map(function(tmpl, ti) {
                var alreadyAdded = surveyQuestions.some(function(sq) { return sq.q === tmpl.q; });
                return h('button', { 'aria-label': 'Added',
                  key: ti,
                  disabled: alreadyAdded,
                  onClick: function() {
                    var newQs = surveyQuestions.concat([{ q: tmpl.q, type: tmpl.type, options: tmpl.options || [] }]);
                    upd('surveyQuestions', newQs);
                    ctx.awardXP(2);
                  },
                  className: 'w-full p-3 rounded-xl border text-left text-xs transition-all ' + (alreadyAdded ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white hover:border-teal-600 text-slate-700')
                },
                  h('div', { className: 'flex justify-between items-center' },
                    h('span', null, tmpl.q),
                    alreadyAdded ? h('span', { className: 'text-[10px] font-bold text-emerald-600' }, '\u2705 Added') : h('span', { className: 'text-[10px] font-bold text-teal-500' }, '+ Add')
                  ),
                  h('span', { className: 'text-[10px] text-slate-600 block mt-0.5' }, tmpl.type === 'choice' ? 'Multiple choice' : 'Open-ended')
                );
              })
            )
          ),

          // Custom question builder
          h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
            h('h4', { className: 'text-xs font-bold text-amber-700 uppercase tracking-widest' }, '\u270d\ufe0f Write Your Own Question'),
            h('input', {
              type: 'text',
              value: surveyCustomQ,
              onChange: function(e) { upd('surveyCustomQ', e.target.value); },
              placeholder: 'Type your question here...',
              className: 'w-full text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-amber-300',
              'aria-label': 'Custom survey question'
            }),
            h('div', { className: 'flex gap-2' },
              h('button', { 'aria-label': 'Open-ended',
                onClick: function() { upd('surveyCustomType', 'open'); },
                className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold border ' + (surveyCustomType === 'open' ? 'bg-amber-700 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-300')
              }, 'Open-ended'),
              h('button', { 'aria-label': 'Multiple Choice',
                onClick: function() { upd('surveyCustomType', 'choice'); },
                className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold border ' + (surveyCustomType === 'choice' ? 'bg-amber-700 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-300')
              }, 'Multiple Choice')
            ),
            surveyCustomType === 'choice' && h('div', null,
              h('label', { className: 'text-[10px] text-slate-600 block mb-1' }, 'Answer options (comma-separated)'),
              h('input', {
                type: 'text',
                value: surveyCustomOpts,
                onChange: function(e) { upd('surveyCustomOpts', e.target.value); },
                placeholder: 'e.g., Strongly Agree, Agree, Neutral, Disagree, Strongly Disagree',
                className: 'w-full text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Answer options'
              })
            ),
            surveyCustomQ.length > 5 && h('button', { 'aria-label': '+ Add Question to Survey',
              onClick: function() {
                var opts = surveyCustomType === 'choice' ? surveyCustomOpts.split(',').map(function(o) { return o.trim(); }).filter(Boolean) : [];
                var newQs = surveyQuestions.concat([{ q: surveyCustomQ, type: surveyCustomType, options: opts, custom: true }]);
                updMulti({ surveyQuestions: newQs, surveyCustomQ: '', surveyCustomOpts: '' });
                ctx.awardXP(3);
              },
              className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700'
            }, '+ Add Question to Survey')
          ),

          // Current survey preview
          surveyQuestions.length > 0 && h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('h4', { className: 'text-xs font-bold text-teal-700 uppercase tracking-widest' }, '\ud83d\udcdd Your Survey (' + surveyQuestions.length + ' questions)'),
            surveyQuestions.map(function(sq, si) {
              return h('div', { key: si, className: 'bg-white rounded-xl border border-teal-200 p-3 flex justify-between items-start' },
                h('div', { className: 'flex-1' },
                  h('p', { className: 'text-xs font-bold text-slate-800' }, (si + 1) + '. ' + sq.q),
                  h('span', { className: 'text-[10px] text-slate-600' }, sq.type === 'choice' ? 'Choices: ' + (sq.options || []).join(', ') : 'Open-ended response'),
                  sq.custom && h('span', { className: 'text-[10px] text-amber-500 ml-2 font-bold' }, '(custom)')
                ),
                h('button', {
                  onClick: function() {
                    var newQs = surveyQuestions.filter(function(_, i) { return i !== si; });
                    upd('surveyQuestions', newQs);
                  },
                  className: 'text-red-400 hover:text-red-600 text-xs font-bold ml-2 shrink-0',
                  'aria-label': 'Remove question ' + (si + 1)
                }, '\u2716')
              );
            }),

            // Export survey
            h('div', { className: 'flex gap-2 mt-2' },
              h('button', { 'aria-label': 'Export survey',
                onClick: function() {
                  var text = '=== ' + (surveyTitle || 'Community Survey') + ' ===\n\n';
                  surveyQuestions.forEach(function(sq, si) {
                    text += (si + 1) + '. ' + sq.q + '\n';
                    if (sq.type === 'choice' && sq.options) {
                      sq.options.forEach(function(opt, oi) {
                        text += '   [ ] ' + opt + '\n';
                      });
                    } else {
                      text += '   Answer: ___________________________________\n';
                    }
                    text += '\n';
                  });
                  text += '\nThank you for completing this survey!\n';
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text);
                    addToast('Survey copied to clipboard! Share it with your community.', 'success');
                  } else {
                    addToast('Survey generated with ' + surveyQuestions.length + ' questions.', 'success');
                  }
                  awardBadge('survey_creator');
                  upd('surveyExported', true);
                  ctx.awardXP(15);
                },
                className: 'flex-1 px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
              }, '\ud83d\udccb Export Survey as Text'),
              surveyExported && h('span', { className: 'self-center text-[10px] font-bold text-emerald-600' }, '\u2705 Exported!')
            )
          ),

          // Analyze results hint
          surveyExported && h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-4' },
            h('h4', { className: 'text-xs font-bold text-purple-700 mb-1' }, '\ud83d\udcc8 After Collecting Responses'),
            h('div', { className: 'text-xs text-slate-600 space-y-1' },
              h('p', null, '\u2022 Tally multiple-choice answers and calculate percentages'),
              h('p', null, '\u2022 Group open-ended responses by common themes'),
              h('p', null, '\u2022 Look for patterns: What do most people agree on?'),
              h('p', null, '\u2022 Identify surprises: What did you not expect?'),
              h('p', null, '\u2022 Create a summary with charts or graphs to share your findings'),
              h('p', null, '\u2022 Present your results to decision-makers who can act on them')
            )
          )
        ),

        // ═══ RIGHTS & DISSENT (sections-aware; flat fallback for elementary/high) ═══
        tab === 'rights' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83d\udcdc ' + rightsInfo.title),
            h('p', { className: 'text-sm text-slate-600' }, rightsInfo.intro)
          ),

          // Two-level nav (sections + items) when rightsInfo.sections exists; flat fallback otherwise
          rightsInfo.sections ? (function() {
            var sections = rightsInfo.sections;
            var activeSection = null;
            var activeSectionIdx = 0;
            for (var si = 0; si < sections.length; si++) {
              if (sections[si].id === rightsSection) { activeSection = sections[si]; activeSectionIdx = si; break; }
            }
            if (!activeSection) { activeSection = sections[0]; activeSectionIdx = 0; }
            var sectionExplored = (rightsExploredBySection && rightsExploredBySection[activeSection.id]) || [];
            var item = activeSection.items[rightsIdx] || activeSection.items[0];
            var totalItems = 0; for (var t = 0; t < sections.length; t++) totalItems += sections[t].items.length;
            var totalExplored = 0;
            for (var k in rightsExploredBySection) {
              if (Object.prototype.hasOwnProperty.call(rightsExploredBySection, k)) {
                totalExplored += (rightsExploredBySection[k] || []).length;
              }
            }
            var allExplored = totalExplored >= totalItems;

            return h('div', { className: 'space-y-3' },
              // Section pills (top-level nav)
              h('div', { className: 'flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-400 overflow-x-auto', role: 'tablist', 'aria-label': 'Rights & Dissent sections' },
                sections.map(function(s, si) {
                  var sExplored = (rightsExploredBySection && rightsExploredBySection[s.id]) || [];
                  var sectionDone = sExplored.length >= s.items.length;
                  var isActive = s.id === activeSection.id;
                  return h('button', {
                    key: s.id,
                    role: 'tab',
                    'aria-selected': isActive,
                    'aria-label': s.label + (sectionDone ? ' (complete)' : ''),
                    onClick: function() { updMulti({ rightsSection: s.id, rightsIdx: 0, rightsScenarioAnswer: '' }); },
                    className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ' +
                      (isActive ? 'bg-white text-indigo-700 shadow-sm' : sectionDone ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-800')
                  }, s.icon + ' ' + s.label);
                })
              ),

              // Section intro
              h('p', { className: 'text-xs text-slate-600 italic px-1' }, activeSection.intro),

              // Item pills (second-level nav within active section)
              h('div', { className: 'flex gap-1 bg-indigo-50/50 rounded-lg p-1 border border-indigo-100 overflow-x-auto' },
                activeSection.items.map(function(it, ii) {
                  var isExplored = sectionExplored.indexOf(ii) !== -1;
                  var isCurrent = rightsIdx === ii;
                  return h('button', {
                    key: it.id,
                    'aria-label': it.title + (isExplored ? ' (explored)' : ''),
                    onClick: function() {
                      updMulti({ rightsIdx: ii, rightsScenarioAnswer: '' });
                      if (sectionExplored.indexOf(ii) === -1) {
                        var newSec = sectionExplored.concat([ii]);
                        var newMap = Object.assign({}, rightsExploredBySection);
                        newMap[activeSection.id] = newSec;
                        upd('rightsExploredBySection', newMap);
                        ctx.awardXP(5);
                        var newTotal = totalExplored + 1;
                        if (newTotal >= totalItems) {
                          awardBadge('rights_scholar');
                          ctx.awardXP(15);
                          addToast('You have explored all sections of Rights & Dissent!', 'success');
                          ctx.celebrate();
                        }
                      }
                    },
                    className: 'flex-shrink-0 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ' +
                      (isCurrent ? 'bg-white text-indigo-700 shadow-sm border border-indigo-600' : isExplored ? 'text-emerald-600/70' : 'text-slate-400 hover:text-slate-700')
                  }, it.icon + ' ' + (ii + 1));
                })
              ),

              // Item card
              item && h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3' },
                h('div', { className: 'flex items-start gap-3' },
                  h('span', { className: 'text-3xl flex-shrink-0' }, item.icon),
                  h('div', { className: 'flex-1' },
                    h('h4', { className: 'text-sm font-bold text-indigo-700' }, item.title + (item.year ? ' (' + item.year + ')' : '')),
                    item.summary && h('p', { className: 'text-xs text-slate-600 italic mt-0.5' }, item.summary)
                  )
                ),
                h('div', { className: 'bg-indigo-50 rounded-xl p-4 border border-indigo-200' },
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, item.body)
                ),
                item.primarySource && h('div', { className: 'text-[10px] text-slate-700 px-1' },
                  h('span', { className: 'font-bold uppercase tracking-widest text-slate-600 mr-1' }, 'Primary source:'),
                  item.primarySource
                ),
                callTTS && h('button', {
                  'aria-label': 'Hear this read aloud',
                  onClick: function() { callTTS(item.title + '. ' + item.body); },
                  className: 'text-[10px] text-indigo-500 hover:text-indigo-700 font-bold'
                }, '\ud83d\udd0a Hear this read aloud')
              ),

              // Scenario / reflection prompt (only if item has scenario)
              item && item.scenario && h('div', { className: 'bg-amber-50 rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
                h('h5', { className: 'text-xs font-bold text-amber-700' }, '\ud83e\udd14 ' + (activeSection.id === 'reflection' ? 'Reflect' : 'What do you think?')),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed italic' }, item.scenario),
                h('textarea', {
                  value: rightsScenarioAnswer,
                  onChange: function(e) { upd('rightsScenarioAnswer', e.target.value); },
                  placeholder: 'Write your response here.',
                  className: 'w-full text-sm p-3 border border-amber-600 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-amber-300',
                  'aria-label': 'Your response to the prompt'
                }),
                rightsScenarioAnswer && rightsScenarioAnswer.length > 15 && callGemini && h('button', {
                  'aria-label': 'Get feedback on your response',
                  onClick: function() {
                    upd('aiLoading', true);
                    var prompt = 'You are a civic education teacher for ' + (gradeLevel || 'middle school') + ' students. The student is studying the section "' + activeSection.label + '" and was given this prompt about "' + item.title + '": "' + item.scenario + '" They responded: "' + rightsScenarioAnswer + '". Give brief, encouraging feedback (2-3 sentences). Highlight their reasoning. Stay historical and nonpartisan; do not endorse current political positions. Be warm and specific.';
                    _runSafetyAssess(rightsScenarioAnswer, 'rightsprompt');
                    callGemini(prompt).then(function(resp) {
                      updMulti({ aiResponse: resp, aiLoading: false });
                      ctx.awardXP(5);
                    }).catch(function() { upd('aiLoading', false); });
                  },
                  disabled: aiLoading,
                  className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 disabled:opacity-40 flex items-center gap-2'
                }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '\ud83d\udcac Get Feedback')
              ),

              // Item-level prev/next + section progress
              h('div', { className: 'flex justify-between items-center pt-1' },
                rightsIdx > 0 ? h('button', {
                  'aria-label': 'Previous item',
                  onClick: function() { updMulti({ rightsIdx: rightsIdx - 1, rightsScenarioAnswer: '' }); },
                  className: 'px-3 py-1.5 border border-slate-400 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50'
                }, '\u2190 Previous') : h('div'),
                h('div', { className: 'text-[10px] text-slate-400 font-bold' }, totalExplored + ' / ' + totalItems + ' explored'),
                rightsIdx < activeSection.items.length - 1 ? h('button', {
                  'aria-label': 'Next item',
                  onClick: function() { updMulti({ rightsIdx: rightsIdx + 1, rightsScenarioAnswer: '' }); },
                  className: 'px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
                }, 'Next \u2192') : activeSectionIdx < sections.length - 1 ? h('button', {
                  'aria-label': 'Next section',
                  onClick: function() { updMulti({ rightsSection: sections[activeSectionIdx + 1].id, rightsIdx: 0, rightsScenarioAnswer: '' }); },
                  className: 'px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
                }, 'Next Section: ' + sections[activeSectionIdx + 1].label + ' \u2192') : allExplored ? h('button', {
                  'aria-label': 'Complete',
                  onClick: function() { awardBadge('rights_scholar'); ctx.awardXP(15); addToast('You have explored all of Rights & Dissent.', 'success'); ctx.celebrate(); },
                  className: 'px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800'
                }, '\u2728 Complete') : h('div', { className: 'text-[10px] text-slate-400 italic' }, 'Visit every item to finish')
              )
            );
          })() : (function() {
            // ── Flat fallback render for elementary and high bands (unchanged behavior) ──
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-400 overflow-x-auto' },
                rightsInfo.rights.map(function(r, ri) {
                  var isExplored = rightsExplored.indexOf(ri) !== -1;
                  return h('button', { 'aria-label': r.icon + ' ' + (ri + 1),
                    key: ri,
                    onClick: function() {
                      upd('rightsIdx', ri);
                      if (rightsExplored.indexOf(ri) === -1) {
                        var newExplored = rightsExplored.concat([ri]);
                        upd('rightsExplored', newExplored);
                        ctx.awardXP(5);
                        if (newExplored.length >= rightsInfo.rights.length) {
                          awardBadge('rights_scholar');
                        }
                      }
                    },
                    className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ' +
                      (rightsIdx === ri ? 'bg-white text-indigo-700 shadow-sm' : isExplored ? 'text-emerald-600/70' : 'text-slate-300/60 hover:text-slate-700')
                  }, r.icon + ' ' + (ri + 1));
                })
              ),
              (function() {
                var right = rightsInfo.rights[rightsIdx];
                if (!right) return null;
                return h('div', { className: 'space-y-4' },
                  h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-4' },
                    h('div', { className: 'flex items-center gap-3' },
                      h('span', { className: 'text-3xl' }, right.icon),
                      h('h4', { className: 'text-sm font-bold text-indigo-700' }, right.right)
                    ),
                    h('div', { className: 'bg-indigo-50 rounded-xl p-4 border border-indigo-200' },
                      h('h5', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1' }, 'What This Means'),
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, right.explain)
                    ),
                    h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200' },
                      h('h5', { className: 'text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1' }, 'Your Responsibility'),
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, right.responsibility)
                    ),
                    callTTS && h('button', { 'aria-label': 'Hear this read aloud',
                      onClick: function() { callTTS(right.right + '. ' + right.explain + '. Your responsibility: ' + right.responsibility); },
                      className: 'text-[10px] text-indigo-500 hover:text-indigo-700 font-bold'
                    }, '\ud83d\udd0a Hear this read aloud')
                  ),
                  h('div', { className: 'bg-amber-50 rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
                    h('h5', { className: 'text-xs font-bold text-amber-700' }, '\ud83e\udd14 What Would You Do?'),
                    h('p', { className: 'text-sm text-slate-700 leading-relaxed italic' }, right.scenario),
                    h('textarea', {
                      value: rightsScenarioAnswer,
                      onChange: function(e) { upd('rightsScenarioAnswer', e.target.value); },
                      placeholder: 'Write your response here. Think about rights and responsibilities...',
                      className: 'w-full text-sm p-3 border border-amber-600 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
                      'aria-label': 'Your response to the scenario'
                    }),
                    rightsScenarioAnswer && rightsScenarioAnswer.length > 15 && callGemini && h('button', { 'aria-label': 'Get feedback on your response',
                      onClick: function() {
                        upd('aiLoading', true);
                        var prompt = 'You are a civic education teacher for ' + (gradeLevel || '5th grade') + ' students. A student was asked this scenario about rights: "' + right.scenario + '" They responded: "' + rightsScenarioAnswer + '". Give brief, encouraging feedback (2-3 sentences). Highlight their good reasoning and gently suggest any perspectives they might have missed. Be warm and supportive.';
                        _runSafetyAssess(rightsScenarioAnswer, 'rightsscenario');
                        callGemini(prompt).then(function(resp) {
                          updMulti({ aiResponse: resp, aiLoading: false });
                          ctx.awardXP(5);
                        }).catch(function() { upd('aiLoading', false); });
                      },
                      disabled: aiLoading,
                      className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-40 flex items-center gap-2'
                    }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '\ud83d\udcac Get Feedback on Your Response')
                  ),
                  h('div', { className: 'flex justify-between' },
                    rightsIdx > 0 ? h('button', { 'aria-label': 'Previous Right',
                      onClick: function() { updMulti({ rightsIdx: rightsIdx - 1, rightsScenarioAnswer: '' }); },
                      className: 'px-4 py-2 border border-slate-400 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50'
                    }, '\u2190 Previous Right') : h('div'),
                    rightsIdx < rightsInfo.rights.length - 1 ? h('button', { 
                      onClick: function() { updMulti({ rightsIdx: rightsIdx + 1, rightsScenarioAnswer: '' }); },
                      className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
                    }, 'Next Right \u2192') : h('button', { 'aria-label': 'Complete Rights Explorer',
                      onClick: function() {
                        awardBadge('rights_scholar');
                        ctx.awardXP(15);
                        addToast('You have explored all rights for your grade level!', 'success');
                        ctx.celebrate();
                      },
                      className: 'px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700'
                    }, '\u2728 Complete Rights Explorer')
                  )
                );
              })()
            );
          })()
        ),

        // ═══ SERVICE LEARNING PROJECT PLANNER (NEW) ═══
        tab === 'service' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83e\udd1d Service Learning Project Planner'),
            h('p', { className: 'text-sm text-slate-600' }, 'Plan a community service project from start to finish. Choose a template or design your own.')
          ),

          // Template selection
          !serviceTemplate && h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-xs font-bold text-teal-600 uppercase tracking-widest' }, 'Choose a Project Template'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              SERVICE_TEMPLATES.map(function(tmpl) {
                return h('button', { 'aria-label': tmpl.title.split(' ')[0],
                  key: tmpl.id,
                  onClick: function() {
                    upd('serviceTemplate', tmpl.id);
                    ctx.awardXP(5);
                  },
                  className: 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-left transition-all hover:border-teal-600 hover:shadow-md hover:scale-[1.01]'
                },
                  h('div', { className: 'text-2xl mb-2' }, tmpl.title.split(' ')[0]),
                  h('div', { className: 'font-bold text-sm text-slate-800' }, tmpl.title),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, tmpl.desc)
                );
              })
            )
          ),

          // Active project plan
          serviceTemplate && !serviceDone && (function() {
            var tmpl = SERVICE_TEMPLATES.find(function(t) { return t.id === serviceTemplate; });
            if (!tmpl) return null;
            var currentPhase = SERVICE_PHASES[servicePhase];
            var currentStep = tmpl.steps[servicePhase];
            return h('div', { className: 'space-y-4' },
              h('button', { 'aria-label': tmpl.title,
                onClick: function() { updMulti({ serviceTemplate: null, servicePhase: 0, serviceNotes: {}, serviceHours: 0 }); },
                className: 'text-xs text-teal-600 font-bold hover:text-teal-800 flex items-center gap-1'
              }, h(ArrowLeft, { size: 14 }), 'Back to templates'),

              h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-3 text-center' },
                h('span', { className: 'text-sm font-bold text-teal-700' }, tmpl.title)
              ),

              // Phase progress
              h('div', { className: 'flex gap-1' },
                SERVICE_PHASES.map(function(phase, pi) {
                  var isActive = pi === servicePhase;
                  var isDone = pi < servicePhase;
                  return h('div', {
                    key: pi,
                    className: 'flex-1 text-center py-2 rounded-lg text-[10px] font-bold ' +
                      (isActive ? 'bg-teal-700 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300')
                  }, phase.label);
                })
              ),

              // Current phase
              h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
                h('h4', { className: 'text-sm font-bold text-teal-700' }, currentPhase.label + ': ' + currentPhase.desc),
                h('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200' },
                  h('p', { className: 'text-xs text-teal-800 leading-relaxed' }, '\ud83d\udccb Task: ' + currentStep.task)
                ),
                h('textarea', {
                  value: serviceNotes[currentPhase.id] || '',
                  onChange: function(e) {
                    var newNotes = {};
                    for (var k in serviceNotes) { if (serviceNotes.hasOwnProperty(k)) newNotes[k] = serviceNotes[k]; }
                    newNotes[currentPhase.id] = e.target.value;
                    upd('serviceNotes', newNotes);
                  },
                  placeholder: 'Write your notes, plans, and progress here...',
                  className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-28 outline-none focus:ring-2 focus:ring-teal-300',
                  'aria-label': currentPhase.label + ' notes'
                }),

                // Hour tracker
                h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
                  h('div', { className: 'flex items-center justify-between' },
                    h('span', { className: 'text-xs font-bold text-amber-700' }, '\u23f0 Service Hours Logged'),
                    h('div', { className: 'flex items-center gap-2' },
                      h('button', { 'aria-label': '-',
                        onClick: function() { if (serviceHours > 0) upd('serviceHours', serviceHours - 0.5); },
                        className: 'w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-300'
                      }, '-'),
                      h('span', { className: 'text-sm font-bold text-amber-800 w-10 text-center' }, serviceHours.toFixed(1)),
                      h('button', { 'aria-label': '+',
                        onClick: function() { upd('serviceHours', serviceHours + 0.5); },
                        className: 'w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-300'
                      }, '+')
                    )
                  ),
                  h('p', { className: 'text-[10px] text-amber-500 mt-1' }, 'Track the hours you spend on each phase of your project.')
                ),

                // Navigation
                h('div', { className: 'flex justify-between mt-2' },
                  servicePhase > 0 ? h('button', { 'aria-label': 'Previous Phase',
                    onClick: function() { upd('servicePhase', servicePhase - 1); },
                    className: 'px-4 py-2 border border-slate-400 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50'
                  }, '\u2190 Previous Phase') : h('div'),
                  servicePhase < SERVICE_PHASES.length - 1 ? h('button', { 
                    onClick: function() { upd('servicePhase', servicePhase + 1); ctx.awardXP(5); },
                    className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
                  }, 'Next Phase \u2192') : h('button', { 'aria-label': 'Next Phase',
                    onClick: function() {
                      upd('serviceDone', true);
                      awardBadge('service_leader');
                      ctx.awardXP(25);
                      addToast('Service project plan complete! You logged ' + serviceHours.toFixed(1) + ' hours. Amazing work!', 'success');
                      ctx.celebrate();
                    },
                    className: 'px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700'
                  }, '\u2728 Complete Project Plan')
                )
              )
            );
          })(),

          // Project complete
          serviceDone && (function() {
            var tmpl = SERVICE_TEMPLATES.find(function(t) { return t.id === serviceTemplate; });
            return h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border-2 border-teal-200 p-6 text-center space-y-4' },
              h('div', { className: 'text-4xl' }, '\ud83c\udfc5'),
              h('h4', { className: 'text-lg font-black text-slate-800' }, 'Service Project Complete!'),
              tmpl && h('p', { className: 'text-sm font-bold text-teal-700' }, tmpl.title),
              h('div', { className: 'flex justify-center gap-6' },
                h('div', null,
                  h('div', { className: 'text-2xl font-bold text-teal-700' }, serviceHours.toFixed(1)),
                  h('div', { className: 'text-[10px] text-slate-600' }, 'Hours Logged')
                ),
                h('div', null,
                  h('div', { className: 'text-2xl font-bold text-teal-700' }, Object.keys(serviceNotes).length),
                  h('div', { className: 'text-[10px] text-slate-600' }, 'Phases Documented')
                )
              ),
              h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200 text-left' },
                h('h5', { className: 'text-xs font-bold text-slate-700 mb-2' }, 'Impact Measurement'),
                h('p', { className: 'text-xs text-slate-600' }, '\u2022 People served or impacted: ________'),
                h('p', { className: 'text-xs text-slate-600' }, '\u2022 Items collected/donated: ________'),
                h('p', { className: 'text-xs text-slate-600' }, '\u2022 What I learned: ' + (serviceNotes.reflect || '(complete the Reflect phase above)')),
                h('p', { className: 'text-xs text-slate-600' }, '\u2022 What I would do differently: ________')
              ),
              h('p', { className: 'text-sm text-slate-600' }, 'Service is not just about helping others \u2014 it transforms you too. The skills you built here will serve you for a lifetime.'),
              h('button', { 'aria-label': 'Plan Another Project',
                onClick: function() { updMulti({ serviceTemplate: null, servicePhase: 0, serviceNotes: {}, serviceHours: 0, serviceDone: false }); },
                className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
              }, '\ud83d\udd04 Plan Another Project')
            );
          })()
        ),

        // ═══ CIVIC SKILLS QUIZ (NEW) ═══
        tab === 'quiz' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udfc6 Civic Skills Quiz'),
            h('p', { className: 'text-sm text-slate-600' }, 'Test your knowledge of civic concepts! (' + gradeBand + ' level)')
          ),

          !quizDone && (function() {
            var question = quizQuestions[quizIdx];
            if (!question) return null;
            return h('div', { className: 'space-y-4' },
              // Progress
              h('div', { className: 'flex justify-between items-center' },
                h('span', { className: 'text-xs font-bold text-slate-600' }, 'Question ' + (quizIdx + 1) + ' of ' + quizQuestions.length),
                h('span', { className: 'text-xs font-bold text-teal-600' }, 'Score: ' + quizScore + '/' + quizQuestions.length)
              ),
              h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                h('div', { className: 'bg-teal-500 h-full rounded-full transition-all', style: { width: (quizIdx / quizQuestions.length * 100) + '%' } })
              ),

              // Question card
              h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-4' },
                h('h4', { className: 'text-sm font-bold text-slate-800' }, question.q),
                h('div', { className: 'space-y-2' },
                  question.options.map(function(opt, oi) {
                    var isCorrect = oi === question.answer;
                    var isChosen = quizAnswer === oi;
                    var showResult = quizAnswered;
                    var btnClass = 'w-full p-3 rounded-xl border-2 text-left text-sm transition-all ';
                    if (showResult && isCorrect) btnClass += 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold';
                    else if (showResult && isChosen && !isCorrect) btnClass += 'border-red-400 bg-red-50 text-red-800';
                    else if (!showResult) btnClass += 'border-slate-200 bg-white hover:border-teal-600 hover:bg-teal-50 text-slate-700';
                    else btnClass += 'border-slate-200 bg-slate-50 text-slate-300';
                    return h('button', { 'aria-label': '\ud83d\udca1 ' + question.explain,
                      key: oi,
                      disabled: quizAnswered,
                      onClick: function() {
                        var correct = oi === question.answer;
                        var newScore = correct ? quizScore + 1 : quizScore;
                        updMulti({ quizAnswer: oi, quizAnswered: true, quizScore: newScore });
                        if (correct) ctx.awardXP(5);
                      },
                      className: btnClass
                    },
                      h('span', null, String.fromCharCode(65 + oi) + '. ' + opt),
                      showResult && isCorrect && h('span', { className: 'text-[10px] ml-1 font-bold' }, ' \u2714'),
                      showResult && isChosen && !isCorrect && h('span', { className: 'text-[10px] ml-1 font-bold' }, ' \u2718')
                    );
                  })
                ),

                // Explanation
                quizAnswered && h('div', { className: 'bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2' },
                  h('p', { className: 'text-xs text-blue-800 leading-relaxed' }, '\ud83d\udca1 ' + question.explain)
                ),

                // Next button
                quizAnswered && h('button', { 'aria-label': quizIdx < quizQuestions.length - 1 ? 'Next Question \u2192' : 'See Results',
                  onClick: function() {
                    if (quizIdx < quizQuestions.length - 1) {
                      updMulti({ quizIdx: quizIdx + 1, quizAnswer: undefined, quizAnswered: false });
                    } else {
                      upd('quizDone', true);
                      if (quizScore === quizQuestions.length) awardBadge('quiz_champion');
                    }
                  },
                  className: 'w-full px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700 mt-2'
                }, quizIdx < quizQuestions.length - 1 ? 'Next Question \u2192' : 'See Results')
              )
            );
          })(),

          // Quiz results
          quizDone && h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border-2 border-teal-200 p-6 text-center space-y-4' },
            h('div', { className: 'text-4xl' }, quizScore === quizQuestions.length ? '\ud83c\udfc6' : quizScore >= quizQuestions.length * 0.7 ? '\ud83c\udf1f' : '\ud83d\udcaa'),
            h('h4', { className: 'text-lg font-black text-slate-800' }, 'Quiz Complete!'),
            h('p', { className: 'text-2xl font-bold text-teal-700' }, quizScore + ' / ' + quizQuestions.length),
            h('p', { className: 'text-sm text-slate-600' },
              quizScore === quizQuestions.length ? 'Perfect score! You are a civic knowledge champion!' :
              quizScore >= quizQuestions.length * 0.7 ? 'Great job! You have a strong understanding of civic concepts.' :
              'Good effort! Keep learning \u2014 civic knowledge is a superpower.'
            ),
            h('button', { 'aria-label': 'Try Again',
              onClick: function() { updMulti({ quizIdx: 0, quizAnswer: undefined, quizScore: 0, quizDone: false, quizAnswered: false }); },
              className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
            }, '\ud83d\udd04 Try Again')
          )
        ),

        // ═══ COMMUNITY CHANGE SCENARIOS (NEW) ═══
        tab === 'scenarios' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udfad Community Change Scenarios'),
            h('p', { className: 'text-sm text-slate-600' }, 'What would you do? Make choices and see how effective different approaches are.')
          ),

          !scenarioDone && (function() {
            var scenario = scenarios[scenarioIdx];
            if (!scenario) return null;
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'flex justify-between items-center' },
                h('span', { className: 'text-xs font-bold text-slate-600' }, 'Scenario ' + (scenarioIdx + 1) + ' of ' + scenarios.length),
                h('span', { className: 'text-xs font-bold text-teal-600' }, 'Total Score: ' + scenarioScore)
              ),
              h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
                h('div', { className: 'bg-teal-500 h-full rounded-full transition-all', style: { width: (scenarioIdx / scenarios.length * 100) + '%' } })
              ),

              h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-4' },
                h('h4', { className: 'text-sm font-bold text-indigo-700' }, '\ud83c\udfac ' + scenario.title),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, scenario.setup),

                h('div', { className: 'space-y-2 mt-3' },
                  scenario.choices.map(function(choice, ci) {
                    var isChosen = scenarioChoice === ci;
                    var showResult = scenarioChosen;
                    var stars = '';
                    for (var s = 0; s < 5; s++) stars += s < choice.score ? '\u2605' : '\u2606';
                    var btnClass = 'w-full p-3 rounded-xl border-2 text-left text-sm transition-all ';
                    if (showResult && isChosen) btnClass += choice.score >= 4 ? 'border-emerald-400 bg-emerald-50' : choice.score >= 3 ? 'border-amber-400 bg-amber-50' : 'border-red-600 bg-red-50';
                    else if (!showResult) btnClass += 'border-slate-200 bg-white hover:border-indigo-600 hover:bg-indigo-50';
                    else btnClass += 'border-slate-200 bg-slate-50 text-slate-300';
                    return h('div', { key: ci },
                      h('button', { 'aria-label': choice.text,
                        disabled: scenarioChosen,
                        onClick: function() {
                          var newTotal = scenarioScore + choice.score;
                          updMulti({ scenarioChoice: ci, scenarioChosen: true, scenarioScore: newTotal });
                          awardBadge('changemaker');
                          ctx.awardXP(choice.score >= 4 ? 10 : 5);
                        },
                        className: btnClass
                      }, choice.text),
                      showResult && isChosen && h('div', { className: 'mt-1 ml-2 space-y-1' },
                        h('div', { className: 'text-xs text-amber-600 font-bold' }, 'Effectiveness: ' + stars),
                        h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, choice.feedback)
                      )
                    );
                  })
                ),

                scenarioChosen && h('button', { 'aria-label': scenarioIdx < scenarios.length - 1 ? 'Next Scenario \u2192' : 'See Results',
                  onClick: function() {
                    if (scenarioIdx < scenarios.length - 1) {
                      updMulti({ scenarioIdx: scenarioIdx + 1, scenarioChoice: undefined, scenarioChosen: false });
                    } else {
                      upd('scenarioDone', true);
                      awardBadge('scenario_master');
                    }
                  },
                  className: 'w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 mt-2'
                }, scenarioIdx < scenarios.length - 1 ? 'Next Scenario \u2192' : 'See Results')
              )
            );
          })(),

          // Scenario results
          scenarioDone && h('div', { className: 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-6 text-center space-y-4' },
            h('div', { className: 'text-4xl' }, '\ud83c\udfc5'),
            h('h4', { className: 'text-lg font-black text-slate-800' }, 'Scenarios Complete!'),
            h('p', { className: 'text-2xl font-bold text-indigo-700' }, scenarioScore + ' / ' + (scenarios.length * 5) + ' points'),
            h('p', { className: 'text-sm text-slate-600' },
              scenarioScore >= scenarios.length * 4 ? 'Outstanding civic leadership! You consistently chose the most effective approaches.' :
              scenarioScore >= scenarios.length * 3 ? 'Great civic instincts! You are on your way to being a skilled advocate.' :
              'Good start! Civic skills grow with practice. Try again and explore different choices.'
            ),
            h('button', { 'aria-label': 'Try Again',
              onClick: function() { updMulti({ scenarioIdx: 0, scenarioChoice: undefined, scenarioScore: 0, scenarioDone: false, scenarioChosen: false }); },
              className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
            }, '\ud83d\udd04 Try Again')
          )
        ),

        // ═══ HOPE ═══
        tab === 'hope' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udf05 Cultivating Hope'),
            h('p', { className: 'text-sm text-slate-600' }, 'Hope is not the belief that things will be easy. It is the belief that things can be better \u2014 and the courage to work toward it.')
          ),

          // Hope anchors — people who changed things
          h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-xs font-bold text-teal-600 uppercase tracking-widest' }, '\ud83c\udf1f People Who Started Where You Are'),
            HOPE_ANCHORS.map(function(anchor, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-slate-400 p-4 hover:border-teal-300 transition-colors' },
                h('div', { className: 'flex items-start gap-3' },
                  h('div', { className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0' }, anchor.theme),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, anchor.person),
                    h('p', { className: 'text-xs text-slate-600 leading-relaxed mt-1' }, anchor.story)
                  )
                )
              );
            })
          ),

          // Changemaker Profiles (NEW - grade-adapted)
          h('div', { className: 'space-y-3 mt-4' },
            h('h4', { className: 'text-xs font-bold text-purple-600 uppercase tracking-widest' }, '\u2728 Changemaker Profiles (' + gradeBand + ')'),
            changemakers.map(function(cm, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-purple-200 p-4 hover:border-purple-400 transition-colors' },
                h('div', { className: 'flex items-start gap-3' },
                  h('span', { className: 'text-2xl shrink-0' }, cm.emoji),
                  h('div', null,
                    h('div', { className: 'flex items-center gap-2 flex-wrap' },
                      h('span', { className: 'font-bold text-sm text-slate-800' }, cm.name),
                      h('span', { className: 'text-[10px] text-slate-600' }, cm.years),
                      h('span', { className: 'bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold' }, cm.theme)
                    ),
                    h('p', { className: 'text-xs text-slate-600 leading-relaxed mt-1' }, cm.bio),
                    h('p', { className: 'text-[10px] text-purple-500 font-bold mt-1' }, '\u23f0 ' + cm.age)
                  )
                )
              );
            })
          ),

          // Vision exercise
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl border border-amber-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-amber-700 mb-2' }, '\ud83d\udd2e Your Vision for the Future'),
            h('p', { className: 'text-xs text-slate-600 mb-3' }, 'Close your eyes for a moment. Imagine the world you want to live in 20 years from now. What does it look like?'),
            h('textarea', {
              value: d.visionText || '',
              onChange: function(e) { upd('visionText', e.target.value); },
              placeholder: 'Describe the world you want to help create...',
              className: 'w-full text-sm p-3 border border-slate-400 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-amber-300',
              'aria-label': 'Your vision for the future'
            }),
            d.visionText && d.visionText.length > 20 && h('button', { 'aria-label': 'Save My Vision',
              onClick: function() {
                ctx.awardXP(15);
                addToast('Your vision matters. Hold onto it. \ud83c\udf05', 'success');
                awardBadge('hope_keeper');
                ctx.celebrate();
              },
              className: 'mt-2 px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
            }, '\ud83d\udc9b Save My Vision')
          ),

          // Closing quote
          h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-sm text-teal-800 italic leading-relaxed' },
              '"You are not obligated to complete the work, but neither are you free to abandon it."'
            ),
            h('p', { className: 'text-[10px] text-teal-500 mt-1 font-bold' }, '\u2014 Rabbi Tarfon, Pirkei Avot 2:16')
          )
        ),

        // ── AI Response ──
        (_civicTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) ? window.SelHub.renderCrisisResources(h, gradeBand) : null,
        aiResponse && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4' },
          h('div', { className: 'flex items-start gap-2' },
            h(Heart, { size: 14, className: 'text-teal-500 mt-0.5 shrink-0' }),
            h('div', null,
              h('div', { className: 'text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1' }, 'Counselor'),
              h('p', { className: 'text-sm text-teal-800 leading-relaxed' }, aiResponse)
            )
          ),
          h('button', { 'aria-label': 'Dismiss', onClick: function() { upd('aiResponse', null); }, className: 'mt-2 text-[10px] text-teal-400 hover:text-teal-600 font-bold' }, 'Dismiss')
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_civicaction.js loaded');
