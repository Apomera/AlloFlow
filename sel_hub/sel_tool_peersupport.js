// ═══════════════════════════════════════════════════════════════
// sel_tool_peersupport.js — Peer Support Coach Plugin (v1.0)
// Teaches MI-adjacent conversational support skills (OARS):
//   Open questions, Affirmations, Reflections, Summaries
// Two-tier: static skill practice (no AI) + AI roleplay (with AI)
// CRITICAL: Includes safety boundary training — when to get an adult
// Evidence base: Teen MHFA, Sources of Strength, MI in Schools
// Registered tool ID: "peersupport"
// Category: relationship-skills
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── WCAG: Live region ──
  (function() {
    if (document.getElementById('allo-live-peersupport')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-peersupport';
    lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function announceToSR(msg) { var el = document.getElementById('allo-live-peersupport'); if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); } }

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return _audioCtx; }
  function playTone(f,d,t,v) { var ac = getAudioCtx(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.1,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.15)); } catch(e) {} }
  function sfxCorrect() { playTone(523,0.1,'sine',0.08); setTimeout(function(){playTone(659,0.1,'sine',0.08);},80); setTimeout(function(){playTone(784,0.15,'sine',0.1);},160); }
  function sfxAlert() { playTone(880,0.15,'sine',0.1); setTimeout(function(){playTone(880,0.15,'sine',0.1);},200); }

  // ═══════════════════════════════════════════════════════════════
  // OARS SKILL DEFINITIONS
  // ═══════════════════════════════════════════════════════════════

  var OARS = [
    { id: 'open', label: 'Open Questions', icon: '❓', color: '#3b82f6',
      what: 'Questions that can\'t be answered with just "yes" or "no" — they invite someone to share more.',
      examples: ['"What\'s been on your mind?"', '"How are you feeling about that?"', '"Tell me more about what happened."'],
      contrast: [{ open: 'What was that like for you?', closed: 'Was that bad?' }, { open: 'How are you feeling about the test?', closed: 'Are you nervous?' }, { open: 'What do you think you could try?', closed: 'Have you tried studying more?' }]
    },
    { id: 'affirm', label: 'Affirmations', icon: '⭐', color: '#f59e0b',
      what: 'Recognizing someone\'s strengths, effort, or courage — not empty praise, but genuine recognition of what they\'re doing right.',
      examples: ['"It took courage to tell me that."', '"You\'ve been working really hard on this."', '"I can see you care about doing the right thing."'],
      contrast: [{ good: 'It takes guts to talk about this.', weak: 'Don\'t worry, it\'ll be fine.' }, { good: 'You\'ve been putting in real effort — that matters.', weak: 'You\'re so smart, you\'ll figure it out.' }]
    },
    { id: 'reflect', label: 'Reflections', icon: '🪞', color: '#8b5cf6',
      what: 'Saying back what you heard in your own words — this shows you\'re really listening and helps the other person feel understood.',
      examples: ['"It sounds like you\'re feeling stuck."', '"So what you\'re saying is..."', '"You seem really frustrated about this."'],
      contrast: [{ reflection: 'It sounds like you\'re torn between two things.', advice: 'You should just pick one.' }, { reflection: 'You seem really hurt by what they said.', advice: 'Just ignore them.' }]
    },
    { id: 'summarize', label: 'Summaries', icon: '📋', color: '#10b981',
      what: 'Pulling together what someone has shared — this helps them hear their own story and feel heard.',
      examples: ['"Let me make sure I understand — you\'re dealing with..."', '"So overall, it sounds like..."', '"You\'ve told me about X, Y, and Z — is there anything I\'m missing?"'],
      contrast: []
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SAFETY BOUNDARIES — When to get an adult
  // ═══════════════════════════════════════════════════════════════

  var SAFETY_SIGNALS = [
    { id: 'self-harm', label: 'Hurting themselves', icon: '🚨', examples: ['I don\'t want to be alive anymore.', 'I\'ve been cutting myself.', 'Nobody would miss me if I was gone.', 'I have a plan to end things.'] },
    { id: 'harmed', label: 'Being harmed by someone', icon: '🛡️', examples: ['My parent hits me when they\'re drunk.', 'Someone at school won\'t stop touching me.', 'I\'m scared to go home.', 'An older kid makes me do things I don\'t want to.'] },
    { id: 'harm-others', label: 'Planning to hurt someone', icon: '⚠️', examples: ['I want to hurt them so bad.', 'I brought something to school to scare them.', 'I\'m going to make them pay.'] },
    { id: 'substance', label: 'Substance crisis', icon: '💊', examples: ['I took a bunch of pills.', 'I can\'t stop drinking and I\'m scared.', 'Someone gave me something and I feel really weird.'] },
  ];

  var SAFETY_RESPONSE_STEPS = [
    { step: 1, label: 'Stay calm', desc: 'Don\'t panic. Your friend needs you to be steady.' },
    { step: 2, label: 'Listen & believe', desc: 'Say "I believe you" and "Thank you for telling me."' },
    { step: 3, label: 'Don\'t promise secrecy', desc: 'Say "I care about you too much to keep this secret."' },
    { step: 4, label: 'Tell a trusted adult', desc: 'A teacher, counselor, parent, coach — someone who can help.' },
    { step: 5, label: 'Stay with them', desc: 'Don\'t leave them alone. Go together if possible.' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // STATIC SCENARIOS — Tier 1
  // ═══════════════════════════════════════════════════════════════

  var PRACTICE_SCENARIOS = {
    elementary: {
      open_vs_closed: [
        { situation: 'Your friend seems sad at lunch.', closed: 'Are you sad?', open: 'What\'s going on? You seem different today.', explain: 'Open questions invite them to share their story, not just say "yes."' },
        { situation: 'A classmate isn\'t joining the group activity.', closed: 'Don\'t you want to play?', open: 'What would make this more fun for you?', explain: 'Asking "what would help" gives them control, instead of pressuring them to join.' },
        { situation: 'Your friend failed a spelling test.', closed: 'Are you upset?', open: 'How are you feeling about the test?', explain: 'This lets them name their own feelings instead of you guessing.' },
      ],
      reflect_vs_advise: [
        { situation: 'Your friend says "Nobody likes me."', advice: 'That\'s not true! Lots of people like you!', reflection: 'It sounds like you\'re feeling really lonely right now.', explain: 'Telling someone their feelings are "wrong" doesn\'t help. Naming the feeling shows you hear them.' },
        { situation: 'A classmate says "This math is impossible!"', advice: 'Just try harder!', reflection: 'Math is really frustrating you today, huh?', explain: '"Try harder" feels dismissive. Reflecting their frustration makes them feel understood.' },
      ],
      safety: [
        { situation: 'Your friend whispers "I don\'t want to go home. My mom\'s boyfriend scares me."', options: [
          { text: 'That sounds scary. Let\'s go talk to our teacher right now — they can help.', rating: 'great', feedback: 'Perfect. You believed them, stayed calm, and got an adult involved immediately. This is exactly right.' },
          { text: 'Just avoid him. Stay in your room.', rating: 'poor', feedback: 'This puts the responsibility on your friend to manage an adult\'s dangerous behavior. They need adult help — this isn\'t something a kid should handle alone.' },
          { text: 'I promise I won\'t tell anyone.', rating: 'poor', feedback: 'NEVER promise secrecy when someone might be in danger. You can say "I care about you too much to keep this secret" and get adult help.' },
        ]},
        { situation: 'A classmate shows you marks on their arm and says "I did this to myself."', options: [
          { text: 'I\'m really glad you told me. This is too important to keep between us — let\'s go find Mrs. Johnson right now.', rating: 'great', feedback: 'Exactly right. You thanked them for trusting you, didn\'t panic, and immediately involved a trusted adult. You are being a real friend.' },
          { text: 'Why would you do that?! That\'s crazy!', rating: 'poor', feedback: 'Reacting with shock or judgment makes them regret telling you. Stay calm, show you care, and get help.' },
          { text: 'I\'ll keep your secret. I pinky promise.', rating: 'poor', feedback: 'When someone is hurting themselves, keeping the secret could cost their life. A real friend gets help even when it\'s hard.' },
        ]},
      ],
    },
    middle: {
      open_vs_closed: [
        { situation: 'Your friend has been skipping activities they used to enjoy.', closed: 'Are you depressed?', open: 'I\'ve noticed you haven\'t been coming to practice. What\'s been going on with you?', explain: 'Diagnosing someone ("Are you depressed?") puts them on the defensive. Observing and asking opens the door.' },
        { situation: 'A friend is stressed about their parents fighting.', closed: 'Are your parents getting divorced?', open: 'That sounds really stressful. How are you handling everything at home?', explain: 'Jumping to worst-case scenarios adds fear. Asking how they\'re handling it focuses on THEM, not the situation.' },
      ],
      reflect_vs_advise: [
        { situation: 'Your friend says "I can\'t stop scrolling my phone at night and I\'m always tired."', advice: 'Just put your phone in another room.', reflection: 'It sounds like you know the phone is affecting your sleep but it\'s hard to stop.', explain: 'They already know what they "should" do. Reflecting their struggle validates that it\'s hard, which builds trust.' },
        { situation: 'A friend says "My parents expect me to be perfect and I\'m cracking."', advice: 'Just tell them how you feel.', reflection: 'You\'re carrying a lot of pressure to meet their expectations, and it\'s wearing you down.', explain: '"Just tell them" oversimplifies a complex family dynamic. The reflection shows you understand the weight they\'re carrying.' },
      ],
      safety: [
        { situation: 'Your friend texts you at midnight: "I wrote goodbye letters to everyone. You were the best friend I ever had."', options: [
          { text: 'Stay on the phone with them. Tell a parent or call 988 immediately. Do not leave them alone.', rating: 'great', feedback: 'This is a life-or-death situation. You recognized the warning signs (goodbye letters) and took immediate action. Call 988 (Suicide & Crisis Lifeline), tell any available adult, and stay connected until help arrives.' },
          { text: 'Text back "Don\'t say that! Think positive!"', rating: 'poor', feedback: 'Toxic positivity doesn\'t save lives. This is a crisis signal — goodbye letters are a red flag for imminent danger. You need to get adult help NOW, not send encouraging texts.' },
          { text: 'They\'re probably just being dramatic. Go back to sleep.', rating: 'poor', feedback: 'NEVER dismiss a suicide warning sign. Even if you think they\'re exaggerating, the cost of being wrong is someone\'s life. Always take it seriously and get help.' },
        ]},
      ],
    },
    high: {
      open_vs_closed: [
        { situation: 'A friend confides they\'ve been binge drinking on weekends.', closed: 'Do you think you have a problem?', open: 'What role is drinking playing in your life right now?', explain: 'Asking "do you have a problem" triggers defensiveness. Asking about the role it plays invites honest self-reflection — a core MI technique.' },
      ],
      reflect_vs_advise: [
        { situation: 'A friend says "I cheated on the exam and I feel terrible, but I can\'t tell anyone because I\'ll lose my scholarship."', advice: 'You need to come clean. Honesty is the best policy.', reflection: 'You\'re caught between your integrity and something really important to your future. That\'s an incredibly hard place to be.', explain: 'Moralizing ("honesty is the best policy") shuts down the conversation. The reflection honors the genuine difficulty of their situation and keeps them talking.' },
      ],
      safety: [
        { situation: 'At a party, a friend pulls you aside and says "I took something and my heart is racing really fast. I\'m scared."', options: [
          { text: 'Stay with them. Call 911 immediately. Don\'t worry about getting in trouble — their life matters more.', rating: 'great', feedback: 'Exactly right. Medical emergency overrides everything. Most states have Good Samaritan laws protecting people who call for help during overdoses. Their life is worth more than anyone\'s reputation.' },
          { text: 'Just drink some water and lie down. You\'ll be fine.', rating: 'poor', feedback: 'You are not a doctor. A racing heart after taking an unknown substance could be a medical emergency. Never guess — call 911.' },
          { text: 'We can\'t call anyone or we\'ll all get in trouble.', rating: 'poor', feedback: 'Someone could die while you worry about consequences. Good Samaritan laws exist for this exact reason. ALWAYS prioritize life over consequences.' },
        ]},
      ],
    },
  };

  // AI Roleplay scenarios
  var AI_SUPPORT_SCENARIOS = {
    elementary: [
      { id: 'lonely', title: 'The Lonely Friend', setup: 'Your friend hasn\'t been talking to anyone at recess for the past week.', peerName: 'Maya', peerDesc: 'a quiet student who feels like nobody wants to be their friend, but is afraid to say it', skill: 'open', goal: 'Use OARS skills to find out what\'s bothering Maya and help her feel heard.' },
      { id: 'bully', title: 'The Silent Struggle', setup: 'You notice your friend flinches when a certain older student walks by.', peerName: 'Diego', peerDesc: 'a student who is being bullied but is ashamed to admit it, scared of retaliation', skill: 'reflect', goal: 'Help Diego feel safe enough to share what\'s happening. If it\'s serious, encourage getting adult help.', hasSafetyTrigger: true },
    ],
    middle: [
      { id: 'grades', title: 'Falling Behind', setup: 'Your friend\'s grades have dropped and they seem like they\'ve given up.', peerName: 'Jordan', peerDesc: 'a smart student who has lost motivation because they feel overwhelmed and believe they\'re too far behind to catch up', skill: 'affirm', goal: 'Use OARS to understand why Jordan has given up and help them see their own strengths.' },
      { id: 'family', title: 'The Secret', setup: 'Your friend pulls you aside and seems like they want to tell you something heavy.', peerName: 'Avery', peerDesc: 'a student dealing with a difficult situation at home — might reveal something that requires adult intervention', skill: 'reflect', goal: 'Listen with OARS skills. If Avery reveals something dangerous, recognize when to involve a trusted adult.', hasSafetyTrigger: true },
    ],
    high: [
      { id: 'identity', title: 'The Crossroads', setup: 'A close friend is struggling with a major life decision and everyone is giving them different advice.', peerName: 'Kai', peerDesc: 'a thoughtful student overwhelmed by conflicting expectations from family, friends, and their own desires — feeling pressured to be someone they\'re not', skill: 'summarize', goal: 'Use OARS to help Kai hear their own voice amidst all the noise. Don\'t give advice — help them find their own answer.' },
      { id: 'crisis', title: 'The Warning Signs', setup: 'A friend has been isolating, giving away belongings, and sent you a text saying "Thanks for being a good friend. Remember that."', peerName: 'River', peerDesc: 'a student showing warning signs of suicidal ideation — withdrawn, giving away possessions, saying goodbye-like statements', skill: 'safety', goal: 'Recognize the warning signs. Use OARS to keep them talking, but your primary job is to get adult help immediately.', hasSafetyTrigger: true },
    ],
  };

  // ═══════════════════════════════════════════════════════════════
  // SCRIPTED PRACTICE CONVERSATIONS (no AI, 2026-11-04)
  // One branching script per chosen AI_SUPPORT_SCENARIOS id, in the shared
  // AdventureOffline story format, played with AlloModules.AdventureOffline.Player
  // (built-in fallback for older hosts). Braided: branches rejoin. Endings close
  // with a "What worked" debrief on OARS listening and when to get an adult.
  // Safety scripts: no path keeps a secret about someone being unsafe; every
  // ending in them involves a trusted adult.
  // Rows: [id, text, [[choice label, to], ...]]; a row with no choices is an ending.
  // ═══════════════════════════════════════════════════════════════
  function _psScript(title, rows) {
    return { version: 1, title: title, start: rows[0][0], scenes: rows.map(function(r) {
      return r[2]
        ? { id: r[0], text: r[1], ending: false, choices: r[2].map(function(c) { return { label: c[0], to: c[1] }; }) }
        : { id: r[0], text: r[1], ending: true, choices: [] };
    }) };
  }
  var PS_SCRIPTS = {
    lonely: _psScript('The Lonely Friend', [
      ['start', "Your friend Maya hasn't played with anyone at recess all week. Today she's sitting alone on the steps, picking at her shoelace.", [
        ["Sit down next to her: 'Hi, Maya. You seem kind of sad this week. What's going on?'", 'open'],
        ["'Cheer up! Come play tag!'", 'cheer'],
        ["'Are you okay?'", 'closed']]],
      ['cheer', "Maya shakes her head. 'No thanks.' She looks back down at her shoe.", [
        ["Sit down next to her: 'It's okay not to play. Want to tell me how you're feeling?'", 'open'],
        ['Shrug and run off to play.', 'end_missed']]],
      ['closed', "'Yeah, I'm fine,' Maya says quickly. But she doesn't look fine.", [
        ["'You don't have to be fine. I'm here if you want to talk.'", 'open'],
        ["'Okay, cool.' Go play.", 'end_missed']]],
      ['open', "Maya is quiet for a moment. 'Everyone has a best friend except me. I feel like nobody wants me around.'", [
        ["'You feel left out, like nobody wants you around. That sounds really lonely.'", 'reflect'],
        ["'That's not true! Lots of people like you!'", 'fix']]],
      ['fix', "Maya frowns. 'You're just saying that.' She pulls her knees up and looks away.", [
        ["'Sorry. Tell me more about what it's been like.'", 'reflect'],
        ["'Well, you should just go ask someone to play.'", 'end_partial']]],
      ['reflect', "Maya nods. 'Yeah. Really lonely.' She looks at you. 'Thanks for sitting with me.'", [
        ["'I like sitting with you. You're really good at drawing, and you're kind.'", 'affirm'],
        ["'Sure! So, want to play tag now?'", 'end_partial']]],
      ['affirm', "Maya smiles a little. 'Really?' You talk for a while. Maya says she's been feeling sad for a long time, not just at recess.", [
        ["'That sounds hard. Could we tell Ms. Lopez together? She helps kids with stuff like this.'", 'end_friend'],
        ["'You'll feel better soon.'", 'end_partial']]],
      ['end_friend', "You and Maya tell Ms. Lopez together that Maya has been feeling sad and lonely for a long time. Ms. Lopez thanks you both and makes a plan to check in with Maya. Tomorrow, Maya sits with you at lunch.\n\nWhat worked:\n• An open question ('What's going on?') let Maya share.\n• You said back what you heard (a reflection) instead of trying to fix it.\n• You told Maya something true and kind about herself (an affirmation).\n• When sad feelings last a long time, a trusted grown-up should know. Telling one together is being a good friend."],
      ['end_partial', "Maya says 'maybe,' but she still looks sad. She felt a little less alone for a minute, but she didn't get to say everything she was feeling.\n\nWhat worked:\n• Sitting with Maya and asking was kind.\n• Advice ('just go ask someone') can feel like 'stop talking.' Try saying back what you heard instead.\n• If a friend feels sad for a long time, help them tell a trusted grown-up."],
      ['end_missed', "You play tag. When you look back, Maya is still alone on the steps. Tomorrow you could try again.\n\nWhat worked:\n• You noticed Maya was having a hard time. Noticing matters.\n• Questions that start with 'what' or 'how' help people open up more than 'Are you okay?'\n• Sometimes just sitting with someone is the best start."]
    ]),
    bully: _psScript('The Silent Struggle', [
      ['start', "Your friend Diego flinches every time a certain older kid walks by. Today at the water fountain, Diego jumps when the older kid passes, then stares at the floor.", [
        ["'Hey Diego, I noticed you seem scared when that kid walks by. What's going on?'", 'open'],
        ["'Why are you so jumpy? It's weird.'", 'judge'],
        ["Pretend you didn't notice.", 'ignore']]],
      ['judge', "Diego's face turns red. 'I'm not jumpy,' he snaps, and walks away fast.", [
        ["Catch up: 'Sorry, that came out wrong. I'm worried about you. You can tell me.'", 'open'],
        ['Let him go.', 'ignore']]],
      ['ignore', "The next day, Diego's backpack is ripped, and his eyes look red. He's sitting alone at lunch.", [
        ["Sit with him: 'Diego, what happened? I'm on your side.'", 'open'],
        ["Tell your teacher, Mr. Kim, that you're worried about Diego.", 'end_told']]],
      ['open', "Diego looks around to make sure nobody is listening. 'That kid pushes me at the bus stop and takes my snack money. He said if I tell, it'll get worse. Please don't tell anyone.'", [
        ["'That sounds really scary. Thank you for telling me. This is too big for us to keep secret. Let's tell a grown-up together.'", 'end_safe'],
        ["'Okay, I promise I won't tell.'", 'promise'],
        ["'Just push him back next time.'", 'fight']]],
      ['fight', "Diego shakes his head. 'He's way bigger. I'd get hurt.' He looks even more scared now.", [
        ["'You're right. That's not safe. Let's tell a grown-up who can stop it.'", 'end_safe'],
        ["'Then I'll keep your secret.'", 'promise']]],
      ['promise', "That night, you keep thinking about Diego getting pushed. Keeping it secret means it could keep happening. Some secrets are fine to keep, like a surprise party. A secret about someone getting hurt is not one of them.", [
        ["The next morning: 'Diego, I care about you too much to keep this secret. Let's tell Mr. Kim together.'", 'end_safe'],
        ['Tell Mr. Kim on your own.', 'end_told']]],
      ['end_safe', "Diego's voice shakes. 'What if it gets worse?' You tell him that grown-ups know how to keep kids safe, and that you'll stay with him. Together you tell your teacher, Mr. Kim. Mr. Kim thanks you both, talks to the principal, and makes a plan so Diego is safe at the bus stop.\n\nWhat worked:\n• You noticed something was wrong and asked an open question.\n• You listened, and you believed Diego.\n• You knew this was too big for friends to handle alone: someone was getting hurt.\n• Telling a trusted adult is not tattling. It's how you keep a friend safe."],
      ['end_told', "You tell your teacher, Mr. Kim, what you know about Diego. Mr. Kim thanks you, talks with Diego privately, and makes a plan to keep him safe. Diego is surprised at first, but later he says, 'I'm glad someone told.'\n\nWhat worked:\n• Telling a trusted adult when someone is being hurt is always the right call, even if they asked you not to.\n• Some secrets are fine to keep. Secrets about someone being hurt are not.\n• You could also ask your friend to come with you, so they feel part of the plan."]
    ]),
    grades: _psScript('Falling Behind', [
      ['start', "Jordan used to be one of the best students in your math class. Lately, Jordan's been turning in blank homework. Today, Jordan crumples up a quiz with a 42 on it. 'Whatever. I'm done trying.'", [
        ["'What's making you feel done?'", 'open'],
        ["'You just need to study more. Want my notes?'", 'advise'],
        ["'Ha, same. School is pointless.'", 'agree']]],
      ['agree', "Jordan laughs a little, but it doesn't sound happy. 'Yeah.' Jordan shoves the quiz into a bag.", [
        ["'Actually, you seem really frustrated. What's going on?'", 'open'],
        ['Change the subject to the weekend.', 'end_missed']]],
      ['advise', "Jordan shrugs. 'It's not about notes. I'm too far behind. There's no point.'", [
        ["'It sounds like you feel so far behind that catching up seems impossible.'", 'reflect'],
        ["'If you just tried harder, you'd catch up.'", 'end_missed']]],
      ['open', "Jordan sighs. 'I missed a week when my grandma was in the hospital. Now everything is new and I don't get any of it. Every class is like that.'", [
        ["'So missing that week put you behind everywhere, and now it all feels like too much.'", 'reflect'],
        ["'You'll be fine. You're smart.'", 'hollow']]],
      ['hollow', "Jordan rolls their eyes. 'Everyone says that.' Jordan starts to stand up.", [
        ["'Sorry, that was too quick. It sounds like it's been a really rough few weeks.'", 'reflect'],
        ['Let Jordan go.', 'end_missed']]],
      ['reflect', "Jordan sits back down. 'Yeah. Exactly. It's like I'm drowning.'", [
        ["'It takes a lot of strength to handle your grandma being sick and school at the same time. And you still showed up today.'", 'affirm'],
        ["'Have you told Ms. Ortiz?'", 'end_partial']]],
      ['affirm', "Jordan looks surprised. 'I guess I did.' Jordan smooths out the crumpled quiz. 'Maybe I'm not totally hopeless at this.'", [
        ["'So: you got behind for a real reason, it feels like a lot, and you're still here. What's one small thing that might help?'", 'summary'],
        ["'See? Told you you're smart.'", 'end_partial']]],
      ['summary', "Jordan thinks. 'Maybe... I could ask Ms. Ortiz if I can come in for help. I just didn't want her to think I was lazy.'", [
        ["'That sounds like a good plan. Want me to walk with you to her room?'", 'end_plan'],
        ["'Cool. Good luck.'", 'end_partial']]],
      ['end_plan', "You walk with Jordan to Ms. Ortiz's room. She sets up lunch help twice a week and says she's glad Jordan came in. A month later, Jordan's quiz scores are climbing.\n\nWhat worked:\n• Open questions helped Jordan say what was really going on.\n• Reflections showed you understood, so Jordan kept talking.\n• An affirmation named a real strength Jordan couldn't see.\n• A summary helped Jordan find their own next step, and you supported it.\n• If a friend ever says they feel hopeless about themselves or their life, not just school, tell a trusted adult right away."],
      ['end_partial', "Jordan says 'maybe' and puts the quiz away. Jordan felt heard for a moment, but there's no plan yet.\n\nWhat worked:\n• Listening and reflecting helped Jordan open up.\n• Instead of advice, try a summary and an open question: 'What's one small thing that might help?'\n• People are more likely to follow a plan they came up with themselves."],
      ['end_missed', "Jordan goes quiet and leaves. The quiz stays crumpled at the bottom of Jordan's bag.\n\nWhat worked:\n• Noticing a friend is struggling is the first step.\n• Advice and quick reassurance can feel like being brushed off. Open questions ('What's making you feel done?') invite people in.\n• If a friend seems hopeless for a long time, a trusted adult like a teacher or counselor can help."]
    ]),
    family: _psScript('The Secret', [
      ['start', "Avery pulls you aside at lunch. 'Can I tell you something? But you have to promise not to tell anyone.' Avery looks like they haven't slept.", [
        ["'I can't promise that before I know what it is. But I'm here, and I'll listen.'", 'honest'],
        ["'I promise. I won't tell anyone, ever.'", 'promise'],
        ["'Is this going to be drama? I don't want to get involved.'", 'dismiss']]],
      ['dismiss', "Avery's face falls. 'Never mind.' Avery turns to go.", [
        ["'Wait, sorry. I didn't mean it like that. I'm listening.'", 'honest'],
        ['Let Avery go.', 'later']]],
      ['later', "That afternoon, Avery puts their head down in class and doesn't talk to anyone. You can't stop thinking about the look on Avery's face.", [
        ["After class: 'Avery, I'm sorry about lunch. Do you still want to talk?'", 'honest'],
        ["Tell the school counselor, Ms. Rivera, that you're worried about Avery.", 'end_counselor']]],
      ['promise', "Avery takes a breath. 'Things at home are really bad. My mom's boyfriend yells all the time, and last night he threw stuff and broke a door. I'm scared to go home.'", [
        ["'That sounds really scary. I know I promised, but this is too big to keep secret. You deserve to be safe. Let's tell the counselor together.'", 'end_together'],
        ['Keep the promise and say nothing.', 'weight']]],
      ['honest', "Avery hesitates, then talks. 'Things at home are really bad. My mom's boyfriend yells all the time, and last night he threw stuff and broke a door. I'm scared to go home.'", [
        ["'That sounds really scary. Thank you for trusting me. You deserve to be safe at home.'", 'reflect'],
        ["'Maybe it's not that bad. Parents fight sometimes.'", 'minimize']]],
      ['minimize', "Avery shakes their head. 'You don't get it. I'm scared.' Avery's hands are shaking.", [
        ["'You're right. I'm sorry. Being scared to go home is serious.'", 'reflect'],
        ["'Okay. Well, let me know if it gets worse.'", 'weight']]],
      ['reflect', "Avery wipes their eyes. 'I didn't want anyone to know. What if I get in trouble, or it gets worse?'", [
        ["'You're not in trouble. This is what adults are supposed to help with. Can we go to Ms. Rivera, the counselor, together right now?'", 'end_together'],
        ["'I won't tell anyone. It'll be our secret.'", 'weight']]],
      ['weight', "That night, you can't sleep. Avery said they were scared to go home. If something happened and nobody knew... A secret about someone not being safe is one you can't keep, even if you promised.", [
        ["The next morning, find Avery: 'I care about you too much to keep this. Let's go to the counselor together.'", 'end_together'],
        ['Go to the school counselor first thing and tell her.', 'end_counselor']]],
      ['end_together', "You walk with Avery to the office of the school counselor, Ms. Rivera, and stay while Avery talks. Ms. Rivera listens, thanks you both, and explains that she'll help make a plan so Avery is safe. Avery is nervous, but says, 'I feel lighter.'\n\nWhat worked:\n• You were honest that a secret about safety isn't one you can keep.\n• You listened, believed Avery, and named the feeling: scared.\n• You knew when it was too big for friends: someone may not be safe at home.\n• Telling a trusted adult, and going together, is how you look after a friend."],
      ['end_counselor', "You tell the school counselor, Ms. Rivera, what you know. She thanks you, says you did the right thing, and talks with Avery that day. Avery is upset at first, but later says, 'I'm glad you told. I didn't know how.'\n\nWhat worked:\n• A secret about someone being unsafe is never one to keep, even if you promised.\n• Telling a trusted adult is not betraying a friend. It's protecting them.\n• You don't have to fix it yourself. Your job is to get help.\n• If someone is in danger right now, tell an adult right away or call 911."]
    ]),
    identity: _psScript('The Crossroads', [
      ['start', "Kai drops into the seat next to you in the library. 'My parents want me to do pre-med. My coach says I could play in college. My friends say take a gap year. And I honestly don't know what I want.'", [
        ["'That's a lot of voices. What do YOU picture when you think about next year?'", 'open'],
        ["'Do the gap year. That's what I'd do.'", 'advise'],
        ["'At least you have options. Some people don't.'", 'compare']]],
      ['advise', "Kai sighs. 'Great. One more person telling me what to do.' Kai stares at the table.", [
        ["'You're right, sorry. You don't need another opinion. What do you want?'", 'open'],
        ["'I'm just trying to help.'", 'end_closed']]],
      ['compare', "Kai stiffens. 'Yeah, I know. I feel guilty even complaining.' Kai starts to pack up.", [
        ["'Sorry, that came out wrong. It sounds really stressful. Tell me more.'", 'open'],
        ['Let Kai go.', 'end_closed']]],
      ['open', "Kai thinks. 'Honestly? I loved the summer I volunteered at the animal shelter. But nobody asks me about that. It doesn't fit anyone's plan.'", [
        ["'It sounds like you felt most like yourself at the shelter, and it's hard when that doesn't match what people expect.'", 'reflect'],
        ["'So be a vet! Problem solved.'", 'advise2']]],
      ['advise2', "Kai half-laughs. 'Maybe. I don't know. You sound like my parents now.'", [
        ["'Ha, fair. I'll stop. What did you love about the shelter?'", 'reflect'],
        ["'Just saying, it makes sense.'", 'end_partial']]],
      ['reflect', "Kai nods slowly. 'Yeah. I was good at it, too. The staff trusted me with the scared dogs.'", [
        ["'That says a lot about you: you're patient, and people trust you.'", 'affirm'],
        ["'Okay, but what are you going to tell your parents?'", 'end_partial']]],
      ['affirm', "Kai smiles for the first time. 'Huh. I never thought of it that way.'", [
        ["Summarize: 'So everyone has a plan for you, but you feel most like yourself caring for animals, and you're good at it. What do you want to do with that?'", 'end_own'],
        ["'See, you'll figure it out.'", 'end_partial']]],
      ['end_own', "Kai is quiet, then says, 'I want to look at programs with animal science. And maybe talk to my parents about it, with the school counselor there.' Kai found their own answer, not yours.\n\nWhat worked:\n• Open questions helped Kai hear their own voice.\n• Reflections and affirmations showed you were really listening.\n• A summary pulled it together, so Kai could see the pattern.\n• You didn't give advice. Kai found the answer.\n• A counselor is a good next step for big decisions. If a friend ever seems hopeless or unsafe, tell a trusted adult right away."],
      ['end_partial', "Kai says, 'Yeah, maybe,' and the talk ends. Kai felt a bit heard, but the conversation drifted back to what Kai should do.\n\nWhat worked:\n• You asked and listened, and Kai opened up about the shelter.\n• Advice, even good advice, can drown out someone's own voice.\n• Try a summary: 'So what I'm hearing is ___. What do you want to do with that?'"],
      ['end_closed', "Kai leaves. They never got to say what they really think, and the pressure feels the same as before.\n\nWhat worked:\n• Wanting to help is a good instinct.\n• When someone is overwhelmed by advice, one more opinion adds weight. An open question gives space.\n• If a friend under pressure seems hopeless, a counselor or trusted adult can help."]
    ])
  };

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('peersupport', {
    // Named for the Station Builder picker, which reads name || label || id
    // and was falling through to the raw id. Matches the hub card exactly.
    label: 'Peer Support Coach',
    title: 'Peer Support Coach',
    icon: '🤝',
    category: 'relationship-skills',
    description: 'Learn to be a supportive listener using OARS skills — and know when to get adult help',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    standards: ['CASEL: Relationship Skills', 'CASEL: Social Awareness', 'Sources of Strength'],
    ready: true,
    // AI practice conversations have scripted versions that need no AI.
    offlineScripts: PS_SCRIPTS,

    render: function(ctx) {
      // ── Host theme remap (consumes ctx.theme) — canonical SEL light-base pattern ──
      var _peCTheme = (ctx && ctx.theme) || {};
      var _peCHC = !!_peCTheme.isContrast, _peCDark = !_peCHC && !!_peCTheme.isDark;
      var _PEC_DARK = {'#fff':'#1e293b','#ffffff':'#1e293b','#f8fafc':'#0f172a','#f1f5f9':'#1e293b','#fef3c7':'#3a2e12','#fef2f2':'#2e1414','#fee2e2':'#3a1a1a','#f0fdf4':'#0b2e22','#ecfdf5':'#0e3326','#dcfce7':'#14532d','#eff6ff':'#0e1f3a','#dbeafe':'#16315e','#e0e7ff':'#1e2150','#0f172a':'#f1f5f9','#1e293b':'#e2e8f0','#374151':'#cbd5e1','#475569':'#cbd5e1','#94a3b8':'#94a3b8','#9ca3af':'#cbd5e1','#e5e7eb':'#334155','#92400e':'#fde68a','#991b1b':'#fca5a5','#7f1d1d':'#fca5a5','#166534':'#86efac','#065f46':'#6ee7b7','#1e40af':'#93c5fd'};
      var _PEC_HC = {'#fff':'#000000','#ffffff':'#000000','#f8fafc':'#000000','#f1f5f9':'#000000','#fef3c7':'#000000','#fef2f2':'#000000','#fee2e2':'#000000','#f0fdf4':'#000000','#ecfdf5':'#000000','#dcfce7':'#000000','#eff6ff':'#000000','#dbeafe':'#000000','#e0e7ff':'#000000','#0f172a':'#ffff00','#1e293b':'#ffff00','#374151':'#ffff00','#475569':'#ffff00','#94a3b8':'#ffff00','#9ca3af':'#ffff00','#e5e7eb':'#ffff00','#92400e':'#ffff00','#991b1b':'#ffff00','#7f1d1d':'#ffff00','#166534':'#ffff00','#065f46':'#ffff00','#1e40af':'#ffff00'};
      var _peC = function(hex){ return _peCHC ? (_PEC_HC[hex]||hex) : (_peCDark ? (_PEC_DARK[hex]||hex) : hex); };

      // ── Ink: the same hue, readable as TEXT on this tool's dark surface ──
      // _peC serves surfaces AND text from one map, so it cannot lighten
      // an accent for a label without also lightening the chip that accent fills.
      // Consulted only from a `color:` position, so no surface moves; falls back
      // to _peC for any hue not listed.
      var _PE_INK = { '#3b82f6': '#60a5fa', '#8b5cf6': '#a78bfa', '#a855f7': '#c084fc', '#22c55e': '#4ade80', '#ec4899': '#f472b6' };
      var _PE_INK_HC = { '#3b82f6': '#ffff00', '#8b5cf6': '#ffff00', '#a855f7': '#ffff00', '#22c55e': '#ffff00', '#ec4899': '#ffff00' };
      var _peInk = function(hex) {
        if (_peCHC) return _PE_INK_HC[hex] || _peC(hex);
        return _PE_INK[hex] || _peC(hex);
      };
      var h = ctx.React.createElement;
      var useState = ctx.React.useState;
      var useCallback = ctx.React.useCallback;
      var useRef = ctx.React.useRef;

      var gradeBand = ctx.gradeBand || 'elementary';
      var callGemini = ctx.callGemini;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var update = ctx.update;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var toolData = (ctx.toolData && ctx.toolData.peersupport) || {};
      var hasAI = ctx.aiAvailable !== false && (function (fn) { try { if (typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable('text', fn); } catch (_) {} return typeof fn === 'function' && !fn._alloQrBlocked && window.__alloStudentAiDisabled !== true; })(callGemini);

      var _mode = useState('menu'); var mode = _mode[0]; var setMode = _mode[1];
      var _subMode = useState(null); var subMode = _subMode[0]; var setSubMode = _subMode[1];
      var _idx = useState(0); var idx = _idx[0]; var setIdx = _idx[1];
      var _feedback = useState(null); var feedback = _feedback[0]; var setFeedback = _feedback[1];
      var _score = useState(0); var score = _score[0]; var setScore = _score[1];
      var _total = useState(0); var total = _total[0]; var setTotal = _total[1];
      // AI roleplay
      var _aiScenario = useState(null); var aiScenario = _aiScenario[0]; var setAiScenario = _aiScenario[1];
      var _chatHistory = useState([]); var chatHistory = _chatHistory[0]; var setChatHistory = _chatHistory[1];
      var _chatInput = useState(''); var chatInput = _chatInput[0]; var setChatInput = _chatInput[1];
      var _chatLoading = useState(false); var chatLoading = _chatLoading[0]; var setChatLoading = _chatLoading[1];
      var _chatFeedback = useState(null); var chatFeedback = _chatFeedback[0]; var setChatFeedback = _chatFeedback[1];
      var _chatTurns = useState(0); var chatTurns = _chatTurns[0]; var setChatTurns = _chatTurns[1];
      var _rapport = useState(50); var rapport = _rapport[0]; var setRapport = _rapport[1];
      var _peerMood = useState('neutral'); var peerMood = _peerMood[0]; var setPeerMood = _peerMood[1];
      var _oarsUsed = useState({}); var oarsUsed = _oarsUsed[0]; var setOarsUsed = _oarsUsed[1]; // tracks which OARS skills detected
      var _safetyTriggered = useState(false); var safetyTriggered = _safetyTriggered[0]; var setSafetyTriggered = _safetyTriggered[1];
      // Triangulated assessment of the STUDENT supporter's own messages — distinct
      // from `safetyTriggered` (which tracks the AI peer's scripted safety reveal).
      var _userTier = useState(0); var userTier = _userTier[0]; var setUserTier = _userTier[1];
      var chatEndRef = useRef(null);

      var scenarios = PRACTICE_SCENARIOS[gradeBand] || PRACTICE_SCENARIOS.elementary;
      var aiScenarios = AI_SUPPORT_SCENARIOS[gradeBand] || AI_SUPPORT_SCENARIOS.elementary;
      var MOOD_EMOJIS = { happy: '😊', sad: '😢', angry: '😠', nervous: '😰', neutral: '😐', grateful: '🥰', confused: '😕', hurt: '😔', relieved: '😌', guarded: '🛡️', trusting: '🤝', crying: '😭' };

      var PURPLE = '#059669';
      var card = { background: _peC('#fff'), borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '10px' };
      var btn = function(bg, fg, dis) { return { padding: '10px 18px', background: dis ? _peC('#e5e7eb') : bg, color: dis ? _peC('#9ca3af') : fg, border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; };

      // ── AI Chat ──
      var sendChat = useCallback(async function(userMsg) {
        if (!hasAI || !aiScenario || !userMsg.trim()) return;
        var newHistory = chatHistory.concat([{ role: 'user', text: userMsg.trim() }]);
        setChatHistory(newHistory);
        setChatInput('');
        setChatLoading(true);
        setChatTurns(function(t) { return t + 1; });
        try {
          var historyText = newHistory.map(function(m) { return (m.role === 'user' ? 'Student helper' : aiScenario.peerName) + ': ' + m.text; }).join('\n');
          var safetyNote = aiScenario.hasSafetyTrigger
            ? '\n\nIMPORTANT — SAFETY TRIGGER SYSTEM:\nAfter 4-5 exchanges, IF the conversation is going well (rapport > 60), gradually reveal something that requires adult help (matching your character description). Make it realistic — don\'t dump it all at once. The student should have the opportunity to recognize the safety signal and suggest getting an adult. If they do suggest getting help, respond with relief ("I was hoping you\'d say that"). If they don\'t, drop another hint.\n'
            : '';
          var prompt = 'You are ' + aiScenario.peerName + ', ' + aiScenario.peerDesc + '. You are a ' + gradeBand + ' school student who needs support.\n\n'
            + 'Scenario: ' + aiScenario.setup + '\n'
            + 'Current rapport: ' + rapport + '/100\n'
            + safetyNote + '\n'
            + 'Conversation:\n' + historyText + '\n\n'
            + 'Analyze the student\'s last message for OARS skills, then respond in character.\n\n'
            + 'Return JSON:\n'
            + '{"text":"your in-character response (1-2 sentences)","mood":"sad|nervous|neutral|grateful|hurt|relieved|trusting|guarded|crying",'
            + '"rapportChange":-10 to +10,'
            + '"oarsDetected":["open"|"affirm"|"reflect"|"summarize"|null] (which OARS skills the student used in their message),'
            + '"isSafetyMoment":false (set true ONLY if you just revealed something requiring adult help)}\n\n'
            + 'Rules:\n- Stay in character as a struggling peer\n- React authentically — if they use good OARS skills, open up more\n- If they give unsolicited advice, pull back slightly\n- 1-2 sentences max\n- Do NOT coach or break character';
          // Triangulated safety assessment of the STUDENT's own message (in case
          // they start revealing their own distress while practicing supporting
          // the AI peer). Runs in parallel with the chat call.
          var _safetyP = (window.SelHub && window.SelHub.assessSafety)
            ? window.SelHub.assessSafety(userMsg, gradeBand, 'peersupport', callGemini).catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
            : Promise.resolve({ tier: 0, rationale: '', category: 'none' });
          var _both = await Promise.all([callGemini(prompt, true), _safetyP]);
          var result = _both[0];
          var _safety = _both[1] || { tier: 0 };
          if (_safety.tier >= 2 && onSafetyFlag) {
            onSafetyFlag({
              category: 'ai_peersupport_' + (_safety.category || 'concerning'),
              match: _safety.rationale || 'SEL peersupport safety concern',
              severity: _safety.tier >= 3 ? 'critical' : 'medium',
              source: 'sel_peersupport',
              context: userMsg.substring(0, 100),
              timestamp: new Date().toISOString(),
              aiGenerated: true,
              confidence: _safety.tier >= 3 ? 0.9 : 0.7,
              tier: _safety.tier
            });
          }
          setUserTier(_safety.tier || 0);
          if (result) {
            try {
              var parsed = JSON.parse(result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
              setChatHistory(function(prev) { return prev.concat([{ role: 'peer', text: parsed.text || '', mood: parsed.mood }]); });
              if (parsed.mood) setPeerMood(parsed.mood);
              if (parsed.rapportChange) setRapport(function(prev) { return Math.max(0, Math.min(100, prev + parsed.rapportChange)); });
              if (parsed.oarsDetected && Array.isArray(parsed.oarsDetected)) {
                setOarsUsed(function(prev) {
                  var n = Object.assign({}, prev);
                  parsed.oarsDetected.forEach(function(skill) { if (skill) n[skill] = (n[skill] || 0) + 1; });
                  return n;
                });
              }
              if (parsed.isSafetyMoment) {
                setSafetyTriggered(true);
                announceToSR('Safety alert: ' + aiScenario.peerName + ' may need adult help. Consider suggesting a trusted adult.');
              }
            } catch (e) {
              setChatHistory(function(prev) { return prev.concat([{ role: 'peer', text: result.trim() }]); });
            }
          }
        } catch (err) { addToast && addToast('Response failed.', 'error'); }
        setChatLoading(false);
        setTimeout(function() { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, 100);
      }, [callGemini, hasAI, aiScenario, chatHistory, rapport, gradeBand, addToast]);

      // ── Get conversation feedback ──
      var getFeedback = useCallback(async function() {
        if (!hasAI || !aiScenario) return;
        setChatFeedback('loading');
        try {
          var historyText = chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n');
          var oarsSummary = OARS.map(function(s) { return s.label + ': ' + (oarsUsed[s.id] || 0) + ' times'; }).join(', ');
          var prompt = 'You are a warm peer support skills coach evaluating a ' + gradeBand + ' student\'s supportive conversation.\n\n'
            + 'Scenario: ' + aiScenario.setup + '\nSkill  ' + aiScenario.skill + '\nGoal: ' + aiScenario.goal + '\n'
            + 'Final rapport: ' + rapport + '/100 (started at 50)\n'
            + 'OARS skills used: ' + oarsSummary + '\n'
            + (safetyTriggered ? 'SAFETY: A safety moment occurred. Did the student recognize it and suggest getting adult help?\n' : '')
            + '\nConversation:\n' + historyText + '\n\n'
            + 'Return JSON:\n'
            + '{"rating":"developing|proficient|exemplary",'
            + '"oarsFeedback":{"open":"feedback on open questions usage","affirm":"feedback on affirmations","reflect":"feedback on reflections","summarize":"feedback on summaries"},'
            + '"safetyFeedback":"' + (safetyTriggered ? 'Did they recognize the safety signal and suggest getting help? Be specific.' : 'null') + '",'
            + '"strengths":["1-2 things done well"],"improvements":["1-2 specific suggestions"],'
            + '"overallNote":"encouraging 1-2 sentence summary"}\n\n'
            + 'Grade expectations: ' + (gradeBand === 'elementary' ? 'Praise any listening attempt. "Exemplary" = asked at least one open question AND reflected a feeling.' : gradeBand === 'middle' ? 'Expect 2+ OARS skills used. "Exemplary" = multiple skills with genuine engagement.' : 'Expect sophisticated use. "Exemplary" = natural integration of OARS + recognized safety signals if present.');
          var result = await callGemini(prompt, true);
          var parsed = JSON.parse(result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
          setChatFeedback(parsed);
          var xp = parsed.rating === 'exemplary' ? 30 : parsed.rating === 'proficient' ? 20 : 10;
          if (safetyTriggered) xp += 10; // Bonus for safety scenarios
          if (awardXP) awardXP(xp);
          addToast && addToast('Feedback received! +' + xp + ' XP', 'success');
        } catch (err) { setChatFeedback({ error: 'Could not generate feedback.' }); }
      }, [callGemini, hasAI, aiScenario, chatHistory, rapport, oarsUsed, safetyTriggered, gradeBand, awardXP, addToast]);

      // ── Scripted conversations (no AI, 2026-11-04) ──
      // In place of the AI roleplay without AI; an option beside it with AI.
      // Zero AI calls: AdventureOffline is pure UI; safety is the local regex check.
      var psUpd = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('peersupport', obj);
        else if (update) Object.keys(obj).forEach(function(k) { update('peersupport', k, obj[k]); });
      };
      // Teacher scenes from the active station (shared hub helper; an older hub has none).
      var _psTx = function(key, fb) { var v = null; try { v = typeof ctx.t === 'function' ? ctx.t(key) : null; } catch (e) { v = null; } return (typeof v === 'string' && v && v !== key) ? v : fb; };
      var _psTsApi = window.SelHub && window.SelHub.teacherScenes;
      var psTs = (_psTsApi && typeof _psTsApi.bind === 'function') ? _psTsApi.bind({ ctx: ctx, h: h, toolId: 'peersupport', d: toolData, set: psUpd, announce: announceToSR,
        aiTopic: 'a realistic conversation where a student listens to and supports a friend who is struggling',
        aiExtra: 'Choices are things the player could say, using listening skills (open questions, affirmations, reflections, summaries); scenes show how the friend responds. The player is a friend, not a counselor. If anyone in the scene is unsafe (being hurt, hurting themselves, thinking about suicide, abuse, threats), every path must lead to telling a trusted adult, and no ending may keep it secret.',
        // A teacher-written scene cannot be checked for this, so the editor says it plainly; an AI draft must confirm it.
        editorNote: _psTx('sel.peersupport.teacher.safety_note', 'Peer Support rule: if anyone in a scene is unsafe (being hurt, hurting themselves, or being threatened), every path must lead to telling a trusted adult, and no ending may keep it secret. The app cannot check this for you, so please check it yourself before you save.'),
        extraChecks: [{ id: 'adult', text: _psTx('sel.peersupport.teacher.check_adult', 'If anyone in this scene is unsafe, every path leads to telling a trusted adult.') }] }) : null;
      var psAO = (window.AlloModules && window.AlloModules.AdventureOffline) || null;
      var psTheme = _peCHC ? 'contrast' : (_peCDark ? 'dark' : 'light');
      var psT = typeof ctx.t === 'function' ? ctx.t : function(k) { return k; };
      var psEntries = [];
      ['elementary', 'middle', 'high'].forEach(function(b) { (AI_SUPPORT_SCENARIOS[b] || []).forEach(function(sc) { if (PS_SCRIPTS[sc.id]) psEntries.push({ key: sc.id, band: b, sc: sc, story: PS_SCRIPTS[sc.id] }); }); });
      // This grade band's conversations first; the rest stay playable.
      psEntries.sort(function(a, b) { return (a.band === gradeBand ? 0 : 1) - (b.band === gradeBand ? 0 : 1); });
      var psDone = toolData.scriptDone || {};
      var psFound = function(key) { return Object.keys(psDone).filter(function(x) { return x.indexOf(key + ':') === 0; }).length; };
      var psEnds = function(story) { return story.scenes.filter(function(s) { return s.ending; }).length; };
      var psCur = null;
      psEntries.forEach(function(e) { if (e.key === toolData.scriptKey) psCur = e; });
      var psCurTs = psTs ? psTs.byKey(toolData.scriptKey) : null;
      if (psCurTs) psCur = { key: psCurTs.key, ts: psCurTs, sc: { title: psCurTs.title || psTs.from }, story: psCurTs.story };
      var psStartTeacher = function(s) {
        psUpd({ scriptKey: s.key, scriptRun: (toolData.scriptRun || 0) + 1, scriptPath: null, scriptEnding: null, scriptReflectDraft: '', scriptReflectSaved: false });
        setMode('script');
        announceToSR('Scripted practice conversation started: ' + (s.title || psTs.from) + '.');
      };
      var openPsScript = function(e) {
        psUpd({ scriptKey: e.key, scriptRun: (toolData.scriptRun || 0) + 1, scriptPath: null, scriptEnding: null, scriptReflectDraft: '', scriptReflectSaved: false });
        setMode('script');
        announceToSR('Scripted practice conversation started: ' + e.sc.title + '.');
      };
      var psScriptList = function() {
        return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          psEntries.map(function(e) {
            return h('button', { key: e.key, 'data-ps-script-card': e.key, onClick: function() { openPsScript(e); },
              style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: _peC('#fff'), border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: '18px', flexShrink: 0 } }, e.sc.hasSafetyTrigger ? '🚨' : '💬'),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: '13px', color: _peC('#1e293b') } }, e.sc.title),
                h('div', { style: { fontSize: '11px', color: _peC('#475569') } }, e.sc.setup),
                e.sc.hasSafetyTrigger && h('div', { style: { fontSize: '11px', color: _peC('#991b1b'), fontWeight: 600 } }, 'Includes knowing when to get an adult'),
                h('div', { style: { fontSize: '11px', color: _peC('#475569'), marginTop: '2px' } }, 'Endings found: ' + psFound(e.key) + ' of ' + psEnds(e.story))
              )
            );
          })
        );
      };

      // ═══ RENDER ═══

      // ── MENU ──
      if (mode === 'menu' && psTs && psTs.editing) return psTs.renderEditor();
      if (mode === 'menu') {
        return h('div', { style: { maxWidth: '650px', margin: '0 auto', padding: '20px' } },
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('peersupport', h, ctx) : null),
          h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🤝'),
            h('h2', { style: { fontSize: '24px', fontWeight: 900, color: _peC('#1e293b') } }, 'Peer Support Coach'),
            h('p', { style: { color: _peC('#94a3b8'), fontSize: '14px', maxWidth: '480px', margin: '0 auto' } },
              'Learn to be a supportive listener. Not a counselor — a better friend. These skills help people find their own answers.')
          ),
          psTs ? psTs.renderSection({ onPlay: psStartTeacher }) : null,
          // OARS overview cards
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '16px' } },
            OARS.map(function(skill) {
              return h('div', { key: skill.id, style: { background: _peC('#fff'), borderRadius: '12px', padding: '12px', border: '2px solid ' + skill.color + '33' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: '18px' }, 'aria-hidden': 'true' }, skill.icon),
                  h('span', { style: { fontSize: '13px', fontWeight: 800, color: _peInk(skill.color) } }, skill.label)
                ),
                h('p', { style: { fontSize: '10px', color: _peC('#94a3b8'), lineHeight: 1.4, margin: 0 } }, skill.what)
              );
            })
          ),
          // Safety banner — always visible
          h('div', { style: { background: _peC('#fef2f2'), border: '2px solid #fca5a5', borderRadius: '14px', padding: '14px', marginBottom: '16px' } },
            h('div', { style: { fontSize: '13px', fontWeight: 800, color: _peC('#991b1b'), marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' } }, '🚨 Know When to Get Help'),
            h('p', { style: { fontSize: '11px', color: _peC('#991b1b'), margin: '0 0 8px', lineHeight: 1.5 } },
              'Being a good listener is important — but some things are too big for friends to handle alone. If someone tells you about:'),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' } },
              SAFETY_SIGNALS.map(function(sig) {
                return h('span', { key: sig.id, style: { fontSize: '10px', background: _peC('#fee2e2'), color: _peC('#991b1b'), padding: '3px 8px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: 600 } }, sig.icon + ' ' + sig.label);
              })
            ),
            h('p', { style: { fontSize: '11px', color: _peC('#991b1b'), fontWeight: 700, margin: 0 } }, '→ Tell a trusted adult immediately. You are not betraying them — you are saving them.')
          ),
          // Tier 1: Practice
          h('div', { style: Object.assign({}, card, { border: '2px solid #86efac', background: _peC('#f0fdf4') }) },
            h('h3', { style: { fontSize: '15px', fontWeight: 800, color: _peC('#166534'), marginBottom: '8px' } }, '📋 Skill Practice (No AI needed)'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('button', { onClick: function() { setSubMode('open_vs_closed'); setIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('practice'); },
                style: Object.assign({}, btn(_peC('#fff'), _peC('#166534'), false), { border: '1px solid #bbf7d0', textAlign: 'left' }) },
                '❓ Open vs. Closed Questions — ' + (scenarios.open_vs_closed || []).length + ' exercises'),
              h('button', { onClick: function() { setSubMode('reflect_vs_advise'); setIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('practice'); },
                style: Object.assign({}, btn(_peC('#fff'), _peC('#166534'), false), { border: '1px solid #bbf7d0', textAlign: 'left' }) },
                '🪞 Reflection vs. Advice — ' + (scenarios.reflect_vs_advise || []).length + ' exercises'),
              h('button', { onClick: function() { setSubMode('safety'); setIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('practice'); },
                style: Object.assign({}, btn('#fff', _peC('#991b1b'), false), { border: '1px solid #fca5a5', textAlign: 'left', background: _peC('#fef2f2') }) },
                '🚨 Safety Scenarios — When to get an adult — ' + (scenarios.safety || []).length + ' scenarios')
            )
          ),
          // Tier 2: AI Roleplay (hidden without usable AI)
          hasAI && h('div', { style: Object.assign({}, card, { border: '2px solid ' + (hasAI ? '#86efac' : '#fca5a5'), background: hasAI ? _peC('#f0fdf4') : _peC('#fef2f2') }) },
            h('h3', { style: { fontSize: '15px', fontWeight: 800, color: hasAI ? _peC('#166534') : _peC('#991b1b'), marginBottom: '8px' } }, '🤖 AI Practice Conversations' + (hasAI ? '' : ' (AI Required)')),
            hasAI && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              aiScenarios.map(function(sc) {
                return h('button', { key: sc.id, onClick: function() {
                  setAiScenario(sc); setChatHistory([]); setChatInput(''); setChatFeedback(null); setChatTurns(0); setRapport(50); setPeerMood('neutral'); setOarsUsed({}); setSafetyTriggered(false); setMode('roleplay'); announceToSR(sc.title + ' selected. Starting a peer support conversation with ' + sc.peerName + '.');
                  callGemini('You are ' + sc.peerName + ', ' + sc.peerDesc + '. Scenario: ' + sc.setup + '. Say your opening line — 1 sentence, natural, showing vulnerability. Return ONLY dialogue.', false)
                    .then(function(line) { setChatHistory([{ role: 'peer', text: line ? line.trim() : '...' }]); })
                    .catch(function() { setChatHistory([{ role: 'peer', text: '...' }]); });
                }, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: _peC('#fff'), border: '1px solid ' + (sc.hasSafetyTrigger ? '#fca5a5' : '#bbf7d0'), borderRadius: '12px', cursor: 'pointer', textAlign: 'left' } },
                  h('span', { style: { fontSize: '20px' } }, sc.hasSafetyTrigger ? '🚨' : '💬'),
                  h('div', null,
                    h('div', { style: { fontWeight: 700, fontSize: '13px', color: _peC('#1e293b') } }, sc.title),
                    h('div', { style: { fontSize: '10px', color: _peC('#94a3b8') } }, sc.setup.substring(0, 60) + '...'),
                    sc.hasSafetyTrigger && h('span', { style: { fontSize: '9px', background: _peC('#fee2e2'), color: _peC('#991b1b'), padding: '1px 6px', borderRadius: '6px', fontWeight: 600 } }, 'Includes safety recognition')
                  )
                );
              })
            )
          ),
          // Scripted practice conversations (no AI): in place of the AI ones, or a quiet option beside them.
          !hasAI ? h('div', { 'data-ps-script-menu': 'true', style: Object.assign({}, card, { border: '2px solid #86efac', background: _peC('#f0fdf4') }) },
            h('h3', { style: { fontSize: '15px', fontWeight: 800, color: _peC('#166534'), marginBottom: '6px' } }, '🎬 Practice Conversations (No AI needed)'),
            h('p', { style: { fontSize: '12px', color: _peC('#475569'), marginBottom: '12px' } }, 'Choose what to say to a friend who is struggling, and see how they respond. Some include knowing when to get an adult.'),
            psScriptList()
          ) : h('div', { style: { textAlign: 'center', margin: '4px 0 10px' } },
            h('button', { 'data-ps-scripted-mode': 'true', onClick: function() { psUpd({ scriptKey: null }); setMode('script'); }, style: { minHeight: '40px', padding: '8px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: _peC('#fff'), color: _peC('#1e293b'), fontWeight: 600, fontSize: '12px', cursor: 'pointer' } }, '🎬 Scripted practice conversations (no AI)')
          ),
          // Clinical note
          h('div', { style: { marginTop: '12px', background: _peC('#eff6ff'), border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', fontSize: '11px', color: _peC('#1e40af') } },
            h('strong', null, 'Clinical note: '),
            'Peer Support Coach teaches MI-adjacent OARS skills (Open questions, Affirmations, Reflections, Summaries) for peer support contexts. ',
            'Safety boundary training is integrated throughout — students learn to recognize when situations require adult intervention. ',
            'Evidence base: Teen Mental Health First Aid, Sources of Strength (Wyman et al., 2010), Motivational Interviewing in Schools (Rollnick et al., 2016). ',
            'This tool does NOT train students as counselors — it teaches them to be better listeners and to know their limits.'
          ),
          // Print pocket card
          h('div', { style: { marginTop: '12px', textAlign: 'center' } },
            h('button', { onClick: function() { setMode('print'); },
              style: { padding: '10px 18px', borderRadius: '10px', border: '1px solid #059669', background: _peC('#ecfdf5'), color: _peC('#065f46'), fontWeight: 700, fontSize: '13px', cursor: 'pointer' } }, '🖨 Print OARS pocket card')
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, gradeBand)
        );
      }

      // ── Scripted Conversation Mode (no AI) ──
      if (mode === 'script') {
        var psBtn = { minHeight: '44px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: _peC('#fff'), color: _peC('#1e293b'), fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
        var psBtnMain = Object.assign({}, psBtn, { border: 'none', background: '#047857', color: '#fff' });
        var psCrisis = ((toolData._scriptTier || 0) >= 3 && window.SelHub && window.SelHub.renderCrisisResources) ? window.SelHub.renderCrisisResources(h, gradeBand) : null;
        if (!psCur) {
          return h('div', { style: { maxWidth: '650px', margin: '0 auto', padding: '20px' } },
            h('button', { onClick: function() { setMode('menu'); }, style: Object.assign({}, psBtn, { minHeight: '36px', padding: '6px 14px', fontSize: '12px', marginBottom: '12px' }) }, '← Back'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900, color: _peC('#1e293b'), margin: '0 0 6px' } }, '🎬 Scripted Practice Conversations'),
            h('p', { style: { fontSize: '12px', color: _peC('#475569'), margin: '0 0 14px' } }, 'Practice listening with OARS: choose what to say and see how your friend responds. No AI needed. Replay to find every ending.'),
            psTs ? psTs.renderList({ onPlay: psStartTeacher }) : null,
            psScriptList()
          );
        }
        var psScene = function(id) { for (var i = 0; i < psCur.story.scenes.length; i++) { if (psCur.story.scenes[i].id === id) return psCur.story.scenes[i]; } return null; };
        var psReach = function(endId) {
          var next = Object.assign({}, psDone);
          var first = psFound(psCur.key) === 0;
          next[psCur.key + ':' + endId] = true;
          psUpd({ scriptEnding: endId, scriptDone: next, scriptReflectSaved: false });
          // The SEL hub's awardXP takes (amount). XP once per conversation.
          if (first && awardXP) awardXP(10);
          announceToSR('Ending reached. Read what worked, then reflect.');
        };
        // AdventureOffline.Player keeps its own path; its buttons carry data attributes we read on the way up.
        var psOnClick = function(ev) {
          var el = ev && ev.target && ev.target.closest ? ev.target.closest('[data-offline-choice],[data-offline-back],[data-offline-restart]') : null;
          if (!el) return;
          var to = el.getAttribute('data-offline-choice');
          var target = to ? psScene(to) : null;
          if (target && target.ending) psReach(to);
          else if (toolData.scriptEnding) psUpd({ scriptEnding: null });
        };
        // Built-in player for an older host without AdventureOffline.
        var psFallback = function() {
          var path = (Array.isArray(toolData.scriptPath) ? toolData.scriptPath : []).filter(function(id) { return !!psScene(id); });
          if (!path.length) path = [psCur.story.start];
          var scn = psScene(path[path.length - 1]);
          var go = function(to) { psUpd({ scriptPath: path.concat([to]) }); var t2 = psScene(to); if (t2 && t2.ending) psReach(to); };
          return h('section', { 'data-ps-fallback-player': 'true', 'aria-label': psCur.story.title, style: Object.assign({}, card, { padding: '18px' }) },
            h('h3', { style: { margin: '0 0 10px', fontSize: '16px', fontWeight: 800, color: _peC('#1e293b') } }, scn.ending ? 'The end' : 'Step ' + path.length),
            h('div', { style: { whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.6, color: _peC('#1e293b') } }, scn.text),
            !scn.ending && h('div', { role: 'group', 'aria-label': 'Choices', style: { display: 'grid', gap: '8px', marginTop: '14px' } },
              scn.choices.map(function(c, i) { return h('button', { key: i, 'data-ps-choice': c.to, onClick: function() { go(c.to); }, style: Object.assign({}, psBtn, { textAlign: 'left', fontWeight: 600 }) }, c.label); })),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' } },
              h('button', { disabled: path.length < 2, onClick: function() { psUpd({ scriptPath: path.slice(0, -1), scriptEnding: null }); }, style: psBtn }, '← Back'),
              h('button', { disabled: path.length < 2, onClick: function() { psUpd({ scriptPath: [psCur.story.start], scriptEnding: null }); }, style: scn.ending ? psBtnMain : psBtn }, scn.ending ? '↺ Play again' : '↺ Start over'))
          );
        };
        var psDraft = String(toolData.scriptReflectDraft || '');
        return h('div', { style: { maxWidth: '650px', margin: '0 auto', padding: '20px' } },
          psCrisis,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' } },
            h('button', { onClick: function() { psUpd({ scriptKey: null, scriptEnding: null }); }, style: Object.assign({}, psBtn, { minHeight: '36px', padding: '6px 14px', fontSize: '12px' }) }, '← All conversations'),
            h('div', null,
              h('h2', { style: { fontSize: '18px', fontWeight: 900, color: _peC('#1e293b'), margin: 0 } }, psCur.sc.title),
              h('div', { style: { fontSize: '12px', color: _peC('#475569') } }, psCur.ts ? psTs.from : 'Goal: ' + psCur.sc.goal)
            )
          ),
          psCur.ts ? psTs.renderIntro(psCur.ts) : null,
          h('div', { 'data-ps-script-player': psCur.key, onClick: psOnClick },
            (psAO && typeof psAO.Player === 'function')
              ? h(psAO.Player, { key: psCur.key + ':' + (toolData.scriptRun || 0), story: psCur.story, t: psT, theme: psTheme })
              : psFallback()),
          h('p', { style: { fontSize: '11px', color: _peC('#475569'), textAlign: 'center', margin: '10px 0' } }, 'Endings found: ' + psFound(psCur.key) + ' of ' + psEnds(psCur.story)),
          toolData.scriptEnding ? h('div', { 'data-ps-reflect': 'true', style: card },
            h('label', { htmlFor: 'ps-reflect-script', style: { display: 'block', fontSize: '13px', fontWeight: 800, color: _peC('#1e293b'), marginBottom: '6px' } }, '✍️ Reflect'),
            h('p', { style: { margin: '0 0 8px', fontSize: '12px', color: _peC('#475569'), lineHeight: 1.5 } }, 'Which listening skill helped your friend open up? What would make you tell a trusted adult?'),
            h('textarea', { id: 'ps-reflect-script', value: psDraft, rows: 3, maxLength: 2000,
              onChange: function(e) { psUpd({ scriptReflectDraft: e.target.value }); },
              style: { width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: _peC('#fff'), color: _peC('#1e293b'), fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' } }),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' } },
              h('button', { 'data-ps-reflect-save': 'true', disabled: !psDraft.trim(), style: psBtnMain, onClick: function() {
                var txt = psDraft.trim();
                if (!txt) return;
                if (window.SelHub && typeof window.SelHub.safeRehearseCheck === 'function') {
                  var chk = window.SelHub.safeRehearseCheck(txt, { toolId: 'peersupport', onSafetyFlag: (ctx && ctx.onSafetyFlag) || null });
                  if (chk && chk.action === 'block') { psUpd({ _scriptTier: 3 }); announceToSR('Please use the support resources on this screen.'); }
                }
                var list = (Array.isArray(toolData.scriptReflections) ? toolData.scriptReflections : []).concat([{ scenarioId: psCur.key, ending: toolData.scriptEnding, text: txt.slice(0, 2000), ts: new Date().toISOString() }]).slice(-20);
                psUpd({ scriptReflections: list, scriptReflectDraft: '', scriptReflectSaved: true });
                announceToSR('Reflection saved.');
              } }, 'Save reflection'),
              toolData.scriptReflectSaved ? h('span', { role: 'status', style: { fontSize: '12px', color: _peC('#475569') } }, 'Saved to your work.') : null
            )
          ) : null
        );
      }

      // ── PRINT MODE ──
      if (mode === 'print') {
        return h('div', { style: { maxWidth: '650px', margin: '0 auto', padding: '20px' } },
          h('div', { className: 'no-print', style: { marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn(_peC('#f1f5f9'), _peC('#374151'), false) }, '← Back'),
            h('button', { onClick: function() { try { window.print(); } catch (e) {} }, style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: _peC('#ecfdf5'), borderTop: '1px solid #6ee7b7', borderRight: '1px solid #6ee7b7', borderBottom: '1px solid #6ee7b7', borderLeft: '3px solid #059669', marginBottom: 14, fontSize: 12.5, color: _peC('#065f46'), lineHeight: 1.65 } },
            h('strong', null, '🖨 OARS pocket card. '),
            'A reference for peer support: the four OARS skills, common pitfalls, and the safety signals that mean STOP and get an adult. Designed to fold and carry. Print on one page.'
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#peer-print-region, #peer-print-region * { visibility: visible !important; } ' +
            '#peer-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#peer-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'peer-print-region', style: { padding: 18, borderRadius: 12, background: _peC('#ffffff'), color: _peC('#0f172a'), border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: _peC('#0f172a') } }, 'Peer Support · OARS Pocket Card'),
              h('div', { style: { fontSize: 11, color: _peC('#475569') } }, 'Miller & Rollnick · Sources of Strength')
            ),

            h('div', { style: { padding: 10, background: _peC('#ecfdf5'), border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: _peC('#065f46') } },
              h('strong', null, 'OARS = better listening, not counseling. '),
              'The goal is not to fix; the goal is to help the other person feel heard and find their own next step. If you ever hear a safety signal (below), stop OARS and get an adult.'
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _peC('#0f172a'), marginBottom: 8 } }, 'The four OARS skills'),
              OARS.map(function(s, i) {
                return h('div', { key: s.id, style: { marginBottom: 8, paddingBottom: 8, borderBottom: i < OARS.length - 1 ? '1px dashed #cbd5e1' : 'none' } },
                  h('div', { style: { fontSize: 12.5, fontWeight: 800, color: _peC('#0f172a') } }, s.icon + ' ' + s.label),
                  h('div', { style: { fontSize: 11.5, color: _peC('#475569'), lineHeight: 1.5, marginBottom: 4 } }, s.what),
                  s.examples && s.examples.length ? h('ul', { style: { margin: '4px 0 0 18px', padding: 0, fontSize: 11, color: _peC('#0f172a'), lineHeight: 1.55 } },
                    s.examples.slice(0, 3).map(function(ex, ei) { return h('li', { key: ei, style: { fontStyle: 'italic' } }, ex); })
                  ) : null
                );
              })
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _peC('#0f172a'), marginBottom: 8 } }, 'Common pitfalls'),
              h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 12, color: _peC('#0f172a'), lineHeight: 1.65 } },
                h('li', null, h('strong', null, 'Jumping to advice. '), 'Most of the time, the person is not asking for advice; they are asking to be heard. Reflect first, advise rarely.'),
                h('li', null, h('strong', null, 'Yes-set / cheerleading. '), '"Don\'t worry, it will be fine" closes the conversation. "It sounds like this is really weighing on you" opens it.'),
                h('li', null, h('strong', null, 'Asking why. '), '"Why did you do that?" sounds like judgment. "What was going on for you?" sounds like curiosity.'),
                h('li', null, h('strong', null, 'Comparing. '), '"That happened to me too" can be helpful or can erase the other person\'s experience. Use sparingly.'),
                h('li', null, h('strong', null, 'Going past your role. '), 'You are a friend, not a therapist. Knowing your limit is part of being supportive.')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #b91c1c', borderRadius: 10, marginBottom: 12, background: _peC('#fef2f2'), pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _peC('#7f1d1d'), marginBottom: 8 } }, '🚨 STOP and get an adult if you hear:'),
              SAFETY_SIGNALS.map(function(sig, i) {
                return h('div', { key: sig.id, style: { marginBottom: 6 } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: _peC('#7f1d1d') } }, sig.icon + ' ' + sig.label),
                  h('div', { style: { fontSize: 11, color: _peC('#7f1d1d'), fontStyle: 'italic', lineHeight: 1.55, marginLeft: 8 } }, '"' + (sig.examples[0] || '') + '"')
                );
              }),
              h('div', { style: { marginTop: 8, padding: 8, background: _peC('#fee2e2'), borderRadius: 6, fontSize: 11.5, color: _peC('#7f1d1d'), fontWeight: 700, lineHeight: 1.55 } }, 'Telling an adult is NOT betraying your friend. It is saving them. You can say, "I care about you too much to carry this alone. Let\'s tell someone together."')
            ),

            h('div', { style: { padding: 10, background: _peC('#f1f5f9'), border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: _peC('#0f172a'), lineHeight: 1.6 } },
              h('strong', null, 'Crisis lines for them (or you): '),
              '988 Suicide & Crisis Lifeline · Crisis Text Line text HOME to 741741 · Trevor Project for LGBTQ+ youth 1-866-488-7386. Save these in your phone before you need them.'
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: _peC('#475569'), lineHeight: 1.5 } },
              'Sources: Miller, W. R. & Rollnick, S. (2013), Motivational Interviewing (3rd ed.) · Rollnick, S., et al. (2016), Motivational Interviewing in Schools · Wyman, P., et al. (2010), Sources of Strength · Teen Mental Health First Aid (mhfa.com.au). Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      // ── PRACTICE MODE (Static) ──
      if (mode === 'practice') {
        var exercises = scenarios[subMode] || [];
        var current = exercises[idx % exercises.length];
        if (!current) return h('div', null, 'No exercises for this skill.');

        // Safety scenarios use the Social Lab pattern (multiple choice)
        if (subMode === 'safety') {
          return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
              h('button', { onClick: function() { setMode('menu'); }, style: btn(_peC('#f1f5f9'), _peC('#374151'), false) }, '← Back'),
              h('span', { role: 'status', 'aria-live': 'polite', 'aria-label': 'Exercise ' + (idx + 1) + ' of ' + exercises.length + '. ' + score + ' of ' + total + ' correct.', style: { fontSize: '13px', fontWeight: 700, color: '#16a34a' } }, '✅ ' + score + '/' + total),
              h('span', { style: { fontSize: '12px', color: _peC('#991b1b'), fontWeight: 700 } }, '🚨 Safety Scenarios')
            ),
            // Teach safety steps on first scenario
            idx === 0 && !feedback && h('div', { style: { background: _peC('#fef2f2'), border: '2px solid #fca5a5', borderRadius: '14px', padding: '14px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: _peC('#991b1b'), marginBottom: '8px' } }, '🚨 5 Steps When Someone Is in Danger'),
              h('ol', { style: { margin: '0 0 0 16px', padding: 0, fontSize: '12px', color: _peC('#991b1b'), lineHeight: 1.6 } },
                SAFETY_RESPONSE_STEPS.map(function(step) {
                  return h('li', { key: step.step, style: { marginBottom: '4px' } }, h('strong', null, step.label), ' — ' + step.desc);
                })
              )
            ),
            h('div', { style: { background: _peC('#fef3c7'), border: '2px solid #fde68a', borderRadius: '14px', padding: '16px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: _peC('#92400e'), textTransform: 'uppercase', marginBottom: '6px' } }, 'The Situation'),
              h('p', { style: { fontSize: '14px', color: _peC('#1e293b'), lineHeight: 1.6 } }, current.situation)
            ),
            feedback && h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { padding: '14px', borderRadius: '12px', marginBottom: '12px', background: feedback.ok ? _peC('#dcfce7') : _peC('#fee2e2'), border: '1px solid ' + (feedback.ok ? '#86efac' : '#fca5a5'), color: feedback.ok ? _peC('#166534') : _peC('#991b1b'), fontSize: '13px', fontWeight: 600 } }, feedback.msg),
            !feedback && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose your response' },
              current.options.map(function(opt, oi) {
                return h('button', { key: oi, 'aria-label': 'Response ' + String.fromCharCode(65 + oi) + ': ' + opt.text, onClick: function() {
                  setTotal(function(t) { return t + 1; });
                  if (opt.rating === 'great') { sfxCorrect(); setScore(function(s) { return s + 1; }); setFeedback({ ok: true, msg: '✅ ' + opt.feedback }); announceToSR('Correct. ' + opt.feedback); if (awardXP) awardXP(15); }
                  else { sfxAlert(); setFeedback({ ok: false, msg: '❌ ' + opt.feedback }); announceToSR('Incorrect. ' + opt.feedback); }
                }, style: { padding: '14px', background: _peC('#fff'), border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '13px', lineHeight: 1.5 } },
                  opt.text
                );
              })
            ),
            feedback && h('div', { style: { textAlign: 'center', marginTop: '12px' } },
              h('button', { onClick: function() { if (idx + 1 < exercises.length) { setIdx(idx + 1); setFeedback(null); announceToSR('Exercise ' + (idx + 2) + ' of ' + exercises.length + '. Choose your response.'); } else { addToast && addToast('Complete! ' + score + '/' + total, 'success'); setMode('menu'); } },
                style: btn('#059669', '#fff', false) }, idx + 1 < exercises.length ? 'Next →' : '✓ Finish')
            )
          );
        }

        // Open vs Closed / Reflect vs Advise exercises
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn(_peC('#f1f5f9'), _peC('#374151'), false) }, '← Back'),
            h('span', { role: 'status', 'aria-live': 'polite', 'aria-label': 'Exercise ' + (idx + 1) + ' of ' + exercises.length + '. ' + score + ' of ' + total + ' correct.', style: { fontSize: '13px', fontWeight: 700, color: '#16a34a' } }, '✅ ' + score + '/' + total),
            h('span', { style: { fontSize: '12px', color: _peC('#94a3b8') } }, (subMode === 'open_vs_closed' ? '❓ Open vs Closed' : '🪞 Reflect vs Advise') + ' · ' + (idx + 1) + '/' + exercises.length)
          ),
          h('div', { style: { background: _peC('#f8fafc'), borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: _peC('#94a3b8'), textTransform: 'uppercase', marginBottom: '6px' } }, 'Situation'),
            h('p', { style: { fontSize: '14px', color: _peC('#1e293b'), lineHeight: 1.6 } }, current.situation)
          ),
          feedback && h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { padding: '14px', borderRadius: '12px', marginBottom: '12px', background: _peC('#dcfce7'), border: '1px solid #86efac', color: _peC('#166534'), fontSize: '13px' } },
            h('strong', null, feedback.ok ? '✅ Correct! ' : '🤔 '), feedback.msg
          ),
          !feedback && (subMode === 'open_vs_closed' ? (
            // Two-button: which is the open question?
            h('div', null,
              h('p', { style: { fontSize: '13px', color: _peC('#94a3b8'), marginBottom: '10px', fontWeight: 600 } }, 'Which is the OPEN question? (invites them to share more)'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose the open question' },
                [{ text: current.closed, isCorrect: false }, { text: current.open, isCorrect: true }]
                  .sort(function() { return 0.5 - Math.random(); }) // Shuffle
                  .map(function(opt, oi) {
                    return h('button', { key: oi, 'aria-label': 'Response ' + String.fromCharCode(65 + oi) + ': ' + opt.text, onClick: function() {
                      setTotal(function(t) { return t + 1; });
                      if (opt.isCorrect) { sfxCorrect(); setScore(function(s) { return s + 1; }); setFeedback({ ok: true, msg: current.explain }); announceToSR('Correct!'); if (awardXP) awardXP(10); }
                      else { setFeedback({ ok: false, msg: 'That\'s a closed question (yes/no answer). The open one is: "' + current.open + '" — ' + current.explain }); announceToSR('That was the closed question.'); }
                    }, style: { padding: '14px', background: _peC('#fff'), border: '2px solid #d1d5db', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', lineHeight: 1.5 } },
                      '"' + opt.text + '"'
                    );
                  })
              )
            )
          ) : (
            // Reflect vs Advise
            h('div', null,
              h('p', { style: { fontSize: '13px', color: _peC('#94a3b8'), marginBottom: '10px', fontWeight: 600 } }, 'Which response is a REFLECTION? (shows you heard them)'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose the reflection' },
                [{ text: current.advice, isCorrect: false, label: 'advice' }, { text: current.reflection, isCorrect: true, label: 'reflection' }]
                  .sort(function() { return 0.5 - Math.random(); })
                  .map(function(opt, oi) {
                    return h('button', { key: oi, 'aria-label': 'Response ' + String.fromCharCode(65 + oi) + ': ' + opt.text, onClick: function() {
                      setTotal(function(t) { return t + 1; });
                      if (opt.isCorrect) { sfxCorrect(); setScore(function(s) { return s + 1; }); setFeedback({ ok: true, msg: current.explain }); if (awardXP) awardXP(10); }
                      else { setFeedback({ ok: false, msg: 'That\'s advice-giving, not reflection. The reflection is: "' + current.reflection + '" — ' + current.explain }); }
                    }, style: { padding: '14px', background: _peC('#fff'), border: '2px solid #d1d5db', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', lineHeight: 1.5 } },
                      '"' + opt.text + '"'
                    );
                  })
              )
            )
          )),
          feedback && h('div', { style: { textAlign: 'center', marginTop: '12px' } },
            h('button', { onClick: function() { if (idx + 1 < exercises.length) { setIdx(idx + 1); setFeedback(null); announceToSR('Exercise ' + (idx + 2) + ' of ' + exercises.length + '. Choose your response.'); } else { addToast && addToast('Complete! ' + score + '/' + total, 'success'); setMode('menu'); } },
              style: btn('#059669', '#fff', false) }, idx + 1 < exercises.length ? 'Next →' : '✓ Finish')
          )
        );
      }

      // ── AI ROLEPLAY MODE ──
      if (mode === 'roleplay' && aiScenario) {
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn(_peC('#f1f5f9'), _peC('#374151'), false) }, '← Back'),
            h('div', { style: { textAlign: 'right' } },
              h('div', { style: { fontSize: '13px', fontWeight: 700, color: _peC('#1e293b') } }, aiScenario.title),
              h('div', { style: { fontSize: '10px', color: _peC('#94a3b8') } }, chatTurns + ' turns')
            )
          ),
          // Peer + rapport + OARS tracker
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: _peC('#f8fafc'), borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '8px', flexShrink: 0 } },
            h('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: _peC('#e0e7ff'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '3px solid ' + (rapport >= 70 ? '#22c55e' : rapport >= 40 ? '#f59e0b' : '#ef4444'), flexShrink: 0 }, 'aria-label': aiScenario.peerName + ' is feeling ' + peerMood }, MOOD_EMOJIS[peerMood] || '😐'),
            h('div', { style: { flex: 1 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' } },
                h('span', { style: { fontWeight: 700, color: _peC('#1e293b') } }, aiScenario.peerName),
                h('span', { style: { color: _peC('#94a3b8') } }, 'Rapport: ' + rapport + '%')
              ),
              h('div', { style: { height: '5px', background: _peC('#e5e7eb'), borderRadius: '3px', overflow: 'hidden' }, role: 'progressbar', 'aria-valuenow': rapport, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Rapport with ' + aiScenario.peerName + ': ' + rapport + ' percent' },
                h('div', { style: { height: '100%', width: rapport + '%', background: rapport >= 70 ? '#22c55e' : rapport >= 40 ? '#f59e0b' : '#ef4444', transition: 'all 0.5s', borderRadius: '3px' } })
              )
            ),
            // OARS skill tracker
            h('div', { style: { display: 'flex', gap: '3px', flexShrink: 0 } },
              OARS.map(function(s) {
                var count = oarsUsed[s.id] || 0;
                return h('div', { key: s.id, title: s.label + ': ' + count + ' used', 'aria-label': s.label + ': ' + count + ' used', style: { width: '24px', height: '24px', borderRadius: '50%', background: count > 0 ? s.color : _peC('#e5e7eb'), color: count > 0 ? '#fff' : _peC('#9ca3af'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, transition: 'all 0.3s' } }, count > 0 ? count : s.icon);
              })
            )
          ),
          // Crisis resources surfaced when the STUDENT's own message hits Tier 3
          // (distinct from `safetyTriggered`, which is the AI peer's scripted reveal).
          (userTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) ? window.SelHub.renderCrisisResources(h, gradeBand) : null,
          // Safety alert (AI peer signal recognition)
          safetyTriggered && h('div', { role: 'alert', style: { background: _peC('#fef2f2'), border: '2px solid #fca5a5', borderRadius: '10px', padding: '8px 12px', marginBottom: '8px', fontSize: '11px', color: _peC('#991b1b'), fontWeight: 700, textAlign: 'center', flexShrink: 0 } },
            '🚨 ' + aiScenario.peerName + ' may need adult help. Consider suggesting a trusted adult.'
          ),
          // Goal
          h('div', { style: { background: _peC('#eff6ff'), border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '11px', color: _peC('#1e40af'), flexShrink: 0 } },
            h('strong', null, 'Goal: '), aiScenario.goal
          ),
          // Chat
          h('div', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation with ' + aiScenario.peerName, 'aria-busy': chatLoading ? 'true' : 'false', style: { flex: 1, overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' } },
            chatHistory.map(function(msg, i) {
              var isPeer = msg.role === 'peer';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isPeer ? 'flex-start' : 'flex-end', gap: '6px' } },
                isPeer && h('div', { style: { width: '28px', height: '28px', borderRadius: '50%', background: _peC('#e0e7ff'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }, 'aria-hidden': 'true' }, msg.mood ? (MOOD_EMOJIS[msg.mood] || '😐') : '💬'),
                h('div', { style: { maxWidth: '80%', padding: '8px 12px', borderRadius: isPeer ? '12px 12px 12px 0' : '12px 12px 0 12px', background: isPeer ? _peC('#e0e7ff') : _peC('#dcfce7'), fontSize: '13px', lineHeight: 1.5 } },
                  isPeer && h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#4338ca', marginBottom: '2px' } }, aiScenario.peerName),
                  msg.text || '...'
                )
              );
            }),
            chatLoading && h('div', { role: 'status', 'aria-live': 'polite', 'aria-label': aiScenario.peerName + ' is typing', style: { fontSize: '12px', color: _peC('#94a3b8'), padding: '4px' } }, aiScenario.peerName + ' is typing...'),
            h('div', { ref: chatEndRef })
          ),
          // Feedback display
          chatFeedback && typeof chatFeedback === 'object' && !chatFeedback.error && h('div', { role: 'region', 'aria-live': 'polite', 'aria-label': 'OARS conversation feedback', style: { background: _peC('#f0fdf4'), border: '2px solid #86efac', borderRadius: '14px', padding: '16px', marginBottom: '8px', flexShrink: 0 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
              h('strong', { style: { color: _peC('#166534') } }, '📝 OARS Feedback'),
              h('span', { style: { fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: chatFeedback.rating === 'exemplary' ? _peC('#dcfce7') : chatFeedback.rating === 'proficient' ? _peC('#dbeafe') : _peC('#fef3c7'), color: chatFeedback.rating === 'exemplary' ? _peC('#166534') : chatFeedback.rating === 'proficient' ? _peC('#1e40af') : _peC('#92400e') } },
                chatFeedback.rating === 'exemplary' ? '⭐ Exemplary' : chatFeedback.rating === 'proficient' ? '✅ Proficient' : '📈 Developing')
            ),
            chatFeedback.overallNote && h('p', { style: { fontSize: '12px', color: _peC('#374151'), marginBottom: '8px' } }, chatFeedback.overallNote),
            // Per-OARS feedback
            chatFeedback.oarsFeedback && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' } },
              OARS.map(function(s) {
                var fb = chatFeedback.oarsFeedback[s.id];
                if (!fb || fb === 'null') return null;
                return h('div', { key: s.id, style: { background: _peC('#fff'), borderRadius: '8px', padding: '8px', border: '1px solid ' + s.color + '33' } },
                  h('div', { style: { fontSize: '10px', fontWeight: 700, color: _peInk(s.color), marginBottom: '2px' } }, s.icon + ' ' + s.label + ' (' + (oarsUsed[s.id] || 0) + 'x)'),
                  h('p', { style: { fontSize: '10px', color: _peC('#94a3b8'), margin: 0, lineHeight: 1.3 } }, fb)
                );
              })
            ),
            chatFeedback.safetyFeedback && chatFeedback.safetyFeedback !== 'null' && h('div', { style: { background: _peC('#fef2f2'), borderRadius: '8px', padding: '8px', border: '1px solid #fca5a5', marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: _peC('#991b1b'), marginBottom: '2px' } }, '🚨 Safety Recognition'),
              h('p', { style: { fontSize: '10px', color: _peC('#991b1b'), margin: 0 } }, chatFeedback.safetyFeedback)
            ),
            chatFeedback.strengths && h('div', { style: { marginBottom: '4px' } }, h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a' } }, '💪 Strengths'), h('ul', { style: { margin: '2px 0 0 14px', fontSize: '11px', color: _peC('#166534') } }, chatFeedback.strengths.map(function(s, i) { return h('li', { key: i }, s); }))),
            chatFeedback.improvements && h('div', null, h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#d97706' } }, '🤔 Next Time'), h('ul', { style: { margin: '2px 0 0 14px', fontSize: '11px', color: _peC('#92400e') } }, chatFeedback.improvements.map(function(s, i) { return h('li', { key: i }, s); }))),
            h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
              h('button', { onClick: function() { setMode('menu'); }, style: btn(_peC('#f1f5f9'), _peC('#374151'), false) }, '← Try Another'),
              h('button', { onClick: function() {
                var text = '🤝 Peer Support Coach — Transcript\nScenario: ' + aiScenario.title + '\nRapport: ' + rapport + '/100\nOARS: ' + OARS.map(function(s) { return s.label + '=' + (oarsUsed[s.id]||0); }).join(', ') + '\n───\n' + chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n\n');
                var blob = new Blob([text], { type: 'text/plain' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'peersupport_' + aiScenario.id + '.txt'; a.click(); URL.revokeObjectURL(url);
              }, style: btn(_peC('#f1f5f9'), _peC('#374151'), false) }, '📄 Save')
            )
          ),
          chatFeedback === 'loading' && h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { textAlign: 'center', fontSize: '12px', color: _peC('#94a3b8'), flexShrink: 0 } }, '⏳ Analyzing your OARS skills...'),
          // Input
          !chatFeedback && h('div', { style: { display: 'flex', gap: '6px', flexShrink: 0 } },
            h('input', { type: 'text', 'aria-label': 'Your response using OARS skills', value: chatInput, onChange: function(ev) { setChatInput(ev.target.value); },
              onKeyDown: function(ev) { if (ev.key === 'Enter' && chatInput.trim() && !chatLoading) sendChat(chatInput); },
              placeholder: 'What would you say? Use your OARS skills...', disabled: chatLoading,
              style: { flex: 1, padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '13px' },
 }),
            ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && h('button', { onClick: function() {
              // Phase 3v.M — shared module path with inline fallback
              var append = function(t) { setChatInput(function(p) { return p ? p + ' ' + t : t; }); };
              if (window.AlloFlowVoice && typeof window.AlloFlowVoice.initWebSpeechCapture === 'function') {
                var ctrl = window.AlloFlowVoice.initWebSpeechCapture({
                  lang: 'en-US', continuous: false, interimResults: false,
                  onTranscript: append
                });
                if (ctrl.supported) ctrl.start();
                addToast && addToast('Listening...', 'info');
                return;
              }
              var SR = window.SpeechRecognition || window.webkitSpeechRecognition; var rec = new SR();
              rec.lang = 'en-US'; rec.interimResults = false;
              rec.onresult = function(ev) { append(ev.results[0][0].transcript); };
              rec.start(); addToast && addToast('Listening...', 'info');
            }, style: btn(_peC('#f1f5f9'), _peC('#374151'), chatLoading), 'aria-label': 'Voice input' }, '🎤'),
            h('button', { 'aria-label': 'Send OARS response', onClick: function() { if (chatInput.trim()) sendChat(chatInput); }, disabled: !chatInput.trim() || chatLoading,
              style: btn('#059669', '#fff', !chatInput.trim() || chatLoading) }, '→')
          ),
          !chatFeedback && chatTurns >= 3 && h('div', { style: { textAlign: 'center', marginTop: '6px', flexShrink: 0 } },
            h('button', { onClick: getFeedback, style: { fontSize: '11px', color: '#059669', background: 'none', border: '1px dashed #86efac', borderRadius: '8px', padding: '5px 14px', cursor: 'pointer' } }, '✨ Get OARS Feedback')
          )
        );
      }

      return h('div', null, 'Loading...');
    }
  });

  console.log('[SEL] Peer Support Coach tool registered');
})();
