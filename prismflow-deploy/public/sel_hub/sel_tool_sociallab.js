// ═══════════════════════════════════════════════════════════════
// sel_tool_sociallab.js — Social Skills Practice Lab (v1.0)
// Two-tier social skills practice:
//   Tier 1 (static): Branching dialogue scenarios with multiple choice — always works
//   Tier 2 (AI): Dynamic roleplay where AI plays a peer — requires callGemini
// Clinical target: ASD pragmatic language, social anxiety, social communication
// Registered tool ID: "sociallab"
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

  // ── WCAG: Live region for screen reader announcements ──
  (function() {
    if (document.getElementById('allo-live-sociallab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-sociallab';
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  function announceToSR(msg) {
    var el = document.getElementById('allo-live-sociallab');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _audioCtx; }
  function playTone(freq, dur, type, vol) { var ac = getAudioCtx(); if (!ac) return; try { var osc = ac.createOscillator(); var gain = ac.createGain(); osc.type = type || 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(vol || 0.1, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15)); osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + (dur || 0.15)); } catch(e) {} }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxNeutral() { playTone(440, 0.1, 'sine', 0.06); }

  // ═══════════════════════════════════════════════════════════════
  // STATIC SCENARIOS (Tier 1 — no AI required)
  // Each scenario has a context, the peer's line, and 3 response
  // options rated as: 'great', 'ok', or 'poor'
  // ═══════════════════════════════════════════════════════════════

  var SKILL_CATEGORIES = [
    { id: 'listening', label: 'Active Listening', icon: '👂', desc: 'Show you hear and understand' },
    { id: 'joining', label: 'Joining a Group', icon: '👋', desc: 'Enter conversations and activities' },
    { id: 'disagreeing', label: 'Respectful Disagreement', icon: '🤝', desc: 'Share a different opinion kindly' },
    { id: 'apologizing', label: 'Apologizing', icon: '💛', desc: 'Make things right when you mess up' },
    { id: 'helping', label: 'Asking for Help', icon: '🙋', desc: 'Get support without feeling bad' },
    { id: 'feedback', label: 'Receiving Feedback', icon: '📝', desc: 'Handle criticism with grace' },
    { id: 'sharing', label: 'Sharing & Turn-Taking', icon: '🔄', desc: 'Be fair and take turns' },
    { id: 'empathy', label: 'Showing Empathy', icon: '❤️', desc: 'Respond to others\' feelings' },
  ];

  var SCENARIOS = {
    elementary: {
      listening: [
        { context: 'Your friend is telling you about their weekend trip.', peer: 'We went to the beach and I found a really cool shell! It was purple and shiny.', options: [
          { text: 'Wow, a purple shell! What did it look like?', rating: 'great', feedback: 'Excellent! You showed interest by asking a follow-up question about the shell.' },
          { text: 'Cool. I went to the beach too once.', rating: 'ok', feedback: 'It\'s nice to share, but try asking about THEIR experience first before talking about yours.' },
          { text: '*looks at phone* Oh, that\'s nice.', rating: 'poor', feedback: 'Looking away while someone talks tells them you\'re not interested. Try making eye contact and asking a question!' },
        ]},
        { context: 'A classmate is upset because they got a bad grade.', peer: 'I studied really hard for that test and I still failed. I don\'t know what to do.', options: [
          { text: 'That sounds really frustrating. Do you want to study together next time?', rating: 'great', feedback: 'Great! You named their feeling AND offered help. That\'s strong active listening.' },
          { text: 'Don\'t worry, it\'s just one test.', rating: 'ok', feedback: 'You\'re trying to help them feel better, but it might feel like you\'re not taking their feelings seriously. Try acknowledging the feeling first.' },
          { text: 'I got an A! It was easy.', rating: 'poor', feedback: 'Bragging when someone is upset can really hurt. A good listener focuses on the other person\'s feelings, not their own success.' },
        ]},
        { context: 'Your friend is excited about learning to ride a bike.', peer: 'I almost rode the whole block today without falling! My dad let go and I didn\'t even know!', options: [
          { text: 'That\'s awesome! Were you surprised when you realized he let go?', rating: 'great', feedback: 'Perfect active listening! You matched their excitement and asked about their experience.' },
          { text: 'I learned to ride when I was 4.', rating: 'ok', feedback: 'Sharing is fine, but their moment deserves celebration first! Ask about THEIR experience before sharing yours.' },
          { text: 'Can we talk about something else?', rating: 'poor', feedback: 'Shutting down someone\'s excitement tells them their joy doesn\'t matter to you. A good friend celebrates with you!' },
        ]},
      ],
      joining: [
        { context: 'Some kids are playing a board game at recess.', peer: '*three kids are laughing and playing a card game at a table*', options: [
          { text: 'Hey! That looks fun — can I join the next round?', rating: 'great', feedback: 'Perfect! You complimented the activity and asked politely to join. Waiting for the next round shows patience.' },
          { text: '*sits down and starts grabbing cards*', rating: 'poor', feedback: 'Jumping in without asking can make others feel uncomfortable. Always ask first!' },
          { text: '*stands nearby watching but doesn\'t say anything*', rating: 'ok', feedback: 'It\'s okay to watch first, but if you want to join, you need to use your words! Try saying "Can I play too?"' },
        ]},
        { context: 'Two classmates are building a Lego castle during free time.', peer: '*two kids are focused on building, chatting about the design*', options: [
          { text: 'That castle looks amazing! Do you need someone to build the moat?', rating: 'great', feedback: 'Great strategy! You complimented their work and offered to contribute a specific part. That makes you instantly useful to the group.' },
          { text: '*starts building your own castle right next to them*', rating: 'ok', feedback: 'Parallel play is fine for younger kids, but offering to join THEIR project builds a connection. Try asking to help!' },
          { text: 'That doesn\'t even look like a castle. Mine would be way better.', rating: 'poor', feedback: 'Criticizing others\' work and bragging pushes people away. Building UP is better than tearing DOWN.' },
        ]},
      ],
      disagreeing: [
        { context: 'Your friend wants to play tag but you want to play basketball.', peer: 'Let\'s play tag! It\'ll be so fun!', options: [
          { text: 'Tag is fun! But I was hoping to play basketball. Maybe we could do tag first and then basketball?', rating: 'great', feedback: 'Awesome! You acknowledged their idea, shared yours, and suggested a compromise. That\'s respectful disagreement!' },
          { text: 'No, tag is boring. We\'re playing basketball.', rating: 'poor', feedback: 'Calling someone\'s idea "boring" hurts their feelings. You can disagree without putting down their suggestion.' },
          { text: 'Okay, I guess we can play tag.', rating: 'ok', feedback: 'It\'s kind to go along sometimes, but it\'s also okay to share what YOU want! You can disagree politely.' },
        ]},
      ],
      apologizing: [
        { context: 'You accidentally knocked over your friend\'s block tower.', peer: '*looking at the fallen blocks* I worked on that all morning...', options: [
          { text: 'I\'m really sorry! That was an accident. Can I help you rebuild it?', rating: 'great', feedback: 'Perfect apology! You said sorry, explained it was an accident, and offered to fix it.' },
          { text: 'It was an accident, okay? Don\'t be mad.', rating: 'ok', feedback: 'Explaining it was an accident is good, but telling someone not to be mad doesn\'t help. Try offering to help fix it.' },
          { text: 'It was going to fall anyway. It wasn\'t that good.', rating: 'poor', feedback: 'Blaming the other person or insulting their work makes things worse. A real apology takes responsibility.' },
        ]},
      ],
      helping: [
        { context: 'You\'re stuck on a math problem and the teacher is busy.', peer: '*classmate sitting next to you is working quietly*', options: [
          { text: 'Hey, do you understand number 5? I\'m stuck on that part.', rating: 'great', feedback: 'Great! You asked a specific question about what you need help with. That makes it easy for them to help.' },
          { text: 'Do all my math for me?', rating: 'poor', feedback: 'Asking someone to do your work isn\'t asking for help — it\'s asking them to cheat! Ask about the specific part you\'re stuck on.' },
          { text: '*sits quietly and gives up on the problem*', rating: 'ok', feedback: 'It\'s okay to take a break, but asking for help is a brave and smart thing to do! Everyone needs help sometimes.' },
        ]},
      ],
      feedback: [
        { context: 'Your teacher gives back your drawing with suggestions.', peer: 'This is a great start! I think adding more color in the background would make it even better.', options: [
          { text: 'Oh, that\'s a good idea! I\'ll try adding some blue for the sky.', rating: 'great', feedback: 'Wonderful! You listened to the suggestion and got excited about improving. That shows growth mindset!' },
          { text: 'But I worked really hard on it already...', rating: 'ok', feedback: 'It\'s natural to feel that way! Remember, feedback isn\'t saying your work is bad — it\'s helping you make it even better.' },
          { text: 'My drawing is fine. I don\'t need to change it.', rating: 'poor', feedback: 'Shutting down feedback means missing a chance to grow. Even professional artists take suggestions!' },
        ]},
      ],
      sharing: [
        { context: 'You and a friend both want to use the last blue marker.', peer: 'I need the blue marker for my ocean picture!', options: [
          { text: 'I need it too! How about I use it for 2 minutes and then you get it?', rating: 'great', feedback: 'Perfect sharing! You proposed a fair plan where both people get what they need.' },
          { text: '*grabs the marker* I had it first!', rating: 'poor', feedback: 'Grabbing things leads to conflict. Proposing a plan works much better than fighting over it.' },
          { text: 'Fine, you can have it. *sighs sadly*', rating: 'ok', feedback: 'Giving in is kind, but you matter too! It\'s better to suggest taking turns so BOTH of you are happy.' },
        ]},
      ],
      empathy: [
        { context: 'Your friend\'s pet hamster died over the weekend.', peer: 'My hamster Squeaky died. I miss him so much.', options: [
          { text: 'I\'m so sorry about Squeaky. That must be really hard. Do you want to tell me about your favorite memory with him?', rating: 'great', feedback: 'Beautiful empathy! You named the feeling, showed you cared, and invited them to share. That\'s exactly what a good friend does.' },
          { text: 'That\'s sad. My dog died once too.', rating: 'ok', feedback: 'Sharing a similar experience can help, but make sure to focus on THEIR loss first before sharing yours.' },
          { text: 'It was just a hamster. You can get another one.', rating: 'poor', feedback: 'Minimizing someone\'s feelings really hurts. A pet is a real friend, and losing them is a real loss. Show you care!' },
        ]},
        { context: 'A younger student fell on the playground and is crying.', peer: '*a kindergartner is sitting on the ground, holding their knee and crying*', options: [
          { text: '*kneels down* Are you okay? Let me see your knee. I\'ll walk you to the nurse.', rating: 'great', feedback: 'Wonderful! You got on their level, checked on them, and offered concrete help. That\'s leadership and empathy.' },
          { text: '*tells a nearby teacher* Hey, a kid fell over there.', rating: 'ok', feedback: 'Getting adult help is good! But walking over yourself would mean even more to the hurt child.' },
          { text: '*keeps playing and ignores them*', rating: 'poor', feedback: 'Ignoring someone who\'s hurt — especially someone younger — is a missed chance to be a helper. Helpers make the world better!' },
        ]},
      ],
    },
    middle: {
      listening: [
        { context: 'Your friend is stressed about trying out for the school play.', peer: 'I really want to get the lead role, but there are so many people auditioning. I\'ve been practicing every night but I\'m still not sure I\'m good enough.', options: [
          { text: 'It sounds like you\'ve been putting in serious work. What part of the audition are you most nervous about?', rating: 'great', feedback: 'Excellent active listening! You reflected back their effort and asked a specific question that shows you\'re engaged.' },
          { text: 'You\'ll be fine, don\'t stress about it.', rating: 'ok', feedback: 'You mean well, but dismissing their anxiety doesn\'t help them feel heard. Try acknowledging the feeling before reassuring.' },
          { text: 'I heard Morgan is auditioning too, and they\'re really good.', rating: 'poor', feedback: 'Comparing them to competition increases anxiety. A good listener validates feelings instead of adding pressure.' },
        ]},
      ],
      disagreeing: [
        { context: 'Your group project partner wants to do the whole presentation on one topic, but you think it should cover more.', peer: 'I think we should focus the entire project on climate change in the oceans. It\'s the most important topic.', options: [
          { text: 'Ocean climate change is really important — I agree. What if we used it as our main example but also briefly mentioned how climate affects forests and cities? That way we cover more ground.', rating: 'great', feedback: 'Strong! You validated their idea, built on it, and proposed a compromise that includes both perspectives.' },
          { text: 'That\'s too narrow. We need to cover more topics.', rating: 'ok', feedback: 'Your point is valid, but starting with "that\'s too narrow" can feel dismissive. Try leading with what you agree with first.' },
          { text: 'Fine, whatever you want. I don\'t care.', rating: 'poor', feedback: 'Giving up on your own ideas isn\'t healthy collaboration. Your input matters! Practice sharing your perspective respectfully.' },
        ]},
      ],
      apologizing: [
        { context: 'You accidentally shared something your friend told you in confidence.', peer: 'I can\'t believe you told people about that. I trusted you.', options: [
          { text: 'You\'re right, and I\'m really sorry. I shouldn\'t have said anything. I understand if you\'re upset, and I want you to know it won\'t happen again. What can I do to make this right?', rating: 'great', feedback: 'This is a strong apology — you took responsibility, didn\'t make excuses, validated their feelings, and asked how to repair.' },
          { text: 'I\'m sorry, but it just slipped out. I didn\'t mean to.', rating: 'ok', feedback: 'Saying "but" in an apology weakens it. The explanation is understandable, but lead with taking full responsibility.' },
          { text: 'It wasn\'t that big a deal. Everyone already knew anyway.', rating: 'poor', feedback: 'Minimizing their feelings when YOU broke their trust makes it worse. Take responsibility for your actions.' },
        ]},
      ],
      empathy: [
        { context: 'A classmate you don\'t know well is sitting alone and looks upset.', peer: '*sitting alone at lunch, staring at their food*', options: [
          { text: '*sits down nearby* Hey, mind if I sit here? You look like you might be having a tough day.', rating: 'great', feedback: 'Brave and compassionate! You approached gently, asked permission, and acknowledged their feelings without being pushy.' },
          { text: '*walks past and thinks "I hope they\'re okay"*', rating: 'ok', feedback: 'Caring thoughts are good, but action matters more. Even a small gesture — sitting nearby, saying hi — can change someone\'s day.' },
          { text: '*ignores them and sits with friends*', rating: 'poor', feedback: 'Missing an opportunity to be kind. You don\'t have to solve their problems — just letting someone know they\'re not invisible matters enormously.' },
        ]},
      ],
      feedback: [
        { context: 'Your basketball coach tells you your free throw form needs work.', peer: 'Your release point is too low and you\'re not following through. Let\'s work on your form after practice.', options: [
          { text: 'Thanks, Coach. I\'ve been missing a lot of free throws so that makes sense. I\'ll stay after practice.', rating: 'great', feedback: 'Mature response! You connected the feedback to evidence you\'ve noticed yourself and committed to improving.' },
          { text: 'But I scored 12 points last game...', rating: 'ok', feedback: 'Defending yourself is natural, but the coach is trying to make you better. Feedback on one skill doesn\'t erase your other strengths.' },
          { text: '*rolls eyes and mutters* Whatever.', rating: 'poor', feedback: 'Dismissing feedback from someone trying to help you closes the door on growth. Even if it stings, take a breath and listen.' },
        ]},
      ],
      helping: [
        { context: 'You\'re struggling with an essay and the deadline is tomorrow.', peer: '*friend who\'s good at writing is in study hall*', options: [
          { text: 'Hey, I\'m stuck on my essay — could you read my intro and tell me if my thesis makes sense? I\'m not sure it\'s clear enough.', rating: 'great', feedback: 'Specific help requests get better results! You told them exactly what you need and why.' },
          { text: 'Can you just write my conclusion? I\'m so behind.', rating: 'poor', feedback: 'Asking someone to do your work puts them in an unfair position. Ask for guidance, not ghostwriting.' },
          { text: '*struggles alone until midnight*', rating: 'ok', feedback: 'Independence is good, but asking for help isn\'t weakness — it\'s a skill. Your friend would probably be happy to help!' },
        ]},
      ],
      sharing: [
        { context: 'You and your lab partner disagree about how to set up the experiment.', peer: 'I think we should add the vinegar first, THEN the baking soda.', options: [
          { text: 'Hmm, I was thinking the opposite — but actually, let\'s try your way first and see what happens. If it doesn\'t work, we can try mine. Deal?', rating: 'great', feedback: 'Great collaboration! You shared your idea, were willing to try theirs first, and proposed a fair plan.' },
          { text: 'No, my way is right. I looked it up.', rating: 'poor', feedback: 'Even if you\'re right, shutting down your partner kills collaboration. Science is about testing ideas together!' },
          { text: 'Sure, whatever you want.', rating: 'ok', feedback: 'Going along is easy, but contributing YOUR ideas makes the partnership stronger. Speak up!' },
        ]},
      ],
      joining: [
        { context: 'Some classmates are discussing a show you also watch during break.', peer: '*group of three is excitedly talking about a TV show*', options: [
          { text: 'Oh, are you guys talking about that show? I just watched the new episode — that twist was wild!', rating: 'great', feedback: 'Natural entry! You connected to their topic with genuine enthusiasm. Shared interests are the easiest way in.' },
          { text: '*stands at the edge of the group, listening, but doesn\'t speak*', rating: 'ok', feedback: 'Observing first is fine, but waiting too long gets awkward. Jump in when there\'s a natural pause — you have something to add!' },
          { text: 'That show is dumb. You should watch *names different show* instead.', rating: 'poor', feedback: 'Insulting what others enjoy is the fastest way to NOT join a group. Find common ground, don\'t create conflict.' },
        ]},
      ],
    },
    high: {
      listening: [
        { context: 'Your friend is conflicted about choosing between two colleges.', peer: 'I got into both schools and I have to decide by Friday. One has a better program for my major but it\'s far from home. The other is closer but doesn\'t have the same reputation. I keep going back and forth.', options: [
          { text: 'That sounds like a genuinely tough call — there\'s no obviously wrong choice. What feels more important to you right now — the academic opportunity or being close to your support system?', rating: 'great', feedback: 'Sophisticated listening — you named the dilemma without minimizing it, then asked a reflective question that helps them clarify their own values.' },
          { text: 'Just go to the one with the better program. Reputation matters more than being close to home.', rating: 'ok', feedback: 'You\'re trying to help, but giving directive advice can feel dismissive of their emotional complexity. Help them think, don\'t decide for them.' },
          { text: 'At least you got into two schools! Some people don\'t get into any.', rating: 'poor', feedback: 'Comparative minimization ("others have it worse") invalidates their real struggle. Two good options can still be stressful.' },
        ]},
      ],
      disagreeing: [
        { context: 'During a class discussion, a classmate makes a claim you think is factually wrong.', peer: 'I read that vaccines cause more harm than good. There are tons of studies proving it.', options: [
          { text: 'I\'ve seen different research that suggests the opposite — that the benefits significantly outweigh the risks. Could you share which studies you\'re referring to? I\'d genuinely like to understand your sources.', rating: 'great', feedback: 'Model disagreement — you stated your position with evidence language, didn\'t attack them personally, and asked for their sources respectfully.' },
          { text: 'That\'s completely wrong and dangerous misinformation.', rating: 'ok', feedback: 'You may be factually right, but attacking the person or their claim head-on often makes them defensive. Leading with curiosity is more persuasive than confrontation.' },
          { text: '*stays silent to avoid conflict*', rating: 'ok', feedback: 'Sometimes silence is strategic, but in a class discussion about public health, your voice and evidence matter. You can disagree respectfully.' },
        ]},
      ],
      empathy: [
        { context: 'A friend comes out to you about their identity and seems nervous.', peer: 'I\'ve been wanting to tell you something. I\'m... I think I\'m bisexual. You\'re the first person I\'ve told.', options: [
          { text: 'Thank you for trusting me with that. That takes a lot of courage. How are you feeling about it? I\'m here for you whatever you need.', rating: 'great', feedback: 'Compassionate and affirming. You honored the trust, named their courage, checked in on their feelings, and offered unconditional support.' },
          { text: 'Okay, cool. It doesn\'t change anything.', rating: 'ok', feedback: 'The intent is good — normalizing it. But someone sharing something this vulnerable needs more than casual acknowledgment. The moment is significant to them.' },
          { text: 'Are you sure? Maybe it\'s just a phase.', rating: 'poor', feedback: 'Questioning someone\'s identity when they\'ve just been vulnerable is deeply invalidating. Trust their self-knowledge.' },
        ]},
      ],
      apologizing: [
        { context: 'You made a joke that unintentionally hurt someone from a different cultural background.', peer: 'That joke you made about my food — it actually really bothered me. People make comments like that all the time and it makes me feel like I don\'t belong.', options: [
          { text: 'I hear you, and I\'m sorry. I didn\'t intend to make you feel that way, but I understand why it did. Thank you for telling me — I want to learn from this. Can you help me understand more about how those comments affect you?', rating: 'great', feedback: 'Exemplary accountability — you separated intent from impact, validated their experience, thanked them for the feedback, and asked to learn more.' },
          { text: 'I\'m sorry if you were offended. I was just joking around.', rating: 'ok', feedback: '"Sorry if you were offended" puts the responsibility on THEIR reaction rather than YOUR action. Own the impact, not just the intent.' },
          { text: 'People are way too sensitive these days. It was just a joke.', rating: 'poor', feedback: 'Dismissing someone\'s pain as "sensitivity" is itself harmful. Impact matters more than intent.' },
        ]},
      ],
      feedback: [
        { context: 'Your internship supervisor gives you critical feedback on your work.', peer: 'Your report was late and had several errors. I need you to be more careful with deadlines and proofreading going forward.', options: [
          { text: 'You\'re right, and I apologize. I underestimated how long the research would take. Going forward, I\'ll build in a buffer day and run spellcheck before submitting. Can I revise and resubmit by tomorrow?', rating: 'great', feedback: 'Professional response — you acknowledged the issue, identified the root cause, proposed a specific fix, and offered to make it right.' },
          { text: 'I was really busy with school stuff last week...', rating: 'ok', feedback: 'Context can help, but leading with an excuse before acknowledging the problem can seem like deflection. Acknowledge first, then explain.' },
          { text: 'The errors weren\'t that bad. Nobody\'s perfect.', rating: 'poor', feedback: 'In professional settings, minimizing mistakes erodes trust. Taking ownership — even when it\'s uncomfortable — builds your reputation.' },
        ]},
      ],
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // AI ROLEPLAY SCENARIOS (Tier 2 — requires callGemini)
  // ═══════════════════════════════════════════════════════════════

  var AI_SCENARIOS = {
    elementary: [
      { id: 'new_kid', title: 'The New Student', setup: 'A new student just joined your class. They\'re standing alone at recess looking nervous.', peerName: 'Alex', peerDesc: 'a shy new student who just moved from another state, nervous but friendly when approached', skill: 'joining', goal: 'Make Alex feel welcome. Introduce yourself and try to include them.' },
      { id: 'broken_toy', title: 'The Broken Toy', setup: 'You accidentally broke your friend\'s favorite toy during playtime.', peerName: 'Jordan', peerDesc: 'your close friend who is upset because their favorite action figure got broken', skill: 'apologizing', goal: 'Apologize sincerely and try to make things right.' },
      { id: 'unfair_game', title: 'The Unfair Game', setup: 'You\'re playing a board game and you think your friend is cheating.', peerName: 'Sam', peerDesc: 'your friend who may not realize they\'re not following the rules correctly', skill: 'disagreeing', goal: 'Address the situation without starting a fight.' },
    ],
    middle: [
      { id: 'rumor', title: 'The Rumor', setup: 'Someone spread a rumor about your friend. Your friend is upset and asking you about it.', peerName: 'Taylor', peerDesc: 'your upset friend who heard a rumor about themselves and wants to know if you heard it too', skill: 'empathy', goal: 'Be supportive and honest without making things worse.' },
      { id: 'group_project', title: 'The Group Project', setup: 'One member of your group project hasn\'t done any work and the deadline is tomorrow.', peerName: 'Casey', peerDesc: 'a group member who hasn\'t contributed — they may have a reason, or they may be slacking', skill: 'feedback', goal: 'Address the situation fairly — find out what\'s going on and solve the problem.' },
      { id: 'lunch_table', title: 'The Lunch Table', setup: 'Your friend group is excluding someone who used to sit with you.', peerName: 'Riley', peerDesc: 'the person who\'s been excluded from the lunch table — they approach and ask to sit down', skill: 'empathy', goal: 'Be inclusive and kind, even if it\'s awkward.' },
    ],
    high: [
      { id: 'mental_health', title: 'The Worried Friend', setup: 'Your close friend has been withdrawn lately and you\'re concerned about their mental health.', peerName: 'Morgan', peerDesc: 'your close friend who has been isolating, skipping activities, and seems really down — may be dealing with depression or anxiety', skill: 'listening', goal: 'Check in genuinely without being pushy. Listen more than you talk.' },
      { id: 'peer_pressure', title: 'The Party', setup: 'At a gathering, someone is pressuring you and your friend to do something you\'re not comfortable with.', peerName: 'Drew', peerDesc: 'your friend who is also being pressured and seems unsure what to do — looking to you for support', skill: 'disagreeing', goal: 'Support your friend and stand up for both of you without being aggressive.' },
      { id: 'college_stress', title: 'The Comparison Trap', setup: 'Your friend got into their dream school and you didn\'t. They\'re celebrating and you\'re trying to be happy for them.', peerName: 'Jamie', peerDesc: 'your friend who is genuinely excited about their acceptance and doesn\'t realize you\'re struggling', skill: 'empathy', goal: 'Be genuinely happy for them while being honest about your own feelings if it comes up naturally.' },
    ],
  };

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('sociallab', {
    title: 'Social Skills Lab',
    icon: '🎭',
    category: 'relationship-skills',
    description: 'Practice real social situations — choose responses in scenarios or roleplay conversations with an AI peer',
    gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    standards: ['CASEL: Relationship Skills', 'CASEL: Social Awareness'],
    ready: true,

    render: function(ctx) {
      var h = ctx.React.createElement;
      var useState = ctx.React.useState;
      var useCallback = ctx.React.useCallback;
      var useRef = ctx.React.useRef;

      var gradeBand = ctx.gradeBand || 'elementary';
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var update = ctx.update;
      var toolData = (ctx.toolData && ctx.toolData.sociallab) || {};
      var hasAI = !!callGemini;

      // State
      var _mode = useState('menu'); var mode = _mode[0]; var setMode = _mode[1];
      var _skill = useState(null); var skill = _skill[0]; var setSkill = _skill[1];
      var _scenarioIdx = useState(0); var scenarioIdx = _scenarioIdx[0]; var setScenarioIdx = _scenarioIdx[1];
      var _feedback = useState(null); var feedback = _feedback[0]; var setFeedback = _feedback[1];
      var _showSkillCard = useState(true); var showSkillCard = _showSkillCard[0]; var setShowSkillCard = _showSkillCard[1];
      var _score = useState(0); var score = _score[0]; var setScore = _score[1];
      var _total = useState(0); var total = _total[0]; var setTotal = _total[1];
      // AI roleplay state
      var _aiScenario = useState(null); var aiScenario = _aiScenario[0]; var setAiScenario = _aiScenario[1];
      var _chatHistory = useState([]); var chatHistory = _chatHistory[0]; var setChatHistory = _chatHistory[1];
      var _chatInput = useState(''); var chatInput = _chatInput[0]; var setChatInput = _chatInput[1];
      var _chatLoading = useState(false); var chatLoading = _chatLoading[0]; var setChatLoading = _chatLoading[1];
      var _chatFeedback = useState(null); var chatFeedback = _chatFeedback[0]; var setChatFeedback = _chatFeedback[1];
      var _chatTurns = useState(0); var chatTurns = _chatTurns[0]; var setChatTurns = _chatTurns[1];
      var chatEndRef = useRef(null);
      // Rapport & emotion system for AI roleplay
      var _rapport = useState(50); var rapport = _rapport[0]; var setRapport = _rapport[1];
      var _peerMood = useState('neutral'); var peerMood = _peerMood[0]; var setPeerMood = _peerMood[1];
      var _peerGesture = useState(''); var peerGesture = _peerGesture[0]; var setPeerGesture = _peerGesture[1];
      var _peerPortrait = useState(null); var peerPortrait = _peerPortrait[0]; var setPeerPortrait = _peerPortrait[1];
      var _portraitLoading = useState(false); var portraitLoading = _portraitLoading[0]; var setPortraitLoading = _portraitLoading[1];
      var MOOD_EMOJIS = { happy: '😊', sad: '😢', angry: '😠', nervous: '😰', neutral: '😐', grateful: '🥰', confused: '😕', hurt: '😔', relieved: '😌', excited: '🤩', defensive: '😤', trusting: '🤝' };

      // ── Badges ──
      var SL_BADGES = [
        { id: 'first_scenario', label: 'First Try', emoji: '🌟', desc: 'Complete your first scenario', check: function() { return total >= 1; } },
        { id: 'perfect_set', label: 'Perfect Set', emoji: '⭐', desc: 'Get all "great" in a skill set', check: function() { return total >= 3 && score === total; } },
        { id: 'roleplay', label: 'Brave Talker', emoji: '🎤', desc: 'Complete an AI roleplay conversation', check: function() { return chatTurns >= 3; } },
        { id: 'five_great', label: 'Social Star', emoji: '🌟', desc: 'Get 5 "great" responses total', check: function() { return score >= 5; } },
        { id: 'feedback', label: 'Reflective Learner', emoji: '🪞', desc: 'Receive AI feedback on a conversation', check: function() { return chatFeedback && typeof chatFeedback === 'object' && !chatFeedback.error; } },
      ];
      var earnedBadges = SL_BADGES.filter(function(b) { return b.check(); });

      // Get scenarios for current grade
      var scenarioBank = SCENARIOS[gradeBand] || SCENARIOS.elementary;
      var aiScenarioBank = AI_SCENARIOS[gradeBand] || AI_SCENARIOS.elementary;

      // Styles
      var PURPLE = '#7c3aed';
      var card = { background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '10px' };
      var btn = function(bg, fg, dis) { return { padding: '10px 18px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; };

      // ── AI Chat Send ──
      var sendChat = useCallback(async function(userMsg) {
        if (!callGemini || !aiScenario || !userMsg.trim()) return;
        var newHistory = chatHistory.concat([{ role: 'user', text: userMsg.trim() }]);
        setChatHistory(newHistory);
        setChatInput('');
        setChatLoading(true);
        setChatTurns(function(t) { return t + 1; });
        try {
          var isElem = gradeBand === 'elementary';
          var historyText = newHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n');
          var prompt = 'You are ' + aiScenario.peerName + ', ' + aiScenario.peerDesc + '. You are a ' + gradeBand + ' school student.\n\n'
            + 'Scenario: ' + aiScenario.setup + '\n'
            + 'Current rapport with student: ' + rapport + '/100 (' + (rapport >= 70 ? 'trusting' : rapport >= 40 ? 'warming up' : 'guarded') + ')\n\n'
            + 'Conversation so far:\n' + historyText + '\n\n'
            + 'Respond as ' + aiScenario.peerName + ' would. Rules:\n'
            + '- Stay in character as a ' + gradeBand + ' school student\n'
            + '- Keep your response to 1-2 sentences (realistic for a peer conversation)\n'
            + '- React naturally to what the student said — if they were kind, warm up; if they were rude, show it affected you\n'
            + '- Use vocabulary and tone appropriate for ' + gradeBand + ' school\n'
            + (isElem ? '- Use simple words and short sentences\n' : '')
            + '- Do NOT break character or give coaching advice — you are the PEER, not a teacher\n\n'
            + 'Return JSON: {"text":"your dialogue response","mood":"happy|sad|angry|nervous|neutral|grateful|confused|hurt|relieved|excited|defensive|trusting","gesture":"smiling|looking down|crossing arms|leaning in|stepping back|nodding|shrugging|making eye contact|looking away|fidgeting","rapportChange":-10 to +10 (how much the student\'s message affected your trust)}';
          var result = await callGemini(prompt, true);
          if (result) {
            try {
              var parsed = JSON.parse(result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
              setChatHistory(function(prev) { return prev.concat([{ role: 'peer', text: parsed.text || result.trim(), mood: parsed.mood, gesture: parsed.gesture }]); });
              if (parsed.mood) setPeerMood(parsed.mood);
              if (parsed.gesture) setPeerGesture(parsed.gesture);
              if (parsed.rapportChange) {
                setRapport(function(prev) { return Math.max(0, Math.min(100, prev + (parsed.rapportChange || 0))); });
                if (parsed.rapportChange > 0) announceToSR(aiScenario.peerName + ' seems to appreciate that. Rapport increased.');
                if (parsed.rapportChange < -3) announceToSR(aiScenario.peerName + ' seems uncomfortable. Rapport decreased.');
              }
            } catch (parseErr) {
              // Fallback: treat as plain text
              setChatHistory(function(prev) { return prev.concat([{ role: 'peer', text: result.trim() }]); });
            }
          }
        } catch (err) {
          addToast && addToast('AI response failed.', 'error');
        }
        setChatLoading(false);
        setTimeout(function() { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, 100);
      }, [callGemini, aiScenario, chatHistory, gradeBand, addToast]);

      // ── Get AI Feedback on Roleplay ──
      var getConversationFeedback = useCallback(async function() {
        if (!callGemini || !aiScenario) return;
        setChatFeedback('loading');
        try {
          var historyText = chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n');
          var prompt = 'You are a warm social skills coach evaluating a ' + gradeBand + ' student\'s conversation.\n\n'
            + 'Scenario: ' + aiScenario.setup + '\n'
            + 'Skill being practiced: ' + aiScenario.skill + '\n'
            + 'Goal: ' + aiScenario.goal + '\n\n'
            + 'Conversation:\n' + historyText + '\n'
            + 'Final rapport score: ' + rapport + '/100 (started at 50)\n\n'
            + 'Provide feedback as JSON:\n'
            + '{"rating":"developing|proficient|exemplary","strengths":["1-2 things they did well"],"improvements":["1-2 specific suggestions"],"skillTip":"one concrete tip for the skill: ' + aiScenario.skill + '","overallNote":"1-2 sentence encouraging summary"}\n\n'
            + 'Grade expectations: ' + (gradeBand === 'elementary' ? 'Elementary — praise any attempt at the skill. "Exemplary" = used kind words and showed they care.' : gradeBand === 'middle' ? 'Middle school — expect some sophistication. "Exemplary" = showed genuine empathy and adjusted their approach based on the peer\'s responses.' : 'High school — expect nuance. "Exemplary" = demonstrated emotional intelligence, adapted communication style, and balanced honesty with compassion.') + '\n'
            + 'Match your feedback vocabulary to ' + gradeBand + ' level. Be encouraging!';
          var result = await callGemini(prompt, true);
          var parsed = JSON.parse(result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
          setChatFeedback(parsed);
          var xp = parsed.rating === 'exemplary' ? 30 : parsed.rating === 'proficient' ? 20 : 10;
          if (awardXP) awardXP('sociallab', xp);
          addToast && addToast('Feedback received! +' + xp + ' XP', 'success');
        } catch (err) {
          setChatFeedback({ error: 'Could not generate feedback.' });
        }
      }, [callGemini, aiScenario, chatHistory, gradeBand, awardXP, addToast]);

      // ═══ RENDER ═══

      // ── Menu ──
      if (mode === 'menu') {
        return h('div', { style: { maxWidth: '650px', margin: '0 auto', padding: '20px' } },
          h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
            h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '🎭'),
            h('h2', { style: { fontSize: '24px', fontWeight: 900, color: '#1e293b' } }, 'Social Skills Lab'),
            h('p', { style: { color: '#94a3b8', fontSize: '14px', maxWidth: '450px', margin: '0 auto' } },
              'Practice real social situations. Choose how you\'d respond in scenarios, or have a real conversation with an AI peer.')
          ),
          // Badges
          earnedBadges.length > 0 && h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }, 'aria-label': 'Earned badges' },
            earnedBadges.map(function(b) {
              return h('div', { key: b.id, title: b.desc, style: { background: '#fef3c7', borderRadius: '10px', padding: '4px 10px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '4px' } },
                h('span', { style: { fontSize: '16px' }, 'aria-hidden': 'true' }, b.emoji),
                h('span', { style: { fontSize: '10px', fontWeight: 700, color: '#92400e' } }, b.label)
              );
            })
          ),
          // Mode 1: Static Scenarios
          h('div', { style: Object.assign({}, card, { border: '2px solid #c4b5fd', background: '#faf5ff' }) },
            h('h3', { style: { fontSize: '16px', fontWeight: 800, color: PURPLE, marginBottom: '6px' } }, '📋 Scenario Practice'),
            h('p', { style: { fontSize: '12px', color: '#94a3b8', marginBottom: '12px' } }, 'Read a situation, choose the best response. Works without AI.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' } },
              SKILL_CATEGORIES.map(function(cat) {
                var scenarios = scenarioBank[cat.id];
                if (!scenarios || scenarios.length === 0) return null;
                return h('button', { key: cat.id, onClick: function() { setSkill(cat.id); setScenarioIdx(0); setFeedback(null); setScore(0); setTotal(0); setMode('scenario'); },
                  style: { padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '11px', transition: 'all 0.15s' }
                },
                  h('div', { style: { fontSize: '20px', marginBottom: '4px' } }, cat.icon),
                  h('div', { style: { fontWeight: 700, color: '#1e293b' } }, cat.label),
                  h('div', { style: { color: '#9ca3af', fontSize: '10px' } }, scenarios.length + ' scenario' + (scenarios.length > 1 ? 's' : ''))
                );
              })
            )
          ),
          // Mode 2: AI Roleplay
          h('div', { style: Object.assign({}, card, { border: '2px solid ' + (hasAI ? '#86efac' : '#fca5a5'), background: hasAI ? '#f0fdf4' : '#fef2f2' }) },
            h('h3', { style: { fontSize: '16px', fontWeight: 800, color: hasAI ? '#166534' : '#991b1b', marginBottom: '6px' } }, '🤖 AI Peer Roleplay' + (hasAI ? '' : ' (AI Required)')),
            h('p', { style: { fontSize: '12px', color: '#94a3b8', marginBottom: '12px' } }, hasAI ? 'Have a real conversation with an AI playing the role of a peer. Practice using your own words.' : 'AI roleplay requires API access. Use Scenario Practice above, or ask your teacher to enable AI.'),
            hasAI && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              aiScenarioBank.map(function(sc) {
                return h('button', { key: sc.id, onClick: function() {
                    setAiScenario(sc); setChatHistory([{ role: 'peer', text: '' }]); setChatInput(''); setChatFeedback(null); setChatTurns(0); setRapport(50); setPeerMood('neutral'); setPeerGesture(''); setPeerPortrait(null); setMode('roleplay');
                    // Generate opening line
                    if (callGemini) {
                      callGemini('You are ' + sc.peerName + ', ' + sc.peerDesc + '. Scenario: ' + sc.setup + '. Say your opening line as ' + sc.peerName + ' — 1 sentence, natural, in-character as a ' + gradeBand + ' school student. Return ONLY the dialogue.', false).then(function(line) {
                        setChatHistory([{ role: 'peer', text: line ? line.trim() : 'Hey...' }]);
                      }).catch(function() { setChatHistory([{ role: 'peer', text: 'Hey...' }]); });
                    }
                  },
                  style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fff', border: '1px solid #bbf7d0', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }
                },
                  h('div', { style: { width: '36px', height: '36px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 } }, SKILL_CATEGORIES.find(function(c) { return c.id === sc.skill; })?.icon || '🎭'),
                  h('div', null,
                    h('div', { style: { fontWeight: 700, fontSize: '13px', color: '#1e293b' } }, sc.title),
                    h('div', { style: { fontSize: '11px', color: '#94a3b8' } }, sc.setup.substring(0, 60) + '...')
                  )
                );
              })
            )
          ),
          // Clinical note
          h('div', { style: { marginTop: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#1e40af' } },
            h('strong', null, 'Clinical note: '),
            'Social Skills Lab practices pragmatic language and social communication skills targeted in ASD intervention. ',
            'Scenario Practice (Tier 1) works without AI for structured discrete-trial-style practice. ',
            'AI Roleplay (Tier 2) provides dynamic conversation practice for generalization. ',
            'Both modes support IEP goals like "Student will use appropriate social greetings in 4/5 opportunities."'
          )
        );
      }

      // ── Scenario Practice Mode ──
      if (mode === 'scenario' && skill) {
        var scenarios = scenarioBank[skill] || [];
        var current = scenarios[scenarioIdx % scenarios.length];
        if (!current) return h('div', null, 'No scenarios available for this skill.');
        var cat = SKILL_CATEGORIES.find(function(c) { return c.id === skill; });

        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Back'),
            h('span', { style: { fontSize: '13px', fontWeight: 700, color: '#16a34a' } }, '✅ ' + score + '/' + total),
            h('span', { style: { fontSize: '12px', color: '#94a3b8' } }, cat ? cat.icon + ' ' + cat.label : skill)
          ),
          // Skill Teaching Card (collapsible — always available)
          h('div', { style: { background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' } },
            h('button', { onClick: function() { setShowSkillCard(!showSkillCard); },
              style: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
              'aria-expanded': showSkillCard, 'aria-label': 'Toggle skill tips' },
              h('span', { style: { fontSize: '12px', fontWeight: 800, color: '#1e40af' } }, '📚 Skill: ' + (cat ? cat.label : skill)),
              h('span', { style: { fontSize: '14px', color: '#1e40af', transition: 'transform 0.2s', transform: showSkillCard ? 'rotate(180deg)' : 'rotate(0deg)' } }, '▼')
            ),
            showSkillCard && h('div', { style: { padding: '0 14px 14px' } },
            h('div', { style: { fontSize: '12px', color: '#1e3a8a', lineHeight: 1.6 } },
              skill === 'listening' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '3 Steps of Active Listening:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Look & Focus'), ' — Face the person, put away distractions'),
                  h('li', null, h('strong', null, 'Reflect Back'), ' — "It sounds like you feel..." or "So what happened was..."'),
                  h('li', null, h('strong', null, 'Ask a Follow-Up'), ' — "What happened next?" or "How did that make you feel?"')
                )
              ) :
              skill === 'joining' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '3 Steps to Join a Group:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Watch First'), ' — Observe what they\'re doing'),
                  h('li', null, h('strong', null, 'Find a Connection'), ' — Comment on what they\'re doing or ask about it'),
                  h('li', null, h('strong', null, 'Ask Politely'), ' — "Can I join?" or "That looks fun — room for one more?"')
                )
              ) :
              skill === 'disagreeing' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, 'The Respectful Disagreement Formula:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Acknowledge'), ' — "I see your point..." or "That\'s interesting..."'),
                  h('li', null, h('strong', null, 'Share Your View'), ' — "I was thinking..." or "What if we..."'),
                  h('li', null, h('strong', null, 'Suggest a Compromise'), ' — "How about we try both?" or "What do you think about..."')
                )
              ) :
              skill === 'apologizing' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '4 Parts of a Real Apology:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Say Sorry'), ' — "I\'m sorry for..."'),
                  h('li', null, h('strong', null, 'Own It'), ' — "That was my fault because..."'),
                  h('li', null, h('strong', null, 'Acknowledge the Impact'), ' — "I know that made you feel..."'),
                  h('li', null, h('strong', null, 'Make It Right'), ' — "Can I help fix it?" or "I\'ll do better by..."')
                )
              ) :
              skill === 'helping' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '3 Tips for Asking for Help:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Be Specific'), ' — Say exactly what you need help with'),
                  h('li', null, h('strong', null, 'Be Polite'), ' — "Could you..." or "Would you mind..."'),
                  h('li', null, h('strong', null, 'Say Thanks'), ' — Show appreciation for their time')
                )
              ) :
              skill === 'feedback' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '3 Steps to Receive Feedback:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Listen First'), ' — Don\'t interrupt or defend yet'),
                  h('li', null, h('strong', null, 'Find the Truth'), ' — Even hard feedback usually has something useful'),
                  h('li', null, h('strong', null, 'Thank & Plan'), ' — "Thanks for telling me. I\'ll work on that."')
                )
              ) :
              skill === 'sharing' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, 'Fair Sharing Strategies:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Take Turns'), ' — "I\'ll go first for 2 minutes, then you"'),
                  h('li', null, h('strong', null, 'Compromise'), ' — "Let\'s combine our ideas"'),
                  h('li', null, h('strong', null, 'Check In'), ' — "Does that seem fair to you?"')
                )
              ) :
              skill === 'empathy' ? h('div', null,
                h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '3 Ways to Show Empathy:'),
                h('ol', { style: { margin: '0 0 0 16px', padding: 0 } },
                  h('li', null, h('strong', null, 'Name the Feeling'), ' — "That sounds really frustrating" or "I can see you\'re sad"'),
                  h('li', null, h('strong', null, 'Show You Care'), ' — "I\'m here for you" or "That must be really hard"'),
                  h('li', null, h('strong', null, 'Offer Support'), ' — "Is there anything I can do?" or "Do you want to talk about it?"')
                )
              ) :
              h('p', null, cat ? cat.desc : '')
            ))
          ),
          // Scenario
          h('div', { style: { background: '#fef3c7', border: '2px solid #fde68a', borderRadius: '14px', padding: '16px', marginBottom: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: '6px' } }, 'The Situation'),
            h('p', { style: { fontSize: '14px', color: '#1e293b', lineHeight: 1.6 } }, current.context)
          ),
          // Peer's line
          h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '16px' } },
            h('div', { style: { width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 } }, '🗣️'),
            h('div', { style: { background: '#e0e7ff', borderRadius: '12px 12px 12px 0', padding: '12px 16px', fontSize: '14px', color: '#1e293b', lineHeight: 1.5, flex: 1 } },
              callTTS && h('button', { onClick: function() { callTTS(current.peer, ctx.selectedVoice || 'Puck', 1); }, style: { float: 'right', fontSize: '10px', background: 'none', border: '1px solid #a5b4fc', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', color: '#4338ca' } }, '🔊'),
              current.peer
            )
          ),
          feedback && h('div', { style: { padding: '14px', borderRadius: '12px', marginBottom: '16px', background: feedback.ok ? '#dcfce7' : feedback.rating === 'ok' ? '#fef3c7' : '#fee2e2', border: '1px solid ' + (feedback.ok ? '#86efac' : feedback.rating === 'ok' ? '#fde68a' : '#fca5a5'), color: feedback.ok ? '#166534' : feedback.rating === 'ok' ? '#92400e' : '#991b1b', fontSize: '13px', fontWeight: 600 } }, feedback.msg),
          // Response options
          !feedback && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, role: 'group', 'aria-label': 'Choose your response' },
            current.options.map(function(opt, oi) {
              return h('button', { key: oi, 'aria-label': 'Response ' + String.fromCharCode(65 + oi) + ': ' + opt.text, onClick: function() {
                  setTotal(function(t) { return t + 1; });
                  if (opt.rating === 'great') {
                    sfxCorrect();
                    setScore(function(s) { return s + 1; });
                    setFeedback({ ok: true, msg: '⭐ ' + opt.feedback, rating: opt.rating });
                    announceToSR('Great response! ' + opt.feedback);
                    if (awardXP) awardXP('sociallab', 10);
                  } else {
                    sfxNeutral();
                    setFeedback({ ok: false, msg: (opt.rating === 'ok' ? '🤔 ' : '❌ ') + opt.feedback, rating: opt.rating });
                    announceToSR((opt.rating === 'ok' ? 'Good try. ' : 'Not the best choice. ') + opt.feedback);
                    if (opt.rating === 'ok' && awardXP) awardXP('sociallab', 5);
                  }
                },
                style: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontSize: '13px', lineHeight: 1.5 }
              },
                h('span', { style: { background: '#f1f5f9', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', color: '#94a3b8', flexShrink: 0 } }, String.fromCharCode(65 + oi)),
                h('span', null, opt.text)
              );
            })
          ),
          // Next button
          feedback && h('div', { style: { textAlign: 'center', marginTop: '12px' } },
            h('button', { onClick: function() {
              if (scenarioIdx + 1 < scenarios.length) {
                setScenarioIdx(scenarioIdx + 1); setFeedback(null);
              } else {
                addToast && addToast('Skill complete! ' + score + '/' + total + ' great responses.', 'success');
                setMode('menu');
              }
            }, style: btn(PURPLE, '#fff', false) }, scenarioIdx + 1 < scenarios.length ? 'Next Scenario →' : '✓ Finish')
          )
        );
      }

      // ── AI Roleplay Mode ──
      if (mode === 'roleplay' && aiScenario) {
        return h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' } },
          // Header
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Back'),
            h('div', { style: { textAlign: 'right' } },
              h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }, aiScenario.title),
              h('div', { style: { fontSize: '10px', color: '#94a3b8' } }, 'Talking to ' + aiScenario.peerName + ' · ' + chatTurns + ' turns')
            )
          ),
          // Peer profile + rapport bar
          h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb', flexShrink: 0 } },
            // Peer avatar with mood
            h('div', { style: { position: 'relative', flexShrink: 0 } },
              peerPortrait
                ? h('img', { src: peerPortrait, alt: aiScenario.peerName, style: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '3px solid ' + (rapport >= 70 ? '#22c55e' : rapport >= 40 ? '#f59e0b' : '#ef4444') } })
                : h('div', { style: { width: '44px', height: '44px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '3px solid ' + (rapport >= 70 ? '#22c55e' : rapport >= 40 ? '#f59e0b' : '#ef4444') } }, MOOD_EMOJIS[peerMood] || '😐'),
              h('div', { style: { position: 'absolute', bottom: -2, right: -2, fontSize: '14px', background: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }, title: peerMood + (peerGesture ? ' — ' + peerGesture : ''), 'aria-label': aiScenario.peerName + ' is feeling ' + peerMood }, MOOD_EMOJIS[peerMood] || '😐')
            ),
            h('div', { style: { flex: 1 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' } },
                h('span', { style: { fontSize: '13px', fontWeight: 700, color: '#1e293b' } }, aiScenario.peerName),
                h('span', { style: { fontSize: '10px', color: '#94a3b8' } }, peerGesture ? '*' + peerGesture + '*' : '')
              ),
              // Rapport bar
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                h('span', { style: { fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' } }, 'Rapport'),
                h('div', { style: { flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }, role: 'progressbar', 'aria-valuenow': rapport, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Rapport with ' + aiScenario.peerName + ': ' + rapport + ' percent' },
                  h('div', { style: { height: '100%', width: rapport + '%', background: rapport >= 70 ? '#22c55e' : rapport >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : '#ef4444', borderRadius: '3px', transition: 'all 0.5s' } })
                ),
                h('span', { style: { fontSize: '10px', fontWeight: 700, color: rapport >= 70 ? '#16a34a' : rapport >= 40 ? '#d97706' : '#dc2626', minWidth: '28px', textAlign: 'right' } }, rapport + '%')
              )
            ),
            // Generate portrait button
            ctx.callImagen && !peerPortrait && !portraitLoading && h('button', { onClick: async function() {
              setPortraitLoading(true);
              try {
                var prompt = 'Portrait of a ' + gradeBand + ' school student named ' + aiScenario.peerName + ': ' + aiScenario.peerDesc.split(',').slice(0, 2).join(',') + '. Friendly, expressive face. Children\'s book illustration style. Circular crop. White background. STRICTLY NO TEXT.';
                var url = await ctx.callImagen(prompt, 200, 0.85);
                if (url) setPeerPortrait(url);
              } catch (err) {}
              setPortraitLoading(false);
            }, style: { fontSize: '9px', background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }, 'aria-label': 'Generate portrait' }, portraitLoading ? '⏳' : '🎨'),
            portraitLoading && h('span', { style: { fontSize: '9px', color: '#94a3b8' } }, '⏳')
          ),
          // Goal banner
          h('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#1e40af', flexShrink: 0 } },
            h('strong', null, 'Your goal: '), aiScenario.goal
          ),
          // Rapport milestones
          rapport >= 70 && chatTurns >= 2 && h('div', { style: { background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '6px 12px', marginBottom: '8px', fontSize: '11px', color: '#166534', fontWeight: 600, textAlign: 'center', flexShrink: 0 } }, '🤝 ' + aiScenario.peerName + ' trusts you! Great social skills!'),
          rapport <= 20 && chatTurns >= 2 && h('div', { style: { background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '6px 12px', marginBottom: '8px', fontSize: '11px', color: '#991b1b', fontWeight: 600, textAlign: 'center', flexShrink: 0 } }, '⚠️ ' + aiScenario.peerName + ' seems uncomfortable. Try being more empathetic.'),
          // Chat messages
          h('div', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation with ' + aiScenario.peerName, 'aria-busy': chatLoading ? 'true' : 'false', style: { flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            chatHistory.map(function(msg, i) {
              var isPeer = msg.role === 'peer';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isPeer ? 'flex-start' : 'flex-end', gap: '8px' } },
                isPeer && h('div', { style: { width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }, 'aria-hidden': 'true' }, msg.mood ? (MOOD_EMOJIS[msg.mood] || '😐') : '🗣️'),
                h('div', { style: { maxWidth: '75%', padding: '10px 14px', borderRadius: isPeer ? '12px 12px 12px 0' : '12px 12px 0 12px', background: isPeer ? '#e0e7ff' : '#dcfce7', color: '#1e293b', fontSize: '13px', lineHeight: 1.5 } },
                  isPeer && h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#4338ca', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' } },
                    aiScenario.peerName,
                    msg.gesture && h('span', { style: { fontSize: '9px', fontStyle: 'italic', color: '#818cf8', fontWeight: 500 } }, '*' + msg.gesture + '*')
                  ),
                  msg.text || '...'
                ),
                !isPeer && h('div', { style: { width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }, 'aria-hidden': 'true' }, '😊')
              );
            }),
            chatLoading && h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' } }, '🗣️'),
              h('div', { style: { background: '#e0e7ff', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: '#94a3b8' } }, aiScenario.peerName + ' is typing...')
            ),
            h('div', { ref: chatEndRef })
          ),
          // Conversation feedback
          chatFeedback && typeof chatFeedback === 'object' && !chatFeedback.error && h('div', { style: { background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '14px', padding: '16px', marginBottom: '12px', flexShrink: 0 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
              h('strong', { style: { color: '#166534', fontSize: '14px' } }, '📝 Conversation Feedback'),
              h('span', { style: { fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: chatFeedback.rating === 'exemplary' ? '#dcfce7' : chatFeedback.rating === 'proficient' ? '#dbeafe' : '#fef3c7', color: chatFeedback.rating === 'exemplary' ? '#166534' : chatFeedback.rating === 'proficient' ? '#1e40af' : '#92400e' } },
                chatFeedback.rating === 'exemplary' ? '⭐ Exemplary' : chatFeedback.rating === 'proficient' ? '✅ Proficient' : '📈 Developing')
            ),
            chatFeedback.overallNote && h('p', { style: { fontSize: '13px', color: '#374151', marginBottom: '8px' } }, chatFeedback.overallNote),
            chatFeedback.strengths && h('div', { style: { marginBottom: '6px' } }, h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#16a34a' } }, '💪 Strengths'), h('ul', { style: { margin: '4px 0 0 16px', fontSize: '12px', color: '#166534' } }, chatFeedback.strengths.map(function(s, i) { return h('li', { key: i }, s); }))),
            chatFeedback.improvements && h('div', { style: { marginBottom: '6px' } }, h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#d97706' } }, '🤔 Try Next Time'), h('ul', { style: { margin: '4px 0 0 16px', fontSize: '12px', color: '#92400e' } }, chatFeedback.improvements.map(function(s, i) { return h('li', { key: i }, s); }))),
            chatFeedback.skillTip && h('div', { style: { background: '#eff6ff', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#1e40af', border: '1px solid #bfdbfe' } }, h('strong', null, '💡 Skill Tip: '), chatFeedback.skillTip)
          ),
          chatFeedback === 'loading' && h('p', { style: { textAlign: 'center', fontSize: '12px', color: '#94a3b8' } }, '⏳ Analyzing your conversation...'),
          chatFeedback && chatFeedback.error && h('p', { style: { color: '#dc2626', fontSize: '12px' } }, chatFeedback.error),
          // Input bar
          !chatFeedback && h('div', { style: { display: 'flex', gap: '8px', flexShrink: 0 } },
            h('input', { type: 'text', value: chatInput, onChange: function(ev) { setChatInput(ev.target.value); },
              onKeyDown: function(ev) { if (ev.key === 'Enter' && chatInput.trim() && !chatLoading) sendChat(chatInput); },
              placeholder: 'Type what you would say...', disabled: chatLoading,
              style: { flex: 1, padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '14px', outline: 'none' },
              'aria-label': 'Your response' }),
            // Speech-to-text button
            ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && h('button', { onClick: function() {
              var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
              var rec = new SpeechRec();
              rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
              rec.onresult = function(ev) { var t = ev.results[0][0].transcript; setChatInput(function(prev) { return prev ? prev + ' ' + t : t; }); };
              rec.onerror = function() { addToast && addToast('Voice input failed. Try typing instead.', 'info'); };
              rec.start();
              addToast && addToast('Listening... speak now!', 'info');
            }, disabled: chatLoading, style: btn('#f1f5f9', '#374151', chatLoading), 'aria-label': 'Voice input' }, '🎤'),
            h('button', { onClick: function() { if (chatInput.trim()) sendChat(chatInput); }, disabled: !chatInput.trim() || chatLoading,
              style: btn(PURPLE, '#fff', !chatInput.trim() || chatLoading) }, '→')
          ),
          // Get feedback + export buttons
          !chatFeedback && chatTurns >= 3 && h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px', flexShrink: 0 } },
            h('button', { onClick: getConversationFeedback, style: { fontSize: '12px', color: PURPLE, background: 'none', border: '1px dashed #c4b5fd', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' } }, '✨ Get Feedback on This Conversation'),
            h('button', { onClick: function() {
              var text = '🎭 Social Skills Lab — Conversation Transcript\n'
                + 'Scenario: ' + aiScenario.title + '\n'
                + 'Skill: ' + aiScenario.skill + '\n'
                + 'Date: ' + new Date().toLocaleDateString() + '\n'
                + '───────────────────────────────\n\n'
                + chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n\n')
                + (chatFeedback && typeof chatFeedback === 'object' ? '\n\n───────────────────────────────\nFeedback: ' + chatFeedback.overallNote + '\nRating: ' + chatFeedback.rating : '');
              var blob = new Blob([text], { type: 'text/plain' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a'); a.href = url; a.download = 'sociallab_transcript_' + aiScenario.id + '.txt'; a.click(); URL.revokeObjectURL(url);
              addToast && addToast('Transcript saved!', 'success');
            }, style: { fontSize: '12px', color: '#94a3b8', background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' } }, '📄 Save Transcript')
          ),
          // Also show export after feedback
          chatFeedback && typeof chatFeedback === 'object' && !chatFeedback.error && h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px', flexShrink: 0 } },
            h('button', { onClick: function() { setMode('menu'); }, style: btn('#f1f5f9', '#374151', false) }, '← Try Another Scenario'),
            h('button', { onClick: function() {
              var text = '🎭 Social Skills Lab — Conversation Transcript\n'
                + 'Scenario: ' + aiScenario.title + ' (' + aiScenario.skill + ')\n'
                + 'Date: ' + new Date().toLocaleDateString() + '\n'
                + 'Rating: ' + (chatFeedback.rating || '') + '\n'
                + '───────────────────────────────\n\n'
                + chatHistory.map(function(m) { return (m.role === 'user' ? 'Student' : aiScenario.peerName) + ': ' + m.text; }).join('\n\n')
                + '\n\n───────────────────────────────\n'
                + 'FEEDBACK\n'
                + (chatFeedback.overallNote || '') + '\n'
                + 'Strengths: ' + (chatFeedback.strengths || []).join('; ') + '\n'
                + 'Try Next Time: ' + (chatFeedback.improvements || []).join('; ') + '\n'
                + 'Skill Tip: ' + (chatFeedback.skillTip || '');
              var blob = new Blob([text], { type: 'text/plain' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a'); a.href = url; a.download = 'sociallab_transcript_' + aiScenario.id + '.txt'; a.click(); URL.revokeObjectURL(url);
              addToast && addToast('Transcript with feedback saved!', 'success');
            }, style: btn('#f1f5f9', '#374151', false) }, '📄 Save Transcript')
          )
        );
      }

      return h('div', null, 'Loading...');
    }
  });

  console.log('[SEL] Social Skills Lab tool registered');
})();
