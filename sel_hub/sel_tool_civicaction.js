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

  // ── Data ──

  var TABS = [
    { id: 'feelings', label: '\ud83d\udcad Name It', desc: 'Identify what you are feeling' },
    { id: 'understand', label: '\ud83d\udd0d Understand It', desc: 'Why does this matter to me?' },
    { id: 'cope', label: '\ud83c\udf3f Cope', desc: 'Healthy ways to hold hard feelings' },
    { id: 'explore', label: '\ud83c\udf0d Explore Issues', desc: 'Learn about civic issues' },
    { id: 'act', label: '\u270a Act', desc: 'Turn feelings into action' },
    { id: 'planner', label: '\ud83d\udcdd Plan', desc: 'Build a civic action plan' },
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
    { id: 'helpless', label: 'Helpless or powerless', emoji: '\ud83d\ude1e', color: '#6b7280',
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

  // ── NEW: Badges ──

  var BADGES = [
    { id: 'first_issue', icon: '\ud83c\udf0d', label: 'First Issue', desc: 'Explored your first civic issue' },
    { id: 'action_planner', icon: '\ud83d\udcdd', label: 'Action Planner', desc: 'Created a civic action plan' },
    { id: 'quiz_champion', icon: '\ud83c\udfc6', label: 'Quiz Champion', desc: 'Scored 100% on a civic quiz' },
    { id: 'changemaker', icon: '\u2728', label: 'Changemaker', desc: 'Completed a community change scenario' },
    { id: 'civic_champion', icon: '\ud83c\udde8', label: 'Civic Champion', desc: 'Explored all tabs in Civic Action & Hope' },
    { id: 'hope_keeper', icon: '\ud83c\udf05', label: 'Hope Keeper', desc: 'Wrote your vision for the future' },
    { id: 'empathy_leader', icon: '\u2764\ufe0f', label: 'Empathy Leader', desc: 'Explored 5 or more civic issues' },
    { id: 'scenario_master', icon: '\ud83c\udfad', label: 'Scenario Master', desc: 'Completed all scenarios for your grade band' },
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
    category: 'responsible-decision-making',

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
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';

      var tab = d.tab || 'feelings';
      var selectedFeeling = d.feeling || null;
      var selectedCoping = d.coping || null;
      var aiResponse = d.aiResponse || null;
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

      var actions = CIVIC_ACTIONS[gradeBand] || CIVIC_ACTIONS.elementary;
      var issues = CIVIC_ISSUES[gradeBand] || CIVIC_ISSUES.elementary;
      var quizQuestions = CIVIC_QUIZ[gradeBand] || CIVIC_QUIZ.elementary;
      var scenarios = CHANGE_SCENARIOS[gradeBand] || CHANGE_SCENARIOS.elementary;
      var changemakers = CHANGEMAKERS[gradeBand] || CHANGEMAKERS.elementary;

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

        // ── Header ──
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-teal-100 text-teal-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })),
              h(ArrowLeft, { size: 20 })
            ),
            h('div', null,
              h('h2', { className: 'text-xl font-black text-slate-800' }, '\u270a Civic Action & Hope'),
              h('p', { className: 'text-xs text-slate-500' }, 'Your feelings are valid. Your voice matters. Your actions count.')
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
        h('div', { className: 'flex gap-1 bg-teal-50 rounded-xl p-1 border border-teal-200 overflow-x-auto' },
          TABS.map(function(t) {
            return h('button', {
              key: t.id,
              onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-2 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ' +
                (tab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-teal-600/60 hover:text-teal-700')
            }, t.label);
          })
        ),

        // ═══ NAME IT — Feelings ═══
        tab === 'feelings' && h('div', { className: 'space-y-4' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'What are you feeling right now? There are no wrong answers.'),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            FEELINGS_MAP.map(function(f) {
              var isSelected = selectedFeeling === f.id;
              return h('button', {
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
                callTTS && h('button', {
                  onClick: function() { callTTS(f.validation + ' ' + f.reframe); },
                  className: 'text-[10px] text-teal-500 hover:text-teal-700 font-bold'
                }, '\ud83d\udd0a Hear this read aloud')
              );
            })()
          ),

          // Free write
          h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\ud83d\udcdd What is on your mind? (private)'),
            h('textarea', {
              value: d.freeWrite || '',
              onChange: function(e) { upd('freeWrite', e.target.value); },
              placeholder: 'Write freely about what you are thinking and feeling. Nobody will see this unless you choose to share it.',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-teal-300',
              'aria-label': 'Free write about your feelings'
            })
          ),

          // AI counselor
          d.freeWrite && d.freeWrite.length > 20 && h('button', {
            onClick: function() { askCounselor(d.freeWrite); },
            disabled: aiLoading,
            className: 'w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg text-xs font-bold text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
          }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '\ud83d\udcac Talk to AI Counselor about this')
        ),

        // ═══ UNDERSTAND IT ═══
        tab === 'understand' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83d\udd0d Why Does This Matter to Me?'),
            h('p', { className: 'text-sm text-slate-500' }, 'Understanding why you care is the first step toward meaningful action.')
          ),

          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-4' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'What issue or injustice concerns you most right now?'),
              h('input', {
                type: 'text', value: d.issueText || '',
                onChange: function(e) { upd('issueText', e.target.value); },
                placeholder: 'e.g., climate change, inequality, bullying, gun violence, housing...',
                className: 'w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Issue you care about'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Why does this matter to you personally?'),
              h('textarea', {
                value: d.whyItMatters || '',
                onChange: function(e) { upd('whyItMatters', e.target.value); },
                placeholder: 'Connect this issue to your life, your values, or people you care about...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Why it matters to you'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Who is most affected by this issue?'),
              h('textarea', {
                value: d.whoAffected || '',
                onChange: function(e) { upd('whoAffected', e.target.value); },
                placeholder: 'Think about the people and communities most impacted...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-teal-300',
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
            h('p', { className: 'text-sm text-slate-500' }, 'You do not have to fix the world to take care of yourself.')
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            COPING_STRATEGIES.map(function(strategy) {
              var isExpanded = selectedCoping === strategy.id;
              return h('div', {
                key: strategy.id,
                className: 'rounded-2xl border-2 overflow-hidden transition-all ' +
                  (isExpanded ? 'border-teal-400 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-300')
              },
                h('button', {
                  onClick: function() { upd('coping', isExpanded ? null : strategy.id); if (!isExpanded) ctx.awardXP(3); },
                  className: 'w-full p-4 text-left'
                },
                  h('div', { className: 'font-bold text-sm text-slate-800' }, strategy.label),
                  h('div', { className: 'text-[10px] text-slate-400 mt-0.5 uppercase font-bold' }, strategy.category)
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
            h('p', { className: 'text-sm text-slate-500' }, 'Learn about issues that affect your community and the world. (' + gradeBand + ' level)')
          ),

          !selectedIssue && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            issues.map(function(issue) {
              return h('button', {
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
                className: 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-left transition-all hover:border-teal-300 hover:shadow-md hover:scale-[1.01]'
              },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, issue.emoji),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, issue.title),
                    h('p', { className: 'text-xs text-slate-500 mt-0.5' }, issue.desc)
                  )
                )
              );
            })
          ),

          selectedIssue && (function() {
            var issue = issues.find(function(i) { return i.id === selectedIssue; });
            if (!issue) return null;
            return h('div', { className: 'space-y-4' },
              h('button', {
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
                callTTS && h('button', {
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
            h('p', { className: 'text-sm text-slate-500' }, 'You have more power than you think. Here are concrete steps you can take.')
          ),

          // Action cards
          h('div', { className: 'space-y-2' },
            actions.map(function(a, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:border-teal-300 transition-colors' },
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
            d.issueText && h('p', { className: 'text-xs text-slate-500 mb-3' }, 'Based on your concern about: "' + d.issueText + '"'),
            h('button', {
              onClick: generateActionPlan,
              disabled: aiLoading,
              className: 'px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-2'
            }, aiLoading ? 'Creating your plan...' : '\u2728 Generate My Action Plan'),

            // Display action plan
            actionPlan && actionPlan.steps && h('div', { className: 'mt-4 space-y-3' },
              actionPlan.steps.map(function(step, i) {
                return h('div', { key: i, className: 'bg-white rounded-xl border border-teal-200 p-3' },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0' }, i + 1),
                    h('div', null,
                      h('p', { className: 'text-sm font-bold text-slate-800' }, step.action),
                      h('p', { className: 'text-xs text-slate-500 mt-1' }, step.why),
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
            h('p', { className: 'text-sm text-slate-500' }, 'Build a step-by-step plan to create real change in your community.')
          ),

          // Progress bar
          h('div', { className: 'bg-slate-100 rounded-full h-2 overflow-hidden' },
            h('div', { className: 'bg-teal-500 h-full rounded-full transition-all', style: { width: ((plannerStep + 1) / PLANNER_STEPS.length * 100) + '%' } })
          ),
          h('div', { className: 'flex justify-between text-[10px] text-slate-400 font-bold' },
            h('span', null, 'Step ' + (plannerStep + 1) + ' of ' + PLANNER_STEPS.length),
            h('span', null, PLANNER_STEPS[plannerStep].label)
          ),

          // Current step
          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-teal-700' }, PLANNER_STEPS[plannerStep].label),
            h('p', { className: 'text-xs text-slate-500' }, PLANNER_STEPS[plannerStep].prompt),
            h('textarea', {
              value: plannerData[PLANNER_STEPS[plannerStep].id] || '',
              onChange: function(e) {
                var newData = {};
                for (var k in plannerData) { if (plannerData.hasOwnProperty(k)) newData[k] = plannerData[k]; }
                newData[PLANNER_STEPS[plannerStep].id] = e.target.value;
                upd('plannerData', newData);
              },
              placeholder: 'Write your response here...',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-28 outline-none focus:ring-2 focus:ring-teal-300',
              'aria-label': PLANNER_STEPS[plannerStep].label
            }),
            h('div', { className: 'flex justify-between' },
              plannerStep > 0 ? h('button', {
                onClick: function() { upd('plannerStep', plannerStep - 1); },
                className: 'px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50'
              }, '\u2190 Previous') : h('div'),
              plannerStep < PLANNER_STEPS.length - 1 ? h('button', {
                onClick: function() { upd('plannerStep', plannerStep + 1); ctx.awardXP(5); },
                className: 'px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
              }, 'Next \u2192') : h('button', {
                onClick: function() {
                  awardBadge('action_planner');
                  ctx.awardXP(20);
                  addToast('Your civic action plan is complete! You are a changemaker.', 'success');
                  ctx.celebrate();
                },
                className: 'px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700'
              }, '\u2728 Complete My Plan')
            )
          ),

          // Template letters section
          h('div', { className: 'bg-gradient-to-r from-slate-50 to-teal-50 rounded-2xl border border-slate-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-slate-700' }, '\ud83d\udce8 Template Letters'),
            h('p', { className: 'text-xs text-slate-500' }, 'Use these templates to write a formal letter advocating for your issue.'),
            h('div', { className: 'flex gap-2 flex-wrap' },
              Object.keys(LETTER_TEMPLATES).map(function(key) {
                var tmpl = LETTER_TEMPLATES[key];
                return h('button', {
                  key: key,
                  onClick: function() { upd('selectedTemplate', selectedTemplate === key ? null : key); },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' +
                    (selectedTemplate === key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-600 border-teal-300 hover:bg-teal-50')
                }, tmpl.title);
              })
            ),
            selectedTemplate && (function() {
              var tmpl = LETTER_TEMPLATES[selectedTemplate];
              return h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 mt-2 space-y-2' },
                h('div', { className: 'text-sm font-bold text-slate-700' }, tmpl.title),
                h('div', { className: 'text-xs text-slate-600 italic' }, tmpl.greeting),
                h('pre', { className: 'text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed mt-2 bg-slate-50 rounded-lg p-3 border border-slate-100' }, tmpl.body),
                h('p', { className: 'text-[10px] text-slate-400 mt-1' }, 'Tip: Copy this template and customize the parts in [brackets] with your own words.')
              );
            })()
          ),

          // Petition creator
          h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-bold text-amber-700' }, '\u270d\ufe0f Petition Creator'),
            h('p', { className: 'text-xs text-slate-500' }, 'Draft a petition to gather support for your cause.'),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Petition Title'),
              h('input', {
                type: 'text',
                value: d.petitionTitle || '',
                onChange: function(e) { upd('petitionTitle', e.target.value); },
                placeholder: 'e.g., "Add Recycling Bins to Every Classroom"',
                className: 'w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Petition title'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Why This Matters'),
              h('textarea', {
                value: d.petitionDesc || '',
                onChange: function(e) { upd('petitionDesc', e.target.value); },
                placeholder: 'Explain the problem and why this change is important...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Petition description'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'What We Are Asking For'),
              h('textarea', {
                value: d.petitionAsks || '',
                onChange: function(e) { upd('petitionAsks', e.target.value); },
                placeholder: '1. \n2. \n3. ',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Petition asks'
              })
            ),
            d.petitionTitle && d.petitionDesc && h('button', {
              onClick: function() { addToast('Petition draft saved! Share it with classmates to gather support.', 'success'); ctx.awardXP(10); },
              className: 'px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700'
            }, '\ud83d\udcbe Save Petition Draft')
          )
        ),

        // ═══ CIVIC SKILLS QUIZ (NEW) ═══
        tab === 'quiz' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udfc6 Civic Skills Quiz'),
            h('p', { className: 'text-sm text-slate-500' }, 'Test your knowledge of civic concepts! (' + gradeBand + ' level)')
          ),

          !quizDone && (function() {
            var question = quizQuestions[quizIdx];
            if (!question) return null;
            return h('div', { className: 'space-y-4' },
              // Progress
              h('div', { className: 'flex justify-between items-center' },
                h('span', { className: 'text-xs font-bold text-slate-500' }, 'Question ' + (quizIdx + 1) + ' of ' + quizQuestions.length),
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
                    else if (!showResult) btnClass += 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50 text-slate-700';
                    else btnClass += 'border-slate-200 bg-slate-50 text-slate-500';
                    return h('button', {
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
                quizAnswered && h('button', {
                  onClick: function() {
                    if (quizIdx < quizQuestions.length - 1) {
                      updMulti({ quizIdx: quizIdx + 1, quizAnswer: undefined, quizAnswered: false });
                    } else {
                      upd('quizDone', true);
                      if (quizScore === quizQuestions.length) awardBadge('quiz_champion');
                    }
                  },
                  className: 'w-full px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 mt-2'
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
            h('button', {
              onClick: function() { updMulti({ quizIdx: 0, quizAnswer: undefined, quizScore: 0, quizDone: false, quizAnswered: false }); },
              className: 'px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700'
            }, '\ud83d\udd04 Try Again')
          )
        ),

        // ═══ COMMUNITY CHANGE SCENARIOS (NEW) ═══
        tab === 'scenarios' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udfad Community Change Scenarios'),
            h('p', { className: 'text-sm text-slate-500' }, 'What would you do? Make choices and see how effective different approaches are.')
          ),

          !scenarioDone && (function() {
            var scenario = scenarios[scenarioIdx];
            if (!scenario) return null;
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'flex justify-between items-center' },
                h('span', { className: 'text-xs font-bold text-slate-500' }, 'Scenario ' + (scenarioIdx + 1) + ' of ' + scenarios.length),
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
                    if (showResult && isChosen) btnClass += choice.score >= 4 ? 'border-emerald-400 bg-emerald-50' : choice.score >= 3 ? 'border-amber-400 bg-amber-50' : 'border-red-300 bg-red-50';
                    else if (!showResult) btnClass += 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50';
                    else btnClass += 'border-slate-200 bg-slate-50 text-slate-500';
                    return h('div', { key: ci },
                      h('button', {
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

                scenarioChosen && h('button', {
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
            h('button', {
              onClick: function() { updMulti({ scenarioIdx: 0, scenarioChoice: undefined, scenarioScore: 0, scenarioDone: false, scenarioChosen: false }); },
              className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
            }, '\ud83d\udd04 Try Again')
          )
        ),

        // ═══ HOPE ═══
        tab === 'hope' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\ud83c\udf05 Cultivating Hope'),
            h('p', { className: 'text-sm text-slate-500' }, 'Hope is not the belief that things will be easy. It is the belief that things can be better \u2014 and the courage to work toward it.')
          ),

          // Hope anchors — people who changed things
          h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-xs font-bold text-teal-600 uppercase tracking-widest' }, '\ud83c\udf1f People Who Started Where You Are'),
            HOPE_ANCHORS.map(function(anchor, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors' },
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
                      h('span', { className: 'text-[10px] text-slate-400' }, cm.years),
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
            h('p', { className: 'text-xs text-slate-500 mb-3' }, 'Close your eyes for a moment. Imagine the world you want to live in 20 years from now. What does it look like?'),
            h('textarea', {
              value: d.visionText || '',
              onChange: function(e) { upd('visionText', e.target.value); },
              placeholder: 'Describe the world you want to help create...',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-amber-300',
              'aria-label': 'Your vision for the future'
            }),
            d.visionText && d.visionText.length > 20 && h('button', {
              onClick: function() {
                ctx.awardXP(15);
                addToast('Your vision matters. Hold onto it. \ud83c\udf05', 'success');
                awardBadge('hope_keeper');
                ctx.celebrate();
              },
              className: 'mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
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
        aiResponse && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4' },
          h('div', { className: 'flex items-start gap-2' },
            h(Heart, { size: 14, className: 'text-teal-500 mt-0.5 shrink-0' }),
            h('div', null,
              h('div', { className: 'text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1' }, 'Counselor'),
              h('p', { className: 'text-sm text-teal-800 leading-relaxed' }, aiResponse)
            )
          ),
          h('button', { onClick: function() { upd('aiResponse', null); }, className: 'mt-2 text-[10px] text-teal-400 hover:text-teal-600 font-bold' }, 'Dismiss')
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_civicaction.js loaded');
