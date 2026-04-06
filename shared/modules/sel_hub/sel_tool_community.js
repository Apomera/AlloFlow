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
      { id: 'ce10', emoji: '\uD83C\uDF0D', name: 'Kwanzaa', desc: 'A week-long celebration of African heritage and community. Each of the seven days honors a different principle like unity, creativity, and faith.' },
      { id: 'ce11', emoji: '\uD83C\uDF84', name: 'Holi \u2014 Festival of Colors', desc: 'A joyful Hindu spring festival where people throw bright colored powders and water at each other. It celebrates the triumph of good over evil and the arrival of spring.' },
      { id: 'ce12', emoji: '\uD83D\uDEA3', name: 'Dragon Boat Festival', desc: 'A Chinese festival where teams paddle long, decorated boats to the beat of drums. People also eat sticky rice dumplings called zongzi and remember the poet Qu Yuan.' },
      { id: 'ce13', emoji: '\uD83C\uDF8A', name: 'Carnival & Mardi Gras', desc: 'Colorful parades with music, dancing, and costumes celebrated in many countries around the world. From Brazil to New Orleans, people come together for this joyful festival.' },
      { id: 'ce14', emoji: '\uD83E\uDD85', name: 'Pow Wow', desc: 'A gathering of Native American communities with traditional drumming, dancing, singing, and storytelling. Pow Wows are a way to honor traditions and build community.' },
      { id: 'ce15', emoji: '\uD83C\uDFAD', name: 'Storytelling Traditions', desc: 'From African griots to Native American oral histories to Indian folktales, cultures around the world pass down wisdom through stories told generation after generation.' },
      { id: 'ce16', emoji: '\uD83D\uDC98', name: 'Coming-of-Age Celebrations', desc: 'Many cultures mark the transition to adulthood: Quincea\u00F1eras in Latin American cultures, Bar and Bat Mitzvahs in Judaism, and Seijin-no-Hi in Japan.' },
      { id: 'ce17', emoji: '\uD83C\uDFA8', name: 'Art From Every Culture', desc: 'From Aboriginal dot paintings to Japanese origami to Mexican papel picado to African kente cloth, art is a way people express their culture and tell their stories.' }
    ],
    middle: [
      { id: 'cm1', emoji: '\uD83E\uDDE9', name: 'Cultural Identity', desc: 'Your cultural identity is made up of many pieces: where your family is from, the languages you speak, your traditions, values, and beliefs. No two people have the exact same cultural identity.' },
      { id: 'cm2', emoji: '\uD83D\uDEAB', name: 'Stereotypes vs. Facts', desc: 'Stereotypes are oversimplified beliefs about a group. They ignore individual differences and can be harmful even when they seem "positive." Challenge yourself to see people as individuals, not categories.' },
      { id: 'cm3', emoji: '\uD83D\uDCA1', name: 'Privilege Awareness', desc: 'Privilege means having advantages you didn\'t earn based on parts of your identity. Recognizing privilege isn\'t about guilt \u2014 it\'s about understanding how the world works differently for different people.' },
      { id: 'cm4', emoji: '\uD83E\uDD1D', name: 'Allyship', desc: 'An ally uses their voice and actions to support people who face discrimination. Allyship means listening, learning, speaking up, and showing up \u2014 even when it\'s uncomfortable.' },
      { id: 'cm5', emoji: '\uD83C\uDF0E', name: 'Cultural Appreciation vs. Appropriation', desc: 'Appreciation means learning about a culture with respect and permission. Appropriation means taking elements of a culture without understanding or honoring their meaning.' },
      { id: 'cm6', emoji: '\uD83D\uDCAC', name: 'Code-Switching', desc: 'Many people change how they talk, dress, or act depending on the environment. Code-switching can be a survival skill, but it shouldn\'t mean hiding who you are.' },
      { id: 'cm7', emoji: '\uD83D\uDCDA', name: 'Hidden Histories', desc: 'Many cultures and communities have histories that aren\'t taught in mainstream education. Seeking out diverse perspectives helps us understand the full picture.' },
      { id: 'cm8', emoji: '\u2764\uFE0F', name: 'Microaggressions', desc: 'Small comments or actions that communicate negative messages about someone\'s identity. They may seem minor individually, but they add up and cause real harm.' },
      { id: 'cm9', emoji: '\uD83C\uDFAD', name: 'Code-Switching in Depth', desc: 'Code-switching goes beyond language. Many students of color, LGBTQ+ youth, and immigrants shift their behavior, speech, and appearance to fit into dominant culture spaces. It takes energy and can feel exhausting.' },
      { id: 'cm10', emoji: '\u26A0\uFE0F', name: 'Model Minority Myth', desc: 'The idea that certain racial groups are universally successful is a harmful myth. It erases individual struggles, pits communities against each other, and ignores systemic barriers many still face.' },
      { id: 'cm11', emoji: '\uD83E\uDDE0', name: 'Implicit Bias Basics', desc: 'Implicit biases are attitudes or stereotypes that affect our understanding and actions without us even knowing. Everyone has them, but we can learn to recognize and challenge them.' },
      { id: 'cm12', emoji: '\uD83C\uDFAD', name: 'Appropriation vs. Appreciation', desc: 'Wearing a sacred headdress as a costume is appropriation. Learning a traditional dance with guidance from that culture is appreciation. The difference lies in permission, context, and respect.' },
      { id: 'cm13', emoji: '\uD83D\uDCF1', name: 'Digital Culture & Identity', desc: 'Social media shapes how we see culture. Algorithms can create echo chambers, viral trends can spread stereotypes, and online spaces can both connect and divide cultural communities.' },
      { id: 'cm14', emoji: '\uD83C\uDFE0', name: 'Multicultural Families', desc: 'Many families blend multiple cultural backgrounds. Navigating different traditions, languages, and expectations within one family can be complex, beautiful, and sometimes challenging.' },
      { id: 'cm15', emoji: '\uD83D\uDCDA', name: 'Representation Matters', desc: 'Seeing people who look like you in books, movies, and leadership positions matters. Representation shapes self-image and tells young people that all identities belong and are valued.' }
    ],
    high: [
      { id: 'ch1', emoji: '\uD83D\uDD17', name: 'Intersectionality', desc: 'A person\'s identity includes race, gender, class, ability, sexuality, religion, and more. These identities intersect and create unique experiences of both privilege and oppression that can\'t be understood in isolation.' },
      { id: 'ch2', emoji: '\u2696\uFE0F', name: 'Systemic Bias', desc: 'Bias isn\'t just personal prejudice \u2014 it\'s built into systems, laws, and institutions. Understanding systemic bias means looking at patterns and outcomes, not just individual intent.' },
      { id: 'ch3', emoji: '\uD83C\uDF31', name: 'Cultural Humility', desc: 'Unlike cultural "competence" (which implies mastery), cultural humility is an ongoing process of self-reflection, learning, and recognizing that you\'ll never fully understand another\'s experience.' },
      { id: 'ch4', emoji: '\uD83D\uDCE2', name: 'Advocacy & Action', desc: 'Moving from awareness to action means using your voice, vote, and choices to create change. Advocacy can be quiet (one-on-one conversations) or loud (organizing and activism).' },
      { id: 'ch5', emoji: '\uD83E\uDDE0', name: 'Implicit Bias', desc: 'Everyone has unconscious biases shaped by media, upbringing, and society. Recognizing them doesn\'t make you bad \u2014 refusing to examine them does.' },
      { id: 'ch6', emoji: '\uD83C\uDFD7\uFE0F', name: 'Structural Inequality', desc: 'Disparities in wealth, education, healthcare, and justice aren\'t accidents. They\'re the result of historical and ongoing policies. Understanding this is the first step to dismantling it.' },
      { id: 'ch7', emoji: '\uD83D\uDD04', name: 'Decolonizing Knowledge', desc: 'Much of what we\'re taught centers Western perspectives. Decolonizing means seeking out and valuing knowledge systems from Indigenous, African, Asian, and other non-Western traditions.' },
      { id: 'ch8', emoji: '\uD83D\uDC65', name: 'Coalition Building', desc: 'Real change happens when diverse communities work together across differences. Coalition building requires trust, shared goals, and willingness to center the most affected voices.' },
      { id: 'ch9', emoji: '\uD83C\uDF0D', name: 'Decolonization', desc: 'Decolonization is the process of dismantling colonial structures, ideologies, and power dynamics. It means returning land, language, and agency to Indigenous peoples and rethinking systems built on colonial foundations.' },
      { id: 'ch10', emoji: '\u2708\uFE0F', name: 'Diaspora Communities', desc: 'Diaspora refers to communities of people who have been dispersed from their homeland. Whether through forced migration or choice, diaspora communities navigate dual identities while preserving cultural heritage across borders.' },
      { id: 'ch11', emoji: '\uD83D\uDD04', name: 'Restorative Justice', desc: 'Restorative justice focuses on repairing harm through dialogue rather than punishment. Rooted in Indigenous traditions, it centers the needs of those harmed and holds accountable parties responsible for making things right.' },
      { id: 'ch12', emoji: '\uD83C\uDF3F', name: 'Indigenous Sovereignty', desc: 'Indigenous sovereignty affirms the right of Indigenous peoples to self-governance, cultural preservation, and land stewardship. It challenges colonial narratives and recognizes nations that existed long before settler states.' },
      { id: 'ch13', emoji: '\uD83D\uDCCA', name: 'Data & Racial Justice', desc: 'Data can expose inequity or reinforce it. Algorithms trained on biased data perpetuate discrimination in hiring, policing, and lending. Critical data literacy is essential for racial justice in the digital age.' },
      { id: 'ch14', emoji: '\uD83C\uDFD7\uFE0F', name: 'Environmental Racism', desc: 'Marginalized communities disproportionately bear the burden of pollution, toxic waste, and climate change. Environmental justice recognizes that ecological issues are inseparable from racial and economic justice.' },
      { id: 'ch15', emoji: '\uD83D\uDCDC', name: 'Reparative Justice', desc: 'Reparative justice goes beyond equality to address historical harms. It asks what is owed to communities whose wealth, labor, and culture were stolen, and explores concrete steps toward repair.' }
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
        ] },
      { id: 'sc6', title: 'The New Kid\'s Language', setup: 'A new student just moved from another country and is still learning English. During group work, other kids skip over them and say "They can\'t even talk right."',
        branches: [
          { label: 'Agree. Working with someone who doesn\'t speak English well would slow the group down.', rating: 1, feedback: 'Speaking a new language is incredibly brave. Excluding someone for learning a language tells them they don\'t belong.' },
          { label: 'Feel bad for the student but don\'t do anything.', rating: 2, feedback: 'Empathy is a start, but action is what makes someone feel included. The new student needs an ally right now.' },
          { label: 'Invite the student into your group and say: "We\'d love to work with you! We can figure it out together."', rating: 3, feedback: 'You showed the new student they belong. Learning a new language is hard enough without being excluded. Your kindness made school feel safer.' }
        ] },
      { id: 'sc7', title: 'The Religious Holiday', setup: 'Your friend can\'t come to your birthday party because it falls on a religious holiday their family observes. Other kids say "That\'s so weird. Just skip it."',
        branches: [
          { label: 'Be upset at your friend for not coming. Your party is more important.', rating: 1, feedback: 'Everyone\'s beliefs deserve respect. Expecting your friend to skip something sacred shows you don\'t value what matters to them.' },
          { label: 'Say "That\'s okay" but feel annoyed inside.', rating: 2, feedback: 'Saying okay is polite, but try to genuinely understand why this matters to them. Religious practices are a deep part of identity.' },
          { label: 'Say: "I understand! Let\'s celebrate together another day. Can you tell me about your holiday? It sounds important."', rating: 3, feedback: 'You showed real respect by honoring their observance AND staying connected. Asking about their holiday shows genuine curiosity and care.' }
        ] },
      { id: 'sc8', title: 'The Hair Comment', setup: 'A classmate reaches out to touch another student\'s hair without asking and says "Your hair is so cool and different! Can I feel it?"',
        branches: [
          { label: 'Don\'t see a problem. It was a compliment.', rating: 1, feedback: 'Touching someone\'s hair without consent, especially hair tied to cultural identity, is invasive. Bodies are not exhibits to be touched.' },
          { label: 'Think it was a little weird but say nothing.', rating: 2, feedback: 'Noticing discomfort is good. Speaking up could help both students understand why consent and respect for bodies matter.' },
          { label: 'Gently say: "We should always ask before touching someone. Everyone\'s hair is their own." Then check in with the student.', rating: 3, feedback: 'You set a boundary kindly and helped everyone learn about consent and respect. Many people with textured or natural hair face unwanted touching regularly.' }
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
        ] },
      { id: 'sm6', title: 'The "Where Are You Really From?" Question', setup: 'A classmate keeps asking your friend "But where are you REALLY from?" after they already said they\'re from this city. Your friend looks uncomfortable.',
        branches: [
          { label: 'It\'s just curiosity. No big deal.', rating: 1, feedback: 'This question implies someone doesn\'t truly belong here based on their appearance. It\'s a common microaggression that makes people feel like perpetual outsiders.' },
          { label: 'Notice it\'s awkward but stay quiet.', rating: 2, feedback: 'You sensed something was off. Next time, trust that instinct and step in. Your friend could use support in the moment.' },
          { label: 'Jump in: "They told you \u2014 they\'re from here. If you want to know about their family heritage, maybe ask a different way, like \'What\'s your family\'s background?\'"', rating: 3, feedback: 'You redirected the question to be respectful while still allowing genuine cultural curiosity. Framing matters enormously.' }
        ] },
      { id: 'sm7', title: 'The Segregated Cafeteria', setup: 'You notice that in the cafeteria, students mostly sit with people of the same race or background. A friend says "People just prefer their own kind."',
        branches: [
          { label: 'Agree. It\'s natural for people to group with similar people.', rating: 1, feedback: 'While comfort with the familiar is natural, accepting full segregation as "just how it is" ignores the forces that create division and the value of cross-cultural connection.' },
          { label: 'Feel conflicted but don\'t respond.', rating: 2, feedback: 'Sitting at the same table doesn\'t fix systemic issues, but small acts of reaching across differences build understanding over time.' },
          { label: 'Say: "Maybe, but I think we\'re also missing out on getting to know people different from us. Want to sit somewhere new today?"', rating: 3, feedback: 'You challenged the assumption gently and invited action. Breaking informal segregation starts with individual choices to bridge divides.' }
        ] },
      { id: 'sm8', title: 'The Sports Team Joke', setup: 'A team with a mascot that\'s a racial caricature is playing on TV. Someone on your team says "It\'s just tradition, people need to relax."',
        branches: [
          { label: 'Agree. Sports mascots are just for fun.', rating: 1, feedback: 'Racial caricatures as mascots reduce entire peoples to stereotypes. Many Indigenous communities have spoken out about how harmful and dehumanizing this is.' },
          { label: 'Feel uncomfortable but change the subject.', rating: 2, feedback: 'Discomfort is a signal worth exploring. Changing the subject avoids conflict but also avoids growth.' },
          { label: 'Say: "Some traditions hurt people. A lot of Native communities have asked teams to change these. I think we should listen to them."', rating: 3, feedback: 'You centered the voices of the affected community. Real respect means listening to people who say they\'re being harmed, even when it challenges what feels familiar.' }
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
        ] },
      { id: 'sh6', title: 'The "Colorblind" Teacher', setup: 'A teacher says "I don\'t see color. I treat all my students the same." A student of color in your class visibly deflates.',
        branches: [
          { label: 'Agree. Treating everyone the same is fair.', rating: 1, feedback: 'Colorblindness sounds equal but actually erases the real experiences of people of color. Equity means seeing and responding to differences, not ignoring them.' },
          { label: 'Notice your classmate\'s reaction but stay silent.', rating: 2, feedback: 'You observed the impact, which matters. But your classmate is alone in feeling unseen. Your voice could validate their experience.' },
          { label: 'Say respectfully: "I think seeing our differences is actually important. Treating everyone the same isn\'t the same as treating everyone fairly."', rating: 3, feedback: 'You challenged a well-intentioned but harmful ideology. Acknowledging race and difference is essential to creating genuine equity and belonging.' }
        ] },
      { id: 'sh7', title: 'The Gentrification Debate', setup: 'Your neighborhood is rapidly changing. New expensive shops are replacing family-owned businesses. In class, someone says gentrification is "just progress."',
        branches: [
          { label: 'Agree. New businesses mean the area is improving.', rating: 1, feedback: '"Improvement" for some means displacement for others. When longtime residents can no longer afford their neighborhood, communities and cultural fabric are destroyed.' },
          { label: 'Feel conflicted because you see both sides.', rating: 2, feedback: 'Nuance is important, but centering the voices of those being displaced is essential. Development without community input is colonization, not progress.' },
          { label: 'Share: "Progress should include the people already here. When development happens without community voice, it erases the culture that made this neighborhood what it is."', rating: 3, feedback: 'You centered the affected community and challenged the narrative that displacement equals progress. Real development uplifts everyone, not just newcomers.' }
        ] },
      { id: 'sh8', title: 'The Activist Burnout', setup: 'A friend who has been actively organizing for social justice is exhausted, cynical, and says "Nothing ever changes. I\'m done fighting."',
        branches: [
          { label: 'Agree with them. The system can\'t be changed.', rating: 1, feedback: 'Burnout is real, but nihilism is not the answer. History shows that persistent collective action does create change, even when it\'s slow.' },
          { label: 'Tell them to take a break and not think about it.', rating: 2, feedback: 'Rest is important, but dismissing their exhaustion or the cause itself isn\'t supportive. Acknowledge both the toll and the importance.' },
          { label: 'Say: "Your exhaustion is valid and your work matters. Rest is part of resistance. Let me carry some of the weight while you recharge."', rating: 3, feedback: 'You validated their feelings, affirmed their impact, and offered tangible support. Sustainable activism requires community care and shared burden.' }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Culture Quiz Data (grade-adaptive matching game) ──
  // ══════════════════════════════════════════════════════════════
  var CULTURE_QUIZ = {
    elementary: [
      { q: 'Diwali is celebrated in which tradition?', a: 'Hindu / Indian', options: ['Hindu / Indian', 'Chinese', 'Native American', 'Greek'] },
      { q: 'Day of the Dead (D\u00EDa de los Muertos) honors...', a: 'Deceased loved ones', options: ['Deceased loved ones', 'Military heroes', 'Ancient kings', 'Harvest season'] },
      { q: 'Kwanzaa celebrates which heritage?', a: 'African heritage', options: ['European heritage', 'African heritage', 'Asian heritage', 'Australian heritage'] },
      { q: 'During Hanukkah, families light candles on a...', a: 'Menorah', options: ['Cake', 'Menorah', 'Campfire', 'Lantern'] },
      { q: 'Lunar New Year is celebrated in many...', a: 'Asian cultures', options: ['South American cultures', 'European cultures', 'Asian cultures', 'African cultures'] },
      { q: 'During Ramadan, many Muslims...', a: 'Fast from sunrise to sunset', options: ['Fast from sunrise to sunset', 'Stay awake all night', 'Exchange gifts daily', 'Play games all month'] },
      { q: 'Holi is known as the festival of...', a: 'Colors', options: ['Colors', 'Fire', 'Water', 'Stars'] },
      { q: 'A Pow Wow is a gathering of...', a: 'Native American communities', options: ['European royalty', 'Native American communities', 'African musicians', 'Japanese artists'] },
      { q: 'Dragon Boat Festival is celebrated in...', a: 'China', options: ['India', 'Brazil', 'China', 'Egypt'] },
      { q: 'Carnival features colorful parades in countries like...', a: 'Brazil and Trinidad', options: ['Japan and Korea', 'Brazil and Trinidad', 'Norway and Finland', 'Australia and New Zealand'] }
    ],
    middle: [
      { q: 'Code-switching means...', a: 'Changing behavior to fit different environments', options: ['Changing behavior to fit different environments', 'Switching between phone apps', 'Learning to code computers', 'Copying someone else\'s homework'] },
      { q: 'Cultural appropriation is different from appreciation because it...', a: 'Takes without understanding or permission', options: ['Takes without understanding or permission', 'Always involves clothing', 'Only applies to food', 'Is the same thing'] },
      { q: 'The "model minority" myth is harmful because it...', a: 'Erases individual struggles and pits groups against each other', options: ['Celebrates all minorities equally', 'Erases individual struggles and pits groups against each other', 'Only affects one racial group', 'Is actually true for most people'] },
      { q: 'Implicit bias refers to...', a: 'Unconscious attitudes that affect our actions', options: ['Lies people tell on purpose', 'Unconscious attitudes that affect our actions', 'Laws that discriminate openly', 'Opinions shared on social media'] },
      { q: 'A microaggression is best described as...', a: 'Small comments that communicate negative messages about identity', options: ['A very tiny act of violence', 'A small compliment', 'Small comments that communicate negative messages about identity', 'Quietly disagreeing with someone'] },
      { q: 'An ally is someone who...', a: 'Uses their voice to support people facing discrimination', options: ['Only helps people who look like them', 'Uses their voice to support people facing discrimination', 'Avoids all conflict', 'Agrees with everyone always'] },
      { q: 'Representation in media matters because...', a: 'It shapes self-image and tells people they belong', options: ['It makes TV shows longer', 'It shapes self-image and tells people they belong', 'It only matters to adults', 'It has no real effect'] },
      { q: 'Stereotypes are harmful even when "positive" because they...', a: 'Ignore individual differences', options: ['Ignore individual differences', 'Are always accurate', 'Only affect celebrities', 'Help people fit in'] },
      { q: 'Multicultural families often navigate...', a: 'Multiple traditions, languages, and expectations', options: ['Only one culture', 'Multiple traditions, languages, and expectations', 'No traditions at all', 'Only food differences'] },
      { q: 'Digital culture can reinforce stereotypes through...', a: 'Biased algorithms and viral trends', options: ['Better WiFi signals', 'Biased algorithms and viral trends', 'Longer battery life', 'Fewer ads'] }
    ],
    high: [
      { q: 'Intersectionality, coined by Kimberl\u00E9 Crenshaw, describes how...', a: 'Multiple identities create unique experiences of privilege and oppression', options: ['People should only identify one way', 'Multiple identities create unique experiences of privilege and oppression', 'Race is the only identity that matters', 'Everyone has the same experience'] },
      { q: 'Systemic bias differs from personal prejudice because it is...', a: 'Built into institutions, laws, and systems', options: ['Only in people\'s heads', 'Built into institutions, laws, and systems', 'Easy to fix with one conversation', 'Not real'] },
      { q: 'Cultural humility differs from cultural competence in that it...', a: 'Is an ongoing process, not a destination', options: ['Can be achieved with a single course', 'Is an ongoing process, not a destination', 'Only applies to doctors', 'Means knowing everything about a culture'] },
      { q: 'Decolonization primarily involves...', a: 'Dismantling colonial structures and centering Indigenous knowledge', options: ['Building more colonies', 'Dismantling colonial structures and centering Indigenous knowledge', 'Ignoring history completely', 'Only changing textbooks'] },
      { q: 'Diaspora communities are formed when people...', a: 'Are dispersed from their homeland', options: ['Move to the suburbs', 'Are dispersed from their homeland', 'Choose to live alone', 'Join a sports team'] },
      { q: 'Restorative justice focuses on...', a: 'Repairing harm through dialogue', options: ['Harsher punishments', 'Repairing harm through dialogue', 'Ignoring wrongdoing', 'Only forgiving'] },
      { q: 'Indigenous sovereignty affirms the right to...', a: 'Self-governance and cultural preservation', options: ['Colonial rule', 'Self-governance and cultural preservation', 'Isolation from society', 'Military power'] },
      { q: 'Environmental racism means that...', a: 'Marginalized communities bear disproportionate environmental burdens', options: ['Nature is inherently racist', 'Marginalized communities bear disproportionate environmental burdens', 'Only certain countries pollute', 'All communities are affected equally'] },
      { q: 'Performative allyship is problematic because it...', a: 'Prioritizes appearance over genuine action', options: ['Raises too much money for causes', 'Prioritizes appearance over genuine action', 'Always leads to real change', 'Is a new type of activism'] },
      { q: 'Coalition building requires...', a: 'Trust, shared goals, and centering the most affected voices', options: ['Everyone agreeing on everything', 'Trust, shared goals, and centering the most affected voices', 'Only one strong leader', 'Avoiding difficult conversations'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Allyship Action Cards (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var ALLYSHIP_ACTIONS = {
    elementary: [
      { id: 'aa_e1', icon: '\uD83D\uDDE3\uFE0F', action: 'Learn to say someone\'s name correctly', detail: 'Ask a classmate how to pronounce their name. Practice it until you get it right. Their name is important!' },
      { id: 'aa_e2', icon: '\uD83C\uDF5C', action: 'Try food from a different culture', detail: 'Ask your family to try a restaurant or recipe from a culture different from yours. Talk about what you liked!' },
      { id: 'aa_e3', icon: '\uD83D\uDCDA', action: 'Read a book by an author who looks different from you', detail: 'Visit the library and find a book by an author from a different background. What did you learn from their story?' },
      { id: 'aa_e4', icon: '\uD83D\uDC4B', action: 'Learn to say "hello" in 3 new languages', detail: 'Ask classmates or look up how to greet someone in languages spoken in your community. Surprise someone by greeting them in their language!' },
      { id: 'aa_e5', icon: '\uD83C\uDFA8', action: 'Make art inspired by a culture you want to learn about', detail: 'Research an art form from another culture (origami, rangoli, papel picado) and try making your own version while learning about its meaning.' },
      { id: 'aa_e6', icon: '\uD83E\uDD1D', action: 'Sit with someone new at lunch', detail: 'Choose a day to sit with someone you don\'t usually eat with. Ask about their favorite things and find something you have in common.' }
    ],
    middle: [
      { id: 'aa_m1', icon: '\uD83D\uDCAC', action: 'Speak up when you hear a stereotype', detail: 'Next time someone uses a stereotype, try saying: "That\'s actually a stereotype. People in that group are all different, just like us."' },
      { id: 'aa_m2', icon: '\u2753', action: 'Ask genuine questions about someone\'s culture', detail: 'Instead of assuming, ask respectful questions like: "I\'d love to learn about your traditions. Would you be willing to share?"' },
      { id: 'aa_m3', icon: '\uD83D\uDD0A', action: 'Amplify marginalized voices', detail: 'When someone from a marginalized group shares an idea that gets ignored, say: "I think [name] made a great point. Can we go back to what they said?"' },
      { id: 'aa_m4', icon: '\uD83D\uDCF1', action: 'Follow diverse creators on social media', detail: 'Diversify your feed by following creators, writers, and thinkers from backgrounds different from your own. Notice how it changes your perspective.' },
      { id: 'aa_m5', icon: '\uD83D\uDCDD', action: 'Write a letter supporting inclusive school policies', detail: 'Think about a policy at school that could be more inclusive. Write a respectful letter to an administrator explaining why it matters.' },
      { id: 'aa_m6', icon: '\uD83C\uDF0E', action: 'Attend a cultural event outside your own background', detail: 'Visit a cultural festival, museum exhibit, or community event from a culture different from yours. Go to learn, not to judge.' }
    ],
    high: [
      { id: 'aa_h1', icon: '\uD83E\uDDE0', action: 'Examine your own biases through the IAT', detail: 'Take the Implicit Association Test (IAT) at implicit.harvard.edu. Reflect honestly on the results. Awareness is the first step toward change.' },
      { id: 'aa_h2', icon: '\uD83C\uDFDB\uFE0F', action: 'Support student-led cultural organizations', detail: 'Show up to events hosted by cultural clubs, even (especially) ones outside your own identity. Your presence shows solidarity.' },
      { id: 'aa_h3', icon: '\uD83D\uDCDA', action: 'Advocate for inclusive curriculum', detail: 'Research authors, historical figures, and perspectives missing from your courses. Present a proposal to a teacher or department with specific recommendations.' },
      { id: 'aa_h4', icon: '\uD83D\uDCE2', action: 'Organize a community dialogue on race and identity', detail: 'Partner with a teacher or counselor to create a safe space for honest conversations about race, identity, and belonging at your school.' },
      { id: 'aa_h5', icon: '\uD83D\uDCB0', action: 'Support minority-owned businesses in your community', detail: 'Research and patronize businesses owned by people from marginalized communities. Economic support is a concrete form of allyship.' },
      { id: 'aa_h6', icon: '\u270D\uFE0F', action: 'Write about your own positionality', detail: 'Reflect in writing on how your race, class, gender, and other identities shape your worldview. Positionality work is ongoing and humbling.' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Battle Questions (quick true/false & multiple choice) ──
  // ══════════════════════════════════════════════════════════════
  var BATTLE_QUESTIONS = {
    elementary: [
      { q: 'True or False: There are over 7,000 languages spoken in the world.', a: 'True', options: ['True', 'False'] },
      { q: 'True or False: Everyone in the same country celebrates the same holidays.', a: 'False', options: ['True', 'False'] },
      { q: 'What does the word "culture" include?', a: 'All of the above', options: ['Food and music', 'Language and traditions', 'Beliefs and values', 'All of the above'] },
      { q: 'True or False: Being multilingual (speaking many languages) is a strength.', a: 'True', options: ['True', 'False'] },
      { q: 'What is the best way to learn about another culture?', a: 'Ask respectful questions and listen', options: ['Watch one movie about it', 'Ask respectful questions and listen', 'Assume you already know', 'Avoid the topic'] }
    ],
    middle: [
      { q: 'True or False: A microaggression is always intentional.', a: 'False', options: ['True', 'False'] },
      { q: 'What is code-switching?', a: 'Changing behavior to fit different social contexts', options: ['Switching computer programming languages', 'Changing behavior to fit different social contexts', 'A type of secret code', 'Switching schools'] },
      { q: 'True or False: "Positive" stereotypes (like "all Asians are good at math") are still harmful.', a: 'True', options: ['True', 'False'] },
      { q: 'Cultural appropriation is taking elements of a culture without...', a: 'Understanding or respect', options: ['Paying money', 'Understanding or respect', 'A permission slip', 'Telling anyone'] },
      { q: 'True or False: Implicit biases can be changed with awareness and effort.', a: 'True', options: ['True', 'False'] }
    ],
    high: [
      { q: 'Who coined the term "intersectionality"?', a: 'Kimberl\u00E9 Crenshaw', options: ['Kimberl\u00E9 Crenshaw', 'Martin Luther King Jr.', 'bell hooks', 'Angela Davis'] },
      { q: 'True or False: Systemic bias can exist even without individual racist intent.', a: 'True', options: ['True', 'False'] },
      { q: 'Restorative justice has its roots in which traditions?', a: 'Indigenous practices', options: ['Roman law', 'British common law', 'Indigenous practices', 'Social media movements'] },
      { q: 'True or False: "Colorblindness" (claiming not to see race) promotes equity.', a: 'False', options: ['True', 'False'] },
      { q: 'Environmental racism describes how pollution disproportionately affects...', a: 'Marginalized communities', options: ['Rural areas only', 'Wealthy neighborhoods', 'Marginalized communities', 'All areas equally'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Privilege Walk Statements (middle & high) ──
  // ══════════════════════════════════════════════════════════════
  var PRIVILEGE_WALK = [
    { id: 'pw1', text: 'I can see people who look like me in most TV shows and movies.', direction: 'forward', category: 'representation' },
    { id: 'pw2', text: 'I have been followed in a store because of how I look.', direction: 'back', category: 'racial-profiling' },
    { id: 'pw3', text: 'My parents or guardians went to college.', direction: 'forward', category: 'education' },
    { id: 'pw4', text: 'I have been made fun of for my accent or the way I speak.', direction: 'back', category: 'language' },
    { id: 'pw5', text: 'I can go to a grocery store and easily find foods from my culture.', direction: 'forward', category: 'access' },
    { id: 'pw6', text: 'I have worried about whether my family could pay rent or buy food.', direction: 'back', category: 'economic' },
    { id: 'pw7', text: 'I have never been asked "Where are you really from?"', direction: 'forward', category: 'belonging' },
    { id: 'pw8', text: 'I have been the only person of my race or background in a classroom.', direction: 'back', category: 'isolation' },
    { id: 'pw9', text: 'I can use public restrooms without fear of verbal or physical abuse.', direction: 'forward', category: 'safety' },
    { id: 'pw10', text: 'My family has had to move because of rising rent or neighborhood changes.', direction: 'back', category: 'displacement' },
    { id: 'pw11', text: 'I have never been stopped or questioned by police without reason.', direction: 'forward', category: 'justice' },
    { id: 'pw12', text: 'My religious or cultural holidays are not recognized by my school.', direction: 'back', category: 'recognition' },
    { id: 'pw13', text: 'I can hold hands with my partner in public without fear.', direction: 'forward', category: 'safety' },
    { id: 'pw14', text: 'I have had a teacher mispronounce my name repeatedly and not correct themselves.', direction: 'back', category: 'respect' },
    { id: 'pw15', text: 'Buildings, transportation, and public spaces are designed for my body to access easily.', direction: 'forward', category: 'accessibility' }
  ];

  var PRIVILEGE_REFLECTIONS = [
    'What did you notice about where you ended up compared to where you started?',
    'Were any of the statements surprising to you? Which ones and why?',
    'How might someone\u2019s starting position in life affect their opportunities?',
    'What does it feel like to recognize advantages you didn\u2019t earn?',
    'How can understanding different starting points help us build a fairer world?'
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Microaggression Awareness Data (middle & high) ──
  // ══════════════════════════════════════════════════════════════
  var MICROAGGRESSIONS = [
    {
      id: 'ma1',
      said: 'Where are you really from?',
      target: 'People of color, immigrants, multiracial individuals',
      whyHarmful: 'Implies the person is a perpetual foreigner and doesn\u2019t truly belong here, regardless of where they were born or how long they\u2019ve lived here.',
      sayInstead: 'I\u2019d love to learn about your background if you\u2019re comfortable sharing. What\u2019s your family\u2019s heritage?',
      bystanderResponse: 'They already told you where they\u2019re from. If you\u2019re curious about heritage, there are more respectful ways to ask.'
    },
    {
      id: 'ma2',
      said: 'You speak English so well!',
      target: 'People of color, immigrants, multilingual individuals',
      whyHarmful: 'Assumes someone is foreign based on their appearance. Many people of color were born in English-speaking countries. It treats English fluency as surprising rather than normal.',
      sayInstead: 'If genuinely impressed by multilingual skills: "That\u2019s amazing that you speak multiple languages! How did you learn?"',
      bystanderResponse: 'They grew up speaking English. Speaking multiple languages is impressive, but let\u2019s not act surprised when someone speaks their own language well.'
    },
    {
      id: 'ma3',
      said: 'I don\u2019t see color.',
      target: 'People of color broadly',
      whyHarmful: 'While well-intentioned, this erases the real experiences of people of color. Race shapes how people are treated, and ignoring it means ignoring the challenges they face.',
      sayInstead: 'I see and respect your identity. I\u2019m committed to understanding how race affects people\u2019s experiences.',
      bystanderResponse: 'Seeing someone\u2019s full identity, including race, is actually more respectful than pretending differences don\u2019t exist.'
    },
    {
      id: 'ma4',
      said: 'You\u2019re so articulate!',
      target: 'Black individuals and other people of color',
      whyHarmful: 'Carries an undertone of surprise, as if eloquence is unexpected for someone of their background. It sets a lower baseline expectation based on race.',
      sayInstead: 'That was a really compelling point you made. I appreciate your perspective.',
      bystanderResponse: 'People from all backgrounds are articulate. Let\u2019s appreciate the idea itself rather than expressing surprise about who said it.'
    },
    {
      id: 'ma5',
      said: 'Can I touch your hair?',
      target: 'Black individuals, people with natural or textured hair',
      whyHarmful: 'Treats someone\u2019s body as an object of curiosity. Hair is deeply tied to cultural identity, and unsolicited touching or requests to touch are invasive and dehumanizing.',
      sayInstead: 'Don\u2019t ask to touch people\u2019s hair. If you want to compliment it, simply say "Your hair looks great today."',
      bystanderResponse: 'People\u2019s bodies aren\u2019t exhibits. We should appreciate without touching or treating someone as a curiosity.'
    },
    {
      id: 'ma6',
      said: 'That\u2019s so gay.',
      target: 'LGBTQ+ individuals',
      whyHarmful: 'Uses a person\u2019s identity as an insult. Even when not directed at someone LGBTQ+, it sends the message that being gay is negative, making LGBTQ+ people feel unsafe and unwelcome.',
      sayInstead: 'Say what you actually mean: "That\u2019s annoying" or "I don\u2019t like that." Don\u2019t use identities as insults.',
      bystanderResponse: 'Using "gay" as an insult hurts people. Let\u2019s find words that express what we mean without putting anyone\u2019s identity down.'
    },
    {
      id: 'ma7',
      said: 'You don\u2019t look disabled.',
      target: 'People with disabilities, especially invisible disabilities',
      whyHarmful: 'Implies that disability has a specific appearance. Many disabilities are invisible (chronic pain, mental health conditions, autoimmune diseases), and this comment invalidates their real experiences.',
      sayInstead: 'If someone shares they have a disability: "Thanks for telling me. Is there anything I can do to be supportive?"',
      bystanderResponse: 'Disabilities come in many forms, and most aren\u2019t visible. Let\u2019s trust people when they share their experiences.'
    },
    {
      id: 'ma8',
      said: 'Is that your real name?',
      target: 'People with non-Western or unfamiliar names',
      whyHarmful: 'Implies that names from other cultures aren\u2019t "real" or legitimate. A person\u2019s name carries their family history, culture, and identity. Questioning its authenticity is disrespectful.',
      sayInstead: 'Could you help me pronounce your name correctly? I want to make sure I say it right.',
      bystanderResponse: 'Every name is a real name. If it\u2019s unfamiliar, the respectful thing is to learn how to pronounce it, not question whether it\u2019s real.'
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Cultural Heritage Project Builder Sections ──
  // ══════════════════════════════════════════════════════════════
  var HERITAGE_SECTIONS = [
    { id: 'origins', icon: '\uD83C\uDF0D', label: 'Family Origins', prompt: 'Where does your family come from? What countries, regions, or communities are part of your family\u2019s story? How far back do you know?' },
    { id: 'languages', icon: '\uD83D\uDDE3\uFE0F', label: 'Languages Spoken', prompt: 'What languages does your family speak? Are there words, phrases, or expressions that are special to your family? Do you speak differently at home than at school?' },
    { id: 'traditions', icon: '\uD83C\uDF89', label: 'Traditions We Celebrate', prompt: 'What holidays, ceremonies, or traditions does your family observe? Are there special rituals that have been passed down? What do they mean to you?' },
    { id: 'foods', icon: '\uD83C\uDF72', label: 'Foods That Connect Us', prompt: 'What foods are important in your family? Are there special recipes passed down through generations? What meals bring your family together?' },
    { id: 'stories', icon: '\uD83D\uDCDC', label: 'Stories Passed Down', prompt: 'What stories has your family shared with you? Are there family legends, proverbs, or sayings that carry wisdom? What lessons do they teach?' },
    { id: 'values', icon: '\u2764\uFE0F', label: 'Values My Family Holds', prompt: 'What values are most important in your family? How were these values taught to you? How do they guide the way you live?' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Intercultural Communication Tips (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var INTERCULTURAL_TIPS = {
    elementary: [
      { id: 'ic_e1', icon: '\u2753', tip: 'Ask before assuming', detail: 'If you\u2019re curious about someone\u2019s culture, ask a kind question instead of guessing. "Can you tell me about that?" is a great start.' },
      { id: 'ic_e2', icon: '\uD83C\uDFE0', tip: 'Everyone\u2019s family is different and that\u2019s great', detail: 'Some families have two moms, some have grandparents as caregivers, some speak three languages at home. Different doesn\u2019t mean wrong \u2014 it means interesting!' },
      { id: 'ic_e3', icon: '\uD83C\uDF5C', tip: 'Food is a way to share culture', detail: 'Trying food from another culture is one of the most fun ways to learn. Be open-minded and say "thank you" when someone shares their food traditions with you.' },
      { id: 'ic_e4', icon: '\uD83D\uDC42', tip: 'Listen with your whole self', detail: 'When someone tells you about their culture, listen carefully. Don\u2019t interrupt or say "that\u2019s weird." Show you care by asking a follow-up question.' },
      { id: 'ic_e5', icon: '\uD83D\uDE0A', tip: 'Saying someone\u2019s name right matters', detail: 'Everyone\u2019s name is important. If you don\u2019t know how to say it, ask! Practice it. Getting someone\u2019s name right tells them you respect who they are.' },
      { id: 'ic_e6', icon: '\uD83E\uDD1D', tip: 'Be a bridge, not a wall', detail: 'When someone new joins your class, be the person who says hello first. You might be the reason they feel welcome.' }
    ],
    middle: [
      { id: 'ic_m1', icon: '\uD83D\uDC42', tip: 'Listen more than you speak about others\u2019 experiences', detail: 'When someone shares their experience with discrimination or cultural challenges, your job is to listen and believe them \u2014 not to explain, minimize, or compare.' },
      { id: 'ic_m2', icon: '\uD83D\uDEAB', tip: 'Don\u2019t tokenize: "You\u2019re the _____ friend"', detail: 'Reducing someone to their race, religion, or identity ("my Black friend," "my gay friend") makes them a category instead of a person. They\u2019re your friend. Period.' },
      { id: 'ic_m3', icon: '\uD83C\uDFAF', tip: 'Intent vs. impact', detail: 'Even when you didn\u2019t mean to hurt someone, the impact still matters. "I didn\u2019t mean it that way" doesn\u2019t undo the harm. Focus on the effect your words have, not just what you intended.' },
      { id: 'ic_m4', icon: '\uD83D\uDCAC', tip: 'Ask, don\u2019t assume someone wants to educate you', detail: 'It\u2019s not a person of color\u2019s job to teach you about racism. Do your own research first, then ask respectful questions if someone is willing to share.' },
      { id: 'ic_m5', icon: '\uD83E\uDDE0', tip: 'Check your assumptions at the door', detail: 'Notice when you make assumptions about someone based on how they look, dress, or talk. Pause and ask yourself: "Is this based on who they actually are, or on a stereotype?"' },
      { id: 'ic_m6', icon: '\uD83D\uDD04', tip: 'Practice the repair', detail: 'When you mess up (and you will), own it. "I\u2019m sorry, that was wrong. I\u2019m learning. Thank you for telling me." Then do better next time.' }
    ],
    high: [
      { id: 'ic_h1', icon: '\uD83D\uDD0D', tip: 'Examine your own cultural lens', detail: 'Your worldview isn\u2019t neutral \u2014 it\u2019s shaped by your culture, class, race, and upbringing. Recognizing your own lens is the first step to seeing beyond it.' },
      { id: 'ic_h2', icon: '\uD83C\uDF0D', tip: 'Decentering: your experience isn\u2019t universal', detail: 'What feels "normal" to you is cultural, not universal. Decentering means recognizing that your way of seeing the world is one perspective among many, not the default.' },
      { id: 'ic_h3', icon: '\uD83E\uDD1D', tip: 'Solidarity vs. saviorism', detail: 'Solidarity means standing alongside communities in their fight. Saviorism means swooping in to "fix" things on your terms. The difference: who has the power and who sets the agenda.' },
      { id: 'ic_h4', icon: '\uD83D\uDCAC', tip: 'Sit with discomfort', detail: 'Conversations about race, privilege, and oppression should make you uncomfortable. Discomfort is a sign of growth. Don\u2019t retreat from it \u2014 lean into it and learn.' },
      { id: 'ic_h5', icon: '\uD83D\uDCDA', tip: 'Do the work before entering the conversation', detail: 'Before engaging in discussions about marginalized communities, educate yourself. Read, listen to podcasts, follow diverse voices. Come to conversations prepared, not expecting free education.' },
      { id: 'ic_h6', icon: '\u2696\uFE0F', tip: 'Equity over equality', detail: 'Equality gives everyone the same thing. Equity gives people what they need to have fair access. Understanding this distinction is essential for meaningful cross-cultural dialogue.' }
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
    { id: 'scenario_master',   icon: '\uD83C\uDFAD', name: 'Scenario Master',      desc: 'Complete all 8 scenarios in your grade band' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Practice Streak',      desc: 'Practice 3 days in a row' },
    { id: 'total_10',          icon: '\uD83D\uDC8E', name: 'Dedicated Learner',    desc: 'Complete 10 activities across all tabs' },
    { id: 'quiz_champion',     icon: '\uD83C\uDFC6', name: 'Quiz Champion',        desc: 'Score 8 or more on the Culture Quiz' },
    { id: 'ally_action',       icon: '\uD83E\uDD1D', name: 'Ally Action',          desc: 'Complete 3 allyship action cards' },
    { id: 'culture_explorer_pro', icon: '\uD83C\uDF1F', name: 'Culture Explorer Pro', desc: 'Explore 12 or more cultural topics' },
    { id: 'deep_diver',        icon: '\uD83E\uDD3F', name: 'Deep Diver',           desc: 'Read every culture item in your grade band' },
    { id: 'action_taker',      icon: '\u26A1',        name: 'Action Taker',         desc: 'Complete 5 allyship actions and a scenario with top rating' },
    { id: 'battle_victor',     icon: '\u2694\uFE0F',  name: 'Battle Victor',        desc: 'Get 4 or more correct in Battle Questions' },
    { id: 'privilege_aware',   icon: '\uD83D\uDCA1', name: 'Privilege Aware',      desc: 'Complete the Privilege Walk and write a reflection' },
    { id: 'micro_spotter',     icon: '\uD83D\uDD0D', name: 'Microaggression Spotter', desc: 'Review all 8 microaggressions and practice responses' },
    { id: 'heritage_builder',  icon: '\uD83C\uDFDB\uFE0F', name: 'Heritage Builder',     desc: 'Complete 4 or more sections of your Cultural Heritage Project' },
    { id: 'cross_cultural',    icon: '\uD83C\uDF10', name: 'Cross-Cultural Communicator', desc: 'Read all intercultural communication tips' },
    { id: 'inclusion_champion', icon: '\uD83C\uDFF3\uFE0F', name: 'Inclusion Champion',   desc: 'Earn 12 other badges \u2014 a true champion of inclusion' }
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
        var announceToSR = ctx.announceToSR;
        var a11yClick = ctx.a11yClick;
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

        // Culture Quiz state
        var quizIdx        = d.quizIdx || 0;
        var quizScore      = d.quizScore || 0;
        var quizBest       = d.quizBest || 0;
        var quizAnswered   = d.quizAnswered || {};
        var quizFinished   = d.quizFinished || false;

        // Allyship Actions state
        var allyActions    = d.allyActions || {};

        // Battle Questions state
        var battleIdx      = d.battleIdx || 0;
        var battleScore    = d.battleScore || 0;
        var battleBest     = d.battleBest || 0;
        var battleAnswered = d.battleAnswered || {};
        var battleFinished = d.battleFinished || false;

        // Privilege Walk state
        var pwIdx          = d.pwIdx || 0;
        var pwAnswers      = d.pwAnswers || {};
        var pwPosition     = d.pwPosition != null ? d.pwPosition : 0;
        var pwFinished     = d.pwFinished || false;
        var pwReflection   = d.pwReflection || '';
        var pwReflectionSaved = d.pwReflectionSaved || false;

        // Microaggression state
        var maIdx          = d.maIdx || 0;
        var maReviewed     = d.maReviewed || {};
        var maResponses    = d.maResponses || {};
        var maBystanderDone = d.maBystanderDone || {};

        // Heritage Project state
        var heritageData   = d.heritageData || {};
        var heritageSaved  = d.heritageSaved || false;

        // Intercultural Tips state
        var icRead         = d.icRead || {};

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
          if (scCompleted >= 8) tryAwardBadge('scenario_master');

          var tabsVisited = visitedTabs;
          var allCoreVisited = tabsVisited.explore && tabsVisited.identity && tabsVisited.scenarios && tabsVisited.badges && tabsVisited.quiz && tabsVisited.battle;
          var allNewVisited = band === 'elementary' ? (tabsVisited.heritage && tabsVisited.commtips) : (tabsVisited.heritage && tabsVisited.commtips && tabsVisited.privilege && tabsVisited.microagg);
          if (allCoreVisited && allNewVisited) tryAwardBadge('all_tabs');

          if (explored >= 12) tryAwardBadge('culture_explorer_pro');

          var bandItems = CULTURE_ITEMS[band] || CULTURE_ITEMS.elementary;
          var allBandExplored = true;
          bandItems.forEach(function(item) { if (!exploredItems[item.id]) allBandExplored = false; });
          if (allBandExplored && bandItems.length > 0) tryAwardBadge('deep_diver');

          var allyDone = Object.keys(allyActions).length;
          if (allyDone >= 3) tryAwardBadge('ally_action');
          if (allyDone >= 5 && scTopRatings >= 1) tryAwardBadge('action_taker');

          if (quizBest >= 8 || quizScore >= 8) tryAwardBadge('quiz_champion');
          if (battleBest >= 4 || battleScore >= 4) tryAwardBadge('battle_victor');

          // New feature badges
          if (pwFinished && pwReflectionSaved) tryAwardBadge('privilege_aware');
          var maReviewedCount = Object.keys(maReviewed).length;
          if (maReviewedCount >= 8) tryAwardBadge('micro_spotter');
          var heritageFilled = 0;
          HERITAGE_SECTIONS.forEach(function(sec) { if (heritageData[sec.id] && heritageData[sec.id].trim().length > 0) heritageFilled++; });
          if (heritageFilled >= 4) tryAwardBadge('heritage_builder');
          var tipItems = INTERCULTURAL_TIPS[band] || INTERCULTURAL_TIPS.elementary;
          var allTipsRead = true;
          tipItems.forEach(function(tip) { if (!icRead[tip.id]) allTipsRead = false; });
          if (allTipsRead && tipItems.length > 0) tryAwardBadge('cross_cultural');

          var badgeCount = Object.keys(earnedBadges).length;
          if (badgeCount >= 7) tryAwardBadge('culture_champion');
          if (badgeCount >= 12) tryAwardBadge('inclusion_champion');
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
        var allTabs = [
          { id: 'explore',   label: '\uD83C\uDF0D Explore' },
          { id: 'identity',  label: '\uD83E\uDDE9 Identity' },
          { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' },
          { id: 'privilege', label: '\uD83D\uDCA1 Privilege', minBand: 'middle' },
          { id: 'microagg',  label: '\uD83D\uDD0D Micro', minBand: 'middle' },
          { id: 'heritage',  label: '\uD83C\uDFDB\uFE0F Heritage' },
          { id: 'commtips',  label: '\uD83C\uDF10 Tips' },
          { id: 'quiz',      label: '\uD83C\uDFC6 Quiz' },
          { id: 'battle',    label: '\u2694\uFE0F Battle' },
          { id: 'badges',    label: '\uD83C\uDFC5 Badges' }
        ];
        var tabs = allTabs.filter(function(t) {
          if (!t.minBand) return true;
          if (t.minBand === 'middle' && band === 'elementary') return false;
          return true;
        });

        var tabBar = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
          role: 'tablist', 'aria-label': 'Community Building tabs',
          style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
        },
          tabs.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', { 'aria-label': t.label,
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
          h('button', { 'aria-label': 'Toggle panel', onClick: function() { upd({ soundEnabled: !soundEnabled }); }, style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b' }, title: soundEnabled ? 'Mute' : 'Unmute' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
          h('button', { 'aria-label': 'Toggle panel', onClick: function() { upd({ showBadgesPanel: !showBadgesPanel }); }, style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b', position: 'relative' } },
            '\uD83C\uDFC5',
            Object.keys(earnedBadges).length > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, Object.keys(earnedBadges).length)
          )
        );

        // ── Badge Popup ──
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' }, onClick: function() { upd({ showBadgePopup: null }); } },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 300 } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 56, marginBottom: 10 } }, popBadge.icon),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
              )
            );
          }
        }
        if (showBadgesPanel) {
          badgePopup = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, background: 'rgba(0,0,0,0.5)' }, onClick: function() { upd({ showBadgesPanel: false }); } },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, onClick: function(e) { e.stopPropagation(); }, style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto' } },
              h('h3', { style: { textAlign: 'center', color: '#f1f5f9', marginBottom: 16, fontSize: 16 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                BADGES.map(function(b) {
                  var earned = !!earnedBadges[b.id];
                  return h('div', { key: b.id, style: { padding: 12, borderRadius: 10, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.5 } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),
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
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              items.map(function(item) {
                var isExpanded = expandedItem === item.id;
                var isExplored = !!exploredItems[item.id];
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: item.id, style: { borderRadius: 14, background: isExpanded ? '#1e293b' : '#0f172a', border: '1px solid ' + (isExplored ? ACCENT_MED : '#334155'), overflow: 'hidden', transition: 'all 0.2s' } },
                  h('button', { 'aria-label': 'Explore topic',
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
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 26 } }, item.emoji),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { flex: 1 } },
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' } }, item.name),
                      !isExpanded && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, item.desc.slice(0, 60) + '...')
                    ),
                    isExplored && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: ACCENT } }, '\u2713'),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' } }, '\u25BC')
                  ),
                  isExpanded && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: '0 16px 16px 16px' } },
                    h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 } }, item.desc),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                      h('button', { 'aria-label': 'I didn’t know that!',
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
                      callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(item.name + '. ' + item.desc); }, style: { padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
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
                    'aria-label': cat.label + ' identity reflection',
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
                    style: { width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }
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
                'aria-label': 'Community superpower reflection',
                onChange: function(e) { upd({ superpower: e.target.value }); },
                placeholder: band === 'elementary' ? 'My cultural superpower is...' : 'My unique cultural strength is...',
                style: { width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }
              }),
              h('button', { 'aria-label': 'Toggle sound',
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
            ),
            // ── Allyship Action Cards ──
            h('div', { style: { marginTop: 24 } },
              h('h4', { style: { fontSize: 14, color: ACCENT, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', null, '\uD83E\uDD1D'),
                'Allyship Action Cards'
              ),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 } },
                band === 'elementary' ? 'Try these real actions to be a great friend to everyone! Check them off as you complete them.' :
                band === 'middle' ? 'Move from awareness to action. Complete these allyship challenges and reflect on what you learn.' :
                'Practice tangible allyship. Each action pushes you beyond comfort into genuine solidarity.'
              ),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                (ALLYSHIP_ACTIONS[band] || ALLYSHIP_ACTIONS.elementary).map(function(card) {
                  var isDone = !!allyActions[card.id];
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: card.id, style: { padding: 14, borderRadius: 12, background: isDone ? '#1e293b' : '#0f172a', border: '1px solid ' + (isDone ? '#22c55e44' : '#334155'), transition: 'all 0.2s' } },
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 22 } }, card.icon),
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { flex: 1 } },
                        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 13, fontWeight: 600, color: isDone ? '#22c55e' : '#f1f5f9' } }, card.action),
                        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 } }, card.detail)
                      ),
                      isDone && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 16, color: '#22c55e' } }, '\u2713')
                    ),
                    !isDone && h('button', { 'aria-label': 'Mark action complete',
                      onClick: function() {
                        var newAlly = Object.assign({}, allyActions);
                        newAlly[card.id] = Date.now();
                        upd({ allyActions: newAlly });
                        if (soundEnabled) sfxCorrect();
                        addToast('\uD83E\uDD1D Allyship action completed!', 'success');
                        awardXP(10);
                        logPractice('ally_action', card.id);
                        checkBadges();
                      },
                      style: { marginTop: 8, padding: '6px 14px', borderRadius: 8, border: '1px solid ' + ACCENT_MED, background: ACCENT_DIM, color: ACCENT, fontSize: 11, cursor: 'pointer', fontWeight: 600 }
                    }, '\u2713 I did this!')
                  );
                })
              ),
              h('div', { style: { textAlign: 'center', marginTop: 12, fontSize: 12, color: '#64748b' } },
                Object.keys(allyActions).length + ' of ' + (ALLYSHIP_ACTIONS[band] || ALLYSHIP_ACTIONS.elementary).length + ' actions completed'
              )
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

          scenariosContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFAD Cultural Scenarios'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20 } },
              'Scenario ' + ((scIdx % scenarios.length) + 1) + ' of ' + scenarios.length
            ),
            // Scenario card
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, borderRadius: 16, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
              h('h4', { style: { fontSize: 16, fontWeight: 700, color: ACCENT, marginBottom: 10 } }, scenario.title),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 16 } }, scenario.setup),
              callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(scenario.setup); }, style: { marginBottom: 12, background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null,
              // Choices
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                scenario.branches.map(function(branch, bi) {
                  var isChosen = scChoice === bi;
                  var isRevealed = scChoice != null;
                  var starStr = '';
                  for (var si = 0; si < 3; si++) { starStr += si < branch.rating ? '\u2B50' : '\u2606'; }
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: bi },
                    h('button', { 'aria-label': branch.label,
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
                    isChosen && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: '10px 14px', marginTop: 4, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' } },
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, marginBottom: 4 } }, starStr),
                      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, branch.feedback)
                    )
                  );
                })
              )
            ),
            // Navigation
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('button', { 'aria-label': 'Previous',
                onClick: function() {
                  var newIdx = scIdx > 0 ? scIdx - 1 : scenarios.length - 1;
                  upd({ scIdx: newIdx, scChoice: null });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
              }, '\u2190 Previous'),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#64748b' } }, scCompleted + ' completed'),
              h('button', { 'aria-label': 'Next',
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
        // ── TAB: Culture Quiz ──
        // Grade-adaptive matching quiz for cultural knowledge
        // ══════════════════════════════════════════════════════════
        var quizContent = null;
        if (activeTab === 'quiz') {
          var quizItems = CULTURE_QUIZ[band] || CULTURE_QUIZ.elementary;
          var currentQ = quizItems[quizIdx % quizItems.length];
          var qKey = band + '_' + (quizIdx % quizItems.length);
          var isQAnswered = !!quizAnswered[qKey];

          quizContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFC6 Culture Quiz'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 6 } },
              band === 'elementary' ? 'Match cultural practices to their origins! How much do you know?' :
              band === 'middle' ? 'Test your cultural literacy. Can you get them all right?' :
              'Challenge your understanding of culture, power, and identity.'
            ),
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, fontSize: 12 } },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: ACCENT, fontWeight: 600 } }, 'Score: ' + quizScore + '/' + quizItems.length),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: '#f59e0b', fontWeight: 600 } }, '\u2B50 Best: ' + quizBest + '/' + quizItems.length)
            ),
            !quizFinished ? h('div', null,
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, borderRadius: 16, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, color: '#64748b', marginBottom: 8 } }, 'Question ' + ((quizIdx % quizItems.length) + 1) + ' of ' + quizItems.length),
                h('p', { style: { fontSize: 14, color: '#f1f5f9', fontWeight: 600, lineHeight: 1.5, marginBottom: 16 } }, currentQ.q),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  currentQ.options.map(function(opt) {
                    var isCorrect = opt === currentQ.a;
                    var wasChosen = quizAnswered[qKey] === opt;
                    var showResult = isQAnswered;
                    return h('button', { 'aria-label': 'Select answer',
                      key: opt,
                      onClick: function() {
                        if (isQAnswered) return;
                        var newAnswered = Object.assign({}, quizAnswered);
                        newAnswered[qKey] = opt;
                        var newScore = quizScore + (isCorrect ? 1 : 0);
                        upd({ quizAnswered: newAnswered, quizScore: newScore });
                        if (soundEnabled) { if (isCorrect) sfxCorrect(); else sfxWrong(); }
                        if (isCorrect) awardXP(5);
                        logPractice('quiz', qKey);
                        // Check if quiz is complete
                        var answeredCount = Object.keys(newAnswered).length;
                        if (answeredCount >= quizItems.length) {
                          var best = newScore > quizBest ? newScore : quizBest;
                          upd({ quizFinished: true, quizBest: best });
                          if (newScore >= 8) {
                            addToast('\uD83C\uDFC6 Amazing! Quiz Champion with ' + newScore + '/' + quizItems.length + '!', 'success');
                            if (soundEnabled) sfxBadge();
                          } else {
                            addToast('Quiz complete! Score: ' + newScore + '/' + quizItems.length, 'info');
                          }
                        }
                        checkBadges();
                      },
                      style: {
                        width: '100%', padding: '12px 14px', borderRadius: 10, textAlign: 'left', fontSize: 13, cursor: isQAnswered ? 'default' : 'pointer',
                        border: '1px solid ' + (showResult && isCorrect ? '#22c55e' : showResult && wasChosen && !isCorrect ? '#ef4444' : '#334155'),
                        background: showResult && isCorrect ? '#22c55e11' : showResult && wasChosen && !isCorrect ? '#ef444411' : '#0f172a',
                        color: showResult && isCorrect ? '#22c55e' : showResult && wasChosen && !isCorrect ? '#ef4444' : '#e2e8f0',
                        fontWeight: showResult && (isCorrect || wasChosen) ? 600 : 400,
                        opacity: showResult && !isCorrect && !wasChosen ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }
                    }, opt + (showResult && isCorrect ? ' \u2713' : '') + (showResult && wasChosen && !isCorrect ? ' \u2717' : ''));
                  })
                )
              ),
              isQAnswered && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'center' } },
                h('button', { 'aria-label': 'Next',
                  onClick: function() {
                    var nextIdx = quizIdx + 1;
                    upd({ quizIdx: nextIdx });
                    if (soundEnabled) sfxClick();
                  },
                  style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
                }, (quizIdx % quizItems.length) + 1 >= quizItems.length ? 'See Results' : 'Next Question \u2192')
              )
            ) : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center', padding: 30, borderRadius: 16, background: '#1e293b', border: '1px solid ' + ACCENT_MED } },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 48, marginBottom: 12 } }, quizScore >= 8 ? '\uD83C\uDFC6' : quizScore >= 5 ? '\uD83C\uDF1F' : '\uD83D\uDCA1'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, 'Quiz Complete!'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 16, color: ACCENT, fontWeight: 600, marginBottom: 4 } }, 'Score: ' + quizScore + ' / ' + quizItems.length),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 13, color: '#94a3b8', marginBottom: 16 } }, quizScore >= 8 ? 'Outstanding cultural knowledge!' : quizScore >= 5 ? 'Great job! Keep exploring to learn more.' : 'Keep learning! Every question you missed is a chance to grow.'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#f59e0b', marginBottom: 16 } }, '\u2B50 Personal Best: ' + quizBest + '/' + quizItems.length),
              h('button', { 'aria-label': 'Try Again',
                onClick: function() {
                  upd({ quizIdx: 0, quizScore: 0, quizAnswered: {}, quizFinished: false });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
              }, '\uD83D\uDD04 Try Again')
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Privilege Walk (middle & high only) ──
        // ══════════════════════════════════════════════════════════
        var privilegeContent = null;
        if (activeTab === 'privilege' && band !== 'elementary') {
          var currentPW = PRIVILEGE_WALK[pwIdx];
          var totalPW = PRIVILEGE_WALK.length;
          var answeredPWCount = Object.keys(pwAnswers).length;

          privilegeContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCA1 Privilege Walk'),
            h('div', { style: { textAlign: 'center', padding: '10px 16px', borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
              h('p', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 0 } },
                'Privilege isn\u2019t about blame \u2014 it\u2019s about understanding different starting points. ',
                'Read each statement and honestly reflect on whether it applies to your life. ',
                'This exercise builds awareness of the advantages and challenges that shape people\u2019s experiences.'
              )
            ),
            !pwFinished ? h('div', null,
              // Position indicator
              h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 20px', borderRadius: 10, background: '#1e293b', border: '1px solid ' + ACCENT_MED } },
                  h('span', { style: { fontSize: 12, color: '#64748b' } }, 'Your position:'),
                  h('span', { style: { fontSize: 22, fontWeight: 700, color: pwPosition > 0 ? '#22c55e' : pwPosition < 0 ? '#f59e0b' : '#94a3b8' } },
                    (pwPosition > 0 ? '+' : '') + pwPosition
                  ),
                  h('span', { style: { fontSize: 12, color: '#64748b' } }, 'steps')
                )
              ),
              // Visual position bar
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { position: 'relative', height: 8, borderRadius: 4, background: '#334155', marginBottom: 20, overflow: 'visible' } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: {
                  position: 'absolute', top: -4, width: 16, height: 16, borderRadius: '50%', background: ACCENT, border: '2px solid #fff',
                  left: 'calc(50% + ' + (pwPosition * 3) + '% - 8px)', transition: 'left 0.4s ease'
                } })
              ),
              // Statement card
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, borderRadius: 16, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, color: '#64748b', marginBottom: 8 } }, 'Statement ' + (pwIdx + 1) + ' of ' + totalPW),
                h('p', { style: { fontSize: 15, color: '#f1f5f9', fontWeight: 600, lineHeight: 1.6, marginBottom: 16, textAlign: 'center', minHeight: 50 } }, currentPW ? currentPW.text : ''),
                !pwAnswers[currentPW ? currentPW.id : ''] ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 12, justifyContent: 'center' } },
                  h('button', { 'aria-label': 'Answer statement',
                    onClick: function() {
                      if (!currentPW) return;
                      var newAns = Object.assign({}, pwAnswers);
                      newAns[currentPW.id] = 'forward';
                      var newPos = pwPosition + 1;
                      upd({ pwAnswers: newAns, pwPosition: newPos });
                      if (soundEnabled) sfxClick();
                      awardXP(3);
                      logPractice('privilege_walk', currentPW.id);
                      if (Object.keys(newAns).length >= totalPW) {
                        upd({ pwFinished: true });
                        addToast('\uD83D\uDCA1 Privilege Walk complete. Take a moment to reflect.', 'info');
                      }
                    },
                    style: { padding: '10px 24px', borderRadius: 10, border: '1px solid #22c55e44', background: '#22c55e11', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 140 }
                  }, '\u2191 Step Forward'),
                  h('button', { 'aria-label': 'Answer statement',
                    onClick: function() {
                      if (!currentPW) return;
                      var newAns = Object.assign({}, pwAnswers);
                      newAns[currentPW.id] = 'back';
                      var newPos = pwPosition - 1;
                      upd({ pwAnswers: newAns, pwPosition: newPos });
                      if (soundEnabled) sfxClick();
                      awardXP(3);
                      logPractice('privilege_walk', currentPW.id);
                      if (Object.keys(newAns).length >= totalPW) {
                        upd({ pwFinished: true });
                        addToast('\uD83D\uDCA1 Privilege Walk complete. Take a moment to reflect.', 'info');
                      }
                    },
                    style: { padding: '10px 24px', borderRadius: 10, border: '1px solid #f59e0b44', background: '#f59e0b11', color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 140 }
                  }, '\u2193 Step Back')
                ) : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center', fontSize: 12, color: pwAnswers[currentPW ? currentPW.id : ''] === 'forward' ? '#22c55e' : '#f59e0b', fontWeight: 600 } },
                  pwAnswers[currentPW ? currentPW.id : ''] === 'forward' ? '\u2191 Stepped Forward' : '\u2193 Stepped Back'
                ),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center', marginTop: 10, fontSize: 10, color: '#64748b', fontStyle: 'italic' } },
                  'Category: ' + (currentPW ? currentPW.category : '')
                )
              ),
              // Navigation
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('button', { 'aria-label': 'Previous',
                  onClick: function() { if (pwIdx > 0) { upd({ pwIdx: pwIdx - 1 }); if (soundEnabled) sfxClick(); } },
                  disabled: pwIdx === 0,
                  style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: pwIdx === 0 ? '#334155' : '#94a3b8', fontSize: 12, cursor: pwIdx === 0 ? 'default' : 'pointer' }
                }, '\u2190 Previous'),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#64748b' } }, answeredPWCount + '/' + totalPW + ' answered'),
                h('button', { 'aria-label': 'Next',
                  onClick: function() { if (pwIdx < totalPW - 1) { upd({ pwIdx: pwIdx + 1 }); if (soundEnabled) sfxClick(); } },
                  disabled: pwIdx >= totalPW - 1,
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: pwIdx >= totalPW - 1 ? '#334155' : ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: pwIdx >= totalPW - 1 ? 'default' : 'pointer' }
                }, 'Next \u2192')
              )
            ) : h('div', null,
              // Finished state — reflection
              h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 16, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
                h('div', { style: { fontSize: 40, marginBottom: 8 } }, '\uD83D\uDCA1'),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } }, 'Walk Complete'),
                h('div', { style: { fontSize: 14, color: ACCENT, fontWeight: 600, marginBottom: 8 } }, 'Final position: ' + (pwPosition > 0 ? '+' : '') + pwPosition + ' steps'),
                h('p', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6, maxWidth: 420, margin: '0 auto 16px' } },
                  'Everyone ends up in different places \u2014 and that\u2019s the point. This exercise isn\u2019t about guilt or pride. It\u2019s about recognizing that people start from different places through no choice of their own, and that awareness is the first step toward equity.'
                )
              ),
              // Reflection prompts
              h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
                h('h4', { style: { fontSize: 14, color: ACCENT, marginBottom: 12 } }, 'What did you notice?'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
                  PRIVILEGE_REFLECTIONS.map(function(q, qi) {
                    return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: qi, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } },
                      '\u2022 ' + q
                    );
                  })
                ),
                h('textarea', {
                  value: pwReflection,
                  'aria-label': 'Privilege walk reflection',
                  onChange: function(e) { upd({ pwReflection: e.target.value }); },
                  placeholder: 'Write your reflection here. What stood out to you? What did you learn about yourself or about different experiences?',
                  style: { width: '100%', minHeight: 100, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }
                }),
                h('button', { 'aria-label': 'Walk Again',
                  onClick: function() {
                    if (!pwReflection.trim()) { addToast('Write a reflection before saving.', 'error'); return; }
                    upd({ pwReflectionSaved: true });
                    if (soundEnabled) sfxCorrect();
                    addToast('\uD83D\uDCA1 Privilege Walk reflection saved!', 'success');
                    awardXP(20);
                    logPractice('privilege_reflection', 'saved');
                    checkBadges();
                  },
                  disabled: pwReflectionSaved,
                  style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: pwReflectionSaved ? '#334155' : ACCENT, color: pwReflectionSaved ? '#64748b' : '#fff', fontSize: 12, fontWeight: 600, cursor: pwReflectionSaved ? 'default' : 'pointer' }
                }, pwReflectionSaved ? '\u2713 Reflection Saved' : 'Save Reflection')
              ),
              // Reset button
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center' } },
                h('button', { 'aria-label': 'Walk Again',
                  onClick: function() {
                    upd({ pwIdx: 0, pwAnswers: {}, pwPosition: 0, pwFinished: false, pwReflection: '', pwReflectionSaved: false });
                    if (soundEnabled) sfxClick();
                  },
                  style: { padding: '8px 20px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
                }, '\uD83D\uDD04 Walk Again')
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Microaggression Awareness (middle & high) ──
        // ══════════════════════════════════════════════════════════
        var microaggContent = null;
        if (activeTab === 'microagg' && band !== 'elementary') {
          var currentMA = MICROAGGRESSIONS[maIdx];
          var maReviewedCount = Object.keys(maReviewed).length;

          microaggContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDD0D Microaggression Awareness'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 } },
              'Microaggressions are brief, everyday exchanges that send demeaning messages to people based on their identity. They\u2019re often unintentional, but their impact is real. Learning to recognize them is the first step to stopping them.'
            ),
            h('div', { style: { textAlign: 'center', marginBottom: 16, fontSize: 12, color: '#64748b' } },
              maReviewedCount + ' of ' + MICROAGGRESSIONS.length + ' reviewed'
            ),
            // Main card
            currentMA && h('div', { style: { borderRadius: 16, background: '#1e293b', border: '1px solid #334155', overflow: 'hidden', marginBottom: 16 } },
              // Header — the statement
              h('div', { style: { padding: '20px 20px 16px', borderBottom: '1px solid #33415544', background: '#0f172a' } },
                h('div', { style: { fontSize: 11, color: '#64748b', marginBottom: 6 } }, (maIdx + 1) + ' of ' + MICROAGGRESSIONS.length),
                h('div', { style: { fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'What was said:'),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.4 } }, '\u201C' + currentMA.said + '\u201D'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 8 } }, 'Often directed at: ' + currentMA.target)
              ),
              // Body
              h('div', { style: { padding: 20 } },
                // Why it's harmful
                h('div', { style: { marginBottom: 16 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6 } }, '\u26A0\uFE0F Why it\u2019s harmful:'),
                  h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } }, currentMA.whyHarmful)
                ),
                // What to say instead
                h('div', { style: { marginBottom: 16 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 6 } }, '\u2713 What to say instead:'),
                  h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } }, currentMA.sayInstead)
                ),
                // Bystander response practice
                h('div', { style: { marginBottom: 16 } },
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 6 } }, '\uD83D\uDDE3\uFE0F Bystander response \u2014 what could you say if you witnessed this?'),
                  !maBystanderDone[currentMA.id] ? h('div', null,
                    h('textarea', {
                      value: maResponses[currentMA.id] || '',
                      'aria-label': 'Microaggression response',
                      onChange: function(e) {
                        var newResp = Object.assign({}, maResponses);
                        newResp[currentMA.id] = e.target.value;
                        upd({ maResponses: newResp });
                      },
                      placeholder: 'Practice writing what you would say as a bystander...',
                      style: { width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }
                    }),
                    h('button', { 'aria-label': 'Mark as done',
                      onClick: function() {
                        if (!(maResponses[currentMA.id] || '').trim()) { addToast('Write a response first.', 'error'); return; }
                        var newDone = Object.assign({}, maBystanderDone);
                        newDone[currentMA.id] = true;
                        upd({ maBystanderDone: newDone });
                        if (soundEnabled) sfxCorrect();
                        awardXP(8);
                      },
                      style: { padding: '6px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }
                    }, 'Submit My Response')
                  ) : h('div', null,
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #334155', fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, color: '#64748b', marginBottom: 4 } }, 'Your response:'),
                      maResponses[currentMA.id] || ''
                    ),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: '8px 12px', borderRadius: 8, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED, fontSize: 12, color: ACCENT, lineHeight: 1.5 } },
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, color: '#64748b', marginBottom: 4 } }, 'Example bystander response:'),
                      currentMA.bystanderResponse
                    )
                  )
                ),
                // Mark as reviewed
                !maReviewed[currentMA.id] && h('button', { 'aria-label': 'Review example',
                  onClick: function() {
                    var newRev = Object.assign({}, maReviewed);
                    newRev[currentMA.id] = true;
                    upd({ maReviewed: newRev });
                    if (soundEnabled) sfxDiscover();
                    addToast('\uD83D\uDD0D Microaggression reviewed! (' + (Object.keys(newRev).length) + '/' + MICROAGGRESSIONS.length + ')', 'success');
                    awardXP(5);
                    logPractice('microagg', currentMA.id);
                    checkBadges();
                  },
                  style: { width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid ' + ACCENT_MED, background: ACCENT_DIM, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
                }, '\uD83D\uDCA1 I understand this \u2014 mark as reviewed'),
                maReviewed[currentMA.id] && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center', fontSize: 12, color: '#22c55e', fontWeight: 600, padding: '8px 0' } }, '\u2713 Reviewed')
              )
            ),
            // Navigation
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('button', { 'aria-label': 'Previous',
                onClick: function() { if (maIdx > 0) { upd({ maIdx: maIdx - 1 }); if (soundEnabled) sfxClick(); } },
                disabled: maIdx === 0,
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: maIdx === 0 ? '#334155' : '#94a3b8', fontSize: 12, cursor: maIdx === 0 ? 'default' : 'pointer' }
              }, '\u2190 Previous'),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#64748b' } }, maReviewedCount + '/' + MICROAGGRESSIONS.length + ' reviewed'),
              h('button', { 'aria-label': 'Next',
                onClick: function() { if (maIdx < MICROAGGRESSIONS.length - 1) { upd({ maIdx: maIdx + 1 }); if (soundEnabled) sfxClick(); } },
                disabled: maIdx >= MICROAGGRESSIONS.length - 1,
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: maIdx >= MICROAGGRESSIONS.length - 1 ? '#334155' : ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: maIdx >= MICROAGGRESSIONS.length - 1 ? 'default' : 'pointer' }
              }, 'Next \u2192')
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Cultural Heritage Project Builder ──
        // ══════════════════════════════════════════════════════════
        var heritageContent = null;
        if (activeTab === 'heritage') {
          var hFilled = 0;
          HERITAGE_SECTIONS.forEach(function(sec) { if (heritageData[sec.id] && heritageData[sec.id].trim().length > 0) hFilled++; });

          heritageContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFDB\uFE0F My Cultural Heritage'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 } },
              band === 'elementary' ? 'Tell the story of YOUR family and culture! Fill in each section to build your Cultural Heritage project.' :
              band === 'middle' ? 'Document the rich tapestry of your cultural heritage. Each section helps you explore and celebrate where you come from.' :
              'Create a record of your cultural heritage. This project is an act of self-knowledge and cultural preservation.'
            ),
            // Heritage sections grid
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 } },
              HERITAGE_SECTIONS.map(function(sec) {
                var val = heritageData[sec.id] || '';
                var filled = val.trim().length > 0;
                return h('div', { key: sec.id, style: { padding: 16, borderRadius: 14, background: filled ? '#1e293b' : '#0f172a', border: '1px solid ' + (filled ? ACCENT_MED : '#334155'), transition: 'all 0.2s' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                    h('span', { style: { fontSize: 22 } }, sec.icon),
                    h('span', { style: { fontSize: 14, fontWeight: 600, color: filled ? ACCENT : '#f1f5f9' } }, sec.label),
                    filled && h('span', { style: { marginLeft: 'auto', fontSize: 12, color: ACCENT } }, '\u2713')
                  ),
                  h('p', { style: { fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.5 } }, sec.prompt),
                  h('textarea', {
                    'aria-label': sec.label + ' response',
                    value: val,
                    onChange: function(e) {
                      var newH = Object.assign({}, heritageData);
                      newH[sec.id] = e.target.value;
                      upd({ heritageData: newH });
                    },
                    onBlur: function() {
                      if (val.trim().length > 0) {
                        logPractice('heritage', sec.id);
                        awardXP(5);
                        checkBadges();
                      }
                    },
                    placeholder: band === 'elementary' ? 'Write about this here...' : 'Share your story...',
                    style: { width: '100%', minHeight: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }
                  })
                );
              })
            ),
            // Progress
            h('div', { style: { textAlign: 'center', marginBottom: 16, padding: '8px 16px', borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 4 } }, 'My Cultural Map'),
              h('div', { style: { height: 6, borderRadius: 3, background: '#334155', overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: (hFilled / HERITAGE_SECTIONS.length * 100) + '%', background: ACCENT, borderRadius: 3, transition: 'width 0.3s' } })
              ),
              h('div', { style: { fontSize: 11, color: '#64748b', marginTop: 4 } }, hFilled + ' of ' + HERITAGE_SECTIONS.length + ' sections completed')
            ),
            // Visual Cultural Map
            hFilled >= 1 && h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('h4', { style: { fontSize: 14, color: ACCENT, marginBottom: 12, textAlign: 'center' } }, '\uD83D\uDDFA\uFE0F My Cultural Map'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 } },
                HERITAGE_SECTIONS.map(function(sec) {
                  var val = heritageData[sec.id] || '';
                  var filled = val.trim().length > 0;
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: sec.id, style: { padding: 12, borderRadius: 10, background: filled ? '#0f172a' : '#0f172a55', border: '1px solid ' + (filled ? ACCENT_MED : '#33415555'), textAlign: 'center', opacity: filled ? 1 : 0.4 } },
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 24 } }, sec.icon),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, fontWeight: 600, color: filled ? '#f1f5f9' : '#64748b', marginTop: 4 } }, sec.label),
                    filled && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 10, color: '#94a3b8', marginTop: 4, lineHeight: 1.4, maxHeight: 42, overflow: 'hidden', textOverflow: 'ellipsis' } }, val.slice(0, 80) + (val.length > 80 ? '...' : ''))
                  );
                })
              )
            ),
            // Export button
            hFilled >= 2 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Export button',
                onClick: function() {
                  var lines = ['=== MY CULTURAL HERITAGE PROJECT ===', ''];
                  HERITAGE_SECTIONS.forEach(function(sec) {
                    var val = heritageData[sec.id] || '';
                    if (val.trim()) {
                      lines.push(sec.icon + ' ' + sec.label.toUpperCase());
                      lines.push(val.trim());
                      lines.push('');
                    }
                  });
                  lines.push('---');
                  lines.push('Created with AlloFlow Community & Culture Tool');
                  var text = lines.join('\n');
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(text);
                      addToast('\uD83D\uDCCB Heritage project copied to clipboard!', 'success');
                    } else {
                      var ta = document.createElement('textarea');
                      ta.value = text;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      addToast('\uD83D\uDCCB Heritage project copied to clipboard!', 'success');
                    }
                  } catch(e) { addToast('Could not copy. Try again.', 'error'); }
                  if (soundEnabled) sfxCorrect();
                  awardXP(10);
                },
                style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
              }, '\uD83D\uDCCB Export as Text (Copy)')
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Intercultural Communication Tips ──
        // ══════════════════════════════════════════════════════════
        var commtipsContent = null;
        if (activeTab === 'commtips') {
          var tipItems = INTERCULTURAL_TIPS[band] || INTERCULTURAL_TIPS.elementary;
          var tipsReadCount = 0;
          tipItems.forEach(function(t) { if (icRead[t.id]) tipsReadCount++; });

          commtipsContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDF10 Intercultural Communication'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 } },
              band === 'elementary' ? 'Tips for being a great communicator with people from all backgrounds!' :
              band === 'middle' ? 'Build skills for respectful, thoughtful communication across cultural differences.' :
              'Develop advanced intercultural communication skills grounded in humility and critical self-awareness.'
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center', marginBottom: 16, fontSize: 12, color: '#64748b' } },
              tipsReadCount + ' of ' + tipItems.length + ' tips explored'
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
              tipItems.map(function(tip) {
                var isRead = !!icRead[tip.id];
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: tip.id,
                  onClick: function() {
                    if (!isRead) {
                      var newRead = Object.assign({}, icRead);
                      newRead[tip.id] = true;
                      upd({ icRead: newRead });
                      if (soundEnabled) sfxDiscover();
                      awardXP(5);
                      logPractice('commtip', tip.id);
                      checkBadges();
                    }
                  },
                  style: { padding: 16, borderRadius: 14, background: isRead ? '#1e293b' : '#0f172a', border: '1px solid ' + (isRead ? ACCENT_MED : '#334155'), cursor: isRead ? 'default' : 'pointer', transition: 'all 0.2s' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                    h('span', { style: { fontSize: 22 } }, tip.icon),
                    h('span', { style: { fontSize: 14, fontWeight: 600, color: isRead ? ACCENT : '#f1f5f9' } }, tip.tip),
                    isRead && h('span', { style: { marginLeft: 'auto', fontSize: 12, color: ACCENT } }, '\u2713')
                  ),
                  h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 } }, tip.detail),
                  !isRead && h('div', { style: { marginTop: 8, fontSize: 10, color: '#64748b', fontStyle: 'italic' } }, 'Tap to mark as read')
                );
              })
            ),
            // Completion message
            tipsReadCount >= tipItems.length && h('div', { style: { textAlign: 'center', marginTop: 20, padding: 16, borderRadius: 12, background: ACCENT_DIM, border: '1px solid ' + ACCENT_MED } },
              h('div', { style: { fontSize: 32, marginBottom: 6 } }, '\uD83C\uDF10'),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: ACCENT } }, 'Cross-Cultural Communicator!'),
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'You\u2019ve explored all the intercultural communication tips for your grade level.')
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Battle Questions ──
        // Quick true/false & multiple choice for rapid XP
        // ══════════════════════════════════════════════════════════
        var battleContent = null;
        if (activeTab === 'battle') {
          var battleItems = BATTLE_QUESTIONS[band] || BATTLE_QUESTIONS.elementary;
          var currentB = battleItems[battleIdx % battleItems.length];
          var bKey = band + '_b_' + (battleIdx % battleItems.length);
          var isBAnswered = !!battleAnswered[bKey];

          battleContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 6, color: '#f1f5f9', fontSize: 18 } }, '\u2694\uFE0F Battle Questions'),
            h('p', { style: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 6 } },
              'Quick-fire questions! Answer fast and earn XP.'
            ),
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, fontSize: 12 } },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: '#ec4899', fontWeight: 600 } }, '\u2694\uFE0F Score: ' + battleScore + '/' + battleItems.length),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: '#f59e0b', fontWeight: 600 } }, '\u2B50 Best: ' + battleBest + '/' + battleItems.length)
            ),
            !battleFinished ? h('div', null,
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 20, borderRadius: 16, background: '#1e293b', border: '1px solid #ec489944', marginBottom: 16 } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, color: '#64748b', marginBottom: 8 } }, 'Question ' + ((battleIdx % battleItems.length) + 1) + ' of ' + battleItems.length),
                h('p', { style: { fontSize: 14, color: '#f1f5f9', fontWeight: 600, lineHeight: 1.5, marginBottom: 16 } }, currentB.q),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexDirection: currentB.options.length <= 2 ? 'row' : 'column', gap: 8 } },
                  currentB.options.map(function(opt) {
                    var isCorrect = opt === currentB.a;
                    var wasChosen = battleAnswered[bKey] === opt;
                    var showResult = isBAnswered;
                    return h('button', { 'aria-label': 'Select answer',
                      key: opt,
                      onClick: function() {
                        if (isBAnswered) return;
                        var newBAnswered = Object.assign({}, battleAnswered);
                        newBAnswered[bKey] = opt;
                        var newBScore = battleScore + (isCorrect ? 1 : 0);
                        upd({ battleAnswered: newBAnswered, battleScore: newBScore });
                        if (soundEnabled) { if (isCorrect) sfxCorrect(); else sfxWrong(); }
                        if (isCorrect) awardXP(8);
                        logPractice('battle', bKey);
                        var bAnsweredCount = Object.keys(newBAnswered).length;
                        if (bAnsweredCount >= battleItems.length) {
                          var bBest = newBScore > battleBest ? newBScore : battleBest;
                          upd({ battleFinished: true, battleBest: bBest });
                          if (newBScore >= 4) {
                            addToast('\u2694\uFE0F Battle Victor! ' + newBScore + '/' + battleItems.length + ' correct!', 'success');
                            if (soundEnabled) sfxBadge();
                          } else {
                            addToast('Battle complete! ' + newBScore + '/' + battleItems.length, 'info');
                          }
                        }
                        checkBadges();
                      },
                      style: {
                        flex: currentB.options.length <= 2 ? 1 : 'none', padding: '12px 14px', borderRadius: 10, textAlign: 'center', fontSize: 13, cursor: isBAnswered ? 'default' : 'pointer',
                        border: '1px solid ' + (showResult && isCorrect ? '#22c55e' : showResult && wasChosen && !isCorrect ? '#ef4444' : '#ec489944'),
                        background: showResult && isCorrect ? '#22c55e11' : showResult && wasChosen && !isCorrect ? '#ef444411' : '#0f172a',
                        color: showResult && isCorrect ? '#22c55e' : showResult && wasChosen && !isCorrect ? '#ef4444' : '#e2e8f0',
                        fontWeight: showResult && (isCorrect || wasChosen) ? 600 : 400,
                        opacity: showResult && !isCorrect && !wasChosen ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }
                    }, opt + (showResult && isCorrect ? ' \u2713' : '') + (showResult && wasChosen && !isCorrect ? ' \u2717' : ''));
                  })
                )
              ),
              isBAnswered && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'center' } },
                h('button', { 'aria-label': 'Next',
                  onClick: function() {
                    var nextBIdx = battleIdx + 1;
                    upd({ battleIdx: nextBIdx });
                    if (soundEnabled) sfxClick();
                  },
                  style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ec4899', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
                }, (battleIdx % battleItems.length) + 1 >= battleItems.length ? 'See Results' : 'Next \u2192')
              )
            ) : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { textAlign: 'center', padding: 30, borderRadius: 16, background: '#1e293b', border: '1px solid #ec489944' } },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 48, marginBottom: 12 } }, battleScore >= 4 ? '\u2694\uFE0F' : '\uD83D\uDCA1'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, 'Battle Complete!'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 16, color: '#ec4899', fontWeight: 600, marginBottom: 4 } }, 'Score: ' + battleScore + ' / ' + battleItems.length),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 13, color: '#94a3b8', marginBottom: 16 } }, battleScore >= 4 ? 'Battle Victor! Impressive quick thinking!' : 'Keep training! Try again to improve your score.'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#f59e0b', marginBottom: 16 } }, '\u2B50 Personal Best: ' + battleBest + '/' + battleItems.length),
              h('button', { 'aria-label': 'Battle Again',
                onClick: function() {
                  upd({ battleIdx: 0, battleScore: 0, battleAnswered: {}, battleFinished: false });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: '#ec4899', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
              }, '\uD83D\uDD04 Battle Again')
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
          var heritageDone = 0;
          HERITAGE_SECTIONS.forEach(function(sec) { if (heritageData[sec.id] && heritageData[sec.id].trim().length > 0) heritageDone++; });
          var tipsRead = 0;
          var tipList = INTERCULTURAL_TIPS[band] || INTERCULTURAL_TIPS.elementary;
          tipList.forEach(function(t) { if (icRead[t.id]) tipsRead++; });
          var maCount = Object.keys(maReviewed).length;
          var totalActs = exploredCount + scCompleted + idFilled + learnCount + quizBest + battleBest + Object.keys(allyActions).length + Object.keys(pwAnswers).length + maCount + heritageDone + tipsRead;

          var stats = [
            { label: 'Topics Explored', value: exploredCount, icon: '\uD83C\uDF0D', color: '#06b6d4' },
            { label: 'Scenarios Done', value: scCompleted, icon: '\uD83C\uDFAD', color: '#8b5cf6' },
            { label: 'Identity Areas', value: idFilled + '/8', icon: '\uD83E\uDDE9', color: '#f59e0b' },
            { label: 'New Things Learned', value: learnCount, icon: '\uD83D\uDCA1', color: '#22c55e' },
            { label: 'Top Ratings', value: scTopRatings, icon: '\u2B50', color: '#ec4899' },
            { label: 'Quiz Best', value: quizBest + '/' + (CULTURE_QUIZ[band] || CULTURE_QUIZ.elementary).length, icon: '\uD83C\uDFC6', color: '#a855f7' },
            { label: 'Battle Best', value: battleBest + '/' + (BATTLE_QUESTIONS[band] || BATTLE_QUESTIONS.elementary).length, icon: '\u2694\uFE0F', color: '#f43f5e' },
            { label: 'Ally Actions', value: Object.keys(allyActions).length, icon: '\uD83E\uDD1D', color: '#14b8a6' },
            { label: 'Heritage Sections', value: heritageDone + '/6', icon: '\uD83C\uDFDB\uFE0F', color: '#d946ef' },
            { label: 'Communication Tips', value: tipsRead + '/' + tipList.length, icon: '\uD83C\uDF10', color: '#0ea5e9' }
          ];
          if (band !== 'elementary') {
            stats.push({ label: 'Microaggressions', value: maCount + '/8', icon: '\uD83D\uDD0D', color: '#fb923c' });
            stats.push({ label: 'Privilege Walk', value: Object.keys(pwAnswers).length + '/15', icon: '\uD83D\uDCA1', color: '#facc15' });
          }

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
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 20 } },
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
                callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: ACCENT, fontSize: 10, cursor: 'pointer', display: 'block' } }, '\uD83D\uDD0A Read aloud') : null
              ),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', {
                  type: 'text', value: aiPrompt,
                  'aria-label': 'Ask the community AI coach',
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
                  style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#e2e8f0', fontSize: 12 }
                }),
                h('button', { 'aria-label': 'wait',
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
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 } },
                (band === 'elementary' ? ['What is Diwali?', 'Why do people speak different languages?', 'How can I be a good friend to everyone?', 'Why is my name important?'] :
                 band === 'middle' ? ['What is a microaggression?', 'How do I be a better ally?', 'What is code-switching?', 'How do stereotypes form?'] :
                 ['What is intersectionality?', 'How does systemic bias work?', 'What is cultural humility?', 'How can I take action for equity?']).map(function(q) {
                  return h('button', { 'aria-label': 'div',
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
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, b.desc)
                );
              })
            ),
            // Practice log
            practiceLog.length > 0 && h('div', null,
              h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Activity'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                practiceLog.slice(-8).reverse().map(function(entry, i) {
                  var icons = { explore: '\uD83C\uDF0D', learn: '\uD83D\uDCA1', identity: '\uD83E\uDDE9', scenario: '\uD83C\uDFAD', superpower: '\u26A1', ai_coach: '\u2728', quiz: '\uD83C\uDFC6', battle: '\u2694\uFE0F', ally_action: '\uD83E\uDD1D', privilege_walk: '\uD83D\uDCA1', privilege_reflection: '\uD83D\uDCA1', microagg: '\uD83D\uDD0D', heritage: '\uD83C\uDFDB\uFE0F', commtip: '\uD83C\uDF10' };
                  var labels = { explore: 'Explored Topic', learn: 'Learned Something New', identity: 'Identity Reflection', scenario: 'Cultural Scenario', superpower: 'Superpower Reflection', ai_coach: 'AI Coach', quiz: 'Culture Quiz', battle: 'Battle Question', ally_action: 'Allyship Action', privilege_walk: 'Privilege Walk', privilege_reflection: 'Privilege Reflection', microagg: 'Microaggression Review', heritage: 'Heritage Section', commtip: 'Communication Tip' };
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
        var content = exploreContent || identityContent || scenariosContent || privilegeContent || microaggContent || heritageContent || commtipsContent || quizContent || battleContent || badgesContent;

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
