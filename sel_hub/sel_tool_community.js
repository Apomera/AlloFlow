// ═══════════════════════════════════════════════════════════════
// sel_tool_community.js — Community & Culture Plugin (v1.0)
// Cultural awareness, identity mapping, navigating differences,
// AI-powered cultural awareness coach.
// Registered tool ID: "community"
// Category: social-awareness
// Grade-adaptive: uses ctx.gradeBand for vocabulary & depth
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxReveal() { playTone(392, 0.1, 'sine', 0.06); setTimeout(function() { playTone(494, 0.1, 'sine', 0.06); }, 80); setTimeout(function() { playTone(588, 0.15, 'sine', 0.08); }, 160); }
  function sfxDiscover() { playTone(440, 0.12, 'sine', 0.07); setTimeout(function() { playTone(554, 0.12, 'sine', 0.07); }, 100); setTimeout(function() { playTone(659, 0.15, 'sine', 0.09); }, 200); }

  // ══════════════════════════════════════════════════════════════
  // ── Cultural Exploration Content (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var CULTURE_ITEMS = {
    elementary: [
      { id: 'ce1', emoji: '\uD83C\uDF8A', name: 'Diwali', desc: 'A festival of lights celebrated by Hindu, Sikh, and Jain communities. Families light oil lamps, share sweets, and celebrate the victory of light over darkness.' },
      { id: 'ce2', emoji: '\uD83C\uDF19', name: 'Ramadan & Eid', desc: 'During Ramadan, many Muslims fast from sunrise to sunset for a whole month. Eid al-Fitr is the joyful celebration when the fast ends, with feasts and gifts.' },
      { id: 'ce3', emoji: '\uD83C\uDF83', name: 'D\u00EDa de los Muertos', desc: 'A Mexican celebration honoring loved ones who have passed. Families create altars with marigolds, photos, and favorite foods to remember them with joy.' },
      { id: 'ce4', emoji: '\uD83E\uDD5F', name: 'Lunar New Year', desc: 'Celebrated across many Asian cultures with dragon dances, red envelopes, and special foods. Each year is named after an animal from the zodiac.' },
      { id: 'ce5', emoji: '\uD83D\uDD6F\uFE0F', name: 'Hanukkah', desc: 'An eight-night Jewish celebration. Families light candles on a menorah, play dreidel, and eat foods fried in oil like latkes and sufganiyot.' },
      { id: 'ce6', emoji: '\uD83C\uDFB6', name: 'Music Around the World', desc: 'Every culture has its own music! Drums in West Africa, steel pans in Trinidad, sitars in India, didgeridoos in Australia \u2014 music connects us all.' },
      { id: 'ce7', emoji: '\uD83C\uDF5C', name: 'Foods That Tell Stories', desc: 'Tamales, jollof rice, pierogi, pho, injera \u2014 every culture has dishes passed down through generations. Food carries memories and love.' },
      { id: 'ce8', emoji: '\uD83D\uDDE3\uFE0F', name: 'Languages of the World', desc: 'There are over 7,000 languages spoken on Earth! Some people speak two or three languages at home. Being multilingual is a superpower.' },
      { id: 'ce9', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66', name: 'Family Traditions', desc: 'Some families have game nights, others cook together on Sundays, some tell stories before bed. Every family has its own special ways of showing love.' },
      { id: 'ce10', emoji: '\uD83C\uDF0D', name: 'Kwanzaa', desc: 'A week-long celebration of African heritage and community. Each of the seven days honors a different principle like unity, creativity, and faith.' }
    ],
    middle: [
      { id: 'cm1', emoji: '\uD83E\uDDE9', name: 'Cultural Identity', desc: 'Your cultural identity is made up of many pieces: where your family is from, the languages you speak, your traditions, values, and beliefs. No two people have the exact same cultural identity.' },
      { id: 'cm2', emoji: '\uD83D\uDEAB', name: 'Stereotypes vs. Facts', desc: 'Stereotypes are oversimplified beliefs about a group. They ignore individual differences and can be harmful even when they seem "positive." Challenge yourself to see people as individuals, not categories.' },
      { id: 'cm3', emoji: '\uD83D\uDCA1', name: 'Privilege Awareness', desc: 'Privilege means having advantages you didn\'t earn based on parts of your identity. Recognizing privilege isn\'t about guilt \u2014 it\'s about understanding how the world works differently for different people.' },
      { id: 'cm4', emoji: '\uD83E\uDD1D', name: 'Allyship', desc: 'An ally uses their voice and actions to support people who face discrimination. Allyship means listening, learning, speaking up, and showing up \u2014 even when it\'s uncomfortable.' },
      { id: 'cm5', emoji: '\uD83C\uDF0E', name: 'Cultural Appreciation vs. Appropriation', desc: 'Appreciation means learning about a culture with respect and permission. Appropriation means taking elements of a culture without understanding or honoring their meaning.' },
      { id: 'cm6', emoji: '\uD83D\uDCAC', name: 'Code-Switching', desc: 'Many people change how they talk, dress, or act depending on the environment. Code-switching can be a survival skill, but it shouldn\'t mean hiding who you are.' },
      { id: 'cm7', emoji: '\uD83D\uDCDA', name: 'Hidden Histories', desc: 'Many cultures and communities have histories that aren\'t taught in mainstream education. Seeking out diverse perspectives helps us understand the full picture.' },
      { id: 'cm8', emoji: '\u2764\uFE0F', name: 'Microaggressions', desc: 'Small comments or actions that communicate negative messages about someone\'s identity. They may seem minor individually, but they add up and cause real harm.' }
    ],
    high: [
      { id: 'ch1', emoji: '\uD83D\uDD17', name: 'Intersectionality', desc: 'A person\'s identity includes race, gender, class, ability, sexuality, religion, and more. These identities intersect and create unique experiences of both privilege and oppression that can\'t be understood in isolation.' },
      { id: 'ch2', emoji: '\u2696\uFE0F', name: 'Systemic Bias', desc: 'Bias isn\'t just personal prejudice \u2014 it\'s built into systems, laws, and institutions. Understanding systemic bias means looking at patterns and outcomes, not just individual intent.' },
      { id: 'ch3', emoji: '\uD83C\uDF31', name: 'Cultural Humility', desc: 'Unlike cultural "competence" (which implies mastery), cultural humility is an ongoing process of self-reflection, learning, and recognizing that you\'ll never fully understand another\'s experience.' },
      { id: 'ch4', emoji: '\uD83D\uDCE2', name: 'Advocacy & Action', desc: 'Moving from awareness to action means using your voice, vote, and choices to create change. Advocacy can be quiet (one-on-one conversations) or loud (organizing and activism).' },
      { id: 'ch5', emoji: '\uD83E\uDDE0', name: 'Implicit Bias', desc: 'Everyone has unconscious biases shaped by media, upbringing, and society. Recognizing them doesn\'t make you bad \u2014 refusing to examine them does.' },
      { id: 'ch6', emoji: '\uD83C\uDFD7\uFE0F', name: 'Structural Inequality', desc: 'Disparities in wealth, education, healthcare, and justice aren\'t accidents. They\'re the result of historical and ongoing policies. Understanding this is the first step to dismantling it.' },
      { id: 'ch7', emoji: '\uD83D\uDD04', name: 'Decolonizing Knowledge', desc: 'Much of what we\'re taught centers Western perspectives. Decolonizing means seeking out and valuing knowledge systems from Indigenous, African, Asian, and other non-Western traditions.' },
      { id: 'ch8', emoji: '\uD83D\uDC65', name: 'Coalition Building', desc: 'Real change happens when diverse communities work together across differences. Coalition building requires trust, shared goals, and willingness to center the most affected voices.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Identity Wheel Categories ──
  // ══════════════════════════════════════════════════════════════
  var IDENTITY_CATEGORIES = [
    { id: 'family', icon: '\uD83C\uDFE0', label: 'Family', prompt: 'How does your family shape who you are? What traditions or values come from your family?' },
    { id: 'language', icon: '\uD83D\uDDE3\uFE0F', label: 'Language', prompt: 'What language(s) do you speak? How does language connect you to your culture or community?' },
    { id: 'beliefs', icon: '\u2728', label: 'Religion / Beliefs', prompt: 'What do you believe in? How do your spiritual or philosophical beliefs guide your life?' },
    { id: 'race', icon: '\uD83C\uDF0D', label: 'Race / Ethnicity', prompt: 'How does your racial or ethnic background influence your experiences and how you see the world?' },
    { id: 'gender', icon: '\uD83D\uDC9C', label: 'Gender', prompt: 'How does your gender identity shape your daily life and how others interact with you?' },
    { id: 'abilities', icon: '\uD83D\uDCAA', label: 'Abilities', prompt: 'What are your strengths and challenges? How do your abilities (physical, cognitive, emotional) affect your experience?' },
    { id: 'interests', icon: '\uD83C\uDFA8', label: 'Interests', prompt: 'What activities, hobbies, or passions define who you are? How did you discover them?' },
    { id: 'community', icon: '\uD83C\uDFD8\uFE0F', label: 'Community', prompt: 'What communities do you belong to? How does where you live or the groups you\'re part of shape your identity?' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Cultural Scenarios (grade-adaptive, branching) ──
  // ══════════════════════════════════════════════════════════════
  var SCENARIOS = {
    elementary: [
      { id: 'sc1', title: 'The Lunch Table', setup: 'A classmate brings food from their culture for lunch. Another kid says "Ew, that looks gross! What IS that?"',
        branches: [
          { label: 'Laugh along with the other kid. You don\'t want to seem weird.', rating: 1, feedback: 'Laughing at someone\'s food is laughing at their culture. The classmate feels hurt and embarrassed about something their family made with love.' },
          { label: 'Say nothing and look away. It\'s not your problem.', rating: 2, feedback: 'Staying silent is better than joining in, but the classmate still feels alone. Sometimes silence feels like agreement.' },
          { label: 'Say: "That looks interesting! What is it?" and show genuine curiosity.', rating: 3, feedback: 'Your curiosity turned an awkward moment into a learning moment. The classmate feels proud to share, and everyone learns something new.' }
        ] },
      { id: 'sc2', title: 'The Holiday Assumption', setup: 'Your teacher says "Did everyone have a great Christmas?" but your friend doesn\'t celebrate Christmas. They look uncomfortable.',
        branches: [
          { label: 'Don\'t say anything. The teacher probably didn\'t mean anything by it.', rating: 1, feedback: 'Intent doesn\'t erase impact. Your friend feels invisible because their experience wasn\'t acknowledged.' },
          { label: 'Whisper to your friend: "That must feel weird. I\'m sorry."', rating: 2, feedback: 'Acknowledging your friend\'s feelings shows empathy. But speaking up publicly could help everyone.' },
          { label: 'Raise your hand and say: "Not everyone celebrates the same holidays. What did everyone do over break?"', rating: 3, feedback: 'You reframed the question to include everyone. Your friend feels seen, and the class learns that different isn\'t wrong \u2014 it\'s normal.' }
        ] },
      { id: 'sc3', title: 'The Name Problem', setup: 'A new student has a name your teacher keeps mispronouncing. The student corrects them quietly but the teacher keeps saying it wrong.',
        branches: [
          { label: 'Ignore it. Names aren\'t that important.', rating: 1, feedback: 'Names are deeply important \u2014 they carry culture, family history, and identity. Getting someone\'s name right is a basic form of respect.' },
          { label: 'Try to learn the correct pronunciation yourself and use it.', rating: 2, feedback: 'Using someone\'s correct name shows respect. You\'re modeling the right behavior even if the teacher hasn\'t caught on yet.' },
          { label: 'Politely say: "I think their name is pronounced ___. They told us earlier!" Support the student.', rating: 3, feedback: 'You stood up for the student AND helped the teacher without being rude. Everyone deserves to hear their name said correctly.' }
        ] },
      { id: 'sc4', title: 'The Cultural Outfit', setup: 'A classmate wears traditional clothing from their culture to school. Some kids point and whisper.',
        branches: [
          { label: 'Join the whispering. The clothes do look different.', rating: 1, feedback: 'Different doesn\'t mean wrong. Whispering about someone\'s cultural clothing makes them feel ashamed of their heritage.' },
          { label: 'Ignore the whispering but don\'t say anything to the classmate.', rating: 2, feedback: 'Not participating is good, but silence while others mock someone can feel like you agree with them.' },
          { label: 'Compliment the classmate: "Your outfit is really cool! Is it for something special?" and sit with them.', rating: 3, feedback: 'Your kindness showed the classmate that their culture is valued. A simple compliment can make someone feel proud instead of embarrassed.' }
        ] },
      { id: 'sc5', title: 'The Missing Representation', setup: 'Your class is doing a project about "important people in history" but none of the suggested people look like you or come from your background.',
        branches: [
          { label: 'Just pick from the list. It doesn\'t matter.', rating: 1, feedback: 'It does matter. Everyone deserves to see themselves reflected in what they learn. Your history is important too.' },
          { label: 'Feel frustrated but don\'t say anything.', rating: 2, feedback: 'Your frustration is valid. But if you don\'t speak up, the teacher may not realize the list was incomplete.' },
          { label: 'Ask the teacher: "Can I research someone from my own background? I\'d love to share their story with the class."', rating: 3, feedback: 'You advocated for representation AND offered to educate your classmates. Your culture\'s heroes deserve to be known.' }
        ] }
    ],
    middle: [
      { id: 'sm1', title: 'The "Compliment" That Isn\'t', setup: 'Someone tells your friend who is Asian American: "You speak English so well!" Your friend was born here and English is their first language.',
        branches: [
          { label: 'Don\'t say anything. It was meant as a compliment.', rating: 1, feedback: 'This is a microaggression \u2014 it assumes someone is foreign based on how they look. Good intentions don\'t erase harmful impact.' },
          { label: 'Later, tell your friend: "That comment was weird. Are you okay?"', rating: 2, feedback: 'Checking in shows you noticed and you care. Your friend feels less alone in processing the experience.' },
          { label: 'Say in the moment: "They were born here \u2014 of course they speak English well. We all do." Then check in with your friend privately.', rating: 3, feedback: 'You addressed the microaggression in the moment without being hostile, AND checked in privately. That\'s what allyship looks like.' }
        ] },
      { id: 'sm2', title: 'The Group Project Gap', setup: 'Your group is presenting about world cultures. One member says: "Let\'s just do America. Other cultures are too confusing."',
        branches: [
          { label: 'Agree. It would be easier to stick with what you know.', rating: 1, feedback: 'Avoiding other cultures because they\'re "confusing" is a missed opportunity. Learning about others is the whole point.' },
          { label: 'Suggest: "We could do America, but include different cultures within America."', rating: 2, feedback: 'Good compromise! America IS multicultural, and exploring that challenges the idea that there\'s one "American" culture.' },
          { label: 'Say: "Let\'s pick a culture none of us know well \u2014 we\'ll actually learn something new. That\'s the point of the project."', rating: 3, feedback: 'You reframed the discomfort as an opportunity. Genuine learning happens outside your comfort zone.' }
        ] },
      { id: 'sm3', title: 'The Social Media Post', setup: 'A classmate posts a Halloween costume that\'s a stereotypical version of another culture. Some people are calling it racist. The classmate says "It\'s just a costume."',
        branches: [
          { label: 'Like the post. People are too sensitive these days.', rating: 1, feedback: 'Cultural costumes reduce someone\'s identity to a caricature. Dismissing people\'s hurt as "too sensitive" avoids the real issue.' },
          { label: 'Don\'t like or comment. Stay out of it.', rating: 2, feedback: 'Not amplifying the post is good, but silence can feel like agreement. Consider whether this is a moment to learn and grow.' },
          { label: 'Message the classmate privately: "Hey, I don\'t think you meant to be hurtful, but that costume is a stereotype. Here\'s why it matters..."', rating: 3, feedback: 'You approached with empathy, assumed good intent, and educated privately. This gives them space to learn without public shaming.' }
        ] },
      { id: 'sm4', title: 'The Accent Mocking', setup: 'During a class presentation, a student speaks with an accent. After class, other kids imitate the accent and laugh.',
        branches: [
          { label: 'Join in. The impression is funny.', rating: 1, feedback: 'Mocking someone\'s accent mocks their language, their family, and their courage in speaking a second (or third) language.' },
          { label: 'Walk away. You don\'t want to be part of it.', rating: 2, feedback: 'Removing yourself is better than participating, but the mocking continues without anyone pushing back.' },
          { label: 'Say: "They speak multiple languages. How many do you speak? That takes real skill."', rating: 3, feedback: 'You reframed the accent as a strength and challenged the mockery. Speaking multiple languages is impressive, not something to ridicule.' }
        ] },
      { id: 'sm5', title: 'The Token Friend', setup: 'You overhear someone say they "can\'t be racist because they have a [insert race] friend." That friend is someone you know.',
        branches: [
          { label: 'Don\'t get involved. It\'s between them.', rating: 1, feedback: 'Using a person as proof you\'re not biased reduces them to a token. Your friend deserves to be a person, not an argument.' },
          { label: 'Talk to your friend later and ask how they feel about it.', rating: 2, feedback: 'Checking on your friend shows care. They may already know this happens and appreciate someone noticing.' },
          { label: 'Address it: "Having a friend from a group doesn\'t mean you can\'t have blind spots. We all do. What matters is being willing to learn."', rating: 3, feedback: 'You challenged the logic without attacking the person. Bias exists in everyone \u2014 acknowledging that is the first step.' }
        ] }
    ],
    high: [
      { id: 'sh1', title: 'The Debate That Gets Personal', setup: 'In a class discussion about immigration policy, someone makes a comment that directly targets your family\'s experience. The teacher doesn\'t intervene.',
        branches: [
          { label: 'Stay silent. It\'s a "debate" so everything is fair game.', rating: 1, feedback: 'Debates about policy affect real people. When your lived experience is dismissed as a talking point, you have every right to speak up.' },
          { label: 'Get angry and call the person ignorant.', rating: 2, feedback: 'Your anger is valid, but attacking the person shuts down the conversation. It\'s hard, but separating the person from the argument is more effective.' },
          { label: 'Say: "This isn\'t abstract for me. My family lives this. I\'d like to share what the reality actually looks like."', rating: 3, feedback: 'You centered lived experience as expertise. When policy discussions become personal, real stories have the power to change minds.' }
        ] },
      { id: 'sh2', title: 'The Curriculum Complaint', setup: 'Your English class only reads books by white male authors. When you bring it up, the teacher says "We read the best literature. It\'s not about identity."',
        branches: [
          { label: 'Drop it. The teacher knows more about literature than you.', rating: 1, feedback: 'Curricula reflect choices, not objective quality. Many brilliant writers from diverse backgrounds are excluded not because they\'re lesser, but because of historical gatekeeping.' },
          { label: 'Complain to friends but don\'t take action.', rating: 2, feedback: 'Venting is valid but doesn\'t create change. Your frustration could become a catalyst if channeled into action.' },
          { label: 'Research diverse authors of equal literary merit. Propose additions to the curriculum with specific titles and reasons. Bring it to the department chair if needed.', rating: 3, feedback: 'You used research and advocacy to challenge the system respectfully. Presenting alternatives is more powerful than just pointing out problems.' }
        ] },
      { id: 'sh3', title: 'The Performative Allyship', setup: 'Your school posts about diversity on social media but a student who reported racial harassment was told to "not make it a big deal."',
        branches: [
          { label: 'At least they\'re posting about diversity. It\'s a start.', rating: 1, feedback: 'Words without action are performance, not allyship. If the institution silences the people it claims to support, the messaging is hollow.' },
          { label: 'Support the harassed student privately.', rating: 2, feedback: 'Private support matters, but systemic problems need systemic responses. One-on-one care doesn\'t fix institutional failure.' },
          { label: 'Organize: gather student voices, document the gap between messaging and action, and present it to administration with specific demands for change.', rating: 3, feedback: 'You moved from individual support to collective action. Holding institutions accountable requires evidence, organization, and persistence.' }
        ] },
      { id: 'sh4', title: 'The Uncomfortable Conversation', setup: 'A close friend says something casually racist. You know they\'re not a hateful person, but the comment was harmful.',
        branches: [
          { label: 'Let it slide. They didn\'t mean it and calling it out would ruin the friendship.', rating: 1, feedback: 'Avoiding discomfort protects the relationship in the short term but erodes it over time. Real friends hold each other accountable.' },
          { label: 'Distance yourself from them without explaining why.', rating: 2, feedback: 'They deserve to understand what they said and why it mattered. Ghosting doesn\'t create growth for either of you.' },
          { label: 'Say privately: "I know you didn\'t mean harm, but what you said was [explain]. I\'m telling you because I respect you enough to be honest."', rating: 3, feedback: 'You framed accountability as an act of care. The best friendships can survive honesty. Growth requires discomfort.' }
        ] },
      { id: 'sh5', title: 'The Tokenized Invitation', setup: 'You\'re invited to speak on a panel about diversity. You realize you\'re the only person of color and the panel is organized by people who\'ve never asked your opinion before.',
        branches: [
          { label: 'Decline. They\'re just using you for optics.', rating: 1, feedback: 'Your skepticism is valid, but declining without dialogue means the panel happens without diverse voices at all.' },
          { label: 'Accept and say what they want to hear.', rating: 2, feedback: 'Being a comfortable token helps the organizers but not the community. Your voice matters when it\'s authentic.' },
          { label: 'Accept conditionally: "I\'ll join if you also invite [specific people], if I can help shape the questions, and if this leads to concrete action \u2014 not just a photo op."', rating: 3, feedback: 'You used the invitation as leverage for real inclusion. Setting conditions ensures your participation creates change rather than decoration.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_explorer',    icon: '\uD83D\uDD0D', name: 'First Explorer',       desc: 'Explore your first cultural topic' },
    { id: 'culture_curious',   icon: '\uD83C\uDF0D', name: 'Culture Curious',      desc: 'Explore 5 cultural topics' },
    { id: 'identity_builder',  icon: '\uD83E\uDDE9', name: 'Identity Builder',     desc: 'Fill in 3 identity areas' },
    { id: 'ally_training',     icon: '\uD83E\uDD1D', name: 'Ally in Training',     desc: 'Complete a scenario with top rating' },
    { id: 'deep_listener',     icon: '\uD83D\uDC42', name: 'Deep Listener',        desc: 'Complete 3 scenarios' },
    { id: 'bridge_builder',    icon: '\uD83C\uDF09', name: 'Bridge Builder',       desc: 'Complete a scenario in every grade band topic' },
    { id: 'reflective',        icon: '\uD83E\uDE9E', name: 'Reflective',           desc: 'Write your Cultural Superpower reflection' },
    { id: 'ai_learner',        icon: '\u2728',        name: 'AI Learner',           desc: 'Ask the AI Cultural Coach a question' },
    { id: 'all_tabs',          icon: '\uD83D\uDCCB', name: 'All Tabs Visited',     desc: 'Visit every tab at least once' },
    { id: 'culture_champion',  icon: '\uD83C\uDFC6', name: 'Culture Champion',     desc: 'Earn 7 other badges' },
    { id: 'identity_complete', icon: '\uD83C\uDF1F', name: 'Identity Complete',    desc: 'Fill in all 8 identity areas' },
    { id: 'scenario_master',   icon: '\uD83C\uDFAD', name: 'Scenario Master',      desc: 'Complete all 5 scenarios in your grade band' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Practice Streak',      desc: 'Practice 3 days in a row' },
    { id: 'total_10',          icon: '\uD83D\uDC8E', name: 'Dedicated Learner',    desc: 'Complete 10 activities across all tabs' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('community', {
    icon: '\uD83C\uDF0D',
    label: 'Community & Culture',
    desc: 'Explore cultural awareness, map your identity, navigate cultural differences, and build allyship skills with an AI cultural coach.',
    color: 'cyan',
    category: 'social-awareness',
    render: function(ctx) {
      return (function() {
        var React = ctx.React;
        var h = React.createElement;
        var toolData = ctx.toolData;
        var setToolData = ctx.setToolData;
        var addToast = ctx.addToast;
        var awardXP = ctx.awardXP;
        var celebrate = ctx.celebrate;
        var callGemini = ctx.callGemini;
        var callTTS = ctx.callTTS;
        var gradeLevel = ctx.gradeLevel;

        // ── Grade band detection ──
        var band = (function() {
          var g = parseInt(gradeLevel) || 5;
          if (g <= 5) return 'elementary';
          if (g <= 8) return 'middle';
          return 'high';
        })();

        // ── Tool-scoped state ──
        var d = (toolData && toolData.community) || {};
        var upd = function(obj) {
          setToolData(function(prev) {
            var s = Object.assign({}, (prev && prev.community) || {}, obj);
            return Object.assign({}, prev, { community: s });
          });
        };

        // Navigation
        var activeTab      = d.activeTab || 'explore';
        var soundEnabled   = d.soundEnabled != null ? d.soundEnabled : true;
        var visitedTabs    = d.visitedTabs || {};

        // Explore state
        var exploredItems  = d.exploredItems || {};
        var expandedItem   = d.expandedItem || null;
        var learnCount     = d.learnCount || 0;

        // Identity state
        var identityMap    = d.identityMap || {};
        var superpower     = d.superpower || '';
        var superpowerSaved = d.superpowerSaved || false;

        // Scenarios state
        var scIdx          = d.scIdx || 0;
        var scChoice       = d.scChoice != null ? d.scChoice : null;
        var scCompleted    = d.scCompleted || 0;
        var scTopRatings   = d.scTopRatings || 0;

        // AI Coach state
        var aiPrompt       = d.aiPrompt || '';
        var aiResponse     = d.aiResponse || null;
        var aiLoading      = d.aiLoading || false;

        // Badges & log
        var practiceLog    = d.practiceLog || [];
        var earnedBadges   = d.earnedBadges || {};
        var showBadgePopup = d.showBadgePopup || null;
        var showBadgesPanel = d.showBadgesPanel || false;

        // ── Accent Color (cyan) ──
        var ACCENT = '#06b6d4';
        var ACCENT_DIM = '#06b6d422';
        var ACCENT_MED = '#06b6d444';

        // ── Helpers ──
        function tryAwardBadge(badgeId) {
          if (earnedBadges[badgeId]) return;
          var newBadges = Object.assign({}, earnedBadges);
          newBadges[badgeId] = Date.now();
          upd({ earnedBadges: newBadges });
          var badge = BADGES.find(function(b) { return b.id === badgeId; });
          if (badge) {
            upd({ showBadgePopup: badgeId });
            if (soundEnabled) sfxBadge();
            addToast(badge.icon + ' Badge earned: ' + badge.name + '!', 'success');
            awardXP(25);
            setTimeout(function() { upd({ showBadgePopup: null }); }, 3000);
          }
        }

        function checkBadges() {
          var explored = Object.keys(exploredItems).length;
          if (explored >= 1) tryAwardBadge('first_explorer');
          if (explored >= 5) tryAwardBadge('culture_curious');

          var filledIdentity = 0;
          IDENTITY_CATEGORIES.forEach(function(cat) { if (identityMap[cat.id] && identityMap[cat.id].trim().length > 0) filledIdentity++; });
          if (filledIdentity >= 3) tryAwardBadge('identity_builder');
          if (filledIdentity >= 8) tryAwardBadge('identity_complete');

          if (superpower && superpower.trim().length > 0 && superpowerSaved) tryAwardBadge('reflective');
          if (scTopRatings >= 1) tryAwardBadge('ally_training');
          if (scCompleted >= 3) tryAwardBadge('deep_listener');
          if (scCompleted >= 5) tryAwardBadge('scenario_master');

          var tabsVisited = visitedTabs;
          if (tabsVisited.explore && tabsVisited.identity && tabsVisited.scenarios && tabsVisited.badges) tryAwardBadge('all_tabs');

          var badgeCount = Object.keys(earnedBadges).length;
          if (badgeCount >= 7) tryAwardBadge('culture_champion');
        }

        function logPractice(type, id) {
          var entry = { type: type, id: id, timestamp: Date.now() };
          var newLog = practiceLog.concat([entry]);
          upd({ practiceLog: newLog });
          var totalAct = learnCount + scCompleted + Object.keys(identityMap).length;
          if (totalAct + 1 >= 10) tryAwardBadge('total_10');
          var daySet = {};
          newLog.forEach(function(e) { daySet[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
          var today = new Date();
          var streak = 0;
          for (var si = 0; si < 30; si++) {
            var chk = new Date(today);
            chk.setDate(chk.getDate() - si);
            if (daySet[chk.toISOString().slice(0,10)]) { streak++; } else if (si > 0) { break; }
          }
          if (streak >= 3) tryAwardBadge('streak_3');
        }

        function speak(text) {
          if (callTTS) callTTS(text).then(function(url) { if (url) { var a = new Audio(url); a.play().catch(function() {}); } }).catch(function() {});
        }

        // ── Track tab visits ──
        if (!visitedTabs[activeTab]) {
          var newVisited = Object.assign({}, visitedTabs);
          newVisited[activeTab] = true;
          upd({ visitedTabs: newVisited });
        }

        // ══════════════════════════════════════════════════════════
        // ── Tab Bar ──
        // ══════════════════════════════════════════════════════════
        var tabs = [
          { id: 'explore',   label: '\uD83C\uDF0D Explore' },
          { id: 'identity',  label: '\uD83E\uDDE9 Identity' },
          { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' },
          { id: 'badges',    label: '\uD83C\uDFC5 Badges' }
        ];

        var tabBar = h('div', {
          style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
        },
          tabs.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', {
              key: t.id,
              onClick: function() {
                upd({ activeTab: t.id });
                if (soundEnabled) sfxClick();
                checkBadges();
              },
              'aria-selected': isActive, role: 'tab',
              style: {
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8', transition: 'all 0.15s'
              }
            }, t.label);
          }),
          h('button', { onClick: function() { upd({ soundEnabled: !soundEnabled }); }, style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b' }, title: soundEnabled ? 'Mute' : 'Unmute' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
          h('button', { onClick: function() { upd({ showBadgesPanel: !showBadgesPanel }); }, style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b', position: 'relative' } },
            '\uD83C\uDFC5',
            Object.keys(earnedBadges).length > 0 && h('span', { style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, Object.keys(earnedBadges).length)
          )
        );

        // ── Badge Popup ──
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' }, onClick: function() { upd({ showBadgePopup: null }); } },
              h('div', { style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 300 } },
                h('div', { style: { fontSize: 56, marginBottom: 10 } }, popBadge.icon),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
                h('div', { style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
              )
            );
          }
        }
        if (showBadgesPanel) {
          badgePopup = h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, background: 'rgba(0,0,0,0.5)' }, onClick: function() { upd({ showBadgesPanel: false }); } },
            h('div', { onClick: function(e) { e.stopPropagation(); }, style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto' } },
              h('h3', { style: { textAlign: 'center', color: '#f1f5f9', marginBottom: 16, fontSize: 16 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                BADGES.map(function(b) {
                  var earned = !!earnedBadges[b.id];
                  return h('div', { key: b.id, style: { padding: 12, borderRadius: 10, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.5 } },
                    h('div', { style: { fontSize: 28 } }, earned ? b.icon : '\uD83D\uDD12'),
                    h('div', { style: { fontSize: 11, fontWeight: 600, color: earned ? '#f1f5f9' : '#64748b', marginTop: 4 } }, b.name),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, b.desc)
                  );
                })
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Explore ──
        // Cultural awareness content with grade-adaptive items
        // ══════════════════════════════════════════════════════════
        var exploreContent = null;
        if (activeTab === 'explore') {
          var items = CULTURE_ITEMS[band] || CULTURE_ITEMS.elementary;

          exploreContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? '\uD83C\uDF0D Cultures Around Us' :
              band === 'middle' ? '\uD83C\uDF0E Understanding Culture' :
              '\uD83C\uDF0F Culture, Power & Identity'
            ),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20 } },
              band === 'elementary' ? 'Tap a topic to learn something new! Every culture has amazing stories.' :
              band === 'middle' ? 'Explore how culture shapes identity, relationships, and society.' :
              'Examine the systems, structures, and intersections that shape cultural experience.'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              items.map(function(item) {
                var isExpanded = expandedItem === item.id;
                var isExplored = !!exploredItems[item.id];
                return h('div', { key: item.id, style: { borderRadius: 14, background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExplored ? ACCENT_MED : '#334155'), overflow: 'hidden', transition: 'all 0.2s' } },
                  h('button', {
                    onClick: function() {
                      if (soundEnabled) sfxClick();
                      upd({ expandedItem: isExpanded ? null : item.id });
                      if (!isExplored) {
                        var newExplored = Object.assign({}, exploredItems);
                        newExplored[item.id] = true;
                        upd({ exploredItems: newExplored });
                        logPractice('explore', item.id);
                        if (soundEnabled) sfxDiscover();
                        awardXP(5);
                        checkBadges();
                      }
                    },
                    style: { width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }
                  },
                    h('span', { style: { fontSize: 26 } }, item.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' } }, item.name),
                      !isExpanded && h('div', { style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, item.desc.slice(0, 60) + '...')
                    ),
                    isExplored && h('span', { style: { fontSize: 12, color: ACCENT } }, '\u2713'),
                    h('span', { style: { fontSize: 12, color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' } }, '\u25BC')
                  ),
                  isExpanded && h('div', { style: { padding: '0 16px 16px 16px' } },
                    h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 } }, item.desc),
                    h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', {
                        onClick: function() {
                          var newCount = learnCount + 1;
                          upd({ learnCount: newCount });
                          if (soundEnabled) sfxCorrect();
                          addToast('\uD83D\uDCA1 I didn\'t know that! (' + newCount + ' new things learned)', 'success');
                          awardXP(5);
                          logPractice('learn', item.id);
                          checkBadges();
                        },
                        style: { padding: '6px 14px', borderRadius: 8, border: '1px solid ' + ACCENT_MED, background: ACCENT_DIM, color: ACCENT, fontSize: 12, cursor: 'pointer', fontWeight: 600 }
                      }, '\uD83D\uDCA1 I didn\'t know that!'),
                      callTTS ? h('button', { onClick: function() { speak(item.name + '. ' + item.desc); }, style: { padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
                    )
                  )
                );
              })
            ),
            h('div', { style: { textAlign: 'center', marginTop: 16, fontSize: 12, color: '#64748b' } },
              Object.keys(exploredItems).length + ' of ' + items.length + ' topics explored'
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Identity ──
        // Identity wheel/map exercise
        // ══════════════════════════════════════════════════════════
        var identityContent = null;
        if (activeTab === 'identity') {
          var filledCount = 0;
          IDENTITY_CATEGORIES.forEach(function(cat) { if (identityMap[cat.id] && identityMap[cat.id].trim().length > 0) filledCount++; });

          identityContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83E\uDDE9 My Identity Map'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20 } },
              band === 'elementary' ? 'What makes you, YOU? Fill in each piece of your identity puzzle!' :
              band === 'middle' ? 'Your identity is made up of many intersecting parts. Explore how each one shapes your experience.' :
              'Map the intersections of your identity. How do these aspects interact and influence your lived experience?'
            ),
            // Identity grid
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 } },
              IDENTITY_CATEGORIES.map(function(cat) {
                var value = identityMap[cat.id] || '';
                var isFilled = value.trim().length > 0;
                return h('div', { key: cat.id, style: { padding: 14, borderRadius: 14, background: isFilled ? '#1e293b' : '#0f172a', border: '1px solid ' + (isFilled ? ACCENT_MED : '#334155'), transition: 'all 0.2s' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                    h('span', { style: { fontSize: 20 } }, cat.icon),
                    h('span', { style: { fontSize: 13, fontWeight: 600, color: isFilled ? ACCENT : '#f1f5f9' } }, cat.label),
                    isFilled && h('span', { style: { marginLeft: 'auto', fontSize: 11, color: ACCENT } }, '\u2713')
                  ),
                  h('p', { style: { fontSize: 10, color: '#64748b', marginBottom: 6, lineHeight: 1.4 } }, cat.prompt),
                  h('textarea', {
                    value: value,
                    onChange: function(e) {
                      var newMap = Object.assign({}, identityMap);
                      newMap[cat.id] = e.target.value;
                      upd({ identityMap: newMap });
                    },
                    onBlur: function() {
                      if (value.trim().length > 0) {
                        logPractice('identity', cat.id);
                        awardXP(5);
                        checkBadges();
                      }
                    },
                    placeholder: band === 'elementary' ? 'Write about this part of you...' : 'Reflect on how this shapes your experience...',
                    style: { width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }
                  })
                );
              })
            ),
            // Progress
            h('div', { style: { textAlign: 'center', marginBottom: 16, padding: '8px 16px', borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 4 } }, 'Identity Map Progress'),
              h('div', { style: { height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: (filledCount / 8 * 100) + '%', background: ACCENT, borderRadius: 3, transition: 'width 0.3s' } })
              ),
              h('div', { style: { fontSize: 11, color: '#64748b', marginTop: 4 } }, filledCount + ' of 8 areas explored')
            ),
            // Cultural Superpower
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED } },
              h('h4', { style: { fontSize: 14, color: ACCENT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', null, '\u26A1'),
                'My Cultural Superpower'
              ),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 } },
                band === 'elementary' ? 'What is something special about your culture or background that you\'re proud of? This is your superpower!' :
                band === 'middle' ? 'What unique strength does your cultural background give you? How does your identity make you uniquely powerful?' :
                'How do the intersections of your identity create unique perspectives, skills, or forms of resilience that are your strengths?'
              ),
              h('textarea', {
                value: superpower,
                onChange: function(e) { upd({ superpower: e.target.value }); },
                placeholder: band === 'elementary' ? 'My cultural superpower is...' : 'My unique cultural strength is...',
                style: { width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('button', {
                onClick: function() {
                  if (!superpower.trim()) { addToast('Write your cultural superpower first!', 'error'); return; }
                  upd({ superpowerSaved: true });
                  if (soundEnabled) sfxCorrect();
                  addToast('\u26A1 Cultural Superpower saved!', 'success');
                  awardXP(15);
                  logPractice('superpower', 'saved');
                  checkBadges();
                },
                disabled: superpowerSaved,
                style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: superpowerSaved ? '#334155' : ACCENT, color: superpowerSaved ? '#64748b' : '#fff', fontSize: 12, fontWeight: 600, cursor: superpowerSaved ? 'default' : 'pointer' }
              }, superpowerSaved ? '\u2713 Saved' : 'Save My Superpower')
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Scenarios ──
        // Grade-adaptive scenarios about navigating differences
        // ══════════════════════════════════════════════════════════
        var scenariosContent = null;
        if (activeTab === 'scenarios') {
          var scenarios = SCENARIOS[band] || SCENARIOS.elementary;
          var scenario = scenarios[scIdx % scenarios.length];

          scenariosContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFAD Cultural Scenarios'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20 } },
              'Scenario ' + ((scIdx % scenarios.length) + 1) + ' of ' + scenarios.length
            ),
            // Scenario card
            h('div', { style: { padding: 20, borderRadius: 16, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
              h('h4', { style: { fontSize: 16, fontWeight: 700, color: ACCENT, marginBottom: 10 } }, scenario.title),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 16 } }, scenario.setup),
              callTTS ? h('button', { onClick: function() { speak(scenario.setup); }, style: { marginBottom: 12, background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null,
              // Choices
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                scenario.branches.map(function(branch, bi) {
                  var isChosen = scChoice === bi;
                  var isRevealed = scChoice != null;
                  var starStr = '';
                  for (var si = 0; si < 3; si++) { starStr += si < branch.rating ? '\u2B50' : '\u2606'; }
                  return h('div', { key: bi },
                    h('button', {
                      onClick: function() {
                        if (scChoice != null) return;
                        upd({ scChoice: bi });
                        if (soundEnabled) {
                          if (branch.rating === 3) sfxCorrect();
                          else if (branch.rating === 1) sfxWrong();
                          else sfxReveal();
                        }
                        var newCompleted = scCompleted + 1;
                        var newTopRatings = scTopRatings + (branch.rating === 3 ? 1 : 0);
                        upd({ scCompleted: newCompleted, scTopRatings: newTopRatings });
                        awardXP(branch.rating === 3 ? 15 : branch.rating === 2 ? 8 : 3);
                        logPractice('scenario', scenario.id);
                        checkBadges();
                      },
                      style: {
                        width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid ' + (isChosen ? (branch.rating === 3 ? '#22c55e' : branch.rating === 2 ? '#f59e0b' : '#ef4444') : '#334155'),
                        background: isChosen ? (branch.rating === 3 ? '#22c55e11' : branch.rating === 2 ? '#f59e0b11' : '#ef444411') : '#0f172a',
                        color: '#e2e8f0', fontSize: 12, textAlign: 'left', cursor: scChoice != null ? 'default' : 'pointer', lineHeight: 1.5, transition: 'all 0.2s',
                        opacity: isRevealed && !isChosen ? 0.5 : 1
                      }
                    }, branch.label),
                    isChosen && h('div', { style: { padding: '10px 14px', marginTop: 4, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' } },
                      h('div', { style: { fontSize: 12, marginBottom: 4 } }, starStr),
                      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, branch.feedback)
                    )
                  );
                })
              )
            ),
            // Navigation
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('button', {
                onClick: function() {
                  var newIdx = scIdx > 0 ? scIdx - 1 : scenarios.length - 1;
                  upd({ scIdx: newIdx, scChoice: null });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
              }, '\u2190 Previous'),
              h('span', { style: { fontSize: 12, color: '#64748b' } }, scCompleted + ' completed'),
              h('button', {
                onClick: function() {
                  var newIdx = (scIdx + 1) % scenarios.length;
                  upd({ scIdx: newIdx, scChoice: null });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
              }, 'Next \u2192')
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Badges / Profile ──
        // Progress stats, AI coach, and badge display
        // ══════════════════════════════════════════════════════════
        var badgesContent = null;
        if (activeTab === 'badges') {
          var exploredCount = Object.keys(exploredItems).length;
          var idFilled = 0;
          IDENTITY_CATEGORIES.forEach(function(cat) { if (identityMap[cat.id] && identityMap[cat.id].trim().length > 0) idFilled++; });
          var totalActs = exploredCount + scCompleted + idFilled + learnCount;

          var stats = [
            { label: 'Topics Explored', value: exploredCount, icon: '\uD83C\uDF0D', color: '#06b6d4' },
            { label: 'Scenarios Done', value: scCompleted, icon: '\uD83C\uDFAD', color: '#8b5cf6' },
            { label: 'Identity Areas', value: idFilled + '/8', icon: '\uD83E\uDDE9', color: '#f59e0b' },
            { label: 'New Things Learned', value: learnCount, icon: '\uD83D\uDCA1', color: '#22c55e' },
            { label: 'Top Ratings', value: scTopRatings, icon: '\u2B50', color: '#ec4899' }
          ];

          badgesContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            // Stats
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Progress'),
            h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 40, fontWeight: 700, color: ACCENT } }, totalActs),
              h('div', { style: { fontSize: 13, color: '#94a3b8' } }, 'Total Activities Completed')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 } },
              stats.map(function(s) {
                return h('div', { key: s.label, style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + s.color + '44', textAlign: 'center' } },
                  h('div', { style: { fontSize: 24 } }, s.icon),
                  h('div', { style: { fontSize: 22, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.label)
                );
              })
            ),
            // AI Cultural Coach
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 20 } },
              h('h4', { style: { fontSize: 14, color: ACCENT, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', null, '\u2728'),
                'AI Cultural Coach'
              ),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } },
                band === 'elementary' ? 'Ask me anything about cultures, traditions, or how to be a good friend to everyone!' :
                band === 'middle' ? 'Ask about cultural identity, allyship, navigating differences, or any topic you\'re curious about.' :
                'Explore questions about intersectionality, systemic issues, cultural humility, advocacy strategies, or any cultural topic.'
              ),
              aiResponse && h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 10, fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
                aiResponse,
                callTTS ? h('button', { onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: ACCENT, fontSize: 10, cursor: 'pointer', display: 'block' } }, '\uD83D\uDD0A Read aloud') : null
              ),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', {
                  type: 'text', value: aiPrompt,
                  onChange: function(e) { upd({ aiPrompt: e.target.value }); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter' && aiPrompt.trim()) {
                      e.preventDefault();
                      if (!callGemini) { addToast('AI coach not available.', 'error'); return; }
                      upd({ aiLoading: true, aiResponse: null });
                      var sysPrompt = 'You are a warm, encouraging cultural awareness coach for a ' + band + ' school student. ' +
                        'The student asked: "' + aiPrompt + '"\n\n' +
                        'Respond in 2-3 short paragraphs. Be age-appropriate for ' + band + ' school. ' +
                        'Use encouraging language. If the question involves cultural sensitivity, model cultural humility. ' +
                        'End with a reflective question to keep them thinking.';
                      callGemini(sysPrompt).then(function(result) {
                        var text = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                        upd({ aiResponse: text, aiLoading: false, aiPrompt: '' });
                        tryAwardBadge('ai_learner');
                        awardXP(10);
                        logPractice('ai_coach', 'custom');
                        checkBadges();
                      }).catch(function(err) { upd({ aiLoading: false }); addToast('Error: ' + err.message, 'error'); });
                    }
                  },
                  placeholder: 'Ask a question about culture...',
                  style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 12, outline: 'none' }
                }),
                h('button', {
                  onClick: function() {
                    if (!aiPrompt.trim()) return;
                    if (!callGemini) { addToast('AI coach not available.', 'error'); return; }
                    upd({ aiLoading: true, aiResponse: null });
                    var sysPrompt = 'You are a warm, encouraging cultural awareness coach for a ' + band + ' school student. ' +
                      'The student asked: "' + aiPrompt + '"\n\n' +
                      'Respond in 2-3 short paragraphs. Be age-appropriate for ' + band + ' school. ' +
                      'Use encouraging language. If the question involves cultural sensitivity, model cultural humility. ' +
                      'End with a reflective question to keep them thinking.';
                    callGemini(sysPrompt).then(function(result) {
                      var text = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                      upd({ aiResponse: text, aiLoading: false, aiPrompt: '' });
                      tryAwardBadge('ai_learner');
                      awardXP(10);
                      logPractice('ai_coach', 'custom');
                      checkBadges();
                    }).catch(function(err) { upd({ aiLoading: false }); addToast('Error: ' + err.message, 'error'); });
                  },
                  disabled: aiLoading,
                  style: { padding: '10px 16px', borderRadius: 8, background: ACCENT, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: aiLoading ? 'wait' : 'pointer' }
                }, aiLoading ? '\u23F3' : '\u2191')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 } },
                (band === 'elementary' ? ['What is Diwali?', 'Why do people speak different languages?', 'How can I be a good friend to everyone?', 'Why is my name important?'] :
                 band === 'middle' ? ['What is a microaggression?', 'How do I be a better ally?', 'What is code-switching?', 'How do stereotypes form?'] :
                 ['What is intersectionality?', 'How does systemic bias work?', 'What is cultural humility?', 'How can I take action for equity?']).map(function(q) {
                  return h('button', {
                    key: q, onClick: function() { upd({ aiPrompt: q }); },
                    style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }
                  }, q);
                })
              )
            ),
            // Badge grid
            h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 12 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', { key: b.id, style: { padding: 12, borderRadius: 10, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.45 } },
                  h('div', { style: { fontSize: 26 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#f1f5f9' : '#64748b', marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 9, color: '#94a3b8', marginTop: 2 } }, b.desc)
                );
              })
            ),
            // Practice log
            practiceLog.length > 0 && h('div', null,
              h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Activity'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                practiceLog.slice(-8).reverse().map(function(entry, i) {
                  var icons = { explore: '\uD83C\uDF0D', learn: '\uD83D\uDCA1', identity: '\uD83E\uDDE9', scenario: '\uD83C\uDFAD', superpower: '\u26A1', ai_coach: '\u2728' };
                  var labels = { explore: 'Explored Topic', learn: 'Learned Something New', identity: 'Identity Reflection', scenario: 'Cultural Scenario', superpower: 'Superpower Reflection', ai_coach: 'AI Coach' };
                  return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 } },
                    h('span', null, icons[entry.type] || '\uD83D\uDCDD'),
                    h('span', { style: { color: '#e2e8f0', fontWeight: 500 } }, labels[entry.type] || entry.type),
                    h('span', { style: { marginLeft: 'auto', color: '#64748b', fontSize: 11 } }, new Date(entry.timestamp).toLocaleString())
                  );
                })
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── Final Render ──
        // ══════════════════════════════════════════════════════════
        var content = exploreContent || identityContent || scenariosContent || badgesContent;

        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
          tabBar,
          badgePopup,
          h('div', { style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });
})();

console.log('[SelHub] sel_tool_community.js loaded');
