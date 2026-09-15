// ═══════════════════════════════════════════════════════════════
// sel_tool_friendship.js — Friendship Workshop (v1.0)
// Concrete, skills-based friendship development: self-assessment,
// conversation starters, maintenance strategies, conflict navigation,
// repair/forgiveness, and AI scenario practice.
// Built for students who want friends but need explicit strategies —
// especially students with ASD, ADHD, and social communication needs.
// Registered tool ID: "friendship"
// Category: relationship-skills
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
  (function() {
    if (document.getElementById('allo-live-friendship')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-friendship';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() { if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _audioCtx; }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try { var osc = ac.createOscillator(); var gain = ac.createGain(); osc.type = type || 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(vol || 0.1, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15)); osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + (dur || 0.15)); } catch(e) {}
  }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxHeart() { playTone(392, 0.15, 'sine', 0.06); setTimeout(function() { playTone(494, 0.15, 'sine', 0.06); }, 120); setTimeout(function() { playTone(587, 0.2, 'sine', 0.07); }, 240); }
  function sfxComplete() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }

  // ══════════════════════════════════════════════════════════════
  // ── Content ──
  // ══════════════════════════════════════════════════════════════

  // Friendship styles (self-assessment)
  var FRIEND_STYLES = [
    { id: 'helper',    icon: '\uD83E\uDD1D', label: 'The Helper',     desc: 'You show love by doing things for people. You notice when someone needs help and jump in.', strength: 'People feel supported around you.', watchFor: 'Make sure you let people help YOU too.' },
    { id: 'listener',  icon: '\uD83D\uDC42', label: 'The Listener',   desc: 'You show love by really hearing people. You remember what they said and ask follow-up questions.', strength: 'People feel understood around you.', watchFor: 'Don\u2019t forget to share your own stories too.' },
    { id: 'adventurer', icon: '\uD83C\uDF1F', label: 'The Adventurer', desc: 'You show love by sharing experiences. You want to DO things together \u2014 play, explore, create.', strength: 'People have fun around you.', watchFor: 'Some friends need quiet time too. That\u2019s okay.' },
    { id: 'loyalist',  icon: '\uD83D\uDEE1\uFE0F', label: 'The Loyalist',  desc: 'You show love by being reliable. You keep secrets, show up when you say you will, and stand by people.', strength: 'People trust you deeply.', watchFor: 'It\u2019s okay to have more than one close friend.' },
    { id: 'includer',  icon: '\uD83C\uDF08', label: 'The Includer',   desc: 'You show love by making sure nobody is left out. You notice the kid sitting alone and invite them in.', strength: 'People feel welcome around you.', watchFor: 'You deserve to feel included too, not just the includer.' },
    { id: 'cheerleader', icon: '\uD83C\uDF89', label: 'The Cheerleader', desc: 'You show love by celebrating others. You get excited about your friends\u2019 wins and hype them up.', strength: 'People feel confident around you.', watchFor: 'Your own wins matter just as much. Celebrate yourself too.' },
  ];

  // Conversation starters by grade band
  var STARTERS = {
    elementary: [
      { situation: 'Someone is playing a game you like', say: 'That looks fun! Can I play too?', why: 'Compliment + question is the friendliest way to join in.' },
      { situation: 'You\u2019re sitting next to someone new at lunch', say: 'Hi! I\u2019m ___. What\u2019s your favorite thing to do at recess?', why: 'Name + easy question gives them something to answer.' },
      { situation: 'Someone has a cool shirt/backpack/toy', say: 'I like your ___! Where did you get it?', why: 'Noticing something they chose shows you\u2019re paying attention.' },
      { situation: 'You want to join a group at recess', say: 'Can I play with you guys? I can be on any team.', why: 'Being flexible makes it easy for them to say yes.' },
      { situation: 'Someone looks sad or lonely', say: 'Hey, are you okay? Do you want to hang out with me?', why: 'Checking in + offering your company is brave and kind.' },
      { situation: 'A group project with someone you don\u2019t know', say: 'What part do you want to do? I\u2019m good at ___.', why: 'Asking their preference and sharing yours builds teamwork fast.' },
    ],
    middle: [
      { situation: 'You share a class with someone you want to know better', say: 'Hey, did you understand the homework? I\u2019m confused about ___.', why: 'Asking for help is actually a friendship builder \u2014 it shows trust.' },
      { situation: 'Someone mentions something you\u2019re also into', say: 'Wait, you like ___ too? What\u2019s your favorite ___?', why: 'Shared interests are the #1 friendship catalyst at this age.' },
      { situation: 'You want to hang out outside school', say: 'A bunch of us are going to ___. Want to come?', why: 'Group invitations feel lower-pressure than one-on-one at first.' },
      { situation: 'Someone did well on a presentation', say: 'That was really good. How did you know so much about that?', why: 'Genuine compliment + curiosity \u2014 people love talking about what they know.' },
      { situation: 'You\u2019re new and don\u2019t know anyone', say: 'I just transferred here. Is there anything I should know about this school?', why: 'Asking for insider info makes them an expert and you a learner \u2014 instant connection.' },
      { situation: 'A friend of a friend you want to know', say: 'I\u2019ve heard about you from ___. They said you\u2019re really into ___.', why: 'Mutual connection + something positive they said creates instant warmth.' },
    ],
    high: [
      { situation: 'Someone in your study group you respect', say: 'You always seem to get this stuff. Would you want to study together sometime?', why: 'Acknowledging someone\u2019s competence while proposing shared time builds intellectual friendship.' },
      { situation: 'You want deeper connection with an acquaintance', say: 'We\u2019ve been in classes together for a while but I feel like I don\u2019t really know you. What\u2019s your thing?', why: 'Vulnerability + genuine curiosity. Most people are waiting for someone to ask.' },
      { situation: 'After a meaningful class discussion', say: 'What you said about ___ really made me think. Do you want to grab lunch and talk more?', why: 'Referencing something specific they said shows you were truly listening.' },
      { situation: 'Someone going through something difficult', say: 'I don\u2019t want to pry, but I wanted you to know I noticed and I\u2019m here if you need anything.', why: 'Acknowledging without forcing. The door is open without pressure to walk through it.' },
      { situation: 'Reconnecting with someone you drifted from', say: 'I miss how we used to talk. Life got busy but I don\u2019t want to lose this.', why: 'Honesty about the drift + desire to reconnect. Most people feel the same but won\u2019t say it first.' },
      { situation: 'Building friendship across difference', say: 'We\u2019re pretty different in a lot of ways. I think that\u2019s actually cool. Tell me about ___.', why: 'Naming the difference openly removes the tension. Curiosity replaces distance.' },
    ]
  };

  // Friendship repair strategies
  var REPAIR_STEPS = {
    elementary: [
      { step: 'Wait', icon: '\u23F8\uFE0F', desc: 'If you\u2019re still really upset, wait until you\u2019re calm. You can\u2019t fix things when your brain is in the red zone.', tip: 'Try taking 5 deep breaths first.' },
      { step: 'Think About Their Side', icon: '\uD83E\uDD14', desc: 'Try to imagine how your friend feels. Even if you\u2019re hurt, they might be hurt too.', tip: 'Ask yourself: "What might they have been feeling when they did that?"' },
      { step: 'Use an I-Message', icon: '\uD83D\uDDE3\uFE0F', desc: 'Say "I felt ___ when you ___ because ___." This tells them how YOU feel without blaming.', tip: 'Example: "I felt left out when you played with Jordan because I thought we were going to play together."' },
      { step: 'Listen to Them', icon: '\uD83D\uDC42', desc: 'Let them tell their side. Don\u2019t interrupt. You might learn something you didn\u2019t know.', tip: 'Nod and say "I hear you" even if you disagree.' },
      { step: 'Find a Fix Together', icon: '\uD83E\uDD1D', desc: 'Ask: "What can we do so this doesn\u2019t happen again?" Make a plan together.', tip: 'Both people should agree on the plan. A one-sided fix doesn\u2019t last.' },
    ],
    middle: [
      { step: 'Cool Down First', icon: '\u23F8\uFE0F', desc: 'Trying to repair a friendship while emotionally activated almost always makes things worse. Give yourself time \u2014 hours or even a day.', tip: 'Write down what you want to say before you say it. Editing is easier on paper.' },
      { step: 'Perspective-Take', icon: '\uD83E\uDD14', desc: 'Before approaching them, genuinely try to see the situation from their perspective. Not to excuse behavior, but to understand motivation.', tip: 'Complete this sentence: "They probably did that because they were feeling ___."' },
      { step: 'Own Your Part', icon: '\uD83D\uDCAC', desc: 'Almost every conflict has two sides. Even if they did something worse, acknowledge what you contributed. This disarms defensiveness.', tip: '"I know I also ___, and I\u2019m sorry for that part."' },
      { step: 'Express Without Attacking', icon: '\uD83D\uDDE3\uFE0F', desc: 'Use "I" statements: "I felt hurt when ___." Avoid "You always ___" or "You never ___" \u2014 those trigger defense, not understanding.', tip: 'Focus on the specific event, not character judgments.' },
      { step: 'Negotiate & Rebuild', icon: '\uD83E\uDD1D', desc: 'Ask what they need from you going forward, and share what you need from them. Friendship repair is mutual.', tip: 'Trust rebuilds through consistent small actions, not one big conversation.' },
    ],
    high: [
      { step: 'Regulate Before Engaging', icon: '\u23F8\uFE0F', desc: 'Neuroscience: when your amygdala is activated, your prefrontal cortex (rational thinking) goes offline. You literally cannot have a productive conversation in that state.', tip: 'Wait until you can describe the situation factually without your voice shaking.' },
      { step: 'Examine Your Narrative', icon: '\uD83E\uDD14', desc: 'We all construct stories about what happened and why. Check yours for attribution errors: are you assuming the worst about their intent? Do you have all the information?', tip: 'Fundamental Attribution Error: we explain others\u2019 behavior by their character but our own by our circumstances.' },
      { step: 'Lead with Vulnerability', icon: '\uD83D\uDCAC', desc: 'Bren\u00E9 Brown\u2019s research: vulnerability is the birthplace of connection. Starting with "I was hurt" rather than "You hurt me" changes the entire dynamic of the conversation.', tip: 'Vulnerability ≠ weakness. It takes more courage to say "I\u2019m hurt" than "You\u2019re wrong."' },
      { step: 'Hold Space for Complexity', icon: '\uD83C\uDF10', desc: 'Two things can be true: you were hurt AND they didn\u2019t intend to hurt you. They were wrong AND they\u2019re still a good person. Repair requires holding complexity.', tip: 'The goal isn\u2019t agreement on what happened. It\u2019s understanding of how each person experienced it.' },
      { step: 'Decide What This Friendship Is Worth', icon: '\u2696\uFE0F', desc: 'Not every friendship should be repaired. Some people are harmful and you deserve to walk away. But many conflicts between good people are just pain meeting pain. Those are worth the work.', tip: 'Ask: "Does this person make my life better more often than they make it worse?" If yes, repair. If not, release with grace.' },
    ]
  };

  // When friendships end — normalizing healthy endings
  var ENDING_TRUTHS = {
    elementary: [
      'Sometimes friends grow in different directions. That\u2019s not anyone\u2019s fault.',
      'You can miss someone and still know it\u2019s okay that you\u2019re not close anymore.',
      'One friendship ending doesn\u2019t mean something is wrong with you.',
      'The things you learned from that friendship stay with you forever.',
    ],
    middle: [
      'Friendships have seasons. Some last a lifetime. Some last a school year. Both can be real.',
      'Outgrowing a friendship isn\u2019t betrayal. It\u2019s growth. You\u2019re allowed to become who you\u2019re becoming.',
      'Grief over a friendship ending is as valid as grief over any loss. Don\u2019t let anyone minimize it.',
      'The best ending is one where you can look back with gratitude instead of bitterness.',
    ],
    high: [
      'Not every significant relationship is meant to be permanent. Impermanence doesn\u2019t diminish meaning.',
      'Sometimes the most loving thing you can do for a friendship is let it evolve into something different \u2014 or let it go entirely.',
      'The skills you built in that friendship \u2014 trust, vulnerability, conflict navigation \u2014 don\u2019t disappear when the friendship does. They\u2019re yours now.',
      'Rilke wrote: "Perhaps all the dragons in our lives are princesses who are only waiting to see us act, just once, with beauty and courage." Friendship endings are those dragons.',
    ]
  };

  // Digital friendship dilemmas (middle-school first; bands degrade gracefully)
  var DIGITAL_DILEMMAS = {
  "elementary": [
    {
      "id": "tone",
      "title": "When a joke hurts",
      "situation": "You sent a joke in a message. Your friend says it was mean and asks you to stop.",
      "known": "Your friend said the message hurt and asked for it to stop.",
      "unknown": "You do not know whether they want to discuss it now. Your intention does not decide their response.",
      "needs": "Your friend needs the joke to stop. You can own the message without demanding reassurance.",
      "change": "Your friend says, 'I do not want to talk about it today.'",
      "review": "Check whether you stopped the joke and respected their space. Forgiveness is not the measure of a useful response.",
      "options": [
        {
          "label": "Own the message",
          "response": "I sent that joke. I am sorry it hurt you. I will stop using it.",
          "fit": "A brief acknowledgment can fit when the friend is willing to receive a message.",
          "limit": "Do not repeat the joke, argue about their feelings or ask them to forgive you.",
          "id": "a"
        },
        {
          "label": "Give space first",
          "response": "Stop the joke and leave the friend room. If needed, ask a trusted adult how to put things right without more messages.",
          "fit": "This can fit when the friend wants space or another message could feel like pressure.",
          "limit": "Space is not permission to keep joking elsewhere. You can still change your own behavior.",
          "id": "b"
        }
      ]
    },
    {
      "id": "left_out",
      "title": "A photo without you",
      "situation": "You see a photo of two friends playing together. You were not there and feel left out.",
      "known": "The photo shows them together for one activity.",
      "unknown": "You do not know who arranged it, why it was small, or what it says about other invitations.",
      "needs": "Your hurt matters. Your friends can also spend time with different people without proving loyalty.",
      "change": "You learn that a message mocking you was added to the photo.",
      "review": "Distinguish an ordinary separate activity from repeated or deliberate targeting. Check whether you have support and a welcoming way to join activities.",
      "options": [
        {
          "label": "Offer a new invitation",
          "response": "Would you like to play another day? It is okay if not.",
          "fit": "This can fit when you want contact and the photo is the only sign of being left out.",
          "limit": "An invitation cannot make someone agree. You do not need to ask them to justify having other friends.",
          "id": "a"
        },
        {
          "label": "Get help with the hurt",
          "response": "Talk with a trusted adult about the feeling, or choose another welcoming activity for now.",
          "fit": "This can fit when you do not want to message or want help understanding a pattern.",
          "limit": "A break from looking at the photo may help for now, but repeated targeting needs adult attention.",
          "id": "b"
        }
      ]
    },
    {
      "id": "group_drama",
      "title": "A group chat turns hurtful",
      "situation": "Two friends argue in a game chat. Others add insults and ask you to choose a side.",
      "known": "Insults are being added in front of an audience.",
      "unknown": "You may not know the original disagreement or whether someone is being repeatedly targeted.",
      "needs": "People need the insults to stop. You do not have to settle the disagreement or contact both people.",
      "change": "One person keeps being singled out after asking everyone to stop.",
      "review": "Check whether the targeting stops and whether an adult has helped if it continues. Being neutral about friendship does not require ignoring harm.",
      "options": [
        {
          "label": "Leave the insults unanswered",
          "response": "Stop adding reactions, leave or mute the chat if useful, and tell an adult about the insults.",
          "fit": "This can reduce your participation without asking you to settle the argument.",
          "limit": "Muting alone does not stop harm to someone else. Ask an adult for help when targeting continues.",
          "id": "a"
        },
        {
          "label": "Set a brief limit",
          "response": "I am not joining the insults. I am stepping away.",
          "fit": "This can fit if speaking feels safe and a short limit is useful.",
          "limit": "You do not have to announce your exit or contact both friends privately. Seek adult help if the pressure continues.",
          "id": "b"
        }
      ]
    },
    {
      "id": "mean_screenshot",
      "title": "A private message becomes a joke",
      "situation": "A friend shows you an ordinary private-message screenshot and laughs at the sender.",
      "known": "A message is being shown to another person for ridicule.",
      "unknown": "You do not know whether the sender agreed to sharing or how widely it has spread.",
      "needs": "The sender's privacy matters. You need a way to avoid joining in without taking on an unsafe confrontation.",
      "change": "The sender asks for help because the screenshot is now in a class chat.",
      "review": "Check whether you avoided spreading it and whether the sender can reach support. You cannot promise to remove copies you do not control.",
      "options": [
        {
          "label": "Decline to join in",
          "response": "I do not want to laugh at their message or pass it around.",
          "fit": "This can fit when a brief limit feels safe.",
          "limit": "Do not forward it to prove a point or gather more people. You cannot control what the other person does next.",
          "id": "a"
        },
        {
          "label": "Ask an adult quietly",
          "response": "Tell a trusted adult what you saw and ask how to help without spreading it.",
          "fit": "This can fit when you feel pressured or think the sender is being targeted.",
          "limit": "Share only what the adult needs to understand. Asking for help is different from sending the screenshot to classmates.",
          "id": "b"
        }
      ]
    }
  ],
  "middle": [
    {
      "id": "left_on_read",
      "title": "A read receipt without a reply",
      "situation": "You sent a personal message two days ago. The app shows a read receipt, but there is no reply.",
      "known": "There is a receipt and no reply visible to you.",
      "unknown": "The receipt does not tell you why there is no reply, whether the message was understood, or what support the friend can offer.",
      "needs": "Your wish for a response matters. Your friend can have limits on timing and emotional support.",
      "change": "The friend replies, 'I care, but I cannot be your main support for this.'",
      "review": "Decide whether another support route or a mutual communication agreement would help. There is no universal number of days to wait.",
      "options": [
        {
          "label": "Send an optional check-in",
          "response": "No pressure to discuss the long message. Would you prefer a different time, or should I find support elsewhere?",
          "fit": "This can fit when a follow-up is welcome and you want clarity about support.",
          "limit": "A check-in does not create a deadline or require private explanations. Respect a request for less contact.",
          "id": "a"
        },
        {
          "label": "Choose support elsewhere",
          "response": "Leave the message without another follow-up for now and contact a trusted support person if you need help.",
          "fit": "This can fit when waiting is draining or the topic needs support your friend may not be able to give.",
          "limit": "Choosing another support route does not establish why the friend did not reply. For immediate danger, seek urgent local help rather than waiting on a message.",
          "id": "b"
        }
      ]
    },
    {
      "id": "group_chat_drama",
      "title": "An argument with an audience",
      "situation": "Two friends argue in a group chat. Others take sides and one person asks you to defend them.",
      "known": "The disagreement has an audience and pressure to join.",
      "unknown": "You may be missing context, and equal responsibility cannot be assumed.",
      "needs": "People need protection from insults or targeting. You do not have to mediate or make the friendship look balanced.",
      "change": "You notice one person is being mocked repeatedly, including outside the chat.",
      "review": "Check whether harm is addressed and support is available. Moving the same pressure into private messages does not resolve it.",
      "options": [
        {
          "label": "Interrupt the insults briefly",
          "response": "I am not joining insults. Please stop targeting people here.",
          "fit": "This can fit when a brief response feels safe and can name harmful behavior without redistributing it.",
          "limit": "You are not required to debate the whole disagreement, defend every action or promise neutrality about harm.",
          "id": "a"
        },
        {
          "label": "Support without public debate",
          "response": "Step back from the argument and ask a trusted adult for help. If welcome, check privately what the targeted person needs.",
          "fit": "This can fit when public replies could increase exposure or place you at risk.",
          "limit": "Do not arrange mediation or ask the targeted person to negotiate with someone intimidating them. Do not promise secrecy about danger.",
          "id": "b"
        }
      ]
    },
    {
      "id": "screenshot",
      "title": "Mocking a private conversation",
      "situation": "A friend forwards you an ordinary private DM with mocking commentary and asks you to react.",
      "known": "The private message has been shared with you for ridicule.",
      "unknown": "You do not know the sender's consent, the whole context, or the reach of the screenshot.",
      "needs": "Protect the person's privacy and your own safety. Asking for help is different from circulating gossip.",
      "change": "The mocked person asks you to help them show a trusted adult what happened.",
      "review": "Check who actually needs the information and whether sharing is limited to a support purpose. Do not promise absolute secrecy about safety concerns.",
      "options": [
        {
          "label": "Set a sharing boundary",
          "response": "I am not comfortable mocking a private message. Please do not send me more of these.",
          "fit": "This can fit when stating a limit feels safe.",
          "limit": "A private channel does not guarantee privacy. Avoid repeating or reposting the message in your response.",
          "id": "a"
        },
        {
          "label": "Help through a trusted route",
          "response": "Describe what happened to a trusted adult, or help the targeted person reach one. Ask what limited information is needed.",
          "fit": "This can fit when sharing is repeated, someone asks for support, or confrontation feels unsafe.",
          "limit": "Do not circulate copies as gossip. For these ordinary messages, an adult can help preserve relevant evidence without spreading it further.",
          "id": "b"
        }
      ]
    },
    {
      "id": "ghosted",
      "title": "Contact has stopped",
      "situation": "A friend who used to message often no longer replies. You have no explanation.",
      "known": "Messages have gone unanswered and contact has changed.",
      "unknown": "You do not know whether they want distance, lack access, are busy, or something else is happening.",
      "needs": "You can feel hurt and choose a boundary. The friend does not owe repeated access or an explanation on demand.",
      "change": "You learn that they asked another friend to tell you they want no contact.",
      "review": "Respect the stated limit and seek your own support. A reply is not proof of your worth, and no reply is not proof of their character.",
      "options": [
        {
          "label": "Leave one low-pressure opening",
          "response": "I miss talking with you. If you would like to reconnect sometime, you can let me know.",
          "fit": "This can fit if no no-contact limit has been stated and you want to leave an opening.",
          "limit": "It is optional, not a required final message. Do not send repeated follow-ups or recruit friends to get a reply.",
          "id": "a"
        },
        {
          "label": "Choose your own distance",
          "response": "Stop checking for a reply for now and put attention into support or activities available to you.",
          "fit": "This can fit when further contact would be unhelpful or a boundary has been stated.",
          "limit": "You can feel hurt without deciding the other person is uncaring or immature. Genuine safety concerns can go to a trusted adult.",
          "id": "b"
        }
      ]
    },
    {
      "id": "highlight_reel",
      "title": "A feed and a feeling of exclusion",
      "situation": "You see a friend at an activity with people you do not know and feel left out.",
      "known": "The post shows one activity with a particular group.",
      "unknown": "You cannot infer their whole day, their motives, or the state of your friendship from the post.",
      "needs": "Your feelings deserve attention without blaming you for them. Other friendships can coexist with yours.",
      "change": "You realize this follows several invitations where your access needs were ignored.",
      "review": "Review the pattern and whether access is addressed. Muting a post may ease viewing without solving an exclusion problem.",
      "options": [
        {
          "label": "Invite connection without a loyalty test",
          "response": "I would like to spend time together. Would you be interested in something we can both access?",
          "fit": "This can fit when you want a shared activity and contact is welcome.",
          "limit": "Do not make the friend prove loyalty or apologize simply for seeing other people. Their answer may still be no.",
          "id": "a"
        },
        {
          "label": "Look at the pattern with support",
          "response": "Pause viewing if useful, then consider what has happened across several interactions with someone you trust.",
          "fit": "This can fit when you are unsure whether the issue is one post or repeated exclusion.",
          "limit": "An online community may be important support. You do not have to disconnect completely or blame your feelings on personal insecurity.",
          "id": "b"
        }
      ]
    },
    {
      "id": "misunderstood",
      "title": "Intent, wording and repair",
      "situation": "You sent a joke in a group chat. A friend says it insulted them; you reply that you were joking.",
      "known": "You sent the message and your friend described its impact.",
      "unknown": "You do not know all the meanings others read into it or whether they want a discussion.",
      "needs": "You can own the wording and stop repeating it. The friend can ask for space and does not have to explain every detail.",
      "change": "The friend asks you to correct the impression in the same group, without quoting the joke.",
      "review": "Check whether your action addresses the original audience while avoiding fresh exposure. A successful repair does not require renewed closeness.",
      "options": [
        {
          "label": "Acknowledge and stop",
          "response": "I sent that message. I am sorry for the insult. I will stop using that joke.",
          "fit": "This can fit when the friend is willing to receive a brief response.",
          "limit": "Do not demand an explanation, immediate forgiveness or a switch to a call. Respect their preferred way to communicate.",
          "id": "a"
        },
        {
          "label": "Plan a limited correction",
          "response": "If the friend wants it, agree on a brief correction that does not repeat the insult or expose more details.",
          "fit": "This can fit when others saw the message and the impression needs correcting.",
          "limit": "A private apology may not address a public effect. A public correction also needs care; avoid making the friend manage every part of your repair.",
          "id": "b"
        }
      ]
    }
  ],
  "high": [
    {
      "id": "parasocial",
      "title": "Different kinds of online connection",
      "situation": "You enjoy following a creator and notice you have had little contact with a friend you miss.",
      "known": "You spend time with the creator's content and miss a particular friendship.",
      "unknown": "You cannot infer that online interests are worthless or that an offline friendship would meet every need.",
      "needs": "Enjoyment, community, reciprocal support and available energy can matter in different ways.",
      "change": "You realize the creator's moderated community is your main accessible social space.",
      "review": "Review whether your choices support connection and access. You need not give up a meaningful online community to reconnect elsewhere.",
      "options": [
        {
          "label": "Reconnect in a manageable way",
          "response": "Send the friend an optional invitation that fits your time and energy, while keeping online interests you value.",
          "fit": "This can fit when reciprocal contact with this person is something you want.",
          "limit": "Do not assume they are available, or that a creator's content and a mutual friendship meet the same need.",
          "id": "a"
        },
        {
          "label": "Review what each space offers",
          "response": "Notice which spaces offer enjoyment, shared interests or mutual support, and decide whether one small adjustment would help.",
          "fit": "This can fit when you want to understand your needs before changing habits.",
          "limit": "Do not rank all offline contact above online connection. A creator may not know you personally even when their content is meaningful.",
          "id": "b"
        }
      ]
    },
    {
      "id": "cancellation",
      "title": "Accountability during a pile-on",
      "situation": "A friend's post caused harm. Some replies explain the concern; other replies insult or threaten them.",
      "known": "The post has drawn criticism and some harmful responses.",
      "unknown": "You may not know everyone affected, what repair they want, or the full safety context.",
      "needs": "People affected by the post deserve acknowledgment. Your friend also deserves safety. Supporting one need need not erase the other.",
      "change": "A reply shares the friend's location and encourages people to find them.",
      "review": "Separate accountability from threats. Check whether appropriate support is involved and whether harm from the original post is still being addressed.",
      "options": [
        {
          "label": "Offer care with accountability",
          "response": "If welcome, check privately whether your friend has support. You can also name the specific harm without excusing it.",
          "fit": "This can fit when direct contact is safe and you can offer limited support.",
          "limit": "You do not have to defend the post, argue with an audience or dismiss people who were harmed.",
          "id": "a"
        },
        {
          "label": "Address dangerous behavior through support",
          "response": "Use a trusted adult or appropriate reporting route for threats without reposting them to a wider audience.",
          "fit": "This can fit when intimidation, threats or exposure of private details need action beyond a peer conversation.",
          "limit": "Do not investigate or confront people making threats. If danger seems immediate, seek urgent local help; addressing threats does not cancel accountability for the post.",
          "id": "b"
        }
      ]
    },
    {
      "id": "long_distance",
      "title": "Staying connected after a move",
      "situation": "A close friend moved away. Your messages have become less frequent and schedules rarely line up.",
      "known": "Contact is less frequent and scheduling is difficult.",
      "unknown": "You do not know whether each person wants the same amount or form of contact.",
      "needs": "Both people's energy, time zones, access and interest matter. Closeness is not measured by a fixed call schedule.",
      "change": "The friend says video calls are exhausting and asks for occasional voice notes or text.",
      "review": "Check whether the arrangement is mutual and manageable. A changing rhythm does not by itself mean neglect or rejection.",
      "options": [
        {
          "label": "Agree on a flexible rhythm",
          "response": "I miss you. What kind of contact works for you now: a message, a voice note, or something occasional?",
          "fit": "This can fit when both people want contact but the old pattern is difficult.",
          "limit": "Do not prescribe a fixed call length or treat missed contact as a test of care. Either person can change their availability.",
          "id": "a"
        },
        {
          "label": "Allow a lighter connection",
          "response": "Keep an occasional, pressure-free opening if welcome and invest in other connections too.",
          "fit": "This can fit when schedules or energy do not support regular exchanges.",
          "limit": "A lighter connection can involve sadness without blame. Respect a request for no contact rather than treating silence as an invitation to keep trying.",
          "id": "b"
        }
      ]
    },
    {
      "id": "digital_breakup",
      "title": "Choosing distance from a friendship",
      "situation": "You want distance from a friendship where your limits have repeatedly been ignored.",
      "known": "You have noticed repeated behavior that crosses your limits.",
      "unknown": "You may not know how the friend will respond to a boundary or ending.",
      "needs": "You can choose distance without providing closure, an apology or another conversation. Consider what contact feels safe.",
      "change": "After you reduce contact, the person uses new accounts to keep messaging you.",
      "review": "Check whether your boundary and safety are supported. You do not need to keep explaining or confront someone to justify blocking them.",
      "options": [
        {
          "label": "State a boundary if safe",
          "response": "I do not want further contact. Please do not message me.",
          "fit": "This can fit when you choose to state a limit and believe a message is safe enough.",
          "limit": "You do not owe an apology, a debate or another chance. A clear message cannot guarantee the person will respect it.",
          "id": "a"
        },
        {
          "label": "Reduce contact without another message",
          "response": "Use available mute, block or privacy controls and ask a trusted person to help plan support if needed.",
          "fit": "This can fit when another conversation feels unsafe or would repeat a limit already given.",
          "limit": "You do not need to earn the right to block someone. Repeated unwanted contact or threats may need trusted support and reporting, not more explanations.",
          "id": "b"
        }
      ]
    }
  ]
};

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('friendship', {
    icon: '\uD83D\uDC9B',
    label: 'Friendship Workshop',
    desc: 'Learn the real skills of friendship \u2014 how to start one, keep one, fix one, and grow through the ones that end.',
    color: 'amber',
    category: 'relationship-skills',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var band = ctx.gradeBand || 'elementary';

      var d = (ctx.toolData && ctx.toolData.friendship) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('friendship', key); }
        else { if (ctx.update) ctx.update('friendship', key, val); }
      };

      var activeTab     = d.activeTab || 'compass';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;
      var myStyle       = d.myStyle || null;
      var starterIdx    = (Number.isInteger(d.starterIdx) && d.starterIdx >= 0 ? d.starterIdx : 0);
      var repairIdx     = (Number.isInteger(d.repairIdx) && d.repairIdx >= 0 ? d.repairIdx : 0);
      var endingIdx     = d.endingIdx || 0;
      var coachInput    = d.coachInput || '';
      var coachHistory  = d.coachHistory || [];
      var coachLoading  = d.coachLoading || false;
      // Rehearse state — multi-turn role-play where AI plays the friend/peer
      // (separate from the Practice tab's Q&A advice coach).
      var fRpScenarioId = d.fRpScenarioId || '';
      var fRpHistory    = d.fRpHistory || [];
      var fRpInput      = d.fRpInput || '';
      var fRpLoading    = !!d.fRpLoading;
      var fRpStarting   = !!d.fRpStarting;
      var fRpEnded      = !!d.fRpEnded;
      var fRpReflection = d.fRpReflection || '';
      // Friendship journal
      var friendNotes   = (Array.isArray(d.friendNotes) ? d.friendNotes : []);
      var newNote       = (typeof d.newNote === 'string' ? d.newNote : '');
      // Digital friendship
      var digitalIdx    = d.digitalIdx || 0;
      var digitalShown  = d.digitalShown || false;
      var digitalDraft  = d.digitalDraft || '';
      var digitalDone   = d.digitalDone || {};

      // ── Host theme remap (consumes ctx.theme) — same pattern as Growth Mindset ──
      // Friendship is light-base: _frC('#hex') returns the ORIGINAL hex on a light host
      // (light-mode byte-identical), a same-hue DARK value on .theme-dark, and WCAG
      // yellow/black on high-contrast — so the tool follows the SEL Hub theme toggle.
      // Generic chrome + the amber/green/red/blue tinted surfaces (and their text) flip
      // together; vivid accent FILLS (AMBER buttons, white-on-color text) stay constant.
      var _frTheme = (ctx && ctx.theme) || {};
      var _frHC = !!_frTheme.isContrast, _frDark = !_frHC && !!_frTheme.isDark;
      var _FR_DARK = {
        '#1f2937':'#e2e8f0','#374151':'#cbd5e1','#475569':'#cbd5e1','#0f172a':'#f1f5f9','#64748b':'#94a3b8',
        '#fff':'#1e293b','#ffffff':'#1e293b','#fafafa':'#1e293b','#e5e7eb':'#334155','#cbd5e1':'#475569',
        '#fffbeb':'#2e2410','#fef3c7':'#3a2e12','#78350f':'#fcd34d','#92400e':'#fde68a',
        '#f0fdf4':'#0b2e22','#166534':'#86efac','#16a34a':'#4ade80',
        '#fef2f2':'#2e1414','#7f1d1d':'#fca5a5','#dc2626':'#f87171','#eff6ff':'#0e1f3a',
        '#2563eb':'#93c5fd','#1e3a8a':'#93c5fd','#e2e8f0':'#334155','#fff8f0':'#2a1f12'
      };
      var _FR_HC = {
        '#1f2937':'#ffff00','#374151':'#ffff00','#475569':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#94a3b8':'#ffff00',
        '#fff':'#000000','#ffffff':'#000000','#fafafa':'#000000','#e5e7eb':'#ffff00','#cbd5e1':'#ffff00',
        '#fffbeb':'#000000','#fef3c7':'#000000','#78350f':'#ffff00','#92400e':'#ffff00',
        '#f0fdf4':'#000000','#166534':'#ffff00','#16a34a':'#ffff00',
        '#fef2f2':'#000000','#7f1d1d':'#ffff00','#dc2626':'#ffff00','#eff6ff':'#000000',
        '#2563eb':'#ffff00','#1e3a8a':'#ffff00','#e2e8f0':'#333300','#fff8f0':'#000000'
      };
      var _frC = function(hex) { return _frHC ? (_FR_HC[hex] || hex) : (_frDark ? (_FR_DARK[hex] || hex) : hex); };

      // ── Ink: the same hue, readable as TEXT on this tool's dark surface ──
      // _frC serves surfaces AND text from one map, so it cannot lighten
      // an accent for a label without also lightening the chip that accent fills.
      // Consulted only from a `color:` position, so no surface moves; falls back
      // to _frC for any hue not listed.
      var _FR_INK = { '#a855f7': '#c084fc', '#3b82f6': '#60a5fa', '#8b5cf6': '#a78bfa', '#ec4899': '#f472b6', '#ef4444': '#f87171', '#22c55e': '#4ade80' };
      var _FR_INK_HC = { '#a855f7': '#ffff00', '#3b82f6': '#ffff00', '#8b5cf6': '#ffff00', '#ec4899': '#ffff00', '#ef4444': '#ffff00', '#22c55e': '#ffff00' };
      var _frInk = function(hex) {
        if (_frHC) return _FR_INK_HC[hex] || _frC(hex);
        return _FR_INK[hex] || _frC(hex);
      };

      var AMBER = '#d97706'; var AMBER_LIGHT = _frC('#fffbeb'); var AMBER_DARK = _frC('#78350f');

      var TABS = [
        { id: 'compass',  icon: '\uD83E\uDDED', label: 'My Style' },
        { id: 'start',    icon: '\uD83D\uDCAC', label: 'Starting' },
        { id: 'keep',     icon: '\uD83D\uDC9B', label: 'Keeping' },
        { id: 'digital',  icon: '📱', label: 'Digital' },
        { id: 'repair',   icon: '\uD83E\uDE79', label: 'Repair' },
        { id: 'endings',  icon: '\uD83C\uDF43', label: 'Endings' },
        { id: 'coach',    icon: '\uD83E\uDD16', label: 'Practice' },
        { id: 'rehearse', icon: '\uD83C\uDFAD', label: 'Rehearse' },
      ];

      var exploredTabs = d.exploredTabs || {};
      if (!exploredTabs[activeTab]) { var ne = Object.assign({}, exploredTabs); ne[activeTab] = true; upd('exploredTabs', ne); }
      var exploredCount = Object.keys(exploredTabs).length;

      var tabBar = h('div', {
        style: { display: 'flex', flexDirection: 'column', borderBottom: '2px solid #fde68a', background: 'linear-gradient(180deg, ' + _frC('#fffbeb') + ', ' + _frC('#fef3c7') + ')', flexShrink: 0 }
      },
        h('div', { style: { height: '3px', background: _frC('#e2e8f0'), position: 'relative', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.round((exploredCount / TABS.length) * 100) + '%', background: 'linear-gradient(90deg, ' + AMBER + ', #f59e0b)', transition: 'width 0.5s ease', borderRadius: '0 2px 2px 0' } })
        ),
        h('div', {
          style: { display: 'flex', gap: '3px', padding: '8px 12px 6px', overflowX: 'auto', alignItems: 'center' }
        },
          h('div', { role: 'tablist', 'aria-label': 'Friendship sections', style: { display: 'flex', gap: '3px' } },
            TABS.map(function(t) {
            var active = activeTab === t.id;
            var explored = !!exploredTabs[t.id];
            return h('button', {
              key: t.id, id: 'friendship-tab-' + t.id, role: 'tab', className: 'sel-tab' + (active ? ' sel-tab-active' : ''), 'aria-selected': active ? 'true' : 'false', 'aria-controls': 'friendship-panel-' + t.id,
              onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
              style: { padding: '6px 14px', borderRadius: '10px', border: active ? 'none' : '1px solid ' + (explored ? '#fde68a' : 'transparent'), background: active ? 'linear-gradient(135deg, ' + AMBER + ', #b45309)' : explored ? 'rgba(217,119,6,0.06)' : 'transparent', color: active ? '#fff' : explored ? _frC('#78350f') : _frC('#94a3b8'), fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', boxShadow: active ? '0 3px 12px rgba(217,119,6,0.35), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none' }
            }, h('span', { className: active ? 'sel-hero-icon' : '', 'aria-hidden': 'true' }, t.icon), t.label,
              explored && !active ? h('span', { style: { width: '5px', height: '5px', borderRadius: '50%', background: '#fbbf24', marginLeft: '2px' } }) : null
            );
            })
          ),
          h('span', { className: 'sel-badge', style: { marginLeft: '8px', fontSize: '10px', color: AMBER_DARK, fontWeight: 700, whiteSpace: 'nowrap', background: _frC('#fef3c7'), padding: '2px 8px', borderRadius: '10px', flexShrink: 0 } }, exploredCount + '/' + TABS.length),
          h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, className: 'sel-btn', 'aria-label': soundEnabled ? 'Mute' : 'Unmute', style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.8, flexShrink: 0 } }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07')
        )
      );

      // ── Topic-accent hero band per tab ──
      var heroBand = (function() {
        var TAB_META = {
          compass: { accent: '#d97706', soft: 'rgba(217,119,6,0.14)',  icon: '\uD83E\uDDED', title: 'My Style \u2014 how you show you care',                hint: 'Loyalist, encourager, advisor, peacekeeper, jokester, listener, adventurer. Most people lean on 1-2. Knowing yours is half the work \u2014 the other half is recognizing your friend\u2019s default is probably different.' },
          start:   { accent: '#10b981', soft: 'rgba(16,185,129,0.14)', icon: '\uD83D\uDCAC', title: 'Starting \u2014 the open + the follow-up',             hint: 'Mere-exposure effect (Zajonc 1968): repeated low-stakes contact predicts liking better than charm. Pair-share, lunch tables, shared activities. \u201CI like your shoes\u201D is corny because it WORKS.' },
          keep:    { accent: '#fbbf24', soft: 'rgba(251,191,36,0.14)', icon: '\uD83D\uDC9B', title: 'Keeping \u2014 maintenance is everything',              hint: 'Dunbar 1992: humans top out at ~150 stable relationships, ~5 close ones. Sustaining ANY of those takes regular small bids \u2014 a text, a memory mentioned, a check-in. Drift is the default.' },
          digital: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', icon: '\uD83D\uDCF1', title: 'Digital - context, consent and considered choices', hint: 'Compare what a message shows with what remains uncertain. Consider boundaries, audience and trusted support. A private channel does not guarantee privacy.' },
          repair:  { accent: '#a855f7', soft: 'rgba(168,85,247,0.14)', icon: '\uD83E\uDE79', title: 'Repair \u2014 the strongest friendships have ruptures', hint: 'Gottman: rupture is universal; thriving relationships repair quickly. Name what you did, hear what landed, plan repair, follow up. Apologies that include \u201CIF\u201D are not apologies.' },
          endings: { accent: '#0891b2', soft: 'rgba(8,145,178,0.14)',  icon: '\uD83C\uDF43', title: 'Endings \u2014 some friendships finish gracefully',  hint: 'Not every friendship is forever, and that\u2019s OK. Drift is normal; explicit goodbyes are sometimes kinder than ghosting. \u201CI think we\u2019ve grown different ways\u201D leaves both people room to be sad without being mad.' },
          coach:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.14)', icon: '\uD83E\uDD16', title: 'Practice \u2014 rehearse the hard talks',             hint: 'Bandura 1977: behavioral rehearsal is one of the strongest predictors of self-efficacy. Try the difficult conversation here first. The AI plays the friend; you practice the script you\u2019ll use later.' }
        };
        var meta = TAB_META[activeTab] || TAB_META.compass;
        return h('div', {
          style: {
            margin: '8px 12px 12px',
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
            h('h3', { style: { color: _frInk(meta.accent), fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
            h('p', { style: { margin: '3px 0 0', color: _frC('#475569'), fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })();

      // ── My Style (Friendship Compass) ──
      function friendRouteCard(label, detail, target, color) {
        var isHere = activeTab === target;
        return h('button', {
          key: target,
          onClick: function() { upd('activeTab', target); if (soundEnabled) sfxClick(); },
          'aria-label': label + ': ' + detail,
          style: {
            minHeight: 86,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid ' + (isHere ? color : _frC('#e5e7eb')),
            borderLeft: '4px solid ' + color,
            background: isHere ? color + '18' : _frC('#fff'),
            color: _frC('#374151'),
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8
          }
        },
          h('span', { style: { fontSize: 12, fontWeight: 900, color: _frInk(color) } }, label),
          h('span', { style: { fontSize: 11, color: _frC('#64748b'), lineHeight: 1.45 } }, detail)
        );
      }

      function friendStat(label, value, color) {
        return h('div', {
          key: label,
          style: {
            padding: '10px 12px',
            borderRadius: 12,
            background: _frC('#fff'),
            border: '1px solid ' + color + '44',
            minHeight: 62
          }
        },
          h('div', { style: { fontSize: 17, fontWeight: 900, color: _frInk(color), lineHeight: 1 } }, value),
          h('div', { style: { marginTop: 5, fontSize: 10.5, color: _frC('#64748b'), lineHeight: 1.35 } }, label)
        );
      }

      var stylePicked = myStyle ? (FRIEND_STYLES.find(function(s) { return s.id === myStyle; }) || {}).label || 'chosen' : 'not yet';
      var friendshipLaunchPanel = h('section', {
        role: 'region',
        'aria-label': 'Friendship launch panel',
        style: {
          marginBottom: 18,
          padding: 16,
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(217,119,6,0.12), rgba(16,185,129,0.08)), ' + _frC('#fffbeb'),
          border: '1px solid ' + _frC('#fde68a')
        }
      },
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 12 } },
          h('div', { style: { flex: '1 1 260px' } },
            h('div', { style: { fontSize: 11, color: AMBER, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 } }, 'Friendship field guide'),
            h('h3', { style: { margin: 0, color: AMBER_DARK, fontSize: 20, fontWeight: 900, lineHeight: 1.2 } }, 'Choose the friendship skill you need today.'),
            h('p', { style: { margin: '6px 0 0', color: _frC('#475569'), fontSize: 12, lineHeight: 1.55 } },
              'Start with your style, then practice a specific move: open, maintain, repair, digital choices, or a hard conversation.'
            )
          ),
          h('div', { style: { flex: '1 1 260px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 8 } },
            friendStat('style picked', stylePicked, AMBER),
            friendStat('sections explored', exploredCount + '/' + TABS.length, '#10b981'),
            friendStat('private notes', friendNotes.length, '#0ea5e9'),
            friendStat('digital practices', Object.keys(digitalDone).length, '#a855f7')
          )
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } },
          friendRouteCard('Start a friendship', 'Pick an opener and follow-up that feels natural.', 'start', '#10b981'),
          friendRouteCard('Keep it warm', 'Try small maintenance moves before drift sets in.', 'keep', '#d97706'),
          friendRouteCard('Handle digital moments', 'Practice screenshots, tone, privacy, and group chats.', 'digital', '#0ea5e9'),
          friendRouteCard('Repair a rupture', 'Use an apology or boundary when something went sideways.', 'repair', '#a855f7'),
          friendRouteCard('Rehearse a talk', 'Practice the conversation before doing it live.', 'rehearse', '#f59e0b')
        )
      );

      var compassContent = null;
      if (activeTab === 'compass') {
        compassContent = h('div', { style: { padding: '20px', maxWidth: '720px', margin: '0 auto' } },
          friendshipLaunchPanel,
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83E\uDDED'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'What Kind of Friend Am I?'),
            h('p', { style: { fontSize: '13px', color: _frC('#94a3b8'), margin: 0 } }, 'Everyone has a friendship style \u2014 the way they naturally show they care. Which one sounds most like you?')
          ),
          h('div', { role: 'radiogroup', 'aria-label': 'Friendship styles', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' } },
            FRIEND_STYLES.map(function(fs) {
              var selected = myStyle === fs.id;
              return h('button', {
                key: fs.id, role: 'radio', 'aria-checked': selected ? 'true' : 'false',
                'aria-label': fs.label + ': ' + fs.desc,
                onClick: function() { upd('myStyle', fs.id); if (soundEnabled) sfxHeart(); if (awardXP) awardXP(10, 'Discovered your friendship style!'); if (announceToSR) announceToSR('Selected: ' + fs.label); },
                style: { padding: '16px 12px', borderRadius: '14px', border: selected ? '3px solid ' + AMBER : '2px solid ' + _frC('#e5e7eb'), background: selected ? AMBER_LIGHT : _frC('#fff'), cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', boxShadow: selected ? '0 2px 12px rgba(217,119,6,0.15)' : 'none' }
              },
                h('div', { style: { fontSize: '28px', marginBottom: '6px' } }, fs.icon),
                h('div', { style: { fontSize: '13px', fontWeight: 700, color: selected ? AMBER : _frC('#374151') } }, fs.label),
                h('div', { style: { fontSize: '11px', color: _frC('#94a3b8'), marginTop: '4px', lineHeight: 1.4 } }, fs.desc)
              );
            })
          ),
          myStyle && (function() {
            var style = FRIEND_STYLES.find(function(s) { return s.id === myStyle; });
            if (!style) return null;
            return h('div', { style: { marginTop: '16px', background: AMBER_LIGHT, borderRadius: '14px', padding: '16px', border: '2px solid #fde68a' } },
              h('div', { style: { fontSize: '14px', fontWeight: 700, color: AMBER_DARK, marginBottom: '8px' } }, style.icon + ' You\u2019re ' + style.label + '!'),
              h('div', { style: { fontSize: '13px', color: _frC('#374151'), marginBottom: '6px' } }, '\u2728 Superpower: ' + style.strength),
              h('div', { style: { fontSize: '13px', color: _frC('#94a3b8') } }, '\uD83D\uDCA1 Growth edge: ' + style.watchFor)
            );
          })()
        );
      }

      // ── Starting Friendships ──
      var startContent = null;
      if (activeTab === 'start') {
        var starters = STARTERS[band] || STARTERS.elementary;
        var cur = starters[starterIdx % starters.length];
        startContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83D\uDCAC'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Starting a Friendship'),
            h('p', { style: { fontSize: '13px', color: _frC('#94a3b8'), margin: 0 } }, band === 'elementary' ? 'The hardest part is the first words. Here\u2019s what to say.' : 'Specific words for specific situations. Practice makes natural.')
          ),
          // Scenario card
          h('div', { style: { background: _frC('#fff'), borderRadius: '16px', padding: '20px', border: '1px solid ' + _frC('#e5e7eb'), boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, '\uD83C\uDFAD Situation'),
            h('p', { style: { fontSize: '14px', color: _frC('#1f2937'), fontWeight: 600, margin: '0 0 14px' } }, cur.situation),
            h('div', { style: { background: AMBER_LIGHT, borderRadius: '12px', padding: '14px', borderLeft: '4px solid ' + AMBER, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: AMBER, marginBottom: '4px' } }, '\uD83D\uDDE3\uFE0F You could say:'),
              h('p', { style: { fontSize: '15px', fontWeight: 700, color: AMBER_DARK, margin: 0, fontStyle: 'italic' } }, '"' + cur.say + '"')
            ),
            h('div', { style: { fontSize: '12px', color: _frC('#94a3b8'), lineHeight: 1.5 } }, '\uD83D\uDCA1 Why it works: ' + cur.why)
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('starterIdx', (starterIdx - 1 + starters.length) % starters.length); }, style: { padding: '8px 16px', background: _frC('#fff'), border: '2px solid ' + _frC('#e5e7eb'), borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: _frC('#374151') } }, '\u2190 Prev'),
            h('span', { style: { display: 'flex', alignItems: 'center', fontSize: '12px', color: _frC('#94a3b8') } }, (starterIdx % starters.length + 1) + ' / ' + starters.length),
            h('button', { onClick: function() { upd('starterIdx', (starterIdx + 1) % starters.length); if (soundEnabled) sfxClick(); }, 'aria-label': 'Next starter', style: { padding: '8px 16px', background: AMBER, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' } }, 'Next \u2192')
          )
        );
      }

      // ── Keeping Friends (journal + tips) ──
      var keepContent = null;
      if (activeTab === 'keep') {
        var KEEP_TIPS = band === 'elementary'
          ? ['Check in: "How was your weekend?"', 'Remember what matters to them', 'Take turns choosing what to do', 'Be happy when good things happen to them', 'Keep their secrets safe']
          : ['Initiate \u2014 don\u2019t always wait for them to text first', 'Show up for the boring stuff, not just the fun stuff', 'Apologize without "but"', 'Celebrate their wins without comparing', 'Respect their other friendships'];

        keepContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83D\uDC9B'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Keeping Friends'),
            h('p', { style: { fontSize: '13px', color: _frC('#94a3b8'), margin: 0 } }, 'Friendships need care. Small, consistent actions matter more than grand gestures.')
          ),
          // Tips
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' } },
            KEEP_TIPS.map(function(tip, i) {
              return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: _frC('#fff'), border: '1px solid #fde68a', borderRadius: '10px' } },
                h('div', { style: { width: '24px', height: '24px', borderRadius: '50%', background: AMBER_LIGHT, border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: AMBER, flexShrink: 0 } }, i + 1),
                h('span', { style: { fontSize: '13px', color: _frC('#374151') } }, tip)
              );
            })
          ),
          // Friendship journal
          h('div', { style: { background: AMBER_LIGHT, borderRadius: '14px', padding: '16px', border: '1px solid #fde68a' } },
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: AMBER_DARK, marginBottom: '8px' } }, '\uD83D\uDCDD Friendship Journal'),
            h('p', { style: { fontSize: '11px', color: _frC('#94a3b8'), margin: '0 0 8px' } }, 'Write about a friendship moment \u2014 something kind someone did, a fun memory, or something you\u2019re grateful for.'),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '8px' } },
              h('input', { 'aria-label': 'Friendship journal entry',
                type: 'text', value: newNote,
                onChange: function(ev) { upd('newNote', ev.target.value); },
                onKeyDown: function(ev) {
                  if (ev.key === 'Enter' && newNote.trim()) {
                    upd({ friendNotes: [{ id: Date.now().toString(), text: newNote.trim(), date: new Date().toLocaleDateString() }].concat(friendNotes), newNote: '' });
                    if (soundEnabled) sfxHeart();
                    if (awardXP) awardXP(5, 'Wrote in your Friendship Journal!');
                  }
                },
                placeholder: band === 'elementary' ? 'Today my friend...' : 'A friendship moment I want to remember...',
                style: { flex: 1, border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
              }),
              h('button', {
                'aria-label': 'Add friendship journal entry',
                onClick: function() { if (!newNote.trim()) return; upd({ friendNotes: [{ id: Date.now().toString(), text: newNote.trim(), date: new Date().toLocaleDateString() }].concat(friendNotes), newNote: '' }); if (soundEnabled) sfxHeart(); },
                disabled: !newNote.trim(),
                style: { padding: '8px 14px', background: newNote.trim() ? AMBER : '#d1d5db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'not-allowed', fontSize: '12px' }
              }, '\uD83D\uDC9B')
            ),
            friendNotes.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' } },
              friendNotes.slice(0, 10).map(function(note) {
                return h('div', { key: note.id, style: { fontSize: '12px', color: _frC('#374151'), padding: '4px 0', borderBottom: '1px solid #fef3c7' } },
                  h('span', { style: { color: _frC('#94a3b8'), fontSize: '10px' } }, note.date + ' \u2014 '),
                  note.text
                );
              })
            )
          )
        );
      }

      // ── Friendship Repair ──
      var repairContent = null;
      if (activeTab === 'repair') {
        var steps = REPAIR_STEPS[band] || REPAIR_STEPS.elementary;
        var curStep = steps[repairIdx % steps.length];
        repairContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83E\uDE79'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Friendship Repair'),
            h('p', { style: { fontSize: '13px', color: _frC('#94a3b8'), margin: 0 } }, band === 'elementary' ? 'When friends hurt each other, here\u2019s how to fix it.' : 'Conflict doesn\u2019t have to mean the end. These steps help you navigate back to each other.')
          ),
          // Step progress
          h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' } },
            steps.map(function(s, i) {
              var isCurrent = i === repairIdx % steps.length;
              return h('button', {
                key: i,
                'aria-label': 'Step ' + (i + 1) + ': ' + s.step + (isCurrent ? ' (current)' : ''),
                'aria-current': isCurrent ? 'step' : undefined,
                onClick: function() { upd('repairIdx', i); if (soundEnabled) sfxClick(); },
                style: { width: '36px', height: '36px', borderRadius: '50%', border: isCurrent ? '3px solid ' + AMBER : '2px solid ' + _frC('#e5e7eb'), background: isCurrent ? AMBER : _frC('#fff'), color: isCurrent ? '#fff' : _frC('#374151'), fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }
              }, i + 1);
            })
          ),
          // Step card
          h('div', { style: { background: _frC('#fff'), borderRadius: '16px', padding: '24px', border: '1px solid ' + _frC('#e5e7eb'), boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
              h('span', { style: { fontSize: '28px' } }, curStep.icon),
              h('div', null,
                h('div', { style: { fontSize: '10px', color: _frC('#94a3b8') } }, 'Step ' + ((repairIdx % steps.length) + 1) + ' of ' + steps.length),
                h('h4', { style: { fontSize: '16px', fontWeight: 800, color: _frC('#1f2937'), margin: 0 } }, curStep.step)
              )
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: _frC('#374151'), margin: '0 0 12px' } }, curStep.desc),
            h('div', { style: { background: _frC('#fef3c7'), borderRadius: '10px', padding: '10px 12px', borderLeft: '4px solid #f59e0b' } },
              h('p', { style: { fontSize: '12px', fontWeight: 600, color: _frC('#92400e'), margin: 0 } }, '\uD83D\uDCA1 ' + curStep.tip)
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: '8px' } },
            h('button', { onClick: function() { upd('repairIdx', (repairIdx - 1 + steps.length) % steps.length); }, style: { padding: '8px 16px', background: _frC('#fff'), border: '2px solid ' + _frC('#e5e7eb'), borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: _frC('#374151') } }, '\u2190 Prev'),
            h('button', { onClick: function() { upd('repairIdx', (repairIdx + 1) % steps.length); if (soundEnabled) sfxClick(); }, 'aria-label': 'Next step', style: { padding: '8px 16px', background: AMBER, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff' } }, 'Next \u2192')
          )
        );
      }

      // ── When Friendships End ──
      var endingsContent = null;
      if (activeTab === 'endings') {
        var truths = ENDING_TRUTHS[band] || ENDING_TRUTHS.elementary;
        endingsContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83C\uDF43'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'When Friendships Change'),
            h('p', { style: { fontSize: '13px', color: _frC('#94a3b8'), margin: 0 } }, 'Sometimes friendships end or change shape. That\u2019s one of the hardest parts of growing up.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            truths.map(function(truth, i) {
              return h('div', Object.assign({
                key: i,
                'aria-label': truth,
                'aria-pressed': i === endingIdx ? 'true' : 'false',
                style: { background: i === endingIdx ? _frC('#fff8f0') : _frC('#fff'), border: i === endingIdx ? '2px solid #fdba74' : '1px solid ' + _frC('#e5e7eb'), borderRadius: '14px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }
              }, a11yClick(function() { upd('endingIdx', i); if (soundEnabled) sfxClick(); })),
                h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: _frC('#374151'), margin: 0, fontStyle: i === endingIdx ? 'normal' : 'italic' } }, truth)
              );
            })
          ),
          h('p', { style: { fontSize: '12px', color: _frC('#94a3b8'), textAlign: 'center', marginTop: '16px', fontStyle: 'italic' } },
            band === 'elementary' ? 'It\u2019s okay to feel sad. It\u2019s also okay to feel relieved. All feelings are allowed.'
            : 'Letting go of a friendship can be one of the most mature things you ever do. Honor what was, and make space for what\u2019s coming.')
        );
      }

      // ── AI Practice Coach ──
      var coachContent = null;
      if (activeTab === 'coach') {
        var hasSafetyLayer = window.SelHub && window.SelHub.hasCoachConsent;
        var hasConsent = hasSafetyLayer ? window.SelHub.hasCoachConsent() : true;
        if (hasSafetyLayer && !hasConsent) {
          coachContent = window.SelHub.renderConsentScreen(h, band, function() {
            window.SelHub.giveCoachConsent();
            upd('_consentRefresh', Date.now());
          }, ctx.activeSessionCode);
        } else {
        coachContent = h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
          h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { className: 'sel-hero-icon', style: { fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(217,119,6,0.3))' } }, '\uD83E\uDD16'),
            h('h3', { style: { fontSize: '18px', fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Friendship Practice'),
            h('p', { style: { fontSize: '13px', color: _frC('#94a3b8'), margin: 0 } }, 'Describe a friendship situation.'),
            window.SelHub && window.SelHub.renderSafetyDisclosure && window.SelHub.renderSafetyDisclosure(h, band, ctx.activeSessionCode)
          ),
          // Surface the loud 988 / Crisis Text Line block when last turn was tier-3.
          (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
          coachHistory.length > 0 && h('div', { role: 'log', 'aria-label': 'Friendship practice conversation', 'aria-live': 'polite', 'aria-busy': coachLoading ? 'true' : 'false', style: { maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            coachHistory.map(function(msg, i) {
              var isUser = msg.role === 'user';
              return h('div', { key: i, style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
                h('div', { style: { maxWidth: '80%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? _frC('#eff6ff') : AMBER_LIGHT, border: '1px solid ' + (isUser ? '#bfdbfe' : '#fde68a'), fontSize: '13px', lineHeight: 1.6, color: _frC('#1f2937') } },
                  !isUser && h('div', { style: { fontSize: '10px', fontWeight: 700, color: AMBER, marginBottom: '4px' } }, '\uD83D\uDC9B Friend Coach'),
                  msg.text
                )
              );
            })
          ),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('input', { 'aria-label': 'Friendship practice message',
              type: 'text', value: coachInput,
              onChange: function(ev) { upd('coachInput', ev.target.value); },
              onKeyDown: function(ev) {
                if (ev.key === 'Enter' && coachInput.trim() && !coachLoading && callGemini) {
                  var userMsg = coachInput.trim();
                  var newHist = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                  upd({ coachHistory: newHist, coachInput: '', coachLoading: true });
                  var styleCtx = myStyle ? ' Their friendship style is "' + myStyle + '".' : '';
                  var prompt = 'You are a warm friendship coach for a ' + band + ' school student.' + styleCtx + ' The student said: "' + userMsg + '"\n\nRespond with:\n1. Validate their feeling (1 sentence)\n2. A specific thing they could say or do (give actual words in quotes)\n3. Why it would work (1 sentence)\n\nBe warm, specific, age-appropriate. Max 3-4 sentences. Use "you" not "one."';
                  if (window.SelHub && window.SelHub.safeCoach) {
                    window.SelHub.safeCoach({ studentMessage: userMsg, coachPrompt: prompt, toolId: 'friendship', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: newHist }).then(function(result) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: result.response }]), coachLoading: false, _lastTier: result.tier || 0 }); if (awardXP) awardXP(5, 'Practiced friendship skills!'); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'Connection issue. But here\u2019s what I know: the fact that you\u2019re thinking about how to be a better friend means you already are one.' }]), coachLoading: false }); });
                  } else {
                    var preFallback = (window.SelHub && window.SelHub.safeRehearseCheck)
                      ? window.SelHub.safeRehearseCheck(userMsg, { toolId: 'friendship', onSafetyFlag: onSafetyFlag })
                      : { action: 'continue' };
                    callGemini(prompt, false).then(function(r) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: r }]), coachLoading: false, _lastTier: preFallback.action === 'block' ? 3 : 0 }); if (awardXP) awardXP(5, 'Practiced friendship skills!'); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'Connection issue. But here\u2019s what I know: the fact that you\u2019re thinking about how to be a better friend means you already are one.' }]), coachLoading: false }); });
                  }
                }
              },
              disabled: coachLoading || !callGemini,
              placeholder: coachLoading ? 'Thinking...' : 'Describe a friendship situation...',
              style: { flex: 1, border: '2px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }
            }),
            h('button', {
              'aria-label': coachLoading ? 'Friendship coach is responding' : 'Send message to friendship coach',
              onClick: function() {
                if (!coachInput.trim() || coachLoading || !callGemini) return;
                var userMsg = coachInput.trim();
                var newHist = (coachHistory || []).concat([{ role: 'user', text: userMsg }]);
                upd({ coachHistory: newHist, coachInput: '', coachLoading: true });
                var prompt = 'You are a warm friendship coach for a ' + band + ' school student. The student said: "' + userMsg + '"\nValidate, give specific words they could say, explain why. Max 3-4 sentences.';
                if (window.SelHub && window.SelHub.safeCoach) {
                  window.SelHub.safeCoach({ studentMessage: userMsg, coachPrompt: prompt, toolId: 'friendship', band: band, callGemini: callGemini, onSafetyFlag: onSafetyFlag, codename: ctx.studentCodename || 'student', conversationHistory: newHist }).then(function(result) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: result.response }]), coachLoading: false, _lastTier: result.tier || 0 }); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting, but I believe in you. The courage to think about friendship is itself an act of friendship.' }]), coachLoading: false }); });
                } else {
                  var preFallback2 = (window.SelHub && window.SelHub.safeRehearseCheck)
                    ? window.SelHub.safeRehearseCheck(userMsg, { toolId: 'friendship', onSafetyFlag: onSafetyFlag })
                    : { action: 'continue' };
                  callGemini(prompt, false).then(function(r) { upd({ coachHistory: newHist.concat([{ role: 'coach', text: r }]), coachLoading: false, _lastTier: preFallback2.action === 'block' ? 3 : 0 }); }).catch(function() { upd({ coachHistory: newHist.concat([{ role: 'coach', text: 'I\u2019m having trouble connecting, but I believe in you. The courage to think about friendship is itself an act of friendship.' }]), coachLoading: false }); });
                }
              },
              disabled: coachLoading || !coachInput.trim() || !callGemini,
              style: { padding: '10px 16px', background: coachInput.trim() && !coachLoading ? AMBER : '#d1d5db', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: coachInput.trim() && !coachLoading ? 'pointer' : 'not-allowed', fontSize: '13px' }
            }, coachLoading ? '\u23F3' : '\u2728')
          ),
          coachHistory.length === 0 && h('div', { style: { marginTop: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 600, color: _frC('#94a3b8'), marginBottom: '6px' } }, 'Try:'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              [
                band === 'elementary' ? 'Nobody wants to play with me at recess' : 'My best friend started hanging out with someone else',
                band === 'elementary' ? 'I said something mean and now my friend is mad' : 'I don\u2019t know how to apologize without making it worse',
                band === 'elementary' ? 'I want to make friends but I\u2019m shy' : 'I feel like I\u2019m always the one reaching out first',
              ].map(function(p) {
                return h('button', { key: p, 'aria-label': 'Use prompt: ' + p, onClick: function() { upd('coachInput', p); },
                  style: { padding: '5px 10px', background: AMBER_LIGHT, border: '1px solid #fde68a', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', color: AMBER_DARK, fontWeight: 500 }
                }, p);
              })
            )
          )
        );
        }
      }

      // ── Digital Friendship ──
      var digitalContent = null;
      if (activeTab === 'digital') {
        var digitalBand = Object.prototype.hasOwnProperty.call(DIGITAL_DILEMMAS, band) ? band : 'middle';
        var dilemmas = DIGITAL_DILEMMAS[digitalBand];
        var selectedDigital = d.digitalSelections && d.digitalSelections[digitalBand];
        var legacyDigitalIndex = Number.isInteger(d.digitalIdx) && d.digitalIdx >= 0 ? d.digitalIdx % dilemmas.length : 0;
        var curD = dilemmas.find(function(item) { return item.id === selectedDigital; }) || dilemmas[legacyDigitalIndex];
        // Grade band is part of the key, so similarly named future cases stay independent.
        var digitalKey = digitalBand + ':' + curD.id;
        var digitalCases = d.digitalCases && typeof d.digitalCases === 'object' && !Array.isArray(d.digitalCases) ? d.digitalCases : {};
        var savedDigital = digitalCases[digitalKey];
        var digitalCase = savedDigital && typeof savedDigital === 'object' && !Array.isArray(savedDigital) ? savedDigital : {};
        var digitalNote = function(key) { return typeof digitalCase[key] === 'string' ? digitalCase[key] : ''; };
        var saveDigital = function(values) {
          var next = Object.assign({}, digitalCases);
          next[digitalKey] = Object.assign({}, digitalCase, values);
          upd('digitalCases', next);
        };
        var digitalSurface = _frC('#fff'), digitalInk = _frC('#1f2937');
        var digitalEdge = _frHC ? '#ffff00' : _frDark ? '#94a3b8' : '#64748b';
        var digitalCard = { padding: '16px', margin: '14px 0', background: digitalSurface, color: digitalInk, border: '1px solid ' + digitalEdge, borderRadius: '12px', minWidth: 0 };
        var digitalControl = { minHeight: '44px', maxWidth: '100%', width: '100%', padding: '10px', border: '1px solid ' + digitalEdge, borderRadius: '8px', background: digitalSurface, color: digitalInk, font: 'inherit', fontSize: '16px', boxSizing: 'border-box' };
        var digitalButton = { minHeight: '44px', padding: '10px 14px', border: '2px solid ' + digitalEdge, borderRadius: '8px', background: digitalSurface, color: digitalInk, font: 'inherit', fontWeight: 700, cursor: 'pointer', maxWidth: '100%', whiteSpace: 'normal' };
        var digitalSummary = { minHeight: '44px', padding: '10px 0', fontWeight: 700, cursor: 'pointer', boxSizing: 'border-box' };
        var digitalField = function(key, label, hint) {
          var id = 'fr-digital-' + key;
          return h('div', { key: key, style: { margin: '14px 0' } },
            h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label),
            h('p', { id: id + '-hint', style: { margin: '4px 0 8px' } }, hint),
            h('textarea', { id: id, rows: 3, value: digitalNote(key), 'aria-describedby': id + '-hint',
              onChange: function(ev) { var values = {}; values[key] = ev.target.value; saveDigital(values); },
              style: Object.assign({}, digitalControl, { resize: 'vertical' }) })
          );
        };
        var chosenDigital = curD.options.find(function(option) { return option.id === digitalNote('choice'); });
        var revisedDigital = curD.options.find(function(option) { return option.id === digitalNote('revisedChoice'); });
        var oldDigitalDraft = typeof d.digitalDraft === 'string' ? d.digitalDraft : '';
        digitalContent = h('section', { 'aria-label': 'Digital friendship choices', style: { padding: '16px', maxWidth: '760px', margin: '0 auto', background: digitalSurface, color: digitalInk, fontSize: '14px', lineHeight: 1.65, overflowWrap: 'anywhere' } },
          h('h3', { style: { fontSize: '22px', margin: '0 0 8px' } }, 'Digital Friendship: choose with context'),
          h('p', null, 'Practice with fictional messages and situations. A receipt, photo or silence rarely gives the whole context. Notice what is known, whose needs matter, and what a response might expose.'),
          h('p', null, 'All writing and choices are optional. Think, draw or discuss instead. You can choose not to contact anyone. These examples are for rehearsal; nothing here sends a message.'),
          h('p', null, 'Notes stay in this tool state. Use the project save controls if you want to keep a project copy. Avoid names or identifying details from real conversations.'),
          h('label', { htmlFor: 'fr-digital-case', style: { display: 'block', fontWeight: 700 } }, 'Choose a digital friendship scenario'),
          h('select', { id: 'fr-digital-case', value: curD.id, style: digitalControl,
            onChange: function(ev) { var next = Object.assign({}, d.digitalSelections || {}); next[digitalBand] = ev.target.value; upd('digitalSelections', next); } },
            dilemmas.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })
          ),
          h('div', { key: digitalKey },
            h('article', { style: digitalCard, 'aria-labelledby': 'fr-digital-case-title' },
              h('h4', { id: 'fr-digital-case-title', style: { fontSize: '18px', margin: '0 0 8px' } }, curD.title),
              h('p', null, curD.situation)
            ),
            h('details', { open: true, style: digitalCard },
              h('summary', { style: digitalSummary }, '1. Separate the signal from the story'),
              h('p', null, h('strong', null, 'What is known: '), curD.known),
              h('p', null, h('strong', null, 'What remains uncertain: '), curD.unknown),
              h('p', null, h('strong', null, 'Needs and boundaries: '), curD.needs),
              digitalField('notice', 'What needs checking before you respond? (optional)', 'Distinguish an observation from a guess about motives. You do not need to investigate someone or demand private explanations.'),
              digitalField('first', 'Your first response or no-contact plan (optional)', 'Describe what you might do, say, pause or ask for. A message is not required.')
            ),
            h('details', { style: digitalCard },
              h('summary', { style: digitalSummary }, '2. Compare approaches and their limits'),
              h('p', null, 'These are possible routes, not a right-answer pair. Compare both, choose one to explore, combine ideas in your notes, or use a different route.'),
              curD.options.map(function(option) {
                var selected = chosenDigital && chosenDigital.id === option.id;
                return h('article', { key: option.id, style: digitalCard, 'aria-labelledby': 'fr-digital-option-' + option.id },
                  h('h4', { id: 'fr-digital-option-' + option.id, style: { fontSize: '17px', margin: '0 0 8px' } }, option.label),
                  h('p', null, option.response),
                  h('p', null, h('strong', null, 'When this may fit: '), option.fit),
                  h('p', null, h('strong', null, 'Limit to consider: '), option.limit),
                  h('button', { type: 'button', style: digitalButton, 'aria-pressed': !!selected,
                    onClick: function() { saveDigital({ choice: selected ? '' : option.id }); } }, (selected ? 'Selected: ' : 'Explore: ') + option.label)
                );
              }),
              h('p', { role: 'status', 'aria-live': 'polite' }, chosenDigital ? 'Route being explored: ' + chosenDigital.label + '. Select it again to leave the choice blank. Your own plan can be different.' : 'No route selected. You can compare without choosing.'),
              digitalField('privacy', 'Who needs information, and what should stay private? (optional)', 'Consider the audience, permission and purpose. A direct message can still be copied. Limited sharing with trusted support is different from circulating a private message to peers.')
            ),
            h('div', { style: digitalCard },
              h('h4', { id: 'fr-digital-change-title', style: { fontSize: '18px', margin: '0 0 8px' } }, '3. Reconsider after new information'),
              h('button', { type: 'button', style: digitalButton, 'aria-expanded': digitalCase.changeSeen === true, 'aria-controls': 'fr-digital-change',
                onClick: function() { saveDigital({ changeSeen: true }); } }, digitalCase.changeSeen === true ? 'New information shown' : 'Explore new information'),
              h('div', { id: 'fr-digital-change', hidden: digitalCase.changeSeen !== true },
                h('p', null, h('strong', null, 'Imagine this happens: '), curD.change),
                h('p', null, h('strong', null, 'Your earlier route: '), chosenDigital ? chosenDigital.label : 'No route selected. Your first notes remain above.'),
                h('label', { htmlFor: 'fr-digital-revised-choice', style: { display: 'block', fontWeight: 700 } }, 'A route after the change (optional)'),
                h('select', { id: 'fr-digital-revised-choice', style: digitalControl, value: revisedDigital ? revisedDigital.id : digitalNote('revisedChoice') === 'different' ? 'different' : '',
                  onChange: function(ev) { saveDigital({ revisedChoice: ev.target.value }); } },
                  h('option', { value: '' }, 'Leave open for now'),
                  curD.options.map(function(option) { return h('option', { key: option.id, value: option.id }, option.label); }),
                  h('option', { value: 'different' }, 'A different or combined route')
                ),
                digitalField('revised', 'What would you keep or change, and why? (optional)', 'A reasoned choice can stay the same or change. Your first response and earlier selection remain separate and editable.'),
                h('details', null,
                  h('summary', { style: digitalSummary }, 'Consider a follow-through check'),
                  h('p', null, curD.review),
                  digitalField('followup', 'What would tell you that more support is needed? (optional)', 'Look at boundaries, access and whether harm continues. Getting a reply, forgiveness or agreement is not fully within your control.')
                )
              )
            ),
            oldDigitalDraft.trim() && h('details', { style: digitalCard },
              h('summary', { style: digitalSummary }, 'An earlier unassigned digital draft is available'),
              h('p', null, 'The older activity did not save a case or grade band with this draft. Check its context before copying.'),
              h('p', { style: { whiteSpace: 'pre-wrap' } }, oldDigitalDraft),
              h('button', { type: 'button', style: digitalButton,
                onClick: function() { if (!digitalNote('first').trim()) saveDigital({ first: oldDigitalDraft }); } }, 'Copy earlier writing into an empty draft'),
              h('p', null, 'Copying preserves current writing and leaves the earlier copy available.')
            )
          )
        );
      }

      // Rehearse retains its separate conversation state and workflow.
      var rehearseContent = null;
      if (activeTab === 'rehearse') {
        var FRIEND_SCENARIOS = {
          new_invite: {
            label: 'Asking a new person to hang out',
            icon: '💬', title: 'New person, new invite',
            blurb: 'You\'ve been chatting with someone in class but never hung out outside school. You want to invite them to something.',
            charName: 'Potential friend',
            charDesc: 'a ' + band + '-school student the user has been chatting with in class but has never hung out with outside school. You are friendly, mildly cautious about the unfamiliar ask, and want it to sound like a normal-stakes hang, not "are we best friends now?" You may ask clarifying questions ("oh, who else is going?" / "what time?"). You say yes IF the invite is specific and low-pressure. You hedge if it sounds vague or intense.',
            fallbackScene: 'After class on Friday. You\'re packing up. The other person is standing nearby, not in a rush.',
            fallbackOpener: 'Oh hey — what\'s up?'
          },
          apologize: {
            label: 'Apologizing after a fight',
            icon: '🩹', title: 'Repair after a fight',
            blurb: 'You and your friend got into it last week. You haven\'t talked since. You want to repair.',
            charName: 'Friend you hurt',
            charDesc: 'a ' + band + '-school student\'s close friend who is still hurt from a fight a few days ago. You are NOT in crisis. You are guarded, slightly cool, waiting to see if the apology is real or performative. You may test the apology ("so you actually get why that was messed up?"). You soften IF the apology names the specific impact, doesn\'t make excuses, doesn\'t rush you to forgive. You stay cool if it\'s vague, defensive, or fishing.',
            fallbackScene: 'Lunch. You see each other across the cafeteria for the first time since the fight. You walk over.',
            fallbackOpener: 'Hi.'
          },
          set_boundary: {
            label: 'Setting a boundary with a friend',
            icon: '🛡️', title: 'Setting a boundary',
            blurb: 'A friend keeps doing the thing — borrowing without asking, last-minute canceling, pulling you into drama. You need to say something.',
            charName: 'Boundary-pushing friend',
            charDesc: 'a close ' + band + '-school friend who keeps doing a specific thing that bothers the student (borrowing without asking / chronically canceling / pulling them into drama — pick one realistically). You don\'t see it as a big deal. When called on it, you may minimize ("seriously? you\'re making this a thing?"), get defensive, or get briefly hurt feelings. You DO actually care about the friendship — you adjust IF the student names it directly without attacking your character.',
            fallbackScene: 'Texting after the latest time it happened. You\'re about to ask them for the favor again.',
            fallbackOpener: 'heyyy can I borrow your charger one more time'
          },
          left_out: {
            label: 'Being honest about feeling left out',
            icon: '💔', title: 'Naming the hurt',
            blurb: 'You weren\'t invited to something your friend group did. You\'re not making a scene — but you want to say it.',
            charName: 'Friend from the group',
            charDesc: 'a close friend of the student who was at a group hang the student wasn\'t invited to. There WAS a reason (the host\'s parent capped numbers / they thought you had work / it was a small thing). You feel a little caught. You may try to brush it off ("it was nothing, you didn\'t miss anything") or get defensive ("it wasn\'t even my call"). You soften and engage honestly IF the student names the hurt without guilt-tripping or making it about loyalty.',
            fallbackScene: 'Walking together after school the next day.',
            fallbackOpener: 'Hey what\'s up — you seem off today.'
          },
          calling_in: {
            label: 'Calling a friend IN (not OUT) on bad behavior',
            icon: '🪞', title: 'Calling in, not calling out',
            blurb: 'A friend did something that wasn\'t okay — a comment, a joke, a freeze-out of someone. You want to talk to them about it, just the two of you.',
            charName: 'Friend who messed up',
            charDesc: 'a close friend of the student. You did something recently that crossed a line (a joke at someone\'s expense / going along with mocking another kid / a comment that landed wrong). Your initial reaction to being called on it is defensive: "it was a joke," "you laughed too," "everyone does it," "are you serious right now?" You soften IF the student keeps it private (1:1), doesn\'t shame, and names the specific behavior + specific impact. You harden if the student lectures, moralizes, or threatens the friendship.',
            fallbackScene: 'Texting later that night. Just the two of you. The day is over but the moment is still sitting with the student.',
            fallbackOpener: 'yo what up'
          },
          reconnect: {
            label: 'Reconnecting after a drift',
            icon: '🌱', title: 'Reaching out after months',
            blurb: 'You and a friend slowly drifted — different schedules, different friend groups. You miss them. You want to reach out without it being weird.',
            charName: 'Old friend',
            charDesc: 'an old friend of the student who has drifted from them over months — not from a fight, just life. You are happy to hear from them but a little unsure ("why now?" / "is everything okay?"). You are warm. You may admit you\'ve also been wanting to reconnect but felt awkward. You re-engage easily IF the student keeps it light, names that they miss them without making it a big thing.',
            fallbackScene: 'You\'re texting cold for the first time in months. Last text was in August.',
            fallbackOpener: 'oh hey!! it\'s been forever, what\'s going on'
          }
        };
        var F_ORDER = ['new_invite', 'apologize', 'set_boundary', 'left_out', 'calling_in', 'reconnect'];
        var fCfg = fRpScenarioId && FRIEND_SCENARIOS[fRpScenarioId];

        function fStartRp(sid) {
          var cfg = FRIEND_SCENARIOS[sid];
          if (!cfg) return;
          if (announceToSR) announceToSR(cfg.label + ' selected. Setting the scene.');
          if (!callGemini) {
            upd({ fRpScenarioId: sid, fRpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener, scene: cfg.fallbackScene }], fRpInput: '', fRpEnded: false, fRpReflection: '', fRpStarting: false });
            return;
          }
          upd({ fRpScenarioId: sid, fRpHistory: [], fRpInput: '', fRpEnded: false, fRpReflection: '', fRpStarting: true });
          var prompt =
            'You are setting up a brief friendship role-play. Build a fresh mini-scene + the other person\'s opening line. STRICT JSON only:\n' +
            '{"scene":"1-2 sentence scene-setter in 2nd person naming WHERE, WHEN, and the current moment — present tense, observational","opener":"the FIRST in-character line, 1-2 sentences, in their voice. For text scenarios use lowercase/casual texting style."}\n\n' +
            'CHARACTER: ' + cfg.charDesc + '\n' +
            'TYPICAL SCENE: ' + cfg.fallbackScene + '\n' +
            'AUDIENCE: ' + band + ' grade band.\n\n' +
            'RULES: Vary the specifics. NO slurs, NO sexual content, NO violence. Return ONLY the JSON.';
          callGemini(prompt, true).then(function(r) {
            try {
              var clean = (r || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
              var parsed = JSON.parse(clean);
              if (!parsed || !parsed.scene || !parsed.opener) throw new Error('shape');
              upd({ fRpHistory: [{ speaker: 'ai', text: String(parsed.opener).trim().replace(/^"|"$/g, ''), scene: String(parsed.scene).trim() }], fRpStarting: false });
            } catch (e) {
              upd({ fRpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener, scene: cfg.fallbackScene }], fRpStarting: false });
            }
          }).catch(function() {
            upd({ fRpHistory: [{ speaker: 'ai', text: cfg.fallbackOpener, scene: cfg.fallbackScene }], fRpStarting: false });
          });
        }
        function fSendTurn() {
          if (!callGemini || !fRpInput.trim() || !fCfg) return;
          var st = fRpInput.trim();
          // Safety pre-check (see sel_safety_layer.js:safeRehearseCheck).
          var safety = (window.SelHub && window.SelHub.safeRehearseCheck)
            ? window.SelHub.safeRehearseCheck(st, { toolId: 'friendship', onSafetyFlag: onSafetyFlag })
            : { action: 'continue' };
          if (safety.action === 'block') {
            upd({
              fRpHistory: fRpHistory.concat([
                { speaker: 'student', text: st },
                { speaker: 'coach', text: window.SelHub.rehearseBreakCharacterText(safety.severity) },
                { speaker: '_crisis', text: '' }
              ]),
              fRpInput: '', fRpLoading: false
            });
            return;
          }
          var newHist = fRpHistory.concat([{ speaker: 'student', text: st }]);
          upd({ fRpHistory: newHist, fRpInput: '', fRpLoading: true });
          var sceneTxt = (fRpHistory[0] && fRpHistory[0].scene) || fCfg.fallbackScene;
          var histStr = newHist.map(function(t) {
            if (t.speaker === 'student') return 'STUDENT: "' + t.text.replace(/"/g, '\\"') + '"';
            if (t.speaker === 'coach') return 'COACH: ' + t.text;
            return 'FRIEND: "' + t.text.replace(/"/g, '\\"') + '"';
          }).join('\n');
          var turnN = newHist.filter(function(t) { return t.speaker === 'student'; }).length;
          var prompt =
            'You are role-playing a friendship scenario for an SEL practice tool.\n\n' +
            'YOUR CHARACTER: ' + fCfg.charDesc + '\n' +
            'SCENE: ' + sceneTxt + '\n' +
            'AUDIENCE: ' + band + ' student.\n\n' +
            'STRICT RULES:\n' +
            '- Stay in character. 1-3 sentences. Sound like a real teenager.\n' +
            '- NO slurs, NO sexual content, NO violence.\n' +
            '- Do NOT narrate, moralize, or break character. Just speak as the character. No quotation marks.\n' +
            '- This is turn ' + turnN + '. By turn 4-5, if the student handled it well (specific, non-attacking, named impact, kept it real) — soften, engage, agree to the ask. If they did NOT — stay consistent or get more guarded.\n\n' +
            'CONVERSATION:\n' + histStr + '\n\n' +
            'Respond as the character in 1-3 sentences. Just the line.';
          callGemini(prompt, false).then(function(r) {
            var reply = (r || '').trim().replace(/^"|"$/g, '');
            var afterTurn = newHist.concat([{ speaker: 'ai', text: reply || '...' }]);
            if (safety.action === 'nudge') {
              afterTurn = afterTurn.concat([{ speaker: 'coach', text: 'Quick check-in: if any of what you just typed is close to real life, talking to a trusted adult is always an option.' }]);
            }
            upd({ fRpHistory: afterTurn, fRpLoading: false });
          }).catch(function() {
            upd({ fRpHistory: newHist.concat([{ speaker: 'ai', text: '(AI not reachable — try again in a moment)' }]), fRpLoading: false });
          });
        }
        function fCoachBreak() {
          if (!callGemini || fRpHistory.length === 0 || !fCfg) return;
          upd('fRpLoading', true);
          var sceneTxt = (fRpHistory[0] && fRpHistory[0].scene) || fCfg.fallbackScene;
          var histStr = fRpHistory.map(function(t) {
            if (t.speaker === 'student') return 'STUDENT: "' + t.text.replace(/"/g, '\\"') + '"';
            if (t.speaker === 'coach') return 'COACH: ' + t.text;
            return 'FRIEND: "' + t.text.replace(/"/g, '\\"') + '"';
          }).join('\n');
          var prompt =
            'You are a kind friendship coach watching a role-play. OUT OF CHARACTER NOW. Tell the student under 80 words:\n' +
            '1) What the friend probably needs from them in THIS moment.\n' +
            '2) One concrete phrase or move to try next. Example wording.\n\n' +
            'No moralizing. No "great job" filler. Warm peer-mentor tone. Plain English. Friendship principles: specific over vague, name impact not motive, don\'t lecture friends.\n\n' +
            'CHARACTER: ' + fCfg.charDesc + '\n' +
            'SCENE: ' + sceneTxt + '\n' +
            'CONVERSATION:\n' + histStr;
          callGemini(prompt, false).then(function(r) {
            var ct = (r || 'Take a breath. What\'s the one specific thing you want them to hear? Say that — then stop talking.').trim();
            upd({ fRpHistory: fRpHistory.concat([{ speaker: 'coach', text: ct }]), fRpLoading: false });
          }).catch(function() {
            upd('fRpLoading', false);
            addToast('The practice partner could not reply just now. What you wrote is saved — try again.', 'error');
            if (announceToSR) announceToSR('The practice partner could not reply just now. What you wrote is saved — try again.');
          });
        }
        function fEndRp() {
          if (!callGemini || !fCfg) return;
          upd('fRpLoading', true);
          var sceneTxt = (fRpHistory[0] && fRpHistory[0].scene) || fCfg.fallbackScene;
          var histStr = fRpHistory.map(function(t) {
            if (t.speaker === 'student') return 'STUDENT: "' + t.text.replace(/"/g, '\\"') + '"';
            if (t.speaker === 'coach') return 'COACH: ' + t.text;
            return 'FRIEND: "' + t.text.replace(/"/g, '\\"') + '"';
          }).join('\n');
          var prompt =
            'You are a kind friendship coach reflecting on a brief role-play. In 2-3 sentences (under 70 words):\n' +
            '1) One specific thing the student did well — reference their actual words.\n' +
            '2) One thing to try differently next time.\n\n' +
            'No empty praise. Friendship lens: were they specific? did they name impact? did they listen?\n\n' +
            'CHARACTER: ' + fCfg.charDesc + '\n' +
            'SCENE: ' + sceneTxt + '\n' +
            'CONVERSATION:\n' + histStr;
          callGemini(prompt, false).then(function(r) {
            var rt = (r || 'You showed up. That\'s the rep that counts. Next time, try saying the thing in one sentence before any context — the context can come second.').trim();
            upd({ fRpEnded: true, fRpReflection: rt, fRpLoading: false });
            if (awardXP) awardXP(5, 'Rehearsed a friendship conversation!');
          }).catch(function() {
            upd({ fRpEnded: true, fRpReflection: 'Practice complete. Next time, try saying the main thing in one sentence first, then any context.', fRpLoading: false });
          });
        }
        function fResetRp() { upd({ fRpScenarioId: '', fRpHistory: [], fRpInput: '', fRpEnded: false, fRpReflection: '', fRpStarting: false }); }

        var sceneTxt = fRpHistory[0] && fRpHistory[0].scene;
        rehearseContent = h('div', { style: { padding: '20px', maxWidth: '640px', margin: '0 auto' } },
          !fRpScenarioId && h('div', null,
            h('div', { className: 'sel-hero', style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { className: 'sel-hero-icon', style: { fontSize: 48, marginBottom: 6 } }, '🎭'),
              h('h3', { style: { fontSize: 18, fontWeight: 800, color: AMBER_DARK, margin: '0 0 4px' } }, 'Rehearse the conversation'),
              h('p', { style: { fontSize: 13, color: _frC('#94a3b8'), margin: 0 } }, 'AI plays the friend. You practice what you would actually say. Coach is one tap away.')
            ),
            h('div', { style: { display: 'grid', gap: 10 } },
              F_ORDER.map(function(sid) {
                var cfg = FRIEND_SCENARIOS[sid];
                return h('button', {
                  key: sid,
                  'aria-label': cfg.label + ': ' + cfg.blurb,
                  onClick: function() { fStartRp(sid); },
                  disabled: !callGemini || fRpStarting,
                  style: {
                    padding: '12px 14px', textAlign: 'left',
                    background: _frC('#fffbeb'), border: '2px solid #fde68a', borderRadius: 12,
                    color: _frC('#0f172a'), cursor: (callGemini && !fRpStarting) ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14,
                    opacity: fRpStarting ? 0.6 : 1
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 24, marginTop: 2 } }, cfg.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontWeight: 700, color: AMBER_DARK, marginBottom: 4 } }, cfg.label),
                    h('div', { style: { fontSize: 12, color: _frC('#64748b'), lineHeight: 1.5 } }, cfg.blurb)
                  )
                );
              })
            ),
            fRpStarting && h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { textAlign: 'center', marginTop: 12, fontSize: 12, color: AMBER_DARK, fontStyle: 'italic' } }, 'Setting the scene…'),
            !callGemini && h('p', { style: { textAlign: 'center', marginTop: 12, fontSize: 12, color: AMBER_DARK, fontStyle: 'italic' } }, 'AI features need a connection.')
          ),
          fRpScenarioId && fCfg && h('div', null,
            h('div', { style: { padding: '8px 12px', marginBottom: 12, background: _frC('#fef3c7'), borderRadius: 8, fontSize: 12, color: AMBER_DARK, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontWeight: 700 } }, fCfg.icon + ' ' + fCfg.label),
              h('button', { onClick: fResetRp, style: { padding: '4px 10px', background: _frC('#fff'), color: AMBER_DARK, border: '1px solid #fcd34d', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' } }, '← Different scenario')
            ),
            sceneTxt && h('div', { style: { padding: '10px 12px', marginBottom: 10, background: _frC('#fafafa'), borderTop: '1px solid ' + _frC('#e5e7eb'), borderRight: '1px solid ' + _frC('#e5e7eb'), borderBottom: '1px solid ' + _frC('#e5e7eb'), borderLeft: '3px solid #f59e0b', borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: _frC('#475569'), fontStyle: 'italic' } },
              h('span', { style: { fontStyle: 'normal', fontWeight: 700, color: AMBER_DARK, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 6 } }, 'Scene:'),
              sceneTxt
            ),
            h('div', { role: 'log', 'aria-label': 'Friendship role-play conversation', 'aria-live': 'polite', 'aria-busy': fRpLoading ? 'true' : 'false', style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '40vh', overflowY: 'auto', padding: 4 } },
              fRpHistory.map(function(turn, ti) {
                if (turn.speaker === '_crisis') {
                  return h('div', { key: 'f-rp-' + ti, style: { alignSelf: 'stretch' } },
                    window.SelHub && window.SelHub.renderCrisisResources && window.SelHub.renderCrisisResources(h, band)
                  );
                }
                var isStudent = turn.speaker === 'student';
                var isCoach = turn.speaker === 'coach';
                return h('div', {
                  key: 'f-rp-' + ti,
                  style: {
                    alignSelf: isStudent ? 'flex-end' : 'flex-start', maxWidth: '85%',
                    padding: '10px 13px', borderRadius: 12, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    background: isStudent ? _frC('#eff6ff') : (isCoach ? _frC('#fef3c7') : _frC('#fffbeb')),
                    border: '1px solid ' + (isStudent ? '#bfdbfe' : (isCoach ? '#fcd34d' : '#fde68a')),
                    color: _frC('#1f2937')
                  }
                },
                  h('div', { style: { fontSize: 10, fontWeight: 700, color: isStudent ? '#1d4ed8' : AMBER_DARK, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                    isStudent ? 'You' : (isCoach ? '🪶 Coach (out of character)' : '🎭 ' + fCfg.charName)),
                  h('div', null, turn.text)
                );
              })
            ),
            !fRpEnded && h('div', { style: { marginTop: 10 } },
              h('textarea', {
                id: 'f-rp-input', value: fRpInput,
                'aria-label': 'Your friendship role-play response',
                onChange: function(ev) { upd('fRpInput', ev.target.value); },
                placeholder: 'What would you actually say? Keep it short — say one thing, then listen.',
                rows: 2, disabled: fRpLoading,
                style: { width: '100%', padding: 10, fontSize: 13, border: '2px solid #fde68a', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
              }),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', {
                  onClick: fSendTurn, disabled: fRpLoading || !fRpInput.trim() || !callGemini, 'aria-label': fRpLoading ? 'Friendship role-play is responding' : 'Send role-play response', 'aria-busy': fRpLoading ? 'true' : 'false',
                  style: { padding: '10px 16px', background: (fRpLoading || !fRpInput.trim() || !callGemini) ? _frC('#cbd5e1') : '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: (fRpLoading || !fRpInput.trim() || !callGemini) ? 'not-allowed' : 'pointer', fontSize: 13 }
                }, fRpLoading ? 'Thinking…' : 'Send →'),
                h('button', {
                  onClick: fCoachBreak, disabled: fRpLoading || !callGemini || fRpHistory.length === 0,
                  style: { padding: '10px 14px', background: _frC('#fff'), color: AMBER_DARK, border: '1px solid #fcd34d', borderRadius: 8, fontWeight: 600, cursor: (fRpLoading || !callGemini || fRpHistory.length === 0) ? 'not-allowed' : 'pointer', fontSize: 13 }
                }, '🪶 Break character — coach me'),
                fRpHistory.filter(function(t) { return t.speaker === 'student'; }).length >= 2 && h('button', {
                  onClick: fEndRp, disabled: fRpLoading || !callGemini,
                  style: { padding: '10px 14px', background: _frC('#fff'), color: _frC('#475569'), border: '1px solid ' + _frC('#cbd5e1'), borderRadius: 8, fontWeight: 600, cursor: (fRpLoading || !callGemini) ? 'not-allowed' : 'pointer', fontSize: 13 }
                }, 'End & reflect')
              )
            ),
            fRpEnded && fRpReflection && h('div', { role: 'region', 'aria-live': 'polite', 'aria-label': 'Role-play reflection', style: { marginTop: 12, padding: 14, background: _frC('#f0fdf4'), border: '1px solid #bbf7d0', borderRadius: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: _frC('#166534'), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'How that went'),
              h('p', { style: { margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: _frC('#0f172a'), whiteSpace: 'pre-wrap' } }, fRpReflection),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { onClick: function() { fStartRp(fRpScenarioId); }, style: { padding: '8px 14px', background: '#b45309', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 } }, 'Try again'),
                h('button', { onClick: fResetRp, style: { padding: '8px 14px', background: _frC('#fff'), color: _frC('#0f172a'), border: '1px solid ' + _frC('#cbd5e1'), borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 } }, 'Different scenario')
              )
            ),
            h('p', { style: { margin: '10px 0 0', fontSize: 11, color: AMBER_DARK, fontStyle: 'italic' } }, 'AI-generated. The friend is a simulation. Take what is useful, leave the rest.')
          )
        );
      }

      var content = compassContent || startContent || keepContent || digitalContent || repairContent || endingsContent || coachContent || rehearseContent;
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('friendship', h, ctx) : null),
        tabBar,
        heroBand,
        h('div', { id: 'friendship-panel-' + activeTab, role: 'tabpanel', 'aria-labelledby': 'friendship-tab-' + activeTab, tabIndex: 0, style: { flex: 1, overflow: 'auto' } }, content),
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });
})();
